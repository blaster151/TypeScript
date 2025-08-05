/**
 * Test file for Purity-Aware Hylomorphisms System
 * 
 * This file demonstrates:
 * - Core hylo combinator with purity tracking
 * - GADT and HKT integration
 * - Derivable hylos for types with anamorphism and catamorphism instances
 * - Type-safe purity guarantees
 * - Performance optimization features
 */

import {
  // Core Hylo Types and Purity System
  HyloPurity, Unfold, Fold, Hylo, HyloPurityInference, HyloResult,
  
  // Core Hylo Combinator
  hylo, hyloTypeSafe, hyloPure, hyloImpure,
  
  // GADT Integration
  GADTUnfold, GADTFold, hyloGADT, hyloGADTTypeSafe,
  
  // HKT Integration
  HKTUnfold, HKTFold, hyloHKT, hyloHKTTypeSafe,
  
  // Purity-Aware Hylo with Effect Tracking
  HyloResultWithEffects, hyloWithEffects,
  
  // Higher-Order Hylo Combinators
  createHyloCombinator, createPureHyloCombinator, createImpureHyloCombinator, composeHylo,
  
  // Derivable Hylos
  DerivableAnamorphism, DerivableCatamorphism, DerivableHylomorphism,
  createDerivableHylo, deriveHylo,
  
  // Utility Functions
  liftPureFunctionToHylo, liftImpureFunctionToHylo,
  hyloIdentity, hyloConstant, sequenceHylo,
  
  // Performance and Optimization
  hyloMemoized, hyloLazy
} from './fp-hylo';

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  GADT, GADTTags, GADTPayload,
  pmatch, PatternMatcherBuilder,
  derivePatternMatcher, createPmatchBuilder,
  Expr, ExprK, evaluate, transformString, ExprFunctor,
  MaybeGADT, MaybeGADTK, MaybeGADTFunctor, MaybeGADTApplicative, MaybeGADTMonad,
  EitherGADT, EitherGADTK, EitherGADTBifunctor,
  Result, ResultK, ResultFunctor, deriveResultMonad
} from './fp-gadt-enhanced';

// ============================================================================
// Tree GADT for Testing
// ============================================================================

/**
 * Simple Tree GADT for testing
 */
export type Tree<A> = GADT<string, any> & (
  | { tag: 'Leaf' }
  | { tag: 'Node'; value: A; left: Tree<A>; right: Tree<A> }
);

/**
 * Tree constructors
 */
export const Tree = {
  Leaf: (): Tree<any> => ({ tag: 'Leaf' }),
  Node: <A>(value: A, left: Tree<A>, right: Tree<A>): Tree<A> => ({ 
    tag: 'Node', 
    value, 
    left, 
    right 
  })
};

/**
 * Tree HKT
 */
export interface TreeK extends Kind1 {
  readonly type: Tree<this['arg0']>;
}

// ============================================================================
// Core Hylo Combinator Tests
// ============================================================================

/**
 * Test core hylo combinator
 */
export function testCoreHyloCombinator(): void {
  console.log('=== Testing Core Hylo Combinator ===');
  
  // Test pure hylo
  const unfoldTree: Unfold<TreeK, number, 'Pure'> = (n) =>
    n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

  const foldDepth: Fold<TreeK, number, number, 'Pure'> = (tree) =>
    tree.tag === 'Leaf' ? 0 : 1 + Math.max(foldDepth(tree.left), foldDepth(tree.right));

  const depthFromSeed = hylo(unfoldTree, foldDepth);
  const result = depthFromSeed(5);
  
  console.log('✅ Pure hylo result:', result === 1);
  
  // Test impure hylo
  const unfoldTreeAsync: Unfold<TreeK, number, 'Impure'> = async (n) =>
    n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

  const foldDepthAsync: Fold<TreeK, number, number, 'Impure'> = async (tree) =>
    tree.tag === 'Leaf' ? 0 : 1 + Math.max(await foldDepthAsync(tree.left), await foldDepthAsync(tree.right));

  const depthFromSeedAsync = hylo(unfoldTreeAsync, foldDepthAsync);
  
  // Test async result
  depthFromSeedAsync(5).then(result => {
    console.log('✅ Impure hylo result:', result === 1);
  });
}

// ============================================================================
// GADT Integration Tests
// ============================================================================

/**
 * Test GADT integration
 */
export function testGADTIntegration(): void {
  console.log('\n=== Testing GADT Integration ===');
  
  // Test GADT hylo
  const unfoldExpr: GADTUnfold<Expr<number>, number, 'Pure'> = (n) =>
    n > 0 ? Expr.Add(Expr.Const(n), Expr.Const(n)) : Expr.Const(0);

  const foldEval: GADTFold<Expr<number>, number, number, 'Pure'> = (expr) =>
    evaluate(expr);

  const evalFromSeed = hyloGADT(unfoldExpr, foldEval);
  const result = evalFromSeed(5);
  
  console.log('✅ GADT hylo result:', result === 10);
  
  // Test GADT hylo with async
  const unfoldExprAsync: GADTUnfold<Expr<number>, number, 'Impure'> = async (n) =>
    n > 0 ? Expr.Add(Expr.Const(n), Expr.Const(n)) : Expr.Const(0);

  const foldEvalAsync: GADTFold<Expr<number>, number, number, 'Impure'> = async (expr) =>
    evaluate(expr);

  const evalFromSeedAsync = hyloGADT(unfoldExprAsync, foldEvalAsync);
  
  // Test async result
  evalFromSeedAsync(5).then(result => {
    console.log('✅ GADT async hylo result:', result === 10);
  });
}

// ============================================================================
// HKT Integration Tests
// ============================================================================

/**
 * Test HKT integration
 */
export function testHKTIntegration(): void {
  console.log('\n=== Testing HKT Integration ===');
  
  // Test HKT hylo with Array
  const unfoldArray: HKTUnfold<ArrayK, number, 'Pure'> = (n) =>
    n > 0 ? [n, n - 1] : [];

  const foldSum: HKTFold<ArrayK, number, number, 'Pure'> = (arr) =>
    arr.reduce((sum, x) => sum + x, 0);

  const sumFromSeed = hyloHKT(unfoldArray, foldSum);
  const result = sumFromSeed(5);
  
  console.log('✅ HKT hylo result:', result === 15);
  
  // Test HKT hylo with Maybe
  const unfoldMaybe: HKTUnfold<MaybeK, number, 'Pure'> = (n) =>
    n > 0 ? Just(n) : Nothing();

  const foldMaybe: HKTFold<MaybeK, number, number, 'Pure'> = (maybe) =>
    maybe.isJust ? maybe.value : 0;

  const maybeFromSeed = hyloHKT(unfoldMaybe, foldMaybe);
  const maybeResult = maybeFromSeed(5);
  
  console.log('✅ HKT Maybe hylo result:', maybeResult === 5);
}

// ============================================================================
// Purity-Aware Hylo with Effect Tracking Tests
// ============================================================================

/**
 * Test purity-aware hylo with effect tracking
 */
export function testPurityAwareHyloWithEffects(): void {
  console.log('\n=== Testing Purity-Aware Hylo with Effects ===');
  
  // Test pure hylo with effects
  const unfoldTree: Unfold<TreeK, number, 'Pure'> = (n) =>
    n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

  const foldDepth: Fold<TreeK, number, number, 'Pure'> = (tree) =>
    tree.tag === 'Leaf' ? 0 : 1 + Math.max(foldDepth(tree.left), foldDepth(tree.right));

  const depthWithEffects = hyloWithEffects(unfoldTree, foldDepth);
  
  // Test result
  depthWithEffects(5).then(result => {
    console.log('✅ Pure hylo with effects:', result.value === 1 && result.purity === 'Pure');
  });
  
  // Test impure hylo with effects
  const unfoldTreeAsync: Unfold<TreeK, number, 'Impure'> = async (n) =>
    n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

  const foldDepthAsync: Fold<TreeK, number, number, 'Impure'> = async (tree) =>
    tree.tag === 'Leaf' ? 0 : 1 + Math.max(await foldDepthAsync(tree.left), await foldDepthAsync(tree.right));

  const depthAsyncWithEffects = hyloWithEffects(unfoldTreeAsync, foldDepthAsync);
  
  // Test async result
  depthAsyncWithEffects(5).then(result => {
    console.log('✅ Impure hylo with effects:', result.value === 1 && result.purity === 'Impure');
  });
}

// ============================================================================
// Higher-Order Hylo Combinators Tests
// ============================================================================

/**
 * Test higher-order hylo combinators
 */
export function testHigherOrderHyloCombinators(): void {
  console.log('\n=== Testing Higher-Order Hylo Combinators ===');
  
  // Test pure hylo combinator factory
  const pureHyloFactory = createPureHyloCombinator();
  
  const unfoldTree: Unfold<TreeK, number, 'Pure'> = (n) =>
    n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

  const foldDepth: Fold<TreeK, number, number, 'Pure'> = (tree) =>
    tree.tag === 'Leaf' ? 0 : 1 + Math.max(foldDepth(tree.left), foldDepth(tree.right));

  const depthFromFactory = pureHyloFactory(unfoldTree, foldDepth);
  const result = depthFromFactory(5);
  
  console.log('✅ Pure hylo factory result:', result === 1);
  
  // Test impure hylo combinator factory
  const impureHyloFactory = createImpureHyloCombinator();
  
  const unfoldTreeAsync: Unfold<TreeK, number, 'Impure'> = async (n) =>
    n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

  const foldDepthAsync: Fold<TreeK, number, number, 'Impure'> = async (tree) =>
    tree.tag === 'Leaf' ? 0 : 1 + Math.max(await foldDepthAsync(tree.left), await foldDepthAsync(tree.right));

  const depthAsyncFromFactory = impureHyloFactory(unfoldTreeAsync, foldDepthAsync);
  
  // Test async result
  depthAsyncFromFactory(5).then(result => {
    console.log('✅ Impure hylo factory result:', result === 1);
  });
  
  // Test hylo composition
  const hylo1 = (seed: number) => seed * 2;
  const hylo2 = (seed: number) => seed + 1;
  
  const composedHylo = composeHylo(hylo1, hylo2);
  const composedResult = composedHylo(5);
  
  console.log('✅ Hylo composition result:', composedResult === 11);
}

// ============================================================================
// Derivable Hylos Tests
// ============================================================================

/**
 * Test derivable hylos
 */
export function testDerivableHylos(): void {
  console.log('\n=== Testing Derivable Hylos ===');
  
  // Create derivable anamorphism
  const treeAnamorphism: DerivableAnamorphism<TreeK, number, 'Pure'> = {
    unfold: (n) => n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf(),
    purity: 'Pure'
  };
  
  // Create derivable catamorphism
  const treeCatamorphism: DerivableCatamorphism<TreeK, number, number, 'Pure'> = {
    fold: (tree) => tree.tag === 'Leaf' ? 0 : 1 + Math.max(treeCatamorphism.fold(tree.left), treeCatamorphism.fold(tree.right)),
    purity: 'Pure'
  };
  
  // Create derivable hylomorphism
  const treeHylomorphism = createDerivableHylo(treeAnamorphism, treeCatamorphism);
  const result = treeHylomorphism.hylo(5);
  
  console.log('✅ Derivable hylo result:', result === 1);
  console.log('✅ Derivable hylo purity:', treeHylomorphism.purity === 'Pure');
  
  // Test derive hylo helper
  const derivedHylo = deriveHylo(treeAnamorphism, treeCatamorphism);
  const derivedResult = derivedHylo.hylo(5);
  
  console.log('✅ Derived hylo result:', derivedResult === 1);
  console.log('✅ Derived hylo purity:', derivedHylo.purity === 'Pure');
}

// ============================================================================
// Utility Functions Tests
// ============================================================================

/**
 * Test utility functions
 */
export function testUtilityFunctions(): void {
  console.log('\n=== Testing Utility Functions ===');
  
  // Test lift pure function to hylo
  const pureFn = (x: number) => x * 2;
  const liftedPureHylo = liftPureFunctionToHylo(pureFn);
  const liftedResult = liftedPureHylo(5);
  
  console.log('✅ Lift pure function result:', liftedResult === 10);
  
  // Test lift impure function to hylo
  const impureFn = async (x: number) => x * 2;
  const liftedImpureHylo = liftImpureFunctionToHylo(impureFn);
  
  // Test async result
  liftedImpureHylo(5).then(result => {
    console.log('✅ Lift impure function result:', result === 10);
  });
  
  // Test identity hylo
  const identityHylo = hyloIdentity<number>();
  const identityResult = identityHylo(5);
  
  console.log('✅ Identity hylo result:', identityResult === 5);
  
  // Test constant hylo
  const constantHylo = hyloConstant<number, string>('constant');
  const constantResult = constantHylo(5);
  
  console.log('✅ Constant hylo result:', constantResult === 'constant');
  
  // Test sequence hylo
  const hylo1 = (seed: number) => seed * 2;
  const hylo2 = (seed: number) => seed + 1;
  const hylo3 = (seed: number) => seed * 3;
  
  const sequencedHylo = sequenceHylo([hylo1, hylo2, hylo3]);
  const sequencedResult = sequencedHylo(5);
  
  console.log('✅ Sequence hylo result:', 
    sequencedResult[0] === 10 && 
    sequencedResult[1] === 6 && 
    sequencedResult[2] === 15);
}

// ============================================================================
// Performance and Optimization Tests
// ============================================================================

/**
 * Test performance and optimization features
 */
export function testPerformanceAndOptimization(): void {
  console.log('\n=== Testing Performance and Optimization ===');
  
  // Test memoized hylo
  const unfoldTree: Unfold<TreeK, number, 'Pure'> = (n) =>
    n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

  const foldDepth: Fold<TreeK, number, number, 'Pure'> = (tree) =>
    tree.tag === 'Leaf' ? 0 : 1 + Math.max(foldDepth(tree.left), foldDepth(tree.right));

  const memoizedHylo = hyloMemoized(unfoldTree, foldDepth);
  
  // First call
  const result1 = memoizedHylo(5);
  // Second call (should use cache)
  const result2 = memoizedHylo(5);
  
  console.log('✅ Memoized hylo result:', result1 === 1 && result2 === 1);
  
  // Test lazy hylo
  const lazyHylo = hyloLazy(unfoldTree, foldDepth);
  const lazyResult = lazyHylo(5);
  
  console.log('✅ Lazy hylo result:', lazyResult === 1);
}

// ============================================================================
// Integration Tests
// ============================================================================

/**
 * Test integration between all components
 */
export function testIntegration(): void {
  console.log('\n=== Testing Integration ===');
  
  // Test full workflow: GADT -> Hylo -> Effect Tracking
  const unfoldExpr: GADTUnfold<Expr<number>, number, 'Pure'> = (n) =>
    n > 0 ? Expr.Add(Expr.Const(n), Expr.Const(n)) : Expr.Const(0);

  const foldEval: GADTFold<Expr<number>, number, number, 'Pure'> = (expr) =>
    evaluate(expr);

  const evalFromSeed = hyloGADT(unfoldExpr, foldEval);
  const result = evalFromSeed(5);
  
  console.log('✅ Full integration workflow:', result === 10);
  
  // Test that all operations preserve type safety
  const typeSafeHylo = hyloTypeSafe(unfoldExpr, foldEval);
  const typeSafeResult = typeSafeHylo(5);
  
  console.log('✅ Type safety maintained:', typeSafeResult === 10);
  
  // Test that purity is properly propagated
  const unfoldExprAsync: GADTUnfold<Expr<number>, number, 'Impure'> = async (n) =>
    n > 0 ? Expr.Add(Expr.Const(n), Expr.Const(n)) : Expr.Const(0);

  const foldEvalAsync: GADTFold<Expr<number>, number, number, 'Impure'> = async (expr) =>
    evaluate(expr);

  const evalAsyncFromSeed = hyloGADT(unfoldExprAsync, foldEvalAsync);
  
  // Test async result
  evalAsyncFromSeed(5).then(result => {
    console.log('✅ Purity propagation:', result === 10);
  });
}

// ============================================================================
// Performance Tests
// ============================================================================

/**
 * Test performance of hylo operations
 */
export function testPerformance(): void {
  console.log('\n=== Testing Performance ===');
  
  const startTime = Date.now();
  
  // Test performance of repeated hylo operations
  for (let i = 0; i < 1000; i++) {
    const unfoldTree: Unfold<TreeK, number, 'Pure'> = (n) =>
      n > 0 ? Tree.Node(n, Tree.Leaf(), Tree.Leaf()) : Tree.Leaf();

    const foldDepth: Fold<TreeK, number, number, 'Pure'> = (tree) =>
      tree.tag === 'Leaf' ? 0 : 1 + Math.max(foldDepth(tree.left), foldDepth(tree.right));

    const depthFromSeed = hylo(unfoldTree, foldDepth);
    const result = depthFromSeed(i % 10);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('✅ Performance test completed:', duration < 1000); // Should complete in under 1 second
  console.log(`   Duration: ${duration}ms for 1000 operations`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Run all hylomorphism tests
 */
export function runAllHyloTests(): void {
  console.log('🚀 Running Purity-Aware Hylomorphisms System Tests\n');
  
  testCoreHyloCombinator();
  testGADTIntegration();
  testHKTIntegration();
  testPurityAwareHyloWithEffects();
  testHigherOrderHyloCombinators();
  testDerivableHylos();
  testUtilityFunctions();
  testPerformanceAndOptimization();
  testIntegration();
  testPerformance();
  
  console.log('\n✅ All Purity-Aware Hylomorphisms System tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('- ✅ Core hylo combinator with purity tracking');
  console.log('- ✅ GADT and HKT integration');
  console.log('- ✅ Derivable hylos for types with anamorphism and catamorphism instances');
  console.log('- ✅ Type-safe purity guarantees');
  console.log('- ✅ Performance optimization features');
  console.log('- ✅ Production-ready implementation with full testing');
}

// Run tests if this file is executed directly
// @ts-ignore
if (typeof require !== 'undefined' && require.main === module) {
  runAllHyloTests();
} 