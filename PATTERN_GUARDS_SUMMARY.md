# Pattern Guards for ADT Matcher System

## Overview

This implementation extends the ADT matcher system to support pattern guards (conditional matching clauses), providing powerful conditional logic within pattern matching while maintaining type safety and performance.

## 🎯 Goals Achieved

### ✅ **Syntax Extension**
- **Guard syntax**: `(pattern) if (condition) => result`
- **Multiple guards**: Support for multiple conditional clauses per pattern
- **Fallback support**: Unguarded patterns as fallbacks

### ✅ **Semantics**
- **Declaration order**: Clauses tested in declaration order
- **Guard evaluation**: Boolean expressions evaluated against pattern variables
- **Fallback behavior**: Unguarded patterns used when all guards fail

### ✅ **Type Safety**
- **Type narrowing**: Preserved inside guarded clauses
- **Boolean expressions**: Type-checked against pattern variables
- **Compile-time validation**: TypeScript enforces correct guard usage

### ✅ **Integration**
- **Universal support**: Works with all ADTs having `.match()` support
- **No runtime penalty**: Unguarded matches perform identically to before
- **Backward compatibility**: Existing code continues to work unchanged

### ✅ **Dual API Support**
- **Fluent API**: `instance.matchWithGuards({...})`
- **Data-last API**: `matchWithGuards({...})(instance)`

## 🏗️ Core Architecture

### 1. **Pattern Guard Types (`fp-pattern-guards.ts`)**

#### **Core Types**
```typescript
// Guard condition function
export type GuardCondition<Payload> = (payload: Payload) => boolean;

// Guarded handler with condition and result
export interface GuardedHandler<Payload, Result> {
  readonly condition: GuardCondition<Payload>;
  readonly handler: (payload: Payload) => Result;
}

// Extended match handlers with guards
export interface GuardedMatchHandlers<Spec, Result> {
  [K in keyof Spec]?: 
    | ((payload: Spec[K]) => Result) // Regular handler
    | GuardedHandler<Spec[K], Result>[] // Guarded handlers
    | {
        guards?: GuardedHandler<Spec[K], Result>[];
        fallback?: (payload: Spec[K]) => Result;
      };
} & {
  _?: (tag: string, payload: any) => Result;
  otherwise?: (tag: string, payload: any) => Result;
}
```

#### **Guard Creation Utilities**
```typescript
// Create a single guard
export function guard<Payload, Result>(
  condition: GuardCondition<Payload>,
  handler: (payload: Payload) => Result
): GuardedHandler<Payload, Result>

// Create multiple guards
export function guards<Payload, Result>(
  ...guards: GuardedHandler<Payload, Result>[]
): GuardedHandler<Payload, Result>[]

// Create guards with fallback
export function guardWithFallback<Payload, Result>(
  guards: GuardedHandler<Payload, Result>[],
  fallback: (payload: Payload) => Result
): { guards: GuardedHandler<Payload, Result>[]; fallback: (payload: Payload) => Result }
```

### 2. **Common Guard Conditions**

#### **Numeric Guards**
```typescript
export const Guards = {
  gt: <T extends number>(threshold: T) => (value: { value: T }) => value.value > threshold,
  gte: <T extends number>(threshold: T) => (value: { value: T }) => value.value >= threshold,
  lt: <T extends number>(threshold: T) => (value: { value: T }) => value.value < threshold,
  lte: <T extends number>(threshold: T) => (value: { value: T }) => value.value <= threshold,
  between: <T extends number>(min: T, max: T) => (value: { value: T }) => value.value >= min && value.value <= max,
  positive: <T extends number>(value: { value: T }) => value.value > 0,
  negative: <T extends number>(value: { value: T }) => value.value < 0,
  zero: <T extends number>(value: { value: T }) => value.value === 0,
}
```

#### **String Guards**
```typescript
export const Guards = {
  matches: (regex: RegExp) => (value: { value: string }) => regex.test(value.value),
  startsWith: (prefix: string) => (value: { value: string }) => value.value.startsWith(prefix),
  endsWith: (suffix: string) => (value: { value: string }) => value.value.endsWith(suffix),
  longerThan: (threshold: number) => (value: { value: string }) => value.value.length > threshold,
  shorterThan: (threshold: number) => (value: { value: string }) => value.value.length < threshold,
}
```

#### **Array Guards**
```typescript
export const Guards = {
  hasMoreThan: <T>(threshold: number) => (value: { value: T[] }) => value.value.length > threshold,
  hasLessThan: <T>(threshold: number) => (value: { value: T[] }) => value.value.length < threshold,
  isEmpty: <T>(value: { value: T[] }) => value.value.length === 0,
  isNotEmpty: <T>(value: { value: T[] }) => value.value.length > 0,
}
```

#### **Object Guards**
```typescript
export const Guards = {
  hasProperty: <K extends string>(key: K) => (value: { value: Record<string, any> }) => key in value.value,
  hasTruthyProperty: <K extends string>(key: K) => (value: { value: Record<string, any> }) => Boolean(value.value[key]),
  isNull: (value: { value: any }) => value.value === null,
  isUndefined: (value: { value: any }) => value.value === undefined,
  isTruthy: (value: { value: any }) => Boolean(value.value),
  isFalsy: (value: { value: any }) => !value.value,
  custom: <T>(predicate: (value: T) => boolean) => (value: { value: T }) => predicate(value.value)
}
```

### 3. **Guard Composition**

#### **Logical Composition**
```typescript
// AND composition
export function and<Payload>(...conditions: GuardCondition<Payload>[]): GuardCondition<Payload>

// OR composition
export function or<Payload>(...conditions: GuardCondition<Payload>[]): GuardCondition<Payload>

// NOT composition
export function not<Payload>(condition: GuardCondition<Payload>): GuardCondition<Payload>
```

### 4. **Enhanced ADT Builders (`fp-adt-builders-with-guards.ts`)**

#### **Enhanced ADT Instance**
```typescript
export interface ADTInstanceWithGuards<Spec extends ConstructorSpec> 
  extends EnhancedADTInstance<Spec> {
  
  matchWithGuards<Result>(
    handlers: GuardedMatchHandlers<Spec, Result>
  ): Result;
  
  matchTagWithGuards<Result>(
    handlers: GuardedTagOnlyHandlers<Spec, Result>
  ): Result;
}
```

#### **Enhanced Sum Type Builder**
```typescript
export interface SumTypeBuilderWithGuards<Spec extends ConstructorSpec> 
  extends EnhancedSumTypeBuilder<Spec> {
  
  createWithGuards<K extends keyof Spec>(
    tag: K,
    payload?: ReturnType<Spec[K]>
  ): ADTInstanceWithGuards<Spec>;
  
  matchWithGuards<Result>(
    instance: ADTInstanceWithGuards<Spec>,
    handlers: GuardedMatchHandlers<Spec, Result>
  ): Result;
}
```

## 📖 Usage Examples

### **Basic Pattern Guards**

#### **Maybe with Numeric Guards**
```typescript
import { MaybeGuarded, guard, Guards } from './fp-adt-builders-with-guards';

const maybe = MaybeGuarded.Just(15);

const result = maybe.matchWithGuards({
  Just: [
    guard(Guards.gt(10), ({ value }) => `Big ${value}`),
    guard(Guards.lte(10), ({ value }) => `Small ${value}`)
  ],
  Nothing: () => "None"
});
// Result: "Big 15"
```

#### **Either with String Guards**
```typescript
import { EitherGuarded, guard, Guards } from './fp-adt-builders-with-guards';

const either = EitherGuarded.Right("hello world");

const result = either.matchWithGuards({
  Left: ({ value }) => `Error: ${value}`,
  Right: [
    guard(Guards.longerThan(10), ({ value }) => `Long message: ${value}`),
    guard(Guards.startsWith("hello"), ({ value }) => `Greeting: ${value}`),
    guard(Guards.shorterThan(5), ({ value }) => `Short: ${value}`)
  ]
});
// Result: "Long message: hello world"
```

#### **Result with Complex Guards**
```typescript
import { ResultGuarded, guard, Guards, and, or } from './fp-adt-builders-with-guards';

const result = ResultGuarded.Ok(42);

const response = result.matchWithGuards({
  Ok: [
    guard(and(Guards.gt(40), Guards.lt(50)), ({ value }) => `Medium success: ${value}`),
    guard(or(Guards.lt(10), Guards.gt(100)), ({ value }) => `Extreme: ${value}`),
    guard(Guards.positive, ({ value }) => `Positive: ${value}`)
  ],
  Err: ({ error }) => `Error: ${error}`
});
// Result: "Medium success: 42"
```

### **Advanced Pattern Guards**

#### **Custom Guards**
```typescript
import { MaybeGuarded, guard, Guards } from './fp-adt-builders-with-guards';

const maybe = MaybeGuarded.Just([1, 2, 3, 4, 5]);

const result = maybe.matchWithGuards({
  Just: [
    guard(Guards.custom(arr => arr.length > 3), ({ value }) => `Long array: ${value.length} items`),
    guard(Guards.custom(arr => arr.some(x => x > 3)), ({ value }) => `Has items > 3: ${value.join(', ')}`),
    guard(Guards.custom(arr => arr.every(x => x > 0)), ({ value }) => `All positive: ${value.join(', ')}`)
  ],
  Nothing: () => "None"
});
// Result: "Long array: 5 items"
```

#### **Guards with Fallback**
```typescript
import { MaybeGuarded, guardWithFallback, Guards } from './fp-adt-builders-with-guards';

const maybe = MaybeGuarded.Just(3);

const result = maybe.matchWithGuards({
  Just: guardWithFallback(
    [
      guard(Guards.gt(10), ({ value }) => `Big: ${value}`),
      guard(Guards.gt(5), ({ value }) => `Medium: ${value}`)
    ],
    ({ value }) => `Fallback: ${value}`
  ),
  Nothing: () => "None"
});
// Result: "Fallback: 3"
```

### **Fluent vs Data-Last APIs**

#### **Fluent API**
```typescript
import { MaybeGuarded, guard, Guards } from './fp-adt-builders-with-guards';

const maybe = MaybeGuarded.Just(15);

// Fluent style
const result = maybe.matchWithGuards({
  Just: [
    guard(Guards.gt(10), ({ value }) => `Big ${value}`),
    guard(Guards.lte(10), ({ value }) => `Small ${value}`)
  ],
  Nothing: () => "None"
});
```

#### **Data-Last API**
```typescript
import { matchWithGuardsDataLast, guard, Guards } from './fp-pattern-guards';
import { pipe } from './fp-utils';

const maybe = MaybeGuarded.Just(15);

// Data-last style
const result = pipe(
  maybe,
  matchWithGuardsDataLast({
    Just: [
      guard(Guards.gt(10), ({ value }) => `Big ${value}`),
      guard(Guards.lte(10), ({ value }) => `Small ${value}`)
    ],
    Nothing: () => "None"
  })
);
```

### **Reusable Matchers**
```typescript
import { createMaybeGuardedMatcher, guard, Guards } from './fp-adt-builders-with-guards';

const sizeClassifier = createMaybeGuardedMatcher({
  Just: [
    guard(Guards.gt(10), ({ value }) => `Big ${value}`),
    guard(Guards.lte(10), ({ value }) => `Small ${value}`)
  ],
  Nothing: () => "None"
});

// Use with any Maybe instance
const result1 = sizeClassifier(MaybeGuarded.Just(15)); // "Big 15"
const result2 = sizeClassifier(MaybeGuarded.Just(5));  // "Small 5"
const result3 = sizeClassifier(MaybeGuarded.Nothing()); // "None"
```

## 🧪 Testing

### **Test Coverage**
- ✅ **Basic guard functionality** for Maybe, Either, Result
- ✅ **Guard composition** (AND, OR, NOT)
- ✅ **Custom guards** with complex predicates
- ✅ **Guard declaration order** verification
- ✅ **Fallback behavior** testing
- ✅ **Performance** (no runtime penalty for unguarded matches)
- ✅ **Type safety** verification

### **Test Examples**
```typescript
// Test guard order
const result = maybe.matchWithGuards({
  Just: [
    guard(Guards.gt(10), ({ value }) => `First guard: ${value}`),
    guard(Guards.gt(5), ({ value }) => `Second guard: ${value}`), // Should not fire
    guard(Guards.gt(20), ({ value }) => `Third guard: ${value}`)
  ],
  Nothing: () => "None"
});
// Result: "First guard: 15" (first matching guard wins)
```

## 📊 Implementation Status

| ADT | Guarded Match ✓ | Notes |
|-----|----------------|-------|
| **Maybe** | ✅ | Full guard support with value conditions |
| **Either** | ✅ | Full guard support for Left/Right values |
| **Result** | ✅ | Full guard support for Ok/Err values |
| **Custom ADTs** | ✅ | Extensible to any ADT with .match() |
| **Product Types** | ✅ | Guard support for product type fields |
| **GADTs** | ✅ | Guard support for GADT pattern matching |

## 🔧 Integration Points

### **Registry Integration**
- Pattern guards integrate with the existing ADT registry
- Guard-enabled ADTs can be registered alongside regular ADTs
- Purity tagging preserved for guarded matches

### **Derivation System**
- Guards work with the existing derivable instances system
- Eq, Ord, Show instances work correctly with guarded ADTs
- Typeclass instances preserved for guard-enabled ADTs

### **ObservableLite Integration**
- Pattern guards work with ObservableLite's `.match()` method
- Stream-aware pattern matching with guards
- Reactive pattern matching with conditional logic

## 🚀 Performance Characteristics

### **Runtime Performance**
- **No overhead** for unguarded matches (identical to regular matches)
- **Minimal overhead** for guarded matches (single condition evaluation)
- **Efficient guard evaluation** with early termination
- **Memory efficient** guard storage and execution

### **Compile-time Performance**
- **Type inference** preserved for all guard scenarios
- **Exhaustiveness checking** works with guarded patterns
- **No additional compilation overhead** for guard-enabled code

## 📚 Common Use Cases

### **Range Checks**
```typescript
guard(Guards.between(0, 100), ({ value }) => `Valid percentage: ${value}%`)
```

### **Property Checks**
```typescript
guard(Guards.hasTruthyProperty('active'), ({ value }) => `Active user: ${value.name}`)
```

### **Computed Conditions**
```typescript
guard(Guards.custom(user => user.age >= 18 && user.verified), ({ value }) => `Verified adult: ${value.name}`)
```

### **String Pattern Matching**
```typescript
guard(Guards.matches(/^[A-Z][a-z]+$/), ({ value }) => `Proper name: ${value}`)
```

### **Array/Collection Analysis**
```typescript
guard(Guards.custom(arr => arr.length > 0 && arr.every(x => x > 0)), ({ value }) => `Positive array: ${value.join(', ')}`)
```

## 🎯 Benefits

### **Enhanced Expressiveness**
- **Conditional logic** within pattern matching
- **Complex predicates** without nested if/else
- **Readable intent** with declarative guard conditions

### **Type Safety**
- **Compile-time validation** of guard conditions
- **Type narrowing** preserved in guarded clauses
- **Exhaustiveness checking** with guard support

### **Performance**
- **Zero overhead** for unguarded matches
- **Efficient evaluation** with early termination
- **Memory efficient** guard storage

### **Integration**
- **Seamless integration** with existing ADT system
- **Backward compatibility** with existing code
- **Universal applicability** to all ADT types

This pattern guard system provides a powerful extension to the ADT matcher system, enabling complex conditional logic while maintaining type safety, performance, and integration with the existing functional programming infrastructure. 