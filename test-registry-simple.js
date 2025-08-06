/**
 * Simple Registry Test
 * 
 * This file tests that the FP registry is properly initialized and accessible.
 */

// Mock the registry functions for testing
function mockRegistryTest() {
  console.log('🧪 Testing FP Registry...\n');
  
  // Test 1: Check if global registry exists
  const registry = globalThis.__FP_REGISTRY;
  if (!registry) {
    console.log('❌ Global FP registry not found');
    console.log('💡 Make sure to import fp-registry-init.ts to initialize the registry');
    return false;
  }
  
  console.log('✅ Global FP registry found');
  
  // Test 2: Check ObservableLite registrations
  const observableLitePurity = registry.getPurity('ObservableLite');
  if (observableLitePurity !== 'Async') {
    console.log(`❌ ObservableLite purity mismatch: expected 'Async', got '${observableLitePurity}'`);
    return false;
  }
  console.log('✅ ObservableLite purity: Async');
  
  const observableLiteFunctor = registry.getTypeclass('ObservableLite', 'Functor');
  if (!observableLiteFunctor) {
    console.log('❌ ObservableLite Functor instance not found');
    return false;
  }
  console.log('✅ ObservableLite Functor instance found');
  
  const observableLiteMonad = registry.getTypeclass('ObservableLite', 'Monad');
  if (!observableLiteMonad) {
    console.log('❌ ObservableLite Monad instance not found');
    return false;
  }
  console.log('✅ ObservableLite Monad instance found');
  
  // Test 3: Check TaskEither registrations
  const taskEitherPurity = registry.getPurity('TaskEither');
  if (taskEitherPurity !== 'Async') {
    console.log(`❌ TaskEither purity mismatch: expected 'Async', got '${taskEitherPurity}'`);
    return false;
  }
  console.log('✅ TaskEither purity: Async');
  
  const taskEitherBifunctor = registry.getTypeclass('TaskEither', 'Bifunctor');
  if (!taskEitherBifunctor) {
    console.log('❌ TaskEither Bifunctor instance not found');
    return false;
  }
  console.log('✅ TaskEither Bifunctor instance found');
  
  const taskEitherMonad = registry.getTypeclass('TaskEither', 'Monad');
  if (!taskEitherMonad) {
    console.log('❌ TaskEither Monad instance not found');
    return false;
  }
  console.log('✅ TaskEither Monad instance found');
  
  // Test 4: Check derivable instances
  const observableLiteDerivable = registry.getDerivable('ObservableLite');
  if (!observableLiteDerivable) {
    console.log('❌ ObservableLite derivable instances not found');
    return false;
  }
  console.log('✅ ObservableLite derivable instances found');
  
  const taskEitherDerivable = registry.getDerivable('TaskEither');
  if (!taskEitherDerivable) {
    console.log('❌ TaskEither derivable instances not found');
    return false;
  }
  console.log('✅ TaskEither derivable instances found');
  
  console.log('\n🎉 All registry tests passed!');
  return true;
}

// Run the test
const success = mockRegistryTest();
if (!success) {
  process.exit(1);
} 