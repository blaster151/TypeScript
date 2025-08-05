/**
 * Unified Traversal API Test
 * 
 * This demonstrates the complete Traversal API that combines:
 * - Chainable operations: .map(), .filter(), .sortBy(), .distinct(), .take(), .drop(), .slice(), .reverse()
 * - Terminal fold operations: .reduce(), .foldMap(), .all(), .any()
 */

// ============================================================================
// Core Traversal Implementation
// ============================================================================

/**
 * Creates a Traversal with unified chainable and terminal operations
 */
function traversal(getAll, modifyAll) {
  return {
    getAll,
    modifyAll,
    
    // Chainable operations - return new Traversal instances
    map(fn) {
      return traversal(
        (s) => getAll(s).map(fn),
        (cs, s) => {
          const as = getAll(s);
          const bs = as.map((a, i) => cs[i]);
          return modifyAll(bs, s);
        }
      );
    },
    
    filter(pred) {
      return traversal(
        (s) => getAll(s).filter(pred),
        (bs, s) => {
          const as = getAll(s);
          const result = [...as];
          let bIndex = 0;
          for (let i = 0; i < as.length; i++) {
            if (pred(as[i])) {
              result[i] = bs[bIndex++];
            }
          }
          return modifyAll(result, s);
        }
      );
    },
    
    sortBy(fn) {
      return traversal(
        (s) => {
          const as = getAll(s);
          const indexed = as.map((a, index) => ({ value: a, index, key: fn(a) }));
          indexed.sort((a, b) => {
            if (a.key < b.key) return -1;
            if (a.key > b.key) return 1;
            return a.index - b.index; // preserve original order for equal keys
          });
          return indexed.map(item => item.value);
        },
        (bs, s) => {
          const as = getAll(s);
          const indexed = as.map((a, index) => ({ value: a, index, key: fn(a) }));
          indexed.sort((a, b) => {
            if (a.key < b.key) return -1;
            if (a.key > b.key) return 1;
            return a.index - b.index;
          });
          
          // Apply modifications in sorted order
          const modifiedIndexed = indexed.map((item, i) => ({ ...item, value: bs[i] }));
          
          // Restore original order
          modifiedIndexed.sort((a, b) => a.index - b.index);
          
          return modifyAll(modifiedIndexed.map(item => item.value), s);
        }
      );
    },
    
    distinct() {
      return traversal(
        (s) => {
          const as = getAll(s);
          const seen = new Set();
          const result = [];
          for (const a of as) {
            if (!seen.has(a)) {
              seen.add(a);
              result.push(a);
            }
          }
          return result;
        },
        (bs, s) => {
          const as = getAll(s);
          const seen = new Set();
          const uniqueValues = [];
          
          // Find unique elements
          for (const a of as) {
            if (!seen.has(a)) {
              seen.add(a);
              uniqueValues.push(a);
            }
          }
          
          // Apply modifications to unique elements
          const modifiedUnique = uniqueValues.map((value, i) => bs[i]);
          
          // Create a map from original value to modified value
          const valueMap = new Map();
          for (let i = 0; i < uniqueValues.length; i++) {
            valueMap.set(uniqueValues[i], modifiedUnique[i]);
          }
          
          // Apply modifications to all elements
          const newAs = as.map(a => valueMap.get(a));
          return modifyAll(newAs, s);
        }
      );
    },
    
    take(count) {
      return traversal(
        (s) => getAll(s).slice(0, count),
        (bs, s) => {
          const as = getAll(s);
          const result = [...as];
          for (let i = 0; i < Math.min(count, bs.length); i++) {
            result[i] = bs[i];
          }
          return modifyAll(result, s);
        }
      );
    },
    
    drop(count) {
      return traversal(
        (s) => getAll(s).slice(count),
        (bs, s) => {
          const as = getAll(s);
          const result = [...as];
          for (let i = 0; i < bs.length; i++) {
            result[i + count] = bs[i];
          }
          return modifyAll(result, s);
        }
      );
    },
    
    slice(start, end) {
      return traversal(
        (s) => {
          const as = getAll(s);
          const startIndex = start < 0 ? Math.max(0, as.length + start) : start;
          const endIndex = end === undefined ? as.length : 
                          end < 0 ? Math.max(0, as.length + end) : end;
          return as.slice(startIndex, endIndex);
        },
        (bs, s) => {
          const as = getAll(s);
          const startIndex = start < 0 ? Math.max(0, as.length + start) : start;
          const endIndex = end === undefined ? as.length : 
                          end < 0 ? Math.max(0, as.length + end) : end;
          const result = [...as];
          for (let i = 0; i < bs.length; i++) {
            result[startIndex + i] = bs[i];
          }
          return modifyAll(result, s);
        }
      );
    },
    
    reverse() {
      return traversal(
        (s) => getAll(s).slice().reverse(),
        (bs, s) => {
          const as = getAll(s);
          const result = [...as];
          const reversedBs = bs.slice().reverse();
          for (let i = 0; i < Math.min(as.length, reversedBs.length); i++) {
            result[i] = reversedBs[i];
          }
          return modifyAll(result, s);
        }
      );
    },
    
    // Terminal fold operations - return functions that take a source
    reduce(reducer, initial) {
      return (source) => {
        const as = getAll(source);
        return as.reduce(reducer, initial);
      };
    },
    
    foldMap(monoid, fn) {
      return (source) => {
        const as = getAll(source);
        return as.reduce((acc, a) => monoid.concat(acc, fn(a)), monoid.empty());
      };
    },
    
    all(predicate) {
      return (source) => {
        const as = getAll(source);
        return as.every(predicate);
      };
    },
    
    any(predicate) {
      return (source) => {
        const as = getAll(source);
        return as.some(predicate);
      };
    }
  };
}

// ============================================================================
// Common Monoids
// ============================================================================

const SumMonoid = {
  empty: () => 0,
  concat: (a, b) => a + b
};

const ProductMonoid = {
  empty: () => 1,
  concat: (a, b) => a * b
};

const StringMonoid = {
  empty: () => '',
  concat: (a, b) => a + b
};

const ArrayMonoid = () => ({
  empty: () => [],
  concat: (a, b) => [...a, ...b]
});

const AnyMonoid = {
  empty: () => false,
  concat: (a, b) => a || b
};

const AllMonoid = {
  empty: () => true,
  concat: (a, b) => a && b
};

// ============================================================================
// Common Traversal Constructors
// ============================================================================

/**
 * Traversal that focuses on all elements of an array
 */
function each() {
  return traversal(
    (arr) => arr,
    (bs, arr) => {
      const result = [...arr];
      for (let i = 0; i < Math.min(bs.length, arr.length); i++) {
        result[i] = bs[i];
      }
      return result;
    }
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Applies a function to all elements focused by a traversal
 */
function overTraversal(traversal, fn, source) {
  const as = traversal.getAll(source);
  const bs = as.map(fn);
  return traversal.modifyAll(bs, source);
}

/**
 * Collects all elements focused by a traversal
 */
function collect(traversal, source) {
  return traversal.getAll(source);
}

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
// Unified API Tests
// ============================================================================

console.log('🧪 Testing Unified Traversal API...\n');

const testUnifiedTraversalAPI = () => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const people = [
    { name: 'Alice', age: 25, salary: 50000 },
    { name: 'Bob', age: 30, salary: 60000 },
    { name: 'Charlie', age: 35, salary: 70000 },
    { name: 'David', age: 40, salary: 80000 },
    { name: 'Eve', age: 45, salary: 90000 }
  ];
  
  const eachTraversal = each();
  
  // Test 1: Chainable operations pipeline
  console.log('📋 Test 1: Chainable operations pipeline');
  
  const chainableResult = eachTraversal
    .map(n => n * 2)
    .filter(n => n % 4 === 0)
    .sortBy(n => n)
    .distinct()
    .take(3)
    .reverse();
  
  const chainableCollected = collect(chainableResult, numbers);
  assertEqual(chainableCollected, [12, 8, 4], 'should chain map → filter → sortBy → distinct → take → reverse');
  
  // Test 2: Terminal fold operations
  console.log('\n📋 Test 2: Terminal fold operations');
  
  const sumReducer = (acc, n) => acc + n;
  const total = eachTraversal.reduce(sumReducer, 0)(numbers);
  assertEqual(total, 55, 'should sum all numbers');
  
  const allPositive = eachTraversal.all(n => n > 0)(numbers);
  assertEqual(allPositive, true, 'should return true when all numbers are positive');
  
  const anyEven = eachTraversal.any(n => n % 2 === 0)(numbers);
  assertEqual(anyEven, true, 'should return true when any number is even');
  
  const sumFoldMap = eachTraversal.foldMap(SumMonoid, n => n)(numbers);
  assertEqual(sumFoldMap, 55, 'should foldMap with sum monoid');
  
  // Test 3: Pipeline from chainable to terminal
  console.log('\n📋 Test 3: Pipeline from chainable to terminal');
  
  const pipelineResult = eachTraversal
    .filter(n => n % 2 === 0)
    .map(n => n * 2)
    .sortBy(n => n)
    .reduce(sumReducer, 0)(numbers);
  assertEqual(pipelineResult, 60, 'should filter even → double → sort → sum');
  
  const pipelineAll = eachTraversal
    .filter(n => n > 5)
    .all(n => n > 3)(numbers);
  assertEqual(pipelineAll, true, 'should filter > 5 → all > 3');
  
  const pipelineAny = eachTraversal
    .filter(n => n < 5)
    .any(n => n % 2 === 0)(numbers);
  assertEqual(pipelineAny, true, 'should filter < 5 → any even');
  
  // Test 4: Complex pipeline with people
  console.log('\n📋 Test 4: Complex pipeline with people');
  
  const ageReducer = (acc, person) => acc + person.age;
  const complexPipeline = eachTraversal
    .filter(person => person.age > 30)
    .sortBy(person => person.salary)
    .distinct()
    .take(3)
    .reverse()
    .reduce(ageReducer, 0)(people);
  assertEqual(complexPipeline, 120, 'should filter > 30 → sort by salary → distinct → take 3 → reverse → sum ages');
  
  // Test 5: Multiple fold operations on same pipeline
  console.log('\n📋 Test 5: Multiple fold operations on same pipeline');
  
  const filteredTraversal = eachTraversal.filter(n => n % 2 === 0);
  
  const evenSum = filteredTraversal.reduce(sumReducer, 0)(numbers);
  assertEqual(evenSum, 30, 'should sum even numbers');
  
  const evenAll = filteredTraversal.all(n => n > 0)(numbers);
  assertEqual(evenAll, true, 'should check if all even numbers are positive');
  
  const evenAny = filteredTraversal.any(n => n > 8)(numbers);
  assertEqual(evenAny, true, 'should check if any even number is > 8');
  
  const evenFoldMap = filteredTraversal.foldMap(ProductMonoid, n => n)(numbers);
  assertEqual(evenFoldMap, 3840, 'should multiply even numbers');
  
  // Test 6: Edge cases
  console.log('\n📋 Test 6: Edge cases');
  
  const emptyTraversal = eachTraversal.filter(n => n > 100);
  
  const emptyReduce = emptyTraversal.reduce(sumReducer, 0)(numbers);
  assertEqual(emptyReduce, 0, 'should return initial value for empty traversal');
  
  const emptyAll = emptyTraversal.all(n => n > 0)(numbers);
  assertEqual(emptyAll, true, 'should return true for empty traversal (vacuous truth)');
  
  const emptyAny = emptyTraversal.any(n => n > 0)(numbers);
  assertEqual(emptyAny, false, 'should return false for empty traversal');
  
  // Test 7: Type preservation through chain
  console.log('\n📋 Test 7: Type preservation through chain');
  
  const typePreservingChain = eachTraversal
    .map(n => n.toString())
    .filter(s => s.length === 1)
    .map(s => parseInt(s))
    .sortBy(n => n)
    .distinct();
  
  const typeResult = collect(typePreservingChain, numbers);
  assertEqual(typeResult, [1, 2, 3, 4, 5, 6, 7, 8, 9], 'should preserve types through complex chain');
  
  // Test 8: Immutability
  console.log('\n📋 Test 8: Immutability');
  
  const originalNumbers = [...numbers];
  const modifiedNumbers = overTraversal(eachTraversal.map(n => n * 2), n => n, numbers);
  
  assertEqual(originalNumbers, numbers, 'original array should be unchanged');
  assertEqual(modifiedNumbers, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], 'modified array should have doubled values');
  
  console.log('\n✅ All Unified Traversal API tests passed!');
};

// Run the tests
testUnifiedTraversalAPI(); 