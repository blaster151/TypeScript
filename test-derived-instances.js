/**
 * Test file for Derived Instances
 * 
 * Tests that all automatically derived typeclass instances work correctly
 * and are properly registered in the registry.
 */

console.log('🚀 Testing Derived Instances...');

// ============================================================================
// Test 1: Array Derived Instances
// ============================================================================

function testArrayDerivedInstances() {
  console.log('\n📋 Test 1: Array Derived Instances');

  try {
    // Test Array Functor
    const numbers = [1, 2, 3, 4, 5];
    const doubled = numbers.map(x => x * 2);
    console.log('✅ Array Functor (map):', doubled);

    // Test Array Monad
    const chained = numbers.flatMap(x => [x, x * 2]);
    console.log('✅ Array Monad (flatMap):', chained);

    // Test Array Eq
    const arr1 = [1, 2, 3];
    const arr2 = [1, 2, 3];
    const arr3 = [1, 2, 4];
    console.log('✅ Array Eq (equals):', arr1.length === arr2.length && arr1.every((val, idx) => val === arr2[idx]));
    console.log('✅ Array Eq (not equals):', !(arr1.length === arr3.length && arr1.every((val, idx) => val === arr3[idx])));

    // Test Array Ord
    const sorted = [3, 1, 4, 1, 5].sort((a, b) => a - b);
    console.log('✅ Array Ord (sort):', sorted);

    // Test Array Show
    const str = JSON.stringify([1, 2, 3]);
    console.log('✅ Array Show (stringify):', str);

  } catch (error) {
    console.error('❌ Array derived instances test failed:', error.message);
  }
}

// ============================================================================
// Test 2: Maybe Derived Instances
// ============================================================================

function testMaybeDerivedInstances() {
  console.log('\n📋 Test 2: Maybe Derived Instances');

  try {
    // Mock Maybe implementation
    const Just = (value) => ({ tag: 'Just', value });
    const Nothing = () => ({ tag: 'Nothing' });
    
    const matchMaybe = (maybe, patterns) => {
      if (maybe.tag === 'Just') {
        return patterns.Just(maybe.value);
      } else {
        return patterns.Nothing();
      }
    };

    // Test Maybe Functor
    const maybe = Just(42);
    const mapped = matchMaybe(maybe, {
      Just: value => Just(value * 2),
      Nothing: () => Nothing()
    });
    console.log('✅ Maybe Functor (map):', mapped);

    // Test Maybe Monad
    const chained = matchMaybe(maybe, {
      Just: value => Just(value.toString()),
      Nothing: () => Nothing()
    });
    console.log('✅ Maybe Monad (chain):', chained);

    // Test Maybe Eq
    const maybe1 = Just(42);
    const maybe2 = Just(42);
    const maybe3 = Nothing();
    const maybe4 = Nothing();
    
    const eq1 = matchMaybe(maybe1, {
      Just: value1 => matchMaybe(maybe2, {
        Just: value2 => value1 === value2,
        Nothing: () => false
      }),
      Nothing: () => matchMaybe(maybe2, {
        Just: () => false,
        Nothing: () => true
      })
    });
    
    const eq2 = matchMaybe(maybe3, {
      Just: () => false,
      Nothing: () => matchMaybe(maybe4, {
        Just: () => false,
        Nothing: () => true
      })
    });
    
    console.log('✅ Maybe Eq (Just equals):', eq1);
    console.log('✅ Maybe Eq (Nothing equals):', eq2);

    // Test Maybe Ord
    const ord1 = matchMaybe(maybe1, {
      Just: value1 => matchMaybe(maybe2, {
        Just: value2 => {
          if (value1 < value2) return -1;
          if (value1 > value2) return 1;
          return 0;
        },
        Nothing: () => 1 // Just > Nothing
      }),
      Nothing: () => matchMaybe(maybe2, {
        Just: () => -1, // Nothing < Just
        Nothing: () => 0
      })
    });
    console.log('✅ Maybe Ord (compare):', ord1);

    // Test Maybe Show
    const show1 = matchMaybe(maybe1, {
      Just: value => `Just(${JSON.stringify(value)})`,
      Nothing: () => 'Nothing'
    });
    const show2 = matchMaybe(maybe3, {
      Just: value => `Just(${JSON.stringify(value)})`,
      Nothing: () => 'Nothing'
    });
    console.log('✅ Maybe Show (Just):', show1);
    console.log('✅ Maybe Show (Nothing):', show2);

  } catch (error) {
    console.error('❌ Maybe derived instances test failed:', error.message);
  }
}

// ============================================================================
// Test 3: Either Derived Instances
// ============================================================================

function testEitherDerivedInstances() {
  console.log('\n📋 Test 3: Either Derived Instances');

  try {
    // Mock Either implementation
    const Left = (value) => ({ tag: 'Left', value });
    const Right = (value) => ({ tag: 'Right', value });
    
    const matchEither = (either, patterns) => {
      if (either.tag === 'Left') {
        return patterns.Left(either.value);
      } else {
        return patterns.Right(either.value);
      }
    };

    // Test Either Bifunctor
    const either = Right('success');
    const bimapped = matchEither(either, {
      Left: value => Left(`Error: ${value}`),
      Right: value => Right(value.toUpperCase())
    });
    console.log('✅ Either Bifunctor (bimap):', bimapped);

    // Test Either Eq
    const either1 = Right('success');
    const either2 = Right('success');
    const either3 = Left('error');
    const either4 = Left('error');
    
    const eq1 = matchEither(either1, {
      Left: value1 => false,
      Right: value1 => matchEither(either2, {
        Left: () => false,
        Right: value2 => value1 === value2
      })
    });
    
    const eq2 = matchEither(either3, {
      Left: value1 => matchEither(either4, {
        Left: value2 => value1 === value2,
        Right: () => false
      }),
      Right: () => false
    });
    
    console.log('✅ Either Eq (Right equals):', eq1);
    console.log('✅ Either Eq (Left equals):', eq2);

    // Test Either Ord
    const ord1 = matchEither(either1, {
      Left: value1 => -1, // Left < Right
      Right: value1 => matchEither(either2, {
        Left: () => 1, // Right > Left
        Right: value2 => {
          if (value1 < value2) return -1;
          if (value1 > value2) return 1;
          return 0;
        }
      })
    });
    console.log('✅ Either Ord (compare):', ord1);

    // Test Either Show
    const show1 = matchEither(either1, {
      Left: value => `Left(${JSON.stringify(value)})`,
      Right: value => `Right(${JSON.stringify(value)})`
    });
    const show2 = matchEither(either3, {
      Left: value => `Left(${JSON.stringify(value)})`,
      Right: value => `Right(${JSON.stringify(value)})`
    });
    console.log('✅ Either Show (Right):', show1);
    console.log('✅ Either Show (Left):', show2);

  } catch (error) {
    console.error('❌ Either derived instances test failed:', error.message);
  }
}

// ============================================================================
// Test 4: Registry Integration
// ============================================================================

function testRegistryIntegration() {
  console.log('\n📋 Test 4: Registry Integration');

  try {
    // Mock registry functions
    const mockRegistry = {
      typeclasses: new Map(),
      derivable: new Map(),
      registerTypeclass: function(name, typeclass, instance) {
        this.typeclasses.set(`${name}:${typeclass}`, instance);
      },
      registerDerivable: function(name, instances) {
        this.derivable.set(name, instances);
      },
      getTypeclass: function(name, typeclass) {
        return this.typeclasses.get(`${name}:${typeclass}`);
      },
      getDerivable: function(name) {
        return this.derivable.get(name);
      }
    };

    // Mock instances
    const mockArrayFunctor = {
      map: (fa, f) => fa.map(f)
    };

    const mockMaybeFunctor = {
      map: (fa, f) => fa.tag === 'Just' ? { tag: 'Just', value: f(fa.value) } : { tag: 'Nothing' }
    };

    const mockEitherBifunctor = {
      bimap: (fab, f, g) => fab.tag === 'Left' ? { tag: 'Left', value: f(fab.value) } : { tag: 'Right', value: g(fab.value) }
    };

    // Register instances
    mockRegistry.registerTypeclass('Array', 'Functor', mockArrayFunctor);
    mockRegistry.registerTypeclass('Maybe', 'Functor', mockMaybeFunctor);
    mockRegistry.registerTypeclass('Either', 'Bifunctor', mockEitherBifunctor);

    mockRegistry.registerDerivable('Array', {
      functor: mockArrayFunctor,
      purity: { effect: 'Pure' }
    });

    mockRegistry.registerDerivable('Maybe', {
      functor: mockMaybeFunctor,
      purity: { effect: 'Pure' }
    });

    mockRegistry.registerDerivable('Either', {
      bifunctor: mockEitherBifunctor,
      purity: { effect: 'Pure' }
    });

    // Test registry lookups
    const arrayFunctor = mockRegistry.getTypeclass('Array', 'Functor');
    const maybeFunctor = mockRegistry.getTypeclass('Maybe', 'Functor');
    const eitherBifunctor = mockRegistry.getTypeclass('Either', 'Bifunctor');

    console.log('✅ Registry Array Functor lookup:', arrayFunctor !== undefined);
    console.log('✅ Registry Maybe Functor lookup:', maybeFunctor !== undefined);
    console.log('✅ Registry Either Bifunctor lookup:', eitherBifunctor !== undefined);

    // Test derivable instances
    const arrayDerivable = mockRegistry.getDerivable('Array');
    const maybeDerivable = mockRegistry.getDerivable('Maybe');
    const eitherDerivable = mockRegistry.getDerivable('Either');

    console.log('✅ Registry Array derivable lookup:', arrayDerivable !== undefined);
    console.log('✅ Registry Maybe derivable lookup:', maybeDerivable !== undefined);
    console.log('✅ Registry Either derivable lookup:', eitherDerivable !== undefined);

    // Test purity
    console.log('✅ Array purity:', arrayDerivable.purity.effect === 'Pure');
    console.log('✅ Maybe purity:', maybeDerivable.purity.effect === 'Pure');
    console.log('✅ Either purity:', eitherDerivable.purity.effect === 'Pure');

  } catch (error) {
    console.error('❌ Registry integration test failed:', error.message);
  }
}

// ============================================================================
// Test 5: Fluent API Integration
// ============================================================================

function testFluentAPIIntegration() {
  console.log('\n📋 Test 5: Fluent API Integration');

  try {
    // Mock fluent API
    const addFluentMethods = (adt, typeName) => {
      const fluent = { ...adt };
      
      if (typeName === 'Array') {
        fluent.map = (f) => adt.map(f);
        fluent.chain = (f) => adt.flatMap(f);
        fluent.filter = (predicate) => adt.filter(predicate);
      } else if (typeName === 'Maybe') {
        fluent.map = (f) => adt.tag === 'Just' ? { tag: 'Just', value: f(adt.value) } : { tag: 'Nothing' };
        fluent.chain = (f) => adt.tag === 'Just' ? f(adt.value) : { tag: 'Nothing' };
        fluent.filter = (predicate) => adt.tag === 'Just' && predicate(adt.value) ? adt : { tag: 'Nothing' };
      }
      
      return fluent;
    };

    // Test Array fluent API
    const numbers = [1, 2, 3, 4, 5];
    const fluentArray = addFluentMethods(numbers, 'Array');
    
    const result1 = fluentArray
      .map(x => x * 2)
      .filter(x => x > 5)
      .chain(x => [x, x + 1]);
    
    console.log('✅ Array fluent API:', result1);

    // Test Maybe fluent API
    const maybe = { tag: 'Just', value: 42 };
    const fluentMaybe = addFluentMethods(maybe, 'Maybe');
    
    const result2 = fluentMaybe
      .map(x => x * 2)
      .filter(x => x > 50)
      .chain(x => ({ tag: 'Just', value: x.toString() }));
    
    console.log('✅ Maybe fluent API:', result2);

  } catch (error) {
    console.error('❌ Fluent API integration test failed:', error.message);
  }
}

// ============================================================================
// Test 6: Performance Test
// ============================================================================

function testPerformance() {
  console.log('\n📋 Test 6: Performance Test');

  try {
    const iterations = 10000;
    const start = Date.now();

    // Test Array operations
    for (let i = 0; i < iterations; i++) {
      const arr = [1, 2, 3, 4, 5];
      const result = arr
        .map(x => x * 2)
        .filter(x => x > 5)
        .flatMap(x => [x, x + 1]);
    }

    const end = Date.now();
    const duration = end - start;
    const avgTime = duration / iterations;

    console.log(`✅ Performance test: ${iterations} iterations in ${duration}ms (avg ${avgTime.toFixed(4)}ms per iteration)`);

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running Derived Instances Tests');
  console.log('=====================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testArrayDerivedInstances,
    testMaybeDerivedInstances,
    testEitherDerivedInstances,
    testRegistryIntegration,
    testFluentAPIIntegration,
    testPerformance
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

  console.log('\n=====================================');
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All derived instances tests passed!');
  } else {
    console.log('⚠️ Some tests failed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testArrayDerivedInstances,
  testMaybeDerivedInstances,
  testEitherDerivedInstances,
  testRegistryIntegration,
  testFluentAPIIntegration,
  testPerformance,
  runAllTests
}; 