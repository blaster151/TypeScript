/**
 * Core Multiplicity Types for Usage-Bound Streams
 * 
 * This module defines the foundational types for usage bounds inspired by
 * dependent multiplicities, enabling compile-time safety and optimization
 * opportunities in the StatefulStream system.
 */

import { StatefulStream } from '../core/types';

// ============================================================================
// Core Multiplicity Types
// ============================================================================

/**
 * Natural number type (non-negative integer)
 * Can be branded for additional type safety if desired
 */
export type Nat = number;

/**
 * Multiplicity represents how many times a stream operation is used
 * - Finite natural numbers: exact usage count
 * - "∞": unbounded/infinite usage
 */
export type Multiplicity = Nat | "∞";

/**
 * Usage function that can vary with the input type
 * Returns the multiplicity (usage count) for a given input
 */
export type Usage<I> = (input: I) => Multiplicity;

// ============================================================================
// Canonical Usage Bound Shape
// ============================================================================

/**
 * Canonical usage-bound shape used across the codebase
 */
export interface UsageBound<T> {
  readonly usage: Usage<T>;
  readonly maxUsage?: Multiplicity;
}

/**
 * Create a UsageBound that always runs once
 */
export function once<T>(): UsageBound<T> {
  return { usage: () => 1, maxUsage: 1 };
}

/**
 * Create a UsageBound that has infinite usage
 */
export function infinite<T>(): UsageBound<T> {
  return { usage: () => "∞", maxUsage: "∞" };
}

// ============================================================================
// Usage-Bound Stream Interface
// ============================================================================

/**
 * UsageBoundStream extends StatefulStream with usage tracking
 * Each stream carries a usage function that determines how many times
 * the operation is performed for a given input
 */
export interface UsageBoundStream<I, S, O> extends StatefulStream<I, S, O> {
  /**
   * Usage function that determines multiplicity for a given input
   */
  readonly usage: Usage<I>;
  
  /**
   * Optional maximum usage bound for compile-time safety
   */
  readonly maxUsage?: Multiplicity;
}

// ============================================================================
// Type-Level Multiplicity Operations
// ============================================================================

/**
 * Type-level multiplication of finite multiplicities
 * Returns "∞" if either operand is infinite
 */
export type MultiplyUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends Nat ? 
    B extends Nat ? 
      number extends A ? "∞" :
      number extends B ? "∞" :
      A extends 0 ? 0 :
      B extends 0 ? 0 :
      A extends 1 ? B :
      B extends 1 ? A :
      "∞" : // For complex finite multiplications, we'll use "∞" for safety
    never :
  never;

/**
 * Type-level addition of finite multiplicities
 * Returns "∞" if either operand is infinite
 */
export type AddUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends Nat ? 
    B extends Nat ? 
      number extends A ? "∞" :
      number extends B ? "∞" :
      A extends 0 ? B :
      B extends 0 ? A :
      "∞" : // For complex finite additions, we'll use "∞" for safety
    never :
  never;

/**
 * Type-level maximum of finite multiplicities
 * Returns "∞" if either operand is infinite
 */
export type MaxUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends Nat ? 
    B extends Nat ? 
      number extends A ? "∞" :
      number extends B ? "∞" :
      A extends B ? A : B :
    never :
  never;

// ============================================================================
// Runtime Multiplicity Helpers (Canonical)
// ============================================================================

/** Multiply two multiplicities */
export function multiply(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (a === "∞" || b === "∞") return "∞";
  return a * b;
}

/** Add two multiplicities */
export function add(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (a === "∞" || b === "∞") return "∞";
  return a + b;
}

/** Take max of two multiplicities */
export function max(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (a === "∞" || b === "∞") return "∞";
  return Math.max(a, b);
}

/** a <= b for multiplicities */
export function lte(a: Multiplicity, b: Multiplicity): boolean {
  if (b === "∞") return true;
  if (a === "∞") return false;
  return a <= b;
}

/** Multiply two UsageBounds to obtain the composed UsageBound */
export function multiplyUsageBounds<A, B>(
  outer: UsageBound<A>,
  inner: UsageBound<B>
): UsageBound<B> {
  return {
    usage: (input: B) => multiply(inner.usage(input), outer.usage(input as any)),
    maxUsage:
      outer.maxUsage === "∞" || inner.maxUsage === "∞"
        ? "∞"
        : outer.maxUsage !== undefined && inner.maxUsage !== undefined
        ? Math.min(outer.maxUsage, inner.maxUsage)
        : outer.maxUsage ?? inner.maxUsage
  };
}

// ============================================================================
// Usage Validation Types
// ============================================================================

/**
 * Type-level check if usage exceeds a bound
 * Returns true if usage exceeds the bound, false otherwise
 */
export type UsageExceeds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  Bound extends "∞" ? false :
  Usage extends "∞" ? true :
  Usage extends Nat ? 
    Bound extends Nat ? 
      number extends Usage ? true :
      number extends Bound ? true :
      Usage extends Bound ? false : true :
    never :
  never;

/**
 * Type-level assertion that usage is within bounds
 * This will cause a type error if usage exceeds the bound
 */
export type AssertUsageWithinBounds<
  Usage extends Multiplicity, 
  Bound extends Multiplicity
> = UsageExceeds<Usage, Bound> extends true 
  ? never 
  : Usage;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the usage type from a UsageBoundStream
 */
export type ExtractUsage<I, S, O> = UsageBoundStream<I, S, O>['usage'];

/**
 * Extract the maxUsage type from a UsageBoundStream
 */
export type ExtractMaxUsage<I, S, O> = UsageBoundStream<I, S, O>['maxUsage'];

/**
 * Create a UsageBoundStream with a specific maxUsage
 */
export type WithMaxUsage<
  Stream extends UsageBoundStream<any, any, any>,
  Max extends Multiplicity
> = Omit<Stream, 'maxUsage'> & { maxUsage: Max };

/**
 * Type guard to check if a value is a UsageBoundStream
 */
export function isUsageBoundStream(value: any): value is UsageBoundStream<any, any, any> {
  return value && 
         typeof value.run === 'function' && 
         value.__brand === 'StatefulStream' &&
         typeof value.__purity === 'string' &&
         typeof value.usage === 'function';
}

/**
 * Type guard to check if a UsageBoundStream has a maxUsage bound
 */
export function hasMaxUsage(stream: UsageBoundStream<any, any, any>): stream is UsageBoundStream<any, any, any> & { maxUsage: Multiplicity } {
  return stream.maxUsage !== undefined;
}

// ============================================================================
// Constant Usage Functions
// ============================================================================

/**
 * Create a constant usage function
 */
export function constantUsage<I>(multiplicity: Multiplicity): Usage<I> {
  return () => multiplicity;
}

/**
 * Common usage functions
 */
export const onceUsage = <I>() => constantUsage<I>(1);
export const neverUsage = <I>() => constantUsage<I>(0);
export const infiniteUsage = <I>() => constantUsage<I>("∞");

/**
 * Create a usage function that depends on a predicate
 */
export function conditionalUsage<I>(
  predicate: (input: I) => boolean,
  trueMultiplicity: Multiplicity = 1,
  falseMultiplicity: Multiplicity = 0
): Usage<I> {
  return (input: I) => predicate(input) ? trueMultiplicity : falseMultiplicity;
}

/**
 * Create a usage function that maps over the input
 */
export function mappedUsage<I, N>(
  mapper: (input: I) => N,
  usageFn: Usage<N>
): Usage<I> {
  return (input: I) => usageFn(mapper(input));
} 