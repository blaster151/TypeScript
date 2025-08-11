/**
 * Optics Foundations with Profunctor Support
 * 
 * This module provides a minimal but extensible optics system (Lens, Prism, Traversal)
 * built directly on the Profunctor machinery, integrating seamlessly with HKT + purity system.
 * 
 * Features:
 * - Core optic types using Profunctor signatures
 * - Minimal supporting Profunctor variants (Choice, Traversing)
 * - Lens, Prism, and Traversal utilities
 * - HKT + Purity integration
 * - Law-compliant implementations
 * - Seamless integration with existing ADTs
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe, Either, List, Reader, Writer, State
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

import {
  // Unified ADT imports
  MaybeUnified, Maybe, MaybeK as MaybeHKT, Just, Nothing, matchMaybe,
  EitherUnified, Either, EitherK as EitherHKT, Left, Right, matchEither,
  ResultUnified, Result, ResultK as ResultHKT, Ok, Err, matchResult
} from './fp-maybe-unified';

// ============================================================================
// Part 1: Optic Core Types
// ============================================================================

/**
 * General Optic — wraps a Profunctor transformation
 * An optic is a function that transforms a profunctor from A->B to S->T
 */
export type Optic<P, S, T, A, B> = (pab: Apply<P, [A, B]>) => Apply<P, [S, T]>;

/**
 * Lens — focus on a single field (always present)
 * A lens focuses on a part of a structure that always exists
 */
export type Lens<S, T, A, B> = Optic<Profunctor<any>, S, T, A, B>;

/**
 * Prism — focus on an optional branch of a sum type
 * A prism focuses on a part of a structure that may not exist
 */
export type Prism<S, T, A, B> = Optic<Choice<any>, S, T, A, B>;

/**
 * Traversal — focus on zero or more elements
 * A traversal focuses on multiple parts of a structure
 */
export type Traversal<S, T, A, B> = Optic<Traversing<any>, S, T, A, B>;

/**
 * Optional — focus on a part that may or may not exist
 * An optional is like a lens that may fail to focus
 */
export type Optional<S, T, A, B> = Optic<Profunctor<any>, S, T, A, B>;

/**
 * Iso — isomorphism between two types
 * An iso represents a bidirectional transformation
 */
export type Iso<S, T, A, B> = Optic<Profunctor<any>, S, T, A, B>;

/**
 * Getter — read-only access to a part of a structure
 * A getter can only read, not modify
 */
export type Getter<S, A> = Optic<Profunctor<any>, S, S, A, A>;

/**
 * Setter — write-only access to a part of a structure
 * A setter can only write, not read
 */
export type Setter<S, T, A, B> = Optic<Profunctor<any>, S, T, A, B>;

// ============================================================================
// Cross-Kind Composition Types
// ============================================================================

/**
 * Type aliases for cross-kind composition
 */
export type AnyLens<S, T, A, B> = Lens<S, T, A, B>;
export type AnyPrism<S, T, A, B> = Prism<S, T, A, B>;
export type AnyOptional<S, T, A, B> = Optional<S, T, A, B>;

/**
 * Union type for all optic kinds to enable cross-kind composition
 */
export type AnyOptic<S, T, A, B> =
  | AnyLens<S, T, A, B>
  | AnyPrism<S, T, A, B>
  | AnyOptional<S, T, A, B>;

// ============================================================================
// Part 2: Supporting Profunctor Variants
// ============================================================================

/**
 * Choice - extends Profunctor with choice operations
 * Used for Prisms and other optic types that need to handle sum types
 */
export interface Choice<P extends Kind2> extends Profunctor<P> {
  left<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
  right<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [Either<C, A>, Either<C, B>]>;
}

/**
 * Traversing - extends Profunctor with traversal operations
 * Used for Traversals and other optic types that need to handle multiple elements
 */
export interface Traversing<P extends Kind2> extends Profunctor<P> {
  traverse<A, B, F extends Kind1>(
    app: Applicative<F>,
    pab: Apply<P, [A, B]>,
    fa: Apply<F, [A]>
  ): Apply<F, [Apply<P, [A, B]>]>;
}

/**
 * Strong - extends Profunctor with strength operations
 * Used for Lenses and other optic types that need to handle product types
 */
export interface Strong<P extends Kind2> extends Profunctor<P> {
  first<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
  second<A, B, C>(p: Apply<P, [A, B]>): Apply<P, [[C, A], [C, B]]>;
}

// ============================================================================
// Part 3: Profunctor Identity Instances
// ============================================================================

/**
 * Identity Profunctor - represents the identity transformation
 */
export interface IdentityProfunctor extends Profunctor<FunctionK> {
  dimap<A, B, C, D>(
    p: (a: A) => B,
    f: (c: C) => A,
    g: (b: B) => D
  ): (c: C) => D;
  
  lmap<A, B, C>(p: (a: A) => B, f: (c: C) => A): (c: C) => B;
  
  rmap<A, B, D>(p: (a: A) => B, g: (b: B) => D): (a: A) => D;
}

/**
 * Identity Choice - extends IdentityProfunctor with choice operations
 */
export interface IdentityChoice extends Choice<FunctionK>, IdentityProfunctor {
  left<A, B, C>(p: (a: A) => B): (e: Either<A, C>) => Either<B, C>;
  right<A, B, C>(p: (a: A) => B): (e: Either<C, A>) => Either<C, B>;
}

/**
 * Identity Traversing - extends IdentityProfunctor with traversal operations
 */
export interface IdentityTraversing extends Traversing<FunctionK>, IdentityProfunctor {
  traverse<A, B, F extends Kind1>(
    app: Applicative<F>,
    pab: (a: A) => B,
    fa: Apply<F, [A]>
  ): Apply<F, [(a: A) => B]>;
}

/**
 * Identity Strong - extends IdentityProfunctor with strength operations
 */
export interface IdentityStrong extends Strong<FunctionK>, IdentityProfunctor {
  first<A, B, C>(p: (a: A) => B): (pair: [A, C]) => [B, C];
  second<A, B, C>(p: (a: A) => B): (pair: [C, A]) => [C, B];
}

// ============================================================================
// Part 4: Lens Utilities
// ============================================================================

/**
 * Create a lens from a getter and setter function
 * @param getter - Function to extract the focused part
 * @param setter - Function to update the focused part
 * @returns A lens that can view, set, and modify the focused part
 */
export function lens<S, T, A, B>(
  getter: (s: S) => A,
  setter: (s: S, b: B) => T
): Lens<S, T, A, B> {
  return (pab: Apply<Profunctor<any>, [A, B]>) => {
    // Simplified implementation - in practice, we'd use the actual Profunctor instance
    return (s: S) => {
      const a = getter(s);
      const b = (pab as any)(a);
      return setter(s, b);
    };
  };
}

/**
 * View the focused part of a structure through a lens
 * @param ln - The lens to use
 * @param s - The structure to view
 * @returns The focused part
 */
export function view<S, A>(ln: Lens<S, S, A, A>, s: S): A {
  // Simplified implementation using Const functor
  const constFunctor = {
    map: <A, B>(fa: A, f: (a: A) => B): A => fa
  };
  
  const constOptic = ln({ map: constFunctor.map } as any);
  return (constOptic as any)(s);
}

/**
 * Set the focused part of a structure through a lens
 * @param ln - The lens to use
 * @param b - The new value to set
 * @param s - The structure to modify
 * @returns The modified structure
 */
export function set<S, T, A, B>(ln: Lens<S, T, A, B>, b: B, s: S): T {
  const constOptic = ln((a: A) => b as any);
  return (constOptic as any)(s);
}

/**
 * Modify the focused part of a structure through a lens
 * @param ln - The lens to use
 * @param f - The function to apply to the focused part
 * @param s - The structure to modify
 * @returns The modified structure
 */
export function over<S, T, A, B>(ln: Lens<S, T, A, B>, f: (a: A) => B, s: S): T {
  const constOptic = ln(f as Function);
  return (constOptic as Function)(s);
}

// ============================================================================
// Part 5: Prism Utilities
// ============================================================================

/**
 * Create a prism from a match and build function
 * @param match - Function to match the focused part (returns Either<A, S>)
 * @param build - Function to build the structure from the focused part
 * @returns A prism that can preview, review, and modify the focused part
 */
export function prism<S, T, A, B>(
  match: (s: S) => Either<A, T>,
  build: (b: B) => T
): Prism<S, T, A, B> {
  return (pab: Apply<Choice<any>, [A, B]>) => {
    // Simplified implementation
    return (s: S) => {
      const matchResult = match(s);
      if ('left' in matchResult) {
        const a = matchResult.left;
        const b = (pab as Function)(a);
        return build(b);
      } else {
        return matchResult.right;
      }
    };
  };
}

/**
 * Preview the focused part of a structure through a prism
 * @param pr - The prism to use
 * @param s - The structure to preview
 * @returns Maybe<A> - the focused part if it exists
 */
export function preview<S, A>(pr: Prism<S, S, A, A>, s: S): Maybe<A> {
  // Simplified implementation
  const matchOptic = pr((a: A) => Just(a) as Maybe<A>);
  const result = (matchOptic as Function)(s);
  return result;
}

/**
 * Review the structure from the focused part through a prism
 * @param pr - The prism to use
 * @param b - The focused part to build from
 * @returns The complete structure
 */
export function review<S, T, A, B>(pr: Prism<S, T, A, B>, b: B): T {
  const buildOptic = pr((a: A) => b as B);
  return (buildOptic as Function)(undefined as S);
}

/**
 * Check if a prism matches the focused part
 * @param pr - The prism to use
 * @param s - The structure to check
 * @returns True if the prism matches
 */
export function isMatching<S, A>(pr: Prism<S, S, A, A>, s: S): boolean {
  const previewResult = preview(pr, s);
  return isJust(previewResult);
}

// ============================================================================
// Part 6: Optional Utilities
// ============================================================================

/**
 * Create an optional from a getter and setter function
 * An optional is like a lens that may fail to focus
 * @param getOption - Function to extract the focused part (may return Nothing)
 * @param set - Function to update the focused part
 * @returns An optional that can preview, set, and modify the focused part
 */
export function optional<S, T, A, B>(
  getOption: (s: S) => Maybe<A>,
  set: (s: S, b: B) => T
): Optional<S, T, A, B> {
  return (pab: Apply<Profunctor<any>, [A, B]>) => {
    // Simplified implementation - in practice, we'd use the actual Profunctor instance
    return (s: S) => {
      const maybeA = getOption(s);
      if (maybeA.isJust) {
        const a = maybeA.value;
        const b = (pab as any)(a);
        return set(s, b);
      }
      return s as any;
    };
  };
}

/**
 * Get the focused part of a structure through an optional
 * @param opt - The optional to use
 * @param s - The structure to preview
 * @returns Maybe<A> - Just if the optional focuses, Nothing otherwise
 */
export function getOption<S, A>(opt: Optional<S, S, A, A>, s: S): Maybe<A> {
  // Simplified implementation for the profunctor-based optional
  // In practice, we'd use a more sophisticated approach
  return opt((a: A) => a)(s) as any;
}

/**
 * Set the focused part of a structure through an optional
 * @param opt - The optional to use
 * @param b - The new value
 * @param s - The structure to modify
 * @returns The modified structure
 */
export function setOption<S, T, A, B>(opt: Optional<S, T, A, B>, b: B, s: S): T {
  return opt(() => b)(s) as any;
}

/**
 * Modify the focused part of a structure through an optional
 * @param opt - The optional to use
 * @param f - The function to apply
 * @param s - The structure to modify
 * @returns The modified structure
 */
export function modifyOption<S, T, A, B>(opt: Optional<S, T, A, B>, f: (a: A) => B, s: S): T {
  return opt(f)(s) as any;
}

// ============================================================================
// Part 6: Enhanced Traversal Interface and Utilities
// ============================================================================

/**
 * Enhanced Traversal interface with chainable and terminal operations
 */
export interface EnhancedTraversal<S, T, A, B> extends Traversal<S, T, A, B> {
  // Chainable operations (return new Traversal)
  take(count: number): EnhancedTraversal<S, T, A, B>;
  drop(count: number): EnhancedTraversal<S, T, A, B>;
  slice(start: number, end?: number): EnhancedTraversal<S, T, A, B>;
  reverse(): EnhancedTraversal<S, T, A, B>;
  filter(predicate: (a: A) => boolean): EnhancedTraversal<S, T, A, B>;
  sortBy(fn: (a: A) => any): EnhancedTraversal<S, T, A, B>;
  distinct(): EnhancedTraversal<S, T, A, B>;
  
  // Terminal fold operations (return concrete values)
  reduce<R>(reducer: (acc: R, a: A) => R, initial: R): (source: S) => R;
  foldMap<M>(monoid: Monoid<M>, fn: (a: A) => M): (source: S) => M;
  all(predicate: (a: A) => boolean): (source: S) => boolean;
  any(predicate: (a: A) => boolean): (source: S) => boolean;
  
  // Composition
  then<C, D>(next: Lens<A, B, C, D> | Prism<A, B, C, D> | Optional<A, B, C, D> | Traversal<A, B, C, D>): EnhancedTraversal<S, T, C, D>;
}

/**
 * Monoid interface for fold operations
 */
export interface Monoid<A> {
  empty(): A;
  concat(a: A, b: A): A;
}

// ============================================================================
// Part 7: Traversal Utility Functions
// ============================================================================

/**
 * Create a traversal from a traverse function
 */
export function traversal<S, T, A, B>(
  traverse: (f: (a: A) => B, s: S) => T
): Traversal<S, T, A, B> {
  return (pab: Apply<Traversing<any>, [A, B]>) => {
    // Simplified implementation
    return (s: S) => {
      return traverse((a: A) => (pab as any)(a), s);
    };
  };
}

/**
 * Create a traversal that takes only the first n elements
 */
export function takeTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  count: number
): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>((f, s) => {
    // Simplified implementation that works with current traversal structure
    const elements: A[] = [];
    t((a: A) => {
      elements.push(a);
      return a;
    })(s);
    
    // Apply function only to first count elements
    return t((a: A, index: number) => {
      return index < count ? f(a) : a;
    })(s);
  });
}

/**
 * Create a traversal that drops the first n elements
 */
export function dropTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  count: number
): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>((f, s) => {
    // Simplified implementation
    const elements: A[] = [];
    t((a: A) => {
      elements.push(a);
      return a;
    })(s);
    
    // Apply function only to elements after count
    return t((a: A, index: number) => {
      return index >= count ? f(a) : a;
    })(s);
  });
}

/**
 * Create a traversal that slices elements by range
 */
export function sliceTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  start: number,
  end?: number
): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>((f, s) => {
    // Simplified implementation
    const elements: A[] = [];
    t((a: A) => {
      elements.push(a);
      return a;
    })(s);
    
    // Apply function only to elements in range
    return t((a: A, index: number) => {
      const inRange = index >= start && (end === undefined || index < end);
      return inRange ? f(a) : a;
    })(s);
  });
}

/**
 * Create a traversal that reverses element order
 */
export function reverseTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>
): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>((f, s) => {
    // Simplified implementation
    const elements: A[] = [];
    t((a: A) => {
      elements.push(a);
      return a;
    })(s);
    
    // Apply function in reverse order
    let reverseIndex = elements.length - 1;
    return t((a: A) => {
      const result = reverseIndex >= 0 ? f(elements[reverseIndex]) : a;
      reverseIndex--;
      return result;
    })(s);
  });
}

/**
 * Create a traversal that filters elements by predicate
 */
export function filterTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  predicate: (a: A) => boolean
): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>((f, s) => {
    return t((a: A) => predicate(a) ? f(a) : a)(s);
  });
}

/**
 * Create a traversal that sorts elements by projection
 */
export function sortByTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  fn: (a: A) => any
): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>((f, s) => {
    // Simplified implementation
    const elements: Array<{ value: A; sortKey: any }> = [];
    t((a: A) => {
      elements.push({ value: a, sortKey: fn(a) });
      return a;
    })(s);
    
    // Sort by sort key
    elements.sort((a, b) => {
      if (a.sortKey < b.sortKey) return -1;
      if (a.sortKey > b.sortKey) return 1;
      return 0;
    });
    
    // Apply function to sorted elements
    let index = 0;
    return t((a: A) => {
      const result = index < elements.length ? f(elements[index].value) : a;
      index++;
      return result;
    })(s);
  });
}

/**
 * Create a traversal that removes duplicates
 */
export function distinctTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>
): Traversal<S, T, A, B> {
  return traversal<S, T, A, B>((f, s) => {
    // Simplified implementation
    const seen = new Set<any>();
    const uniqueElements: A[] = [];
    
    t((a: A) => {
      if (!seen.has(a)) {
        seen.add(a);
        uniqueElements.push(a);
      }
      return a;
    })(s);
    
    // Apply function to unique elements
    let index = 0;
    return t((a: A) => {
      const result = index < uniqueElements.length ? f(uniqueElements[index]) : a;
      index++;
      return result;
    })(s);
  });
}

// ============================================================================
// Part 8: Fold Utility Functions
// ============================================================================

/**
 * Reduce all visited elements using a reducer function
 */
export function reduceTraversal<S, T, A, B, R>(
  t: Traversal<S, T, A, B>,
  reducer: (acc: R, a: A) => R,
  initial: R,
  source: S
): R {
  const elements: A[] = [];
  t.modifyA(IdentityApplicative)((a) => {
    elements.push(a);
    return a;
  })(source);
  
  return elements.reduce(reducer, initial);
}

/**
 * Map each visited element to a monoid value and combine them
 */
export function foldMapTraversal<S, T, A, B, M>(
  t: Traversal<S, T, A, B>,
  monoid: Monoid<M>,
  fn: (a: A) => M,
  source: S
): M {
  const elements: A[] = [];
  t.modifyA(IdentityApplicative)((a) => {
    elements.push(a);
    return a;
  })(source);
  
  return elements.reduce((acc, a) => monoid.concat(acc, fn(a)), monoid.empty());
}

/**
 * Return true if all visited elements satisfy the predicate
 */
export function allTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  predicate: (a: A) => boolean,
  source: S
): boolean {
  const elements: A[] = [];
  t.modifyA(IdentityApplicative)((a) => {
    elements.push(a);
    return a;
  })(source);
  
  return elements.every(predicate);
}

/**
 * Return true if any visited element satisfies the predicate
 */
export function anyTraversal<S, T, A, B>(
  t: Traversal<S, T, A, B>,
  predicate: (a: A) => boolean,
  source: S
): boolean {
  const elements: A[] = [];
  t.modifyA(IdentityApplicative)((a) => {
    elements.push(a);
    return a;
  })(source);
  
  return elements.some(predicate);
}

// ============================================================================
// Part 9: Common Monoids
// ============================================================================

/**
 * Sum Monoid for numbers
 */
export const SumMonoid: Monoid<number> = {
  empty: () => 0,
  concat: (a, b) => a + b
};

/**
 * Product Monoid for numbers
 */
export const ProductMonoid: Monoid<number> = {
  empty: () => 1,
  concat: (a, b) => a * b
};

/**
 * String Monoid for string concatenation
 */
export const StringMonoid: Monoid<string> = {
  empty: () => '',
  concat: (a, b) => a + b
};

/**
 * Array Monoid for array concatenation
 */
export function ArrayMonoid<A>(): Monoid<A[]> {
  return {
    empty: () => [],
    concat: (a, b) => [...a, ...b]
  };
}

/**
 * Any Monoid for booleans (OR operation)
 */
export const AnyMonoid: Monoid<boolean> = {
  empty: () => false,
  concat: (a, b) => a || b
};

/**
 * All Monoid for booleans (AND operation)
 */
export const AllMonoid: Monoid<boolean> = {
  empty: () => true,
  concat: (a, b) => a && b
};

// ============================================================================
// Part 10: Enhanced Traversal Constructor
// ============================================================================

/**
 * Create an enhanced traversal with all chainable and terminal operations
 */
export function enhancedTraversal<S, T, A, B>(
  baseTraversal: Traversal<S, T, A, B>
): EnhancedTraversal<S, T, A, B> {
  const enhanced = baseTraversal as EnhancedTraversal<S, T, A, B>;
  
  // Chainable operations
  enhanced.take = (count: number) => enhancedTraversal(takeTraversal(enhanced, count));
  enhanced.drop = (count: number) => enhancedTraversal(dropTraversal(enhanced, count));
  enhanced.slice = (start: number, end?: number) => enhancedTraversal(sliceTraversal(enhanced, start, end));
  enhanced.reverse = () => enhancedTraversal(reverseTraversal(enhanced));
  enhanced.filter = (predicate: (a: A) => boolean) => enhancedTraversal(filterTraversal(enhanced, predicate));
  enhanced.sortBy = (fn: (a: A) => any) => enhancedTraversal(sortByTraversal(enhanced, fn));
  enhanced.distinct = () => enhancedTraversal(distinctTraversal(enhanced));
  
  // Terminal fold operations
  enhanced.reduce = <R>(reducer: (acc: R, a: A) => R, initial: R) => 
    (source: S) => reduceTraversal(enhanced, reducer, initial, source);
  
  enhanced.foldMap = <M>(monoid: Monoid<M>, fn: (a: A) => M) => 
    (source: S) => foldMapTraversal(enhanced, monoid, fn, source);
  
  enhanced.all = (predicate: (a: A) => boolean) => 
    (source: S) => allTraversal(enhanced, predicate, source);
  
  enhanced.any = (predicate: (a: A) => boolean) => 
    (source: S) => anyTraversal(enhanced, predicate, source);
  
  // Composition
  enhanced.then = <C, D>(next: Lens<A, B, C, D> | Prism<A, B, C, D> | Optional<A, B, C, D> | Traversal<A, B, C, D>) => {
    // Implementation would depend on the specific optic type
    // For now, return a basic composition
    return enhancedTraversal(compose(enhanced, next as any));
  };
  
  return enhanced;
}

// ============================================================================
// Part 11: Identity Applicative for Fold Operations
// ============================================================================

/**
 * Identity Applicative for collecting elements during fold operations
 */
const IdentityApplicative: Applicative<FunctionK> = {
  of: <A>(a: A) => a,
  ap: <A, B>(fab: (a: A) => B, fa: A) => fab(fa),
  map: <A, B>(f: (a: A) => B, fa: A) => f(fa)
};

// ============================================================================
// Part 12: Common Traversal Constructors
// ============================================================================

/**
 * Create a traversal that focuses on all elements of an array
 */
export function each<S extends any[], T extends any[], A, B>(): EnhancedTraversal<S, T, A, B> {
  return enhancedTraversal(traversal<S, T, A, B>((f, s) => {
    return s.map(f) as T;
  }));
}

/**
 * Create a traversal that focuses on all values of an object
 */
export function values<S extends Record<string, any>, T extends Record<string, any>, A, B>(): EnhancedTraversal<S, T, A, B> {
  return enhancedTraversal(traversal<S, T, A, B>((f, s) => {
    const result = { ...s };
    for (const key in result) {
      if (result.hasOwnProperty(key)) {
        result[key] = f(result[key]);
      }
    }
    return result as T;
  }));
}

/**
 * Create a traversal that focuses on all keys of an object
 */
export function keys<S extends Record<string, any>, T extends Record<string, any>, A, B>(): EnhancedTraversal<S, T, A, B> {
  return enhancedTraversal(traversal<S, T, A, B>((f, s) => {
    const result = { ...s };
    const objectKeys = Object.keys(s);
    for (let i = 0; i < objectKeys.length; i++) {
      const key = objectKeys[i];
      const newKey = f(key as A);
      if (newKey !== key) {
        result[newKey as string] = result[key];
        delete result[key];
      }
    }
    return result as T;
  }));
}

// ============================================================================
// Part 13: Common Lens Constructors
// ============================================================================

/**
 * Create a lens for an object property
 * @param key - The property key
 * @returns A lens that focuses on the specified property
 */
export function prop<K extends string>(key: K) {
  return <S extends Record<K, any>, T extends Record<K, any>, A, B>(): Lens<S, T, A, B> => {
    return lens(
      (s: S) => s[key] as A,
      (s: S, b: B) => ({ ...s, [key]: b }) as T
    );
  };
}

/**
 * Create a lens for an array element at a specific index
 * @param index - The array index
 * @returns A lens that focuses on the specified array element
 */
export function at(index: number) {
  return <S extends any[], T extends any[], A, B>(): Lens<S, T, A, B> => {
    return lens(
      (s: S) => s[index] as A,
      (s: S, b: B) => {
        const newArray = [...s];
        newArray[index] = b;
        return newArray as T;
      }
    );
  };
}

/**
 * Create a lens for the first element of an array
 * @returns A lens that focuses on the first array element
 */
export function head<S extends any[], T extends any[], A, B>(): Lens<S, T, A, B> {
  return at(0)<S, T, A, B>();
}

/**
 * Create a lens for the last element of an array
 * @returns A lens that focuses on the last array element
 */
export function last<S extends any[], T extends any[], A, B>(): Lens<S, T, A, B> {
  return lens(
    (s: S) => s[s.length - 1] as A,
    (s: S, b: B) => {
      const newArray = [...s];
      newArray[newArray.length - 1] = b;
      return newArray as T;
    }
  );
}

// ============================================================================
// Part 8: Common Prism Constructors
// ============================================================================

/**
 * Create a prism for the Just constructor of Maybe
 * @returns A prism that focuses on the Just value
 */
export function just<S extends Maybe<any>, T extends Maybe<any>, A, B>(): Prism<S, T, A, B> {
  return prism(
    (s: S) => {
      if (isJust(s)) {
        return Left(fromJust(s) as A);
      } else {
        return Right(s as T);
      }
    },
    (b: B) => Just(b) as T
  );
}

/**
 * Create a prism for the Right constructor of Either
 * @returns A prism that focuses on the Right value
 */
export function right<S extends Either<any, any>, T extends Either<any, any>, A, B>(): Prism<S, T, A, B> {
  return prism(
    (s: S) => {
      if ('right' in s) {
        return Left(s.right as A);
      } else {
        return Right(s as T);
      }
    },
    (b: B) => Right(b) as T
  );
}

/**
 * Create a prism for the Left constructor of Either
 * @returns A prism that focuses on the Left value
 */
export function left<S extends Either<any, any>, T extends Either<any, any>, A, B>(): Prism<S, T, A, B> {
  return prism(
    (s: S) => {
      if ('left' in s) {
        return Left(s.left as A);
      } else {
        return Right(s as T);
      }
    },
    (b: B) => Left(b) as T
  );
}

/**
 * Create a prism for the Ok constructor of Result
 * @returns A prism that focuses on the Ok value
 */
export function ok<S extends Result<any, any>, T extends Result<any, any>, A, B>(): Prism<S, T, A, B> {
  return prism(
    (s: S) => {
      if ('ok' in s) {
        return Left(s.ok as A);
      } else {
        return Right(s as T);
      }
    },
    (b: B) => Ok(b) as T
  );
}

/**
 * Create a prism for the Err constructor of Result
 * @returns A prism that focuses on the Err value
 */
export function err<S extends Result<any, any>, T extends Result<any, any>, A, B>(): Prism<S, T, A, B> {
  return prism(
    (s: S) => {
      if ('err' in s) {
        return Left(s.err as A);
      } else {
        return Right(s as T);
      }
    },
    (b: B) => Err(b) as T
  );
}

// ============================================================================
// Part 9: Common Traversal Constructors
// ============================================================================

/**
 * Create a traversal for all elements of an array
 * @returns A traversal that focuses on all array elements
 */
export function array<S extends any[], T extends any[], A, B>(): Traversal<S, T, A, B> {
  return traversal(
    (f: (a: A) => B, s: S) => s.map(f) as T
  );
}

/**
 * Create a traversal for all values of an object
 * @returns A traversal that focuses on all object values
 */
export function values<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal(
    (f: (a: A) => B, s: S) => {
      const result = {} as T;
      for (const key in s) {
        if (s.hasOwnProperty(key)) {
          result[key] = f(s[key]);
        }
      }
      return result;
    }
  );
}

/**
 * Create a traversal for all keys of an object
 * @returns A traversal that focuses on all object keys
 */
export function keys<S extends Record<string, any>, T extends Record<string, any>, A, B>(): Traversal<S, T, A, B> {
  return traversal(
    (f: (a: A) => B, s: S) => {
      const result = {} as T;
      for (const key in s) {
        if (s.hasOwnProperty(key)) {
          result[f(key as A)] = s[key];
        }
      }
      return result;
    }
  );
}

// ============================================================================
// Part 10: Optic Composition
// ============================================================================

/**
 * Compose two optics
 * @param outer - The outer optic
 * @param inner - The inner optic
 * @returns A composed optic
 */
export function compose<P1, P2, S, T, A, B, C, D>(
  outer: Optic<P1, S, T, A, B>,
  inner: Optic<P2, A, B, C, D>
): Optic<any, S, T, C, D> {
  return (pcd: Apply<any, [C, D]>) => {
    const pab = inner(pcd);
    return outer(pab);
  };
}

/**
 * Compose multiple optics
 * @param optics - Array of optics to compose
 * @returns A composed optic
 */
export function composeMany<P, S, T, A, B>(
  optics: Optic<P, any, any, any, any>[]
): Optic<P, S, T, A, B> {
  return optics.reduce((acc, optic) => compose(acc, optic)) as any;
}

// ============================================================================
// Part 11: HKT + Purity Integration
// ============================================================================

/**
 * HKT kind for optics
 */
export interface OpticK extends Kind2 {
  readonly type: Optic<any, this['arg0'], this['arg1'], any, any>;
}

/**
 * Type alias for optic with purity tracking
 */
export type OpticWithEffect<S, T, A, B, E extends EffectTag = 'Pure'> = 
  Optic<any, S, T, A, B> & { readonly __effect: E };

/**
 * Extract effect from optic
 */
export type EffectOfOptic<T> = T extends OpticWithEffect<any, any, any, any, infer E> ? E : 'Pure';

/**
 * Check if optic is pure
 */
export type IsOpticPure<T> = EffectOfOptic<T> extends 'Pure' ? true : false;

/**
 * Check if optic is impure
 */
export type IsOpticImpure<T> = EffectOfOptic<T> extends 'Pure' ? false : true;

// ============================================================================
// Part 12: Utility Functions
// ============================================================================

/**
 * Check if a value is a lens
 */
export function isLens<S, T, A, B>(value: any): value is Lens<S, T, A, B> {
  return value && typeof value.get === 'function' && typeof value.set === 'function';
}

/**
 * Check if a value is a prism
 */
export function isPrism<S, T, A, B>(value: any): value is Prism<S, T, A, B> {
  return value && typeof value.match === 'function' && typeof value.build === 'function';
}

/**
 * Check if a value is an optional
 */
export function isOptional<S, T, A, B>(value: any): value is Optional<S, T, A, B> {
  return value && typeof value.getOption === 'function' && typeof value.set === 'function';
}

/**
 * Check if a value is a traversal
 */
export function isTraversal<S, T, A, B>(value: any): value is Traversal<S, T, A, B> {
  return value && typeof value.traverse === 'function';
}

/**
 * Check if a value is an optic
 */
export function isOptic(value: any): value is Optic<any, any, any, any, any> {
  return typeof value === 'function' && value.length === 1;
}

/**
 * Create a simple getter function
 */
export function to<S, A>(getter: (s: S) => A): Getter<S, A> {
  return lens(getter, (s: S, a: A) => s) as any;
}

/**
 * Create a simple setter function
 */
export function sets<S, T, A, B>(setter: (f: (a: A) => B, s: S) => T): Setter<S, T, A, B> {
  return (pab: Apply<Profunctor<any>, [A, B]>) => {
    return (s: S) => setter((a: A) => (pab as any)(a), s);
  };
}

// ============================================================================
// Part 13: Export All
// ============================================================================

export {
  // Core optic types
  Optic,
  Lens,
  Prism,
  Traversal,
  Optional,
  Iso,
  Getter,
  Setter,
  
  // Enhanced Traversal interface
  EnhancedTraversal,
  Monoid,
  
  // Profunctor variants
  Choice,
  Traversing,
  Strong,
  
  // Identity instances
  IdentityProfunctor,
  IdentityChoice,
  IdentityTraversing,
  IdentityStrong,
  
  // Lens utilities
  lens,
  view,
  set,
  over,
  
  // Prism utilities
  prism,
  preview,
  review,
  isMatching,
  
  // Optional utilities
  optional,
  getOption,
  setOption,
  modifyOption,
  
  // Traversal utilities
  traversal,
  traverse,
  map,
  
  // Enhanced Traversal utilities
  enhancedTraversal,
  takeTraversal,
  dropTraversal,
  sliceTraversal,
  reverseTraversal,
  filterTraversal,
  sortByTraversal,
  distinctTraversal,
  
  // Fold utilities
  reduceTraversal,
  foldMapTraversal,
  allTraversal,
  anyTraversal,
  
  // Common Monoids
  SumMonoid,
  ProductMonoid,
  StringMonoid,
  ArrayMonoid,
  AnyMonoid,
  AllMonoid,
  
  // Common constructors
  prop,
  at,
  head,
  last,
  just,
  right,
  left,
  ok,
  err,
  array,
  values,
  keys,
  each,
  
  // Composition
  compose,
  composeMany,
  
  // HKT types
  OpticK,
  OpticWithEffect,
  EffectOfOptic,
  IsOpticPure,
  IsOpticImpure,
  
  // Utility functions
  isLens,
  isPrism,
  isOptional,
  isTraversal,
  isOptic,
  to,
  sets
}; 