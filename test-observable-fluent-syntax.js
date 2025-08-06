/**
 * ObservableLite Fluent Syntax Test Suite
 * 
 * This tests the fluent method syntax on ObservableLite:
 * - .map(fn) — Functor mapping
 * - .chain(fn) — Monad chaining / flatMap
 * - .filter(predicate) — Keep only matching values
 * - .bimap(f, g) — Map error/success channels
 * - .mapOver(optic, f) — Lens/Prism mapping
 * - .preview(optic) — Lens/Prism preview
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

  bimap(f, g) {
    return new ObservableLite(this.values.map(f));
  }

  over(optic, fn) {
    return new ObservableLite(this.values.map(value => {
      if (optic && typeof optic.get === 'function') {
        const focused = optic.get(value);
        const transformed = fn(focused);
        return optic.set ? optic.set(transformed, value) : value;
      }
      return value;
    }));
  }

  preview(optic) {
    return new ObservableLite(this.values.map(value => {
      if (optic && typeof optic.get === 'function') {
        return optic.get(value);
      }
      return value;
    }));
  }

  mapOver(optic, fn) {
    return this.over(optic, fn);
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

// Mock optics for testing
const createLens = (get, set) => ({ get, set });
const createPrism = (match, build) => ({ match, build });

// Test utilities
function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function collectValues(observable) {
  return await observable.toArray();
}

console.log('🧪 Testing ObservableLite Fluent Syntax...\n');

const testObservableFluentSyntax = async () => {
  // Test 1: Basic map operator (Functor)
  console.log('📋 Test 1: Basic map operator (Functor)');
  
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

  // Test 3: Basic chain operator (Monad)
  console.log('\n📋 Test 3: Basic chain operator (Monad)');
  
  const chainResults = await ObservableLite.fromArray([1, 2, 3])
    .chain(x => ObservableLite.fromArray([x, x * 2]))
    .toArray();
  
  assertEqual(chainResults, [1, 2, 2, 4, 3, 6], 'should chain values correctly');
  console.log('✅ chain operator works correctly');

  // Test 4: Basic bimap operator
  console.log('\n📋 Test 4: Basic bimap operator');
  
  const bimapResults = await ObservableLite.fromArray([1, 2, 3])
    .bimap(x => x * 2, err => `Error: ${err}`)
    .toArray();
  
  assertEqual(bimapResults, [2, 4, 6], 'should bimap values correctly');
  console.log('✅ bimap operator works correctly');

  // Test 5: Basic mapOver operator with lens
  console.log('\n📋 Test 5: Basic mapOver operator with lens');
  
  const nameLens = createLens(
    (user) => user.name,
    (name, user) => ({ ...user, name })
  );
  
  const mapOverResults = await ObservableLite.fromArray([
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ])
    .mapOver(nameLens, name => name.toUpperCase())
    .toArray();
  
  assertEqual(mapOverResults, [
    { name: 'ALICE', age: 25 },
    { name: 'BOB', age: 30 }
  ], 'should mapOver with lens correctly');
  console.log('✅ mapOver operator with lens works correctly');

  // Test 6: Basic preview operator with lens
  console.log('\n📋 Test 6: Basic preview operator with lens');
  
  const previewResults = await ObservableLite.fromArray([
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ])
    .preview(nameLens)
    .toArray();
  
  assertEqual(previewResults, ['Alice', 'Bob'], 'should preview with lens correctly');
  console.log('✅ preview operator with lens works correctly');

  // Test 7: Functor laws (identity)
  console.log('\n📋 Test 7: Functor laws (identity)');
  
  const identity = x => x;
  const source = ObservableLite.fromArray([1, 2, 3]);
  const leftSide = await source.map(identity).toArray();
  const rightSide = await source.toArray();
  
  assertEqual(leftSide, rightSide, 'Functor identity law should hold');
  console.log('✅ Functor identity law holds');

  // Test 8: Functor laws (composition)
  console.log('\n📋 Test 8: Functor laws (composition)');
  
  const f = x => x * 2;
  const g = x => x + 1;
  const leftSide2 = await source.map(f).map(g).toArray();
  const rightSide2 = await source.map(x => g(f(x))).toArray();
  
  assertEqual(leftSide2, rightSide2, 'Functor composition law should hold');
  console.log('✅ Functor composition law holds');

  // Test 9: Monad laws (left identity)
  console.log('\n📋 Test 9: Monad laws (left identity)');
  
  const leftSide3 = await ObservableLite.of(5).chain(x => ObservableLite.of(x * 2)).toArray();
  const rightSide3 = await ObservableLite.of(5 * 2).toArray();
  
  assertEqual(leftSide3, rightSide3, 'Monad left identity law should hold');
  console.log('✅ Monad left identity law holds');

  // Test 10: Monad laws (right identity)
  console.log('\n📋 Test 10: Monad laws (right identity)');
  
  const leftSide4 = await source.chain(x => ObservableLite.of(x)).toArray();
  const rightSide4 = await source.toArray();
  
  assertEqual(leftSide4, rightSide4, 'Monad right identity law should hold');
  console.log('✅ Monad right identity law holds');

  // Test 11: Monad laws (associativity)
  console.log('\n📋 Test 11: Monad laws (associativity)');
  
  const f1 = x => ObservableLite.fromArray([x, x + 1]);
  const g1 = x => ObservableLite.fromArray([x * 2, x * 3]);
  
  const leftSide5 = await source.chain(f1).chain(g1).toArray();
  const rightSide5 = await source.chain(x => f1(x).chain(g1)).toArray();
  
  assertEqual(leftSide5, rightSide5, 'Monad associativity law should hold');
  console.log('✅ Monad associativity law holds');

  // Test 12: Fluent chaining (no .pipe() needed)
  console.log('\n📋 Test 12: Fluent chaining (no .pipe() needed)');
  
  const chainedResults = await ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .filter(x => x % 2 === 0) // [2, 4, 6, 8, 10]
    .map(x => x * 2) // [4, 8, 12, 16, 20]
    .chain(x => ObservableLite.fromArray([x, x + 1])) // [4,5, 8,9, 12,13, 16,17, 20,21]
    .toArray();
  
  assertEqual(chainedResults, [4, 5, 8, 9, 12, 13, 16, 17, 20, 21], 'should chain fluently without .pipe()');
  console.log('✅ fluent chaining works correctly');

  // Test 13: Optics integration in reactive flows
  console.log('\n📋 Test 13: Optics integration in reactive flows');
  
  const ageLens = createLens(
    (user) => user.age,
    (age, user) => ({ ...user, age })
  );
  
  const opticsResults = await ObservableLite.fromArray([
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
    { name: 'Charlie', age: 35 }
  ])
    .filter(user => user.age > 25) // [Bob, Charlie]
    .mapOver(nameLens, name => name.toUpperCase()) // [BOB, CHARLIE]
    .preview(ageLens) // [30, 35]
    .map(age => age * 2) // [60, 70]
    .toArray();
  
  assertEqual(opticsResults, [60, 70], 'should integrate optics in reactive flows');
  console.log('✅ optics integration in reactive flows works correctly');

  // Test 14: ADT/Observable uniformity
  console.log('\n📋 Test 14: ADT/Observable uniformity');
  
  // Simulate ADT-like behavior
  const adtResults = await ObservableLite.fromArray([1, 2, 3])
    .map(x => x * 2) // Same as ADT.map
    .filter(x => x > 2) // Same as ADT.filter
    .chain(x => ObservableLite.of(x + 1)) // Same as ADT.chain
    .toArray();
  
  assertEqual(adtResults, [5, 7], 'should behave uniformly with ADTs');
  console.log('✅ ADT/Observable uniformity works correctly');

  // Test 15: Complex optic composition
  console.log('\n📋 Test 15: Complex optic composition');
  
  const userLens = createLens(
    (data) => data.user,
    (user, data) => ({ ...data, user })
  );
  
  const complexResults = await ObservableLite.fromArray([
    { user: { name: 'Alice', age: 25 } },
    { user: { name: 'Bob', age: 30 } }
  ])
    .mapOver(userLens, user => ({ ...user, age: user.age + 1 }))
    .preview(userLens)
    .mapOver(nameLens, name => name.toLowerCase())
    .toArray();
  
  assertEqual(complexResults, [
    { name: 'alice', age: 26 },
    { name: 'bob', age: 31 }
  ], 'should compose optics correctly');
  console.log('✅ complex optic composition works correctly');

  console.log('\n✅ All ObservableLite Fluent Syntax tests passed!');
};

// Run the tests
testObservableFluentSyntax().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 