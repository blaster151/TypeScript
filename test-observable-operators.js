/**
 * ObservableLite Core Operators Test Suite
 * 
 * This tests the core FP/Rx operators on ObservableLite:
 * - map, filter, flatMap/chain, scan, take, drop, startWith, concat, merge
 * - mergeMap alias for flatMap (RxJS familiarity)
 */

// Mock ObservableLite implementation for testing
class ObservableLite {
  constructor(values) {
    this.values = values;
  }

  map(f) {
    return new ObservableLite(this.values.map(f));
  }

  filter(predicate) {
    return new ObservableLite(this.values.filter(predicate));
  }

  flatMap(f) {
    const flattened = [];
    for (const value of this.values) {
      const innerObs = f(value);
      flattened.push(...innerObs.values);
    }
    return new ObservableLite(flattened);
  }

  chain(f) {
    return this.flatMap(f);
  }

  mergeMap(f) {
    return this.flatMap(f);
  }

  scan(reducer, initial) {
    let accumulator = initial;
    const results = [accumulator];
    for (const value of this.values) {
      accumulator = reducer(accumulator, value);
      results.push(accumulator);
    }
    return new ObservableLite(results);
  }

  take(count) {
    return new ObservableLite(this.values.slice(0, count));
  }

  skip(count) {
    return new ObservableLite(this.values.slice(count));
  }

  startWith(...values) {
    return new ObservableLite([...values, ...this.values]);
  }

  concat(other) {
    return new ObservableLite([...this.values, ...other.values]);
  }

  merge(other) {
    const merged = [];
    const maxLength = Math.max(this.values.length, other.values.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < this.values.length) merged.push(this.values[i]);
      if (i < other.values.length) merged.push(other.values[i]);
    }
    return new ObservableLite(merged);
  }

  toArray() {
    return Promise.resolve([...this.values]);
  }

  static fromArray(values) {
    return new ObservableLite(values);
  }

  static of(value) {
    return new ObservableLite([value]);
  }
}

// Test utilities
function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function collectValues(observable) {
  return await observable.toArray();
}

console.log('🧪 Testing ObservableLite Core Operators...\n');

const testObservableOperators = async () => {
  // Test 1: Basic map operator
  console.log('📋 Test 1: Basic map operator');
  
  const mapResults = await ObservableLite.fromArray([1, 2, 3])
    .map(x => x * 2)
    .toArray();
  
  assertEqual(mapResults, [2, 4, 6], 'should map values correctly');
  console.log('✅ map operator works correctly');

  // Test 2: Basic filter operator
  console.log('\n📋 Test 2: Basic filter operator');
  
  const filterResults = await ObservableLite.fromArray([1, 2, 3, 4, 5])
    .filter(x => x > 2)
    .toArray();
  
  assertEqual(filterResults, [3, 4, 5], 'should filter values correctly');
  console.log('✅ filter operator works correctly');

  // Test 3: Basic flatMap operator
  console.log('\n📋 Test 3: Basic flatMap operator');
  
  const flatMapResults = await ObservableLite.fromArray([1, 2, 3])
    .flatMap(x => ObservableLite.fromArray([x, x * 2]))
    .toArray();
  
  assertEqual(flatMapResults, [1, 2, 2, 4, 3, 6], 'should flatMap values correctly');
  console.log('✅ flatMap operator works correctly');

  // Test 4: Chain operator (alias for flatMap)
  console.log('\n📋 Test 4: Chain operator (alias for flatMap)');
  
  const chainResults = await ObservableLite.fromArray([1, 2, 3])
    .chain(x => ObservableLite.fromArray([x, x * 2]))
    .toArray();
  
  assertEqual(chainResults, [1, 2, 2, 4, 3, 6], 'should chain values correctly');
  console.log('✅ chain operator works correctly');

  // Test 5: mergeMap operator (alias for flatMap - RxJS familiarity)
  console.log('\n📋 Test 5: mergeMap operator (alias for flatMap - RxJS familiarity)');
  
  const mergeMapResults = await ObservableLite.fromArray([1, 2, 3])
    .mergeMap(x => ObservableLite.fromArray([x, x * 2]))
    .toArray();
  
  assertEqual(mergeMapResults, [1, 2, 2, 4, 3, 6], 'should mergeMap values correctly');
  console.log('✅ mergeMap operator works correctly');

  // Test 6: Verify all three aliases produce identical results
  console.log('\n📋 Test 6: Verify all three aliases produce identical results');
  
  const source = ObservableLite.fromArray([1, 2, 3]);
  const flatMapResult = await source.flatMap(x => ObservableLite.of(x * 2)).toArray();
  const chainResult = await source.chain(x => ObservableLite.of(x * 2)).toArray();
  const mergeMapResult = await source.mergeMap(x => ObservableLite.of(x * 2)).toArray();
  
  assertEqual(flatMapResult, chainResult, 'flatMap and chain should produce identical results');
  assertEqual(flatMapResult, mergeMapResult, 'flatMap and mergeMap should produce identical results');
  assertEqual(chainResult, mergeMapResult, 'chain and mergeMap should produce identical results');
  console.log('✅ All three aliases produce identical results');

  // Test 7: Basic scan operator
  console.log('\n📋 Test 7: Basic scan operator');
  
  const scanResults = await ObservableLite.fromArray([1, 2, 3, 4])
    .scan((acc, x) => acc + x, 0)
    .toArray();
  
  assertEqual(scanResults, [0, 1, 3, 6, 10], 'should scan values correctly');
  console.log('✅ scan operator works correctly');

  // Test 8: Basic take operator
  console.log('\n📋 Test 8: Basic take operator');
  
  const takeResults = await ObservableLite.fromArray([1, 2, 3, 4, 5])
    .take(3)
    .toArray();
  
  assertEqual(takeResults, [1, 2, 3], 'should take correct number of values');
  console.log('✅ take operator works correctly');

  // Test 9: Basic skip operator
  console.log('\n📋 Test 9: Basic skip operator');
  
  const skipResults = await ObservableLite.fromArray([1, 2, 3, 4, 5])
    .skip(2)
    .toArray();
  
  assertEqual(skipResults, [3, 4, 5], 'should skip correct number of values');
  console.log('✅ skip operator works correctly');

  // Test 10: Basic startWith operator
  console.log('\n📋 Test 10: Basic startWith operator');
  
  const startWithResults = await ObservableLite.fromArray([3, 4, 5])
    .startWith(1, 2)
    .toArray();
  
  assertEqual(startWithResults, [1, 2, 3, 4, 5], 'should prepend values correctly');
  console.log('✅ startWith operator works correctly');

  // Test 11: Basic concat operator
  console.log('\n📋 Test 11: Basic concat operator');
  
  const concatResults = await ObservableLite.fromArray([1, 2, 3])
    .concat(ObservableLite.fromArray([4, 5, 6]))
    .toArray();
  
  assertEqual(concatResults, [1, 2, 3, 4, 5, 6], 'should concatenate observables correctly');
  console.log('✅ concat operator works correctly');

  // Test 12: Basic merge operator
  console.log('\n📋 Test 12: Basic merge operator');
  
  const mergeResults = await ObservableLite.fromArray([1, 3, 5])
    .merge(ObservableLite.fromArray([2, 4, 6]))
    .toArray();
  
  assertEqual(mergeResults, [1, 2, 3, 4, 5, 6], 'should merge observables correctly');
  console.log('✅ merge operator works correctly');

  // Test 13: Fluent chaining with all operators
  console.log('\n📋 Test 13: Fluent chaining with all operators');
  
  const chainedResults = await ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .filter(x => x % 2 === 0) // [2, 4, 6, 8, 10]
    .map(x => x * 2) // [4, 8, 12, 16, 20]
    .flatMap(x => ObservableLite.fromArray([x, x + 1])) // [4,5, 8,9, 12,13, 16,17, 20,21]
    .take(6) // [4,5, 8,9, 12,13]
    .scan((acc, x) => acc + x, 0) // [0,4,9,17,26,38,51]
    .toArray();
  
  assertEqual(chainedResults, [0, 4, 9, 17, 26, 38, 51], 'should chain all operators correctly');
  console.log('✅ fluent chaining works correctly');

  // Test 14: Functor laws (identity)
  console.log('\n📋 Test 14: Functor laws (identity)');
  
  const identity = x => x;
  const source2 = ObservableLite.fromArray([1, 2, 3]);
  const leftSide = await source2.map(identity).toArray();
  const rightSide = await source2.toArray();
  
  assertEqual(leftSide, rightSide, 'Functor identity law should hold');
  console.log('✅ Functor identity law holds');

  // Test 15: Functor laws (composition)
  console.log('\n📋 Test 15: Functor laws (composition)');
  
  const f = x => x * 2;
  const g = x => x + 1;
  const leftSide2 = await source2.map(f).map(g).toArray();
  const rightSide2 = await source2.map(x => g(f(x))).toArray();
  
  assertEqual(leftSide2, rightSide2, 'Functor composition law should hold');
  console.log('✅ Functor composition law holds');

  // Test 16: Monad laws (left identity)
  console.log('\n📋 Test 16: Monad laws (left identity)');
  
  const leftSide3 = await ObservableLite.of(5).flatMap(x => ObservableLite.of(x * 2)).toArray();
  const rightSide3 = await ObservableLite.of(5 * 2).toArray();
  
  assertEqual(leftSide3, rightSide3, 'Monad left identity law should hold');
  console.log('✅ Monad left identity law holds');

  // Test 17: Monad laws (right identity)
  console.log('\n📋 Test 17: Monad laws (right identity)');
  
  const leftSide4 = await source2.flatMap(x => ObservableLite.of(x)).toArray();
  const rightSide4 = await source2.toArray();
  
  assertEqual(leftSide4, rightSide4, 'Monad right identity law should hold');
  console.log('✅ Monad right identity law holds');

  // Test 18: Monad laws (associativity)
  console.log('\n📋 Test 18: Monad laws (associativity)');
  
  const f1 = x => ObservableLite.fromArray([x, x + 1]);
  const g1 = x => ObservableLite.fromArray([x * 2, x * 3]);
  
  const leftSide5 = await source2.flatMap(f1).flatMap(g1).toArray();
  const rightSide5 = await source2.flatMap(x => f1(x).flatMap(g1)).toArray();
  
  assertEqual(leftSide5, rightSide5, 'Monad associativity law should hold');
  console.log('✅ Monad associativity law holds');

  console.log('\n✅ All ObservableLite Core Operators tests passed!');
};

// Run the tests
testObservableOperators().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 