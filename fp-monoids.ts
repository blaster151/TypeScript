/**
 * Monoid Typeclass System with HKT + Purity Integration
 * 
 * This module provides a comprehensive Monoid typeclass system with common
 * built-in monoids for numbers, booleans, strings, and arrays, ensuring
 * seamless integration with the HKT and purity tracking systems.
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe, Either, List, Reader, Writer, State
} from './fp-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

// ============================================================================
// Part 1: Monoid Typeclass Definition
// ============================================================================

/**
 * Monoid typeclass - provides empty value and associative binary operation
 * A monoid is a semigroup with an identity element
 */
export interface Monoid<A> {
  readonly empty: A;
  readonly concat: (a: A, b: A) => A;
}

/**
 * Monoid with HKT support for higher-order contexts
 */
export interface MonoidK<F extends Kind1> {
  readonly empty: Apply<F, [any]>;
  readonly concat: <A>(a: Apply<F, [A]>, b: Apply<F, [A]>) => Apply<F, [A]>;
}

/**
 * Monoid with purity tracking
 */
export interface MonoidWithEffect<A, E extends EffectTag = 'Pure'> extends Monoid<A> {
  readonly __effect: E;
}

// ============================================================================
// Part 2: Common Built-in Monoids
// ============================================================================

/**
 * Sum Monoid for numbers
 * empty: 0, concat: addition
 */
export const SumMonoid: MonoidWithEffect<number, 'Pure'> = {
  empty: 0,
  concat: (a: number, b: number) => a + b,
  __effect: 'Pure'
};

/**
 * Product Monoid for numbers
 * empty: 1, concat: multiplication
 */
export const ProductMonoid: MonoidWithEffect<number, 'Pure'> = {
  empty: 1,
  concat: (a: number, b: number) => a * b,
  __effect: 'Pure'
};

/**
 * Any Monoid for booleans (OR operation)
 * empty: false, concat: logical OR
 */
export const AnyMonoid: MonoidWithEffect<boolean, 'Pure'> = {
  empty: false,
  concat: (a: boolean, b: boolean) => a || b,
  __effect: 'Pure'
};

/**
 * All Monoid for booleans (AND operation)
 * empty: true, concat: logical AND
 */
export const AllMonoid: MonoidWithEffect<boolean, 'Pure'> = {
  empty: true,
  concat: (a: boolean, b: boolean) => a && b,
  __effect: 'Pure'
};

/**
 * String Monoid for string concatenation
 * empty: "", concat: string concatenation
 */
export const StringMonoid: MonoidWithEffect<string, 'Pure'> = {
  empty: "",
  concat: (a: string, b: string) => a + b,
  __effect: 'Pure'
};

/**
 * Array Monoid for array concatenation
 * empty: [], concat: array concatenation
 */
export function ArrayMonoid<T>(): MonoidWithEffect<T[], 'Pure'> {
  return {
    empty: [],
    concat: (a: T[], b: T[]) => [...a, ...b],
    __effect: 'Pure'
  };
}

/**
 * Maybe Monoid - combines Maybe values using inner monoid
 */
export function MaybeMonoid<A>(innerMonoid: Monoid<A>): MonoidWithEffect<Maybe<A>, 'Pure'> {
  return {
    empty: Maybe.Just(innerMonoid.empty),
    concat: (a: Maybe<A>, b: Maybe<A>) => {
      if (a.isJust && b.isJust) {
        return Maybe.Just(innerMonoid.concat(a.value, b.value));
      } else if (a.isJust) {
        return a;
      } else if (b.isJust) {
        return b;
      } else {
        return Maybe.Nothing();
      }
    },
    __effect: 'Pure'
  };
}

/**
 * Either Monoid - combines Either values using inner monoids
 */
export function EitherMonoid<L, R>(
  leftMonoid: Monoid<L>,
  rightMonoid: Monoid<R>
): MonoidWithEffect<Either<L, R>, 'Pure'> {
  return {
    empty: Either.Right(rightMonoid.empty),
    concat: (a: Either<L, R>, b: Either<L, R>) => {
      if (a.isLeft && b.isLeft) {
        return Either.Left(leftMonoid.concat(a.value, b.value));
      } else if (a.isLeft) {
        return a;
      } else if (b.isLeft) {
        return b;
      } else {
        return Either.Right(rightMonoid.concat(a.value, b.value));
      }
    },
    __effect: 'Pure'
  };
}

// ============================================================================
// Part 3: Monoid Laws and Validation
// ============================================================================

/**
 * Monoid laws for validation
 */
export interface MonoidLaws<A> {
  readonly leftIdentity: (a: A) => boolean;
  readonly rightIdentity: (a: A) => boolean;
  readonly associativity: (a: A, b: A, c: A) => boolean;
}

/**
 * Validate monoid laws
 */
export function validateMonoidLaws<A>(monoid: Monoid<A>, testValues: A[]): MonoidLaws<A> {
  return {
    leftIdentity: (a: A) => {
      return monoid.concat(monoid.empty, a) === a;
    },
    rightIdentity: (a: A) => {
      return monoid.concat(a, monoid.empty) === a;
    },
    associativity: (a: A, b: A, c: A) => {
      const left = monoid.concat(monoid.concat(a, b), c);
      const right = monoid.concat(a, monoid.concat(b, c));
      return left === right;
    }
  };
}

/**
 * Test monoid laws with sample values
 */
export function testMonoidLaws<A>(monoid: Monoid<A>, testValues: A[]): boolean {
  const laws = validateMonoidLaws(monoid, testValues);
  
  // Test identity laws
  for (const value of testValues) {
    if (!laws.leftIdentity(value) || !laws.rightIdentity(value)) {
      return false;
    }
  }
  
  // Test associativity law
  for (let i = 0; i < testValues.length - 2; i++) {
    const a = testValues[i];
    const b = testValues[i + 1];
    const c = testValues[i + 2];
    if (!laws.associativity(a, b, c)) {
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// Part 4: Monoid Utilities
// ============================================================================

/**
 * Create a monoid from a semigroup by providing an empty value
 */
export function monoidFromSemigroup<A>(empty: A, concat: (a: A, b: A) => A): MonoidWithEffect<A, 'Pure'> {
  return {
    empty,
    concat,
    __effect: 'Pure'
  };
}

/**
 * Create a monoid that always returns the first value
 */
export function FirstMonoid<A>(): MonoidWithEffect<A, 'Pure'> {
  return {
    empty: undefined as any,
    concat: (a: A, b: A) => a,
    __effect: 'Pure'
  };
}

/**
 * Create a monoid that always returns the last value
 */
export function LastMonoid<A>(): MonoidWithEffect<A, 'Pure'> {
  return {
    empty: undefined as any,
    concat: (a: A, b: A) => b,
    __effect: 'Pure'
  };
}

/**
 * Create a monoid for min values
 */
export function MinMonoid(): MonoidWithEffect<number, 'Pure'> {
  return {
    empty: Infinity,
    concat: (a: number, b: number) => Math.min(a, b),
    __effect: 'Pure'
  };
}

/**
 * Create a monoid for max values
 */
export function MaxMonoid(): MonoidWithEffect<number, 'Pure'> {
  return {
    empty: -Infinity,
    concat: (a: number, b: number) => Math.max(a, b),
    __effect: 'Pure'
  };
}

// ============================================================================
// Part 5: HKT Integration
// ============================================================================

/**
 * MonoidK for Array
 */
export const ArrayMonoidK: MonoidK<ArrayK> = {
  empty: [] as any,
  concat: <A>(a: A[], b: A[]): A[] => [...a, ...b]
};

/**
 * MonoidK for Maybe
 */
export const MaybeMonoidK: MonoidK<MaybeK> = {
  empty: Maybe.Nothing() as any,
  concat: <A>(a: Maybe<A>, b: Maybe<A>): Maybe<A> => {
    if (a.isJust) return a;
    if (b.isJust) return b;
    return Maybe.Nothing();
  }
};

// ============================================================================
// Part 6: Purity Integration
// ============================================================================

/**
 * Extract effect tag from a monoid
 */
export type EffectOfMonoid<T> = T extends MonoidWithEffect<any, infer E> ? E : 'Pure';

/**
 * Check if a monoid is pure
 */
export type IsMonoidPure<T> = EffectOfMonoid<T> extends 'Pure' ? true : false;

/**
 * Check if a monoid is impure
 */
export type IsMonoidImpure<T> = EffectOfMonoid<T> extends 'Pure' ? false : true;

/**
 * Attach purity marker to a monoid
 */
export function attachMonoidPurityMarker<A, E extends EffectTag>(
  monoid: Monoid<A>,
  effect: E
): MonoidWithEffect<A, E> {
  return {
    ...monoid,
    __effect: effect
  };
}

/**
 * Extract purity marker from a monoid
 */
export function extractMonoidPurityMarker<A, E extends EffectTag>(
  monoid: MonoidWithEffect<A, E>
): E {
  return monoid.__effect;
}

// ============================================================================
// Part 7: Export All
// ============================================================================

export {
  // Core types
  Monoid,
  MonoidK,
  MonoidWithEffect,
  
  // Built-in monoids
  SumMonoid,
  ProductMonoid,
  AnyMonoid,
  AllMonoid,
  StringMonoid,
  ArrayMonoid,
  MaybeMonoid,
  EitherMonoid,
  
  // Law validation
  validateMonoidLaws,
  testMonoidLaws,
  
  // Utilities
  monoidFromSemigroup,
  FirstMonoid,
  LastMonoid,
  MinMonoid,
  MaxMonoid,
  
  // HKT instances
  ArrayMonoidK,
  MaybeMonoidK,
  
  // Purity utilities
  EffectOfMonoid,
  IsMonoidPure,
  IsMonoidImpure,
  attachMonoidPurityMarker,
  extractMonoidPurityMarker
}; 