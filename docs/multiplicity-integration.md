# Multiplicity Integration System

## Overview

The Multiplicity Integration System extends all functional transformations — optics, state-monoid streams, and fluent pipelines — to obey the **same multiplicity laws** and share the **same registry**. This ensures that the compiler can enforce resource-safe composition across the entire FP/FRP layer.

## Core Concepts

### Unified Usage Bounds

All functional transformations now carry usage bounds that represent how many times they access or transform their input:

```typescript
interface UsageBound<T> {
  readonly usage: Usage<T>;
  readonly maxUsage?: Multiplicity;
}

type Usage<T> = (input: T) => Multiplicity;
type Multiplicity = number | "∞";
```

### Cross-Domain Consistency

The same multiplicity laws apply across all domains:

- **Optics**: Lens (1), Prism (0|1), Traversal (0..N), Getter (1), Setter (1)
- **Streams**: StatefulStream with usage bounds from optic composition
- **Fluent APIs**: All fluent methods propagate usage bounds

## Optic Usage Integration

### Extended Optic Base Types

All core optic interfaces now include usage bounds:

```typescript
interface BaseOptic<S, A, UB extends UsageBound<any>> {
  readonly usageBound: UB;
  
  // Core optic operations
  get(s: S): A;
  set(s: S, a: A): S;
  modify(s: S, f: (a: A) => A): S;
}
```

### Default Usage Bounds

Each optic type has default usage bounds:

- **Lens**: `1` (exactly once per focus)
- **Prism**: `0 | 1` (depending on match success)
- **Traversal**: `0..N` (must declare upper bound)
- **Getter**: `1` (read-only, once per access)
- **Setter**: `1` (write-only, once per modification)

### Optic Composition Rules

When composing optics, usage bounds propagate according to specific rules:

#### Sequential Composition (`.then`)

Usage bounds multiply:

```typescript
const composed = composeOptic(lens2, lens1);
// usage = lens1.usage * lens2.usage
// If lens1.usage = 1 and lens2.usage = 1, then composed.usage = 1
```

#### Parallel Composition (`combine`)

Usage bounds add:

```typescript
const combined = combineOptic(optic1, optic2);
// usage = optic1.usage + optic2.usage
// If optic1.usage = 1 and optic2.usage = 3, then combined.usage = 4
```

#### Zip Composition (`zipOptic`)

Usage bounds take maximum:

```typescript
const zipped = zipOptic(optic1, optic2);
// usage = max(optic1.usage, optic2.usage)
// If optic1.usage = 1 and optic2.usage = 3, then zipped.usage = 3
```

### Example: Complex Optic Composition

```typescript
// Create optics with different usage bounds
const lens1 = lens(
  (s: { nested: { value: number } }) => s.nested,
  (s: { nested: { value: number } }, a: { value: number }) => ({ ...s, nested: a })
); // usage = 1

const traversal1 = traversal(
  <F>(f: (a: number) => F) => (s: number[]) => s.map(f),
  5 // upperBound = 5
); // usage = array.length (up to 5)

// Sequential composition
const composed = composeOptic(traversal1, lens1);
// usage = 1 * array.length (up to 5)

// Test with different array lengths
const usage1 = composed.usageBound.usage([1, 2, 3]); // 3
const usage2 = composed.usageBound.usage([1, 2, 3, 4, 5, 6]); // 5 (capped by upperBound)
```

## State-Monoid Stream Integration

### Extended Stream Interface

StatefulStream now includes usage bounds:

```typescript
interface StatefulStream<I, S, O, UB extends UsageBound<any>> {
  run: (input: I) => StateFn<S, O>;
  usageBound: UB;
}
```

### Stream Composition Rules

#### Sequential Composition

Usage bounds multiply:

```typescript
const composed = composeStream(outer, inner);
// usage = inner.usage * outer.usage
```

#### Parallel Composition

Usage bounds add:

```typescript
const parallel = parallelStream(stream1, stream2);
// usage = stream1.usage + stream2.usage
```

#### Feedback Loops

Feedback loops require special handling:

```typescript
const feedback = feedbackStream(stream, initialOutput);
// usage = "∞" (unless proven otherwise)
```

### Cross-Domain Combinators

#### Lifting Optics into Streams

When an optic is lifted into a state-monoid stream, the bound is carried into the stream's bound:

```typescript
function mapOptic<S, O, UB>(
  optic: BaseOptic<S, O, UB>
): StatefulStream<S, S, O, UB> {
  return {
    run: (input: S) => (state: S) => {
      const result = optic.get(input);
      return [state, result];
    },
    usageBound: optic.usageBound // Preserve usage bound
  };
}
```

#### Extracting Optics from Streams

When extracting an optic from a stream, usage bounds are preserved:

```typescript
function extractOptic<I, S, O, UB>(
  stream: StatefulStream<I, S, O, UB>,
  initialState: S
): BaseOptic<I, O, UB> {
  return {
    usageBound: stream.usageBound, // Preserve usage bound
    get: (input: I) => {
      const [_, output] = stream.run(input)(initialState);
      return output;
    },
    // ... other optic operations
  };
}
```

### Example: Complex Stream Pipeline

```typescript
// Create streams with different usage bounds
const stream1: StatefulStream<number, number, number, any> = {
  run: (input: number) => (state: number) => [state + input, input * 2],
  usageBound: { usage: () => 1, maxUsage: 1 }
};

const stream2: StatefulStream<number, number, string, any> = {
  run: (input: number) => (state: number) => [state + input, input.toString()],
  usageBound: { usage: () => 2, maxUsage: 2 }
};

const stream3: StatefulStream<number, number, boolean, any> = {
  run: (input: number) => (state: number) => [state + input, input > 50],
  usageBound: { usage: () => 1, maxUsage: 1 }
};

// Sequential composition
const composed = composeStream(stream2, stream1);
// usage = 1 * 2 = 2

// Parallel composition
const parallel = parallelStream(stream1, stream3);
// usage = 1 + 1 = 2

// Mixed composition
const mixed = composeStream(parallel, stream1);
// usage = 1 * (1 + 1) = 2
```

## Compile-Time Enforcement

### Type-Level Bounds

The system provides compile-time enforcement through type-level bounds:

```typescript
// Type-level check if usage exceeds a bound
type OpticUsageExceeds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  Bound extends "∞" ? false :
  Usage extends "∞" ? true :
  Usage extends number ? 
    Bound extends number ? 
      Usage extends Bound ? false : true :
    never :
  never;

// Assert that usage is within bounds at compile time
type AssertOpticWithinBound<Usage extends Multiplicity, Bound extends Multiplicity> = 
  OpticUsageExceeds<Usage, Bound> extends true ? 
    never : // Compile error
    Usage;
```

### Compile-Time Error Examples

#### Exceeding Maximum Bound

```typescript
// This would cause a compile error
const unsafeComposition = composeOptic(
  opticWithUsage10, // usage = 10
  opticWithUsage5   // usage = 5
); // Total usage = 50, but if maxBound = 25, this would be invalid

// Type-level enforcement prevents this
type UnsafeComposition = AssertOpticWithinBound<50, 25>; // never (compile error)
```

#### Invalid Stream Composition

```typescript
// This would cause a compile error
const unsafeStream = composeStream(
  streamWithUsage10, // usage = 10
  streamWithUsage5   // usage = 5
); // Total usage = 50, but if maxBound = 25, this would be invalid

// Type-level enforcement prevents this
type UnsafeStream = AssertOpticWithinBound<50, 25>; // never (compile error)
```

## Registry Integration

### Default Usage Bounds

The registry stores default usage bounds for all types:

```typescript
// Optic types
registerUsage('Lens', onceUsage<any>());
registerUsage('Prism', (input: any) => 1);
registerUsage('Traversal', (input: any) => {
  if (Array.isArray(input)) {
    return input.length;
  }
  return 1;
});
registerUsage('Getter', onceUsage<any>());
registerUsage('Setter', onceUsage<any>());

// Stream operator types
registerUsage('map', onceUsage<any>());
registerUsage('filter', onceUsage<any>());
registerUsage('scan', onceUsage<any>());
registerUsage('merge', (input: any) => {
  if (Array.isArray(input)) {
    return input.length;
  }
  return 1;
});
registerUsage('feedback', infiniteUsage<any>());
```

### Automatic Bound Lookup

During creation of optics/streams, the system automatically looks up default bounds:

```typescript
function lens<S, A>(
  getter: (s: S) => A,
  setter: (s: S, a: A) => S
): Lens<S, A> {
  const usageBound = getUsageBoundForType<A>('Lens'); // Auto-lookup
  return {
    __type: 'Lens',
    usageBound,
    get: getter,
    set: setter,
    modify: (s: S, f: (a: A) => A) => setter(s, f(getter(s)))
  };
}
```

## Safe Pipeline Examples

### 1. Bounded Optic Composition

```typescript
// Safe optic composition with bounded usage
const lens1 = lens(
  (s: { nested: { value: number } }) => s.nested,
  (s: { nested: { value: number } }, a: { value: number }) => ({ ...s, nested: a })
); // usage = 1

const lens2 = lens(
  (s: { value: number }) => s.value,
  (s: { value: number }, a: number) => ({ ...s, value: a })
); // usage = 1

const composed = composeOptic(lens2, lens1); // usage = 1 * 1 = 1

// Compiler verifies: usage = 1 (within bounds)
const usage = composed.usageBound.usage(42);
console.log('Usage:', usage); // 1
```

### 2. Safe Stream Composition

```typescript
// Safe stream composition with bounded usage
const stream1: StatefulStream<number, number, number, any> = {
  run: (input: number) => (state: number) => [state + input, input * 2],
  usageBound: { usage: () => 1, maxUsage: 1 }
};

const stream2: StatefulStream<number, number, string, any> = {
  run: (input: number) => (state: number) => [state + input, input.toString()],
  usageBound: { usage: () => 2, maxUsage: 2 }
};

const composed = composeStream(stream2, stream1); // usage = 1 * 2 = 2

// Compiler verifies: usage = 2 (within bounds)
const usage = composed.usageBound.usage(42);
console.log('Usage:', usage); // 2
```

### 3. Cross-Domain Integration

```typescript
// Lift optic into stream
const optic = lens(
  (s: { value: number }) => s.value,
  (s: { value: number }, a: number) => ({ ...s, value: a })
); // usage = 1

const stream = mapOptic(optic); // usage = 1 (preserved)

// Compose with other streams
const composed = composeStream(stream, otherStream); // usage = 1 * otherStream.usage

// Extract back to optic
const extractedOptic = extractOptic(composed, initialState); // usage preserved
```

## Compile-Time Error Examples

### 1. Exceeding Maximum Bound

```typescript
// This would cause a compile error
const unsafeOptic = composeOptic(
  opticWithUsage10, // usage = 10
  opticWithUsage5   // usage = 5
); // Total usage = 50, but if maxBound = 25, this would be invalid

// Type-level enforcement prevents this
type UnsafeOptic = AssertOpticWithinBound<50, 25>; // never (compile error)
```

### 2. Invalid Stream Composition

```typescript
// This would cause a compile error
const unsafeStream = composeStream(
  streamWithUsage10, // usage = 10
  streamWithUsage5   // usage = 5
); // Total usage = 50, but if maxBound = 25, this would be invalid

// Type-level enforcement prevents this
type UnsafeStream = AssertOpticWithinBound<50, 25>; // never (compile error)
```

### 3. Unbounded Operations

```typescript
// This would cause a compile error if the type has finite bounds
const unboundedOptic = composeOptic(
  opticWithUsage1,    // usage = 1
  opticWithInfiniteUsage // usage = ∞
); // Total usage = ∞, but if maxBound = 10, this would be invalid

// Type-level enforcement prevents this
type UnboundedOptic = AssertOpticWithinBound<"∞", 10>; // never (compile error)
```

## Benefits

### 1. Compile-Time Safety

- **Type-level enforcement** prevents usage violations at compile time
- **Cross-domain consistency** ensures the same laws apply everywhere
- **Compile-time detection** of usage violations across all FP/FRP components

### 2. Resource Safety

- **Usage tracking** prevents resource exhaustion
- **Bounded computations** can be optimized differently
- **Infinite usage detection** for performance tuning

### 3. Seamless Integration

- **Unified registry** for all usage bounds
- **Cross-domain composition** with preserved bounds
- **Natural extension** of existing FP/FRP systems

### 4. Performance Optimization

- **Usage information** enables optimization opportunities
- **Bounded vs unbounded** computations can be optimized differently
- **Resource-aware scheduling** based on usage bounds

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

The Multiplicity Integration System provides **compile-time safety** and **resource safety** across all functional transformations. By making optics, state-monoid streams, and fluent pipelines **usage-aware**, multiplicity rules are preserved and enforced across the entire FP/FRP layer, ensuring consistent and safe resource usage throughout the system. 