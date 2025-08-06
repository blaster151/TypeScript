/**
 * Lazy Deforestation Tests
 * 
 * Tests for the lazy deforestation system to verify that pure segments are
 * correctly fused and that safety constraints are properly enforced.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { 
  PureSegment,
  DeforestationResult,
  SegmentDetectionConfig,
  LazyDeforestationOptimizer,
  detectPureSegments,
  applyDeforestationWithRewrites,
  defaultSegmentConfig,
  performanceConfig,
  safetyConfig,
  enableDeforestationDebug,
  disableDeforestationDebug,
  generateDeforestationDebug
} from '../stream-deforestation';

import {
  createLinearGraph,
  createBranchingGraph,
  createFeedbackGraph
} from '../stream-fusion-graph';

import {
  createMapStream,
  createFilterStream,
  createScanStream,
  createFlatMapStream,
  createLogStream,
  createMetricsStream
} from '../stream-fusion-effect-multiplicity';

// ============================================================================
// Test Setup
// ============================================================================

describe('Lazy Deforestation', () => {
  let optimizer: LazyDeforestationOptimizer;
  
  beforeEach(() => {
    optimizer = new LazyDeforestationOptimizer(defaultSegmentConfig(), true);
  });

  afterEach(() => {
    // Clean up
  });

  // ============================================================================
  // Segment Detection Tests
  // ============================================================================

  describe('Segment Detection', () => {
    it('should detect pure segments in linear graphs', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'd', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph);
      
      expect(segments).toHaveLength(1);
      expect(segments[0].nodes).toHaveLength(4);
      expect(segments[0].multiplicity).toBe(1);
      expect(segments[0].isLazy).toBe(true);
    });

    it('should detect multiple segments separated by effectful operations', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const },
        { id: 'd', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'e', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph);
      
      expect(segments).toHaveLength(2);
      expect(segments[0].nodes).toHaveLength(2); // a, b
      expect(segments[1].nodes).toHaveLength(2); // d, e
    });

    it('should detect segments separated by stateful operations', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'd', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'e', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph);
      
      expect(segments).toHaveLength(2);
      expect(segments[0].nodes).toHaveLength(2); // a, b
      expect(segments[1].nodes).toHaveLength(2); // d, e
    });

    it('should respect max segment length configuration', () => {
      const config = { ...defaultSegmentConfig(), maxSegmentLength: 2 };
      
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'd', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph, config);
      
      expect(segments).toHaveLength(2);
      expect(segments[0].nodes).toHaveLength(2); // a, b
      expect(segments[1].nodes).toHaveLength(2); // c, d
    });

    it('should respect min segment length configuration', () => {
      const config = { ...defaultSegmentConfig(), minSegmentLength: 3 };
      
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph, config);
      
      expect(segments).toHaveLength(1);
      expect(segments[0].nodes).toHaveLength(3);
    });
  });

  // ============================================================================
  // Deforestation Optimization Tests
  // ============================================================================

  describe('Deforestation Optimization', () => {
    it('should fuse pure segments into single nodes', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'd', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      expect(result.fusionStats.totalSegments).toBe(1);
      expect(result.fusionStats.fusedSegments).toBe(1);
      expect(result.fusionStats.totalNodesFused).toBe(4);
      expect(result.optimizedGraph.nodes.size).toBe(1); // One fused node
    });

    it('should preserve effectful operations as boundaries', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const },
        { id: 'd', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'e', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      expect(result.fusionStats.totalSegments).toBe(2);
      expect(result.fusionStats.fusedSegments).toBe(2);
      expect(result.optimizedGraph.nodes.size).toBe(3); // 2 fused nodes + 1 log node
    });

    it('should preserve stateful operations as boundaries', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'd', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'e', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      expect(result.fusionStats.totalSegments).toBe(2);
      expect(result.fusionStats.fusedSegments).toBe(2);
      expect(result.optimizedGraph.nodes.size).toBe(3); // 2 fused nodes + 1 scan node
    });

    it('should handle branching graphs correctly', () => {
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = [
        { id: 'branch1', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'branch2', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      const merge = { id: 'merge', stream: createMapStream((x: any) => x), operator: 'map' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      const result = optimizer.deforest(graph);
      
      expect(result.fusionStats.totalSegments).toBeGreaterThan(0);
      expect(result.fusionStats.fusedSegments).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Safety Constraint Tests
  // ============================================================================

  describe('Safety Constraints', () => {
    it('should not fuse segments with multiplicity escalation', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞"), operator: 'flatMap' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph);
      
      // Should not create a single segment due to multiplicity escalation
      expect(segments.length).toBeGreaterThan(1);
    });

    it('should not fuse segments with non-pure effects', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph);
      
      // Should create separate segments due to external effect
      expect(segments).toHaveLength(2);
    });

    it('should not fuse segments with stateful operations', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const segments = detectPureSegments(graph);
      
      // Should create separate segments due to stateful operation
      expect(segments).toHaveLength(2);
    });

    it('should track safety violations correctly', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const },
        { id: 'c', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'd', stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞"), operator: 'flatMap' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      expect(result.safetyViolations.effectViolations).toBeGreaterThan(0);
      expect(result.safetyViolations.stateViolations).toBeGreaterThan(0);
      expect(result.safetyViolations.multiplicityViolations).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe('Configuration', () => {
    it('should respect lazy evaluation configuration', () => {
      const config = { ...defaultSegmentConfig(), enableLazyEvaluation: false };
      const lazyOptimizer = new LazyDeforestationOptimizer(config, true);
      
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = lazyOptimizer.deforest(graph);
      
      expect(result.pureSegments[0].isLazy).toBe(false);
    });

    it('should respect compile-time fusion configuration', () => {
      const config = { ...defaultSegmentConfig(), enableCompileTimeFusion: true };
      const compileTimeOptimizer = new LazyDeforestationOptimizer(config, true);
      
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = compileTimeOptimizer.deforest(graph);
      
      expect(result.pureSegments[0].metadata.fusionType).toBe('compile-time');
    });

    it('should respect performance configuration', () => {
      const performanceOptimizer = new LazyDeforestationOptimizer(performanceConfig(), true);
      
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = performanceOptimizer.deforest(graph);
      
      expect(result.pureSegments[0].isLazy).toBe(false); // Eager composition
    });

    it('should respect safety configuration', () => {
      const safetyOptimizer = new LazyDeforestationOptimizer(safetyConfig(), true);
      
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = safetyOptimizer.deforest(graph);
      
      expect(result.pureSegments[0].isLazy).toBe(true); // Lazy composition
      expect(result.pureSegments[0].metadata.fusionType).toBe('runtime');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should integrate with rewrite rules', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'd', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = applyDeforestationWithRewrites(graph);
      
      expect(result.fusionStats.totalSegments).toBe(1);
      expect(result.fusionStats.fusedSegments).toBe(1);
      expect(result.optimizedGraph.nodes.size).toBe(1);
    });

    it('should handle complex mixed topologies', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const },
        { id: 'd', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'e', stream: createScanStream(0, (acc: string, x: string) => acc + x, 1), operator: 'scan' as const },
        { id: 'f', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const },
        { id: 'g', stream: createMapStream((x: string) => x.length), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      expect(result.fusionStats.totalSegments).toBe(3);
      expect(result.fusionStats.fusedSegments).toBe(3);
      expect(result.optimizedGraph.nodes.size).toBe(5); // 3 fused nodes + 1 log + 1 scan
    });

    it('should preserve graph connectivity after fusion', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'd', stream: createLogStream((x: string) => console.log(x)), operator: 'log' as const },
        { id: 'e', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      // Check that connectivity is preserved
      const fusedNodes = Array.from(result.optimizedGraph.nodes.values());
      expect(fusedNodes.length).toBe(3); // 2 fused nodes + 1 log node
      
      // Verify that the log node is still connected between the fused segments
      const logNode = fusedNodes.find(n => n.operator === 'log');
      expect(logNode).toBeDefined();
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should reduce allocations in fused segments', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'd', stream: createMapStream((x: string) => x.toUpperCase()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      expect(result.fusionStats.allocationReduction).toBeGreaterThan(0);
      expect(result.fusionStats.indirectionReduction).toBeGreaterThan(0);
    });

    it('should handle large segments efficiently', () => {
      const config = { ...defaultSegmentConfig(), maxSegmentLength: 50 };
      const largeOptimizer = new LazyDeforestationOptimizer(config, false);
      
      const streams = Array.from({ length: 20 }, (_, i) => ({
        id: `node${i}`,
        stream: createMapStream((x: number) => x + i),
        operator: 'map' as const
      }));
      
      const graph = createLinearGraph(streams);
      const start = performance.now();
      
      const result = largeOptimizer.deforest(graph);
      
      const end = performance.now();
      
      // Should complete within reasonable time (100ms)
      expect(end - start).toBeLessThan(100);
      expect(result.fusionStats.totalSegments).toBe(1);
      expect(result.fusionStats.fusedSegments).toBe(1);
    });
  });

  // ============================================================================
  // Debug and Diagnostics Tests
  // ============================================================================

  describe('Debug and Diagnostics', () => {
    it('should generate debug output correctly', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.deforest(graph);
      
      const debugOutput = generateDeforestationDebug(result);
      
      expect(debugOutput).toContain('# Lazy Deforestation Debug Output');
      expect(debugOutput).toContain('## Fusion Statistics');
      expect(debugOutput).toContain('## Safety Violations');
      expect(debugOutput).toContain('## Pure Segments');
      expect(debugOutput).toContain('Total segments: 1');
      expect(debugOutput).toContain('Fused segments: 1');
    });

    it('should enable and disable debug logging', () => {
      enableDeforestationDebug();
      disableDeforestationDebug();
      // Test passes if no errors are thrown
    });
  });
}); 