/**
 * Test ADT Optics Integration
 * This tests the fluent optics API for ADT instances
 */

console.log('🧪 Testing ADT Optics Integration...\n');

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

// Simple optic implementations for testing
function lens(getter, setter) {
  return {
    get: getter,
    set: setter,
    over: (f, s) => setter(s, f(getter(s)))
  };
}

function prism(match, build) {
  return {
    match,
    build,
    preview: (s) => match(s),
    review: build
  };
}

// Simple utility functions
function view(ln, s) {
  return ln.get(s);
}

function set(ln, b, s) {
  return ln.set(s, b);
}

function over(ln, f, s) {
  return ln.over(f, s);
}

function preview(pr, s) {
  return pr.preview(s);
}

function review(pr, b) {
  return pr.build(b);
}

// Strengthened type guard helpers for reliable optic kind detection
function isLens(o) {
  return o && typeof o.get === 'function' && typeof o.set === 'function';
}

function isPrism(o) {
  return o && typeof o.match === 'function' && typeof o.build === 'function';
}

function isOptional(o) {
  return o && typeof o.getOption === 'function' && typeof o.set === 'function';
}

// Add optics methods to an ADT instance
function addOpticsMethods(instance) {
  // Add lens methods
  instance.view = function(optic) {
    return view(optic, this);
  };
  
  instance.set = function(optic, value) {
    return set(optic, value, this);
  };
  
  instance.over = function(optic, fn) {
    return over(optic, fn, this);
  };
  
  // Add prism methods
  instance.preview = function(optic) {
    return preview(optic, this);
  };
  
  instance.review = function(optic, value) {
    return review(optic, value);
  };
  
  return instance;
}

// Add optics methods to a constructor function
function addOpticsToConstructor(constructor) {
  // Create a wrapper function that adds optics methods to the result
  const enhanced = function(...args) {
    const instance = constructor.apply(this, args);
    return addOpticsMethods(instance);
  };
  
  // Copy static properties
  Object.setPrototypeOf(enhanced, Object.getPrototypeOf(constructor));
  Object.assign(enhanced, constructor);
  
  return enhanced;
}

// Test utilities
function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}: Expected ${expectedStr}, got ${actualStr}`);
  }
}

// ============================================================================
// Test 0: Type Guard Validation
// ============================================================================

console.log('📋 Test 0: Type Guard Validation');

const testTypeGuards = () => {
  // Test lens detection
  const testLens = lens(
    x => x.value,
    (x, value) => ({ ...x, value })
  );
  assertEqual(isLens(testLens), true, 'should detect lens correctly');
  assertEqual(isLens({}), false, 'should not detect non-lens as lens');
  
  // Test prism detection
  const testPrism = prism(
    x => x.isJust ? Maybe.Just(x.value) : Maybe.Nothing(),
    x => Maybe.Just(x)
  );
  assertEqual(isPrism(testPrism), true, 'should detect prism correctly');
  assertEqual(isPrism({}), false, 'should not detect non-prism as prism');
  
  // Test optional detection
  const testOptional = {
    getOption: (x) => x.isJust ? Maybe.Just(x.value) : Maybe.Nothing(),
    set: (x, value) => new Maybe(value, x.isJust)
  };
  assertEqual(isOptional(testOptional), true, 'should detect optional correctly');
  assertEqual(isOptional({}), false, 'should not detect non-optional as optional');
};

// ============================================================================
// Test 1: Maybe Lens Usage
// ============================================================================

console.log('📋 Test 1: Maybe Lens Usage');

const testMaybeLensUsage = () => {
  // Create a lens for the value property of Maybe
  const valueLens = lens(
    m => m.value,
    (m, value) => new Maybe(value, m.isJust)
  );
  
  // Create enhanced Maybe constructors
  const JustOptics = addOpticsToConstructor(Maybe.Just);
  const NothingOptics = addOpticsToConstructor(Maybe.Nothing);
  
  // Test with Just
  const maybePerson = JustOptics({ name: 'Alice', age: 25 });
  
  // Test view
  const person = maybePerson.view(valueLens);
  assertEqual(person, { name: 'Alice', age: 25 }, 'view should extract the value');
  
  // Test set
  const newPerson = { name: 'Bob', age: 30 };
  const updatedMaybe = maybePerson.set(valueLens, newPerson);
  assertEqual(updatedMaybe.value, newPerson, 'set should update the value');
  
  // Test over
  const upperCaseMaybe = maybePerson.over(valueLens, person => ({
    ...person,
    name: person.name.toUpperCase()
  }));
  assertEqual(upperCaseMaybe.value.name, 'ALICE', 'over should transform the value');
  
  // Test with Nothing
  const nothingMaybe = NothingOptics();
  const nothingValue = nothingMaybe.view(valueLens);
  assertEqual(nothingValue, null, 'view should return null for Nothing');
};

// ============================================================================
// Test 2: Maybe Prism Usage
// ============================================================================

console.log('📋 Test 2: Maybe Prism Usage');

const testMaybePrismUsage = () => {
  // Create a prism for Just constructor
  const justPrism = prism(
    m => m.isJust ? Maybe.Just(m.value) : Maybe.Nothing(),
    value => Maybe.Just(value)
  );
  
  // Create enhanced Maybe constructors
  const JustOptics = addOpticsToConstructor(Maybe.Just);
  const NothingOptics = addOpticsToConstructor(Maybe.Nothing);
  
  // Test with Just
  const maybeValue = JustOptics(42);
  const previewed = maybeValue.preview(justPrism);
  assertEqual(previewed.value, 42, 'preview should extract Just value');
  
  // Test review
  const reviewed = maybeValue.review(justPrism, 100);
  assertEqual(reviewed.value, 100, 'review should build new Just value');
  
  // Test with Nothing
  const nothingValue = NothingOptics();
  const nothingPreviewed = nothingValue.preview(justPrism);
  assertEqual(nothingPreviewed.isJust, false, 'preview should return Nothing for Nothing');
};

// ============================================================================
// Test 3: Nested Optics Composition
// ============================================================================

console.log('📋 Test 3: Nested Optics Composition');

const testNestedOpticsComposition = () => {
  // Create lenses for nested object properties
  const valueLens = lens(
    m => m.value,
    (m, value) => new Maybe(value, m.isJust)
  );
  
  const nameLens = lens(
    p => p.name,
    (p, name) => ({ ...p, name })
  );
  
  // Compose lenses
  const composedLens = {
    get: (m) => nameLens.get(valueLens.get(m)),
    set: (m, name) => valueLens.set(m, nameLens.set(valueLens.get(m), name)),
    over: (f, m) => valueLens.set(m, nameLens.over(f, valueLens.get(m)))
  };
  
  // Create enhanced Maybe constructor
  const JustOptics = addOpticsToConstructor(Maybe.Just);
  
  // Test nested access
  const maybePerson = JustOptics({ name: 'Alice', age: 25 });
  const name = maybePerson.view(composedLens);
  assertEqual(name, 'Alice', 'composed lens should extract nested property');
  
  // Test nested modification
  const updatedMaybe = maybePerson.set(composedLens, 'Bob');
  assertEqual(updatedMaybe.value.name, 'Bob', 'composed lens should update nested property');
  
  // Test nested transformation
  const upperCaseMaybe = maybePerson.over(composedLens, name => name.toUpperCase());
  assertEqual(upperCaseMaybe.value.name, 'ALICE', 'composed lens should transform nested property');
};

// ============================================================================
// Test 4: ObservableLite + Optics Mapping
// ============================================================================

console.log('📋 Test 4: ObservableLite + Optics Mapping');

const testObservableLiteOptics = () => {
  // Simple ObservableLite implementation
  class ObservableLite {
    constructor(subscribe) {
      this.subscribe = subscribe;
    }
    
    map(fn) {
      return new ObservableLite(observer => {
        return this.subscribe({
          next: value => observer.next(fn(value)),
          error: err => observer.error(err),
          complete: () => observer.complete()
        });
      });
    }
    
    static of(value) {
      return new ObservableLite(observer => {
        observer.next(value);
        observer.complete();
        return () => {};
      });
    }
    
    static fromArray(values) {
      return new ObservableLite(observer => {
        values.forEach(value => observer.next(value));
        observer.complete();
        return () => {};
      });
    }
  }
  
  // Add optics methods to ObservableLite
  function addObservableLiteOptics(observable) {
    const enhanced = observable;
    
    // Add lens operations
    enhanced.over = function(optic, fn) {
      return this.map(value => over(optic, fn, value));
    };
    
      // Add unified preview operation that works with any optic kind
  enhanced.preview = function(optic) {
    return this.map(value => {
      // Use strengthened type guards for reliable optic kind detection
      if (isLens(optic)) {
        try {
          // For lens, wrap in Maybe.Just, but handle potential errors
          const result = optic.get(value);
          return Maybe.Just(result);
        } catch (error) {
          return Maybe.Nothing();
        }
      }
      else if (isPrism(optic)) {
        return optic.match(value);
      }
      else if (isOptional(optic)) {
        return optic.getOption(value);
      }
      else {
        throw new Error(`Unsupported optic kind for preview: ${typeof optic}`);
      }
    });
  };
    
    return enhanced;
  }
  
  // Create enhanced ObservableLite constructors
  const ObservableLiteOptics = {
    ...ObservableLite,
    of: (value) => addObservableLiteOptics(ObservableLite.of(value)),
    fromArray: (values) => addObservableLiteOptics(ObservableLite.fromArray(values))
  };
  
  // Create a lens for testing
  const valueLens = lens(
    m => m.value,
    (m, value) => new Maybe(value, m.isJust)
  );
  
  // Create a prism for testing
  const justPrism = prism(
    m => m.isJust ? Maybe.Just(m.value) : Maybe.Nothing(),
    value => Maybe.Just(value)
  );
  
  // Create an optional for testing
  const valueOptional = {
    getOption: (m) => m.isJust ? Maybe.Just(m.value) : Maybe.Nothing(),
    set: (m, value) => new Maybe(value, m.isJust),
    over: (f, m) => m.isJust ? new Maybe(f(m.value), true) : m
  };
  
  // Test ObservableLite with optics
  const maybeValues = [
    Maybe.Just({ name: 'Alice', age: 25 }),
    Maybe.Just({ name: 'Bob', age: 30 }),
    Maybe.Nothing()
  ];
  
  const observable = ObservableLiteOptics.fromArray(maybeValues);
  
  // Test over operation
  let results = [];
  const overObservable = observable.over(valueLens, person => {
    if (person === null) return null;
    return {
      ...person,
      name: person.name.toUpperCase()
    };
  });
  
  overObservable.subscribe({
    next: value => results.push(value),
    complete: () => {
      assertEqual(results.length, 3, 'should process all values');
      assertEqual(results[0].value.name, 'ALICE', 'should transform first value');
      assertEqual(results[1].value.name, 'BOB', 'should transform second value');
      assertEqual(results[2].value, null, 'should handle Nothing');
    }
  });
  
  // Test preview operation with prism
  results = [];
  const previewObservable = observable.preview(justPrism);
  
  previewObservable.subscribe({
    next: value => results.push(value),
    complete: () => {
      assertEqual(results.length, 3, 'should process all values');
      assertEqual(results[0].value.name, 'Alice', 'should extract first value');
      assertEqual(results[1].value.name, 'Bob', 'should extract second value');
      assertEqual(results[2].isJust, false, 'should handle Nothing');
    }
  });
  
  // Test preview operation with lens
  results = [];
  const previewLensObservable = observable.preview(valueLens);
  
  previewLensObservable.subscribe({
    next: value => results.push(value),
    complete: () => {
      assertEqual(results.length, 3, 'should process all values');
      assertEqual(results[0].value.name, 'Alice', 'should extract first value with lens');
      assertEqual(results[1].value.name, 'Bob', 'should extract second value with lens');
      assertEqual(results[2].value, null, 'should handle Nothing with lens');
    }
  });
  
  // Test preview operation with optional
  results = [];
  const previewOptionalObservable = observable.preview(valueOptional);
  
  previewOptionalObservable.subscribe({
    next: value => results.push(value),
    complete: () => {
      assertEqual(results.length, 3, 'should process all values');
      assertEqual(results[0].value.name, 'Alice', 'should extract first value with optional');
      assertEqual(results[1].value.name, 'Bob', 'should extract second value with optional');
      assertEqual(results[2].isJust, false, 'should handle Nothing with optional');
    }
  });
  
  // Test preview operation with cross-kind composition (lens.then(prism))
  const nameLens = lens(
    person => person.name,
    (person, name) => ({ ...person, name })
  );
  
  // Create a composed optic: valueLens.then(nameLens)
  const composedOptic = {
    get: (m) => m.isJust ? nameLens.get(m.value) : null,
    set: (m, name) => m.isJust ? new Maybe(nameLens.set(m.value, name), true) : m,
    over: (f, m) => m.isJust ? new Maybe(nameLens.over(f, m.value), true) : m
  };
  
  results = [];
  const previewComposedObservable = observable.preview(composedOptic);
  
  previewComposedObservable.subscribe({
    next: value => results.push(value),
    complete: () => {
      assertEqual(results.length, 3, 'should process all values');
      assertEqual(results[0].value, 'Alice', 'should extract name with composed optic');
      assertEqual(results[1].value, 'Bob', 'should extract name with composed optic');
      assertEqual(results[2].value, null, 'should handle Nothing with composed optic');
    }
  });
};

// ============================================================================
// Test 5: Realistic Examples
// ============================================================================

console.log('📋 Test 5: Realistic Examples');

const testRealisticExamples = () => {
  // Create enhanced Maybe constructor
  const JustOptics = addOpticsToConstructor(Maybe.Just);
  
  // Example: Working with user data
  const userLens = lens(
    u => u,
    (u, user) => user
  );
  
  const nameLens = lens(
    u => u.name,
    (u, name) => ({ ...u, name })
  );
  
  const ageLens = lens(
    u => u.age,
    (u, age) => ({ ...u, age })
  );
  
  // Compose lenses for nested access within Maybe
  const userNameLens = {
    get: (m) => m.isJust ? nameLens.get(m.value) : null,
    set: (m, name) => m.isJust ? new Maybe(nameLens.set(m.value, name), true) : m,
    over: (f, m) => m.isJust ? new Maybe(nameLens.over(f, m.value), true) : m
  };
  
  const userAgeLens = {
    get: (m) => m.isJust ? ageLens.get(m.value) : null,
    set: (m, age) => m.isJust ? new Maybe(ageLens.set(m.value, age), true) : m,
    over: (f, m) => m.isJust ? new Maybe(ageLens.over(f, m.value), true) : m
  };
  
  // Test with user data
  const maybeUser = JustOptics({ name: 'Alice', age: 25, email: 'alice@example.com' });
  
  // Extract user name
  const userName = maybeUser.view(userNameLens);
  assertEqual(userName, 'Alice', 'should extract user name');
  
  // Update user name
  const updatedUser = maybeUser.set(userNameLens, 'Bob');
  assertEqual(updatedUser.value.name, 'Bob', 'should update user name');
  
  // Transform user age
  const olderUser = maybeUser.over(userAgeLens, age => age + 1);
  assertEqual(olderUser.value.age, 26, 'should increment user age');
  
  // Example: Working with form validation
  const formLens = lens(
    f => f,
    (f, form) => form
  );
  
  const errorsLens = lens(
    f => f.errors || {},
    (f, errors) => ({ ...f, errors })
  );
  
  // Create lenses that work with Maybe<Form>
  const maybeFormLens = lens(
    m => m.isJust ? m.value : null,
    (m, form) => m.isJust ? new Maybe(form, true) : m
  );
  
  const maybeErrorsLens = lens(
    m => {
      if (!m.isJust) return null;
      return m.value.errors || {};
    },
    (m, errors) => {
      if (!m.isJust) return m;
      return new Maybe({ ...m.value, errors }, true);
    }
  );
  
  const fieldErrorLens = (fieldName) => ({
    get: (f) => {
      const errors = maybeErrorsLens.get(f);
      return errors ? errors[fieldName] || null : null;
    },
    set: (f, error) => {
      const errors = maybeErrorsLens.get(f);
      if (!errors) return f;
      const newErrors = { ...errors, [fieldName]: error };
      return maybeErrorsLens.set(f, newErrors);
    },
    over: (fn, f) => {
      const currentError = fieldErrorLens(fieldName).get(f);
      const newError = fn(currentError);
      return fieldErrorLens(fieldName).set(f, newError);
    }
  });
  
  const maybeForm = JustOptics({ 
    fields: { name: 'Alice', email: 'alice@example.com' },
    errors: { email: 'Invalid email format' }
  });
  
  // Check email error
  const emailError = maybeForm.view(fieldErrorLens('email'));
  assertEqual(emailError, 'Invalid email format', 'should extract email error');
  
  // Clear email error
  const clearedForm = maybeForm.set(fieldErrorLens('email'), null);
  assertEqual(clearedForm.value.errors.email, null, 'should clear email error');
  
  // Add name error
  const formWithNameError = maybeForm.set(fieldErrorLens('name'), 'Name is required');
  assertEqual(formWithNameError.value.errors.name, 'Name is required', 'should add name error');
};

// Run all tests
const runAllTests = () => {
  try {
    testTypeGuards();
    console.log('✅ Test 0 passed\n');
    
    testMaybeLensUsage();
    console.log('✅ Test 1 passed\n');
    
    testMaybePrismUsage();
    console.log('✅ Test 2 passed\n');
    
    testNestedOpticsComposition();
    console.log('✅ Test 3 passed\n');
    
    testObservableLiteOptics();
    console.log('✅ Test 4 passed\n');
    
    testRealisticExamples();
    console.log('✅ Test 5 passed\n');
    
    console.log('🎉 All ADT Optics tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
};

runAllTests(); 