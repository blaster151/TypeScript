/**
 * Usage-Bound Optics Types
 * 
 * This module extends the existing optics system with usage bounds,
 * enabling usage tracking to propagate naturally through Lens, Prism, Traversal, etc.
 */

import {
  Optic, Lens, Prism, Traversal, Optional, Iso
} from '../../../fp-optics';

import {
  UsageBoundStream,
  Usage,
  Multiplicity,
  constantUsage,
  onceUsage,
  neverUsage,
  infiniteUsage,
  UsageBound as CanonicalUsageBound
} from '../multiplicity/types';

// ============================================================================
// Core Usage-Bound Optic Interface
// ============================================================================

/**
 * Usage-Bound Optic interface that extends base optics with usage tracking
 * Each optic can carry an optional usage function that determines multiplicity
 */
export interface UsageBoundOptic<S, T, A, B> extends Optic<any, S, T, A, B> {
  /**
   * Optional usage function that determines multiplicity for a given input
   * If not provided, defaults to infinite usage ("∞")
   */
  readonly usage?: Usage<A>;
  
  /**
   * Optional maximum usage bound for compile-time safety
   */
  readonly maxUsage?: Multiplicity;
}

// ============================================================================
// Usage-Bound Optic Variants
// ============================================================================

/**
 * Usage-Bound Lens - focuses on a single field with usage tracking
 * Default usage: 1 (focuses exactly one field)
 */
export interface UsageBoundLens<S, T, A, B> extends Lens<S, T, A, B>, UsageBoundOptic<S, T, A, B> {
  readonly __type: 'UsageBoundLens';
}

/**
 * Usage-Bound Prism - focuses on optional branch with usage tracking
 * Default usage: 0 | 1 (depending on match)
 */
export interface UsageBoundPrism<S, T, A, B> extends Prism<S, T, A, B>, UsageBoundOptic<S, T, A, B> {
  readonly __type: 'UsageBoundPrism';
}

/**
 * Usage-Bound Traversal - focuses on multiple elements with usage tracking
 * Default usage: 0..N (where N is the number of focused elements)
 */
export interface UsageBoundTraversal<S, T, A, B> extends Traversal<S, T, A, B>, UsageBoundOptic<S, T, A, B> {
  readonly __type: 'UsageBoundTraversal';
}

/**
 * Usage-Bound Optional - focuses on optional part with usage tracking
 * Default usage: 0 | 1 (depending on presence)
 */
export interface UsageBoundOptional<S, T, A, B> extends Optional<S, T, A, B>, UsageBoundOptic<S, T, A, B> {
  readonly __type: 'UsageBoundOptional';
}

/**
 * Usage-Bound Iso - isomorphism with usage tracking
 * Default usage: 1 (always transforms exactly once)
 */
export interface UsageBoundIso<S, T, A, B> extends Iso<S, T, A, B>, UsageBoundOptic<S, T, A, B> {
  readonly __type: 'UsageBoundIso';
}

// ============================================================================
// Type-Level Usage Operations for Optics
// ============================================================================

/**
 * Type-level multiplication of optic usages
 * For sequential composition, usages are multiplied
 */
export type MultiplyOpticUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends number ? 
    B extends number ? 
      A extends 0 ? 0 :
      B extends 0 ? 0 :
      A extends 1 ? B :
      B extends 1 ? A :
      "∞" : // For complex multiplications, use "∞" for safety
    never :
  never;

/**
 * Type-level maximum of optic usages
 * For parallel composition, usages are maximized
 */
export type MaxOpticUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends number ? 
    B extends number ? 
      A extends B ? A : B :
    never :
  never;

/**
 * Type-level addition of optic usages
 * For fan-out composition, usages are added
 */
export type AddOpticUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends number ? 
    B extends number ? 
      A extends 0 ? B :
      B extends 0 ? A :
      "∞" : // For complex additions, use "∞" for safety
    never :
  never;

// ============================================================================
// Usage Validation Types
// ============================================================================

/**
 * Type-level check if optic usage exceeds a bound
 */
export type OpticUsageExceeds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  Bound extends "∞" ? false :
  Usage extends "∞" ? true :
  Usage extends number ? 
    Bound extends number ? 
      number extends Usage ? true :
      number extends Bound ? true :
      Usage extends Bound ? false : true :
    never :
  never;

/**
 * Type-level assertion that optic usage is within bounds
 */
export type AssertOpticUsageWithinBounds<
  Usage extends Multiplicity, 
  Bound extends Multiplicity
> = OpticUsageExceeds<Usage, Bound> extends true 
  ? never 
  : Usage;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the usage type from a UsageBoundOptic
 */
export type ExtractOpticUsage<S, T, A, B> = UsageBoundOptic<S, T, A, B>['usage'];

/**
 * Extract the maxUsage type from a UsageBoundOptic
 */
export type ExtractOpticMaxUsage<S, T, A, B> = UsageBoundOptic<S, T, A, B>['maxUsage'];

/**
 * Create a UsageBoundOptic with a specific maxUsage
 */
export type WithOpticMaxUsage<
  Optic extends UsageBoundOptic<any, any, any, any>,
  Max extends Multiplicity
> = Omit<Optic, 'maxUsage'> & { maxUsage: Max };

/**
 * Type guard to check if a value is a UsageBoundOptic
 */
export function isUsageBoundOptic(value: any): value is UsageBoundOptic<any, any, any, any> {
  return value && 
         typeof value === 'function' &&
         (value.usage === undefined || typeof value.usage === 'function');
}

/**
 * Type guard to check if a UsageBoundOptic has a maxUsage bound
 */
export function hasOpticMaxUsage(optic: UsageBoundOptic<any, any, any, any>): optic is UsageBoundOptic<any, any, any, any> & { maxUsage: Multiplicity } {
  return optic.maxUsage !== undefined;
}

// ============================================================================
// Default Usage Functions for Standard Optics
// ============================================================================

/**
 * Default usage for lenses: always 1 (focuses exactly one field)
 */
export const lensUsage = <A>() => onceUsage<A>();

/**
 * Default usage for prisms: 0 | 1 (depending on match)
 * This is a placeholder - actual usage depends on the specific prism and input
 */
export const prismUsage = <A>() => (input: A): Multiplicity => {
  // This is a simplified default - actual prisms should override this
  return 1;
};

/**
 * Default usage for traversals: 0..N (where N is the number of focused elements)
 * This is a placeholder - actual usage depends on the specific traversal and input
 */
export const traversalUsage = <A>() => (input: A): Multiplicity => {
  // This is a simplified default - actual traversals should override this
  if (Array.isArray(input)) {
    return input.length;
  }
  return "∞";
};

/**
 * Default usage for optionals: 0 | 1 (depending on presence)
 * This is a placeholder - actual usage depends on the specific optional and input
 */
export const optionalUsage = <A>() => (input: A): Multiplicity => {
  // This is a simplified default - actual optionals should override this
  return 1;
};

/**
 * Default usage for isos: always 1 (always transforms exactly once)
 */
export const isoUsage = <A>() => onceUsage<A>();

// ============================================================================
// Usage-Bound Optic Constructors
// ============================================================================

/**
 * Create a usage-bound lens with default usage of 1
 */
export function usageBoundLens<S, T, A, B>(
  optic: Lens<S, T, A, B>,
  usage: Usage<A> = lensUsage<A>()
): UsageBoundLens<S, T, A, B> {
  return {
    ...optic,
    usage,
    __type: 'UsageBoundLens'
  } as UsageBoundLens<S, T, A, B>;
}

/**
 * Create a usage-bound prism with default usage of 0 | 1
 */
export function usageBoundPrism<S, T, A, B>(
  optic: Prism<S, T, A, B>,
  usage: Usage<A> = prismUsage<A>()
): UsageBoundPrism<S, T, A, B> {
  return {
    ...optic,
    usage,
    __type: 'UsageBoundPrism'
  } as UsageBoundPrism<S, T, A, B>;
}

/**
 * Create a usage-bound traversal with default usage of 0..N
 */
export function usageBoundTraversal<S, T, A, B>(
  optic: Traversal<S, T, A, B>,
  usage: Usage<A> = traversalUsage<A>()
): UsageBoundTraversal<S, T, A, B> {
  return {
    ...optic,
    usage,
    __type: 'UsageBoundTraversal'
  } as UsageBoundTraversal<S, T, A, B>;
}

/**
 * Create a usage-bound optional with default usage of 0 | 1
 */
export function usageBoundOptional<S, T, A, B>(
  optic: Optional<S, T, A, B>,
  usage: Usage<A> = optionalUsage<A>()
): UsageBoundOptional<S, T, A, B> {
  return {
    ...optic,
    usage,
    __type: 'UsageBoundOptional'
  } as UsageBoundOptional<S, T, A, B>;
}

/**
 * Create a usage-bound iso with default usage of 1
 */
export function usageBoundIso<S, T, A, B>(
  optic: Iso<S, T, A, B>,
  usage: Usage<A> = isoUsage<A>()
): UsageBoundIso<S, T, A, B> {
  return {
    ...optic,
    usage,
    __type: 'UsageBoundIso'
  } as UsageBoundIso<S, T, A, B>;
}

// ============================================================================
// Usage-Bound Optic with Validation
// ============================================================================

/**
 * Create a usage-bound optic with runtime usage validation
 */
export function withOpticUsageValidation<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>,
  maxUsage: Multiplicity
): UsageBoundOptic<S, T, A, B> & { maxUsage: Multiplicity } {
  const validatedOptic = optic as any;
  validatedOptic.maxUsage = maxUsage;
  validatedOptic.usage = (input: A) => {
    const usage = optic.usage ? optic.usage(input) : infiniteUsage<A>()(input);
    
    // Runtime validation
    if (usage !== "∞" && maxUsage !== "∞" && usage > maxUsage) {
      throw new Error(`Optic usage ${usage} exceeds maximum bound ${maxUsage}`);
    }
    
    return usage;
  };
  
  return validatedOptic;
}

/**
 * Compile-time usage bound assertion for optics
 */
export function assertOpticUsageBound<
  Optic extends UsageBoundOptic<any, any, any, any>,
  Bound extends Multiplicity
>(
  optic: Optic,
  bound: Bound
): Optic & { maxUsage: Bound } {
  return {
    ...optic,
    maxUsage: bound
  } as any;
} 