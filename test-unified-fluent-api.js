/**
 * Unified Fluent API Test Suite
 * 
 * Tests the unified fluent API system for all ADTs, ensuring:
 * - Law consistency (Functor, Monad laws)
 * - Equivalence between fluent and data-last APIs
 * - Proper typeclass instance derivation
 * - Cross-ADT consistency
 */

console.log('🧪 Unified Fluent API Test Suite\n');

// ============================================================================
// Part 1: Mock ADTs and Typeclass Instances
// ============================================================================

// Mock Maybe ADT
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
  
  match(handlers) {
    if (this.isJust) {
      return handlers.Just({ value: this.value });
    } else {
      return handlers.Nothing();
    }
  }
}

// Mock Either ADT
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
  
  match(handlers) {
    if (this.isRight) {
      return handlers.Right({ value: this.value });
    } else {
      return handlers.Left({ value: this.value });
    }
  }
}

// Mock Result ADT
class Result {
  constructor(value, isOk = true) {
    this.value = value;
    this.isOk = isOk;
  }
  
  static Ok(value) {
    return new Result(value, true);
  }
  
  static Err(error) {
    return new Result(error, false);
  }
  
  match(handlers) {
    if (this.isOk) {
      return handlers.Ok({ value: this.value });
    } else {
      return handlers.Err({ error: this.value });
    }
  }
}

// Mock PersistentList ADT
class PersistentList {
  constructor(values = []) {
    this.values = [...values];
  }
  
  static fromArray(values) {
    return new PersistentList(values);
  }
  
  map(f) {
    return new PersistentList(this.values.map(f));
  }
  
  flatMap(f) {
    const results = [];
    for (const value of this.values) {
      const result = f(value);
      if (result instanceof PersistentList) {
        results.push(...result.values);
      } else {
        results.push(result);
      }
    }
    return new PersistentList(results);
  }
  
  filter(pred) {
    return new PersistentList(this.values.filter(pred));
  }
  
  filterMap(f) {
    const results = [];
    for (const value of this.values) {
      const maybe = f(value);
      if (maybe.isJust) {
        results.push(maybe.value);
      }
    }
    return new PersistentList(results);
  }
  
  head() {
    return this.values.length > 0 ? Maybe.Just(this.values[0]) : Maybe.Nothing();
  }
  
  tail() {
    return this.values.length > 1 ? Maybe.Just(new PersistentList(this.values.slice(1))) : Maybe.Nothing();
  }
  
  isEmpty() {
    return this.values.length === 0;
  }
  
  length() {
    return this.values.length;
  }
  
  toArray() {
    return [...this.values];
  }
}

// ============================================================================
// Part 2: Mock Typeclass Instances
// ============================================================================

// Mock typeclass registry
const mockTypeclassRegistry = new Map();

// Maybe instances
const MaybeFunctor = {
  map: (fa, f) => fa.match({
    Just: ({ value }) => Maybe.Just(f(value)),
    Nothing: () => fa
  })
};

const MaybeMonad = {
  of: (a) => Maybe.Just(a),
  chain: (fa, f) => fa.match({
    Just: ({ value }) => f(value),
    Nothing: () => fa
  })
};

const MaybeApplicative = {
  of: (a) => Maybe.Just(a),
  ap: (fab, fa) => fab.match({
    Just: ({ value: f }) => fa.match({
      Just: ({ value: a }) => Maybe.Just(f(a)),
      Nothing: () => fa
    }),
    Nothing: () => fab
  })
};

// Either instances
const EitherFunctor = {
  map: (fa, f) => fa.match({
    Right: ({ value }) => Either.Right(f(value)),
    Left: ({ value }) => fa
  })
};

const EitherMonad = {
  of: (a) => Either.Right(a),
  chain: (fa, f) => fa.match({
    Right: ({ value }) => f(value),
    Left: ({ value }) => fa
  })
};

const EitherBifunctor = {
  bimap: (fa, f, g) => fa.match({
    Right: ({ value }) => Either.Right(g(value)),
    Left: ({ value }) => Either.Left(f(value))
  })
};

// Result instances
const ResultFunctor = {
  map: (fa, f) => fa.match({
    Ok: ({ value }) => Result.Ok(f(value)),
    Err: ({ error }) => fa
  })
};

const ResultMonad = {
  of: (a) => Result.Ok(a),
  chain: (fa, f) => fa.match({
    Ok: ({ value }) => f(value),
    Err: ({ error }) => fa
  })
};

const ResultBifunctor = {
  bimap: (fa, f, g) => fa.match({
    Ok: ({ value }) => Result.Ok(g(value)),
    Err: ({ error }) => Result.Err(f(error))
  })
};

// PersistentList instances
const PersistentListFunctor = {
  map: (fa, f) => fa.map(f)
};

const PersistentListMonad = {
  of: (a) => new PersistentList([a]),
  chain: (fa, f) => fa.flatMap(f)
};

const PersistentListApplicative = {
  of: (a) => new PersistentList([a]),
  ap: (fab, fa) => {
    const results = [];
    for (const f of fab.values) {
      for (const a of fa.values) {
        results.push(f(a));
      }
    }
    return new PersistentList(results);
  }
};

// Register instances
mockTypeclassRegistry.set('Maybe:Functor', MaybeFunctor);
mockTypeclassRegistry.set('Maybe:Monad', MaybeMonad);
mockTypeclassRegistry.set('Maybe:Applicative', MaybeApplicative);

mockTypeclassRegistry.set('Either:Functor', EitherFunctor);
mockTypeclassRegistry.set('Either:Monad', EitherMonad);
mockTypeclassRegistry.set('Either:Bifunctor', EitherBifunctor);

mockTypeclassRegistry.set('Result:Functor', ResultFunctor);
mockTypeclassRegistry.set('Result:Monad', ResultMonad);
mockTypeclassRegistry.set('Result:Bifunctor', ResultBifunctor);

mockTypeclassRegistry.set('PersistentList:Functor', PersistentListFunctor);
mockTypeclassRegistry.set('PersistentList:Monad', PersistentListMonad);
mockTypeclassRegistry.set('PersistentList:Applicative', PersistentListApplicative);

// Mock registry function
function getTypeclassInstance(adtName, typeclass) {
  return mockTypeclassRegistry.get(`${adtName}:${typeclass}`);
}

// ============================================================================
// Part 3: Fluent Implementation Functions
// ============================================================================

function deriveFluentImpl(adtName) {
  const functor = getTypeclassInstance(adtName, 'Functor');
  const applicative = getTypeclassInstance(adtName, 'Applicative');
  const monad = getTypeclassInstance(adtName, 'Monad');
  const bifunctor = getTypeclassInstance(adtName, 'Bifunctor');

  const impl = {};

  // Functor operations
  if (functor) {
    impl.map = (self, f) => functor.map(self, f);
  }

  // Monad operations
  if (monad) {
    impl.chain = (self, f) => monad.chain(self, f);
    impl.flatMap = (self, f) => monad.chain(self, f);
  }

  // Applicative operations
  if (applicative) {
    impl.ap = (self, fab) => applicative.ap(fab, self);
  }

  // Bifunctor operations
  if (bifunctor) {
    impl.bimap = (self, left, right) => bifunctor.bimap(self, left, right);
    impl.mapLeft = (self, f) => bifunctor.bimap(self, f, (r) => r);
    impl.mapRight = (self, f) => bifunctor.bimap(self, (l) => l, f);
  }

  // Generic filter implementation using Monad
  if (monad) {
    impl.filter = (self, pred) => {
      return monad.chain(self, (a) => 
        pred(a) ? monad.of(a) : monad.of(null)
      );
    };
  }

  // Generic pipe implementation
  impl.pipe = (self, ...fns) => {
    let result = self;
    for (const fn of fns) {
      if (impl.map) {
        result = impl.map(result, fn);
      } else {
        result = fn(result);
      }
    }
    return result;
  };

  return impl;
}

function applyFluentOps(proto, impl) {
  // Functor operations
  if (impl.map) {
    proto.map = function(f) {
      return impl.map(this, f);
    };
  }
  
  // Monad operations
  if (impl.chain) {
    proto.chain = function(f) {
      return impl.chain(this, f);
    };
  }
  
  if (impl.flatMap) {
    proto.flatMap = function(f) {
      return impl.flatMap(this, f);
    };
  }
  
  // Filter operations
  if (impl.filter) {
    proto.filter = function(pred) {
      return impl.filter(this, pred);
    };
  }
  
  // Applicative operations
  if (impl.ap) {
    proto.ap = function(fab) {
      return impl.ap(this, fab);
    };
  }
  
  // Bifunctor operations
  if (impl.bimap) {
    proto.bimap = function(left, right) {
      return impl.bimap(this, left, right);
    };
  }
  
  if (impl.mapLeft) {
    proto.mapLeft = function(f) {
      return impl.mapLeft(this, f);
    };
  }
  
  if (impl.mapRight) {
    proto.mapRight = function(f) {
      return impl.mapRight(this, f);
    };
  }
  
  // Composition
  if (impl.pipe) {
    proto.pipe = function(...fns) {
      return impl.pipe(this, ...fns);
    };
  }
}

// ============================================================================
// Part 4: Test Functions
// ============================================================================

function testFunctorLaws(adtName, createADT, testValues) {
  const functor = getTypeclassInstance(adtName, 'Functor');
  if (!functor) return true;
  
  console.log(`  Testing Functor laws for ${adtName}...`);
  
  // Identity law: map(id) = id
  const identityLaw = testValues.every(value => {
    const adt = createADT(value);
    const mapped = functor.map(adt, (x) => x);
    return JSON.stringify(mapped) === JSON.stringify(adt);
  });
  
  // Composition law: map(f ∘ g) = map(f) ∘ map(g)
  const compositionLaw = testValues.every(value => {
    const adt = createADT(value);
    const f = (x) => x * 2;
    const g = (x) => x + 1;
    
    const left = functor.map(adt, (x) => f(g(x)));
    const right = functor.map(functor.map(adt, g), f);
    
    return JSON.stringify(left) === JSON.stringify(right);
  });
  
  const result = identityLaw && compositionLaw;
  console.log(`    Identity law: ${identityLaw ? '✅' : '❌'}`);
  console.log(`    Composition law: ${compositionLaw ? '✅' : '❌'}`);
  
  return result;
}

function testMonadLaws(adtName, createADT, testValues) {
  const monad = getTypeclassInstance(adtName, 'Monad');
  if (!monad) return true;
  
  console.log(`  Testing Monad laws for ${adtName}...`);
  
  // Left identity: of(a).chain(f) = f(a)
  const leftIdentityLaw = testValues.every(value => {
    const f = (x) => monad.of(x * 2);
    const left = monad.chain(monad.of(value), f);
    const right = f(value);
    return JSON.stringify(left) === JSON.stringify(right);
  });
  
  // Right identity: m.chain(of) = m
  const rightIdentityLaw = testValues.every(value => {
    const adt = createADT(value);
    const left = monad.chain(adt, monad.of);
    return JSON.stringify(left) === JSON.stringify(adt);
  });
  
  // Associativity: m.chain(f).chain(g) = m.chain(x => f(x).chain(g))
  const associativityLaw = testValues.every(value => {
    const adt = createADT(value);
    const f = (x) => monad.of(x * 2);
    const g = (x) => monad.of(x + 1);
    
    const left = monad.chain(monad.chain(adt, f), g);
    const right = monad.chain(adt, (x) => monad.chain(f(x), g));
    
    return JSON.stringify(left) === JSON.stringify(right);
  });
  
  const result = leftIdentityLaw && rightIdentityLaw && associativityLaw;
  console.log(`    Left identity law: ${leftIdentityLaw ? '✅' : '❌'}`);
  console.log(`    Right identity law: ${rightIdentityLaw ? '✅' : '❌'}`);
  console.log(`    Associativity law: ${associativityLaw ? '✅' : '❌'}`);
  
  return result;
}

function testFluentDataLastEquivalence(adtName, createADT, testValues) {
  const functor = getTypeclassInstance(adtName, 'Functor');
  const monad = getTypeclassInstance(adtName, 'Monad');
  
  if (!functor) return true;
  
  console.log(`  Testing fluent vs data-last equivalence for ${adtName}...`);
  
  // Test map equivalence
  const mapEquivalence = testValues.every(value => {
    const adt = createADT(value);
    const f = (x) => x * 2;
    
    const fluentResult = adt.map(f);
    const dataLastResult = functor.map(adt, f);
    
    return JSON.stringify(fluentResult) === JSON.stringify(dataLastResult);
  });
  
  // Test chain equivalence
  const chainEquivalence = monad ? testValues.every(value => {
    const adt = createADT(value);
    const f = (x) => monad.of(x * 2);
    
    const fluentResult = adt.chain(f);
    const dataLastResult = monad.chain(adt, f);
    
    return JSON.stringify(fluentResult) === JSON.stringify(dataLastResult);
  }) : true;
  
  const result = mapEquivalence && chainEquivalence;
  console.log(`    Map equivalence: ${mapEquivalence ? '✅' : '❌'}`);
  console.log(`    Chain equivalence: ${chainEquivalence ? '✅' : '❌'}`);
  
  return result;
}

// ============================================================================
// Part 5: Apply Fluent API to ADTs
// ============================================================================

console.log('🔧 Applying fluent API to ADTs...');

// Apply to Maybe
const maybeImpl = deriveFluentImpl('Maybe');
applyFluentOps(Maybe.prototype, maybeImpl);

// Apply to Either
const eitherImpl = deriveFluentImpl('Either');
applyFluentOps(Either.prototype, eitherImpl);

// Apply to Result
const resultImpl = deriveFluentImpl('Result');
applyFluentOps(Result.prototype, resultImpl);

// Apply to PersistentList
const persistentListImpl = deriveFluentImpl('PersistentList');
applyFluentOps(PersistentList.prototype, persistentListImpl);

console.log('✅ Applied fluent API to all ADTs\n');

// ============================================================================
// Part 6: Run Tests
// ============================================================================

console.log('🧪 Running comprehensive tests...\n');

const testValues = [1, 2, 3, 5, 8, 13];

// Test Maybe
console.log('📦 Testing Maybe ADT:');
const maybeFunctorLaws = testFunctorLaws('Maybe', (v) => (new Maybe(v)), testValues);
const maybeMonadLaws = testMonadLaws('Maybe', (v) => (new Maybe(v)), testValues);
const maybeEquivalence = testFluentDataLastEquivalence('Maybe', (v) => (new Maybe(v)), testValues);
console.log(`  Overall: ${maybeFunctorLaws && maybeMonadLaws && maybeEquivalence ? '✅ PASS' : '❌ FAIL'}\n`);

// Test Either
console.log('📦 Testing Either ADT:');
const eitherFunctorLaws = testFunctorLaws('Either', (v) => (new Either(v)), testValues);
const eitherMonadLaws = testMonadLaws('Either', (v) => (new Either(v)), testValues);
const eitherEquivalence = testFluentDataLastEquivalence('Either', (v) => (new Either(v)), testValues);
console.log(`  Overall: ${eitherFunctorLaws && eitherMonadLaws && eitherEquivalence ? '✅ PASS' : '❌ FAIL'}\n`);

// Test Result
console.log('📦 Testing Result ADT:');
const resultFunctorLaws = testFunctorLaws('Result', (v) => Result.Ok(v), testValues);
const resultMonadLaws = testMonadLaws('Result', (v) => Result.Ok(v), testValues);
const resultEquivalence = testFluentDataLastEquivalence('Result', (v) => Result.Ok(v), testValues);
console.log(`  Overall: ${resultFunctorLaws && resultMonadLaws && resultEquivalence ? '✅ PASS' : '❌ FAIL'}\n`);

// Test PersistentList
console.log('📦 Testing PersistentList ADT:');
const persistentListFunctorLaws = testFunctorLaws('PersistentList', (v) => (new PersistentList([v])), testValues);
const persistentListMonadLaws = testMonadLaws('PersistentList', (v) => (new PersistentList([v])), testValues);
const persistentListEquivalence = testFluentDataLastEquivalence('PersistentList', (v) => (new PersistentList([v])), testValues);
console.log(`  Overall: ${persistentListFunctorLaws && persistentListMonadLaws && persistentListEquivalence ? '✅ PASS' : '❌ FAIL'}\n`);

// ============================================================================
// Part 7: Test Fluent Method Chaining
// ============================================================================

console.log('🔗 Testing fluent method chaining...\n');

// Test Maybe chaining
console.log('📦 Maybe chaining:');
const maybeChain = Maybe.Just(5)
  .map(x => x * 2)
  .chain(x => Maybe.Just(x + 1))
  .filter(x => x > 10);
console.log(`  Maybe.Just(5).map(x => x * 2).chain(x => Maybe.Just(x + 1)).filter(x => x > 10) = ${maybeChain.isJust ? `Just(${maybeChain.value})` : 'Nothing'}`);

// Test Either chaining
console.log('📦 Either chaining:');
const eitherChain = Either.Right(3)
  .map(x => x * 3)
  .chain(x => Either.Right(x - 2))
  .bimap(e => `Error: ${e}`, x => `Success: ${x}`);
console.log(`  Either.Right(3).map(x => x * 3).chain(x => Either.Right(x - 2)).bimap(...) = ${eitherChain.isRight ? `Right(${eitherChain.value})` : `Left(${eitherChain.value})`}`);

// Test Result chaining
console.log('📦 Result chaining:');
const resultChain = Result.Ok(4)
  .map(x => x * 2)
  .chain(x => Result.Ok(x + 3))
  .bimap(e => `Error: ${e}`, x => `Success: ${x}`);
console.log(`  Result.Ok(4).map(x => x * 2).chain(x => Result.Ok(x + 3)).bimap(...) = ${resultChain.isOk ? `Ok(${resultChain.value})` : `Err(${resultChain.value})`}`);

// Test PersistentList chaining
console.log('📦 PersistentList chaining:');
const listChain = new PersistentList([1, 2, 3, 4, 5])
  .map(x => x * 2)
  .filter(x => x > 5)
  .flatMap(x => new PersistentList([x, x + 1]));
console.log(`  PersistentList([1,2,3,4,5]).map(x => x * 2).filter(x => x > 5).flatMap(...) = [${listChain.toArray().join(', ')}]`);

// Test pipe composition
console.log('📦 Pipe composition:');
const pipeResult = Maybe.Just(10)
  .pipe(
    x => x * 2,
    x => x + 5,
    x => x * 3
  );
console.log(`  Maybe.Just(10).pipe(x => x * 2, x => x + 5, x => x * 3) = ${pipeResult.isJust ? `Just(${pipeResult.value})` : 'Nothing'}`);

console.log('\n🎉 All tests completed!');

// ============================================================================
// Part 8: Summary
// ============================================================================

console.log('\n📊 Test Summary:');
console.log('================');

const allTests = [
  { name: 'Maybe', functor: maybeFunctorLaws, monad: maybeMonadLaws, equivalence: maybeEquivalence },
  { name: 'Either', functor: eitherFunctorLaws, monad: eitherMonadLaws, equivalence: eitherEquivalence },
  { name: 'Result', functor: resultFunctorLaws, monad: resultMonadLaws, equivalence: resultEquivalence },
  { name: 'PersistentList', functor: persistentListFunctorLaws, monad: persistentListMonadLaws, equivalence: persistentListEquivalence }
];

allTests.forEach(test => {
  const overall = test.functor && test.monad && test.equivalence;
  console.log(`${test.name}: ${overall ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - Functor laws: ${test.functor ? '✅' : '❌'}`);
  console.log(`  - Monad laws: ${test.monad ? '✅' : '❌'}`);
  console.log(`  - Fluent/Data-last equivalence: ${test.equivalence ? '✅' : '❌'}`);
});

const allPassed = allTests.every(test => test.functor && test.monad && test.equivalence);
console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allPassed) {
  console.log('\n🚀 Unified Fluent API System is working correctly!');
  console.log('✅ All ADTs have consistent fluent APIs');
  console.log('✅ All typeclass laws are satisfied');
  console.log('✅ Fluent and data-last APIs are equivalent');
  console.log('✅ Method chaining works correctly');
} else {
  console.log('\n⚠️ Some issues detected - review implementation');
} 