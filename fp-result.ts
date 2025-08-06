/**
 * Result ADT with Unified Fluent API
 * 
 * Provides a unified fluent API (.map, .chain, .filter, etc.) for Result,
 * enabling consistent operations across all FP types with seamless
 * conversion to other types.
 */

import { applyFluentOps, FluentImpl, toObservableLite, toStatefulStream, toMaybe, toEither } from './fp-fluent-api';

// ============================================================================
// Part 1: Result ADT Definition
// ============================================================================

/**
 * Result type - represents success or error
 */
export type Result<E, A> = Ok<E, A> | Err<E, A>;

/**
 * Ok constructor - represents success
 */
export class Ok<E, A> {
  readonly _tag = 'Ok' as const;
  readonly value: A;

  constructor(value: A) {
    this.value = value;
  }

  /**
   * Pattern matching for Result
   */
  match<B>(patterns: { Ok: (value: { value: A }) => B; Err: (value: { error: E }) => B }): B {
    return patterns.Ok({ value: this.value });
  }

  /**
   * Fold over Result
   */
  fold<B>(onError: (e: E) => B, onSuccess: (a: A) => B): B {
    return onSuccess(this.value);
  }

  /**
   * Check if this is an Ok
   */
  isOk(): this is Ok<E, A> {
    return true;
  }

  /**
   * Check if this is an Err
   */
  isErr(): this is Err<E, A> {
    return false;
  }

  /**
   * Get the success value or throw
   */
  getOrThrow(error?: string): A {
    return this.value;
  }

  /**
   * Get the error or throw
   */
  getErrorOrThrow(error: string = 'Expected Err but got Ok'): never {
    throw new Error(error);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Ok(${this.value})`;
  }
}

/**
 * Err constructor - represents error
 */
export class Err<E, A> {
  readonly _tag = 'Err' as const;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  /**
   * Pattern matching for Result
   */
  match<B>(patterns: { Ok: (value: { value: A }) => B; Err: (value: { error: E }) => B }): B {
    return patterns.Err({ error: this.error });
  }

  /**
   * Fold over Result
   */
  fold<B>(onError: (e: E) => B, onSuccess: (a: A) => B): B {
    return onError(this.error);
  }

  /**
   * Check if this is an Ok
   */
  isOk(): this is Ok<E, A> {
    return false;
  }

  /**
   * Check if this is an Err
   */
  isErr(): this is Err<E, A> {
    return true;
  }

  /**
   * Get the success value or throw
   */
  getOrThrow(error: string = 'Expected Ok but got Err'): never {
    throw new Error(error);
  }

  /**
   * Get the error or throw
   */
  getErrorOrThrow(error?: string): E {
    return this.error;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Err(${this.error})`;
  }
}

// ============================================================================
// Part 2: Result Constructors
// ============================================================================

/**
 * Create an Ok value
 */
export function Ok<E, A>(value: A): Ok<E, A> {
  return new Ok(value);
}

/**
 * Create an Err value
 */
export function Err<E, A>(error: E): Err<E, A> {
  return new Err(error);
}

/**
 * Create a Result from a nullable value
 */
export function fromNullable<E, A>(error: E, value: A | null | undefined): Result<E, A> {
  return value == null ? Err(error) : Ok(value);
}

/**
 * Create a Result from a predicate
 */
export function fromPredicate<E, A>(predicate: (value: A) => boolean, error: E, value: A): Result<E, A> {
  return predicate(value) ? Ok(value) : Err(error);
}

/**
 * Create a Result from a function that might throw
 */
export function tryCatch<E, A>(f: () => A, onError: (error: any) => E): Result<E, A> {
  try {
    return Ok(f());
  } catch (error) {
    return Err(onError(error));
  }
}

/**
 * Create a Result from a Promise
 */
export async function fromPromise<E, A>(promise: Promise<A>, onError: (error: any) => E): Promise<Result<E, A>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    return Err(onError(error));
  }
}

// ============================================================================
// Part 3: Result Operations
// ============================================================================

/**
 * Map over the success value of Result
 */
export function map<E, A, B>(f: (a: A) => B, result: Result<E, A>): Result<E, B> {
  return result.match({
    Ok: ({ value }) => Ok(f(value)),
    Err: ({ error }) => Err(error)
  });
}

/**
 * Map over the error of Result
 */
export function mapError<E, A, E2>(f: (e: E) => E2, result: Result<E, A>): Result<E2, A> {
  return result.match({
    Ok: ({ value }) => Ok(value),
    Err: ({ error }) => Err(f(error))
  });
}

/**
 * Bimap over both success and error of Result
 */
export function bimap<E, A, E2, B>(error: (e: E) => E2, success: (a: A) => B, result: Result<E, A>): Result<E2, B> {
  return result.match({
    Ok: ({ value }) => Ok(success(value)),
    Err: ({ error: err }) => Err(error(err))
  });
}

/**
 * Chain/flatMap over the success value of Result
 */
export function chain<E, A, B>(f: (a: A) => Result<E, B>, result: Result<E, A>): Result<E, B> {
  return result.match({
    Ok: ({ value }) => f(value),
    Err: ({ error }) => Err(error)
  });
}

/**
 * Chain over the error of Result
 */
export function chainError<E, A, E2>(f: (e: E) => Result<E2, A>, result: Result<E, A>): Result<E2, A> {
  return result.match({
    Ok: ({ value }) => Ok(value),
    Err: ({ error }) => f(error)
  });
}

/**
 * Bichain over both success and error of Result
 */
export function bichain<E, A, E2, B>(error: (e: E) => Result<E2, B>, success: (a: A) => Result<E2, B>, result: Result<E, A>): Result<E2, B> {
  return result.match({
    Ok: ({ value }) => success(value),
    Err: ({ error: err }) => error(err)
  });
}

/**
 * Filter the success value of Result
 */
export function filter<E, A>(predicate: (a: A) => boolean, error: E, result: Result<E, A>): Result<E, A> {
  return result.match({
    Ok: ({ value }) => predicate(value) ? result : Err(error),
    Err: ({ error: err }) => result
  });
}

/**
 * Swap the success and error of Result
 */
export function swap<E, A>(result: Result<E, A>): Result<A, E> {
  return result.match({
    Ok: ({ value }) => Err(value),
    Err: ({ error }) => Ok(error)
  });
}

/**
 * Get the success value or default
 */
export function getOrElse<E, A>(defaultValue: A, result: Result<E, A>): A {
  return result.match({
    Ok: ({ value }) => value,
    Err: () => defaultValue
  });
}

/**
 * Alternative Result
 */
export function orElse<E, A>(alternative: Result<E, A>, result: Result<E, A>): Result<E, A> {
  return result.match({
    Ok: () => result,
    Err: () => alternative
  });
}

/**
 * Recover from error
 */
export function recover<E, A>(f: (e: E) => A, result: Result<E, A>): Result<E, A> {
  return result.match({
    Ok: () => result,
    Err: ({ error }) => Ok(f(error))
  });
}

// ============================================================================
// Part 4: Result Typeclass Instances
// ============================================================================

/**
 * Result Functor instance
 */
export const ResultFunctorInstance = {
  map: <E, A, B>(fa: Result<E, A>, f: (a: A) => B): Result<E, B> => map(f, fa)
};

/**
 * Result Applicative instance
 */
export const ResultApplicativeInstance = {
  ...ResultFunctorInstance,
  of: <E, A>(a: A): Result<E, A> => Ok(a),
  ap: <E, A, B>(fab: Result<E, (a: A) => B>, fa: Result<E, A>): Result<E, B> => {
    return fab.match({
      Ok: ({ value: f }) => map(f, fa),
      Err: ({ error }) => Err(error)
    });
  }
};

/**
 * Result Monad instance
 */
export const ResultMonadInstance = {
  ...ResultApplicativeInstance,
  chain: <E, A, B>(fa: Result<E, A>, f: (a: A) => Result<E, B>): Result<E, B> => chain(f, fa)
};

/**
 * Result Bifunctor instance
 */
export const ResultBifunctorInstance = {
  bimap: <E, A, E2, B>(fa: Result<E, A>, error: (e: E) => E2, success: (a: A) => B): Result<E2, B> => bimap(error, success, fa)
};

// ============================================================================
// Part 5: Unified Fluent API Integration
// ============================================================================

/**
 * Apply unified fluent API to Result
 */
const ResultFluentImpl: FluentImpl<any> = {
  map: (self, f) => self.match({
    Ok: ({ value }) => Ok(f(value)),
    Err: ({ error }) => Err(error)
  }),
  chain: (self, f) => self.match({
    Ok: ({ value }) => f(value),
    Err: ({ error }) => Err(error)
  }),
  flatMap: (self, f) => self.match({
    Ok: ({ value }) => f(value),
    Err: ({ error }) => Err(error)
  }),
  filter: (self, pred) => self.match({
    Ok: ({ value }) => pred(value) ? self : Err(new Error('Filter predicate failed')),
    Err: ({ error }) => self
  }),
  filterMap: (self, f) => self.match({
    Ok: ({ value }) => f(value),
    Err: ({ error }) => Err(error)
  }),
  bimap: (self, left, right) => self.match({
    Ok: ({ value }) => Ok(right(value)),
    Err: ({ error }) => Err(left(error))
  }),
  bichain: (self, left, right) => self.match({
    Ok: ({ value }) => right(value),
    Err: ({ error }) => left(error)
  }),
  pipe: (self, ...fns) => {
    let result = self;
    for (const fn of fns) {
      result = result.map(fn);
    }
    return result;
  }
};

// Apply fluent API to Result prototype
applyFluentOps(Result.prototype, ResultFluentImpl);

// Add conversion methods
Result.prototype.toObservableLite = function() {
  return toObservableLite(this);
};

Result.prototype.toStatefulStream = function(initialState: any = {}) {
  return toStatefulStream(this, initialState);
};

Result.prototype.toMaybe = function() {
  return toMaybe(this);
};

Result.prototype.toEither = function() {
  return toEither(this);
};

// ============================================================================
// Part 6: Registration
// ============================================================================

/**
 * Register Result typeclass instances
 */
export function registerResultInstances(): void {
export const ResultEq = deriveEqInstance({ kind: ResultK });
export const ResultOrd = deriveOrdInstance({ kind: ResultK });
export const ResultShow = deriveShowInstance({ kind: ResultK });
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    registry.register('ResultFunctor', ResultFunctorInstance);
    registry.register('ResultApplicative', ResultApplicativeInstance);
    registry.register('ResultMonad', ResultMonadInstance);
    registry.register('ResultBifunctor', ResultBifunctorInstance);
  }
}

// Auto-register instances
registerResultInstances(); 
export function registerResultDerivations(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    registry.register('ResultEq', ResultEq);
    registry.register('ResultOrd', ResultOrd);
    registry.register('ResultShow', ResultShow);
  }
}
registerResultDerivations();