# Stream Combinator Roles: Material vs Shape

## Overview

This document formalizes how common stream combinators fall into **material** or **shape** categories using our DOT-like vocabulary. This distinction enables powerful type-level validation and optimization while maintaining clear separation of concerns.

## Key Concepts

### Material Combinators

**Material combinators** carry runtime state, perform data transformation, and influence evaluation semantics:

- **Runtime State**: Maintain internal state that affects processing
- **Data Transformation**: Perform actual computation on stream elements
- **Evaluation Semantics**: Influence how and when computation occurs
- **Side Effects**: May have observable effects beyond pure transformation

### Shape Combinators

**Shape combinators** introduce type constraints, topological structure, or bounds without adding their own computation:

- **Type Constraints**: Enforce type-level guarantees and contracts
- **Topological Structure**: Define composition patterns and relationships
- **Bounds**: Specify multiplicity, fusion safety, and resource constraints
- **Zero Runtime Cost**: No computation beyond type-level reasoning

## Material Combinators

### Map - Pure Transformation

```typescript
class MapMaterial<Input, Output> implements StreamMaterial<Input, Output, never> {
  constructor(private readonly fn: (input: Input) => Output) {}
  
  process(input: Input): Output {
    return this.fn(input);
  }
  
  readonly hasSideEffects = false;
  readonly isStateful = false;
  readonly evaluationCost = 'constant' as const;
}
```

**Characteristics**:
- **Stateless**: No internal state maintained
- **Pure**: No side effects
- **Constant Cost**: O(1) per element
- **Fusion Safe**: Can be fused with other stateless operations

### Filter - Conditional Transformation

```typescript
class FilterMaterial<Input> implements StreamMaterial<Input, Input | null, never> {
  constructor(private readonly predicate: (input: Input) => boolean) {}
  
  process(input: Input): Input | null {
    return this.predicate(input) ? input : null;
  }
  
  readonly hasSideEffects = false;
  readonly isStateful = false;
  readonly evaluationCost = 'constant' as const;
}
```

**Characteristics**:
- **Stateless**: No internal state maintained
- **Pure**: No side effects
- **Conditional**: May produce null output
- **Fusion Safe**: Can be fused with other stateless operations

### Scan - Stateful Accumulation

```typescript
class ScanMaterial<Input, Output, State> implements StreamMaterial<Input, Output, State> {
  private currentState: State;
  
  constructor(
    private readonly reducer: (state: State, input: Input) => [State, Output],
    initialState: State
  ) {
    this.currentState = initialState;
  }
  
  process(input: Input): Output {
    const [newState, output] = this.reducer(this.currentState, input);
    this.currentState = newState;
    return output;
  }
  
  readonly hasSideEffects = true;
  readonly isStateful = true;
  readonly evaluationCost = 'constant' as const;
}
```

**Characteristics**:
- **Stateful**: Maintains internal state
- **Side Effects**: State changes are observable
- **Accumulation**: Builds up state over time
- **Staged**: Requires staging for fusion

### GroupBy - Stateful Grouping

```typescript
class GroupByMaterial<Input, Key> implements StreamMaterial<Input, [Key, Input[]], Map<Key, Input[]>> {
  private groups = new Map<Key, Input[]>();
  
  constructor(private readonly keyFn: (input: Input) => Key) {}
  
  process(input: Input): [Key, Input[]] {
    const key = this.keyFn(input);
    const group = this.groups.get(key) || [];
    group.push(input);
    this.groups.set(key, group);
    return [key, group];
  }
  
  readonly hasSideEffects = true;
  readonly isStateful = true;
  readonly evaluationCost = 'linear' as const;
}
```

**Characteristics**:
- **Stateful**: Maintains grouping state
- **Side Effects**: Modifies shared state
- **Linear Cost**: O(n) for group lookups
- **Staged**: Requires staging for fusion

### Fold - Stateful Reduction

```typescript
class FoldMaterial<Input, Output> implements StreamMaterial<Input, Output, Output> {
  private accumulator: Output;
  
  constructor(
    private readonly reducer: (acc: Output, input: Input) => Output,
    initialValue: Output
  ) {
    this.accumulator = initialValue;
  }
  
  process(input: Input): Output {
    this.accumulator = this.reducer(this.accumulator, input);
    return this.accumulator;
  }
  
  readonly hasSideEffects = true;
  readonly isStateful = true;
  readonly evaluationCost = 'constant' as const;
}
```

**Characteristics**:
- **Stateful**: Maintains accumulator state
- **Side Effects**: State changes are observable
- **Reduction**: Combines elements into single result
- **Staged**: Requires staging for fusion

## Shape Combinators

### Pipe - Composition Structure

```typescript
class PipeShape<Input, Output, Intermediate> implements StreamShape<Input, Output, never> {
  constructor(
    private readonly firstShape: StreamShape<Input, Intermediate, any>,
    private readonly secondShape: StreamShape<Intermediate, Output, any>
  ) {}
  
  get multiplicity(): Multiplicity {
    return this.firstShape.multiplicity.__brand === 'FiniteMultiplicity' && 
           this.secondShape.multiplicity.__brand === 'FiniteMultiplicity'
      ? finite(this.firstShape.multiplicity.value * this.secondShape.multiplicity.value)
      : infinite;
  }
  
  get fusionSafety(): FusionSafety {
    return this.firstShape.fusionSafety.__brand === 'FullyFusable' && 
           this.secondShape.fusionSafety.__brand === 'FullyFusable'
      ? fullyFusable
      : staged;
  }
  
  readonly compositionRules: CompositionRule[] = [
    {
      name: 'pipe-fusion',
      condition: (material) => !material.isStateful,
      optimization: 'Fuse pipe stages into single transformation'
    }
  ];
}
```

**Characteristics**:
- **Composition**: Defines how stages connect
- **Multiplicity**: Composes multiplicity bounds
- **Fusion Safety**: Determines fusion eligibility
- **Zero Cost**: No runtime overhead

### Compose - Function Composition

```typescript
class ComposeShape<Input, Output, Intermediate> implements StreamShape<Input, Output, never> {
  constructor(
    private readonly firstShape: StreamShape<Input, Intermediate, any>,
    private readonly secondShape: StreamShape<Intermediate, Output, any>
  ) {}
  
  readonly multiplicity: Multiplicity = this.firstShape.multiplicity;
  readonly fusionSafety: FusionSafety = this.firstShape.fusionSafety;
  
  readonly compositionRules: CompositionRule[] = [
    {
      name: 'compose-identity',
      condition: (material) => true,
      optimization: 'Apply identity laws for composition'
    }
  ];
}
```

**Characteristics**:
- **Function Composition**: Mathematical composition
- **Identity Laws**: Supports identity optimizations
- **Transparent**: Preserves shape properties
- **Zero Cost**: No runtime overhead

### TypedStream - Type Constraints

```typescript
class TypedStreamShape<A, B extends A> implements StreamShape<A, B, never> {
  constructor(private readonly typeGuard: (value: A) => value is B) {}
  
  readonly multiplicity: Multiplicity = finite(1);
  readonly fusionSafety: FusionSafety = fullyFusable;
  
  readonly compositionRules: CompositionRule[] = [
    {
      name: 'type-narrowing',
      condition: (material) => !material.hasSideEffects,
      optimization: 'Inline type guard into transformation'
    }
  ];
  
  readonly typeConstraints: TypeConstraint[] = [
    {
      name: 'type-guard',
      constraint: this.typeGuard,
      errorMessage: 'Type guard failed'
    }
  ];
}
```

**Characteristics**:
- **Type Guard**: Runtime type validation
- **Fusion Safe**: Can be inlined into transformations
- **Type Constraints**: Enforces type-level guarantees
- **Minimal Cost**: Only type guard overhead

### Proxy - Structural Constraints

```typescript
class ProxyShape<A> implements StreamShape<A, A, never> {
  constructor(private readonly structuralConstraints: TypeConstraint[]) {}
  
  readonly multiplicity: Multiplicity = finite(1);
  readonly fusionSafety: FusionSafety = fullyFusable;
  
  readonly compositionRules: CompositionRule[] = [
    {
      name: 'proxy-transparency',
      condition: (material) => true,
      optimization: 'Remove proxy wrapper in fusion'
    }
  ];
  
  readonly typeConstraints: TypeConstraint[] = this.structuralConstraints;
}
```

**Characteristics**:
- **Structural**: Enforces structural constraints
- **Transparent**: Can be removed during fusion
- **Custom Constraints**: User-defined validation rules
- **Zero Cost**: Removed during optimization

## Type-Level Validation and Optimization

### Fusion Safety Analysis

```typescript
type CanFuse<Material extends StreamMaterial<any, any, any>, Shape extends StreamShape<any, any, any>> = 
  Material['isStateful'] extends false
    ? Shape['fusionSafety'] extends { __brand: 'FullyFusable' }
      ? true
      : false
    : false;
```

**Logic**:
- **Stateless Materials**: Can fuse with fully fusable shapes
- **Stateful Materials**: Require staging, cannot fuse
- **Shape Constraints**: Must be fully fusable for fusion

### Multiplicity Composition

```typescript
type ComposeMultiplicity<A extends Multiplicity, B extends Multiplicity> = 
  A extends { __brand: 'FiniteMultiplicity' }
    ? B extends { __brand: 'FiniteMultiplicity' }
      ? { __brand: 'FiniteMultiplicity'; value: number }
      : { __brand: 'InfiniteMultiplicity' }
    : { __brand: 'InfiniteMultiplicity' };
```

**Logic**:
- **Finite × Finite**: Results in finite multiplicity
- **Finite × Infinite**: Results in infinite multiplicity
- **Infinite × Any**: Results in infinite multiplicity

### Composition Validation

```typescript
function validateComposition<Material extends StreamMaterial<any, any, any>, Shape extends StreamShape<any, any, any>>(
  material: Material,
  shape: Shape
): CompositionValidation<Material, Shape> {
  const optimizations: string[] = [];
  const warnings: string[] = [];
  
  // Check fusion safety
  const canFuse = !material.isStateful && shape.fusionSafety.__brand === 'FullyFusable';
  
  // Apply composition rules
  for (const rule of shape.compositionRules) {
    if (rule.condition(material)) {
      optimizations.push(rule.optimization);
    }
  }
  
  // Check type constraints
  for (const constraint of shape.typeConstraints) {
    if (typeof constraint.constraint === 'function' && !constraint.constraint(null as any)) {
      warnings.push(constraint.errorMessage);
    }
  }
  
  // Check evaluation cost
  if (material.evaluationCost === 'quadratic' || material.evaluationCost === 'exponential') {
    warnings.push(`High evaluation cost: ${material.evaluationCost}`);
  }
  
  return { canFuse, multiplicity: shape.multiplicity, optimizations, warnings };
}
```

**Features**:
- **Fusion Detection**: Identifies fusable combinations
- **Optimization Hints**: Suggests applicable optimizations
- **Type Validation**: Checks type constraints
- **Cost Analysis**: Warns about expensive operations

## Practical Example

### Pipeline Construction

```typescript
function demonstrateStreamPipeline() {
  // Create material combinators
  const mapMaterial = new MapMaterial<number, string>(x => `Value: ${x}`);
  const filterMaterial = new FilterMaterial<number>(x => x > 10);
  const scanMaterial = new ScanMaterial<number, string, number>(
    (sum, x) => [sum + x, `Sum: ${sum + x}`],
    0
  );
  
  // Create shape combinators
  const typedShape = new TypedStreamShape<number, number>((x): x is number => typeof x === 'number');
  const pipeShape = new PipeShape(
    new TypedStreamShape<number, number>((x): x is number => typeof x === 'number'),
    new TypedStreamShape<string, string>((x): x is string => typeof x === 'string')
  );
  
  // Validate compositions
  const mapTypedValidation = validateComposition(mapMaterial, typedShape);
  const scanTypedValidation = validateComposition(scanMaterial, typedShape);
  
  console.log("Map + TypedStream:");
  console.log(`  Can fuse: ${mapTypedValidation.canFuse}`);
  console.log(`  Optimizations: ${mapTypedValidation.optimizations.join(', ')}`);
  
  console.log("Scan + TypedStream:");
  console.log(`  Can fuse: ${scanTypedValidation.canFuse}`);
  console.log(`  Optimizations: ${scanTypedValidation.optimizations.join(', ')}`);
}
```

**Output**:
```
Map + TypedStream:
  Can fuse: true
  Optimizations: Inline type guard into transformation

Scan + TypedStream:
  Can fuse: false
  Optimizations:
```

## Benefits of Material/Shape Distinction

### 1. Type-Level Reasoning

- **Compile-Time Analysis**: All shape reasoning happens at compile time
- **Fusion Safety**: Statically determine fusion eligibility
- **Optimization Hints**: Identify optimization opportunities
- **Type Safety**: Enforce type constraints at compile time

### 2. Runtime Performance

- **Zero-Cost Abstractions**: Shape combinators have no runtime overhead
- **Fusion Optimization**: Stateless materials can be fused
- **State Elision**: Remove unnecessary state management
- **Cost Analysis**: Warn about expensive operations

### 3. Developer Experience

- **Clear Separation**: Distinguish between computation and structure
- **Optimization Visibility**: See what optimizations are available
- **Type Safety**: Compile-time guarantees about pipeline behavior
- **Debugging**: Clear separation of concerns

### 4. Composition Safety

- **Type-Level Validation**: Ensure safe composition at compile time
- **Fusion Safety**: Prevent unsafe fusion of stateful operations
- **Constraint Checking**: Validate type and structural constraints
- **Performance Warnings**: Alert to potential performance issues

## Integration with Existing Systems

### 1. DOT-like Stream Algebra

Material/shape distinction complements our existing DOT-style patterns:

- **Abstract Type Members**: Shape types use DOT-style abstract members
- **Dependent Multiplicities**: Shape types express dependent relationships
- **Shared State Coordination**: Material types handle concrete state

### 2. Typeclass System

Shape types integrate with our typeclass system:

- **Shape-Based Instances**: Derive typeclass instances from shape analysis
- **Optimization Hooks**: Drive optimizations with shape information
- **Law Preservation**: Ensure typeclass law preservation

### 3. Fluent API System

Material/shape distinction enhances our fluent API system:

- **Shape-Aware Methods**: Generate methods based on shape capabilities
- **Optimization Integration**: Drive method optimization with shape analysis
- **Type Safety**: Ensure type-safe fluent composition

## Future Directions

### 1. Advanced Shape Reasoning

- **Effect Tracking**: Extend shape types to track effect types
- **Resource Bounds**: Add resource usage bounds to shape contracts
- **Parallelism**: Shape-based reasoning for parallel execution safety

### 2. Compiler Integration

- **TypeScript Plugin**: Develop a TypeScript plugin for shape-based optimization
- **Code Generation**: Generate optimized implementations based on shape analysis
- **Static Analysis**: Integrate shape analysis into static analysis tools

### 3. Developer Tooling

- **IDE Support**: Enhanced IDE support for shape-based reasoning
- **Visualization**: Tools for visualizing shape relationships
- **Profiling**: Runtime profiling integrated with shape-based optimization

## Conclusion

The material/shape distinction provides a powerful foundation for stream combinator design, enabling:

- **Type-level validation** and optimization
- **Runtime performance** through fusion and state elision
- **Developer experience** through clear separation of concerns
- **Composition safety** through compile-time guarantees

By formalizing this distinction, we can achieve sophisticated type-level reasoning while maintaining practical usability and performance.
