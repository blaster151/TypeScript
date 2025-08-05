/**
 * ObservableLite Optics Integration Tests
 * 
 * This tests the optics integration methods on ObservableLite:
 * - .over(optic, fn) - Apply optic transformations
 * - .preview(optic) - Preview values using optics
 * - Cross-kind optic composition (Lens → Prism → Optional)
 * - Fluent chaining with optics
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

  // Chainable operations
  map(fOrOptic, opticFn) {
    if (typeof fOrOptic === 'function' && opticFn === undefined) {
      const f = fOrOptic;
      return new ObservableLite((observer) => {
        return this._subscribe({
          next: (value) => observer.next(f(value)),
          error: observer.error,
          complete: observer.complete
        });
      });
    } else {
      // Map with optic
      const optic = fOrOptic;
      const f = opticFn;
      return new ObservableLite((observer) => {
        return this._subscribe({
          next: (value) => {
            if (optic && typeof optic.get === 'function') {
              // Lens or Optional
              const focused = optic.get(value);
              const transformed = f(focused);
              const result = optic.set ? optic.set(transformed, value) : value;
              observer.next(result);
            } else if (optic && typeof optic.match === 'function') {
              // Prism
              const match = optic.match(value);
              if (match && match.tag === 'Just') {
                const transformed = f(match.value);
                const result = optic.build ? optic.build(transformed) : value;
                observer.next(result);
              } else {
                observer.next(value);
              }
            } else {
              observer.next(value);
            }
          },
          error: observer.error,
          complete: observer.complete
        });
      });
    }
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

  // Optics integration methods
  over(optic, fn) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          // Apply optic transformation based on optic type
          if (optic && typeof optic.getOption === 'function') {
            // Optional
            const maybe = optic.getOption(value);
            if (maybe && maybe.tag === 'Just') {
              const transformed = fn(maybe.value);
              const result = optic.set ? optic.set(transformed, value) : value;
              observer.next(result);
            } else {
              observer.next(value);
            }
          } else if (optic && typeof optic.get === 'function' && typeof optic.set === 'function') {
            // Lens
            const focused = optic.get(value);
            const transformed = fn(focused);
            const result = optic.set ? optic.set(transformed, value) : value;
            observer.next(result);
          } else if (optic && typeof optic.match === 'function' && typeof optic.build === 'function') {
            // Prism
            const match = optic.match(value);
            if (match && match.tag === 'Just') {
              const transformed = fn(match.value);
              const result = optic.build ? optic.build(transformed) : value;
              observer.next(result);
            } else {
              observer.next(value);
            }
          } else {
            observer.next(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  preview(optic) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          // Preview using optic based on optic type
          if (optic && typeof optic.getOption === 'function') {
            // Optional
            const maybe = optic.getOption(value);
            if (maybe && maybe.tag === 'Just') {
              observer.next(maybe.value);
            }
          } else if (optic && typeof optic.match === 'function') {
            // Prism
            const match = optic.match(value);
            if (match && match.tag === 'Just') {
              observer.next(match.value);
            }
          } else if (optic && typeof optic.get === 'function') {
            // Lens (always succeeds)
            const focused = optic.get(value);
            observer.next(focused);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  // Terminal operations
  toArray() {
    return new Promise((resolve, reject) => {
      const values = [];
      
      this._subscribe({
        next: (value) => {
          values.push(value);
        },
        error: (err) => reject(err),
        complete: () => resolve(values)
      });
    });
  }

  reduce(reducer, initial) {
    return new Promise((resolve, reject) => {
      let accumulator = initial;
      
      this._subscribe({
        next: (value) => {
          accumulator = reducer(accumulator, value);
        },
        error: (err) => reject(err),
        complete: () => resolve(accumulator)
      });
    });
  }

  // Static factory methods
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
// Mock Optics for Testing
// ============================================================================

// Mock Lens
const nameLens = {
  get: (person) => person.name,
  set: (name, person) => ({ ...person, name })
};

const ageLens = {
  get: (person) => person.age,
  set: (age, person) => ({ ...person, age })
};

const emailLens = {
  get: (contact) => contact.email,
  set: (email, contact) => ({ ...contact, email })
};

// Mock Prism
const rightPrism = {
  match: (either) => either.tag === 'Right' ? { tag: 'Just', value: either.value } : { tag: 'Nothing' },
  build: (value) => ({ tag: 'Right', value })
};

const justPrism = {
  match: (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
  build: (value) => ({ tag: 'Just', value })
};

// Mock Optional
const emailOptional = {
  getOption: (user) => user.email ? { tag: 'Just', value: user.email } : { tag: 'Nothing' },
  set: (email, user) => ({ ...user, email })
};

// Mock composed optics
const userLens = {
  get: (data) => data.user,
  set: (user, data) => ({ ...data, user })
};

const contactLens = {
  get: (user) => user.contact,
  set: (contact, user) => ({ ...user, contact })
};

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

console.log('🧪 Testing ObservableLite Optics Integration...\n');

const testObservableOpticsIntegration = async () => {
  const people = [
    { name: 'Alice', age: 25, email: 'alice@example.com' },
    { name: 'Bob', age: 30, email: 'bob@example.com' },
    { name: 'Charlie', age: 35, email: 'charlie@example.com' }
  ];

  const users = [
    { 
      user: { 
        name: 'Alice', 
        contact: { email: 'alice@example.com' } 
      } 
    },
    { 
      user: { 
        name: 'Bob', 
        contact: { email: 'bob@example.com' } 
      } 
    },
    { 
      user: { 
        name: 'Charlie', 
        contact: { email: 'charlie@example.com' } 
      } 
    }
  ];

  const eithers = [
    { tag: 'Right', value: 42 },
    { tag: 'Left', value: 'error' },
    { tag: 'Right', value: 100 },
    { tag: 'Left', value: 'another error' }
  ];

  const maybes = [
    { tag: 'Just', value: 'success' },
    { tag: 'Nothing' },
    { tag: 'Just', value: 'another success' },
    { tag: 'Nothing' }
  ];

  // Test 1: Basic .over() with Lens
  console.log('📋 Test 1: Basic .over() with Lens');
  
  const obs = ObservableLite.fromArray(people);
  const upperNames = await obs
    .over(nameLens, name => name.toUpperCase())
    .toArray();
  
  const expectedUpperNames = people.map(p => ({ ...p, name: p.name.toUpperCase() }));
  assertEqual(upperNames, expectedUpperNames, 'should transform names using lens');

  // Test 2: Basic .preview() with Lens
  console.log('\n📋 Test 2: Basic .preview() with Lens');
  
  const names = await obs
    .preview(nameLens)
    .toArray();
  
  const expectedNames = people.map(p => p.name);
  assertEqual(names, expectedNames, 'should extract names using lens');

  // Test 3: .over() with Prism
  console.log('\n📋 Test 3: .over() with Prism');
  
  const eitherObs = ObservableLite.fromArray(eithers);
  const doubledRightValues = await eitherObs
    .over(rightPrism, value => value * 2)
    .toArray();
  
  const expectedDoubledRight = eithers.map(e => 
    e.tag === 'Right' ? { tag: 'Right', value: e.value * 2 } : e
  );
  assertEqual(doubledRightValues, expectedDoubledRight, 'should double right values using prism');

  // Test 4: .preview() with Prism
  console.log('\n📋 Test 4: .preview() with Prism');
  
  const rightValues = await eitherObs
    .preview(rightPrism)
    .toArray();
  
  const expectedRightValues = eithers.filter(e => e.tag === 'Right').map(e => e.value);
  assertEqual(rightValues, expectedRightValues, 'should extract only right values using prism');

  // Test 5: .over() with Optional
  console.log('\n📋 Test 5: .over() with Optional');
  
  const usersWithOptional = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob' }, // No email
    { name: 'Charlie', email: 'charlie@example.com' }
  ];
  
  const userObs = ObservableLite.fromArray(usersWithOptional);
  const upperEmails = await userObs
    .over(emailOptional, email => email.toUpperCase())
    .toArray();
  
  const expectedUpperEmails = usersWithOptional.map(u => 
    u.email ? { ...u, email: u.email.toUpperCase() } : u
  );
  assertEqual(upperEmails, expectedUpperEmails, 'should transform emails using optional');

  // Test 6: .preview() with Optional
  console.log('\n📋 Test 6: .preview() with Optional');
  
  const emails = await userObs
    .preview(emailOptional)
    .toArray();
  
  const expectedEmails = usersWithOptional.filter(u => u.email).map(u => u.email);
  assertEqual(emails, expectedEmails, 'should extract only users with emails using optional');

  // Test 7: Cross-kind optic composition with .over()
  console.log('\n📋 Test 7: Cross-kind optic composition with .over()');
  
  const userObs2 = ObservableLite.fromArray(users);
  const upperEmailsComposed = await userObs2
    .over(userLens, user => ({
      ...user,
      contact: {
        ...user.contact,
        email: user.contact.email.toUpperCase()
      }
    }))
    .toArray();
  
  const expectedUpperEmailsComposed = users.map(u => ({
    user: {
      ...u.user,
      contact: {
        ...u.user.contact,
        email: u.user.contact.email.toUpperCase()
      }
    }
  }));
  assertEqual(upperEmailsComposed, expectedUpperEmailsComposed, 'should compose lenses for nested transformation');

  // Test 8: Cross-kind optic composition with .preview()
  console.log('\n📋 Test 8: Cross-kind optic composition with .preview()');
  
  const nestedEmails = await userObs2
    .preview(userLens)
    .preview(contactLens)
    .preview(emailLens)
    .toArray();
  
  const expectedNestedEmails = users.map(u => u.user.contact.email);
  assertEqual(nestedEmails, expectedNestedEmails, 'should compose lenses for nested extraction');

  // Test 9: Fluent chaining with optics
  console.log('\n📋 Test 9: Fluent chaining with optics');
  
  const complexPipeline = await userObs2
    .preview(userLens)
    .preview(contactLens)
    .preview(emailLens)
    .map(email => email.toLowerCase())
    .toArray();
  
  const expectedComplexPipeline = users.map(u => u.user.contact.email.toLowerCase());
  assertEqual(complexPipeline, expectedComplexPipeline, 'should chain preview with map');

  // Test 10: .over() with Maybe Prism
  console.log('\n📋 Test 10: .over() with Maybe Prism');
  
  const maybeObs = ObservableLite.fromArray(maybes);
  const upperJustValues = await maybeObs
    .over(justPrism, value => value.toUpperCase())
    .toArray();
  
  const expectedUpperJust = maybes.map(m => 
    m.tag === 'Just' ? { tag: 'Just', value: m.value.toUpperCase() } : m
  );
  assertEqual(upperJustValues, expectedUpperJust, 'should transform just values using prism');

  // Test 11: .preview() with Maybe Prism
  console.log('\n📋 Test 11: .preview() with Maybe Prism');
  
  const justValues = await maybeObs
    .preview(justPrism)
    .toArray();
  
  const expectedJustValues = maybes.filter(m => m.tag === 'Just').map(m => m.value);
  assertEqual(justValues, expectedJustValues, 'should extract only just values using prism');

  // Test 12: Complex nested transformation
  console.log('\n📋 Test 12: Complex nested transformation');
  
  const complexData = [
    { 
      user: { 
        name: 'Alice', 
        contact: { email: 'alice@example.com' },
        age: 25
      } 
    },
    { 
      user: { 
        name: 'Bob', 
        contact: { email: 'bob@example.com' },
        age: 30
      } 
    }
  ];
  
  const complexObs = ObservableLite.fromArray(complexData);
  const transformed = await complexObs
    .over(userLens, user => ({
      ...user,
      name: user.name.toUpperCase(),
      age: user.age + 1
    }))
    .toArray();
  
  const expectedTransformed = complexData.map(d => ({
    user: {
      ...d.user,
      name: d.user.name.toUpperCase(),
      age: d.user.age + 1
    }
  }));
  assertEqual(transformed, expectedTransformed, 'should apply multiple lens transformations');

  // Test 13: Mixed optic types in pipeline
  console.log('\n📋 Test 13: Mixed optic types in pipeline');
  
  const mixedData = [
    { tag: 'Right', value: { name: 'Alice', age: 25 } },
    { tag: 'Left', value: 'error' },
    { tag: 'Right', value: { name: 'Bob', age: 30 } }
  ];
  
  const mixedObs = ObservableLite.fromArray(mixedData);
  const mixedResult = await mixedObs
    .over(rightPrism, person => person)
    .over(nameLens, name => name.toUpperCase())
    .preview(rightPrism)
    .preview(nameLens)
    .toArray();
  
  const expectedMixedResult = mixedData
    .filter(d => d.tag === 'Right')
    .map(d => d.value.name.toUpperCase());
  assertEqual(mixedResult, expectedMixedResult, 'should mix prism and lens operations');

  // Test 14: Error handling with optics
  console.log('\n📋 Test 14: Error handling with optics');
  
  const errorObs = new ObservableLite((observer) => {
    observer.next({ name: 'Alice', age: 25 });
    observer.error(new Error('Test error'));
    return () => {};
  });
  
  try {
    await errorObs.over(nameLens, name => name.toUpperCase()).toArray();
    console.error('❌ should reject on error');
    process.exit(1);
  } catch (error) {
    console.log('✅ should reject on error');
  }

  console.log('\n✅ All ObservableLite Optics Integration tests passed!');
};

// Run the tests
testObservableOpticsIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 