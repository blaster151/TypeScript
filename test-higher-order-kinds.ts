/**
 * Higher-Order Kinds (HOKs) Tests
 * 
 * This tests the Higher-Order Kinds system including:
 * - KindAny abstraction
 * - HigherKind type
 * - Typeclass parameterization
 * - HKT inference helpers
 * - Example usage with polymorphic typeclasses
 */

import {
  Kind, Kind1, Kind2, KindAny, HigherKind, HOK1, HOK2,
  KindInput, KindOutput, IsKindCompatible, IsHigherKindCompatible,
  Apply, TypeArgs, Type, ComposeHOK, IdentityHOK, ConstHOK
} from './fp-hkt';

import {
  Functor, Functor1, Functor2, AnyFunctor,
  Applicative, Monad, Bifunctor, Profunctor,
  IsFunctor, IsApplicative, IsMonad, IsBifunctor,
  ArrayHOK, MaybeHOK, EitherHOK, TupleHOK,
  PolymorphicFunctor, PolymorphicBifunctor
} from './fp-typeclasses-hok';

// ============================================================================
// Test Utilities
// ============================================================================

function assertType<T extends true>(value: T): void {
  // This function ensures that the type-level assertion is true
  if (!value) {
    throw new Error('Type assertion failed');
  }
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('🧪 Testing Higher-Order Kinds (HOKs) System...\n');

const testHigherOrderKinds = () => {
  // Test 1: KindAny abstraction
  console.log('📋 Test 1: KindAny abstraction');
  
  // KindAny should be assignable to Kind
  type TestKindAny = KindAny extends Kind<readonly Type[]> ? true : false;
  assertType<TestKindAny>(true);
  console.log('✅ KindAny extends Kind correctly');

  // Test 2: HigherKind basic functionality
  console.log('\n📋 Test 2: HigherKind basic functionality');
  
  // Test that HigherKind can represent functions between kinds
  type TestHigherKind = HigherKind<Kind1, Kind1>;
  type TestHigherKindExists = TestHigherKind extends HigherKind<KindAny, KindAny> ? true : false;
  assertType<TestHigherKindExists>(true);
  console.log('✅ HigherKind can represent functions between kinds');

  // Test 3: KindInput and KindOutput extraction
  console.log('\n📋 Test 3: KindInput and KindOutput extraction');
  
  type TestInput = KindInput<HigherKind<Kind1, Kind2>>;
  type TestOutput = KindOutput<HigherKind<Kind1, Kind2>>;
  
  type TestInputCorrect = TestInput extends Kind1 ? true : false;
  type TestOutputCorrect = TestOutput extends Kind2 ? true : false;
  
  assertType<TestInputCorrect>(true);
  assertType<TestOutputCorrect>(true);
  console.log('✅ KindInput and KindOutput extract correctly');

  // Test 4: IsKindCompatible utility
  console.log('\n📋 Test 4: IsKindCompatible utility');
  
  type CompatibleKinds = IsKindCompatible<Kind1, Kind1>;
  type IncompatibleKinds = IsKindCompatible<Kind1, Kind2>;
  
  assertType<CompatibleKinds>(true);
  assertType<IncompatibleKinds>(false);
  console.log('✅ IsKindCompatible works correctly');

  // Test 5: IsHigherKindCompatible utility
  console.log('\n📋 Test 5: IsHigherKindCompatible utility');
  
  type CompatibleHOK = IsHigherKindCompatible<HigherKind<Kind1, Kind1>, Kind1>;
  type IncompatibleHOK = IsHigherKindCompatible<HigherKind<Kind1, Kind1>, Kind2>;
  
  assertType<CompatibleHOK>(true);
  assertType<IncompatibleHOK>(false);
  console.log('✅ IsHigherKindCompatible works correctly');

  // Test 6: ComposeHOK composition
  console.log('\n📋 Test 6: ComposeHOK composition');
  
  type F = HigherKind<Kind1, Kind1>;
  type G = HigherKind<Kind1, Kind1>;
  type Composed = ComposeHOK<F, G>;
  
  type ComposedInput = KindInput<Composed>;
  type ComposedOutput = KindOutput<Composed>;
  
  assertType<ComposedInput extends Kind1 ? true : false>(true);
  assertType<ComposedOutput extends Kind1 ? true : false>(true);
  console.log('✅ ComposeHOK composes correctly');

  // Test 7: IdentityHOK identity
  console.log('\n📋 Test 7: IdentityHOK identity');
  
  type Identity = IdentityHOK<Kind1>;
  type IdentityInput = KindInput<Identity>;
  type IdentityOutput = KindOutput<Identity>;
  
  assertType<IdentityInput extends Kind1 ? true : false>(true);
  assertType<IdentityOutput extends Kind1 ? true : false>(true);
  console.log('✅ IdentityHOK preserves identity');

  // Test 8: ConstHOK constant
  console.log('\n📋 Test 8: ConstHOK constant');
  
  type Const = ConstHOK<Kind1, Kind2>;
  type ConstInput = KindInput<Const>;
  type ConstOutput = KindOutput<Const>;
  
  assertType<ConstInput extends Kind1 ? true : false>(true);
  assertType<ConstOutput extends Kind2 ? true : false>(true);
  console.log('✅ ConstHOK maps to constant output');

  // Test 9: HOK1 and HOK2 shorthands
  console.log('\n📋 Test 9: HOK1 and HOK2 shorthands');
  
  type TestHOK1 = HOK1<Kind1, Kind1>;
  type TestHOK2 = HOK2<Kind2, Kind2>;
  
  type TestHOK1Correct = TestHOK1 extends HigherKind<Kind1, Kind1> ? true : false;
  type TestHOK2Correct = TestHOK2 extends HigherKind<Kind2, Kind2> ? true : false;
  
  assertType<TestHOK1Correct>(true);
  assertType<TestHOK2Correct>(true);
  console.log('✅ HOK1 and HOK2 shorthands work correctly');

  // Test 10: Enhanced Functor with Higher-Order Kinds
  console.log('\n📋 Test 10: Enhanced Functor with Higher-Order Kinds');
  
  // Test that Functor can work with Higher-Order Kinds
  type TestFunctor = Functor<HigherKind<Kind1, Kind1>>;
  type TestFunctorExists = TestFunctor extends object ? true : false;
  assertType<TestFunctorExists>(true);
  console.log('✅ Functor works with Higher-Order Kinds');

  // Test 11: Functor1 and Functor2 specializations
  console.log('\n📋 Test 11: Functor1 and Functor2 specializations');
  
  type TestFunctor1 = Functor1<HOK1<Kind1, Kind1>>;
  type TestFunctor2 = Functor2<HOK2<Kind2, Kind2>>;
  
  type TestFunctor1Correct = TestFunctor1 extends Functor<HOK1<Kind1, Kind1>> ? true : false;
  type TestFunctor2Correct = TestFunctor2 extends Functor<HOK2<Kind2, Kind2>> ? true : false;
  
  assertType<TestFunctor1Correct>(true);
  assertType<TestFunctor2Correct>(true);
  console.log('✅ Functor1 and Functor2 specializations work correctly');

  // Test 12: AnyFunctor polymorphic type
  console.log('\n📋 Test 12: AnyFunctor polymorphic type');
  
  type TestAnyFunctor = AnyFunctor;
  type TestAnyFunctorExists = TestAnyFunctor extends Functor<HigherKind<KindAny, KindAny>> ? true : false;
  assertType<TestAnyFunctorExists>(true);
  console.log('✅ AnyFunctor polymorphic type works correctly');

  // Test 13: Enhanced Applicative with Higher-Order Kinds
  console.log('\n📋 Test 13: Enhanced Applicative with Higher-Order Kinds');
  
  type TestApplicative = Applicative<HigherKind<Kind1, Kind1>>;
  type TestApplicativeExtendsFunctor = TestApplicative extends Functor<HigherKind<Kind1, Kind1>> ? true : false;
  assertType<TestApplicativeExtendsFunctor>(true);
  console.log('✅ Applicative extends Functor correctly');

  // Test 14: Enhanced Monad with Higher-Order Kinds
  console.log('\n📋 Test 14: Enhanced Monad with Higher-Order Kinds');
  
  type TestMonad = Monad<HigherKind<Kind1, Kind1>>;
  type TestMonadExtendsApplicative = TestMonad extends Applicative<HigherKind<Kind1, Kind1>> ? true : false;
  assertType<TestMonadExtendsApplicative>(true);
  console.log('✅ Monad extends Applicative correctly');

  // Test 15: Enhanced Bifunctor with Higher-Order Kinds
  console.log('\n📋 Test 15: Enhanced Bifunctor with Higher-Order Kinds');
  
  type TestBifunctor = Bifunctor<HigherKind<Kind2, Kind2>>;
  type TestBifunctorExists = TestBifunctor extends object ? true : false;
  assertType<TestBifunctorExists>(true);
  console.log('✅ Bifunctor works with Higher-Order Kinds');

  // Test 16: Enhanced Profunctor with Higher-Order Kinds
  console.log('\n📋 Test 16: Enhanced Profunctor with Higher-Order Kinds');
  
  type TestProfunctor = Profunctor<HigherKind<Kind2, Kind2>>;
  type TestProfunctorExists = TestProfunctor extends object ? true : false;
  assertType<TestProfunctorExists>(true);
  console.log('✅ Profunctor works with Higher-Order Kinds');

  // Test 17: Type-level utilities for Higher-Order Kinds
  console.log('\n📋 Test 17: Type-level utilities for Higher-Order Kinds');
  
  type TestIsFunctor = IsFunctor<HigherKind<Kind1, Kind1>>;
  type TestIsApplicative = IsApplicative<HigherKind<Kind1, Kind1>>;
  type TestIsMonad = IsMonad<HigherKind<Kind1, Kind1>>;
  type TestIsBifunctor = IsBifunctor<HigherKind<Kind2, Kind2>>;
  
  // These should be true for valid typeclass instances
  assertType<TestIsFunctor>(true);
  assertType<TestIsApplicative>(true);
  assertType<TestIsMonad>(true);
  assertType<TestIsBifunctor>(true);
  console.log('✅ Type-level utilities work correctly');

  // Test 18: Example Higher-Order Kind instances
  console.log('\n📋 Test 18: Example Higher-Order Kind instances');
  
  type TestArrayHOK = ArrayHOK;
  type TestMaybeHOK = MaybeHOK;
  type TestEitherHOK = EitherHOK;
  type TestTupleHOK = TupleHOK;
  
  type TestArrayHOKCorrect = TestArrayHOK extends HigherKind<Kind1, Kind1> ? true : false;
  type TestMaybeHOKCorrect = TestMaybeHOK extends HigherKind<Kind1, Kind1> ? true : false;
  type TestEitherHOKCorrect = TestEitherHOK extends HigherKind<Kind2, Kind2> ? true : false;
  type TestTupleHOKCorrect = TestTupleHOK extends HigherKind<Kind2, Kind2> ? true : false;
  
  assertType<TestArrayHOKCorrect>(true);
  assertType<TestMaybeHOKCorrect>(true);
  assertType<TestEitherHOKCorrect>(true);
  assertType<TestTupleHOKCorrect>(true);
  console.log('✅ Example Higher-Order Kind instances work correctly');

  // Test 19: Polymorphic typeclass instances
  console.log('\n📋 Test 19: Polymorphic typeclass instances');
  
  type TestPolymorphicFunctor = PolymorphicFunctor;
  type TestPolymorphicBifunctor = PolymorphicBifunctor;
  
  type TestPolymorphicFunctorCorrect = TestPolymorphicFunctor extends Functor<HigherKind<Kind1, Kind1>> ? true : false;
  type TestPolymorphicBifunctorCorrect = TestPolymorphicBifunctor extends Bifunctor<HigherKind<Kind2, Kind2>> ? true : false;
  
  assertType<TestPolymorphicFunctorCorrect>(true);
  assertType<TestPolymorphicBifunctorCorrect>(true);
  console.log('✅ Polymorphic typeclass instances work correctly');

  // Test 20: Kind-polymorphic Functor example
  console.log('\n📋 Test 20: Kind-polymorphic Functor example');
  
  // This demonstrates that AnyFunctor can accept unary and binary functors
  type UnaryFunctor = HigherKind<Kind1, Kind1>;
  type BinaryFunctor = HigherKind<Kind2, Kind2>;
  
  type TestUnaryWithAnyFunctor = UnaryFunctor extends HigherKind<KindAny, KindAny> ? true : false;
  type TestBinaryWithAnyFunctor = BinaryFunctor extends HigherKind<KindAny, KindAny> ? true : false;
  
  assertType<TestUnaryWithAnyFunctor>(true);
  assertType<TestBinaryWithAnyFunctor>(true);
  console.log('✅ Kind-polymorphic Functor can work with different arities');

  console.log('\n✅ All Higher-Order Kinds (HOKs) tests passed!');
};

// Run the tests
testHigherOrderKinds(); 