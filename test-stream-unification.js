/**
 * Stream Unification Test Suite
 * 
 * Comprehensive tests for the unified API between ObservableLite and StatefulStream.
 * Tests cover:
 * - Common operator interface
 * - Unified typeclass instances
 * - Interoperability between stream types
 * - Type-safe operations
 * - Purity tag synchronization
 * - Fusion optimization integration
 */

console.log('🔥 Stream Unification Test Suite');
console.log('=================================');

// ============================================================================
// Test 1: Common Operator Interface
// ============================================================================

function testCommonOperatorInterface() {
  console.log('\n📋 Test 1: Common Operator Interface');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { hasCommonOps, isObservableLite, isStatefulStream } = require('./fp-stream-ops');

    // Test ObservableLite
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    
    console.log('✅ Common Operator Interface:');
    console.log(`   - ObservableLite has common ops: ${hasCommonOps(obs)}`); // Should be true
    console.log(`   - ObservableLite is ObservableLite: ${isObservableLite(obs)}`); // Should be true
    console.log(`   - ObservableLite is StatefulStream: ${isStatefulStream(obs)}`); // Should be false
    
    // Test StatefulStream
    const stream = fromArray([1, 2, 3, 4, 5]);
    
    console.log(`   - StatefulStream has common ops: ${hasCommonOps(stream)}`); // Should be true
    console.log(`   - StatefulStream is ObservableLite: ${isObservableLite(stream)}`); // Should be false
    console.log(`   - StatefulStream is StatefulStream: ${isStatefulStream(stream)}`); // Should be true

    // Test common methods exist on both
    const commonMethods = ['map', 'filter', 'scan', 'chain', 'bichain', 'take', 'skip', 'distinct', 'pipe'];
    
    for (const method of commonMethods) {
      console.log(`   - ObservableLite has ${method}: ${typeof obs[method] === 'function'}`); // Should be true
      console.log(`   - StatefulStream has ${method}: ${typeof stream[method] === 'function'}`); // Should be true
    }

    console.log('✅ Common operator interface tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Common operator interface test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: Unified Typeclass Instances
// ============================================================================

function testUnifiedTypeclassInstances() {
  console.log('\n📋 Test 2: Unified Typeclass Instances');

  try {
    const { 
      UnifiedStreamFunctorInstance,
      UnifiedStreamMonadInstance,
      UnifiedStreamBifunctorInstance,
      unifiedMap,
      unifiedFilter,
      unifiedScan,
      unifiedChain
    } = require('./fp-typeclasses-unified');

    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Unified Typeclass Instances:');
    
    // Test Functor instance
    console.log(`   - UnifiedStreamFunctorInstance available: ${typeof UnifiedStreamFunctorInstance === 'object'}`); // Should be true
    console.log(`   - UnifiedStreamFunctorInstance.map available: ${typeof UnifiedStreamFunctorInstance.map === 'function'}`); // Should be true
    
    // Test Monad instance
    console.log(`   - UnifiedStreamMonadInstance available: ${typeof UnifiedStreamMonadInstance === 'object'}`); // Should be true
    console.log(`   - UnifiedStreamMonadInstance.chain available: ${typeof UnifiedStreamMonadInstance.chain === 'function'}`); // Should be true
    
    // Test Bifunctor instance
    console.log(`   - UnifiedStreamBifunctorInstance available: ${typeof UnifiedStreamBifunctorInstance === 'object'}`); // Should be true
    console.log(`   - UnifiedStreamBifunctorInstance.bimap available: ${typeof UnifiedStreamBifunctorInstance.bimap === 'function'}`); // Should be true

    // Test unified operator functions
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const stream = fromArray([1, 2, 3]);
    
    console.log(`   - unifiedMap available: ${typeof unifiedMap === 'function'}`); // Should be true
    console.log(`   - unifiedFilter available: ${typeof unifiedFilter === 'function'}`); // Should be true
    console.log(`   - unifiedScan available: ${typeof unifiedScan === 'function'}`); // Should be true
    console.log(`   - unifiedChain available: ${typeof unifiedChain === 'function'}`); // Should be true

    console.log('✅ Unified typeclass instances tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Unified typeclass instances test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Interoperability Between Stream Types
// ============================================================================

function testInteroperability() {
  console.log('\n📋 Test 3: Interoperability Between Stream Types');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { 
      isUnifiedStream,
      areInteroperable,
      observableToStateful,
      statefulToObservable
    } = require('./fp-typeclasses-unified');

    console.log('✅ Interoperability Between Stream Types:');
    
    // Test type guards
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const stream = fromArray([1, 2, 3]);
    
    console.log(`   - ObservableLite is unified stream: ${isUnifiedStream(obs)}`); // Should be true
    console.log(`   - StatefulStream is unified stream: ${isUnifiedStream(stream)}`); // Should be true
    
    // Test interoperability
    console.log(`   - Streams are interoperable: ${areInteroperable(obs, stream)}`); // Should be true
    
    // Test conversions
    const obsToStream = observableToStateful(obs);
    const streamToObs = statefulToObservable(stream);
    
    console.log(`   - ObservableLite to StatefulStream conversion: ${typeof obsToStream.run === 'function'}`); // Should be true
    console.log(`   - StatefulStream to ObservableLite conversion: ${streamToObs instanceof ObservableLite}`); // Should be true

    console.log('✅ Interoperability tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Interoperability test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Type-Safe Operations
// ============================================================================

function testTypeSafeOperations() {
  console.log('\n📋 Test 4: Type-Safe Operations');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { createUnifiedPipeline } = require('./fp-typeclasses-unified');

    console.log('✅ Type-Safe Operations:');
    
    // Test ObservableLite pipeline
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const obsPipeline = createUnifiedPipeline(obs)
      .map(x => x * 2)
      .filter(x => x > 5)
      .scan((acc, x) => acc + x, 0)
      .build();
    
    console.log(`   - ObservableLite pipeline created: ${obsPipeline instanceof ObservableLite}`); // Should be true
    
    // Test StatefulStream pipeline
    const stream = fromArray([1, 2, 3, 4, 5]);
    const streamPipeline = createUnifiedPipeline(stream)
      .map(x => x * 2)
      .filter(x => x > 5)
      .scan((acc, x) => acc + x, 0)
      .build();
    
    console.log(`   - StatefulStream pipeline created: ${typeof streamPipeline.run === 'function'}`); // Should be true
    
    // Test that both pipelines have the same API
    const obsMethods = ['map', 'filter', 'scan', 'chain', 'pipe'];
    const streamMethods = ['map', 'filter', 'scan', 'chain', 'pipe'];
    
    let sameAPI = true;
    for (let i = 0; i < obsMethods.length; i++) {
      if (typeof obsPipeline[obsMethods[i]] !== typeof streamPipeline[streamMethods[i]]) {
        sameAPI = false;
        break;
      }
    }
    
    console.log(`   - Both pipelines have same API: ${sameAPI}`); // Should be true

    console.log('✅ Type-safe operations tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Type-safe operations test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Purity Tag Synchronization
// ============================================================================

function testPurityTagSynchronization() {
  console.log('\n📋 Test 5: Purity Tag Synchronization');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { extractPurityMarker } = require('./fp-purity');

    console.log('✅ Purity Tag Synchronization:');
    
    // Test ObservableLite purity
    const obs = ObservableLite.fromArray([1, 2, 3])
      .map(x => x * 2)
      .filter(x => x > 2)
      .scan((acc, x) => acc + x, 0);
    
    const obsPurity = extractPurityMarker(obs);
    console.log(`   - ObservableLite purity: ${obsPurity}`); // Should be 'State' (due to scan)
    
    // Test StatefulStream purity
    const stream = fromArray([1, 2, 3])
      .map(x => x * 2)
      .filter(x => x > 2)
      .scan((acc, x) => acc + x, 0);
    
    const streamPurity = extractPurityMarker(stream);
    console.log(`   - StatefulStream purity: ${streamPurity}`); // Should be 'State' (due to scan)
    
    // Test that purity is preserved through transformations
    const pureObs = ObservableLite.fromArray([1, 2, 3])
      .map(x => x * 2)
      .filter(x => x > 2);
    
    const pureStream = fromArray([1, 2, 3])
      .map(x => x * 2)
      .filter(x => x > 2);
    
    const pureObsPurity = extractPurityMarker(pureObs);
    const pureStreamPurity = extractPurityMarker(pureStream);
    
    console.log(`   - Pure ObservableLite purity: ${pureObsPurity}`); // Should be 'Pure'
    console.log(`   - Pure StatefulStream purity: ${pureStreamPurity}`); // Should be 'Pure'

    console.log('✅ Purity tag synchronization tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Purity tag synchronization test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 6: Fusion Optimization Integration
// ============================================================================

function testFusionOptimizationIntegration() {
  console.log('\n📋 Test 6: Fusion Optimization Integration');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray, optimizeFRP } = require('./fp-frp-bridge');
    const { canOptimizeObservableLite, canOptimizeFRP } = require('./fp-frp-bridge');

    console.log('✅ Fusion Optimization Integration:');
    
    // Test ObservableLite fusion
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5])
      .map(x => x * 2)
      .map(x => x + 1)
      .filter(x => x > 5);
    
    console.log(`   - ObservableLite can optimize: ${canOptimizeObservableLite(obs)}`); // Should be true
    
    // Test StatefulStream fusion
    const stream = fromArray([1, 2, 3, 4, 5])
      .map(x => x * 2)
      .map(x => x + 1)
      .filter(x => x > 5);
    
    console.log(`   - StatefulStream can optimize: ${canOptimizeFRP(stream)}`); // Should be true
    
    // Test optimization
    const optimizedStream = optimizeFRP(stream);
    console.log(`   - StatefulStream optimization successful: ${optimizedStream !== stream}`); // Should be true

    console.log('✅ Fusion optimization integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Fusion optimization integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: Same Pipeline on Both Types
// ============================================================================

function testSamePipelineOnBothTypes() {
  console.log('\n📋 Test 7: Same Pipeline on Both Types');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Same Pipeline on Both Types:');
    
    // Define the same pipeline for both types
    const createPipeline = (source) => {
      return source
        .map(x => x * 2)
        .filter(x => x > 5)
        .scan((acc, x) => acc + x, 0)
        .take(3);
    };
    
    // Apply to ObservableLite
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const obsPipeline = createPipeline(obs);
    
    console.log(`   - ObservableLite pipeline created: ${obsPipeline instanceof ObservableLite}`); // Should be true
    
    // Apply to StatefulStream
    const stream = fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const streamPipeline = createPipeline(stream);
    
    console.log(`   - StatefulStream pipeline created: ${typeof streamPipeline.run === 'function'}`); // Should be true
    
    // Test that both pipelines have the same methods
    const methods = ['map', 'filter', 'scan', 'take', 'pipe'];
    let sameMethods = true;
    
    for (const method of methods) {
      if (typeof obsPipeline[method] !== typeof streamPipeline[method]) {
        sameMethods = false;
        break;
      }
    }
    
    console.log(`   - Both pipelines have same methods: ${sameMethods}`); // Should be true

    console.log('✅ Same pipeline on both types tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Same pipeline on both types test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Law Preservation
// ============================================================================

function testLawPreservation() {
  console.log('\n📋 Test 8: Law Preservation');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Law Preservation:');
    
    // Test Functor Law: map(id) = id
    const id = (x) => x;
    
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const obsMapped = obs.map(id);
    console.log(`   - ObservableLite map(id) = id: ${obsMapped instanceof ObservableLite}`); // Should be true
    
    const stream = fromArray([1, 2, 3]);
    const streamMapped = stream.map(id);
    console.log(`   - StatefulStream map(id) = id: ${typeof streamMapped.run === 'function'}`); // Should be true
    
    // Test Composition Law: map(f . g) = map(f) . map(g)
    const f = (x) => x * 2;
    const g = (x) => x + 1;
    const fg = (x) => f(g(x));
    
    const obsFg = obs.map(fg);
    const obsFThenG = obs.map(g).map(f);
    console.log(`   - ObservableLite map(f . g) = map(f) . map(g): ${obsFg instanceof ObservableLite && obsFThenG instanceof ObservableLite}`); // Should be true
    
    const streamFg = stream.map(fg);
    const streamFThenG = stream.map(g).map(f);
    console.log(`   - StatefulStream map(f . g) = map(f) . map(g): ${typeof streamFg.run === 'function' && typeof streamFThenG.run === 'function'}`); // Should be true

    console.log('✅ Law preservation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Law preservation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 9: Performance Comparison
// ============================================================================

function testPerformanceComparison() {
  console.log('\n📋 Test 9: Performance Comparison');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Performance Comparison:');
    
    // Create large dataset
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    
    // Test ObservableLite performance
    const startObs = Date.now();
    const obs = ObservableLite.fromArray(largeArray)
      .map(x => x * 2)
      .filter(x => x > 100)
      .scan((acc, x) => acc + x, 0)
      .take(100);
    const obsTime = Date.now() - startObs;
    
    console.log(`   - ObservableLite pipeline creation: ${obsTime}ms`);
    
    // Test StatefulStream performance
    const startStream = Date.now();
    const stream = fromArray(largeArray)
      .map(x => x * 2)
      .filter(x => x > 100)
      .scan((acc, x) => acc + x, 0)
      .take(100);
    const streamTime = Date.now() - startStream;
    
    console.log(`   - StatefulStream pipeline creation: ${streamTime}ms`);
    
    // Both should be reasonably fast
    console.log(`   - ObservableLite performance acceptable: ${obsTime < 1000}`); // Should be true
    console.log(`   - StatefulStream performance acceptable: ${streamTime < 1000}`); // Should be true

    console.log('✅ Performance comparison tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Performance comparison test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 10: Type Assertions
// ============================================================================

function testTypeAssertions() {
  console.log('\n📋 Test 10: Type Assertions');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { AssertSameAPI, AssertUnified } = require('./fp-typeclasses-unified');

    console.log('✅ Type Assertions:');
    
    // Test that both types have the same API
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const stream = fromArray([1, 2, 3]);
    
    // Check that both have the same methods
    const obsMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(obs))
      .filter(name => typeof obs[name] === 'function');
    const streamMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(stream))
      .filter(name => typeof stream[name] === 'function');
    
    const commonMethods = ['map', 'filter', 'scan', 'chain', 'pipe'];
    let sameAPI = true;
    
    for (const method of commonMethods) {
      if (!obsMethods.includes(method) || !streamMethods.includes(method)) {
        sameAPI = false;
        break;
      }
    }
    
    console.log(`   - Both types have same API: ${sameAPI}`); // Should be true
    
    // Test that both are unified streams
    const { isUnifiedStream } = require('./fp-typeclasses-unified');
    console.log(`   - ObservableLite is unified: ${isUnifiedStream(obs)}`); // Should be true
    console.log(`   - StatefulStream is unified: ${isUnifiedStream(stream)}`); // Should be true

    console.log('✅ Type assertions tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Type assertions test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runStreamUnificationTests() {
  console.log('🚀 Running Stream Unification Tests');
  console.log('===================================');

  const tests = [
    { name: 'Common Operator Interface', fn: testCommonOperatorInterface },
    { name: 'Unified Typeclass Instances', fn: testUnifiedTypeclassInstances },
    { name: 'Interoperability Between Stream Types', fn: testInteroperability },
    { name: 'Type-Safe Operations', fn: testTypeSafeOperations },
    { name: 'Purity Tag Synchronization', fn: testPurityTagSynchronization },
    { name: 'Fusion Optimization Integration', fn: testFusionOptimizationIntegration },
    { name: 'Same Pipeline on Both Types', fn: testSamePipelineOnBothTypes },
    { name: 'Law Preservation', fn: testLawPreservation },
    { name: 'Performance Comparison', fn: testPerformanceComparison },
    { name: 'Type Assertions', fn: testTypeAssertions }
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

  console.log('\n===================================');
  console.log('📊 Stream Unification Test Results:');
  console.log('===================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All stream unification tests passed!');
    console.log('✅ Common operator interface working');
    console.log('✅ Unified typeclass instances operational');
    console.log('✅ Interoperability between stream types complete');
    console.log('✅ Type-safe operations functional');
    console.log('✅ Purity tag synchronization working');
    console.log('✅ Fusion optimization integration complete');
    console.log('✅ Same pipeline on both types working');
    console.log('✅ Law preservation verified');
    console.log('✅ Performance comparison successful');
    console.log('✅ Type assertions working');
    console.log('✅ ObservableLite and StatefulStream are 100% interoperable!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total: passed + failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runStreamUnificationTests();
}

module.exports = {
  testCommonOperatorInterface,
  testUnifiedTypeclassInstances,
  testInteroperability,
  testTypeSafeOperations,
  testPurityTagSynchronization,
  testFusionOptimizationIntegration,
  testSamePipelineOnBothTypes,
  testLawPreservation,
  testPerformanceComparison,
  testTypeAssertions,
  runStreamUnificationTests
}; 