/**
 * Test Optics Everywhere & Observable-Lite FP Ergonomics
 * 
 * This test file verifies the complete optics-everywhere system with
 * unified FP ergonomics across all ADTs, collections, and Observables.
 */

// Mock implementations for testing
class MockObservableLite {
  constructor(value) {
    this._value = value;
    this._subscribers = [];
  }

  subscribe(observer) {
    this._subscribers.push(observer);
    observer(this._value);
    return () => {
      const index = this._subscribers.indexOf(observer);
      if (index > -1) {
        this._subscribers.splice(index, 1);
      }
    };
  }

  next(value) {
    this._value = value;
    this._subscribers.forEach(subscriber => subscriber(value));
  }

  map(f) {
    const observable = new MockObservableLite(f(this._value));
    this.subscribe(value => observable.next(f(value)));
    return observable;
  }

  chain(f) {
    const observable = f(this._value);
    this.subscribe(value => {
      const newObservable = f(value);
      newObservable.subscribe(newValue => observable.next(newValue));
    });
    return observable;
  }

  bichain(leftFn, rightFn) {
    return rightFn(this._value);
  }

  filter(predicate) {
    const observable = new MockObservableLite(this._value);
    this.subscribe(value => {
      if (predicate(value)) {
        observable.next(value);
      }
    });
    return observable;
  }

  over(optic, f) {
    return this.map(value => optic.over(f, value));
  }

  preview(optic) {
    return this.map(value => optic.preview(value));
  }

  overOptional(optic, f) {
    return this.map(value => optic.over(f, value));
  }

  getValue() {
    return this._value;
  }

  static of(value) {
    return new MockObservableLite(value);
  }

  static fromArray(array) {
    return new MockObservableLite(array);
  }

  static fromPromise(promise) {
    const observable = new MockObservableLite(null);
    promise.then(value => observable.next(value))
           .catch(error => observable.next(error));
    return observable;
  }
}

class MockMaybe {
  constructor(tag, value = null) {
    this.tag = tag;
    this.value = value;
  }

  map(fn) {
    return this.tag === 'Just' 
      ? new MockMaybe('Just', fn(this.value))
      : new MockMaybe('Nothing');
  }

  chain(fn) {
    return this.tag === 'Just' ? fn(this.value) : new MockMaybe('Nothing');
  }

  static of(value) {
    return new MockMaybe('Just', value);
  }
}

class MockEither {
  constructor(tag, value) {
    this.tag = tag;
    this.value = value;
  }

  map(fn) {
    return this.tag === 'Right' 
      ? new MockEither('Right', fn(this.value))
      : this;
  }

  bimap(f, g) {
    return this.tag === 'Right'
      ? new MockEither('Right', g(this.value))
      : new MockEither('Left', f(this.value));
  }
}

// Optics implementations
function createLens(get, set) {
  return {
    _tag: 'Lens',
    get,
    set,
    over: (f, s) => set(f(get(s)), s),
    then: (other) => composeLens(createLens(get, set), other)
  };
}

function createPrism(match, build) {
  return {
    _tag: 'Prism',
    match,
    build,
    preview: match,
    review: build,
    then: (other) => composePrism(createPrism(match, build), other)
  };
}

function createOptional(get, set) {
  return {
    _tag: 'Optional',
    get,
    set,
    over: (f, s) => {
      const maybeA = get(s);
      return maybeA.tag === 'Just' ? set(f(maybeA.value), s) : s;
    },
    preview: get,
    then: (other) => composeOptional(createOptional(get, set), other)
  };
}

function createTraversal(getAll, modifyAll) {
  return {
    _tag: 'Traversal',
    getAll,
    modifyAll,
    over: modifyAll,
    collect: getAll,
    then: (other) => composeTraversal(createTraversal(getAll, modifyAll), other)
  };
}

// Composition functions
function composeLens(first, second) {
  return createLens(
    (s) => second.get(first.get(s)),
    (d, s) => first.set(second.set(d, first.get(s)), s)
  );
}

function composePrism(first, second) {
  return createPrism(
    (s) => {
      const maybeA = first.match(s);
      return maybeA.tag === 'Just' ? second.match(maybeA.value) : { tag: 'Nothing' };
    },
    (d) => first.build(second.build(d))
  );
}

function composeOptional(first, second) {
  return createOptional(
    (s) => {
      const maybeA = first.get(s);
      return maybeA.tag === 'Just' ? second.get(maybeA.value) : { tag: 'Nothing' };
    },
    (d, s) => {
      const maybeA = first.get(s);
      return maybeA.tag === 'Just' ? first.set(second.set(d, maybeA.value), s) : s;
    }
  );
}

function composeTraversal(first, second) {
  return createTraversal(
    (s) => first.getAll(s).flatMap(a => second.getAll ? second.getAll(a) : [second.get(a)]),
    (f, s) => first.modifyAll(a => {
      if (second.modifyAll) {
        return second.modifyAll(f, a);
      } else if (second.over) {
        return second.over(f, a);
      } else {
        return second.set(f(second.get(a)), a);
      }
    }, s)
  );
}

// Optics factories
function withOptics(obj) {
  return {
    ...obj,
    lens: (key) => {
      return createLens(
        (value) => value[key],
        (newValue, value) => ({ ...value, [key]: newValue })
      );
    },
    
    prism: (variant) => {
      return createPrism(
        (value) => {
          if (value && typeof value === 'object' && 'tag' in value) {
            return value.tag === variant 
              ? { tag: 'Just', value: value.value || value }
              : { tag: 'Nothing' };
          }
          return { tag: 'Nothing' };
        },
        (value) => ({ tag: variant, value })
      );
    },
    
    optional: (key) => {
      return createOptional(
        (value) => {
          const fieldValue = value[key];
          return fieldValue !== undefined && fieldValue !== null
            ? { tag: 'Just', value: fieldValue }
            : { tag: 'Nothing' };
        },
        (newValue, value) => ({ ...value, [key]: newValue })
      );
    },
    
    traversal: () => {
      return createTraversal(
        (value) => [value],
        (f, value) => f(value)
      );
    }
  };
}

// ADT Optics
const MaybeOptics = withOptics({
  value: createLens(
    (maybe) => maybe.value,
    (value, maybe) => ({ ...maybe, value })
  ),
  
  Just: createPrism(
    (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
    (value) => ({ tag: 'Just', value })
  ),
  
  Nothing: createPrism(
    (maybe) => maybe.tag === 'Nothing' ? { tag: 'Just', value: maybe } : { tag: 'Nothing' },
    (value) => ({ tag: 'Nothing' })
  ),
  
  valueOptional: createOptional(
    (maybe) => maybe.value !== undefined ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
    (value, maybe) => ({ ...maybe, value })
  )
});

const EitherOptics = withOptics({
  left: createLens(
    (either) => either.value,
    (value, either) => ({ ...either, value })
  ),
  
  right: createLens(
    (either) => either.value,
    (value, either) => ({ ...either, value })
  ),
  
  Left: createPrism(
    (either) => either.tag === 'Left' ? { tag: 'Just', value: either.value } : { tag: 'Nothing' },
    (value) => ({ tag: 'Left', value })
  ),
  
  Right: createPrism(
    (either) => either.tag === 'Right' ? { tag: 'Just', value: either.value } : { tag: 'Nothing' },
    (value) => ({ tag: 'Right', value })
  ),
  
  leftOptional: createOptional(
    (either) => either.tag === 'Left' ? { tag: 'Just', value: either.value } : { tag: 'Nothing' },
    (value, either) => ({ ...either, value })
  ),
  
  rightOptional: createOptional(
    (either) => either.tag === 'Right' ? { tag: 'Just', value: either.value } : { tag: 'Nothing' },
    (value, either) => ({ ...either, value })
  )
});

// Array Optics
const ArrayOptics = withOptics({
  elements: createTraversal(
    (arr) => arr,
    (f, arr) => arr.map(f)
  ),
  
  at: (index) => createLens(
    (arr) => arr[index],
    (value, arr) => {
      const newArr = [...arr];
      newArr[index] = value;
      return newArr;
    }
  ),
  
  atOptional: (index) => createOptional(
    (arr) => {
      return index >= 0 && index < arr.length
        ? { tag: 'Just', value: arr[index] }
        : { tag: 'Nothing' };
    },
    (value, arr) => {
      const newArr = [...arr];
      newArr[index] = value;
      return newArr;
    }
  ),
  
  head: createTraversal(
    (arr) => arr.length > 0 ? [arr[0]] : [],
    (f, arr) => {
      if (arr.length === 0) return arr;
      const newArr = [...arr];
      newArr[0] = f(newArr[0]);
      return newArr;
    }
  ),
  
  tail: createTraversal(
    (arr) => arr.slice(1),
    (f, arr) => {
      if (arr.length === 0) return arr;
      return [arr[0], ...arr.slice(1).map(f)];
    }
  )
});

// Pattern matching with optics
function matchWithOptics(value) {
  const cases = [];
  let defaultCase = null;

  return {
    case(optic, fn) {
      cases.push({ optic, fn });
      return this;
    },
    
    default(fn) {
      defaultCase = fn;
      
      // Try each case
      for (const { optic, fn: caseFn } of cases) {
        if (optic && typeof optic.get === 'function') {
          // Lens case
          try {
            const focused = optic.get(value);
            return caseFn(focused);
          } catch {
            continue;
          }
        } else if (optic && typeof optic.match === 'function') {
          // Prism case
          const match = optic.match(value);
          if (match && match.tag === 'Just') {
            return caseFn(match.value);
          }
        } else if (optic && typeof optic.preview === 'function') {
          // Optional case
          const preview = optic.preview(value);
          if (preview && preview.tag === 'Just') {
            return caseFn(preview.value);
          }
        }
      }
      
      // Default case
      return defaultCase ? defaultCase(value) : value;
    }
  };
}

// Test helper
function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Test function
async function testOpticsEverywhere() {
  console.log('🧪 Testing Optics Everywhere & Observable-Lite FP Ergonomics...\n');

  // Test 1: Optics Factories for ADTs
  console.log('📋 Test 1: Optics Factories for ADTs');
  
  const person = { name: 'Alice', age: 25 };
  const personOptics = withOptics(person);
  
  // Lens to field
  const nameLens = personOptics.lens('name');
  const name = nameLens.get(person);
  const updatedPerson = nameLens.set('Bob', person);
  
  assertEqual(name, 'Alice', 'lens get should work');
  assertEqual(updatedPerson.name, 'Bob', 'lens set should work');
  
  // Prism to variant
  const maybe = new MockMaybe('Just', 5);
  const justPrism = MaybeOptics.Just;
  const justMatch = justPrism.match(maybe);
  
  assertEqual(justMatch.value, 5, 'prism match should work');
  
  // Optional to field
  const ageOptional = personOptics.optional('age');
  const age = ageOptional.get(person);
  
  assertEqual(age.value, 25, 'optional get should work');

  console.log('✅ ADT optics factories work correctly');

  // Test 2: Observable-Lite FP Ergonomics
  console.log('\n📋 Test 2: Observable-Lite FP Ergonomics');
  
  const observable = new MockObservableLite(person);
  
  // Map operation
  const mapped = observable.map(p => ({ ...p, name: p.name.toUpperCase() }));
  assertEqual(mapped.getValue().name, 'ALICE', 'observable map should work');
  
  // Chain operation
  const chained = observable.chain(p => new MockObservableLite(p.name));
  assertEqual(chained.getValue(), 'Alice', 'observable chain should work');
  
  // Filter operation
  const filtered = observable.filter(p => p.age > 20);
  assertEqual(filtered.getValue(), person, 'observable filter should work');
  
  // Bichain operation
  const bichained = observable.bichain(
    p => new MockObservableLite('error'),
    p => new MockObservableLite(p.name)
  );
  assertEqual(bichained.getValue(), 'Alice', 'observable bichain should work');

  console.log('✅ Observable-Lite FP ergonomics work correctly');

  // Test 3: Optics in Streams
  console.log('\n📋 Test 3: Optics in Streams');
  
  // Over operation with lens
  const overResult = observable.over(nameLens, name => name.toUpperCase());
  assertEqual(overResult.getValue().name, 'ALICE', 'observable over with lens should work');
  
  // Preview operation with prism
  const maybeObservable = new MockObservableLite(maybe);
  const previewResult = maybeObservable.preview(justPrism);
  assertEqual(previewResult.getValue().value, 5, 'observable preview with prism should work');
  
  // Over operation with optional
  const overOptionalResult = observable.overOptional(ageOptional, age => age * 2);
  assertEqual(overOptionalResult.getValue().age, 50, 'observable overOptional should work');

  console.log('✅ optics in streams work correctly');

  // Test 4: Pattern Matching with Optics
  console.log('\n📋 Test 4: Pattern Matching with Optics');
  
  const maybePerson = new MockMaybe('Just', person);
  
  const matchResult = matchWithOptics(maybePerson)
    .case(MaybeOptics.Just, (value) => `Found: ${value.name}`)
    .case(MaybeOptics.Nothing, () => 'Not found')
    .default(() => 'Unknown');
  
  assertEqual(matchResult, 'Found: Alice', 'pattern matching with optics should work');
  
  const lensMatchResult = matchWithOptics(person)
    .case(nameLens, (name) => `Name is: ${name}`)
    .default(() => 'No name');
  
  assertEqual(lensMatchResult, 'Name is: Alice', 'pattern matching with lens should work');

  console.log('✅ pattern matching with optics works correctly');

  // Test 5: Cross-Type Fusion
  console.log('\n📋 Test 5: Cross-Type Fusion');
  
  const users = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
  ];
  
  const usersObservable = new MockObservableLite(users);
  
  // Fuse array optics with observable
  const arrayElements = ArrayOptics.elements;
  const fusedResult = usersObservable.over(arrayElements, user => ({ ...user, name: user.name.toUpperCase() }));
  
  assertEqual(fusedResult.getValue()[0].name, 'ALICE', 'cross-type fusion should work');
  assertEqual(fusedResult.getValue()[1].name, 'BOB', 'cross-type fusion should work');

  console.log('✅ cross-type fusion works correctly');

  // Test 6: Collection Optics
  console.log('\n📋 Test 6: Collection Optics');
  
  const numbers = [1, 2, 3, 4, 5];
  
  // Array elements traversal
  const doubled = ArrayOptics.elements.modifyAll(x => x * 2, numbers);
  assertEqual(doubled, [2, 4, 6, 8, 10], 'array elements traversal should work');
  
  // Array at lens
  const atLens = ArrayOptics.at(1);
  const secondElement = atLens.get(numbers);
  const updatedNumbers = atLens.set(10, numbers);
  
  assertEqual(secondElement, 2, 'array at lens get should work');
  assertEqual(updatedNumbers[1], 10, 'array at lens set should work');
  
  // Array at optional
  const atOptional = ArrayOptics.atOptional(1);
  const optionalElement = atOptional.get(numbers);
  const optionalUpdated = atOptional.set(10, numbers);
  
  assertEqual(optionalElement.value, 2, 'array at optional get should work');
  assertEqual(optionalUpdated[1], 10, 'array at optional set should work');
  
  // Array head traversal
  const headDoubled = ArrayOptics.head.modifyAll(x => x * 2, numbers);
  assertEqual(headDoubled, [2, 2, 3, 4, 5], 'array head traversal should work');
  
  // Array tail traversal
  const tailDoubled = ArrayOptics.tail.modifyAll(x => x * 2, numbers);
  assertEqual(tailDoubled, [1, 4, 6, 8, 10], 'array tail traversal should work');

  console.log('✅ collection optics work correctly');

  // Test 7: Complex Transformations
  console.log('\n📋 Test 7: Complex Transformations');
  
  const complexData = [
    { user: { profile: { name: 'Alice', age: 25 } } },
    { user: { profile: { name: 'Bob', age: 30 } } }
  ];
  
  const complexObservable = new MockObservableLite(complexData);
  
  // Create complex optic chain using array elements first
  const arrayElementsTraversal = ArrayOptics.elements;
  const userLens = createLens(
    (data) => data.user,
    (user, data) => ({ ...data, user })
  );
  
  const profileLens = createLens(
    (user) => user.profile,
    (profile, user) => ({ ...user, profile })
  );
  
  const nameLens2 = createLens(
    (profile) => profile.name,
    (name, profile) => ({ ...profile, name })
  );
  
  // Compose optics: array elements -> user -> profile -> name
  const complexOptic = arrayElementsTraversal.then(userLens).then(profileLens).then(nameLens2);
  
  // Apply complex transformation
  const complexResult = complexObservable.over(complexOptic, name => name.toUpperCase());
  
  assertEqual(complexResult.getValue()[0].user.profile.name, 'ALICE', 'complex transformation should work');
  assertEqual(complexResult.getValue()[1].user.profile.name, 'BOB', 'complex transformation should work');

  console.log('✅ complex transformations work correctly');

  // Test 8: Nested ADT Optics
  console.log('\n📋 Test 8: Nested ADT Optics');
  
  const maybeUsers = [
    new MockMaybe('Just', { name: 'Alice', age: 25 }),
    new MockMaybe('Nothing'),
    new MockMaybe('Just', { name: 'Bob', age: 30 })
  ];
  
  const maybeUsersObservable = new MockObservableLite(maybeUsers);
  
  // Transform nested Maybe values
  const nestedResult = maybeUsersObservable.over(
    ArrayOptics.elements,
    maybe => maybe.map(user => ({ ...user, name: user.name.toUpperCase() }))
  );
  
  assertEqual(nestedResult.getValue()[0].value.name, 'ALICE', 'nested ADT optics should work');
  assertEqual(nestedResult.getValue()[1].tag, 'Nothing', 'nested ADT optics should preserve Nothing');
  assertEqual(nestedResult.getValue()[2].value.name, 'BOB', 'nested ADT optics should work');

  console.log('✅ nested ADT optics work correctly');

  // Test 9: Type Safety Simulation
  console.log('\n📋 Test 9: Type Safety Simulation');
  
  // Simulate type-safe operations
  const typeSafePerson = { name: 'Alice', age: 25 };
  const typeSafeLens = personOptics.lens('name');
  
  // Type-safe get
  const typeSafeName = typeSafeLens.get(typeSafePerson);
  assertEqual(typeof typeSafeName, 'string', 'type-safe lens get should return correct type');
  
  // Type-safe set
  const typeSafeUpdated = typeSafeLens.set('Bob', typeSafePerson);
  assertEqual(typeSafeUpdated.name, 'Bob', 'type-safe lens set should work');
  assertEqual(typeof typeSafeUpdated.name, 'string', 'type-safe lens set should preserve type');

  console.log('✅ type safety simulation works correctly');

  // Test 10: Purity Integration
  console.log('\n📋 Test 10: Purity Integration');
  
  // All optics operations should be pure
  const originalPerson = { name: 'Alice', age: 25 };
  const personCopy = { ...originalPerson };
  
  // Apply optic transformation
  const transformedPerson = nameLens.over(name => name.toUpperCase(), personCopy);
  
  // Original should remain unchanged
  assertEqual(originalPerson.name, 'Alice', 'optics should be pure and not mutate original');
  assertEqual(personCopy.name, 'Alice', 'optics should be pure and not mutate input');
  assertEqual(transformedPerson.name, 'ALICE', 'optics should return new transformed value');

  console.log('✅ purity integration works correctly');

  console.log('\n✅ All Optics Everywhere & Observable-Lite FP Ergonomics tests passed!');
}

// Run tests
testOpticsEverywhere().catch(console.error); 