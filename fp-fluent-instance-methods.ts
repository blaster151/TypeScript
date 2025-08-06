/**
 * Fluent Instance Methods for Core ADTs
 * 
 * This module implements fluent instance methods (.map, .chain, .filter, etc.) for all core ADTs
 * to support a consistent .map(...).chain(...).filter(...) style API in addition to existing data-last functions.
 * 
 * Requirements:
 * 1. Methods per type's applicable typeclasses
 * 2. Delegate to existing data-last functions
 * 3. Maintain type safety and preserve HKTs
 * 4. Match ObservableLite fluent style
 * 5. Ensure method chaining type-infers correctly
 */

import {
  // Core ADT imports
  Maybe, Just, Nothing, matchMaybe, mapMaybe, apMaybe, chainMaybe,
  Either, Left, Right, matchEither, mapEither, apEither, chainEither, bimapEither,
  Result, Ok, Err, matchResult, mapResult, apResult, chainResult, bimapResult
} from './fp-maybe-unified-enhanced';

import {
  // ObservableLite (already has fluent methods)
  ObservableLite
} from './fp-observable-lite';

import {
  // Persistent collections
  PersistentList, PersistentMap, PersistentSet
} from './fp-persistent';

import {
  // StatefulStream
  StatefulStream
} from './fp-stream-state';

// ============================================================================
// Part 1: Maybe Fluent Methods
// ============================================================================

/**
 * Add fluent methods to Maybe instances
 */
export function addMaybeFluentMethods(): void {
  if (!Maybe || typeof Maybe !== 'function') {
    console.warn('Maybe constructor not available for fluent augmentation');
    return;
  }

  // Functor methods
  Maybe.prototype.map = function<A, B>(this: Maybe<A>, f: (a: A) => B): Maybe<B> {
    return mapMaybe(f, this);
  };

  // Applicative methods
  Maybe.prototype.ap = function<A, B>(this: Maybe<(a: A) => B>, other: Maybe<A>): Maybe<B> {
    return apMaybe(this, other);
  };

  // Monad methods
  Maybe.prototype.chain = function<A, B>(this: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> {
    return chainMaybe(f, this);
  };

  // Alias for chain
  Maybe.prototype.flatMap = function<A, B>(this: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> {
    return chainMaybe(f, this);
  };

  // Filterable methods
  Maybe.prototype.filter = function<A>(this: Maybe<A>, predicate: (a: A) => boolean): Maybe<A> {
    return matchMaybe(this, {
      Just: value => predicate(value) ? this : Nothing(),
      Nothing: () => Nothing()
    });
  };

  // Static methods
  Maybe.of = <A>(a: A): Maybe<A> => Just(a);
  Maybe.Just = Just;
  Maybe.Nothing = Nothing;

  console.log('✅ Maybe augmented with fluent methods');
}

// ============================================================================
// Part 2: Either Fluent Methods
// ============================================================================

/**
 * Add fluent methods to Either instances
 */
export function addEitherFluentMethods(): void {
  if (!Either || typeof Either !== 'function') {
    console.warn('Either constructor not available for fluent augmentation');
    return;
  }

  // Functor methods
  Either.prototype.map = function<L, R, R2>(this: Either<L, R>, f: (r: R) => R2): Either<L, R2> {
    return mapEither(f, this);
  };

  // Applicative methods
  Either.prototype.ap = function<L, R, R2>(this: Either<L, (r: R) => R2>, other: Either<L, R>): Either<L, R2> {
    return apEither(this, other);
  };

  // Monad methods
  Either.prototype.chain = function<L, R, R2>(this: Either<L, R>, f: (r: R) => Either<L, R2>): Either<L, R2> {
    return chainEither(f, this);
  };

  // Alias for chain
  Either.prototype.flatMap = function<L, R, R2>(this: Either<L, R>, f: (r: R) => Either<L, R2>): Either<L, R2> {
    return chainEither(f, this);
  };

  // Bifunctor methods
  Either.prototype.bimap = function<L, R, L2, R2>(this: Either<L, R>, f: (l: L) => L2, g: (r: R) => R2): Either<L2, R2> {
    return bimapEither(f, g, this);
  };

  Either.prototype.mapLeft = function<L, R, L2>(this: Either<L, R>, f: (l: L) => L2): Either<L2, R> {
    return bimapEither(f, (r: R) => r, this);
  };

  Either.prototype.mapRight = function<L, R, R2>(this: Either<L, R>, g: (r: R) => R2): Either<L, R2> {
    return bimapEither((l: L) => l, g, this);
  };

  // Filterable methods
  Either.prototype.filter = function<L, R>(this: Either<L, R>, predicate: (r: R) => boolean): Either<L, R> {
    return matchEither(this, {
      Left: value => Left(value),
      Right: value => predicate(value) ? this : Left('Filtered out' as any)
    });
  };

  // Static methods
  Either.of = <L, R>(r: R): Either<L, R> => Right(r);
  Either.Left = Left;
  Either.Right = Right;

  console.log('✅ Either augmented with fluent methods');
}

// ============================================================================
// Part 3: Result Fluent Methods
// ============================================================================

/**
 * Add fluent methods to Result instances
 */
export function addResultFluentMethods(): void {
  if (!Result || typeof Result !== 'function') {
    console.warn('Result constructor not available for fluent augmentation');
    return;
  }

  // Functor methods
  Result.prototype.map = function<E, T, T2>(this: Result<E, T>, f: (t: T) => T2): Result<E, T2> {
    return mapResult(f, this);
  };

  // Applicative methods
  Result.prototype.ap = function<E, T, T2>(this: Result<E, (t: T) => T2>, other: Result<E, T>): Result<E, T2> {
    return apResult(this, other);
  };

  // Monad methods
  Result.prototype.chain = function<E, T, T2>(this: Result<E, T>, f: (t: T) => Result<E, T2>): Result<E, T2> {
    return chainResult(f, this);
  };

  // Alias for chain
  Result.prototype.flatMap = function<E, T, T2>(this: Result<E, T>, f: (t: T) => Result<E, T2>): Result<E, T2> {
    return chainResult(f, this);
  };

  // Bifunctor methods
  Result.prototype.bimap = function<E, T, E2, T2>(this: Result<E, T>, f: (e: E) => E2, g: (t: T) => T2): Result<E2, T2> {
    return bimapResult(f, g, this);
  };

  Result.prototype.mapError = function<E, T, E2>(this: Result<E, T>, f: (e: E) => E2): Result<E2, T> {
    return bimapResult(f, (t: T) => t, this);
  };

  Result.prototype.mapSuccess = function<E, T, T2>(this: Result<E, T>, g: (t: T) => T2): Result<E, T2> {
    return bimapResult((e: E) => e, g, this);
  };

  // Filterable methods
  Result.prototype.filter = function<E, T>(this: Result<E, T>, predicate: (t: T) => boolean): Result<E, T> {
    return matchResult(this, {
      Err: error => Err(error),
      Ok: value => predicate(value) ? this : Err('Filtered out' as any)
    });
  };

  // Static methods
  Result.of = <E, T>(t: T): Result<E, T> => Ok(t);
  Result.Ok = Ok;
  Result.Err = Err;

  console.log('✅ Result augmented with fluent methods');
}

// ============================================================================
// Part 4: Persistent Collections Fluent Methods
// ============================================================================

/**
 * Add fluent methods to PersistentList instances
 */
export function addPersistentListFluentMethods(): void {
  if (!PersistentList || typeof PersistentList !== 'function') {
    console.warn('PersistentList constructor not available for fluent augmentation');
    return;
  }

  // Functor methods
  PersistentList.prototype.map = function<A, B>(this: PersistentList<A>, f: (a: A) => B): PersistentList<B> {
    return this.map(f);
  };

  // Applicative methods
  PersistentList.prototype.ap = function<A, B>(this: PersistentList<(a: A) => B>, other: PersistentList<A>): PersistentList<B> {
    return this.ap(other);
  };

  // Monad methods
  PersistentList.prototype.chain = function<A, B>(this: PersistentList<A>, f: (a: A) => PersistentList<B>): PersistentList<B> {
    return this.chain(f);
  };

  // Alias for chain
  PersistentList.prototype.flatMap = function<A, B>(this: PersistentList<A>, f: (a: A) => PersistentList<B>): PersistentList<B> {
    return this.chain(f);
  };

  // Filterable methods
  PersistentList.prototype.filter = function<A>(this: PersistentList<A>, predicate: (a: A) => boolean): PersistentList<A> {
    return this.filter(predicate);
  };

  // Traversable methods
  PersistentList.prototype.traverse = function<A, B, F>(
    this: PersistentList<A>,
    applicative: any,
    f: (a: A) => any
  ): any {
    return this.traverse(applicative, f);
  };

  // Static methods
  PersistentList.of = <A>(a: A): PersistentList<A> => PersistentList.of(a);

  console.log('✅ PersistentList augmented with fluent methods');
}

/**
 * Add fluent methods to PersistentMap instances
 */
export function addPersistentMapFluentMethods(): void {
  if (!PersistentMap || typeof PersistentMap !== 'function') {
    console.warn('PersistentMap constructor not available for fluent augmentation');
    return;
  }

  // Functor methods
  PersistentMap.prototype.map = function<K, V, V2>(this: PersistentMap<K, V>, f: (v: V) => V2): PersistentMap<K, V2> {
    return this.map(f);
  };

  // Bifunctor methods
  PersistentMap.prototype.bimap = function<K, V, K2, V2>(
    this: PersistentMap<K, V>,
    f: (k: K) => K2,
    g: (v: V) => V2
  ): PersistentMap<K2, V2> {
    return this.bimap(f, g);
  };

  PersistentMap.prototype.mapKeys = function<K, V, K2>(this: PersistentMap<K, V>, f: (k: K) => K2): PersistentMap<K2, V> {
    return this.bimap(f, (v: V) => v);
  };

  PersistentMap.prototype.mapValues = function<K, V, V2>(this: PersistentMap<K, V>, g: (v: V) => V2): PersistentMap<K, V2> {
    return this.bimap((k: K) => k, g);
  };

  // Filterable methods
  PersistentMap.prototype.filter = function<K, V>(this: PersistentMap<K, V>, predicate: (v: V) => boolean): PersistentMap<K, V> {
    return this.filter(predicate);
  };

  // Static methods
  PersistentMap.of = <K, V>(k: K, v: V): PersistentMap<K, V> => PersistentMap.of(k, v);

  console.log('✅ PersistentMap augmented with fluent methods');
}

/**
 * Add fluent methods to PersistentSet instances
 */
export function addPersistentSetFluentMethods(): void {
  if (!PersistentSet || typeof PersistentSet !== 'function') {
    console.warn('PersistentSet constructor not available for fluent augmentation');
    return;
  }

  // Functor methods
  PersistentSet.prototype.map = function<A, B>(this: PersistentSet<A>, f: (a: A) => B): PersistentSet<B> {
    return this.map(f);
  };

  // Filterable methods
  PersistentSet.prototype.filter = function<A>(this: PersistentSet<A>, predicate: (a: A) => boolean): PersistentSet<A> {
    return this.filter(predicate);
  };

  // Static methods
  PersistentSet.of = <A>(a: A): PersistentSet<A> => PersistentSet.of(a);

  console.log('✅ PersistentSet augmented with fluent methods');
}

// ============================================================================
// Part 5: StatefulStream Fluent Methods
// ============================================================================

/**
 * Add fluent methods to StatefulStream instances
 */
export function addStatefulStreamFluentMethods(): void {
  if (!StatefulStream || typeof StatefulStream !== 'function') {
    console.warn('StatefulStream constructor not available for fluent augmentation');
    return;
  }

  // Functor methods
  StatefulStream.prototype.map = function<I, S, A, B>(this: StatefulStream<I, S, A>, f: (a: A) => B): StatefulStream<I, S, B> {
    return this.map(f);
  };

  // Applicative methods
  StatefulStream.prototype.ap = function<I, S, A, B>(
    this: StatefulStream<I, S, (a: A) => B>,
    other: StatefulStream<I, S, A>
  ): StatefulStream<I, S, B> {
    return this.ap(other);
  };

  // Monad methods
  StatefulStream.prototype.chain = function<I, S, A, B>(
    this: StatefulStream<I, S, A>,
    f: (a: A) => StatefulStream<I, S, B>
  ): StatefulStream<I, S, B> {
    return this.chain(f);
  };

  // Alias for chain
  StatefulStream.prototype.flatMap = function<I, S, A, B>(
    this: StatefulStream<I, S, A>,
    f: (a: A) => StatefulStream<I, S, B>
  ): StatefulStream<I, S, B> {
    return this.chain(f);
  };

  // Profunctor methods
  StatefulStream.prototype.dimap = function<I, S, A, I2, A2>(
    this: StatefulStream<I, S, A>,
    f: (i2: I2) => I,
    g: (a: A) => A2
  ): StatefulStream<I2, S, A2> {
    return this.dimap(f, g);
  };

  StatefulStream.prototype.lmap = function<I, S, A, I2>(
    this: StatefulStream<I, S, A>,
    f: (i2: I2) => I
  ): StatefulStream<I2, S, A> {
    return this.lmap(f);
  };

  StatefulStream.prototype.rmap = function<I, S, A, A2>(
    this: StatefulStream<I, S, A>,
    g: (a: A) => A2
  ): StatefulStream<I, S, A2> {
    return this.rmap(g);
  };

  console.log('✅ StatefulStream augmented with fluent methods');
}

// ============================================================================
// Part 6: ObservableLite Fluent Methods (Already Implemented)
// ============================================================================

/**
 * ObservableLite already has comprehensive fluent methods implemented
 * This function serves as a verification that they exist
 */
export function verifyObservableLiteFluentMethods(): void {
  if (!ObservableLite || typeof ObservableLite !== 'function') {
    console.warn('ObservableLite constructor not available');
    return;
  }

  const proto = ObservableLite.prototype;
  
  // Verify existing methods
  const hasMap = typeof proto.map === 'function';
  const hasChain = typeof proto.chain === 'function';
  const hasFlatMap = typeof proto.flatMap === 'function';
  const hasFilter = typeof proto.filter === 'function';
  const hasAp = typeof proto.ap === 'function';

  if (hasMap && hasChain && hasFlatMap && hasFilter && hasAp) {
    console.log('✅ ObservableLite already has fluent methods');
  } else {
    console.warn('⚠️  ObservableLite missing some fluent methods');
  }
}

// ============================================================================
// Part 7: Unified Fluent Methods Registration
// ============================================================================

/**
 * Add fluent methods to all core ADTs
 */
export function addAllFluentMethods(): void {
  console.log('🔧 Adding fluent methods to all core ADTs...\n');

  // Add fluent methods to each ADT
  addMaybeFluentMethods();
  addEitherFluentMethods();
  addResultFluentMethods();
  addPersistentListFluentMethods();
  addPersistentMapFluentMethods();
  addPersistentSetFluentMethods();
  addStatefulStreamFluentMethods();
  verifyObservableLiteFluentMethods();

  console.log('\n✅ All fluent methods added successfully!');
}

/**
 * Remove fluent methods from all core ADTs (for cleanup)
 */
export function removeAllFluentMethods(): void {
  console.log('🧹 Removing fluent methods from all core ADTs...\n');

  const adts = [Maybe, Either, Result, PersistentList, PersistentMap, PersistentSet, StatefulStream];

  for (const adt of adts) {
    if (adt && adt.prototype) {
      delete adt.prototype.map;
      delete adt.prototype.chain;
      delete adt.prototype.flatMap;
      delete adt.prototype.filter;
      delete adt.prototype.ap;
      delete adt.prototype.bimap;
      delete adt.prototype.mapLeft;
      delete adt.prototype.mapRight;
      delete adt.prototype.dimap;
      delete adt.prototype.lmap;
      delete adt.prototype.rmap;
      delete adt.prototype.traverse;
    }
  }

  console.log('✅ All fluent methods removed successfully!');
}

// ============================================================================
// Part 8: Type Definitions for Fluent Methods
// ============================================================================

/**
 * Fluent methods interface for unary type constructors
 */
export interface FluentUnaryADT<F, A> {
  map<B>(f: (a: A) => B): F<B>;
  chain<B>(f: (a: A) => F<B>): F<B>;
  flatMap<B>(f: (a: A) => F<B>): F<B>;
  filter(predicate: (a: A) => boolean): F<A>;
  ap<B>(other: F<(a: A) => B>): F<B>;
  traverse<B, G>(applicative: any, f: (a: A) => any): any;
}

/**
 * Fluent methods interface for binary type constructors
 */
export interface FluentBinaryADT<F, L, R> {
  map<B>(f: (r: R) => B): F<L, B>;
  chain<B>(f: (r: R) => F<L, B>): F<L, B>;
  flatMap<B>(f: (r: R) => F<L, B>): F<L, B>;
  filter(predicate: (r: R) => boolean): F<L, R>;
  ap<B>(other: F<L, (r: R) => B>): F<L, B>;
  bimap<L2, R2>(f: (l: L) => L2, g: (r: R) => R2): F<L2, R2>;
  mapLeft<L2>(f: (l: L) => L2): F<L2, R>;
  mapRight<R2>(g: (r: R) => R2): F<L, R2>;
}

/**
 * Fluent methods interface for profunctors
 */
export interface FluentProfunctorADT<F, I, O> {
  dimap<I2, O2>(f: (i2: I2) => I, g: (o: O) => O2): F<I2, O2>;
  lmap<I2>(f: (i2: I2) => I): F<I2, O>;
  rmap<O2>(g: (o: O) => O2): F<I, O2>;
}

// ============================================================================
// Part 9: Export Summary
// ============================================================================

export {
  addMaybeFluentMethods,
  addEitherFluentMethods,
  addResultFluentMethods,
  addPersistentListFluentMethods,
  addPersistentMapFluentMethods,
  addPersistentSetFluentMethods,
  addStatefulStreamFluentMethods,
  verifyObservableLiteFluentMethods,
  addAllFluentMethods,
  removeAllFluentMethods
}; 