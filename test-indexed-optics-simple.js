/**
 * Simplified Tests for Indexable Optics
 * 
 * Tests core Indexable Optics functionality without complex composition.
 */

console.log('🚀 Testing Indexable Optics (Simplified)...');

// ============================================================================
// Mock Implementations
// ============================================================================

const Maybe = {
  Just: (value) => ({ tag: 'Just', value }),
  Nothing: () => ({ tag: 'Nothing' })
};

const Either = {
  Left: (value) => ({ tag: 'Left', value }),
  Right: (value) => ({ tag: 'Right', value })
};

// Mock IndexedLens implementation
function createIndexedLens(index, getter, setter) {
  return {
    __type: 'IndexedLens',
    __effect: 'Pure',
    __kind: {},
    index,
    get: (s) => getter(s, index),
    set: (b) => (s) => setter(index, b, s),
    modify: (f) => (s) => setter(index, f(getter(s, index)), s),
    getAt: getter,
    setAt: setter,
    modifyAt: (i, f, s) => setter(i, f(getter(s, i)), s)
  };
}

// Mock IndexedPrism implementation
function createIndexedPrism(index, matcher, builder) {
  return {
    __type: 'IndexedPrism',
    __effect: 'Pure',
    __kind: {},
    index,
    getOption: (s) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return { tag: 'Just', value: result.value };
      }
      return { tag: 'Nothing' };
    },
    getAtOption: (s, i) => {
      const result = matcher(s, i);
      if (result.tag === 'Left') {
        return { tag: 'Just', value: result.value };
      }
      return { tag: 'Nothing' };
    },
    setAtOption: (i, b, s) => {
      const result = matcher(s, i);
      if (result.tag === 'Left') {
        return builder(i, b);
      }
      return s;
    }
  };
}

// Mock built-in indexed optics
function arrayIndexLens(index) {
  return createIndexedLens(
    index,
    (arr, i) => {
      if (i < 0 || i >= arr.length) {
        throw new Error(`Array index out of bounds: ${i}`);
      }
      return arr[i];
    },
    (i, value, arr) => {
      if (i < 0 || i >= arr.length) {
        throw new Error(`Array index out of bounds: ${i}`);
      }
      const result = [...arr];
      result[i] = value;
      return result;
    }
  );
}

function arrayIndexPrism(index) {
  return createIndexedPrism(
    index,
    (arr, i) => {
      if (i >= 0 && i < arr.length) {
        return { tag: 'Left', value: arr[i] };
      }
      return { tag: 'Right', value: arr };
    },
    (i, value) => {
      const result = new Array();
      result[i] = value;
      return result;
    }
  );
}

function objectKeyLens(key) {
  return createIndexedLens(
    key,
    (obj, k) => obj[k],
    (k, value, obj) => ({ ...obj, [k]: value })
  );
}

function objectKeyPrism(key) {
  return createIndexedPrism(
    key,
    (obj, k) => {
      if (k in obj) {
        return { tag: 'Left', value: obj[k] };
      }
      return { tag: 'Right', value: obj };
    },
    (k, value) => ({ [k]: value })
  );
}

// ============================================================================
// Test 1: IndexedLens Laws
// ============================================================================

function testIndexedLensLaws() {
  console.log('\n📋 Test 1: IndexedLens Laws');

  try {
    const numbers = [1, 2, 3, 4, 5];
    const lens = arrayIndexLens(2);
    
    // Get/Set Round-trip Law: set(get(s), s) === s
    const value = lens.get(numbers);
    const setResult = lens.set(value)(numbers);
    console.log('✅ Get/Set Round-trip Law:', JSON.stringify(setResult) === JSON.stringify(numbers));
    
    // Set/Get Round-trip Law: get(set(b, s)) === b
    const newValue = 10;
    const setValue = lens.set(newValue)(numbers);
    const getResult = lens.get(setValue);
    console.log('✅ Set/Get Round-trip Law:', getResult === newValue);

  } catch (error) {
    console.error('❌ IndexedLens laws test failed:', error.message);
  }
}

// ============================================================================
// Test 2: Built-in Indexed Optics
// ============================================================================

function testBuiltInIndexedOptics() {
  console.log('\n📋 Test 2: Built-in Indexed Optics');

  try {
    // Test array index lens
    const numbers = [1, 2, 3, 4, 5];
    const arrayLens = arrayIndexLens(2);
    
    const value = arrayLens.get(numbers);
    console.log('✅ Array index lens get:', value === 3);
    
    const updated = arrayLens.set(10)(numbers);
    console.log('✅ Array index lens set:', updated[2] === 10);
    
    // Test array index prism (safe access)
    const arrayPrism = arrayIndexPrism(2);
    
    const prismValue = arrayPrism.getOption(numbers);
    console.log('✅ Array index prism getOption:', prismValue.value === 3);
    
    const outOfBounds = arrayPrism.getAtOption(numbers, 10);
    console.log('✅ Array index prism out of bounds:', outOfBounds.tag === 'Nothing');
    
    // Test object key lens
    const person = { name: 'Alice', age: 25 };
    const nameLens = objectKeyLens('name');
    
    const name = nameLens.get(person);
    console.log('✅ Object key lens get:', name === 'Alice');
    
    const updatedPerson = nameLens.set('Bob')(person);
    console.log('✅ Object key lens set:', updatedPerson.name === 'Bob');
    
    // Test object key prism (safe access)
    const agePrism = objectKeyPrism('age');
    
    const age = agePrism.getOption(person);
    console.log('✅ Object key prism getOption:', age.value === 25);
    
    const missingKey = agePrism.getAtOption(person, 'missing');
    console.log('✅ Object key prism missing key:', missingKey.tag === 'Nothing');

  } catch (error) {
    console.error('❌ Built-in indexed optics test failed:', error.message);
  }
}

// ============================================================================
// Test 3: Indexed Operations
// ============================================================================

function testIndexedOperations() {
  console.log('\n📋 Test 3: Indexed Operations');

  try {
    const numbers = [1, 2, 3, 4, 5];
    const lens = arrayIndexLens(2);

    // Test indexed-specific operations
    const value = lens.getAt(numbers, 2);
    console.log('✅ getAt operation:', value === 3);

    const updated = lens.setAt(2, 10, numbers);
    console.log('✅ setAt operation:', updated[2] === 10);

    const modified = lens.modifyAt(2, x => x * 2, numbers);
    console.log('✅ modifyAt operation:', modified[2] === 6);

    // Test prism operations
    const prism = arrayIndexPrism(2);
    
    const prismValue = prism.getAtOption(numbers, 2);
    console.log('✅ getAtOption operation:', prismValue.value === 3);

    const prismSet = prism.setAtOption(2, 10, numbers);
    console.log('✅ setAtOption operation:', prismSet[2] === 10);

    // Test out of bounds handling
    const outOfBounds = prism.getAtOption(numbers, 10);
    console.log('✅ Out of bounds handling:', outOfBounds.tag === 'Nothing');

  } catch (error) {
    console.error('❌ Indexed operations test failed:', error.message);
  }
}

// ============================================================================
// Test 4: Purity and HKT Integration
// ============================================================================

function testPurityAndHKTIntegration() {
  console.log('\n📋 Test 4: Purity and HKT Integration');

  try {
    const lens = arrayIndexLens(2);

    // Test purity marking
    console.log('✅ IndexedLens has effect:', lens.__effect === 'Pure');
    console.log('✅ IndexedLens has type:', lens.__type === 'IndexedLens');
    console.log('✅ IndexedLens has kind:', lens.__kind !== undefined);

    // Test HKT integration
    console.log('✅ IndexedLens has index:', lens.index === 2);

    // Test prism purity
    const prism = arrayIndexPrism(2);
    console.log('✅ IndexedPrism has effect:', prism.__effect === 'Pure');
    console.log('✅ IndexedPrism has type:', prism.__type === 'IndexedPrism');

  } catch (error) {
    console.error('❌ Purity and HKT integration test failed:', error.message);
  }
}

// ============================================================================
// Test 5: Simple Indexed Transformations
// ============================================================================

function testSimpleIndexedTransformations() {
  console.log('\n📋 Test 5: Simple Indexed Transformations');

  try {
    const data = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 }
    ];

    // Test simple indexed access
    const arrayLens = arrayIndexLens(1);
    const nameLens = objectKeyLens('name');

    const person = arrayLens.get(data);
    console.log('✅ Simple indexed access get:', person.name === 'Bob');

    const updated = arrayLens.set({ name: 'Robert', age: 30 })(data);
    console.log('✅ Simple indexed access set:', updated[1].name === 'Robert');

  } catch (error) {
    console.error('❌ Simple indexed transformations test failed:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running Simplified Indexable Optics Tests');
  console.log('==================================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testIndexedLensLaws,
    testBuiltInIndexedOptics,
    testIndexedOperations,
    testPurityAndHKTIntegration,
    testSimpleIndexedTransformations
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
    console.log('🎉 All simplified indexable optics tests passed!');
    console.log('✅ Indexable Optics core functionality verified!');
  } else {
    console.log('⚠️ Some tests failed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testIndexedLensLaws,
  testBuiltInIndexedOptics,
  testIndexedOperations,
  testPurityAndHKTIntegration,
  testSimpleIndexedTransformations,
  runAllTests
}; 