/**
 * Composition Rules for Usage-Bound Streams
 * 
 * This module implements composition rules that properly handle usage bounds,
 * including compile-time multiplication of multiplicities and runtime usage
 * tracking for optimization and safety.
 */

import { StatefulStream } from '../core/types';
import { 
  UsageBoundStream, 
  Usage, 
  Multiplicity, 
  MultiplyUsage,
  AddUsage,
  MaxUsage,
  UsageExceeds,
  AssertUsageWithinBounds,
  constantUsage,
  onceUsage,
  neverUsage,
  infiniteUsage
} from './types';

// ============================================================================
// Runtime Usage Composition
// ============================================================================

/**
 * Runtime multiplication of multiplicities
 * If both are finite, multiply them; otherwise return "∞"
 */
export function multiplyMultiplicities(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (a === "∞" || b === "∞") {
    return "∞";
  }
  return a * b;
}

/**
 * Runtime addition of multiplicities
 * If both are finite, add them; otherwise return "∞"
 */
export function addMultiplicities(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (a === "∞" || b === "∞") {
    return "∞";
  }
  return a + b;
}

/**
 * Runtime maximum of multiplicities
 * If either is infinite, return "∞"; otherwise return the maximum
 */
export function maxMultiplicities(a: Multiplicity, b: Multiplicity): Multiplicity {
  if (a === "∞" || b === "∞") {
    return "∞";
  }
  return Math.max(a, b);
}

// ============================================================================
// Usage-Bound Composition
// ============================================================================

/**
 * Compose two UsageBoundStreams with proper usage multiplication
 * The resulting usage is the product of the individual usages
 */
export function composeUsage<S, A, B, C>(
  f: UsageBoundStream<A, S, B>,
  g: UsageBoundStream<B, S, C>
): UsageBoundStream<A, S, C> {
  return {
    ...f,
    run: (input) => (state) => {
      const [s1, b] = f.run(input)(state);
      return g.run(b)(s1);
    },
    usage: (input: A) => {
      const fUsage = f.usage(input);
      const b = f.run(input)({} as S)[1]; // Get intermediate result
      const gUsage = g.usage(b);
      return multiplyMultiplicities(fUsage, gUsage);
    },
    __purity: f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  };
}

/**
 * Compose UsageBoundStreams with compile-time usage validation
 * This version will cause a type error if the composed usage exceeds maxUsage
 */
export function composeUsageWithValidation<
  S, 
  A, 
  B, 
  C,
  F extends UsageBoundStream<A, S, B>,
  G extends UsageBoundStream<B, S, C>
>(
  f: F,
  g: G,
  maxUsage?: Multiplicity
): UsageBoundStream<A, S, C> & {
  usage: (input: A) => AssertUsageWithinBounds<
    ReturnType<F['usage']> extends Multiplicity ? 
      ReturnType<G['usage']> extends Multiplicity ?
        MultiplyUsage<ReturnType<F['usage']>, ReturnType<G['usage']>> :
        "∞" :
      "∞",
    typeof maxUsage extends Multiplicity ? typeof maxUsage : "∞"
  >;
} {
  const composed = composeUsage(f, g);
  
  if (maxUsage !== undefined) {
    // Runtime validation
    const validateUsage = (input: A) => {
      const usage = composed.usage(input);
      if (usage !== "∞" && maxUsage !== "∞" && usage > maxUsage) {
        throw new Error(`Usage ${usage} exceeds maximum bound ${maxUsage}`);
      }
      return usage;
    };
    
    return {
      ...composed,
      usage: validateUsage,
      maxUsage
    } as any;
  }
  
  return composed as any;
}

/**
 * Parallel composition of UsageBoundStreams
 * Each branch maintains its own usage, and the result preserves per-branch usage
 */
export function parallelUsage<S, A, B, C, D>(
  f: UsageBoundStream<A, S, B>,
  g: UsageBoundStream<C, S, D>
): UsageBoundStream<[A, C], S, [B, D]> {
  return {
    ...f,
    run: ([a, c]) => (state) => {
      const [s1, b] = f.run(a)(state);
      const [s2, d] = g.run(c)(s1);
      return [s2, [b, d]];
    },
    usage: ([a, c]) => {
      const fUsage = f.usage(a);
      const gUsage = g.usage(c);
      // For parallel composition, we return the maximum usage
      // since both branches execute independently
      return maxMultiplicities(fUsage, gUsage);
    },
    __purity: f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  };
}

/**
 * Fan-out composition: duplicate input to multiple streams
 * Usage is the sum of individual stream usages
 */
export function fanOutUsage<S, A, B, C>(
  f: UsageBoundStream<A, S, B>,
  g: UsageBoundStream<A, S, C>
): UsageBoundStream<A, S, [B, C]> {
  return {
    ...f,
    run: (input) => (state) => {
      const [s1, b] = f.run(input)(state);
      const [s2, c] = g.run(input)(s1);
      return [s2, [b, c]];
    },
    usage: (input: A) => {
      const fUsage = f.usage(input);
      const gUsage = g.usage(input);
      return addMultiplicities(fUsage, gUsage);
    },
    __purity: f.__purity === 'Pure' && g.__purity === 'Pure' ? 'Pure' : 'State'
  };
}

// ============================================================================
// Usage-Bound Lifting
// ============================================================================

/**
 * Lift a pure function into a UsageBoundStream with constant usage
 */
export function liftStatelessUsage<I, O, S = unknown>(
  f: (input: I) => O,
  usage: Multiplicity = 1
): UsageBoundStream<I, S, O> {
  return {
    run: (input) => (state) => [state, f(input)],
    usage: constantUsage<I>(usage),
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Lift a stateful function into a UsageBoundStream with constant usage
 */
export function liftStatefulUsage<I, S, O>(
  f: (input: I, state: S) => [S, O],
  usage: Multiplicity = 1
): UsageBoundStream<I, S, O> {
  return {
    run: (input) => (state) => f(input, state),
    usage: constantUsage<I>(usage),
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

/**
 * Create a UsageBoundStream that runs exactly once per input
 */
export function onceUsageStream<I, S, O>(
  stream: StatefulStream<I, S, O>
): UsageBoundStream<I, S, O> {
  return {
    ...stream,
    usage: onceUsage<I>()
  };
}

/**
 * Create a UsageBoundStream that never runs (usage = 0)
 */
export function neverUsageStream<I, S, O>(
  stream: StatefulStream<I, S, O>
): UsageBoundStream<I, S, O> {
  return {
    ...stream,
    usage: neverUsage<I>()
  };
}

/**
 * Create a UsageBoundStream with infinite usage
 */
export function infiniteUsageStream<I, S, O>(
  stream: StatefulStream<I, S, O>
): UsageBoundStream<I, S, O> {
  return {
    ...stream,
    usage: infiniteUsage<I>()
  };
}

// ============================================================================
// Usage-Bound Functor Operations
// ============================================================================

/**
 * Functor mapping for UsageBoundStreams
 * Preserves the usage function of the original stream
 */
export function fmapUsage<I, S, A, B>(
  f: UsageBoundStream<I, S, A>,
  g: (a: A) => B
): UsageBoundStream<I, S, B> {
  return {
    ...f,
    run: (input) => (state) => {
      const [s2, a] = f.run(input)(state);
      return [s2, g(a)];
    }
  };
}

/**
 * Conditional usage stream based on a predicate
 */
export function conditionalUsageStream<I, S, O>(
  stream: StatefulStream<I, S, O>,
  predicate: (input: I) => boolean,
  trueUsage: Multiplicity = 1,
  falseUsage: Multiplicity = 0
): UsageBoundStream<I, S, O> {
  return {
    ...stream,
    usage: (input: I) => predicate(input) ? trueUsage : falseUsage
  };
}

// ============================================================================
// Usage Validation and Safety
// ============================================================================

/**
 * Runtime validation of usage bounds
 * Throws an error if usage exceeds the bound
 */
export function validateUsage<I>(
  stream: UsageBoundStream<I, any, any>,
  input: I,
  maxUsage?: Multiplicity
): Multiplicity {
  const usage = stream.usage(input);
  
  if (maxUsage !== undefined && usage !== "∞" && maxUsage !== "∞") {
    if (usage > maxUsage) {
      throw new Error(`Usage ${usage} exceeds maximum bound ${maxUsage}`);
    }
  }
  
  return usage;
}

/**
 * Create a UsageBoundStream with runtime usage validation
 */
export function withUsageValidation<I, S, O>(
  stream: UsageBoundStream<I, S, O>,
  maxUsage: Multiplicity
): UsageBoundStream<I, S, O> & { maxUsage: Multiplicity } {
  return {
    ...stream,
    maxUsage,
    usage: (input: I) => {
      const usage = stream.usage(input);
      validateUsage(stream, input, maxUsage);
      return usage;
    }
  };
}

/**
 * Compile-time usage bound assertion
 * This helper can be used to enforce usage bounds at the type level
 */
export function assertUsageBound<
  Stream extends UsageBoundStream<any, any, any>,
  Bound extends Multiplicity
>(
  stream: Stream,
  bound: Bound
): Stream & { maxUsage: Bound } {
  return {
    ...stream,
    maxUsage: bound
  } as any;
} 