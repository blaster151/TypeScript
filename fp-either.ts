/**
 * Either ADT with Unified Fluent API
 * 
 * Provides a unified fluent API (.map, .chain, .filter, etc.) for Either,
 * enabling consistent operations across all FP types with seamless
 * conversion to other types.
 */

import { applyFluentOps, FluentImpl, toObservableLite, toStatefulStream, toMaybe, toResult } from './fp-fluent-api';

// ============================================================================
// Part 1: Either ADT Definition
// ============================================================================

/**
 * Either type - represents success or failure
 */
export type Either<L, R> = Left<L, R> | Right<L, R>;

/**
 * Left constructor - represents failure/error
 */
export class Left<L, R> {
  readonly _tag = 'Left' as const;
  readonly value: L;

  constructor(value: L) {
    this.value = value;
  }

  /**
   * Pattern matching for Either
   */
  match<B>(patterns: { Left: (value: { value: L }) => B; Right: (value: { value: R }) => B }): B {
    return patterns.Left({ value: this.value });
  }

  /**
   * Fold over Either
   */
  fold<B>(onLeft: (l: L) => B, onRight: (r: R) => B): B {
    return onLeft(this.value);
  }

  /**
   * Check if this is a Left
   */
  isLeft(): this is Left<L, R> {
    return true;
  }

  /**
   * Check if this is a Right
   */
  isRight(): this is Right<L, R> {
    return false;
  }

  /**
   * Get the left value or throw
   */
  getLeftOrThrow(error?: string): L {
    return this.value;
  }

  /**
   * Get the right value or throw
   */
  getRightOrThrow(error: string = 'Expected Right but got Left'): never {
    throw new Error(error);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Left(${this.value})`;
  }
}

/**
 * Right constructor - represents success/value
 */
export class Right<L, R> {
  readonly _tag = 'Right' as const;
  readonly value: R;

  constructor(value: R) {
    this.value = value;
  }

  /**
   * Pattern matching for Either
   */
  match<B>(patterns: { Left: (value: { value: L }) => B; Right: (value: { value: R }) => B }): B {
    return patterns.Right({ value: this.value });
  }

  /**
   * Fold over Either
   */
  fold<B>(onLeft: (l: L) => B, onRight: (r: R) => B): B {
    return onRight(this.value);
  }

  /**
   * Check if this is a Left
   */
  isLeft(): this is Left<L, R> {
    return false;
  }

  /**
   * Check if this is a Right
   */
  isRight(): this is Right<L, R> {
    return true;
  }

  /**
   * Get the left value or throw
   */
  getLeftOrThrow(error: string = 'Expected Left but got Right'): never {
    throw new Error(error);
  }

  /**
   * Get the right value or throw
   */
  getRightOrThrow(error?: string): R {
    return this.value;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Right(${this.value})`;
  }
}

// ============================================================================
// Part 2: Either Constructors
// ============================================================================

/**
 * Create a Left value
 */
export function Left<L, R>(value: L): Left<L, R> {
  return new Left(value);
}

/**
 * Create a Right value
 */
export function Right<L, R>(value: R): Right<L, R> {
  return new Right(value);
}

/**
 * Create an Either from a nullable value
 */
export function fromNullable<L, R>(error: L, value: R | null | undefined): Either<L, R> {
  return value == null ? Left(error) : Right(value);
}

/**
 * Create an Either from a predicate
 */
export function fromPredicate<L, R>(predicate: (value: R) => boolean, error: L, value: R): Either<L, R> {
  return predicate(value) ? Right(value) : Left(error);
}

/**
 * Create an Either from a function that might throw
 */
export function tryCatch<L, R>(f: () => R, onError: (error: any) => L): Either<L, R> {
  try {
    return Right(f());
  } catch (error) {
    return Left(onError(error));
  }
}

// ============================================================================
// Part 3: Either Operations
// ============================================================================

/**
 * Map over the right side of Either
 */
export function map<L, R, B>(f: (r: R) => B, either: Either<L, R>): Either<L, B> {
  return either.match({
    Left: ({ value }) => Left(value),
    Right: ({ value }) => Right(f(value))
  });
}

/**
 * Map over the left side of Either
 */
export function mapLeft<L, R, L2>(f: (l: L) => L2, either: Either<L, R>): Either<L2, R> {
  return either.match({
    Left: ({ value }) => Left(f(value)),
    Right: ({ value }) => Right(value)
  });
}

/**
 * Bimap over both sides of Either
 */
export function bimap<L, R, L2, R2>(left: (l: L) => L2, right: (r: R) => R2, either: Either<L, R>): Either<L2, R2> {
  return either.match({
    Left: ({ value }) => Left(left(value)),
    Right: ({ value }) => Right(right(value))
  });
}

/**
 * Chain/flatMap over the right side of Either
 */
export function chain<L, R, B>(f: (r: R) => Either<L, B>, either: Either<L, R>): Either<L, B> {
  return either.match({
    Left: ({ value }) => Left(value),
    Right: ({ value }) => f(value)
  });
}

/**
 * Chain over the left side of Either
 */
export function chainLeft<L, R, L2>(f: (l: L) => Either<L2, R>, either: Either<L, R>): Either<L2, R> {
  return either.match({
    Left: ({ value }) => f(value),
    Right: ({ value }) => Right(value)
  });
}

/**
 * Bichain over both sides of Either
 */
export function bichain<L, R, L2, R2>(left: (l: L) => Either<L2, R2>, right: (r: R) => Either<L2, R2>, either: Either<L, R>): Either<L2, R2> {
  return either.match({
    Left: ({ value }) => left(value),
    Right: ({ value }) => right(value)
  });
}

/**
 * Filter the right side of Either
 */
export function filter<L, R>(predicate: (r: R) => boolean, error: L, either: Either<L, R>): Either<L, R> {
  return either.match({
    Left: ({ value }) => either,
    Right: ({ value }) => predicate(value) ? either : Left(error)
  });
}

/**
 * Swap the sides of Either
 */
export function swap<L, R>(either: Either<L, R>): Either<R, L> {
  return either.match({
    Left: ({ value }) => Right(value),
    Right: ({ value }) => Left(value)
  });
}

/**
 * Get the right value or default
 */
export function getOrElse<L, R>(defaultValue: R, either: Either<L, R>): R {
  return either.match({
    Left: () => defaultValue,
    Right: ({ value }) => value
  });
}

/**
 * Alternative Either
 */
export function orElse<L, R>(alternative: Either<L, R>, either: Either<L, R>): Either<L, R> {
  return either.match({
    Left: () => alternative,
    Right: () => either
  });
}

// ============================================================================
// Part 4: Either Typeclass Instances
// ============================================================================

/**
 * Either Functor instance
 */
export const EitherFunctorInstance = {
  map: <L, R, B>(fa: Either<L, R>, f: (r: R) => B): Either<L, B> => map(f, fa)
};

/**
 * Either Applicative instance
 */
export const EitherApplicativeInstance = {
  ...EitherFunctorInstance,
  of: <L, R>(a: R): Either<L, R> => Right(a),
  ap: <L, R, B>(fab: Either<L, (r: R) => B>, fa: Either<L, R>): Either<L, B> => {
    return fab.match({
      Left: ({ value }) => Left(value),
      Right: ({ value: f }) => map(f, fa)
    });
  }
};

/**
 * Either Monad instance
 */
export const EitherMonadInstance = {
  ...EitherApplicativeInstance,
  chain: <L, R, B>(fa: Either<L, R>, f: (r: R) => Either<L, B>): Either<L, B> => chain(f, fa)
};

/**
 * Either Bifunctor instance
 */
export const EitherBifunctorInstance = {
  bimap: <L, R, L2, R2>(fa: Either<L, R>, left: (l: L) => L2, right: (r: R) => R2): Either<L2, R2> => bimap(left, right, fa)
};

// ============================================================================
// Part 5: Unified Fluent API Integration
// ============================================================================

/**
 * Apply unified fluent API to Either
 */
const EitherFluentImpl: FluentImpl<any> = {
  map: (self, f) => self.match({
    Left: ({ value }) => Left(value),
    Right: ({ value }) => Right(f(value))
  }),
  chain: (self, f) => self.match({
    Left: ({ value }) => Left(value),
    Right: ({ value }) => f(value)
  }),
  flatMap: (self, f) => self.match({
    Left: ({ value }) => Left(value),
    Right: ({ value }) => f(value)
  }),
  filter: (self, pred) => self.match({
    Left: ({ value }) => self,
    Right: ({ value }) => pred(value) ? self : Left(new Error('Filter predicate failed'))
  }),
  filterMap: (self, f) => self.match({
    Left: ({ value }) => self,
    Right: ({ value }) => f(value)
  }),
  bimap: (self, left, right) => self.match({
    Left: ({ value }) => Left(left(value)),
    Right: ({ value }) => Right(right(value))
  }),
  bichain: (self, left, right) => self.match({
    Left: ({ value }) => left(value),
    Right: ({ value }) => right(value)
  }),
  pipe: (self, ...fns) => {
    let result = self;
    for (const fn of fns) {
      result = result.map(fn);
    }
    return result;
  }
};

// Apply fluent API to Either prototype
applyFluentOps(Either.prototype, EitherFluentImpl);

// Add conversion methods
Either.prototype.toObservableLite = function() {
  return toObservableLite(this);
};

Either.prototype.toStatefulStream = function(initialState: any = {}) {
  return toStatefulStream(this, initialState);
};

Either.prototype.toMaybe = function() {
  return toMaybe(this);
};

Either.prototype.toResult = function() {
  return toResult(this);
};

// ============================================================================
// Part 6: Registration
// ============================================================================

/**
 * Register Either typeclass instances
 */
export function registerEitherInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    registry.register('EitherFunctor', EitherFunctorInstance);
    registry.register('EitherApplicative', EitherApplicativeInstance);
    registry.register('EitherMonad', EitherMonadInstance);
    registry.register('EitherBifunctor', EitherBifunctorInstance);
  }
}

// Auto-register instances
registerEitherInstances(); 