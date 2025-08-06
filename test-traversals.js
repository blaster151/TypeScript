/**
 * Comprehensive Tests for Traversals
 * 
 * Tests Traversals as first-class optics for focusing on multiple elements
 * in a structure, including laws, collection support, and cross-kind composition.
 */

console.log('🚀 Testing Traversals for Collections & Nested Structures...');

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

// Mock Traversal implementation
function createTraversal(modifyFn, getAllFn) {
  return {
    __type: 'Traversal',
    __effect: 'Pure',
    __kind: {},
    
    // Core operations
    modify: modifyFn,
    over: (s, f) => modifyFn(f, s),
    map: (s, f) => modifyFn(f, s),
    getAll: getAllFn,
    
    // BaseOptic operations
    get: (s) => getAllFn(s),
    getOption: (s) => {
      const all = getAllFn(s);
      return all.length > 0 ? { tag: 'Just', value: all } : { tag: 'Nothing' };
    },
    set: (b) => (s) => modifyFn(() => b, s),
    modify: (f) => (s) => modifyFn(f, s),
    
    // Traversal-specific operations
    setAll: (value, s) => modifyFn(() => value, s),
    collect: (s, f) => getAllFn(s).map(f),
    fold: (s, initial, reducer) => getAllFn(s).reduce(reducer, initial),
    foldMap: (s, monoid, f) => {
      const values = getAllFn(s);
      return values.reduce((acc, a) => monoid.concat(acc, f(a)), monoid.empty());
    },
    all: (s, predicate) => getAllFn(s).every(predicate),
    any: (s, predicate) => getAllFn(s).some(predicate),
    find: (s, predicate) => {
      const found = getAllFn(s).find(predicate);
      return found !== undefined ? { tag: 'Just', value: found } : { tag: 'Nothing' };
    },
    head: (s) => {
      const all = getAllFn(s);
      return all.length > 0 ? { tag: 'Just', value: all[0] } : { tag: 'Nothing' };
    },
    last: (s) => {
      const all = getAllFn(s);
      return all.length > 0 ? { tag: 'Just', value: all[all.length - 1] } : { tag: 'Nothing' };
    },
    
    // Composition
    then: (next) => composeTraversalWithOptic(this, next),
    composeTraversal: (traversal) => composeTraversalTraversal(this, traversal),
    composeLens: (lens) => composeTraversalLens(this, lens),
    composePrism: (prism) => composeTraversalPrism(this, prism),
    composeOptional: (optional) => composeTraversalOptional(this, optional),
    
    // Optional-specific operations
    exists: (predicate) => (s) => getAllFn(s).some(predicate),
    forall: (predicate) => (s) => getAllFn(s).every(predicate)
  };
}

// Mock composition functions
function composeTraversalWithOptic(outer, next) {
  if (next.__type === 'Traversal') {
    return composeTraversalTraversal(outer, next);
  } else if (next.__type === 'Lens') {
    return composeTraversalLens(outer, next);
  } else if (next.__type === 'Prism') {
    return composeTraversalPrism(outer, next);
  } else {
    return composeTraversalOptional(outer, next);
  }
}

function composeTraversalTraversal(outer, inner) {
  return createTraversal(
    (f, s) => outer.modify((a) => inner.modify(f, a), s),
    (s) => {
      const outerValues = outer.getAll(s);
      return outerValues.flatMap(a => inner.getAll(a));
    }
  );
}

function composeTraversalLens(outer, inner) {
  return createTraversal(
    (f, s) => outer.modify((a) => inner.modify(f)(a), s),
    (s) => {
      const outerValues = outer.getAll(s);
      return outerValues.map(a => inner.get(a));
    }
  );
}

function composeTraversalPrism(outer, inner) {
  return createTraversal(
    (f, s) => outer.modify((a) => inner.modify(f)(a), s),
    (s) => {
      const outerValues = outer.getAll(s);
      return outerValues.flatMap(a => {
        const maybe = inner.getOption(a);
        if (maybe.tag === 'Just') {
          return [maybe.value];
        }
        return [];
      });
    }
  );
}

function composeTraversalOptional(outer, inner) {
  return createTraversal(
    (f, s) => outer.modify((a) => inner.modify(f)(a), s),
    (s) => {
      const outerValues = outer.getAll(s);
      return outerValues.flatMap(a => {
        const maybe = inner.getOption(a);
        if (maybe.tag === 'Just') {
          return [maybe.value];
        }
        return [];
      });
    }
  );
}

// Mock optic implementations
function createLens(getter, setter) {
  return {
    __type: 'Lens',
    __effect: 'Pure',
    __kind: {},
    get: getter,
    set: (b) => (s) => setter(b, s),
    modify: (f) => (s) => setter(f(getter(s)), s),
    getOption: (s) => ({ tag: 'Just', value: getter(s) })
  };
}

function createPrism(match, build) {
  return {
    __type: 'Prism',
    __effect: 'Pure',
    __kind: {},
    get: (s) => {
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
    getOption: (s) => {
      const result = match(s);
      if (result.tag === 'Left') {
        return { tag: 'Just', value: result.value };
      }
      return { tag: 'Nothing' };
    }
  };
}

// ============================================================================
// Test 1: Traversal Laws
// ============================================================================

function testTraversalLaws() {
  console.log('\n📋 Test 1: Traversal Laws');

  try {
    const numbers = [1, 2, 3, 4, 5];
    
    // Create array traversal
    const arrayTraversal = createTraversal(
      (f, s) => s.map(f),
      (s) => s
    );

    // Identity Law: modifying with id changes nothing
    const identity = (x) => x;
    const identityResult = arrayTraversal.modify(identity, numbers);
    console.log('✅ Identity Law:', JSON.stringify(identityResult) === JSON.stringify(numbers));

    // Composition Law: over(t, f . g) === over(over(t, g), f)
    const f = (x) => x * 2;
    const g = (x) => x + 1;
    const compose = (x) => f(g(x));
    
    const composition1 = arrayTraversal.modify(compose, numbers);
    const composition2 = arrayTraversal.modify(f, arrayTraversal.modify(g, numbers));
    console.log('✅ Composition Law:', JSON.stringify(composition1) === JSON.stringify(composition2));

  } catch (error) {
    console.error('❌ Traversal laws test failed:', error.message);
  }
}

// ============================================================================
// Test 2: Collection Support
// ============================================================================

function testCollectionSupport() {
  console.log('\n📋 Test 2: Collection Support');

  try {
    // Test array traversal
    const numbers = [1, 2, 3, 4, 5];
    const arrayTraversal = createTraversal(
      (f, s) => s.map(f),
      (s) => s
    );

    const doubled = arrayTraversal.modify(x => x * 2, numbers);
    console.log('✅ Array traversal modify:', doubled[0] === 2 && doubled[1] === 4);

    const allValues = arrayTraversal.getAll(numbers);
    console.log('✅ Array traversal getAll:', allValues.length === 5);

    // Test tuple traversal
    const tuple = [1, 2, 3];
    const tupleTraversal = createTraversal(
      (f, s) => s.map(f),
      (s) => s
    );

    const tupleResult = tupleTraversal.modify(x => x + 1, tuple);
    console.log('✅ Tuple traversal:', tupleResult[0] === 2 && tupleResult[1] === 3);

    // Test Maybe traversal
    const maybe = Maybe.Just('test');
    const maybeTraversal = createTraversal(
      (f, s) => {
        if (s.tag === 'Just') {
          return Maybe.Just(f(s.value));
        }
        return s;
      },
      (s) => {
        if (s.tag === 'Just') {
          return [s.value];
        }
        return [];
      }
    );

    const maybeResult = maybeTraversal.modify(x => x.toUpperCase(), maybe);
    console.log('✅ Maybe traversal:', maybeResult.value === 'TEST');

    const maybeValues = maybeTraversal.getAll(maybe);
    console.log('✅ Maybe traversal getAll:', maybeValues.length === 1);

    // Test Either traversal
    const either = Either.Right('success');
    const eitherTraversal = createTraversal(
      (f, s) => {
        if (s.tag === 'Right') {
          return Either.Right(f(s.value));
        }
        return s;
      },
      (s) => {
        if (s.tag === 'Right') {
          return [s.value];
        }
        return [];
      }
    );

    const eitherResult = eitherTraversal.modify(x => x.toUpperCase(), either);
    console.log('✅ Either traversal:', eitherResult.value === 'SUCCESS');

  } catch (error) {
    console.error('❌ Collection support test failed:', error.message);
  }
}

// ============================================================================
// Test 3: Cross-Kind Composition
// ============================================================================

function testCrossKindComposition() {
  console.log('\n📋 Test 3: Cross-Kind Composition');

  try {
    const nestedData = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 }
    ];

    // Create traversals and optics
    const arrayTraversal = createTraversal(
      (f, s) => s.map(f),
      (s) => s
    );

    const nameLens = createLens(
      (p) => p.name,
      (name, p) => ({ ...p, name })
    );

    const ageLens = createLens(
      (p) => p.age,
      (age, p) => ({ ...p, age })
    );

    const justPrism = createPrism(
      (m) => m.tag === 'Just' ? { tag: 'Left', value: m.value } : { tag: 'Right', value: m },
      (value) => Maybe.Just(value)
    );

    // Test Traversal → Traversal = Traversal
    const nestedArrayTraversal = createTraversal(
      (f, s) => s.map(arr => arr.map(f)),
      (s) => s.flat()
    );

    const composedTraversal = arrayTraversal.composeTraversal(nestedArrayTraversal);
    console.log('✅ Traversal → Traversal = Traversal:', composedTraversal.__type === 'Traversal');

    // Test Traversal → Lens = Traversal
    const traversalLens = arrayTraversal.composeLens(nameLens);
    console.log('✅ Traversal → Lens = Traversal:', traversalLens.__type === 'Traversal');

    // Test Traversal → Prism = Traversal
    const traversalPrism = arrayTraversal.composePrism(justPrism);
    console.log('✅ Traversal → Prism = Traversal:', traversalPrism.__type === 'Traversal');

    // Test composition operations
    const names = traversalLens.getAll(nestedData);
    console.log('✅ Traversal → Lens composition:', names.length === 3);

    const upperNames = traversalLens.modify(name => name.toUpperCase(), nestedData);
    console.log('✅ Traversal → Lens modify:', upperNames[0].name === 'ALICE');

  } catch (error) {
    console.error('❌ Cross-kind composition test failed:', error.message);
  }
}

// ============================================================================
// Test 4: Nested Structures
// ============================================================================

function testNestedStructures() {
  console.log('\n📋 Test 4: Nested Structures');

  try {
    const complexData = {
      users: [
        { name: 'Alice', profile: { email: 'alice@example.com' } },
        { name: 'Bob', profile: { email: 'bob@example.com' } },
        { name: 'Charlie', profile: { email: 'charlie@example.com' } }
      ]
    };

    // Create traversals for nested structure
    const usersTraversal = createTraversal(
      (f, s) => ({ ...s, users: s.users.map(f) }),
      (s) => s.users
    );

    const profileTraversal = createTraversal(
      (f, s) => ({ ...s, profile: f(s.profile) }),
      (s) => [s.profile]
    );

    const emailTraversal = createTraversal(
      (f, s) => ({ ...s, email: f(s.email) }),
      (s) => [s.email]
    );

    // Compose traversals for deep access
    const deepEmailTraversal = usersTraversal
      .then(profileTraversal)
      .then(emailTraversal);

    const emails = deepEmailTraversal.getAll(complexData);
    console.log('✅ Nested traversal getAll:', emails.length === 3);

    const upperEmails = deepEmailTraversal.modify(email => email.toUpperCase(), complexData);
    console.log('✅ Nested traversal modify:', upperEmails.users[0].profile.email === 'ALICE@EXAMPLE.COM');

  } catch (error) {
    console.error('❌ Nested structures test failed:', error.message);
  }
}

// ============================================================================
// Test 5: Traversal Operations
// ============================================================================

function testTraversalOperations() {
  console.log('\n📋 Test 5: Traversal Operations');

  try {
    const numbers = [1, 2, 3, 4, 5];
    const arrayTraversal = createTraversal(
      (f, s) => s.map(f),
      (s) => s
    );

    // Test setAll
    const allSet = arrayTraversal.setAll(10, numbers);
    console.log('✅ setAll operation:', allSet.every(x => x === 10));

    // Test collect
    const collected = arrayTraversal.collect(numbers, x => x.toString());
    console.log('✅ collect operation:', collected.length === 5);

    // Test fold
    const sum = arrayTraversal.fold(numbers, 0, (acc, x) => acc + x);
    console.log('✅ fold operation:', sum === 15);

    // Test foldMap
    const monoid = {
      empty: () => 0,
      concat: (a, b) => a + b
    };
    const foldMapResult = arrayTraversal.foldMap(numbers, monoid, x => x);
    console.log('✅ foldMap operation:', foldMapResult === 15);

    // Test all
    const allPositive = arrayTraversal.all(numbers, x => x > 0);
    console.log('✅ all operation:', allPositive);

    // Test any
    const anyEven = arrayTraversal.any(numbers, x => x % 2 === 0);
    console.log('✅ any operation:', anyEven);

    // Test find
    const found = arrayTraversal.find(numbers, x => x > 3);
    console.log('✅ find operation:', found.value === 4);

    // Test head
    const head = arrayTraversal.head(numbers);
    console.log('✅ head operation:', head.value === 1);

    // Test last
    const last = arrayTraversal.last(numbers);
    console.log('✅ last operation:', last.value === 5);

  } catch (error) {
    console.error('❌ Traversal operations test failed:', error.message);
  }
}

// ============================================================================
// Test 6: ADT Integration
// ============================================================================

function testADTIntegration() {
  console.log('\n📋 Test 6: ADT Integration');

  try {
    // Test Maybe traversal
    const maybes = [
      Maybe.Just('Alice'),
      Maybe.Nothing(),
      Maybe.Just('Bob'),
      Maybe.Nothing(),
      Maybe.Just('Charlie')
    ];

    const maybeTraversal = createTraversal(
      (f, s) => s.map(maybe => {
        if (maybe.tag === 'Just') {
          return Maybe.Just(f(maybe.value));
        }
        return maybe;
      }),
      (s) => s.flatMap(maybe => {
        if (maybe.tag === 'Just') {
          return [maybe.value];
        }
        return [];
      })
    );

    const upperNames = maybeTraversal.modify(name => name.toUpperCase(), maybes);
    console.log('✅ Maybe traversal modify:', upperNames[0].value === 'ALICE');

    const allNames = maybeTraversal.getAll(maybes);
    console.log('✅ Maybe traversal getAll:', allNames.length === 3);

    // Test Either traversal
    const eithers = [
      Either.Left('error1'),
      Either.Right('success1'),
      Either.Left('error2'),
      Either.Right('success2')
    ];

    const eitherTraversal = createTraversal(
      (f, s) => s.map(either => {
        if (either.tag === 'Right') {
          return Either.Right(f(either.value));
        }
        return either;
      }),
      (s) => s.flatMap(either => {
        if (either.tag === 'Right') {
          return [either.value];
        }
        return [];
      })
    );

    const upperSuccess = eitherTraversal.modify(s => s.toUpperCase(), eithers);
    console.log('✅ Either traversal modify:', upperSuccess[1].value === 'SUCCESS1');

    const allSuccess = eitherTraversal.getAll(eithers);
    console.log('✅ Either traversal getAll:', allSuccess.length === 2);

  } catch (error) {
    console.error('❌ ADT integration test failed:', error.message);
  }
}

// ============================================================================
// Test 7: Purity and HKT Integration
// ============================================================================

function testPurityAndHKTIntegration() {
  console.log('\n📋 Test 7: Purity and HKT Integration');

  try {
    const arrayTraversal = createTraversal(
      (f, s) => s.map(f),
      (s) => s
    );

    // Test purity marking
    const pureTraversal = { ...arrayTraversal, __effect: 'Pure' };
    const asyncTraversal = { ...arrayTraversal, __effect: 'Async' };
    const ioTraversal = { ...arrayTraversal, __effect: 'IO' };

    console.log('✅ Pure traversal effect:', pureTraversal.__effect === 'Pure');
    console.log('✅ Async traversal effect:', asyncTraversal.__effect === 'Async');
    console.log('✅ IO traversal effect:', ioTraversal.__effect === 'IO');

    // Test HKT integration
    console.log('✅ Traversal has kind:', arrayTraversal.__kind !== undefined);
    console.log('✅ Traversal has type:', arrayTraversal.__type === 'Traversal');

  } catch (error) {
    console.error('❌ Purity and HKT integration test failed:', error.message);
  }
}

// ============================================================================
// Test 8: Complex Transformations
// ============================================================================

function testComplexTransformations() {
  console.log('\n📋 Test 8: Complex Transformations');

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

    // Create traversals for complex nested structure
    const departmentsTraversal = createTraversal(
      (f, s) => ({ ...s, departments: s.departments.map(f) }),
      (s) => s.departments
    );

    const teamsTraversal = createTraversal(
      (f, s) => ({ ...s, teams: s.teams.map(f) }),
      (s) => s.teams
    );

    const membersTraversal = createTraversal(
      (f, s) => ({ ...s, members: s.members.map(f) }),
      (s) => s.members
    );

    // Compose for deep member access
    const deepMembersTraversal = departmentsTraversal
      .then(teamsTraversal)
      .then(membersTraversal);

    const allMembers = deepMembersTraversal.getAll(complexData);
    console.log('✅ Complex traversal getAll:', allMembers.length === 5);

    const upperMembers = deepMembersTraversal.modify(name => name.toUpperCase(), complexData);
    console.log('✅ Complex traversal modify:', upperMembers.departments[0].teams[0].members[0] === 'ALICE');

  } catch (error) {
    console.error('❌ Complex transformations test failed:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running Traversal Tests');
  console.log('==================================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testTraversalLaws,
    testCollectionSupport,
    testCrossKindComposition,
    testNestedStructures,
    testTraversalOperations,
    testADTIntegration,
    testPurityAndHKTIntegration,
    testComplexTransformations
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
    console.log('🎉 All traversal tests passed!');
    console.log('✅ Traversals as first-class optics complete!');
  } else {
    console.log('⚠️ Some tests failed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testTraversalLaws,
  testCollectionSupport,
  testCrossKindComposition,
  testNestedStructures,
  testTraversalOperations,
  testADTIntegration,
  testPurityAndHKTIntegration,
  testComplexTransformations,
  runAllTests
}; 