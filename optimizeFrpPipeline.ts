/**
 * FRP Pipeline Optimizer
 * 
 * This module wires together the fusion utilities, operator metadata, and FRP fusion transformer
 * to create a complete compile-time optimization pass that replaces fusible operator pairs
 * with single fused nodes in the AST.
 */

import { operatorRegistry, getOperatorInfo, canFuse, getFusionType } from './operatorMetadata';
import * as fusionUtils from './fusionUtils';
import * as ts from 'typescript';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Fusion metadata for tracking fusion history
 */
export interface FusionMetadata {
  isFused: boolean;
  fusionPass: number;
  fusionStep: number;
  originalOperators: string[];
  originalPositions: number[];
  fusionType: string;
  fusionTimestamp: number;
  fusionHistory: FusionHistoryEntry[];
  sourceNodes?: FRPNode[];
}

/**
 * Individual fusion history entry
 */
export interface FusionHistoryEntry {
  pass: number;
  step: number;
  position: number;
  operator1: string;
  operator2: string;
  fusionType: string;
  timestamp: number;
}

/**
 * FRP AST node representation with enhanced fusion metadata
 */
export interface FRPNode {
  op: string;
  fn: any;
  args?: any[];
  meta?: Record<string, any>;
  fusionMetadata?: FusionMetadata;
}

/**
 * Fusion result
 */
export interface FusionResult {
  original: FRPNode[];
  fused: FRPNode[];
  operatorsFused: number;
  multiplicityPreserved: boolean;
  typePreserved: boolean;
}

/**
 * Fusion trace entry
 */
export interface FusionTrace {
  iteration: number;
  step: number;
  position: number;
  operator1: string;
  operator2: string;
  fusedOperator: string;
  originalLength: number;
  newLength: number;
  fusionType: string;
  timestamp: number;
}

/**
 * Optimization configuration
 */
export interface OptimizationConfig {
  enableTracing: boolean;
  maxIterations: number;
  logLevel: 'none' | 'basic' | 'detailed' | 'verbose';
  traceToConsole: boolean;
  traceToFile?: string;
}

// ============================================================================
// Pipeline Fusion
// ============================================================================

/**
 * Walk the pipeline and replace fusible pairs with fused nodes
 */
export function fusePipeline(
  nodes: FRPNode[], 
  config: OptimizationConfig = defaultConfig(),
  trace: FusionTrace[] = [],
  iteration: number = 0
): { result: FRPNode[], trace: FusionTrace[] } {
  const result: FRPNode[] = [];
  let i = 0;
  let step = 0;
  const originalLength = nodes.length;

  while (i < nodes.length) {
    const current = nodes[i];
    const next = nodes[i + 1];

    if (next) {
      const currentMeta = getOperatorInfo(current.op);
      const nextMeta = getOperatorInfo(next.op);
    
      if (
        currentMeta && 
        nextMeta && 
        canFuse(current.op, next.op) &&
        currentMeta.transformBuilder
      ) {
        // Create fusion history entry
        const fusionHistoryEntry: FusionHistoryEntry = {
          pass: iteration,
          step: step,
          position: i,
          operator1: current.op,
          operator2: next.op,
          fusionType: getFusionType(current.op, next.op) || 'unknown',
          timestamp: Date.now()
        };

        // Build comprehensive fusion metadata
        const fusionMetadata: FusionMetadata = {
          isFused: true,
          fusionPass: iteration,
          fusionStep: step,
          originalOperators: [current.op, next.op],
          originalPositions: [i, i + 1],
          fusionType: fusionHistoryEntry.fusionType,
          fusionTimestamp: fusionHistoryEntry.timestamp,
          fusionHistory: [fusionHistoryEntry],
          sourceNodes: [current, next]
        };

        // Merge fusion history from source nodes if they exist
        if (current.fusionMetadata?.fusionHistory) {
          fusionMetadata.fusionHistory.unshift(...current.fusionMetadata.fusionHistory);
        }
        if (next.fusionMetadata?.fusionHistory) {
          fusionMetadata.fusionHistory.unshift(...next.fusionMetadata.fusionHistory);
        }

        // Call the fusion builder to get a new fused node
        const fusedNode: FRPNode = {
          op: `${current.op}+${next.op}`,
          fn: currentMeta.transformBuilder(current, next),
          meta: { fused: true, originalOps: [current.op, next.op] },
          fusionMetadata
        };
        result.push(fusedNode);

        // Record fusion trace
        if (config.enableTracing) {
          const fusionTrace: FusionTrace = {
            iteration,
            step: step++,
            position: i,
            operator1: current.op,
            operator2: next.op,
            fusedOperator: `${current.op}+${next.op}`,
            originalLength,
            newLength: result.length,
            fusionType: getFusionType(current.op, next.op) || 'unknown',
            timestamp: Date.now()
          };
          trace.push(fusionTrace);

          // Log to console if enabled
          if (config.traceToConsole) {
            logFusionTrace(fusionTrace, config.logLevel);
          }
        }
    
        i += 2; // Skip the next node — it's now fused
        continue;
      }
    }
    
    result.push(current);
    i++;
  }

  return { result, trace };
}

/**
 * Recursively fuse pipeline until no more fusions are possible
 */
export function optimizePipeline(
  nodes: FRPNode[], 
  config: OptimizationConfig = defaultConfig()
): { result: FRPNode[], trace: FusionTrace[] } {
  let currentNodes = [...nodes];
  let previousLength = currentNodes.length;
  let iterations = 0;
  const allTraces: FusionTrace[] = [];

  if (config.enableTracing && config.traceToConsole) {
    console.log(`🔄 Starting FRP pipeline optimization with ${nodes.length} nodes`);
  }

  while (iterations < config.maxIterations) {
    const { result, trace } = fusePipeline(currentNodes, config, [], iterations);
    
    // Accumulate traces
    allTraces.push(...trace);
    
    if (result.length === previousLength) {
      // No more fusions possible
      if (config.enableTracing && config.traceToConsole) {
        console.log(`✅ Optimization complete after ${iterations} iterations`);
        console.log(`📊 Final result: ${result.length} nodes (reduced from ${nodes.length})`);
      }
      break;
    }
    
    previousLength = result.length;
    currentNodes = result;
    iterations++;
  }

  return { result: currentNodes, trace: allTraces };
}

// ============================================================================
// AST Integration
// ============================================================================

/**
 * Parse FRP pipeline from TypeScript AST
 */
export function parseFrpPipeline(sourceCode: string): FRPNode[] {
  const sourceFile = ts.createSourceFile(
    'pipeline.ts',
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const nodes: FRPNode[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text;
      const operatorInfo = getOperatorInfo(methodName);
      
      if (operatorInfo) {
        nodes.push({
          op: methodName,
          fn: node.arguments[0] ? node.arguments[0].getText() : undefined,
          args: node.arguments.map(arg => arg.getText()),
          meta: { sourceNode: node }
        });
      }
    }
    
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return nodes;
}

/**
 * Convert FRP nodes back to TypeScript AST
 */
export function frpNodesToAst(nodes: FRPNode[]): ts.Expression {
  if (nodes.length === 0) {
    throw new Error('Cannot convert empty node array to AST');
  }

  let expression = createOperatorCall(nodes[0]);

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    expression = ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(expression, node.op),
      undefined,
      node.args ? node.args.map(arg => ts.factory.createIdentifier(arg)) : []
    );
  }

  return expression;
}

/**
 * Create an operator call expression
 */
function createOperatorCall(node: FRPNode): ts.Expression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier('stream'),
      node.op
    ),
    undefined,
    node.args ? node.args.map(arg => ts.factory.createIdentifier(arg)) : []
  );
}

// ============================================================================
// Main Optimizer
// ============================================================================

/**
 * Optimize FRP pipeline from source code
 */
export function optimizeFrpPipeline(
  sourceCode: string, 
  config: OptimizationConfig = defaultConfig()
): { result: string, trace: FusionTrace[] } {
  const ast = parseFrpPipeline(sourceCode);
  const { result: fusedAst, trace } = optimizePipeline(ast, config);
  const resultExpression = frpNodesToAst(fusedAst);
  
  return { 
    result: resultExpression.getText(),
    trace 
  };
}

/**
 * Optimize FRP pipeline from AST nodes
 */
export function optimizeFrpPipelineFromNodes(
  nodes: FRPNode[], 
  config: OptimizationConfig = defaultConfig()
): { result: FRPNode[], trace: FusionTrace[] } {
  return optimizePipeline(nodes, config);
}

// ============================================================================
// Integration with Fusion Utils
// ============================================================================

/**
 * Create fusion builder that uses fusion utilities
 */
export function createFusionBuilder(op1Name: string, op2Name: string): ((op1: FRPNode, op2: FRPNode) => any) | undefined {
  const fusionType = getFusionType(op1Name, op2Name);
  
  if (!fusionType || fusionType === 'not-fusible') {
    return undefined;
  }

  switch (`${op1Name}-${op2Name}`) {
    case 'map-map':
      return (op1, op2) => fusionUtils.fuseMapMap(op1.fn, op2.fn);
    
    case 'map-filter':
      return (op1, op2) => fusionUtils.fuseMapFilter(op1.fn, op2.fn);
    
    case 'filter-map':
      return (op1, op2) => fusionUtils.fuseFilterMap(op1.fn, op2.fn);
    
    case 'filter-filter':
      return (op1, op2) => fusionUtils.fuseFilterFilter(op1.fn, op2.fn);
    
    case 'map-scan':
      return (op1, op2) => fusionUtils.fuseMapScan(op1.fn, op2.fn);
    
    case 'scan-map':
      return (op1, op2) => fusionUtils.fuseScanMap(op1.fn, op2.fn);
    
    default:
      return undefined;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a pipeline can be optimized
 */
export function canOptimizePipeline(nodes: FRPNode[]): boolean {
  if (nodes.length < 2) return false;
  
  for (let i = 0; i < nodes.length - 1; i++) {
    if (canFuse(nodes[i].op, nodes[i + 1].op)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get optimization statistics
 */
export function getOptimizationStats(original: FRPNode[], optimized: FRPNode[]): {
  originalCount: number;
  optimizedCount: number;
  reduction: number;
  reductionPercentage: number;
} {
  const originalCount = original.length;
  const optimizedCount = optimized.length;
  const reduction = originalCount - optimizedCount;
  const reductionPercentage = originalCount > 0 ? (reduction / originalCount) * 100 : 0;
  
  return {
    originalCount,
    optimizedCount,
    reduction,
    reductionPercentage
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize fusion builders in operator metadata
export function initializeFusionBuilders(): void {
  for (const [opName, opInfo] of Object.entries(operatorRegistry)) {
    for (const fusibleOp of opInfo.fusibleAfter) {
      const fusionBuilder = createFusionBuilder(opName, fusibleOp);
      if (fusionBuilder) {
        // Update the operator info with the fusion builder
        opInfo.transformBuilder = fusionBuilder;
      }
    }
  }
}

// ============================================================================
// Tracing and Logging Functions
// ============================================================================

/**
 * Default optimization configuration
 */
export function defaultConfig(): OptimizationConfig {
  return {
    enableTracing: false,
    maxIterations: 10,
    logLevel: 'basic',
    traceToConsole: false
  };
}

/**
 * Log fusion trace to console
 */
function logFusionTrace(trace: FusionTrace, logLevel: OptimizationConfig['logLevel']): void {
  const timestamp = new Date(trace.timestamp).toISOString();
  
  switch (logLevel) {
    case 'verbose':
      console.log(`🔗 [${timestamp}] Iteration ${trace.iteration}, Step ${trace.step}:`);
      console.log(`   Position: ${trace.position}`);
      console.log(`   Fused: ${trace.operator1} + ${trace.operator2} → ${trace.fusedOperator}`);
      console.log(`   Type: ${trace.fusionType}`);
      console.log(`   Length: ${trace.originalLength} → ${trace.newLength}`);
      break;
      
    case 'detailed':
      console.log(`🔗 [${timestamp}] ${trace.operator1} + ${trace.operator2} → ${trace.fusedOperator} (${trace.fusionType})`);
      break;
      
    case 'basic':
      console.log(`🔗 ${trace.operator1} + ${trace.operator2} → ${trace.fusedOperator}`);
      break;
      
    default:
      break;
  }
}

/**
 * Save fusion trace to file
 */
export function saveFusionTrace(trace: FusionTrace[], filename: string): void {
  const fs = require('fs');
  const traceData = {
    timestamp: new Date().toISOString(),
    totalFusions: trace.length,
    trace: trace
  };
  
  fs.writeFileSync(filename, JSON.stringify(traceData, null, 2));
  console.log(`📁 Fusion trace saved to ${filename}`);
}

/**
 * Generate fusion report
 */
export function generateFusionReport(trace: FusionTrace[]): {
  totalFusions: number;
  iterations: number;
  fusionTypes: Record<string, number>;
  performance: {
    totalTime: number;
    averageTimePerFusion: number;
  };
} {
  const fusionTypes: Record<string, number> = {};
  let totalTime = 0;
  
  for (const entry of trace) {
    fusionTypes[entry.fusionType] = (fusionTypes[entry.fusionType] || 0) + 1;
    totalTime += entry.timestamp;
  }
  
  const iterations = trace.length > 0 ? Math.max(...trace.map(t => t.iteration)) + 1 : 0;
  
  return {
    totalFusions: trace.length,
    iterations,
    fusionTypes,
    performance: {
      totalTime,
      averageTimePerFusion: trace.length > 0 ? totalTime / trace.length : 0
    }
  };
}

// ============================================================================
// Backward Compatibility Functions
// ============================================================================

/**
 * Backward compatible optimizePipeline function
 */
export function optimizePipelineSimple(nodes: FRPNode[]): FRPNode[] {
  const { result } = optimizePipeline(nodes, { ...defaultConfig(), enableTracing: false });
  return result;
}

// ============================================================================
// Fusion Metadata Utilities
// ============================================================================

/**
 * Check if a node is a fused node
 */
export function isFusedNode(node: FRPNode): boolean {
  return node.fusionMetadata?.isFused === true;
}

/**
 * Get the fusion history of a node
 */
export function getFusionHistory(node: FRPNode): FusionHistoryEntry[] {
  return node.fusionMetadata?.fusionHistory || [];
}

/**
 * Get the original operators that were fused to create this node
 */
export function getOriginalOperators(node: FRPNode): string[] {
  return node.fusionMetadata?.originalOperators || [];
}

/**
 * Get the fusion type of a node
 */
export function getNodeFusionType(node: FRPNode): string | undefined {
  return node.fusionMetadata?.fusionType;
}

/**
 * Get the fusion pass number when this node was created
 */
export function getFusionPass(node: FRPNode): number | undefined {
  return node.fusionMetadata?.fusionPass;
}

/**
 * Get the complete fusion lineage of a node
 */
export function getFusionLineage(node: FRPNode): string[] {
  const history = getFusionHistory(node);
  const lineage: string[] = [];
  
  for (const entry of history) {
    lineage.push(`${entry.operator1}+${entry.operator2}`);
  }
  
  return lineage;
}

/**
 * Get a human-readable fusion description
 */
export function getFusionDescription(node: FRPNode): string {
  if (!isFusedNode(node)) {
    return `${node.op} (not fused)`;
  }
  
  const history = getFusionHistory(node);
  const originalOps = getOriginalOperators(node);
  const pass = getFusionPass(node);
  
  if (history.length === 1) {
    return `${node.op} (fused from ${originalOps.join(' + ')} in pass ${pass})`;
  } else {
    return `${node.op} (multi-fused from ${originalOps.join(' + ')} across ${history.length} passes)`;
  }
}

/**
 * Extract fusion metadata for analysis
 */
export function extractFusionMetadata(nodes: FRPNode[]): {
  fusedNodes: FRPNode[];
  fusionPasses: Record<number, FRPNode[]>;
  fusionTypes: Record<string, FRPNode[]>;
  totalFusions: number;
} {
  const fusedNodes = nodes.filter(isFusedNode);
  const fusionPasses: Record<number, FRPNode[]> = {};
  const fusionTypes: Record<string, FRPNode[]> = {};
  
  for (const node of fusedNodes) {
    const pass = getFusionPass(node);
    const type = getNodeFusionType(node);
    
    if (pass !== undefined) {
      fusionPasses[pass] = fusionPasses[pass] || [];
      fusionPasses[pass].push(node);
    }
    
    if (type) {
      fusionTypes[type] = fusionTypes[type] || [];
      fusionTypes[type].push(node);
    }
  }
  
  return {
    fusedNodes,
    fusionPasses,
    fusionTypes,
    totalFusions: fusedNodes.length
  };
}

/**
 * Create a fusion metadata summary
 */
export function createFusionSummary(nodes: FRPNode[]): {
  totalNodes: number;
  fusedNodes: number;
  fusionRate: number;
  passDistribution: Record<number, number>;
  typeDistribution: Record<string, number>;
  averageFusionsPerNode: number;
} {
  const metadata = extractFusionMetadata(nodes);
  const totalNodes = nodes.length;
  const fusedNodes = metadata.fusedNodes.length;
  
  const passDistribution: Record<number, number> = {};
  for (const [pass, nodes] of Object.entries(metadata.fusionPasses)) {
    passDistribution[parseInt(pass)] = nodes.length;
  }
  
  const typeDistribution: Record<string, number> = {};
  for (const [type, nodes] of Object.entries(metadata.fusionTypes)) {
    typeDistribution[type] = nodes.length;
  }
  
  const totalFusions = metadata.fusedNodes.reduce((sum, node) => {
    return sum + (getFusionHistory(node).length || 0);
  }, 0);
  
  return {
    totalNodes,
    fusedNodes,
    fusionRate: totalNodes > 0 ? (fusedNodes / totalNodes) * 100 : 0,
    passDistribution,
    typeDistribution,
    averageFusionsPerNode: fusedNodes > 0 ? totalFusions / fusedNodes : 0
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Initialize on module load
initializeFusionBuilders(); 