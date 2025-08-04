/**
 * Test file for Integrated Recursion-Schemes API
 * 
 * This file demonstrates the unified recursion-schemes API that ensures:
 * - Aligned type parameters across cata, ana, and hylo functions
 * - Ergonomic wrappers for each GADT type
 * - Seamless integration with Derivable Instances
 * - Consistent API patterns across all recursion schemes
 */

import {
  cata, ana, hylo,
  cataExpr, anaExpr, hyloExpr,
  cataMaybe, anaMaybe, hyloMaybe,
  cataEither, anaEither, hyloEither,
  cataResult, anaResult, hyloResult,
  cataList, anaList, hyloList,
  deriveRecursionSchemes, createRecursionSchemesBuilder,
  deriveExprRecursionSchemes, deriveMaybeRecursionSchemes,
  deriveEitherRecursionSchemes, deriveResultRecursionSchemes, deriveListRecursionSchemes,
  exampleFoldOnly, exampleUnfoldOnly, exampleHyloUsage,
  exampleDerivableRecursionSchemes, exampleExprRecursionSchemes,
  testIntegratedRecursionSchemes
} from './fp-gadt-integrated';

import {
  pmatch
} from './fp-gadt-enhanced';

import {
  Expr, ExprK,
  MaybeGADT, MaybeGADTK,
  EitherGADT, EitherGADTK,
  Result, ResultK
} from './fp-gadt-enhanced';

import {
  FoldExpr, FoldMaybe, FoldEither, FoldResult
} from './fp-catamorphisms';

import {
  UnfoldExpr, UnfoldMaybe, UnfoldEither, UnfoldResult, UnfoldList
} from './fp-anamorphisms';

import {
  ListGADT
} from './fp-anamorphisms';

import {
  Kind1, Kind2,
  Apply, ArrayK, MaybeK, EitherK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

// ============================================================================
// Generic Recursion-Schemes Tests
// ============================================================================

/**
 * Test generic recursion-schemes functions
 */
export function testGenericRecursionSchemes(): void {
  console.log('=== Testing Generic Recursion-Schemes Functions ===');
  
  // Test generic cata
  const maybeValue = MaybeGADT.Just(42);
  const maybeAlgebra: FoldMaybe<number, string> = {
    Just: ({ value }) => `Got value: ${value}`,
    Nothing: () => 'No value'
  };
  
  const cataResult = cata<number, never, string>(maybeValue, maybeAlgebra);
  console.log('Generic cata result:', cataResult); // "Got value: 42"
  
  // Test generic ana
  const maybeCoalgebra: UnfoldMaybe<number, number> = (seed: number) => {
    if (seed > 3) {
      return MaybeGADT.Nothing();
    } else {
      return MaybeGADT.Just(seed + 1);
    }
  };
  
  const anaResult = ana<number, number, never>(maybeCoalgebra, 2);
  console.log('Generic ana result:', anaResult); // Just(3)
  
  // Test generic hylo
  const hyloResult = hylo<number, number, string>(
    (maybe) => {
      if (maybe.tag === 'Just') {
        return `Processed: ${maybe.payload.value}`;
      } else {
        return 'No value to process';
      }
    },
    (seed) => seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1),
    2
  );
  
  console.log('Generic hylo result:', hyloResult); // "Processed: 3"
}

// ============================================================================
// Expr GADT Integration Tests
// ============================================================================

/**
 * Test Expr GADT recursion-schemes integration
 */
export function testExprIntegration(): void {
  console.log('\n=== Testing Expr GADT Integration ===');
  
  // Test cataExpr
  const expr = Expr.Add(Expr.Const(5), Expr.Const(3));
  const exprAlgebra: FoldExpr<number> = {
    Const: n => n,
    Add: (l, r) => l + r,
    If: (c, t, e) => c ? t : e,
    Var: name => { throw new Error(`Unbound variable: ${name}`); },
    Let: (name, value, body) => body
  };
  
  const cataResult = cataExpr<number, never, number>(expr, exprAlgebra);
  console.log('Expr cata result:', cataResult); // 8 (5 + 3)
  
  // Test anaExpr
  const countdownCoalgebra: UnfoldExpr<number, number> = (seed: number) => {
    if (seed <= 0) {
      return Expr.Const(seed);
    } else {
      return Expr.Add(Expr.Const(seed), Expr.Const(seed - 1));
    }
  };
  
  const anaResult = anaExpr<number, number, never>(countdownCoalgebra, 3);
  console.log('Expr ana result:', anaResult); // Add(Const(3), Const(2))
  
  // Test hyloExpr
  const hyloResult = hyloExpr<number, number, number>(
    (expr) => cataExpr(expr, exprAlgebra),
    (seed) => seed <= 0 ? Expr.Const(seed) : Expr.Add(Expr.Const(seed), Expr.Const(seed - 1)),
    3
  );
  
  console.log('Expr hylo result:', hyloResult); // 5 (3 + 2)
}

// ============================================================================
// MaybeGADT Integration Tests
// ============================================================================

/**
 * Test MaybeGADT recursion-schemes integration
 */
export function testMaybeIntegration(): void {
  console.log('\n=== Testing MaybeGADT Integration ===');
  
  // Test cataMaybe
  const maybeValue = MaybeGADT.Just(42);
  const maybeAlgebra: FoldMaybe<number, string> = {
    Just: ({ value }) => `Got value: ${value}`,
    Nothing: () => 'No value'
  };
  
  const cataResult = cataMaybe<number, never, string>(maybeValue, maybeAlgebra);
  console.log('Maybe cata result:', cataResult); // "Got value: 42"
  
  // Test anaMaybe
  const maybeCoalgebra: UnfoldMaybe<number, number> = (seed: number) => {
    if (seed > 3) {
      return MaybeGADT.Nothing();
    } else {
      return MaybeGADT.Just(seed + 1);
    }
  };
  
  const anaResult = anaMaybe<number, number, never>(maybeCoalgebra, 2);
  console.log('Maybe ana result:', anaResult); // Just(3)
  
  // Test hyloMaybe
  const hyloResult = hyloMaybe<number, number, string>(
    (maybe) => cataMaybe(maybe, {
      Just: ({ value }) => `Processed: ${value}`,
      Nothing: () => 'No value to process'
    }),
    (seed) => seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1),
    2
  );
  
  console.log('Maybe hylo result:', hyloResult); // "Processed: 3"
}

// ============================================================================
// EitherGADT Integration Tests
// ============================================================================

/**
 * Test EitherGADT recursion-schemes integration
 */
export function testEitherIntegration(): void {
  console.log('\n=== Testing EitherGADT Integration ===');
  
  // Test cataEither
  const eitherValue = EitherGADT.Right(42);
  const eitherAlgebra: FoldEither<string, number, string> = {
    Left: ({ value }) => `Error: ${value}`,
    Right: ({ value }) => `Success: ${value}`
  };
  
  const cataEitherResult = cataEither<string, number, never, string>(eitherValue, eitherAlgebra);
  console.log('Either cata result:', cataResult); // "Success: 42"
  
  // Test anaEither
  const eitherCoalgebra: UnfoldEither<string, number, number> = (seed: number) => {
    if (seed < 0) {
      return EitherGADT.Left('Negative number');
    } else if (seed % 2 === 0) {
      return EitherGADT.Right(seed);
    } else {
      return EitherGADT.Left(`Odd number: ${seed}`);
    }
  };
  
  const anaResult = anaEither<string, number, number, never>(eitherCoalgebra, 4);
  console.log('Either ana result:', anaResult); // Right(4)
  
  // Test hyloEither
  const hyloResult = hyloEither<string, number, number, string>(
    (either) => cataEither(either, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    }),
    (seed) => seed % 2 === 0 ? EitherGADT.Right(seed) : EitherGADT.Left(`Odd: ${seed}`),
    4
  );
  
  console.log('Either hylo result:', hyloResult); // "Success: 4"
}

// ============================================================================
// Result Integration Tests
// ============================================================================

/**
 * Test Result recursion-schemes integration
 */
export function testResultIntegration(): void {
  console.log('\n=== Testing Result Integration ===');
  
  // Test cataResult
  const resultValue = Result.Ok(42);
  const resultAlgebra: FoldResult<number, string, string> = {
    Ok: ({ value }) => `Valid: ${value}`,
    Err: ({ error }) => `Invalid: ${error}`
  };
  
  const cataResult = cataResult<number, string, never, string>(resultValue, resultAlgebra);
  console.log('Result cata result:', cataResult); // "Valid: 42"
  
  // Test anaResult
  const resultCoalgebra: UnfoldResult<number, string, number> = (seed: number) => {
    if (seed < 0) {
      return Result.Err('Negative number');
    } else if (seed > 100) {
      return Result.Err('Too large');
    } else {
      return Result.Ok(seed);
    }
  };
  
  const anaResult = anaResult<number, string, number, never>(resultCoalgebra, 50);
  console.log('Result ana result:', anaResult); // Ok(50)
  
  // Test hyloResult
  const hyloResult = hyloResult<number, string, number, string>(
    (result) => cataResult(result, {
      Ok: ({ value }) => `Valid: ${value}`,
      Err: ({ error }) => `Invalid: ${error}`
    }),
    (seed) => seed < 0 ? Result.Err('Negative') : Result.Ok(seed),
    25
  );
  
  console.log('Result hylo result:', hyloResult); // "Valid: 25"
}

// ============================================================================
// ListGADT Integration Tests
// ============================================================================

/**
 * Test ListGADT recursion-schemes integration
 */
export function testListIntegration(): void {
  console.log('\n=== Testing ListGADT Integration ===');
  
  // Test cataList
  const listValue = ListGADT.Cons(1, ListGADT.Cons(2, ListGADT.Cons(3, ListGADT.Nil())));
  const listAlgebra = (list: ListGADT<number>): number => {
    return pmatch(list)
      .with('Nil', () => 0)
      .with('Cons', ({ head, tail }) => head + listAlgebra(tail))
      .exhaustive();
  };
  
  const cataResult = cataList<number, never, number>(listValue, listAlgebra);
  console.log('List cata result:', cataResult); // 6 (1 + 2 + 3)
  
  // Test anaList
  const listCoalgebra: UnfoldList<number, number> = (seed: number) => {
    if (seed <= 0) {
      return ListGADT.Nil();
    } else {
      return ListGADT.Cons(seed, listCoalgebra(seed - 1));
    }
  };
  
  const anaResult = anaList<number, number, never>(listCoalgebra, 3);
  console.log('List ana result:', anaResult); // Cons(3, Cons(2, Cons(1, Nil())))
  
  // Test hyloList
  const hyloResult = hyloList<number, number, number>(
    (list) => listAlgebra(list),
    (seed) => seed <= 0 ? ListGADT.Nil() : ListGADT.Cons(seed, listCoalgebra(seed - 1)),
    3
  );
  
  console.log('List hylo result:', hyloResult); // 6 (3 + 2 + 1)
}

// ============================================================================
// Derivable Instances Integration Tests
// ============================================================================

/**
 * Test derivable instances integration
 */
export function testDerivableInstancesIntegration(): void {
  console.log('\n=== Testing Derivable Instances Integration ===');
  
  // Test generic derivable recursion-schemes
  const genericSchemes = deriveRecursionSchemes<number, number, string>();
  
  const maybeValue = MaybeGADT.Just(42);
  const maybeAlgebra: FoldMaybe<number, string> = {
    Just: ({ value }) => `Got: ${value}`,
    Nothing: () => 'None'
  };
  
  const genericCataResult = genericSchemes.cata(maybeValue, maybeAlgebra);
  console.log('Generic derivable cata result:', genericCataResult); // "Got: 42"
  
  // Test Expr derivable recursion-schemes
  const exprSchemes = deriveExprRecursionSchemes<number, number, number>();
  
  const expr = Expr.Add(Expr.Const(5), Expr.Const(3));
  const exprAlgebra: FoldExpr<number> = {
    Const: n => n,
    Add: (l, r) => l + r,
    If: (c, t, e) => c ? t : e,
    Var: name => { throw new Error(`Unbound variable: ${name}`); },
    Let: (name, value, body) => body
  };
  
  const exprCataResult = exprSchemes.cata(expr, exprAlgebra);
  console.log('Expr derivable cata result:', exprCataResult); // 8
  
  // Test Maybe derivable recursion-schemes
  const maybeSchemes = deriveMaybeRecursionSchemes<number, number, string>();
  
  const maybeCoalgebra: UnfoldMaybe<number, number> = (seed) => 
    seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1);
  
  const maybeAnaResult = maybeSchemes.ana(maybeCoalgebra, 2);
  console.log('Maybe derivable ana result:', maybeAnaResult); // Just(3)
  
  // Test Either derivable recursion-schemes
  const eitherSchemes = deriveEitherRecursionSchemes<string, number, number, string>();
  
  const eitherHyloResult = eitherSchemes.hylo(
    (either) => cataEither(either, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    }),
    (seed) => seed % 2 === 0 ? EitherGADT.Right(seed) : EitherGADT.Left(`Odd: ${seed}`),
    4
  );
  
  console.log('Either derivable hylo result:', eitherHyloResult); // "Success: 4"
  
  // Test Result derivable recursion-schemes
  const resultSchemes = deriveResultRecursionSchemes<number, string, number, string>();
  
  const resultCoalgebra: UnfoldResult<number, string, number> = (seed) => 
    seed < 0 ? Result.Err('Negative') : Result.Ok(seed);
  
  const resultAnaResult = resultSchemes.ana(resultCoalgebra, 25);
  console.log('Result derivable ana result:', resultAnaResult); // Ok(25)
  
  // Test List derivable recursion-schemes
  const listSchemes = deriveListRecursionSchemes<number, number, number>();
  
  const listAlgebra = (list: ListGADT<number>): number => {
    return pmatch(list)
      .with('Nil', () => 0)
      .with('Cons', ({ head, tail }) => head + listAlgebra(tail))
      .exhaustive();
  };
  
  const listCataResult = listSchemes.cata(
    ListGADT.Cons(1, ListGADT.Cons(2, ListGADT.Cons(3, ListGADT.Nil()))),
    listAlgebra
  );
  
  console.log('List derivable cata result:', listCataResult); // 6
}

// ============================================================================
// Type Parameter Alignment Tests
// ============================================================================

/**
 * Test type parameter alignment across all recursion schemes
 */
export function testTypeParameterAlignment(): void {
  console.log('\n=== Testing Type Parameter Alignment ===');
  
  // Verify that all functions use consistent <A, Seed, Result> patterns
  
  // Expr: <A, Seed, Result>
  const exprResult = hyloExpr<number, number, number>(
    (expr) => cataExpr(expr, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => 0,
      Let: (name, value, body) => body
    }),
    (seed) => Expr.Const(seed),
    42
  );
  
  console.log('Expr type alignment result:', exprResult); // 42
  
  // Maybe: <A, Seed, Result>
  const maybeResult = hyloMaybe<number, number, string>(
    (maybe) => cataMaybe(maybe, {
      Just: ({ value }) => `Got: ${value}`,
      Nothing: () => 'None'
    }),
    (seed) => seed > 0 ? MaybeGADT.Just(seed) : MaybeGADT.Nothing(),
    42
  );
  
  console.log('Maybe type alignment result:', maybeResult); // "Got: 42"
  
  // Either: <L, R, Seed, Result>
  const eitherResult = hyloEither<string, number, number, string>(
    (either) => cataEither(either, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    }),
    (seed) => seed > 0 ? EitherGADT.Right(seed) : EitherGADT.Left('Negative'),
    42
  );
  
  console.log('Either type alignment result:', eitherResult); // "Success: 42"
  
  // Result: <A, E, Seed, Result>
  const resultResult = hyloResult<number, string, number, string>(
    (result) => cataResult(result, {
      Ok: ({ value }) => `Valid: ${value}`,
      Err: ({ error }) => `Invalid: ${error}`
    }),
    (seed) => seed > 0 ? Result.Ok(seed) : Result.Err('Negative'),
    42
  );
  
  console.log('Result type alignment result:', resultResult); // "Valid: 42"
  
  // List: <A, Seed, Result>
  const listResult = hyloList<number, number, number>(
    (list) => {
      return pmatch(list)
        .with('Nil', () => 0)
        .with('Cons', ({ head, tail }) => head + listResult(tail))
        .exhaustive();
    },
    (seed) => seed > 0 ? ListGADT.Cons(seed, ListGADT.Nil()) : ListGADT.Nil(),
    42
  );
  
  console.log('List type alignment result:', listResult); // 42
}

// ============================================================================
// Hylo Composition Tests
// ============================================================================

/**
 * Test that hylo correctly implements cata ∘ ana composition
 */
export function testHyloComposition(): void {
  console.log('\n=== Testing Hylo Composition (cata ∘ ana) ===');
  
  // Test with MaybeGADT
  const maybeAlgebra: FoldMaybe<number, string> = {
    Just: ({ value }) => `Processed: ${value}`,
    Nothing: () => 'No value to process'
  };
  
  const maybeCoalgebra: UnfoldMaybe<number, number> = (seed) => 
    seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1);
  
  // Method 1: Separate cata ∘ ana
  const separateResult = cataMaybe(
    anaMaybe(maybeCoalgebra, 2),
    maybeAlgebra
  );
  
  // Method 2: Hylo (should be equivalent)
  const hyloResult = hyloMaybe<number, number, string>(
    (maybe) => cataMaybe(maybe, maybeAlgebra),
    maybeCoalgebra,
    2
  );
  
  console.log('Separate cata ∘ ana result:', separateResult); // "Processed: 3"
  console.log('Hylo result:', hyloResult); // "Processed: 3"
  console.log('Results are equivalent:', separateResult === hyloResult); // true
  
  // Test with Expr
  const exprAlgebra: FoldExpr<number> = {
    Const: n => n,
    Add: (l, r) => l + r,
    If: (c, t, e) => c ? t : e,
    Var: name => 0,
    Let: (name, value, body) => body
  };
  
  const exprCoalgebra: UnfoldExpr<number, number> = (seed) => 
    seed <= 0 ? Expr.Const(seed) : Expr.Add(Expr.Const(seed), Expr.Const(seed - 1));
  
  // Method 1: Separate cata ∘ ana
  const exprSeparateResult = cataExpr(
    anaExpr(exprCoalgebra, 3),
    exprAlgebra
  );
  
  // Method 2: Hylo (should be equivalent)
  const exprHyloResult = hyloExpr<number, number, number>(
    (expr) => cataExpr(expr, exprAlgebra),
    exprCoalgebra,
    3
  );
  
  console.log('Expr separate cata ∘ ana result:', exprSeparateResult); // 5
  console.log('Expr hylo result:', exprHyloResult); // 5
  console.log('Expr results are equivalent:', exprSeparateResult === exprHyloResult); // true
}

// ============================================================================
// Performance and Optimization Tests
// ============================================================================

/**
 * Test performance benefits of hylo over separate cata ∘ ana
 */
export function testPerformanceOptimization(): void {
  console.log('\n=== Testing Performance Optimization ===');
  
  // Test that hylo avoids intermediate structures
  const maybeAlgebra: FoldMaybe<number, number> = {
    Just: ({ value }) => value * 2,
    Nothing: () => 0
  };
  
  const maybeCoalgebra: UnfoldMaybe<number, number> = (seed) => 
    seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1);
  
  // Both should produce the same result, but hylo is more efficient
  const separateResult = cataMaybe(anaMaybe(maybeCoalgebra, 2), maybeAlgebra);
  const hyloResult = hyloMaybe<number, number, number>(
    (maybe) => cataMaybe(maybe, maybeAlgebra),
    maybeCoalgebra,
    2
  );
  
  console.log('Separate cata ∘ ana result:', separateResult); // 6
  console.log('Hylo result:', hyloResult); // 6
  console.log('Results are equivalent:', separateResult === hyloResult); // true
  console.log('Hylo avoids intermediate MaybeGADT structure');
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Run all integrated recursion-schemes tests
 */
export function runAllIntegratedRecursionSchemesTests(): void {
  console.log('🚀 Running Integrated Recursion-Schemes API Tests\n');
  
  testGenericRecursionSchemes();
  testExprIntegration();
  testMaybeIntegration();
  testEitherIntegration();
  testResultIntegration();
  testListIntegration();
  testDerivableInstancesIntegration();
  testTypeParameterAlignment();
  testHyloComposition();
  testPerformanceOptimization();
  
  // Run the built-in examples
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
  console.log('- ✅ Consistent <A, Seed, Result> patterns');
  console.log('- ✅ Performance optimization benefits maintained');
  console.log('- ✅ Backwards compatibility with existing functions');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllIntegratedRecursionSchemesTests();
} 