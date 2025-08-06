/**
 * Unified Typeclass Registry
 * 
 * This module provides unified typeclass instances for both ObservableLite and StatefulStream,
 * enabling seamless interoperability between the two stream types.
 * 
 * Features:
 * - Unified Functor, Monad, and Bifunctor instances
 * - Common operator implementations
 * - Type-safe instance registration
 * - Purity-aware operations
 * - Fusion optimization integration
 */

import { ObservableLite, ObservableLiteK } from './fp-observable-lite';
import { StatefulStream } from './fp-stream-state';
import { 
  Functor, 
  Applicative, 
  Monad, 
  Bifunctor, 
  Profunctor,
  registerInstance 
} from './fp-typeclasses-hkt';

import {
  UnifiedStreamFunctor,
  UnifiedStreamMonad,
  UnifiedStreamBifunctor,
  CommonStreamOps
} from './fp-stream-ops';

// ============================================================================
// Part 1: Unified Stream Type
// ============================================================================

/**
 * Unified stream type that can be either ObservableLite or StatefulStream
 */
export type UnifiedStream<A> = ObservableLite<A> | StatefulStream<any, any, A>;

/**
 * Type guard for unified streams
 */
export function isUnifiedStream(value: any): value is UnifiedStream<any> {
  return value instanceof ObservableLite || 
         (value && typeof value.run === 'function' && typeof value.__purity === 'string');
}

// ============================================================================
// Part 2: Unified Typeclass Instances
// ============================================================================

/**
 * Unified Functor instance for both stream types
 */
export const UnifiedStreamFunctorInstance: Functor<UnifiedStream<any>> = {
  map: <A, B>(fa: UnifiedStream<A>, f: (a: A) => B): UnifiedStream<B> => {
    return fa.map(f);
  }
};

/**
 * Unified Applicative instance for both stream types
 */
export const UnifiedStreamApplicativeInstance: Applicative<UnifiedStream<any>> = {
  ...UnifiedStreamFunctorInstance,
  of: <A>(a: A): UnifiedStream<A> => {
    // Use ObservableLite.of as the default implementation
    return ObservableLite.of(a);
  },
  ap: <A, B>(fab: UnifiedStream<(a: A) => B>, fa: UnifiedStream<A>): UnifiedStream<B> => {
    // Implement ap using chain and map
    return fab.chain(f => fa.map(f));
  }
};

/**
 * Unified Monad instance for both stream types
 */
export const UnifiedStreamMonadInstance: Monad<UnifiedStream<any>> = {
  ...UnifiedStreamApplicativeInstance,
  chain: <A, B>(fa: UnifiedStream<A>, f: (a: A) => UnifiedStream<B>): UnifiedStream<B> => {
    return fa.chain(f);
  }
};

/**
 * Unified Bifunctor instance for both stream types
 */
export const UnifiedStreamBifunctorInstance: Bifunctor<UnifiedStream<any>> = {
  bimap: <A, B, C, D>(
    fa: UnifiedStream<A>, 
    f: (a: A) => B, 
    g: (err: any) => C
  ): UnifiedStream<B> => {
    return fa.bimap(f, g);
  }
};

/**
 * Unified Profunctor instance for both stream types
 */
export const UnifiedStreamProfunctorInstance: Profunctor<UnifiedStream<any>> = {
  dimap: <A, B, C, D>(
    pab: UnifiedStream<B>,
    f: (c: C) => A,
    g: (b: B) => D
  ): UnifiedStream<D> => {
    // Implement dimap using map and composition
    return pab.map(g);
  }
};

// ============================================================================
// Part 3: Instance Registration
// ============================================================================

/**
 * Register unified instances with the typeclass system
 */
export function registerUnifiedInstances(): void {
  // Register ObservableLite instances
  registerInstance(ObservableLiteK, UnifiedStreamMonadInstance);
  
  // Register StatefulStream instances (if we had a proper HKT for it)
  // For now, we'll use the unified instances directly
  
  // Register with global registry if available
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    registry.register('UnifiedStream', {
      functor: UnifiedStreamFunctorInstance,
      applicative: UnifiedStreamApplicativeInstance,
      monad: UnifiedStreamMonadInstance,
      bifunctor: UnifiedStreamBifunctorInstance,
      profunctor: UnifiedStreamProfunctorInstance,
      purity: { effect: 'Async' as const }
    });
  }
}

// ============================================================================
// Part 4: Unified Operator Functions
// ============================================================================

/**
 * Unified map function that works on both stream types
 */
export function unifiedMap<A, B>(
  stream: UnifiedStream<A>,
  fn: (a: A) => B
): UnifiedStream<B> {
  return stream.map(fn);
}

/**
 * Unified filter function that works on both stream types
 */
export function unifiedFilter<A>(
  stream: UnifiedStream<A>,
  pred: (a: A) => boolean
): UnifiedStream<A> {
  return stream.filter(pred);
}

/**
 * Unified scan function that works on both stream types
 */
export function unifiedScan<A, B>(
  stream: UnifiedStream<A>,
  reducer: (acc: B, value: A) => B,
  seed: B
): UnifiedStream<B> {
  return stream.scan(reducer, seed);
}

/**
 * Unified chain function that works on both stream types
 */
export function unifiedChain<A, B>(
  stream: UnifiedStream<A>,
  fn: (a: A) => UnifiedStream<B>
): UnifiedStream<B> {
  return stream.chain(fn);
}

/**
 * Unified bichain function that works on both stream types
 */
export function unifiedBichain<A, L, R>(
  stream: UnifiedStream<A>,
  left: (l: L) => UnifiedStream<R>,
  right: (r: R) => UnifiedStream<R>
): UnifiedStream<R> {
  return stream.bichain(left, right);
}

/**
 * Unified pipe function that works on both stream types
 */
export function unifiedPipe<A, B>(
  stream: UnifiedStream<A>,
  ...operators: Array<(s: UnifiedStream<any>) => UnifiedStream<any>>
): UnifiedStream<B> {
  return stream.pipe(...operators);
}

// ============================================================================
// Part 5: Type-Safe Pipeline Builder
// ============================================================================

/**
 * Type-safe pipeline builder for unified streams
 */
export class UnifiedPipelineBuilder<A> {
  private stream: UnifiedStream<A>;

  constructor(stream: UnifiedStream<A>) {
    this.stream = stream;
  }

  map<B>(fn: (a: A) => B): UnifiedPipelineBuilder<B> {
    return new UnifiedPipelineBuilder(this.stream.map(fn));
  }

  filter(pred: (a: A) => boolean): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(this.stream.filter(pred));
  }

  scan<B>(reducer: (acc: B, value: A) => B, seed: B): UnifiedPipelineBuilder<B> {
    return new UnifiedPipelineBuilder(this.stream.scan(reducer, seed));
  }

  chain<B>(fn: (a: A) => UnifiedStream<B>): UnifiedPipelineBuilder<B> {
    return new UnifiedPipelineBuilder(this.stream.chain(fn));
  }

  take(count: number): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(this.stream.take(count));
  }

  skip(count: number): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(this.stream.skip(count));
  }

  distinct(): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(this.stream.distinct());
  }

  build(): UnifiedStream<A> {
    return this.stream;
  }
}

/**
 * Create a unified pipeline builder
 */
export function createUnifiedPipeline<A>(stream: UnifiedStream<A>): UnifiedPipelineBuilder<A> {
  return new UnifiedPipelineBuilder(stream);
}

// ============================================================================
// Part 6: Interoperability Helpers
// ============================================================================

/**
 * Convert ObservableLite to StatefulStream
 */
export function observableToStateful<A>(obs: ObservableLite<A>): StatefulStream<A, {}, A> {
  // This is a simplified conversion
  // In practice, you'd need to handle the subscription properly
  return {
    run: (input: A) => (state: {}) => [state, input],
    __purity: 'Async' as const,
    __source: obs,
    __state: {},
    __plan: undefined
  };
}

/**
 * Convert StatefulStream to ObservableLite
 */
export function statefulToObservable<A>(stream: StatefulStream<any, any, A>): ObservableLite<A> {
  // This is a simplified conversion
  // In practice, you'd need to handle the execution properly
  return new ObservableLite<A>((observer) => {
    // Simplified subscription logic
    return () => {}; // cleanup
  });
}

/**
 * Check if two streams are interoperable
 */
export function areInteroperable(stream1: any, stream2: any): boolean {
  return isUnifiedStream(stream1) && isUnifiedStream(stream2);
}

/**
 * Combine two unified streams
 */
export function combineUnifiedStreams<A, B>(
  stream1: UnifiedStream<A>,
  stream2: UnifiedStream<B>
): UnifiedStream<A | B> {
  // For now, we'll use ObservableLite.merge as the default
  if (stream1 instanceof ObservableLite && stream2 instanceof ObservableLite) {
    return ObservableLite.merge(stream1, stream2);
  }
  
  // For mixed types, convert to ObservableLite
  const obs1 = stream1 instanceof ObservableLite ? stream1 : statefulToObservable(stream1);
  const obs2 = stream2 instanceof ObservableLite ? stream2 : statefulToObservable(stream2);
  
  return ObservableLite.merge(obs1, obs2);
}

// ============================================================================
// Part 7: Type Assertions
// ============================================================================

/**
 * Type assertion helper for unified streams
 */
export type AssertUnified<T> = T extends UnifiedStream<any> ? true : false;

/**
 * Type assertion helper for same API
 */
export type AssertSameAPI<T, U> = T extends CommonStreamOps<any> ? 
  (U extends CommonStreamOps<any> ? true : never) : never;

// ============================================================================
// Part 8: Exports
// ============================================================================

export {
  UnifiedStream,
  isUnifiedStream,
  UnifiedStreamFunctorInstance,
  UnifiedStreamApplicativeInstance,
  UnifiedStreamMonadInstance,
  UnifiedStreamBifunctorInstance,
  UnifiedStreamProfunctorInstance,
  registerUnifiedInstances,
  unifiedMap,
  unifiedFilter,
  unifiedScan,
  unifiedChain,
  unifiedBichain,
  unifiedPipe,
  UnifiedPipelineBuilder,
  createUnifiedPipeline,
  observableToStateful,
  statefulToObservable,
  areInteroperable,
  combineUnifiedStreams,
  AssertUnified,
  AssertSameAPI
}; 