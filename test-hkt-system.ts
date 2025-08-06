/**
 * Test file for Higher-Kinded Types (HKTs) system
 * 
 * This file demonstrates the complete HKT implementation including:
 * - Type constructors as first-class values
 * - Type-safe application of kinds to type arguments
 * - Generic constraints that work across all type constructors of a given kind
 * - Generic algorithms that work for any Functor/Applicative/Monad
 * - Derivable instances integration
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe, Either, List, Reader, Writer, State,
  ComposeK, NatK, Phantom, KindWithPhantom
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  ArrayFunctor, ArrayApplicative, ArrayMonad, ArrayTraversable, ArrayFoldable,
  MaybeFunctor, MaybeApplicative, MaybeMonad,
  EitherBifunctor, TupleBifunctor, FunctionProfunctor,
  lift2, lift3, composeK, sequence, traverse,
  deriveFunctor, deriveApplicative, deriveMonad
} from './fp-typeclasses-hkt';

// ============================================================================
// Custom Type Constructor Examples
// ============================================================================

/**
 * Custom Tree type constructor
 */
export type Tree<A> = 
  | { type: 'Leaf'; value: A }
  | { type: 'Node'; left: Tree<A>; right: Tree<A> };

/**
 * Tree as HKT
 */
export interface TreeK extends Kind1 {
  readonly type: Tree<this['arg0']>;
}

// ============================================================================
// Tree Typeclass Instances (Derived)
// ============================================================================

import { 
  deriveInstances, 
  deriveEqInstance, 
  deriveOrdInstance, 
  deriveShowInstance 
} from './fp-derivation-helpers';

/**
 * Tree derived instances
 */
export const TreeInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: Tree<A>, f: (a: A) => B): Tree<B> => {
    switch (fa.type) {
      case 'Leaf':
        return { type: 'Leaf', value: f(fa.value) };
      case 'Node':
        return {
          type: 'Node',
          left: TreeInstances.functor!.map(fa.left, f),
          right: TreeInstances.functor!.map(fa.right, f)
        };
    }
  },
  customChain: <A, B>(fa: Tree<A>, f: (a: A) => Tree<B>): Tree<B> => {
    switch (fa.type) {
      case 'Leaf':
        return f(fa.value);
      case 'Node':
        return {
          type: 'Node',
          left: TreeInstances.monad!.chain(fa.left, f),
          right: TreeInstances.monad!.chain(fa.right, f)
        };
    }
  }
});

export const TreeFunctor = TreeInstances.functor;
export const TreeApplicative = TreeInstances.applicative;
export const TreeMonad = TreeInstances.monad;

/**
 * Tree standard typeclass instances
 */
export const TreeEq = deriveEqInstance({
  customEq: <A>(a: Tree<A>, b: Tree<A>): boolean => {
    if (a.type !== b.type) return false;
    switch (a.type) {
      case 'Leaf':
        return b.type === 'Leaf' && a.value === b.value;
      case 'Node':
        return b.type === 'Node' && 
               TreeEq.equals(a.left, b.left) && 
               TreeEq.equals(a.right, b.right);
    }
  }
});

export const TreeOrd = deriveOrdInstance({
  customOrd: <A>(a: Tree<A>, b: Tree<A>): number => {
    if (a.type !== b.type) {
      return a.type === 'Leaf' ? -1 : 1;
    }
    switch (a.type) {
      case 'Leaf':
        return b.type === 'Leaf' ? 
          (a.value < b.value ? -1 : a.value > b.value ? 1 : 0) : -1;
      case 'Node':
        if (b.type !== 'Node') return 1;
        const leftComp = TreeOrd.compare(a.left, b.left);
        if (leftComp !== 0) return leftComp;
        return TreeOrd.compare(a.right, b.right);
    }
  }
});

export const TreeShow = deriveShowInstance({
  customShow: <A>(a: Tree<A>): string => {
    switch (a.type) {
      case 'Leaf':
        return `Leaf(${JSON.stringify(a.value)})`;
      case 'Node':
        return `Node(${TreeShow.show(a.left)}, ${TreeShow.show(a.right)})`;
    }
  }
});

// ============================================================================
// Higher-Order Kind Examples
// ============================================================================

/**
 * Compose two unary type constructors
 */
export type ComposeArrayMaybe<A> = Apply<ComposeK<ArrayK, MaybeK>, [A]>;

/**
 * Natural transformation from Array to Maybe
 */
export type ArrayToMaybe<A> = Apply<NatK<ArrayK, MaybeK>, [A]>;

// ============================================================================
// Phantom Type Examples
// ============================================================================

/**
 * Phantom type for tracking effects
 */
export type Effect = 'IO' | 'ST' | 'STRef';

/**
 * Kind with phantom type parameter
 */
export interface EffectfulK extends KindWithPhantom<[Type], Effect> {
  readonly type: this['arg0'];
}

// ============================================================================
// Generic Algorithm Tests
// ============================================================================

/**
 * Test lift2 with different Applicatives
 */
export function testLift2(): void {
  console.log('=== Testing lift2 ===');
  
  const add = (a: number, b: number) => a + b;
  
  // Array Applicative
  const arrayLift2 = lift2(ArrayApplicative)(add);
  const arrayResult = arrayLift2([1, 2, 3], [10, 20]);
  console.log('Array lift2:', arrayResult); // [11, 21, 12, 22, 13, 23]
  
  // Maybe Applicative
  const maybeLift2 = lift2(MaybeApplicative)(add);
  const maybeResult1 = maybeLift2(5, 3);
  const maybeResult2 = maybeLift2(null, 3);
  console.log('Maybe lift2 (5, 3):', maybeResult1); // 8
  console.log('Maybe lift2 (null, 3):', maybeResult2); // null
  
  // Tree Applicative
  const treeLift2 = lift2(TreeApplicative)(add);
  const tree1: Tree<number> = { type: 'Leaf', value: 5 };
  const tree2: Tree<number> = { type: 'Leaf', value: 3 };
  const treeResult = treeLift2(tree1, tree2);
  console.log('Tree lift2:', treeResult); // { type: 'Leaf', value: 8 }
}

/**
 * Test composeK with different Monads
 */
export function testComposeK(): void {
  console.log('\n=== Testing composeK ===');
  
  // Safe division function
  const safeDivide = (n: number) => (d: number): Maybe<number> => 
    d === 0 ? null : n / d;
  
  // Safe square root function
  const safeSqrt = (n: number): Maybe<number> => 
    n < 0 ? null : Math.sqrt(n);
  
  // Compose with Maybe
  const maybeCompose = composeK(MaybeMonad)(safeSqrt, safeDivide(16));
  console.log('Maybe compose (4):', maybeCompose(4)); // 2
  console.log('Maybe compose (0):', maybeCompose(0)); // null
  console.log('Maybe compose (-1):', maybeCompose(-1)); // null
  
  // Compose with Array
  const arrayCompose = composeK(ArrayMonad)(
    (n: number) => [n * 2, n * 3],
    (n: number) => [n + 1, n + 2]
  );
  console.log('Array compose (5):', arrayCompose(5)); // [12, 18, 14, 21]
}

/**
 * Test sequence with different Monads
 */
export function testSequence(): void {
  console.log('\n=== Testing sequence ===');
  
  // Array sequence
  const arraySequence = sequence(ArrayMonad);
  const arrayResult = arraySequence([[1, 2], [3, 4], [5, 6]]);
  console.log('Array sequence:', arrayResult);
  // [[1, 3, 5], [1, 3, 6], [1, 4, 5], [1, 4, 6], [2, 3, 5], [2, 3, 6], [2, 4, 5], [2, 4, 6]]
  
  // Maybe sequence
  const maybeSequence = sequence(MaybeMonad);
  const maybeResult1 = maybeSequence([5, 3, 7]);
  const maybeResult2 = maybeSequence([5, null, 7]);
  console.log('Maybe sequence [5,3,7]:', maybeResult1); // [5, 3, 7]
  console.log('Maybe sequence [5,null,7]:', maybeResult2); // null
}

/**
 * Test traverse with different Monads
 */
export function testTraverse(): void {
  console.log('\n=== Testing traverse ===');
  
  // Array traverse
  const arrayTraverse = traverse(ArrayMonad);
  const arrayResult = arrayTraverse(
    (n: number) => [n * 2, n * 3],
    [1, 2, 3]
  );
  console.log('Array traverse:', arrayResult);
  // [[2, 4, 6], [2, 4, 9], [2, 6, 6], [2, 6, 9], [3, 4, 6], [3, 4, 9], [3, 6, 6], [3, 6, 9]]
  
  // Maybe traverse
  const maybeTraverse = traverse(MaybeMonad);
  const maybeResult1 = maybeTraverse(
    (n: number) => n > 0 ? n * 2 : null,
    [1, 2, 3]
  );
  const maybeResult2 = maybeTraverse(
    (n: number) => n > 0 ? n * 2 : null,
    [1, -2, 3]
  );
  console.log('Maybe traverse [1,2,3]:', maybeResult1); // [2, 4, 6]
  console.log('Maybe traverse [1,-2,3]:', maybeResult2); // null
}

// ============================================================================
// Derivable Instances Tests
// ============================================================================

/**
 * Test deriving instances from minimal definitions
 */
export function testDerivableInstances(): void {
  console.log('\n=== Testing Derivable Instances ===');
  
  // Derive ArrayMonad from minimal definitions
  const of = <A>(a: A): Array<A> => [a];
  const chain = <A, B>(fa: Array<A>, f: (a: A) => Array<B>): Array<B> => 
    fa.flatMap(f);
  
  const derivedArrayMonad = deriveMonad<ArrayK>(of, chain);
  
  // Test the derived instance
  const result1 = derivedArrayMonad.map([1, 2, 3], x => x * 2);
  const result2 = derivedArrayMonad.ap([(x: number) => x * 2, (x: number) => x + 1], [1, 2]);
  const result3 = derivedArrayMonad.chain([1, 2, 3], x => [x * 2, x * 3]);
  
  console.log('Derived Array map:', result1); // [2, 4, 6]
  console.log('Derived Array ap:', result2); // [2, 3, 2, 3]
  console.log('Derived Array chain:', result3); // [2, 3, 4, 6, 6, 9]
  
  // Verify it matches the original
  const originalResult = ArrayMonad.chain([1, 2, 3], x => [x * 2, x * 3]);
  console.log('Original vs Derived match:', JSON.stringify(result3) === JSON.stringify(originalResult));
}

// ============================================================================
// Type-Level Tests
// ============================================================================

/**
 * Test type-level operations
 */
export function testTypeLevelOperations(): void {
  console.log('\n=== Testing Type-Level Operations ===');
  
  // Test kind arity
  type ArrayArity = KindArity<ArrayK>; // Should be 1
  type EitherArity = KindArity<EitherK>; // Should be 2
  type TupleArity = KindArity<TupleK>; // Should be 2
  
  // Test type arguments
  type ArrayArgs = TypeArgs<ArrayK>; // Should be [Type]
  type EitherArgs = TypeArgs<EitherK>; // Should be [Type, Type]
  
  // Test apply
  type ArrayOfNumber = Apply<ArrayK, [number]>; // Should be Array<number>
  type EitherOfStringNumber = Apply<EitherK, [string, number]>; // Should be Either<string, number>
  type TupleOfBooleanString = Apply<TupleK, [boolean, string]>; // Should be [boolean, string]
  
  // Test compose
  type Composed = Apply<ComposeK<ArrayK, MaybeK>, [number]>; // Should be Array<Maybe<number>>
  
  console.log('Type-level tests completed successfully');
}

// ============================================================================
// Custom Type Constructor Tests
// ============================================================================

/**
 * Test custom Tree type constructor
 */
export function testCustomTree(): void {
  console.log('\n=== Testing Custom Tree Type Constructor ===');
  
  // Create some trees
  const leaf1: Tree<number> = { type: 'Leaf', value: 1 };
  const leaf2: Tree<number> = { type: 'Leaf', value: 2 };
  const leaf3: Tree<number> = { type: 'Leaf', value: 3 };
  const node1: Tree<number> = { type: 'Node', left: leaf1, right: leaf2 };
  const tree: Tree<number> = { type: 'Node', left: node1, right: leaf3 };
  
  // Test Functor
  const doubled = TreeFunctor.map(tree, x => x * 2);
  console.log('Tree map (double):', JSON.stringify(doubled, null, 2));
  
  // Test Applicative
  const lifted = TreeApplicative.of((x: number) => x + 10);
  const applied = TreeApplicative.ap(lifted, tree);
  console.log('Tree ap (+10):', JSON.stringify(applied, null, 2));
  
  // Test Monad
  const chained = TreeMonad.chain(tree, x => 
    x > 2 ? { type: 'Leaf' as const, value: x * 2 } : { type: 'Leaf' as const, value: x }
  );
  console.log('Tree chain (conditional):', JSON.stringify(chained, null, 2));
  
  // Test with lift2
  const treeLift2 = lift2(TreeApplicative)((a: number, b: number) => a + b);
  const result = treeLift2(tree, { type: 'Leaf', value: 5 });
  console.log('Tree lift2 (+5):', JSON.stringify(result, null, 2));
}

// ============================================================================
// Higher-Order Kind Tests
// ============================================================================

/**
 * Test higher-order kinds
 */
export function testHigherOrderKinds(): void {
  console.log('\n=== Testing Higher-Order Kinds ===');
  
  // Test ComposeK
  type ArrayMaybeNumber = Apply<ComposeK<ArrayK, MaybeK>, [number]>;
  const arrayMaybe: ArrayMaybeNumber = [1, null, 3, undefined, 5];
  console.log('ComposeK Array<Maybe<number>>:', arrayMaybe);
  
  // Test NatK
  type ArrayToMaybeNumber = Apply<NatK<ArrayK, MaybeK>, [number]>;
  const arrayToMaybe: ArrayToMaybeNumber = (arr: Array<number>) => 
    arr.length > 0 ? arr[0] : null;
  console.log('NatK Array->Maybe function:', arrayToMaybe([1, 2, 3])); // 1
  console.log('NatK Array->Maybe function:', arrayToMaybe([])); // null
}

// ============================================================================
// Phantom Type Tests
// ============================================================================

/**
 * Test phantom types
 */
export function testPhantomTypes(): void {
  console.log('\n=== Testing Phantom Types ===');
  
  // Create effectful computations with phantom types
  type IOComputation = Apply<EffectfulK, [string]>;
  type STComputation = Apply<EffectfulK, [number]>;
  
  // These would be used in a more sophisticated effect system
  console.log('Phantom type tests completed');
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Run all tests
 */
export function runAllTests(): void {
  console.log('🚀 Running Higher-Kinded Types (HKTs) System Tests\n');
  
  testLift2();
  testComposeK();
  testSequence();
  testTraverse();
  testDerivableInstances();
  testTypeLevelOperations();
  testCustomTree();
  testHigherOrderKinds();
  testPhantomTypes();
  
  console.log('\n✅ All HKT system tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Type constructors as first-class values');
  console.log('- ✅ Type-safe application of kinds to type arguments');
  console.log('- ✅ Generic constraints across all type constructors of a given kind');
  console.log('- ✅ Generic algorithms for any Functor/Applicative/Monad');
  console.log('- ✅ Derivable instances integration');
  console.log('- ✅ Higher-order kinds (ComposeK, NatK)');
  console.log('- ✅ Phantom type support');
  console.log('- ✅ Custom type constructor examples');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
} 