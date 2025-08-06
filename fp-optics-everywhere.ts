/**
 * Optics Everywhere & Observable-Lite FP Ergonomics
 * 
 * This module provides unified optics-driven transformations across all ADTs,
 * collections, and Observables with pipe-free, optics-aware FP programming.
 */

import type { 
  Kind, 
  Apply, 
  Type,
  Kind1, 
  Kind2, 
  Kind3,
  ArrayK, 
  MaybeK, 
  EitherK, 
  FunctionK,
  ObservableLiteK
} from './fp-hkt';

import type {
  Functor, 
  Applicative, 
  Monad, 
  Bifunctor,
  Profunctor
} from './fp-typeclasses';

import type {
  EffectTag,
  EffectOf,
  Pure,
  Async
} from './fp-purity';

import {
  Lens,
  Prism,
  Optional,
  Iso,
  Traversal,
  lens,
  prism,
  optional,
  iso,
  traversal,
  FocusOf
} from './fp-profunctor-optics';

// ============================================================================
// Optics Factories for All Types
// ============================================================================

/**
 * Optics factory interface for all types
 */
export interface OpticsFactory<T> {
  /**
   * Create a lens to a field (for product types)
   */
  lens<K extends keyof T>(key: K): Lens<T, T, T[K], T[K]>;
  
  /**
   * Create a prism to a variant (for sum types)
   */
  prism<V extends string>(variant: V): Prism<T, T, any, any>;
  
  /**
   * Create an optional to a field that may not exist
   */
  optional<K extends keyof T>(key: K): Optional<T, T, T[K], T[K]>;
  
  /**
   * Create a traversal to multiple elements
   */
  traversal(): Traversal<T, T, any, any>;
}

/**
 * Extend any object with optics factories
 */
export function withOptics<T>(obj: T): T & OpticsFactory<T> {
  return {
    ...obj,
    lens: <K extends keyof T>(key: K): Lens<T, T, T[K], T[K]> => {
      return lens(
        (value: T) => value[key],
        (newValue: T[K], value: T) => ({ ...value, [key]: newValue })
      );
    },
    
    prism: <V extends string>(variant: V): Prism<T, T, any, any> => {
      return prism(
        (value: T) => {
          // Check if value has a tag property and matches variant
          if (value && typeof value === 'object' && 'tag' in value) {
            return (value as any).tag === variant 
              ? { tag: 'Just', value: (value as any).value || value }
              : { tag: 'Nothing' };
          }
          return { tag: 'Nothing' };
        },
        (value: any) => ({ tag: variant, value } as any)
      );
    },
    
    optional: <K extends keyof T>(key: K): Optional<T, T, T[K], T[K]> => {
      return optional(
        (value: T) => {
          const fieldValue = value[key];
          return fieldValue !== undefined && fieldValue !== null
            ? { tag: 'Just', value: fieldValue }
            : { tag: 'Nothing' };
        },
        (newValue: T[K], value: T) => ({ ...value, [key]: newValue })
      );
    },
    
    traversal: (): Traversal<T, T, any, any> => {
      // Default traversal for single values
      return traversal(
        (value: T) => [value],
        (f: (a: any) => any, value: T) => f(value) as T
      );
    }
  };
}

// ============================================================================
// ADT Optics Integration
// ============================================================================

/**
 * Maybe optics factory
 */
export const MaybeOptics = withOptics({
  // Lens to the value when it exists
  value: lens(
    (maybe: any) => maybe.value,
    (value: any, maybe: any) => ({ ...maybe, value })
  ),
  
  // Prism to Just variant
  Just: prism('Just'),
  
  // Prism to Nothing variant
  Nothing: prism('Nothing'),
  
  // Optional to the value
  valueOptional: optional('value')
});

/**
 * Either optics factory
 */
export const EitherOptics = withOptics({
  // Lens to the left value
  left: lens(
    (either: any) => either.value,
    (value: any, either: any) => ({ ...either, value })
  ),
  
  // Lens to the right value
  right: lens(
    (either: any) => either.value,
    (value: any, either: any) => ({ ...either, value })
  ),
  
  // Prism to Left variant
  Left: prism('Left'),
  
  // Prism to Right variant
  Right: prism('Right'),
  
  // Optional to the left value
  leftOptional: optional('value'),
  
  // Optional to the right value
  rightOptional: optional('value')
});

/**
 * Result optics factory
 */
export const ResultOptics = withOptics({
  // Lens to the success value
  success: lens(
    (result: any) => result.value,
    (value: any, result: any) => ({ ...result, value })
  ),
  
  // Lens to the error value
  error: lens(
    (result: any) => result.value,
    (value: any, result: any) => ({ ...result, value })
  ),
  
  // Prism to Success variant
  Success: prism('Success'),
  
  // Prism to Error variant
  Error: prism('Error'),
  
  // Optional to the success value
  successOptional: optional('value'),
  
  // Optional to the error value
  errorOptional: optional('value')
});

// ============================================================================
// Collection Optics
// ============================================================================

/**
 * Array optics factory
 */
export const ArrayOptics = withOptics({
  // Traversal to all elements
  elements: traversal(
    (arr: any[]) => arr,
    (f: (a: any) => any, arr: any[]) => arr.map(f)
  ),
  
  // Lens to element at index
  at: (index: number) => lens(
    (arr: any[]) => arr[index],
    (value: any, arr: any[]) => {
      const newArr = [...arr];
      newArr[index] = value;
      return newArr;
    }
  ),
  
  // Optional to element at index
  atOptional: (index: number) => optional(
    (arr: any[]) => {
      return index >= 0 && index < arr.length
        ? { tag: 'Just', value: arr[index] }
        : { tag: 'Nothing' };
    },
    (value: any, arr: any[]) => {
      const newArr = [...arr];
      newArr[index] = value;
      return newArr;
    }
  ),
  
  // Traversal to first element
  head: traversal(
    (arr: any[]) => arr.length > 0 ? [arr[0]] : [],
    (f: (a: any) => any, arr: any[]) => {
      if (arr.length === 0) return arr;
      const newArr = [...arr];
      newArr[0] = f(newArr[0]);
      return newArr;
    }
  ),
  
  // Traversal to all elements except first
  tail: traversal(
    (arr: any[]) => arr.slice(1),
    (f: (a: any) => any, arr: any[]) => {
      if (arr.length === 0) return arr;
      return [arr[0], ...arr.slice(1).map(f)];
    }
  )
});

/**
 * Map optics factory
 */
export const MapOptics = withOptics({
  // Traversal to all values
  values: traversal(
    (map: Map<any, any>) => Array.from(map.values()),
    (f: (a: any) => any, map: Map<any, any>) => {
      const newMap = new Map();
      for (const [key, value] of map.entries()) {
        newMap.set(key, f(value));
      }
      return newMap;
    }
  ),
  
  // Traversal to all keys
  keys: traversal(
    (map: Map<any, any>) => Array.from(map.keys()),
    (f: (a: any) => any, map: Map<any, any>) => {
      const newMap = new Map();
      for (const [key, value] of map.entries()) {
        newMap.set(f(key), value);
      }
      return newMap;
    }
  ),
  
  // Traversal to all entries
  entries: traversal(
    (map: Map<any, any>) => Array.from(map.entries()),
    (f: (a: any) => any, map: Map<any, any>) => {
      const newMap = new Map();
      for (const [key, value] of map.entries()) {
        const [newKey, newValue] = f([key, value]);
        newMap.set(newKey, newValue);
      }
      return newMap;
    }
  ),
  
  // Optional to value at key
  at: (key: any) => optional(
    (map: Map<any, any>) => {
      return map.has(key)
        ? { tag: 'Just', value: map.get(key) }
        : { tag: 'Nothing' };
    },
    (value: any, map: Map<any, any>) => {
      const newMap = new Map(map);
      newMap.set(key, value);
      return newMap;
    }
  )
});

// ============================================================================
// Observable-Lite FP Ergonomics
// ============================================================================

/**
 * Enhanced ObservableLite with optics and FP ergonomics
 */
export class ObservableLiteWithOptics<A> {
  private _value: A;
  private _subscribers: ((value: A) => void)[] = [];

  constructor(value: A) {
    this._value = value;
  }

  /**
   * Subscribe to value changes
   */
  subscribe(observer: (value: A) => void): () => void {
    this._subscribers.push(observer);
    observer(this._value);
    
    return () => {
      const index = this._subscribers.indexOf(observer);
      if (index > -1) {
        this._subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Update the value and notify subscribers
   */
  next(value: A): void {
    this._value = value;
    this._subscribers.forEach(subscriber => subscriber(value));
  }

  /**
   * Functor map - transform values
   */
  map<B>(f: (a: A) => B): ObservableLiteWithOptics<B> {
    const observable = new ObservableLiteWithOptics<B>(f(this._value));
    
    this.subscribe(value => {
      observable.next(f(value));
    });
    
    return observable;
  }

  /**
   * Monad chain - flatMap
   */
  chain<B>(f: (a: A) => ObservableLiteWithOptics<B>): ObservableLiteWithOptics<B> {
    const observable = f(this._value);
    
    this.subscribe(value => {
      const newObservable = f(value);
      newObservable.subscribe(newValue => {
        observable.next(newValue);
      });
    });
    
    return observable;
  }

  /**
   * Bifunctor bichain - handle both success and error cases
   */
  bichain<B, C>(
    leftFn: (a: A) => ObservableLiteWithOptics<C>,
    rightFn: (a: A) => ObservableLiteWithOptics<B>
  ): ObservableLiteWithOptics<B | C> {
    // For simplicity, treat all values as right case
    // In a real implementation, you'd check if A is an Either/Result
    return rightFn(this._value);
  }

  /**
   * Filter values
   */
  filter(predicate: (a: A) => boolean): ObservableLiteWithOptics<A> {
    const observable = new ObservableLiteWithOptics<A>(this._value);
    
    this.subscribe(value => {
      if (predicate(value)) {
        observable.next(value);
      }
    });
    
    return observable;
  }

  /**
   * Transform via lens
   */
  over<S, B>(optic: Lens<S, S, A, B>, f: (a: A) => B): ObservableLiteWithOptics<S> {
    return this.map(value => optic.over(f, value as S));
  }

  /**
   * Preview via prism
   */
  preview<S>(optic: Prism<S, S, A, A>): ObservableLiteWithOptics<{ tag: 'Just'; value: A } | { tag: 'Nothing' }> {
    return this.map(value => optic.preview(value as S));
  }

  /**
   * Transform via optional
   */
  overOptional<S, B>(optic: Optional<S, S, A, B>, f: (a: A) => B): ObservableLiteWithOptics<S> {
    return this.map(value => optic.over(f, value as S));
  }

  /**
   * Get current value
   */
  getValue(): A {
    return this._value;
  }

  /**
   * Static factory methods
   */
  static of<A>(value: A): ObservableLiteWithOptics<A> {
    return new ObservableLiteWithOptics(value);
  }

  static fromArray<A>(array: A[]): ObservableLiteWithOptics<A[]> {
    return new ObservableLiteWithOptics(array);
  }

  static fromPromise<A>(promise: Promise<A>): ObservableLiteWithOptics<A> {
    const observable = new ObservableLiteWithOptics<A>(null as any);
    
    promise.then(value => {
      observable.next(value);
    }).catch(error => {
      // Handle error case
      observable.next(error as any);
    });
    
    return observable;
  }
}

// ============================================================================
// Pattern Matching with Optics
// ============================================================================

/**
 * Enhanced matcher with optics support
 */
export interface OpticsMatcher<T, R> {
  /**
   * Match with optic focus
   */
  case<O, F>(optic: O, fn: (focused: FocusOf<O, T>) => R): OpticsMatcher<T, R>;
  
  /**
   * Default case
   */
  default(fn: (value: T) => R): R;
}

/**
 * Create a matcher with optics support
 */
export function matchWithOptics<T>(value: T): OpticsMatcher<T, any> {
  const cases: Array<{ optic: any; fn: (value: any) => any }> = [];
  let defaultCase: ((value: T) => any) | null = null;

  return {
    case<O, F>(optic: O, fn: (focused: FocusOf<O, T>) => any): OpticsMatcher<T, any> {
      cases.push({ optic, fn });
      return this;
    },
    
    default(fn: (value: T) => any): any {
      defaultCase = fn;
      
      // Try each case
      for (const { optic, fn: caseFn } of cases) {
        if (optic && typeof optic.get === 'function') {
          // Lens case
          try {
            const focused = optic.get(value);
            return caseFn(focused);
          } catch {
            continue;
          }
        } else if (optic && typeof optic.match === 'function') {
          // Prism case
          const match = optic.match(value);
          if (match && match.tag === 'Just') {
            return caseFn(match.value);
          }
        } else if (optic && typeof optic.preview === 'function') {
          // Optional case
          const preview = optic.preview(value);
          if (preview && preview.tag === 'Just') {
            return caseFn(preview.value);
          }
        }
      }
      
      // Default case
      return defaultCase ? defaultCase(value) : value;
    }
  };
}

// ============================================================================
// Cross-Type Fusion
// ============================================================================

/**
 * Cross-type optics fusion
 */
export function fuseOptics<T, U, V>(
  outerOptic: Lens<T, T, U, U>,
  innerOptic: Lens<U, U, V, V>
): Lens<T, T, V, V> {
  return outerOptic.then(innerOptic);
}

/**
 * Observable with nested ADT optics
 */
export function observableWithNestedOptics<T, U>(
  observable: ObservableLiteWithOptics<T>,
  adtOptic: Lens<T, T, U, U>
): ObservableLiteWithOptics<U> {
  return observable.map(value => adtOptic.get(value));
}

// ============================================================================
// Profunctor Registration
// ============================================================================

/**
 * Register optics as Profunctor instances
 */
export function registerOpticsProfunctors(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    // Register Lens as Profunctor
    registry.register('Lens', {
      profunctor: {
        dimap: <A, B, C, D>(
          p: Lens<A, B, C, D>,
          f: (c: C) => A,
          g: (b: B) => D
        ): Lens<C, D, C, D> => {
          return lens(
            (c: C) => g(p.get(f(c))),
            (d: D, c: C) => g(p.set(d, f(c)))
          );
        }
      },
      purity: { effect: 'Pure' as const }
    });
    
    // Register Prism as Profunctor
    registry.register('Prism', {
      profunctor: {
        dimap: <A, B, C, D>(
          p: Prism<A, B, C, D>,
          f: (c: C) => A,
          g: (b: B) => D
        ): Prism<C, D, C, D> => {
          return prism(
            (c: C) => {
              const match = p.match(f(c));
              return match.tag === 'Just' 
                ? { tag: 'Just', value: g(match.value) }
                : { tag: 'Nothing' };
            },
            (d: D) => g(p.build(d))
          );
        }
      },
      purity: { effect: 'Pure' as const }
    });
    
    // Register Optional as Profunctor
    registry.register('Optional', {
      profunctor: {
        dimap: <A, B, C, D>(
          p: Optional<A, B, C, D>,
          f: (c: C) => A,
          g: (b: B) => D
        ): Optional<C, D, C, D> => {
          return optional(
            (c: C) => {
              const get = p.get(f(c));
              return get.tag === 'Just'
                ? { tag: 'Just', value: g(get.value) }
                : { tag: 'Nothing' };
            },
            (d: D, c: C) => g(p.set(d, f(c)))
          );
        }
      },
      purity: { effect: 'Pure' as const }
    });
  }
}

// Auto-register on module load
registerOpticsProfunctors();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create optics for any object
 */
export function createOptics<T>(obj: T): OpticsFactory<T> {
  return withOptics(obj);
}

/**
 * Create optics for a specific type
 */
export function createTypeOptics<T>(): OpticsFactory<T> {
  return withOptics({} as T);
}

/**
 * Compose multiple optics
 */
export function composeOptics<T, U, V>(
  first: Lens<T, T, U, U>,
  second: Lens<U, U, V, V>
): Lens<T, T, V, V> {
  return first.then(second);
}

/**
 * Create a lens to a nested property
 */
export function lensTo<T, K extends keyof T>(key: K): Lens<T, T, T[K], T[K]> {
  return lens(
    (obj: T) => obj[key],
    (value: T[K], obj: T) => ({ ...obj, [key]: value })
  );
}

/**
 * Create a prism to a variant
 */
export function prismTo<T, V extends string>(variant: V): Prism<T, T, any, any> {
  return prism(
    (value: T) => {
      if (value && typeof value === 'object' && 'tag' in value) {
        return (value as any).tag === variant
          ? { tag: 'Just', value: (value as any).value || value }
          : { tag: 'Nothing' };
      }
      return { tag: 'Nothing' };
    },
    (value: any) => ({ tag: variant, value } as any)
  );
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value has optics
 */
export function hasOptics(value: any): value is { lens: Function; prism: Function; optional: Function; traversal: Function } {
  return value && 
         typeof value.lens === 'function' &&
         typeof value.prism === 'function' &&
         typeof value.optional === 'function' &&
         typeof value.traversal === 'function';
}

/**
 * Check if value is an Observable with optics
 */
export function isObservableWithOptics(value: any): value is ObservableLiteWithOptics<any> {
  return value instanceof ObservableLiteWithOptics;
}

/**
 * Check if value is an ADT
 */
export function isADT(value: any): value is { tag: string; value?: any } {
  return value && typeof value === 'object' && 'tag' in value;
} 