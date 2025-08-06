/**
 * Profunctor Optics & Traversals
 * 
 * This module provides Profunctor-based lenses, prisms, and traversals
 * that follow FP composition laws and integrate with the existing HKT + purity system.
 * 
 * Features:
 * - Profunctor-based optic implementations
 * - Strong, Choice, Traversing subtypes
 * - Law-compliant composition
 * - Automatic derivation for ADTs
 * - Traversal support with optic chaining
 * - Full HKT and purity integration
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
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

// ============================================================================
// Part 1: Profunctor Interfaces
// ============================================================================

/**
 * Base Profunctor interface
 * A profunctor is a bifunctor that is contravariant in its first argument
 * and covariant in its second argument
 */
export interface Profunctor<P extends Kind2> {
  dimap<A, B, C, D>(
    pab: Apply<P, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ): Apply<P, [C, D]>;
}

/**
 * Strong Profunctor
 * A profunctor that can handle product types (tuples)
 */
export interface Strong<P extends Kind2> extends Profunctor<P> {
  first<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
  second<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[C, A], [C, B]]>;
}

/**
 * Choice Profunctor
 * A profunctor that can handle sum types (Either)
 */
export interface Choice<P extends Kind2> extends Profunctor<P> {
  left<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
  right<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<C, A>, Either<C, B>]>;
}

/**
 * Traversing Profunctor
 * A profunctor that can handle traversable structures
 */
export interface Traversing<P extends Kind2> extends Profunctor<P> {
  wander<A, B, S, T>(
    pab: Apply<P, [A, B]>,
    f: (s: S) => Apply<ArrayK, [A]>,
    g: (bs: Apply<ArrayK, [B]>) => T
  ): Apply<P, [S, T]>;
}

// ============================================================================
// Part 2: Profunctor Optic Types
// ============================================================================

/**
 * General Profunctor Optic
 * An optic is a function that transforms a profunctor from A->B to S->T
 */
export type ProfunctorOptic<P extends Kind2, S, T, A, B> = 
  (pab: Apply<P, [A, B]>) => Apply<P, [S, T]>;

/**
 * Lens — focus on a single field (always present)
 * Uses Strong profunctor for product types
 */
export type Lens<S, T, A, B> = ProfunctorOptic<Strong<any>, S, T, A, B>;

/**
 * Prism — focus on an optional branch of a sum type
 * Uses Choice profunctor for sum types
 */
export type Prism<S, T, A, B> = ProfunctorOptic<Choice<any>, S, T, A, B>;

/**
 * Traversal — focus on zero or more elements
 * Uses Traversing profunctor for traversable structures
 */
export type Traversal<S, T, A, B> = ProfunctorOptic<Traversing<any>, S, T, A, B>;

/**
 * Optional — focus on a part that may or may not exist
 * Uses Profunctor for partial access
 */
export type Optional<S, T, A, B> = ProfunctorOptic<Profunctor<any>, S, T, A, B>;

/**
 * Iso — isomorphism between two types
 * Uses Profunctor for bidirectional transformation
 */
export type Iso<S, T, A, B> = ProfunctorOptic<Profunctor<any>, S, T, A, B>;

/**
 * Getter — read-only access to a part of a structure
 */
export type Getter<S, A> = ProfunctorOptic<Profunctor<any>, S, S, A, A>;

/**
 * Setter — write-only access to a part of a structure
 */
export type Setter<S, T, A, B> = ProfunctorOptic<Profunctor<any>, S, T, A, B>;

// ============================================================================
// Part 3: Profunctor Instances
// ============================================================================

/**
 * Function Profunctor instance
 * The canonical profunctor for function types
 */
export const FunctionProfunctor: Profunctor<FunctionK> = {
  dimap: <A, B, C, D>(
    pab: (a: A) => B,
    f: (c: C) => A,
    g: (b: B) => D
  ): (c: C) => D => {
    return (c: C) => g(pab(f(c)));
  }
};

/**
 * Function Strong instance
 * Handles product types (tuples)
 */
export const FunctionStrong: Strong<FunctionK> = {
  ...FunctionProfunctor,
  first: <A, B, C>(pab: (a: A) => B): ([a, c]: [A, C]) => [B, C] => {
    return ([a, c]: [A, C]): [B, C] => [pab(a), c];
  },
  second: <A, B, C>(pab: (a: A) => B): ([c, a]: [C, A]) => [C, B] => {
    return ([c, a]: [C, A]): [C, B] => [c, pab(a)];
  }
};

/**
 * Function Choice instance
 * Handles sum types (Either)
 */
export const FunctionChoice: Choice<FunctionK> = {
  ...FunctionProfunctor,
  left: <A, B, C>(pab: (a: A) => B): (e: Either<A, C>) => Either<B, C> => {
    return (e: Either<A, C>): Either<B, C> => {
      return Either.match(e, {
        Left: (a) => Either.Left(pab(a)),
        Right: (c) => Either.Right(c)
      });
    };
  },
  right: <A, B, C>(pab: (a: A) => B): (e: Either<C, A>) => Either<C, B> => {
    return (e: Either<C, A>): Either<C, B> => {
      return Either.match(e, {
        Left: (c) => Either.Left(c),
        Right: (a) => Either.Right(pab(a))
      });
    };
  }
};

/**
 * Function Traversing instance
 * Handles traversable structures
 */
export const FunctionTraversing: Traversing<FunctionK> = {
  ...FunctionProfunctor,
  wander: <A, B, S, T>(
    pab: (a: A) => B,
    f: (s: S) => A[],
    g: (bs: B[]) => T
  ): (s: S) => T => {
    return (s: S): T => {
      const as = f(s);
      const bs = as.map(pab);
      return g(bs);
    };
  }
};

// ============================================================================
// Part 4: Profunctor Optic Constructors
// ============================================================================

/**
 * Create a lens using Profunctor laws
 * Lens laws:
 * 1. view(lens, set(lens, b, s)) = b
 * 2. set(lens, view(lens, s), s) = s
 * 3. set(lens, b, set(lens, b', s)) = set(lens, b, s)
 */
export function lens<S, T, A, B>(
  getter: (s: S) => A,
  setter: (b: B, s: S) => T
): Lens<S, T, A, B> {
  return (pab: Apply<Strong<any>, [A, B]>): Apply<Strong<any>, [S, T]> => {
    return FunctionStrong.dimap(
      pab,
      (s: S) => getter(s),
      (b: B) => setter(b, s)
    ) as any;
  };
}

/**
 * Create a prism using Profunctor laws
 * Prism laws:
 * 1. preview(prism, review(prism, b)) = Just(b)
 * 2. preview(prism, s) = Just(a) => review(prism, a) = s
 */
export function prism<S, T, A, B>(
  match: (s: S) => Either<A, T>,
  build: (b: B) => T
): Prism<S, T, A, B> {
  return (pab: Apply<Choice<any>, [A, B]>): Apply<Choice<any>, [S, T]> => {
    return FunctionChoice.dimap(
      pab,
      (s: S) => match(s),
      (b: B) => build(b)
    ) as any;
  };
}

/**
 * Create a traversal using Profunctor laws
 * Traversal laws:
 * 1. traverse(Identity, Identity, s) = Identity(s)
 * 2. traverse(Compose, Compose, s) = Compose(traverse(F, traverse(G, s)))
 */
export function traversal<S, T, A, B>(
  getAll: (s: S) => A[],
  modifyAll: (f: (a: A) => B, s: S) => T
): Traversal<S, T, A, B> {
  return (pab: Apply<Traversing<any>, [A, B]>): Apply<Traversing<any>, [S, T]> => {
    return FunctionTraversing.wander(
      pab,
      getAll,
      (bs: B[]) => modifyAll((a: A, i: number) => bs[i], s)
    ) as any;
  };
}

/**
 * Create an optional using Profunctor laws
 */
export function optional<S, T, A, B>(
  getOption: (s: S) => Maybe<A>,
  set: (b: B, s: S) => T
): Optional<S, T, A, B> {
  return (pab: Apply<Profunctor<any>, [A, B]>): Apply<Profunctor<any>, [S, T]> => {
    return FunctionProfunctor.dimap(
      pab,
      (s: S) => getOption(s),
      (b: B) => set(b, s)
    ) as any;
  };
}

/**
 * Create an isomorphism using Profunctor laws
 */
export function iso<S, T, A, B>(
  get: (s: S) => A,
  reverseGet: (b: B) => T
): Iso<S, T, A, B> {
  return (pab: Apply<Profunctor<any>, [A, B]>): Apply<Profunctor<any>, [S, T]> => {
    return FunctionProfunctor.dimap(
      pab,
      get,
      reverseGet
    ) as any;
  };
}

// ============================================================================
// Part 5: Optic Operations
// ============================================================================

/**
 * View a lens (get the focused value)
 */
export function view<S, A>(ln: Lens<S, S, A, A>, s: S): A {
  const getter = (a: A) => a;
  const optic = ln(FunctionStrong.dimap(getter, (s: S) => a, (a: A) => a) as any);
  return optic(s);
}

/**
 * Set a lens (set the focused value)
 */
export function set<S, T, A, B>(ln: Lens<S, T, A, B>, b: B, s: S): T {
  const setter = (_: A) => b;
  const optic = ln(FunctionStrong.dimap(setter, (s: S) => a, (b: B) => b) as any);
  return optic(s);
}

/**
 * Over a lens (modify the focused value)
 */
export function over<S, T, A, B>(ln: Lens<S, T, A, B>, f: (a: A) => B, s: S): T {
  const optic = ln(FunctionStrong.dimap(f, (s: S) => a, (b: B) => b) as any);
  return optic(s);
}

/**
 * Preview a prism (get the focused value as Maybe)
 */
export function preview<S, A>(pr: Prism<S, S, A, A>, s: S): Maybe<A> {
  const getter = (a: A) => Maybe.Just(a);
  const optic = pr(FunctionChoice.dimap(getter, (s: S) => a, (a: A) => a) as any);
  return optic(s);
}

/**
 * Review a prism (build from focused value)
 */
export function review<S, T, A, B>(pr: Prism<S, T, A, B>, b: B): T {
  const builder = (_: A) => b;
  const optic = pr(FunctionChoice.dimap(builder, (s: S) => a, (b: B) => b) as any);
  return optic(s);
}

/**
 * Traverse with a traversal
 */
export function traverse<S, T, A, B>(
  tr: Traversal<S, T, A, B>,
  f: (a: A) => B,
  s: S
): T {
  const optic = tr(FunctionTraversing.wander(f, (s: S) => [a], (bs: B[]) => bs[0]) as any);
  return optic(s);
}

// ============================================================================
// Part 6: Traversal Creation and Operations
// ============================================================================

/**
 * Create a traversal for arrays
 */
export function createTraversal<S extends any[], T extends any[], A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (s: S) => s as A[],
    (f: (a: A) => B, s: S) => s.map(f) as T
  );
}

/**
 * Create a traversal for object values
 */
export function createValuesTraversal<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (s: S) => Object.values(s) as A[],
    (f: (a: A) => B, s: S) => {
      const result = {} as T;
      for (const [key, value] of Object.entries(s)) {
        result[key] = f(value);
      }
      return result;
    }
  );
}

/**
 * Create a traversal for object keys
 */
export function createKeysTraversal<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (s: S) => Object.keys(s) as A[],
    (f: (a: A) => B, s: S) => {
      const result = {} as T;
      for (const key of Object.keys(s)) {
        const newKey = f(key);
        result[newKey] = s[key];
      }
      return result;
    }
  );
}

/**
 * Chain traversals with optic composition
 */
export function chainTraversal<S, T, A, B, C, D>(
  traversal1: Traversal<S, T, A, B>,
  traversal2: Traversal<A, B, C, D>
): Traversal<S, T, C, D> {
  return (pcd: Apply<Traversing<any>, [C, D]>): Apply<Traversing<any>, [S, T]> => {
    return traversal1((pab: Apply<Traversing<any>, [A, B]>) => {
      return traversal2(pcd);
    });
  };
}

// ============================================================================
// Part 7: Automatic Derivation
// ============================================================================

/**
 * Derive lens for a field in a product type
 */
export function deriveLens<K extends string>(key: K) {
  return <S extends Record<K, any>, T extends Record<K, any>, A, B>(): Lens<S, T, A, B> => {
    return lens<S, T, A, B>(
      (s: S) => s[key] as A,
      (b: B, s: S) => ({ ...s, [key]: b }) as T
    );
  };
}

/**
 * Derive prism for a variant in a sum type
 */
export function derivePrism<Tag extends string>(tag: Tag) {
  return <S extends { tag: Tag }, T extends { tag: Tag }, A, B>(): Prism<S, T, A, B> => {
    return prism<S, T, A, B>(
      (s: S) => s.tag === tag ? Either.Left(s as any) : Either.Right(s as T),
      (b: B) => ({ tag, ...b }) as T
    );
  };
}

/**
 * Derive traversal for an array field
 */
export function deriveArrayTraversal<K extends string>(key: K) {
  return <S extends Record<K, any[]>, T extends Record<K, any[]>, A, B>(): Traversal<S, T, A, B> => {
    return traversal<S, T, A, B>(
      (s: S) => s[key] as A[],
      (f: (a: A) => B, s: S) => ({ ...s, [key]: s[key].map(f) }) as T
    );
  };
}

// ============================================================================
// Part 8: Composition Laws
// ============================================================================

/**
 * Compose two optics
 * Composition laws:
 * 1. (f . g) . h = f . (g . h) (associativity)
 * 2. f . id = f = id . f (identity)
 */
export function compose<S, T, A, B, C, D>(
  outer: ProfunctorOptic<any, S, T, A, B>,
  inner: ProfunctorOptic<any, A, B, C, D>
): ProfunctorOptic<any, S, T, C, D> {
  return (pcd: Apply<any, [C, D]>): Apply<any, [S, T]> => {
    const pab = inner(pcd);
    return outer(pab);
  };
}

/**
 * Identity optic
 */
export function id<S, T>(): ProfunctorOptic<any, S, T, S, T> {
  return (ps: Apply<any, [S, T]>): Apply<any, [S, T]> => ps;
}

// ============================================================================
// Part 9: Purity Integration
// ============================================================================

/**
 * Mark an optic as pure
 */
export function markPure<S, T, A, B>(
  optic: ProfunctorOptic<any, S, T, A, B>
): ProfunctorOptic<any, S, T, A, B> & { readonly __effect: 'Pure' } {
  return attachPurityMarker(optic, 'Pure') as any;
}

/**
 * Mark an optic as async
 */
export function markAsync<S, T, A, B>(
  optic: ProfunctorOptic<any, S, T, A, B>
): ProfunctorOptic<any, S, T, A, B> & { readonly __effect: 'Async' } {
  return attachPurityMarker(optic, 'Async') as any;
}

/**
 * Check if an optic is pure
 */
export function isPure<S, T, A, B>(
  optic: ProfunctorOptic<any, S, T, A, B>
): boolean {
  return extractPurityMarker(optic) === 'Pure';
}

/**
 * Check if an optic is async
 */
export function isAsync<S, T, A, B>(
  optic: ProfunctorOptic<any, S, T, A, B>
): boolean {
  return extractPurityMarker(optic) === 'Async';
}

// ============================================================================
// Part 10: Type Safety and HKT Integration
// ============================================================================

/**
 * Optic as HKT
 */
export interface OpticK extends Kind2 {
  readonly type: ProfunctorOptic<any, this['arg0'], this['arg1'], any, any>;
}

/**
 * Optic with effect tag
 */
export type OpticWithEffect<S, T, A, B, E extends EffectTag = 'Pure'> = 
  ProfunctorOptic<any, S, T, A, B> & { readonly __effect: E };

/**
 * Extract effect from optic
 */
export type EffectOfOptic<T> = T extends OpticWithEffect<any, any, any, any, infer E> ? E : 'Pure';

/**
 * Check if optic is pure
 */
export type IsOpticPure<T> = EffectOfOptic<T> extends 'Pure' ? true : false;

/**
 * Check if optic is impure
 */
export type IsOpticImpure<T> = EffectOfOptic<T> extends 'Pure' ? false : true;

// ============================================================================
// Part 11: Utility Functions
// ============================================================================

/**
 * Check if a value is a lens
 */
export function isLens<S, T, A, B>(value: any): value is Lens<S, T, A, B> {
  return typeof value === 'function' && value.length === 1;
}

/**
 * Check if a value is a prism
 */
export function isPrism<S, T, A, B>(value: any): value is Prism<S, T, A, B> {
  return typeof value === 'function' && value.length === 1;
}

/**
 * Check if a value is a traversal
 */
export function isTraversal<S, T, A, B>(value: any): value is Traversal<S, T, A, B> {
  return typeof value === 'function' && value.length === 1;
}

/**
 * Check if a value is an optic
 */
export function isOptic(value: any): value is ProfunctorOptic<any, any, any, any, any> {
  return typeof value === 'function' && value.length === 1;
}

// ============================================================================
// Part 12: Export All
// ============================================================================

export {
  // Profunctor interfaces
  Profunctor,
  Strong,
  Choice,
  Traversing,
  
  // Profunctor instances
  FunctionProfunctor,
  FunctionStrong,
  FunctionChoice,
  FunctionTraversing,
  
  // Optic types
  ProfunctorOptic,
  Lens,
  Prism,
  Traversal,
  Optional,
  Iso,
  Getter,
  Setter,
  
  // Optic constructors
  lens,
  prism,
  traversal,
  optional,
  iso,
  
  // Optic operations
  view,
  set,
  over,
  preview,
  review,
  traverse,
  
  // Traversal creation
  createTraversal,
  createValuesTraversal,
  createKeysTraversal,
  chainTraversal,
  
  // Automatic derivation
  deriveLens,
  derivePrism,
  deriveArrayTraversal,
  
  // Composition
  compose,
  id,
  
  // Purity integration
  markPure,
  markAsync,
  isPure,
  isAsync,
  
  // Type safety
  OpticK,
  OpticWithEffect,
  EffectOfOptic,
  IsOpticPure,
  IsOpticImpure,
  
  // Utility functions
  isLens,
  isPrism,
  isTraversal,
  isOptic
}; 