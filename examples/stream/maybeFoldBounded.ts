/**
 * Maybe Fold Bounded Example
 * 
 * This example demonstrates usage bounds that depend on Maybe variants:
 * - Usage: 1 if Just, 0 if Nothing
 * - Shows how dependent multiplicities can vary based on input structure
 */

import {
  UsageBoundStream,
  Multiplicity,
  conditionalUsage
} from '../../src/stream/multiplicity/types';

import {
  liftStatelessUsage,
  composeUsage
} from '../../src/stream/multiplicity/composition';

// ============================================================================
// Maybe Type Definition
// ============================================================================

type Maybe<T> = T | null | undefined;

// ============================================================================
// Maybe-Aware Usage Functions
// ============================================================================

/**
 * Create a usage function that depends on Maybe variant
 * Usage: 1 if Just, 0 if Nothing
 */
function maybeUsage<T>(): (input: Maybe<T>) => Multiplicity {
  return (input: Maybe<T>) => {
    return input === null || input === undefined ? 0 : 1;
  };
}

/**
 * Create a usage function that processes Maybe with different multiplicities
 * Usage: 2 if Just, 0 if Nothing
 */
function maybeUsageWithMultiplier<T>(multiplier: number): (input: Maybe<T>) => Multiplicity {
  return (input: Maybe<T>) => {
    return input === null || input === undefined ? 0 : multiplier;
  };
}

// ============================================================================
// Maybe Processing Streams
// ============================================================================

/**
 * Create a stream that processes Maybe values with usage based on variant
 */
export function createMaybeProcessor<T, R>(
  processor: (value: T) => R,
  defaultValue: R
): UsageBoundStream<Maybe<T>, any, R> {
  return {
    run: (input) => (state) => {
      if (input === null || input === undefined) {
        return [state, defaultValue];
      } else {
        return [state, processor(input)];
      }
    },
    usage: maybeUsage<T>(),
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Create a stream that doubles numbers, but only processes Just values
 */
export function createMaybeDoubleStream(): UsageBoundStream<Maybe<number>, any, Maybe<number>> {
  return {
    run: (input) => (state) => {
      if (input === null || input === undefined) {
        return [state, null];
      } else {
        return [state, input * 2];
      }
    },
    usage: maybeUsage<number>(),
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Create a stream that adds one to numbers, but only processes Just values
 */
export function createMaybeAddOneStream(): UsageBoundStream<Maybe<number>, any, Maybe<number>> {
  return {
    run: (input) => (state) => {
      if (input === null || input === undefined) {
        return [state, null];
      } else {
        return [state, input + 1];
      }
    },
    usage: maybeUsage<number>(),
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Create a stream that converts strings to uppercase, but only processes Just values
 */
export function createMaybeToUpperStream(): UsageBoundStream<Maybe<string>, any, Maybe<string>> {
  return {
    run: (input) => (state) => {
      if (input === null || input === undefined) {
        return [state, null];
      } else {
        return [state, input.toUpperCase()];
      }
    },
    usage: maybeUsage<string>(),
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

// ============================================================================
// Maybe Composition Examples
// ============================================================================

/**
 * Create a pipeline that processes Maybe numbers with bounded usage
 */
export function createMaybeNumberPipeline(): UsageBoundStream<Maybe<number>, any, Maybe<number>> {
  const double = createMaybeDoubleStream();
  const addOne = createMaybeAddOneStream();
  
  return composeUsage(double, addOne);
}

/**
 * Create a pipeline that processes Maybe strings with bounded usage
 */
export function createMaybeStringPipeline(): UsageBoundStream<Maybe<string>, any, Maybe<string>> {
  const toUpper = createMaybeToUpperStream();
  const addPrefix = liftStatelessUsage(
    (s: Maybe<string>) => s === null || s === undefined ? null : `PREFIX_${s}`,
    1
  );
  
  return composeUsage(toUpper, addPrefix);
}

// ============================================================================
// Conditional Maybe Processing
// ============================================================================

/**
 * Create a stream that processes Maybe values conditionally
 * Usage depends on both Maybe variant and a predicate
 */
export function createConditionalMaybeProcessor<T>(
  predicate: (value: T) => boolean,
  processor: (value: T) => T
): UsageBoundStream<Maybe<T>, any, Maybe<T>> {
  return {
    run: (input) => (state) => {
      if (input === null || input === undefined) {
        return [state, null];
      } else if (predicate(input)) {
        return [state, processor(input)];
      } else {
        return [state, input]; // No change
      }
    },
    usage: (input: Maybe<T>) => {
      if (input === null || input === undefined) {
        return 0;
      } else {
        return predicate(input) ? 1 : 0;
      }
    },
    __brand: 'StatefulStream',
    __purity: 'Pure'
  };
}

/**
 * Create a stream that only processes positive numbers
 */
export function createPositiveNumberProcessor(): UsageBoundStream<Maybe<number>, any, Maybe<number>> {
  return createConditionalMaybeProcessor(
    (value) => value > 0,
    (value) => value * 2
  );
}

// ============================================================================
// Maybe Accumulation
// ============================================================================

/**
 * Create a stream that accumulates Maybe values
 * Usage: 1 for each Just value, 0 for Nothing
 */
export function createMaybeAccumulator<T>(
  initialValue: T,
  reducer: (acc: T, value: T) => T
): UsageBoundStream<Maybe<T>, T, T> {
  return {
    run: (input) => (state) => {
      if (input === null || input === undefined) {
        return [state, state];
      } else {
        const newState = reducer(state, input);
        return [newState, newState];
      }
    },
    usage: maybeUsage<T>(),
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

/**
 * Create a stream that sums Maybe numbers
 */
export function createMaybeSumAccumulator(): UsageBoundStream<Maybe<number>, number, number> {
  return createMaybeAccumulator(0, (acc, value) => acc + value);
}

/**
 * Create a stream that concatenates Maybe strings
 */
export function createMaybeStringAccumulator(): UsageBoundStream<Maybe<string>, string, string> {
  return createMaybeAccumulator("", (acc, value) => acc + value);
}

// ============================================================================
// Example Usage Functions
// ============================================================================

/**
 * Run examples demonstrating Maybe usage bounds
 */
export function runMaybeFoldBoundedExamples(): void {
  console.log("=== Maybe Fold Bounded Examples ===\n");

  // Basic Maybe processing
  console.log("1. Basic Maybe Processing:");
  const maybeDouble = createMaybeDoubleStream();
  
  const inputs: Maybe<number>[] = [1, null, 3, undefined, 5];
  for (const input of inputs) {
    const usage = maybeDouble.usage(input);
    const [state, result] = maybeDouble.run(input)(0);
    console.log(`  Input: ${input}, Usage: ${usage}, Result: ${result}`);
  }
  console.log();

  // Maybe composition
  console.log("2. Maybe Composition (double then add one):");
  const maybePipeline = createMaybeNumberPipeline();
  
  for (const input of inputs) {
    const usage = maybePipeline.usage(input);
    const [state, result] = maybePipeline.run(input)(0);
    console.log(`  Input: ${input}, Usage: ${usage}, Result: ${result}`);
  }
  console.log();

  // Conditional Maybe processing
  console.log("3. Conditional Maybe Processing (only positive numbers):");
  const positiveProcessor = createPositiveNumberProcessor();
  
  for (const input of inputs) {
    const usage = positiveProcessor.usage(input);
    const [state, result] = positiveProcessor.run(input)(0);
    console.log(`  Input: ${input}, Usage: ${usage}, Result: ${result}`);
  }
  console.log();

  // Maybe accumulation
  console.log("4. Maybe Accumulation (sum of numbers):");
  const maybeSum = createMaybeSumAccumulator();
  let state = 0;
  
  for (const input of inputs) {
    const usage = maybeSum.usage(input);
    [state, state] = maybeSum.run(input)(state);
    console.log(`  Input: ${input}, Usage: ${usage}, Accumulated: ${state}`);
  }
  console.log();

  // String Maybe processing
  console.log("5. String Maybe Processing:");
  const maybeToUpper = createMaybeToUpperStream();
  const stringInputs: Maybe<string>[] = ["hello", null, "world", undefined, "test"];
  
  for (const input of stringInputs) {
    const usage = maybeToUpper.usage(input);
    const [state, result] = maybeToUpper.run(input)(0);
    console.log(`  Input: ${input}, Usage: ${usage}, Result: ${result}`);
  }
  console.log();

  // String Maybe pipeline
  console.log("6. String Maybe Pipeline (uppercase then prefix):");
  const stringPipeline = createMaybeStringPipeline();
  
  for (const input of stringInputs) {
    const usage = stringPipeline.usage(input);
    const [state, result] = stringPipeline.run(input)(0);
    console.log(`  Input: ${input}, Usage: ${usage}, Result: ${result}`);
  }
  console.log();

  // String Maybe accumulation
  console.log("7. String Maybe Accumulation:");
  const stringAccumulator = createMaybeStringAccumulator();
  let stringState = "";
  
  for (const input of stringInputs) {
    const usage = stringAccumulator.usage(input);
    [stringState, stringState] = stringAccumulator.run(input)(stringState);
    console.log(`  Input: ${input}, Usage: ${usage}, Accumulated: "${stringState}"`);
  }
  console.log();
}

/**
 * Demonstrate usage patterns for different Maybe scenarios
 */
export function runMaybeUsagePatterns(): void {
  console.log("=== Maybe Usage Patterns ===\n");

  // Usage pattern 1: Simple Maybe processing
  console.log("1. Simple Maybe Processing:");
  const simpleUsage = maybeUsage<number>();
  console.log(`  Just(5): ${simpleUsage(5)}`);
  console.log(`  Nothing: ${simpleUsage(null)}`);
  console.log(`  Undefined: ${simpleUsage(undefined)}`);
  console.log();

  // Usage pattern 2: Maybe with multiplier
  console.log("2. Maybe with Multiplier (2x for Just values):");
  const multiplierUsage = maybeUsageWithMultiplier<number>(2);
  console.log(`  Just(5): ${multiplierUsage(5)}`);
  console.log(`  Nothing: ${multiplierUsage(null)}`);
  console.log();

  // Usage pattern 3: Conditional Maybe processing
  console.log("3. Conditional Maybe Processing:");
  const conditionalUsage = (input: Maybe<number>) => {
    if (input === null || input === undefined) {
      return 0;
    } else {
      return input > 10 ? 2 : 1; // Higher usage for large numbers
    }
  };
  
  console.log(`  Just(5): ${conditionalUsage(5)}`);
  console.log(`  Just(15): ${conditionalUsage(15)}`);
  console.log(`  Nothing: ${conditionalUsage(null)}`);
  console.log();

  // Usage pattern 4: Complex Maybe processing
  console.log("4. Complex Maybe Processing (usage based on string length):");
  const complexUsage = (input: Maybe<string>) => {
    if (input === null || input === undefined) {
      return 0;
    } else {
      return Math.min(input.length, 5); // Usage capped at 5
    }
  };
  
  console.log(`  Just("hi"): ${complexUsage("hi")}`);
  console.log(`  Just("hello world"): ${complexUsage("hello world")}`);
  console.log(`  Nothing: ${complexUsage(null)}`);
  console.log();
}

// Export example functions
export {
  runMaybeFoldBoundedExamples,
  runMaybeUsagePatterns
}; 