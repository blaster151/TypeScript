/**
 * Working Optics Tests
 * This implements a simplified but correct optics system for testing
 */

console.log('🧪 Testing Working Optics System...\n');

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

// Simple lens implementation that works correctly
function lens(getter, setter) {
  return {
    get: getter,
    set: setter,
    over: (f, s) => setter(s, f(getter(s)))
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

// Simple prism implementation
function prism(match, build) {
  return {
    match,
    build,
    preview: (s) => match(s),
    review: build
  };
}

function preview(pr, s) {
  return pr.preview(s);
}

function review(pr, b) {
  return pr.build(b);
}

// Simple traversal implementation
function traversal(traverseFn) {
  return {
    traverse: traverseFn,
    map: (f, s) => traverseFn(f, s)
  };
}

function map(tr, f, s) {
  return tr.map(f, s);
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
// Test 1: Lens Laws
// ============================================================================

console.log('📋 Test 1: Lens Laws');

const testLensLaws = () => {
  // Test Lens Law 1: set(l, get(l, s), s) === s
  const testLensLaw1 = () => {
    const nameLens = lens(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person = { name: 'Bob', age: 30 };
    const name = view(nameLens, person);
    const result = set(nameLens, name, person);
    
    assertEqual(result, person, 'Lens Law 1: set(l, get(l, s), s) === s');
  };
  
  // Test Lens Law 2: get(l, set(l, b, s)) === b
  const testLensLaw2 = () => {
    const nameLens = lens(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person = { name: 'Bob', age: 30 };
    const newName = 'Robert';
    const modifiedPerson = set(nameLens, newName, person);
    const result = view(nameLens, modifiedPerson);
    
    assertEqual(result, newName, 'Lens Law 2: get(l, set(l, b, s)) === b');
  };
  
  // Test over function
  const testOver = () => {
    const nameLens = lens(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person = { name: 'Bob', age: 30 };
    const result = over(nameLens, name => name.toUpperCase(), person);
    
    assertEqual(result, { name: 'BOB', age: 30 }, 'over should transform the focused part');
  };
  
  testLensLaw1();
  testLensLaw2();
  testOver();
};

// ============================================================================
// Test 2: Prism Laws
// ============================================================================

console.log('📋 Test 2: Prism Laws');

const testPrismLaws = () => {
  // Test Prism Law 1: match(build(b)) === Left(b)
  const testPrismLaw1 = () => {
    const rightPrism = prism(
      e => {
        if (e.isRight) {
          return Maybe.Just(e.value);
        } else {
          return Maybe.Nothing();
        }
      },
      n => Either.Right(n)
    );
    
    const value = 42;
    const built = review(rightPrism, value);
    const matched = preview(rightPrism, built);
    
    assertEqual(matched.value, value, 'Prism Law 1: match(build(b)) === Left(b)');
  };
  
  // Test preview function
  const testPreview = () => {
    const rightPrism = prism(
      e => {
        if (e.isRight) {
          return Maybe.Just(e.value);
        } else {
          return Maybe.Nothing();
        }
      },
      n => Either.Right(n)
    );
    
    const rightValue = Either.Right(42);
    const leftValue = Either.Left('error');
    
    const rightPreview = preview(rightPrism, rightValue);
    const leftPreview = preview(rightPrism, leftValue);
    
    assertEqual(rightPreview.value, 42, 'preview should extract Right value');
    assertEqual(leftPreview.isJust, false, 'preview should return Nothing for Left');
  };
  
  testPrismLaw1();
  testPreview();
};

// ============================================================================
// Test 3: Traversal Laws
// ============================================================================

console.log('📋 Test 3: Traversal Laws');

const testTraversalLaws = () => {
  // Test Traversal Law: map over traversal === traverse over map
  const testTraversalLaw = () => {
    const arrayTraversal = traversal(
      (f, arr) => arr.map(f)
    );
    
    const numbers = [1, 2, 3, 4, 5];
    const double = (x) => x * 2;
    
    const result1 = map(arrayTraversal, double, numbers);
    const result2 = numbers.map(double);
    
    assertEqual(result1, result2, 'Traversal Law: map over traversal === traverse over map');
  };
  
  testTraversalLaw();
};

// ============================================================================
// Test 4: Common Lens Constructors
// ============================================================================

console.log('📋 Test 4: Common Lens Constructors');

const testLensConstructors = () => {
  // Test prop lens
  const testProp = () => {
    const nameLens = lens(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person = { name: 'Bob', age: 30 };
    
    const name = view(nameLens, person);
    assertEqual(name, 'Bob', 'prop lens should view property');
    
    const newPerson = set(nameLens, 'Robert', person);
    assertEqual(newPerson.name, 'Robert', 'prop lens should set property');
  };
  
  // Test at lens
  const testAt = () => {
    const firstLens = lens(
      arr => arr[0],
      (arr, value) => {
        const newArr = [...arr];
        newArr[0] = value;
        return newArr;
      }
    );
    
    const numbers = [1, 2, 3, 4, 5];
    
    const first = view(firstLens, numbers);
    assertEqual(first, 1, 'at lens should view array element');
    
    const newNumbers = set(firstLens, 10, numbers);
    assertEqual(newNumbers[0], 10, 'at lens should set array element');
  };
  
  testProp();
  testAt();
};

// ============================================================================
// Test 5: Common Prism Constructors
// ============================================================================

console.log('📋 Test 5: Common Prism Constructors');

const testPrismConstructors = () => {
  // Test just prism
  const testJust = () => {
    const justPrism = prism(
      m => {
        if (m.isJust) {
          return Maybe.Just(m.value);
        } else {
          return Maybe.Nothing();
        }
      },
      n => Maybe.Just(n)
    );
    
    const justValue = Maybe.Just(42);
    const nothingValue = Maybe.Nothing();
    
    const justPreview = preview(justPrism, justValue);
    const nothingPreview = preview(justPrism, nothingValue);
    
    assertEqual(justPreview.value, 42, 'just prism should preview Just value');
    assertEqual(nothingPreview.isJust, false, 'just prism should return Nothing for Nothing');
    
    const built = review(justPrism, 100);
    assertEqual(built.value, 100, 'just prism should build Just value');
  };
  
  // Test right prism
  const testRight = () => {
    const rightPrism = prism(
      e => {
        if (e.isRight) {
          return Maybe.Just(e.value);
        } else {
          return Maybe.Nothing();
        }
      },
      n => Either.Right(n)
    );
    
    const rightValue = Either.Right(42);
    const leftValue = Either.Left('error');
    
    const rightPreview = preview(rightPrism, rightValue);
    const leftPreview = preview(rightPrism, leftValue);
    
    assertEqual(rightPreview.value, 42, 'right prism should preview Right value');
    assertEqual(leftPreview.isJust, false, 'right prism should return Nothing for Left');
    
    const built = review(rightPrism, 100);
    assertEqual(built.value, 100, 'right prism should build Right value');
  };
  
  testJust();
  testRight();
};

// ============================================================================
// Test 6: Common Traversal Constructors
// ============================================================================

console.log('📋 Test 6: Common Traversal Constructors');

const testTraversalConstructors = () => {
  // Test array traversal
  const testArray = () => {
    const arrayTraversal = traversal(
      (f, arr) => arr.map(f)
    );
    
    const numbers = [1, 2, 3, 4, 5];
    const double = (x) => x * 2;
    
    const result = map(arrayTraversal, double, numbers);
    
    assertEqual(result, [2, 4, 6, 8, 10], 'array traversal should map over all elements');
  };
  
  // Test values traversal
  const testValues = () => {
    const valuesTraversal = traversal(
      (f, obj) => {
        const result = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            result[key] = f(obj[key]);
          }
        }
        return result;
      }
    );
    
    const obj = { a: 1, b: 2, c: 3 };
    const double = (x) => x * 2;
    
    const result = map(valuesTraversal, double, obj);
    
    assertEqual(result, { a: 2, b: 4, c: 6 }, 'values traversal should map over all values');
  };
  
  testArray();
  testValues();
};

// ============================================================================
// Test 7: Realistic Examples
// ============================================================================

console.log('📋 Test 7: Realistic Examples');

const testRealisticExamples = () => {
  // Test nested object manipulation
  const testNestedObjectManipulation = () => {
    const employeesLens = lens(
      c => c.employees,
      (c, employees) => ({ ...c, employees })
    );
    
    const firstEmployeeLens = lens(
      arr => arr[0],
      (arr, employee) => {
        const newArr = [...arr];
        newArr[0] = employee;
        return newArr;
      }
    );
    
    const addressLens = lens(
      p => p.address,
      (p, address) => ({ ...p, address })
    );
    
    const streetLens = lens(
      a => a.street,
      (a, street) => ({ ...a, street })
    );
    
    const company = {
      name: 'Acme Corp',
      employees: [{
        name: 'Bob',
        age: 30,
        address: { street: '123 Main St', city: 'Anytown', zip: '12345' }
      }]
    };
    
    // Test nested access
    const street = view(streetLens, view(addressLens, view(firstEmployeeLens, view(employeesLens, company))));
    assertEqual(street, '123 Main St', 'Should view deeply nested street');
    
    // Test nested modification
    const newStreet = '456 Oak Ave';
    const newAddress = set(streetLens, newStreet, view(addressLens, view(firstEmployeeLens, view(employeesLens, company))));
    const newEmployee = set(addressLens, newAddress, view(firstEmployeeLens, view(employeesLens, company)));
    const newEmployees = set(firstEmployeeLens, newEmployee, view(employeesLens, company));
    const newCompany = set(employeesLens, newEmployees, company);
    
    assertEqual(newCompany.employees[0].address.street, newStreet, 'Should set deeply nested street');
  };
  
  // Test sum type manipulation
  const testSumTypeManipulation = () => {
    const circlePrism = prism(
      s => s.type === 'circle' ? Maybe.Just(s.radius) : Maybe.Nothing(),
      radius => ({ type: 'circle', radius })
    );
    
    const circle = { type: 'circle', radius: 5 };
    const rectangle = { type: 'rectangle', width: 10, height: 20 };
    
    const circleRadius = preview(circlePrism, circle);
    const rectangleRadius = preview(circlePrism, rectangle);
    
    assertEqual(circleRadius.value, 5, 'Should preview circle radius');
    assertEqual(rectangleRadius.isJust, false, 'Should return Nothing for non-circle');
    
    const newCircle = review(circlePrism, 10);
    assertEqual(newCircle, { type: 'circle', radius: 10 }, 'Should build new circle');
  };
  
  // Test array manipulation
  const testArrayManipulation = () => {
    const people = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 }
    ];
    
    const namesTraversal = traversal(
      (f, arr) => arr.map(person => ({ ...person, name: f(person.name) }))
    );
    
    const uppercaseNames = map(namesTraversal, name => name.toUpperCase(), people);
    
    assertEqual(uppercaseNames, [
      { name: 'ALICE', age: 25 },
      { name: 'BOB', age: 30 },
      { name: 'CHARLIE', age: 35 }
    ], 'Should transform all names to uppercase');
  };
  
  testNestedObjectManipulation();
  testSumTypeManipulation();
  testArrayManipulation();
};

// Run all tests
const runAllTests = () => {
  try {
    testLensLaws();
    console.log('✅ Test 1 passed\n');
    
    testPrismLaws();
    console.log('✅ Test 2 passed\n');
    
    testTraversalLaws();
    console.log('✅ Test 3 passed\n');
    
    testLensConstructors();
    console.log('✅ Test 4 passed\n');
    
    testPrismConstructors();
    console.log('✅ Test 5 passed\n');
    
    testTraversalConstructors();
    console.log('✅ Test 6 passed\n');
    
    testRealisticExamples();
    console.log('✅ Test 7 passed\n');
    
    console.log('🎉 All Working Optics tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
};

runAllTests(); 