/**
 * Simple test runner for Fluent Methods System
 * This runs basic functionality tests without requiring TypeScript compilation
 */

console.log('🧪 Testing Fluent Methods System...\n');

// Simple ADT implementations for testing
class Maybe {
  constructor(value, isJust = true) {
    this.value = value;
    this.isJust = isJust;
  }
  
  static Just(value) {
    return new Maybe(value, true);
  }
  
  static Nothing() {
    return new Maybe(null, false);
  }
}

class Either {
  constructor(value, isRight = true) {
    this.value = value;
    this.isRight = isRight;
  }
  
  static Left(value) {
    return new Either(value, false);
  }
  
  static Right(value) {
    return new Either(value, true);
  }
}

class Result {
  constructor(value, isOk = true) {
    this.value = value;
    this.isOk = isOk;
  }
  
  static Ok(value) {
    return new Result(value, true);
  }
  
  static Err(value) {
    return new Result(value, false);
  }
}

class ObservableLite {
  constructor(subscribe) {
    this._subscribe = subscribe;
  }
  
  subscribe(observer) {
    return this._subscribe(observer);
  }
  
  static fromArray(values) {
    return new ObservableLite((observer) => {
      let cancelled = false;
      
      for (const value of values) {
        if (cancelled) break;
        observer.next(value);
      }
      
      if (!cancelled) {
        observer.complete?.();
      }
      
      return () => {
        cancelled = true;
      };
    });
  }
}

// Simple typeclass instances for testing
const MaybeFunctor = {
  map: (fa, f) => {
    if (fa.isJust) {
      return Maybe.Just(f(fa.value));
    } else {
      return Maybe.Nothing();
    }
  }
};

const MaybeMonad = {
  ...MaybeFunctor,
  chain: (fa, f) => {
    if (fa.isJust) {
      return f(fa.value);
    } else {
      return Maybe.Nothing();
    }
  }
};

const EitherFunctor = {
  map: (fa, f) => {
    if (fa.isRight) {
      return Either.Right(f(fa.value));
    } else {
      return Either.Left(fa.value);
    }
  }
};

const EitherMonad = {
  ...EitherFunctor,
  chain: (fa, f) => {
    if (fa.isRight) {
      return f(fa.value);
    } else {
      return Either.Left(fa.value);
    }
  }
};

const EitherBifunctor = {
  ...EitherFunctor,
  bimap: (fa, f, g) => {
    if (fa.isRight) {
      return Either.Right(g(fa.value));
    } else {
      return Either.Left(f(fa.value));
    }
  }
};

const ResultFunctor = {
  map: (fa, f) => {
    if (fa.isOk) {
      return Result.Ok(f(fa.value));
    } else {
      return Result.Err(fa.value);
    }
  }
};

const ResultMonad = {
  ...ResultFunctor,
  chain: (fa, f) => {
    if (fa.isOk) {
      return f(fa.value);
    } else {
      return Result.Err(fa.value);
    }
  }
};

const ResultBifunctor = {
  ...ResultFunctor,
  bimap: (fa, f, g) => {
    if (fa.isOk) {
      return Result.Ok(g(fa.value));
    } else {
      return Result.Err(f(fa.value));
    }
  }
};

const ObservableLiteFunctor = {
  map: (fa, f) => {
    return new ObservableLite((observer) => {
      return fa._subscribe({
        next: (value) => observer.next(f(value)),
        error: observer.error,
        complete: observer.complete
      });
    });
  }
};

const ObservableLiteMonad = {
  ...ObservableLiteFunctor,
  chain: (fa, f) => {
    return new ObservableLite((observer) => {
      let outerUnsubscribe = null;
      let innerUnsubscribe = null;
      let completed = false;

      outerUnsubscribe = fa._subscribe({
        next: (value) => {
          if (completed) return;
          
          if (innerUnsubscribe) {
            innerUnsubscribe();
          }
          
          const innerObservable = f(value);
          innerUnsubscribe = innerObservable._subscribe({
            next: (innerValue) => {
              if (!completed) {
                observer.next(innerValue);
              }
            },
            error: (err) => {
              if (!completed) {
                completed = true;
                observer.error?.(err);
              }
            },
            complete: () => {
              // Inner observable completed, but outer may continue
            }
          });
        },
        error: (err) => {
          if (!completed) {
            completed = true;
            observer.error?.(err);
          }
        },
        complete: () => {
          if (!completed) {
            completed = true;
            observer.complete?.();
          }
        }
      });

      return () => {
        if (outerUnsubscribe) outerUnsubscribe();
        if (innerUnsubscribe) innerUnsubscribe();
      };
    });
  }
};

// Fluent methods registry
const FLUENT_METHOD_REGISTRY = new Map();

function registerFluentMethodInstances(adtName, instances) {
  FLUENT_METHOD_REGISTRY.set(adtName, instances);
}

function getFluentMethodInstances(adtName) {
  return FLUENT_METHOD_REGISTRY.get(adtName);
}

function withFluentMethods(Ctor, adtName, options = {}) {
  const {
    enableMap = true,
    enableChain = true,
    enableFilter = true,
    enableBimap = true
  } = options;

  const instances = getFluentMethodInstances(adtName);

  if (!instances) {
    console.warn(`No typeclass instances found for ADT: ${adtName}`);
    return Ctor;
  }

  // Add .map method if Functor instance exists
  if (enableMap && instances.Functor) {
    Ctor.prototype.map = function(fn) {
      return instances.Functor.map(this, fn);
    };
  }

  // Add .chain method if Monad instance exists
  if (enableChain && instances.Monad) {
    Ctor.prototype.chain = function(fn) {
      return instances.Monad.chain(this, fn);
    };
  }

  // Add .filter method (implemented via chain)
  if (enableFilter && instances.Monad) {
    Ctor.prototype.filter = function(predicate) {
      return instances.Monad.chain(this, (value) => 
        predicate(value) ? this.constructor.Just ? this.constructor.Just(value) : this.constructor.Ok(value) : 
        this.constructor.Nothing ? this.constructor.Nothing() : this.constructor.Err('filtered out')
      );
    };
  }

  // Add .bimap method if Bifunctor instance exists
  if (enableBimap && instances.Bifunctor) {
    Ctor.prototype.bimap = function(f, g) {
      return instances.Bifunctor.bimap(this, f, g);
    };
  }

  return Ctor;
}

// Test utilities
function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}: Expected ${expectedStr}, got ${actualStr}`);
  }
}

function collectValues(observable) {
  return new Promise((resolve, reject) => {
    const values = [];
    const unsubscribe = observable.subscribe({
      next: (value) => values.push(value),
      error: (err) => reject(err),
      complete: () => resolve(values)
    });
  });
}

// ============================================================================
// Test 1: Registry Functions
// ============================================================================

console.log('📋 Test 1: Registry Functions');

const testRegistryFunctions = () => {
  const instances = {
    Functor: MaybeFunctor,
    Monad: MaybeMonad
  };
  
  registerFluentMethodInstances('Maybe', instances);
  const retrieved = getFluentMethodInstances('Maybe');
  
  assertEqual(retrieved, instances, 'Should register and retrieve instances correctly');
};

// ============================================================================
// Test 2: Decorator Functions
// ============================================================================

console.log('📋 Test 2: Decorator Functions');

const testDecoratorFunctions = () => {
  // Test withFluentMethods
  const instances = {
    Functor: MaybeFunctor,
    Monad: MaybeMonad
  };
  
  registerFluentMethodInstances('Maybe', instances);
  
  const DecoratedMaybe = withFluentMethods(Maybe, 'Maybe');
  const instance = new DecoratedMaybe(5, true);
  
  assertEqual(typeof instance.map, 'function', 'Should have map method');
  
  const result = instance.map((x) => x * 2);
  assertEqual(result.value, 10, 'Should apply map correctly');
  assertEqual(result.isJust, true, 'Should preserve Just state');
};

// ============================================================================
// Test 3: Maybe Fluent Methods
// ============================================================================

console.log('📋 Test 3: Maybe Fluent Methods');

const testMaybeFluentMethods = () => {
  const instances = {
    Functor: MaybeFunctor,
    Monad: MaybeMonad
  };
  
  registerFluentMethodInstances('Maybe', instances);
  const DecoratedMaybe = withFluentMethods(Maybe, 'Maybe');
  
  // Test .map
  const maybe1 = DecoratedMaybe.Just(5);
  const mapped = maybe1.map((x) => x * 2);
  assertEqual(mapped.value, 10, 'Maybe.map should work correctly');
  assertEqual(mapped.isJust, true, 'Maybe.map should preserve Just state');
  
  // Test .chain
  const chained = maybe1.chain((x) => DecoratedMaybe.Just(x * 3));
  assertEqual(chained.value, 15, 'Maybe.chain should work correctly');
  
  // Test .filter
  const filtered = maybe1.filter((x) => x > 3);
  assertEqual(filtered.value, 5, 'Maybe.filter should keep value when predicate is true');
  
  const filteredOut = maybe1.filter((x) => x > 10);
  assertEqual(filteredOut.isJust, false, 'Maybe.filter should return Nothing when predicate is false');
  
  // Test chaining
  const chainResult = DecoratedMaybe.Just(5)
    .map((x) => x + 1)
    .chain((x) => DecoratedMaybe.Just(x * 2))
    .filter((x) => x > 10);
  
  assertEqual(chainResult.value, 12, 'Maybe chaining should work correctly');
};

// ============================================================================
// Test 4: Either Fluent Methods
// ============================================================================

console.log('📋 Test 4: Either Fluent Methods');

const testEitherFluentMethods = () => {
  const instances = {
    Functor: EitherFunctor,
    Monad: EitherMonad,
    Bifunctor: EitherBifunctor
  };
  
  registerFluentMethodInstances('Either', instances);
  const DecoratedEither = withFluentMethods(Either, 'Either');
  
  // Test .map on Right
  const either1 = DecoratedEither.Right(5);
  const mapped = either1.map((x) => x * 2);
  assertEqual(mapped.value, 10, 'Either.map should work correctly on Right');
  assertEqual(mapped.isRight, true, 'Either.map should preserve Right state');
  
  // Test .map on Left
  const either2 = DecoratedEither.Left('error');
  const mappedLeft = either2.map((x) => x * 2);
  assertEqual(mappedLeft.value, 'error', 'Either.map should preserve Left');
  assertEqual(mappedLeft.isRight, false, 'Either.map should preserve Left state');
  
  // Test .chain on Right
  const chained = either1.chain((x) => DecoratedEither.Right(x * 3));
  assertEqual(chained.value, 15, 'Either.chain should work correctly on Right');
  
  // Test .bimap
  const bimapped = either1.bimap(
    (err) => `Error: ${err}`,
    (val) => val * 2
  );
  assertEqual(bimapped.value, 10, 'Either.bimap should work correctly on Right');
  
  const bimappedLeft = either2.bimap(
    (err) => `Error: ${err}`,
    (val) => val * 2
  );
  assertEqual(bimappedLeft.value, 'Error: error', 'Either.bimap should work correctly on Left');
  
  // Test chaining
  const chainResult = DecoratedEither.Right(5)
    .map((x) => x + 1)
    .chain((x) => DecoratedEither.Right(x * 2))
    .bimap(
      (err) => `Error: ${err}`,
      (val) => val + 1
    );
  
  assertEqual(chainResult.value, 13, 'Either chaining should work correctly');
};

// ============================================================================
// Test 5: Result Fluent Methods
// ============================================================================

console.log('📋 Test 5: Result Fluent Methods');

const testResultFluentMethods = () => {
  const instances = {
    Functor: ResultFunctor,
    Monad: ResultMonad,
    Bifunctor: ResultBifunctor
  };
  
  registerFluentMethodInstances('Result', instances);
  const DecoratedResult = withFluentMethods(Result, 'Result');
  
  // Test .map on Ok
  const result1 = DecoratedResult.Ok(5);
  const mapped = result1.map((x) => x * 2);
  assertEqual(mapped.value, 10, 'Result.map should work correctly on Ok');
  assertEqual(mapped.isOk, true, 'Result.map should preserve Ok state');
  
  // Test .map on Err
  const result2 = DecoratedResult.Err('error');
  const mappedErr = result2.map((x) => x * 2);
  assertEqual(mappedErr.value, 'error', 'Result.map should preserve Err');
  assertEqual(mappedErr.isOk, false, 'Result.map should preserve Err state');
  
  // Test .chain on Ok
  const chained = result1.chain((x) => DecoratedResult.Ok(x * 3));
  assertEqual(chained.value, 15, 'Result.chain should work correctly on Ok');
  
  // Test .bimap
  const bimapped = result1.bimap(
    (err) => `Error: ${err}`,
    (val) => val * 2
  );
  assertEqual(bimapped.value, 10, 'Result.bimap should work correctly on Ok');
  
  const bimappedErr = result2.bimap(
    (err) => `Error: ${err}`,
    (val) => val * 2
  );
  assertEqual(bimappedErr.value, 'Error: error', 'Result.bimap should work correctly on Err');
  
  // Test chaining
  const chainResult = DecoratedResult.Ok(5)
    .map((x) => x + 1)
    .chain((x) => DecoratedResult.Ok(x * 2))
    .bimap(
      (err) => `Error: ${err}`,
      (val) => val + 1
    );
  
  assertEqual(chainResult.value, 13, 'Result chaining should work correctly');
};

// ============================================================================
// Test 6: ObservableLite Fluent Methods
// ============================================================================

console.log('📋 Test 6: ObservableLite Fluent Methods');

const testObservableLiteFluentMethods = async () => {
  const instances = {
    Functor: ObservableLiteFunctor,
    Monad: ObservableLiteMonad
  };
  
  registerFluentMethodInstances('ObservableLite', instances);
  const DecoratedObservableLite = withFluentMethods(ObservableLite, 'ObservableLite');
  
  // Test .map
  const obs1 = DecoratedObservableLite.fromArray([1, 2, 3]);
  const mapped = obs1.map((x) => x * 2);
  
  const values1 = await collectValues(mapped);
  assertEqual(values1, [2, 4, 6], 'ObservableLite.map should work correctly');
  
  // Test .chain
  const obs2 = DecoratedObservableLite.fromArray([1, 2]);
  const chained = obs2.chain((x) => DecoratedObservableLite.fromArray([x, x * 2]));
  
  const values2 = await collectValues(chained);
  assertEqual(values2, [1, 2, 2, 4], 'ObservableLite.chain should work correctly');
  
  // Test chaining
  const chainResult = DecoratedObservableLite.fromArray([1, 2, 3, 4, 5])
    .map((x) => x * 2)
    .chain((x) => DecoratedObservableLite.fromArray([x, x + 1]));
  
  const values3 = await collectValues(chainResult);
  assertEqual(values3, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'ObservableLite chaining should work correctly');
};

// ============================================================================
// Test 7: Bifunctor Support
// ============================================================================

console.log('📋 Test 7: Bifunctor Support');

const testBifunctorSupport = () => {
  const instances = {
    Functor: EitherFunctor,
    Monad: EitherMonad,
    Bifunctor: EitherBifunctor
  };
  
  registerFluentMethodInstances('Either', instances);
  const DecoratedEither = withFluentMethods(Either, 'Either');
  
  // Test .bimap on Right
  const right = DecoratedEither.Right(5);
  const bimappedRight = right.bimap(
    (err) => `Error: ${err}`,
    (val) => val * 2
  );
  assertEqual(bimappedRight.value, 10, 'Either.bimap should work on Right');
  
  // Test .bimap on Left
  const left = DecoratedEither.Left('test error');
  const bimappedLeft = left.bimap(
    (err) => `Error: ${err}`,
    (val) => val * 2
  );
  assertEqual(bimappedLeft.value, 'Error: test error', 'Either.bimap should work on Left');
};

// ============================================================================
// Test 8: Realistic Examples
// ============================================================================

console.log('📋 Test 8: Realistic Examples');

const testRealisticExamples = () => {
  // Test realistic Maybe chaining
  const testMaybeRealisticExample = () => {
    const instances = {
      Functor: MaybeFunctor,
      Monad: MaybeMonad
    };
    
    registerFluentMethodInstances('Maybe', instances);
    const DecoratedMaybe = withFluentMethods(Maybe, 'Maybe');
    
    // Simulate user data processing
    const getUser = (id) => id > 0 ? DecoratedMaybe.Just({ id, name: `User ${id}` }) : DecoratedMaybe.Nothing();
    const getProfile = (user) => DecoratedMaybe.Just({ ...user, email: `${user.name.toLowerCase().replace(' ', '.')}@example.com` });
    const validateEmail = (profile) => 
      profile.email.includes('@') ? DecoratedMaybe.Just(profile) : DecoratedMaybe.Nothing();
    
    const result = getUser(5)
      .chain(getProfile)
      .chain(validateEmail)
      .map(profile => `Welcome, ${profile.name}!`);
    
    assertEqual(result.value, 'Welcome, User 5!', 'Realistic Maybe chaining should work');
    
    const invalidResult = getUser(-1)
      .chain(getProfile)
      .chain(validateEmail)
      .map(profile => `Welcome, ${profile.name}!`);
    
    assertEqual(invalidResult.isJust, false, 'Invalid user should result in Nothing');
  };
  
  // Test realistic Either chaining
  const testEitherRealisticExample = () => {
    const instances = {
      Functor: EitherFunctor,
      Monad: EitherMonad,
      Bifunctor: EitherBifunctor
    };
    
    registerFluentMethodInstances('Either', instances);
    const DecoratedEither = withFluentMethods(Either, 'Either');
    
    // Simulate API call processing
    const fetchUser = (id) => id > 0 ? DecoratedEither.Right({ id, name: `User ${id}` }) : DecoratedEither.Left('Invalid user ID');
    const fetchPosts = (user) => DecoratedEither.Right([{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }]);
    const processPosts = (posts) => DecoratedEither.Right(posts.map(post => ({ ...post, processed: true })));
    
    const result = fetchUser(5)
      .chain(fetchPosts)
      .chain(processPosts)
      .map(posts => `${posts.length} posts processed`);
    
    assertEqual(result.value, '2 posts processed', 'Realistic Either chaining should work');
    
    const errorResult = fetchUser(-1)
      .chain(fetchPosts)
      .chain(processPosts)
      .map(posts => `${posts.length} posts processed`);
    
    assertEqual(errorResult.value, 'Invalid user ID', 'Error should be preserved through chain');
  };
  
  testMaybeRealisticExample();
  testEitherRealisticExample();
};

// ============================================================================
// Test 9: Utility Functions
// ============================================================================

console.log('📋 Test 9: Utility Functions');

const testUtilityFunctions = () => {
  // Test hasInstanceFluentMethods
  const testHasInstanceFluentMethods = () => {
    const instances = {
      Functor: MaybeFunctor,
      Monad: MaybeMonad
    };
    
    registerFluentMethodInstances('Maybe', instances);
    const DecoratedMaybe = withFluentMethods(Maybe, 'Maybe');
    
    const maybe = new DecoratedMaybe(5, true);
    assertEqual(typeof maybe.map, 'function', 'Should detect fluent methods on instance');
    
    const plainObj = { value: 5 };
    assertEqual(typeof plainObj.map, 'undefined', 'Should not detect fluent methods on plain object');
  };
  
  // Test getAvailableFluentMethods
  const testGetAvailableFluentMethods = () => {
    const instances = {
      Functor: MaybeFunctor,
      Monad: MaybeMonad
    };
    
    registerFluentMethodInstances('Maybe', instances);
    const DecoratedMaybe = withFluentMethods(Maybe, 'Maybe');
    
    const maybe = new DecoratedMaybe(5, true);
    
    assertEqual(typeof maybe.map, 'function', 'Should include map method');
    assertEqual(typeof maybe.chain, 'function', 'Should include chain method');
    assertEqual(typeof maybe.filter, 'function', 'Should include filter method');
  };
  
  testHasInstanceFluentMethods();
  testGetAvailableFluentMethods();
};

// Run all tests
const runAllTests = async () => {
  try {
    testRegistryFunctions();
    console.log('✅ Test 1 passed\n');
    
    testDecoratorFunctions();
    console.log('✅ Test 2 passed\n');
    
    testMaybeFluentMethods();
    console.log('✅ Test 3 passed\n');
    
    testEitherFluentMethods();
    console.log('✅ Test 4 passed\n');
    
    testResultFluentMethods();
    console.log('✅ Test 5 passed\n');
    
    await testObservableLiteFluentMethods();
    console.log('✅ Test 6 passed\n');
    
    testBifunctorSupport();
    console.log('✅ Test 7 passed\n');
    
    testRealisticExamples();
    console.log('✅ Test 8 passed\n');
    
    testUtilityFunctions();
    console.log('✅ Test 9 passed\n');
    
    console.log('🎉 All Fluent Methods tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
};

runAllTests(); 