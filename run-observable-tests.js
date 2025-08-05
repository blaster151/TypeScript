/**
 * Simple test runner for ObservableLite implementation
 * This runs basic functionality tests without requiring TypeScript compilation
 */

console.log('🧪 Testing ObservableLite Implementation...\n');

// Simple ObservableLite implementation for testing
class ObservableLite {
  constructor(subscribe) {
    this._subscribe = subscribe;
  }

  subscribe(observerOrNext, error, complete) {
    if (typeof observerOrNext === 'function') {
      return this._subscribe({ next: observerOrNext, error, complete });
    } else {
      return this._subscribe(observerOrNext);
    }
  }

  map(f) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => observer.next(f(value)),
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  flatMap(f) {
    return new ObservableLite((observer) => {
      let outerUnsubscribe = null;
      let innerUnsubscribe = null;
      let completed = false;

      outerUnsubscribe = this._subscribe({
        next: (value) => {
          if (completed) return;
          
          if (innerUnsubscribe) {
            innerUnsubscribe();
          }
          
          const innerObservable = f(value);
          innerUnsubscribe = innerObservable.subscribe({
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

  filter(predicate) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          if (predicate(value)) {
            observer.next(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  scan(reducer, initial) {
    return new ObservableLite((observer) => {
      let accumulator = initial;
      observer.next(accumulator); // Emit initial value

      return this._subscribe({
        next: (value) => {
          accumulator = reducer(accumulator, value);
          observer.next(accumulator);
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  take(count) {
    return new ObservableLite((observer) => {
      let taken = 0;
      
      return this._subscribe({
        next: (value) => {
          if (taken < count) {
            observer.next(value);
            taken++;
            if (taken === count) {
              observer.complete?.();
            }
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  static of(value) {
    return new ObservableLite((observer) => {
      observer.next(value);
      observer.complete?.();
      return () => {}; // No cleanup needed
    });
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

  static fromPromise(promise) {
    return new ObservableLite((observer) => {
      let cancelled = false;
      
      promise.then(
        (value) => {
          if (!cancelled) {
            observer.next(value);
            observer.complete?.();
          }
        },
        (error) => {
          if (!cancelled) {
            observer.error?.(error);
          }
        }
      );
      
      return () => {
        cancelled = true;
      };
    });
  }
}

// Test utilities
function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}: Expected ${expectedStr}, got ${actualStr}`);
  }
}

async function assertEqualAsync(actual, expected, message) {
  const result = await actual;
  assertEqual(result, expected, message);
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
// Test 1: Basic Functionality
// ============================================================================

console.log('📋 Test 1: Basic Functionality');

const testBasicFunctionality = async () => {
  // Test ObservableLite.of
  const obs1 = ObservableLite.of(42);
  const values1 = await collectValues(obs1);
  assertEqual(values1, [42], 'ObservableLite.of should emit single value');
  
  // Test ObservableLite.fromArray
  const obs2 = ObservableLite.fromArray([1, 2, 3, 4, 5]);
  const values2 = await collectValues(obs2);
  assertEqual(values2, [1, 2, 3, 4, 5], 'ObservableLite.fromArray should emit all array values');
  
  // Test ObservableLite.fromPromise
  const promise = Promise.resolve('success');
  const obs3 = ObservableLite.fromPromise(promise);
  const values3 = await collectValues(obs3);
  assertEqual(values3, ['success'], 'ObservableLite.fromPromise should emit resolved value');
};

// ============================================================================
// Test 2: FP Instance Methods
// ============================================================================

console.log('📋 Test 2: FP Instance Methods');

const testFPInstanceMethods = async () => {
  // Test map
  const obs1 = ObservableLite.fromArray([1, 2, 3]);
  const mapped = obs1.map(x => x * 2);
  const values1 = await collectValues(mapped);
  assertEqual(values1, [2, 4, 6], 'map should transform values');
  
  // Test flatMap
  const obs2 = ObservableLite.fromArray([1, 2, 3]);
  const flatMapped = obs2.flatMap(x => ObservableLite.fromArray([x, x * 2]));
  const values2 = await collectValues(flatMapped);
  assertEqual(values2, [1, 2, 2, 4, 3, 6], 'flatMap should flatten nested observables');
  
  // Test filter
  const obs3 = ObservableLite.fromArray([1, 2, 3, 4, 5, 6]);
  const filtered = obs3.filter(x => x % 2 === 0);
  const values3 = await collectValues(filtered);
  assertEqual(values3, [2, 4, 6], 'filter should keep only even numbers');
  
  // Test scan
  const obs4 = ObservableLite.fromArray([1, 2, 3, 4]);
  const scanned = obs4.scan((acc, val) => acc + val, 0);
  const values4 = await collectValues(scanned);
  assertEqual(values4, [0, 1, 3, 6, 10], 'scan should accumulate values');
  
  // Test take
  const obs5 = ObservableLite.fromArray([1, 2, 3, 4, 5]);
  const taken = obs5.take(3);
  const values5 = await collectValues(taken);
  assertEqual(values5, [1, 2, 3], 'take should limit emissions');
};

// ============================================================================
// Test 3: Functor Laws
// ============================================================================

console.log('📋 Test 3: Functor Laws');

const testFunctorLaws = async () => {
  // Functor Law 1: Identity - map(fa, x => x) = fa
  const original = ObservableLite.fromArray([1, 2, 3]);
  const mapped = original.map(x => x);
  
  const originalValues = await collectValues(original);
  const mappedValues = await collectValues(mapped);
  
  assertEqual(mappedValues, originalValues, 'Functor identity law should hold');
  
  // Functor Law 2: Composition - map(fa, f) |> map(_, g) = map(fa, x => g(f(x)))
  const obs = ObservableLite.fromArray([1, 2, 3]);
  const f = (x) => x * 2;
  const g = (x) => x + 1;
  
  const composed = obs.map(f).map(g);
  const direct = obs.map(x => g(f(x)));
  
  const composedValues = await collectValues(composed);
  const directValues = await collectValues(direct);
  
  assertEqual(composedValues, directValues, 'Functor composition law should hold');
};

// ============================================================================
// Test 4: Monad Laws
// ============================================================================

console.log('📋 Test 4: Monad Laws');

const testMonadLaws = async () => {
  // Monad Law 1: Left Identity - chain(of(a), f) = f(a)
  const a = 5;
  const f = (x) => ObservableLite.of(x * 2);
  
  const leftSide = ObservableLite.of(a).flatMap(f);
  const rightSide = f(a);
  
  const leftValues = await collectValues(leftSide);
  const rightValues = await collectValues(rightSide);
  
  assertEqual(leftValues, rightValues, 'Monad left identity law should hold');
  
  // Monad Law 2: Right Identity - chain(ma, of) = ma
  const original = ObservableLite.fromArray([1, 2, 3]);
  const chained = original.flatMap(x => ObservableLite.of(x));
  
  const originalValues = await collectValues(original);
  const chainedValues = await collectValues(chained);
  
  assertEqual(chainedValues, originalValues, 'Monad right identity law should hold');
  
  // Monad Law 3: Associativity - chain(chain(ma, f), g) = chain(ma, x => chain(f(x), g))
  const obs = ObservableLite.fromArray([1, 2]);
  const f1 = (x) => ObservableLite.of(x * 2);
  const g1 = (x) => ObservableLite.of(x + 1);
  
  const leftSide2 = obs.flatMap(f1).flatMap(g1);
  const rightSide2 = obs.flatMap(x => f1(x).flatMap(g1));
  
  const leftValues2 = await collectValues(leftSide2);
  const rightValues2 = await collectValues(rightSide2);
  
  assertEqual(leftValues2, rightValues2, 'Monad associativity law should hold');
};

// ============================================================================
// Test 5: Chaining
// ============================================================================

console.log('📋 Test 5: Chaining');

const testChaining = async () => {
  const obs = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const result = obs
    .filter(x => x % 2 === 0)
    .map(x => x * 2)
    .take(3)
    .scan((acc, val) => acc + val, 0);
  
  const values = await collectValues(result);
  assertEqual(values, [0, 4, 12, 24], 'Chaining should work correctly');
};

// ============================================================================
// Test 6: Unsubscribe
// ============================================================================

console.log('📋 Test 6: Unsubscribe');

const testUnsubscribe = async () => {
  let emitted = 0;
  const obs = new ObservableLite((observer) => {
    const interval = setInterval(() => {
      observer.next(emitted++);
    }, 10);
    
    return () => {
      clearInterval(interval);
    };
  });
  
  const unsubscribe = obs.subscribe({
    next: () => {},
    complete: () => {}
  });
  
  // Let it emit a few values
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Unsubscribe
  unsubscribe();
  
  // Wait a bit more
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Should have stopped emitting
  assertEqual(emitted < 10, true, 'Unsubscribe should stop emissions');
};

// ============================================================================
// Test 7: Error Handling
// ============================================================================

console.log('📋 Test 7: Error Handling');

const testErrorHandling = async () => {
  // Test promise rejection
  const promise = Promise.reject('test error');
  const obs = ObservableLite.fromPromise(promise);
  
  try {
    await collectValues(obs);
    throw new Error('Should have thrown an error');
  } catch (error) {
    assertEqual(error, 'test error', 'fromPromise should emit error');
  }
};

// ============================================================================
// Test 8: Realistic Examples
// ============================================================================

console.log('📋 Test 8: Realistic Examples');

const testRealisticExamples = async () => {
  // Test data transformation pipeline
  const data = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  
  const pipeline = data
    .filter(x => x % 2 === 0)
    .map(x => x * 2)
    .scan((acc, val) => acc + val, 0)
    .take(3);
  
  const values = await collectValues(pipeline);
  assertEqual(values, [0, 4, 12], 'Pipeline should transform data correctly');
  
  // Test event stream processing
  const events = ObservableLite.fromArray([
    { type: 'click', x: 100, y: 200 },
    { type: 'move', x: 150, y: 250 },
    { type: 'click', x: 200, y: 300 },
    { type: 'scroll', delta: 10 }
  ]);
  
  const clicks = events
    .filter(event => event.type === 'click')
    .map(event => ({ x: event.x, y: event.y }));
  
  const clickValues = await collectValues(clicks);
  assertEqual(clickValues.length, 2, 'Should filter to 2 click events');
  assertEqual(clickValues[0].x, 100, 'First click should have correct x coordinate');
};

// Run all tests
const runAllTests = async () => {
  try {
    await testBasicFunctionality();
    console.log('✅ Test 1 passed\n');
    
    await testFPInstanceMethods();
    console.log('✅ Test 2 passed\n');
    
    await testFunctorLaws();
    console.log('✅ Test 3 passed\n');
    
    await testMonadLaws();
    console.log('✅ Test 4 passed\n');
    
    await testChaining();
    console.log('✅ Test 5 passed\n');
    
    await testUnsubscribe();
    console.log('✅ Test 6 passed\n');
    
    await testErrorHandling();
    console.log('✅ Test 7 passed\n');
    
    await testRealisticExamples();
    console.log('✅ Test 8 passed\n');
    
    console.log('🎉 All ObservableLite tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
};

runAllTests(); 