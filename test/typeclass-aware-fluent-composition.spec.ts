/**
 * Typeclass-Aware Fluent Composition Tests
 * 
 * Tests for typeclass-aware fluent composition with:
 * - Compile-time type safety
 * - Cross-typeclass chaining
 * - Zero runtime overhead
 * - Method availability based on typeclass capabilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addTypeclassAwareFluentMethods,
  createTypeclassAwareFluent,
  TypeclassAwareComposition,
  detectTypeclassCapabilities,
  TypeclassCapabilities,
  TypeclassAwareFluentMethods,
  HasFunctor,
  HasMonad,
  HasBifunctor,
  HasApplicative,
  HasFilterable,
  HasTraversable,
  HasEq,
  HasOrd,
  HasShow
} from '../fp-unified-fluent-api';

// Mock ADT implementations for testing
class MockMaybe<T> {
  constructor(private value: T | null) {}
  
  static of<T>(value: T): MockMaybe<T> {
    return new MockMaybe(value);
  }
  
  getValue(): T | null {
    return this.value;
  }
}

class MockEither<L, R> {
  constructor(private left: L | null, private right: R | null) {}
  
  static left<L, R>(value: L): MockEither<L, R> {
    return new MockEither(value, null);
  }
  
  static right<L, R>(value: R): MockEither<L, R> {
    return new MockEither(null, value);
  }
  
  isLeft(): boolean {
    return this.left !== null;
  }
  
  isRight(): boolean {
    return this.right !== null;
  }
  
  getLeft(): L | null {
    return this.left;
  }
  
  getRight(): R | null {
    return this.right;
  }
}

// Mock typeclass instances
const mockFunctor = {
  map: <A, B>(fa: MockMaybe<A>, f: (a: A) => B): MockMaybe<B> => {
    const value = fa.getValue();
    return value !== null ? MockMaybe.of(f(value)) : MockMaybe.of(null as any);
  }
};

const mockMonad = {
  of: <A>(a: A): MockMaybe<A> => MockMaybe.of(a),
  chain: <A, B>(fa: MockMaybe<A>, f: (a: A) => MockMaybe<B>): MockMaybe<B> => {
    const value = fa.getValue();
    return value !== null ? f(value) : MockMaybe.of(null as any);
  }
};

const mockApplicative = {
  of: <A>(a: A): MockMaybe<A> => MockMaybe.of(a),
  ap: <A, B>(fab: MockMaybe<(a: A) => B>, fa: MockMaybe<A>): MockMaybe<B> => {
    const f = fab.getValue();
    const a = fa.getValue();
    return f !== null && a !== null ? MockMaybe.of(f(a)) : MockMaybe.of(null as any);
  }
};

const mockBifunctor = {
  bimap: <A, B, C, D>(fa: MockEither<A, B>, f: (a: A) => C, g: (b: B) => D): MockEither<C, D> => {
    if (fa.isLeft()) {
      return MockEither.left(f(fa.getLeft()!));
    } else {
      return MockEither.right(g(fa.getRight()!));
    }
  },
  mapLeft: <A, B, C>(fa: MockEither<A, B>, f: (a: A) => C): MockEither<C, B> => {
    if (fa.isLeft()) {
      return MockEither.left(f(fa.getLeft()!));
    } else {
      return MockEither.right(fa.getRight()!);
    }
  },
  mapRight: <A, B, C>(fa: MockEither<A, B>, g: (b: B) => C): MockEither<A, C> => {
    if (fa.isLeft()) {
      return MockEither.left(fa.getLeft()!);
    } else {
      return MockEither.right(g(fa.getRight()!));
    }
  }
};

const mockFilterable = {
  filter: <A>(fa: MockMaybe<A>, predicate: (a: A) => boolean): MockMaybe<A> => {
    const value = fa.getValue();
    return value !== null && predicate(value) ? MockMaybe.of(value) : MockMaybe.of(null as any);
  }
};

const mockTraversable = {
  traverse: <A, B, F>(fa: MockMaybe<A>, f: (a: A) => MockMaybe<B>): MockMaybe<MockMaybe<B>> => {
    const value = fa.getValue();
    return value !== null ? MockMaybe.of(f(value)) : MockMaybe.of(MockMaybe.of(null as any));
  }
};

const mockEq = {
  equals: <A>(a: MockMaybe<A>, b: MockMaybe<A>): boolean => {
    return a.getValue() === b.getValue();
  }
};

const mockOrd = {
  compare: <A>(a: MockMaybe<A>, b: MockMaybe<A>): number => {
    const valA = a.getValue();
    const valB = b.getValue();
    if (valA === valB) return 0;
    if (valA === null) return -1;
    if (valB === null) return 1;
    return valA < valB ? -1 : 1;
  }
};

const mockShow = {
  show: <A>(a: MockMaybe<A>): string => {
    const value = a.getValue();
    return value !== null ? `Just(${value})` : 'Nothing';
  }
};

// Mock registry functions
const originalGetTypeclassInstance = (global as any).getTypeclassInstance;
const originalGetDerivableInstances = (global as any).getDerivableInstances;
const originalGetFPRegistry = (global as any).getFPRegistry;

describe('Typeclass-Aware Fluent Composition', () => {
  beforeEach(() => {
    // Mock the registry functions
    (global as any).getTypeclassInstance = jest.fn((adtName: string, typeclass: string) => {
      if (adtName === 'MockMaybe') {
        switch (typeclass) {
          case 'Functor': return mockFunctor;
          case 'Monad': return mockMonad;
          case 'Applicative': return mockApplicative;
          case 'Filterable': return mockFilterable;
          case 'Traversable': return mockTraversable;
          case 'Eq': return mockEq;
          case 'Ord': return mockOrd;
          case 'Show': return mockShow;
          default: return null;
        }
      }
      if (adtName === 'MockEither') {
        switch (typeclass) {
          case 'Functor': return mockFunctor;
          case 'Monad': return mockMonad;
          case 'Bifunctor': return mockBifunctor;
          case 'Eq': return mockEq;
          case 'Ord': return mockOrd;
          case 'Show': return mockShow;
          default: return null;
        }
      }
      return null;
    });

    (global as any).getDerivableInstances = jest.fn((adtName: string) => {
      if (adtName === 'MockMaybe') {
        return {
          functor: mockFunctor,
          monad: mockMonad,
          applicative: mockApplicative,
          filterable: mockFilterable,
          traversable: mockTraversable,
          eq: mockEq,
          ord: mockOrd,
          show: mockShow
        };
      }
      if (adtName === 'MockEither') {
        return {
          functor: mockFunctor,
          monad: mockMonad,
          bifunctor: mockBifunctor,
          eq: mockEq,
          ord: mockOrd,
          show: mockShow
        };
      }
      return null;
    });

    (global as any).getFPRegistry = jest.fn(() => ({
      derivable: new Map([
        ['MockMaybe', {
          functor: mockFunctor,
          monad: mockMonad,
          applicative: mockApplicative,
          filterable: mockFilterable,
          traversable: mockTraversable,
          eq: mockEq,
          ord: mockOrd,
          show: mockShow
        }],
        ['MockEither', {
          functor: mockFunctor,
          monad: mockMonad,
          bifunctor: mockBifunctor,
          eq: mockEq,
          ord: mockOrd,
          show: mockShow
        }]
      ])
    }));
  });

  afterEach(() => {
    // Restore original functions
    (global as any).getTypeclassInstance = originalGetTypeclassInstance;
    (global as any).getDerivableInstances = originalGetDerivableInstances;
    (global as any).getFPRegistry = originalGetFPRegistry;
  });

  describe('Typeclass Capability Detection', () => {
    it('should detect all available typeclass capabilities for MockMaybe', () => {
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      expect(capabilities.Functor).toBe(true);
      expect(capabilities.Monad).toBe(true);
      expect(capabilities.Applicative).toBe(true);
      expect(capabilities.Bifunctor).toBe(false);
      expect(capabilities.Filterable).toBe(true);
      expect(capabilities.Traversable).toBe(true);
      expect(capabilities.Eq).toBe(true);
      expect(capabilities.Ord).toBe(true);
      expect(capabilities.Show).toBe(true);
    });

    it('should detect Bifunctor capability for MockEither', () => {
      const capabilities = detectTypeclassCapabilities('MockEither');
      
      expect(capabilities.Functor).toBe(true);
      expect(capabilities.Monad).toBe(true);
      expect(capabilities.Bifunctor).toBe(true);
      expect(capabilities.Filterable).toBe(false);
      expect(capabilities.Traversable).toBe(false);
    });
  });

  describe('Typeclass-Aware Fluent Methods', () => {
    it('should create fluent methods only for available typeclasses', () => {
      const maybe = MockMaybe.of(42);
      const capabilities: TypeclassCapabilities = {
        Functor: true,
        Monad: true,
        Applicative: false,
        Bifunctor: false,
        Traversable: false,
        Filterable: false,
        Eq: true,
        Ord: false,
        Show: true
      };

      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);

      // Should have Functor methods
      expect(typeof fluent.map).toBe('function');
      
      // Should have Monad methods
      expect(typeof fluent.chain).toBe('function');
      expect(typeof fluent.flatMap).toBe('function');
      
      // Should NOT have Applicative methods
      expect(fluent.ap).toBeUndefined();
      
      // Should have Eq methods
      expect(typeof fluent.equals).toBe('function');
      
      // Should have Show methods
      expect(typeof fluent.show).toBe('function');
      
      // Should NOT have Ord methods
      expect(fluent.compare).toBeUndefined();
    });

    it('should support method chaining with preserved typeclass capabilities', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      // Chain should return a fluent object with the same capabilities
      const chained = fluent.map((x: number) => x * 2);
      
      expect(typeof chained.map).toBe('function');
      expect(typeof chained.chain).toBe('function');
      expect(typeof chained.filter).toBe('function');
      expect(typeof chained.equals).toBe('function');
      expect(typeof chained.show).toBe('function');
      
      // Should be able to continue chaining
      const result = chained
        .map((x: number) => x + 1)
        .filter((x: number) => x > 80)
        .chain((x: number) => MockMaybe.of(x.toString()));
      
      expect(result.getValue()).toBe('85');
    });

    it('should support cross-typeclass chaining', () => {
      const either = MockEither.right(42);
      const capabilities = detectTypeclassCapabilities('MockEither');
      
      const fluent = addTypeclassAwareFluentMethods(either, 'MockEither', capabilities);
      
      // Start with Functor, then use Bifunctor methods
      const result = fluent
        .map((x: number) => x * 2)
        .bimap(
          (l: any) => l,
          (r: number) => r + 1
        );
      
      expect(result.getRight()).toBe(85);
    });
  });

  describe('Conditional Types and Type Safety', () => {
    it('should enforce type safety for conditional method access', () => {
      // This test demonstrates compile-time type safety
      // The TypeScript compiler should prevent access to methods that don't exist
      
      const maybe = MockMaybe.of(42);
      const capabilities: TypeclassCapabilities = {
        Functor: true,
        Monad: false,
        Applicative: false,
        Bifunctor: false,
        Traversable: false,
        Filterable: false,
        Eq: false,
        Ord: false,
        Show: false
      };

      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      // Should have map (Functor)
      expect(typeof fluent.map).toBe('function');
      
      // Should NOT have chain (Monad)
      expect(fluent.chain).toBeUndefined();
      
      // Should NOT have bimap (Bifunctor)
      expect(fluent.bimap).toBeUndefined();
    });

    it('should support conditional type inference', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      // Type should be inferred correctly based on capabilities
      type FluentType = typeof fluent;
      
      // These should be true if the type system is working correctly
      expect(fluent.map).toBeDefined();
      expect(fluent.chain).toBeDefined();
      expect(fluent.filter).toBeDefined();
      expect(fluent.equals).toBeDefined();
      expect(fluent.show).toBeDefined();
    });
  });

  describe('TypeclassAwareComposition Utilities', () => {
    it('should support fluent composition with type safety', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      const double = (x: number) => addTypeclassAwareFluentMethods(
        MockMaybe.of(x * 2), 'MockMaybe', capabilities
      );
      
      const addOne = (x: number) => addTypeclassAwareFluentMethods(
        MockMaybe.of(x + 1), 'MockMaybe', capabilities
      );
      
      const composed = TypeclassAwareComposition.compose(double, addOne);
      const result = composed(42);
      
      expect(result.getValue()).toBe(85);
    });

    it('should support pipe operations with type safety', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const double = (x: number) => addTypeclassAwareFluentMethods(
        MockMaybe.of(x * 2), 'MockMaybe', capabilities
      );
      
      const addOne = (x: number) => addTypeclassAwareFluentMethods(
        MockMaybe.of(x + 1), 'MockMaybe', capabilities
      );
      
      const result = TypeclassAwareComposition.pipe(
        maybe,
        (m) => m.map((x: number) => x * 2),
        (m) => m.chain((x: number) => MockMaybe.of(x + 1))
      );
      
      expect(result.getValue()).toBe(85);
    });

    it('should support capability checking', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      expect(TypeclassAwareComposition.hasCapability(fluent, 'Functor')).toBe(true);
      expect(TypeclassAwareComposition.hasCapability(fluent, 'Monad')).toBe(true);
      expect(TypeclassAwareComposition.hasCapability(fluent, 'Bifunctor')).toBe(false);
    });

    it('should support safe method access', () => {
      const maybe = MockMaybe.of(42);
      const capabilities: TypeclassCapabilities = {
        Functor: true,
        Monad: false,
        Applicative: false,
        Bifunctor: false,
        Traversable: false,
        Filterable: false,
        Eq: false,
        Ord: false,
        Show: false
      };
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      const mapMethod = TypeclassAwareComposition.safeAccess(fluent, 'map');
      const chainMethod = TypeclassAwareComposition.safeAccess(fluent, 'chain', null);
      
      expect(typeof mapMethod).toBe('function');
      expect(chainMethod).toBe(null);
    });
  });

  describe('Zero Runtime Overhead', () => {
    it('should not add runtime overhead for method filtering', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const startTime = performance.now();
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      const endTime = performance.now();
      
      // Method filtering should be compile-time only
      const overhead = endTime - startTime;
      expect(overhead).toBeLessThan(1); // Should be very fast
      
      // All methods should be available at runtime
      expect(typeof fluent.map).toBe('function');
      expect(typeof fluent.chain).toBe('function');
      expect(typeof fluent.filter).toBe('function');
    });

    it('should maintain performance with method chaining', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      const startTime = performance.now();
      
      // Perform a long chain
      let result = fluent;
      for (let i = 0; i < 1000; i++) {
        result = result.map((x: number) => x + 1);
      }
      
      const endTime = performance.now();
      const chainTime = endTime - startTime;
      
      expect(chainTime).toBeLessThan(10); // Should be very fast
      expect(result.getValue()).toBe(1042);
    });
  });

  describe('Cross-Typeclass Chaining', () => {
    it('should support starting with Functor and using Bifunctor', () => {
      const either = MockEither.right(42);
      const capabilities = detectTypeclassCapabilities('MockEither');
      
      const fluent = addTypeclassAwareFluentMethods(either, 'MockEither', capabilities);
      
      // Start with Functor method
      const result = fluent
        .map((x: number) => x * 2)
        .bimap(
          (l: any) => l,
          (r: number) => r + 1
        );
      
      expect(result.getRight()).toBe(85);
    });

    it('should support starting with Monad and using Applicative', () => {
      const maybe = MockMaybe.of(42);
      const capabilities = detectTypeclassCapabilities('MockMaybe');
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      const result = fluent
        .chain((x: number) => MockMaybe.of(x * 2))
        .ap(MockMaybe.of((x: number) => x + 1));
      
      expect(result.getValue()).toBe(85);
    });

    it('should prevent illegal method access', () => {
      const maybe = MockMaybe.of(42);
      const capabilities: TypeclassCapabilities = {
        Functor: true,
        Monad: false,
        Applicative: false,
        Bifunctor: false,
        Traversable: false,
        Filterable: false,
        Eq: false,
        Ord: false,
        Show: false
      };
      
      const fluent = addTypeclassAwareFluentMethods(maybe, 'MockMaybe', capabilities);
      
      // Should have Functor methods
      expect(typeof fluent.map).toBe('function');
      
      // Should NOT have Monad methods
      expect(fluent.chain).toBeUndefined();
      expect(fluent.flatMap).toBeUndefined();
      
      // Should NOT have Bifunctor methods
      expect(fluent.bimap).toBeUndefined();
      expect(fluent.mapLeft).toBeUndefined();
      expect(fluent.mapRight).toBeUndefined();
    });
  });

  describe('Convenience Functions', () => {
    it('should create typeclass-aware fluent methods automatically', () => {
      const maybe = MockMaybe.of(42);
      
      const fluent = createTypeclassAwareFluent(maybe, 'MockMaybe');
      
      // Should have all available methods based on detected capabilities
      expect(typeof fluent.map).toBe('function');
      expect(typeof fluent.chain).toBe('function');
      expect(typeof fluent.filter).toBe('function');
      expect(typeof fluent.equals).toBe('function');
      expect(typeof fluent.show).toBe('function');
      
      // Should support chaining
      const result = fluent
        .map((x: number) => x * 2)
        .chain((x: number) => MockMaybe.of(x + 1));
      
      expect(result.getValue()).toBe(85);
    });
  });
});
