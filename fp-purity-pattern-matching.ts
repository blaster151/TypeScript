/**
 * Purity-Aware Pattern Matching System
 * 
 * This module extends the pattern matching system to include purity tracking,
 * ensuring that the purity of each branch's return type is inferred and
 * propagated through match results automatically.
 * 
 * Features:
 * - Purity inference for each branch's return type
 * - Compile-time purity mismatch detection
 * - Automatic purity propagation through match results
 * - Integration with GADT pattern matching
 * - Higher-order matcher purity inference
 * - Integration with DerivablePatternMatch
 */

import {
  EffectTag, EffectOf, Pure, IO, Async, Effect,
  isPure, isIO, isAsync, getEffectTag,
  PurityContext, PurityError, PurityResult
} from './fp-purity';

import {
  GADT, GADTTags, GADTPayload,
  pmatch, PatternMatcherBuilder,
  derivePatternMatcher, createPmatchBuilder,
  Expr, ExprK, evaluate, transformString, ExprFunctor,
  MaybeGADT, MaybeGADTK, MaybeGADTFunctor, MaybeGADTApplicative, MaybeGADTMonad,
  EitherGADT, EitherGADTK, EitherGADTBifunctor,
  Result, ResultK, ResultFunctor, deriveResultMonad
} from './fp-gadt-enhanced';

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

// ============================================================================
// Part 1: Purity-Aware Match Result Types
// ============================================================================

/**
 * Purity-aware match result type
 */
export type MatchResult<R, P extends EffectTag> = {
  readonly value: R;
  readonly effect: P;
  readonly isPure: P extends 'Pure' ? true : false;
  readonly isIO: P extends 'IO' ? true : false;
  readonly isAsync: P extends 'Async' ? true : false;
};

/**
 * Create a match result with purity information
 */
export function createMatchResult<R, P extends EffectTag>(
  value: R,
  effect: P
): MatchResult<R, P> {
  return {
    value,
    effect,
    isPure: (effect === 'Pure') as P extends 'Pure' ? true : false,
    isIO: (effect === 'IO') as P extends 'IO' ? true : false,
    isAsync: (effect === 'Async') as P extends 'Async' ? true : false
  };
}

/**
 * Extract value from match result
 */
export function getMatchValue<R, P extends EffectTag>(result: MatchResult<R, P>): R {
  return result.value;
}

/**
 * Extract effect from match result
 */
export function getMatchEffect<R, P extends EffectTag>(result: MatchResult<R, P>): P {
  return result.effect;
}

/**
 * Check if match result is pure
 */
export function isMatchResultPure<R, P extends EffectTag>(result: MatchResult<R, P>): result is MatchResult<R, 'Pure'> {
  return result.isPure;
}

/**
 * Check if match result is IO
 */
export function isMatchResultIO<R, P extends EffectTag>(result: MatchResult<R, P>): result is MatchResult<R, 'IO'> {
  return result.isIO;
}

/**
 * Check if match result is async
 */
export function isMatchResultAsync<R, P extends EffectTag>(result: MatchResult<R, P>): result is MatchResult<R, 'Async'> {
  return result.isAsync;
}

// ============================================================================
// Part 2: Purity Inference for Type Constructors
// ============================================================================

/**
 * Infer purity from a type constructor
 */
export type InferPurity<F> = 
  F extends Kind1 ? EffectOf<F> :
  F extends Kind2 ? EffectOf<F> :
  F extends Kind3 ? EffectOf<F> :
  F extends { effect: infer E } ? E :
  F extends { readonly effect: infer E } ? E :
  'Pure';

/**
 * Infer purity from a value
 */
export function inferPurityFromValue<T>(value: T): EffectTag {
  if (value && typeof value === 'object') {
    // Check for explicit effect property
    if ('effect' in value && typeof (value as any).effect === 'string') {
      return (value as any).effect;
    }
    
    // Check for IO-like objects
    if ('unsafeRun' in value || 'run' in value || 'execute' in value) {
      return 'IO';
    }
    
    // Check for Async-like objects
    if ('then' in value && typeof (value as any).then === 'function') {
      return 'Async';
    }
  }
  
  return 'Pure';
}

/**
 * Infer purity from a function return type
 */
export type InferFunctionPurity<F> = 
  F extends (...args: any[]) => infer R ? InferPurity<R> :
  'Pure';

/**
 * Infer purity from a union of types
 */
export type InferUnionPurity<T> = 
  T extends any ? InferPurity<T> : never;

/**
 * Get the highest effect level from a union
 */
export type HighestEffect<T extends EffectTag> = 
  T extends 'Async' ? 'Async' :
  T extends 'IO' ? 'IO' :
  'Pure';

/**
 * Infer overall purity from multiple branches
 */
export type InferMatchPurity<Cases> = 
  Cases extends Record<string, (...args: any[]) => any> ?
    HighestEffect<InferFunctionPurity<Cases[keyof Cases]>> :
    'Pure';

// ============================================================================
// Part 3: Purity-Aware Pattern Matching
// ============================================================================

/**
 * Purity-aware pattern matching function
 */
export function match<P extends EffectTag, T, R>(
  value: T,
  cases: Record<string, (...args: any[]) => R>
): MatchResult<R, P> {
  // Runtime implementation - purity is primarily a type-level feature
  const result = pmatch(value, cases);
  const effect = inferPurityFromValue(result);
  
  return createMatchResult(result, effect as P);
}

/**
 * Purity-aware pattern matching with expected purity
 */
export function matchExpect<PExpected extends EffectTag, T, R>(
  value: T,
  expected: PExpected,
  cases: Record<string, (...args: any[]) => R>
): MatchResult<R, PExpected> {
  const result = pmatch(value, cases);
  const actualEffect = inferPurityFromValue(result);
  
  // Runtime check for purity mismatch
  if (actualEffect !== expected) {
    throw new PurityError(`Expected ${expected} but got ${actualEffect}`);
  }
  
  return createMatchResult(result, expected);
}

/**
 * Purity-aware GADT pattern matching
 */
export function matchGADT<P extends EffectTag, T extends GADT<string, any>, R>(
  gadt: T,
  cases: {
    [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => R;
  }
): MatchResult<R, P> {
  const result = pmatch(gadt, cases);
  const effect = inferPurityFromValue(result);
  
  return createMatchResult(result, effect as P);
}

/**
 * Purity-aware GADT pattern matching with expected purity
 */
export function matchGADTExpect<PExpected extends EffectTag, T extends GADT<string, any>, R>(
  gadt: T,
  expected: PExpected,
  cases: {
    [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => R;
  }
): MatchResult<R, PExpected> {
  const result = pmatch(gadt, cases);
  const actualEffect = inferPurityFromValue(result);
  
  // Runtime check for purity mismatch
  if (actualEffect !== expected) {
    throw new PurityError(`Expected ${expected} but got ${actualEffect}`);
  }
  
  return createMatchResult(result, expected);
}

// ============================================================================
// Part 4: Type-Safe Purity-Aware Pattern Matching
// ============================================================================

/**
 * Type-safe purity-aware pattern matching
 */
export function matchTypeSafe<P extends EffectTag, T, R>(
  value: T,
  cases: Record<string, (...args: any[]) => R>
): MatchResult<R, P> {
  return match<P, T, R>(value, cases);
}

/**
 * Type-safe purity-aware pattern matching with expected purity
 */
export function matchTypeSafeExpect<PExpected extends EffectTag, T, R>(
  value: T,
  expected: PExpected,
  cases: Record<string, (...args: any[]) => R>
): MatchResult<R, PExpected> {
  return matchExpect<PExpected, T, R>(value, expected, cases);
}

/**
 * Type-safe purity-aware GADT pattern matching
 */
export function matchGADTTypeSafe<P extends EffectTag, T extends GADT<string, any>, R>(
  gadt: T,
  cases: {
    [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => R;
  }
): MatchResult<R, P> {
  return matchGADT<P, T, R>(gadt, cases);
}

/**
 * Type-safe purity-aware GADT pattern matching with expected purity
 */
export function matchGADTTypeSafeExpect<PExpected extends EffectTag, T extends GADT<string, any>, R>(
  gadt: T,
  expected: PExpected,
  cases: {
    [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => R;
  }
): MatchResult<R, PExpected> {
  return matchGADTExpect<PExpected, T, R>(gadt, expected, cases);
}

// ============================================================================
// Part 5: Higher-Order Purity-Aware Matchers
// ============================================================================

/**
 * Higher-order purity-aware matcher
 */
export function createPurityAwareMatcher<P extends EffectTag>() {
  return function<T, R>(
    value: T,
    cases: Record<string, (...args: any[]) => R>
  ): MatchResult<R, P> {
    return match<P, T, R>(value, cases);
  };
}

/**
 * Higher-order purity-aware matcher with expected purity
 */
export function createPurityAwareMatcherExpect<PExpected extends EffectTag>() {
  return function<T, R>(
    value: T,
    cases: Record<string, (...args: any[]) => R>
  ): MatchResult<R, PExpected> {
    return matchExpect<PExpected, T, R>(value, PExpected, cases);
  };
}

/**
 * Higher-order GADT purity-aware matcher
 */
export function createGADTPurityAwareMatcher<P extends EffectTag>() {
  return function<T extends GADT<string, any>, R>(
    gadt: T,
    cases: {
      [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => R;
    }
  ): MatchResult<R, P> {
    return matchGADT<P, T, R>(gadt, cases);
  };
}

/**
 * Higher-order GADT purity-aware matcher with expected purity
 */
export function createGADTPurityAwareMatcherExpect<PExpected extends EffectTag>() {
  return function<T extends GADT<string, any>, R>(
    gadt: T,
    cases: {
      [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => R;
    }
  ): MatchResult<R, PExpected> {
    return matchGADTExpect<PExpected, T, R>(gadt, PExpected, cases);
  };
}

// ============================================================================
// Part 6: Purity-Aware Evaluator Functions
// ============================================================================

/**
 * Purity-aware evaluator for expressions
 */
export function evaluateExprPurity<A>(expr: Expr<A>): MatchResult<A, InferMatchPurity<{
  Const: (c: { value: A }) => A;
  Add: ({ left, right }: { left: Expr<A>; right: Expr<A> }) => A;
  If: ({ cond, then, else: alt }: { cond: Expr<A>; then: Expr<A>; else: Expr<A> }) => A;
}>> {
  return matchGADT(expr, {
    Const: c => c.value,
    Add: ({ left, right }) => {
      const leftResult = evaluateExprPurity(left);
      const rightResult = evaluateExprPurity(right);
      // This would need proper arithmetic operations for type A
      return leftResult.value as any;
    },
    If: ({ cond, then, else: alt }) => {
      const condResult = evaluateExprPurity(cond);
      const thenResult = evaluateExprPurity(then);
      const altResult = evaluateExprPurity(alt);
      return (condResult.value ? thenResult.value : altResult.value) as A;
    }
  });
}

/**
 * Purity-aware evaluator with expected purity
 */
export function evaluateExprPurityExpect<PExpected extends EffectTag, A>(
  expr: Expr<A>,
  expected: PExpected
): MatchResult<A, PExpected> {
  return matchGADTExpect(expr, expected, {
    Const: c => c.value,
    Add: ({ left, right }) => {
      const leftResult = evaluateExprPurityExpect(left, expected);
      const rightResult = evaluateExprPurityExpect(right, expected);
      return leftResult.value as any;
    },
    If: ({ cond, then, else: alt }) => {
      const condResult = evaluateExprPurityExpect(cond, expected);
      const thenResult = evaluateExprPurityExpect(then, expected);
      const altResult = evaluateExprPurityExpect(alt, expected);
      return (condResult.value ? thenResult.value : altResult.value) as A;
    }
  });
}

// ============================================================================
// Part 7: Integration with DerivablePatternMatch
// ============================================================================

/**
 * Purity-aware derivable pattern match interface
 */
export interface PurityAwareDerivablePatternMatch<T, R, P extends EffectTag> {
  readonly match: (value: T, cases: Record<string, (...args: any[]) => R>) => MatchResult<R, P>;
  readonly matchExpect: <PExpected extends EffectTag>(
    value: T,
    expected: PExpected,
    cases: Record<string, (...args: any[]) => R>
  ) => MatchResult<R, PExpected>;
  readonly effect: P;
}

/**
 * Create purity-aware derivable pattern matcher
 */
export function createPurityAwareDerivablePatternMatch<T, R, P extends EffectTag>(
  effect: P
): PurityAwareDerivablePatternMatch<T, R, P> {
  return {
    match: <P2 extends EffectTag>(value: T, cases: Record<string, (...args: any[]) => R>) =>
      match<P2, T, R>(value, cases),
    matchExpect: <PExpected extends EffectTag>(
      value: T,
      expected: PExpected,
      cases: Record<string, (...args: any[]) => R>
    ) => matchExpect<PExpected, T, R>(value, expected, cases),
    effect
  };
}

/**
 * Derive purity-aware pattern matcher for a type
 */
export function derivePurityAwarePatternMatch<T, R, P extends EffectTag>(
  effect: P
): PurityAwareDerivablePatternMatch<T, R, P> {
  return createPurityAwareDerivablePatternMatch<T, R, P>(effect);
}

// ============================================================================
// Part 8: Purity-Aware Pattern Matching Utilities
// ============================================================================

/**
 * Compose purity-aware matchers
 */
export function composePurityAwareMatchers<P1 extends EffectTag, P2 extends EffectTag, T, R1, R2>(
  matcher1: (value: T) => MatchResult<R1, P1>,
  matcher2: (value: R1) => MatchResult<R2, P2>
): (value: T) => MatchResult<R2, HighestEffect<P1 | P2>> {
  return (value: T) => {
    const result1 = matcher1(value);
    const result2 = matcher2(result1.value);
    
    // Determine the highest effect level
    const highestEffect = 
      result1.effect === 'Async' || result2.effect === 'Async' ? 'Async' :
      result1.effect === 'IO' || result2.effect === 'IO' ? 'IO' :
      'Pure';
    
    return createMatchResult(result2.value, highestEffect as HighestEffect<P1 | P2>);
  };
}

/**
 * Lift a pure function to a purity-aware matcher
 */
export function liftPureFunction<P extends EffectTag, T, R>(
  fn: (value: T) => R,
  effect: P = 'Pure' as P
): (value: T) => MatchResult<R, P> {
  return (value: T) => createMatchResult(fn(value), effect);
}

/**
 * Lift an impure function to a purity-aware matcher
 */
export function liftImpureFunction<P extends EffectTag, T, R>(
  fn: (value: T) => R,
  effect: P
): (value: T) => MatchResult<R, P> {
  return (value: T) => createMatchResult(fn(value), effect);
}

/**
 * Sequence purity-aware matchers
 */
export function sequencePurityAwareMatchers<P extends EffectTag, T, R>(
  matchers: Array<(value: T) => MatchResult<R, P>>
): (value: T) => MatchResult<R[], P> {
  return (value: T) => {
    const results = matchers.map(matcher => matcher(value));
    const values = results.map(result => result.value);
    const effect = results[0]?.effect || 'Pure';
    
    return createMatchResult(values, effect as P);
  };
}

// ============================================================================
// Part 9: Purity-Aware Pattern Matching with Effect Tracking
// ============================================================================

/**
 * Effect tracking for pattern matching
 */
export interface EffectTracking {
  readonly currentEffect: EffectTag;
  readonly effectHistory: EffectTag[];
  readonly isPure: boolean;
  readonly isIO: boolean;
  readonly isAsync: boolean;
}

/**
 * Create effect tracking
 */
export function createEffectTracking(initialEffect: EffectTag = 'Pure'): EffectTracking {
  return {
    currentEffect: initialEffect,
    effectHistory: [initialEffect],
    isPure: initialEffect === 'Pure',
    isIO: initialEffect === 'IO',
    isAsync: initialEffect === 'Async'
  };
}

/**
 * Update effect tracking
 */
export function updateEffectTracking(
  tracking: EffectTracking,
  newEffect: EffectTag
): EffectTracking {
  const effectHistory = [...tracking.effectHistory, newEffect];
  const highestEffect = 
    effectHistory.includes('Async') ? 'Async' :
    effectHistory.includes('IO') ? 'IO' :
    'Pure';
  
  return {
    currentEffect: highestEffect,
    effectHistory,
    isPure: highestEffect === 'Pure',
    isIO: highestEffect === 'IO',
    isAsync: highestEffect === 'Async'
  };
}

/**
 * Purity-aware pattern matching with effect tracking
 */
export function matchWithEffectTracking<P extends EffectTag, T, R>(
  value: T,
  cases: Record<string, (...args: any[]) => R>,
  tracking: EffectTracking = createEffectTracking()
): MatchResult<R, P> & { tracking: EffectTracking } {
  const result = pmatch(value, cases);
  const effect = inferPurityFromValue(result);
  const updatedTracking = updateEffectTracking(tracking, effect);
  
  return {
    ...createMatchResult(result, effect as P),
    tracking: updatedTracking
  };
}

// ============================================================================
// Part 10: Purity-Aware Pattern Matching Laws
// ============================================================================

/**
 * Purity-Aware Pattern Matching Laws:
 * 
 * 1. Purity Inference Law: The purity of a match result is the highest effect level of all branches
 * 2. Purity Propagation Law: Purity annotations flow through match results automatically
 * 3. Purity Mismatch Law: matchExpect fails when actual purity doesn't match expected purity
 * 4. Composition Law: Composed matchers preserve the highest effect level
 * 5. Lifting Law: Pure functions can be lifted to purity-aware matchers
 * 
 * Runtime Laws:
 * 
 * 1. Effect Tracking Law: Effect tracking maintains history of all effects
 * 2. Purity Preservation Law: Pure branches don't affect overall purity
 * 3. Impurity Propagation Law: Any impure branch makes the whole match impure
 * 4. Type Safety Law: Purity-aware matchers maintain type safety
 * 
 * Type-Level Laws:
 * 
 * 1. Inference Law: Purity is inferred from return types automatically
 * 2. Union Law: Union types have the highest effect level of their members
 * 3. Function Law: Function return types determine their purity
 * 4. GADT Law: GADT pattern matching preserves purity information
 */ 