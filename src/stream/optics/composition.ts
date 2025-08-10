/**
 * Usage-Bound Optics Composition
 * 
 * This module implements composition rules for usage-bound optics,
 * ensuring that usage bounds propagate correctly through optic composition.
 */

import {
  UsageBoundOptic,
  UsageBoundLens,
  UsageBoundPrism,
  UsageBoundTraversal,
  UsageBoundOptional,
  UsageBoundIso,
  MultiplyOpticUsage,
  MaxOpticUsage,
  AddOpticUsage
} from './types';

import {
  UsageBoundStream,
  Usage,
  Multiplicity
} from '../multiplicity/types';

import {
  multiplyMultiplicities,
  addMultiplicities,
  maxMultiplicities
} from '../multiplicity/composition';

import {
  liftStatelessUsage
} from '../multiplicity/composition';

// ============================================================================
// Sequential Composition with Usage Propagation
// ============================================================================

/**
 * Compose two usage-bound optics with usage multiplication
 * Sequential composition multiplies the usages of the individual optics
 */
export function composeUsageBoundOptics<S, T, A, B, C, D>(
  outer: UsageBoundOptic<S, T, A, B>,
  inner: UsageBoundOptic<A, B, C, D>
): UsageBoundOptic<S, T, C, D> {
  // Compose the underlying optics
  const composedOptic = (pcd: any) => outer(inner(pcd));
  
  // Compose the usage functions
  const composedUsage = (input: C): Multiplicity => {
    // Get the usage from the inner optic
    const innerUsage = inner.usage ? inner.usage(input) : 1;
    
    // For the outer optic, we need to get the intermediate result
    // This is a simplified approach - in practice, we'd need more sophisticated handling
    const outerUsage = outer.usage ? outer.usage(input as any) : 1;
    
    return multiplyMultiplicities(outerUsage, innerUsage);
  };
  
  // Create the composed usage-bound optic
  const result = composedOptic as any;
  result.usage = composedUsage;
  
  return result as UsageBoundOptic<S, T, C, D>;
}

/**
 * Compose multiple usage-bound optics in sequence
 */
export function composeManyUsageBoundOptics<S, T, A, B>(
  optics: UsageBoundOptic<any, any, any, any>[]
): UsageBoundOptic<S, T, A, B> {
  if (optics.length === 0) {
    throw new Error('Cannot compose empty array of optics');
  }
  
  if (optics.length === 1) {
    return optics[0] as UsageBoundOptic<S, T, A, B>;
  }
  
  return optics.reduce((acc, optic) => 
    composeUsageBoundOptics(acc, optic)
  ) as UsageBoundOptic<S, T, A, B>;
}

// ============================================================================
// Parallel Composition with Usage Preservation
// ============================================================================

/**
 * Compose usage-bound optics in parallel (zipping)
 * Parallel composition preserves the maximum usage of individual optics
 */
export function parallelUsageBoundOptics<S, T, A, B, C, D>(
  optic1: UsageBoundOptic<S, T, A, B>,
  optic2: UsageBoundOptic<S, T, C, D>
): UsageBoundOptic<S, T, [A, C], [B, D]> {
  // Compose the underlying optics in parallel
  const parallelOptic = (pabcd: any) => {
    // This is a simplified parallel composition
    // In practice, this would need more sophisticated handling
    return optic1(optic2(pabcd));
  };
  
  // Compose the usage functions (take maximum)
  const parallelUsage = (input: [A, C]): Multiplicity => {
    const usage1 = optic1.usage ? optic1.usage(input[0]) : 1;
    const usage2 = optic2.usage ? optic2.usage(input[1]) : 1;
    
    return maxMultiplicities(usage1, usage2);
  };
  
  const result = parallelOptic as any;
  result.usage = parallelUsage;
  
  return result as UsageBoundOptic<S, T, [A, C], [B, D]>;
}

// ============================================================================
// Fan-Out Composition with Usage Addition
// ============================================================================

/**
 * Compose usage-bound optics with fan-out (same input to multiple optics)
 * Fan-out composition adds the usages of individual optics
 */
export function fanOutUsageBoundOptics<S, T, A, B, C, D>(
  optic1: UsageBoundOptic<S, T, A, B>,
  optic2: UsageBoundOptic<S, T, A, C>
): UsageBoundOptic<S, T, A, [B, C]> {
  // Compose the underlying optics with fan-out
  const fanOutOptic = (pabc: any) => {
    // This is a simplified fan-out composition
    // In practice, this would need more sophisticated handling
    return optic1(optic2(pabc));
  };
  
  // Compose the usage functions (add usages)
  const fanOutUsage = (input: A): Multiplicity => {
    const usage1 = optic1.usage ? optic1.usage(input) : 1;
    const usage2 = optic2.usage ? optic2.usage(input) : 1;
    
    return addMultiplicities(usage1, usage2);
  };
  
  const result = fanOutOptic as any;
  result.usage = fanOutUsage;
  
  return result as UsageBoundOptic<S, T, A, [B, C]>;
}

// ============================================================================
// Specific Optic Type Compositions
// ============================================================================

/**
 * Compose usage-bound lens with usage-bound lens
 * Result: UsageBoundLens with multiplied usage
 */
export function composeUsageBoundLenses<S, T, A, B, C, D>(
  outer: UsageBoundLens<S, T, A, B>,
  inner: UsageBoundLens<A, B, C, D>
): UsageBoundLens<S, T, C, D> {
  const composed = composeUsageBoundOptics(outer, inner);
  return {
    ...composed,
    __type: 'UsageBoundLens'
  } as UsageBoundLens<S, T, C, D>;
}

/**
 * Compose usage-bound lens with usage-bound traversal
 * Result: UsageBoundTraversal with multiplied usage
 */
export function composeUsageBoundLensTraversal<S, T, A, B, C, D>(
  lens: UsageBoundLens<S, T, A, B>,
  traversal: UsageBoundTraversal<A, B, C, D>
): UsageBoundTraversal<S, T, C, D> {
  const composed = composeUsageBoundOptics(lens, traversal);
  return {
    ...composed,
    __type: 'UsageBoundTraversal'
  } as UsageBoundTraversal<S, T, C, D>;
}

/**
 * Compose usage-bound traversal with usage-bound lens
 * Result: UsageBoundTraversal with multiplied usage
 */
export function composeUsageBoundTraversalLens<S, T, A, B, C, D>(
  traversal: UsageBoundTraversal<S, T, A, B>,
  lens: UsageBoundLens<A, B, C, D>
): UsageBoundTraversal<S, T, C, D> {
  const composed = composeUsageBoundOptics(traversal, lens);
  return {
    ...composed,
    __type: 'UsageBoundTraversal'
  } as UsageBoundTraversal<S, T, C, D>;
}

/**
 * Compose usage-bound traversal with usage-bound traversal
 * Result: UsageBoundTraversal with multiplied usage
 */
export function composeUsageBoundTraversals<S, T, A, B, C, D>(
  outer: UsageBoundTraversal<S, T, A, B>,
  inner: UsageBoundTraversal<A, B, C, D>
): UsageBoundTraversal<S, T, C, D> {
  const composed = composeUsageBoundOptics(outer, inner);
  return {
    ...composed,
    __type: 'UsageBoundTraversal'
  } as UsageBoundTraversal<S, T, C, D>;
}

/**
 * Compose usage-bound prism with usage-bound prism
 * Result: UsageBoundPrism with multiplied usage
 */
export function composeUsageBoundPrisms<S, T, A, B, C, D>(
  outer: UsageBoundPrism<S, T, A, B>,
  inner: UsageBoundPrism<A, B, C, D>
): UsageBoundPrism<S, T, C, D> {
  const composed = composeUsageBoundOptics(outer, inner);
  return {
    ...composed,
    __type: 'UsageBoundPrism'
  } as UsageBoundPrism<S, T, C, D>;
}

// ============================================================================
// Lifting Optics to Usage-Bound Streams
// ============================================================================

/**
 * Convert a usage-bound optic to a usage-bound stream
 * The resulting stream applies the optic's transformation with usage tracking
 */
export function opticToUsageBoundStream<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>
): UsageBoundStream<A, unknown, B> {
  return {
    run: (input: A) => (state: unknown) => {
      // Apply the optic transformation
      // This is a simplified implementation - in practice, we'd need proper optic application
      const result = optic((a: A) => a)(input);
      return [state, result as B];
    },
    usage: optic.usage || (() => 1),
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Convert a usage-bound lens to a usage-bound stream
 */
export function lensToUsageBoundStream<S, T, A, B>(
  lens: UsageBoundLens<S, T, A, B>
): UsageBoundStream<A, unknown, B> {
  return opticToUsageBoundStream(lens);
}

/**
 * Convert a usage-bound traversal to a usage-bound stream
 */
export function traversalToUsageBoundStream<S, T, A, B>(
  traversal: UsageBoundTraversal<S, T, A, B>
): UsageBoundStream<A, unknown, B> {
  return opticToUsageBoundStream(traversal);
}

/**
 * Convert a usage-bound prism to a usage-bound stream
 */
export function prismToUsageBoundStream<S, T, A, B>(
  prism: UsageBoundPrism<S, T, A, B>
): UsageBoundStream<A, unknown, B> {
  return opticToUsageBoundStream(prism);
}

// ============================================================================
// Usage Validation and Safety
// ============================================================================

/**
 * Validate that optic usage is within bounds
 * Throws an error if usage exceeds the bound
 */
export function validateOpticUsage<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>,
  input: A,
  maxUsage?: Multiplicity
): Multiplicity {
  const usage = optic.usage ? optic.usage(input) : 1;
  
  if (maxUsage !== undefined && usage !== "∞" && maxUsage !== "∞") {
    if (usage > maxUsage) {
      throw new Error(`Optic usage ${usage} exceeds maximum bound ${maxUsage}`);
    }
  }
  
  return usage;
}

/**
 * Create a usage-bound optic with runtime validation
 */
export function withOpticUsageValidation<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>,
  maxUsage: Multiplicity
): UsageBoundOptic<S, T, A, B> & { maxUsage: Multiplicity } {
  const validatedOptic = optic as any;
  validatedOptic.maxUsage = maxUsage;
  validatedOptic.usage = (input: A) => {
    const usage = optic.usage ? optic.usage(input) : 1;
    validateOpticUsage(optic, input, maxUsage);
    return usage;
  };
  
  return validatedOptic;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the usage of an optic for a given input
 */
export function getOpticUsage<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>,
  input: A
): Multiplicity {
  return optic.usage ? optic.usage(input) : 1;
}

/**
 * Check if an optic has usage bounds
 */
export function hasOpticUsageBounds<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>
): boolean {
  return optic.usage !== undefined || optic.maxUsage !== undefined;
}

/**
 * Create a usage-bound optic with constant usage
 */
export function withConstantUsage<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>,
  usage: Multiplicity
): UsageBoundOptic<S, T, A, B> {
  const result = optic as any;
  result.usage = () => usage;
  return result;
}

/**
 * Create a usage-bound optic with conditional usage
 */
export function withConditionalUsage<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>,
  predicate: (input: A) => boolean,
  trueUsage: Multiplicity = 1,
  falseUsage: Multiplicity = 0
): UsageBoundOptic<S, T, A, B> {
  const result = optic as any;
  result.usage = (input: A) => predicate(input) ? trueUsage : falseUsage;
  return result;
} 