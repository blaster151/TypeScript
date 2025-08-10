# Multiplicity Fusion System

## Overview

The Multiplicity Fusion System integrates multiplicity inference into the FRP/stream fusion layer so we only perform optimizations when they preserve or lower usage bounds. This makes the FRP fusion optimizer **resource-aware** so transformations never increase the number of times upstream state or callbacks are used, ensuring correctness and predictable performance.

## Core Concepts

### Stream Metadata Hook

Streams are extended with usage bound metadata:

```typescript
interface Stream<In, Out, S, UB extends number | "∞"> {
  readonly usageBound: UB;
  run: (input: In) => StateFn<S, Out>;
}
```

The usage bound (UB) is inferred from multiplicity derivations and represents the maximum number of times the stream can be used.

### Fusion Safety Rule

The core fusion safety rule ensures **fusion never increases multiplicity**:

```typescript
function canFuse(f: Stream<any, any, any, any>, g: Stream<any, any, any, any>): boolean {
  return usageBoundNumeric(f.usageBound) * usageBoundNumeric(g.usageBound)
    <= usageBoundNumeric(g.usageBound);
}
```

This enforces that the fused bound doesn't exceed the original bound of the second stream.

## Fusion Safety Examples

### ✅ **Allowed Fusions**

#### 1. **map → filter** (Safe)
```typescript
// map(1) → filter(1) = 1 × 1 = 1 (safe)
const mapStream = createMapStream((x: number) => x * 2);     // UB = 1
const filterStream = createFilterStream((x: number) => x > 0); // UB = 1

const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
// result.fused = true
// result.fusedBound = 1
```

#### 2. **scan → map** (Safe)
```typescript
// scan(1) → map(1) = 1 × 1 = 1 (safe)
const scanStream = createScanStream(0, (acc, x) => acc + x, 1); // UB = 1
const mapStream = createMapStream((x: number) => x.toString());  // UB = 1

const result = optimizer.fuse(scanStream, mapStream, 'scan', 'map');
// result.fused = true
// result.fusedBound = 1
```

#### 3. **take(5) → flatMap(3)** (Conditionally Safe)
```typescript
// take(5) → flatMap(3) = 5 × 3 = 15 (safe because 5 ≥ 3)
const takeStream = createTakeStream(5);     // UB = 5
const flatMapStream = createFlatMapStream(  // UB = 3
  (x: number) => createMapStream(y => y * 2), 3
);

const result = optimizer.fuse(takeStream, flatMapStream, 'take', 'flatMap');
// result.fused = true
// result.fusedBound = 15
```

### ❌ **Disallowed Fusions**

#### 1. **flatMap → map** (Unsafe)
```typescript
// flatMap(∞) → map(1) would increase bound from 1 to ∞
const flatMapStream = createFlatMapStream(  // UB = "∞"
  (x: number) => createMapStream(y => y * 2), "∞"
);
const mapStream = createMapStream((x: number) => x.toString()); // UB = 1

const result = optimizer.fuse(flatMapStream, mapStream, 'flatMap', 'map');
// result.fused = false
// result.reason = "Would increase bound from 1 to ∞"
```

#### 2. **take(2) → flatMap(5)** (Unsafe)
```typescript
// take(2) → flatMap(5) = 2 × 5 = 10 (unsafe because 2 < 5)
const takeStream = createTakeStream(2);     // UB = 2
const flatMapStream = createFlatMapStream(  // UB = 5
  (x: number) => createMapStream(y => y * 2), 5
);

const result = optimizer.fuse(takeStream, flatMapStream, 'take', 'flatMap');
// result.fused = false
// result.reason = "Would increase bound from 2 to 10"
```

## Special-Case Rules

### 1. **Stateless Operators**
Stateless operators like `map` and `filter` always have `UB = 1`:

```typescript
const mapStream = createMapStream((x: number) => x * 2);
const filterStream = createFilterStream((x: number) => x > 0);

console.log(mapStream.usageBound);   // 1
console.log(filterStream.usageBound); // 1
```

### 2. **Bounded Operators**
Bounded operators like `take(n)` override the bound to `min(n, originalBound)`:

```typescript
const takeStream = createTakeStream(5);
console.log(takeStream.usageBound); // 5

// take(5) → map(1) preserves the take bound
const mapStream = createMapStream((x: number) => x.toString());
const result = optimizer.fuse(takeStream, mapStream, 'take', 'map');
// result.stream.usageBound = 5
```

### 3. **Unbounded Sources**
Unbounded sources always have `UB = "∞"`:

```typescript
const flatMapStream = createFlatMapStream(
  (x: number) => createMapStream(y => y * 2), "∞"
);
console.log(flatMapStream.usageBound); // "∞"
```

## Fusion Pass Integration

### Stream Fusion Optimizer

The `StreamFusionOptimizer` class handles fusion decisions:

```typescript
const optimizer = new StreamFusionOptimizer(true); // Enable debug

// Attempt fusion
const result = optimizer.fuse(
  mapStream, filterStream,
  'map', 'filter'
);

if (result.fused) {
  console.log('Fusion successful:', result.fusedBound);
} else {
  console.log('Fusion skipped:', result.reason);
}
```

### Chain Optimization

The optimizer can optimize entire chains of streams:

```typescript
const streams = [
  { stream: createMapStream(x => x * 2), operator: 'map' },
  { stream: createFilterStream(x => x > 0), operator: 'filter' },
  { stream: createMapStream(x => x.toString()), operator: 'map' }
];

const optimized = optimizer.optimizeChain(streams);
console.log(optimized.usageBound); // 1 (all operations fused)
```

## Debug Diagnostics

### Fusion Debug Logging

When debug logging is enabled, the system provides detailed information:

```typescript
enableFusionDebug();

// Fusion attempts are logged
const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
// Logs: [Fusion] map → filter fused, bound: 1 × 1 = 1

const unsafeResult = optimizer.fuse(flatMapStream, mapStream, 'flatMap', 'map');
// Logs: [Fusion] flatMap → map skipped: would increase bound from 1 to ∞
```

### Fusion Statistics

Track fusion performance and effectiveness:

```typescript
logFusionStats({
  totalAttempts: 100,
  successfulFusions: 75,
  skippedFusions: 25,
  averageBoundReduction: 0.3
});
```

## Why Multiplicity Matters for Fusion Safety

### 1. **Resource Conservation**
Fusion should never increase resource usage. If a stream has a finite usage bound, fusing it with an infinite stream would violate this principle.

### 2. **Predictable Performance**
By ensuring fusion doesn't increase multiplicity, we maintain predictable performance characteristics. A stream that should only be used once won't suddenly become reusable.

### 3. **Semantic Preservation**
Fusion should preserve the semantics of the original stream operations. Increasing usage bounds could change the meaning of the computation.

### 4. **Memory Safety**
Some streams may have memory implications based on their usage patterns. Fusion should respect these constraints.

## Examples of Safe vs Unsafe Fusions

### Safe Fusion Patterns

#### **Linear Transformations**
```typescript
// All safe: 1 × 1 = 1
map → filter
filter → map
scan → map
map → scan
```

#### **Bounded Operations**
```typescript
// Safe when bounded operator is the limiting factor
take(5) → map(1)     // 5 × 1 = 5 (safe)
take(3) → filter(1)  // 3 × 1 = 3 (safe)
take(10) → flatMap(2) // 10 × 2 = 20 (safe)
```

#### **Stateless Chains**
```typescript
// Long chains of stateless operations are always safe
map → filter → map → filter → map
// All fuse to: bound = 1
```

### Unsafe Fusion Patterns

#### **Infinite Sources**
```typescript
// Never safe: would increase bound to ∞
flatMap(∞) → map(1)
merge(∞) → filter(1)
zip(∞) → map(1)
```

#### **Bounded with Larger Operations**
```typescript
// Unsafe when bounded operator is smaller
take(2) → flatMap(5)  // 2 × 5 = 10 (unsafe)
take(1) → scan(3)     // 1 × 3 = 3 (unsafe)
```

#### **Complex Operators**
```typescript
// Complex operators often have infinite bounds
switch(∞) → map(1)
combineLatest(∞) → filter(1)
concat(∞) → map(1)
```

## Semantics-Preserving Optimizer

The multiplicity-aware fusion system makes the optimizer **semantics-preserving** without relying on hard-coded operator knowledge:

### **Automatic Safety**
- No need to manually specify which operators can fuse
- Safety is determined by usage bounds, not operator types
- New operators automatically get correct fusion behavior

### **Composable Rules**
- Fusion rules compose naturally
- Complex chains are optimized automatically
- Safety is preserved across arbitrary combinations

### **Predictable Behavior**
- Fusion decisions are deterministic
- Performance characteristics are preserved
- Resource usage is bounded and predictable

## Performance Benefits

### **Efficient Fusion**
- Safe fusions reduce intermediate allocations
- Eliminate unnecessary stream boundaries
- Improve memory locality

### **Bounded Resource Usage**
- Finite usage bounds enable aggressive optimization
- Predictable memory consumption
- No unbounded resource growth

### **Composable Performance**
- Performance benefits compose across chains
- No performance cliffs from unsafe fusions
- Consistent optimization behavior

## Implementation Details

### **Usage Bound Calculation**
```typescript
function calculateFusedBound(f: Stream<any, any, any, any>, g: Stream<any, any, any, any>): Multiplicity {
  const fBound = f.usageBound;
  const gBound = g.usageBound;
  
  if (isInfiniteBound(fBound) || isInfiniteBound(gBound)) {
    return "∞";
  }
  
  return fBound * gBound;
}
```

### **Fusion Safety Check**
```typescript
function canFuse(f: Stream<any, any, any, any>, g: Stream<any, any, any, any>): boolean {
  const fBound = usageBoundNumeric(f.usageBound);
  const gBound = usageBoundNumeric(g.usageBound);
  const fusedBound = fBound * gBound;
  
  return fusedBound <= gBound;
}
```

### **Stream Factory Functions**
```typescript
// Stateless operators
createMapStream(f)      // UB = 1
createFilterStream(p)   // UB = 1

// Bounded operators
createTakeStream(n)     // UB = n

// Stateful operators
createScanStream(init, f, bound) // UB = bound
createFlatMapStream(f, bound)    // UB = bound
```

## Conclusion

The Multiplicity Fusion System provides a **resource-aware** approach to stream fusion that:

- **Preserves semantics** by respecting usage bounds
- **Ensures correctness** by preventing unsafe optimizations
- **Improves performance** through safe fusion opportunities
- **Maintains predictability** with bounded resource usage
- **Enables composition** through automatic safety analysis

By integrating multiplicity inference into the fusion layer, the system makes the FRP optimizer **semantics-preserving** without relying on hard-coded operator knowledge, ensuring that transformations never increase the number of times upstream state or callbacks are used. 