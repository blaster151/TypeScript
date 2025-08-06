# StatefulStream: Stream Programs Are Monoid Homomorphisms with State

This document describes the StatefulStream implementation, which provides a powerful foundation for stream processing with state management, integrating with our purity system, HKT/typeclasses, and optics.

## Overview

StatefulStream implements the concepts from "Stream Programs Are Monoid Homomorphisms" with state management, providing:

- **StateFn<S, N>**: Core state transformer function
- **StatefulStream<I, S, O>**: Stateful stream wrapper with input I, state S, output O
- **Monoid homomorphism**: Safe composition of stream operations
- **Purity tracking**: Effect tracking for optimization
- **HKT integration**: Full typeclass support
- **Optics integration**: State and output focusing
- **Fusion rules**: Optimization through operation combination

## Core Types

### StateFn

The core state transformer type from the paper:

```typescript
export type StateFn<S, N> = (state: S) => [S, N];
```

Represents a function that takes a state `S` and returns a new state `S` and a value `N`.

### StateMonoid

Provides monoid structure for state composition:

```typescript
export interface StateMonoid<S, N> {
  empty: StateFn<S, N>;
  concat: (a: StateFn<S, N>, b: StateFn<S, N>) => StateFn<S, N>;
}
```

### StatefulStream

The main stream wrapper with HKT integration:

```typescript
export interface StatefulStream<I, S, O> {
  readonly run: (input: I) => StateFn<S, O>;
  readonly __brand: 'StatefulStream';
  readonly __purity: EffectTag;
}
```

## Basic Operations

### Creating Streams

**Stateless streams (pure functions):**
```typescript
const doubleStream = liftStateless((x: number) => x * 2);
const [state, output] = doubleStream.run(5)(); // [undefined, 10]
```

**Stateful streams (with state modification):**
```typescript
const incrementStream = liftStateful((input: number, state: number) => 
  [state + input, state]
);
const [state, output] = incrementStream.run(3)(5); // [8, 5]
```

**Identity and constant streams:**
```typescript
const idStream = identity<number>();
const constStream = constant<number, void, string>("hello");
```

### Composition Operators

**Sequential composition:**
```typescript
const doubleStream = liftStateless((x: number) => x * 2);
const addOneStream = liftStateless((x: number) => x + 1);
const composedStream = compose(doubleStream, addOneStream);
const [state, output] = composedStream.run(5)(); // [undefined, 11]
```

**Parallel composition:**
```typescript
const stream1 = liftStateless((x: number) => x * 2);
const stream2 = liftStateless((x: number) => x + 10);
const parallelStream = parallel(stream1, stream2);
const [state, output] = parallelStream.run([5, 3])(); // [undefined, [10, 13]]
```

**Fan-out (duplicate input):**
```typescript
const fanOutStream = fanOut(doubleStream, addOneStream);
const [state, output] = fanOutStream.run(5)(); // [undefined, [10, 6]]
```

**Fan-in (combine outputs):**
```typescript
const fanInStream = fanIn(stream1, stream2, (a, b) => a + b);
const [state, output] = fanInStream.run([5, 3])(); // [undefined, 18]
```

## Typeclass Instances

### Functor

```typescript
const stream = liftStateless((x: number) => x + 1);
const mappedStream = StatefulStreamFunctor.map(stream, (x) => x * 2);
const [state, output] = mappedStream.run(5)(); // [undefined, 12]
```

**Functor laws:**
- `map(id) = id`
- `map(f . g) = map(f) . map(g)`

### Applicative

```typescript
const streamF = liftStateless(() => (x: number) => x * 2);
const streamA = liftStateless(() => 5);
const appliedStream = StatefulStreamApplicative.ap(streamF, streamA);
const [state, output] = appliedStream.run()(); // [undefined, 10]
```

### Monad

```typescript
const stream = liftStateless((x: number) => x + 1);
const chainedStream = StatefulStreamMonad.chain(stream, (x) => 
  liftStateless(() => x * 2)
);
const [state, output] = chainedStream.run(5)(); // [undefined, 12]
```

**Monad laws:**
- `chain(return) = id`
- `chain(f) . return = f`
- `chain(f) . chain(g) = chain(x => chain(g)(f(x)))`

### Profunctor

```typescript
const stream = liftStateless((x: number) => x + 1);
const profunctorStream = StatefulStreamProfunctor.dimap(
  stream,
  (x: string) => parseInt(x), // Input transformation
  (x: number) => x.toString() // Output transformation
);
const [state, output] = profunctorStream.run("5")(); // [undefined, "6"]
```

## Purity Integration

StatefulStream integrates with our purity system for optimization:

```typescript
// Pure operations
const pureStream = liftStateless((x: number) => x * 2);
console.log(pureStream.__purity); // 'Pure'

// Stateful operations
const statefulStream = liftStateful((input, state) => [state + input, state]);
console.log(statefulStream.__purity); // 'State'

// Composition preserves purity
const composedPure = compose(pureStream, pureStream);
console.log(composedPure.__purity); // 'Pure'

const composedMixed = compose(pureStream, statefulStream);
console.log(composedMixed.__purity); // 'State'
```

This enables optimizations like pushing pure operations past stateful ones.

## Optics Integration

StatefulStream integrates with our optics system for state and output focusing:

### State Focusing

```typescript
import { lens } from './fp-optics-core';

// Create a lens for user state
const userLens = lens(
  (state) => state.user,
  (user, state) => ({ ...state, user })
);

// Create a stream that works on user state
const userStream = liftStateful((input, userState) => [userState, userState.name]);

// Focus the stream on user state
const focusedStream = focusState(userLens)(userStream);

const initialState = { user: { name: 'Alice', age: 30 }, count: 0 };
const [state, output] = focusedStream.run('test')(initialState);
// state: { user: { name: 'Alice', age: 30 }, count: 0 }
// output: 'Alice'
```

### Output Focusing

```typescript
// Create a lens for output value
const valueLens = lens(
  (output) => output.value,
  (value, output) => ({ ...output, value })
);

// Create a stream that outputs an object
const valueStream = liftStateless(() => ({ value: 42, metadata: 'test' }));

// Focus on the value field
const focusedOutputStream = focusOutput(valueLens)(valueStream);

const [state, output] = focusedOutputStream.run()();
// output: 42
```

## Fusion Rules

StatefulStream provides fusion rules for optimization:

### Map Fusion

```typescript
import { fuseMaps } from './fp-stream-fusion';

const f = (x: number) => x * 2;
const g = (x: number) => x + 1;
const fused = fuseMaps(f, g);

console.log(fused(5)); // 11 (same as g(f(5)))
```

### Pure Fusion

```typescript
import { fusePure } from './fp-stream-fusion';

const stream1 = liftStateless((x: number) => x * 2);
const stream2 = liftStateless((x: number) => x + 1);
const fusedStream = fusePure(stream1, stream2);

const [state, output] = fusedStream.run(5)();
// output: 11
// purity: 'Pure'
```

### Scan Fusion

```typescript
import { fuseScans } from './fp-stream-fusion';

const scan1 = (acc: number, x: number) => [acc + x, acc];
const scan2 = (acc: number, x: number) => [acc * x, acc];
const fusedScan = fuseScans(scan1, scan2);

const [state, output] = fusedScan(1, 5);
// state: 6 (1 + 5)
// output: 1 (original accumulator)
```

### Fusion Registry

The fusion system provides a global registry for custom fusion rules:

```typescript
import { globalFusionRegistry } from './fp-stream-fusion';

// Register a custom fusion rule
globalFusionRegistry.register({
  pattern: 'custom-fusion',
  canFuse: (f, g) => f.__purity === 'Pure' && g.__purity === 'Pure',
  fuse: (f, g) => fusePure(f, g)
});

// Try to fuse streams
const fused = globalFusionRegistry.tryFuse(stream1, stream2);
```

## Utility Functions

### Running Streams

```typescript
import { runStatefulStream, runStatefulStreamList } from './fp-stream-state';

const stream = liftStateless((x: number) => x * 2);

// Run single stream
const [state, output] = runStatefulStream(stream, 5, undefined);
// output: 10

// Run stream with list of inputs
const [state, outputs] = runStatefulStreamList(stream, [1, 2, 3], undefined);
// outputs: [2, 4, 6]
```

### Accumulating Streams

```typescript
import { scan } from './fp-stream-state';

const sumScan = scan(0, (acc: number, x: number) => [acc + x, acc]);
const [state, output] = sumScan.run(5)(0);
// state: 5 (new accumulator)
// output: 0 (previous accumulator)
```

### Filtering Streams

```typescript
import { filter, filterMap } from './fp-stream-state';

const evenFilter = filter((x: number) => x % 2 === 0);
const [state1, output1] = evenFilter.run(4)(); // [undefined, 4]
const [state2, output2] = evenFilter.run(3)(); // [undefined, undefined]

const safeDivide = filterMap((x: number) => x !== 0 ? 10 / x : undefined);
const [state3, output3] = safeDivide.run(2)(); // [undefined, 5]
const [state4, output4] = safeDivide.run(0)(); // [undefined, undefined]
```

## Advanced Patterns

### Stateful Accumulation

```typescript
// Create a stream that accumulates state
const accumulator = scan(0, (acc: number, x: number) => [acc + x, acc]);

// Compose with mapping
const mappedAccumulator = compose(
  accumulator,
  liftStateless((acc: number) => `Sum: ${acc}`)
);

const [state, output] = mappedAccumulator.run(5)(0);
// state: 5
// output: "Sum: 0"
```

### Conditional Processing

```typescript
// Create a conditional stream
const conditionalStream = liftStateful((input: number, state: number) => {
  if (input > 0) {
    return [state + input, `Positive: ${input}`];
  } else {
    return [state, `Non-positive: ${input}`];
  }
});

const [state, output] = conditionalStream.run(5)(0);
// state: 5
// output: "Positive: 5"
```

### Parallel Processing

```typescript
// Process different aspects in parallel
const lengthStream = liftStateless((s: string) => s.length);
const upperStream = liftStateless((s: string) => s.toUpperCase());

const parallelStream = parallel(lengthStream, upperStream);
const [state, [length, upper]] = parallelStream.run(["hello", "world"])();
// length: 5
// upper: "HELLO"
```

## Integration with Existing Systems

### HKT Integration

StatefulStream fully integrates with our HKT system:

```typescript
// HKT kind for StatefulStream
export interface StatefulStreamK extends Kind3 {
  readonly type: StatefulStream<this['A'], this['B'], this['C']>;
}

// Typeclass instances work with HKT
const stream: StatefulStream<number, void, number> = liftStateless((x) => x * 2);
const mapped: StatefulStream<number, void, string> = StatefulStreamFunctor.map(stream, (x) => x.toString());
```

### Registry Integration

StatefulStream instances are automatically registered:

```typescript
import { registerStatefulStreamPurity } from './fp-stream-state';

// Register typeclass instances
registerStatefulStreamPurity();

// Access from global registry
const registry = globalThis.__FP_REGISTRY;
const functor = registry.get('StatefulStreamFunctor');
const monad = registry.get('StatefulStreamMonad');
```

### Optics Integration

StatefulStream works seamlessly with our optics system:

```typescript
// Focus on nested state
const userLens = lens(
  (state) => state.user,
  (user, state) => ({ ...state, user })
);

const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

const focusedStream = focusState(userLens.then(nameLens))(
  liftStateless((name: string) => `Hello, ${name}!`)
);
```

## Performance Considerations

### Fusion Optimization

The fusion system automatically optimizes stream compositions:

```typescript
// These are automatically fused for better performance
const optimizedStream = compose(
  liftStateless((x: number) => x * 2),  // Pure
  liftStateless((x: number) => x + 1)   // Pure
);
// Result: Single pure operation instead of two
```

### Purity-Based Optimization

Pure operations can be reordered and optimized:

```typescript
// Pure operations can be pushed past stateful ones
const optimized = compose(
  liftStateless((x: number) => x * 2),  // Pure
  liftStateful((x: number, state: number) => [state + x, state]), // Stateful
  liftStateless((x: number) => x + 1)   // Pure
);
// Can be optimized to: stateful . pure (combined)
```

### Memory Management

StatefulStream is designed for efficient memory usage:

- Stateless streams share no state between operations
- Stateful streams only maintain necessary state
- Fusion reduces intermediate allocations
- Optics allow focused state access

## Best Practices

### 1. Use Purity Appropriately

```typescript
// Use liftStateless for pure operations
const pureStream = liftStateless((x: number) => x * 2);

// Use liftStateful only when state modification is needed
const statefulStream = liftStateful((input: number, state: number) => 
  [state + input, state]
);
```

### 2. Leverage Fusion

```typescript
// Let the fusion system optimize your compositions
const stream = compose(
  liftStateless((x: number) => x * 2),
  liftStateless((x: number) => x + 1),
  liftStateless((x: number) => x.toString())
);
// Automatically fused into a single operation
```

### 3. Use Optics for State Management

```typescript
// Focus on specific parts of state
const focusedStream = focusState(userLens)(
  liftStateful((input, user) => [user, user.name])
);
```

### 4. Compose Incrementally

```typescript
// Build complex streams from simple components
const baseStream = liftStateless((x: number) => x * 2);
const filteredStream = compose(baseStream, filter((x: number) => x > 10));
const finalStream = compose(filteredStream, liftStateless((x: number) => x.toString()));
```

## Conclusion

StatefulStream provides a powerful foundation for stream processing with state management, integrating seamlessly with our existing FP ecosystem. Key benefits include:

- **Type Safety**: Full TypeScript support with HKT integration
- **Composability**: Monoid homomorphism enables safe composition
- **Optimization**: Purity tracking and fusion rules enable automatic optimization
- **Flexibility**: Optics integration allows focused state and output manipulation
- **Performance**: Efficient memory usage and operation fusion
- **Integration**: Works seamlessly with existing typeclass and registry systems

This implementation provides a solid foundation for building complex stream processing pipelines while maintaining type safety and performance. 