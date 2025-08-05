# Fluent Methods for ADTs

## Overview

The Fluent Methods system provides optional, chainable FP-style method syntax directly to ADT instances (e.g., Maybe, Either, Result, ObservableLite) so developers don't have to use `.pipe()` or standalone helpers. This creates a more ergonomic API while maintaining full HKT and purity compatibility.

## Key Features

- **Opt-in Design**: Enable fluent methods only when needed
- **Type-Safe**: Full TypeScript type inference and safety
- **HKT Compatible**: Works seamlessly with Higher-Kinded Types
- **Purity Preserved**: Maintains purity tracking for all ADTs
- **Centralized Registry**: Uses existing typeclass registry for consistency
- **Immutable Operations**: Each call returns a new instance
- **Bifunctor Support**: Full support for `.bimap` operations

## Core Concepts

### Fluent Methods

Fluent methods are instance methods that provide a more ergonomic alternative to standalone typeclass functions:

```typescript
// Instead of:
const result = map(chain(maybe, x => Just(x * 2)), x => x + 1);

// You can write:
const result = maybe.chain(x => Just(x * 2)).map(x => x + 1);
```

### Opt-in Design

Fluent methods are opt-in, so projects that want to keep instances minimal can skip this feature:

```typescript
// Only enable when needed
const { Just, Nothing } = withMaybeFluentMethods();
const maybe = Just(5).map(x => x * 2); // Now has fluent methods
```

## Core API

### withFluentMethods

The main decorator function that adds fluent methods to ADT constructors:

```typescript
function withFluentMethods<T extends new (...args: any[]) => any>(
  Ctor: T,
  adtName: string,
  options: FluentMethodOptions = {}
): T & { __fluentMethods: true }
```

**Parameters:**
- `Ctor`: ADT constructor to decorate
- `adtName`: Name of the ADT for registry lookup
- `options`: Configuration options for fluent methods

**Returns:** Decorated constructor with fluent methods

### FluentMethodOptions

Configuration options for fluent methods:

```typescript
interface FluentMethodOptions {
  readonly enableMap?: boolean;        // Enable .map method
  readonly enableChain?: boolean;      // Enable .chain method
  readonly enableFilter?: boolean;     // Enable .filter method
  readonly enableBimap?: boolean;      // Enable .bimap method
  readonly enableAp?: boolean;         // Enable .ap method
  readonly enableOf?: boolean;         // Enable .of method
  readonly preservePurity?: boolean;   // Preserve purity tags
  readonly enableTypeInference?: boolean; // Enable type inference
}
```

## ADT-Specific Decorators

### withMaybeFluentMethods

Add fluent methods to Maybe ADT:

```typescript
const { Just, Nothing } = withMaybeFluentMethods();

const result = Just(5)
  .map(x => x + 1)
  .chain(x => Just(x * 2))
  .filter(x => x > 10);
```

### withEitherFluentMethods

Add fluent methods to Either ADT:

```typescript
const { Left, Right } = withEitherFluentMethods();

const result = Right(5)
  .map(x => x + 1)
  .chain(x => Right(x * 2))
  .bimap(
    err => `Error: ${err}`,
    val => val + 1
  );
```

### withResultFluentMethods

Add fluent methods to Result ADT:

```typescript
const { Ok, Err } = withResultFluentMethods();

const result = Ok(5)
  .map(x => x + 1)
  .chain(x => Ok(x * 2))
  .bimap(
    err => `Error: ${err}`,
    val => val + 1
  );
```

### withObservableLiteFluentMethods

Add fluent methods to ObservableLite ADT:

```typescript
const DecoratedObservableLite = withObservableLiteFluentMethods();

const result = DecoratedObservableLite.fromArray([1, 2, 3])
  .map(x => x * 2)
  .filter(x => x > 2)
  .chain(x => DecoratedObservableLite.fromArray([x, x + 1]));
```

## Available Methods

### .map (Functor)

Transform values in the ADT:

```typescript
// Maybe
Just(5).map(x => x * 2); // Just(10)

// Either
Right(5).map(x => x * 2); // Right(10)
Left('error').map(x => x * 2); // Left('error')

// Result
Ok(5).map(x => x * 2); // Ok(10)
Err('error').map(x => x * 2); // Err('error')

// ObservableLite
ObservableLite.fromArray([1, 2, 3]).map(x => x * 2); // [2, 4, 6]
```

### .chain (Monad)

Flatten nested ADTs:

```typescript
// Maybe
Just(5).chain(x => Just(x * 2)); // Just(10)
Nothing().chain(x => Just(x * 2)); // Nothing()

// Either
Right(5).chain(x => Right(x * 2)); // Right(10)
Left('error').chain(x => Right(x * 2)); // Left('error')

// Result
Ok(5).chain(x => Ok(x * 2)); // Ok(10)
Err('error').chain(x => Ok(x * 2)); // Err('error')

// ObservableLite
ObservableLite.fromArray([1, 2]).chain(x => 
  ObservableLite.fromArray([x, x * 2])
); // [1, 2, 2, 4]
```

### .filter

Filter values based on a predicate:

```typescript
// Maybe
Just(5).filter(x => x > 3); // Just(5)
Just(2).filter(x => x > 3); // Nothing()

// Either
Right(5).filter(x => x > 3); // Right(5)
Right(2).filter(x => x > 3); // Left('filtered out')

// Result
Ok(5).filter(x => x > 3); // Ok(5)
Ok(2).filter(x => x > 3); // Err('filtered out')

// ObservableLite
ObservableLite.fromArray([1, 2, 3, 4, 5])
  .filter(x => x % 2 === 0); // [2, 4]
```

### .bimap (Bifunctor)

Transform both sides of bifunctor ADTs:

```typescript
// Either
Right(5).bimap(
  err => `Error: ${err}`,
  val => val * 2
); // Right(10)

Left('test').bimap(
  err => `Error: ${err}`,
  val => val * 2
); // Left('Error: test')

// Result
Ok(5).bimap(
  err => `Error: ${err}`,
  val => val * 2
); // Ok(10)

Err('test').bimap(
  err => `Error: ${err}`,
  val => val * 2
); // Err('Error: test')
```

### .ap (Applicative)

Apply a function in an ADT to a value in an ADT:

```typescript
// Maybe
Just((x: number) => x * 2).ap(Just(5)); // Just(10)

// Either
Right((x: number) => x * 2).ap(Right(5)); // Right(10)

// Result
Ok((x: number) => x * 2).ap(Ok(5)); // Ok(10)
```

### .of (Applicative)

Create an ADT with a single value:

```typescript
// Maybe
Maybe.of(5); // Just(5)

// Either
Either.of(5); // Right(5)

// Result
Result.of(5); // Ok(5)
```

## Type Inference

Fluent methods preserve full TypeScript type inference:

```typescript
const { Just } = withMaybeFluentMethods();

const result = Just(5)
  .map((x: number) => x + 1)        // Maybe<number>
  .map((x: number) => x.toString()) // Maybe<string>
  .map((x: string) => x.length);    // Maybe<number>

// TypeScript correctly infers the final type as Maybe<number>
```

## Purity Preservation

Fluent methods preserve purity tags for all ADTs:

```typescript
// Maybe - preserves 'Pure' effect
const maybe = Just(5).map(x => x + 1);
// Type: Maybe<number> with 'Pure' effect

// Either - preserves 'Pure' effect
const either = Right(5).map(x => x + 1);
// Type: Either<string, number> with 'Pure' effect

// ObservableLite - preserves 'Async' effect
const obs = ObservableLite.fromArray([1, 2, 3]).map(x => x + 1);
// Type: ObservableLite<number> with 'Async' effect
```

## Global Configuration

### enableGlobalFluentMethods

Enable fluent methods for all ADTs globally:

```typescript
// Enable with default options
enableGlobalFluentMethods();

// Enable with custom options
enableGlobalFluentMethods({
  enableMap: true,
  enableChain: true,
  enableFilter: true,
  enableBimap: true,
  preservePurity: true
});
```

### disableGlobalFluentMethods

Disable global fluent methods:

```typescript
disableGlobalFluentMethods();
```

### isGlobalFluentMethodsEnabled

Check if global fluent methods are enabled:

```typescript
if (isGlobalFluentMethodsEnabled()) {
  // Use fluent methods
  const result = Just(5).map(x => x + 1);
}
```

## Registry Integration

### Centralized Typeclass Lookup

Fluent methods use the existing typeclass registry for consistency:

```typescript
// Register typeclass instances
registerFluentMethodInstances('MyADT', {
  Functor: myADTFunctor,
  Monad: myADTMonad,
  Bifunctor: myADTBifunctor
});

// Use fluent methods
const DecoratedMyADT = withFluentMethods(MyADT, 'MyADT');
```

### getFluentMethodInstances

Retrieve registered typeclass instances:

```typescript
const instances = getFluentMethodInstances('Maybe');
if (instances?.Functor) {
  // Use Functor instance
}
```

## Utility Functions

### hasFluentMethods

Check if a constructor has fluent methods:

```typescript
if (hasFluentMethods(Maybe)) {
  // Maybe has fluent methods
}
```

### withoutFluentMethods

Remove fluent methods from a constructor:

```typescript
const DecoratedMaybe = withFluentMethods(Maybe, 'Maybe');
const PlainMaybe = withoutFluentMethods(DecoratedMaybe);
```

### hasInstanceFluentMethods

Check if an instance has fluent methods:

```typescript
const maybe = Just(5);
if (hasInstanceFluentMethods(maybe)) {
  // Instance has fluent methods
}
```

### getAvailableFluentMethods

Get available fluent methods for an instance:

```typescript
const maybe = Just(5);
const methods = getAvailableFluentMethods(maybe);
// ['map', 'chain', 'filter']
```

### createFluentMethodDecorator

Create a custom fluent method decorator:

```typescript
const decorator = createFluentMethodDecorator('MyADT', {
  Functor: myFunctor,
  Monad: myMonad
});

const DecoratedMyADT = decorator(MyADT);
```

## Realistic Examples

### User Data Processing with Maybe

```typescript
const { Just, Nothing } = withMaybeFluentMethods();

// Simulate user data processing
const getUser = (id: number) => 
  id > 0 ? Just({ id, name: `User ${id}` }) : Nothing();

const getProfile = (user: { id: number; name: string }) => 
  Just({ ...user, email: `${user.name.toLowerCase().replace(' ', '.')}@example.com` });

const validateEmail = (profile: { id: number; name: string; email: string }) => 
  profile.email.includes('@') ? Just(profile) : Nothing();

const result = getUser(5)
  .chain(getProfile)
  .chain(validateEmail)
  .map(profile => `Welcome, ${profile.name}!`);

// Result: Just('Welcome, User 5!')
```

### API Call Processing with Either

```typescript
const { Left, Right } = withEitherFluentMethods();

// Simulate API call processing
const fetchUser = (id: number) => 
  id > 0 ? Right({ id, name: `User ${id}` }) : Left('Invalid user ID');

const fetchPosts = (user: { id: number; name: string }) => 
  Right([{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }]);

const processPosts = (posts: Array<{ id: number; title: string }>) => 
  Right(posts.map(post => ({ ...post, processed: true })));

const result = fetchUser(5)
  .chain(fetchPosts)
  .chain(processPosts)
  .map(posts => `${posts.length} posts processed`);

// Result: Right('2 posts processed')
```

### Event Stream Processing with ObservableLite

```typescript
const DecoratedObservableLite = withObservableLiteFluentMethods();

// Simulate event stream processing
const events = DecoratedObservableLite.fromArray([
  { type: 'click', x: 100, y: 200, timestamp: 1000 },
  { type: 'move', x: 150, y: 250, timestamp: 1001 },
  { type: 'click', x: 200, y: 300, timestamp: 1002 },
  { type: 'scroll', delta: 10, timestamp: 1003 }
]);

const result = events
  .filter(event => event.type === 'click')
  .map(event => ({ x: event.x, y: event.y, time: event.timestamp }))
  .map(coords => `Click at (${coords.x}, ${coords.y}) at ${coords.time}ms`)
  .take(2);

// Result: ['Click at (100, 200) at 1000ms', 'Click at (200, 300) at 1002ms']
```

## Integration with Existing FP System

### Typeclass Compatibility

Fluent methods work seamlessly with existing typeclass instances:

```typescript
import { MaybeFunctor, MaybeMonad } from './fp-typeclasses';

// Register existing instances
registerFluentMethodInstances('Maybe', {
  Functor: MaybeFunctor,
  Monad: MaybeMonad
});

// Use fluent methods
const { Just } = withMaybeFluentMethods();
const result = Just(5).map(x => x + 1).chain(x => Just(x * 2));
```

### HKT Integration

Full compatibility with Higher-Kinded Types:

```typescript
import { Apply, MaybeK } from './fp-hkt';

// Type-safe HKT operations with fluent methods
type NumberMaybe = Apply<MaybeK, [number]>;
const maybe: NumberMaybe = Just(5);
const result = maybe.map(x => x + 1); // Type-safe
```

### Purity System Integration

Preserves purity tracking throughout:

```typescript
import { EffectOf, IsPure } from './fp-purity';

// Purity is preserved
const maybe = Just(5).map(x => x + 1);
type Effect = EffectOf<typeof maybe>; // 'Pure'
type IsPureType = IsPure<typeof maybe>; // true
```

## Best Practices

### 1. Opt-in Usage

Only enable fluent methods when they provide value:

```typescript
// Good: Enable only when needed
const { Just, Nothing } = withMaybeFluentMethods();

// Avoid: Enabling globally unless necessary
enableGlobalFluentMethods();
```

### 2. Type Safety

Leverage TypeScript's type inference:

```typescript
// Good: Let TypeScript infer types
const result = Just(5)
  .map(x => x + 1)
  .map(x => x.toString());

// Avoid: Explicit type annotations when not needed
const result: Maybe<string> = Just(5)
  .map((x: number) => x + 1)
  .map((x: number) => x.toString());
```

### 3. Method Chaining

Use method chaining for complex operations:

```typescript
// Good: Clear, readable chaining
const result = maybe
  .filter(x => x > 0)
  .map(x => x * 2)
  .chain(x => Just(x + 1));

// Avoid: Nested function calls
const result = chain(
  map(
    filter(maybe, x => x > 0),
    x => x * 2
  ),
  x => Just(x + 1)
);
```

### 4. Error Handling

Use appropriate ADTs for error handling:

```typescript
// Good: Use Either for operations that can fail
const result = fetchUser(id)
  .chain(user => fetchPosts(user.id))
  .map(posts => posts.length);

// Avoid: Throwing exceptions in pure functions
const result = Just(fetchUserSync(id))
  .map(user => fetchPostsSync(user.id))
  .map(posts => posts.length);
```

## Performance Considerations

### Immutability

All fluent methods return new instances:

```typescript
const original = Just(5);
const transformed = original.map(x => x + 1);

// original is unchanged
assertEqual(original, Just(5));
assertEqual(transformed, Just(6));
```

### Lazy Evaluation

ObservableLite maintains lazy evaluation:

```typescript
const obs = ObservableLite.fromArray([1, 2, 3])
  .map(x => x * 2)
  .filter(x => x > 2);

// No computation until subscription
const values = await collectValues(obs); // Now computation happens
```

### Memory Efficiency

Fluent methods are lightweight wrappers:

```typescript
// Minimal overhead
const maybe = Just(5);
const result = maybe.map(x => x + 1); // Just a function call
```

## Migration Guide

### From Standalone Functions

```typescript
// Before: Standalone functions
import { map, chain, filter } from './fp-typeclasses';

const result = filter(
  chain(
    map(maybe, x => x + 1),
    x => Just(x * 2)
  ),
  x => x > 10
);

// After: Fluent methods
const { Just } = withMaybeFluentMethods();

const result = maybe
  .map(x => x + 1)
  .chain(x => Just(x * 2))
  .filter(x => x > 10);
```

### From .pipe() Syntax

```typescript
// Before: .pipe() syntax
import { pipe } from 'fp-ts/function';

const result = pipe(
  maybe,
  map(x => x + 1),
  chain(x => Just(x * 2)),
  filter(x => x > 10)
);

// After: Fluent methods
const { Just } = withMaybeFluentMethods();

const result = maybe
  .map(x => x + 1)
  .chain(x => Just(x * 2))
  .filter(x => x > 10);
```

## Troubleshooting

### Common Issues

1. **Type Inference Not Working**
   ```typescript
   // Ensure proper type annotations
   const maybe: Maybe<number> = Just(5);
   const result = maybe.map(x => x + 1); // TypeScript can infer types
   ```

2. **Methods Not Available**
   ```typescript
   // Check if fluent methods are enabled
   if (hasFluentMethods(Maybe)) {
     // Methods are available
   } else {
     // Enable fluent methods first
     const { Just } = withMaybeFluentMethods();
   }
   ```

3. **Purity Tags Lost**
   ```typescript
   // Ensure purity preservation is enabled
   const { Just } = withMaybeFluentMethods({
     preservePurity: true
   });
   ```

### Debugging

Use utility functions for debugging:

```typescript
// Check available methods
const methods = getAvailableFluentMethods(maybe);
console.log('Available methods:', methods);

// Validate method chains
const chain = [
  { method: 'map', args: [x => x + 1] },
  { method: 'chain', args: [x => Just(x * 2)] }
];
const isValid = validateFluentMethodChain(chain);
console.log('Chain is valid:', isValid);
```

## Conclusion

Fluent methods provide an ergonomic, type-safe way to work with ADTs while maintaining full compatibility with the existing functional programming infrastructure. They offer a bridge between traditional functional programming patterns and more familiar object-oriented syntax, making functional programming more accessible without sacrificing type safety or purity.

The opt-in design ensures that projects can choose the level of abstraction that works best for their needs, while the centralized registry integration ensures consistency across the entire codebase. 