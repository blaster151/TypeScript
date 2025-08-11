/**
 * Graph-Aware Stream Fusion System
 * 
 * This module extends the effect-aware, multiplicity-safe stream optimizer to work
 * on arbitrary stream graphs that may include branching (parallel paths) and feedback loops.
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

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * State function type for streams
 */
export type StateFn<S, A> = (state: S) => [S, A];

/**
 * Stream node in the graph
 */
export interface StreamNode<In, Out, S, UB extends Multiplicity> {
  id: string;
  stream: Stream<In, Out, S, UB>;
  downstream: string[]; // node IDs
  upstream: string[];   // node IDs
  operator: StreamOperator;
  params?: any;
  isFeedback?: boolean; // marks feedback edges
}

/**
 * Stream graph representation
 */
export interface StreamGraph<S> {
  nodes: Map<string, StreamNode<any, any, S, any>>;
  feedbackEdges: Set<string>; // edge IDs in format "from->to"
}

/**
 * Fusion edge in the graph
 */
export interface FusionEdge {
  from: string;
  to: string;
  effectSafe: boolean;
  multiplicitySafe: boolean;
  eligible: boolean;
  fusedEffectTag?: EffectTag;
  fusedBound?: Multiplicity;
}

/**
 * Strongly connected component (SCC)
 */
export interface StronglyConnectedComponent {
  nodes: string[];
  isFeedback: boolean;
  canFuse: boolean;
  reason?: string;
}

/**
 * Graph fusion result
 */
export interface GraphFusionResult<S> {
  originalGraph: StreamGraph<S>;
  optimizedGraph: StreamGraph<S>;
  fusionEdges: FusionEdge[];
  sccs: StronglyConnectedComponent[];
  fusionStats: {
    totalEdges: number;
    eligibleEdges: number;
    fusedEdges: number;
    skippedEdges: number;
    multiplicityViolations: number;
    effectViolations: number;
    feedbackCycles: number;
  };
}

// ============================================================================
// Graph Analysis Utilities
// ============================================================================

/**
 * Find strongly connected components using Tarjan's algorithm
 */
export function findStronglyConnectedComponents<S>(
  graph: StreamGraph<S>
): StronglyConnectedComponent[] {
  const nodes = Array.from(graph.nodes.keys());
  const visited = new Set<string>();
  const onStack = new Set<string>();
  const low = new Map<string, number>();
  const disc = new Map<string, number>();
  const stack: string[] = [];
  let time = 0;
  const sccs: StronglyConnectedComponent[] = [];

  function tarjan(nodeId: string): void {
    visited.add(nodeId);
    onStack.add(nodeId);
    stack.push(nodeId);
    disc.set(nodeId, time);
    low.set(nodeId, time);
    time++;

    const node = graph.nodes.get(nodeId);
    if (!node) return;

    for (const neighborId of node.downstream) {
      if (!visited.has(neighborId)) {
        tarjan(neighborId);
        low.set(nodeId, Math.min(low.get(nodeId) || 0, low.get(neighborId) || 0));
      } else if (onStack.has(neighborId)) {
        low.set(nodeId, Math.min(low.get(nodeId) || 0, disc.get(neighborId) || 0));
      }
    }

    if (low.get(nodeId) === disc.get(nodeId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== nodeId);

      if (scc.length > 1) {
        // Check if this SCC can be fused
        const canFuse = canFuseSCC(graph, scc);
        sccs.push({
          nodes: scc,
          isFeedback: true,
          canFuse: canFuse.eligible,
          reason: canFuse.reason
        });
      }
    }
  }

  for (const nodeId of nodes) {
    if (!visited.has(nodeId)) {
      tarjan(nodeId);
    }
  }

  return sccs;
}

/**
 * Check if a strongly connected component can be fused
 */
export function canFuseSCC<S>(
  graph: StreamGraph<S>,
  scc: string[]
): { eligible: boolean; reason?: string } {
  // Get all nodes in the SCC
  const nodes = scc.map(id => graph.nodes.get(id)).filter(Boolean);
  
  if (nodes.length === 0) {
    return { eligible: false, reason: "No nodes in SCC" };
  }

  // Check multiplicity bounds
  let maxBound: Multiplicity = 1;
  for (const node of nodes) {
    if (node!.stream.usageBound === "∞") {
      maxBound = "∞";
      break;
    }
    maxBound = Math.max(maxBound as number, node!.stream.usageBound as number);
  }

  // If any node has infinite bound, fusion is unsafe
  if (maxBound === "∞") {
    return { eligible: false, reason: "Infinite multiplicity bound in cycle" };
  }

  // Check effect tags
  let maxEffect: EffectTag = "Pure";
  for (const node of nodes) {
    const effect = node!.stream.effectTag;
    if (effect === "ExternalEffect" || effect === "NonDeterministicEffect") {
      return { eligible: false, reason: `Unsafe effect in cycle: ${effect}` };
    }
    if (effect === "DeterministicEffect") {
      maxEffect = "DeterministicEffect";
    }
  }

  // Only allow fusion if all effects are Pure or DeterministicEffect
  if (maxEffect === "DeterministicEffect" && maxBound > 1) {
    return { eligible: false, reason: "DeterministicEffect with multiplicity > 1 in cycle" };
  }

  return { eligible: true };
}

/**
 * Perform topological sort on DAG sections
 */
export function topologicalSort<S>(
  graph: StreamGraph<S>,
  excludeSCCs: Set<string>
): string[] {
  const nodes = Array.from(graph.nodes.keys()).filter(id => !excludeSCCs.has(id));
  const visited = new Set<string>();
  const temp = new Set<string>();
  const result: string[] = [];

  function visit(nodeId: string): void {
    if (temp.has(nodeId)) {
      throw new Error(`Cycle detected: ${nodeId}`);
    }
    if (visited.has(nodeId)) {
      return;
    }

    temp.add(nodeId);
    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const neighborId of node.downstream) {
        if (!excludeSCCs.has(neighborId)) {
          visit(neighborId);
        }
      }
    }
    temp.delete(nodeId);
    visited.add(nodeId);
    result.push(nodeId);
  }

  for (const nodeId of nodes) {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
  }

  return result.reverse();
}

// ============================================================================
// Fusion Edge Analysis
// ============================================================================

/**
 * Analyze fusion eligibility for all edges in the graph
 */
export function analyzeFusionEdges<S>(
  graph: StreamGraph<S>
): FusionEdge[] {
  const edges: FusionEdge[] = [];

  for (const [nodeId, node] of graph.nodes) {
    for (const downstreamId of node.downstream) {
      const downstreamNode = graph.nodes.get(downstreamId);
      if (!downstreamNode) continue;

      const effectSafe = isEffectFusionSafe(node.stream.effectTag, downstreamNode.stream.effectTag);
      const multiplicitySafe = !wouldIncreaseMultiplicity(node.stream, downstreamNode.stream);
      const eligible = effectSafe && multiplicitySafe;

      const fusedEffectTag = eligible ? calculateFusedEffectTag(node.stream, downstreamNode.stream) : undefined;
      const fusedBound = eligible ? calculateFusedBound(node.stream, downstreamNode.stream) : undefined;

      edges.push({
        from: nodeId,
        to: downstreamId,
        effectSafe,
        multiplicitySafe,
        eligible,
        fusedEffectTag,
        fusedBound
      });
    }
  }

  return edges;
}

/**
 * Check if fusion across a split is safe
 */
export function canFuseAcrossSplit<S>(
  graph: StreamGraph<S>,
  splitNodeId: string,
  branchNodeIds: string[]
): { eligible: boolean; reason?: string } {
  const splitNode = graph.nodes.get(splitNodeId);
  if (!splitNode) {
    return { eligible: false, reason: "Split node not found" };
  }

  // Check if all branches meet safety conditions independently
  for (const branchId of branchNodeIds) {
    const branchNode = graph.nodes.get(branchId);
    if (!branchNode) {
      return { eligible: false, reason: `Branch node ${branchId} not found` };
    }

    const effectSafe = isEffectFusionSafe(splitNode.stream.effectTag, branchNode.stream.effectTag);
    const multiplicitySafe = !wouldIncreaseMultiplicity(splitNode.stream, branchNode.stream);

    if (!effectSafe || !multiplicitySafe) {
      return { 
        eligible: false, 
        reason: `Branch ${branchId} violates safety: effect=${effectSafe}, multiplicity=${multiplicitySafe}` 
      };
    }
  }

  return { eligible: true };
}

/**
 * Check if fusion across a join is safe
 */
export function canFuseAcrossJoin<S>(
  graph: StreamGraph<S>,
  joinNodeId: string,
  inputNodeIds: string[]
): { eligible: boolean; reason?: string } {
  const joinNode = graph.nodes.get(joinNodeId);
  if (!joinNode) {
    return { eligible: false, reason: "Join node not found" };
  }

  // Check if all inputs are Pure or DeterministicEffect
  for (const inputId of inputNodeIds) {
    const inputNode = graph.nodes.get(inputId);
    if (!inputNode) {
      return { eligible: false, reason: `Input node ${inputId} not found` };
    }

    if (inputNode.stream.effectTag === "NonDeterministicEffect" || 
        inputNode.stream.effectTag === "ExternalEffect") {
      return { 
        eligible: false, 
        reason: `Input ${inputId} has unsafe effect: ${inputNode.stream.effectTag}` 
      };
    }
  }

  // Check multiplicity bounds
  let totalBound: Multiplicity = 0;
  for (const inputId of inputNodeIds) {
    const inputNode = graph.nodes.get(inputId);
    if (inputNode!.stream.usageBound === "∞") {
      totalBound = "∞";
      break;
    }
    totalBound = (totalBound as number) + (inputNode!.stream.usageBound as number);
  }

  if (totalBound === "∞" || (totalBound as number) > 1) {
    return { 
      eligible: false, 
      reason: `Join would exceed multiplicity bound: ${totalBound}` 
    };
  }

  return { eligible: true };
}

// ============================================================================
// Graph Fusion Optimizer
// ============================================================================

/**
 * Graph-aware stream fusion optimizer
 */
export class GraphAwareStreamFusionOptimizer {
  private debugEnabled: boolean;
  private allowUnsafeFusion: boolean;

  constructor(debugEnabled: boolean = false, allowUnsafeFusion: boolean = false) {
    this.debugEnabled = debugEnabled;
    this.allowUnsafeFusion = allowUnsafeFusion;
  }

  /**
   * Optimize a stream graph by applying safe fusions
   */
  optimizeGraph<S>(graph: StreamGraph<S>): GraphFusionResult<S> {
    if (this.debugEnabled) {
      multiplicityLogger.info('[GraphFusion] Starting graph optimization');
    }

    // Step 1: Find strongly connected components
    const sccs = findStronglyConnectedComponents(graph);
    const sccNodes = new Set<string>();
    sccs.forEach(scc => scc.nodes.forEach(id => sccNodes.add(id)));

    if (this.debugEnabled) {
      multiplicityLogger.info(`[GraphFusion] Found ${sccs.length} strongly connected components`);
      sccs.forEach(scc => {
        multiplicityLogger.debug(`[GraphFusion] SCC: ${scc.nodes.join(' -> ')} (fusable: ${scc.canFuse})`);
      });
    }

    // Step 2: Analyze fusion edges
    const fusionEdges = analyzeFusionEdges(graph);
    const eligibleEdges = fusionEdges.filter(edge => edge.eligible);

    if (this.debugEnabled) {
      multiplicityLogger.info(`[GraphFusion] Found ${fusionEdges.length} edges, ${eligibleEdges.length} eligible for fusion`);
    }

    // Step 3: Apply fusions within SCCs
    const optimizedGraph = this.applySCCFusions(graph, sccs, fusionEdges);

    // Step 4: Apply fusions in DAG sections
    const finalGraph = this.applyDAGFusions(optimizedGraph, sccNodes, fusionEdges);

    // Step 5: Calculate statistics
    const fusionStats = this.calculateFusionStats(fusionEdges, sccs);

    if (this.debugEnabled) {
      multiplicityLogger.info('[GraphFusion] Graph optimization complete', fusionStats);
    }

    return {
      originalGraph: graph,
      optimizedGraph: finalGraph,
      fusionEdges,
      sccs,
      fusionStats
    };
  }

  /**
   * Apply fusions within strongly connected components
   */
  private applySCCFusions<S>(
    graph: StreamGraph<S>,
    sccs: StronglyConnectedComponent[],
    fusionEdges: FusionEdge[]
  ): StreamGraph<S> {
    const optimizedGraph = { ...graph, nodes: new Map(graph.nodes) };

    for (const scc of sccs) {
      if (!scc.canFuse) {
        if (this.debugEnabled) {
          multiplicityLogger.warn(`[GraphFusion] Skipping SCC fusion: ${scc.reason}`);
        }
        continue;
      }

      // Find fusion edges within this SCC
      const sccEdges = fusionEdges.filter(edge => 
        scc.nodes.includes(edge.from) && scc.nodes.includes(edge.to) && edge.eligible
      );

      if (this.debugEnabled) {
        multiplicityLogger.info(`[GraphFusion] Fusing SCC with ${sccEdges.length} edges`);
      }

      // Apply fusions within the SCC
      for (const edge of sccEdges) {
        this.fuseNodes(optimizedGraph, edge);
      }
    }

    return optimizedGraph;
  }

  /**
   * Apply fusions in DAG sections
   */
  private applyDAGFusions<S>(
    graph: StreamGraph<S>,
    sccNodes: Set<string>,
    fusionEdges: FusionEdge[]
  ): StreamGraph<S> {
    const optimizedGraph = { ...graph, nodes: new Map(graph.nodes) };

    // Get topological order for DAG sections
    const topoOrder = topologicalSort(optimizedGraph, sccNodes);

    if (this.debugEnabled) {
      multiplicityLogger.info(`[GraphFusion] Processing DAG with ${topoOrder.length} nodes`);
    }

    // Apply fusions in topological order
    for (const nodeId of topoOrder) {
      const node = optimizedGraph.nodes.get(nodeId);
      if (!node) continue;

      // Find eligible fusion edges from this node
      const eligibleEdges = fusionEdges.filter(edge => 
        edge.from === nodeId && edge.eligible && !sccNodes.has(edge.to)
      );

      for (const edge of eligibleEdges) {
        this.fuseNodes(optimizedGraph, edge);
      }
    }

    return optimizedGraph;
  }

  /**
   * Fuse two nodes in the graph
   */
  private fuseNodes<S>(graph: StreamGraph<S>, edge: FusionEdge): void {
    const fromNode = graph.nodes.get(edge.from);
    const toNode = graph.nodes.get(edge.to);

    if (!fromNode || !toNode) {
      if (this.debugEnabled) {
        multiplicityLogger.warn(`[GraphFusion] Cannot fuse: node not found`);
      }
      return;
    }

    // Create fused stream
    const fusedStream: Stream<any, any, any, any> = {
      usageBound: edge.fusedBound!,
      effectTag: edge.fusedEffectTag!,
      __type: 'Stream',
      run: (input: any) => {
        const fromStateFn = fromNode.stream.run(input);
        const toStateFn = toNode.stream.run(input);
        
        return (state: any) => {
              const [fromState, fromResult] = fromStateFn(state);
    const [toState, toResult] = toStateFn(fromState);
                      return [toState, toResult];
        };
      }
    };

    // Create fused node
    const fusedNode: StreamNode<any, any, any, any> = {
      id: `${edge.from}->${edge.to}`,
      stream: fusedStream,
      downstream: toNode.downstream,
      upstream: fromNode.upstream,
      operator: 'fused',
      isFeedback: fromNode.isFeedback || toNode.isFeedback
    };

    // Update graph
    graph.nodes.delete(edge.from);
    graph.nodes.delete(edge.to);
    graph.nodes.set(fusedNode.id, fusedNode);

    // Update upstream references
    for (const upstreamId of fromNode.upstream) {
      const upstreamNode = graph.nodes.get(upstreamId);
      if (upstreamNode) {
        upstreamNode.downstream = upstreamNode.downstream.map(id => 
          id === edge.from || id === edge.to ? fusedNode.id : id
        );
      }
    }

    // Update downstream references
    for (const downstreamId of toNode.downstream) {
      const downstreamNode = graph.nodes.get(downstreamId);
      if (downstreamNode) {
        downstreamNode.upstream = downstreamNode.upstream.map(id => 
          id === edge.from || id === edge.to ? fusedNode.id : id
        );
      }
    }

    if (this.debugEnabled) {
      multiplicityLogger.info(`[GraphFusion] Fused ${edge.from} -> ${edge.to} into ${fusedNode.id}`);
    }
  }

  /**
   * Calculate fusion statistics
   */
  private calculateFusionStats(
    fusionEdges: FusionEdge[],
    sccs: StronglyConnectedComponent[]
  ): GraphFusionResult<any>['fusionStats'] {
    const totalEdges = fusionEdges.length;
    const eligibleEdges = fusionEdges.filter(edge => edge.eligible).length;
    const fusedEdges = fusionEdges.filter(edge => edge.eligible).length; // Simplified
    const skippedEdges = totalEdges - eligibleEdges;
    const multiplicityViolations = fusionEdges.filter(edge => !edge.multiplicitySafe).length;
    const effectViolations = fusionEdges.filter(edge => !edge.effectSafe).length;
    const feedbackCycles = sccs.filter(scc => scc.isFeedback).length;

    return {
      totalEdges,
      eligibleEdges,
      fusedEdges,
      skippedEdges,
      multiplicityViolations,
      effectViolations,
      feedbackCycles
    };
  }
}

// ============================================================================
// Graph Factory Functions
// ============================================================================

/**
 * Create a simple linear graph
 */
export function createLinearGraph<S>(
  streams: Array<{ id: string; stream: Stream<any, any, S, any>; operator: StreamOperator; params?: any }>
): StreamGraph<S> {
  const nodes = new Map<string, StreamNode<any, any, S, any>>();
  
  for (let i = 0; i < streams.length; i++) {
    const { id, stream, operator, params } = streams[i];
    const upstream = i > 0 ? [streams[i - 1].id] : [];
    const downstream = i < streams.length - 1 ? [streams[i + 1].id] : [];
    
    nodes.set(id, {
      id,
      stream,
      upstream,
      downstream,
      operator,
      params
    });
  }
  
  return { nodes, feedbackEdges: new Set() };
}

/**
 * Create a branching graph
 */
export function createBranchingGraph<S>(
  source: { id: string; stream: Stream<any, any, S, any>; operator: StreamOperator },
  branches: Array<{ id: string; stream: Stream<any, any, S, any>; operator: StreamOperator }>,
  merge: { id: string; stream: Stream<any, any, S, any>; operator: StreamOperator }
): StreamGraph<S> {
  const nodes = new Map<string, StreamNode<any, any, S, any>>();
  
  // Add source node
  nodes.set(source.id, {
    id: source.id,
    stream: source.stream,
    upstream: [],
    downstream: branches.map(b => b.id),
    operator: source.operator
  });
  
  // Add branch nodes
  branches.forEach(branch => {
    nodes.set(branch.id, {
      id: branch.id,
      stream: branch.stream,
      upstream: [source.id],
      downstream: [merge.id],
      operator: branch.operator
    });
  });
  
  // Add merge node
  nodes.set(merge.id, {
    id: merge.id,
    stream: merge.stream,
    upstream: branches.map(b => b.id),
    downstream: [],
    operator: merge.operator
  });
  
  return { nodes, feedbackEdges: new Set() };
}

/**
 * Create a feedback graph
 */
export function createFeedbackGraph<S>(
  nodes: Array<{ id: string; stream: Stream<any, any, S, any>; operator: StreamOperator }>,
  feedbackEdge: { from: string; to: string }
): StreamGraph<S> {
  const nodeMap = new Map<string, StreamNode<any, any, S, any>>();
  
  // Create nodes with connections
  for (let i = 0; i < nodes.length; i++) {
    const { id, stream, operator } = nodes[i];
    const upstream = i > 0 ? [nodes[i - 1].id] : [];
    const downstream = i < nodes.length - 1 ? [nodes[i + 1].id] : [];
    
    nodeMap.set(id, {
      id,
      stream,
      upstream,
      downstream,
      operator
    });
  }
  
  // Add feedback edge
  const fromNode = nodeMap.get(feedbackEdge.from);
  const toNode = nodeMap.get(feedbackEdge.to);
  
  if (fromNode && toNode) {
    fromNode.downstream.push(feedbackEdge.to);
    toNode.upstream.push(feedbackEdge.from);
  }
  
  return { 
    nodes: nodeMap, 
    feedbackEdges: new Set([`${feedbackEdge.from}->${feedbackEdge.to}`]) 
  };
}

// ============================================================================
// Debug and Diagnostics
// ============================================================================

/**
 * Enable graph fusion debug logging
 */
export function enableGraphFusionDebug(): void {
  multiplicityDebug.enabled = true;
  multiplicityLogger.info('[GraphFusion] Debug logging enabled for graph fusion');
}

/**
 * Disable graph fusion debug logging
 */
export function disableGraphFusionDebug(): void {
  multiplicityDebug.enabled = false;
  multiplicityLogger.info('[GraphFusion] Debug logging disabled for graph fusion');
}

/**
 * Log graph fusion statistics
 */
export function logGraphFusionStats(stats: GraphFusionResult<any>['fusionStats']): void {
  if (multiplicityDebug.enabled) {
    multiplicityLogger.info('[GraphFusion] Statistics', stats);
  }
}

/**
 * Generate debug output for fusion graph
 */
export function generateFusionGraphDebug<S>(result: GraphFusionResult<S>): string {
  let output = '# Graph Fusion Debug Output\n\n';
  
  output += '## Fusion Statistics\n';
  output += `- Total edges: ${result.fusionStats.totalEdges}\n`;
  output += `- Eligible edges: ${result.fusionStats.eligibleEdges}\n`;
  output += `- Fused edges: ${result.fusionStats.fusedEdges}\n`;
  output += `- Skipped edges: ${result.fusionStats.skippedEdges}\n`;
  output += `- Multiplicity violations: ${result.fusionStats.multiplicityViolations}\n`;
  output += `- Effect violations: ${result.fusionStats.effectViolations}\n`;
  output += `- Feedback cycles: ${result.fusionStats.feedbackCycles}\n\n`;
  
  output += '## Strongly Connected Components\n';
  result.sccs.forEach((scc, index) => {
    output += `### SCC ${index + 1}\n`;
    output += `- Nodes: ${scc.nodes.join(' -> ')}\n`;
    output += `- Is feedback: ${scc.isFeedback}\n`;
    output += `- Can fuse: ${scc.canFuse}\n`;
    if (scc.reason) {
      output += `- Reason: ${scc.reason}\n`;
    }
    output += '\n';
  });
  
  output += '## Fusion Edges\n';
  result.fusionEdges.forEach(edge => {
    output += `- ${edge.from} -> ${edge.to}\n`;
    output += `  - Effect safe: ${edge.effectSafe}\n`;
    output += `  - Multiplicity safe: ${edge.multiplicitySafe}\n`;
    output += `  - Eligible: ${edge.eligible}\n`;
    if (edge.fusedEffectTag) {
      output += `  - Fused effect: ${edge.fusedEffectTag}\n`;
    }
    if (edge.fusedBound) {
      output += `  - Fused bound: ${edge.fusedBound}\n`;
    }
    output += '\n';
  });
  
  return output;
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize debug logging if enabled
if (multiplicityDebug.enabled) {
  multiplicityLogger.info('[GraphFusion] Graph-aware stream fusion system initialized');
} 