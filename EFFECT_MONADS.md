# Effect Monads Implementation

This document describes the fully-functional Effect Monads (IO, Task, State) implementation with purity tagging, typeclass instances, fluent syntax, and full integration with the existing FP system.

## Overview

The Effect Monads provide three distinct computational contexts:

- **IO**: Lazy synchronous effects with potential side effects
- **Task**: Lazy asynchronous effects (Promise-based) with potential side effects  
- **State**: Pure state-passing computations with no side effects

All monads are fully integrated with the typeclass system, support fluent syntax, and are automatically registered in the global FP registry.

## Core Monads

### IO Monad (Lazy Synchronous Effect)

The `IO<A>` monad represents a computation that produces a value of type `A` when executed, potentially with side effects.

```typescript
import { IO } from './fp-effect-monads';

// Create IO from a value
const pureIO = IO.of(42);

// Create IO from a thunk
const effectIO = IO.from(() => {
  console.log('Side effect!');
  return Math.random();
});

// Execute the IO
const result = pureIO.run(); // 42
const randomValue = effectIO.run(); // Executes side effect and returns random number
```

#### IO Operations

```typescript
// Functor operations
const doubled = IO.of(5).map(x => x * 2);
const result = doubled.run(); // 10

// Applicative operations
const add = (a: number) => (b: number) => a + b;
const io1 = IO.of(3);
const io2 = IO.of(4);
const sum = IO.of(add).ap(io1).ap(io2);
const result = sum.run(); // 7

// Monad operations
const chained = IO.of(5)
  .chain(x => IO.of(x * 2))
  .chain(x => IO.of(x.toString()));
const result = chained.run(); // "10"

// Static constructors
const io = IO.of(42);
const fromThunk = IO.from(() => 'hello');
const lifted = IO.lift((x: number) => x * 2);

// Utility methods
const ios = [IO.of(1), IO.of(2), IO.of(3)];
const sequenced = IO.sequence(ios).run(); // [1, 2, 3]
const paralleled = IO.parallel(ios).run(); // [1, 2, 3]
```

### Task Monad (Lazy Asynchronous Effect)

The `Task<A>` monad represents a computation that produces a value of type `A` when executed asynchronously, potentially with side effects.

```typescript
import { Task } from './fp-effect-monads';

// Create Task from a value
const pureTask = Task.of(42);

// Create Task from a Promise
const asyncTask = Task.from(fetch('/api/data').then(r => r.json()));

// Create Task from a thunk that returns a Promise
const effectTask = Task.fromThunk(() => 
  fetch('/api/data').then(r => r.json())
);

// Execute the Task
const result = await pureTask.run(); // 42
const data = await asyncTask.run(); // API response
```

#### Task Operations

```typescript
// Functor operations
const doubled = Task.of(5).map(x => x * 2);
const result = await doubled.run(); // 10

// Applicative operations
const add = (a: number) => (b: number) => a + b;
const task1 = Task.of(3);
const task2 = Task.of(4);
const sum = Task.of(add).ap(task1).ap(task2);
const result = await sum.run(); // 7

// Monad operations
const chained = Task.of(5)
  .chain(x => Task.of(x * 2))
  .chain(x => Task.of(x.toString()));
const result = await chained.run(); // "10"

// Error handling
const errorTask = Task.fromThunk(() => Promise.reject(new Error('test')));
const handled = errorTask.catch(error => Task.of(`caught: ${error.message}`));
const result = await handled.run(); // "caught: test"

// Static constructors
const task = Task.of(42);
const fromPromise = Task.from(Promise.resolve('hello'));
const fromThunk = Task.fromThunk(() => Promise.resolve('world'));
const lifted = Task.lift(async (x: number) => x * 2);

// Utility methods
const tasks = [Task.of(1), Task.of(2), Task.of(3)];
const sequenced = await Task.sequence(tasks).run(); // [1, 2, 3]
const paralleled = await Task.parallel(tasks).run(); // [1, 2, 3]
```

### State Monad (Pure State-Passing Function)

The `State<S, A>` monad represents a pure computation that takes a state of type `S` and returns a value of type `A` along with a new state of type `S`.

```typescript
import { State } from './fp-effect-monads';

// Create State from a value
const pureState = State.of(42);

// Create State from a state function
const counterState = State.from(s => [s + 1, s * 2]);

// Execute the State
const [newState, value] = pureState.run(0); // [0, 42]
const [finalState, result] = counterState.run(5); // [6, 10]
```

#### State Operations

```typescript
// Basic execution
const state = State.from(s => [s + 1, s * 2]);
const [newState, value] = state.run(5); // [6, 10]

// State-specific methods
const evalResult = state.eval(5); // 10 (value only)
const execResult = state.exec(5); // 6 (state only)

// Functor operations
const doubled = State.of(5).map(x => x * 2);
const [s, result] = doubled.run(0); // [0, 10]

// Applicative operations
const add = (a: number) => (b: number) => a + b;
const state1 = State.of(3);
const state2 = State.of(4);
const sum = State.of(add).ap(state1).ap(state2);
const [s, result] = sum.run(0); // [0, 7]

// Monad operations
const chained = State.of(5)
  .chain(x => State.of(x * 2))
  .chain(x => State.of(x.toString()));
const [s, result] = chained.run(0); // [0, "10"]

// Static constructors
const state = State.of(42);
const fromFn = State.from(s => [s + 1, s * 2]);

// State-specific static methods
const getState = State.get(); // Get current state
const setState = State.set(100); // Set new state
const modifyState = State.modify(s => s * 2); // Modify state

// Usage examples
const counter = State.get()
  .chain(current => State.set(current + 1))
  .chain(() => State.get());

const [finalState, value] = counter.run(0); // [1, 1]
```

## Typeclass Instances

All Effect Monads implement the following typeclass instances:

### Functor

```typescript
// Identity law: map(id) = id
const identity = x => x;
const left = io.map(identity).run();
const right = identity(io.run());
assert(left === right);

// Composition law: map(f ∘ g) = map(f) ∘ map(g)
const composition = x => f(g(x));
const left = io.map(composition).run();
const right = io.map(g).map(f).run();
assert(left === right);
```

### Applicative

```typescript
// Identity law: ap(of(id), fa) = fa
const left = IO.of(id).ap(io).run();
const right = io.run();
assert(left === right);

// Homomorphism law: ap(of(f), of(a)) = of(f(a))
const left = IO.of(f).ap(IO.of(a)).run();
const right = IO.of(f(a)).run();
assert(left === right);

// Interchange law: ap(fab, of(a)) = ap(of(f => f(a)), fab)
const left = fab.ap(IO.of(a)).run();
const right = IO.of(f => f(a)).ap(fab).run();
assert(left === right);
```

### Monad

```typescript
// Left identity: chain(f, of(a)) = f(a)
const left = IO.of(a).chain(f).run();
const right = f(a).run();
assert(left === right);

// Right identity: chain(of, m) = m
const left = m.chain(IO.of).run();
const right = m.run();
assert(left === right);

// Associativity: chain(f, chain(g, m)) = chain(x => chain(f, g(x)), m)
const left = m.chain(g).chain(f).run();
const right = m.chain(x => g(x).chain(f)).run();
assert(left === right);
```

## Fluent Syntax

All Effect Monads support fluent method chaining:

```typescript
// IO fluent syntax
const result = IO.of(10)
  .map(x => x * 2)
  .chain(x => IO.of(x.toString()))
  .run(); // "20"

// Task fluent syntax
const result = await Task.of(10)
  .map(x => x * 2)
  .chain(x => Task.of(x.toString()))
  .run(); // "20"

// State fluent syntax
const [state, result] = State.of(10)
  .map(x => x * 2)
  .chain(x => State.of(x.toString()))
  .run(0); // [0, "20"]
```

## Dual API Integration

All Effect Monads integrate with the dual API system, providing both fluent methods and data-last functions:

```typescript
import { IODualAPI, TaskDualAPI, StateDualAPI } from './fp-effect-monads';

// Data-last functions for use with pipe()
const result = pipe(
  IO.of(5),
  IODualAPI.map(x => x * 2),
  IODualAPI.chain(x => IO.of(x.toString()))
).run(); // "10"

const asyncResult = await pipe(
  Task.of(5),
  TaskDualAPI.map(x => x * 2),
  TaskDualAPI.chain(x => Task.of(x.toString()))
).run(); // "10"

const [state, value] = pipe(
  State.of(5),
  StateDualAPI.map(x => x * 2),
  StateDualAPI.chain(x => State.of(x.toString()))
).run(0); // [0, "10"]
```

## Purity Tagging

Each Effect Monad is tagged with appropriate purity information:

```typescript
// IO: Impure (synchronous side effects)
const io = IO.of(42);
// Tagged as 'Impure' in registry

// Task: Async (asynchronous side effects)
const task = Task.of(42);
// Tagged as 'Async' in registry

// State: Pure (no side effects)
const state = State.of(42);
// Tagged as 'Pure' in registry
```

## Registry Integration

All Effect Monads are automatically registered in the global FP registry:

```typescript
// Access instances from registry
const registry = globalThis.__FP_REGISTRY;

const ioFunctor = registry.get('IOFunctor');
const ioApplicative = registry.get('IOApplicative');
const ioMonad = registry.get('IOMonad');

const taskFunctor = registry.get('TaskFunctor');
const taskApplicative = registry.get('TaskApplicative');
const taskMonad = registry.get('TaskMonad');

const stateFunctor = registry.get('StateFunctor');
const stateApplicative = registry.get('StateApplicative');
const stateMonad = registry.get('StateMonad');
```

## Standard Typeclass Instances

### Eq, Ord, Show

Due to their nature, Effect Monads have limited support for standard typeclasses:

- **IO**: No Eq (side effects), Ord and Show available
- **Task**: No Eq (side effects), Ord and Show available  
- **State**: No Eq (function nature), Ord and Show available

```typescript
// Ord instances (reference comparison)
const io1 = IO.of(42);
const io2 = IO.of(42);
const comparison = IOOrd.compare(io1, io2); // Reference comparison

// Show instances
const ioStr = IOShow.show(io1); // "IO(<function>)"
const taskStr = TaskShow.show(task1); // "Task(<function>)"
const stateStr = StateShow.show(state1); // "State(<function>)"
```

## Utility Functions

### Conversion Functions

```typescript
import { ioToTask } from './fp-effects-interop';
import { stateToIO, ioToState } from './fp-effect-monads';

// Convert IO to Task
const task = ioToTask(io);

// Convert Task to IO (unsafe) — centralized and throws by default
import { unsafeTaskToIO } from './fp-effects-interop';
const io = unsafeTaskToIO(task);

// Convert State to IO
const io = stateToIO(state, initialState);

// Convert IO to State
const state = ioToState(io);
```

## Performance Characteristics

### IO Monad
- **Creation**: O(1)
- **Execution**: O(1) per operation
- **Memory**: Minimal overhead
- **Side Effects**: Executed immediately on `.run()`

### Task Monad
- **Creation**: O(1)
- **Execution**: O(1) per operation, async
- **Memory**: Minimal overhead
- **Side Effects**: Executed when Promise resolves

### State Monad
- **Creation**: O(1)
- **Execution**: O(1) per operation
- **Memory**: Minimal overhead
- **Side Effects**: None (pure)

## Best Practices

### IO Monad
- Use for synchronous side effects
- Execute at the edge of your application
- Combine with error handling
- Consider using for file I/O, console operations

### Task Monad
- Use for asynchronous operations
- Handle errors with `.catch()`
- Use `.parallel()` for concurrent operations
- Consider using for API calls, database operations

### State Monad
- Use for pure state transformations
- Combine with other pure functions
- Use for complex state management
- Consider using for configuration, counters, accumulators

## Integration Examples

### With Other ADTs

```typescript
import { Maybe, Either } from './fp-maybe';
import { IO, Task, State } from './fp-effect-monads';

// IO with Maybe
const safeIO = IO.of(Maybe.Just(42))
  .map(maybe => maybe.map(x => x * 2));

// Task with Either
const safeTask = Task.of(Either.Right(42))
  .map(either => either.map(x => x * 2));

// State with Maybe
const safeState = State.of(Maybe.Just(42))
  .map(maybe => maybe.map(x => x * 2));
```

### Complex Pipelines

```typescript
// IO pipeline with error handling
const ioPipeline = IO.of(5)
  .map(x => x * 2)
  .chain(x => IO.from(() => {
    if (x > 10) throw new Error('Too big');
    return x;
  }))
  .map(x => x.toString());

// Task pipeline with async operations
const taskPipeline = Task.of(5)
  .map(x => x * 2)
  .chain(x => Task.from(fetch(`/api/data/${x}`)))
  .map(response => response.json())
  .catch(error => Task.of({ error: error.message }));

// State pipeline with state management
const statePipeline = State.of(5)
  .map(x => x * 2)
  .chain(x => State.modify(s => ({ ...s, count: s.count + 1 })))
  .chain(() => State.get())
  .map(state => state.count);
```

## Summary

The Effect Monads implementation provides:

- ✅ **IO Monad**: Lazy synchronous effects with side effects
- ✅ **Task Monad**: Lazy asynchronous effects with Promise integration
- ✅ **State Monad**: Pure state-passing computations
- ✅ **Typeclass Instances**: Functor, Applicative, Monad for all
- ✅ **Fluent Syntax**: Method chaining for all operations
- ✅ **Dual API**: Data-last functions for pipe composition
- ✅ **Purity Tagging**: Appropriate effect tracking
- ✅ **Registry Integration**: Automatic registration
- ✅ **Standard Instances**: Ord and Show where applicable
- ✅ **Performance**: Optimized for common use cases
- ✅ **Integration**: Works with existing FP system

All monads follow typeclass laws, support fluent syntax, and integrate seamlessly with the existing FP ecosystem. 