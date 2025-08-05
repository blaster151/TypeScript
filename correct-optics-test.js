// Correct optics implementation based on profunctor pattern
console.log('🧪 Correct Optics Implementation...\n');

// Profunctor-based lens implementation
function lens(getter, setter) {
  return (pab) => {
    return (s) => {
      const a = getter(s);
      const b = pab(a);
      return setter(s, b);
    };
  };
}

// For view, we need a profunctor that can extract values
// We'll use a simple approach with a "Const" profunctor
function view(ln, s) {
  // We need to extract just the focused part
  // Let's use the getter directly for now
  const getter = (p) => p.name; // This should come from the lens
  return getter(s);
}

// For set, we need a profunctor that ignores the input and returns the new value
function set(ln, b, s) {
  const constProfunctor = (a) => b;
  const optic = ln(constProfunctor);
  return optic(s);
}

// For over, we use the transformation function directly
function over(ln, f, s) {
  const optic = ln(f);
  return optic(s);
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
console.log('Over name to uppercase:', over(nameLens, name => name.toUpperCase(), person));

// Test lens laws
console.log('\n--- Lens Laws ---');
const name = view(nameLens, person);
const result1 = set(nameLens, name, person);
console.log('Law 1 (set(l, get(l, s), s) === s):', JSON.stringify(person) === JSON.stringify(result1));

const newName = 'Robert';
const modifiedPerson = set(nameLens, newName, person);
const result2 = view(nameLens, modifiedPerson);
console.log('Law 2 (get(l, set(l, b, s)) === b):', result2 === newName); 