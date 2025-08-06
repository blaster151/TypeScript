/**
 * Immutable-Aware Derivable Instances with Dual API Support
 * 
 * This module provides automatic typeclass instance derivation for persistent collections
 * based on their API contracts and branding, eliminating the need for manual instance definitions.
 * 
 * Features:
 * - Automatic detection of persistent collection types
 * - Typeclass instance synthesis based on API contracts
 * - Type-level inference for type constructor arity
 * - Runtime registry for derived instances
 * - Readonly-safe and immutable-branded instances
 * - Integration with GADT pattern matchers
 * - Dual API generation (fluent methods + data-last functions)
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  PersistentList, PersistentMap, PersistentSet,
  PersistentListK, PersistentMapK, PersistentSetK
} from './fp-persistent';

import {
  GADT, GADTTags, GADTPayload,
  pmatch, PatternMatcherBuilder,
  derivePatternMatcher, createPmatchBuilder,
  Expr, ExprK, evaluate, transformString, ExprFunctor,
  MaybeGADT, MaybeGADTK, MaybeGADTFunctor, MaybeGADTApplicative, MaybeGADTMonad,
  EitherGADT, EitherGADTK, EitherGADTBifunctor,
  Result, ResultK, ResultFunctor, deriveResultMonad
} from './fp-gadt-enhanced';

import {
  Immutable, immutableArray
} from './fp-immutable';

// ============================================================================
// Dual API Support
// ============================================================================

/**
 * Typeclass operation names for automatic dual API generation
 */
export const TYPECLASS_OPERATIONS = {
  // Functor operations
  Functor: ['map'] as const,
  
  // Applicative operations (extends Functor)
  Applicative: ['of', 'ap'] as const,
  
  // Monad operations (extends Applicative)
  Monad: ['chain'] as const,
  
  // Bifunctor operations
  Bifunctor: ['bimap', 'mapLeft'] as const,
  
  // Profunctor operations
  Profunctor: ['dimap', 'lmap', 'rmap'] as const,
  
  // Additional operations from ObservableLite
  ObservableLite: ['filter', 'scan', 'take', 'skip', 'startWith', 'concat', 'merge'] as const,
  
  // Optics operations
  Optics: ['over', 'preview', 'mapWithOptic'] as const,
  
  // ADT operations
  ADT: ['match', 'mapMatch', 'bichain', 'matchTag', 'filterTag', 'extractValues', 'extractErrors'] as const
} as const;

/**
 * Configuration for dual API generation
 */
export interface DualAPIConfig<F extends Kind<any[]>> {
  /** The typeclass instance */
  instance: any;
  /** The type constructor name */
  name: string;
  /** Operations to generate dual APIs for */
  operations: readonly string[];
  /** Custom operation implementations */
  customOperations?: Record<string, (instance: any) => any>;
}

/**
 * Dual API result containing both instance and standalone functions
 */
export interface DualAPI<F extends Kind<any[]>> {
  /** The original typeclass instance */
  instance: any;
  /** Data-last standalone functions */
  [key: string]: any;
  /** Helper to add fluent methods to a prototype */
  addFluentMethods: (prototype: any) => void;
}

/**
 * Generates both fluent instance methods and data-last standalone functions
 */
export function createDualAPI<F extends Kind<any[]>>(config: DualAPIConfig<F>): DualAPI<F> {
  const { instance, name, operations, customOperations = {} } = config;
  
  const standaloneFunctions: Record<string, any> = {};
  
  // Generate data-last standalone functions
  operations.forEach(op => {
    if (customOperations[op]) {
      standaloneFunctions[op] = customOperations[op](instance);
    } else {
      // Generate standard curried function
      standaloneFunctions[op] = (...args: any[]) => {
        return (fa: any) => {
          if (typeof instance[op] === 'function') {
            return instance[op](fa, ...args);
          }
          throw new Error(`Operation ${op} not found on ${name} instance`);
        };
      };
    }
  });
  
  const addFluentMethods = (prototype: any) => {
    operations.forEach(op => {
      if (prototype[op]) {
        // Method already exists, skip
        return;
      }
      
      if (customOperations[op]) {
        // Use custom implementation
        prototype[op] = customOperations[op](instance);
      } else {
        // Generate standard fluent method
        prototype[op] = function(...args: any[]) {
          if (typeof instance[op] === 'function') {
            return instance[op](this, ...args);
          }
          throw new Error(`Operation ${op} not found on ${name} instance`);
        };
      }
    });
  };
  
  return {
    instance,
    ...standaloneFunctions,
    addFluentMethods
  };
}

// ============================================================================
// Part 1: Type-Level Detection and Branding
// ============================================================================

/**
 * Branding symbol for persistent collections
 */
export const PERSISTENT_BRAND = Symbol('persistent');

/**
 * Branding symbol for immutable collections
 */
export const IMMUTABLE_BRAND = Symbol('immutable');

/**
 * Type-level detection for persistent collections
 */
export type IsPersistentList<F> = F extends PersistentList<infer _> ? true : false;

export type IsPersistentMap<F> = F extends PersistentMap<infer _, infer _> ? true : false;

export type IsPersistentSet<F> = F extends PersistentSet<infer _> ? true : false;

export type IsPersistentCollection<F> = 
  | IsPersistentList<F>
  | IsPersistentMap<F>
  | IsPersistentSet<F>;

/**
 * Extract element type from persistent collection
 */
export type PersistentElementType<F> = 
  F extends PersistentList<infer A> ? A :
  F extends PersistentMap<infer _, infer V> ? V :
  F extends PersistentSet<infer A> ? A :
  never;

/**
 * Extract key type from persistent collection
 */
export type PersistentKeyType<F> = 
  F extends PersistentMap<infer K, infer _> ? K :
  never;

/**
 * Type-level detection for immutable collections
 */
export type IsImmutableArray<F> = F extends readonly (infer A)[] ? true : false;

export type IsImmutableCollection<F> = 
  | IsPersistentCollection<F>
  | IsImmutableArray<F>;

/**
 * Type-level detection for GADT types
 */
export type IsGADT<F> = F extends GADT<string, any> ? true : false;

/**
 * Type-level detection for type constructors
 */
export type IsTypeConstructor<F> = 
  F extends Kind1 ? true :
  F extends Kind2 ? true :
  F extends Kind3 ? true :
  false;

/**
 * Extract type constructor arity
 */
export type TypeConstructorArity<F> = 
  F extends Kind1 ? 1 :
  F extends Kind2 ? 2 :
  F extends Kind3 ? 3 :
  never;

// ============================================================================
// Part 2: API Contract Detection
// ============================================================================

/**
 * API contract for Functor
 */
export interface FunctorAPI<T> {
  map<U>(fn: (value: T) => U): any;
}

/**
 * API contract for Applicative
 */
export interface ApplicativeAPI<T> extends FunctorAPI<T> {
  of<U>(value: U): any;
  ap<U>(fn: any): any;
}

/**
 * API contract for Monad
 */
export interface MonadAPI<T> extends ApplicativeAPI<T> {
  chain<U>(fn: (value: T) => any): any;
}

/**
 * API contract for Foldable
 */
export interface FoldableAPI<T> {
  reduce<U>(fn: (acc: U, value: T) => U, initial: U): U;
  foldLeft<U>(fn: (acc: U, value: T) => U, initial: U): U;
  foldRight<U>(fn: (acc: U, value: T) => U, initial: U): U;
}

/**
 * API contract for Traversable
 */
export interface TraversableAPI<T> extends FunctorAPI<T> {
  sequence<F extends Kind1>(F: Applicative<F>): any;
  traverse<F extends Kind1, U>(F: Applicative<F>, fn: (value: T) => Apply<F, [U]>): any;
}

/**
 * API contract for Bifunctor
 */
export interface BifunctorAPI<K, V> {
  bimap<C, D>(f: (key: K) => C, g: (value: V) => D): any;
  mapLeft<C>(f: (key: K) => C): any;
  mapRight<D>(g: (value: V) => D): any;
}

/**
 * Check if a value has a specific method
 */
export function hasMethod<T>(value: any, method: keyof T): value is T {
  return typeof (value as any)[method] === 'function';
}

/**
 * Check if a value implements Functor API
 */
export function hasFunctorAPI<T>(value: any): value is FunctorAPI<T> {
  return hasMethod(value, 'map');
}

/**
 * Check if a value implements Applicative API
 */
export function hasApplicativeAPI<T>(value: any): value is ApplicativeAPI<T> {
  return hasFunctorAPI(value) && 
         hasMethod(value, 'of') && 
         hasMethod(value, 'ap');
}

/**
 * Check if a value implements Monad API
 */
export function hasMonadAPI<T>(value: any): value is MonadAPI<T> {
  return hasApplicativeAPI(value) && hasMethod(value, 'chain');
}

/**
 * Check if a value implements Foldable API
 */
export function hasFoldableAPI<T>(value: any): value is FoldableAPI<T> {
  return hasMethod(value, 'reduce') || 
         hasMethod(value, 'foldLeft') || 
         hasMethod(value, 'foldRight');
}

/**
 * Check if a value implements Traversable API
 */
export function hasTraversableAPI<T>(value: any): value is TraversableAPI<T> {
  return hasFunctorAPI(value) && 
         (hasMethod(value, 'sequence') || hasMethod(value, 'traverse'));
}

/**
 * Check if a value implements Bifunctor API
 */
export function hasBifunctorAPI<K, V>(value: any): value is BifunctorAPI<K, V> {
  return hasMethod(value, 'bimap') || 
         hasMethod(value, 'mapLeft') || 
         hasMethod(value, 'mapRight');
}

// ============================================================================
// Part 3: Persistent Collection Detection
// ============================================================================

/**
 * Check if a value is a persistent collection
 */
export function isPersistentCollection(value: any): boolean {
  // Check for branding
  if (value && typeof value === 'object') {
    if (value[PERSISTENT_BRAND] || value[IMMUTABLE_BRAND]) {
      return true;
    }
  }
  
  // Check for known persistent collection types
  if (value instanceof PersistentList || 
      value instanceof PersistentMap || 
      value instanceof PersistentSet) {
    return true;
  }
  
  // Check for constructor name
  if (value && value.constructor) {
    const constructorName = value.constructor.name;
    if (constructorName === 'PersistentList' || 
        constructorName === 'PersistentMap' || 
        constructorName === 'PersistentSet') {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a value is an immutable collection
 */
export function isImmutableCollection(value: any): boolean {
  // Check for persistent collections
  if (isPersistentCollection(value)) {
    return true;
  }
  
  // Check for readonly arrays
  if (Array.isArray(value)) {
    // This is a simplified check - in practice you'd want more sophisticated detection
    return true;
  }
  
  // Check for branding
  if (value && typeof value === 'object' && value[IMMUTABLE_BRAND]) {
    return true;
  }
  
  return false;
}

/**
 * Check if a value is a GADT
 */
export function isGADT(value: any): boolean {
  return value && typeof value === 'object' && 'tag' in value && 'payload' in value;
}

/**
 * Check if a value is a type constructor
 */
export function isTypeConstructor(value: any): boolean {
  return value && typeof value === 'function' && 
         (value.prototype || value.of || value.empty);
}

// ============================================================================
// Part 4: Instance Registry
// ============================================================================

/**
 * Registry for derived instances
 */
export class DerivableInstanceRegistry {
  private instances = new Map<any, Map<string, any>>();
  private factories = new Map<string, (value: any) => any>();
  private dualAPIs = new Map<string, DualAPI<any>>();

  registerFactory(typeclass: string, factory: (value: any) => any): void {
    this.factories.set(typeclass, factory);
  }

  getInstance(value: any, typeclass: string): any {
    const key = this.getKey(value);
    let typeclassInstances = this.instances.get(key);
    
    if (!typeclassInstances) {
      typeclassInstances = new Map();
      this.instances.set(key, typeclassInstances);
    }
    
    let instance = typeclassInstances.get(typeclass);
    
    if (!instance) {
      const factory = this.factories.get(typeclass);
      if (factory) {
        instance = factory(value);
        typeclassInstances.set(typeclass, instance);
      }
    }
    
    return instance;
  }

  private getKey(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return value.name || 'function';
    if (typeof value === 'object') {
      return value.constructor?.name || 'object';
    }
    return typeof value;
  }

  clear(): void {
    this.instances.clear();
    this.factories.clear();
    this.dualAPIs.clear();
  }

  getFactories(): Map<string, (value: any) => any> {
    return new Map(this.factories);
  }

  // Dual API Support
  registerDualAPI(name: string, dualAPI: DualAPI<any>): void {
    this.dualAPIs.set(name, dualAPI);
  }

  getDualAPI(name: string): DualAPI<any> | undefined {
    return this.dualAPIs.get(name);
  }

  getAllDualAPIs(): Map<string, DualAPI<any>> {
    return new Map(this.dualAPIs);
  }

  createDualAPIForInstance(instance: any, name: string, operations: readonly string[]): DualAPI<any> {
    return createDualAPI({
      instance,
      name,
      operations
    });
  }

  addFluentMethodsToPrototype(prototype: any, name: string): void {
    const dualAPI = this.dualAPIs.get(name);
    if (dualAPI) {
      dualAPI.addFluentMethods(prototype);
    }
  }
}

// Global registry instance
export const globalRegistry = new DerivableInstanceRegistry();

// ============================================================================
// Part 5: Instance Factories
// ============================================================================

/**
 * Create Functor instance from API contract
 */
export function createFunctorInstance<T>(value: FunctorAPI<T>): Functor<any> {
  return {
    map: <A, B>(fa: any, f: (a: A) => B): any => {
      return (fa as any).map(f);
    }
  };
}

/**
 * Create Applicative instance from API contract
 */
export function createApplicativeInstance<T>(value: ApplicativeAPI<T>): Applicative<any> {
  return {
    ...createFunctorInstance(value),
    of: <A>(a: A): any => {
      return (value as any).of(a);
    },
    ap: <A, B>(fab: any, fa: any): any => {
      return (value as any).ap(fab, fa);
    }
  };
}

/**
 * Create Monad instance from API contract
 */
export function createMonadInstance<T>(value: MonadAPI<T>): Monad<any> {
  return {
    ...createApplicativeInstance(value),
    chain: <A, B>(fa: any, f: (a: A) => any): any => {
      return (fa as any).chain(f);
    }
  };
}

/**
 * Create Foldable instance from API contract
 */
export function createFoldableInstance<T>(value: FoldableAPI<T>): Foldable<any> {
  return {
    reduce: <A, B>(fa: any, fn: (acc: B, value: A) => B, initial: B): B => {
      if (hasMethod(fa, 'reduce')) {
        return (fa as any).reduce(fn, initial);
      } else if (hasMethod(fa, 'foldLeft')) {
        return (fa as any).foldLeft(fn, initial);
      } else if (hasMethod(fa, 'foldRight')) {
        return (fa as any).foldRight(fn, initial);
      }
      throw new Error('No foldable method found');
    }
  };
}

/**
 * Create Traversable instance from API contract
 */
export function createTraversableInstance<T>(value: TraversableAPI<T>): Traversable<any> {
  return {
    ...createFunctorInstance(value),
    sequence: <F extends Kind1>(F: Applicative<F>, fa: any): any => {
      if (hasMethod(fa, 'sequence')) {
        return (fa as any).sequence(F);
      }
      throw new Error('No sequence method found');
    },
    traverse: <F extends Kind1, A, B>(F: Applicative<F>, fn: (a: A) => Apply<F, [B]>, fa: any): any => {
      if (hasMethod(fa, 'traverse')) {
        return (fa as any).traverse(F, fn);
      }
      throw new Error('No traverse method found');
    }
  };
}

/**
 * Create Bifunctor instance from API contract
 */
export function createBifunctorInstance<K, V>(value: BifunctorAPI<K, V>): Bifunctor<any> {
  return {
    bimap: <A, B, C, D>(fab: any, f: (a: A) => C, g: (b: B) => D): any => {
      if (hasMethod(fab, 'bimap')) {
        return (fab as any).bimap(f, g);
      }
      throw new Error('No bimap method found');
    }
  };
}

// ============================================================================
// Part 6: Automatic Instance Registration
// ============================================================================

/**
 * Register all derivable instances for a persistent collection
 */
export function registerDerivableInstances(collection: any): void {
  // Register Functor if supported
  if (hasFunctorAPI(collection)) {
    globalRegistry.registerFactory('Functor', createFunctorInstance);
  }
  
  // Register Applicative if supported
  if (hasApplicativeAPI(collection)) {
    globalRegistry.registerFactory('Applicative', createApplicativeInstance);
  }
  
  // Register Monad if supported
  if (hasMonadAPI(collection)) {
    globalRegistry.registerFactory('Monad', createMonadInstance);
  }
  
  // Register Foldable if supported
  if (hasFoldableAPI(collection)) {
    globalRegistry.registerFactory('Foldable', createFoldableInstance);
  }
  
  // Register Traversable if supported
  if (hasTraversableAPI(collection)) {
    globalRegistry.registerFactory('Traversable', createTraversableInstance);
  }
  
  // Register Bifunctor if supported
  if (hasBifunctorAPI(collection)) {
    globalRegistry.registerFactory('Bifunctor', createBifunctorInstance);
  }
}

/**
 * Auto-register instances for known persistent collections
 */
export function autoRegisterPersistentCollections(): void {
  // Register PersistentList instances
  registerDerivableInstances(PersistentList);
  
  // Register PersistentMap instances
  registerDerivableInstances(PersistentMap);
  
  // Register PersistentSet instances
  registerDerivableInstances(PersistentSet);
  
  // Register GADT instances
  registerDerivableInstances(MaybeGADT);
  registerDerivableInstances(EitherGADT);
  registerDerivableInstances(Result);
  registerDerivableInstances(Expr);
}

// ============================================================================
// Part 7: Enhanced Derive Instances Helper
// ============================================================================

/**
 * Enhanced derive instances helper with immutable collection detection
 */
export function deriveInstances<F>(F: any): {
  Functor?: Functor<any>;
  Applicative?: Applicative<any>;
  Monad?: Monad<any>;
  Foldable?: Foldable<any>;
  Traversable?: Traversable<any>;
  Bifunctor?: Bifunctor<any>;
} {
  const instances: any = {};
  
  // Check if it's a persistent collection
  if (isPersistentCollection(F)) {
    // Get Functor instance
    try {
      const functorInstance = globalRegistry.getInstance(F, 'Functor');
      if (functorInstance) {
        instances.Functor = functorInstance;
      }
    } catch (e) {
      // Functor not available
    }
    
    // Get Applicative instance
    try {
      const applicativeInstance = globalRegistry.getInstance(F, 'Applicative');
      if (applicativeInstance) {
        instances.Applicative = applicativeInstance;
      }
    } catch (e) {
      // Applicative not available
    }
    
    // Get Monad instance
    try {
      const monadInstance = globalRegistry.getInstance(F, 'Monad');
      if (monadInstance) {
        instances.Monad = monadInstance;
      }
    } catch (e) {
      // Monad not available
    }
    
    // Get Foldable instance
    try {
      const foldableInstance = globalRegistry.getInstance(F, 'Foldable');
      if (foldableInstance) {
        instances.Foldable = foldableInstance;
      }
    } catch (e) {
      // Foldable not available
    }
    
    // Get Traversable instance
    try {
      const traversableInstance = globalRegistry.getInstance(F, 'Traversable');
      if (traversableInstance) {
        instances.Traversable = traversableInstance;
      }
    } catch (e) {
      // Traversable not available
    }
    
    // Get Bifunctor instance
    try {
      const bifunctorInstance = globalRegistry.getInstance(F, 'Bifunctor');
      if (bifunctorInstance) {
        instances.Bifunctor = bifunctorInstance;
      }
    } catch (e) {
      // Bifunctor not available
    }
  }
  
  // Check if it's a GADT
  if (isGADT(F)) {
    // GADTs can have pattern matching-based instances
    // This would integrate with the readonly pattern matching system
  }
  
  return instances;
}

// ============================================================================
// Part 8: Type-Safe Instance Access
// ============================================================================

/**
 * Type-safe instance accessor
 */
export function getInstance<F, T extends string>(
  value: F,
  typeclass: T
): any {
  return globalRegistry.getInstance(value, typeclass);
}

/**
 * Type-safe Functor instance accessor
 */
export function getFunctorInstance<F>(value: F): Functor<any> | undefined {
  try {
    return getInstance(value, 'Functor');
  } catch (e) {
    return undefined;
  }
}

/**
 * Type-safe Applicative instance accessor
 */
export function getApplicativeInstance<F>(value: F): Applicative<any> | undefined {
  try {
    return getInstance(value, 'Applicative');
  } catch (e) {
    return undefined;
  }
}

/**
 * Type-safe Monad instance accessor
 */
export function getMonadInstance<F>(value: F): Monad<any> | undefined {
  try {
    return getInstance(value, 'Monad');
  } catch (e) {
    return undefined;
  }
}

/**
 * Type-safe Foldable instance accessor
 */
export function getFoldableInstance<F>(value: F): Foldable<any> | undefined {
  try {
    return getInstance(value, 'Foldable');
  } catch (e) {
    return undefined;
  }
}

/**
 * Type-safe Traversable instance accessor
 */
export function getTraversableInstance<F>(value: F): Traversable<any> | undefined {
  try {
    return getInstance(value, 'Traversable');
  } catch (e) {
    return undefined;
  }
}

/**
 * Type-safe Bifunctor instance accessor
 */
export function getBifunctorInstance<F>(value: F): Bifunctor<any> | undefined {
  try {
    return getInstance(value, 'Bifunctor');
  } catch (e) {
    return undefined;
  }
}

// ============================================================================
// Part 9: GADT Integration
// ============================================================================

/**
 * Create GADT-based instances using pattern matching
 */
export function createGADTInstances<T extends GADT<string, any>>(
  gadt: T,
  patterns: {
    [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => any;
  }
): any {
  return {
    // Functor-like behavior using pattern matching
    map: <U>(fn: (value: any) => U): any => {
      return pmatch(gadt, {
        ...Object.fromEntries(
          Object.entries(patterns).map(([tag, handler]) => [
            tag,
            (payload: any) => fn(handler(payload))
          ])
        )
      } as any);
    }
  };
}

/**
 * Register GADT instances
 */
export function registerGADTInstances<T extends GADT<string, any>>(
  gadt: T,
  patterns: {
    [K in GADTTags<T>]: (payload: GADTPayload<T, K>) => any;
  }
): void {
  const instances = createGADTInstances(gadt, patterns);
  
  // Register the instances in the global registry
  globalRegistry.registerFactory('GADTFunctor', () => instances);
}

// ============================================================================
// Part 10: Extensible Typeclass System
// ============================================================================

/**
 * Extensible typeclass definition
 */
export interface ExtensibleTypeclass<T> {
  name: string;
  methods: (keyof T)[];
  derive: (value: any) => T | undefined;
}

/**
 * Registry for extensible typeclasses
 */
export class ExtensibleTypeclassRegistry {
  private typeclasses = new Map<string, ExtensibleTypeclass<any>>();
  
  /**
   * Register a new typeclass
   */
  register<T>(typeclass: ExtensibleTypeclass<T>): void {
    this.typeclasses.set(typeclass.name, typeclass);
    
    // Register the factory in the global registry
    globalRegistry.registerFactory(typeclass.name, typeclass.derive);
  }
  
  /**
   * Get a typeclass by name
   */
  get<T>(name: string): ExtensibleTypeclass<T> | undefined {
    return this.typeclasses.get(name);
  }
  
  /**
   * Get all registered typeclasses
   */
  getAll(): Map<string, ExtensibleTypeclass<any>> {
    return new Map(this.typeclasses);
  }
  
  /**
   * Clear all typeclasses
   */
  clear(): void {
    this.typeclasses.clear();
  }
}

// Global extensible typeclass registry
export const globalTypeclassRegistry = new ExtensibleTypeclassRegistry();

// ============================================================================
// Part 11: Utility Functions
// ============================================================================

/**
 * Check if a value has all required methods for a typeclass
 */
export function hasTypeclassMethods(value: any, methods: string[]): boolean {
  return methods.every(method => hasMethod(value, method));
}

/**
 * Create a typeclass instance from method bindings
 */
export function createInstanceFromMethods(value: any, methods: Record<string, string>): any {
  const instance: any = {};
  
  for (const [instanceMethod, valueMethod] of Object.entries(methods)) {
    if (hasMethod(value, valueMethod)) {
      instance[instanceMethod] = (value as any)[valueMethod].bind(value);
    }
  }
  
  return instance;
}

/**
 * Auto-derive instances for a value
 */
export function autoDeriveInstances(value: any): any {
  const instances: any = {};
  
  // Try to derive each typeclass
  const typeclasses = globalTypeclassRegistry.getAll();
  
  for (const [name, typeclass] of typeclasses) {
    try {
      const instance = typeclass.derive(value);
      if (instance) {
        instances[name] = instance;
      }
    } catch (e) {
      // Typeclass not applicable
    }
  }
  
  return instances;
}

// ============================================================================
// Part 12: Laws and Properties
// ============================================================================

/**
 * Derivable Instance Laws:
 * 
 * 1. Automatic Detection: Persistent collections are automatically detected
 * 2. API Contract: Instances are derived from API contracts
 * 3. Type Safety: Derived instances maintain type safety
 * 4. Immutability: Derived instances preserve immutability
 * 5. Composition: Multiple typeclasses can be derived for the same collection
 * 
 * Runtime Laws:
 * 
 * 1. Detection Law: isPersistentCollection correctly identifies persistent collections
 * 2. Derivation Law: deriveInstances creates valid typeclass instances
 * 3. Registry Law: Global registry correctly stores and retrieves instances
 * 4. Branding Law: Branded collections are correctly identified
 * 
 * Type-Level Laws:
 * 
 * 1. Type Detection Law: Type-level detection matches runtime detection
 * 2. Arity Law: Type constructor arity is correctly inferred
 * 3. Element Law: Element types are correctly extracted
 * 4. Safety Law: Derived instances maintain type safety
 */ 