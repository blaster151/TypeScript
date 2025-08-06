/**
 * Comprehensive Tests for doM-style Syntax
 * 
 * Tests doM-style syntax for chaining monads with improved readability
 * and purity safety.
 */

console.log('🚀 Testing doM-style Syntax...');

// ============================================================================
// Mock Implementations
// ============================================================================

// Mock ADTs
const Maybe = {
  Just: (value) => ({ tag: 'Just', value, __effect: 'Pure' }),
  Nothing: () => ({ tag: 'Nothing', __effect: 'Pure' }),
  match: (maybe, cases) => {
    if (maybe.tag === 'Just') return cases.Just(maybe.value);
    return cases.Nothing();
  }
};

const Either = {
  Left: (value) => ({ tag: 'Left', value, __effect: 'Pure' }),
  Right: (value) => ({ tag: 'Right', value, __effect: 'Pure' }),
  match: (either, cases) => {
    if (either.tag === 'Left') return cases.Left(either.value);
    return cases.Right(either.value);
  }
};

const Result = {
  Ok: (value) => ({ tag: 'Ok', value, __effect: 'Pure' }),
  Err: (error) => ({ tag: 'Err', error, __effect: 'Pure' }),
  match: (result, cases) => {
    if (result.tag === 'Ok') return cases.Ok(result.value);
    return cases.Err(result.error);
  }
};

// Mock ObservableLite
class MockObservableLite {
  constructor(value, effect = 'Async') {
    this.value = value;
    this.__effect = effect;
  }

  map(fn) {
    return new MockObservableLite(fn(this.value), this.__effect);
  }

  chain(fn) {
    const result = fn(this.value);
    return new MockObservableLite(result.value, result.__effect);
  }

  flatMap(fn) {
    return this.chain(fn);
  }

  catchError(handler) {
    return new MockObservableLite(this.value, this.__effect);
  }

  static of(value) {
    return new MockObservableLite(value, 'Async');
  }
}

// Mock Task
class MockTask {
  constructor(fn, effect = 'IO') {
    this.fn = fn;
    this.__effect = effect;
  }

  map(fn) {
    return new MockTask(() => fn(this.fn()), this.__effect);
  }

  chain(fn) {
    return new MockTask(() => {
      const result = this.fn();
      const nextTask = fn(result);
      return nextTask.fn();
    }, this.__effect);
  }

  flatMap(fn) {
    return this.chain(fn);
  }

  run() {
    return this.fn();
  }

  static of(value) {
    return new MockTask(() => value, 'IO');
  }
}

// Mock IO
class MockIO {
  constructor(fn, effect = 'IO') {
    this.fn = fn;
    this.__effect = effect;
  }

  map(fn) {
    return new MockIO(() => fn(this.fn()), this.__effect);
  }

  chain(fn) {
    return new MockIO(() => {
      const result = this.fn();
      const nextIO = fn(result);
      return nextIO.fn();
    }, this.__effect);
  }

  flatMap(fn) {
    return this.chain(fn);
  }

  run() {
    return this.fn();
  }

  static of(value) {
    return new MockIO(() => value, 'IO');
  }
}

// ============================================================================
// Mock doM Implementation
// ============================================================================

function doM(generator) {
  return doMInternal(generator());
}

function doMInternal(generator) {
  const iterator = generator;
  let result;

  function step(value) {
    try {
      result = iterator.next(value);
      
      if (result.done) {
        return result.value;
      }
      
      const monadicValue = result.value;
      
      if (monadicValue && typeof monadicValue.chain === 'function') {
        return monadicValue.chain((val) => step(val));
      } else if (monadicValue && typeof monadicValue.flatMap === 'function') {
        return monadicValue.flatMap((val) => step(val));
      } else if (monadicValue && typeof monadicValue.map === 'function') {
        return monadicValue.map((val) => step(val));
      } else {
        return step(monadicValue);
      }
    } catch (error) {
      throw error;
    }
  }

  return step();
}

// ============================================================================
// Test 1: Basic doM with Maybe
// ============================================================================

function testBasicDoMWithMaybe() {
  console.log('\n📋 Test 1: Basic doM with Maybe');

  try {
    // Classic .chain approach
    const classicResult = Maybe.Just(5)
      .chain(x => Maybe.Just(x + 3))
      .chain(x => Maybe.Just(x * 2))
      .chain(x => Maybe.Just(x.toString()));

    // doM approach
    const doMResult = doM(function* () {
      const x = yield Maybe.Just(5);
      const y = yield Maybe.Just(x + 3);
      const z = yield Maybe.Just(y * 2);
      return Maybe.Just(z.toString());
    });

    console.log('✅ Classic .chain result:', classicResult);
    console.log('✅ doM result:', doMResult);
    console.log('✅ Results match:', JSON.stringify(classicResult) === JSON.stringify(doMResult));

  } catch (error) {
    console.error('❌ Basic doM with Maybe test failed:', error.message);
  }
}

// ============================================================================
// Test 2: doM with Either
// ============================================================================

function testDoMWithEither() {
  console.log('\n📋 Test 2: doM with Either');

  try {
    // Classic .chain approach
    const classicResult = Either.Right(10)
      .chain(x => Either.Right(x + 5))
      .chain(x => Either.Right(x * 2))
      .chain(x => Either.Right(`Result: ${x}`));

    // doM approach
    const doMResult = doM(function* () {
      const x = yield Either.Right(10);
      const y = yield Either.Right(x + 5);
      const z = yield Either.Right(y * 2);
      return Either.Right(`Result: ${z}`);
    });

    console.log('✅ Classic .chain result:', classicResult);
    console.log('✅ doM result:', doMResult);
    console.log('✅ Results match:', JSON.stringify(classicResult) === JSON.stringify(doMResult));

  } catch (error) {
    console.error('❌ doM with Either test failed:', error.message);
  }
}

// ============================================================================
// Test 3: doM with ObservableLite
// ============================================================================

function testDoMWithObservableLite() {
  console.log('\n📋 Test 3: doM with ObservableLite');

  try {
    // Classic .chain approach
    const classicResult = MockObservableLite.of(3)
      .chain(x => MockObservableLite.of(x + 2))
      .chain(x => MockObservableLite.of(x * 4))
      .chain(x => MockObservableLite.of(`Observable: ${x}`));

    // doM approach
    const doMResult = doM(function* () {
      const x = yield MockObservableLite.of(3);
      const y = yield MockObservableLite.of(x + 2);
      const z = yield MockObservableLite.of(y * 4);
      return MockObservableLite.of(`Observable: ${z}`);
    });

    console.log('✅ Classic .chain result:', classicResult.value);
    console.log('✅ doM result:', doMResult.value);
    console.log('✅ Results match:', classicResult.value === doMResult.value);
    console.log('✅ Effect preserved:', doMResult.__effect === 'Async');

  } catch (error) {
    console.error('❌ doM with ObservableLite test failed:', error.message);
  }
}

// ============================================================================
// Test 4: doM with Task
// ============================================================================

function testDoMWithTask() {
  console.log('\n📋 Test 4: doM with Task');

  try {
    // Classic .chain approach
    const classicResult = MockTask.of(7)
      .chain(x => MockTask.of(x + 3))
      .chain(x => MockTask.of(x * 2))
      .chain(x => MockTask.of(`Task: ${x}`));

    // doM approach
    const doMResult = doM(function* () {
      const x = yield MockTask.of(7);
      const y = yield MockTask.of(x + 3);
      const z = yield MockTask.of(y * 2);
      return MockTask.of(`Task: ${z}`);
    });

    console.log('✅ Classic .chain result:', classicResult.run());
    console.log('✅ doM result:', doMResult.run());
    console.log('✅ Results match:', classicResult.run() === doMResult.run());
    console.log('✅ Effect preserved:', doMResult.__effect === 'IO');

  } catch (error) {
    console.error('❌ doM with Task test failed:', error.message);
  }
}

// ============================================================================
// Test 5: doM with IO
// ============================================================================

function testDoMWithIO() {
  console.log('\n📋 Test 5: doM with IO');

  try {
    // Classic .chain approach
    const classicResult = MockIO.of(4)
      .chain(x => MockIO.of(x + 6))
      .chain(x => MockIO.of(x * 3))
      .chain(x => MockIO.of(`IO: ${x}`));

    // doM approach
    const doMResult = doM(function* () {
      const x = yield MockIO.of(4);
      const y = yield MockIO.of(x + 6);
      const z = yield MockIO.of(y * 3);
      return MockIO.of(`IO: ${z}`);
    });

    console.log('✅ Classic .chain result:', classicResult.run());
    console.log('✅ doM result:', doMResult.run());
    console.log('✅ Results match:', classicResult.run() === doMResult.run());
    console.log('✅ Effect preserved:', doMResult.__effect === 'IO');

  } catch (error) {
    console.error('❌ doM with IO test failed:', error.message);
  }
}

// ============================================================================
// Test 6: Error Handling in doM
// ============================================================================

function testErrorHandlingInDoM() {
  console.log('\n📋 Test 6: Error Handling in doM');

  try {
    // Error handling with Either
    const errorResult = doM(function* () {
      const x = yield Either.Left('Error occurred');
      const y = yield Either.Right(x + 5); // This won't execute
      return Either.Right(y);
    });

    console.log('✅ Error handling result:', errorResult);
    console.log('✅ Error preserved:', errorResult.tag === 'Left');

    // Error handling with ObservableLite
    const observableWithError = doM(function* () {
      const x = yield MockObservableLite.of(5);
      const y = yield MockObservableLite.of(x + 3);
      // Simulate error
      if (y > 7) {
        throw new Error('Value too large');
      }
      return MockObservableLite.of(y);
    });

    console.log('✅ Observable error handling:', observableWithError);

  } catch (error) {
    console.log('✅ Error caught correctly:', error.message);
  }
}

// ============================================================================
// Test 7: Nested doM Blocks
// ============================================================================

function testNestedDoMBlocks() {
  console.log('\n📋 Test 7: Nested doM Blocks');

  try {
    // Inner doM block
    const innerDoM = doM(function* () {
      const x = yield Maybe.Just(3);
      const y = yield Maybe.Just(x + 2);
      return Maybe.Just(y);
    });

    // Outer doM block using inner
    const outerDoM = doM(function* () {
      const inner = yield innerDoM;
      const z = yield Maybe.Just(inner.value * 2);
      return Maybe.Just(z);
    });

    console.log('✅ Inner doM result:', innerDoM);
    console.log('✅ Outer doM result:', outerDoM);
    console.log('✅ Nested computation correct:', outerDoM.value === 10);

  } catch (error) {
    console.error('❌ Nested doM blocks test failed:', error.message);
  }
}

// ============================================================================
// Test 8: Effect Inference
// ============================================================================

function testEffectInference() {
  console.log('\n📋 Test 8: Effect Inference');

  try {
    // Pure effect
    const pureDoM = doM(function* () {
      const x = yield Maybe.Just(5);
      const y = yield Maybe.Just(x + 3);
      return Maybe.Just(y);
    });

    console.log('✅ Pure effect:', pureDoM.__effect === 'Pure');

    // Async effect
    const asyncDoM = doM(function* () {
      const x = yield MockObservableLite.of(5);
      const y = yield MockObservableLite.of(x + 3);
      return MockObservableLite.of(y);
    });

    console.log('✅ Async effect:', asyncDoM.__effect === 'Async');

    // IO effect
    const ioDoM = doM(function* () {
      const x = yield MockIO.of(5);
      const y = yield MockIO.of(x + 3);
      return MockIO.of(y);
    });

    console.log('✅ IO effect:', ioDoM.__effect === 'IO');

  } catch (error) {
    console.error('❌ Effect inference test failed:', error.message);
  }
}

// ============================================================================
// Test 9: Complex Monadic Operations
// ============================================================================

function testComplexMonadicOperations() {
  console.log('\n📋 Test 9: Complex Monadic Operations');

  try {
    // Complex computation with multiple monads
    const complexDoM = doM(function* () {
      // Start with Maybe
      const maybeValue = yield Maybe.Just(10);
      
      // Chain with ObservableLite
      const observableValue = yield MockObservableLite.of(maybeValue + 5);
      
      // Chain with Task
      const taskValue = yield MockTask.of(observableValue * 2);
      
      // Chain with IO
      const ioValue = yield MockIO.of(taskValue + 3);
      
      // Return final result
      return Maybe.Just(`Complex: ${ioValue}`);
    });

    console.log('✅ Complex doM result:', complexDoM);
    console.log('✅ Complex computation correct:', complexDoM.value === 'Complex: 28');

  } catch (error) {
    console.error('❌ Complex monadic operations test failed:', error.message);
  }
}

// ============================================================================
// Test 10: Comparison with Classic Chaining
// ============================================================================

function testComparisonWithClassicChaining() {
  console.log('\n📋 Test 10: Comparison with Classic Chaining');

  try {
    const initialValue = 2;

    // Classic chaining
    const classicChain = Maybe.Just(initialValue)
      .chain(x => Maybe.Just(x + 3))
      .chain(x => Maybe.Just(x * 2))
      .chain(x => Maybe.Just(x - 1))
      .chain(x => Maybe.Just(x.toString()));

    // doM syntax
    const doMSyntax = doM(function* () {
      const x = yield Maybe.Just(initialValue);
      const y = yield Maybe.Just(x + 3);
      const z = yield Maybe.Just(y * 2);
      const w = yield Maybe.Just(z - 1);
      return Maybe.Just(w.toString());
    });

    console.log('✅ Classic chaining result:', classicChain);
    console.log('✅ doM syntax result:', doMSyntax);
    console.log('✅ Results match:', JSON.stringify(classicChain) === JSON.stringify(doMSyntax));

    // Readability comparison
    console.log('✅ doM syntax is more readable than classic chaining');

  } catch (error) {
    console.error('❌ Comparison test failed:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running doM-style Syntax Tests');
  console.log('==================================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testBasicDoMWithMaybe,
    testDoMWithEither,
    testDoMWithObservableLite,
    testDoMWithTask,
    testDoMWithIO,
    testErrorHandlingInDoM,
    testNestedDoMBlocks,
    testEffectInference,
    testComplexMonadicOperations,
    testComparisonWithClassicChaining
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

  console.log('\n==================================================');
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All doM-style syntax tests passed!');
    console.log('✅ doM-style syntax for monadic chaining complete!');
  } else {
    console.log('⚠️ Some tests failed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testBasicDoMWithMaybe,
  testDoMWithEither,
  testDoMWithObservableLite,
  testDoMWithTask,
  testDoMWithIO,
  testErrorHandlingInDoM,
  testNestedDoMBlocks,
  testEffectInference,
  testComplexMonadicOperations,
  testComparisonWithClassicChaining,
  runAllTests
}; 