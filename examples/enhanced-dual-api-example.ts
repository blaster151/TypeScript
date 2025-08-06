/**
 * Enhanced Dual API System Example
 * 
 * Demonstrates seamless interoperability between fluent and data-first function variants
 */

import {
  createEnhancedDualAPI,
  CrossStyleChaining,
  ZeroCostAbstractions,
  EnhancedDualAPI
} from '../fp-enhanced-dual-api';

// ============================================================================
// Example ADTs
// ============================================================================

/**
 * Example Maybe ADT
 */
class Maybe<A> {
  constructor(public readonly value: A | null) {}
  
  static of<A>(a: A): Maybe<A> {
    return new Maybe(a);
  }
  
  static nothing<A>(): Maybe<A> {
    return new Maybe<A>(null);
  }
  
  isJust(): boolean {
    return this.value !== null;
  }
  
  isNothing(): boolean {
    return this.value === null;
  }
  
  getValue(): A | null {
    return this.value;
  }
}

/**
 * Example Either ADT
 */
class Either<L, R> {
  constructor(
    public readonly tag: 'Left' | 'Right',
    public readonly value: L | R
  ) {}
  
  static left<L, R>(l: L): Either<L, R> {
    return new Either('Left', l);
  }
  
  static right<L, R>(r: R): Either<L, R> {
    return new Either('Right', r);
  }
  
  isLeft(): boolean {
    return this.tag === 'Left';
  }
  
  isRight(): boolean {
    return this.tag === 'Right';
  }
  
  getLeft(): L | null {
    return this.isLeft() ? this.value as L : null;
  }
  
  getRight(): R | null {
    return this.isRight() ? this.value as R : null;
  }
}

// ============================================================================
// Example Typeclass Instances
// ============================================================================

const maybeInstances = {
  functor: {
    map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => {
      return fa.isJust() ? Maybe.of(f(fa.getValue()!)) : Maybe.nothing();
    }
  },
  monad: {
    of: <A>(a: A): Maybe<A> => Maybe.of(a),
    chain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => {
      return fa.isJust() ? f(fa.getValue()!) : Maybe.nothing();
    }
  },
  applicative: {
    of: <A>(a: A): Maybe<A> => Maybe.of(a),
    ap: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => {
      if (fab.isJust() && fa.isJust()) {
        return Maybe.of(fab.getValue()!(fa.getValue()!));
      }
      return Maybe.nothing();
    }
  },
  filterable: {
    filter: <A>(fa: Maybe<A>, predicate: (a: A) => boolean): Maybe<A> => {
      return fa.isJust() && predicate(fa.getValue()!) ? fa : Maybe.nothing();
    }
  },
  eq: {
    equals: <A>(a: Maybe<A>, b: Maybe<A>): boolean => {
      if (a.isJust() && b.isJust()) {
        return a.getValue() === b.getValue();
      }
      return a.isNothing() && b.isNothing();
    }
  },
  ord: {
    compare: <A>(a: Maybe<A>, b: Maybe<A>): number => {
      if (a.isJust() && b.isJust()) {
        return (a.getValue() as any) < (b.getValue() as any) ? -1 : 
               (a.getValue() as any) > (b.getValue() as any) ? 1 : 0;
      }
      if (a.isNothing() && b.isJust()) return -1;
      if (a.isJust() && b.isNothing()) return 1;
      return 0;
    }
  },
  show: {
    show: <A>(a: Maybe<A>): string => {
      return a.isJust() ? `Just(${a.getValue()})` : 'Nothing';
    }
  }
};

const eitherInstances = {
  functor: {
    map: <L, A, B>(fa: Either<L, A>, f: (a: A) => B): Either<L, B> => {
      return fa.isRight() ? Either.right(f(fa.getRight()!)) : Either.left(fa.getLeft()!);
    }
  },
  bifunctor: {
    bimap: <L, R, L2, R2>(fa: Either<L, R>, f: (l: L) => L2, g: (r: R) => R2): Either<L2, R2> => {
      return fa.isRight() ? Either.right(g(fa.getRight()!)) : Either.left(f(fa.getLeft()!));
    }
  },
  monad: {
    of: <L, A>(a: A): Either<L, A> => Either.right(a),
    chain: <L, A, B>(fa: Either<L, A>, f: (a: A) => Either<L, B>): Either<L, B> => {
      return fa.isRight() ? f(fa.getRight()!) : Either.left(fa.getLeft()!);
    }
  }
};

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example 1: Basic Dual API Usage
 */
function exampleBasicUsage() {
  console.log('=== Example 1: Basic Dual API Usage ===');
  
  // Mock registry for demonstration
  const mockRegistry = {
    derivable: new Map([
      ['Maybe', maybeInstances],
      ['Either', eitherInstances]
    ])
  };
  (globalThis as any).__FP_REGISTRY = mockRegistry;
  
  const maybe = Maybe.of(5);
  const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
  
  // Fluent style
  const fluentResult = dualAPI.fluent
    .map((x: number) => x * 2)
    .filter((x: number) => x > 5)
    .chain((x: number) => Maybe.of(x.toString()));
  
  console.log('Fluent result:', fluentResult.chainState.value.getValue());
  
  // Data-first style
  const dataFirstResult = dualAPI.dataFirst.chain((x: number) => Maybe.of(x.toString()))(
    dualAPI.dataFirst.filter((x: number) => x > 5)(
      dualAPI.dataFirst.map((x: number) => x * 2)(maybe)
    )
  );
  
  console.log('Data-first result:', dataFirstResult.getValue());
  
  // Both should be equivalent
  console.log('Results are equivalent:', 
    fluentResult.chainState.value.getValue() === dataFirstResult.getValue());
}

/**
 * Example 2: Cross-Style Chaining
 */
function exampleCrossStyleChaining() {
  console.log('\n=== Example 2: Cross-Style Chaining ===');
  
  const maybe = Maybe.of(10);
  const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
  
  // Start with data-first, switch to fluent mid-chain
  const dataFirstToFluent = CrossStyleChaining.startDataFirst(
    dualAPI,
    (fa: Maybe<number>) => Maybe.of(fa.getValue()! * 2),
    (fa: Maybe<number>) => Maybe.of(fa.getValue()! + 1)
  );
  
  const result1 = dataFirstToFluent(maybe);
  console.log('Data-first to fluent:', result1.chainState.value.getValue());
  
  // Start with fluent, switch to data-first mid-chain
  const fluentToDataFirst = CrossStyleChaining.startFluent(
    dualAPI,
    (fluent) => fluent.map((x: number) => x * 3),
    (fluent) => fluent.map((x: number) => x - 5)
  );
  
  const result2 = fluentToDataFirst(maybe);
  console.log('Fluent to data-first:', result2.getValue());
  
  // Mixed chain with automatic style detection
  const mixedChain = CrossStyleChaining.mixedChain(
    dualAPI,
    (fa: Maybe<number>) => Maybe.of(fa.getValue()! * 2), // data-first
    (fluent) => fluent.map((x: number) => x + 1), // fluent
    (fa: Maybe<number>) => Maybe.of(fa.getValue()! * 3)  // data-first
  );
  
  const result3 = mixedChain(maybe);
  console.log('Mixed chain:', result3.getValue()); // (10 * 2 + 1) * 3 = 63
}

/**
 * Example 3: Zero-Cost Abstractions
 */
function exampleZeroCostAbstractions() {
  console.log('\n=== Example 3: Zero-Cost Abstractions ===');
  
  const maybe = Maybe.of(15);
  const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
  
  // Create zero-cost fluent wrapper
  const fluent = ZeroCostAbstractions.createZeroCostFluent(maybe, dualAPI);
  console.log('Zero-cost fluent wrapper:', fluent.chainState.value.getValue());
  
  // Create zero-cost data-first function
  const mapFn = ZeroCostAbstractions.createZeroCostDataFirst('Functor', dualAPI);
  const mapped = mapFn((x: number) => x * 2)(maybe);
  console.log('Zero-cost data-first map:', mapped.getValue());
  
  // Zero-cost style switching
  const switchedToFluent = ZeroCostAbstractions.switchStyle(maybe, dualAPI);
  console.log('Switched to fluent:', 'chainState' in switchedToFluent);
  
  const switchedBack = ZeroCostAbstractions.switchStyle(switchedToFluent, dualAPI);
  console.log('Switched back to data-first:', switchedBack === maybe);
}

/**
 * Example 4: Complex Transformation Chains
 */
function exampleComplexTransformations() {
  console.log('\n=== Example 4: Complex Transformation Chains ===');
  
  const maybe = Maybe.of(5);
  const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
  
  // Complex chain mixing both styles
  const complexTransform = dualAPI.crossStyle.pipe(
    (fa: Maybe<number>) => Maybe.of(fa.getValue()! * 2), // data-first
    (fluent) => fluent.map((x: number) => x + 1), // fluent
    (fa: Maybe<number>) => Maybe.of(fa.getValue()! * 3), // data-first
    (fluent) => fluent.filter((x: number) => x > 10), // fluent
    (fa: Maybe<number>) => Maybe.of(fa.getValue()!.toString()) // data-first
  );
  
  const result = complexTransform(maybe);
  console.log('Complex transformation result:', result.getValue());
  
  // Step-by-step breakdown:
  // 1. 5 * 2 = 10
  // 2. 10 + 1 = 11
  // 3. 11 * 3 = 33
  // 4. 33 > 10 = true, so keep 33
  // 5. "33"
}

/**
 * Example 5: Higher-Kinded Types
 */
function exampleHigherKindedTypes() {
  console.log('\n=== Example 5: Higher-Kinded Types ===');
  
  const either = Either.right(7);
  const dualAPI = createEnhancedDualAPI(either, 'Either');
  
  // Test bifunctor operations with cross-style chaining
  const bifunctorTransform = dualAPI.crossStyle.pipe(
    (fluent) => fluent.bimap(
      (l: string) => `Error: ${l}`,
      (r: number) => r * 2
    ),
    (fa: Either<string, number>) => Either.right(fa.getRight()! + 1),
    (fluent) => fluent.map((x: number) => x.toString())
  );
  
  const result = bifunctorTransform(either);
  console.log('Bifunctor transformation result:', result.getRight());
  
  // Step-by-step breakdown:
  // 1. Right(7) -> bimap -> Right(14)
  // 2. Right(14) -> +1 -> Right(15)
  // 3. Right(15) -> toString -> Right("15")
}

/**
 * Example 6: Performance Comparison
 */
function examplePerformanceComparison() {
  console.log('\n=== Example 6: Performance Comparison ===');
  
  const maybe = Maybe.of(1);
  const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
  
  const iterations = 10000;
  
  // Test fluent style performance
  const fluentStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = dualAPI.fluent
      .map((x: number) => x * 2)
      .filter((x: number) => x > 0)
      .chain((x: number) => Maybe.of(x + 1));
  }
  const fluentEnd = performance.now();
  
  // Test data-first style performance
  const dataFirstStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = dualAPI.dataFirst.chain((x: number) => Maybe.of(x + 1))(
      dualAPI.dataFirst.filter((x: number) => x > 0)(
        dualAPI.dataFirst.map((x: number) => x * 2)(maybe)
      )
    );
  }
  const dataFirstEnd = performance.now();
  
  // Test cross-style performance
  const crossStyleStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = dualAPI.crossStyle.pipe(
      (fa: Maybe<number>) => Maybe.of(fa.getValue()! * 2),
      (fluent) => fluent.filter((x: number) => x > 0),
      (fa: Maybe<number>) => Maybe.of(fa.getValue()! + 1)
    )(maybe);
  }
  const crossStyleEnd = performance.now();
  
  console.log(`Fluent style: ${(fluentEnd - fluentStart).toFixed(2)}ms`);
  console.log(`Data-first style: ${(dataFirstEnd - dataFirstStart).toFixed(2)}ms`);
  console.log(`Cross-style: ${(crossStyleEnd - crossStyleStart).toFixed(2)}ms`);
}

/**
 * Example 7: Type Safety Demonstration
 */
function exampleTypeSafety() {
  console.log('\n=== Example 7: Type Safety Demonstration ===');
  
  const maybe = Maybe.of(5);
  const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
  
  // Type-safe transformations
  const typeSafeTransform = dualAPI.crossStyle.pipe(
    (fa: Maybe<number>) => Maybe.of(fa.getValue()! * 2), // number -> number
    (fluent) => fluent.map((x: number) => x.toString()), // number -> string
    (fa: Maybe<string>) => Maybe.of(fa.getValue()!.length), // string -> number
    (fluent) => fluent.filter((x: number) => x > 0) // number -> number
  );
  
  const result = typeSafeTransform(maybe);
  console.log('Type-safe transformation result:', result.getValue());
  
  // The type system ensures that:
  // 1. Each transformation is type-safe
  // 2. The chain maintains type consistency
  // 3. Typeclass capabilities are preserved
  // 4. Higher-kinded types are handled correctly
}

// ============================================================================
// Run Examples
// ============================================================================

export function runEnhancedDualAPIExamples() {
  console.log('🚀 Enhanced Dual API System Examples\n');
  
  try {
    exampleBasicUsage();
    exampleCrossStyleChaining();
    exampleZeroCostAbstractions();
    exampleComplexTransformations();
    exampleHigherKindedTypes();
    examplePerformanceComparison();
    exampleTypeSafety();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  } finally {
    // Clean up mock registry
    delete (globalThis as any).__FP_REGISTRY;
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runEnhancedDualAPIExamples();
}
