# Enhanced Optics Core with Full API Parity

This document describes the enhanced optics system with full API parity between Prism/Optional and Lens, providing unified ergonomics, composability, and integration.

## Overview

The enhanced optics system provides complete API parity across all optic types, enabling consistent usage patterns regardless of whether you're working with Lenses, Prisms, or Optionals. This creates a unified, ergonomic experience for data access and transformation.

## Key Features

### Full API Parity
- **Unified Interface**: All optics (Lens, Prism, Optional) share the same core API
- **Consistent Ergonomics**: Same method names and signatures across all optic types
- **Cross-Kind Composition**: Seamless composition between different optic kinds
- **Enhanced Optional Semantics**: Improved Optional operations with additional utilities

### HKT + Purity Integration
- **Type Safety**: Full TypeScript type safety with HKT support
- **Effect Tracking**: Automatic purity tracking for all optic operations
- **Composable Effects**: Effect composition across optic chains

### ADT Integration
- **Pattern Matching**: Native support for ADT variant focusing
- **Automatic Derivation**: Automatic optic generation for ADTs and product types
- **Cross-Type Fusion**: Optics work seamlessly across different data types

## Core API Parity

### Unified Interface

All optics implement the same core interface:

```typescript
interface BaseOptic<S, T, A, B> {
  // Core operations
  over(f: (a: A) => B): (s: S) => T;
  map(f: (a: A) => B): (s: S) => T;
  get(s: S): A | Maybe<A>;
  getOption(s: S): Maybe<A>;
  set(b: B): (s: S) => T;
  modify(f: (a: A) => B): (s: S) => T;
  
  // Composition
  then<C, D>(next: BaseOptic<A, B, C, D>): BaseOptic<S, T, C, D>;
  composeLens<C, D>(lens: Lens<A, B, C, D>): BaseOptic<S, T, C, D>;
  composePrism<C, D>(prism: Prism<A, B, C, D>): BaseOptic<S, T, C, D>;
  composeOptional<C, D>(optional: Optional<A, B, C, D>): BaseOptic<S, T, C, D>;
  
  // Optional-specific operations
  exists(predicate: (a: A) => boolean): (s: S) => boolean;
  forall(predicate: (a: A) => boolean): (s: S) => boolean;
}
```

## Before/After Examples

### Before: Inconsistent APIs

```typescript
// Different APIs for different optic types
const person = { name: 'Alice', age: 25 };
const maybe = Maybe.Just('test');

// Lens operations
const nameLens = lens(
  (p) => p.name,
  (name, p) => ({ ...p, name })
);
const name = view(nameLens, person);
const updated = set(nameLens, 'Bob', person);
const modified = over(nameLens, x => x.toUpperCase(), person);

// Prism operations (different API)
const justPrism = prism(
  (m) => m.tag === 'Just' ? Either.Left(m.value) : Either.Right(m),
  (value) => Maybe.Just(value)
);
const value = preview(justPrism, maybe);
const built = review(justPrism, 'new');

// Optional operations (different API)
const nullableNameOptional = optional(
  (p) => p.name ? Maybe.Just(p.name) : Maybe.Nothing(),
  (name, p) => ({ ...p, name })
);
const maybeName = getOption(nullableNameOptional, person);
const setOptional = setOption(nullableNameOptional, 'Bob', person);
```

### After: Unified API

```typescript
// Same API for all optic types
const person = { name: 'Alice', age: 25 };
const maybe = Maybe.Just('test');

// Lens operations
const nameLens = lens(
  (p) => p.name,
  (name, p) => ({ ...p, name })
);
const name = nameLens.get(person);
const updated = nameLens.set('Bob')(person);
const modified = nameLens.over(x => x.toUpperCase())(person);

// Prism operations (same API)
const justPrism = prism(
  (m) => m.tag === 'Just' ? Either.Left(m.value) : Either.Right(m),
  (value) => Maybe.Just(value)
);
const value = justPrism.get(maybe);
const built = justPrism.set('new')(maybe);
const modified = justPrism.over(x => x.toUpperCase())(maybe);

// Optional operations (same API)
const nullableNameOptional = optional(
  (p) => p.name ? Maybe.Just(p.name) : Maybe.Nothing(),
  (name, p) => ({ ...p, name })
);
const maybeName = nullableNameOptional.get(person);
const setOptional = nullableNameOptional.set('Bob')(person);
const modified = nullableNameOptional.over(x => x.toUpperCase())(person);
```

## Cross-Kind Composition

### Composition Rules

The enhanced system implements proper cross-kind composition rules:

```typescript
// Lens → Lens = Lens
const lensLens = nameLens.composeLens(ageLens);

// Lens → Prism = Optional
const lensPrism = nameLens.composePrism(justPrism);

// Prism → Lens = Optional
const prismLens = justPrism.composeLens(nameLens);

// Prism → Prism = Prism
const prismPrism = justPrism.composePrism(rightPrism);

// Optional → Optional = Optional
const optionalOptional = nullableNameOptional.composeOptional(nullableAgeOptional);
```

### Fluent Composition

All optics support fluent composition with `.then()`:

```typescript
// Before: Manual composition
const complexOptic = compose(
  compose(nameLens, justPrism),
  compose(ageLens, rightPrism)
);

// After: Fluent composition
const complexOptic = nameLens
  .then(justPrism)
  .then(ageLens)
  .then(rightPrism);
```

## Enhanced Optional Semantics

### Additional Operations

Optionals now support enhanced semantics:

```typescript
const nullableNameOptional = optional(
  (p) => p.name ? Maybe.Just(p.name) : Maybe.Nothing(),
  (name, p) => ({ ...p, name })
);

// Existence checking
const hasLongName = nullableNameOptional.exists(name => name.length > 5);
const allNamesLong = nullableNameOptional.forall(name => name.length > 5);

// Safe operations
const nameOrDefault = nullableNameOptional.orElse('Anonymous');
const nameOrComputed = nullableNameOptional.orElseWith(p => `User-${p.id}`);

// Conditional operations
const filteredOptional = nullableNameOptional.filter(name => name.length > 3);
const mappedOrDefault = nullableNameOptional.mapOr('Unknown', name => name.toUpperCase());
```

## ADT Integration

### Automatic Derivation

The system provides automatic derivation for ADTs:

```typescript
// Maybe optics
const maybeOptics = {
  just: deriveLens('value'),
  justPrism: variantPrism('Just'),
  nothingPrism: variantPrism('Nothing'),
  justOptional: deriveOptional('value')
};

// Either optics
const eitherOptics = {
  left: deriveLens('value'),
  right: deriveLens('value'),
  leftPrism: variantPrism('Left'),
  rightPrism: variantPrism('Right'),
  leftOptional: deriveOptional('value'),
  rightOptional: deriveOptional('value')
};

// Result optics
const resultOptics = {
  ok: deriveLens('value'),
  err: deriveLens('error'),
  okPrism: variantPrism('Ok'),
  errPrism: variantPrism('Err'),
  okOptional: deriveOptional('value'),
  errOptional: deriveOptional('error')
};
```

### Pattern Matching Integration

Optics integrate seamlessly with pattern matching:

```typescript
const maybe = Maybe.Just('test');
const justPrism = variantPrism('Just')();

// Pattern matching with optic focus
const result = matchWithOptic(justPrism, {
  Just: (value) => `Found: ${value}`,
  Nothing: () => 'Nothing found'
})(maybe);

// Fluent pattern matching
const result2 = opticMatch(justPrism)({
  Just: (value) => `Found: ${value}`,
  Nothing: () => 'Nothing found'
})(maybe);
```

## Complex Transformations

### Nested Data Access

The unified API enables complex nested transformations:

```typescript
const complexData = {
  users: [
    { name: 'Alice', profile: { email: 'alice@example.com' } },
    { name: 'Bob', profile: { email: 'bob@example.com' } }
  ]
};

const maybeUsers = Maybe.Just(complexData);

// Create optic chain
const usersLens = deriveLens('users')();
const firstUserLens = deriveLens(0)();
const emailLens = deriveLens('email')();

// Complex transformation
const complexOptic = usersLens
  .then(firstUserLens)
  .then(emailLens);

const email = complexOptic.get(maybeUsers);
const upperEmail = complexOptic.over(email => email.toUpperCase())(maybeUsers);
```

### Cross-Type Fusion

Optics work across different data types:

```typescript
const maybePerson = Maybe.Just({ name: 'Alice', age: 25 });
const eitherResult = Either.Right({ status: 'success', data: maybePerson });

// Cross-type optic chain
const dataLens = deriveLens('data')();
const justPrism = variantPrism('Just')();
const nameLens = deriveLens('name')();

const crossTypeOptic = dataLens
  .then(justPrism)
  .then(nameLens);

const name = crossTypeOptic.get(eitherResult);
const upperName = crossTypeOptic.over(name => name.toUpperCase())(eitherResult);
```

## Purity and HKT Integration

### Effect Tracking

All optics automatically track their effects:

```typescript
// Pure operations
const nameLens = lens(
  (p) => p.name,
  (name, p) => ({ ...p, name })
);
console.log(nameLens.__effect); // 'Pure'

// Async operations
const asyncLens = markAsync(nameLens);
console.log(asyncLens.__effect); // 'Async'

// IO operations
const ioLens = markIO(nameLens);
console.log(ioLens.__effect); // 'IO'
```

### Effect Composition

Effects compose automatically across optic chains:

```typescript
const pureLens = markPure(nameLens);
const asyncPrism = markAsync(justPrism);
const ioOptional = markIO(nullableNameOptional);

// Effect composition
const composed = pureLens
  .then(asyncPrism)
  .then(ioOptional);

// Result effect is the composition of all effects
console.log(composed.__effect); // 'IO' (strongest effect)
```

## Performance Considerations

### Lazy Evaluation

Optics support lazy evaluation for performance:

```typescript
// Optics are only evaluated when used
const expensiveOptic = lens(
  (data) => expensiveComputation(data),
  (result, data) => updateWithResult(data, result)
);

// No computation until optic is used
const result = expensiveOptic.get(largeDataset);
```

### Composition Optimization

Multiple optics can be composed efficiently:

```typescript
// Efficient composition without intermediate allocations
const optimizedOptic = optic1
  .then(optic2)
  .then(optic3)
  .then(optic4);

// Single pass through the data
const result = optimizedOptic.get(data);
```

## Best Practices

### 1. Use Appropriate Optic Types

```typescript
// Use Lens for fields that always exist
const nameLens = deriveLens('name')();

// Use Prism for ADT variants
const justPrism = variantPrism('Just')();

// Use Optional for nullable fields
const nullableNameOptional = nullableProp('name')();
```

### 2. Leverage Fluent Composition

```typescript
// Prefer fluent composition over manual composition
const complexOptic = optic1
  .then(optic2)
  .then(optic3);

// Avoid manual composition
const complexOptic = compose(compose(optic1, optic2), optic3);
```

### 3. Use Enhanced Optional Semantics

```typescript
// Use enhanced optional operations for better ergonomics
const result = nullableNameOptional
  .filter(name => name.length > 3)
  .map(name => name.toUpperCase())
  .orElse('Anonymous');
```

### 4. Leverage Automatic Derivation

```typescript
// Use automatic derivation for common patterns
const maybeOptics = MaybeOptics;
const eitherOptics = EitherOptics;
const resultOptics = ResultOptics;

// Instead of manual optic creation
const justPrism = prism(
  (m) => m.tag === 'Just' ? Either.Left(m.value) : Either.Right(m),
  (value) => Maybe.Just(value)
);
```

## Migration Guide

### From Old API to New API

```typescript
// Old API
const name = view(nameLens, person);
const updated = set(nameLens, 'Bob', person);
const modified = over(nameLens, x => x.toUpperCase(), person);

// New API
const name = nameLens.get(person);
const updated = nameLens.set('Bob')(person);
const modified = nameLens.over(x => x.toUpperCase())(person);
```

### From Manual Composition to Fluent Composition

```typescript
// Old API
const composed = compose(nameLens, ageLens);

// New API
const composed = nameLens.then(ageLens);
```

### From Separate APIs to Unified API

```typescript
// Old API - different for each optic type
const lensValue = view(lens, data);
const prismValue = preview(prism, data);
const optionalValue = getOption(optional, data);

// New API - unified across all optic types
const lensValue = lens.get(data);
const prismValue = prism.get(data);
const optionalValue = optional.get(data);
```

## Conclusion

The enhanced optics system provides:

- **Full API Parity**: Consistent interface across all optic types
- **Improved Ergonomics**: Fluent composition and unified operations
- **Enhanced Semantics**: Better Optional operations and ADT integration
- **Type Safety**: Full HKT and purity integration
- **Performance**: Optimized composition and lazy evaluation

This creates a powerful, unified optics system that bridges the gap between theoretical optics and practical programming, providing a robust foundation for functional data manipulation with excellent developer experience. 