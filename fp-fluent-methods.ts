/**
 * Fluent Methods for ADTs
 * 
 * This module provides optional, chainable FP-style method syntax directly to ADT instances
 * (e.g., Maybe, Either, Result, ObservableLite) so developers don't have to use .pipe() or standalone helpers.
 * 
 * Features:
 * - Opt-in fluent method syntax for ADTs
 * - Centralized typeclass registry lookup
 * - HKT and purity compatibility preservation
 * - Immutable operations (each call returns new instance)
 * - Type-safe method chaining
 * - Integration with existing typeclass system
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe, Either, List, Reader, Writer, State
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

import {
  // Unified ADT imports
  MaybeUnified, Maybe, MaybeK, Just, Nothing, matchMaybe,
  EitherUnified, Either, EitherK, Left, Right, matchEither,
  ResultUnified, Result, ResultK, Ok, Err, matchResult
} from './fp-maybe-unified';

import {
  // ObservableLite imports
  ObservableLite, ObservableLiteK,
  ObservableLiteFunctor, ObservableLiteApplicative, ObservableLiteMonad
} from './fp-observable-lite';

import {
  // ADT Registry imports
  ADTRegistry, getADT, getADTTypeclassInstances
} from './fp-adt-registry';

// ============================================================================
// Part 1: Type Definitions
// ============================================================================

/**
 * Typeclass instance types for fluent methods
 */
export interface TypeclassInstances {
  readonly Functor?: Functor<any>;
  readonly Applicative?: Applicative<any>;
  readonly Monad?: Monad<any>;
  readonly Bifunctor?: Bifunctor<any>;
  readonly Profunctor?: Profunctor<any>;
  readonly Traversable?: Traversable<any>;
  readonly Foldable?: Foldable<any>;
}

/**
 * Fluent method options for ADT decoration
 */
export interface FluentMethodOptions {
  readonly enableMap?: boolean;
  readonly enableChain?: boolean;
  readonly enableFilter?: boolean;
  readonly enableBimap?: boolean;
  readonly enableAp?: boolean;
  readonly enableOf?: boolean;
  readonly preservePurity?: boolean;
  readonly enableTypeInference?: boolean;
}

/**
 * Fluent method decorator result
 */
export interface FluentMethodDecorator<T> {
  readonly constructor: T;
  readonly instances: TypeclassInstances;
  readonly options: FluentMethodOptions;
  readonly isDecorated: boolean;
}

// ============================================================================
// Part 2: Typeclass Registry Lookup
// ============================================================================

/**
 * Global typeclass instance registry for fluent methods
 */
const FLUENT_METHOD_REGISTRY = new Map<string, TypeclassInstances>();

/**
 * Register typeclass instances for an ADT
 * @param adtName - Name of the ADT
 * @param instances - Typeclass instances to register
 */
export function registerFluentMethodInstances(
  adtName: string,
  instances: TypeclassInstances
): void {
  FLUENT_METHOD_REGISTRY.set(adtName, instances);
}

/**
 * Get typeclass instances for an ADT
 * @param adtName - Name of the ADT
 * @returns Typeclass instances or undefined if not found
 */
export function getFluentMethodInstances(adtName: string): TypeclassInstances | undefined {
  return FLUENT_METHOD_REGISTRY.get(adtName);
}

/**
 * Get typeclass instances from ADT registry
 * @param adtName - Name of the ADT in the registry
 * @returns Typeclass instances or undefined if not found
 */
export function getADTTypeclassInstancesForFluent(adtName: string): TypeclassInstances | undefined {
  try {
    const adt = getADT(adtName as any);
    return adt?.typeclassInstances;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Part 3: Fluent Method Decorator
// ============================================================================

/**
 * Add fluent methods to an ADT constructor
 * @param Ctor - ADT constructor to decorate
 * @param adtName - Name of the ADT for registry lookup
 * @param options - Fluent method options
 * @returns Decorated constructor with fluent methods
 */
export function withFluentMethods<T extends new (...args: any[]) => any>(
  Ctor: T,
  adtName: string,
  options: FluentMethodOptions = {}
): T & { __fluentMethods: true } {
  const {
    enableMap = true,
    enableChain = true,
    enableFilter = true,
    enableBimap = true,
    enableAp = true,
    enableOf = true,
    preservePurity = true,
    enableTypeInference = true
  } = options;

  // Get typeclass instances from registry
  const instances = getFluentMethodInstances(adtName) || 
                   getADTTypeclassInstancesForFluent(adtName);

  if (!instances) {
    console.warn(`No typeclass instances found for ADT: ${adtName}`);
    return Ctor as T & { __fluentMethods: true };
  }

  // Add .map method if Functor instance exists
  if (enableMap && instances.Functor) {
    Ctor.prototype.map = function<A, B>(this: any, fn: (a: A) => B): any {
      return instances.Functor!.map(this, fn);
    };
  }

  // Add .chain method if Monad instance exists
  if (enableChain && instances.Monad) {
    Ctor.prototype.chain = function<A, B>(this: any, fn: (a: A) => any): any {
      return instances.Monad!.chain(this, fn);
    };
  }

  // Add .filter method (implemented via chain)
  if (enableFilter && instances.Monad) {
    Ctor.prototype.filter = function<A>(this: any, predicate: (a: A) => boolean): any {
      return instances.Monad!.chain(this, (value: A) => 
        predicate(value) ? this.constructor.of(value) : this.constructor.of(null)
      );
    };
  }

  // Add .bimap method if Bifunctor instance exists
  if (enableBimap && instances.Bifunctor) {
    Ctor.prototype.bimap = function<A, B, C, D>(
      this: any,
      f: (a: A) => C,
      g: (b: B) => D
    ): any {
      return instances.Bifunctor!.bimap(this, f, g);
    };
  }

  // Add .ap method if Applicative instance exists
  if (enableAp && instances.Applicative) {
    Ctor.prototype.ap = function<A, B>(this: any, fab: any): any {
      return instances.Applicative!.ap(fab, this);
    };
  }

  // Add .of method if Applicative instance exists
  if (enableOf && instances.Applicative) {
    Ctor.prototype.of = function<A>(this: any, value: A): any {
      return instances.Applicative!.of(value);
    };
  }

  // Mark as decorated
  (Ctor as any).__fluentMethods = true;

  return Ctor as T & { __fluentMethods: true };
}

/**
 * Check if a constructor has fluent methods
 * @param Ctor - Constructor to check
 * @returns True if the constructor has fluent methods
 */
export function hasFluentMethods(Ctor: any): boolean {
  return Ctor.__fluentMethods === true;
}

/**
 * Remove fluent methods from an ADT constructor
 * @param Ctor - ADT constructor to undecorate
 * @returns Constructor without fluent methods
 */
export function withoutFluentMethods<T extends new (...args: any[]) => any>(Ctor: T): T {
  if (hasFluentMethods(Ctor)) {
    delete Ctor.prototype.map;
    delete Ctor.prototype.chain;
    delete Ctor.prototype.filter;
    delete Ctor.prototype.bimap;
    delete Ctor.prototype.ap;
    delete Ctor.prototype.of;
    delete (Ctor as any).__fluentMethods;
  }
  return Ctor;
}

// ============================================================================
// Part 4: ADT-Specific Fluent Method Decorators
// ============================================================================

/**
 * Add fluent methods to Maybe ADT
 * @param options - Fluent method options
 * @returns Maybe constructor with fluent methods
 */
export function withMaybeFluentMethods(options: FluentMethodOptions = {}): typeof MaybeUnified.constructors {
  // Register Maybe typeclass instances
  registerFluentMethodInstances('Maybe', {
    Functor: MaybeUnified.HKT ? MaybeUnified.Functor : undefined,
    Applicative: MaybeUnified.HKT ? MaybeUnified.Applicative : undefined,
    Monad: MaybeUnified.HKT ? MaybeUnified.Monad : undefined,
    Traversable: MaybeUnified.HKT ? MaybeUnified.Traversable : undefined,
    Foldable: MaybeUnified.HKT ? MaybeUnified.Foldable : undefined
  });

  // Decorate constructors
  const decoratedJust = withFluentMethods(Just, 'Maybe', options);
  const decoratedNothing = withFluentMethods(Nothing, 'Maybe', options);

  return {
    Just: decoratedJust,
    Nothing: decoratedNothing
  };
}

/**
 * Add fluent methods to Either ADT
 * @param options - Fluent method options
 * @returns Either constructor with fluent methods
 */
export function withEitherFluentMethods(options: FluentMethodOptions = {}): typeof EitherUnified.constructors {
  // Register Either typeclass instances
  registerFluentMethodInstances('Either', {
    Functor: EitherUnified.HKT ? EitherUnified.Functor : undefined,
    Applicative: EitherUnified.HKT ? EitherUnified.Applicative : undefined,
    Monad: EitherUnified.HKT ? EitherUnified.Monad : undefined,
    Bifunctor: EitherUnified.HKT ? EitherUnified.Bifunctor : undefined,
    Traversable: EitherUnified.HKT ? EitherUnified.Traversable : undefined,
    Foldable: EitherUnified.HKT ? EitherUnified.Foldable : undefined
  });

  // Decorate constructors
  const decoratedLeft = withFluentMethods(Left, 'Either', options);
  const decoratedRight = withFluentMethods(Right, 'Either', options);

  return {
    Left: decoratedLeft,
    Right: decoratedRight
  };
}

/**
 * Add fluent methods to Result ADT
 * @param options - Fluent method options
 * @returns Result constructor with fluent methods
 */
export function withResultFluentMethods(options: FluentMethodOptions = {}): typeof ResultUnified.constructors {
  // Register Result typeclass instances
  registerFluentMethodInstances('Result', {
    Functor: ResultUnified.HKT ? ResultUnified.Functor : undefined,
    Applicative: ResultUnified.HKT ? ResultUnified.Applicative : undefined,
    Monad: ResultUnified.HKT ? ResultUnified.Monad : undefined,
    Bifunctor: ResultUnified.HKT ? ResultUnified.Bifunctor : undefined,
    Traversable: ResultUnified.HKT ? ResultUnified.Traversable : undefined,
    Foldable: ResultUnified.HKT ? ResultUnified.Foldable : undefined
  });

  // Decorate constructors
  const decoratedOk = withFluentMethods(Ok, 'Result', options);
  const decoratedErr = withFluentMethods(Err, 'Result', options);

  return {
    Ok: decoratedOk,
    Err: decoratedErr
  };
}

/**
 * Add fluent methods to ObservableLite ADT
 * @param options - Fluent method options
 * @returns ObservableLite constructor with fluent methods
 */
export function withObservableLiteFluentMethods(options: FluentMethodOptions = {}): typeof ObservableLite {
  // Register ObservableLite typeclass instances
  registerFluentMethodInstances('ObservableLite', {
    Functor: ObservableLiteFunctor,
    Applicative: ObservableLiteApplicative,
    Monad: ObservableLiteMonad
  });

  // Decorate constructor
  return withFluentMethods(ObservableLite, 'ObservableLite', options);
}

// ============================================================================
// Part 5: Global Fluent Methods Configuration
// ============================================================================

/**
 * Global fluent methods configuration
 */
export interface GlobalFluentMethodsConfig {
  readonly enabled: boolean;
  readonly defaultOptions: FluentMethodOptions;
  readonly adtRegistry: Map<string, TypeclassInstances>;
  readonly decoratedADTs: Set<string>;
}

/**
 * Global fluent methods state
 */
const GLOBAL_FLUENT_CONFIG: GlobalFluentMethodsConfig = {
  enabled: false,
  defaultOptions: {
    enableMap: true,
    enableChain: true,
    enableFilter: true,
    enableBimap: true,
    enableAp: true,
    enableOf: true,
    preservePurity: true,
    enableTypeInference: true
  },
  adtRegistry: new Map(),
  decoratedADTs: new Set()
};

/**
 * Enable global fluent methods for all ADTs
 * @param options - Global fluent method options
 */
export function enableGlobalFluentMethods(options: FluentMethodOptions = {}): void {
  GLOBAL_FLUENT_CONFIG.enabled = true;
  GLOBAL_FLUENT_CONFIG.defaultOptions = { ...GLOBAL_FLUENT_CONFIG.defaultOptions, ...options };

  // Register all ADT typeclass instances
  const adtNames = Object.keys(ADTRegistry);
  
  for (const adtName of adtNames) {
    try {
      const adt = getADT(adtName as any);
      if (adt?.typeclassInstances) {
        GLOBAL_FLUENT_CONFIG.adtRegistry.set(adtName, adt.typeclassInstances);
        registerFluentMethodInstances(adtName, adt.typeclassInstances);
      }
    } catch (error) {
      console.warn(`Failed to register fluent methods for ADT: ${adtName}`, error);
    }
  }

  // Register ObservableLite instances
  registerFluentMethodInstances('ObservableLite', {
    Functor: ObservableLiteFunctor,
    Applicative: ObservableLiteApplicative,
    Monad: ObservableLiteMonad
  });

  console.log('Global fluent methods enabled for all ADTs');
}

/**
 * Disable global fluent methods
 */
export function disableGlobalFluentMethods(): void {
  GLOBAL_FLUENT_CONFIG.enabled = false;
  GLOBAL_FLUENT_CONFIG.adtRegistry.clear();
  GLOBAL_FLUENT_CONFIG.decoratedADTs.clear();
  FLUENT_METHOD_REGISTRY.clear();
  console.log('Global fluent methods disabled');
}

/**
 * Check if global fluent methods are enabled
 * @returns True if global fluent methods are enabled
 */
export function isGlobalFluentMethodsEnabled(): boolean {
  return GLOBAL_FLUENT_CONFIG.enabled;
}

/**
 * Get global fluent methods configuration
 * @returns Global fluent methods configuration
 */
export function getGlobalFluentMethodsConfig(): GlobalFluentMethodsConfig {
  return { ...GLOBAL_FLUENT_CONFIG };
}

// ============================================================================
// Part 6: Utility Functions
// ============================================================================

/**
 * Create a fluent method decorator for a custom ADT
 * @param adtName - Name of the ADT
 * @param instances - Typeclass instances
 * @param options - Fluent method options
 * @returns Fluent method decorator function
 */
export function createFluentMethodDecorator(
  adtName: string,
  instances: TypeclassInstances,
  options: FluentMethodOptions = {}
) {
  return function<T extends new (...args: any[]) => any>(Ctor: T): T & { __fluentMethods: true } {
    registerFluentMethodInstances(adtName, instances);
    return withFluentMethods(Ctor, adtName, options);
  };
}

/**
 * Check if an instance has fluent methods
 * @param instance - Instance to check
 * @returns True if the instance has fluent methods
 */
export function hasInstanceFluentMethods(instance: any): boolean {
  return instance && typeof instance.map === 'function';
}

/**
 * Get available fluent methods for an instance
 * @param instance - Instance to check
 * @returns Array of available fluent method names
 */
export function getAvailableFluentMethods(instance: any): string[] {
  if (!instance) return [];
  
  const methods: string[] = [];
  if (typeof instance.map === 'function') methods.push('map');
  if (typeof instance.chain === 'function') methods.push('chain');
  if (typeof instance.filter === 'function') methods.push('filter');
  if (typeof instance.bimap === 'function') methods.push('bimap');
  if (typeof instance.ap === 'function') methods.push('ap');
  if (typeof instance.of === 'function') methods.push('of');
  
  return methods;
}

/**
 * Validate fluent method chaining
 * @param chain - Array of method calls to validate
 * @returns True if the chain is valid
 */
export function validateFluentMethodChain(chain: Array<{ method: string; args: any[] }>): boolean {
  // Basic validation - could be extended with more sophisticated rules
  for (const call of chain) {
    if (!call.method || !Array.isArray(call.args)) {
      return false;
    }
  }
  return true;
}

// ============================================================================
// Part 7: Type-Safe Fluent Method Types
// ============================================================================

/**
 * Type for fluent method chain result
 */
export type FluentMethodResult<F, Method extends string, Args extends any[]> = 
  Method extends 'map' ? F extends { map: (fn: infer MapFn) => infer Result } ? Result : never :
  Method extends 'chain' ? F extends { chain: (fn: infer ChainFn) => infer Result } ? Result : never :
  Method extends 'filter' ? F extends { filter: (pred: infer PredFn) => infer Result } ? Result : never :
  Method extends 'bimap' ? F extends { bimap: (f: infer Fn1, g: infer Fn2) => infer Result } ? Result : never :
  Method extends 'ap' ? F extends { ap: (fab: infer Fab) => infer Result } ? Result : never :
  never;

/**
 * Type for fluent method chain
 */
export type FluentMethodChain<F, Chain extends Array<{ method: string; args: any[] }>> = 
  Chain extends [infer First, ...infer Rest]
    ? First extends { method: infer Method; args: infer Args }
      ? Rest extends Array<{ method: string; args: any[] }>
        ? FluentMethodChain<FluentMethodResult<F, Method & string, Args & any[]>, Rest>
        : FluentMethodResult<F, Method & string, Args & any[]>
      : F
    : F;

// ============================================================================
// Part 8: Export All
// ============================================================================

export {
  // Core types
  TypeclassInstances,
  FluentMethodOptions,
  FluentMethodDecorator,
  GlobalFluentMethodsConfig,
  
  // Registry functions
  registerFluentMethodInstances,
  getFluentMethodInstances,
  getADTTypeclassInstancesForFluent,
  
  // Decorator functions
  withFluentMethods,
  hasFluentMethods,
  withoutFluentMethods,
  
  // ADT-specific decorators
  withMaybeFluentMethods,
  withEitherFluentMethods,
  withResultFluentMethods,
  withObservableLiteFluentMethods,
  
  // Global configuration
  enableGlobalFluentMethods,
  disableGlobalFluentMethods,
  isGlobalFluentMethodsEnabled,
  getGlobalFluentMethodsConfig,
  
  // Utility functions
  createFluentMethodDecorator,
  hasInstanceFluentMethods,
  getAvailableFluentMethods,
  validateFluentMethodChain,
  
  // Type helpers
  FluentMethodResult,
  FluentMethodChain
}; 