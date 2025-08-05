# Optics Foundations with Profunctor Support

## Overview

The Optics Foundations system provides a minimal but extensible optics system (Lens, Prism, Traversal) built directly on Profunctor machinery, integrating seamlessly with the HKT + purity system. Optics provide a unified way to access and modify nested data structures while maintaining type safety and functional programming principles.

## What Are Optics?

Optics are composable abstractions for accessing and modifying parts of data structures. They provide a unified interface for working with:

- **Lenses**: Focus on a single field that always exists
- **Prisms**: Focus on an optional branch of a sum type
- **Traversals**: Focus on zero or more elements
- **Isos**: Bidirectional transformations between types
- **Getters**: Read-only access to parts of structures
- **Setters**: Write-only access to parts of structures

### Core Concept: Profunctor-Based Optics

All optics are built on the foundation of **Profunctors** - types that are contravariant in their first parameter and covariant in their second parameter. This provides a unified mathematical foundation for all optic types.

```typescript
// General Optic — wraps a Profunctor transformation
type Optic<P, S, T, A, B> = (pab: Apply<P, [A, B]>) => Apply<P, [S, T]>;

// Lens — focus on a single field (always present)
type Lens<S, T, A, B> = Optic<Profunctor<any>, S, T, A, B>;

// Prism — focus on an optional branch of a sum type
type Prism<S, T, A, B> = Optic<Choice<any>, S, T, A, B>;

// Traversal — focus on zero or more elements
type Traversal<S, T, A, B> = Optic<Traversing<any>, S, T, A, B>;
```

## Core Types

### Lens

A lens focuses on a part of a structure that always exists. It provides get, set, and modify operations.

```typescript
type Lens<S, T, A, B> = Optic<Profunctor<any>, S, T, A, B>;

// Lens into object property
type Person = { name: string; age: number };
const nameLens = lens<Person, Person, string, string>(
  p => p.name,                    // getter
  (p, name) => ({ ...p, name })  // setter
);

const bob: Person = { name: "Bob", age: 30 };
const newBob = set(nameLens, "Robert", bob); // { name: "Robert", age: 30 }
```

### Prism

A prism focuses on a part of a structure that may not exist (sum types). It provides preview, review, and match operations.

```typescript
type Prism<S, T, A, B> = Optic<Choice<any>, S, T, A, B>;

// Prism for Either.right
const rightPrism = prism<Either<L, R>, Either<L, R>, R, R>(
  e => (e.tag === "Right" ? Left(e.value) : Right(e.value)), // match
  r => Right(r)                                               // build
);
```

### Traversal

A traversal focuses on multiple parts of a structure. It provides map, traverse, and fold operations.

```typescript
type Traversal<S, T, A, B> = Optic<Traversing<any>, S, T, A, B>;

// Traversal over array elements
const arrayTraversal = traversal<number[], number[], number, number>(
  (f, arr) => arr.map(f)
);
```

## Profunctor Variants

### Choice

Extends Profunctor with choice operations for handling sum types (used by Prisms).

```typescript
interface Choice<P extends Kind2> extends Profunctor<P> {
  left<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
  right<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [Either<C, A>, Either<C, B>]>;
}
```

### Traversing

Extends Profunctor with traversal operations for handling multiple elements (used by Traversals).

```typescript
interface Traversing<P extends Kind2> extends Profunctor<P> {
  traverse<A, B, F extends Kind1>(
    app: Applicative<F>,
    pab: Apply<P, [A, B]>,
    fa: Apply<F, [A]>
  ): Apply<F, [Apply<P, [A, B]>]>;
}
```

### Strong

Extends Profunctor with strength operations for handling product types (used by Lenses).

```typescript
interface Strong<P extends Kind2> extends Profunctor<P> {
  first<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
  second<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [[C, A], [C, B]]>;
}
```

## Core Utilities

### Lens Utilities

```typescript
// Create a lens from getter and setter functions
function lens<S, T, A, B>(
  getter: (s: S) => A,
  setter: (s: S, b: B) => T
): Lens<S, T, A, B>

// View the focused part of a structure
function view<S, A>(ln: Lens<S, S, A, A>, s: S): A

// Set the focused part of a structure
function set<S, T, A, B>(ln: Lens<S, T, A, B>, b: B, s: S): T

// Modify the focused part of a structure
function over<S, T, A, B>(ln: Lens<S, T, A, B>, f: (a: A) => B, s: S): T
```

### Prism Utilities

```typescript
// Create a prism from match and build functions
function prism<S, T, A, B>(
  match: (s: S) => Either<A, T>,
  build: (b: B) => T
): Prism<S, T, A, B>

// Preview the focused part of a structure
function preview<S, A>(pr: Prism<S, S, A, A>, s: S): Maybe<A>

// Review the structure from the focused part
function review<S, T, A, B>(pr: Prism<S, T, A, B>, b: B): T

// Check if a prism matches the focused part
function isMatching<S, A>(pr: Prism<S, S, A, A>, s: S): boolean
```

### Traversal Utilities

```typescript
// Create a traversal from a traverse function
function traversal<S, T, A, B>(
  traverse: (f: (a: A) => B, s: S) => T
): Traversal<S, T, A, B>

// Traverse over the focused parts of a structure
function traverse<S, T, A, B>(
  tr: Traversal<S, T, A, B>,
  f: (a: A) => B,
  s: S
): T

// Map over the focused parts of a structure
function map<S, T, A, B>(
  tr: Traversal<S, T, A, B>,
  f: (a: A) => B,
  s: S
): T
```

## Common Constructors

### Lens Constructors

```typescript
// Create a lens for an object property
function prop<K extends string>(key: K): Lens<S, T, A, B>

// Create a lens for an array element at a specific index
function at(index: number): Lens<S, T, A, B>

// Create a lens for the first element of an array
function head<S, T, A, B>(): Lens<S, T, A, B>

// Create a lens for the last element of an array
function last<S, T, A, B>(): Lens<S, T, A, B>
```

### Prism Constructors

```typescript
// Create a prism for the Just constructor of Maybe
function just<S, T, A, B>(): Prism<S, T, A, B>

// Create a prism for the Right constructor of Either
function right<S, T, A, B>(): Prism<S, T, A, B>

// Create a prism for the Left constructor of Either
function left<S, T, A, B>(): Prism<S, T, A, B>

// Create a prism for the Ok constructor of Result
function ok<S, T, A, B>(): Prism<S, T, A, B>

// Create a prism for the Err constructor of Result
function err<S, T, A, B>(): Prism<S, T, A, B>
```

### Traversal Constructors

```typescript
// Create a traversal for all elements of an array
function array<S, T, A, B>(): Traversal<S, T, A, B>

// Create a traversal for all values of an object
function values<S, T, A, B>(): Traversal<S, T, A, B>

// Create a traversal for all keys of an object
function keys<S, T, A, B>(): Traversal<S, T, A, B>
```

## Optic Composition

### Basic Composition

```typescript
// Compose two optics
function compose<P1, P2, S, T, A, B, C, D>(
  outer: Optic<P1, S, T, A, B>,
  inner: Optic<P2, A, B, C, D>
): Optic<any, S, T, C, D>

// Compose multiple optics
function composeMany<P, S, T, A, B>(
  optics: Optic<P, any, any, any, any>[]
): Optic<P, S, T, A, B>
```

### Composition Examples

```typescript
// Compose lenses for nested access
const personLens = lens(
  pwa => pwa.person,
  (pwa, person) => ({ ...pwa, person })
);

const nameLens = lens(
  p => p.name,
  (p, name) => ({ ...p, name })
);

const composedLens = compose(personLens, nameLens);

// Use composed lens
const data = { person: { name: 'Bob', age: 30 } };
const name = view(composedLens, data); // 'Bob'
const newData = set(composedLens, 'Robert', data);
```

## HKT + Purity Integration

### HKT Integration

Optics integrate seamlessly with the Higher-Kinded Types system:

```typescript
// HKT kind for optics
interface OpticK extends Kind2 {
  readonly type: Optic<any, this['arg0'], this['arg1'], any, any>;
}

// Type-safe optic operations
type NumberLens = Lens<Person, Person, number, number>;
const ageLens: NumberLens = lens(p => p.age, (p, age) => ({ ...p, age }));
```

### Purity Integration

Optics preserve purity tracking throughout operations:

```typescript
// Type alias for optic with purity tracking
type OpticWithEffect<S, T, A, B, E extends EffectTag = 'Pure'> = 
  Optic<any, S, T, A, B> & { readonly __effect: E };

// Extract effect from optic
type EffectOfOptic<T> = T extends OpticWithEffect<any, any, any, any, infer E> ? E : 'Pure';

// Check if optic is pure
type IsOpticPure<T> = EffectOfOptic<T> extends 'Pure' ? true : false;
```

## Laws and Properties

### Lens Laws

Lenses must satisfy three fundamental laws:

1. **Get-Put Law**: `set(l, get(l, s), s) === s`
2. **Put-Get Law**: `get(l, set(l, b, s)) === b`
3. **Put-Put Law**: `set(l, b, set(l, b', s)) === set(l, b, s)`

```typescript
// Lens Law 1: set(l, get(l, s), s) === s
const person = { name: 'Bob', age: 30 };
const name = view(nameLens, person);
const result = set(nameLens, name, person);
assertEqual(result, person); // ✅ Law satisfied

// Lens Law 2: get(l, set(l, b, s)) === b
const newName = 'Robert';
const modifiedPerson = set(nameLens, newName, person);
const result2 = view(nameLens, modifiedPerson);
assertEqual(result2, newName); // ✅ Law satisfied
```

### Prism Laws

Prisms must satisfy two fundamental laws:

1. **Match-Build Law**: `match(build(b)) === Left(b)`
2. **Build-Match Law**: `build(match(s)) === s` (when match succeeds)

```typescript
// Prism Law 1: match(build(b)) === Left(b)
const value = 42;
const built = review(rightPrism, value);
const matched = preview(rightPrism, built);
assertEqual(matched, Just(value)); // ✅ Law satisfied
```

### Traversal Laws

Traversals must satisfy the traversal law:

- **Map Law**: `map over traversal === traverse over map`

```typescript
// Traversal Law: map over traversal === traverse over map
const numbers = [1, 2, 3, 4, 5];
const double = (x) => x * 2;

const result1 = map(arrayTraversal, double, numbers);
const result2 = numbers.map(double);
assertEqual(result1, result2); // ✅ Law satisfied
```

## Integration with ADTs

### Maybe Integration

```typescript
// Lens for Maybe value
const maybeValueLens = lens(
  m => m.value,
  (m, value) => ({ ...m, value })
);

// Prism for Just constructor
const justPrism = prism(
  m => m.isJust ? Left(m.value) : Right(m),
  value => Just(value)
);

const maybe = Just(42);
const value = preview(justPrism, maybe); // Just(42)
const newMaybe = review(justPrism, 100); // Just(100)
```

### Either Integration

```typescript
// Prism for Right constructor
const rightPrism = prism(
  e => e.isRight ? Left(e.value) : Right(e),
  value => Right(value)
);

// Prism for Left constructor
const leftPrism = prism(
  e => e.isRight ? Right(e) : Left(e.value),
  value => Left(value)
);

const either = Right(42);
const value = preview(rightPrism, either); // Just(42)
const error = preview(leftPrism, either);  // Nothing()
```

### Result Integration

```typescript
// Prism for Ok constructor
const okPrism = prism(
  r => r.isOk ? Left(r.value) : Right(r),
  value => Ok(value)
);

// Prism for Err constructor
const errPrism = prism(
  r => r.isOk ? Right(r) : Left(r.value),
  value => Err(value)
);

const result = Ok(42);
const value = preview(okPrism, result); // Just(42)
const error = preview(errPrism, result); // Nothing()
```

## Realistic Examples

### Nested Object Manipulation

```typescript
// Complex nested structure
type Company = {
  name: string;
  employees: Array<{
    name: string;
    age: number;
    address: {
      street: string;
      city: string;
      zip: string;
    };
  }>;
};

// Create lenses for nested access
const employeesLens = lens(
  c => c.employees,
  (c, employees) => ({ ...c, employees })
);

const firstEmployeeLens = lens(
  arr => arr[0],
  (arr, employee) => {
    const newArr = [...arr];
    newArr[0] = employee;
    return newArr;
  }
);

const addressLens = lens(
  p => p.address,
  (p, address) => ({ ...p, address })
);

const streetLens = lens(
  a => a.street,
  (a, street) => ({ ...a, street })
);

// Compose lenses for deep access
const deepStreetLens = composeMany([
  employeesLens,
  firstEmployeeLens,
  addressLens,
  streetLens
]);

// Use composed lens
const company = {
  name: 'Acme Corp',
  employees: [{
    name: 'Bob',
    age: 30,
    address: { street: '123 Main St', city: 'Anytown', zip: '12345' }
  }]
};

const street = view(deepStreetLens, company); // '123 Main St'
const newCompany = set(deepStreetLens, '456 Oak Ave', company);
```

### Sum Type Manipulation

```typescript
// Shape type with multiple variants
type Shape = 
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'triangle'; base: number; height: number };

// Prisms for each shape variant
const circlePrism = prism(
  s => s.type === 'circle' ? Left(s.radius) : Right(s),
  radius => ({ type: 'circle', radius })
);

const rectanglePrism = prism(
  s => s.type === 'rectangle' ? Left({ width: s.width, height: s.height }) : Right(s),
  ({ width, height }) => ({ type: 'rectangle', width, height })
);

// Use prisms for safe access
const circle = { type: 'circle', radius: 5 };
const rectangle = { type: 'rectangle', width: 10, height: 20 };

const circleRadius = preview(circlePrism, circle);     // Just(5)
const rectDimensions = preview(rectanglePrism, rectangle); // Just({ width: 10, height: 20 })

const newCircle = review(circlePrism, 10); // { type: 'circle', radius: 10 }
```

### Array Manipulation

```typescript
// Array of people
type Person = { name: string; age: number };

const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
];

// Traversal for all names
const namesTraversal = traversal(
  (f, arr) => arr.map(person => ({ ...person, name: f(person.name) }))
);

// Transform all names to uppercase
const uppercaseNames = map(namesTraversal, name => name.toUpperCase(), people);
// Result: [
//   { name: 'ALICE', age: 25 },
//   { name: 'BOB', age: 30 },
//   { name: 'CHARLIE', age: 35 }
// ]

// Traversal for all ages
const agesTraversal = traversal(
  (f, arr) => arr.map(person => ({ ...person, age: f(person.age) }))
);

// Increment all ages
const olderPeople = map(agesTraversal, age => age + 1, people);
// Result: [
//   { name: 'Alice', age: 26 },
//   { name: 'Bob', age: 31 },
//   { name: 'Charlie', age: 36 }
// ]
```

## Performance Considerations

### Immutability

All optic operations return new instances, preserving immutability:

```typescript
const original = { name: 'Bob', age: 30 };
const modified = set(nameLens, 'Robert', original);

// original is unchanged
assertEqual(original, { name: 'Bob', age: 30 });
assertEqual(modified, { name: 'Robert', age: 30 });
```

### Composition Efficiency

Optic composition is efficient and doesn't create intermediate structures:

```typescript
// Composed lens is as efficient as manual nested access
const deepLens = composeMany([lens1, lens2, lens3, lens4]);
const result = view(deepLens, data); // Single traversal
```

### Lazy Evaluation

Traversals support lazy evaluation for large data structures:

```typescript
// Lazy traversal over large array
const largeArray = Array.from({ length: 1000000 }, (_, i) => i);
const lazyTraversal = traversal(
  (f, arr) => {
    // Only process elements when needed
    return arr.map(f);
  }
);
```

## Best Practices

### 1. Use Appropriate Optics

Choose the right optic for your use case:

```typescript
// Use Lens for guaranteed access
const nameLens = lens(p => p.name, (p, name) => ({ ...p, name }));

// Use Prism for optional access
const rightPrism = prism(
  e => e.isRight ? Left(e.value) : Right(e),
  value => Right(value)
);

// Use Traversal for multiple elements
const arrayTraversal = traversal((f, arr) => arr.map(f));
```

### 2. Compose Optics Effectively

Compose optics for complex data access:

```typescript
// Good: Compose optics for deep access
const deepLens = composeMany([outerLens, middleLens, innerLens]);

// Avoid: Manual nested access
const value = data.outer.middle.inner; // Fragile, not composable
```

### 3. Preserve Type Safety

Leverage TypeScript's type system:

```typescript
// Good: Type-safe optic creation
const nameLens: Lens<Person, Person, string, string> = lens(
  p => p.name,
  (p, name) => ({ ...p, name })
);

// Avoid: Untyped optics
const unsafeLens = lens(
  p => p.anyProperty, // No type safety
  (p, value) => ({ ...p, anyProperty: value })
);
```

### 4. Follow Optic Laws

Ensure your custom optics satisfy the appropriate laws:

```typescript
// Test lens laws
const person = { name: 'Bob', age: 30 };
const name = view(nameLens, person);
const result = set(nameLens, name, person);
assertEqual(result, person); // Lens Law 1
```

## Migration Guide

### From Manual Access

```typescript
// Before: Manual nested access
const street = company.employees[0].address.street;
const newCompany = {
  ...company,
  employees: [
    {
      ...company.employees[0],
      address: {
        ...company.employees[0].address,
        street: 'New Street'
      }
    },
    ...company.employees.slice(1)
  ]
};

// After: Optic-based access
const deepStreetLens = composeMany([employeesLens, firstEmployeeLens, addressLens, streetLens]);
const street = view(deepStreetLens, company);
const newCompany = set(deepStreetLens, 'New Street', company);
```

### From Imperative Updates

```typescript
// Before: Imperative updates
const people = [...originalPeople];
for (let i = 0; i < people.length; i++) {
  people[i] = { ...people[i], name: people[i].name.toUpperCase() };
}

// After: Functional updates with traversals
const namesTraversal = traversal(
  (f, arr) => arr.map(person => ({ ...person, name: f(person.name) }))
);
const updatedPeople = map(namesTraversal, name => name.toUpperCase(), originalPeople);
```

## Conclusion

The Optics Foundations system provides a powerful, type-safe, and composable way to work with nested data structures. Built on the solid mathematical foundation of Profunctors, it integrates seamlessly with the existing HKT and purity systems while providing intuitive APIs for common data manipulation tasks.

Key benefits:
- **Unified Interface**: All optic types share a common profunctor-based foundation
- **Type Safety**: Full TypeScript integration with HKT support
- **Composability**: Optics can be composed to create complex data access patterns
- **Immutability**: All operations preserve immutability
- **Law Compliance**: Built-in support for optic laws and properties
- **Performance**: Efficient implementations with lazy evaluation support

The system is designed to be minimal but extensible, providing the core functionality needed for most data manipulation tasks while allowing for future extensions and optimizations. 