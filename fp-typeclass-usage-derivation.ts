/**
 * Enhanced Typeclass Derivation with UsageBound Propagation
 * 
 * This module extends the typeclass derivation system to automatically propagate
 * UsageBound metadata across Functor, Applicative, Monad, and Traversable instances.
 */

// Import types from the multiplicity system
type Usage<T> = (input: T) => Multiplicity;
type Multiplicity = number | "∞";

// Utility functions
function constantUsage<T>(multiplicity: Multiplicity): Usage<T> {
  return () => multiplicity;
}

function onceUsage<T>(): Usage<T> {
  return constantUsage<T>(1);
}

function infiniteUsage<T>(): Usage<T> {
  return constantUsage<T>("∞");
}

import { 
  UsageBound, 
  multiplyUsageBounds,
  getUsageBoundForType
} from './fluent-usage-wrapper';

import { 
  getUsageBound, 
  registerUsage 
} from './usageRegistry';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * Higher-kinded type representation
 */
export type Kind<F, A> = F extends { readonly __type: infer T } ? T : never;

/**
 * Functor interface with usage bounds
 */
export interface Functor<F> {
  readonly map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>;
  readonly usageBound: UsageBound<any>;
}

/**
 * Applicative interface with usage bounds
 */
export interface Applicative<F> extends Functor<F> {
  readonly of: <A>(a: A) => Kind<F, A>;
  readonly ap: <A, B>(fab: Kind<F, (a: A) => B>, fa: Kind<F, A>) => Kind<F, B>;
}

/**
 * Monad interface with usage bounds
 */
export interface Monad<F> extends Applicative<F> {
  readonly chain: <A, B>(fa: Kind<F, A>, f: (a: A) => Kind<F, B>) => Kind<F, B>;
}

/**
 * Traversable interface with usage bounds
 */
export interface Traversable<F> extends Functor<F> {
  readonly traverse: <G extends Applicative<any>, A, B>(
    fa: Kind<F, A>,
    f: (a: A) => Kind<G, B>
  ) => Kind<G, Kind<F, B>>;
}

/**
 * Enhanced derivation configuration with usage bounds
 */
export interface UsageBoundDerivationConfig<F, UB extends UsageBound<any>> {
  // Core typeclass implementations
  map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>;
  of?: <A>(a: A) => Kind<F, A>;
  ap?: <A, B>(fab: Kind<F, (a: A) => B>, fa: Kind<F, A>) => Kind<F, B>;
  chain?: <A, B>(fa: Kind<F, A>, f: (a: A) => Kind<F, B>) => Kind<F, B>;
  traverse?: <G extends Applicative<any>, A, B>(
    fa: Kind<F, A>,
    f: (a: A) => Kind<G, B>
  ) => Kind<G, Kind<F, B>>;
  
  // Usage bound configuration
  usageBound?: UB;
  typeKey?: string; // For registry lookup
  /**
   * Declared upper bound for the function passed to chain. If provided,
   * chain will multiply fa's bound with this bound instead of inferring
   * by mock invocation.
   */
  fUsageBound?: UsageBound<any>;
  
  // Typeclass flags
  functor?: boolean;
  applicative?: boolean;
  monad?: boolean;
  traversable?: boolean;
}

/**
 * Enhanced derived instances with usage bounds
 */
export interface UsageBoundDerivedInstances<F, UB extends UsageBound<any>> {
  functor?: Functor<F>;
  applicative?: Applicative<F>;
  monad?: Monad<F>;
  traversable?: Traversable<F>;
  usageBound: UB;
  typeKey?: string;
}

// ============================================================================
// Usage Bound Registry
// ============================================================================

/**
 * Registry for default usage bounds of built-in types
 */
const usageBoundRegistry = new Map<string, Multiplicity>();

/**
 * Register default usage bound for a type
 */
export function registerTypeUsageBound(typeKey: string, bound: Multiplicity): void {
  usageBoundRegistry.set(typeKey, bound);
}

/**
 * Get default usage bound for a type
 */
export function getTypeUsageBound(typeKey: string): Multiplicity {
  return usageBoundRegistry.get(typeKey) || "∞";
}

/**
 * Initialize default usage bounds for built-in types
 */
export function initializeDefaultUsageBounds(): void {
  // Pure ADTs = 1
  registerTypeUsageBound('Maybe', 1);
  registerTypeUsageBound('Either', 1);
  registerTypeUsageBound('Result', 1);
  registerTypeUsageBound('Option', 1);
  registerTypeUsageBound('Tuple', 1);
  
  // Collection types = "∞" unless known finite
  registerTypeUsageBound('Array', "∞");
  registerTypeUsageBound('List', "∞");
  registerTypeUsageBound('Set', "∞");
  registerTypeUsageBound('Map', "∞");
  
  // Stream types = "∞"
  registerTypeUsageBound('ObservableLite', "∞");
  registerTypeUsageBound('StatefulStream', "∞");
  registerTypeUsageBound('Stream', "∞");
  
  // Optic types
  registerTypeUsageBound('Lens', 1);
  registerTypeUsageBound('Prism', 1);
  registerTypeUsageBound('Traversal', "∞");
  registerTypeUsageBound('Getter', 1);
  registerTypeUsageBound('Setter', 1);
  
  console.log('✅ Initialized default usage bounds for built-in types');
}

// ============================================================================
// Usage Bound Propagation Helpers
// ============================================================================

/**
 * Get usage bound from a value
 */
export function getUsageBoundFromValue<T>(value: T): UsageBound<T> {
  if (value && typeof value === 'object' && 'usageBound' in value) {
    return (value as any).usageBound;
  }
  
  // Fallback to infinite usage
  return {
    usage: infiniteUsage<T>(),
    maxUsage: "∞"
  };
}

/**
 * Create usage bound from multiplicity
 */
export function createUsageBound<T>(multiplicity: Multiplicity): UsageBound<T> {
  return {
    usage: constantUsage<T>(multiplicity),
    maxUsage: multiplicity
  };
}

/**
 * Infer max bound from a function by creating a mock instance
 */
export function inferMaxBoundFromF<F, A, B>(
  f: (a: A) => Kind<F, B>,
  mockValue: A
): Multiplicity {
  try {
    // Create a mock result and try to extract usage bound
    const mockResult = f(mockValue);
    const bound = getUsageBoundFromValue(mockResult);
    return bound.usage(mockValue as any);
  } catch {
    // If we can't infer, default to infinite
    return "∞";
  }
}

// ============================================================================
// Enhanced Derivation Function
// ============================================================================

/**
 * Enhanced deriveInstances with automatic usage bound propagation
 */
export function deriveInstancesWithUsage<F, UB extends UsageBound<any>>(
  config: UsageBoundDerivationConfig<F, UB>
): UsageBoundDerivedInstances<F, UsageBound<any>> {
  const instances: UsageBoundDerivedInstances<F, UsageBound<any>> = {
    usageBound: config.usageBound || createUsageBound(getTypeUsageBound(config.typeKey || 'Unknown'))
  };
  
  if (config.typeKey) {
    instances.typeKey = config.typeKey;
  }
  
  // ============================================================================
  // Functor Derivation with Usage Bound Preservation
  // ============================================================================
  
  if (config.functor !== false) {
    instances.functor = {
      map: <A, B>(fa: Kind<F, A>, f: (a: A) => B): Kind<F, B> => {
        const result = config.map(fa, f);
        
        // Preserve usage bound from original structure
        const originalBound = getUsageBoundFromValue(fa);
        (result as any).usageBound = originalBound;
        
        return result;
      },
      usageBound: instances.usageBound
    };
  }
  
  // ============================================================================
  // Applicative Derivation with Usage Bound Multiplication
  // ============================================================================
  
  if (config.applicative !== false && config.of) {
    instances.applicative = {
      ...instances.functor!,
      of: config.of,
      ap: <A, B>(fab: Kind<F, (a: A) => B>, fa: Kind<F, A>): Kind<F, B> => {
        // Prefer provided ap if given; otherwise derive via chain + map if chain exists.
        let result: Kind<F, B>;
        if (config.ap) {
          result = config.ap(fab, fa);
        } else if (config.chain) {
          result = config.chain(fab, (f) => config.map(fa, (a) => f(a)));
        } else {
          throw new Error('Applicative.ap derivation requires either config.ap or config.chain');
        }
        
        // Multiply usage bounds: new bound = fab.bound * fa.bound
        const fabBound = getUsageBoundFromValue(fab);
        const faBound = getUsageBoundFromValue(fa);
        const multipliedBound = multiplyUsageBounds(fabBound, faBound);
        
        (result as any).usageBound = multipliedBound;
        
        return result;
      }
    };
  }
  
  // ============================================================================
  // Monad Derivation with Usage Bound Multiplication
  // ============================================================================
  
  if (config.monad !== false && config.chain) {
    instances.monad = {
      ...instances.applicative!,
      chain: <A, B>(fa: Kind<F, A>, f: (a: A) => Kind<F, B>): Kind<F, B> => {
        const result = config.chain!(fa, f);
        
        // Multiply usage bounds: new bound = fa.bound * declared f bound (upper bound)
        const faBound = getUsageBoundFromValue(fa);
        const fUsageBound = config.fUsageBound
          ? (config.fUsageBound as UsageBound<any>)
          : instances.usageBound; // fallback to per-type default upper bound
        const multipliedBound = multiplyUsageBounds(faBound, fUsageBound);
        
        (result as any).usageBound = multipliedBound;
        
        return result;
      }
    };
  }
  
  // ============================================================================
  // Traversable Derivation with Usage Bound Multiplication
  // ============================================================================
  
  if (config.traversable !== false && config.traverse) {
    instances.traversable = {
      ...instances.functor!,
      traverse: <G extends Applicative<any>, A, B>(
        fa: Kind<F, A>,
        f: (a: A) => Kind<G, B>
      ): Kind<G, Kind<F, B>> => {
        const result = config.traverse!(fa, f);
        
        // Multiply usage bounds: new bound = collection.bound * element.bound
        const collectionBound = getUsageBoundFromValue(fa);
        const elementBound = inferMaxBoundFromF(f, fa as any);
        const elementUsageBound = createUsageBound(elementBound);
        const multipliedBound = multiplyUsageBounds(collectionBound, elementUsageBound);
        
        (result as any).usageBound = multipliedBound;
        
        return result;
      }
    };
  }
  
  return instances;
}

// ============================================================================
// Convenience Functions for Common ADTs
// ============================================================================

/**
 * Derive instances for Maybe with usage bound = 1
 */
export function deriveMaybeInstances<F>() {
  return deriveInstancesWithUsage<F, UsageBound<any>>({
    map: (fa, f) => {
      // Simplified Maybe map implementation
      return fa as any;
    },
    of: (a) => a as any,
    chain: (fa, f) => {
      // Simplified Maybe chain implementation
      return fa as any;
    },
    usageBound: createUsageBound(1),
    typeKey: 'Maybe',
    functor: true,
    applicative: true,
    monad: true
  });
}

/**
 * Derive instances for Array with usage bound = "∞"
 */
export function deriveArrayInstances<F>() {
  return deriveInstancesWithUsage<F, UsageBound<any>>({
    map: (fa, f) => {
      // Simplified Array map implementation
      return fa as any;
    },
    of: (a) => [a] as any,
    chain: (fa, f) => {
      // Simplified Array chain implementation
      return fa as any;
    },
    traverse: (fa, f) => {
      // Simplified Array traverse implementation
      return fa as any;
    },
    usageBound: createUsageBound("∞"),
    typeKey: 'Array',
    functor: true,
    applicative: true,
    monad: true,
    traversable: true
  });
}

/**
 * Derive instances for Either with usage bound = 1
 */
export function deriveEitherInstances<F>() {
  return deriveInstancesWithUsage<F, UsageBound<any>>({
    map: (fa, f) => {
      // Simplified Either map implementation
      return fa as any;
    },
    of: (a) => a as any,
    chain: (fa, f) => {
      // Simplified Either chain implementation
      return fa as any;
    },
    usageBound: createUsageBound(1),
    typeKey: 'Either',
    functor: true,
    applicative: true,
    monad: true
  });
}

/**
 * Derive instances for ObservableLite with usage bound = "∞"
 */
export function deriveObservableLiteInstances<F>() {
  return deriveInstancesWithUsage<F, UsageBound<any>>({
    map: (fa, f) => {
      // Simplified ObservableLite map implementation
      return fa as any;
    },
    of: (a) => a as any,
    chain: (fa, f) => {
      // Simplified ObservableLite chain implementation
      return fa as any;
    },
    usageBound: createUsageBound("∞"),
    typeKey: 'ObservableLite',
    functor: true,
    applicative: true,
    monad: true
  });
}

// ============================================================================
// Type-Level Usage Bound Enforcement
// ============================================================================

/**
 * Type-level check if usage exceeds a bound
 */
export type TypeclassUsageExceeds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  Bound extends "∞" ? false :
  Usage extends "∞" ? true :
  Usage extends number ? 
    Bound extends number ? 
      Usage extends Bound ? false : true :
    never :
  never;

/**
 * Assert that typeclass usage is within bounds at compile time
 */
export type AssertTypeclassWithinBound<Usage extends Multiplicity, Bound extends Multiplicity> = 
  TypeclassUsageExceeds<Usage, Bound> extends true ? 
    never : // Compile error
    Usage;

/**
 * Type-level enforcement for typeclass composition
 */
export type SafeTypeclassComposition<
  F1 extends Functor<any>,
  F2 extends Functor<any>,
  MaxBound extends Multiplicity
> = AssertTypeclassWithinBound<
  MultiplyTypeclassUsage<ExtractTypeclassUsage<F1>, ExtractTypeclassUsage<F2>>,
  MaxBound
>;

// Helper types for type-level usage extraction
type ExtractTypeclassUsage<F extends Functor<any>> = 
  F['usageBound']['usage'];

type MultiplyTypeclassUsage<A, B> = 
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

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize default usage bounds when this module is imported
initializeDefaultUsageBounds(); 