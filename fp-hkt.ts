/**
 * Higher-Kinded Types (HKTs) for TypeScript
 * 
 * This module provides the foundational utilities for treating type constructors
 * as first-class values, enabling type-safe higher-order type operations.
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
  readonly type: (this['arg0']) => this['arg1'];
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

// ============================================================================
// Higher-Order Kinds (Optional Extra Credit)
// ============================================================================

/**
 * Higher-order kind that takes a kind and returns a kind
 * Example: Compose<F, G> where F and G are both Kind1
 */
export interface ComposeK<F extends Kind1, G extends Kind1> extends Kind1 {
  readonly type: Apply<F, [Apply<G, [this['arg0']]>]>;
}

/**
 * Higher-order kind for natural transformations
 * Example: Nat<F, G> where F and G are both Kind1
 */
export interface NatK<F extends Kind1, G extends Kind1> extends Kind1 {
  readonly type: (fa: Apply<F, [this['arg0']]>) => Apply<G, [this['arg0']]>;
}

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
 * Kind with phantom type parameter
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