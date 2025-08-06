# Effect-Aware Fusion System

## Overview

The Effect-Aware Fusion System extends the multiplicity-aware stream optimizer to also respect effect constraints when deciding whether to fuse two stream stages. This ensures FRP/stream optimizations **preserve both semantic purity and resource usage guarantees**, enabling aggressive optimizations for pure code while avoiding correctness hazards for effectful code.

## Core Concepts

### Effect Tagging

Streams are extended with effect tags that categorize their side-effect behavior:

```typescript
type EffectTag = "Pure" | "DeterministicEffect" | "NonDeterministicEffect" | "ExternalEffect";

interface Stream<In, Out, S, UB extends Multiplicity> {
  readonly usageBound: UB;
  readonly effectTag: EffectTag;
  run: (input: In) => StateFn<S, Out>;
}
```

### Effect Categories

#### 1. **Pure**
- **Definition**: No observable side-effects
- **Fusion Behavior**: Safe to reorder/fuse freely
- **Examples**: `map`, `filter`, `take`, stateless transformations
- **Characteristics**: Idempotent, referentially transparent

#### 2. **DeterministicEffect**
- **Definition**: Idempotent & deterministic side-effects
- **Fusion Behavior**: Safe to fuse with Pure but must preserve order
- **Examples**: `scan`, `reduce`, metrics counters, stateful accumulators
- **Characteristics**: Predictable, order-dependent but deterministic

#### 3. **NonDeterministicEffect**
- **Definition**: Observable timing/order differences possible
- **Fusion Behavior**: Fusion can change semantics, requires explicit opt-in
- **Examples**: `flatMap`, `merge`, `zip`, complex stream combinators
- **Characteristics**: Order-sensitive, may have timing dependencies

#### 4. **ExternalEffect**
- **Definition**: Affects outside world
- **Fusion Behavior**: Fusion may break guarantees, generally unsafe
- **Examples**: `log`, file I/O, network calls, UI updates
- **Characteristics**: Observable side-effects, order-critical

## Fusion Safety Rules

### Combined Safety Check

Fusion is allowed **only if** both multiplicity and effect safety are satisfied:

```typescript
function canFuse(f: Stream<any, any, any, any>, g: Stream<any, any, any, any>): boolean {
  return isEffectFusionSafe(f.effectTag, g.effectTag) &&
         isMultiplicitySafe(f.usageBound, g.usageBound);
}
```

### Effect Fusion Safety Rules

#### ✅ **Allowed Combinations**

1. **Pure + Pure** → Always safe
   ```typescript
   map → filter  // Pure + Pure = Pure
   ```

2. **Pure + DeterministicEffect** → Safe, preserve order
   ```typescript
   map → scan    // Pure + DeterministicEffect = DeterministicEffect
   ```

3. **DeterministicEffect + Pure** → Safe, preserve order
   ```typescript
   scan → map    // DeterministicEffect + Pure = DeterministicEffect
   ```

4. **DeterministicEffect + DeterministicEffect** → Safe, preserve order
   ```typescript
   scan → reduce // DeterministicEffect + DeterministicEffect = DeterministicEffect
   ```

#### ❌ **Disallowed Combinations**

1. **Any + NonDeterministicEffect** → Unsafe unless explicitly opted-in
   ```typescript
   map → flatMap  // Pure + NonDeterministicEffect = blocked
   ```

2. **Any + ExternalEffect** → Always unsafe
   ```typescript
   map → log      // Pure + ExternalEffect = blocked
   scan → log     // DeterministicEffect + ExternalEffect = blocked
   ```

## Fusion Examples

### ✅ **Safe Fusion Examples**

#### **Pure + Pure Fusion**
```typescript
const mapStream = createMapStream((x: number) => x * 2);     // Pure
const filterStream = createFilterStream((x: number) => x > 0); // Pure

const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
// result.fused = true
// result.fusedEffectTag = "Pure"
// result.fusedBound = 1
```

#### **Pure + DeterministicEffect Fusion**
```typescript
const mapStream = createMapStream((x: number) => x * 2);     // Pure
const scanStream = createScanStream(0, (acc, x) => acc + x, 1); // DeterministicEffect

const result = optimizer.fuse(mapStream, scanStream, 'map', 'scan');
// result.fused = true
// result.fusedEffectTag = "DeterministicEffect"
// result.fusedBound = 1
```

#### **DeterministicEffect + Pure Fusion**
```typescript
const scanStream = createScanStream(0, (acc, x) => acc + x, 1); // DeterministicEffect
const mapStream = createMapStream((x: number) => x.toString());  // Pure

const result = optimizer.fuse(scanStream, mapStream, 'scan', 'map');
// result.fused = true
// result.fusedEffectTag = "DeterministicEffect"
// result.fusedBound = 1
```

### ❌ **Unsafe Fusion Examples**

#### **Pure + ExternalEffect (Blocked)**
```typescript
const mapStream = createMapStream((x: number) => x * 2);     // Pure
const logStream = createLogStream((x: number) => console.log(x)); // ExternalEffect

const result = optimizer.fuse(mapStream, logStream, 'map', 'log');
// result.fused = false
// result.reason = "Would violate effect safety (Pure + ExternalEffect)"
// result.effectViolation = true
```

#### **Pure + NonDeterministicEffect (Blocked)**
```typescript
const mapStream = createMapStream((x: number) => x * 2);     // Pure
const flatMapStream = createFlatMapStream(                   // NonDeterministicEffect
  (x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect"
);

const result = optimizer.fuse(mapStream, flatMapStream, 'map', 'flatMap');
// result.fused = false
// result.reason = "Would violate effect safety (Pure + NonDeterministicEffect)"
// result.effectViolation = true
```

#### **Multiplicity + Effect Violation (Blocked)**
```typescript
const flatMapStream = createFlatMapStream(                   // NonDeterministicEffect, ∞
  (x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect"
);
const logStream = createLogStream((x: number) => console.log(x)); // ExternalEffect, 1

const result = optimizer.fuse(flatMapStream, logStream, 'flatMap', 'log');
// result.fused = false
// result.reason = "Would increase bound from 1 to ∞ and violate effect safety"
// result.multiplicityViolation = true
// result.effectViolation = true
```

## Special-Case Rules

### **Operator Effect Classifications**

#### **Pure Operators**
```typescript
createMapStream(f)      // Pure
createFilterStream(p)   // Pure
createTakeStream(n)     // Pure
```

#### **DeterministicEffect Operators**
```typescript
createScanStream(init, f, bound)  // DeterministicEffect
createMetricsStream(counter)      // DeterministicEffect
```

#### **NonDeterministicEffect Operators**
```typescript
createFlatMapStream(f, bound, "NonDeterministicEffect") // NonDeterministicEffect
```

#### **ExternalEffect Operators**
```typescript
createLogStream(logger) // ExternalEffect
```

### **Effect Tag Propagation**

When fusion occurs, the resulting effect tag is the maximum of the two input tags:

```typescript
function calculateFusedEffectTag(f: Stream<any, any, any, any>, g: Stream<any, any, any, any>): EffectTag {
  return maxEffectTag(f.effectTag, g.effectTag);
}

// Effect safety levels: Pure < DeterministicEffect < NonDeterministicEffect < ExternalEffect
```

## Fusion Pass Integration

### **Effect-Aware Fusion Optimizer**

The `EffectAwareStreamFusionOptimizer` handles both multiplicity and effect safety:

```typescript
const optimizer = new EffectAwareStreamFusionOptimizer(true); // Enable debug

const result = optimizer.fuse(
  mapStream, scanStream,
  'map', 'scan'
);

if (result.fused) {
  console.log('Fusion successful:', result.fusedEffectTag);
} else {
  console.log('Fusion blocked:', result.reason);
  console.log('Multiplicity violation:', result.multiplicityViolation);
  console.log('Effect violation:', result.effectViolation);
}
```

### **Chain Optimization**

The optimizer respects effect boundaries when optimizing chains:

```typescript
const streams = [
  { stream: createMapStream(x => x * 2), operator: 'map' },
  { stream: createLogStream(x => console.log(x)), operator: 'log' },
  { stream: createMapStream(x => x.toString()), operator: 'map' }
];

const optimized = optimizer.optimizeChain(streams);
// The log prevents fusion with subsequent operations
// optimized.effectTag = "ExternalEffect"
```

## Debug Diagnostics

### **Effect-Aware Debug Logging**

When debug logging is enabled, the system provides detailed effect information:

```typescript
enableEffectAwareFusionDebug();

// Fusion attempts are logged with effect information
const result = optimizer.fuse(mapStream, scanStream, 'map', 'scan');
// Logs: [Fusion] map → scan fused: Pure + DeterministicEffect safe, bound: 1 × 1 = 1

const blockedResult = optimizer.fuse(mapStream, logStream, 'map', 'log');
// Logs: [Fusion] map → log skipped: would violate effect safety (Pure + ExternalEffect)
```

### **Fusion Statistics**

Track both multiplicity and effect violations:

```typescript
logEffectAwareFusionStats({
  totalAttempts: 100,
  successfulFusions: 75,
  skippedFusions: 25,
  multiplicityViolations: 10,
  effectViolations: 15,
  averageBoundReduction: 0.3
});
```

## Effect Tag Interaction with Multiplicity Constraints

### **Combined Safety Analysis**

The system performs a two-stage safety check:

1. **Multiplicity Safety**: Ensures fusion doesn't increase usage bounds
2. **Effect Safety**: Ensures fusion doesn't violate semantic guarantees

```typescript
function canFuse(f: Stream<any, any, any, any>, g: Stream<any, any, any, any>): boolean {
  // Check multiplicity safety
  const multiplicitySafe = !wouldIncreaseMultiplicity(f, g);
  
  // Check effect safety
  const effectSafe = isEffectFusionSafe(f.effectTag, g.effectTag);
  
  return multiplicitySafe && effectSafe;
}
```

### **Violation Detection**

The system can distinguish between different types of violations:

```typescript
const result = optimizer.fuse(stream1, stream2, 'op1', 'op2');

if (!result.fused) {
  if (result.multiplicityViolation) {
    console.log('Fusion blocked: multiplicity violation');
  }
  if (result.effectViolation) {
    console.log('Fusion blocked: effect violation');
  }
}
```

## Unsafe Fusion Opt-in

### **Explicit Unsafe Fusion**

For testing or advanced use cases, unsafe fusion can be explicitly enabled:

```typescript
const unsafeOptimizer = new EffectAwareStreamFusionOptimizer(true, true);

const result = unsafeOptimizer.unsafeFuse(
  mapStream, logStream,
  'map', 'log'
);
// result.fused = true (forced)
// result.reason = "Unsafe fusion forced"
```

### **Safety Guarantees**

- **Default behavior**: Unsafe fusion is disabled by default
- **Explicit opt-in**: Must explicitly enable unsafe fusion
- **Clear warnings**: Debug logs clearly indicate unsafe operations
- **Type safety**: Type-level constraints prevent accidental unsafe fusion

## Performance Benefits

### **Aggressive Optimization for Pure Code**

Pure operations can be aggressively optimized:

```typescript
// Long chains of pure operations fuse completely
map → filter → map → filter → map → take
// All fuse to: bound = 1, effect = Pure
```

### **Selective Optimization for Effectful Code**

Effectful operations are optimized only when safe:

```typescript
// Safe effectful operations fuse when possible
map → scan → map → metrics
// Fuses to: bound = 1, effect = DeterministicEffect
```

### **Preserved Correctness**

Effect boundaries prevent incorrect optimizations:

```typescript
// Effect boundaries prevent unsafe fusion
map → log → map → filter
// Result: map → log (fused), then separate map → filter
// Preserves logging semantics
```

## Implementation Details

### **Effect Safety Levels**

```typescript
const EFFECT_SAFETY_LEVELS: Record<EffectTag, number> = {
  Pure: 0,
  DeterministicEffect: 1,
  NonDeterministicEffect: 2,
  ExternalEffect: 3
};
```

### **Effect Fusion Safety Check**

```typescript
function isEffectFusionSafe(fEffect: EffectTag, gEffect: EffectTag): boolean {
  // Pure + Pure → ✅ Always
  if (fEffect === "Pure" && gEffect === "Pure") return true;
  
  // Pure + DeterministicEffect → ✅ Preserve order
  if (fEffect === "Pure" && gEffect === "DeterministicEffect") return true;
  
  // DeterministicEffect + Pure → ✅ Preserve order
  if (fEffect === "DeterministicEffect" && gEffect === "Pure") return true;
  
  // DeterministicEffect + DeterministicEffect → ✅ Preserve order
  if (fEffect === "DeterministicEffect" && gEffect === "DeterministicEffect") return true;
  
  // Any + NonDeterministicEffect → ❌ unless explicitly opted-in
  if (gEffect === "NonDeterministicEffect") return false;
  
  // Any + ExternalEffect → ❌
  if (gEffect === "ExternalEffect") return false;
  
  return false;
}
```

### **Order Preservation**

Effectful operations require order preservation:

```typescript
function requiresOrderPreservation(fEffect: EffectTag, gEffect: EffectTag): boolean {
  // Pure + Pure doesn't require order preservation
  if (fEffect === "Pure" && gEffect === "Pure") return false;
  
  // Any other combination requires order preservation
  return true;
}
```

## Conclusion

The Effect-Aware Fusion System provides a **semantics-preserving** approach to stream fusion that:

- **Preserves semantic correctness** by respecting effect boundaries
- **Enables aggressive optimization** for pure code
- **Prevents correctness hazards** for effectful code
- **Maintains resource guarantees** through multiplicity constraints
- **Provides clear diagnostics** for fusion decisions

By integrating effect awareness into the fusion layer, the system ensures that FRP/stream optimizations preserve both **semantic purity and resource usage guarantees**, enabling aggressive optimizations for pure code while avoiding correctness hazards for effectful code. 