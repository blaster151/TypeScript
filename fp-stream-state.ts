/**
 * Stream Programs Are Monoid Homomorphisms with State
 * 
 * This module implements StateFn and StatefulStream as per the paper,
 * integrating with our purity system, HKT/typeclasses, and optics.
 * 
 * Core concepts:
 * - StateFn<S, N>: State transformer function
 * - StatefulStream<I, S, O>: Stateful stream with input I, state S, output O
 * - Monoid homomorphism for composition
 * - Purity tracking for optimization
 * - HKT integration for typeclass instances
 * - Optics integration for state focusing
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Profunctor,
  deriveFunctor, deriveApplicative, deriveMonad
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async, State,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

import {
  Lens, Prism, Optional, Traversal,
  lens, prism, optional, traversal
} from './fp-optics-core';

// Import ObservableLite for conversions
import { ObservableLite } from './fp-observable-lite';

// Import fluent API
import { applyFluentOps, FluentImpl } from './fp-fluent-api';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Core state transformer type from the paper
 * StateFn<S, N> represents a function that takes a state S and returns
 * a new state S and a value N
 */
export type StateFn<S, N> = (state: S) => [S, N];

/**
 * State monoid interface for composition
 * Provides empty (identity) and concat (composition) operations
 */
export interface StateMonoid<S, N> {
  empty: StateFn<S, N>;
  concat: (a: StateFn<S, N>, b: StateFn<S, N>) => StateFn<S, N>;
}

/**
 * Degenerate stateless form (S = void)
 * Converts a pure function into a stateless StateFn
 */
export function stateless<A, B>(f: (a: A) => B): StateFn<void, B> {
  return () => [undefined, f(undefined as any)];
}

/**
 * Create a state monoid for a given type
 */
export function createStateMonoid<S, N>(
  emptyValue: N,
  concatFn: (a: N, b: N) => N
): StateMonoid<S, N> {
  return {
    empty: () => [undefined as any, emptyValue],
    concat: (a, b) => (state) => {
      const [s1, n1] = a(state);
      const [s2, n2] = b(s1);
      return [s2, concatFn(n1, n2)];
    }
  };
}

// ============================================================================
// StatefulStream Wrapper
// ============================================================================

/**
 * HKT for StatefulStream
 */
export interface StatefulStreamK extends Kind3 {
  readonly type: StatefulStream<this['A'], this['B'], this['C']>;
}

/**
 * StatefulStream wrapper with HKT integration
 * I: Input type
 * S: State type  
 * O: Output type
 */
export interface StatefulStream<I, S, O> {
  readonly run: (input: I) => StateFn<S, O>;
  readonly __brand: 'StatefulStream';
  readonly __purity: EffectTag;

  /**
   * Convert StatefulStream to ObservableLite
   * This enables FP pipelines to move from stateful monoid-homomorphic streams to reactive push streams
   */
  toObservableLite(inputs: Iterable<I>, initialState?: S): ObservableLite<O>;
  
  /**
   * Convert StatefulStream to ObservableLite with async execution
   */
  toObservableLiteAsync(inputs: AsyncIterable<I>, initialState?: S): ObservableLite<O>;
  
  /**
   * Convert StatefulStream to ObservableLite with event-driven execution
   */
  toObservableLiteEvent(initialState?: S): ObservableLite<O>;
}

/**
 * Create a StatefulStream from a run function
 */
export function createStatefulStream<I, S, O>(
  run: (input: I) => StateFn<S, O>,
  purity: EffectTag = 'State'
): StatefulStream<I, S, O> {
  return {
    run,
    __brand: 'StatefulStream',
    __purity: purity,
    toObservableLite: (inputs, initialState) => new ObservableLite(run, inputs, initialState),
    toObservableLiteAsync: (inputs, initialState) => new ObservableLite(run, inputs, initialState),
    toObservableLiteEvent: (initialState) => new ObservableLite(run, undefined, initialState)
  } as StatefulStream<I, S, O>;
}

/**
 * Lift a pure function into a StatefulStream
 * The resulting stream is stateless and pure
 */
export function liftStateless<I, O, S = unknown>(
  f: (input: I) => O
): StatefulStream<I, S, O> {
  return createStatefulStream(
    (input) => (state) => [state, f(input)],
    'Pure'
  );
}

/**
 * Create a stateful stream that modifies state
 */
export function liftStateful<I, S, O>(
  f: (input: I, state: S) => [S, O]
): StatefulStream<I, S, O> {
  return createStatefulStream(
    (input) => (state) => f(input, state),
    'State'
  );
}

/**
 * Identity stream that passes through input unchanged
 */
export function identity<I, S>(): StatefulStream<I, S, I> {
  return createStatefulStream(
    (input) => (state) => [state, input],
    'Pure'
  );
}

/**
 * Constant stream that always outputs the same value
 */
export function constant<I, S, O>(value: O): StatefulStream<I, S, O> {
  return createStatefulStream(
    () => (state) => [state, value],
    'Pure'
  );
}

// ============================================================================
// Composition Operators
// ============================================================================

/**
 * Compose two StatefulStreams sequentially
 * The output of the first becomes the input of the second
 */
export function compose<S, A, B, C>(
  f: StatefulStream<A, S, B>,
  g: StatefulStream<B, S, C>
): StatefulStream<A, S, C> {
  return createStatefulStream(
    (input) => (state) => {
      const [s1, b] = f.run(input)(state);
      return g.run(b)(s1);
    },
    f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  );
}

/**
 * Compose two StatefulStreams in parallel
 * Both streams run on their respective inputs and outputs are paired
 */
export function parallel<S, A, B, C, D>(
  f: StatefulStream<A, S, B>,
  g: StatefulStream<C, S, D>
): StatefulStream<[A, C], S, [B, D]> {
  return createStatefulStream(
    ([a, c]) => (state) => {
      const [s1, b] = f.run(a)(state);
      const [s2, d] = g.run(c)(s1);
      return [s2, [b, d]];
    },
    f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  );
}

/**
 * Fan-out: duplicate input to multiple streams
 */
export function fanOut<S, A, B, C>(
  f: StatefulStream<A, S, B>,
  g: StatefulStream<A, S, C>
): StatefulStream<A, S, [B, C]> {
  return createStatefulStream(
    (input) => (state) => {
      const [s1, b] = f.run(input)(state);
      const [s2, c] = g.run(input)(s1);
      return [s2, [b, c]];
    },
    f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  );
}

/**
 * Fan-in: combine multiple streams into one
 */
export function fanIn<S, A, B, C>(
  f: StatefulStream<A, S, C>,
  g: StatefulStream<B, S, C>,
  combine: (a: A, b: B) => C
): StatefulStream<[A, B], S, C> {
  return createStatefulStream(
    ([a, b]) => (state) => {
      const [s1, c1] = f.run(a)(state);
      const [s2, c2] = g.run(b)(s1);
      return [s2, combine(c1, c2)];
    },
    f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  );
}

// ============================================================================
// Typeclass Instances
// ============================================================================

/**
 * Functor instance for StatefulStream
 */
export const StatefulStreamFunctor: Functor<StatefulStreamK> = {
  map: <I, S, A, B>(
    fa: StatefulStream<I, S, A>,
    f: (a: A) => B
  ): StatefulStream<I, S, B> => {
    return createStatefulStream(
      (input) => (state) => {
        const [s2, a] = fa.run(input)(state);
        return [s2, f(a)];
      },
      fa.__purity === 'Pure' ? 'Pure' : 'State'
    );
  }
};

/**
 * Applicative instance for StatefulStream
 */
export const StatefulStreamApplicative: Applicative<StatefulStreamK> = {
  ...StatefulStreamFunctor,
  of: <I, S, A>(a: A): StatefulStream<I, S, A> => {
    return createStatefulStream(
      () => (state) => [state, a],
      'Pure'
    );
  },
  ap: <I, S, A, B>(
    ff: StatefulStream<I, S, (a: A) => B>,
    fa: StatefulStream<I, S, A>
  ): StatefulStream<I, S, B> => {
    return createStatefulStream(
      (input) => (state) => {
        const [s1, f] = ff.run(input)(state);
        const [s2, a] = fa.run(input)(s1);
        return [s2, f(a)];
      },
      ff.__purity === 'Pure' && fa.__purity === 'Pure' ? 'Pure' : 'State'
    );
  }
};

/**
 * Monad instance for StatefulStream
 */
export const StatefulStreamMonad: Monad<StatefulStreamK> = {
  ...StatefulStreamApplicative,
  chain: <I, S, A, B>(
    fa: StatefulStream<I, S, A>,
    f: (a: A) => StatefulStream<I, S, B>
  ): StatefulStream<I, S, B> => {
    return createStatefulStream(
      (input) => (state) => {
        const [s2, a] = fa.run(input)(state);
        return f(a).run(input)(s2);
      },
      'State' // Always stateful due to chaining
    );
  }
};

/**
 * Profunctor instance for StatefulStream
 * dimap allows transforming both input and output
 */
export const StatefulStreamProfunctor: Profunctor<StatefulStreamK> = {
  dimap: <I, O, I2, O2, S>(
    p: StatefulStream<I, S, O>,
    f: (i2: I2) => I,
    g: (o: O) => O2
  ): StatefulStream<I2, S, O2> => {
    return createStatefulStream(
      (input2) => (state) => {
        const [s2, o] = p.run(f(input2))(state);
        return [s2, g(o)];
      },
      p.__purity
    );
  },
  lmap: <I, O, I2, S>(
    p: StatefulStream<I, S, O>,
    f: (i2: I2) => I
  ): StatefulStream<I2, S, O> => {
    return createStatefulStream(
      (input2) => (state) => p.run(f(input2))(state),
      p.__purity
    );
  },
  rmap: <I, O, O2, S>(
    p: StatefulStream<I, S, O>,
    g: (o: O) => O2
  ): StatefulStream<I, S, O2> => {
    return createStatefulStream(
      (input) => (state) => {
        const [s2, o] = p.run(input)(state);
        return [s2, g(o)];
      },
      p.__purity
    );
  }
};

// ============================================================================
// Purity Integration
// ============================================================================

/**
 * Register StatefulStream typeclass instances with purity system
 */
export function registerStatefulStreamPurity(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    // Register with purity tags
    registry.register('StatefulStreamFunctor', StatefulStreamFunctor, 'Pure');
    registry.register('StatefulStreamApplicative', StatefulStreamApplicative, 'Pure');
    registry.register('StatefulStreamMonad', StatefulStreamMonad, 'State');
    registry.register('StatefulStreamProfunctor', StatefulStreamProfunctor, 'State');
  }
}

// ============================================================================
// Optics Integration
// ============================================================================

/**
 * Focus on a specific part of the state using optics
 */
export function focusState<S, N, F>(
  optic: Lens<S, S, F, F> | Prism<S, S, F, F> | Optional<S, S, F, F>
): <I, O>(sf: StatefulStream<I, F, O>) => StatefulStream<I, S, O> {
  return (sf) => createStatefulStream(
    (input) => (state) => {
      // Extract focused state
      const focusedState = 'get' in optic ? optic.get(state) : 
                          'preview' in optic ? optic.preview(state) : 
                          state;
      
      // Run stream on focused state
      const [focusedState2, output] = sf.run(input)(focusedState as any);
      
      // Update original state with focused state
      const newState = 'set' in optic ? optic.set(focusedState2, state) :
                      'review' in optic ? optic.review(focusedState2) :
                      state;
      
      return [newState, output];
    },
    'State' // Always stateful when using optics
  );
}

/**
 * Focus on the output using optics
 */
export function focusOutput<O, F>(
  optic: Lens<O, O, F, F> | Prism<O, O, F, F> | Optional<O, O, F, F>
): <I, S>(sf: StatefulStream<I, S, O>) => StatefulStream<I, S, F> {
  return (sf) => createStatefulStream(
    (input) => (state) => {
      const [s2, output] = sf.run(input)(state);
      
      // Extract focused output
      const focusedOutput = 'get' in optic ? optic.get(output) :
                           'preview' in optic ? optic.preview(output) :
                           output;
      
      return [s2, focusedOutput as any];
    },
    sf.__purity
  );
}

/**
 * Create a lens for focusing on state
 */
export function stateLens<S, F>(getter: (s: S) => F, setter: (f: F, s: S) => S): Lens<S, S, F, F> {
  return lens(getter, setter);
}

/**
 * Create a lens for focusing on output
 */
export function outputLens<O, F>(getter: (o: O) => F, setter: (f: F, o: O) => O): Lens<O, O, F, F> {
  return lens(getter, setter);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run a StatefulStream with initial state and input
 */
export function runStatefulStream<I, S, O>(
  stream: StatefulStream<I, S, O>,
  input: I,
  initialState: S
): [S, O] {
  return stream.run(input)(initialState);
}

/**
 * Run a StatefulStream multiple times with a list of inputs
 */
export function runStatefulStreamList<I, S, O>(
  stream: StatefulStream<I, S, O>,
  inputs: I[],
  initialState: S
): [S, O[]] {
  let state = initialState;
  const outputs: O[] = [];
  
  for (const input of inputs) {
    const [newState, output] = stream.run(input)(state);
    state = newState;
    outputs.push(output);
  }
  
  return [state, outputs];
}

/**
 * Create a StatefulStream that accumulates state
 */
export function scan<I, S, O>(
  initial: S,
  f: (acc: S, input: I) => [S, O]
): StatefulStream<I, S, O> {
  return createStatefulStream(
    (input) => (state) => f(state, input),
    'State'
  );
}

/**
 * Create a StatefulStream that filters inputs
 */
export function filter<I, S>(
  predicate: (input: I) => boolean
): StatefulStream<I, S, I> {
  return createStatefulStream(
    (input) => (state) => {
      if (predicate(input)) {
        return [state, input];
      } else {
        return [state, undefined as any];
      }
    },
    'Pure'
  );
}

/**
 * Create a StatefulStream that maps and filters
 */
export function filterMap<I, S, O>(
  f: (input: I) => O | undefined
): StatefulStream<I, S, O> {
  return createStatefulStream(
    (input) => (state) => {
      const result = f(input);
      if (result !== undefined) {
        return [state, result];
      } else {
        return [state, undefined as any];
      }
    },
    'Pure'
  );
}

// ============================================================================
// Type Aliases and Exports
// ============================================================================

/**
 * Type alias for StatefulStream with void state (stateless)
 */
export type StatelessStream<I, O> = StatefulStream<I, void, O>;

/**
 * Type alias for StatefulStream with void input (constant)
 */
export type ConstantStream<S, O> = StatefulStream<void, S, O>;

/**
 * Type alias for StatefulStream with void input and state (pure function)
 */
export type PureStream<O> = StatefulStream<void, void, O>;

// Export all typeclass instances
export {
  StatefulStreamFunctor as Functor,
  StatefulStreamApplicative as Applicative,
  StatefulStreamMonad as Monad,
  StatefulStreamProfunctor as Profunctor
}; 

// ============================================================================
// Part 15: Unified Fluent API Integration
// ============================================================================

/**
 * Apply unified fluent API to StatefulStream
 */
const StatefulStreamFluentImpl: FluentImpl<any> = {
  map: (self, f) => self.map(f),
  chain: (self, f) => self.flatMap(f),
  flatMap: (self, f) => self.flatMap(f),
  filter: (self, pred) => self.filter(pred),
  filterMap: (self, f) => self.filterMap(f),
  scan: (self, reducer, seed) => self.scan(reducer, seed),
  take: (self, n) => self.take(n),
  skip: (self, n) => self.skip(n),
  distinct: (self) => self.distinct(),
  drop: (self, n) => self.drop(n),
  slice: (self, start, end) => self.slice(start, end),
  reverse: (self) => self.reverse(),
  sortBy: (self, fn) => self.sortBy(fn),
  pipe: (self, ...fns) => self.pipe(...fns)
};

// Apply fluent API to StatefulStream prototype
applyFluentOps(StatefulStream.prototype, StatefulStreamFluentImpl);

// Add conversion methods
StatefulStream.prototype.toObservableLite = function(inputs: Iterable<any> = [], initialState: any = {}) {
  return toObservableLite(this, inputs, initialState);
};

StatefulStream.prototype.toMaybe = function() {
  return toMaybe(this);
};

StatefulStream.prototype.toEither = function() {
  return toEither(this);
};

StatefulStream.prototype.toResult = function() {
  return toResult(this);
}; 