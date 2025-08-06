/**
 * ObservableLite ADT Integration Tests
 * 
 * This tests the ADT integration methods on ObservableLite:
 * - .match(cases) - Pattern matching on ADT values
 * - .mapMatch(cases) - Shorthand for map + match
 * - .bichain(leftFn, rightFn) - Branching based on Left/Right
 * - .matchTag(cases) - Tag-only pattern matching
 * - .filterTag(tag) - Filter by ADT tag
 * - .extractValues() - Extract values from success cases
 * - .extractErrors() - Extract errors from error cases
 */

// ============================================================================
// Mock ObservableLite Implementation for Testing
// ============================================================================

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

  // ADT Integration Methods
  match(cases) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          try {
            // Check if the value has a match method (ADT instance)
            if (value && typeof value.match === 'function') {
              const result = value.match(cases);
              observer.next(result);
            } else {
              // Fallback for non-ADT values
              const fallback = cases._ || cases.otherwise;
              if (fallback) {
                const result = fallback('unknown', value);
                observer.next(result);
              }
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  mapMatch(cases) {
    return this.match(cases);
  }

  bichain(leftFn, rightFn) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          try {
            // Check if the value is an Either-like ADT
            if (value && typeof value.match === 'function') {
              value.match({
                Left: (payload) => {
                  const leftObservable = leftFn(payload.value);
                  leftObservable.subscribe({
                    next: (leftValue) => observer.next(leftValue),
                    error: observer.error,
                    complete: () => {} // Don't complete on left branch
                  });
                },
                Right: (payload) => {
                  const rightObservable = rightFn(payload.value);
                  rightObservable.subscribe({
                    next: (rightValue) => observer.next(rightValue),
                    error: observer.error,
                    complete: () => {} // Don't complete on right branch
                  });
                },
                // Handle other ADT types that might have Left/Right semantics
                Err: (payload) => {
                  const leftObservable = leftFn(payload.error);
                  leftObservable.subscribe({
                    next: (leftValue) => observer.next(leftValue),
                    error: observer.error,
                    complete: () => {}
                  });
                },
                Ok: (payload) => {
                  const rightObservable = rightFn(payload.value);
                  rightObservable.subscribe({
                    next: (rightValue) => observer.next(rightValue),
                    error: observer.error,
                    complete: () => {}
                  });
                }
              });
            } else {
              // Fallback for non-ADT values - treat as Right
              const rightObservable = rightFn(value);
              rightObservable.subscribe({
                next: (rightValue) => observer.next(rightValue),
                error: observer.error,
                complete: () => {}
              });
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  matchTag(cases) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          try {
            // Check if the value has a matchTag method (ADT instance)
            if (value && typeof value.matchTag === 'function') {
              const result = value.matchTag(cases);
              observer.next(result);
            } else {
              // Fallback for non-ADT values
              const fallback = cases._ || cases.otherwise;
              if (fallback) {
                const result = fallback('unknown');
                observer.next(result);
              }
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  filterTag(tag) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          try {
            // Check if the value has an is method (ADT instance)
            if (value && typeof value.is === 'function') {
              if (value.is(tag)) {
                observer.next(value);
              }
            } else {
              // Fallback for non-ADT values
              if (value && value.tag === tag) {
                observer.next(value);
              }
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  extractValues() {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          try {
            if (value && typeof value.match === 'function') {
              value.match({
                Just: (payload) => observer.next(payload.value),
                Right: (payload) => observer.next(payload.value),
                Ok: (payload) => observer.next(payload.value)
                // Don't emit for Nothing/Left/Err cases
              });
            } else {
              // Fallback for non-ADT values
              observer.next(value);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  extractErrors() {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          try {
            if (value && typeof value.match === 'function') {
              value.match({
                Left: (payload) => observer.next(payload.value),
                Err: (payload) => observer.next(payload.error)
                // Don't emit for Right/Ok cases
              });
            }
            // Don't emit for non-ADT values
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  // Utility methods for testing
  toArray() {
    return new Promise((resolve, reject) => {
      const values = [];
      this._subscribe({
        next: (value) => values.push(value),
        error: (err) => reject(err),
        complete: () => resolve(values)
      });
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
}

// ============================================================================
// Mock ADT Implementations for Testing
// ============================================================================

// Mock Maybe ADT
class MockMaybe {
  constructor(tag, payload) {
    this.tag = tag;
    this.payload = payload;
  }

  match(cases) {
    const handler = cases[this.tag];
    const fallback = cases._ || cases.otherwise;
    
    if (handler) {
      return handler(this.payload);
    } else if (fallback) {
      return fallback(this.tag, this.payload);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }

  matchTag(cases) {
    const handler = cases[this.tag];
    const fallback = cases._ || cases.otherwise;
    
    if (handler) {
      return handler();
    } else if (fallback) {
      return fallback(this.tag);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }

  is(tag) {
    return this.tag === tag;
  }
}

const MockJust = (value) => new MockMaybe('Just', { value });
const MockNothing = () => new MockMaybe('Nothing', {});

// Mock Either ADT
class MockEither {
  constructor(tag, payload) {
    this.tag = tag;
    this.payload = payload;
  }

  match(cases) {
    const handler = cases[this.tag];
    const fallback = cases._ || cases.otherwise;
    
    if (handler) {
      return handler(this.payload);
    } else if (fallback) {
      return fallback(this.tag, this.payload);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }

  matchTag(cases) {
    const handler = cases[this.tag];
    const fallback = cases._ || cases.otherwise;
    
    if (handler) {
      return handler();
    } else if (fallback) {
      return fallback(this.tag);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }

  is(tag) {
    return this.tag === tag;
  }
}

const MockRight = (value) => new MockEither('Right', { value });
const MockLeft = (value) => new MockEither('Left', { value });

// Mock Result ADT
class MockResult {
  constructor(tag, payload) {
    this.tag = tag;
    this.payload = payload;
  }

  match(cases) {
    const handler = cases[this.tag];
    const fallback = cases._ || cases.otherwise;
    
    if (handler) {
      return handler(this.payload);
    } else if (fallback) {
      return fallback(this.tag, this.payload);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }

  matchTag(cases) {
    const handler = cases[this.tag];
    const fallback = cases._ || cases.otherwise;
    
    if (handler) {
      return handler();
    } else if (fallback) {
      return fallback(this.tag);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }

  is(tag) {
    return this.tag === tag;
  }
}

const MockOk = (value) => new MockResult('Ok', { value });
const MockErr = (error) => new MockResult('Err', { error });

// ============================================================================
// Test Functions
// ============================================================================

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`❌ ${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('🧪 Testing ObservableLite ADT Integration...\n');

const testObservableADTIntegration = async () => {
  // Test 1: Basic .match() with Maybe
  console.log('📋 Test 1: Basic .match() with Maybe');
  
  const maybeStream = ObservableLite.fromArray([
    MockJust(42),
    MockNothing(),
    MockJust(100)
  ]);

  const maybeResults = await maybeStream
    .match({
      Just: ({ value }) => `Got ${value}`,
      Nothing: () => "No value"
    })
    .toArray();
  
  const expectedMaybeResults = ["Got 42", "No value", "Got 100"];
  assertEqual(maybeResults, expectedMaybeResults, 'should pattern match Maybe values');

  // Test 2: Basic .match() with Either
  console.log('\n📋 Test 2: Basic .match() with Either');
  
  const eitherStream = ObservableLite.fromArray([
    MockRight(42),
    MockLeft("error"),
    MockRight(100)
  ]);

  const eitherResults = await eitherStream
    .match({
      Right: ({ value }) => `Success: ${value}`,
      Left: ({ value }) => `Error: ${value}`
    })
    .toArray();
  
  const expectedEitherResults = ["Success: 42", "Error: error", "Success: 100"];
  assertEqual(eitherResults, expectedEitherResults, 'should pattern match Either values');

  // Test 3: Basic .match() with Result
  console.log('\n📋 Test 3: Basic .match() with Result');
  
  const resultStream = ObservableLite.fromArray([
    MockOk(42),
    MockErr("Database error"),
    MockOk(100)
  ]);

  const resultResults = await resultStream
    .match({
      Ok: ({ value }) => `Success: ${value}`,
      Err: ({ error }) => `Error: ${error}`
    })
    .toArray();
  
  const expectedResultResults = ["Success: 42", "Error: Database error", "Success: 100"];
  assertEqual(resultResults, expectedResultResults, 'should pattern match Result values');

  // Test 4: .mapMatch() shorthand
  console.log('\n📋 Test 4: .mapMatch() shorthand');
  
  const mapMatchResults = await maybeStream
    .mapMatch({
      Just: ({ value }) => value * 2,
      Nothing: () => 0
    })
    .toArray();
  
  const expectedMapMatchResults = [84, 0, 200];
  assertEqual(mapMatchResults, expectedMapMatchResults, 'should use mapMatch shorthand');

  // Test 5: .bichain() with Either
  console.log('\n📋 Test 5: .bichain() with Either');
  
  const bichainResults = await eitherStream
    .bichain(
      (error) => ObservableLite.fromArray([`Recovered from: ${error}`]),
      (value) => ObservableLite.fromArray([value * 2])
    )
    .toArray();
  
  const expectedBichainResults = [84, "Recovered from: error", 200];
  assertEqual(bichainResults, expectedBichainResults, 'should handle bichain with Either');

  // Test 6: .bichain() with Result
  console.log('\n📋 Test 6: .bichain() with Result');
  
  const bichainResultResults = await resultStream
    .bichain(
      (error) => ObservableLite.fromArray([`Handled error: ${error}`]),
      (value) => ObservableLite.fromArray([value * 2])
    )
    .toArray();
  
  const expectedBichainResultResults = [84, "Handled error: Database error", 200];
  assertEqual(bichainResultResults, expectedBichainResultResults, 'should handle bichain with Result');

  // Test 7: .matchTag() tag-only matching
  console.log('\n📋 Test 7: .matchTag() tag-only matching');
  
  const matchTagResults = await maybeStream
    .matchTag({
      Just: () => "Has value",
      Nothing: () => "No value"
    })
    .toArray();
  
  const expectedMatchTagResults = ["Has value", "No value", "Has value"];
  assertEqual(matchTagResults, expectedMatchTagResults, 'should match tags only');

  // Test 8: .filterTag() filtering
  console.log('\n📋 Test 8: .filterTag() filtering');
  
  const filterTagResults = await maybeStream
    .filterTag('Just')
    .toArray();
  
  const expectedFilterTagResults = [MockJust(42), MockJust(100)];
  assertEqual(filterTagResults, expectedFilterTagResults, 'should filter by tag');

  // Test 9: .extractValues() extraction
  console.log('\n📋 Test 9: .extractValues() extraction');
  
  const extractValuesResults = await maybeStream
    .extractValues()
    .toArray();
  
  const expectedExtractValuesResults = [42, 100];
  assertEqual(extractValuesResults, expectedExtractValuesResults, 'should extract values from success cases');

  // Test 10: .extractErrors() extraction
  console.log('\n📋 Test 10: .extractErrors() extraction');
  
  const extractErrorsResults = await eitherStream
    .extractErrors()
    .toArray();
  
  const expectedExtractErrorsResults = ["error"];
  assertEqual(extractErrorsResults, expectedExtractErrorsResults, 'should extract errors from error cases');

  // Test 11: Partial matching with fallback
  console.log('\n📋 Test 11: Partial matching with fallback');
  
  const partialResults = await maybeStream
    .match({
      Just: ({ value }) => `Got ${value}`,
      _: (tag, payload) => `Unhandled: ${tag}`
    })
    .toArray();
  
  const expectedPartialResults = ["Got 42", "Unhandled: Nothing", "Got 100"];
  assertEqual(partialResults, expectedPartialResults, 'should handle partial matching with fallback');

  // Test 12: Fluent chaining with ADT methods
  console.log('\n📋 Test 12: Fluent chaining with ADT methods');
  
  const chainedResults = await maybeStream
    .filterTag('Just')
    .extractValues()
    .map(x => x * 2)
    .toArray();
  
  const expectedChainedResults = [84, 200];
  assertEqual(chainedResults, expectedChainedResults, 'should chain ADT methods fluently');

  // Test 13: Error handling with invalid ADT
  console.log('\n📋 Test 13: Error handling with invalid ADT');
  
  const invalidStream = ObservableLite.fromArray([
    MockJust(42),
    { invalid: 'data' }, // This will cause an error
    MockJust(100)
  ]);
  
  try {
    await invalidStream.match({
      Just: ({ value }) => `Got ${value}`,
      Nothing: () => "No value"
    }).toArray();
    console.error('❌ should reject on invalid ADT');
    process.exit(1);
  } catch (error) {
    console.log('✅ should reject on invalid ADT');
  }

  // Test 14: Non-ADT values with fallback
  console.log('\n📋 Test 14: Non-ADT values with fallback');
  
  const nonADTStream = ObservableLite.fromArray([
    "hello",
    42,
    { custom: "data" }
  ]);
  
  const nonADTResults = await nonADTStream
    .match({
      _: (tag, payload) => `Unknown: ${JSON.stringify(payload)}`
    })
    .toArray();
  
  const expectedNonADTResults = ['Unknown: "hello"', 'Unknown: 42', 'Unknown: {"custom":"data"}'];
  assertEqual(nonADTResults, expectedNonADTResults, 'should handle non-ADT values with fallback');

  console.log('\n✅ All ObservableLite ADT Integration tests passed!');
};

// Run the tests
testObservableADTIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 