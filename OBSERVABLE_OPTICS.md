# Observable-Optic Integration & Streaming Pattern Matching

This document describes the first-class optics support for ObservableLite, enabling live pattern matching and data transformation in reactive streams.

## Overview

The Observable-Optic integration provides seamless optics support for reactive streams, allowing you to:

- Transform data using lenses, prisms, and optionals in real-time
- Pattern match over GADTs and ADTs in streams
- Compose optics for complex transformations
- Filter streams based on optic focus
- Maintain type safety and purity throughout

## Core Features

### 1. Optic Operations on ObservableLite

#### `.over(optic, fn)` - Transform focused values
```typescript
// Transform names to uppercase using a lens
const people$ = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

people$.over(nameLens, name => name.toUpperCase())
  .subscribe(console.log);
// Output: { name: 'ALICE', age: 25 }, { name: 'BOB', age: 30 }
```

#### `.preview(optic)` - Extract focused values
```typescript
// Extract only names from people
people$.preview(nameLens)
  .subscribe(console.log);
// Output: 'Alice', 'Bob'
```

#### `.set(optic, value)` - Set focused values
```typescript
// Set all names to 'Anonymous'
people$.set(nameLens, 'Anonymous')
  .subscribe(console.log);
// Output: { name: 'Anonymous', age: 25 }, { name: 'Anonymous', age: 30 }
```

#### `.modify(optic, fn)` - Modify focused values
```typescript
// Add exclamation mark to names
people$.modify(nameLens, name => name + '!')
  .subscribe(console.log);
// Output: { name: 'Alice!', age: 25 }, { name: 'Bob!', age: 30 }
```

#### `.getOption(optic)` - Get focused values as Maybe
```typescript
// Get names as Maybe values
people$.getOption(nameLens)
  .subscribe(console.log);
// Output: Just('Alice'), Just('Bob')
```

#### `.filterOptic(optic)` - Filter based on optic focus
```typescript
// Only emit values where optional focuses successfully
const peopleWithNulls$ = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: null, age: 30 },
  { name: 'Bob', age: 35 }
]);

peopleWithNulls$.filterOptic(nameOptional)
  .subscribe(console.log);
// Output: { name: 'Alice', age: 25 }, { name: 'Bob', age: 35 }
```

### 2. Pattern Matching in Streams

#### `.subscribeMatch(cases)` - Pattern match over GADTs
```typescript
// Pattern match over Maybe values
const maybes$ = ObservableLite.fromArray([
  Maybe.Just('Alice'),
  Maybe.Nothing(),
  Maybe.Just('Bob')
]);

maybes$.subscribeMatch({
  Just: (value) => `Found: ${value}`,
  Nothing: () => 'Nothing found'
}).subscribe(console.log);
// Output: 'Found: Alice', 'Nothing found', 'Found: Bob'
```

#### Pattern matching with Either
```typescript
const eithers$ = ObservableLite.fromArray([
  Either.Left('error1'),
  Either.Right('success1'),
  Either.Left('error2')
]);

eithers$.subscribeMatch({
  Left: (error) => `Error: ${error}`,
  Right: (value) => `Success: ${value}`
}).subscribe(console.log);
// Output: 'Error: error1', 'Success: success1', 'Error: error2'
```

#### Pattern matching with Result
```typescript
const results$ = ObservableLite.fromArray([
  Result.Ok('data1'),
  Result.Err('error1'),
  Result.Ok('data2')
]);

results$.subscribeMatch({
  Ok: (value) => `Data: ${value}`,
  Err: (error) => `Error: ${error}`
}).subscribe(console.log);
// Output: 'Data: data1', 'Error: error1', 'Data: data2'
```

### 3. Optic Composition

#### `.composeOptic(optic1, optic2, fn)` - Compose multiple optics
```typescript
// Compose lens with lens
people$.composeOptic(nameLens, ageLens, (name, age) => `${name} is ${age}`)
  .subscribe(console.log);
// Output: 'Alice is 25', 'Bob is 30'

// Compose prism with lens
const maybes$ = ObservableLite.fromArray([
  Maybe.Just({ name: 'Alice', age: 25 }),
  Maybe.Nothing(),
  Maybe.Just({ name: 'Bob', age: 30 })
]);

maybes$.composeOptic(justPrism, nameLens, (person, name) => `${name} from person`)
  .subscribe(console.log);
// Output: 'Alice from person', 'Bob from person'
```

### 4. Helper Functions

#### `overWithLens(observable, lens, fn)`
```typescript
import { overWithLens } from './fp-observable-optics';

overWithLens(people$, nameLens, name => name.toUpperCase())
  .subscribe(console.log);
```

#### `previewWithPrism(observable, prism)`
```typescript
import { previewWithPrism } from './fp-observable-optics';

previewWithPrism(maybes$, justPrism)
  .subscribe(console.log);
```

#### `matchWithGADT(observable, cases)`
```typescript
import { matchWithGADT } from './fp-observable-optics';

matchWithGADT(maybes$, {
  Just: (value) => `Found: ${value}`,
  Nothing: () => 'Nothing found'
}).subscribe(console.log);
```

## Advanced Usage

### Complex Transformations

#### Multi-step optic transformations
```typescript
// Extract person from Maybe, then extract name, then transform
complexData$.preview(justPrism)     // Extract person from Maybe
  .preview(nameLens)                // Extract name from person
  .map(name => name.toUpperCase())  // Transform name
  .subscribe(console.log);
```

#### Filter and transform
```typescript
// Only transform Just values
complexData$.filterOptic(justPrism)           // Only Just values
  .over(justPrism, person => ({               // Transform person
    ...person,
    age: person.age + 1                       // Increment age
  }))
  .subscribe(console.log);
```

### Error Handling

#### Safe optic operations
```typescript
people$.over(nameLens, name => {
  if (name === 'Bob') throw new Error('Bob is not allowed');
  return name.toUpperCase();
}).subscribe({
  next: console.log,
  error: (error) => console.error('Optic error:', error.message)
});
```

### Purity Integration

#### Effect tagging
```typescript
import { markPure, markAsync, isPure, isAsync } from './fp-observable-optics';

// Mark operations as pure or async
const pureObs = markPure(people$.preview(nameLens));
const asyncObs = markAsync(people$.over(nameLens, name => name.toUpperCase()));

console.log(isPure(pureObs));   // true
console.log(isAsync(asyncObs)); // true
```

## Optic Types Supported

### 1. Lens
- **Purpose**: Focus on a part of a structure that always exists
- **Operations**: `get`, `set`, `over`
- **Example**: Accessing a field in an object

```typescript
const nameLens = {
  get: (person) => person.name,
  set: (name, person) => ({ ...person, name })
};
```

### 2. Prism
- **Purpose**: Focus on a part of a structure that may not exist
- **Operations**: `match`, `build`
- **Example**: Accessing a variant in a sum type

```typescript
const justPrism = {
  match: (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
  build: (value) => Maybe.Just(value)
};
```

### 3. Optional
- **Purpose**: Focus on a part that may or may not exist
- **Operations**: `getOption`, `set`
- **Example**: Accessing a nullable field

```typescript
const nameOptional = {
  getOption: (person) => person.name ? { tag: 'Just', value: person.name } : { tag: 'Nothing' },
  set: (name, person) => ({ ...person, name })
};
```

### 4. Traversal
- **Purpose**: Focus on multiple parts of a structure
- **Operations**: `getAll`, `modifyAll`
- **Example**: Accessing all elements in a collection

### 5. Iso
- **Purpose**: Bidirectional transformation between types
- **Operations**: `get`, `reverseGet`
- **Example**: Converting between different representations

## Type Safety

### Compile-time exhaustiveness checking
```typescript
// TypeScript will ensure all cases are handled
maybes$.subscribeMatch({
  Just: (value) => `Found: ${value}`,
  Nothing: () => 'Nothing found'
  // TypeScript error if cases are missing
});
```

### Type inference
```typescript
// Type inference works correctly
const names$ = people$.preview(nameLens); // ObservableLite<string>
const ages$ = people$.preview(ageLens);   // ObservableLite<number>
```

## Performance Considerations

### Lazy evaluation
- Optics are applied only when values are emitted
- No unnecessary computations
- Memory efficient for large streams

### Composition optimization
- Multiple optics can be composed efficiently
- Intermediate results are not stored unnecessarily
- Stream processing remains reactive

## Best Practices

### 1. Use appropriate optic types
- Use **Lens** for fields that always exist
- Use **Prism** for sum type variants
- Use **Optional** for nullable fields
- Use **Traversal** for collections

### 2. Compose optics for complex transformations
```typescript
// Good: Compose optics for clarity
people$.composeOptic(nameLens, ageLens, (name, age) => `${name} is ${age}`)

// Avoid: Multiple separate operations
people$.preview(nameLens).map(name => ...)
```

### 3. Handle errors gracefully
```typescript
// Always provide error handlers for optic operations
observable.over(optic, fn).subscribe({
  next: console.log,
  error: (error) => console.error('Optic error:', error)
});
```

### 4. Use pattern matching for GADTs
```typescript
// Use .subscribeMatch() for GADT pattern matching
observable.subscribeMatch({
  Just: (value) => ...,
  Nothing: () => ...
});
```

## Integration with Existing Code

### Migration from manual transformations
```typescript
// Before: Manual transformation
people$.map(person => ({ ...person, name: person.name.toUpperCase() }))

// After: Optic-based transformation
people$.over(nameLens, name => name.toUpperCase())
```

### Integration with existing optics
```typescript
// Works with existing optic definitions
import { nameLens, ageLens } from './existing-optics';

people$.over(nameLens, name => name.toUpperCase())
  .over(ageLens, age => age + 1)
  .subscribe(console.log);
```

## Examples

### Real-world scenarios

#### 1. Form validation
```typescript
const formData$ = ObservableLite.fromArray([
  { name: 'Alice', email: 'alice@example.com', age: 25 },
  { name: '', email: 'invalid', age: -5 },
  { name: 'Bob', email: 'bob@example.com', age: 30 }
]);

// Validate and transform form data
formData$.over(nameLens, name => name.trim())
  .over(emailLens, email => email.toLowerCase())
  .over(ageLens, age => Math.max(0, age))
  .subscribe(console.log);
```

#### 2. API response processing
```typescript
const apiResponses$ = ObservableLite.fromArray([
  Maybe.Just({ data: { user: { name: 'Alice' } } }),
  Maybe.Nothing(),
  Maybe.Just({ data: { user: { name: 'Bob' } } })
]);

// Extract and transform user names
apiResponses$.preview(justPrism)
  .preview(dataLens)
  .preview(userLens)
  .preview(nameLens)
  .map(name => name.toUpperCase())
  .subscribe(console.log);
```

#### 3. Error handling in streams
```typescript
const operations$ = ObservableLite.fromArray([
  Result.Ok('success1'),
  Result.Err('error1'),
  Result.Ok('success2')
]);

// Handle success and error cases
operations$.subscribeMatch({
  Ok: (value) => console.log('Success:', value),
  Err: (error) => console.error('Error:', error)
});
```

## Conclusion

The Observable-Optic integration provides a powerful and type-safe way to work with optics in reactive streams. It enables:

- **Declarative data transformations** using optics
- **Type-safe pattern matching** over GADTs and ADTs
- **Composable transformations** through optic composition
- **Reactive error handling** with proper effect tracking
- **Performance optimization** through lazy evaluation

This integration makes it easy to build complex reactive applications with strong type safety and functional programming principles. 