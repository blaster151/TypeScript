/**
 * Material/Shape Separation in DOT-like Stream Algebra
 * 
 * This demonstrates how the Nominal Wyvern paper's material/shape separation
 * can be applied to stream combinators, where:
 * - Material types: Concrete stream implementations (Map, Filter, Scan)
 * - Shape types: Externally visible behaviors (signature, contract, state machine shape)
 * 
 * This separation enables static reasoning about fusion safety and state elision
 * while preserving expressive composition and ensuring type inference termination.
 */

// ============================================================================
// SHAPE TYPES - Structural Constraints and Behavioral Contracts
// ============================================================================

/**
 * Shape types represent the externally visible behavior and structural constraints
 * of stream combinators, enabling static reasoning without concrete implementation details.
 */

// Base shape for all stream combinators
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

// Multiplicity tracking at the shape level
type Multiplicity = 
  | { readonly __brand: 'FiniteMultiplicity'; value: number }
  | { readonly __brand: 'InfiniteMultiplicity' };

const finite = (n: number): Multiplicity => ({ __brand: 'FiniteMultiplicity', value: n });
const infinite: Multiplicity = { __brand: 'InfiniteMultiplicity' };

// Fusion safety classification
type FusionSafety = 
  | { readonly __brand: 'FullyFusable' }
  | { readonly __brand: 'Staged' }
  | { readonly __brand: 'OpaqueEffect' };

const fullyFusable: FusionSafety = { __brand: 'FullyFusable' };
const staged: FusionSafety = { __brand: 'Staged' };
const opaqueEffect: FusionSafety = { __brand: 'OpaqueEffect' };

// Shape for stateless, pure transformations
interface MapShape<Input, Output> extends StreamShape<Input, Output, never> {
  readonly __brand: 'MapShape';
  readonly multiplicity: Multiplicity; // Always 1-to-1
  readonly isStateless: true;
  readonly isPure: true;
  readonly fusionSafety: FusionSafety; // Always fully fusable
}

// Shape for filtering operations
interface FilterShape<Input> extends StreamShape<Input, Input, never> {
  readonly __brand: 'FilterShape';
  readonly multiplicity: Multiplicity; // 0-or-1
  readonly isStateless: true;
  readonly isPure: boolean; // Depends on predicate
  readonly fusionSafety: FusionSafety; // Fully fusable if pure
}

// Shape for stateful operations
interface ScanShape<Input, Output, State> extends StreamShape<Input, Output, State> {
  readonly __brand: 'ScanShape';
  readonly multiplicity: Multiplicity; // Always 1-to-1
  readonly isStateless: false;
  readonly isPure: boolean; // Depends on reducer
  readonly fusionSafety: FusionSafety; // Staged if stateful
}

// ============================================================================
// MATERIAL TYPES - Concrete Implementations
// ============================================================================

/**
 * Material types contain the concrete implementation details and internal state
 * of stream combinators, separated from their shape contracts.
 */

// Base material type
interface StreamMaterial<Shape extends StreamShape<any, any, any>> {
  readonly __brand: 'StreamMaterial';
  readonly shape: Shape;
  
  // Concrete implementation
  process(input: Shape['InputType']): Shape['OutputType'];
  
  // Internal state (if any)
  getState?(): Shape['StateType'];
  setState?(state: Shape['StateType']): void;
}

// Material implementation for Map
class MapMaterial<Input, Output> implements StreamMaterial<MapShape<Input, Output>> {
  readonly __brand = 'StreamMaterial' as const;
  
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

// Material implementation for Filter
class FilterMaterial<Input> implements StreamMaterial<FilterShape<Input>> {
  readonly __brand = 'StreamMaterial' as const;
  
  constructor(
    private readonly predicate: (input: Input) => boolean,
    readonly shape: FilterShape<Input> = {
      __brand: 'FilterShape',
      multiplicity: { __brand: 'InfiniteMultiplicity' }, // 0-or-1
      isStateless: true,
      isPure: true, // Assuming pure predicate
      fusionSafety: fullyFusable
    } as FilterShape<Input>
  ) {}
  
  process(input: Input): Input | null {
    return this.predicate(input) ? input : null;
  }
}

// Material implementation for Scan
class ScanMaterial<Input, Output, State> implements StreamMaterial<ScanShape<Input, Output, State>> {
  readonly __brand = 'StreamMaterial' as const;
  
  private currentState: State;
  
  constructor(
    private readonly reducer: (state: State, input: Input) => [State, Output],
    private readonly initialState: State,
    readonly shape: ScanShape<Input, Output, State> = {
      __brand: 'ScanShape',
      multiplicity: finite(1),
      isStateless: false,
      isPure: false, // Stateful operations are typically impure
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
  
  getState(): State {
    return this.currentState;
  }
  
  setState(state: State): void {
    this.currentState = state;
  }
}

// ============================================================================
// SHAPE-BASED REASONING
// ============================================================================

/**
 * Shape types enable static reasoning about fusion safety and composition
 * without needing concrete material implementations.
 */

// Type-level fusion safety analysis
type CanFuse<A extends StreamShape<any, any, any>, B extends StreamShape<any, any, any>> = 
  A['fusionSafety'] extends { __brand: 'FullyFusable' }
    ? B['fusionSafety'] extends { __brand: 'FullyFusable' }
      ? true
      : false
    : false;

// Type-level multiplicity composition
type ComposeMultiplicity<A extends Multiplicity, B extends Multiplicity> = 
  A extends { __brand: 'FiniteMultiplicity' }
    ? B extends { __brand: 'FiniteMultiplicity' }
      ? { __brand: 'FiniteMultiplicity'; value: number } // Simplified for TypeScript compatibility
      : { __brand: 'InfiniteMultiplicity' }
    : { __brand: 'InfiniteMultiplicity' };

// Shape composition
interface ComposedShape<A extends StreamShape<any, any, any>, B extends StreamShape<any, any, any>> 
  extends StreamShape<A['InputType'], B['OutputType'], A['StateType'] | B['StateType']> {
  readonly __brand: 'ComposedShape';
  readonly multiplicity: ComposeMultiplicity<A['multiplicity'], B['multiplicity']>;
  readonly isStateless: A['isStateless'] & B['isStateless'];
  readonly isPure: A['isPure'] & B['isPure'];
  readonly fusionSafety: CanFuse<A, B> extends true 
    ? { __brand: 'FullyFusable' }
    : { __brand: 'Staged' };
}

// ============================================================================
// MATERIAL/SHAPE SEPARATION IN PRACTICE
// ============================================================================

/**
 * Demonstrates how material/shape separation enables:
 * 1. Static fusion safety analysis
 * 2. State elision optimization
 * 3. Expressive composition with termination guarantees
 */

// Shape-only pipeline analysis (no material needed)
function analyzePipelineSafety<Shapes extends StreamShape<any, any, any>[]>(
  shapes: Shapes
): {
  canFuse: boolean;
  totalMultiplicity: Multiplicity;
  isStateless: boolean;
  isPure: boolean;
} {
  if (shapes.length === 0) {
    return {
      canFuse: true,
      totalMultiplicity: finite(1),
      isStateless: true,
      isPure: true
    };
  }
  
  const [first, ...rest] = shapes;
  const restAnalysis = analyzePipelineSafety(rest);
  
  return {
    canFuse: first.fusionSafety.__brand === 'FullyFusable' && restAnalysis.canFuse,
    totalMultiplicity: first.multiplicity.__brand === 'FiniteMultiplicity' && 
                      restAnalysis.totalMultiplicity.__brand === 'FiniteMultiplicity'
      ? finite(first.multiplicity.value * restAnalysis.totalMultiplicity.value)
      : infinite,
    isStateless: first.isStateless && restAnalysis.isStateless,
    isPure: first.isPure && restAnalysis.isPure
  };
}

// State elision optimization based on shape analysis
function canElideState<Shape extends StreamShape<any, any, any>>(
  shape: Shape
): shape is Shape & { StateType: never } {
  return shape.isStateless;
}

// ============================================================================
// WORKING EXAMPLE
// ============================================================================

/**
 * Demonstrates material/shape separation with concrete examples
 */

function demonstrateMaterialShapeSeparation() {
  console.log("=== Material/Shape Separation Demo ===\n");
  
  // Create materials with their shapes
  const mapMaterial = new MapMaterial<number, string>(
    x => `Value: ${x}`
  );
  
  const filterMaterial = new FilterMaterial<number>(
    x => x > 10
  );
  
  const scanMaterial = new ScanMaterial<number, string, number>(
    (sum, x) => [sum + x, `Sum: ${sum + x}`],
    0
  );
  
  console.log("1. Shape Analysis (Static Reasoning):");
  console.log(`   Map shape: ${mapMaterial.shape.__brand}`);
  console.log(`   - Multiplicity: ${mapMaterial.shape.multiplicity.__brand}`);
  console.log(`   - Stateless: ${mapMaterial.shape.isStateless}`);
  console.log(`   - Pure: ${mapMaterial.shape.isPure}`);
  console.log(`   - Fusion safety: ${mapMaterial.shape.fusionSafety.__brand}\n`);
  
  console.log("2. Pipeline Safety Analysis:");
  const shapes = [mapMaterial.shape, filterMaterial.shape];
  const analysis = analyzePipelineSafety(shapes);
  console.log(`   Can fuse: ${analysis.canFuse}`);
  console.log(`   Total multiplicity: ${analysis.totalMultiplicity.__brand}`);
  console.log(`   Stateless pipeline: ${analysis.isStateless}`);
  console.log(`   Pure pipeline: ${analysis.isPure}\n`);
  
  console.log("3. State Elision:");
  console.log(`   Map can elide state: ${canElideState(mapMaterial.shape)}`);
  console.log(`   Filter can elide state: ${canElideState(filterMaterial.shape)}`);
  console.log(`   Scan can elide state: ${canElideState(scanMaterial.shape)}\n`);
  
  console.log("4. Material Processing:");
  const testInput = 15;
  console.log(`   Input: ${testInput}`);
  console.log(`   Map output: ${mapMaterial.process(testInput)}`);
  console.log(`   Filter output: ${filterMaterial.process(testInput)}`);
  console.log(`   Scan output: ${scanMaterial.process(testInput)}`);
  console.log(`   Scan state: ${scanMaterial.getState()}\n`);
  
  console.log("5. Fusion Optimization:");
  if (analysis.canFuse) {
    console.log("   ✓ Pipeline can be fused into single pass");
    console.log("   ✓ No intermediate allocations needed");
    console.log("   ✓ State can be elided for stateless operations");
  } else {
    console.log("   ⚠ Pipeline requires staging");
    console.log("   ⚠ Intermediate state must be preserved");
  }
}

// ============================================================================
// ADVANCED SHAPE REASONING
// ============================================================================

/**
 * Demonstrates more advanced shape-based reasoning capabilities
 */

// Shape-based optimization rules
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

// Shape-based composition validation
function validateComposition<A extends StreamShape<any, any, any>, B extends StreamShape<any, any, any>>(
  a: A, b: B
): {
  isValid: boolean;
  reason?: string;
  optimizations: string[];
} {
  const optimizations: string[] = [];
  
  // Check if composition is valid
  if (a.OutputType !== b.InputType) {
    return {
      isValid: false,
      reason: 'Type mismatch in composition',
      optimizations: []
    };
  }
  
  // Apply optimization rules
  if (mapMapFusion.condition(a as any)) {
    optimizations.push(mapMapFusion.optimization);
  }
  
  if (filterEarly.condition(b as any)) {
    optimizations.push(filterEarly.optimization);
  }
  
  return {
    isValid: true,
    optimizations
  };
}

// ============================================================================
// TYPE INFERENCE TERMINATION
// ============================================================================

/**
 * Material/shape separation ensures type inference termination by:
 * 1. Separating concrete implementation details from structural constraints
 * 2. Enabling shape-based reasoning without material instantiation
 * 3. Providing clear boundaries for type-level computation
 */

// Shape-only type functions (terminate quickly)
type ExtractInputType<Shape extends StreamShape<any, any, any>> = Shape['InputType'];
type ExtractOutputType<Shape extends StreamShape<any, any, any>> = Shape['OutputType'];
type ExtractStateType<Shape extends StreamShape<any, any, any>> = Shape['StateType'];

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

// ============================================================================
// EXPORT AND DEMONSTRATION
// ============================================================================

export {
  StreamShape,
  StreamMaterial,
  MapShape,
  FilterShape,
  ScanShape,
  MapMaterial,
  FilterMaterial,
  ScanMaterial,
  analyzePipelineSafety,
  canElideState,
  validateComposition,
  demonstrateMaterialShapeSeparation
};

// Run the demonstration
if (require.main === module) {
  demonstrateMaterialShapeSeparation();
}
