/**
 * Enhanced FP Typeclass System with Higher-Order Kinds (HOKs)
 * 
 * This module provides typeclass definitions that leverage Higher-Order Kinds
 * for more powerful and flexible abstractions.
 */

import {
  Kind, Kind1, Kind2, KindAny, HigherKind, HOK1, HOK2,
  KindInput, KindOutput, IsKindCompatible, IsHigherKindCompatible,
  Apply, TypeArgs, Type
} from './fp-hkt';

// ============================================================================
// Enhanced Functor Typeclass with Higher-Order Kinds
// ============================================================================

/**
 * Enhanced Functor typeclass using Higher-Order Kinds
 * Can work with any kind that maps from one kind to another
 */
interface Functor<F extends HigherKind<KindAny, KindAny>> {
  /**
   * Maps a function over the contents of a functor
   * @param fa - The functor to map over
   * @param f - The function to apply to the contents
   * @returns A new functor with the transformed contents
   */
  map: <A, B>(
    fa: Apply<KindOutput<F>, [A]>, 
    f: (a: A) => B
  ) => Apply<KindOutput<F>, [B]>;
}

/**
 * Unary Functor - maps from Kind1 to Kind1
 */
interface Functor1<F extends HOK1<Kind1, Kind1>> extends Functor<F> {
  readonly __arity: 1;
}

/**
 * Binary Functor - maps from Kind2 to Kind2
 */
interface Functor2<F extends HOK2<Kind2, Kind2>> extends Functor<F> {
  readonly __arity: 2;
}

/**
 * Polymorphic Functor - can work with any kind
 */
type AnyFunctor = Functor<HigherKind<KindAny, KindAny>>;

// ============================================================================
// Enhanced Applicative Typeclass with Higher-Order Kinds
// ============================================================================

/**
 * Enhanced Applicative typeclass using Higher-Order Kinds
 */
interface Applicative<F extends HigherKind<Kind1, Kind1>> extends Functor<F> {
  /**
   * Lifts a value into the applicative context
   * @param a - The value to lift
   * @returns The value wrapped in the applicative context
   */
  of: <A>(a: A) => Apply<KindOutput<F>, [A]>;
  
  /**
   * Applies a function in context to a value in context
   * @param fab - The function in context
   * @param fa - The value in context
   * @returns The result of applying the function to the value, in context
   */
  ap: <A, B>(
    fab: Apply<KindOutput<F>, [(a: A) => B]>, 
    fa: Apply<KindOutput<F>, [A]>
  ) => Apply<KindOutput<F>, [B]>;
}

// ============================================================================
// Enhanced Monad Typeclass with Higher-Order Kinds
// ============================================================================

/**
 * Enhanced Monad typeclass using Higher-Order Kinds
 */
interface Monad<F extends HigherKind<Kind1, Kind1>> extends Applicative<F> {
  /**
   * Chains computations in the monadic context
   * @param fa - The monadic value to chain from
   * @param f - The function that produces a new monadic value
   * @returns The result of chaining the computations
   */
  chain: <A, B>(
    fa: Apply<KindOutput<F>, [A]>, 
    f: (a: A) => Apply<KindOutput<F>, [B]>
  ) => Apply<KindOutput<F>, [B]>;
}

// ============================================================================
// Enhanced Bifunctor Typeclass with Higher-Order Kinds
// ============================================================================

/**
 * Enhanced Bifunctor typeclass using Higher-Order Kinds
 */
interface Bifunctor<F extends HigherKind<Kind2, Kind2>> {
  /**
   * Maps functions over both type parameters of a bifunctor
   * @param fab - The bifunctor to map over
   * @param f - The function to apply to the first type parameter
   * @param g - The function to apply to the second type parameter
   * @returns A new bifunctor with transformed type parameters
   */
  bimap: <A, B, C, D>(
    fab: Apply<KindOutput<F>, [A, B]>,
    f: (a: A) => C,
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [C, D]>;
  
  /**
   * Maps a function over the first type parameter only
   * @param fab - The bifunctor to map over
   * @param f - The function to apply to the first type parameter
   * @returns A new bifunctor with the first type parameter transformed
   */
  lmap: <A, B, C>(
    fab: Apply<KindOutput<F>, [A, B]>, 
    f: (a: A) => C
  ) => Apply<KindOutput<F>, [C, B]>;
  
  /**
   * Maps a function over the second type parameter only
   * @param fab - The bifunctor to map over
   * @param g - The function to apply to the second type parameter
   * @returns A new bifunctor with the second type parameter transformed
   */
  rmap: <A, B, D>(
    fab: Apply<KindOutput<F>, [A, B]>, 
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [A, D]>;
}

// ============================================================================
// Enhanced Profunctor Typeclass with Higher-Order Kinds
// ============================================================================

/**
 * Enhanced Profunctor typeclass using Higher-Order Kinds
 */
interface Profunctor<F extends HigherKind<Kind2, Kind2>> {
  /**
   * Maps functions over both type parameters of a profunctor
   * @param p - The profunctor to map over
   * @param f - The contravariant function for the first type parameter
   * @param g - The covariant function for the second type parameter
   * @returns A new profunctor with transformed type parameters
   */
  dimap: <A, B, C, D>(
    p: Apply<KindOutput<F>, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [C, D]>;
  
  /**
   * Maps a contravariant function over the first type parameter only
   * @param p - The profunctor to map over
   * @param f - The contravariant function to apply to the first type parameter
   * @returns A new profunctor with the first type parameter transformed
   */
  lmap: <A, B, C>(
    p: Apply<KindOutput<F>, [A, B]>, 
    f: (c: C) => A
  ) => Apply<KindOutput<F>, [C, B]>;
  
  /**
   * Maps a covariant function over the second type parameter only
   * @param p - The profunctor to map over
   * @param g - The covariant function to apply to the second type parameter
   * @returns A new profunctor with the second type parameter transformed
   */
  rmap: <A, B, D>(
    p: Apply<KindOutput<F>, [A, B]>, 
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [A, D]>;
}

// ============================================================================
// Enhanced Traversable Typeclass with Higher-Order Kinds
// ============================================================================

/**
 * Enhanced Traversable typeclass using Higher-Order Kinds
 */
interface Traversable<F extends HigherKind<Kind1, Kind1>, G extends HigherKind<Kind1, Kind1>> {
  /**
   * Traverses a structure with an applicative functor
   * @param fa - The traversable structure
   * @param f - The function to apply to each element
   * @returns The result of traversing the structure
   */
  traverse: <A, B>(
    fa: Apply<KindOutput<F>, [A]>,
    f: (a: A) => Apply<KindOutput<G>, [B]>
  ) => Apply<KindOutput<G>, [Apply<KindOutput<F>, [B]>]>;
  
  /**
   * Sequences a structure of applicative functors
   * @param fga - The structure of applicative functors
   * @returns The applicative functor of a structure
   */
  sequence: <A>(
    fga: Apply<KindOutput<F>, [Apply<KindOutput<G>, [A]>]>
  ) => Apply<KindOutput<G>, [Apply<KindOutput<F>, [A]>]>;
}

// ============================================================================
// Enhanced Foldable Typeclass with Higher-Order Kinds
// ============================================================================

/**
 * Enhanced Foldable typeclass using Higher-Order Kinds
 */
interface Foldable<F extends HigherKind<Kind1, Kind1>> {
  /**
   * Folds a structure from left to right
   * @param fa - The foldable structure
   * @param reducer - The reducer function
   * @param initial - The initial value
   * @returns The result of folding the structure
   */
  foldl: <A, B>(
    fa: Apply<KindOutput<F>, [A]>,
    reducer: (acc: B, a: A) => B,
    initial: B
  ) => B;
  
  /**
   * Folds a structure from right to left
   * @param fa - The foldable structure
   * @param reducer - The reducer function
   * @param initial - The initial value
   * @returns The result of folding the structure
   */
  foldr: <A, B>(
    fa: Apply<KindOutput<F>, [A]>,
    reducer: (a: A, acc: B) => B,
    initial: B
  ) => B;
}

// ============================================================================
// Type-Level Utilities for Higher-Order Kinds
// ============================================================================

/**
 * Check if a type is a Functor
 */
type IsFunctor<F extends HigherKind<KindAny, KindAny>> = 
  F extends Functor<F> ? true : false;

/**
 * Check if a type is an Applicative
 */
type IsApplicative<F extends HigherKind<Kind1, Kind1>> = 
  F extends Applicative<F> ? true : false;

/**
 * Check if a type is a Monad
 */
type IsMonad<F extends HigherKind<Kind1, Kind1>> = 
  F extends Monad<F> ? true : false;

/**
 * Check if a type is a Bifunctor
 */
type IsBifunctor<F extends HigherKind<Kind2, Kind2>> = 
  F extends Bifunctor<F> ? true : false;

/**
 * Check if a type is a Profunctor
 */
type IsProfunctor<F extends HigherKind<Kind2, Kind2>> = 
  F extends Profunctor<F> ? true : false;

/**
 * Check if a type is Traversable
 */
type IsTraversable<F extends HigherKind<Kind1, Kind1>, G extends HigherKind<Kind1, Kind1>> = 
  F extends Traversable<F, G> ? true : false;

/**
 * Check if a type is Foldable
 */
type IsFoldable<F extends HigherKind<Kind1, Kind1>> = 
  F extends Foldable<F> ? true : false;

// ============================================================================
// Higher-Order Kind Composition Utilities
// ============================================================================

/**
 * Compose two Higher-Order Kinds
 */
type ComposeHOK<F extends HigherKind<KindAny, KindAny>, G extends HigherKind<KindAny, KindAny>> = 
  F extends HigherKind<infer InF, infer OutF>
    ? G extends HigherKind<infer InG, infer OutG>
      ? IsKindCompatible<OutF, InG> extends true
        ? HigherKind<InF, OutG>
        : never
      : never
    : never;

/**
 * Identity Higher-Order Kind
 */
type IdentityHOK<In extends KindAny> = HigherKind<In, In>;

/**
 * Constant Higher-Order Kind
 */
type ConstHOK<In extends KindAny, Out extends KindAny> = HigherKind<In, Out>;

// ============================================================================
// Example Higher-Order Kind Instances
// ============================================================================

/**
 * Example: Array as a Higher-Order Kind
 */
interface ArrayHOK extends HigherKind<Kind1, Kind1> {
  readonly __input: Kind1;
  readonly __output: Kind1;
  readonly type: Array<this['__input']['arg0']>;
}

/**
 * Example: Maybe as a Higher-Order Kind
 */
interface MaybeHOK extends HigherKind<Kind1, Kind1> {
  readonly __input: Kind1;
  readonly __output: Kind1;
  readonly type: this['__input']['arg0'] | null | undefined;
}

/**
 * Example: Either as a Higher-Order Kind
 */
interface EitherHOK extends HigherKind<Kind2, Kind2> {
  readonly __input: Kind2;
  readonly __output: Kind2;
  readonly type: { left: this['__input']['arg0'] } | { right: this['__input']['arg1'] };
}

/**
 * Example: Tuple as a Higher-Order Kind
 */
interface TupleHOK extends HigherKind<Kind2, Kind2> {
  readonly __input: Kind2;
  readonly __output: Kind2;
  readonly type: [this['__input']['arg0'], this['__input']['arg1']];
}

// ============================================================================
// Polymorphic Typeclass Instances
// ============================================================================

/**
 * Polymorphic Functor instance that can work with any unary type constructor
 */
interface PolymorphicFunctor extends Functor<HigherKind<Kind1, Kind1>> {
  map: <F extends HigherKind<Kind1, Kind1>, A, B>(
    fa: Apply<KindOutput<F>, [A]>,
    f: (a: A) => B
  ) => Apply<KindOutput<F>, [B]>;
}

/**
 * Polymorphic Bifunctor instance that can work with any binary type constructor
 */
interface PolymorphicBifunctor extends Bifunctor<HigherKind<Kind2, Kind2>> {
  bimap: <F extends HigherKind<Kind2, Kind2>, A, B, C, D>(
    fab: Apply<KindOutput<F>, [A, B]>,
    f: (a: A) => C,
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [C, D]>;
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  Functor, Functor1, Functor2, AnyFunctor,
  Applicative, Monad, Bifunctor, Profunctor,
  Traversable, Foldable,
  IsFunctor, IsApplicative, IsMonad, IsBifunctor, IsProfunctor,
  IsTraversable, IsFoldable,
  ComposeHOK, IdentityHOK, ConstHOK,
  ArrayHOK, MaybeHOK, EitherHOK, TupleHOK,
  PolymorphicFunctor, PolymorphicBifunctor
};

export type {
  Functor as FunctorHOK,
  Applicative as ApplicativeHOK,
  Monad as MonadHOK,
  Bifunctor as BifunctorHOK,
  Profunctor as ProfunctorHOK
}; 