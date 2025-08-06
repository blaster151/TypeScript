/**
 * Tests for Usage-Bound Stream Multiplicity System
 * 
 * This test suite verifies the usage bounds functionality, including:
 * - Sequential composition multiplies usage correctly
 * - Parallel composition preserves per-branch usage
 * - Type errors for exceeding declared maxUsage
 * - Runtime validation of usage bounds
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

import {
  UsageBoundStream,
  Multiplicity,
  constantUsage,
  onceUsage,
  neverUsage,
  infiniteUsage,
  conditionalUsage,
  isUsageBoundStream,
  hasMaxUsage
} from '../src/stream/multiplicity/types';

import {
  composeUsage,
  parallelUsage,
  fanOutUsage,
  liftStatelessUsage,
  liftStatefulUsage,
  multiplyMultiplicities,
  addMultiplicities,
  maxMultiplicities,
  validateUsage,
  withUsageValidation
} from '../src/stream/multiplicity/composition';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Helper function to run a stream and get the result
 */
function runStream<I, S, O>(
  stream: UsageBoundStream<I, S, O>,
  input: I,
  initialState: S
): [S, O] {
  return stream.run(input)(initialState);
}

/**
 * Helper function to get usage for a stream
 */
function getUsage<I, S, O>(
  stream: UsageBoundStream<I, S, O>,
  input: I
): Multiplicity {
  return stream.usage(input);
}

// ============================================================================
// Basic Usage Tests
// ============================================================================

describe('Usage-Bound Stream Basic Functionality', () => {
  it('should create a stream with constant usage', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 1);
    expect(getUsage(stream, 5)).to.equal(1);
    expect(getUsage(stream, 10)).to.equal(1);
  });

  it('should create a stream with infinite usage', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, "∞");
    expect(getUsage(stream, 5)).to.equal("∞");
    expect(getUsage(stream, 10)).to.equal("∞");
  });

  it('should create a stream with conditional usage', () => {
    const stream = liftStatelessUsage(
      (x: number) => x * 2,
      1
    );
    const conditionalStream = {
      ...stream,
      usage: conditionalUsage<number>(
        (x) => x > 5,
        2, // usage when x > 5
        0  // usage when x <= 5
      )
    };

    expect(getUsage(conditionalStream, 3)).to.equal(0);
    expect(getUsage(conditionalStream, 7)).to.equal(2);
  });

  it('should identify usage-bound streams correctly', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 1);
    expect(isUsageBoundStream(stream)).to.be.true;
    
    const regularStream = {
      run: (x: number) => (s: any) => [s, x * 2],
      __brand: 'StatefulStream',
      __purity: 'Pure' as const
    };
    expect(isUsageBoundStream(regularStream)).to.be.false;
  });

  it('should check for maxUsage bounds', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 1);
    expect(hasMaxUsage(stream)).to.be.false;
    
    const boundedStream = withUsageValidation(stream, 2);
    expect(hasMaxUsage(boundedStream)).to.be.true;
    expect(boundedStream.maxUsage).to.equal(2);
  });
});

// ============================================================================
// Sequential Composition Tests
// ============================================================================

describe('Sequential Composition', () => {
  it('should multiply finite usages correctly', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 2);
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    const composed = composeUsage(f, g);
    const usage = getUsage(composed, 5);
    
    expect(usage).to.equal(6); // 2 * 3
  });

  it('should handle infinite usage in composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, "∞");
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    const composed = composeUsage(f, g);
    const usage = getUsage(composed, 5);
    
    expect(usage).to.equal("∞");
  });

  it('should preserve stream functionality in composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 1);
    const g = liftStatelessUsage((x: number) => x + 1, 1);
    
    const composed = composeUsage(f, g);
    const [state, result] = runStream(composed, 5, 0);
    
    expect(result).to.equal(11); // (5 * 2) + 1
    expect(state).to.equal(0);
  });

  it('should handle zero usage streams', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 0);
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    const composed = composeUsage(f, g);
    const usage = getUsage(composed, 5);
    
    expect(usage).to.equal(0); // 0 * 3 = 0
  });
});

// ============================================================================
// Parallel Composition Tests
// ============================================================================

describe('Parallel Composition', () => {
  it('should preserve per-branch usage in parallel composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 2);
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    const parallel = parallelUsage(f, g);
    const usage = getUsage(parallel, [5, 10]);
    
    // For parallel composition, we take the maximum usage
    expect(usage).to.equal(3);
  });

  it('should handle infinite usage in parallel composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, "∞");
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    const parallel = parallelUsage(f, g);
    const usage = getUsage(parallel, [5, 10]);
    
    expect(usage).to.equal("∞");
  });

  it('should preserve stream functionality in parallel composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 1);
    const g = liftStatelessUsage((x: number) => x + 1, 1);
    
    const parallel = parallelUsage(f, g);
    const [state, result] = runStream(parallel, [5, 10], 0);
    
    expect(result).to.deep.equal([10, 11]); // [5*2, 10+1]
    expect(state).to.equal(0);
  });
});

// ============================================================================
// Fan-Out Composition Tests
// ============================================================================

describe('Fan-Out Composition', () => {
  it('should add usages in fan-out composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 2);
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    const fanOut = fanOutUsage(f, g);
    const usage = getUsage(fanOut, 5);
    
    expect(usage).to.equal(5); // 2 + 3
  });

  it('should handle infinite usage in fan-out composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, "∞");
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    const fanOut = fanOutUsage(f, g);
    const usage = getUsage(fanOut, 5);
    
    expect(usage).to.equal("∞");
  });

  it('should preserve stream functionality in fan-out composition', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 1);
    const g = liftStatelessUsage((x: number) => x + 1, 1);
    
    const fanOut = fanOutUsage(f, g);
    const [state, result] = runStream(fanOut, 5, 0);
    
    expect(result).to.deep.equal([10, 6]); // [5*2, 5+1]
    expect(state).to.equal(0);
  });
});

// ============================================================================
// Usage Validation Tests
// ============================================================================

describe('Usage Validation', () => {
  it('should validate usage within bounds', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 1);
    const usage = validateUsage(stream, 5, 2);
    expect(usage).to.equal(1);
  });

  it('should throw error when usage exceeds bounds', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 3);
    
    expect(() => {
      validateUsage(stream, 5, 2);
    }).to.throw('Usage 3 exceeds maximum bound 2');
  });

  it('should allow infinite usage when bound is infinite', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, "∞");
    const usage = validateUsage(stream, 5, "∞");
    expect(usage).to.equal("∞");
  });

  it('should allow finite usage when bound is infinite', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 5);
    const usage = validateUsage(stream, 5, "∞");
    expect(usage).to.equal(5);
  });

  it('should create stream with usage validation', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 1);
    const validatedStream = withUsageValidation(stream, 2);
    
    expect(hasMaxUsage(validatedStream)).to.be.true;
    expect(validatedStream.maxUsage).to.equal(2);
    
    // Should not throw for valid usage
    const usage = getUsage(validatedStream, 5);
    expect(usage).to.equal(1);
  });
});

// ============================================================================
// Multiplicity Arithmetic Tests
// ============================================================================

describe('Multiplicity Arithmetic', () => {
  it('should multiply finite multiplicities', () => {
    expect(multiplyMultiplicities(2, 3)).to.equal(6);
    expect(multiplyMultiplicities(0, 5)).to.equal(0);
    expect(multiplyMultiplicities(1, 7)).to.equal(7);
  });

  it('should handle infinite multiplication', () => {
    expect(multiplyMultiplicities("∞", 3)).to.equal("∞");
    expect(multiplyMultiplicities(2, "∞")).to.equal("∞");
    expect(multiplyMultiplicities("∞", "∞")).to.equal("∞");
  });

  it('should add finite multiplicities', () => {
    expect(addMultiplicities(2, 3)).to.equal(5);
    expect(addMultiplicities(0, 5)).to.equal(5);
    expect(addMultiplicities(1, 7)).to.equal(8);
  });

  it('should handle infinite addition', () => {
    expect(addMultiplicities("∞", 3)).to.equal("∞");
    expect(addMultiplicities(2, "∞")).to.equal("∞");
    expect(addMultiplicities("∞", "∞")).to.equal("∞");
  });

  it('should find maximum of finite multiplicities', () => {
    expect(maxMultiplicities(2, 3)).to.equal(3);
    expect(maxMultiplicities(5, 1)).to.equal(5);
    expect(maxMultiplicities(0, 0)).to.equal(0);
  });

  it('should handle infinite maximum', () => {
    expect(maxMultiplicities("∞", 3)).to.equal("∞");
    expect(maxMultiplicities(2, "∞")).to.equal("∞");
    expect(maxMultiplicities("∞", "∞")).to.equal("∞");
  });
});

// ============================================================================
// Complex Pipeline Tests
// ============================================================================

describe('Complex Usage-Bound Pipelines', () => {
  it('should handle complex sequential composition', () => {
    const double = liftStatelessUsage((x: number) => x * 2, 1);
    const addOne = liftStatelessUsage((x: number) => x + 1, 2);
    const square = liftStatelessUsage((x: number) => x * x, 3);
    
    const pipeline = composeUsage(
      composeUsage(double, addOne),
      square
    );
    
    const usage = getUsage(pipeline, 5);
    expect(usage).to.equal(6); // 1 * 2 * 3
    
    const [state, result] = runStream(pipeline, 5, 0);
    expect(result).to.equal(121); // ((5 * 2) + 1)²
  });

  it('should handle mixed parallel and sequential composition', () => {
    const double = liftStatelessUsage((x: number) => x * 2, 1);
    const addOne = liftStatelessUsage((x: number) => x + 1, 2);
    const square = liftStatelessUsage((x: number) => x * x, 3);
    
    const parallel = parallelUsage(double, addOne);
    // Note: This composition has type issues due to parallel output being a tuple
    // but square expecting a single number. In practice, we'd need a different approach.
    const usage = getUsage(parallel, [5, 10]);
    expect(usage).to.equal(2); // max(1, 2)
    
    const [state, result] = runStream(parallel, [5, 10], 0);
    expect(result).to.deep.equal([10, 11]); // [5*2, 10+1]
  });

  it('should handle conditional usage in pipelines', () => {
    const double = liftStatelessUsage((x: number) => x * 2, 1);
    const conditional = {
      ...double,
      usage: conditionalUsage<number>(
        (x) => x > 5,
        2, // usage when x > 5
        0  // usage when x <= 5
      )
    };
    
    const addOne = liftStatelessUsage((x: number) => x + 1, 1);
    const pipeline = composeUsage(conditional, addOne);
    
    // For x = 3 (<= 5): usage = 0 * 1 = 0
    expect(getUsage(pipeline, 3)).to.equal(0);
    
    // For x = 7 (> 5): usage = 2 * 1 = 2
    expect(getUsage(pipeline, 7)).to.equal(2);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle runtime usage validation errors', () => {
    const stream = liftStatelessUsage((x: number) => x * 2, 5);
    const validatedStream = withUsageValidation(stream, 3);
    
    expect(() => {
      getUsage(validatedStream, 5);
    }).to.throw('Usage 5 exceeds maximum bound 3');
  });

  it('should handle composition with invalid usage bounds', () => {
    const f = liftStatelessUsage((x: number) => x * 2, 2);
    const g = liftStatelessUsage((x: number) => x + 1, 3);
    
    // This should work fine since 2 * 3 = 6 <= 10
    const validComposition = composeUsage(f, g);
    expect(getUsage(validComposition, 5)).to.equal(6);
    
    // But if we add validation with a lower bound, it should fail
    const validatedComposition = withUsageValidation(validComposition, 5);
    expect(() => {
      getUsage(validatedComposition, 5);
    }).to.throw('Usage 6 exceeds maximum bound 5');
  });
}); 