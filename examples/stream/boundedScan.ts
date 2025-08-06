/**
 * Bounded Scan Example
 * 
 * This example demonstrates a scan operation that runs exactly once per input,
 * showing how usage bounds can be used to ensure predictable performance
 * and prevent runaway accumulation.
 */

import {
  UsageBoundStream,
  Multiplicity,
  constantUsage,
  onceUsage,
  conditionalUsage
} from '../../src/stream/multiplicity/types';

import {
  liftStatelessUsage,
  liftStatefulUsage,
  composeUsage,
  withUsageValidation
} from '../../src/stream/multiplicity/composition';

// ============================================================================
// Basic Bounded Scan
// ============================================================================

/**
 * Create a scan stream that runs exactly once per input
 * Usage: 1 (constant)
 */
export function createBoundedScanStream<T>(
  initialValue: T,
  reducer: (acc: T, value: T) => T
): UsageBoundStream<T, T, T> {
  return {
    run: (input) => (state) => {
      const newState = reducer(state, input);
      return [newState, newState];
    },
    usage: onceUsage<T>(),
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

/**
 * Create a bounded scan with maximum usage validation
 */
export function createBoundedScanWithValidation<T>(
  initialValue: T,
  reducer: (acc: T, value: T) => T,
  maxUsage: Multiplicity = 1
): UsageBoundStream<T, T, T> & { maxUsage: Multiplicity } {
  const scanStream = createBoundedScanStream(initialValue, reducer);
  return withUsageValidation(scanStream, maxUsage);
}

// ============================================================================
// Conditional Bounded Scan
// ============================================================================

/**
 * Create a scan that only processes certain inputs
 * Usage: 1 for processed inputs, 0 for skipped inputs
 */
export function createConditionalBoundedScan<T>(
  initialValue: T,
  reducer: (acc: T, value: T) => T,
  predicate: (value: T) => boolean
): UsageBoundStream<T, T, T> {
  return {
    run: (input) => (state) => {
      if (predicate(input)) {
        const newState = reducer(state, input);
        return [newState, newState];
      } else {
        return [state, state]; // No change
      }
    },
    usage: conditionalUsage<T>(
      predicate,
      1, // usage when predicate is true
      0  // usage when predicate is false
    ),
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

// ============================================================================
// Dependent Bounded Scan
// ============================================================================

/**
 * Create a scan where usage depends on input properties
 * Usage: input.length for arrays, 1 for single values
 */
export function createDependentBoundedScan<T>(
  initialValue: T,
  reducer: (acc: T, value: T) => T
): UsageBoundStream<T, T, T> {
  return {
    run: (input) => (state) => {
      const newState = reducer(state, input);
      return [newState, newState];
    },
    usage: (input: T) => {
      // Usage depends on input type
      if (Array.isArray(input)) {
        return input.length;
      } else if (typeof input === 'object' && input !== null) {
        return Object.keys(input).length;
      } else {
        return 1;
      }
    },
    __brand: 'StatefulStream',
    __purity: 'State'
  };
}

// ============================================================================
// Complex Bounded Scan Examples
// ============================================================================

/**
 * Create a bounded scan for number sequences
 * Usage: 1 per input, with validation
 */
export function createNumberBoundedScan(
  maxUsage: Multiplicity = 10
): UsageBoundStream<number, number, number> & { maxUsage: Multiplicity } {
  const scanStream = createBoundedScanStream(0, (acc, value) => acc + value);
  return withUsageValidation(scanStream, maxUsage);
}

/**
 * Create a bounded scan for string concatenation
 * Usage: 1 per input, with validation
 */
export function createStringBoundedScan(
  maxUsage: Multiplicity = 5
): UsageBoundStream<string, string, string> & { maxUsage: Multiplicity } {
  const scanStream = createBoundedScanStream("", (acc, value) => acc + value);
  return withUsageValidation(scanStream, maxUsage);
}

/**
 * Create a bounded scan for array accumulation
 * Usage: 1 per input, with validation
 */
export function createArrayBoundedScan<T>(
  maxUsage: Multiplicity = 3
): UsageBoundStream<T[], T[], T[]> & { maxUsage: Multiplicity } {
  const scanStream = createBoundedScanStream<T[]>(
    [],
    (acc, value) => [...acc, ...value]
  );
  return withUsageValidation(scanStream, maxUsage);
}

// ============================================================================
// Usage-Aware Scan Pipelines
// ============================================================================

/**
 * Create a pipeline that processes numbers with bounded usage
 */
export function createBoundedNumberPipeline(
  maxUsage: Multiplicity = 5
): UsageBoundStream<number, number, number> & { maxUsage: Multiplicity } {
  // Double the input
  const double = liftStatelessUsage((x: number) => x * 2, 1);
  
  // Add one to the result
  const addOne = liftStatelessUsage((x: number) => x + 1, 1);
  
  // Compose with bounded scan
  const scan = createNumberBoundedScan(maxUsage);
  
  const pipeline = composeUsage(
    composeUsage(double, addOne),
    scan
  );
  
  return withUsageValidation(pipeline, maxUsage);
}

/**
 * Create a pipeline that processes strings with bounded usage
 */
export function createBoundedStringPipeline(
  maxUsage: Multiplicity = 3
): UsageBoundStream<string, string, string> & { maxUsage: Multiplicity } {
  // Convert to uppercase
  const toUpper = liftStatelessUsage((s: string) => s.toUpperCase(), 1);
  
  // Add prefix
  const addPrefix = liftStatelessUsage((s: string) => `PREFIX_${s}`, 1);
  
  // Compose with bounded scan
  const scan = createStringBoundedScan(maxUsage);
  
  const pipeline = composeUsage(
    composeUsage(toUpper, addPrefix),
    scan
  );
  
  return withUsageValidation(pipeline, maxUsage);
}

// ============================================================================
// Example Usage Functions
// ============================================================================

/**
 * Run examples demonstrating bounded scan functionality
 */
export function runBoundedScanExamples(): void {
  console.log("=== Bounded Scan Examples ===\n");

  // Basic bounded scan
  console.log("1. Basic Bounded Scan:");
  const basicScan = createBoundedScanStream(0, (acc, value) => acc + value);
  let state = 0;
  
  for (let i = 1; i <= 5; i++) {
    const usage = basicScan.usage(i);
    [state, state] = basicScan.run(i)(state);
    console.log(`  Input: ${i}, Usage: ${usage}, Accumulated: ${state}`);
  }
  console.log();

  // Conditional bounded scan
  console.log("2. Conditional Bounded Scan (only even numbers):");
  const conditionalScan = createConditionalBoundedScan(
    0,
    (acc, value) => acc + value,
    (value) => value % 2 === 0
  );
  state = 0;
  
  for (let i = 1; i <= 6; i++) {
    const usage = conditionalScan.usage(i);
    [state, state] = conditionalScan.run(i)(state);
    console.log(`  Input: ${i}, Usage: ${usage}, Accumulated: ${state}`);
  }
  console.log();

  // Dependent bounded scan
  console.log("3. Dependent Bounded Scan (usage based on input type):");
  const dependentScan = createDependentBoundedScan(
    0,
    (acc, value) => acc + (typeof value === 'number' ? value : 0)
  );
  
  const inputs = [1, [2, 3], { a: 4, b: 5 }, 6];
  state = 0;
  
  for (const input of inputs) {
    const usage = dependentScan.usage(input);
    [state, state] = dependentScan.run(input)(state);
    console.log(`  Input: ${JSON.stringify(input)}, Usage: ${usage}, Accumulated: ${state}`);
  }
  console.log();

  // Bounded pipeline
  console.log("4. Bounded Number Pipeline (max usage: 3):");
  const boundedPipeline = createBoundedNumberPipeline(3);
  
  try {
    for (let i = 1; i <= 4; i++) {
      const usage = boundedPipeline.usage(i);
      [state, state] = boundedPipeline.run(i)(state);
      console.log(`  Input: ${i}, Usage: ${usage}, Result: ${state}`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  console.log();

  // String bounded pipeline
  console.log("5. Bounded String Pipeline (max usage: 2):");
  const stringPipeline = createBoundedStringPipeline(2);
  let stringState = "";
  
  try {
    const strings = ["hello", "world", "test"];
    for (const str of strings) {
      const usage = stringPipeline.usage(str);
      [stringState, stringState] = stringPipeline.run(str)(stringState);
      console.log(`  Input: "${str}", Usage: ${usage}, Result: "${stringState}"`);
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  console.log();
}

/**
 * Demonstrate usage validation and error handling
 */
export function runUsageValidationExamples(): void {
  console.log("=== Usage Validation Examples ===\n");

  // Create a stream with very low usage bound
  const lowBoundScan = createBoundedScanWithValidation(
    0,
    (acc, value) => acc + value,
    1 // Very low bound
  );

  console.log("1. Usage within bounds:");
  try {
    const usage = lowBoundScan.usage(5);
    console.log(`  Usage: ${usage} (within bound of 1)`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }

  console.log("\n2. Usage exceeding bounds:");
  try {
    // This should throw an error
    const usage = lowBoundScan.usage(5);
    console.log(`  Usage: ${usage}`);
  } catch (error) {
    console.log(`  Error caught: ${error.message}`);
  }

  console.log("\n3. Composition with usage validation:");
  const double = liftStatelessUsage((x: number) => x * 2, 2); // Usage: 2
  const boundedDouble = withUsageValidation(double, 1); // Max: 1
  
  try {
    const usage = boundedDouble.usage(5);
    console.log(`  Usage: ${usage}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
}

// Export example functions for external use
export {
  runBoundedScanExamples,
  runUsageValidationExamples
}; 