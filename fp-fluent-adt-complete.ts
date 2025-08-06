/**
 * Complete Fluent ADT Integration
 * 
 * This module completes the fluent ADT system by providing the missing
 * integration pieces to automatically attach fluent methods to ADT constructors.
 */

import {
  Maybe, Just, Nothing, matchMaybe,
  Either, Left, Right, matchEither,
  Result, Ok, Err, matchResult
} from './fp-maybe-unified';

import {
  ObservableLite
} from './fp-observable-lite';

import {
  getTypeclassInstance
} from './fp-registry-init';

import {
  addFluentMethods,
  addBifunctorMethods,
  augmentADTWithFluent,
  augmentBifunctorADTWithFluent
} from './fp-fluent-adt';

// ============================================================================
// Part 1: ADT Constructor Augmentation
// ============================================================================

/**
 * Augment Maybe constructor with fluent methods
 */
export function augmentMaybeWithFluent(): void {
  if (!Maybe || typeof Maybe !== 'function') {
    console.warn('Maybe constructor not available for fluent augmentation');
    return;
  }

  // Add fluent methods to Maybe instances
  Maybe.prototype.map = function<A, B>(this: Maybe<A>, f: (a: A) => B): Maybe<B> {
    return matchMaybe(this, {
      Just: value => Just(f(value)),
      Nothing: () => Nothing()
    });
  };

  Maybe.prototype.chain = function<A, B>(this: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> {
    return matchMaybe(this, {
      Just: value => f(value),
      Nothing: () => Nothing()
    });
  };

  Maybe.prototype.filter = function<A>(this: Maybe<A>, predicate: (a: A) => boolean): Maybe<A> {
    return matchMaybe(this, {
      Just: value => predicate(value) ? this : Nothing(),
      Nothing: () => Nothing()
    });
  };

  Maybe.prototype.ap = function<A, B>(this: Maybe<A>, fab: Maybe<(a: A) => B>): Maybe<B> {
    return matchMaybe(this, {
      Just: value => matchMaybe(fab, {
        Just: fn => Just(fn(value)),
        Nothing: () => Nothing()
      }),
      Nothing: () => Nothing()
    });
  };

  // Add static methods
  Maybe.of = <A>(a: A): Maybe<A> => Just(a);
  Maybe.Just = Just;
  Maybe.Nothing = Nothing;

  console.log('✅ Maybe augmented with fluent methods');
}

/**
 * Augment Either constructor with fluent methods
 */
export function augmentEitherWithFluent(): void {
  if (!Either || typeof Either !== 'function') {
    console.warn('Either constructor not available for fluent augmentation');
    return;
  }

  // Add fluent methods to Either instances
  Either.prototype.map = function<L, R, B>(this: Either<L, R>, f: (r: R) => B): Either<L, B> {
    return matchEither(this, {
      Left: value => Left(value),
      Right: value => Right(f(value))
    });
  };

  Either.prototype.chain = function<L, R, B>(this: Either<L, R>, f: (r: R) => Either<L, B>): Either<L, B> {
    return matchEither(this, {
      Left: value => Left(value),
      Right: value => f(value)
    });
  };

  Either.prototype.bimap = function<L, R, L2, R2>(
    this: Either<L, R>,
    f: (l: L) => L2,
    g: (r: R) => R2
  ): Either<L2, R2> {
    return matchEither(this, {
      Left: value => Left(f(value)),
      Right: value => Right(g(value))
    });
  };

  Either.prototype.mapLeft = function<L, R, L2>(this: Either<L, R>, f: (l: L) => L2): Either<L2, R> {
    return matchEither(this, {
      Left: value => Left(f(value)),
      Right: value => Right(value)
    });
  };

  Either.prototype.mapRight = function<L, R, R2>(this: Either<L, R>, g: (r: R) => R2): Either<L, R2> {
    return matchEither(this, {
      Left: value => Left(value),
      Right: value => Right(g(value))
    });
  };

  // Add static methods
  Either.Left = Left;
  Either.Right = Right;

  console.log('✅ Either augmented with fluent methods');
}

/**
 * Augment Result constructor with fluent methods
 */
export function augmentResultWithFluent(): void {
  if (!Result || typeof Result !== 'function') {
    console.warn('Result constructor not available for fluent augmentation');
    return;
  }

  // Add fluent methods to Result instances
  Result.prototype.map = function<A, E, B>(this: Result<A, E>, f: (a: A) => B): Result<B, E> {
    return matchResult(this, {
      Ok: value => Ok(f(value)),
      Err: error => Err(error)
    });
  };

  Result.prototype.chain = function<A, E, B>(this: Result<A, E>, f: (a: A) => Result<B, E>): Result<B, E> {
    return matchResult(this, {
      Ok: value => f(value),
      Err: error => Err(error)
    });
  };

  Result.prototype.bimap = function<A, E, B, F>(
    this: Result<A, E>,
    f: (e: E) => F,
    g: (a: A) => B
  ): Result<B, F> {
    return matchResult(this, {
      Ok: value => Ok(g(value)),
      Err: error => Err(f(error))
    });
  };

  Result.prototype.mapError = function<A, E, F>(this: Result<A, E>, f: (e: E) => F): Result<A, F> {
    return matchResult(this, {
      Ok: value => Ok(value),
      Err: error => Err(f(error))
    });
  };

  // Add static methods
  Result.Ok = Ok;
  Result.Err = Err;

  console.log('✅ Result augmented with fluent methods');
}

/**
 * Augment ObservableLite constructor with fluent methods
 */
export function augmentObservableLiteWithFluent(): void {
  if (!ObservableLite || typeof ObservableLite !== 'function') {
    console.warn('ObservableLite constructor not available for fluent augmentation');
    return;
  }

  // ObservableLite already has fluent methods, just ensure they're properly integrated
  console.log('✅ ObservableLite already has fluent methods');
}

// ============================================================================
// Part 2: Auto-Augmentation Functions
// ============================================================================

/**
 * Augment all core ADTs with fluent methods
 */
export function augmentAllCoreADTsWithFluent(): void {
  console.log('🔄 Augmenting all core ADTs with fluent methods...');

  try {
    augmentMaybeWithFluent();
    augmentEitherWithFluent();
    augmentResultWithFluent();
    augmentObservableLiteWithFluent();

    console.log('✅ All core ADTs augmented with fluent methods');
  } catch (error) {
    console.error('❌ Failed to augment some ADTs:', error);
  }
}

// ============================================================================
// Part 3: Fluent Method Decorators
// ============================================================================

/**
 * Fluent method options
 */
export interface FluentMethodOptions {
  readonly enableMap?: boolean;
  readonly enableChain?: boolean;
  readonly enableFilter?: boolean;
  readonly enableBimap?: boolean;
  readonly enableAp?: boolean;
  readonly preservePurity?: boolean;
}

/**
 * Add fluent methods to an ADT constructor
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
    preservePurity = true
  } = options;

  // Get typeclass instances from registry
  const functor = getTypeclassInstance(adtName, 'Functor');
  const monad = getTypeclassInstance(adtName, 'Monad');
  const applicative = getTypeclassInstance(adtName, 'Applicative');
  const bifunctor = getTypeclassInstance(adtName, 'Bifunctor');

  if (!functor) {
    console.warn(`No Functor instance found for ${adtName}`);
    return Ctor as T & { __fluentMethods: true };
  }

  // Add .map method if Functor instance exists
  if (enableMap && functor) {
    Ctor.prototype.map = function<A, B>(this: any, fn: (a: A) => B): any {
      return functor.map(this, fn);
    };
  }

  // Add .chain method if Monad instance exists
  if (enableChain && monad) {
    Ctor.prototype.chain = function<A, B>(this: any, fn: (a: A) => any): any {
      return monad.chain(this, fn);
    };
  }

  // Add .filter method (implemented via chain)
  if (enableFilter && monad) {
    Ctor.prototype.filter = function<A>(this: any, predicate: (a: A) => boolean): any {
      return monad.chain(this, (value: A) => 
        predicate(value) ? this.constructor.of(value) : this.constructor.of(null)
      );
    };
  }

  // Add .bimap method if Bifunctor instance exists
  if (enableBimap && bifunctor) {
    Ctor.prototype.bimap = function<A, B, C, D>(
      this: any,
      f: (a: A) => C,
      g: (b: B) => D
    ): any {
      return bifunctor.bimap(this, f, g);
    };
  }

  // Add .ap method if Applicative instance exists
  if (enableAp && applicative) {
    Ctor.prototype.ap = function<A, B>(this: any, fab: any): any {
      return applicative.ap(fab, this);
    };
  }

  // Mark as having fluent methods
  (Ctor as any).__fluentMethods = true;

  return Ctor as T & { __fluentMethods: true };
}

// ============================================================================
// Part 4: Convenience Functions
// ============================================================================

/**
 * Create Maybe with fluent methods
 */
export function withMaybeFluentMethods(options: FluentMethodOptions = {}) {
  const MaybeWithFluent = withFluentMethods(Maybe as any, 'Maybe', options);
  return {
    Just,
    Nothing,
    Maybe: MaybeWithFluent
  };
}

/**
 * Create Either with fluent methods
 */
export function withEitherFluentMethods(options: FluentMethodOptions = {}) {
  const EitherWithFluent = withFluentMethods(Either as any, 'Either', options);
  return {
    Left,
    Right,
    Either: EitherWithFluent
  };
}

/**
 * Create Result with fluent methods
 */
export function withResultFluentMethods(options: FluentMethodOptions = {}) {
  const ResultWithFluent = withFluentMethods(Result as any, 'Result', options);
  return {
    Ok,
    Err,
    Result: ResultWithFluent
  };
}

/**
 * Create ObservableLite with fluent methods
 */
export function withObservableLiteFluentMethods(options: FluentMethodOptions = {}) {
  const ObservableLiteWithFluent = withFluentMethods(ObservableLite as any, 'ObservableLite', options);
  return ObservableLiteWithFluent;
}

// ============================================================================
// Part 5: Auto-Initialization
// ============================================================================

/**
 * Initialize the complete fluent ADT system
 */
export function initializeFluentADTSystem(): void {
  console.log('🚀 Initializing complete fluent ADT system...');

  try {
    // Import auto-registration
    const { autoRegisterAllCoreADTs } = require('./fp-auto-registration');
    
    // Auto-register all instances
    const results = autoRegisterAllCoreADTs();
    
    // Augment all ADTs with fluent methods
    augmentAllCoreADTsWithFluent();
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`✅ Fluent ADT system initialized: ${successCount}/${totalCount} ADTs registered`);
    console.log('✅ All ADTs now have fluent methods (.map, .chain, .filter, etc.)');
    
  } catch (error) {
    console.error('❌ Failed to initialize fluent ADT system:', error);
  }
}

// ============================================================================
// Part 6: Export All
// ============================================================================

export {
  // ADT augmentation
  augmentMaybeWithFluent,
  augmentEitherWithFluent,
  augmentResultWithFluent,
  augmentObservableLiteWithFluent,
  augmentAllCoreADTsWithFluent,
  
  // Fluent method decorators
  withFluentMethods,
  withMaybeFluentMethods,
  withEitherFluentMethods,
  withResultFluentMethods,
  withObservableLiteFluentMethods,
  
  // Auto-initialization
  initializeFluentADTSystem
}; 