# Usage-Bound Stream Multiplicity System

## Overview

The Usage-Bound Stream Multiplicity System extends the `StatefulStream` core with **dependent multiplicities**, enabling compile-time safety and optimization opportunities. Each stream operation carries a **usage function** that determines how many times the operation is performed for a given input.

## Core Concepts

### Dependent Multiplicities

**Dependent multiplicities** are usage bounds that can vary based on the input value. Unlike static bounds that are fixed, dependent multiplicities allow for dynamic usage tracking that adapts to the specific input being processed.

**Key Benefits:**
- **Compile-time Safety**: Catch usage violations before runtime
- **Optimization Opportunities**: Identify pure operations that can be fused
- **Resource Management**: Prevent runaway recursion and excessive computation
- **Type-level Reasoning**: Enable advanced type-level programming patterns

### Multiplicity Types

```typescript
// Natural numbers (non-negative integers)
type Nat = number;

// Multiplicity: finite count or infinite
type Multiplicity = Nat | "∞";

// Usage function: maps input to multiplicity
type Usage<I> = (input: I) => Multiplicity;
```

### Usage-Bound Streams

A `UsageBoundStream` extends the standard `StatefulStream` with usage tracking:

```typescript
interface UsageBoundStream<I, S, O> extends StatefulStream<I, S, O> {
  readonly usage: Usage<I>;
  readonly maxUsage?: Multiplicity; // Optional compile-time bound
}
```

## Usage Patterns

### Constant Usage

The simplest usage pattern is constant usage, where every input has the same multiplicity:

```typescript
// Stream that runs exactly once per input
const onceStream = liftStatelessUsage((x: number) => x * 2, 1);

// Stream that never runs (usage = 0)
const neverStream = liftStatelessUsage((x: number) => x * 2, 0);

// Stream with infinite usage
const infiniteStream = liftStatelessUsage((x: number) => x * 2, "∞");
```

### Conditional Usage

Usage can depend on input properties:

```typescript
// Usage depends on whether input is positive
const conditionalStream = {
  ...baseStream,
  usage: conditionalUsage<number>(
    (x) => x > 0,  // predicate
    2,             // usage when x > 0
    0              // usage when x <= 0
  )
};
```

### Dependent Usage

Usage can be computed from the input:

```typescript
// Usage depends on the length of an array
const arrayStream = {
  ...baseStream,
  usage: (input: number[]) => input.length
};

// Usage depends on Maybe variant
const maybeStream = {
  ...baseStream,
  usage: (input: Maybe<number>) => 
    input === null || input === undefined ? 0 : 1
};
```

## Composition Rules

### Sequential Composition

When composing streams sequentially, usage multiplicities are **multiplied**:

```typescript
const f = liftStatelessUsage((x: number) => x * 2, 2);
const g = liftStatelessUsage((x: number) => x + 1, 3);

const composed = composeUsage(f, g);
// Resulting usage: 2 * 3 = 6
```

**Type-level multiplication:**
```typescript
type MultiplyUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends Nat ? 
    B extends Nat ? 
      A extends 0 ? 0 :
      B extends 0 ? 0 :
      A extends 1 ? B :
      B extends 1 ? A :
      "∞" : // For complex multiplications, use "∞" for safety
    never :
  never;
```

### Parallel Composition

For parallel composition, usage is the **maximum** of individual usages:

```typescript
const f = liftStatelessUsage((x: number) => x * 2, 2);
const g = liftStatelessUsage((x: number) => x + 1, 3);

const parallel = parallelUsage(f, g);
// Resulting usage: max(2, 3) = 3
```

### Fan-Out Composition

For fan-out composition (same input to multiple streams), usage is **added**:

```typescript
const f = liftStatelessUsage((x: number) => x * 2, 2);
const g = liftStatelessUsage((x: number) => x + 1, 3);

const fanOut = fanOutUsage(f, g);
// Resulting usage: 2 + 3 = 5
```

## Static Enforcement

### Compile-Time Usage Bounds

You can declare maximum usage bounds that are enforced at compile time:

```typescript
// Stream with maximum usage of 2
const boundedStream = withUsageValidation(
  liftStatelessUsage((x: number) => x * 2, 1),
  2
);

// This will cause a type error if usage exceeds 2
const invalidComposition = composeUsage(
  boundedStream,
  liftStatelessUsage((x: number) => x + 1, 3) // Usage: 1 * 3 = 3 > 2
);
```

### Type-Level Assertions

Use type-level assertions to enforce usage bounds:

```typescript
// Type-level assertion that usage is within bounds
type AssertUsageWithinBounds<
  Usage extends Multiplicity, 
  Bound extends Multiplicity
> = UsageExceeds<Usage, Bound> extends true 
  ? never 
  : Usage;

// This will cause a compile-time error if usage exceeds bound
function safeCompose<
  F extends UsageBoundStream<any, any, any>,
  G extends UsageBoundStream<any, any, any>,
  Max extends Multiplicity
>(
  f: F,
  g: G,
  maxUsage: Max
): UsageBoundStream<any, any, any> & {
  usage: (input: any) => AssertUsageWithinBounds<
    MultiplyUsage<
      ReturnType<F['usage']>,
      ReturnType<G['usage']>
    >,
    Max
  >;
} {
  // Implementation...
}
```

## Runtime Validation

### Usage Validation

Runtime validation can catch usage violations:

```typescript
const stream = liftStatelessUsage((x: number) => x * 2, 5);

// This will throw an error
try {
  validateUsage(stream, 5, 3); // Usage 5 exceeds bound 3
} catch (error) {
  console.error(error.message); // "Usage 5 exceeds maximum bound 3"
}
```

### Validation Helpers

```typescript
// Create a stream with runtime validation
const validatedStream = withUsageValidation(
  liftStatelessUsage((x: number) => x * 2, 1),
  2
);

// Usage is automatically validated on each call
const usage = validatedStream.usage(5); // Throws if usage > 2
```

## Integration with Existing ADTs

### Maybe Integration

Usage can depend on Maybe variants:

```typescript
// Stream that only processes Just values
const maybeProcessor = {
  ...baseStream,
  usage: (input: Maybe<number>) => 
    input === null || input === undefined ? 0 : 1
};

// Usage: 0 for Nothing, 1 for Just
const usage1 = maybeProcessor.usage(null);      // 0
const usage2 = maybeProcessor.usage(42);        // 1
```

### Either Integration

Usage can depend on Either variants:

```typescript
// Stream that processes Left and Right differently
const eitherProcessor = {
  ...baseStream,
  usage: (input: Either<string, number>) => 
    'left' in input ? 0 : 2 // 0 for Left, 2 for Right
};
```

## Optimization Opportunities

### Fusion of Pure Operations

Usage bounds enable fusion of pure operations:

```typescript
const double = liftStatelessUsage((x: number) => x * 2, 1);
const addOne = liftStatelessUsage((x: number) => x + 1, 1);
const square = liftStatelessUsage((x: number) => x * x, 1);

// All operations have usage 1, so they can be fused
const fused = fusePureSequence([double, addOne, square]);
// Resulting usage: 1 (fused into single operation)
```

### Conditional Optimization

Usage can guide optimization decisions:

```typescript
// Stream with conditional usage
const conditionalStream = {
  ...baseStream,
  usage: conditionalUsage<number>(
    (x) => x > 100,  // Only process large numbers
    1,               // Usage when x > 100
    0                // Skip when x <= 100
  )
};

// Optimizer can skip processing for small numbers
```

## Advanced Patterns

### Recursive Usage

Usage can be defined recursively for complex patterns:

```typescript
// Usage depends on nested structure
const treeProcessor = {
  ...baseStream,
  usage: (input: Tree<number>) => {
    const countNodes = (tree: Tree<number>): number => {
      if (tree === null) return 0;
      return 1 + countNodes(tree.left) + countNodes(tree.right);
    };
    return countNodes(input);
  }
};
```

### Feedback Loop Prevention

Usage bounds can prevent runaway recursion:

```typescript
// Stream with bounded feedback
const boundedFeedback = {
  ...feedbackStream,
  maxUsage: 10, // Maximum 10 iterations
  usage: (input: number) => Math.min(input, 10)
};
```

## Best Practices

### 1. Choose Appropriate Usage Patterns

- Use **constant usage** for simple, predictable operations
- Use **conditional usage** when processing depends on input properties
- Use **dependent usage** for complex, input-driven processing

### 2. Set Reasonable Bounds

- Set `maxUsage` bounds based on performance requirements
- Consider resource constraints when choosing bounds
- Use "∞" sparingly, only when truly unbounded

### 3. Leverage Type-Level Safety

- Use compile-time bounds when possible
- Leverage type-level assertions for critical paths
- Combine with runtime validation for dynamic scenarios

### 4. Optimize Based on Usage

- Fuse operations with low usage
- Skip processing when usage is 0
- Parallelize operations with independent usage

## Performance Considerations

### Compile-Time Overhead

- Type-level operations add compile-time overhead
- Complex usage functions may slow down type checking
- Consider using simpler patterns for performance-critical code

### Runtime Overhead

- Usage function calls add minimal runtime overhead
- Validation adds small cost but provides safety
- Fusion can eliminate overhead for pure operations

### Memory Usage

- Usage functions are typically small and lightweight
- No additional memory allocation for usage tracking
- Bounds checking uses minimal stack space

## Future Directions

### Advanced Type-Level Features

- **Dependent multiplicities** with more complex type-level arithmetic
- **Usage inference** for automatic bound detection
- **Usage polymorphism** for generic usage patterns

### Integration Opportunities

- **Effect systems** for tracking side effects alongside usage
- **Resource management** for automatic cleanup based on usage
- **Parallel processing** with usage-guided scheduling

### Research Applications

- **Linear types** for enforcing single-use patterns
- **Affine types** for enforcing at-most-once usage
- **Relevance logic** for tracking data dependencies

## Conclusion

The Usage-Bound Stream Multiplicity System provides a powerful foundation for type-safe, usage-aware stream processing. By combining compile-time safety with runtime flexibility, it enables both correctness guarantees and optimization opportunities.

The system's integration with existing ADTs and typeclass infrastructure makes it a natural extension of the functional programming ecosystem, while its theoretical foundations in dependent multiplicities provide a solid basis for future research and development. 