/**
 * Structural Immutability Utilities
 * 
 * This module provides comprehensive immutability utilities for arrays, objects, and tuples
 * with type-level tracking so the Purity System can detect and propagate immutability guarantees.
 * 
 * Features:
 * - Core type-level definitions (Immutable<T>, DeepReadonly<T>, IsImmutable<T>)
 * - Immutable constructors for arrays, objects, and tuples
 * - Safe update utilities that never mutate
 * - Integration with purity system (defaults to Pure)
 * - Typeclass integration (ImmutableFunctor, ImmutableMonad)
 * - Readonly pattern matching support
 * - Compile-time immutability enforcement
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
  PurityContext, PurityError, PurityResult,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

import { 
  deriveInstances, 
  deriveEqInstance, 
  deriveOrdInstance, 
  deriveShowInstance 
} from './fp-derivation-helpers';

// ============================================================================
// Part 1: Core Type-Level Definitions
// ============================================================================

/**
 * Recursively marks all fields as readonly, ensuring array/tuple elements are immutable too
 * 
 * @example
 * ```typescript
 * type ImmutableUser = Immutable<{
 *   name: string;
 *   age: number;
 *   hobbies: string[];
 *   address: { city: string; country: string; }
 * }>;
 * 
 * // Results in:
 * // {
 * //   readonly name: string;
 * //   readonly age: number;
 * //   readonly hobbies: readonly string[];
 * //   readonly address: {
 * //     readonly city: string;
 * //     readonly country: string;
 * //   };
 * // }
 * ```
 */
export type Immutable<T> = T extends readonly (infer U)[]
  ? readonly Immutable<U>[]
  : T extends readonly [...infer Head, ...infer Tail]
  ? readonly [...Immutable<Head>, ...Immutable<Tail>]
  : T extends readonly [infer First, ...infer Rest]
  ? readonly [Immutable<First>, ...Immutable<Rest>]
  : T extends readonly []
  ? readonly []
  : T extends (infer U)[]
  ? readonly Immutable<U>[]
  : T extends [...infer Head, ...infer Tail]
  ? readonly [...Immutable<Head>, ...Immutable<Tail>]
  : T extends [infer First, ...infer Rest]
  ? readonly [Immutable<First>, ...Immutable<Rest>]
  : T extends []
  ? readonly []
  : T extends object
  ? { readonly [K in keyof T]: Immutable<T[K]> }
  : T;

/**
 * Synonym for Immutable<T>, but keeps naming consistent with TS style
 */
export type DeepReadonly<T> = Immutable<T>;

/**
 * Resolves to true if T is Immutable, false otherwise
 * 
 * @example
 * ```typescript
 * type Check1 = IsImmutable<readonly number[]>; // true
 * type Check2 = IsImmutable<number[]>; // false
 * type Check3 = IsImmutable<{ readonly a: number }>; // true
 * type Check4 = IsImmutable<{ a: number }>; // false
 * ```
 */
export type IsImmutable<T> = T extends Immutable<T> ? true : false;

/**
 * Phantom kind to tag an HKT as producing immutable structures
 */
export interface ImmutableKind<T> {
  readonly __immutableBrand: unique symbol;
  readonly type: Immutable<T>;
}

/**
 * Branded type for immutable values with runtime immutability guarantee
 */
export interface ImmutableBrand {
  readonly __immutableBrand: unique symbol;
}

/**
 * Type that combines immutability with a branded guarantee
 */
export type ImmutableValue<T> = Immutable<T> & ImmutableBrand;

/**
 * Check if a type is an immutable value (branded)
 */
export type IsImmutableValue<T> = T extends ImmutableBrand ? true : false;

/**
 * Extract the underlying type from an immutable value
 */
export type ExtractImmutableType<T> = T extends ImmutableValue<infer U> ? U : T;

// ============================================================================
// Part 2: Integration with Purity System
// ============================================================================

/**
 * Extend the purity system to recognize immutable types as Pure
 */
declare module './fp-purity' {
  interface EffectKind<Tag extends EffectTag> {
    readonly __immutableBrand?: ImmutableBrand;
  }
}

/**
 * Immutable type with purity integration
 */
export interface ImmutableWithPurity<T, P extends EffectTag = 'Pure'> {
  readonly value: Immutable<T>;
  readonly effect: P;
  readonly __immutableBrand: ImmutableBrand;
}

/**
 * Create an immutable value with purity information
 */
export function createImmutableWithPurity<T, P extends EffectTag = 'Pure'>(
  value: T,
  effect: P = 'Pure' as P
): ImmutableWithPurity<T, P> {
  const immutableValue = deepFreeze(value) as Immutable<T>;
  return {
    value: immutableValue,
    effect,
    __immutableBrand: {} as ImmutableBrand
  };
}

/**
 * Extract the effect from an immutable value
 */
export type EffectOfImmutable<T> = T extends ImmutableWithPurity<any, infer P> ? P : 'Pure';

/**
 * Check if an immutable value is pure
 */
export type IsImmutablePure<T> = EffectOfImmutable<T> extends 'Pure' ? true : false;

// ============================================================================
// Part 3: Immutable Constructors
// ============================================================================

/**
 * Create an immutable array with type safety
 * 
 * @example
 * ```typescript
 * const nums = immutableArray(1, 2, 3);
 * // Type: readonly number[]
 * // No mutation methods like push, pop are available
 * ```
 */
export function immutableArray<T>(...items: Immutable<T>[]): Immutable<T[]> {
  return Object.freeze([...items]) as Immutable<T[]>;
}

/**
 * Create an immutable tuple with type inference
 * 
 * @example
 * ```typescript
 * const tuple = immutableTuple(1, "hello", true);
 * // Type: readonly [number, string, boolean]
 * ```
 */
export function immutableTuple<T extends readonly any[]>(
  ...items: { [K in keyof T]: Immutable<T[K]> }
): Immutable<T> {
  return Object.freeze([...items]) as Immutable<T>;
}

/**
 * Create an immutable object with deep freezing
 * 
 * @example
 * ```typescript
 * const obj = immutableObject({ a: 1, b: { c: 2 } });
 * // Type: { readonly a: number; readonly b: { readonly c: number; } }
 * ```
 */
export function immutableObject<T extends object>(obj: T): Immutable<T> {
  return deepFreeze(obj) as Immutable<T>;
}

/**
 * Create an immutable set
 * 
 * @example
 * ```typescript
 * const set = immutableSet(1, 2, 3);
 * // Type: ReadonlySet<number>
 * ```
 */
export function immutableSet<T>(...items: Immutable<T>[]): ReadonlySet<Immutable<T>> {
  return Object.freeze(new Set(items)) as ReadonlySet<Immutable<T>>;
}

/**
 * Create an immutable map
 * 
 * @example
 * ```typescript
 * const map = immutableMap([["a", 1], ["b", 2]]);
 * // Type: ReadonlyMap<string, number>
 * ```
 */
export function immutableMap<K, V>(
  entries: readonly (readonly [Immutable<K>, Immutable<V>])[]
): ReadonlyMap<Immutable<K>, Immutable<V>> {
  return Object.freeze(new Map(entries)) as ReadonlyMap<Immutable<K>, Immutable<V>>;
}

// ============================================================================
// Part 4: Safe Update Utilities
// ============================================================================

/**
 * Update an immutable array at a specific index
 * Always returns a new array - never mutates
 * 
 * @example
 * ```typescript
 * const nums = immutableArray(1, 2, 3);
 * const updated = updateImmutableArray(nums, 1, 42);
 * // updated: readonly [number, number, number]
 * // nums remains unchanged
 * ```
 */
export function updateImmutableArray<T>(
  arr: Immutable<T[]>,
  index: number,
  value: Immutable<T>
): Immutable<T[]> {
  if (index < 0 || index >= arr.length) {
    throw new Error(`Index ${index} out of bounds for array of length ${arr.length}`);
  }
  
  const newArray = [...arr];
  newArray[index] = value;
  return Object.freeze(newArray) as Immutable<T[]>;
}

/**
 * Update an immutable object at a specific key
 * Always returns a new object - never mutates
 * 
 * @example
 * ```typescript
 * const obj = immutableObject({ a: 1, b: 2 });
 * const updated = updateImmutableObject(obj, 'a', 42);
 * // updated: { readonly a: number; readonly b: number }
 * // obj remains unchanged
 * ```
 */
export function updateImmutableObject<T extends object, K extends keyof T>(
  obj: Immutable<T>,
  key: K,
  value: Immutable<T[K]>
): Immutable<T> {
  return Object.freeze({
    ...obj,
    [key]: value
  }) as Immutable<T>;
}

/**
 * Update an immutable tuple at a specific index
 * Always returns a new tuple - never mutates
 * 
 * @example
 * ```typescript
 * const tuple = immutableTuple(1, "hello", true);
 * const updated = updateImmutableTuple(tuple, 1, "world");
 * // updated: readonly [number, string, boolean]
 * // tuple remains unchanged
 * ```
 */
export function updateImmutableTuple<T extends readonly any[], I extends keyof T>(
  tuple: Immutable<T>,
  index: I,
  value: Immutable<T[I]>
): Immutable<T> {
  if (index < 0 || index >= tuple.length) {
    throw new Error(`Index ${String(index)} out of bounds for tuple of length ${tuple.length}`);
  }
  
  const newTuple = [...tuple] as T;
  newTuple[index] = value;
  return Object.freeze(newTuple) as Immutable<T>;
}

/**
 * Deep merge two immutable objects
 * Always returns a new object - never mutates
 * 
 * @example
 * ```typescript
 * const obj1 = immutableObject({ a: 1, b: { c: 2 } });
 * const obj2 = immutableObject({ b: { d: 3 }, e: 4 });
 * const merged = mergeImmutableObjects(obj1, obj2);
 * // merged: { readonly a: number; readonly b: { readonly c: number; readonly d: number; }; readonly e: number; }
 * ```
 */
export function mergeImmutableObjects<T extends object, U extends object>(
  obj1: Immutable<T>,
  obj2: Immutable<U>
): Immutable<T & U> {
  const merged = { ...obj1 };
  
  for (const [key, value] of Object.entries(obj2)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key as keyof (T & U)] = mergeImmutableObjects(
        merged[key as keyof (T & U)] as object,
        value as object
      ) as (T & U)[keyof (T & U)];
    } else {
      merged[key as keyof (T & U)] = value as (T & U)[keyof (T & U)];
    }
  }
  
  return Object.freeze(merged) as Immutable<T & U>;
}

/**
 * Append to an immutable array
 * Always returns a new array - never mutates
 * 
 * @example
 * ```typescript
 * const nums = immutableArray(1, 2, 3);
 * const appended = appendImmutableArray(nums, 4);
 * // appended: readonly [number, number, number, number]
 * // nums remains unchanged
 * ```
 */
export function appendImmutableArray<T>(
  arr: Immutable<T[]>,
  item: Immutable<T>
): Immutable<T[]> {
  return Object.freeze([...arr, item]) as Immutable<T[]>;
}

/**
 * Prepend to an immutable array
 * Always returns a new array - never mutates
 * 
 * @example
 * ```typescript
 * const nums = immutableArray(1, 2, 3);
 * const prepended = prependImmutableArray(nums, 0);
 * // prepended: readonly [number, number, number, number]
 * // nums remains unchanged
 * ```
 */
export function prependImmutableArray<T>(
  arr: Immutable<T[]>,
  item: Immutable<T>
): Immutable<T[]> {
  return Object.freeze([item, ...arr]) as Immutable<T[]>;
}

/**
 * Remove an item from an immutable array by index
 * Always returns a new array - never mutates
 * 
 * @example
 * ```typescript
 * const nums = immutableArray(1, 2, 3);
 * const removed = removeImmutableArray(nums, 1);
 * // removed: readonly [number, number]
 * // nums remains unchanged
 * ```
 */
export function removeImmutableArray<T>(
  arr: Immutable<T[]>,
  index: number
): Immutable<T[]> {
  if (index < 0 || index >= arr.length) {
    throw new Error(`Index ${index} out of bounds for array of length ${arr.length}`);
  }
  
  const newArray = [...arr];
  newArray.splice(index, 1);
  return Object.freeze(newArray) as Immutable<T[]>;
}

// ============================================================================
// Part 5: Deep Freeze Utility
// ============================================================================

/**
 * Deep freeze an object, making it and all nested objects immutable
 * 
 * @example
 * ```typescript
 * const obj = { a: 1, b: { c: 2, d: [3, 4] } };
 * const frozen = deepFreeze(obj);
 * // frozen and all nested objects are now immutable
 * ```
 */
export function deepFreeze<T>(obj: T): Immutable<T> {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj as Immutable<T>;
  }
  
  // Freeze the object itself
  Object.freeze(obj);
  
  // Freeze all properties
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  
  return obj as Immutable<T>;
}

/**
 * Check if an object is deeply frozen
 * 
 * @example
 * ```typescript
 * const obj = { a: 1, b: { c: 2 } };
 * const frozen = deepFreeze(obj);
 * const isFrozen = isDeeplyFrozen(frozen); // true
 * ```
 */
export function isDeeplyFrozen<T>(obj: T): obj is Immutable<T> {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return true;
  }
  
  if (!Object.isFrozen(obj)) {
    return false;
  }
  
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value && typeof value === 'object' && !isDeeplyFrozen(value)) {
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// Part 6: Typeclass Integration (Derived)
// ============================================================================

/**
 * ImmutableArray derived instances
 */
export const ImmutableArrayInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: Immutable<A[]>, f: (a: A) => B): Immutable<B[]> => {
    return Object.freeze(fa.map(f)) as Immutable<B[]>;
  },
  customChain: <A, B>(fa: Immutable<A[]>, f: (a: A) => Immutable<B[]>): Immutable<B[]> => {
    const result: B[] = [];
    for (const a of fa) {
      const fb = f(a);
      for (const b of fb) {
        result.push(b);
      }
    }
    return Object.freeze(result) as Immutable<B[]>;
  }
});

export const ImmutableArrayFunctor = ImmutableArrayInstances.functor;
export const ImmutableArrayApplicative = ImmutableArrayInstances.applicative;
export const ImmutableArrayMonad = ImmutableArrayInstances.monad;

/**
 * ImmutableArray standard typeclass instances
 */
export const ImmutableArrayEq = deriveEqInstance({
  customEq: <A>(a: Immutable<A[]>, b: Immutable<A[]>): boolean => {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }
});

export const ImmutableArrayOrd = deriveOrdInstance({
  customOrd: <A>(a: Immutable<A[]>, b: Immutable<A[]>): number => {
    const minLength = Math.min(a.length, b.length);
    for (let i = 0; i < minLength; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return a.length - b.length;
  }
});

export const ImmutableArrayShow = deriveShowInstance({
  customShow: <A>(a: Immutable<A[]>): string => 
    `ImmutableArray(${JSON.stringify(a)})`
});

/**
 * Immutable Traversable instance (manual due to complexity)
 */
export const ImmutableArrayTraversable: Traversable<ArrayK> = {
  ...ImmutableArrayFunctor!,
  sequence: <A>(fas: Immutable<A[][]>): Immutable<A[]> => {
    // Simplified implementation - in practice would need proper applicative
    return Object.freeze(fas.flat()) as Immutable<A[]>;
  },
  traverse: <F extends Kind1, A, B>(
    F: Applicative<F>,
    fa: Immutable<A[]>,
    f: (a: A) => Apply<F, [B]>
  ): Apply<F, [Immutable<B[]>]> => {
    // Simplified implementation - in practice would need proper applicative
    return F.of(Object.freeze(fa.map(a => (f(a) as any).value)) as Immutable<B[]>) as any;
  }
};

/**
 * Immutable Foldable instance (manual due to complexity)
 */
export const ImmutableArrayFoldable: Foldable<ArrayK> = {
  reduce: <A, B>(fa: Immutable<A[]>, f: (b: B, a: A) => B, b: B): B => {
    return fa.reduce(f, b);
  },
  foldMap: <M, A>(M: any, fa: Immutable<A[]>, f: (a: A) => M): M => {
    return fa.reduce((acc, a) => M.concat(acc, f(a)), M.empty());
  }
};

// ============================================================================
// Part 7: Readonly Pattern Matching
// ============================================================================

/**
 * Pattern matching for immutable arrays that preserves immutability
 * 
 * @example
 * ```typescript
 * const arr = immutableArray(1, 2, 3);
 * const result = matchImmutableArray(arr, {
 *   Empty: () => 0,
 *   NonEmpty: ([head, ...tail]) => head // tail remains immutable
 * });
 * ```
 */
export function matchImmutableArray<T, R>(
  arr: Immutable<T[]>,
  patterns: {
    Empty: () => R;
    NonEmpty: (head: T, tail: Immutable<T[]>) => R;
  }
): R {
  if (arr.length === 0) {
    return patterns.Empty();
  } else {
    const [head, ...tail] = arr;
    return patterns.NonEmpty(head, Object.freeze(tail) as Immutable<T[]>);
  }
}

/**
 * Pattern matching for immutable objects that preserves immutability
 * 
 * @example
 * ```typescript
 * const obj = immutableObject({ a: 1, b: 2 });
 * const result = matchImmutableObject(obj, {
 *   HasA: (a, rest) => a, // rest remains immutable
 *   NoA: (rest) => 0
 * });
 * ```
 */
export function matchImmutableObject<T extends object, R>(
  obj: Immutable<T>,
  patterns: {
    HasA: (a: T['a'], rest: Immutable<Omit<T, 'a'>>) => R;
    NoA: (rest: Immutable<T>) => R;
  }
): R {
  if ('a' in obj) {
    const { a, ...rest } = obj;
    return patterns.HasA(a as T['a'], Object.freeze(rest) as Immutable<Omit<T, 'a'>>);
  } else {
    return patterns.NoA(obj);
  }
}

/**
 * Pattern matching for immutable tuples that preserves immutability
 * 
 * @example
 * ```typescript
 * const tuple = immutableTuple(1, "hello", true);
 * const result = matchImmutableTuple(tuple, {
 *   Single: (item) => item,
 *   Multiple: (first, rest) => first // rest remains immutable
 * });
 * ```
 */
export function matchImmutableTuple<T extends readonly any[], R>(
  tuple: Immutable<T>,
  patterns: {
    Single: (item: T[0]) => R;
    Multiple: (first: T[0], rest: Immutable<Tail<T>>) => R;
  }
): R {
  if (tuple.length === 1) {
    return patterns.Single(tuple[0]);
  } else {
    const [first, ...rest] = tuple;
    return patterns.Multiple(first, Object.freeze(rest) as Immutable<Tail<T>>);
  }
}

// Helper type for tuple tail
type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : never;

// ============================================================================
// Part 8: Utility Types and Functions
// ============================================================================

/**
 * Convert a mutable type to immutable
 */
export type ToImmutable<T> = Immutable<T>;

/**
 * Convert an immutable type back to mutable (use with caution)
 */
export type ToMutable<T> = T extends Immutable<infer U> ? U : T;

/**
 * Check if two immutable types are equal
 */
export type ImmutableEqual<T, U> = Immutable<T> extends Immutable<U>
  ? Immutable<U> extends Immutable<T>
    ? true
    : false
  : false;

/**
 * Create an immutable copy of a value
 */
export function toImmutable<T>(value: T): Immutable<T> {
  if (Array.isArray(value)) {
    return immutableArray(...value);
  } else if (value && typeof value === 'object') {
    return immutableObject(value);
  } else {
    return value as Immutable<T>;
  }
}

/**
 * Create a mutable copy of an immutable value (use with caution)
 */
export function toMutable<T>(value: Immutable<T>): T {
  if (Array.isArray(value)) {
    return [...value] as T;
  } else if (value && typeof value === 'object') {
    return { ...value } as T;
  } else {
    return value as T;
  }
}

/**
 * Check if a value is immutable at runtime
 */
export function isImmutable<T>(value: T): value is Immutable<T> {
  if (value === null || value === undefined || typeof value !== 'object') {
    return true;
  }
  
  return isDeeplyFrozen(value);
}

/**
 * Create an immutable value with purity tracking
 */
export function createImmutable<T>(
  value: T,
  effect: EffectTag = 'Pure'
): ImmutableWithPurity<T> {
  return createImmutableWithPurity(value, effect);
}

/**
 * Extract the value from an immutable with purity
 */
export function extractImmutableValue<T, P extends EffectTag>(
  immutable: ImmutableWithPurity<T, P>
): Immutable<T> {
  return immutable.value;
}

/**
 * Extract the effect from an immutable with purity
 */
export function extractImmutableEffect<T, P extends EffectTag>(
  immutable: ImmutableWithPurity<T, P>
): P {
  return immutable.effect;
}

// ============================================================================
// Part 9: Laws Documentation
// ============================================================================

/**
 * Immutability Laws:
 * 
 * 1. **Immutability Law**: Immutable values cannot be mutated
 *    - No mutation methods available on immutable arrays
 *    - Object properties cannot be reassigned
 *    - Tuple elements cannot be modified
 * 
 * 2. **Identity Law**: Immutable values maintain identity under operations
 *    - updateImmutableArray(arr, i, v) !== arr
 *    - updateImmutableObject(obj, k, v) !== obj
 *    - updateImmutableTuple(tuple, i, v) !== tuple
 * 
 * 3. **Purity Law**: Immutable values default to Pure effect
 *    - EffectOf<Immutable<T>> = "Pure"
 *    - IsImmutablePure<Immutable<T>> = true
 * 
 * 4. **Composition Law**: Immutable operations compose
 *    - updateImmutableArray(updateImmutableArray(arr, i, v1), j, v2) = updateImmutableArray(arr, i, v1, j, v2)
 *    - updateImmutableObject(updateImmutableObject(obj, k1, v1), k2, v2) = updateImmutableObject(obj, k1, v1, k2, v2)
 * 
 * 5. **Type Safety Law**: Type-level immutability is enforced
 *    - IsImmutable<Immutable<T>> = true
 *    - IsImmutable<T> = false (for mutable T)
 * 
 * 6. **Deep Freeze Law**: Deep freeze makes all nested structures immutable
 *    - isDeeplyFrozen(deepFreeze(obj)) = true
 *    - All nested objects and arrays are also frozen
 * 
 * 7. **Pattern Matching Law**: Pattern matching preserves immutability
 *    - matchImmutableArray preserves tail immutability
 *    - matchImmutableObject preserves rest immutability
 *    - matchImmutableTuple preserves rest immutability
 * 
 * 8. **Typeclass Law**: Immutable typeclasses respect immutability
 *    - ImmutableArrayFunctor.map returns immutable array
 *    - ImmutableArrayMonad.chain returns immutable array
 *    - All operations preserve immutability guarantees
 */ 