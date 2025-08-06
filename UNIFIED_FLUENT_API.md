# Unified Fluent API + FRP/Rx Interop

This document describes the unified fluent API that unifies ObservableLite, StatefulStream, core ADTs (Maybe, Either, Result), and persistent collections (PersistentList, PersistentMap, PersistentSet) under a shared fluent API with `.map`, `.chain`, `.filter`, etc., while adding lossless, type-safe FRP ↔ Rx interop.

## Overview

The unified fluent API provides a consistent interface across all FP types, enabling developers to write the same pipeline operations regardless of the underlying data type. This creates a seamless experience when working with different FP abstractions and enables easy conversion between them.

## Key Features

- **Unified Interface**: Same `.map`, `.chain`, `.filter` syntax for all FP types
- **Type-Safe Conversions**: Lossless conversion between all FP types
- **FRP ↔ Rx Interop**: Seamless switching between reactive and stateful streams
- **Persistence Integration**: Immutable collections with structural sharing
- **Purity Integration**: Purity metadata preserved through conversions
- **Performance Optimized**: Fast conversions with minimal overhead
- **Developer Experience**: Intuitive API with excellent TypeScript support

## Shared Fluent API

### Core Operations

All FP types support these core operations:

```typescript
// Functor operations
.map<B>(f: (a: A) => B): any

// Monad operations
.chain<B>(f: (a: A) => any): any
.flatMap<B>(f: (a: A) => any): any

// Filter operations
.filter(pred: (a: A) => boolean): any
.filterMap<B>(f: (a: A) => Maybe<B>): any

// Composition
.pipe<B>(...fns: Array<(a: any) => any>): any
```

### Stream-Specific Operations

Stream types (ObservableLite, StatefulStream) also support:

```typescript
// Stream operations
.scan<B>(reducer: (acc: B, value: A) => B, seed: B): any
.take(n: number): any
.skip(n: number): any
.distinct(): any
.drop(n: number): any
.slice(start: number, end?: number): any
.reverse(): any
.sortBy<B>(fn: (a: A) => B): any
```

### Collection-Specific Operations

Collection types (PersistentList, PersistentMap, PersistentSet) also support:

```typescript
// Collection operations
.scan<B>(reducer: (acc: B, value: A) => B, seed: B): any
.reduce<B>(reducer: (acc: B, value: A) => B, seed: B): B
.tap(side: (value: A) => void): any
```

### ADT-Specific Operations

ADT types (Maybe, Either, Result) also support:

```typescript
// ADT operations
.match<B>(patterns: any): B
.fold<B>(onLeft: (l: any) => B, onRight: (r: A) => B): B
.getOrElse(defaultValue: A): A
.orElse(alternative: any): any
```

## Single .map Syntax Across All Types

The same `.map` syntax works identically across all FP types:

### Maybe

```typescript
import { Maybe, Just, Nothing } from './fp-maybe';

const maybeValue = Just(42);
const doubled = maybeValue.map(x => x * 2);
console.log(doubled.value); // 84

const nothing = Nothing();
const nothingDoubled = nothing.map(x => x * 2);
console.log(nothingDoubled.isNothing()); // true
```

### Either

```typescript
import { Either, Left, Right } from './fp-either';

const rightValue = Right(42);
const doubled = rightValue.map(x => x * 2);
console.log(doubled.value); // 84

const leftValue = Left('error');
const leftDoubled = leftValue.map(x => x * 2);
console.log(leftDoubled.value); // 'error' (preserved)
```

### Result

```typescript
import { Result, Ok, Err } from './fp-result';

const okValue = Ok(42);
const doubled = okValue.map(x => x * 2);
console.log(doubled.value); // 84

const errValue = Err('error');
const errDoubled = errValue.map(x => x * 2);
console.log(errDoubled.error); // 'error' (preserved)
```

### ObservableLite

```typescript
import { ObservableLite } from './fp-observable-lite';

const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);
const doubled = obs.map(x => x * 2);
// doubled is ObservableLite<number> with values [2, 4, 6, 8, 10]
```

### StatefulStream

```typescript
import { fromArray } from './fp-frp-bridge';

const stream = fromArray([1, 2, 3, 4, 5]);
const doubled = stream.map(x => x * 2);
// doubled is StatefulStream<number, any, number> with doubled values
```

### PersistentList

```typescript
import { PersistentList } from './fp-persistent';

const list = PersistentList.fromArray([1, 2, 3, 4, 5]);
const doubled = list.map(x => x * 2);
// doubled is PersistentList<number> with values [2, 4, 6, 8, 10]
```

### PersistentMap

```typescript
import { PersistentMap } from './fp-persistent';

const map = PersistentMap.fromObject({ a: 1, b: 2, c: 3 });
const doubled = map.map(x => x * 2);
// doubled is PersistentMap<string, number> with doubled values
```

### PersistentSet

```typescript
import { PersistentSet } from './fp-persistent';

const set = PersistentSet.fromArray([1, 2, 3, 4, 5]);
const doubled = set.map(x => x * 2);
// doubled is PersistentSet<number> with doubled values
```

## Identical Pipeline Operations

The same pipeline works across all types:

```typescript
// Create the same pipeline for all types
const createPipeline = (source) => {
  return source
    .map(x => x * 2)
    .filter(x => x > 5)
    .chain(x => source.constructor.of(x + 10));
};

// Works with ObservableLite
const obs = ObservableLite.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const obsPipeline = createPipeline(obs);

// Works with StatefulStream
const stream = fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const streamPipeline = createPipeline(stream);

// Works with Maybe
const maybe = Just(42);
const maybePipeline = createPipeline(maybe);

// Works with Either
const either = Right(42);
const eitherPipeline = createPipeline(either);

// Works with Result
const result = Ok(42);
const resultPipeline = createPipeline(result);

// Works with PersistentList
const list = PersistentList.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const listPipeline = createPipeline(list);

// Works with PersistentMap
const map = PersistentMap.fromObject({ a: 1, b: 2, c: 3, d: 4, e: 5 });
const mapPipeline = createPipeline(map);

// Works with PersistentSet
const set = PersistentSet.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const setPipeline = createPipeline(set);
```

## Persistent Collections Integration

### PersistentList Fluent API

```typescript
import { PersistentList } from './fp-persistent';

const list = PersistentList.fromArray([1, 2, 3, 4, 5]);

// Core operations
const doubled = list.map(x => x * 2);
const filtered = list.filter(x => x > 3);
const chained = list.chain(x => PersistentList.fromArray([x, x * 2]));

// Collection-specific operations
const scanned = list.scan((acc, x) => acc + x, 0);
const reduced = list.reduce((acc, x) => acc + x, 0);
const tapped = list.tap(x => console.log(x));

// Pipeline composition
const pipeline = list
  .map(x => x * 2)
  .filter(x => x > 5)
  .scan((acc, x) => acc + x, 0)
  .tap(x => console.log('Result:', x));
```

### PersistentMap Fluent API

```typescript
import { PersistentMap } from './fp-persistent';

const map = PersistentMap.fromObject({ a: 1, b: 2, c: 3 });

// Core operations
const doubled = map.map(x => x * 2);
const filtered = map.filter(x => x > 2);
const chained = map.chain(x => PersistentMap.fromObject({ value: x, doubled: x * 2 }));

// Collection-specific operations
const scanned = map.scan((acc, x) => acc + x, 0);
const reduced = map.reduce((acc, x) => acc + x, 0);
const tapped = map.tap(x => console.log(x));

// Pipeline composition
const pipeline = map
  .map(x => x * 2)
  .filter(x => x > 3)
  .scan((acc, x) => acc + x, 0)
  .tap(x => console.log('Result:', x));
```

### PersistentSet Fluent API

```typescript
import { PersistentSet } from './fp-persistent';

const set = PersistentSet.fromArray([1, 2, 3, 4, 5]);

// Core operations
const doubled = set.map(x => x * 2);
const filtered = set.filter(x => x > 3);
const chained = set.chain(x => PersistentSet.fromArray([x, x * 2]));

// Collection-specific operations
const scanned = set.scan((acc, x) => acc + x, 0);
const reduced = set.reduce((acc, x) => acc + x, 0);
const tapped = set.tap(x => console.log(x));

// Pipeline composition
const pipeline = set
  .map(x => x * 2)
  .filter(x => x > 5)
  .scan((acc, x) => acc + x, 0)
  .tap(x => console.log('Result:', x));
```

## Derived Typeclass Instances

### PersistentList Instances

```typescript
import { 
  PersistentList,
  PersistentListFunctor,
  PersistentListApplicative,
  PersistentListMonad,
  PersistentListEq,
  PersistentListOrd,
  PersistentListShow
} from './fp-persistent';

// Functor instance
const doubled = PersistentListFunctor.map(
  PersistentList.fromArray([1, 2, 3]),
  x => x * 2
);

// Monad instance
const chained = PersistentListMonad.chain(
  PersistentList.fromArray([1, 2, 3]),
  x => PersistentList.fromArray([x, x * 2])
);

// Eq instance
const equal = PersistentListEq.equals(
  PersistentList.fromArray([1, 2, 3]),
  PersistentList.fromArray([1, 2, 3])
);

// Ord instance
const comparison = PersistentListOrd.compare(
  PersistentList.fromArray([1, 2, 3]),
  PersistentList.fromArray([1, 2, 4])
);

// Show instance
const string = PersistentListShow.show(
  PersistentList.fromArray([1, 2, 3])
);
```

### PersistentMap Instances

```typescript
import { 
  PersistentMap,
  PersistentMapFunctor,
  PersistentMapBifunctor,
  PersistentMapEq,
  PersistentMapOrd,
  PersistentMapShow
} from './fp-persistent';

// Functor instance
const doubled = PersistentMapFunctor.map(
  PersistentMap.fromObject({ a: 1, b: 2 }),
  x => x * 2
);

// Bifunctor instance
const bimapped = PersistentMapBifunctor.bimap(
  PersistentMap.fromObject({ a: 1, b: 2 }),
  k => k.toUpperCase(),
  v => v * 2
);

// Eq, Ord, Show instances work similarly
```

### PersistentSet Instances

```typescript
import { 
  PersistentSet,
  PersistentSetFunctor,
  PersistentSetEq,
  PersistentSetOrd,
  PersistentSetShow
} from './fp-persistent';

// Functor instance
const doubled = PersistentSetFunctor.map(
  PersistentSet.fromArray([1, 2, 3]),
  x => x * 2
);

// Eq, Ord, Show instances work similarly
```

## ObservableLite ↔ StatefulStream Conversions

### ObservableLite → StatefulStream

```typescript
import { ObservableLite } from './fp-observable-lite';

const obs = ObservableLite.fromArray([1, 2, 3, 4, 5]);

// Method 1: Using fluent API
const stateful = obs.toStatefulStream({ count: 0 });

// Method 2: Using conversion function
import { fromObservableLite } from './fp-frp-bridge';
const stateful2 = fromObservableLite(obs, { count: 0 });

// Both methods produce equivalent StatefulStream
console.log(typeof stateful.run === 'function'); // true
console.log(stateful.__purity); // 'Async'
```

### StatefulStream → ObservableLite

```typescript
import { fromArray } from './fp-frp-bridge';

const stream = fromArray([1, 2, 3, 4, 5]);

// Method 1: Using fluent API
const obs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });

// Method 2: Using conversion function
import { toObservableLite } from './fp-frp-bridge';
const obs2 = toObservableLite(stream, [1, 2, 3, 4, 5], { count: 0 });

// Both methods produce equivalent ObservableLite
console.log(obs instanceof ObservableLite); // true
```

### Async Conversion

```typescript
// Convert with async execution
const asyncObs = stream.toObservableLiteAsync(
  (async function* () {
    yield 1;
    yield 2;
    yield 3;
  })(),
  { count: 0 }
);
```

### Event-Driven Conversion

```typescript
// Convert with event-driven execution
const eventObs = stream.toObservableLiteEvent({ count: 0 });
```

## Type-Safe Conversions Between All Types

### Universal Conversion Functions

```typescript
import { 
  toObservableLite, 
  toStatefulStream, 
  toMaybe, 
  toEither, 
  toResult 
} from './fp-fluent-api';

// Convert any fluent type to ObservableLite
const obs = ObservableLite.fromArray([1, 2, 3]);
const list = PersistentList.fromArray([1, 2, 3]);
const map = PersistentMap.fromObject({ a: 1, b: 2 });
const set = PersistentSet.fromArray([1, 2, 3]);

const obsFromList = toObservableLite(list);
const obsFromMap = toObservableLite(map);
const obsFromSet = toObservableLite(set);

// Convert any fluent type to StatefulStream
const streamFromList = toStatefulStream(list, { count: 0 });
const streamFromMap = toStatefulStream(map, { count: 0 });
const streamFromSet = toStatefulStream(set, { count: 0 });

// Convert any fluent type to Maybe
const maybeFromList = toMaybe(list);
const maybeFromMap = toMaybe(map);
const maybeFromSet = toMaybe(set);

// Convert any fluent type to Either
const eitherFromList = toEither(list);
const eitherFromMap = toEither(map);
const eitherFromSet = toEither(set);

// Convert any fluent type to Result
const resultFromList = toResult(list);
const resultFromMap = toResult(map);
const resultFromSet = toResult(set);
```

### Fluent Conversion Methods

All types have conversion methods:

```typescript
// PersistentList conversions
const list = PersistentList.fromArray([1, 2, 3]);
const obs = list.toObservableLite();
const stream = list.toStatefulStream({ count: 0 });
const maybe = list.toMaybe();
const either = list.toEither();
const result = list.toResult();

// PersistentMap conversions
const map = PersistentMap.fromObject({ a: 1, b: 2 });
const obs2 = map.toObservableLite();
const stream2 = map.toStatefulStream({ count: 0 });
const maybe2 = map.toMaybe();
const either2 = map.toEither();
const result2 = map.toResult();

// PersistentSet conversions
const set = PersistentSet.fromArray([1, 2, 3]);
const obs3 = set.toObservableLite();
const stream3 = set.toStatefulStream({ count: 0 });
const maybe3 = set.toMaybe();
const either3 = set.toEither();
const result3 = set.toResult();
```

## Round-Trip Conversion

Round-trip conversions preserve values and state:

```typescript
// ObservableLite → StatefulStream → ObservableLite
const original = ObservableLite.fromArray([1, 2, 3, 4, 5]);
const stateful = original.toStatefulStream({ count: 0 });
const backToObs = stateful.toObservableLite([1, 2, 3, 4, 5], { count: 0 });

console.log(backToObs instanceof ObservableLite); // true

// StatefulStream → ObservableLite → StatefulStream
const stream = fromArray([1, 2, 3, 4, 5]);
const obs = stream.toObservableLite([1, 2, 3, 4, 5], { count: 0 });
const backToStream = obs.toStatefulStream({ count: 0 });

console.log(typeof backToStream.run === 'function'); // true

// PersistentList → ObservableLite → PersistentList
const list = PersistentList.fromArray([1, 2, 3, 4, 5]);
const obsFromList = list.toObservableLite();
const backToList = obsFromList.toStatefulStream({ count: 0 }).toPersistentList();

console.log(backToList instanceof PersistentList); // true

// Round-trip verification
import { testRoundTripConversion } from './fp-frp-bridge';
const roundTripWorks = testRoundTripConversion(original, [1, 2, 3, 4, 5], { count: 0 });
console.log(roundTripWorks); // true
```

## Purity + HKT Integration

### Purity Metadata

```typescript
// ObservableLite → StatefulStream marked as Async
const obs = ObservableLite.fromArray([1, 2, 3]);
const stateful = obs.toStatefulStream({ count: 0 });
console.log(stateful.__purity); // 'Async'

// StatefulStream → ObservableLite preserves existing purity
const pureStream = fromArray([1, 2, 3]).map(x => x * 2);
const pureObs = pureStream.toObservableLite([1, 2, 3], {});
console.log(pureObs.__purity); // 'Pure' (preserved from pureStream)

const statefulStream = fromArray([1, 2, 3]).scan((acc, x) => acc + x, 0);
const statefulObs = statefulStream.toObservableLite([1, 2, 3], {});
console.log(statefulObs.__purity); // 'State' (preserved from statefulStream)

// Persistent collections preserve purity
const list = PersistentList.fromArray([1, 2, 3]);
const listObs = list.toObservableLite();
console.log(listObs.__purity); // 'Pure' (persistent collections are pure)
```

### Typeclass Integration

```typescript
import { registerUnifiedInstances } from './fp-fluent-api';

// Register unified typeclass instances
registerUnifiedInstances();

// Unified instances work with all types
import { globalThis } from './fp-typeclasses-registry';
const registry = globalThis.__FP_REGISTRY;

const functor = registry.get('UnifiedFunctor');
const monad = registry.get('UnifiedMonad');
const bifunctor = registry.get('UnifiedBifunctor');
```

## Performance Benefits

### Fast Conversions

```typescript
// Efficient conversion implementations
const obs = ObservableLite.fromArray(largeArray);
const startTime = Date.now();
const stateful = obs.toStatefulStream({ count: 0 });
const conversionTime = Date.now() - startTime;
console.log(`Conversion time: ${conversionTime}ms`); // Typically < 10ms for 1000 items
```

### Memory Efficiency

```typescript
// Minimal memory overhead for conversions
const stream = fromArray([1, 2, 3, 4, 5]);
const obs = stream.toObservableLite([1, 2, 3, 4, 5], {});
// No intermediate allocations, direct conversion

// Persistent collections use structural sharing
const list = PersistentList.fromArray([1, 2, 3, 4, 5]);
const list2 = list.append(6);
// list and list2 share the same underlying structure
```

### Fusion Optimization

```typescript
// Conversions preserve optimization opportunities
const optimizedStream = obs
  .map(x => x * 2)
  .map(x => x + 1)
  .toStatefulStream({ count: 0 });
// map-map fusion still applies after conversion

// Persistent collections support efficient batch operations
const transient = TransientList.from(list);
transient.append(6).append(7).append(8);
const optimizedList = transient.freeze();
// Single freeze operation for multiple mutations
```

## Developer Experience

### Seamless Switching

```typescript
// Easy to switch between types based on needs
let data = ObservableLite.fromArray([1, 2, 3, 4, 5]);

// Need stateful processing? Convert!
data = data.toStatefulStream({ sum: 0 });

// Need reactive processing? Convert back!
data = data.toObservableLite([1, 2, 3, 4, 5], { sum: 0 });

// Need persistent storage? Convert to PersistentList!
data = data.toPersistentList();

// Need optional handling? Convert to Maybe!
data = data.toMaybe();

// Need error handling? Convert to Either!
data = data.toEither();
```

### No Boilerplate

```typescript
// Before: Manual conversion with boilerplate
const obs = ObservableLite.fromArray([1, 2, 3]);
const stateful = {
  run: (input) => (state) => {
    // Manual conversion logic
    return [state, input];
  }
};

// After: Direct fluent conversion
const obs = ObservableLite.fromArray([1, 2, 3]);
const stateful = obs.toStatefulStream({ count: 0 });

// Before: Manual typeclass instances
const PersistentListFunctor = {
  map: (fa, f) => fa.map(f)
};

// After: Auto-derived instances
const PersistentListInstances = deriveInstances<PersistentListK>({
  map: (fa, f) => fa.map(f),
  chain: (fa, f) => fa.flatMap(f),
  of: PersistentList.of
});
```

### TypeScript Support

```typescript
// Full type inference
const obs = ObservableLite.fromArray([1, 2, 3]);
const stateful = obs.toStatefulStream({ count: 0 });
// stateful is StatefulStream<number, {count: number}, number>

const list = stateful.toPersistentList();
// list is PersistentList<number>

const maybe = list.toMaybe();
// maybe is Maybe<number>

const either = maybe.toEither();
// either is Either<Error, number>
```

## Integration Points

### With Existing Systems

- **ObservableLite Integration**: Direct conversion methods added
- **StatefulStream Integration**: Direct conversion methods added
- **Persistent Collections Integration**: Fluent API and derived instances added
- **FRP Bridge Integration**: Conversion functions integrated
- **Fusion System Integration**: Optimizations preserved through conversions
- **Purity System Integration**: Purity tags maintained and propagated
- **Typeclass System Integration**: Conversion functions registered

### Future Extensibility

```typescript
// Easy to add new conversion types
export function toCustomStreamType(stream: any, options: any) {
  // Custom conversion logic
}

// Plugin architecture for custom conversions
export function registerCustomConverter(fromType: string, toType: string, converter: Function) {
  // Register custom conversion functions
}

// Easy to add new persistent collection types
export class PersistentQueue<T> {
  // Implementation
}

// Auto-derive instances
export const PersistentQueueInstances = deriveInstances<PersistentQueueK>({
  map: (fa, f) => fa.map(f),
  chain: (fa, f) => fa.flatMap(f),
  of: PersistentQueue.of
});

// Apply fluent API
applyFluentOps(PersistentQueue.prototype, PersistentQueueFluentImpl);
```

## Best Practices

### When to Use Each Type

- **ObservableLite**: Reactive programming, event streams, async operations
- **StatefulStream**: Stateful processing, monoid homomorphisms, batch operations
- **PersistentList**: Immutable lists, efficient random access, structural sharing
- **PersistentMap**: Immutable key-value storage, efficient lookups, HAMT structure
- **PersistentSet**: Immutable sets, efficient membership testing, uniqueness
- **Maybe**: Optional values, nullable handling
- **Either**: Error handling, success/failure scenarios
- **Result**: Explicit error types, async error handling

### Conversion Patterns

```typescript
// Pattern 1: Start with most appropriate type, convert as needed
let data = ObservableLite.fromArray([1, 2, 3, 4, 5]);
data = data.toStatefulStream({ sum: 0 }); // When state needed
data = data.toObservableLite([1, 2, 3, 4, 5], { sum: 0 }); // When reactive needed
data = data.toPersistentList(); // When persistence needed

// Pattern 2: Use conversion for error handling
const list = PersistentList.fromArray([1, 2, 3]);
const maybe = list.toMaybe(); // Convert for optional handling
const either = maybe.toEither(); // Convert for error handling
const result = either.toResult(); // Convert for explicit error types

// Pattern 3: Use conversion for stream processing
const list = PersistentList.fromArray([1, 2, 3, 4, 5]);
const obs = list.toObservableLite(); // For reactive processing
const stream = list.toStatefulStream({ count: 0 }); // For stateful processing
```

### Performance Considerations

```typescript
// Prefer direct operations over conversions when possible
// Good: Direct operations
const list = PersistentList.fromArray([1, 2, 3]).map(x => x * 2);

// Avoid: Unnecessary conversions
const obs = ObservableLite.fromArray([1, 2, 3]);
const list = obs.toPersistentList().map(x => x * 2);

// Use conversions only when needed for different processing models
// Good: Use transient mode for batch operations
const transient = TransientList.from(list);
transient.append(4).append(5).append(6);
const result = transient.freeze();

// Use structural sharing for memory efficiency
const list1 = PersistentList.fromArray([1, 2, 3]);
const list2 = list1.append(4);
// list1 and list2 share the same underlying structure
```

## Conclusion

The unified fluent API provides a seamless experience across all FP types, enabling developers to write consistent, type-safe code that can easily adapt to different processing requirements. The lossless, type-safe conversions between types make it easy to switch between reactive, stateful, and persistent programming models without rewriting code.

This unified approach eliminates the need to learn different APIs for different FP types and provides a consistent mental model for functional programming in TypeScript. The integration of persistent collections with derived instances and fluent API completes the unification of the entire FP ecosystem. 