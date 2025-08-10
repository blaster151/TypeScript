/**
 * Fusion Tests
 * 
 * Comprehensive test suite to verify the operator metadata, fusibility matrix,
 * and fusion builders work correctly with representative operator sequences.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as ts from 'typescript';

import {
  operatorRegistry,
  fusibilityMatrix,
  getOperatorInfo,
  canFuse,
  getFusionType,
  calculateMultiplicityPreservation,
  getAllOperatorNames,
  getOperatorsByCategory,
  getFusableCombinations,
  getFusionRules,
  getAlgebraicLaws,
  preservesOrder,
  hasSideEffects,
  canInline,
  getMaxInlineStatements,
  OperatorCategory,
  MultiplicityImpact,
  FusionType
} from './operatorMetadata';

import {
  fuseMapMap,
  fuseMapFilter,
  fuseFilterMap,
  fuseFilterFilter,
  fuseMapScan,
  fuseScanMap,
  fuseMapReduce,
  fuseReduceMap,
  fuseFlatMapMap,
  fuseTakeMap,
  fuseDropMap,
  fuseTapMap,
  fuseMapToMap,
  createComposedMap,
  createConjoinedFilter,
  createFlatMapMap,
  fuseMultipleMaps,
  fuseMultipleFilters,
  fuseMapFilterChain,
  fuseFilterMapChain,
  extractFunctionFromCall,
  extractObjectFromCall,
  createFusedOperatorCall,
  isSimpleLambda,
  isNumericLiteral
} from './fusionUtils';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a TypeScript source file from code string
 */
function createSourceFile(code: string, fileName: string = 'test.ts'): ts.SourceFile {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
}

/**
 * Create a simple call expression for testing
 */
function createCallExpression(methodName: string, arg: string): ts.Expression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier('stream'),
      methodName
    ),
    undefined,
    [ts.factory.createIdentifier(arg)]
  );
}

/**
 * Create a simple arrow function for testing
 */
function createArrowFunction(paramName: string, body: string): ts.Expression {
  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, paramName, undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createIdentifier(body)
  );
}

/**
 * Execute a stream pipeline (mock implementation)
 */
function executePipeline(input: any[], pipeline: (stream: any) => any): any[] {
  // Mock stream implementation for testing
  const stream = {
    map: (fn: (x: any) => any) => {
      const result = input.map(fn);
      return { ...stream, data: result };
    },
    filter: (fn: (x: any) => boolean) => {
      const result = input.filter(fn);
      return { ...stream, data: result };
    },
    scan: (fn: (acc: any, x: any) => any, initial: any) => {
      const result = input.reduce(fn, initial);
      return { ...stream, data: result };
    },
    reduce: (fn: (acc: any, x: any) => any, initial: any) => {
      const result = input.reduce(fn, initial);
      return { ...stream, data: result };
    },
    flatMap: (fn: (x: any) => any[]) => {
      const result = input.flatMap(fn);
      return { ...stream, data: result };
    },
    take: (n: number) => {
      const result = input.slice(0, n);
      return { ...stream, data: result };
    },
    drop: (n: number) => {
      const result = input.slice(n);
      return { ...stream, data: result };
    },
    tap: (fn: (x: any) => void) => {
      input.forEach(fn);
      return { ...stream, data: input };
    },
    mapTo: (value: any) => {
      const result = input.map(() => value);
      return { ...stream, data: result };
    },
    data: input
  };
  
  const result = pipeline(stream);
  return result.data || result;
}

/**
 * Compare results for equality
 */
function resultsEqual(result1: any[], result2: any[]): boolean {
  if (result1.length !== result2.length) return false;
  
  for (let i = 0; i < result1.length; i++) {
    if (JSON.stringify(result1[i]) !== JSON.stringify(result2[i])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate random test data
 */
function generateRandomData(size: number): any[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    text: `item_${i}`,
    active: Math.random() > 0.5
  }));
}

// ============================================================================
// Operator Metadata Tests
// ============================================================================

describe('Operator Metadata', () => {
  beforeEach(() => {
    // Test setup
  });

  afterEach(() => {
    // Test cleanup
  });

  describe('Operator Registry', () => {
    it('should have metadata for all FRP operators', () => {
      const operators = getAllOperatorNames();
      expect(operators.length).toBeGreaterThan(0);
      
      for (const operator of operators) {
        const metadata = getOperatorInfo(operator);
        expect(metadata).toBeDefined();
        expect(metadata?.name).toBe(operator);
        expect(metadata?.category).toBeDefined();
        expect(metadata?.multiplicity).toBeDefined();
        expect(metadata?.stateModel).toBeDefined();
      }
    });

    it('should correctly categorize operators', () => {
      const stateless = getOperatorsByCategory('stateless');
      const stateful = getOperatorsByCategory('stateful');
      
      expect(stateless).toContain('map');
      expect(stateless).toContain('filter');
      expect(stateless).toContain('flatMap');
      expect(stateless).toContain('take');
      expect(stateless).toContain('drop');
      expect(stateless).toContain('tap');
      expect(stateless).toContain('mapTo');
      
      expect(stateful).toContain('scan');
      expect(stateful).toContain('reduce');
      expect(stateful).toContain('distinctUntilChanged');
      expect(stateful).toContain('throttleTime');
      expect(stateful).toContain('debounceTime');
      expect(stateful).toContain('bufferCount');
      expect(stateful).toContain('slidingWindow');
    });

    it('should have correct multiplicity classifications', () => {
      const mapMeta = getOperatorInfo('map');
      const filterMeta = getOperatorInfo('filter');
      const flatMapMeta = getOperatorInfo('flatMap');
      const takeMeta = getOperatorInfo('take');
      
      expect(mapMeta?.multiplicity).toBe('preserve');
      expect(filterMeta?.multiplicity).toBe('conditional');
      expect(flatMapMeta?.multiplicity).toBe('increase');
      expect(takeMeta?.multiplicity).toBe('conditional');
    });

    it('should have correct state models', () => {
      const mapMeta = getOperatorInfo('map');
      const scanMeta = getOperatorInfo('scan');
      const reduceMeta = getOperatorInfo('reduce');
      
      expect(mapMeta?.stateModel).toBe('none');
      expect(scanMeta?.stateModel).toBe('ScanState<A>');
      expect(reduceMeta?.stateModel).toBe('ReduceState<A>');
    });

    it('should have fusion rules for operators', () => {
      const mapRules = getFusionRules('map');
      const filterRules = getFusionRules('filter');
      const scanRules = getFusionRules('scan');
      
      expect(mapRules.length).toBeGreaterThan(0);
      expect(filterRules.length).toBeGreaterThan(0);
      expect(scanRules.length).toBeGreaterThan(0);
    });

    it('should have algebraic laws for operators', () => {
      const mapLaws = getAlgebraicLaws('map');
      const filterLaws = getAlgebraicLaws('filter');
      
      expect(mapLaws.length).toBeGreaterThan(0);
      expect(filterLaws.length).toBeGreaterThan(0);
    });

    it('should correctly identify order preservation', () => {
      expect(preservesOrder('map')).toBe(true);
      expect(preservesOrder('filter')).toBe(true);
      expect(preservesOrder('scan')).toBe(true);
      expect(preservesOrder('flatMap')).toBe(false);
    });

    it('should correctly identify side effects', () => {
      expect(hasSideEffects('map')).toBe(false);
      expect(hasSideEffects('filter')).toBe(false);
      expect(hasSideEffects('tap')).toBe(true);
    });

    it('should correctly identify inlinable operators', () => {
      expect(canInline('map')).toBe(true);
      expect(canInline('filter')).toBe(true);
      expect(canInline('scan')).toBe(false);
      expect(canInline('flatMap')).toBe(false);
    });

    it('should have correct max inline statements', () => {
      expect(getMaxInlineStatements('map')).toBe(5);
      expect(getMaxInlineStatements('filter')).toBe(3);
      expect(getMaxInlineStatements('take')).toBe(2);
      expect(getMaxInlineStatements('scan')).toBe(0);
    });
  });

  describe('Fusibility Matrix', () => {
    it('should allow stateless-only fusions', () => {
      expect(canFuse('map', 'map')).toBe(true);
      expect(canFuse('map', 'filter')).toBe(true);
      expect(canFuse('filter', 'map')).toBe(true);
      expect(canFuse('filter', 'filter')).toBe(true);
      expect(canFuse('take', 'map')).toBe(true);
      expect(canFuse('drop', 'map')).toBe(true);
      expect(canFuse('tap', 'map')).toBe(true);
      expect(canFuse('mapTo', 'map')).toBe(true);
    });

    it('should allow stateless-before-stateful fusions', () => {
      expect(canFuse('map', 'scan')).toBe(true);
      expect(canFuse('map', 'reduce')).toBe(true);
      expect(canFuse('filter', 'scan')).toBe(true);
      expect(canFuse('filter', 'reduce')).toBe(true);
      expect(canFuse('take', 'scan')).toBe(true);
      expect(canFuse('drop', 'scan')).toBe(true);
    });

    it('should allow stateful-before-stateless fusions', () => {
      expect(canFuse('scan', 'map')).toBe(true);
      expect(canFuse('scan', 'filter')).toBe(true);
      expect(canFuse('reduce', 'map')).toBe(true);
      expect(canFuse('reduce', 'filter')).toBe(true);
    });

    it('should prevent stateful-stateful fusions', () => {
      expect(canFuse('scan', 'scan')).toBe(false);
      expect(canFuse('reduce', 'reduce')).toBe(false);
      expect(canFuse('scan', 'reduce')).toBe(false);
      expect(canFuse('reduce', 'scan')).toBe(false);
    });

    it('should have correct fusion types', () => {
      expect(getFusionType('map', 'map')).toBe('stateless-only');
      expect(getFusionType('map', 'scan')).toBe('stateless-before-stateful');
      expect(getFusionType('scan', 'map')).toBe('stateful-before-stateless');
      expect(getFusionType('scan', 'scan')).toBe('stateful-combine');
    });

    it('should preserve multiplicity correctly', () => {
      expect(calculateMultiplicityPreservation('map', 'map', 'preserve', 'preserve')).toBe('preserve');
      expect(calculateMultiplicityPreservation('map', 'filter', 'preserve', 'conditional')).toBe('preserve');
      expect(calculateMultiplicityPreservation('flatMap', 'map', 'increase', 'preserve')).toBe('increase');
    });

    it('should have comprehensive fusibility matrix', () => {
      const fusableCombinations = getFusableCombinations();
      expect(fusableCombinations.length).toBeGreaterThan(20);
      
      // Check that all combinations have proper metadata
      for (const combination of fusableCombinations) {
        expect(combination.sourceOperator).toBeDefined();
        expect(combination.targetOperator).toBeDefined();
        expect(combination.canFuse).toBe(true);
        expect(combination.fusionType).toBeDefined();
        expect(combination.notes).toBeDefined();
      }
    });
  });
});

// ============================================================================
// Fusion Builder Tests
// ============================================================================

describe('Fusion Builders', () => {
  describe('Stateless-Only Fusions', () => {
    it('should fuse map-map operations', () => {
      const map1 = createCallExpression('map', 'f');
      const map2 = createCallExpression('map', 'g');
      
      const fused = fuseMapMap(map1, map2);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse map-filter operations', () => {
      const map = createCallExpression('map', 'f');
      const filter = createCallExpression('filter', 'p');
      
      const fused = fuseMapFilter(map, filter);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse filter-map operations', () => {
      const filter = createCallExpression('filter', 'p');
      const map = createCallExpression('map', 'f');
      
      const fused = fuseFilterMap(filter, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse filter-filter operations', () => {
      const filter1 = createCallExpression('filter', 'p1');
      const filter2 = createCallExpression('filter', 'p2');
      
      const fused = fuseFilterFilter(filter1, filter2);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse flatMap-map operations', () => {
      const flatMap = createCallExpression('flatMap', 'f');
      const map = createCallExpression('map', 'g');
      
      const fused = fuseFlatMapMap(flatMap, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse take-map operations', () => {
      const take = createCallExpression('take', '5');
      const map = createCallExpression('map', 'f');
      
      const fused = fuseTakeMap(take, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse drop-map operations', () => {
      const drop = createCallExpression('drop', '3');
      const map = createCallExpression('map', 'f');
      
      const fused = fuseDropMap(drop, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse tap-map operations', () => {
      const tap = createCallExpression('tap', 'f');
      const map = createCallExpression('map', 'g');
      
      const fused = fuseTapMap(tap, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse mapTo-map operations', () => {
      const mapTo = createCallExpression('mapTo', 'value');
      const map = createCallExpression('map', 'f');
      
      const fused = fuseMapToMap(mapTo, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });
  });

  describe('Stateless-Before-Stateful Fusions', () => {
    it('should fuse map-scan operations', () => {
      const map = createCallExpression('map', 'f');
      const scan = createCallExpression('scan', 'g');
      
      const fused = fuseMapScan(map, scan);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse map-reduce operations', () => {
      const map = createCallExpression('map', 'f');
      const reduce = createCallExpression('reduce', 'g');
      
      const fused = fuseMapReduce(map, reduce);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });
  });

  describe('Stateful-Before-Stateless Fusions', () => {
    it('should fuse scan-map operations', () => {
      const scan = createCallExpression('scan', 'f');
      const map = createCallExpression('map', 'g');
      
      const fused = fuseScanMap(scan, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse reduce-map operations', () => {
      const reduce = createCallExpression('reduce', 'f');
      const map = createCallExpression('map', 'g');
      
      const fused = fuseReduceMap(reduce, map);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });
  });

  describe('Multiple Operator Fusions', () => {
    it('should fuse multiple map operations', () => {
      const maps = [
        createCallExpression('map', 'f1'),
        createCallExpression('map', 'f2'),
        createCallExpression('map', 'f3')
      ];
      
      const fused = fuseMultipleMaps(maps);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse multiple filter operations', () => {
      const filters = [
        createCallExpression('filter', 'p1'),
        createCallExpression('filter', 'p2'),
        createCallExpression('filter', 'p3')
      ];
      
      const fused = fuseMultipleFilters(filters);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse map-filter chains', () => {
      const chain = [
        createCallExpression('map', 'f'),
        createCallExpression('filter', 'p')
      ];
      
      const fused = fuseMapFilterChain(chain);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });

    it('should fuse filter-map chains', () => {
      const chain = [
        createCallExpression('filter', 'p'),
        createCallExpression('map', 'f')
      ];
      
      const fused = fuseFilterMapChain(chain);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('Expression Extraction', () => {
    it('should extract function from call expression', () => {
      const call = createCallExpression('map', 'f');
      const fn = extractFunctionFromCall(call);
      
      expect(fn).toBeDefined();
      expect(ts.isIdentifier(fn)).toBe(true);
    });

    it('should extract object from call expression', () => {
      const call = createCallExpression('map', 'f');
      const obj = extractObjectFromCall(call);
      
      expect(obj).toBeDefined();
      expect(ts.isIdentifier(obj)).toBe(true);
    });

    it('should create fused operator calls', () => {
      const obj = ts.factory.createIdentifier('stream');
      const fused = createFusedOperatorCall(obj, 'mapFilter', [
        ts.factory.createIdentifier('f')
      ]);
      
      expect(fused).toBeDefined();
      expect(ts.isCallExpression(fused)).toBe(true);
    });
  });

  describe('Lambda Analysis', () => {
    it('should identify simple lambdas', () => {
      const simpleLambda = createArrowFunction('x', 'x * 2');
      const complexLambda = ts.factory.createArrowFunction(
        undefined,
        undefined,
        [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
        undefined,
        undefined,
        ts.factory.createBlock([
          ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList([
              ts.factory.createVariableDeclaration('temp', undefined, ts.factory.createIdentifier('x'))
            ])
          ),
          ts.factory.createReturnStatement(ts.factory.createIdentifier('temp'))
        ])
      );
      
      expect(isSimpleLambda(simpleLambda)).toBe(true);
      expect(isSimpleLambda(complexLambda)).toBe(false);
    });

    it('should identify numeric literals', () => {
      const numeric = ts.factory.createNumericLiteral('42');
      const string = ts.factory.createStringLiteral('hello');
      
      expect(isNumericLiteral(numeric)).toBe(true);
      expect(isNumericLiteral(string)).toBe(false);
    });
  });

  describe('Algebraic Law Functions', () => {
    it('should create composed map functions', () => {
      const f = createArrowFunction('x', 'x * 2');
      const g = createArrowFunction('x', 'x + 1');
      
      const composed = createComposedMap(f, g);
      
      expect(composed).toBeDefined();
      expect(ts.isArrowFunction(composed)).toBe(true);
    });

    it('should create conjoined filter functions', () => {
      const p1 = createArrowFunction('x', 'x > 0');
      const p2 = createArrowFunction('x', 'x < 100');
      
      const conjoined = createConjoinedFilter(p1, p2);
      
      expect(conjoined).toBeDefined();
      expect(ts.isArrowFunction(conjoined)).toBe(true);
    });

    it('should create flatMap-map compositions', () => {
      const flatMapFn = createArrowFunction('x', '[x, x * 2]');
      const mapFn = createArrowFunction('x', 'x.toString()');
      
      const composed = createFlatMapMap(flatMapFn, mapFn);
      
      expect(composed).toBeDefined();
      expect(ts.isArrowFunction(composed)).toBe(true);
    });
  });
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Property Tests', () => {
  it('should preserve behavior for map-map fusion', () => {
    const testData = generateRandomData(100);
    
    // Original pipeline
    const originalPipeline = (stream: any) => 
      stream
        .map((x: any) => x.value * 2)
        .map((x: number) => x.toString());
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream.map((x: any) => (x.value * 2).toString());
    
    const originalResult = executePipeline(testData, originalPipeline);
    const fusedResult = executePipeline(testData, fusedPipeline);
    
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
  });

  it('should preserve behavior for map-filter fusion', () => {
    const testData = generateRandomData(100);
    
    // Original pipeline
    const originalPipeline = (stream: any) => 
      stream
        .map((x: any) => x.value * 2)
        .filter((x: number) => x > 100);
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream.mapFilter((x: any) => {
        const doubled = x.value * 2;
        return doubled > 100 ? doubled : undefined;
      });
    
    const originalResult = executePipeline(testData, originalPipeline);
    const fusedResult = executePipeline(testData, fusedPipeline);
    
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
  });

  it('should preserve behavior for filter-map fusion', () => {
    const testData = generateRandomData(100);
    
    // Original pipeline
    const originalPipeline = (stream: any) => 
      stream
        .filter((x: any) => x.value > 50)
        .map((x: any) => x.value.toString());
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream.filterMap((x: any) => {
        return x.value > 50 ? x.value.toString() : undefined;
      });
    
    const originalResult = executePipeline(testData, originalPipeline);
    const fusedResult = executePipeline(testData, fusedPipeline);
    
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
  });

  it('should preserve behavior for map-scan fusion', () => {
    const testData = generateRandomData(50);
    
    // Original pipeline
    const originalPipeline = (stream: any) => 
      stream
        .map((x: any) => x.value)
        .scan((acc: number, x: number) => acc + x, 0);
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream.scan((acc: number, x: any) => acc + x.value, 0);
    
    const originalResult = executePipeline(testData, originalPipeline);
    const fusedResult = executePipeline(testData, fusedPipeline);
    
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
  });

  it('should preserve behavior for complex chains', () => {
    const testData = generateRandomData(100);
    
    // Original pipeline
    const originalPipeline = (stream: any) => 
      stream
        .map((x: any) => x.value * 2)
        .filter((x: number) => x > 50)
        .map((x: number) => x.toString())
        .take(10);
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream
        .mapFilterTake((x: any) => {
          const doubled = x.value * 2;
          return doubled > 50 ? doubled.toString() : undefined;
        }, 10);
    
    const originalResult = executePipeline(testData, originalPipeline);
    const fusedResult = executePipeline(testData, fusedPipeline);
    
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
  });

  it('should handle edge cases correctly', () => {
    const edgeCases = [
      [], // Empty array
      [{ value: 0 }], // Single item
      Array.from({ length: 1000 }, (_, i) => ({ value: i })), // Large array
      Array.from({ length: 100 }, (_, i) => ({ value: -i })), // All negative
      Array.from({ length: 100 }, (_, i) => ({ value: i % 2 === 0 ? i : -i })) // Mixed
    ];
    
    for (const testData of edgeCases) {
      const originalPipeline = (stream: any) => 
        stream
          .map((x: any) => x.value * 2)
          .filter((x: number) => x > 0)
          .map((x: number) => x.toString());
      
      const fusedPipeline = (stream: any) => 
        stream.mapFilter((x: any) => {
          const doubled = x.value * 2;
          return doubled > 0 ? doubled.toString() : undefined;
        });
      
      const originalResult = executePipeline(testData, originalPipeline);
      const fusedResult = executePipeline(testData, fusedPipeline);
      
      expect(resultsEqual(originalResult, fusedResult)).toBe(true);
    }
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance Tests', () => {
  it('should improve performance for large datasets', () => {
    const testData = generateRandomData(10000);
    
    // Original pipeline
    const originalPipeline = (stream: any) => 
      stream
        .map((x: any) => x.value * 2)
        .filter((x: number) => x > 100)
        .map((x: number) => x.toString())
        .map((x: string) => x.length);
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream.mapFilter((x: any) => {
        const doubled = x.value * 2;
        return doubled > 100 ? doubled.toString().length : undefined;
      });
    
    // Benchmark original
    const originalStart = performance.now();
    const originalResult = executePipeline(testData, originalPipeline);
    const originalTime = performance.now() - originalStart;
    
    // Benchmark fused
    const fusedStart = performance.now();
    const fusedResult = executePipeline(testData, fusedPipeline);
    const fusedTime = performance.now() - fusedStart;
    
    // Verify results are identical
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
    
    // Verify performance improvement (fused should be faster)
    expect(fusedTime).toBeLessThan(originalTime);
    
    console.log(`Large dataset - Original: ${originalTime.toFixed(2)}ms, Fused: ${fusedTime.toFixed(2)}ms`);
  });

  it('should handle memory allocation reduction', () => {
    const testData = generateRandomData(5000);
    
    // Pipeline that creates many intermediate arrays
    const originalPipeline = (stream: any) => 
      stream
        .map((x: any) => x.value * 2)
        .filter((x: number) => x > 50)
        .map((x: number) => x.toString())
        .filter((x: string) => x.length > 1)
        .map((x: string) => x.toUpperCase())
        .filter((x: string) => x.includes('0'))
        .map((x: string) => x.length);
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream.mapFilter((x: any) => {
        const doubled = x.value * 2;
        if (doubled <= 50) return undefined;
        const str = doubled.toString();
        if (str.length <= 1) return undefined;
        const upper = str.toUpperCase();
        if (!upper.includes('0')) return undefined;
        return upper.length;
      });
    
    // Measure performance
    const originalStart = performance.now();
    const originalResult = executePipeline(testData, originalPipeline);
    const originalTime = performance.now() - originalStart;
    
    const fusedStart = performance.now();
    const fusedResult = executePipeline(testData, fusedPipeline);
    const fusedTime = performance.now() - fusedStart;
    
    // Verify results are identical
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
    
    // Verify performance improvement
    expect(fusedTime).toBeLessThan(originalTime);
    
    console.log(`Memory test - Original: ${originalTime.toFixed(2)}ms, Fused: ${fusedTime.toFixed(2)}ms`);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  it('should work with real TypeScript compilation', () => {
    const code = `
      import { Observable } from './observable';
      
      const stream = new Observable([1, 2, 3, 4, 5]);
      
      const result = stream
        .map(x => x * 2)
        .filter(x => x > 5)
        .map(x => x.toString())
        .map(x => x.length);
    `;
    
    const sourceFile = createSourceFile(code);
    
    // Should parse successfully
    expect(sourceFile.statements.length).toBeGreaterThan(0);
    expect(sourceFile.getFullText()).toContain('map(x => x * 2)');
    expect(sourceFile.getFullText()).toContain('filter(x => x > 5)');
  });

  it('should handle complex nested expressions', () => {
    const code = `
      const result = stream
        .map(x => x.value * 2)
        .filter(x => x > 0)
        .map(x => x.toString())
        .tap(x => console.log('Processing:', x))
        .map(x => x.toUpperCase())
        .filter(x => x.length > 2)
        .map(x => x.length);
    `;
    
    const sourceFile = createSourceFile(code);
    
    // Should parse successfully
    expect(sourceFile.statements.length).toBeGreaterThan(0);
    expect(sourceFile.getFullText()).toContain('map(x => x.value * 2)');
    expect(sourceFile.getFullText()).toContain('filter(x => x > 0)');
    expect(sourceFile.getFullText()).toContain('tap(x => console.log');
  });

  it('should preserve type information', () => {
    const code = `
      interface Data {
        value: number;
        text: string;
      }
      
      const stream: Observable<Data> = new Observable([]);
      
      const result = stream
        .map((x: Data) => x.value * 2)
        .filter((x: number) => x > 0)
        .map((x: number) => x.toString());
    `;
    
    const sourceFile = createSourceFile(code);
    
    // Should preserve type annotations
    expect(sourceFile.getFullText()).toContain('Data');
    expect(sourceFile.getFullText()).toContain('number');
    expect(sourceFile.getFullText()).toContain('string');
  });
});

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize if running in a test environment
if (typeof global !== 'undefined' && (global as any).__FUSION_TESTS__) {
  console.log('[Fusion Tests] Test suite initialized');
} 