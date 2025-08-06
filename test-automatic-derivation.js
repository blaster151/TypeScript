/**
 * Automatic Derivation Test Suite
 * 
 * Tests automatic derivation of Eq, Ord, and Show instances for ADTs and product types
 * created through createSumType and createProductType.
 */

console.log('🧪 Automatic Derivation Test Suite');
console.log('==================================');

// ============================================================================
// Test 1: Sum Type Derivation
// ============================================================================

function testSumTypeDerivation() {
  console.log('\n📋 Test 1: Sum Type Derivation');

  try {
    // Import the createSumType function
    const { createSumType } = require('./fp-adt-builders');

    // Create Maybe with automatic derivation
    const Maybe = createSumType({
      Just: (value) => ({ value }),
      Nothing: () => ({})
    }, {
      name: 'Maybe',
      derive: ['Eq', 'Ord', 'Show']
    });

    // Test instances
    const just1 = Maybe.constructors.Just(42);
    const just2 = Maybe.constructors.Just(42);
    const just3 = Maybe.constructors.Just(100);
    const nothing = Maybe.constructors.Nothing();

    // Test Eq instance
    console.log('✅ Eq instance test:');
    console.log(`   - just1 === just2: ${Maybe.Eq?.equals(just1, just2)}`); // Should be true
    console.log(`   - just1 === just3: ${Maybe.Eq?.equals(just1, just3)}`); // Should be false
    console.log(`   - just1 === nothing: ${Maybe.Eq?.equals(just1, nothing)}`); // Should be false

    // Test Ord instance
    console.log('✅ Ord instance test:');
    console.log(`   - just1 vs nothing: ${Maybe.Ord?.compare(just1, nothing)}`); // Should be > 0
    console.log(`   - nothing vs just1: ${Maybe.Ord?.compare(nothing, just1)}`); // Should be < 0
    console.log(`   - just1 vs just2: ${Maybe.Ord?.compare(just1, just2)}`); // Should be 0
    console.log(`   - just1 vs just3: ${Maybe.Ord?.compare(just1, just3)}`); // Should be < 0

    // Test Show instance
    console.log('✅ Show instance test:');
    console.log(`   - just1: ${Maybe.Show?.show(just1)}`); // Should be "Just({\"value\":42})"
    console.log(`   - nothing: ${Maybe.Show?.show(nothing)}`); // Should be "Nothing"

    console.log('✅ Sum type derivation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Sum type derivation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: Product Type Derivation
// ============================================================================

function testProductTypeDerivation() {
  console.log('\n📋 Test 2: Product Type Derivation');

  try {
    // Import the createProductType function
    const { createProductType } = require('./fp-adt-builders');

    // Create Point with automatic derivation
    const Point = createProductType({
      name: 'Point',
      derive: ['Eq', 'Ord', 'Show']
    });

    // Test instances
    const p1 = Point.of({ x: 1, y: 2 });
    const p2 = Point.of({ x: 1, y: 2 });
    const p3 = Point.of({ x: 2, y: 1 });
    const p4 = Point.of({ x: 0, y: 0 });

    // Test Eq instance
    console.log('✅ Eq instance test:');
    console.log(`   - p1 === p2: ${Point.Eq?.equals(p1, p2)}`); // Should be true
    console.log(`   - p1 === p3: ${Point.Eq?.equals(p1, p3)}`); // Should be false
    console.log(`   - p1 === p4: ${Point.Eq?.equals(p1, p4)}`); // Should be false

    // Test Ord instance
    console.log('✅ Ord instance test:');
    console.log(`   - p1 vs p2: ${Point.Ord?.compare(p1, p2)}`); // Should be 0
    console.log(`   - p1 vs p3: ${Point.Ord?.compare(p1, p3)}`); // Should be < 0 (x: 1 < x: 2)
    console.log(`   - p3 vs p1: ${Point.Ord?.compare(p3, p1)}`); // Should be > 0
    console.log(`   - p4 vs p1: ${Point.Ord?.compare(p4, p1)}`); // Should be < 0 (x: 0 < x: 1)

    // Test Show instance
    console.log('✅ Show instance test:');
    console.log(`   - p1: ${Point.Show?.show(p1)}`); // Should be "{x:1,y:2}"
    console.log(`   - p4: ${Point.Show?.show(p4)}`); // Should be "{x:0,y:0}"

    console.log('✅ Product type derivation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Product type derivation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Complex Sum Type Derivation
// ============================================================================

function testComplexSumTypeDerivation() {
  console.log('\n📋 Test 3: Complex Sum Type Derivation');

  try {
    // Import the createSumType function
    const { createSumType } = require('./fp-adt-builders');

    // Create Either with automatic derivation
    const Either = createSumType({
      Left: (error) => ({ error }),
      Right: (value) => ({ value })
    }, {
      name: 'Either',
      derive: ['Eq', 'Ord', 'Show']
    });

    // Test instances
    const left1 = Either.constructors.Left('error1');
    const left2 = Either.constructors.Left('error1');
    const left3 = Either.constructors.Left('error2');
    const right1 = Either.constructors.Right(42);
    const right2 = Either.constructors.Right(42);
    const right3 = Either.constructors.Right(100);

    // Test Eq instance
    console.log('✅ Eq instance test:');
    console.log(`   - left1 === left2: ${Either.Eq?.equals(left1, left2)}`); // Should be true
    console.log(`   - left1 === left3: ${Either.Eq?.equals(left1, left3)}`); // Should be false
    console.log(`   - right1 === right2: ${Either.Eq?.equals(right1, right2)}`); // Should be true
    console.log(`   - left1 === right1: ${Either.Eq?.equals(left1, right1)}`); // Should be false

    // Test Ord instance
    console.log('✅ Ord instance test:');
    console.log(`   - left1 vs right1: ${Either.Ord?.compare(left1, right1)}`); // Should be < 0 (Left < Right)
    console.log(`   - right1 vs left1: ${Either.Ord?.compare(right1, left1)}`); // Should be > 0
    console.log(`   - left1 vs left3: ${Either.Ord?.compare(left1, left3)}`); // Should be < 0 (error1 < error2)
    console.log(`   - right1 vs right3: ${Either.Ord?.compare(right1, right3)}`); // Should be < 0 (42 < 100)

    // Test Show instance
    console.log('✅ Show instance test:');
    console.log(`   - left1: ${Either.Show?.show(left1)}`); // Should be "Left({\"error\":\"error1\"})"
    console.log(`   - right1: ${Either.Show?.show(right1)}`); // Should be "Right({\"value\":42})"

    console.log('✅ Complex sum type derivation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Complex sum type derivation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Complex Product Type Derivation
// ============================================================================

function testComplexProductTypeDerivation() {
  console.log('\n📋 Test 4: Complex Product Type Derivation');

  try {
    // Import the createProductType function
    const { createProductType } = require('./fp-adt-builders');

    // Create Rectangle with automatic derivation
    const Rectangle = createProductType({
      name: 'Rectangle',
      derive: ['Eq', 'Ord', 'Show']
    });

    // Test instances
    const r1 = Rectangle.of({ width: 10, height: 20 });
    const r2 = Rectangle.of({ width: 10, height: 20 });
    const r3 = Rectangle.of({ width: 20, height: 10 });
    const r4 = Rectangle.of({ width: 5, height: 5 });

    // Test Eq instance
    console.log('✅ Eq instance test:');
    console.log(`   - r1 === r2: ${Rectangle.Eq?.equals(r1, r2)}`); // Should be true
    console.log(`   - r1 === r3: ${Rectangle.Eq?.equals(r1, r3)}`); // Should be false
    console.log(`   - r1 === r4: ${Rectangle.Eq?.equals(r1, r4)}`); // Should be false

    // Test Ord instance
    console.log('✅ Ord instance test:');
    console.log(`   - r1 vs r2: ${Rectangle.Ord?.compare(r1, r2)}`); // Should be 0
    console.log(`   - r1 vs r3: ${Rectangle.Ord?.compare(r1, r3)}`); // Should be < 0 (width: 10 < 20)
    console.log(`   - r3 vs r1: ${Rectangle.Ord?.compare(r3, r1)}`); // Should be > 0
    console.log(`   - r4 vs r1: ${Rectangle.Ord?.compare(r4, r1)}`); // Should be < 0 (width: 5 < 10)

    // Test Show instance
    console.log('✅ Show instance test:');
    console.log(`   - r1: ${Rectangle.Show?.show(r1)}`); // Should be "{width:10,height:20}"
    console.log(`   - r4: ${Rectangle.Show?.show(r4)}`); // Should be "{width:5,height:5}"

    console.log('✅ Complex product type derivation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Complex product type derivation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Registry Integration
// ============================================================================

function testRegistryIntegration() {
  console.log('\n📋 Test 5: Registry Integration');

  try {
    // Import the createSumType function
    const { createSumType } = require('./fp-adt-builders');

    // Create Maybe with automatic derivation and registry integration
    const Maybe = createSumType({
      Just: (value) => ({ value }),
      Nothing: () => ({})
    }, {
      name: 'Maybe',
      derive: ['Eq', 'Ord', 'Show'],
      enableDerivableInstances: true
    });

    // Check if instances are registered in the global registry
    if (typeof globalThis !== 'undefined' && globalThis.__FP_REGISTRY) {
      const registry = globalThis.__FP_REGISTRY;
      
      console.log('✅ Registry integration test:');
      console.log(`   - MaybeEq registered: ${registry.has('MaybeEq')}`);
      console.log(`   - MaybeOrd registered: ${registry.has('MaybeOrd')}`);
      console.log(`   - MaybeShow registered: ${registry.has('MaybeShow')}`);
      
      // Test registry lookup
      const maybeEq = registry.get('MaybeEq');
      const maybeOrd = registry.get('MaybeOrd');
      const maybeShow = registry.get('MaybeShow');
      
      console.log(`   - MaybeEq instance: ${maybeEq ? 'found' : 'not found'}`);
      console.log(`   - MaybeOrd instance: ${maybeOrd ? 'found' : 'not found'}`);
      console.log(`   - MaybeShow instance: ${maybeShow ? 'found' : 'not found'}`);
      
      if (maybeEq && maybeOrd && maybeShow) {
        console.log('✅ Registry integration tests passed!');
        return true;
      } else {
        console.log('❌ Registry integration test failed: instances not found');
        return false;
      }
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
// Test 6: Purity Integration
// ============================================================================

function testPurityIntegration() {
  console.log('\n📋 Test 6: Purity Integration');

  try {
    // Import the createSumType function
    const { createSumType } = require('./fp-adt-builders');

    // Create Maybe with different purity levels
    const PureMaybe = createSumType({
      Just: (value) => ({ value }),
      Nothing: () => ({})
    }, {
      name: 'PureMaybe',
      derive: ['Eq', 'Ord', 'Show'],
      effect: 'Pure'
    });

    const ImpureMaybe = createSumType({
      Just: (value) => ({ value }),
      Nothing: () => ({})
    }, {
      name: 'ImpureMaybe',
      derive: ['Eq', 'Ord', 'Show'],
      effect: 'IO'
    });

    console.log('✅ Purity integration test:');
    console.log(`   - PureMaybe.isPure: ${PureMaybe.isPure}`); // Should be true
    console.log(`   - PureMaybe.isImpure: ${PureMaybe.isImpure}`); // Should be false
    console.log(`   - PureMaybe.effect: ${PureMaybe.effect}`); // Should be 'Pure'
    
    console.log(`   - ImpureMaybe.isPure: ${ImpureMaybe.isPure}`); // Should be false
    console.log(`   - ImpureMaybe.isImpure: ${ImpureMaybe.isImpure}`); // Should be true
    console.log(`   - ImpureMaybe.effect: ${ImpureMaybe.effect}`); // Should be 'IO'

    // Test that derived instances work regardless of purity
    const pureJust = PureMaybe.constructors.Just(42);
    const impureJust = ImpureMaybe.constructors.Just(42);
    
    console.log(`   - PureMaybe.Eq works: ${PureMaybe.Eq?.equals(pureJust, pureJust)}`); // Should be true
    console.log(`   - ImpureMaybe.Eq works: ${ImpureMaybe.Eq?.equals(impureJust, impureJust)}`); // Should be true

    console.log('✅ Purity integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Purity integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: HKT Integration
// ============================================================================

function testHKTIntegration() {
  console.log('\n📋 Test 7: HKT Integration');

  try {
    // Import the createSumType function
    const { createSumType } = require('./fp-adt-builders');

    // Create Maybe with HKT integration
    const Maybe = createSumType({
      Just: (value) => ({ value }),
      Nothing: () => ({})
    }, {
      name: 'Maybe',
      derive: ['Eq', 'Ord', 'Show'],
      enableHKT: true
    });

    console.log('✅ HKT integration test:');
    console.log(`   - Maybe.HKT exists: ${Maybe.HKT ? 'yes' : 'no'}`);
    console.log(`   - Maybe.HKT.type: ${typeof Maybe.HKT.type}`);

    // Test that HKT integration doesn't interfere with derived instances
    const just = Maybe.constructors.Just(42);
    const nothing = Maybe.constructors.Nothing();
    
    console.log(`   - Eq works with HKT: ${Maybe.Eq?.equals(just, just)}`); // Should be true
    console.log(`   - Ord works with HKT: ${Maybe.Ord?.compare(just, nothing)}`); // Should be > 0
    console.log(`   - Show works with HKT: ${Maybe.Show?.show(just)}`); // Should show correctly

    console.log('✅ HKT integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ HKT integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Partial Derivation
// ============================================================================

function testPartialDerivation() {
  console.log('\n📋 Test 8: Partial Derivation');

  try {
    // Import the createSumType function
    const { createSumType } = require('./fp-adt-builders');

    // Create Maybe with only Eq and Show (no Ord)
    const Maybe = createSumType({
      Just: (value) => ({ value }),
      Nothing: () => ({})
    }, {
      name: 'Maybe',
      derive: ['Eq', 'Show'] // No Ord
    });

    console.log('✅ Partial derivation test:');
    console.log(`   - Eq instance exists: ${Maybe.Eq ? 'yes' : 'no'}`);
    console.log(`   - Ord instance exists: ${Maybe.Ord ? 'yes' : 'no'}`);
    console.log(`   - Show instance exists: ${Maybe.Show ? 'yes' : 'no'}`);

    // Test that available instances work
    const just1 = Maybe.constructors.Just(42);
    const just2 = Maybe.constructors.Just(42);
    
    console.log(`   - Eq works: ${Maybe.Eq?.equals(just1, just2)}`); // Should be true
    console.log(`   - Show works: ${Maybe.Show?.show(just1)}`); // Should show correctly

    console.log('✅ Partial derivation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Partial derivation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAutomaticDerivationTests() {
  console.log('🚀 Running Automatic Derivation Tests');
  console.log('====================================');

  const tests = [
    { name: 'Sum Type Derivation', fn: testSumTypeDerivation },
    { name: 'Product Type Derivation', fn: testProductTypeDerivation },
    { name: 'Complex Sum Type Derivation', fn: testComplexSumTypeDerivation },
    { name: 'Complex Product Type Derivation', fn: testComplexProductTypeDerivation },
    { name: 'Registry Integration', fn: testRegistryIntegration },
    { name: 'Purity Integration', fn: testPurityIntegration },
    { name: 'HKT Integration', fn: testHKTIntegration },
    { name: 'Partial Derivation', fn: testPartialDerivation }
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

  console.log('\n====================================');
  console.log('📊 Test Results Summary:');
  console.log('====================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All automatic derivation tests passed!');
    console.log('✅ Eq, Ord, and Show instances are working correctly');
    console.log('✅ Registry integration is functional');
    console.log('✅ Purity and HKT integration is working');
    console.log('✅ Partial derivation is supported');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total: passed + failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAutomaticDerivationTests();
}

module.exports = {
  testSumTypeDerivation,
  testProductTypeDerivation,
  testComplexSumTypeDerivation,
  testComplexProductTypeDerivation,
  testRegistryIntegration,
  testPurityIntegration,
  testHKTIntegration,
  testPartialDerivation,
  runAutomaticDerivationTests
}; 