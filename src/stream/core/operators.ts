/**
 * Essential Operators for StatefulStream
 * 
 * This module implements the core composition operators for StatefulStream:
 * - compose: Sequential composition
 * - parallel: Parallel composition
 * - fmap: Functor mapping
 * - liftStateless: Convert pure functions to stateful streams
 * - Fusion helpers for optimizing pure operator composition
 */

import {
  StateFn, StatefulStream, StateMonoid, PureOp, EvalOp,
  isStatefulStream, isPureStream
} from './types';

import {
  EffectTag, Pure, State
} from '../../../fp-purity';

// ============================================================================
// Core Composition Operators
// ============================================================================

/**
 * Compose two StatefulStreams sequentially
 * The output of the first becomes the input of the second
 */
export function compose<S, A, B, C>(
  f: StatefulStream<A, S, B>,
  g: StatefulStream<B, S, C>
): StatefulStream<A, S, C> {
  return {
    run: (input) => (state) => {
      const [s1, b] = f.run(input)(state);
      return g.run(b)(s1);
    },
    __brand: 'StatefulStream',
    __purity: f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  };
}

/**
 * Compose two StatefulStreams in parallel
 * Both streams run on their respective inputs and outputs are paired
 */
export function parallel<S, A, B, C, D>(
  f: StatefulStream<A, S, B>,
  g: StatefulStream<C, S, D>
): StatefulStream<[A, C], S, [B, D]> {
  return {
    run: ([a, c]) => (state) => {
      const [s1, b] = f.run(a)(state);
      const [s2, d] = g.run(c)(s1);
      return [s2, [b, d]];
    },
    __brand: 'StatefulStream',
    __purity: f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  };
}

/**
 * Functor mapping - apply a function to the output
 */
export function fmap<I, S, A, B>(
  f: StatefulStream<I, S, A>,
  g: (a: A) => B
): StatefulStream<I, S, B> {
  return {
    run: (input) => (state) => {
      const [s2, a] = f.run(input)(state);
      return [s2, g(a)];
    },
    __brand: 'StatefulStream',
    __purity: f.__purity === 'Pure' ? 'Pure' : 'State'
  };
}

// ============================================================================
// Lifting Operators
// ============================================================================

/**
 * Lift a pure function into a StatefulStream
 * The resulting stream is stateless and pure
 */
export function liftStateless<I, O, S = unknown>(
  f: PureOp<I, O>
): StatefulStream<I, S, O> {
  return {
    run: (input) => (state) => [state, f(input)],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Lift a stateful function into a StatefulStream
 */
export function liftStateful<I, S, O>(
  f: EvalOp<I, S, O>
): StatefulStream<I, S, O> {
  return {
    run: (input) => (state) => f(input, state),
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

/**
 * Identity stream that passes through input unchanged
 */
export function identity<I, S>(): StatefulStream<I, S, I> {
  return {
    run: (input) => (state) => [state, input],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Constant stream that always outputs the same value
 */
export function constant<I, S, O>(value: O): StatefulStream<I, S, O> {
  return {
    run: () => (state) => [state, value],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

// ============================================================================
// Fusion Helpers
// ============================================================================

/**
 * Check if two streams can be fused (both pure)
 */
export function canFuse(
  f: StatefulStream<any, any, any>,
  g: StatefulStream<any, any, any>
): boolean {
  return isPureStream(f) && isPureStream(g);
}

/**
 * Fuse two pure streams without altering state semantics
 * This is an optimization that combines pure operations
 */
export function fusePure<I, A, B, C>(
  f: StatefulStream<I, any, A>,
  g: StatefulStream<A, any, B>,
  h: StatefulStream<B, any, C>
): StatefulStream<I, any, C> {
  if (canFuse(f, g) && canFuse(g, h)) {
    // Optimized fusion: combine all pure operations
    return {
      run: (input) => (state) => {
        const a = f.run(input)(state)[1];
        const b = g.run(a)(state)[1];
        const c = h.run(b)(state)[1];
        return [state, c];
      },
      __brand: 'StatefulStream',
      __purity: 'Pure'
    };
  }
  
  // Fall back to normal composition - use any to avoid complex type inference
  const composed = compose(f, g) as any;
  return compose(composed, h) as StatefulStream<I, any, C>;
}

/**
 * Fuse multiple pure streams in sequence
 */
export function fusePureSequence<I, O>(
  streams: StatefulStream<any, any, any>[]
): StatefulStream<I, any, O> {
  if (streams.length === 0) {
    return identity() as unknown as StatefulStream<I, any, O>;
  }
  
  if (streams.length === 1) {
    return streams[0] as StatefulStream<I, any, O>;
  }
  
  // Check if all streams are pure
  const allPure = streams.every(isPureStream);
  
  if (allPure) {
    // Optimized fusion
    return {
      run: (input) => (state) => {
        let currentInput: any = input;
        for (const stream of streams) {
          currentInput = stream.run(currentInput)(state)[1];
        }
        return [state, currentInput];
      },
      __brand: 'StatefulStream',
      __purity: 'Pure'
    };
  }
  
  // Fall back to normal composition
  return streams.reduce((acc, stream) => compose(acc, stream)) as StatefulStream<I, any, O>;
}

// ============================================================================
// Utility Operators
// ============================================================================

/**
 * Fan-out: duplicate input to multiple streams
 */
export function fanOut<S, A, B, C>(
  f: StatefulStream<A, S, B>,
  g: StatefulStream<A, S, C>
): StatefulStream<A, S, [B, C]> {
  return {
    run: (input) => (state) => {
      const [s1, b] = f.run(input)(state);
      const [s2, c] = g.run(input)(s1);
      return [s2, [b, c]];
    },
    __brand: 'StatefulStream',
    __purity: f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  };
}

/**
 * Fan-in: combine multiple streams into one
 */
export function fanIn<S, A, B, C>(
  f: StatefulStream<A, S, C>,
  g: StatefulStream<B, S, C>,
  combine: (a: A, b: B) => C
): StatefulStream<[A, B], S, C> {
  return {
    run: ([a, b]) => (state) => {
      const [s1, c1] = f.run(a)(state);
      const [s2, c2] = g.run(b)(s1);
      return [s2, combine(c1, c2)];
    },
    __brand: 'StatefulStream',
    __purity: f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  };
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

/**
 * Degenerate stateless form (S = void)
 * Converts a pure function into a stateless StateFn
 */
export function stateless<A, B>(f: (a: A) => B): StateFn<void, B> {
  return () => [undefined, f(undefined as any)];
} 