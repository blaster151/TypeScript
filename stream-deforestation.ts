/**
 * Lazy Deforestation and Whole-Section Fusion System
 * 
 * This module enhances the stream optimizer to perform lazy deforestation and
 * whole-section fusion, turning multi-node pure stream segments into single
 * evaluators to reduce allocation, indirection, and runtime overhead.
 */

// Import types from the multiplicity system
type Usage<T> = (input: T) => Multiplicity;
type Multiplicity = number | "∞";

// Utility functions
function constantUsage<T>(multiplicity: Multiplicity): Usage<T> {
  return () => multiplicity;
}

function onceUsage<T>(): Usage<T> {
  return constantUsage<T>(1);
}

function infiniteUsage<T>(): Usage<T> {
  return constantUsage<T>("∞");
}

import { 
  UsageBound, 
  multiplyUsageBounds,
  getUsageBoundForType
} from './fluent-usage-wrapper';

import { 
  multiplicityDebug,
  multiplicityLogger
} from './multiplicity-debug-system';

import {
  Stream,
  EffectTag,
  StreamOperator,
  isEffectFusionSafe,
  calculateFusedBound,
  calculateFusedEffectTag,
  wouldIncreaseMultiplicity,
  wouldViolateEffectSafety
} from './stream-fusion-effect-multiplicity';

import {
  StreamGraph,
  StreamNode,
  findStronglyConnectedComponents,
  analyzeFusionEdges
} from './stream-fusion-graph';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * Pure segment representation
 */
export interface PureSegment<I, O> {
  nodes: StreamNode<any, any, any, any>[];
  compose: (input: I) => O; // fused pipeline
  inputType: I;
  outputType: O;
  multiplicity: Multiplicity;
  isLazy: boolean;
  metadata: {
    originalNodeIds: string[];
    segmentLength: number;
    fusionType: 'compile-time' | 'runtime';
    compositionHash: string;
  };
}

/**
 * Deforestation result
 */
export interface DeforestationResult<S> {
  originalGraph: StreamGraph<S>;
  optimizedGraph: StreamGraph<S>;
  pureSegments: PureSegment<any, any>[];
  fusionStats: {
    totalSegments: number;
    fusedSegments: number;
    skippedSegments: number;
    totalNodesFused: number;
    averageSegmentLength: number;
    allocationReduction: number; // estimated
    indirectionReduction: number; // estimated
  };
  safetyViolations: {
    effectViolations: number;
    multiplicityViolations: number;
    stateViolations: number;
    feedbackViolations: number;
  };
}

/**
 * Segment detection configuration
 */
export interface SegmentDetectionConfig {
  enableLazyEvaluation: boolean;
  enableCompileTimeFusion: boolean;
  enableRuntimeSpecialization: boolean;
  maxSegmentLength: number;
  minSegmentLength: number;
  allowFeedbackSegments: boolean;
  preserveDebugInfo: boolean;
}

/**
 * Composition function type
 */
export type CompositionFn<I, O> = (input: I) => O;

/**
 * Node function extractor
 */
export type NodeFunctionExtractor = (node: StreamNode<any, any, any, any>) => CompositionFn<any, any>;

// ============================================================================
// Segment Detection
// ============================================================================

/**
 * Detect maximal contiguous pure segments in a stream graph
 */
export function detectPureSegments<S>(
  graph: StreamGraph<S>,
  config: SegmentDetectionConfig = defaultSegmentConfig()
): PureSegment<any, any>[] {
  const segments: PureSegment<any, any>[] = [];
  const visited = new Set<string>();
  const sccs = findStronglyConnectedComponents(graph);
  const sccNodes = new Set<string>();
  sccs.forEach(scc => scc.nodes.forEach(id => sccNodes.add(id)));

  // Find pure segments in DAG sections
  const dagNodes = Array.from(graph.nodes.keys()).filter(id => !sccNodes.has(id));
  
  for (const nodeId of dagNodes) {
    if (visited.has(nodeId)) continue;
    
    const segment = growPureSegment(graph, nodeId, visited, config);
    if (segment && segment.nodes.length >= config.minSegmentLength) {
      segments.push(segment);
    }
  }

  // Handle feedback segments if allowed
  if (config.allowFeedbackSegments) {
    for (const scc of sccs) {
      if (canFuseSCC(graph, scc.nodes).eligible) {
        const segment = createFeedbackSegment(graph, scc, config);
        if (segment && segment.nodes.length >= config.minSegmentLength) {
          segments.push(segment);
        }
      }
    }
  }

  return segments;
}

/**
 * Grow a pure segment starting from a given node
 */
function growPureSegment<S>(
  graph: StreamGraph<S>,
  startNodeId: string,
  visited: Set<string>,
  config: SegmentDetectionConfig
): PureSegment<any, any> | null {
  const segment: StreamNode<any, any, any, any>[] = [];
  const queue: string[] = [startNodeId];
  
  while (queue.length > 0 && segment.length < config.maxSegmentLength) {
    const nodeId = queue.shift()!;
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    const node = graph.nodes.get(nodeId);
    if (!node) continue;
    
    // Check if node can be part of a pure segment
    if (!isPureSegmentNode(node, config)) {
      break;
    }
    
    segment.push(node);
    
    // Add downstream nodes to queue
    for (const downstreamId of node.downstream) {
      if (!visited.has(downstreamId) && !queue.includes(downstreamId)) {
        queue.push(downstreamId);
      }
    }
  }
  
  if (segment.length === 0) return null;
  
  return createPureSegment(segment, config);
}

/**
 * Create a feedback segment from an SCC
 */
function createFeedbackSegment<S>(
  graph: StreamGraph<S>,
  scc: { nodes: string[]; isFeedback: boolean; canFuse: boolean },
  config: SegmentDetectionConfig
): PureSegment<any, any> | null {
  const nodes = scc.nodes.map(id => graph.nodes.get(id)).filter(Boolean);
  
  if (nodes.length === 0) return null;
  
  return createPureSegment(nodes, config);
}

/**
 * Check if a node can be part of a pure segment
 */
function isPureSegmentNode(
  node: StreamNode<any, any, any, any>,
  config: SegmentDetectionConfig
): boolean {
  // Check effect tag
  if (node.stream.effectTag !== "Pure") {
    return false;
  }
  
  // Check multiplicity
  if (node.stream.usageBound !== 1 && node.stream.usageBound !== "∞") {
    return false;
  }
  
  // Check for stateful operations
  if (isStatefulOperation(node.operator)) {
    return false;
  }
  
  // Check for feedback edges
  if (node.isFeedback) {
    return config.allowFeedbackSegments;
  }
  
  return true;
}

/**
 * Check if an operation is stateful
 */
function isStatefulOperation(operator: StreamOperator): boolean {
  return ['scan', 'reduce', 'fold', 'accumulate'].includes(operator);
}

/**
 * Check if an operation has multiplicity escalation
 */
function hasMultiplicityEscalation(operator: StreamOperator): boolean {
  return ['flatMap', 'chain', 'expand', 'merge', 'zip', 'combineLatest'].includes(operator);
}

// ============================================================================
// Pure Segment Creation
// ============================================================================

/**
 * Create a pure segment from a list of nodes
 */
function createPureSegment(
  nodes: StreamNode<any, any, any, any>[],
  config: SegmentDetectionConfig
): PureSegment<any, any> {
  const inputType = nodes[0].stream;
  const outputType = nodes[nodes.length - 1].stream;
  const multiplicity = calculateSegmentMultiplicity(nodes);
  
  // Create composition function
  const compose = config.enableLazyEvaluation 
    ? createLazyComposition(nodes, config)
    : createEagerComposition(nodes);
  
  const metadata = {
    originalNodeIds: nodes.map(n => n.id),
    segmentLength: nodes.length,
    fusionType: config.enableCompileTimeFusion ? 'compile-time' : 'runtime',
    compositionHash: generateCompositionHash(nodes)
  };
  
  return {
    nodes,
    compose,
    inputType,
    outputType,
    multiplicity,
    isLazy: config.enableLazyEvaluation,
    metadata
  };
}

/**
 * Calculate multiplicity for a segment
 */
function calculateSegmentMultiplicity(nodes: StreamNode<any, any, any, any>[]): Multiplicity {
  let multiplicity: Multiplicity = 1;
  
  for (const node of nodes) {
    if (node.stream.usageBound === "∞") {
      multiplicity = "∞";
      break;
    }
    multiplicity = Math.max(multiplicity as number, node.stream.usageBound as number);
  }
  
  return multiplicity;
}

/**
 * Create lazy composition function
 */
function createLazyComposition(
  nodes: StreamNode<any, any, any, any>[],
  config: SegmentDetectionConfig
): CompositionFn<any, any> {
  return (input: any) => {
    // Lazy evaluation: compose functions on-demand
    let result = input;
    
    for (const node of nodes) {
      const nodeFn = extractNodeFunction(node);
      result = nodeFn(result);
    }
    
    return result;
  };
}

/**
 * Create eager composition function
 */
function createEagerComposition(
  nodes: StreamNode<any, any, any, any>[]
): CompositionFn<any, any> {
  // Eager composition: pre-compose all functions
  const functions = nodes.map(extractNodeFunction);
  
  return (input: any) => {
    let result = input;
    
    for (const fn of functions) {
      result = fn(result);
    }
    
    return result;
  };
}

/**
 * Extract function from a stream node
 */
function extractNodeFunction(node: StreamNode<any, any, any, any>): CompositionFn<any, any> {
  // Extract the actual transformation function from the stream
  // This is a simplified version - in practice, you'd need to extract
  // the actual function from the stream's run method
  return (input: any) => {
    // Simulate the node's transformation
    switch (node.operator) {
      case 'map':
        return node.params ? node.params(input) : input;
      case 'filter':
        return node.params ? (node.params(input) ? input : null) : input;
      case 'take':
        // Simplified take implementation
        return input;
      case 'drop':
        // Simplified drop implementation
        return input;
      default:
        return input;
    }
  };
}

/**
 * Generate composition hash for caching
 */
function generateCompositionHash(nodes: StreamNode<any, any, any, any>[]): string {
  const hashData = nodes.map(node => ({
    id: node.id,
    operator: node.operator,
    effectTag: node.stream.effectTag,
    usageBound: node.stream.usageBound
  }));
  
  return JSON.stringify(hashData);
}

// ============================================================================
// Deforestation Optimizer
// ============================================================================

/**
 * Lazy deforestation optimizer
 */
export class LazyDeforestationOptimizer {
  private config: SegmentDetectionConfig;
  private debugEnabled: boolean;

  constructor(config: SegmentDetectionConfig = defaultSegmentConfig(), debugEnabled: boolean = false) {
    this.config = config;
    this.debugEnabled = debugEnabled;
  }

  /**
   * Perform lazy deforestation on a stream graph
   */
  deforest<S>(graph: StreamGraph<S>): DeforestationResult<S> {
    if (this.debugEnabled) {
      multiplicityLogger.info('[Deforestation] Starting lazy deforestation');
    }

    // Step 1: Detect pure segments
    const pureSegments = detectPureSegments(graph, this.config);
    
    if (this.debugEnabled) {
      multiplicityLogger.info(`[Deforestation] Detected ${pureSegments.length} pure segments`);
    }

    // Step 2: Create optimized graph with fused segments
    const optimizedGraph = this.createOptimizedGraph(graph, pureSegments);
    
    // Step 3: Calculate statistics
    const fusionStats = this.calculateFusionStats(graph, pureSegments);
    const safetyViolations = this.calculateSafetyViolations(graph, pureSegments);

    if (this.debugEnabled) {
      multiplicityLogger.info('[Deforestation] Deforestation complete', fusionStats);
    }

    return {
      originalGraph: graph,
      optimizedGraph,
      pureSegments,
      fusionStats,
      safetyViolations
    };
  }

  /**
   * Create optimized graph with fused segments
   */
  private createOptimizedGraph<S>(
    graph: StreamGraph<S>,
    segments: PureSegment<any, any>[]
  ): StreamGraph<S> {
    const optimizedGraph = {
      nodes: new Map(graph.nodes),
      feedbackEdges: new Set(graph.feedbackEdges)
    };

    // Replace segment nodes with fused nodes
    for (const segment of segments) {
      this.replaceSegmentWithFusedNode(optimizedGraph, segment);
    }

    return optimizedGraph;
  }

  /**
   * Replace a segment with a fused node
   */
  private replaceSegmentWithFusedNode<S>(
    graph: StreamGraph<S>,
    segment: PureSegment<any, any>
  ): void {
    if (segment.nodes.length < 2) return; // No fusion needed for single nodes

    const firstNode = segment.nodes[0];
    const lastNode = segment.nodes[segment.nodes.length - 1];
    const middleNodes = segment.nodes.slice(1, -1);

    // Create fused stream
    const fusedStream: Stream<any, any, any, any> = {
      usageBound: segment.multiplicity,
      effectTag: "Pure",
      __type: 'Stream',
      run: (input: any) => (state: any) => {
        const result = segment.compose(input);
        return [result, state];
      }
    };

    // Create fused node
    const fusedNode: StreamNode<any, any, any, any> = {
      id: `fused_${segment.metadata.compositionHash}`,
      stream: fusedStream,
      upstream: firstNode.upstream,
      downstream: lastNode.downstream,
      operator: 'fused',
      params: {
        originalSegment: segment,
        segmentLength: segment.nodes.length,
        isLazy: segment.isLazy
      }
    };

    // Remove original segment nodes
    for (const node of segment.nodes) {
      graph.nodes.delete(node.id);
    }

    // Add fused node
    graph.nodes.set(fusedNode.id, fusedNode);

    // Update upstream references
    for (const upstreamId of firstNode.upstream) {
      const upstreamNode = graph.nodes.get(upstreamId);
      if (upstreamNode) {
        upstreamNode.downstream = upstreamNode.downstream.map(id => 
          segment.nodes.some(n => n.id === id) ? fusedNode.id : id
        );
      }
    }

    // Update downstream references
    for (const downstreamId of lastNode.downstream) {
      const downstreamNode = graph.nodes.get(downstreamId);
      if (downstreamNode) {
        downstreamNode.upstream = downstreamNode.upstream.map(id => 
          segment.nodes.some(n => n.id === id) ? fusedNode.id : id
        );
      }
    }

    if (this.debugEnabled) {
      multiplicityLogger.info(`[Deforestation] Fused ${segment.nodes.length} nodes into ${fusedNode.id}`);
    }
  }

  /**
   * Calculate fusion statistics
   */
  private calculateFusionStats(
    graph: StreamGraph<S>,
    segments: PureSegment<any, any>[]
  ): DeforestationResult<any>['fusionStats'] {
    const totalSegments = segments.length;
    const fusedSegments = segments.filter(s => s.nodes.length > 1).length;
    const skippedSegments = totalSegments - fusedSegments;
    const totalNodesFused = segments.reduce((sum, s) => sum + s.nodes.length, 0);
    const averageSegmentLength = totalSegments > 0 ? totalNodesFused / totalSegments : 0;
    
    // Estimate allocation and indirection reduction
    const allocationReduction = segments.reduce((sum, s) => {
      return sum + (s.nodes.length - 1) * 2; // Rough estimate: 2 allocations per intermediate node
    }, 0);
    
    const indirectionReduction = segments.reduce((sum, s) => {
      return sum + (s.nodes.length - 1) * 3; // Rough estimate: 3 function calls per intermediate node
    }, 0);

    return {
      totalSegments,
      fusedSegments,
      skippedSegments,
      totalNodesFused,
      averageSegmentLength,
      allocationReduction,
      indirectionReduction
    };
  }

  /**
   * Calculate safety violations
   */
  private calculateSafetyViolations(
    graph: StreamGraph<S>,
    segments: PureSegment<any, any>[]
  ): DeforestationResult<any>['safetyViolations'] {
    let effectViolations = 0;
    let multiplicityViolations = 0;
    let stateViolations = 0;
    let feedbackViolations = 0;

    for (const segment of segments) {
      for (const node of segment.nodes) {
        if (node.stream.effectTag !== "Pure") {
          effectViolations++;
        }
        if (node.stream.usageBound !== 1 && node.stream.usageBound !== "∞") {
          multiplicityViolations++;
        }
        if (isStatefulOperation(node.operator)) {
          stateViolations++;
        }
        if (node.isFeedback) {
          feedbackViolations++;
        }
      }
    }

    return {
      effectViolations,
      multiplicityViolations,
      stateViolations,
      feedbackViolations
    };
  }
}

// ============================================================================
// Deforestation Integration
// ============================================================================

/**
 * Integrate deforestation with rewrite rules
 */
export function applyDeforestationWithRewrites<S>(
  graph: StreamGraph<S>,
  config: SegmentDetectionConfig = defaultSegmentConfig()
): DeforestationResult<S> {
  // Step 1: Apply algebraic rewrites (from Prompt 32) to maximize segment length
  const rewrittenGraph = applyAlgebraicRewrites(graph);
  
  // Step 2: Perform deforestation
  const optimizer = new LazyDeforestationOptimizer(config, true);
  const result = optimizer.deforest(rewrittenGraph);
  
  // Step 3: Mark fused nodes as non-splittable for subsequent passes
  markFusedNodesAsNonSplittable(result.optimizedGraph);
  
  return result;
}

/**
 * Apply algebraic rewrites to maximize segment length
 */
function applyAlgebraicRewrites<S>(graph: StreamGraph<S>): StreamGraph<S> {
  // This would implement the algebraic rewrites from Prompt 32
  // For now, return the original graph
  return graph;
}

/**
 * Mark fused nodes as non-splittable
 */
function markFusedNodesAsNonSplittable<S>(graph: StreamGraph<S>): void {
  for (const [id, node] of graph.nodes) {
    if (node.operator === 'fused') {
      // Mark as non-splittable for subsequent optimization passes
      (node as any).nonSplittable = true;
    }
  }
}

// ============================================================================
// Configuration and Utilities
// ============================================================================

/**
 * Default segment detection configuration
 */
export function defaultSegmentConfig(): SegmentDetectionConfig {
  return {
    enableLazyEvaluation: true,
    enableCompileTimeFusion: true,
    enableRuntimeSpecialization: false,
    maxSegmentLength: 10,
    minSegmentLength: 2,
    allowFeedbackSegments: false,
    preserveDebugInfo: true
  };
}

/**
 * Performance-optimized configuration
 */
export function performanceConfig(): SegmentDetectionConfig {
  return {
    enableLazyEvaluation: false, // Eager composition for performance
    enableCompileTimeFusion: true,
    enableRuntimeSpecialization: false,
    maxSegmentLength: 20,
    minSegmentLength: 3,
    allowFeedbackSegments: false,
    preserveDebugInfo: false
  };
}

/**
 * Safety-focused configuration
 */
export function safetyConfig(): SegmentDetectionConfig {
  return {
    enableLazyEvaluation: true,
    enableCompileTimeFusion: false,
    enableRuntimeSpecialization: true,
    maxSegmentLength: 5,
    minSegmentLength: 2,
    allowFeedbackSegments: false,
    preserveDebugInfo: true
  };
}

// ============================================================================
// Debug and Diagnostics
// ============================================================================

/**
 * Enable deforestation debug logging
 */
export function enableDeforestationDebug(): void {
  multiplicityDebug.enabled = true;
  multiplicityLogger.info('[Deforestation] Debug logging enabled for deforestation');
}

/**
 * Disable deforestation debug logging
 */
export function disableDeforestationDebug(): void {
  multiplicityDebug.enabled = false;
  multiplicityLogger.info('[Deforestation] Debug logging disabled for deforestation');
}

/**
 * Generate deforestation debug output
 */
export function generateDeforestationDebug<S>(result: DeforestationResult<S>): string {
  let output = '# Lazy Deforestation Debug Output\n\n';
  
  output += '## Fusion Statistics\n';
  output += `- Total segments: ${result.fusionStats.totalSegments}\n`;
  output += `- Fused segments: ${result.fusionStats.fusedSegments}\n`;
  output += `- Skipped segments: ${result.fusionStats.skippedSegments}\n`;
  output += `- Total nodes fused: ${result.fusionStats.totalNodesFused}\n`;
  output += `- Average segment length: ${result.fusionStats.averageSegmentLength.toFixed(2)}\n`;
  output += `- Allocation reduction: ${result.fusionStats.allocationReduction}\n`;
  output += `- Indirection reduction: ${result.fusionStats.indirectionReduction}\n\n`;
  
  output += '## Safety Violations\n';
  output += `- Effect violations: ${result.safetyViolations.effectViolations}\n`;
  output += `- Multiplicity violations: ${result.safetyViolations.multiplicityViolations}\n`;
  output += `- State violations: ${result.safetyViolations.stateViolations}\n`;
  output += `- Feedback violations: ${result.safetyViolations.feedbackViolations}\n\n`;
  
  output += '## Pure Segments\n';
  result.pureSegments.forEach((segment, index) => {
    output += `### Segment ${index + 1}\n`;
    output += `- Nodes: ${segment.nodes.map(n => n.id).join(' -> ')}\n`;
    output += `- Length: ${segment.nodes.length}\n`;
    output += `- Multiplicity: ${segment.multiplicity}\n`;
    output += `- Is lazy: ${segment.isLazy}\n`;
    output += `- Fusion type: ${segment.metadata.fusionType}\n`;
    output += `- Composition hash: ${segment.metadata.compositionHash}\n\n`;
  });
  
  return output;
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize debug logging if enabled
if (multiplicityDebug.enabled) {
  multiplicityLogger.info('[Deforestation] Lazy deforestation system initialized');
} 