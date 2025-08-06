# ObservableLite Core Operators

This document describes the core FP/Rx operators available on `ObservableLite` instances.

## Overview

`ObservableLite` provides a comprehensive set of operators that follow both Functional Programming (FP) and Reactive Programming (RxJS) conventions. The operators are designed to be:

- **Fluent**: Chainable without `.pipe()`
- **Type-safe**: Full TypeScript support with type inference
- **Law-compliant**: Follow Functor and Monad laws
- **Purity-aware**: Preserve `'Async'` purity tags
- **HKT-integrated**: Work with Higher-Kinded Types
- **ADT-compatible**: Integrate with Algebraic Data Types
- **Optics-ready**: Support for lens/prism operations

## Core Operators

### **Functor Operations**

#### `.map<B>(f: (a: A) => B): ObservableLite<B>`
Maps a function over each value in the observable.

**Signature:**
```typescript
map<B>(f: (a: A) => B): ObservableLite<B>
```

**Features:**
- ✅ Functor law compliant
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)
- ✅ HKT integration maintained

**Examples:**
```typescript
// Basic mapping
ObservableLite.fromArray([1, 2, 3])
  .map(x => x * 2)
  .subscribe(console.log);
// Output: 2, 4, 6

// Complex mapping
ObservableLite.fromArray([{ name: 'Alice' }, { name: 'Bob' }])
  .map(user => user.name.toUpperCase())
  .subscribe(console.log);
// Output: 'ALICE', 'BOB'

// Async mapping
ObservableLite.fromArray([1, 2, 3])
  .map(user => ObservableLite.fromPromise(fetchUser(user)))
  .subscribe(console.log);
```

### **Monad Operations**

#### `.flatMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>`
**Primary FP name** - Flattens nested observables (Monad bind).

**Signature:**
```typescript
flatMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>
```

**Features:**
- ✅ Monad law compliant
- ✅ Flattens nested observables
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)
- ✅ HKT integration maintained

**Examples:**
```typescript
// Basic flatMap
ObservableLite.fromArray([1, 2, 3])
  .flatMap(x => ObservableLite.fromArray([x, x * 2]))
  .subscribe(console.log);
// Output: 1, 2, 2, 4, 3, 6

// Async flatMap
ObservableLite.fromArray(['user1', 'user2'])
  .flatMap(user => ObservableLite.fromPromise(fetchUser(user)))
  .subscribe(console.log);
```

#### `.chain<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>`
**Alias for flatMap** - Monad chaining.

**Signature:**
```typescript
chain<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>
```

**Features:**
- ✅ Identical to `flatMap`
- ✅ FP naming convention
- ✅ Monad law compliant

**Examples:**
```typescript
// Same as flatMap
ObservableLite.fromArray([1, 2, 3])
  .chain(x => ObservableLite.fromArray([x, x * 2]))
  .subscribe(console.log);
// Output: 1, 2, 2, 4, 3, 6
```

#### `.mergeMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>`
**Alias for flatMap** - RxJS familiarity.

**Signature:**
```typescript
mergeMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>
```

**Features:**
- ✅ Identical to `flatMap`
- ✅ RxJS naming convention
- ✅ Familiar to RxJS developers

**Examples:**
```typescript
// Same as flatMap - RxJS style
ObservableLite.fromArray([1, 2, 3])
  .mergeMap(x => ObservableLite.fromArray([x, x * 2]))
  .subscribe(console.log);
// Output: 1, 2, 2, 4, 3, 6
```

### **Filtering Operations**

#### `.filter(predicate: (a: A) => boolean): ObservableLite<A>`
Filters values based on a predicate function.

**Signature:**
```typescript
filter(predicate: (a: A) => boolean): ObservableLite<A>
```

**Features:**
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)
- ✅ HKT integration maintained

**Examples:**
```typescript
// Basic filtering
ObservableLite.fromArray([1, 2, 3, 4, 5])
  .filter(x => x > 2)
  .subscribe(console.log);
// Output: 3, 4, 5

// Complex filtering
ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 17 },
  { name: 'Charlie', age: 30 }
])
  .filter(user => user.age >= 18)
  .subscribe(console.log);
// Output: { name: 'Alice', age: 25 }, { name: 'Charlie', age: 30 }
```

### **Accumulation Operations**

#### `.scan<B>(reducer: (acc: B, value: A) => B, initial: B): ObservableLite<B>`
Accumulates values over time, emitting intermediate results.

**Signature:**
```typescript
scan<B>(reducer: (acc: B, value: A) => B, initial: B): ObservableLite<B>
```

**Features:**
- ✅ Emits intermediate results
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Basic scanning
ObservableLite.fromArray([1, 2, 3, 4])
  .scan((acc, x) => acc + x, 0)
  .subscribe(console.log);
// Output: 0, 1, 3, 6, 10

// Complex scanning
ObservableLite.fromArray(['a', 'b', 'c'])
  .scan((acc, x) => acc + x, '')
  .subscribe(console.log);
// Output: '', 'a', 'ab', 'abc'
```

### **Slicing Operations**

#### `.take(count: number): ObservableLite<A>`
Takes the first `count` values from the observable.

**Signature:**
```typescript
take(count: number): ObservableLite<A>
```

**Examples:**
```typescript
ObservableLite.fromArray([1, 2, 3, 4, 5])
  .take(3)
  .subscribe(console.log);
// Output: 1, 2, 3
```

#### `.skip(count: number): ObservableLite<A>`
Skips the first `count` values from the observable.

**Signature:**
```typescript
skip(count: number): ObservableLite<A>
```

**Examples:**
```typescript
ObservableLite.fromArray([1, 2, 3, 4, 5])
  .skip(2)
  .subscribe(console.log);
// Output: 3, 4, 5
```

### **Combination Operations**

#### `.startWith<B extends A>(...values: B[]): ObservableLite<A>`
Prepends values to the beginning of the observable.

**Signature:**
```typescript
startWith<B extends A>(...values: B[]): ObservableLite<A>
```

**Examples:**
```typescript
ObservableLite.fromArray([3, 4, 5])
  .startWith(1, 2)
  .subscribe(console.log);
// Output: 1, 2, 3, 4, 5
```

#### `.concat<B>(other: ObservableLite<B>): ObservableLite<A | B>`
Concatenates another observable to the end of this one.

**Signature:**
```typescript
concat<B>(other: ObservableLite<B>): ObservableLite<A | B>
```

**Examples:**
```typescript
ObservableLite.fromArray([1, 2, 3])
  .concat(ObservableLite.fromArray([4, 5, 6]))
  .subscribe(console.log);
// Output: 1, 2, 3, 4, 5, 6
```

#### `.merge<B>(other: ObservableLite<B>): ObservableLite<A | B>`
Merges emissions from another observable with this one.

**Signature:**
```typescript
merge<B>(other: ObservableLite<B>): ObservableLite<A | B>
```

**Examples:**
```typescript
ObservableLite.fromArray([1, 3, 5])
  .merge(ObservableLite.fromArray([2, 4, 6]))
  .subscribe(console.log);
// Output: 1, 2, 3, 4, 5, 6 (interleaved)
```

## Operator Naming Conventions

### **Normalized Naming Strategy**

We follow a **normalized naming strategy** that balances FP and RxJS conventions:

| Operation | Primary Name | FP Alias | RxJS Alias | Purpose |
|-----------|--------------|----------|------------|---------|
| **Monad bind** | `.flatMap()` | `.chain()` | `.mergeMap()` | Flatten nested observables |
| **Functor map** | `.map()` | - | - | Transform values |
| **Filter** | `.filter()` | - | - | Filter values |

### **Naming Rationale**

1. **`.flatMap()` as Primary**: 
   - Standard FP terminology
   - Clear about flattening behavior
   - Consistent with Array.flatMap()

2. **`.chain()` as FP Alias**:
   - Traditional FP naming
   - Emphasizes monadic chaining
   - Familiar to FP developers

3. **`.mergeMap()` as RxJS Alias**:
   - RxJS familiarity
   - Eases migration from RxJS
   - Maintains developer comfort

## Law Compliance

### **Functor Laws**

#### **Identity Law**
```typescript
// of(a).map(id) === of(a)
ObservableLite.of(5).map(x => x) === ObservableLite.of(5)
```

#### **Composition Law**
```typescript
// of(a).map(f).map(g) === of(a).map(x => g(f(x)))
ObservableLite.of(5)
  .map(x => x * 2)
  .map(x => x + 1)
// ===
ObservableLite.of(5)
  .map(x => (x * 2) + 1)
```

### **Monad Laws**

#### **Left Identity**
```typescript
// of(a).flatMap(f) === f(a)
ObservableLite.of(5)
  .flatMap(x => ObservableLite.of(x * 2))
// ===
ObservableLite.of(5 * 2)
```

#### **Right Identity**
```typescript
// m.flatMap(of) === m
ObservableLite.fromArray([1, 2, 3])
  .flatMap(x => ObservableLite.of(x))
// ===
ObservableLite.fromArray([1, 2, 3])
```

#### **Associativity**
```typescript
// m.flatMap(f).flatMap(g) === m.flatMap(x => f(x).flatMap(g))
ObservableLite.fromArray([1, 2, 3])
  .flatMap(f)
  .flatMap(g)
// ===
ObservableLite.fromArray([1, 2, 3])
  .flatMap(x => f(x).flatMap(g))
```

## Purity Integration

All operators preserve the `'Async'` purity tag:

```typescript
// All operators maintain Async purity
const obs = ObservableLite.fromArray([1, 2, 3]); // Async
const mapped = obs.map(x => x * 2); // Still Async
const filtered = obs.filter(x => x > 1); // Still Async
const flatMapped = obs.flatMap(x => ObservableLite.of(x)); // Still Async
```

## HKT Integration

Operators work seamlessly with Higher-Kinded Types:

```typescript
// Type constructor preserved
const obs: ObservableLite<number> = ObservableLite.fromArray([1, 2, 3]);
const mapped: ObservableLite<string> = obs.map(x => x.toString());
const flatMapped: ObservableLite<boolean> = obs.flatMap(x => ObservableLite.of(x > 1));
```

## ADT Integration

Operators integrate with Algebraic Data Types:

```typescript
// Works with Maybe, Either, Result
ObservableLite.fromArray([Maybe.Just(1), Maybe.Nothing()])
  .flatMap(maybe => maybe.match({
    Just: value => ObservableLite.of(value * 2),
    Nothing: () => ObservableLite.of(0)
  }))
  .subscribe(console.log);
```

## Optics Integration

Operators support lens and prism operations:

```typescript
// Lens operations
ObservableLite.fromArray([{ name: 'Alice' }, { name: 'Bob' }])
  .over(nameLens, name => name.toUpperCase())
  .subscribe(console.log);

// Prism operations
ObservableLite.fromArray([Maybe.Just(1), Maybe.Nothing()])
  .preview(justPrism)
  .subscribe(console.log);
```

## Fluent Chaining

All operators support fluent chaining without `.pipe()`:

```typescript
ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  .filter(x => x % 2 === 0) // [2, 4, 6, 8, 10]
  .map(x => x * 2) // [4, 8, 12, 16, 20]
  .flatMap(x => ObservableLite.fromArray([x, x + 1])) // [4,5, 8,9, 12,13, 16,17, 20,21]
  .take(6) // [4,5, 8,9, 12,13]
  .scan((acc, x) => acc + x, 0) // [0,4,9,17,26,38,51]
  .subscribe(console.log);
```

## Performance Considerations

- **Lazy Evaluation**: Operators only execute when subscribed to
- **Memory Efficient**: Minimal intermediate allocations
- **Type Safety**: Compile-time type checking
- **Purity Preservation**: No side effects in transformations

## Migration from RxJS

For developers familiar with RxJS:

```typescript
// RxJS style
rxjs.from([1, 2, 3])
  .pipe(
    rxjs.operators.map(x => x * 2),
    rxjs.operators.mergeMap(x => rxjs.of(x, x + 1)),
    rxjs.operators.filter(x => x > 2)
  )

// ObservableLite style
ObservableLite.fromArray([1, 2, 3])
  .map(x => x * 2)
  .mergeMap(x => ObservableLite.of(x, x + 1)) // or .flatMap() or .chain()
  .filter(x => x > 2)
```

## Summary

`ObservableLite` provides a comprehensive set of operators that:

- ✅ **Follow FP conventions** with `.flatMap()` as primary
- ✅ **Support RxJS familiarity** with `.mergeMap()` alias
- ✅ **Maintain FP purity** with `.chain()` alias
- ✅ **Preserve type safety** throughout transformations
- ✅ **Comply with mathematical laws** (Functor, Monad)
- ✅ **Integrate with HKTs** and purity tracking
- ✅ **Support fluent chaining** without `.pipe()`
- ✅ **Enable optics integration** for complex transformations 