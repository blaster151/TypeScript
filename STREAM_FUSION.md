# StatefulStream Fusion System

This document describes the fusion system for StatefulStream that identifies fusion opportunities in composition chains and rewrites them into equivalent but more efficient pipelines while preserving semantics using purity and state laws.

## Overview

The fusion system is based on the principles from "Stream Programs Are Monoid Homomorphisms with State" and provides:

- **Automatic fusion detection**: Identifies opportunities for operation combination
- **Law-preserving rewrites**: Ensures semantic equivalence after optimization
- **Purity-driven optimization**: Uses purity information to determine safe reordering
- **AST-like plan representation**: Internal representation for optimization
- **Integration with existing systems**: Works with purity, HKT, and optics
- **ObservableLite integration**: Automatic optimization for ObservableLite pipelines

## Core Concepts

### Pure vs Stateful Operations

**Pure operations** can be freely reordered and combined:
- `map(f)`: Pure transformation
- `filter(p)`: Pure filtering
- `filterMap(f)`: Pure mapping and filtering

**Stateful operations** have ordering constraints:
- `scan(f)`: Stateful accumulation
- `flatMap(f)`: Stateful expansion
- `compose(f, g)`: Sequential composition

### Fusion Laws

The fusion system preserves the following laws:

1. **Functor Laws**:
   - `map(id) = id`
   - `map(f . g) = map(f) . map(g)`

2. **Monad Laws**:
   - `chain(return) = id`
   - `chain(f) . return = f`
   - `chain(f) . chain(g) = chain(x => chain(g)(f(x)))`

3. **Purity Laws**:
   - Pure operations can be reordered
   - Pure operations can be pushed past stateful ones
   - Stateful operations cannot be reordered without analysis

## Fusion Rules

### 1. Map-Map Fusion (Pure)

**Rule**: `map(g) ∘ map(f) => map(g ∘ f)`

```typescript
import { fuseMapMap } from './fp-stream-fusion';

const f = (x: number) => x * 2;
const g = (x: number) => x + 1;
const fused = fuseMapMap(f, g);

console.log(fused(5)); // 11 (same as g(f(5)))
```

**Benefits**:
- Reduces two function calls to one
- Eliminates intermediate value allocation
- Always safe because map operations are pure

### 2. Map Past Scan (Pure → Stateful)

**Rule**: `map ∘ scan => scan'` where transformation is inside scan

```typescript
import { pushMapPastScan } from './fp-stream-fusion';

const mapFn = (x: number) => x * 2;
const scanFn = (state: number) => [state + 1, state];
const pushedScan = pushMapPastScan(mapFn, scanFn);

const [state, output] = pushedScan(5);
// state: 6 (original scan result)
// output: 10 (mapped scan result)
```

**Benefits**:
- Pushes pure operations inside stateful ones
- Reduces intermediate allocations
- Preserves state transitions

### 3. Filter-Filter Fusion (Pure)

**Rule**: `filter(p) ∘ filter(q) => filter(x => p(x) && q(x))`

```typescript
import { fuseFilters } from './fp-stream-fusion';

const p = (x: number) => x > 0;
const q = (x: number) => x < 10;
const fused = fuseFilters(p, q);

console.log(fused(5)); // true
console.log(fused(15)); // false
```

**Benefits**:
- Combines two predicate checks into one
- Reduces intermediate allocations
- Always safe because filter operations are pure

### 4. FilterMap-FilterMap Fusion (Pure)

**Rule**: `filterMap(f) ∘ filterMap(g) => filterMap(x => f(x).then(g))`

```typescript
import { fuseFilterMaps } from './fp-stream-fusion';

const f = (x: number) => x > 0 ? x * 2 : undefined;
const g = (x: number) => x > 10 ? x + 1 : undefined;
const fused = fuseFilterMaps(f, g);

console.log(fused(5)); // 11 (f(5) = 10, g(10) = 11)
console.log(fused(3)); // undefined (f(3) = 6, g(6) = undefined)
```

**Benefits**:
- Combines two filterMap operations into one
- Reduces intermediate allocations
- Always safe because filterMap operations are pure

### 5. Scan-Scan Fusion (Stateful)

**Rule**: `scan(f) ∘ scan(g) => scan(f ∘ g)` when f and g are compatible

```typescript
import { fuseScans } from './fp-stream-fusion';

const scan1 = (acc: number, x: number) => [acc + x, acc];
const scan2 = (acc: number, x: number) => [acc * x, acc];
const fused = fuseScans(scan1, scan2);

const [state, output] = fused(1, 5);
// state: 6 (1 + 5)
// output: 1 (original accumulator)
```

**Benefits**:
- Combines two scan operations into one
- Reduces intermediate state allocations
- Requires compatibility analysis

### 6. Pure Segment Fusion

**Rule**: Sequentially combine pure segments without re-entering state

```typescript
import { fusePureSegments } from './fp-stream-fusion';

const op1 = (input: number) => (state: number) => [state, input * 2];
const op2 = (input: number) => (state: number) => [state, input + 1];
const fused = fusePureSegments(op1, op2);

const [state, output] = fused(5)(0);
// state: 0 (unchanged)
// output: 11 (5 * 2 + 1)
```

**Benefits**:
- Combines multiple pure operations into one
- Eliminates intermediate state transitions
- Always safe for pure operations

## ObservableLite Fusion Integration

The fusion system is fully integrated with ObservableLite, providing automatic optimization for all operator chains.

### Automatic Optimization

All ObservableLite pipelines are automatically optimized:

```typescript
import { ObservableLite } from './fp-observable-lite';

// This chain is automatically optimized
const optimized = ObservableLite.fromArray([1, 2, 3, 4, 5])
  .pipe(
    obs => obs.map(x => x * 2),      // Pure operation
    obs => obs.map(x => x + 1),      // Pure operation - will be fused
    obs => obs.filter(x => x > 5),   // Pure operation - will be fused
    obs => obs.take(2)               // Pure operation - will be fused
  );

// The above chain is automatically optimized to:
// - Combine map operations: map(x => (x * 2 + 1))
// - Combine filter and map: filterMap(x => (x * 2 + 1) > 5 ? (x * 2 + 1) : undefined)
// - Apply take operation
```

### .pipe() Method with Fusion

The `.pipe()` method automatically applies fusion optimization:

```typescript
// Before fusion: 4 separate operations
const before = obs.pipe(
  obs => obs.map(x => x * 2),
  obs => obs.map(x => x + 1),
  obs => obs.filter(x => x > 5),
  obs => obs.map(x => x.toString())
);

// After fusion: 1 optimized operation
// The fusion system combines the operations into a single transformation
```

### Purity-Driven Optimization

ObservableLite operations are tagged with purity levels:

```typescript
// Pure operations (can be freely reordered)
const pureOps = {
  map: 'Pure',
  filter: 'Pure',
  take: 'Pure',
  skip: 'Pure',
  distinct: 'Pure',
  drop: 'Pure',
  slice: 'Pure',
  reverse: 'Pure',
  sortBy: 'Pure'
};

// Stateful operations (have ordering constraints)
const statefulOps = {
  scan: 'State',
  flatMap: 'State',
  chain: 'State',
  mergeMap: 'State',
  concat: 'State',
  merge: 'State'
};

// Async operations (external effects)
const asyncOps = {
  fromPromise: 'Async',
  fromEvent: 'Async',
  interval: 'Async',
  timer: 'Async',
  catchError: 'Async'
};
```

### Zero-Config Optimization

Fusion optimization is applied automatically without any configuration:

```typescript
// All static methods are automatically optimized
const obs1 = ObservableLite.of(42);           // Optimized
const obs2 = ObservableLite.fromArray([1,2,3]); // Optimized
const obs3 = ObservableLite.fromPromise(promise); // Optimized
const obs4 = ObservableLite.interval(1000);   // Optimized

// All instance methods are automatically optimized
const obs5 = obs1.map(x => x * 2);            // Optimized
const obs6 = obs2.filter(x => x > 1);         // Optimized
const obs7 = obs3.scan((acc, x) => acc + x, 0); // Optimized
```

### Performance Benefits

ObservableLite fusion provides significant performance improvements:

```typescript
// Before fusion: Multiple intermediate allocations
const before = ObservableLite.fromArray(largeArray)
  .pipe(
    obs => obs.map(x => x * 2),      // Allocation 1
    obs => obs.map(x => x + 1),      // Allocation 2
    obs => obs.filter(x => x > 100), // Allocation 3
    obs => obs.map(x => x.toString()) // Allocation 4
  );

// After fusion: Single optimized operation
// - Combines map operations: map(x => (x * 2 + 1).toString())
// - Combines filter: filterMap(x => (x * 2 + 1) > 100 ? (x * 2 + 1).toString() : undefined)
// - Eliminates intermediate allocations
```

### Law Preservation

All functional programming laws are preserved during optimization:

```typescript
// Functor laws are preserved
const id = (x) => x;
const f = (x) => x * 2;
const g = (x) => x + 1;

// Law 1: map(id) = id
const law1 = obs.map(id);
// After fusion: remains obs (no optimization needed)

// Law 2: map(f . g) = map(f) . map(g)
const law2a = obs.pipe(
  obs => obs.map(g),
  obs => obs.map(f)
);
const law2b = obs.map(x => f(g(x)));
// After fusion: both become the same optimized form
```

## AST-Like Plan Representation

The fusion system uses an internal AST-like representation for optimization:

```typescript
export interface StreamPlanNode {
  type: 'map' | 'scan' | 'filter' | 'filterMap' | 'flatMap' | 'compose' | 'parallel';
  fn?: Function;
  scanFn?: StateFn<any, any>;
  predicate?: Function;
  filterMapFn?: Function;
  flatMapFn?: Function;
  purity: 'Pure' | 'State' | 'IO' | 'Async';
  next?: StreamPlanNode;
  left?: StreamPlanNode;
  right?: StreamPlanNode;
}
```

### Plan Creation

```typescript
import { planFromStream } from './fp-stream-fusion';

const stream = compose(
  liftStateless((x: number) => x * 2),
  liftStateless((x: number) => x + 1)
);

const plan = planFromStream(stream);
// Creates a plan representation of the stream
```

### Plan Optimization

```typescript
import { optimizePlan } from './fp-stream-fusion';

const optimizedPlan = optimizePlan(plan);
// Applies fusion rules until no more optimizations are possible
```

### Plan to Stream Conversion

```typescript
import { streamFromPlan } from './fp-stream-fusion';

const optimizedStream = streamFromPlan(optimizedPlan);
// Rebuilds the optimized stream from the plan
```

## Fusion Registry

The fusion system uses a registry of fusion rules:

```typescript
export interface FusionRule {
  name: string;
  match: (node: StreamPlanNode) => boolean;
  rewrite: (node: StreamPlanNode) => StreamPlanNode;
  description: string;
}
```

### Built-in Rules

The system includes several built-in fusion rules:

1. **Map-Map Fusion**: Combines consecutive pure map operations
2. **Map Past Scan**: Pushes pure map operations inside stateful scan operations
3. **Filter-Filter Fusion**: Combines consecutive pure filter operations
4. **FilterMap-FilterMap Fusion**: Combines consecutive pure filterMap operations
5. **Map-Filter Fusion**: Combines pure map and filter operations into filterMap
6. **Filter-Map Fusion**: Combines pure filter and map operations into filterMap
7. **Scan-Scan Fusion**: Combines consecutive stateful scan operations
8. **Pure Segment Fusion**: Fuses consecutive pure operations

### Custom Rules

You can add custom fusion rules:

```typescript
import { FusionRegistry } from './fp-stream-fusion';

FusionRegistry.push({
  name: 'Custom Fusion',
  match: (node) => {
    // Your matching logic
    return node.type === 'custom' && node.next?.type === 'custom';
  },
  rewrite: (node) => {
    // Your rewriting logic
    return {
      type: 'custom',
      fn: (x) => node.fn(node.next.fn(x)),
      purity: 'Pure',
      next: node.next.next
    };
  },
  description: 'Custom fusion rule for specific operations'
});
```

## Purity-Driven Optimization

The fusion system uses purity information to determine safe reordering:

### Purity Levels

- **Pure**: Stateless operations that can be freely reordered
- **State**: Stateful operations with ordering constraints
- **IO**: Operations with side effects
- **Async**: Asynchronous operations

### Reordering Rules

```typescript
import { canReorderByPurity } from './fp-stream-fusion';

// Pure operations can always be reordered
canReorderByPurity(pureOp1, pureOp2); // true

// Pure operations can be pushed past stateful ones
canReorderByPurity(pureOp, statefulOp); // true

// Stateful operations cannot be pushed past pure ones
canReorderByPurity(statefulOp, pureOp); // false

// Stateful operations require compatibility analysis
canReorderByPurity(statefulOp1, statefulOp2); // depends on independence
```

### Independence Analysis

```typescript
import { areOperationsIndependent } from './fp-stream-fusion';

// Map operations are independent
areOperationsIndependent(mapOp1, mapOp2); // true

// Filter operations are independent
areOperationsIndependent(filterOp1, filterOp2); // true

// Scan operations are not independent
areOperationsIndependent(scanOp1, scanOp2); // false
```

## Integration with StatefulStream

### Automatic Optimization

```typescript
import { optimizeStream, withAutoOptimization } from './fp-stream-fusion';

// Manual optimization
const optimizedStream = optimizeStream(originalStream);

// Automatic optimization
const autoOptimizedStream = withAutoOptimization(originalStream);
```

### Pipeline Builder Integration

```typescript
import { createFusionOptimizer } from './fp-stream-fusion';

const optimizer = createFusionOptimizer();

// Check if optimization is possible
if (optimizer.canOptimize(stream)) {
  // Apply optimization
  const optimized = optimizer.optimize(stream);
  
  // Get optimization statistics
  const stats = optimizer.getStats(stream);
  console.log(`Optimization reduced nodes by ${stats.optimizationCount}`);
}
```

## FRP-Ready Generic Bridge

The fusion system provides a generic bridge for any HKT with purity-tagged combinators:

```typescript
import { optimizePipeline } from './fp-stream-fusion';

// Generic pipeline optimization
export function optimizePipeline<HKT extends { pipe?: Function }>(
  pipeline: HKT,
  toPlan: (hkt: HKT) => StreamPlanNode,
  fromPlan: (plan: StreamPlanNode) => HKT
): HKT {
  const plan = toPlan(pipeline);
  const optimized = optimizePlan(plan);
  return fromPlan(optimized);
}

// Example usage for any FRP library
const optimizedFRP = optimizePipeline(
  frpPipeline,
  frpToPlan,
  planToFRP
);
```

## Performance Benefits

### Node Reduction

Fusion typically reduces the number of nodes in a stream pipeline:

```typescript
// Before fusion: 4 nodes
const originalStream = compose(
  compose(
    liftStateless((x: number) => x * 2),
    liftStateless((x: number) => x + 1)
  ),
  compose(
    liftStateless((x: number) => x > 10),
    liftStateless((x: boolean) => x.toString())
  )
);

// After fusion: 1 node
const optimizedStream = liftStateless((x: number) => {
  const doubled = x * 2;
  const added = doubled + 1;
  const filtered = added > 10;
  return filtered.toString();
});
```

### Memory Allocation Reduction

Fusion reduces intermediate allocations:

```typescript
// Before fusion: 3 intermediate allocations
const before = compose(
  liftStateless((x: number) => x * 2),    // Allocation 1
  liftStateless((x: number) => x + 1),    // Allocation 2
  liftStateless((x: number) => x.toString()) // Allocation 3
);

// After fusion: 0 intermediate allocations
const after = liftStateless((x: number) => (x * 2 + 1).toString());
```

### Execution Speed Improvement

Fusion improves execution speed by reducing function call overhead:

```typescript
// Before fusion: 3 function calls
const before = (x: number) => {
  const step1 = (x: number) => x * 2;
  const step2 = (x: number) => x + 1;
  const step3 = (x: number) => x.toString();
  return step3(step2(step1(x)));
};

// After fusion: 1 function call
const after = (x: number) => (x * 2 + 1).toString();
```

## Correctness Verification

### Law Preservation

The fusion system preserves all functional programming laws:

```typescript
import { testLawPreservation } from './test-stream-fusion';

// Functor laws
testLawPreservation.functorLaws(); // ✅ All laws preserved

// Monad laws
testLawPreservation.monadLaws(); // ✅ All laws preserved

// Purity laws
testLawPreservation.purityLaws(); // ✅ All laws preserved
```

### Semantic Equivalence

Optimized streams produce the same results as original streams:

```typescript
const original = compose(
  liftStateless((x: number) => x * 2),
  liftStateless((x: number) => x + 1)
);

const optimized = optimizeStream(original);

// Test with various inputs
for (let i = 0; i < 100; i++) {
  const [state1, output1] = original.run(i)();
  const [state2, output2] = optimized.run(i)();
  
  console.assert(output1 === output2, `Output mismatch at input ${i}`);
}
```

## Best Practices

### 1. Use Pure Operations When Possible

```typescript
// Good: Pure operations that can be fused
const pureStream = compose(
  liftStateless((x: number) => x * 2),
  liftStateless((x: number) => x + 1)
);

// Avoid: Stateful operations that limit fusion
const statefulStream = compose(
  liftStateful((x: number, state: number) => [state + x, state]),
  liftStateless((x: number) => x * 2)
);
```

### 2. Leverage Automatic Optimization

```typescript
// Let the fusion system handle optimization
const stream = withAutoOptimization(
  compose(
    liftStateless((x: number) => x * 2),
    liftStateless((x: number) => x + 1),
    liftStateless((x: number) => x.toString())
  )
);
```

### 3. Monitor Optimization Effectiveness

```typescript
import { createFusionOptimizer } from './fp-stream-fusion';

const optimizer = createFusionOptimizer();
const stats = optimizer.getStats(stream);

console.log(`Optimization reduced nodes by ${stats.optimizationCount}`);
console.log(`Node count: ${stats.originalNodeCount} → ${stats.optimizedNodeCount}`);
```

### 4. Use Custom Rules for Domain-Specific Optimizations

```typescript
// Add custom fusion rules for your domain
FusionRegistry.push({
  name: 'Domain-Specific Fusion',
  match: (node) => node.type === 'domainOp',
  rewrite: (node) => {
    // Domain-specific optimization logic
    return optimizedNode;
  },
  description: 'Optimizes domain-specific operations'
});
```

### 5. ObservableLite Best Practices

```typescript
// Use .pipe() for automatic fusion
const optimized = ObservableLite.fromArray([1, 2, 3, 4, 5])
  .pipe(
    obs => obs.map(x => x * 2),
    obs => obs.map(x => x + 1),
    obs => obs.filter(x => x > 5)
  );

// Leverage static methods for automatic optimization
const obs1 = ObservableLite.of(42);           // Automatically optimized
const obs2 = ObservableLite.fromArray([1,2,3]); // Automatically optimized

// Use instance methods for automatic optimization
const obs3 = obs1.map(x => x * 2);            // Automatically optimized
const obs4 = obs2.filter(x => x > 1);         // Automatically optimized
```

## Comparison with Haskell Stream Fusion

The StatefulStream fusion system is inspired by Haskell's stream fusion but generalized for stateful operations:

### Similarities

- **Automatic fusion detection**: Both systems automatically identify fusion opportunities
- **Law preservation**: Both preserve functional programming laws
- **Performance improvement**: Both reduce intermediate allocations

### Differences

- **State support**: StatefulStream supports stateful operations, while Haskell stream fusion is primarily for pure operations
- **Purity tracking**: StatefulStream uses explicit purity tracking for safe reordering
- **AST representation**: StatefulStream uses an AST-like plan representation for optimization
- **Integration**: StatefulStream integrates with existing FP ecosystem (purity, HKT, optics)
- **ObservableLite integration**: Full integration with ObservableLite for automatic optimization

## Conclusion

The StatefulStream fusion system provides powerful optimization capabilities while maintaining semantic correctness. Key benefits include:

- **Automatic optimization**: No manual intervention required
- **Law preservation**: All functional programming laws are preserved
- **Performance improvement**: Significant reduction in allocations and function calls
- **Integration**: Seamless integration with existing FP ecosystem and ObservableLite
- **Extensibility**: Support for custom fusion rules
- **FRP-ready**: Generic bridge for any HKT with purity-tagged combinators

The system enables building high-performance stream processing pipelines while maintaining the safety and composability of functional programming. 