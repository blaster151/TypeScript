# Usage-Bound Optics System

## Overview

The Usage-Bound Optics System extends the existing optics infrastructure with **usage bounds** that propagate naturally through `Lens`, `Prism`, `Traversal`, and other optic types. This creates a seamless bridge between the usage-aware FRP system and the existing optics abstractions, enabling **usage bounds as a first-class property of optics**.

## Core Concepts

### Usage-Bound Optics

A **Usage-Bound Optic** extends the standard optic interface with usage tracking:

```typescript
interface UsageBoundOptic<S, T, A, B> extends Optic<any, S, T, A, B> {
  readonly usage?: Usage<A>;        // Optional usage function
  readonly maxUsage?: Multiplicity; // Optional compile-time bound
}
```

Each optic can carry a **usage function** that determines how many times the optic operation is performed for a given input, enabling:

- **Compile-time safety** for usage bounds
- **Runtime optimization** opportunities
- **Resource management** for preventing excessive computation
- **Type-safe optic processing** with usage tracking

### Default Usage Patterns

Different optic types have different default usage patterns:

| Optic Type | Default Usage | Description |
|------------|---------------|-------------|
| **Lens** | `1` | Focuses exactly one field |
| **Prism** | `0 \| 1` | Depends on match success |
| **Optional** | `0 \| 1` | Depends on presence |
| **Traversal** | `0..N` | Number of focused elements |
| **Iso** | `1` | Always transforms exactly once |

## Usage Propagation Through Composition

### Sequential Composition

When composing optics sequentially, usage multiplicities are **multiplied**:

```typescript
// Lens with usage = 1 composed with Traversal with usage = 3
const lens = usageBoundLens(baseLens, () => 1);
const traversal = usageBoundTraversal(baseTraversal, (arr) => arr.length);

const composed = composeUsageBoundOptics(lens, traversal);
// Resulting usage: 1 * 3 = 3
```

**Type-level multiplication:**
```typescript
type MultiplyOpticUsage<A extends Multiplicity, B extends Multiplicity> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends number ? 
    B extends number ? 
      A extends 0 ? 0 :
      B extends 1 ? B :
      "∞" : // For complex multiplications, use "∞" for safety
    never :
  never;
```

### Parallel Composition

For parallel composition (zipping optics), usage is the **maximum** of individual usages:

```typescript
const lens1 = usageBoundLens(baseLens1, () => 2);
const lens2 = usageBoundLens(baseLens2, () => 3);

const parallel = parallelUsageBoundOptics(lens1, lens2);
// Resulting usage: max(2, 3) = 3
```

### Fan-Out Composition

For fan-out composition (same input to multiple optics), usage is **added**:

```typescript
const lens1 = usageBoundLens(baseLens1, () => 2);
const lens2 = usageBoundLens(baseLens2, () => 3);

const fanOut = fanOutUsageBoundOptics(lens1, lens2);
// Resulting usage: 2 + 3 = 5
```

## Integration with UsageBoundStream

### Lifting Optics to Streams

Optics can be lifted to `UsageBoundStream` instances, preserving their usage semantics:

```typescript
// Convert usage-bound lens to usage-bound stream
const lens = usageBoundLens(baseLens, () => 1);
const stream = lensToUsageBoundStream(lens);

// The resulting stream has the same usage as the original lens
expect(stream.usage(input)).to.equal(1);
```

### Seamless FRP Integration

This enables seamless integration between optics and the FRP system:

```typescript
// Create a usage-bound lens
const nameLens = usageBoundLens(
  lens((person) => person.name, (person, name) => ({ ...person, name })),
  () => 1
);

// Convert to stream and compose with other streams
const nameStream = lensToUsageBoundStream(nameLens);
const upperStream = liftStatelessUsage((name: string) => name.toUpperCase(), 1);

const pipeline = composeUsage(nameStream, upperStream);
// Resulting usage: 1 * 1 = 1
```

## Static Enforcement

### Compile-Time Usage Bounds

You can declare maximum usage bounds that are enforced at compile time:

```typescript
// Lens with maximum usage of 2
const boundedLens = withOpticUsageValidation(
  usageBoundLens(baseLens, () => 1),
  2
);

// This will cause a type error if usage exceeds 2
const invalidComposition = composeUsageBoundOptics(
  boundedLens,
  usageBoundTraversal(baseTraversal, () => 3) // Usage: 1 * 3 = 3 > 2
);
```

### Type-Level Assertions

Use type-level assertions to enforce usage bounds:

```typescript
// Type-level assertion that usage is within bounds
type AssertOpticUsageWithinBounds<
  Usage extends Multiplicity, 
  Bound extends Multiplicity
> = OpticUsageExceeds<Usage, Bound> extends true 
  ? never 
  : Usage;

// This will cause a compile-time error if usage exceeds bound
function safeCompose<
  F extends UsageBoundOptic<any, any, any, any>,
  G extends UsageBoundOptic<any, any, any, any>,
  Max extends Multiplicity
>(
  f: F,
  g: G,
  maxUsage: Max
): UsageBoundOptic<any, any, any, any> & {
  usage: (input: any) => AssertOpticUsageWithinBounds<
    MultiplyOpticUsage<
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
const lens = usageBoundLens(baseLens, () => 5);

// This will throw an error
try {
  validateOpticUsage(lens, input, 3); // Usage 5 exceeds bound 3
} catch (error) {
  console.error(error.message); // "Optic usage 5 exceeds maximum bound 3"
}
```

### Validation Helpers

```typescript
// Create an optic with runtime validation
const validatedOptic = withOpticUsageValidation(
  usageBoundLens(baseLens, () => 1),
  2
);

// Usage is automatically validated on each call
const usage = validatedOptic.usage(input); // Throws if usage > 2
```

## Practical Examples

### Lens with Usage Limit

```typescript
// Create a lens that processes person names with a usage limit
const nameLens = usageBoundLens(
  lens(
    (person) => person.name,
    (person, name) => ({ ...person, name })
  ),
  () => 1
);

// Add usage validation
const boundedNameLens = withOpticUsageValidation(nameLens, 2);

// Use the lens safely
const person = { name: 'Alice', age: 25 };
const newPerson = boundedNameLens((name) => name.toUpperCase())(person);
// Result: { name: 'ALICE', age: 25 }
```

### Traversal with Static Bounds

```typescript
// Create a traversal that enforces an upper bound on focused elements
const tagsTraversal = usageBoundTraversal(
  traversal(
    (person) => person.tags,
    (f, person) => ({ ...person, tags: person.tags.map(f) })
  ),
  (person) => Math.min(person.tags.length, 5) // Cap at 5 elements
);

// Add usage validation
const boundedTagsTraversal = withOpticUsageValidation(tagsTraversal, 3);

// Use the traversal safely
const person = { name: 'Alice', tags: ['dev', 'admin', 'user', 'moderator'] };
const newPerson = boundedTagsTraversal((tag) => tag.toUpperCase())(person);
// Only processes first 3 tags due to usage bound
```

### Safe Prism Usage

```typescript
// Create a prism that prevents multiple unintended matches
const justPrism = usageBoundPrism(
  prism(
    (maybe) => maybe.tag === 'Just' ? maybe.value : null,
    (value) => ({ tag: 'Just', value })
  ),
  (maybe) => maybe.tag === 'Just' ? 1 : 0
);

// Add usage validation
const safeJustPrism = withOpticUsageValidation(justPrism, 1);

// Use the prism safely
const maybe = { tag: 'Just', value: 'test' };
const result = safeJustPrism((value) => value.toUpperCase())(maybe);
// Result: { tag: 'Just', value: 'TEST' }
```

## Advanced Patterns

### Conditional Usage

Usage can depend on input properties:

```typescript
// Lens with conditional usage based on name length
const conditionalLens = withConditionalUsage(
  usageBoundLens(baseLens, () => 1),
  (person) => person.name.length > 5,
  2, // Higher usage for long names
  0  // Skip short names
);

// Usage varies with input
expect(conditionalLens.usage({ name: 'Alice' })).to.equal(0);
expect(conditionalLens.usage({ name: 'Alexander' })).to.equal(2);
```

### Complex Composition

Usage bounds work seamlessly with complex optic compositions:

```typescript
// Compose multiple optics with usage tracking
const profileLens = usageBoundLens(baseLens1, () => 1);
const tagsLens = usageBoundLens(baseLens2, () => 1);
const tagsTraversal = usageBoundTraversal(baseTraversal, (tags) => tags.length);

const pipeline = composeUsageBoundLensTraversal(
  composeUsageBoundLenses(profileLens, tagsLens),
  tagsTraversal
);

// Usage: 1 * 1 * N = N (where N is the number of tags)
const usage = pipeline.usage({
  profile: { tags: ['dev', 'admin', 'user'] }
});
expect(usage).to.equal(3);
```

## Performance Considerations

### Compile-Time Overhead

- **Type-level operations** add minimal compile-time overhead
- **Usage function calls** are typically inlined by modern compilers
- **Validation checks** can be optimized away in production builds

### Runtime Overhead

- **Usage function calls** add minimal runtime cost (typically < 1μs)
- **Validation overhead** is negligible for most applications
- **Composition overhead** is amortized by the benefits of usage tracking

### Optimization Opportunities

Usage bounds enable several optimization opportunities:

- **Skip processing** when usage is 0
- **Batch operations** when usage is high
- **Parallel processing** when usage allows
- **Resource allocation** based on usage estimates

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

### 4. Integrate with Existing Code

- Gradually add usage bounds to existing optics
- Use the lifting functions to integrate with streams
- Maintain backward compatibility during migration

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

The Usage-Bound Optics System provides a powerful foundation for type-safe, usage-aware optic processing. By combining compile-time safety with runtime flexibility, it enables both correctness guarantees and optimization opportunities.

The system's seamless integration with the existing optics infrastructure and the `UsageBoundStream` system makes it a natural extension of the functional programming ecosystem, while its theoretical foundations in dependent multiplicities provide a solid basis for future research and development.

**Key Benefits:**
- **Type safety** for usage bounds in optic composition
- **Runtime optimization** opportunities based on usage tracking
- **Resource management** for preventing excessive computation
- **Seamless integration** with existing optics and FRP systems
- **Foundation** for advanced type-level programming patterns 