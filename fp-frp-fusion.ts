/**
 * FRP Fusion System
 * 
 * This module provides FRP-specific fusion optimizations that integrate with
 * the existing StatefulStream fusion system. It handles FRP-specific patterns
 * like event stream optimization, UI event fusion, and reactive pipeline
 * optimization.
 * 
 * Features:
 * - FRP-specific fusion rules
 * - Event stream optimization
 * - UI event fusion
 * - Reactive pipeline optimization
 * - Integration with existing fusion system
 * - Purity-aware FRP optimizations
 */

import { 
  StatefulStream, 
  liftStateless, 
  liftStateful,
  compose,
  parallel,
  fanOut,
  fanIn
} from './fp-stream-state';

import { 
  StreamPlanNode,
  FusionRule,
  FusionRegistry,
  optimizePlan,
  canOptimize,
  applyPurityFusion
} from './fp-stream-fusion';

import { 
  FRPStreamPlanNode,
  fromFRP,
  isFRPSource,
  isStatefulStream
} from './fp-frp-bridge';

// ============================================================================
// Part 1: FRP-Specific Fusion Rules
// ============================================================================

/**
 * FRP-specific fusion rules
 */
export const FRPFusionRules: FusionRule[] = [
  {
    name: 'FRP Map-Map Fusion',
    match: (node: StreamPlanNode) => {
      return node.type === 'map' && 
             node.next?.type === 'map' && 
             node.purity === 'Pure' && 
             node.next.purity === 'Pure';
    },
    rewrite: (node: StreamPlanNode) => {
      const fusedFn = (x: any) => node.next!.fn!(node.fn!(x));
      return {
        type: 'map',
        fn: fusedFn,
        purity: 'Pure',
        next: node.next!.next
      };
    },
    description: 'Combines consecutive pure map operations in FRP streams'
  },

  {
    name: 'FRP Event Filter Fusion',
    match: (node: StreamPlanNode) => {
      return node.type === 'filter' && 
             node.next?.type === 'filter' && 
             node.purity === 'Pure' && 
             node.next.purity === 'Pure';
    },
    rewrite: (node: StreamPlanNode) => {
      const fusedPred = (x: any) => node.predicate!(x) && node.next!.predicate!(x);
      return {
        type: 'filter',
        predicate: fusedPred,
        purity: 'Pure',
        next: node.next!.next
      };
    },
    description: 'Combines consecutive pure filter operations in FRP streams'
  },

  {
    name: 'FRP Map-Filter Fusion',
    match: (node: StreamPlanNode) => {
      return node.type === 'map' && 
             node.next?.type === 'filter' && 
             node.purity === 'Pure' && 
             node.next.purity === 'Pure';
    },
    rewrite: (node: StreamPlanNode) => {
      const fusedFn = (x: any) => {
        const mapped = node.fn!(x);
        return node.next!.predicate!(mapped) ? mapped : undefined;
      };
      return {
        type: 'filterMap',
        filterMapFn: fusedFn,
        purity: 'Pure',
        next: node.next!.next
      };
    },
    description: 'Combines pure map and filter operations into filterMap'
  },

  {
    name: 'FRP Event Source Fusion',
    match: (node: StreamPlanNode) => {
      return node.type === 'source' && 
             node.meta?.sourceType === 'FRP' &&
             node.next?.type === 'map' &&
             node.next.purity === 'Pure';
    },
    rewrite: (node: StreamPlanNode) => {
      // Push map operation closer to the source
      return {
        ...node.next,
        next: node.next.next
      };
    },
    description: 'Pushes pure operations closer to FRP event sources'
  },

  {
    name: 'FRP Scan-Map Fusion',
    match: (node: StreamPlanNode) => {
      return node.type === 'scan' && 
             node.next?.type === 'map' && 
             node.purity === 'State' && 
             node.next.purity === 'Pure';
    },
    rewrite: (node: StreamPlanNode) => {
      // Push map inside scan
      const originalScanFn = node.scanFn!;
      const mapFn = node.next!.fn!;
      
      const fusedScanFn = (state: any, value: any) => {
        const [newState, scanResult] = originalScanFn(state, value);
        return [newState, mapFn(scanResult)];
      };
      
      return {
        type: 'scan',
        scanFn: fusedScanFn,
        purity: 'State',
        next: node.next!.next
      };
    },
    description: 'Pushes pure map operations inside stateful scan operations'
  },

  {
    name: 'FRP Pure Segment Fusion',
    match: (node: StreamPlanNode) => {
      // Check for consecutive pure operations
      let current = node;
      let pureCount = 0;
      
      while (current && current.purity === 'Pure' && 
             ['map', 'filter', 'filterMap'].includes(current.type)) {
        pureCount++;
        current = current.next!;
      }
      
      return pureCount > 1;
    },
    rewrite: (node: StreamPlanNode) => {
      // Collect all consecutive pure operations
      const pureOps: StreamPlanNode[] = [];
      let current = node;
      
      while (current && current.purity === 'Pure' && 
             ['map', 'filter', 'filterMap'].includes(current.type)) {
        pureOps.push(current);
        current = current.next!;
      }
      
      // Fuse all pure operations
      const fusedOp = pureOps.reduce((acc, op) => {
        if (op.type === 'map') {
          return { type: 'map', fn: acc.fn ? (x: any) => op.fn!(acc.fn!(x)) : op.fn, purity: 'Pure' };
        } else if (op.type === 'filter') {
          return { type: 'filter', predicate: acc.predicate ? (x: any) => acc.predicate!(x) && op.predicate!(x) : op.predicate, purity: 'Pure' };
        } else if (op.type === 'filterMap') {
          return { type: 'filterMap', filterMapFn: acc.filterMapFn ? (x: any) => acc.filterMapFn!(x)?.then(op.filterMapFn!) : op.filterMapFn, purity: 'Pure' };
        }
        return acc;
      });
      
      return {
        ...fusedOp,
        next: current
      };
    },
    description: 'Fuses consecutive pure operations in FRP streams'
  }
];

// ============================================================================
// Part 2: FRP Fusion Registry
// ============================================================================

/**
 * FRP-specific fusion registry
 */
export const FRPFusionRegistry = [...FusionRegistry, ...FRPFusionRules];

/**
 * Optimize FRP plan using FRP-specific rules
 */
export function optimizeFRPPlan(plan: FRPStreamPlanNode): FRPStreamPlanNode {
  let changed = true;
  let optimizedPlan = plan.clone();
  
  while (changed) {
    changed = false;
    
    for (const rule of FRPFusionRegistry) {
      if (rule.match(optimizedPlan)) {
        optimizedPlan = rule.rewrite(optimizedPlan) as FRPStreamPlanNode;
        optimizedPlan.markOptimized();
        changed = true;
        break;
      }
    }
    
    // Also optimize child nodes
    if (optimizedPlan.next) {
      const optimizedNext = optimizeFRPPlan(optimizedPlan.next);
      if (optimizedNext !== optimizedPlan.next) {
        optimizedPlan.next = optimizedNext;
        changed = true;
      }
    }
  }
  
  return optimizedPlan;
}

// ============================================================================
// Part 3: FRP Stream Optimization
// ============================================================================

/**
 * Optimize FRP stream using FRP-specific fusion rules
 */
export function optimizeFRPStream<S, I, O>(
  stream: StatefulStream<I, S, O>
): StatefulStream<I, S, O> {
  // Check if the stream has a plan
  if (!stream.__plan) {
    return stream;
  }
  
  // Optimize the plan using FRP-specific rules
  const optimizedPlan = optimizeFRPPlan(stream.__plan as FRPStreamPlanNode);
  
  // If no optimization occurred, return original stream
  if (!optimizedPlan.isOptimized()) {
    return stream;
  }
  
  // Create optimized stream
  const optimized = {
    ...stream,
    __plan: optimizedPlan
  };
  
  return optimized;
}

/**
 * Check if FRP stream can be optimized
 */
export function canOptimizeFRPStream<S, I, O>(stream: StatefulStream<I, S, O>): boolean {
  if (!stream.__plan) {
    return false;
  }
  
  // Check if any FRP-specific fusion rules can be applied
  for (const rule of FRPFusionRules) {
    if (rule.match(stream.__plan)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Apply FRP-specific purity fusion
 */
export function applyFRPPurityFusion<S, I, O>(
  stream: StatefulStream<I, S, O>
): StatefulStream<I, S, O> {
  if (!stream.__plan) {
    return stream;
  }
  
  const optimizedPlan = applyPurityFusion(stream.__plan);
  
  return {
    ...stream,
    __plan: optimizedPlan as FRPStreamPlanNode
  };
}

// ============================================================================
// Part 4: Event Stream Optimization
// ============================================================================

/**
 * Optimize event stream by combining similar event handlers
 */
export function optimizeEventStream<T>(
  streams: StatefulStream<T, any, T>[]
): StatefulStream<T, any, T>[] {
  const optimized: StatefulStream<T, any, T>[] = [];
  
  for (const stream of streams) {
    const optimizedStream = optimizeFRPStream(stream);
    optimized.push(optimizedStream);
  }
  
  return optimized;
}

/**
 * Combine multiple event streams into a single optimized stream
 */
export function combineEventStreams<T>(
  streams: StatefulStream<T, any, T>[]
): StatefulStream<T, any, T[]> {
  if (streams.length === 0) {
    return fromFRP({ subscribe: () => () => {} }, {});
  }
  
  if (streams.length === 1) {
    return streams[0].map(value => [value]);
  }
  
  // Combine streams using parallel composition
  let combined = parallel(streams[0], streams[1]);
  
  for (let i = 2; i < streams.length; i++) {
    combined = parallel(combined, streams[i]);
  }
  
  return optimizeFRPStream(combined);
}

/**
 * Optimize UI event stream by removing redundant operations
 */
export function optimizeUIEventStream<T>(
  stream: StatefulStream<T, any, T>
): StatefulStream<T, any, T> {
  // Apply FRP-specific optimizations
  let optimized = optimizeFRPStream(stream);
  
  // Apply purity-driven fusion
  optimized = applyFRPPurityFusion(optimized);
  
  return optimized;
}

// ============================================================================
// Part 5: Reactive Pipeline Optimization
// ============================================================================

/**
 * Optimize reactive pipeline by analyzing dependencies
 */
export function optimizeReactivePipeline<S, I, O>(
  stream: StatefulStream<I, S, O>
): StatefulStream<I, S, O> {
  // Analyze the pipeline for optimization opportunities
  const plan = stream.__plan;
  
  if (!plan) {
    return stream;
  }
  
  // Apply FRP-specific optimizations
  let optimized = optimizeFRPStream(stream);
  
  // Apply general fusion optimizations
  optimized = withAutoOptimization(optimized);
  
  return optimized;
}

/**
 * Analyze reactive pipeline for optimization opportunities
 */
export function analyzeReactivePipeline<S, I, O>(
  stream: StatefulStream<I, S, O>
): {
  canOptimize: boolean;
  optimizationCount: number;
  pureSegments: number;
  statefulSegments: number;
  ioBoundaries: number;
} {
  const plan = stream.__plan;
  
  if (!plan) {
    return {
      canOptimize: false,
      optimizationCount: 0,
      pureSegments: 0,
      statefulSegments: 0,
      ioBoundaries: 0
    };
  }
  
  let pureSegments = 0;
  let statefulSegments = 0;
  let ioBoundaries = 0;
  let current = plan;
  
  while (current) {
    if (current.purity === 'Pure') {
      pureSegments++;
    } else if (current.purity === 'State') {
      statefulSegments++;
    } else if (current.purity === 'IO' || current.purity === 'Async') {
      ioBoundaries++;
    }
    current = current.next!;
  }
  
  const canOptimize = canOptimizeFRPStream(stream);
  const optimizationCount = canOptimize ? 1 : 0;
  
  return {
    canOptimize,
    optimizationCount,
    pureSegments,
    statefulSegments,
    ioBoundaries
  };
}

// ============================================================================
// Part 6: Performance Monitoring
// ============================================================================

/**
 * FRP performance metrics
 */
export interface FRPPerformanceMetrics {
  readonly originalNodeCount: number;
  readonly optimizedNodeCount: number;
  readonly optimizationRatio: number;
  readonly pureSegmentCount: number;
  readonly statefulSegmentCount: number;
  readonly ioBoundaryCount: number;
  readonly fusionRulesApplied: string[];
}

/**
 * Get FRP performance metrics
 */
export function getFRPPerformanceMetrics<S, I, O>(
  originalStream: StatefulStream<I, S, O>,
  optimizedStream: StatefulStream<I, S, O>
): FRPPerformanceMetrics {
  const originalPlan = originalStream.__plan;
  const optimizedPlan = optimizedStream.__plan;
  
  const countNodes = (plan: StreamPlanNode | undefined): number => {
    if (!plan) return 0;
    let count = 1;
    if (plan.next) count += countNodes(plan.next);
    return count;
  };
  
  const originalCount = countNodes(originalPlan);
  const optimizedCount = countNodes(optimizedPlan);
  const optimizationRatio = originalCount > 0 ? (originalCount - optimizedCount) / originalCount : 0;
  
  const analysis = analyzeReactivePipeline(originalStream);
  
  return {
    originalNodeCount: originalCount,
    optimizedNodeCount: optimizedCount,
    optimizationRatio,
    pureSegmentCount: analysis.pureSegments,
    statefulSegmentCount: analysis.statefulSegments,
    ioBoundaryCount: analysis.ioBoundaries,
    fusionRulesApplied: canOptimizeFRPStream(originalStream) ? ['FRP Fusion'] : []
  };
}

// ============================================================================
// Part 7: Utility Functions
// ============================================================================

/**
 * Create FRP fusion optimizer
 */
export function createFRPFusionOptimizer() {
  return {
    optimize: (stream: StatefulStream<any, any, any>) => optimizeFRPStream(stream),
    canOptimize: (stream: StatefulStream<any, any, any>) => canOptimizeFRPStream(stream),
    getMetrics: (original: StatefulStream<any, any, any>, optimized: StatefulStream<any, any, any>) => 
      getFRPPerformanceMetrics(original, optimized),
    analyze: (stream: StatefulStream<any, any, any>) => analyzeReactivePipeline(stream)
  };
}

/**
 * Auto-optimize FRP stream
 */
export function withAutoFRPOptimization<T extends StatefulStream<any, any, any>>(stream: T): T {
  if (canOptimizeFRPStream(stream)) {
    return optimizeFRPStream(stream) as T;
  }
  return stream;
}

/**
 * Batch optimize multiple FRP streams
 */
export function batchOptimizeFRPStreams(streams: StatefulStream<any, any, any>[]): StatefulStream<any, any, any>[] {
  return streams.map(stream => withAutoFRPOptimization(stream));
}

// ============================================================================
// Part 8: Exports
// ============================================================================

export {
  FRPFusionRules,
  FRPFusionRegistry,
  optimizeFRPPlan,
  optimizeFRPStream,
  canOptimizeFRPStream,
  applyFRPPurityFusion,
  optimizeEventStream,
  combineEventStreams,
  optimizeUIEventStream,
  optimizeReactivePipeline,
  analyzeReactivePipeline,
  getFRPPerformanceMetrics,
  createFRPFusionOptimizer,
  withAutoFRPOptimization,
  batchOptimizeFRPStreams
}; 