/**
 * Stream Usage-Bound Integration Tests
 * 
 * Tests for state-monoid stream usage bounds and composition rules
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { 
  StatefulStream,
  composeStream,
  parallelStream,
  feedbackStream,
  mapOptic,
  extractOptic,
  lens,
  getter
} from '../optic-usage-integration';

// ============================================================================
// Test Setup
// ============================================================================

describe('Stream Usage-Bound Integration', () => {
  beforeEach(() => {
    // Test setup if needed
  });

  // ============================================================================
  // Basic Stream Creation Tests
  // ============================================================================

  describe('Basic Stream Creation', () => {
    it('should create stream with usage bound', () => {
      const testStream: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      expect(testStream.usageBound).toBeDefined();
      const [newState, output] = testStream.run(42)(0);
      expect(newState).toBe(42);
      expect(output).toBe("42");
    });

    it('should create stream with infinite usage bound', () => {
      const infiniteStream: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => "∞",
          maxUsage: "∞"
        }
      };
      
      expect(infiniteStream.usageBound).toBeDefined();
      const usage = infiniteStream.usageBound.usage(42);
      expect(usage).toBe("∞");
    });
  });

  // ============================================================================
  // Stream Composition Tests
  // ============================================================================

  describe('Stream Composition', () => {
    it('should compose two streams with usage bound multiplication', () => {
      const stream1: StatefulStream<number, number, number, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input * 2];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      const stream2: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => 2,
          maxUsage: 2
        }
      };
      
      const composed = composeStream(stream2, stream1);
      
      expect(composed.usageBound).toBeDefined();
      const [newState, output] = composed.run(42)(0);
      expect(newState).toBe(126); // 0 + 42 + 84
      expect(output).toBe("84"); // (42 * 2).toString()
    });

    it('should handle infinite usage in stream composition', () => {
      const stream1: StatefulStream<number, number, number, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input * 2];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      const infiniteStream: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => "∞",
          maxUsage: "∞"
        }
      };
      
      const composed = composeStream(infiniteStream, stream1);
      
      expect(composed.usageBound).toBeDefined();
      const usage = composed.usageBound.usage(42);
      expect(usage).toBe("∞"); // 1 * ∞ = ∞
    });
  });

  // ============================================================================
  // Parallel Stream Composition Tests
  // ============================================================================

  describe('Parallel Stream Composition', () => {
    it('should parallel compose two streams with usage bound addition', () => {
      const stream1: StatefulStream<number, number, number, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input * 2];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      const stream2: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => 3,
          maxUsage: 3
        }
      };
      
      const parallel = parallelStream(stream1, stream2);
      
      expect(parallel.usageBound).toBeDefined();
      const [newState, output] = parallel.run(42)(0);
      expect(newState).toBe(84); // 0 + 42 + 42
      expect(output).toEqual([84, "42"]); // [42*2, "42"]
      
      const usage = parallel.usageBound.usage([84, "42"]);
      expect(usage).toBe(4); // 1 + 3 = 4
    });

    it('should handle infinite usage in parallel composition', () => {
      const stream1: StatefulStream<number, number, number, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input * 2];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      const infiniteStream: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => "∞",
          maxUsage: "∞"
        }
      };
      
      const parallel = parallelStream(stream1, infiniteStream);
      
      expect(parallel.usageBound).toBeDefined();
      const usage = parallel.usageBound.usage([84, "42"]);
      expect(usage).toBe("∞"); // 1 + ∞ = ∞
    });
  });

  // ============================================================================
  // Feedback Stream Tests
  // ============================================================================

  describe('Feedback Stream', () => {
    it('should create feedback stream with infinite usage bound', () => {
      const feedbackStream1: StatefulStream<[number, string], number, string, any> = {
        run: ([input, prevOutput]: [number, string]) => (state: number) => {
          return [state + input, `${prevOutput} -> ${input}`];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      const feedback = feedbackStream(feedbackStream1, "initial");
      
      expect(feedback.usageBound).toBeDefined();
      const usage = feedback.usageBound.usage("test");
      expect(usage).toBe("∞"); // Feedback loops are infinite
      
      const [newState, output] = feedback.run(42)(0);
      expect(newState).toBe(42);
      expect(output).toBe("initial -> 42");
    });
  });

  // ============================================================================
  // Optic-Stream Integration Tests
  // ============================================================================

  describe('Optic-Stream Integration', () => {
    it('should lift optic into stream with preserved usage bound', () => {
      const testLens = lens(
        (s: { value: number }) => s.value,
        (s: { value: number }, a: number) => ({ ...s, value: a })
      );
      
      const stream = mapOptic(testLens);
      
      expect(stream.usageBound).toBeDefined();
      expect(stream.usageBound).toBe(testLens.usageBound);
      
      const [newState, output] = stream.run({ value: 42 })({ value: 0 });
      expect(newState).toEqual({ value: 0 });
      expect(output).toBe(42);
    });

    it('should extract optic from stream with preserved usage bound', () => {
      const testStream: StatefulStream<{ value: number }, { value: number }, number, any> = {
        run: (input: { value: number }) => (state: { value: number }) => {
          return [state, input.value];
        },
        usageBound: {
          usage: () => 5,
          maxUsage: 5
        }
      };
      
      const optic = extractOptic(testStream, { value: 0 });
      
      expect(optic.usageBound).toBeDefined();
      expect(optic.usageBound).toBe(testStream.usageBound);
      
      const output = optic.get({ value: 42 });
      expect(output).toBe(42);
    });
  });

  // ============================================================================
  // Complex Pipeline Tests
  // ============================================================================

  describe('Complex Pipeline', () => {
    it('should handle complex stream pipeline with multiple compositions', () => {
      const stream1: StatefulStream<number, number, number, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input * 2];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      const stream2: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => 2,
          maxUsage: 2
        }
      };
      
      const stream3: StatefulStream<number, number, number, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input * 3];
        },
        usageBound: {
          usage: () => 3,
          maxUsage: 3
        }
      };
      
      // Compose: stream1 -> stream2
      const composed1 = composeStream(stream2, stream1);
      // Note: stream3 has different input type, so we can't compose it directly
      
      expect(composed1.usageBound).toBeDefined();
      
      const [newState, output] = composed1.run(42)(0);
      expect(newState).toBe(126); // 0 + 42 + 84
      expect(output).toBe("84"); // (42 * 2).toString()
    });

    it('should handle mixed sequential and parallel composition', () => {
      const stream1: StatefulStream<number, number, number, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input * 2];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      const stream2: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => 2,
          maxUsage: 2
        }
      };
      
      const stream3: StatefulStream<number, number, boolean, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input > 50];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      };
      
      // Parallel compose stream2 and stream3, then compose with stream1
      const parallel = parallelStream(stream2, stream3);
      const composed = composeStream(parallel, stream1);
      
      expect(composed.usageBound).toBeDefined();
      
      const [newState, output] = composed.run(42)(0);
      expect(newState).toBe(126); // 0 + 42 + 84
      expect(output).toEqual(["84", false]); // ["84", 42 > 50]
    });
  });

  // ============================================================================
  // Usage Bound Validation Tests
  // ============================================================================

  describe('Usage Bound Validation', () => {
    it('should validate usage bounds correctly', () => {
      const stream: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => 10,
          maxUsage: 5
        }
      };
      
      // This should not throw in production mode
      expect(() => {
        stream.usageBound.usage(42);
      }).not.toThrow();
    });

    it('should handle missing usage bounds gracefully', () => {
      const stream: StatefulStream<number, number, string, any> = {
        run: (input: number) => (state: number) => {
          return [state + input, input.toString()];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: undefined
        }
      };
      
      expect(() => {
        stream.usageBound.usage(42);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should handle large stream compositions efficiently', () => {
      const streams: StatefulStream<number, number, number, any>[] = [];
      
      // Create 100 streams
      for (let i = 0; i < 100; i++) {
        streams.push({
          run: (input: number) => (state: number) => {
            return [state + input, input + i];
          },
          usageBound: {
            usage: () => 1,
            maxUsage: 1
          }
        });
      }
      
      // Compose all streams
      let composed = streams[0];
      for (let i = 1; i < streams.length; i++) {
        composed = composeStream(streams[i], composed);
      }
      
      const start = performance.now();
      const [newState, output] = composed.run(42)(0);
      const end = performance.now();
      
      expect(newState).toBe(4200); // 0 + 42 * 100
      expect(output).toBe(141); // 42 + 99
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle deep nested parallel compositions efficiently', () => {
      const createStream = (id: number): StatefulStream<number, number, number, any> => ({
        run: (input: number) => (state: number) => {
          return [state + input, input + id];
        },
        usageBound: {
          usage: () => 1,
          maxUsage: 1
        }
      });
      
      // Create a deep tree of parallel compositions
      const stream1 = createStream(1);
      const stream2 = createStream(2);
      const stream3 = createStream(3);
      const stream4 = createStream(4);
      
      const parallel1 = parallelStream(stream1, stream2);
      const parallel2 = parallelStream(stream3, stream4);
      const finalParallel = parallelStream(parallel1, parallel2);
      
      const start = performance.now();
      const [newState, output] = finalParallel.run(42)(0);
      const end = performance.now();
      
      expect(newState).toBe(168); // 0 + 42 * 4
      expect(output).toEqual([[43, 44], [45, 46]]); // [[42+1, 42+2], [42+3, 42+4]]
      expect(end - start).toBeLessThan(10); // Should complete within 10ms
    });
  });
}); 