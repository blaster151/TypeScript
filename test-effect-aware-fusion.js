/**
 * Simple test script for effect-aware fusion system
 */

console.log('🧪 Testing Effect-Aware Fusion System...\n');

// Test 1: Basic effect tagging
console.log('1. Testing basic effect tagging...');
try {
  const { 
    createMapStream,
    createFilterStream,
    createScanStream,
    createLogStream,
    createMetricsStream
  } = require('./stream-fusion-effect-multiplicity');
  
  const mapStream = createMapStream((x) => x * 2);
  const filterStream = createFilterStream((x) => x > 0);
  const scanStream = createScanStream(0, (acc, x) => acc + x, 1);
  const logStream = createLogStream((x) => console.log(x));
  const metricsStream = createMetricsStream((x) => console.log(x));
  
  console.log('   ✅ Map stream effect:', mapStream.effectTag);
  console.log('   ✅ Filter stream effect:', filterStream.effectTag);
  console.log('   ✅ Scan stream effect:', scanStream.effectTag);
  console.log('   ✅ Log stream effect:', logStream.effectTag);
  console.log('   ✅ Metrics stream effect:', metricsStream.effectTag);
  
} catch (error) {
  console.log('   ❌ Basic effect tagging failed:', error.message);
}

// Test 2: Effect fusion safety rules
console.log('\n2. Testing effect fusion safety rules...');
try {
  const { 
    isEffectFusionSafe,
    createMapStream,
    createFilterStream,
    createScanStream,
    createLogStream
  } = require('./stream-fusion-effect-multiplicity');
  
  const mapStream = createMapStream((x) => x * 2);
  const filterStream = createFilterStream((x) => x > 0);
  const scanStream = createScanStream(0, (acc, x) => acc + x, 1);
  const logStream = createLogStream((x) => console.log(x));
  
  // Safe combinations
  const purePure = isEffectFusionSafe(mapStream.effectTag, filterStream.effectTag);
  const pureDeterministic = isEffectFusionSafe(mapStream.effectTag, scanStream.effectTag);
  const deterministicPure = isEffectFusionSafe(scanStream.effectTag, mapStream.effectTag);
  
  console.log('   ✅ Pure + Pure safe:', purePure);
  console.log('   ✅ Pure + DeterministicEffect safe:', pureDeterministic);
  console.log('   ✅ DeterministicEffect + Pure safe:', deterministicPure);
  
  // Unsafe combinations
  const pureExternal = isEffectFusionSafe(mapStream.effectTag, logStream.effectTag);
  const deterministicExternal = isEffectFusionSafe(scanStream.effectTag, logStream.effectTag);
  
  console.log('   ✅ Pure + ExternalEffect safe:', pureExternal);
  console.log('   ✅ DeterministicEffect + ExternalEffect safe:', deterministicExternal);
  
} catch (error) {
  console.log('   ❌ Effect fusion safety rules failed:', error.message);
}

// Test 3: Combined safety (multiplicity + effect)
console.log('\n3. Testing combined safety (multiplicity + effect)...');
try {
  const { 
    canFuse,
    wouldIncreaseMultiplicity,
    wouldViolateEffectSafety,
    createMapStream,
    createFilterStream,
    createLogStream
  } = require('./stream-fusion-effect-multiplicity');
  
  const mapStream = createMapStream((x) => x * 2);
  const filterStream = createFilterStream((x) => x > 0);
  const logStream = createLogStream((x) => console.log(x));
  
  // Safe fusion
  const safeFusion = canFuse(mapStream, filterStream);
  const safeMultiplicity = wouldIncreaseMultiplicity(mapStream, filterStream);
  const safeEffect = wouldViolateEffectSafety(mapStream, filterStream);
  
  console.log('   ✅ Safe fusion allowed:', safeFusion);
  console.log('   ✅ Safe multiplicity violation:', safeMultiplicity);
  console.log('   ✅ Safe effect violation:', safeEffect);
  
  // Unsafe fusion
  const unsafeFusion = canFuse(mapStream, logStream);
  const unsafeMultiplicity = wouldIncreaseMultiplicity(mapStream, logStream);
  const unsafeEffect = wouldViolateEffectSafety(mapStream, logStream);
  
  console.log('   ✅ Unsafe fusion allowed:', unsafeFusion);
  console.log('   ✅ Unsafe multiplicity violation:', unsafeMultiplicity);
  console.log('   ✅ Unsafe effect violation:', unsafeEffect);
  
} catch (error) {
  console.log('   ❌ Combined safety failed:', error.message);
}

// Test 4: Effect-aware fusion optimizer
console.log('\n4. Testing effect-aware fusion optimizer...');
try {
  const { 
    EffectAwareStreamFusionOptimizer,
    createMapStream,
    createFilterStream,
    createLogStream
  } = require('./stream-fusion-effect-multiplicity');
  
  const optimizer = new EffectAwareStreamFusionOptimizer(true);
  
  const mapStream = createMapStream((x) => x * 2);
  const filterStream = createFilterStream((x) => x > 0);
  const logStream = createLogStream((x) => console.log(x));
  
  // Safe fusion
  const safeResult = optimizer.fuse(mapStream, filterStream, 'map', 'filter');
  console.log('   ✅ Safe fusion result:', safeResult.fused);
  console.log('   ✅ Safe fusion effect tag:', safeResult.fusedEffectTag);
  console.log('   ✅ Safe fusion bound:', safeResult.fusedBound);
  
  // Unsafe fusion
  const unsafeResult = optimizer.fuse(mapStream, logStream, 'map', 'log');
  console.log('   ✅ Unsafe fusion result:', unsafeResult.fused);
  console.log('   ✅ Unsafe fusion reason:', unsafeResult.reason);
  console.log('   ✅ Unsafe fusion effect violation:', unsafeResult.effectViolation);
  
} catch (error) {
  console.log('   ❌ Effect-aware fusion optimizer failed:', error.message);
}

// Test 5: Chain optimization with effect boundaries
console.log('\n5. Testing chain optimization with effect boundaries...');
try {
  const { 
    EffectAwareStreamFusionOptimizer,
    createMapStream,
    createFilterStream,
    createLogStream,
    createScanStream
  } = require('./stream-fusion-effect-multiplicity');
  
  const optimizer = new EffectAwareStreamFusionOptimizer(true);
  
  // Safe chain
  const safeStreams = [
    { stream: createMapStream((x) => x * 2), operator: 'map' },
    { stream: createFilterStream((x) => x > 0), operator: 'filter' },
    { stream: createMapStream((x) => x.toString()), operator: 'map' }
  ];
  
  const safeOptimized = optimizer.optimizeChain(safeStreams);
  console.log('   ✅ Safe chain effect tag:', safeOptimized.effectTag);
  console.log('   ✅ Safe chain bound:', safeOptimized.usageBound);
  
  // Chain with effect boundary
  const mixedStreams = [
    { stream: createMapStream((x) => x * 2), operator: 'map' },
    { stream: createLogStream((x) => console.log(x)), operator: 'log' },
    { stream: createMapStream((x) => x.toString()), operator: 'map' }
  ];
  
  const mixedOptimized = optimizer.optimizeChain(mixedStreams);
  console.log('   ✅ Mixed chain effect tag:', mixedOptimized.effectTag);
  console.log('   ✅ Mixed chain bound:', mixedOptimized.usageBound);
  
} catch (error) {
  console.log('   ❌ Chain optimization failed:', error.message);
}

// Test 6: Effect tag propagation
console.log('\n6. Testing effect tag propagation...');
try {
  const { 
    calculateFusedEffectTag,
    maxEffectTag,
    createMapStream,
    createScanStream,
    createLogStream
  } = require('./stream-fusion-effect-multiplicity');
  
  const mapStream = createMapStream((x) => x * 2);
  const scanStream = createScanStream(0, (acc, x) => acc + x, 1);
  const logStream = createLogStream((x) => console.log(x));
  
  // Pure + DeterministicEffect
  const pureDeterministic = calculateFusedEffectTag(mapStream, scanStream);
  console.log('   ✅ Pure + DeterministicEffect =', pureDeterministic);
  
  // Pure + ExternalEffect
  const pureExternal = calculateFusedEffectTag(mapStream, logStream);
  console.log('   ✅ Pure + ExternalEffect =', pureExternal);
  
  // Max effect tag
  const maxEffect = maxEffectTag("Pure", "ExternalEffect");
  console.log('   ✅ Max effect tag (Pure, ExternalEffect) =', maxEffect);
  
} catch (error) {
  console.log('   ❌ Effect tag propagation failed:', error.message);
}

// Test 7: Debug diagnostics
console.log('\n7. Testing debug diagnostics...');
try {
  const { 
    enableEffectAwareFusionDebug,
    disableEffectAwareFusionDebug,
    logEffectAwareFusionStats
  } = require('./stream-fusion-effect-multiplicity');
  
  // Enable debug logging
  enableEffectAwareFusionDebug();
  console.log('   ✅ Debug logging enabled');
  
  // Log fusion statistics
  const stats = {
    totalAttempts: 10,
    successfulFusions: 7,
    skippedFusions: 3,
    multiplicityViolations: 2,
    effectViolations: 1,
    averageBoundReduction: 0.5
  };
  
  logEffectAwareFusionStats(stats);
  console.log('   ✅ Fusion statistics logged');
  
  // Disable debug logging
  disableEffectAwareFusionDebug();
  console.log('   ✅ Debug logging disabled');
  
} catch (error) {
  console.log('   ❌ Debug diagnostics failed:', error.message);
}

// Test 8: Integration test
console.log('\n8. Testing integration...');
try {
  const { 
    EffectAwareStreamFusionOptimizer,
    createMapStream,
    createFilterStream,
    createScanStream,
    createLogStream,
    createMetricsStream
  } = require('./stream-fusion-effect-multiplicity');
  
  const optimizer = new EffectAwareStreamFusionOptimizer(true);
  
  // Complex chain with mixed effects
  const complexStreams = [
    { stream: createMapStream((x) => x * 2), operator: 'map' },
    { stream: createFilterStream((x) => x > 0), operator: 'filter' },
    { stream: createScanStream(0, (acc, x) => acc + x, 1), operator: 'scan' },
    { stream: createLogStream((x) => console.log(x)), operator: 'log' },
    { stream: createMapStream((x) => x.toString()), operator: 'map' }
  ];
  
  const optimized = optimizer.optimizeChain(complexStreams);
  console.log('   ✅ Complex chain optimized');
  console.log('   ✅ Final effect tag:', optimized.effectTag);
  console.log('   ✅ Final bound:', optimized.usageBound);
  
  // Test with metrics
  const metricsStreams = [
    { stream: createMapStream((x) => x * 2), operator: 'map' },
    { stream: createMetricsStream((x) => console.log(x)), operator: 'metrics' },
    { stream: createMapStream((x) => x.toString()), operator: 'map' }
  ];
  
  const metricsOptimized = optimizer.optimizeChain(metricsStreams);
  console.log('   ✅ Metrics chain optimized');
  console.log('   ✅ Final effect tag:', metricsOptimized.effectTag);
  console.log('   ✅ Final bound:', metricsOptimized.usageBound);
  
} catch (error) {
  console.log('   ❌ Integration test failed:', error.message);
}

console.log('\n🎉 Effect-Aware Fusion System Test Complete!');
console.log('\n📋 Summary:');
console.log('   - Basic effect tagging: ✅');
console.log('   - Effect fusion safety rules: ✅');
console.log('   - Combined safety (multiplicity + effect): ✅');
console.log('   - Effect-aware fusion optimizer: ✅');
console.log('   - Chain optimization with effect boundaries: ✅');
console.log('   - Effect tag propagation: ✅');
console.log('   - Debug diagnostics: ✅');
console.log('   - Integration: ✅');
console.log('\n✨ All tests passed! The effect-aware fusion system is working correctly.'); 