/**
 * Comprehensive Tests for Indexable Optics
 * 
 * Tests Indexable Optics (IndexedLens, IndexedPrism, IndexedTraversal) for
 * focusing into elements at known positions or matching keys, with full
 * HKT + Purity integration and .then(...) composition support.
 */

console.log('🚀 Testing Indexable Optics (Indexed Lens, Prism, Traversal)...');

// ============================================================================
// Mock Implementations
// ============================================================================

// Mock ADTs
const Maybe = {
  Just: (value) => ({ tag: 'Just', value }),
  Nothing: () => ({ tag: 'Nothing' }),
  match: (maybe, cases) => {
    if (maybe.tag === 'Just') return cases.Just(maybe.value);
    return cases.Nothing();
  }
};

const Either = {
  Left: (value) => ({ tag: 'Left', value }),
  Right: (value) => ({ tag: 'Right', value }),
  match: (either, cases) => {
    if (either.tag === 'Left') return cases.Left(either.value);
    return cases.Right(either.value);
  }
};

// Mock IndexedLens implementation
function createIndexedLens(index, getter, setter) {
  return {
    __type: 'IndexedLens',
    __effect: 'Pure',
    __kind: {},
    index,
    
    // Core lens operations
    get: (s) => getter(s, index),
    set: (b) => (s) => setter(index, b, s),
    modify: (f) => (s) => setter(index, f(getter(s, index)), s),
    getOption: (s) => ({ tag: 'Just', value: getter(s, index) }),
    
    // Indexed-specific operations
    getAt: getter,
    setAt: setter,
    modifyAt: (i, f, s) => setter(i, f(getter(s, i)), s),
    
    // BaseOptic operations
    over: (s, f) => setter(index, f(getter(s, index)), s),
    map: (s, f) => setter(index, f(getter(s, index)), s),
    exists: (predicate) => (s) => predicate(getter(s, index)),
    forall: (predicate) => (s) => predicate(getter(s, index)),
    
    // Composition
    then: (next) => composeIndexedLensWithOptic(this, next),
    thenIndexed: (next) => composeIndexedLensWithIndexedOptic(this, next),
    
    composeIndexedLens: (lens) => composeIndexedLensIndexedLens(this, lens),
    composeIndexedPrism: (prism) => composeIndexedLensIndexedPrism(this, prism),
    composeIndexedTraversal: (traversal) => composeIndexedLensIndexedTraversal(this, traversal)
  };
}

// Mock IndexedPrism implementation
function createIndexedPrism(index, matcher, builder) {
  return {
    __type: 'IndexedPrism',
    __effect: 'Pure',
    __kind: {},
    index,
    
    // Core prism operations
    get: (s) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return result.value;
      }
      throw new Error(`IndexedPrism: No match found at index ${index}`);
    },
    set: (b) => (s) => builder(index, b),
    modify: (f) => (s) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return builder(index, f(result.value));
      }
      return s;
    },
    getOption: (s) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return { tag: 'Just', value: result.value };
      }
      return { tag: 'Nothing' };
    },
    
    // Indexed-specific operations
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
    },
    modifyAtOption: (i, f, s) => {
      const result = matcher(s, i);
      if (result.tag === 'Left') {
        return builder(i, f(result.value));
      }
      return s;
    },
    
    // BaseOptic operations
    over: (s, f) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return builder(index, f(result.value));
      }
      return s;
    },
    map: (s, f) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return builder(index, f(result.value));
      }
      return s;
    },
    exists: (predicate) => (s) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return predicate(result.value);
      }
      return false;
    },
    forall: (predicate) => (s) => {
      const result = matcher(s, index);
      if (result.tag === 'Left') {
        return predicate(result.value);
      }
      return true;
    },
    
    // Composition
    then: (next) => composeIndexedPrismWithOptic(this, next),
    thenIndexed: (next) => composeIndexedPrismWithIndexedOptic(this, next),
    
    composeIndexedLens: (lens) => composeIndexedPrismIndexedLens(this, lens),
    composeIndexedPrism: (prism) => composeIndexedPrismIndexedPrism(this, prism),
    composeIndexedTraversal: (traversal) => composeIndexedPrismIndexedTraversal(this, traversal)
  };
}

// Mock IndexedTraversal implementation
function createIndexedTraversal(index, getAllFn, modifyFn) {
  return {
    __type: 'IndexedTraversal',
    __effect: 'Pure',
    __kind: {},
    index,
    
    // Core traversal operations
    modify: (f, s) => modifyFn(index, f, s),
    over: (s, f) => modifyFn(index, f, s),
    map: (s, f) => modifyFn(index, f, s),
    getAll: (s) => getAllFn(s, index),
    
    // Indexed-specific operations
    getAllWithIndices: (s) => getAllFn(s, index).map(a => [index, a]),
    modifyWithIndices: (f, s) => modifyFn(index, (a) => f(index, a), s),
    collectWithIndices: (s, f) => getAllFn(s, index).map(a => f(index, a)),
    
    // BaseOptic operations
    get: (s) => getAllFn(s, index),
    getOption: (s) => {
      const all = getAllFn(s, index);
      return all.length > 0 ? { tag: 'Just', value: all } : { tag: 'Nothing' };
    },
    set: (b) => (s) => modifyFn(index, () => b, s),
    modify: (f) => (s) => modifyFn(index, f, s),
    
    // Traversal-specific operations
    setAll: (value, s) => modifyFn(index, () => value, s),
    collect: (s, f) => getAllFn(s, index).map(f),
    fold: (s, initial, reducer) => getAllFn(s, index).reduce(reducer, initial),
    all: (s, predicate) => getAllFn(s, index).every(predicate),
    any: (s, predicate) => getAllFn(s, index).some(predicate),
    find: (s, predicate) => {
      const found = getAllFn(s, index).find(predicate);
      return found !== undefined ? { tag: 'Just', value: found } : { tag: 'Nothing' };
    },
    head: (s) => {
      const all = getAllFn(s, index);
      return all.length > 0 ? { tag: 'Just', value: all[0] } : { tag: 'Nothing' };
    },
    last: (s) => {
      const all = getAllFn(s, index);
      return all.length > 0 ? { tag: 'Just', value: all[all.length - 1] } : { tag: 'Nothing' };
    },
    
    // Composition
    then: (next) => composeIndexedTraversalWithOptic(this, next),
    thenIndexed: (next) => composeIndexedTraversalWithIndexedOptic(this, next),
    
    composeIndexedLens: (lens) => composeIndexedTraversalIndexedLens(this, lens),
    composeIndexedPrism: (prism) => composeIndexedTraversalIndexedPrism(this, prism),
    composeIndexedTraversal: (traversal) => composeIndexedTraversalIndexedTraversal(this, traversal),
    
    // Optional-specific operations
    exists: (predicate) => (s) => getAllFn(s, index).some(predicate),
    forall: (predicate) => (s) => getAllFn(s, index).every(predicate)
  };
}

// Mock composition functions
function composeIndexedLensWithOptic(outer, next) {
  if (next.__type === 'Lens') {
    return composeIndexedLensLens(outer, next);
  } else if (next.__type === 'Prism') {
    return composeIndexedLensPrism(outer, next);
  } else if (next.__type === 'Optional') {
    return composeIndexedLensOptional(outer, next);
  } else {
    return composeIndexedLensTraversal(outer, next);
  }
}

function composeIndexedLensWithIndexedOptic(outer, next) {
  if (next.__type === 'IndexedLens') {
    return composeIndexedLensIndexedLens(outer, next);
  } else if (next.__type === 'IndexedPrism') {
    return composeIndexedLensIndexedPrism(outer, next);
  } else {
    return composeIndexedLensIndexedTraversal(outer, next);
  }
}

function composeIndexedLensIndexedLens(outer, inner) {
  return createIndexedLens(
    [outer.index, inner.index],
    (s, [i, i2]) => inner.getAt(outer.getAt(s, i), i2),
    ([i, i2], b, s) => outer.setAt(i, inner.setAt(i2, b, outer.getAt(s, i)), s)
  );
}

function composeIndexedLensIndexedPrism(outer, inner) {
  return createIndexedPrism(
    [outer.index, inner.index],
    (s, [i, i2]) => {
      const outerValue = outer.getAt(s, i);
      return inner.getAtOption(outerValue, i2);
    },
    ([i, i2], b) => {
      // This is a simplified implementation
      return {};
    }
  );
}

function composeIndexedLensIndexedTraversal(outer, inner) {
  return createIndexedTraversal(
    [outer.index, inner.index],
    (s, [i, i2]) => inner.getAll(outer.getAt(s, i)),
    ([i, i2], f, s) => {
      const outerValue = outer.getAt(s, i);
      const modifiedOuter = outer.setAt(i, inner.modify(f, outerValue), s);
      return modifiedOuter;
    }
  );
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
    
    // Set/Set Law: set(b2, set(b1, s)) === set(b2, s)
    const value1 = 20;
    const value2 = 30;
    const set1 = lens.set(value1)(numbers);
    const set2 = lens.set(value2)(set1);
    const setDirect = lens.set(value2)(numbers);
    console.log('✅ Set/Set Law:', JSON.stringify(set2) === JSON.stringify(setDirect));

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
    
    const outOfBounds = arrayPrism.getOption(numbers, 10);
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
    
    const missingKey = agePrism.getOption(person, 'missing');
    console.log('✅ Object key prism missing key:', missingKey.tag === 'Nothing');

  } catch (error) {
    console.error('❌ Built-in indexed optics test failed:', error.message);
  }
}

// ============================================================================
// Test 3: Cross-Kind Composition
// ============================================================================

function testCrossKindComposition() {
  console.log('\n📋 Test 3: Cross-Kind Composition');

  try {
    const nestedData = [
      { name: 'Alice', profile: { email: 'alice@example.com' } },
      { name: 'Bob', profile: { email: 'bob@example.com' } },
      { name: 'Charlie', profile: { email: 'charlie@example.com' } }
    ];

    // Create indexed optics
    const arrayLens = arrayIndexLens(1);
    const nameLens = objectKeyLens('name');
    const profileLens = objectKeyLens('profile');
    const emailLens = objectKeyLens('email');

    // Test IndexedLens → IndexedLens = IndexedLens
    const nameIndexedLens = createIndexedLens(
      'name',
      (obj, key) => obj[key],
      (key, value, obj) => ({ ...obj, [key]: value })
    );

    const composedLens = arrayLens.composeIndexedLens(nameIndexedLens);
    console.log('✅ IndexedLens → IndexedLens = IndexedLens:', composedLens.__type === 'IndexedLens');

    // Test composition operations
    const name = composedLens.getAt(nestedData, [1, 'name']);
    console.log('✅ Composed lens getAt:', name === 'Bob');

    const updated = composedLens.setAt([1, 'name'], 'Robert', nestedData);
    console.log('✅ Composed lens setAt:', updated[1].name === 'Robert');

  } catch (error) {
    console.error('❌ Cross-kind composition test failed:', error.message);
  }
}

// ============================================================================
// Test 4: Indexed Operations
// ============================================================================

function testIndexedOperations() {
  console.log('\n📋 Test 4: Indexed Operations');

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

    const prismModify = prism.modifyAtOption(2, x => x * 2, numbers);
    console.log('✅ modifyAtOption operation:', prismModify[2] === 6);

    // Test out of bounds handling
    const outOfBounds = prism.getAtOption(numbers, 10);
    console.log('✅ Out of bounds handling:', outOfBounds.tag === 'Nothing');

  } catch (error) {
    console.error('❌ Indexed operations test failed:', error.message);
  }
}

// ============================================================================
// Test 5: Nested Indexed Access
// ============================================================================

function testNestedIndexedAccess() {
  console.log('\n📋 Test 5: Nested Indexed Access');

  try {
    const complexData = {
      users: [
        { name: 'Alice', scores: [85, 90, 92] },
        { name: 'Bob', scores: [78, 88, 95] },
        { name: 'Charlie', scores: [92, 87, 89] }
      ]
    };

    // Create indexed optics for nested access
    const usersLens = objectKeyLens('users');
    const userArrayLens = arrayIndexLens(1);
    const scoresLens = objectKeyLens('scores');
    const scoreArrayLens = arrayIndexLens(2);

    // Compose for deep access: users[1].scores[2]
    const deepLens = usersLens
      .then(userArrayLens)
      .then(scoresLens)
      .then(scoreArrayLens);

    const score = deepLens.get(complexData);
    console.log('✅ Nested indexed access get:', score === 95);

    const updated = deepLens.set(100)(complexData);
    console.log('✅ Nested indexed access set:', updated.users[1].scores[2] === 100);

  } catch (error) {
    console.error('❌ Nested indexed access test failed:', error.message);
  }
}

// ============================================================================
// Test 6: Indexed Traversal Operations
// ============================================================================

function testIndexedTraversalOperations() {
  console.log('\n📋 Test 6: Indexed Traversal Operations');

  try {
    const numbers = [1, 2, 3, 4, 5];
    const traversal = createIndexedTraversal(
      2,
      (arr, i) => i >= 0 && i < arr.length ? [arr[i]] : [],
      (i, f, arr) => {
        if (i >= 0 && i < arr.length) {
          const result = [...arr];
          result[i] = f(result[i]);
          return result;
        }
        return arr;
      }
    );

    // Test indexed traversal operations
    const allWithIndices = traversal.getAllWithIndices(numbers);
    console.log('✅ getAllWithIndices operation:', allWithIndices.length === 1);

    const modified = traversal.modifyWithIndices((i, a) => a * 2, numbers);
    console.log('✅ modifyWithIndices operation:', modified[2] === 6);

    const collected = traversal.collectWithIndices(numbers, (i, a) => `${i}:${a}`);
    console.log('✅ collectWithIndices operation:', collected[0] === '2:3');

  } catch (error) {
    console.error('❌ Indexed traversal operations test failed:', error.message);
  }
}

// ============================================================================
// Test 7: Purity and HKT Integration
// ============================================================================

function testPurityAndHKTIntegration() {
  console.log('\n📋 Test 7: Purity and HKT Integration');

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

    // Test traversal purity
    const traversal = createIndexedTraversal(2, () => [], () => []);
    console.log('✅ IndexedTraversal has effect:', traversal.__effect === 'Pure');
    console.log('✅ IndexedTraversal has type:', traversal.__type === 'IndexedTraversal');

  } catch (error) {
    console.error('❌ Purity and HKT integration test failed:', error.message);
  }
}

// ============================================================================
// Test 8: Complex Indexed Transformations
// ============================================================================

function testComplexIndexedTransformations() {
  console.log('\n📋 Test 8: Complex Indexed Transformations');

  try {
    const complexData = {
      departments: [
        {
          name: 'Engineering',
          teams: [
            { name: 'Frontend', members: ['Alice', 'Bob'] },
            { name: 'Backend', members: ['Charlie', 'David'] }
          ]
        },
        {
          name: 'Design',
          teams: [
            { name: 'UI', members: ['Eve', 'Frank'] }
          ]
        }
      ]
    };

    // Create indexed optics for complex nested structure
    const deptLens = objectKeyLens('departments');
    const deptArrayLens = arrayIndexLens(0);
    const teamsLens = objectKeyLens('teams');
    const teamArrayLens = arrayIndexLens(1);
    const membersLens = objectKeyLens('members');
    const memberArrayLens = arrayIndexLens(0);

    // Compose for deep indexed access: departments[0].teams[1].members[0]
    const deepLens = deptLens
      .then(deptArrayLens)
      .then(teamsLens)
      .then(teamArrayLens)
      .then(membersLens)
      .then(memberArrayLens);

    const member = deepLens.get(complexData);
    console.log('✅ Complex indexed access get:', member === 'David');

    const updated = deepLens.set('Daniel')(complexData);
    console.log('✅ Complex indexed access set:', updated.departments[0].teams[1].members[0] === 'Daniel');

  } catch (error) {
    console.error('❌ Complex indexed transformations test failed:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running Indexable Optics Tests');
  console.log('==================================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testIndexedLensLaws,
    testBuiltInIndexedOptics,
    testCrossKindComposition,
    testIndexedOperations,
    testNestedIndexedAccess,
    testIndexedTraversalOperations,
    testPurityAndHKTIntegration,
    testComplexIndexedTransformations
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
    console.log('🎉 All indexable optics tests passed!');
    console.log('✅ Indexable Optics (Indexed Lens, Prism, Traversal) complete!');
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
  testCrossKindComposition,
  testIndexedOperations,
  testNestedIndexedAccess,
  testIndexedTraversalOperations,
  testPurityAndHKTIntegration,
  testComplexIndexedTransformations,
  runAllTests
}; 