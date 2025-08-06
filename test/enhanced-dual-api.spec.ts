/**
 * Enhanced Dual API System Test Suite
 * 
 * Tests for seamless interoperability between fluent and data-first function variants
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createEnhancedDualAPI,
  createDualFactory,
  createSharedMethodDefinitions,
  CrossStyleChaining,
  CrossStyleTypeTests,
  ZeroCostAbstractions,
  EnhancedDualAPI,
  SharedMethodDefinition,
  DualFactoryConfig
} from '../fp-enhanced-dual-api';

// ============================================================================
// Mock ADTs and Typeclass Instances
// ============================================================================

/**
 * Mock Maybe ADT
 */
class MockMaybe<A> {
  constructor(public readonly value: A | null) {}
  
  static of<A>(a: A): MockMaybe<A> {
    return new MockMaybe(a);
  }
  
  static nothing<A>(): MockMaybe<A> {
    return new MockMaybe<A>(null);
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
 * Mock Either ADT
 */
class MockEither<L, R> {
  constructor(
    public readonly tag: 'Left' | 'Right',
    public readonly value: L | R
  ) {}
  
  static left<L, R>(l: L): MockEither<L, R> {
    return new MockEither('Left', l);
  }
  
  static right<L, R>(r: R): MockEither<L, R> {
    return new MockEither('Right', r);
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

/**
 * Mock typeclass instances
 */
const mockMaybeInstances = {
  functor: {
    map: <A, B>(fa: MockMaybe<A>, f: (a: A) => B): MockMaybe<B> => {
      return fa.isJust() ? MockMaybe.of(f(fa.getValue()!)) : MockMaybe.nothing();
    }
  },
  monad: {
    of: <A>(a: A): MockMaybe<A> => MockMaybe.of(a),
    chain: <A, B>(fa: MockMaybe<A>, f: (a: A) => MockMaybe<B>): MockMaybe<B> => {
      return fa.isJust() ? f(fa.getValue()!) : MockMaybe.nothing();
    }
  },
  applicative: {
    of: <A>(a: A): MockMaybe<A> => MockMaybe.of(a),
    ap: <A, B>(fab: MockMaybe<(a: A) => B>, fa: MockMaybe<A>): MockMaybe<B> => {
      if (fab.isJust() && fa.isJust()) {
        return MockMaybe.of(fab.getValue()!(fa.getValue()!));
      }
      return MockMaybe.nothing();
    }
  },
  filterable: {
    filter: <A>(fa: MockMaybe<A>, predicate: (a: A) => boolean): MockMaybe<A> => {
      return fa.isJust() && predicate(fa.getValue()!) ? fa : MockMaybe.nothing();
    }
  },
  eq: {
    equals: <A>(a: MockMaybe<A>, b: MockMaybe<A>): boolean => {
      if (a.isJust() && b.isJust()) {
        return a.getValue() === b.getValue();
      }
      return a.isNothing() && b.isNothing();
    }
  },
  ord: {
    compare: <A>(a: MockMaybe<A>, b: MockMaybe<A>): number => {
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
    show: <A>(a: MockMaybe<A>): string => {
      return a.isJust() ? `Just(${a.getValue()})` : 'Nothing';
    }
  }
};

const mockEitherInstances = {
  functor: {
    map: <L, A, B>(fa: MockEither<L, A>, f: (a: A) => B): MockEither<L, B> => {
      return fa.isRight() ? MockEither.right(f(fa.getRight()!)) : MockEither.left(fa.getLeft()!);
    }
  },
  bifunctor: {
    bimap: <L, R, L2, R2>(fa: MockEither<L, R>, f: (l: L) => L2, g: (r: R) => R2): MockEither<L2, R2> => {
      return fa.isRight() ? MockEither.right(g(fa.getRight()!)) : MockEither.left(f(fa.getLeft()!));
    }
  },
  monad: {
    of: <L, A>(a: A): MockEither<L, A> => MockEither.right(a),
    chain: <L, A, B>(fa: MockEither<L, A>, f: (a: A) => MockEither<L, B>): MockEither<L, B> => {
      return fa.isRight() ? f(fa.getRight()!) : MockEither.left(fa.getLeft()!);
    }
  }
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Enhanced Dual API System', () => {
  
  describe('Shared Method Definitions', () => {
    it('should create shared method definitions from typeclass instances', () => {
      const methods = createSharedMethodDefinitions('Maybe', mockMaybeInstances);
      
      expect(methods.map).toBeDefined();
      expect(methods.chain).toBeDefined();
      expect(methods.ap).toBeDefined();
      expect(methods.filter).toBeDefined();
      expect(methods.equals).toBeDefined();
      expect(methods.compare).toBeDefined();
      expect(methods.show).toBeDefined();
      
      expect(methods.map?.name).toBe('map');
      expect(methods.map?.typeclass).toBe('Functor');
    });
    
    it('should create both fluent and data-first variants', () => {
      const methods = createSharedMethodDefinitions('Maybe', mockMaybeInstances);
      const maybe = MockMaybe.of(5);
      
      // Test fluent variant
      const fluentResult = methods.map!.fluent.call(maybe, (x: number) => x * 2);
      expect(fluentResult.getValue()).toBe(10);
      
      // Test data-first variant
      const dataFirstFn = methods.map!.dataFirst((x: number) => x * 2);
      const dataFirstResult = dataFirstFn(maybe);
      expect(dataFirstResult.getValue()).toBe(10);
    });
  });
  
  describe('Dual Factory', () => {
    it('should create dual factory with both fluent and data-first APIs', () => {
      const methods = createSharedMethodDefinitions('Maybe', mockMaybeInstances);
      const capabilities = {
        Functor: true,
        Applicative: true,
        Monad: true,
        Bifunctor: false,
        Traversable: false,
        Filterable: true,
        Eq: true,
        Ord: true,
        Show: true
      };
      
      const config: DualFactoryConfig<MockMaybe<number>, typeof capabilities> = {
        adtName: 'Maybe',
        capabilities,
        methods,
        options: { enableTypeInference: true }
      };
      
      const dualAPI = createDualFactory(config);
      
      expect(dualAPI.fluent).toBeDefined();
      expect(dualAPI.dataFirst).toBeDefined();
      expect(dualAPI.crossStyle).toBeDefined();
      expect(dualAPI.typeInfo).toBeDefined();
      
      expect(dualAPI.typeInfo.adtName).toBe('Maybe');
      expect(dualAPI.typeInfo.capabilities).toEqual(capabilities);
    });
  });
  
  describe('Enhanced Dual API Creation', () => {
    let mockRegistry: any;
    
    beforeEach(() => {
      // Mock the registry
      mockRegistry = {
        derivable: new Map([
          ['Maybe', mockMaybeInstances],
          ['Either', mockEitherInstances]
        ])
      };
      
      // Mock global registry
      (globalThis as any).__FP_REGISTRY = mockRegistry;
    });
    
    afterEach(() => {
      delete (globalThis as any).__FP_REGISTRY;
    });
    
    it('should create enhanced dual API with automatic method discovery', () => {
      const maybe = MockMaybe.of(5);
      const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
      
      expect(dualAPI.fluent).toBeDefined();
      expect(dualAPI.dataFirst).toBeDefined();
      expect(dualAPI.crossStyle).toBeDefined();
      expect(dualAPI.typeInfo).toBeDefined();
    });
    
    it('should throw error when no derived instances found', () => {
      const maybe = MockMaybe.of(5);
      
      expect(() => {
        createEnhancedDualAPI(maybe, 'NonExistentADT');
      }).toThrow('No derived instances found for NonExistentADT');
    });
  });
  
  describe('Cross-Style Chaining', () => {
    let dualAPI: EnhancedDualAPI<MockMaybe<number>, any>;
    
    beforeEach(() => {
      const maybe = MockMaybe.of(5);
      dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
    });
    
    it('should start with data-first and switch to fluent mid-chain', () => {
      const chain = CrossStyleChaining.startDataFirst(
        dualAPI,
        (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()! * 2),
        (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()! + 1)
      );
      
      const result = chain(MockMaybe.of(5));
      expect(result.chainState.value.getValue()).toBe(11);
    });
    
    it('should start with fluent and switch to data-first mid-chain', () => {
      const chain = CrossStyleChaining.startFluent(
        dualAPI,
        (fluent) => fluent.map((x: number) => x * 2),
        (fluent) => fluent.map((x: number) => x + 1)
      );
      
      const result = chain(MockMaybe.of(5));
      expect(result.getValue()).toBe(11);
    });
    
    it('should handle mixed chains with automatic style detection', () => {
      const chain = CrossStyleChaining.mixedChain(
        dualAPI,
        (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()! * 2), // data-first
        (fluent) => fluent.map((x: number) => x + 1), // fluent
        (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()! * 3)  // data-first
      );
      
      const result = chain(MockMaybe.of(5));
      expect(result.getValue()).toBe(33); // (5 * 2 + 1) * 3
    });
  });
  
  describe('Zero-Cost Abstractions', () => {
    let dualAPI: EnhancedDualAPI<MockMaybe<number>, any>;
    
    beforeEach(() => {
      const maybe = MockMaybe.of(5);
      dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
    });
    
    it('should create zero-cost fluent wrapper', () => {
      const maybe = MockMaybe.of(5);
      const fluent = ZeroCostAbstractions.createZeroCostFluent(maybe, dualAPI);
      
      expect(fluent.chainState.value).toBe(maybe);
      expect(fluent.map).toBeDefined();
      expect(fluent.chain).toBeDefined();
    });
    
    it('should create zero-cost data-first function', () => {
      const mapFn = ZeroCostAbstractions.createZeroCostDataFirst('Functor', dualAPI);
      
      expect(typeof mapFn).toBe('function');
      const result = mapFn((x: number) => x * 2)(MockMaybe.of(5));
      expect(result.getValue()).toBe(10);
    });
    
    it('should switch styles with zero cost', () => {
      const maybe = MockMaybe.of(5);
      
      // Switch to fluent
      const fluent = ZeroCostAbstractions.switchStyle(maybe, dualAPI);
      expect('chainState' in fluent).toBe(true);
      
      // Switch back to data-first
      const dataFirst = ZeroCostAbstractions.switchStyle(fluent, dualAPI);
      expect('chainState' in dataFirst).toBe(false);
      expect(dataFirst).toBe(maybe);
    });
  });
  
  describe('Cross-Style Type Tests', () => {
    it('should preserve types across fluent to data-first conversion', () => {
      // This is a type-only test - if it compiles, it passes
      type Test = CrossStyleTypeTests.TestFluentToDataFirst<
        MockMaybe<number>,
        { Functor: true; Monad: true },
        (fluent: any) => MockMaybe<string>
      >;
      
      // Should be (fa: MockMaybe<number>) => MockMaybe<string>
      const _test: Test = (fa: MockMaybe<number>) => MockMaybe.of('test');
    });
    
    it('should preserve types across data-first to fluent conversion', () => {
      // This is a type-only test - if it compiles, it passes
      type Test = CrossStyleTypeTests.TestDataFirstToFluent<
        MockMaybe<number>,
        { Functor: true; Monad: true },
        (fa: MockMaybe<number>) => MockMaybe<string>
      >;
      
      // Should be (fluent: any) => MockMaybe<string>
      const _test: Test = (fluent: any) => MockMaybe.of('test');
    });
    
    it('should preserve type inference in mixed chains', () => {
      // This is a type-only test - if it compiles, it passes
      type Test = CrossStyleTypeTests.TestMixedChain<
        MockMaybe<number>,
        { Functor: true; Monad: true },
        [(fa: MockMaybe<number>) => MockMaybe<string>, (fluent: any) => MockMaybe<boolean>]
      >;
      
      // Should be (fa: MockMaybe<number>) => any
      const _test: Test = (fa: MockMaybe<number>) => MockMaybe.of(true);
    });
  });
  
  describe('Integration Tests', () => {
    it('should work with complex transformation chains', () => {
      const maybe = MockMaybe.of(5);
      const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
      
      // Complex chain mixing both styles
      const transform = dualAPI.crossStyle.pipe(
        (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()! * 2), // data-first
        (fluent) => fluent.map((x: number) => x + 1), // fluent
        (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()! * 3), // data-first
        (fluent) => fluent.filter((x: number) => x > 10), // fluent
        (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()!.toString()) // data-first
      );
      
      const result = transform(MockMaybe.of(5));
      expect(result.getValue()).toBe('33'); // ((5 * 2 + 1) * 3).toString()
    });
    
    it('should preserve typeclass capabilities across style boundaries', () => {
      const maybe = MockMaybe.of(5);
      const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
      
      // Test that capabilities are preserved
      expect(dualAPI.typeInfo.capabilities.Functor).toBe(true);
      expect(dualAPI.typeInfo.capabilities.Monad).toBe(true);
      expect(dualAPI.typeInfo.capabilities.Applicative).toBe(true);
      expect(dualAPI.typeInfo.capabilities.Filterable).toBe(true);
      expect(dualAPI.typeInfo.capabilities.Eq).toBe(true);
      expect(dualAPI.typeInfo.capabilities.Ord).toBe(true);
      expect(dualAPI.typeInfo.capabilities.Show).toBe(true);
    });
    
    it('should handle higher-kinded types correctly', () => {
      const either = MockEither.right(5);
      const dualAPI = createEnhancedDualAPI(either, 'Either');
      
      // Test bifunctor operations
      const transform = dualAPI.crossStyle.pipe(
        (fluent) => fluent.bimap(
          (l: string) => `Error: ${l}`,
          (r: number) => r * 2
        )
      );
      
      const result = transform(MockEither.right(5));
      expect(result.getRight()).toBe(10);
    });
  });
  
  describe('Performance Tests', () => {
    it('should have minimal runtime overhead', () => {
      const maybe = MockMaybe.of(5);
      const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
      
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const result = dualAPI.crossStyle.pipe(
          (fa: MockMaybe<number>) => MockMaybe.of(fa.getValue()! * 2),
          (fluent) => fluent.map((x: number) => x + 1)
        )(MockMaybe.of(i));
      }
      
      const end = performance.now();
      const timePerIteration = (end - start) / iterations;
      
      // Should be very fast (less than 1ms per iteration)
      expect(timePerIteration).toBeLessThan(1);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing typeclass instances gracefully', () => {
      const maybe = MockMaybe.of(5);
      const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
      
      // Try to access non-existent method
      expect(() => {
        (dualAPI.dataFirst as any).nonExistentMethod();
      }).toThrow();
    });
    
    it('should handle null/undefined values in chains', () => {
      const maybe = MockMaybe.nothing();
      const dualAPI = createEnhancedDualAPI(maybe, 'Maybe');
      
      const transform = dualAPI.crossStyle.pipe(
        (fa: MockMaybe<number>) => fa,
        (fluent) => fluent.map((x: number) => x * 2)
      );
      
      const result = transform(maybe);
      expect(result.isNothing()).toBe(true);
    });
  });
});
