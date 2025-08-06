/**
 * Typeclass Usage-Bound Propagation Tests
 * 
 * Tests for automatic usage bound propagation across Functor, Applicative, Monad, and Traversable
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { 
  deriveInstancesWithUsage,
  deriveMaybeInstances,
  deriveArrayInstances,
  deriveEitherInstances,
  deriveObservableLiteInstances,
  createUsageBound,
  getTypeUsageBound,
  registerTypeUsageBound,
  Functor,
  Applicative,
  Monad,
  Traversable
} from '../fp-typeclass-usage-derivation';

// ============================================================================
// Test Setup
// ============================================================================

describe('Typeclass Usage-Bound Propagation', () => {
  beforeEach(() => {
    // Test setup if needed
  });

  // ============================================================================
  // Functor Usage Bound Tests
  // ============================================================================

  describe('Functor Usage Bound Propagation', () => {
    it('should preserve usage bound when mapping over Maybe', () => {
      const maybeInstances = deriveMaybeInstances();
      
      expect(maybeInstances.functor).toBeDefined();
      expect(maybeInstances.usageBound).toBeDefined();
      
      // Create a mock Maybe value with usage bound = 1
      const mockMaybe = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      const mapped = maybeInstances.functor!.map(mockMaybe as any, (x: number) => x * 2);
      
      // Usage bound should be preserved (1)
      expect((mapped as any).usageBound).toBeDefined();
      const usage = (mapped as any).usageBound.usage(42);
      expect(usage).toBe(1);
    });

    it('should preserve usage bound when mapping over Array', () => {
      const arrayInstances = deriveArrayInstances();
      
      expect(arrayInstances.functor).toBeDefined();
      expect(arrayInstances.usageBound).toBeDefined();
      
      // Create a mock Array value with usage bound = "∞"
      const mockArray = {
        value: [1, 2, 3],
        usageBound: createUsageBound("∞")
      };
      
      const mapped = arrayInstances.functor!.map(mockArray as any, (x: number) => x * 2);
      
      // Usage bound should be preserved ("∞")
      expect((mapped as any).usageBound).toBeDefined();
      const usage = (mapped as any).usageBound.usage([1, 2, 3]);
      expect(usage).toBe("∞");
    });

    it('should preserve usage bound when mapping over Either', () => {
      const eitherInstances = deriveEitherInstances();
      
      expect(eitherInstances.functor).toBeDefined();
      expect(eitherInstances.usageBound).toBeDefined();
      
      // Create a mock Either value with usage bound = 1
      const mockEither = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      const mapped = eitherInstances.functor!.map(mockEither as any, (x: number) => x.toString());
      
      // Usage bound should be preserved (1)
      expect((mapped as any).usageBound).toBeDefined();
      const usage = (mapped as any).usageBound.usage(42);
      expect(usage).toBe(1);
    });
  });

  // ============================================================================
  // Applicative Usage Bound Tests
  // ============================================================================

  describe('Applicative Usage Bound Propagation', () => {
    it('should multiply usage bounds when applying Maybe functor to Maybe functor', () => {
      const maybeInstances = deriveMaybeInstances();
      
      expect(maybeInstances.applicative).toBeDefined();
      
      // Create mock values with usage bound = 1
      const mockFab = {
        value: (x: number) => x * 2,
        usageBound: createUsageBound(1)
      };
      
      const mockFa = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      const applied = maybeInstances.applicative!.ap(mockFab as any, mockFa as any);
      
      // Usage bound should be multiplied: 1 * 1 = 1
      expect((applied as any).usageBound).toBeDefined();
      const usage = (applied as any).usageBound.usage(42);
      expect(usage).toBe(1);
    });

    it('should handle infinite usage in applicative composition', () => {
      const maybeInstances = deriveMaybeInstances();
      
      // Create mock values with different usage bounds
      const mockFab = {
        value: (x: number) => x * 2,
        usageBound: createUsageBound(1)
      };
      
      const mockFa = {
        value: [1, 2, 3],
        usageBound: createUsageBound("∞")
      };
      
      const applied = maybeInstances.applicative!.ap(mockFab as any, mockFa as any);
      
      // Usage bound should be multiplied: 1 * ∞ = ∞
      expect((applied as any).usageBound).toBeDefined();
      const usage = (applied as any).usageBound.usage(42);
      expect(usage).toBe("∞");
    });

    it('should multiply usage bounds when applying Array functor to Array functor', () => {
      const arrayInstances = deriveArrayInstances();
      
      expect(arrayInstances.applicative).toBeDefined();
      
      // Create mock values with usage bound = "∞"
      const mockFab = {
        value: [(x: number) => x * 2],
        usageBound: createUsageBound("∞")
      };
      
      const mockFa = {
        value: [1, 2, 3],
        usageBound: createUsageBound("∞")
      };
      
      const applied = arrayInstances.applicative!.ap(mockFab as any, mockFa as any);
      
      // Usage bound should be multiplied: ∞ * ∞ = ∞
      expect((applied as any).usageBound).toBeDefined();
      const usage = (applied as any).usageBound.usage([1, 2, 3]);
      expect(usage).toBe("∞");
    });
  });

  // ============================================================================
  // Monad Usage Bound Tests
  // ============================================================================

  describe('Monad Usage Bound Propagation', () => {
    it('should multiply usage bounds when chaining Maybe with bound-1 function', () => {
      const maybeInstances = deriveMaybeInstances();
      
      expect(maybeInstances.monad).toBeDefined();
      
      // Create a mock Maybe value with usage bound = 1
      const mockFa = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      // Create a function that returns Maybe with usage bound = 1
      const mockF = (x: number) => ({
        value: x * 2,
        usageBound: createUsageBound(1)
      });
      
      const chained = maybeInstances.monad!.chain(mockFa as any, mockF);
      
      // Usage bound should be multiplied: 1 * 1 = 1
      expect((chained as any).usageBound).toBeDefined();
      const usage = (chained as any).usageBound.usage(42);
      expect(usage).toBe(1);
    });

    it('should multiply usage bounds when chaining Maybe with bound-2 function', () => {
      const maybeInstances = deriveMaybeInstances();
      
      // Create a mock Maybe value with usage bound = 1
      const mockFa = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      // Create a function that returns Maybe with usage bound = 2
      const mockF = (x: number) => ({
        value: x * 2,
        usageBound: createUsageBound(2)
      });
      
      const chained = maybeInstances.monad!.chain(mockFa as any, mockF);
      
      // Usage bound should be multiplied: 1 * 2 = 2
      expect((chained as any).usageBound).toBeDefined();
      const usage = (chained as any).usageBound.usage(42);
      expect(usage).toBe(2);
    });

    it('should handle infinite usage in monad composition', () => {
      const maybeInstances = deriveMaybeInstances();
      
      // Create a mock Maybe value with usage bound = 1
      const mockFa = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      // Create a function that returns Array with usage bound = "∞"
      const mockF = (x: number) => ({
        value: [x * 2],
        usageBound: createUsageBound("∞")
      });
      
      const chained = maybeInstances.monad!.chain(mockFa as any, mockF);
      
      // Usage bound should be multiplied: 1 * ∞ = ∞
      expect((chained as any).usageBound).toBeDefined();
      const usage = (chained as any).usageBound.usage(42);
      expect(usage).toBe("∞");
    });
  });

  // ============================================================================
  // Traversable Usage Bound Tests
  // ============================================================================

  describe('Traversable Usage Bound Propagation', () => {
    it('should multiply usage bounds when traversing Array with Maybe', () => {
      const arrayInstances = deriveArrayInstances();
      
      expect(arrayInstances.traversable).toBeDefined();
      
      // Create a mock Array value with usage bound = "∞"
      const mockFa = {
        value: [1, 2, 3],
        usageBound: createUsageBound("∞")
      };
      
      // Create a function that returns Maybe with usage bound = 1
      const mockF = (x: number) => ({
        value: x * 2,
        usageBound: createUsageBound(1)
      });
      
      const traversed = arrayInstances.traversable!.traverse(mockFa as any, mockF);
      
      // Usage bound should be multiplied: ∞ * 1 = ∞
      expect((traversed as any).usageBound).toBeDefined();
      const usage = (traversed as any).usageBound.usage([1, 2, 3]);
      expect(usage).toBe("∞");
    });

    it('should multiply usage bounds when traversing Array with Array', () => {
      const arrayInstances = deriveArrayInstances();
      
      // Create a mock Array value with usage bound = "∞"
      const mockFa = {
        value: [1, 2, 3],
        usageBound: createUsageBound("∞")
      };
      
      // Create a function that returns Array with usage bound = "∞"
      const mockF = (x: number) => ({
        value: [x * 2],
        usageBound: createUsageBound("∞")
      });
      
      const traversed = arrayInstances.traversable!.traverse(mockFa as any, mockF);
      
      // Usage bound should be multiplied: ∞ * ∞ = ∞
      expect((traversed as any).usageBound).toBeDefined();
      const usage = (traversed as any).usageBound.usage([1, 2, 3]);
      expect(usage).toBe("∞");
    });
  });

  // ============================================================================
  // Registry Integration Tests
  // ============================================================================

  describe('Registry Integration', () => {
    it('should use default usage bounds from registry', () => {
      // Register custom usage bound
      registerTypeUsageBound('CustomType', 5);
      
      const customInstances = deriveInstancesWithUsage({
        map: (fa, f) => fa as any,
        typeKey: 'CustomType',
        functor: true
      });
      
      expect(customInstances.usageBound).toBeDefined();
      const usage = customInstances.usageBound.usage(42);
      expect(usage).toBe(5);
    });

    it('should fall back to infinite usage when type not in registry', () => {
      const unknownInstances = deriveInstancesWithUsage({
        map: (fa, f) => fa as any,
        typeKey: 'UnknownType',
        functor: true
      });
      
      expect(unknownInstances.usageBound).toBeDefined();
      const usage = unknownInstances.usageBound.usage(42);
      expect(usage).toBe("∞");
    });

    it('should use provided usage bound over registry default', () => {
      // Register default usage bound
      registerTypeUsageBound('TestType', 10);
      
      const customInstances = deriveInstancesWithUsage({
        map: (fa, f) => fa as any,
        typeKey: 'TestType',
        usageBound: createUsageBound(3),
        functor: true
      });
      
      expect(customInstances.usageBound).toBeDefined();
      const usage = customInstances.usageBound.usage(42);
      expect(usage).toBe(3); // Should use provided bound, not registry default
    });
  });

  // ============================================================================
  // Complex Composition Tests
  // ============================================================================

  describe('Complex Composition', () => {
    it('should handle complex functor composition with mixed bounds', () => {
      const maybeInstances = deriveMaybeInstances();
      const arrayInstances = deriveArrayInstances();
      
      // Create mock values with different usage bounds
      const mockMaybe = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      const mockArray = {
        value: [1, 2, 3],
        usageBound: createUsageBound("∞")
      };
      
      // Map over Maybe (preserves bound = 1)
      const mappedMaybe = maybeInstances.functor!.map(mockMaybe as any, (x: number) => x * 2);
      expect((mappedMaybe as any).usageBound.usage(42)).toBe(1);
      
      // Map over Array (preserves bound = "∞")
      const mappedArray = arrayInstances.functor!.map(mockArray as any, (x: number) => x * 2);
      expect((mappedArray as any).usageBound.usage([1, 2, 3])).toBe("∞");
    });

    it('should handle complex monad composition with mixed bounds', () => {
      const maybeInstances = deriveMaybeInstances();
      
      // Create a mock Maybe value with usage bound = 1
      const mockFa = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      // Create a function that returns Maybe with usage bound = 3
      const mockF = (x: number) => ({
        value: x * 2,
        usageBound: createUsageBound(3)
      });
      
      // Chain Maybe with bound-3 function
      const chained = maybeInstances.monad!.chain(mockFa as any, mockF);
      
      // Usage bound should be multiplied: 1 * 3 = 3
      expect((chained as any).usageBound.usage(42)).toBe(3);
    });

    it('should handle complex traversable composition with mixed bounds', () => {
      const arrayInstances = deriveArrayInstances();
      
      // Create a mock Array value with usage bound = "∞"
      const mockFa = {
        value: [1, 2, 3],
        usageBound: createUsageBound("∞")
      };
      
      // Create a function that returns Maybe with usage bound = 1
      const mockF = (x: number) => ({
        value: x * 2,
        usageBound: createUsageBound(1)
      });
      
      // Traverse Array with Maybe
      const traversed = arrayInstances.traversable!.traverse(mockFa as any, mockF);
      
      // Usage bound should be multiplied: ∞ * 1 = ∞
      expect((traversed as any).usageBound.usage([1, 2, 3])).toBe("∞");
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should handle large compositions efficiently', () => {
      const maybeInstances = deriveMaybeInstances();
      
      // Create a large chain of operations
      let current = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      const start = performance.now();
      
      // Chain 100 operations
      for (let i = 0; i < 100; i++) {
        const mockF = (x: number) => ({
          value: x + 1,
          usageBound: createUsageBound(1)
        });
        current = maybeInstances.monad!.chain(current as any, mockF) as any;
      }
      
      const end = performance.now();
      
      expect((current as any).usageBound.usage(42)).toBe(1); // 1 * 1^100 = 1
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle mixed bound compositions efficiently', () => {
      const maybeInstances = deriveMaybeInstances();
      
      // Create a chain with mixed bounds
      let current = {
        value: 42,
        usageBound: createUsageBound(1)
      };
      
      const start = performance.now();
      
      // Chain operations with different bounds
      for (let i = 0; i < 50; i++) {
        const mockF = (x: number) => ({
          value: x + 1,
          usageBound: createUsageBound(i % 2 === 0 ? 1 : 2)
        });
        current = maybeInstances.monad!.chain(current as any, mockF) as any;
      }
      
      const end = performance.now();
      
      // Final bound should be 1 * 2^25 (every other operation has bound = 2)
      expect((current as any).usageBound.usage(42)).toBe("∞"); // 2^25 > 1, so becomes "∞"
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });
  });
}); 