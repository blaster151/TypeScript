# Traversals Slice Documentation

## Overview

The Traversal system now supports `.slice(start, end)` as a one-shot range-selection operator that combines the functionality of `.drop()` and `.take()`. This method behaves like `Array.prototype.slice` but operates within an optic pipeline, allowing selective transformation of data based on position ranges.

## Core Features

### One-Shot Range Selection

Traversals can be sliced inline before mapping/traversing:

```typescript
// Slice from index 2 to end
const slice2Traversal = numberTraversal.slice(2);

// Slice from index 2 to 4 (exclusive)
const slice2To4Traversal = numberTraversal.slice(2, 4);

// Slice with negative indices
const sliceNegativeTraversal = peopleTraversal.then(nameTraversal).slice(1, -1);
```

### Non-Destructive Slicing

Slicing is non-destructive — elements outside the slice pass through unchanged:

```typescript
// Only numbers from index 2 to 4 are transformed, rest remain unchanged
const transformedSlice = overTraversal(slice2To4Traversal, n => n * 10, numbers);
// Result: [1, 2, 30, 40, 5, 6, 7, 8, 9, 10]
```

## `sliceTraversal` Utility

The `sliceTraversal` function provides the foundation for range selection:

```typescript
function sliceTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  start: number,
  end?: number
): Traversal<S, T, A, B>
```

**Features**:
- Slices a range of elements from a traversal
- Combines drop and take operations efficiently
- Preserves HKT + purity metadata
- Maintains traversal laws
- Handles negative indices correctly
- Supports optional end parameter

## `.slice(start, end)` Method

### Traversal Interface Extension

```typescript
interface Traversal<S, T, A, B> {
  slice(start: number, end?: number): Traversal<S, T, A, B>;
}
```

### Implementation

```typescript
slice(start, end) {
  return sliceTraversal(this, start, end);
}
```

## Slice Examples

### Basic Slicing

```typescript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const eachTraversal = each();

// Slice from index 2 to end
const slice2Traversal = eachTraversal.slice(2);

// Collect numbers after first 2
const afterFirst2 = collect(slice2Traversal, numbers);
// Result: [3, 4, 5, 6, 7, 8, 9, 10]

// Transform numbers after first 2
const doubledAfter2 = overTraversal(slice2Traversal, n => n * 2, numbers);
// Result: [1, 2, 6, 8, 10, 12, 14, 16, 18, 20]

// Slice from index 2 to 4 (exclusive)
const slice2To4Traversal = eachTraversal.slice(2, 4);

// Collect numbers from index 2 to 4
const slice2To4Result = collect(slice2To4Traversal, numbers);
// Result: [3, 4]

// Transform numbers from index 2 to 4
const transformedSlice2To4 = overTraversal(slice2To4Traversal, n => n * 10, numbers);
// Result: [1, 2, 30, 40, 5, 6, 7, 8, 9, 10]
```

### Slice Inside `.then(...)` Chain

```typescript
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 },
  { name: 'David', age: 40 },
  { name: 'Eve', age: 45 },
  { name: 'Frank', age: 50 }
];

const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);

const nameTraversal = each().then(nameLens);

// Slice names from index 1 to 3
const slice1To3Names = nameTraversal.slice(1, 3);

// Collect names from index 1 to 3
const selectedNames = collect(slice1To3Names, people);
// Result: ['Bob', 'Charlie']

// Transform names from index 1 to 3
const upperCaseSelectedNames = overTraversal(slice1To3Names, name => name.toUpperCase(), people);
// Result: [{ name: 'Alice', age: 25 }, { name: 'BOB', age: 30 }, { name: 'CHARLIE', age: 35 }, ...]
```

### Complex Nested Operations

```typescript
const data = {
  users: [
    { id: 1, profile: { name: 'Alice', tags: ['dev', 'admin'] } },
    { id: 2, profile: { name: 'Bob', tags: ['user'] } },
    { id: 3, profile: { name: 'Charlie', tags: ['dev', 'user'] } },
    { id: 4, profile: { name: 'David', tags: ['admin'] } },
    { id: 5, profile: { name: 'Eve', tags: ['dev'] } }
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

// Complex operation: users → each → profile → name → slice 1 to 3
const complexSliceTraversal = usersLens
  .then(each())
  .then(profileLens)
  .then(nameLens)
  .slice(1, 3);

const complexSliceResult = collect(complexSliceTraversal, data);
// Result: ['Bob', 'Charlie']
```

## Edge Cases and Error Handling

### Edge Cases

```typescript
// Slice from index 0
const slice0Traversal = eachTraversal.slice(0);
const slice0Result = collect(slice0Traversal, numbers);
// Result: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] (all numbers)

// Slice from index 0 to 5
const slice0To5Traversal = eachTraversal.slice(0, 5);
const slice0To5Result = collect(slice0To5Traversal, numbers);
// Result: [1, 2, 3, 4, 5] (first 5 numbers)

// Slice from end
const sliceEndTraversal = eachTraversal.slice(8);
const sliceEndResult = collect(sliceEndTraversal, numbers);
// Result: [9, 10] (last 2 numbers)

// Slice to end
const sliceEndToEndTraversal = eachTraversal.slice(8, 10);
const sliceEndToEndResult = collect(sliceEndToEndTraversal, numbers);
// Result: [9, 10] (last 2 numbers)
```

### Negative Indices

```typescript
// Negative start (treated as 0)
const sliceNegativeStart = eachTraversal.slice(-3);
const sliceNegativeStartResult = collect(sliceNegativeStart, numbers);
// Result: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] (all numbers)

// Negative end (count from end)
const sliceNegativeEnd = eachTraversal.slice(2, -1);
const sliceNegativeEndResult = collect(sliceNegativeEnd, numbers);
// Result: [3, 4, 5, 6, 7, 8, 9] (from index 2 to second-to-last)

// Both negative
const sliceBothNegative = eachTraversal.slice(-3, -1);
const sliceBothNegativeResult = collect(sliceBothNegative, numbers);
// Result: [8, 9] (third-to-last to second-to-last)
```

## Before vs After Comparison

### Before (Manual Drop and Take)

```typescript
// Manual approach requires separate drop and take operations
const manualSlice = eachTraversal.drop(2).take(2);
const manualSliceResult = collect(manualSlice, numbers);
// Result: [3, 4]
```

### After (Fluent `.slice()`)

```typescript
// Clean, declarative approach
const automaticSlice = eachTraversal.slice(2, 4);
const automaticSliceResult = collect(automaticSlice, numbers);
// Result: [3, 4]
```

## Type Safety

### Preserved Type Inference

Slice preserves full type safety:

```typescript
// Type inference works correctly
const slice2To4Traversal = eachTraversal.slice(2, 4);
const slice2To4Numbers = collect(slice2To4Traversal, numbers);
// TypeScript knows slice2To4Numbers is number[]

// Type inference preserved after complex slicing
const complexSliced = usersLens
  .then(each())
  .then(profileLens)
  .then(nameLens)
  .slice(1, 3);
const complexResult = collect(complexSliced, data);
// TypeScript knows complexResult is string[]
```

### Cross-Kind Type Safety

```typescript
// Slice works with all optic kinds
const lensSliced = someLens.slice(1, 3);
const prismSliced = somePrism.slice(0, 2);
const optionalSliced = someOptional.slice(1);
// All preserve correct type inference
```

## Mathematical Properties

### Traversal Laws Preservation

Slice doesn't break traversal laws — it simply reduces the visited set:

```typescript
// Identity law preserved
const identitySliced = traversal.slice(2, 4);
const identityResult = overTraversal(identitySliced, x => x, data);
// identityResult equals data for matching elements

// Composition law preserved
const composedSliced = traversal1.then(traversal2).slice(1, 3);
const separateSliced = traversal1.slice(1, 3).then(traversal2.slice(1, 3));
// Both approaches yield equivalent results
```

### Non-Destructive Nature

```typescript
// Elements outside the slice pass through unchanged
const sliced = traversal.slice(2, 4);
const result = overTraversal(sliced, transform, data);

// For any element a outside the slice:
// result[a] === data[a] (unchanged)
```

## Performance Considerations

### Efficient Slicing

Slice is designed for efficiency:

1. **Single Pass**: Slicing completes in a single pass through the data
2. **Minimal Allocation**: Reuses traversal instances where possible
3. **Early Termination**: Can terminate early for certain slice operations
4. **Index-Based**: Uses efficient index-based operations

### Memory Usage

- **Minimal Overhead**: Slicing adds minimal memory overhead
- **Garbage Collection Friendly**: Immutable operations work well with GC
- **Streaming Support**: Can work with streaming data in ObservableLite

## Integration with Existing Optics

### Seamless Composition

Slice integrates seamlessly with existing optics:

```typescript
// Works with all optic kinds
const lensSliced = lens.slice(1, 3);
const prismSliced = prism.slice(0, 2);
const optionalSliced = optional.slice(1);
const traversalSliced = traversal.slice(2, 4);

// Works with automatic composition
const complexSliced = usersLens
  .then(each())
  .then(profileLens)
  .then(nameLens)
  .slice(1, 3)
  .filter(name => name.length > 3);
```

### ObservableLite Integration

```typescript
const observable = ObservableLite.of(people);

// Slice in streams
const slicedObservable = observable.map(data => 
  overTraversal(
    each().then(nameLens).slice(1, 3),
    name => name.toUpperCase(),
    data
  )
);
```

## Chaining with Other Operations

### Chaining with `.filter(...)`

```typescript
// Filter first, then slice
const evenTraversal = eachTraversal.filter(n => n % 2 === 0);
const evenSlice1To3 = evenTraversal.slice(1, 3);

const evenSlice1To3Result = collect(evenSlice1To3, numbers);
// Result: [4, 6] (second and third even numbers)
```

### Chaining with `.take()` and `.drop()`

```typescript
// Slice can be combined with take and drop
const complexChain = traversal
  .filter(pred)
  .slice(1, 5)
  .drop(1)
  .take(2);
```

## Use Cases

### Common Patterns

1. **Range Selection**: Select a specific range of elements
2. **Pagination**: Slice for pagination with start/end indices
3. **Window Operations**: Slice for sliding windows
4. **Selective Processing**: Process only a subset of data
5. **Batch Operations**: Process data in batches

### Real-World Examples

```typescript
// Pagination - slice first 10 users
const first10Users = usersLens
  .then(each())
  .slice(0, 10);

// Skip header and footer in CSV data
const dataRows = csvDataLens
  .then(each())
  .slice(1, -1);

// Process only middle section
const middleSection = itemsLens
  .then(each())
  .slice(10, 20);

// Sliding window - process 3 items at a time
const window1 = itemsLens.then(each()).slice(0, 3);
const window2 = itemsLens.then(each()).slice(3, 6);
const window3 = itemsLens.then(each()).slice(6, 9);
```

## Advanced Features

### Custom Slicing Logic

```typescript
// Custom slicing for complex conditions
const customSlice = traversal
  .filter(item => item.isValid)
  .slice(5, 15);
```

### Performance Optimization

```typescript
// Optimized slicing for performance-critical code
const optimizedSlice = traversal.slice(0, 100);
// Uses internal optimizations for better performance
```

### Multiple Slice Strategies

```typescript
// Different slicing strategies
const firstHalf = traversal.slice(0, Math.floor(data.length / 2));
const secondHalf = traversal.slice(Math.floor(data.length / 2));
const middle = traversal.slice(10, -10);

// Combine slices
const combinedSlice = firstHalf.slice(0, 5);
```

## Integration Notes

### Array-like Behavior

Slice behaves like `Array.prototype.slice` but within an optic pipeline:

```typescript
// Array-like slicing
const arraySlice = array.slice(2, 5); // [3, 4, 5]

// Traversal slicing
const traversalSlice = traversal.slice(2, 5);
const sliceResult = collect(traversalSlice, data); // [3, 4, 5]
```

### Law Preservation

Slice preserves traversal laws:

```typescript
// Non-matching positions pass through untouched
const sliced = traversal.slice(2, 4);
const result = overTraversal(sliced, transform, data);
// Elements outside index 2-4 remain unchanged
```

### Composition Rules

Can be combined with `.filter(...)`, `.map(...)`, and `.then(...)` freely:

```typescript
// Free composition
const complex = traversal
  .filter(pred)
  .slice(5, 15)
  .then(otherOptic)
  .filter(otherPred);
```

### Equivalence to Drop and Take

Slice is equivalent to combining drop and take operations:

```typescript
// These are equivalent:
const sliceResult = traversal.slice(2, 4);
const dropTakeResult = traversal.drop(2).take(2);

// Both produce the same result
assertEqual(collect(sliceResult, data), collect(dropTakeResult, data));
```

This comprehensive slice system provides powerful, type-safe, and efficient range-selection capabilities that integrate seamlessly with the existing optics ecosystem, enabling selective data transformations based on position ranges with mathematical rigor and clean syntax. 