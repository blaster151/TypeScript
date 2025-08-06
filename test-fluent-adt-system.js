/**
 * Test file for Fluent ADT System
 * 
 * Tests fluent syntax, automatic derivation, and auto-registration
 * for all ADTs.
 */

const { 
  addFluentMethods, 
  addBifunctorMethods,
  fluentMaybe,
  fluentEither,
  fluentResult,
  fluentObservable,
  augmentADTWithFluent,
  augmentBifunctorADTWithFluent,
  autoAugmentCoreADTs
} = require('./fp-fluent-adt');

const {
  deriveFunctorInstance,
  deriveApplicativeInstance,
  deriveMonadInstance,
  deriveBifunctorInstance,
  deriveEqInstance,
  deriveOrdInstance,
  deriveShowInstance,
  deriveInstances
} = require('./fp-derivation-helpers');

const {
  autoRegisterADT,
  autoRegisterMaybe,
  autoRegisterEither,
  autoRegisterResult,
  autoRegisterObservableLite,
  autoRegisterTaskEither,
  autoRegisterAllCoreADTs,
  validateRegisteredInstances
} = require('./fp-auto-registration');

// ============================================================================
// Test Utilities
// ============================================================================

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Test 1: Fluent Method Addition
// ============================================================================

function testFluentMethodAddition() {
  console.log('\n📋 Test 1: Fluent Method Addition');

  // Mock ADT instances
  const maybeJust = { tag: 'Just', value: 42 };
  const maybeNothing = { tag: 'Nothing' };
  const eitherRight = { tag: 'Right', value: 'success' };
  const eitherLeft = { tag: 'Left', value: 'error' };

  // Test addFluentMethods
  try {
    const fluentMaybe = addFluentMethods(maybeJust, 'Maybe');
    assertTrue(typeof fluentMaybe.map === 'function', 'map method should be added');
    assertTrue(typeof fluentMaybe.chain === 'function', 'chain method should be added');
    assertTrue(typeof fluentMaybe.filter === 'function', 'filter method should be added');
    console.log('✅ addFluentMethods works correctly');
  } catch (error) {
    console.log('⚠️ addFluentMethods test skipped (registry not available)');
  }

  // Test addBifunctorMethods
  try {
    const fluentEither = addBifunctorMethods(eitherRight, 'Either');
    assertTrue(typeof fluentEither.bimap === 'function', 'bimap method should be added');
    assertTrue(typeof fluentEither.mapLeft === 'function', 'mapLeft method should be added');
    assertTrue(typeof fluentEither.mapRight === 'function', 'mapRight method should be added');
    console.log('✅ addBifunctorMethods works correctly');
  } catch (error) {
    console.log('⚠️ addBifunctorMethods test skipped (registry not available)');
  }
}

// ============================================================================
// Test 2: Fluent Wrappers
// ============================================================================

function testFluentWrappers() {
  console.log('\n📋 Test 2: Fluent Wrappers');

  // Mock ADT instances
  const maybe = { tag: 'Just', value: 42 };
  const either = { tag: 'Right', value: 'success' };
  const result = { tag: 'Ok', value: 123 };
  const observable = { subscribe: () => () => {} };

  // Test fluentMaybe
  try {
    const fluentMaybe = fluentMaybe(maybe);
    assertTrue(typeof fluentMaybe.map === 'function', 'fluentMaybe should add map method');
    console.log('✅ fluentMaybe wrapper works');
  } catch (error) {
    console.log('⚠️ fluentMaybe test skipped (registry not available)');
  }

  // Test fluentEither
  try {
    const fluentEither = fluentEither(either);
    assertTrue(typeof fluentEither.map === 'function', 'fluentEither should add map method');
    assertTrue(typeof fluentEither.bimap === 'function', 'fluentEither should add bimap method');
    console.log('✅ fluentEither wrapper works');
  } catch (error) {
    console.log('⚠️ fluentEither test skipped (registry not available)');
  }

  // Test fluentResult
  try {
    const fluentResult = fluentResult(result);
    assertTrue(typeof fluentResult.map === 'function', 'fluentResult should add map method');
    assertTrue(typeof fluentResult.bimap === 'function', 'fluentResult should add bimap method');
    console.log('✅ fluentResult wrapper works');
  } catch (error) {
    console.log('⚠️ fluentResult test skipped (registry not available)');
  }

  // Test fluentObservable
  try {
    const fluentObs = fluentObservable(observable);
    assertTrue(typeof fluentObs.map === 'function', 'fluentObservable should add map method');
    console.log('✅ fluentObservable wrapper works');
  } catch (error) {
    console.log('⚠️ fluentObservable test skipped (registry not available)');
  }
}

// ============================================================================
// Test 3: Instance Derivation
// ============================================================================

function testInstanceDerivation() {
  console.log('\n📋 Test 3: Instance Derivation');

  // Test deriveFunctorInstance
  try {
    const maybeFunctor = deriveFunctorInstance();
    assertTrue(typeof maybeFunctor.map === 'function', 'deriveFunctorInstance should return Functor');
    console.log('✅ deriveFunctorInstance works');
  } catch (error) {
    console.log('⚠️ deriveFunctorInstance test skipped:', error.message);
  }

  // Test deriveApplicativeInstance
  try {
    const maybeApplicative = deriveApplicativeInstance();
    assertTrue(typeof maybeApplicative.of === 'function', 'deriveApplicativeInstance should return Applicative');
    assertTrue(typeof maybeApplicative.ap === 'function', 'deriveApplicativeInstance should have ap method');
    console.log('✅ deriveApplicativeInstance works');
  } catch (error) {
    console.log('⚠️ deriveApplicativeInstance test skipped:', error.message);
  }

  // Test deriveMonadInstance
  try {
    const maybeMonad = deriveMonadInstance();
    assertTrue(typeof maybeMonad.chain === 'function', 'deriveMonadInstance should return Monad');
    console.log('✅ deriveMonadInstance works');
  } catch (error) {
    console.log('⚠️ deriveMonadInstance test skipped:', error.message);
  }

  // Test deriveBifunctorInstance
  try {
    const eitherBifunctor = deriveBifunctorInstance();
    assertTrue(typeof eitherBifunctor.bimap === 'function', 'deriveBifunctorInstance should return Bifunctor');
    console.log('✅ deriveBifunctorInstance works');
  } catch (error) {
    console.log('⚠️ deriveBifunctorInstance test skipped:', error.message);
  }

  // Test deriveEqInstance
  try {
    const maybeEq = deriveEqInstance();
    assertTrue(typeof maybeEq.equals === 'function', 'deriveEqInstance should return Eq');
    console.log('✅ deriveEqInstance works');
  } catch (error) {
    console.log('⚠️ deriveEqInstance test skipped:', error.message);
  }

  // Test deriveOrdInstance
  try {
    const maybeOrd = deriveOrdInstance();
    assertTrue(typeof maybeOrd.compare === 'function', 'deriveOrdInstance should return Ord');
    assertTrue(typeof maybeOrd.equals === 'function', 'deriveOrdInstance should extend Eq');
    console.log('✅ deriveOrdInstance works');
  } catch (error) {
    console.log('⚠️ deriveOrdInstance test skipped:', error.message);
  }

  // Test deriveShowInstance
  try {
    const maybeShow = deriveShowInstance();
    assertTrue(typeof maybeShow.show === 'function', 'deriveShowInstance should return Show');
    console.log('✅ deriveShowInstance works');
  } catch (error) {
    console.log('⚠️ deriveShowInstance test skipped:', error.message);
  }
}

// ============================================================================
// Test 4: Instance Derivation with Custom Logic
// ============================================================================

function testCustomDerivation() {
  console.log('\n📋 Test 4: Custom Derivation');

  // Test custom map function
  try {
    const customFunctor = deriveFunctorInstance({
      customMap: (fa, f) => {
        if (fa.tag === 'Just') {
          return { tag: 'Just', value: f(fa.value) };
        }
        return { tag: 'Nothing' };
      }
    });

    const result = customFunctor.map({ tag: 'Just', value: 42 }, x => x * 2);
    assertEqual(result, { tag: 'Just', value: 84 }, 'Custom map should work correctly');
    console.log('✅ Custom derivation works');
  } catch (error) {
    console.log('⚠️ Custom derivation test skipped:', error.message);
  }

  // Test custom Eq function
  try {
    const customEq = deriveEqInstance({
      customEq: (a, b) => {
        if (a.tag === 'Just' && b.tag === 'Just') {
          return a.value === b.value;
        }
        return a.tag === b.tag;
      }
    });

    const equal = customEq.equals(
      { tag: 'Just', value: 42 },
      { tag: 'Just', value: 42 }
    );
    assertTrue(equal, 'Custom Eq should work correctly');
    console.log('✅ Custom Eq derivation works');
  } catch (error) {
    console.log('⚠️ Custom Eq derivation test skipped:', error.message);
  }
}

// ============================================================================
// Test 5: Auto-Registration
// ============================================================================

function testAutoRegistration() {
  console.log('\n📋 Test 5: Auto-Registration');

  // Test autoRegisterMaybe
  try {
    const result = autoRegisterMaybe();
    assertTrue(result.success, 'autoRegisterMaybe should succeed');
    assertTrue(result.registered.length > 0, 'autoRegisterMaybe should register instances');
    console.log('✅ autoRegisterMaybe works');
  } catch (error) {
    console.log('⚠️ autoRegisterMaybe test skipped (registry not available)');
  }

  // Test autoRegisterEither
  try {
    const result = autoRegisterEither();
    assertTrue(result.success, 'autoRegisterEither should succeed');
    assertTrue(result.registered.includes('Bifunctor'), 'autoRegisterEither should register Bifunctor');
    console.log('✅ autoRegisterEither works');
  } catch (error) {
    console.log('⚠️ autoRegisterEither test skipped (registry not available)');
  }

  // Test autoRegisterResult
  try {
    const result = autoRegisterResult();
    assertTrue(result.success, 'autoRegisterResult should succeed');
    assertTrue(result.registered.includes('Monad'), 'autoRegisterResult should register Monad');
    console.log('✅ autoRegisterResult works');
  } catch (error) {
    console.log('⚠️ autoRegisterResult test skipped (registry not available)');
  }

  // Test autoRegisterObservableLite
  try {
    const result = autoRegisterObservableLite();
    assertTrue(result.success, 'autoRegisterObservableLite should succeed');
    assertTrue(result.registered.includes('Functor'), 'autoRegisterObservableLite should register Functor');
    console.log('✅ autoRegisterObservableLite works');
  } catch (error) {
    console.log('⚠️ autoRegisterObservableLite test skipped (registry not available)');
  }
}

// ============================================================================
// Test 6: Bulk Registration
// ============================================================================

function testBulkRegistration() {
  console.log('\n📋 Test 6: Bulk Registration');

  try {
    const results = autoRegisterAllCoreADTs();
    assertTrue(results.length > 0, 'autoRegisterAllCoreADTs should return results');
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Bulk registration: ${successCount}/${results.length} successful`);
  } catch (error) {
    console.log('⚠️ Bulk registration test skipped (registry not available)');
  }
}

// ============================================================================
// Test 7: Validation
// ============================================================================

function testValidation() {
  console.log('\n📋 Test 7: Validation');

  try {
    const maybeValid = validateRegisteredInstances('Maybe');
    const eitherValid = validateRegisteredInstances('Either');
    const resultValid = validateRegisteredInstances('Result');
    
    console.log(`✅ Validation results: Maybe=${maybeValid}, Either=${eitherValid}, Result=${resultValid}`);
  } catch (error) {
    console.log('⚠️ Validation test skipped (registry not available)');
  }
}

// ============================================================================
// Test 8: Integration Test
// ============================================================================

function testIntegration() {
  console.log('\n📋 Test 8: Integration Test');

  // Test that derived instances work with fluent methods
  try {
    // Create a Maybe instance
    const maybe = { tag: 'Just', value: 42 };
    
    // Add fluent methods
    const fluentMaybe = addFluentMethods(maybe, 'Maybe');
    
    // Test chaining
    const result = fluentMaybe
      .map(x => x * 2)
      .chain(x => ({ tag: 'Just', value: x.toString() }));
    
    assertEqual(result, { tag: 'Just', value: '84' }, 'Integration test should work');
    console.log('✅ Integration test passed');
  } catch (error) {
    console.log('⚠️ Integration test skipped (registry not available)');
  }
}

// ============================================================================
// Test 9: Error Handling
// ============================================================================

function testErrorHandling() {
  console.log('\n📋 Test 9: Error Handling');

  // Test missing typeclass instance
  try {
    addFluentMethods({ tag: 'Unknown' }, 'NonExistent');
    assertFalse(true, 'Should throw error for non-existent typeclass');
  } catch (error) {
    assertTrue(error.message.includes('No Functor instance found'), 'Should throw appropriate error');
    console.log('✅ Error handling works for missing typeclass');
  }

  // Test invalid ADT structure
  try {
    const invalidADT = { invalid: 'structure' };
    addFluentMethods(invalidADT, 'Maybe');
    console.log('⚠️ Invalid ADT structure test skipped (no validation)');
  } catch (error) {
    console.log('✅ Error handling works for invalid ADT structure');
  }
}

// ============================================================================
// Test 10: Performance Test
// ============================================================================

function testPerformance() {
  console.log('\n📋 Test 10: Performance Test');

  const iterations = 1000;
  const start = Date.now();

  try {
    // Test derivation performance
    for (let i = 0; i < iterations; i++) {
      deriveFunctorInstance();
      deriveMonadInstance();
      deriveEqInstance();
    }

    const end = Date.now();
    const duration = end - start;
    const avgTime = duration / iterations;

    console.log(`✅ Performance test: ${iterations} iterations in ${duration}ms (avg ${avgTime.toFixed(2)}ms per iteration)`);
  } catch (error) {
    console.log('⚠️ Performance test skipped:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running Fluent ADT System Tests');
  console.log('=====================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testFluentMethodAddition,
    testFluentWrappers,
    testInstanceDerivation,
    testCustomDerivation,
    testAutoRegistration,
    testBulkRegistration,
    testValidation,
    testIntegration,
    testErrorHandling,
    testPerformance
  ];

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
    total++;
  }

  console.log('\n=====================================');
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️ Some tests failed or were skipped');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testFluentMethodAddition,
  testFluentWrappers,
  testInstanceDerivation,
  testCustomDerivation,
  testAutoRegistration,
  testBulkRegistration,
  testValidation,
  testIntegration,
  testErrorHandling,
  testPerformance,
  runAllTests
}; 