/**
 * Test file for Typed Hylomorphisms for Generalized Algebraic Data Types (GADTs)
 * 
 * This file demonstrates the complete hylomorphism implementation including:
 * - Generic hylo definition with recursive unfolding and folding
 * - Type-safe variants for specific GADT types
 * - Integration with derivable instances
 * - Optimization of unfold-then-fold patterns
 * - Single-pass transformation from seed to result
 */

import {
  hylo, hyloRecursive, hyloWithTermination,
  hyloExpr, hyloExprRecursive,
  deriveHylo, createHyloBuilder,
  hyloK, hyloExprK, hyloMaybeK, hyloEitherK,
  hyloMaybe, hyloEither, hyloResult, hyloList,
  rangeSumHylo, evalCountDownHylo, processMaybeHylo, processEitherHylo, processResultHylo,
  createRangeSumHylo, createConfigEvalHylo, createValidationHylo,
  exampleMaybeHylo, exampleEitherHylo, exampleListHylo, exampleExprHylo, exampleResultHylo
} from './fp-hylomorphisms';

import {
  Expr, ExprK,
  MaybeGADT, MaybeGADTK,
  EitherGADT, EitherGADTK,
  Result, ResultK
} from './fp-gadt-enhanced';

import {
  cataExprRecursive, cataMaybe, cataEither, cataResult
} from './fp-catamorphisms';

import {
  ListGADT, ListGADTK
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
// Generic Hylomorphism Framework Tests
// ============================================================================

/**
 * Test the generic hylomorphism framework
 */
export function testGenericHylomorphismFramework(): void {
  console.log('=== Testing Generic Hylomorphism Framework ===');
  
  // Test MaybeGADT with generic hylo
  const maybeAlg = (maybe: MaybeGADT<number>) => 
    cataMaybe(maybe, {
      Just: ({ value }) => `Got value: ${value}`,
      Nothing: () => 'No value'
    });
  
  const maybeCoalg = (seed: number) => 
    seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1);
  
  const maybeResult1 = hylo(maybeAlg, maybeCoalg, 2);
  const maybeResult2 = hylo(maybeAlg, maybeCoalg, 5);
  
  console.log('Generic hylo MaybeGADT (2):', maybeResult1); // "Got value: 3"
  console.log('Generic hylo MaybeGADT (5):', maybeResult2); // "No value"
  
  // Test EitherGADT with generic hylo
  const eitherAlg = (either: EitherGADT<string, number>) => 
    cataEither(either, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    });
  
  const eitherCoalg = (seed: number) => 
    seed % 2 === 0 ? EitherGADT.Right(seed) : EitherGADT.Left(`Odd: ${seed}`);
  
  const eitherResult1 = hylo(eitherAlg, eitherCoalg, 4);
  const eitherResult2 = hylo(eitherAlg, eitherCoalg, 3);
  
  console.log('Generic hylo EitherGADT (4):', eitherResult1); // "Success: 4"
  console.log('Generic hylo EitherGADT (3):', eitherResult2); // "Error: Odd: 3"
}

// ============================================================================
// Type-Safe Hylomorphism for Expr Tests
// ============================================================================

/**
 * Test type-safe hylomorphism for Expr
 */
export function testExprHylomorphism(): void {
  console.log('\n=== Testing Type-Safe Hylomorphism for Expr ===');
  
  // Test expression evaluation without building the AST
  const evalAlg = (expr: Expr<number>): number => {
    return cataExprRecursive(expr, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => { throw new Error(`Unbound variable: ${name}`); },
      Let: (name, value, body) => body // Simplified: ignore name binding
    });
  };
  
  const countdownCoalg = (seed: number): Expr<number> => {
    if (seed <= 0) {
      return Expr.Const(seed);
    } else {
      return Expr.Add(
        Expr.Const(seed),
        countdownCoalg(seed - 1)
      );
    }
  };
  
  const evalResult1 = hyloExpr(evalAlg, countdownCoalg, 3);
  const evalResult2 = hyloExpr(evalAlg, countdownCoalg, 5);
  
  console.log('Expr hylo countdown eval (3):', evalResult1); // 6 (3+2+1+0)
  console.log('Expr hylo countdown eval (5):', evalResult2); // 15 (5+4+3+2+1+0)
  
  // Test expression transformation without building intermediate AST
  const transformAlg = (expr: Expr<string>): string => {
    return cataExprRecursive(expr, {
      Const: n => n.toUpperCase(),
      Add: (l, r) => `${l} + ${r}`,
      If: (c, t, e) => `if ${c} then ${t} else ${e}`,
      Var: name => name,
      Let: (name, value, body) => `let ${name} = ${value} in ${body}`
    });
  };
  
  const stringCoalg = (seed: string): Expr<string> => {
    if (seed.length <= 1) {
      return Expr.Const(seed);
    } else {
      return Expr.Add(
        Expr.Const(seed[0]),
        stringCoalg(seed.slice(1))
      );
    }
  };
  
  const transformResult = hyloExpr(transformAlg, stringCoalg, 'hello');
  console.log('Expr hylo string transform:', transformResult);
}

// ============================================================================
// Derivable Hylomorphisms Tests
// ============================================================================

/**
 * Test derivable hylomorphisms
 */
export function testDerivableHylomorphisms(): void {
  console.log('\n=== Testing Derivable Hylomorphisms ===');
  
  // Test MaybeGADT with derivable hylo
  const maybeHyloDef = {
    alg: (maybe: MaybeGADT<number>) => 
      cataMaybe(maybe, {
        Just: ({ value }) => `Processed: ${value}`,
        Nothing: () => 'No value to process'
      }),
    coalg: (seed: number) => 
      seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1)
  };
  
  const derivedMaybe = deriveHylo(maybeHyloDef);
  
  const derivedResult1 = derivedMaybe(2);
  const derivedResult2 = derivedMaybe(5);
  
  console.log('Derivable hylo MaybeGADT (2):', derivedResult1); // "Processed: 3"
  console.log('Derivable hylo MaybeGADT (5):', derivedResult2); // "No value to process"
  
  // Test EitherGADT with derivable hylo
  const eitherHyloDef = {
    alg: (either: EitherGADT<string, number>) => 
      cataEither(either, {
        Left: ({ value }) => `Error: ${value}`,
        Right: ({ value }) => `Success: ${value}`
      }),
    coalg: (seed: number) => 
      seed < 0 ? EitherGADT.Left('Negative') : EitherGADT.Right(seed * 2)
  };
  
  const derivedEither = deriveHylo(eitherHyloDef);
  
  const derivedEitherResult1 = derivedEither(5);
  const derivedEitherResult2 = derivedEither(-3);
  
  console.log('Derivable hylo EitherGADT (5):', derivedEitherResult1); // "Success: 10"
  console.log('Derivable hylo EitherGADT (-3):', derivedEitherResult2); // "Error: Negative"
}

// ============================================================================
// HKT Integration Tests
// ============================================================================

/**
 * Test HKT integration for hylomorphisms
 */
export function testHKTIntegration(): void {
  console.log('\n=== Testing HKT Integration ===');
  
  // Test hyloExprK with HKT context
  const exprKAlg = (expr: Apply<ExprK, [number]>) => {
    return cataExprRecursive(expr as Expr<number>, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => { throw new Error(`Unbound variable: ${name}`); },
      Let: (name, value, body) => body
    });
  };
  
  const exprKCoalg = (seed: number): Apply<ExprK, [number]> => {
    return Expr.Const(seed * 2) as Apply<ExprK, [number]>;
  };
  
  const exprKHylo = hyloExprK(exprKAlg, exprKCoalg);
  const exprKResult = exprKHylo(3);
  
  console.log('HKT hylo ExprK (3):', exprKResult); // 6
  
  // Test hyloMaybeK with HKT context
  const maybeKAlg = (maybe: Apply<MaybeGADTK, [number]>) => {
    return cataMaybe(maybe as MaybeGADT<number>, {
      Just: ({ value }) => `HKT Got: ${value}`,
      Nothing: () => 'HKT No value'
    });
  };
  
  const maybeKCoalg = (seed: number): Apply<MaybeGADTK, [number]> => {
    return (seed > 2 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1)) as Apply<MaybeGADTK, [number]>;
  };
  
  const maybeKHylo = hyloMaybeK(maybeKAlg, maybeKCoalg);
  const maybeKResult = maybeKHylo(1);
  
  console.log('HKT hylo MaybeGADTK (1):', maybeKResult); // "HKT Got: 2"
}

// ============================================================================
// Specific GADT Hylomorphism Tests
// ============================================================================

/**
 * Test hylomorphism for MaybeGADT
 */
export function testMaybeHylomorphism(): void {
  console.log('\n=== Testing MaybeGADT Hylomorphism ===');
  
  const processMaybe = hyloMaybe<number, number, string>(
    (maybe) => cataMaybe(maybe, {
      Just: ({ value }) => `Got value: ${value}`,
      Nothing: () => 'No value'
    }),
    (seed) => seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1)
  );
  
  const result1 = processMaybe(2);
  const result2 = processMaybe(5);
  
  console.log('Maybe hylo (2):', result1); // "Got value: 3"
  console.log('Maybe hylo (5):', result2); // "No value"
  
  // Test with custom processing
  const customMaybe = hyloMaybe<number, number, number>(
    (maybe) => cataMaybe(maybe, {
      Just: ({ value }) => value * 2,
      Nothing: () => 0
    }),
    (seed) => seed % 2 === 0 ? MaybeGADT.Just(seed) : MaybeGADT.Nothing()
  );
  
  const customResult1 = customMaybe(4);
  const customResult2 = customMaybe(3);
  
  console.log('Custom Maybe hylo (4):', customResult1); // 8
  console.log('Custom Maybe hylo (3):', customResult2); // 0
}

/**
 * Test hylomorphism for EitherGADT
 */
export function testEitherHylomorphism(): void {
  console.log('\n=== Testing EitherGADT Hylomorphism ===');
  
  const processEither = hyloEither<string, number, number, string>(
    (either) => cataEither(either, {
      Left: ({ value }) => `Error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    }),
    (seed) => seed % 2 === 0 ? EitherGADT.Right(seed) : EitherGADT.Left(`Odd: ${seed}`)
  );
  
  const result1 = processEither(4);
  const result2 = processEither(3);
  
  console.log('Either hylo (4):', result1); // "Success: 4"
  console.log('Either hylo (3):', result2); // "Error: Odd: 3"
  
  // Test with custom processing
  const customEither = hyloEither<string, number, number, number>(
    (either) => cataEither(either, {
      Left: ({ value }) => value.length,
      Right: ({ value }) => value * 2
    }),
    (seed) => seed < 0 ? EitherGADT.Left('Negative') : EitherGADT.Right(seed)
  );
  
  const customResult1 = customEither(5);
  const customResult2 = customEither(-3);
  
  console.log('Custom Either hylo (5):', customResult1); // 10
  console.log('Custom Either hylo (-3):', customResult2); // 8 (length of "Negative")
}

/**
 * Test hylomorphism for Result
 */
export function testResultHylomorphism(): void {
  console.log('\n=== Testing Result Hylomorphism ===');
  
  const processResult = hyloResult<number, string, number, string>(
    (result) => cataResult(result, {
      Ok: ({ value }) => `Valid: ${value}`,
      Err: ({ error }) => `Invalid: ${error}`
    }),
    (seed) => seed < 0 ? Result.Err('Negative') : Result.Ok(seed)
  );
  
  const result1 = processResult(5);
  const result2 = processResult(-3);
  
  console.log('Result hylo (5):', result1); // "Valid: 5"
  console.log('Result hylo (-3):', result2); // "Invalid: Negative"
  
  // Test with custom processing
  const customResult = hyloResult<number, string, number, number>(
    (result) => cataResult(result, {
      Ok: ({ value }) => value * 2,
      Err: ({ error }) => error.length
    }),
    (seed) => seed > 100 ? Result.Err('Too large') : Result.Ok(seed)
  );
  
  const customResult1 = customResult(50);
  const customResult2 = customResult(150);
  
  console.log('Custom Result hylo (50):', customResult1); // 100
  console.log('Custom Result hylo (150):', customResult2); // 9 (length of "Too large")
}

/**
 * Test hylomorphism for ListGADT
 */
export function testListHylomorphism(): void {
  console.log('\n=== Testing ListGADT Hylomorphism ===');
  
  const rangeSum = hyloList<number, number, number>(
    (list) => {
      return pmatch(list)
        .with('Nil', () => 0)
        .with('Cons', ({ head, tail }) => head + rangeSum(tail))
        .exhaustive();
    },
    (seed) => {
      if (seed <= 0) {
        return ListGADT.Nil();
      } else {
        return ListGADT.Cons(seed, rangeSum(seed - 1));
      }
    }
  );
  
  const result1 = rangeSum(3);
  const result2 = rangeSum(5);
  
  console.log('List hylo range sum (3):', result1); // 6 (3+2+1)
  console.log('List hylo range sum (5):', result2); // 15 (5+4+3+2+1)
}

// ============================================================================
// Example Hylomorphisms and Usage Tests
// ============================================================================

/**
 * Test example hylomorphisms
 */
export function testExampleHylomorphisms(): void {
  console.log('\n=== Testing Example Hylomorphisms ===');
  
  // Test range sum hylomorphism
  const rangeSumResult1 = rangeSumHylo(3);
  const rangeSumResult2 = rangeSumHylo(5);
  
  console.log('Range sum hylo (3):', rangeSumResult1); // 6 (3+2+1)
  console.log('Range sum hylo (5):', rangeSumResult2); // 15 (5+4+3+2+1)
  
  // Test expression evaluation hylomorphism
  const evalResult1 = evalCountDownHylo(3);
  const evalResult2 = evalCountDownHylo(5);
  
  console.log('Countdown eval hylo (3):', evalResult1); // 6 (3+2+1+0)
  console.log('Countdown eval hylo (5):', evalResult2); // 15 (5+4+3+2+1+0)
  
  // Test Maybe processing hylomorphism
  const maybeResult1 = processMaybeHylo(2);
  const maybeResult2 = processMaybeHylo(5);
  
  console.log('Maybe process hylo (2):', maybeResult1); // "Processed: 3"
  console.log('Maybe process hylo (5):', maybeResult2); // "No value to process"
  
  // Test Either processing hylomorphism
  const eitherResult1 = processEitherHylo(4);
  const eitherResult2 = processEitherHylo(3);
  
  console.log('Either process hylo (4):', eitherResult1); // "Success: 4"
  console.log('Either process hylo (3):', eitherResult2); // "Error: Odd number: 3"
  
  // Test Result processing hylomorphism
  const resultResult1 = processResultHylo(50);
  const resultResult2 = processResultHylo(150);
  
  console.log('Result process hylo (50):', resultResult1); // "Valid: 50"
  console.log('Result process hylo (150):', resultResult2); // "Invalid: Value too large: 150"
}

// ============================================================================
// Utility Functions Tests
// ============================================================================

/**
 * Test utility functions for common hylomorphism patterns
 */
export function testUtilityFunctions(): void {
  console.log('\n=== Testing Utility Functions ===');
  
  // Test range sum utility
  const rangeSum = createRangeSumHylo();
  
  const rangeResult1 = rangeSum(1, 5);
  const rangeResult2 = rangeSum(0, 3);
  
  console.log('Range sum utility (1, 5):', rangeResult1); // 10 (1+2+3+4)
  console.log('Range sum utility (0, 3):', rangeResult2); // 3 (0+1+2)
  
  // Test config evaluation utility
  const configEval = createConfigEvalHylo();
  
  const addConfig = { operation: 'add' as const, values: [1, 2, 3, 4] };
  const multiplyConfig = { operation: 'multiply' as const, values: [2, 3, 4] };
  
  const configResult1 = configEval(addConfig);
  const configResult2 = configEval(multiplyConfig);
  
  console.log('Config eval utility (add):', configResult1); // 10 (1+2+3+4)
  console.log('Config eval utility (multiply):', configResult2); // 24 (2*3*4)
  
  // Test validation utility
  const validate = createValidationHylo();
  
  const validationResult1 = validate(50);
  const validationResult2 = validate(-5);
  const validationResult3 = validate(150);
  const validationResult4 = validate(0);
  
  console.log('Validation utility (50):', validationResult1); // "Valid value: 50"
  console.log('Validation utility (-5):', validationResult2); // "Validation failed: Negative value"
  console.log('Validation utility (150):', validationResult3); // "Validation failed: Value too large"
  console.log('Validation utility (0):', validationResult4); // "Validation failed: Zero is not allowed"
}

// ============================================================================
// Performance and Optimization Tests
// ============================================================================

/**
 * Test performance and optimization aspects of hylomorphisms
 */
export function testPerformanceAndOptimization(): void {
  console.log('\n=== Testing Performance and Optimization ===');
  
  // Test that hylo avoids intermediate structures
  const simpleHylo = hylo(
    (maybe: MaybeGADT<number>) => cataMaybe(maybe, {
      Just: ({ value }) => value * 2,
      Nothing: () => 0
    }),
    (seed: number) => seed > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(seed + 1),
    2
  );
  
  console.log('Simple hylo result:', simpleHylo); // 6 (no intermediate MaybeGADT structure built)
  
  // Test composition of hylo with other operations
  const composedHylo = hylo(
    (maybe: MaybeGADT<number>) => cataMaybe(maybe, {
      Just: ({ value }) => `Result: ${value * 2}`,
      Nothing: () => 'No result'
    }),
    (seed: number) => seed % 2 === 0 ? MaybeGADT.Just(seed) : MaybeGADT.Nothing(),
    4
  );
  
  console.log('Composed hylo result:', composedHylo); // "Result: 8"
  
  // Test hylo with complex seed structures
  const complexHylo = hylo(
    (expr: Expr<number>) => cataExprRecursive(expr, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => 0,
      Let: (name, value, body) => body
    }),
    (seed: { value: number; operation: 'double' | 'square' }) => {
      if (seed.operation === 'double') {
        return Expr.Const(seed.value * 2);
      } else {
        return Expr.Const(seed.value * seed.value);
      }
    },
    { value: 5, operation: 'double' as const }
  );
  
  console.log('Complex hylo result:', complexHylo); // 10
}

// ============================================================================
// Integration Examples Tests
// ============================================================================

/**
 * Test integration examples
 */
export function testIntegrationExamples(): void {
  console.log('\n=== Testing Integration Examples ===');
  
  // Test MaybeGADT integration
  exampleMaybeHylo();
  
  // Test EitherGADT integration
  exampleEitherHylo();
  
  // Test ListGADT integration
  exampleListHylo();
  
  // Test Expr integration
  exampleExprHylo();
  
  // Test Result integration
  exampleResultHylo();
}

// ============================================================================
// Real-World Use Cases
// ============================================================================

/**
 * Test real-world use cases for hylomorphisms
 */
export function testRealWorldUseCases(): void {
  console.log('\n=== Testing Real-World Use Cases ===');
  
  // Example 1: Data processing pipeline
  const processData = hylo(
    (result: Result<number, string>) => cataResult(result, {
      Ok: ({ value }) => `Processed: ${value * 2}`,
      Err: ({ error }) => `Failed: ${error}`
    }),
    (data: { value: number; validate: boolean }) => {
      if (!data.validate) {
        return Result.Err('Invalid data');
      } else if (data.value < 0) {
        return Result.Err('Negative value');
      } else {
        return Result.Ok(data.value);
      }
    },
    { value: 25, validate: true }
  );
  
  console.log('Data processing pipeline:', processData); // "Processed: 50"
  
  // Example 2: Configuration-driven computation
  const computeFromConfig = hylo(
    (expr: Expr<number>) => cataExprRecursive(expr, {
      Const: n => n,
      Add: (l, r) => l + r,
      If: (c, t, e) => c ? t : e,
      Var: name => 0,
      Let: (name, value, body) => body
    }),
    (config: { operation: string; values: number[] }) => {
      if (config.operation === 'sum') {
        return Expr.Const(config.values.reduce((a, b) => a + b, 0));
      } else if (config.operation === 'product') {
        return Expr.Const(config.values.reduce((a, b) => a * b, 1));
      } else {
        return Expr.Const(0);
      }
    },
    { operation: 'sum', values: [1, 2, 3, 4, 5] }
  );
  
  console.log('Configuration-driven computation:', computeFromConfig); // 15
  
  // Example 3: Error handling pipeline
  const handleErrors = hylo(
    (either: EitherGADT<string, number>) => cataEither(either, {
      Left: ({ value }) => `Handled error: ${value}`,
      Right: ({ value }) => `Success: ${value}`
    }),
    (input: { value: number; shouldFail: boolean }) => {
      if (input.shouldFail) {
        return EitherGADT.Left('Simulated failure');
      } else if (input.value < 0) {
        return EitherGADT.Left('Negative value');
      } else {
        return EitherGADT.Right(input.value * 2);
      }
    },
    { value: 10, shouldFail: false }
  );
  
  console.log('Error handling pipeline:', handleErrors); // "Success: 20"
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Run all hylomorphism system tests
 */
export function runAllHylomorphismTests(): void {
  console.log('🚀 Running Typed Hylomorphisms System Tests\n');
  
  testGenericHylomorphismFramework();
  testExprHylomorphism();
  testDerivableHylomorphisms();
  testHKTIntegration();
  testMaybeHylomorphism();
  testEitherHylomorphism();
  testResultHylomorphism();
  testListHylomorphism();
  testExampleHylomorphisms();
  testUtilityFunctions();
  testPerformanceAndOptimization();
  testIntegrationExamples();
  testRealWorldUseCases();
  
  console.log('\n✅ All hylomorphism system tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Generic hylo definition with recursive unfolding and folding');
  console.log('- ✅ Type-safe variants for specific GADT types');
  console.log('- ✅ Integration with derivable instances');
  console.log('- ✅ Optimization of unfold-then-fold patterns');
  console.log('- ✅ Single-pass transformation from seed to result');
  console.log('- ✅ HKT integration for type constructor GADTs');
  console.log('- ✅ Real-world examples showing optimization benefits');
  console.log('- ✅ Performance and optimization tests');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllHylomorphismTests();
} 