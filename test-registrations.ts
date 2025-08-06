/**
 * FP Registry Tests
 * 
 * This module tests that all FP components are properly registered across
 * all registry systems: HKT, Purity, Typeclass, and Derivable Instances.
 */

import {
  // HKT types
  ObservableLiteK, TaskEitherK, Kind1, Kind2, Apply
} from './fp-hkt';

import {
  // Purity types
  EffectOf, IsPure, IsImpure
} from './fp-purity';

import {
  // Typeclass instances
  ObservableLiteFunctor, ObservableLiteMonad,
  TaskEitherBifunctorMonad
} from './fp-typeclasses';

import {
  // ObservableLite
  ObservableLite
} from './fp-observable-lite';

import {
  // TaskEither
  TaskEither, TaskEitherLeft, TaskEitherRight
} from './fp-bimonad-extended';

import {
  // Registry functions
  getFPRegistry, getTypeclassInstance, getPurityEffect, getDerivableInstances
} from './fp-registry-init';

// ============================================================================
// Test 1: HKT Registry Tests
// ============================================================================

/**
 * Test that ObservableLiteK is properly registered in HKT system
 */
function testObservableLiteKHKT() {
  // Test that ObservableLiteK extends Kind1
  type TestObservableLiteK = ObservableLiteK extends { readonly type: any } ? true : false;
  const _test1: TestObservableLiteK = true;
  
  // Test that it can be applied to type arguments
  type TestApply = Apply<ObservableLiteK, [number]>;
  const _test2: TestApply = {} as ObservableLite<number>;
  
  console.log('✅ ObservableLiteK HKT registration: PASSED');
}

/**
 * Test that TaskEitherK is properly registered in HKT system
 */
function testTaskEitherKHKT() {
  // Test that TaskEitherK extends Kind2
  type TestTaskEitherK = TaskEitherK extends { readonly type: any } ? true : false;
  const _test1: TestTaskEitherK = true;
  
  // Test that it can be applied to type arguments
  type TestApply = Apply<TaskEitherK, [string, number]>;
  const _test2: TestApply = {} as TaskEither<string, number>;
  
  console.log('✅ TaskEitherK HKT registration: PASSED');
}

// ============================================================================
// Test 2: Purity Registry Tests
// ============================================================================

/**
 * Test that ObservableLite has correct purity effect
 */
function testObservableLitePurity() {
  // Test that ObservableLite has Async effect
  type Effect = EffectOf<ObservableLiteK>;
  const _test1: Effect = 'Async';
  
  // Test that it's not pure
  type IsPureTest = IsPure<ObservableLiteK>;
  const _test2: IsPureTest = false;
  
  // Test that it's impure
  type IsImpureTest = IsImpure<ObservableLiteK>;
  const _test3: IsImpureTest = true;
  
  console.log('✅ ObservableLite purity registration: PASSED');
}

/**
 * Test that TaskEither has correct purity effect
 */
function testTaskEitherPurity() {
  // Test that TaskEither has Async effect
  type Effect = EffectOf<TaskEitherK>;
  const _test1: Effect = 'Async';
  
  // Test that it's not pure
  type IsPureTest = IsPure<TaskEitherK>;
  const _test2: IsPureTest = false;
  
  // Test that it's impure
  type IsImpureTest = IsImpure<TaskEitherK>;
  const _test3: IsImpureTest = true;
  
  console.log('✅ TaskEither purity registration: PASSED');
}

// ============================================================================
// Test 3: Typeclass Registry Tests
// ============================================================================

/**
 * Test that ObservableLite typeclass instances are properly registered
 */
function testObservableLiteTypeclasses() {
  // Test Functor instance
  const functorInstance = getTypeclassInstance('ObservableLite', 'Functor');
  if (!functorInstance) {
    throw new Error('ObservableLite Functor instance not found in registry');
  }
  
  // Test Monad instance
  const monadInstance = getTypeclassInstance('ObservableLite', 'Monad');
  if (!monadInstance) {
    throw new Error('ObservableLite Monad instance not found in registry');
  }
  
  // Test that instances have required methods
  if (typeof functorInstance.map !== 'function') {
    throw new Error('ObservableLite Functor instance missing map method');
  }
  
  if (typeof monadInstance.chain !== 'function') {
    throw new Error('ObservableLite Monad instance missing chain method');
  }
  
  console.log('✅ ObservableLite typeclass registration: PASSED');
}

/**
 * Test that TaskEither typeclass instances are properly registered
 */
function testTaskEitherTypeclasses() {
  // Test Bifunctor instance
  const bifunctorInstance = getTypeclassInstance('TaskEither', 'Bifunctor');
  if (!bifunctorInstance) {
    throw new Error('TaskEither Bifunctor instance not found in registry');
  }
  
  // Test Monad instance
  const monadInstance = getTypeclassInstance('TaskEither', 'Monad');
  if (!monadInstance) {
    throw new Error('TaskEither Monad instance not found in registry');
  }
  
  // Test that instances have required methods
  if (typeof bifunctorInstance.bimap !== 'function') {
    throw new Error('TaskEither Bifunctor instance missing bimap method');
  }
  
  if (typeof monadInstance.chain !== 'function') {
    throw new Error('TaskEither Monad instance missing chain method');
  }
  
  console.log('✅ TaskEither typeclass registration: PASSED');
}

// ============================================================================
// Test 4: Runtime Registry Tests
// ============================================================================

/**
 * Test that ObservableLite works correctly at runtime
 */
function testObservableLiteRuntime() {
  // Test that ObservableLite can be created and used
  const obs = ObservableLite.of(42);
  const mapped = obs.map(x => x * 2);
  
  let result: number | undefined;
  mapped.subscribe({
    next: (value) => { result = value; },
    complete: () => {}
  });
  
  if (result !== 84) {
    throw new Error(`ObservableLite runtime test failed: expected 84, got ${result}`);
  }
  
  console.log('✅ ObservableLite runtime test: PASSED');
}

/**
 * Test that TaskEither works correctly at runtime
 */
async function testTaskEitherRuntime() {
  // Test that TaskEither can be created and used
  const taskEither = TaskEitherRight(42);
  const result = await taskEither();
  
  if (result.tag !== 'Right' || result.value !== 42) {
    throw new Error(`TaskEither runtime test failed: expected Right(42), got ${JSON.stringify(result)}`);
  }
  
  console.log('✅ TaskEither runtime test: PASSED');
}

// ============================================================================
// Test 5: Registry Integration Tests
// ============================================================================

/**
 * Test that the global registry is properly initialized
 */
function testRegistryIntegration() {
  const registry = getFPRegistry();
  if (!registry) {
    throw new Error('Global FP registry not found');
  }
  
  // Test ObservableLite registry entries
  const observableLitePurity = getPurityEffect('ObservableLite');
  if (observableLitePurity !== 'Async') {
    throw new Error(`ObservableLite purity mismatch: expected 'Async', got '${observableLitePurity}'`);
  }
  
  const observableLiteInstances = getDerivableInstances('ObservableLite');
  if (!observableLiteInstances || !observableLiteInstances.functor) {
    throw new Error('ObservableLite derivable instances not found');
  }
  
  // Test TaskEither registry entries
  const taskEitherPurity = getPurityEffect('TaskEither');
  if (taskEitherPurity !== 'Async') {
    throw new Error(`TaskEither purity mismatch: expected 'Async', got '${taskEitherPurity}'`);
  }
  
  const taskEitherInstances = getDerivableInstances('TaskEither');
  if (!taskEitherInstances || !taskEitherInstances.bifunctor) {
    throw new Error('TaskEither derivable instances not found');
  }
  
  console.log('✅ Registry integration test: PASSED');
}

// ============================================================================
// Test 6: Compile-Time Verification
// ============================================================================

/**
 * Compile-time verification that types are correctly defined
 */
function testCompileTimeVerification() {
  // Verify HKT types
  type ObservableLiteIsKind1 = ObservableLiteK extends Kind1 ? true : false;
  const _test1: ObservableLiteIsKind1 = true;
  
  type TaskEitherIsKind2 = TaskEitherK extends Kind2 ? true : false;
  const _test2: TaskEitherIsKind2 = true;
  
  // Verify purity effects
  type ObservableLiteEffect = EffectOf<ObservableLiteK>;
  const _test3: ObservableLiteEffect = 'Async';
  
  type TaskEitherEffect = EffectOf<TaskEitherK>;
  const _test4: TaskEitherEffect = 'Async';
  
  console.log('✅ Compile-time verification: PASSED');
}

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Run all registry tests
 */
export function runAllRegistryTests() {
  console.log('🧪 Running FP Registry Tests...\n');
  
  try {
    // HKT Tests
    testObservableLiteKHKT();
    testTaskEitherKHKT();
    
    // Purity Tests
    testObservableLitePurity();
    testTaskEitherPurity();
    
    // Typeclass Tests
    testObservableLiteTypeclasses();
    testTaskEitherTypeclasses();
    
    // Runtime Tests
    testObservableLiteRuntime();
    testTaskEitherRuntime();
    
    // Integration Tests
    testRegistryIntegration();
    
    // Compile-time Tests
    testCompileTimeVerification();
    
    console.log('\n🎉 All FP Registry Tests PASSED!');
    return true;
  } catch (error) {
    console.error('\n❌ FP Registry Tests FAILED:', error);
    return false;
  }
}

// Auto-run tests if this module is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllRegistryTests();
} 