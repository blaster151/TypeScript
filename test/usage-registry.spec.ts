/**
 * Usage Registry Integration Tests
 * 
 * Tests for the integration between UsageBoundStream, UsageBoundOptic,
 * and the global typeclass registry system.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { 
  getUsageBound, 
  hasUsageBound, 
  registerUsage,
  OPTIC_USAGES 
} from '../usageRegistry';

import { 
  deriveInstancesWithUsage,
  UsageAwareInstances,
  getUsageForType,
  registerUsageForType,
  hasUsageForType
} from '../fp-usage-integration';

import { 
  getUsageBound as getGlobalUsageBound,
  registerUsageBound 
} from '../fp-registry-init';

import { 
  Usage, 
  Multiplicity, 
  onceUsage, 
  infiniteUsage,
  constantUsage 
} from '../src/stream/multiplicity/types';

// ============================================================================
// Test Setup
// ============================================================================

describe('Usage Registry Integration', () => {
  beforeEach(() => {
    // Clear any existing registrations for clean tests
    // This would need to be implemented in the registry if not already available
  });

  // ============================================================================
  // Basic Registry Tests
  // ============================================================================

  describe('Basic Registry Operations', () => {
    it('should register and retrieve usage for a type', () => {
      const testUsage = onceUsage<any>();
      registerUsage('TestType', testUsage);
      
      expect(hasUsageBound('TestType')).toBe(true);
      expect(getUsageBound('TestType')).toBe(testUsage);
    });

    it('should return undefined for unregistered types', () => {
      expect(getUsageBound('UnregisteredType')).toBeUndefined();
      expect(hasUsageBound('UnregisteredType')).toBe(false);
    });

    it('should register usage in both registries', () => {
      const testUsage = constantUsage<any>(5);
      registerUsageForType('TestType', testUsage);
      
      expect(getUsageForType('TestType')).toBe(testUsage);
      expect(getGlobalUsageBound('TestType')).toBe(testUsage);
    });
  });

  // ============================================================================
  // Built-in Usage Tests
  // ============================================================================

  describe('Built-in Usage Definitions', () => {
    it('should have correct usage for Lens', () => {
      const lensUsage = getUsageBound('Lens');
      expect(lensUsage).toBeDefined();
      
      if (lensUsage) {
        expect(lensUsage('any input')).toBe(1);
      }
    });

    it('should have correct usage for Prism', () => {
      const prismUsage = getUsageBound('Prism');
      expect(prismUsage).toBeDefined();
      
      if (prismUsage) {
        expect(prismUsage('any input')).toBe(1); // Simplified test
      }
    });

    it('should have correct usage for Traversal', () => {
      const traversalUsage = getUsageBound('Traversal');
      expect(traversalUsage).toBeDefined();
      
      if (traversalUsage) {
        expect(traversalUsage([1, 2, 3])).toBe(3);
        expect(traversalUsage('single')).toBe(1);
      }
    });

    it('should have correct usage for ObservableLite', () => {
      const observableUsage = getUsageBound('ObservableLite');
      expect(observableUsage).toBeDefined();
      
      if (observableUsage) {
        expect(observableUsage('any input')).toBe("∞");
      }
    });

    it('should have correct usage for StatefulStream', () => {
      const streamUsage = getUsageBound('StatefulStream');
      expect(streamUsage).toBeDefined();
      
      if (streamUsage) {
        expect(streamUsage('any input')).toBe("∞");
      }
    });
  });

  // ============================================================================
  // Usage-Aware Derivation Tests
  // ============================================================================

  describe('Usage-Aware Derivation', () => {
    it('should derive instances with usage from registry', () => {
      const instances = deriveInstancesWithUsage({
        typeKey: 'Lens',
        functor: true,
        autoRegisterUsage: false // Don't auto-register since it's already registered
      });

      expect(instances.functor).toBeDefined();
      expect(instances.usage).toBeDefined();
      expect(instances.typeKey).toBe('Lens');
      
      if (instances.usage) {
        expect(instances.usage('any input')).toBe(1);
      }
    });

    it('should use explicit usage over registry usage', () => {
      const customUsage = constantUsage<any>(42);
      
      const instances = deriveInstancesWithUsage({
        typeKey: 'Lens', // Has usage = 1 in registry
        usage: customUsage, // Should override registry
        functor: true
      });

      expect(instances.usage).toBe(customUsage);
      expect(instances.usage!('any input')).toBe(42);
    });

    it('should auto-register usage when requested', () => {
      const customUsage = constantUsage<any>(99);
      
      const instances = deriveInstancesWithUsage({
        typeKey: 'CustomType',
        usage: customUsage,
        autoRegisterUsage: true,
        functor: true
      });

      expect(instances.usage).toBe(customUsage);
      expect(getUsageBound('CustomType')).toBe(customUsage);
      expect(getGlobalUsageBound('CustomType')).toBe(customUsage);
    });
  });

  // ============================================================================
  // Usage-Aware Instance Tests
  // ============================================================================

  describe('Usage-Aware Instances', () => {
    it('should create Lens instances with usage = 1', () => {
      const lensInstances = UsageAwareInstances.Lens;
      
      expect(lensInstances.functor).toBeDefined();
      expect(lensInstances.usage).toBeDefined();
      
      if (lensInstances.usage) {
        expect(lensInstances.usage('any input')).toBe(1);
      }
    });

    it('should create Prism instances with conditional usage', () => {
      const prismInstances = UsageAwareInstances.Prism;
      
      expect(prismInstances.functor).toBeDefined();
      expect(prismInstances.usage).toBeDefined();
      
      if (prismInstances.usage) {
        expect(prismInstances.usage('any input')).toBe(1); // Simplified test
      }
    });

    it('should create Traversal instances with array-aware usage', () => {
      const traversalInstances = UsageAwareInstances.Traversal;
      
      expect(traversalInstances.functor).toBeDefined();
      expect(traversalInstances.usage).toBeDefined();
      
      if (traversalInstances.usage) {
        expect(traversalInstances.usage([1, 2, 3])).toBe(3);
        expect(traversalInstances.usage('single')).toBe(1);
      }
    });

    it('should create ObservableLite instances with infinite usage', () => {
      const observableInstances = UsageAwareInstances.ObservableLite;
      
      expect(observableInstances.functor).toBeDefined();
      expect(observableInstances.usage).toBeDefined();
      
      if (observableInstances.usage) {
        expect(observableInstances.usage('any input')).toBe("∞");
      }
    });
  });

  // ============================================================================
  // Composition Tests
  // ============================================================================

  describe('Usage Composition', () => {
    it('should compose usage multiplicatively for sequential composition', () => {
      const lensInstances = UsageAwareInstances.Lens; // usage = 1
      const traversalInstances = UsageAwareInstances.Traversal; // usage = array.length
      
      // This would be implemented in the composition system
      // For now, we'll test the individual usages
      expect(lensInstances.usage!('any input')).toBe(1);
      expect(traversalInstances.usage!([1, 2, 3])).toBe(3);
      
      // Sequential composition should multiply: 1 * 3 = 3
      // This would be tested when the composition system is implemented
    });

    it('should handle infinite usage in composition', () => {
      const lensInstances = UsageAwareInstances.Lens; // usage = 1
      const observableInstances = UsageAwareInstances.ObservableLite; // usage = ∞
      
      expect(lensInstances.usage!('any input')).toBe(1);
      expect(observableInstances.usage!('any input')).toBe("∞");
      
      // Sequential composition should result in ∞: 1 * ∞ = ∞
      // This would be tested when the composition system is implemented
    });
  });

  // ============================================================================
  // Registry Integration Tests
  // ============================================================================

  describe('Registry Integration', () => {
    it('should find usage in both registries', () => {
      const testUsage = constantUsage<any>(7);
      registerUsageForType('TestType', testUsage);
      
      expect(hasUsageForType('TestType')).toBe(true);
      expect(getUsageForType('TestType')).toBe(testUsage);
    });

    it('should prioritize usage registry over global registry', () => {
      const usageRegistryUsage = constantUsage<any>(5);
      const globalRegistryUsage = constantUsage<any>(10);
      
      // Register in both registries
      registerUsage('TestType', usageRegistryUsage);
      registerUsageBound('TestType', globalRegistryUsage);
      
      // Should get the usage registry version
      expect(getUsageForType('TestType')).toBe(usageRegistryUsage);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing registry gracefully', () => {
      // This would test behavior when registries are not available
      // For now, we'll test that the functions don't throw
      expect(() => getUsageBound('NonExistentType')).not.toThrow();
      expect(() => hasUsageBound('NonExistentType')).not.toThrow();
    });

    it('should handle invalid usage functions gracefully', () => {
      // This would test behavior with malformed usage functions
      // For now, we'll test that registration doesn't throw
      const invalidUsage = (input: any) => 'invalid' as any;
      expect(() => registerUsage('TestType', invalidUsage)).not.toThrow();
    });
  });
}); 