/**
 * Scan Counter Example
 * 
 * Demonstrates how to use StatefulStream to maintain and increment state
 * across a sequence of inputs. This shows the core state-monoid FRP pattern.
 */

import { StatefulStream } from '../../src/stream/core/types';
import { liftStateful, compose, fmap } from '../../src/stream/core/operators';

// ============================================================================
// Counter Stream Implementation
// ============================================================================

/**
 * Create a counter stream that increments state on each input
 */
function createCounterStream(): StatefulStream<number, number, number> {
  return liftStateful((input: number, state: number) => {
    const newState = state + 1;
    return [newState, newState];
  });
}

/**
 * Create a stream that accumulates values
 */
function createAccumulatorStream(): StatefulStream<number, number, number> {
  return liftStateful((input: number, state: number) => {
    const newState = state + input;
    return [newState, newState];
  });
}

/**
 * Create a stream that tracks running statistics
 */
function createStatsStream(): StatefulStream<number, { count: number; sum: number; avg: number }, { count: number; sum: number; avg: number }> {
  return liftStateful((input: number, state: { count: number; sum: number; avg: number }) => {
    const newCount = state.count + 1;
    const newSum = state.sum + input;
    const newAvg = newSum / newCount;
    
    const newState = { count: newCount, sum: newSum, avg: newAvg };
    return [newState, newState];
  });
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Run the counter example
 */
export function runCounterExample(): void {
  console.log('=== Counter Stream Example ===');
  
  const counter = createCounterStream();
  const inputs = [1, 2, 3, 4, 5];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = counter.run(input)(state);
    console.log(`Input: ${input} -> State: ${newState}, Output: ${output}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the accumulator example
 */
export function runAccumulatorExample(): void {
  console.log('=== Accumulator Stream Example ===');
  
  const accumulator = createAccumulatorStream();
  const inputs = [10, 20, 30, 40, 50];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = accumulator.run(input)(state);
    console.log(`Input: ${input} -> State: ${newState}, Output: ${output}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the statistics example
 */
export function runStatsExample(): void {
  console.log('=== Statistics Stream Example ===');
  
  const stats = createStatsStream();
  const inputs = [85, 92, 78, 96, 88];
  let state = { count: 0, sum: 0, avg: 0 };
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = stats.run(input)(state);
    console.log(`Input: ${input} -> Count: ${output.count}, Sum: ${output.sum}, Avg: ${output.avg.toFixed(2)}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run a composed example with multiple operations
 */
export function runComposedExample(): void {
  console.log('=== Composed Stream Example ===');
  
  // Create a stream that doubles the input, then counts
  const double = fmap(liftStateful((input: number, state: number) => [state, input * 2]), (x: number) => x);
  const counter = createCounterStream();
  const composed = compose(double, counter);
  
  const inputs = [5, 10, 15, 20];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Pipeline: double -> counter');
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = composed.run(input)(state);
    console.log(`Input: ${input} -> Doubled: ${input * 2} -> Count: ${output}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run all examples
 */
export function runAllExamples(): void {
  runCounterExample();
  runAccumulatorExample();
  runStatsExample();
  runComposedExample();
}

// ============================================================================
// Advanced Examples
// ============================================================================

/**
 * Create a stream that tracks multiple counters
 */
function createMultiCounterStream(): StatefulStream<{ type: string; value: number }, { [key: string]: number }, { [key: string]: number }> {
  return liftStateful((input: { type: string; value: number }, state: { [key: string]: number }) => {
    const newState = { ...state };
    newState[input.type] = (newState[input.type] || 0) + input.value;
    return [newState, newState];
  });
}

/**
 * Run the multi-counter example
 */
export function runMultiCounterExample(): void {
  console.log('=== Multi-Counter Stream Example ===');
  
  const multiCounter = createMultiCounterStream();
  const inputs = [
    { type: 'A', value: 1 },
    { type: 'B', value: 2 },
    { type: 'A', value: 3 },
    { type: 'C', value: 1 },
    { type: 'B', value: 4 }
  ];
  let state: { [key: string]: number } = {};
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = multiCounter.run(input)(state);
    console.log(`Input: ${input.type}=${input.value} -> State:`, output);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run a stream with a list of inputs and return the final state and outputs
 */
export function runStreamWithInputs<I, S, O>(
  stream: StatefulStream<I, S, O>,
  inputs: I[],
  initialState: S
): { finalState: S; outputs: O[] } {
  let state = initialState;
  const outputs: O[] = [];
  
  for (const input of inputs) {
    const [newState, output] = stream.run(input)(state);
    state = newState;
    outputs.push(output);
  }
  
  return { finalState: state, outputs };
}

/**
 * Create a stream that filters inputs based on a predicate
 */
export function createFilterStream<I, S>(
  predicate: (input: I) => boolean
): StatefulStream<I, S, I | null> {
  return liftStateful((input: I, state: S) => {
    if (predicate(input)) {
      return [state, input];
    } else {
      return [state, null];
    }
  });
}

// Export all examples for easy access
export {
  createCounterStream,
  createAccumulatorStream,
  createStatsStream,
  createMultiCounterStream
}; 