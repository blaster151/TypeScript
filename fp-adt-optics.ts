/**
 * ADT Optics Integration
 * 
 * This module extends ADT instances with fluent optics API support:
 * - .view, .set, .over for Lenses
 * - .preview, .review for Prisms
 * - Full HKT and purity integration
 * - Type-safe optics operations
 */

import {
  // Core optic types
  Optic,
  Lens,
  Prism,
  Traversal,
  Iso,
  Getter,
  Setter,
  
  // Profunctor variants
  Choice,
  Traversing,
  Strong,
  
  // Lens utilities
  lens,
  view,
  set,
  over,
  
  // Prism utilities
  prism,
  preview,
  review,
  isMatching,
  
  // Traversal utilities
  traversal,
  map,
  
  // Common constructors
  prop,
  at,
  head,
  last,
  just,
  right,
  left,
  ok,
  err,
  array,
  values,
  keys,
  
  // Composition
  compose,
  composeMany,
  
  // HKT types
  OpticK,
  OpticWithEffect,
  EffectOfOptic,
  IsOpticPure,
  IsOpticImpure,
  
  // Utility functions
  isLens,
  isPrism,
  isTraversal,
  isOptic,
  to,
  sets
} from './fp-optics';

import {
  // ADT Builder imports
  SumTypeBuilder,
  ProductTypeBuilder,
  SumTypeConfig,
  ProductTypeConfig,
  createSumType,
  createProductType,
  ExtractSumTypeHKT,
  ExtractSumTypeInstance,
  ExtractProductTypeHKT,
  ExtractProductTypeInstance,
  Constructor,
  ConstructorSpec,
  SumTypeInstance,
  ProductTypeInstance,
  ProductFields
} from './fp-adt-builders';

import {
  // HKT imports
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe as HKTMaybe, Either as HKTEither, List, Reader, Writer, State
} from './fp-hkt';

import {
  // Typeclass imports
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  // Purity imports
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

import {
  // Unified ADT imports
  MaybeUnified, Maybe, MaybeK as MaybeHKT, Just, Nothing, matchMaybe, isJust, fromJust
} from './fp-maybe-unified';

// ============================================================================
// Part 1: Optics-Enhanced ADT Types
// ============================================================================

/**
 * Optics-enhanced ADT instance interface
 */
export interface OpticsEnhancedADT<T> {
  // Lens operations
  view<A>(optic: Lens<T, T, A, A>): A;
  set<A>(optic: Lens<T, T, A, A>, value: A): T;
  over<A, B>(optic: Lens<T, T, A, B>, fn: (a: A) => B): T;
  
  // Prism operations
  preview<A>(optic: Prism<T, T, A, A>): Maybe<A>;
  review<A>(optic: Prism<T, T, A, A>, value: A): T;
}

/**
 * Optics-enhanced Sum Type Builder
 */
export interface OpticsEnhancedSumTypeBuilder<Spec> extends SumTypeBuilder<Spec> {
  // Enhanced constructors with optics support
  readonly constructors: {
    [K in keyof Spec]: Constructor<Spec[K]> & OpticsEnhancedADT<ReturnType<Spec[K]>>;
  };
  
  // Enhanced instance type with optics support
  readonly Instance: SumTypeInstance<Spec> & OpticsEnhancedADT<SumTypeInstance<Spec>>;
}

/**
 * Optics-enhanced Product Type Builder
 */
export interface OpticsEnhancedProductTypeBuilder<Fields> extends ProductTypeBuilder<Fields> {
  // Enhanced instance type with optics support
  readonly Instance: ProductTypeInstance<Fields> & OpticsEnhancedADT<ProductTypeInstance<Fields>>;
}

// ============================================================================
// Part 2: Optics Method Implementation
// ============================================================================

/**
 * Add optics methods to an ADT instance
 * @param instance - The ADT instance to enhance
 * @returns Enhanced instance with optics methods
 */
export function addOpticsMethods<T>(instance: T): T & OpticsEnhancedADT<T> {
  const enhanced = instance as T & OpticsEnhancedADT<T>;
  
  // Add lens methods
  enhanced.view = function<A>(optic: Lens<T, T, A, A>): A {
    return view(optic, this);
  };
  
  enhanced.set = function<A>(optic: Lens<T, T, A, A>, value: A): T {
    return set(optic, value, this);
  };
  
  enhanced.over = function<A, B>(optic: Lens<T, T, A, B>, fn: (a: A) => B): T {
    return over(optic, fn, this);
  };
  
  // Add prism methods
  enhanced.preview = function<A>(optic: Prism<T, T, A, A>): Maybe<A> {
    return preview(optic, this);
  };
  
  enhanced.review = function<A>(optic: Prism<T, T, A, A>, value: A): T {
    return review(optic, value);
  };
  
  return enhanced;
}

/**
 * Add optics methods to a constructor function
 * @param constructor - The constructor function to enhance
 * @returns Enhanced constructor with optics methods
 */
export function addOpticsToConstructor<T extends (...args: any[]) => any>(
  constructor: T
): T & OpticsEnhancedADT<ReturnType<T>> {
  const enhanced = constructor as T & OpticsEnhancedADT<ReturnType<T>>;
  
  // Add lens methods
  enhanced.view = function<A>(optic: Lens<ReturnType<T>, ReturnType<T>, A, A>): A {
    return view(optic, this);
  };
  
  enhanced.set = function<A>(optic: Lens<ReturnType<T>, ReturnType<T>, A, A>, value: A): ReturnType<T> {
    return set(optic, value, this);
  };
  
  enhanced.over = function<A, B>(optic: Lens<ReturnType<T>, ReturnType<T>, A, B>, fn: (a: A) => B): ReturnType<T> {
    return over(optic, fn, this);
  };
  
  // Add prism methods
  enhanced.preview = function<A>(optic: Prism<ReturnType<T>, ReturnType<T>, A, A>): Maybe<A> {
    return preview(optic, this);
  };
  
  enhanced.review = function<A>(optic: Prism<ReturnType<T>, ReturnType<T>, A, A>, value: A): ReturnType<T> {
    return review(optic, value);
  };
  
  return enhanced;
}

// ============================================================================
// Part 3: Enhanced ADT Builders
// ============================================================================

/**
 * Create an optics-enhanced sum type
 * @param spec - Constructor specification
 * @param config - Configuration options
 * @returns Enhanced sum type builder with optics support
 */
export function createOpticsEnhancedSumType<Spec extends Record<string, (...args: any[]) => any>>(
  spec: Spec,
  config: SumTypeConfig = {}
): OpticsEnhancedSumTypeBuilder<Spec> {
  // Create base sum type
  const baseBuilder = createSumType(spec, config);
  
  // Enhance constructors with optics support
  const enhancedConstructors = {} as any;
  for (const key in baseBuilder.constructors) {
    const constructor = baseBuilder.constructors[key];
    enhancedConstructors[key] = addOpticsToConstructor(constructor);
  }
  
  // Create enhanced builder
  const enhancedBuilder: OpticsEnhancedSumTypeBuilder<Spec> = {
    ...baseBuilder,
    constructors: enhancedConstructors,
    Instance: {} as any // Will be properly typed when used
  };
  
  return enhancedBuilder;
}

/**
 * Create an optics-enhanced product type
 * @param config - Configuration options
 * @returns Enhanced product type builder with optics support
 */
export function createOpticsEnhancedProductType<Fields extends Record<string, any>>(
  config: ProductTypeConfig = {}
): OpticsEnhancedProductTypeBuilder<Fields> {
  // Create base product type
  const baseBuilder = createProductType<Fields>(config);
  
  // Create enhanced builder
  const enhancedBuilder: OpticsEnhancedProductTypeBuilder<Fields> = {
    ...baseBuilder,
    Instance: {} as any // Will be properly typed when used
  };
  
  return enhancedBuilder;
}

// ============================================================================
// Part 4: Enhanced ADT Instances
// ============================================================================

/**
 * Enhanced Maybe with optics support
 */
export const MaybeOpticsEnhanced = createOpticsEnhancedSumType({
  Just: <A>(value: A) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false
});

/**
 * Enhanced Maybe constructors with optics support
 */
export const JustOptics = addOpticsToConstructor(Just);
export const NothingOptics = addOpticsToConstructor(Nothing);

/**
 * Enhanced Either with optics support
 */
export const EitherOpticsEnhanced = createOpticsEnhancedSumType({
  Left: <L>(value: L) => ({ value }),
  Right: <R>(value: R) => ({ value })
}, {
  name: 'Either',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false
});

/**
 * Enhanced Either constructors with optics support
 */
export const LeftOptics = addOpticsToConstructor(Left);
export const RightOptics = addOpticsToConstructor(Right);

/**
 * Enhanced Result with optics support
 */
export const ResultOpticsEnhanced = createOpticsEnhancedSumType({
  Err: <E>(value: E) => ({ value }),
  Ok: <A>(value: A) => ({ value })
}, {
  name: 'Result',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false
});

/**
 * Enhanced Result constructors with optics support
 */
export const OkOptics = addOpticsToConstructor(Ok);
export const ErrOptics = addOpticsToConstructor(Err);

// ============================================================================
// Part 5: ObservableLite Optics Enhancement
// ============================================================================

import {
  // ObservableLite imports
  ObservableLite, ObservableLiteK,
  ObservableLiteFunctor, ObservableLiteApplicative, ObservableLiteMonad
} from './fp-observable-lite';

/**
 * Enhanced ObservableLite with optics support
 */
export interface OpticsEnhancedObservableLite<A> extends ObservableLite<A> {
  // Lens operations for ObservableLite
  over<B>(optic: Lens<A, B, any, any>, fn: (a: A) => B): ObservableLite<B>;
  
  // Prism operations for ObservableLite
  preview<B>(optic: Prism<A, B, any, any>): ObservableLite<Maybe<B>>;
}

/**
 * Add optics methods to ObservableLite
 * @param observable - The ObservableLite instance to enhance
 * @returns Enhanced ObservableLite with optics methods
 */
export function addObservableLiteOptics<A>(observable: ObservableLite<A>): OpticsEnhancedObservableLite<A> {
  const enhanced = observable as OpticsEnhancedObservableLite<A>;
  
  // Add lens operations
  enhanced.over = function<B>(optic: Lens<A, B, any, any>, fn: (a: A) => B): ObservableLite<B> {
    return this.map(value => over(optic, fn, value));
  };
  
  // Add prism operations
  enhanced.preview = function<B>(optic: Prism<A, B, any, any>): ObservableLite<Maybe<B>> {
    return this.map(value => preview(optic, value));
  };
  
  return enhanced;
}

/**
 * Enhanced ObservableLite constructor with optics support
 */
export const ObservableLiteOptics = {
  ...ObservableLite,
  fromArray: <A>(values: A[]): OpticsEnhancedObservableLite<A> => {
    const observable = ObservableLite.fromArray(values);
    return addObservableLiteOptics(observable);
  },
  of: <A>(value: A): OpticsEnhancedObservableLite<A> => {
    const observable = ObservableLite.of(value);
    return addObservableLiteOptics(observable);
  },
  fromPromise: <A>(promise: Promise<A>): OpticsEnhancedObservableLite<A> => {
    const observable = ObservableLite.fromPromise(promise);
    return addObservableLiteOptics(observable);
  }
};

// ============================================================================
// Part 6: Type Utilities
// ============================================================================

/**
 * Extract optics-enhanced instance type from builder
 */
export type ExtractOpticsEnhancedInstance<Builder> = Builder extends OpticsEnhancedSumTypeBuilder<any>
  ? Builder['Instance']
  : Builder extends OpticsEnhancedProductTypeBuilder<any>
  ? Builder['Instance']
  : never;

/**
 * Extract optics-enhanced HKT from builder
 */
export type ExtractOpticsEnhancedHKT<Builder> = Builder extends OpticsEnhancedSumTypeBuilder<any>
  ? Builder['HKT']
  : Builder extends OpticsEnhancedProductTypeBuilder<any>
  ? Builder['HKT']
  : never;

// ============================================================================
// Part 7: Utility Functions
// ============================================================================

/**
 * Check if an instance has optics methods
 */
export function hasOpticsMethods<T>(instance: T): instance is T & OpticsEnhancedADT<T> {
  return instance && 
         typeof (instance as any).view === 'function' &&
         typeof (instance as any).set === 'function' &&
         typeof (instance as any).over === 'function' &&
         typeof (instance as any).preview === 'function' &&
         typeof (instance as any).review === 'function';
}

/**
 * Get available optics methods for an instance
 */
export function getAvailableOpticsMethods<T>(instance: T): string[] {
  if (!hasOpticsMethods(instance)) return [];
  
  const methods: string[] = [];
  if (typeof (instance as any).view === 'function') methods.push('view');
  if (typeof (instance as any).set === 'function') methods.push('set');
  if (typeof (instance as any).over === 'function') methods.push('over');
  if (typeof (instance as any).preview === 'function') methods.push('preview');
  if (typeof (instance as any).review === 'function') methods.push('review');
  
  return methods;
}

/**
 * Create optics-enhanced instance from base instance
 */
export function enhanceWithOptics<T>(instance: T): T & OpticsEnhancedADT<T> {
  return addOpticsMethods(instance);
}

// ============================================================================
// Part 8: Export All
// ============================================================================

export {
  // Core types
  OpticsEnhancedADT,
  OpticsEnhancedSumTypeBuilder,
  OpticsEnhancedProductTypeBuilder,
  
  // Enhanced builders
  createOpticsEnhancedSumType,
  createOpticsEnhancedProductType,
  
  // Enhanced instances
  MaybeOpticsEnhanced,
  EitherOpticsEnhanced,
  ResultOpticsEnhanced,
  
  // Enhanced constructors
  JustOptics,
  NothingOptics,
  LeftOptics,
  RightOptics,
  OkOptics,
  ErrOptics,
  
  // ObservableLite enhancement
  OpticsEnhancedObservableLite,
  addObservableLiteOptics,
  ObservableLiteOptics,
  
  // Utility functions
  addOpticsMethods,
  addOpticsToConstructor,
  hasOpticsMethods,
  getAvailableOpticsMethods,
  enhanceWithOptics,
  
  // Type utilities
  ExtractOpticsEnhancedInstance,
  ExtractOpticsEnhancedHKT
}; 