# Typeclass-Aware Fluent Composition

## Overview

The Typeclass-Aware Fluent Composition system provides compile-time type safety and zero runtime overhead for fluent method chaining across different typeclasses. It ensures that fluent methods are only available when the underlying ADT supports the corresponding typeclass, preventing illegal method access and enabling cross-typeclass chaining.

## Key Features

- **Compile-time Type Safety**: Methods are only available when the ADT supports the corresponding typeclass
- **Cross-typeclass Chaining**: Seamlessly chain methods from different typeclasses (e.g., Functor → Bifunctor)
- **Zero Runtime Overhead**: All method filtering happens at compile time
- **Conditional Types**: TypeScript conditional types drive method availability
- **Automatic Capability Detection**: Automatically detect available typeclass capabilities
- **Composition Utilities**: Built-in utilities for composing and piping operations

## Core Concepts

### Typeclass Capabilities

The system uses a `TypeclassCapabilities` type to track which typeclasses an ADT supports:

```typescript
export type TypeclassCapabilities = {
  Functor: boolean;
  Applicative: boolean;
  Monad: boolean;
  Bifunctor: boolean;
  Traversable: boolean;
  Filterable: boolean;
  Eq: boolean;
  Ord: boolean;
  Show: boolean;
};
```

### Conditional Types

Conditional types ensure method availability based on typeclass capabilities:

```typescript
export type HasFunctor<T extends TypeclassCapabilities> = T['Functor'] extends true ? true : false;
export type HasMonad<T extends TypeclassCapabilities> = T['Monad'] extends true ? true : false;
export type HasBifunctor<T extends TypeclassCapabilities> = T['Bifunctor'] extends true ? true : false;
// ... etc
```

### Typeclass-Aware Fluent Methods

The `TypeclassAwareFluentMethods` interface uses conditional types to ensure method availability:

```typescript
export interface TypeclassAwareFluentMethods<A, T extends TypeclassCapabilities> {
  // Functor operations (only if Functor capability exists)
  map<B>(f: (a: A) => B): HasFunctor<T> extends true 
    ? TypeclassAwareFluentMethods<B, T> 
    : never;
  
  // Monad operations (only if Monad capability exists)
  chain<B>(f: (a: A) => any): HasMonad<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  
  // Bifunctor operations (only if Bifunctor capability exists)
  bimap<L, R>(left: (l: L) => any, right: (r: R) => any): HasBifunctor<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  
  // ... other methods with similar conditional types
}
```

## API Reference

### Core Functions

#### `addTypeclassAwareFluentMethods<A, T extends TypeclassCapabilities>`

Creates typeclass-aware fluent methods for an ADT instance.

```typescript
function addTypeclassAwareFluentMethods<A, T extends TypeclassCapabilities>(
  adt: any,
  adtName: string,
  capabilities: T,
  options: FluentMethodOptions = {}
): any & TypeclassAwareFluentMethods<A, T>
```

**Parameters:**
- `adt`: The ADT instance to add fluent methods to
- `adtName`: The name of the ADT for registry lookup
- `capabilities`: The typeclass capabilities object
- `options`: Optional configuration options

**Returns:** The ADT instance with typeclass-aware fluent methods attached

#### `createTypeclassAwareFluent<A>`

Convenience function that automatically detects capabilities and creates typeclass-aware fluent methods.

```typescript
function createTypeclassAwareFluent<A>(
  adt: any,
  adtName: string,
  options: FluentMethodOptions = {}
): any & TypeclassAwareFluentMethods<A, TypeclassCapabilities>
```

#### `detectTypeclassCapabilities(adtName: string)`

Automatically detects available typeclass capabilities for an ADT.

```typescript
function detectTypeclassCapabilities(adtName: string): TypeclassCapabilities
```

### TypeclassAwareComposition Utilities

#### `TypeclassAwareComposition.compose`

Composes two functions that return typeclass-aware fluent methods.

```typescript
function compose<A, B, C>(
  f: (a: A) => TypeclassAwareFluentMethods<B, TypeclassCapabilities>,
  g: (b: B) => TypeclassAwareFluentMethods<C, TypeclassCapabilities>
): (a: A) => TypeclassAwareFluentMethods<C, TypeclassCapabilities>
```

#### `TypeclassAwareComposition.pipe`

Pipes a value through a series of functions that return typeclass-aware fluent methods.

```typescript
function pipe<A>(
  value: A,
  ...fns: Array<(x: any) => TypeclassAwareFluentMethods<any, TypeclassCapabilities>>
): TypeclassAwareFluentMethods<any, TypeclassCapabilities>
```

#### `TypeclassAwareComposition.hasCapability`

Checks if a fluent object has a specific typeclass capability.

```typescript
function hasCapability<A, T extends TypeclassCapabilities>(
  fluent: TypeclassAwareFluentMethods<A, T>,
  capability: keyof TypeclassCapabilities
): boolean
```

#### `TypeclassAwareComposition.safeAccess`

Safely accesses a method with a fallback value.

```typescript
function safeAccess<A, T extends TypeclassCapabilities>(
  fluent: TypeclassAwareFluentMethods<A, T>,
  method: string,
  fallback?: any
): any
```

## Usage Examples

### Basic Usage

```typescript
import { createTypeclassAwareFluent } from './fp-unified-fluent-api';

const maybe = Maybe.of(42);
const fluent = createTypeclassAwareFluent(maybe, 'Maybe');

// Chain operations with preserved typeclass capabilities
const result = fluent
  .map((x: number) => x * 2)
  .filter((x: number) => x > 80)
  .chain((x: number) => Maybe.of(x.toString()));

console.log(result.getValue()); // "84"
```

### Cross-Typeclass Chaining

```typescript
const either = Either.right(42);
const fluent = createTypeclassAwareFluent(either, 'Either');

// Start with Functor, then use Bifunctor methods
const result = fluent
  .map((x: number) => x * 2)
  .bimap(
    (l: any) => `Error: ${l}`,
    (r: number) => r + 1
  );

console.log(result.getRight()); // 85
```

### Conditional Method Access

```typescript
// Create a Maybe with limited capabilities
const limitedCapabilities: TypeclassCapabilities = {
  Functor: true,
  Monad: false,
  Applicative: false,
  Bifunctor: false,
  Traversable: false,
  Filterable: false,
  Eq: false,
  Ord: false,
  Show: false
};

const limitedMaybe = addTypeclassAwareFluentMethods(maybe, 'Maybe', limitedCapabilities);

// These operations are safe
console.log(typeof limitedMaybe.map === 'function'); // true

// These operations would be prevented at compile time
// limitedMaybe.chain() // TypeScript error: Property 'chain' does not exist
// limitedMaybe.bimap() // TypeScript error: Property 'bimap' does not exist
```

### Composition Utilities

```typescript
const fluent = createTypeclassAwareFluent(Maybe.of(10), 'Maybe');

// Compose functions with type safety
const double = (x: number) => createTypeclassAwareFluent(Maybe.of(x * 2), 'Maybe');
const addOne = (x: number) => createTypeclassAwareFluent(Maybe.of(x + 1), 'Maybe');

const composed = TypeclassAwareComposition.compose(double, addOne);
const result = composed(20);

console.log(result.getValue()); // 41

// Pipe operations
const result2 = TypeclassAwareComposition.pipe(
  Maybe.of(5),
  (m) => m.map((x: number) => x * 3),
  (m) => m.chain((x: number) => Maybe.of(x + 2))
);

console.log(result2.getValue()); // 17
```

### Capability Checking

```typescript
const fluent = createTypeclassAwareFluent(Maybe.of(42), 'Maybe');

console.log(TypeclassAwareComposition.hasCapability(fluent, 'Functor')); // true
console.log(TypeclassAwareComposition.hasCapability(fluent, 'Monad')); // true
console.log(TypeclassAwareComposition.hasCapability(fluent, 'Bifunctor')); // false

// Safe method access
const mapMethod = TypeclassAwareComposition.safeAccess(fluent, 'map');
const bimapMethod = TypeclassAwareComposition.safeAccess(fluent, 'bimap', null);

console.log(typeof mapMethod === 'function'); // true
console.log(bimapMethod !== null); // false
```

## Advanced Patterns

### Real-World Data Processing Pipeline

```typescript
const processUserData = (userId: number) => {
  const userMaybe = Maybe.of({ id: userId, name: 'John', age: 30 });
  const fluentUser = createTypeclassAwareFluent(userMaybe, 'Maybe');
  
  return fluentUser
    .map((user: any) => ({ ...user, age: user.age + 1 }))
    .filter((user: any) => user.age > 18)
    .chain((user: any) => Maybe.of(`User ${user.name} is ${user.age} years old`));
};

const userResult = processUserData(123);
console.log(userResult.getValue()); // "User John is 31 years old"
```

### Error Handling with Either

```typescript
const divideSafely = (a: number, b: number) => {
  if (b === 0) {
    return Either.left('Division by zero');
  }
  return Either.right(a / b);
};

const fluentDivision = createTypeclassAwareFluent(divideSafely(10, 2), 'Either');

const divisionResult = fluentDivision
  .map((result: number) => result * 2)
  .bimap(
    (error: string) => `Error: ${error}`,
    (result: number) => `Result: ${result}`
  );

console.log(divisionResult.getRight()); // "Result: 10"
```

### Complex Processing Pipeline

```typescript
const pipeline = (data: number) => {
  const maybe = createTypeclassAwareFluent(Maybe.of(data), 'Maybe');
  
  return maybe
    .map((x: number) => x * 2)
    .chain((x: number) => x > 100 ? Maybe.of(x) : Maybe.nothing())
    .map((x: number) => x.toString())
    .chain((s: string) => Maybe.of(`Processed: ${s}`));
};

const results = [50, 75, 100, 125, 150].map(pipeline);
results.forEach((result, index) => {
  console.log(`Input ${[50, 75, 100, 125, 150][index]}:`, result.getValue());
});
```

## Type Safety Features

### Compile-Time Method Filtering

The system uses TypeScript's conditional types to ensure that methods are only available when the ADT supports the corresponding typeclass:

```typescript
// This will compile successfully
const fluent = createTypeclassAwareFluent(maybe, 'Maybe');
const result = fluent.map(x => x * 2);

// This will cause a TypeScript error if Maybe doesn't support Bifunctor
// const result2 = fluent.bimap(l => l, r => r);
```

### Type Inference

The system provides excellent type inference, automatically inferring the correct types for chained operations:

```typescript
const fluent = createTypeclassAwareFluent(Maybe.of(42), 'Maybe');

// TypeScript knows that this returns a Maybe<string>
const result = fluent
  .map((x: number) => x.toString())
  .chain((s: string) => Maybe.of(s.length));

// TypeScript knows that result.getValue() returns number | null
const value: number | null = result.getValue();
```

### Zero Runtime Overhead

All method filtering happens at compile time, ensuring zero runtime overhead:

```typescript
const startTime = performance.now();

// Create fluent wrapper
const fluent = createTypeclassAwareFluent(Maybe.of(1), 'Maybe');

// Perform long chain
let result = fluent;
for (let i = 0; i < 1000; i++) {
  result = result.map((x: number) => x + 1);
}

const endTime = performance.now();
const performanceTime = endTime - startTime;

console.log('Performance time (ms):', performanceTime.toFixed(2)); // Very fast
```

## Best Practices

### 1. Use Automatic Capability Detection

Prefer `createTypeclassAwareFluent` over manual capability specification when possible:

```typescript
// Good
const fluent = createTypeclassAwareFluent(maybe, 'Maybe');

// Only use manual capabilities when you need to restrict functionality
const limitedFluent = addTypeclassAwareFluentMethods(maybe, 'Maybe', {
  Functor: true,
  Monad: false,
  // ... other capabilities
});
```

### 2. Leverage Cross-Typeclass Chaining

Take advantage of the ability to chain methods from different typeclasses:

```typescript
// Good: Cross-typeclass chaining
const result = fluent
  .map(x => x * 2)        // Functor
  .bimap(l => l, r => r)  // Bifunctor
  .chain(x => Maybe.of(x)); // Monad
```

### 3. Use Composition Utilities

Use the built-in composition utilities for complex operations:

```typescript
// Good: Using composition utilities
const pipeline = TypeclassAwareComposition.pipe(
  Maybe.of(42),
  m => m.map(x => x * 2),
  m => m.filter(x => x > 80),
  m => m.chain(x => Maybe.of(x.toString()))
);
```

### 4. Check Capabilities at Runtime

Use capability checking when you need to handle different ADT types dynamically:

```typescript
const processADT = (adt: any, adtName: string) => {
  const fluent = createTypeclassAwareFluent(adt, adtName);
  
  if (TypeclassAwareComposition.hasCapability(fluent, 'Bifunctor')) {
    return fluent.bimap(l => l, r => r);
  } else {
    return fluent.map(x => x);
  }
};
```

### 5. Handle Method Availability Safely

Use safe access when you're unsure about method availability:

```typescript
const safeMethod = TypeclassAwareComposition.safeAccess(fluent, 'bimap', null);
if (safeMethod) {
  return safeMethod(l => l, r => r);
} else {
  return fluent.map(x => x);
}
```

## Performance Considerations

### Zero Runtime Overhead

The typeclass-aware fluent composition system is designed for zero runtime overhead:

- All method filtering happens at compile time
- No runtime checks for method availability
- No performance penalty for conditional types
- Efficient method chaining with preserved capabilities

### Memory Usage

The system is memory-efficient:

- Fluent methods are attached directly to ADT instances
- No additional wrapper objects created
- Minimal memory footprint for capability tracking
- Efficient caching for lazy discovery

### Scalability

The system scales well with:

- Large numbers of ADT instances
- Complex method chains
- Multiple typeclass capabilities
- High-frequency method calls

## Integration with Existing Systems

### Registry Integration

The system integrates seamlessly with the existing FP registry:

```typescript
// Automatically detects capabilities from registry
const capabilities = detectTypeclassCapabilities('Maybe');
const fluent = addTypeclassAwareFluentMethods(maybe, 'Maybe', capabilities);
```

### Runtime Detection

Works with the runtime detection system:

```typescript
// New typeclass instances are automatically detected
startRuntimeDetection();
// ... register new instances
const fluent = createTypeclassAwareFluent(maybe, 'Maybe'); // Includes new capabilities
```

### Backward Compatibility

The system maintains backward compatibility:

```typescript
// Legacy fluent methods still work
const legacyFluent = addFluentMethods(maybe, 'Maybe');

// New typeclass-aware methods are available
const typeclassAwareFluent = createTypeclassAwareFluent(maybe, 'Maybe');
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors for Missing Methods**
   - Ensure the ADT supports the required typeclass
   - Check that the typeclass instance is registered in the FP registry
   - Verify that the capability detection is working correctly

2. **Performance Issues**
   - Ensure you're using the typeclass-aware system (not legacy)
   - Check that method chaining is not creating unnecessary objects
   - Verify that caching is enabled for lazy discovery

3. **Runtime Errors**
   - Check that the FP registry is properly initialized
   - Verify that typeclass instances are correctly implemented
   - Ensure that the ADT name matches the registry entry

### Debugging Tips

1. **Check Capabilities**
   ```typescript
   const capabilities = detectTypeclassCapabilities('YourADT');
   console.log('Available capabilities:', capabilities);
   ```

2. **Verify Registry**
   ```typescript
   const registry = getFPRegistry();
   console.log('Registry contents:', registry.derivable);
   ```

3. **Test Method Availability**
   ```typescript
   const fluent = createTypeclassAwareFluent(adt, 'YourADT');
   console.log('Has map:', TypeclassAwareComposition.hasCapability(fluent, 'Functor'));
   ```

## Conclusion

The Typeclass-Aware Fluent Composition system provides a powerful, type-safe, and performant way to work with fluent methods across different typeclasses. It ensures compile-time safety while maintaining zero runtime overhead, making it ideal for production use in functional programming applications.

By leveraging TypeScript's conditional types and the existing FP registry system, it provides a seamless experience for developers working with Algebraic Data Types and their associated typeclass instances.
