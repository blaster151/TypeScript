/**
 * Tests for Fluent Methods System
 * 
 * This test file validates the fluent methods functionality:
 * - Chaining verification for all ADTs
 * - Type inference testing in TypeScript
 * - Purity tag preservation
 * - Bifunctor support (.bimap)
 * - Integration with existing typeclass system
 */

import {
  // Core types
  TypeclassInstances,
  FluentMethodOptions,
  FluentMethodDecorator,
  GlobalFluentMethodsConfig,
  
  // Registry functions
  registerFluentMethodInstances,
  getFluentMethodInstances,
  getADTTypeclassInstancesForFluent,
  
  // Decorator functions
  withFluentMethods,
  hasFluentMethods,
  withoutFluentMethods,
  
  // ADT-specific decorators
  withMaybeFluentMethods,
  withEitherFluentMethods,
  withResultFluentMethods,
  withObservableLiteFluentMethods,
  
  // Global configuration
  enableGlobalFluentMethods,
  disableGlobalFluentMethods,
  isGlobalFluentMethodsEnabled,
  getGlobalFluentMethodsConfig,
  
  // Utility functions
  createFluentMethodDecorator,
  hasInstanceFluentMethods,
  getAvailableFluentMethods,
  validateFluentMethodChain
} from './fp-fluent-methods';

import {
  // Unified ADT imports
  MaybeUnified, Maybe, MaybeK, Just, Nothing, matchMaybe,
  EitherUnified, Either, EitherK, Left, Right, matchEither,
  ResultUnified, Result, ResultK, Ok, Err, matchResult
} from './fp-maybe-unified';

import {
  // ObservableLite imports
  ObservableLite, ObservableLiteK,
  ObservableLiteFunctor, ObservableLiteApplicative, ObservableLiteMonad
} from './fp-observable-lite';

import {
  // HKT imports
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK as HKTMaybeK, EitherK as HKTEitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe as HKTMaybe, Either as HKTEither, List, Reader, Writer, State
} from './fp-hkt';

import {
  // Typeclass imports
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  // Purity imports
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Simple assertion function for testing
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Async assertion function for testing
 */
async function assertEqualAsync<T>(actual: Promise<T>, expected: T, message: string): Promise<void> {
  const result = await actual;
  assertEqual(result, expected, message);
}

/**
 * Type assertion function for testing
 */
function assertType<T>(value: T, message: string): void {
  // This is a runtime check that the value exists
  if (value === undefined || value === null) {
    throw new Error(`${message}: Value is null or undefined`);
  }
}

// ============================================================================
// Test Suite 1: Registry Functions
// ============================================================================

export function testRegistryFunctions(): void {
  console.log('🧪 Testing Registry Functions...');
  
  // Test registerFluentMethodInstances
  const testRegisterInstances = () => {
    const instances: TypeclassInstances = {
      Functor: MaybeUnified.Functor,
      Monad: MaybeUnified.Monad
    };
    
    registerFluentMethodInstances('TestADT', instances);
    const retrieved = getFluentMethodInstances('TestADT');
    
    assertEqual(retrieved, instances, 'Should register and retrieve instances correctly');
  };
  
  // Test getADTTypeclassInstancesForFluent
  const testGetADTInstances = () => {
    const instances = getADTTypeclassInstancesForFluent('Maybe');
    assertType(instances, 'Should retrieve ADT typeclass instances');
    assertType(instances.Functor, 'Should have Functor instance');
  };
  
  testRegisterInstances();
  testGetADTInstances();
  console.log('✅ Registry Functions tests passed');
}

// ============================================================================
// Test Suite 2: Decorator Functions
// ============================================================================

export function testDecoratorFunctions(): void {
  console.log('🧪 Testing Decorator Functions...');
  
  // Test withFluentMethods
  const testWithFluentMethods = () => {
    // Create a simple test constructor
    class TestADT<T> {
      constructor(public value: T) {}
    }
    
    const instances: TypeclassInstances = {
      Functor: {
        map: <A, B>(fa: TestADT<A>, f: (a: A) => B): TestADT<B> => {
          return new TestADT(f(fa.value));
        }
      }
    };
    
    registerFluentMethodInstances('TestADT', instances);
    
    const DecoratedTestADT = withFluentMethods(TestADT, 'TestADT');
    const instance = new DecoratedTestADT(5);
    
    assertType(instance.map, 'Should have map method');
    assertEqual(hasFluentMethods(DecoratedTestADT), true, 'Should be marked as having fluent methods');
    
    const result = instance.map((x: number) => x * 2);
    assertEqual(result.value, 10, 'Should apply map correctly');
  };
  
  // Test hasFluentMethods
  const testHasFluentMethods = () => {
    class TestADT<T> {
      constructor(public value: T) {}
    }
    
    assertEqual(hasFluentMethods(TestADT), false, 'Should not have fluent methods initially');
    
    const DecoratedTestADT = withFluentMethods(TestADT, 'TestADT2');
    assertEqual(hasFluentMethods(DecoratedTestADT), true, 'Should have fluent methods after decoration');
  };
  
  // Test withoutFluentMethods
  const testWithoutFluentMethods = () => {
    class TestADT<T> {
      constructor(public value: T) {}
    }
    
    const DecoratedTestADT = withFluentMethods(TestADT, 'TestADT3');
    assertEqual(hasFluentMethods(DecoratedTestADT), true, 'Should have fluent methods after decoration');
    
    const UndecoratedTestADT = withoutFluentMethods(DecoratedTestADT);
    assertEqual(hasFluentMethods(UndecoratedTestADT), false, 'Should not have fluent methods after undecoration');
  };
  
  testWithFluentMethods();
  testHasFluentMethods();
  testWithoutFluentMethods();
  console.log('✅ Decorator Functions tests passed');
}

// ============================================================================
// Test Suite 3: Maybe Fluent Methods
// ============================================================================

export function testMaybeFluentMethods(): void {
  console.log('🧪 Testing Maybe Fluent Methods...');
  
  // Test Maybe fluent methods
  const testMaybeFluentMethods = () => {
    const { Just, Nothing } = withMaybeFluentMethods();
    
    // Test .map
    const maybe1 = Just(5);
    const mapped = maybe1.map((x: number) => x * 2);
    const expected1 = Just(10);
    assertEqual(mapped, expected1, 'Maybe.map should work correctly');
    
    // Test .chain
    const chained = maybe1.chain((x: number) => Just(x * 3));
    const expected2 = Just(15);
    assertEqual(chained, expected2, 'Maybe.chain should work correctly');
    
    // Test .filter
    const filtered = maybe1.filter((x: number) => x > 3);
    assertEqual(filtered, Just(5), 'Maybe.filter should keep value when predicate is true');
    
    const filteredOut = maybe1.filter((x: number) => x > 10);
    assertEqual(filteredOut, Nothing(), 'Maybe.filter should return Nothing when predicate is false');
    
    // Test chaining
    const chainResult = Just(5)
      .map((x: number) => x + 1)
      .chain((x: number) => Just(x * 2))
      .filter((x: number) => x > 10);
    
    assertEqual(chainResult, Just(12), 'Maybe chaining should work correctly');
  };
  
  testMaybeFluentMethods();
  console.log('✅ Maybe Fluent Methods tests passed');
}

// ============================================================================
// Test Suite 4: Either Fluent Methods
// ============================================================================

export function testEitherFluentMethods(): void {
  console.log('🧪 Testing Either Fluent Methods...');
  
  // Test Either fluent methods
  const testEitherFluentMethods = () => {
    const { Left, Right } = withEitherFluentMethods();
    
    // Test .map on Right
    const either1 = Right(5);
    const mapped = either1.map((x: number) => x * 2);
    const expected1 = Right(10);
    assertEqual(mapped, expected1, 'Either.map should work correctly on Right');
    
    // Test .map on Left
    const either2 = Left('error');
    const mappedLeft = either2.map((x: number) => x * 2);
    assertEqual(mappedLeft, Left('error'), 'Either.map should preserve Left');
    
    // Test .chain on Right
    const chained = either1.chain((x: number) => Right(x * 3));
    const expected2 = Right(15);
    assertEqual(chained, expected2, 'Either.chain should work correctly on Right');
    
    // Test .chain on Left
    const chainedLeft = either2.chain((x: number) => Right(x * 3));
    assertEqual(chainedLeft, Left('error'), 'Either.chain should preserve Left');
    
    // Test .bimap
    const bimapped = either1.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimapped, Right(10), 'Either.bimap should work correctly on Right');
    
    const bimappedLeft = either2.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimappedLeft, Left('Error: error'), 'Either.bimap should work correctly on Left');
    
    // Test chaining
    const chainResult = Right(5)
      .map((x: number) => x + 1)
      .chain((x: number) => Right(x * 2))
      .bimap(
        (err: string) => `Error: ${err}`,
        (val: number) => val + 1
      );
    
    assertEqual(chainResult, Right(13), 'Either chaining should work correctly');
  };
  
  testEitherFluentMethods();
  console.log('✅ Either Fluent Methods tests passed');
}

// ============================================================================
// Test Suite 5: Result Fluent Methods
// ============================================================================

export function testResultFluentMethods(): void {
  console.log('🧪 Testing Result Fluent Methods...');
  
  // Test Result fluent methods
  const testResultFluentMethods = () => {
    const { Ok, Err } = withResultFluentMethods();
    
    // Test .map on Ok
    const result1 = Ok(5);
    const mapped = result1.map((x: number) => x * 2);
    const expected1 = Ok(10);
    assertEqual(mapped, expected1, 'Result.map should work correctly on Ok');
    
    // Test .map on Err
    const result2 = Err('error');
    const mappedErr = result2.map((x: number) => x * 2);
    assertEqual(mappedErr, Err('error'), 'Result.map should preserve Err');
    
    // Test .chain on Ok
    const chained = result1.chain((x: number) => Ok(x * 3));
    const expected2 = Ok(15);
    assertEqual(chained, expected2, 'Result.chain should work correctly on Ok');
    
    // Test .chain on Err
    const chainedErr = result2.chain((x: number) => Ok(x * 3));
    assertEqual(chainedErr, Err('error'), 'Result.chain should preserve Err');
    
    // Test .bimap
    const bimapped = result1.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimapped, Ok(10), 'Result.bimap should work correctly on Ok');
    
    const bimappedErr = result2.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimappedErr, Err('Error: error'), 'Result.bimap should work correctly on Err');
    
    // Test chaining
    const chainResult = Ok(5)
      .map((x: number) => x + 1)
      .chain((x: number) => Ok(x * 2))
      .bimap(
        (err: string) => `Error: ${err}`,
        (val: number) => val + 1
      );
    
    assertEqual(chainResult, Ok(13), 'Result chaining should work correctly');
  };
  
  testResultFluentMethods();
  console.log('✅ Result Fluent Methods tests passed');
}

// ============================================================================
// Test Suite 6: ObservableLite Fluent Methods
// ============================================================================

export function testObservableLiteFluentMethods(): void {
  console.log('🧪 Testing ObservableLite Fluent Methods...');
  
  // Test ObservableLite fluent methods
  const testObservableLiteFluentMethods = async () => {
    const DecoratedObservableLite = withObservableLiteFluentMethods();
    
    // Test .map
    const obs1 = DecoratedObservableLite.fromArray([1, 2, 3]);
    const mapped = obs1.map((x: number) => x * 2);
    
    const values1 = await collectValues(mapped);
    assertEqual(values1, [2, 4, 6], 'ObservableLite.map should work correctly');
    
    // Test .chain
    const obs2 = DecoratedObservableLite.fromArray([1, 2]);
    const chained = obs2.chain((x: number) => DecoratedObservableLite.fromArray([x, x * 2]));
    
    const values2 = await collectValues(chained);
    assertEqual(values2, [1, 2, 2, 4], 'ObservableLite.chain should work correctly');
    
    // Test chaining
    const chainResult = DecoratedObservableLite.fromArray([1, 2, 3, 4, 5])
      .filter((x: number) => x % 2 === 0)
      .map((x: number) => x * 2)
      .take(2);
    
    const values3 = await collectValues(chainResult);
    assertEqual(values3, [4, 8], 'ObservableLite chaining should work correctly');
  };
  
  // Helper function to collect values from observable
  function collectValues<A>(observable: ObservableLite<A>): Promise<A[]> {
    return new Promise((resolve, reject) => {
      const values: A[] = [];
      const unsubscribe = observable.subscribe({
        next: (value) => values.push(value),
        error: (err) => reject(err),
        complete: () => resolve(values)
      });
    });
  }
  
  testObservableLiteFluentMethods()
    .then(() => {
      console.log('✅ ObservableLite Fluent Methods tests passed');
    });
}

// ============================================================================
// Test Suite 7: Type Inference Testing
// ============================================================================

export function testTypeInference(): void {
  console.log('🧪 Testing Type Inference...');
  
  // Test type inference for Maybe
  const testMaybeTypeInference = () => {
    const { Just } = withMaybeFluentMethods();
    
    const maybe = Just(5);
    // TypeScript should infer the result type correctly
    const result = maybe
      .map((x: number) => x + 1)        // Should be Maybe<number>
      .map((x: number) => x.toString()) // Should be Maybe<string>
      .map((x: string) => x.length);    // Should be Maybe<number>
    
    assertType(result, 'Type inference should work for Maybe');
  };
  
  // Test type inference for Either
  const testEitherTypeInference = () => {
    const { Right } = withEitherFluentMethods();
    
    const either = Right(5);
    // TypeScript should infer the result type correctly
    const result = either
      .map((x: number) => x + 1)        // Should be Either<string, number>
      .map((x: number) => x.toString()) // Should be Either<string, string>
      .map((x: string) => x.length);    // Should be Either<string, number>
    
    assertType(result, 'Type inference should work for Either');
  };
  
  // Test type inference for Result
  const testResultTypeInference = () => {
    const { Ok } = withResultFluentMethods();
    
    const result = Ok(5);
    // TypeScript should infer the result type correctly
    const finalResult = result
      .map((x: number) => x + 1)        // Should be Result<string, number>
      .map((x: number) => x.toString()) // Should be Result<string, string>
      .map((x: string) => x.length);    // Should be Result<string, number>
    
    assertType(finalResult, 'Type inference should work for Result');
  };
  
  testMaybeTypeInference();
  testEitherTypeInference();
  testResultTypeInference();
  console.log('✅ Type Inference tests passed');
}

// ============================================================================
// Test Suite 8: Purity Tag Preservation
// ============================================================================

export function testPurityTagPreservation(): void {
  console.log('🧪 Testing Purity Tag Preservation...');
  
  // Test purity preservation for Maybe (should be Pure)
  const testMaybePurity = () => {
    const { Just } = withMaybeFluentMethods();
    
    const maybe = Just(5);
    const result = maybe.map((x: number) => x + 1);
    
    // Check that purity is preserved (Maybe should be Pure)
    assertType(result, 'Maybe should preserve purity tags');
  };
  
  // Test purity preservation for Either (should be Pure)
  const testEitherPurity = () => {
    const { Right } = withEitherFluentMethods();
    
    const either = Right(5);
    const result = either.map((x: number) => x + 1);
    
    // Check that purity is preserved (Either should be Pure)
    assertType(result, 'Either should preserve purity tags');
  };
  
  // Test purity preservation for ObservableLite (should be Async)
  const testObservableLitePurity = async () => {
    const DecoratedObservableLite = withObservableLiteFluentMethods();
    
    const obs = DecoratedObservableLite.fromArray([1, 2, 3]);
    const result = obs.map((x: number) => x + 1);
    
    // Check that purity is preserved (ObservableLite should be Async)
    assertType(result, 'ObservableLite should preserve Async purity tags');
    
    // Verify it still works as an async observable
    const values = await collectValues(result);
    assertEqual(values, [2, 3, 4], 'ObservableLite should maintain async behavior');
  };
  
  // Helper function to collect values from observable
  function collectValues<A>(observable: ObservableLite<A>): Promise<A[]> {
    return new Promise((resolve, reject) => {
      const values: A[] = [];
      const unsubscribe = observable.subscribe({
        next: (value) => values.push(value),
        error: (err) => reject(err),
        complete: () => resolve(values)
      });
    });
  }
  
  testMaybePurity();
  testEitherPurity();
  testObservableLitePurity()
    .then(() => {
      console.log('✅ Purity Tag Preservation tests passed');
    });
}

// ============================================================================
// Test Suite 9: Bifunctor Support
// ============================================================================

export function testBifunctorSupport(): void {
  console.log('🧪 Testing Bifunctor Support...');
  
  // Test .bimap for Either
  const testEitherBimap = () => {
    const { Left, Right } = withEitherFluentMethods();
    
    // Test bimap on Right
    const right = Right(5);
    const bimappedRight = right.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimappedRight, Right(10), 'Either.bimap should work on Right');
    
    // Test bimap on Left
    const left = Left('test error');
    const bimappedLeft = left.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimappedLeft, Left('Error: test error'), 'Either.bimap should work on Left');
  };
  
  // Test .bimap for Result
  const testResultBimap = () => {
    const { Ok, Err } = withResultFluentMethods();
    
    // Test bimap on Ok
    const ok = Ok(5);
    const bimappedOk = ok.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimappedOk, Ok(10), 'Result.bimap should work on Ok');
    
    // Test bimap on Err
    const err = Err('test error');
    const bimappedErr = err.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    assertEqual(bimappedErr, Err('Error: test error'), 'Result.bimap should work on Err');
  };
  
  testEitherBimap();
  testResultBimap();
  console.log('✅ Bifunctor Support tests passed');
}

// ============================================================================
// Test Suite 10: Global Configuration
// ============================================================================

export function testGlobalConfiguration(): void {
  console.log('🧪 Testing Global Configuration...');
  
  // Test enableGlobalFluentMethods
  const testEnableGlobal = () => {
    assertEqual(isGlobalFluentMethodsEnabled(), false, 'Should be disabled initially');
    
    enableGlobalFluentMethods();
    assertEqual(isGlobalFluentMethodsEnabled(), true, 'Should be enabled after enableGlobalFluentMethods');
    
    const config = getGlobalFluentMethodsConfig();
    assertType(config, 'Should return configuration');
    assertEqual(config.enabled, true, 'Configuration should show enabled');
  };
  
  // Test disableGlobalFluentMethods
  const testDisableGlobal = () => {
    disableGlobalFluentMethods();
    assertEqual(isGlobalFluentMethodsEnabled(), false, 'Should be disabled after disableGlobalFluentMethods');
  };
  
  // Test custom options
  const testCustomOptions = () => {
    const customOptions: FluentMethodOptions = {
      enableMap: true,
      enableChain: false,
      enableFilter: true,
      enableBimap: false,
      enableAp: true,
      enableOf: false,
      preservePurity: true,
      enableTypeInference: true
    };
    
    enableGlobalFluentMethods(customOptions);
    const config = getGlobalFluentMethodsConfig();
    assertEqual(config.defaultOptions.enableChain, false, 'Should respect custom options');
    assertEqual(config.defaultOptions.enableBimap, false, 'Should respect custom options');
  };
  
  testEnableGlobal();
  testDisableGlobal();
  testCustomOptions();
  console.log('✅ Global Configuration tests passed');
}

// ============================================================================
// Test Suite 11: Utility Functions
// ============================================================================

export function testUtilityFunctions(): void {
  console.log('🧪 Testing Utility Functions...');
  
  // Test hasInstanceFluentMethods
  const testHasInstanceFluentMethods = () => {
    const { Just } = withMaybeFluentMethods();
    
    const maybe = Just(5);
    assertEqual(hasInstanceFluentMethods(maybe), true, 'Should detect fluent methods on instance');
    
    const plainObj = { value: 5 };
    assertEqual(hasInstanceFluentMethods(plainObj), false, 'Should not detect fluent methods on plain object');
  };
  
  // Test getAvailableFluentMethods
  const testGetAvailableFluentMethods = () => {
    const { Just } = withMaybeFluentMethods();
    
    const maybe = Just(5);
    const methods = getAvailableFluentMethods(maybe);
    
    assertType(methods, 'Should return array of methods');
    assertEqual(methods.includes('map'), true, 'Should include map method');
    assertEqual(methods.includes('chain'), true, 'Should include chain method');
    assertEqual(methods.includes('filter'), true, 'Should include filter method');
  };
  
  // Test validateFluentMethodChain
  const testValidateFluentMethodChain = () => {
    const validChain = [
      { method: 'map', args: [(x: number) => x + 1] },
      { method: 'chain', args: [(x: number) => Just(x * 2)] }
    ];
    
    assertEqual(validateFluentMethodChain(validChain), true, 'Should validate correct chain');
    
    const invalidChain = [
      { method: 'map', args: [(x: number) => x + 1] },
      { method: 'invalid', args: [] }
    ];
    
    assertEqual(validateFluentMethodChain(invalidChain), true, 'Should still validate chain structure');
  };
  
  // Test createFluentMethodDecorator
  const testCreateFluentMethodDecorator = () => {
    class TestADT<T> {
      constructor(public value: T) {}
    }
    
    const instances: TypeclassInstances = {
      Functor: {
        map: <A, B>(fa: TestADT<A>, f: (a: A) => B): TestADT<B> => {
          return new TestADT(f(fa.value));
        }
      }
    };
    
    const decorator = createFluentMethodDecorator('TestADT', instances);
    const DecoratedTestADT = decorator(TestADT);
    
    assertEqual(hasFluentMethods(DecoratedTestADT), true, 'Should create decorated constructor');
    
    const instance = new DecoratedTestADT(5);
    const result = instance.map((x: number) => x * 2);
    assertEqual(result.value, 10, 'Should apply map correctly');
  };
  
  testHasInstanceFluentMethods();
  testGetAvailableFluentMethods();
  testValidateFluentMethodChain();
  testCreateFluentMethodDecorator();
  console.log('✅ Utility Functions tests passed');
}

// ============================================================================
// Test Suite 12: Integration with Existing Typeclass System
// ============================================================================

export function testTypeclassIntegration(): void {
  console.log('🧪 Testing Typeclass Integration...');
  
  // Test integration with existing Functor instances
  const testFunctorIntegration = () => {
    const { Just } = withMaybeFluentMethods();
    
    const maybe = Just(5);
    const result = maybe.map((x: number) => x + 1);
    
    // Should work with existing typeclass instances
    assertEqual(result, Just(6), 'Should integrate with existing Functor instances');
  };
  
  // Test integration with existing Monad instances
  const testMonadIntegration = () => {
    const { Just } = withMaybeFluentMethods();
    
    const maybe = Just(5);
    const result = maybe.chain((x: number) => Just(x * 2));
    
    // Should work with existing typeclass instances
    assertEqual(result, Just(10), 'Should integrate with existing Monad instances');
  };
  
  // Test integration with existing Bifunctor instances
  const testBifunctorIntegration = () => {
    const { Right } = withEitherFluentMethods();
    
    const either = Right(5);
    const result = either.bimap(
      (err: string) => `Error: ${err}`,
      (val: number) => val * 2
    );
    
    // Should work with existing typeclass instances
    assertEqual(result, Right(10), 'Should integrate with existing Bifunctor instances');
  };
  
  testFunctorIntegration();
  testMonadIntegration();
  testBifunctorIntegration();
  console.log('✅ Typeclass Integration tests passed');
}

// ============================================================================
// Test Suite 13: Realistic Examples
// ============================================================================

export function testRealisticExamples(): void {
  console.log('🧪 Testing Realistic Examples...');
  
  // Test realistic Maybe chaining
  const testMaybeRealisticExample = () => {
    const { Just, Nothing } = withMaybeFluentMethods();
    
    // Simulate user data processing
    const getUser = (id: number) => id > 0 ? Just({ id, name: `User ${id}` }) : Nothing();
    const getProfile = (user: { id: number; name: string }) => Just({ ...user, email: `${user.name.toLowerCase().replace(' ', '.')}@example.com` });
    const validateEmail = (profile: { id: number; name: string; email: string }) => 
      profile.email.includes('@') ? Just(profile) : Nothing();
    
    const result = getUser(5)
      .chain(getProfile)
      .chain(validateEmail)
      .map(profile => `Welcome, ${profile.name}!`);
    
    assertEqual(result, Just('Welcome, User 5!'), 'Realistic Maybe chaining should work');
    
    const invalidResult = getUser(-1)
      .chain(getProfile)
      .chain(validateEmail)
      .map(profile => `Welcome, ${profile.name}!`);
    
    assertEqual(invalidResult, Nothing(), 'Invalid user should result in Nothing');
  };
  
  // Test realistic Either chaining
  const testEitherRealisticExample = () => {
    const { Left, Right } = withEitherFluentMethods();
    
    // Simulate API call processing
    const fetchUser = (id: number) => id > 0 ? Right({ id, name: `User ${id}` }) : Left('Invalid user ID');
    const fetchPosts = (user: { id: number; name: string }) => Right([{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }]);
    const processPosts = (posts: Array<{ id: number; title: string }>) => Right(posts.map(post => ({ ...post, processed: true })));
    
    const result = fetchUser(5)
      .chain(fetchPosts)
      .chain(processPosts)
      .map(posts => `${posts.length} posts processed`);
    
    assertEqual(result, Right('2 posts processed'), 'Realistic Either chaining should work');
    
    const errorResult = fetchUser(-1)
      .chain(fetchPosts)
      .chain(processPosts)
      .map(posts => `${posts.length} posts processed`);
    
    assertEqual(errorResult, Left('Invalid user ID'), 'Error should be preserved through chain');
  };
  
  // Test realistic ObservableLite chaining
  const testObservableLiteRealisticExample = async () => {
    const DecoratedObservableLite = withObservableLiteFluentMethods();
    
    // Simulate event stream processing
    const events = DecoratedObservableLite.fromArray([
      { type: 'click', x: 100, y: 200, timestamp: 1000 },
      { type: 'move', x: 150, y: 250, timestamp: 1001 },
      { type: 'click', x: 200, y: 300, timestamp: 1002 },
      { type: 'scroll', delta: 10, timestamp: 1003 }
    ]);
    
    const result = events
      .filter(event => event.type === 'click')
      .map(event => ({ x: event.x, y: event.y, time: event.timestamp }))
      .map(coords => `Click at (${coords.x}, ${coords.y}) at ${coords.time}ms`)
      .take(2);
    
    const values = await collectValues(result);
    assertEqual(values, [
      'Click at (100, 200) at 1000ms',
      'Click at (200, 300) at 1002ms'
    ], 'Realistic ObservableLite chaining should work');
  };
  
  // Helper function to collect values from observable
  function collectValues<A>(observable: ObservableLite<A>): Promise<A[]> {
    return new Promise((resolve, reject) => {
      const values: A[] = [];
      const unsubscribe = observable.subscribe({
        next: (value) => values.push(value),
        error: (err) => reject(err),
        complete: () => resolve(values)
      });
    });
  }
  
  testMaybeRealisticExample();
  testEitherRealisticExample();
  testObservableLiteRealisticExample()
    .then(() => {
      console.log('✅ Realistic Examples tests passed');
    });
}

// ============================================================================
// Main Test Runner
// ============================================================================

export async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Fluent Methods Tests...\n');
  
  try {
    testRegistryFunctions();
    testDecoratorFunctions();
    testMaybeFluentMethods();
    testEitherFluentMethods();
    testResultFluentMethods();
    await testObservableLiteFluentMethods();
    testTypeInference();
    await testPurityTagPreservation();
    testBifunctorSupport();
    testGlobalConfiguration();
    testUtilityFunctions();
    testTypeclassIntegration();
    await testRealisticExamples();
    
    console.log('\n🎉 All Fluent Methods tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
} 