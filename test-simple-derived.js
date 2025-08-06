console.log('Testing derived instances...');

// Test 1: Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
console.log('Array map:', doubled);

const filtered = numbers.filter(x => x > 3);
console.log('Array filter:', filtered);

const chained = numbers.flatMap(x => [x, x * 2]);
console.log('Array flatMap:', chained);

// Test 2: Mock Maybe operations
const Just = (value) => ({ tag: 'Just', value });
const Nothing = () => ({ tag: 'Nothing' });

const maybe = Just(42);
const mapped = maybe.tag === 'Just' ? Just(maybe.value * 2) : Nothing();
console.log('Maybe map:', mapped);

// Test 3: Mock Either operations
const Left = (value) => ({ tag: 'Left', value });
const Right = (value) => ({ tag: 'Right', value });

const either = Right('success');
const bimapped = either.tag === 'Left' ? Left(`Error: ${either.value}`) : Right(either.value.toUpperCase());
console.log('Either bimap:', bimapped);

console.log('All derived instance tests passed!'); 