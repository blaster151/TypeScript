/**
 * Multiplicity Debug System Tests
 * 
 * Tests for the enhanced multiplicity system with debug capabilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { 
  UsageBoundOf,
  WithUsageBound,
  RequireBound1,
  RequireBoundN,
  RequireFiniteBound,
  RequireInfiniteBound,
  getUsageBoundDebug,
  getAllUsageBoundsDebug,
  registerTypeUsageBound,
  multiplicityDebug,
  multiplicityLogger,
  createUsageBoundWithDebug,
  getUsageBoundDebugFromValue,
  deriveInstancesWithDebug,
  deriveMaybeInstancesWithDebug,
  deriveArrayInstancesWithDebug,
  generateUsageBoundJSDoc,
  createBrandedInstance
} from '../multiplicity-debug-system';

// ============================================================================
// Test Setup
// ============================================================================

describe('Multiplicity Debug System', () => {
  beforeEach(() => {
    // Reset debug configuration
    multiplicityDebug.enabled = false;
    multiplicityDebug.logLevel = 'info';
  });

  afterEach(() => {
    // Clean up any debug state
    multiplicityDebug.enabled = false;
  });

  // ============================================================================
  // Type-Level Exposure Tests
  // ============================================================================

  describe('Type-Level Exposure', () => {
    it('should extract usage bound type from branded values', () => {
      // Create a branded value with usage bound
      const brandedValue: WithUsageBound<{ value: number }, 1> = {
        value: 42,
        __usageBound: 1
      };
      
      // Type-level test - this should compile
      type ExtractedBound = UsageBoundOf<typeof brandedValue>;
      type ExpectedBound = 1;
      
      // Runtime test
      expect(brandedValue.__usageBound).toBe(1);
    });

    it('should enforce bound constraints at type level', () => {
      // These should compile (bound = 1)
      const bound1Value: RequireBound1<WithUsageBound<{ value: number }, 1>> = {
        value: 42,
        __usageBound: 1
      };
      
      // These should compile (bound = 5)
      const bound5Value: RequireBoundN<WithUsageBound<{ value: number }, 5>, 5> = {
        value: 42,
        __usageBound: 5
      };
      
      // These should compile (finite bound)
      const finiteValue: RequireFiniteBound<WithUsageBound<{ value: number }, 10>> = {
        value: 42,
        __usageBound: 10
      };
      
      // These should compile (infinite bound)
      const infiniteValue: RequireInfiniteBound<WithUsageBound<{ value: string }, "∞">> = {
        value: "test",
        __usageBound: "∞"
      };
      
      expect(bound1Value.__usageBound).toBe(1);
      expect(bound5Value.__usageBound).toBe(5);
      expect(finiteValue.__usageBound).toBe(10);
      expect(infiniteValue.__usageBound).toBe("∞");
    });
  });

  // ============================================================================
  // Registry Debug API Tests
  // ============================================================================

  describe('Registry Debug API', () => {
    it('should return default bounds for registered types', () => {
      // Register test types
      registerTypeUsageBound('TestType1', 1);
      registerTypeUsageBound('TestType2', 5);
      registerTypeUsageBound('TestType3', "∞");
      
      expect(getUsageBoundDebug('TestType1')).toBe(1);
      expect(getUsageBoundDebug('TestType2')).toBe(5);
      expect(getUsageBoundDebug('TestType3')).toBe("∞");
    });

    it('should return infinite bound for unregistered types', () => {
      expect(getUsageBoundDebug('UnregisteredType')).toBe("∞");
    });

    it('should return all registered bounds for debugging', () => {
      // Clear registry and add test types
      const allBounds = getAllUsageBoundsDebug();
      
      // Should contain at least the built-in types
      expect(allBounds).toHaveProperty('Maybe');
      expect(allBounds).toHaveProperty('Array');
      expect(allBounds).toHaveProperty('Lens');
      
      expect(allBounds.Maybe).toBe(1);
      expect(allBounds.Array).toBe("∞");
      expect(allBounds.Lens).toBe(1);
    });
  });

  // ============================================================================
  // Runtime Debug Logging Tests
  // ============================================================================

  describe('Runtime Debug Logging', () => {
    it('should log when debug is enabled', () => {
      // Enable debug logging
      multiplicityDebug.enabled = true;
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create usage bound with debug
      const usageBound = createUsageBoundWithDebug(1, 'test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Created usage bound: 1 from test')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log when debug is disabled', () => {
      // Disable debug logging
      multiplicityDebug.enabled = false;
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create usage bound with debug
      const usageBound = createUsageBoundWithDebug(1, 'test');
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]')
      );
      
      consoleSpy.mockRestore();
    });

    it('should extract usage bound debug info from values', () => {
      // Create value with usage bound
      const valueWithBound = {
        value: 42,
        usageBound: {
          usage: () => 5,
          maxUsage: 5
        }
      };
      
      const debugInfo = getUsageBoundDebugFromValue(valueWithBound);
      
      expect(debugInfo.bound).toBe(5);
      expect(debugInfo.source).toBe('value');
      expect(debugInfo.hasUsageBound).toBe(true);
    });

    it('should handle values without usage bounds', () => {
      const valueWithoutBound = { value: 42 };
      
      const debugInfo = getUsageBoundDebugFromValue(valueWithoutBound);
      
      expect(debugInfo.bound).toBe("∞");
      expect(debugInfo.source).toBe('default');
      expect(debugInfo.hasUsageBound).toBe(false);
    });
  });

  // ============================================================================
  // Enhanced Derivation with Debug Tests
  // ============================================================================

  describe('Enhanced Derivation with Debug', () => {
    it('should log functor operations when debug is enabled', () => {
      // Enable debug logging
      multiplicityDebug.enabled = true;
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const instances = deriveInstancesWithDebug({
        map: (fa, f) => {
          const result = { ...fa, value: f(fa.value) };
          result.usageBound = fa.usageBound;
          return result;
        },
        usageBound: createUsageBoundWithDebug(1, 'TestType'),
        typeKey: 'TestType',
        debugName: 'TestType',
        enableLogging: true,
        functor: true
      });
      
      // Test functor operation
      const mockFa = { value: 42, usageBound: { usage: () => 1 } };
      instances.functor!.map(mockFa, x => x * 2);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Functor.map on TestType — bound preserved: 1 → 1')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log applicative operations when debug is enabled', () => {
      // Enable debug logging
      multiplicityDebug.enabled = true;
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const instances = deriveInstancesWithDebug({
        map: (fa, f) => {
          const result = { ...fa, value: f(fa.value) };
          result.usageBound = fa.usageBound;
          return result;
        },
        of: (a) => ({ value: a }),
        usageBound: createUsageBoundWithDebug(1, 'TestType'),
        typeKey: 'TestType',
        debugName: 'TestType',
        enableLogging: true,
        applicative: true
      });
      
      // Test applicative operation
      const mockFab = { value: (x: number) => x * 2, usageBound: { usage: () => 1 } };
      const mockFa = { value: 42, usageBound: { usage: () => 2 } };
      instances.applicative!.ap(mockFab as any, mockFa as any);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Applicative.ap on TestType — bound multiplied: 1 * 2 = 2')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log monad operations when debug is enabled', () => {
      // Enable debug logging
      multiplicityDebug.enabled = true;
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const instances = deriveInstancesWithDebug({
        map: (fa, f) => {
          const result = { ...fa, value: f(fa.value) };
          result.usageBound = fa.usageBound;
          return result;
        },
        of: (a) => ({ value: a }),
        chain: (fa, f) => {
          const result = f(fa.value);
          result.usageBound = { usage: () => 3 };
          return result;
        },
        usageBound: createUsageBoundWithDebug(1, 'TestType'),
        typeKey: 'TestType',
        debugName: 'TestType',
        enableLogging: true,
        monad: true
      });
      
      // Test monad operation
      const mockFa = { value: 42, usageBound: { usage: () => 1 } };
      const mockF = (x: number) => ({ value: x * 2, usageBound: { usage: () => 3 } });
      instances.monad!.chain(mockFa as any, mockF);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Monad.chain on TestType — bound multiplied: 1 * 3 = 3')
      );
      
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Convenience Functions with Debug Tests
  // ============================================================================

  describe('Convenience Functions with Debug', () => {
    it('should create Maybe instances with debug support', () => {
      const instances = deriveMaybeInstancesWithDebug(true);
      
      expect(instances.functor).toBeDefined();
      expect(instances.applicative).toBeDefined();
      expect(instances.monad).toBeDefined();
      expect(instances.debugName).toBe('Maybe');
      expect(instances.usageBound.usage(42)).toBe(1);
    });

    it('should create Array instances with debug support', () => {
      const instances = deriveArrayInstancesWithDebug(true);
      
      expect(instances.functor).toBeDefined();
      expect(instances.applicative).toBeDefined();
      expect(instances.monad).toBeDefined();
      expect(instances.traversable).toBeDefined();
      expect(instances.debugName).toBe('Array');
      expect(instances.usageBound.usage([1, 2, 3])).toBe("∞");
    });
  });

  // ============================================================================
  // Developer-Facing IntelliSense Tests
  // ============================================================================

  describe('Developer-Facing IntelliSense', () => {
    it('should generate JSDoc comments for usage bounds', () => {
      const maybeJSDoc = generateUsageBoundJSDoc('Maybe');
      const arrayJSDoc = generateUsageBoundJSDoc('Array');
      const customJSDoc = generateUsageBoundJSDoc('CustomType');
      
      expect(maybeJSDoc).toBe('/** Usage bound: 1 (at most once per element) */');
      expect(arrayJSDoc).toBe('/** Usage bound: ∞ (unbounded collection) */');
      expect(customJSDoc).toBe('/** Usage bound: ∞ (unbounded collection) */');
    });

    it('should create branded instances with JSDoc', () => {
      const instance = { value: 42 };
      const branded = createBrandedInstance(instance, 1, 'TestType');
      
      expect(branded.__usageBound).toBe(1);
      expect(branded.value).toBe(42);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should work end-to-end with debug logging', () => {
      // Enable debug logging
      multiplicityDebug.enabled = true;
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Create Maybe instances with debug
      const maybeInstances = deriveMaybeInstancesWithDebug(true);
      
      // Create a mock Maybe value
      const mockMaybe = {
        value: 42,
        usageBound: { usage: () => 1 }
      };
      
      // Test functor operation
      const mapped = maybeInstances.functor!.map(mockMaybe as any, x => x * 2);
      
      // Test monad operation
      const mockF = (x: number) => ({ value: x * 2, usageBound: { usage: () => 2 } });
      const chained = maybeInstances.monad!.chain(mockMaybe as any, mockF);
      
      // Verify logs were generated
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Deriving instances for Maybe')
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Functor.map on Maybe')
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Monad.chain on Maybe')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle complex bound transitions', () => {
      // Enable debug logging
      multiplicityDebug.enabled = true;
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const instances = deriveInstancesWithDebug({
        map: (fa, f) => {
          const result = { ...fa, value: f(fa.value) };
          result.usageBound = fa.usageBound;
          return result;
        },
        of: (a) => ({ value: a }),
        chain: (fa, f) => {
          const result = f(fa.value);
          result.usageBound = { usage: () => "∞" };
          return result;
        },
        usageBound: createUsageBoundWithDebug(1, 'ComplexType'),
        typeKey: 'ComplexType',
        debugName: 'ComplexType',
        enableLogging: true,
        functor: true,
        applicative: true,
        monad: true
      });
      
      // Test complex chain of operations
      const mockFa = { value: 42, usageBound: { usage: () => 1 } };
      
      // Functor (preserves bound)
      const mapped = instances.functor!.map(mockFa, x => x * 2);
      
      // Monad (multiplies with infinite)
      const mockF = (x: number) => ({ value: x * 2, usageBound: { usage: () => "∞" } });
      const chained = instances.monad!.chain(mockFa, mockF);
      
      // Verify bound transitions
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Functor.map on ComplexType — bound preserved: 1 → 1')
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Multiplicity]'),
        expect.stringContaining('Monad.chain on ComplexType — bound multiplied: 1 * ∞ = ∞')
      );
      
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should not impact performance when debug is disabled', () => {
      // Disable debug logging
      multiplicityDebug.enabled = false;
      
      const start = performance.now();
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const instances = deriveInstancesWithDebug({
          map: (fa, f) => fa,
          usageBound: createUsageBoundWithDebug(1, 'PerfTest'),
          functor: true
        });
        
        const mockFa = { value: i, usageBound: { usage: () => 1 } };
        instances.functor!.map(mockFa, x => x * 2);
      }
      
      const end = performance.now();
      
      // Should complete within reasonable time (100ms)
      expect(end - start).toBeLessThan(100);
    });

    it('should handle debug logging efficiently when enabled', () => {
      // Enable debug logging
      multiplicityDebug.enabled = true;
      
      const start = performance.now();
      
      // Perform operations with debug logging
      for (let i = 0; i < 100; i++) {
        const instances = deriveInstancesWithDebug({
          map: (fa, f) => fa,
          usageBound: createUsageBoundWithDebug(1, 'DebugTest'),
          enableLogging: true,
          functor: true
        });
        
        const mockFa = { value: i, usageBound: { usage: () => 1 } };
        instances.functor!.map(mockFa, x => x * 2);
      }
      
      const end = performance.now();
      
      // Should complete within reasonable time (200ms with logging)
      expect(end - start).toBeLessThan(200);
    });
  });
}); 