# ObservableLite Fluent Syntax

This document describes the fluent method syntax available on `ObservableLite` instances, which provides a consistent and ergonomic API that integrates seamlessly with HKTs, optics, and purity tracking.

## Overview

`ObservableLite` provides a **fluent method syntax** that eliminates the need for `.pipe()` and standalone helper functions. All methods are **instance methods** that return new `ObservableLite` instances, enabling seamless chaining and integration with the broader FP ecosystem.

### **Key Features**

- ✅ **Fluent API**: No `.pipe()` required - chain methods directly
- ✅ **Type Safety**: Full TypeScript support with type inference
- ✅ **Law Compliance**: Follows Functor and Monad laws
- ✅ **Purity Integration**: Preserves `'Async'` purity tags
- ✅ **HKT Integration**: Works with Higher-Kinded Types
- ✅ **Optics Integration**: Native support for lenses and prisms
- ✅ **ADT Uniformity**: Consistent with ADT method signatures

## Core Fluent Methods

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
```

### **Monad Operations**

#### `.chain<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>`
Monad chaining - flattens nested observables.

**Signature:**
```typescript
chain<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>
```

**Features:**
- ✅ Monad law compliant
- ✅ Flattens nested observables
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Basic chaining
ObservableLite.fromArray([1, 2, 3])
  .chain(x => ObservableLite.fromArray([x, x * 2]))
  .subscribe(console.log);
// Output: 1, 2, 2, 4, 3, 6

// Async chaining
ObservableLite.fromArray(['user1', 'user2'])
  .chain(user => ObservableLite.fromPromise(fetchUser(user)))
  .subscribe(console.log);
```

#### `.flatMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>`
Alias for `chain` - standard FP terminology.

**Signature:**
```typescript
flatMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>
```

**Examples:**
```typescript
// Same as chain
ObservableLite.fromArray([1, 2, 3])
  .flatMap(x => ObservableLite.fromArray([x, x * 2]))
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

### **Bifunctor Operations**

#### `.bimap<B, C>(f: (a: A) => B, g: (err: any) => C): ObservableLite<B>`
Maps over both success and error channels.

**Signature:**
```typescript
bimap<B, C>(f: (a: A) => B, g: (err: any) => C): ObservableLite<B>
```

**Features:**
- ✅ Bifunctor law compliant
- ✅ Transforms success and error channels
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Success and error transformation
ObservableLite.fromArray([1, 2, 3])
  .bimap(
    x => x * 2,           // Transform success values
    err => `Error: ${err}` // Transform error values
  )
  .subscribe(console.log);
// Output: 2, 4, 6
```

## Optics Integration

### **Lens Operations**

#### `.over<O, B>(optic: O, fn: (focus: FocusOf<O, A>) => FocusOf<O, A>): ObservableLite<A>`
Transforms values using a lens.

**Signature:**
```typescript
over<O, B>(
  optic: O,
  fn: (focus: FocusOf<O, A>) => FocusOf<O, A>
): ObservableLite<A>
```

**Features:**
- ✅ Works with any optic kind (Lens, Prism, Optional)
- ✅ Type inference based on optic focus
- ✅ Cross-kind composition support
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Lens transformation
const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
])
  .over(nameLens, name => name.toUpperCase())
  .subscribe(console.log);
// Output: { name: 'ALICE', age: 25 }, { name: 'BOB', age: 30 }
```

#### `.preview<O>(optic: O): ObservableLite<FocusOf<O, A>>`
Extracts focused values using an optic.

**Signature:**
```typescript
preview<O>(optic: O): ObservableLite<FocusOf<O, A>>
```

**Features:**
- ✅ Works with any optic kind (Lens, Prism, Optional)
- ✅ Type inference based on optic focus
- ✅ Cross-kind composition support
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Lens preview
const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
])
  .preview(nameLens)
  .subscribe(console.log);
// Output: 'Alice', 'Bob'
```

## Before vs After Comparison

### **Before (with .pipe())**
```typescript
// Old style - requires .pipe() and standalone functions
import { map, filter, flatMap } from './fp-operators';

ObservableLite.fromArray([1, 2, 3, 4, 5])
  .pipe(
    filter(x => x > 2),
    map(x => x * 2),
    flatMap(x => ObservableLite.of(x, x + 1))
  )
  .subscribe(console.log);
```

### **After (fluent syntax)**
```typescript
// New style - direct method chaining
ObservableLite.fromArray([1, 2, 3, 4, 5])
  .filter(x => x > 2)
  .map(x => x * 2)
  .chain(x => ObservableLite.of(x, x + 1))
  .subscribe(console.log);
```

## ADT/Observable Uniformity

The fluent syntax provides **uniformity** between ADTs and Observables:

### **ADT Style**
```typescript
// ADT methods
Maybe.Just(5)
  .map(x => x * 2)
  .chain(x => Maybe.Just(x + 1))
  .filter(x => x > 10);

Either.Right(5)
  .map(x => x * 2)
  .chain(x => Either.Right(x + 1))
  .bimap(
    err => `Error: ${err}`,
    val => val * 2
  );
```

### **Observable Style**
```typescript
// Observable methods - same pattern!
ObservableLite.of(5)
  .map(x => x * 2)
  .chain(x => ObservableLite.of(x + 1))
  .filter(x => x > 10);

ObservableLite.of(5)
  .map(x => x * 2)
  .chain(x => ObservableLite.of(x + 1))
  .bimap(
    err => `Error: ${err}`,
    val => val * 2
  );
```

## Optics Integration in Reactive Flows

The fluent syntax seamlessly integrates optics into reactive pipelines:

```typescript
// Complex optic composition in reactive flows
ObservableLite.fromArray([
  { user: { name: 'Alice', age: 25 } },
  { user: { name: 'Bob', age: 30 } },
  { user: { name: 'Charlie', age: 35 } }
])
  .filter(user => user.age > 25) // Filter users
  .over(userLens, user => ({ ...user, age: user.age + 1 })) // Update age
  .preview(userLens) // Extract user objects
  .over(nameLens, name => name.toUpperCase()) // Transform names
  .preview(nameLens) // Extract names
  .map(name => name.toLowerCase()) // Final transformation
  .subscribe(console.log);
// Output: 'alice', 'bob', 'charlie'
```

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
// of(a).chain(f) === f(a)
ObservableLite.of(5)
  .chain(x => ObservableLite.of(x * 2))
// ===
ObservableLite.of(5 * 2)
```

#### **Right Identity**
```typescript
// m.chain(of) === m
ObservableLite.fromArray([1, 2, 3])
  .chain(x => ObservableLite.of(x))
// ===
ObservableLite.fromArray([1, 2, 3])
```

#### **Associativity**
```typescript
// m.chain(f).chain(g) === m.chain(x => f(x).chain(g))
ObservableLite.fromArray([1, 2, 3])
  .chain(f)
  .chain(g)
// ===
ObservableLite.fromArray([1, 2, 3])
  .chain(x => f(x).chain(g))
```

## Purity Integration

All fluent methods preserve the `'Async'` purity tag:

```typescript
// All methods maintain Async purity
const obs = ObservableLite.fromArray([1, 2, 3]); // Async
const mapped = obs.map(x => x * 2); // Still Async
const filtered = obs.filter(x => x > 1); // Still Async
const chained = obs.chain(x => ObservableLite.of(x)); // Still Async
const bimapped = obs.bimap(x => x * 2, err => err); // Still Async
```

## HKT Integration

The fluent methods work seamlessly with Higher-Kinded Types:

```typescript
// Type constructor preserved
const obs: ObservableLite<number> = ObservableLite.fromArray([1, 2, 3]);
const mapped: ObservableLite<string> = obs.map(x => x.toString());
const chained: ObservableLite<boolean> = obs.chain(x => ObservableLite.of(x > 1));
const bimapped: ObservableLite<string> = obs.bimap(x => x.toString(), err => err);
```

## Performance Considerations

- **Lazy Evaluation**: Methods only execute when subscribed to
- **Memory Efficient**: Minimal intermediate allocations
- **Type Safety**: Compile-time type checking
- **Purity Preservation**: No side effects in transformations

## Migration Benefits

### **From RxJS**
```typescript
// RxJS style
rxjs.from([1, 2, 3])
  .pipe(
    rxjs.operators.map(x => x * 2),
    rxjs.operators.filter(x => x > 2),
    rxjs.operators.mergeMap(x => rxjs.of(x, x + 1))
  )

// ObservableLite style
ObservableLite.fromArray([1, 2, 3])
  .map(x => x * 2)
  .filter(x => x > 2)
  .chain(x => ObservableLite.of(x, x + 1))
```

### **From FP Libraries**
```typescript
// FP style with .pipe()
import { map, filter, chain } from './fp-operators';

ObservableLite.fromArray([1, 2, 3])
  .pipe(
    filter(x => x > 1),
    map(x => x * 2),
    chain(x => ObservableLite.of(x))
  )

// ObservableLite fluent style
ObservableLite.fromArray([1, 2, 3])
  .filter(x => x > 1)
  .map(x => x * 2)
  .chain(x => ObservableLite.of(x))
```

## Summary

The **ObservableLite Fluent Syntax** provides:

- ✅ **Fluent API**: Direct method chaining without `.pipe()`
- ✅ **Type Safety**: Full TypeScript support with type inference
- ✅ **Law Compliance**: Follows Functor and Monad laws
- ✅ **Purity Integration**: Preserves `'Async'` purity tags
- ✅ **HKT Integration**: Works with Higher-Kinded Types
- ✅ **Optics Integration**: Native support for lenses and prisms
- ✅ **ADT Uniformity**: Consistent with ADT method signatures
- ✅ **Performance**: Lazy evaluation and memory efficiency

This delivers a **consistent, ergonomic, and type-safe** API that bridges reactive programming with functional programming principles! 🚀 