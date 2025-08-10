/**
 * Fluent Usage-Bound API Tests
 * 
 * Tests for fluent API wrappers that propagate and enforce multiplicity bounds
 * from the registry across all fluent method chains.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { 
  FluentOps, 
  FluentOpsImpl, 
  UsageBound, 
  multiplyUsageBounds,
  filterUsageBound,
  scanUsageBound,
  takeUsageBound,
  getUsageBoundForType,
  fluent,
  fluentOnce,
  fluentInfinite
} from '../fluent-usage-wrapper';

import { 
  getUsageBound, 
  registerUsage 
} from '../usageRegistry';

// ============================================================================
// Test Setup
// ============================================================================

describe('Fluent Usage-Bound API', () => {
  beforeEach(() => {
    // Register test usage bounds
    registerUsage('TestType', (input: any) => 1);
    registerUsage('ArrayType', (input: any[]) => input.length);
  });

  // ============================================================================
  // Basic Fluent Operations Tests
  // ============================================================================

  describe('Basic Fluent Operations', () => {
    it('should propagate usage bounds through map operations', () => {
      // Create a fluent wrapper with usage = 1
      const wrapper = fluentOnce(42);
      
      // Chain map operations
      const result = wrapper
        .map(x => x * 2)      // usage = 1
        .map(x => x.toString()) // usage = 1
        .map(x => x.length);  // usage = 1
      
      // Total usage should be 1 (map operations don't multiply usage)
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(1);
    });

    it('should handle filter operations correctly', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .filter(x => x > 40)  // usage = 1 (passes filter)
        .map(x => x * 2);     // usage = 1
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(1);
    });

    it('should handle filter operations that reject values', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .filter(x => x < 40)  // usage = 0 (fails filter)
        .map(x => x * 2);     // usage = 0
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(0);
    });

    it('should handle scan operations correctly', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .scan(0, (acc, x) => acc + x)  // usage = 1
        .map(x => x.toString());       // usage = 1
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(1);
    });

    it('should handle take operations correctly', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .take(1)              // usage = min(1, 1) = 1
        .map(x => x * 2);     // usage = 1
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(1);
    });

    it('should handle take operations that limit usage', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .take(0)              // usage = min(1, 0) = 0
        .map(x => x * 2);     // usage = 0
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(0);
    });
  });

  // ============================================================================
  // Chain/FlatMap Tests
  // ============================================================================

  describe('Chain/FlatMap Operations', () => {
    it('should multiply usage bounds for chain operations', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .chain(x => fluentOnce(x * 2))  // usage = 1 * 1 = 1
        .chain(x => fluentOnce(x.toString())); // usage = 1 * 1 = 1
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(1);
    });

    it('should handle infinite usage in chain operations', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .chain(x => fluentInfinite(x * 2))  // usage = 1 * ∞ = ∞
        .map(x => x.toString());            // usage = ∞
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe("∞");
    });

    it('should handle flatMap operations (alias for chain)', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .flatMap(x => fluentOnce(x * 2))  // usage = 1 * 1 = 1
        .flatMap(x => fluentOnce(x.toString())); // usage = 1 * 1 = 1
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(1);
    });
  });

  // ============================================================================
  // Complex Pipeline Tests
  // ============================================================================

  describe('Complex Pipeline Operations', () => {
    it('should handle complex pipelines with multiple operations', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .map(x => x * 2)                    // usage = 1
        .filter(x => x > 50)               // usage = 1
        .map(x => x.toString())            // usage = 1
        .chain(x => fluentOnce(x.length))  // usage = 1 * 1 = 1
        .map(x => x * 10);                 // usage = 1
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(1);
    });

    it('should handle pipelines with conditional operations', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .map(x => x * 2)                    // usage = 1
        .filter(x => x > 100)              // usage = 0 (fails filter)
        .map(x => x.toString())            // usage = 0
        .chain(x => fluentOnce(x.length))  // usage = 0 * 1 = 0
        .map(x => x * 10);                 // usage = 0
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(0);
    });

    it('should handle pipelines with infinite usage', () => {
      const wrapper = fluentOnce(42);
      
      const result = wrapper
        .map(x => x * 2)                    // usage = 1
        .chain(x => fluentInfinite(x))     // usage = 1 * ∞ = ∞
        .map(x => x.toString())            // usage = ∞
        .filter(x => x.length > 0)         // usage = ∞
        .take(10);                         // usage = min(∞, 10) = 10
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(10);
    });
  });

  // ============================================================================
  // Registry Integration Tests
  // ============================================================================

  describe('Registry Integration', () => {
    it('should use usage bounds from registry', () => {
      // Register a custom usage bound
      registerUsage('CustomType', (input: any) => 5);
      
      // Create wrapper with registry usage
      const wrapper = fluent(42, getUsageBound('CustomType')!);
      
      const result = wrapper
        .map(x => x * 2)      // usage = 5
        .map(x => x.toString()); // usage = 5
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe(5);
    });

    it('should fall back to infinite usage when not in registry', () => {
      const wrapper = fluent(42, getUsageBound('NonExistentType') || (() => "∞"));
      
      const result = wrapper
        .map(x => x * 2)      // usage = ∞
        .map(x => x.toString()); // usage = ∞
      
      const usage = result.validateUsage(result.getValue());
      expect(usage).toBe("∞");
    });
  });

  // ============================================================================
  // Usage Bound Propagation Tests
  // ============================================================================

  describe('Usage Bound Propagation', () => {
    it('should multiply usage bounds correctly', () => {
      const bound1: UsageBound<number> = {
        usage: () => 2,
        maxUsage: 5
      };
      
      const bound2: UsageBound<string> = {
        usage: () => 3,
        maxUsage: 10
      };
      
      const multiplied = multiplyUsageBounds(bound1, bound2);
      const usage = multiplied.usage("test");
      
      expect(usage).toBe(6); // 2 * 3 = 6
    });

    it('should handle infinite usage in multiplication', () => {
      const bound1: UsageBound<number> = {
        usage: () => 2,
        maxUsage: 5
      };
      
      const bound2: UsageBound<string> = {
        usage: () => "∞" as any,
        maxUsage: "∞"
      };
      
      const multiplied = multiplyUsageBounds(bound1, bound2);
      const usage = multiplied.usage("test");
      
      expect(usage).toBe("∞");
    });

    it('should handle take operations correctly', () => {
      const bound: UsageBound<number> = {
        usage: () => 10,
        maxUsage: 15
      };
      
      const takeBound = takeUsageBound(bound, 5);
      const usage = takeBound.usage(42);
      
      expect(usage).toBe(5); // min(10, 5) = 5
    });

    it('should handle take operations with infinite usage', () => {
      const bound: UsageBound<number> = {
        usage: () => "∞" as any,
        maxUsage: "∞"
      };
      
      const takeBound = takeUsageBound(bound, 5);
      const usage = takeBound.usage(42);
      
      expect(usage).toBe(5); // min(∞, 5) = 5
    });
  });

  // ============================================================================
  // Runtime Validation Tests
  // ============================================================================

  describe('Runtime Validation', () => {
    it('should validate usage bounds in development mode', () => {
      // Set development mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const wrapper = fluent(42, () => 10, 5); // usage = 10, maxUsage = 5
      
      // This should throw an error in development mode
      expect(() => {
        wrapper.validateUsage(42);
      }).toThrow('Usage 10 exceeds maximum bound 5');
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not validate usage bounds in production mode', () => {
      // Set production mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const wrapper = fluent(42, () => 10, 5); // usage = 10, maxUsage = 5
      
      // This should not throw an error in production mode
      expect(() => {
        wrapper.validateUsage(42);
      }).not.toThrow();
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing registry gracefully', () => {
      const wrapper = fluent(42, () => 1);
      
      // Should not throw when registry is not available
      expect(() => {
        wrapper.validateUsage(42);
      }).not.toThrow();
    });

    it('should handle invalid usage functions gracefully', () => {
      const invalidUsage = (input: any) => 'invalid' as any;
      const wrapper = fluent(42, invalidUsage);
      
      // Should handle invalid usage functions
      expect(() => {
        wrapper.validateUsage(42);
      }).not.toThrow();
    });
  });
}); 