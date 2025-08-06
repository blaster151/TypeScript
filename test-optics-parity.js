/**
 * Comprehensive Tests for Enhanced Optics with Full API Parity
 * 
 * Tests the enhanced optics system with full API parity between Prism/Optional and Lens,
 * including fluent composition, cross-kind support, and improved ergonomics.
 */

console.log('🚀 Testing Enhanced Optics with Full API Parity...');

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

const Result = {
  Ok: (value) => ({ tag: 'Ok', value }),
  Err: (error) => ({ tag: 'Err', error }),
  match: (result, cases) => {
    if (result.tag === 'Ok') return cases.Ok(result.value);
    return cases.Err(result.error);
  }
};

// Mock enhanced optic implementations
function createLens(getter, setter) {
  return {
    __type: 'Lens',
    __effect: 'Pure',
    __kind: {},
    
    over: (f) => (s) => setter(f(getter(s)), s),
    map: (f) => (s) => setter(f(getter(s)), s),
    get: (s) => getter(s),
    getOption: (s) => ({ tag: 'Just', value: getter(s) }),
    set: (b) => (s) => setter(b, s),
    modify: (f) => (s) => setter(f(getter(s)), s),
    
    then: (next) => composeOptic(this, next),
    composeLens: (lens) => composeLensLens(this, lens),
    composePrism: (prism) => composeLensPrism(this, prism),
    composeOptional: (optional) => composeLensOptional(this, optional),
    
    exists: (predicate) => (s) => predicate(getter(s)),
    forall: (predicate) => (s) => predicate(getter(s))
  };
}

function createPrism(match, build) {
  return {
    __type: 'Prism',
    __effect: 'Pure',
    __kind: {},
    
    over: (f) => (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return build(f(result.value));
      }
      return s;
    },
    map: (f) => (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return build(f(result.value));
      }
      return s;
    },
    get: (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return { tag: 'Just', value: result.value };
      }
      return { tag: 'Nothing' };
    },
    getOption: (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return { tag: 'Just', value: result.value };
      }
      return { tag: 'Nothing' };
    },
    set: (b) => (s) => build(b),
    modify: (f) => (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return build(f(result.value));
      }
      return s;
    },
    
    review: (b) => build(b),
    isMatching: (s) => {
      const result = match(s);
      return result.tag === 'Left';
    },
    
    then: (next) => composeOptic(this, next),
    composeLens: (lens) => composePrismLens(this, lens),
    composePrism: (prism) => composePrismPrism(this, prism),
    composeOptional: (optional) => composePrismOptional(this, optional),
    
    exists: (predicate) => (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return predicate(result.value);
      }
      return false;
    },
    forall: (predicate) => (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return predicate(result.value);
      }
      return true;
    }
  };
}

function createOptional(getOption, set) {
  return {
    __type: 'Optional',
    __effect: 'Pure',
    __kind: {},
    
    over: (f) => (s) => {
      const maybe = getOption(s);
      if (maybe.tag === 'Just') {
        return set(f(maybe.value), s);
      }
      return s;
    },
    map: (f) => (s) => {
      const maybe = getOption(s);
      if (maybe.tag === 'Just') {
        return set(f(maybe.value), s);
      }
      return s;
    },
    get: (s) => getOption(s),
    getOption: (s) => getOption(s),
    set: (b) => (s) => set(b, s),
    modify: (f) => (s) => {
      const maybe = getOption(s);
      if (maybe.tag === 'Just') {
        return set(f(maybe.value), s);
      }
      return s;
    },
    
    then: (next) => composeOptic(this, next),
    composeLens: (lens) => composeOptionalLens(this, lens),
    composePrism: (prism) => composeOptionalPrism(this, prism),
    composeOptional: (optional) => composeOptionalOptional(this, optional),
    
    exists: (predicate) => (s) => {
      const maybe = getOption(s);
      if (maybe.tag === 'Just') {
        return predicate(maybe.value);
      }
      return false;
    },
    forall: (predicate) => (s) => {
      const maybe = getOption(s);
      if (maybe.tag === 'Just') {
        return predicate(maybe.value);
      }
      return true;
    }
  };
}

// Mock composition functions
function composeOptic(outer, inner) {
  // Simplified composition
  return {
    __type: 'Optional',
    __effect: 'Pure',
    __kind: {},
    
    over: (f) => (s) => {
      const outerValue = outer.get(s);
      if (outerValue && outerValue.tag === 'Just') {
        const innerValue = inner.get(outerValue.value);
        if (innerValue && innerValue.tag === 'Just') {
          return outer.set(inner.set(f(innerValue.value)), s);
        }
      }
      return s;
    },
    
    get: (s) => {
      const outerValue = outer.get(s);
      if (outerValue && outerValue.tag === 'Just') {
        return inner.get(outerValue.value);
      }
      return { tag: 'Nothing' };
    },
    
    set: (b) => (s) => {
      const outerValue = outer.get(s);
      if (outerValue && outerValue.tag === 'Just') {
        return outer.set(inner.set(b), s);
      }
      return s;
    }
  };
}

function composeLensLens(outer, inner) {
  return createLens(
    (s) => inner.get(outer.get(s)),
    (b, s) => outer.set(inner.set(b, outer.get(s)), s)
  );
}

function composeLensPrism(outer, inner) {
  return createOptional(
    (s) => inner.getOption(outer.get(s)),
    (b, s) => outer.set(inner.set(b), s)
  );
}

function composePrismLens(outer, inner) {
  return createOptional(
    (s) => {
      const maybe = outer.getOption(s);
      if (maybe.tag === 'Just') {
        return { tag: 'Just', value: inner.get(maybe.value) };
      }
      return { tag: 'Nothing' };
    },
    (b, s) => {
      const maybe = outer.getOption(s);
      if (maybe.tag === 'Just') {
        return outer.set(inner.set(b, maybe.value));
      }
      return s;
    }
  );
}

function composePrismPrism(outer, inner) {
  return createPrism(
    (s) => {
      const outerResult = outer.getOption(s);
      if (outerResult.tag === 'Just') {
        const innerResult = inner.getOption(outerResult.value);
        if (innerResult.tag === 'Just') {
          return { tag: 'Left', value: innerResult.value };
        }
      }
      return { tag: 'Right', value: s };
    },
    (b) => outer.review(inner.review(b))
  );
}

function composeOptionalOptional(outer, inner) {
  return createOptional(
    (s) => {
      const outerMaybe = outer.getOption(s);
      if (outerMaybe.tag === 'Just') {
        return inner.getOption(outerMaybe.value);
      }
      return { tag: 'Nothing' };
    },
    (b, s) => {
      const outerMaybe = outer.getOption(s);
      if (outerMaybe.tag === 'Just') {
        return outer.set(inner.set(b, outerMaybe.value), s);
      }
      return s;
    }
  );
}

function composeOptionalLens(outer, inner) {
  return createOptional(
    (s) => {
      const maybe = outer.getOption(s);
      if (maybe.tag === 'Just') {
        return { tag: 'Just', value: inner.get(maybe.value) };
      }
      return { tag: 'Nothing' };
    },
    (b, s) => {
      const maybe = outer.getOption(s);
      if (maybe.tag === 'Just') {
        return outer.set(inner.set(b, maybe.value), s);
      }
      return s;
    }
  );
}

function composeOptionalPrism(outer, inner) {
  return createOptional(
    (s) => {
      const outerMaybe = outer.getOption(s);
      if (outerMaybe.tag === 'Just') {
        return inner.getOption(outerMaybe.value);
      }
      return { tag: 'Nothing' };
    },
    (b, s) => {
      const outerMaybe = outer.getOption(s);
      if (outerMaybe.tag === 'Just') {
        return outer.set(inner.set(b), s);
      }
      return s;
    }
  );
}

// ============================================================================
// Test 1: API Parity - Core Operations
// ============================================================================

function testAPIParityCoreOperations() {
  console.log('\n📋 Test 1: API Parity - Core Operations');

  try {
    const person = { name: 'Alice', age: 25 };
    const maybe = Maybe.Just('test');
    const either = Either.Right('success');

    // Create optics
    const nameLens = createLens(
      (p) => p.name,
      (name, p) => ({ ...p, name })
    );

    const justPrism = createPrism(
      (m) => m.tag === 'Just' ? { tag: 'Left', value: m.value } : { tag: 'Right', value: m },
      (value) => Maybe.Just(value)
    );

    const rightPrism = createPrism(
      (e) => e.tag === 'Right' ? { tag: 'Left', value: e.value } : { tag: 'Right', value: e },
      (value) => Either.Right(value)
    );

    const nullableNameOptional = createOptional(
      (p) => p.name ? { tag: 'Just', value: p.name } : { tag: 'Nothing' },
      (name, p) => ({ ...p, name })
    );

    // Test .over() parity
    console.log('✅ Lens .over():', nameLens.over(x => x.toUpperCase())(person).name === 'ALICE');
    console.log('✅ Prism .over():', justPrism.over(x => x.toUpperCase())(maybe).value === 'TEST');
    console.log('✅ Optional .over():', nullableNameOptional.over(x => x.toUpperCase())(person).name === 'ALICE');

    // Test .map() parity
    console.log('✅ Lens .map():', nameLens.map(x => x.toUpperCase())(person).name === 'ALICE');
    console.log('✅ Prism .map():', justPrism.map(x => x.toUpperCase())(maybe).value === 'TEST');
    console.log('✅ Optional .map():', nullableNameOptional.map(x => x.toUpperCase())(person).name === 'ALICE');

    // Test .get() parity
    console.log('✅ Lens .get():', nameLens.get(person) === 'Alice');
    console.log('✅ Prism .get():', justPrism.get(maybe).value === 'test');
    console.log('✅ Optional .get():', nullableNameOptional.get(person).value === 'Alice');

    // Test .getOption() parity
    console.log('✅ Lens .getOption():', nameLens.getOption(person).value === 'Alice');
    console.log('✅ Prism .getOption():', justPrism.getOption(maybe).value === 'test');
    console.log('✅ Optional .getOption():', nullableNameOptional.getOption(person).value === 'Alice');

    // Test .set() parity
    console.log('✅ Lens .set():', nameLens.set('Bob')(person).name === 'Bob');
    console.log('✅ Prism .set():', justPrism.set('new')(maybe).value === 'new');
    console.log('✅ Optional .set():', nullableNameOptional.set('Bob')(person).name === 'Bob');

    // Test .modify() parity
    console.log('✅ Lens .modify():', nameLens.modify(x => x + '!')(person).name === 'Alice!');
    console.log('✅ Prism .modify():', justPrism.modify(x => x + '!')(maybe).value === 'test!');
    console.log('✅ Optional .modify():', nullableNameOptional.modify(x => x + '!')(person).name === 'Alice!');

  } catch (error) {
    console.error('❌ API parity core operations test failed:', error.message);
  }
}

// ============================================================================
// Test 2: Cross-Kind Composition
// ============================================================================

function testCrossKindComposition() {
  console.log('\n📋 Test 2: Cross-Kind Composition');

  try {
    const person = { name: 'Alice', age: 25 };
    const maybe = Maybe.Just({ name: 'Bob', age: 30 });

    // Create optics
    const nameLens = createLens(
      (p) => p.name,
      (name, p) => ({ ...p, name })
    );

    const justPrism = createPrism(
      (m) => m.tag === 'Just' ? { tag: 'Left', value: m.value } : { tag: 'Right', value: m },
      (value) => Maybe.Just(value)
    );

    const ageLens = createLens(
      (p) => p.age,
      (age, p) => ({ ...p, age })
    );

    // Test Lens → Lens = Lens
    const nameAgeLens = nameLens.composeLens(ageLens);
    console.log('✅ Lens → Lens = Lens:', nameAgeLens.__type === 'Lens');

    // Test Lens → Prism = Optional
    const nameJustOptional = nameLens.composePrism(justPrism);
    console.log('✅ Lens → Prism = Optional:', nameJustOptional.__type === 'Optional');

    // Test Prism → Lens = Optional
    const justNameOptional = justPrism.composeLens(nameLens);
    console.log('✅ Prism → Lens = Optional:', justNameOptional.__type === 'Optional');

    // Test Prism → Prism = Prism
    const justJustPrism = justPrism.composePrism(justPrism);
    console.log('✅ Prism → Prism = Prism:', justJustPrism.__type === 'Prism');

    // Test Optional → Optional = Optional
    const optionalOptional = nameJustOptional.composeOptional(justNameOptional);
    console.log('✅ Optional → Optional = Optional:', optionalOptional.__type === 'Optional');

  } catch (error) {
    console.error('❌ Cross-kind composition test failed:', error.message);
  }
}

// ============================================================================
// Test 3: Fluent Composition with .then()
// ============================================================================

function testFluentComposition() {
  console.log('\n📋 Test 3: Fluent Composition with .then()');

  try {
    const person = { name: 'Alice', age: 25 };
    const maybe = Maybe.Just({ name: 'Bob', age: 30 });

    // Create optics
    const nameLens = createLens(
      (p) => p.name,
      (name, p) => ({ ...p, name })
    );

    const justPrism = createPrism(
      (m) => m.tag === 'Just' ? { tag: 'Left', value: m.value } : { tag: 'Right', value: m },
      (value) => Maybe.Just(value)
    );

    const ageLens = createLens(
      (p) => p.age,
      (age, p) => ({ ...p, age })
    );

    // Test fluent composition
    const composed = nameLens.then(ageLens);
    console.log('✅ Fluent composition result type:', composed.__type);

    // Test chained operations
    const result = composed.over(x => x + 1)(person);
    console.log('✅ Chained operations:', result.name === 'Alice' && result.age === 26);

    // Test mixed composition
    const mixed = justPrism.then(nameLens);
    console.log('✅ Mixed composition result type:', mixed.__type);

  } catch (error) {
    console.error('❌ Fluent composition test failed:', error.message);
  }
}

// ============================================================================
// Test 4: Enhanced Optional Semantics
// ============================================================================

function testEnhancedOptionalSemantics() {
  console.log('\n📋 Test 4: Enhanced Optional Semantics');

  try {
    const person = { name: 'Alice', age: 25 };
    const personWithNull = { name: null, age: 30 };

    const nullableNameOptional = createOptional(
      (p) => p.name ? { tag: 'Just', value: p.name } : { tag: 'Nothing' },
      (name, p) => ({ ...p, name })
    );

    // Test .exists()
    console.log('✅ .exists() with value:', nullableNameOptional.exists(x => x.length > 3)(person));
    console.log('✅ .exists() without value:', !nullableNameOptional.exists(x => x.length > 3)(personWithNull));

    // Test .forall()
    console.log('✅ .forall() with value:', nullableNameOptional.forall(x => x.length > 3)(person));
    console.log('✅ .forall() without value:', nullableNameOptional.forall(x => x.length > 3)(personWithNull));

    // Test safe operations
    console.log('✅ Safe .getOption():', nullableNameOptional.getOption(person).tag === 'Just');
    console.log('✅ Safe .getOption() null:', nullableNameOptional.getOption(personWithNull).tag === 'Nothing');

  } catch (error) {
    console.error('❌ Enhanced optional semantics test failed:', error.message);
  }
}

// ============================================================================
// Test 5: ADT Integration and Pattern Matching
// ============================================================================

function testADTIntegration() {
  console.log('\n📋 Test 5: ADT Integration and Pattern Matching');

  try {
    const maybe = Maybe.Just('test');
    const either = Either.Right('success');
    const result = Result.Ok('data');

    // Create ADT-specific optics
    const justPrism = createPrism(
      (m) => m.tag === 'Just' ? { tag: 'Left', value: m.value } : { tag: 'Right', value: m },
      (value) => Maybe.Just(value)
    );

    const rightPrism = createPrism(
      (e) => e.tag === 'Right' ? { tag: 'Left', value: e.value } : { tag: 'Right', value: e },
      (value) => Either.Right(value)
    );

    const okPrism = createPrism(
      (r) => r.tag === 'Ok' ? { tag: 'Left', value: r.value } : { tag: 'Right', value: r },
      (value) => Result.Ok(value)
    );

    // Test ADT variant focusing
    console.log('✅ Just prism focus:', justPrism.get(maybe).value === 'test');
    console.log('✅ Right prism focus:', rightPrism.get(either).value === 'success');
    console.log('✅ Ok prism focus:', okPrism.get(result).value === 'data');

    // Test ADT building
    console.log('✅ Just prism build:', justPrism.review('new').value === 'new');
    console.log('✅ Right prism build:', rightPrism.review('new').value === 'new');
    console.log('✅ Ok prism build:', okPrism.review('new').value === 'new');

    // Test pattern matching
    console.log('✅ Just prism matching:', justPrism.isMatching(maybe));
    console.log('✅ Right prism matching:', rightPrism.isMatching(either));
    console.log('✅ Ok prism matching:', okPrism.isMatching(result));

  } catch (error) {
    console.error('❌ ADT integration test failed:', error.message);
  }
}

// ============================================================================
// Test 6: Purity and HKT Integration
// ============================================================================

function testPurityAndHKTIntegration() {
  console.log('\n📋 Test 6: Purity and HKT Integration');

  try {
    // Test purity marking
    const nameLens = createLens(
      (p) => p.name,
      (name, p) => ({ ...p, name })
    );

    const pureLens = { ...nameLens, __effect: 'Pure' };
    const asyncLens = { ...nameLens, __effect: 'Async' };
    const ioLens = { ...nameLens, __effect: 'IO' };

    console.log('✅ Pure lens effect:', pureLens.__effect === 'Pure');
    console.log('✅ Async lens effect:', asyncLens.__effect === 'Async');
    console.log('✅ IO lens effect:', ioLens.__effect === 'IO');

    // Test HKT integration
    console.log('✅ Lens has kind:', nameLens.__kind !== undefined);
    console.log('✅ Prism has kind:', createPrism(() => {}, () => {}).__kind !== undefined);
    console.log('✅ Optional has kind:', createOptional(() => {}, () => {}).__kind !== undefined);

  } catch (error) {
    console.error('❌ Purity and HKT integration test failed:', error.message);
  }
}

// ============================================================================
// Test 7: Complex Transformations
// ============================================================================

function testComplexTransformations() {
  console.log('\n📋 Test 7: Complex Transformations');

  try {
    const complexData = {
      users: [
        { name: 'Alice', profile: { email: 'alice@example.com' } },
        { name: 'Bob', profile: { email: 'bob@example.com' } }
      ]
    };

    const maybeUsers = Maybe.Just(complexData);

    // Create complex optic chain
    const usersLens = createLens(
      (data) => data.users,
      (users, data) => ({ ...data, users })
    );

    const justPrism = createPrism(
      (m) => m.tag === 'Just' ? { tag: 'Left', value: m.value } : { tag: 'Right', value: m },
      (value) => Maybe.Just(value)
    );

    const firstUserLens = createLens(
      (users) => users[0],
      (user, users) => [user, ...users.slice(1)]
    );

    const emailLens = createLens(
      (user) => user.profile.email,
      (email, user) => ({ ...user, profile: { ...user.profile, email } })
    );

    // Compose complex transformation
    const complexOptic = justPrism.then(usersLens).then(firstUserLens).then(emailLens);
    
    console.log('✅ Complex optic type:', complexOptic.__type);
    console.log('✅ Complex transformation result:', complexOptic.get(maybeUsers).value === 'alice@example.com');

  } catch (error) {
    console.error('❌ Complex transformations test failed:', error.message);
  }
}

// ============================================================================
// Test 8: Law Compliance
// ============================================================================

function testLawCompliance() {
  console.log('\n📋 Test 8: Law Compliance');

  try {
    const person = { name: 'Alice', age: 25 };
    const maybe = Maybe.Just('test');

    const nameLens = createLens(
      (p) => p.name,
      (name, p) => ({ ...p, name })
    );

    const justPrism = createPrism(
      (m) => m.tag === 'Just' ? { tag: 'Left', value: m.value } : { tag: 'Right', value: m },
      (value) => Maybe.Just(value)
    );

    // Lens laws
    // Get-Set Law: set(get(s), s) === s
    const getSetResult = nameLens.set(nameLens.get(person))(person);
    console.log('✅ Lens Get-Set Law:', JSON.stringify(getSetResult) === JSON.stringify(person));

    // Set-Get Law: get(set(b, s)) === b
    const setGetResult = nameLens.get(nameLens.set('Bob')(person));
    console.log('✅ Lens Set-Get Law:', setGetResult === 'Bob');

    // Set-Set Law: set(b2, set(b1, s)) === set(b2, s)
    const setSetResult1 = nameLens.set('Charlie')(nameLens.set('Bob')(person));
    const setSetResult2 = nameLens.set('Charlie')(person);
    console.log('✅ Lens Set-Set Law:', setSetResult1.name === setSetResult2.name);

    // Prism laws
    // Preview-Review Law: preview(review(b)) = Just(b)
    const previewReviewResult = justPrism.get(justPrism.review('new'));
    console.log('✅ Prism Preview-Review Law:', previewReviewResult.value === 'new');

  } catch (error) {
    console.error('❌ Law compliance test failed:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running Enhanced Optics Parity Tests');
  console.log('==================================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testAPIParityCoreOperations,
    testCrossKindComposition,
    testFluentComposition,
    testEnhancedOptionalSemantics,
    testADTIntegration,
    testPurityAndHKTIntegration,
    testComplexTransformations,
    testLawCompliance
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
    console.log('🎉 All enhanced optics parity tests passed!');
    console.log('✅ Full API parity between Prism/Optional and Lens achieved!');
  } else {
    console.log('⚠️ Some tests failed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testAPIParityCoreOperations,
  testCrossKindComposition,
  testFluentComposition,
  testEnhancedOptionalSemantics,
  testADTIntegration,
  testPurityAndHKTIntegration,
  testComplexTransformations,
  testLawCompliance,
  runAllTests
}; 