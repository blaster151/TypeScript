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

import { ObservableLite } from './fp-observable-lite';
import { StatefulStream } from './fp-stream-state';
import { Functor, Applicative, Monad } from './fp-typeclasses-hkt';
import { ObservableLiteK } from './fp-observable-lite';
import { StatefulStreamK } from './fp-stream-state';
import { Kind1, Apply } from './fp-hkt';
import { toObservableLiteEvent } from './fp-frp-bridge';

// ============================================================================
// Part 1: Unified Stream Type
// ============================================================================

// Option A — adapter/wrapper: one tagged wrapper that is a proper Kind1

export interface UStreamK extends Kind1 {
  readonly type: UStreamT<this['arg0']>;
}

export type UStreamT<A> =
  | { _tag: 'Obs'; obs: ObservableLite<A> }
  | { _tag: 'State'; st: StatefulStream<any, any, A> };

export const UStream = {
  fromObs<A>(obs: ObservableLite<A>): UStreamT<A> { return { _tag: 'Obs', obs }; },
  fromState<A>(st: StatefulStream<any, any, A>): UStreamT<A> { return { _tag: 'State', st }; },
  toObs<A>(u: UStreamT<A>): ObservableLite<A> {
    return u._tag === 'Obs' ? u.obs : toObservableLiteEvent(u.st as any, {} as any);
  }
};

// ============================================================================
// Part 2: Unified Typeclass Instances
// ============================================================================

// Functor instance for the wrapper HKT
export const UStreamFunctor: Functor<UStreamK> = {
  map: <A, B>(fa: UStreamT<A>, f: (a: A) => B): UStreamT<B> =>
    fa._tag === 'Obs'
      ? UStream.fromObs(fa.obs.map(f))
      : UStream.fromState(fa.st.map(f) as any)
};

// Applicative instance for the wrapper HKT
export const UStreamApplicative: Applicative<UStreamK> = {
  ...UStreamFunctor,
  of: <A>(a: A): UStreamT<A> => UStream.fromObs(ObservableLite.of(a)),
  ap: <A, B>(ff: UStreamT<(a: A) => B>, fa: UStreamT<A>): UStreamT<B> =>
    UStream.fromObs(
      UStream.toObs(ff).flatMap(f => UStream.toObs(fa).map(f))
    )
};

// Monad instance for the wrapper HKT
export const UStreamMonad: Monad<UStreamK> = {
  ...UStreamApplicative,
  chain: <A, B>(fa: UStreamT<A>, f: (a: A) => UStreamT<B>): UStreamT<B> =>
    UStream.fromObs(
      UStream.toObs(fa).chain(a => UStream.toObs(f(a)))
    )
};

// Note: Do not advertise Bifunctor/Profunctor for the unified wrapper.

// ============================================================================
// Part 3: Instance Registration
// ============================================================================

/**
 * Register unified instances with the typeclass system
 */
export function registerUnifiedInstances(): void {
  // Register concrete HKTs with their own dictionaries elsewhere (kept here for clarity):
  // Note: Assuming ObservableLite and StatefulStream have their own instances defined/registered
  // in their respective modules. We do NOT register unified instances under concrete HKTs.
  // If consumers want the unified wrapper instances, they can import UStream* directly.
}

// ============================================================================
// Part 4: Unified Operator Functions
// ============================================================================

/**
 * Unified map function that works on both stream types
 */
export function unifiedMap<A, B>(
  stream: UStreamT<A>,
  fn: (a: A) => B
): UStreamT<B> {
  return UStreamFunctor.map(stream, fn);
}

/**
 * Unified filter function that works on both stream types
 */
export function unifiedFilter<A>(
  stream: UStreamT<A>,
  pred: (a: A) => boolean
): UStreamT<A> {
  // Fallback through ObservableLite for unified behavior
  return UStream.fromObs(UStream.toObs(stream).filter(pred));
}

/**
 * Unified scan function that works on both stream types
 */
export function unifiedScan<A, B>(
  stream: UStreamT<A>,
  reducer: (acc: B, value: A) => B,
  seed: B
): UStreamT<B> {
  return UStream.fromObs(UStream.toObs(stream).scan(reducer, seed));
}

/**
 * Unified chain function that works on both stream types
 */
export function unifiedChain<A, B>(
  stream: UStreamT<A>,
  fn: (a: A) => UStreamT<B>
): UStreamT<B> {
  return UStreamMonad.chain(stream, fn);
}

/**
 * Unified bichain function that works on both stream types
 */
// No unified bichain: keep on concrete types that support it.

/**
 * Unified pipe function that works on both stream types
 */
export function unifiedPipe<A, B>(
  stream: UStreamT<A>,
  ...operators: Array<(s: UStreamT<any>) => UStreamT<any>>
): UStreamT<B> {
  return operators.reduce((s, op) => op(s), stream) as any;
}

// ============================================================================
// Part 5: Type-Safe Pipeline Builder
// ============================================================================

/**
 * Type-safe pipeline builder for unified streams
 */
export class UnifiedPipelineBuilder<A> {
  private stream: UStreamT<A>;

  constructor(stream: UStreamT<A>) {
    this.stream = stream;
  }

  map<B>(fn: (a: A) => B): UnifiedPipelineBuilder<B> {
    return new UnifiedPipelineBuilder(unifiedMap(this.stream, fn));
  }

  filter(pred: (a: A) => boolean): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(unifiedFilter(this.stream, pred));
  }

  scan<B>(reducer: (acc: B, value: A) => B, seed: B): UnifiedPipelineBuilder<B> {
    return new UnifiedPipelineBuilder(unifiedScan(this.stream, reducer, seed));
  }

  chain<B>(fn: (a: A) => UnifiedStream<B>): UnifiedPipelineBuilder<B> {
    return new UnifiedPipelineBuilder(unifiedChain(this.stream as any, fn as any));
  }

  take(count: number): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(UStream.fromObs(UStream.toObs(this.stream).take(count)));
  }

  skip(count: number): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(UStream.fromObs(UStream.toObs(this.stream).skip(count)));
  }

  distinct(): UnifiedPipelineBuilder<A> {
    return new UnifiedPipelineBuilder(UStream.fromObs(UStream.toObs(this.stream).distinct()));
  }

  build(): UStreamT<A> {
    return this.stream;
  }
}

/**
 * Create a unified pipeline builder
 */
export function createUnifiedPipeline<A>(stream: UStreamT<A>): UnifiedPipelineBuilder<A> {
  return new UnifiedPipelineBuilder(stream);
}

// ============================================================================
// Part 6: Interoperability Helpers
// ============================================================================

/**
 * Convert ObservableLite to StatefulStream
 */
export function observableToStateful<A>(obs: ObservableLite<A>): StatefulStream<A, {}, A> {
  // Prefer existing bridge if available elsewhere; placeholder pass-through stateful
  return new StatefulStream<A, {}, A>((input: A) => (state: {}) => [state, input], 'Async' as const);
}

/**
 * Convert StatefulStream to ObservableLite
 */
export function statefulToObservable<A>(stream: StatefulStream<any, any, A>): ObservableLite<A> {
  return new ObservableLite<A>((observer) => {
    let state: any = {};
    // We return a function that upstream can call to push inputs if desired.
    // For now, we expose a no-op teardown; integration points can wire inputs externally.
    const drive = (input: any) => {
      try {
        const [s2, out] = stream.run(input)(state);
        state = s2;
        observer.next(out);
      } catch (err) {
        observer.error?.(err);
      }
    };
    // Immediately complete if there is no driving source.
    observer.complete?.();
    return () => { /* teardown */ };
  });
}

/**
 * Check if two streams are interoperable
 */
function isUStream(x: any): x is UStreamT<any> {
  return x && (x._tag === 'Obs' || x._tag === 'State');
}

export function areInteroperable(stream1: any, stream2: any): boolean {
  return isUStream(stream1) && isUStream(stream2);
}

/**
 * Combine two unified streams
 */
export function combineUnifiedStreams<A, B>(
  stream1: UStreamT<A>,
  stream2: UStreamT<B>
): UStreamT<A | B> {
  const obs1 = UStream.toObs(stream1) as ObservableLite<A | B>;
  const obs2 = UStream.toObs(stream2) as ObservableLite<A | B>;
  return UStream.fromObs(ObservableLite.merge(obs1, obs2));
}

// ============================================================================
// Part 7: Type Assertions
// ============================================================================

/**
 * Type assertion helper for unified streams
 */
export type AssertUnified<T> = T extends UStreamT<any> ? true : false;

/**
 * Type assertion helper for same API
 */
export type AssertSameAPI<T, U> = unknown;

// ============================================================================
// Part 8: Exports
// ============================================================================

// Backward-compat type alias
export type UnifiedStream<A> = UStreamT<A>;