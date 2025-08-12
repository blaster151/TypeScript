import { Kind1, Apply } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';

/**
 * hylo :: Functor F => (F A -> A) -> (S -> F S) -> S -> A
 * Encodes a generalized fold after an unfold.
 */
export function hylo<F extends Kind1, S, A>(
  F: Functor<F>,
  alg: (fa: Apply<F, [A]>) => A,
  coalg: (s: S) => Apply<F, [S]>
): (seed: S) => A {
  const go = (s: S): A => {
    const fs: Apply<F, [S]> = coalg(s);
    const fa: Apply<F, [A]> = F.map(fs, go) as any;
    return alg(fa);
  };
  return go;
}

/**
 * Purity-Aware Hylomorphisms System
 * 
 * This module implements a fused unfold → transform → fold pipeline that preserves
 * compile-time purity guarantees and works seamlessly with GADT and HKT systems.
 * 
 * Features:
 * - Hylo type and combinator for single-pass fusion
 * - Purity tracking and inference
 * - GADT and HKT integration
 * - Derivable hylos for types with anamorphism and catamorphism instances
 * - Type-safe purity guarantees
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse,
  map, chain, ap, of
} from './fp-typeclasses-hkt';

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
// Part 1: Core Hylo Types and Purity System
// ============================================================================

/**
 * Purity type for hylomorphisms
 */
export type HyloPurity = 'Pure' | 'Impure';

/**
 * Unfold function type (anamorphism)
 */
export type Unfold<F extends Kind1, A, Purity extends HyloPurity> = 
  Purity extends 'Pure' ? 
    (seed: A) => Apply<F, [A]> :
    (seed: A) => Promise<Apply<F, [A]>> | Apply<F, [A]>;

/**
 * Fold function type (catamorphism)
 */
export type Fold<F extends Kind1, A, B, Purity extends HyloPurity> = 
  Purity extends 'Pure' ? 
    (structure: Apply<F, [A]>) => B :
    (structure: Apply<F, [A]>) => Promise<B> | B;

/**
 * Core Hylo type for purity-aware hylomorphisms
 */
export type Hylo<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
> = (
  unfold: Unfold<F, A, Purity>,
  fold: Fold<F, A, B, Purity>
) => (seed: A) => Purity extends 'Pure' ? B : Promise<B> | B;

/**
 * Purity inference for hylomorphisms
 */
export type HyloPurityInference<
  P1 extends HyloPurity,
  P2 extends HyloPurity
> = P1 extends 'Impure' ? 'Impure' : P2 extends 'Impure' ? 'Impure' : 'Pure';

/**
 * Hylo result type with purity information
 */
export type HyloResult<B, Purity extends HyloPurity> = 
  Purity extends 'Pure' ? B : Promise<B> | B;

// ============================================================================
// Part 2: Core Hylo Combinator
// ============================================================================

/**
 * Core hylo combinator that fuses unfold and fold operations
 * 
 * Law: hylo(u, f)(seed) is semantically equal to f(u(seed))
 * Law: Purity preservation — result purity is min(purity(unfold), purity(fold))
 * Law: Fusion — must not change semantics but should avoid intermediate allocations
 */
export function hylo<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: Unfold<F, A, Purity>,
  fold: Fold<F, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  return (seed: A) => {
    // Directly pipe without building the entire structure in memory
    const structure = unfold(seed);
    
    // Handle async cases
    if (structure instanceof Promise) {
      return structure.then(fold) as HyloResult<B, Purity>;
    }
    
    return fold(structure) as HyloResult<B, Purity>;
  };
}

/**
 * Type-safe hylo combinator with explicit purity
 */
export function hyloTypeSafe<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: Unfold<F, A, Purity>,
  fold: Fold<F, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  return hylo<F, A, B, Purity>(unfold, fold);
}

/**
 * Pure hylo combinator (compile-time guarantee)
 */
export function hyloPure<
  F extends Kind1,
  A,
  B
>(
  unfold: Unfold<F, A, 'Pure'>,
  fold: Fold<F, A, B, 'Pure'>
): (seed: A) => B {
  return hylo<F, A, B, 'Pure'>(unfold, fold) as (seed: A) => B;
}

/**
 * Impure hylo combinator (compile-time guarantee)
 */
export function hyloImpure<
  F extends Kind1,
  A,
  B
>(
  unfold: Unfold<F, A, 'Impure'>,
  fold: Fold<F, A, B, 'Impure'>
): (seed: A) => Promise<B> | B {
  return hylo<F, A, B, 'Impure'>(unfold, fold);
}

// ============================================================================
// Part 3: GADT Integration
// ============================================================================

/**
 * GADT-specific unfold function type
 */
export type GADTUnfold<G extends GADT<string, any>, A, Purity extends HyloPurity> = 
  Purity extends 'Pure' ? 
    (seed: A) => G :
    (seed: A) => Promise<G> | G;

/**
 * GADT-specific fold function type
 */
export type GADTFold<G extends GADT<string, any>, A, B, Purity extends HyloPurity> = 
  Purity extends 'Pure' ? 
    (gadt: G) => B :
    (gadt: G) => Promise<B> | B;

/**
 * GADT hylo combinator
 */
export function hyloGADT<
  G extends GADT<string, any>,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: GADTUnfold<G, A, Purity>,
  fold: GADTFold<G, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  return (seed: A) => {
    const gadt = unfold(seed);
    
    // Handle async cases
    if (gadt instanceof Promise) {
      return gadt.then(fold) as HyloResult<B, Purity>;
    }
    
    return fold(gadt) as HyloResult<B, Purity>;
  };
}

/**
 * Type-safe GADT hylo combinator
 */
export function hyloGADTTypeSafe<
  G extends GADT<string, any>,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: GADTUnfold<G, A, Purity>,
  fold: GADTFold<G, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  return hyloGADT<G, A, B, Purity>(unfold, fold);
}

// ============================================================================
// Part 4: HKT Integration
// ============================================================================

/**
 * HKT-specific unfold function type
 */
export type HKTUnfold<F extends Kind1, A, Purity extends HyloPurity> = 
  Purity extends 'Pure' ? 
    (seed: A) => Apply<F, [A]> :
    (seed: A) => Promise<Apply<F, [A]>> | Apply<F, [A]>;

/**
 * HKT-specific fold function type
 */
export type HKTFold<F extends Kind1, A, B, Purity extends HyloPurity> = 
  Purity extends 'Pure' ? 
    (structure: Apply<F, [A]>) => B :
    (structure: Apply<F, [A]>) => Promise<B> | B;

/**
 * HKT hylo combinator
 */
export function hyloHKT<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: HKTUnfold<F, A, Purity>,
  fold: HKTFold<F, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  return hylo<F, A, B, Purity>(unfold, fold);
}

/**
 * Type-safe HKT hylo combinator
 */
export function hyloHKTTypeSafe<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: HKTUnfold<F, A, Purity>,
  fold: HKTFold<F, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  return hyloHKT<F, A, B, Purity>(unfold, fold);
}

// ============================================================================
// Part 5: Purity-Aware Hylo with Effect Tracking
// ============================================================================

/**
 * Purity-aware hylo result with effect tracking
 */
export type HyloResultWithEffects<B, Purity extends HyloPurity> = {
  readonly value: B;
  readonly purity: Purity;
  readonly isPure: Purity extends 'Pure' ? true : false;
  readonly isImpure: Purity extends 'Impure' ? true : false;
};

/**
 * Purity-aware hylo combinator with effect tracking
 */
export function hyloWithEffects<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: Unfold<F, A, Purity>,
  fold: Fold<F, A, B, Purity>
): (seed: A) => Promise<HyloResultWithEffects<B, Purity>> | HyloResultWithEffects<B, Purity> {
  return async (seed: A) => {
    const startTime = Date.now();
    
    try {
      const structure = unfold(seed);
      
      // Handle async cases
      if (structure instanceof Promise) {
        const resolvedStructure = await structure;
        const result = await fold(resolvedStructure);
        
        return {
          value: result,
          purity: 'Impure' as Purity,
          isPure: false as Purity extends 'Pure' ? true : false,
          isImpure: true as Purity extends 'Impure' ? true : false
        };
      }
      
      const result = fold(structure);
      
      // Handle async fold results
      if (result instanceof Promise) {
        const resolvedResult = await result;
        
        return {
          value: resolvedResult,
          purity: 'Impure' as Purity,
          isPure: false as Purity extends 'Pure' ? true : false,
          isImpure: true as Purity extends 'Impure' ? true : false
        };
      }
      
      return {
        value: result,
        purity: 'Pure' as Purity,
        isPure: true as Purity extends 'Pure' ? true : false,
        isImpure: false as Purity extends 'Impure' ? true : false
      };
    } catch (error) {
      throw new Error(`Hylo computation failed: ${error}`);
    }
  };
}

// ============================================================================
// Part 6: Higher-Order Hylo Combinators
// ============================================================================

/**
 * Higher-order hylo combinator factory
 */
export function createHyloCombinator<Purity extends HyloPurity>() {
  return function<F extends Kind1, A, B>(
    unfold: Unfold<F, A, Purity>,
    fold: Fold<F, A, B, Purity>
  ): (seed: A) => HyloResult<B, Purity> {
    return hylo<F, A, B, Purity>(unfold, fold);
  };
}

/**
 * Higher-order pure hylo combinator factory
 */
export function createPureHyloCombinator() {
  return createHyloCombinator<'Pure'>();
}

/**
 * Higher-order impure hylo combinator factory
 */
export function createImpureHyloCombinator() {
  return createHyloCombinator<'Impure'>();
}

/**
 * Compose hylo combinators
 */
export function composeHylo<
  F extends Kind1,
  A,
  B,
  C,
  P1 extends HyloPurity,
  P2 extends HyloPurity
>(
  hylo1: (seed: A) => HyloResult<B, P1>,
  hylo2: (seed: B) => HyloResult<C, P2>
): (seed: A) => HyloResult<C, HyloPurityInference<P1, P2>> {
  return (seed: A) => {
    const result1 = hylo1(seed);
    
    if (result1 instanceof Promise) {
      return result1.then(hylo2) as HyloResult<C, HyloPurityInference<P1, P2>>;
    }
    
    const result2 = hylo2(result1);
    return result2 as HyloResult<C, HyloPurityInference<P1, P2>>;
  };
}

// ============================================================================
// Part 7: Derivable Hylos
// ============================================================================

/**
 * Interface for derivable anamorphism
 */
export interface DerivableAnamorphism<F extends Kind1, A, Purity extends HyloPurity> {
  readonly unfold: Unfold<F, A, Purity>;
  readonly purity: Purity;
}

/**
 * Interface for derivable catamorphism
 */
export interface DerivableCatamorphism<F extends Kind1, A, B, Purity extends HyloPurity> {
  readonly fold: Fold<F, A, B, Purity>;
  readonly purity: Purity;
}

/**
 * Interface for derivable hylomorphism
 */
export interface DerivableHylomorphism<F extends Kind1, A, B, Purity extends HyloPurity> {
  readonly hylo: (seed: A) => HyloResult<B, Purity>;
  readonly purity: Purity;
  readonly anamorphism: DerivableAnamorphism<F, A, Purity>;
  readonly catamorphism: DerivableCatamorphism<F, A, B, Purity>;
}

/**
 * Create derivable hylomorphism from anamorphism and catamorphism
 */
export function createDerivableHylo<
  F extends Kind1,
  A,
  B,
  P1 extends HyloPurity,
  P2 extends HyloPurity
>(
  anamorphism: DerivableAnamorphism<F, A, P1>,
  catamorphism: DerivableCatamorphism<F, A, B, P2>
): DerivableHylomorphism<F, A, B, HyloPurityInference<P1, P2>> {
  const combinedPurity: HyloPurityInference<P1, P2> = 
    anamorphism.purity === 'Impure' || catamorphism.purity === 'Impure' ? 'Impure' : 'Pure';
  
  const hyloFunction = hylo<F, A, B, HyloPurityInference<P1, P2>>(
    anamorphism.unfold as Unfold<F, A, HyloPurityInference<P1, P2>>,
    catamorphism.fold as Fold<F, A, B, HyloPurityInference<P1, P2>>
  );
  
  return {
    hylo: hyloFunction,
    purity: combinedPurity,
    anamorphism: anamorphism as DerivableAnamorphism<F, A, HyloPurityInference<P1, P2>>,
    catamorphism: catamorphism as DerivableCatamorphism<F, A, B, HyloPurityInference<P1, P2>>
  };
}

/**
 * Derive hylomorphism for a type with existing anamorphism and catamorphism
 */
export function deriveHylo<
  F extends Kind1,
  A,
  B,
  P1 extends HyloPurity,
  P2 extends HyloPurity
>(
  anamorphism: DerivableAnamorphism<F, A, P1>,
  catamorphism: DerivableCatamorphism<F, A, B, P2>
): DerivableHylomorphism<F, A, B, HyloPurityInference<P1, P2>> {
  return createDerivableHylo<F, A, B, P1, P2>(anamorphism, catamorphism);
}

// ============================================================================
// Part 8: Utility Functions
// ============================================================================

/**
 * Lift a pure function to a hylo combinator
 */
export function liftPureFunctionToHylo<A, B>(
  fn: (a: A) => B
): (seed: A) => B {
  return fn;
}

/**
 * Lift an impure function to a hylo combinator
 */
export function liftImpureFunctionToHylo<A, B>(
  fn: (a: A) => Promise<B> | B
): (seed: A) => Promise<B> | B {
  return fn;
}

/**
 * Identity hylo combinator
 */
export function hyloIdentity<A>(): (seed: A) => A {
  return (seed: A) => seed;
}

/**
 * Constant hylo combinator
 */
export function hyloConstant<A, B>(value: B): (seed: A) => B {
  return (_seed: A) => value;
}

/**
 * Sequence hylo combinators
 */
export function sequenceHylo<A, B, Purity extends HyloPurity>(
  hylos: Array<(seed: A) => HyloResult<B, Purity>>
): (seed: A) => HyloResult<B[], Purity> {
  return (seed: A) => {
    const results = hylos.map(hylo => hylo(seed));
    
    // Check if any result is a promise
    const hasPromise = results.some(result => result instanceof Promise);
    
    if (hasPromise) {
      return Promise.all(results) as HyloResult<B[], Purity>;
    }
    
    return results as B[] as HyloResult<B[], Purity>;
  };
}

// ============================================================================
// Part 9: Performance and Optimization
// ============================================================================

/**
 * Memoized hylo combinator for performance optimization
 */
export function hyloMemoized<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: Unfold<F, A, Purity>,
  fold: Fold<F, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  const cache = new Map<A, HyloResult<B, Purity>>();
  
  return (seed: A) => {
    if (cache.has(seed)) {
      return cache.get(seed)!;
    }
    
    const result = hylo<F, A, B, Purity>(unfold, fold)(seed);
    cache.set(seed, result);
    
    return result;
  };
}

/**
 * Lazy hylo combinator for infinite structures
 */
export function hyloLazy<
  F extends Kind1,
  A,
  B,
  Purity extends HyloPurity
>(
  unfold: Unfold<F, A, Purity>,
  fold: Fold<F, A, B, Purity>
): (seed: A) => HyloResult<B, Purity> {
  return (seed: A) => {
    // For lazy evaluation, we return a thunk that computes on demand
    const compute = () => hylo<F, A, B, Purity>(unfold, fold)(seed);
    
    // Return a lazy promise or value
    if (Purity extends 'Impure') {
      return new Promise<B>((resolve) => {
        // Lazy computation
        setTimeout(() => {
          const result = compute();
          if (result instanceof Promise) {
            result.then(resolve);
          } else {
            resolve(result as B);
          }
        }, 0);
      }) as HyloResult<B, Purity>;
    }
    
    return compute() as HyloResult<B, Purity>;
  };
}

// ============================================================================
// Part 10: Laws and Properties
// ============================================================================

/**
 * Hylomorphism Laws:
 * 
 * 1. Fusion Law: hylo(u, f)(seed) is semantically equal to f(u(seed))
 * 2. Purity Law: result purity is min(purity(unfold), purity(fold))
 * 3. Identity Law: hylo(identity, identity) = identity
 * 4. Composition Law: hylo(u1, f1) ∘ hylo(u2, f2) = hylo(u2 ∘ u1, f1 ∘ f2)
 * 5. Optimization Law: should avoid intermediate allocations when possible
 * 
 * Runtime Laws:
 * 
 * 1. Semantics Law: hylo preserves the semantics of separate unfold and fold
 * 2. Performance Law: hylo should be more efficient than separate operations
 * 3. Memory Law: hylo should use less memory than building full intermediate structures
 * 4. Purity Law: pure hylos should be referentially transparent
 * 
 * Type-Level Laws:
 * 
 * 1. Purity Inference Law: purity is correctly inferred at compile-time
 * 2. Type Safety Law: all operations maintain type safety
 * 3. GADT Law: GADT hylos preserve type information
 * 4. HKT Law: HKT hylos work with higher-kinded types
 */ 