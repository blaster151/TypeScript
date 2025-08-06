/**
 * Optic Usage-Bound Integration System
 * 
 * This module extends all core optic interfaces with usage bounds and provides
 * composition rules for multiplicity tracking across optics and state-monoid streams.
 */

// Import types from the multiplicity system
type Usage<T> = (input: T) => Multiplicity;
type Multiplicity = number | "∞";

// Utility functions
function constantUsage<T>(multiplicity: Multiplicity): Usage<T> {
  return () => multiplicity;
}

function onceUsage<T>(): Usage<T> {
  return constantUsage<T>(1);
}

function infiniteUsage<T>(): Usage<T> {
  return constantUsage<T>("∞");
}

import { 
  UsageBound, 
  multiplyUsageBounds,
  minUsageBounds,
  getUsageBoundForType
} from './fluent-usage-wrapper';

import { 
  getUsageBound, 
  registerUsage 
} from './usageRegistry';

// ============================================================================
// Core Optic Types with Usage Bounds
// ============================================================================

/**
 * Base optic interface with usage bounds
 * All optics must implement this interface
 */
export interface BaseOptic<S, A, UB extends UsageBound<any>> {
  readonly usageBound: UB;
  
  // Core optic operations
  get(s: S): A;
  set(s: S, a: A): S;
  modify(s: S, f: (a: A) => A): S;
}

/**
 * Lens with usage bounds
 * Default usage = 1 (exactly once per focus)
 */
export interface Lens<S, A> extends BaseOptic<S, A, UsageBound<A>> {
  readonly __type: 'Lens';
}

/**
 * Prism with usage bounds
 * Default usage = 0 | 1 (depending on match success)
 */
export interface Prism<S, A> extends BaseOptic<S, A, UsageBound<A>> {
  readonly __type: 'Prism';
  readonly preview: (s: S) => A | undefined;
  readonly review: (a: A) => S;
}

/**
 * Traversal with usage bounds
 * Must declare upper bound (finite or "∞")
 */
export interface Traversal<S, A> extends BaseOptic<S, A, UsageBound<A>> {
  readonly __type: 'Traversal';
  readonly traverse: <F>(f: (a: A) => F) => (s: S) => F[];
  readonly upperBound: Multiplicity; // Required for traversals
}

/**
 * Getter with usage bounds
 * Read-only optic, usage = 1
 */
export interface Getter<S, A> extends BaseOptic<S, A, UsageBound<A>> {
  readonly __type: 'Getter';
  readonly view: (s: S) => A;
}

/**
 * Setter with usage bounds
 * Write-only optic, usage = 1
 */
export interface Setter<S, A> extends BaseOptic<S, A, UsageBound<A>> {
  readonly __type: 'Setter';
  readonly over: (s: S, f: (a: A) => A) => S;
}

// ============================================================================
// Optic Composition with Usage Propagation
// ============================================================================

/**
 * Compose two optics with usage bound multiplication
 * Sequential composition multiplies usage bounds
 */
export function composeOptic<S, A, B>(
  outer: BaseOptic<A, B, UsageBound<B>>,
  inner: BaseOptic<S, A, UsageBound<A>>
): BaseOptic<S, B, UsageBound<B>> {
  const composedUsageBound = multiplyUsageBounds(inner.usageBound, outer.usageBound);
  
  return {
    usageBound: composedUsageBound,
    get: (s: S) => outer.get(inner.get(s)),
    set: (s: S, b: B) => inner.set(s, outer.set(inner.get(s), b)),
    modify: (s: S, f: (b: B) => B) => inner.modify(s, a => outer.modify(a, f))
  };
}

/**
 * Combine two optics with usage bound addition
 * Parallel composition sums usage bounds
 */
export function combineOptic<S, A, B>(
  optic1: BaseOptic<S, A, UsageBound<A>>,
  optic2: BaseOptic<S, B, UsageBound<B>>
): BaseOptic<S, [A, B], UsageBound<[A, B]>> {
  const combinedUsageBound: UsageBound<[A, B]> = {
    usage: (input: [A, B]): Multiplicity => {
      const usage1 = optic1.usageBound.usage(input[0]);
      const usage2 = optic2.usageBound.usage(input[1]);
      
      if (usage1 === "∞" || usage2 === "∞") {
        return "∞";
      }
      return usage1 + usage2;
    },
    maxUsage: optic1.usageBound.maxUsage === "∞" || optic2.usageBound.maxUsage === "∞" ? "∞" :
              optic1.usageBound.maxUsage !== undefined && optic2.usageBound.maxUsage !== undefined ?
              optic1.usageBound.maxUsage + optic2.usageBound.maxUsage : undefined
  };
  
  return {
    usageBound: combinedUsageBound,
    get: (s: S) => [optic1.get(s), optic2.get(s)],
    set: (s: S, [a, b]: [A, B]) => optic2.set(optic1.set(s, a), b),
    modify: (s: S, f: ([a, b]: [A, B]) => [A, B]) => {
      const [a, b] = f([optic1.get(s), optic2.get(s)]);
      return optic2.modify(optic1.modify(s, () => a), () => b);
    }
  };
}

/**
 * Zip two optics with usage bound maximum
 * Zip composition takes maximum of usage bounds
 */
export function zipOptic<S, A, B>(
  optic1: BaseOptic<S, A, UsageBound<A>>,
  optic2: BaseOptic<S, B, UsageBound<B>>
): BaseOptic<S, [A, B], UsageBound<[A, B]>> {
  const zippedUsageBound: UsageBound<[A, B]> = {
    usage: (input: [A, B]): Multiplicity => {
      const usage1 = optic1.usageBound.usage(input[0]);
      const usage2 = optic2.usageBound.usage(input[1]);
      
      if (usage1 === "∞" || usage2 === "∞") {
        return "∞";
      }
      return Math.max(usage1, usage2);
    },
    maxUsage: optic1.usageBound.maxUsage === "∞" || optic2.usageBound.maxUsage === "∞" ? "∞" :
              optic1.usageBound.maxUsage !== undefined && optic2.usageBound.maxUsage !== undefined ?
              Math.max(optic1.usageBound.maxUsage, optic2.usageBound.maxUsage) : undefined
  };
  
  return {
    usageBound: zippedUsageBound,
    get: (s: S) => [optic1.get(s), optic2.get(s)],
    set: (s: S, [a, b]: [A, B]) => optic2.set(optic1.set(s, a), b),
    modify: (s: S, f: ([a, b]: [A, B]) => [A, B]) => {
      const [a, b] = f([optic1.get(s), optic2.get(s)]);
      return optic2.modify(optic1.modify(s, () => a), () => b);
    }
  };
}

// ============================================================================
// Optic Factory Functions with Usage Bounds
// ============================================================================

/**
 * Create a lens with usage bound from registry
 */
export function lens<S, A>(
  getter: (s: S) => A,
  setter: (s: S, a: A) => S
): Lens<S, A> {
  const usageBound = getUsageBoundForType<A>('Lens');
  
  return {
    __type: 'Lens',
    usageBound,
    get: getter,
    set: setter,
    modify: (s: S, f: (a: A) => A) => setter(s, f(getter(s)))
  };
}

/**
 * Create a prism with usage bound from registry
 */
export function prism<S, A>(
  preview: (s: S) => A | undefined,
  review: (a: A) => S
): Prism<S, A> {
  const usageBound = getUsageBoundForType<A>('Prism');
  
  return {
    __type: 'Prism',
    usageBound,
    preview,
    review,
    get: (s: S) => {
      const result = preview(s);
      if (result === undefined) {
        throw new Error('Prism preview failed');
      }
      return result;
    },
    set: (s: S, a: A) => review(a),
    modify: (s: S, f: (a: A) => A) => {
      const result = preview(s);
      if (result === undefined) {
        return s;
      }
      return review(f(result));
    }
  };
}

/**
 * Create a traversal with usage bound from registry
 */
export function traversal<S, A>(
  traverse: <F>(f: (a: A) => F) => (s: S) => F[],
  upperBound: Multiplicity = "∞"
): Traversal<S, A> {
  const usageBound = getUsageBoundForType<A>('Traversal');
  
  return {
    __type: 'Traversal',
    usageBound,
    traverse,
    upperBound,
    get: (s: S) => {
      const results = traverse((a: A) => a)(s);
      if (results.length === 0) {
        throw new Error('Traversal returned no results');
      }
      return results[0];
    },
    set: (s: S, a: A) => {
      // Simplified implementation - in practice would need more sophisticated handling
      return s;
    },
    modify: (s: S, f: (a: A) => A) => {
      // Simplified implementation - in practice would need more sophisticated handling
      return s;
    }
  };
}

/**
 * Create a getter with usage bound from registry
 */
export function getter<S, A>(view: (s: S) => A): Getter<S, A> {
  const usageBound = getUsageBoundForType<A>('Getter');
  
  return {
    __type: 'Getter',
    usageBound,
    view,
    get: view,
    set: (s: S, a: A) => s, // Read-only
    modify: (s: S, f: (a: A) => A) => s // Read-only
  };
}

/**
 * Create a setter with usage bound from registry
 */
export function setter<S, A>(over: (s: S, f: (a: A) => A) => S): Setter<S, A> {
  const usageBound = getUsageBoundForType<A>('Setter');
  
  return {
    __type: 'Setter',
    usageBound,
    over,
    get: (s: S) => {
      throw new Error('Setter is write-only');
    },
    set: (s: S, a: A) => over(s, () => a),
    modify: over
  };
}

// ============================================================================
// State-Monoid Stream Integration
// ============================================================================

/**
 * State function type
 */
export type StateFn<S, O> = (state: S) => [S, O];

/**
 * StatefulStream with usage bounds
 */
export interface StatefulStream<I, S, O, UB extends UsageBound<any>> {
  run: (input: I) => StateFn<S, O>;
  usageBound: UB;
}

/**
 * Lift an optic into a state-monoid stream
 * The bound is carried into the stream's bound
 */
export function mapOptic<S, O, UB extends UsageBound<any>>(
  optic: BaseOptic<S, O, UB>
): StatefulStream<S, S, O, UB> {
  return {
    run: (input: S) => (state: S) => {
      const result = optic.get(input);
      return [state, result];
    },
    usageBound: optic.usageBound
  };
}

/**
 * Extract an optic from a state-monoid stream
 * Usage bounds are preserved
 */
export function extractOptic<I, S, O, UB extends UsageBound<any>>(
  stream: StatefulStream<I, S, O, UB>,
  initialState: S
): BaseOptic<I, O, UB> {
  return {
    usageBound: stream.usageBound,
    get: (input: I) => {
      const [_, output] = stream.run(input)(initialState);
      return output;
    },
    set: (input: I, output: O) => {
      // Simplified implementation - in practice would need more sophisticated handling
      return input;
    },
    modify: (input: I, f: (output: O) => O) => {
      const [_, currentOutput] = stream.run(input)(initialState);
      const newOutput = f(currentOutput);
      // Simplified implementation - in practice would need more sophisticated handling
      return input;
    }
  };
}

// ============================================================================
// Stream Composition with Usage Propagation
// ============================================================================

/**
 * Compose two streams with usage bound multiplication
 * Sequential composition multiplies usage bounds
 */
export function composeStream<I, S, A, B>(
  outer: StatefulStream<A, S, B, UsageBound<B>>,
  inner: StatefulStream<I, S, A, UsageBound<A>>
): StatefulStream<I, S, B, UsageBound<B>> {
  const composedUsageBound = multiplyUsageBounds(inner.usageBound, outer.usageBound);
  
  return {
    run: (input: I) => (state: S) => {
      const [state1, a] = inner.run(input)(state);
      return outer.run(a)(state1);
    },
    usageBound: composedUsageBound
  };
}

/**
 * Parallel compose two streams with usage bound addition
 * Parallel composition sums usage bounds
 */
export function parallelStream<I, S, A, B>(
  stream1: StatefulStream<I, S, A, UsageBound<A>>,
  stream2: StatefulStream<I, S, B, UsageBound<B>>
): StatefulStream<I, S, [A, B], UsageBound<[A, B]>> {
  const parallelUsageBound: UsageBound<[A, B]> = {
    usage: (input: [A, B]): Multiplicity => {
      const usage1 = stream1.usageBound.usage(input[0]);
      const usage2 = stream2.usageBound.usage(input[1]);
      
      if (usage1 === "∞" || usage2 === "∞") {
        return "∞";
      }
      return usage1 + usage2;
    },
    maxUsage: stream1.usageBound.maxUsage === "∞" || stream2.usageBound.maxUsage === "∞" ? "∞" :
              stream1.usageBound.maxUsage !== undefined && stream2.usageBound.maxUsage !== undefined ?
              stream1.usageBound.maxUsage + stream2.usageBound.maxUsage : undefined
  };
  
  return {
    run: (input: I) => (state: S) => {
      const [state1, a] = stream1.run(input)(state);
      const [state2, b] = stream2.run(input)(state1);
      return [state2, [a, b]];
    },
    usageBound: parallelUsageBound
  };
}

/**
 * Feedback loop with usage bound handling
 * Feedback loops require special handling: bound = "∞" unless proven otherwise
 */
export function feedbackStream<I, S, O>(
  stream: StatefulStream<[I, O], S, O, UsageBound<O>>,
  initialOutput: O
): StatefulStream<I, S, O, UsageBound<O>> {
  const feedbackUsageBound: UsageBound<O> = {
    usage: () => "∞", // Feedback loops are typically infinite
    maxUsage: "∞"
  };
  
  return {
    run: (input: I) => (state: S) => {
      // Simplified feedback implementation
      const [newState, output] = stream.run([input, initialOutput])(state);
      return [newState, output];
    },
    usageBound: feedbackUsageBound
  };
}

// ============================================================================
// Registry Integration
// ============================================================================

/**
 * Register default usage bounds for optic types
 */
export function registerOpticUsageBounds(): void {
  // Register default usage bounds for optic types
  registerUsage('Lens', onceUsage<any>());
  registerUsage('Prism', (input: any) => 1); // Simplified - in practice would check match
  registerUsage('Traversal', (input: any) => {
    if (Array.isArray(input)) {
      return input.length;
    }
    return 1;
  });
  registerUsage('Getter', onceUsage<any>());
  registerUsage('Setter', onceUsage<any>());
  
  console.log('✅ Registered default usage bounds for optic types');
}

/**
 * Register default usage bounds for stream operator types
 */
export function registerStreamUsageBounds(): void {
  // Register default usage bounds for stream operators
  registerUsage('map', onceUsage<any>());
  registerUsage('filter', onceUsage<any>());
  registerUsage('scan', onceUsage<any>());
  registerUsage('merge', (input: any) => {
    if (Array.isArray(input)) {
      return input.length;
    }
    return 1;
  });
  registerUsage('feedback', infiniteUsage<any>());
  
  console.log('✅ Registered default usage bounds for stream operators');
}

// ============================================================================
// Compile-Time Enforcement
// ============================================================================

/**
 * Type-level check if optic usage exceeds a bound
 */
export type OpticUsageExceeds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  Bound extends "∞" ? false :
  Usage extends "∞" ? true :
  Usage extends number ? 
    Bound extends number ? 
      Usage extends Bound ? false : true :
    never :
  never;

/**
 * Assert that optic usage is within bounds at compile time
 */
export type AssertOpticWithinBound<Usage extends Multiplicity, Bound extends Multiplicity> = 
  OpticUsageExceeds<Usage, Bound> extends true ? 
    never : // Compile error
    Usage;

/**
 * Type-level enforcement for optic composition
 */
export type SafeOpticComposition<
  Optic1 extends BaseOptic<any, any, UsageBound<any>>,
  Optic2 extends BaseOptic<any, any, UsageBound<any>>,
  MaxBound extends Multiplicity
> = AssertOpticWithinBound<"∞", MaxBound>; // Simplified for now

// Helper types for type-level usage extraction
type ExtractUsage<Optic extends BaseOptic<any, any, UsageBound<any>>> = 
  Optic['usageBound']['usage'];

// Simplified type-level multiplication for compile-time enforcement
type MultiplyUsage<A, B> = 
  A extends "∞" ? "∞" :
  B extends "∞" ? "∞" :
  A extends number ? 
    B extends number ? 
      A extends 0 ? 0 :
      B extends 0 ? 0 :
      A extends 1 ? B :
      B extends 1 ? A :
      "∞" : // For complex multiplications, use "∞" for safety
    never :
  never;

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-register usage bounds when this module is imported
registerOpticUsageBounds();
registerStreamUsageBounds(); 