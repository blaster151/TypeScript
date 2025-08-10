/**
 * Bounded Feedback Example
 * 
 * This example demonstrates preventing runaway recursion by bounding feedback usage.
 * Shows how usage bounds can prevent infinite loops and ensure termination.
 */

import {
  UsageBoundStream,
  Multiplicity,
  constantUsage,
  conditionalUsage
} from '../../src/stream/multiplicity/types';

import {
  liftStatelessUsage,
  liftStatefulUsage,
  composeUsage,
  withUsageValidation
} from '../../src/stream/multiplicity/composition';

// ============================================================================
// Basic Bounded Feedback
// ============================================================================

/**
 * Create a bounded feedback stream that prevents runaway recursion
 * Usage: 1 per iteration, bounded by maxIterations
 */
export function createBoundedFeedbackStream<T>(
  processor: (input: T, iteration: number) => T,
  maxIterations: number = 10
): UsageBoundStream<T, { iteration: number; value: T }, T> {
  return {
    run: (input) => (state) => {
      const { iteration, value } = state;
      
      if (iteration >= maxIterations) {
        return [state, value]; // Stop processing
      }
      
      const newValue = processor(value, iteration);
      const newState = { iteration: iteration + 1, value: newValue };
      
      return [newState, newValue];
    },
    usage: constantUsage<T>(1),
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

/**
 * Create a bounded feedback stream with usage validation
 */
export function createBoundedFeedbackWithValidation<T>(
  processor: (input: T, iteration: number) => T,
  maxIterations: number = 10,
  maxUsage: Multiplicity = 10
): UsageBoundStream<T, { iteration: number; value: T }, T> & { maxUsage: Multiplicity } {
  const feedbackStream = createBoundedFeedbackStream(processor, maxIterations);
  return withUsageValidation(feedbackStream, maxUsage);
}

// ============================================================================
// Conditional Bounded Feedback
// ============================================================================

/**
 * Create a feedback stream that stops when a condition is met
 * Usage: 1 per iteration until condition is met
 */
export function createConditionalBoundedFeedback<T>(
  processor: (input: T, iteration: number) => T,
  condition: (value: T, iteration: number) => boolean,
  maxIterations: number = 100
): UsageBoundStream<T, { iteration: number; value: T }, T> {
  return {
    run: (input) => (state) => {
      const { iteration, value } = state;
      
      if (iteration >= maxIterations || condition(value, iteration)) {
        return [state, value]; // Stop processing
      }
      
      const newValue = processor(value, iteration);
      const newState = { iteration: iteration + 1, value: newValue };
      
      return [newState, newValue];
    },
    usage: (input: T) => {
      // Estimate usage based on input (simplified)
      return Math.min(maxIterations, 10); // Conservative estimate
    },
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

// ============================================================================
// Specific Feedback Examples
// ============================================================================

/**
 * Create a bounded feedback stream for number convergence
 * Stops when the difference between iterations is small
 */
export function createConvergenceFeedback(
  tolerance: number = 0.001,
  maxIterations: number = 50
): UsageBoundStream<number, { iteration: number; value: number }, number> {
  return createConditionalBoundedFeedback(
    (value, iteration) => value / 2, // Halve the value each iteration
    (value, iteration) => {
      if (iteration === 0) return false;
      return Math.abs(value) < tolerance; // Stop when close to zero
    },
    maxIterations
  );
}

/**
 * Create a bounded feedback stream for string processing
 * Stops when string reaches a certain length
 */
export function createStringFeedback(
  targetLength: number = 10,
  maxIterations: number = 20
): UsageBoundStream<string, { iteration: number; value: string }, string> {
  return createConditionalBoundedFeedback(
    (value, iteration) => value + "*", // Add asterisk each iteration
    (value, iteration) => value.length >= targetLength,
    maxIterations
  );
}

/**
 * Create a bounded feedback stream for array processing
 * Stops when array reaches a certain size
 */
export function createArrayFeedback<T>(
  targetSize: number = 5,
  maxIterations: number = 10
): UsageBoundStream<T[], { iteration: number; value: T[] }, T[]> {
  return createConditionalBoundedFeedback(
    (value, iteration) => [...value, iteration as T], // Add iteration number
    (value, iteration) => value.length >= targetSize,
    maxIterations
  );
}

// ============================================================================
// Complex Feedback Patterns
// ============================================================================

/**
 * Create a feedback stream with exponential backoff
 * Usage decreases over time to prevent resource exhaustion
 */
export function createExponentialBackoffFeedback<T>(
  processor: (input: T, iteration: number) => T,
  maxIterations: number = 10
): UsageBoundStream<T, { iteration: number; value: T }, T> {
  return {
    run: (input) => (state) => {
      const { iteration, value } = state;
      
      if (iteration >= maxIterations) {
        return [state, value];
      }
      
      // Exponential backoff: wait longer each iteration
      const backoff = Math.pow(2, iteration);
      const newValue = processor(value, iteration);
      const newState = { iteration: iteration + 1, value: newValue };
      
      return [newState, newValue];
    },
    usage: (input: T) => {
      // Usage decreases exponentially
      return Math.max(1, Math.floor(10 / Math.pow(2, 5)));
    },
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

/**
 * Create a feedback stream with adaptive usage
 * Usage adapts based on input complexity
 */
export function createAdaptiveFeedback<T>(
  processor: (input: T, iteration: number) => T,
  complexityEstimator: (input: T) => number,
  maxIterations: number = 20
): UsageBoundStream<T, { iteration: number; value: T }, T> {
  return {
    run: (input) => (state) => {
      const { iteration, value } = state;
      
      if (iteration >= maxIterations) {
        return [state, value];
      }
      
      const newValue = processor(value, iteration);
      const newState = { iteration: iteration + 1, value: newValue };
      
      return [newState, newValue];
    },
    usage: (input: T) => {
      const complexity = complexityEstimator(input);
      // Higher complexity = lower usage to prevent resource exhaustion
      return Math.max(1, Math.floor(10 / complexity));
    },
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

// ============================================================================
// Feedback Pipeline Examples
// ============================================================================

/**
 * Create a pipeline that processes input and then applies bounded feedback
 */
export function createFeedbackPipeline<T>(
  preprocessor: (input: T) => T,
  feedbackProcessor: (input: T, iteration: number) => T,
  maxIterations: number = 10
): UsageBoundStream<T, { iteration: number; value: T }, T> {
  const preprocess = liftStatelessUsage(preprocessor, 1);
  const feedback = createBoundedFeedbackStream(feedbackProcessor, maxIterations);
  
  return composeUsage(preprocess, feedback);
}

/**
 * Create a number processing pipeline with bounded feedback
 */
export function createNumberFeedbackPipeline(
  maxIterations: number = 10
): UsageBoundStream<number, { iteration: number; value: number }, number> {
  return createFeedbackPipeline(
    (x: number) => x * 2, // Preprocess: double the input
    (x: number, iteration: number) => x / (iteration + 1), // Feedback: divide by iteration
    maxIterations
  );
}

/**
 * Create a string processing pipeline with bounded feedback
 */
export function createStringFeedbackPipeline(
  maxIterations: number = 5
): UsageBoundStream<string, { iteration: number; value: string }, string> {
  return createFeedbackPipeline(
    (s: string) => s.toUpperCase(), // Preprocess: uppercase
    (s: string, iteration: number) => s + `_${iteration}`, // Feedback: add iteration number
    maxIterations
  );
}

// ============================================================================
// Example Usage Functions
// ============================================================================

/**
 * Run examples demonstrating bounded feedback functionality
 */
export function runBoundedFeedbackExamples(): void {
  console.log("=== Bounded Feedback Examples ===\n");

  // Basic bounded feedback
  console.log("1. Basic Bounded Feedback (halve number 5 times):");
  const basicFeedback = createBoundedFeedbackStream(
    (value: number, iteration: number) => value / 2,
    5
  );
  
  let state = { iteration: 0, value: 100 };
  for (let i = 0; i < 7; i++) {
    const usage = basicFeedback.usage(100);
    [state, state.value] = basicFeedback.run(100)(state);
    console.log(`  Iteration ${i}: Value = ${state.value}, Usage = ${usage}`);
  }
  console.log();

  // Convergence feedback
  console.log("2. Convergence Feedback (halve until close to zero):");
  const convergenceFeedback = createConvergenceFeedback(0.1, 10);
  
  state = { iteration: 0, value: 10 };
  for (let i = 0; i < 8; i++) {
    const usage = convergenceFeedback.usage(10);
    [state, state.value] = convergenceFeedback.run(10)(state);
    console.log(`  Iteration ${i}: Value = ${state.value.toFixed(4)}, Usage = ${usage}`);
  }
  console.log();

  // String feedback
  console.log("3. String Feedback (add asterisks until length 8):");
  const stringFeedback = createStringFeedback(8, 10);
  
  let stringState = { iteration: 0, value: "hello" };
  for (let i = 0; i < 6; i++) {
    const usage = stringFeedback.usage("hello");
    [stringState, stringState.value] = stringFeedback.run("hello")(stringState);
    console.log(`  Iteration ${i}: Value = "${stringState.value}", Usage = ${usage}`);
  }
  console.log();

  // Array feedback
  console.log("4. Array Feedback (add numbers until size 4):");
  const arrayFeedback = createArrayFeedback<number>(4, 6);
  
  let arrayState = { iteration: 0, value: [1, 2] };
  for (let i = 0; i < 5; i++) {
    const usage = arrayFeedback.usage([1, 2]);
    [arrayState, arrayState.value] = arrayFeedback.run([1, 2])(arrayState);
    console.log(`  Iteration ${i}: Value = [${arrayState.value}], Usage = ${usage}`);
  }
  console.log();

  // Number feedback pipeline
  console.log("5. Number Feedback Pipeline (double then halve):");
  const numberPipeline = createNumberFeedbackPipeline(5);
  
  state = { iteration: 0, value: 10 };
  for (let i = 0; i < 6; i++) {
    const usage = numberPipeline.usage(10);
    [state, state.value] = numberPipeline.run(10)(state);
    console.log(`  Iteration ${i}: Value = ${state.value.toFixed(2)}, Usage = ${usage}`);
  }
  console.log();

  // String feedback pipeline
  console.log("6. String Feedback Pipeline (uppercase then add numbers):");
  const stringPipeline = createStringFeedbackPipeline(3);
  
  stringState = { iteration: 0, value: "hello" };
  for (let i = 0; i < 4; i++) {
    const usage = stringPipeline.usage("hello");
    [stringState, stringState.value] = stringPipeline.run("hello")(stringState);
    console.log(`  Iteration ${i}: Value = "${stringState.value}", Usage = ${usage}`);
  }
  console.log();
}

/**
 * Demonstrate feedback with usage validation and error handling
 */
export function runFeedbackValidationExamples(): void {
  console.log("=== Feedback Validation Examples ===\n");

  // Create a feedback stream with very low usage bound
  const lowBoundFeedback = createBoundedFeedbackWithValidation(
    (value: number, iteration: number) => value / 2,
    5, // maxIterations
    2  // maxUsage (very low)
  );

  console.log("1. Feedback with low usage bound:");
  let state = { iteration: 0, value: 100 };
  
  try {
    for (let i = 0; i < 4; i++) {
      const usage = lowBoundFeedback.usage(100);
      [state, state.value] = lowBoundFeedback.run(100)(state);
      console.log(`  Iteration ${i}: Value = ${state.value}, Usage = ${usage}`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  console.log();

  // Demonstrate exponential backoff
  console.log("2. Exponential Backoff Feedback:");
  const backoffFeedback = createExponentialBackoffFeedback(
    (value: number, iteration: number) => value / 2,
    5
  );
  
  state = { iteration: 0, value: 100 };
  for (let i = 0; i < 5; i++) {
    const usage = backoffFeedback.usage(100);
    [state, state.value] = backoffFeedback.run(100)(state);
    console.log(`  Iteration ${i}: Value = ${state.value}, Usage = ${usage}`);
  }
  console.log();

  // Demonstrate adaptive feedback
  console.log("3. Adaptive Feedback (usage based on input complexity):");
  const adaptiveFeedback = createAdaptiveFeedback(
    (value: number, iteration: number) => value / 2,
    (input: number) => Math.log(input + 1), // Complexity estimator
    5
  );
  
  const inputs = [10, 100, 1000];
  for (const input of inputs) {
    const usage = adaptiveFeedback.usage(input);
    console.log(`  Input: ${input}, Estimated Usage: ${usage}`);
  }
  console.log();
}

// Export example functions
export {
  runBoundedFeedbackExamples,
  runFeedbackValidationExamples
}; 