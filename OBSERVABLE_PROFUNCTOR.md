# ObservableLite Profunctor

This document describes the Profunctor functionality available on `ObservableLite` instances, which provides bidirectional transformations and optic-powered streaming capabilities.

## Overview

`ObservableLite` now supports **Profunctor** operations, enabling bidirectional transformations where you can map both the input and output sides of the observable. This provides powerful capabilities for data transformation pipelines and advanced optic integration.

### **Key Features**

- ✅ **Bidirectional Transformations**: Map both input and output sides
- ✅ **Optic Integration**: Native support for lens/prism transformations
- ✅ **Fluent API**: Chainable methods that return ObservableLite
- ✅ **Type Safety**: Full TypeScript support with type inference
- ✅ **Law Compliance**: Follows Profunctor laws (identity, composition)
- ✅ **Purity Integration**: Preserves `'Async'` purity tags
- ✅ **HKT Integration**: Works with Higher-Kinded Types

## Core Profunctor Methods

### **Bidirectional Transformations**

#### `.dimap<C, D>(inFn: (c: C) => A, outFn: (a: A) => D): ObservableLite<D>`
Maps functions over both input and output sides of the observable.

**Signature:**
```typescript
dimap<C, D>(inFn: (c: C) => A, outFn: (a: A) => D): ObservableLite<D>
```

**Features:**
- ✅ Contravariant input mapping (`inFn`)
- ✅ Covariant output mapping (`outFn`)
- ✅ Profunctor law compliant
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Basic bidirectional transformation
ObservableLite.fromArray([1, 2, 3])
  .dimap(
    (x: number) => x * 2, // Input transformation (contravariant)
    (x: number) => x.toString() // Output transformation (covariant)
  )
  .subscribe(console.log);
// Output: '1', '2', '3'

// Complex object transformations
ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
])
  .dimap(
    (person) => ({ ...person, age: person.age + 1 }), // Input: increment age
    (person) => ({ ...person, name: `Mr./Ms. ${person.name}` }) // Output: add title
  )
  .subscribe(console.log);
// Output: { name: 'Mr./Ms. Alice', age: 25 }, { name: 'Mr./Ms. Bob', age: 30 }
```

### **Input-Side Mapping**

#### `.lmap<C>(inFn: (c: C) => A): ObservableLite<A>`
Maps a function over the input side only (contravariant).

**Signature:**
```typescript
lmap<C>(inFn: (c: C) => A): ObservableLite<A>
```

**Features:**
- ✅ Contravariant input mapping
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Input-side transformation
ObservableLite.fromArray([1, 2, 3])
  .lmap((x: number) => x * 2) // Input transformation
  .subscribe(console.log);
// Output: 1, 2, 3 (input transformed, output unchanged)
```

### **Output-Side Mapping**

#### `.rmap<D>(outFn: (a: A) => D): ObservableLite<D>`
Maps a function over the output side only (covariant).

**Signature:**
```typescript
rmap<D>(outFn: (a: A) => D): ObservableLite<D>
```

**Features:**
- ✅ Covariant output mapping
- ✅ Type inference preserved
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Output-side transformation
ObservableLite.fromArray([1, 2, 3])
  .rmap((x: number) => x * 2) // Output transformation
  .subscribe(console.log);
// Output: 2, 4, 6 (output transformed)
```

## Advanced Optic Integration

### **Optic-Powered Bidirectional Transformations**

#### `.mapWithOptic<O, C, D>(optic: O, inFn: (c: C) => FocusOf<O, A>, outFn: (focus: FocusOf<O, A>) => D): ObservableLite<D>`
Performs bidirectional transformations using optics (lens, prism, optional).

**Signature:**
```typescript
mapWithOptic<O, C, D>(
  optic: O,
  inFn: (c: C) => FocusOf<O, A>,
  outFn: (focus: FocusOf<O, A>) => D
): ObservableLite<D>
```

**Features:**
- ✅ Works with any optic kind (Lens, Prism, Optional)
- ✅ Bidirectional transformations through optics
- ✅ Type inference based on optic focus
- ✅ Cross-kind composition support
- ✅ Purity tag preserved (`'Async'`)

**Examples:**
```typescript
// Lens-based bidirectional transformation
const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
])
  .mapWithOptic(
    nameLens,
    (name) => name, // Input transformation
    (name) => name.toUpperCase() // Output transformation
  )
  .subscribe(console.log);
// Output: 'ALICE', 'BOB'

// Prism-based bidirectional transformation
const justPrism = prism(
  (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
  (value) => ({ tag: 'Just', value })
);

ObservableLite.fromArray([
  { tag: 'Just', value: 1 },
  { tag: 'Nothing' },
  { tag: 'Just', value: 3 }
])
  .mapWithOptic(
    justPrism,
    (value) => value, // Input transformation
    (value) => value * 2 // Output transformation
  )
  .subscribe(console.log);
// Output: 2, { tag: 'Nothing' }, 6
```

## Before vs After Comparison

### **Before (Manual Input & Output Mapping)**
```typescript
// Old way - manual transformations
const people = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

// Manual input transformation
const withIncrementedAge = people.map(person => ({ ...person, age: person.age + 1 }));

// Manual output transformation
const withTitles = withIncrementedAge.map(person => ({ 
  ...person, 
  name: `Mr./Ms. ${person.name}` 
}));

withTitles.subscribe(console.log);
```

### **After (Profunctor dimap)**
```typescript
// New way - Profunctor dimap
ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
])
  .dimap(
    (person) => ({ ...person, age: person.age + 1 }), // Input transformation
    (person) => ({ ...person, name: `Mr./Ms. ${person.name}` }) // Output transformation
  )
  .subscribe(console.log);
```

## Optic Integration Examples

### **Bidirectional Name Updates**
```typescript
const nameLens = lens<Person, Person, string, string>(
  p => p.name,
  (name, p) => ({ ...p, name })
);

const people$ = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

people$
  .mapWithOptic(nameLens, n => n, n => n.toUpperCase())
  .subscribe(console.log);
// Output: 'ALICE', 'BOB'
```

### **Complex Optic Composition**
```typescript
const userLens = lens(
  (data) => data.user,
  (user, data) => ({ ...data, user })
);

const ageLens = lens(
  (user) => user.age,
  (age, user) => ({ ...user, age })
);

ObservableLite.fromArray([
  { user: { name: 'Alice', age: 25 } },
  { user: { name: 'Bob', age: 30 } }
])
  .mapWithOptic(
    userLens,
    (user) => user, // Input transformation
    (user) => ({ ...user, age: user.age + 1 }) // Output transformation
  )
  .mapWithOptic(
    ageLens,
    (age) => age, // Input transformation
    (age) => age * 2 // Output transformation
  )
  .subscribe(console.log);
// Output: 52, 62
```

## Law Compliance

### **Profunctor Laws**

#### **Identity Law**
```typescript
// dimap id id === id
const identity = x => x;
ObservableLite.of(5).dimap(identity, identity) === ObservableLite.of(5)
```

#### **Composition Law**
```typescript
// dimap f g . dimap h i === dimap (f . h) (i . g)
const f1 = x => x * 2;
const f2 = x => x + 1;
const g1 = x => x.toString();
const g2 = x => x.toUpperCase();

ObservableLite.of(5)
  .dimap(f1, g1)
  .dimap(f2, g2)
// ===
ObservableLite.of(5)
  .dimap(
    x => f1(f2(x)), // Compose input functions
    x => g2(g1(x))  // Compose output functions
  )
```

## Purity Integration

All Profunctor methods preserve the `'Async'` purity tag:

```typescript
// All methods maintain Async purity
const obs = ObservableLite.fromArray([1, 2, 3]); // Async
const dimapped = obs.dimap(x => x, x => x * 2); // Still Async
const lmapped = obs.lmap(x => x); // Still Async
const rmapped = obs.rmap(x => x * 2); // Still Async
const opticMapped = obs.mapWithOptic(lens, x => x, x => x * 2); // Still Async
```

## HKT Integration

The Profunctor methods work seamlessly with Higher-Kinded Types:

```typescript
// Type constructor preserved
const obs: ObservableLite<number> = ObservableLite.fromArray([1, 2, 3]);
const dimapped: ObservableLite<string> = obs.dimap(x => x, x => x.toString());
const lmapped: ObservableLite<number> = obs.lmap(x => x);
const rmapped: ObservableLite<string> = obs.rmap(x => x.toString());
const opticMapped: ObservableLite<string> = obs.mapWithOptic(lens, x => x, x => x.toString());
```

## Real-World Use Cases

### **Form Validation Pipeline**
```typescript
const emailLens = lens(
  (user) => user.email,
  (email, user) => ({ ...user, email })
);

ObservableLite.fromArray([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'invalid-email' },
  { name: 'Charlie', email: 'charlie@test.org' }
])
  .mapWithOptic(
    emailLens,
    (email) => email, // Input: raw email
    (email) => email.includes('@') ? email : 'invalid' // Output: validated email
  )
  .filter(email => email !== 'invalid')
  .subscribe(console.log);
// Output: 'alice@example.com', 'charlie@test.org'
```

### **Data Transformation Pipeline**
```typescript
ObservableLite.fromArray([
  { id: 1, value: 'hello' },
  { id: 2, value: 'world' }
])
  .dimap(
    (item) => ({ ...item, value: item.value.toUpperCase() }), // Input: uppercase
    (item) => ({ ...item, processed: true }) // Output: add processed flag
  )
  .subscribe(console.log);
// Output: { id: 1, value: 'HELLO', processed: true }, { id: 2, value: 'WORLD', processed: true }
```

## Interoperability with Existing Methods

### **Chaining with Fluent API**
```typescript
ObservableLite.fromArray([1, 2, 3, 4, 5])
  .filter(x => x > 2) // [3, 4, 5]
  .rmap(x => x * 2) // [6, 8, 10]
  .dimap(
    x => x + 1, // Input transformation
    x => x.toString() // Output transformation
  ) // ['6', '8', '10']
  .subscribe(console.log);
```

### **Integration with Optics**
```typescript
ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
])
  .over(nameLens, name => name.toUpperCase()) // Transform with lens
  .mapWithOptic(ageLens, age => age, age => age + 1) // Transform with Profunctor
  .preview(nameLens) // Extract with lens
  .subscribe(console.log);
// Output: 'ALICE', 'BOB'
```

## Performance Considerations

- **Lazy Evaluation**: Profunctor methods only execute when subscribed to
- **Memory Efficient**: Minimal intermediate allocations
- **Type Safety**: Compile-time type checking
- **Purity Preservation**: No side effects in transformations

## Migration Benefits

### **From Manual Transformations**
```typescript
// Old way - multiple map calls
obs
  .map(person => ({ ...person, age: person.age + 1 }))
  .map(person => ({ ...person, name: person.name.toUpperCase() }))
  .map(person => ({ ...person, processed: true }))

// New way - single dimap call
obs.dimap(
  person => ({ ...person, age: person.age + 1 }), // Input transformation
  person => ({ 
    ...person, 
    name: person.name.toUpperCase(),
    processed: true 
  }) // Output transformation
)
```

### **From Complex Optic Chains**
```typescript
// Old way - multiple optic operations
obs
  .over(userLens, user => ({ ...user, age: user.age + 1 }))
  .over(nameLens, name => name.toUpperCase())
  .preview(ageLens)

// New way - single mapWithOptic call
obs.mapWithOptic(
  userLens.then(nameLens),
  value => value,
  value => value.toUpperCase()
)
```

## Summary

The **ObservableLite Profunctor** provides:

- ✅ **Bidirectional Transformations**: Map both input and output sides
- ✅ **Optic Integration**: Native support for lens/prism transformations
- ✅ **Fluent API**: Chainable methods that return ObservableLite
- ✅ **Type Safety**: Full TypeScript support with type inference
- ✅ **Law Compliance**: Follows Profunctor laws (identity, composition)
- ✅ **Purity Integration**: Preserves `'Async'` purity tags
- ✅ **HKT Integration**: Works with Higher-Kinded Types
- ✅ **Performance**: Lazy evaluation and memory efficiency

This delivers **powerful bidirectional transformation capabilities** that bridge reactive programming with advanced functional programming concepts! 🚀 