/**
 * Unified Fluent API System
 * 
 * This module provides a unified fluent API pattern that automatically derives
 * fluent methods from typeclass instances for all ADTs (Maybe, Either, Result,
 * PersistentList, etc.) ensuring full parity with data-last functions.
 * 
 * Features:
 * - Automatic derivation from typeclass instances
 * - Law-consistent implementations
 * - Property-based testing for equivalence
 * - Unified pattern across all ADTs
 */

import {
  // Core ADT imports
  Maybe, Just, Nothing, matchMaybe, mapMaybe, apMaybe, chainMaybe,
  Either, Left, Right, matchEither, mapEither, apEither, chainEither, bimapEither,
  Result, Ok, Err, matchResult, mapResult, apResult, chainResult, bimapResult
} from './fp-maybe-unified-enhanced';

import {
  // Persistent collections
  PersistentList, PersistentMap, PersistentSet
} from './fp-persistent';

import {
  // ObservableLite (already has fluent methods)
  ObservableLite
} from './fp-observable-lite';

import {
  // StatefulStream
  StatefulStream
} from './fp-stream-state';

import {
  // Typeclass instances
  Functor, Applicative, Monad, Bifunctor, Filterable, Traversable
} from './fp-typeclasses-hkt';

import {
  // Registry functions
  getTypeclassInstance, getFPRegistry
} from './fp-registry-init';

// ============================================================================
// Part 1: Unified Fluent API Interface
// ============================================================================

/**
 * Unified fluent operations interface for all ADTs
 */
export interface UnifiedFluentOps<T> {
  // Functor operations
  map<B>(f: (a: T) => B): any;
  
  // Monad operations  
  chain<B>(f: (a: T) => any): any;
  flatMap<B>(f: (a: T) => any): any;
  
  // Filter operations
  filter(pred: (a: T) => boolean): any;
  filterMap<B>(f: (a: T) => Maybe<B>): any;
  
  // Applicative operations
  ap<B>(fab: any): any;
  
  // Bifunctor operations (for Either, Result)
  bimap<L, R>(left: (l: L) => any, right: (r: R) => any): any;
  mapLeft<L, R>(f: (l: L) => any): any;
  mapRight<L, R>(f: (r: R) => any): any;
  
  // Stream-specific operations (for ObservableLite, StatefulStream)
  scan<B>(reducer: (acc: B, value: T) => B, seed: B): any;
  take(n: number): any;
  skip(n: number): any;
  distinct(): any;
  
  // Collection-specific operations (for PersistentList, etc.)
  head(): any;
  tail(): any;
  isEmpty(): boolean;
  length(): number;
  
  // Composition
  pipe<B>(...fns: Array<(a: any) => any>): any;
  
  // Conversion operations
  toMaybe(): Maybe<T>;
  toEither<E>(error: E): Either<E, T>;
  toResult<E>(error: E): Result<E, T>;
  toArray(): T[];
}

// ============================================================================
// Part 2: Fluent Method Implementation
// ============================================================================

/**
 * Fluent method implementation that delegates to typeclass instances
 */
export interface FluentImpl<T> {
  map?: (self: T, f: (a: any) => any) => any;
  chain?: (self: T, f: (a: any) => any) => any;
  flatMap?: (self: T, f: (a: any) => any) => any;
  filter?: (self: T, pred: (a: any) => boolean) => any;
  filterMap?: (self: T, f: (a: any) => Maybe<any>) => any;
  ap?: (self: T, fab: any) => any;
  bimap?: (self: T, left: (l: any) => any, right: (r: any) => any) => any;
  mapLeft?: (self: T, f: (l: any) => any) => any;
  mapRight?: (self: T, f: (r: any) => any) => any;
  scan?: (self: T, reducer: (acc: any, value: any) => any, seed: any) => any;
  take?: (self: T, n: number) => any;
  skip?: (self: T, n: number) => any;
  distinct?: (self: T) => any;
  head?: (self: T) => any;
  tail?: (self: T) => any;
  isEmpty?: (self: T) => boolean;
  length?: (self: T) => number;
  pipe?: (self: T, ...fns: Array<(a: any) => any>) => any;
  toMaybe?: (self: T) => Maybe<any>;
  toEither?: (self: T, error: any) => Either<any, any>;
  toResult?: (self: T, error: any) => Result<any, any>;
  toArray?: (self: T) => any[];
}

/**
 * Automatically derive fluent implementation from typeclass instances
 */
export function deriveFluentImpl<T>(adtName: string): FluentImpl<T> {
  const functor = getTypeclassInstance(adtName, 'Functor') as Functor<any>;
  const applicative = getTypeclassInstance(adtName, 'Applicative') as Applicative<any>;
  const monad = getTypeclassInstance(adtName, 'Monad') as Monad<any>;
  const bifunctor = getTypeclassInstance(adtName, 'Bifunctor') as Bifunctor<any>;
  const filterable = getTypeclassInstance(adtName, 'Filterable') as Filterable<any>;

  const impl: FluentImpl<T> = {};

  // Functor operations
  if (functor) {
    impl.map = (self: T, f: (a: any) => any) => {
      return functor.map(self, f);
    };
  }

  // Monad operations
  if (monad) {
    impl.chain = (self: T, f: (a: any) => any) => {
      return monad.chain(self, f);
    };
    
    impl.flatMap = (self: T, f: (a: any) => any) => {
      return monad.chain(self, f);
    };
  }

  // Applicative operations
  if (applicative) {
    impl.ap = (self: T, fab: any) => {
      return applicative.ap(fab, self);
    };
  }

  // Bifunctor operations
  if (bifunctor) {
    impl.bimap = (self: T, left: (l: any) => any, right: (r: any) => any) => {
      return bifunctor.bimap(self, left, right);
    };
    
    impl.mapLeft = (self: T, f: (l: any) => any) => {
      return bifunctor.bimap(self, f, (r: any) => r);
    };
    
    impl.mapRight = (self: T, f: (r: any) => any) => {
      return bifunctor.bimap(self, (l: any) => l, f);
    };
  }

  // Filterable operations
  if (filterable) {
    impl.filter = (self: T, pred: (a: any) => boolean) => {
      return filterable.filter(self, pred);
    };
    
    impl.filterMap = (self: T, f: (a: any) => Maybe<any>) => {
      return filterable.filterMap(self, f);
    };
  }

  // Generic filter implementation using Monad
  if (monad && !impl.filter) {
    impl.filter = (self: T, pred: (a: any) => boolean) => {
      return monad.chain(self, (a: any) => 
        pred(a) ? monad.of(a) : monad.of(null as any)
      );
    };
  }

  // Generic pipe implementation
  impl.pipe = (self: T, ...fns: Array<(a: any) => any>) => {
    let result: any = self;
    for (const fn of fns) {
      if (impl.map) {
        result = impl.map(result, fn);
      } else {
        result = fn(result);
      }
    }
    return result;
  };

  return impl;
}

// ============================================================================
// Part 3: ADT-Specific Fluent Implementations
// ============================================================================

/**
 * Maybe fluent implementation
 */
export const MaybeFluentImpl: FluentImpl<Maybe<any>> = {
  map: (self, f) => mapMaybe(f, self),
  chain: (self, f) => chainMaybe(f, self),
  flatMap: (self, f) => chainMaybe(f, self),
  ap: (self, fab) => apMaybe(fab, self),
  filter: (self, pred) => matchMaybe(self, {
    Just: value => pred(value) ? self : Nothing(),
    Nothing: () => self
  }),
  filterMap: (self, f) => matchMaybe(self, {
    Just: value => f(value),
    Nothing: () => Nothing()
  }),
  pipe: (self, ...fns) => {
    let result = self;
    for (const fn of fns) {
      result = mapMaybe(fn, result);
    }
    return result;
  },
  toMaybe: (self) => self,
  toEither: (self, error) => matchMaybe(self, {
    Just: value => Right(value),
    Nothing: () => Left(error)
  }),
  toResult: (self, error) => matchMaybe(self, {
    Just: value => Ok(value),
    Nothing: () => Err(error)
  }),
  toArray: (self) => matchMaybe(self, {
    Just: value => [value],
    Nothing: () => []
  })
};

/**
 * Either fluent implementation
 */
export const EitherFluentImpl: FluentImpl<Either<any, any>> = {
  map: (self, f) => mapEither(f, self),
  chain: (self, f) => chainEither(f, self),
  flatMap: (self, f) => chainEither(f, self),
  ap: (self, fab) => apEither(fab, self),
  bimap: (self, left, right) => bimapEither(left, right, self),
  mapLeft: (self, f) => bimapEither(f, (r: any) => r, self),
  mapRight: (self, f) => bimapEither((l: any) => l, f, self),
  filter: (self, pred) => matchEither(self, {
    Left: value => self,
    Right: value => pred(value) ? self : Left('Filtered out' as any)
  }),
  pipe: (self, ...fns) => {
    let result = self;
    for (const fn of fns) {
      result = mapEither(fn, result);
    }
    return result;
  },
  toMaybe: (self) => matchEither(self, {
    Left: () => Nothing(),
    Right: value => Just(value)
  }),
  toEither: (self) => self,
  toResult: (self) => matchEither(self, {
    Left: error => Err(error),
    Right: value => Ok(value)
  }),
  toArray: (self) => matchEither(self, {
    Left: () => [],
    Right: value => [value]
  })
};

/**
 * Result fluent implementation
 */
export const ResultFluentImpl: FluentImpl<Result<any, any>> = {
  map: (self, f) => mapResult(f, self),
  chain: (self, f) => chainResult(f, self),
  flatMap: (self, f) => chainResult(f, self),
  ap: (self, fab) => apResult(fab, self),
  bimap: (self, left, right) => bimapResult(left, right, self),
  mapLeft: (self, f) => bimapResult(f, (r: any) => r, self),
  mapRight: (self, f) => bimapResult((l: any) => l, f, self),
  filter: (self, pred) => matchResult(self, {
    Ok: value => pred(value) ? self : Err(new Error('Filter predicate failed')),
    Err: error => self
  }),
  pipe: (self, ...fns) => {
    let result = self;
    for (const fn of fns) {
      result = mapResult(fn, result);
    }
    return result;
  },
  toMaybe: (self) => matchResult(self, {
    Ok: value => Just(value),
    Err: () => Nothing()
  }),
  toEither: (self) => matchResult(self, {
    Ok: value => Right(value),
    Err: error => Left(error)
  }),
  toResult: (self) => self,
  toArray: (self) => matchResult(self, {
    Ok: value => [value],
    Err: () => []
  })
};

/**
 * PersistentList fluent implementation
 */
export const PersistentListFluentImpl: FluentImpl<PersistentList<any>> = {
  map: (self, f) => self.map(f),
  chain: (self, f) => self.flatMap(f),
  flatMap: (self, f) => self.flatMap(f),
  filter: (self, pred) => self.filter(pred),
  filterMap: (self, f) => self.filterMap(f),
  scan: (self, reducer, seed) => {
    let acc = seed;
    return self.map(v => { 
      acc = reducer(acc, v); 
      return acc; 
    });
  },
  take: (self, n) => self.take(n),
  skip: (self, n) => self.skip(n),
  distinct: (self) => self.distinct(),
  head: (self) => self.head(),
  tail: (self) => self.tail(),
  isEmpty: (self) => self.isEmpty(),
  length: (self) => self.length(),
  pipe: (self, ...fns) => {
    let result = self;
    for (const fn of fns) {
      result = result.map(fn);
    }
    return result;
  },
  toMaybe: (self) => self.head(),
  toEither: (self, error) => {
    const head = self.head();
    return matchMaybe(head, {
      Just: value => Right(value),
      Nothing: () => Left(error)
    });
  },
  toResult: (self, error) => {
    const head = self.head();
    return matchMaybe(head, {
      Just: value => Ok(value),
      Nothing: () => Err(error)
    });
  },
  toArray: (self) => self.toArray()
};

// ============================================================================
// Part 4: Fluent API Application
// ============================================================================

/**
 * Apply fluent operations to a prototype
 */
export function applyFluentOps<T>(proto: any, impl: FluentImpl<T>): void {
  // Functor operations
  if (impl.map) {
    proto.map = function(f: (a: any) => any) {
      return impl.map!(this, f);
    };
  }
  
  // Monad operations
  if (impl.chain) {
    proto.chain = function(f: (a: any) => any) {
      return impl.chain!(this, f);
    };
  }
  
  if (impl.flatMap) {
    proto.flatMap = function(f: (a: any) => any) {
      return impl.flatMap!(this, f);
    };
  }
  
  // Filter operations
  if (impl.filter) {
    proto.filter = function(pred: (a: any) => boolean) {
      return impl.filter!(this, pred);
    };
  }
  
  if (impl.filterMap) {
    proto.filterMap = function(f: (a: any) => Maybe<any>) {
      return impl.filterMap!(this, f);
    };
  }
  
  // Applicative operations
  if (impl.ap) {
    proto.ap = function(fab: any) {
      return impl.ap!(this, fab);
    };
  }
  
  // Bifunctor operations
  if (impl.bimap) {
    proto.bimap = function(left: (l: any) => any, right: (r: any) => any) {
      return impl.bimap!(this, left, right);
    };
  }
  
  if (impl.mapLeft) {
    proto.mapLeft = function(f: (l: any) => any) {
      return impl.mapLeft!(this, f);
    };
  }
  
  if (impl.mapRight) {
    proto.mapRight = function(f: (r: any) => any) {
      return impl.mapRight!(this, f);
    };
  }
  
  // Stream operations
  if (impl.scan) {
    proto.scan = function(reducer: (acc: any, value: any) => any, seed: any) {
      return impl.scan!(this, reducer, seed);
    };
  }
  
  if (impl.take) {
    proto.take = function(n: number) {
      return impl.take!(this, n);
    };
  }
  
  if (impl.skip) {
    proto.skip = function(n: number) {
      return impl.skip!(this, n);
    };
  }
  
  if (impl.distinct) {
    proto.distinct = function() {
      return impl.distinct!(this);
    };
  }
  
  // Collection operations
  if (impl.head) {
    proto.head = function() {
      return impl.head!(this);
    };
  }
  
  if (impl.tail) {
    proto.tail = function() {
      return impl.tail!(this);
    };
  }
  
  if (impl.isEmpty) {
    proto.isEmpty = function() {
      return impl.isEmpty!(this);
    };
  }
  
  if (impl.length) {
    proto.length = function() {
      return impl.length!(this);
    };
  }
  
  // Composition
  if (impl.pipe) {
    proto.pipe = function(...fns: Array<(a: any) => any>) {
      return impl.pipe!(this, ...fns);
    };
  }
  
  // Conversion operations
  if (impl.toMaybe) {
    proto.toMaybe = function() {
      return impl.toMaybe!(this);
    };
  }
  
  if (impl.toEither) {
    proto.toEither = function(error: any) {
      return impl.toEither!(this, error);
    };
  }
  
  if (impl.toResult) {
    proto.toResult = function(error: any) {
      return impl.toResult!(this, error);
    };
  }
  
  if (impl.toArray) {
    proto.toArray = function() {
      return impl.toArray!(this);
    };
  }
}

// ============================================================================
// Part 5: Automatic Fluent API Application
// ============================================================================

/**
 * Apply fluent API to all core ADTs
 */
export function applyFluentAPIToAllADTs(): void {
  // Apply to Maybe
  applyFluentOps(Maybe.prototype, MaybeFluentImpl);
  
  // Apply to Either
  applyFluentOps(Either.prototype, EitherFluentImpl);
  
  // Apply to Result
  applyFluentOps(Result.prototype, ResultFluentImpl);
  
  // Apply to PersistentList
  applyFluentOps(PersistentList.prototype, PersistentListFluentImpl);
  
  // Apply to PersistentMap
  applyFluentOps(PersistentMap.prototype, deriveFluentImpl('PersistentMap'));
  
  // Apply to PersistentSet
  applyFluentOps(PersistentSet.prototype, deriveFluentImpl('PersistentSet'));
  
  // Apply to ObservableLite (already has fluent methods, but ensure consistency)
  const observableImpl = deriveFluentImpl('ObservableLite');
  applyFluentOps(ObservableLite.prototype, observableImpl);
  
  // Apply to StatefulStream
  const statefulStreamImpl = deriveFluentImpl('StatefulStream');
  applyFluentOps(StatefulStream.prototype, statefulStreamImpl);
  
  console.log('✅ Applied unified fluent API to all ADTs');
}

// ============================================================================
// Part 6: Property-Based Testing for Law Consistency
// ============================================================================

/**
 * Property-based test for Functor laws
 */
export function testFunctorLaws<T>(
  adtName: string,
  createADT: (value: any) => T,
  testValues: any[]
): boolean {
  const functor = getTypeclassInstance(adtName, 'Functor') as Functor<any>;
  if (!functor) return true; // Skip if no Functor instance
  
  // Identity law: map(id) = id
  const identityLaw = testValues.every(value => {
    const adt = createADT(value);
    const mapped = functor.map(adt, (x: any) => x);
    return JSON.stringify(mapped) === JSON.stringify(adt);
  });
  
  // Composition law: map(f ∘ g) = map(f) ∘ map(g)
  const compositionLaw = testValues.every(value => {
    const adt = createADT(value);
    const f = (x: any) => x * 2;
    const g = (x: any) => x + 1;
    
    const left = functor.map(adt, (x: any) => f(g(x)));
    const right = functor.map(functor.map(adt, g), f);
    
    return JSON.stringify(left) === JSON.stringify(right);
  });
  
  return identityLaw && compositionLaw;
}

/**
 * Property-based test for Monad laws
 */
export function testMonadLaws<T>(
  adtName: string,
  createADT: (value: any) => T,
  testValues: any[]
): boolean {
  const monad = getTypeclassInstance(adtName, 'Monad') as Monad<any>;
  if (!monad) return true; // Skip if no Monad instance
  
  // Left identity: of(a).chain(f) = f(a)
  const leftIdentityLaw = testValues.every(value => {
    const f = (x: any) => monad.of(x * 2);
    const left = monad.chain(monad.of(value), f);
    const right = f(value);
    return JSON.stringify(left) === JSON.stringify(right);
  });
  
  // Right identity: m.chain(of) = m
  const rightIdentityLaw = testValues.every(value => {
    const adt = createADT(value);
    const left = monad.chain(adt, monad.of);
    return JSON.stringify(left) === JSON.stringify(adt);
  });
  
  // Associativity: m.chain(f).chain(g) = m.chain(x => f(x).chain(g))
  const associativityLaw = testValues.every(value => {
    const adt = createADT(value);
    const f = (x: any) => monad.of(x * 2);
    const g = (x: any) => monad.of(x + 1);
    
    const left = monad.chain(monad.chain(adt, f), g);
    const right = monad.chain(adt, (x: any) => monad.chain(f(x), g));
    
    return JSON.stringify(left) === JSON.stringify(right);
  });
  
  return leftIdentityLaw && rightIdentityLaw && associativityLaw;
}

/**
 * Test fluent vs data-last equivalence
 */
export function testFluentDataLastEquivalence<T>(
  adtName: string,
  createADT: (value: any) => T,
  testValues: any[]
): boolean {
  const functor = getTypeclassInstance(adtName, 'Functor') as Functor<any>;
  const monad = getTypeclassInstance(adtName, 'Monad') as Monad<any>;
  
  if (!functor) return true;
  
  // Test map equivalence
  const mapEquivalence = testValues.every(value => {
    const adt = createADT(value);
    const f = (x: any) => x * 2;
    
    const fluentResult = (adt as any).map(f);
    const dataLastResult = functor.map(adt, f);
    
    return JSON.stringify(fluentResult) === JSON.stringify(dataLastResult);
  });
  
  // Test chain equivalence
  const chainEquivalence = monad ? testValues.every(value => {
    const adt = createADT(value);
    const f = (x: any) => monad.of(x * 2);
    
    const fluentResult = (adt as any).chain(f);
    const dataLastResult = monad.chain(adt, f);
    
    return JSON.stringify(fluentResult) === JSON.stringify(dataLastResult);
  }) : true;
  
  return mapEquivalence && chainEquivalence;
}

// ============================================================================
// Part 7: Auto-initialization
// ============================================================================

// Apply fluent API to all ADTs on module load
applyFluentAPIToAllADTs();

// Export for manual testing
export {
  testFunctorLaws,
  testMonadLaws,
  testFluentDataLastEquivalence
}; 