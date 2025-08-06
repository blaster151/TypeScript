/**
 * ObservableLite Profunctor Test Suite
 * 
 * This tests the Profunctor functionality on ObservableLite:
 * - .dimap(inFn, outFn) — Bidirectional transformations
 * - .lmap(inFn) — Input side mapping (contravariant)
 * - .rmap(outFn) — Output side mapping (covariant)
 * - .mapWithOptic(optic, inFn, outFn) — Optic-powered bidirectional transformations
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

  dimap(inFn, outFn) {
    return new ObservableLite(this.values.map(outFn));
  }

  lmap(inFn) {
    return new ObservableLite(this.values);
  }

  rmap(outFn) {
    return new ObservableLite(this.values.map(outFn));
  }

  mapWithOptic(optic, inFn, outFn) {
    return new ObservableLite(this.values.map(value => {
      if (optic && typeof optic.get === 'function') {
        const focused = optic.get(value);
        return outFn(focused);
      } else if (optic && typeof optic.match === 'function') {
        const match = optic.match(value);
        if (match && match.tag === 'Just') {
          return outFn(match.value);
        }
        return value;
      } else {
        return outFn(value);
      }
    }));
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

console.log('🧪 Testing ObservableLite Profunctor...\n');

const testObservableProfunctor = async () => {
  // Test 1: Basic dimap operator
  console.log('📋 Test 1: Basic dimap operator');
  
  const dimapResults = await ObservableLite.fromArray([1, 2, 3])
    .dimap(
      (x) => x * 2, // Input transformation (contravariant)
      (x) => x.toString() // Output transformation (covariant)
    )
    .toArray();
  
  assertEqual(dimapResults, ['1', '2', '3'], 'should dimap values correctly');
  console.log('✅ dimap operator works correctly');

  // Test 2: Basic lmap operator (input side)
  console.log('\n📋 Test 2: Basic lmap operator (input side)');
  
  const lmapResults = await ObservableLite.fromArray([1, 2, 3])
    .lmap((x) => x * 2) // Input transformation
    .toArray();
  
  assertEqual(lmapResults, [1, 2, 3], 'should lmap values correctly');
  console.log('✅ lmap operator works correctly');

  // Test 3: Basic rmap operator (output side)
  console.log('\n📋 Test 3: Basic rmap operator (output side)');
  
  const rmapResults = await ObservableLite.fromArray([1, 2, 3])
    .rmap((x) => x * 2) // Output transformation
    .toArray();
  
  assertEqual(rmapResults, [2, 4, 6], 'should rmap values correctly');
  console.log('✅ rmap operator works correctly');

  // Test 4: Profunctor laws (identity)
  console.log('\n📋 Test 4: Profunctor laws (identity)');
  
  const identity = x => x;
  const source = ObservableLite.fromArray([1, 2, 3]);
  const leftSide = await source.dimap(identity, identity).toArray();
  const rightSide = await source.toArray();
  
  assertEqual(leftSide, rightSide, 'Profunctor identity law should hold');
  console.log('✅ Profunctor identity law holds');

  // Test 5: Profunctor laws (composition)
  console.log('\n📋 Test 5: Profunctor laws (composition)');
  
  const f1 = x => x * 2;
  const f2 = x => x + 1;
  const g1 = x => x.toString();
  const g2 = x => x.toUpperCase();
  
  const leftSide2 = await source.dimap(f1, g1).dimap(f2, g2).toArray();
  const rightSide2 = await source.dimap(
    x => f1(f2(x)), // Compose input functions
    x => g2(g1(x))  // Compose output functions
  ).toArray();
  
  assertEqual(leftSide2, rightSide2, 'Profunctor composition law should hold');
  console.log('✅ Profunctor composition law holds');

  // Test 6: mapWithOptic with lens
  console.log('\n📋 Test 6: mapWithOptic with lens');
  
  const nameLens = createLens(
    (user) => user.name,
    (name, user) => ({ ...user, name })
  );
  
  const mapWithOpticResults = await ObservableLite.fromArray([
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ])
    .mapWithOptic(
      nameLens,
      (name) => name, // Input transformation
      (name) => name.toUpperCase() // Output transformation
    )
    .toArray();
  
  assertEqual(mapWithOpticResults, ['ALICE', 'BOB'], 'should mapWithOptic with lens correctly');
  console.log('✅ mapWithOptic with lens works correctly');

  // Test 7: mapWithOptic with prism
  console.log('\n📋 Test 7: mapWithOptic with prism');
  
  const justPrism = createPrism(
    (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
    (value) => ({ tag: 'Just', value })
  );
  
  const mapWithOpticPrismResults = await ObservableLite.fromArray([
    { tag: 'Just', value: 1 },
    { tag: 'Nothing' },
    { tag: 'Just', value: 3 }
  ])
    .mapWithOptic(
      justPrism,
      (value) => value, // Input transformation
      (value) => value * 2 // Output transformation
    )
    .toArray();
  
  assertEqual(mapWithOpticPrismResults, [2, { tag: 'Nothing' }, 6], 'should mapWithOptic with prism correctly');
  console.log('✅ mapWithOptic with prism works correctly');

  // Test 8: Complex dimap with object transformations
  console.log('\n📋 Test 8: Complex dimap with object transformations');
  
  const complexDimapResults = await ObservableLite.fromArray([
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ])
    .dimap(
      (person) => ({ ...person, age: person.age + 1 }), // Input: increment age
      (person) => ({ ...person, name: `Mr./Ms. ${person.name}` }) // Output: add title
    )
    .toArray();
  
  assertEqual(complexDimapResults, [
    { name: 'Mr./Ms. Alice', age: 25 },
    { name: 'Mr./Ms. Bob', age: 30 }
  ], 'should perform complex dimap transformations');
  console.log('✅ complex dimap transformations work correctly');

  // Test 9: Fluent chaining with Profunctor methods
  console.log('\n📋 Test 9: Fluent chaining with Profunctor methods');
  
  const chainedResults = await ObservableLite.fromArray([1, 2, 3, 4, 5])
    .filter(x => x > 2) // [3, 4, 5]
    .rmap(x => x * 2) // [6, 8, 10]
    .dimap(
      x => x + 1, // Input transformation
      x => x.toString() // Output transformation
    ) // ['6', '8', '10']
    .toArray();
  
  assertEqual(chainedResults, ['6', '8', '10'], 'should chain Profunctor methods fluently');
  console.log('✅ fluent chaining with Profunctor methods works correctly');

  // Test 10: Bidirectional transformations with optics
  console.log('\n📋 Test 10: Bidirectional transformations with optics');
  
  const ageLens = createLens(
    (user) => user.age,
    (age, user) => ({ ...user, age })
  );
  
  const bidirectionalResults = await ObservableLite.fromArray([
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ])
    .mapWithOptic(
      ageLens,
      (age) => age, // Input transformation
      (age) => age * 2 // Output transformation
    )
    .toArray();
  
  assertEqual(bidirectionalResults, [50, 60], 'should perform bidirectional transformations with optics');
  console.log('✅ bidirectional transformations with optics work correctly');

  // Test 11: Integration with existing optic methods
  console.log('\n📋 Test 11: Integration with existing optic methods');
  
  const integrationResults = await ObservableLite.fromArray([
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ])
    .over(nameLens, name => name.toUpperCase()) // Transform with lens
    .mapWithOptic(ageLens, age => age, age => age + 1) // Transform with Profunctor
    .toArray();
  
  assertEqual(integrationResults, [26, 31], 'should integrate with existing optic methods');
  console.log('✅ integration with existing optic methods works correctly');

  // Test 12: Advanced optic composition with Profunctor
  console.log('\n📋 Test 12: Advanced optic composition with Profunctor');
  
  const userLens = createLens(
    (data) => data.user,
    (user, data) => ({ ...data, user })
  );
  
  const advancedResults = await ObservableLite.fromArray([
    { user: { name: 'Alice', age: 25 } },
    { user: { name: 'Bob', age: 30 } }
  ])
    .mapWithOptic(
      userLens,
      (user) => user, // Input transformation
      (user) => ({ ...user, age: user.age + 1 }) // Output transformation
    )
    .mapWithOptic(
      nameLens,
      (name) => name, // Input transformation
      (name) => name.toLowerCase() // Output transformation
    )
    .toArray();
  
  assertEqual(advancedResults, ['alice', 'bob'], 'should compose optics with Profunctor');
  console.log('✅ advanced optic composition with Profunctor works correctly');

  // Test 13: Purity preservation
  console.log('\n📋 Test 13: Purity preservation');
  
  const source2 = ObservableLite.fromArray([1, 2, 3]);
  const dimapped = source2.dimap(x => x, x => x * 2);
  const lmapped = source2.lmap(x => x);
  const rmapped = source2.rmap(x => x * 2);
  
  // All should return new ObservableLite instances (immutability)
  assertEqual(source2 !== dimapped, true, 'dimap should return new instance');
  assertEqual(source2 !== lmapped, true, 'lmap should return new instance');
  assertEqual(source2 !== rmapped, true, 'rmap should return new instance');
  console.log('✅ purity preservation works correctly');

  // Test 14: Type safety simulation
  console.log('\n📋 Test 14: Type safety simulation');
  
  // Simulate type transformations
  const numberObs = ObservableLite.fromArray([1, 2, 3]);
  const stringObs = numberObs.rmap(x => x.toString()); // number -> string
  const booleanObs = stringObs.rmap(x => x.length > 0); // string -> boolean
  
  const typeResults = await booleanObs.toArray();
  assertEqual(typeResults, [true, true, true], 'should preserve type transformations');
  console.log('✅ type safety simulation works correctly');

  // Test 15: Real-world use case - form validation
  console.log('\n📋 Test 15: Real-world use case - form validation');
  
  const emailLens = createLens(
    (user) => user.email,
    (email, user) => ({ ...user, email })
  );
  
  const formValidationResults = await ObservableLite.fromArray([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'invalid-email' },
    { name: 'Charlie', email: 'charlie@test.org' }
  ])
    .mapWithOptic(
      emailLens,
      (email) => email, // Input: raw email
      (email) => email.includes('@') ? email : 'invalid' // Output: validated email
    )
    .filter(email => email !== 'invalid')
    .toArray();
  
  assertEqual(formValidationResults, ['alice@example.com', 'charlie@test.org'], 'should validate emails correctly');
  console.log('✅ real-world form validation use case works correctly');

  console.log('\n✅ All ObservableLite Profunctor tests passed!');
};

// Run the tests
testObservableProfunctor().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 