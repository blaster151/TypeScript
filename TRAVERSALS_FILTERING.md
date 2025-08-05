# Traversals Filtering Documentation

## Overview

The Traversal system now supports inline filtering capabilities that keep traversals law-abiding and composable in `.then(...)`. This enables selective transformation of data by filtering values before mapping/traversing, while preserving the mathematical properties of traversals.

## Core Features

### Inline Filtering

Traversals can be filtered inline before mapping/traversing:

```typescript
// Filter values before transformation
const evenTraversal = numberTraversal.filter(n => n % 2 === 0);
const longNames = peopleTraversal.then(nameTraversal).filter(n => n.length > 4);
```

### Non-Destructive Filtering

Filtering is non-destructive — unmatched elements pass through unchanged:

```typescript
// Only even numbers are transformed, odd numbers remain unchanged
const doubledEvens = overTraversal(evenTraversal, n => n * 2, numbers);
// Result: [1, 4, 3, 8, 5, 12, 7, 16, 9, 20]
```

## `filterTraversal` Utility

The `filterTraversal` function provides the foundation for inline filtering:

```typescript
function filterTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  pred: (a: A) => boolean
): Traversal<S, T, A, B>
```

**Features**:
- Wraps an existing traversal
- Passes only values matching predicate to mapping function
- Preserves HKT + purity metadata
- Maintains traversal laws

## `.filter(...)` Method

### Traversal Interface Extension

```typescript
interface Traversal<S, T, A, B> {
  filter(pred: (a: A) => boolean): Traversal<S, T, A, B>;
}
```

### Implementation

```typescript
filter(pred) {
  return filterTraversal(this, pred);
}
```

## Filtering Examples

### Simple Filtering

```typescript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const eachTraversal = each();

// Filter even numbers
const evenTraversal = eachTraversal.filter(n => n % 2 === 0);

// Collect only even numbers
const evenNumbers = collect(evenTraversal, numbers);
// Result: [2, 4, 6, 8, 10]

// Transform only even numbers
const doubledEvens = overTraversal(evenTraversal, n => n * 2, numbers);
// Result: [1, 4, 3, 8, 5, 12, 7, 16, 9, 20]
```

### Chaining Filter After `.then(...)`

```typescript
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 },
  { name: 'David', age: 40 },
  { name: 'Eve', age: 45 }
];

const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);

// Chain filter after .then(...)
const longNames = each().then(nameLens).filter(n => n.length > 4);

// Collect only long names
const longNameList = collect(longNames, people);
// Result: ['Alice', 'Charlie', 'David']

// Transform only long names
const upperCaseLongNames = overTraversal(longNames, name => name.toUpperCase(), people);
// Result: [{ name: 'ALICE', age: 25 }, { name: 'Bob', age: 30 }, { name: 'CHARLIE', age: 35 }, ...]
```

### Multiple Filters in Chain

```typescript
const ageLens = lens(
  person => person.age,
  (person, age) => ({ ...person, age })
);

// Multiple filters for staged refinement
const middleAged = each().then(ageLens)
  .filter(age => age >= 30)
  .filter(age => age <= 40);

// Collect only middle-aged people
const middleAgedList = collect(middleAged, people);
// Result: [30, 35, 40]

// Transform only middle-aged people
const incrementedMiddleAged = overTraversal(middleAged, age => age + 1, people);
// Result: [{ age: 25 }, { age: 31 }, { age: 36 }, { age: 41 }, { age: 45 }]
```

### Complex Nested Filtering

```typescript
const data = {
  users: [
    { id: 1, profile: { name: 'Alice', tags: ['dev', 'admin'] } },
    { id: 2, profile: { name: 'Bob', tags: ['user'] } },
    { id: 3, profile: { name: 'Charlie', tags: ['dev', 'user'] } },
    { id: 4, profile: { name: 'David', tags: ['admin'] } }
  ]
};

const usersLens = lens(
  data => data.users,
  (data, users) => ({ ...data, users })
);

const profileLens = lens(
  user => user.profile,
  (user, profile) => ({ ...user, profile })
);

const nameLens = lens(
  profile => profile.name,
  (profile, name) => ({ ...profile, name })
);

// Complex filtering: users → each → profile → name → filter long names
const longNameUsers = usersLens
  .then(each())
  .then(profileLens)
  .then(nameLens)
  .filter(name => name.length > 4);

const longNamesFromUsers = collect(longNameUsers, data);
// Result: ['Alice', 'Charlie', 'David']
```

## Before vs After Comparison

### Before (Manual Predicate Inside Over)

```typescript
// Manual approach requires predicate logic inside transformation
const manualResult = overTraversal(eachTraversal, n => {
  if (n % 2 === 0) {
    return n * 2;
  } else {
    return n; // Must handle non-matching case
  }
}, numbers);
```

### After (Fluent `.filter(...)`)

```typescript
// Clean, declarative approach
const filteredResult = overTraversal(
  eachTraversal.filter(n => n % 2 === 0),
  n => n * 2,
  numbers
);
// Non-matching values automatically pass through unchanged
```

## Type Safety

### Preserved Type Inference

Filtering preserves full type safety:

```typescript
// Type inference works correctly
const filteredTraversal = eachTraversal.filter(n => n > 5);
const filteredNumbers = collect(filteredTraversal, numbers);
// TypeScript knows filteredNumbers is number[]

// Type inference preserved after complex filtering
const complexFiltered = usersLens
  .then(each())
  .then(profileLens)
  .then(nameLens)
  .filter(name => name.length > 4);
const complexResult = collect(complexFiltered, data);
// TypeScript knows complexResult is string[]
```

### Cross-Kind Type Safety

```typescript
// Filtering works with all optic kinds
const lensFiltered = someLens.filter(value => value > 10);
const prismFiltered = somePrism.filter(value => value.isValid);
const optionalFiltered = someOptional.filter(value => value !== null);
// All preserve correct type inference
```

## Mathematical Properties

### Traversal Laws Preservation

Filtering doesn't break traversal laws — it simply reduces the visited set:

```typescript
// Identity law preserved
const identityFiltered = traversal.filter(pred);
const identityResult = overTraversal(identityFiltered, x => x, data);
// identityResult equals data for matching elements

// Composition law preserved
const composedFiltered = traversal1.then(traversal2).filter(pred);
const separateFiltered = traversal1.filter(pred1).then(traversal2.filter(pred2));
// Both approaches yield equivalent results
```

### Non-Destructive Nature

```typescript
// Unmatched elements pass through unchanged
const filtered = traversal.filter(pred);
const result = overTraversal(filtered, transform, data);

// For any element a where pred(a) === false:
// result[a] === data[a] (unchanged)
```

## Performance Considerations

### Efficient Filtering

Filtering is designed for efficiency:

1. **Single Pass**: Filtering completes in a single pass through the data
2. **Lazy Evaluation**: Predicates are only evaluated when needed
3. **Minimal Allocation**: Reuses traversal instances where possible
4. **Early Termination**: Can terminate early for certain predicates

### Memory Usage

- **Minimal Overhead**: Filtering adds minimal memory overhead
- **Garbage Collection Friendly**: Immutable operations work well with GC
- **Streaming Support**: Can work with streaming data in ObservableLite

## Integration with Existing Optics

### Seamless Composition

Filtering integrates seamlessly with existing optics:

```typescript
// Works with all optic kinds
const lensFiltered = lens.filter(pred);
const prismFiltered = prism.filter(pred);
const optionalFiltered = optional.filter(pred);
const traversalFiltered = traversal.filter(pred);

// Works with automatic composition
const complexFiltered = usersLens
  .then(each())
  .then(profileLens)
  .then(nameLens)
  .filter(name => name.length > 4)
  .then(tagsLens);
```

### ObservableLite Integration

```typescript
const observable = ObservableLite.of(people);

// Filter in streams
const filteredObservable = observable.map(data => 
  overTraversal(
    each().then(nameLens).filter(name => name.length > 4),
    name => name.toUpperCase(),
    data
  )
);
```

## Error Handling

### Graceful Failure

Filtering handles errors gracefully:

```typescript
// Empty result from filtering
const noMatches = traversal.filter(n => n > 100);
const emptyResult = collect(noMatches, data);
// Result: []

// Over with empty filtered result
const unchangedData = overTraversal(noMatches, transform, data);
// Result: data (unchanged)
```

### Predicate Errors

```typescript
// Predicate errors are handled gracefully
try {
  const filtered = traversal.filter(predicateThatThrows);
  const result = collect(filtered, data);
} catch (error) {
  // Predicate errors are caught and handled
}
```

## Use Cases

### Common Patterns

1. **Conditional Transformations**: Transform only values matching criteria
2. **Data Validation**: Filter out invalid data before processing
3. **Staged Refinement**: Apply multiple filters for complex conditions
4. **Selective Updates**: Update only specific elements in collections
5. **Reactive Filtering**: Filter streaming data in ObservableLite

### Real-World Examples

```typescript
// Form validation - only validate fields with errors
const formErrors = formLens
  .then(each())
  .then(fieldLens)
  .then(errorLens)
  .filter(error => error !== null);

// User permissions - only process admin users
const adminUsers = usersLens
  .then(each())
  .then(roleLens)
  .filter(role => role === 'admin');

// Data normalization - only normalize valid data
const validData = dataLens
  .then(each())
  .filter(item => item.isValid)
  .then(normalizeLens);
```

## Advanced Features

### Custom Filtering Logic

```typescript
// Custom filtering for complex conditions
const complexFiltered = traversal.filter(item => {
  return item.isValid && 
         item.age >= 18 && 
         item.hasPermission('read');
});
```

### Performance Optimization

```typescript
// Optimized filtering for performance-critical code
const optimizedFiltered = traversal.filter(predicate);
// Uses internal optimizations for better performance
```

### Multiple Filter Strategies

```typescript
// Different filtering strategies
const positiveFiltered = traversal.filter(x => x > 0);
const negativeFiltered = traversal.filter(x => x < 0);
const zeroFiltered = traversal.filter(x => x === 0);

// Combine filters
const combinedFiltered = positiveFiltered.filter(x => x < 100);
```

This comprehensive filtering system provides powerful, type-safe, and efficient inline filtering capabilities that integrate seamlessly with the existing optics ecosystem, enabling selective data transformations with mathematical rigor and clean syntax. 