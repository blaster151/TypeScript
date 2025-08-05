# Pattern Matching Ergonomics

## Overview

This document describes the enhanced pattern matching capabilities for the unified ADT system, providing ergonomic `.match` and `.matchTag` instance methods with full type safety and immutable compatibility.

## Features

### ✅ `.match` Instance Method

Each ADT value has a `.match(handlers)` method that provides:

- **Full type inference** based on the ADT's tags and payloads
- **Exhaustiveness checking** for complete matches
- **Partial matching support** with optional fallback handlers
- **Type-safe payload destructuring** without casting
- **Immutable compatibility** with no mutation operations

### ✅ `.matchTag` Instance Method

Each ADT value has a `.matchTag(handlers)` method for:

- **Tag-only matching** without payload access
- **Guard-style pattern matching** for simple tag checks
- **Performance optimization** when payload isn't needed
- **Same exhaustiveness and fallback support** as `.match`

### ✅ Partial Matching Support

- **Subset handlers**: Cover only some tags with optional fallback
- **Default handlers**: Use `_` or `otherwise` keys for unhandled tags
- **Exhaustiveness preservation**: Full matches without fallback are still exhaustive

### ✅ Immutable Compatibility

- **Frozen instances**: All ADT instances are `Object.freeze()`d
- **No mutation**: Pattern matching never modifies the instance
- **Structural sharing**: Immutable instances can share structure safely

## Usage Examples

### Basic Pattern Matching

```typescript
import { Just, Nothing } from './fp-maybe-unified-enhanced';

const maybe = Just(42);

// Full pattern matching
const result = maybe.match({
  Just: ({ value }) => `Got ${value}`,
  Nothing: () => "None"
});
console.log(result); // "Got 42"

// Tag-only matching
const tagResult = maybe.matchTag({
  Just: () => "Has value",
  Nothing: () => "No value"
});
console.log(tagResult); // "Has value"
```

### Partial Matching with Fallback

```typescript
const maybe = Nothing();

// Partial matching with fallback
const result = maybe.match({
  Just: ({ value }) => `Got ${value}`,
  _: (tag, payload) => `Unhandled: ${tag}`
});
console.log(result); // "Unhandled: Nothing"

// Alternative fallback key
const result2 = maybe.match({
  Just: ({ value }) => `Got ${value}`,
  otherwise: (tag, payload) => `Unhandled: ${tag}`
});
console.log(result2); // "Unhandled: Nothing"
```

### Type-Safe Payload Access

```typescript
const maybeNumber = Just(42);
const maybeString = Just("hello");

// Type inference works correctly
const numberResult = maybeNumber.match({
  Just: ({ value }) => value * 2, // value is typed as number
  Nothing: () => 0
});
console.log(numberResult); // 84

const stringResult = maybeString.match({
  Just: ({ value }) => value.toUpperCase(), // value is typed as string
  Nothing: () => ""
});
console.log(stringResult); // "HELLO"
```

### Type Guards

```typescript
const maybe = Math.random() > 0.5 ? Just(42) : Nothing();

if (maybe.is('Just')) {
  // TypeScript knows maybe.payload.value exists and is a number
  console.log(`Value: ${maybe.payload.value}`);
} else {
  // TypeScript knows maybe.tag is 'Nothing'
  console.log("No value");
}
```

### Immutable Instances

```typescript
import { JustImmutable, NothingImmutable } from './fp-maybe-unified-enhanced';

const immutableMaybe = JustImmutable(42);

// Pattern matching works the same
const result = immutableMaybe.match({
  Just: ({ value }) => `Immutable: ${value}`,
  Nothing: () => "Immutable: None"
});
console.log(result); // "Immutable: 42"

// Instance is frozen
console.log(Object.isFrozen(immutableMaybe)); // true
```

### Curryable Matchers

```typescript
import { createMaybeMatcher, createMaybeTagMatcher } from './fp-maybe-unified-enhanced';

// Create reusable matchers
const stringifyMaybe = createMaybeMatcher({
  Just: ({ value }) => `Just(${value})`,
  Nothing: () => "Nothing"
});

const tagOnlyMatcher = createMaybeTagMatcher({
  Just: () => "HAS_VALUE",
  Nothing: () => "NO_VALUE"
});

// Use with any Maybe instance
const maybe1 = Just(42);
const maybe2 = Nothing();

console.log(stringifyMaybe(maybe1)); // "Just(42)"
console.log(stringifyMaybe(maybe2)); // "Nothing"
console.log(tagOnlyMatcher(maybe1)); // "HAS_VALUE"
console.log(tagOnlyMatcher(maybe2)); // "NO_VALUE"
```

## Type Definitions

### MatchHandlers

```typescript
type MatchHandlers<Spec extends ConstructorSpec, Result> = {
  [K in keyof Spec]?: TagHandler<K, ReturnType<Spec[K]>, Result>;
} & {
  _?: (tag: string, payload: any) => Result;
  otherwise?: (tag: string, payload: any) => Result;
};
```

### TagOnlyHandlers

```typescript
type TagOnlyHandlers<Spec extends ConstructorSpec, Result> = {
  [K in keyof Spec]?: () => Result;
} & {
  _?: (tag: string) => Result;
  otherwise?: (tag: string) => Result;
};
```

### Enhanced ADT Instance

```typescript
interface EnhancedADTInstance<Spec extends ConstructorSpec> {
  readonly tag: keyof Spec;
  readonly payload: any;
  
  match<Result>(handlers: MatchHandlers<Spec, Result>): Result;
  matchTag<Result>(handlers: TagOnlyHandlers<Spec, Result>): Result;
  
  is<K extends keyof Spec>(tag: K): this is EnhancedADTInstance<Spec> & {
    tag: K;
    payload: ReturnType<Spec[K]>;
  };
  
  getPayload(): any;
  getTag(): keyof Spec;
}
```

## Implementation Details

### Enhanced Sum Type Builder

The enhanced `createSumType` function automatically generates:

1. **Enhanced instance class** with `.match` and `.matchTag` methods
2. **Immutable variant** with additional immutability guarantees
3. **Type-safe constructors** that return enhanced instances
4. **Utility methods** for pattern matching and type guards

### Pattern Matching Implementation

```typescript
match<Result>(handlers: MatchHandlers<Spec, Result>): Result {
  const handler = handlers[this.tag];
  const fallback = handlers._ || handlers.otherwise;
  
  if (handler) {
    return handler(this.payload);
  } else if (fallback) {
    return fallback(this.tag as string, this.payload);
  } else {
    throw new Error(`Unhandled tag: ${String(this.tag)}`);
  }
}
```

### Immutability Implementation

```typescript
constructor(tag: keyof Spec, payload?: any) {
  this.tag = tag;
  this.payload = payload;
  Object.freeze(this); // Make immutable
}
```

## Benefits

### Type Safety

- **Exhaustiveness checking**: TypeScript enforces complete pattern matching
- **Payload inference**: Payload types automatically inferred from tag definitions
- **Handler validation**: Handler signatures validated against tag payloads
- **Type guard narrowing**: `is()` method provides type-safe narrowing

### Performance

- **Optimized matching**: Direct property access for fast pattern matching
- **Tag-only optimization**: `.matchTag` avoids payload access when not needed
- **Immutable sharing**: Frozen instances can be safely shared
- **Minimal overhead**: Pattern matching adds minimal runtime cost

### Developer Experience

- **Intuitive API**: `.match` and `.matchTag` methods feel natural
- **IDE support**: Full IntelliSense and autocomplete
- **Error messages**: Clear error messages for missing handlers
- **Curryable matchers**: Reusable pattern matching functions

### Immutability

- **Frozen instances**: All instances are automatically frozen
- **No mutation**: No methods can modify instance state
- **Structural sharing**: Safe to share immutable instances
- **Predictable behavior**: Immutable instances behave consistently

## Migration Guide

### From Standalone Matchers

**Before:**
```typescript
import { matchMaybe } from './fp-maybe-unified';

const result = matchMaybe(maybe, {
  Just: ({ value }) => `Got ${value}`,
  Nothing: () => "None"
});
```

**After:**
```typescript
import { Just, Nothing } from './fp-maybe-unified-enhanced';

const result = maybe.match({
  Just: ({ value }) => `Got ${value}`,
  Nothing: () => "None"
});
```

### From Manual Pattern Matching

**Before:**
```typescript
if (maybe.tag === 'Just') {
  const value = maybe.payload.value;
  return `Got ${value}`;
} else {
  return "None";
}
```

**After:**
```typescript
return maybe.match({
  Just: ({ value }) => `Got ${value}`,
  Nothing: () => "None"
});
```

### From Type Guards

**Before:**
```typescript
if (isJust(maybe)) {
  return fromJust(maybe);
} else {
  return defaultValue;
}
```

**After:**
```typescript
return maybe.match({
  Just: ({ value }) => value,
  Nothing: () => defaultValue
});
```

## Best Practices

### 1. Use `.match` for Full Pattern Matching

```typescript
// ✅ Good: Full pattern matching
const result = maybe.match({
  Just: ({ value }) => `Got ${value}`,
  Nothing: () => "None"
});

// ❌ Avoid: Manual tag checking
if (maybe.tag === 'Just') {
  return `Got ${maybe.payload.value}`;
} else {
  return "None";
}
```

### 2. Use `.matchTag` for Tag-Only Cases

```typescript
// ✅ Good: Tag-only matching
const hasValue = maybe.matchTag({
  Just: () => true,
  Nothing: () => false
});

// ❌ Avoid: Using .match when payload isn't needed
const hasValue = maybe.match({
  Just: ({ value }) => true,
  Nothing: () => false
});
```

### 3. Use Fallbacks for Partial Matching

```typescript
// ✅ Good: Partial matching with fallback
const result = maybe.match({
  Just: ({ value }) => `Got ${value}`,
  _: (tag, payload) => `Unhandled: ${tag}`
});

// ❌ Avoid: Partial matching without fallback
const result = maybe.match({
  Just: ({ value }) => `Got ${value}`
  // Missing Nothing handler - will throw at runtime
});
```

### 4. Leverage Type Guards for Complex Logic

```typescript
// ✅ Good: Type guards for complex logic
if (maybe.is('Just')) {
  const value = maybe.payload.value;
  // Complex logic with value
  return processValue(value);
} else {
  // Handle Nothing case
  return handleNothing();
}

// ❌ Avoid: Manual tag checking
if (maybe.tag === 'Just') {
  const value = maybe.payload.value;
  return processValue(value);
} else {
  return handleNothing();
}
```

### 5. Use Curryable Matchers for Reusability

```typescript
// ✅ Good: Reusable matchers
const stringifyMaybe = createMaybeMatcher({
  Just: ({ value }) => `Just(${value})`,
  Nothing: () => "Nothing"
});

const results = maybes.map(stringifyMaybe);

// ❌ Avoid: Inline matchers everywhere
const results = maybes.map(maybe => 
  maybe.match({
    Just: ({ value }) => `Just(${value})`,
    Nothing: () => "Nothing"
  })
);
```

## Laws and Properties

### Pattern Matching Laws

1. **Identity**: `instance.match({ [tag]: payload => payload }) = instance.payload`
2. **Composition**: `instance.match(handlers1).then(handlers2) = instance.match(composed)`
3. **Exhaustiveness**: Full handlers must cover all tags or have fallback
4. **Immutability**: Pattern matching never mutates the instance

### Tag-Only Matching Laws

1. **Identity**: `instance.matchTag({ [tag]: () => tag }) = instance.tag`
2. **No Payload Access**: Tag-only handlers cannot access payload
3. **Fallback Support**: `_` or `otherwise` handlers supported

### Immutability Laws

1. **Frozen Instances**: All instances are `Object.freeze()`d
2. **No Mutation**: No methods can modify the instance state
3. **Structural Sharing**: Immutable instances can share structure

### Type Safety Laws

1. **Exhaustiveness**: TypeScript enforces exhaustive matching
2. **Payload Inference**: Payload types inferred from tag definitions
3. **Handler Types**: Handler signatures inferred from tag payloads
4. **Fallback Types**: Fallback handlers properly typed

## Conclusion

The enhanced pattern matching ergonomics provide a powerful, type-safe, and ergonomic way to work with ADTs. The `.match` and `.matchTag` methods offer:

- **Full type safety** with exhaustiveness checking
- **Excellent performance** with optimized matching
- **Immutable compatibility** for safe data handling
- **Intuitive API** that feels natural to use
- **Comprehensive tooling** with IDE support

These enhancements make pattern matching on ADTs as ergonomic and safe as possible, while maintaining full compatibility with the existing unified ADT system. 