console.log('Testing basic functionality...');

// Test 1: Simple object creation
const maybe = { tag: 'Just', value: 42 };
console.log('Maybe created:', maybe);

// Test 2: Simple function
const double = x => x * 2;
console.log('Double function:', double(21));

// Test 3: Simple object method
maybe.map = function(f) {
  if (this.tag === 'Just') {
    return { tag: 'Just', value: f(this.value) };
  }
  return { tag: 'Nothing' };
};

const result = maybe.map(double);
console.log('Result:', result);

console.log('All tests passed!'); 