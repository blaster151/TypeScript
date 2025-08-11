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

import { Kind2, Apply, FunctionK } from './fp-hkt';
import type { Either as UEither } from './fp-either-unified';
import { Left, Right, matchEither } from './fp-either-unified';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

// ============================================================================
// Part 1: Profunctor Interfaces (fixed, no name collision)
// ============================================================================

export interface PProfunctor<P extends Kind2> {
  dimap<A, B, C, D>(
    pab: Apply<P, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ): Apply<P, [C, D]>;
}

export interface PStrong<P extends Kind2> extends PProfunctor<P> {
  first<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
  second<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[C, A], [C, B]]>;
}

export interface PChoice<P extends Kind2> extends PProfunctor<P> {
  left<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [UEither<A, C>, UEither<B, C>]>;
  right<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [UEither<C, A>, UEither<C, B>]>;
}

export interface PTraversing<P extends Kind2> extends PProfunctor<P> {
  // split extracts As from S; reassemble uses original S plus mapped Bs to build T
  wander<A, B, S, T>(
    pab: Apply<P, [A, B]>,
    split: (s: S) => A[],
    reassemble: (s: S, bs: B[]) => T
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
  (P: PProfunctor<P>) =>
    (pab: Apply<P, [A, B]>) =>
      Apply<P, [S, T]>;

/**
 * Lens — focus on a single field (always present)
 * Uses Strong profunctor for product types
 */
export type Lens<S, T, A, B> =
  <P extends Kind2>(P: PStrong<P>) =>
    (pab: Apply<P, [A, B]>) =>
      Apply<P, [S, T]>;

/**
 * Prism — focus on an optional branch of a sum type
 * Uses Choice profunctor for sum types
 */
export type Prism<S, T, A, B> =
  <P extends Kind2>(P: PChoice<P>) =>
    (pab: Apply<P, [A, B]>) =>
      Apply<P, [S, T]>;

/**
 * Traversal — focus on zero or more elements
 * Uses Traversing profunctor for traversable structures
 */
export type Traversal<S, T, A, B> =
  <P extends Kind2>(P: PTraversing<P>) =>
    (pab: Apply<P, [A, B]>) =>
      Apply<P, [S, T]>;

/**
 * Optional — focus on a part that may or may not exist
 * Uses Profunctor for partial access
 */
export type Optional<S, T, A, B> = ProfunctorOptic<any, S, T, A, B>;

/**
 * Iso — isomorphism between two types
 * Uses Profunctor for bidirectional transformation
 */
export type Iso<S, T, A, B> = ProfunctorOptic<any, S, T, A, B>;

/**
 * Getter — read-only access to a part of a structure
 */
// Legacy Getter/Setter encodings removed (will reintroduce with Forget later)

/**
 * Setter — write-only access to a part of a structure
 */
// Legacy Getter/Setter encodings removed (will reintroduce with Forget later)

// ============================================================================
// Part 3: Profunctor Instances
// ============================================================================

/**
 * Function Profunctor instance (special case - canonical profunctor)
 * The canonical profunctor for function types
 */
export const FunctionProfunctor: PProfunctor<FunctionK> = {
  dimap: (pab, f, g) => (c) => g((pab as any)(f(c)))
};

/**
 * Function Strong instance
 * Handles product types (tuples)
 */
export const FunctionStrong: PStrong<FunctionK> = {
  ...FunctionProfunctor,
  first: (pab) => ([a, c]) => [(pab as any)(a), c],
  second: (pab) => ([c, a]) => [c, (pab as any)(a)]
};

/**
 * Function Choice instance
 * Handles sum types (Either)
 */
export const FunctionChoice: PChoice<FunctionK> = {
  ...FunctionProfunctor,
  left: (pab) => (e) =>
    matchEither(e as any, {
      Left: (a: any) => Left((pab as any)(a)),
      Right: (c: any) => Right(c)
    }) as any,
  right: (pab) => (e) =>
    matchEither(e as any, {
      Left: (c: any) => Left(c),
      Right: (a: any) => Right((pab as any)(a))
    }) as any
};

/**
 * Function Traversing instance
 * Handles traversable structures
 */
export const FunctionTraversing: PTraversing<FunctionK> = {
  ...FunctionProfunctor,
  wander: (pab, split, reassemble) =>
    (s) => {
      const as = split(s);
      const bs = as.map((pab as any));
      return reassemble(s, bs);
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
  get: (s: S) => A,
  set: (b: B, s: S) => T
): Lens<S, T, A, B> {
  // dimap (s -> [get s, s]) ([b, s] -> set b s) ∘ first
  return (P) => (pab) =>
    P.dimap(
      (P as any as PStrong<any>).first(pab),
      (s: S): [A, S] => [get(s), s],
      ([b, s]: [B, S]) => set(b, s)
    );
}

/**
 * Create a prism using Profunctor laws
 * Prism laws:
 * 1. preview(prism, review(prism, b)) = Just(b)
 * 2. preview(prism, s) = Just(a) => review(prism, a) = s
 */
export function prism<S, T, A, B>(
  // match returns Either<T, A>: Left means we already have T (no focus), Right exposes A
  match: (s: S) => Either<T, A>,
  build: (b: B) => T
): Prism<S, T, A, B> {
  // dimap match (either id build) ∘ right
  return (P) => (pab) =>
    (P as any as PProfunctor<any>).dimap(
      (P as any as PChoice<any>).right(pab as any),
      match,
      (e: any) => matchEither(e, {
        Left: (t: T) => t,
        Right: (b: B) => build(b)
      })
    );
}

/**
 * Create a traversal using Profunctor laws
 * Traversal laws:
 * 1. traverse(Identity, Identity, s) = Identity(s)
 * 2. traverse(Compose, Compose, s) = Compose(traverse(F, traverse(G, s)))
 */
export function traversal<S, T, A, B>(
  getAll: (s: S) => A[],
  modifyAll: (f: (a: A, i: number) => B, s: S) => T
): Traversal<S, T, A, B> {
  return (P) => (pab) =>
    (P as any as PTraversing<any>).wander(
      pab,
      getAll,
      (s: S, bs: B[]) => modifyAll((_, i) => bs[i], s)
    );
}

/**
 * Create an optional using Profunctor laws
 */
export function optional<S, T, A, B>(
  _getOption: (s: S) => any,
  _set: (b: B, s: S) => T
): Optional<S, T, A, B> {
  // Placeholder until Forget profunctor is added; keep signature for compatibility
  return (_P: any) => (_pab: any) => {
    throw new Error('optional requires a Forget-like profunctor; not implemented');
  };
}

/**
 * Create an isomorphism using Profunctor laws
 */
export function iso<S, T, A, B>(
  _get: (s: S) => A,
  _reverseGet: (b: B) => T
): Iso<S, T, A, B> {
  return (_P: any) => (_pab: any) => {
    throw new Error('iso requires full PProfunctor wiring; not implemented');
  };
}

// ============================================================================
// Part 4b: Object-style optics (thin wrappers around function-encoded optics)
// ============================================================================

export type LensO<S, T, A, B> = {
  readonly kind: 'Lens';
  get(s: S): A;
  set(b: B, s: S): T;
  over(f: (a: A) => B, s: S): T;
  toFn(): Lens<S, T, A, B>;
};

export type PrismO<S, T, A, B> = {
  readonly kind: 'Prism';
  match(s: S): any; // Either<A, T>
  build(b: B): T;
  preview(s: S): any; // Maybe<A>
  review(b: B): T;
  modify(f: (a: A) => B, s: S): T;
  toFn(): Prism<S, T, A, B>;
};

export type TraversalO<S, T, A, B> = {
  readonly kind: 'Traversal';
  getAll(s: S): A[];
  modifyAll(f: (a: A, i: number) => B, s: S): T;
  traverse(f: (a: A) => B, s: S): T;
  toFn(): Traversal<S, T, A, B>;
};

export type OptionalO<S, T, A, B> = {
  readonly kind: 'Optional';
  getOption(s: S): any; // Maybe<A>
  set(b: B, s: S): T;
  modify(f: (a: A) => B, s: S): T;
  toFn(): Optional<S, T, A, B>;
};

export type IsoO<S, T, A, B> = {
  readonly kind: 'Iso';
  get(s: S): A;
  reverseGet(b: B): T;
  toFn(): Iso<S, T, A, B>;
};

// ---- Constructors -----------------------------------------------------------

export function lensO<S, T, A, B>(
  getter: (s: S) => A,
  setter: (b: B, s: S) => T
): LensO<S, T, A, B> {
  return {
    kind: 'Lens',
    get: getter,
    set: setter,
    over: (f, s) => setter(f(getter(s)), s),
    toFn: () => lens(getter, setter)
  };
}

export function prismO<S, T, A, B>(
  match: (s: S) => any, // Either<A, T>
  build: (b: B) => T
): PrismO<S, T, A, B> {
  return {
    kind: 'Prism',
    match,
    build,
    preview: (s) =>
      matchEither(match(s) as any, {
        Left: (a: A) => ({ tag: 'Just', value: a } as any),
        Right: () => ({ tag: 'Nothing' } as any)
      }),
    review: (b) => build(b),
    modify: (f, s) =>
      matchEither(match(s) as any, {
        Left: (a: A) => build(f(a)),
        Right: (t: T) => t
      }),
    toFn: () => prism(match as any, build)
  };
}

export function traversalO<S, T, A, B>(
  getAll: (s: S) => A[],
  modifyAll: (f: (a: A, i: number) => B, s: S) => T
): TraversalO<S, T, A, B> {
  return {
    kind: 'Traversal',
    getAll,
    modifyAll,
    traverse: (f, s) => modifyAll((a, i) => f(a), s),
    toFn: () => traversal(getAll, modifyAll)
  };
}

export function optionalO<S, T, A, B>(
  getOption: (s: S) => any, // Maybe<A>
  set: (b: B, s: S) => T
): OptionalO<S, T, A, B> {
  return {
    kind: 'Optional',
    getOption,
    set,
    modify: (f, s) =>
      matchEither(getOption(s) as any, {
        Left: (a: A) => set(f(a), s),
        Right: () => (s as unknown as T)
      }),
    toFn: () => optional(getOption as any, set)
  };
}

export function isoO<S, T, A, B>(
  get: (s: S) => A,
  reverseGet: (b: B) => T
): IsoO<S, T, A, B> {
  return {
    kind: 'Iso',
    get,
    reverseGet,
    toFn: () => iso(get, reverseGet)
  };
}
// ============================================================================
// Part 5: Optic Operations
// ============================================================================

/**
 * View a lens (get the focused value)
 */
// TODO: view requires Forget profunctor for lawful implementation

/**
 * Set a lens (set the focused value)
 */
export function set<S, T, A, B>(ln: Lens<S, T, A, B>, b: B, s: S): T {
  return over(ln, () => b, s);
}

/**
 * Over a lens (modify the focused value)
 */
export function over<S, T, A, B>(ln: Lens<S, T, A, B>, f: (a: A) => B, s: S): T {
  const run = ln(FunctionStrong);
  const k = run(f as any) as (s: S) => T;
  return k(s);
}

/**
 * Preview a prism (get the focused value as Maybe)
 */
// TODO: preview requires Forget profunctor

/**
 * Review a prism (build from focused value)
 */
// TODO: review requires appropriate profunctor

/**
 * Traverse with a traversal
 */
// TODO: traverse helper requires additional structure; prefer traversal()

// ============================================================================
// Part 6: Traversal Creation and Operations
// ============================================================================

/**
 * Create a traversal for arrays
 */
export function createTraversal<S extends any[], T extends any[], A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (s: S) => s as A[],
    (f: (a: A, i: number) => B, s: S) => (s as any[]).map((a, i) => f(a as A, i)) as T
  );
}

/**
 * Create a traversal for object values
 */
export function createValuesTraversal<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (s: S) => Object.values(s) as A[],
    (f: (a: A, i: number) => B, s: S) => {
      const entries = Object.entries(s);
      const out: Record<string, any> = {};
      for (let i = 0; i < entries.length; i++) {
        const [k, v] = entries[i];
        out[k] = f(v as A, i);
      }
      return out as T;
    }
  );
}

/**
 * Create a traversal for object keys
 */
export function createKeysTraversal<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>(
    (s: S) => Object.keys(s) as unknown as A[],
    (f: (a: A, i: number) => B, s: S) => {
      const keys = Object.keys(s);
      const out: Record<string, any> = {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const newKey = f(key as unknown as A, i) as unknown as string;
        out[newKey] = (s as any)[key];
      }
      return out as T;
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
  return (P) => (pcd) => traversal1(P)(traversal2(P)(pcd));
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
      (s: S) => (s.tag === tag ? (Right as any)((s as any) as A) : (Left as any)((s as any) as T)),
      (b: B) => ({ tag, ...(b as any) }) as T
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
  return (P) => (pcd) => outer(P)(inner(P)(pcd));
}

/**
 * Identity optic
 */
export function id<S, T>(): ProfunctorOptic<any, S, T, S, T> {
  return (_P) => (ps) => ps;
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
// Part 11: Utility Functions (kept minimal)
// ============================================================================

/**
 * Check if a value is a lens
 */
export function isLens<S, T, A, B>(value: any): value is Lens<S, T, A, B> {
  return typeof value === 'function';
}

/**
 * Check if a value is a prism
 */
export function isPrism<S, T, A, B>(value: any): value is Prism<S, T, A, B> {
  return typeof value === 'function';
}

/**
 * Check if a value is a traversal
 */
export function isTraversal<S, T, A, B>(value: any): value is Traversal<S, T, A, B> {
  return typeof value === 'function';
}

/**
 * Check if a value is an optic
 */
export function isOptic(value: any): value is ProfunctorOptic<any, any, any, any, any> {
  return typeof value === 'function';
}

// ============================================================================
// Part 12: Export All
// ============================================================================

export {
  // Profunctor interfaces
  PProfunctor,
  PStrong,
  PChoice,
  PTraversing,
  
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
  // Note: Optional/Iso/Getter/Setter types kept internal for now
  
  // Optic constructors
  lens,
  prism,
  traversal,
  optional,
  iso,
  
  // Optic operations
  set,
  over,
  
  // Traversal creation
  createTraversal,
  createValuesTraversal,
  createKeysTraversal,
  chainTraversal,
  
  // Automatic derivation
  deriveLens,
  derivePrism,
  deriveArrayTraversal,
  
  // Object-style optics (optional layer)
  LensO, PrismO, TraversalO, OptionalO, IsoO,
  lensO, prismO, traversalO, optionalO, isoO,
  
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