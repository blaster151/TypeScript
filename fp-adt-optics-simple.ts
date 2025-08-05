/**
 * Simple ADT Optics Integration
 * 
 * This module provides a simple way to add optics methods to ADT instances:
 * - .view, .set, .over for Lenses
 * - .preview, .review for Prisms
 * - Works with existing ADT instances
 */

import {
  // Core optic types
  Lens,
  Prism,
  
  // Lens utilities
  view,
  set,
  over,
  
  // Prism utilities
  preview,
  review
} from './fp-optics';

import {
  // ADT imports
  Maybe, Just, Nothing
} from './fp-maybe-unified';

// ============================================================================
// Part 1: Optics-Enhanced ADT Interface
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
// Part 3: Enhanced ADT Constructors
// ============================================================================

/**
 * Enhanced Maybe constructors with optics support
 */
export const JustOptics = addOpticsToConstructor(Just);
export const NothingOptics = addOpticsToConstructor(Nothing);

// ============================================================================
// Part 4: ObservableLite Enhancement
// ============================================================================

import {
  // ObservableLite imports
  ObservableLite
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
// Part 5: Utility Functions
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

 