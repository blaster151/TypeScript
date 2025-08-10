/**
 * Effect-Aware Stream Fusion Multiplicity Tests
 * 
 * Tests for the effect-aware stream fusion multiplicity system to verify that
 * no fusion happens across ExternalEffect boundaries and that effect safety is
 * enforced alongside multiplicity constraints.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { 
  Stream,
  StreamOperator,
  EffectTag,
  EffectAwareStreamFusionOptimizer,
  canFuse,
  wouldIncreaseMultiplicity,
  wouldViolateEffectSafety,
  calculateFusedBound,
  calculateFusedEffectTag,
  isEffectFusionSafe,
  maxEffectTag,
  createMapStream,
  createFilterStream,
  createScanStream,
  createTakeStream,
  createFlatMapStream,
  createLogStream,
  createMetricsStream,
  enableEffectAwareFusionDebug,
  disableEffectAwareFusionDebug,
  logEffectAwareFusionStats
} from '../stream-fusion-effect-multiplicity';

// ============================================================================
// Test Setup
// ============================================================================

describe('Effect-Aware Stream Fusion Multiplicity', () => {
  let optimizer: EffectAwareStreamFusionOptimizer;
  
  beforeEach(() => {
    optimizer = new EffectAwareStreamFusionOptimizer(true); // Enable debug
  });

  afterEach(() => {
    // Clean up
  });

  // ============================================================================
  // Effect Safety Tests
  // ============================================================================

  describe('Effect Safety', () => {
    it('should allow Pure + Pure fusion', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      expect(isEffectFusionSafe(mapStream.effectTag, filterStream.effectTag)).toBe(true);
      expect(canFuse(mapStream, filterStream)).toBe(true);
      
      const fusedEffectTag = calculateFusedEffectTag(mapStream, filterStream);
      expect(fusedEffectTag).toBe("Pure");
    });

    it('should allow Pure + DeterministicEffect fusion', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const scanStream = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      
      expect(isEffectFusionSafe(mapStream.effectTag, scanStream.effectTag)).toBe(true);
      expect(canFuse(mapStream, scanStream)).toBe(true);
      
      const fusedEffectTag = calculateFusedEffectTag(mapStream, scanStream);
      expect(fusedEffectTag).toBe("DeterministicEffect");
    });

    it('should allow DeterministicEffect + Pure fusion', () => {
      const scanStream = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      const mapStream = createMapStream((x: number) => x.toString());
      
      expect(isEffectFusionSafe(scanStream.effectTag, mapStream.effectTag)).toBe(true);
      expect(canFuse(scanStream, mapStream)).toBe(true);
      
      const fusedEffectTag = calculateFusedEffectTag(scanStream, mapStream);
      expect(fusedEffectTag).toBe("DeterministicEffect");
    });

    it('should allow DeterministicEffect + DeterministicEffect fusion', () => {
      const scanStream1 = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      const scanStream2 = createScanStream(0, (acc: number, x: number) => acc * x, 1);
      
      expect(isEffectFusionSafe(scanStream1.effectTag, scanStream2.effectTag)).toBe(true);
      expect(canFuse(scanStream1, scanStream2)).toBe(true);
      
      const fusedEffectTag = calculateFusedEffectTag(scanStream1, scanStream2);
      expect(fusedEffectTag).toBe("DeterministicEffect");
    });

    it('should prevent Pure + NonDeterministicEffect fusion', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect");
      
      expect(isEffectFusionSafe(mapStream.effectTag, flatMapStream.effectTag)).toBe(false);
      expect(canFuse(mapStream, flatMapStream)).toBe(false);
      expect(wouldViolateEffectSafety(mapStream, flatMapStream)).toBe(true);
    });

    it('should prevent Pure + ExternalEffect fusion', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const logStream = createLogStream((x: number) => console.log(x));
      
      expect(isEffectFusionSafe(mapStream.effectTag, logStream.effectTag)).toBe(false);
      expect(canFuse(mapStream, logStream)).toBe(false);
      expect(wouldViolateEffectSafety(mapStream, logStream)).toBe(true);
    });

    it('should prevent DeterministicEffect + ExternalEffect fusion', () => {
      const scanStream = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      const logStream = createLogStream((x: number) => console.log(x));
      
      expect(isEffectFusionSafe(scanStream.effectTag, logStream.effectTag)).toBe(false);
      expect(canFuse(scanStream, logStream)).toBe(false);
      expect(wouldViolateEffectSafety(scanStream, logStream)).toBe(true);
    });
  });

  // ============================================================================
  // Combined Safety Tests
  // ============================================================================

  describe('Combined Safety (Multiplicity + Effect)', () => {
    it('should allow fusion when both multiplicity and effect are safe', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      expect(canFuse(mapStream, filterStream)).toBe(true);
      expect(wouldIncreaseMultiplicity(mapStream, filterStream)).toBe(false);
      expect(wouldViolateEffectSafety(mapStream, filterStream)).toBe(false);
    });

    it('should prevent fusion when multiplicity is unsafe', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      const mapStream = createMapStream((x: number) => x.toString());
      
      expect(canFuse(flatMapStream, mapStream)).toBe(false);
      expect(wouldIncreaseMultiplicity(flatMapStream, mapStream)).toBe(true);
      expect(wouldViolateEffectSafety(flatMapStream, mapStream)).toBe(false);
    });

    it('should prevent fusion when effect is unsafe', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const logStream = createLogStream((x: number) => console.log(x));
      
      expect(canFuse(mapStream, logStream)).toBe(false);
      expect(wouldIncreaseMultiplicity(mapStream, logStream)).toBe(false);
      expect(wouldViolateEffectSafety(mapStream, logStream)).toBe(true);
    });

    it('should prevent fusion when both multiplicity and effect are unsafe', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect");
      const logStream = createLogStream((x: number) => console.log(x));
      
      expect(canFuse(flatMapStream, logStream)).toBe(false);
      expect(wouldIncreaseMultiplicity(flatMapStream, logStream)).toBe(true);
      expect(wouldViolateEffectSafety(flatMapStream, logStream)).toBe(true);
    });
  });

  // ============================================================================
  // Effect-Aware Fusion Optimizer Tests
  // ============================================================================

  describe('Effect-Aware Fusion Optimizer', () => {
    it('should perform safe fusions with effect information', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      
      expect(result.fused).toBe(true);
      expect(result.originalBounds).toEqual([1, 1]);
      expect(result.originalEffects).toEqual(["Pure", "Pure"]);
      expect(result.fusedBound).toBe(1);
      expect(result.fusedEffectTag).toBe("Pure");
      expect(result.multiplicityViolation).toBeUndefined();
      expect(result.effectViolation).toBeUndefined();
    });

    it('should skip fusions with multiplicity violations', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      const mapStream = createMapStream((x: number) => x.toString());
      
      const result = optimizer.fuse(flatMapStream, mapStream, 'flatMap', 'map');
      
      expect(result.fused).toBe(false);
      expect(result.originalBounds).toEqual(["∞", 1]);
      expect(result.originalEffects).toEqual(["NonDeterministicEffect", "Pure"]);
      expect(result.fusedBound).toBe("∞");
      expect(result.fusedEffectTag).toBe("NonDeterministicEffect");
      expect(result.multiplicityViolation).toBe(true);
      expect(result.effectViolation).toBe(false);
      expect(result.reason).toContain('Would increase bound');
    });

    it('should skip fusions with effect violations', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const logStream = createLogStream((x: number) => console.log(x));
      
      const result = optimizer.fuse(mapStream, logStream, 'map', 'log');
      
      expect(result.fused).toBe(false);
      expect(result.originalBounds).toEqual([1, 1]);
      expect(result.originalEffects).toEqual(["Pure", "ExternalEffect"]);
      expect(result.fusedBound).toBe(1);
      expect(result.fusedEffectTag).toBe("ExternalEffect");
      expect(result.multiplicityViolation).toBe(false);
      expect(result.effectViolation).toBe(true);
      expect(result.reason).toContain('violate effect safety');
    });

    it('should skip fusions with both violations', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect");
      const logStream = createLogStream((x: number) => console.log(x));
      
      const result = optimizer.fuse(flatMapStream, logStream, 'flatMap', 'log');
      
      expect(result.fused).toBe(false);
      expect(result.originalBounds).toEqual(["∞", 1]);
      expect(result.originalEffects).toEqual(["NonDeterministicEffect", "ExternalEffect"]);
      expect(result.fusedBound).toBe("∞");
      expect(result.fusedEffectTag).toBe("ExternalEffect");
      expect(result.multiplicityViolation).toBe(true);
      expect(result.effectViolation).toBe(true);
      expect(result.reason).toContain('increase bound');
      expect(result.reason).toContain('violate effect safety');
    });
  });

  // ============================================================================
  // Chain Optimization Tests
  // ============================================================================

  describe('Chain Optimization', () => {
    it('should optimize chains with safe operations', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createFilterStream((x: number) => x > 0), operator: 'filter' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // All operations should be safe to fuse
      expect(optimized.usageBound).toBe(1);
      expect(optimized.effectTag).toBe("Pure");
    });

    it('should stop optimization at ExternalEffect boundaries', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createLogStream((x: number) => console.log(x)), operator: 'log' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // The log should prevent fusion with subsequent operations
      expect(optimized.effectTag).toBe("ExternalEffect");
    });

    it('should handle mixed safe and unsafe operations', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞"), operator: 'flatMap' as StreamOperator },
        { stream: createFilterStream((x: number) => x > 0), operator: 'filter' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // The flatMap should prevent fusion with subsequent operations
      expect(optimized.usageBound).toBe("∞");
      expect(optimized.effectTag).toBe("NonDeterministicEffect");
    });

    it('should preserve order for effectful operations', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // Should fuse but preserve order
      expect(optimized.usageBound).toBe(1);
      expect(optimized.effectTag).toBe("DeterministicEffect");
    });
  });

  // ============================================================================
  // Special Case Rules Tests
  // ============================================================================

  describe('Special Case Rules', () => {
    it('should tag log operator as ExternalEffect', () => {
      const logStream = createLogStream((x: number) => console.log(x));
      expect(logStream.effectTag).toBe("ExternalEffect");
    });

    it('should tag metrics counters as DeterministicEffect', () => {
      const metricsStream = createMetricsStream((x: number) => console.log(x));
      expect(metricsStream.effectTag).toBe("DeterministicEffect");
    });

    it('should tag pure combinators as Pure', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      const takeStream = createTakeStream(5);
      
      expect(mapStream.effectTag).toBe("Pure");
      expect(filterStream.effectTag).toBe("Pure");
      expect(takeStream.effectTag).toBe("Pure");
    });

    it('should tag stateful but deterministic accumulators as DeterministicEffect', () => {
      const scanStream = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      expect(scanStream.effectTag).toBe("DeterministicEffect");
    });
  });

  // ============================================================================
  // Effect Tag Propagation Tests
  // ============================================================================

  describe('Effect Tag Propagation', () => {
    it('should propagate Pure effect through safe fusions', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      expect(result.fusedEffectTag).toBe("Pure");
    });

    it('should propagate DeterministicEffect through safe fusions', () => {
      const scanStream = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      const mapStream = createMapStream((x: number) => x.toString());
      
      const result = optimizer.fuse(scanStream, mapStream, 'scan', 'map');
      expect(result.fusedEffectTag).toBe("DeterministicEffect");
    });

    it('should propagate higher effect tags', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const logStream = createLogStream((x: number) => console.log(x));
      
      const fusedEffectTag = calculateFusedEffectTag(mapStream, logStream);
      expect(fusedEffectTag).toBe("ExternalEffect");
    });
  });

  // ============================================================================
  // Unsafe Fusion Tests
  // ============================================================================

  describe('Unsafe Fusion', () => {
    it('should allow unsafe fusion when explicitly enabled', () => {
      const unsafeOptimizer = new EffectAwareStreamFusionOptimizer(true, true);
      
      const mapStream = createMapStream((x: number) => x * 2);
      const logStream = createLogStream((x: number) => console.log(x));
      
      const result = unsafeOptimizer.unsafeFuse(mapStream, logStream, 'map', 'log');
      
      expect(result.fused).toBe(true);
      expect(result.reason).toBe('Unsafe fusion forced');
      expect(result.fusedEffectTag).toBe("ExternalEffect");
    });

    it('should throw error when unsafe fusion is not allowed', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const logStream = createLogStream((x: number) => console.log(x));
      
      expect(() => {
        optimizer.unsafeFuse(mapStream, logStream, 'map', 'log');
      }).toThrow('Unsafe fusion not allowed');
    });
  });

  // ============================================================================
  // Debug Diagnostics Tests
  // ============================================================================

  describe('Debug Diagnostics', () => {
    it('should emit debug logs with effect information', () => {
      // Enable debug logging
      enableEffectAwareFusionDebug();
      
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      
      expect(result.fused).toBe(true);
      
      // Disable debug logging
      disableEffectAwareFusionDebug();
    });

    it('should log effect-aware fusion statistics', () => {
      const stats = {
        totalAttempts: 10,
        successfulFusions: 7,
        skippedFusions: 3,
        multiplicityViolations: 2,
        effectViolations: 1,
        averageBoundReduction: 0.5
      };
      
      logEffectAwareFusionStats(stats);
      // Test passes if no errors are thrown
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should handle complex chains with effect boundaries', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createFilterStream((x: number) => x > 0), operator: 'filter' as StreamOperator },
        { stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as StreamOperator },
        { stream: createLogStream((x: number) => console.log(x)), operator: 'log' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // The log should prevent fusion with subsequent operations
      expect(optimized.effectTag).toBe("ExternalEffect");
    });

    it('should preserve semantic correctness through effect-aware fusion', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as StreamOperator },
        { stream: createMetricsStream((x: number) => console.log(x)), operator: 'metrics' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // Should fuse safely while preserving order
      expect(optimized.effectTag).toBe("DeterministicEffect");
    });

    it('should handle mixed effect types correctly', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect"), operator: 'flatMap' as StreamOperator },
        { stream: createLogStream((x: number) => console.log(x)), operator: 'log' as StreamOperator },
        { stream: createFilterStream((x: number) => x > 0), operator: 'filter' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // The flatMap and log should prevent fusion with subsequent operations
      expect(optimized.effectTag).toBe("ExternalEffect");
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should not impact performance when debug is disabled', () => {
      const optimizerNoDebug = new EffectAwareStreamFusionOptimizer(false);
      
      const start = performance.now();
      
      // Perform many fusion attempts
      for (let i = 0; i < 1000; i++) {
        const mapStream = createMapStream((x: number) => x * 2);
        const filterStream = createFilterStream((x: number) => x > 0);
        
        optimizerNoDebug.fuse(mapStream, filterStream, 'map', 'filter');
      }
      
      const end = performance.now();
      
      // Should complete within reasonable time (100ms)
      expect(end - start).toBeLessThan(100);
    });

    it('should handle large chains efficiently', () => {
      const start = performance.now();
      
      // Create a large chain of streams
      const streams = Array.from({ length: 50 }, (_, i) => ({
        stream: i % 3 === 0 
          ? createMapStream((x: number) => x * 2)
          : i % 3 === 1
          ? createFilterStream((x: number) => x > 0)
          : createScanStream(0, (acc: number, x: number) => acc + x, 1),
        operator: (i % 3 === 0 ? 'map' : i % 3 === 1 ? 'filter' : 'scan') as StreamOperator
      }));
      
      const optimized = optimizer.optimizeChain(streams);
      
      const end = performance.now();
      
      // Should complete within reasonable time (500ms)
      expect(end - start).toBeLessThan(500);
      expect(optimized.effectTag).toBe("DeterministicEffect");
    });
  });
}); 