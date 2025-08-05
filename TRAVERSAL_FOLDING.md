# Traversal Folding Operations

This document describes the fold/reduction helpers added to the Traversal API, enabling direct aggregation of values with type-safe, purity-tracked operations.

## Overview

Traversal folding operations allow you to aggregate values from traversals directly, terminating the chain and returning concrete values. These operations are:

- **Type-safe**: Preserve type inference for the aggregated result
- **Pure**: All operations are marked as `Pure` in the purity tracking system
- **Composable**: Work seamlessly with `.then(...)` composition before folding
- **Terminal**: Do not return another Traversal - they terminate the chain

## Core Fold Operations

### `.reduce(reducer, initial)`

Reduces all visited elements using a reducer function.

**Signature:**
```typescript
reduce(reducer: (acc: R, a: A) => R, initial: R): (source: S) => R
```

**Parameters:**
- `reducer`: Function that combines accumulated value with current element
- `initial`: Starting value for the reduction

**Returns:** A function that takes a source and returns the final reduced value

**Examples:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const eachTraversal = each();

// Sum all numbers
const sumReducer = (acc, n) => acc + n;
const total = eachTraversal.reduce(sumReducer, 0)(numbers);
// Result: 15

// Concatenate all numbers as strings
const stringReducer = (acc, n) => acc + n.toString();
const concatenated = eachTraversal.reduce(stringReducer, '')(numbers);
// Result: "12345"

// Sum ages of people
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const ageReducer = (acc, person) => acc + person.age;
const totalAge = eachTraversal.reduce(ageReducer, 0)(people);
// Result: 90
```

### `.foldMap(monoid, fn)`

Maps each visited element to a monoid value and combines them using the monoid's `concat` operation.

**Signature:**
```typescript
foldMap(monoid: Monoid<M>, fn: (a: A) => M): (source: S) => M
```

**Parameters:**
- `monoid`: A monoid instance with `empty()` and `concat()` methods
- `fn`: Function that maps each element to a monoid value

**Returns:** A function that takes a source and returns the combined monoid value

**Examples:**
```typescript
const sumMonoid = {
  empty: () => 0,
  concat: (a, b) => a + b
};

const productMonoid = {
  empty: () => 1,
  concat: (a, b) => a * b
};

const stringMonoid = {
  empty: () => '',
  concat: (a, b) => a + b
};

const numbers = [1, 2, 3, 4, 5];
const eachTraversal = each();

// Sum using foldMap
const sum = eachTraversal.foldMap(sumMonoid, n => n)(numbers);
// Result: 15

// Product using foldMap
const product = eachTraversal.foldMap(productMonoid, n => n)(numbers);
// Result: 120

// Concatenate names
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const allNames = eachTraversal.foldMap(stringMonoid, person => person.name + ', ')(people);
// Result: "Alice, Bob, Charlie, "
```

### `.all(predicate)`

Returns `true` if all visited elements satisfy the predicate.

**Signature:**
```typescript
all(predicate: (a: A) => boolean): (source: S) => boolean
```

**Parameters:**
- `predicate`: Function that tests each element

**Returns:** A function that takes a source and returns a boolean

**Examples:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const eachTraversal = each();

// Check if all numbers are positive
const allPositive = eachTraversal.all(n => n > 0)(numbers);
// Result: true

// Check if all people are adults
const allAdults = eachTraversal.all(person => person.age >= 18)(people);
// Result: true

// Check if all people are high earners
const allHighEarners = eachTraversal.all(person => person.salary > 100000)(people);
// Result: false
```

### `.any(predicate)`

Returns `true` if any visited element satisfies the predicate.

**Signature:**
```typescript
any(predicate: (a: A) => boolean): (source: S) => boolean
```

**Parameters:**
- `predicate`: Function that tests each element

**Returns:** A function that takes a source and returns a boolean

**Examples:**
```typescript
const numbers = [1, 2, 3, 4, 5];
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

const eachTraversal = each();

// Check if any number is even
const anyEven = eachTraversal.any(n => n % 2 === 0)(numbers);
// Result: true

// Check if any person is a teen
const anyTeen = eachTraversal.any(person => person.age < 20)(people);
// Result: false

// Check if any person is a high earner
const anyHighEarner = eachTraversal.any(person => person.salary > 90000)(people);
// Result: true
```

## Chaining with Other Operations

Fold operations work seamlessly with other traversal operations before folding:

### With Filtering
```typescript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const eachTraversal = each();

// Sum only even numbers
const evenSum = eachTraversal
  .filter(n => n % 2 === 0)
  .reduce((acc, n) => acc + n, 0)(numbers);
// Result: 30

// Check if all filtered numbers are greater than 3
const allFilteredLarge = eachTraversal
  .filter(n => n > 5)
  .all(n => n > 3)(numbers);
// Result: true
```

### With Sorting
```typescript
const people = [
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
];

// Sum ages in sorted order
const sortedAgeSum = eachTraversal
  .sortBy(person => person.age)
  .reduce((acc, person) => acc + person.age, 0)(people);
// Result: 90 (same as unsorted, but processed in order)
```

### With Distinct
```typescript
const duplicateNumbers = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4];

// Sum only distinct numbers
const distinctSum = eachTraversal
  .distinct()
  .reduce((acc, n) => acc + n, 0)(duplicateNumbers);
// Result: 10
```

### With Take/Drop/Slice
```typescript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Sum first 5 numbers
const first5Sum = eachTraversal
  .take(5)
  .reduce((acc, n) => acc + n, 0)(numbers);
// Result: 15

// Sum numbers after first 3
const after3Sum = eachTraversal
  .drop(3)
  .reduce((acc, n) => acc + n, 0)(numbers);
// Result: 49

// Sum numbers in slice 2-7
const sliceSum = eachTraversal
  .slice(2, 7)
  .reduce((acc, n) => acc + n, 0)(numbers);
// Result: 25
```

### Complex Chaining
```typescript
const people = [
  { name: 'Alice', age: 25, salary: 50000 },
  { name: 'Bob', age: 30, salary: 60000 },
  { name: 'Charlie', age: 35, salary: 70000 },
  { name: 'David', age: 40, salary: 80000 },
  { name: 'Eve', age: 45, salary: 90000 }
];

// Complex chain: filter → sort → distinct → take → reverse → fold
const complexResult = eachTraversal
  .filter(person => person.age > 30)
  .sortBy(person => person.lastName)
  .distinct()
  .take(3)
  .reverse()
  .reduce((acc, person) => acc + person.salary, 0)(people);
// Result: sum of salaries for the filtered, sorted, distinct, taken, reversed people
```

## With Nested Optics

Fold operations work with nested optics through `.then(...)` composition:

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

// Sum name lengths
const totalNameLength = nameTraversal
  .reduce((acc, name) => acc + name.length, 0)(people);
// Result: 17 (5 + 3 + 7)

// Check if all names are longer than 3 characters
const allLongNames = nameTraversal
  .all(name => name.length > 3)(people);
// Result: true

// Concatenate all names
const allNames = nameTraversal
  .foldMap(stringMonoid, name => name + ', ')(people);
// Result: "Alice, Bob, Charlie, "
```

## Edge Cases

### Empty Traversals
```typescript
const numbers = [1, 2, 3, 4, 5];
const eachTraversal = each();

// Empty traversal from filtering
const emptyTraversal = eachTraversal.filter(n => n > 100);

// Reduce returns initial value
const emptyReduce = emptyTraversal.reduce((acc, n) => acc + n, 0)(numbers);
// Result: 0

// All returns true (vacuous truth)
const emptyAll = emptyTraversal.all(n => n > 0)(numbers);
// Result: true

// Any returns false
const emptyAny = emptyTraversal.any(n => n > 0)(numbers);
// Result: false
```

### Single Element
```typescript
const singleElement = [42];
const eachTraversal = each();

// Single element reduce
const singleReduce = eachTraversal.reduce((acc, n) => acc + n, 0)(singleElement);
// Result: 42

// Single element all
const singleAll = eachTraversal.all(n => n > 40)(singleElement);
// Result: true

// Single element any
const singleAny = eachTraversal.any(n => n < 50)(singleElement);
// Result: true
```

## Type Safety

All fold operations preserve type inference:

```typescript
const numbers = [1, 2, 3, 4, 5];
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
];

const eachTraversal = each();

// Type inference for reduce
const sum: number = eachTraversal.reduce((acc, n) => acc + n, 0)(numbers);

// Type inference for foldMap
const totalAge: number = eachTraversal.foldMap(sumMonoid, person => person.age)(people);

// Type inference for all/any
const allPositive: boolean = eachTraversal.all(n => n > 0)(numbers);
const anyEven: boolean = eachTraversal.any(n => n % 2 === 0)(numbers);
```

## Purity Guarantees

All fold operations are marked as `Pure` in the purity tracking system:

- `.reduce()`: Pure - only depends on the reducer function and source
- `.foldMap()`: Pure - only depends on the monoid, mapping function, and source
- `.all()`: Pure - only depends on the predicate and source
- `.any()`: Pure - only depends on the predicate and source

## Integration with HKT System

Fold operations preserve Kind parameters internally, ensuring type safety when used with `.then(...)` composition:

```typescript
// The traversal maintains its Kind parameters until folding
const traversal = eachTraversal
  .filter(n => n > 0)
  .sortBy(n => n)
  .distinct();

// Fold operations terminate the chain and return concrete values
const result = traversal.reduce((acc, n) => acc + n, 0)(numbers);
```

## Summary

Traversal folding operations provide powerful aggregation capabilities:

- **`.reduce()`**: General-purpose reduction with custom reducer function
- **`.foldMap()`**: Monoid-based aggregation for structured data
- **`.all()`**: Universal quantification (∀) over traversal elements
- **`.any()`**: Existential quantification (∃) over traversal elements

These operations integrate seamlessly with the existing traversal API, providing a complete functional programming toolkit for data transformation and aggregation. 