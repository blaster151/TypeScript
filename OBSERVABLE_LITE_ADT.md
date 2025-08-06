# ObservableLite ADT Integration

This document describes the ADT (Algebraic Data Type) integration for ObservableLite, providing fluent, type-safe pattern matching on ADT values within reactive streams.

## Overview

ObservableLite provides native integration with ADTs (Maybe, Either, Result, and any other ADTs registered in the derivable instances system), allowing direct pattern matching on streaming ADT values without manual `.map()` calls.

## Core Methods

### `.match(cases)`

Pattern match on each emitted ADT value using the ADT's own matcher.

**Signature:**
```typescript
match<Result>(
  cases: {
    Just?: (payload: { value: any }) => Result;
    Nothing?: (payload: {}) => Result;
    Left?: (payload: { value: any }) => Result;
    Right?: (payload: { value: any }) => Result;
    Ok?: (payload: { value: any }) => Result;
    Err?: (payload: { error: any }) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }
): ObservableLite<Result>
```

**Features:**
- ✅ Supports Maybe, Either, Result, and any registered ADTs
- ✅ Preserves type inference for handler signatures
- ✅ Supports partial matches with fallback handlers
- ✅ Preserves `'Async'` purity tagging
- ✅ Error handling for pattern matching operations

**Examples:**

```typescript
import { ObservableLite } from './fp-observable-lite';
import { EnhancedJust, EnhancedNothing, EnhancedLeft, EnhancedRight, EnhancedOk, EnhancedErr } from './fp-pattern-matching-ergonomics';

// Maybe pattern matching
const maybeStream = ObservableLite.fromArray([
  EnhancedJust(42),
  EnhancedNothing(),
  EnhancedJust(100)
]);

const maybeResults = await maybeStream
  .match({
    Just: ({ value }) => `Got ${value}`,
    Nothing: () => "No value"
  })
  .toArray();
// Result: ["Got 42", "No value", "Got 100"]

// Either pattern matching
const eitherStream = ObservableLite.fromArray([
  EnhancedRight(42),
  EnhancedLeft("error"),
  EnhancedRight(100)
]);

const eitherResults = await eitherStream
  .match({
    Right: ({ value }) => `Success: ${value}`,
    Left: ({ value }) => `Error: ${value}`
  })
  .toArray();
// Result: ["Success: 42", "Error: error", "Success: 100"]

// Result pattern matching
const resultStream = ObservableLite.fromArray([
  EnhancedOk(42),
  EnhancedErr("Database error"),
  EnhancedOk(100)
]);

const resultResults = await resultStream
  .match({
    Ok: ({ value }) => `Success: ${value}`,
    Err: ({ error }) => `Error: ${error}`
  })
  .toArray();
// Result: ["Success: 42", "Error: Database error", "Success: 100"]
```

### `.mapMatch(cases)`

Shorthand for `.map(v => match(v, cases))` but with better type inference and purity tagging.

**Signature:**
```typescript
mapMatch<Result>(
  cases: {
    Just?: (payload: { value: any }) => Result;
    Nothing?: (payload: {}) => Result;
    Left?: (payload: { value: any }) => Result;
    Right?: (payload: { value: any }) => Result;
    Ok?: (payload: { value: any }) => Result;
    Err?: (payload: { error: any }) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }
): ObservableLite<Result>
```

**Example:**
```typescript
// Equivalent to: .map(v => v.match(cases))
const results = await maybeStream
  .mapMatch({
    Just: ({ value }) => value * 2,
    Nothing: () => 0
  })
  .toArray();
```

### `.bichain(leftFn, rightFn)`

For Either-like ADTs, allow splitting based on Left/Right branches into new observables or mapped values.

**Signature:**
```typescript
bichain<L, R>(
  leftFn: (error: L) => ObservableLite<R>,
  rightFn: (value: R) => ObservableLite<R>
): ObservableLite<R>
```

**Features:**
- ✅ Handles Either (Left/Right) and Result (Ok/Err) ADTs
- ✅ Allows different processing for success and error cases
- ✅ Returns new observables for each branch
- ✅ Useful for error handling in streams

**Example:**
```typescript
const eitherStream = ObservableLite.fromArray([
  EnhancedRight(42),
  EnhancedLeft("Network error"),
  EnhancedRight(100)
]);

const processed = await eitherStream
  .bichain(
    (error) => ObservableLite.of(`Recovered from: ${error}`),
    (value) => ObservableLite.of(value * 2)
  )
  .toArray();
// Result: [84, "Recovered from: Network error", 200]
```

### `.matchTag(cases)`

Pattern match on tags only (no payload access) for each emitted ADT value.

**Signature:**
```typescript
matchTag<Result>(
  cases: {
    Just?: () => Result;
    Nothing?: () => Result;
    Left?: () => Result;
    Right?: () => Result;
    Ok?: () => Result;
    Err?: () => Result;
    _?: (tag: string) => Result;
    otherwise?: (tag: string) => Result;
  }
): ObservableLite<Result>
```

**Example:**
```typescript
const tagResults = await maybeStream
  .matchTag({
    Just: () => "Has value",
    Nothing: () => "No value"
  })
  .toArray();
// Result: ["Has value", "No value", "Has value"]
```

### `.filterTag(tag)`

Filter observable to only emit ADT values with a specific tag.

**Signature:**
```typescript
filterTag<Tag extends string>(tag: Tag): ObservableLite<A>
```

**Example:**
```typescript
const justValues = await maybeStream
  .filterTag('Just')
  .toArray();
// Result: [EnhancedJust(42), EnhancedJust(100)] (filters out Nothing)
```

### `.extractValues<B>()`

Extract values from Just/Right/Ok cases, filtering out Nothing/Left/Err cases.

**Signature:**
```typescript
extractValues<B>(): ObservableLite<B>
```

**Example:**
```typescript
const values = await maybeStream
  .extractValues<number>()
  .toArray();
// Result: [42, 100] (extracts values from Just cases)
```

### `.extractErrors<E>()`

Extract errors from Left/Err cases, filtering out Right/Ok cases.

**Signature:**
```typescript
extractErrors<E>(): ObservableLite<E>
```

**Example:**
```typescript
const errors = await eitherStream
  .extractErrors<string>()
  .toArray();
// Result: ["error"] (extracts errors from Left cases)
```

## Fluent Chaining

ObservableLite ADT methods integrate seamlessly with other ObservableLite methods:

```typescript
const result = await maybeStream
  .filterTag('Just')
  .extractValues<number>()
  .map(x => x * 2)
  .filter(x => x > 50)
  .toArray();
```

## Type Inference

The ADT integration provides full type inference:

```typescript
// Type inference works correctly
const maybeResults: ObservableLite<string> = maybeStream.match({
  Just: ({ value }) => `Got ${value}`, // value is inferred as number
  Nothing: () => "No value"
});

const eitherResults: ObservableLite<string> = eitherStream.match({
  Right: ({ value }) => `Success: ${value}`, // value is inferred as number
  Left: ({ value }) => `Error: ${value}` // value is inferred as string
});
```

## Purity Integration

All ADT interop methods preserve the `'Async'` purity tagging:

```typescript
import { EffectOfObservableLite } from './fp-observable-lite';

// Type-level purity checking
type Effect = EffectOfObservableLite<ObservableLite<EnhancedMaybe<number>>>; // 'Async'
type MatchedEffect = EffectOfObservableLite<
  ReturnType<ObservableLite<EnhancedMaybe<number>>['match']>
>; // 'Async' - preserved!
```

## Error Handling

The ADT methods include proper error handling:

```typescript
// Errors in pattern matching are propagated
const errorStream = ObservableLite.fromArray([
  EnhancedJust(42),
  { invalid: 'data' }, // This will cause an error
  EnhancedJust(100)
]);

try {
  await errorStream.match({
    Just: ({ value }) => `Got ${value}`,
    Nothing: () => "No value"
  }).toArray();
} catch (error) {
  // Error is properly caught and propagated
}
```

## Integration with FP System

ObservableLite ADT integration works with the broader FP system:

```typescript
import { Maybe, Either } from './fp-hkt';
import { ObservableLite } from './fp-observable-lite';

// Work with any ADT that has a match method
const customADTStream = ObservableLite.fromArray([
  { tag: 'Success', value: 42 },
  { tag: 'Failure', error: 'Something went wrong' }
]);

const results = await customADTStream
  .match({
    Success: ({ value }) => `Success: ${value}`,
    Failure: ({ error }) => `Error: ${error}`,
    _: (tag, payload) => `Unknown: ${tag}`
  })
  .toArray();
```

## Best Practices

1. **Use `.match()` for full pattern matching** - When you need to handle all cases
2. **Use `.mapMatch()` for transformations** - When you want to transform ADT values
3. **Use `.bichain()` for error handling** - When you need different processing for success/error
4. **Use `.filterTag()` for filtering** - When you only want specific ADT cases
5. **Use `.extractValues()` and `.extractErrors()`** - For simple value/error extraction
6. **Leverage type inference** - Let TypeScript infer the handler signatures
7. **Handle errors gracefully** - Use try-catch for pattern matching operations
8. **Preserve purity** - All methods maintain `'Async'` purity tagging

## Performance Considerations

- **Lazy evaluation** - Pattern matching is applied only when values are emitted
- **No unnecessary buffering** - Values are processed as they arrive
- **Efficient filtering** - Tag-based filtering is done inline
- **Memory efficient** - No intermediate collections are created

## Summary

ObservableLite ADT integration provides a powerful, type-safe way to work with algebraic data types in reactive streams. The integration is seamless, preserving all the benefits of the FP system while adding the expressiveness of pattern matching to reactive programming. 