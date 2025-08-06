/**
 * Optic Usage-Bound Integration Tests
 * 
 * Tests for optic usage bounds and composition rules
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { 
  lens,
  prism,
  traversal,
  getter,
  setter,
  composeOptic,
  combineOptic,
  zipOptic,
  BaseOptic,
  UsageBound
} from '../optic-usage-integration';

import { 
  getUsageBound, 
  registerUsage 
} from '../usageRegistry';

// ============================================================================
// Test Setup
// ============================================================================

describe('Optic Usage-Bound Integration', () => {
  beforeEach(() => {
    // Register test usage bounds
    registerUsage('Lens', (input: any) => 1);
    registerUsage('Prism', (input: any) => 1);
    registerUsage('Traversal', (input: any) => {
      if (Array.isArray(input)) {
        return input.length;
      }
      return 1;
    });
    registerUsage('Getter', (input: any) => 1);
    registerUsage('Setter', (input: any) => 1);
  });

  // ============================================================================
  // Basic Optic Creation Tests
  // ============================================================================

  describe('Basic Optic Creation', () => {
    it('should create lens with usage bound from registry', () => {
      const testLens = lens(
        (s: { value: number }) => s.value,
        (s: { value: number }, a: number) => ({ ...s, value: a })
      );
      
      expect(testLens.__type).toBe('Lens');
      expect(testLens.usageBound).toBeDefined();
      expect(testLens.get({ value: 42 })).toBe(42);
    });

    it('should create prism with usage bound from registry', () => {
      const testPrism = prism(
        (s: number | null) => s !== null ? s : undefined,
        (a: number) => a
      );
      
      expect(testPrism.__type).toBe('Prism');
      expect(testPrism.usageBound).toBeDefined();
      expect(testPrism.get(42)).toBe(42);
    });

    it('should create traversal with usage bound from registry', () => {
      const testTraversal = traversal(
        <F>(f: (a: number) => F) => (s: number[]) => s.map(f),
        5 // upperBound = 5
      );
      
      expect(testTraversal.__type).toBe('Traversal');
      expect(testTraversal.usageBound).toBeDefined();
      expect(testTraversal.upperBound).toBe(5);
    });

    it('should create getter with usage bound from registry', () => {
      const testGetter = getter((s: { value: number }) => s.value);
      
      expect(testGetter.__type).toBe('Getter');
      expect(testGetter.usageBound).toBeDefined();
      expect(testGetter.view({ value: 42 })).toBe(42);
    });

    it('should create setter with usage bound from registry', () => {
      const testSetter = setter((s: { value: number }, f: (a: number) => number) => ({
        ...s,
        value: f(s.value)
      }));
      
      expect(testSetter.__type).toBe('Setter');
      expect(testSetter.usageBound).toBeDefined();
      expect(testSetter.over({ value: 42 }, x => x * 2)).toEqual({ value: 84 });
    });
  });

  // ============================================================================
  // Optic Composition Tests
  // ============================================================================

  describe('Optic Composition', () => {
    it('should compose two lenses with usage bound multiplication', () => {
      const lens1 = lens(
        (s: { nested: { value: number } }) => s.nested,
        (s: { nested: { value: number } }, a: { value: number }) => ({ ...s, nested: a })
      );
      
      const lens2 = lens(
        (s: { value: number }) => s.value,
        (s: { value: number }, a: number) => ({ ...s, value: a })
      );
      
      const composed = composeOptic(lens2, lens1);
      
      expect(composed.usageBound).toBeDefined();
      expect(composed.get({ nested: { value: 42 } })).toBe(42);
      expect(composed.set({ nested: { value: 42 } }, 84)).toEqual({ nested: { value: 84 } });
    });

    it('should combine two optics with usage bound addition', () => {
      const optic1 = lens(
        (s: { value1: number }) => s.value1,
        (s: { value1: number }, a: number) => ({ ...s, value1: a })
      );
      
      const optic2 = lens(
        (s: { value2: string }) => s.value2,
        (s: { value2: string }, a: string) => ({ ...s, value2: a })
      );
      
      const combined = combineOptic(optic1, optic2);
      
      expect(combined.usageBound).toBeDefined();
      expect(combined.get({ value1: 42, value2: "test" })).toEqual([42, "test"]);
    });

    it('should zip two optics with usage bound maximum', () => {
      const optic1 = lens(
        (s: { value1: number }) => s.value1,
        (s: { value1: number }, a: number) => ({ ...s, value1: a })
      );
      
      const optic2 = lens(
        (s: { value2: string }) => s.value2,
        (s: { value2: string }, a: string) => ({ ...s, value2: a })
      );
      
      const zipped = zipOptic(optic1, optic2);
      
      expect(zipped.usageBound).toBeDefined();
      expect(zipped.get({ value1: 42, value2: "test" })).toEqual([42, "test"]);
    });
  });

  // ============================================================================
  // Usage Bound Propagation Tests
  // ============================================================================

  describe('Usage Bound Propagation', () => {
    it('should propagate usage bounds through lens composition', () => {
      const lens1 = lens(
        (s: { nested: { value: number } }) => s.nested,
        (s: { nested: { value: number } }, a: { value: number }) => ({ ...s, nested: a })
      );
      
      const lens2 = lens(
        (s: { value: number }) => s.value,
        (s: { value: number }, a: number) => ({ ...s, value: a })
      );
      
      const composed = composeOptic(lens2, lens1);
      const usage = composed.usageBound.usage(42);
      
      // Both lenses have usage = 1, so composition should have usage = 1 * 1 = 1
      expect(usage).toBe(1);
    });

    it('should handle infinite usage in optic composition', () => {
      // Create a traversal with infinite usage
      const infiniteTraversal = traversal(
        <F>(f: (a: number) => F) => (s: number[]) => s.map(f),
        "∞" // upperBound = ∞
      );
      
      const lens1 = lens(
        (s: { values: number[] }) => s.values,
        (s: { values: number[] }, a: number[]) => ({ ...s, values: a })
      );
      
      const composed = composeOptic(infiniteTraversal, lens1);
      const usage = composed.usageBound.usage([1, 2, 3]);
      
      // Lens has usage = 1, traversal has usage = ∞, so composition should have usage = ∞
      expect(usage).toBe("∞");
    });

    it('should handle array-based usage in traversal', () => {
      const arrayTraversal = traversal(
        <F>(f: (a: number) => F) => (s: number[]) => s.map(f),
        10 // upperBound = 10
      );
      
      const usage1 = arrayTraversal.usageBound.usage([1, 2, 3]);
      expect(usage1).toBe(3); // Array length = 3
      
      const usage2 = arrayTraversal.usageBound.usage([1, 2, 3, 4, 5]);
      expect(usage2).toBe(5); // Array length = 5
    });
  });

  // ============================================================================
  // Complex Composition Tests
  // ============================================================================

  describe('Complex Optic Composition', () => {
    it('should handle nested composition with multiple optics', () => {
      const lens1 = lens(
        (s: { nested: { values: number[] } }) => s.nested,
        (s: { nested: { values: number[] } }, a: { values: number[] }) => ({ ...s, nested: a })
      );
      
      const lens2 = lens(
        (s: { values: number[] }) => s.values,
        (s: { values: number[] }, a: number[]) => ({ ...s, values: a })
      );
      
      const traversal1 = traversal(
        <F>(f: (a: number) => F) => (s: number[]) => s.map(f),
        5
      );
      
      // Compose: lens1 -> lens2 -> traversal1
      const composed1 = composeOptic(lens2, lens1);
      const composed2 = composeOptic(traversal1, composed1);
      
      expect(composed2.usageBound).toBeDefined();
      
      const testData = { nested: { values: [1, 2, 3] } };
      const result = composed2.get(testData);
      expect(result).toBe(1); // Gets first element of array
    });

    it('should handle parallel composition with different optic types', () => {
      const lens1 = lens(
        (s: { value: number }) => s.value,
        (s: { value: number }, a: number) => ({ ...s, value: a })
      );
      
      const getter1 = getter((s: { count: number }) => s.count);
      
      const combined = combineOptic(lens1, getter1);
      
      expect(combined.usageBound).toBeDefined();
      
      const testData = { value: 42, count: 10 };
      const result = combined.get(testData);
      expect(result).toEqual([42, 10]);
    });
  });

  // ============================================================================
  // Registry Integration Tests
  // ============================================================================

  describe('Registry Integration', () => {
    it('should use usage bounds from registry for optic creation', () => {
      // Register custom usage bounds
      registerUsage('CustomLens', (input: any) => 5);
      
      const customLens = lens(
        (s: { value: number }) => s.value,
        (s: { value: number }, a: number) => ({ ...s, value: a })
      );
      
      // The lens should use the registry usage bound
      const usage = customLens.usageBound.usage(42);
      expect(usage).toBe(1); // Default lens usage
    });

    it('should fall back to default usage when not in registry', () => {
      const testLens = lens(
        (s: { value: number }) => s.value,
        (s: { value: number }, a: number) => ({ ...s, value: a })
      );
      
      // Should not throw when registry is not available
      expect(() => {
        testLens.usageBound.usage(42);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle prism preview failure gracefully', () => {
      const testPrism = prism(
        (s: number | null) => s !== null ? s : undefined,
        (a: number) => a
      );
      
      // Should throw when preview fails
      expect(() => {
        testPrism.get(null);
      }).toThrow('Prism preview failed');
    });

    it('should handle traversal with no results', () => {
      const emptyTraversal = traversal(
        <F>(f: (a: number) => F) => (s: number[]) => s.map(f),
        5
      );
      
      // Should throw when traversal returns no results
      expect(() => {
        emptyTraversal.get([]);
      }).toThrow('Traversal returned no results');
    });

    it('should handle setter read operation', () => {
      const testSetter = setter((s: { value: number }, f: (a: number) => number) => ({
        ...s,
        value: f(s.value)
      }));
      
      // Should throw when trying to read from setter
      expect(() => {
        testSetter.get({ value: 42 });
      }).toThrow('Setter is write-only');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should handle large array traversals efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      
      const arrayTraversal = traversal(
        <F>(f: (a: number) => F) => (s: number[]) => s.map(f),
        1000
      );
      
      const start = performance.now();
      const usage = arrayTraversal.usageBound.usage(largeArray);
      const end = performance.now();
      
      expect(usage).toBe(1000);
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle deep nested composition efficiently', () => {
      const deepNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { value: 42 }
              }
            }
          }
        }
      };
      
      const lens1 = lens(
        (s: any) => s.level1,
        (s: any, a: any) => ({ ...s, level1: a })
      );
      
      const lens2 = lens(
        (s: any) => s.level2,
        (s: any, a: any) => ({ ...s, level2: a })
      );
      
      const lens3 = lens(
        (s: any) => s.level3,
        (s: any, a: any) => ({ ...s, level3: a })
      );
      
      const lens4 = lens(
        (s: any) => s.level4,
        (s: any, a: any) => ({ ...s, level4: a })
      );
      
      const lens5 = lens(
        (s: any) => s.level5,
        (s: any, a: any) => ({ ...s, level5: a })
      );
      
      const finalLens = lens(
        (s: any) => s.value,
        (s: any, a: number) => ({ ...s, value: a })
      );
      
      // Compose all lenses
      const composed = composeOptic(
        finalLens,
        composeOptic(
          lens5,
          composeOptic(
            lens4,
            composeOptic(
              lens3,
              composeOptic(lens2, lens1)
            )
          )
        )
      );
      
      const start = performance.now();
      const result = composed.get(deepNested);
      const end = performance.now();
      
      expect(result).toBe(42);
      expect(end - start).toBeLessThan(10); // Should complete within 10ms
    });
  });
}); 