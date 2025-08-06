/**
 * Stream Fusion Multiplicity Tests
 * 
 * Tests for the stream fusion multiplicity system to verify that safe fusions
 * happen and unsafe ones don't, and that bounds propagate correctly after fusion.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { 
  Stream,
  StreamOperator,
  StreamFusionOptimizer,
  canFuse,
  wouldIncreaseMultiplicity,
  calculateFusedBound,
  createMapStream,
  createFilterStream,
  createScanStream,
  createTakeStream,
  createFlatMapStream,
  enableFusionDebug,
  disableFusionDebug,
  logFusionStats
} from '../stream-fusion-multiplicity';

// ============================================================================
// Test Setup
// ============================================================================

describe('Stream Fusion Multiplicity', () => {
  let optimizer: StreamFusionOptimizer;
  
  beforeEach(() => {
    optimizer = new StreamFusionOptimizer(true); // Enable debug
  });

  afterEach(() => {
    // Clean up
  });

  // ============================================================================
  // Fusion Safety Tests
  // ============================================================================

  describe('Fusion Safety', () => {
    it('should allow safe fusions that preserve or lower bounds', () => {
      // map → filter (1 × 1 = 1, safe)
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      expect(canFuse(mapStream, filterStream)).toBe(true);
      expect(wouldIncreaseMultiplicity(mapStream, filterStream)).toBe(false);
      
      const fusedBound = calculateFusedBound(mapStream, filterStream);
      expect(fusedBound).toBe(1);
    });

    it('should allow scan → map fusion (preserves bound)', () => {
      // scan → map (preserves original bound)
      const scanStream = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      const mapStream = createMapStream((x: number) => x.toString());
      
      expect(canFuse(scanStream, mapStream)).toBe(true);
      expect(wouldIncreaseMultiplicity(scanStream, mapStream)).toBe(false);
      
      const fusedBound = calculateFusedBound(scanStream, mapStream);
      expect(fusedBound).toBe(1);
    });

    it('should prevent unsafe fusions that increase bounds', () => {
      // flatMap(∞) → map(1) would increase bound from 1 to ∞
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      const mapStream = createMapStream((x: number) => x.toString());
      
      expect(canFuse(flatMapStream, mapStream)).toBe(false);
      expect(wouldIncreaseMultiplicity(flatMapStream, mapStream)).toBe(true);
      
      const fusedBound = calculateFusedBound(flatMapStream, mapStream);
      expect(fusedBound).toBe("∞");
    });

    it('should handle take(n) → flatMap conditional fusion', () => {
      // take(5) → flatMap(3) is safe (5 ≥ 3)
      const takeStream = createTakeStream(5);
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), 3);
      
      expect(canFuse(takeStream, flatMapStream)).toBe(true);
      expect(wouldIncreaseMultiplicity(takeStream, flatMapStream)).toBe(false);
      
      const fusedBound = calculateFusedBound(takeStream, flatMapStream);
      expect(fusedBound).toBe(15); // 5 * 3
    });

    it('should prevent take(n) → flatMap when n < flatMap bound', () => {
      // take(2) → flatMap(5) is unsafe (2 < 5)
      const takeStream = createTakeStream(2);
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), 5);
      
      expect(canFuse(takeStream, flatMapStream)).toBe(false);
      expect(wouldIncreaseMultiplicity(takeStream, flatMapStream)).toBe(true);
      
      const fusedBound = calculateFusedBound(takeStream, flatMapStream);
      expect(fusedBound).toBe(10); // 2 * 5
    });
  });

  // ============================================================================
  // Stream Operator Analysis Tests
  // ============================================================================

  describe('Stream Operator Analysis', () => {
    it('should correctly analyze stateless operators', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      // Both should be stateless with bound = 1
      expect(mapStream.usageBound).toBe(1);
      expect(filterStream.usageBound).toBe(1);
    });

    it('should correctly analyze bounded operators', () => {
      const takeStream = createTakeStream(5);
      
      // Take should have bound = count
      expect(takeStream.usageBound).toBe(5);
    });

    it('should correctly analyze infinite operators', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      
      // FlatMap should have infinite bound
      expect(flatMapStream.usageBound).toBe("∞");
    });
  });

  // ============================================================================
  // Fusion Optimizer Tests
  // ============================================================================

  describe('Fusion Optimizer', () => {
    it('should perform safe fusions', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      
      expect(result.fused).toBe(true);
      expect(result.originalBounds).toEqual([1, 1]);
      expect(result.fusedBound).toBe(1);
      expect(result.reason).toBeUndefined();
    });

    it('should skip unsafe fusions', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      const mapStream = createMapStream((x: number) => x.toString());
      
      const result = optimizer.fuse(flatMapStream, mapStream, 'flatMap', 'map');
      
      expect(result.fused).toBe(false);
      expect(result.originalBounds).toEqual(["∞", 1]);
      expect(result.fusedBound).toBe("∞");
      expect(result.reason).toContain('Would increase bound');
    });

    it('should optimize chains of streams', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createFilterStream((x: number) => x > 0), operator: 'filter' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // All operations should be safe to fuse
      expect(optimized.usageBound).toBe(1);
    });

    it('should handle mixed safe and unsafe fusions in chains', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞"), operator: 'flatMap' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // The flatMap should prevent fusion with the final map
      expect(optimized.usageBound).toBe("∞");
    });
  });

  // ============================================================================
  // Bound Propagation Tests
  // ============================================================================

  describe('Bound Propagation', () => {
    it('should preserve bounds through safe fusions', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      
      expect(result.fused).toBe(true);
      expect(result.stream.usageBound).toBe(1);
    });

    it('should calculate correct fused bounds', () => {
      const takeStream = createTakeStream(5);
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), 3);
      
      const result = optimizer.fuse(takeStream, flatMapStream, 'take', 'flatMap');
      
      expect(result.fused).toBe(true);
      expect(result.stream.usageBound).toBe(15); // 5 * 3
    });

    it('should handle infinite bounds correctly', () => {
      const flatMapStream1 = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      const flatMapStream2 = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      
      const fusedBound = calculateFusedBound(flatMapStream1, flatMapStream2);
      expect(fusedBound).toBe("∞");
    });
  });

  // ============================================================================
  // Special Case Rules Tests
  // ============================================================================

  describe('Special Case Rules', () => {
    it('should handle stateless map/filter with UB = 1', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      expect(mapStream.usageBound).toBe(1);
      expect(filterStream.usageBound).toBe(1);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      expect(result.fused).toBe(true);
    });

    it('should handle bounded operators with take(n)', () => {
      const takeStream = createTakeStream(5);
      
      expect(takeStream.usageBound).toBe(5);
      
      // take(5) → map(1) should be safe
      const mapStream = createMapStream((x: number) => x.toString());
      const result = optimizer.fuse(takeStream, mapStream, 'take', 'map');
      
      expect(result.fused).toBe(true);
      expect(result.stream.usageBound).toBe(5); // Preserves take bound
    });

    it('should handle unbounded sources with UB = "∞"', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      
      expect(flatMapStream.usageBound).toBe("∞");
      
      // flatMap(∞) → map(1) should be unsafe
      const mapStream = createMapStream((x: number) => x.toString());
      const result = optimizer.fuse(flatMapStream, mapStream, 'flatMap', 'map');
      
      expect(result.fused).toBe(false);
    });
  });

  // ============================================================================
  // Optimization Examples Tests
  // ============================================================================

  describe('Optimization Examples', () => {
    it('should allow map → filter fusion', () => {
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      expect(result.fused).toBe(true);
      expect(result.fusedBound).toBe(1); // 1 × 1 = 1
    });

    it('should allow scan → map fusion', () => {
      const scanStream = createScanStream(0, (acc: number, x: number) => acc + x, 1);
      const mapStream = createMapStream((x: number) => x.toString());
      
      const result = optimizer.fuse(scanStream, mapStream, 'scan', 'map');
      expect(result.fused).toBe(true);
      expect(result.fusedBound).toBe(1); // 1 × 1 = 1
    });

    it('should disallow flatMap → map when flatMap UB = "∞"', () => {
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞");
      const mapStream = createMapStream((x: number) => x.toString());
      
      const result = optimizer.fuse(flatMapStream, mapStream, 'flatMap', 'map');
      expect(result.fused).toBe(false);
      expect(result.reason).toContain('Would increase bound from 1 to ∞');
    });

    it('should allow take(5) → flatMap(3) fusion', () => {
      const takeStream = createTakeStream(5);
      const flatMapStream = createFlatMapStream((x: number) => createMapStream(y => y * 2), 3);
      
      const result = optimizer.fuse(takeStream, flatMapStream, 'take', 'flatMap');
      expect(result.fused).toBe(true);
      expect(result.fusedBound).toBe(15); // 5 × 3 = 15
    });
  });

  // ============================================================================
  // Debug Diagnostics Tests
  // ============================================================================

  describe('Debug Diagnostics', () => {
    it('should emit debug logs when enabled', () => {
      // Enable debug logging
      enableFusionDebug();
      
      const mapStream = createMapStream((x: number) => x * 2);
      const filterStream = createFilterStream((x: number) => x > 0);
      
      const result = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
      
      expect(result.fused).toBe(true);
      
      // Disable debug logging
      disableFusionDebug();
    });

    it('should log fusion statistics', () => {
      const stats = {
        totalAttempts: 10,
        successfulFusions: 7,
        skippedFusions: 3,
        averageBoundReduction: 0.5
      };
      
      logFusionStats(stats);
      // Test passes if no errors are thrown
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should handle complex stream chains', () => {
      const streams = [
        { stream: createMapStream((x: number) => x * 2), operator: 'map' as StreamOperator },
        { stream: createFilterStream((x: number) => x > 0), operator: 'filter' as StreamOperator },
        { stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as StreamOperator },
        { stream: createMapStream((x: number) => x.toString()), operator: 'map' as StreamOperator },
        { stream: createTakeStream(10), operator: 'take' as StreamOperator }
      ];
      
      const optimized = optimizer.optimizeChain(streams);
      
      // The take(10) should be the limiting factor
      expect(optimized.usageBound).toBe(10);
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
    });

    it('should optimize performance through safe fusions', () => {
      const start = performance.now();
      
      // Create a long chain of safe operations
      const streams = Array.from({ length: 100 }, (_, i) => ({
        stream: createMapStream((x: number) => x + i),
        operator: 'map' as StreamOperator
      }));
      
      const optimized = optimizer.optimizeChain(streams);
      
      const end = performance.now();
      
      // Should complete within reasonable time
      expect(end - start).toBeLessThan(1000);
      expect(optimized.usageBound).toBe(1); // All map operations should fuse
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should not impact performance when debug is disabled', () => {
      const optimizerNoDebug = new StreamFusionOptimizer(false);
      
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

    it('should handle large stream chains efficiently', () => {
      const start = performance.now();
      
      // Create a large chain of streams
      const streams = Array.from({ length: 50 }, (_, i) => ({
        stream: i % 2 === 0 
          ? createMapStream((x: number) => x * 2)
          : createFilterStream((x: number) => x > 0),
        operator: (i % 2 === 0 ? 'map' : 'filter') as StreamOperator
      }));
      
      const optimized = optimizer.optimizeChain(streams);
      
      const end = performance.now();
      
      // Should complete within reasonable time (500ms)
      expect(end - start).toBeLessThan(500);
      expect(optimized.usageBound).toBe(1); // All operations should fuse
    });
  });
}); 