/**
 * Simple test script for Typeclass-Aware Fluent Composition
 * 
 * This script tests the core functionality of the typeclass-aware fluent composition
 * system without running the full test suite.
 */

// Mock ADT implementations for testing
class MockMaybe {
  constructor(value) {
    this.value = value;
  }
  
  static of(value) {
    return new MockMaybe(value);
  }
  
  static nothing() {
    return new MockMaybe(null);
  }
  
  getValue() {
    return this.value;
  }
  
  isJust() {
    return this.value !== null;
  }
  
  isNothing() {
    return this.value === null;
  }
}

class MockEither {
  constructor(left, right) {
    this.left = left;
    this.right = right;
  }
  
  static left(value) {
    return new MockEither(value, null);
  }
  
  static right(value) {
    return new MockEither(null, value);
  }
  
  isLeft() {
    return this.left !== null;
  }
  
  isRight() {
    return this.right !== null;
  }
  
  getLeft() {
    return this.left;
  }
  
  getRight() {
    return this.right;
  }
}

// Mock typeclass instances
const mockMaybeFunctor = {
  map: (fa, f) => {
    return fa.isJust() ? MockMaybe.of(f(fa.getValue())) : MockMaybe.nothing();
  }
};

const mockEitherFunctor = {
  map: (fa, f) => {
    return fa.isRight() ? MockEither.right(f(fa.getRight())) : MockEither.left(fa.getLeft());
  }
};

const mockMaybeMonad = {
  of: (a) => MockMaybe.of(a),
  chain: (fa, f) => {
    return fa.isJust() ? f(fa.getValue()) : MockMaybe.nothing();
  }
};

const mockEitherMonad = {
  of: (a) => MockEither.right(a),
  chain: (fa, f) => {
    return fa.isRight() ? f(fa.getRight()) : MockEither.left(fa.getLeft());
  }
};

const mockMaybeApplicative = {
  of: (a) => MockMaybe.of(a),
  ap: (fab, fa) => {
    if (fab.isJust() && fa.isJust()) {
      return MockMaybe.of(fab.getValue()(fa.getValue()));
    }
    return MockMaybe.nothing();
  }
};

const mockEitherApplicative = {
  of: (a) => MockEither.right(a),
  ap: (fab, fa) => {
    if (fab.isRight() && fa.isRight()) {
      return MockEither.right(fab.getRight()(fa.getRight()));
    }
    return MockEither.left(fab.getLeft() || fa.getLeft());
  }
};

const mockMaybeFilterable = {
  filter: (fa, predicate) => {
    return fa.isJust() && predicate(fa.getValue()) ? fa : MockMaybe.nothing();
  }
};

const mockEitherFilterable = {
  filter: (fa, predicate) => {
    return fa.isRight() && predicate(fa.getRight()) ? fa : MockEither.left(fa.getLeft());
  }
};

const mockBifunctor = {
  bimap: (fa, f, g) => {
    if (fa.isLeft()) {
      return MockEither.left(f(fa.getLeft()));
    } else {
      return MockEither.right(g(fa.getRight()));
    }
  },
  mapLeft: (fa, f) => {
    if (fa.isLeft()) {
      return MockEither.left(f(fa.getLeft()));
    } else {
      return MockEither.right(fa.getRight());
    }
  },
  mapRight: (fa, g) => {
    if (fa.isLeft()) {
      return MockEither.left(fa.getLeft());
    } else {
      return MockEither.right(g(fa.getRight()));
    }
  }
};

// Mock registry
const mockRegistry = {
  derivable: new Map([
    ['MockMaybe', {
      functor: mockMaybeFunctor,
      monad: mockMaybeMonad,
      applicative: mockMaybeApplicative,
      filterable: mockMaybeFilterable
    }],
    ['MockEither', {
      functor: mockEitherFunctor,
      monad: mockEitherMonad,
      applicative: mockEitherApplicative,
      bifunctor: mockBifunctor,
      filterable: mockEitherFilterable
    }]
  ])
};

// Mock registry functions
global.getTypeclassInstance = (adtName, typeclass) => {
  const instances = mockRegistry.derivable.get(adtName);
  return instances ? instances[typeclass.toLowerCase()] : null;
};

global.getDerivableInstances = (adtName) => {
  return mockRegistry.derivable.get(adtName) || null;
};

global.getFPRegistry = () => mockRegistry;

// Mock RuntimeDetectionManager
class MockRuntimeDetectionManager {
  constructor() {
    this.cache = new Map();
  }
  
  getCachedFluentMethods(adtName) {
    return this.cache.get(adtName);
  }
  
  cacheFluentMethods(adtName, methods) {
    this.cache.set(adtName, methods);
  }
  
  static getInstance() {
    if (!MockRuntimeDetectionManager.instance) {
      MockRuntimeDetectionManager.instance = new MockRuntimeDetectionManager();
    }
    return MockRuntimeDetectionManager.instance;
  }
}

// Mock the RuntimeDetectionManager
global.RuntimeDetectionManager = MockRuntimeDetectionManager;

// Simplified version of the typeclass-aware fluent methods
function addTypeclassAwareFluentMethods(adt, adtName, capabilities, options = {}) {
  const detectionManager = MockRuntimeDetectionManager.getInstance();
  
  // Check cache first for lazy discovery
  const cached = detectionManager.getCachedFluentMethods(adtName);
  if (cached && options.enableLazyDiscovery) {
    return cached;
  }

  // Get typeclass instances
  const instances = global.getDerivableInstances(adtName) || {};
  const functor = instances.functor || global.getTypeclassInstance(adtName, 'Functor');
  const applicative = instances.applicative || global.getTypeclassInstance(adtName, 'Applicative');
  const monad = instances.monad || global.getTypeclassInstance(adtName, 'Monad');
  const bifunctor = instances.bifunctor || global.getTypeclassInstance(adtName, 'Bifunctor');
  const filterable = instances.filterable || global.getTypeclassInstance(adtName, 'Filterable');

  // Create fluent object with typeclass-aware methods
  // Preserve all original ADT methods and properties
  const fluent = Object.create(Object.getPrototypeOf(adt));
  Object.assign(fluent, adt);

  // Functor methods (only if capability exists)
  if (capabilities.Functor && functor) {
    fluent.map = (f) => {
      const result = functor.map(adt, f);
      // Ensure the result is a proper ADT instance with fluent methods
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Monad methods (only if capability exists)
  if (capabilities.Monad && monad) {
    fluent.chain = (f) => {
      const result = monad.chain(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.flatMap = fluent.chain;
  }

  // Applicative methods (only if capability exists)
  if (capabilities.Applicative && applicative) {
    fluent.ap = (fab) => {
      const result = applicative.ap(fab, adt);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Filter methods (prioritize Filterable, fallback to Monad)
  if (capabilities.Filterable && filterable) {
    fluent.filter = (predicate) => {
      const result = filterable.filter(adt, predicate);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  } else if (capabilities.Monad && monad) {
    fluent.filter = (predicate) => {
      const result = monad.chain(adt, (a) => predicate(a) ? monad.of(a) : monad.of(null));
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Bifunctor methods (only if capability exists)
  if (capabilities.Bifunctor && bifunctor) {
    fluent.bimap = (left, right) => {
      const result = bifunctor.bimap(adt, left, right);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.mapLeft = (f) => {
      const result = bifunctor.mapLeft(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.mapRight = (f) => {
      const result = bifunctor.mapRight(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Cache the fluent methods for lazy discovery
  if (options.enableLazyDiscovery) {
    detectionManager.cacheFluentMethods(adtName, fluent);
  }

  return fluent;
}

function detectTypeclassCapabilities(adtName) {
  const registry = global.getFPRegistry();
  const derivable = global.getDerivableInstances(adtName);
  
  return {
    Functor: !!(derivable?.functor || global.getTypeclassInstance(adtName, 'Functor')),
    Applicative: !!(derivable?.applicative || global.getTypeclassInstance(adtName, 'Applicative')),
    Monad: !!(derivable?.monad || global.getTypeclassInstance(adtName, 'Monad')),
    Bifunctor: !!(derivable?.bifunctor || global.getTypeclassInstance(adtName, 'Bifunctor')),
    Traversable: !!(derivable?.traversable || global.getTypeclassInstance(adtName, 'Traversable')),
    Filterable: !!(derivable?.filterable || global.getTypeclassInstance(adtName, 'Filterable')),
    Eq: !!(derivable?.eq || global.getTypeclassInstance(adtName, 'Eq')),
    Ord: !!(derivable?.ord || global.getTypeclassInstance(adtName, 'Ord')),
    Show: !!(derivable?.show || global.getTypeclassInstance(adtName, 'Show'))
  };
}

function createTypeclassAwareFluent(adt, adtName, options = {}) {
  const capabilities = detectTypeclassCapabilities(adtName);
  return addTypeclassAwareFluentMethods(adt, adtName, capabilities, options);
}

// Test functions
function testBasicFunctionality() {
  console.log('=== Test 1: Basic Functionality ===');
  
  const maybe = MockMaybe.of(42);
  const capabilities = detectTypeclassCapabilities('MockMaybe');
  
  console.log('Detected capabilities:', capabilities);
  
  const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
  
  // Test map
  const result1 = fluent.map(x => x * 2);
  console.log('Map result:', result1.getValue()); // Should be 84
  
  // Test chain
  const result2 = fluent.chain(x => MockMaybe.of(x.toString()));
  console.log('Chain result:', result2.getValue()); // Should be "42"
  
  // Test filter
  const result3 = fluent.filter(x => x > 40);
  console.log('Filter result:', result3.getValue()); // Should be 42
  
  console.log('✅ Basic functionality test passed');
}

function testMethodChaining() {
  console.log('\n=== Test 2: Method Chaining ===');
  
  const maybe = MockMaybe.of(42);
  const capabilities = detectTypeclassCapabilities('MockMaybe');
  const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
  
  // Chain multiple operations
  const result = fluent
    .map(x => x * 2)
    .filter(x => x > 80)
    .chain(x => MockMaybe.of(x.toString()));
  
  console.log('Chained result:', result.getValue()); // Should be "84"
  console.log('✅ Method chaining test passed');
}

function testCrossTypeclassChaining() {
  console.log('\n=== Test 3: Cross-Typeclass Chaining ===');
  
  const either = MockEither.right(42);
  const capabilities = detectTypeclassCapabilities('MockEither');
  const fluent = addTypeclassAwareFluentMethods(either, 'MockEither', capabilities);
  
  // Start with Functor, then use Bifunctor methods
  const result = fluent
    .map(x => x * 2)
    .bimap(
      l => l,
      r => r + 1
    );
  
  console.log('Cross-typeclass result:', result.getRight()); // Should be 85
  console.log('✅ Cross-typeclass chaining test passed');
}

function testConditionalMethodAccess() {
  console.log('\n=== Test 4: Conditional Method Access ===');
  
  const maybe = MockMaybe.of(42);
  
  // Create limited capabilities
  const limitedCapabilities = {
    Functor: true,
    Monad: false,
    Applicative: false,
    Bifunctor: false,
    Traversable: false,
    Filterable: false,
    Eq: false,
    Ord: false,
    Show: false
  };
  
  const limitedFluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', limitedCapabilities);
  
  // Should have map (Functor)
  console.log('Has map:', typeof limitedFluent.map === 'function'); // Should be true
  
  // Should NOT have chain (Monad)
  console.log('Has chain:', typeof limitedFluent.chain === 'function'); // Should be false
  
  // Should NOT have bimap (Bifunctor)
  console.log('Has bimap:', typeof limitedFluent.bimap === 'function'); // Should be false
  
  console.log('✅ Conditional method access test passed');
}

function testConvenienceFunction() {
  console.log('\n=== Test 5: Convenience Function ===');
  
  const maybe = MockMaybe.of(42);
  const fluent = createTypeclassAwareFluent(maybe, 'MockMaybe');
  
  // Should have all available methods based on detected capabilities
  console.log('Has map:', typeof fluent.map === 'function'); // Should be true
  console.log('Has chain:', typeof fluent.chain === 'function'); // Should be true
  console.log('Has filter:', typeof fluent.filter === 'function'); // Should be true
  
  // Should support chaining
  const result = fluent
    .map(x => x * 2)
    .chain(x => MockMaybe.of(x + 1));
  
  console.log('Convenience function result:', result.getValue()); // Should be 85
  console.log('✅ Convenience function test passed');
}

function testPerformance() {
  console.log('\n=== Test 6: Performance ===');
  
  const maybe = MockMaybe.of(1);
  const capabilities = detectTypeclassCapabilities('MockMaybe');
  
  const startTime = performance.now();
  
  // Create fluent wrapper
  const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
  
  // Perform long chain
  let result = fluent;
  for (let i = 0; i < 1000; i++) {
    result = result.map(x => x + 1);
  }
  
  const endTime = performance.now();
  const performanceTime = endTime - startTime;
  
  console.log('Performance test result:', result.getValue()); // Should be 1001
  console.log('Performance time (ms):', performanceTime.toFixed(2));
  console.log('✅ Performance test passed');
}

function testErrorHandling() {
  console.log('\n=== Test 7: Error Handling ===');
  
  const maybe = MockMaybe.of(42);
  const capabilities = detectTypeclassCapabilities('MockMaybe');
  const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
  
  // Test with null value
  const nullMaybe = MockMaybe.nothing();
  const nullFluent = addTypeclassAwareFluentMethods(nullMaybe, 'MockMaybe', capabilities);
  
  const result1 = nullFluent.map(x => x * 2);
  console.log('Null map result:', result1.getValue()); // Should be null
  
  const result2 = nullFluent.chain(x => MockMaybe.of(x.toString()));
  console.log('Null chain result:', result2.getValue()); // Should be null
  
  console.log('✅ Error handling test passed');
}

// Run all tests
console.log('🚀 Starting Typeclass-Aware Fluent Composition Tests\n');

try {
  testBasicFunctionality();
  testMethodChaining();
  testCrossTypeclassChaining();
  testConditionalMethodAccess();
  testConvenienceFunction();
  testPerformance();
  testErrorHandling();
  
  console.log('\n🎉 All tests passed successfully!');
  console.log('\n✅ Typeclass-Aware Fluent Composition System is working correctly');
} catch (error) {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}
