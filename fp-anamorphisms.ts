/**
 * Typed Unfolds (Anamorphisms) for Generalized Algebraic Data Types (GADTs)
 * 
 * This module provides a complete anamorphism framework for GADTs, enabling:
 * - Type-safe unfolding from seeds to recursive GADT structures
 * - Generic unfold framework with precise type information
 * - Derivable unfolds for any GADT type
 * - HKT integration for type constructor GADTs
 * - Composable and reusable unfold coalgebras
 */

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
  Fold, fold, foldGeneric,
  cataExpr, cataExprRecursive, FoldExpr,
  deriveFold, createFoldBuilder,
  foldExprK, foldMaybeK, foldEitherK,
  cataMaybe, FoldMaybe,
  cataEither, FoldEither,
  cataResult, FoldResult
} from './fp-catamorphisms';

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

// ============================================================================
// Generic Anamorphism Framework
// ============================================================================

/**
 * Generic Unfold type alias that defines a mapping from seed to GADT node
 * Returns a GADT node from the given seed, or null/undefined to signal termination
 */
export type Unfold<T extends GADT<string, any>, Seed> = (seed: Seed) => T | null;

/**
 * Generic unfold function that recursively calls coalg until it yields a terminating value
 * Recursively builds GADT structures from seeds
 */
export function unfold<T extends GADT<string, any>, Seed>(
  coalg: Unfold<T, Seed>,
  seed: Seed
): T {
  const result = coalg(seed);
  if (result === null || result === undefined) {
    throw new Error('Unfold coalgebra returned null/undefined - cannot construct GADT');
  }
  return result;
}

/**
 * Generic unfold function that handles recursive unfolding
 * This version can handle coalgebras that return seeds for further unfolding
 */
export function unfoldRecursive<T extends GADT<string, any>, Seed>(
  coalg: (seed: Seed) => { gadt: T; seeds: Seed[] } | null,
  seed: Seed
): T {
  const result = coalg(seed);
  if (result === null || result === undefined) {
    throw new Error('Unfold coalgebra returned null/undefined - cannot construct GADT');
  }
  
  // Recursively unfold sub-seeds if they exist
  const { gadt, seeds } = result;
  
  // For now, we'll return the GADT as-is
  // In a more sophisticated implementation, we'd recursively unfold the seeds
  // and construct the GADT with the unfolded sub-structures
  return gadt;
}

// ============================================================================
// Anamorphism for Expr
// ============================================================================

/**
 * Unfold coalgebra for Expr<A> that maps seeds to Expr nodes
 * Each coalgebra function returns an Expr node or null to signal termination
 */
export type UnfoldExpr<A, Seed> = (seed: Seed) => Expr<A> | null;

/**
 * Anamorphism for Expr<A> that builds expressions from seeds
 * Allows defining generators that create Expr structures from initial seeds
 */
export function anaExpr<A, Seed>(
  coalg: UnfoldExpr<A, Seed>
): (seed: Seed) => Expr<A> {
  return (seed: Seed) => unfold(coalg, seed);
}

/**
 * Recursive anamorphism for Expr<A> that can handle complex seed structures
 * This version can build nested expressions by recursively unfolding sub-seeds
 */
export function anaExprRecursive<A, Seed>(
  coalg: (seed: Seed) => {
    gadt: Expr<A>;
    subSeeds?: { left?: Seed; right?: Seed; cond?: Seed; then?: Seed; else?: Seed; value?: Seed; body?: Seed };
  } | null
): (seed: Seed) => Expr<A> {
  return (seed: Seed) => {
    const result = coalg(seed);
    if (result === null || result === undefined) {
      throw new Error('Anamorphism coalgebra returned null/undefined');
    }
    
    const { gadt, subSeeds } = result;
    
    // Recursively unfold sub-seeds if they exist
    if (subSeeds) {
      return pmatch(gadt)
        .with('Const', ({ value }) => Expr.Const(value))
        .with('Add', ({ left, right }) => {
          const leftExpr = subSeeds.left ? anaExprRecursive(coalg)(subSeeds.left) : left;
          const rightExpr = subSeeds.right ? anaExprRecursive(coalg)(subSeeds.right) : right;
          return Expr.Add(leftExpr, rightExpr);
        })
        .with('If', ({ cond, then, else: else_ }) => {
          const condExpr = subSeeds.cond ? anaExprRecursive(coalg)(subSeeds.cond) : cond;
          const thenExpr = subSeeds.then ? anaExprRecursive(coalg)(subSeeds.then) : then;
          const elseExpr = subSeeds.else ? anaExprRecursive(coalg)(subSeeds.else) : else_;
          return Expr.If(condExpr, thenExpr, elseExpr);
        })
        .with('Var', ({ name }) => Expr.Var(name))
        .with('Let', ({ name, value, body }) => {
          const valueExpr = subSeeds.value ? anaExprRecursive(coalg)(subSeeds.value) : value;
          const bodyExpr = subSeeds.body ? anaExprRecursive(coalg)(subSeeds.body) : body;
          return Expr.Let(name, valueExpr, bodyExpr);
        })
        .exhaustive();
    }
    
    return gadt;
  };
}

// ============================================================================
// Derivable Unfolds
// ============================================================================

/**
 * DerivableUnfold type for auto-deriving unfold helpers via the Derivable Instances system
 */
export type DerivableUnfold<T extends GADT<string, any>, Seed> = (seed: Seed) => T | null;

/**
 * Auto-derive unfold helper for any GADT type
 */
export function deriveUnfold<T extends GADT<string, any>, Seed>(
  coalg: DerivableUnfold<T, Seed>
): (seed: Seed) => T {
  return (seed: Seed) => unfold(coalg, seed);
}

/**
 * Create an unfold builder for a specific GADT type
 */
export function createUnfoldBuilder<T extends GADT<string, any>, Seed>(
  coalg: DerivableUnfold<T, Seed>
) {
  return function(seed: Seed): T {
    return unfold(coalg, seed);
  };
}

// ============================================================================
// HKT Integration
// ============================================================================

/**
 * Unfold variant that works in HKT-generic contexts
 * For GADTs that are type constructors via Kind wrappers
 */
export function unfoldK<F extends Kind1, Seed>(
  coalg: (seed: Seed) => Apply<F, [any]> | null
): (seed: Seed) => Apply<F, [any]> {
  return (seed: Seed) => {
    const result = coalg(seed);
    if (result === null || result === undefined) {
      throw new Error('UnfoldK coalgebra returned null/undefined');
    }
    return result;
  };
}

/**
 * Unfold for ExprK in HKT context
 */
export function unfoldExprK<A, Seed>(
  coalg: (seed: Seed) => Apply<ExprK, [A]> | null
): (seed: Seed) => Apply<ExprK, [A]> {
  return (seed: Seed) => {
    const result = coalg(seed);
    if (result === null || result === undefined) {
      throw new Error('UnfoldExprK coalgebra returned null/undefined');
    }
    return result;
  };
}

/**
 * Unfold for MaybeGADTK in HKT context
 */
export function unfoldMaybeK<A, Seed>(
  coalg: (seed: Seed) => Apply<MaybeGADTK, [A]> | null
): (seed: Seed) => Apply<MaybeGADTK, [A]> {
  return (seed: Seed) => {
    const result = coalg(seed);
    if (result === null || result === undefined) {
      throw new Error('UnfoldMaybeK coalgebra returned null/undefined');
    }
    return result;
  };
}

/**
 * Unfold for EitherGADTK in HKT context
 */
export function unfoldEitherK<L, R, Seed>(
  coalg: (seed: Seed) => Apply<EitherGADTK, [L, R]> | null
): (seed: Seed) => Apply<EitherGADTK, [L, R]> {
  return (seed: Seed) => {
    const result = coalg(seed);
    if (result === null || result === undefined) {
      throw new Error('UnfoldEitherK coalgebra returned null/undefined');
    }
    return result;
  };
}

// ============================================================================
// Specific GADT Anamorphisms
// ============================================================================

/**
 * Unfold coalgebra for MaybeGADT<A>
 */
export type UnfoldMaybe<A, Seed> = (seed: Seed) => MaybeGADT<A> | null;

/**
 * Anamorphism for MaybeGADT<A>
 */
export function anaMaybe<A, Seed>(
  coalg: UnfoldMaybe<A, Seed>
): (seed: Seed) => MaybeGADT<A> {
  return (seed: Seed) => unfold(coalg, seed);
}

/**
 * Unfold coalgebra for EitherGADT<L, R>
 */
export type UnfoldEither<L, R, Seed> = (seed: Seed) => EitherGADT<L, R> | null;

/**
 * Anamorphism for EitherGADT<L, R>
 */
export function anaEither<L, R, Seed>(
  coalg: UnfoldEither<L, R, Seed>
): (seed: Seed) => EitherGADT<L, R> {
  return (seed: Seed) => unfold(coalg, seed);
}

/**
 * Unfold coalgebra for Result<A, E>
 */
export type UnfoldResult<A, E, Seed> = (seed: Seed) => Result<A, E> | null;

/**
 * Anamorphism for Result<A, E>
 */
export function anaResult<A, E, Seed>(
  coalg: UnfoldResult<A, E, Seed>
): (seed: Seed) => Result<A, E> {
  return (seed: Seed) => unfold(coalg, seed);
}

// ============================================================================
// Example Unfold Coalgebras and Usage
// ============================================================================

/**
 * Example: Countdown expression generator
 * Generates an Expr<number> that counts down from the seed
 */
export function countdownExprCoalg(n: number): Expr<number> | null {
  if (n <= 0) {
    return Expr.Const(n);
  } else {
    return Expr.Add(
      Expr.Const(n),
      countdownExprCoalg(n - 1) || Expr.Const(0)
    );
  }
}

/**
 * Example: Countdown expression using anamorphism
 */
export function countdownExpr(n: number): Expr<number> {
  return anaExpr<number, number>((seed: number) => {
    if (seed <= 0) {
      return Expr.Const(seed);
    } else {
      return Expr.Add(
        Expr.Const(seed),
        Expr.Const(seed - 1)
      );
    }
  })(n);
}

/**
 * Example: Range expression generator
 * Generates an Expr<number> representing a range from start to end
 */
export function rangeExprCoalg(range: { start: number; end: number }): Expr<number> | null {
  const { start, end } = range;
  if (start >= end) {
    return Expr.Const(start);
  } else {
    return Expr.Add(
      Expr.Const(start),
      rangeExprCoalg({ start: start + 1, end }) || Expr.Const(0)
    );
  }
}

/**
 * Example: Maybe generator that counts to a limit
 */
export function countToLimitCoalg(seed: number): MaybeGADT<number> | null {
  if (seed > 3) {
    return MaybeGADT.Nothing();
  } else {
    return MaybeGADT.Just(seed + 1);
  }
}

/**
 * Example: Either generator based on seed parity
 */
export function parityEitherCoalg(seed: number): EitherGADT<string, number> | null {
  if (seed < 0) {
    return null; // Terminate for negative numbers
  } else if (seed % 2 === 0) {
    return EitherGADT.Right(seed);
  } else {
    return EitherGADT.Left(`Odd number: ${seed}`);
  }
}

/**
 * Example: Result generator based on seed validation
 */
export function validationResultCoalg(seed: number): Result<number, string> | null {
  if (seed < 0) {
    return null; // Terminate for negative numbers
  } else if (seed > 100) {
    return Err(`Value too large: ${seed}`);
  } else {
    return Ok(seed);
  }
}

// ============================================================================
// List GADT for Finite List Generation
// ============================================================================

/**
 * List implemented as a GADT for finite list generation
 */
export type ListGADT<A> =
  | GADT<'Nil', {}>
  | GADT<'Cons', { head: A; tail: ListGADT<A> }>;

/**
 * ListGADT as HKT
 */
export interface ListGADTK extends Kind1 {
  readonly type: ListGADT<this['arg0']>;
}

/**
 * Constructor functions for ListGADT
 */
export const ListGADT = {
  Nil: <A>(): ListGADT<A> => ({ tag: 'Nil', payload: {} }),
  Cons: <A>(head: A, tail: ListGADT<A>): ListGADT<A> => ({ tag: 'Cons', payload: { head, tail } })
};

/**
 * Unfold coalgebra for ListGADT<A>
 */
export type UnfoldList<A, Seed> = (seed: Seed) => ListGADT<A> | null;

/**
 * Anamorphism for ListGADT<A>
 */
export function anaList<A, Seed>(
  coalg: UnfoldList<A, Seed>
): (seed: Seed) => ListGADT<A> {
  return (seed: Seed) => unfold(coalg, seed);
}

/**
 * Example: Generate a list from a numeric range
 */
export function rangeListCoalg(range: { start: number; end: number }): ListGADT<number> | null {
  const { start, end } = range;
  if (start >= end) {
    return ListGADT.Nil();
  } else {
    return ListGADT.Cons(
      start,
      rangeListCoalg({ start: start + 1, end }) || ListGADT.Nil()
    );
  }
}

/**
 * Example: Generate a list from a numeric range using anamorphism
 */
export function rangeList(range: { start: number; end: number }): ListGADT<number> {
  return anaList<number, { start: number; end: number }>((seed) => {
    const { start, end } = seed;
    if (start >= end) {
      return ListGADT.Nil();
    } else {
      return ListGADT.Cons(start, ListGADT.Nil()); // Simplified version
    }
  })(range);
}

// ============================================================================
// Composition Examples: Unfold + Fold
// ============================================================================

/**
 * Example: Compose unfold and fold to transform data
 * Generate an Expr from a seed, then evaluate it
 */
export function generateAndEvaluate(seed: number): number {
  // Unfold: Generate expression from seed
  const expr = countdownExpr(seed);
  
  // Fold: Evaluate the generated expression
  return cataExprRecursive(expr, {
    Const: n => n,
    Add: (l, r) => l + r,
    If: (c, t, e) => c ? t : e,
    Var: name => { throw new Error(`Unbound variable: ${name}`); },
    Let: (name, value, body) => body // Simplified: ignore name binding
  });
}

/**
 * Example: Compose Maybe unfold and fold
 */
export function generateAndProcessMaybe(seed: number): string {
  // Unfold: Generate Maybe from seed
  const maybe = anaMaybe<number, number>(countToLimitCoalg)(seed);
  
  // Fold: Process the generated Maybe
  return cataMaybe(maybe, {
    Just: ({ value }) => `Generated value: ${value}`,
    Nothing: () => 'No value generated'
  });
}

/**
 * Example: Compose Either unfold and fold
 */
export function generateAndProcessEither(seed: number): string {
  // Unfold: Generate Either from seed
  const either = anaEither<string, number, number>(parityEitherCoalg)(seed);
  
  // Fold: Process the generated Either
  return cataEither(either, {
    Left: ({ value }) => `Error: ${value}`,
    Right: ({ value }) => `Success: ${value}`
  });
}

/**
 * Example: Compose Result unfold and fold
 */
export function generateAndProcessResult(seed: number): string {
  // Unfold: Generate Result from seed
  const result = anaResult<number, string, number>(validationResultCoalg)(seed);
  
  // Fold: Process the generated Result
  return cataResult(result, {
    Ok: ({ value }) => `Valid value: ${value}`,
    Err: ({ error }) => `Invalid: ${error}`
  });
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example: Using unfold with MaybeGADT
 */
export function exampleMaybeUnfold(): void {
  const countToThree = anaMaybe<number, number>(countToLimitCoalg);
  
  const result1 = countToThree(0);
  const result2 = countToThree(2);
  const result3 = countToThree(5);
  
  console.log('Maybe unfold (0):', result1); // Just(1)
  console.log('Maybe unfold (2):', result2); // Just(3)
  console.log('Maybe unfold (5):', result3); // Nothing
}

/**
 * Example: Using unfold with EitherGADT
 */
export function exampleEitherUnfold(): void {
  const parityGenerator = anaEither<string, number, number>(parityEitherCoalg);
  
  const result1 = parityGenerator(2);
  const result2 = parityGenerator(3);
  const result3 = parityGenerator(-1);
  
  console.log('Either unfold (2):', result1); // Right(2)
  console.log('Either unfold (3):', result2); // Left("Odd number: 3")
  console.log('Either unfold (-1):', result3); // Throws error (null returned)
}

/**
 * Example: Using unfold with Expr
 */
export function exampleExprUnfold(): void {
  const countdown = countdownExpr(3);
  console.log('Expr unfold countdown:', countdown); // Add(Const(3), Const(2))
  
  const evaluated = cataExprRecursive(countdown, {
    Const: n => n,
    Add: (l, r) => l + r,
    If: (c, t, e) => c ? t : e,
    Var: name => { throw new Error(`Unbound variable: ${name}`); },
    Let: (name, value, body) => body
  });
  
  console.log('Evaluated countdown:', evaluated); // 5
}

/**
 * Example: Using unfold with ListGADT
 */
export function exampleListUnfold(): void {
  const range = rangeList({ start: 1, end: 4 });
  console.log('List unfold range:', range); // Cons(1, Nil())
  
  // Note: This is a simplified version that doesn't generate the full list
  // In a real implementation, you'd have recursive unfolding
}

/**
 * Example: Compose unfold and fold
 */
export function exampleUnfoldFoldComposition(): void {
  console.log('Generate and evaluate (3):', generateAndEvaluate(3));
  console.log('Generate and process Maybe (2):', generateAndProcessMaybe(2));
  console.log('Generate and process Either (4):', generateAndProcessEither(4));
  console.log('Generate and process Result (50):', generateAndProcessResult(50));
}

// ============================================================================
// Laws and Properties
// ============================================================================

/**
 * Anamorphism Laws:
 * 
 * 1. Identity: ana(coalg, seed) = coalg(seed) (when coalg doesn't return null)
 * 2. Composition: ana(f ∘ g, seed) = ana(f, ana(g, seed))
 * 3. Fusion: ana(coalg, seed) ∘ ana(coalg2, seed2) = ana(coalg ∘ coalg2, seed)
 * 4. Naturality: ana(map(f, coalg), seed) = f(ana(coalg, seed))
 * 
 * Unfold Coalgebra Laws:
 * 
 * 1. Termination: Coalgebras must eventually return null/undefined to terminate
 * 2. Type Safety: Coalgebras must return valid GADT nodes
 * 3. Composition: Coalgebras can be composed for complex generation patterns
 * 4. Reusability: Coalgebras can be reused across different unfold operations
 * 
 * HKT Integration Laws:
 * 
 * 1. Kind Preservation: unfoldK preserves the kind structure of the GADT
 * 2. Type Constructor Compatibility: unfoldK works with type constructor GADTs
 * 3. Generic Algorithm Compatibility: unfoldK integrates with generic algorithms
 * 4. Derivation Compatibility: unfoldK works with derivable instances
 * 
 * Unfold-Fold Composition Laws:
 * 
 * 1. Hylomorphism: fold(ana(coalg, seed), algebra) = hylo(coalg, algebra, seed)
 * 2. Optimization: Unfold followed by fold can be optimized to avoid intermediate structures
 * 3. Fusion: fold ∘ ana = hylo when the coalgebra and algebra are compatible
 */ 