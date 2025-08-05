# Traversals Fold Operations Documentation

## Overview

The Traversal system extends beyond basic bulk operations with powerful **fold** capabilities that leverage the Monoid abstraction for flexible aggregation. This enables efficient, type-safe, and composable data reduction operations across collections.

## Core Concepts

### Fold Operations

Traversals provide two primary fold operations:

1. **`foldMap<M>(Monoid: Monoid<M>)`**: Maps each focused value to a monoidal value, then combines them
2. **`fold(Monoid: Monoid<A>)`**: Convenience method that folds values directly using the monoid

### Monoid Abstraction

A Monoid provides:
- **`empty: A`**: Identity element
- **`concat: (a: A, b: A) => A`**: Associative binary operation

This abstraction enables flexible aggregation patterns while preserving mathematical laws.

## Fold Operations

### `foldMap<M>(Monoid: Monoid<M>)`

Maps each focused value to a monoidal value, then combines them using the monoid's `empty` and `concat`:

```typescript
foldMap<M>(Monoid: Monoid<M>): (f: (a: A) => M) => (s: S) => M;
```

**Example**:
```typescript
const numbers = [1, 2, 3, 4, 5];
const eachTraversal = each();

// Sum all numbers
const sumFoldMap = eachTraversal.foldMap(SumMonoid);
const total = sumFoldMap(n => n)(numbers); // 15

// Sum all ages from people
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const ageLens = lens(
  person => person.age,
  (person, age) => ({ ...person, age })
);
const ageTraversal = each().then(ageLens);

const ageSumFoldMap = ageTraversal.foldMap(SumMonoid);
const ageTotal = ageSumFoldMap(age => age)(people); // 90
```

### `fold(Monoid: Monoid<A>)`

Convenience method that folds values directly using the monoid (equivalent to `foldMap` with identity mapping):

```typescript
fold(Monoid: Monoid<A>): (s: S) => A;
```

**Example**:
```typescript
const numbers = [1, 2, 3, 4, 5];
const eachTraversal = each();

// Sum all numbers
const sumFold = eachTraversal.fold(SumMonoid);
const total = sumFold(numbers); // 15

// Multiply all numbers
const productFold = eachTraversal.fold(ProductMonoid);
const product = productFold(numbers); // 120
```

## Built-in Monoids

### Numeric Monoids

#### `SumMonoid`
- **empty**: `0`
- **concat**: Addition (`+`)
- **Use case**: Summing values

```typescript
const numbers = [1, 2, 3, 4, 5];
const sum = eachTraversal.fold(SumMonoid)(numbers); // 15
```

#### `ProductMonoid`
- **empty**: `1`
- **concat**: Multiplication (`*`)
- **Use case**: Multiplying values

```typescript
const numbers = [1, 2, 3, 4, 5];
const product = eachTraversal.fold(ProductMonoid)(numbers); // 120
```

#### `MinMonoid`
- **empty**: `Infinity`
- **concat**: `Math.min`
- **Use case**: Finding minimum value

```typescript
const numbers = [5, 2, 8, 1, 9];
const min = eachTraversal.fold(MinMonoid)(numbers); // 1
```

#### `MaxMonoid`
- **empty**: `-Infinity`
- **concat**: `Math.max`
- **Use case**: Finding maximum value

```typescript
const numbers = [5, 2, 8, 1, 9];
const max = eachTraversal.fold(MaxMonoid)(numbers); // 9
```

### Boolean Monoids

#### `AllMonoid`
- **empty**: `true`
- **concat**: Logical AND (`&&`)
- **Use case**: Checking if all values are true

```typescript
const booleanValues = [true, true, false, true];
const allTrue = eachTraversal.fold(AllMonoid)(booleanValues); // false

const allTrueValues = [true, true, true];
const allTrueResult = eachTraversal.fold(AllMonoid)(allTrueValues); // true
```

#### `AnyMonoid`
- **empty**: `false`
- **concat**: Logical OR (`||`)
- **Use case**: Checking if any values are true

```typescript
const booleanValues = [true, true, false, true];
const anyTrue = eachTraversal.fold(AnyMonoid)(booleanValues); // true

const allFalseValues = [false, false, false];
const anyTrueResult = eachTraversal.fold(AnyMonoid)(allFalseValues); // false
```

### String Monoid

#### `StringMonoid`
- **empty**: `""`
- **concat**: String concatenation (`+`)
- **Use case**: Concatenating strings

```typescript
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);
const nameTraversal = each().then(nameLens);

const concatenatedNames = nameTraversal.fold(StringMonoid)(people); // 'AliceBobCharlie'
```

### Array Monoid

#### `ArrayMonoid<T>()`
- **empty**: `[]`
- **concat**: Array concatenation (`[...a, ...b]`)
- **Use case**: Concatenating arrays

```typescript
const arrays = [[1, 2], [3, 4], [5, 6]];
const concatenated = eachTraversal.fold(ArrayMonoid())(arrays); // [1, 2, 3, 4, 5, 6]
```

## Advanced Fold Examples

### Complex Data Aggregation

```typescript
const data = {
  users: [
    { id: 1, profile: { name: 'Alice', tags: ['dev', 'admin'] } },
    { id: 2, profile: { name: 'Bob', tags: ['user'] } },
    { id: 3, profile: { name: 'Charlie', tags: ['dev', 'user'] } }
  ]
};

// Get all unique tags
const usersLens = lens(
  data => data.users,
  (data, users) => ({ ...data, users })
);

const profileLens = lens(
  user => user.profile,
  (user, profile) => ({ ...user, profile })
);

const tagsLens = lens(
  profile => profile.tags,
  (profile, tags) => ({ ...profile, tags })
);

const allTags = usersLens.then(each()).then(profileLens).then(tagsLens).then(each());
const uniqueTags = allTags.fold(ArrayMonoid())(data); // ['dev', 'admin', 'user', 'dev', 'user']
```

### Conditional Aggregation

```typescript
const people = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true }
];

// Sum ages of active people only
const activePeople = filtered(person => person.active);
const ageLens = lens(
  person => person.age,
  (person, age) => ({ ...person, age })
);

const activeAgeSum = activePeople.then(ageLens).foldMap(SumMonoid)(age => age)(people); // 60
```

### String Processing

```typescript
const words = ['hello', 'world', 'test'];

// Concatenate with spaces
const spacedFoldMap = eachTraversal.foldMap(StringMonoid);
const spacedResult = spacedFoldMap(word => word + ' ')(words); // 'hello world test '

// Concatenate with commas
const commaFoldMap = eachTraversal.foldMap(StringMonoid);
const commaResult = commaFoldMap(word => word + ', ')(words); // 'hello, world, test, '
```

## Monoid Laws

All monoids must satisfy three fundamental laws:

### 1. Left Identity
```typescript
monoid.concat(monoid.empty, a) === a
```

### 2. Right Identity
```typescript
monoid.concat(a, monoid.empty) === a
```

### 3. Associativity
```typescript
monoid.concat(monoid.concat(a, b), c) === monoid.concat(a, monoid.concat(b, c))
```

**Example Validation**:
```typescript
// Test SumMonoid laws
const testNumbers = [1, 2, 3, 4, 5];

// Left identity: empty + a = a
for (const num of testNumbers) {
  const leftIdentity = SumMonoid.concat(SumMonoid.empty, num);
  assert(leftIdentity === num); // ✓
}

// Right identity: a + empty = a
for (const num of testNumbers) {
  const rightIdentity = SumMonoid.concat(num, SumMonoid.empty);
  assert(rightIdentity === num); // ✓
}

// Associativity: (a + b) + c = a + (b + c)
for (let i = 0; i < testNumbers.length - 2; i++) {
  const a = testNumbers[i];
  const b = testNumbers[i + 1];
  const c = testNumbers[i + 2];
  
  const left = SumMonoid.concat(SumMonoid.concat(a, b), c);
  const right = SumMonoid.concat(a, SumMonoid.concat(b, c));
  assert(left === right); // ✓
}
```

## HKT + Purity Integration

### Type Safety

Fold operations preserve full type safety:

```typescript
// Type inference works correctly
const nameTraversal = each().then(lens(
  person => person.name, // TypeScript knows person is Person
  (person, name) => ({ ...person, name }) // TypeScript knows name is string
));

// Return types are inferred
const names = nameTraversal.fold(StringMonoid)(people); // TypeScript knows this is string
const nameLengths = nameTraversal.foldMap(SumMonoid)(name => name.length)(people); // TypeScript knows this is number
```

### Purity Guarantees

All fold operations are marked as `Pure`:

```typescript
// All built-in monoids are Pure
SumMonoid.__effect === 'Pure' // true
StringMonoid.__effect === 'Pure' // true
AllMonoid.__effect === 'Pure' // true

// Fold operations inherit purity
const foldOperation = traversal.fold(SumMonoid);
// foldOperation is Pure
```

### Higher-Kinded Contexts

Fold operations work in higher-kinded contexts:

```typescript
// Works with Maybe
const maybeNumbers = Maybe.Just([1, 2, 3, 4, 5]);
const maybeSum = maybeNumbers.map(numbers => eachTraversal.fold(SumMonoid)(numbers));

// Works with Either
const eitherNumbers = Either.Right([1, 2, 3, 4, 5]);
const eitherSum = eitherNumbers.map(numbers => eachTraversal.fold(SumMonoid)(numbers));
```

## Performance Considerations

### Efficient Folding

Fold operations are designed for efficiency:

1. **Single Pass**: Most fold operations complete in a single pass through the data
2. **Lazy Evaluation**: Operations are only performed when needed
3. **Minimal Allocation**: Reuses monoid instances where possible
4. **Composition Optimization**: Composed folds are optimized internally

### Memory Usage

- **Minimal Overhead**: Fold operations add minimal memory overhead
- **Garbage Collection Friendly**: Immutable operations work well with GC
- **Streaming Support**: Can work with streaming data in ObservableLite

## Error Handling

### Graceful Failure

Fold operations handle errors gracefully:

```typescript
// Empty arrays return empty value
const emptySum = eachTraversal.fold(SumMonoid)([]); // 0
const emptyProduct = eachTraversal.fold(ProductMonoid)([]); // 1
const emptyString = eachTraversal.fold(StringMonoid)([]); // ""

// Null/undefined values are handled
const nullSum = eachTraversal.fold(SumMonoid)(null); // 0
const undefinedSum = eachTraversal.fold(SumMonoid)(undefined); // 0
```

## Integration with Existing Optics

### Seamless Composition

Fold operations compose seamlessly with other optics:

```typescript
// Lens → Traversal → Fold
const usersLens = lens(data => data.users, (data, users) => ({ ...data, users }));
const nameLens = lens(user => user.name, (user, name) => ({ ...user, name }));

const allNames = usersLens.then(each()).then(nameLens);
const concatenatedNames = allNames.fold(StringMonoid)(data);

// Prism → Traversal → Fold
const maybeUsersPrism = prism(
  data => data.maybeUsers ? Maybe.Just(data.maybeUsers) : Maybe.Nothing(),
  users => ({ maybeUsers: users })
);

const maybeAllNames = maybeUsersPrism.then(each()).then(nameLens);
const maybeConcatenatedNames = maybeAllNames.fold(StringMonoid)(data);
```

### ObservableLite Integration

Fold operations integrate with ObservableLite:

```typescript
const observable = ObservableLite.of([1, 2, 3, 4, 5]);

// Fold in streams
const sumObservable = observable.map(numbers => eachTraversal.fold(SumMonoid)(numbers));
sumObservable.subscribe({
  next: sum => console.log('Sum:', sum) // 15
});

// FoldMap in streams
const doubledSumObservable = observable.map(numbers => 
  eachTraversal.foldMap(SumMonoid)(n => n * 2)(numbers)
);
doubledSumObservable.subscribe({
  next: sum => console.log('Doubled sum:', sum) // 30
});
```

## Use Cases

### Common Patterns

1. **Data Aggregation**: Sum, product, min, max of collections
2. **Boolean Logic**: All, any, none checks
3. **String Processing**: Concatenation, formatting
4. **Array Operations**: Flattening, concatenation
5. **Conditional Aggregation**: Filtered folding

### Real-World Examples

```typescript
// Form validation - check if all fields are valid
const formFields = [
  { name: 'email', valid: true },
  { name: 'password', valid: false },
  { name: 'confirm', valid: true }
];

const validLens = lens(field => field.valid, (field, valid) => ({ ...field, valid }));
const allValid = each().then(validLens).fold(AllMonoid)(formFields); // false

// User permissions - check if user has any admin role
const userRoles = ['user', 'admin', 'moderator'];
const isAdmin = role => role === 'admin';
const hasAdminRole = eachTraversal.foldMap(AnyMonoid)(isAdmin)(userRoles); // true

// Data normalization - concatenate all tags
const posts = [
  { title: 'Post 1', tags: ['tech', 'javascript'] },
  { title: 'Post 2', tags: ['tech', 'typescript'] },
  { title: 'Post 3', tags: ['design', 'ui'] }
];

const tagsLens = lens(post => post.tags, (post, tags) => ({ ...post, tags }));
const allTags = each().then(tagsLens).then(each()).fold(ArrayMonoid())(posts);
// ['tech', 'javascript', 'tech', 'typescript', 'design', 'ui']
```

This comprehensive fold system provides powerful, type-safe, and efficient aggregation capabilities that integrate seamlessly with the existing optics ecosystem, enabling complex data transformations and analysis with mathematical rigor. 