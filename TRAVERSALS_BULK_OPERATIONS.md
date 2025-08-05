# Traversals & Bulk Operations Documentation

## Overview

Traversals generalize Lenses and Prisms to focus on 0-n elements at once, unlocking powerful FP ergonomics for arrays, immutable updates, and ObservableLite integration. This system provides bulk operations that work seamlessly with the existing optics ecosystem.

## Core Concepts

### Traversal Type

A `Traversal<S, T, A, B>` focuses on multiple `A` elements inside an `S`, allowing you to:
- Extract all focused elements into an array
- Modify all focused elements with a function
- Compose with other optics (Lens, Prism, Optional)
- Integrate with ObservableLite for reactive bulk operations

### Key Benefits

1. **Bulk Operations**: Process multiple elements at once
2. **Immutable Updates**: Create new structures without mutation
3. **Composability**: Chain with other optics seamlessly
4. **Reactive Integration**: Work with ObservableLite streams
5. **Type Safety**: Full TypeScript support with inference

## Traversal Constructor

### `traversal(getAll, modifyAll)`

Creates a traversal from two functions:

```typescript
const allNames = traversal<Person[], Person[], string, string>(
  // getAll: extract all focused elements
  (ps) => ps.map(p => p.name),
  
  // modifyAll: update all focused elements
  (names, ps) => ps.map((p, i) => ({ ...p, name: names[i] }))
);
```

**Parameters**:
- `getAll: (s: S) => A[]` - Extracts all focused elements
- `modifyAll: (bs: B[], s: S) => T` - Updates all focused elements

**Returns**: A traversal object with `getAll`, `modifyAll`, `over`, `collect`, and `then` methods.

## Array/Collection Traversals

### `each<T>()`

Focuses on all elements in an array:

```typescript
const numbers = [1, 2, 3, 4, 5];
const eachTraversal = each();

// Collect all elements
const allNumbers = collect(eachTraversal, numbers);
// Result: [1, 2, 3, 4, 5]

// Transform all elements
const doubled = overTraversal(eachTraversal, n => n * 2, numbers);
// Result: [2, 4, 6, 8, 10]
```

### `filtered(predicate)`

Focuses only on elements matching a predicate:

```typescript
const numbers = [1, 2, 3, 4, 5, 6];
const evenTraversal = filtered(n => n % 2 === 0);

// Collect even numbers
const evens = collect(evenTraversal, numbers);
// Result: [2, 4, 6]

// Increment even numbers
const incremented = overTraversal(evenTraversal, n => n + 1, numbers);
// Result: [1, 3, 3, 5, 5, 7]
```

### `head<T>()`

Focuses on the first element of an array:

```typescript
const numbers = [1, 2, 3, 4, 5];
const headTraversal = head();

// Collect first element
const first = collect(headTraversal, numbers);
// Result: [1]

// Transform first element
const incremented = overTraversal(headTraversal, n => n + 10, numbers);
// Result: [11, 2, 3, 4, 5]
```

### `tail<T>()`

Focuses on all elements except the first:

```typescript
const numbers = [1, 2, 3, 4, 5];
const tailTraversal = tail();

// Collect all but first
const rest = collect(tailTraversal, numbers);
// Result: [2, 3, 4, 5]

// Transform rest elements
const doubled = overTraversal(tailTraversal, n => n * 2, numbers);
// Result: [1, 4, 6, 8, 10]
```

## Traversal Operations

### `overTraversal(traversal, fn, s)`

Modifies all focused values with a function:

```typescript
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const nameTraversal = each().then(lens(
  person => person.name,
  (person, name) => ({ ...person, name })
));

const upperCasePeople = overTraversal(nameTraversal, name => name.toUpperCase(), people);
// Result: [{ name: 'ALICE', age: 25 }, { name: 'BOB', age: 30 }, { name: 'CHARLIE', age: 35 }]
```

### `collect(traversal, s)`

Extracts all focused values into an array:

```typescript
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const nameTraversal = each().then(lens(
  person => person.name,
  (person, name) => ({ ...person, name })
));

const names = collect(nameTraversal, people);
// Result: ['Alice', 'Bob', 'Charlie']
```

## Cross-Kind Composition

Traversals compose seamlessly with other optics:

### Lens → Traversal

```typescript
const usersLens = lens(
  data => data.users,
  (data, users) => ({ ...data, users })
);

const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);

// Compose: users -> each -> name
const allNames = usersLens.then(each()).then(nameLens);
const names = collect(allNames, { users: people });
// Result: ['Alice', 'Bob', 'Charlie']
```

### Prism → Traversal

```typescript
const maybeUsersPrism = prism(
  data => data.maybeUsers ? Maybe.Just(data.maybeUsers) : Maybe.Nothing(),
  users => ({ maybeUsers: users })
);

// Compose: maybeUsers -> each -> name
const allNames = maybeUsersPrism.then(each()).then(nameLens);
const names = collect(allNames, { maybeUsers: people });
// Result: ['Alice', 'Bob', 'Charlie']
```

### Traversal → Lens

```typescript
const ageLens = lens(
  person => person.age,
  (person, age) => ({ ...person, age })
);

// Compose: each -> age
const allAges = each().then(ageLens);
const ages = collect(allAges, people);
// Result: [25, 30, 35]
```

### Traversal → Traversal

```typescript
const tagsLens = lens(
  profile => profile.tags,
  (profile, tags) => ({ ...profile, tags })
);

// Compose: each -> profile -> tags -> each
const allTags = each().then(profileLens).then(tagsLens).then(each());
const tags = collect(allTags, people);
// Result: ['dev', 'admin', 'user', 'dev', 'user']
```

## ObservableLite Integration

Traversals integrate seamlessly with ObservableLite for reactive bulk operations:

### Bulk Mapping in Streams

```typescript
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const observable = ObservableLite.of(people);

// Bulk transform all names to uppercase
const upperCaseObservable = observable.over(each(), person => ({
  ...person,
  name: person.name.toUpperCase()
}));

upperCaseObservable.subscribe({
  next: transformedPeople => {
    // Result: [{ name: 'ALICE', age: 25 }, { name: 'BOB', age: 30 }, { name: 'CHARLIE', age: 35 }]
  }
});
```

### Filtered Bulk Operations

```typescript
// Only transform people over 25
const filteredObservable = observable.over(
  filtered(person => person.age > 25),
  person => ({ ...person, age: person.age + 1 })
);

filteredObservable.subscribe({
  next: transformedPeople => {
    // Result: [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 31 }, { name: 'Charlie', age: 36 }]
  }
});
```

### Preview All Focused Elements

```typescript
// Extract all names from the stream
const namesObservable = observable.preview(each().then(nameLens));

namesObservable.subscribe({
  next: names => {
    // Result: ['Alice', 'Bob', 'Charlie']
  }
});
```

## Immutable Updates

Traversals work with immutable data structures:

```typescript
const originalPeople = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const nameTraversal = each().then(lens(
  person => person.name,
  (person, name) => ({ ...person, name })
));

const updatedPeople = overTraversal(nameTraversal, name => name.toUpperCase(), originalPeople);

// Original is unchanged
console.log(originalPeople[0].name); // 'Alice'

// Updated has new values
console.log(updatedPeople[0].name); // 'ALICE'

// Different references
console.log(originalPeople === updatedPeople); // false
console.log(originalPeople[0] === updatedPeople[0]); // false
```

## Complex Compositions

Traversals enable powerful complex compositions:

```typescript
const data = {
  users: [
    { id: 1, profile: { name: 'Alice', tags: ['dev', 'admin'] } },
    { id: 2, profile: { name: 'Bob', tags: ['user'] } },
    { id: 3, profile: { name: 'Charlie', tags: ['dev', 'user'] } }
  ]
};

// Get all names
const allNames = usersLens.then(each()).then(profileLens).then(nameLens);
const names = collect(allNames, data);
// Result: ['Alice', 'Bob', 'Charlie']

// Get all tags
const allTags = usersLens.then(each()).then(profileLens).then(tagsLens).then(each());
const tags = collect(allTags, data);
// Result: ['dev', 'admin', 'user', 'dev', 'user']

// Update all names to uppercase
const updatedData = overTraversal(allNames, name => name.toUpperCase(), data);
// Result: All names are uppercase
```

## Performance Considerations

### Efficient Bulk Operations

Traversals are designed for efficient bulk operations:

1. **Single Pass**: Most operations complete in a single pass through the data
2. **Lazy Evaluation**: Operations are only performed when needed
3. **Immutable Updates**: Minimal object creation for updates
4. **Composition Optimization**: Composed traversals are optimized internally

### Memory Usage

- **Minimal Overhead**: Traversals add minimal memory overhead
- **Garbage Collection Friendly**: Immutable updates work well with GC
- **Streaming Support**: ObservableLite integration supports streaming data

## Type Safety

### Full TypeScript Support

Traversals provide full type safety:

```typescript
// Type inference works correctly
const nameTraversal = each().then(lens(
  person => person.name, // TypeScript knows person is Person
  (person, name) => ({ ...person, name }) // TypeScript knows name is string
));

// Return types are inferred
const names = collect(nameTraversal, people); // TypeScript knows this is string[]
const updated = overTraversal(nameTraversal, name => name.toUpperCase(), people); // TypeScript knows this is Person[]
```

### Generic Type Parameters

Traversals support generic type parameters:

```typescript
function createNameTraversal<T extends { name: string }>() {
  return each<T>().then(lens(
    item => item.name,
    (item, name) => ({ ...item, name })
  ));
}
```

## Error Handling

### Graceful Failure

Traversals handle errors gracefully:

```typescript
// Empty arrays are handled correctly
const emptyResult = collect(each(), []);
// Result: []

// Null/undefined values are handled
const nullResult = collect(each(), null);
// Result: []

// Composition errors provide clear messages
try {
  invalidComposition.then(invalidOptic);
} catch (error) {
  // Clear error message: "Invalid optic for traversal composition"
}
```

## Integration with Existing Optics

### Seamless Integration

Traversals integrate seamlessly with the existing optics system:

- **Lens Integration**: `lens.then(traversal)` and `traversal.then(lens)` work correctly
- **Prism Integration**: `prism.then(traversal)` and `traversal.then(prism)` work correctly
- **Optional Integration**: `optional.then(traversal)` and `traversal.then(optional)` work correctly
- **Type Guards**: `isTraversal()` function for reliable detection

### Backward Compatibility

Traversals are designed for backward compatibility:

- Existing lens/prism/optional code continues to work
- No breaking changes to existing APIs
- Gradual adoption possible

## Use Cases

### Common Patterns

1. **Bulk Data Transformation**: Transform all elements in a collection
2. **Filtered Operations**: Apply operations only to matching elements
3. **Nested Data Access**: Access deeply nested data in bulk
4. **Reactive Streams**: Process data streams with bulk operations
5. **Immutable Updates**: Create new data structures without mutation

### Real-World Examples

```typescript
// Form validation
const formErrors = formLens.then(each()).then(fieldLens).then(errorLens);
const allErrors = collect(formErrors, form);

// User permissions
const adminUsers = usersLens.then(filtered(user => user.role === 'admin'));
const adminNames = adminUsers.then(nameLens);
const adminNameList = collect(adminNames, data);

// Data normalization
const normalizedData = overTraversal(
  each().then(profileLens),
  profile => ({ ...profile, name: profile.name.toLowerCase() }),
  data
);
```

This comprehensive traversal system provides powerful bulk operations that integrate seamlessly with the existing optics ecosystem, enabling efficient, type-safe, and immutable data transformations. 