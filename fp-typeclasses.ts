/// <reference lib="ts.plus" />

// ============================================================================
// FP Typeclass System for TypeScript HKT
// ============================================================================

// Core HKT utilities
type Type = any;
type Kind<TArgs extends any[] = any[]> = any;
type Apply<F extends Kind<any[]>, Args extends any[]> = F extends Kind<Args> ? F : never;

// ============================================================================
// Functor Typeclass
// ============================================================================

/**
 * Functor typeclass for unary type constructors
 * Provides the ability to map over a container without changing its structure
 */
interface Functor<F extends Kind<[Type, Type]>> {
  /**
   * Maps a function over the contents of a functor
   * @param fa - The functor to map over
   * @param f - The function to apply to the contents
   * @returns A new functor with the transformed contents
   */
  map: <A, B>(fa: Apply<F, [A]>, f: (a: A) => B) => Apply<F, [B]>;
}

// ============================================================================
// Applicative Typeclass
// ============================================================================

/**
 * Applicative typeclass for unary type constructors
 * Extends Functor with the ability to lift values and apply functions in context
 */
interface Applicative<F extends Kind<[Type, Type]>> extends Functor<F> {
  /**
   * Lifts a value into the applicative context
   * @param a - The value to lift
   * @returns The value wrapped in the applicative context
   */
  of: <A>(a: A) => Apply<F, [A]>;
  
  /**
   * Applies a function in context to a value in context
   * @param fab - The function in context
   * @param fa - The value in context
   * @returns The result of applying the function to the value, in context
   */
  ap: <A, B>(fab: Apply<F, [(a: A) => B]>, fa: Apply<F, [A]>) => Apply<F, [B]>;
}

// ============================================================================
// Monad Typeclass
// ============================================================================

/**
 * Monad typeclass for unary type constructors
 * Extends Applicative with the ability to chain computations
 */
interface Monad<F extends Kind<[Type, Type]>> extends Applicative<F> {
  /**
   * Chains computations in the monadic context
   * @param fa - The monadic value to chain from
   * @param f - The function that produces a new monadic value
   * @returns The result of chaining the computations
   */
  chain: <A, B>(fa: Apply<F, [A]>, f: (a: A) => Apply<F, [B]>) => Apply<F, [B]>;
}

// ============================================================================
// Bifunctor Typeclass
// ============================================================================

/**
 * Bifunctor typeclass for binary type constructors
 * Provides the ability to map over both type parameters
 */
interface Bifunctor<F extends Kind<[Type, Type, Type]>> {
  /**
   * Maps functions over both type parameters of a bifunctor
   * @param fab - The bifunctor to map over
   * @param f - The function to apply to the first type parameter
   * @param g - The function to apply to the second type parameter
   * @returns A new bifunctor with transformed type parameters
   */
  bimap: <A, B, C, D>(
    fab: Apply<F, [A, B]>,
    f: (a: A) => C,
    g: (b: B) => D
  ) => Apply<F, [C, D]>;
  
  /**
   * Maps a function over the first type parameter only
   * @param fab - The bifunctor to map over
   * @param f - The function to apply to the first type parameter
   * @returns A new bifunctor with the first type parameter transformed
   */
  mapLeft?: <A, B, C>(fab: Apply<F, [A, B]>, f: (a: A) => C) => Apply<F, [C, B]>;
}

// ============================================================================
// Profunctor Typeclass
// ============================================================================

/**
 * Profunctor typeclass for binary type constructors
 * Provides the ability to map over both type parameters with contravariant first parameter
 */
interface Profunctor<F extends Kind<[Type, Type, Type]>> {
  /**
   * Maps functions over both type parameters of a profunctor
   * @param p - The profunctor to map over
   * @param f - The contravariant function for the first type parameter
   * @param g - The covariant function for the second type parameter
   * @returns A new profunctor with transformed type parameters
   */
  dimap: <A, B, C, D>(
    p: Apply<F, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ) => Apply<F, [C, D]>;
  
  /**
   * Maps a contravariant function over the first type parameter only
   * @param p - The profunctor to map over
   * @param f - The contravariant function to apply to the first type parameter
   * @returns A new profunctor with the first type parameter transformed
   */
  lmap?: <A, B, C>(p: Apply<F, [A, B]>, f: (c: C) => A) => Apply<F, [C, B]>;
  
  /**
   * Maps a covariant function over the second type parameter only
   * @param p - The profunctor to map over
   * @param g - The covariant function to apply to the second type parameter
   * @returns A new profunctor with the second type parameter transformed
   */
  rmap?: <A, B, D>(p: Apply<F, [A, B]>, g: (b: B) => D) => Apply<F, [A, D]>;
}

// ============================================================================
// Example Instances
// ============================================================================

// Array Functor Instance
const ArrayFunctor: Functor<Array> = {
  map: <A, B>(fa: A[], f: (a: A) => B): B[] => fa.map(f)
};

// Array Applicative Instance
const ArrayApplicative: Applicative<Array> = {
  ...ArrayFunctor,
  of: <A>(a: A): A[] => [a],
  ap: <A, B>(fab: ((a: A) => B)[], fa: A[]): B[] => 
    fab.flatMap(f => fa.map(f))
};

// Array Monad Instance
const ArrayMonad: Monad<Array> = {
  ...ArrayApplicative,
  chain: <A, B>(fa: A[], f: (a: A) => B[]): B[] => 
    fa.flatMap(f)
};

// Tuple Bifunctor Instance
type Tuple<A, B> = [A, B];

const TupleBifunctor: Bifunctor<Tuple> = {
  bimap: <A, B, C, D>(
    fab: [A, B],
    f: (a: A) => C,
    g: (b: B) => D
  ): [C, D] => [f(fab[0]), g(fab[1])],
  
  mapLeft: <A, B, C>(fab: [A, B], f: (a: A) => C): [C, B] => [f(fab[0]), fab[1]]
};

// Function Profunctor Instance
type Function<A, B> = (a: A) => B;

const FunctionProfunctor: Profunctor<Function> = {
  dimap: <A, B, C, D>(
    p: (a: A) => B,
    f: (c: C) => A,
    g: (b: B) => D
  ): (c: C) => D => (c: C) => g(p(f(c))),
  
  lmap: <A, B, C>(p: (a: A) => B, f: (c: C) => A): (c: C) => B => (c: C) => p(f(c)),
  
  rmap: <A, B, D>(p: (a: A) => B, g: (b: B) => D): (a: A) => D => (a: A) => g(p(a))
};

// ============================================================================
// Utility Types for Typeclass Constraints
// ============================================================================

/**
 * Utility type to check if a type constructor satisfies Functor
 */
type IsFunctor<F extends Kind<[Type, Type]>> = F extends Functor<F> ? true : false;

/**
 * Utility type to check if a type constructor satisfies Applicative
 */
type IsApplicative<F extends Kind<[Type, Type]>> = F extends Applicative<F> ? true : false;

/**
 * Utility type to check if a type constructor satisfies Monad
 */
type IsMonad<F extends Kind<[Type, Type]>> = F extends Monad<F> ? true : false;

/**
 * Utility type to check if a type constructor satisfies Bifunctor
 */
type IsBifunctor<F extends Kind<[Type, Type, Type]>> = F extends Bifunctor<F> ? true : false;

/**
 * Utility type to check if a type constructor satisfies Profunctor
 */
type IsProfunctor<F extends Kind<[Type, Type, Type]>> = F extends Profunctor<F> ? true : false;

// ============================================================================
// Generic Functions Using Typeclasses
// ============================================================================

/**
 * Generic map function that works with any Functor
 */
function map<F extends Kind<[Type, Type]>, A, B>(
  F: Functor<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => B
): Apply<F, [B]> {
  return F.map(fa, f);
}

/**
 * Generic lift function that works with any Applicative
 */
function lift<F extends Kind<[Type, Type]>, A>(
  F: Applicative<F>,
  a: A
): Apply<F, [A]> {
  return F.of(a);
}

/**
 * Generic chain function that works with any Monad
 */
function chain<F extends Kind<[Type, Type]>, A, B>(
  F: Monad<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => Apply<F, [B]>
): Apply<F, [B]> {
  return F.chain(fa, f);
}

/**
 * Generic bimap function that works with any Bifunctor
 */
function bimap<F extends Kind<[Type, Type, Type]>, A, B, C, D>(
  F: Bifunctor<F>,
  fab: Apply<F, [A, B]>,
  f: (a: A) => C,
  g: (b: B) => D
): Apply<F, [C, D]> {
  return F.bimap(fab, f, g);
}

/**
 * Generic dimap function that works with any Profunctor
 */
function dimap<F extends Kind<[Type, Type, Type]>, A, B, C, D>(
  F: Profunctor<F>,
  p: Apply<F, [A, B]>,
  f: (c: C) => A,
  g: (b: B) => D
): Apply<F, [C, D]> {
  return F.dimap(p, f, g);
}

// ============================================================================
// Example Usage and Tests
// ============================================================================

// Test the Array instances
const numbers = [1, 2, 3, 4, 5];
const doubled = map(ArrayFunctor, numbers, x => x * 2);
const lifted = lift(ArrayApplicative, 42);
const chained = chain(ArrayMonad, numbers, x => [x, x * 2]);

// Test the Tuple bifunctor
const tuple: [string, number] = ["hello", 42];
const transformed = bimap(TupleBifunctor, tuple, s => s.length, n => n * 2);

// Test the Function profunctor
const stringToNumber: (s: string) => number = s => s.length;
const transformedFn = dimap(FunctionProfunctor, stringToNumber, (n: number) => n.toString(), (n: number) => n * 2);

// Type-level tests
type TestArrayFunctor = IsFunctor<Array>; // Should be true
type TestArrayApplicative = IsApplicative<Array>; // Should be true
type TestArrayMonad = IsMonad<Array>; // Should be true
type TestTupleBifunctor = IsBifunctor<Tuple>; // Should be true
type TestFunctionProfunctor = IsProfunctor<Function>; // Should be true

// ============================================================================
// Advanced Examples: Custom Data Types
// ============================================================================

// Maybe/Option type
type Maybe<A> = { tag: 'Just'; value: A } | { tag: 'Nothing' };

const Just = <A>(a: A): Maybe<A> => ({ tag: 'Just', value: a });
const Nothing = <A>(): Maybe<A> => ({ tag: 'Nothing' });

const MaybeFunctor: Functor<Maybe> = {
  map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    fa.tag === 'Just' ? Just(f(fa.value)) : Nothing()
};

const MaybeApplicative: Applicative<Maybe> = {
  ...MaybeFunctor,
  of: <A>(a: A): Maybe<A> => Just(a),
  ap: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => 
    fab.tag === 'Just' && fa.tag === 'Just' ? Just(fab.value(fa.value)) : Nothing()
};

const MaybeMonad: Monad<Maybe> = {
  ...MaybeApplicative,
  chain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => 
    fa.tag === 'Just' ? f(fa.value) : Nothing()
};

// Either type
type Either<L, R> = { tag: 'Left'; value: L } | { tag: 'Right'; value: R };

const Left = <L, R>(l: L): Either<L, R> => ({ tag: 'Left', value: l });
const Right = <L, R>(r: R): Either<L, R> => ({ tag: 'Right', value: r });

const EitherBifunctor: Bifunctor<Either> = {
  bimap: <L, R, L2, R2>(
    e: Either<L, R>,
    f: (l: L) => L2,
    g: (r: R) => R2
  ): Either<L2, R2> => 
    e.tag === 'Left' ? Left(f(e.value)) : Right(g(e.value)),
  
  mapLeft: <L, R, L2>(e: Either<L, R>, f: (l: L) => L2): Either<L2, R> => 
    e.tag === 'Left' ? Left(f(e.value)) : Right(e.value)
};

// Reader type (Function with explicit input type)
type Reader<R, A> = (r: R) => A;

const ReaderProfunctor: Profunctor<Reader> = {
  dimap: <R, A, R2, A2>(
    reader: Reader<R, A>,
    f: (r2: R2) => R,
    g: (a: A) => A2
  ): Reader<R2, A2> => (r2: R2) => g(reader(f(r2))),
  
  lmap: <R, A, R2>(reader: Reader<R, A>, f: (r2: R2) => R): Reader<R2, A> => 
    (r2: R2) => reader(f(r2)),
  
  rmap: <R, A, A2>(reader: Reader<R, A>, g: (a: A) => A2): Reader<R, A2> => 
    (r: R) => g(reader(r))
};

// ============================================================================
// Laws and Properties (Type-level documentation)
// ============================================================================

/**
 * Functor Laws (should be satisfied by all Functor instances):
 * 
 * 1. Identity: map(fa, id) === fa
 * 2. Composition: map(fa, f ∘ g) === map(map(fa, g), f)
 */

/**
 * Applicative Laws (should be satisfied by all Applicative instances):
 * 
 * 1. Identity: ap(of(id), v) === v
 * 2. Homomorphism: ap(of(f), of(x)) === of(f(x))
 * 3. Interchange: ap(u, of(y)) === ap(of(f => f(y)), u)
 * 4. Composition: ap(ap(ap(of(compose), u), v), w) === ap(u, ap(v, w))
 */

/**
 * Monad Laws (should be satisfied by all Monad instances):
 * 
 * 1. Left Identity: chain(of(a), f) === f(a)
 * 2. Right Identity: chain(m, of) === m
 * 3. Associativity: chain(chain(m, f), g) === chain(m, x => chain(f(x), g))
 */

/**
 * Bifunctor Laws (should be satisfied by all Bifunctor instances):
 * 
 * 1. Identity: bimap(fab, id, id) === fab
 * 2. Composition: bimap(bimap(fab, f1, g1), f2, g2) === bimap(fab, f2 ∘ f1, g2 ∘ g1)
 */

/**
 * Profunctor Laws (should be satisfied by all Profunctor instances):
 * 
 * 1. Identity: dimap(p, id, id) === p
 * 2. Composition: dimap(dimap(p, f1, g1), f2, g2) === dimap(p, f1 ∘ f2, g2 ∘ g1)
 */

export {
  // Typeclasses
  Functor,
  Applicative,
  Monad,
  Bifunctor,
  Profunctor,
  
  // Utility types
  IsFunctor,
  IsApplicative,
  IsMonad,
  IsBifunctor,
  IsProfunctor,
  
  // Generic functions
  map,
  lift,
  chain,
  bimap,
  dimap,
  
  // Example instances
  ArrayFunctor,
  ArrayApplicative,
  ArrayMonad,
  TupleBifunctor,
  FunctionProfunctor,
  MaybeFunctor,
  MaybeApplicative,
  MaybeMonad,
  EitherBifunctor,
  ReaderProfunctor,
  
  // Helper functions
  Just,
  Nothing,
  Left,
  Right
};

// Re-export extended bifunctor monad combinators
export {
  // Core types
  BifunctorMonad,
  ApplyBifunctorMonad,
  
  // Generic combinators
  bichain,
  chainLeft,
  matchM,
  
  // Either-specific combinators
  EitherBifunctorMonad,
  bichainEither,
  chainLeftEither,
  matchMEither,
  
  // Result-specific combinators
  ResultBifunctorMonad,
  bichainResult,
  chainErrResult,
  matchMResult,
  
  // TaskEither implementation
  TaskEither,
  TaskEitherLeft,
  TaskEitherRight,
  TaskEitherBifunctorMonad,
  bichainTaskEither,
  chainLeftTaskEither,
  matchMTaskEither,
  
  // Utility functions
  eitherToTaskEither,
  taskEitherToPromise,
  promiseToTaskEither,
  createTaskEitherWithPurity,
  EffectOfTaskEither,
  IsTaskEitherPure
} from './fp-bimonad-extended';

// Re-export ObservableLite
export {
  // Core types
  ObservableLite,
  Observer,
  Unsubscribe,
  Subscribe,
  
  // HKT types
  ObservableLiteK,
  ObservableLiteWithEffect,
  ApplyObservableLite,
  ObservableLiteOf,
  
  // Purity types
  EffectOfObservableLite,
  IsObservableLitePure,
  IsObservableLiteImpure,
  
  // Typeclass instances
  ObservableLiteFunctor,
  ObservableLiteApplicative,
  ObservableLiteMonad,
  
  // Utility functions
  fromAsync,
  fromAsyncGenerator,
  fromGenerator,
  fromIterable,
  fromCallback,
  fromTry,
  
  // Type guards
  isObservableLite,
  isObservableLiteOf,
  createObservable,
  
  // Registration
  registerObservableLiteInstances
} from './fp-observable-lite';

// Re-export Fluent Methods
export {
  // Core types
  TypeclassInstances,
  FluentMethodOptions,
  FluentMethodDecorator,
  GlobalFluentMethodsConfig,
  
  // Registry functions
  registerFluentMethodInstances,
  getFluentMethodInstances,
  getADTTypeclassInstancesForFluent,
  
  // Decorator functions
  withFluentMethods,
  hasFluentMethods,
  withoutFluentMethods,
  
  // ADT-specific decorators
  withMaybeFluentMethods,
  withEitherFluentMethods,
  withResultFluentMethods,
  withObservableLiteFluentMethods,
  
  // Global configuration
  enableGlobalFluentMethods,
  disableGlobalFluentMethods,
  isGlobalFluentMethodsEnabled,
  getGlobalFluentMethodsConfig,
  
  // Utility functions
  createFluentMethodDecorator,
  hasInstanceFluentMethods,
  getAvailableFluentMethods,
  validateFluentMethodChain,
  
  // Type helpers
  FluentMethodResult,
  FluentMethodChain
} from './fp-fluent-methods';

// Re-export Optics
export {
  // Core optic types
  Optic,
  Lens,
  Prism,
  Traversal,
  Iso,
  Getter,
  Setter,
  
  // Profunctor variants
  Choice,
  Traversing,
  Strong,
  
  // Identity instances
  IdentityProfunctor,
  IdentityChoice,
  IdentityTraversing,
  IdentityStrong,
  
  // Lens utilities
  lens,
  view,
  set,
  over,
  
  // Prism utilities
  prism,
  preview,
  review,
  isMatching,
  
  // Traversal utilities
  traversal,
  traverse,
  map,
  
  // Common constructors
  prop,
  at,
  head,
  last,
  just,
  right,
  left,
  ok,
  err,
  array,
  values,
  keys,
  
  // Composition
  compose,
  composeMany,
  
  // HKT types
  OpticK,
  OpticWithEffect,
  EffectOfOptic,
  IsOpticPure,
  IsOpticImpure,
  
  // Utility functions
  isLens,
  isPrism,
  isTraversal,
  isOptic,
  to,
  sets
} from './fp-optics'; 