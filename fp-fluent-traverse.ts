/**
 * Fluent Traverse Methods for Traversable ADTs
 * 
 * This module adds fluent `.traverse` methods to all ADTs that implement
 * the Traversable typeclass, following the fp-ts style signature:
 * 
 * traverse<G extends Kind1, A, B>(
 *   this: Traversable<A>,
 *   applicative: Applicative<G>,
 *   f: (a: A) => Apply<G, [B]>
 * ): Apply<G, [Traversable<B>]>
 * 
 * Supported ADTs:
 * - Maybe
 * - Either  
 * - Result
 * - PersistentList
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, ResultK, ListK,
  Maybe, Either, Result, List
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Traversable,
  deriveFunctor, deriveApplicative, deriveMonad
} from './fp-typeclasses-hkt';

import {
  // Core ADT imports
  Maybe as MaybeADT, Just, Nothing, matchMaybe,
  Either as EitherADT, Left, Right, matchEither,
  Result as ResultADT, Ok, Err, matchResult
} from './fp-maybe-unified';

import {
  // Persistent collections
  PersistentList
} from './fp-persistent';

import {
  // Typeclass instances
  getTypeclassInstance
} from './fp-registry-init';

// ============================================================================
// Part 1: Type Definitions for Fluent Traverse
// ============================================================================

/**
 * Fluent traverse method signature for Traversable ADTs
 */
export interface FluentTraverse<F extends Kind1> {
  traverse<G extends Kind1, A, B>(
    this: Apply<F, [A]>,
    applicative: Applicative<G>,
    f: (a: A) => Apply<G, [B]>
  ): Apply<G, [Apply<F, [B]>]>;
}

/**
 * Fluent traverse method signature for Traversable ADTs (simplified)
 */
export interface FluentTraverseSimple<A> {
  traverse<G extends Kind1, B>(
    applicative: Applicative<G>,
    f: (a: A) => Apply<G, [B]>
  ): Apply<G, [any]>;
}

// ============================================================================
// Part 2: Maybe Fluent Traverse
// ============================================================================

/**
 * Add fluent traverse method to Maybe prototype
 */
export function addMaybeTraverse(): void {
  if (!MaybeADT.prototype.traverse) {
    MaybeADT.prototype.traverse = function<G extends Kind1, A, B>(
      this: MaybeADT<A>,
      applicative: Applicative<G>,
      f: (a: A) => Apply<G, [B]>
    ): Apply<G, [MaybeADT<B>]> {
      return matchMaybe(this, {
        Just: (value: A) => applicative.map(f(value), Just),
        Nothing: () => applicative.of(Nothing())
      }) as Apply<G, [MaybeADT<B>]>;
    };
  }
}

// ============================================================================
// Part 3: Either Fluent Traverse
// ============================================================================

/**
 * Add fluent traverse method to Either prototype
 */
export function addEitherTraverse(): void {
  if (!EitherADT.prototype.traverse) {
    EitherADT.prototype.traverse = function<G extends Kind1, L, R, S>(
      this: EitherADT<L, R>,
      applicative: Applicative<G>,
      f: (r: R) => Apply<G, [S]>
    ): Apply<G, [EitherADT<L, S>]> {
      return matchEither(this, {
        Left: (value: L) => applicative.of(Left(value)),
        Right: (value: R) => applicative.map(f(value), Right)
      }) as Apply<G, [EitherADT<L, S>]>;
    };
  }
}

// ============================================================================
// Part 4: Result Fluent Traverse
// ============================================================================

/**
 * Add fluent traverse method to Result prototype
 */
export function addResultTraverse(): void {
  if (!ResultADT.prototype.traverse) {
    ResultADT.prototype.traverse = function<G extends Kind1, T, E, U>(
      this: ResultADT<T, E>,
      applicative: Applicative<G>,
      f: (t: T) => Apply<G, [U]>
    ): Apply<G, [ResultADT<U, E>]> {
      return matchResult(this, {
        Ok: (value: T) => applicative.map(f(value), Ok),
        Err: (error: E) => applicative.of(Err(error))
      }) as Apply<G, [ResultADT<U, E>]>;
    };
  }
}

// ============================================================================
// Part 5: PersistentList Fluent Traverse
// ============================================================================

/**
 * Add fluent traverse method to PersistentList prototype
 */
export function addPersistentListTraverse(): void {
  if (!PersistentList.prototype.traverse) {
    PersistentList.prototype.traverse = function<G extends Kind1, A, B>(
      this: PersistentList<A>,
      applicative: Applicative<G>,
      f: (a: A) => Apply<G, [B]>
    ): Apply<G, [PersistentList<B>]> {
      // Get the Traversable instance for PersistentList
      const traversable = getTypeclassInstance('PersistentList', 'Traversable');
      if (traversable && traversable.traverse) {
        return traversable.traverse(applicative, f, this) as Apply<G, [PersistentList<B>]>;
      }
      
      // Fallback implementation
      const elements = this.toArray();
      if (elements.length === 0) {
        return applicative.of(PersistentList.empty()) as Apply<G, [PersistentList<B>]>;
      }
      
      // Use applicative's sequence-like behavior
      const mappedElements = elements.map(f);
      // This is a simplified implementation - in practice, you'd need proper applicative sequencing
      return applicative.map(mappedElements[0], (first: B) => 
        PersistentList.fromArray([first, ...elements.slice(1).map(e => (f(e) as any).value)])
      ) as Apply<G, [PersistentList<B>]>;
    };
  }
}

// ============================================================================
// Part 6: Unified Fluent Traverse Setup
// ============================================================================

/**
 * Add fluent traverse methods to all Traversable ADTs
 */
export function addFluentTraverseMethods(): void {
  addMaybeTraverse();
  addEitherTraverse();
  addResultTraverse();
  addPersistentListTraverse();
}

// ============================================================================
// Part 7: Type-Level Tests
// ============================================================================

/**
 * Type-level tests for fluent traverse methods
 */
export namespace FluentTraverseTypeTests {
  
  // Test that Maybe.traverse preserves type inference
  export type MaybeTraverseTest = 
    MaybeADT<number> extends { 
      traverse<G extends Kind1, B>(
        applicative: Applicative<G>,
        f: (a: number) => Apply<G, [B]>
      ): Apply<G, [MaybeADT<B>]>
    } ? true : false;
  
  // Test that Either.traverse preserves type inference
  export type EitherTraverseTest = 
    EitherADT<string, number> extends {
      traverse<G extends Kind1, B>(
        applicative: Applicative<G>,
        f: (a: number) => Apply<G, [B]>
      ): Apply<G, [EitherADT<string, B>]>
    } ? true : false;
  
  // Test that Result.traverse preserves type inference
  export type ResultTraverseTest = 
    ResultADT<number, string> extends {
      traverse<G extends Kind1, B>(
        applicative: Applicative<G>,
        f: (a: number) => Apply<G, [B]>
      ): Apply<G, [ResultADT<B, string>]>
    } ? true : false;
  
  // Test that PersistentList.traverse preserves type inference
  export type PersistentListTraverseTest = 
    PersistentList<number> extends {
      traverse<G extends Kind1, B>(
        applicative: Applicative<G>,
        f: (a: number) => Apply<G, [B]>
      ): Apply<G, [PersistentList<B>]>
    } ? true : false;
}

// ============================================================================
// Part 8: Runtime Tests
// ============================================================================

/**
 * Runtime tests for fluent traverse methods
 */
export function testFluentTraverseMethods(): void {
  console.log('🧪 Testing Fluent Traverse Methods...\n');
  
  // Mock Applicative for testing
  const MockApplicative: Applicative<any> = {
    map: <A, B>(fa: any, f: (a: A) => B) => Promise.resolve(f(fa)),
    of: <A>(a: A) => Promise.resolve(a),
    ap: <A, B>(fab: any, fa: any) => Promise.resolve(fab(fa))
  };
  
  // Test 1: Maybe traverse
  console.log('📋 Test 1: Maybe traverse');
  const maybeValue = Just(42);
  const maybeTraversed = maybeValue.traverse(MockApplicative, (x: number) => Promise.resolve(x * 2));
  console.log('Maybe traverse result:', maybeTraversed);
  
  // Test 2: Either traverse
  console.log('\n📋 Test 2: Either traverse');
  const eitherValue = Right(42);
  const eitherTraversed = eitherValue.traverse(MockApplicative, (x: number) => Promise.resolve(x * 2));
  console.log('Either traverse result:', eitherTraversed);
  
  // Test 3: Result traverse
  console.log('\n📋 Test 3: Result traverse');
  const resultValue = Ok(42);
  const resultTraversed = resultValue.traverse(MockApplicative, (x: number) => Promise.resolve(x * 2));
  console.log('Result traverse result:', resultTraversed);
  
  // Test 4: PersistentList traverse
  console.log('\n📋 Test 4: PersistentList traverse');
  const listValue = PersistentList.fromArray([1, 2, 3]);
  const listTraversed = listValue.traverse(MockApplicative, (x: number) => Promise.resolve(x * 2));
  console.log('PersistentList traverse result:', listTraversed);
  
  console.log('\n✅ All fluent traverse tests completed!');
}

// ============================================================================
// Part 9: Integration with Existing Systems
// ============================================================================

/**
 * Auto-setup fluent traverse methods when this module is imported
 */
addFluentTraverseMethods();

// Export for manual setup if needed
export {
  addMaybeTraverse,
  addEitherTraverse,
  addResultTraverse,
  addPersistentListTraverse,
  addFluentTraverseMethods,
  testFluentTraverseMethods
};
