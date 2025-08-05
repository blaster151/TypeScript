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
   * Supports Lens, Prism, Optional, and compositions.
   * Type inference reflects the optic’s focus type.
   */
  over<O, B>(
    optic: O,
    fn: (focus: FocusOf<O, A>) => FocusOf<O, A>
  ): ObservableLite<A> {
    return new ObservableLite<A>((observer) => {
      return this.subscribe({
        next: (value) => {
          if (isLens(optic)) {
            const lens = (optic as unknown) as { get: (s: A) => any; set: (b: any, s: A) => A };
            const focused = lens.get(value);
            observer.next(lens.set(fn(focused), value));
          } else if (isOptional(optic)) {
            const optional = (optic as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' }; set: (b: any, s: A) => A };
            const maybe = optional.getOption(value);
            if (maybe && maybe.tag === 'Just') {
              observer.next(optional.set(fn(maybe.value), value));
            } else {
              observer.next(value);
            }
          } else if (isPrism(optic)) {
            const prism = (optic as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' }; build: (b: any) => A };
            const match = prism.match(value);
            if (match && match.tag === 'Just') {
              observer.next(prism.build(fn(match.value)));
            } else {
              observer.next(value);
            }
          } else {
            observer.next(value);
          }
        },
        error: observer.error,
        complete: observer.complete,
      });
    });
  }

  /**
   * Extract the focused value for every emission.
   * Supports Lens, Prism, Optional, and compositions.
   * Type inference reflects the optic’s focus type.
   */
  preview<O>(optic: O): ObservableLite<FocusOf<O, A>> {
    return new ObservableLite<FocusOf<O, A>>((observer) => {
      return this.subscribe({
        next: (value) => {
          if (isLens(optic)) {
            const lens = (optic as unknown) as { get: (s: A) => any };
            observer.next(lens.get(value));
          } else if (isOptional(optic)) {
            const optional = (optic as unknown) as { getOption: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
            const maybe = optional.getOption(value);
            if (maybe && maybe.tag === 'Just') observer.next(maybe.value);
          } else if (isPrism(optic)) {
            const prism = (optic as unknown) as { match: (s: A) => { tag: 'Just', value: any } | { tag: 'Nothing' } };
            const match = prism.match(value);
            if (match && match.tag === 'Just') observer.next(match.value);
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
// Part 7: Functor & Monad Instances
// ============================================================================

/**
 * Functor instance for ObservableLite
 * 
 * Laws:
 * 1. Identity: map(fa, x => x) = fa
 * 2. Composition: map(fa, f) |> map(_, g) = map(fa, x => g(f(x)))
 */
export const ObservableLiteFunctor: Functor<ObservableLiteK> = {
  map: <A, B>(fa: ObservableLite<A>, f: (a: A) => B): ObservableLite<B> => {
    return fa.map(f);
  }
};

/**
 * Applicative instance for ObservableLite
 * 
 * Laws:
 * 1. Identity: ap(pure(x => x), v) = v
 * 2. Homomorphism: ap(pure(f), pure(x)) = pure(f(x))
 * 3. Interchange: ap(u, pure(y)) = ap(pure(f => f(y)), u)
 * 4. Composition: ap(ap(ap(pure(f => g => x => f(g(x))), u), v), w) = ap(u, ap(v, w))
 */
export const ObservableLiteApplicative: Applicative<ObservableLiteK> = {
  ...ObservableLiteFunctor,
  of: <A>(a: A): ObservableLite<A> => ObservableLite.of(a),
  ap: <A, B>(fab: ObservableLite<(a: A) => B>, fa: ObservableLite<A>): ObservableLite<B> => {
    return ObservableLite.combine(
      (fn, value) => fn(value),
      fab,
      fa
    );
  }
};

/**
 * Monad instance for ObservableLite
 * 
 * Laws:
 * 1. Left Identity: chain(of(a), f) = f(a)
 * 2. Right Identity: chain(ma, of) = ma
 * 3. Associativity: chain(chain(ma, f), g) = chain(ma, x => chain(f(x), g))
 */
export const ObservableLiteMonad: Monad<ObservableLiteK> = {
  ...ObservableLiteApplicative,
  chain: <A, B>(fa: ObservableLite<A>, f: (a: A) => ObservableLite<B>): ObservableLite<B> => {
    return fa.flatMap(f);
  }
};

// ============================================================================
// Part 8: Utility Functions
// ============================================================================

/**
 * Create an observable from a function that returns a promise
 * @param fn - Function that returns a promise
 * @returns Observable that emits the resolved value
 */
export function fromAsync<A>(fn: () => Promise<A>): ObservableLite<A> {
  return ObservableLite.fromPromise(fn());
}

/**
 * Create an observable that emits values from an async generator
 * @param generator - Async generator function
 * @returns Observable that emits generator values
 */
export function fromAsyncGenerator<A>(generator: () => AsyncGenerator<A>): ObservableLite<A> {
  return new ObservableLite<A>((observer) => {
    let cancelled = false;
    
    (async () => {
      try {
        const gen = generator();
        while (!cancelled) {
          const result = await gen.next();
          if (result.done) {
            if (!cancelled) {
              observer.complete?.();
            }
            break;
          }
          if (!cancelled) {
            observer.next(result.value);
          }
        }
      } catch (error) {
        if (!cancelled) {
          observer.error?.(error);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  });
}

/**
 * Create an observable that emits values from a synchronous generator
 * @param generator - Synchronous generator function
 * @returns Observable that emits generator values
 */
export function fromGenerator<A>(generator: () => Generator<A>): ObservableLite<A> {
  return new ObservableLite<A>((observer) => {
    let cancelled = false;
    
    try {
      const gen = generator();
      while (!cancelled) {
        const result = gen.next();
        if (result.done) {
          if (!cancelled) {
            observer.complete?.();
          }
          break;
        }
        if (!cancelled) {
          observer.next(result.value);
        }
      }
    } catch (error) {
      if (!cancelled) {
        observer.error?.(error);
      }
    }
    
    return () => {
      cancelled = true;
    };
  });
}

/**
 * Create an observable that emits values from an iterable
 * @param iterable - Iterable to convert to observable
 * @returns Observable that emits iterable values
 */
export function fromIterable<A>(iterable: Iterable<A>): ObservableLite<A> {
  return ObservableLite.fromArray(Array.from(iterable));
}

/**
 * Create an observable that emits values from a callback-based API
 * @param subscribe - Function that sets up the callback-based subscription
 * @returns Observable that emits values from the callback
 */
export function fromCallback<A>(
  subscribe: (callback: (value: A) => void) => () => void
): ObservableLite<A> {
  return new ObservableLite<A>((observer) => {
    return subscribe((value) => {
      observer.next(value);
    });
  });
}

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

// All exports are already declared inline throughout the file 