/**
 * doM-style Syntax for Monadic Chaining
 * 
 * This module provides doM-style syntax for chaining monads with improved readability
 * and purity safety. Inspired by Haskell's do notation.
 * 
 * Features:
 * - Generator-based monadic chaining
 * - Automatic purity inference and propagation
 * - Support for Monad1, Monad2, Monad3
 * - Nested doM blocks
 * - Type-safe effect composition
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe, Either, Result, ObservableLite
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker,
  composeEffects
} from './fp-purity';

// ============================================================================
// Part 1: Type Definitions
// ============================================================================

/**
 * Generator function type for doM
 */
export type DoMGenerator<F extends Kind1, A> = Generator<Apply<F, any>, A, any>;

/**
 * Generator function type for doM2
 */
export type DoM2Generator<F extends Kind2, A, E> = Generator<Apply<F, [A, E]>, A, any>;

/**
 * Generator function type for doM3
 */
export type DoM3Generator<F extends Kind3, A, E, R> = Generator<Apply<F, [A, E, R]>, A, any>;

/**
 * Monadic value with effect tag
 */
export type MonadicValue<F extends Kind1, A, E extends EffectTag = 'Pure'> = 
  Apply<F, [A]> & { readonly __effect: E };

/**
 * Monadic value with effect tag for binary type constructors
 */
export type MonadicValue2<F extends Kind2, A, B, E extends EffectTag = 'Pure'> = 
  Apply<F, [A, B]> & { readonly __effect: E };

/**
 * Monadic value with effect tag for ternary type constructors
 */
export type MonadicValue3<F extends Kind3, A, B, C, E extends EffectTag = 'Pure'> = 
  Apply<F, [A, B, C]> & { readonly __effect: E };

/**
 * Effect composition result
 */
export type ComposedEffect<T extends readonly EffectTag[]> = 
  T extends readonly [infer First, ...infer Rest]
    ? Rest extends readonly EffectTag[]
      ? composeEffects<First, ComposedEffect<Rest>>
      : First
    : 'Pure';

// ============================================================================
// Part 2: Core doM Implementation
// ============================================================================

/**
 * doM for unary type constructors (Monad1)
 * Chains monadic values using generator syntax
 */
export function doM<F extends Kind1, A, E extends EffectTag = 'Pure'>(
  generator: () => DoMGenerator<F, A>
): MonadicValue<F, A, E> {
  return doMInternal(generator()) as MonadicValue<F, A, E>;
}

/**
 * doM2 for binary type constructors (Monad2)
 * Chains monadic values using generator syntax
 */
export function doM2<F extends Kind2, A, B, E extends EffectTag = 'Pure'>(
  generator: () => DoM2Generator<F, A, B>
): MonadicValue2<F, A, B, E> {
  return doM2Internal(generator()) as MonadicValue2<F, A, B, E>;
}

/**
 * doM3 for ternary type constructors (Monad3)
 * Chains monadic values using generator syntax
 */
export function doM3<F extends Kind3, A, B, C, E extends EffectTag = 'Pure'>(
  generator: () => DoM3Generator<F, A, B, C>
): MonadicValue3<F, A, B, C, E> {
  return doM3Internal(generator()) as MonadicValue3<F, A, B, C, E>;
}

// ============================================================================
// Part 3: Internal Implementation
// ============================================================================

/**
 * Internal implementation for doM
 */
function doMInternal<F extends Kind1, A>(
  generator: DoMGenerator<F, A>
): Apply<F, [A]> {
  const iterator = generator;
  let result: IteratorResult<Apply<F, any>, A>;
  let currentValue: Apply<F, any> | null = null;

  function step(value?: any): Apply<F, [A]> {
    try {
      result = iterator.next(value);
      
      if (result.done) {
        // Generator completed, return the final value
        return result.value as Apply<F, [A]>;
      }
      
      // Get the yielded monadic value
      const monadicValue = result.value;
      
      // Chain with the next step
      if (hasChain(monadicValue)) {
        return monadicValue.chain((val: any) => step(val));
      } else if (hasFlatMap(monadicValue)) {
        return monadicValue.flatMap((val: any) => step(val));
      } else {
        // Fallback to map if no chain method
        return monadicValue.map((val: any) => step(val));
      }
    } catch (error) {
      // Handle errors in the generator
      if (hasCatchError(monadicValue)) {
        return monadicValue.catchError((err: any) => {
          throw err;
        });
      }
      throw error;
    }
  }

  return step();
}

/**
 * Internal implementation for doM2
 */
function doM2Internal<F extends Kind2, A, B>(
  generator: DoM2Generator<F, A, B>
): Apply<F, [A, B]> {
  const iterator = generator;
  let result: IteratorResult<Apply<F, [A, B]>, A>;

  function step(value?: any): Apply<F, [A, B]> {
    try {
      result = iterator.next(value);
      
      if (result.done) {
        return result.value as Apply<F, [A, B]>;
      }
      
      const monadicValue = result.value;
      
      if (hasChain(monadicValue)) {
        return monadicValue.chain((val: any) => step(val));
      } else if (hasFlatMap(monadicValue)) {
        return monadicValue.flatMap((val: any) => step(val));
      } else {
        return monadicValue.map((val: any) => step(val));
      }
    } catch (error) {
      if (hasCatchError(monadicValue)) {
        return monadicValue.catchError((err: any) => {
          throw err;
        });
      }
      throw error;
    }
  }

  return step();
}

/**
 * Internal implementation for doM3
 */
function doM3Internal<F extends Kind3, A, B, C>(
  generator: DoM3Generator<F, A, B, C>
): Apply<F, [A, B, C]> {
  const iterator = generator;
  let result: IteratorResult<Apply<F, [A, B, C]>, A>;

  function step(value?: any): Apply<F, [A, B, C]> {
    try {
      result = iterator.next(value);
      
      if (result.done) {
        return result.value as Apply<F, [A, B, C]>;
      }
      
      const monadicValue = result.value;
      
      if (hasChain(monadicValue)) {
        return monadicValue.chain((val: any) => step(val));
      } else if (hasFlatMap(monadicValue)) {
        return monadicValue.flatMap((val: any) => step(val));
      } else {
        return monadicValue.map((val: any) => step(val));
      }
    } catch (error) {
      if (hasCatchError(monadicValue)) {
        return monadicValue.catchError((err: any) => {
          throw err;
        });
      }
      throw error;
    }
  }

  return step();
}

// ============================================================================
// Part 4: Method Detection
// ============================================================================

/**
 * Check if a value has a chain method
 */
function hasChain(value: any): value is { chain: (f: (a: any) => any) => any } {
  return value && typeof value.chain === 'function';
}

/**
 * Check if a value has a flatMap method
 */
function hasFlatMap(value: any): value is { flatMap: (f: (a: any) => any) => any } {
  return value && typeof value.flatMap === 'function';
}

/**
 * Check if a value has a map method
 */
function hasMap(value: any): value is { map: (f: (a: any) => any) => any } {
  return value && typeof value.map === 'function';
}

/**
 * Check if a value has a catchError method
 */
function hasCatchError(value: any): value is { catchError: (f: (err: any) => any) => any } {
  return value && typeof value.catchError === 'function';
}

// ============================================================================
// Part 5: Purity Integration
// ============================================================================

/**
 * Infer effect from monadic value
 */
export function inferEffect<F extends Kind1, A>(value: Apply<F, [A]>): EffectTag {
  if (hasPurityMarker(value)) {
    return extractPurityMarker(value);
  }
  
  // Default effect inference based on type
  if (value && typeof value === 'object') {
    if ('subscribe' in value) return 'Async'; // ObservableLite
    if ('then' in value) return 'Async'; // Promise
    if ('run' in value) return 'IO'; // IO
    if ('execute' in value) return 'IO'; // Task
  }
  
  return 'Pure';
}

/**
 * Compose effects from multiple monadic values
 */
export function composeMonadicEffects<Effects extends readonly EffectTag[]>(
  effects: Effects
): ComposedEffect<Effects> {
  if (effects.length === 0) return 'Pure' as ComposedEffect<Effects>;
  if (effects.length === 1) return effects[0] as ComposedEffect<Effects>;
  
  const [first, ...rest] = effects;
  const restEffect = composeMonadicEffects(rest);
  const composed = composeEffects(first, restEffect);
  
  return composed as ComposedEffect<Effects>;
}

/**
 * Mark doM result with composed effect
 */
export function markDoMResult<F extends Kind1, A, E extends EffectTag>(
  value: Apply<F, [A]>,
  effect: E
): MonadicValue<F, A, E> {
  return attachPurityMarker(value, effect) as MonadicValue<F, A, E>;
}

// ============================================================================
// Part 6: Nested doM Support
// ============================================================================

/**
 * Yield a nested doM block
 */
export function yieldDoM<F extends Kind1, A>(
  doMBlock: MonadicValue<F, A>
): Apply<F, [A]> {
  return doMBlock;
}

/**
 * Yield a nested doM2 block
 */
export function yieldDoM2<F extends Kind2, A, B>(
  doMBlock: MonadicValue2<F, A, B>
): Apply<F, [A, B]> {
  return doMBlock;
}

/**
 * Yield a nested doM3 block
 */
export function yieldDoM3<F extends Kind3, A, B, C>(
  doMBlock: MonadicValue3<F, A, B, C>
): Apply<F, [A, B, C]> {
  return doMBlock;
}

// ============================================================================
// Part 7: Utility Functions
// ============================================================================

/**
 * Create a pure doM block
 */
export function pureDoM<F extends Kind1, A>(
  value: A
): MonadicValue<F, A, 'Pure'> {
  // This would need to be implemented based on the specific monad
  // For now, return a mock implementation
  return { value, __effect: 'Pure' } as any;
}

/**
 * Create an async doM block
 */
export function asyncDoM<F extends Kind1, A>(
  value: A
): MonadicValue<F, A, 'Async'> {
  return { value, __effect: 'Async' } as any;
}

/**
 * Create an IO doM block
 */
export function ioDoM<F extends Kind1, A>(
  value: A
): MonadicValue<F, A, 'IO'> {
  return { value, __effect: 'IO' } as any;
}

/**
 * Handle errors in doM blocks
 */
export function catchDoM<F extends Kind1, A, E extends EffectTag>(
  doMBlock: MonadicValue<F, A, E>,
  errorHandler: (error: any) => MonadicValue<F, A, E>
): MonadicValue<F, A, E> {
  if (hasCatchError(doMBlock)) {
    return doMBlock.catchError(errorHandler) as MonadicValue<F, A, E>;
  }
  return doMBlock;
}

/**
 * Map over doM result
 */
export function mapDoM<F extends Kind1, A, B, E extends EffectTag>(
  doMBlock: MonadicValue<F, A, E>,
  f: (a: A) => B
): MonadicValue<F, B, E> {
  if (hasMap(doMBlock)) {
    return doMBlock.map(f) as MonadicValue<F, B, E>;
  }
  return doMBlock as any;
}

/**
 * Chain doM blocks
 */
export function chainDoM<F extends Kind1, A, B, E extends EffectTag>(
  doMBlock: MonadicValue<F, A, E>,
  f: (a: A) => MonadicValue<F, B, E>
): MonadicValue<F, B, E> {
  if (hasChain(doMBlock)) {
    return doMBlock.chain(f) as MonadicValue<F, B, E>;
  }
  return doMBlock as any;
}

// ============================================================================
// Part 8: Type Helpers
// ============================================================================

/**
 * Extract the effect type from a doM result
 */
export type EffectOfDoM<T> = T extends MonadicValue<any, any, infer E> ? E : 'Pure';

/**
 * Extract the value type from a doM result
 */
export type ValueOfDoM<T> = T extends MonadicValue<any, infer A, any> ? A : never;

/**
 * Extract the monad type from a doM result
 */
export type MonadOfDoM<T> = T extends MonadicValue<infer F, any, any> ? F : never;

/**
 * Check if a doM result is pure
 */
export type IsDoMPure<T> = EffectOfDoM<T> extends 'Pure' ? true : false;

/**
 * Check if a doM result is async
 */
export type IsDoMAsync<T> = EffectOfDoM<T> extends 'Async' ? true : false;

/**
 * Check if a doM result is IO
 */
export type IsDoMIO<T> = EffectOfDoM<T> extends 'IO' ? true : false;

// ============================================================================
// Part 9: Export All
// ============================================================================

export {
  // Core doM functions
  doM,
  doM2,
  doM3,
  
  // Internal implementations
  doMInternal,
  doM2Internal,
  doM3Internal,
  
  // Method detection
  hasChain,
  hasFlatMap,
  hasMap,
  hasCatchError,
  
  // Purity integration
  inferEffect,
  composeMonadicEffects,
  markDoMResult,
  
  // Nested doM support
  yieldDoM,
  yieldDoM2,
  yieldDoM3,
  
  // Utility functions
  pureDoM,
  asyncDoM,
  ioDoM,
  catchDoM,
  mapDoM,
  chainDoM,
  
  // Type helpers
  EffectOfDoM,
  ValueOfDoM,
  MonadOfDoM,
  IsDoMPure,
  IsDoMAsync,
  IsDoMIO
}; 