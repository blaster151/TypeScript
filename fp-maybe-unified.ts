/**
 * Unified Maybe ADT using createSumType
 * 
 * This module provides a unified Maybe/Option type using the createSumType builder
 * with full integration with HKTs, purity tracking, and derivable instances.
 */

import {
  createSumType,
  SumTypeBuilder,
  ExtractSumTypeHKT,
  ExtractSumTypeInstance
} from './fp-adt-builders';

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, TupleK, FunctionK
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

// ============================================================================
// Part 1: Unified Maybe ADT Definition
// ============================================================================

/**
 * Create unified Maybe ADT with full integration
 */
export const MaybeUnified = createSumType({
  Just: <A>(value: A) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false
});

/**
 * Extract the HKT kind from the unified Maybe
 */
export type MaybeUnifiedHKT = ExtractSumTypeHKT<typeof MaybeUnified>;

/**
 * Extract the instance type from the unified Maybe
 */
export type MaybeUnifiedInstance<A> = ExtractSumTypeInstance<typeof MaybeUnified>;

/**
 * Type alias for Maybe<A> using the unified definition
 */
export type Maybe<A> = MaybeUnifiedInstance<A>;

/**
 * HKT kind for Maybe (arity-1 type constructor)
 */
export interface MaybeK extends Kind1 {
  readonly type: Maybe<this['A']>;
}

// ============================================================================
// Part 2: Constructor Exports
// ============================================================================

/**
 * Just constructor for Maybe
 */
export const Just = <A>(value: A): Maybe<A> => {
  return MaybeUnified.constructors.Just(value) as Maybe<A>;
};

/**
 * Nothing constructor for Maybe
 */
export const Nothing = <A>(): Maybe<A> => {
  return MaybeUnified.constructors.Nothing() as Maybe<A>;
};

/**
 * Pattern matcher for Maybe
 */
export const matchMaybe = <A, R>(
  maybe: Maybe<A>,
  patterns: {
    Just: (value: A) => R;
    Nothing: () => R;
  }
): R => {
  return MaybeUnified.match(maybe as any, patterns);
};

/**
 * Curryable pattern matcher for Maybe
 */
export const createMaybeMatcher = <R>(
  patterns: {
    Just: <A>(value: A) => R;
    Nothing: () => R;
  }
) => (maybe: Maybe<any>): R => {
  return MaybeUnified.match(maybe as any, patterns);
};

// ============================================================================
// Part 3: Utility Functions
// ============================================================================

/**
 * Check if a Maybe is Just
 */
export const isJust = <A>(maybe: Maybe<A>): maybe is Maybe<A> & { tag: 'Just'; value: A } => {
  return MaybeUnified.isVariant(maybe as any, 'Just');
};

/**
 * Check if a Maybe is Nothing
 */
export const isNothing = <A>(maybe: Maybe<A>): maybe is Maybe<A> & { tag: 'Nothing' } => {
  return MaybeUnified.isVariant(maybe as any, 'Nothing');
};

/**
 * Get the value from a Just, or throw if Nothing
 */
export const fromJust = <A>(maybe: Maybe<A>): A => {
  return matchMaybe(maybe, {
    Just: value => value,
    Nothing: () => {
      throw new Error('fromJust: Nothing');
    }
  });
};

/**
 * Get the value from a Just, or return default if Nothing
 */
export const fromMaybe = <A>(defaultValue: A, maybe: Maybe<A>): A => {
  return matchMaybe(maybe, {
    Just: value => value,
    Nothing: () => defaultValue
  });
};

/**
 * Map over a Maybe
 */
export const mapMaybe = <A, B>(f: (a: A) => B, maybe: Maybe<A>): Maybe<B> => {
  return matchMaybe(maybe, {
    Just: value => Just(f(value)),
    Nothing: () => Nothing()
  });
};

/**
 * Apply a function in a Maybe to a value in a Maybe
 */
export const apMaybe = <A, B>(maybeF: Maybe<(a: A) => B>, maybeA: Maybe<A>): Maybe<B> => {
  return matchMaybe(maybeF, {
    Just: f => mapMaybe(f, maybeA),
    Nothing: () => Nothing()
  });
};

/**
 * Chain operations on Maybe
 */
export const chainMaybe = <A, B>(f: (a: A) => Maybe<B>, maybe: Maybe<A>): Maybe<B> => {
  return matchMaybe(maybe, {
    Just: value => f(value),
    Nothing: () => Nothing()
  });
};

/**
 * Fold over a Maybe
 */
export const foldMaybe = <A, B>(onJust: (a: A) => B, onNothing: () => B, maybe: Maybe<A>): B => {
  return matchMaybe(maybe, {
    Just: value => onJust(value),
    Nothing: () => onNothing()
  });
};

// ============================================================================
// Part 4: Typeclass Instances
// ============================================================================

/**
 * Functor instance for Maybe
 */
export const MaybeFunctor: Functor<MaybeK> = {
  map: mapMaybe
};

/**
 * Applicative instance for Maybe
 */
export const MaybeApplicative: Applicative<MaybeK> = {
  ...MaybeFunctor,
  of: Just,
  ap: apMaybe
};

/**
 * Monad instance for Maybe
 */
export const MaybeMonad: Monad<MaybeK> = {
  ...MaybeApplicative,
  chain: chainMaybe
};

/**
 * Foldable instance for Maybe
 */
export const MaybeFoldable: Foldable<MaybeK> = {
  reduce: <A, B>(maybe: Maybe<A>, f: (b: B, a: A) => B, b: B): B => {
    return matchMaybe(maybe, {
      Just: value => f(b, value),
      Nothing: () => b
    });
  },
  foldMap: <M, A>(M: any, maybe: Maybe<A>, f: (a: A) => M): M => {
    return matchMaybe(maybe, {
      Just: value => f(value),
      Nothing: () => M.empty()
    });
  }
};

/**
 * Traversable instance for Maybe
 */
export const MaybeTraversable: Traversable<MaybeK> = {
  ...MaybeFunctor,
  sequence: <A>(maybeArray: Maybe<A[]>): A[] => {
    return matchMaybe(maybeArray, {
      Just: value => value,
      Nothing: () => []
    });
  },
  traverse: <F extends Kind1, A, B>(
    F: Applicative<F>,
    maybe: Maybe<A>,
    f: (a: A) => Apply<F, [B]>
  ): Apply<F, [Maybe<B>]> => {
    return matchMaybe(maybe, {
      Just: value => F.map(f(value), Just),
      Nothing: () => F.of(Nothing())
    }) as Apply<F, [Maybe<B>]>;
  }
};

// ============================================================================
// Part 5: Purity Integration
// ============================================================================

/**
 * Maybe with purity information
 */
export interface MaybeWithPurity<A, P extends EffectTag = 'Pure'> {
  readonly value: Maybe<A>;
  readonly effect: P;
  readonly __immutableBrand: unique symbol;
}

/**
 * Create Maybe with purity information
 */
export function createMaybeWithPurity<A, P extends EffectTag = 'Pure'>(
  value: Maybe<A>,
  effect: P = 'Pure' as P
): MaybeWithPurity<A, P> {
  return {
    value,
    effect,
    __immutableBrand: {} as unique symbol
  };
}

/**
 * Extract effect from Maybe with purity
 */
export type EffectOfMaybe<T> = T extends MaybeWithPurity<any, infer P> ? P : 'Pure';

/**
 * Check if Maybe is pure
 */
export type IsMaybePure<T> = EffectOfMaybe<T> extends 'Pure' ? true : false;

// ============================================================================
// Part 6: HKT Integration
// ============================================================================

/**
 * Apply Maybe HKT to type arguments
 */
export type ApplyMaybe<Args extends TypeArgs> = Apply<MaybeK, Args>;

/**
 * Maybe with specific type arguments
 */
export type MaybeOf<A> = ApplyMaybe<[A]>;

// ============================================================================
// Part 7: Laws Documentation
// ============================================================================

/**
 * Maybe Laws:
 * 
 * Functor Laws:
 * 1. Identity: map(id) = id
 * 2. Composition: map(f ∘ g) = map(f) ∘ map(g)
 * 
 * Applicative Laws:
 * 1. Identity: ap(of(id), v) = v
 * 2. Homomorphism: ap(of(f), of(x)) = of(f(x))
 * 3. Interchange: ap(u, of(y)) = ap(of(f => f(y)), u)
 * 4. Composition: ap(ap(ap(of(compose), u), v), w) = ap(u, ap(v, w))
 * 
 * Monad Laws:
 * 1. Left Identity: of(a).chain(f) = f(a)
 * 2. Right Identity: m.chain(of) = m
 * 3. Associativity: m.chain(f).chain(g) = m.chain(x => f(x).chain(g))
 * 
 * Purity Laws:
 * 1. Effect Consistency: Maybe defaults to Pure effect
 * 2. Runtime Marker Law: Runtime markers match compile-time effects
 * 3. Default Purity: Maybe types default to Pure unless explicitly configured
 * 
 * HKT Integration Laws:
 * 1. Kind Correctness: MaybeK is correctly typed as Kind1
 * 2. Apply Law: Apply<MaybeK, [A]> works correctly
 * 3. Typeclass Law: typeclasses work with MaybeK
 */ 