/**
 * Readonly-Aware Pattern Matching
 * 
 * This module provides generic pattern matching utilities for readonly collections
 * and immutable structures with automatic readonly inference and exhaustive checking.
 * 
 * Features:
 * - Generic match utilities for readonly collections
 * - Readonly-aware tuple destructuring
 * - Nested readonly patterns
 * - Integration with existing GADT matchers
 * - Exhaustiveness checking
 * - Type-safe wildcard support
 * - Curryable API
 */

import {
  PersistentList, PersistentMap, PersistentSet,
  matchList as matchPersistentListBase,
  destructureList
} from './fp-persistent';

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
  DeepImmutable, ImmutableArray
} from './fp-immutable';

// ============================================================================
// Part 1: Type Utilities for Readonly Pattern Matching
// ============================================================================

/**
 * Extract readonly element type from a readonly array
 */
export type ReadonlyArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Extract readonly tuple elements
 */
export type ReadonlyTupleElements<T> = T extends readonly [infer First, ...infer Rest] 
  ? [First, ...ReadonlyTupleElements<Rest>] 
  : [];

/**
 * Ensure a type is readonly
 */
export type EnsureReadonly<T> = T extends readonly any[] ? T : readonly T[];

/**
 * Pattern matching result type - union of all branch return types
 */
export type PatternMatchResult<Patterns> = Patterns[keyof Patterns] extends (...args: any[]) => infer R ? R : never;

/**
 * Readonly pattern matcher for collections
 */
export type ReadonlyPatternMatcher<T, R> = {
  [K in keyof T]: (value: T[K]) => R;
};

/**
 * Partial readonly pattern matcher
 */
export type PartialReadonlyPatternMatcher<T, R> = Partial<ReadonlyPatternMatcher<T, R>>;

/**
 * Curryable pattern matcher function
 */
export type CurryablePatternMatcher<T, R> = (value: T) => R;

// ============================================================================
// Part 2: Generic Readonly Collection Pattern Matching
// ============================================================================

/**
 * Generic pattern matcher for readonly arrays
 */
export function matchReadonlyArray<T, R>(
  array: readonly T[],
  patterns: {
    empty: () => R;
    nonEmpty: (head: T, tail: readonly T[]) => R;
  }
): R {
  if (array.length === 0) {
    return patterns.empty();
  }
  
  const [head, ...tail] = array;
  return patterns.nonEmpty(head, tail);
}

/**
 * Generic pattern matcher for PersistentList
 */
export function matchPersistentList<T, R>(
  list: PersistentList<T>,
  patterns: {
    empty: () => R;
    cons: (head: T, tail: PersistentList<T>) => R;
  }
): R {
  return matchPersistentListBase(list, patterns);
}

/**
 * Generic pattern matcher for PersistentMap
 */
export function matchPersistentMap<K, V, R>(
  map: PersistentMap<K, V>,
  patterns: {
    empty: () => R;
    nonEmpty: (firstKey: K, firstValue: V, rest: PersistentMap<K, V>) => R;
  }
): R {
  if (map.isEmpty()) {
    return patterns.empty();
  }
  
  const entries = Array.from(map.entries());
  const [firstKey, firstValue] = entries[0];
  const rest = PersistentMap.fromEntries(entries.slice(1));
  
  return patterns.nonEmpty(firstKey, firstValue, rest);
}

/**
 * Generic pattern matcher for PersistentSet
 */
export function matchPersistentSet<T, R>(
  set: PersistentSet<T>,
  patterns: {
    empty: () => R;
    nonEmpty: (first: T, rest: PersistentSet<T>) => R;
  }
): R {
  if (set.isEmpty()) {
    return patterns.empty();
  }
  
  const values = Array.from(set);
  const first = values[0];
  const rest = PersistentSet.fromArray(values.slice(1));
  
  return patterns.nonEmpty(first, rest);
}

// ============================================================================
// Part 3: Readonly Tuple Pattern Matching
// ============================================================================

/**
 * Pattern matcher for readonly tuples of length 2
 */
export function matchTuple2<T1, T2, R>(
  tuple: readonly [T1, T2],
  pattern: (first: T1, second: T2) => R
): R {
  const [first, second] = tuple;
  return pattern(first, second);
}

/**
 * Pattern matcher for readonly tuples of length 3
 */
export function matchTuple3<T1, T2, T3, R>(
  tuple: readonly [T1, T2, T3],
  pattern: (first: T1, second: T2, third: T3) => R
): R {
  const [first, second, third] = tuple;
  return pattern(first, second, third);
}

/**
 * Generic pattern matcher for readonly tuples
 */
export function matchTuple<T extends readonly any[], R>(
  tuple: T,
  pattern: (...args: ReadonlyTupleElements<T>) => R
): R {
  return pattern(...tuple);
}

/**
 * Pattern matcher for readonly tuples with wildcard support
 */
export function matchTupleWithWildcard<T extends readonly any[], R>(
  tuple: T,
  pattern: (...args: (any | typeof _)[]) => R
): R {
  return pattern(...tuple);
}

// Wildcard symbol for ignoring parts of patterns
export const _ = Symbol('wildcard');

// ============================================================================
// Part 4: Partial Pattern Matching
// ============================================================================

/**
 * Partial pattern matcher for readonly arrays
 */
export function matchReadonlyArrayPartial<T, R>(
  array: readonly T[],
  patterns: Partial<{
    empty: () => R;
    nonEmpty: (head: T, tail: readonly T[]) => R;
  }>
): R | undefined {
  if (array.length === 0) {
    return patterns.empty?.();
  }
  
  const [head, ...tail] = array;
  return patterns.nonEmpty?.(head, tail);
}

/**
 * Partial pattern matcher for PersistentList
 */
export function matchPersistentListPartial<T, R>(
  list: PersistentList<T>,
  patterns: Partial<{
    empty: () => R;
    cons: (head: T, tail: PersistentList<T>) => R;
  }>
): R | undefined {
  if (list.isEmpty()) {
    return patterns.empty?.();
  }
  
  const head = list.head();
  const tail = list.tail();
  
  if (head === undefined) {
    return patterns.empty?.();
  }
  
  return patterns.cons?.(head, tail);
}

/**
 * Partial pattern matcher for PersistentMap
 */
export function matchPersistentMapPartial<K, V, R>(
  map: PersistentMap<K, V>,
  patterns: Partial<{
    empty: () => R;
    nonEmpty: (firstKey: K, firstValue: V, rest: PersistentMap<K, V>) => R;
  }>
): R | undefined {
  if (map.isEmpty()) {
    return patterns.empty?.();
  }
  
  const entries = Array.from(map.entries());
  const [firstKey, firstValue] = entries[0];
  const rest = PersistentMap.fromEntries(entries.slice(1));
  
  return patterns.nonEmpty?.(firstKey, firstValue, rest);
}

/**
 * Partial pattern matcher for PersistentSet
 */
export function matchPersistentSetPartial<T, R>(
  set: PersistentSet<T>,
  patterns: Partial<{
    empty: () => R;
    nonEmpty: (first: T, rest: PersistentSet<T>) => R;
  }>
): R | undefined {
  if (set.isEmpty()) {
    return patterns.empty?.();
  }
  
  const values = Array.from(set);
  const first = values[0];
  const rest = PersistentSet.fromArray(values.slice(1));
  
  return patterns.nonEmpty?.(first, rest);
}

// ============================================================================
// Part 5: Nested Readonly Pattern Matching
// ============================================================================

/**
 * Nested pattern matcher for readonly arrays of readonly arrays
 */
export function matchNestedReadonlyArray<T, R>(
  array: readonly (readonly T[])[],
  patterns: {
    empty: () => R;
    nonEmpty: (head: readonly T[], tail: readonly (readonly T[])[]) => R;
  }
): R {
  if (array.length === 0) {
    return patterns.empty();
  }
  
  const [head, ...tail] = array;
  return patterns.nonEmpty(head, tail);
}

/**
 * Nested pattern matcher for PersistentList of PersistentLists
 */
export function matchNestedPersistentList<T, R>(
  list: PersistentList<PersistentList<T>>,
  patterns: {
    empty: () => R;
    cons: (head: PersistentList<T>, tail: PersistentList<PersistentList<T>>) => R;
  }
): R {
  return matchPersistentList(list, patterns);
}

/**
 * Nested pattern matcher for PersistentMap with nested values
 */
export function matchNestedPersistentMap<K, V, R>(
  map: PersistentMap<K, PersistentList<V>>,
  patterns: {
    empty: () => R;
    nonEmpty: (firstKey: K, firstValue: PersistentList<V>, rest: PersistentMap<K, PersistentList<V>>) => R;
  }
): R {
  return matchPersistentMap(map, patterns);
}

// ============================================================================
// Part 6: Curryable API
// ============================================================================

/**
 * Curryable pattern matcher for readonly arrays
 */
export function createReadonlyArrayMatcher<T, R>(
  patterns: {
    empty: () => R;
    nonEmpty: (head: T, tail: readonly T[]) => R;
  }
): CurryablePatternMatcher<readonly T[], R> {
  return (array: readonly T[]) => matchReadonlyArray(array, patterns);
}

/**
 * Curryable pattern matcher for PersistentList
 */
export function createPersistentListMatcher<T, R>(
  patterns: {
    empty: () => R;
    cons: (head: T, tail: PersistentList<T>) => R;
  }
): CurryablePatternMatcher<PersistentList<T>, R> {
  return (list: PersistentList<T>) => matchPersistentList(list, patterns);
}

/**
 * Curryable pattern matcher for PersistentMap
 */
export function createPersistentMapMatcher<K, V, R>(
  patterns: {
    empty: () => R;
    nonEmpty: (firstKey: K, firstValue: V, rest: PersistentMap<K, V>) => R;
  }
): CurryablePatternMatcher<PersistentMap<K, V>, R> {
  return (map: PersistentMap<K, V>) => matchPersistentMap(map, patterns);
}

/**
 * Curryable pattern matcher for PersistentSet
 */
export function createPersistentSetMatcher<T, R>(
  patterns: {
    empty: () => R;
    nonEmpty: (first: T, rest: PersistentSet<T>) => R;
  }
): CurryablePatternMatcher<PersistentSet<T>, R> {
  return (set: PersistentSet<T>) => matchPersistentSet(set, patterns);
}

/**
 * Curryable pattern matcher for readonly tuples
 */
export function createTupleMatcher<T extends readonly any[], R>(
  pattern: (...args: ReadonlyTupleElements<T>) => R
): CurryablePatternMatcher<T, R> {
  return (tuple: T) => matchTuple(tuple, pattern);
}

// ============================================================================
// Part 7: Integration with GADT Matchers
// ============================================================================

/**
 * Readonly-aware GADT pattern matcher
 */
export function pmatchReadonly<T extends GADT<string, any>, R>(
  gadt: T,
  patterns: {
    [K in GADTTags<T>]: (payload: DeepImmutable<GADTPayload<T, K>>) => R;
  }
): R {
  return pmatch(gadt, patterns as any);
}

/**
 * Readonly-aware GADT pattern matcher with partial support
 */
export function pmatchReadonlyPartial<T extends GADT<string, any>, R>(
  gadt: T,
  patterns: Partial<{
    [K in GADTTags<T>]: (payload: DeepImmutable<GADTPayload<T, K>>) => R;
  }>
): R | undefined {
  const handler = patterns[gadt.tag as keyof typeof patterns];
  return handler ? handler(gadt.payload as any) : undefined;
}

/**
 * Curryable readonly GADT pattern matcher
 */
export function createReadonlyGADTMatcher<T extends GADT<string, any>, R>(
  patterns: {
    [K in GADTTags<T>]: (payload: DeepImmutable<GADTPayload<T, K>>) => R;
  }
): CurryablePatternMatcher<T, R> {
  return (gadt: T) => pmatchReadonly(gadt, patterns);
}

// ============================================================================
// Part 8: Derivable Pattern Matching
// ============================================================================

/**
 * Derivable pattern matcher for any readonly type
 */
export type DerivableReadonlyPatternMatch<T, R> = {
  match: (value: T, patterns: any) => R;
  matchPartial: (value: T, patterns: any) => R | undefined;
  createMatcher: (patterns: any) => CurryablePatternMatcher<T, R>;
};

/**
 * Derive pattern matcher for readonly arrays
 */
export function deriveReadonlyArrayPatternMatch<T>(): DerivableReadonlyPatternMatch<readonly T[], any> {
  return {
    match: (array, patterns) => matchReadonlyArray(array, patterns),
    matchPartial: (array, patterns) => matchReadonlyArrayPartial(array, patterns),
    createMatcher: (patterns) => createReadonlyArrayMatcher(patterns)
  };
}

/**
 * Derive pattern matcher for PersistentList
 */
export function derivePersistentListPatternMatch<T>(): DerivableReadonlyPatternMatch<PersistentList<T>, any> {
  return {
    match: (list, patterns) => matchPersistentList(list, patterns),
    matchPartial: (list, patterns) => matchPersistentListPartial(list, patterns),
    createMatcher: (patterns) => createPersistentListMatcher(patterns)
  };
}

/**
 * Derive pattern matcher for PersistentMap
 */
export function derivePersistentMapPatternMatch<K, V>(): DerivableReadonlyPatternMatch<PersistentMap<K, V>, any> {
  return {
    match: (map, patterns) => matchPersistentMap(map, patterns),
    matchPartial: (map, patterns) => matchPersistentMapPartial(map, patterns),
    createMatcher: (patterns) => createPersistentMapMatcher(patterns)
  };
}

/**
 * Derive pattern matcher for PersistentSet
 */
export function derivePersistentSetPatternMatch<T>(): DerivableReadonlyPatternMatch<PersistentSet<T>, any> {
  return {
    match: (set, patterns) => matchPersistentSet(set, patterns),
    matchPartial: (set, patterns) => matchPersistentSetPartial(set, patterns),
    createMatcher: (patterns) => createPersistentSetMatcher(patterns)
  };
}

// ============================================================================
// Part 9: Advanced Pattern Matching Utilities
// ============================================================================

/**
 * Pattern matcher for readonly objects
 */
export function matchReadonlyObject<T extends Record<string, any>, R>(
  obj: DeepImmutable<T>,
  patterns: {
    [K in keyof T]: (value: DeepImmutable<T[K]>) => R;
  }
): R {
  // This is a simplified version - in practice, you'd want more sophisticated matching
  const keys = Object.keys(obj) as (keyof T)[];
  if (keys.length === 0) {
    throw new Error('Cannot match empty object');
  }
  
  const key = keys[0];
  return patterns[key](obj[key] as any);
}

/**
 * Pattern matcher for readonly unions
 */
export function matchReadonlyUnion<T, R>(
  value: T,
  patterns: {
    [K in keyof T]: (value: T[K]) => R;
  }
): R {
  // This is a simplified version - in practice, you'd want more sophisticated matching
  const keys = Object.keys(value) as (keyof T)[];
  if (keys.length === 0) {
    throw new Error('Cannot match empty union');
  }
  
  const key = keys[0];
  return patterns[key](value[key]);
}

/**
 * Pattern matcher with wildcard support
 */
export function matchWithWildcard<T, R>(
  value: T,
  patterns: {
    [K in keyof T]?: (value: T[K]) => R;
  } & {
    _?: (value: T) => R;
  }
): R {
  const keys = Object.keys(value) as (keyof T)[];
  if (keys.length === 0) {
    return patterns._?.(value) ?? (() => { throw new Error('No matching pattern'); })();
  }
  
  const key = keys[0];
  return patterns[key]?.(value[key]) ?? patterns._?.(value) ?? (() => { throw new Error('No matching pattern'); })();
}

// ============================================================================
// Part 10: Type-Safe Wildcard Support
// ============================================================================

/**
 * Type-safe wildcard for ignoring parts of patterns
 */
export type Wildcard = typeof _;

/**
 * Pattern matcher that ignores specific parts using wildcards
 */
export function matchWithTypeSafeWildcard<T extends readonly any[], R>(
  tuple: T,
  pattern: (...args: (any | Wildcard)[]) => R
): R {
  return pattern(...tuple);
}

/**
 * Pattern matcher for tuples with wildcard support
 */
export function matchTupleWithTypeSafeWildcard<T1, T2, R>(
  tuple: readonly [T1, T2],
  pattern: (first: T1 | Wildcard, second: T2 | Wildcard) => R
): R {
  const [first, second] = tuple;
  return pattern(first, second);
}

// ============================================================================
// Part 11: Exhaustiveness Checking Utilities
// ============================================================================

/**
 * Exhaustiveness check utility
 */
export function assertExhaustive(value: never): never {
  throw new Error(`Exhaustiveness check failed: ${value}`);
}

/**
 * Type-safe exhaustiveness check
 */
export function checkExhaustive<T>(value: T): asserts value is never {
  if (value !== undefined && value !== null) {
    throw new Error(`Exhaustiveness check failed: ${value}`);
  }
}

/**
 * Pattern matcher with exhaustiveness checking
 */
export function matchExhaustive<T, R>(
  value: T,
  patterns: {
    [K in keyof T]: (value: T[K]) => R;
  }
): R {
  const keys = Object.keys(value) as (keyof T)[];
  if (keys.length === 0) {
    return assertExhaustive(value as never);
  }
  
  const key = keys[0];
  const handler = patterns[key];
  if (!handler) {
    return assertExhaustive(value as never);
  }
  
  return handler(value[key]);
}

// ============================================================================
// Laws and Properties
// ============================================================================

/**
 * Readonly Pattern Matching Laws:
 * 
 * 1. Readonly Preservation: Pattern matching preserves readonly markers
 * 2. Type Narrowing: Patterns provide precise type narrowing
 * 3. Exhaustiveness: Compile-time exhaustiveness checking
 * 4. Immutability: Patterns cannot mutate readonly values
 * 5. Composition: Nested patterns work correctly
 * 
 * Runtime Laws:
 * 
 * 1. Identity Law: match(value, { case: x => x }) === value
 * 2. Composition Law: match(value, { case: x => f(g(x)) }) === f(g(value))
 * 3. Exhaustiveness Law: All possible cases must be handled
 * 4. Readonly Law: Patterns cannot modify readonly values
 * 
 * Type-Level Laws:
 * 
 * 1. Readonly Law: Readonly markers persist through pattern matching
 * 2. Narrowing Law: Pattern matching provides precise type narrowing
 * 3. Exhaustiveness Law: Compile-time exhaustiveness checking
 * 4. Composition Law: Nested patterns maintain type safety
 */ 