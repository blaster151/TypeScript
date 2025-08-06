/**
 * Fluent ADT API System
 * 
 * Provides fluent method syntax (.map, .chain, .filter) for all ADTs,
 * delegating to registered typeclass instances for consistency.
 */

import type { 
  Functor, 
  Applicative, 
  Monad, 
  Bifunctor,
  Kind, 
  Apply, 
  Type 
} from './fp-typeclasses';
import { getTypeclassInstance } from './fp-registry-init';

// ============================================================================
// Core Fluent Method Types
// ============================================================================

/**
 * Fluent method interface for unary type constructors
 */
export interface FluentADT<F extends Kind<[Type]>, A> {
  map<B>(f: (a: A) => B): Apply<F, [B]>;
  chain<B>(f: (a: A) => Apply<F, [B]>): Apply<F, [B]>;
  filter(predicate: (a: A) => boolean): Apply<F, [A]>;
  ap<B>(other: Apply<F, [(a: A) => B]>): Apply<F, [B]>;
}

/**
 * Fluent method interface for binary type constructors
 */
export interface FluentBifunctorADT<F extends Kind<[Type, Type]>, L, R> {
  bimap<L2, R2>(f: (l: L) => L2, g: (r: R) => R2): Apply<F, [L2, R2]>;
  mapLeft<L2>(f: (l: L) => L2): Apply<F, [L2, R]>;
  mapRight<R2>(g: (r: R) => R2): Apply<F, [L, R2]>;
  chainLeft<L2>(f: (l: L) => Apply<F, [L2, R]>): Apply<F, [L2, R]>;
  chainRight<R2>(g: (r: R) => Apply<F, [L, R2]>): Apply<F, [L, R2]>;
}

// ============================================================================
// Fluent Method Implementation
// ============================================================================

/**
 * Add fluent methods to an ADT instance
 */
export function addFluentMethods<F extends Kind<[Type]>, A>(
  adt: Apply<F, [A]>,
  typeName: string
): Apply<F, [A]> & FluentADT<F, A> {
  const functor = getTypeclassInstance(typeName, 'Functor') as Functor<F>;
  const monad = getTypeclassInstance(typeName, 'Monad') as Monad<F>;
  const applicative = getTypeclassInstance(typeName, 'Applicative') as Applicative<F>;

  if (!functor) {
    throw new Error(`No Functor instance found for ${typeName}`);
  }

  const fluent = adt as any;

  // Add map method
  fluent.map = <B>(f: (a: A) => B): Apply<F, [B]> => {
    return functor.map(adt, f);
  };

  // Add chain method (if Monad instance exists)
  if (monad) {
    fluent.chain = <B>(f: (a: A) => Apply<F, [B]>): Apply<F, [B]> => {
      return monad.chain(adt, f);
    };
  }

  // Add ap method (if Applicative instance exists)
  if (applicative) {
    fluent.ap = <B>(other: Apply<F, [(a: A) => B]>): Apply<F, [B]> => {
      return applicative.ap(other, adt);
    };
  }

  // Add filter method (generic implementation)
  fluent.filter = (predicate: (a: A) => boolean): Apply<F, [A]> => {
    if (monad) {
      return monad.chain(adt, (a: A) => predicate(a) ? monad.of(a) : monad.of(null as any));
    }
    throw new Error(`Filter requires Monad instance for ${typeName}`);
  };

  return fluent;
}

/**
 * Add fluent bifunctor methods to an ADT instance
 */
export function addBifunctorMethods<F extends Kind<[Type, Type]>, L, R>(
  adt: Apply<F, [L, R]>,
  typeName: string
): Apply<F, [L, R]> & FluentBifunctorADT<F, L, R> {
  const bifunctor = getTypeclassInstance(typeName, 'Bifunctor') as Bifunctor<F>;
  const monad = getTypeclassInstance(typeName, 'Monad') as Monad<F>;

  if (!bifunctor) {
    throw new Error(`No Bifunctor instance found for ${typeName}`);
  }

  const fluent = adt as any;

  // Add bimap method
  fluent.bimap = <L2, R2>(f: (l: L) => L2, g: (r: R) => R2): Apply<F, [L2, R2]> => {
    return bifunctor.bimap(adt, f, g);
  };

  // Add mapLeft method
  fluent.mapLeft = <L2>(f: (l: L) => L2): Apply<F, [L2, R]> => {
    return bifunctor.mapLeft(adt, f);
  };

  // Add mapRight method
  fluent.mapRight = <R2>(g: (r: R) => R2): Apply<F, [L, R2]> => {
    return bifunctor.mapRight(adt, g);
  };

  // Add chainLeft method (if Monad instance exists)
  if (monad) {
    fluent.chainLeft = <L2>(f: (l: L) => Apply<F, [L2, R]>): Apply<F, [L2, R]> => {
      // This is a simplified implementation - would need proper bifunctor monad
      return bifunctor.bimap(adt, f, (r: R) => monad.of(r));
    };
  }

  // Add chainRight method (if Monad instance exists)
  if (monad) {
    fluent.chainRight = <R2>(g: (r: R) => Apply<F, [L, R2]>): Apply<F, [L, R2]> => {
      // This is a simplified implementation - would need proper bifunctor monad
      return bifunctor.bimap(adt, (l: L) => monad.of(l), g);
    };
  }

  return fluent;
}

// ============================================================================
// ADT-Specific Fluent Wrappers
// ============================================================================

/**
 * Maybe fluent wrapper
 */
export function fluentMaybe<A>(maybe: any): any & FluentADT<any, A> {
  return addFluentMethods(maybe, 'Maybe');
}

/**
 * Either fluent wrapper
 */
export function fluentEither<L, R>(either: any): any & FluentADT<any, R> & FluentBifunctorADT<any, L, R> {
  const withFluent = addFluentMethods(either, 'Either');
  return addBifunctorMethods(withFluent, 'Either');
}

/**
 * Result fluent wrapper
 */
export function fluentResult<A, E>(result: any): any & FluentADT<any, A> & FluentBifunctorADT<any, E, A> {
  const withFluent = addFluentMethods(result, 'Result');
  return addBifunctorMethods(withFluent, 'Result');
}

/**
 * ObservableLite fluent wrapper (for consistency)
 */
export function fluentObservable<A>(observable: any): any & FluentADT<any, A> {
  return addFluentMethods(observable, 'ObservableLite');
}

// ============================================================================
// Prototype Augmentation
// ============================================================================

/**
 * Augment ADT constructors with fluent methods
 */
export function augmentADTWithFluent<F extends Kind<[Type]>>(
  constructor: any,
  typeName: string
): void {
  const functor = getTypeclassInstance(typeName, 'Functor') as Functor<F>;
  const monad = getTypeclassInstance(typeName, 'Monad') as Monad<F>;
  const applicative = getTypeclassInstance(typeName, 'Applicative') as Applicative<F>;

  if (!functor) {
    console.warn(`No Functor instance found for ${typeName}, skipping fluent augmentation`);
    return;
  }

  // Add map to prototype
  constructor.prototype.map = function<A, B>(this: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]> {
    return functor.map(this, f);
  };

  // Add chain to prototype (if Monad instance exists)
  if (monad) {
    constructor.prototype.chain = function<A, B>(this: Apply<F, [A]>, f: (a: A) => Apply<F, [B]>): Apply<F, [B]> {
      return monad.chain(this, f);
    };
  }

  // Add ap to prototype (if Applicative instance exists)
  if (applicative) {
    constructor.prototype.ap = function<A, B>(this: Apply<F, [A]>, other: Apply<F, [(a: A) => B]>): Apply<F, [B]> {
      return applicative.ap(other, this);
    };
  }

  // Add filter to prototype (if Monad instance exists)
  if (monad) {
    constructor.prototype.filter = function<A>(this: Apply<F, [A]>, predicate: (a: A) => boolean): Apply<F, [A]> {
      return monad.chain(this, (a: A) => predicate(a) ? monad.of(a) : monad.of(null as any));
    };
  }
}

/**
 * Augment bifunctor ADT constructors with fluent methods
 */
export function augmentBifunctorADTWithFluent<F extends Kind<[Type, Type]>>(
  constructor: any,
  typeName: string
): void {
  const bifunctor = getTypeclassInstance(typeName, 'Bifunctor') as Bifunctor<F>;

  if (!bifunctor) {
    console.warn(`No Bifunctor instance found for ${typeName}, skipping bifunctor fluent augmentation`);
    return;
  }

  // Add bimap to prototype
  constructor.prototype.bimap = function<L, R, L2, R2>(this: Apply<F, [L, R]>, f: (l: L) => L2, g: (r: R) => R2): Apply<F, [L2, R2]> {
    return bifunctor.bimap(this, f, g);
  };

  // Add mapLeft to prototype
  constructor.prototype.mapLeft = function<L, R, L2>(this: Apply<F, [L, R]>, f: (l: L) => L2): Apply<F, [L2, R]> {
    return bifunctor.mapLeft(this, f);
  };

  // Add mapRight to prototype
  constructor.prototype.mapRight = function<L, R, R2>(this: Apply<F, [L, R]>, g: (r: R) => R2): Apply<F, [L, R2]> {
    return bifunctor.mapRight(this, g);
  };
}

// ============================================================================
// Auto-Augmentation for Core ADTs
// ============================================================================

/**
 * Auto-augment all core ADTs with fluent methods
 */
export function autoAugmentCoreADTs(): void {
  // Import ADT constructors (these would need to be available)
  try {
    // Maybe
    if (typeof globalThis !== 'undefined' && (globalThis as any).Maybe) {
      augmentADTWithFluent((globalThis as any).Maybe, 'Maybe');
    }

    // Either
    if (typeof globalThis !== 'undefined' && (globalThis as any).Either) {
      augmentADTWithFluent((globalThis as any).Either, 'Either');
      augmentBifunctorADTWithFluent((globalThis as any).Either, 'Either');
    }

    // Result
    if (typeof globalThis !== 'undefined' && (globalThis as any).Result) {
      augmentADTWithFluent((globalThis as any).Result, 'Result');
      augmentBifunctorADTWithFluent((globalThis as any).Result, 'Result');
    }

    // ObservableLite
    if (typeof globalThis !== 'undefined' && (globalThis as any).ObservableLite) {
      augmentADTWithFluent((globalThis as any).ObservableLite, 'ObservableLite');
    }

    console.log('✅ Core ADTs augmented with fluent methods');
  } catch (error) {
    console.warn('⚠️ Some ADTs could not be augmented:', error);
  }
}

// Auto-augment when module is loaded
if (typeof globalThis !== 'undefined') {
  autoAugmentCoreADTs();
} 