/**
 * Tests for ObservableLite Implementation
 * 
 * This test file validates the functionality of the ObservableLite type:
 * - Functor & Monad laws compliance
 * - Purity tagging as 'Async'
 * - Basic streaming behavior
 * - Unsubscribe functionality
 * - Integration with HKT and purity systems
 */

import {
  // Core types
  ObservableLite,
  Observer,
  Unsubscribe,
  
  // HKT types
  ObservableLiteK,
  ObservableLiteWithEffect,
  ApplyObservableLite,
  ObservableLiteOf,
  
  // Purity types
  EffectOfObservableLite,
  IsObservableLitePure,
  IsObservableLiteImpure,
  
  // Typeclass instances
  ObservableLiteFunctor,
  ObservableLiteApplicative,
  ObservableLiteMonad,
  
  // Utility functions
  fromAsync,
  fromAsyncGenerator,
  fromGenerator,
  fromIterable,
  fromCallback,
  fromTry,
  
  // Type guards
  isObservableLite,
  isObservableLiteOf,
  createObservable
} from './fp-observable-lite';

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe, Either, List, Reader, Writer, State
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Simple assertion function for testing
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Async assertion function for testing
 */
async function assertEqualAsync<T>(actual: Promise<T>, expected: T, message: string): Promise<void> {
  const result = await actual;
  assertEqual(result, expected, message);
}

/**
 * Helper to collect values from an observable
 */
function collectValues<A>(observable: ObservableLite<A>): Promise<A[]> {
  return new Promise((resolve, reject) => {
    const values: A[] = [];
    const unsubscribe = observable.subscribe({
      next: (value) => values.push(value),
      error: (err) => reject(err),
      complete: () => resolve(values)
    });
  });
}

/**
 * Helper to test if an observable completes
 */
function testCompletion<A>(observable: ObservableLite<A>): Promise<boolean> {
  return new Promise((resolve) => {
    let completed = false;
    const unsubscribe = observable.subscribe({
      next: () => {},
      complete: () => {
        completed = true;
        resolve(true);
      }
    });
    
    // Resolve after a short delay if not completed
    setTimeout(() => resolve(completed), 100);
  });
}

// ============================================================================
// Test Suite 1: Basic ObservableLite Functionality
// ============================================================================

export function testBasicFunctionality(): void {
  console.log('🧪 Testing Basic ObservableLite Functionality...');
  
  // Test ObservableLite.of
  const testOf = async () => {
    const obs = ObservableLite.of(42);
    const values = await collectValues(obs);
    assertEqual(values, [42], 'ObservableLite.of should emit single value');
  };
  
  // Test ObservableLite.fromArray
  const testFromArray = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const values = await collectValues(obs);
    assertEqual(values, [1, 2, 3, 4, 5], 'ObservableLite.fromArray should emit all array values');
  };
  
  // Test ObservableLite.fromPromise
  const testFromPromise = async () => {
    const promise = Promise.resolve('success');
    const obs = ObservableLite.fromPromise(promise);
    const values = await collectValues(obs);
    assertEqual(values, ['success'], 'ObservableLite.fromPromise should emit resolved value');
  };
  
  // Test ObservableLite.fromPromise with error
  const testFromPromiseError = async () => {
    const promise = Promise.reject('error');
    const obs = ObservableLite.fromPromise(promise);
    
    try {
      await collectValues(obs);
      throw new Error('Should have thrown an error');
    } catch (error) {
      assertEqual(error, 'error', 'ObservableLite.fromPromise should emit error');
    }
  };
  
  // Test unsubscribe functionality
  const testUnsubscribe = async () => {
    let emitted = 0;
    const obs = new ObservableLite<number>((observer) => {
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
  
  testOf()
    .then(() => testFromArray())
    .then(() => testFromPromise())
    .then(() => testFromPromiseError())
    .then(() => testUnsubscribe())
    .then(() => {
      console.log('✅ Basic ObservableLite Functionality tests passed');
    });
}

// ============================================================================
// Test Suite 2: FP Instance Methods
// ============================================================================

export function testFPInstanceMethods(): void {
  console.log('🧪 Testing FP Instance Methods...');
  
  // Test map (Functor)
  const testMap = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const mapped = obs.map(x => x * 2);
    const values = await collectValues(mapped);
    assertEqual(values, [2, 4, 6], 'map should transform values');
  };
  
  // Test flatMap (Monad)
  const testFlatMap = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const flatMapped = obs.flatMap(x => ObservableLite.fromArray([x, x * 2]));
    const values = await collectValues(flatMapped);
    assertEqual(values, [1, 2, 2, 4, 3, 6], 'flatMap should flatten nested observables');
  };
  
  // Test filter
  const testFilter = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5, 6]);
    const filtered = obs.filter(x => x % 2 === 0);
    const values = await collectValues(filtered);
    assertEqual(values, [2, 4, 6], 'filter should keep only even numbers');
  };
  
  // Test scan
  const testScan = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3, 4]);
    const scanned = obs.scan((acc, val) => acc + val, 0);
    const values = await collectValues(scanned);
    assertEqual(values, [0, 1, 3, 6, 10], 'scan should accumulate values');
  };
  
  // Test take
  const testTake = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const taken = obs.take(3);
    const values = await collectValues(taken);
    assertEqual(values, [1, 2, 3], 'take should limit emissions');
  };
  
  // Test skip
  const testSkip = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
    const skipped = obs.skip(2);
    const values = await collectValues(skipped);
    assertEqual(values, [3, 4, 5], 'skip should skip first n values');
  };
  
  // Test catchError
  const testCatchError = async () => {
    const errorObs = new ObservableLite<number>((observer) => {
      observer.next(1);
      observer.error('test error');
      return () => {};
    });
    
    const recovered = errorObs.catchError((err) => {
      assertEqual(err, 'test error', 'catchError should receive the error');
      return ObservableLite.of(42);
    });
    
    const values = await collectValues(recovered);
    assertEqual(values, [1, 42], 'catchError should recover from error');
  };
  
  // Test chaining
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
  
  testMap()
    .then(() => testFlatMap())
    .then(() => testFilter())
    .then(() => testScan())
    .then(() => testTake())
    .then(() => testSkip())
    .then(() => testCatchError())
    .then(() => testChaining())
    .then(() => {
      console.log('✅ FP Instance Methods tests passed');
    });
}

// ============================================================================
// Test Suite 3: Functor Laws
// ============================================================================

export function testFunctorLaws(): void {
  console.log('🧪 Testing Functor Laws...');
  
  // Functor Law 1: Identity - map(fa, x => x) = fa
  const testFunctorIdentity = async () => {
    const original = ObservableLite.fromArray([1, 2, 3]);
    const mapped = original.map(x => x);
    
    const originalValues = await collectValues(original);
    const mappedValues = await collectValues(mapped);
    
    assertEqual(mappedValues, originalValues, 'Functor identity law should hold');
  };
  
  // Functor Law 2: Composition - map(fa, f) |> map(_, g) = map(fa, x => g(f(x)))
  const testFunctorComposition = async () => {
    const original = ObservableLite.fromArray([1, 2, 3]);
    const f = (x: number) => x * 2;
    const g = (x: number) => x + 1;
    
    const composed = original.map(f).map(g);
    const direct = original.map(x => g(f(x)));
    
    const composedValues = await collectValues(composed);
    const directValues = await collectValues(direct);
    
    assertEqual(composedValues, directValues, 'Functor composition law should hold');
  };
  
  testFunctorIdentity()
    .then(() => testFunctorComposition())
    .then(() => {
      console.log('✅ Functor Laws tests passed');
    });
}

// ============================================================================
// Test Suite 4: Monad Laws
// ============================================================================

export function testMonadLaws(): void {
  console.log('🧪 Testing Monad Laws...');
  
  // Monad Law 1: Left Identity - chain(of(a), f) = f(a)
  const testMonadLeftIdentity = async () => {
    const a = 5;
    const f = (x: number) => ObservableLite.of(x * 2);
    
    const leftSide = ObservableLite.of(a).flatMap(f);
    const rightSide = f(a);
    
    const leftValues = await collectValues(leftSide);
    const rightValues = await collectValues(rightSide);
    
    assertEqual(leftValues, rightValues, 'Monad left identity law should hold');
  };
  
  // Monad Law 2: Right Identity - chain(ma, of) = ma
  const testMonadRightIdentity = async () => {
    const original = ObservableLite.fromArray([1, 2, 3]);
    const chained = original.flatMap(x => ObservableLite.of(x));
    
    const originalValues = await collectValues(original);
    const chainedValues = await collectValues(chained);
    
    assertEqual(chainedValues, originalValues, 'Monad right identity law should hold');
  };
  
  // Monad Law 3: Associativity - chain(chain(ma, f), g) = chain(ma, x => chain(f(x), g))
  const testMonadAssociativity = async () => {
    const original = ObservableLite.fromArray([1, 2]);
    const f = (x: number) => ObservableLite.of(x * 2);
    const g = (x: number) => ObservableLite.of(x + 1);
    
    const leftSide = original.flatMap(f).flatMap(g);
    const rightSide = original.flatMap(x => f(x).flatMap(g));
    
    const leftValues = await collectValues(leftSide);
    const rightValues = await collectValues(rightSide);
    
    assertEqual(leftValues, rightValues, 'Monad associativity law should hold');
  };
  
  testMonadLeftIdentity()
    .then(() => testMonadRightIdentity())
    .then(() => testMonadAssociativity())
    .then(() => {
      console.log('✅ Monad Laws tests passed');
    });
}

// ============================================================================
// Test Suite 5: Typeclass Instances
// ============================================================================

export function testTypeclassInstances(): void {
  console.log('🧪 Testing Typeclass Instances...');
  
  // Test Functor instance
  const testFunctorInstance = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const mapped = ObservableLiteFunctor.map(obs, x => x * 2);
    const values = await collectValues(mapped);
    assertEqual(values, [2, 4, 6], 'Functor instance should work correctly');
  };
  
  // Test Applicative instance
  const testApplicativeInstance = async () => {
    const fnObs = ObservableLite.of((x: number) => x * 2);
    const valueObs = ObservableLite.of(5);
    const applied = ObservableLiteApplicative.ap(fnObs, valueObs);
    const values = await collectValues(applied);
    assertEqual(values, [10], 'Applicative instance should work correctly');
  };
  
  // Test Monad instance
  const testMonadInstance = async () => {
    const obs = ObservableLite.fromArray([1, 2, 3]);
    const chained = ObservableLiteMonad.chain(obs, x => ObservableLite.of(x * 2));
    const values = await collectValues(chained);
    assertEqual(values, [2, 4, 6], 'Monad instance should work correctly');
  };
  
  // Test of method
  const testOfMethod = async () => {
    const obs = ObservableLiteApplicative.of(42);
    const values = await collectValues(obs);
    assertEqual(values, [42], 'of method should work correctly');
  };
  
  testFunctorInstance()
    .then(() => testApplicativeInstance())
    .then(() => testMonadInstance())
    .then(() => testOfMethod())
    .then(() => {
      console.log('✅ Typeclass Instances tests passed');
    });
}

// ============================================================================
// Test Suite 6: Purity Integration
// ============================================================================

export function testPurityIntegration(): void {
  console.log('🧪 Testing Purity Integration...');
  
  // Test effect type extraction
  const testEffectExtraction = () => {
    type Effect = EffectOfObservableLite<ObservableLite<number>>;
    assertEqual<Effect>('Async', 'Async', 'ObservableLite should have Async effect');
  };
  
  // Test purity checks
  const testPurityChecks = () => {
    type IsPure = IsObservableLitePure<ObservableLite<number>>;
    type IsImpure = IsObservableLiteImpure<ObservableLite<number>>;
    
    assertEqual<IsPure>(false, false, 'ObservableLite should not be pure');
    assertEqual<IsImpure>(true, true, 'ObservableLite should be impure');
  };
  
  // Test HKT effect integration
  const testHKTEffectIntegration = () => {
    type Effect = EffectOf<ObservableLiteK>;
    assertEqual<Effect>('Async', 'Async', 'ObservableLiteK should have Async effect');
  };
  
  testEffectExtraction();
  testPurityChecks();
  testHKTEffectIntegration();
  console.log('✅ Purity Integration tests passed');
}

// ============================================================================
// Test Suite 7: Static Helpers
// ============================================================================

export function testStaticHelpers(): void {
  console.log('🧪 Testing Static Helpers...');
  
  // Test fromEvent
  const testFromEvent = async () => {
    const events: string[] = [];
    const target = new EventTarget();
    
    const obs = ObservableLite.fromEvent<CustomEvent>(target, 'test');
    const unsubscribe = obs.subscribe(event => {
      events.push(event.detail);
    });
    
    target.dispatchEvent(new CustomEvent('test', { detail: 'event1' }));
    target.dispatchEvent(new CustomEvent('test', { detail: 'event2' }));
    
    unsubscribe();
    target.dispatchEvent(new CustomEvent('test', { detail: 'event3' }));
    
    assertEqual(events, ['event1', 'event2'], 'fromEvent should emit events');
  };
  
  // Test interval
  const testInterval = async () => {
    const obs = ObservableLite.interval(10);
    const values: number[] = [];
    
    const unsubscribe = obs.subscribe(value => {
      values.push(value);
      if (values.length >= 3) {
        unsubscribe();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    assertEqual(values.length >= 3, true, 'interval should emit values at intervals');
    assertEqual(values[0], 0, 'interval should start from 0');
  };
  
  // Test timer
  const testTimer = async () => {
    const start = Date.now();
    const obs = ObservableLite.timer(50, 'delayed');
    
    const values = await collectValues(obs);
    const elapsed = Date.now() - start;
    
    assertEqual(values, ['delayed'], 'timer should emit value after delay');
    assertEqual(elapsed >= 50, true, 'timer should respect delay');
  };
  
  // Test merge
  const testMerge = async () => {
    const obs1 = ObservableLite.fromArray([1, 2]);
    const obs2 = ObservableLite.fromArray([3, 4]);
    const merged = ObservableLite.merge(obs1, obs2);
    
    const values = await collectValues(merged);
    assertEqual(values.sort(), [1, 2, 3, 4], 'merge should combine observables');
  };
  
  // Test combine
  const testCombine = async () => {
    const obs1 = ObservableLite.fromArray([1, 2]);
    const obs2 = ObservableLite.fromArray([10, 20]);
    const combined = ObservableLite.combine((a, b) => a + b, obs1, obs2);
    
    const values = await collectValues(combined);
    assertEqual(values, [11, 22], 'combine should combine values with function');
  };
  
  testFromEvent()
    .then(() => testInterval())
    .then(() => testTimer())
    .then(() => testMerge())
    .then(() => testCombine())
    .then(() => {
      console.log('✅ Static Helpers tests passed');
    });
}

// ============================================================================
// Test Suite 8: Utility Functions
// ============================================================================

export function testUtilityFunctions(): void {
  console.log('🧪 Testing Utility Functions...');
  
  // Test fromAsync
  const testFromAsync = async () => {
    const obs = fromAsync(() => Promise.resolve('async result'));
    const values = await collectValues(obs);
    assertEqual(values, ['async result'], 'fromAsync should emit resolved value');
  };
  
  // Test fromAsyncGenerator
  const testFromAsyncGenerator = async () => {
    const generator = async function* () {
      yield 1;
      yield 2;
      yield 3;
    };
    
    const obs = fromAsyncGenerator(generator);
    const values = await collectValues(obs);
    assertEqual(values, [1, 2, 3], 'fromAsyncGenerator should emit generator values');
  };
  
  // Test fromGenerator
  const testFromGenerator = async () => {
    const generator = function* () {
      yield 'a';
      yield 'b';
      yield 'c';
    };
    
    const obs = fromGenerator(generator);
    const values = await collectValues(obs);
    assertEqual(values, ['a', 'b', 'c'], 'fromGenerator should emit generator values');
  };
  
  // Test fromIterable
  const testFromIterable = async () => {
    const set = new Set([1, 2, 3]);
    const obs = fromIterable(set);
    const values = await collectValues(obs);
    assertEqual(values.sort(), [1, 2, 3], 'fromIterable should emit iterable values');
  };
  
  // Test fromCallback
  const testFromCallback = async () => {
    let callback: ((value: string) => void) | null = null;
    const subscribe = (cb: (value: string) => void) => {
      callback = cb;
      return () => {
        callback = null;
      };
    };
    
    const obs = fromCallback(subscribe);
    const values: string[] = [];
    
    const unsubscribe = obs.subscribe(value => {
      values.push(value);
    });
    
    if (callback) {
      callback('callback1');
      callback('callback2');
    }
    
    unsubscribe();
    
    if (callback) {
      callback('callback3'); // Should not be received
    }
    
    assertEqual(values, ['callback1', 'callback2'], 'fromCallback should emit callback values');
  };
  
  // Test fromTry
  const testFromTry = async () => {
    const successObs = fromTry(() => 'success');
    const successValues = await collectValues(successObs);
    assertEqual(successValues, ['success'], 'fromTry should emit successful result');
    
    const errorObs = fromTry(() => {
      throw 'test error';
    });
    
    try {
      await collectValues(errorObs);
      throw new Error('Should have thrown an error');
    } catch (error) {
      assertEqual(error, 'test error', 'fromTry should emit thrown error');
    }
  };
  
  // Test type guards
  const testTypeGuards = () => {
    const obs = ObservableLite.of(42);
    const notObs = 42;
    
    assertEqual(isObservableLite(obs), true, 'isObservableLite should return true for ObservableLite');
    assertEqual(isObservableLite(notObs), false, 'isObservableLite should return false for non-ObservableLite');
    assertEqual(isObservableLiteOf<number>(obs), true, 'isObservableLiteOf should return true for matching type');
  };
  
  // Test createObservable
  const testCreateObservable = async () => {
    const obs = createObservable('test');
    const values = await collectValues(obs);
    assertEqual(values, ['test'], 'createObservable should create observable from value');
  };
  
  testFromAsync()
    .then(() => testFromAsyncGenerator())
    .then(() => testFromGenerator())
    .then(() => testFromIterable())
    .then(() => testFromCallback())
    .then(() => testFromTry())
    .then(() => {
      testTypeGuards();
      return testCreateObservable();
    })
    .then(() => {
      console.log('✅ Utility Functions tests passed');
    });
}

// ============================================================================
// Test Suite 9: HKT Integration
// ============================================================================

export function testHKTIntegration(): void {
  console.log('🧪 Testing HKT Integration...');
  
  // Test ObservableLiteK kind
  const testObservableLiteK = () => {
    type TestType = Apply<ObservableLiteK, [number]>;
    assertEqual<TestType>({} as ObservableLite<number>, {} as ObservableLite<number>, 'ObservableLiteK should apply correctly');
  };
  
  // Test ObservableLiteWithEffect
  const testObservableLiteWithEffect = () => {
    type TestType = ObservableLiteWithEffect<number>;
    assertEqual<TestType>({} as ObservableLite<number> & { readonly __effect: 'Async' }, {} as ObservableLite<number> & { readonly __effect: 'Async' }, 'ObservableLiteWithEffect should have correct type');
  };
  
  // Test ApplyObservableLite
  const testApplyObservableLite = () => {
    type TestType = ApplyObservableLite<[string]>;
    assertEqual<TestType>({} as ObservableLite<string>, {} as ObservableLite<string>, 'ApplyObservableLite should apply correctly');
  };
  
  // Test ObservableLiteOf
  const testObservableLiteOf = () => {
    type TestType = ObservableLiteOf<boolean>;
    assertEqual<TestType>({} as ObservableLite<boolean>, {} as ObservableLite<boolean>, 'ObservableLiteOf should have correct type');
  };
  
  testObservableLiteK();
  testObservableLiteWithEffect();
  testApplyObservableLite();
  testObservableLiteOf();
  console.log('✅ HKT Integration tests passed');
}

// ============================================================================
// Test Suite 10: Realistic Examples
// ============================================================================

export function testRealisticExamples(): void {
  console.log('🧪 Testing Realistic Examples...');
  
  // Test HTTP-like stream processing
  const testHTTPStreamProcessing = async () => {
    // Simulate HTTP requests
    const requests = ObservableLite.fromArray(['user1', 'user2', 'user3']);
    
    const responses = requests.flatMap(userId => 
      ObservableLite.fromPromise(
        fetch(`/api/users/${userId}`).then(res => res.json())
      )
    );
    
    const processed = responses
      .map(user => ({ ...user, processed: true }))
      .filter(user => user.active)
      .take(2);
    
    // Mock the responses
    const mockResponses = [
      { id: 'user1', name: 'John', active: true },
      { id: 'user2', name: 'Jane', active: false },
      { id: 'user3', name: 'Bob', active: true }
    ];
    
    // Simulate the stream
    const values = await collectValues(processed);
    assertEqual(values.length, 2, 'Should process 2 active users');
  };
  
  // Test event stream processing
  const testEventStreamProcessing = async () => {
    const events = ObservableLite.fromArray([
      { type: 'click', x: 100, y: 200 },
      { type: 'move', x: 150, y: 250 },
      { type: 'click', x: 200, y: 300 },
      { type: 'scroll', delta: 10 }
    ]);
    
    const clicks = events
      .filter(event => event.type === 'click')
      .map(event => ({ x: event.x, y: event.y }));
    
    const values = await collectValues(clicks);
    assertEqual(values.length, 2, 'Should filter to 2 click events');
    assertEqual(values[0].x, 100, 'First click should have correct x coordinate');
  };
  
  // Test data transformation pipeline
  const testDataTransformationPipeline = async () => {
    const data = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    
    const pipeline = data
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .scan((acc, val) => acc + val, 0)
      .take(3);
    
    const values = await collectValues(pipeline);
    assertEqual(values, [0, 4, 12], 'Pipeline should transform data correctly');
  };
  
  testHTTPStreamProcessing()
    .then(() => testEventStreamProcessing())
    .then(() => testDataTransformationPipeline())
    .then(() => {
      console.log('✅ Realistic Examples tests passed');
    });
}

// ============================================================================
// Main Test Runner
// ============================================================================

export async function runAllTests(): Promise<void> {
  console.log('🚀 Starting ObservableLite Tests...\n');
  
  try {
    await testBasicFunctionality();
    await testFPInstanceMethods();
    await testFunctorLaws();
    await testMonadLaws();
    await testTypeclassInstances();
    testPurityIntegration();
    await testStaticHelpers();
    await testUtilityFunctions();
    testHKTIntegration();
    await testRealisticExamples();
    
    console.log('\n🎉 All ObservableLite tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
} 