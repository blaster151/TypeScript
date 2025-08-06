# Profunctor & Optics System

This document provides comprehensive guidance on using the Profunctor typeclass and Optics system with full dual API integration for both fluent and data-last usage.

## Overview

The Profunctor & Optics system provides:
- **Profunctor Typeclass**: Bidirectional transformations for binary type constructors
- **Core Optics**: Lens, Prism, Optional, Iso, Traversal with full type safety
- **Cross-Kind Composition**: `.then(...)` for all optic combinations
- **Dual API**: Both fluent instance methods and data-last standalone functions
- **ADT Integration**: Direct optics usage on ObservableLite and ADTs
- **Purity Integration**: All optics carry `'Pure'` purity tags

## Profunctor Typeclass

### Core Operations

#### `dimap<A, B, C, D>(p: Apply<F, [A, B]>, f: (c: C) => A, g: (b: B) => D): Apply<F, [C, D]>`
Maps functions over both type parameters of a profunctor.

#### `lmap<A, B, C>(p: Apply<F, [A, B]>, f: (c: C) => A): Apply<F, [C, B]>`
Maps a contravariant function over the first type parameter only.

#### `rmap<A, B, D>(p: Apply<F, [A, B]>, g: (b: B) => D): Apply<F, [A, D]>`
Maps a covariant function over the second type parameter only.

### Profunctor Laws

#### Identity Law
```typescript
// dimap id id === id
const identity = x => x;
const result = profunctor.dimap(p, identity, identity);
// result should be equivalent to p
```

#### Composition Law
```typescript
// dimap f g . dimap h i === dimap (f . h) (i . g)
const left = profunctor.dimap(profunctor.dimap(p, h, i), f, g);
const right = profunctor.dimap(p, x => f(h(x)), x => i(g(x)));
// left should be equivalent to right
```

### Profunctor Instances

#### Function Profunctor
```typescript
const FunctionProfunctor: Profunctor<FunctionK> = {
  dimap: (p, f, g) => (c) => g(p(f(c))),
  lmap: (p, f) => (c) => p(f(c)),
  rmap: (p, g) => (a) => g(p(a))
};
```

#### Lens Profunctor
```typescript
const LensProfunctor: Profunctor<Lens<any, any, any, any>> = {
  dimap: (p, f, g) => lens(
    (c) => p.get(f(c)),
    (d, c) => g(p.set(d, f(c)))
  )
};
```

## Core Optics

### Lens

A **Lens** focuses on a part of a structure that always exists.

#### Fluent Style
```typescript
const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

const person = { name: 'Alice', age: 25 };

// Get the focused value
const name = nameLens.get(person); // 'Alice'

// Set the focused value
const updatedPerson = nameLens.set('Bob', person); // { name: 'Bob', age: 25 }

// Transform the focused value
const upperCasePerson = nameLens.over(name => name.toUpperCase(), person); // { name: 'ALICE', age: 25 }
```

#### Data-Last Style
```typescript
import { pipe } from 'fp-ts/function';
import { OpticsAPI } from './fp-profunctor-optics';

// Get the focused value
const name = pipe(person, OpticsAPI.lensGet(nameLens)); // 'Alice'

// Set the focused value
const updatedPerson = pipe(person, OpticsAPI.lensSet(nameLens)('Bob')); // { name: 'Bob', age: 25 }

// Transform the focused value
const upperCasePerson = pipe(person, OpticsAPI.lensOver(nameLens)(name => name.toUpperCase())); // { name: 'ALICE', age: 25 }
```

### Prism

A **Prism** focuses on a part of a structure that may not exist.

#### Fluent Style
```typescript
const justPrism = prism(
  (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
  (value) => ({ tag: 'Just', value })
);

const maybe = { tag: 'Just', value: 5 };

// Preview the focused value (returns Maybe)
const preview = justPrism.preview(maybe); // { tag: 'Just', value: 5 }

// Build a new structure
const newMaybe = justPrism.review(10); // { tag: 'Just', value: 10 }
```

#### Data-Last Style
```typescript
// Preview the focused value
const preview = pipe(maybe, OpticsAPI.prismPreview(justPrism)); // { tag: 'Just', value: 5 }

// Build a new structure
const newMaybe = pipe(10, OpticsAPI.prismReview(justPrism)); // { tag: 'Just', value: 10 }
```

### Optional

An **Optional** focuses on a part that may or may not exist.

#### Fluent Style
```typescript
const ageOptional = optional(
  (person) => person.age > 0 ? { tag: 'Just', value: person.age } : { tag: 'Nothing' },
  (age, person) => ({ ...person, age })
);

const person = { name: 'Alice', age: 25 };

// Get the focused value (returns Maybe)
const age = ageOptional.get(person); // { tag: 'Just', value: 25 }

// Set the focused value
const updatedPerson = ageOptional.set(30, person); // { name: 'Alice', age: 30 }

// Transform the focused value
const doubledPerson = ageOptional.over(age => age * 2, person); // { name: 'Alice', age: 50 }
```

#### Data-Last Style
```typescript
// Get the focused value
const age = pipe(person, OpticsAPI.optionalGet(ageOptional)); // { tag: 'Just', value: 25 }

// Set the focused value
const updatedPerson = pipe(person, OpticsAPI.optionalSet(ageOptional)(30)); // { name: 'Alice', age: 30 }

// Transform the focused value
const doubledPerson = pipe(person, OpticsAPI.optionalOver(ageOptional)(age => age * 2)); // { name: 'Alice', age: 50 }
```

### Iso

An **Iso** represents an isomorphism between two types.

#### Fluent Style
```typescript
const stringIso = iso(
  (str) => str,
  (str) => str
);

const str = 'hello';

// Get the focused value
const value = stringIso.get(str); // 'hello'

// Reverse get
const reversed = stringIso.reverseGet('world'); // 'world'

// Transform the focused value
const upperCase = stringIso.over(str => str.toUpperCase(), str); // 'HELLO'
```

#### Data-Last Style
```typescript
// Get the focused value
const value = pipe(str, OpticsAPI.isoGet(stringIso)); // 'hello'

// Reverse get
const reversed = pipe('world', OpticsAPI.isoReverseGet(stringIso)); // 'world'

// Transform the focused value
const upperCase = pipe(str, OpticsAPI.isoOver(stringIso)(str => str.toUpperCase())); // 'HELLO'
```

### Traversal

A **Traversal** focuses on multiple parts of a structure.

#### Fluent Style
```typescript
const arrayTraversal = traversal(
  (arr) => arr,
  (f, arr) => arr.map(f)
);

const numbers = [1, 2, 3];

// Get all focused values
const allValues = arrayTraversal.getAll(numbers); // [1, 2, 3]

// Transform all focused values
const doubled = arrayTraversal.modifyAll(x => x * 2, numbers); // [2, 4, 6]

// Over operation (same as modifyAll)
const tripled = arrayTraversal.over(x => x * 3, numbers); // [3, 6, 9]

// Collect values
const collected = arrayTraversal.collect(numbers); // [1, 2, 3]
```

#### Data-Last Style
```typescript
// Get all focused values
const allValues = pipe(numbers, OpticsAPI.traversalGetAll(arrayTraversal)); // [1, 2, 3]

// Transform all focused values
const doubled = pipe(numbers, OpticsAPI.traversalModifyAll(arrayTraversal)(x => x * 2)); // [2, 4, 6]

// Over operation
const tripled = pipe(numbers, OpticsAPI.traversalOver(arrayTraversal)(x => x * 3)); // [3, 6, 9]

// Collect values
const collected = pipe(numbers, OpticsAPI.traversalCollect(arrayTraversal)); // [1, 2, 3]
```

## Cross-Kind Composition

The `.then(...)` method provides cross-kind composition with type inference.

### Composition Rules

| First | Second | Result | Example |
|-------|--------|--------|---------|
| Lens | Lens | Lens | `lens1.then(lens2)` |
| Lens | Prism | Optional | `lens.then(prism)` |
| Lens | Optional | Optional | `lens.then(optional)` |
| Lens | Iso | Lens | `lens.then(iso)` |
| Lens | Traversal | Traversal | `lens.then(traversal)` |
| Prism | Lens | Optional | `prism.then(lens)` |
| Prism | Prism | Prism | `prism1.then(prism2)` |
| Prism | Optional | Optional | `prism.then(optional)` |
| Prism | Iso | Prism | `prism.then(iso)` |
| Prism | Traversal | Traversal | `prism.then(traversal)` |
| Optional | *anything* | Optional | `optional.then(any)` |
| Iso | *anything* | *anything* | `iso.then(any)` |
| Traversal | Traversal | Traversal | `traversal1.then(traversal2)` |

### Complex Composition Examples

#### Fluent Style
```typescript
const complexPerson = {
  user: {
    profile: {
      name: 'Alice',
      age: 25
    }
  }
};

// Create optic chain
const userLens = lens(
  (data) => data.user,
  (user, data) => ({ ...data, user })
);

const profileLens = lens(
  (user) => user.profile,
  (profile, user) => ({ ...user, profile })
);

const nameLens = lens(
  (profile) => profile.name,
  (name, profile) => ({ ...profile, name })
);

// Compose optics
const complexOptic = userLens.then(profileLens).then(nameLens);

// Use the composed optic
const name = complexOptic.get(complexPerson); // 'Alice'
const upperCasePerson = complexOptic.over(name => name.toUpperCase(), complexPerson);
// Result: { user: { profile: { name: 'ALICE', age: 25 } } }
```

#### Data-Last Style
```typescript
// Compose optics
const complexOptic = userLens.then(profileLens).then(nameLens);

// Use the composed optic
const name = pipe(complexPerson, OpticsAPI.lensGet(complexOptic)); // 'Alice'
const upperCasePerson = pipe(
  complexPerson, 
  OpticsAPI.lensOver(complexOptic)(name => name.toUpperCase())
);
// Result: { user: { profile: { name: 'ALICE', age: 25 } } }
```

## Common Optics

### Identity Optics
```typescript
// Identity lens
const idLens = <S>(): Lens<S, S, S, S> => lens(
  (s: S) => s,
  (s: S, _: S) => s
);

// Identity prism
const idPrism = <S>(): Prism<S, S, S, S> => prism(
  (s: S) => ({ tag: 'Just', value: s }),
  (s: S) => s
);

// Identity optional
const idOptional = <S>(): Optional<S, S, S, S> => optional(
  (s: S) => ({ tag: 'Just', value: s }),
  (s: S, _: S) => s
);

// Identity iso
const idIso = <S>(): Iso<S, S, S, S> => iso(
  (s: S) => s,
  (s: S) => s
);
```

### Array Traversal
```typescript
const arrayTraversal = <A, B>(): Traversal<A[], B[], A, B> => traversal(
  (arr: A[]) => arr,
  (f: (a: A) => B, arr: A[]) => arr.map(f)
);
```

### Object Traversals
```typescript
// Keys traversal
const keysTraversal = <K extends string, V>(): Traversal<Record<K, V>, Record<K, V>, K, K> => traversal(
  (obj: Record<K, V>) => Object.keys(obj) as K[],
  (f: (k: K) => K, obj: Record<K, V>) => {
    const result = {} as Record<K, V>;
    for (const [key, value] of Object.entries(obj)) {
      const newKey = f(key as K);
      result[newKey] = value;
    }
    return result;
  }
);

// Values traversal
const valuesTraversal = <K extends string, V, W>(): Traversal<Record<K, V>, Record<K, W>, V, W> => traversal(
  (obj: Record<K, V>) => Object.values(obj),
  (f: (v: V) => W, obj: Record<K, V>) => {
    const result = {} as Record<K, W>;
    for (const [key, value] of Object.entries(obj)) {
      result[key as K] = f(value);
    }
    return result;
  }
);
```

## ADT Integration

### ObservableLite Integration

#### Fluent Style
```typescript
const observable = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

// Use optics directly on ObservableLite
const upperCaseNames = observable.over(nameLens, name => name.toUpperCase());
// Result: ObservableLite of [{ name: 'ALICE', age: 25 }, { name: 'BOB', age: 30 }]
```

#### Data-Last Style
```typescript
const upperCaseNames = pipe(
  observable,
  OpticsAPI.lensOver(nameLens)(name => name.toUpperCase())
);
```

### Maybe Integration

#### Fluent Style
```typescript
const maybePerson = Maybe.of({ name: 'Alice', age: 25 });

const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

// Use optics directly on Maybe
const upperCaseName = maybePerson.over(nameLens, name => name.toUpperCase());
// Result: Maybe of { name: 'ALICE', age: 25 }
```

#### Data-Last Style
```typescript
const upperCaseName = pipe(
  maybePerson,
  OpticsAPI.lensOver(nameLens)(name => name.toUpperCase())
);
```

### Either Integration

#### Fluent Style
```typescript
const eitherPerson = Either.right({ name: 'Alice', age: 25 });

const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

// Use optics directly on Either
const upperCaseName = eitherPerson.over(nameLens, name => name.toUpperCase());
// Result: Either.right of { name: 'ALICE', age: 25 }
```

#### Data-Last Style
```typescript
const upperCaseName = pipe(
  eitherPerson,
  OpticsAPI.lensOver(nameLens)(name => name.toUpperCase())
);
```

## Real-World Examples

### Form Validation Pipeline

#### Fluent Style
```typescript
const users = ObservableLite.fromArray([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'invalid-email' },
  { name: 'Charlie', email: 'charlie@test.org' }
]);

const emailLens = lens(
  (user) => user.email,
  (email, user) => ({ ...user, email })
);

const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

const validationResult = users
  .over(emailLens, email => email.toLowerCase())
  .filter(user => user.email.includes('@'))
  .over(nameLens, name => name.toUpperCase())
  .extractValues();

// Result: [{ name: 'ALICE', email: 'alice@example.com' }, { name: 'CHARLIE', email: 'charlie@test.org' }]
```

#### Data-Last Style
```typescript
const validationResult = pipe(
  users,
  OpticsAPI.lensOver(emailLens)(email => email.toLowerCase()),
  filter(user => user.email.includes('@')),
  OpticsAPI.lensOver(nameLens)(name => name.toUpperCase()),
  extractValues()
);
```

### Complex Data Transformation

#### Fluent Style
```typescript
const complexData = ObservableLite.fromArray([
  { user: { profile: { name: 'Alice', age: 25 } } },
  { user: { profile: { name: 'Bob', age: 30 } } }
]);

const userLens = lens(
  (data) => data.user,
  (user, data) => ({ ...data, user })
);

const profileLens = lens(
  (user) => user.profile,
  (profile, user) => ({ ...user, profile })
);

const nameLens = lens(
  (profile) => profile.name,
  (name, profile) => ({ ...profile, name })
);

const result = complexData
  .over(userLens.then(profileLens).then(nameLens), name => name.toUpperCase())
  .extractValues();

// Result: [{ user: { profile: { name: 'ALICE', age: 25 } } }, { user: { profile: { name: 'BOB', age: 30 } } }]
```

#### Data-Last Style
```typescript
const complexOptic = userLens.then(profileLens).then(nameLens);

const result = pipe(
  complexData,
  OpticsAPI.lensOver(complexOptic)(name => name.toUpperCase()),
  extractValues()
);
```

### Error Handling with Optics

#### Fluent Style
```typescript
const data = Either.right({ name: 'Alice', age: 25 });

const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

const result = data
  .over(nameLens, name => name.toUpperCase())
  .bimap(
    error => `Error: ${error}`,
    person => `Success: ${person.name}`
  );

// Result: Either.right of "Success: ALICE"
```

#### Data-Last Style
```typescript
const result = pipe(
  data,
  OpticsAPI.lensOver(nameLens)(name => name.toUpperCase()),
  bimap(
    error => `Error: ${error}`,
    person => `Success: ${person.name}`
  )
);
```

## Purity Integration

All optics operations carry the `'Pure'` purity tag:

```typescript
// All optics are pure
const opticPurity: OpticPurity = 'Pure';

// Purity propagates through composition
const composedOptic = lens1.then(lens2).then(prism1); // Still Pure

// Purity preserved in ADT integration
const result = observable.over(lens, f); // ObservableLite maintains its purity
```

## Registry Integration

The Profunctor and Optics system integrates with the global registry:

```typescript
// Access Profunctor instances
const registry = globalThis.__FP_REGISTRY;
const functionProfunctor = registry.getInstance(Function, 'profunctor');
const lensProfunctor = registry.getInstance(Lens, 'profunctor');

// Access Optics dual API
const opticsAPI = registry.getDualAPI('Optics');

// Use in pipe chains
const result = pipe(
  data,
  opticsAPI.lensOver(lens)(f),
  opticsAPI.prismPreview(prism)
);
```

## Best Practices

### When to Use Each Optic

#### Use Lens When:
- The focused part always exists
- You need to get, set, and transform values
- Working with object properties or array indices

#### Use Prism When:
- The focused part may not exist
- You need to match on specific cases
- Working with sum types or discriminated unions

#### Use Optional When:
- The focused part may or may not exist
- You need fallback behavior
- Working with nullable or optional values

#### Use Iso When:
- You have a bidirectional isomorphism
- Converting between equivalent representations
- Working with reversible transformations

#### Use Traversal When:
- You need to focus on multiple parts
- Working with collections or arrays
- Performing bulk operations

### Performance Considerations

1. **Lazy Evaluation**: Optics only compute when used
2. **Composition Efficiency**: Composed optics are optimized
3. **Type Safety**: Compile-time type checking prevents runtime errors
4. **Memory Efficiency**: Minimal intermediate allocations

### Type Safety Tips

1. **Leverage Type Inference**: Let TypeScript infer optic types
2. **Use Type Annotations**: Add explicit types for complex optics
3. **Check Composition**: Verify optic composition types
4. **Test Both APIs**: Ensure both fluent and data-last APIs work

## Summary

The Profunctor & Optics system provides:

- ✅ **Profunctor Typeclass**: Bidirectional transformations with laws
- ✅ **Core Optics**: Lens, Prism, Optional, Iso, Traversal
- ✅ **Cross-Kind Composition**: `.then(...)` for all combinations
- ✅ **Dual API**: Fluent methods + data-last functions
- ✅ **ADT Integration**: Direct optics usage on ObservableLite and ADTs
- ✅ **Purity Integration**: All optics carry `'Pure'` tags
- ✅ **Type Safety**: Full TypeScript support with type inference
- ✅ **Performance**: Optimized composition and lazy evaluation

This delivers **powerful bidirectional transformations** with **maximum ergonomics** for functional programming in TypeScript! 🚀 