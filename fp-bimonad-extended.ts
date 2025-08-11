/**
 * Extended Bifunctor Monad Combinators
 * 
 * This module provides richer combinators for Bifunctor Monads (e.g., Either, TaskEither, AsyncEither, etc.)
 * that extend the basic chain/map functionality with more sophisticated error handling and pattern matching.
 * 
 * These combinators are designed to work seamlessly with the existing FP typeclass system while providing
 * enhanced ergonomics for complex error recovery scenarios.
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, TupleK, FunctionK
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

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * Type alias for a Bifunctor Monad - a type that is both a Monad and a Bifunctor
 * This represents types like Either, TaskEither, AsyncEither, etc.
 */
export type BifunctorMonad<F extends Kind2> = Monad<F> & Bifunctor<F>;

/**
 * Type alias for the result of applying a bifunctor monad
 */
export type ApplyBifunctorMonad<F extends Kind2, Args extends [Type, Type]> = Apply<F, Args>;

// ============================================================================
// Generic Typeclass-Aware Combinators
// ============================================================================

/**
 * Chain on both left and right sides of a bifunctor monad.
 * 
 * This combinator allows you to chain computations on both the left and right sides
 * of a bifunctor monad, preserving the monadic structure while providing fine-grained
 * control over error recovery.
 * 
 * @param M - The bifunctor monad instance
 * @param onLeft - Function to handle the left side (error case)
 * @param onRight - Function to handle the right side (success case)
 * @returns A function that chains on both sides of the bifunctor monad
 * 
 * @example
 * ```typescript
 * // Basic usage with Either
 * const result = bichain(
 *   EitherMonad,
 *   (error: string) => Right(`Recovered from: ${error}`),
 *   (value: number) => Right(value * 2)
 * )(Left("Something went wrong"));
 * // Result: Right("Recovered from: Something went wrong")
 * 
 * // Advanced error recovery
 * const fetchUser = (id: string): TaskEither<Error, User> => 
 *   bichain(
 *     TaskEitherMonad,
 *     (error: Error) => {
 *       if (error.message.includes('404')) {
 *         return TaskEither.of(createDefaultUser(id));
 *       }
 *       return TaskEither.left(new Error(`Recovery failed: ${error.message}`));
 *     },
 *     (user: User) => TaskEither.of(validateUser(user))
 *   );
 * ```
 */
export function bichain<F extends Kind2, L, R, L2, R2>(
  M: BifunctorMonad<F>,
  onLeft: (l: L) => ApplyBifunctorMonad<F, [L2, R2]>,
  onRight: (r: R) => ApplyBifunctorMonad<F, [L2, R2]>
): (ma: ApplyBifunctorMonad<F, [L, R]>) => ApplyBifunctorMonad<F, [L2, R2]> {
  return (ma) => {
    // Use the bifunctor's bimap to handle both sides
    const mapped = M.bimap(ma, onLeft, onRight);
    // Then chain to flatten the nested structure
    return M.chain(mapped, (result) => result);
  };
}

/**
 * Chain only on the left side, leaving the right side untouched.
 * 
 * This combinator is useful for error recovery scenarios where you want to
 * transform errors but leave successful computations unchanged.
 * 
 * @param M - The bifunctor monad instance
 * @param f - Function to handle the left side (error case)
 * @returns A function that chains only on the left side
 * 
 * @example
 * ```typescript
 * // Error recovery that preserves success cases
 * const withRetry = chainLeft(
 *   TaskEitherMonad,
 *   (error: Error) => {
 *     if (error.message.includes('timeout')) {
 *       return retryOperation();
 *     }
 *     return TaskEither.left(error);
 *   }
 * );
 * 
 * const result = withRetry(fetchData());
 * // If fetchData succeeds, result is unchanged
 * // If fetchData fails with timeout, retryOperation is called
 * ```
 */
export function chainLeft<F extends Kind2, L, R, L2>(
  M: BifunctorMonad<F>,
  f: (l: L) => ApplyBifunctorMonad<F, [L2, R]>
): (ma: ApplyBifunctorMonad<F, [L, R]>) => ApplyBifunctorMonad<F, [L2, R]> {
  return (ma) => {
    // Map the left side with the chain function, keep right side as identity
    return M.bimap(ma, f, (r: R) => M.of(r));
  };
}

/**
 * Asynchronously match both sides, returning a unified result.
 * 
 * This combinator allows you to handle both success and error cases
 * with functions that can be either synchronous or asynchronous,
 * returning a Promise with the unified result.
 * 
 * @param M - The bifunctor monad instance
 * @param onLeft - Function to handle the left side (can be sync or async)
 * @param onRight - Function to handle the right side (can be sync or async)
 * @returns A function that matches both sides and returns a Promise
 * 
 * @example
 * ```typescript
 * // HTTP fetch with error handling
 * const handleResponse = matchM(
 *   TaskEitherMonad,
 *   async (error: Error) => {
 *     console.error('Request failed:', error);
 *     return await logError(error);
 *   },
 *   async (data: UserData) => {
 *     console.log('Request succeeded:', data);
 *     return await processUserData(data);
 *   }
 * );
 * 
 * const result = await handleResponse(fetchUserData());
 * ```
 */
export function matchM<F extends Kind2, L, R, A>(
  M: BifunctorMonad<F>,
  onLeft: (l: L) => A | Promise<A>,
  onRight: (r: R) => A | Promise<A>
): (ma: ApplyBifunctorMonad<F, [L, R]>) => Promise<A> {
  return async (ma) => {
    // We need to extract the value from the bifunctor monad
    // This is a simplified implementation - in practice, you'd need
    // to handle the specific bifunctor monad's structure
    const result = await extractValue(M, ma);
    
    if (result.tag === 'Left') {
      return await onLeft(result.value);
    } else {
      return await onRight(result.value);
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper function to extract values from bifunctor monads
 * This is a simplified implementation - in practice, you'd need to handle
 * the specific structure of each bifunctor monad
 */
async function extractValue<F extends Kind2, L, R>(
  M: BifunctorMonad<F>,
  ma: ApplyBifunctorMonad<F, [L, R]>
): Promise<{ tag: 'Left'; value: L } | { tag: 'Right'; value: R }> {
  // This is a placeholder implementation
  // In practice, you'd need to implement this based on the specific
  // bifunctor monad's structure (Either, TaskEither, etc.)
  throw new Error('extractValue not implemented for generic bifunctor monad');
}

// ============================================================================
// Specialized Implementations for Common Types
// ============================================================================

// Import the specific bifunctor monad implementations
import { Either, Left, Right, matchEither } from './fp-either-unified';
import { Result, Ok, Err, matchResult } from './fp-result-unified';

/**
 * Either-specific bifunctor monad instance
 */
export const EitherBifunctorMonad: BifunctorMonad<any> = {
  // Functor
  map: <A, B>(fa: Either<any, A>, f: (a: A) => B): Either<any, B> => {
    return matchEither(fa, {
      Left: (error) => Left(error),
      Right: (value) => Right(f(value))
    });
  },
  
  // Applicative
  of: <A>(a: A): Either<any, A> => Right(a),
  ap: <A, B>(fab: Either<any, (a: A) => B>, fa: Either<any, A>): Either<any, B> => {
    return matchEither(fab, {
      Left: (error) => Left(error),
      Right: (f) => matchEither(fa, {
        Left: (error) => Left(error),
        Right: (a) => Right(f(a))
      })
    });
  },
  
  // Monad
  chain: <A, B>(fa: Either<any, A>, f: (a: A) => Either<any, B>): Either<any, B> => {
    return matchEither(fa, {
      Left: (error) => Left(error),
      Right: (value) => f(value)
    });
  },
  
  // Bifunctor
  bimap: <A, B, C, D>(
    fab: Either<A, B>,
    f: (a: A) => C,
    g: (b: B) => D
  ): Either<C, D> => {
    return matchEither(fab, {
      Left: (error) => Left(f(error)),
      Right: (value) => Right(g(value))
    });
  },
  
  mapLeft: <A, B, C>(fab: Either<A, B>, f: (a: A) => C): Either<C, B> => {
    return matchEither(fab, {
      Left: (error) => Left(f(error)),
      Right: (value) => Right(value)
    });
  },
  
  mapRight: <A, B, D>(fab: Either<A, B>, g: (b: B) => D): Either<A, D> => {
    return matchEither(fab, {
      Left: (error) => Left(error),
      Right: (value) => Right(g(value))
    });
  }
};

/**
 * Result-specific bifunctor monad instance
 */
export const ResultBifunctorMonad: BifunctorMonad<any> = {
  // Functor
  map: <A, B>(fa: Result<A, any>, f: (a: A) => B): Result<B, any> => {
    return matchResult(fa, {
      Ok: (value) => Ok(f(value)),
      Err: (error) => Err(error)
    });
  },
  
  // Applicative
  of: <A>(a: A): Result<A, any> => Ok(a),
  ap: <A, B>(fab: Result<(a: A) => B, any>, fa: Result<A, any>): Result<B, any> => {
    return matchResult(fab, {
      Ok: (f) => matchResult(fa, {
        Ok: (a) => Ok(f(a)),
        Err: (error) => Err(error)
      }),
      Err: (error) => Err(error)
    });
  },
  
  // Monad
  chain: <A, B>(fa: Result<A, any>, f: (a: A) => Result<B, any>): Result<B, any> => {
    return matchResult(fa, {
      Ok: (value) => f(value),
      Err: (error) => Err(error)
    });
  },
  
  // Bifunctor
  bimap: <A, B, C, D>(
    fab: Result<A, B>,
    f: (a: A) => C,
    g: (b: B) => D
  ): Result<C, D> => {
    return matchResult(fab, {
      Ok: (value) => Ok(f(value)),
      Err: (error) => Err(g(error))
    });
  },
  
  mapLeft: <A, B, C>(fab: Result<A, B>, f: (a: A) => C): Result<C, B> => {
    return matchResult(fab, {
      Ok: (value) => Ok(f(value)),
      Err: (error) => Err(error)
    });
  },
  
  mapRight: <A, B, D>(fab: Result<A, B>, g: (b: B) => D): Result<A, D> => {
    return matchResult(fab, {
      Ok: (value) => Ok(value),
      Err: (error) => Err(g(error))
    });
  }
};

// ============================================================================
// Specialized Combinators for Either
// ============================================================================

/**
 * Chain on both left and right sides of an Either
 */
export function bichainEither<L, R, L2, R2>(
  onLeft: (l: L) => Either<L2, R2>,
  onRight: (r: R) => Either<L2, R2>
): (ma: Either<L, R>) => Either<L2, R2> {
  return bichain(EitherBifunctorMonad, onLeft, onRight);
}

/**
 * Chain only on the left side of an Either
 */
export function chainLeftEither<L, R, L2>(
  f: (l: L) => Either<L2, R>
): (ma: Either<L, R>) => Either<L2, R> {
  return chainLeft(EitherBifunctorMonad, f);
}

/**
 * Asynchronously match both sides of an Either
 */
export function matchMEither<L, R, A>(
  onLeft: (l: L) => A | Promise<A>,
  onRight: (r: R) => A | Promise<A>
): (ma: Either<L, R>) => Promise<A> {
  return async (ma) => {
    return matchEither(ma, {
      Left: async (error) => await onLeft(error),
      Right: async (value) => await onRight(value)
    });
  };
}

// ============================================================================
// Specialized Combinators for Result
// ============================================================================

/**
 * Chain on both left and right sides of a Result
 */
export function bichainResult<T, E, T2, E2>(
  onOk: (t: T) => Result<T2, E2>,
  onErr: (e: E) => Result<T2, E2>
): (ma: Result<T, E>) => Result<T2, E2> {
  return bichain(ResultBifunctorMonad, onErr, onOk);
}

/**
 * Chain only on the error side of a Result
 */
export function chainErrResult<T, E, E2>(
  f: (e: E) => Result<T, E2>
): (ma: Result<T, E>) => Result<T, E2> {
  return chainLeft(ResultBifunctorMonad, f);
}

/**
 * Asynchronously match both sides of a Result
 */
export function matchMResult<T, E, A>(
  onOk: (t: T) => A | Promise<A>,
  onErr: (e: E) => A | Promise<A>
): (ma: Result<T, E>) => Promise<A> {
  return async (ma) => {
    return matchResult(ma, {
      Ok: async (value) => await onOk(value),
      Err: async (error) => await onErr(error)
    });
  };
}

// ============================================================================
// TaskEither Implementation (Async Either)
// ============================================================================

/**
 * TaskEither type - an Either that wraps an async computation
 */
export type TaskEither<L, R> = () => Promise<Either<L, R>>;

/**
 * TaskEither constructor for Left
 */
export const TaskEitherLeft = <L, R>(l: L): TaskEither<L, R> => 
  async () => Left(l);

/**
 * TaskEither constructor for Right
 */
export const TaskEitherRight = <L, R>(r: R): TaskEither<L, R> => 
  async () => Right(r);

/**
 * TaskEither bifunctor monad instance
 */
export const TaskEitherBifunctorMonad: BifunctorMonad<any> = {
  // Functor
  map: <A, B>(fa: TaskEither<any, A>, f: (a: A) => B): TaskEither<any, B> => {
    return async () => {
      const result = await fa();
      return matchEither(result, {
        Left: (error) => Left(error),
        Right: (value) => Right(f(value))
      });
    };
  },
  
  // Applicative
  of: <A>(a: A): TaskEither<any, A> => async () => Right(a),
  ap: <A, B>(fab: TaskEither<any, (a: A) => B>, fa: TaskEither<any, A>): TaskEither<any, B> => {
    return async () => {
      const [fResult, aResult] = await Promise.all([fab(), fa()]);
      return matchEither(fResult, {
        Left: (error) => Left(error),
        Right: (f) => matchEither(aResult, {
          Left: (error) => Left(error),
          Right: (a) => Right(f(a))
        })
      });
    };
  },
  
  // Monad
  chain: <A, B>(fa: TaskEither<any, A>, f: (a: A) => TaskEither<any, B>): TaskEither<any, B> => {
    return async () => {
      const result = await fa();
      return matchEither(result, {
        Left: (error) => Left(error),
        Right: (value) => await f(value)()
      });
    };
  },
  
  // Bifunctor
  bimap: <A, B, C, D>(
    fab: TaskEither<A, B>,
    f: (a: A) => C,
    g: (b: B) => D
  ): TaskEither<C, D> => {
    return async () => {
      const result = await fab();
      return matchEither(result, {
        Left: (error) => Left(f(error)),
        Right: (value) => Right(g(value))
      });
    };
  },
  
  mapLeft: <A, B, C>(fab: TaskEither<A, B>, f: (a: A) => C): TaskEither<C, B> => {
    return async () => {
      const result = await fab();
      return matchEither(result, {
        Left: (error) => Left(f(error)),
        Right: (value) => Right(value)
      });
    };
  },
  
  mapRight: <A, B, D>(fab: TaskEither<A, B>, g: (b: B) => D): TaskEither<A, D> => {
    return async () => {
      const result = await fab();
      return matchEither(result, {
        Left: (error) => Left(error),
        Right: (value) => Right(g(value))
      });
    };
  }
};

// ============================================================================
// Specialized Combinators for TaskEither
// ============================================================================

/**
 * Chain on both left and right sides of a TaskEither
 */
export function bichainTaskEither<L, R, L2, R2>(
  onLeft: (l: L) => TaskEither<L2, R2>,
  onRight: (r: R) => TaskEither<L2, R2>
): (ma: TaskEither<L, R>) => TaskEither<L2, R2> {
  return bichain(TaskEitherBifunctorMonad, onLeft, onRight);
}

/**
 * Chain only on the left side of a TaskEither
 */
export function chainLeftTaskEither<L, R, L2>(
  f: (l: L) => TaskEither<L2, R>
): (ma: TaskEither<L, R>) => TaskEither<L2, R> {
  return chainLeft(TaskEitherBifunctorMonad, f);
}

/**
 * Asynchronously match both sides of a TaskEither
 */
export function matchMTaskEither<L, R, A>(
  onLeft: (l: L) => A | Promise<A>,
  onRight: (r: R) => A | Promise<A>
): (ma: TaskEither<L, R>) => Promise<A> {
  return async (ma) => {
    const result = await ma();
    return matchEither(result, {
      Left: async (error) => await onLeft(error),
      Right: async (value) => await onRight(value)
    });
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a synchronous Either to a TaskEither
 */
export function eitherToTaskEither<L, R>(either: Either<L, R>): TaskEither<L, R> {
  return async () => either;
}

/**
 * Convert a TaskEither to a Promise that resolves to an Either
 */
export function taskEitherToPromise<L, R>(taskEither: TaskEither<L, R>): Promise<Either<L, R>> {
  return taskEither();
}

/**
 * Create a TaskEither from a Promise that might reject
 */
export function promiseToTaskEither<L, R>(
  promise: Promise<R>,
  errorHandler: (error: any) => L
): TaskEither<L, R> {
  return async () => {
    try {
      const result = await promise;
      return Right(result);
    } catch (error) {
      return Left(errorHandler(error));
    }
  };
}

// ============================================================================
// Purity Integration
// ============================================================================

/**
 * Create a TaskEither with purity tracking
 */
export function createTaskEitherWithPurity<L, R, P extends EffectTag = 'Async'>(
  taskEither: TaskEither<L, R>,
  effect: P = 'Async' as P
): TaskEither<L, R> & { readonly effect: P } {
  return Object.assign(taskEither, { effect });
}

/**
 * Extract the effect type from a TaskEither
 */
export type EffectOfTaskEither<T> = T extends TaskEither<any, any> & { readonly effect: infer P } 
  ? P 
  : 'Async';

/**
 * Check if a TaskEither is pure (synchronous)
 */
export type IsTaskEitherPure<T> = EffectOfTaskEither<T> extends 'Pure' ? true : false; 