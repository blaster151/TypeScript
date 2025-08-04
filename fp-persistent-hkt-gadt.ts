/**
 * Persistent Collections in HKTs + GADTs
 * 
 * This module provides seamless integration between persistent collections,
 * Higher-Kinded Types (HKTs), and Generalized Algebraic Data Types (GADTs).
 * 
 * Features:
 * - Persistent collections registered as HKTs
 * - GADT-friendly forms for persistent collections
 * - Pattern matching for GADT forms
 * - Integration with derivable instances
 * - Type-safe operations with immutability preservation
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
  PersistentList, PersistentMap, PersistentSet,
  PersistentListK, PersistentMapK, PersistentSetK
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

import {
  PERSISTENT_BRAND, IMMUTABLE_BRAND,
  isPersistentCollection, isImmutableCollection,
  registerDerivableInstances, autoRegisterPersistentCollections,
  deriveInstances, getFunctorInstance, getMonadInstance
} from './fp-derivable-instances';

// ============================================================================
// Part 1: HKT Registration for Persistent Collections
// ============================================================================

/**
 * HKT registration for PersistentList
 */
export interface PersistentListHKT extends Kind1 {
  readonly type: PersistentList<this['arg0']>;
}

/**
 * HKT registration for PersistentMap
 */
export interface PersistentMapHKT extends Kind2 {
  readonly type: PersistentMap<this['arg0'], this['arg1']>;
}

/**
 * HKT registration for PersistentSet
 */
export interface PersistentSetHKT extends Kind1 {
  readonly type: PersistentSet<this['arg0']>;
}

/**
 * Type-safe HKT application for persistent collections
 */
export type ApplyPersistentList<A> = Apply<PersistentListHKT, [A]>;
export type ApplyPersistentMap<K, V> = Apply<PersistentMapHKT, [K, V]>;
export type ApplyPersistentSet<A> = Apply<PersistentSetHKT, [A]>;

// ============================================================================
// Part 2: GADT Forms for Persistent Collections
// ============================================================================

/**
 * GADT form for PersistentList
 */
export type ListGADT<A> = GADT<string, any> & (
  | { tag: 'Nil' }
  | { tag: 'Cons'; head: A; tail: PersistentList<A> }
);

/**
 * GADT form for PersistentMap
 */
export type MapGADT<K, V> = GADT<string, any> & (
  | { tag: 'Empty' }
  | { tag: 'NonEmpty'; key: K; value: V; rest: PersistentMap<K, V> }
);

/**
 * GADT form for PersistentSet
 */
export type SetGADT<A> = GADT<string, any> & (
  | { tag: 'Empty' }
  | { tag: 'NonEmpty'; element: A; rest: PersistentSet<A> }
);

/**
 * GADT tags for ListGADT
 */
export type ListGADTTags = 'Nil' | 'Cons';

/**
 * GADT tags for MapGADT
 */
export type MapGADTTags = 'Empty' | 'NonEmpty';

/**
 * GADT tags for SetGADT
 */
export type SetGADTTags = 'Empty' | 'NonEmpty';

/**
 * GADT payload types for ListGADT
 */
export type ListGADTPayload<T extends ListGADTTags> = 
  T extends 'Nil' ? {} :
  T extends 'Cons' ? { head: any; tail: PersistentList<any> } :
  never;

/**
 * GADT payload types for MapGADT
 */
export type MapGADTPayload<T extends MapGADTTags> = 
  T extends 'Empty' ? {} :
  T extends 'NonEmpty' ? { key: any; value: any; rest: PersistentMap<any, any> } :
  never;

/**
 * GADT payload types for SetGADT
 */
export type SetGADTPayload<T extends SetGADTTags> = 
  T extends 'Empty' ? {} :
  T extends 'NonEmpty' ? { element: any; rest: PersistentSet<any> } :
  never;

// ============================================================================
// Part 3: GADT Constructors for Persistent Collections
// ============================================================================

/**
 * GADT constructors for ListGADT
 */
export const ListGADT = {
  Nil: (): ListGADT<any> => ({ tag: 'Nil' }),
  Cons: <A>(head: A, tail: PersistentList<A>): ListGADT<A> => ({ 
    tag: 'Cons', 
    head, 
    tail 
  })
};

/**
 * GADT constructors for MapGADT
 */
export const MapGADT = {
  Empty: (): MapGADT<any, any> => ({ tag: 'Empty' }),
  NonEmpty: <K, V>(key: K, value: V, rest: PersistentMap<K, V>): MapGADT<K, V> => ({ 
    tag: 'NonEmpty', 
    key, 
    value, 
    rest 
  })
};

/**
 * GADT constructors for SetGADT
 */
export const SetGADT = {
  Empty: (): SetGADT<any> => ({ tag: 'Empty' }),
  NonEmpty: <A>(element: A, rest: PersistentSet<A>): SetGADT<A> => ({ 
    tag: 'NonEmpty', 
    element, 
    rest 
  })
};

// ============================================================================
// Part 4: Pattern Matching for GADT Forms
// ============================================================================

/**
 * Pattern matcher for ListGADT
 */
export function matchList<A, R>(
  gadt: ListGADT<A>,
  patterns: {
    Nil: () => R;
    Cons: (payload: { head: A; tail: PersistentList<A> }) => R;
  }
): R {
  return pmatch(gadt, patterns as any);
}

/**
 * Pattern matcher for MapGADT
 */
export function matchMap<K, V, R>(
  gadt: MapGADT<K, V>,
  patterns: {
    Empty: () => R;
    NonEmpty: (payload: { key: K; value: V; rest: PersistentMap<K, V> }) => R;
  }
): R {
  return pmatch(gadt, patterns as any);
}

/**
 * Pattern matcher for SetGADT
 */
export function matchSet<A, R>(
  gadt: SetGADT<A>,
  patterns: {
    Empty: () => R;
    NonEmpty: (payload: { element: A; rest: PersistentSet<A> }) => R;
  }
): R {
  return pmatch(gadt, patterns as any);
}

/**
 * Partial pattern matcher for ListGADT
 */
export function matchListPartial<A, R>(
  gadt: ListGADT<A>,
  patterns: Partial<{
    Nil: () => R;
    Cons: (payload: { head: A; tail: PersistentList<A> }) => R;
  }>
): R | undefined {
  const handler = patterns[gadt.tag as keyof typeof patterns];
  return handler ? handler(gadt as any) : undefined;
}

/**
 * Partial pattern matcher for MapGADT
 */
export function matchMapPartial<K, V, R>(
  gadt: MapGADT<K, V>,
  patterns: Partial<{
    Empty: () => R;
    NonEmpty: (payload: { key: K; value: V; rest: PersistentMap<K, V> }) => R;
  }>
): R | undefined {
  const handler = patterns[gadt.tag as keyof typeof patterns];
  return handler ? handler(gadt as any) : undefined;
}

/**
 * Partial pattern matcher for SetGADT
 */
export function matchSetPartial<A, R>(
  gadt: SetGADT<A>,
  patterns: Partial<{
    Empty: () => R;
    NonEmpty: (payload: { element: A; rest: PersistentSet<A> }) => R;
  }>
): R | undefined {
  const handler = patterns[gadt.tag as keyof typeof patterns];
  return handler ? handler(gadt as any) : undefined;
}

// ============================================================================
// Part 5: Conversion Functions Between Persistent Collections and GADTs
// ============================================================================

/**
 * Convert PersistentList to ListGADT
 */
export function listToGADT<A>(list: PersistentList<A>): ListGADT<A> {
  if (list.isEmpty()) {
    return ListGADT.Nil();
  } else {
    const head = list.head();
    const tail = list.tail();
    if (head === undefined) {
      return ListGADT.Nil();
    }
    return ListGADT.Cons(head, tail);
  }
}

/**
 * Convert ListGADT to PersistentList
 */
export function gadtToList<A>(gadt: ListGADT<A>): PersistentList<A> {
  return matchList(gadt, {
    Nil: () => PersistentList.empty<A>(),
    Cons: ({ head, tail }) => tail.prepend(head)
  });
}

/**
 * Convert PersistentMap to MapGADT
 */
export function mapToGADT<K, V>(map: PersistentMap<K, V>): MapGADT<K, V> {
  if (map.isEmpty()) {
    return MapGADT.Empty();
  } else {
    const entries = Array.from(map.entries());
    const [key, value] = entries[0];
    const rest = PersistentMap.fromEntries(entries.slice(1));
    return MapGADT.NonEmpty(key, value, rest);
  }
}

/**
 * Convert MapGADT to PersistentMap
 */
export function gadtToMap<K, V>(gadt: MapGADT<K, V>): PersistentMap<K, V> {
  return matchMap(gadt, {
    Empty: () => PersistentMap.empty<K, V>(),
    NonEmpty: ({ key, value, rest }) => rest.set(key, value)
  });
}

/**
 * Convert PersistentSet to SetGADT
 */
export function setToGADT<A>(set: PersistentSet<A>): SetGADT<A> {
  if (set.isEmpty()) {
    return SetGADT.Empty();
  } else {
    const values = Array.from(set);
    const element = values[0];
    const rest = PersistentSet.fromArray(values.slice(1));
    return SetGADT.NonEmpty(element, rest);
  }
}

/**
 * Convert SetGADT to PersistentSet
 */
export function gadtToSet<A>(gadt: SetGADT<A>): PersistentSet<A> {
  return matchSet(gadt, {
    Empty: () => PersistentSet.empty<A>(),
    NonEmpty: ({ element, rest }) => rest.add(element)
  });
}

// ============================================================================
// Part 6: Typeclass Instances for HKT Forms
// ============================================================================

/**
 * Functor instance for PersistentListHKT
 */
export const PersistentListFunctor: Functor<PersistentListHKT> = {
  map: <A, B>(fa: Apply<PersistentListHKT, [A]>, f: (a: A) => B): Apply<PersistentListHKT, [B]> => {
    return (fa as PersistentList<A>).map(f) as Apply<PersistentListHKT, [B]>;
  }
};

/**
 * Applicative instance for PersistentListHKT
 */
export const PersistentListApplicative: Applicative<PersistentListHKT> = {
  ...PersistentListFunctor,
  of: <A>(a: A): Apply<PersistentListHKT, [A]> => {
    return PersistentList.of(a) as Apply<PersistentListHKT, [A]>;
  },
  ap: <A, B>(fab: Apply<PersistentListHKT, [(a: A) => B]>, fa: Apply<PersistentListHKT, [A]>): Apply<PersistentListHKT, [B]> => {
    const functions = fab as PersistentList<(a: A) => B>;
    const values = fa as PersistentList<A>;
    return functions.ap(values) as Apply<PersistentListHKT, [B]>;
  }
};

/**
 * Monad instance for PersistentListHKT
 */
export const PersistentListMonad: Monad<PersistentListHKT> = {
  ...PersistentListApplicative,
  chain: <A, B>(fa: Apply<PersistentListHKT, [A]>, f: (a: A) => Apply<PersistentListHKT, [B]>): Apply<PersistentListHKT, [B]> => {
    return (fa as PersistentList<A>).chain(f as any) as Apply<PersistentListHKT, [B]>;
  }
};

/**
 * Functor instance for PersistentMapHKT
 */
export const PersistentMapFunctor: Functor<PersistentMapHKT> = {
  map: <A, B>(fa: Apply<PersistentMapHKT, [any, A]>, f: (a: A) => B): Apply<PersistentMapHKT, [any, B]> => {
    return (fa as PersistentMap<any, A>).map(f) as Apply<PersistentMapHKT, [any, B]>;
  }
};

/**
 * Bifunctor instance for PersistentMapHKT
 */
export const PersistentMapBifunctor: Bifunctor<PersistentMapHKT> = {
  bimap: <A, B, C, D>(fab: Apply<PersistentMapHKT, [A, B]>, f: (a: A) => C, g: (b: B) => D): Apply<PersistentMapHKT, [C, D]> => {
    return (fab as PersistentMap<A, B>).bimap(f, g) as Apply<PersistentMapHKT, [C, D]>;
  }
};

/**
 * Functor instance for PersistentSetHKT
 */
export const PersistentSetFunctor: Functor<PersistentSetHKT> = {
  map: <A, B>(fa: Apply<PersistentSetHKT, [A]>, f: (a: A) => B): Apply<PersistentSetHKT, [B]> => {
    return (fa as PersistentSet<A>).map(f) as Apply<PersistentSetHKT, [B]>;
  }
};

// ============================================================================
// Part 7: Integration with Derivable Instances
// ============================================================================

/**
 * Register persistent collections as HKTs with derivable instances
 */
export function registerPersistentCollectionsAsHKTs(): void {
  // Register PersistentList as HKT
  registerDerivableInstances(PersistentList);
  
  // Register PersistentMap as HKT
  registerDerivableInstances(PersistentMap);
  
  // Register PersistentSet as HKT
  registerDerivableInstances(PersistentSet);
  
  // Register GADT forms
  registerDerivableInstances(ListGADT);
  registerDerivableInstances(MapGADT);
  registerDerivableInstances(SetGADT);
}

/**
 * Auto-register all persistent collections as HKTs
 */
export function autoRegisterPersistentCollectionsAsHKTs(): void {
  // Register existing persistent collections
  autoRegisterPersistentCollections();
  
  // Register as HKTs
  registerPersistentCollectionsAsHKTs();
}

// ============================================================================
// Part 8: Type-Safe FP Operations with HKTs
// ============================================================================

/**
 * Type-safe map operation for PersistentListHKT
 */
export function mapList<A, B>(
  fa: Apply<PersistentListHKT, [A]>,
  f: (a: A) => B
): Apply<PersistentListHKT, [B]> {
  return map(PersistentListFunctor, fa, f);
}

/**
 * Type-safe chain operation for PersistentListHKT
 */
export function chainList<A, B>(
  fa: Apply<PersistentListHKT, [A]>,
  f: (a: A) => Apply<PersistentListHKT, [B]>
): Apply<PersistentListHKT, [B]> {
  return chain(PersistentListMonad, fa, f);
}

/**
 * Type-safe ap operation for PersistentListHKT
 */
export function apList<A, B>(
  fab: Apply<PersistentListHKT, [(a: A) => B]>,
  fa: Apply<PersistentListHKT, [A]>
): Apply<PersistentListHKT, [B]> {
  return ap(PersistentListApplicative, fab, fa);
}

/**
 * Type-safe of operation for PersistentListHKT
 */
export function ofList<A>(a: A): Apply<PersistentListHKT, [A]> {
  return of(PersistentListApplicative, a);
}

/**
 * Type-safe map operation for PersistentMapHKT
 */
export function mapMap<K, A, B>(
  fa: Apply<PersistentMapHKT, [K, A]>,
  f: (a: A) => B
): Apply<PersistentMapHKT, [K, B]> {
  return map(PersistentMapFunctor, fa, f);
}

/**
 * Type-safe bimap operation for PersistentMapHKT
 */
export function bimapMap<A, B, C, D>(
  fab: Apply<PersistentMapHKT, [A, B]>,
  f: (a: A) => C,
  g: (b: B) => D
): Apply<PersistentMapHKT, [C, D]> {
  return PersistentMapBifunctor.bimap(fab, f, g);
}

/**
 * Type-safe map operation for PersistentSetHKT
 */
export function mapSet<A, B>(
  fa: Apply<PersistentSetHKT, [A]>,
  f: (a: A) => B
): Apply<PersistentSetHKT, [B]> {
  return map(PersistentSetFunctor, fa, f);
}

// ============================================================================
// Part 9: GADT Pattern Matching with Type Narrowing
// ============================================================================

/**
 * Type-safe pattern matching for ListGADT with type narrowing
 */
export function matchListTypeSafe<A, R>(
  gadt: ListGADT<A>,
  patterns: {
    Nil: () => R;
    Cons: (payload: { head: A; tail: PersistentList<A> }) => R;
  }
): R {
  return matchList(gadt, patterns);
}

/**
 * Type-safe pattern matching for MapGADT with type narrowing
 */
export function matchMapTypeSafe<K, V, R>(
  gadt: MapGADT<K, V>,
  patterns: {
    Empty: () => R;
    NonEmpty: (payload: { key: K; value: V; rest: PersistentMap<K, V> }) => R;
  }
): R {
  return matchMap(gadt, patterns);
}

/**
 * Type-safe pattern matching for SetGADT with type narrowing
 */
export function matchSetTypeSafe<A, R>(
  gadt: SetGADT<A>,
  patterns: {
    Empty: () => R;
    NonEmpty: (payload: { element: A; rest: PersistentSet<A> }) => R;
  }
): R {
  return matchSet(gadt, patterns);
}

// ============================================================================
// Part 10: Utility Functions for Common Operations
// ============================================================================

/**
 * Sum all elements in a ListGADT
 */
export function sumList(gadt: ListGADT<number>): number {
  return matchList(gadt, {
    Nil: () => 0,
    Cons: ({ head, tail }) => head + sumList(listToGADT(tail))
  });
}

/**
 * Count elements in a ListGADT
 */
export function countList<A>(gadt: ListGADT<A>): number {
  return matchList(gadt, {
    Nil: () => 0,
    Cons: ({ tail }) => 1 + countList(listToGADT(tail))
  });
}

/**
 * Convert ListGADT to array
 */
export function listGADTToArray<A>(gadt: ListGADT<A>): A[] {
  return matchList(gadt, {
    Nil: () => [],
    Cons: ({ head, tail }) => [head, ...listGADTToArray(listToGADT(tail))]
  });
}

/**
 * Convert array to ListGADT
 */
export function arrayToListGADT<A>(array: A[]): ListGADT<A> {
  if (array.length === 0) {
    return ListGADT.Nil();
  } else {
    const [head, ...tail] = array;
    return ListGADT.Cons(head, PersistentList.fromArray(tail));
  }
}

/**
 * Map over ListGADT
 */
export function mapListGADT<A, B>(gadt: ListGADT<A>, f: (a: A) => B): ListGADT<B> {
  return matchList(gadt, {
    Nil: () => ListGADT.Nil(),
    Cons: ({ head, tail }) => ListGADT.Cons(f(head), tail.map(f))
  });
}

/**
 * Filter ListGADT
 */
export function filterListGADT<A>(gadt: ListGADT<A>, predicate: (a: A) => boolean): ListGADT<A> {
  return matchList(gadt, {
    Nil: () => ListGADT.Nil(),
    Cons: ({ head, tail }) => {
      const filteredTail = filterListGADT(listToGADT(tail), predicate);
      if (predicate(head)) {
        return ListGADT.Cons(head, gadtToList(filteredTail));
      } else {
        return filteredTail;
      }
    }
  });
}

// ============================================================================
// Part 11: Immutability Preservation and Branding
// ============================================================================

/**
 * Ensure immutability branding is preserved
 */
export function preserveImmutability<T>(value: T): T {
  if (isPersistentCollection(value)) {
    // Add branding if not present
    if (value && typeof value === 'object') {
      (value as any)[PERSISTENT_BRAND] = true;
      (value as any)[IMMUTABLE_BRAND] = true;
    }
  }
  return value;
}

/**
 * Type-safe operation that preserves immutability
 */
export function safeOperation<A, B>(
  operation: (a: A) => B,
  value: A
): B {
  const result = operation(value);
  return preserveImmutability(result);
}

// ============================================================================
// Part 12: Laws and Properties
// ============================================================================

/**
 * Persistent Collections in HKTs + GADTs Laws:
 * 
 * 1. HKT Registration: Persistent collections are properly registered as HKTs
 * 2. GADT Conversion: Conversion between persistent collections and GADTs is bijective
 * 3. Type Safety: All operations preserve type safety and immutability
 * 4. Pattern Matching: GADT pattern matching provides correct type narrowing
 * 5. Derivable Integration: HKTs work seamlessly with derivable instances
 * 
 * Runtime Laws:
 * 
 * 1. Conversion Law: listToGADT ∘ gadtToList = id
 * 2. Pattern Law: matchList preserves structure and types
 * 3. Immutability Law: All operations preserve immutability branding
 * 4. Typeclass Law: HKT typeclass instances work correctly
 * 
 * Type-Level Laws:
 * 
 * 1. HKT Law: Apply<PersistentListHKT, [A]> = PersistentList<A>
 * 2. GADT Law: ListGADT<A> provides correct type narrowing
 * 3. Safety Law: All operations maintain type safety
 * 4. Branding Law: Immutability branding is preserved
 */ 