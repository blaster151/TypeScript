/**
 * Enhanced Optics Core with Full API Parity
 * 
 * This module provides enhanced optics with full API parity between Prism/Optional and Lens,
 * including fluent composition, HKT integration, and improved ergonomics.
 * 
 * Features:
 * - Full API parity between Lens, Prism, and Optional
 * - Fluent .then(...) composition with cross-kind support
 * - HKT + Purity integration
 * - Enhanced Optional semantics
 * - ADT integration and pattern matching
 * - Derivable instances support
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
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

// ============================================================================
// Part 1: Enhanced Optic Types with Full API Parity
// ============================================================================

/**
 * Base optic interface with full API parity
 */
export interface BaseOptic<S, T, A, B> {
  // Core operations
  over(f: (a: A) => B): (s: S) => T;
  map(f: (a: A) => B): (s: S) => T;
  get(s: S): A | Maybe<A>;
  getOption(s: S): Maybe<A>;
  set(b: B): (s: S) => T;
  modify(f: (a: A) => B): (s: S) => T;
  
  // Composition
  then<C, D>(next: BaseOptic<A, B, C, D>): BaseOptic<S, T, C, D>;
  composeLens<C, D>(lens: Lens<A, B, C, D>): BaseOptic<S, T, C, D>;
  composePrism<C, D>(prism: Prism<A, B, C, D>): BaseOptic<S, T, C, D>;
  composeOptional<C, D>(optional: Optional<A, B, C, D>): BaseOptic<S, T, C, D>;
  
  // Optional-specific operations
  exists(predicate: (a: A) => boolean): (s: S) => boolean;
  forall(predicate: (a: A) => boolean): (s: S) => boolean;
  
  // Purity and HKT
  readonly __effect: EffectTag;
  readonly __kind: Kind2;
}

/**
 * Enhanced Lens with full API parity
 */
export interface Lens<S, T, A, B> extends BaseOptic<S, T, A, B> {
  readonly __type: 'Lens';
  get(s: S): A; // Always succeeds for Lens
}

/**
 * Enhanced Prism with full API parity
 */
export interface Prism<S, T, A, B> extends BaseOptic<S, T, A, B> {
  readonly __type: 'Prism';
  get(s: S): Maybe<A>; // May fail for Prism
  review(b: B): T; // Build from focused value
  isMatching(s: S): boolean; // Check if prism matches
}

/**
 * Enhanced Optional with full API parity
 */
export interface Optional<S, T, A, B> extends BaseOptic<S, T, A, B> {
  readonly __type: 'Optional';
  get(s: S): Maybe<A>; // May fail for Optional
  set(b: B): (s: S) => T; // Set if present
  modify(f: (a: A) => B): (s: S) => T; // Modify if present
}

/**
 * Enhanced Traversal with full API parity
 */
export interface Traversal<S, T, A, B> extends BaseOptic<S, T, A, B> {
  readonly __type: 'Traversal';
  getAll(s: S): A[]; // Get all focused elements
  modifyAll(f: (a: A) => B): (s: S) => T; // Modify all elements
}

/**
 * Enhanced Iso with full API parity
 */
export interface Iso<S, T, A, B> extends BaseOptic<S, T, A, B> {
  readonly __type: 'Iso';
  reverseGet(b: B): A; // Reverse transformation
}

// ============================================================================
// Part 2: Cross-Kind Composition Types
// ============================================================================

/**
 * Composition result types based on optic kinds
 */
export type ComposeResult<Outer extends BaseOptic<any, any, any, any>, Inner extends BaseOptic<any, any, any, any>> =
  Outer extends Lens<any, any, any, any>
    ? Inner extends Lens<any, any, any, any>
      ? Lens<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
      : Inner extends Prism<any, any, any, any>
        ? Optional<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
        : Inner extends Optional<any, any, any, any>
          ? Optional<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
          : BaseOptic<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
    : Outer extends Prism<any, any, any, any>
      ? Inner extends Lens<any, any, any, any>
        ? Optional<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
        : Inner extends Prism<any, any, any, any>
          ? Prism<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
          : Inner extends Optional<any, any, any, any>
            ? Optional<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
            : BaseOptic<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
      : Outer extends Optional<any, any, any, any>
        ? Optional<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>
        : BaseOptic<GetSource<Outer>, GetTarget<Outer>, GetFocus<Inner>, GetFocusTarget<Inner>>;

// Helper types for composition
export type GetSource<O> = O extends BaseOptic<infer S, any, any, any> ? S : never;
export type GetTarget<O> = O extends BaseOptic<any, infer T, any, any> ? T : never;
export type GetFocus<O> = O extends BaseOptic<any, any, infer A, any> ? A : never;
export type GetFocusTarget<O> = O extends BaseOptic<any, any, any, infer B> ? B : never;

// ============================================================================
// Part 3: Enhanced Optic Constructors
// ============================================================================

/**
 * Create an enhanced lens with full API parity
 */
export function lens<S, T, A, B>(
  getter: (s: S) => A,
  setter: (b: B, s: S) => T
): Lens<S, T, A, B> {
  const optic: Lens<S, T, A, B> = {
    __type: 'Lens',
    __effect: 'Pure',
    __kind: {} as any,
    
    // Core operations
    over: (f: (a: A) => B) => (s: S) => setter(f(getter(s)), s),
    map: (f: (a: A) => B) => (s: S) => setter(f(getter(s)), s),
    get: (s: S) => getter(s),
    getOption: (s: S) => Maybe.Just(getter(s)),
    set: (b: B) => (s: S) => setter(b, s),
    modify: (f: (a: A) => B) => (s: S) => setter(f(getter(s)), s),
    
    // Composition
    then: <C, D>(next: BaseOptic<A, B, C, D>) => composeOptic(optic, next),
    composeLens: <C, D>(lens: Lens<A, B, C, D>) => composeLensLens(optic, lens),
    composePrism: <C, D>(prism: Prism<A, B, C, D>) => composeLensPrism(optic, prism),
    composeOptional: <C, D>(optional: Optional<A, B, C, D>) => composeLensOptional(optic, optional),
    
    // Optional-specific operations (always true for Lens)
    exists: (predicate: (a: A) => boolean) => (s: S) => predicate(getter(s)),
    forall: (predicate: (a: A) => boolean) => (s: S) => predicate(getter(s))
  };
  
  return optic;
}

/**
 * Create an enhanced prism with full API parity
 */
export function prism<S, T, A, B>(
  match: (s: S) => Either<A, T>,
  build: (b: B) => T
): Prism<S, T, A, B> {
  const optic: Prism<S, T, A, B> = {
    __type: 'Prism',
    __effect: 'Pure',
    __kind: {} as any,
    
    // Core operations
    over: (f: (a: A) => B) => (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: (a) => build(f(a)),
        Right: () => s as T
      });
    },
    map: (f: (a: A) => B) => (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: (a) => build(f(a)),
        Right: () => s as T
      });
    },
    get: (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: (a) => Maybe.Just(a),
        Right: () => Maybe.Nothing()
      });
    },
    getOption: (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: (a) => Maybe.Just(a),
        Right: () => Maybe.Nothing()
      });
    },
    set: (b: B) => (s: S) => build(b),
    modify: (f: (a: A) => B) => (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: (a) => build(f(a)),
        Right: () => s as T
      });
    },
    
    // Prism-specific operations
    review: (b: B) => build(b),
    isMatching: (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: () => true,
        Right: () => false
      });
    },
    
    // Composition
    then: <C, D>(next: BaseOptic<A, B, C, D>) => composeOptic(optic, next),
    composeLens: <C, D>(lens: Lens<A, B, C, D>) => composePrismLens(optic, lens),
    composePrism: <C, D>(prism: Prism<A, B, C, D>) => composePrismPrism(optic, prism),
    composeOptional: <C, D>(optional: Optional<A, B, C, D>) => composePrismOptional(optic, optional),
    
    // Optional-specific operations
    exists: (predicate: (a: A) => boolean) => (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: (a) => predicate(a),
        Right: () => false
      });
    },
    forall: (predicate: (a: A) => boolean) => (s: S) => {
      const result = match(s);
      return Either.match(result, {
        Left: (a) => predicate(a),
        Right: () => true
      });
    }
  };
  
  return optic;
}

/**
 * Create an enhanced optional with full API parity
 */
export function optional<S, T, A, B>(
  getOption: (s: S) => Maybe<A>,
  set: (b: B, s: S) => T
): Optional<S, T, A, B> {
  const optic: Optional<S, T, A, B> = {
    __type: 'Optional',
    __effect: 'Pure',
    __kind: {} as any,
    
    // Core operations
    over: (f: (a: A) => B) => (s: S) => {
      const maybe = getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => set(f(a), s),
        Nothing: () => s as T
      });
    },
    map: (f: (a: A) => B) => (s: S) => {
      const maybe = getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => set(f(a), s),
        Nothing: () => s as T
      });
    },
    get: (s: S) => getOption(s),
    getOption: (s: S) => getOption(s),
    set: (b: B) => (s: S) => set(b, s),
    modify: (f: (a: A) => B) => (s: S) => {
      const maybe = getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => set(f(a), s),
        Nothing: () => s as T
      });
    },
    
    // Composition
    then: <C, D>(next: BaseOptic<A, B, C, D>) => composeOptic(optic, next),
    composeLens: <C, D>(lens: Lens<A, B, C, D>) => composeOptionalLens(optic, lens),
    composePrism: <C, D>(prism: Prism<A, B, C, D>) => composeOptionalPrism(optic, prism),
    composeOptional: <C, D>(optional: Optional<A, B, C, D>) => composeOptionalOptional(optic, optional),
    
    // Optional-specific operations
    exists: (predicate: (a: A) => boolean) => (s: S) => {
      const maybe = getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => predicate(a),
        Nothing: () => false
      });
    },
    forall: (predicate: (a: A) => boolean) => (s: S) => {
      const maybe = getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => predicate(a),
        Nothing: () => true
      });
    }
  };
  
  return optic;
}

// ============================================================================
// Part 4: Cross-Kind Composition Implementation
// ============================================================================

/**
 * Generic optic composition
 */
export function composeOptic<S, T, A, B, C, D>(
  outer: BaseOptic<S, T, A, B>,
  inner: BaseOptic<A, B, C, D>
): BaseOptic<S, T, C, D> {
  // Determine composition result type based on optic kinds
  if (outer.__type === 'Lens' && inner.__type === 'Lens') {
    return composeLensLens(outer as Lens<S, T, A, B>, inner as Lens<A, B, C, D>);
  } else if (outer.__type === 'Lens' && inner.__type === 'Prism') {
    return composeLensPrism(outer as Lens<S, T, A, B>, inner as Prism<A, B, C, D>);
  } else if (outer.__type === 'Prism' && inner.__type === 'Lens') {
    return composePrismLens(outer as Prism<S, T, A, B>, inner as Lens<A, B, C, D>);
  } else if (outer.__type === 'Prism' && inner.__type === 'Prism') {
    return composePrismPrism(outer as Prism<S, T, A, B>, inner as Prism<A, B, C, D>);
  } else {
    // Default to Optional for mixed compositions
    return composeOptionalOptional(outer as Optional<S, T, A, B>, inner as Optional<A, B, C, D>);
  }
}

/**
 * Lens → Lens = Lens
 */
export function composeLensLens<S, T, A, B, C, D>(
  outer: Lens<S, T, A, B>,
  inner: Lens<A, B, C, D>
): Lens<S, T, C, D> {
  return lens<S, T, C, D>(
    (s: S) => inner.get(outer.get(s)),
    (d: D, s: S) => outer.set(inner.set(d, outer.get(s)), s)
  );
}

/**
 * Lens → Prism = Optional
 */
export function composeLensPrism<S, T, A, B, C, D>(
  outer: Lens<S, T, A, B>,
  inner: Prism<A, B, C, D>
): Optional<S, T, C, D> {
  return optional<S, T, C, D>(
    (s: S) => inner.getOption(outer.get(s)),
    (d: D, s: S) => outer.set(inner.set(d), s)
  );
}

/**
 * Prism → Lens = Optional
 */
export function composePrismLens<S, T, A, B, C, D>(
  outer: Prism<S, T, A, B>,
  inner: Lens<A, B, C, D>
): Optional<S, T, C, D> {
  return optional<S, T, C, D>(
    (s: S) => {
      const maybe = outer.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => Maybe.Just(inner.get(a)),
        Nothing: () => Maybe.Nothing()
      });
    },
    (d: D, s: S) => {
      const maybe = outer.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => outer.set(inner.set(d, a)),
        Nothing: () => s as T
      });
    }
  );
}

/**
 * Prism → Prism = Prism
 */
export function composePrismPrism<S, T, A, B, C, D>(
  outer: Prism<S, T, A, B>,
  inner: Prism<A, B, C, D>
): Prism<S, T, C, D> {
  return prism<S, T, C, D>(
    (s: S) => {
      const outerResult = outer.getOption(s);
      return Maybe.match(outerResult, {
        Just: (a) => {
          const innerResult = inner.getOption(a);
          return Maybe.match(innerResult, {
            Just: (c) => Either.Left(c),
            Nothing: () => Either.Right(s as T)
          });
        },
        Nothing: () => Either.Right(s as T)
      });
    },
    (d: D) => outer.review(inner.review(d))
  );
}

/**
 * Optional → Optional = Optional
 */
export function composeOptionalOptional<S, T, A, B, C, D>(
  outer: Optional<S, T, A, B>,
  inner: Optional<A, B, C, D>
): Optional<S, T, C, D> {
  return optional<S, T, C, D>(
    (s: S) => {
      const outerMaybe = outer.getOption(s);
      return Maybe.match(outerMaybe, {
        Just: (a) => inner.getOption(a),
        Nothing: () => Maybe.Nothing()
      });
    },
    (d: D, s: S) => {
      const outerMaybe = outer.getOption(s);
      return Maybe.match(outerMaybe, {
        Just: (a) => outer.set(inner.set(d, a), s),
        Nothing: () => s as T
      });
    }
  );
}

/**
 * Optional → Lens = Optional
 */
export function composeOptionalLens<S, T, A, B, C, D>(
  outer: Optional<S, T, A, B>,
  inner: Lens<A, B, C, D>
): Optional<S, T, C, D> {
  return optional<S, T, C, D>(
    (s: S) => {
      const maybe = outer.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => Maybe.Just(inner.get(a)),
        Nothing: () => Maybe.Nothing()
      });
    },
    (d: D, s: S) => {
      const maybe = outer.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => outer.set(inner.set(d, a), s),
        Nothing: () => s as T
      });
    }
  );
}

/**
 * Optional → Prism = Optional
 */
export function composeOptionalPrism<S, T, A, B, C, D>(
  outer: Optional<S, T, A, B>,
  inner: Prism<A, B, C, D>
): Optional<S, T, C, D> {
  return optional<S, T, C, D>(
    (s: S) => {
      const outerMaybe = outer.getOption(s);
      return Maybe.match(outerMaybe, {
        Just: (a) => inner.getOption(a),
        Nothing: () => Maybe.Nothing()
      });
    },
    (d: D, s: S) => {
      const outerMaybe = outer.getOption(s);
      return Maybe.match(outerMaybe, {
        Just: (a) => outer.set(inner.set(d), s),
        Nothing: () => s as T
      });
    }
  );
}

// ============================================================================
// Part 5: Enhanced Optional Semantics
// ============================================================================

/**
 * Enhanced optional with additional semantics
 */
export interface EnhancedOptional<S, T, A, B> extends Optional<S, T, A, B> {
  // Additional optional operations
  orElse(defaultValue: A): (s: S) => A;
  orElseWith(fn: (s: S) => A): (s: S) => A;
  filter(predicate: (a: A) => boolean): Optional<S, T, A, B>;
  mapOr(defaultValue: B, f: (a: A) => B): (s: S) => B;
  mapOrElse(defaultFn: (s: S) => B, f: (a: A) => B): (s: S) => B;
}

/**
 * Create an enhanced optional
 */
export function enhancedOptional<S, T, A, B>(
  baseOptional: Optional<S, T, A, B>
): EnhancedOptional<S, T, A, B> {
  return {
    ...baseOptional,
    
    // Additional operations
    orElse: (defaultValue: A) => (s: S) => {
      const maybe = baseOptional.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => a,
        Nothing: () => defaultValue
      });
    },
    
    orElseWith: (fn: (s: S) => A) => (s: S) => {
      const maybe = baseOptional.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => a,
        Nothing: () => fn(s)
      });
    },
    
    filter: (predicate: (a: A) => boolean) => {
      return optional<S, T, A, B>(
        (s: S) => {
          const maybe = baseOptional.getOption(s);
          return Maybe.match(maybe, {
            Just: (a) => predicate(a) ? Maybe.Just(a) : Maybe.Nothing(),
            Nothing: () => Maybe.Nothing()
          });
        },
        baseOptional.set
      );
    },
    
    mapOr: (defaultValue: B, f: (a: A) => B) => (s: S) => {
      const maybe = baseOptional.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => f(a),
        Nothing: () => defaultValue
      });
    },
    
    mapOrElse: (defaultFn: (s: S) => B, f: (a: A) => B) => (s: S) => {
      const maybe = baseOptional.getOption(s);
      return Maybe.match(maybe, {
        Just: (a) => f(a),
        Nothing: () => defaultFn(s)
      });
    }
  };
}

// ============================================================================
// Part 6: ADT Integration and Pattern Matching
// ============================================================================

/**
 * Create prism for ADT variant
 */
export function variantPrism<Tag extends string>(tag: Tag) {
  return <S extends { tag: Tag }, T extends { tag: Tag }, A, B>(): Prism<S, T, A, B> => {
    return prism<S, T, A, B>(
      (s: S) => s.tag === tag ? Either.Left(s as any) : Either.Right(s as T),
      (b: B) => ({ tag, ...b }) as T
    );
  };
}

/**
 * Create optional for nullable property
 */
export function nullableProp<K extends string>(key: K) {
  return <S extends Record<K, any>, T extends Record<K, any>, A, B>(): Optional<S, T, A, B> => {
    return optional<S, T, A, B>(
      (s: S) => {
        const value = s[key];
        return value != null ? Maybe.Just(value) : Maybe.Nothing();
      },
      (b: B, s: S) => ({ ...s, [key]: b }) as T
    );
  };
}

/**
 * Create optional for conditional property
 */
export function conditionalProp<K extends string, P extends keyof any>(
  key: K,
  condition: P
) {
  return <S extends Record<K, any> & Record<P, any>, T extends Record<K, any> & Record<P, any>, A, B>(): Optional<S, T, A, B> => {
    return optional<S, T, A, B>(
      (s: S) => {
        if (s[condition]) {
          const value = s[key];
          return value != null ? Maybe.Just(value) : Maybe.Nothing();
        }
        return Maybe.Nothing();
      },
      (b: B, s: S) => ({ ...s, [key]: b }) as T
    );
  };
}

// ============================================================================
// Part 7: Purity and HKT Integration
// ============================================================================

/**
 * Mark optic as pure
 */
export function markPure<S, T, A, B>(
  optic: BaseOptic<S, T, A, B>
): BaseOptic<S, T, A, B> & { readonly __effect: 'Pure' } {
  return attachPurityMarker(optic, 'Pure') as any;
}

/**
 * Mark optic as async
 */
export function markAsync<S, T, A, B>(
  optic: BaseOptic<S, T, A, B>
): BaseOptic<S, T, A, B> & { readonly __effect: 'Async' } {
  return attachPurityMarker(optic, 'Async') as any;
}

/**
 * Mark optic as IO
 */
export function markIO<S, T, A, B>(
  optic: BaseOptic<S, T, A, B>
): BaseOptic<S, T, A, B> & { readonly __effect: 'IO' } {
  return attachPurityMarker(optic, 'IO') as any;
}

/**
 * Compose effects from multiple optics
 */
export function composeOpticEffects<Effects extends readonly EffectTag[]>(
  effects: Effects
): EffectTag {
  if (effects.length === 0) return 'Pure';
  if (effects.length === 1) return effects[0];
  
  const [first, ...rest] = effects;
  const restEffect = composeOpticEffects(rest);
  return composeEffects(first, restEffect);
}

// ============================================================================
// Part 8: Type Helpers
// ============================================================================

/**
 * Extract effect from optic
 */
export type EffectOfOptic<T> = T extends BaseOptic<any, any, any, any> 
  ? T extends { readonly __effect: infer E } 
    ? E 
    : 'Pure'
  : 'Pure';

/**
 * Extract source type from optic
 */
export type SourceOfOptic<T> = T extends BaseOptic<infer S, any, any, any> ? S : never;

/**
 * Extract target type from optic
 */
export type TargetOfOptic<T> = T extends BaseOptic<any, infer T, any, any> ? T : never;

/**
 * Extract focus type from optic
 */
export type FocusOfOptic<T> = T extends BaseOptic<any, any, infer A, any> ? A : never;

/**
 * Extract focus target type from optic
 */
export type FocusTargetOfOptic<T> = T extends BaseOptic<any, any, any, infer B> ? B : never;

/**
 * Check if optic is pure
 */
export type IsOpticPure<T> = EffectOfOptic<T> extends 'Pure' ? true : false;

/**
 * Check if optic is async
 */
export type IsOpticAsync<T> = EffectOfOptic<T> extends 'Async' ? true : false;

/**
 * Check if optic is IO
 */
export type IsOpticIO<T> = EffectOfOptic<T> extends 'IO' ? true : false;

// ============================================================================
// Part 9: Export All
// ============================================================================

export {
  // Enhanced optic types
  BaseOptic,
  Lens,
  Prism,
  Optional,
  Traversal,
  Iso,
  EnhancedOptional,
  
  // Enhanced constructors
  lens,
  prism,
  optional,
  enhancedOptional,
  
  // Cross-kind composition
  composeOptic,
  composeLensLens,
  composeLensPrism,
  composePrismLens,
  composePrismPrism,
  composeOptionalOptional,
  composeOptionalLens,
  composeOptionalPrism,
  
  // Enhanced optional semantics
  EnhancedOptional,
  
  // ADT integration
  variantPrism,
  nullableProp,
  conditionalProp,
  
  // Purity integration
  markPure,
  markAsync,
  markIO,
  composeOpticEffects,
  
  // Type helpers
  EffectOfOptic,
  SourceOfOptic,
  TargetOfOptic,
  FocusOfOptic,
  FocusTargetOfOptic,
  IsOpticPure,
  IsOpticAsync,
  IsOpticIO
}; 