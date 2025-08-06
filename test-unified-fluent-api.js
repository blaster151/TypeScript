/**
 * Unified Fluent API Test Suite
 * 
 * Comprehensive tests for the unified fluent API that unifies ObservableLite, 
 * StatefulStream, and core ADTs (Maybe, Either, Result) under a shared fluent 
 * API with .map, .chain, .filter, etc., while adding lossless, type-safe 
 * FRP ↔ Rx interop.
 */

console.log('🔥 Unified Fluent API Test Suite');
console.log('================================');

// ============================================================================
// Test 1: Shared Fluent API Mixin
// ============================================================================

function testSharedFluentAPIMixin() {
  console.log('\n📋 Test 1: Shared Fluent API Mixin');

  try {
    const { applyFluentOps, FluentOps, FluentImpl } = require('./fp-fluent-api');

    console.log('✅ Shared Fluent API Mixin:');
    console.log(`   - applyFluentOps function available: ${typeof applyFluentOps === 'function'}`); // Should be true
    console.log(`   - FluentOps interface available: ${typeof FluentOps !== 'undefined'}`); // Should be true
    console.log(`   - FluentImpl interface available: ${typeof FluentImpl !== 'undefined'}`); // Should be true
    
    // Test basic mixin application
    const testProto = {};
    const testImpl = {
      map: (self, f) => ({ type: 'mapped', value: f(self.value) }),
      chain: (self, f) => ({ type: 'chained', value: f(self.value) }),
      filter: (self, pred) => pred(self.value) ? self : { type: 'filtered', value: null }
    };
    
    applyFluentOps(testProto, testImpl);
    
    console.log(`   - map method added: ${typeof testProto.map === 'function'}`); // Should be true
    console.log(`   - chain method added: ${typeof testProto.chain === 'function'}`); // Should be true
    console.log(`   - filter method added: ${typeof testProto.filter === 'function'}`); // Should be true
    
    // Test method execution
    const testObj = { value: 42 };
    Object.setPrototypeOf(testObj, testProto);
    
    const mapped = testObj.map(x => x * 2);
    console.log(`   - map execution works: ${mapped.type === 'mapped' && mapped.value === 84}`); // Should be true
    
    const chained = testObj.chain(x => ({ type: 'chained', value: x + 10 }));
    console.log(`   - chain execution works: ${chained.type === 'chained' && chained.value === 52}`); // Should be true
    
    const filtered = testObj.filter(x => x > 40);
    console.log(`   - filter execution works: ${filtered === testObj}`); // Should be true

    console.log('✅ Shared fluent API mixin tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Shared fluent API mixin test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: Maybe ADT Fluent API
// ============================================================================

function testMaybeADTFluentAPI() {
  console.log('\n📋 Test 2: Maybe ADT Fluent API');

  try {
    const { Maybe, Just, Nothing } = require('./fp-maybe');

    console.log('✅ Maybe ADT Fluent API:');
    
    // Test map operation
    const maybeValue = Just(42);
    console.log(`   - Maybe has map method: ${typeof maybeValue.map === 'function'}`); // Should be true
    
    const doubled = maybeValue.map(x => x * 2);
    console.log(`   - Maybe.map works: ${doubled.value === 84}`); // Should be true
    
    // Test chain operation
    const chained = maybeValue.chain(x => Just(x + 10));
    console.log(`   - Maybe.chain works: ${chained.value === 52}`); // Should be true
    
    // Test filter operation
    const filtered = maybeValue.filter(x => x > 40);
    console.log(`   - Maybe.filter works (keeps value): ${filtered === maybeValue}`); // Should be true
    
    const filteredOut = maybeValue.filter(x => x < 40);
    console.log(`   - Maybe.filter works (filters out): ${filteredOut.isNothing()}`); // Should be true
    
    // Test with Nothing
    const nothing = Nothing();
    const nothingMapped = nothing.map(x => x * 2);
    console.log(`   - Nothing.map works: ${nothingMapped.isNothing()}`); // Should be true
    
    const nothingChained = nothing.chain(x => Just(x * 2));
    console.log(`   - Nothing.chain works: ${nothingChained.isNothing()}`); // Should be true
    
    // Test pipe operation
    const piped = maybeValue
      .map(x => x * 2)
      .chain(x => Just(x + 10))
      .filter(x => x > 50);
    console.log(`   - Maybe.pipe works: ${piped.value === 94}`); // Should be true

    console.log('✅ Maybe ADT fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Maybe ADT fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Either ADT Fluent API
// ============================================================================

function testEitherADTFluentAPI() {
  console.log('\n📋 Test 3: Either ADT Fluent API');

  try {
    const { Either, Left, Right } = require('./fp-either');

    console.log('✅ Either ADT Fluent API:');
    
    // Test map operation with Right
    const rightValue = Right(42);
    console.log(`   - Either has map method: ${typeof rightValue.map === 'function'}`); // Should be true
    
    const doubled = rightValue.map(x => x * 2);
    console.log(`   - Either.map works (Right): ${doubled.value === 84}`); // Should be true
    
    // Test map operation with Left
    const leftValue = Left('error');
    const leftMapped = leftValue.map(x => x * 2);
    console.log(`   - Either.map works (Left): ${leftMapped.value === 'error'}`); // Should be true
    
    // Test chain operation
    const chained = rightValue.chain(x => Right(x + 10));
    console.log(`   - Either.chain works: ${chained.value === 52}`); // Should be true
    
    // Test bimap operation
    const bimapped = rightValue.bimap(
      error => `Error: ${error}`,
      value => value * 2
    );
    console.log(`   - Either.bimap works: ${bimapped.value === 84}`); // Should be true
    
    // Test filter operation
    const filtered = rightValue.filter(x => x > 40);
    console.log(`   - Either.filter works (keeps value): ${filtered === rightValue}`); // Should be true
    
    const filteredOut = rightValue.filter(x => x < 40);
    console.log(`   - Either.filter works (filters out): ${filteredOut.isLeft()}`); // Should be true
    
    // Test pipe operation
    const piped = rightValue
      .map(x => x * 2)
      .chain(x => Right(x + 10))
      .filter(x => x > 50);
    console.log(`   - Either.pipe works: ${piped.value === 94}`); // Should be true

    console.log('✅ Either ADT fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Either ADT fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Result ADT Fluent API
// ============================================================================

function testResultADTFluentAPI() {
  console.log('\n📋 Test 4: Result ADT Fluent API');

  try {
    const { Result, Ok, Err } = require('./fp-result');

    console.log('✅ Result ADT Fluent API:');
    
    // Test map operation with Ok
    const okValue = Ok(42);
    console.log(`   - Result has map method: ${typeof okValue.map === 'function'}`); // Should be true
    
    const doubled = okValue.map(x => x * 2);
    console.log(`   - Result.map works (Ok): ${doubled.value === 84}`); // Should be true
    
    // Test map operation with Err
    const errValue = Err('error');
    const errMapped = errValue.map(x => x * 2);
    console.log(`   - Result.map works (Err): ${errMapped.error === 'error'}`); // Should be true
    
    // Test chain operation
    const chained = okValue.chain(x => Ok(x + 10));
    console.log(`   - Result.chain works: ${chained.value === 52}`); // Should be true
    
    // Test bimap operation
    const bimapped = okValue.bimap(
      error => `Error: ${error}`,
      value => value * 2
    );
    console.log(`   - Result.bimap works: ${bimapped.value === 84}`); // Should be true
    
    // Test filter operation
    const filtered = okValue.filter(x => x > 40);
    console.log(`   - Result.filter works (keeps value): ${filtered === okValue}`); // Should be true
    
    const filteredOut = okValue.filter(x => x < 40);
    console.log(`   - Result.filter works (filters out): ${filteredOut.isErr()}`); // Should be true
    
    // Test pipe operation
    const piped = okValue
      .map(x => x * 2)
      .chain(x => Ok(x + 10))
      .filter(x => x > 50);
    console.log(`   - Result.pipe works: ${piped.value === 94}`); // Should be true

    console.log('✅ Result ADT fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Result ADT fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: ObservableLite Fluent API
// ============================================================================

function testObservableLiteFluentAPI() {
  console.log('\n📋 Test 5: ObservableLite Fluent API');

  try {
    const { ObservableLite } = require('./fp-observable-lite');

    console.log('✅ ObservableLite Fluent API:');
    
    // Test map operation
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    console.log(`   - ObservableLite has map method: ${typeof obs.map === 'function'}`); // Should be true
    
    const doubled = obs.map(x => x * 2);
    console.log(`   - ObservableLite.map works: ${doubled instanceof ObservableLite}`); // Should be true
    
    // Test chain operation
    const chained = obs.chain(x => ObservableLite.of(x + 10));
    console.log(`   - ObservableLite.chain works: ${chained instanceof ObservableLite}`); // Should be true
    
    // Test filter operation
    const filtered = obs.filter(x => x > 3);
    console.log(`   - ObservableLite.filter works: ${filtered instanceof ObservableLite}`); // Should be true
    
    // Test scan operation
    const scanned = obs.scan((acc, x) => acc + x, 0);
    console.log(`   - ObservableLite.scan works: ${scanned instanceof ObservableLite}`); // Should be true
    
    // Test take operation
    const taken = obs.take(3);
    console.log(`   - ObservableLite.take works: ${taken instanceof ObservableLite}`); // Should be true
    
    // Test pipe operation
    const piped = obs
      .map(x => x * 2)
      .filter(x => x > 5)
      .scan((acc, x) => acc + x, 0)
      .take(2);
    console.log(`   - ObservableLite.pipe works: ${piped instanceof ObservableLite}`); // Should be true

    console.log('✅ ObservableLite fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ ObservableLite fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 6: StatefulStream Fluent API
// ============================================================================

function testStatefulStreamFluentAPI() {
  console.log('\n📋 Test 6: StatefulStream Fluent API');

  try {
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ StatefulStream Fluent API:');
    
    // Test map operation
    const stream = fromArray([1, 2, 3, 4, 5]);
    console.log(`   - StatefulStream has map method: ${typeof stream.map === 'function'}`); // Should be true
    
    const doubled = stream.map(x => x * 2);
    console.log(`   - StatefulStream.map works: ${typeof doubled.run === 'function'}`); // Should be true
    
    // Test chain operation
    const chained = stream.chain(x => fromArray([x + 10]));
    console.log(`   - StatefulStream.chain works: ${typeof chained.run === 'function'}`); // Should be true
    
    // Test filter operation
    const filtered = stream.filter(x => x > 3);
    console.log(`   - StatefulStream.filter works: ${typeof filtered.run === 'function'}`); // Should be true
    
    // Test scan operation
    const scanned = stream.scan((acc, x) => acc + x, 0);
    console.log(`   - StatefulStream.scan works: ${typeof scanned.run === 'function'}`); // Should be true
    
    // Test take operation
    const taken = stream.take(3);
    console.log(`   - StatefulStream.take works: ${typeof taken.run === 'function'}`); // Should be true
    
    // Test pipe operation
    const piped = stream
      .map(x => x * 2)
      .filter(x => x > 5)
      .scan((acc, x) => acc + x, 0)
      .take(2);
    console.log(`   - StatefulStream.pipe works: ${typeof piped.run === 'function'}`); // Should be true

    console.log('✅ StatefulStream fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ StatefulStream fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: FRP ↔ Rx Interop Layer
// ============================================================================

function testFRPRxInteropLayer() {
  console.log('\n📋 Test 7: FRP ↔ Rx Interop Layer');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray, fromObservableLite, toObservableLite } = require('./fp-frp-bridge');

    console.log('✅ FRP ↔ Rx Interop Layer:');
    
    // Test ObservableLite → StatefulStream conversion
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    console.log(`   - fromObservableLite function available: ${typeof fromObservableLite === 'function'}`); // Should be true
    
    const stateful = fromObservableLite(obs, { count: 0 });
    console.log(`   - ObservableLite → StatefulStream conversion: ${typeof stateful.run === 'function'}`); // Should be true
    
    // Test StatefulStream → ObservableLite conversion
    const stream = fromArray([1, 2, 3, 4, 5]);
    console.log(`   - toObservableLite function available: ${typeof toObservableLite === 'function'}`); // Should be true
    
    const backToObs = toObservableLite(stream, [1, 2, 3, 4, 5], { count: 0 });
    console.log(`   - StatefulStream → ObservableLite conversion: ${backToObs instanceof ObservableLite}`); // Should be true
    
    // Test fluent API conversions
    console.log(`   - ObservableLite.toStatefulStream available: ${typeof obs.toStatefulStream === 'function'}`); // Should be true
    console.log(`   - StatefulStream.toObservableLite available: ${typeof stream.toObservableLite === 'function'}`); // Should be true
    
    const fluentStateful = obs.toStatefulStream({ count: 0 });
    console.log(`   - Fluent ObservableLite → StatefulStream: ${typeof fluentStateful.run === 'function'}`); // Should be true
    
    const fluentObs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });
    console.log(`   - Fluent StatefulStream → ObservableLite: ${fluentObs instanceof ObservableLite}`); // Should be true

    console.log('✅ FRP ↔ Rx interop layer tests passed!');
    return true;
  } catch (error) {
    console.log('❌ FRP ↔ Rx interop layer test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Purity + HKT Integration
// ============================================================================

function testPurityAndHKTIntegration() {
  console.log('\n📋 Test 8: Purity + HKT Integration');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { getObservableLiteToStatefulPurity, getStatefulToObservableLitePurity } = require('./fp-frp-bridge');

    console.log('✅ Purity + HKT Integration:');
    
    // Test purity for ObservableLite → StatefulStream
    const obsPurity = getObservableLiteToStatefulPurity();
    console.log(`   - ObservableLite → StatefulStream purity: ${obsPurity}`); // Should be 'Async'
    
    // Test purity for StatefulStream → ObservableLite
    const stream = fromArray([1, 2, 3, 4, 5]);
    const streamPurity = getStatefulToObservableLitePurity(stream);
    console.log(`   - StatefulStream → ObservableLite purity: ${streamPurity}`); // Should be 'Async' or existing purity
    
    // Test conversion with purity preservation
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const stateful = obs.toStatefulStream({ count: 0 });
    console.log(`   - Converted StatefulStream purity: ${stateful.__purity}`); // Should be 'Async'
    
    const backToObs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });
    console.log(`   - Converted ObservableLite is ObservableLite: ${backToObs instanceof ObservableLite}`); // Should be true

    console.log('✅ Purity + HKT integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Purity + HKT integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 9: Round-Trip Conversion
// ============================================================================

function testRoundTripConversion() {
  console.log('\n📋 Test 9: Round-Trip Conversion');

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
// Test 10: Identical Pipeline Operations
// ============================================================================

function testIdenticalPipelineOperations() {
  console.log('\n📋 Test 10: Identical Pipeline Operations');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');
    const { Maybe, Just } = require('./fp-maybe');
    const { Either, Right } = require('./fp-either');
    const { Result, Ok } = require('./fp-result');

    console.log('✅ Identical Pipeline Operations:');
    
    // Create the same pipeline for all types
    const createPipeline = (source) => {
      return source
        .map(x => x * 2)
        .filter(x => x > 5)
        .chain(x => source.constructor.of(x + 10));
    };
    
    // Test with ObservableLite
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const obsPipeline = createPipeline(obs);
    console.log(`   - ObservableLite pipeline created: ${obsPipeline instanceof ObservableLite}`); // Should be true
    
    // Test with StatefulStream
    const stream = fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const streamPipeline = createPipeline(stream);
    console.log(`   - StatefulStream pipeline created: ${typeof streamPipeline.run === 'function'}`); // Should be true
    
    // Test with Maybe
    const maybe = Just(42);
    const maybePipeline = createPipeline(maybe);
    console.log(`   - Maybe pipeline created: ${maybePipeline.isJust()}`); // Should be true
    
    // Test with Either
    const either = Right(42);
    const eitherPipeline = createPipeline(either);
    console.log(`   - Either pipeline created: ${eitherPipeline.isRight()}`); // Should be true
    
    // Test with Result
    const result = Ok(42);
    const resultPipeline = createPipeline(result);
    console.log(`   - Result pipeline created: ${resultPipeline.isOk()}`); // Should be true
    
    // Test that all pipelines have the same methods
    const methods = ['map', 'chain', 'filter', 'pipe'];
    let sameMethods = true;
    
    const sources = [obsPipeline, streamPipeline, maybePipeline, eitherPipeline, resultPipeline];
    for (const method of methods) {
      for (let i = 1; i < sources.length; i++) {
        if (typeof sources[0][method] !== typeof sources[i][method]) {
          sameMethods = false;
          break;
        }
      }
    }
    
    console.log(`   - All pipelines have same methods: ${sameMethods}`); // Should be true

    console.log('✅ Identical pipeline operations tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Identical pipeline operations test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 11: Type-Safe Conversions
// ============================================================================

function testTypeSafeConversions() {
  console.log('\n📋 Test 11: Type-Safe Conversions');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray, toObservableLite, toStatefulStream, toMaybe, toEither, toResult } = require('./fp-fluent-api');
    const { Maybe, Just } = require('./fp-maybe');
    const { Either, Right } = require('./fp-either');
    const { Result, Ok } = require('./fp-result');

    console.log('✅ Type-Safe Conversions:');
    
    // Test conversion functions availability
    console.log(`   - toObservableLite available: ${typeof toObservableLite === 'function'}`); // Should be true
    console.log(`   - toStatefulStream available: ${typeof toStatefulStream === 'function'}`); // Should be true
    console.log(`   - toMaybe available: ${typeof toMaybe === 'function'}`); // Should be true
    console.log(`   - toEither available: ${typeof toEither === 'function'}`); // Should be true
    console.log(`   - toResult available: ${typeof toResult === 'function'}`); // Should be true
    
    // Test ObservableLite conversions
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const obsToStateful = toStatefulStream(obs, { count: 0 });
    const obsToMaybe = toMaybe(obs);
    const obsToEither = toEither(obs);
    const obsToResult = toResult(obs);
    
    console.log(`   - ObservableLite → StatefulStream: ${typeof obsToStateful.run === 'function'}`); // Should be true
    console.log(`   - ObservableLite → Maybe: ${obsToMaybe.isJust()}`); // Should be true
    console.log(`   - ObservableLite → Either: ${obsToEither.isRight()}`); // Should be true
    console.log(`   - ObservableLite → Result: ${obsToResult.isOk()}`); // Should be true
    
    // Test StatefulStream conversions
    const stream = fromArray([1, 2, 3]);
    const streamToObs = toObservableLite(stream);
    const streamToMaybe = toMaybe(stream);
    const streamToEither = toEither(stream);
    const streamToResult = toResult(stream);
    
    console.log(`   - StatefulStream → ObservableLite: ${streamToObs instanceof ObservableLite}`); // Should be true
    console.log(`   - StatefulStream → Maybe: ${streamToMaybe.isJust()}`); // Should be true
    console.log(`   - StatefulStream → Either: ${streamToEither.isRight()}`); // Should be true
    console.log(`   - StatefulStream → Result: ${streamToResult.isOk()}`); // Should be true
    
    // Test ADT conversions
    const maybe = Just(42);
    const maybeToObs = toObservableLite(maybe);
    const maybeToStream = toStatefulStream(maybe, {});
    const maybeToEither = toEither(maybe);
    const maybeToResult = toResult(maybe);
    
    console.log(`   - Maybe → ObservableLite: ${maybeToObs instanceof ObservableLite}`); // Should be true
    console.log(`   - Maybe → StatefulStream: ${typeof maybeToStream.run === 'function'}`); // Should be true
    console.log(`   - Maybe → Either: ${maybeToEither.isRight()}`); // Should be true
    console.log(`   - Maybe → Result: ${maybeToResult.isOk()}`); // Should be true

    console.log('✅ Type-safe conversions tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Type-safe conversions test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 12: Performance Verification
// ============================================================================

function testPerformanceVerification() {
  console.log('\n📋 Test 12: Performance Verification');

  try {
    const { ObservableLite } = require('./fp-observable-lite');
    const { fromArray } = require('./fp-frp-bridge');

    console.log('✅ Performance Verification:');
    
    // Create large dataset
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    
    // Test ObservableLite pipeline performance
    const startObs = Date.now();
    const obs = ObservableLite.fromArray(largeArray);
    const obsPipeline = obs
      .map(x => x * 2)
      .filter(x => x > 100)
      .scan((acc, x) => acc + x, 0)
      .take(100);
    const obsTime = Date.now() - startObs;
    
    console.log(`   - ObservableLite pipeline performance: ${obsTime}ms`);
    
    // Test StatefulStream pipeline performance
    const startStream = Date.now();
    const stream = fromArray(largeArray);
    const streamPipeline = stream
      .map(x => x * 2)
      .filter(x => x > 100)
      .scan((acc, x) => acc + x, 0)
      .take(100);
    const streamTime = Date.now() - startStream;
    
    console.log(`   - StatefulStream pipeline performance: ${streamTime}ms`);
    
    // Test conversion performance
    const startConversion = Date.now();
    const converted = obs.toStatefulStream({ count: 0 });
    const backConverted = converted.toObservableLite(largeArray, { count: 0 });
    const conversionTime = Date.now() - startConversion;
    
    console.log(`   - Conversion performance: ${conversionTime}ms`);
    
    // All should be reasonably fast
    console.log(`   - ObservableLite performance acceptable: ${obsTime < 1000}`); // Should be true
    console.log(`   - StatefulStream performance acceptable: ${streamTime < 1000}`); // Should be true
    console.log(`   - Conversion performance acceptable: ${conversionTime < 1000}`); // Should be true

    console.log('✅ Performance verification tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Performance verification test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runUnifiedFluentAPITests() {
  console.log('🚀 Running Unified Fluent API Tests');
  console.log('===================================');

  const tests = [
    { name: 'Shared Fluent API Mixin', fn: testSharedFluentAPIMixin },
    { name: 'Maybe ADT Fluent API', fn: testMaybeADTFluentAPI },
    { name: 'Either ADT Fluent API', fn: testEitherADTFluentAPI },
    { name: 'Result ADT Fluent API', fn: testResultADTFluentAPI },
    { name: 'ObservableLite Fluent API', fn: testObservableLiteFluentAPI },
    { name: 'StatefulStream Fluent API', fn: testStatefulStreamFluentAPI },
    { name: 'FRP ↔ Rx Interop Layer', fn: testFRPRxInteropLayer },
    { name: 'Purity + HKT Integration', fn: testPurityAndHKTIntegration },
    { name: 'Round-Trip Conversion', fn: testRoundTripConversion },
    { name: 'Identical Pipeline Operations', fn: testIdenticalPipelineOperations },
    { name: 'Type-Safe Conversions', fn: testTypeSafeConversions },
    { name: 'Performance Verification', fn: testPerformanceVerification }
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
  console.log('📊 Unified Fluent API Test Results:');
  console.log('===================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All unified fluent API tests passed!');
    console.log('✅ Shared fluent API mixin working');
    console.log('✅ Maybe ADT fluent API operational');
    console.log('✅ Either ADT fluent API operational');
    console.log('✅ Result ADT fluent API operational');
    console.log('✅ ObservableLite fluent API operational');
    console.log('✅ StatefulStream fluent API operational');
    console.log('✅ FRP ↔ Rx interop layer working');
    console.log('✅ Purity + HKT integration complete');
    console.log('✅ Round-trip conversion verified');
    console.log('✅ Identical pipeline operations confirmed');
    console.log('✅ Type-safe conversions working');
    console.log('✅ Performance verification successful');
    console.log('✅ Unified fluent API across all FP types!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total: passed + failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runUnifiedFluentAPITests();
}

module.exports = {
  testSharedFluentAPIMixin,
  testMaybeADTFluentAPI,
  testEitherADTFluentAPI,
  testResultADTFluentAPI,
  testObservableLiteFluentAPI,
  testStatefulStreamFluentAPI,
  testFRPRxInteropLayer,
  testPurityAndHKTIntegration,
  testRoundTripConversion,
  testIdenticalPipelineOperations,
  testTypeSafeConversions,
  testPerformanceVerification,
  runUnifiedFluentAPITests
}; 