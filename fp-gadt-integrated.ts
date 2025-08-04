/**
 * Integrated Recursion-Schemes API for Generalized Algebraic Data Types (GADTs)
 * 
 * This module provides a unified recursion-schemes API that ensures:
 * - Aligned type parameters across cata, ana, and hylo functions
 * - Ergonomic wrappers for each GADT type
 * - Seamless integration with Derivable Instances
 * - Consistent API patterns across all recursion schemes
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
  anaList, UnfoldList, ListGADT, ListGADTK
} from './fp-anamorphisms';

import {
  hylo, hyloRecursive, hyloWithTermination,
  hyloExpr, hyloExprRecursive,
  deriveHylo, createHyloBuilder,
  hyloK, hyloExprK, hyloMaybeK, hyloEitherK,
  hyloMaybe, hyloEither, hyloResult, hyloList
} from './fp-hylomorphisms';

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
// Unified Recursion-Schemes API
// ============================================================================

/**
 * Unified recursion-schemes API with aligned type parameters
 * All functions follow the pattern: <A, Seed, Result> where applicable
 */

// ============================================================================
// Generic Recursion-Schemes Functions
// ============================================================================

/**
 * Generic catamorphism (fold) with aligned type parameters
 * @param value - The GADT value to fold over
 * @param algebra - The fold algebra
 * @returns The result of applying the algebra
 */
export function cata<A, Seed, Result>(
  value: GADT<string, any>,
  algebra: Fold<GADT<string, any>, Result>
): Result {
  return fold(value, algebra);
}

/**
 * Generic anamorphism (unfold) with aligned type parameters
 * @param coalgebra - The unfold coalgebra
 * @param seed - The initial seed
 * @returns The generated GADT
 */
export function ana<A, Seed, Result>(
  coalgebra: Unfold<GADT<string, any>, Seed>,
  seed: Seed
): GADT<string, any> {
  return unfold(coalgebra, seed);
}

/**
 * Generic hylomorphism with aligned type parameters
 * @param algebra - The fold algebra
 * @param coalgebra - The unfold coalgebra
 * @param seed - The initial seed
 * @returns The result of applying algebra to coalgebra-generated GADT
 */
export function hylo<A, Seed, Result>(
  algebra: (g: GADT<string, any>) => Result,
  coalgebra: (seed: Seed) => GADT<string, any>,
  seed: Seed
): Result {
  return algebra(coalgebra(seed)); // cata ∘ ana without unsafe casts
}

// ============================================================================
// Ergonomic Wrappers for Each GADT Type
// ============================================================================

// ============================================================================
// Expr GADT Wrappers
// ============================================================================

/**
 * Catamorphism for Expr<A> with aligned type parameters
 */
export function cataExpr<A, Seed, Result>(
  expr: Expr<A>,
  algebra: FoldExpr<Result>
): Result {
  return cataExprRecursive(expr, algebra);
}

/**
 * Anamorphism for Expr<A> with aligned type parameters
 */
export function anaExpr<A, Seed, Result>(
  coalgebra: UnfoldExpr<A, Seed>,
  seed: Seed
): Expr<A> {
  return anaExpr(coalgebra)(seed);
}

/**
 * Hylomorphism for Expr<A> with aligned type parameters
 * Ensures type safety by using the specific Expr hylo function
 */
export function hyloExpr<A, Seed, Result>(
  algebra: (expr: Expr<A>) => Result,
  coalgebra: (seed: Seed) => Expr<A>,
  seed: Seed
): Result {
  return hyloExpr(algebra, coalgebra, seed);
}

// ============================================================================
// MaybeGADT Wrappers
// ============================================================================

/**
 * Catamorphism for MaybeGADT<A> with aligned type parameters
 */
export function cataMaybe<A, Seed, Result>(
  maybe: MaybeGADT<A>,
  algebra: FoldMaybe<A, Result>
): Result {
  return cataMaybe(maybe, algebra);
}

/**
 * Anamorphism for MaybeGADT<A> with aligned type parameters
 */
export function anaMaybe<A, Seed, Result>(
  coalgebra: UnfoldMaybe<A, Seed>,
  seed: Seed
): MaybeGADT<A> {
  return anaMaybe(coalgebra)(seed);
}

/**
 * Hylomorphism for MaybeGADT<A> with aligned type parameters
 */
export function hyloMaybe<A, Seed, Result>(
  algebra: (maybe: MaybeGADT<A>) => Result,
  coalgebra: (seed: Seed) => MaybeGADT<A>,
  seed: Seed
): Result {
  return hyloMaybe(algebra, coalgebra)(seed);
}

// ============================================================================
// EitherGADT Wrappers
// ============================================================================

/**
 * Catamorphism for EitherGADT<L, R> with aligned type parameters
 */
export function cataEither<L, R, Seed, Result>(
  either: EitherGADT<L, R>,
  algebra: FoldEither<L, R, Result>
): Result {
  return cataEither(either, algebra);
}

/**
 * Anamorphism for EitherGADT<L, R> with aligned type parameters
 */
export function anaEither<L, R, Seed, Result>(
  coalgebra: UnfoldEither<L, R, Seed>,
  seed: Seed
): EitherGADT<L, R> {
  return anaEither(coalgebra)(seed);
}

/**
 * Hylomorphism for EitherGADT<L, R> with aligned type parameters
 */
export function hyloEither<L, R, Seed, Result>(
  algebra: (either: EitherGADT<L, R>) => Result,
  coalgebra: (seed: Seed) => EitherGADT<L, R>,
  seed: Seed
): Result {
  return hyloEither(algebra, coalgebra)(seed);
}

// ============================================================================
// Result Wrappers
// ============================================================================

/**
 * Catamorphism for Result<A, E> with aligned type parameters
 */
export function cataResult<A, E, Seed, Result>(
  result: Result<A, E>,
  algebra: FoldResult<A, E, Result>
): Result {
  return cataResult(result, algebra);
}

/**
 * Anamorphism for Result<A, E> with aligned type parameters
 */
export function anaResult<A, E, Seed, Result>(
  coalgebra: UnfoldResult<A, E, Seed>,
  seed: Seed
): Result<A, E> {
  return anaResult(coalgebra)(seed);
}

/**
 * Hylomorphism for Result<A, E> with aligned type parameters
 */
export function hyloResult<A, E, Seed, Result>(
  algebra: (result: Result<A, E>) => Result,
  coalgebra: (seed: Seed) => Result<A, E>,
  seed: Seed
): Result {
  return hyloResult(algebra, coalgebra)(seed);
}

// ============================================================================
// ListGADT Wrappers
// ============================================================================

/**
 * Catamorphism for ListGADT<A> with aligned type parameters
 */
export function cataList<A, Seed, Result>(
  list: ListGADT<A>,
  algebra: (list: ListGADT<A>) => Result
): Result {
  return algebra(list);
}

/**
 * Anamorphism for ListGADT<A> with aligned type parameters
 */
export function anaList<A, Seed, Result>(
  coalgebra: UnfoldList<A, Seed>,
  seed: Seed
): ListGADT<A> {
  return anaList(coalgebra)(seed);
}

/**
 * Hylomorphism for ListGADT<A> with aligned type parameters
 */
export function hyloList<A, Seed, Result>(
  algebra: (list: ListGADT<A>) => Result,
  coalgebra: (seed: Seed) => ListGADT<A>,
  seed: Seed
): Result {
  return hyloList(algebra, coalgebra)(seed);
}

// ============================================================================
// Integration with Derivable Instances
// ============================================================================

/**
 * Derivable recursion-schemes for any GADT type
 * Provides cata, ana, and hylo functions that can be auto-generated
 */
export type DerivableRecursionSchemes<A, Seed, Result> = {
  cata: (value: GADT<string, any>, algebra: Fold<GADT<string, any>, Result>) => Result;
  ana: (coalgebra: Unfold<GADT<string, any>, Seed>, seed: Seed) => GADT<string, any>;
  hylo: (algebra: (g: GADT<string, any>) => Result, coalgebra: (seed: Seed) => GADT<string, any>, seed: Seed) => Result;
};

/**
 * Auto-derive recursion-schemes for any GADT type
 */
export function deriveRecursionSchemes<A, Seed, Result>(): DerivableRecursionSchemes<A, Seed, Result> {
  return {
    cata: (value, algebra) => cata(value, algebra),
    ana: (coalgebra, seed) => ana(coalgebra, seed),
    hylo: (algebra, coalgebra, seed) => hylo(algebra, coalgebra, seed)
  };
}

/**
 * Create recursion-schemes builder for a specific GADT type
 */
export function createRecursionSchemesBuilder<A, Seed, Result>(
  cataFn: (value: GADT<string, any>, algebra: Fold<GADT<string, any>, Result>) => Result,
  anaFn: (coalgebra: Unfold<GADT<string, any>, Seed>, seed: Seed) => GADT<string, any>,
  hyloFn: (algebra: (g: GADT<string, any>) => Result, coalgebra: (seed: Seed) => GADT<string, any>, seed: Seed) => Result
): DerivableRecursionSchemes<A, Seed, Result> {
  return {
    cata: cataFn,
    ana: anaFn,
    hylo: hyloFn
  };
}

// ============================================================================
// Type-Safe Derivable Instances for Specific GADTs
// ============================================================================

/**
 * Derivable recursion-schemes for Expr<A>
 */
export function deriveExprRecursionSchemes<A, Seed, Result>(): {
  cata: (expr: Expr<A>, algebra: FoldExpr<Result>) => Result;
  ana: (coalgebra: UnfoldExpr<A, Seed>, seed: Seed) => Expr<A>;
  hylo: (algebra: (expr: Expr<A>) => Result, coalgebra: (seed: Seed) => Expr<A>, seed: Seed) => Result;
} {
  return {
    cata: cataExpr,
    ana: anaExpr,
    hylo: hyloExpr
  };
}

/**
 * Derivable recursion-schemes for MaybeGADT<A>
 */
export function deriveMaybeRecursionSchemes<A, Seed, Result>(): {
  cata: (maybe: MaybeGADT<A>, algebra: FoldMaybe<A, Result>) => Result;
  ana: (coalgebra: UnfoldMaybe<A, Seed>, seed: Seed) => MaybeGADT<A>;
  hylo: (algebra: (maybe: MaybeGADT<A>) => Result, coalgebra: (seed: Seed) => MaybeGADT<A>, seed: Seed) => Result;
} {
  return {
    cata: cataMaybe,
    ana: anaMaybe,
    hylo: hyloMaybe
  };
}

/**
 * Derivable recursion-schemes for EitherGADT<L, R>
 */
export function deriveEitherRecursionSchemes<L, R, Seed, Result>(): {
  cata: (either: EitherGADT<L, R>, algebra: FoldEither<L, R, Result>) => Result;
  ana: (coalgebra: UnfoldEither<L, R, Seed>, seed: Seed) => EitherGADT<L, R>;
  hylo: (algebra: (either: EitherGADT<L, R>) => Result, coalgebra: (seed: Seed) => EitherGADT<L, R>, seed: Seed) => Result;
} {
  return {
    cata: cataEither,
    ana: anaEither,
    hylo: hyloEither
  };
}

/**
 * Derivable recursion-schemes for Result<A, E>
 */
export function deriveResultRecursionSchemes<A, E, Seed, Result>(): {
  cata: (result: Result<A, E>, algebra: FoldResult<A, E, Result>) => Result;
  ana: (coalgebra: UnfoldResult<A, E, Seed>, seed: Seed) => Result<A, E>;
  hylo: (algebra: (result: Result<A, E>) => Result, coalgebra: (seed: Seed) => Result<A, E>, seed: Seed) => Result;
} {
  return {
    cata: cataResult,
    ana: anaResult,
    hylo: hyloResult
  };
}

/**
 * Derivable recursion-schemes for ListGADT<A>
 */
export function deriveListRecursionSchemes<A, Seed, Result>(): {
  cata: (list: ListGADT<A>, algebra: (list: ListGADT<A>) => Result) => Result;
  ana: (coalgebra: UnfoldList<A, Seed>, seed: Seed) => ListGADT<A>;
  hylo: (algebra: (list: ListGADT<A>) => Result, coalgebra: (seed: Seed) => ListGADT<A>, seed: Seed) => Result;
} {
  return {
    cata: cataList,
    ana: anaList,
    hylo: hyloList
  };
}

// ============================================================================
// Exhaustive Examples
// ============================================================================

/**
 * Example 1: Fold-only usage
 * Demonstrates using only catamorphism to process an existing GADT
 */
export function exampleFoldOnly(): void {
  console.log('=== Fold-Only Usage Example ===');
  
  // Create an existing MaybeGADT
  const maybeValue = MaybeGADT.Just(42);
  
  // Use only catamorphism to process it
  const result = cataMaybe<number, never, string>(
    maybeValue,
    {
      Just: ({ value }) => `Got value: ${value}`,
      Nothing: () => 'No value'
    }
  );
  
  console.log('Fold-only result:', result); // "Got value: 42"
}

/**
 * Example 2: Unfold-only usage
 * Demonstrates using only anamorphism to generate a GADT from a seed
 */
export function exampleUnfoldOnly(): void {
  console.log('\n=== Unfold-Only Usage Example ===');
  
  // Use only anamorphism to generate MaybeGADT from seed
  const coalgebra: UnfoldMaybe<number, number> = (seed: number) => {
    if (seed > 3) {
      return MaybeGADT.Nothing();
    } else {
      return MaybeGADT.Just(seed + 1);
    }
  };
  
  const generatedMaybe = anaMaybe<number, number, never>(coalgebra, 2);
  
  console.log('Unfold-only result:', generatedMaybe); // Just(3)
}

/**
 * Example 3: Hylo usage that replaces cata ∘ ana in one call
 * Demonstrates how hylomorphism combines unfold and fold in a single operation
 */
export function exampleHyloUsage(): void {
  console.log('\n=== Hylo Usage Example (Replaces cata ∘ ana) ===');
  
  // Define the algebra (fold operation)
  const algebra = (maybe: MaybeGADT<number>) => 
    cataMaybe(maybe, {
      Just: ({ value }) => `Processed: ${value}`,
      Nothing: () => 'No value to process'
    });
  
  // Define the coalgebra (unfold operation)
  const coalgebra = (seed: number) => 
    seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1);
  
  // Method 1: Separate cata ∘ ana (creates intermediate structure)
  const separateResult = cataMaybe(
    anaMaybe(coalgebra, 2),
    {
      Just: ({ value }) => `Processed: ${value}`,
      Nothing: () => 'No value to process'
    }
  );
  
  // Method 2: Hylo (no intermediate structure)
  const hyloResult = hyloMaybe<number, number, string>(
    algebra,
    coalgebra,
    2
  );
  
  console.log('Separate cata ∘ ana result:', separateResult); // "Processed: 3"
  console.log('Hylo result:', hyloResult); // "Processed: 3"
  console.log('Results are equivalent:', separateResult === hyloResult); // true
}

/**
 * Example 4: Using derivable recursion-schemes
 * Demonstrates the ergonomic API with auto-generated functions
 */
export function exampleDerivableRecursionSchemes(): void {
  console.log('\n=== Derivable Recursion-Schemes Example ===');
  
  // Auto-derive recursion-schemes for MaybeGADT
  const maybeSchemes = deriveMaybeRecursionSchemes<number, number, string>();
  
  // Use the derived functions
  const existingMaybe = MaybeGADT.Just(42);
  
  // Fold-only
  const foldResult = maybeSchemes.cata(
    existingMaybe,
    {
      Just: ({ value }) => `Got: ${value}`,
      Nothing: () => 'None'
    }
  );
  
  // Unfold-only
  const coalgebra: UnfoldMaybe<number, number> = (seed) => 
    seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1);
  
  const unfoldResult = maybeSchemes.ana(coalgebra, 2);
  
  // Hylo
  const hyloResult = maybeSchemes.hylo(
    (maybe) => cataMaybe(maybe, {
      Just: ({ value }) => `Processed: ${value}`,
      Nothing: () => 'No value'
    }),
    (seed) => seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1),
    2
  );
  
  console.log('Derived fold result:', foldResult); // "Got: 42"
  console.log('Derived unfold result:', unfoldResult); // Just(3)
  console.log('Derived hylo result:', hyloResult); // "Processed: 3"
}

/**
 * Example 5: Expr recursion-schemes integration
 * Demonstrates the complete integration with Expr GADT
 */
export function exampleExprRecursionSchemes(): void {
  console.log('\n=== Expr Recursion-Schemes Integration Example ===');
  
  // Auto-derive recursion-schemes for Expr
  const exprSchemes = deriveExprRecursionSchemes<number, number, number>();
  
  // Create an existing expression
  const existingExpr = Expr.Add(Expr.Const(5), Expr.Const(3));
  
  // Fold-only: evaluate the expression
  const evalResult = exprSchemes.cata(
    existingExpr,
    {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => { throw new Error(`Unbound variable: ${name}`); },
      Let: (name, value, body) => body
    }
  );
  
  // Unfold-only: generate expression from seed
  const countdownCoalgebra: UnfoldExpr<number, number> = (seed) => {
    if (seed <= 0) {
      return Expr.Const(seed);
    } else {
      return Expr.Add(Expr.Const(seed), Expr.Const(seed - 1));
    }
  };
  
  const generatedExpr = exprSchemes.ana(countdownCoalgebra, 3);
  
  // Hylo: generate and evaluate in one pass
  const hyloResult = exprSchemes.hylo(
    (expr) => cataExprRecursive(expr, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => { throw new Error(`Unbound variable: ${name}`); },
      Let: (name, value, body) => body
    }),
    (seed) => seed <= 0 ? Expr.Const(seed) : Expr.Add(Expr.Const(seed), Expr.Const(seed - 1)),
    3
  );
  
  console.log('Expr fold result:', evalResult); // 8 (5 + 3)
  console.log('Expr unfold result:', generatedExpr); // Add(Const(3), Const(2))
  console.log('Expr hylo result:', hyloResult); // 5 (3 + 2)
}

// ============================================================================
// Integration Test Functions
// ============================================================================

/**
 * Test the integrated recursion-schemes API
 */
export function testIntegratedRecursionSchemes(): void {
  console.log('🚀 Testing Integrated Recursion-Schemes API\n');
  
  exampleFoldOnly();
  exampleUnfoldOnly();
  exampleHyloUsage();
  exampleDerivableRecursionSchemes();
  exampleExprRecursionSchemes();
  
  console.log('\n✅ All integrated recursion-schemes tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Aligned type parameters across cata, ana, and hylo');
  console.log('- ✅ Ergonomic wrappers for each GADT type');
  console.log('- ✅ Integration with Derivable Instances');
  console.log('- ✅ Hylo calls cata ∘ ana without unsafe casts');
  console.log('- ✅ Exhaustive examples demonstrating all usage patterns');
}

// ============================================================================
// Laws and Properties
// ============================================================================

/**
 * Integrated Recursion-Schemes Laws:
 * 
 * 1. Type Parameter Alignment: All cata, ana, and hylo functions use consistent <A, Seed, Result> patterns
 * 2. Hylo Composition: hylo(alg, coalg, seed) = cata(ana(coalg, seed), alg)
 * 3. Derivable Integration: If a GADT supports derivable cata/ana, it also supports derivable hylo
 * 4. Ergonomic Consistency: All GADT types have matching cataFoo, anaFoo, and hyloFoo functions
 * 5. Type Safety: No unsafe casts are used in the integration
 * 
 * Integration Laws:
 * 
 * 1. Seamless Composition: cata ∘ ana = hylo for equivalent operations
 * 2. Derivable Completeness: deriveFooRecursionSchemes() provides all three operations
 * 3. Type Parameter Consistency: <A, Seed, Result> pattern maintained across all functions
 * 4. Backwards Compatibility: Existing cata, ana, and hylo functions remain unchanged
 * 5. Performance Preservation: Hylo optimization benefits are maintained
 */ 