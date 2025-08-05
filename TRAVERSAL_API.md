# Unified Traversal API

This document describes the complete, unified Traversal API that combines chainable operations and terminal fold operations into a single cohesive system.

## Overview

The Unified Traversal API provides a complete functional programming toolkit for data transformation and aggregation. It combines:

- **Chainable Operations**: Return new Traversal instances for continued composition
- **Terminal Fold Operations**: Return concrete values, terminating the pipeline

All operations are type-safe, purity-tracked, and HKT-compatible.

## API Structure

### Chainable Operations
These operations return new Traversal instances, allowing continued chaining:

- `.map(fn)` - Transform elements
- `.filter(pred)` - Filter elements by predicate
- `.sortBy(fn)` - Sort elements by projection
- `.distinct()` - Remove duplicates
- `.take(n)` - Take first n elements
- `.drop(n)` - Drop first n elements
- `.slice(start, end)` - Slice elements by range
- `.reverse()` - Reverse element order

### Terminal Fold Operations
These operations return concrete values, terminating the pipeline:

- `.reduce(reducer, initial)` - General-purpose reduction
- `.foldMap(monoid, fn)` - Monoid-based aggregation
- `.all(predicate)` - Universal quantification (∀)
- `.any(predicate)` - Existential quantification (∃)

## Core Concepts

### Pipeline Pattern
The API follows a clear pipeline pattern:

```typescript
const result = traversal
  .map(x => x + 1)           // Chainable: transform
  .filter(x => x % 2 === 0)  // Chainable: filter
  .sortBy(x => x)            // Chainable: sort
  .reduce((sum, x) => sum + x, 0); // Terminal: aggregate
```

### Chainable vs Terminal Methods

**Chainable Methods:**
- Return new `Traversal` instances
- Can be composed indefinitely
- Preserve type parameters for HKT compatibility
- Marked as `Pure` in the purity system

**Terminal Methods:**
- Return concrete values (not Traversals)
- Terminate the pipeline
- Cannot be chained further
- Also marked as `Pure`

## Chainable Operations

### `.map(fn)`

Transforms each element using the provided function.

**Signature:**
```typescript
map<C>(fn: (a: A) => C): Traversal<S, T, C, C>
```

**Example:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const eachTraversal = each();

const doubled = eachTraversal.map(n => n * 2);
const result = collect(doubled, numbers);
// Result: [2, 4, 6, 8, 10]
```

### `.filter(pred)`

Filters elements based on a predicate function.

**Signature:**
```typescript
filter(pred: (a: A) => boolean): Traversal<S, T, A, B>
```

**Example:**
```typescript
const evenNumbers = eachTraversal.filter(n => n % 2 === 0);
const result = collect(evenNumbers, numbers);
// Result: [2, 4]
```

### `.sortBy(fn)`

Sorts elements by a projection function.

**Signature:**
```typescript
sortBy<U>(fn: (a: A) => U): Traversal<S, T, A, B>
```

**Example:**
```typescript
const people = [
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
];

const sortedByAge = eachTraversal.sortBy(person => person.age);
const result = collect(sortedByAge, people);
// Result: [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]
```

### `.distinct()`

Removes duplicate elements while preserving first occurrence order.

**Signature:**
```typescript
distinct(): Traversal<S, T, A, B>
```

**Example:**
```typescript
const duplicateNumbers = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4];
const uniqueNumbers = eachTraversal.distinct();
const result = collect(uniqueNumbers, duplicateNumbers);
// Result: [1, 2, 3, 4]
```

### `.take(n)`

Takes only the first `n` elements.

**Signature:**
```typescript
take(count: number): Traversal<S, T, A, B>
```

**Example:**
```typescript
const firstThree = eachTraversal.take(3);
const result = collect(firstThree, numbers);
// Result: [1, 2, 3]
```

### `.drop(n)`

Drops the first `n` elements.

**Signature:**
```typescript
drop(count: number): Traversal<S, T, A, B>
```

**Example:**
```typescript
const afterFirstTwo = eachTraversal.drop(2);
const result = collect(afterFirstTwo, numbers);
// Result: [3, 4, 5]
```

### `.slice(start, end)`

Slices elements by range, similar to `Array.prototype.slice`.

**Signature:**
```typescript
slice(start: number, end?: number): Traversal<S, T, A, B>
```

**Example:**
```typescript
const middleSlice = eachTraversal.slice(1, 4);
const result = collect(middleSlice, numbers);
// Result: [2, 3, 4]
```

### `.reverse()`

Reverses the order of elements.

**Signature:**
```typescript
reverse(): Traversal<S, T, A, B>
```

**Example:**
```typescript
const reversed = eachTraversal.reverse();
const result = collect(reversed, numbers);
// Result: [5, 4, 3, 2, 1]
```

## Terminal Fold Operations

### `.reduce(reducer, initial)`

Reduces all elements using a reducer function.

**Signature:**
```typescript
reduce<R>(reducer: (acc: R, a: A) => R, initial: R): (source: S) => R
```

**Example:**
```typescript
const sumReducer = (acc, n) => acc + n;
const total = eachTraversal.reduce(sumReducer, 0)(numbers);
// Result: 15
```

### `.foldMap(monoid, fn)`

Maps each element to a monoid value and combines them.

**Signature:**
```typescript
foldMap<M>(monoid: Monoid<M>, fn: (a: A) => M): (source: S) => M
```

**Example:**
```typescript
const sumMonoid = {
  empty: () => 0,
  concat: (a, b) => a + b
};

const total = eachTraversal.foldMap(sumMonoid, n => n)(numbers);
// Result: 15
```

### `.all(predicate)`

Returns `true` if all elements satisfy the predicate.

**Signature:**
```typescript
all(predicate: (a: A) => boolean): (source: S) => boolean
```

**Example:**
```typescript
const allPositive = eachTraversal.all(n => n > 0)(numbers);
// Result: true
```

### `.any(predicate)`

Returns `true` if any element satisfies the predicate.

**Signature:**
```typescript
any(predicate: (a: A) => boolean): (source: S) => boolean
```

**Example:**
```typescript
const anyEven = eachTraversal.any(n => n % 2 === 0)(numbers);
// Result: true
```

## Pipeline Examples

### Basic Pipeline
```typescript
const result = eachTraversal
  .map(n => n * 2)
  .filter(n => n % 4 === 0)
  .sortBy(n => n)
  .distinct()
  .take(3)
  .reverse()
  .reduce((sum, n) => sum + n, 0)(numbers);
// Result: 24 (sum of [12, 8, 4])
```

### Complex Pipeline with People
```typescript
const people = [
  { name: 'Alice', age: 25, salary: 50000 },
  { name: 'Bob', age: 30, salary: 60000 },
  { name: 'Charlie', age: 35, salary: 70000 },
  { name: 'David', age: 40, salary: 80000 },
  { name: 'Eve', age: 45, salary: 90000 }
];

const result = eachTraversal
  .filter(person => person.age > 30)
  .sortBy(person => person.salary)
  .distinct()
  .take(3)
  .reverse()
  .reduce((sum, person) => sum + person.age, 0)(people);
// Result: 120 (sum of ages for filtered, sorted, distinct, taken, reversed people)
```

### Multiple Fold Operations
```typescript
const filteredTraversal = eachTraversal.filter(n => n % 2 === 0);

const evenSum = filteredTraversal.reduce((sum, n) => sum + n, 0)(numbers);
const evenAll = filteredTraversal.all(n => n > 0)(numbers);
const evenAny = filteredTraversal.any(n => n > 8)(numbers);
const evenProduct = filteredTraversal.foldMap(ProductMonoid, n => n)(numbers);
```

## Common Monoids

The API provides several built-in monoids:

```typescript
const SumMonoid = {
  empty: () => 0,
  concat: (a, b) => a + b
};

const ProductMonoid = {
  empty: () => 1,
  concat: (a, b) => a * b
};

const StringMonoid = {
  empty: () => '',
  concat: (a, b) => a + b
};

const ArrayMonoid = () => ({
  empty: () => [],
  concat: (a, b) => [...a, ...b]
});

const AnyMonoid = {
  empty: () => false,
  concat: (a, b) => a || b
};

const AllMonoid = {
  empty: () => true,
  concat: (a, b) => a && b
};
```

## Edge Cases

### Empty Traversals
```typescript
const emptyTraversal = eachTraversal.filter(n => n > 100);

const emptyReduce = emptyTraversal.reduce((sum, n) => sum + n, 0)(numbers);
// Result: 0 (returns initial value)

const emptyAll = emptyTraversal.all(n => n > 0)(numbers);
// Result: true (vacuous truth)

const emptyAny = emptyTraversal.any(n => n > 0)(numbers);
// Result: false
```

### Single Element
```typescript
const singleElement = [42];

const singleReduce = eachTraversal.reduce((sum, n) => sum + n, 0)(singleElement);
// Result: 42

const singleAll = eachTraversal.all(n => n > 40)(singleElement);
// Result: true

const singleAny = eachTraversal.any(n => n < 50)(singleElement);
// Result: true
```

## Type Safety

All operations preserve type inference:

```typescript
// Type inference for chainable operations
const mapped: Traversal<number[], number[], string, string> = 
  eachTraversal.map(n => n.toString());

// Type inference for terminal operations
const sum: number = eachTraversal.reduce((acc, n) => acc + n, 0)(numbers);
const allPositive: boolean = eachTraversal.all(n => n > 0)(numbers);
```

## Purity Guarantees

All operations are marked as `Pure` in the purity tracking system:

- **Chainable operations**: Pure transformations that don't cause side effects
- **Terminal operations**: Pure aggregations that don't cause side effects

## HKT Integration

The API integrates seamlessly with the Higher-Kinded Types system:

- Chainable operations preserve Kind parameters
- Terminal operations maintain type safety
- Composition with other optics works correctly

## Performance Considerations

- **Lazy evaluation**: Operations are applied only when needed
- **Immutable updates**: All operations preserve immutability
- **Efficient composition**: Internal optimizations for common patterns

## Best Practices

### Pipeline Design
```typescript
// Good: Clear pipeline with logical flow
const result = eachTraversal
  .filter(person => person.age >= 18)
  .sortBy(person => person.salary)
  .take(10)
  .reduce((sum, person) => sum + person.salary, 0)(people);

// Avoid: Overly complex chains
const result = eachTraversal
  .map(n => n * 2)
  .filter(n => n % 2 === 0)
  .map(n => n / 2)
  .filter(n => n > 0)
  .reduce((sum, n) => sum + n, 0)(numbers);
```

### Monoid Usage
```typescript
// Good: Use appropriate monoids for aggregation
const totalSalary = eachTraversal.foldMap(SumMonoid, person => person.salary)(people);
const allNames = eachTraversal.foldMap(StringMonoid, person => person.name + ', ')(people);

// Avoid: Manual reduction when monoid exists
const totalSalary = eachTraversal.reduce((sum, person) => sum + person.salary, 0)(people);
```

### Error Handling
```typescript
// Good: Handle edge cases explicitly
const safeAverage = eachTraversal
  .filter(n => !isNaN(n))
  .reduce((sum, n) => sum + n, 0)(numbers) / numbers.length;

// Avoid: Assuming data is always valid
const average = eachTraversal.reduce((sum, n) => sum + n, 0)(numbers) / numbers.length;
```

## Summary

The Unified Traversal API provides a complete, cohesive system for data transformation and aggregation:

- **Chainable operations** enable complex data pipelines
- **Terminal fold operations** provide powerful aggregation capabilities
- **Type safety** ensures correctness at compile time
- **Purity tracking** guarantees predictable behavior
- **HKT integration** enables composition with other optics

This unified approach makes the Traversal API both powerful and ergonomic for real-world functional programming applications. 