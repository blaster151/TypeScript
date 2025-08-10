/**
 * Map Filter Example
 * 
 * Demonstrates how to lift stateless transforms into stateful form using StatefulStream.
 * Shows the power of composition and how pure operations can be seamlessly integrated
 * into stateful pipelines.
 */

import { StatefulStream } from '../../src/stream/core/types';
import { liftStateless, compose, fmap, liftStateful } from '../../src/stream/core/operators';

// ============================================================================
// Stateless Transform Functions
// ============================================================================

/**
 * Pure function to double a number
 */
const double = (x: number): number => x * 2;

/**
 * Pure function to add one to a number
 */
const addOne = (x: number): number => x + 1;

/**
 * Pure function to square a number
 */
const square = (x: number): number => x * x;

/**
 * Pure function to check if a number is even
 */
const isEven = (x: number): boolean => x % 2 === 0;

/**
 * Pure function to check if a number is positive
 */
const isPositive = (x: number): boolean => x > 0;

/**
 * Pure function to convert number to string
 */
const toString = (x: number): string => x.toString();

/**
 * Pure function to get the length of a string
 */
const getLength = (s: string): number => s.length;

// ============================================================================
// Lifted Streams
// ============================================================================

/**
 * Create a stream that doubles numbers
 */
const doubleStream = liftStateless(double);

/**
 * Create a stream that adds one to numbers
 */
const addOneStream = liftStateless(addOne);

/**
 * Create a stream that squares numbers
 */
const squareStream = liftStateless(square);

/**
 * Create a stream that checks if numbers are even
 */
const isEvenStream = liftStateless(isEven);

/**
 * Create a stream that checks if numbers are positive
 */
const isPositiveStream = liftStateless(isPositive);

/**
 * Create a stream that converts numbers to strings
 */
const toStringStream = liftStateless(toString);

/**
 * Create a stream that gets string lengths
 */
const getLengthStream = liftStateless(getLength);

// ============================================================================
// Filter Streams
// ============================================================================

/**
 * Create a filter stream that only passes even numbers
 */
const evenFilterStream = liftStateful((input: number, state: number) => {
  if (isEven(input)) {
    return [state, input];
  } else {
    return [state, null];
  }
});

/**
 * Create a filter stream that only passes positive numbers
 */
const positiveFilterStream = liftStateful((input: number, state: number) => {
  if (isPositive(input)) {
    return [state, input];
  } else {
    return [state, null];
  }
});

/**
 * Create a filter stream that only passes numbers greater than a threshold
 */
const createThresholdFilterStream = (threshold: number) => 
  liftStateful((input: number, state: number) => {
    if (input > threshold) {
      return [state, input];
    } else {
      return [state, null];
    }
  });

// ============================================================================
// Example Pipelines
// ============================================================================

/**
 * Pipeline: double -> add one -> square
 */
const mathPipeline = compose(compose(doubleStream, addOneStream), squareStream);

/**
 * Pipeline: filter even -> double -> add one
 */
const evenPipeline = compose(evenFilterStream, compose(doubleStream, addOneStream));

/**
 * Pipeline: filter positive -> square -> to string -> get length
 */
const stringPipeline = compose(
  positiveFilterStream,
  compose(squareStream, compose(toStringStream, getLengthStream))
);

/**
 * Pipeline: threshold filter -> double -> square
 */
const createThresholdPipeline = (threshold: number) => 
  compose(createThresholdFilterStream(threshold), compose(doubleStream, squareStream));

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Run the math pipeline example
 */
export function runMathPipelineExample(): void {
  console.log('=== Math Pipeline Example ===');
  console.log('Pipeline: double -> add one -> square');
  
  const inputs = [1, 2, 3, 4, 5];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = mathPipeline.run(input)(state);
    console.log(`Input: ${input} -> Output: ${output}`);
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the even filter pipeline example
 */
export function runEvenFilterExample(): void {
  console.log('=== Even Filter Pipeline Example ===');
  console.log('Pipeline: filter even -> double -> add one');
  
  const inputs = [1, 2, 3, 4, 5, 6, 7, 8];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = evenPipeline.run(input)(state);
    if (output !== null) {
      console.log(`Input: ${input} -> Output: ${output}`);
    } else {
      console.log(`Input: ${input} -> Filtered out`);
    }
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the string pipeline example
 */
export function runStringPipelineExample(): void {
  console.log('=== String Pipeline Example ===');
  console.log('Pipeline: filter positive -> square -> to string -> get length');
  
  const inputs = [-2, -1, 0, 1, 2, 3, 4, 5];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = stringPipeline.run(input)(state);
    if (output !== null) {
      console.log(`Input: ${input} -> Output: ${output}`);
    } else {
      console.log(`Input: ${input} -> Filtered out`);
    }
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the threshold pipeline example
 */
export function runThresholdPipelineExample(): void {
  console.log('=== Threshold Pipeline Example ===');
  console.log('Pipeline: threshold filter (>3) -> double -> square');
  
  const thresholdPipeline = createThresholdPipeline(3);
  const inputs = [1, 2, 3, 4, 5, 6, 7, 8];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Threshold: > 3');
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = thresholdPipeline.run(input)(state);
    if (output !== null) {
      console.log(`Input: ${input} -> Output: ${output}`);
    } else {
      console.log(`Input: ${input} -> Filtered out`);
    }
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run a complex pipeline with multiple filters and transforms
 */
export function runComplexPipelineExample(): void {
  console.log('=== Complex Pipeline Example ===');
  console.log('Pipeline: filter even -> double -> filter > 10 -> square -> to string');
  
  const complexPipeline = compose(
    evenFilterStream,
    compose(
      doubleStream,
      compose(
        createThresholdFilterStream(10),
        compose(squareStream, toStringStream)
      )
    )
  );
  
  const inputs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let state = 0;
  
  console.log('Inputs:', inputs);
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = complexPipeline.run(input)(state);
    if (output !== null) {
      console.log(`Input: ${input} -> Output: ${output}`);
    } else {
      console.log(`Input: ${input} -> Filtered out`);
    }
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run all examples
 */
export function runAllMapFilterExamples(): void {
  runMathPipelineExample();
  runEvenFilterExample();
  runStringPipelineExample();
  runThresholdPipelineExample();
  runComplexPipelineExample();
}

// ============================================================================
// Advanced Examples
// ============================================================================

/**
 * Create a stream that applies a function only when a condition is met
 */
function createConditionalStream<I, O>(
  condition: (input: I) => boolean,
  transform: (input: I) => O
): StatefulStream<I, void, O | null> {
  return liftStateful((input: I, state: void) => {
    if (condition(input)) {
      return [state, transform(input)];
    } else {
      return [state, null];
    }
  });
}

/**
 * Create a stream that applies different transforms based on conditions
 */
function createMultiConditionalStream<I, O>(
  conditions: Array<{ test: (input: I) => boolean; transform: (input: I) => O }>
): StatefulStream<I, void, O | null> {
  return liftStateful((input: I, state: void) => {
    for (const { test, transform } of conditions) {
      if (test(input)) {
        return [state, transform(input)];
      }
    }
    return [state, null];
  });
}

/**
 * Run the conditional stream example
 */
export function runConditionalStreamExample(): void {
  console.log('=== Conditional Stream Example ===');
  
  const conditionalStream = createConditionalStream(
    (x: number) => x > 5,
    (x: number) => x * 10
  );
  
  const inputs = [1, 3, 5, 7, 9, 11];
  let state = undefined;
  
  console.log('Inputs:', inputs);
  console.log('Condition: x > 5, Transform: x * 10');
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = conditionalStream.run(input)(state);
    if (output !== null) {
      console.log(`Input: ${input} -> Output: ${output}`);
    } else {
      console.log(`Input: ${input} -> Condition not met`);
    }
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

/**
 * Run the multi-conditional stream example
 */
export function runMultiConditionalStreamExample(): void {
  console.log('=== Multi-Conditional Stream Example ===');
  
  const multiConditionalStream = createMultiConditionalStream([
    { test: (x: number) => x < 0, transform: (x: number) => `negative: ${x}` },
    { test: (x: number) => x === 0, transform: (x: number) => `zero: ${x}` },
    { test: (x: number) => x > 0 && x <= 10, transform: (x: number) => `small positive: ${x}` },
    { test: (x: number) => x > 10, transform: (x: number) => `large positive: ${x}` }
  ]);
  
  const inputs = [-5, 0, 3, 7, 15, 25];
  let state = undefined;
  
  console.log('Inputs:', inputs);
  console.log('Conditions:');
  console.log('  x < 0 -> "negative: x"');
  console.log('  x === 0 -> "zero: x"');
  console.log('  0 < x <= 10 -> "small positive: x"');
  console.log('  x > 10 -> "large positive: x"');
  console.log('Initial state:', state);
  
  for (const input of inputs) {
    const [newState, output] = multiConditionalStream.run(input)(state);
    if (output !== null) {
      console.log(`Input: ${input} -> Output: ${output}`);
    } else {
      console.log(`Input: ${input} -> No condition met`);
    }
    state = newState;
  }
  
  console.log('Final state:', state);
  console.log();
}

// Export utility functions
export {
  createConditionalStream,
  createMultiConditionalStream
}; 