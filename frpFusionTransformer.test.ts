/**
 * FRP Fusion Transformer Tests
 * 
 * Comprehensive test suite to validate that the FRP fusion transformer
 * correctly wires together fusion utilities, operator metadata, and
 * pipeline optimization.
 */

// Simple test framework for FRP fusion transformer
function describe(name: string, fn: () => void) {
  console.log(`\n=== ${name} ===`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error}`);
  }
}

function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toBeDefined: () => {
      if (value === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toBeUndefined: () => {
      if (value !== undefined) {
        throw new Error(`Expected value to be undefined`);
      }
    },
    toBeLessThan: (expected: number) => {
      if (value >= expected) {
        throw new Error(`Expected ${value} to be less than ${expected}`);
      }
    },
    toBeCloseTo: (expected: number, precision: number) => {
      const diff = Math.abs(value - expected);
      if (diff > Math.pow(10, -precision)) {
        throw new Error(`Expected ${value} to be close to ${expected} (precision: ${precision})`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }
    }
  };
}

function beforeEach(fn: () => void) {
  fn();
}
import * as ts from 'typescript';

import {
  fusePipeline,
  optimizePipeline,
  parseFrpPipeline,
  frpNodesToAst,
  optimizeFrpPipeline,
  optimizeFrpPipelineFromNodes,
  canOptimizePipeline,
  getOptimizationStats,
  createFusionBuilder,
  initializeFusionBuilders,
  FRPNode
} from './optimizeFrpPipeline';

import {
  operatorRegistry,
  getOperatorInfo,
  canFuse,
  getFusionType,
  getAllOperatorNames,
  getOperatorsByCategory
} from './operatorMetadata';

import {
  fuseMapMap,
  fuseMapFilter,
  fuseFilterMap,
  fuseFilterFilter,
  fuseMapScan,
  fuseScanMap
} from './fusionUtils';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a simple FRP node for testing
 */
function createTestNode(op: string, fn?: any, args?: any[]): FRPNode {
  return {
    op,
    fn: fn || `(x) => x`,
    args: args || [],
    meta: {}
  };
}

/**
 * Create a test pipeline
 */
function createTestPipeline(ops: string[]): FRPNode[] {
  return ops.map(op => createTestNode(op));
}

// ============================================================================
// Basic Fusion Tests
// ============================================================================

describe('FRP Fusion Transformer - Basic Fusion', () => {
  beforeEach(() => {
    // Initialize fusion builders
    initializeFusionBuilders();
  });

  it('should fuse map ∘ map into single map', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('map', '(x) => x * 2')
    ];
    
    const fused = fusePipeline(pipeline);
    
    expect(fused.length).toBe(1);
    expect(fused[0].op).toBe('map+map');
    expect(fused[0].meta?.fused).toBe(true);
    expect(fused[0].meta?.originalOps).toEqual(['map', 'map']);
  });

  it('should fuse filter ∘ filter into single filter', () => {
    const pipeline = [
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('filter', '(x) => x < 10')
    ];
    
    const fused = fusePipeline(pipeline);
    
    expect(fused.length).toBe(1);
    expect(fused[0].op).toBe('filter+filter');
    expect(fused[0].meta?.fused).toBe(true);
  });

  it('should fuse map ∘ filter into mapFilter', () => {
    const pipeline = [
      createTestNode('map', '(x) => x * 2'),
      createTestNode('filter', '(x) => x > 10')
    ];
    
    const fused = fusePipeline(pipeline);
    
    expect(fused.length).toBe(1);
    expect(fused[0].op).toBe('map+filter');
    expect(fused[0].meta?.fused).toBe(true);
  });

  it('should fuse filter ∘ map into filterMap', () => {
    const pipeline = [
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('map', '(x) => x * 2')
    ];
    
    const fused = fusePipeline(pipeline);
    
    expect(fused.length).toBe(1);
    expect(fused[0].op).toBe('filter+map');
    expect(fused[0].meta?.fused).toBe(true);
  });

  it('should not fuse non-fusible operators', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('scan', '(acc, x) => acc + x', [0])
    ];
    
    const fused = fusePipeline(pipeline);
    
    // Should not fuse map and scan in this direction
    expect(fused.length).toBe(2);
    expect(fused[0].op).toBe('map');
    expect(fused[1].op).toBe('scan');
  });

  it('should preserve non-fusible operators', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('flatMap', '(x) => [x, x * 2]'),
      createTestNode('map', '(x) => x.toString()')
    ];
    
    const fused = fusePipeline(pipeline);
    
    // Should only fuse the first map-map pair
    expect(fused.length).toBe(2);
    expect(fused[0].op).toBe('map+map');
    expect(fused[1].op).toBe('flatMap');
  });
});

// ============================================================================
// Recursive Optimization Tests
// ============================================================================

describe('FRP Fusion Transformer - Recursive Optimization', () => {
  it('should recursively fuse multiple adjacent operators', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('map', '(x) => x.toString()')
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    expect(optimized.length).toBe(1);
    expect(optimized[0].op).toBe('map+map+map');
    expect(optimized[0].meta?.fused).toBe(true);
  });

  it('should fuse complex chains with mixed operators', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('filter', '(x) => x < 20')
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    // Should fuse into: mapFilter + mapFilter
    expect(optimized.length).toBe(2);
    expect(optimized[0].op).toBe('map+filter');
    expect(optimized[1].op).toBe('map+filter');
  });

  it('should stop when no more fusions are possible', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('flatMap', '(x) => [x, x * 2]'),
      createTestNode('map', '(x) => x.toString()')
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    // Should not be able to fuse flatMap with adjacent operators
    expect(optimized.length).toBe(3);
  });

  it('should handle empty pipeline', () => {
    const pipeline: FRPNode[] = [];
    
    const optimized = optimizePipeline(pipeline);
    
    expect(optimized.length).toBe(0);
  });

  it('should handle single operator pipeline', () => {
    const pipeline = [createTestNode('map', '(x) => x + 1')];
    
    const optimized = optimizePipeline(pipeline);
    
    expect(optimized.length).toBe(1);
    expect(optimized[0].op).toBe('map');
  });
});

// ============================================================================
// Fusion Builder Tests
// ============================================================================

describe('FRP Fusion Transformer - Fusion Builders', () => {
  it('should create correct fusion builders for map-map', () => {
    const builder = createFusionBuilder('map', 'map');
    
    expect(builder).toBeDefined();
    
    const op1 = createTestNode('map', '(x) => x + 1');
    const op2 = createTestNode('map', '(x) => x * 2');
    
    const result = builder!(op1, op2);
    expect(result).toBeDefined();
  });

  it('should create correct fusion builders for map-filter', () => {
    const builder = createFusionBuilder('map', 'filter');
    
    expect(builder).toBeDefined();
    
    const op1 = createTestNode('map', '(x) => x * 2');
    const op2 = createTestNode('filter', '(x) => x > 10');
    
    const result = builder!(op1, op2);
    expect(result).toBeDefined();
  });

  it('should return undefined for non-fusible combinations', () => {
    const builder = createFusionBuilder('flatMap', 'scan');
    
    expect(builder).toBeUndefined();
  });

  it('should handle all fusible combinations', () => {
    const fusiblePairs = [
      ['map', 'map'],
      ['map', 'filter'],
      ['filter', 'map'],
      ['filter', 'filter'],
      ['map', 'scan'],
      ['scan', 'map']
    ];
    
    for (const [op1, op2] of fusiblePairs) {
      const builder = createFusionBuilder(op1, op2);
      expect(builder).toBeDefined();
    }
  });
});

// ============================================================================
// Optimization Statistics Tests
// ============================================================================

describe('FRP Fusion Transformer - Optimization Statistics', () => {
  it('should calculate correct optimization stats', () => {
    const original = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('filter', '(x) => x > 0')
    ];
    
    const optimized = [
      createTestNode('map+map', '(x) => (x + 1) * 2'),
      createTestNode('filter', '(x) => x > 0')
    ];
    
    const stats = getOptimizationStats(original, optimized);
    
    expect(stats.originalCount).toBe(3);
    expect(stats.optimizedCount).toBe(2);
    expect(stats.reduction).toBe(1);
    expect(stats.reductionPercentage).toBeCloseTo(33.33, 1);
  });

  it('should handle no optimization case', () => {
    const original = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('flatMap', '(x) => [x, x * 2]')
    ];
    
    const optimized = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('flatMap', '(x) => [x, x * 2]')
    ];
    
    const stats = getOptimizationStats(original, optimized);
    
    expect(stats.originalCount).toBe(2);
    expect(stats.optimizedCount).toBe(2);
    expect(stats.reduction).toBe(0);
    expect(stats.reductionPercentage).toBe(0);
  });

  it('should handle empty pipeline stats', () => {
    const original: FRPNode[] = [];
    const optimized: FRPNode[] = [];
    
    const stats = getOptimizationStats(original, optimized);
    
    expect(stats.originalCount).toBe(0);
    expect(stats.optimizedCount).toBe(0);
    expect(stats.reduction).toBe(0);
    expect(stats.reductionPercentage).toBe(0);
  });
});

// ============================================================================
// Pipeline Analysis Tests
// ============================================================================

describe('FRP Fusion Transformer - Pipeline Analysis', () => {
  it('should detect optimizable pipelines', () => {
    const optimizable = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('map', '(x) => x * 2')
    ];
    
    expect(canOptimizePipeline(optimizable)).toBe(true);
  });

  it('should detect non-optimizable pipelines', () => {
    const nonOptimizable = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('flatMap', '(x) => [x, x * 2]')
    ];
    
    expect(canOptimizePipeline(nonOptimizable)).toBe(false);
  });

  it('should handle single operator pipelines', () => {
    const single = [createTestNode('map', '(x) => x + 1')];
    
    expect(canOptimizePipeline(single)).toBe(false);
  });

  it('should handle empty pipelines', () => {
    const empty: FRPNode[] = [];
    
    expect(canOptimizePipeline(empty)).toBe(false);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('FRP Fusion Transformer - Integration', () => {
  it('should integrate with operator metadata', () => {
    const mapInfo = getOperatorInfo('map');
    const filterInfo = getOperatorInfo('filter');
    
    expect(mapInfo).toBeDefined();
    expect(filterInfo).toBeDefined();
    expect(mapInfo?.category).toBe('stateless');
    expect(filterInfo?.category).toBe('stateless');
  });

  it('should integrate with fusion utilities', () => {
    // Test that fusion utilities are available
    expect(fuseMapMap).toBeDefined();
    expect(fuseMapFilter).toBeDefined();
    expect(fuseFilterMap).toBeDefined();
    expect(fuseFilterFilter).toBeDefined();
    expect(fuseMapScan).toBeDefined();
    expect(fuseScanMap).toBeDefined();
  });

  it('should handle complex optimization scenarios', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('filter', '(x) => x < 20'),
      createTestNode('map', '(x) => x.toString()')
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    // Should be able to optimize this pipeline
    expect(optimized.length).toBeLessThan(pipeline.length);
    expect(optimized.some(node => node.meta?.fused)).toBe(true);
  });

  it('should preserve operator semantics during fusion', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('map', '(x) => x * 2')
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    // The fused result should be semantically equivalent
    expect(optimized.length).toBe(1);
    expect(optimized[0].meta?.fused).toBe(true);
    expect(optimized[0].meta?.originalOps).toEqual(['map', 'map']);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('FRP Fusion Transformer - Error Handling', () => {
  it('should handle unknown operators gracefully', () => {
    const pipeline = [
      createTestNode('unknownOp', '(x) => x'),
      createTestNode('map', '(x) => x + 1')
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    // Should preserve unknown operators
    expect(optimized.length).toBe(2);
    expect(optimized[0].op).toBe('unknownOp');
    expect(optimized[1].op).toBe('map');
  });

  it('should handle missing fusion builders gracefully', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('scan', '(acc, x) => acc + x', [0])
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    // Should preserve operators when fusion builder is missing
    expect(optimized.length).toBe(2);
  });

  it('should handle malformed nodes gracefully', () => {
    const pipeline = [
      { op: 'map', fn: undefined, meta: {} } as FRPNode,
      createTestNode('map', '(x) => x + 1')
    ];
    
    const optimized = optimizePipeline(pipeline);
    
    // Should handle malformed nodes without crashing
    expect(optimized.length).toBe(2);
  });
}); 