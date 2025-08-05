# ObservableLite Traversal API

This document describes the ObservableLite Traversal API, which extends ObservableLite with unified Traversal methods for fluent chaining without `.pipe()`, while preserving purity/HKT integration and ADT compatibility.

## Overview

The ObservableLite Traversal API provides seamless integration between reactive streams and functional programming patterns by implementing the same unified Traversal API methods directly on ObservableLite instances. This enables:

- **Fluent chaining** without `.pipe()` syntax
- **Consistent API** across Traversal and ObservableLite
- **Purity tracking** with Async effect tagging
- **HKT integration** for type-safe composition
- **Optics integration** for structured data transformation

## API Structure

### Chainable Operations
These operations return new ObservableLite instances for continued chaining:

- `.map(fn)` / `.map(optic, fn)` - Transform values or focused parts
- `.filter(pred)` - Filter values by predicate
- `.sortBy(fn)` - Sort values by projection
- `.distinct()` - Remove duplicate values
- `.take(n)` - Take first n values
- `.drop(n)` - Drop first n values
- `.slice(start, end)` - Slice values by range
- `.reverse()` - Reverse value order

### Terminal Fold Operations
These operations return Promises that resolve to concrete values:

- `.reduce(reducer, initial)` - General-purpose reduction
- `.foldMap(monoid, fn)` - Monoid-based aggregation
- `.all(predicate)` - Universal quantification (∀)
- `.any(predicate)` - Existential quantification (∃)
- `.toArray()` - Collect all values into array

## Core Concepts

### Fluent Chaining Pattern
The API follows a clear fluent chaining pattern:

```typescript
const result = await observable
  .map(x => x * 2)           // Chainable: transform
  .filter(x => x % 2 === 0)  // Chainable: filter
  .sortBy(x => x)            // Chainable: sort
  .reduce((sum, x) => sum + x, 0); // Terminal: aggregate
```

### Chainable vs Terminal Methods

**Chainable Methods:**
- Return new `ObservableLite` instances
- Can be composed indefinitely
- Preserve type parameters for HKT compatibility
- Marked as `Async` in the purity system

**Terminal Methods:**
- Return `Promise<T>` for async resolution
- Terminate the pipeline
- Cannot be chained further
- Also marked as `Async`

## Chainable Operations

### `.map(fn)`

Transforms each value using the provided function.

**Signature:**
```typescript
map<B>(f: (a: A) => B): ObservableLite<B>
```

**Example:**
```typescript
const numbers = ObservableLite.fromArray([1, 2, 3, 4, 5]);
const doubled = numbers.map(n => n * 2);
const result = await doubled.toArray();
// Result: [2, 4, 6, 8, 10]
```

### `.map(optic, fn)`

Transforms values using an optic (Lens, Prism, or Optional).

**Signature:**
```typescript
map<B>(optic: Lens<A, A, B, B> | Prism<A, A, B, B> | Optional<A, A, B, B>, fn: (b: B) => B): ObservableLite<A>
```

**Example:**
```typescript
const people = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

const nameLens = lens(
  person => person.name,
  (name, person) => ({ ...person, name })
);

const upperNames = people.map(nameLens, name => name.toUpperCase());
const result = await upperNames.toArray();
// Result: [{ name: 'ALICE', age: 25 }, { name: 'BOB', age: 30 }]
```

### `.filter(pred)`

Filters values based on a predicate function.

**Signature:**
```typescript
filter(pred: (a: A) => boolean): ObservableLite<A>
```

**Example:**
```typescript
const evenNumbers = numbers.filter(n => n % 2 === 0);
const result = await evenNumbers.toArray();
// Result: [2, 4]
```

### `.sortBy(fn)`

Sorts values by a projection function.

**Signature:**
```typescript
sortBy<U>(fn: (a: A) => U): ObservableLite<A>
```

**Example:**
```typescript
const people = ObservableLite.fromArray([
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

const sortedByAge = people.sortBy(person => person.age);
const result = await sortedByAge.toArray();
// Result: [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]
```

### `.distinct()`

Removes duplicate values while preserving first occurrence order.

**Signature:**
```typescript
distinct(): ObservableLite<A>
```

**Example:**
```typescript
const duplicateNumbers = ObservableLite.fromArray([1, 2, 2, 3, 3, 3, 4, 4, 4, 4]);
const uniqueNumbers = duplicateNumbers.distinct();
const result = await uniqueNumbers.toArray();
// Result: [1, 2, 3, 4]
```

### `.take(n)`

Takes only the first `n` values.

**Signature:**
```typescript
take(count: number): ObservableLite<A>
```

**Example:**
```typescript
const firstThree = numbers.take(3);
const result = await firstThree.toArray();
// Result: [1, 2, 3]
```

### `.drop(n)`

Drops the first `n` values.

**Signature:**
```typescript
drop(count: number): ObservableLite<A>
```

**Example:**
```typescript
const afterFirstTwo = numbers.drop(2);
const result = await afterFirstTwo.toArray();
// Result: [3, 4, 5]
```

### `.slice(start, end)`

Slices values by range, similar to `Array.prototype.slice`.

**Signature:**
```typescript
slice(start: number, end?: number): ObservableLite<A>
```

**Example:**
```typescript
const middleSlice = numbers.slice(1, 4);
const result = await middleSlice.toArray();
// Result: [2, 3, 4]
```

### `.reverse()`

Reverses the order of values.

**Signature:**
```typescript
reverse(): ObservableLite<A>
```

**Example:**
```typescript
const reversed = numbers.reverse();
const result = await reversed.toArray();
// Result: [5, 4, 3, 2, 1]
```

## Terminal Fold Operations

### `.reduce(reducer, initial)`

Reduces all values to a single result.

**Signature:**
```typescript
reduce<R>(reducer: (acc: R, value: A) => R, initial: R): Promise<R>
```

**Example:**
```typescript
const sumReducer = (acc, n) => acc + n;
const total = await numbers.reduce(sumReducer, 0);
// Result: 15
```

### `.foldMap(monoid, fn)`

Maps each value to a monoid value and combines them.

**Signature:**
```typescript
foldMap<M>(monoid: Monoid<M>, fn: (a: A) => M): Promise<M>
```

**Example:**
```typescript
const sumMonoid = {
  empty: () => 0,
  concat: (a, b) => a + b
};

const total = await numbers.foldMap(sumMonoid, n => n);
// Result: 15
```

### `.all(predicate)`

Returns `true` if all values satisfy the predicate.

**Signature:**
```typescript
all(predicate: (a: A) => boolean): Promise<boolean>
```

**Example:**
```typescript
const allPositive = await numbers.all(n => n > 0);
// Result: true
```

### `.any(predicate)`

Returns `true` if any value satisfies the predicate.

**Signature:**
```typescript
any(predicate: (a: A) => boolean): Promise<boolean>
```

**Example:**
```typescript
const anyEven = await numbers.any(n => n % 2 === 0);
// Result: true
```

### `.toArray()`

Collects all values into an array.

**Signature:**
```typescript
toArray(): Promise<A[]>
```

**Example:**
```typescript
const array = await numbers.toArray();
// Result: [1, 2, 3, 4, 5]
```

## Pipeline Examples

### Basic Pipeline
```typescript
const result = await observable
  .map(n => n * 2)
  .filter(n => n % 4 === 0)
  .sortBy(n => n)
  .distinct()
  .take(3)
  .reverse()
  .reduce((sum, n) => sum + n, 0);
// Result: 24 (sum of [12, 8, 4])
```

### Complex Pipeline with People
```typescript
const people = ObservableLite.fromArray([
  { name: 'Alice', age: 25, salary: 50000 },
  { name: 'Bob', age: 30, salary: 60000 },
  { name: 'Charlie', age: 35, salary: 70000 },
  { name: 'David', age: 40, salary: 80000 },
  { name: 'Eve', age: 45, salary: 90000 }
]);

const result = await people
  .filter(person => person.age > 30)
  .sortBy(person => person.salary)
  .distinct()
  .take(3)
  .reverse()
  .reduce((sum, person) => sum + person.age, 0);
// Result: 120 (sum of ages for filtered, sorted, distinct, taken, reversed people)
```

### Multiple Fold Operations
```typescript
const filteredObs = observable.filter(n => n % 2 === 0);

const evenSum = await filteredObs.reduce((sum, n) => sum + n, 0);
const evenAll = await filteredObs.all(n => n > 0);
const evenAny = await filteredObs.any(n => n > 8);
const evenProduct = await filteredObs.foldMap(ProductMonoid, n => n);
```

## Optics Integration

### Lens Integration
```typescript
const nameLens = lens(
  person => person.name,
  (name, person) => ({ ...person, name })
);

const upperNames = people.map(nameLens, name => name.toUpperCase());
const result = await upperNames.toArray();
```

### Prism Integration
```typescript
const rightPrism = prism(
  either => either.tag === 'Right' ? Left(either.value) : Right(either),
  value => Right(value)
);

const rightValues = eithers.map(rightPrism, value => value * 2);
const result = await rightValues.toArray();
```

## Comparison with RxJS

### Before (RxJS with .pipe())
```typescript
import { from } from 'rxjs';
import { map, filter, reduce } from 'rxjs/operators';

const result = await from([1, 2, 3, 4, 5])
  .pipe(
    map(x => x * 2),
    filter(x => x % 2 === 0),
    reduce((sum, x) => sum + x, 0)
  )
  .toPromise();
```

### After (ObservableLite Traversal API)
```typescript
import { ObservableLite } from './fp-observable-lite';

const result = await ObservableLite.fromArray([1, 2, 3, 4, 5])
  .map(x => x * 2)
  .filter(x => x % 2 === 0)
  .reduce((sum, x) => sum + x, 0);
```

## Purity Guarantees

All operations are marked as `Async` in the purity tracking system:

- **Chainable operations**: Async transformations that don't cause side effects
- **Terminal operations**: Async aggregations that don't cause side effects
- **Optics integration**: Pure transformations applied to stream values

## HKT Integration

The API integrates seamlessly with the Higher-Kinded Types system:

- Chainable operations preserve Kind parameters
- Terminal operations maintain type safety
- Composition with other optics works correctly
- ObservableLiteK kind is properly registered

## Error Handling

### Promise Rejection
```typescript
try {
  const result = await observable
    .map(x => x * 2)
    .reduce((sum, x) => sum + x, 0);
} catch (error) {
  // Handle error from observable
  console.error('Observable error:', error);
}
```

### Error Propagation
```typescript
const errorObs = new ObservableLite((observer) => {
  observer.next(1);
  observer.next(2);
  observer.error(new Error('Test error'));
  return () => {};
});

try {
  await errorObs.reduce((sum, n) => sum + n, 0);
} catch (error) {
  // Error is properly propagated
  console.log('Error caught:', error.message);
}
```

## Async Behavior

### Handling Async Emissions
```typescript
const asyncObs = new ObservableLite((observer) => {
  setTimeout(() => observer.next(1), 10);
  setTimeout(() => observer.next(2), 20);
  setTimeout(() => observer.next(3), 30);
  setTimeout(() => observer.complete(), 40);
  return () => {};
});

const result = await asyncObs
  .map(n => n * 2)
  .filter(n => n > 2)
  .toArray();
// Result: [4, 6]
```

## Edge Cases

### Empty Observables
```typescript
const emptyObs = observable.filter(n => n > 100);

const emptyReduce = await emptyObs.reduce((sum, n) => sum + n, 0);
// Result: 0 (returns initial value)

const emptyAll = await emptyObs.all(n => n > 0);
// Result: true (vacuous truth)

const emptyAny = await emptyObs.any(n => n > 0);
// Result: false
```

### Single Element
```typescript
const singleElement = ObservableLite.fromArray([42]);

const singleReduce = await singleElement.reduce((sum, n) => sum + n, 0);
// Result: 42

const singleAll = await singleElement.all(n => n > 40);
// Result: true

const singleAny = await singleElement.any(n => n < 50);
// Result: true
```

## Type Safety

All operations preserve type inference:

```typescript
// Type inference for chainable operations
const mapped: ObservableLite<string> = 
  observable.map(n => n.toString());

// Type inference for terminal operations
const sum: Promise<number> = observable.reduce((acc, n) => acc + n, 0);
const allPositive: Promise<boolean> = observable.all(n => n > 0);
```

## Performance Considerations

- **Lazy evaluation**: Operations are applied only when subscribed to
- **Immutable updates**: All operations preserve immutability
- **Efficient composition**: Internal optimizations for common patterns
- **Memory management**: Proper cleanup of subscriptions

## Best Practices

### Pipeline Design
```typescript
// Good: Clear pipeline with logical flow
const result = await observable
  .filter(person => person.age >= 18)
  .sortBy(person => person.salary)
  .take(10)
  .reduce((sum, person) => sum + person.salary, 0);

// Avoid: Overly complex chains
const result = await observable
  .map(n => n * 2)
  .filter(n => n % 2 === 0)
  .map(n => n / 2)
  .filter(n => n > 0)
  .reduce((sum, n) => sum + n, 0);
```

### Error Handling
```typescript
// Good: Handle errors explicitly
try {
  const result = await observable
    .filter(n => !isNaN(n))
    .reduce((sum, n) => sum + n, 0);
} catch (error) {
  console.error('Processing error:', error);
}

// Avoid: Assuming data is always valid
const result = await observable.reduce((sum, n) => sum + n, 0);
```

### Optics Usage
```typescript
// Good: Use optics for structured data
const result = await people
  .map(nameLens, name => name.toUpperCase())
  .map(ageLens, age => age + 1)
  .toArray();

// Avoid: Manual property access
const result = await people
  .map(person => ({ ...person, name: person.name.toUpperCase() }))
  .map(person => ({ ...person, age: person.age + 1 }))
  .toArray();
```

## Summary

The ObservableLite Traversal API provides a complete, cohesive system for reactive functional programming:

- **Fluent chaining** enables complex data pipelines without `.pipe()`
- **Terminal fold operations** provide powerful aggregation capabilities
- **Optics integration** enables structured data transformation
- **Type safety** ensures correctness at compile time
- **Purity tracking** guarantees predictable behavior
- **HKT integration** enables composition with other functional abstractions

This unified approach makes ObservableLite both powerful and ergonomic for real-world reactive functional programming applications, providing a seamless bridge between reactive streams and functional programming patterns. 