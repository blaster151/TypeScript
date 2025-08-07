// ============================================================================
// Advanced TypeScript Type System Examples
// ============================================================================
// 
// This file demonstrates how to encode multiplicity, fusion safety, and shared
// state coordination using modern TypeScript features without requiring a fork.

// ============================================================================
// 1. Multiplicity Encoding with Branded Types
// ============================================================================

/**
 * Branded type for finite multiplicities
 */
type FiniteMultiplicity = number & { readonly __brand: 'FiniteMultiplicity' };

/**
 * Branded type for infinite multiplicity
 */
type InfiniteMultiplicity = { readonly __brand: 'InfiniteMultiplicity' };

/**
 * Union type representing all possible multiplicities
 */
type Multiplicity = FiniteMultiplicity | InfiniteMultiplicity;

/**
 * Type-level function to create finite multiplicities
 */
function finite<N extends number>(n: N): N extends 0 ? never : N & FiniteMultiplicity {
  return n as any;
}

/**
 * Infinite multiplicity constant
 */
const INFINITE: InfiniteMultiplicity = { __brand: 'InfiniteMultiplicity' } as const;

/**
 * Type-level arithmetic for multiplicities
 */
type MultAdd<A extends Multiplicity, B extends Multiplicity> = 
  A extends FiniteMultiplicity 
    ? B extends FiniteMultiplicity 
      ? A extends number 
        ? B extends number 
          ? (A & B) extends never ? never : (A & B) & FiniteMultiplicity
          : never
        : never
      : InfiniteMultiplicity
    : InfiniteMultiplicity;

type MultMul<A extends Multiplicity, B extends Multiplicity> = 
  A extends FiniteMultiplicity 
    ? B extends FiniteMultiplicity 
      ? A extends number 
        ? B extends number 
          ? (A & B) extends never ? never : (A & B) & FiniteMultiplicity
          : never
        : never
      : InfiniteMultiplicity
    : InfiniteMultiplicity;

// ============================================================================
// 2. Stream Combinator Interfaces with Multiplicity Tracking
// ============================================================================

/**
 * Base stream combinator interface with multiplicity tracking
 */
interface StreamCombinator<In, Out, M extends Multiplicity> {
  readonly multiplicity: M;
  readonly isStateless: boolean;
  readonly isPure: boolean;
  transform: (input: In) => Out;
}

/**
 * Map combinator: 1-to-1 multiplicity, stateless, pure
 */
interface MapCombinator<In, Out> extends StreamCombinator<In, Out, 1 & FiniteMultiplicity> {
  readonly type: 'map';
  readonly fn: (x: In) => Out;
  readonly isStateless: true;
  readonly isPure: true;
}

/**
 * Filter combinator: 0-or-1 multiplicity, stateless, pure
 */
interface FilterCombinator<In> extends StreamCombinator<In, In | never, 1 & FiniteMultiplicity> {
  readonly type: 'filter';
  readonly predicate: (x: In) => boolean;
  readonly isStateless: true;
  readonly isPure: true;
}

/**
 * Scan combinator: preserves input multiplicity, stateful, deterministic
 */
interface ScanCombinator<In, Out, State> extends StreamCombinator<In, Out, 1 & FiniteMultiplicity> {
  readonly type: 'scan';
  readonly initialState: State;
  readonly scanFn: (state: State, input: In) => [State, Out];
  readonly isStateless: false;
  readonly isPure: false;
}

// ============================================================================
// 3. Fusion Safety Type System
// ============================================================================

/**
 * Type-level fusion safety check
 */
type CanFuse<A extends StreamCombinator<any, any, any>, B extends StreamCombinator<any, any, any>> = 
  A['isPure'] extends true 
    ? B['isPure'] extends true 
      ? true 
      : B['isStateless'] extends true 
        ? true 
        : false
    : A['isStateless'] extends true 
      ? B['isPure'] extends true 
        ? true 
        : false
      : false;

/**
 * Type-level multiplicity preservation check
 */
type PreservesMultiplicity<A extends StreamCombinator<any, any, any>, B extends StreamCombinator<any, any, any>> = 
  MultMul<A['multiplicity'], B['multiplicity']> extends B['multiplicity'] 
    ? true 
    : false;

/**
 * Combined fusion safety check
 */
type IsFusionSafe<A extends StreamCombinator<any, any, any>, B extends StreamCombinator<any, any, any>> = 
  CanFuse<A, B> extends true 
    ? PreservesMultiplicity<A, B> extends true 
      ? true 
      : false
    : false;

// ============================================================================
// 4. Safe Fusion Implementation
// ============================================================================

/**
 * Creates a map combinator
 */
function createMap<In, Out>(fn: (x: In) => Out): MapCombinator<In, Out> {
  return {
    type: 'map',
    multiplicity: finite(1),
    isStateless: true,
    isPure: true,
    fn,
    transform: fn
  };
}

/**
 * Creates a filter combinator
 */
function createFilter<In>(predicate: (x: In) => boolean): FilterCombinator<In> {
  return {
    type: 'filter',
    multiplicity: finite(1),
    isStateless: true,
    isPure: true,
    predicate,
    transform: (input: In) => predicate(input) ? input : undefined as never
  };
}

/**
 * Creates a scan combinator
 */
function createScan<In, Out, State>(
  initialState: State,
  scanFn: (state: State, input: In) => [State, Out]
): ScanCombinator<In, Out, State> {
  let currentState = initialState;
  
  return {
    type: 'scan',
    multiplicity: finite(1),
    isStateless: false,
    isPure: false,
    initialState,
    scanFn,
    transform: (input: In) => {
      const [newState, output] = scanFn(currentState, input);
      currentState = newState;
      return output;
    }
  };
}

/**
 * Fuses two combinators if safe
 */
function fuseCombinators<A extends StreamCombinator<any, any, any>, B extends StreamCombinator<any, any, any>>(
  a: A,
  b: B
): IsFusionSafe<A, B> extends true 
  ? StreamCombinator<Parameters<A['transform']>[0], ReturnType<B['transform']>, MultMul<A['multiplicity'], B['multiplicity']>>
  : never {
  
  // Type-level safety check
  if (!a.isPure && !b.isPure) {
    throw new Error('Cannot fuse two stateful combinators');
  }
  
  // Multiplicity check
  const fusedMultiplicity = multiplyMultiplicities(a.multiplicity, b.multiplicity);
  if (!preservesMultiplicity(a.multiplicity, b.multiplicity, fusedMultiplicity)) {
    throw new Error('Fusion would increase multiplicity');
  }
  
  // Create fused combinator
  return {
    multiplicity: fusedMultiplicity,
    isStateless: a.isStateless && b.isStateless,
    isPure: a.isPure && b.isPure,
    transform: (input: Parameters<A['transform']>[0]) => {
      const intermediate = a.transform(input);
      return b.transform(intermediate);
    }
  } as any;
}

// ============================================================================
// 5. Shared State Coordination with DOT-like Model
// ============================================================================

/**
 * Associated type for shared state
 */
interface SharedState {
  readonly __brand: 'SharedState';
}

/**
 * Token bucket state for throttling
 */
interface TokenBucketState extends SharedState {
  readonly tokens: number;
  readonly lastRefill: number;
  readonly maxTokens: number;
  readonly refillRate: number;
}

/**
 * Stream that coordinates with shared state
 */
interface StatefulStream<In, Out, State extends SharedState> {
  readonly associatedState: State;
  readonly multiplicity: Multiplicity;
  readonly isStateless: false;
  readonly isPure: false;
  transform: (input: In, state: State) => [State, Out];
}

/**
 * Throttle stream that coordinates with token bucket
 */
interface ThrottleStream<In> extends StatefulStream<In, In, TokenBucketState> {
  readonly type: 'throttle';
  readonly costPerEvent: number;
  readonly timeoutMs: number;
}

/**
 * Creates a throttle stream
 */
function createThrottle<In>(
  costPerEvent: number = 1,
  timeoutMs: number = 1000
): ThrottleStream<In> {
  return {
    type: 'throttle',
    multiplicity: finite(1),
    isStateless: false,
    isPure: false,
    associatedState: {} as TokenBucketState,
    costPerEvent,
    timeoutMs,
    transform: (input: In, state: TokenBucketState) => {
      const now = Date.now();
      const timeSinceRefill = now - state.lastRefill;
      const tokensToAdd = Math.floor(timeSinceRefill / state.refillRate);
      const newTokens = Math.min(state.maxTokens, state.tokens + tokensToAdd);
      
      if (newTokens >= costPerEvent) {
        const newState: TokenBucketState = {
          ...state,
          tokens: newTokens - costPerEvent,
          lastRefill: now
        };
        return [newState, input];
      } else {
        return [state, undefined as never];
      }
    }
  };
}

// ============================================================================
// 6. Dependent Multiplicities for State Coordination
// ============================================================================

/**
 * Type-level function to compute dependent multiplicity
 */
type DependentMultiplicity<State extends SharedState, Op extends string> = 
  Op extends 'throttle' 
    ? State extends TokenBucketState 
      ? State['tokens'] extends number 
        ? State['tokens'] extends 0 
          ? 0 & FiniteMultiplicity
          : 1 & FiniteMultiplicity
        : 1 & FiniteMultiplicity
      : 1 & FiniteMultiplicity
    : 1 & FiniteMultiplicity;

/**
 * Stream with dependent multiplicity
 */
interface DependentStream<In, Out, State extends SharedState, Op extends string> {
  readonly associatedState: State;
  readonly multiplicity: DependentMultiplicity<State, Op>;
  readonly operation: Op;
  transform: (input: In, state: State) => [State, Out];
}

// ============================================================================
// 7. Working Example: Safe Fusion Scenario
// ============================================================================

/**
 * Demonstrates the safe fusion scenario: map(x => x * 2) and filter(x > 10)
 */
function demonstrateSafeFusion() {
  console.log('=== Safe Fusion Scenario ===');
  
  // Create combinators
  const mapCombinator = createMap((x: number) => x * 2);
  const filterCombinator = createFilter((x: number) => x > 10);
  
  console.log('Map multiplicity:', mapCombinator.multiplicity); // 1
  console.log('Filter multiplicity:', filterCombinator.multiplicity); // 1
  
  // Compose and track composed multiplicity
  const composedMultiplicity = multiplyMultiplicities(
    mapCombinator.multiplicity, 
    filterCombinator.multiplicity
  );
  console.log('Composed multiplicity:', composedMultiplicity); // 1
  
  // Demonstrate fusion
  try {
    const fusedCombinator = fuseCombinators(mapCombinator, filterCombinator);
    console.log('Fusion successful!');
    
    // Test the fused combinator
    const testInputs = [5, 6, 7, 8, 9, 10, 11, 12];
    const results = testInputs.map(input => {
      const intermediate = mapCombinator.transform(input); // x * 2
      return filterCombinator.transform(intermediate);     // x > 10
    });
    
    const fusedResults = testInputs.map(input => 
      fusedCombinator.transform(input)
    );
    
    console.log('Original results:', results);
    console.log('Fused results:', fusedResults);
    console.log('Results match:', JSON.stringify(results) === JSON.stringify(fusedResults));
    
  } catch (error) {
    console.error('Fusion failed:', (error as Error).message);
  }
}

// ============================================================================
// 8. Shared State Coordination Example
// ============================================================================

/**
 * Demonstrates shared state coordination with throttle
 */
function demonstrateSharedState() {
  console.log('\n=== Shared State Coordination ===');
  
  // Create initial token bucket state
  const initialState: TokenBucketState = {
    tokens: 5,
    lastRefill: Date.now(),
    maxTokens: 10,
    refillRate: 1000, // 1 token per second
    __brand: 'SharedState'
  };
  
  // Create throttle stream
  const throttleStream = createThrottle(2, 1000); // 2 tokens per event
  
  console.log('Initial tokens:', initialState.tokens);
  
  // Simulate events
  const events = [1, 2, 3, 4, 5];
  let currentState = initialState;
  
  for (const event of events) {
    const [newState, output] = throttleStream.transform(event, currentState);
    currentState = newState;
    
    console.log(`Event ${event}: tokens=${currentState.tokens}, output=${output}`);
  }
}

// ============================================================================
// 9. Type-Level Validation Examples
// ============================================================================

/**
 * Type-level validation that fusion is safe
 */
type ValidateMapFilterFusion = IsFusionSafe<
  MapCombinator<number, number>,
  FilterCombinator<number>
>; // Should be true

/**
 * Type-level validation that stateful fusion is unsafe
 */
type ValidateScanScanFusion = IsFusionSafe<
  ScanCombinator<number, number, number>,
  ScanCombinator<number, number, number>
>; // Should be false

/**
 * Type-level validation of dependent multiplicity
 */
type ValidateThrottleMultiplicity = DependentMultiplicity<
  TokenBucketState,
  'throttle'
>; // Should be 1 or 0 depending on tokens

// ============================================================================
// 10. Utility Functions
// ============================================================================

/**
 * Multiplies two multiplicities
 */
function multiplyMultiplicities(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (a === INFINITE || b === INFINITE) {
    return INFINITE;
  }
  return finite((a as number) * (b as number));
}

/**
 * Checks if fusion preserves multiplicity
 */
function preservesMultiplicity(
  a: Multiplicity, 
  b: Multiplicity, 
  fused: Multiplicity
): boolean {
  if (b === INFINITE) {
    return true; // Can't increase infinity
  }
  if (fused === INFINITE) {
    return false; // Can't increase to infinity
  }
  return (fused as number) <= (b as number);
}

// ============================================================================
// 11. Export and Run Examples
// ============================================================================

export {
  // Types
  Multiplicity,
  FiniteMultiplicity,
  InfiniteMultiplicity,
  StreamCombinator,
  MapCombinator,
  FilterCombinator,
  ScanCombinator,
  SharedState,
  TokenBucketState,
  StatefulStream,
  ThrottleStream,
  DependentStream,
  
  // Functions
  finite,
  INFINITE,
  createMap,
  createFilter,
  createScan,
  createThrottle,
  fuseCombinators,
  multiplyMultiplicities,
  preservesMultiplicity,
  
  // Examples
  demonstrateSafeFusion,
  demonstrateSharedState
};

// Run examples if this file is executed directly
if (require.main === module) {
  demonstrateSafeFusion();
  demonstrateSharedState();
}
