/**
 * Enhanced Multiplicity Debug System
 * 
 * This module enhances the multiplicity system to make inferred usage bounds
 * visible in developer tooling and optionally at runtime.
 */

import { 
  Usage, 
  Multiplicity, 
  constantUsage, 
  onceUsage, 
  infiniteUsage 
} from './src/stream/multiplicity/types';

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
// Type-Level Exposure
// ============================================================================

/**
 * Extract usage bound type from a value
 */
export type UsageBoundOf<T> = T extends { usageBound: infer UB } ? UB : never;

/**
 * Branded usage bound interface
 */
export interface UsageBoundBrand<UB> {
  readonly __usageBound: UB;
}

/**
 * Type with usage bound branding
 */
export type WithUsageBound<T, UB> = T & UsageBoundBrand<UB>;

/**
 * Extract multiplicity from usage bound
 */
export type MultiplicityOf<T> = T extends { usage: (input: any) => infer M } ? M : never;

/**
 * Type-level usage bound constraints
 */
export type RequireBound1<T> = UsageBoundOf<T> extends { usage: (input: any) => 1 } ? T : never;
export type RequireBoundN<T, N extends number> = UsageBoundOf<T> extends { usage: (input: any) => N } ? T : never;
export type RequireFiniteBound<T> = UsageBoundOf<T> extends { usage: (input: any) => number } ? T : never;
export type RequireInfiniteBound<T> = UsageBoundOf<T> extends { usage: (input: any) => "∞" } ? T : never;

// ============================================================================
// Registry Debug API
// ============================================================================

/**
 * Registry for default usage bounds of built-in types
 */
const usageBoundRegistry = new Map<string, Multiplicity>();

/**
 * HKT key type for registry
 */
export type HKTKey = string;

/**
 * Get usage bound debug information
 */
export function getUsageBoundDebug(typeId: HKTKey): Multiplicity {
  return usageBoundRegistry.get(typeId) ?? "∞";
}

/**
 * Get all registered usage bounds for debugging
 */
export function getAllUsageBoundsDebug(): Record<string, Multiplicity> {
  const result: Record<string, Multiplicity> = {};
  for (const [key, value] of usageBoundRegistry.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * Register default usage bound for a type
 */
export function registerTypeUsageBound(typeId: HKTKey, bound: Multiplicity): void {
  usageBoundRegistry.set(typeId, bound);
}

/**
 * Get default usage bound for a type
 */
export function getTypeUsageBound(typeId: HKTKey): Multiplicity {
  return usageBoundRegistry.get(typeId) || "∞";
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
// Runtime Debug Configuration
// ============================================================================

/**
 * Debug configuration for multiplicity system
 */
export const multiplicityDebug = {
  enabled: false,
  logLevel: 'info' as 'debug' | 'info' | 'warn' | 'error',
  includeStackTraces: false,
  logToConsole: true,
  logToFile: false,
  logFilePath: './multiplicity-debug.log'
};

/**
 * Debug logger for multiplicity system
 */
class MultiplicityLogger {
  private logBuffer: string[] = [];
  
  log(level: string, message: string, data?: any): void {
    if (!multiplicityDebug.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[Multiplicity] [${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (multiplicityDebug.logToConsole) {
      console.log(logMessage, data || '');
    }
    
    if (multiplicityDebug.logToFile) {
      this.logBuffer.push(logMessage + (data ? ` ${JSON.stringify(data)}` : ''));
    }
  }
  
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
  
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }
  
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }
  
  flushToFile(): void {
    if (multiplicityDebug.logToFile && this.logBuffer.length > 0) {
      // In a real implementation, this would write to file
      console.log('Flushing multiplicity debug logs to file...');
      this.logBuffer = [];
    }
  }
}

export const multiplicityLogger = new MultiplicityLogger();

// ============================================================================
// Enhanced Usage Bound Creation with Debugging
// ============================================================================

/**
 * Create usage bound with debug information
 */
export function createUsageBoundWithDebug<T>(
  multiplicity: Multiplicity,
  source: string = 'unknown'
): WithUsageBound<UsageBound<T>, Multiplicity> {
  const usageBound: UsageBound<T> = {
    usage: constantUsage<T>(multiplicity),
    maxUsage: multiplicity
  };
  
  multiplicityLogger.debug(`Created usage bound: ${multiplicity} from ${source}`);
  
  return {
    ...usageBound,
    __usageBound: multiplicity
  };
}

/**
 * Get usage bound debug information from a value
 */
export function getUsageBoundDebugFromValue<T>(value: T): {
  bound: Multiplicity;
  source: string;
  hasUsageBound: boolean;
} {
  if (value && typeof value === 'object' && 'usageBound' in value) {
    const usageBound = (value as any).usageBound;
    const bound = usageBound.usage ? usageBound.usage(value) : "∞";
    multiplicityLogger.debug(`Extracted usage bound: ${bound} from value`, { value });
    return {
      bound,
      source: 'value',
      hasUsageBound: true
    };
  }
  
  multiplicityLogger.debug('No usage bound found on value, defaulting to ∞');
  return {
    bound: "∞",
    source: 'default',
    hasUsageBound: false
  };
}

// ============================================================================
// Enhanced Typeclass Derivation with Debugging
// ============================================================================

/**
 * Enhanced derivation configuration with debug options
 */
export interface DebugDerivationConfig<F, UB extends UsageBound<any>> {
  // Core typeclass implementations
  map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>;
  of?: <A>(a: A) => Kind<F, A>;
  chain?: <A, B>(fa: Kind<F, A>, f: (a: A) => Kind<F, B>) => Kind<F, B>;
  traverse?: <G extends Applicative<any>, A, B>(
    fa: Kind<F, A>,
    f: (a: A) => Kind<G, B>
  ) => Kind<G, Kind<F, B>>;
  
  // Usage bound configuration
  usageBound?: UB;
  typeKey?: string;
  
  // Typeclass flags
  functor?: boolean;
  applicative?: boolean;
  monad?: boolean;
  traversable?: boolean;
  
  // Debug configuration
  debugName?: string;
  enableLogging?: boolean;
}

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
 * Enhanced derived instances with usage bounds and debug info
 */
export interface DebugDerivedInstances<F, UB extends UsageBound<any>> {
  functor?: Functor<F>;
  applicative?: Applicative<F>;
  monad?: Monad<F>;
  traversable?: Traversable<F>;
  usageBound: UB;
  typeKey?: string;
  debugName?: string;
}

/**
 * Enhanced deriveInstances with debug logging
 */
export function deriveInstancesWithDebug<F, UB extends UsageBound<any>>(
  config: DebugDerivationConfig<F, UB>
): DebugDerivedInstances<F, UsageBound<any>> {
  const debugName = config.debugName || config.typeKey || 'Unknown';
  const enableLogging = config.enableLogging ?? multiplicityDebug.enabled;
  
  if (enableLogging) {
    multiplicityLogger.info(`Deriving instances for ${debugName}`);
  }
  
  const instances: DebugDerivedInstances<F, UsageBound<any>> = {
    usageBound: config.usageBound || createUsageBoundWithDebug(getTypeUsageBound(config.typeKey || 'Unknown'), 'registry'),
    debugName
  };
  
  if (config.typeKey) {
    instances.typeKey = config.typeKey;
  }
  
  // ============================================================================
  // Functor Derivation with Debug Logging
  // ============================================================================
  
  if (config.functor !== false) {
    instances.functor = {
      map: <A, B>(fa: Kind<F, A>, f: (a: A) => B): Kind<F, B> => {
        const beforeBound = getUsageBoundDebugFromValue(fa);
        
        const result = config.map(fa, f);
        
        // Preserve usage bound from original structure
        const originalBound = getUsageBoundDebugFromValue(fa);
        (result as any).usageBound = (fa as any).usageBound;
        
        const afterBound = getUsageBoundDebugFromValue(result);
        
        if (enableLogging) {
          multiplicityLogger.info(
            `Functor.map on ${debugName} — bound preserved: ${beforeBound.bound} → ${afterBound.bound}`,
            { before: beforeBound, after: afterBound }
          );
        }
        
        return result;
      },
      usageBound: instances.usageBound
    };
  }
  
  // ============================================================================
  // Applicative Derivation with Debug Logging
  // ============================================================================
  
  if (config.applicative !== false && config.of) {
    instances.applicative = {
      ...instances.functor!,
      of: config.of,
      ap: <A, B>(fab: Kind<F, (a: A) => B>, fa: Kind<F, A>): Kind<F, B> => {
        const fabBound = getUsageBoundDebugFromValue(fab);
        const faBound = getUsageBoundDebugFromValue(fa);
        
        const result = config.map(fab, (f) => f(fa as any)) as Kind<F, B>;
        
        // Multiply usage bounds: new bound = fab.bound * fa.bound
        const multipliedBound = multiplyUsageBounds(
          { usage: constantUsage(fabBound.bound), maxUsage: fabBound.bound },
          { usage: constantUsage(faBound.bound), maxUsage: faBound.bound }
        );
        
        (result as any).usageBound = multipliedBound;
        
        const afterBound = getUsageBoundDebugFromValue(result);
        
        if (enableLogging) {
          multiplicityLogger.info(
            `Applicative.ap on ${debugName} — bound multiplied: ${fabBound.bound} * ${faBound.bound} = ${afterBound.bound}`,
            { fab: fabBound, fa: faBound, result: afterBound }
          );
        }
        
        return result;
      }
    };
  }
  
  // ============================================================================
  // Monad Derivation with Debug Logging
  // ============================================================================
  
  if (config.monad !== false && config.chain) {
    instances.monad = {
      ...instances.applicative!,
      chain: <A, B>(fa: Kind<F, A>, f: (a: A) => Kind<F, B>): Kind<F, B> => {
        const faBound = getUsageBoundDebugFromValue(fa);
        
        const result = config.chain!(fa, f);
        
        // Try to infer bound from function result
        let fBound: Multiplicity = "∞";
        try {
          const mockResult = f(fa as any);
          fBound = getUsageBoundDebugFromValue(mockResult).bound;
        } catch {
          multiplicityLogger.debug('Could not infer function bound, defaulting to ∞');
        }
        
        // Multiply usage bounds: new bound = fa.bound * f.bound
        const multipliedBound = multiplyUsageBounds(
          { usage: constantUsage(faBound.bound), maxUsage: faBound.bound },
          { usage: constantUsage(fBound), maxUsage: fBound }
        );
        
        (result as any).usageBound = multipliedBound;
        
        const afterBound = getUsageBoundDebugFromValue(result);
        
        if (enableLogging) {
          multiplicityLogger.info(
            `Monad.chain on ${debugName} — bound multiplied: ${faBound.bound} * ${fBound} = ${afterBound.bound}`,
            { fa: faBound, f: fBound, result: afterBound }
          );
        }
        
        return result;
      }
    };
  }
  
  // ============================================================================
  // Traversable Derivation with Debug Logging
  // ============================================================================
  
  if (config.traversable !== false && config.traverse) {
    instances.traversable = {
      ...instances.functor!,
      traverse: <G extends Applicative<any>, A, B>(
        fa: Kind<F, A>,
        f: (a: A) => Kind<G, B>
      ): Kind<G, Kind<F, B>> => {
        const collectionBound = getUsageBoundDebugFromValue(fa);
        
        const result = config.traverse!(fa, f);
        
        // Try to infer bound from function result
        let elementBound: Multiplicity = "∞";
        try {
          const mockResult = f(fa as any);
          elementBound = getUsageBoundDebugFromValue(mockResult).bound;
        } catch {
          multiplicityLogger.debug('Could not infer element bound, defaulting to ∞');
        }
        
        // Multiply usage bounds: new bound = collection.bound * element.bound
        const multipliedBound = multiplyUsageBounds(
          { usage: constantUsage(collectionBound.bound), maxUsage: collectionBound.bound },
          { usage: constantUsage(elementBound), maxUsage: elementBound }
        );
        
        (result as any).usageBound = multipliedBound;
        
        const afterBound = getUsageBoundDebugFromValue(result);
        
        if (enableLogging) {
          multiplicityLogger.info(
            `Traversable.traverse on ${debugName} — bound multiplied: ${collectionBound.bound} * ${elementBound} = ${afterBound.bound}`,
            { collection: collectionBound, element: elementBound, result: afterBound }
          );
        }
        
        return result;
      }
    };
  }
  
  if (enableLogging) {
    multiplicityLogger.info(`Completed deriving instances for ${debugName}`);
  }
  
  return instances;
}

// ============================================================================
// Developer-Facing IntelliSense Helpers
// ============================================================================

/**
 * Generate JSDoc comment for usage bound
 */
export function generateUsageBoundJSDoc(typeKey: string): string {
  const bound = getUsageBoundDebug(typeKey);
  const description = bound === 1 ? 'at most once per element' :
                    bound === "∞" ? 'unbounded collection' :
                    `at most ${bound} times per element`;
  
  return `/** Usage bound: ${bound} (${description}) */`;
}

/**
 * Create branded instance with JSDoc
 */
export function createBrandedInstance<T, UB extends Multiplicity>(
  instance: T,
  usageBound: UB,
  typeKey: string
): WithUsageBound<T, UB> {
  const branded = {
    ...instance,
    __usageBound: usageBound
  };
  
  // Add JSDoc comment for IntelliSense
  Object.defineProperty(branded, '__usageBound', {
    value: usageBound,
    writable: false,
    enumerable: false,
    configurable: false
  });
  
  return branded as WithUsageBound<T, UB>;
}

// ============================================================================
// Convenience Functions with Debug Support
// ============================================================================

/**
 * Derive Maybe instances with debug support
 */
export function deriveMaybeInstancesWithDebug<F>(enableLogging: boolean = false) {
  return deriveInstancesWithDebug<F, UsageBound<any>>({
    map: (fa, f) => fa as any,
    of: (a) => a as any,
    chain: (fa, f) => fa as any,
    usageBound: createUsageBoundWithDebug(1, 'Maybe'),
    typeKey: 'Maybe',
    debugName: 'Maybe',
    enableLogging,
    functor: true,
    applicative: true,
    monad: true
  });
}

/**
 * Derive Array instances with debug support
 */
export function deriveArrayInstancesWithDebug<F>(enableLogging: boolean = false) {
  return deriveInstancesWithDebug<F, UsageBound<any>>({
    map: (fa, f) => fa as any,
    of: (a) => [a] as any,
    chain: (fa, f) => fa as any,
    traverse: (fa, f) => fa as any,
    usageBound: createUsageBoundWithDebug("∞", 'Array'),
    typeKey: 'Array',
    debugName: 'Array',
    enableLogging,
    functor: true,
    applicative: true,
    monad: true,
    traversable: true
  });
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize default usage bounds when this module is imported
initializeDefaultUsageBounds(); 