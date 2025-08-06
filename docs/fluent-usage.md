# Fluent Usage-Bound API System

## Overview

The Fluent Usage-Bound API System extends all fluent API wrappers (`.map`, `.filter`, `.scan`, `.chain`, etc.) to propagate and enforce multiplicity bounds from the registry. This ensures that usage tracking is preserved and enforced across **every** pipeline style in the library.

## Core Concepts

### Fluent Wrapper Base

All fluent-enabled objects extend the `FluentOps<T, UB>` interface:

```typescript
export interface FluentOps<T, UB extends UsageBound<any>> {
  readonly __usageBound: UB;
  
  // Core fluent methods that propagate usage bounds
  map<B>(f: (a: T) => B): FluentOps<B, UsageBound<B>>;
  filter(predicate: (a: T) => boolean): FluentOps<T, UsageBound<T>>;
  scan<B>(initial: B, f: (acc: B, a: T) => B): FluentOps<B, UsageBound<B>>;
  chain<B>(f: (a: T) => FluentOps<B, UsageBound<B>>): FluentOps<B, UsageBound<B>>;
  flatMap<B>(f: (a: T) => FluentOps<B, UsageBound<B>>): FluentOps<B, UsageBound<B>>;
  take(n: number): FluentOps<T, UsageBound<T>>;
  
  // Utility methods
  getUsageBound(): UsageBound<T>;
  validateUsage(input: T): Multiplicity;
  getValue(): T;
}
```

### Usage Bound Propagation

When a fluent method returns a new object, it propagates the bound according to specific rules:

```typescript
// Example: Map operation preserves usage bound
map<B>(f: (a: A) => B): FluentOps<B, UB> {
  return new FluentOpsImpl(mappedValue, this.__usageBound);
}
```

## Bound Propagation Rules

### 1. Sequential Operations

For sequential combinators that **invoke upstream values**:

- **Map**: Usage bound remains the same (1:1 transformation)
- **Filter**: Usage bound remains the same or decreases (never increases)
- **Scan**: Usage bound = input bound × 1 (once per element)
- **Take**: Usage bound = min(currentBound, n)

### 2. Chain/FlatMap Operations

For operations that **multiply usage**:

- **Chain/FlatMap**: Usage bound multiplies by inner stream's bound
- If `this.__usageBound` is finite, multiply by the combinator's usage
- If infinite (`"∞"`), keep `"∞"`

### 3. Composition Examples

```typescript
// Sequential composition: usage = 1
const result = fluentOnce(42)
  .map(x => x * 2)           // usage = 1
  .filter(x => x > 50)       // usage = 1
  .map(x => x.toString());   // usage = 1

// Chain composition: usage = 1 * 1 = 1
const chained = fluentOnce(42)
  .chain(x => fluentOnce(x * 2))  // usage = 1 * 1 = 1
  .chain(x => fluentOnce(x.toString())); // usage = 1 * 1 = 1

// Mixed composition: usage = 1 * ∞ = ∞
const mixed = fluentOnce(42)
  .map(x => x * 2)           // usage = 1
  .chain(x => fluentInfinite(x)) // usage = 1 * ∞ = ∞
  .take(10);                 // usage = min(∞, 10) = 10
```

## Compile-Time Enforcement

### Type-Level Bounds

The system provides compile-time enforcement through type-level bounds:

```typescript
// Type-level check if usage exceeds a bound
type ExceedingBound<Actual extends Multiplicity, Max extends Multiplicity> = 
  Max extends "∞" ? false :
  Actual extends "∞" ? true :
  Actual extends number ? 
    Max extends number ? 
      Actual extends Max ? false : true :
    never :
  never;

// Assert that usage is within bounds at compile time
type AssertWithinBound<Actual extends Multiplicity, Max extends Multiplicity> = 
  ExceedingBound<Actual, Max> extends true ? 
    never : // Compile error
    Actual;
```

### Compile-Time Error Examples

```typescript
// This would trigger a compile error if usage exceeds bounds
type SafePipeline<A, B> = 
  FluentOps<A, UsageBound<A>> extends FluentOps<infer U, infer UB> 
    ? UB extends UsageBound<infer V> 
      ? V extends B 
        ? FluentOps<B, UsageBound<B>> 
        : never 
      : never 
    : never;

// Example usage that would cause compile error
const unsafePipeline = fluent(42, () => 10, 5) // usage = 10, maxUsage = 5
  .map(x => x * 2)      // usage = 10 (exceeds maxUsage = 5)
  .map(x => x.toString()); // This would cause compile error
```

## Runtime Safeguards

### Development Mode Validation

In development mode, fluent methods wrap operations to assert that runtime usage counts match static bounds:

```typescript
validateUsage(input: T): Multiplicity {
  const usage = this.__usageBound.usage(input);
  
  // Runtime validation in dev mode
  if (process.env.NODE_ENV === 'development') {
    if (this.__usageBound.maxUsage !== undefined && 
        usage !== "∞" && 
        this.__usageBound.maxUsage !== "∞" && 
        usage > this.__usageBound.maxUsage) {
      throw new Error(`Usage ${usage} exceeds maximum bound ${this.__usageBound.maxUsage}`);
    }
  }
  
  return usage;
}
```

### Production Mode

In production mode, validation is disabled for performance:

```typescript
// In production, no validation occurs
const wrapper = fluent(42, () => 10, 5);
wrapper.validateUsage(42); // No error thrown in production
```

## Registry Integration

### Automatic Bound Lookup

The base `FluentOpsImpl` constructor automatically queries the registry for the type's initial bound:

```typescript
export function getUsageBoundForType<T>(typeKey: string): UsageBound<T> {
  // Try usage registry first
  const usageRegistry = getUsageBound(typeKey);
  if (usageRegistry) {
    return {
      usage: usageRegistry,
      maxUsage: undefined
    };
  }
  
  // Try global registry
  const globalRegistry = getGlobalUsageBound(typeKey);
  if (globalRegistry) {
    return {
      usage: globalRegistry,
      maxUsage: undefined
    };
  }
  
  // Default to infinite usage
  return {
    usage: infiniteUsage<T>(),
    maxUsage: "∞"
  };
}
```

### Custom Usage Bounds

You can create fluent wrappers with custom usage bounds:

```typescript
// Create with custom usage
const customWrapper = fluent(42, (input) => 5, 10);

// Create with infinite usage
const infiniteWrapper = fluentInfinite(42);

// Create with usage = 1
const onceWrapper = fluentOnce(42);
```

## Safe Pipeline Examples

### 1. Bounded Transformations

```typescript
// Safe pipeline with bounded usage
const safePipeline = fluentOnce(42)
  .map(x => x * 2)           // usage = 1
  .filter(x => x > 50)       // usage = 1
  .map(x => x.toString())    // usage = 1
  .chain(x => fluentOnce(x.length)); // usage = 1 * 1 = 1

// Compiler verifies: usage = 1 (within bounds)
const usage = safePipeline.validateUsage(safePipeline.getValue());
console.log('Usage:', usage); // 1
```

### 2. Conditional Operations

```typescript
// Pipeline with conditional operations
const conditionalPipeline = fluentOnce(42)
  .map(x => x * 2)           // usage = 1
  .filter(x => x > 100)      // usage = 0 (fails filter)
  .map(x => x.toString())    // usage = 0
  .chain(x => fluentOnce(x.length)); // usage = 0 * 1 = 0

// Compiler verifies: usage = 0 (safe)
const usage = conditionalPipeline.validateUsage(conditionalPipeline.getValue());
console.log('Usage:', usage); // 0
```

### 3. Infinite Usage Handling

```typescript
// Pipeline with infinite usage
const infinitePipeline = fluentOnce(42)
  .map(x => x * 2)           // usage = 1
  .chain(x => fluentInfinite(x)) // usage = 1 * ∞ = ∞
  .map(x => x.toString())    // usage = ∞
  .take(10);                 // usage = min(∞, 10) = 10

// Compiler verifies: usage = 10 (bounded by take)
const usage = infinitePipeline.validateUsage(infinitePipeline.getValue());
console.log('Usage:', usage); // 10
```

## Compile-Time Error Examples

### 1. Exceeding Maximum Bound

```typescript
// This would cause a compile error
const unsafePipeline = fluent(42, () => 10, 5) // usage = 10, maxUsage = 5
  .map(x => x * 2)      // usage = 10 (exceeds maxUsage = 5)
  .map(x => x.toString()); // Compile error: usage exceeds bound

// Type-level enforcement prevents this
type UnsafeChain = AssertWithinBound<10, 5>; // never (compile error)
```

### 2. Invalid Composition

```typescript
// This would cause a compile error
const invalidPipeline = fluent(42, () => 1, 1)
  .chain(x => fluentInfinite(x)) // usage = 1 * ∞ = ∞
  .take(5);                      // usage = min(∞, 5) = 5
  // But if the type has maxUsage = 3, this would be invalid

// Type-level enforcement prevents this
type InvalidComposition = AssertWithinBound<5, 3>; // never (compile error)
```

### 3. Unbounded Operations

```typescript
// This would cause a compile error if the type has finite bounds
const unboundedPipeline = fluent(42, () => 1, 1)
  .chain(x => fluentInfinite(x)) // usage = 1 * ∞ = ∞
  .chain(x => fluentInfinite(x.toString())); // usage = ∞ * ∞ = ∞

// Type-level enforcement prevents this
type UnboundedChain = AssertWithinBound<"∞", 10>; // never (compile error)
```

## Benefits

### 1. Compile-Time Safety

- **Type-level enforcement** prevents usage violations at compile time
- **Branded types** for bounded values ensure type safety
- **Compile-time detection** of usage violations

### 2. Runtime Performance

- **Development mode validation** for debugging
- **Production mode optimization** with validation disabled
- **Efficient bound propagation** through fluent chains

### 3. Seamless Integration

- **Minimal changes** to existing fluent APIs
- **Backward compatibility** with existing code
- **Natural extension** of the typeclass system

### 4. Optimization Opportunities

- **Usage information** enables optimization opportunities
- **Bounded computations** can be optimized differently
- **Infinite usage detection** for performance tuning

## Future Enhancements

### 1. Advanced Composition Rules

- **Fan-out composition** with usage addition
- **Conditional composition** based on usage bounds
- **Usage-dependent optimization** strategies

### 2. Performance Monitoring

- **Runtime usage tracking** and profiling
- **Usage-based performance** optimization
- **Usage violation detection** and reporting

### 3. Advanced Type-Level Features

- **Dependent usage types**
- **Usage-preserving transformations**
- **Compile-time usage analysis**

## Conclusion

The Fluent Usage-Bound API System provides **compile-time safety** and **runtime performance** for fluent method chains. By making fluent methods **usage-aware**, multiplicity rules from the registry are preserved and enforced across **every** pipeline style in the library, ensuring consistent and safe usage tracking throughout the entire system. 