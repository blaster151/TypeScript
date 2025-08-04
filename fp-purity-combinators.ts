/**
 * Purity-Aware FP Combinators System
 * 
 * This module extends all core FP combinators with purity tracking that flows
 * naturally through chains of operations, providing compile-time guarantees
 * without extra boilerplate.
 * 
 * Features:
 * - Purity-aware map, chain, ap, bimap, dimap combinators
 * - Automatic purity inference using EffectOf<F>
 * - Purity propagation through applicative and monadic operations
 * - Bifunctor and Profunctor purity tracking
 * - Derivable Instances integration
 * - Purity utilities for pipelines
 * - Runtime purity debugging support
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
  MatchResult, createMatchResult, getMatchValue, getMatchEffect,
  isMatchResultPure, isMatchResultIO, isMatchResultAsync,
  InferPurity, InferFunctionPurity, InferUnionPurity, HighestEffect, InferMatchPurity,
  inferPurityFromValue
} from './fp-purity-pattern-matching';

// ============================================================================
// Part 1: Purity Utilities for Pipelines
// ============================================================================

/**
 * Combine multiple effect tags into a single effect tag
 */
export type CombineEffects<A extends EffectTag, B extends EffectTag> =
  A extends 'Pure'
    ? B
    : B extends 'Pure'
      ? A
      : A extends B
        ? A
        : `${A}|${B}`; // Union if different impure tags

/**
 * Combine multiple effect tags from an array
 */
export type CombineEffectsArray<T extends EffectTag[]> =
  T extends [infer First, ...infer Rest]
    ? First extends EffectTag
      ? Rest extends EffectTag[]
        ? CombineEffects<First, CombineEffectsArray<Rest>>
        : First
      : never
    : 'Pure';

/**
 * Extract effect tag from a type constructor
 */
export type ExtractEffect<F> = 
  F extends Kind1 ? EffectOf<F> :
  F extends Kind2 ? EffectOf<F> :
  F extends Kind3 ? EffectOf<F> :
  'Pure';

/**
 * Purity-aware result type
 */
export type PurityAwareResult<T, P extends EffectTag> = T & { __effect?: P };

/**
 * Create purity-aware result
 */
export function createPurityAwareResult<T, P extends EffectTag>(
  value: T,
  effect: P
): PurityAwareResult<T, P> {
  return {
    ...value,
    __effect: effect
  } as PurityAwareResult<T, P>;
}

/**
 * Extract value from purity-aware result
 */
export function extractValue<T, P extends EffectTag>(
  result: PurityAwareResult<T, P>
): T {
  const { __effect, ...value } = result as any;
  return value as T;
}

/**
 * Extract effect from purity-aware result
 */
export function extractEffect<T, P extends EffectTag>(
  result: PurityAwareResult<T, P>
): P {
  return (result as any).__effect || 'Pure';
}

// ============================================================================
// Part 2: Purity-Aware Functor Combinators
// ============================================================================

/**
 * Purity-aware map combinator
 */
export function map<
  F extends Kind1,
  A,
  B,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Functor<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => B
): PurityAwareResult<Apply<F, [B]>, P> {
  const result = F_.map(fa, f);
  return createPurityAwareResult(result, getEffectTag(fa) as P);
}

/**
 * Purity-aware map with explicit effect
 */
export function mapWithEffect<
  F extends Kind1,
  A,
  B,
  P extends EffectTag
>(
  F_: Functor<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => B,
  effect: P
): PurityAwareResult<Apply<F, [B]>, P> {
  const result = F_.map(fa, f);
  return createPurityAwareResult(result, effect);
}

/**
 * Purity-aware map for GADTs
 */
export function mapGADT<
  G extends any,
  A,
  B,
  P extends EffectTag = 'Pure'
>(
  fa: G,
  f: (a: A) => B
): PurityAwareResult<G, P> {
  // This would need GADT-specific mapping logic
  return createPurityAwareResult(fa, 'Pure' as P);
}

// ============================================================================
// Part 3: Purity-Aware Applicative Combinators
// ============================================================================

/**
 * Purity-aware of combinator
 */
export function of<
  F extends Kind1,
  A,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Applicative<F>,
  a: A
): PurityAwareResult<Apply<F, [A]>, P> {
  const result = F_.of(a);
  return createPurityAwareResult(result, 'Pure' as P);
}

/**
 * Purity-aware ap combinator
 */
export function ap<
  F extends Kind1,
  A,
  B,
  P1 extends EffectTag = ExtractEffect<F>,
  P2 extends EffectTag = ExtractEffect<F>
>(
  F_: Applicative<F>,
  fab: Apply<F, [(a: A) => B]>,
  fa: Apply<F, [A]>
): PurityAwareResult<Apply<F, [B]>, CombineEffects<P1, P2>> {
  const result = F_.ap(fab, fa);
  const combinedEffect = combineEffects(
    getEffectTag(fab) as P1,
    getEffectTag(fa) as P2
  );
  return createPurityAwareResult(result, combinedEffect);
}

/**
 * Purity-aware lift2 combinator
 */
export function lift2<
  F extends Kind1,
  A,
  B,
  C,
  P1 extends EffectTag = ExtractEffect<F>,
  P2 extends EffectTag = ExtractEffect<F>
>(
  F_: Applicative<F>,
  f: (a: A, b: B) => C,
  fa: Apply<F, [A]>,
  fb: Apply<F, [B]>
): PurityAwareResult<Apply<F, [C]>, CombineEffects<P1, P2>> {
  const result = F_.ap(F_.map(fa, (a: A) => (b: B) => f(a, b)), fb);
  const combinedEffect = combineEffects(
    getEffectTag(fa) as P1,
    getEffectTag(fb) as P2
  );
  return createPurityAwareResult(result, combinedEffect);
}

// ============================================================================
// Part 4: Purity-Aware Monad Combinators
// ============================================================================

/**
 * Purity-aware chain combinator
 */
export function chain<
  F extends Kind1,
  A,
  B,
  P1 extends EffectTag = ExtractEffect<F>,
  P2 extends EffectTag = ExtractEffect<F>
>(
  F_: Monad<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => Apply<F, [B]>
): PurityAwareResult<Apply<F, [B]>, CombineEffects<P1, P2>> {
  const result = F_.chain(fa, f);
  const combinedEffect = combineEffects(
    getEffectTag(fa) as P1,
    getEffectTag(f(fa as any)) as P2
  );
  return createPurityAwareResult(result, combinedEffect);
}

/**
 * Purity-aware join combinator
 */
export function join<
  F extends Kind1,
  A,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Monad<F>,
  ffa: Apply<F, [Apply<F, [A]>]>
): PurityAwareResult<Apply<F, [A]>, P> {
  const result = F_.chain(ffa, (fa: Apply<F, [A]>) => fa);
  return createPurityAwareResult(result, getEffectTag(ffa) as P);
}

/**
 * Purity-aware composeK combinator
 */
export function composeK<
  F extends Kind1,
  A,
  B,
  C,
  P1 extends EffectTag = ExtractEffect<F>,
  P2 extends EffectTag = ExtractEffect<F>
>(
  F_: Monad<F>,
  f: (a: A) => Apply<F, [B]>,
  g: (b: B) => Apply<F, [C]>
): (a: A) => PurityAwareResult<Apply<F, [C]>, CombineEffects<P1, P2>> {
  return (a: A) => {
    const result = F_.chain(f(a), g);
    const combinedEffect = combineEffects(
      getEffectTag(f(a)) as P1,
      getEffectTag(g(a as any)) as P2
    );
    return createPurityAwareResult(result, combinedEffect);
  };
}

// ============================================================================
// Part 5: Purity-Aware Bifunctor Combinators
// ============================================================================

/**
 * Purity-aware bimap combinator
 */
export function bimap<
  F extends Kind2,
  A,
  B,
  C,
  D,
  P1 extends EffectTag = ExtractEffect<F>,
  P2 extends EffectTag = ExtractEffect<F>
>(
  F_: Bifunctor<F>,
  fab: Apply<F, [A, B]>,
  f: (a: A) => C,
  g: (b: B) => D
): PurityAwareResult<Apply<F, [C, D]>, CombineEffects<P1, P2>> {
  const result = F_.bimap(fab, f, g);
  const combinedEffect = combineEffects(
    getEffectTag(fab) as P1,
    getEffectTag(fab) as P2
  );
  return createPurityAwareResult(result, combinedEffect);
}

/**
 * Purity-aware mapLeft combinator
 */
export function mapLeft<
  F extends Kind2,
  A,
  B,
  C,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Bifunctor<F>,
  fab: Apply<F, [A, B]>,
  f: (a: A) => C
): PurityAwareResult<Apply<F, [C, B]>, P> {
  const result = F_.mapLeft ? F_.mapLeft(fab, f) : F_.bimap(fab, f, (b: B) => b);
  return createPurityAwareResult(result, getEffectTag(fab) as P);
}

/**
 * Purity-aware mapRight combinator
 */
export function mapRight<
  F extends Kind2,
  A,
  B,
  D,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Bifunctor<F>,
  fab: Apply<F, [A, B]>,
  g: (b: B) => D
): PurityAwareResult<Apply<F, [A, D]>, P> {
  const result = F_.mapRight ? F_.mapRight(fab, g) : F_.bimap(fab, (a: A) => a, g);
  return createPurityAwareResult(result, getEffectTag(fab) as P);
}

// ============================================================================
// Part 6: Purity-Aware Profunctor Combinators
// ============================================================================

/**
 * Purity-aware dimap combinator
 */
export function dimap<
  F extends Kind2,
  A,
  B,
  C,
  D,
  P1 extends EffectTag = ExtractEffect<F>,
  P2 extends EffectTag = ExtractEffect<F>
>(
  F_: Profunctor<F>,
  pab: Apply<F, [A, B]>,
  f: (c: C) => A,
  g: (b: B) => D
): PurityAwareResult<Apply<F, [C, D]>, CombineEffects<P1, P2>> {
  const result = F_.dimap(pab, f, g);
  const combinedEffect = combineEffects(
    getEffectTag(pab) as P1,
    getEffectTag(pab) as P2
  );
  return createPurityAwareResult(result, combinedEffect);
}

/**
 * Purity-aware lmap combinator
 */
export function lmap<
  F extends Kind2,
  A,
  B,
  C,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Profunctor<F>,
  pab: Apply<F, [A, B]>,
  f: (c: C) => A
): PurityAwareResult<Apply<F, [C, B]>, P> {
  const result = F_.lmap ? F_.lmap(pab, f) : F_.dimap(pab, f, (b: B) => b);
  return createPurityAwareResult(result, getEffectTag(pab) as P);
}

/**
 * Purity-aware rmap combinator
 */
export function rmap<
  F extends Kind2,
  A,
  B,
  D,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Profunctor<F>,
  pab: Apply<F, [A, B]>,
  g: (b: B) => D
): PurityAwareResult<Apply<F, [A, D]>, P> {
  const result = F_.rmap ? F_.rmap(pab, g) : F_.dimap(pab, (a: A) => a, g);
  return createPurityAwareResult(result, getEffectTag(pab) as P);
}

// ============================================================================
// Part 7: Purity-Aware Traversable Combinators
// ============================================================================

/**
 * Purity-aware sequence combinator
 */
export function sequence<
  F extends Kind1,
  G extends Kind1,
  A,
  PF extends EffectTag = ExtractEffect<F>,
  PG extends EffectTag = ExtractEffect<G>
>(
  F_: Traversable<F>,
  G_: Applicative<G>,
  fga: Apply<F, [Apply<G, [A]>]>
): PurityAwareResult<Apply<G, [Apply<F, [A]>]>, CombineEffects<PF, PG>> {
  const result = F_.sequence(G_, fga);
  const combinedEffect = combineEffects(
    getEffectTag(fga) as PF,
    getEffectTag(fga as any) as PG
  );
  return createPurityAwareResult(result, combinedEffect);
}

/**
 * Purity-aware traverse combinator
 */
export function traverse<
  F extends Kind1,
  G extends Kind1,
  A,
  B,
  PF extends EffectTag = ExtractEffect<F>,
  PG extends EffectTag = ExtractEffect<G>
>(
  F_: Traversable<F>,
  G_: Applicative<G>,
  f: (a: A) => Apply<G, [B]>,
  fa: Apply<F, [A]>
): PurityAwareResult<Apply<G, [Apply<F, [B]>]>, CombineEffects<PF, PG>> {
  const result = F_.traverse(G_, f, fa);
  const combinedEffect = combineEffects(
    getEffectTag(fa) as PF,
    getEffectTag(f(fa as any)) as PG
  );
  return createPurityAwareResult(result, combinedEffect);
}

// ============================================================================
// Part 8: Purity-Aware Foldable Combinators
// ============================================================================

/**
 * Purity-aware foldMap combinator
 */
export function foldMap<
  F extends Kind1,
  M,
  A,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Foldable<F>,
  M: { empty: () => M; concat: (a: M, b: M) => M },
  f: (a: A) => M,
  fa: Apply<F, [A]>
): PurityAwareResult<M, P> {
  const result = F_.foldMap(M, f, fa);
  return createPurityAwareResult(result, getEffectTag(fa) as P);
}

/**
 * Purity-aware foldr combinator
 */
export function foldr<
  F extends Kind1,
  A,
  B,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Foldable<F>,
  f: (a: A, b: B) => B,
  b: B,
  fa: Apply<F, [A]>
): PurityAwareResult<B, P> {
  const result = F_.foldr(f, b, fa);
  return createPurityAwareResult(result, getEffectTag(fa) as P);
}

/**
 * Purity-aware foldl combinator
 */
export function foldl<
  F extends Kind1,
  A,
  B,
  P extends EffectTag = ExtractEffect<F>
>(
  F_: Foldable<F>,
  f: (b: B, a: A) => B,
  b: B,
  fa: Apply<F, [A]>
): PurityAwareResult<B, P> {
  const result = F_.foldl(f, b, fa);
  return createPurityAwareResult(result, getEffectTag(fa) as P);
}

// ============================================================================
// Part 9: Purity-Aware Pipeline Combinators
// ============================================================================

/**
 * Purity-aware pipe combinator
 */
export function pipe<
  A,
  B,
  C,
  P1 extends EffectTag,
  P2 extends EffectTag
>(
  f: (a: A) => PurityAwareResult<B, P1>,
  g: (b: B) => PurityAwareResult<C, P2>
): (a: A) => PurityAwareResult<C, CombineEffects<P1, P2>> {
  return (a: A) => {
    const result1 = f(a);
    const result2 = g(extractValue(result1));
    const combinedEffect = combineEffects(
      extractEffect(result1),
      extractEffect(result2)
    );
    return createPurityAwareResult(extractValue(result2), combinedEffect);
  };
}

/**
 * Purity-aware compose combinator
 */
export function compose<
  A,
  B,
  C,
  P1 extends EffectTag,
  P2 extends EffectTag
>(
  g: (b: B) => PurityAwareResult<C, P2>,
  f: (a: A) => PurityAwareResult<B, P1>
): (a: A) => PurityAwareResult<C, CombineEffects<P1, P2>> {
  return pipe(f, g);
}

/**
 * Purity-aware flow combinator
 */
export function flow<
  Args extends any[],
  P extends EffectTag[]
>(
  ...fns: Array<(arg: any) => PurityAwareResult<any, any>>
): (...args: Args) => PurityAwareResult<any, CombineEffectsArray<P>> {
  return (...args: Args) => {
    let result = fns[0](...args);
    for (let i = 1; i < fns.length; i++) {
      result = fns[i](extractValue(result));
    }
    return result as PurityAwareResult<any, CombineEffectsArray<P>>;
  };
}

// ============================================================================
// Part 10: Runtime Purity Debugging
// ============================================================================

/**
 * Runtime purity debugging utilities
 */
export const PurityDebug = {
  /**
   * Get runtime effect information
   */
  getEffectInfo<T, P extends EffectTag>(result: PurityAwareResult<T, P>): {
    value: T;
    effect: P;
    isPure: boolean;
    isIO: boolean;
    isAsync: boolean;
  } {
    const value = extractValue(result);
    const effect = extractEffect(result);
    
    return {
      value,
      effect,
      isPure: effect === 'Pure',
      isIO: effect === 'IO',
      isAsync: effect === 'Async'
    };
  },

  /**
   * Log purity information for debugging
   */
  logPurity<T, P extends EffectTag>(
    label: string,
    result: PurityAwareResult<T, P>
  ): void {
    const info = PurityDebug.getEffectInfo(result);
    console.log(`[PurityDebug] ${label}:`, {
      effect: info.effect,
      isPure: info.isPure,
      isIO: info.isIO,
      isAsync: info.isAsync,
      value: info.value
    });
  },

  /**
   * Assert purity at runtime (for debugging only)
   */
  assertPurity<T, P extends EffectTag>(
    expected: EffectTag,
    result: PurityAwareResult<T, P>
  ): void {
    const actual = extractEffect(result);
    if (actual !== expected) {
      console.warn(`[PurityDebug] Expected ${expected} but got ${actual}`);
    }
  }
};

// ============================================================================
// Part 11: Utility Functions
// ============================================================================

/**
 * Combine effects at runtime
 */
export function combineEffects<A extends EffectTag, B extends EffectTag>(
  a: A,
  b: B
): CombineEffects<A, B> {
  if (a === 'Pure') return b as CombineEffects<A, B>;
  if (b === 'Pure') return a as CombineEffects<A, B>;
  if (a === b) return a as CombineEffects<A, B>;
  return `${a}|${b}` as CombineEffects<A, B>;
}

/**
 * Check if a value has purity information
 */
export function hasPurityInfo<T>(value: T): value is T & { __effect?: EffectTag } {
  return value && typeof value === 'object' && '__effect' in value;
}

/**
 * Strip purity information from a value
 */
export function stripPurityInfo<T>(value: T & { __effect?: EffectTag }): T {
  const { __effect, ...stripped } = value as any;
  return stripped as T;
}

/**
 * Add purity information to a value
 */
export function addPurityInfo<T, P extends EffectTag>(
  value: T,
  effect: P
): PurityAwareResult<T, P> {
  return createPurityAwareResult(value, effect);
}

// ============================================================================
// Part 12: Laws and Properties
// ============================================================================

/**
 * Purity-Aware FP Combinators Laws:
 * 
 * 1. Purity Propagation Law: If any input is impure, the result is impure
 * 2. Pure Preservation Law: Pure inputs produce pure outputs
 * 3. Effect Combination Law: Multiple effects are combined correctly
 * 4. Identity Law: Identity operations preserve purity
 * 5. Composition Law: Composed operations preserve purity information
 * 
 * Runtime Laws:
 * 
 * 1. Debugging Law: Runtime purity information is available for debugging
 * 2. Performance Law: Purity tracking has minimal runtime overhead
 * 3. Compatibility Law: Purity-aware combinators are drop-in compatible
 * 4. Inference Law: Purity is inferred automatically when possible
 * 
 * Type-Level Laws:
 * 
 * 1. Type Safety Law: All operations maintain type safety
 * 2. Effect Inference Law: Effects are correctly inferred at compile-time
 * 3. Combination Law: Effect combinations are type-safe
 * 4. Propagation Law: Purity propagates correctly through type system
 */ 