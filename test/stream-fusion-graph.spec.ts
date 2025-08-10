/**
 * Graph-Aware Stream Fusion Tests
 * 
 * Tests for the graph-aware stream fusion system to verify that branching and
 * feedback fusion work correctly while maintaining effect and multiplicity safety.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { 
  StreamGraph,
  StreamNode,
  FusionEdge,
  StronglyConnectedComponent,
  GraphFusionResult,
  GraphAwareStreamFusionOptimizer,
  findStronglyConnectedComponents,
  canFuseSCC,
  analyzeFusionEdges,
  canFuseAcrossSplit,
  canFuseAcrossJoin,
  createLinearGraph,
  createBranchingGraph,
  createFeedbackGraph,
  enableGraphFusionDebug,
  disableGraphFusionDebug,
  logGraphFusionStats,
  generateFusionGraphDebug
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

describe('Graph-Aware Stream Fusion', () => {
  let optimizer: GraphAwareStreamFusionOptimizer;
  
  beforeEach(() => {
    optimizer = new GraphAwareStreamFusionOptimizer(true); // Enable debug
  });

  afterEach(() => {
    // Clean up
  });

  // ============================================================================
  // Graph Analysis Tests
  // ============================================================================

  describe('Graph Analysis', () => {
    it('should find strongly connected components in a linear graph', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const sccs = findStronglyConnectedComponents(graph);
      
      // Linear graph should have no SCCs (no cycles)
      expect(sccs).toHaveLength(0);
    });

    it('should find strongly connected components in a feedback graph', () => {
      const nodes = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'c', stream: createFilterStream((x: number) => x < 100), operator: 'filter' as const }
      ];
      
      const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
      const sccs = findStronglyConnectedComponents(graph);
      
      // Should find one SCC with all three nodes
      expect(sccs).toHaveLength(1);
      expect(sccs[0].nodes).toContain('a');
      expect(sccs[0].nodes).toContain('b');
      expect(sccs[0].nodes).toContain('c');
      expect(sccs[0].isFeedback).toBe(true);
    });

    it('should analyze fusion edges correctly', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const edges = analyzeFusionEdges(graph);
      
      expect(edges).toHaveLength(2); // a->b, b->c
      
      // All edges should be eligible for fusion (Pure + Pure)
      edges.forEach(edge => {
        expect(edge.effectSafe).toBe(true);
        expect(edge.multiplicitySafe).toBe(true);
        expect(edge.eligible).toBe(true);
      });
    });

    it('should detect ineligible fusion edges', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const edges = analyzeFusionEdges(graph);
      
      expect(edges).toHaveLength(2);
      
      // a->b should be ineligible (Pure + ExternalEffect)
      const edgeAB = edges.find(edge => edge.from === 'a' && edge.to === 'b');
      expect(edgeAB?.effectSafe).toBe(false);
      expect(edgeAB?.eligible).toBe(false);
      
      // b->c should be ineligible (ExternalEffect + Pure)
      const edgeBC = edges.find(edge => edge.from === 'b' && edge.to === 'c');
      expect(edgeBC?.effectSafe).toBe(false);
      expect(edgeBC?.eligible).toBe(false);
    });
  });

  // ============================================================================
  // SCC Fusion Tests
  // ============================================================================

  describe('SCC Fusion', () => {
    it('should allow fusion in safe feedback cycles', () => {
      const nodes = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'c', stream: createFilterStream((x: number) => x < 100), operator: 'filter' as const }
      ];
      
      const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
      const sccs = findStronglyConnectedComponents(graph);
      
      expect(sccs).toHaveLength(1);
      
      const canFuse = canFuseSCC(graph, sccs[0].nodes);
      expect(canFuse.eligible).toBe(true);
    });

    it('should prevent fusion in unsafe feedback cycles', () => {
      const nodes = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect"), operator: 'flatMap' as const },
        { id: 'c', stream: createFilterStream((x: number) => x < 100), operator: 'filter' as const }
      ];
      
      const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
      const sccs = findStronglyConnectedComponents(graph);
      
      expect(sccs).toHaveLength(1);
      
      const canFuse = canFuseSCC(graph, sccs[0].nodes);
      expect(canFuse.eligible).toBe(false);
      expect(canFuse.reason).toContain('Unsafe effect in cycle');
    });

    it('should prevent fusion in cycles with infinite multiplicity', () => {
      const nodes = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞"), operator: 'flatMap' as const },
        { id: 'c', stream: createFilterStream((x: number) => x < 100), operator: 'filter' as const }
      ];
      
      const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
      const sccs = findStronglyConnectedComponents(graph);
      
      expect(sccs).toHaveLength(1);
      
      const canFuse = canFuseSCC(graph, sccs[0].nodes);
      expect(canFuse.eligible).toBe(false);
      expect(canFuse.reason).toContain('Infinite multiplicity bound');
    });
  });

  // ============================================================================
  // Branch Fusion Tests
  // ============================================================================

  describe('Branch Fusion', () => {
    it('should allow fusion across safe splits', () => {
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = [
        { id: 'branch1', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'branch2', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      const merge = { id: 'merge', stream: createMetricsStream((x: any) => console.log(x)), operator: 'metrics' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      
      const canFuseSplit = canFuseAcrossSplit(graph, 'source', ['branch1', 'branch2']);
      expect(canFuseSplit.eligible).toBe(true);
    });

    it('should prevent fusion across unsafe splits', () => {
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = [
        { id: 'branch1', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'branch2', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const }
      ];
      const merge = { id: 'merge', stream: createMetricsStream((x: any) => console.log(x)), operator: 'metrics' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      
      const canFuseSplit = canFuseAcrossSplit(graph, 'source', ['branch1', 'branch2']);
      expect(canFuseSplit.eligible).toBe(false);
      expect(canFuseSplit.reason).toContain('violates safety');
    });

    it('should allow fusion across safe joins', () => {
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = [
        { id: 'branch1', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'branch2', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      const merge = { id: 'merge', stream: createScanStream(0, (acc: any, x: any) => acc + x, 1), operator: 'scan' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      
      const canFuseJoin = canFuseAcrossJoin(graph, 'merge', ['branch1', 'branch2']);
      expect(canFuseJoin.eligible).toBe(true);
    });

    it('should prevent fusion across unsafe joins', () => {
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = [
        { id: 'branch1', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'branch2', stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect"), operator: 'flatMap' as const }
      ];
      const merge = { id: 'merge', stream: createScanStream(0, (acc: any, x: any) => acc + x, 1), operator: 'scan' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      
      const canFuseJoin = canFuseAcrossJoin(graph, 'merge', ['branch1', 'branch2']);
      expect(canFuseJoin.eligible).toBe(false);
      expect(canFuseJoin.reason).toContain('unsafe effect');
    });
  });

  // ============================================================================
  // Graph Fusion Optimizer Tests
  // ============================================================================

  describe('Graph Fusion Optimizer', () => {
    it('should optimize linear graphs correctly', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.optimizeGraph(graph);
      
      expect(result.fusionStats.totalEdges).toBe(2);
      expect(result.fusionStats.eligibleEdges).toBe(2);
      expect(result.fusionStats.fusedEdges).toBe(2);
      expect(result.fusionStats.skippedEdges).toBe(0);
      expect(result.fusionStats.multiplicityViolations).toBe(0);
      expect(result.fusionStats.effectViolations).toBe(0);
    });

    it('should handle branching graphs correctly', () => {
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = [
        { id: 'branch1', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'branch2', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      const merge = { id: 'merge', stream: createScanStream(0, (acc: any, x: any) => acc + x, 1), operator: 'scan' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      const result = optimizer.optimizeGraph(graph);
      
      expect(result.fusionStats.totalEdges).toBe(4); // source->branch1, source->branch2, branch1->merge, branch2->merge
      expect(result.fusionStats.eligibleEdges).toBe(4);
      expect(result.fusionStats.fusedEdges).toBe(4);
    });

    it('should handle feedback graphs correctly', () => {
      const nodes = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'c', stream: createFilterStream((x: number) => x < 100), operator: 'filter' as const }
      ];
      
      const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
      const result = optimizer.optimizeGraph(graph);
      
      expect(result.fusionStats.feedbackCycles).toBe(1);
      expect(result.sccs).toHaveLength(1);
      expect(result.sccs[0].canFuse).toBe(true);
    });

    it('should skip unsafe feedback fusion', () => {
      const nodes = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFlatMapStream((x: number) => createMapStream(y => y * 2), "∞", "NonDeterministicEffect"), operator: 'flatMap' as const },
        { id: 'c', stream: createFilterStream((x: number) => x < 100), operator: 'filter' as const }
      ];
      
      const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
      const result = optimizer.optimizeGraph(graph);
      
      expect(result.fusionStats.feedbackCycles).toBe(1);
      expect(result.sccs).toHaveLength(1);
      expect(result.sccs[0].canFuse).toBe(false);
      expect(result.sccs[0].reason).toContain('Unsafe effect in cycle');
    });

    it('should handle mixed safe and unsafe operations', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createLogStream((x: number) => console.log(x)), operator: 'log' as const },
        { id: 'c', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.optimizeGraph(graph);
      
      expect(result.fusionStats.totalEdges).toBe(2);
      expect(result.fusionStats.eligibleEdges).toBe(0);
      expect(result.fusionStats.fusedEdges).toBe(0);
      expect(result.fusionStats.skippedEdges).toBe(2);
      expect(result.fusionStats.effectViolations).toBe(2);
    });
  });

  // ============================================================================
  // Complex Graph Tests
  // ============================================================================

  describe('Complex Graphs', () => {
    it('should handle complex branching with feedback', () => {
      // Create a complex graph: source -> (branch1, branch2) -> merge -> feedback -> source
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = [
        { id: 'branch1', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const },
        { id: 'branch2', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const }
      ];
      const merge = { id: 'merge', stream: createScanStream(0, (acc: any, x: any) => acc + x, 1), operator: 'scan' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      
      // Add feedback edge
      const mergeNode = graph.nodes.get('merge');
      const sourceNode = graph.nodes.get('source');
      if (mergeNode && sourceNode) {
        mergeNode.downstream.push('source');
        sourceNode.upstream.push('merge');
        graph.feedbackEdges.add('merge->source');
      }
      
      const result = optimizer.optimizeGraph(graph);
      
      expect(result.fusionStats.feedbackCycles).toBe(1);
      expect(result.sccs).toHaveLength(1);
      expect(result.sccs[0].canFuse).toBe(true);
    });

    it('should handle multiple feedback cycles', () => {
      // Create a graph with multiple cycles
      const nodes = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createScanStream(0, (acc: number, x: number) => acc + x, 1), operator: 'scan' as const },
        { id: 'c', stream: createFilterStream((x: number) => x < 100), operator: 'filter' as const },
        { id: 'd', stream: createMapStream((x: number) => x.toString()), operator: 'map' as const },
        { id: 'e', stream: createScanStream(0, (acc: string, x: string) => acc + x, 1), operator: 'scan' as const }
      ];
      
      const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
      
      // Add second feedback edge
      const eNode = graph.nodes.get('e');
      const dNode = graph.nodes.get('d');
      if (eNode && dNode) {
        eNode.downstream.push('d');
        dNode.upstream.push('e');
        graph.feedbackEdges.add('e->d');
      }
      
      const result = optimizer.optimizeGraph(graph);
      
      expect(result.fusionStats.feedbackCycles).toBeGreaterThan(0);
      expect(result.sccs.length).toBeGreaterThan(0);
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
      const result = optimizer.optimizeGraph(graph);
      
      const debugOutput = generateFusionGraphDebug(result);
      
      expect(debugOutput).toContain('# Graph Fusion Debug Output');
      expect(debugOutput).toContain('## Fusion Statistics');
      expect(debugOutput).toContain('## Strongly Connected Components');
      expect(debugOutput).toContain('## Fusion Edges');
      expect(debugOutput).toContain('Total edges: 2');
      expect(debugOutput).toContain('Eligible edges: 2');
    });

    it('should log fusion statistics', () => {
      const streams = [
        { id: 'a', stream: createMapStream((x: number) => x * 2), operator: 'map' as const },
        { id: 'b', stream: createFilterStream((x: number) => x > 0), operator: 'filter' as const }
      ];
      
      const graph = createLinearGraph(streams);
      const result = optimizer.optimizeGraph(graph);
      
      logGraphFusionStats(result.fusionStats);
      // Test passes if no errors are thrown
    });

    it('should enable and disable debug logging', () => {
      enableGraphFusionDebug();
      disableGraphFusionDebug();
      // Test passes if no errors are thrown
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should handle large graphs efficiently', () => {
      const start = performance.now();
      
      // Create a large linear graph
      const streams = Array.from({ length: 100 }, (_, i) => ({
        id: `node${i}`,
        stream: createMapStream((x: number) => x + i),
        operator: 'map' as const
      }));
      
      const graph = createLinearGraph(streams);
      const result = optimizer.optimizeGraph(graph);
      
      const end = performance.now();
      
      // Should complete within reasonable time (1000ms)
      expect(end - start).toBeLessThan(1000);
      expect(result.fusionStats.totalEdges).toBe(99);
      expect(result.fusionStats.eligibleEdges).toBe(99);
    });

    it('should handle complex branching efficiently', () => {
      const start = performance.now();
      
      // Create a complex branching graph
      const source = { id: 'source', stream: createMapStream((x: number) => x * 2), operator: 'map' as const };
      const branches = Array.from({ length: 10 }, (_, i) => ({
        id: `branch${i}`,
        stream: createFilterStream((x: number) => x > i),
        operator: 'filter' as const
      }));
      const merge = { id: 'merge', stream: createScanStream(0, (acc: any, x: any) => acc + x, 1), operator: 'scan' as const };
      
      const graph = createBranchingGraph(source, branches, merge);
      const result = optimizer.optimizeGraph(graph);
      
      const end = performance.now();
      
      // Should complete within reasonable time (500ms)
      expect(end - start).toBeLessThan(500);
      expect(result.fusionStats.totalEdges).toBe(20); // 10 source->branch + 10 branch->merge
    });
  });
}); 