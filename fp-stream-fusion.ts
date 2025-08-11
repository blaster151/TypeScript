/**
 * StatefulStream Fusion System
 * 
 * This module implements a fusion system for StatefulStream that:
 * - Identifies fusion opportunities in composition chains
 * - Rewrites them into equivalent but more efficient pipelines
 * - Preserves semantics using purity + state laws
 * - Integrates with our purity + HKT + optics ecosystem
 * 
 * Based on "Stream Programs Are Monoid Homomorphisms with State" principles.
 */

import { StateFn, StatefulStream, createStatefulStream } from './fp-stream-state';
import { detectBoundary, OptimizationBoundary } from './fp-stream-boundaries';

// ============================================================================
// AST-Like Plan Representation
// ============================================================================

/**
 * Stream plan node representing a single operation in the pipeline
 */
export interface StreamPlanNode {
  type: 'map' | 'scan' | 'filter' | 'filterMap' | 'flatMap' | 'compose' | 'parallel';
  fn?: Function;
  scanFn?: StateFn<any, any>;
  predicate?: Function;
  filterMapFn?: Function;
  flatMapFn?: Function;
  purity: 'Pure' | 'State' | 'IO' | 'Async';
  next?: StreamPlanNode;
  left?: StreamPlanNode;
  right?: StreamPlanNode;
  input?: any;
  output?: any;
  state?: any;
}

/**
 * Fusion rule interface
 */
export interface FusionRule {
  name: string;
  match: (node: StreamPlanNode) => boolean;
  rewrite: (node: StreamPlanNode) => StreamPlanNode;
  description: string;
}

// ============================================================================
// Boundary Lattice and Oracle Integration
// ============================================================================

const BoundaryLevel: Record<OptimizationBoundary, number> = {
  FullyFusable: 0,
  Staged: 1,
  OpaqueEffect: 2
};

function boundaryFromPurityTag(purity: StreamPlanNode['purity']): OptimizationBoundary {
  switch (purity) {
    case 'Pure':
      return 'FullyFusable';
    case 'State':
      return 'Staged';
    case 'Async':
    case 'IO':
    default:
      return 'OpaqueEffect';
  }
}

function detectOpBoundary(op: unknown): OptimizationBoundary | null {
  if (!op) return null;
  try {
    const analysis = detectBoundary(op as any, {
      moduleName: 'fp-stream-fusion',
      functionName: 'FusionRegistry',
      lineNumber: 0,
      columnNumber: 0,
      fileName: 'fp-stream-fusion.ts',
      compilationMode: 'production',
      optimizationLevel: 'aggressive'
    } as any);
    return analysis.boundary as OptimizationBoundary;
  } catch {
    return null;
  }
}

function getNodeBoundary(node: StreamPlanNode): OptimizationBoundary {
  // Consult oracle on available operator functions
  const candidates: Array<OptimizationBoundary | null> = [
    detectOpBoundary(node.fn),
    detectOpBoundary(node.predicate),
    detectOpBoundary(node.filterMapFn),
    detectOpBoundary(node.scanFn),
    detectOpBoundary(node.flatMapFn)
  ];
  const oracleBoundary = candidates.reduce<OptimizationBoundary | null>((acc, b) => {
    if (!b) return acc;
    if (!acc) return b;
    return BoundaryLevel[b] > BoundaryLevel[acc] ? b : acc;
  }, null);

  const purityBoundary = boundaryFromPurityTag(node.purity);

  // Return the worst (highest) boundary among oracle and purity mapping
  if (oracleBoundary && BoundaryLevel[oracleBoundary] > BoundaryLevel[purityBoundary]) {
    return oracleBoundary;
  }
  return purityBoundary;
}

function canFuseByBoundary(a: StreamPlanNode, b: StreamPlanNode): boolean {
  const ba = getNodeBoundary(a);
  const bb = getNodeBoundary(b);
  // Disallow when either side reaches or exceeds OpaqueEffect level
  const disallowedLevel = BoundaryLevel.OpaqueEffect;
  return BoundaryLevel[ba] < disallowedLevel && BoundaryLevel[bb] < disallowedLevel;
}

/**
 * Fusion context for optimization passes
 */
export interface FusionContext {
  readonly depth: number;
  readonly maxDepth: number;
  readonly purityLevel: 'Pure' | 'State' | 'IO' | 'Async';
  readonly canReorder: boolean;
  readonly appliedRules: string[];
}

// ============================================================================
// Core Fusion Rules
// ============================================================================

/**
 * Map-Map Fusion (Pure)
 * map(g) ∘ map(f) => map(g ∘ f)
 * 
 * This fusion is always safe because map operations are pure.
 */
export function fuseMapMap<A, B, C>(
  f: (a: A) => B,
  g: (b: B) => C
): (a: A) => C {
  return (a) => g(f(a));
}

/**
 * Map Past Scan (Pure → Stateful)
 * map ∘ scan => scan' where transformation is inside scan
 * 
 * This fusion pushes pure map operations inside stateful scan operations.
 */
export function pushMapPastScan<S, N, N2>(
  mapFn: (n: N) => N2,
  scanFn: StateFn<S, N>
): StateFn<S, N2> {
  return (state) => {
    const [s2, n] = scanFn(state);
    return [s2, mapFn(n)];
  };
}

/**
 * Fuse Pure Segments
 * Sequentially combine pure (stateless) segments without re-entering state
 * 
 * This fusion combines multiple pure operations into a single operation.
 */
export function fusePureSegments<I, S, N>(
  ...ops: Array<(input: I) => StateFn<S, N>>
): (input: I) => StateFn<S, N> {
  return (input) => (state) => {
    let currentState = state;
    let output: N | undefined = undefined;
    
    for (const op of ops) {
      const [s2, o] = op(input)(currentState);
      currentState = s2;
      output = o;
    }
    
    return [currentState, output as N];
  };
}

/**
 * Filter-Map Fusion
 * filterMap(f) ∘ filterMap(g) => filterMap(x => f(x).then(g))
 * 
 * This fusion combines consecutive filterMap operations.
 */
export function fuseFilterMaps<A, B, C>(
  f: (a: A) => B | undefined,
  g: (b: B) => C | undefined
): (a: A) => C | undefined {
  return (a) => {
    const b = f(a);
    if (b !== undefined) {
      return g(b);
    }
    return undefined;
  };
}

/**
 * Filter-Filter Fusion
 * filter(p) ∘ filter(q) => filter(x => p(x) && q(x))
 * 
 * This fusion combines consecutive filter operations.
 */
export function fuseFilters<A>(
  p: (a: A) => boolean,
  q: (a: A) => boolean
): (a: A) => boolean {
  return (a) => p(a) && q(a);
}

/**
 * Scan-Scan Fusion
 * scan(f) ∘ scan(g) => scan(f ∘ g) when f and g are compatible
 * 
 * This fusion combines consecutive scan operations.
 */
export function fuseScans<S, B, C>(
  f: StateFn<S, B>,
  g: StateFn<S, C>
): StateFn<S, C> {
  return (state) => {
    const [s1, b] = f(state);
    return g(s1);
  };
}

/**
 * Map-Filter Fusion
 * map(f) ∘ filter(p) => filterMap(x => p(x) ? f(x) : undefined)
 * 
 * This fusion combines map and filter operations.
 */
export function fuseMapFilter<A, B>(
  f: (a: A) => B,
  p: (a: A) => boolean
): (a: A) => B | undefined {
  return (a) => p(a) ? f(a) : undefined;
}

/**
 * Filter-Map Fusion
 * filter(p) ∘ map(f) => filterMap(x => p(x) ? f(x) : undefined)
 * 
 * This fusion combines filter and map operations.
 */
export function fuseFilterMap<A, B>(
  p: (a: A) => boolean,
  f: (a: A) => B
): (a: A) => B | undefined {
  return (a) => p(a) ? f(a) : undefined;
}

// ============================================================================
// Fusion Registry
// ============================================================================

/**
 * Global fusion registry containing all fusion rules
 */
export const FusionRegistry: FusionRule[] = [
  {
    name: 'Map-Map Fusion',
    match: (n) => n.type === 'map' && n.next?.type === 'map' && n.purity === 'Pure' && n.next.purity === 'Pure' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => ({
      type: 'map',
      fn: fuseMapMap(n.fn!, n.next!.fn!),
      purity: 'Pure',
      next: n.next!.next
    }),
    description: 'Combines consecutive pure map operations'
  },
  
  {
    name: 'Map Past Scan',
    match: (n) => n.type === 'map' && n.next?.type === 'scan' && n.purity === 'Pure' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => ({
      ...n.next!,
      scanFn: pushMapPastScan(n.fn!, n.next!.scanFn!),
      purity: 'State'
    }),
    description: 'Pushes pure map operations inside stateful scan operations'
  },
  
  {
    name: 'Filter-Filter Fusion',
    match: (n) => n.type === 'filter' && n.next?.type === 'filter' && n.purity === 'Pure' && n.next.purity === 'Pure' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => ({
      type: 'filter',
      predicate: fuseFilters(n.predicate!, n.next!.predicate!),
      purity: 'Pure',
      next: n.next!.next
    }),
    description: 'Combines consecutive pure filter operations'
  },
  
  {
    name: 'FilterMap-FilterMap Fusion',
    match: (n) => n.type === 'filterMap' && n.next?.type === 'filterMap' && n.purity === 'Pure' && n.next.purity === 'Pure' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => ({
      type: 'filterMap',
      filterMapFn: fuseFilterMaps(n.filterMapFn!, n.next!.filterMapFn!),
      purity: 'Pure',
      next: n.next!.next
    }),
    description: 'Combines consecutive pure filterMap operations'
  },
  
  {
    name: 'Map-Filter Fusion',
    match: (n) => n.type === 'map' && n.next?.type === 'filter' && n.purity === 'Pure' && n.next.purity === 'Pure' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => ({
      type: 'filterMap',
      filterMapFn: fuseMapFilter(n.fn!, n.next!.predicate!),
      purity: 'Pure',
      next: n.next!.next
    }),
    description: 'Combines pure map and filter operations into filterMap'
  },
  
  {
    name: 'Filter-Map Fusion',
    match: (n) => n.type === 'filter' && n.next?.type === 'map' && n.purity === 'Pure' && n.next.purity === 'Pure' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => ({
      type: 'filterMap',
      filterMapFn: fuseFilterMap(n.predicate!, n.next!.fn!),
      purity: 'Pure',
      next: n.next!.next
    }),
    description: 'Combines pure filter and map operations into filterMap'
  },
  
  {
    name: 'Scan-Scan Fusion',
    match: (n) => n.type === 'scan' && n.next?.type === 'scan' && n.purity === 'State' && n.next.purity === 'State' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => ({
      type: 'scan',
      scanFn: fuseScans(n.scanFn!, n.next!.scanFn!),
      purity: 'State',
      next: n.next!.next
    }),
    description: 'Combines consecutive stateful scan operations'
  },
  
  {
    name: 'Pure Segment Fusion',
    match: (n) => n.type === 'map' && n.next?.type === 'map' && n.purity === 'Pure' && n.next.purity === 'Pure' && canFuseByBoundary(n, n.next!),
    rewrite: (n) => {
      // Collect all consecutive pure operations
      const pureOps: StreamPlanNode[] = [];
      let current = n;
      
      while (
        current &&
        current.purity === 'Pure' &&
        ['map', 'filter', 'filterMap'].includes(current.type) &&
        (!current.next || canFuseByBoundary(current, current.next))
      ) {
        pureOps.push(current);
        current = current.next!;
      }
      
      // Fuse all pure operations
      const fusedOp = pureOps.reduce((acc, op) => {
        if (op.type === 'map') {
          return { type: 'map', fn: acc.fn ? fuseMapMap(acc.fn, op.fn!) : op.fn, purity: 'Pure' };
        } else if (op.type === 'filter') {
          return { type: 'filter', predicate: acc.predicate ? fuseFilters(acc.predicate, op.predicate!) : op.predicate, purity: 'Pure' };
        } else if (op.type === 'filterMap') {
          return { type: 'filterMap', filterMapFn: acc.filterMapFn ? fuseFilterMaps(acc.filterMapFn, op.filterMapFn!) : op.filterMapFn, purity: 'Pure' };
        }
        return acc;
      });
      
      return {
        ...fusedOp,
        next: current
      };
    },
    description: 'Fuses consecutive pure operations into a single operation'
  }
];

// ============================================================================
// Plan Optimization
// ============================================================================

/**
 * Optimize a stream plan by applying fusion rules until fixpoint
 */
export function optimizePlan(root: StreamPlanNode, context: FusionContext = { depth: 0, maxDepth: 100, purityLevel: 'Pure', canReorder: true, appliedRules: [] }): StreamPlanNode {
  if (context.depth > context.maxDepth) {
    return root; // Prevent infinite recursion
  }
  
  let changed = true;
  let optimizedRoot = { ...root };

  // Yoneda-style map-run fusion: compose consecutive pure maps into a single map
  const fuseMapRun = (node: StreamPlanNode | undefined): StreamPlanNode | undefined => {
    if (!node) return node;
    // Compress at this node
    if (node.type === 'map' && node.purity === 'Pure') {
      let current: StreamPlanNode | undefined = node.next;
      const fns: Function[] = [node.fn!];
      while (current && current.type === 'map' && current.purity === 'Pure' && current.fn) {
        fns.push(current.fn);
        current = current.next;
        changed = true;
      }
      if (fns.length > 1) {
        // Compose functions right-to-left: fns[n-1] ∘ ... ∘ fns[0]
        const composed = fns.reduce((acc, fn) => {
          if (!acc) return fn;
          return (x: any) => (fn as any)(acc(x));
        }) as any as Function;
        node = { type: 'map', fn: composed, purity: 'Pure', next: current } as StreamPlanNode;
      }
    }
    // Recurse
    if (node.next) node.next = fuseMapRun(node.next) as StreamPlanNode;
    if (node.left) node.left = fuseMapRun(node.left) as StreamPlanNode;
    if (node.right) node.right = fuseMapRun(node.right) as StreamPlanNode;
    return node;
  };
  
  while (changed) {
    changed = false;
    // Apply map-run fusion before rule-driven fusion
    optimizedRoot = fuseMapRun(optimizedRoot)!;
    
    for (const rule of FusionRegistry) {
      if (rule.match(optimizedRoot)) {
        const newContext = {
          ...context,
          depth: context.depth + 1,
          appliedRules: [...context.appliedRules, rule.name]
        };
        
        optimizedRoot = rule.rewrite(optimizedRoot);
        changed = true;
        
        // Recursively optimize the rewritten node
        if (optimizedRoot.next) {
          optimizedRoot.next = optimizePlan(optimizedRoot.next, newContext);
        }
        
        break;
      }
    }
    
    // Also optimize child nodes
    if (optimizedRoot.next) {
      const optimizedNext = optimizePlan(optimizedRoot.next, { ...context, depth: context.depth + 1 });
      if (optimizedNext !== optimizedRoot.next) {
        optimizedRoot.next = optimizedNext;
        changed = true;
      }
    }
    
    if (optimizedRoot.left) {
      const optimizedLeft = optimizePlan(optimizedRoot.left, { ...context, depth: context.depth + 1 });
      if (optimizedLeft !== optimizedRoot.left) {
        optimizedRoot.left = optimizedLeft;
        changed = true;
      }
    }
    
    if (optimizedRoot.right) {
      const optimizedRight = optimizePlan(optimizedRoot.right, { ...context, depth: context.depth + 1 });
      if (optimizedRight !== optimizedRoot.right) {
        optimizedRoot.right = optimizedRight;
        changed = true;
      }
    }
  }
  
  return optimizedRoot;
}

/**
 * Check if a plan can be optimized
 */
export function canOptimize(plan: StreamPlanNode): boolean {
  // Check if there are any fusion opportunities
  for (const rule of FusionRegistry) {
    if (rule.match(plan)) {
      return true;
    }
  }
  
  // Recursively check child nodes
  if (plan.next && canOptimize(plan.next)) {
    return true;
  }
  
  if (plan.left && canOptimize(plan.left)) {
    return true;
  }
  
  if (plan.right && canOptimize(plan.right)) {
    return true;
  }
  
  return false;
}

// ============================================================================
// Plan ↔ StatefulStream Conversion
// ============================================================================

/**
 * Convert a StatefulStream to a plan representation
 * This is a simplified version - in practice, you'd need more sophisticated introspection
 */
export function planFromStream(stream: StatefulStream<any, any, any>): StreamPlanNode {
  // This is a placeholder implementation
  // In a real implementation, you'd need to introspect the composition chain
  return {
    type: 'map',
    fn: (x: any) => x,
    purity: stream.__purity,
    next: undefined
  };
}

/**
 * Convert a plan back to a StatefulStream
 * This is a simplified version - in practice, you'd need more sophisticated reconstruction
 */
export function streamFromPlan(plan: StreamPlanNode): StatefulStream<any, any, any> {
  // This is a placeholder implementation
  // In a real implementation, you'd rebuild the optimized stream from the plan
  return createStatefulStream(
    (input) => (state) => [state, input],
    plan.purity
  );
}

/**
 * Optimize a StatefulStream by converting to plan, optimizing, and converting back
 */
export function optimizeStream(stream: StatefulStream<any, any, any>): StatefulStream<any, any, any> {
  const plan = planFromStream(stream);
  const optimizedPlan = optimizePlan(plan);
  return streamFromPlan(optimizedPlan);
}

// ============================================================================
// Purity-Driven Fusion
// ============================================================================

/**
 * Check if two operations can be reordered based on purity
 */
export function canReorderByPurity(op1: StreamPlanNode, op2: StreamPlanNode): boolean {
  // Pure operations can always be reordered
  if (op1.purity === 'Pure' && op2.purity === 'Pure') {
    return true;
  }
  
  // Stateful operations can be reordered if they don't interfere
  if (op1.purity === 'State' && op2.purity === 'State') {
    // Check if operations are independent
    return areOperationsIndependent(op1, op2);
  }
  
  // Pure operations can be pushed past stateful ones
  if (op1.purity === 'Pure' && op2.purity === 'State') {
    return true;
  }
  
  return false;
}

/**
 * Check if two operations are independent (can be reordered)
 */
export function areOperationsIndependent(op1: StreamPlanNode, op2: StreamPlanNode): boolean {
  // This is a simplified check - in practice, you'd need more sophisticated analysis
  if (op1.type === 'map' && op2.type === 'map') {
    return true; // Map operations are independent
  }
  
  if (op1.type === 'filter' && op2.type === 'filter') {
    return true; // Filter operations are independent
  }
  
  if (op1.type === 'scan' && op2.type === 'scan') {
    return false; // Scan operations are not independent
  }
  
  return false;
}

/**
 * Apply purity-driven fusion rules
 */
export function applyPurityFusion(plan: StreamPlanNode): StreamPlanNode {
  if (!plan.next) {
    return plan;
  }
  
  // Check if we can reorder operations based on purity
  if (canReorderByPurity(plan, plan.next)) {
    // Apply appropriate fusion rule
    for (const rule of FusionRegistry) {
      if (rule.match(plan)) {
        return rule.rewrite(plan);
      }
    }
  }
  
  // Recursively apply to child nodes
  if (plan.next) {
    plan.next = applyPurityFusion(plan.next);
  }
  
  return plan;
}

// ============================================================================
// Fusion Statistics and Analysis
// ============================================================================

/**
 * Fusion statistics
 */
export interface FusionStats {
  readonly appliedRules: string[];
  readonly optimizationCount: number;
  readonly originalNodeCount: number;
  readonly optimizedNodeCount: number;
  readonly purityDistribution: Record<string, number>;
}

/**
 * Analyze fusion statistics
 */
export function analyzeFusionStats(originalPlan: StreamPlanNode, optimizedPlan: StreamPlanNode, appliedRules: string[]): FusionStats {
  const countNodes = (plan: StreamPlanNode): number => {
    let count = 1;
    if (plan.next) count += countNodes(plan.next);
    if (plan.left) count += countNodes(plan.left);
    if (plan.right) count += countNodes(plan.right);
    return count;
  };
  
  const getPurityDistribution = (plan: StreamPlanNode): Record<string, number> => {
    const distribution: Record<string, number> = {};
    
    const traverse = (node: StreamPlanNode) => {
      distribution[node.purity] = (distribution[node.purity] || 0) + 1;
      if (node.next) traverse(node.next);
      if (node.left) traverse(node.left);
      if (node.right) traverse(node.right);
    };
    
    traverse(plan);
    return distribution;
  };
  
  return {
    appliedRules,
    optimizationCount: appliedRules.length,
    originalNodeCount: countNodes(originalPlan),
    optimizedNodeCount: countNodes(optimizedPlan),
    purityDistribution: getPurityDistribution(optimizedPlan)
  };
}

// ============================================================================
// Integration Hooks
// ============================================================================

/**
 * Fusion optimization hook for pipeline builders
 */
export function createFusionOptimizer() {
  return {
    optimize: (stream: StatefulStream<any, any, any>): StatefulStream<any, any, any> => {
      return optimizeStream(stream);
    },
    
    canOptimize: (stream: StatefulStream<any, any, any>): boolean => {
      const plan = planFromStream(stream);
      return canOptimize(plan);
    },
    
    getStats: (stream: StatefulStream<any, any, any>): FusionStats => {
      const plan = planFromStream(stream);
      const optimizedPlan = optimizePlan(plan);
      return analyzeFusionStats(plan, optimizedPlan, []);
    }
  };
}

/**
 * Auto-optimization hook for pipeline builders
 */
export function withAutoOptimization<T extends StatefulStream<any, any, any>>(stream: T): T {
  if (canOptimize(planFromStream(stream))) {
    return optimizeStream(stream) as T;
  }
  return stream;
}

// ============================================================================
// Exports
// ============================================================================

export {
  FusionRegistry,
  optimizePlan,
  canOptimize,
  planFromStream,
  streamFromPlan,
  optimizeStream,
  canReorderByPurity,
  areOperationsIndependent,
  applyPurityFusion,
  analyzeFusionStats,
  createFusionOptimizer,
  withAutoOptimization
}; 