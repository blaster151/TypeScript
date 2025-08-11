/**
 * Stream Fusion Multiplicity System
 * 
 * This module integrates multiplicity inference into the FRP/stream fusion layer
 * so we only perform optimizations when they preserve or lower usage bounds.
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

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * State function type for streams
 */
export type StateFn<S, A> = (state: S) => [S, A];

/**
 * Stream interface with usage bounds
 */
export interface Stream<In, Out, S, UB extends Multiplicity> {
  readonly usageBound: UB;
  readonly __type: 'Stream';
  run: (input: In) => StateFn<S, Out>;
}

/**
 * Stateful stream interface with usage bounds
 */
export interface StatefulStream<In, Out, S, UB extends Multiplicity> {
  readonly usageBound: UB;
  readonly __type: 'StatefulStream';
  run: (input: In) => StateFn<S, Out>;
}

/**
 * Stream operator types for fusion analysis
 */
export type StreamOperator = 
  | 'map'
  | 'filter'
  | 'scan'
  | 'flatMap'
  | 'chain'
  | 'take'
  | 'drop'
  | 'merge'
  | 'zip'
  | 'concat'
  | 'switch'
  | 'combineLatest'
  | 'fused';

/**
 * Stream fusion metadata
 */
export interface StreamFusionMeta {
  operator: StreamOperator;
  usageBound: Multiplicity;
  isStateless: boolean;
  isBounded: boolean;
  boundOverride?: number; // For operators like take(n)
}

/**
 * Fusion candidate with metadata
 */
export interface FusionCandidate<In, Out, S, UB extends Multiplicity> {
  stream: Stream<In, Out, S, UB>;
  meta: StreamFusionMeta;
  canFuseWith: (other: FusionCandidate<any, any, any, any>) => boolean;
}

// ============================================================================
// Usage Bound Utilities
// ============================================================================

/**
 * Convert usage bound to numeric value for comparison
 */
export function usageBoundNumeric(bound: Multiplicity): number {
  if (bound === "∞") return Infinity;
  return bound;
}

/**
 * Check if usage bound is finite
 */
export function isFiniteBound(bound: Multiplicity): bound is number {
  return bound !== "∞";
}

/**
 * Check if usage bound is infinite
 */
export function isInfiniteBound(bound: Multiplicity): bound is "∞" {
  return bound === "∞";
}

/**
 * Get minimum of two usage bounds
 */
export function minUsageBounds(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (isInfiniteBound(a)) return b;
  if (isInfiniteBound(b)) return a;
  return Math.min(a, b);
}

/**
 * Get maximum of two usage bounds
 */
export function maxUsageBounds(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (isInfiniteBound(a) || isInfiniteBound(b)) return "∞";
  return Math.max(a, b);
}

// ============================================================================
// Fusion Safety Rules
// ============================================================================

/**
 * Check if two streams can be fused safely
 */
export function canFuse<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
  f: F,
  g: G
): boolean {
  const fBound = usageBoundNumeric(f.usageBound);
  const gBound = usageBoundNumeric(g.usageBound);
  const fusedBound = fBound * gBound;
  
  // Fusion is safe if the fused bound doesn't exceed the original bound
  return fusedBound <= gBound;
}

/**
 * Check if fusion would increase multiplicity
 */
export function wouldIncreaseMultiplicity<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
  f: F,
  g: G
): boolean {
  return !canFuse(f, g);
}

/**
 * Calculate fused usage bound
 */
export function calculateFusedBound<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
  f: F,
  g: G
): Multiplicity {
  const fBound = f.usageBound;
  const gBound = g.usageBound;
  
  if (isInfiniteBound(fBound) || isInfiniteBound(gBound)) {
    return "∞";
  }
  
  return fBound * gBound;
}

// ============================================================================
// Stream Operator Analysis
// ============================================================================

/**
 * Analyze stream operator for fusion metadata
 */
export function analyzeStreamOperator<In, Out, S, UB extends Multiplicity>(
  stream: Stream<In, Out, S, UB>,
  operator: StreamOperator,
  params?: any
): StreamFusionMeta {
  let usageBound: Multiplicity;
  let isStateless = false;
  let isBounded = false;
  let boundOverride: number | undefined;
  
  switch (operator) {
    case 'map':
    case 'filter':
      // Stateless operators always have UB = 1
      usageBound = 1;
      isStateless = true;
      break;
      
    case 'scan':
      // Scan preserves the bound of the input
      usageBound = stream.usageBound;
      isStateless = false;
      break;
      
    case 'flatMap':
    case 'chain':
      // FlatMap/chain can have variable bounds based on inner stream
      usageBound = stream.usageBound;
      isStateless = false;
      break;
      
    case 'take':
      // Take(n) overrides bound to min(n, originalBound)
      const n = params?.count || 1;
      if (isFiniteBound(stream.usageBound)) {
        usageBound = Math.min(n, stream.usageBound);
        boundOverride = n;
      } else {
        usageBound = n;
        boundOverride = n;
      }
      isBounded = true;
      isStateless = false;
      break;
      
    case 'drop':
      // Drop doesn't change the bound
      usageBound = stream.usageBound;
      isStateless = false;
      break;
      
    case 'merge':
    case 'zip':
    case 'concat':
    case 'switch':
    case 'combineLatest':
      // Complex operators often result in infinite bounds
      usageBound = "∞";
      isStateless = false;
      break;
      
    default:
      // Default to original bound
      usageBound = stream.usageBound;
      isStateless = false;
  }
  
  return {
    operator,
    usageBound,
    isStateless,
    isBounded,
    boundOverride
  };
}

/**
 * Create fusion candidate from stream
 */
export function createFusionCandidate<In, Out, S, UB extends Multiplicity>(
  stream: Stream<In, Out, S, UB>,
  operator: StreamOperator,
  params?: any
): FusionCandidate<In, Out, S, UB> {
  const meta = analyzeStreamOperator(stream, operator, params);
  
  return {
    stream,
    meta,
    canFuseWith: (other: FusionCandidate<any, any, any, any>) => {
      return canFuse(stream, other.stream);
    }
  };
}

// ============================================================================
// Stream Fusion Optimizer
// ============================================================================

/**
 * Fusion optimization result
 */
export interface FusionResult<In, Out, S, UB extends Multiplicity> {
  stream: Stream<In, Out, S, UB>;
  fused: boolean;
  reason?: string;
  originalBounds: [Multiplicity, Multiplicity];
  fusedBound: Multiplicity;
}

/**
 * Stream fusion optimizer
 */
export class StreamFusionOptimizer {
  private debugEnabled: boolean;
  
  constructor(debugEnabled: boolean = false) {
    this.debugEnabled = debugEnabled;
  }
  
  /**
   * Attempt to fuse two streams
   */
  fuse<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
    f: F,
    g: G,
    fOperator: StreamOperator,
    gOperator: StreamOperator,
    fParams?: any,
    gParams?: any
  ): FusionResult<any, any, any, any> {
    const fCandidate = createFusionCandidate(f, fOperator, fParams);
    const gCandidate = createFusionCandidate(g, gOperator, gParams);
    
    const canFuseStreams = fCandidate.canFuseWith(gCandidate);
    const fusedBound = calculateFusedBound(f, g);
    
    if (this.debugEnabled) {
      multiplicityLogger.debug('Fusion attempt', {
        fOperator,
        gOperator,
        fBound: f.usageBound,
        gBound: g.usageBound,
        fusedBound,
        canFuse: canFuseStreams
      });
    }
    
    if (!canFuseStreams) {
      if (this.debugEnabled) {
        multiplicityLogger.warn(
          `[Fusion] ${fOperator} → ${gOperator} skipped: would increase bound from ${g.usageBound} to ${fusedBound}`
        );
      }
      
      return {
        stream: g,
        fused: false,
        reason: `Would increase bound from ${g.usageBound} to ${fusedBound}`,
        originalBounds: [f.usageBound, g.usageBound],
        fusedBound
      };
    }
    
    // Perform fusion
    const fusedStream = this.performFusion(f, g, fOperator, gOperator, fusedBound);
    
    if (this.debugEnabled) {
      multiplicityLogger.info(
        `[Fusion] ${fOperator} → ${gOperator} fused, bound: ${f.usageBound} × ${g.usageBound} = ${fusedBound}`
      );
    }
    
    return {
      stream: fusedStream,
      fused: true,
      originalBounds: [f.usageBound, g.usageBound],
      fusedBound
    };
  }
  
  /**
   * Perform the actual fusion of two streams
   */
  private performFusion<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
    f: F,
    g: G,
    fOperator: StreamOperator,
    gOperator: StreamOperator,
    fusedBound: Multiplicity
  ): Stream<any, any, any, any> {
    // Create fused stream with combined logic
    const fusedStream: Stream<any, any, any, any> = {
      usageBound: fusedBound,
      __type: 'Stream',
      run: (input: any) => {
        // Combine the two stream operations
        const fStateFn = f.run(input);
        const gStateFn = g.run(input);
        
        return (state: any) => {
          // Execute f first, then g
              const [fState, fResult] = fStateFn(state);
    const [gState, gResult] = gStateFn(fState);
          
                      return [gState, gResult];
        };
      }
    };
    
    return fusedStream;
  }
  
  /**
   * Optimize a chain of streams
   */
  optimizeChain<In, Out, S, UB extends Multiplicity>(
    streams: Array<{ stream: Stream<any, any, any, any>; operator: StreamOperator; params?: any }>
  ): Stream<In, Out, S, UB> {
    if (streams.length === 0) {
      throw new Error('Cannot optimize empty stream chain');
    }
    
    if (streams.length === 1) {
      return streams[0].stream as Stream<In, Out, S, UB>;
    }
    
    let currentStream = streams[0].stream;
    let currentOperator = streams[0].operator;
    let currentParams = streams[0].params;
    
    for (let i = 1; i < streams.length; i++) {
      const nextStream = streams[i].stream;
      const nextOperator = streams[i].operator;
      const nextParams = streams[i].params;
      
      const fusionResult = this.fuse(
        currentStream,
        nextStream,
        currentOperator,
        nextOperator,
        currentParams,
        nextParams
      );
      
      if (fusionResult.fused) {
        currentStream = fusionResult.stream;
        // Update operator to reflect the fusion
        currentOperator = 'fused';
        currentParams = undefined;
      } else {
        // Keep streams separate
        currentStream = nextStream;
        currentOperator = nextOperator;
        currentParams = nextParams;
      }
    }
    
    return currentStream as Stream<In, Out, S, UB>;
  }
}

// ============================================================================
// Stream Factory Functions
// ============================================================================

/**
 * Create a map stream
 */
export function createMapStream<In, Out, S>(
  f: (input: In) => Out,
  usageBound: Multiplicity = 1
): Stream<In, Out, S, 1> {
  return {
    usageBound: 1, // Map is always stateless with bound = 1
    __type: 'Stream',
    run: (input: In) => (state: S) => [f(input), state]
  };
}

/**
 * Create a filter stream
 */
export function createFilterStream<In, S>(
  predicate: (input: In) => boolean,
  usageBound: Multiplicity = 1
): Stream<In, In, S, 1> {
  return {
    usageBound: 1, // Filter is always stateless with bound = 1
    __type: 'Stream',
    run: (input: In) => (state: S) => {
      if (predicate(input)) {
        return [input, state];
      } else {
        // Filter out the value
        return [null as any, state];
      }
    }
  };
}

/**
 * Create a scan stream
 */
export function createScanStream<In, Out, S>(
  initial: Out,
  f: (acc: Out, input: In) => Out,
  usageBound: Multiplicity = 1
): Stream<In, Out, S, Multiplicity> {
  return {
    usageBound,
    __type: 'Stream',
    run: (input: In) => (state: S) => {
      const currentAcc = (state as any).acc || initial;
      const newAcc = f(currentAcc, input);
      const newState = { ...state, acc: newAcc };
      return [newAcc, newState];
    }
  };
}

/**
 * Create a take stream
 */
export function createTakeStream<In, S>(
  count: number,
  usageBound: Multiplicity = 1
): Stream<In, In, S, number> {
  return {
    usageBound: count, // Take(n) has bound = n
    __type: 'Stream',
    run: (input: In) => (state: S) => {
      const currentCount = (state as any).count || 0;
      if (currentCount < count) {
        const newState = { ...state, count: currentCount + 1 };
        return [input, newState];
      } else {
        // Stop producing values
        return [null as any, state];
      }
    }
  };
}

/**
 * Create a flatMap stream
 */
export function createFlatMapStream<In, Out, S>(
  f: (input: In) => Stream<In, Out, S, any>,
  usageBound: Multiplicity = "∞"
): Stream<In, Out, S, Multiplicity> {
  return {
    usageBound,
    __type: 'Stream',
    run: (input: In) => (state: S) => {
      const innerStream = f(input);
      return innerStream.run(input)(state);
    }
  };
}

// ============================================================================
// Debug and Diagnostics
// ============================================================================

/**
 * Enable fusion debug logging
 */
export function enableFusionDebug(): void {
  multiplicityDebug.enabled = true;
  multiplicityLogger.info('[Fusion] Debug logging enabled for stream fusion');
}

/**
 * Disable fusion debug logging
 */
export function disableFusionDebug(): void {
  multiplicityDebug.enabled = false;
  multiplicityLogger.info('[Fusion] Debug logging disabled for stream fusion');
}

/**
 * Log fusion statistics
 */
export function logFusionStats(stats: {
  totalAttempts: number;
  successfulFusions: number;
  skippedFusions: number;
  averageBoundReduction: number;
}): void {
  if (multiplicityDebug.enabled) {
    multiplicityLogger.info('[Fusion] Statistics', stats);
  }
}

// ============================================================================
// Type-Level Fusion Safety
// ============================================================================

/**
 * Type-level check for fusion safety
 */
export type SafeFusion<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>> = 
  F['usageBound'] extends number 
    ? G['usageBound'] extends number 
      ? F['usageBound'] extends infer FB 
        ? G['usageBound'] extends infer GB 
          ? FB extends number 
            ? GB extends number 
              ? FB extends 0 ? true
              : GB extends 0 ? true
              : FB extends 1 ? true
              : GB extends 1 ? true
              : false // For complex multiplications, assume unsafe
            : false
          : false
        : false
      : false
    : false;

/**
 * Type-level fused bound calculation
 */
export type FusedBound<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>> = 
  F['usageBound'] extends number 
    ? G['usageBound'] extends number 
      ? F['usageBound'] extends infer FB 
        ? G['usageBound'] extends infer GB 
          ? FB extends number 
            ? GB extends number 
              ? FB extends 0 ? 0
              : GB extends 0 ? 0
              : FB extends 1 ? GB
              : GB extends 1 ? FB
              : "∞" // For complex multiplications, use "∞" for safety
            : "∞"
          : "∞"
        : "∞"
      : "∞"
    : "∞";

/**
 * Type-level fusion result
 */
export type FusionResultType<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>> = 
  SafeFusion<F, G> extends true 
    ? { fused: true; bound: FusedBound<F, G> }
    : { fused: false; reason: 'Would increase multiplicity' };

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize debug logging if enabled
if (multiplicityDebug.enabled) {
  multiplicityLogger.info('[Fusion] Stream fusion multiplicity system initialized');
} 