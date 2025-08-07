# Stream Boundary Type System

## Overview

The Stream Boundary Type System provides comprehensive type-level and runtime support for distinguishing between three categories of stream operations:

1. **Fully Fusable** - Can be completely optimized at compile-time
2. **Staged** - Requires runtime staging/thunking due to dynamic behavior
3. **Opaque Effects** - No optimization possible due to external effects

This system enables dev tooling (like Cursor) to provide intelligent warnings, highlighting, and optimization suggestions.

## Core Concepts

### Boundary Categories

#### 1. **Fully Fusable** (`'FullyFusable'`)

**Characteristics:**
- Pure, stateless operations
- Known multiplicity bounds
- No external dependencies
- Compile-time optimizable

**Examples:**
```typescript
// Pure transformations
const doubleStream = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);

// Stateless filters
const positiveStream = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x > 0 ? x : undefined]);

// Known bounded operations
const takeStream = createFusableStream(5, 'Pure', (x: number) => () => [undefined, x]);
```

#### 2. **Staged** (`'Staged'`)

**Characteristics:**
- Dynamic multiplicity (runtime-determined)
- Conditional behavior
- Stateful but deterministic
- Runtime optimization possible

**Examples:**
```typescript
// Dynamic multiplicity
const dynamicTakeStream = createStagedStream(
  "∞", // Unknown at compile-time
  'DeterministicEffect',
  (x: number) => (state: { count: number }) => {
    const newCount = state.count + 1;
    return [{ count: newCount }, newCount <= x ? x : undefined];
  }
);

// Conditional behavior
const conditionalStream = createStagedStream(
  1,
  'DeterministicEffect',
  (x: number) => (state: { condition: boolean }) => {
    return [state, state.condition ? x * 2 : x / 2];
  }
);
```

#### 3. **Opaque Effects** (`'OpaqueEffect'`)

**Characteristics:**
- External side effects
- I/O operations
- Non-deterministic behavior
- No optimization possible

**Examples:**
```typescript
// I/O operations
const logStream = createOpaqueStream(
  1,
  'IO',
  (x: number) => () => {
    console.log(x);
    return [undefined, x];
  }
);

// Network calls
const apiStream = createOpaqueStream(
  1,
  'Async',
  (x: number) => async () => {
    const result = await fetch(`/api/data/${x}`);
    return [undefined, await result.json()];
  }
);
```

## Type System Integration

### Boundary Markers

The type system uses phantom types to mark boundaries:

```typescript
interface BoundaryKind<Tag extends OptimizationBoundary> {
  readonly _boundary: Tag;
}

export type FullyFusable = BoundaryKind<'FullyFusable'>;
export type Staged = BoundaryKind<'Staged'>;
export type OpaqueEffect = BoundaryKind<'OpaqueEffect'>;
```

### Enhanced Stream Types

```typescript
interface BoundedStream<In, Out, S, UB extends Multiplicity, B extends OptimizationBoundary> {
  readonly usageBound: UB;
  readonly effectTag: EffectTag;
  readonly boundary: B;
  readonly __boundary: BoundaryKind<B>;
  run: (input: In) => StateFn<S, Out>;
}

// Type aliases for convenience
export type FusableStream<In, Out, S, UB extends Multiplicity> = 
  BoundedStream<In, Out, S, UB, 'FullyFusable'>;

export type StagedStream<In, Out, S, UB extends Multiplicity> = 
  BoundedStream<In, Out, S, UB, 'Staged'>;

export type OpaqueStream<In, Out, S, UB extends Multiplicity> = 
  BoundedStream<In, Out, S, UB, 'OpaqueEffect'>;
```

## Boundary Detection

### Explicit Detection

When streams have explicit boundary markers:

```typescript
const analysis = detectBoundary(stream, context);
// Returns: { boundary: 'FullyFusable', confidence: 1.0, ... }
```

### Implicit Detection

When streams don't have explicit markers, the system analyzes:

1. **Function signatures** - Pure functions with single parameters
2. **Effect tags** - Pure vs IO vs Async
3. **Usage bounds** - Known vs unknown multiplicity
4. **State dependencies** - Stateless vs stateful

```typescript
// Implicit detection examples
const pureFn = (x: number) => x * 2;
// Detected as: FullyFusable (confidence: 0.8)

const effectfulFn = (x: number) => {
  console.log(x);
  return x * 2;
};
// Detected as: OpaqueEffect (confidence: 0.95)
```

## Boundary-Aware Composition

### Composition Rules

```typescript
function determineComposedBoundary(
  boundary1: OptimizationBoundary,
  boundary2: OptimizationBoundary
): OptimizationBoundary {
  if (boundary1 === 'OpaqueEffect' || boundary2 === 'OpaqueEffect') {
    return 'OpaqueEffect';
  }
  
  if (boundary1 === 'Staged' || boundary2 === 'Staged') {
    return 'Staged';
  }
  
  return 'FullyFusable';
}
```

### Composition Examples

```typescript
// FullyFusable + FullyFusable = FullyFusable
const fusable1 = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);
const fusable2 = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x + 1]);
const composed = composeWithBoundaries(fusable1, fusable2);
// Result: FullyFusable stream

// FullyFusable + Staged = Staged
const staged = createStagedStream(1, 'DeterministicEffect', (x: number) => (state: any) => [state, x]);
const composed2 = composeWithBoundaries(fusable1, staged);
// Result: Staged stream

// Any + OpaqueEffect = OpaqueEffect
const opaque = createOpaqueStream(1, 'IO', (x: number) => () => {
  console.log(x);
  return [undefined, x];
});
const composed3 = composeWithBoundaries(fusable1, opaque);
// Result: OpaqueEffect stream
```

## Dev Tooling Integration

### Boundary Analysis

```typescript
interface DevToolingInterface {
  // Analyze boundaries in code
  analyzeBoundaries(code: string, context: BoundaryDetectionContext): BoundaryAnalysis[];
  
  // Generate warnings and suggestions
  generateHints(analysis: BoundaryAnalysis[]): DevToolingHint[];
  
  // Check for optimization opportunities
  findOptimizationOpportunities(analysis: BoundaryAnalysis[]): OptimizationOpportunity[];
  
  // Validate boundary transitions
  validateBoundaryTransitions(chain: BoundaryAnalysis[]): ValidationResult;
}
```

### Dev Tooling Hints

```typescript
interface DevToolingHint {
  type: 'warning' | 'suggestion' | 'info' | 'error';
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
  location?: {
    line: number;
    column: number;
    file: string;
  };
}
```

### Example Hints

```typescript
// Warning for opaque effects
{
  type: 'warning',
  message: 'Effectful operation cannot be optimized',
  code: 'OPAQUE_EFFECT_WARNING',
  severity: 'medium',
  suggestion: 'Consider moving I/O operations to the end of the pipeline'
}

// Suggestion for optimization
{
  type: 'suggestion',
  message: 'Consider adding explicit boundary marker for better optimization',
  code: 'BOUNDARY_SUGGESTION',
  severity: 'low',
  suggestion: 'Use createFusableStream() for pure operations'
}

// Info about staging
{
  type: 'info',
  message: 'Dynamic multiplicity requires runtime staging',
  code: 'STAGING_INFO',
  severity: 'low',
  suggestion: 'Consider using fixed bounds where possible'
}
```

## Runtime Boundary Tracking

### Boundary Tracker

```typescript
class BoundaryTracker {
  private boundaries: Map<string, BoundaryAnalysis> = new Map();
  private transitions: BoundaryTransition[] = [];
  
  trackBoundary(id: string, analysis: BoundaryAnalysis): void;
  trackTransition(from: string, to: string, boundary: OptimizationBoundary): void;
  generateReport(): BoundaryReport;
}
```

### Runtime Analysis

```typescript
// Track boundaries during execution
const tracker = new BoundaryTracker();

const stream1 = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);
tracker.trackBoundary('stream1', {
  boundary: 'FullyFusable',
  reason: 'Pure transformation',
  confidence: 1.0,
  optimizationPotential: 1.0,
  devToolingHints: []
});

const stream2 = createOpaqueStream(1, 'IO', (x: number) => () => {
  console.log(x);
  return [undefined, x];
});
tracker.trackBoundary('stream2', {
  boundary: 'OpaqueEffect',
  reason: 'I/O operation',
  confidence: 0.95,
  optimizationPotential: 0.0,
  devToolingHints: [{
    type: 'warning',
    message: 'I/O operation breaks optimization',
    code: 'IO_BREAKS_OPTIMIZATION',
    severity: 'medium'
  }]
});

// Generate report
const report = tracker.generateReport();
console.log(report);
// Output:
// {
//   totalBoundaries: 2,
//   boundaryDistribution: { FullyFusable: 1, Staged: 0, OpaqueEffect: 1 },
//   transitionCount: 0,
//   optimizationOpportunities: [...]
// }
```

## Optimization Opportunities

### Fusion Opportunities

```typescript
interface OptimizationOpportunity {
  type: 'fusion' | 'staging' | 'inlining' | 'specialization';
  description: string;
  potentialGain: number; // 0-1 scale
  complexity: number; // 0-1 scale
  confidence: number; // 0-1 scale
  suggestedCode: string;
}
```

### Example Opportunities

```typescript
// Fusion opportunity
{
  type: 'fusion',
  description: 'Fuse adjacent pure operations',
  potentialGain: 0.8,
  complexity: 0.2,
  confidence: 0.9,
  suggestedCode: 'stream.map(x => x * 2).map(x => x + 1) → stream.map(x => (x * 2) + 1)'
}

// Staging opportunity
{
  type: 'staging',
  description: 'Stage dynamic multiplicity operations',
  potentialGain: 0.6,
  complexity: 0.5,
  confidence: 0.7,
  suggestedCode: 'Use createStagedStream() for dynamic bounds'
}

// Specialization opportunity
{
  type: 'specialization',
  description: 'Specialize for known input types',
  potentialGain: 0.4,
  complexity: 0.3,
  confidence: 0.8,
  suggestedCode: 'Add type annotations for better optimization'
}
```

## Integration with Existing Systems

### Effect System Integration

The boundary system integrates with the existing effect tagging system:

```typescript
// Effect tags influence boundary detection
const pureStream = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);
// Boundary: FullyFusable

const ioStream = createOpaqueStream(1, 'IO', (x: number) => () => {
  console.log(x);
  return [undefined, x];
});
// Boundary: OpaqueEffect

const asyncStream = createOpaqueStream(1, 'Async', (x: number) => async () => {
  const result = await fetch(`/api/${x}`);
  return [undefined, await result.json()];
});
// Boundary: OpaqueEffect
```

### Multiplicity System Integration

The boundary system respects multiplicity constraints:

```typescript
// Known bounds enable full fusion
const boundedStream = createFusableStream(5, 'Pure', (x: number) => () => [undefined, x]);
// Can be fully optimized

// Unknown bounds require staging
const unboundedStream = createStagedStream("∞", 'DeterministicEffect', (x: number) => (state: any) => [state, x]);
// Requires runtime staging
```

### Typeclass System Integration

The boundary system works with the typeclass registry:

```typescript
// Register boundary-aware typeclass instances
registerTypeclassInstance('Array', 'Functor', {
  map: <A, B>(fa: A[], f: (a: A) => B) => {
    // Check if function is pure
    const boundary = detectBoundary(f, context);
    if (boundary.boundary === 'FullyFusable') {
      // Use optimized implementation
      return fa.map(f);
    } else {
      // Use staged implementation
      return createStagedStream(1, boundary.boundary === 'OpaqueEffect' ? 'IO' : 'DeterministicEffect', 
        (x: A) => () => [undefined, f(x)]);
    }
  }
});
```

## Best Practices

### 1. **Explicit Boundary Marking**

```typescript
// Good: Explicit boundary marking
const pureStream = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);

// Better: Use type aliases for clarity
const pureStream: FusableStream<number, number, undefined, 1> = 
  createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);
```

### 2. **Boundary-Aware Composition**

```typescript
// Good: Compose with boundary awareness
const composed = composeWithBoundaries(stream1, stream2);
const boundary = composed.boundary; // Type-safe boundary access

// Avoid: Manual composition without boundary tracking
const manualComposed = (input: any) => (state: any) => {
  const [state1, intermediate] = stream1.run(input)(state);
  return stream2.run(intermediate)(state1);
};
```

### 3. **Dev Tooling Integration**

```typescript
// Good: Use boundary tracker for analysis
const tracker = new BoundaryTracker();
tracker.trackBoundary('myStream', analysis);

// Good: Generate reports for optimization
const report = tracker.generateReport();
console.log('Optimization opportunities:', report.optimizationOpportunities);
```

### 4. **Performance Considerations**

```typescript
// Good: Use appropriate boundaries for performance
const fastStream = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);
// Compile-time optimized

const flexibleStream = createStagedStream(1, 'DeterministicEffect', (x: number) => (state: any) => [state, x]);
// Runtime optimized

const effectfulStream = createOpaqueStream(1, 'IO', (x: number) => () => {
  console.log(x);
  return [undefined, x];
});
// No optimization, but correct semantics
```

## Conclusion

The Stream Boundary Type System provides:

1. **Type Safety** - Compile-time boundary checking
2. **Runtime Analysis** - Dynamic boundary detection
3. **Dev Tooling Support** - Warnings and optimization suggestions
4. **Performance Optimization** - Boundary-aware fusion and staging
5. **Semantic Preservation** - Correct behavior across all boundaries

This system enables developers to write high-performance stream pipelines while maintaining correctness and getting intelligent feedback from their development tools.
