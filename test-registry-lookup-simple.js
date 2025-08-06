/**
 * Simple Registry Lookup Test
 * 
 * This test verifies that ObservableLite and TaskEither are properly registered
 * in the derivable instances registry.
 */

console.log('🔍 Testing Registry Lookups...\n');

// Check if the global registry exists
if (typeof globalThis !== 'undefined' && globalThis.__purityRegistry) {
  console.log('✅ Global purity registry found');
  console.log('   Registry keys:', Object.keys(globalThis.__purityRegistry));
  
  // Test ObservableLite registration
  if (globalThis.__purityRegistry['ObservableLite']) {
    console.log('✅ ObservableLite found in registry');
    const instance = globalThis.__purityRegistry['ObservableLite'];
    console.log('   Instance type:', typeof instance);
    if (instance && typeof instance === 'object') {
      console.log('   Available properties:', Object.keys(instance));
    }
  } else {
    console.log('❌ ObservableLite not found in registry');
  }
  
  // Test TaskEither registration
  if (globalThis.__purityRegistry['TaskEither']) {
    console.log('✅ TaskEither found in registry');
    const instance = globalThis.__purityRegistry['TaskEither'];
    console.log('   Instance type:', typeof instance);
    if (instance && typeof instance === 'object') {
      console.log('   Available properties:', Object.keys(instance));
    }
  } else {
    console.log('❌ TaskEither not found in registry');
  }
  
  // Test some other known instances for comparison
  console.log('\nTesting other known instances:');
  const knownInstances = ['Array', 'Maybe', 'Either', 'IO'];
  
  knownInstances.forEach(instanceName => {
    if (globalThis.__purityRegistry[instanceName]) {
      console.log(`✅ ${instanceName} found in registry`);
    } else {
      console.log(`❌ ${instanceName} not found in registry`);
    }
  });
  
} else {
  console.log('❌ Global purity registry not found');
  console.log('   globalThis.__purityRegistry:', globalThis.__purityRegistry);
}

console.log('\n🎯 Registry lookup test completed!'); 