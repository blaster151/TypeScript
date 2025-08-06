# Typeclass Usage Guide

## Overview

This guide covers how to use typeclasses in the FP library, including both the traditional data-last function style and the new fluent method syntax.

## Dual API System

The library provides two complementary API styles for all typeclass operations:

### 1. Fluent Instance Methods (Data-First)

Direct method calls on ADT instances:

```typescript
// Functor operations
const doubled = maybe.map(x => x * 2);
const filtered = maybe.filter(x => x > 10);

// Monad operations
const chained = maybe.chain(x => Just(x.toString()));

// Bifunctor operations
const transformed = either.bimap(
  err => `Error: ${err}`,
  val => val.toUpperCase()
);
```

### 2. Data-Last Standalone Functions (Pipe-Friendly)

Curried functions for use with `pipe()`:

```typescript
import { pipe } from 'fp-ts/function';

// Functor operations
const doubled = pipe(maybe, map(x => x * 2));
const filtered = pipe(maybe, filter(x => x > 10));

// Monad operations
const chained = pipe(maybe, chain(x => Just(x.toString())));

// Bifunctor operations
const transformed = pipe(
  either,
  bimap(err => `Error: ${err}`, val => val.toUpperCase())
);
```

## Automatic Fluent Method Addition

All ADTs automatically get fluent methods when they have registered typeclass instances:

```typescript
import { autoAugmentCoreADTs } from './fp-auto-registration';

// Auto-augment all core ADTs with fluent methods
autoAugmentCoreADTs();

// Now all ADTs have fluent methods
const maybe = Just(42);
const result = maybe
  .map(x => x * 2)
  .filter(x => x > 50)
  .chain(x => Just(x.toString()));
```

## Typeclass Operations

### Functor

**Purpose**: Transform values within a context without changing the context structure.

```typescript
// Fluent style
const doubled = maybe.map(x => x * 2);

// Pipe style
const doubled = pipe(maybe, map(x => x * 2));

// Laws:
// 1. Identity: fa.map(id) === fa
// 2. Composition: fa.map(f).map(g) === fa.map(compose(g, f))
```

### Applicative

**Purpose**: Apply functions within a context to values within the same context.

```typescript
// Fluent style
const result = maybe.ap(Just(x => x * 2));

// Pipe style
const result = pipe(maybe, ap(Just(x => x * 2)));

// Laws:
// 1. Identity: fa.ap(of(id)) === fa
// 2. Homomorphism: of(a).ap(of(f)) === of(f(a))
// 3. Interchange: fa.ap(of(f)) === of(f).ap(fa)
```

### Monad

**Purpose**: Chain computations that may fail or have side effects.

```typescript
// Fluent style
const result = maybe.chain(x => 
  x > 0 ? Just(x * 2) : Nothing
);

// Pipe style
const result = pipe(
  maybe,
  chain(x => x > 0 ? Just(x * 2) : Nothing)
);

// Laws:
// 1. Left Identity: of(a).chain(f) === f(a)
// 2. Right Identity: fa.chain(of) === fa
// 3. Associativity: fa.chain(f).chain(g) === fa.chain(x => f(x).chain(g))
```

### Bifunctor

**Purpose**: Transform both sides of a binary type constructor.

```typescript
// Fluent style
const result = either.bimap(
  err => `Error: ${err}`,
  val => val.toUpperCase()
);

// Pipe style
const result = pipe(
  either,
  bimap(err => `Error: ${err}`, val => val.toUpperCase())
);

// Laws:
// 1. Identity: bimap(id, id) === id
// 2. Composition: bimap(f1, g1).bimap(f2, g2) === bimap(compose(f1, f2), compose(g1, g2))
```

## Standard Typeclasses

### Eq (Equality)

**Purpose**: Define equality for values.

```typescript
// Fluent style
const isEqual = maybe.equals(otherMaybe);

// Pipe style
const isEqual = pipe(maybe, equals(otherMaybe));

// Laws:
// 1. Reflexivity: equals(a, a) === true
// 2. Symmetry: equals(a, b) === equals(b, a)
// 3. Transitivity: equals(a, b) && equals(b, c) => equals(a, c)
```

### Ord (Ordering)

**Purpose**: Define ordering for values (extends Eq).

```typescript
// Fluent style
const comparison = maybe.compare(otherMaybe);

// Pipe style
const comparison = pipe(maybe, compare(otherMaybe));

// Laws:
// 1. Reflexivity: compare(a, a) === 0
// 2. Antisymmetry: compare(a, b) <= 0 && compare(b, a) <= 0 => equals(a, b)
// 3. Transitivity: compare(a, b) <= 0 && compare(b, c) <= 0 => compare(a, c) <= 0
```

### Show (String Representation)

**Purpose**: Convert values to string representation.

```typescript
// Fluent style
const str = maybe.show();

// Pipe style
const str = pipe(maybe, show);

// Laws:
// 1. Consistency: show(a) === show(a) (same input always produces same output)
```

## Automatic Derivation

The library provides automatic derivation for common typeclasses:

```typescript
import { deriveInstances } from './fp-derivation-helpers';

// Derive all instances for a custom ADT
const instances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  bifunctor: true,
  eq: true,
  ord: true,
  show: true
});

// Use individual derivation functions
const functor = deriveFunctorInstance();
const monad = deriveMonadInstance();
const eq = deriveEqInstance();
```

## Custom Derivation

You can provide custom logic for derivation:

```typescript
const customInstances = deriveInstances({
  functor: true,
  customMap: (fa, f) => {
    // Custom mapping logic for your ADT
    return fa.match({
      Success: ({ value }) => Success(f(value)),
      Failure: ({ error }) => Failure(error)
    });
  },
  eq: true,
  customEq: (a, b) => {
    // Custom equality logic
    return a.tag === b.tag && a.value === b.value;
  }
});
```

## Registry Integration

All typeclass instances are automatically registered:

```typescript
import { autoRegisterADT } from './fp-auto-registration';

// Auto-register with custom configuration
const result = autoRegisterADT({
  typeName: 'CustomADT',
  kindName: 'CustomADTK',
  purity: 'Pure',
  functor: true,
  monad: true,
  eq: true
});

// Check registration results
if (result.success) {
  console.log(`Registered: ${result.registered.join(', ')}`);
} else {
  console.log(`Errors: ${result.errors.join(', ')}`);
}
```

## Purity Integration

All typeclass operations preserve purity metadata:

```typescript
// Pure operations
const pureResult = maybe.map(x => x * 2); // Preserves 'Pure'

// Async operations
const asyncResult = observable.map(x => x * 2); // Preserves 'Async'

// Mixed operations
const mixedResult = maybe.chain(x => 
  observable.map(y => x + y)
); // Results in 'Async'
```

## Best Practices

### 1. Choose the Right Style

- **Fluent**: For simple, linear transformations
- **Pipe**: For complex, multi-step transformations

### 2. Leverage Automatic Derivation

```typescript
// Instead of manual instances
export const CustomFunctor: Functor<CustomK> = { /* ... */ };

// Use automatic derivation
const instances = deriveInstances({ functor: true });
```

### 3. Use Type Safety

```typescript
// TypeScript will catch errors
const result = maybe
  .map(x => x.toUpperCase()) // Error if x is not a string
  .chain(x => Just(x.length));
```

### 4. Combine with Optics

```typescript
// Use optics with typeclass operations
const result = maybe
  .map(user => user.name)
  .over(nameLens, name => name.toUpperCase());
```

## Examples

### Complex Transformation Chain

```typescript
// Fluent style
const result = maybe
  .map(x => x * 2)
  .filter(x => x > 10)
  .chain(x => x > 20 ? Just(x) : Nothing)
  .map(x => `Result: ${x}`);

// Pipe style
const result = pipe(
  maybe,
  map(x => x * 2),
  filter(x => x > 10),
  chain(x => x > 20 ? Just(x) : Nothing),
  map(x => `Result: ${x}`)
);
```

### Error Handling

```typescript
// Fluent style
const result = either
  .mapLeft(err => `Error: ${err}`)
  .mapRight(val => val.toUpperCase())
  .chainRight(val => val.length > 5 ? Right(val) : Left('Too short'));

// Pipe style
const result = pipe(
  either,
  mapLeft(err => `Error: ${err}`),
  mapRight(val => val.toUpperCase()),
  chainRight(val => val.length > 5 ? Right(val) : Left('Too short'))
);
```

### Integration with Optics

```typescript
// Use optics within typeclass operations
const result = maybe
  .over(userLens, user => ({ ...user, name: user.name.toUpperCase() }))
  .preview(emailLens)
  .map(email => email.toLowerCase());
```

## Conclusion

The dual API system provides maximum flexibility while maintaining type safety and consistency. Choose the style that best fits your use case, and leverage automatic derivation to reduce boilerplate. 