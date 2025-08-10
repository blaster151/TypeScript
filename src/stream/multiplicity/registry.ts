/**
 * Registry Integration for UsageBoundStream
 * 
 * This module registers UsageBoundStream in the typeclass registry and
 * provides auto-derivation of Functor/Applicative/Monad instances with
 * proper usage composition.
 */

import { 
  UsageBoundStream, 
  Multiplicity,
  constantUsage,
  onceUsage
} from './types';

import {
  composeUsage,
  fmapUsage,
  liftStatelessUsage,
  liftStatefulUsage,
  fanOutUsage
} from './composition';

import { Kind3 } from '../../../fp-hkt';

// ============================================================================
// HKT for UsageBoundStream
// ============================================================================

/**
 * HKT for UsageBoundStream
 * Extends the existing StatefulStreamK with usage information
 */
export interface UsageBoundStreamK extends Kind3 {
  readonly type: UsageBoundStream<this['arg0'], this['arg1'], this['arg2']>;
  readonly usage: (input: this['arg0']) => Multiplicity;
}

// ============================================================================
// Typeclass Instances
// ============================================================================

/**
 * Functor instance for UsageBoundStream
 * Preserves the usage function of the original stream
 */
export const UsageBoundStreamFunctor: Functor<UsageBoundStreamK> = {
  map: <I, S, A, B>(
    fa: UsageBoundStream<I, S, A>,
    f: (a: A) => B
  ): UsageBoundStream<I, S, B> => {
    return fmapUsage(fa, f);
  }
};

/**
 * Applicative instance for UsageBoundStream
 * Combines usage multiplicatively for function application
 */
export const UsageBoundStreamApplicative: Applicative<UsageBoundStreamK> = {
  ...UsageBoundStreamFunctor,
  
  of: <I, S, A>(a: A): UsageBoundStream<I, S, A> => {
    return liftStatelessUsage(() => a, 1);
  },
  
  ap: <I, S, A, B>(
    ff: UsageBoundStream<I, S, (a: A) => B>,
    fa: UsageBoundStream<I, S, A>
  ): UsageBoundStream<I, S, B> => {
    return composeUsage(
      fanOutUsage(ff, fa),
      liftStatelessUsage(([f, a]) => f(a), 1)
    );
  }
};

/**
 * Monad instance for UsageBoundStream
 * Combines usage multiplicatively for monadic binding
 */
export const UsageBoundStreamMonad: Monad<UsageBoundStreamK> = {
  ...UsageBoundStreamApplicative,
  
  chain: <I, S, A, B>(
    fa: UsageBoundStream<I, S, A>,
    f: (a: A) => UsageBoundStream<I, S, B>
  ): UsageBoundStream<I, S, B> => {
    return {
      ...fa,
      run: (input) => (state) => {
        const [s1, a] = fa.run(input)(state);
        return f(a).run(input)(s1);
      },
      usage: (input: I) => {
        const faUsage = fa.usage(input);
        const a = fa.run(input)({} as S)[1]; // Get intermediate result
        const fUsage = f(a).usage(input);
        // For monadic binding, we multiply the usages
        if (faUsage === "∞" || fUsage === "∞") {
          return "∞";
        }
        return faUsage * fUsage;
      },
      __purity: 'State' // Monadic binding is always stateful
    };
  }
};

// ============================================================================
// Registry Registration
// ============================================================================

/**
 * Register UsageBoundStream typeclass instances in the global registry
 */
export function registerUsageBoundStreamInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    // Register UsageBoundStream instances
    registry.register('UsageBoundStreamFunctor', UsageBoundStreamFunctor);
    registry.register('UsageBoundStreamApplicative', UsageBoundStreamApplicative);
    registry.register('UsageBoundStreamMonad', UsageBoundStreamMonad);
    
    // Register as derivable kind
    registry.registerDerivable('UsageBoundStream', {
      functor: UsageBoundStreamFunctor,
      applicative: UsageBoundStreamApplicative,
      monad: UsageBoundStreamMonad,
      purity: { effect: 'State' as const }
    });
  }
}

/**
 * Auto-register instances when module is loaded
 */
registerUsageBoundStreamInstances();

// ============================================================================
// Utility Functions for Registry Integration
// ============================================================================

/**
 * Create a UsageBoundStream from a regular StatefulStream with default usage
 */
export function fromStatefulStream<I, S, O>(
  stream: any, // StatefulStream<I, S, O>
  usage: Multiplicity = 1
): UsageBoundStream<I, S, O> {
  return {
    ...stream,
    usage: constantUsage<I>(usage)
  };
}

/**
 * Convert a UsageBoundStream back to a regular StatefulStream
 */
export function toStatefulStream<I, S, O>(
  stream: UsageBoundStream<I, S, O>
): any { // StatefulStream<I, S, O>
  const { usage, maxUsage, ...statefulStream } = stream;
  return statefulStream;
}

/**
 * Create a UsageBoundStream with derived typeclass instances
 */
export function createUsageBoundStream<I, S, O>(
  run: (input: I) => (state: S) => [S, O],
  usage: (input: I) => Multiplicity,
  purity: 'Pure' | 'State' = 'State',
  maxUsage?: Multiplicity
): UsageBoundStream<I, S, O> {
  return {
    run,
    usage,
    maxUsage,
    __brand: 'StatefulStream',
    __purity: purity
  };
}

// ============================================================================
// Typeclass Instance Helpers
// ============================================================================

/**
 * Get the Functor instance for UsageBoundStream
 */
export function getUsageBoundStreamFunctor(): Functor<UsageBoundStreamK> {
  return UsageBoundStreamFunctor;
}

/**
 * Get the Applicative instance for UsageBoundStream
 */
export function getUsageBoundStreamApplicative(): Applicative<UsageBoundStreamK> {
  return UsageBoundStreamApplicative;
}

/**
 * Get the Monad instance for UsageBoundStream
 */
export function getUsageBoundStreamMonad(): Monad<UsageBoundStreamK> {
  return UsageBoundStreamMonad;
}

// ============================================================================
// Integration with Existing Registry
// ============================================================================

/**
 * Check if UsageBoundStream instances are registered
 */
export function isUsageBoundStreamRegistered(): boolean {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    return registry.has('UsageBoundStreamFunctor') &&
           registry.has('UsageBoundStreamApplicative') &&
           registry.has('UsageBoundStreamMonad');
  }
  return false;
}

/**
 * Get all registered UsageBoundStream instances
 */
export function getUsageBoundStreamInstances(): {
  functor: Functor<UsageBoundStreamK>;
  applicative: Applicative<UsageBoundStreamK>;
  monad: Monad<UsageBoundStreamK>;
} {
  return {
    functor: UsageBoundStreamFunctor,
    applicative: UsageBoundStreamApplicative,
    monad: UsageBoundStreamMonad
  };
}

// Export all instances for easy access
export {
  UsageBoundStreamFunctor as Functor,
  UsageBoundStreamApplicative as Applicative,
  UsageBoundStreamMonad as Monad
}; 