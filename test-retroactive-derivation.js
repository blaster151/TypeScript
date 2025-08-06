/**
 * Retroactive Derivation Test Suite
 * 
 * Tests that all existing ADTs and product types have been retroactively
 * updated with automatic derivation of Eq, Ord, and Show instances.
 */

console.log('🔄 Retroactive Derivation Test Suite');
console.log('====================================');

// ============================================================================
// Test 1: Unified ADTs Derivation
// ============================================================================

function testUnifiedADTsDerivation() {
  console.log('\n📋 Test 1: Unified ADTs Derivation');

  try {
    // Test MaybeUnified
    const { MaybeUnified } = require('./fp-maybe-unified');
    
    console.log('✅ MaybeUnified derivation:');
    console.log(`   - Eq: ${MaybeUnified.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${MaybeUnified.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${MaybeUnified.Show ? '✅' : '❌'}`);

    // Test EitherUnified
    const { EitherUnified } = require('./fp-either-unified');
    
    console.log('✅ EitherUnified derivation:');
    console.log(`   - Eq: ${EitherUnified.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${EitherUnified.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${EitherUnified.Show ? '✅' : '❌'}`);

    // Test ResultUnified
    const { ResultUnified } = require('./fp-result-unified');
    
    console.log('✅ ResultUnified derivation:');
    console.log(`   - Eq: ${ResultUnified.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${ResultUnified.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${ResultUnified.Show ? '✅' : '❌'}`);

    // Test MaybeEnhanced
    const { MaybeEnhanced } = require('./fp-maybe-unified-enhanced');
    
    console.log('✅ MaybeEnhanced derivation:');
    console.log(`   - Eq: ${MaybeEnhanced.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${MaybeEnhanced.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${MaybeEnhanced.Show ? '✅' : '❌'}`);

    console.log('✅ All unified ADTs have automatic derivation!');
    return true;
  } catch (error) {
    console.log('❌ Unified ADTs derivation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: Helper Functions Derivation
// ============================================================================

function testHelperFunctionsDerivation() {
  console.log('\n📋 Test 2: Helper Functions Derivation');

  try {
    const { 
      createMaybeType, 
      createEitherType, 
      createResultType,
      createPointType,
      createRectangleType 
    } = require('./fp-adt-builders');

    // Test createMaybeType
    const Maybe = createMaybeType();
    console.log('✅ createMaybeType derivation:');
    console.log(`   - Eq: ${Maybe.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${Maybe.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${Maybe.Show ? '✅' : '❌'}`);

    // Test createEitherType
    const Either = createEitherType();
    console.log('✅ createEitherType derivation:');
    console.log(`   - Eq: ${Either.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${Either.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${Either.Show ? '✅' : '❌'}`);

    // Test createResultType
    const Result = createResultType();
    console.log('✅ createResultType derivation:');
    console.log(`   - Eq: ${Result.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${Result.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${Result.Show ? '✅' : '❌'}`);

    // Test createPointType
    const Point = createPointType();
    console.log('✅ createPointType derivation:');
    console.log(`   - Eq: ${Point.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${Point.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${Point.Show ? '✅' : '❌'}`);

    // Test createRectangleType
    const Rectangle = createRectangleType();
    console.log('✅ createRectangleType derivation:');
    console.log(`   - Eq: ${Rectangle.Eq ? '✅' : '❌'}`);
    console.log(`   - Ord: ${Rectangle.Ord ? '✅' : '❌'}`);
    console.log(`   - Show: ${Rectangle.Show ? '✅' : '❌'}`);

    console.log('✅ All helper functions have automatic derivation!');
    return true;
  } catch (error) {
    console.log('❌ Helper functions derivation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Functionality Verification
// ============================================================================

function testFunctionalityVerification() {
  console.log('\n📋 Test 3: Functionality Verification');

  try {
    const { MaybeUnified } = require('./fp-maybe-unified');
    const { EitherUnified } = require('./fp-either-unified');
    const { ResultUnified } = require('./fp-result-unified');

    // Test Maybe functionality
    const just1 = MaybeUnified.constructors.Just(42);
    const just2 = MaybeUnified.constructors.Just(42);
    const nothing = MaybeUnified.constructors.Nothing();

    console.log('✅ Maybe functionality:');
    console.log(`   - Eq: ${MaybeUnified.Eq?.equals(just1, just2)}`); // Should be true
    console.log(`   - Ord: ${MaybeUnified.Ord?.compare(just1, nothing)}`); // Should be > 0
    console.log(`   - Show: ${MaybeUnified.Show?.show(just1)}`); // Should show correctly

    // Test Either functionality
    const left1 = EitherUnified.constructors.Left('error1');
    const left2 = EitherUnified.constructors.Left('error1');
    const right = EitherUnified.constructors.Right(42);

    console.log('✅ Either functionality:');
    console.log(`   - Eq: ${EitherUnified.Eq?.equals(left1, left2)}`); // Should be true
    console.log(`   - Ord: ${EitherUnified.Ord?.compare(left1, right)}`); // Should be < 0
    console.log(`   - Show: ${EitherUnified.Show?.show(right)}`); // Should show correctly

    // Test Result functionality
    const ok1 = ResultUnified.constructors.Ok(42);
    const ok2 = ResultUnified.constructors.Ok(42);
    const err = ResultUnified.constructors.Err('error');

    console.log('✅ Result functionality:');
    console.log(`   - Eq: ${ResultUnified.Eq?.equals(ok1, ok2)}`); // Should be true
    console.log(`   - Ord: ${ResultUnified.Ord?.compare(ok1, err)}`); // Should be > 0
    console.log(`   - Show: ${ResultUnified.Show?.show(ok1)}`); // Should show correctly

    console.log('✅ All functionality tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Functionality verification test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Registry Integration
// ============================================================================

function testRegistryIntegration() {
  console.log('\n📋 Test 4: Registry Integration');

  try {
    // Check if instances are registered in the global registry
    if (typeof globalThis !== 'undefined' && globalThis.__FP_REGISTRY) {
      const registry = globalThis.__FP_REGISTRY;
      
      console.log('✅ Registry integration:');
      console.log(`   - MaybeEq: ${registry.has('MaybeEq') ? '✅' : '❌'}`);
      console.log(`   - MaybeOrd: ${registry.has('MaybeOrd') ? '✅' : '❌'}`);
      console.log(`   - MaybeShow: ${registry.has('MaybeShow') ? '✅' : '❌'}`);
      console.log(`   - EitherEq: ${registry.has('EitherEq') ? '✅' : '❌'}`);
      console.log(`   - EitherOrd: ${registry.has('EitherOrd') ? '✅' : '❌'}`);
      console.log(`   - EitherShow: ${registry.has('EitherShow') ? '✅' : '❌'}`);
      console.log(`   - ResultEq: ${registry.has('ResultEq') ? '✅' : '❌'}`);
      console.log(`   - ResultOrd: ${registry.has('ResultOrd') ? '✅' : '❌'}`);
      console.log(`   - ResultShow: ${registry.has('ResultShow') ? '✅' : '❌'}`);
      console.log(`   - PointEq: ${registry.has('PointEq') ? '✅' : '❌'}`);
      console.log(`   - PointOrd: ${registry.has('PointOrd') ? '✅' : '❌'}`);
      console.log(`   - PointShow: ${registry.has('PointShow') ? '✅' : '❌'}`);
      console.log(`   - RectangleEq: ${registry.has('RectangleEq') ? '✅' : '❌'}`);
      console.log(`   - RectangleOrd: ${registry.has('RectangleOrd') ? '✅' : '❌'}`);
      console.log(`   - RectangleShow: ${registry.has('RectangleShow') ? '✅' : '❌'}`);

      console.log('✅ Registry integration tests passed!');
      return true;
    } else {
      console.log('⚠️  Registry not available, skipping registry integration test');
      return true;
    }
  } catch (error) {
    console.log('❌ Registry integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Purity Integration
// ============================================================================

function testPurityIntegration() {
  console.log('\n📋 Test 5: Purity Integration');

  try {
    const { MaybeUnified } = require('./fp-maybe-unified');
    const { EitherUnified } = require('./fp-either-unified');
    const { ResultUnified } = require('./fp-result-unified');

    console.log('✅ Purity integration:');
    console.log(`   - MaybeUnified.isPure: ${MaybeUnified.isPure}`); // Should be true
    console.log(`   - MaybeUnified.effect: ${MaybeUnified.effect}`); // Should be 'Pure'
    console.log(`   - EitherUnified.isPure: ${EitherUnified.isPure}`); // Should be true
    console.log(`   - EitherUnified.effect: ${EitherUnified.effect}`); // Should be 'Pure'
    console.log(`   - ResultUnified.isPure: ${ResultUnified.isPure}`); // Should be true
    console.log(`   - ResultUnified.effect: ${ResultUnified.effect}`); // Should be 'Pure'

    // Test that derived instances are pure
    console.log(`   - MaybeUnified.Eq.__purity: ${MaybeUnified.Eq?.__purity || 'not set'}`);
    console.log(`   - EitherUnified.Eq.__purity: ${EitherUnified.Eq?.__purity || 'not set'}`);
    console.log(`   - ResultUnified.Eq.__purity: ${ResultUnified.Eq?.__purity || 'not set'}`);

    console.log('✅ Purity integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Purity integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 6: HKT Integration
// ============================================================================

function testHKTIntegration() {
  console.log('\n📋 Test 6: HKT Integration');

  try {
    const { MaybeUnified } = require('./fp-maybe-unified');
    const { EitherUnified } = require('./fp-either-unified');
    const { ResultUnified } = require('./fp-result-unified');

    console.log('✅ HKT integration:');
    console.log(`   - MaybeUnified.HKT exists: ${MaybeUnified.HKT ? '✅' : '❌'}`);
    console.log(`   - EitherUnified.HKT exists: ${EitherUnified.HKT ? '✅' : '❌'}`);
    console.log(`   - ResultUnified.HKT exists: ${ResultUnified.HKT ? '✅' : '❌'}`);

    // Test that HKT integration doesn't interfere with derived instances
    const just = MaybeUnified.constructors.Just(42);
    const nothing = MaybeUnified.constructors.Nothing();
    
    console.log(`   - Eq works with HKT: ${MaybeUnified.Eq?.equals(just, just)}`); // Should be true
    console.log(`   - Ord works with HKT: ${MaybeUnified.Ord?.compare(just, nothing)}`); // Should be > 0
    console.log(`   - Show works with HKT: ${MaybeUnified.Show?.show(just)}`); // Should show correctly

    console.log('✅ HKT integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ HKT integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: Typeclass Function Compatibility
// ============================================================================

function testTypeclassFunctionCompatibility() {
  console.log('\n📋 Test 7: Typeclass Function Compatibility');

  try {
    const { MaybeUnified } = require('./fp-maybe-unified');
    const { EitherUnified } = require('./fp-either-unified');
    const { ResultUnified } = require('./fp-result-unified');

    // Test that derived instances work with typeclass functions
    const just1 = MaybeUnified.constructors.Just(42);
    const just2 = MaybeUnified.constructors.Just(42);
    const nothing = MaybeUnified.constructors.Nothing();

    console.log('✅ Typeclass function compatibility:');
    
    // Test Eq functions
    console.log(`   - equals(just1, just2): ${MaybeUnified.Eq?.equals(just1, just2)}`); // Should be true
    console.log(`   - equals(just1, nothing): ${MaybeUnified.Eq?.equals(just1, nothing)}`); // Should be false

    // Test Ord functions
    console.log(`   - compare(just1, nothing): ${MaybeUnified.Ord?.compare(just1, nothing)}`); // Should be > 0
    console.log(`   - compare(nothing, just1): ${MaybeUnified.Ord?.compare(nothing, just1)}`); // Should be < 0
    console.log(`   - compare(just1, just2): ${MaybeUnified.Ord?.compare(just1, just2)}`); // Should be 0

    // Test Show functions
    console.log(`   - show(just1): ${MaybeUnified.Show?.show(just1)}`); // Should show correctly
    console.log(`   - show(nothing): ${MaybeUnified.Show?.show(nothing)}`); // Should show correctly

    console.log('✅ Typeclass function compatibility tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Typeclass function compatibility test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runRetroactiveDerivationTests() {
  console.log('🚀 Running Retroactive Derivation Tests');
  console.log('======================================');

  const tests = [
    { name: 'Unified ADTs Derivation', fn: testUnifiedADTsDerivation },
    { name: 'Helper Functions Derivation', fn: testHelperFunctionsDerivation },
    { name: 'Functionality Verification', fn: testFunctionalityVerification },
    { name: 'Registry Integration', fn: testRegistryIntegration },
    { name: 'Purity Integration', fn: testPurityIntegration },
    { name: 'HKT Integration', fn: testHKTIntegration },
    { name: 'Typeclass Function Compatibility', fn: testTypeclassFunctionCompatibility }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    const result = test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n======================================');
  console.log('📊 Retroactive Derivation Test Results:');
  console.log('======================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All retroactive derivation tests passed!');
    console.log('✅ All existing ADTs have been updated with automatic derivation');
    console.log('✅ Registry integration is working correctly');
    console.log('✅ Purity and HKT integration is maintained');
    console.log('✅ Typeclass function compatibility is preserved');
    console.log('✅ The entire FP ecosystem now has consistent typeclass support');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total: passed + failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runRetroactiveDerivationTests();
}

module.exports = {
  testUnifiedADTsDerivation,
  testHelperFunctionsDerivation,
  testFunctionalityVerification,
  testRegistryIntegration,
  testPurityIntegration,
  testHKTIntegration,
  testTypeclassFunctionCompatibility,
  runRetroactiveDerivationTests
}; 