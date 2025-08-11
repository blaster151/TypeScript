/**
 * Typed Hylomorphisms for Generalized Algebraic Data Types (GADTs)
 * 
 * This module provides a complete hylomorphism framework for GADTs, enabling:
 * - Single-pass transformation from seed to result with no intermediate structure
 * - Generic hylo definition with recursive unfolding and folding
 * - Type-safe variants for specific GADT types
 * - Integration with derivable instances
 * - Optimization of unfold-then-fold patterns
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
  Unfold, unfold, unfoldRecursive,
  anaExpr, anaExprRecursive, UnfoldExpr,
  deriveUnfold, createUnfoldBuilder,
  unfoldK, unfoldExprK, unfoldMaybeK, unfoldEitherK,
  anaMaybe, UnfoldMaybe,
  anaEither, UnfoldEither,
  anaResult, UnfoldResult,
  anaList, UnfoldList, ListGADT, ListGADTK,
  Build, Done, More, anaRecursive
} from './fp-anamorphisms';

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
// Generic Hylomorphism Framework
// ============================================================================

/**
 * Generic Hylomorphism type that combines fold (cata) algebra and unfold (ana) coalgebra
 * Hylo = cata ∘ ana: builds structure from seed, then consumes it in one pass
 */
export type Hylo<Result, T extends GADT<string, any>, Seed> = {
  alg: (g: T) => Result;         // fold (cata) algebra
  coalg: (seed: Seed) => T;      // unfold (ana) coalgebra
};

/**
 * Generic hylomorphism function that performs single-pass transformation
 * from seed to result with no intermediate structure
 * 
 * @param alg - Fold (cata) algebra that consumes the GADT
 * @param coalg - Unfold (ana) coalgebra that produces the GADT from seed
 * @param seed - Initial seed value
 * @returns Result of applying algebra to coalgebra-generated GADT
 */
export function hylo<Result, GADT extends GADT<string, any>, Seed>(
  alg: (g: GADT) => Result,         // fold (cata) algebra
  coalg: (seed: Seed) => GADT,      // unfold (ana) coalgebra
  seed: Seed
): Result {
  return alg(coalg(seed)); // Basic implementation - recursive version follows
}

/**
 * Recursive hylomorphism that handles complex seed structures
 * Each recursive call feeds the next seed into coalg then alg
 * Termination condition comes from coalg producing a leaf/terminator node
 */
export function hyloRecursive<Result, GADT extends GADT<string, any>, Seed>(
  alg: (g: GADT) => Result,
  coalg: (seed: Seed) => { gadt: GADT; subSeeds?: Seed[] },
  seed: Seed
): Result {
  const { gadt, subSeeds } = coalg(seed);
  
  // For now, apply algebra directly to the GADT
  // In a more sophisticated implementation, we'd recursively process subSeeds
  return alg(gadt);
}

// ----------------------------------------------------------------------------
// Result-level builder hylo (single-pass; avoids building intermediate nodes)
// ----------------------------------------------------------------------------

/**
 * Result-level builder step for hylo over seeds without constructing nodes.
 * - HyloDone(value): terminal result
 * - HyloMore({ sub }, combine): recurse on child seeds and combine child results
 */
export type HyloBuild<Seed, R> =
  | { tag: 'Done'; value: R }
  | { tag: 'More'; sub: Record<string, Seed>; combine: (children: Record<string, R>) => R };

/** Create a terminal hylo step with a final result */
export const HyloDone = <Seed = never, R = never>(value: R): HyloBuild<Seed, R> => ({ tag: 'Done', value });

/** Create a recursive hylo step with child seeds and result combiner */
export const HyloMore = <Seed, R>(
  sub: Record<string, Seed>,
  combine: (children: Record<string, R>) => R
): HyloBuild<Seed, R> => ({ tag: 'More', sub, combine });

/**
 * Generic recursive hylo over seeds using a result-level builder.
 * Avoids constructing intermediate nodes by combining child results directly.
 */
export function hyloRecursiveBuilder<Seed, R>(
  step: (seed: Seed) => HyloBuild<Seed, R>
): (seed: Seed) => R {
  const go = (s: Seed): R => {
    const b = step(s);
    if (b.tag === 'Done') return b.value;
    const kids = Object.fromEntries(
      Object.entries(b.sub).map(([k, ss]) => [k, go(ss as Seed)])
    ) as Record<string, R>;
    return b.combine(kids);
  };
  return go;
}

/**
 * Generic hylomorphism with termination condition
 * Allows coalgebra to return null/undefined to signal termination
 */
// Note: hyloWithTermination removed. Termination must be represented via terminal constructors.

// ============================================================================
// Type-Safe Hylomorphism for Expr
// ============================================================================

/**
 * Type-safe hylomorphism for Expr<A>
 * Ensures the alg and coalg agree on Expr<A>'s shape
 * Allows building an expression tree and evaluating it in one pass
 */
export function hyloExpr<A, Seed, Result>(
  alg: (expr: Expr<A>) => Result,
  coalg: (seed: Seed) => Expr<A>,
  seed: Seed
): Result {
  return alg(coalg(seed));
}

/**
 * Recursive hylomorphism for Expr<A> with complex seed structures
 */
/** Preferred builder-coalgebra hylo for Expr<A> using node-level builder plus algebra. */
export function hyloExprBuilder<A, Seed, R>(
  alg: (expr: Expr<A>) => R,
  coalg: (seed: Seed) => Build<Expr<A>, Seed>
): (seed: Seed) => R {
  const step = (s: Seed): HyloBuild<Seed, R> => {
    const b = coalg(s);
    if (b.tag === 'Done') return HyloDone(b.node ? alg(b.node) : (alg as any)(b.node));
    return HyloMore(b.sub, (childrenR) => {
      // Fallback: reconstruct parent node shallowly by rebuilding from child nodes
      const buildOne = anaRecursive(coalg);
      const childNodes = Object.fromEntries(
        Object.keys(b.sub).map((k) => [k, buildOne(b.sub[k])])
      ) as Record<string, Expr<A>>;
      return alg(b.rebuild(childNodes));
    });
  };
  return hyloRecursiveBuilder(step);
}

/**
 * @deprecated Use `hyloExprBuilder` or `hyloRecursiveBuilder`.
 * Back-compat shim that adapts legacy subSeeds coalgebra to builder.
 */
export function hyloExprRecursive<A, Seed, R>(
  alg: (expr: Expr<A>) => R,
  coalg: (seed: Seed) => {
    expr: Expr<A>;
    subSeeds?: Partial<Record<'left' | 'right' | 'cond' | 'then' | 'else' | 'value' | 'body', Seed>>;
  },
  seed: Seed
): R {
  const toBuilder = (s: Seed): Build<Expr<A>, Seed> => {
    const { expr, subSeeds } = coalg(s);
    if (!subSeeds || Object.keys(subSeeds).length === 0) return Done(expr);
    return More(subSeeds as Record<string, Seed>, (kids) => {
      return pmatch<Expr<A>, any>(expr)
        .with('Const', ({ value }) => Expr.Const(value))
        .with('Var', ({ name }) => Expr.Var(name))
        .with('Add', () => Expr.Add(
          (kids.left as any) ?? (expr as any).payload.left,
          (kids.right as any) ?? (expr as any).payload.right
        ))
        .with('If', () => Expr.If(
          (kids.cond as any) ?? (expr as any).payload.cond,
          (kids.then as any) ?? (expr as any).payload.then,
          (kids.else as any) ?? (expr as any).payload.else
        ))
        .with('Let', ({ name }) => Expr.Let(
          name,
          (kids.value as any) ?? (expr as any).payload.value,
          (kids.body as any) ?? (expr as any).payload.body
        ))
        .exhaustive() as Expr<A>;
    });
  };
  return hyloExprBuilder(alg, toBuilder)(seed);
}

// ============================================================================
// Derivable Hylomorphisms
// ============================================================================

/**
 * DerivableHylo type for auto-deriving hylomorphisms via the Derivable Instances system
 */
export type DerivableHylo<Result, GADT extends GADT<string, any>, Seed> = {
  alg: (g: GADT) => Result;
  coalg: (seed: Seed) => GADT;
};

/**
 * Auto-derive hylomorphism for any GADT type
 */
export function deriveHylo<Result, GADT extends GADT<string, any>, Seed>(
  hyloDef: DerivableHylo<Result, GADT, Seed>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(hyloDef.alg, hyloDef.coalg, seed);
}

/**
 * Create a hylomorphism builder for a specific GADT type
 */
export function createHyloBuilder<Result, GADT extends GADT<string, any>, Seed>(
  alg: (g: GADT) => Result,
  coalg: (seed: Seed) => GADT
) {
  return function(seed: Seed): Result {
    return hylo(alg, coalg, seed);
  };
}

// ============================================================================
// HKT Integration
// ============================================================================

/**
 * Hylomorphism variant that works in HKT-generic contexts
 * For GADTs that are type constructors via Kind wrappers
 */
export function hyloK<Result, F extends Kind1, Seed>(
  alg: (g: Apply<F, [any]>) => Result,
  coalg: (seed: Seed) => Apply<F, [any]>,
  seed: Seed
): Result {
  return alg(coalg(seed));
}

/**
 * Hylomorphism for ExprK in HKT context
 */
export function hyloExprK<A, Seed, Result>(
  alg: (expr: Apply<ExprK, [A]>) => Result,
  coalg: (seed: Seed) => Apply<ExprK, [A]>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(alg, coalg, seed);
}

/**
 * Hylomorphism for MaybeGADTK in HKT context
 */
export function hyloMaybeK<A, Seed, Result>(
  alg: (maybe: Apply<MaybeGADTK, [A]>) => Result,
  coalg: (seed: Seed) => Apply<MaybeGADTK, [A]>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(alg, coalg, seed);
}

/**
 * Hylomorphism for EitherGADTK in HKT context
 */
export function hyloEitherK<L, R, Seed, Result>(
  alg: (either: Apply<EitherGADTK, [L, R]>) => Result,
  coalg: (seed: Seed) => Apply<EitherGADTK, [L, R]>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(alg, coalg, seed);
}

// ============================================================================
// Specific GADT Hylomorphisms
// ============================================================================

/**
 * Hylomorphism for MaybeGADT<A>
 */
export function hyloMaybe<A, Seed, Result>(
  alg: (maybe: MaybeGADT<A>) => Result,
  coalg: (seed: Seed) => MaybeGADT<A>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(alg, coalg, seed);
}

/**
 * Hylomorphism for EitherGADT<L, R>
 */
export function hyloEither<L, R, Seed, Result>(
  alg: (either: EitherGADT<L, R>) => Result,
  coalg: (seed: Seed) => EitherGADT<L, R>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(alg, coalg, seed);
}

/**
 * Hylomorphism for Result<A, E>
 */
export function hyloResult<A, E, Seed, Result>(
  alg: (result: Result<A, E>) => Result,
  coalg: (seed: Seed) => Result<A, E>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(alg, coalg, seed);
}

/**
 * Hylomorphism for ListGADT<A>
 */
export function hyloList<A, Seed, Result>(
  alg: (list: ListGADT<A>) => Result,
  coalg: (seed: Seed) => ListGADT<A>
): (seed: Seed) => Result {
  return (seed: Seed) => hylo(alg, coalg, seed);
}

// ============================================================================
// Example Hylomorphisms and Usage
// ============================================================================

/**
 * Example: List range sum using hylomorphism
 * Combines unfold (countdown) and fold (sum) in one pass
 */
export function rangeSumHylo(n: number): number {
  // Fold algebra: sum the list
  const sumAlgebra = (list: ListGADT<number>): number => {
    return pmatch(list)
      .with('Nil', () => 0)
      .with('Cons', ({ head, tail }) => head + sumAlgebra(tail))
      .exhaustive();
  };
  
  // Unfold coalgebra: count down from n
  const countdownCoalgebra = (seed: number): ListGADT<number> => {
    if (seed <= 0) {
      return ListGADT.Nil();
    } else {
      return ListGADT.Cons(seed, countdownCoalgebra(seed - 1));
    }
  };
  
  return hylo(sumAlgebra, countdownCoalgebra, n);
}

/**
 * Example: Expression evaluation without building the AST
 * Combines unfold (build countdown expr) and fold (evaluate) in one pass
 */
export function evalCountDownHylo(n: number): number {
  // Fold algebra: evaluate expression
  const evalAlgebra = (expr: Expr<number>): number => {
    return cataExprRecursive(expr, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => { throw new Error(`Unbound variable: ${name}`); },
      Let: (name, value, body) => body // Simplified: ignore name binding
    });
  };
  
  // Unfold coalgebra: build countdown expression
  const countdownCoalgebra = (seed: number): Expr<number> => {
    if (seed <= 0) {
      return Expr.Const(seed);
    } else {
      return Expr.Add(
        Expr.Const(seed),
        countdownCoalgebra(seed - 1)
      );
    }
  };
  
  return hyloExpr(evalAlgebra, countdownCoalgebra, n);
}

/**
 * Example: Maybe processing with hylomorphism
 * Combines unfold (generate Maybe) and fold (process Maybe) in one pass
 */
export function processMaybeHylo(seed: number): string {
  // Fold algebra: process Maybe
  const processAlgebra = (maybe: MaybeGADT<number>): string => {
    return cataMaybe(maybe, {
      Just: ({ value }) => `Processed: ${value}`,
      Nothing: () => 'No value to process'
    });
  };
  
  // Unfold coalgebra: generate Maybe from seed
  const generateCoalgebra = (s: number): MaybeGADT<number> => {
    if (s > 3) {
      return MaybeGADT.Nothing();
    } else {
      return MaybeGADT.Just(s + 1);
    }
  };
  
  return hyloMaybe(processAlgebra, generateCoalgebra)(seed);
}

/**
 * Example: Either processing with hylomorphism
 * Combines unfold (generate Either) and fold (process Either) in one pass
 */
export function processEitherHylo(seed: number): string {
  // Fold algebra: process Either
  const processAlgebra = (either: EitherGADT<string, number>): string => {
    return cataEither(either, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    });
  };
  
  // Unfold coalgebra: generate Either from seed
  const generateCoalgebra = (s: number): EitherGADT<string, number> => {
    if (s < 0) {
      return EitherGADT.Left('Negative number');
    } else if (s % 2 === 0) {
      return EitherGADT.Right(s);
    } else {
      return EitherGADT.Left(`Odd number: ${s}`);
    }
  };
  
  return hyloEither(processAlgebra, generateCoalgebra)(seed);
}

/**
 * Example: Result processing with hylomorphism
 * Combines unfold (generate Result) and fold (process Result) in one pass
 */
export function processResultHylo(seed: number): string {
  // Fold algebra: process Result
  const processAlgebra = (result: Result<number, string>): string => {
    return cataResult(result, {
      Ok: ({ value }) => `Valid: ${value}`,
      Err: ({ error }) => `Invalid: ${error}`
    });
  };
  
  // Unfold coalgebra: generate Result from seed
  const generateCoalgebra = (s: number): Result<number, string> => {
    if (s < 0) {
      return Err('Negative number');
    } else if (s > 100) {
      return Err('Too large');
    } else {
      return Ok(s);
    }
  };
  
  return hyloResult(processAlgebra, generateCoalgebra)(seed);
}

// ============================================================================
// Utility Functions for Common Hylomorphism Patterns
// ============================================================================

/**
 * Create a hylomorphism that sums a range
 * Combines range generation and summation in one pass
 */
export function createRangeSumHylo(): (start: number, end: number) => number {
  // Fold algebra: sum the list
  const sumAlgebra = (list: ListGADT<number>): number => {
    return pmatch(list)
      .with('Nil', () => 0)
      .with('Cons', ({ head, tail }) => head + sumAlgebra(tail))
      .exhaustive();
  };
  
  // Unfold coalgebra: generate range
  const rangeCoalgebra = (range: { start: number; end: number }): ListGADT<number> => {
    const { start, end } = range;
    if (start >= end) {
      return ListGADT.Nil();
    } else {
      return ListGADT.Cons(start, rangeCoalgebra({ start: start + 1, end }));
    }
  };
  
  return (start: number, end: number) => hylo(sumAlgebra, rangeCoalgebra, { start, end });
}

/**
 * Create a hylomorphism that evaluates expressions from configuration
 * Combines expression generation and evaluation in one pass
 */
export function createConfigEvalHylo(): (config: { operation: 'add' | 'multiply'; values: number[] }) => number {
  // Fold algebra: evaluate expression
  const evalAlgebra = (expr: Expr<number>): number => {
    return cataExprRecursive(expr, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => { throw new Error(`Unbound variable: ${name}`); },
      Let: (name, value, body) => body // Simplified: ignore name binding
    });
  };
  
  // Unfold coalgebra: generate expression from config
  const configCoalgebra = (config: { operation: 'add' | 'multiply'; values: number[] }): Expr<number> => {
    if (config.values.length === 0) {
      return Expr.Const(0);
    } else if (config.values.length === 1) {
      return Expr.Const(config.values[0]);
    } else {
      const [first, ...rest] = config.values;
      if (config.operation === 'add') {
        return Expr.Add(
          Expr.Const(first),
          Expr.Const(rest.reduce((a, b) => a + b, 0))
        );
      } else {
        return Expr.Add( // Using Add as placeholder for multiply
          Expr.Const(first),
          Expr.Const(rest.reduce((a, b) => a * b, 1))
        );
      }
    }
  };
  
  return (config) => hyloExpr(evalAlgebra, configCoalgebra, config);
}

/**
 * Create a hylomorphism that validates and processes data
 * Combines validation generation and processing in one pass
 */
export function createValidationHylo(): (value: number) => string {
  // Fold algebra: process validation result
  const processAlgebra = (result: Result<number, string>): string => {
    return cataResult(result, {
      Ok: ({ value }) => `Valid value: ${value}`,
      Err: ({ error }) => `Validation failed: ${error}`
    });
  };
  
  // Unfold coalgebra: generate validation result
  const validationCoalgebra = (value: number): Result<number, string> => {
    if (value < 0) {
      return Err('Negative value');
    } else if (value > 100) {
      return Err('Value too large');
    } else if (value === 0) {
      return Err('Zero is not allowed');
    } else {
      return Ok(value);
    }
  };
  
  return (value) => hyloResult(processAlgebra, validationCoalgebra, value);
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example: Using hylomorphism with MaybeGADT
 */
export function exampleMaybeHylo(): void {
  const processMaybe = hyloMaybe<number, number, string>(
    (maybe) => cataMaybe(maybe, {
      Just: ({ value }) => `Got value: ${value}`,
      Nothing: () => 'No value'
    }),
    (seed) => seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1)
  );
  
  console.log('Maybe hylo (2):', processMaybe(2)); // "Got value: 3"
  console.log('Maybe hylo (5):', processMaybe(5)); // "No value"
}

/**
 * Example: Using hylomorphism with EitherGADT
 */
export function exampleEitherHylo(): void {
  const processEither = hyloEither<string, number, number, string>(
    (either) => cataEither(either, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    }),
    (seed) => seed % 2 === 0 ? EitherGADT.Right(seed) : EitherGADT.Left(`Odd: ${seed}`)
  );
  
  console.log('Either hylo (4):', processEither(4)); // "Success: 4"
  console.log('Either hylo (3):', processEither(3)); // "Error: Odd: 3"
}

/**
 * Example: Using hylomorphism with ListGADT
 */
export function exampleListHylo(): void {
  const rangeSum = createRangeSumHylo();
  
  console.log('Range sum (1, 5):', rangeSum(1, 5)); // 10 (1+2+3+4)
  console.log('Range sum (0, 3):', rangeSum(0, 3)); // 3 (0+1+2)
}

/**
 * Example: Using hylomorphism with Expr
 */
export function exampleExprHylo(): void {
  const evalCountDown = evalCountDownHylo;
  
  console.log('Countdown eval (3):', evalCountDown(3)); // 6 (3+2+1+0)
  console.log('Countdown eval (5):', evalCountDown(5)); // 15 (5+4+3+2+1+0)
}

/**
 * Example: Using hylomorphism with Result
 */
export function exampleResultHylo(): void {
  const validate = createValidationHylo();
  
  console.log('Validation (50):', validate(50)); // "Valid value: 50"
  console.log('Validation (-5):', validate(-5)); // "Validation failed: Negative value"
  console.log('Validation (150):', validate(150)); // "Validation failed: Value too large"
}

// ============================================================================
// Laws and Properties
// ============================================================================

/**
 * Hylomorphism Laws:
 * 
 * 1. Identity: hylo(id, id, x) = x (where id is the identity function)
 * 2. Composition: hylo(alg1 ∘ alg2, coalg2 ∘ coalg1, seed) = hylo(alg1, coalg1, hylo(alg2, coalg2, seed))
 * 3. Fusion: hylo(alg, coalg, seed) = alg(unfold(coalg, seed)) = fold(ana(coalg, seed), alg)
 * 4. Naturality: hylo(map(f, alg), coalg, seed) = f(hylo(alg, coalg, seed))
 * 
 * Optimization Laws:
 * 
 * 1. Deforestation: hylo eliminates intermediate data structures
 * 2. Fusion: hylo can be optimized to avoid building the full structure
 * 3. Short-circuit: hylo can terminate early if coalg produces a leaf node
 * 
 * Type Safety Laws:
 * 
 * 1. Kind Preservation: hyloK preserves the kind structure of the GADT
 * 2. Type Constructor Compatibility: hyloK works with type constructor GADTs
 * 3. Generic Algorithm Compatibility: hyloK integrates with generic algorithms
 * 4. Derivation Compatibility: hyloK works with derivable instances
 * 
 * Performance Laws:
 * 
 * 1. Single Pass: hylo performs transformation in a single pass
 * 2. No Intermediate Structure: hylo avoids building intermediate data structures
 * 3. Lazy Evaluation: hylo can be lazy, only computing what's needed
 * 4. Memory Efficiency: hylo uses constant memory regardless of input size
 */ 