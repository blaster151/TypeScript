/**
 * Adapter Layer for StatefulStream
 * 
 * This module provides adapters to bridge StatefulStream with existing ADTs:
 * - ObservableLite ↔ StatefulStream
 * - Maybe ↔ StatefulStream (degenerate state)
 * - Either ↔ StatefulStream (error channel)
 * 
 * Tests to confirm round-tripping works correctly.
 */

import { StatefulStream, isStatefulStream } from '../core/types';
import { compose, liftStateless, liftStateful } from '../core/operators';

// Import existing ADTs
import { ObservableLite } from '../../../fp-observable-lite';
import { Maybe, Just, Nothing, matchMaybe } from '../../../fp-maybe-unified';
import { Either, Left, Right, matchEither } from '../../../fp-either-unified';

// ============================================================================
// ObservableLite ↔ StatefulStream Adapters
// ============================================================================

/**
 * Convert StatefulStream to ObservableLite
 */
export function toObservableLite<I, S, O>(
  stream: StatefulStream<I, S, O>,
  inputs: Iterable<I> = [],
  initialState: S
): ObservableLite<O> {
  return new ObservableLite((observer) => {
    let state = initialState;
    let cancelled = false;
    
    for (const input of inputs) {
      if (cancelled) break;
      
      const [newState, output] = stream.run(input)(state);
      state = newState;
      observer.next(output);
    }
    
    if (!cancelled) {
      observer.complete?.();
    }
    
    return () => {
      cancelled = true;
    };
  });
}

/**
 * Convert ObservableLite to StatefulStream
 * Note: This creates a stateless stream that processes each value
 */
export function fromObservableLite<A, B>(
  observable: ObservableLite<A>,
  processor: (input: A, state: void) => [void, B]
): StatefulStream<A, void, B> {
  return {
    run: (input) => (state) => processor(input, state),
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Round-trip test: StatefulStream → ObservableLite → StatefulStream
 */
export function testObservableLiteRoundTrip<I, S, O>(
  stream: StatefulStream<I, S, O>,
  inputs: I[],
  initialState: S
): boolean {
  const observable = toObservableLite(stream, inputs, initialState);
  const results: O[] = [];
  
  observable.subscribe({
    next: (value) => results.push(value),
    complete: () => {}
  });
  
  // Compare with direct execution
  let state = initialState;
  const expected: O[] = [];
  
  for (const input of inputs) {
    const [newState, output] = stream.run(input)(state);
    state = newState;
    expected.push(output);
  }
  
  return JSON.stringify(results) === JSON.stringify(expected);
}

// ============================================================================
// Maybe ↔ StatefulStream Adapters
// ============================================================================

/**
 * Convert Maybe to StatefulStream (degenerate state)
 * Just values become outputs, Nothing becomes no output
 */
export function fromMaybe<A>(maybe: Maybe<A>): StatefulStream<void, void, Maybe<A>> {
  return {
    run: () => () => [undefined, maybe],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Convert StatefulStream to Maybe
 * Takes the first output and wraps it in Just, or returns Nothing if no output
 */
export function toMaybe<I, S, O>(
  stream: StatefulStream<I, S, O>,
  input: I,
  initialState: S
): Maybe<O> {
  const [_, output] = stream.run(input)(initialState);
  return Just(output);
}

/**
 * Create a StatefulStream that processes Maybe values
 */
export function maybeProcessor<A, B>(
  processor: (a: A) => B
): StatefulStream<Maybe<A>, void, Maybe<B>> {
  return {
    run: (maybe) => () => [
      undefined,
      matchMaybe(maybe, {
        Just: ({ value }) => Just(processor(value)),
        Nothing: () => Nothing()
      })
    ],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Round-trip test: Maybe → StatefulStream → Maybe
 */
export function testMaybeRoundTrip<A>(maybe: Maybe<A>): boolean {
  const stream = fromMaybe(maybe);
  const result = toMaybe(stream, undefined, undefined);
  
  return matchMaybe(maybe, {
    Just: ({ value }) => matchMaybe(result, {
      Just: ({ value: resultValue }) => value === resultValue,
      Nothing: () => false
    }),
    Nothing: () => matchMaybe(result, {
      Just: () => false,
      Nothing: () => true
    })
  });
}

// ============================================================================
// Either ↔ StatefulStream Adapters
// ============================================================================

/**
 * Convert Either to StatefulStream (error channel)
 * Right values become outputs, Left values become errors
 */
export function fromEither<L, R>(either: Either<L, R>): StatefulStream<void, void, Either<L, R>> {
  return {
    run: () => () => [undefined, either],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Convert StatefulStream to Either
 * Wraps the output in Right, or Left if there's an error
 */
export function toEither<I, S, O, E>(
  stream: StatefulStream<I, S, O>,
  input: I,
  initialState: S,
  errorHandler: (error: any) => E
): Either<E, O> {
  try {
    const [_, output] = stream.run(input)(initialState);
    return Right(output);
  } catch (error) {
    return Left(errorHandler(error));
  }
}

/**
 * Create a StatefulStream that processes Either values
 */
export function eitherProcessor<L, R, L2, R2>(
  leftProcessor: (l: L) => L2,
  rightProcessor: (r: R) => R2
): StatefulStream<Either<L, R>, void, Either<L2, R2>> {
  return {
    run: (either) => () => [
      undefined,
      matchEither(either, {
        Left: ({ value }) => Left(leftProcessor(value)),
        Right: ({ value }) => Right(rightProcessor(value))
      })
    ],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Round-trip test: Either → StatefulStream → Either
 */
export function testEitherRoundTrip<L, R>(either: Either<L, R>): boolean {
  const stream = fromEither(either);
  const result = toEither(stream, undefined, undefined, (e) => e);
  
  return matchEither(either, {
    Left: ({ value }) => matchEither(result, {
      Left: ({ value: resultValue }) => value === resultValue,
      Right: () => false
    }),
    Right: ({ value }) => matchEither(result, {
      Left: () => false,
      Right: ({ value: resultValue }) => value === resultValue
    })
  });
}

// ============================================================================
// Advanced Adapters
// ============================================================================

/**
 * Create a StatefulStream that accumulates Maybe values
 */
export function maybeAccumulator<A, B>(
  initial: B,
  processor: (acc: B, a: A) => B
): StatefulStream<Maybe<A>, B, B> {
  return {
    run: (maybe) => (state) => [
      matchMaybe(maybe, {
        Just: ({ value }) => processor(state, value),
        Nothing: () => state
      }),
      matchMaybe(maybe, {
        Just: ({ value }) => processor(state, value),
        Nothing: () => state
      })
    ],
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

/**
 * Create a StatefulStream that handles Either values with error recovery
 */
export function eitherHandler<L, R, O>(
  successHandler: (r: R) => O,
  errorHandler: (l: L) => O
): StatefulStream<Either<L, R>, void, O> {
  return {
    run: (either) => () => [
      undefined,
      matchEither(either, {
        Left: ({ value }) => errorHandler(value),
        Right: ({ value }) => successHandler(value)
      })
    ],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Create a StatefulStream that filters Maybe values
 */
export function maybeFilter<A>(
  predicate: (a: A) => boolean
): StatefulStream<Maybe<A>, void, Maybe<A>> {
  return {
    run: (maybe) => () => [
      undefined,
      matchMaybe(maybe, {
        Just: ({ value }) => predicate(value) ? Just(value) : Nothing(),
        Nothing: () => Nothing()
      })
    ],
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Test all round-trip conversions
 */
export function testAllRoundTrips(): {
  observableLite: boolean;
  maybe: boolean;
  either: boolean;
} {
  // Test ObservableLite round-trip
  const testStream = liftStateless((x: number) => x * 2);
  const observableLiteWorks = testObservableLiteRoundTrip(testStream, [1, 2, 3], 0);
  
  // Test Maybe round-trip
  const testMaybe = Just(42);
  const maybeWorks = testMaybeRoundTrip(testMaybe);
  
  // Test Either round-trip
  const testEither = Right("success");
  const eitherWorks = testEitherRoundTrip(testEither);
  
  return {
    observableLite: observableLiteWorks,
    maybe: maybeWorks,
    either: eitherWorks
  };
}

/**
 * Create a composite adapter that combines multiple conversions
 */
export function createCompositeAdapter<I, S, O, T>(
  stream: StatefulStream<I, S, O>,
  converter: (o: O) => T
): StatefulStream<I, S, T> {
  return compose(stream, liftStateless(converter));
} 