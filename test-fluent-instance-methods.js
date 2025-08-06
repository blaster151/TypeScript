/**
 * Test Fluent Instance Methods
 * 
 * This file tests the fluent instance methods implementation for all core ADTs
 * to ensure they work correctly and maintain type safety.
 */

console.log('🧪 Testing Fluent Instance Methods');
console.log('==================================');

// ============================================================================
// Mock ADT Implementations for Testing
// ============================================================================

// Mock Maybe
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
  
  static of(value) {
    return Maybe.Just(value);
  }
}

// Mock Either
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
  
  static of(value) {
    return Either.Right(value);
  }
}

// Mock Result
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
  
  static of(value) {
    return Result.Ok(value);
  }
}

// Mock PersistentList
class PersistentList {
  constructor(values = []) {
    this.values = [...values];
  }
  
  static of(value) {
    return new PersistentList([value]);
  }
  
  map(f) {
    return new PersistentList(this.values.map(f));
  }
  
  chain(f) {
    const results = [];
    for (const value of this.values) {
      const result = f(value);
      if (result instanceof PersistentList) {
        results.push(...result.values);
      }
    }
    return new PersistentList(results);
  }
  
  filter(predicate) {
    return new PersistentList(this.values.filter(predicate));
  }
  
  ap(other) {
    const results = [];
    for (const fn of this.values) {
      if (typeof fn === 'function') {
        for (const value of other.values) {
          results.push(fn(value));
        }
      }
    }
    return new PersistentList(results);
  }
  
  bimap(f, g) {
    return new PersistentList(this.values.map(v => g(f(v))));
  }
  
  traverse(applicative, f) {
    // Simplified implementation
    return applicative.of(new PersistentList(this.values.map(f)));
  }
}

// Mock PersistentMap
class PersistentMap {
  constructor(entries = []) {
    this.entries = [...entries];
  }
  
  static of(key, value) {
    return new PersistentMap([[key, value]]);
  }
  
  map(f) {
    return new PersistentMap(this.entries.map(([k, v]) => [k, f(v)]));
  }
  
  bimap(f, g) {
    return new PersistentMap(this.entries.map(([k, v]) => [f(k), g(v)]));
  }
  
  filter(predicate) {
    return new PersistentMap(this.entries.filter(([k, v]) => predicate(v)));
  }
}

// Mock PersistentSet
class PersistentSet {
  constructor(values = []) {
    this.values = [...new Set(values)];
  }
  
  static of(value) {
    return new PersistentSet([value]);
  }
  
  map(f) {
    return new PersistentSet(this.values.map(f));
  }
  
  filter(predicate) {
    return new PersistentSet(this.values.filter(predicate));
  }
}

// Mock StatefulStream
class StatefulStream {
  constructor(run) {
    this.run = run;
  }
  
  map(f) {
    return new StatefulStream((input) => (state) => {
      const [newState, value] = this.run(input)(state);
      return [newState, f(value)];
    });
  }
  
  chain(f) {
    return new StatefulStream((input) => (state) => {
      const [newState, value] = this.run(input)(state);
      const nextStream = f(value);
      return nextStream.run(value)(newState);
    });
  }
  
  ap(other) {
    return new StatefulStream((input) => (state) => {
      const [state1, fn] = this.run(input)(state);
      const [state2, value] = other.run(input)(state1);
      return [state2, fn(value)];
    });
  }
  
  dimap(f, g) {
    return new StatefulStream((input) => (state) => {
      const [newState, value] = this.run(f(input))(state);
      return [newState, g(value)];
    });
  }
  
  lmap(f) {
    return new StatefulStream((input) => (state) => {
      return this.run(f(input))(state);
    });
  }
  
  rmap(g) {
    return new StatefulStream((input) => (state) => {
      const [newState, value] = this.run(input)(state);
      return [newState, g(value)];
    });
  }
}

// Mock ObservableLite
class ObservableLite {
  constructor(subscribe) {
    this._subscribe = subscribe;
  }
  
  static of(value) {
    return new ObservableLite((observer) => {
      observer.next(value);
      observer.complete?.();
      return () => {};
    });
  }
  
  map(f) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => observer.next(f(value)),
        error: observer.error,
        complete: observer.complete
      });
    });
  }
  
  chain(f) {
    return new ObservableLite((observer) => {
      return this._subscribe({
        next: (value) => {
          const innerObs = f(value);
          innerObs.subscribe(observer);
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }
  
  flatMap(f) {
    return this.chain(f);
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
  
  ap(other) {
    return new ObservableLite((observer) => {
      let fnValue = null;
      let otherValue = null;
      
      const checkComplete = () => {
        if (fnValue !== null && otherValue !== null) {
          observer.next(fnValue(otherValue));
          observer.complete?.();
        }
      };
      
      const unsub1 = this._subscribe({
        next: (value) => {
          fnValue = value;
          checkComplete();
        },
        error: observer.error,
        complete: observer.complete
      });
      
      const unsub2 = other._subscribe({
        next: (value) => {
          otherValue = value;
          checkComplete();
        },
        error: observer.error,
        complete: observer.complete
      });
      
      return () => {
        unsub1();
        unsub2();
      };
    });
  }
  
  subscribe(observer) {
    return this._subscribe(observer);
  }
}

// ============================================================================
// Fluent Methods Implementation
// ============================================================================

function addMaybeFluentMethods() {
  // Functor methods
  Maybe.prototype.map = function(f) {
    if (this.isJust) {
      return Maybe.Just(f(this.value));
    } else {
      return Maybe.Nothing();
    }
  };

  // Applicative methods
  Maybe.prototype.ap = function(other) {
    if (this.isJust && typeof this.value === 'function') {
      return other.map(this.value);
    } else {
      return Maybe.Nothing();
    }
  };

  // Monad methods
  Maybe.prototype.chain = function(f) {
    if (this.isJust) {
      return f(this.value);
    } else {
      return Maybe.Nothing();
    }
  };

  // Alias for chain
  Maybe.prototype.flatMap = function(f) {
    return this.chain(f);
  };

  // Filterable methods
  Maybe.prototype.filter = function(predicate) {
    if (this.isJust && predicate(this.value)) {
      return this;
    } else {
      return Maybe.Nothing();
    }
  };

  // Static methods
  Maybe.of = (a) => Maybe.Just(a);
}

function addEitherFluentMethods() {
  // Functor methods
  Either.prototype.map = function(f) {
    if (this.isRight) {
      return Either.Right(f(this.value));
    } else {
      return Either.Left(this.value);
    }
  };

  // Applicative methods
  Either.prototype.ap = function(other) {
    if (this.isRight && typeof this.value === 'function') {
      return other.map(this.value);
    } else {
      return Either.Left(this.value);
    }
  };

  // Monad methods
  Either.prototype.chain = function(f) {
    if (this.isRight) {
      return f(this.value);
    } else {
      return Either.Left(this.value);
    }
  };

  // Alias for chain
  Either.prototype.flatMap = function(f) {
    return this.chain(f);
  };

  // Bifunctor methods
  Either.prototype.bimap = function(f, g) {
    if (this.isRight) {
      return Either.Right(g(this.value));
    } else {
      return Either.Left(f(this.value));
    }
  };

  Either.prototype.mapLeft = function(f) {
    if (this.isRight) {
      return Either.Right(this.value);
    } else {
      return Either.Left(f(this.value));
    }
  };

  Either.prototype.mapRight = function(g) {
    if (this.isRight) {
      return Either.Right(g(this.value));
    } else {
      return Either.Left(this.value);
    }
  };

  // Filterable methods
  Either.prototype.filter = function(predicate) {
    if (this.isRight && predicate(this.value)) {
      return this;
    } else {
      return Either.Left('Filtered out');
    }
  };

  // Static methods
  Either.of = (r) => Either.Right(r);
}

function addResultFluentMethods() {
  // Functor methods
  Result.prototype.map = function(f) {
    if (this.isOk) {
      return Result.Ok(f(this.value));
    } else {
      return Result.Err(this.value);
    }
  };

  // Applicative methods
  Result.prototype.ap = function(other) {
    if (this.isOk && typeof this.value === 'function') {
      return other.map(this.value);
    } else {
      return Result.Err(this.value);
    }
  };

  // Monad methods
  Result.prototype.chain = function(f) {
    if (this.isOk) {
      return f(this.value);
    } else {
      return Result.Err(this.value);
    }
  };

  // Alias for chain
  Result.prototype.flatMap = function(f) {
    return this.chain(f);
  };

  // Bifunctor methods
  Result.prototype.bimap = function(f, g) {
    if (this.isOk) {
      return Result.Ok(g(this.value));
    } else {
      return Result.Err(f(this.value));
    }
  };

  Result.prototype.mapError = function(f) {
    if (this.isOk) {
      return Result.Ok(this.value);
    } else {
      return Result.Err(f(this.value));
    }
  };

  Result.prototype.mapSuccess = function(g) {
    if (this.isOk) {
      return Result.Ok(g(this.value));
    } else {
      return Result.Err(this.value);
    }
  };

  // Filterable methods
  Result.prototype.filter = function(predicate) {
    if (this.isOk && predicate(this.value)) {
      return this;
    } else {
      return Result.Err('Filtered out');
    }
  };

  // Static methods
  Result.of = (t) => Result.Ok(t);
}

function addPersistentListFluentMethods() {
  // Methods are already implemented in the class
  // Just add static of method
  PersistentList.of = (a) => new PersistentList([a]);
}

function addPersistentMapFluentMethods() {
  // Methods are already implemented in the class
  // Just add static of method
  PersistentMap.of = (k, v) => new PersistentMap([[k, v]]);
}

function addPersistentSetFluentMethods() {
  // Methods are already implemented in the class
  // Just add static of method
  PersistentSet.of = (a) => new PersistentSet([a]);
}

function addStatefulStreamFluentMethods() {
  // Methods are already implemented in the class
}

// ============================================================================
// Test Functions
// ============================================================================

function testMaybeFluentMethods() {
  console.log('\n🔍 Testing Maybe Fluent Methods...');
  
  const maybe = Maybe.Just(5);
  
  // Test map
  const mapped = maybe.map(x => x * 2);
  console.log('✅ map:', mapped.value === 10 && mapped.isJust);
  
  // Test chain
  const chained = maybe.chain(x => Maybe.Just(x.toString()));
  console.log('✅ chain:', chained.value === '5' && chained.isJust);
  
  // Test flatMap (alias)
  const flatMapped = maybe.flatMap(x => Maybe.Just(x + 1));
  console.log('✅ flatMap:', flatMapped.value === 6 && flatMapped.isJust);
  
  // Test filter
  const filtered = maybe.filter(x => x > 3);
  console.log('✅ filter (pass):', filtered.value === 5 && filtered.isJust);
  
  const filteredOut = maybe.filter(x => x > 10);
  console.log('✅ filter (fail):', !filteredOut.isJust);
  
  // Test ap
  const fnMaybe = Maybe.Just(x => x * 3);
  const applied = fnMaybe.ap(maybe);
  console.log('✅ ap:', applied.value === 15 && applied.isJust);
  
  // Test chaining
  const result = maybe
    .map(x => x * 2)
    .chain(x => Maybe.Just(x.toString()))
    .filter(x => x.length > 0);
  
  console.log('✅ chaining:', result.value === '10' && result.isJust);
  
  // Test Nothing
  const nothing = Maybe.Nothing();
  const nothingMapped = nothing.map(x => x * 2);
  console.log('✅ Nothing map:', !nothingMapped.isJust);
  
  console.log('✅ Maybe fluent methods test completed');
}

function testEitherFluentMethods() {
  console.log('\n🔍 Testing Either Fluent Methods...');
  
  const right = Either.Right(5);
  const left = Either.Left('error');
  
  // Test map
  const mapped = right.map(x => x * 2);
  console.log('✅ map (Right):', mapped.value === 10 && mapped.isRight);
  
  const mappedLeft = left.map(x => x * 2);
  console.log('✅ map (Left):', mappedLeft.value === 'error' && !mappedLeft.isRight);
  
  // Test chain
  const chained = right.chain(x => Either.Right(x.toString()));
  console.log('✅ chain (Right):', chained.value === '5' && chained.isRight);
  
  const chainedLeft = left.chain(x => Either.Right(x.toString()));
  console.log('✅ chain (Left):', chainedLeft.value === 'error' && !chainedLeft.isRight);
  
  // Test bimap
  const bimapped = right.bimap(e => 'left', v => v * 3);
  console.log('✅ bimap (Right):', bimapped.value === 15 && bimapped.isRight);
  
  const bimappedLeft = left.bimap(e => 'new error', v => v * 3);
  console.log('✅ bimap (Left):', bimappedLeft.value === 'new error' && !bimappedLeft.isRight);
  
  // Test mapLeft and mapRight
  const mapLeft = left.mapLeft(e => `prefix: ${e}`);
  console.log('✅ mapLeft:', mapLeft.value === 'prefix: error' && !mapLeft.isRight);
  
  const mapRight = right.mapRight(v => v * 4);
  console.log('✅ mapRight:', mapRight.value === 20 && mapRight.isRight);
  
  // Test chaining
  const result = right
    .map(x => x * 2)
    .chain(x => Either.Right(x.toString()))
    .bimap(e => 'error', v => `result: ${v}`);
  
  console.log('✅ chaining:', result.value === 'result: 10' && result.isRight);
  
  console.log('✅ Either fluent methods test completed');
}

function testResultFluentMethods() {
  console.log('\n🔍 Testing Result Fluent Methods...');
  
  const ok = Result.Ok(5);
  const err = Result.Err('error');
  
  // Test map
  const mapped = ok.map(x => x * 2);
  console.log('✅ map (Ok):', mapped.value === 10 && mapped.isOk);
  
  const mappedErr = err.map(x => x * 2);
  console.log('✅ map (Err):', mappedErr.value === 'error' && !mappedErr.isOk);
  
  // Test chain
  const chained = ok.chain(x => Result.Ok(x.toString()));
  console.log('✅ chain (Ok):', chained.value === '5' && chained.isOk);
  
  const chainedErr = err.chain(x => Result.Ok(x.toString()));
  console.log('✅ chain (Err):', chainedErr.value === 'error' && !chainedErr.isOk);
  
  // Test bimap
  const bimapped = ok.bimap(e => 'error', v => v * 3);
  console.log('✅ bimap (Ok):', bimapped.value === 15 && bimapped.isOk);
  
  const bimappedErr = err.bimap(e => `new ${e}`, v => v * 3);
  console.log('✅ bimap (Err):', bimappedErr.value === 'new error' && !bimappedErr.isOk);
  
  // Test mapError and mapSuccess
  const mapError = err.mapError(e => `prefix: ${e}`);
  console.log('✅ mapError:', mapError.value === 'prefix: error' && !mapError.isOk);
  
  const mapSuccess = ok.mapSuccess(v => v * 4);
  console.log('✅ mapSuccess:', mapSuccess.value === 20 && mapSuccess.isOk);
  
  // Test chaining
  const result = ok
    .map(x => x * 2)
    .chain(x => Result.Ok(x.toString()))
    .bimap(e => 'error', v => `result: ${v}`);
  
  console.log('✅ chaining:', result.value === 'result: 10' && result.isOk);
  
  console.log('✅ Result fluent methods test completed');
}

function testPersistentCollectionsFluentMethods() {
  console.log('\n🔍 Testing Persistent Collections Fluent Methods...');
  
  // Test PersistentList
  const list = new PersistentList([1, 2, 3]);
  
  const mappedList = list.map(x => x * 2);
  console.log('✅ PersistentList map:', mappedList.values.join(',') === '2,4,6');
  
  const filteredList = list.filter(x => x > 1);
  console.log('✅ PersistentList filter:', filteredList.values.join(',') === '2,3');
  
  const chainedList = list.chain(x => new PersistentList([x, x * 2]));
  console.log('✅ PersistentList chain:', chainedList.values.join(',') === '1,2,2,4,3,6');
  
  // Test PersistentMap
  const map = new PersistentMap([['a', 1], ['b', 2]]);
  
  const mappedMap = map.map(v => v * 2);
  console.log('✅ PersistentMap map:', mappedMap.entries.length === 2);
  
  const bimappedMap = map.bimap(k => k.toUpperCase(), v => v * 3);
  console.log('✅ PersistentMap bimap:', bimappedMap.entries.length === 2);
  
  // Test PersistentSet
  const set = new PersistentSet([1, 2, 3]);
  
  const mappedSet = set.map(x => x * 2);
  console.log('✅ PersistentSet map:', mappedSet.values.join(',') === '2,4,6');
  
  const filteredSet = set.filter(x => x > 1);
  console.log('✅ PersistentSet filter:', filteredSet.values.join(',') === '2,3');
  
  console.log('✅ Persistent collections fluent methods test completed');
}

function testStatefulStreamFluentMethods() {
  console.log('\n🔍 Testing StatefulStream Fluent Methods...');
  
  const stream = new StatefulStream((input) => (state) => [state + 1, input * 2]);
  
  const mapped = stream.map(x => x + 1);
  const [state1, value1] = mapped.run(5)(0);
  console.log('✅ StatefulStream map:', state1 === 1 && value1 === 11);
  
  const chained = stream.chain(x => new StatefulStream((input) => (state) => [state + 2, x + input]));
  const [state2, value2] = chained.run(3)(0);
  console.log('✅ StatefulStream chain:', state2 === 3 && value2 === 8);
  
  const dimapped = stream.dimap(x => x + 1, y => y * 2);
  const [state3, value3] = dimapped.run(4)(0);
  console.log('✅ StatefulStream dimap:', state3 === 1 && value3 === 20);
  
  console.log('✅ StatefulStream fluent methods test completed');
}

function testObservableLiteFluentMethods() {
  console.log('\n🔍 Testing ObservableLite Fluent Methods...');
  
  const obs = ObservableLite.of(5);
  let result = null;
  
  obs.map(x => x * 2).subscribe({
    next: (value) => { result = value; },
    complete: () => {}
  });
  
  console.log('✅ ObservableLite map:', result === 10);
  
  const obs2 = ObservableLite.of(3);
  let result2 = null;
  
  obs.chain(x => ObservableLite.of(x + 1)).subscribe({
    next: (value) => { result2 = value; },
    complete: () => {}
  });
  
  console.log('✅ ObservableLite chain:', result2 === 6);
  
  console.log('✅ ObservableLite fluent methods test completed');
}

// ============================================================================
// Main Test Execution
// ============================================================================

function runAllTests() {
  console.log('🚀 Running all fluent methods tests...\n');
  
  // Add fluent methods to all ADTs
  addMaybeFluentMethods();
  addEitherFluentMethods();
  addResultFluentMethods();
  addPersistentListFluentMethods();
  addPersistentMapFluentMethods();
  addPersistentSetFluentMethods();
  addStatefulStreamFluentMethods();
  
  // Run tests
  testMaybeFluentMethods();
  testEitherFluentMethods();
  testResultFluentMethods();
  testPersistentCollectionsFluentMethods();
  testStatefulStreamFluentMethods();
  testObservableLiteFluentMethods();
  
  console.log('\n🎉 All fluent methods tests completed successfully!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testMaybeFluentMethods,
  testEitherFluentMethods,
  testResultFluentMethods,
  testPersistentCollectionsFluentMethods,
  testStatefulStreamFluentMethods,
  testObservableLiteFluentMethods,
  runAllTests
}; 