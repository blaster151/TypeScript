/**
 * Higher-Kinded Types (HKTs) for TypeScript
 * 
 * This module provides the foundational utilities for treating type constructors
 * as first-class values, enabling type-safe higher-order type operations.
 * 
 * Enhanced with Higher-Order Kinds (HOKs) support for representing functions
 * from one kind to another.
 */

// ============================================================================
// Data Type Definitions
// ============================================================================

/**
 * Maybe/Option type - represents optional values
 */
export type Maybe<A> = A | null | undefined;

/**
 * Either type - represents values that can be one of two types
 */
export type Either<L, R> = { left: L } | { right: R };

/**
 * List type - represents sequences of values
 */
export type List<A> = A[];

/**
 * Reader type - represents computations that depend on an environment
 */
export type Reader<E, A> = (e: E) => A;

/**
 * Writer type - represents computations that produce a value and a log
 */
export type Writer<A, W> = [A, W];

/**
 * State type - represents stateful computations
 */
export type State<S, A> = (s: S) => [A, S];

// ============================================================================
// Core HKT Types
// ============================================================================

/**
 * Type-level "any" - represents any concrete type
 */
export type Type = any;

/**
 * Base kind type - represents a type constructor that takes type arguments
 * and returns a concrete type
 */
export interface Kind<Args extends readonly Type[]> {
  readonly type: Type;
}

/**
 * Type-level function application - applies a kind to type arguments
 */
export type Apply<F extends Kind<any>, Args extends readonly Type[]> = 
  F extends Kind<Args> ? F['type'] : never;

// ============================================================================
// Higher-Order Kinds (HOKs) Support
// ============================================================================

/**
 * KindAny - represents a kind of any arity
 * This is the base type for Higher-Order Kinds
 */
export interface KindAny extends Kind<readonly Type[]> {
  readonly type: Type;
}

/**
 * Kind1Any - represents a unary kind (for compatibility)
 */
export interface Kind1Any extends KindAny {
  readonly arg0: Type;
}

/**
 * Kind2Any - represents a binary kind (for compatibility)
 */
export interface Kind2Any extends KindAny {
  readonly arg0: Type;
  readonly arg1: Type;
}

/**
 * HigherKind - represents a function from one kind to another
 * This is the core type for Higher-Order Kinds
 */
export interface HigherKind<In extends KindAny, Out extends KindAny> {
  readonly __input: In;
  readonly __output: Out;
  readonly type: Type;
}

/**
 * Type-level function application for Higher-Kinds
 * Applies a HigherKind to input arguments and returns the output kind
 */
export type ApplyHigherKind<F extends HigherKind<any, any>, Args extends readonly Type[]> = 
  F extends HigherKind<infer In, infer Out> 
    ? In extends Kind<Args> 
      ? Out 
      : never 
    : never;

/**
 * Extract the input kind from a HigherKind
 */
export type KindInput<F extends HigherKind<any, any>> = F['__input'];

/**
 * Extract the output kind from a HigherKind
 */
export type KindOutput<F extends HigherKind<any, any>> = F['__output'];

/**
 * Check if two kinds are compatible (same arity)
 */
export type IsKindCompatible<F extends KindAny, G extends KindAny> = 
  F extends Kind<infer ArgsF> 
    ? G extends Kind<infer ArgsG> 
      ? ArgsF['length'] extends ArgsG['length'] 
        ? true 
        : false 
      : false 
    : false;

/**
 * Check if a HigherKind is compatible with a given input kind
 */
export type IsHigherKindCompatible<F extends HigherKind<any, any>, In extends KindAny> = 
  IsKindCompatible<KindInput<F>, In>;

/**
 * Compose two HigherKinds
 * F: A -> B, G: B -> C => ComposeHOK<F, G>: A -> C
 */
export interface ComposeHOK<F extends HigherKind<any, any>, G extends HigherKind<any, any>> 
  extends HigherKind<KindInput<F>, KindOutput<G>> {
  readonly __composed: [F, G];
}

/**
 * Identity HigherKind - maps any kind to itself
 */
export interface IdentityHOK<In extends KindAny> extends HigherKind<In, In> {
  readonly __identity: true;
}

/**
 * Constant HigherKind - maps any input kind to a constant output kind
 */
export interface ConstHOK<In extends KindAny, Out extends KindAny> extends HigherKind<In, Out> {
  readonly __const: Out;
}

// ============================================================================
// Kind Shorthands for Common Arities
// ============================================================================

/**
 * Unary type constructor (takes 1 type argument)
 */
export interface Kind1 extends Kind<[Type]> {
  readonly arg0: Type;
  readonly type: Type;
}

/**
 * Binary type constructor (takes 2 type arguments)
 */
export interface Kind2 extends Kind<[Type, Type]> {
  readonly arg0: Type;
  readonly arg1: Type;
  readonly type: Type;
}

/**
 * Ternary type constructor (takes 3 type arguments)
 */
export interface Kind3 extends Kind<[Type, Type, Type]> {
  readonly arg0: Type;
  readonly arg1: Type;
  readonly arg2: Type;
  readonly type: Type;
}

// ============================================================================
// Variance Tags and Kind Metadata
// ============================================================================

/** Variance direction for type parameters */
export type VarianceTag = 'Out' | 'In' | 'Phantom' | 'Invariant';

export type Out = { readonly _v: 'Out' };
export type In = { readonly _v: 'In' };
export type Ph = { readonly _v: 'Phantom' };
export type Iv = { readonly _v: 'Invariant' };

/** Metadata about a kind: arity and variance for each parameter */
export interface KindInfo {
  readonly arity: number;
  readonly variance: ReadonlyArray<VarianceTag>;
}

/**
 * Type-level variance lookup for known kinds. Defaults to Invariant for safety.
 */
export type VarianceOf<F extends Kind<any>> =
  // Unary
  F extends ArrayK | MaybeK | PromiseK | SetK | ListK | ObservableLiteK
    ? ['Out']
    : // Binary known
    F extends FunctionK
      ? ['In', 'Out']
      : F extends ReaderK
        ? ['In', 'Out']
        : F extends WriterK
          ? ['Out', 'Out']
          : F extends StateK
            ? ['In', 'Out']
            : F extends EitherK | TupleK | TaskEitherK
              ? ['Out', 'Out']
              : F extends MapK
                ? ['Invariant', 'Out']
                : // Fallback: invariant for all parameters
                F extends Kind<infer Args>
                  ? { [K in keyof Args]: 'Invariant' } & ReadonlyArray<VarianceTag>
                  : ReadonlyArray<VarianceTag>;

/** Utility: ensure the last parameter of F is covariant (Out) */
export type RequireCovariantLast<F extends Kind<any>> =
  VarianceOf<F> extends [...infer _Init, infer Last]
    ? Last extends 'Out' ? F : never
    : never;

/** Utility: ensure the first parameter of F is contravariant (In) */
export type RequireContravariantFirst<F extends Kind<any>> =
  VarianceOf<F> extends [infer First, ...infer _Rest]
    ? First extends 'In' ? F : never
    : never;

/** Extract tail (all but first) of variance array */
export type ExtractTailVarianceOf<F extends Kind<any>> =
  VarianceOf<F> extends [any, ...infer Tail] ? Tail : [];

/** Extract head (first) of variance array */
export type ExtractHeadVarianceOf<F extends Kind<any>> =
  VarianceOf<F> extends [infer Head, ...any[]] ? Head : never;

// ============================================================================
// Higher-Order Kind Shorthands
// ============================================================================

/**
 * Unary to Unary HigherKind (e.g., Functor)
 */
export interface HOK1<In extends Kind1, Out extends Kind1> extends HigherKind<In, Out> {
  readonly __arity: 1;
}

/**
 * Binary to Binary HigherKind (e.g., Bifunctor)
 */
export interface HOK2<In extends Kind2, Out extends Kind2> extends HigherKind<In, Out> {
  readonly __arity: 2;
}

/**
 * Unary to Binary HigherKind (e.g., Applicative)
 */
export interface HOK1to2<In extends Kind1, Out extends Kind2> extends HigherKind<In, Out> {
  readonly __arity: '1to2';
}

/**
 * Binary to Unary HigherKind (e.g., Contravariant)
 */
export interface HOK2to1<In extends Kind2, Out extends Kind1> extends HigherKind<In, Out> {
  readonly __arity: '2to1';
}

// ============================================================================
// Partial Application Helpers for Higher Arity Kinds
// ============================================================================

/** Fix the left parameter of a binary kind, yielding a unary kind */
export interface Fix2Left<F extends Kind2, E> extends Kind1 {
  readonly type: Apply<F, [E, this['arg0']]>;
}

/** Fix the right parameter of a binary kind, yielding a unary kind */
export interface Fix2Right<F extends Kind2, A> extends Kind1 {
  readonly type: Apply<F, [this['arg0'], A]>;
}

/**
 * Curry a binary kind into a unary kind that produces another unary kind.
 * This is a type-level helper for expressing partial application ergonomically.
 */
export interface CurryKind2<F extends Kind2> extends Kind1 {
  readonly type: {
    <E>(): { new <A>(): Apply<F, [E, A]> };
  };
}

/** Uncurry two unary applications into a single binary kind application */
export type UncurryKind2<F extends Kind2, E, A> = Apply<F, [E, A]>;

/** Type-level aliases */
export type ApplyLeft<F extends Kind2, E> = Fix2Left<F, E>;
export type ApplyRight<F extends Kind2, A> = Fix2Right<F, A>;

/**
 * Minimal runtime factory to attach metadata for partial applications so registries can inspect variance.
 * Note: Runtime cannot infer types; pass variance explicitly if desired.
 */
export function makeApplyLeftMeta(baseId: string, varianceTail?: ReadonlyArray<VarianceTag>): {
  readonly __kind: 'ApplyLeft';
  readonly base: string;
  readonly variance?: ReadonlyArray<VarianceTag>;
} {
  return { __kind: 'ApplyLeft', base: baseId, variance: varianceTail };
}

// ============================================================================
// Helper Types for Introspection
// ============================================================================

/**
 * Extract the type arguments from a kind
 */
export type TypeArgs<F extends Kind<any>> = F extends Kind<infer Args> ? Args : never;

/**
 * Get the arity (number of type arguments) of a kind
 */
export type KindArity<F extends Kind<any>> = TypeArgs<F>['length'];

/**
 * Extract the result type from a kind
 */
export type KindResult<F extends Kind<any>> = F['type'];

// ============================================================================
// Type Constructor Representations
// ============================================================================

/**
 * Array type constructor as HKT
 */
export interface ArrayK extends Kind1 {
  readonly type: Array<this['arg0']>;
}

/**
 * Maybe/Option type constructor as HKT
 */
export interface MaybeK extends Kind1 {
  readonly type: Maybe<this['arg0']>;
}

/**
 * Either type constructor as HKT
 */
export interface EitherK extends Kind2 {
  readonly type: Either<this['arg0'], this['arg1']>;
}

/**
 * Tuple type constructor as HKT
 */
export interface TupleK extends Kind2 {
  readonly type: [this['arg0'], this['arg1']];
}

/**
 * Function type constructor as HKT (contravariant in first arg, covariant in second)
 */
export interface FunctionK extends Kind2 {
  readonly type: (arg: this['arg0']) => this['arg1'];
}

/**
 * Promise type constructor as HKT
 */
export interface PromiseK extends Kind1 {
  readonly type: Promise<this['arg0']>;
}

/**
 * Set type constructor as HKT
 */
export interface SetK extends Kind1 {
  readonly type: Set<this['arg0']>;
}

/**
 * Map type constructor as HKT
 */
export interface MapK extends Kind2 {
  readonly type: Map<this['arg0'], this['arg1']>;
}

/**
 * List type constructor as HKT
 */
export interface ListK extends Kind1 {
  readonly type: List<this['arg0']>;
}

/**
 * Reader type constructor as HKT (environment -> value)
 */
export interface ReaderK extends Kind2 {
  readonly type: Reader<this['arg0'], this['arg1']>;
}

/**
 * Writer type constructor as HKT (value, log)
 */
export interface WriterK extends Kind2 {
  readonly type: Writer<this['arg0'], this['arg1']>;
}

/**
 * State type constructor as HKT (state -> value, newState)
 */
export interface StateK extends Kind2 {
  readonly type: State<this['arg0'], this['arg1']>;
}

// Centralized kind symbols for common FP types
export interface IOK extends Kind1 {
  readonly type: any;
}

export interface TaskK extends Kind1 {
  readonly type: any;
}

/**
 * ObservableLite type constructor as HKT (reactive streams)
 */
export interface ObservableLiteK extends Kind1 {
  readonly type: any; // Will be properly typed when imported
  readonly __effect: 'Async'; // Mark as async for purity tracking
}

/**
 * TaskEither kind - represents the TaskEither type constructor
 */
export interface TaskEitherK extends Kind2 {
  readonly type: any; // Will be properly typed when imported
  readonly __effect: 'Async'; // Mark as async for purity tracking
}

// ----------------------------------------------------------------------------
// Centralized Kind identifier constants (for registries)
// ----------------------------------------------------------------------------
export const ARRAY_K_ID = 'ArrayK' as const;
export const MAYBE_K_ID = 'MaybeK' as const;
export const EITHER_K_ID = 'EitherK' as const;
export const TUPLE_K_ID = 'TupleK' as const;
export const LIST_GADT_K_ID = 'ListGADTK' as const;
export const MAYBE_GADT_K_ID = 'MaybeGADTK' as const;
export const EITHER_GADT_K_ID = 'EitherGADTK' as const;
export const PERSISTENT_LIST_K_ID = 'PersistentListK' as const;
export const PERSISTENT_MAP_K_ID = 'PersistentMapK' as const;
export const PERSISTENT_SET_K_ID = 'PersistentSetK' as const;
export const OBSERVABLE_LITE_K_ID = 'ObservableLiteK' as const;
export const TASK_EITHER_K_ID = 'TaskEitherK' as const;

// ============================================================================
// Phantom Type Support (Optional Extra Credit)
// ============================================================================

/**
 * Phantom type parameter - doesn't affect runtime behavior
 */
export interface Phantom<T> {
  readonly __phantom: T;
}

/**
 * Kind with phantom type parameter for additional type-level information
 */
export interface KindWithPhantom<Args extends readonly Type[], PhantomType> extends Kind<Args> {
  readonly __phantom: PhantomType;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Check if a kind is unary
 */
export type IsKind1<F extends Kind<any>> = F extends Kind1 ? true : false;

/**
 * Check if a kind is binary
 */
export type IsKind2<F extends Kind<any>> = F extends Kind2 ? true : false;

/**
 * Check if a kind is ternary
 */
export type IsKind3<F extends Kind<any>> = F extends Kind3 ? true : false;

/**
 * Extract the first type argument from a kind
 */
export type FirstArg<F extends Kind<any>> = F extends Kind<[infer A, ...any[]]> ? A : never;

/**
 * Extract the second type argument from a kind
 */
export type SecondArg<F extends Kind<any>> = F extends Kind<[any, infer B, ...any[]]> ? B : never;

/**
 * Extract the third type argument from a kind
 */
export type ThirdArg<F extends Kind<any>> = F extends Kind<[any, any, infer C, ...any[]]> ? C : never;

// ============================================================================
// Type Guards and Runtime Utilities
// ============================================================================

/**
 * Runtime check if a value is a type constructor
 */
export function isTypeConstructor(value: any): boolean {
  return typeof value === 'function' && value.prototype && value.prototype.constructor === value;
}

/**
 * Runtime check if a type constructor has the expected arity
 */
export function hasArity(constructor: any, expectedArity: number): boolean {
  if (!isTypeConstructor(constructor)) return false;
  
  // Check if it has type parameters (simplified check)
  const source = constructor.toString();
  const typeParamMatch = source.match(/<[^>]*>/);
  if (!typeParamMatch) return expectedArity === 0;
  
  const typeParams = typeParamMatch[0].slice(1, -1).split(',').length;
  return typeParams === expectedArity;
}

// ============================================================================
// Documentation and Examples
// ============================================================================

/**
 * Example usage:
 * 
 * ```typescript
 * // Define a type constructor
 * interface MyArrayK extends Kind1 {
 *   readonly type: MyArray<this['arg0']>;
 * }
 * 
 * // Use it in a typeclass
 * interface Functor<F extends Kind1> {
 *   map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
 * }
 * 
 * // Implement for MyArray
 * const MyArrayFunctor: Functor<MyArrayK> = {
 *   map: (fa, f) => fa.map(f)
 * };
 * ```
 */

// ============================================================================
// Laws and Properties
// ============================================================================

/**
 * HKT Laws:
 * 
 * 1. Identity: Apply<F, [A]> should be well-formed for any valid F and A
 * 2. Composition: Apply<Compose<F, G>, [A]> = Apply<F, [Apply<G, [A]>]>
 * 3. Naturality: Nat<F, G> should preserve structure
 * 
 * Kind Laws:
 * 
 * 1. Kind1: Takes exactly one type argument
 * 2. Kind2: Takes exactly two type arguments
 * 3. Kind3: Takes exactly three type arguments
 * 
 * Apply Laws:
 * 
 * 1. Apply<F, Args> should be a concrete type when F is a valid kind and Args match
 * 2. Apply should be distributive over composition
 * 3. Apply should preserve kind arity
 */ 