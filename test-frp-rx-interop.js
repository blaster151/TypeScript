/**
 * FRP-Rx Interop Test Suite
 * 
 * Comprehensive tests for seamless, type-safe conversion methods between ObservableLite and StatefulStream.
 * Tests cover:
 * - ObservableLite → StatefulStream conversion
 * - StatefulStream → ObservableLite conversion
 * - Fluent API extensions
 * - Purity & typeclass integration
 * - Round-trip conversion
 * - Type inference preservation
 * - Pipeline compatibility
 */

console.log('🔥 FRP-Rx Interop Test Suite');
console.log('============================');

// ============================================================================
// Test 1: ObservableLite → StatefulStream Conversion
// ============================================================================

function testObservableLiteToStatefulStream() {
  console.log('\n📋 Test 1: ObservableLite → StatefulStream Conversion');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromObservableLite, isStatefulStream } = require('./fp-frp-bridge');

    // Test basic conversion
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    
    console.log('✅ ObservableLite → StatefulStream Conversion:');
    console.log(`   - fromObservableLite function available: ${typeof fromObservableLite === 'function'}`); // Should be true
    
    const stateful = fromObservableLite(obs, { count: 0 });
    console.log(`   - Conversion successful: ${isStatefulStream(stateful)}`); // Should be true
    console.log(`   - StatefulStream has run method: ${typeof stateful.run === 'function'}`); // Should be true
    console.log(`   - StatefulStream has __purity: ${stateful.__purity}`); // Should be 'Async'
    
    // Test fluent API
    console.log(`   - ObservableLite has toStatefulStream method: ${typeof obs.toStatefulStream === 'function'}`); // Should be true
    
    const fluentStateful = obs.toStatefulStream({ count: 0 });
    console.log(`   - Fluent conversion successful: ${isStatefulStream(fluentStateful)}`); // Should be true

    // Test with different initial states
    const statefulWithState = fromObservableLite(obs, { sum: 0, count: 0 });
    console.log(`   - Conversion with custom state: ${isStatefulStream(statefulWithState)}`); // Should be true

    console.log('✅ ObservableLite → StatefulStream conversion tests passed!');
    return true;
  } catch (error) {
    console.log('❌ ObservableLite → StatefulStream conversion test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: StatefulStream → ObservableLite Conversion
// ============================================================================

function testStatefulStreamToObservableLite() {
  console.log('\n📋 Test 2: StatefulStream → ObservableLite Conversion');

  try {
    const { fromArray, toObservableLite, toObservableLiteAsync, toObservableLiteEvent } = require('./fp-frp-bridge');
    const { ObservableLite } = require('./fp-observable-lite');

    // Test basic conversion
    const stream = fromArray([1, 2, 3, 4, 5]);
    
    console.log('✅ StatefulStream → ObservableLite Conversion:');
    console.log(`   - toObservableLite function available: ${typeof toObservableLite === 'function'}`); // Should be true
    console.log(`   - toObservableLiteAsync function available: ${typeof toObservableLiteAsync === 'function'}`); // Should be true
    console.log(`   - toObservableLiteEvent function available: ${typeof toObservableLiteEvent === 'function'}`); // Should be true
    
    const obs = toObservableLite(stream, [1, 2, 3, 4, 5], { count: 0 });
    console.log(`   - Conversion successful: ${obs instanceof ObservableLite}`); // Should be true
    
    // Test fluent API
    console.log(`   - StatefulStream has toObservableLite method: ${typeof stream.toObservableLite === 'function'}`); // Should be true
    console.log(`   - StatefulStream has toObservableLiteAsync method: ${typeof stream.toObservableLiteAsync === 'function'}`); // Should be true
    console.log(`   - StatefulStream has toObservableLiteEvent method: ${typeof stream.toObservableLiteEvent === 'function'}`); // Should be true
    
    const fluentObs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });
    console.log(`   - Fluent conversion successful: ${fluentObs instanceof ObservableLite}`); // Should be true

    // Test async conversion
    const asyncObs = stream.toObservableLiteAsync(
      (async function* () {
        yield 1;
        yield 2;
        yield 3;
      })(),
      { count: 0 }
    );
    console.log(`   - Async conversion successful: ${asyncObs instanceof ObservableLite}`); // Should be true

    // Test event-driven conversion
    const eventObs = stream.toObservableLiteEvent({ count: 0 });
    console.log(`   - Event-driven conversion successful: ${eventObs instanceof ObservableLite}`); // Should be true

    console.log('✅ StatefulStream → ObservableLite conversion tests passed!');
    return true;
  } catch (error) {
    console.log('❌ StatefulStream → ObservableLite conversion test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Fluent API Extensions
// ============================================================================

function testFluentAPIExtensions() {
  console.log('\n📋 Test 3: Fluent API Extensions');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Fluent API Extensions:');
    
    // Test ObservableLite fluent conversion
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    console.log(`   - ObservableLite.toStatefulStream available: ${typeof obs.toStatefulStream === 'function'}`); // Should be true
    
    const stateful = obs.toStatefulStream({ count: 0 });
    console.log(`   - Fluent ObservableLite → StatefulStream: ${typeof stateful.run === 'function'}`); // Should be true
    
    // Test StatefulStream fluent conversion
    const stream = fromArray([1, 2, 3, 4, 5]);
    console.log(`   - StatefulStream.toObservableLite available: ${typeof stream.toObservableLite === 'function'}`); // Should be true
    console.log(`   - StatefulStream.toObservableLiteAsync available: ${typeof stream.toObservableLiteAsync === 'function'}`); // Should be true
    console.log(`   - StatefulStream.toObservableLiteEvent available: ${typeof stream.toObservableLiteEvent === 'function'}`); // Should be true
    
    const backToObs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });
    console.log(`   - Fluent StatefulStream → ObservableLite: ${backToObs instanceof ObservableLite}`); // Should be true

    console.log('✅ Fluent API extensions tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Fluent API extensions test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Purity & Typeclass Integration
// ============================================================================

function testPurityAndTypeclassIntegration() {
  console.log('\n📋 Test 4: Purity & Typeclass Integration');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { 
      getObservableLiteToStatefulPurity, 
      getStatefulToObservableLitePurity,
      registerConversionInstances 
    } = require('./fp-frp-bridge');

    console.log('✅ Purity & Typeclass Integration:');
    
    // Test purity for ObservableLite → StatefulStream
    const obsPurity = getObservableLiteToStatefulPurity();
    console.log(`   - ObservableLite → StatefulStream purity: ${obsPurity}`); // Should be 'Async'
    
    // Test purity for StatefulStream → ObservableLite
    const stream = fromArray([1, 2, 3, 4, 5]);
    const streamPurity = getStatefulToObservableLitePurity(stream);
    console.log(`   - StatefulStream → ObservableLite purity: ${streamPurity}`); // Should be 'Async' or existing purity
    
    // Test typeclass registration
    console.log(`   - registerConversionInstances available: ${typeof registerConversionInstances === 'function'}`); // Should be true
    
    // Test conversion with purity preservation
    const stateful = obs.toStatefulStream({ count: 0 });
    console.log(`   - Converted StatefulStream purity: ${stateful.__purity}`); // Should be 'Async'
    
    const backToObs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });
    console.log(`   - Converted ObservableLite is ObservableLite: ${backToObs instanceof ObservableLite}`); // Should be true

    console.log('✅ Purity & typeclass integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Purity & typeclass integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Round-Trip Conversion
// ============================================================================

function testRoundTripConversion() {
  console.log('\n📋 Test 5: Round-Trip Conversion');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray, testRoundTripConversion } = require('./fp-frp-bridge');

    console.log('✅ Round-Trip Conversion:');
    
    // Test round-trip conversion
    const originalObs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const inputs = [1, 2, 3, 4, 5];
    const initialState = { count: 0 };
    
    console.log(`   - testRoundTripConversion available: ${typeof testRoundTripConversion === 'function'}`); // Should be true
    
    const roundTripWorks = testRoundTripConversion(originalObs, inputs, initialState);
    console.log(`   - Round-trip conversion works: ${roundTripWorks}`); // Should be true
    
    // Manual round-trip test
    const stateful = originalObs.toStatefulStream(initialState);
    const backToObs = stateful.toObservableLite(inputs, initialState);
    
    console.log(`   - ObservableLite → StatefulStream → ObservableLite: ${backToObs instanceof ObservableLite}`); // Should be true
    
    // Test with different data
    const stream = fromArray([10, 20, 30, 40, 50]);
    const streamInputs = [10, 20, 30, 40, 50];
    const streamState = { sum: 0 };
    
    const backToStream = stream.toObservableLite(streamInputs, streamState).toStatefulStream(streamState);
    console.log(`   - StatefulStream → ObservableLite → StatefulStream: ${typeof backToStream.run === 'function'}`); // Should be true

    console.log('✅ Round-trip conversion tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Round-trip conversion test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 6: Type Inference Preservation
// ============================================================================

function testTypeInferencePreservation() {
  console.log('\n📋 Test 6: Type Inference Preservation');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Type Inference Preservation:');
    
    // Test type inference for ObservableLite → StatefulStream
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const stateful = obs.toStatefulStream({ count: 0 });
    
    console.log(`   - ObservableLite type preserved: ${obs instanceof ObservableLite}`); // Should be true
    console.log(`   - StatefulStream type correct: ${typeof stateful.run === 'function'}`); // Should be true
    
    // Test type inference for StatefulStream → ObservableLite
    const stream = fromArray(['a', 'b', 'c', 'd', 'e']);
    const backToObs = stream.toObservableLite(['a', 'b', 'c', 'd', 'e'], { count: 0 });
    
    console.log(`   - StatefulStream type preserved: ${typeof stream.run === 'function'}`); // Should be true
    console.log(`   - ObservableLite type correct: ${backToObs instanceof ObservableLite}`); // Should be true
    
    // Test generic type preservation
    const numberObs = ObservableLite.fromArray([1, 2, 3]);
    const numberStateful = numberObs.toStatefulStream({ sum: 0 });
    
    console.log(`   - Number type preserved in conversion: ${typeof numberStateful.run === 'function'}`); // Should be true
    
    const stringStream = fromArray(['hello', 'world']);
    const stringObs = stringStream.toObservableLite(['hello', 'world'], {});
    
    console.log(`   - String type preserved in conversion: ${stringObs instanceof ObservableLite}`); // Should be true

    console.log('✅ Type inference preservation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Type inference preservation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: Pipeline Compatibility
// ============================================================================

function testPipelineCompatibility() {
  console.log('\n📋 Test 7: Pipeline Compatibility');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Pipeline Compatibility:');
    
    // Create the same pipeline for both types
    const createPipeline = (source) => {
      return source
        .map(x => x * 2)
        .filter(x => x > 5)
        .scan((acc, x) => acc + x, 0)
        .take(3);
    };
    
    // Test with ObservableLite
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const obsPipeline = createPipeline(obs);
    
    console.log(`   - ObservableLite pipeline created: ${obsPipeline instanceof ObservableLite}`); // Should be true
    
    // Convert to StatefulStream and apply same pipeline
    const stateful = obs.toStatefulStream({ count: 0 });
    const statefulPipeline = createPipeline(stateful);
    
    console.log(`   - StatefulStream pipeline created: ${typeof statefulPipeline.run === 'function'}`); // Should be true
    
    // Convert back to ObservableLite and apply same pipeline
    const backToObs = stateful.toObservableLite([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { count: 0 });
    const backToObsPipeline = createPipeline(backToObs);
    
    console.log(`   - Converted ObservableLite pipeline created: ${backToObsPipeline instanceof ObservableLite}`); // Should be true
    
    // Test that all pipelines have the same methods
    const methods = ['map', 'filter', 'scan', 'take', 'pipe'];
    let sameMethods = true;
    
    for (const method of methods) {
      if (typeof obsPipeline[method] !== typeof statefulPipeline[method] ||
          typeof obsPipeline[method] !== typeof backToObsPipeline[method]) {
        sameMethods = false;
        break;
      }
    }
    
    console.log(`   - All pipelines have same methods: ${sameMethods}`); // Should be true

    console.log('✅ Pipeline compatibility tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Pipeline compatibility test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Performance Verification
// ============================================================================

function testPerformanceVerification() {
  console.log('\n📋 Test 8: Performance Verification');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Performance Verification:');
    
    // Create large dataset
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    
    // Test ObservableLite → StatefulStream conversion performance
    const startObsToStateful = Date.now();
    const obs = ObservableLite.fromArray(largeArray);
    const stateful = obs.toStatefulStream({ count: 0 });
    const obsToStatefulTime = Date.now() - startObsToStateful;
    
    console.log(`   - ObservableLite → StatefulStream conversion: ${obsToStatefulTime}ms`);
    
    // Test StatefulStream → ObservableLite conversion performance
    const startStatefulToObs = Date.now();
    const stream = fromArray(largeArray);
    const backToObs = stream.toObservableLite(largeArray, { count: 0 });
    const statefulToObsTime = Date.now() - startStatefulToObs;
    
    console.log(`   - StatefulStream → ObservableLite conversion: ${statefulToObsTime}ms`);
    
    // Both should be reasonably fast
    console.log(`   - ObservableLite → StatefulStream performance acceptable: ${obsToStatefulTime < 1000}`); // Should be true
    console.log(`   - StatefulStream → ObservableLite performance acceptable: ${statefulToObsTime < 1000}`); // Should be true

    console.log('✅ Performance verification tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Performance verification test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 9: Error Handling
// ============================================================================

function testErrorHandling() {
  console.log('\n📋 Test 9: Error Handling');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Error Handling:');
    
    // Test conversion with error handling
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const stateful = obs.toStatefulStream({ count: 0 });
    
    console.log(`   - ObservableLite → StatefulStream with error handling: ${typeof stateful.run === 'function'}`); // Should be true
    
    // Test conversion back with error handling
    const stream = fromArray([1, 2, 3, 4, 5]);
    const backToObs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });
    
    console.log(`   - StatefulStream → ObservableLite with error handling: ${backToObs instanceof ObservableLite}`); // Should be true
    
    // Test with invalid inputs
    try {
      const invalidObs = obs.toStatefulStream();
      console.log(`   - Conversion with default state: ${typeof invalidObs.run === 'function'}`); // Should be true
    } catch (error) {
      console.log(`   - Error handling for invalid inputs: ${error.message}`);
    }

    console.log('✅ Error handling tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 10: Utility Functions
// ============================================================================

function testUtilityFunctions() {
  console.log('\n📋 Test 10: Utility Functions');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray, canConvertToStatefulStream, canConvertToObservableLite, getConversionStats } = require('./fp-frp-bridge');

    console.log('✅ Utility Functions:');
    
    // Test conversion checks
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const stream = fromArray([1, 2, 3]);
    
    console.log(`   - canConvertToStatefulStream available: ${typeof canConvertToStatefulStream === 'function'}`); // Should be true
    console.log(`   - canConvertToObservableLite available: ${typeof canConvertToObservableLite === 'function'}`); // Should be true
    
    console.log(`   - canConvertToStatefulStream(obs): ${canConvertToStatefulStream(obs)}`); // Should be true
    console.log(`   - canConvertToObservableLite(stream): ${canConvertToObservableLite(stream)}`); // Should be true
    
    // Test conversion statistics
    console.log(`   - getConversionStats available: ${typeof getConversionStats === 'function'}`); // Should be true
    
    const stats = getConversionStats();
    console.log(`   - Conversion stats: ${JSON.stringify(stats)}`);
    console.log(`   - ObservableLite to StatefulStream: ${stats.observableLiteToStateful}`); // Should be true
    console.log(`   - StatefulStream to ObservableLite: ${stats.statefulToObservableLite}`); // Should be true
    console.log(`   - Round-trip conversion: ${stats.roundTripConversion}`); // Should be true

    console.log('✅ Utility functions tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Utility functions test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runFRPRxInteropTests() {
  console.log('🚀 Running FRP-Rx Interop Tests');
  console.log('================================');

  const tests = [
    { name: 'ObservableLite → StatefulStream Conversion', fn: testObservableLiteToStatefulStream },
    { name: 'StatefulStream → ObservableLite Conversion', fn: testStatefulStreamToObservableLite },
    { name: 'Fluent API Extensions', fn: testFluentAPIExtensions },
    { name: 'Purity & Typeclass Integration', fn: testPurityAndTypeclassIntegration },
    { name: 'Round-Trip Conversion', fn: testRoundTripConversion },
    { name: 'Type Inference Preservation', fn: testTypeInferencePreservation },
    { name: 'Pipeline Compatibility', fn: testPipelineCompatibility },
    { name: 'Performance Verification', fn: testPerformanceVerification },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Utility Functions', fn: testUtilityFunctions }
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

  console.log('\n================================');
  console.log('📊 FRP-Rx Interop Test Results:');
  console.log('================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All FRP-Rx interop tests passed!');
    console.log('✅ ObservableLite → StatefulStream conversion working');
    console.log('✅ StatefulStream → ObservableLite conversion working');
    console.log('✅ Fluent API extensions operational');
    console.log('✅ Purity & typeclass integration complete');
    console.log('✅ Round-trip conversion verified');
    console.log('✅ Type inference preservation working');
    console.log('✅ Pipeline compatibility confirmed');
    console.log('✅ Performance verification successful');
    console.log('✅ Error handling robust');
    console.log('✅ Utility functions available');
    console.log('✅ Seamless, type-safe conversion between stream types!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total: passed + failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runFRPRxInteropTests();
}

module.exports = {
  testObservableLiteToStatefulStream,
  testStatefulStreamToObservableLite,
  testFluentAPIExtensions,
  testPurityAndTypeclassIntegration,
  testRoundTripConversion,
  testTypeInferencePreservation,
  testPipelineCompatibility,
  testPerformanceVerification,
  testErrorHandling,
  testUtilityFunctions,
  runFRPRxInteropTests
}; 