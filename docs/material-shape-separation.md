# Material/Shape Separation in DOT-like Stream Algebra

## Overview

This document explores how the **material/shape separation** concept from the Nominal Wyvern paper can be applied to our DOT-like stream algebra. This separation enables static reasoning about fusion safety and state elision while preserving expressive composition and ensuring type inference termination.

## Key Concepts

### Material Types vs Shape Types

**Material Types** contain concrete implementation details and internal state:
- Concrete stream implementations (Map, Filter, Scan)
- Internal state management
- Runtime behavior and processing logic
- Memory layout and allocation strategies

**Shape Types** represent externally visible behaviors and structural constraints:
- Behavioral contracts and signatures
- Fusion safety classifications
- Multiplicity bounds
- Purity and statelessness guarantees
- Type-level composition rules

## Benefits of Separation

### 1. Static Fusion Safety Analysis

Shape types enable compile-time reasoning about fusion safety without needing concrete material implementations:

```typescript
// Shape-only analysis (no material instantiation needed)
function analyzePipelineSafety<Shapes extends StreamShape<any, any, any>[]>(
  shapes: Shapes
): {
  canFuse: boolean;
  totalMultiplicity: Multiplicity;
  isStateless: boolean;
  isPure: boolean;
}
```

**Example**: A pipeline of `MapShape` → `FilterShape` → `MapShape` can be statically determined to be fully fusable because all shapes have `fusionSafety: 'FullyFusable'`.

### 2. State Elision Optimization

Shape analysis enables aggressive state elision for stateless operations:

```typescript
function canElideState<Shape extends StreamShape<any, any, any>>(
  shape: Shape
): shape is Shape & { StateType: never } {
  return shape.isStateless;
}
```

**Example**: `MapShape` and `FilterShape` can have their state completely elided, while `ScanShape` requires state preservation.

### 3. Type Inference Termination

Material/shape separation ensures type inference termination by:

- **Clear Boundaries**: Shape types provide bounded type-level computation
- **No Infinite Recursion**: Material details don't leak into shape reasoning
- **Predictable Complexity**: Shape analysis has O(n) complexity for n combinators

## Implementation in Our Stream Algebra

### Shape Type Hierarchy

```typescript
interface StreamShape<Input, Output, State = never> {
  readonly __brand: 'StreamShape';
  
  // Abstract type members (DOT-style)
  readonly InputType: Input;
  readonly OutputType: Output;
  readonly StateType: State;
  
  // Behavioral contracts
  readonly multiplicity: Multiplicity;
  readonly isStateless: boolean;
  readonly isPure: boolean;
  readonly fusionSafety: FusionSafety;
}
```

### Material Type Implementation

```typescript
interface StreamMaterial<Shape extends StreamShape<any, any, any>> {
  readonly __brand: 'StreamMaterial';
  readonly shape: Shape;
  
  // Concrete implementation
  process(input: Shape['InputType']): Shape['OutputType'];
  
  // Internal state (if any)
  getState?(): Shape['StateType'];
  setState?(state: Shape['StateType']): void;
}
```

## Shape-Based Reasoning Examples

### 1. Fusion Safety Analysis

```typescript
type CanFuse<A extends StreamShape<any, any, any>, B extends StreamShape<any, any, any>> = 
  A['fusionSafety'] extends { __brand: 'FullyFusable' }
    ? B['fusionSafety'] extends { __brand: 'FullyFusable' }
      ? true
      : false
    : false;
```

### 2. Multiplicity Composition

```typescript
type ComposeMultiplicity<A extends Multiplicity, B extends Multiplicity> = 
  A extends { __brand: 'FiniteMultiplicity' }
    ? B extends { __brand: 'FiniteMultiplicity' }
      ? { __brand: 'FiniteMultiplicity'; value: number }
      : { __brand: 'InfiniteMultiplicity' }
    : { __brand: 'InfiniteMultiplicity' };
```

### 3. Shape Composition

```typescript
interface ComposedShape<A extends StreamShape<any, any, any>, B extends StreamShape<any, any, any>> 
  extends StreamShape<A['InputType'], B['OutputType'], A['StateType'] | B['StateType']> {
  readonly multiplicity: ComposeMultiplicity<A['multiplicity'], B['multiplicity']>;
  readonly isStateless: A['isStateless'] & B['isStateless'];
  readonly isPure: A['isPure'] & B['isPure'];
  readonly fusionSafety: CanFuse<A, B> extends true 
    ? { __brand: 'FullyFusable' }
    : { __brand: 'Staged' };
}
```

## Concrete Examples

### Map Combinator

**Shape**: Stateless, pure, 1-to-1 multiplicity, fully fusable
**Material**: Simple function application

```typescript
class MapMaterial<Input, Output> implements StreamMaterial<MapShape<Input, Output>> {
  constructor(
    private readonly fn: (input: Input) => Output,
    readonly shape: MapShape<Input, Output> = {
      __brand: 'MapShape',
      multiplicity: finite(1),
      isStateless: true,
      isPure: true,
      fusionSafety: fullyFusable
    } as MapShape<Input, Output>
  ) {}
  
  process(input: Input): Output {
    return this.fn(input);
  }
}
```

### Filter Combinator

**Shape**: Stateless, pure, 0-or-1 multiplicity, fully fusable
**Material**: Predicate-based filtering

```typescript
class FilterMaterial<Input> implements StreamMaterial<FilterShape<Input>> {
  constructor(
    private readonly predicate: (input: Input) => boolean,
    readonly shape: FilterShape<Input> = {
      __brand: 'FilterShape',
      multiplicity: { __brand: 'InfiniteMultiplicity' }, // 0-or-1
      isStateless: true,
      isPure: true,
      fusionSafety: fullyFusable
    } as FilterShape<Input>
  ) {}
  
  process(input: Input): Input | null {
    return this.predicate(input) ? input : null;
  }
}
```

### Scan Combinator

**Shape**: Stateful, impure, 1-to-1 multiplicity, staged
**Material**: State accumulation with reducer

```typescript
class ScanMaterial<Input, Output, State> implements StreamMaterial<ScanShape<Input, Output, State>> {
  private currentState: State;
  
  constructor(
    private readonly reducer: (state: State, input: Input) => [State, Output],
    private readonly initialState: State,
    readonly shape: ScanShape<Input, Output, State> = {
      __brand: 'ScanShape',
      multiplicity: finite(1),
      isStateless: false,
      isPure: false,
      fusionSafety: staged
    } as ScanShape<Input, Output, State>
  ) {
    this.currentState = initialState;
  }
  
  process(input: Input): Output {
    const [newState, output] = this.reducer(this.currentState, input);
    this.currentState = newState;
    return output;
  }
}
```

## Optimization Rules

### Shape-Based Optimization

```typescript
interface OptimizationRule<Shape extends StreamShape<any, any, any>> {
  readonly condition: (shape: Shape) => boolean;
  readonly optimization: string;
  readonly performanceGain: 'low' | 'medium' | 'high';
}

const mapMapFusion: OptimizationRule<MapShape<any, any>> = {
  condition: (shape) => shape.isPure && shape.fusionSafety.__brand === 'FullyFusable',
  optimization: 'Fuse consecutive maps into single transformation',
  performanceGain: 'medium'
};

const filterEarly: OptimizationRule<FilterShape<any>> = {
  condition: (shape) => shape.isPure,
  optimization: 'Push filter earlier in pipeline to reduce downstream work',
  performanceGain: 'high'
};
```

### Composition Validation

```typescript
function validateComposition<A extends StreamShape<any, any, any>, B extends StreamShape<any, any, any>>(
  a: A, b: B
): {
  isValid: boolean;
  reason?: string;
  optimizations: string[];
}
```

## Type Inference Termination

Material/shape separation ensures type inference termination through:

### 1. Bounded Type-Level Computation

```typescript
// Shape-only type functions (terminate quickly)
type ExtractInputType<Shape extends StreamShape<any, any, any>> = Shape['InputType'];
type ExtractOutputType<Shape extends StreamShape<any, any, any>> = Shape['OutputType'];
type ExtractStateType<Shape extends StreamShape<any, any, any>> = Shape['StateType'];
```

### 2. Material-Agnostic Composition

```typescript
// Material-agnostic composition (no infinite recursion)
type ComposeShapes<Shapes extends StreamShape<any, any, any>[]> = 
  Shapes extends [infer First, ...infer Rest]
    ? First extends StreamShape<any, any, any>
      ? Rest extends StreamShape<any, any, any>[]
        ? ComposeShapes<Rest> extends StreamShape<any, any, any>
          ? ComposedShape<First, ComposeShapes<Rest>>
          : never
        : First
      : never
    : never;
```

## Practical Benefits

### 1. Compile-Time Optimization

- **Fusion Detection**: Statically identify fusable pipeline segments
- **State Elision**: Remove unnecessary state management for stateless operations
- **Allocation Optimization**: Determine when intermediate allocations can be avoided

### 2. Developer Experience

- **Type Safety**: Compile-time guarantees about pipeline behavior
- **Performance Hints**: IDE can suggest optimizations based on shape analysis
- **Debugging**: Clear separation between structural constraints and implementation details

### 3. Runtime Performance

- **Zero-Cost Abstractions**: Shape analysis happens at compile time
- **Optimized Code Generation**: Material implementations can be specialized based on shape
- **Memory Efficiency**: State elision reduces memory footprint

## Integration with Existing Systems

### 1. DOT-like Stream Algebra

Material/shape separation complements our existing DOT-style patterns:

- **Abstract Type Members**: Shape types use DOT-style abstract members for type relationships
- **Dependent Multiplicities**: Shape types can express dependent multiplicity relationships
- **Shared State Coordination**: Material types handle concrete state management

### 2. Typeclass System

Shape types can be integrated with our typeclass system:

- **Shape-Based Instances**: Typeclass instances can be derived from shape analysis
- **Optimization Hooks**: Shape information can drive typeclass-driven optimizations
- **Law Preservation**: Shape contracts ensure typeclass law preservation

### 3. Fluent API System

Material/shape separation enhances our fluent API system:

- **Shape-Aware Methods**: Fluent methods can be generated based on shape capabilities
- **Optimization Integration**: Shape analysis can drive fluent method optimization
- **Type Safety**: Shape contracts ensure type-safe fluent composition

## Future Directions

### 1. Advanced Shape Reasoning

- **Effect Tracking**: Extend shape types to track effect types and dependencies
- **Resource Bounds**: Add resource usage bounds to shape contracts
- **Parallelism**: Shape-based reasoning for parallel execution safety

### 2. Compiler Integration

- **TypeScript Plugin**: Develop a TypeScript plugin for shape-based optimization
- **Code Generation**: Generate optimized material implementations based on shape analysis
- **Static Analysis**: Integrate shape analysis into static analysis tools

### 3. Developer Tooling

- **IDE Support**: Enhanced IDE support for shape-based reasoning
- **Visualization**: Tools for visualizing shape relationships and fusion opportunities
- **Profiling**: Runtime profiling integrated with shape-based optimization

## Conclusion

Material/shape separation provides a powerful foundation for static reasoning about stream combinator behavior while maintaining expressive composition and ensuring type inference termination. This approach enables:

- **Compile-time optimization** through shape-based analysis
- **Runtime performance** through material specialization
- **Developer experience** through clear separation of concerns
- **Type safety** through shape contracts and validation

By applying this separation to our DOT-like stream algebra, we can achieve the benefits of advanced type system features while working within TypeScript's current capabilities and ensuring practical usability.
