/**
 * Usage Integration for Typeclass Derivation System
 * 
 * This module provides integration between the usage registry and the typeclass
 * derivation system, enabling usage bounds to be part of the global type/instance system.
 */

import { 
  deriveInstances, 
  DerivationConfig, 
  DerivedInstances 
} from './fp-derivation-helpers';

import { 
  getUsageBound, 
  registerUsage, 
  hasUsageBound 
} from './usageRegistry';

import { 
  getFPRegistry, 
  registerUsageBound 
} from './fp-registry-init';

import { 
  Usage, 
  Multiplicity, 
  onceUsage, 
  infiniteUsage 
} from './src/stream/multiplicity/types';

// ============================================================================
// Enhanced Derivation Configuration
// ============================================================================

/**
 * Enhanced derivation configuration that includes usage information
 */
export interface UsageAwareDerivationConfig extends DerivationConfig {
  typeKey?: string; // Type key for registry lookup
  autoRegisterUsage?: boolean; // Whether to auto-register usage in global registry
  usage?: Usage<any>; // Optional explicit usage
}

/**
 * Enhanced derived instances with usage information
 */
export interface UsageAwareDerivedInstances extends DerivedInstances {
  typeKey?: string;
  usage?: Usage<any>;
}

// ============================================================================
// Enhanced Derivation Functions
// ============================================================================

/**
 * Derive instances with usage awareness
 * Automatically looks up usage from registry and attaches it to derived instances
 */
export function deriveInstancesWithUsage<F extends any>(
  config: UsageAwareDerivationConfig
): UsageAwareDerivedInstances {
  const instances = deriveInstances(config);
  const result: UsageAwareDerivedInstances = { ...instances };

  // If typeKey is provided, try to get usage from registry
  if (config.typeKey) {
    const registryUsage = getUsageBound(config.typeKey);
    if (registryUsage) {
      result.usage = registryUsage;
      result.typeKey = config.typeKey;
    }
  }

  // If explicit usage is provided, use it (overrides registry)
  if (config.usage) {
    result.usage = config.usage;
  }

  // Auto-register usage if requested
  if (config.autoRegisterUsage && config.typeKey && result.usage) {
    registerUsage(config.typeKey, result.usage);
    registerUsageBound(config.typeKey, result.usage);
  }

  return result;
}

/**
 * Derive instances for a type with automatic usage registration
 */
export function deriveInstancesForType<F extends any>(
  typeKey: string,
  config: Omit<UsageAwareDerivationConfig, 'typeKey' | 'autoRegisterUsage'> = {}
): UsageAwareDerivedInstances {
  return deriveInstancesWithUsage<F>({
    ...config,
    typeKey,
    autoRegisterUsage: true
  });
}

// ============================================================================
// Usage-Aware Instance Creation
// ============================================================================

/**
 * Create usage-aware instances for common types
 */
export const UsageAwareInstances = {
  /**
   * Create Lens instances with usage = 1
   */
  Lens: deriveInstancesForType('Lens', {
    usage: onceUsage<any>()
  }),

  /**
   * Create Prism instances with usage = 0 | 1
   */
  Prism: deriveInstancesForType('Prism', {
    usage: (input: any): Multiplicity => {
      // Simplified - in practice would check match success
      return 1;
    }
  }),

  /**
   * Create Optional instances with usage = 0 | 1
   */
  Optional: deriveInstancesForType('Optional', {
    usage: (input: any): Multiplicity => {
      // Simplified - in practice would check presence
      return 1;
    }
  }),

  /**
   * Create Traversal instances with usage = 0..N
   */
  Traversal: deriveInstancesForType('Traversal', {
    usage: (input: any): Multiplicity => {
      if (Array.isArray(input)) {
        return input.length;
      }
      return 1;
    }
  }),

  /**
   * Create Iso instances with usage = 1
   */
  Iso: deriveInstancesForType('Iso', {
    usage: onceUsage<any>()
  }),

  /**
   * Create ObservableLite instances with usage = ∞
   */
  ObservableLite: deriveInstancesForType('ObservableLite', {
    usage: infiniteUsage<any>()
  }),

  /**
   * Create StatefulStream instances with usage = ∞ (default)
   */
  StatefulStream: deriveInstancesForType('StatefulStream', {
    usage: infiniteUsage<any>()
  })
};

// ============================================================================
// Composition Integration
// ============================================================================

/**
 * Compose usage-aware instances with usage propagation
 */
export function composeUsageAwareInstances(
  outer: UsageAwareDerivedInstances,
  inner: UsageAwareDerivedInstances
): UsageAwareDerivedInstances {
  const composed: UsageAwareDerivedInstances = {};

  // Compose typeclass instances (this would need to be implemented based on the specific typeclasses)
  if (outer.functor && inner.functor) {
    // Compose functor instances
    composed.functor = {
      map: <A, B>(fa: any, f: (a: A) => B) => {
        return outer.functor!.map(inner.functor!.map(fa, f), f);
      }
    };
  }

  // Compose usage multiplicatively
  if (outer.usage && inner.usage) {
    composed.usage = <A>(input: A): Multiplicity => {
      const innerUsage = inner.usage!(input);
      const outerUsage = outer.usage!(input as any);
      
      if (innerUsage === "∞" || outerUsage === "∞") {
        return "∞";
      }
      return innerUsage * outerUsage;
    };
  }

  return composed;
}

// ============================================================================
// Registry Integration Helpers
// ============================================================================

/**
 * Get usage for a type from any available source
 */
export function getUsageForType(typeKey: string): Usage<any> | undefined {
  // Try registry first
  const registryUsage = getUsageBound(typeKey);
  if (registryUsage) {
    return registryUsage;
  }

  // Try global FP registry
  const fpRegistry = getFPRegistry();
  if (fpRegistry) {
    const globalUsage = fpRegistry.getUsage(typeKey);
    if (globalUsage) {
      return globalUsage;
    }
  }

  return undefined;
}

/**
 * Register usage for a type in all available registries
 */
export function registerUsageForType(typeKey: string, usage: Usage<any>): void {
  // Register in usage registry
  registerUsage(typeKey, usage);
  
  // Register in global FP registry
  registerUsageBound(typeKey, usage);
}

/**
 * Check if a type has usage registered anywhere
 */
export function hasUsageForType(typeKey: string): boolean {
  return hasUsageBound(typeKey) || 
         (getFPRegistry()?.getUsage(typeKey) !== undefined);
}

// ============================================================================
// Type-Level Enforcement (Optional)
// ============================================================================

/**
 * Branded type for bounded values
 */
export type Bounded<N extends number | "∞"> = { __bound: N };

/**
 * Type-level check for usage bounds
 */
export type UsageWithinBounds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  Bound extends "∞" ? true :
  Usage extends "∞" ? false :
  Usage extends number ? 
    Bound extends number ? 
      number extends Usage ? false :
      number extends Bound ? false :
      Usage extends Bound ? true : false :
    never :
  never;

/**
 * Assert that usage is within bounds at compile time
 */
export type AssertUsageWithinBounds<
  Usage extends Multiplicity, 
  Bound extends Multiplicity
> = UsageWithinBounds<Usage, Bound> extends true 
  ? Usage 
  : never;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a usage-aware instance with compile-time bounds
 */
export function createBoundedInstance<Usage extends Multiplicity>(
  usage: Usage,
  maxBound: Multiplicity
): { usage: Usage; maxBound: Multiplicity } {
  return { usage, maxBound };
}

/**
 * Validate usage at runtime
 */
export function validateUsage(
  usage: Multiplicity, 
  maxBound: Multiplicity
): boolean {
  if (maxBound === "∞") return true;
  if (usage === "∞") return false;
  return usage <= maxBound;
} 