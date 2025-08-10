# StatefulStream Core Documentation

## Overview

StatefulStream is a foundational implementation of the "State-monoid FRP" model, providing a type-safe, composable framework for building stateful stream processing pipelines. This system treats streams as monoid homomorphisms with state, enabling powerful composition patterns while maintaining mathematical rigor.

## Core Concepts

### State-monoid FRP

The StatefulStream system is based on the principle that **stream programs are monoid homomorphisms with state**. This means:

- **Streams** are functions that transform input and state into output and new state
- **Composition** follows monoid laws (associativity, identity)
- **State** is explicitly managed and can be composed through monoid operations
- **Purity** is tracked to enable optimizations like fusion

### Key Types

```typescript
// Core state transformer
type StateFn<S, N> = (state: S) => [S, N];

// Stateful stream with input I, state S, output O
interface StatefulStream<I, S, O> {
  readonly run: (input: I) => StateFn<S, O>;
  readonly __brand: 'StatefulStream';
  readonly __purity: EffectTag;
}

// State monoid for composition
interface StateMonoid<S, N> {
  empty: StateFn<S, N>;
  concat: (a: StateFn<S, N>, b: StateFn<S, N>) => StateFn<S, N>;
}
```

## Creating StatefulStreams

### Basic Creation

```typescript
import { StatefulStream } from '../src/stream/core/types';
import { liftStateless, liftStateful } from '../src/stream/core/operators';

// Lift a pure function into a stateless stream
const doubleStream = liftStateless((x: number) => x * 2);

// Lift a stateful function
const accumulatorStream = liftStateful((input: number, state: number) => {
  const newState = state + input;
  return [newState, newState];
});
```

### Identity and Constants

```typescript
import { identity, constant } from '../src/stream/core/operators';

// Identity stream (passes input through unchanged)
const id = identity<number, number>();

// Constant stream (always outputs the same value)
const constStream = constant<number, number, string>("hello");
```

## Composition

### Sequential Composition

Sequential composition chains streams together, where the output of one becomes the input of the next:

```typescript
import { compose } from '../src/stream/core/operators';

const double = liftStateless((x: number) => x * 2);
const addOne = liftStateless((x: number) => x + 1);
const square = liftStateless((x: number) => x * x);

// Pipeline: double -> add one -> square
const pipeline = compose(compose(double, addOne), square);

// Usage
const [state, output] = pipeline.run(5)(0);
// output = ((5 * 2) + 1)^2 = 121
```

### Parallel Composition

Parallel composition runs multiple streams on different inputs and pairs their outputs:

```typescript
import { parallel } from '../src/stream/core/operators';

const double = liftStateless((x: number) => x * 2);
const square = liftStateless((x: number) => x * x);

// Parallel composition
const parallelStream = parallel(double, square);

// Usage
const [state, output] = parallelStream.run([5, 3])(0);
// output = [10, 9] (5*2, 3^2)
```

### Functor Mapping

Apply functions to stream outputs using `fmap`:

```typescript
import { fmap } from '../src/stream/core/operators';

const numberStream = liftStateless((x: number) => x * 2);
const stringStream = fmap(numberStream, (x: number) => `Result: ${x}`);

// Usage
const [state, output] = stringStream.run(5)(0);
// output = "Result: 10"
```

## Fusion and Optimization

### Pure Stream Fusion

Pure streams can be fused together for optimization without changing semantics:

```typescript
import { fusePureSequence } from '../src/stream/core/operators';

const double = liftStateless((x: number) => x * 2);
const addOne = liftStateless((x: number) => x + 1);
const square = liftStateless((x: number) => x * x);

// Fuse pure operations
const fused = fusePureSequence([double, addOne, square]);

// This is equivalent to the composed version but optimized
const [state, output] = fused.run(5)(0);
// output = ((5 * 2) + 1)^2 = 121
```

### Fusion Detection

Check if streams can be fused:

```typescript
import { canFuse } from '../src/stream/core/operators';

const pure1 = liftStateless((x: number) => x * 2);
const pure2 = liftStateless((x: number) => x + 1);
const stateful = liftStateful((x: number, s: number) => [s + 1, x * 2]);

console.log(canFuse(pure1, pure2)); // true
console.log(canFuse(pure1, stateful)); // false
```

## State Management

### Explicit State

StatefulStream makes state explicit and composable:

```typescript
// Counter with explicit state
const counter = liftStateful((input: number, state: number) => {
  const newState = state + 1;
  return [newState, newState];
});

// Usage with state tracking
let state = 0;
const inputs = [1, 2, 3, 4, 5];

for (const input of inputs) {
  const [newState, output] = counter.run(input)(state);
  console.log(`Input: ${input} -> State: ${newState}, Output: ${output}`);
  state = newState;
}
```

### Complex State

State can be any type, enabling complex state management:

```typescript
// Statistics tracking
const statsStream = liftStateful((input: number, state: { count: number; sum: number; avg: number }) => {
  const newCount = state.count + 1;
  const newSum = state.sum + input;
  const newAvg = newSum / newCount;
  
  const newState = { count: newCount, sum: newSum, avg: newAvg };
  return [newState, newState];
});
```

## Purity Tracking

StatefulStream tracks purity to enable optimizations:

```typescript
import { isPureStream } from '../src/stream/core/types';

const pureStream = liftStateless((x: number) => x * 2);
const statefulStream = liftStateful((x: number, s: number) => [s + 1, x * 2]);

console.log(isPureStream(pureStream)); // true
console.log(isPureStream(statefulStream)); // false
```

## Integration with Existing ADTs

### ObservableLite Integration

Convert between StatefulStream and ObservableLite:

```typescript
import { toObservableLite } from '../src/stream/adapters';

const stream = liftStateless((x: number) => x * 2);
const observable = toObservableLite(stream, [1, 2, 3, 4, 5], 0);

observable.subscribe({
  next: (value) => console.log(value), // 2, 4, 6, 8, 10
  complete: () => console.log('Done')
});
```

### Maybe Integration

Handle optional values:

```typescript
import { fromMaybe, toMaybe } from '../src/stream/adapters';
import { Just, Nothing } from '../../../fp-maybe-unified';

// Convert Maybe to StatefulStream
const maybeStream = fromMaybe(Just(42));

// Convert StatefulStream to Maybe
const result = toMaybe(stream, input, initialState);
```

## Examples

### Basic Counter

```typescript
import { liftStateful } from '../src/stream/core/operators';

const counter = liftStateful((input: number, state: number) => {
  const newState = state + 1;
  return [newState, newState];
});

// Usage
let state = 0;
const inputs = [1, 2, 3, 4, 5];

for (const input of inputs) {
  const [newState, output] = counter.run(input)(state);
  console.log(`Count: ${output}`);
  state = newState;
}
// Output: Count: 1, Count: 2, Count: 3, Count: 4, Count: 5
```

### Complex Pipeline

```typescript
import { compose, liftStateless, liftStateful } from '../src/stream/core/operators';

// Create pipeline: filter even -> double -> accumulate
const evenFilter = liftStateful((input: number, state: number) => {
  if (input % 2 === 0) {
    return [state, input];
  } else {
    return [state, null];
  }
});

const double = liftStateless((x: number) => x * 2);
const accumulator = liftStateful((input: number, state: number) => {
  const newState = state + input;
  return [newState, newState];
});

const pipeline = compose(evenFilter, compose(double, accumulator));

// Usage
let state = 0;
const inputs = [1, 2, 3, 4, 5, 6];

for (const input of inputs) {
  const [newState, output] = pipeline.run(input)(state);
  if (output !== null) {
    console.log(`Input: ${input} -> Output: ${output}`);
  } else {
    console.log(`Input: ${input} -> Filtered out`);
  }
  state = newState;
}
```

### Feedback Loop

```typescript
import { liftStateful } from '../src/stream/core/operators';

// Exponential smoothing
const smoothing = liftStateful((input: number, state: number) => {
  const alpha = 0.3;
  const smoothed = alpha * input + (1 - alpha) * state;
  return [smoothed, smoothed];
});

// Usage
let state = 100; // Initial value
const inputs = [110, 90, 120, 80, 130];

for (const input of inputs) {
  const [newState, output] = smoothing.run(input)(state);
  console.log(`Input: ${input} -> Smoothed: ${output.toFixed(2)}`);
  state = newState;
}
```

## Best Practices

### 1. Use Pure Streams When Possible

Pure streams can be fused and optimized:

```typescript
// Good: Pure stream
const pureStream = liftStateless((x: number) => x * 2);

// Avoid: Unnecessary stateful stream
const statefulStream = liftStateful((x: number, state: number) => [state, x * 2]);
```

### 2. Compose Small, Focused Streams

Break complex logic into smaller, composable streams:

```typescript
// Good: Composable streams
const validate = liftStateless((x: number) => x > 0);
const transform = liftStateless((x: number) => x * 2);
const pipeline = compose(validate, transform);

// Avoid: Monolithic stream
const monolithic = liftStateful((x: number, state: number) => {
  if (x > 0) {
    return [state, x * 2];
  } else {
    return [state, null];
  }
});
```

### 3. Leverage Fusion for Performance

Use fusion helpers for pure operation sequences:

```typescript
// Good: Fused operations
const fused = fusePureSequence([double, addOne, square]);

// Less optimal: Manual composition
const composed = compose(compose(double, addOne), square);
```

### 4. Track State Explicitly

Make state management explicit and clear:

```typescript
// Good: Explicit state
const counter = liftStateful((input: number, state: number) => {
  const newState = state + 1;
  return [newState, newState];
});

// Avoid: Hidden state
let hiddenState = 0;
const badStream = liftStateless((x: number) => {
  hiddenState++; // Side effect!
  return x * 2;
});
```

## Type Safety

StatefulStream provides full type safety:

```typescript
// Type-safe composition
const stream1: StatefulStream<number, number, string> = liftStateless(x => x.toString());
const stream2: StatefulStream<string, number, number> = liftStateless(s => s.length);

// TypeScript will ensure compatibility
const composed = compose(stream1, stream2); // ✅ Type-safe

// TypeScript will catch errors
const invalid = compose(stream2, stream1); // ❌ Type error
```

## Performance Considerations

### Fusion Optimization

Pure streams are automatically fused for better performance:

```typescript
// These are equivalent but the fused version is more efficient
const composed = compose(compose(double, addOne), square);
const fused = fusePureSequence([double, addOne, square]);
```

### State Management

Minimize state updates when possible:

```typescript
// Good: Minimal state updates
const efficient = liftStateful((input: number, state: number) => {
  if (input > state) {
    return [input, input]; // Only update when necessary
  } else {
    return [state, state];
  }
});
```

## Conclusion

StatefulStream provides a powerful, type-safe foundation for building stateful stream processing pipelines. By treating streams as monoid homomorphisms with explicit state management, it enables:

- **Composable** stream processing
- **Type-safe** operations
- **Optimizable** pure operations
- **Explicit** state management
- **Mathematical rigor** through monoid laws

This foundation can be extended with more advanced features like time-based operations, error handling, and integration with reactive systems while maintaining the core principles of the State-monoid FRP model. 