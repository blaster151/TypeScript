# Profunctor Optics & Traversals

This document describes the Profunctor-based optics system that follows FP composition laws and integrates with the existing HKT + purity system.

## Overview

Profunctor optics provide a unified, law-abiding approach to lenses, prisms, and traversals based on Profunctor typeclasses. This implementation follows the mathematical foundations of optics while maintaining practical usability.

## Core Concepts

### Profunctor

A **Profunctor** is a bifunctor that is contravariant in its first argument and covariant in its second argument.

```typescript
interface Profunctor<P extends Kind2> {
  dimap<A, B, C, D>(
    pab: Apply<P, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ): Apply<P, [C, D]>;
}
```

### Profunctor Laws

1. **Identity Law**: `dimap(id, id) = id`
2. **Composition Law**: `dimap(f, g) . dimap(h, i) = dimap(h . f, g . i)`

### Strong Profunctor

A **Strong** profunctor can handle product types (tuples).

```typescript
interface Strong<P extends Kind2> extends Profunctor<P> {
  first<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
  second<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[C, A], [C, B]]>;
}
```

### Choice Profunctor

A **Choice** profunctor can handle sum types (Either).

```typescript
interface Choice<P extends Kind2> extends Profunctor<P> {
  left<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
  right<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<C, A>, Either<C, B>]>;
}
```

### Traversing Profunctor

A **Traversing** profunctor can handle traversable structures.

```typescript
interface Traversing<P extends Kind2> extends Profunctor<P> {
  wander<A, B, S, T>(
    pab: Apply<P, [A, B]>,
    f: (s: S) => Apply<ArrayK, [A]>,
    g: (bs: Apply<ArrayK, [B]>) => T
  ): Apply<P, [S, T]>;
}
```

## Optic Types

### General Profunctor Optic

```typescript
type ProfunctorOptic<P extends Kind2, S, T, A, B> = 
  (pab: Apply<P, [A, B]>) => Apply<P, [S, T]>;
```

### Lens

A **Lens** focuses on a single field that always exists, using Strong profunctor.

```typescript
type Lens<S, T, A, B> = ProfunctorOptic<Strong<any>, S, T, A, B>;
```

**Lens Laws:**
1. `view(lens, set(lens, b, s)) = b`
2. `set(lens, view(lens, s), s) = s`
3. `set(lens, b, set(lens, b', s)) = set(lens, b, s)`

### Prism

A **Prism** focuses on an optional branch of a sum type, using Choice profunctor.

```typescript
type Prism<S, T, A, B> = ProfunctorOptic<Choice<any>, S, T, A, B>;
```

**Prism Laws:**
1. `preview(prism, review(prism, b)) = Just(b)`
2. `preview(prism, s) = Just(a) => review(prism, a) = s`

### Traversal

A **Traversal** focuses on zero or more elements, using Traversing profunctor.

```typescript
type Traversal<S, T, A, B> = ProfunctorOptic<Traversing<any>, S, T, A, B>;
```

**Traversal Laws:**
1. `traverse(Identity, Identity, s) = Identity(s)`
2. `traverse(Compose, Compose, s) = Compose(traverse(F, traverse(G, s)))`

### Optional

An **Optional** focuses on a part that may or may not exist.

```typescript
type Optional<S, T, A, B> = ProfunctorOptic<Profunctor<any>, S, T, A, B>;
```

### Iso

An **Iso** represents an isomorphism between two types.

```typescript
type Iso<S, T, A, B> = ProfunctorOptic<Profunctor<any>, S, T, A, B>;
```

## Optic Constructors

### Lens Constructor

```typescript
function lens<S, T, A, B>(
  getter: (s: S) => A,
  setter: (b: B, s: S) => T
): Lens<S, T, A, B>
```

**Example:**
```typescript
const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

// Usage
const person = { name: 'Alice', age: 25 };
const name = view(nameLens, person); // 'Alice'
const updated = set(nameLens, 'Bob', person); // { name: 'Bob', age: 25 }
```

### Prism Constructor

```typescript
function prism<S, T, A, B>(
  match: (s: S) => Either<A, T>,
  build: (b: B) => T
): Prism<S, T, A, B>
```

**Example:**
```typescript
const justPrism = prism(
  (maybe) => maybe.tag === 'Just' ? Either.Left(maybe.value) : Either.Right(maybe),
  (value) => Maybe.Just(value)
);

// Usage
const maybe = Maybe.Just('test');
const value = preview(justPrism, maybe); // Just('test')
const newMaybe = review(justPrism, 'new'); // Just('new')
```

### Traversal Constructor

```typescript
function traversal<S, T, A, B>(
  getAll: (s: S) => A[],
  modifyAll: (f: (a: A) => B, s: S) => T
): Traversal<S, T, A, B>
```

**Example:**
```typescript
const arrayTraversal = traversal(
  (arr) => arr,
  (f, arr) => arr.map(f)
);

// Usage
const numbers = [1, 2, 3, 4, 5];
const doubled = traverse(arrayTraversal, x => x * 2, numbers); // [2, 4, 6, 8, 10]
```

## Optic Operations

### View (Get)

```typescript
function view<S, A>(ln: Lens<S, S, A, A>, s: S): A
```

Extract the focused value from a structure.

### Set

```typescript
function set<S, T, A, B>(ln: Lens<S, T, A, B>, b: B, s: S): T
```

Set the focused value in a structure.

### Over (Modify)

```typescript
function over<S, T, A, B>(ln: Lens<S, T, A, B>, f: (a: A) => B, s: S): T
```

Modify the focused value in a structure.

### Preview

```typescript
function preview<S, A>(pr: Prism<S, S, A, A>, s: S): Maybe<A>
```

Extract the focused value as a Maybe.

### Review

```typescript
function review<S, T, A, B>(pr: Prism<S, T, A, B>, b: B): T
```

Build a structure from the focused value.

### Traverse

```typescript
function traverse<S, T, A, B>(
  tr: Traversal<S, T, A, B>,
  f: (a: A) => B,
  s: S
): T
```

Apply a function to all focused elements.

## Traversal Creation and Operations

### Create Traversal

```typescript
function createTraversal<S extends any[], T extends any[], A, B>(): Traversal<S, T, A, B>
```

Create a traversal for arrays.

**Example:**
```typescript
const arrayTraversal = createTraversal();
const numbers = [1, 2, 3, 4, 5];
const doubled = traverse(arrayTraversal, x => x * 2, numbers);
```

### Chain Traversals

```typescript
function chainTraversal<S, T, A, B, C, D>(
  traversal1: Traversal<S, T, A, B>,
  traversal2: Traversal<A, B, C, D>
): Traversal<S, T, C, D>
```

Compose two traversals.

**Example:**
```typescript
const nested = [[1, 2], [3, 4], [5, 6]];
const innerTraversal = createTraversal();
const outerTraversal = createTraversal();
const chained = chainTraversal(outerTraversal, innerTraversal);

const result = traverse(chained, x => x * 2, nested);
// [[2, 4], [6, 8], [10, 12]]
```

## Automatic Derivation

### Derive Lens

```typescript
function deriveLens<K extends string>(key: K)
```

Automatically derive a lens for a field in a product type.

**Example:**
```typescript
const nameLens = deriveLens('name')();
const ageLens = deriveLens('age')();

const person = { name: 'Alice', age: 25 };
const name = view(nameLens, person); // 'Alice'
const age = view(ageLens, person); // 25
```

### Derive Prism

```typescript
function derivePrism<Tag extends string>(tag: Tag)
```

Automatically derive a prism for a variant in a sum type.

**Example:**
```typescript
const justPrism = derivePrism('Just')();
const leftPrism = derivePrism('Left')();

const maybe = Maybe.Just('test');
const either = Either.Left('error');

const value = preview(justPrism, maybe); // Just('test')
const error = preview(leftPrism, either); // Just('error')
```

### Derive Array Traversal

```typescript
function deriveArrayTraversal<K extends string>(key: K)
```

Automatically derive a traversal for an array field.

**Example:**
```typescript
const hobbiesTraversal = deriveArrayTraversal('hobbies')();

const person = { name: 'Alice', hobbies: ['reading', 'swimming'] };
const upperHobbies = traverse(hobbiesTraversal, h => h.toUpperCase(), person);
// { name: 'Alice', hobbies: ['READING', 'SWIMMING'] }
```

## Composition Laws

### Associativity

```typescript
// (f . g) . h = f . (g . h)
const compose1 = compose(compose(f, g), h);
const compose2 = compose(f, compose(g, h));
// compose1 = compose2
```

### Identity

```typescript
// f . id = f = id . f
const withId1 = compose(f, id);
const withId2 = compose(id, f);
// withId1 = f = withId2
```

### Composition Example

```typescript
const person = { name: 'Alice', age: 25, hobbies: ['reading', 'swimming'] };

const nameLens = deriveLens('name')();
const ageLens = deriveLens('age')();
const hobbiesLens = deriveLens('hobbies')();

// Compose lenses
const nameAndAge = compose(nameLens, ageLens);
const nameAndHobbies = compose(nameLens, hobbiesLens);

// Use composed optics
const nameAge = view(nameAndAge, person);
const nameHobbies = view(nameAndHobbies, person);
```

## Purity Integration

### Mark Pure

```typescript
function markPure<S, T, A, B>(
  optic: ProfunctorOptic<any, S, T, A, B>
): ProfunctorOptic<any, S, T, A, B> & { readonly __effect: 'Pure' }
```

Mark an optic as pure.

### Mark Async

```typescript
function markAsync<S, T, A, B>(
  optic: ProfunctorOptic<any, S, T, A, B>
): ProfunctorOptic<any, S, T, A, B> & { readonly __effect: 'Async' }
```

Mark an optic as async.

### Purity Checking

```typescript
function isPure<S, T, A, B>(optic: ProfunctorOptic<any, S, T, A, B>): boolean
function isAsync<S, T, A, B>(optic: ProfunctorOptic<any, S, T, A, B>): boolean
```

Check the purity of an optic.

**Example:**
```typescript
const nameLens = deriveLens('name')();
const pureLens = markPure(nameLens);
const asyncLens = markAsync(nameLens);

console.log(isPure(pureLens));   // true
console.log(isAsync(asyncLens)); // true
```

## Comparison with Haskell-style Lenses

### Haskell Lens

```haskell
-- Haskell lens definition
type Lens s t a b = forall f. Functor f => (a -> f b) -> s -> f t

-- Haskell lens laws
-- 1. view l (set l b s) = b
-- 2. set l (view l s) s = s
-- 3. set l b (set l b' s) = set l b s
```

### TypeScript Profunctor Lens

```typescript
// TypeScript profunctor lens definition
type Lens<S, T, A, B> = ProfunctorOptic<Strong<any>, S, T, A, B>;

// TypeScript lens laws (same as Haskell)
// 1. view(lens, set(lens, b, s)) = b
// 2. set(lens, view(lens, s), s) = s
// 3. set(lens, b, set(lens, b', s)) = set(lens, b, s)
```

### Key Differences

1. **Type System**: Haskell uses higher-rank types, TypeScript uses Profunctor typeclasses
2. **Composition**: Both support the same composition laws
3. **Laws**: Both follow the same mathematical laws
4. **Performance**: Profunctor approach can be more efficient in some cases

## Advanced Usage

### Complex Transformations

```typescript
const complexData = [
  { name: 'Alice', age: 25, hobbies: ['reading', 'swimming'] },
  { name: 'Bob', age: 30, hobbies: ['coding', 'gaming'] }
];

// Extract and transform names
const nameLens = deriveLens('name')();
const names = complexData.map(person => view(nameLens, person));
const upperNames = names.map(name => name.toUpperCase());

// Transform ages
const ageLens = deriveLens('age')();
const updatedData = complexData.map(person => 
  set(ageLens, person.age + 1, person)
);

// Transform hobbies
const hobbiesLens = deriveLens('hobbies')();
const hobbiesTraversal = createTraversal();
const modifiedData = complexData.map(person => 
  traverse(hobbiesTraversal, h => h.toUpperCase(), 
    view(hobbiesLens, person))
);
```

### Nested Optics

```typescript
const nestedData = {
  users: [
    { name: 'Alice', profile: { email: 'alice@example.com' } },
    { name: 'Bob', profile: { email: 'bob@example.com' } }
  ]
};

// Compose multiple optics
const usersLens = deriveLens('users')();
const userTraversal = createTraversal();
const profileLens = deriveLens('profile')();
const emailLens = deriveLens('email')();

// Extract all emails
const emails = traverse(
  chainTraversal(userTraversal, profileLens),
  profile => view(emailLens, profile),
  view(usersLens, nestedData)
);
```

### Error Handling

```typescript
const safeView = <S, A>(lens: Lens<S, S, A, A>, s: S): Maybe<A> => {
  try {
    return Maybe.Just(view(lens, s));
  } catch (error) {
    return Maybe.Nothing();
  }
};

const safeSet = <S, T, A, B>(
  lens: Lens<S, T, A, B>, 
  b: B, 
  s: S
): Maybe<T> => {
  try {
    return Maybe.Just(set(lens, b, s));
  } catch (error) {
    return Maybe.Nothing();
  }
};
```

## Performance Considerations

### Lazy Evaluation

Profunctor optics support lazy evaluation, only computing when needed.

### Composition Optimization

Multiple optics can be composed efficiently without intermediate allocations.

### Type Safety

Full TypeScript type safety with compile-time checking of optic laws.

## Best Practices

### 1. Use Appropriate Optic Types

- Use **Lens** for fields that always exist
- Use **Prism** for sum type variants
- Use **Traversal** for collections
- Use **Optional** for nullable fields

### 2. Compose Optics Efficiently

```typescript
// Good: Compose optics for clarity
const composed = compose(nameLens, ageLens);

// Avoid: Multiple separate operations
const name = view(nameLens, person);
const age = view(ageLens, name);
```

### 3. Handle Errors Gracefully

```typescript
// Always provide error handling for optic operations
const result = safeView(lens, data);
result.match({
  Just: (value) => console.log('Success:', value),
  Nothing: () => console.log('Failed to access field')
});
```

### 4. Use Automatic Derivation

```typescript
// Use automatic derivation for common cases
const nameLens = deriveLens('name')();
const justPrism = derivePrism('Just')();
const arrayTraversal = createTraversal();
```

## Conclusion

Profunctor optics provide a powerful, law-abiding approach to data access and transformation. They offer:

- **Mathematical foundations** with proven laws
- **Type safety** with full TypeScript integration
- **Performance** through efficient composition
- **Flexibility** through automatic derivation
- **Purity tracking** for effect management

This implementation bridges the gap between theoretical optics and practical programming, providing a robust foundation for functional data manipulation. 