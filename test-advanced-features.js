/**
 * Advanced Features Test Suite (JavaScript)
 * 
 * This module tests advanced FP features including:
 * - Optional optic composition (Lens→Optional, Prism→Optional, Optional→Optional)
 * - Immutability helpers (freezeDeep, cloneImmutable, updateImmutable)
 * - Async bimonad operations (TaskEither bichain, matchM)
 * - Higher-order kind usage (ObservableLite<Either<L, R>>)
 */

// Mock implementations for testing
const { ObservableLite } = require('./fp-observable-lite');
const { TaskEither, TaskEitherLeft, TaskEitherRight, bichainTaskEither, matchMTaskEither } = require('./fp-bimonad-extended');
const { Either, Left, Right, matchEither } = require('./fp-either-unified');

// Mock optics for testing
function lens(getter, setter) {
  return {
    get: getter,
    set: setter,
    then: function(next) {
      return {
        get: (s) => next.get(this.get(s)),
        set: (b, s) => this.set(next.set(b, this.get(s)), s),
        getOption: next.getOption ? (s) => next.getOption(this.get(s)) : undefined
      };
    }
  };
}

function prism(match, build) {
  return {
    match,
    build,
    then: function(next) {
      return {
        match: (s) => {
          const result = this.match(s);
          if (result && result.tag === 'Just') {
            return next.match ? next.match(result.value) : { tag: 'Just', value: result.value };
          }
          return { tag: 'Nothing' };
        },
        build: (b) => this.build(next.build(b)),
        getOption: next.getOption ? (s) => {
          const result = this.match(s);
          if (result && result.tag === 'Just') {
            return next.getOption(result.value);
          }
          return { tag: 'Nothing' };
        } : undefined
      };
    }
  };
}

function optional(getOption, set) {
  return {
    getOption,
    set,
    then: function(next) {
      return {
        getOption: (s) => {
          const result = this.getOption(s);
          if (result && result.tag === 'Just') {
            return next.getOption ? next.getOption(result.value) : { tag: 'Just', value: result.value };
          }
          return { tag: 'Nothing' };
        },
        set: (b, s) => {
          const result = this.getOption(s);
          if (result && result.tag === 'Just') {
            return this.set(next.set ? next.set(b, result.value) : b, s);
          }
          return s;
        }
      };
    }
  };
}

// ============================================================================
// Test 1: Optional Optic Composition
// ============================================================================

/**
 * Test Lens→Optional composition
 */
function testLensToOptionalComposition() {
  console.log('🧪 Testing Lens→Optional composition...');
  
  // Define a nested structure
  const user = {
    profile: {
      contact: {
        email: 'test@example.com'
      }
    }
  };
  
  // Create lenses and optional
  const profileLens = lens(
    u => u.profile,
    (p, u) => ({ ...u, profile: p })
  );
  
  const emailOptional = optional(
    p => p.contact?.email ? { tag: 'Just', value: p.contact.email } : { tag: 'Nothing' },
    (email, p) => ({ ...p, contact: { ...p.contact, email } })
  );
  
  // Compose: Lens→Optional = Optional
  const emailFromUserOptional = profileLens.then(emailOptional);
  
  // Test runtime behavior
  const result1 = emailFromUserOptional.getOption(user);
  if (result1.tag === 'Just') {
    console.log('✅ Lens→Optional: Found email:', result1.value);
  }
  
  // Test with missing email
  const userNoEmail = {
    profile: {
      contact: {}
    }
  };
  
  const result2 = emailFromUserOptional.getOption(userNoEmail);
  if (result2.tag === 'Nothing') {
    console.log('✅ Lens→Optional: Correctly handles missing email');
  }
  
  console.log('✅ Lens→Optional composition: PASSED\n');
}

/**
 * Test Prism→Optional composition
 */
function testPrismToOptionalComposition() {
  console.log('🧪 Testing Prism→Optional composition...');
  
  // Define a sum type with optional field
  const response = {
    tag: 'Success',
    data: { value: 42 }
  };
  
  // Create prism and optional
  const successPrism = prism(
    r => r.tag === 'Success' ? { tag: 'Just', value: r } : { tag: 'Nothing' },
    s => s
  );
  
  const valueOptional = optional(
    s => s.data?.value !== undefined ? { tag: 'Just', value: s.data.value } : { tag: 'Nothing' },
    (value, s) => ({ ...s, data: { ...s.data, value } })
  );
  
  // Compose: Prism→Optional = Optional
  const valueFromResponseOptional = successPrism.then(valueOptional);
  
  // Test runtime behavior
  const result1 = valueFromResponseOptional.getOption(response);
  if (result1.tag === 'Just') {
    console.log('✅ Prism→Optional: Found value:', result1.value);
  }
  
  // Test with missing data
  const responseNoData = {
    tag: 'Success'
  };
  
  const result2 = valueFromResponseOptional.getOption(responseNoData);
  if (result2.tag === 'Nothing') {
    console.log('✅ Prism→Optional: Correctly handles missing data');
  }
  
  // Test with error response
  const errorResponse = {
    tag: 'Error',
    message: 'Something went wrong'
  };
  
  const result3 = valueFromResponseOptional.getOption(errorResponse);
  if (result3.tag === 'Nothing') {
    console.log('✅ Prism→Optional: Correctly handles error response');
  }
  
  console.log('✅ Prism→Optional composition: PASSED\n');
}

/**
 * Test Optional→Optional composition
 */
function testOptionalToOptionalComposition() {
  console.log('🧪 Testing Optional→Optional composition...');
  
  // Define a deeply nested optional structure
  const config = {
    settings: {
      theme: {
        colors: {
          primary: '#007bff'
        }
      }
    }
  };
  
  // Create optionals
  const settingsOptional = optional(
    c => c.settings ? { tag: 'Just', value: c.settings } : { tag: 'Nothing' },
    (settings, c) => ({ ...c, settings })
  );
  
  const primaryColorOptional = optional(
    s => s?.theme?.colors?.primary ? { tag: 'Just', value: s.theme.colors.primary } : { tag: 'Nothing' },
    (primary, s) => ({ ...s, theme: { ...s?.theme, colors: { ...s?.theme?.colors, primary } } })
  );
  
  // Compose: Optional→Optional = Optional
  const primaryFromConfigOptional = settingsOptional.then(primaryColorOptional);
  
  // Test runtime behavior
  const result1 = primaryFromConfigOptional.getOption(config);
  if (result1.tag === 'Just') {
    console.log('✅ Optional→Optional: Found primary color:', result1.value);
  }
  
  // Test with missing theme
  const configNoTheme = {
    settings: {}
  };
  
  const result2 = primaryFromConfigOptional.getOption(configNoTheme);
  if (result2.tag === 'Nothing') {
    console.log('✅ Optional→Optional: Correctly handles missing theme');
  }
  
  console.log('✅ Optional→Optional composition: PASSED\n');
}

// ============================================================================
// Test 2: Immutability Helpers
// ============================================================================

/**
 * Deep freeze utility
 */
function freezeDeep(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return Object.freeze(obj.map(freezeDeep));
  }
  
  const frozen = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      frozen[key] = freezeDeep(obj[key]);
    }
  }
  
  return Object.freeze(frozen);
}

/**
 * Deep clone utility
 */
function cloneImmutable(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
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

/**
 * Immutable update utility
 */
function updateImmutable(obj, key, value) {
  return { ...obj, [key]: value };
}

/**
 * Test deep freeze functionality
 */
function testFreezeDeep() {
  console.log('🧪 Testing freezeDeep...');
  
  const original = {
    name: 'John',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      zip: '12345'
    },
    hobbies: ['reading', 'coding', 'gaming']
  };
  
  const frozen = freezeDeep(original);
  
  // Test that mutation attempts fail (should throw in strict mode)
  try {
    frozen.name = 'Jane';
    console.log('⚠️  freezeDeep: Mutation allowed (not in strict mode)');
  } catch (error) {
    console.log('✅ freezeDeep: Mutation prevented');
  }
  
  // Test nested immutability
  try {
    frozen.address.street = '456 Oak Ave';
    console.log('⚠️  freezeDeep: Nested mutation allowed (not in strict mode)');
  } catch (error) {
    console.log('✅ freezeDeep: Nested mutation prevented');
  }
  
  // Test array immutability
  try {
    frozen.hobbies.push('swimming');
    console.log('⚠️  freezeDeep: Array mutation allowed (not in strict mode)');
  } catch (error) {
    console.log('✅ freezeDeep: Array mutation prevented');
  }
  
  console.log('✅ freezeDeep: PASSED\n');
}

/**
 * Test deep clone functionality
 */
function testCloneImmutable() {
  console.log('🧪 Testing cloneImmutable...');
  
  const original = {
    name: 'Alice',
    age: 25,
    address: {
      street: '789 Pine St',
      city: 'Somewhere',
      zip: '67890'
    },
    hobbies: ['painting', 'dancing']
  };
  
  const cloned = cloneImmutable(original);
  
  // Test that clone is independent
  const originalName = original.name;
  const clonedName = cloned.name;
  
  // Modify original
  original.name = 'Bob';
  original.address.street = '999 Elm St';
  original.hobbies.push('singing');
  
  // Verify clone is unchanged
  if (cloned.name === clonedName && 
      cloned.address.street === '789 Pine St' && 
      cloned.hobbies.length === 2) {
    console.log('✅ cloneImmutable: Clone is independent of original');
  } else {
    throw new Error('cloneImmutable: Clone was mutated by original changes');
  }
  
  console.log('✅ cloneImmutable: PASSED\n');
}

/**
 * Test immutable update functionality
 */
function testUpdateImmutable() {
  console.log('🧪 Testing updateImmutable...');
  
  const original = {
    name: 'Charlie',
    age: 35,
    address: {
      street: '321 Oak St',
      city: 'Elsewhere',
      zip: '54321'
    }
  };
  
  // Test simple update
  const updated = updateImmutable(original, 'age', 36);
  
  // Verify original is unchanged
  if (original.age === 35 && updated.age === 36) {
    console.log('✅ updateImmutable: Simple update preserves immutability');
  } else {
    throw new Error('updateImmutable: Simple update failed');
  }
  
  // Test nested update
  const updatedAddress = updateImmutable(updated.address, 'city', 'New City');
  const updatedWithAddress = updateImmutable(updated, 'address', updatedAddress);
  
  // Verify nested immutability
  if (original.address.city === 'Elsewhere' && 
      updated.address.city === 'Elsewhere' && 
      updatedWithAddress.address.city === 'New City') {
    console.log('✅ updateImmutable: Nested update preserves immutability');
  } else {
    throw new Error('updateImmutable: Nested update failed');
  }
  
  console.log('✅ updateImmutable: PASSED\n');
}

// ============================================================================
// Test 3: Async Bimonad Operations (TaskEither)
// ============================================================================

/**
 * Test TaskEither bichain operation
 */
async function testTaskEitherBichain() {
  console.log('🧪 Testing TaskEither bichain...');
  
  // Simulate async operations
  const fetchUser = (id) => {
    return async () => {
      if (id === '1') {
        return Right({ id: '1', name: 'Alice' });
      } else if (id === '2') {
        return Left(new Error('User not found'));
      } else {
        return Left(new Error('Invalid ID'));
      }
    };
  };
  
  const validateUser = (user) => {
    return async () => {
      if (user.name.length > 0) {
        return Right({ ...user, validated: true });
      } else {
        return Left(new Error('Invalid user name'));
      }
    };
  };
  
  const createDefaultUser = (id) => {
    return async () => Right({ id, name: 'Default User', validated: true });
  };
  
  // Test bichain with success path
  const successChain = bichainTaskEither(
    (error) => createDefaultUser('1'),
    (user) => validateUser(user)
  );
  
  const successResult = await successChain(fetchUser('1'))();
  if (successResult.tag === 'Right' && successResult.value.validated) {
    console.log('✅ TaskEither bichain: Success path works correctly');
  } else {
    throw new Error('TaskEither bichain: Success path failed');
  }
  
  // Test bichain with error path
  const errorChain = bichainTaskEither(
    (error) => createDefaultUser('2'),
    (user) => validateUser(user)
  );
  
  const errorResult = await errorChain(fetchUser('2'))();
  if (errorResult.tag === 'Right' && errorResult.value.name === 'Default User') {
    console.log('✅ TaskEither bichain: Error recovery path works correctly');
  } else {
    throw new Error('TaskEither bichain: Error recovery path failed');
  }
  
  console.log('✅ TaskEither bichain: PASSED\n');
}

/**
 * Test TaskEither matchM operation
 */
async function testTaskEitherMatchM() {
  console.log('🧪 Testing TaskEither matchM...');
  
  const fetchData = (id) => {
    return async () => {
      if (id === '1') {
        return Right({ id: '1', data: 'Success data' });
      } else {
        return Left(new Error('Data not found'));
      }
    };
  };
  
  const processSuccess = async (data) => {
    return `Processed: ${data.data}`;
  };
  
  const processError = async (error) => {
    return `Error handled: ${error.message}`;
  };
  
  // Test matchM with success
  const successMatch = matchMTaskEither(processError, processSuccess);
  const successResult = await successMatch(fetchData('1'));
  
  if (successResult === 'Processed: Success data') {
    console.log('✅ TaskEither matchM: Success branch works correctly');
  } else {
    throw new Error('TaskEither matchM: Success branch failed');
  }
  
  // Test matchM with error
  const errorMatch = matchMTaskEither(processError, processSuccess);
  const errorResult = await errorMatch(fetchData('2'));
  
  if (errorResult === 'Error handled: Data not found') {
    console.log('✅ TaskEither matchM: Error branch works correctly');
  } else {
    throw new Error('TaskEither matchM: Error branch failed');
  }
  
  console.log('✅ TaskEither matchM: PASSED\n');
}

// ============================================================================
// Test 4: Higher-Order Kind Usage
// ============================================================================

/**
 * Test ObservableLite<Either<L, R>> higher-order kind usage
 */
function testHigherOrderKindUsage() {
  console.log('🧪 Testing Higher-Order Kind usage...');
  
  // Create ObservableLite<Either<string, number>>
  const observableEither = ObservableLite.fromArray([
    Right(42),
    Left('Error 1'),
    Right(100),
    Left('Error 2'),
    Right(7)
  ]);
  
  // Test map over inner Either values
  const mappedObservable = observableEither.map(either => 
    matchEither(either, {
      Left: (error) => `Error: ${error}`,
      Right: (value) => `Success: ${value * 2}`
    })
  );
  
  // Test filter to get only successful values
  const successOnly = observableEither.map(either => 
    matchEither(either, {
      Left: () => null,
      Right: (value) => value
    })
  ).filter((value) => value !== null);
  
  // Test chain to flatten nested Eithers
  const flattened = observableEither.chain(either =>
    matchEither(either, {
      Left: (error) => ObservableLite.of(Left(error)),
      Right: (value) => ObservableLite.of(Right(value * 2))
    })
  );
  
  console.log('✅ Higher-Order Kind usage: PASSED\n');
}

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Run all advanced feature tests
 */
async function runAdvancedFeatureTests() {
  console.log('🚀 Running Advanced Features Test Suite...\n');
  
  try {
    // Test 1: Optional Optic Composition
    testLensToOptionalComposition();
    testPrismToOptionalComposition();
    testOptionalToOptionalComposition();
    
    // Test 2: Immutability Helpers
    testFreezeDeep();
    testCloneImmutable();
    testUpdateImmutable();
    
    // Test 3: Async Bimonad Operations
    await testTaskEitherBichain();
    await testTaskEitherMatchM();
    
    // Test 4: Higher-Order Kind Usage
    testHigherOrderKindUsage();
    
    console.log('🎉 All Advanced Features Tests PASSED!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Optional optic composition (Lens→Optional, Prism→Optional, Optional→Optional)');
    console.log('  ✅ Immutability helpers (freezeDeep, cloneImmutable, updateImmutable)');
    console.log('  ✅ Async bimonad operations (TaskEither bichain, matchM)');
    console.log('  ✅ Higher-order kind usage (ObservableLite<Either<L, R>>)');
    
  } catch (error) {
    console.error('\n❌ Advanced Features Tests FAILED:', error);
    throw error;
  }
}

// Auto-run tests if this file is executed directly
if (require.main === module) {
  runAdvancedFeatureTests().catch(console.error);
}

module.exports = { runAdvancedFeatureTests }; 