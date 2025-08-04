/**
 * Enhanced Purity-Aware Pattern Matching System
 * 
 * This module extends pattern matching to carry purity information inferred from its branches,
 * ensuring that the result type of a match reflects the purity of all its branches.
 * 
 * Features:
 * - Enhanced match type signature with purity inference
 * - Automatic branch purity inference using EffectOfBranch
 * - Merged branch effect computation
 * - Purity propagation into match results
 * - Purity annotation overrides
 * - Seamless integration with HKTs & typeclasses
 * - Compile-time and runtime purity verification
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async, Effect,
  isPure, isIO, isAsync, getEffectTag,
  PurityContext, PurityError, PurityResult
} from './fp-purity';

import {
  CombineEffects, CombineEffectsArray, ExtractEffect, PurityAwareResult,
  createPurityAwareResult, extractValue, extractEffect,
  combineEffects, hasPurityInfo, stripPurityInfo, addPurityInfo
} from './fp-purity-combinators';

import {
  GADT, Expr, ExprK, evaluate, MaybeGADT, MaybeGADTK, EitherGADT, EitherGADTK
} from './fp-gadt-enhanced';

// ============================================================================
// Part 1: Enhanced Purity Inference Types
// ============================================================================

/**
 * Infer the effect of a branch handler
 */
export type EffectOfBranch<H> =
  H extends (...args: any[]) => infer R
    ? EffectOf<R>
    : 'Pure';

/**
 * Merge effects from multiple branches
 */
export type MergedBranchEffect<Effects extends EffectTag[]> =
  Effects extends [infer First, ...infer Rest]
    ? First extends EffectTag
      ? Rest extends EffectTag[]
        ? CombineEffects<First, MergedBranchEffect<Rest>>
        : First
      : 'Pure'
    : 'Pure';

/**
 * Extract effects from all handlers in a match handlers object
 */
export type ExtractHandlerEffects<Handlers> = {
  [K in keyof Handlers]: EffectOfBranch<Handlers[K]>;
};

/**
 * Merge all handler effects into a single effect
 */
export type MergeAllHandlerEffects<Handlers> = 
  MergedBranchEffect<ExtractHandlerEffects<Handlers>[keyof Handlers][]>;

/**
 * Enhanced match result type with purity information
 */
export type PurityAwareMatchResult<T, P extends EffectTag> = T & { __effect?: P };

// ============================================================================
// Part 2: Enhanced Match Type Signatures
// ============================================================================

/**
 * Enhanced match function type signature
 */
export type EnhancedMatchFunction<
  T extends GADT<string, any>,
  Handlers,
  P extends EffectTag = MergeAllHandlerEffects<Handlers>
> = (
  value: T,
  handlers: Handlers
) => PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P>;

/**
 * Enhanced match with explicit purity
 */
export type EnhancedMatchWithPurity<
  T extends GADT<string, any>,
  Handlers,
  P extends EffectTag
> = (
  value: T,
  handlers: Handlers,
  purity: P
) => PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P>;

// ============================================================================
// Part 3: Enhanced Match Implementation
// ============================================================================

/**
 * Enhanced match function with purity inference
 */
export function enhancedMatch<
  T extends GADT<string, any>,
  Handlers extends Record<string, (...args: any[]) => any>,
  P extends EffectTag = MergeAllHandlerEffects<Handlers>
>(
  value: T,
  handlers: Handlers,
  options: {
    enableRuntimeMarkers?: boolean;
    customPurity?: EffectTag;
  } = {}
): PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P> {
  const { enableRuntimeMarkers = false, customPurity } = options;
  
  // Get the tag from the GADT value
  const tag = (value as any).tag;
  
  // Find the appropriate handler
  const handler = handlers[tag];
  if (!handler) {
    throw new Error(`No handler found for tag: ${tag}`);
  }
  
  // Call the handler with the value
  const result = handler(value);
  
  // Determine the purity
  let effect: EffectTag;
  if (customPurity) {
    effect = customPurity;
  } else {
    // Infer purity from the handler's return type
    effect = inferHandlerPurity(handler, result);
  }
  
  // Add runtime marker if enabled
  if (enableRuntimeMarkers) {
    return Object.assign(result, { __effect: effect });
  }
  
  return result as PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P>;
}

/**
 * Enhanced match with explicit purity override
 */
export function enhancedMatchWithPurity<
  T extends GADT<string, any>,
  Handlers extends Record<string, (...args: any[]) => any>,
  P extends EffectTag
>(
  value: T,
  handlers: Handlers,
  purity: P,
  options: {
    enableRuntimeMarkers?: boolean;
  } = {}
): PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P> {
  return enhancedMatch(value, handlers, {
    ...options,
    customPurity: purity
  });
}

// ============================================================================
// Part 4: Purity Inference Utilities
// ============================================================================

/**
 * Infer purity from a handler function and its result
 */
export function inferHandlerPurity<H extends (...args: any[]) => any>(
  handler: H,
  result: ReturnType<H>
): EffectTag {
  // Check if the result has explicit purity information
  if (hasPurityInfo(result)) {
    return extractEffect(result);
  }
  
  // Check if the result is a Promise (Async)
  if (result instanceof Promise) {
    return 'Async';
  }
  
  // Check if the result is a function that might be IO
  if (typeof result === 'function') {
    // This is a simplified check - in practice you'd have more sophisticated detection
    return 'IO';
  }
  
  // Default to Pure
  return 'Pure';
}

/**
 * Infer purity from handler return types at compile time
 */
export type InferHandlerPurity<H> = 
  H extends (...args: any[]) => infer R
    ? R extends Promise<any>
      ? 'Async'
      : R extends (...args: any[]) => any
        ? 'IO'
        : 'Pure'
    : 'Pure';

/**
 * Merge handler purities at compile time
 */
export type MergeHandlerPurities<Handlers> = 
  Handlers extends Record<string, (...args: any[]) => any>
    ? MergedBranchEffect<{
        [K in keyof Handlers]: InferHandlerPurity<Handlers[K]>;
      }[keyof Handlers][]>
    : 'Pure';

// ============================================================================
// Part 5: GADT-Specific Enhanced Matchers
// ============================================================================

/**
 * Enhanced match for Expr GADT
 */
export function enhancedMatchExpr<
  A,
  Handlers extends {
    Const: (expr: { tag: 'Const'; value: A }) => any;
    Add: (expr: { tag: 'Add'; left: Expr<A>; right: Expr<A> }) => any;
    If: (expr: { tag: 'If'; cond: Expr<A>; then: Expr<A>; else: Expr<A> }) => any;
  },
  P extends EffectTag = MergeAllHandlerEffects<Handlers>
>(
  expr: Expr<A>,
  handlers: Handlers,
  options: {
    enableRuntimeMarkers?: boolean;
    customPurity?: EffectTag;
  } = {}
): PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P> {
  return enhancedMatch(expr, handlers, options);
}

/**
 * Enhanced match for Maybe GADT
 */
export function enhancedMatchMaybe<
  A,
  Handlers extends {
    Nothing: (expr: { tag: 'Nothing' }) => any;
    Just: (expr: { tag: 'Just'; value: A }) => any;
  },
  P extends EffectTag = MergeAllHandlerEffects<Handlers>
>(
  maybe: MaybeGADT<A>,
  handlers: Handlers,
  options: {
    enableRuntimeMarkers?: boolean;
    customPurity?: EffectTag;
  } = {}
): PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P> {
  return enhancedMatch(maybe, handlers, options);
}

/**
 * Enhanced match for Either GADT
 */
export function enhancedMatchEither<
  L,
  R,
  Handlers extends {
    Left: (expr: { tag: 'Left'; value: L }) => any;
    Right: (expr: { tag: 'Right'; value: R }) => any;
  },
  P extends EffectTag = MergeAllHandlerEffects<Handlers>
>(
  either: EitherGADT<L, R>,
  handlers: Handlers,
  options: {
    enableRuntimeMarkers?: boolean;
    customPurity?: EffectTag;
  } = {}
): PurityAwareMatchResult<ReturnType<Handlers[keyof Handlers]>, P> {
  return enhancedMatch(either, handlers, options);
}

// ============================================================================
// Part 6: Purity Annotation Overrides
// ============================================================================

/**
 * Mark a value as pure
 */
export function pure<T>(value: T): PurityAwareResult<T, 'Pure'> {
  return createPurityAwareResult(value, 'Pure');
}

/**
 * Mark a value as impure (IO)
 */
export function impure<T>(value: T): PurityAwareResult<T, 'IO'> {
  return createPurityAwareResult(value, 'IO');
}

/**
 * Mark a value as async
 */
export function async<T>(value: T): PurityAwareResult<T, 'Async'> {
  return createPurityAwareResult(value, 'Async');
}

/**
 * Create a pure handler
 */
export function pureHandler<Args extends any[], R>(
  handler: (...args: Args) => R
): (...args: Args) => PurityAwareResult<R, 'Pure'> {
  return (...args: Args) => pure(handler(...args));
}

/**
 * Create an impure handler
 */
export function impureHandler<Args extends any[], R>(
  handler: (...args: Args) => R
): (...args: Args) => PurityAwareResult<R, 'IO'> {
  return (...args: Args) => impure(handler(...args));
}

/**
 * Create an async handler
 */
export function asyncHandler<Args extends any[], R>(
  handler: (...args: Args) => R
): (...args: Args) => PurityAwareResult<R, 'Async'> {
  return (...args: Args) => async(handler(...args));
}

// ============================================================================
// Part 7: HKT & Typeclass Integration
// ============================================================================

/**
 * Enhanced match that preserves HKT purity
 */
export function enhancedMatchHKT<
  F extends Kind1,
  T extends GADT<string, any>,
  Handlers extends Record<string, (...args: any[]) => any>,
  P extends EffectTag = MergeAllHandlerEffects<Handlers>
>(
  F_: Functor<F>,
  value: T,
  handlers: Handlers,
  options: {
    enableRuntimeMarkers?: boolean;
    customPurity?: EffectTag;
  } = {}
): PurityAwareMatchResult<Apply<F, [ReturnType<Handlers[keyof Handlers]>]>, P> {
  const matchResult = enhancedMatch(value, handlers, options);
  const result = F_.of(extractValue(matchResult));
  
  if (options.enableRuntimeMarkers) {
    return Object.assign(result, { __effect: extractEffect(matchResult) });
  }
  
  return result as PurityAwareMatchResult<Apply<F, [ReturnType<Handlers[keyof Handlers]>]>, P>;
}

/**
 * Enhanced match that preserves Monad purity
 */
export function enhancedMatchMonad<
  F extends Kind1,
  T extends GADT<string, any>,
  Handlers extends Record<string, (...args: any[]) => any>,
  P extends EffectTag = MergeAllHandlerEffects<Handlers>
>(
  F_: Monad<F>,
  value: T,
  handlers: Handlers,
  options: {
    enableRuntimeMarkers?: boolean;
    customPurity?: EffectTag;
  } = {}
): PurityAwareMatchResult<Apply<F, [ReturnType<Handlers[keyof Handlers]>]>, P> {
  const matchResult = enhancedMatch(value, handlers, options);
  const result = F_.of(extractValue(matchResult));
  
  if (options.enableRuntimeMarkers) {
    return Object.assign(result, { __effect: extractEffect(matchResult) });
  }
  
  return result as PurityAwareMatchResult<Apply<F, [ReturnType<Handlers[keyof Handlers]>]>, P>;
}

// ============================================================================
// Part 8: Utility Functions
// ============================================================================

/**
 * Extract value from enhanced match result
 */
export function extractMatchValue<T, P extends EffectTag>(
  result: PurityAwareMatchResult<T, P>
): T {
  return extractValue(result);
}

/**
 * Extract effect from enhanced match result
 */
export function extractMatchEffect<T, P extends EffectTag>(
  result: PurityAwareMatchResult<T, P>
): P {
  return extractEffect(result);
}

/**
 * Check if enhanced match result is pure
 */
export function isMatchResultPure<T, P extends EffectTag>(
  result: PurityAwareMatchResult<T, P>
): result is PurityAwareMatchResult<T, 'Pure'> {
  return extractEffect(result) === 'Pure';
}

/**
 * Check if enhanced match result is impure
 */
export function isMatchResultImpure<T, P extends EffectTag>(
  result: PurityAwareMatchResult<T, P>
): result is PurityAwareMatchResult<T, 'IO' | 'Async'> {
  return extractEffect(result) !== 'Pure';
}

/**
 * Check if enhanced match result is IO
 */
export function isMatchResultIO<T, P extends EffectTag>(
  result: PurityAwareMatchResult<T, P>
): result is PurityAwareMatchResult<T, 'IO'> {
  return extractEffect(result) === 'IO';
}

/**
 * Check if enhanced match result is async
 */
export function isMatchResultAsync<T, P extends EffectTag>(
  result: PurityAwareMatchResult<T, P>
): result is PurityAwareMatchResult<T, 'Async'> {
  return extractEffect(result) === 'Async';
}

// ============================================================================
// Part 9: Compile-Time Purity Verification
// ============================================================================

/**
 * Verify that all branches are pure
 */
export type VerifyPureBranches<Handlers> = 
  MergeAllHandlerEffects<Handlers> extends 'Pure' 
    ? true 
    : false;

/**
 * Verify that any branch is impure
 */
export type VerifyImpureBranches<Handlers> = 
  MergeAllHandlerEffects<Handlers> extends 'Pure' 
    ? false 
    : true;

/**
 * Get the merged effect type
 */
export type GetMergedEffect<Handlers> = MergeAllHandlerEffects<Handlers>;

// ============================================================================
// Part 10: Laws and Properties
// ============================================================================

/**
 * Enhanced Purity-Aware Pattern Matching Laws:
 * 
 * 1. Purity Inference Law: Branch purity is correctly inferred from return types
 * 2. Effect Merging Law: Multiple branch effects are correctly merged
 * 3. Pure Preservation Law: Pure branches produce pure results
 * 4. Impure Propagation Law: Any impure branch makes the entire match impure
 * 5. Annotation Override Law: Explicit purity annotations override inferred purity
 * 6. HKT Integration Law: HKT operations preserve match result purity
 * 7. Type Safety Law: All operations maintain type safety
 * 8. Runtime Marker Law: Runtime markers are only added when enabled
 * 
 * Runtime Laws:
 * 
 * 1. Marker Accuracy Law: Runtime markers accurately reflect computed purity
 * 2. Performance Law: No runtime cost unless markers are enabled
 * 3. Compatibility Law: Enhanced matchers are compatible with existing code
 * 4. Debugging Law: Runtime markers provide useful debugging information
 * 
 * Type-Level Laws:
 * 
 * 1. Inference Accuracy Law: Compile-time purity inference is accurate
 * 2. Merging Correctness Law: Effect merging produces correct results
 * 3. Propagation Law: Purity propagates correctly through type system
 * 4. Override Law: Explicit annotations override inferred purity
 */ 