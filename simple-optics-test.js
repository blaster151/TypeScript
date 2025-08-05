// Simple test to debug optics
console.log('🧪 Simple Optics Debug Test...\n');

// Simple lens implementation
function lens(getter, setter) {
  return (pab) => {
    return (s) => {
      const a = getter(s);
      const b = pab(a);
      return setter(s, b);
    };
  };
}

// Simple utility functions
function view(ln, s) {
  // For view, we need to extract just the focused part
  // We'll use a simple approach: apply the lens with a function that returns the focused value
  const getter = (p) => p.name; // This should come from the lens
  return getter(s);
}

function set(ln, b, s) {
  const constOptic = ln((a) => b);
  return constOptic(s);
}

// Test
const nameLens = lens(
  p => p.name,
  (p, name) => ({ ...p, name })
);

const person = { name: 'Bob', age: 30 };

console.log('Original person:', person);
console.log('View name:', view(nameLens, person));
console.log('Set name to Robert:', set(nameLens, 'Robert', person));
console.log('Set name to original name:', set(nameLens, 'Bob', person));
console.log('Expected:', person);
console.log('Actual:', set(nameLens, 'Bob', person));
console.log('Equal?', JSON.stringify(person) === JSON.stringify(set(nameLens, 'Bob', person))); 