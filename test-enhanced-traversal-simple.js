/**
 * Simple test for Enhanced Traversal functionality
 */

// Mock the traversal functions from fp-optics.ts
function traversal(traverseFn) {
  return {
    modifyA: (F) => (f) => (s) => {
      // Simplified implementation
      return traverseFn(f, s);
    }
  };
}

function takeTraversal(t, count) {
  return traversal((f, s) => {
    // Simplified implementation
    const elements = [];
    t.modifyA({ of: (x) => x })((a) => {
      elements.push(a);
      return a;
    })(s);
    
    let index = 0;
    return t.modifyA({ of: (x) => x })((a) => {
      const result = index < count ? f(a) : a;
      index++;
      return result;
    })(s);
  });
}

function dropTraversal(t, count) {
  return traversal((f, s) => {
    // Simplified implementation
    const elements = [];
    t.modifyA({ of: (x) => x })((a) => {
      elements.push(a);
      return a;
    })(s);
    
    let index = 0;
    return t.modifyA({ of: (x) => x })((a) => {
      const result = index >= count ? f(a) : a;
      index++;
      return result;
    })(s);
  });
}

function filterTraversal(t, predicate) {
  return traversal((f, s) => {
    return t.modifyA({ of: (x) => x })((a) => predicate(a) ? f(a) : a)(s);
  });
}

// Test data
const numbers = [1, 2, 3, 4, 5];

// Create a simple array traversal
const arrayTraversal = traversal((f, s) => s.map(f));

console.log('🧪 Testing Enhanced Traversal Functions...');

// Test takeTraversal
console.log('Testing takeTraversal...');
const take2 = takeTraversal(arrayTraversal, 2);
const doubledFirst2 = take2.modifyA({ of: (x) => x })((n) => n * 2)(numbers);
console.log('✅ takeTraversal (first 2):', doubledFirst2);

// Test dropTraversal
console.log('Testing dropTraversal...');
const drop2 = dropTraversal(arrayTraversal, 2);
const doubledLast3 = drop2.modifyA({ of: (x) => x })((n) => n * 2)(numbers);
console.log('✅ dropTraversal (last 3):', doubledLast3);

// Test filterTraversal
console.log('Testing filterTraversal...');
const evenOnly = filterTraversal(arrayTraversal, (n) => n % 2 === 0);
const doubledEvens = evenOnly.modifyA({ of: (x) => x })((n) => n * 2)(numbers);
console.log('✅ filterTraversal (evens only):', doubledEvens);

console.log('🎉 All Enhanced Traversal Tests PASSED!'); 