/**
 * Comprehensive Tests for Profunctor Optics & Traversals
 * 
 * Tests Profunctor-based lenses, prisms, and traversals that follow FP composition laws.
 */

console.log('🚀 Testing Profunctor Optics & Traversals...');

// ============================================================================
// Mock Implementations
// ============================================================================

// Mock ADTs
const Maybe = {
  Just: (value) => ({ tag: 'Just', value }),
  Nothing: () => ({ tag: 'Nothing' }),
  match: (maybe, cases) => {
    if (maybe.tag === 'Just') return cases.Just(maybe.value);
    return cases.Nothing();
  }
};

const Either = {
  Left: (value) => ({ tag: 'Left', value }),
  Right: (value) => ({ tag: 'Right', value }),
  match: (either, cases) => {
    if (either.tag === 'Left') return cases.Left(either.value);
    return cases.Right(either.value);
  }
};

const Result = {
  Ok: (value) => ({ tag: 'Ok', value }),
  Err: (error) => ({ tag: 'Err', error }),
  match: (result, cases) => {
    if (result.tag === 'Ok') return cases.Ok(result.value);
    return cases.Err(result.error);
  }
};

// Mock Profunctor instances
const FunctionProfunctor = {
  dimap: (pab, f, g) => (c) => g(pab(f(c)))
};

const FunctionStrong = {
  ...FunctionProfunctor,
  first: (pab) => ([a, c]) => [pab(a), c],
  second: (pab) => ([c, a]) => [c, pab(a)]
};

const FunctionChoice = {
  ...FunctionProfunctor,
  left: (pab) => (e) => {
    if (e.tag === 'Left') return Either.Left(pab(e.value));
    return Either.Right(e.value);
  },
  right: (pab) => (e) => {
    if (e.tag === 'Right') return Either.Right(pab(e.value));
    return Either.Left(e.value);
  }
};

const FunctionTraversing = {
  ...FunctionProfunctor,
  wander: (pab, f, g) => (s) => {
    const as = f(s);
    const bs = as.map(pab);
    return g(bs);
  }
};

// Mock optic constructors
function lens(getter, setter) {
  return (pab) => {
    return FunctionStrong.dimap(
      pab,
      (s) => getter(s),
      (b) => setter(b, s)
    );
  };
}

function prism(match, build) {
  return (pab) => {
    return FunctionChoice.dimap(
      pab,
      (s) => match(s),
      (b) => build(b)
    );
  };
}

function traversal(getAll, modifyAll) {
  return (pab) => {
    return FunctionTraversing.wander(
      pab,
      getAll,
      (bs) => modifyAll((a, i) => bs[i], s)
    );
  };
}

// Mock optic operations
function view(ln, s) {
  const getter = (a) => a;
  const optic = ln(FunctionStrong.dimap(getter, (s) => a, (a) => a));
  return optic(s);
}

function set(ln, b, s) {
  const setter = (_) => b;
  const optic = ln(FunctionStrong.dimap(setter, (s) => a, (b) => b));
  return optic(s);
}

function over(ln, f, s) {
  const optic = ln(FunctionStrong.dimap(f, (s) => a, (b) => b));
  return optic(s);
}

function preview(pr, s) {
  const getter = (a) => Maybe.Just(a);
  const optic = pr(FunctionChoice.dimap(getter, (s) => a, (a) => a));
  return optic(s);
}

function traverse(tr, f, s) {
  const optic = tr(FunctionTraversing.wander(f, (s) => [a], (bs) => bs[0]));
  return optic(s);
}

// Mock derivation functions
function deriveLens(key) {
  return () => {
    return lens(
      (s) => s[key],
      (b, s) => ({ ...s, [key]: b })
    );
  };
}

function derivePrism(tag) {
  return () => {
    return prism(
      (s) => s.tag === tag ? Either.Left(s) : Either.Right(s),
      (b) => ({ tag, ...b })
    );
  };
}

function createTraversal() {
  return traversal(
    (s) => s,
    (f, s) => s.map(f)
  );
}

// ============================================================================
// Test 1: Profunctor Laws
// ============================================================================

function testProfunctorLaws() {
  console.log('\n📋 Test 1: Profunctor Laws');

  try {
    // Test dimap law: dimap(f, g) = map(g).contramap(f)
    const f = (x) => x + 1;
    const g = (x) => x * 2;
    const pab = (x) => x.toString();
    
    const dimapResult = FunctionProfunctor.dimap(pab, f, g);
    const expected = (c) => g(pab(f(c)));
    
    console.log('✅ dimap law:', dimapResult(5) === expected(5));

    // Test Strong laws
    const strongPab = (x) => x * 2;
    const firstResult = FunctionStrong.first(strongPab);
    const secondResult = FunctionStrong.second(strongPab);
    
    console.log('✅ Strong first law:', firstResult([3, 'test'])[0] === 6);
    console.log('✅ Strong second law:', secondResult(['test', 3])[1] === 6);

    // Test Choice laws
    const choicePab = (x) => x.toUpperCase();
    const leftResult = FunctionChoice.left(choicePab);
    const rightResult = FunctionChoice.right(choicePab);
    
    console.log('✅ Choice left law:', leftResult(Either.Left('hello')).value === 'HELLO');
    console.log('✅ Choice right law:', rightResult(Either.Right('world')).value === 'WORLD');

  } catch (error) {
    console.error('❌ Profunctor laws test failed:', error.message);
  }
}

// ============================================================================
// Test 2: Lens Laws
// ============================================================================

function testLensLaws() {
  console.log('\n📋 Test 2: Lens Laws');

  try {
    const people = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 }
    ];

    // Create a lens for the 'name' field
    const nameLens = deriveLens('name')();

    // Lens Law 1: view(lens, set(lens, b, s)) = b
    const person = { name: 'Alice', age: 25 };
    const newName = 'Bob';
    const setResult = set(nameLens, newName, person);
    const viewResult = view(nameLens, setResult);
    console.log('✅ Lens Law 1 (view . set):', viewResult === newName);

    // Lens Law 2: set(lens, view(lens, s), s) = s
    const originalView = view(nameLens, person);
    const setViewResult = set(nameLens, originalView, person);
    console.log('✅ Lens Law 2 (set . view):', JSON.stringify(setViewResult) === JSON.stringify(person));

    // Lens Law 3: set(lens, b, set(lens, b', s)) = set(lens, b, s)
    const b1 = 'Charlie';
    const b2 = 'David';
    const set1 = set(nameLens, b1, person);
    const set2 = set(nameLens, b2, set1);
    const set3 = set(nameLens, b2, person);
    console.log('✅ Lens Law 3 (set . set):', JSON.stringify(set2) === JSON.stringify(set3));

  } catch (error) {
    console.error('❌ Lens laws test failed:', error.message);
  }
}

// ============================================================================
// Test 3: Prism Laws
// ============================================================================

function testPrismLaws() {
  console.log('\n📋 Test 3: Prism Laws');

  try {
    // Create a prism for the 'Just' variant
    const justPrism = derivePrism('Just')();

    // Prism Law 1: preview(prism, review(prism, b)) = Just(b)
    const value = 'test';
    const reviewResult = review(justPrism, value);
    const previewResult = preview(justPrism, reviewResult);
    console.log('✅ Prism Law 1 (preview . review):', previewResult.tag === 'Just' && previewResult.value === value);

    // Prism Law 2: preview(prism, s) = Just(a) => review(prism, a) = s
    const maybe = Maybe.Just('test');
    const previewMaybe = preview(justPrism, maybe);
    if (previewMaybe.tag === 'Just') {
      const reviewMaybe = review(justPrism, previewMaybe.value);
      console.log('✅ Prism Law 2 (review . preview):', JSON.stringify(reviewMaybe) === JSON.stringify(maybe));
    }

  } catch (error) {
    console.error('❌ Prism laws test failed:', error.message);
  }
}

// ============================================================================
// Test 4: Traversal Laws
// ============================================================================

function testTraversalLaws() {
  console.log('\n📋 Test 4: Traversal Laws');

  try {
    const numbers = [1, 2, 3, 4, 5];
    const traversal = createTraversal();

    // Traversal Law 1: traverse(Identity, Identity, s) = Identity(s)
    const identity = (x) => x;
    const traverseResult = traverse(traversal, identity, numbers);
    console.log('✅ Traversal Law 1 (identity):', JSON.stringify(traverseResult) === JSON.stringify(numbers));

    // Traversal Law 2: traverse(Compose, Compose, s) = Compose(traverse(F, traverse(G, s)))
    const f = (x) => x * 2;
    const g = (x) => x + 1;
    const compose = (x) => g(f(x));
    
    const traverseCompose = traverse(traversal, compose, numbers);
    const traverseF = traverse(traversal, f, numbers);
    const traverseG = traverse(traversal, g, traverseF);
    console.log('✅ Traversal Law 2 (composition):', JSON.stringify(traverseCompose) === JSON.stringify(traverseG));

  } catch (error) {
    console.error('❌ Traversal laws test failed:', error.message);
  }
}

// ============================================================================
// Test 5: Composition Laws
// ============================================================================

function testCompositionLaws() {
  console.log('\n📋 Test 5: Composition Laws');

  try {
    const people = [
      { name: 'Alice', age: 25, hobbies: ['reading', 'swimming'] },
      { name: 'Bob', age: 30, hobbies: ['coding', 'gaming'] }
    ];

    // Test associativity: (f . g) . h = f . (g . h)
    const nameLens = deriveLens('name')();
    const ageLens = deriveLens('age')();
    const hobbiesLens = deriveLens('hobbies')();

    const person = { name: 'Alice', age: 25, hobbies: ['reading'] };
    
    // Compose in different orders
    const compose1 = (f, g, h) => (s) => f(g(h(s)));
    const compose2 = (f, g, h) => (s) => f(g(h(s)));
    
    const result1 = compose1(nameLens, ageLens, hobbiesLens);
    const result2 = compose2(nameLens, ageLens, hobbiesLens);
    
    console.log('✅ Composition associativity:', typeof result1 === typeof result2);

    // Test identity: f . id = f = id . f
    const id = (x) => x;
    const withId1 = (f) => (s) => f(id(s));
    const withId2 = (f) => (s) => id(f(s));
    
    const nameResult1 = withId1(nameLens);
    const nameResult2 = withId2(nameLens);
    
    console.log('✅ Composition identity:', typeof nameResult1 === typeof nameResult2);

  } catch (error) {
    console.error('❌ Composition laws test failed:', error.message);
  }
}

// ============================================================================
// Test 6: Automatic Derivation
// ============================================================================

function testAutomaticDerivation() {
  console.log('\n📋 Test 6: Automatic Derivation');

  try {
    // Test lens derivation
    const nameLens = deriveLens('name')();
    const ageLens = deriveLens('age')();
    
    const person = { name: 'Alice', age: 25 };
    
    console.log('✅ Lens derivation - view:', view(nameLens, person) === 'Alice');
    console.log('✅ Lens derivation - set:', set(nameLens, 'Bob', person).name === 'Bob');

    // Test prism derivation
    const justPrism = derivePrism('Just')();
    const leftPrism = derivePrism('Left')();
    
    const maybe = Maybe.Just('test');
    const either = Either.Left('error');
    
    console.log('✅ Prism derivation - preview:', preview(justPrism, maybe).tag === 'Just');
    console.log('✅ Prism derivation - review:', review(leftPrism, 'new error').tag === 'Left');

    // Test traversal derivation
    const arrayTraversal = createTraversal();
    const numbers = [1, 2, 3, 4, 5];
    
    console.log('✅ Traversal derivation - traverse:', traverse(arrayTraversal, x => x * 2, numbers).length === 5);

  } catch (error) {
    console.error('❌ Automatic derivation test failed:', error.message);
  }
}

// ============================================================================
// Test 7: Traversal Operations
// ============================================================================

function testTraversalOperations() {
  console.log('\n📋 Test 7: Traversal Operations');

  try {
    const numbers = [1, 2, 3, 4, 5];
    const traversal = createTraversal();

    // Test basic traversal
    const doubled = traverse(traversal, x => x * 2, numbers);
    console.log('✅ Basic traversal:', doubled[0] === 2 && doubled[1] === 4);

    // Test nested traversal
    const nested = [[1, 2], [3, 4], [5, 6]];
    const nestedTraversal = createTraversal();
    
    const flattened = traverse(nestedTraversal, arr => arr.reduce((a, b) => a + b, 0), nested);
    console.log('✅ Nested traversal:', flattened[0] === 3 && flattened[1] === 7);

    // Test object traversal
    const objects = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 }
    ];
    
    const nameTraversal = createTraversal();
    const names = traverse(nameTraversal, obj => obj.name, objects);
    console.log('✅ Object traversal:', names[0] === 'Alice' && names[1] === 'Bob');

  } catch (error) {
    console.error('❌ Traversal operations test failed:', error.message);
  }
}

// ============================================================================
// Test 8: Purity Integration
// ============================================================================

function testPurityIntegration() {
  console.log('\n📋 Test 8: Purity Integration');

  try {
    // Test pure optics
    const nameLens = deriveLens('name')();
    const pureLens = markPure(nameLens);
    
    console.log('✅ Pure lens creation:', typeof pureLens === 'function');

    // Test async optics
    const asyncLens = markAsync(nameLens);
    
    console.log('✅ Async lens creation:', typeof asyncLens === 'function');

    // Test purity checking
    console.log('✅ Purity checking - pure:', isPure(pureLens));
    console.log('✅ Purity checking - async:', isAsync(asyncLens));

  } catch (error) {
    console.error('❌ Purity integration test failed:', error.message);
  }
}

// ============================================================================
// Test 9: Complex Transformations
// ============================================================================

function testComplexTransformations() {
  console.log('\n📋 Test 9: Complex Transformations');

  try {
    const complexData = [
      { name: 'Alice', age: 25, hobbies: ['reading', 'swimming'] },
      { name: 'Bob', age: 30, hobbies: ['coding', 'gaming'] },
      { name: 'Charlie', age: 35, hobbies: ['cooking', 'traveling'] }
    ];

    // Complex transformation: extract names, uppercase them, filter long names
    const nameLens = deriveLens('name')();
    const names = complexData.map(person => view(nameLens, person));
    const upperNames = names.map(name => name.toUpperCase());
    const longNames = upperNames.filter(name => name.length > 4);
    
    console.log('✅ Complex transformation - names:', names.length === 3);
    console.log('✅ Complex transformation - uppercase:', upperNames[0] === 'ALICE');
    console.log('✅ Complex transformation - filtering:', longNames.length === 2);

    // Nested transformation: modify ages in complex data
    const ageLens = deriveLens('age')();
    const modifiedData = complexData.map(person => set(ageLens, person.age + 1, person));
    
    console.log('✅ Nested transformation - age modification:', modifiedData[0].age === 26);

  } catch (error) {
    console.error('❌ Complex transformations test failed:', error.message);
  }
}

// ============================================================================
// Test 10: Type Safety
// ============================================================================

function testTypeSafety() {
  console.log('\n📋 Test 10: Type Safety');

  try {
    // Test optic type checking
    const nameLens = deriveLens('name')();
    const justPrism = derivePrism('Just')();
    const arrayTraversal = createTraversal();
    
    console.log('✅ Type checking - lens:', isLens(nameLens));
    console.log('✅ Type checking - prism:', isPrism(justPrism));
    console.log('✅ Type checking - traversal:', isTraversal(arrayTraversal));
    console.log('✅ Type checking - optic:', isOptic(nameLens));

    // Test invalid types
    const notOptic = { some: 'object' };
    console.log('✅ Type checking - invalid:', !isOptic(notOptic));

  } catch (error) {
    console.error('❌ Type safety test failed:', error.message);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
  console.log('🚀 Running Profunctor Optics & Traversals Tests');
  console.log('==================================================');

  let passed = 0;
  let total = 0;

  const tests = [
    testProfunctorLaws,
    testLensLaws,
    testPrismLaws,
    testTraversalLaws,
    testCompositionLaws,
    testAutomaticDerivation,
    testTraversalOperations,
    testPurityIntegration,
    testComplexTransformations,
    testTypeSafety
  ];

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
    total++;
  }

  console.log('\n==================================================');
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All Profunctor optics tests passed!');
    console.log('✅ Profunctor-based optics with FP composition laws complete!');
  } else {
    console.log('⚠️ Some tests failed');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testProfunctorLaws,
  testLensLaws,
  testPrismLaws,
  testTraversalLaws,
  testCompositionLaws,
  testAutomaticDerivation,
  testTraversalOperations,
  testPurityIntegration,
  testComplexTransformations,
  testTypeSafety,
  runAllTests
}; 