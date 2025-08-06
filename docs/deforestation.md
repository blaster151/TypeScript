# Lazy Deforestation and Whole-Section Fusion

## Overview

The Lazy Deforestation System enhances the stream optimizer to perform **lazy deforestation** and **whole-section fusion**, turning multi-node pure stream segments into single evaluators to reduce allocation, indirection, and runtime overhead. This transforms pure multi-node stream segments into a **single lazy evaluator** at compile-time or runtime, eliminating intermediate allocations and indirections while guaranteeing effect & multiplicity correctness.

## Core Concepts

### Segment Detection

The system scans the stream graph for **maximal contiguous pure segments** with the following boundaries:

- **Effectful operations**: I/O, logging, mutation
- **Stateful operations**: scan, fold, unmergeable state
- **Multiplicity > 1 boundaries**: fan-out operations
- **Feedback edges**: cyclic dependencies

### Segment Representation

Pure segments are represented as:

```typescript
interface PureSegment<I, O> {
  nodes: StreamNode[];
  compose: (input: I) => O; // fused pipeline
  inputType: I;
  outputType: O;
  multiplicity: Multiplicity;
  isLazy: boolean;
  metadata: {
    originalNodeIds: string[];
    segmentLength: number;
    fusionType: 'compile-time' | 'runtime';
    compositionHash: string;
  };
}
```

The `compose` function is lazily constructed from the segment's node functions.

## Lazy Evaluation Strategy

### Deferred Composition

Segment composition is deferred until:

1. **Graph compilation stage** (just-in-time optimizer)
2. **First evaluation** (runtime specialization)

The composition is **purely referentially transparent** and can be safely cached.

### Evaluation Modes

#### **Lazy Evaluation**
```typescript
// Functions are composed on-demand during evaluation
const compose = (input: any) => {
  let result = input;
  for (const node of nodes) {
    const nodeFn = extractNodeFunction(node);
    result = nodeFn(result);
  }
  return result;
};
```

#### **Eager Evaluation**
```typescript
// Functions are pre-composed for performance
const functions = nodes.map(extractNodeFunction);
const compose = (input: any) => {
  let result = input;
  for (const fn of functions) {
    result = fn(result);
  }
  return result;
};
```

## Fusion Process

### Step-by-Step Process

For each detected pure segment:

1. **Build composition function**: `(x) => fN(...f2(f1(x)))`
2. **Replace segment nodes** with a **SingleNode** holding this composition
3. **Retain original metadata** for debugging/profiling
4. **Preserve TypeScript type inference** for composed segment

### Example: Before Deforestation

```
Original Graph:
A (map) → B (filter) → C (map) → D (log) → E (map) → F (map)

Node Details:
- A: map(x => x * 2)
- B: filter(x => x > 0)  
- C: map(x => x.toString())
- D: log(x => console.log(x))
- E: map(x => x.toUpperCase())
- F: map(x => x.length)
```

### Example: After Deforestation

```
Optimized Graph:
ABC (fused) → D (log) → EF (fused)

Fused Segments:
- ABC: compose(x) => x.toString().length
- EF: compose(x) => x.toUpperCase().length
```

## Deforestation Opportunities

### Allocation Elimination

Remove intermediate collections/iterables between nodes:

```typescript
// Before deforestation
map ∘ filter ∘ map → three separate operations with intermediate arrays

// After deforestation  
map ∘ filter ∘ map → one function, no intermediate arrays
```

### Call Overhead Reduction

Inline trivial functions to reduce call overhead:

```typescript
// Before deforestation
const result = map1(map2(map3(input)));

// After deforestation
const result = fusedComposition(input);
```

### Memory Optimization

Avoid unnecessary allocations:

```typescript
// Before deforestation
const intermediate = Array.from(source);
const filtered = intermediate.filter(predicate);
const mapped = filtered.map(transform);

// After deforestation
const result = source.filter(predicate).map(transform);
// No intermediate array allocation
```

## State & Effect Safety

### Pure Segment Requirements

Pure segments can be collapsed only if:

1. **All nodes are pure** (no state read/write)
2. **Multiplicity ≤ 1** (no duplicated evaluation)
3. **No side-effect dependencies** on timing or ordering

### Safety Boundaries

#### **Effectful Operations**
```typescript
// Cannot fuse across effectful boundaries
map → log → map → filter
// Result: map (fused) → log → map->filter (fused)
```

#### **Stateful Operations**
```typescript
// Cannot fuse across stateful boundaries
map → scan → map → filter
// Result: map (fused) → scan → map->filter (fused)
```

#### **Multiplicity Escalation**
```typescript
// Cannot fuse across multiplicity boundaries
map → flatMap → map → filter
// Result: map (fused) → flatMap → map->filter (fused)
```

## Integration with Rewrite Rules

### Algebraic Rewrite Application

Apply Prompt 32's algebraic rewrites **before** deforestation to maximize segment length:

```typescript
function applyDeforestationWithRewrites<S>(
  graph: StreamGraph<S>,
  config: SegmentDetectionConfig = defaultSegmentConfig()
): DeforestationResult<S> {
  // Step 1: Apply algebraic rewrites to maximize segment length
  const rewrittenGraph = applyAlgebraicRewrites(graph);
  
  // Step 2: Perform deforestation
  const optimizer = new LazyDeforestationOptimizer(config, true);
  const result = optimizer.deforest(rewrittenGraph);
  
  // Step 3: Mark fused nodes as non-splittable for subsequent passes
  markFusedNodesAsNonSplittable(result.optimizedGraph);
  
  return result;
}
```

### Non-Splittable Marking

After segment fusion, mark the fused node as **non-splittable** for subsequent passes:

```typescript
function markFusedNodesAsNonSplittable<S>(graph: StreamGraph<S>): void {
  for (const [id, node] of graph.nodes) {
    if (node.operator === 'fused') {
      // Mark as non-splittable for subsequent optimization passes
      (node as any).nonSplittable = true;
    }
  }
}
```

## Configuration Options

### Default Configuration
```typescript
export function defaultSegmentConfig(): SegmentDetectionConfig {
  return {
    enableLazyEvaluation: true,
    enableCompileTimeFusion: true,
    enableRuntimeSpecialization: false,
    maxSegmentLength: 10,
    minSegmentLength: 2,
    allowFeedbackSegments: false,
    preserveDebugInfo: true
  };
}
```

### Performance Configuration
```typescript
export function performanceConfig(): SegmentDetectionConfig {
  return {
    enableLazyEvaluation: false, // Eager composition for performance
    enableCompileTimeFusion: true,
    enableRuntimeSpecialization: false,
    maxSegmentLength: 20,
    minSegmentLength: 3,
    allowFeedbackSegments: false,
    preserveDebugInfo: false
  };
}
```

### Safety Configuration
```typescript
export function safetyConfig(): SegmentDetectionConfig {
  return {
    enableLazyEvaluation: true,
    enableCompileTimeFusion: false,
    enableRuntimeSpecialization: true,
    maxSegmentLength: 5,
    minSegmentLength: 2,
    allowFeedbackSegments: false,
    preserveDebugInfo: true
  };
}
```

## When Fusion is NOT Applied

### Safety Constraints

#### **Effect Violations**
```typescript
// External effects prevent fusion
map → log → map → filter
// Cannot fuse: log has external effects
```

#### **State Violations**
```typescript
// Stateful operations prevent fusion
map → scan → map → filter
// Cannot fuse: scan maintains state
```

#### **Multiplicity Violations**
```typescript
// Multiplicity escalation prevents fusion
map → flatMap → map → filter
// Cannot fuse: flatMap has multiplicity > 1
```

#### **Feedback Violations**
```typescript
// Feedback cycles require special handling
map → filter → [feedback to map]
// Cannot fuse: feedback creates cycles
```

### Performance Considerations

#### **Segment Length Limits**
```typescript
// Very long segments may be split for performance
const config = { maxSegmentLength: 5 };
// Segments longer than 5 nodes will be split
```

#### **Memory Constraints**
```typescript
// Large intermediate results may prevent fusion
map → filter → map → filter → map
// May be split if intermediate results are large
```

## Deforestation Optimizer

### Usage

```typescript
const optimizer = new LazyDeforestationOptimizer(defaultSegmentConfig(), true);

const result = optimizer.deforest(graph);

console.log('Fusion statistics:', result.fusionStats);
console.log('Pure segments:', result.pureSegments);
console.log('Safety violations:', result.safetyViolations);
```

### Fusion Statistics

```typescript
interface FusionStats {
  totalSegments: number;
  fusedSegments: number;
  skippedSegments: number;
  totalNodesFused: number;
  averageSegmentLength: number;
  allocationReduction: number; // estimated
  indirectionReduction: number; // estimated
}
```

### Safety Violations

```typescript
interface SafetyViolations {
  effectViolations: number;
  multiplicityViolations: number;
  stateViolations: number;
  feedbackViolations: number;
}
```

## Debug and Diagnostics

### Debug Output Generation

```typescript
const debugOutput = generateDeforestationDebug(result);
console.log(debugOutput);
```

**Example Output**:
```
# Lazy Deforestation Debug Output

## Fusion Statistics
- Total segments: 3
- Fused segments: 2
- Skipped segments: 1
- Total nodes fused: 6
- Average segment length: 2.0
- Allocation reduction: 8
- Indirection reduction: 12

## Safety Violations
- Effect violations: 1
- Multiplicity violations: 0
- State violations: 0
- Feedback violations: 0

## Pure Segments
### Segment 1
- Nodes: a -> b -> c
- Length: 3
- Multiplicity: 1
- Is lazy: true
- Fusion type: compile-time
- Composition hash: abc123
```

### Debug Logging

```typescript
enableDeforestationDebug();

// Deforestation attempts are logged
// [Deforestation] Fused 3 nodes into fused_abc123
// [Deforestation] Skipping segment: effect violation

disableDeforestationDebug();
```

## Performance Benefits

### Allocation Reduction

```typescript
// Before deforestation
const result = source
  .map(x => x * 2)      // Allocates intermediate array
  .filter(x => x > 0)   // Allocates intermediate array
  .map(x => x.toString()); // Allocates intermediate array

// After deforestation
const result = source
  .pipe(fusedComposition); // Single allocation
```

### Indirection Reduction

```typescript
// Before deforestation
const result = map1(map2(map3(input)));
// 3 function calls with indirection

// After deforestation
const result = fusedComposition(input);
// 1 function call, no indirection
```

### Runtime Overhead Reduction

```typescript
// Before deforestation
// Multiple stream objects, each with overhead
const stream1 = new Stream(map1);
const stream2 = new Stream(map2);
const stream3 = new Stream(map3);

// After deforestation
// Single fused evaluator
const fusedEvaluator = createFusedEvaluator([map1, map2, map3]);
```

## Real-World Examples

### Data Processing Pipeline

```typescript
// Original pipeline
const pipeline = source
  .map(x => x * 2)
  .filter(x => x > 0)
  .map(x => x.toString())
  .log(x => console.log(x))
  .map(x => x.toUpperCase())
  .map(x => x.length);

// After deforestation
const pipeline = source
  .pipe(fusedSegment1)  // map->filter->map fused
  .log(x => console.log(x))
  .pipe(fusedSegment2); // map->map fused
```

### Stream Transformation

```typescript
// Original transformation
const transform = stream
  .map(x => x * 2)
  .filter(x => x > 0)
  .map(x => x.toString())
  .map(x => x.toUpperCase())
  .map(x => x.length);

// After deforestation
const transform = stream.pipe(fusedComposition);
// All 5 operations fused into single evaluator
```

## Conclusion

The Lazy Deforestation System provides **significant performance improvements** by:

- **Eliminating intermediate allocations** between pure operations
- **Reducing function call overhead** through fusion
- **Minimizing indirection** in stream processing
- **Preserving semantic correctness** through safety constraints
- **Enabling aggressive optimization** for pure code paths

By transforming multi-node pure stream segments into single evaluators, the system achieves **optimal performance** while maintaining **type safety** and **effect correctness**. 