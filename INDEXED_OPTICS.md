# Indexable Optics (Indexed Lens, Prism, Traversal)

Indexable Optics provide index-aware optics to focus into elements at known positions or matching keys, with full HKT + Purity integration and `.then(...)` composition support.

## Overview

Indexable Optics extend the core optics system with index-aware variants:

- **IndexedLens**: Focus on an element at a specific index
- **IndexedPrism**: Optional focus on an element at a specific index  
- **IndexedTraversal**: Focus on multiple elements with indices

## Core Types

### IndexedLens

```typescript
interface IndexedLens<S, T, I, A, B> extends Lens<S, T, A, B> {
  readonly index: I;
  
  // Indexed-specific operations
  getAt(s: S, i: I): A;
  setAt(i: I, b: B, s: S): T;
  modifyAt(i: I, f: (a: A) => B, s: S): T;
}
```

### IndexedPrism

```typescript
interface IndexedPrism<S, T, I, A, B> extends Prism<S, T, A, B> {
  readonly index: I;
  
  // Indexed-specific operations
  getAtOption(s: S, i: I): Maybe<A>;
  setAtOption(i: I, b: B, s: S): T;
  modifyAtOption(i: I, f: (a: A) => B, s: S): T;
}
```

### IndexedTraversal

```typescript
interface IndexedTraversal<S, T, I, A, B> extends Traversal<S, T, A, B> {
  readonly index: I;
  
  // Indexed-specific operations
  getAllWithIndices(s: S): Array<[I, A]>;
  modifyWithIndices(f: (i: I, a: A) => B, s: S): T;
  collectWithIndices<R>(s: S, f: (i: I, a: A) => R): R[];
}
```

## Constructors

### indexedLens

```typescript
function indexedLens<S, T, I, A, B>(
  index: I,
  getter: (s: S, i: I) => A,
  setter: (i: I, b: B, s: S) => T
): IndexedLens<S, T, I, A, B>
```

### indexedPrism

```typescript
function indexedPrism<S, T, I, A, B>(
  index: I,
  matcher: (s: S, i: I) => Either<A, S>,
  builder: (i: I, b: B) => T
): IndexedPrism<S, T, I, A, B>
```

### indexedTraversal

```typescript
function indexedTraversal<S, T, I, A, B>(
  index: I,
  getAllFn: (s: S, i: I) => A[],
  modifyFn: (i: I, f: (a: A) => B, s: S) => T
): IndexedTraversal<S, T, I, A, B>
```

## Built-in Indexed Optics

### Array Index Optics

```typescript
// Array index lens (throws on out of bounds)
const arrayLens = arrayIndexLens(2);
const value = arrayLens.get([1, 2, 3, 4, 5]); // 3

// Array index prism (safe access)
const arrayPrism = arrayIndexPrism(2);
const maybeValue = arrayPrism.getOption([1, 2, 3, 4, 5]); // Just(3)
const outOfBounds = arrayPrism.getOption([1, 2], 5); // Nothing

// Array index traversal
const arrayTraversal = arrayIndexTraversal(2);
const values = arrayTraversal.getAll([1, 2, 3, 4, 5]); // [3]
```

### Tuple Index Optics

```typescript
// Tuple index lens
const tupleLens = tupleIndexLens(1);
const value = tupleLens.get(['a', 'b', 'c']); // 'b'
```

### Object Key Optics

```typescript
// Object key lens
const nameLens = objectKeyLens('name');
const name = nameLens.get({ name: 'Alice', age: 25 }); // 'Alice'

// Object key prism (safe access)
const agePrism = objectKeyPrism('age');
const maybeAge = agePrism.getOption({ name: 'Alice', age: 25 }); // Just(25)
const missingKey = agePrism.getOption({ name: 'Alice' }, 'age'); // Nothing
```

### Map Key Optics

```typescript
// Map key lens (throws on missing key)
const mapLens = mapKeyLens('key');
const value = mapLens.get(new Map([['key', 'value']])); // 'value'

// Map key prism (safe access)
const mapPrism = mapKeyPrism('key');
const maybeValue = mapPrism.getOption(new Map([['key', 'value']])); // Just('value')
const missingKey = mapPrism.getOption(new Map(), 'key'); // Nothing
```

## Before/After Examples

### Manual Index Logic vs Indexed Optics

#### Before: Manual Array Access

```typescript
// Manual array access with bounds checking
function updateArrayElement<T>(arr: T[], index: number, value: T): T[] {
  if (index < 0 || index >= arr.length) {
    throw new Error(`Index out of bounds: ${index}`);
  }
  const result = [...arr];
  result[index] = value;
  return result;
}

const numbers = [1, 2, 3, 4, 5];
const updated = updateArrayElement(numbers, 2, 10);
```

#### After: Indexed Optics

```typescript
// Clean, composable indexed optics
const arrayLens = arrayIndexLens(2);
const updated = arrayLens.set(10)([1, 2, 3, 4, 5]);

// Or with safe access
const arrayPrism = arrayIndexPrism(2);
const maybeUpdated = arrayPrism.setAtOption(2, 10, [1, 2, 3, 4, 5]);
```

### Manual Object Key Access

#### Before: Manual Object Access

```typescript
// Manual object key access
function updateObjectProperty<T, K extends keyof T>(
  obj: T, 
  key: K, 
  value: T[K]
): T {
  return { ...obj, [key]: value };
}

const person = { name: 'Alice', age: 25 };
const updated = updateObjectProperty(person, 'name', 'Bob');
```

#### After: Indexed Optics

```typescript
// Clean, composable indexed optics
const nameLens = objectKeyLens('name');
const updated = nameLens.set('Bob')({ name: 'Alice', age: 25 });

// Or with safe access
const namePrism = objectKeyPrism('name');
const maybeUpdated = namePrism.setAtOption('name', 'Bob', { name: 'Alice', age: 25 });
```

## Composition with .then(...)

### Cross-Kind Composition Rules

```typescript
// IndexedLens → IndexedLens = IndexedLens
const deepLens = arrayIndexLens(1).then(objectKeyLens('name'));

// IndexedLens → IndexedPrism = IndexedPrism  
const safeLens = arrayIndexLens(1).then(objectKeyPrism('name'));

// IndexedLens → IndexedTraversal = IndexedTraversal
const traversalLens = arrayIndexLens(1).then(arrayIndexTraversal(0));

// IndexedPrism → IndexedLens = IndexedPrism
const prismLens = arrayIndexPrism(1).then(objectKeyLens('name'));

// IndexedPrism → IndexedPrism = IndexedPrism
const safePrism = arrayIndexPrism(1).then(objectKeyPrism('name'));

// IndexedPrism → IndexedTraversal = IndexedTraversal
const prismTraversal = arrayIndexPrism(1).then(arrayIndexTraversal(0));

// IndexedTraversal → IndexedLens = IndexedTraversal
const traversalLens = arrayIndexTraversal(1).then(objectKeyLens('name'));

// IndexedTraversal → IndexedPrism = IndexedTraversal
const traversalPrism = arrayIndexTraversal(1).then(objectKeyPrism('name'));

// IndexedTraversal → IndexedTraversal = IndexedTraversal
const deepTraversal = arrayIndexTraversal(1).then(arrayIndexTraversal(0));
```

### Deep Indexed Access Examples

```typescript
// Access nested array element: users[1].scores[2]
const users = [
  { name: 'Alice', scores: [85, 90, 92] },
  { name: 'Bob', scores: [78, 88, 95] },
  { name: 'Charlie', scores: [92, 87, 89] }
];

const deepLens = arrayIndexLens(1)
  .then(objectKeyLens('scores'))
  .then(arrayIndexLens(2));

const score = deepLens.get(users); // 95
const updated = deepLens.set(100)(users); // Updated score

// Safe deep access with prisms
const safeDeepLens = arrayIndexPrism(1)
  .then(objectKeyPrism('scores'))
  .then(arrayIndexPrism(2));

const maybeScore = safeDeepLens.getOption(users); // Just(95)
const safeUpdated = safeDeepLens.setAtOption([1, 'scores', 2], 100, users);
```

## Integration with Immutable Updates

### Immutable Array Updates

```typescript
import { updateImmutable } from './fp-immutable';

const numbers = [1, 2, 3, 4, 5];
const arrayLens = arrayIndexLens(2);

// Using indexed optics with immutable updates
const updated = arrayLens.modify(x => x * 2)(numbers);
console.log(updated); // [1, 2, 6, 4, 5]

// Safe updates with prisms
const arrayPrism = arrayIndexPrism(10);
const safeUpdated = arrayPrism.modifyAtOption(10, x => x * 2, numbers);
console.log(safeUpdated); // [1, 2, 3, 4, 5] (no change, index out of bounds)
```

### Immutable Object Updates

```typescript
const person = { name: 'Alice', age: 25, address: { city: 'NYC' } };
const nameLens = objectKeyLens('name');
const cityLens = objectKeyLens('address').then(objectKeyLens('city'));

// Update name
const updatedName = nameLens.set('Bob')(person);

// Update nested city
const updatedCity = cityLens.set('LA')(person);

// Safe nested updates
const cityPrism = objectKeyPrism('address').then(objectKeyPrism('city'));
const safeCityUpdate = cityPrism.setAtOption(['address', 'city'], 'LA', person);
```

## Integration with Pattern Matching

### Pattern Matching with Indexed Optics

```typescript
import { match } from './fp-pattern-matching';

const data = [
  { type: 'user', name: 'Alice' },
  { type: 'admin', name: 'Bob', role: 'super' },
  { type: 'user', name: 'Charlie' }
];

// Pattern matching with indexed optics
const result = match(data, {
  // Match first element
  _: (arr) => {
    const firstLens = arrayIndexLens(0);
    const typeLens = objectKeyLens('type');
    const combinedLens = firstLens.then(typeLens);
    
    return combinedLens.get(arr) === 'admin' ? 'Admin found' : 'No admin';
  }
});

// Safe pattern matching with prisms
const safeResult = match(data, {
  _: (arr) => {
    const firstPrism = arrayIndexPrism(0);
    const rolePrism = objectKeyPrism('role');
    const combinedPrism = firstPrism.then(rolePrism);
    
    const maybeRole = combinedPrism.getOption(arr);
    return Maybe.match(maybeRole, {
      Just: (role) => `Role: ${role}`,
      Nothing: () => 'No role found'
    });
  }
});
```

## Purity and HKT Integration

### Purity Marking

```typescript
// All indexed optics are marked as Pure by default
const lens = arrayIndexLens(2);
console.log(lens.__effect); // 'Pure'

const prism = arrayIndexPrism(2);
console.log(prism.__effect); // 'Pure'

const traversal = arrayIndexTraversal(2);
console.log(traversal.__effect); // 'Pure'
```

### HKT Integration

```typescript
// Indexed optics preserve HKT parameters
const lens: IndexedLens<number[], number[], number, number, number> = arrayIndexLens(2);

// Works with typeclass instances
const functorLens = lens.map(x => x.toString());
const applicativeLens = lens.ap(Maybe.Just(x => x.toString()));
```

## Helper Functions

### Indexed Lens Helpers

```typescript
import { getAt, setAt, modifyAt } from './fp-optics-indexed';

const lens = arrayIndexLens(2);
const numbers = [1, 2, 3, 4, 5];

// Get value at index
const value = getAt(lens, numbers, 2); // 3

// Set value at index
const updated = setAt(lens, 2, 10, numbers); // [1, 2, 10, 4, 5]

// Modify value at index
const modified = modifyAt(lens, 2, x => x * 2, numbers); // [1, 2, 6, 4, 5]
```

### Indexed Prism Helpers

```typescript
import { getAtOption, setAtOption, modifyAtOption } from './fp-optics-indexed';

const prism = arrayIndexPrism(2);
const numbers = [1, 2, 3, 4, 5];

// Safe get value at index
const maybeValue = getAtOption(prism, numbers, 2); // Just(3)
const outOfBounds = getAtOption(prism, numbers, 10); // Nothing

// Safe set value at index
const safeUpdated = setAtOption(prism, 2, 10, numbers); // [1, 2, 10, 4, 5]
const safeOutOfBounds = setAtOption(prism, 10, 10, numbers); // [1, 2, 3, 4, 5] (no change)

// Safe modify value at index
const safeModified = modifyAtOption(prism, 2, x => x * 2, numbers); // [1, 2, 6, 4, 5]
```

## Performance Considerations

### Efficient Indexed Access

```typescript
// Indexed optics are optimized for direct access
const lens = arrayIndexLens(2);

// Direct array access (O(1))
const value = lens.get([1, 2, 3, 4, 5]);

// Immutable update (O(n) for array copy, but optimized)
const updated = lens.set(10)([1, 2, 3, 4, 5]);
```

### Lazy Evaluation

```typescript
// Indexed traversals support lazy evaluation
const traversal = arrayIndexTraversal(2);

// Only processes focused elements
const values = traversal.getAll([1, 2, 3, 4, 5]); // [3]
const modified = traversal.modify(x => x * 2, [1, 2, 3, 4, 5]); // [1, 2, 6, 4, 5]
```

## Best Practices

### Use Prisms for Safe Access

```typescript
// ❌ Unsafe: May throw on out of bounds
const lens = arrayIndexLens(10);
const value = lens.get([1, 2, 3]); // Throws error

// ✅ Safe: Returns Maybe for missing indices
const prism = arrayIndexPrism(10);
const maybeValue = prism.getOption([1, 2, 3]); // Nothing
```

### Compose Optics for Deep Access

```typescript
// ❌ Manual nested access
const value = data.users[1].profile.email;

// ✅ Composable indexed optics
const deepLens = arrayIndexLens(1)
  .then(objectKeyLens('profile'))
  .then(objectKeyLens('email'));
const value = deepLens.get(data);
```

### Leverage Type Safety

```typescript
// Type-safe indexed access
const personLens = objectKeyLens('name'); // Type: IndexedLens<Person, Person, 'name', string, string>

// Compile-time type checking
const updated = personLens.set(123); // Type error: number is not assignable to string
```

## Migration Guide

### From Manual Index Access

```typescript
// Before: Manual array access
function updateElement<T>(arr: T[], index: number, value: T): T[] {
  const result = [...arr];
  result[index] = value;
  return result;
}

// After: Indexed optics
const lens = arrayIndexLens(index);
const updateElement = (arr, index, value) => lens.setAt(index, value, arr);
```

### From Manual Object Access

```typescript
// Before: Manual object access
function updateProperty<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value };
}

// After: Indexed optics
const lens = objectKeyLens(key);
const updateProperty = (obj, key, value) => lens.setAt(key, value, obj);
```

### From Manual Bounds Checking

```typescript
// Before: Manual bounds checking
function safeGet<T>(arr: T[], index: number): Maybe<T> {
  return index >= 0 && index < arr.length 
    ? Maybe.Just(arr[index]) 
    : Maybe.Nothing();
}

// After: Indexed prisms
const prism = arrayIndexPrism(index);
const safeGet = (arr, index) => prism.getAtOption(arr, index);
```

## Conclusion

Indexable Optics provide a powerful, type-safe, and composable way to work with indexed data structures. They integrate seamlessly with the existing optics ecosystem while providing index-aware operations that are both safe and efficient.

Key benefits:

- **Type Safety**: Full TypeScript support with compile-time type checking
- **Composability**: Seamless composition with existing optics via `.then(...)`
- **Safety**: Optional variants (Prisms) for safe access without exceptions
- **Performance**: Optimized for direct access and immutable updates
- **Integration**: Works with purity tracking, HKTs, and pattern matching
- **Ergonomics**: Clean, functional API that eliminates manual index logic

Indexable Optics complete the optics ecosystem by providing index-aware variants of all core optic types, enabling powerful data transformations with full type safety and composition support. 