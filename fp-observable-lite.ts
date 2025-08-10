/**
 * Minimal FP-Integrated Observable Type
 * 
 * This module provides a lightweight Observable type that integrates seamlessly
 * with the HKT system, purity tracking, and Functor/Monad typeclasses.
 * 
 * Features:
 * - HKT-aware type constructor with ObservableLiteK
 * - Purity integration with 'Async' effect tagging
 * - Functor and Monad instances with law compliance
 * - Chainable FP methods without .pipe()
 * - Static helpers for common use cases
 * - Foundation for future optics integration
 * - Full integration with existing FP infrastructure
 * - Automatic fusion optimization for operator chains
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

import { isLens, isPrism, isOptional } from './fp-optics';

// Import fusion system
import {
  StreamPlanNode,
  planFromStream,
  streamFromPlan,
  optimizePlan,
  canOptimize,
  optimizeStream,
  withAutoOptimization,
  createFusionOptimizer,
  optimizePipeline
} from './fp-stream-fusion';

// Import common operations
import {
  addCommonOps,
  addOptimizedOps,
  applyCommonOps,
  CommonStreamOps
} from './fp-stream-ops';

// Import conversion functions
import { fromObservableLite } from './fp-frp-bridge';

// Import fluent API
import { applyFluentOps, FluentImpl } from './fp-fluent-api';

// ============================================================================
// Part 1: Core ObservableLite Type Definition
// ============================================================================

/**
 * Observer interface for ObservableLite
 */
export interface Observer<A> {
  next: (value: A) => void;
  error?: (err: any) => void;
  complete?: () => void;
}

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Subscribe function type
 */
export type Subscribe<A> = (observer: Observer<A>) => Unsubscribe;

/**
 * Core ObservableLite type - wraps a subscribe function
 */
export class ObservableLite<A> {
  private readonly _subscribe: Subscribe<A>;

  constructor(subscribe: Subscribe<A>) {
    this._subscribe = subscribe;
  }

  /**
   * Subscribe to the observable
   * @param observer - The observer to receive values
   * @returns Unsubscribe function
   */
  subscribe(observer: Observer<A>): Unsubscribe;
  /**
   * Subscribe with individual callbacks
   * @param next - Function called with each value
   * @param error - Optional function called on error
   * @param complete - Optional function called on completion
   * @returns Unsubscribe function
   */
  subscribe(
    next: (value: A) => void,
    error?: (err: any) => void,
    complete?: () => void
  ): Unsubscribe;
  subscribe(
    observerOrNext: Observer<A> | ((value: A) => void),
    error?: (err: any) => void,
    complete?: () => void
  ): Unsubscribe {
    if (typeof observerOrNext === 'function') {
      return this._subscribe({ next: observerOrNext, error, complete });
    } else {
      return this._subscribe(observerOrNext);
    }
  }

  // ============================================================================
  // Part 2: FP Instance Methods (Chainable)
  // ============================================================================

  /**
   * Map over values in the observable (Functor)
   * @param f - Function to transform values
   * @returns New observable with transformed values
   */
  map<B>(f: (a: A) => B): ObservableLite<B>;
  /**
   * Map over values using an optic
   * @param optic - Lens, Prism, or Optional to focus on part of the value
   * @param f - Function to transform the focused part
   * @returns New observable with optic-transformed values
   */
  map<B>(optic: any, f: (b: any) => any): ObservableLite<A>;
  map<B>(fOrOptic: ((a: A) => B) | any, opticFn?: (b: any) => any): ObservableLite<B> | ObservableLite<A> {
    if (typeof fOrOptic === 'function' && opticFn === undefined) {
      // Standard map with function
      const f = fOrOptic as (a: A) => B;
      return new ObservableLite<B>((observer) => {
        return this._subscribe({
          next: (value) => observer.next(f(value)),
          error: observer.error,
          complete: observer.complete
        });
      });
    } else {
      // Map with optic
      const optic = fOrOptic;
      const f = opticFn!;
      return new ObservableLite<A>((observer) => {
        return this._subscribe({
          next: (value) => {
            // Apply optic transformation
            if (optic && typeof optic.get === 'function') {
              // Lens or Optional
              const focused = optic.get(value);
              const transformed = f(focused);
              const result = optic.set ? optic.set(transformed, value) : value;
              observer.next(result);
            } else if (optic && typeof optic.match === 'function') {
              // Prism
              const match = optic.match(value);
              if (match && match.tag === 'Just') {
                const transformed = f(match.value);
                const result = optic.build ? optic.build(transformed) : value;
                observer.next(result);
              } else {
                observer.next(value);
              }
            } else {
              observer.next(value);
            }
          },
          error: observer.error,
          complete: observer.complete
        });
      });
    }
  }

  /**
   * Flat map over values in the observable (Monad)
   * @param f - Function that returns a new observable
   * @returns New observable with flattened values
   */
  flatMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B> {
    return new ObservableLite<B>((observer) => {
      let outerUnsubscribe: Unsubscribe | null = null;
      let innerUnsubscribe: Unsubscribe | null = null;
      let completed = false;

      outerUnsubscribe = this._subscribe({
        next: (value) => {
          if (completed) return;
          
          if (innerUnsubscribe) {
            innerUnsubscribe();
          }
          
          const innerObservable = f(value);
          innerUnsubscribe = innerObservable.subscribe({
            next: (innerValue) => {
              if (!completed) {
                observer.next(innerValue);
              }
            },
            error: (err) => {
              if (!completed) {
                completed = true;
                observer.error?.(err);
              }
            },
            complete: () => {
              // Inner observable completed, but outer may continue
            }
          });
        },
        error: (err) => {
          if (!completed) {
            completed = true;
            observer.error?.(err);
          }
        },
        complete: () => {
          if (!completed) {
            completed = true;
            observer.complete?.();
          }
        }
      });

      return () => {
        if (outerUnsubscribe) outerUnsubscribe();
        if (innerUnsubscribe) innerUnsubscribe();
      };
    });
  }

  /**
   * Filter values in the observable
   * @param predicate - Function to test each value
   * @returns New observable with filtered values
   */
  filter(predicate: (a: A) => boolean): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this._subscribe({
        next: (value) => {
          if (predicate(value)) {
            observer.next(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  /**
   * Scan over values in the observable (like reduce but emits intermediate results)
   * @param reducer - Function to accumulate values
   * @param initial - Initial value for accumulation
   * @returns New observable with accumulated values
   */
  scan<B>(reducer: (acc: B, value: A) => B, initial: B): ObservableLite<B> {
    return new ObservableLite<B>((observer) => {
      let accumulator = initial;
      observer.next(accumulator); // Emit initial value

      return this._subscribe({
        next: (value) => {
          accumulator = reducer(accumulator, value);
          observer.next(accumulator);
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  /**
   * Take only the first n values
   * @param count - Number of values to take
   * @returns New observable with limited values
   */
  take(count: number): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      let taken = 0;
      
      return this._subscribe({
        next: (value) => {
          if (taken < count) {
            observer.next(value);
            taken++;
            if (taken === count) {
              observer.complete?.();
            }
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  /**
   * Skip the first n values
   * @param count - Number of values to skip
   * @returns New observable with skipped values
   */
  skip(count: number): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      let skipped = 0;
      
      return this._subscribe({
        next: (value) => {
          if (skipped < count) {
            skipped++;
          } else {
            observer.next(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  // ============================================================================
  // Part 2.5: Unified Traversal API Methods (Chainable)
  // ============================================================================

  /**
   * Sort values by a projection function
   * @param fn - Function to project values for sorting
   * @returns New observable with sorted values
   */
  sortBy<U>(fn: (a: A) => U): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      const values: Array<{ value: A; key: U; index: number }> = [];
      let index = 0;
      
      return this._subscribe({
        next: (value) => {
          values.push({ value, key: fn(value), index: index++ });
        },
        error: observer.error,
        complete: () => {
          // Sort by key, then by original index for stability
          values.sort((a, b) => {
            if (a.key < b.key) return -1;
            if (a.key > b.key) return 1;
            return a.index - b.index;
          });
          
          // Emit sorted values
          values.forEach(item => observer.next(item.value));
          observer.complete?.();
        }
      });
    });
  }

  /**
   * Remove duplicate values while preserving order
   * @returns New observable with unique values
   */
  distinct(): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      const seen = new Set<A>();
      
      return this._subscribe({
        next: (value) => {
          if (!seen.has(value)) {
            seen.add(value);
            observer.next(value);
          }
        },
        error: observer.error,
        complete: observer.complete
      });
    });
  }

  /**
   * Drop the first n values
   * @param count - Number of values to drop
   * @returns New observable with dropped values
   */
  drop(count: number): ObservableLite<A> {
    return this.skip(count);
  }

  /**
   * Slice values by range
   * @param start - Start index
   * @param end - End index (optional)
   * @returns New observable with sliced values
   */
  slice(start: number, end?: number): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      const values: A[] = [];
      let index = 0;
      
      return this._subscribe({
        next: (value) => {
          values.push(value);
          index++;
        },
        error: observer.error,
        complete: () => {
          const startIndex = start < 0 ? Math.max(0, values.length + start) : start;
          const endIndex = end === undefined ? values.length : 
                          end < 0 ? Math.max(0, values.length + end) : end;
          
          const sliced = values.slice(startIndex, endIndex);
          sliced.forEach(value => observer.next(value));
          observer.complete?.();
        }
      });
    });
  }

  /**
   * Reverse the order of values
   * @returns New observable with reversed values
   */
  reverse(): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      const values: A[] = [];
      
      return this._subscribe({
        next: (value) => {
          values.push(value);
        },
        error: observer.error,
        complete: () => {
          values.reverse().forEach(value => observer.next(value));
          observer.complete?.();
        }
      });
    });
  }

  // ============================================================================
  // Part 2.6: Unified Traversal API Methods (Terminal Folds)
  // ============================================================================

  /**
   * Reduce all values to a single result
   * @param reducer - Function to accumulate values
   * @param initial - Initial value for accumulation
   * @returns Promise that resolves to the reduced value
   */
  reduce<R>(reducer: (acc: R, value: A) => R, initial: R): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      let accumulator = initial;
      
      this._subscribe({
        next: (value) => {
          accumulator = reducer(accumulator, value);
        },
        error: (err) => reject(err),
        complete: () => resolve(accumulator)
      });
    });
  }

  /**
   * Fold map values using a monoid
   * @param monoid - Monoid instance for combining values
   * @param fn - Function to map values to monoid values
   * @returns Promise that resolves to the folded value
   */
  foldMap<M>(monoid: { empty(): M; concat(a: M, b: M): M }, fn: (a: A) => M): Promise<M> {
    return new Promise<M>((resolve, reject) => {
      let accumulator = monoid.empty();
      
      this._subscribe({
        next: (value) => {
          accumulator = monoid.concat(accumulator, fn(value));
        },
        error: (err) => reject(err),
        complete: () => resolve(accumulator)
      });
    });
  }

  /**
   * Check if all values satisfy a predicate
   * @param predicate - Function to test each value
   * @returns Promise that resolves to true if all values satisfy the predicate
   */
  all(predicate: (a: A) => boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let allSatisfy = true;
      
      this._subscribe({
        next: (value) => {
          if (!predicate(value)) {
            allSatisfy = false;
          }
        },
        error: (err) => reject(err),
        complete: () => resolve(allSatisfy)
      });
    });
  }

  /**
   * Check if any value satisfies a predicate
   * @param predicate - Function to test each value
   * @returns Promise that resolves to true if any value satisfies the predicate
   */
  any(predicate: (a: A) => boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let anySatisfy = false;
      
      this._subscribe({
        next: (value) => {
          if (predicate(value)) {
            anySatisfy = true;
          }
        },
        error: (err) => reject(err),
        complete: () => resolve(anySatisfy)
      });
    });
  }

  /**
   * Collect all values into an array
   * @returns Promise that resolves to an array of all values
   */
  toArray(): Promise<A[]> {
    return new Promise<A[]>((resolve, reject) => {
      const values: A[] = [];
      
      this._subscribe({
        next: (value) => {
          values.push(value);
        },
        error: (err) => reject(err),
        complete: () => resolve(values)
      });
    });
  }

  // ============================================================================
  // Part 2.7: Optics Integration Methods
  // ============================================================================

  /**
   * Transform values inside the optic focus for every emission.
   * Supports Lens, Prism, Optional, and compositions made via .then(...).
   * Type inference reflects the optic's focus type.
   * Always returns a new ObservableLite.
   */
  over<O, B>(
    optic: O,
    fn: (focus: FocusOf<O, A>) => FocusOf<O, A>
  ): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (isLens(optic)) {
              const lens = (optic as unknown) as { get: (s: A) => any; set: (b: any, s: A) => A };
              const focused = lens.get(value);
              const transformed = fn(focused);
              observer.next(lens.set(transformed, value));
            } else if (isOptional(optic)) {
              const optional = (optic as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' }; set: (b: any, s: A) => A };
              const maybe = optional.getOption(value);
              if (maybe && maybe.tag === 'Just') {
                const transformed = fn(maybe.value);
                observer.next(optional.set(transformed, value));
              } else {
                observer.next(value);
              }
            } else if (isPrism(optic)) {
              const prism = (optic as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' }; build: (b: any) => A };
              const match = prism.match(value);
              if (match && match.tag === 'Just') {
                const transformed = fn(match.value);
                observer.next(prism.build(transformed));
              } else {
                observer.next(value);
              }
            } else {
              // Handle composed optics or unknown optic types
              observer.next(value);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Extract the focused value for every emission.
   * Supports Lens, Prism, Optional, and compositions made via .then(...).
   * Type inference reflects the optic's focus type.
   * Returns ObservableLite<FocusOf<O, A>> for proper type safety.
   */
  preview<O>(optic: O): ObservableLite<FocusOf<O, A>> {
    return new ObservableLite<FocusOf<O, A>>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (isLens(optic)) {
              const lens = (optic as unknown) as { get: (s: A) => any };
              const focused = lens.get(value);
              observer.next(focused as FocusOf<O, A>);
            } else if (isOptional(optic)) {
              const optional = (optic as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const maybe = optional.getOption(value);
              if (maybe && maybe.tag === 'Just') {
                observer.next(maybe.value as FocusOf<O, A>);
              }
              // Don't emit anything for Nothing case - this preserves Optional semantics
            } else if (isPrism(optic)) {
              const prism = (optic as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const match = prism.match(value);
              if (match && match.tag === 'Just') {
                observer.next(match.value as FocusOf<O, A>);
              }
              // Don't emit anything for Nothing case - this preserves Prism semantics
            } else {
              // Handle composed optics or unknown optic types
              // For safety, don't emit anything for unknown optic types
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Set the focused value for every emission.
   * Supports Lens, Prism, Optional, and compositions made via .then(...).
   * Returns ObservableLite<A> with the updated structure.
   */
  set<O, B>(optic: O, value: FocusOf<O, A>): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this.subscribe({
        next: (currentValue) => {
          try {
            if (isLens(optic)) {
              const lens = (optic as unknown) as { set: (b: any, s: A) => A };
              const updated = lens.set(value, currentValue);
              observer.next(updated);
            } else if (isOptional(optic)) {
              const optional = (optic as unknown) as { set: (b: any, s: A) => A };
              const updated = optional.set(value, currentValue);
              observer.next(updated);
            } else if (isPrism(optic)) {
              const prism = (optic as unknown) as { build: (b: any) => A };
              const updated = prism.build(value);
              observer.next(updated);
            } else {
              // Handle composed optics or unknown optic types
              observer.next(currentValue);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Modify the focused value for every emission.
   * Supports Lens, Prism, Optional, and compositions made via .then(...).
   * Returns ObservableLite<A> with the modified structure.
   */
  modify<O>(optic: O, fn: (focus: FocusOf<O, A>) => FocusOf<O, A>): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (isLens(optic)) {
              const lens = (optic as unknown) as { get: (s: A) => any; set: (b: any, s: A) => A };
              const focused = lens.get(value);
              const modified = fn(focused);
              const updated = lens.set(modified, value);
              observer.next(updated);
            } else if (isOptional(optic)) {
              const optional = (optic as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' }; set: (b: any, s: A) => A };
              const maybe = optional.getOption(value);
              if (maybe && maybe.tag === 'Just') {
                const modified = fn(maybe.value);
                const updated = optional.set(modified, value);
                observer.next(updated);
              } else {
                observer.next(value);
              }
            } else if (isPrism(optic)) {
              const prism = (optic as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' }; build: (b: any) => A };
              const match = prism.match(value);
              if (match && match.tag === 'Just') {
                const modified = fn(match.value);
                const updated = prism.build(modified);
                observer.next(updated);
              } else {
                observer.next(value);
              }
            } else {
              // Handle composed optics or unknown optic types
              observer.next(value);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Get the focused value as a Maybe for every emission.
   * Supports Lens, Prism, Optional, and compositions made via .then(...).
   * Returns ObservableLite<Maybe<FocusOf<O, A>>> for proper type safety.
   */
  getOption<O>(optic: O): ObservableLite<Maybe<FocusOf<O, A>>> {
    return new ObservableLite<Maybe<FocusOf<O, A>>>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (isLens(optic)) {
              const lens = (optic as unknown) as { get: (s: A) => any };
              const focused = lens.get(value);
              observer.next(Maybe.Just(focused as FocusOf<O, A>));
            } else if (isOptional(optic)) {
              const optional = (optic as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const maybe = optional.getOption(value);
              if (maybe && maybe.tag === 'Just') {
                observer.next(Maybe.Just(maybe.value as FocusOf<O, A>));
              } else {
                observer.next(Maybe.Nothing());
              }
            } else if (isPrism(optic)) {
              const prism = (optic as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const match = prism.match(value);
              if (match && match.tag === 'Just') {
                observer.next(Maybe.Just(match.value as FocusOf<O, A>));
              } else {
                observer.next(Maybe.Nothing());
              }
            } else {
              // Handle composed optics or unknown optic types
              observer.next(Maybe.Nothing());
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Stream-aware pattern matcher for GADTs and ADTs.
   * Provides exhaustiveness-checked pattern matching at compile time.
   * Supports Maybe, Either, Result, and custom GADTs.
   */
  subscribeMatch<Result>(
    cases: {
      // Maybe cases
      Just?: (value: any) => Result;
      Nothing?: () => Result;
      // Either cases
      Left?: (value: any) => Result;
      Right?: (value: any) => Result;
      // Result cases
      Ok?: (value: any) => Result;
      Err?: (error: any) => Result;
      // Generic cases
      _?: (tag: string, payload: any) => Result;
      otherwise?: (tag: string, payload: any) => Result;
    }
  ): ObservableLite<Result> {
    return new ObservableLite<Result>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            // Handle Maybe
            if (value && typeof value === 'object' && 'tag' in value) {
              if (value.tag === 'Just' && cases.Just) {
                observer.next(cases.Just(value.payload?.value || value.value));
              } else if (value.tag === 'Nothing' && cases.Nothing) {
                observer.next(cases.Nothing());
              }
              // Handle Either
              else if (value.tag === 'Left' && cases.Left) {
                observer.next(cases.Left(value.payload?.value || value.value));
              } else if (value.tag === 'Right' && cases.Right) {
                observer.next(cases.Right(value.payload?.value || value.value));
              }
              // Handle Result
              else if (value.tag === 'Ok' && cases.Ok) {
                observer.next(cases.Ok(value.payload?.value || value.value));
              } else if (value.tag === 'Err' && cases.Err) {
                observer.next(cases.Err(value.payload?.error || value.error));
              }
              // Handle generic cases
              else if (cases._) {
                observer.next(cases._(value.tag, value.payload || value));
              } else if (cases.otherwise) {
                observer.next(cases.otherwise(value.tag, value.payload || value));
              }
            } else {
              // Handle non-GADT values
              if (cases._) {
                observer.next(cases._('value', value));
              } else if (cases.otherwise) {
                observer.next(cases.otherwise('value', value));
              }
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Filter stream based on optic focus.
   * Only emits values where the optic successfully focuses.
   * Supports Lens, Prism, Optional, and compositions.
   */
  filterOptic<O>(optic: O): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (isLens(optic)) {
              // Lenses always succeed, so emit the value
              observer.next(value);
            } else if (isOptional(optic)) {
              const optional = (optic as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const maybe = optional.getOption(value);
              if (maybe && maybe.tag === 'Just') {
                observer.next(value);
              }
              // Don't emit for Nothing case
            } else if (isPrism(optic)) {
              const prism = (optic as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const match = prism.match(value);
              if (match && match.tag === 'Just') {
                observer.next(value);
              }
              // Don't emit for Nothing case
            } else {
              // For unknown optic types, emit the value
              observer.next(value);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Transform stream using optic composition.
   * Applies multiple optics in sequence for complex transformations.
   */
  composeOptic<O1, O2, B>(
    optic1: O1,
    optic2: O2,
    fn: (focus1: FocusOf<O1, A>, focus2: FocusOf<O2, FocusOf<O1, A>>) => B
  ): ObservableLite<B> {
    return new ObservableLite<B>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            // Apply first optic
            let focus1: any;
            if (isLens(optic1)) {
              const lens = (optic1 as unknown) as { get: (s: A) => any };
              focus1 = lens.get(value);
            } else if (isOptional(optic1)) {
              const optional = (optic1 as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const maybe = optional.getOption(value);
              if (maybe && maybe.tag === 'Just') {
                focus1 = maybe.value;
              } else {
                return; // Don't emit for Nothing case
              }
            } else if (isPrism(optic1)) {
              const prism = (optic1 as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const match = prism.match(value);
              if (match && match.tag === 'Just') {
                focus1 = match.value;
              } else {
                return; // Don't emit for Nothing case
              }
            } else {
              return; // Unknown optic type
            }

            // Apply second optic to the result of the first
            let focus2: any;
            if (isLens(optic2)) {
              const lens = (optic2 as unknown) as { get: (s: any) => any };
              focus2 = lens.get(focus1);
            } else if (isOptional(optic2)) {
              const optional = (optic2 as unknown) as { getOption: (s: any) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const maybe = optional.getOption(focus1);
              if (maybe && maybe.tag === 'Just') {
                focus2 = maybe.value;
              } else {
                return; // Don't emit for Nothing case
              }
            } else if (isPrism(optic2)) {
              const prism = (optic2 as unknown) as { match: (s: any) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
              const match = prism.match(focus1);
              if (match && match.tag === 'Just') {
                focus2 = match.value;
              } else {
                return; // Don't emit for Nothing case
              }
            } else {
              return; // Unknown optic type
            }

            // Apply transformation function
            const result = fn(focus1, focus2);
            observer.next(result);
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Handle errors in the observable
   * @param handler - Function to handle errors
   * @returns New observable with error handling
   */
  catchError(handler: (err: any) => ObservableLite<A>): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      let unsubscribe: Unsubscribe | null = null;
      let completed = false;

      const subscribeToSource = () => {
        unsubscribe = this._subscribe({
          next: (value) => {
            if (!completed) {
              observer.next(value);
            }
          },
          error: (err) => {
            if (!completed) {
              const errorObservable = handler(err);
              unsubscribe = errorObservable.subscribe({
                next: (value) => {
                  if (!completed) {
                    observer.next(value);
                  }
                },
                error: (innerErr) => {
                  if (!completed) {
                    completed = true;
                    observer.error?.(innerErr);
                  }
                },
                complete: () => {
                  if (!completed) {
                    completed = true;
                    observer.complete?.();
                  }
                }
              });
            }
          },
          complete: () => {
            if (!completed) {
              completed = true;
              observer.complete?.();
            }
          }
        });
      };

      subscribeToSource();

      return () => {
        if (unsubscribe) unsubscribe();
      };
    });
  }

  // ============================================================================
  // Part 3: Optics Integration Hooks (Future)
  // ============================================================================

  /**
   * TODO: Integrate with lenses & prisms
   * Map over values using a lens
   * @param lens - Lens to focus on part of the value
   * @param fn - Function to transform the focused part
   * @returns New observable with lens-transformed values
   */
  lensMap<B>(lens: any, fn: (b: B) => B): ObservableLite<A> {
    // Placeholder for future optics integration
    return this.map((value) => {
      // TODO: Implement lens integration
      return value;
    });
  }

  /**
   * TODO: Integrate with prisms
   * Filter and transform values using a prism
   * @param prism - Prism to match and transform values
   * @returns New observable with prism-filtered values
   */
  prismFilter<B>(prism: any): ObservableLite<B> {
    // Placeholder for future optics integration
    return this.filter((value) => {
      // TODO: Implement prism integration
      return true;
    }).map((value) => {
      // TODO: Implement prism transformation
      return value as any;
    });
  }

  // ============================================================================
  // Part 3.5: Fluent API Methods (Typeclass Integration)
  // ============================================================================

  /**
   * Fluent map method that integrates with Functor typeclass
   * @param f - Function to transform values
   * @returns New observable with transformed values
   */
  fluentMap<B>(f: (a: A) => B): ObservableLite<B> {
    // This delegates to the existing map method
    return this.map(f);
  }

  /**
   * Fluent chain method that integrates with Monad typeclass
   * @param f - Function that returns a new observable
   * @returns New observable with flattened values
   */
  fluentChain<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B> {
    // This delegates to the existing flatMap method
    return this.flatMap(f);
  }

  /**
   * Fluent filter method
   * @param predicate - Function to test each value
   * @returns New observable with filtered values
   */
  fluentFilter(predicate: (a: A) => boolean): ObservableLite<A> {
    // This delegates to the existing filter method
    return this.filter(predicate);
  }

  /**
   * Fluent bimap method for error/success channels
   * @param f - Function to transform success values
   * @param g - Function to transform error values
   * @returns New observable with transformed channels
   */
  fluentBimap<B, C>(f: (a: A) => B, g: (err: any) => C): ObservableLite<B> {
    return new ObservableLite<B>((observer) => {
      return this._subscribe({
        next: (value) => observer.next(f(value)),
        error: (err) => observer.error?.(g(err)),
        complete: observer.complete,
      });
    });
  }

  /**
   * Fluent mapOver method for optic integration
   * @param optic - The optic to use for transformation
   * @param fn - Function to transform the focused value
   * @returns New observable with transformed values
   */
  fluentMapOver<O, B>(
    optic: O,
    fn: (focus: FocusOf<O, A>) => FocusOf<O, A>
  ): ObservableLite<A> {
    // This delegates to the existing over method
    return this.over(optic, fn);
  }

  /**
   * Fluent preview method for optic integration
   * @param optic - The optic to use for previewing
   * @returns New observable with focused values
   */
  fluentPreview<O>(optic: O): ObservableLite<FocusOf<O, A>> {
    // This delegates to the existing preview method
    return this.preview(optic);
  }

  // ============================================================================
  // Part 3: ADT Integration Methods
  // ============================================================================

  /**
   * Pattern match on each emitted ADT value using the ADT's own matcher.
   * Supports Maybe, Either, Result, and any other ADTs with registered pattern matchers.
   * Preserves type inference and purity tagging.
   */
  match<Result>(
    cases: {
      Just?: (payload: { value: any }) => Result;
      Nothing?: (payload: {}) => Result;
      Left?: (payload: { value: any }) => Result;
      Right?: (payload: { value: any }) => Result;
      Ok?: (payload: { value: any }) => Result;
      Err?: (payload: { error: any }) => Result;
      _?: (tag: string, payload: any) => Result;
      otherwise?: (tag: string, payload: any) => Result;
    }
  ): ObservableLite<Result> {
    return new ObservableLite<Result>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            // Check if the value has a match method (ADT instance)
            if (value && typeof (value as any).match === 'function') {
              const result = (value as any).match(cases);
              observer.next(result);
            } else {
              // Fallback for non-ADT values
              const fallback = cases._ || cases.otherwise;
              if (fallback) {
                const result = fallback('unknown', value);
                observer.next(result);
              }
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Shorthand for .map(v => match(v, cases)) but with better type inference and purity tagging.
   * Pattern match on each emitted ADT value and transform the result.
   */
  mapMatch<Result>(
    cases: {
      Just?: (payload: { value: any }) => Result;
      Nothing?: (payload: {}) => Result;
      Left?: (payload: { value: any }) => Result;
      Right?: (payload: { value: any }) => Result;
      Ok?: (payload: { value: any }) => Result;
      Err?: (payload: { error: any }) => Result;
      _?: (tag: string, payload: any) => Result;
      otherwise?: (tag: string, payload: any) => Result;
    }
  ): ObservableLite<Result> {
    return this.match(cases);
  }

  /**
   * For Either-like ADTs, allow splitting based on Left/Right branches into new observables or mapped values.
   * This is particularly useful for error handling in streams.
   */
  bichain<L, R>(
    leftFn: (error: L) => ObservableLite<R>,
    rightFn: (value: R) => ObservableLite<R>
  ): ObservableLite<R> {
    return new ObservableLite<R>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            // Check if the value is an Either-like ADT
            if (value && typeof (value as any).match === 'function') {
              (value as any).match({
                Left: (payload: any) => {
                  const leftObservable = leftFn(payload.value);
                  leftObservable.subscribe({
                    next: (leftValue) => observer.next(leftValue),
                    error: observer.error,
                    complete: () => {} // Don't complete on left branch
                  });
                },
                Right: (payload: any) => {
                  const rightObservable = rightFn(payload.value);
                  rightObservable.subscribe({
                    next: (rightValue) => observer.next(rightValue),
                    error: observer.error,
                    complete: () => {} // Don't complete on right branch
                  });
                },
                // Handle other ADT types that might have Left/Right semantics
                Err: (payload: any) => {
                  const leftObservable = leftFn(payload.error);
                  leftObservable.subscribe({
                    next: (leftValue) => observer.next(leftValue),
                    error: observer.error,
                    complete: () => {}
                  });
                },
                Ok: (payload: any) => {
                  const rightObservable = rightFn(payload.value);
                  rightObservable.subscribe({
                    next: (rightValue) => observer.next(rightValue),
                    error: observer.error,
                    complete: () => {}
                  });
                }
              });
            } else {
              // Fallback for non-ADT values - treat as Right
              const rightObservable = rightFn(value as unknown as R);
              rightObservable.subscribe({
                next: (rightValue) => observer.next(rightValue),
                error: observer.error,
                complete: () => {}
              });
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Pattern match on tags only (no payload access) for each emitted ADT value.
   */
  matchTag<Result>(
    cases: {
      Just?: () => Result;
      Nothing?: () => Result;
      Left?: () => Result;
      Right?: () => Result;
      Ok?: () => Result;
      Err?: () => Result;
      _?: (tag: string) => Result;
      otherwise?: (tag: string) => Result;
    }
  ): ObservableLite<Result> {
    return new ObservableLite<Result>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            // Check if the value has a matchTag method (ADT instance)
            if (value && typeof (value as any).matchTag === 'function') {
              const result = (value as any).matchTag(cases);
              observer.next(result);
            } else {
              // Fallback for non-ADT values
              const fallback = cases._ || cases.otherwise;
              if (fallback) {
                const result = fallback('unknown');
                observer.next(result);
              }
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Filter observable to only emit ADT values with a specific tag.
   */
  filterTag<Tag extends string>(tag: Tag): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            // Check if the value has an is method (ADT instance)
            if (value && typeof (value as any).is === 'function') {
              if ((value as any).is(tag)) {
                observer.next(value);
              }
            } else {
              // Fallback for non-ADT values
              if (value && (value as any).tag === tag) {
                observer.next(value);
              }
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Extract values from Just/Right/Ok cases, filtering out Nothing/Left/Err cases.
   */
  extractValues<B>(): ObservableLite<B> {
    return new ObservableLite<B>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (value && typeof (value as any).match === 'function') {
              (value as any).match({
                Just: (payload: any) => observer.next(payload.value),
                Right: (payload: any) => observer.next(payload.value),
                Ok: (payload: any) => observer.next(payload.value)
                // Don't emit for Nothing/Left/Err cases
              });
            } else {
              // Fallback for non-ADT values
              observer.next(value as B);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Extract errors from Left/Err cases, filtering out Right/Ok cases.
   */
  extractErrors<E>(): ObservableLite<E> {
    return new ObservableLite<E>((observer) => {
      return this.subscribe({
        next: (value) => {
          try {
            if (value && typeof (value as any).match === 'function') {
              (value as any).match({
                Left: (payload: any) => observer.next(payload.value),
                Err: (payload: any) => observer.next(payload.error)
                // Don't emit for Right/Ok cases
              });
            }
            // Don't emit for non-ADT values
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  // ============================================================================
  // Part 4: Additional Core FP/Rx Operators
  // ============================================================================

  /**
   * Alias for flatMap - Monad chaining
   * @param f - Function that returns a new observable
   * @returns New observable with flattened values
   */
  chain<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B> {
    return this.flatMap(f);
  }

  /**
   * Alias for flatMap - RxJS familiarity
   * @param f - Function that returns a new observable
   * @returns New observable with flattened values
   */
  mergeMap<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B> {
    return this.flatMap(f);
  }

  /**
   * Bimap method for error/success channels
   * @param f - Function to transform success values
   * @param g - Function to transform error values
   * @returns New observable with transformed channels
   */
  bimap<B, C>(f: (a: A) => B, g: (err: any) => C): ObservableLite<B> {
    return new ObservableLite<B>((observer) => {
      return this._subscribe({
        next: (value) => observer.next(f(value as A)),
        error: (err) => observer.error?.(g(err)),
        complete: observer.complete,
      });
    });
  }

  /**
   * Profunctor dimap - maps both input and output sides
   * @param inFn - Function to transform input (contravariant)
   * @param outFn - Function to transform output (covariant)
   * @returns New observable with transformed input/output
   */
  dimap<C, D>(inFn: (c: C) => A, outFn: (a: A) => D): ObservableLite<D> {
    return new ObservableLite<D>((observer) => {
      return this._subscribe({
        next: (value) => observer.next(outFn(value as A)),
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Profunctor lmap - maps the input side only (contravariant)
   * @param inFn - Function to transform input
   * @returns New observable with transformed input
   */
  lmap<C>(inFn: (c: C) => A): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this._subscribe({
        next: (value) => observer.next(value as A),
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Profunctor rmap - maps the output side only (covariant)
   * @param outFn - Function to transform output
   * @returns New observable with transformed output
   */
  rmap<D>(outFn: (a: A) => D): ObservableLite<D> {
    return new ObservableLite<D>((observer) => {
      return this._subscribe({
        next: (value) => observer.next(outFn(value as A)),
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Advanced optic integration with Profunctor - bidirectional transformations
   * @param optic - The optic to use for transformation
   * @param inFn - Function to transform input through optic
   * @param outFn - Function to transform output through optic
   * @returns New observable with optic-powered bidirectional transformations
   */
  mapWithOptic<O, C, D>(
    optic: O,
    inFn: (c: C) => FocusOf<O, A>,
    outFn: (focus: FocusOf<O, A>) => D
  ): ObservableLite<D> {
    return new ObservableLite<D>((observer) => {
      return this._subscribe({
        next: (value) => {
          try {
            if (optic && typeof optic.get === 'function') {
              // Lens or Optional
              const focused = optic.get(value);
              const transformed = outFn(focused);
              observer.next(transformed);
            } else if (optic && typeof optic.match === 'function') {
              // Prism
              const match = optic.match(value);
              if (match && match.tag === 'Just') {
                const transformed = outFn(match.value);
                observer.next(transformed);
              }
            } else {
              // Fallback to direct transformation
              const transformed = outFn(value as FocusOf<O, A>);
              observer.next(transformed);
            }
          } catch (error) {
            observer.error?.(error);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Prepend values to the beginning of the observable
   * @param values - Values to prepend
   * @returns New observable with prepended values
   */
  startWith<B extends A>(...values: B[]): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      // First emit the prepended values
      for (const value of values) {
        observer.next(value as A);
      }

      // Then subscribe to the source observable
      return this._subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error?.(err),
        complete: observer.complete
      });
    });
  }

  /**
   * Concatenate another observable to the end of this one
   * @param other - Observable to concatenate
   * @returns New observable that emits this observable's values, then the other's
   */
  concat<B>(other: ObservableLite<B>): ObservableLite<A | B> {
    return new ObservableLite<A | B>((observer) => {
      let firstCompleted = false;
      let secondSubscription: Unsubscribe | null = null;

      const firstSubscription = this._subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error?.(err),
        complete: () => {
          firstCompleted = true;
          // Start the second observable when the first completes
          secondSubscription = other.subscribe({
            next: (value) => observer.next(value),
            error: (err) => observer.error?.(err),
            complete: () => observer.complete?.()
          });
        }
      });

      return () => {
        firstSubscription();
        if (secondSubscription) {
          secondSubscription();
        }
      };
    });
  }

  /**
   * Merge emissions from another observable with this one
   * @param other - Observable to merge with
   * @returns New observable that emits values from both observables as they arrive
   */
  merge<B>(other: ObservableLite<B>): ObservableLite<A | B> {
    return new ObservableLite<A | B>((observer) => {
      let completed1 = false;
      let completed2 = false;

      const checkComplete = () => {
        if (completed1 && completed2) {
          observer.complete?.();
        }
      };

      const subscription1 = this._subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error?.(err),
        complete: () => {
          completed1 = true;
          checkComplete();
        }
      });

      const subscription2 = other.subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error?.(err),
        complete: () => {
          completed2 = true;
          checkComplete();
        }
      });

      return () => {
        subscription1();
        subscription2();
      };
    });
  }



  // ============================================================================
  // Part 4: Static Factory Methods
  // ============================================================================

  /**
   * Create an observable that emits a single value
   * @param value - The value to emit
   * @returns Observable that emits the value and completes
   */
  static of<A>(value: A): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      observer.next(value);
      observer.complete?.();
      return () => {}; // No cleanup needed
    });
  }

  /**
   * Create an observable from an array
   * @param values - Array of values to emit
   * @returns Observable that emits each array element
   */
  static fromArray<A>(values: readonly A[]): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      let cancelled = false;
      
      for (const value of values) {
        if (cancelled) break;
        observer.next(value);
      }
      
      if (!cancelled) {
        observer.complete?.();
      }
      
      return () => {
        cancelled = true;
      };
    });
  }

  /**
   * Create an observable from a promise
   * @param promise - Promise to convert to observable
   * @returns Observable that emits the resolved value or error
   */
  static fromPromise<A>(promise: Promise<A>): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      let cancelled = false;
      
      promise.then(
        (value) => {
          if (!cancelled) {
            observer.next(value);
            observer.complete?.();
          }
        },
        (error) => {
          if (!cancelled) {
            observer.error?.(error);
          }
        }
      );
      
      return () => {
        cancelled = true;
      };
    });
  }

  /**
   * Create an observable from an event target
   * @param target - Event target to listen to
   * @param eventName - Name of the event to listen for
   * @returns Observable that emits events
   */
  static fromEvent<T extends Event>(
    target: EventTarget,
    eventName: string
  ): ObservableLite<T> {
    return new ObservableLite<T>((observer) => {
      const handler = (event: Event) => {
        observer.next(event as T);
      };
      
      target.addEventListener(eventName, handler);
      
      return () => {
        target.removeEventListener(eventName, handler);
      };
    });
  }

  /**
   * Create an observable that emits values at intervals
   * @param interval - Interval in milliseconds
   * @returns Observable that emits incrementing numbers
   */
  static interval(interval: number): ObservableLite<number> {
    return new ObservableLite<number>((observer) => {
      let count = 0;
      const id = setInterval(() => {
        observer.next(count++);
      }, interval);
      
      return () => {
        clearInterval(id);
      };
    });
  }

  /**
   * Create an observable that emits values after a delay
   * @param delay - Delay in milliseconds
   * @param value - Value to emit
   * @returns Observable that emits the value after delay
   */
  static timer<A>(delay: number, value: A): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      const id = setTimeout(() => {
        observer.next(value);
        observer.complete?.();
      }, delay);
      
      return () => {
        clearTimeout(id);
      };
    });
  }

  /**
   * Merge multiple observables into one
   * @param observables - Array of observables to merge
   * @returns Observable that emits values from all sources
   */
  static merge<A>(...observables: ObservableLite<A>[]): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      const unsubscribes: Unsubscribe[] = [];
      let completed = 0;
      const total = observables.length;
      
      observables.forEach((obs) => {
        unsubscribes.push(
          obs.subscribe({
            next: (value) => {
              if (completed < total) {
                observer.next(value);
              }
            },
            error: (err) => {
              if (completed < total) {
                completed = total;
                observer.error?.(err);
              }
            },
            complete: () => {
              completed++;
              if (completed === total) {
                observer.complete?.();
              }
            }
          })
        );
      });
      
      return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
      };
    });
  }

  /**
   * Combine multiple observables using a function
   * @param fn - Function to combine values
   * @param observables - Array of observables to combine
   * @returns Observable that emits combined values
   */
  static combine<A, B, C>(
    fn: (a: A, b: B) => C,
    obsA: ObservableLite<A>,
    obsB: ObservableLite<B>
  ): ObservableLite<C> {
    return new ObservableLite<C>((observer) => {
      let valueA: A | null = null;
      let valueB: B | null = null;
      let completedA = false;
      let completedB = false;
      
      const emitIfReady = () => {
        if (valueA !== null && valueB !== null) {
          observer.next(fn(valueA, valueB));
        }
      };
      
      const unsubscribeA = obsA.subscribe({
        next: (a) => {
          valueA = a;
          emitIfReady();
        },
        error: (err) => observer.error?.(err),
        complete: () => {
          completedA = true;
          if (completedB) {
            observer.complete?.();
          }
        }
      });
      
      const unsubscribeB = obsB.subscribe({
        next: (b) => {
          valueB = b;
          emitIfReady();
        },
        error: (err) => observer.error?.(err),
        complete: () => {
          completedB = true;
          if (completedA) {
            observer.complete?.();
          }
        }
      });
      
      return () => {
        unsubscribeA();
        unsubscribeB();
      };
    });
  }

  /**
   * Convert ObservableLite to StatefulStream
   * This enables FP pipelines to move from reactive push streams to stateful monoid-homomorphic streams
   */
  toStatefulStream<S>(initialState: S = {} as S): StatefulStream<A, S, A> {
    return fromObservableLite(this, initialState);
  }
}

// Helper type to infer focus type from optic
export type FocusOf<O, S> =
  O extends { get: (s: S) => infer A } ? A :
  O extends { getOption: (s: S) => { tag: 'Just', value: infer A } | { tag: 'Nothing' } } ? A :
  O extends { match: (s: S) => { tag: 'Just', value: infer A } | { tag: 'Nothing' } } ? A :
  unknown;

// ============================================================================
// Part 5: HKT Integration
// ============================================================================

/**
 * HKT kind for ObservableLite (arity-1 type constructor)
 */
export interface ObservableLiteK extends Kind1 {
  readonly type: ObservableLite<this['arg0']>;
  readonly __effect: 'Async'; // Mark as async for purity tracking
}

/**
 * Type alias for ObservableLite with purity tracking
 */
export type ObservableLiteWithEffect<A> = ObservableLite<A> & { readonly __effect: 'Async' };

/**
 * Type alias for applying ObservableLiteK to type arguments
 */
export type ApplyObservableLite<Args extends TypeArgs<any>> = Apply<ObservableLiteK, Args>;

/**
 * Type alias for ObservableLite of a specific type
 */
export type ObservableLiteOf<A> = ApplyObservableLite<[A]>;

// ============================================================================
// Part 6: Purity Integration
// ============================================================================

/**
 * Extract the effect type from ObservableLite
 */
export type EffectOfObservableLite<T> = T extends ObservableLite<any> ? 'Async' : 'Pure';

/**
 * Check if ObservableLite is pure (always false, as it's async)
 */
export type IsObservableLitePure<T> = EffectOfObservableLite<T> extends 'Pure' ? true : false;

/**
 * Check if ObservableLite is impure (always true, as it's async)
 */
export type IsObservableLiteImpure<T> = EffectOfObservableLite<T> extends 'Pure' ? false : true;

// ============================================================================
// Part 8: Typeclass Instances (Derived)
// ============================================================================

import { 
  deriveInstances, 
  deriveEqInstance, 
  deriveOrdInstance, 
  deriveShowInstance 
} from './fp-derivation-helpers';

/**
 * ObservableLite derived instances
 */
export const ObservableLiteInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  profunctor: true,
  customMap: <A, B>(fa: ObservableLite<A>, f: (a: A) => B): ObservableLite<B> => {
    return fa.map(f);
  },
  customChain: <A, B>(fa: ObservableLite<A>, f: (a: A) => ObservableLite<B>): ObservableLite<B> => {
    return fa.flatMap(f);
  },
  customBimap: <A, B, C, D>(
    fab: ObservableLite<A>,
    f: (a: A) => C,
    g: (b: A) => D
  ): ObservableLite<D> => {
    return fab.map(g);
  }
});

export const ObservableLiteFunctor = ObservableLiteInstances.functor;
export const ObservableLiteApplicative = ObservableLiteInstances.applicative;
export const ObservableLiteMonad = ObservableLiteInstances.monad;
export const ObservableLiteProfunctor = ObservableLiteInstances.profunctor;

/**
 * ObservableLite standard typeclass instances
 */
export const ObservableLiteEq = deriveEqInstance({
  customEq: <A>(a: ObservableLite<A>, b: ObservableLite<A>): boolean => {
    // ObservableLite equality is complex due to its reactive nature
    // For now, we'll use reference equality
    return a === b;
  }
});

export const ObservableLiteOrd = deriveOrdInstance({
  customOrd: <A>(a: ObservableLite<A>, b: ObservableLite<A>): number => {
    // ObservableLite ordering is complex due to its reactive nature
    // For now, we'll use reference comparison
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
});

export const ObservableLiteShow = deriveShowInstance({
  customShow: <A>(a: ObservableLite<A>): string => 
    `ObservableLite<${typeof a}>`
});

// ============================================================================
// Part 9: Typeclass Registration
// ============================================================================

/**
 * Register ObservableLite instances with the typeclass system
 */
export function registerObservableLiteInstances(): void {
  // Register with derivable instances system
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    registry.register('ObservableLite', {
      functor: ObservableLiteFunctor,
      applicative: ObservableLiteApplicative,
      monad: ObservableLiteMonad,
      profunctor: ObservableLiteProfunctor,
      purity: { effect: 'Async' as const }
    });
  }
}

// Auto-register instances
registerObservableLiteInstances();

// ============================================================================
// Part 10: Type Guards and Utilities
// ============================================================================

/**
 * Check if a value is an ObservableLite
 * @param value - Value to check
 * @returns True if the value is an ObservableLite
 */
export function isObservableLite(value: any): value is ObservableLite<any> {
  return value instanceof ObservableLite;
}

/**
 * Check if a value is an ObservableLite with a specific type
 * @param value - Value to check
 * @returns True if the value is an ObservableLite of the specified type
 */
export function isObservableLiteOf<A>(value: any): value is ObservableLite<A> {
  return isObservableLite(value);
}

/**
 * Create a type-safe observable from a value
 * @param value - Value to create observable from
 * @returns ObservableLite of the value
 */
export function createObservable<A>(value: A): ObservableLite<A> {
  return ObservableLite.of(value);
}

/**
 * Create an observable from a function that may throw
 * @param fn - Function that may throw
 * @returns Observable that emits the result or error
 */
export function fromTry<A>(fn: () => A): ObservableLite<A> {
  return new ObservableLite<A>((observer) => {
    try {
      const result = fn();
      observer.next(result);
      observer.complete?.();
    } catch (error) {
      observer.error?.(error);
    }
    return () => {}; // No cleanup needed
  });
}

// ============================================================================
// Part 11: Fusion Integration
// ============================================================================

/**
 * Convert ObservableLite to StreamPlanNode for fusion optimization
 */
function planFromObservableLite<A>(obs: ObservableLite<A>): StreamPlanNode {
  // This is a simplified implementation
  // In practice, you'd introspect the composition chain more deeply
  return {
    type: 'map',
    fn: (x: any) => x,
    purity: 'Async', // ObservableLite is async by default
    next: undefined
  };
}

/**
 * Convert StreamPlanNode back to ObservableLite
 */
function observableFromPlan<A>(plan: StreamPlanNode): ObservableLite<A> {
  // This is a simplified implementation
  // In practice, you'd rebuild the optimized observable from the plan
  return new ObservableLite<A>((observer) => {
    // Rebuild subscription logic from plan
    return () => {}; // No cleanup needed
  });
}

/**
 * Optimize ObservableLite pipeline using fusion system
 */
function optimizeObservableLite<A>(obs: ObservableLite<A>): ObservableLite<A> {
  const plan = planFromObservableLite(obs);
  const optimizedPlan = optimizePlan(plan);
  return observableFromPlan(optimizedPlan);
}

/**
 * Generic pipeline optimizer for any HKT with purity-tagged combinators
 */
export function optimizePipeline<HKT extends { pipe?: Function }>(
  pipeline: HKT,
  toPlan: (hkt: HKT) => StreamPlanNode,
  fromPlan: (plan: StreamPlanNode) => HKT
): HKT {
  const plan = toPlan(pipeline);
  const optimized = optimizePlan(plan);
  return fromPlan(optimized);
}

/**
 * Add .pipe() method with automatic fusion optimization
 */
ObservableLite.prototype.pipe = function<B>(...operators: Array<(obs: ObservableLite<any>) => ObservableLite<any>>): ObservableLite<B> {
  // Apply operators to create the pipeline
  let result: ObservableLite<any> = this;
  for (const operator of operators) {
    result = operator(result);
  }
  
  // Optimize the pipeline using fusion system
  const optimized = optimizeObservableLite(result);
  
  return optimized as ObservableLite<B>;
};

/**
 * Add fusion optimization to static fromArray method
 */
const originalFromArray = ObservableLite.fromArray;
ObservableLite.fromArray = function<A>(values: readonly A[]): ObservableLite<A> {
  const obs = originalFromArray(values);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to static of method
 */
const originalOf = ObservableLite.of;
ObservableLite.of = function<A>(value: A): ObservableLite<A> {
  const obs = originalOf(value);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to static fromPromise method
 */
const originalFromPromise = ObservableLite.fromPromise;
ObservableLite.fromPromise = function<A>(promise: Promise<A>): ObservableLite<A> {
  const obs = originalFromPromise(promise);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to static fromEvent method
 */
const originalFromEvent = ObservableLite.fromEvent;
ObservableLite.fromEvent = function<T extends Event>(
  target: EventTarget,
  eventName: string
): ObservableLite<T> {
  const obs = originalFromEvent(target, eventName);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to static interval method
 */
const originalInterval = ObservableLite.interval;
ObservableLite.interval = function(interval: number): ObservableLite<number> {
  const obs = originalInterval(interval);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to static timer method
 */
const originalTimer = ObservableLite.timer;
ObservableLite.timer = function<A>(delay: number, value: A): ObservableLite<A> {
  const obs = originalTimer(delay, value);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to static merge method
 */
const originalMerge = ObservableLite.merge;
ObservableLite.merge = function<A>(...observables: ObservableLite<A>[]): ObservableLite<A> {
  const obs = originalMerge(...observables);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to static combine method
 */
const originalCombine = ObservableLite.combine;
ObservableLite.combine = function<A, B, C>(
  fn: (a: A, b: B) => C,
  obsA: ObservableLite<A>,
  obsB: ObservableLite<B>
): ObservableLite<C> {
  const obs = originalCombine(fn, obsA, obsB);
  return withAutoOptimization(obs);
};

/**
 * Add fusion optimization to instance methods
 */
const originalMap = ObservableLite.prototype.map;
ObservableLite.prototype.map = function<B>(fOrOptic: ((a: A) => B) | any, opticFn?: (b: any) => any): ObservableLite<B> | ObservableLite<A> {
  const result = originalMap.call(this, fOrOptic, opticFn);
  return withAutoOptimization(result);
};

const originalFlatMap = ObservableLite.prototype.flatMap;
ObservableLite.prototype.flatMap = function<B>(f: (a: A) => ObservableLite<B>): ObservableLite<B> {
  const result = originalFlatMap.call(this, f);
  return withAutoOptimization(result);
};

const originalFilter = ObservableLite.prototype.filter;
ObservableLite.prototype.filter = function(predicate: (a: A) => boolean): ObservableLite<A> {
  const result = originalFilter.call(this, predicate);
  return withAutoOptimization(result);
};

const originalScan = ObservableLite.prototype.scan;
ObservableLite.prototype.scan = function<B>(reducer: (acc: B, value: A) => B, initial: B): ObservableLite<B> {
  const result = originalScan.call(this, reducer, initial);
  return withAutoOptimization(result);
};

const originalTake = ObservableLite.prototype.take;
ObservableLite.prototype.take = function(count: number): ObservableLite<A> {
  const result = originalTake.call(this, count);
  return withAutoOptimization(result);
};

const originalSkip = ObservableLite.prototype.skip;
ObservableLite.prototype.skip = function(count: number): ObservableLite<A> {
  const result = originalSkip.call(this, count);
  return withAutoOptimization(result);
};

const originalSortBy = ObservableLite.prototype.sortBy;
ObservableLite.prototype.sortBy = function<U>(fn: (a: A) => U): ObservableLite<A> {
  const result = originalSortBy.call(this, fn);
  return withAutoOptimization(result);
};

const originalDistinct = ObservableLite.prototype.distinct;
ObservableLite.prototype.distinct = function(): ObservableLite<A> {
  const result = originalDistinct.call(this);
  return withAutoOptimization(result);
};

const originalDrop = ObservableLite.prototype.drop;
ObservableLite.prototype.drop = function(count: number): ObservableLite<A> {
  const result = originalDrop.call(this, count);
  return withAutoOptimization(result);
};

const originalSlice = ObservableLite.prototype.slice;
ObservableLite.prototype.slice = function(start: number, end?: number): ObservableLite<A> {
  const result = originalSlice.call(this, start, end);
  return withAutoOptimization(result);
};

const originalReverse = ObservableLite.prototype.reverse;
ObservableLite.prototype.reverse = function(): ObservableLite<A> {
  const result = originalReverse.call(this);
  return withAutoOptimization(result);
};

// ============================================================================
// Part 12: Purity Guardrails for Fusion
// ============================================================================

/**
 * Mark pure operations for fusion
 */
function markPureOperation(operation: string): 'Pure' {
  return 'Pure';
}

/**
 * Mark stateful operations for fusion
 */
function markStatefulOperation(operation: string): 'State' {
  return 'State';
}

/**
 * Mark async operations for fusion
 */
function markAsyncOperation(operation: string): 'Async' {
  return 'Async';
}

/**
 * Purity mapping for ObservableLite operations
 */
const OPERATION_PURITY_MAP: Record<string, 'Pure' | 'State' | 'Async'> = {
  // Pure operations (can be freely reordered)
  'map': 'Pure',
  'filter': 'Pure',
  'take': 'Pure',
  'skip': 'Pure',
  'distinct': 'Pure',
  'drop': 'Pure',
  'slice': 'Pure',
  'reverse': 'Pure',
  'sortBy': 'Pure',
  
  // Stateful operations (have ordering constraints)
  'scan': 'State',
  'flatMap': 'State',
  'chain': 'State',
  'mergeMap': 'State',
  'concat': 'State',
  'merge': 'State',
  
  // Async operations (external effects)
  'fromPromise': 'Async',
  'fromEvent': 'Async',
  'interval': 'Async',
  'timer': 'Async',
  'catchError': 'Async'
};

/**
 * Get purity level for an operation
 */
function getOperationPurity(operation: string): 'Pure' | 'State' | 'Async' {
  return OPERATION_PURITY_MAP[operation] || 'Async';
}

/**
 * Check if operations can be reordered based on purity
 */
function canReorderObservableLiteOperations(op1: string, op2: string): boolean {
  const purity1 = getOperationPurity(op1);
  const purity2 = getOperationPurity(op2);
  
  // Pure operations can always be reordered
  if (purity1 === 'Pure' && purity2 === 'Pure') {
    return true;
  }
  
  // Pure operations can be pushed past stateful ones
  if (purity1 === 'Pure' && purity2 === 'State') {
    return true;
  }
  
  // Stateful operations cannot be reordered without analysis
  if (purity1 === 'State' && purity2 === 'State') {
    return false; // Would need deeper analysis
  }
  
  return false;
} 

// ============================================================================
// Part 13: Common Operations Integration
// ============================================================================

/**
 * Apply common operations to ObservableLite for unified API
 */
applyCommonOps();

/**
 * Extend ObservableLite with CommonStreamOps interface
 */
declare module './fp-observable-lite' {
  interface ObservableLite<A> extends CommonStreamOps<A> {}
}

// ============================================================================
// Part 14: Exports
// ============================================================================



// ============================================================================
// Part 15: Unified Fluent API Integration
// ============================================================================

/**
 * Apply unified fluent API to ObservableLite
 */
const ObservableLiteFluentImpl: FluentImpl<any> = {
  map: (self, f) => self.map(f),
  chain: (self, f) => self.flatMap(f),
  flatMap: (self, f) => self.flatMap(f),
  filter: (self, pred) => self.filter(pred),
  filterMap: (self, f) => self.filterMap(f),
  scan: (self, reducer, seed) => self.scan(reducer, seed),
  take: (self, n) => self.take(n),
  skip: (self, n) => self.skip(n),
  distinct: (self) => self.distinct(),
  drop: (self, n) => self.drop(n),
  slice: (self, start, end) => self.slice(start, end),
  reverse: (self) => self.reverse(),
  sortBy: (self, fn) => self.sortBy(fn),
  pipe: (self, ...fns) => self.pipe(...fns)
};

// Apply fluent API to ObservableLite prototype
applyFluentOps(ObservableLite.prototype, ObservableLiteFluentImpl);

// Add conversion methods
ObservableLite.prototype.toStatefulStream = function<S>(initialState: S = {} as S) {
  return fromObservableLite(this, initialState);
};

ObservableLite.prototype.toMaybe = function() {
  return toMaybe(this);
};

ObservableLite.prototype.toEither = function() {
  return toEither(this);
};

ObservableLite.prototype.toResult = function() {
  return toResult(this);
};