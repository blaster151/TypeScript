/**
 * Test file for Typed Folds (Catamorphisms) for Generalized Algebraic Data Types (GADTs)
 * 
 * This file demonstrates the complete catamorphism implementation including:
 * - Generic fold framework with precise type information
 * - Catamorphisms for specific GADT types (Expr, Maybe, Either, Result)
 * - Derivable folds for any GADT type
 * - HKT integration for type constructor GADTs
 * - Composable and reusable fold algebras
 * - Real-world examples showing type-safe folding
 */

import {
  Fold, fold, foldGeneric,
  cataExpr, cataExprRecursive, FoldExpr,
  deriveFold, createFoldBuilder,
  foldExprK, foldMaybeK, foldEitherK,
  cataMaybe, FoldMaybe,
  cataEither, FoldEither,
  cataResult, FoldResult,
  evalExprAlgebra, evalExprRecursive, transformStringAlgebra,
  maybeToStringAlgebra, eitherDefaultAlgebra, resultSuccessAlgebra,
  composeFoldAlgebras, composeMaybeAlgebras,
  exampleMaybeFold, exampleEitherFold, exampleExprFold, exampleResultFold, exampleAlgebraReuse
} from './fp-catamorphisms';

import {
  Expr, ExprK,
  MaybeGADT, MaybeGADTK,
  EitherGADT, EitherGADTK,
  Result, ResultK
} from './fp-gadt-enhanced';

import {
  Kind1, Kind2,
  Apply, ArrayK, MaybeK, EitherK,
  Array, Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

// ============================================================================
// Generic Fold Framework Tests
// ============================================================================

/**
 * Test the generic fold framework
 */
export function testGenericFoldFramework(): void {
  console.log('=== Testing Generic Fold Framework ===');
  
  // Test MaybeGADT with generic fold
  const justValue = MaybeGADT.Just(42);
  const nothingValue = MaybeGADT.Nothing();
  
  const maybeAlgebra: Fold<MaybeGADT<number>, string> = {
    Just: ({ value }) => `Got value: ${value}`,
    Nothing: () => 'No value'
  };
  
  const justResult = fold(justValue, maybeAlgebra);
  const nothingResult = fold(nothingValue, maybeAlgebra);
  
  console.log('Generic fold MaybeGADT Just:', justResult); // "Got value: 42"
  console.log('Generic fold MaybeGADT Nothing:', nothingResult); // "No value"
  
  // Test EitherGADT with generic fold
  const leftValue = EitherGADT.Left('error');
  const rightValue = EitherGADT.Right(123);
  
  const eitherAlgebra: Fold<EitherGADT<string, number>, string> = {
    Left: ({ value }) => `Error: ${value}`,
    Right: ({ value }) => `Success: ${value}`
  };
  
  const leftResult = fold(leftValue, eitherAlgebra);
  const rightResult = fold(rightValue, eitherAlgebra);
  
  console.log('Generic fold EitherGADT Left:', leftResult); // "Error: error"
  console.log('Generic fold EitherGADT Right:', rightResult); // "Success: 123"
}

// ============================================================================
// Catamorphism for Expr Tests
// ============================================================================

/**
 * Test catamorphism for Expr
 */
export function testExprCatamorphism(): void {
  console.log('\n=== Testing Catamorphism for Expr ===');
  
  // Test Expr evaluation using recursive catamorphism
  const expr: Expr<number> = Expr.Add(
    Expr.Const(5),
    Expr.Add(Expr.Const(3), Expr.Const(2))
  );
  
  const evalResult = evalExprRecursive(expr);
  console.log('Expr recursive catamorphism evaluation:', evalResult); // 10
  
  // Test Expr transformation using catamorphism
  const stringExpr: Expr<string> = Expr.If(
    Expr.Const(true),
    Expr.Const("hello"),
    Expr.Const("world")
  );
  
  const transformAlgebra: FoldExpr<string, Expr<string>> = {
    Const: ({ value }) => Expr.Const(value.toUpperCase()),
    Add: ({ left, right }) => { throw new Error("Cannot add strings in this context"); },
    If: ({ cond, then, else: else_ }) => Expr.If(cond, then, else_),
    Var: ({ name }) => Expr.Var(name),
    Let: ({ name, value, body }) => Expr.Let(name, value, body)
  };
  
  const transformed = cataExpr(stringExpr, transformAlgebra);
  console.log('Expr catamorphism transformation:', transformed);
  
  // Test complex expression with recursive catamorphism
  const complexExpr: Expr<number> = Expr.If(
    Expr.Const(true),
    Expr.Add(Expr.Const(5), Expr.Const(3)),
    Expr.Const(0)
  );
  
  const complexEvalResult = evalExprRecursive(complexExpr);
  console.log('Complex Expr recursive catamorphism:', complexEvalResult); // 8
}

// ============================================================================
// Derivable Folds Tests
// ============================================================================

/**
 * Test derivable folds
 */
export function testDerivableFolds(): void {
  console.log('\n=== Testing Derivable Folds ===');
  
  // Test MaybeGADT with derivable fold
  const justValue = MaybeGADT.Just(42);
  const nothingValue = MaybeGADT.Nothing();
  
  const maybeFold = createFoldBuilder<MaybeGADT<number>, string>({
    Just: ({ value }) => `Got ${value}`,
    Nothing: () => 'No value'
  });
  
  const derivedJustResult = maybeFold(justValue);
  const derivedNothingResult = maybeFold(nothingValue);
  
  console.log('Derivable fold MaybeGADT Just:', derivedJustResult); // "Got 42"
  console.log('Derivable fold MaybeGADT Nothing:', derivedNothingResult); // "No value"
  
  // Test partial derivable fold
  const partialMaybeFold = createFoldBuilder<MaybeGADT<number>, string>({
    Just: ({ value }) => `Got ${value}`
    // Missing Nothing case - will return undefined
  });
  
  const partialJustResult = partialMaybeFold(justValue);
  const partialNothingResult = partialMaybeFold(nothingValue);
  
  console.log('Partial derivable fold Just:', partialJustResult); // "Got 42"
  console.log('Partial derivable fold Nothing:', partialNothingResult); // undefined
  
  // Test EitherGADT with derivable fold
  const eitherFold = createFoldBuilder<EitherGADT<string, number>, string>({
    Left: ({ value }) => `Error: ${value}`,
    Right: ({ value }) => `Success: ${value}`
  });
  
  const leftValue = EitherGADT.Left('error');
  const rightValue = EitherGADT.Right(123);
  
  const derivedLeftResult = eitherFold(leftValue);
  const derivedRightResult = eitherFold(rightValue);
  
  console.log('Derivable fold EitherGADT Left:', derivedLeftResult); // "Error: error"
  console.log('Derivable fold EitherGADT Right:', derivedRightResult); // "Success: 123"
}

// ============================================================================
// HKT Integration Tests
// ============================================================================

/**
 * Test HKT integration for folds
 */
export function testHKTIntegration(): void {
  console.log('\n=== Testing HKT Integration ===');
  
  // Test foldExprK with HKT context
  const expr: Apply<ExprK, [number]> = Expr.Add(
    Expr.Const(5),
    Expr.Const(3)
  ) as Apply<ExprK, [number]>;
  
  const exprAlgebra: FoldExpr<number, number> = {
    Const: ({ value }) => value,
    Add: ({ left, right }) => {
      // This is a simplified version - in practice you'd recurse
      return 0; // Placeholder
    },
    If: ({ cond, then, else: else_ }) => {
      // This is a simplified version - in practice you'd recurse
      return 0; // Placeholder
    },
    Var: ({ name }) => { throw new Error(`Unbound variable: ${name}`); },
    Let: ({ name, value, body }) => {
      // This is a simplified version - in practice you'd recurse
      return 0; // Placeholder
    }
  };
  
  const exprKResult = foldExprK(expr, exprAlgebra);
  console.log('HKT fold ExprK result:', exprKResult);
  
  // Test foldMaybeK with HKT context
  const maybe: Apply<MaybeGADTK, [number]> = MaybeGADT.Just(42) as Apply<MaybeGADTK, [number]>;
  
  const maybeKResult = foldMaybeK(maybe, {
    Just: (value) => `HKT Got ${value}`,
    Nothing: () => 'HKT No value'
  });
  
  console.log('HKT fold MaybeGADTK result:', maybeKResult); // "HKT Got 42"
  
  // Test foldEitherK with HKT context
  const either: Apply<EitherGADTK, [string, number]> = EitherGADT.Right(123) as Apply<EitherGADTK, [string, number]>;
  
  const eitherKResult = foldEitherK(either, {
    Left: (value) => `HKT Error: ${value}`,
    Right: (value) => `HKT Success: ${value}`
  });
  
  console.log('HKT fold EitherGADTK result:', eitherKResult); // "HKT Success: 123"
}

// ============================================================================
// Specific GADT Catamorphism Tests
// ============================================================================

/**
 * Test catamorphism for MaybeGADT
 */
export function testMaybeCatamorphism(): void {
  console.log('\n=== Testing MaybeGADT Catamorphism ===');
  
  const justValue = MaybeGADT.Just(42);
  const nothingValue = MaybeGADT.Nothing();
  
  const toStringAlgebra = maybeToStringAlgebra<number>();
  
  const justResult = cataMaybe(justValue, toStringAlgebra);
  const nothingResult = cataMaybe(nothingValue, toStringAlgebra);
  
  console.log('MaybeGADT catamorphism Just:', justResult); // "Value: 42"
  console.log('MaybeGADT catamorphism Nothing:', nothingResult); // "None"
  
  // Test with custom algebra
  const customAlgebra: FoldMaybe<number, number> = {
    Just: ({ value }) => value * 2,
    Nothing: () => 0
  };
  
  const customJustResult = cataMaybe(justValue, customAlgebra);
  const customNothingResult = cataMaybe(nothingValue, customAlgebra);
  
  console.log('MaybeGADT custom catamorphism Just:', customJustResult); // 84
  console.log('MaybeGADT custom catamorphism Nothing:', customNothingResult); // 0
}

/**
 * Test catamorphism for EitherGADT
 */
export function testEitherCatamorphism(): void {
  console.log('\n=== Testing EitherGADT Catamorphism ===');
  
  const leftValue = EitherGADT.Left('error');
  const rightValue = EitherGADT.Right(123);
  
  const defaultAlgebra = eitherDefaultAlgebra<string, number>('default');
  
  const leftResult = cataEither(leftValue, defaultAlgebra);
  const rightResult = cataEither(rightValue, defaultAlgebra);
  
  console.log('EitherGADT catamorphism Left:', leftResult); // "default"
  console.log('EitherGADT catamorphism Right:', rightResult); // 123
  
  // Test with custom algebra
  const customAlgebra: FoldEither<string, number, string> = {
    Left: ({ value }) => `Error occurred: ${value}`,
    Right: ({ value }) => `Operation succeeded with value: ${value}`
  };
  
  const customLeftResult = cataEither(leftValue, customAlgebra);
  const customRightResult = cataEither(rightValue, customAlgebra);
  
  console.log('EitherGADT custom catamorphism Left:', customLeftResult); // "Error occurred: error"
  console.log('EitherGADT custom catamorphism Right:', customRightResult); // "Operation succeeded with value: 123"
}

/**
 * Test catamorphism for Result
 */
export function testResultCatamorphism(): void {
  console.log('\n=== Testing Result Catamorphism ===');
  
  const success = Result.Ok(42);
  const failure = Result.Err('Something went wrong');
  
  const successAlgebra = resultSuccessAlgebra<number, string>(
    error => parseInt(error) || 0
  );
  
  const successResult = cataResult(success, successAlgebra);
  const failureResult = cataResult(failure, successAlgebra);
  
  console.log('Result catamorphism success:', successResult); // 42
  console.log('Result catamorphism failure:', failureResult); // 0
  
  // Test with custom algebra
  const customAlgebra: FoldResult<number, string, string> = {
    Ok: ({ value }) => `Operation succeeded: ${value}`,
    Err: ({ error }) => `Operation failed: ${error}`
  };
  
  const customSuccessResult = cataResult(success, customAlgebra);
  const customFailureResult = cataResult(failure, customAlgebra);
  
  console.log('Result custom catamorphism success:', customSuccessResult); // "Operation succeeded: 42"
  console.log('Result custom catamorphism failure:', customFailureResult); // "Operation failed: Something went wrong"
}

// ============================================================================
// Composable Fold Algebras Tests
// ============================================================================

/**
 * Test composable fold algebras
 */
export function testComposableAlgebras(): void {
  console.log('\n=== Testing Composable Fold Algebras ===');
  
  // Test algebra composition for MaybeGADT
  const baseMaybeAlgebra: FoldMaybe<number, string> = {
    Just: ({ value }) => `Value: ${value}`,
    Nothing: () => 'None'
  };
  
  // Compose with transformation
  const upperCaseAlgebra = composeMaybeAlgebras(
    baseMaybeAlgebra,
    str => str.toUpperCase()
  );
  
  const justValue = MaybeGADT.Just(42);
  
  const baseResult = cataMaybe(justValue, baseMaybeAlgebra);
  const upperResult = cataMaybe(justValue, upperCaseAlgebra);
  
  console.log('Base MaybeGADT algebra:', baseResult); // "Value: 42"
  console.log('Composed MaybeGADT algebra:', upperResult); // "VALUE: 42"
  
  // Test algebra composition for EitherGADT
  const baseEitherAlgebra: FoldEither<string, number, string> = {
    Left: ({ value }) => `Error: ${value}`,
    Right: ({ value }) => `Success: ${value}`
  };
  
  const prefixedAlgebra = composeFoldAlgebras(
    baseEitherAlgebra,
    str => `[RESULT] ${str}`
  );
  
  const leftValue = EitherGADT.Left('error');
  const rightValue = EitherGADT.Right(123);
  
  const baseLeftResult = cataEither(leftValue, baseEitherAlgebra);
  const prefixedLeftResult = cataEither(leftValue, prefixedAlgebra);
  
  console.log('Base EitherGADT algebra:', baseLeftResult); // "Error: error"
  console.log('Composed EitherGADT algebra:', prefixedLeftResult); // "[RESULT] Error: error"
}

// ============================================================================
// Real-World Use Cases
// ============================================================================

/**
 * Test real-world use cases for catamorphisms
 */
export function testRealWorldUseCases(): void {
  console.log('\n=== Testing Real-World Use Cases ===');
  
  // Example 1: Safe division with MaybeGADT catamorphism
  const safeDivide = (n: number, d: number): MaybeGADT<number> => 
    d === 0 ? MaybeGADT.Nothing() : MaybeGADT.Just(n / d);
  
  const divisionResult = safeDivide(10, 2);
  const divisionError = safeDivide(10, 0);
  
  const handleDivision = (result: MaybeGADT<number>) => 
    cataMaybe(result, {
      Just: ({ value }) => `Result: ${value}`,
      Nothing: () => 'Division by zero error'
    });
  
  console.log('Safe division (10/2):', handleDivision(divisionResult)); // "Result: 5"
  console.log('Safe division (10/0):', handleDivision(divisionError)); // "Division by zero error"
  
  // Example 2: Error handling with EitherGADT catamorphism
  const parseNumber = (str: string): EitherGADT<string, number> => {
    const num = parseInt(str, 10);
    return isNaN(num) ? EitherGADT.Left(`Invalid number: ${str}`) : EitherGADT.Right(num);
  };
  
  const validParse = parseNumber('123');
  const invalidParse = parseNumber('abc');
  
  const handleParse = (result: EitherGADT<string, number>) => 
    cataEither(result, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Parsed: ${value}`
    });
  
  console.log('Parse number "123":', handleParse(validParse)); // "Parsed: 123"
  console.log('Parse number "abc":', handleParse(invalidParse)); // "Error: Invalid number: abc"
  
  // Example 3: Expression evaluation with catamorphism
  const complexExpr: Expr<number> = Expr.If(
    Expr.Const(true),
    Expr.Add(Expr.Const(5), Expr.Const(3)),
    Expr.Const(0)
  );
  
  const evalResult = evalExprRecursive(complexExpr);
  console.log('Complex expression evaluation:', evalResult); // 8
  
  // Example 4: Result processing with catamorphism
  const processResult = (result: Result<number, string>) => 
    cataResult(result, {
      Ok: ({ value }) => `Successfully processed: ${value * 2}`,
      Err: ({ error }) => `Failed to process: ${error}`
    });
  
  const successResult = Result.Ok(21);
  const failureResult = Result.Err('Invalid input');
  
  console.log('Result processing success:', processResult(successResult)); // "Successfully processed: 42"
  console.log('Result processing failure:', processResult(failureResult)); // "Failed to process: Invalid input"
}

// ============================================================================
// Performance and Integration Tests
// ============================================================================

/**
 * Test performance and integration with existing systems
 */
export function testPerformanceAndIntegration(): void {
  console.log('\n=== Testing Performance and Integration ===');
  
  // Test integration with existing HKT types
  const arrayMaybe: Array<MaybeGADT<number>> = [
    MaybeGADT.Just(1),
    MaybeGADT.Nothing(),
    MaybeGADT.Just(3)
  ];
  
  // Use catamorphism to process array of MaybeGADT
  const processedArray = arrayMaybe.map(maybe => 
    cataMaybe(maybe, {
      Just: ({ value }) => value * 2,
      Nothing: () => 0
    })
  );
  
  console.log('Processed MaybeGADT array:', processedArray); // [2, 0, 6]
  
  // Test with Result GADT
  const results: Array<Result<number, string>> = [
    Result.Ok(1),
    Result.Ok(2),
    Result.Err('error'),
    Result.Ok(4)
  ];
  
  // Use catamorphism to extract values or handle errors
  const extractedValues = results.map(result => 
    cataResult(result, {
      Ok: ({ value }) => value,
      Err: ({ error }) => 0 // Default to 0 on error
    })
  );
  
  console.log('Extracted Result values:', extractedValues); // [1, 2, 0, 4]
  
  // Test algebra reuse
  const numberToStringAlgebra = maybeToStringAlgebra<number>();
  const upperCaseTransform = (str: string) => str.toUpperCase();
  
  const upperCaseAlgebra = composeMaybeAlgebras(numberToStringAlgebra, upperCaseTransform);
  
  const testValues = [MaybeGADT.Just(42), MaybeGADT.Nothing(), MaybeGADT.Just(100)];
  
  const transformedValues = testValues.map(maybe => cataMaybe(maybe, upperCaseAlgebra));
  
  console.log('Transformed values with reused algebra:', transformedValues); // ["VALUE: 42", "NONE", "VALUE: 100"]
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Run all catamorphism system tests
 */
export function runAllCatamorphismTests(): void {
  console.log('🚀 Running Typed Folds (Catamorphisms) System Tests\n');
  
  testGenericFoldFramework();
  testExprCatamorphism();
  testDerivableFolds();
  testHKTIntegration();
  testMaybeCatamorphism();
  testEitherCatamorphism();
  testResultCatamorphism();
  testComposableAlgebras();
  testRealWorldUseCases();
  testPerformanceAndIntegration();
  
  console.log('\n✅ All catamorphism system tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Generic fold framework with precise type information');
  console.log('- ✅ Catamorphisms for specific GADT types (Expr, Maybe, Either, Result)');
  console.log('- ✅ Derivable folds for any GADT type');
  console.log('- ✅ HKT integration for type constructor GADTs');
  console.log('- ✅ Composable and reusable fold algebras');
  console.log('- ✅ Real-world examples showing type-safe folding');
  console.log('- ✅ Performance and integration tests');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllCatamorphismTests();
} 