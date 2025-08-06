/**
 * Traversals for Collections & Nested Structures
 * 
 * This module provides Traversals as first-class optics for focusing on multiple
 * elements in a structure, completing the core Optics family alongside Lens, Prism, and Optional.
 * 
 * Features:
 * - Traversal type definition with full HKT + Purity integration
 * - Fluent composition with other optics
 * - Built-in traversals for collections (Array, Tuple, Maybe, Either)
 * - Recursive traversal support for nested structures
 * - Law-compliant implementations
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either, Result
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker,
  composeEffects
} from './fp-purity';

import {
  Lens, Prism, Optional, BaseOptic,
  lens, prism, optional,
  markPure, markAsync, markIO
} from './fp-optics-core';

// ============================================================================
// Part 1: Traversal Type Definition
// ============================================================================

/**
 * Traversal — focus on zero or more elements in a structure
 * A traversal can focus on multiple parts of a structure and modify them all
 */
export interface Traversal<S, T, A, B> extends BaseOptic<S, T, A, B> {
  readonly __type: 'Traversal';
  
  // Core traversal operations
  modify(f: (a: A) => B, s: S): T;
  over(s: S, f: (a: A) => B): T;
  map(s: S, f: (a: A) => B): T;
  getAll(s: S): A[];
  
  // Traversal-specific operations
  setAll(value: B, s: S): T;
  collect<R>(s: S, f: (a: A) => R): R[];
  fold<R>(s: S, initial: R, reducer: (acc: R, a: A) => R): R;
  foldMap<M>(s: S, monoid: Monoid<M>, f: (a: A) => M): M;
  all(s: S, predicate: (a: A) => boolean): boolean;
  any(s: S, predicate: (a: A) => boolean): boolean;
  find(s: S, predicate: (a: A) => boolean): Maybe<A>;
  head(s: S): Maybe<A>;
  last(s: S): Maybe<A>;
  
  // Composition with other optics
  then<S2, T2, A2, B2>(
    next: Traversal<A, B, A2, B2> | Lens<A, B, A2, B2> | Prism<A, B, A2, B2> | Optional<A, B, A2, B2>
  ): Traversal<S, T, A2, B2>;
  
  composeTraversal<A2, B2>(traversal: Traversal<A, B, A2, B2>): Traversal<S, T, A2, B2>;
  composeLens<A2, B2>(lens: Lens<A, B, A2, B2>): Traversal<S, T, A2, B2>;
  composePrism<A2, B2>(prism: Prism<A, B, A2, B2>): Traversal<S, T, A2, B2>;
  composeOptional<A2, B2>(optional: Optional<A, B, A2, B2>): Traversal<S, T, A2, B2>;
}

/**
 * Monoid interface for foldMap operations
 */
export interface Monoid<A> {
  empty(): A;
  concat(a: A, b: A): A;
}

/**
 * Enhanced Traversal with additional operations
 */
export interface EnhancedTraversal<S, T, A, B> extends Traversal<S, T, A, B> {
  // Chainable operations
  take(count: number): EnhancedTraversal<S, T, A, B>;
  drop(count: number): EnhancedTraversal<S, T, A, B>;
  slice(start: number, end?: number): EnhancedTraversal<S, T, A, B>;
  reverse(): EnhancedTraversal<S, T, A, B>;
  filter(predicate: (a: A) => boolean): EnhancedTraversal<S, T, A, B>;
  sortBy(fn: (a: A) => any): EnhancedTraversal<S, T, A, B>;
  distinct(): EnhancedTraversal<S, T, A, B>;
  
  // Terminal operations
  reduce<R>(reducer: (acc: R, a: A) => R, initial: R): (s: S) => R;
  foldMap<M>(monoid: Monoid<M>, fn: (a: A) => M): (s: S) => M;
  all(predicate: (a: A) => boolean): (s: S) => boolean;
  any(predicate: (a: A) => boolean): (s: S) => boolean;
}

// ============================================================================
// Part 2: Traversal Constructor
// ============================================================================

/**
 * Create a traversal from modify and getAll functions
 */
export function traversal<S, T, A, B>(
  modifyFn: (f: (a: A) => B, s: S) => T,
  getAllFn: (s: S) => A[]
): Traversal<S, T, A, B> {
  const optic: Traversal<S, T, A, B> = {
    __type: 'Traversal',
    __effect: 'Pure',
    __kind: {} as any,
    
    // Core operations
    modify: modifyFn,
    over: (s: S, f: (a: A) => B) => modifyFn(f, s),
    map: (s: S, f: (a: A) => B) => modifyFn(f, s),
    getAll: getAllFn,
    
    // BaseOptic operations
    get: (s: S) => getAllFn(s),
    getOption: (s: S) => {
      const all = getAllFn(s);
      return all.length > 0 ? Maybe.Just(all) : Maybe.Nothing();
    },
    set: (b: B) => (s: S) => modifyFn(() => b, s),
    modify: (f: (a: A) => B) => (s: S) => modifyFn(f, s),
    
    // Traversal-specific operations
    setAll: (value: B, s: S) => modifyFn(() => value, s),
    collect: <R>(s: S, f: (a: A) => R) => getAllFn(s).map(f),
    fold: <R>(s: S, initial: R, reducer: (acc: R, a: A) => R) => 
      getAllFn(s).reduce(reducer, initial),
    foldMap: <M>(s: S, monoid: Monoid<M>, f: (a: A) => M) => {
      const values = getAllFn(s);
      return values.reduce((acc, a) => monoid.concat(acc, f(a)), monoid.empty());
    },
    all: (s: S, predicate: (a: A) => boolean) => 
      getAllFn(s).every(predicate),
    any: (s: S, predicate: (a: A) => boolean) => 
      getAllFn(s).some(predicate),
    find: (s: S, predicate: (a: A) => boolean) => {
      const found = getAllFn(s).find(predicate);
      return found !== undefined ? Maybe.Just(found) : Maybe.Nothing();
    },
    head: (s: S) => {
      const all = getAllFn(s);
      return all.length > 0 ? Maybe.Just(all[0]) : Maybe.Nothing();
    },
    last: (s: S) => {
      const all = getAllFn(s);
      return all.length > 0 ? Maybe.Just(all[all.length - 1]) : Maybe.Nothing();
    },
    
    // Composition
    then: <S2, T2, A2, B2>(next: any) => composeTraversalWithOptic(optic, next),
    composeTraversal: <A2, B2>(traversal: Traversal<A, B, A2, B2>) => 
      composeTraversalTraversal(optic, traversal),
    composeLens: <A2, B2>(lens: Lens<A, B, A2, B2>) => 
      composeTraversalLens(optic, lens),
    composePrism: <A2, B2>(prism: Prism<A, B, A2, B2>) => 
      composeTraversalPrism(optic, prism),
    composeOptional: <A2, B2>(optional: Optional<A, B, A2, B2>) => 
      composeTraversalOptional(optic, optional),
    
    // Optional-specific operations (always true for Traversal)
    exists: (predicate: (a: A) => boolean) => (s: S) => 
      getAllFn(s).some(predicate),
    forall: (predicate: (a: A) => boolean) => (s: S) => 
      getAllFn(s).every(predicate)
  };
  
  return optic;
}

// ============================================================================
// Part 3: Built-in Traversals for Collections
// ============================================================================

/**
 * Traversal for arrays
 */
export function arrayTraversal<S extends any[], T extends any[], A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (f: (a: A) => B, s: S) => s.map(f) as T,
    (s: S) => s as A[]
  );
}

/**
 * Traversal for tuples
 */
export function tupleTraversal<S extends readonly any[], T extends readonly any[], A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (f: (a: A) => B, s: S) => s.map(f) as T,
    (s: S) => s as A[]
  );
}

/**
 * Traversal for Maybe (traverses Just values only)
 */
export function maybeTraversal<S extends Maybe<any>, T extends Maybe<any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (f: (a: A) => B, s: S) => {
      return Maybe.match(s, {
        Just: (value) => Maybe.Just(f(value)) as T,
        Nothing: () => s as T
      });
    },
    (s: S) => {
      return Maybe.match(s, {
        Just: (value) => [value] as A[],
        Nothing: () => [] as A[]
      });
    }
  );
}

/**
 * Traversal for Either (traverses Right values only)
 */
export function eitherTraversal<S extends Either<any, any>, T extends Either<any, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (f: (a: A) => B, s: S) => {
      return Either.match(s, {
        Left: (value) => s as T,
        Right: (value) => Either.Right(f(value)) as T
      });
    },
    (s: S) => {
      return Either.match(s, {
        Left: () => [] as A[],
        Right: (value) => [value] as A[]
      });
    }
  );
}

/**
 * Traversal for object values
 */
export function valuesTraversal<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (f: (a: A) => B, s: S) => {
      const result = {} as T;
      for (const [key, value] of Object.entries(s)) {
        result[key] = f(value);
      }
      return result;
    },
    (s: S) => Object.values(s) as A[]
  );
}

/**
 * Traversal for object keys
 */
export function keysTraversal<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (f: (a: A) => B, s: S) => {
      const result = {} as T;
      for (const key of Object.keys(s)) {
        const newKey = f(key);
        result[newKey] = s[key];
      }
      return result;
    },
    (s: S) => Object.keys(s) as A[]
  );
}

/**
 * Traversal for nested arrays
 */
export function nestedArrayTraversal<S extends any[][], T extends any[][], A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (f: (a: A) => B, s: S) => s.map(arr => arr.map(f)) as T,
    (s: S) => s.flat() as A[]
  );
}

// ============================================================================
// Part 4: Cross-Kind Composition
// ============================================================================

/**
 * Compose traversal with any optic
 */
export function composeTraversalWithOptic<S, T, A, B, A2, B2>(
  traversal: Traversal<S, T, A, B>,
  next: Traversal<A, B, A2, B2> | Lens<A, B, A2, B2> | Prism<A, B, A2, B2> | Optional<A, B, A2, B2>
): Traversal<S, T, A2, B2> {
  if (next.__type === 'Traversal') {
    return composeTraversalTraversal(traversal, next as Traversal<A, B, A2, B2>);
  } else if (next.__type === 'Lens') {
    return composeTraversalLens(traversal, next as Lens<A, B, A2, B2>);
  } else if (next.__type === 'Prism') {
    return composeTraversalPrism(traversal, next as Prism<A, B, A2, B2>);
  } else {
    return composeTraversalOptional(traversal, next as Optional<A, B, A2, B2>);
  }
}

/**
 * Traversal → Traversal = Traversal
 */
export function composeTraversalTraversal<S, T, A, B, A2, B2>(
  outer: Traversal<S, T, A, B>,
  inner: Traversal<A, B, A2, B2>
): Traversal<S, T, A2, B2> {
  return traversal<S, T, A2, B2>(
    (f: (a: A2) => B2, s: S) => {
      return outer.modify((a: A) => inner.modify(f, a), s);
    },
    (s: S) => {
      const outerValues = outer.getAll(s);
      return outerValues.flatMap(a => inner.getAll(a));
    }
  );
}

/**
 * Traversal → Lens = Traversal
 */
export function composeTraversalLens<S, T, A, B, A2, B2>(
  outer: Traversal<S, T, A, B>,
  inner: Lens<A, B, A2, B2>
): Traversal<S, T, A2, B2> {
  return traversal<S, T, A2, B2>(
    (f: (a: A2) => B2, s: S) => {
      return outer.modify((a: A) => inner.modify(f)(a), s);
    },
    (s: S) => {
      const outerValues = outer.getAll(s);
      return outerValues.map(a => inner.get(a));
    }
  );
}

/**
 * Traversal → Prism = Traversal
 */
export function composeTraversalPrism<S, T, A, B, A2, B2>(
  outer: Traversal<S, T, A, B>,
  inner: Prism<A, B, A2, B2>
): Traversal<S, T, A2, B2> {
  return traversal<S, T, A2, B2>(
    (f: (a: A2) => B2, s: S) => {
      return outer.modify((a: A) => inner.modify(f)(a), s);
    },
    (s: S) => {
      const outerValues = outer.getAll(s);
      return outerValues.flatMap(a => {
        const maybe = inner.getOption(a);
        return Maybe.match(maybe, {
          Just: (value) => [value],
          Nothing: () => []
        });
      });
    }
  );
}

/**
 * Traversal → Optional = Traversal
 */
export function composeTraversalOptional<S, T, A, B, A2, B2>(
  outer: Traversal<S, T, A, B>,
  inner: Optional<A, B, A2, B2>
): Traversal<S, T, A2, B2> {
  return traversal<S, T, A2, B2>(
    (f: (a: A2) => B2, s: S) => {
      return outer.modify((a: A) => inner.modify(f)(a), s);
    },
    (s: S) => {
      const outerValues = outer.getAll(s);
      return outerValues.flatMap(a => {
        const maybe = inner.getOption(a);
        return Maybe.match(maybe, {
          Just: (value) => [value],
          Nothing: () => []
        });
      });
    }
  );
}

// ============================================================================
// Part 5: Enhanced Traversal Operations
// ============================================================================

/**
 * Enhanced traversal with chainable operations
 */
export function enhancedTraversal<S, T, A, B>(
  baseTraversal: Traversal<S, T, A, B>
): EnhancedTraversal<S, T, A, B> {
  return {
    ...baseTraversal,
    
    // Chainable operations
    take: (count: number) => {
      return enhancedTraversal(traversal<S, T, A, B>(
        (f: (a: A) => B, s: S) => {
          const all = baseTraversal.getAll(s);
          const taken = all.slice(0, count);
          return baseTraversal.modify((a: A, i: number) => 
            i < count ? f(a) : a, s);
        },
        (s: S) => baseTraversal.getAll(s).slice(0, count)
      ));
    },
    
    drop: (count: number) => {
      return enhancedTraversal(traversal<S, T, A, B>(
        (f: (a: A) => B, s: S) => {
          const all = baseTraversal.getAll(s);
          return baseTraversal.modify((a: A, i: number) => 
            i >= count ? f(a) : a, s);
        },
        (s: S) => baseTraversal.getAll(s).slice(count)
      ));
    },
    
    slice: (start: number, end?: number) => {
      return enhancedTraversal(traversal<S, T, A, B>(
        (f: (a: A) => B, s: S) => {
          const all = baseTraversal.getAll(s);
          const sliced = all.slice(start, end);
          return baseTraversal.modify((a: A, i: number) => 
            i >= start && (end === undefined || i < end) ? f(a) : a, s);
        },
        (s: S) => baseTraversal.getAll(s).slice(start, end)
      ));
    },
    
    reverse: () => {
      return enhancedTraversal(traversal<S, T, A, B>(
        (f: (a: A) => B, s: S) => {
          const all = baseTraversal.getAll(s);
          const reversed = all.reverse();
          return baseTraversal.modify((a: A, i: number) => f(reversed[i]), s);
        },
        (s: S) => baseTraversal.getAll(s).reverse()
      ));
    },
    
    filter: (predicate: (a: A) => boolean) => {
      return enhancedTraversal(traversal<S, T, A, B>(
        (f: (a: A) => B, s: S) => {
          const all = baseTraversal.getAll(s);
          return baseTraversal.modify((a: A) => 
            predicate(a) ? f(a) : a, s);
        },
        (s: S) => baseTraversal.getAll(s).filter(predicate)
      ));
    },
    
    sortBy: (fn: (a: A) => any) => {
      return enhancedTraversal(traversal<S, T, A, B>(
        (f: (a: A) => B, s: S) => {
          const all = baseTraversal.getAll(s);
          const sorted = all.sort((a, b) => {
            const aVal = fn(a);
            const bVal = fn(b);
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          });
          return baseTraversal.modify((a: A, i: number) => f(sorted[i]), s);
        },
        (s: S) => baseTraversal.getAll(s).sort((a, b) => {
          const aVal = fn(a);
          const bVal = fn(b);
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        })
      ));
    },
    
    distinct: () => {
      return enhancedTraversal(traversal<S, T, A, B>(
        (f: (a: A) => B, s: S) => {
          const all = baseTraversal.getAll(s);
          const distinct = all.filter((item, index) => all.indexOf(item) === index);
          return baseTraversal.modify((a: A) => {
            const index = distinct.indexOf(a);
            return index >= 0 ? f(distinct[index]) : a;
          }, s);
        },
        (s: S) => {
          const all = baseTraversal.getAll(s);
          return all.filter((item, index) => all.indexOf(item) === index);
        }
      ));
    },
    
    // Terminal operations
    reduce: <R>(reducer: (acc: R, a: A) => R, initial: R) => (s: S) => 
      baseTraversal.fold(s, initial, reducer),
    
    foldMap: <M>(monoid: Monoid<M>, fn: (a: A) => M) => (s: S) => 
      baseTraversal.foldMap(s, monoid, fn),
    
    all: (predicate: (a: A) => boolean) => (s: S) => 
      baseTraversal.all(s, predicate),
    
    any: (predicate: (a: A) => boolean) => (s: S) => 
      baseTraversal.any(s, predicate)
  };
}

// ============================================================================
// Part 6: Helper Functions
// ============================================================================

/**
 * Modify all targets of a traversal
 */
export function modifyOf<S, T, A, B>(
  traversal: Traversal<S, T, A, B>,
  f: (a: A) => B
): (s: S) => T {
  return (s: S) => traversal.modify(f, s);
}

/**
 * Set all targets of a traversal
 */
export function setOf<S, T, A, B>(
  traversal: Traversal<S, T, A, B>,
  value: B
): (s: S) => T {
  return (s: S) => traversal.setAll(value, s);
}

/**
 * Alias for modifyOf
 */
export function overOf<S, T, A, B>(
  traversal: Traversal<S, T, A, B>,
  f: (a: A) => B
): (s: S) => T {
  return modifyOf(traversal, f);
}

/**
 * Collect all focused values of a traversal
 */
export function getAllOf<S, T, A, B>(
  traversal: Traversal<S, T, A, B>,
  s: S
): A[] {
  return traversal.getAll(s);
}

/**
 * Fold all values using a reducer
 */
export function foldOf<S, T, A, B, R>(
  traversal: Traversal<S, T, A, B>,
  reducer: (acc: R, a: A) => R,
  initial: R,
  s: S
): R {
  return traversal.fold(s, initial, reducer);
}

/**
 * Fold all values using a monoid
 */
export function foldMapOf<S, T, A, B, M>(
  traversal: Traversal<S, T, A, B>,
  monoid: Monoid<M>,
  f: (a: A) => M,
  s: S
): M {
  return traversal.foldMap(s, monoid, f);
}

// ============================================================================
// Part 7: Purity and HKT Integration
// ============================================================================

/**
 * Mark traversal as pure
 */
export function markTraversalPure<S, T, A, B>(
  traversal: Traversal<S, T, A, B>
): Traversal<S, T, A, B> & { readonly __effect: 'Pure' } {
  return markPure(traversal) as any;
}

/**
 * Mark traversal as async
 */
export function markTraversalAsync<S, T, A, B>(
  traversal: Traversal<S, T, A, B>
): Traversal<S, T, A, B> & { readonly __effect: 'Async' } {
  return markAsync(traversal) as any;
}

/**
 * Mark traversal as IO
 */
export function markTraversalIO<S, T, A, B>(
  traversal: Traversal<S, T, A, B>
): Traversal<S, T, A, B> & { readonly __effect: 'IO' } {
  return markIO(traversal) as any;
}

// ============================================================================
// Part 8: Type Helpers
// ============================================================================

/**
 * Extract effect from traversal
 */
export type EffectOfTraversal<T> = T extends Traversal<any, any, any, any> 
  ? T extends { readonly __effect: infer E } 
    ? E 
    : 'Pure'
  : 'Pure';

/**
 * Extract source type from traversal
 */
export type SourceOfTraversal<T> = T extends Traversal<infer S, any, any, any> ? S : never;

/**
 * Extract target type from traversal
 */
export type TargetOfTraversal<T> = T extends Traversal<any, infer T, any, any> ? T : never;

/**
 * Extract focus type from traversal
 */
export type FocusOfTraversal<T> = T extends Traversal<any, any, infer A, any> ? A : never;

/**
 * Extract focus target type from traversal
 */
export type FocusTargetOfTraversal<T> = T extends Traversal<any, any, any, infer B> ? B : never;

/**
 * Check if traversal is pure
 */
export type IsTraversalPure<T> = EffectOfTraversal<T> extends 'Pure' ? true : false;

/**
 * Check if traversal is async
 */
export type IsTraversalAsync<T> = EffectOfTraversal<T> extends 'Async' ? true : false;

/**
 * Check if traversal is IO
 */
export type IsTraversalIO<T> = EffectOfTraversal<T> extends 'IO' ? true : false;

// ============================================================================
// Part 9: Export All
// ============================================================================

export {
  // Core types
  Traversal,
  EnhancedTraversal,
  Monoid,
  
  // Constructor
  traversal,
  enhancedTraversal,
  
  // Built-in traversals
  arrayTraversal,
  tupleTraversal,
  maybeTraversal,
  eitherTraversal,
  valuesTraversal,
  keysTraversal,
  nestedArrayTraversal,
  
  // Cross-kind composition
  composeTraversalWithOptic,
  composeTraversalTraversal,
  composeTraversalLens,
  composeTraversalPrism,
  composeTraversalOptional,
  
  // Helper functions
  modifyOf,
  setOf,
  overOf,
  getAllOf,
  foldOf,
  foldMapOf,
  
  // Purity integration
  markTraversalPure,
  markTraversalAsync,
  markTraversalIO,
  
  // Type helpers
  EffectOfTraversal,
  SourceOfTraversal,
  TargetOfTraversal,
  FocusOfTraversal,
  FocusTargetOfTraversal,
  IsTraversalPure,
  IsTraversalAsync,
  IsTraversalIO
}; 