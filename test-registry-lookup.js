/**
 * Registry Lookup Test
 * 
 * This test verifies that ObservableLite and TaskEither are properly registered
 * in the derivable instances registry.
 */

// Import the registry lookup function
const { getPurityAwareDerivableInstance } = require('./fp-purity');

console.log('🔍 Testing Registry Lookups...\n');

// Test ObservableLite registration
console.log('Testing ObservableLite registration:');
try {
  const observableLiteInstance = getPurityAwareDerivableInstance('ObservableLite');
  if (observableLiteInstance) {
    console.log('✅ ObservableLite found in registry');
    console.log('   Instance type:', typeof observableLiteInstance);
    console.log('   Available methods:', Object.keys(observableLiteInstance));
  } else {
    console.log('❌ ObservableLite not found in registry');
  }
} catch (error) {
  console.log('❌ Error looking up ObservableLite:', error.message);
}

console.log();

// Test TaskEither registration
console.log('Testing TaskEither registration:');
try {
  const taskEitherInstance = getPurityAwareDerivableInstance('TaskEither');
  if (taskEitherInstance) {
    console.log('✅ TaskEither found in registry');
    console.log('   Instance type:', typeof taskEitherInstance);
    console.log('   Available methods:', Object.keys(taskEitherInstance));
  } else {
    console.log('❌ TaskEither not found in registry');
  }
} catch (error) {
  console.log('❌ Error looking up TaskEither:', error.message);
}

console.log();

// Test some other known instances for comparison
console.log('Testing other known instances for comparison:');
const knownInstances = ['Array', 'Maybe', 'Either', 'IO'];

knownInstances.forEach(instanceName => {
  try {
    const instance = getPurityAwareDerivableInstance(instanceName);
    if (instance) {
      console.log(`✅ ${instanceName} found in registry`);
    } else {
      console.log(`❌ ${instanceName} not found in registry`);
    }
  } catch (error) {
    console.log(`❌ Error looking up ${instanceName}:`, error.message);
  }
});

console.log('\n🎯 Registry lookup test completed!'); 