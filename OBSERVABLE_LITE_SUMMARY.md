# ObservableLite - Minimal FP-Integrated Observable Type

## Overview

ObservableLite is a minimal, fully FP-integrated observable type that works seamlessly with the HKT system, purity tracking, and Functor/Monad typeclasses. It provides a lightweight alternative to RxJS while maintaining full functional programming principles and type safety.

## Key Features

- **HKT-Aware**: Full integration with the Higher-Kinded Types system
- **Purity Tracking**: Marked as 'Async' effect for proper purity tracking
- **Functor & Monad**: Law-compliant Functor and Monad instances
- **Chainable Methods**: FP-style method chaining without .pipe()
- **Type Safety**: Full TypeScript type safety throughout
- **Lightweight**: Minimal implementation without external dependencies
- **Future-Ready**: Hooks for future optics integration

## Core Type Definition

### ObservableLite<A>

The core observable type wraps a subscribe function:

```typescript
export class ObservableLite<A> {
  private readonly _subscribe: Subscribe<A>;
  
  constructor(subscribe: Subscribe<A>) {
    this._subscribe = subscribe;
  }
  
  subscribe(observer: Observer<A>): Unsubscribe;
  subscribe(
    next: (value: A) => void,
    error?: (err: any) => void,
    complete?: () => void
  ): Unsubscribe;
}
```

### Observer Interface

```typescript
export interface Observer<A> {
  next: (value: A) => void;
  error?: (err: any) => void;
  complete?: () => void;
}
```

### Subscribe and Unsubscribe Types

```typescript
export type Subscribe<A> = (observer: Observer<A>) => Unsubscribe;
export type Unsubscribe = () => void;
```

## HKT Integration

### ObservableLiteK

ObservableLite is fully integrated with the HKT system:

```typescript
export interface ObservableLiteK extends Kind1 {
  readonly type: ObservableLite<this['arg0']>;
  readonly __effect: 'Async'; // Mark as async for purity tracking
}
```

### Type Aliases

```typescript
export type ObservableLiteWithEffect<A> = ObservableLite<A> & { readonly __effect: 'Async' };
export type ApplyObservableLite<Args extends TypeArgs<any>> = Apply<ObservableLiteK, Args>;
export type ObservableLiteOf<A> = ApplyObservableLite<[A]>;
```

## Purity Integration

ObservableLite is properly tagged as an 'Async' effect:

```typescript
export type EffectOfObservableLite<T> = T extends ObservableLite<any> ? 'Async' : 'Pure';
export type IsObservableLitePure<T> = EffectOfObservableLite<T> extends 'Pure' ? true : false;
export type IsObservableLiteImpure<T> = EffectOfObservableLite<T> extends 'Pure' ? false : true;
```

## FP Instance Methods

### map (Functor)

Transform values in the observable:

```typescript
map<B>(f: (a: A) => B): ObservableLite<B>
```

**Example:**
```typescript
const numbers = ObservableLite.fromArray([1, 2, 3, 4, 5]);
const doubled = numbers.map(x => x * 2);
// Result: [2, 4, 6, 8, 10]
```

### flatMap (Monad)

Flatten nested observables:

```typescript
flatMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B>
```

**Example:**
```typescript
const numbers = ObservableLite.fromArray([1, 2, 3]);
const nested = numbers.flatMap(x => ObservableLite.fromArray([x, x * 2]));
// Result: [1, 2, 2, 4, 3, 6]
```

### filter

Filter values based on a predicate:

```typescript
filter(predicate: (a: A) => boolean): ObservableLite<A>
```

**Example:**
```typescript
const numbers = ObservableLite.fromArray([1, 2, 3, 4, 5, 6]);
const evens = numbers.filter(x => x % 2 === 0);
// Result: [2, 4, 6]
```

### scan

Accumulate values and emit intermediate results:

```typescript
scan<B>(reducer: (acc: B, value: A) => B, initial: B): ObservableLite<B>
```

**Example:**
```typescript
const numbers = ObservableLite.fromArray([1, 2, 3, 4]);
const sums = numbers.scan((acc, val) => acc + val, 0);
// Result: [0, 1, 3, 6, 10]
```

### take

Limit the number of emissions:

```typescript
take(count: number): ObservableLite<A>
```

**Example:**
```typescript
const numbers = ObservableLite.fromArray([1, 2, 3, 4, 5]);
const firstThree = numbers.take(3);
// Result: [1, 2, 3]
```

### skip

Skip the first n emissions:

```typescript
skip(count: number): ObservableLite<A>
```

**Example:**
```typescript
const numbers = ObservableLite.fromArray([1, 2, 3, 4, 5]);
const lastThree = numbers.skip(2);
// Result: [3, 4, 5]
```

### catchError

Handle errors in the observable:

```typescript
catchError(handler: (err: any) => ObservableLite<A>): ObservableLite<A>
```

**Example:**
```typescript
const errorObs = new ObservableLite<number>((observer) => {
  observer.next(1);
  observer.error('test error');
  return () => {};
});

const recovered = errorObs.catchError((err) => {
  console.log('Recovered from:', err);
  return ObservableLite.of(42);
});
// Result: [1, 42]
```

## Static Factory Methods

### ObservableLite.of

Create an observable that emits a single value:

```typescript
static of<A>(value: A): ObservableLite<A>
```

**Example:**
```typescript
const obs = ObservableLite.of(42);
// Emits: [42]
```

### ObservableLite.fromArray

Create an observable from an array:

```typescript
static fromArray<A>(values: readonly A[]): ObservableLite<A>
```

**Example:**
```typescript
const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
// Emits: [1, 2, 3, 4, 5]
```

### ObservableLite.fromPromise

Create an observable from a promise:

```typescript
static fromPromise<A>(promise: Promise<A>): ObservableLite<A>
```

**Example:**
```typescript
const promise = fetch('/api/data').then(res => res.json());
const obs = ObservableLite.fromPromise(promise);
// Emits the resolved value or error
```

### ObservableLite.fromEvent

Create an observable from DOM events:

```typescript
static fromEvent<T extends Event>(
  target: EventTarget,
  eventName: string
): ObservableLite<T>
```

**Example:**
```typescript
const button = document.getElementById('myButton');
const clicks = ObservableLite.fromEvent(button, 'click');
// Emits click events
```

### ObservableLite.interval

Create an observable that emits values at intervals:

```typescript
static interval(interval: number): ObservableLite<number>
```

**Example:**
```typescript
const timer = ObservableLite.interval(1000);
// Emits: 0, 1, 2, 3, ... every second
```

### ObservableLite.timer

Create an observable that emits a value after a delay:

```typescript
static timer<A>(delay: number, value: A): ObservableLite<A>
```

**Example:**
```typescript
const delayed = ObservableLite.timer(5000, 'delayed message');
// Emits 'delayed message' after 5 seconds
```

### ObservableLite.merge

Merge multiple observables:

```typescript
static merge<A>(...observables: ObservableLite<A>[]): ObservableLite<A>
```

**Example:**
```typescript
const obs1 = ObservableLite.fromArray([1, 2]);
const obs2 = ObservableLite.fromArray([3, 4]);
const merged = ObservableLite.merge(obs1, obs2);
// Emits: [1, 2, 3, 4] (order may vary)
```

### ObservableLite.combine

Combine multiple observables with a function:

```typescript
static combine<A, B, C>(
  fn: (a: A, b: B) => C,
  obsA: ObservableLite<A>,
  obsB: ObservableLite<B>
): ObservableLite<C>
```

**Example:**
```typescript
const obs1 = ObservableLite.fromArray([1, 2]);
const obs2 = ObservableLite.fromArray([10, 20]);
const combined = ObservableLite.combine((a, b) => a + b, obs1, obs2);
// Emits: [11, 22]
```

## Utility Functions

### fromAsync

Create an observable from an async function:

```typescript
export function fromAsync<A>(fn: () => Promise<A>): ObservableLite<A>
```

**Example:**
```typescript
const obs = fromAsync(() => fetch('/api/data').then(res => res.json()));
```

### fromAsyncGenerator

Create an observable from an async generator:

```typescript
export function fromAsyncGenerator<A>(generator: () => AsyncGenerator<A>): ObservableLite<A>
```

**Example:**
```typescript
const generator = async function* () {
  yield 1;
  yield 2;
  yield 3;
};

const obs = fromAsyncGenerator(generator);
// Emits: [1, 2, 3]
```

### fromGenerator

Create an observable from a synchronous generator:

```typescript
export function fromGenerator<A>(generator: () => Generator<A>): ObservableLite<A>
```

**Example:**
```typescript
const generator = function* () {
  yield 'a';
  yield 'b';
  yield 'c';
};

const obs = fromGenerator(generator);
// Emits: ['a', 'b', 'c']
```

### fromIterable

Create an observable from an iterable:

```typescript
export function fromIterable<A>(iterable: Iterable<A>): ObservableLite<A>
```

**Example:**
```typescript
const set = new Set([1, 2, 3]);
const obs = fromIterable(set);
// Emits: [1, 2, 3]
```

### fromCallback

Create an observable from a callback-based API:

```typescript
export function fromCallback<A>(
  subscribe: (callback: (value: A) => void) => () => void
): ObservableLite<A>
```

**Example:**
```typescript
let callback = null;
const subscribe = (cb) => {
  callback = cb;
  return () => { callback = null; };
};

const obs = fromCallback(subscribe);
// Emits values when callback is called
```

### fromTry

Create an observable from a function that may throw:

```typescript
export function fromTry<A>(fn: () => A): ObservableLite<A>
```

**Example:**
```typescript
const obs = fromTry(() => {
  if (Math.random() > 0.5) {
    throw new Error('Random error');
  }
  return 'success';
});
// Emits 'success' or error
```

## Typeclass Instances

### Functor Instance

```typescript
export const ObservableLiteFunctor: Functor<ObservableLiteK> = {
  map: <A, B>(fa: ObservableLite<A>, f: (a: A) => B): ObservableLite<B> => {
    return fa.map(f);
  }
};
```

### Applicative Instance

```typescript
export const ObservableLiteApplicative: Applicative<ObservableLiteK> = {
  ...ObservableLiteFunctor,
  of: <A>(a: A): ObservableLite<A> => ObservableLite.of(a),
  ap: <A, B>(fab: ObservableLite<(a: A) => B>, fa: ObservableLite<A>): ObservableLite<B> => {
    return ObservableLite.combine((fn, value) => fn(value), fab, fa);
  }
};
```

### Monad Instance

```typescript
export const ObservableLiteMonad: Monad<ObservableLiteK> = {
  ...ObservableLiteApplicative,
  chain: <A, B>(fa: ObservableLite<A>, f: (a: A) => ObservableLite<B>): ObservableLite<B> => {
    return fa.flatMap(f);
  }
};
```

## Law Compliance

### Functor Laws

1. **Identity**: `map(fa, x => x) = fa`
2. **Composition**: `map(fa, f) |> map(_, g) = map(fa, x => g(f(x)))`

### Monad Laws

1. **Left Identity**: `chain(of(a), f) = f(a)`
2. **Right Identity**: `chain(ma, of) = ma`
3. **Associativity**: `chain(chain(ma, f), g) = chain(ma, x => chain(f(x), g))`

## Type Guards and Utilities

### isObservableLite

Check if a value is an ObservableLite:

```typescript
export function isObservableLite(value: any): value is ObservableLite<any>
```

### isObservableLiteOf

Check if a value is an ObservableLite with a specific type:

```typescript
export function isObservableLiteOf<A>(value: any): value is ObservableLite<A>
```

### createObservable

Create a type-safe observable from a value:

```typescript
export function createObservable<A>(value: A): ObservableLite<A>
```

## Realistic Examples

### HTTP API Stream Processing

```typescript
// Simulate HTTP requests
const requests = ObservableLite.fromArray(['user1', 'user2', 'user3']);

const responses = requests.flatMap(userId => 
  ObservableLite.fromPromise(
    fetch(`/api/users/${userId}`).then(res => res.json())
  )
);

const processed = responses
  .map(user => ({ ...user, processed: true }))
  .filter(user => user.active)
  .take(2);

// Mock the responses
const mockResponses = [
  { id: 'user1', name: 'John', active: true },
  { id: 'user2', name: 'Jane', active: false },
  { id: 'user3', name: 'Bob', active: true }
];

// Process the stream
const values = await collectValues(processed);
// Result: 2 active users processed
```

### Event Stream Processing

```typescript
const events = ObservableLite.fromArray([
  { type: 'click', x: 100, y: 200 },
  { type: 'move', x: 150, y: 250 },
  { type: 'click', x: 200, y: 300 },
  { type: 'scroll', delta: 10 }
]);

const clicks = events
  .filter(event => event.type === 'click')
  .map(event => ({ x: event.x, y: event.y }));

const values = await collectValues(clicks);
// Result: 2 click events with coordinates
```

### Data Transformation Pipeline

```typescript
const data = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

const pipeline = data
  .filter(x => x % 2 === 0)
  .map(x => x * 2)
  .scan((acc, val) => acc + val, 0)
  .take(3);

const values = await collectValues(pipeline);
// Result: [0, 4, 12] - accumulated sums of doubled even numbers
```

## Integration with Existing FP System

### Typeclass Integration

ObservableLite integrates seamlessly with the existing typeclass system:

```typescript
import {
  ObservableLite,
  ObservableLiteFunctor,
  ObservableLiteMonad
} from './fp-typeclasses';

// Use with existing FP patterns
const result = ObservableLiteFunctor.map(
  ObservableLite.fromArray([1, 2, 3]),
  x => x * 2
);
```

### Purity Tracking Integration

Full integration with the purity tracking system:

```typescript
import {
  EffectOfObservableLite,
  IsObservableLitePure,
  IsObservableLiteImpure
} from './fp-observable-lite';

// Type-level purity checking
type Effect = EffectOfObservableLite<ObservableLite<number>>; // 'Async'
type IsPure = IsObservableLitePure<ObservableLite<number>>; // false
type IsImpure = IsObservableLiteImpure<ObservableLite<number>>; // true
```

### HKT Integration

Works with the existing HKT system:

```typescript
import { Apply, ObservableLiteK } from './fp-observable-lite';

// Type-safe HKT operations
type NumberObservable = Apply<ObservableLiteK, [number]>;
// Equivalent to: ObservableLite<number>
```

## Future Optics Integration

ObservableLite includes placeholder methods for future optics integration:

### lensMap

```typescript
lensMap<B>(lens: any, fn: (b: B) => B): ObservableLite<A>
```

Future implementation will allow mapping over focused parts of values using lenses.

### prismFilter

```typescript
prismFilter<B>(prism: any): ObservableLite<B>
```

Future implementation will allow filtering and transforming values using prisms.

## Design Principles

### 1. Minimalism

ObservableLite is designed to be lightweight and focused:

- No external dependencies
- Minimal API surface
- Essential functionality only
- Easy to understand and extend

### 2. FP-First

Built with functional programming principles:

- Immutable operations
- Pure functions where possible
- Law-compliant typeclasses
- Composition over inheritance

### 3. Type Safety

Full TypeScript integration:

- Generic type parameters
- Type inference
- Compile-time error checking
- HKT integration

### 4. Performance

Efficient implementation:

- Lazy evaluation
- Minimal allocations
- Efficient unsubscribe handling
- Memory leak prevention

### 5. Interoperability

Designed to work with existing systems:

- Standard observer pattern
- Promise integration
- Event target compatibility
- Iterable support

## Testing

Comprehensive test suite covering:

- Basic functionality
- FP instance methods
- Functor and Monad laws
- Typeclass instances
- Purity integration
- HKT integration
- Realistic use cases

Run tests with:
```bash
node run-observable-tests.js
```

## Comparison with RxJS

### Advantages of ObservableLite

- **Lightweight**: No external dependencies
- **FP-Integrated**: Built for functional programming
- **Type-Safe**: Full TypeScript integration
- **HKT-Aware**: Works with higher-kinded types
- **Purity-Tracked**: Integrated with purity system

### When to Use ObservableLite

- Small to medium projects
- FP-focused codebases
- When you need HKT integration
- When you want minimal dependencies
- Learning functional programming

### When to Use RxJS

- Large enterprise applications
- Complex reactive patterns
- When you need extensive operators
- When you need scheduler support
- When you need extensive community support

## Conclusion

ObservableLite provides a minimal, fully FP-integrated observable type that serves as a foundation for reactive streams in functional programming contexts. It maintains full compatibility with the existing FP infrastructure while providing a lightweight alternative to heavy reactive libraries.

The design emphasizes:
- **Simplicity** through minimal API
- **Type Safety** through TypeScript integration
- **FP Principles** through law-compliant typeclasses
- **Integration** with existing FP systems
- **Future-Ready** design for optics integration

ObservableLite is ideal for projects that need reactive programming capabilities without the complexity of full-featured reactive libraries, while maintaining full integration with functional programming ecosystems. 