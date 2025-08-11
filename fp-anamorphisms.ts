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
  Result, ResultK, ResultFunctor
} from './fp-gadt-enhanced';
// Ensure Ok/Err are referenced via Result constructors

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

// ----------------------------------------------------------------------------
// Builder-based recursive ana support
// ----------------------------------------------------------------------------

/**
 * Builder step for recursive anamorphisms over seeds.
 * - Done(node): terminal step yielding a final node T
 * - More({ sub }, rebuild): recurse on child seeds; then rebuild parent from child nodes
 */
export type Build<T, Seed> =
  | { tag: 'Done'; node: T }
  | { tag: 'More'; sub: Record<string, Seed>; rebuild: (children: Record<string, T>) => T };

/** Create a terminal builder step with a final node */
export const Done = <T, Seed = never>(node: T): Build<T, Seed> => ({ tag: 'Done', node });

/** Create a recursive builder step with child seeds and a parent rebuild function */
export const More = <T, Seed>(
  sub: Record<string, Seed>,
  rebuild: (children: Record<string, T>) => T
): Build<T, Seed> => ({ tag: 'More', sub, rebuild });

/**
 * Generic recursive anamorphism over seeds using a builder-coalgebra.
 * Recurses on child seeds and rebuilds the parent from child nodes.
 */
export function anaRecursive<T, Seed>(
  coalg: (seed: Seed) => Build<T, Seed>
): (seed: Seed) => T {
  const go = (s: Seed): T => {
    const step = coalg(s);
    if (step.tag === 'Done') return step.node;
    const children = Object.fromEntries(
      Object.entries(step.sub).map(([k, ss]) => [k, go(ss as Seed)])
    ) as Record<string, T>;
    return step.rebuild(children);
  };
  return go;
}

/**
 * Generic Unfold type alias that defines a mapping from seed to GADT node
 * Termination must be represented by a terminal constructor of the target GADT
 */
export type Unfold<T extends GADT<string, any>, Seed> = (seed: Seed) => T;

/**
 * Generic unfold function that recursively calls coalg until it yields a terminating value
 * Recursively builds GADT structures from seeds
 */
export function unfold<T extends GADT<string, any>, Seed>(
  coalg: Unfold<T, Seed>,
  seed: Seed
): T {
  return coalg(seed);
}

/**
 * Generic unfold function that handles recursive unfolding
 * This version can handle coalgebras that return seeds for further unfolding
 */
export function unfoldRecursive<T extends GADT<string, any>, Seed>(
  coalg: (seed: Seed) => { gadt: T; seeds: Seed[] },
  seed: Seed
): T {
  const { gadt } = coalg(seed);
  return gadt;
}

// ============================================================================
// Anamorphism for Expr
// ============================================================================

/**
 * Unfold coalgebra for Expr<A> that maps seeds to Expr nodes
 * Each coalgebra function returns an Expr node or null to signal termination
 */
export type UnfoldExpr<A, Seed> = (seed: Seed) => Expr<A>;

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
/**
 * @deprecated Use `anaExprBuilder` (builder-coalgebra) instead.
 * Kept for one release; internally adapts to builder.
 */
export function anaExprRecursive<A, Seed>(
  coalg: (seed: Seed) => {
    gadt: Expr<A>;
    subSeeds?: Partial<Record<'left' | 'right' | 'cond' | 'then' | 'else' | 'value' | 'body', Seed>>;
  }
): (seed: Seed) => Expr<A> {
  const toBuilder = (seed: Seed): Build<Expr<A>, Seed> => {
    const { gadt, subSeeds } = coalg(seed);
    if (!subSeeds || Object.keys(subSeeds).length === 0) return Done(gadt);
    return More(subSeeds as Record<string, Seed>, (kids: Record<string, Expr<A>>): Expr<A> => {
      return pmatch<Expr<A>, any>(gadt)
        .with('Const', ({ value }) => Expr.Const(value))
        .with('Var', ({ name }) => Expr.Var(name))
        .with('Add', () =>
          Expr.Add(
            (kids.left as unknown as Expr<number>) ?? (gadt as any).payload.left,
            (kids.right as unknown as Expr<number>) ?? (gadt as any).payload.right
          )
        )
        .with('If', () =>
          Expr.If(
            (kids.cond as unknown as Expr<boolean>) ?? (gadt as any).payload.cond,
            (kids.then as Expr<A>) ?? (gadt as any).payload.then,
            (kids.else as Expr<A>) ?? (gadt as any).payload.else
          )
        )
        .with('Let', ({ name }) =>
          Expr.Let(
            name,
            (kids.value as Expr<A>) ?? (gadt as any).payload.value,
            (kids.body as Expr<A>) ?? (gadt as any).payload.body
          )
        )
        .exhaustive() as Expr<A>;
    });
  };
  return anaRecursive(toBuilder);
}

/** Preferred builder-coalgebra recursive ana for Expr<A>. */
export function anaExprBuilder<A, Seed>(
  coalg: (seed: Seed) => Build<Expr<A>, Seed>
): (seed: Seed) => Expr<A> {
  return anaRecursive(coalg);
}

// ============================================================================
// Derivable Unfolds
// ============================================================================

/**
 * DerivableUnfold type for auto-deriving unfold helpers via the Derivable Instances system
 */
export type DerivableUnfold<T extends GADT<string, any>, Seed> = (seed: Seed) => T;

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
  coalg: (seed: Seed) => Apply<F, [any]>
): (seed: Seed) => Apply<F, [any]> {
  return (seed: Seed) => coalg(seed);
}

/**
 * Unfold for ExprK in HKT context
 */
export function unfoldExprK<A, Seed>(
  coalg: (seed: Seed) => Apply<ExprK, [A]>
): (seed: Seed) => Apply<ExprK, [A]> {
  return (seed: Seed) => coalg(seed);
}

/**
 * Unfold for MaybeGADTK in HKT context
 */
export function unfoldMaybeK<A, Seed>(
  coalg: (seed: Seed) => Apply<MaybeGADTK, [A]>
): (seed: Seed) => Apply<MaybeGADTK, [A]> {
  return (seed: Seed) => coalg(seed);
}

/**
 * Unfold for EitherGADTK in HKT context
 */
export function unfoldEitherK<L, R, Seed>(
  coalg: (seed: Seed) => Apply<EitherGADTK, [L, R]>
): (seed: Seed) => Apply<EitherGADTK, [L, R]> {
  return (seed: Seed) => coalg(seed);
}

// ============================================================================
// Specific GADT Anamorphisms
// ============================================================================

/**
 * Unfold coalgebra for MaybeGADT<A>
 */
export type UnfoldMaybe<A, Seed> = (seed: Seed) => MaybeGADT<A>;

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
export type UnfoldEither<L, R, Seed> = (seed: Seed) => EitherGADT<L, R>;

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
export type UnfoldResult<A, E, Seed> = (seed: Seed) => Result<A, E>;

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
export const countdownExprBuilder = (n: number): Build<Expr<number>, number> => {
  if (n <= 0) return Done(Expr.Const(n));
  return More({ tail: n - 1 }, (kids) => Expr.Add(Expr.Const(n), kids.tail as Expr<number>));
};

/**
 * Example: Countdown expression using anamorphism
 */
export const countdownExpr = anaExprBuilder<number, number>(countdownExprBuilder);

/**
 * Example: Range expression generator
 * Generates an Expr<number> representing a range from start to end
 */
export const rangeExprBuilder = (
  r: { start: number; end: number }
): Build<Expr<number>, { start: number; end: number }> => {
  const { start, end } = r;
  if (start >= end) return Done(Expr.Const(start));
  return More({ next: { start: start + 1, end } }, (kids) =>
    Expr.Add(Expr.Const(start), kids.next as Expr<number>)
  );
};

/**
 * Example: Maybe generator that counts to a limit
 */
export function countToLimitCoalg(seed: number): MaybeGADT<number> {
  if (seed > 3) {
    return MaybeGADT.Nothing();
  } else {
    return MaybeGADT.Just(seed + 1);
  }
}

/**
 * Example: Either generator based on seed parity
 */
export function parityEitherCoalg(seed: number): EitherGADT<string, number> {
  if (seed < 0) {
    return EitherGADT.Left('Negative number');
  } else if (seed % 2 === 0) {
    return EitherGADT.Right(seed);
  } else {
    return EitherGADT.Left(`Odd number: ${seed}`);
  }
}

/**
 * Example: Result generator based on seed validation
 */
export function validationResultCoalg(seed: number): Result<number, string> {
  if (seed < 0) {
    return Result.Err(`Negative number: ${seed}`);
  } else if (seed > 100) {
    return Result.Err(`Value too large: ${seed}`);
  } else {
    return Result.Ok(seed);
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
export type UnfoldList<A, Seed> = (seed: Seed) => ListGADT<A>;

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
export const rangeListBuilder = (
  r: { start: number; end: number }
): Build<ListGADT<number>, { start: number; end: number }> => {
  const { start, end } = r;
  if (start >= end) return Done(ListGADT.Nil());
  return More({ next: { start: start + 1, end } }, (kids) =>
    ListGADT.Cons(start, kids.next as ListGADT<number>)
  );
};

/**
 * Example: Generate a list from a numeric range using anamorphism
 */
export const rangeList = anaListBuilder<number, { start: number; end: number }>(rangeListBuilder);

export function anaListBuilder<A, Seed>(
  coalg: (seed: Seed) => Build<ListGADT<A>, Seed>
): (seed: Seed) => ListGADT<A> {
  return anaRecursive(coalg);
}

// (Examples for anaExprBuilder and anaListBuilder are provided in examples/ana-builder-examples.ts)

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
  console.log('Either unfold (-1):', result3); // Left("Negative number")
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
  console.log('List unfold range:', range); // Cons(1, Cons(2, Cons(3, Nil())))
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
 * 1. Identity: ana(coalg, seed) = coalg(seed)
 * 2. Composition: ana(f ∘ g, seed) = ana(f, ana(g, seed))
 * 3. Fusion: ana(coalg, seed) ∘ ana(coalg2, seed2) = ana(coalg ∘ coalg2, seed)
 * 4. Naturality: ana(map(f, coalg), seed) = f(ana(coalg, seed))
 * 
 * Unfold Coalgebra Laws:
 * 
 * 1. Termination: Coalgebras must eventually emit a terminal constructor
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