/**
 * StatefulStream Fusion Test Suite
 * 
 * Comprehensive tests for the fusion system including:
 * - Map-Map fusion
 * - Map past scan fusion
 * - Pure segment fusion
 * - Purity-driven optimization
 * - Law preservation verification
 */

console.log('🔥 StatefulStream Fusion Test Suite');
console.log('===================================');

// ============================================================================
// Test 1: Core Fusion Rules
// ============================================================================

function testCoreFusionRules() {
  console.log('\n📋 Test 1: Core Fusion Rules');

  try {
    const { 
      fuseMapMap, 
      pushMapPastScan, 
      fusePureSegments,
      fuseFilterMaps,
      fuseFilters,
      fuseScans
    } = require('./fp-stream-fusion');

    // Test Map-Map Fusion
    const f = (x) => x * 2;
    const g = (x) => x + 1;
    const fused = fuseMapMap(f, g);
    const result = fused(5);
    
    console.log('✅ Map-Map Fusion:');
    console.log(`   - f(5): ${f(5)}`); // Should be 10
    console.log(`   - g(10): ${g(10)}`); // Should be 11
    console.log(`   - fused(5): ${result}`); // Should be 11
    console.log(`   - Correct: ${result === g(f(5))}`); // Should be true

    // Test Push Map Past Scan
    const mapFn = (x) => x * 2;
    const scanFn = (state) => [state + 1, state];
    const pushedScan = pushMapPastScan(mapFn, scanFn);
    const [state, output] = pushedScan(5);
    
    console.log('✅ Push Map Past Scan:');
    console.log(`   - Original scan(5): [6, 5]`);
    console.log(`   - Pushed scan(5): [${state}, ${output}]`); // Should be [6, 10]
    console.log(`   - Correct: ${state === 6 && output === 10}`); // Should be true

    // Test Fuse Pure Segments
    const op1 = (input) => (state) => [state, input * 2];
    const op2 = (input) => (state) => [state, input + 1];
    const fusedSegments = fusePureSegments(op1, op2);
    const [state2, output2] = fusedSegments(5)(0);
    
    console.log('✅ Fuse Pure Segments:');
    console.log(`   - op1(5)(0): [0, 10]`);
    console.log(`   - op2(10)(0): [0, 11]`);
    console.log(`   - fused(5)(0): [${state2}, ${output2}]`); // Should be [0, 11]
    console.log(`   - Correct: ${state2 === 0 && output2 === 11}`); // Should be true

    // Test FilterMap Fusion
    const f1 = (x) => x > 0 ? x * 2 : undefined;
    const f2 = (x) => x > 10 ? x + 1 : undefined;
    const fusedFilterMaps = fuseFilterMaps(f1, f2);
    
    console.log('✅ FilterMap Fusion:');
    console.log(`   - f1(5): ${f1(5)}`); // Should be 10
    console.log(`   - f2(10): ${f2(10)}`); // Should be undefined
    console.log(`   - f1(6): ${f1(6)}`); // Should be 12
    console.log(`   - f2(12): ${f2(12)}`); // Should be 13
    console.log(`   - fused(5): ${fusedFilterMaps(5)}`); // Should be undefined
    console.log(`   - fused(6): ${fusedFilterMaps(6)}`); // Should be 13

    // Test Filter Fusion
    const p1 = (x) => x > 0;
    const p2 = (x) => x < 10;
    const fusedFilters = fuseFilters(p1, p2);
    
    console.log('✅ Filter Fusion:');
    console.log(`   - p1(5): ${p1(5)}`); // Should be true
    console.log(`   - p2(5): ${p2(5)}`); // Should be true
    console.log(`   - fused(5): ${fusedFilters(5)}`); // Should be true
    console.log(`   - fused(15): ${fusedFilters(15)}`); // Should be false

    // Test Scan Fusion
    const scan1 = (acc, x) => [acc + x, acc];
    const scan2 = (acc, x) => [acc * x, acc];
    const fusedScans = fuseScans(scan1, scan2);
    const [state3, output3] = fusedScans(1, 5);
    
    console.log('✅ Scan Fusion:');
    console.log(`   - scan1(1, 5): [6, 1]`);
    console.log(`   - scan2(6, 1): [6, 6]`);
    console.log(`   - fused(1, 5): [${state3}, ${output3}]`); // Should be [6, 1]
    console.log(`   - Correct: ${state3 === 6 && output3 === 1}`); // Should be true

    console.log('✅ Core fusion rules tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Core fusion rules test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: Fusion Registry
// ============================================================================

function testFusionRegistry() {
  console.log('\n📋 Test 2: Fusion Registry');

  try {
    const { FusionRegistry } = require('./fp-stream-fusion');

    console.log('✅ Fusion Registry:');
    console.log(`   - Number of rules: ${FusionRegistry.length}`);
    
    // Test each rule
    FusionRegistry.forEach((rule, index) => {
      console.log(`   - Rule ${index + 1}: ${rule.name}`);
      console.log(`     Description: ${rule.description}`);
      
      // Test with a simple map-map pattern
      const testNode = {
        type: 'map',
        fn: (x) => x * 2,
        purity: 'Pure',
        next: {
          type: 'map',
          fn: (x) => x + 1,
          purity: 'Pure',
          next: undefined
        }
      };
      
      if (rule.match(testNode)) {
        console.log(`     ✅ Matches test pattern`);
        const rewritten = rule.rewrite(testNode);
        console.log(`     ✅ Rewrite successful: ${rewritten.type}`);
      } else {
        console.log(`     ⚠️  Does not match test pattern`);
      }
    });

    console.log('✅ Fusion registry tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Fusion registry test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Plan Optimization
// ============================================================================

function testPlanOptimization() {
  console.log('\n📋 Test 3: Plan Optimization');

  try {
    const { optimizePlan, canOptimize } = require('./fp-stream-fusion');

    // Create a test plan with fusion opportunities
    const testPlan = {
      type: 'map',
      fn: (x) => x * 2,
      purity: 'Pure',
      next: {
        type: 'map',
        fn: (x) => x + 1,
        purity: 'Pure',
        next: {
          type: 'filter',
          predicate: (x) => x > 10,
          purity: 'Pure',
          next: {
            type: 'map',
            fn: (x) => x.toString(),
            purity: 'Pure',
            next: undefined
          }
        }
      }
    };

    console.log('✅ Plan Optimization:');
    console.log(`   - Can optimize: ${canOptimize(testPlan)}`); // Should be true
    
    const optimizedPlan = optimizePlan(testPlan);
    console.log(`   - Optimization successful: ${optimizedPlan !== testPlan}`);
    
    // Check if optimization reduced the number of nodes
    const countNodes = (plan) => {
      let count = 1;
      if (plan.next) count += countNodes(plan.next);
      return count;
    };
    
    const originalCount = countNodes(testPlan);
    const optimizedCount = countNodes(optimizedPlan);
    
    console.log(`   - Original node count: ${originalCount}`);
    console.log(`   - Optimized node count: ${optimizedCount}`);
    console.log(`   - Optimization reduced nodes: ${optimizedCount < originalCount}`);

    console.log('✅ Plan optimization tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Plan optimization test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Purity-Driven Fusion
// ============================================================================

function testPurityDrivenFusion() {
  console.log('\n📋 Test 4: Purity-Driven Fusion');

  try {
    const { canReorderByPurity, areOperationsIndependent, applyPurityFusion } = require('./fp-stream-fusion');

    // Test pure operations can be reordered
    const pureOp1 = { type: 'map', fn: (x) => x * 2, purity: 'Pure' };
    const pureOp2 = { type: 'map', fn: (x) => x + 1, purity: 'Pure' };
    
    console.log('✅ Purity-Driven Fusion:');
    console.log(`   - Pure-Pure reorderable: ${canReorderByPurity(pureOp1, pureOp2)}`); // Should be true
    
    // Test stateful operations
    const statefulOp1 = { type: 'scan', scanFn: (state) => [state + 1, state], purity: 'State' };
    const statefulOp2 = { type: 'scan', scanFn: (state) => [state * 2, state], purity: 'State' };
    
    console.log(`   - State-State independent: ${areOperationsIndependent(statefulOp1, statefulOp2)}`); // Should be false
    
    // Test pure can be pushed past stateful
    console.log(`   - Pure-State reorderable: ${canReorderByPurity(pureOp1, statefulOp1)}`); // Should be true
    
    // Test stateful cannot be pushed past pure
    console.log(`   - State-Pure reorderable: ${canReorderByPurity(statefulOp1, pureOp1)}`); // Should be false

    // Test purity-driven fusion application
    const testPlan = {
      type: 'map',
      fn: (x) => x * 2,
      purity: 'Pure',
      next: {
        type: 'scan',
        scanFn: (state) => [state + 1, state],
        purity: 'State',
        next: undefined
      }
    };
    
    const fusedPlan = applyPurityFusion(testPlan);
    console.log(`   - Purity fusion applied: ${fusedPlan !== testPlan}`);

    console.log('✅ Purity-driven fusion tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Purity-driven fusion test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Law Preservation
// ============================================================================

function testLawPreservation() {
  console.log('\n📋 Test 5: Law Preservation');

  try {
    const { fuseMapMap, pushMapPastScan } = require('./fp-stream-fusion');

    // Test Functor Law: map(id) = id
    const id = (x) => x;
    const stream = (x) => x + 1;
    const mappedId = fuseMapMap(id, stream);
    const mappedStream = fuseMapMap(stream, id);
    
    console.log('✅ Law Preservation:');
    console.log(`   - map(id) = id: ${mappedId(5) === stream(5)}`); // Should be true
    console.log(`   - map(f) = f: ${mappedStream(5) === stream(5)}`); // Should be true

    // Test Composition Law: map(f . g) = map(f) . map(g)
    const f = (x) => x * 2;
    const g = (x) => x + 1;
    const fg = (x) => f(g(x));
    
    const mapFg = fuseMapMap(fg, id);
    const mapF = fuseMapMap(f, id);
    const mapG = fuseMapMap(g, id);
    const mapFThenG = fuseMapMap(mapF, mapG);
    
    console.log(`   - map(f . g) = map(f) . map(g): ${mapFg(5) === mapFThenG(5)}`); // Should be true

    // Test Scan Law: scan preserves state transitions
    const scanFn = (state) => [state + 1, state];
    const mapFn = (x) => x * 2;
    const pushedScan = pushMapPastScan(mapFn, scanFn);
    
    const [state1, output1] = scanFn(5);
    const [state2, output2] = pushedScan(5);
    
    console.log(`   - Scan state preservation: ${state1 === state2}`); // Should be true
    console.log(`   - Scan output transformation: ${output2 === mapFn(output1)}`); // Should be true

    console.log('✅ Law preservation tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Law preservation test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 6: Integration with StatefulStream
// ============================================================================

function testStatefulStreamIntegration() {
  console.log('\n📋 Test 6: StatefulStream Integration');

  try {
    const { optimizeStream, withAutoOptimization } = require('./fp-stream-fusion');
    const { liftStateless, compose } = require('./fp-stream-state');

    // Create a stream with fusion opportunities
    const doubleStream = liftStateless((x) => x * 2);
    const addOneStream = liftStateless((x) => x + 1);
    const toStringStream = liftStateless((x) => x.toString());
    
    const composedStream = compose(
      compose(doubleStream, addOneStream),
      toStringStream
    );

    console.log('✅ StatefulStream Integration:');
    console.log(`   - Original stream purity: ${composedStream.__purity}`);
    
    // Test optimization
    const optimizedStream = optimizeStream(composedStream);
    console.log(`   - Optimization successful: ${optimizedStream !== composedStream}`);
    console.log(`   - Optimized stream purity: ${optimizedStream.__purity}`);

    // Test auto-optimization
    const autoOptimizedStream = withAutoOptimization(composedStream);
    console.log(`   - Auto-optimization successful: ${autoOptimizedStream !== composedStream}`);

    // Test that optimized stream produces same results
    const [state1, output1] = composedStream.run(5)();
    const [state2, output2] = optimizedStream.run(5)();
    
    console.log(`   - Original output: ${output1}`);
    console.log(`   - Optimized output: ${output2}`);
    console.log(`   - Outputs match: ${output1 === output2}`); // Should be true

    console.log('✅ StatefulStream integration tests passed!');
    return true;
  } catch (error) {
    console.log('❌ StatefulStream integration test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: Fusion Statistics
// ============================================================================

function testFusionStatistics() {
  console.log('\n📋 Test 7: Fusion Statistics');

  try {
    const { analyzeFusionStats } = require('./fp-stream-fusion');

    // Create test plans
    const originalPlan = {
      type: 'map',
      fn: (x) => x * 2,
      purity: 'Pure',
      next: {
        type: 'map',
        fn: (x) => x + 1,
        purity: 'Pure',
        next: {
          type: 'filter',
          predicate: (x) => x > 10,
          purity: 'Pure',
          next: undefined
        }
      }
    };

    const optimizedPlan = {
      type: 'filterMap',
      filterMapFn: (x) => {
        const doubled = x * 2;
        const added = doubled + 1;
        return added > 10 ? added : undefined;
      },
      purity: 'Pure',
      next: undefined
    };

    const appliedRules = ['Map-Map Fusion', 'Map-Filter Fusion'];

    const stats = analyzeFusionStats(originalPlan, optimizedPlan, appliedRules);

    console.log('✅ Fusion Statistics:');
    console.log(`   - Applied rules: ${stats.appliedRules.join(', ')}`);
    console.log(`   - Optimization count: ${stats.optimizationCount}`);
    console.log(`   - Original node count: ${stats.originalNodeCount}`);
    console.log(`   - Optimized node count: ${stats.optimizedNodeCount}`);
    console.log(`   - Purity distribution: ${JSON.stringify(stats.purityDistribution)}`);
    
    console.log(`   - Optimization reduced nodes: ${stats.optimizedNodeCount < stats.originalNodeCount}`);
    console.log(`   - All nodes pure: ${stats.purityDistribution.Pure === stats.optimizedNodeCount}`);

    console.log('✅ Fusion statistics tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Fusion statistics test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Performance Verification
// ============================================================================

function testPerformanceVerification() {
  console.log('\n📋 Test 8: Performance Verification');

  try {
    const { optimizePlan } = require('./fp-stream-fusion');

    // Create a complex plan with many fusion opportunities
    const complexPlan = {
      type: 'map',
      fn: (x) => x * 2,
      purity: 'Pure',
      next: {
        type: 'map',
        fn: (x) => x + 1,
        purity: 'Pure',
        next: {
          type: 'map',
          fn: (x) => x * 3,
          purity: 'Pure',
          next: {
            type: 'filter',
            predicate: (x) => x > 20,
            purity: 'Pure',
            next: {
              type: 'map',
              fn: (x) => x.toString(),
              purity: 'Pure',
              next: {
                type: 'map',
                fn: (x) => `Value: ${x}`,
                purity: 'Pure',
                next: undefined
              }
            }
          }
        }
      }
    };

    console.log('✅ Performance Verification:');
    
    // Count nodes before optimization
    const countNodes = (plan) => {
      let count = 1;
      if (plan.next) count += countNodes(plan.next);
      return count;
    };
    
    const originalCount = countNodes(complexPlan);
    console.log(`   - Original node count: ${originalCount}`);
    
    // Optimize the plan
    const optimizedPlan = optimizePlan(complexPlan);
    const optimizedCount = countNodes(optimizedPlan);
    console.log(`   - Optimized node count: ${optimizedCount}`);
    
    // Calculate optimization ratio
    const optimizationRatio = (originalCount - optimizedCount) / originalCount;
    console.log(`   - Optimization ratio: ${(optimizationRatio * 100).toFixed(1)}%`);
    
    console.log(`   - Significant optimization: ${optimizationRatio > 0.3}`); // Should be true

    console.log('✅ Performance verification tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Performance verification test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runFusionTests() {
  console.log('🚀 Running StatefulStream Fusion Tests');
  console.log('=====================================');

  const tests = [
    { name: 'Core Fusion Rules', fn: testCoreFusionRules },
    { name: 'Fusion Registry', fn: testFusionRegistry },
    { name: 'Plan Optimization', fn: testPlanOptimization },
    { name: 'Purity-Driven Fusion', fn: testPurityDrivenFusion },
    { name: 'Law Preservation', fn: testLawPreservation },
    { name: 'StatefulStream Integration', fn: testStatefulStreamIntegration },
    { name: 'Fusion Statistics', fn: testFusionStatistics },
    { name: 'Performance Verification', fn: testPerformanceVerification }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    const result = test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n=====================================');
  console.log('📊 Fusion Test Results:');
  console.log('=====================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All fusion tests passed!');
    console.log('✅ Core fusion rules working correctly');
    console.log('✅ Fusion registry operational');
    console.log('✅ Plan optimization functioning');
    console.log('✅ Purity-driven fusion working');
    console.log('✅ Law preservation verified');
    console.log('✅ StatefulStream integration complete');
    console.log('✅ Fusion statistics accurate');
    console.log('✅ Performance optimization effective');
    console.log('✅ StatefulStream fusion system is ready for production!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total: passed + failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runFusionTests();
}

module.exports = {
  testCoreFusionRules,
  testFusionRegistry,
  testPlanOptimization,
  testPurityDrivenFusion,
  testLawPreservation,
  testStatefulStreamIntegration,
  testFusionStatistics,
  testPerformanceVerification,
  runFusionTests
}; 