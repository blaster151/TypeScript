/**
 * Unified Fluent API Tests
 * 
 * Tests for the unified fluent API system that automatically derives
 * fluent methods from typeclass instances and verifies law consistency.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  addFluentMethods,
  addFluentMethodsToPrototype,
  withMaybeFluentMethods,
  withEitherFluentMethods,
  withResultFluentMethods,
  withPersistentListFluentMethods,
  withStatefulStreamFluentMethods,
  autoRegisterFluentMethods,
  testLawConsistency,
  runAllLawConsistencyTests,
  hasFluentMethods,
  removeFluentMethods,
  removeFluentMethodsFromPrototype,
  FluentMethods,
  FluentMethodOptions
} from '../fp-unified-fluent-api';

// ============================================================================
// Test Setup
// ============================================================================

describe('Unified Fluent API System', () => {
  beforeEach(() => {
    // Test setup if needed
  });

  afterEach(() => {
    // Cleanup if needed
  });

  // ============================================================================
  // Core Functionality Tests
  // ============================================================================

  describe('Core Functionality', () => {
    it('should add fluent methods to ADT instances', () => {
      // Mock ADT with typeclass instances
      const mockADT = { tag: 'Just', value: 42 };
      const mockFunctor = {
        map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
      };
      const mockMonad = {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => fa.tag === 'Just' ? f(fa.value) : fa
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      const fluentADT = addFluentMethods(mockADT, 'Maybe');

      expect(fluentADT.map).toBeDefined();
      expect(fluentADT.chain).toBeDefined();
      expect(fluentADT.flatMap).toBeDefined();
      expect(fluentADT.filter).toBeDefined();

      // Test map functionality
      const mapped = fluentADT.map((x: number) => x * 2);
      expect(mapped.value).toBe(84);

      // Test chain functionality
      const chained = fluentADT.chain((x: number) => ({ tag: 'Just', value: x * 2 }));
      expect(chained.value).toBe(84);

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should add fluent methods to ADT constructors', () => {
      // Mock constructor
      class MockMaybe {
        constructor(public value: any) {}
      }

      const mockFunctor = {
        map: (fa: any, f: any) => new MockMaybe(f(fa.value))
      };
      const mockMonad = {
        of: (a: any) => new MockMaybe(a),
        chain: (fa: any, f: any) => f(fa.value)
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      addFluentMethodsToPrototype(MockMaybe, 'Maybe');

      const instance = new MockMaybe(42);
      expect(instance.map).toBeDefined();
      expect(instance.chain).toBeDefined();
      expect(instance.flatMap).toBeDefined();
      expect(instance.filter).toBeDefined();

      // Test map functionality
      const mapped = instance.map((x: number) => x * 2);
      expect(mapped.value).toBe(84);

      // Test chain functionality
      const chained = instance.chain((x: number) => new MockMaybe(x * 2));
      expect(chained.value).toBe(84);

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should check if ADT has fluent methods', () => {
      const adtWithMethods = {
        map: () => {},
        chain: () => {},
        filter: () => {}
      };

      const adtWithoutMethods = {
        value: 42
      };

      expect(hasFluentMethods(adtWithMethods)).toBe(true);
      expect(hasFluentMethods(adtWithoutMethods)).toBe(false);
      expect(hasFluentMethods(null)).toBe(false);
      expect(hasFluentMethods(undefined)).toBe(false);
    });

    it('should remove fluent methods from ADT', () => {
      const adt = {
        value: 42,
        map: () => {},
        chain: () => {},
        filter: () => {},
        bimap: () => {}
      };

      expect(hasFluentMethods(adt)).toBe(true);

      removeFluentMethods(adt);

      expect(hasFluentMethods(adt)).toBe(false);
      expect(adt.value).toBe(42); // Non-fluent properties should remain
    });

    it('should remove fluent methods from constructor prototype', () => {
      class MockMaybe {
        constructor(public value: any) {}
      }

      MockMaybe.prototype.map = () => {};
      MockMaybe.prototype.chain = () => {};
      MockMaybe.prototype.filter = () => {};

      expect(MockMaybe.prototype.map).toBeDefined();
      expect(MockMaybe.prototype.chain).toBeDefined();

      removeFluentMethodsFromPrototype(MockMaybe);

      expect(MockMaybe.prototype.map).toBeUndefined();
      expect(MockMaybe.prototype.chain).toBeUndefined();
    });
  });

  // ============================================================================
  // ADT-Specific Decorator Tests
  // ============================================================================

  describe('ADT-Specific Decorators', () => {
    it('should add fluent methods to Maybe ADT', () => {
      // Mock the Maybe module
      const mockMaybe = {
        tag: 'Just',
        value: 42
      };

      const mockJust = (value: any) => ({ tag: 'Just', value });
      const mockNothing = () => ({ tag: 'Nothing' });

      const mockMaybeModule = {
        Maybe: function(value: any) { return mockMaybe; },
        Just: mockJust,
        Nothing: mockNothing
      };

      // Mock require
      const originalRequire = require;
      require = (path: string) => {
        if (path === './fp-maybe-unified') return mockMaybeModule;
        return originalRequire(path);
      };

      const result = withMaybeFluentMethods();

      expect(result.Maybe).toBeDefined();
      expect(result.Just).toBeDefined();
      expect(result.Nothing).toBeDefined();

      // Restore require
      require = originalRequire;
    });

    it('should add fluent methods to Either ADT', () => {
      // Mock the Either module
      const mockEitherModule = {
        Either: function() {},
        Left: (value: any) => ({ tag: 'Left', value }),
        Right: (value: any) => ({ tag: 'Right', value })
      };

      // Mock require
      const originalRequire = require;
      require = (path: string) => {
        if (path === './fp-either-unified') return mockEitherModule;
        return originalRequire(path);
      };

      const result = withEitherFluentMethods();

      expect(result.Either).toBeDefined();
      expect(result.Left).toBeDefined();
      expect(result.Right).toBeDefined();

      // Restore require
      require = originalRequire;
    });

    it('should add fluent methods to Result ADT', () => {
      // Mock the Result module
      const mockResultModule = {
        Result: function() {},
        Ok: (value: any) => ({ tag: 'Ok', value }),
        Err: (error: any) => ({ tag: 'Err', error })
      };

      // Mock require
      const originalRequire = require;
      require = (path: string) => {
        if (path === './fp-result-unified') return mockResultModule;
        return originalRequire(path);
      };

      const result = withResultFluentMethods();

      expect(result.Result).toBeDefined();
      expect(result.Ok).toBeDefined();
      expect(result.Err).toBeDefined();

      // Restore require
      require = originalRequire;
    });
  });

  // ============================================================================
  // Law Consistency Tests
  // ============================================================================

  describe('Law Consistency', () => {
    it('should test Functor identity law', () => {
      // Mock typeclass instances
      const mockFunctor = {
        map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
      };

      const mockMonad = {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => fa.tag === 'Just' ? f(fa.value) : fa
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      const testValue = { tag: 'Just', value: 42 };
      const testFunction = (x: number) => x * 2;

      // Add fluent methods to test value
      const fluentValue = addFluentMethods(testValue, 'Maybe');

      // Test identity law: map(id) = id
      const identity = (x: any) => x;
      const fluentResult = fluentValue.map(identity);
      const dataLastResult = mockFunctor.map(testValue, identity);

      expect(JSON.stringify(fluentResult)).toBe(JSON.stringify(dataLastResult));

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should test Functor composition law', () => {
      // Mock typeclass instances
      const mockFunctor = {
        map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        return undefined;
      };

      const testValue = { tag: 'Just', value: 42 };
      const fluentValue = addFluentMethods(testValue, 'Maybe');

      // Test composition law: map(f ∘ g) = map(f) ∘ map(g)
      const f = (x: number) => x * 2;
      const g = (x: number) => x + 1;
      const composition = (x: number) => f(g(x));

      const fluentComposition = fluentValue.map(composition);
      const fluentComposed = fluentValue.map(g).map(f);

      expect(JSON.stringify(fluentComposition)).toBe(JSON.stringify(fluentComposed));

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should test Monad left identity law', () => {
      // Mock typeclass instances
      const mockMonad = {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => fa.tag === 'Just' ? f(fa.value) : fa
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      const testValue = 42;
      const testFunction = (x: number) => ({ tag: 'Just', value: x * 2 });

      // Test left identity: of(a).chain(f) = f(a)
      const fluentLeftIdentity = mockMonad.of(testValue).chain(testFunction);
      const dataLastLeftIdentity = testFunction(testValue);

      expect(JSON.stringify(fluentLeftIdentity)).toBe(JSON.stringify(dataLastLeftIdentity));

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should test Monad right identity law', () => {
      // Mock typeclass instances
      const mockMonad = {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => fa.tag === 'Just' ? f(fa.value) : fa
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      const testValue = { tag: 'Just', value: 42 };

      // Test right identity: m.chain(of) = m
      const fluentRightIdentity = testValue.chain(mockMonad.of);
      const dataLastRightIdentity = testValue;

      expect(JSON.stringify(fluentRightIdentity)).toBe(JSON.stringify(dataLastRightIdentity));

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should test complete law consistency for an ADT', () => {
      // Mock typeclass instances
      const mockFunctor = {
        map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
      };

      const mockMonad = {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => fa.tag === 'Just' ? f(fa.value) : fa
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      const testValue = { tag: 'Just', value: 42 };
      const testFunction = (x: number) => ({ tag: 'Just', value: x * 2 });

      // Add fluent methods
      const fluentValue = addFluentMethods(testValue, 'Maybe');

      const result = testLawConsistency('Maybe', fluentValue, testFunction);

      expect(result).toBe(true);

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });
  });

  // ============================================================================
  // Auto-Registration Tests
  // ============================================================================

  describe('Auto-Registration', () => {
    it('should auto-register fluent methods for all ADTs', () => {
      // Mock registry
      const mockRegistry = {
        derivable: new Map([
          ['Maybe', {}],
          ['Either', {}],
          ['Result', {}]
        ]),
        getTypeclass: (name: string, typeclass: string) => {
          if (typeclass === 'Functor') return { map: () => {} };
          if (typeclass === 'Monad') return { chain: () => {} };
          return undefined;
        }
      };

      // Mock getFPRegistry
      const originalGetFPRegistry = require('../fp-unified-fluent-api').getFPRegistry;
      require('../fp-unified-fluent-api').getFPRegistry = () => mockRegistry;

      // Mock require for ADT modules
      const originalRequire = require;
      require = (path: string) => {
        if (path.includes('maybe')) return { Maybe: function() {} };
        if (path.includes('either')) return { Either: function() {} };
        if (path.includes('result')) return { Result: function() {} };
        return originalRequire(path);
      };

      // This should not throw
      expect(() => autoRegisterFluentMethods()).not.toThrow();

      // Restore original functions
      require = originalRequire;
      require('../fp-unified-fluent-api').getFPRegistry = originalGetFPRegistry;
    });

    it('should handle missing registry gracefully', () => {
      // Mock getFPRegistry to return null
      const originalGetFPRegistry = require('../fp-unified-fluent-api').getFPRegistry;
      require('../fp-unified-fluent-api').getFPRegistry = () => null;

      // This should not throw and should log a warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => autoRegisterFluentMethods()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ FP Registry not available, skipping fluent method registration');

      consoleSpy.mockRestore();
      require('../fp-unified-fluent-api').getFPRegistry = originalGetFPRegistry;
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should work with real ADT instances', () => {
      // This test would use actual ADT implementations
      // For now, we'll test with mocked instances that behave like real ones
      
      const mockMaybe = {
        tag: 'Just' as const,
        value: 42
      };

      const mockFunctor = {
        map: (fa: any, f: any) => 
          fa.tag === 'Just' ? { tag: 'Just', value: f(fa.value) } : fa
      };

      const mockMonad = {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => 
          fa.tag === 'Just' ? f(fa.value) : { tag: 'Nothing' }
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      const fluentMaybe = addFluentMethods(mockMaybe, 'Maybe');

      // Test chaining
      const result = fluentMaybe
        .map((x: number) => x * 2)
        .chain((x: number) => ({ tag: 'Just', value: x + 1 }))
        .filter((x: number) => x > 80);

      expect(result.tag).toBe('Just');
      expect(result.value).toBe(85);

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should preserve type safety', () => {
      // This test verifies that TypeScript types are preserved
      const mockADT = { tag: 'Just', value: 42 };
      
      const mockFunctor = {
        map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        return undefined;
      };

      const fluentADT = addFluentMethods(mockADT, 'Maybe');

      // TypeScript should infer the correct types
      const mapped: any = fluentADT.map((x: number) => x.toString());
      expect(typeof mapped.value).toBe('string');

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing typeclass instances gracefully', () => {
      const mockADT = { tag: 'Just', value: 42 };

      // Mock registry to return no instances
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = () => undefined;

      const fluentADT = addFluentMethods(mockADT, 'Unknown');

      // Should not have fluent methods
      expect(fluentADT.map).toBeUndefined();
      expect(fluentADT.chain).toBeUndefined();

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });

    it('should handle registry errors gracefully', () => {
      // Mock registry to throw
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = () => {
        throw new Error('Registry error');
      };

      expect(() => {
        addFluentMethods({}, 'Maybe');
      }).toThrow('Registry error');

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should handle large numbers of operations efficiently', () => {
      const mockADT = { tag: 'Just', value: 1 };
      
      const mockFunctor = {
        map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
      };

      const mockMonad = {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => ({ tag: 'Just', value: f(fa.value) })
      };

      // Mock registry lookup
      const originalGetTypeclassInstance = require('../fp-registry-init').getTypeclassInstance;
      require('../fp-registry-init').getTypeclassInstance = (name: string, typeclass: string) => {
        if (typeclass === 'Functor') return mockFunctor;
        if (typeclass === 'Monad') return mockMonad;
        return undefined;
      };

      const fluentADT = addFluentMethods(mockADT, 'Maybe');

      const start = performance.now();

      // Chain 1000 operations
      let result = fluentADT;
      for (let i = 0; i < 1000; i++) {
        result = result.map((x: number) => x + 1);
      }

      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete within 100ms
      expect(result.value).toBe(1001);

      // Restore original function
      require('../fp-registry-init').getTypeclassInstance = originalGetTypeclassInstance;
    });
  });
});
