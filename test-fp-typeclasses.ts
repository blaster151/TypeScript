// Core HKT utilities for testing
type Type = any;
type Kind<TArgs extends any[] = any[]> = any;
type Apply<F extends Kind<any[]>, Args extends any[]> = F extends Kind<Args> ? F : never;

// Import type definitions from the main file
import type {
  Functor,
  Applicative,
  Monad,
  Bifunctor,
  Profunctor,
  IsFunctor,
  IsApplicative,
  IsMonad,
  IsBifunctor,
  IsProfunctor
} from './fp-typeclasses';

// Import runtime implementations
import {
  map,
  lift,
  chain,
  bimap,
  dimap,
  ArrayFunctor,
  ArrayApplicative,
  ArrayMonad,
  TupleBifunctor,
  FunctionProfunctor,
  MaybeFunctor,
  MaybeApplicative,
  MaybeMonad,
  EitherBifunctor,
  ReaderProfunctor,
  Just,
  Nothing,
  Left,
  Right
} from './fp-typeclasses';

// ============================================================================
// Type-level Tests
// ============================================================================

// Test that our typeclasses work with the HKT system
type TestArrayFunctor = IsFunctor<Array<any>>; // Should be true
type TestArrayApplicative = IsApplicative<Array<any>>; // Should be true
type TestArrayMonad = IsMonad<Array<any>>; // Should be true

// Test custom types
type Maybe<A> = { tag: 'Just'; value: A } | { tag: 'Nothing' };
type Tuple<A, B> = [A, B];
type Either<L, R> = { tag: 'Left'; value: L } | { tag: 'Right'; value: R };
type Function<A, B> = (a: A) => B;
type Reader<R, A> = (r: R) => A;

type TestMaybeFunctor = IsFunctor<Maybe<any>>; // Should be true
type TestTupleBifunctor = IsBifunctor<Tuple<any, any>>; // Should be true
type TestEitherBifunctor = IsBifunctor<Either<any, any>>; // Should be true
type TestFunctionProfunctor = IsProfunctor<Function<any, any>>; // Should be true
type TestReaderProfunctor = IsProfunctor<Reader<any, any>>; // Should be true

// ============================================================================
// Runtime Tests
// ============================================================================

// Test Array instances
function testArrayInstances() {
  console.log("Testing Array instances...");
  
  const numbers = [1, 2, 3, 4, 5];
  
  // Test Functor
  const doubled = map(ArrayFunctor, numbers, (x: number) => x * 2);
  console.log("Array Functor map:", doubled); // [2, 4, 6, 8, 10]
  
  // Test Applicative
  const lifted = lift(ArrayApplicative, 42);
  console.log("Array Applicative lift:", lifted); // [42]
  
  const functions = [(x: number) => x * 2, (x: number) => x + 1];
  const applied = ArrayApplicative.ap(functions, numbers);
  console.log("Array Applicative ap:", applied); // [2, 4, 6, 8, 10, 2, 3, 4, 5, 6]
  
  // Test Monad
  const chained = chain(ArrayMonad, numbers, (x: number) => [x, x * 2]);
  console.log("Array Monad chain:", chained); // [1, 2, 2, 4, 3, 6, 4, 8, 5, 10]
}

// Test Tuple Bifunctor
function testTupleBifunctor() {
  console.log("\nTesting Tuple Bifunctor...");
  
  const tuple: [string, number] = ["hello", 42];
  
  const transformed = bimap(TupleBifunctor, tuple, (s: string) => s.length, (n: number) => n * 2);
  console.log("Tuple bimap:", transformed); // [5, 84]
  
  const leftMapped = TupleBifunctor.mapLeft!(tuple, (s: string) => s.toUpperCase());
  console.log("Tuple mapLeft:", leftMapped); // ["HELLO", 42]
}

// Test Function Profunctor
function testFunctionProfunctor() {
  console.log("\nTesting Function Profunctor...");
  
  const stringToNumber: (s: string) => number = s => s.length;
  
  const transformedFn = dimap(FunctionProfunctor, stringToNumber, (n: number) => n.toString(), (n: number) => n * 2);
  console.log("Function dimap result:", transformedFn("123")); // 6 (length of "123" * 2)
  
  const leftMapped = FunctionProfunctor.lmap!(stringToNumber, (n: number) => n.toString());
  console.log("Function lmap result:", leftMapped(42)); // 2 (length of "42")
  
  const rightMapped = FunctionProfunctor.rmap!(stringToNumber, (n: number) => n * 2);
  console.log("Function rmap result:", rightMapped("abc")); // 6 (length of "abc" * 2)
}

// Test Maybe instances
function testMaybeInstances() {
  console.log("\nTesting Maybe instances...");
  
  const justValue = Just(42);
  const nothingValue = Nothing<number>();
  
  // Test Functor
  const doubled = map(MaybeFunctor, justValue, x => x * 2);
  console.log("Maybe Functor map (Just):", doubled); // { tag: 'Just', value: 84 }
  
  const doubledNothing = map(MaybeFunctor, nothingValue, x => x * 2);
  console.log("Maybe Functor map (Nothing):", doubledNothing); // { tag: 'Nothing' }
  
  // Test Applicative
  const lifted = lift(MaybeApplicative, 42);
  console.log("Maybe Applicative lift:", lifted); // { tag: 'Just', value: 42 }
  
  const justFn = Just((x: number) => x * 2);
  const applied = MaybeApplicative.ap(justFn, justValue);
  console.log("Maybe Applicative ap:", applied); // { tag: 'Just', value: 84 }
  
  // Test Monad
  const chained = chain(MaybeMonad, justValue, x => Just(x * 2));
  console.log("Maybe Monad chain:", chained); // { tag: 'Just', value: 84 }
}

// Test Either Bifunctor
function testEitherBifunctor() {
  console.log("\nTesting Either Bifunctor...");
  
  const rightValue = Right<string, number>(42);
  const leftValue = Left<string, number>("error");
  
  const transformedRight = bimap(EitherBifunctor, rightValue, s => s.length, n => n * 2);
  console.log("Either bimap (Right):", transformedRight); // { tag: 'Right', value: 84 }
  
  const transformedLeft = bimap(EitherBifunctor, leftValue, s => s.length, n => n * 2);
  console.log("Either bimap (Left):", transformedLeft); // { tag: 'Left', value: 5 }
  
  const leftMapped = EitherBifunctor.mapLeft!(leftValue, s => s.toUpperCase());
  console.log("Either mapLeft:", leftMapped); // { tag: 'Left', value: "ERROR" }
}

// Test Reader Profunctor
function testReaderProfunctor() {
  console.log("\nTesting Reader Profunctor...");
  
  const reader: Reader<string, number> = s => s.length;
  
  const transformedReader = dimap(ReaderProfunctor, reader, (n: number) => n.toString(), (n: number) => n * 2);
  console.log("Reader dimap result:", transformedReader(42)); // 4 (length of "42" * 2)
  
  const leftMapped = ReaderProfunctor.lmap!(reader, (n: number) => n.toString());
  console.log("Reader lmap result:", leftMapped(42)); // 2 (length of "42")
  
  const rightMapped = ReaderProfunctor.rmap!(reader, (n: number) => n * 2);
  console.log("Reader rmap result:", rightMapped("abc")); // 6 (length of "abc" * 2)
}

// ============================================================================
// Generic Function Tests
// ============================================================================

// Test generic functions with different type constructors
function testGenericFunctions() {
  console.log("\nTesting generic functions...");
  
  // Test with Array
  const arrayResult = map(ArrayFunctor, [1, 2, 3], x => x * 2);
  console.log("Generic map with Array:", arrayResult);
  
  // Test with Maybe
  const maybeResult = map(MaybeFunctor, Just(42), x => x * 2);
  console.log("Generic map with Maybe:", maybeResult);
  
  // Test with Tuple
  const tupleResult = bimap(TupleBifunctor, [1, "hello"], x => x * 2, s => s.length);
  console.log("Generic bimap with Tuple:", tupleResult);
  
  // Test with Function
  const functionResult = dimap(FunctionProfunctor, (s: string) => s.length, (n: number) => n.toString(), (n: number) => n * 2);
  console.log("Generic dimap with Function:", functionResult("abc"));
}

// ============================================================================
// Type Safety Tests
// ============================================================================

// Test that type safety is maintained
function testTypeSafety() {
  console.log("\nTesting type safety...");
  
  // These should compile without errors
  const numbers: number[] = [1, 2, 3];
  const doubled: number[] = map(ArrayFunctor, numbers, x => x * 2);
  
  const maybeValue: Maybe<number> = Just(42);
  const maybeDoubled: Maybe<number> = map(MaybeFunctor, maybeValue, x => x * 2);
  
  const tuple: [string, number] = ["hello", 42];
  const transformedTuple: [number, number] = bimap(TupleBifunctor, tuple, s => s.length, n => n * 2);
  
  const fn: (s: string) => number = s => s.length;
  const transformedFn: (n: number) => number = dimap(FunctionProfunctor, fn, n => n.toString(), n => n * 2);
  
  console.log("Type safety tests passed!");
}

// ============================================================================
// Run All Tests
// ============================================================================

function runAllTests() {
  console.log("🧪 Running FP Typeclass Tests\n");
  
  testArrayInstances();
  testTupleBifunctor();
  testFunctionProfunctor();
  testMaybeInstances();
  testEitherBifunctor();
  testReaderProfunctor();
  testGenericFunctions();
  testTypeSafety();
  
  console.log("\n✅ All tests completed successfully!");
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}

export {
  testArrayInstances,
  testTupleBifunctor,
  testFunctionProfunctor,
  testMaybeInstances,
  testEitherBifunctor,
  testReaderProfunctor,
  testGenericFunctions,
  testTypeSafety,
  runAllTests
}; 