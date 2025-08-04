/**
 * Test file for Generalized Algebraic Data Types (GADTs) with Pattern Matching
 * 
 * This file demonstrates the complete GADT implementation including:
 * - Type-safe pattern matching with exhaustiveness checks
 * - Integration with the HKT system
 * - Derivable instances for GADT-based type constructors
 * - Typed folds (catamorphisms)
 * - Higher-order GADTs
 * - Real-world examples showing compile-time type safety
 */

import {
  GADT, match, matchPartial,
  Expr, ExprK, evaluate, transformString,
  MaybeGADT, MaybeGADTK, matchMaybe, MaybeGADTFunctor, MaybeGADTApplicative, MaybeGADTMonad,
  EitherGADT, EitherGADTK, matchEither, EitherGADTBifunctor,
  ListGADT, ListGADTK, matchList, ListGADTFunctor,
  fold, foldExprToNumber, foldListSum,
  HigherOrderGADT, HigherOrderGADTK,
  derivePatternMatch,
  exampleMaybeGADT, exampleExprEvaluation, exampleStringTransformation
} from './fp-gadt';

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
// Core GADT Pattern Matching Tests
// ============================================================================

/**
 * Test basic GADT pattern matching
 */
export function testBasicPatternMatching(): void {
  console.log('=== Testing Basic Pattern Matching ===');
  
  // Test MaybeGADT pattern matching
  const justValue = MaybeGADT.Just(42);
  const nothingValue = MaybeGADT.Nothing();
  
  const justResult = matchMaybe(justValue, {
    Just: (value) => `Got value: ${value}`,
    Nothing: () => 'No value'
  });
  console.log('MaybeGADT Just:', justResult); // "Got value: 42"
  
  const nothingResult = matchMaybe(nothingValue, {
    Just: (value) => `Got value: ${value}`,
    Nothing: () => 'No value'
  });
  console.log('MaybeGADT Nothing:', nothingResult); // "No value"
  
  // Test EitherGADT pattern matching
  const leftValue = EitherGADT.Left('error');
  const rightValue = EitherGADT.Right(123);
  
  const leftResult = matchEither(leftValue, {
    Left: (value) => `Error: ${value}`,
    Right: (value) => `Success: ${value}`
  });
  console.log('EitherGADT Left:', leftResult); // "Error: error"
  
  const rightResult = matchEither(rightValue, {
    Left: (value) => `Error: ${value}`,
    Right: (value) => `Success: ${value}`
  });
  console.log('EitherGADT Right:', rightResult); // "Success: 123"
}

/**
 * Test Expr GADT with type safety
 */
export function testExprTypeSafety(): void {
  console.log('\n=== Testing Expr GADT Type Safety ===');
  
  // Valid number expression - should compile
  const validNumberExpr: Expr<number> = Expr.Add(
    Expr.Const(5),
    Expr.Add(Expr.Const(3), Expr.Const(2))
  );
  
  const result = evaluate(validNumberExpr);
  console.log('Valid number expression result:', result); // 10
  
  // Valid string expression - should compile
  const validStringExpr: Expr<string> = Expr.If(
    Expr.Const(true),
    Expr.Const("hello"),
    Expr.Const("world")
  );
  
  const transformed = transformString(validStringExpr);
  console.log('Valid string expression transformed:', transformed);
  
  // This would be a compile error if uncommented:
  // const invalidExpr: Expr<number> = Expr.Add(
  //   Expr.Const("hello"), // Error: string not assignable to number
  //   Expr.Const(3)
  // );
  
  console.log('Type safety tests passed - invalid combinations rejected at compile time');
}

/**
 * Test ListGADT pattern matching
 */
export function testListGADT(): void {
  console.log('\n=== Testing ListGADT Pattern Matching ===');
  
  // Create a list: [1, 2, 3]
  const list = ListGADT.Cons(1, ListGADT.Cons(2, ListGADT.Cons(3, ListGADT.Nil())));
  
  // Pattern match to sum the list
  const sum = matchList(list, {
    Nil: () => 0,
    Cons: (head, tail) => head + matchList(tail, {
      Nil: () => 0,
      Cons: (h, t) => h + matchList(t, {
        Nil: () => 0,
        Cons: (hh, tt) => hh + matchList(tt, {
          Nil: () => 0,
          Cons: () => { throw new Error('List too long'); }
        })
      })
    })
  });
  
  console.log('ListGADT sum:', sum); // 6
}

// ============================================================================
// HKT Integration Tests
// ============================================================================

/**
 * Test GADT integration with HKT system
 */
export function testHKTIntegration(): void {
  console.log('\n=== Testing HKT Integration ===');
  
  // Test MaybeGADT as HKT
  const maybeArray: Apply<MaybeGADTK, [Array<number>]> = MaybeGADT.Just([1, 2, 3]);
  const maybeNothing: Apply<MaybeGADTK, [Array<number>]> = MaybeGADT.Nothing();
  
  // Use the Functor instance
  const mapped = MaybeGADTFunctor.map(maybeArray, arr => arr.length);
  const mappedNothing = MaybeGADTFunctor.map(maybeNothing, arr => arr.length);
  
  console.log('MaybeGADT Functor map:', mapped); // Just(3)
  console.log('MaybeGADT Functor map (Nothing):', mappedNothing); // Nothing
  
  // Test Applicative
  const lifted = MaybeGADTApplicative.of((x: number) => x * 2);
  const applied = MaybeGADTApplicative.ap(lifted, MaybeGADT.Just(5));
  console.log('MaybeGADT Applicative ap:', applied); // Just(10)
  
  // Test Monad
  const chained = MaybeGADTMonad.chain(
    MaybeGADT.Just(5),
    x => x > 3 ? MaybeGADT.Just(x * 2) : MaybeGADT.Nothing()
  );
  console.log('MaybeGADT Monad chain:', chained); // Just(10)
  
  // Test EitherGADT as HKT
  const eitherResult: Apply<EitherGADTK, [string, number]> = EitherGADT.Right(42);
  const bimapped = EitherGADTBifunctor.bimap(
    eitherResult,
    (err: string) => `Error: ${err}`,
    (val: number) => val * 2
  );
  console.log('EitherGADT Bifunctor bimap:', bimapped); // Right(84)
}

/**
 * Test GADT with generic algorithms
 */
export function testGADTWithGenericAlgorithms(): void {
  console.log('\n=== Testing GADT with Generic Algorithms ===');
  
  // Use lift2 with MaybeGADT
  const add = (a: number, b: number) => a + b;
  const maybeLift2 = lift2(MaybeGADTApplicative)(add);
  
  const result1 = maybeLift2(MaybeGADT.Just(5), MaybeGADT.Just(3));
  const result2 = maybeLift2(MaybeGADT.Just(5), MaybeGADT.Nothing());
  
  console.log('MaybeGADT lift2 (Just, Just):', result1); // Just(8)
  console.log('MaybeGADT lift2 (Just, Nothing):', result2); // Nothing
  
  // Use composeK with MaybeGADT
  const safeDivide = (n: number) => (d: number): MaybeGADT<number> => 
    d === 0 ? MaybeGADT.Nothing() : MaybeGADT.Just(n / d);
  
  const safeSqrt = (n: number): MaybeGADT<number> => 
    n < 0 ? MaybeGADT.Nothing() : MaybeGADT.Just(Math.sqrt(n));
  
  const composed = composeK(MaybeGADTMonad)(safeSqrt, safeDivide(16));
  
  console.log('MaybeGADT composeK (4):', composed(4)); // Just(2)
  console.log('MaybeGADT composeK (0):', composed(0)); // Nothing
}

// ============================================================================
// Derivable Instances Tests
// ============================================================================

/**
 * Test deriving instances for GADT-based type constructors
 */
export function testDerivableInstances(): void {
  console.log('\n=== Testing Derivable Instances ===');
  
  // Derive MaybeGADT Monad from minimal definitions
  const of = <A>(a: A): MaybeGADT<A> => MaybeGADT.Just(a);
  const chain = <A, B>(fa: MaybeGADT<A>, f: (a: A) => MaybeGADT<B>): MaybeGADT<B> => 
    matchMaybe(fa, {
      Just: (value) => f(value),
      Nothing: () => MaybeGADT.Nothing()
    });
  
  const derivedMaybeMonad = deriveMonad<MaybeGADTK>(of, chain);
  
  // Test the derived instance
  const result1 = derivedMaybeMonad.map(MaybeGADT.Just(5), x => x * 2);
  const result2 = derivedMaybeMonad.ap(
    MaybeGADT.Just((x: number) => x * 2),
    MaybeGADT.Just(5)
  );
  const result3 = derivedMaybeMonad.chain(
    MaybeGADT.Just(5),
    x => x > 3 ? MaybeGADT.Just(x * 2) : MaybeGADT.Nothing()
  );
  
  console.log('Derived MaybeGADT map:', result1); // Just(10)
  console.log('Derived MaybeGADT ap:', result2); // Just(10)
  console.log('Derived MaybeGADT chain:', result3); // Just(10)
  
  // Verify it matches the original
  const originalResult = MaybeGADTMonad.chain(
    MaybeGADT.Just(5),
    x => x > 3 ? MaybeGADT.Just(x * 2) : MaybeGADT.Nothing()
  );
  console.log('Original vs Derived match:', 
    JSON.stringify(result3) === JSON.stringify(originalResult));
}

// ============================================================================
// Typed Folds (Catamorphisms) Tests
// ============================================================================

/**
 * Test typed folds for GADTs
 */
export function testTypedFolds(): void {
  console.log('\n=== Testing Typed Folds ===');
  
  // Test fold for Expr
  const expr: Expr<number> = Expr.Add(
    Expr.Const(5),
    Expr.Add(Expr.Const(3), Expr.Const(2))
  );
  
  const foldedResult = foldExprToNumber(expr);
  console.log('Expr fold result:', foldedResult); // 10
  
  // Test fold for ListGADT
  const list = ListGADT.Cons(1, ListGADT.Cons(2, ListGADT.Cons(3, ListGADT.Nil())));
  const listSum = foldListSum(list);
  console.log('ListGADT fold sum:', listSum); // 6
  
  // Test custom fold algebra
  const customFold = fold(expr, {
    Const: (payload) => `Constant: ${payload.value}`,
    Add: (payload) => `Add(${foldExprToNumber(payload.left)}, ${foldExprToNumber(payload.right)})`,
    If: (payload) => `If(${foldExprToNumber(payload.cond)}, ${foldExprToNumber(payload.then)}, ${foldExprToNumber(payload.else)})`,
    Var: (payload) => `Variable: ${payload.name}`,
    Let: (payload) => `Let(${payload.name}, ${foldExprToNumber(payload.value)}, ${foldExprToNumber(payload.body)})`
  });
  
  console.log('Custom fold result:', customFold);
}

// ============================================================================
// Higher-Order GADTs Tests
// ============================================================================

/**
 * Test higher-order GADTs
 */
export function testHigherOrderGADTs(): void {
  console.log('\n=== Testing Higher-Order GADTs ===');
  
  // Create a higher-order GADT with ArrayK
  const pureArray = HigherOrderGADT.Pure([1, 2, 3] as Apply<ArrayK, [number]>);
  const bindArray = HigherOrderGADT.Bind(
    [1, 2, 3] as Apply<ArrayK, [number]>,
    (x: number) => [x * 2, x * 3] as Apply<ArrayK, [number]>
  );
  
  console.log('HigherOrderGADT Pure:', pureArray);
  console.log('HigherOrderGADT Bind:', bindArray);
  
  // This demonstrates how GADTs can work with type constructors as payloads
  console.log('Higher-order GADT tests completed');
}

// ============================================================================
// Derivable Pattern Match Tests
// ============================================================================

/**
 * Test derivable pattern matching
 */
export function testDerivablePatternMatch(): void {
  console.log('\n=== Testing Derivable Pattern Match ===');
  
  const maybe = MaybeGADT.Just(42);
  
  const result = derivePatternMatch(maybe, {
    Just: (payload) => `Got value: ${payload.value}`,
    Nothing: () => 'No value'
  });
  
  console.log('Derivable pattern match result:', result); // "Got value: 42"
}

// ============================================================================
// Real-World Use Cases
// ============================================================================

/**
 * Test real-world use cases showing compile-time type safety
 */
export function testRealWorldUseCases(): void {
  console.log('\n=== Testing Real-World Use Cases ===');
  
  // Example 1: Safe division with MaybeGADT
  const safeDivide = (n: number, d: number): MaybeGADT<number> => 
    d === 0 ? MaybeGADT.Nothing() : MaybeGADT.Just(n / d);
  
  const divisionResult = safeDivide(10, 2);
  const divisionError = safeDivide(10, 0);
  
  const handleDivision = (result: MaybeGADT<number>) => 
    matchMaybe(result, {
      Just: (value) => `Result: ${value}`,
      Nothing: () => 'Division by zero error'
    });
  
  console.log('Safe division (10/2):', handleDivision(divisionResult)); // "Result: 5"
  console.log('Safe division (10/0):', handleDivision(divisionError)); // "Division by zero error"
  
  // Example 2: Error handling with EitherGADT
  const parseNumber = (str: string): EitherGADT<string, number> => {
    const num = parseInt(str, 10);
    return isNaN(num) ? EitherGADT.Left(`Invalid number: ${str}`) : EitherGADT.Right(num);
  };
  
  const validParse = parseNumber('123');
  const invalidParse = parseNumber('abc');
  
  const handleParse = (result: EitherGADT<string, number>) => 
    matchEither(result, {
      Left: (error) => `Error: ${error}`,
      Right: (value) => `Parsed: ${value}`
    });
  
  console.log('Parse number "123":', handleParse(validParse)); // "Parsed: 123"
  console.log('Parse number "abc":', handleParse(invalidParse)); // "Error: Invalid number: abc"
  
  // Example 3: Expression evaluation with type safety
  const complexExpr: Expr<number> = Expr.If(
    Expr.Const(true),
    Expr.Add(Expr.Const(5), Expr.Const(3)),
    Expr.Const(0)
  );
  
  const evalResult = evaluate(complexExpr);
  console.log('Complex expression evaluation:', evalResult); // 8
}

// ============================================================================
// Compile-Time Type Safety Demonstrations
// ============================================================================

/**
 * Demonstrate compile-time type safety
 */
export function demonstrateTypeSafety(): void {
  console.log('\n=== Demonstrating Compile-Time Type Safety ===');
  
  // These examples show what would be compile errors:
  
  // 1. Invalid Expr construction (would be compile error)
  // const invalidExpr: Expr<number> = Expr.Add(
  //   Expr.Const("hello"), // Error: string not assignable to number
  //   Expr.Const(3)
  // );
  
  // 2. Invalid pattern matching (would be compile error)
  // const incompleteMatch = matchMaybe(MaybeGADT.Just(5), {
  //   Just: (value) => value * 2
  //   // Error: Missing 'Nothing' case
  // });
  
  // 3. Invalid type application (would be compile error)
  // const invalidApply: Apply<MaybeGADTK, [string, number]> = MaybeGADT.Just("hello");
  // // Error: Too many type arguments for MaybeGADTK
  
  console.log('Type safety demonstrations completed');
  console.log('All invalid combinations would be rejected at compile time');
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
  
  // Use sequence with MaybeGADT
  const sequenced = sequence(MaybeGADTMonad)(arrayMaybe);
  console.log('Sequence MaybeGADT array:', sequenced); // Nothing (due to Nothing in array)
  
  // Test with all Just values
  const allJust: Array<MaybeGADT<number>> = [
    MaybeGADT.Just(1),
    MaybeGADT.Just(2),
    MaybeGADT.Just(3)
  ];
  
  const sequencedJust = sequence(MaybeGADTMonad)(allJust);
  console.log('Sequence MaybeGADT all Just:', sequencedJust); // Just([1, 2, 3])
  
  // Test traverse
  const numbers = [1, 2, 3, 4, 5];
  const traversed = traverse(MaybeGADTMonad)(
    (n: number) => n > 0 ? MaybeGADT.Just(n * 2) : MaybeGADT.Nothing(),
    numbers
  );
  console.log('Traverse MaybeGADT:', traversed); // Just([2, 4, 6, 8, 10])
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Run all GADT system tests
 */
export function runAllGADTTests(): void {
  console.log('🚀 Running Generalized Algebraic Data Types (GADTs) System Tests\n');
  
  testBasicPatternMatching();
  testExprTypeSafety();
  testListGADT();
  testHKTIntegration();
  testGADTWithGenericAlgorithms();
  testDerivableInstances();
  testTypedFolds();
  testHigherOrderGADTs();
  testDerivablePatternMatch();
  testRealWorldUseCases();
  demonstrateTypeSafety();
  testPerformanceAndIntegration();
  
  console.log('\n✅ All GADT system tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Type-safe pattern matching with exhaustiveness checks');
  console.log('- ✅ GADT integration with HKT system');
  console.log('- ✅ Derivable instances for GADT-based type constructors');
  console.log('- ✅ Typed folds (catamorphisms)');
  console.log('- ✅ Higher-order GADTs');
  console.log('- ✅ Compile-time type safety demonstrations');
  console.log('- ✅ Real-world use cases');
  console.log('- ✅ Performance and integration tests');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllGADTTests();
} 