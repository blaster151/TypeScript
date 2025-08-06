/**
 * Observable-Optic Integration & Streaming Pattern Matching
 * 
 * This module provides first-class optics support for ObservableLite,
 * enabling live pattern matching and data transformation in reactive streams.
 */

import { ObservableLite } from './fp-observable-lite';
import { Maybe } from './fp-maybe-unified';
import { Either } from './fp-either-unified';
import { Result } from './fp-result-unified';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Type for optic detection
 */
export type OpticType = 'lens' | 'prism' | 'optional' | 'traversal' | 'iso';

/**
 * Type for optic operations
 */
export type OpticOperation = 'get' | 'set' | 'over' | 'preview' | 'modify' | 'getOption';

/**
 * Type for pattern matching cases
 */
export type PatternMatchCases<T, R> = {
  // Maybe cases
  Just?: (value: T) => R;
  Nothing?: () => R;
  // Either cases
  Left?: (value: any) => R;
  Right?: (value: T) => R;
  // Result cases
  Ok?: (value: T) => R;
  Err?: (error: any) => R;
  // Generic cases
  _?: (tag: string, payload: any) => R;
  otherwise?: (tag: string, payload: any) => R;
};

/**
 * Type for GADT pattern matching
 */
export type GADTPatternMatch<T, R> = {
  [K in string]?: (payload: any) => R;
} & {
  _?: (tag: string, payload: any) => R;
  otherwise?: (tag: string, payload: any) => R;
};

// ============================================================================
// Optic Detection Functions
// ============================================================================

/**
 * Check if a value is a Lens
 */
export function isLens(optic: any): boolean {
  return optic && typeof optic === 'object' && 
         typeof optic.get === 'function' && 
         typeof optic.set === 'function';
}

/**
 * Check if a value is a Prism
 */
export function isPrism(optic: any): boolean {
  return optic && typeof optic === 'function' && 
         typeof optic.match === 'function' && 
         typeof optic.build === 'function';
}

/**
 * Check if a value is an Optional
 */
export function isOptional(optic: any): boolean {
  return optic && typeof optic === 'object' && 
         typeof optic.getOption === 'function' && 
         typeof optic.set === 'function';
}

/**
 * Check if a value is a Traversal
 */
export function isTraversal(optic: any): boolean {
  return optic && typeof optic === 'object' && 
         typeof optic.getAll === 'function' && 
         typeof optic.modifyAll === 'function';
}

/**
 * Check if a value is an Iso
 */
export function isIso(optic: any): boolean {
  return optic && typeof optic === 'object' && 
         typeof optic.get === 'function' && 
         typeof optic.reverseGet === 'function';
}

/**
 * Get the type of an optic
 */
export function getOpticType(optic: any): OpticType | null {
  if (isLens(optic)) return 'lens';
  if (isPrism(optic)) return 'prism';
  if (isOptional(optic)) return 'optional';
  if (isTraversal(optic)) return 'traversal';
  if (isIso(optic)) return 'iso';
  return null;
}

// ============================================================================
// Helper Functions for Observable-Optic Integration
// ============================================================================

/**
 * Transform an observable using a lens
 */
export function overWithLens<A, B>(
  observable: ObservableLite<A>,
  lens: { get: (s: A) => B; set: (b: B, s: A) => A },
  fn: (focus: B) => B
): ObservableLite<A> {
  return observable.over(lens, fn);
}

/**
 * Extract focused values using a prism
 */
export function previewWithPrism<A, B>(
  observable: ObservableLite<A>,
  prism: { match: (s: A) => { tag: 'Just', value: B } | { tag: 'Nothing' } }
): ObservableLite<B> {
  return observable.preview(prism);
}

/**
 * Transform an observable using an optional
 */
export function modifyWithOptional<A, B>(
  observable: ObservableLite<A>,
  optional: { getOption: (s: A) => { tag: 'Just', value: B } | { tag: 'Nothing' }; set: (b: B, s: A) => A },
  fn: (focus: B) => B
): ObservableLite<A> {
  return observable.modify(optional, fn);
}

/**
 * Get focused values as Maybe using any optic
 */
export function getOptionWithOptic<A, B>(
  observable: ObservableLite<A>,
  optic: any
): ObservableLite<Maybe<B>> {
  return observable.getOption(optic);
}

/**
 * Filter observable based on optic focus
 */
export function filterWithOptic<A>(
  observable: ObservableLite<A>,
  optic: any
): ObservableLite<A> {
  return observable.filterOptic(optic);
}

/**
 * Compose multiple optics for complex transformations
 */
export function composeOptics<A, B, C>(
  observable: ObservableLite<A>,
  optic1: any,
  optic2: any,
  fn: (focus1: B, focus2: C) => any
): ObservableLite<any> {
  return observable.composeOptic(optic1, optic2, fn);
}

// ============================================================================
// GADT Pattern Matching Helpers
// ============================================================================

/**
 * Pattern match over a stream of GADT values
 */
export function matchWithGADT<A, R>(
  observable: ObservableLite<A>,
  cases: GADTPatternMatch<A, R>
): ObservableLite<R> {
  return observable.subscribeMatch(cases as any);
}

/**
 * Pattern match over Maybe values in a stream
 */
export function matchMaybe<A, R>(
  observable: ObservableLite<Maybe<A>>,
  cases: {
    Just: (value: A) => R;
    Nothing: () => R;
  }
): ObservableLite<R> {
  return observable.subscribeMatch(cases);
}

/**
 * Pattern match over Either values in a stream
 */
export function matchEither<L, R, Result>(
  observable: ObservableLite<Either<L, R>>,
  cases: {
    Left: (value: L) => Result;
    Right: (value: R) => Result;
  }
): ObservableLite<Result> {
  return observable.subscribeMatch(cases);
}

/**
 * Pattern match over Result values in a stream
 */
export function matchResult<A, E, R>(
  observable: ObservableLite<Result<A, E>>,
  cases: {
    Ok: (value: A) => R;
    Err: (error: E) => R;
  }
): ObservableLite<R> {
  return observable.subscribeMatch(cases);
}

// ============================================================================
// Advanced Pattern Matching
// ============================================================================

/**
 * Pattern match with exhaustiveness checking
 */
export function matchExhaustive<A, R>(
  observable: ObservableLite<A>,
  cases: PatternMatchCases<A, R>
): ObservableLite<R> {
  return observable.subscribeMatch(cases);
}

/**
 * Pattern match with default case
 */
export function matchWithDefault<A, R>(
  observable: ObservableLite<A>,
  cases: PatternMatchCases<A, R>,
  defaultCase: (value: A) => R
): ObservableLite<R> {
  return observable.subscribeMatch({
    ...cases,
    otherwise: defaultCase
  });
}

/**
 * Pattern match with error handling
 */
export function matchWithError<A, R>(
  observable: ObservableLite<A>,
  cases: PatternMatchCases<A, R>,
  errorHandler: (error: any) => R
): ObservableLite<R> {
  return observable.subscribeMatch(cases).catchError(() => 
    ObservableLite.of(errorHandler(new Error('Pattern match failed')))
  );
}

// ============================================================================
// Optic Composition Helpers
// ============================================================================

/**
 * Compose lens with lens
 */
export function composeLensLens<A, B, C>(
  observable: ObservableLite<A>,
  lens1: { get: (s: A) => B; set: (b: B, s: A) => A },
  lens2: { get: (s: B) => C; set: (b: C, s: B) => B },
  fn: (focus1: B, focus2: C) => C
): ObservableLite<A> {
  return observable.composeOptic(lens1, lens2, (focus1, focus2) => {
    const modified = fn(focus1, focus2);
    return lens1.set(lens2.set(modified, focus1), observable as any);
  });
}

/**
 * Compose lens with prism
 */
export function composeLensPrism<A, B, C>(
  observable: ObservableLite<A>,
  lens: { get: (s: A) => B; set: (b: B, s: A) => A },
  prism: { match: (s: B) => { tag: 'Just', value: C } | { tag: 'Nothing' }; build: (b: C) => B },
  fn: (focus1: B, focus2: C) => C
): ObservableLite<A> {
  return observable.composeOptic(lens, prism, (focus1, focus2) => {
    const modified = fn(focus1, focus2);
    return lens.set(prism.build(modified), observable as any);
  });
}

/**
 * Compose prism with lens
 */
export function composePrismLens<A, B, C>(
  observable: ObservableLite<A>,
  prism: { match: (s: A) => { tag: 'Just', value: B } | { tag: 'Nothing' }; build: (b: B) => A },
  lens: { get: (s: B) => C; set: (b: C, s: B) => B },
  fn: (focus1: B, focus2: C) => C
): ObservableLite<A> {
  return observable.composeOptic(prism, lens, (focus1, focus2) => {
    const modified = fn(focus1, focus2);
    return prism.build(lens.set(modified, focus1));
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an observable that emits only when optic focuses successfully
 */
export function whenOptic<A, B>(
  observable: ObservableLite<A>,
  optic: any,
  fn: (focus: B) => void
): ObservableLite<A> {
  return observable.preview(optic).map(fn).flatMap(() => observable);
}

/**
 * Create an observable that transforms values only when optic focuses
 */
export function transformWhenOptic<A, B, C>(
  observable: ObservableLite<A>,
  optic: any,
  fn: (focus: B) => C
): ObservableLite<C> {
  return observable.preview(optic).map(fn);
}

/**
 * Create an observable that filters based on optic focus predicate
 */
export function filterWhenOptic<A, B>(
  observable: ObservableLite<A>,
  optic: any,
  predicate: (focus: B) => boolean
): ObservableLite<A> {
  return observable.preview(optic).filter(predicate).flatMap(() => observable);
}

/**
 * Create an observable that combines optic focus with original value
 */
export function combineWithOptic<A, B>(
  observable: ObservableLite<A>,
  optic: any,
  fn: (original: A, focus: B) => any
): ObservableLite<any> {
  return observable.composeOptic(
    { get: (s: A) => s, set: (b: A, s: A) => b }, // Identity lens
    optic,
    fn
  );
}

// ============================================================================
// Purity Integration
// ============================================================================

/**
 * Mark an observable operation as pure
 */
export function markPure<A>(observable: ObservableLite<A>): ObservableLite<A> & { readonly __effect: 'Pure' } {
  return observable as ObservableLite<A> & { readonly __effect: 'Pure' };
}

/**
 * Mark an observable operation as async
 */
export function markAsync<A>(observable: ObservableLite<A>): ObservableLite<A> & { readonly __effect: 'Async' } {
  return observable as ObservableLite<A> & { readonly __effect: 'Async' };
}

/**
 * Check if an observable operation is pure
 */
export function isPure<A>(observable: ObservableLite<A>): boolean {
  return (observable as any).__effect === 'Pure';
}

/**
 * Check if an observable operation is async
 */
export function isAsync<A>(observable: ObservableLite<A>): boolean {
  return (observable as any).__effect === 'Async';
}

// ============================================================================
// Export All
// ============================================================================

export {
  // Optic detection
  isLens,
  isPrism,
  isOptional,
  isTraversal,
  isIso,
  getOpticType,
  
  // Helper functions
  overWithLens,
  previewWithPrism,
  modifyWithOptional,
  getOptionWithOptic,
  filterWithOptic,
  composeOptics,
  
  // GADT pattern matching
  matchWithGADT,
  matchMaybe,
  matchEither,
  matchResult,
  
  // Advanced pattern matching
  matchExhaustive,
  matchWithDefault,
  matchWithError,
  
  // Optic composition
  composeLensLens,
  composeLensPrism,
  composePrismLens,
  
  // Utility functions
  whenOptic,
  transformWhenOptic,
  filterWhenOptic,
  combineWithOptic,
  
  // Purity integration
  markPure,
  markAsync,
  isPure,
  isAsync
}; 