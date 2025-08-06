/**
 * Unified Result ADT using createSumType
 * 
 * This module provides a unified Result type using the createSumType builder
 * with full integration with HKTs, purity tracking, and derivable instances.
 */

import {
  createSumType,
  SumTypeBuilder,
  ExtractSumTypeHKT,
  ExtractSumTypeInstance
} from './fp-adt-builders';

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

import { 
  deriveInstances, 
  deriveEqInstance, 
  deriveOrdInstance, 
  deriveShowInstance 
} from './fp-derivation-helpers';

// ============================================================================
// Part 1: Unified Result ADT Definition
// ============================================================================

/**
 * Create unified Result ADT with full integration
 */
export const ResultUnified = createSumType({
  Ok: <T>(value: T) => ({ value }),
  Err: <E>(error: E) => ({ error })
}, {
  name: 'Result',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false,
  derive: ['Eq', 'Ord', 'Show']
});

/**
 * Extract the HKT kind from the unified Result
 */
export type ResultUnifiedHKT = ExtractSumTypeHKT<typeof ResultUnified>;

/**
 * Extract the instance type from the unified Result
 */
export type ResultUnifiedInstance<T, E> = ExtractSumTypeInstance<typeof ResultUnified>;

/**
 * Type alias for Result<T, E> using the unified definition
 */
export type Result<T, E> = ResultUnifiedInstance<T, E>;

/**
 * HKT kind for Result (arity-2 type constructor)
 */
export interface ResultK extends Kind2 {
  readonly type: Result<this['A'], this['B']>;
}

// ============================================================================
// Part 2: Constructor Exports
// ============================================================================

/**
 * Ok constructor for Result
 */
export const Ok = <T>(value: T): Result<T, never> => {
  return ResultUnified.constructors.Ok(value) as Result<T, never>;
};

/**
 * Err constructor for Result
 */
export const Err = <E>(error: E): Result<never, E> => {
  return ResultUnified.constructors.Err(error) as Result<never, E>;
};

/**
 * Pattern matcher for Result
 */
export const matchResult = <T, E, R>(
  result: Result<T, E>,
  patterns: {
    Ok: (value: T) => R;
    Err: (error: E) => R;
  }
): R => {
  return ResultUnified.match(result as any, patterns);
};

/**
 * Curryable pattern matcher for Result
 */
export const createResultMatcher = <R>(
  patterns: {
    Ok: <T>(value: T) => R;
    Err: <E>(error: E) => R;
  }
) => (result: Result<any, any>): R => {
  return ResultUnified.match(result as any, patterns);
};

// ============================================================================
// Part 3: Utility Functions
// ============================================================================

/**
 * Check if a Result is Ok
 */
export const isOk = <T, E>(result: Result<T, E>): result is Result<T, E> & { tag: 'Ok'; value: T } => {
  return ResultUnified.isVariant(result as any, 'Ok');
};

/**
 * Check if a Result is Err
 */
export const isErr = <T, E>(result: Result<T, E>): result is Result<T, E> & { tag: 'Err'; error: E } => {
  return ResultUnified.isVariant(result as any, 'Err');
};

/**
 * Get the value from an Ok, or throw if Err
 */
export const fromOk = <T, E>(result: Result<T, E>): T => {
  return matchResult(result, {
    Ok: value => value,
    Err: error => {
      throw new Error(`fromOk: Err(${error})`);
    }
  });
};

/**
 * Get the error from an Err, or throw if Ok
 */
export const fromErr = <T, E>(result: Result<T, E>): E => {
  return matchResult(result, {
    Ok: value => {
      throw new Error(`fromErr: Ok(${value})`);
    },
    Err: error => error
  });
};

/**
 * Get the value from an Ok, or return default if Err
 */
export const fromResult = <T, E>(defaultValue: T, result: Result<T, E>): T => {
  return matchResult(result, {
    Ok: value => value,
    Err: () => defaultValue
  });
};

/**
 * Map over the Ok value of a Result
 */
export const mapResult = <T, E, U>(f: (t: T) => U, result: Result<T, E>): Result<U, E> => {
  return matchResult(result, {
    Ok: value => Ok(f(value)),
    Err: error => Err(error)
  });
};

/**
 * Map over the Err value of a Result
 */
export const mapErr = <T, E, F>(f: (e: E) => F, result: Result<T, E>): Result<T, F> => {
  return matchResult(result, {
    Ok: value => Ok(value),
    Err: error => Err(f(error))
  });
};

/**
 * Bimap over both sides of a Result
 */
export const bimapResult = <T, E, U, F>(
  f: (t: T) => U,
  g: (e: E) => F,
  result: Result<T, E>
): Result<U, F> => {
  return matchResult(result, {
    Ok: value => Ok(f(value)),
    Err: error => Err(g(error))
  });
};

/**
 * Apply a function in a Result to a value in a Result
 */
export const apResult = <T, E, U>(
  resultF: Result<(t: T) => U, E>,
  resultA: Result<T, E>
): Result<U, E> => {
  return matchResult(resultF, {
    Ok: f => mapResult(f, resultA),
    Err: error => Err(error)
  });
};

/**
 * Chain operations on Result
 */
export const chainResult = <T, E, U>(
  f: (t: T) => Result<U, E>,
  result: Result<T, E>
): Result<U, E> => {
  return matchResult(result, {
    Ok: value => f(value),
    Err: error => Err(error)
  });
};

/**
 * Fold over a Result
 */
export const foldResult = <T, E, R>(
  onOk: (t: T) => R,
  onErr: (e: E) => R,
  result: Result<T, E>
): R => {
  return matchResult(result, {
    Ok: value => onOk(value),
    Err: error => onErr(error)
  });
};

/**
 * Convert a Result to an Either
 */
export const resultToEither = <T, E>(result: Result<T, E>): Either<E, T> => {
  return matchResult(result, {
    Ok: value => Right(value),
    Err: error => Left(error)
  });
};

/**
 * Convert an Either to a Result
 */
export const eitherToResult = <T, E>(either: Either<E, T>): Result<T, E> => {
  return matchEither(either, {
    Left: error => Err(error),
    Right: value => Ok(value)
  });
};

// ============================================================================
// Part 4: Typeclass Instances (Derived)
// ============================================================================

/**
 * Result derived instances
 */
export const ResultInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  bifunctor: true,
  customMap: <T, E, U>(fa: Result<T, E>, f: (t: T) => U): Result<U, E> => 
    matchResult(fa, {
      Ok: value => Ok(f(value)),
      Err: error => Err(error)
    }),
  customChain: <T, E, U>(fa: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E> => 
    matchResult(fa, {
      Ok: value => f(value),
      Err: error => Err(error)
    }),
  customBimap: <T, E, U, F>(
    fab: Result<T, E>,
    f: (t: T) => U,
    g: (e: E) => F
  ): Result<U, F> => 
    matchResult(fab, {
      Ok: value => Ok(f(value)),
      Err: error => Err(g(error))
    })
});

export const ResultFunctor = ResultInstances.functor;
export const ResultApplicative = ResultInstances.applicative;
export const ResultMonad = ResultInstances.monad;
export const ResultBifunctor = ResultInstances.bifunctor;

/**
 * Result standard typeclass instances
 */
export const ResultEq = deriveEqInstance({
  customEq: <T, E>(a: Result<T, E>, b: Result<T, E>): boolean => {
    return matchResult(a, {
      Ok: aValue => matchResult(b, {
        Ok: bValue => aValue === bValue,
        Err: () => false
      }),
      Err: aError => matchResult(b, {
        Ok: () => false,
        Err: bError => aError === bError
      })
    });
  }
});

export const ResultOrd = deriveOrdInstance({
  customOrd: <T, E>(a: Result<T, E>, b: Result<T, E>): number => {
    return matchResult(a, {
      Ok: aValue => matchResult(b, {
        Ok: bValue => {
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        },
        Err: () => 1 // Ok > Err
      }),
      Err: aError => matchResult(b, {
        Ok: () => -1, // Err < Ok
        Err: bError => {
          if (aError < bError) return -1;
          if (aError > bError) return 1;
          return 0;
        }
      })
    });
  }
});

export const ResultShow = deriveShowInstance({
  customShow: <T, E>(a: Result<T, E>): string => 
    matchResult(a, {
      Ok: value => `Ok(${JSON.stringify(value)})`,
      Err: error => `Err(${JSON.stringify(error)})`
    })
});

/**
 * Foldable instance for Result (manual due to complexity)
 */
export const ResultFoldable: Foldable<ResultK> = {
  reduce: <T, E, B>(result: Result<T, E>, f: (b: B, t: T) => B, b: B): B => {
    return matchResult(result, {
      Ok: value => f(b, value),
      Err: () => b
    });
  },
  foldMap: <M, T, E>(M: any, result: Result<T, E>, f: (t: T) => M): M => {
    return matchResult(result, {
      Ok: value => f(value),
      Err: () => M.empty()
    });
  }
};

/**
 * Traversable instance for Result (manual due to complexity)
 */
export const ResultTraversable: Traversable<ResultK> = {
  ...ResultFunctor!,
  sequence: <T, E>(resultArray: Result<T[], E>): T[] => {
    return matchResult(resultArray, {
      Ok: value => value,
      Err: () => []
    });
  },
  traverse: <F extends Kind1, T, E, U>(
    F: Applicative<F>,
    result: Result<T, E>,
    f: (t: T) => Apply<F, [U]>
  ): Apply<F, [Result<U, E>]> => {
    return matchResult(result, {
      Ok: value => F.map(f(value), Ok),
      Err: error => F.of(Err(error))
    }) as Apply<F, [Result<U, E>]>;
  }
};

// ============================================================================
// Part 5: Purity Integration
// ============================================================================

/**
 * Result with purity information
 */
export interface ResultWithPurity<T, E, P extends EffectTag = 'Pure'> {
  readonly value: Result<T, E>;
  readonly effect: P;
  readonly __immutableBrand: unique symbol;
}

/**
 * Create Result with purity information
 */
export function createResultWithPurity<T, E, P extends EffectTag = 'Pure'>(
  value: Result<T, E>,
  effect: P = 'Pure' as P
): ResultWithPurity<T, E, P> {
  return {
    value,
    effect,
    __immutableBrand: {} as unique symbol
  };
}

/**
 * Extract effect from Result with purity
 */
export type EffectOfResult<T> = T extends ResultWithPurity<any, any, infer P> ? P : 'Pure';

/**
 * Check if Result is pure
 */
export type IsResultPure<T> = EffectOfResult<T> extends 'Pure' ? true : false;

// ============================================================================
// Part 6: HKT Integration
// ============================================================================

/**
 * Apply Result HKT to type arguments
 */
export type ApplyResult<Args extends TypeArgs> = Apply<ResultK, Args>;

/**
 * Result with specific type arguments
 */
export type ResultOf<T, E> = ApplyResult<[T, E]>;

// ============================================================================
// Part 7: Laws Documentation
// ============================================================================

/**
 * Result Laws:
 * 
 * Functor Laws:
 * 1. Identity: map(id) = id
 * 2. Composition: map(f ∘ g) = map(f) ∘ map(g)
 * 
 * Bifunctor Laws:
 * 1. Identity: bimap(id, id) = id
 * 2. Composition: bimap(f ∘ h, g ∘ i) = bimap(f, g) ∘ bimap(h, i)
 * 
 * Applicative Laws:
 * 1. Identity: ap(of(id), v) = v
 * 2. Homomorphism: ap(of(f), of(x)) = of(f(x))
 * 3. Interchange: ap(u, of(y)) = ap(of(f => f(y)), u)
 * 4. Composition: ap(ap(ap(of(compose), u), v), w) = ap(u, ap(v, w))
 * 
 * Monad Laws:
 * 1. Left Identity: of(a).chain(f) = f(a)
 * 2. Right Identity: m.chain(of) = m
 * 3. Associativity: m.chain(f).chain(g) = m.chain(x => f(x).chain(g))
 * 
 * Purity Laws:
 * 1. Effect Consistency: Result defaults to Pure effect
 * 2. Runtime Marker Law: Runtime markers match compile-time effects
 * 3. Default Purity: Result types default to Pure unless explicitly configured
 * 
 * HKT Integration Laws:
 * 1. Kind Correctness: ResultK is correctly typed as Kind2
 * 2. Apply Law: Apply<ResultK, [T, E]> works correctly
 * 3. Typeclass Law: typeclasses work with ResultK
 */ 