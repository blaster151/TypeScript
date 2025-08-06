/**
 * Enhanced Unified Maybe ADT with Ergonomic Pattern Matching
 * 
 * This module provides an enhanced unified Maybe/Option type using the enhanced
 * createSumType builder with ergonomic .match and .matchTag instance methods.
 */

import {
  createSumType,
  EnhancedSumTypeBuilder,
  EnhancedADTInstance,
  ImmutableADTInstance,
  ExtractEnhancedSumTypeInstance,
  ExtractImmutableSumTypeInstance,
  MatchHandlers,
  TagOnlyHandlers
} from './fp-adt-builders-enhanced';

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
// Part 1: Enhanced Maybe ADT Definition
// ============================================================================

/**
 * Create enhanced unified Maybe ADT with ergonomic pattern matching
 */
export const MaybeEnhanced = createSumType({
  Just: <A>(value: A) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false,
  derive: ['Eq', 'Ord', 'Show']
});

/**
 * Extract the enhanced instance type from the unified Maybe
 */
export type MaybeEnhancedInstance<A> = ExtractEnhancedSumTypeInstance<typeof MaybeEnhanced>;

/**
 * Extract the immutable instance type from the unified Maybe
 */
export type MaybeImmutableInstance<A> = ExtractImmutableSumTypeInstance<typeof MaybeEnhanced>;

/**
 * Type alias for Maybe<A> using the enhanced definition
 */
export type Maybe<A> = MaybeEnhancedInstance<A>;

/**
 * Immutable Maybe type
 */
export type ImmutableMaybe<A> = MaybeImmutableInstance<A>;

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
  return MaybeEnhanced.create('Just', { value });
};

/**
 * Nothing constructor for Maybe
 */
export const Nothing = <A>(): Maybe<A> => {
  return MaybeEnhanced.create('Nothing', {});
};

/**
 * Create immutable Just
 */
export const JustImmutable = <A>(value: A): ImmutableMaybe<A> => {
  return MaybeEnhanced.createImmutable('Just', { value });
};

/**
 * Create immutable Nothing
 */
export const NothingImmutable = <A>(): ImmutableMaybe<A> => {
  return MaybeEnhanced.createImmutable('Nothing', {});
};

// ============================================================================
// Part 3: Pattern Matching Exports
// ============================================================================

/**
 * Pattern matcher for Maybe (standalone function)
 */
export const matchMaybe = <A, R>(
  maybe: Maybe<A>,
  handlers: {
    Just?: (value: A) => R;
    Nothing?: () => R;
    _?: (tag: string, payload: any) => R;
    otherwise?: (tag: string, payload: any) => R;
  }
): R => {
  return maybe.match(handlers);
};

/**
 * Tag-only matcher for Maybe
 */
export const matchMaybeTag = <A, R>(
  maybe: Maybe<A>,
  handlers: {
    Just?: () => R;
    Nothing?: () => R;
    _?: (tag: string) => R;
    otherwise?: (tag: string) => R;
  }
): R => {
  return maybe.matchTag(handlers);
};

/**
 * Curryable pattern matcher for Maybe
 */
export const createMaybeMatcher = <R>(
  handlers: {
    Just?: <A>(value: A) => R;
    Nothing?: () => R;
    _?: (tag: string, payload: any) => R;
    otherwise?: (tag: string, payload: any) => R;
  }
) => (maybe: Maybe<any>): R => {
  return maybe.match(handlers);
};

/**
 * Curryable tag-only matcher for Maybe
 */
export const createMaybeTagMatcher = <R>(
  handlers: {
    Just?: () => R;
    Nothing?: () => R;
    _?: (tag: string) => R;
    otherwise?: (tag: string) => R;
  }
) => (maybe: Maybe<any>): R => {
  return maybe.matchTag(handlers);
};

// ============================================================================
// Part 4: Utility Functions
// ============================================================================

/**
 * Check if a Maybe is Just
 */
export const isJust = <A>(maybe: Maybe<A>): maybe is Maybe<A> & { tag: 'Just'; payload: { value: A } } => {
  return maybe.is('Just');
};

/**
 * Check if a Maybe is Nothing
 */
export const isNothing = <A>(maybe: Maybe<A>): maybe is Maybe<A> & { tag: 'Nothing'; payload: {} } => {
  return maybe.is('Nothing');
};

/**
 * Get the value from a Just, or throw if Nothing
 */
export const fromJust = <A>(maybe: Maybe<A>): A => {
  return maybe.match({
    Just: ({ value }) => value,
    Nothing: () => {
      throw new Error('fromJust: Nothing');
    }
  });
};

/**
 * Get the value from a Just, or return default if Nothing
 */
export const fromMaybe = <A>(defaultValue: A, maybe: Maybe<A>): A => {
  return maybe.match({
    Just: ({ value }) => value,
    Nothing: () => defaultValue
  });
};

/**
 * Map over a Maybe
 */
export const mapMaybe = <A, B>(f: (a: A) => B, maybe: Maybe<A>): Maybe<B> => {
  return maybe.match({
    Just: ({ value }) => Just(f(value)),
    Nothing: () => Nothing()
  });
};

/**
 * Apply a function in a Maybe to a value in a Maybe
 */
export const apMaybe = <A, B>(maybeF: Maybe<(a: A) => B>, maybeA: Maybe<A>): Maybe<B> => {
  return maybeF.match({
    Just: ({ value: f }) => mapMaybe(f, maybeA),
    Nothing: () => Nothing()
  });
};

/**
 * Chain operations on Maybe
 */
export const chainMaybe = <A, B>(f: (a: A) => Maybe<B>, maybe: Maybe<A>): Maybe<B> => {
  return maybe.match({
    Just: ({ value }) => f(value),
    Nothing: () => Nothing()
  });
};

/**
 * Fold over a Maybe
 */
export const foldMaybe = <A, B>(onJust: (a: A) => B, onNothing: () => B, maybe: Maybe<A>): B => {
  return maybe.match({
    Just: ({ value }) => onJust(value),
    Nothing: () => onNothing()
  });
};

// ============================================================================
// Part 5: Typeclass Instances
// ============================================================================

/**
 * Derived instances for Maybe
 */
export const MaybeInstances = deriveInstances<MaybeK>({
  map: mapMaybe,
  of: Just,
  ap: apMaybe,
  chain: chainMaybe
});

export const MaybeFunctor = MaybeInstances.functor;
export const MaybeApplicative = MaybeInstances.applicative;
export const MaybeMonad = MaybeInstances.monad;

/**
 * Foldable instance for Maybe
 */
export const MaybeFoldable: Foldable<MaybeK> = {
  reduce: <A, B>(maybe: Maybe<A>, f: (b: B, a: A) => B, b: B): B => {
    return maybe.match({
      Just: ({ value }) => f(b, value),
      Nothing: () => b
    });
  },
  foldMap: <M, A>(M: any, maybe: Maybe<A>, f: (a: A) => M): M => {
    return maybe.match({
      Just: ({ value }) => f(value),
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
    return maybeArray.match({
      Just: ({ value }) => value,
      Nothing: () => []
    });
  },
  traverse: <F extends Kind1, A, B>(
    F: Applicative<F>,
    maybe: Maybe<A>,
    f: (a: A) => Apply<F, [B]>
  ): Apply<F, [Maybe<B>]> => {
    return maybe.match({
      Just: ({ value }) => F.map(f(value), Just),
      Nothing: () => F.of(Nothing())
    }) as Apply<F, [Maybe<B>]>;
  }
};

// ============================================================================
// Part 6: Purity Integration
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
// Part 7: HKT Integration
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
// Part 8: Example Usage
// ============================================================================

/**
 * Example usage of enhanced Maybe with ergonomic pattern matching
 */
export function exampleUsage() {
export const MaybeEq = deriveEqInstance({ kind: MaybeK });
export const MaybeOrd = deriveOrdInstance({ kind: MaybeK });
export const MaybeShow = deriveShowInstance({ kind: MaybeK });
  // Create Maybe instances
  const maybeJust = Just(42);
  const maybeNothing = Nothing();
  
  // Full pattern matching
  const result1 = maybeJust.match({
    Just: ({ value }) => `Got ${value}`,
    Nothing: () => "None"
  });
  console.log(result1); // "Got 42"
  
  // Partial pattern matching with fallback
  const result2 = maybeNothing.match({
    Just: ({ value }) => `Got ${value}`,
    _: (tag, payload) => `Unhandled: ${tag}`
  });
  console.log(result2); // "Unhandled: Nothing"
  
  // Tag-only matching
  const result3 = maybeJust.matchTag({
    Just: () => "Has value",
    Nothing: () => "No value"
  });
  console.log(result3); // "Has value"
  
  // Type-safe payload access
  const result4 = maybeJust.match({
    Just: ({ value }) => value * 2, // value is typed as number
    Nothing: () => 0
  });
  console.log(result4); // 84
  
  // Immutable instances
  const immutableJust = JustImmutable(42);
  const immutableNothing = NothingImmutable();
  
  // Pattern matching works the same
  const result5 = immutableJust.match({
    Just: ({ value }) => `Immutable: ${value}`,
    Nothing: () => "Immutable: None"
  });
  console.log(result5); // "Immutable: 42"
  
  // Type guards work
  if (maybeJust.is('Just')) {
    console.log(maybeJust.payload.value); // TypeScript knows this is safe
  }
}

// ============================================================================
// Part 9: Laws Documentation
// ============================================================================

/**
 * Enhanced Maybe Laws:
 * 
 * Pattern Matching Laws:
 * 1. Identity: maybe.match({ [tag]: payload => payload }) = maybe.payload
 * 2. Composition: maybe.match(handlers1).then(handlers2) = maybe.match(composed)
 * 3. Exhaustiveness: Full handlers must cover all tags or have fallback
 * 4. Immutability: Pattern matching never mutates the instance
 * 
 * Tag-Only Matching Laws:
 * 1. Identity: maybe.matchTag({ [tag]: () => tag }) = maybe.tag
 * 2. No Payload Access: Tag-only handlers cannot access payload
 * 3. Fallback Support: _ or otherwise handlers supported
 * 
 * Immutability Laws:
 * 1. Frozen Instances: All instances are Object.freeze()d
 * 2. No Mutation: No methods can modify the instance state
 * 3. Structural Sharing: Immutable instances can share structure
 * 
 * Type Safety Laws:
 * 1. Exhaustiveness: TypeScript enforces exhaustive matching
 * 2. Payload Inference: Payload types inferred from tag definitions
 * 3. Handler Types: Handler signatures inferred from tag payloads
 * 4. Fallback Types: Fallback handlers properly typed
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
 */ 
export function registerMaybeDerivations(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    registry.register('MaybeEq', MaybeEq);
    registry.register('MaybeOrd', MaybeOrd);
    registry.register('MaybeShow', MaybeShow);
  }
}
registerMaybeDerivations();