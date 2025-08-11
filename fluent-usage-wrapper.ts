/**
 * Fluent Usage-Bound Wrapper System
 * 
 * This module provides a shared wrapper type for fluent-enabled objects that
 * propagates and enforces multiplicity bounds from the registry across all
 * fluent method chains.
 */

// Import canonical types and helpers from the multiplicity system
import {
  Usage,
  Multiplicity,
  UsageBound as CanonicalUsageBound,
  multiplyUsageBounds,
  infinite as infiniteBound
} from './src/stream/multiplicity/types';

import { 
  getUsageBound, 
  registerUsage 
} from './usageRegistry';

import { 
  getUsageBound as getGlobalUsageBound 
} from './fp-registry-init';

// ============================================================================
// Core Fluent Wrapper Types
// ============================================================================

/**
 * Usage-bound interface that all fluent-enabled objects must implement
 */
export type UsageBound<T> = CanonicalUsageBound<T>;

/**
 * Shared wrapper type for fluent-enabled objects
 * All fluent-enabled ADTs should extend or wrap this type
 */
export interface FluentOps<T, UB extends UsageBound<any>> {
  readonly __usageBound: UB;
  
  // Core fluent methods that propagate usage bounds
  map<B>(f: (a: T) => B): FluentOps<B, UsageBound<B>>;
  filter(predicate: (a: T) => boolean): FluentOps<T, UsageBound<T>>;
  scan<B>(initial: B, f: (acc: B, a: T) => B): FluentOps<B, UsageBound<B>>;
  chain<B>(f: (a: T) => FluentOps<B, UsageBound<B>>): FluentOps<B, UsageBound<B>>;
  flatMap<B>(f: (a: T) => FluentOps<B, UsageBound<B>>): FluentOps<B, UsageBound<B>>;
  take(n: number): FluentOps<T, UsageBound<T>>;
  
  // Utility methods
  getUsageBound(): UsageBound<T>;
  validateUsage(input: T): Multiplicity;
  getValue(): T;
}

// ============================================================================
// Fluent Wrapper Implementation
// ============================================================================

/**
 * Base implementation of FluentOps that handles usage bound propagation
 */
export abstract class FluentOpsImpl<T, UB extends UsageBound<T>> implements FluentOps<T, UB> {
  constructor(
    protected readonly value: T,
    public readonly __usageBound: UB
  ) {}

  /**
   * Get the current usage bound
   */
  getUsageBound(): UsageBound<T> {
    return this.__usageBound;
  }

  /**
   * Validate usage for a given input
   */
  validateUsage(input: T): Multiplicity {
    const usage = this.__usageBound.usage(input);
    
    // Runtime validation in dev mode
    if (process.env.NODE_ENV === 'development') {
      if (this.__usageBound.maxUsage !== undefined && 
          usage !== "∞" && 
          this.__usageBound.maxUsage !== "∞" && 
          usage > this.__usageBound.maxUsage) {
        throw new Error(`Usage ${usage} exceeds maximum bound ${this.__usageBound.maxUsage}`);
      }
    }
    
    return usage;
  }

  /**
   * Get the wrapped value
   */
  getValue(): T {
    return this.value;
  }

  // ============================================================================
  // Core Fluent Methods with Usage Propagation
  // ============================================================================

  /**
   * Map with usage propagation
   * Usage bound remains the same (1:1 transformation)
   */
  abstract map<B>(f: (a: T) => B): FluentOps<B, UsageBound<B>>;

  /**
   * Filter with usage propagation
   * Usage bound remains the same or decreases (never increases)
   */
  abstract filter(predicate: (a: T) => boolean): FluentOps<T, UsageBound<T>>;

  /**
   * Scan with usage propagation
   * Usage bound = input bound × 1 (once per element)
   */
  abstract scan<B>(initial: B, f: (acc: B, a: T) => B): FluentOps<B, UsageBound<B>>;

  /**
   * Chain with usage propagation
   * Usage bound multiplies by inner stream's bound
   */
  abstract chain<B>(f: (a: T) => FluentOps<B, UsageBound<B>>): FluentOps<B, UsageBound<B>>;

  /**
   * FlatMap with usage propagation (alias for chain)
   */
  flatMap<B>(f: (a: T) => FluentOps<B, UsageBound<B>>): FluentOps<B, UsageBound<B>> {
    return this.chain(f);
  }

  /**
   * Take with usage propagation
   * Usage bound = min(currentBound, n)
   */
  abstract take(n: number): FluentOps<T, UsageBound<T>>;
}

// ============================================================================
// Usage Bound Propagation Helpers
// ============================================================================

/**
 * Multiply usage bounds for sequential composition
 */
// Note: multiplyUsageBounds is imported from canonical types

/**
 * Take minimum of usage bounds
 */
export function minUsageBounds<A>(
  bound1: UsageBound<A>,
  bound2: UsageBound<A>
): UsageBound<A> {
  return {
    usage: (input: A): Multiplicity => {
      const usage1 = bound1.usage(input);
      const usage2 = bound2.usage(input);
      
      if (usage1 === "∞") return usage2;
      if (usage2 === "∞") return usage1;
      return Math.min(usage1, usage2);
    },
    maxUsage: bound1.maxUsage === "∞" ? bound2.maxUsage :
              bound2.maxUsage === "∞" ? bound1.maxUsage :
              bound1.maxUsage !== undefined && bound2.maxUsage !== undefined ?
              Math.min(bound1.maxUsage, bound2.maxUsage) : undefined
  };
}

/**
 * Create usage bound for filter operation
 * Usage bound remains the same or decreases
 */
export function filterUsageBound<A>(
  original: UsageBound<A>,
  predicate: (a: A) => boolean
): UsageBound<A> {
  return {
    usage: (input: A): Multiplicity => {
      const originalUsage = original.usage(input);
      // Filter can only decrease usage, never increase
      return originalUsage;
    },
    maxUsage: original.maxUsage
  };
}

/**
 * Create usage bound for scan operation
 * Usage bound = input bound × 1 (once per element)
 */
export function scanUsageBound<A, B>(
  original: UsageBound<A>
): UsageBound<B> {
  return {
    usage: (input: B): Multiplicity => {
      const originalUsage = original.usage(input as any);
      // Scan processes each element once
      return originalUsage;
    },
    maxUsage: original.maxUsage
  };
}

/**
 * Create usage bound for take operation
 * Usage bound = min(currentBound, n)
 */
export function takeUsageBound<A>(
  original: UsageBound<A>,
  n: number
): UsageBound<A> {
  return {
    usage: (input: A): Multiplicity => {
      const originalUsage = original.usage(input);
      if (originalUsage === "∞") return n;
      return Math.min(originalUsage, n);
    },
    maxUsage: original.maxUsage === "∞" ? n :
              original.maxUsage !== undefined ? Math.min(original.maxUsage, n) : n
  };
}

// ============================================================================
// Registry Integration
// ============================================================================

/**
 * Get usage bound for a type from registry
 */
export function getUsageBoundForType<T>(typeKey: string): UsageBound<T> {
  // Try usage registry first
  const usageRegistry = getUsageBound(typeKey);
  if (usageRegistry) {
    return {
      usage: usageRegistry,
      maxUsage: undefined
    };
  }
  
  // Try global registry
  const globalRegistry = getGlobalUsageBound(typeKey);
  if (globalRegistry) {
    return {
      usage: globalRegistry,
      maxUsage: undefined
    };
  }
  
  // Default to infinite usage
  return infiniteBound<T>();
}

/**
 * Create fluent wrapper with usage bound from registry
 */
export function createFluentWrapper<T>(
  value: T,
  typeKey: string,
  customUsage?: Usage<T>
): FluentOps<T, UsageBound<T>> {
  const usageBound = customUsage ? 
    { usage: customUsage, maxUsage: undefined } :
    getUsageBoundForType<T>(typeKey);
  
  return new GenericFluentWrapper(value, usageBound);
}

// ============================================================================
// Generic Fluent Wrapper Implementation
// ============================================================================

/**
 * Generic implementation of FluentOps for any value type
 */
class GenericFluentWrapper<T> extends FluentOpsImpl<T, UsageBound<T>> {
  constructor(value: T, usageBound: UsageBound<T>) {
    super(value, usageBound);
  }

  map<B>(f: (a: T) => B): FluentOps<B, UsageBound<B>> {
    const mappedValue = f(this.value);
    const mappedUsageBound: UsageBound<B> = {
      usage: (input: B): Multiplicity => this.__usageBound.usage(input as any),
      maxUsage: this.__usageBound.maxUsage
    };
    
    return new GenericFluentWrapper(mappedValue, mappedUsageBound);
  }

  filter(predicate: (a: T) => boolean): FluentOps<T, UsageBound<T>> {
    if (!predicate(this.value)) {
      // If filtered out, return empty wrapper
      const emptyUsageBound: UsageBound<T> = {
        usage: () => 0,
        maxUsage: 0
      };
      return new GenericFluentWrapper(this.value, emptyUsageBound);
    }
    
    const filteredUsageBound = filterUsageBound(this.__usageBound, predicate);
    return new GenericFluentWrapper(this.value, filteredUsageBound);
  }

  scan<B>(initial: B, f: (acc: B, a: T) => B): FluentOps<B, UsageBound<B>> {
    const scannedValue = f(initial, this.value);
    const scannedUsageBound = scanUsageBound<T, B>(this.__usageBound);
    
    return new GenericFluentWrapper(scannedValue, scannedUsageBound);
  }

  chain<B>(f: (a: T) => FluentOps<B, UsageBound<B>>): FluentOps<B, UsageBound<B>> {
    const innerWrapper = f(this.value);
    const chainedUsageBound = multiplyUsageBounds(this.__usageBound, innerWrapper.getUsageBound());
    
    // Access the value through the wrapper's internal structure
    const innerValue = (innerWrapper as any).value;
    return new GenericFluentWrapper(innerValue, chainedUsageBound);
  }

  take(n: number): FluentOps<T, UsageBound<T>> {
    const takeUsageBoundResult = takeUsageBound(this.__usageBound, n);
    return new GenericFluentWrapper(this.value, takeUsageBoundResult);
  }

  // Expose the wrapped value
  getValue(): T {
    return this.value;
  }
}

// ============================================================================
// Type-Level Enforcement
// ============================================================================

/**
 * Type-level check if usage exceeds a bound
 */
export type ExceedingBound<Actual extends Multiplicity, Max extends Multiplicity> = 
  Max extends "∞" ? false :
  Actual extends "∞" ? true :
  Actual extends number ? 
    Max extends number ? 
      Actual extends Max ? false : true :
    never :
  never;

/**
 * Assert that usage is within bounds at compile time
 */
export type AssertWithinBound<Actual extends Multiplicity, Max extends Multiplicity> = 
  ExceedingBound<Actual, Max> extends true ? 
    never : // Compile error
    Actual;

/**
 * Compile-time error type
 */
export type CompileError = never;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a fluent wrapper with custom usage bound
 */
export function fluent<T>(
  value: T,
  usage: Usage<T>,
  maxUsage?: Multiplicity
): FluentOps<T, UsageBound<T>> {
  const usageBound: UsageBound<T> = { usage, maxUsage };
  return new GenericFluentWrapper(value, usageBound);
}

/**
 * Create a fluent wrapper with infinite usage
 */
export function fluentInfinite<T>(value: T): FluentOps<T, UsageBound<T>> {
  return fluent(value, () => "∞", "∞");
}

/**
 * Create a fluent wrapper with usage = 1
 */
export function fluentOnce<T>(value: T): FluentOps<T, UsageBound<T>> {
  return fluent(value, () => 1, 1);
} 