/**
 * Effect-Aware Stream Fusion Multiplicity System
 * 
 * This module extends the multiplicity-aware stream optimizer to also respect
 * effect constraints when deciding whether to fuse two stream stages.
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
export type StateFn<S, A> = (state: S) => [A, S];

/**
 * Effect tags for stream operations
 */
export type EffectTag = "Pure" | "DeterministicEffect" | "NonDeterministicEffect" | "ExternalEffect";

/**
 * Stream interface with usage bounds and effect tags
 */
export interface Stream<In, Out, S, UB extends Multiplicity> {
  readonly usageBound: UB;
  readonly effectTag: EffectTag;
  readonly __type: 'Stream';
  run: (input: In) => StateFn<S, Out>;
}

/**
 * Stateful stream interface with usage bounds and effect tags
 */
export interface StatefulStream<In, Out, S, UB extends Multiplicity> {
  readonly usageBound: UB;
  readonly effectTag: EffectTag;
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
  | 'reduce'
  | 'flatMap'
  | 'chain'
  | 'take'
  | 'drop'
  | 'merge'
  | 'zip'
  | 'concat'
  | 'switch'
  | 'combineLatest'
  | 'log'
  | 'metrics'
  | 'fused';

/**
 * Stream fusion metadata with effect information
 */
export interface StreamFusionMeta {
  operator: StreamOperator;
  usageBound: Multiplicity;
  effectTag: EffectTag;
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
// Effect Safety Rules
// ============================================================================

/**
 * Effect safety levels (higher = more restrictive)
 */
export const EFFECT_SAFETY_LEVELS: Record<EffectTag, number> = {
  Pure: 0,
  DeterministicEffect: 1,
  NonDeterministicEffect: 2,
  ExternalEffect: 3
};

/**
 * Check if effect fusion is safe
 */
export function isEffectFusionSafe(fEffect: EffectTag, gEffect: EffectTag): boolean {
  // Pure + Pure → ✅ Always
  if (fEffect === "Pure" && gEffect === "Pure") {
    return true;
  }
  
  // Pure + DeterministicEffect → ✅ Preserve order
  if (fEffect === "Pure" && gEffect === "DeterministicEffect") {
    return true;
  }
  
  // DeterministicEffect + Pure → ✅ Preserve order
  if (fEffect === "DeterministicEffect" && gEffect === "Pure") {
    return true;
  }
  
  // DeterministicEffect + DeterministicEffect → ✅ Preserve order
  if (fEffect === "DeterministicEffect" && gEffect === "DeterministicEffect") {
    return true;
  }
  
  // Any + NonDeterministicEffect → ❌ unless explicitly opted-in
  if (gEffect === "NonDeterministicEffect") {
    return false;
  }
  
  // Any + ExternalEffect → ❌
  if (gEffect === "ExternalEffect") {
    return false;
  }
  
  return false;
}

/**
 * Get maximum effect tag from two effect tags
 */
export function maxEffectTag(fEffect: EffectTag, gEffect: EffectTag): EffectTag {
  const fLevel = EFFECT_SAFETY_LEVELS[fEffect];
  const gLevel = EFFECT_SAFETY_LEVELS[gEffect];
  
  return fLevel >= gLevel ? fEffect : gEffect;
}

/**
 * Check if effect fusion requires order preservation
 */
export function requiresOrderPreservation(fEffect: EffectTag, gEffect: EffectTag): boolean {
  // Pure + Pure doesn't require order preservation
  if (fEffect === "Pure" && gEffect === "Pure") {
    return false;
  }
  
  // Any other combination requires order preservation
  return true;
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
// Combined Fusion Safety Rules
// ============================================================================

/**
 * Check if two streams can be fused safely (both multiplicity and effect)
 */
export function canFuse<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
  f: F,
  g: G
): boolean {
  // Check multiplicity safety
  const fBound = usageBoundNumeric(f.usageBound);
  const gBound = usageBoundNumeric(g.usageBound);
  const fusedBound = fBound * gBound;
  const multiplicitySafe = fusedBound <= gBound;
  
  // Check effect safety
  const effectSafe = isEffectFusionSafe(f.effectTag, g.effectTag);
  
  return multiplicitySafe && effectSafe;
}

/**
 * Check if fusion would increase multiplicity
 */
export function wouldIncreaseMultiplicity<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
  f: F,
  g: G
): boolean {
  const fBound = usageBoundNumeric(f.usageBound);
  const gBound = usageBoundNumeric(g.usageBound);
  const fusedBound = fBound * gBound;
  
  return fusedBound > gBound;
}

/**
 * Check if fusion would violate effect safety
 */
export function wouldViolateEffectSafety<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
  f: F,
  g: G
): boolean {
  return !isEffectFusionSafe(f.effectTag, g.effectTag);
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

/**
 * Calculate fused effect tag
 */
export function calculateFusedEffectTag<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
  f: F,
  g: G
): EffectTag {
  return maxEffectTag(f.effectTag, g.effectTag);
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
  let effectTag: EffectTag;
  let isStateless = false;
  let isBounded = false;
  let boundOverride: number | undefined;
  
  switch (operator) {
    case 'map':
    case 'filter':
      // Stateless operators always have UB = 1 and are Pure
      usageBound = 1;
      effectTag = "Pure";
      isStateless = true;
      break;
      
    case 'scan':
    case 'reduce':
      // Stateful but deterministic accumulators
      usageBound = stream.usageBound;
      effectTag = "DeterministicEffect";
      isStateless = false;
      break;
      
    case 'flatMap':
    case 'chain':
      // FlatMap/chain can have variable bounds and effects
      usageBound = stream.usageBound;
      effectTag = stream.effectTag; // Preserve original effect tag
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
      effectTag = "Pure"; // Take is pure
      isBounded = true;
      isStateless = false;
      break;
      
    case 'drop':
      // Drop doesn't change the bound and is pure
      usageBound = stream.usageBound;
      effectTag = "Pure";
      isStateless = false;
      break;
      
    case 'log':
      // Log operator has external effects
      usageBound = stream.usageBound;
      effectTag = "ExternalEffect";
      isStateless = false;
      break;
      
    case 'metrics':
      // Metrics counters are deterministic effects
      usageBound = stream.usageBound;
      effectTag = "DeterministicEffect";
      isStateless = false;
      break;
      
    case 'merge':
    case 'zip':
    case 'concat':
    case 'switch':
    case 'combineLatest':
      // Complex operators often result in infinite bounds and non-deterministic effects
      usageBound = "∞";
      effectTag = "NonDeterministicEffect";
      isStateless = false;
      break;
      
    default:
      // Default to original bound and effect tag
      usageBound = stream.usageBound;
      effectTag = stream.effectTag;
      isStateless = false;
  }
  
  return {
    operator,
    usageBound,
    effectTag,
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
// Effect-Aware Stream Fusion Optimizer
// ============================================================================

/**
 * Fusion optimization result with effect information
 */
export interface EffectAwareFusionResult<In, Out, S, UB extends Multiplicity> {
  stream: Stream<In, Out, S, UB>;
  fused: boolean;
  reason?: string;
  originalBounds: [Multiplicity, Multiplicity];
  originalEffects: [EffectTag, EffectTag];
  fusedBound: Multiplicity;
  fusedEffectTag: EffectTag;
  multiplicityViolation?: boolean;
  effectViolation?: boolean;
}

/**
 * Effect-aware stream fusion optimizer
 */
export class EffectAwareStreamFusionOptimizer {
  private debugEnabled: boolean;
  private allowUnsafeFusion: boolean;
  
  constructor(debugEnabled: boolean = false, allowUnsafeFusion: boolean = false) {
    this.debugEnabled = debugEnabled;
    this.allowUnsafeFusion = allowUnsafeFusion;
  }
  
  /**
   * Attempt to fuse two streams with effect awareness
   */
  fuse<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
    f: F,
    g: G,
    fOperator: StreamOperator,
    gOperator: StreamOperator,
    fParams?: any,
    gParams?: any
  ): EffectAwareFusionResult<any, any, any, any> {
    const fCandidate = createFusionCandidate(f, fOperator, fParams);
    const gCandidate = createFusionCandidate(g, gOperator, gParams);
    
    const canFuseStreams = fCandidate.canFuseWith(gCandidate);
    const fusedBound = calculateFusedBound(f, g);
    const fusedEffectTag = calculateFusedEffectTag(f, g);
    
    // Check individual violations
    const multiplicityViolation = wouldIncreaseMultiplicity(f, g);
    const effectViolation = wouldViolateEffectSafety(f, g);
    
    if (this.debugEnabled) {
      multiplicityLogger.debug('Effect-aware fusion attempt', {
        fOperator,
        gOperator,
        fBound: f.usageBound,
        gBound: g.usageBound,
        fEffect: f.effectTag,
        gEffect: g.effectTag,
        fusedBound,
        fusedEffectTag,
        canFuse: canFuseStreams,
        multiplicityViolation,
        effectViolation
      });
    }
    
    if (!canFuseStreams) {
      let reason = '';
      
      if (multiplicityViolation && effectViolation) {
        reason = `Would increase bound from ${g.usageBound} to ${fusedBound} and violate effect safety (${f.effectTag} + ${g.effectTag})`;
      } else if (multiplicityViolation) {
        reason = `Would increase bound from ${g.usageBound} to ${fusedBound}`;
      } else if (effectViolation) {
        reason = `Would violate effect safety (${f.effectTag} + ${g.effectTag})`;
      }
      
      if (this.debugEnabled) {
        multiplicityLogger.warn(
          `[Fusion] ${fOperator} → ${gOperator} skipped: ${reason}`
        );
      }
      
      return {
        stream: g,
        fused: false,
        reason,
        originalBounds: [f.usageBound, g.usageBound],
        originalEffects: [f.effectTag, g.effectTag],
        fusedBound,
        fusedEffectTag,
        multiplicityViolation,
        effectViolation
      };
    }
    
    // Perform fusion
    const fusedStream = this.performFusion(f, g, fOperator, gOperator, fusedBound, fusedEffectTag);
    
    if (this.debugEnabled) {
      multiplicityLogger.info(
        `[Fusion] ${fOperator} → ${gOperator} fused: ${f.effectTag} + ${g.effectTag} safe, bound: ${f.usageBound} × ${g.usageBound} = ${fusedBound}`
      );
    }
    
    return {
      stream: fusedStream,
      fused: true,
      originalBounds: [f.usageBound, g.usageBound],
      originalEffects: [f.effectTag, g.effectTag],
      fusedBound,
      fusedEffectTag
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
    fusedBound: Multiplicity,
    fusedEffectTag: EffectTag
  ): Stream<any, any, any, any> {
    // Create fused stream with combined logic
    const fusedStream: Stream<any, any, any, any> = {
      usageBound: fusedBound,
      effectTag: fusedEffectTag,
      __type: 'Stream',
      run: (input: any) => {
        // Combine the two stream operations
        const fStateFn = f.run(input);
        const gStateFn = g.run(input);
        
        return (state: any) => {
          // Execute f first, then g (preserve order for effectful operations)
          const [fResult, fState] = fStateFn(state);
          const [gResult, gState] = gStateFn(fState);
          
          return [gResult, gState];
        };
      }
    };
    
    return fusedStream;
  }
  
  /**
   * Optimize a chain of streams with effect awareness
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
  
  /**
   * Force unsafe fusion (for testing or explicit opt-in)
   */
  unsafeFuse<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>>(
    f: F,
    g: G,
    fOperator: StreamOperator,
    gOperator: StreamOperator,
    fParams?: any,
    gParams?: any
  ): EffectAwareFusionResult<any, any, any, any> {
    if (!this.allowUnsafeFusion) {
      throw new Error('Unsafe fusion not allowed. Set allowUnsafeFusion=true to enable.');
    }
    
    const fusedBound = calculateFusedBound(f, g);
    const fusedEffectTag = calculateFusedEffectTag(f, g);
    
    const fusedStream = this.performFusion(f, g, fOperator, gOperator, fusedBound, fusedEffectTag);
    
    if (this.debugEnabled) {
      multiplicityLogger.warn(
        `[Fusion] UNSAFE ${fOperator} → ${gOperator} fused: ${f.effectTag} + ${g.effectTag}`
      );
    }
    
    return {
      stream: fusedStream,
      fused: true,
      reason: 'Unsafe fusion forced',
      originalBounds: [f.usageBound, g.usageBound],
      originalEffects: [f.effectTag, g.effectTag],
      fusedBound,
      fusedEffectTag
    };
  }
}

// ============================================================================
// Stream Factory Functions with Effect Tags
// ============================================================================

/**
 * Create a pure map stream
 */
export function createMapStream<In, Out, S>(
  f: (input: In) => Out,
  usageBound: Multiplicity = 1
): Stream<In, Out, S, 1> {
  return {
    usageBound: 1, // Map is always stateless with bound = 1
    effectTag: "Pure", // Map is pure
    __type: 'Stream',
    run: (input: In) => (state: S) => [f(input), state]
  };
}

/**
 * Create a pure filter stream
 */
export function createFilterStream<In, S>(
  predicate: (input: In) => boolean,
  usageBound: Multiplicity = 1
): Stream<In, In, S, 1> {
  return {
    usageBound: 1, // Filter is always stateless with bound = 1
    effectTag: "Pure", // Filter is pure
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
 * Create a deterministic scan stream
 */
export function createScanStream<In, Out, S>(
  initial: Out,
  f: (acc: Out, input: In) => Out,
  usageBound: Multiplicity = 1
): Stream<In, Out, S, Multiplicity> {
  return {
    usageBound,
    effectTag: "DeterministicEffect", // Scan is deterministic
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
 * Create a pure take stream
 */
export function createTakeStream<In, S>(
  count: number,
  usageBound: Multiplicity = 1
): Stream<In, In, S, number> {
  return {
    usageBound: count, // Take(n) has bound = n
    effectTag: "Pure", // Take is pure
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
 * Create a flatMap stream with effect tag
 */
export function createFlatMapStream<In, Out, S>(
  f: (input: In) => Stream<In, Out, S, any>,
  usageBound: Multiplicity = "∞",
  effectTag: EffectTag = "NonDeterministicEffect"
): Stream<In, Out, S, Multiplicity> {
  return {
    usageBound,
    effectTag,
    __type: 'Stream',
    run: (input: In) => (state: S) => {
      const innerStream = f(input);
      return innerStream.run(input)(state);
    }
  };
}

/**
 * Create a log stream with external effects
 */
export function createLogStream<In, S>(
  logger: (input: In) => void,
  usageBound: Multiplicity = 1
): Stream<In, In, S, Multiplicity> {
  return {
    usageBound,
    effectTag: "ExternalEffect", // Log has external effects
    __type: 'Stream',
    run: (input: In) => (state: S) => {
      logger(input);
      return [input, state];
    }
  };
}

/**
 * Create a metrics stream with deterministic effects
 */
export function createMetricsStream<In, S>(
  counter: (input: In) => void,
  usageBound: Multiplicity = 1
): Stream<In, In, S, Multiplicity> {
  return {
    usageBound,
    effectTag: "DeterministicEffect", // Metrics are deterministic
    __type: 'Stream',
    run: (input: In) => (state: S) => {
      counter(input);
      return [input, state];
    }
  };
}

// ============================================================================
// Debug and Diagnostics
// ============================================================================

/**
 * Enable effect-aware fusion debug logging
 */
export function enableEffectAwareFusionDebug(): void {
  multiplicityDebug.enabled = true;
  multiplicityLogger.info('[Effect-Aware Fusion] Debug logging enabled');
}

/**
 * Disable effect-aware fusion debug logging
 */
export function disableEffectAwareFusionDebug(): void {
  multiplicityDebug.enabled = false;
  multiplicityLogger.info('[Effect-Aware Fusion] Debug logging disabled');
}

/**
 * Log effect-aware fusion statistics
 */
export function logEffectAwareFusionStats(stats: {
  totalAttempts: number;
  successfulFusions: number;
  skippedFusions: number;
  multiplicityViolations: number;
  effectViolations: number;
  averageBoundReduction: number;
}): void {
  if (multiplicityDebug.enabled) {
    multiplicityLogger.info('[Effect-Aware Fusion] Statistics', stats);
  }
}

// ============================================================================
// Type-Level Effect Safety
// ============================================================================

/**
 * Type-level check for effect fusion safety
 */
export type EffectFusionSafe<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>> = 
  F['effectTag'] extends "Pure" 
    ? G['effectTag'] extends "Pure" | "DeterministicEffect" ? true : false
    : F['effectTag'] extends "DeterministicEffect"
    ? G['effectTag'] extends "Pure" | "DeterministicEffect" ? true : false
    : false;

/**
 * Type-level combined fusion safety
 */
export type SafeEffectAwareFusion<F extends Stream<any, any, any, any>, G extends Stream<any, any, any, any>> = 
  EffectFusionSafe<F, G> extends true 
    ? F['usageBound'] extends number 
      ? G['usageBound'] extends number 
        ? F['usageBound'] extends 1 
          ? G['usageBound'] extends 1 
            ? true 
            : true
          : G['usageBound'] extends 1 
            ? true
            : false
        : false
      : false
    : false;

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize debug logging if enabled
if (multiplicityDebug.enabled) {
  multiplicityLogger.info('[Effect-Aware Fusion] Effect-aware stream fusion multiplicity system initialized');
} 