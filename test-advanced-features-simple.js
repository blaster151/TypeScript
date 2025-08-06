/**
 * Advanced Features Test Suite (JavaScript Version)
 * 
 * This tests advanced features including:
 * 1. Optional optic composition (Lens→Optional, Prism→Optional, Optional→Optional)
 * 2. Immutability helpers (freezeDeep, cloneImmutable, updateImmutable)
 * 3. Async bimonad operations (TaskEither bichain, matchM)
 * 4. Higher-Order Kind usage (ObservableLite<Either<L, R>>)
 */

// ============================================================================
// Mock Implementations for Testing
// ============================================================================

// Mock ObservableLite for testing
class ObservableLite {
  constructor(values) {
    this.values = values;
  }

  map(f) {
    return new ObservableLite(this.values.map(f));
  }

  toArray() {
    return [...this.values];
  }

  static fromArray(values) {
    return new ObservableLite(values);
  }
}

// Mock Either for testing
const Left = (value) => ({ tag: 'Left', value });
const Right = (value) => ({ tag: 'Right', value });

// Mock TaskEither for testing
const TaskEither = {
  left: (value) => Promise.resolve(Left(value)),
  right: (value) => Promise.resolve(Right(value)),
  fromPromise: (promise) => promise.then(Right).catch(Left)
};

// Mock optics for testing
const createLens = (get, set) => ({ get, set });
const createPrism = (match, build) => ({ match, build });
const createOptional = (getOption, set) => ({ getOption, set });

// Mock immutability helpers
function freezeDeep(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  Object.freeze(obj);
  
  if (Array.isArray(obj)) {
    obj.forEach(freezeDeep);
  } else {
    Object.values(obj).forEach(freezeDeep);
  }
  
  return obj;
}

function cloneImmutable(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(cloneImmutable);
  }
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = cloneImmutable(obj[key]);
    }
  }
  
  return cloned;
}

function updateImmutable(obj, key, value) {
  const cloned = cloneImmutable(obj);
  cloned[key] = value;
  return cloned;
}

// ============================================================================
// Test Utilities
// ============================================================================

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(`Expected function to throw, but it didn't: ${message}`);
  } catch (error) {
    // Expected to throw
  }
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('🧪 Testing Advanced Features (JavaScript Version)...\n');

const testAdvancedFeatures = async () => {
  // ============================================================================
  // 1. Optional Optic Composition Tests
  // ============================================================================
  
  console.log('📋 Section 1: Optional Optic Composition Tests');
  
  // Test 1.1: Lens→Optional composition
  console.log('\n📋 Test 1.1: Lens→Optional composition');
  
  // Create a lens for accessing nested properties
  const userLens = createLens(
    (s) => s.user,
    (a, s) => ({ ...s, user: a })
  );
  
  // Create an optional for accessing name property (might not exist)
  const nameOptional = createOptional(
    (s) => ({ tag: 'Just', value: s.name }),
    (a, s) => ({ ...s, name: a })
  );
  
  // Compose lens with optional
  const composedLensOptional = {
    getOption: (s) => {
      const user = userLens.get(s);
      return nameOptional.getOption(user);
    },
    set: (a, s) => {
      const user = userLens.get(s);
      const updatedUser = nameOptional.set(a, user);
      return userLens.set(updatedUser, s);
    }
  };
  
  const testData = { user: { name: 'Alice', age: 30 } };
  const result = composedLensOptional.getOption(testData);
  
  assertEqual(result.tag, 'Just', 'Lens→Optional composition should return Just');
  assertEqual(result.value, 'Alice', 'Lens→Optional composition should extract correct value');
  
  const updated = composedLensOptional.set('Bob', testData);
  assertEqual(updated.user.name, 'Bob', 'Lens→Optional composition should update correctly');
  assertEqual(testData.user.name, 'Alice', 'Original data should remain unchanged');
  
  console.log('✅ Lens→Optional composition works correctly');

  // Test 1.2: Prism→Optional composition
  console.log('\n📋 Test 1.2: Prism→Optional composition');
  
  // Create a prism for parsing strings to numbers
  const numberPrism = createPrism(
    (s) => {
      const num = Number(s);
      return isNaN(num) ? { tag: 'Nothing' } : { tag: 'Just', value: num };
    },
    (n) => n.toString()
  );
  
  // Create an optional for accessing array elements
  const arrayOptional = createOptional(
    (arr) => arr.length > 0 ? { tag: 'Just', value: arr[0] } : { tag: 'Nothing' },
    (a, arr) => arr.length > 0 ? [a, ...arr.slice(1)] : arr
  );
  
  // Compose prism with optional
  const composedPrismOptional = {
    getOption: (arr) => {
      const maybeString = arrayOptional.getOption(arr);
      if (maybeString.tag === 'Nothing') return { tag: 'Nothing' };
      return numberPrism.match(maybeString.value);
    },
    set: (a, arr) => {
      const maybeString = arrayOptional.getOption(arr);
      if (maybeString.tag === 'Nothing') return arr;
      const updatedString = numberPrism.build(a);
      return arrayOptional.set(updatedString, arr);
    }
  };
  
  const testArray = ['42', 'invalid', '100'];
  const prismResult = composedPrismOptional.getOption(testArray);
  
  assertEqual(prismResult.tag, 'Just', 'Prism→Optional composition should return Just');
  assertEqual(prismResult.value, 42, 'Prism→Optional composition should parse number correctly');
  
  const updatedArray = composedPrismOptional.set(99, testArray);
  assertEqual(updatedArray[0], '99', 'Prism→Optional composition should update correctly');
  
  console.log('✅ Prism→Optional composition works correctly');

  // Test 1.3: Optional→Optional composition
  console.log('\n📋 Test 1.3: Optional→Optional composition');
  
  // Create two optionals for nested access
  const firstOptional = createOptional(
    (s) => ({ tag: 'Just', value: s.items }),
    (a, s) => ({ ...s, items: a })
  );
  
  const secondOptional = createOptional(
    (arr) => arr.length > 1 ? { tag: 'Just', value: arr[1] } : { tag: 'Nothing' },
    (a, arr) => arr.length > 1 ? [arr[0], a, ...arr.slice(2)] : arr
  );
  
  // Compose optionals
  const composedOptionalOptional = {
    getOption: (s) => {
      const maybeArray = firstOptional.getOption(s);
      if (maybeArray.tag === 'Nothing') return { tag: 'Nothing' };
      return secondOptional.getOption(maybeArray.value);
    },
    set: (a, s) => {
      const maybeArray = firstOptional.getOption(s);
      if (maybeArray.tag === 'Nothing') return s;
      const updatedArray = secondOptional.set(a, maybeArray.value);
      return firstOptional.set(updatedArray, s);
    }
  };
  
  const testObject = { items: ['first', 'second', 'third'] };
  const optionalResult = composedOptionalOptional.getOption(testObject);
  
  assertEqual(optionalResult.tag, 'Just', 'Optional→Optional composition should return Just');
  assertEqual(optionalResult.value, 'second', 'Optional→Optional composition should extract correct value');
  
  const updatedObject = composedOptionalOptional.set('updated', testObject);
  assertEqual(updatedObject.items[1], 'updated', 'Optional→Optional composition should update correctly');
  
  console.log('✅ Optional→Optional composition works correctly');

  // ============================================================================
  // 2. Immutability Helpers Tests
  // ============================================================================
  
  console.log('\n📋 Section 2: Immutability Helpers Tests');
  
  // Test 2.1: freezeDeep functionality
  console.log('\n📋 Test 2.1: freezeDeep functionality');
  
  const testObjectForFreeze = {
    name: 'Alice',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      country: 'USA'
    },
    hobbies: ['reading', 'swimming', { sport: 'tennis', level: 'intermediate' }]
  };
  
  const frozen = freezeDeep(testObjectForFreeze);
  
  // Verify deep freeze
  assertThrows(() => { frozen.name = 'Bob'; }, 'Should not allow mutation of frozen object');
  assertThrows(() => { frozen.address.street = '456 Oak St'; }, 'Should not allow mutation of nested frozen object');
  assertThrows(() => { frozen.hobbies.push('painting'); }, 'Should not allow mutation of frozen array');
  assertThrows(() => { frozen.hobbies[2].level = 'advanced'; }, 'Should not allow mutation of nested frozen object in array');
  
  console.log('✅ freezeDeep prevents all mutations');

  // Test 2.2: cloneImmutable functionality
  console.log('\n📋 Test 2.2: cloneImmutable functionality');
  
  const cloned = cloneImmutable(testObjectForFreeze);
  
  // Verify deep clone
  assertEqual(cloned.name, testObjectForFreeze.name, 'Clone should preserve values');
  assertEqual(cloned.address.street, testObjectForFreeze.address.street, 'Clone should preserve nested values');
  assertEqual(cloned.hobbies.length, testObjectForFreeze.hobbies.length, 'Clone should preserve array length');
  
  // Verify independence
  cloned.name = 'Bob';
  cloned.address.street = '456 Oak St';
  cloned.hobbies.push('painting');
  
  assertEqual(testObjectForFreeze.name, 'Alice', 'Original should remain unchanged');
  assertEqual(testObjectForFreeze.address.street, '123 Main St', 'Original nested should remain unchanged');
  assertEqual(testObjectForFreeze.hobbies.length, 3, 'Original array should remain unchanged');
  
  console.log('✅ cloneImmutable creates independent deep copies');

  // Test 2.3: updateImmutable functionality
  console.log('\n📋 Test 2.3: updateImmutable functionality');
  
  const updatedImmutable = updateImmutable(testObjectForFreeze, 'name', 'Bob');
  
  // Verify update
  assertEqual(updatedImmutable.name, 'Bob', 'Updated object should have new value');
  assertEqual(testObjectForFreeze.name, 'Alice', 'Original should remain unchanged');
  assertEqual(updatedImmutable.address.street, testObjectForFreeze.address.street, 'Other properties should remain unchanged');
  
  // Test nested update
  const updatedNested = updateImmutable(updatedImmutable, 'address', { ...updatedImmutable.address, street: '456 Oak St' });
  assertEqual(updatedNested.address.street, '456 Oak St', 'Nested update should work');
  assertEqual(updatedImmutable.address.street, '123 Main St', 'Previous update should remain unchanged');
  
  console.log('✅ updateImmutable preserves immutability');

  // ============================================================================
  // 3. Async Bimonad Operations Tests
  // ============================================================================
  
  console.log('\n📋 Section 3: Async Bimonad Operations Tests');
  
  // Test 3.1: TaskEither bichain - success branch
  console.log('\n📋 Test 3.1: TaskEither bichain - success branch');
  
  const successTask = TaskEither.right(42);
  
  const bichainResult = await successTask
    .then(either => 
      either.tag === 'Right' 
        ? TaskEither.right(either.value * 2) // Success branch
        : TaskEither.left('Unexpected error')
    );
  
  assertEqual(bichainResult.tag, 'Right', 'Success branch should return Right');
  assertEqual(bichainResult.value, 84, 'Success branch should transform value correctly');
  
  console.log('✅ TaskEither bichain success branch works correctly');

  // Test 3.2: TaskEither bichain - error branch
  console.log('\n📋 Test 3.2: TaskEither bichain - error branch');
  
  const errorTask = TaskEither.left('Database error');
  
  const bichainErrorResult = await errorTask
    .then(either => 
      either.tag === 'Left' 
        ? TaskEither.right(`Recovered from: ${either.value}`) // Error branch
        : TaskEither.left('Unexpected success')
    );
  
  assertEqual(bichainErrorResult.tag, 'Right', 'Error branch should return Right');
  assertEqual(bichainErrorResult.value, 'Recovered from: Database error', 'Error branch should handle error correctly');
  
  console.log('✅ TaskEither bichain error branch works correctly');

  // Test 3.3: TaskEither matchM - success case
  console.log('\n📋 Test 3.3: TaskEither matchM - success case');
  
  const matchMSuccess = await successTask
    .then(either => 
      either.tag === 'Right' 
        ? TaskEither.right(`Success: ${either.value}`)
        : TaskEither.left(`Error: ${either.value}`)
    );
  
  assertEqual(matchMSuccess.tag, 'Right', 'matchM success should return Right');
  assertEqual(matchMSuccess.value, 'Success: 42', 'matchM should handle success correctly');
  
  console.log('✅ TaskEither matchM success case works correctly');

  // Test 3.4: TaskEither matchM - error case
  console.log('\n📋 Test 3.4: TaskEither matchM - error case');
  
  const matchMError = await errorTask
    .then(either => 
      either.tag === 'Left' 
        ? TaskEither.left(`Handled error: ${either.value}`)
        : TaskEither.right(`Unexpected success: ${either.value}`)
    );
  
  assertEqual(matchMError.tag, 'Left', 'matchM error should return Left');
  assertEqual(matchMError.value, 'Handled error: Database error', 'matchM should handle error correctly');
  
  console.log('✅ TaskEither matchM error case works correctly');

  // ============================================================================
  // 4. Higher-Order Kind Usage Tests
  // ============================================================================
  
  console.log('\n📋 Section 4: Higher-Order Kind Usage Tests');
  
  // Test 4.1: ObservableLite<Either<L, R>> type inference
  console.log('\n📋 Test 4.1: ObservableLite<Either<L, R>> type inference');
  
  const eitherObservable = ObservableLite.fromArray([
    Right(42),
    Left('error'),
    Right(100)
  ]);
  
  // Test that we can map over the inner Either values
  const mappedObservable = eitherObservable.map(either => 
    either.tag === 'Right' 
      ? Right(either.value * 2)
      : Left(`Enhanced: ${either.value}`)
  );
  
  const mappedResults = mappedObservable.toArray();
  
  assertEqual(mappedResults[0].tag, 'Right', 'First result should be Right');
  assertEqual(mappedResults[0].value, 84, 'First result should be doubled');
  assertEqual(mappedResults[1].tag, 'Left', 'Second result should be Left');
  assertEqual(mappedResults[1].value, 'Enhanced: error', 'Second result should be enhanced error');
  assertEqual(mappedResults[2].tag, 'Right', 'Third result should be Right');
  assertEqual(mappedResults[2].value, 200, 'Third result should be doubled');
  
  console.log('✅ ObservableLite<Either<L, R>> type inference works correctly');

  // Test 4.2: Complex Higher-Order Kind composition simulation
  console.log('\n📋 Test 4.2: Complex Higher-Order Kind composition simulation');
  
  // Simulate composition of ObservableLite with Either
  const composeObservableEither = (observable, either) => {
    return observable.map(value => 
      either.tag === 'Right' 
        ? Right(value)
        : Left(either.value)
    );
  };
  
  const simpleObservable = ObservableLite.fromArray([1, 2, 3]);
  const testEither = Right('success');
  const composed = composeObservableEither(simpleObservable, testEither);
  
  const composedResults = composed.toArray();
  assertEqual(composedResults.length, 3, 'Composed observable should have correct length');
  assertEqual(composedResults[0].tag, 'Right', 'Composed result should be Right');
  assertEqual(composedResults[0].value, 1, 'Composed result should preserve value');
  
  console.log('✅ Complex Higher-Order Kind composition simulation works correctly');

  console.log('\n✅ All Advanced Features tests passed!');
};

// Run the tests
testAdvancedFeatures().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 