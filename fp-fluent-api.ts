/**
 * Unified Fluent API Mixin
 * 
 * Provides a shared fluent API (.map, .chain, .filter, etc.) for all FP types:
 * - ObservableLite
 * - StatefulStream  
 * - Maybe
 * - Either
 * - Result
 * - And other ADTs
 * 
 * This enables consistent, type-safe operations across all FP types with
 * seamless FRP ↔ Rx interop.
 */

import { ObservableLite } from './fp-observable-lite';
import { StatefulStream } from './fp-stream-state';
import { Maybe, Just, Nothing } from './fp-maybe';
import { Either, Left, Right } from './fp-either-unified';
import { Result, Ok, Err } from './fp-result';

// ============================================================================
// Part 1: Shared Fluent API Interface
// ============================================================================

/**
 * Unified fluent operations interface for all FP types
 */
export interface FluentOps<T> {
  // Functor operations
  map<B>(f: (a: T) => B): any;
  
  // Monad operations  
  chain<B>(f: (a: T) => any): any;
  flatMap<B>(f: (a: T) => any): any;
  
  // Filter operations
  filter(pred: (a: T) => boolean): any;
  filterMap<B>(f: (a: T) => Maybe<B>): any;
  
  // Applicative operations
  ap<B>(fab: any): any;
  
  // Bifunctor operations (for Either, Result)
  bimap<L, R>(left: (l: L) => any, right: (r: R) => any): any;
  bichain<L, R>(left: (l: L) => any, right: (r: R) => any): any;
  
  // Stream-specific operations
  scan<B>(reducer: (acc: B, value: T) => B, seed: B): any;
  take(n: number): any;
  skip(n: number): any;
  distinct(): any;
  
  // Composition
  pipe<B>(...fns: Array<(a: any) => any>): any;
  
  // Conversion operations
  toObservableLite?(inputs?: Iterable<any>, initialState?: any): ObservableLite<any>;
  toStatefulStream?(initialState?: any): StatefulStream<any, any, any>;
  toMaybe?(): Maybe<T>;
  toEither?(): Either<any, T>;
  toResult?(): Result<any, T>;
}

/**
 * Extended fluent operations for stream types
 */
export interface StreamFluentOps<T> extends FluentOps<T> {
  // Stream-specific operations
  scan<B>(reducer: (acc: B, value: T) => B, seed: B): any;
  take(n: number): any;
  skip(n: number): any;
  distinct(): any;
  drop(n: number): any;
  slice(start: number, end?: number): any;
  reverse(): any;
  sortBy<B>(fn: (a: T) => B): any;
  
  // Conversion operations
  toObservableLite(inputs?: Iterable<any>, initialState?: any): ObservableLite<any>;
  toStatefulStream(initialState?: any): StatefulStream<any, any, any>;
}

/**
 * Extended fluent operations for ADT types
 */
export interface ADTFluentOps<T> extends FluentOps<T> {
  // ADT-specific operations
  match<B>(patterns: any): B;
  fold<B>(onLeft: (l: any) => B, onRight: (r: T) => B): B;
  getOrElse(defaultValue: T): T;
  orElse(alternative: any): any;
  
  // Conversion operations
  toMaybe(): Maybe<T>;
  toEither(): Either<any, T>;
  toResult(): Result<any, T>;
}

// ============================================================================
// Part 2: Fluent API Implementation
// ============================================================================

/**
 * Implementation interface for fluent operations
 */
export interface FluentImpl<T> {
  map?: (self: any, f: (a: T) => any) => any;
  chain?: (self: any, f: (a: T) => any) => any;
  flatMap?: (self: any, f: (a: T) => any) => any;
  filter?: (self: any, pred: (a: T) => boolean) => any;
  filterMap?: (self: any, f: (a: T) => Maybe<any>) => any;
  ap?: (self: any, fab: any) => any;
  bimap?: (self: any, left: (l: any) => any, right: (r: any) => any) => any;
  bichain?: (self: any, left: (l: any) => any, right: (r: any) => any) => any;
  scan?: (self: any, reducer: (acc: any, value: T) => any, seed: any) => any;
  take?: (self: any, n: number) => any;
  skip?: (self: any, n: number) => any;
  distinct?: (self: any) => any;
  drop?: (self: any, n: number) => any;
  slice?: (self: any, start: number, end?: number) => any;
  reverse?: (self: any) => any;
  sortBy?: (self: any, fn: (a: T) => any) => any;
  pipe?: (self: any, ...fns: Array<(a: any) => any>) => any;
}

/**
 * Apply fluent operations to a prototype
 */
export function applyFluentOps<T>(proto: any, impl: FluentImpl<T>): void {
  // Functor operations
  if (impl.map) {
    proto.map = function(f: (a: T) => any) {
      return impl.map!.call(this, this, f);
    };
  }
  
  // Monad operations
  if (impl.chain) {
    proto.chain = function(f: (a: T) => any) {
      return impl.chain!.call(this, this, f);
    };
  }
  
  if (impl.flatMap) {
    proto.flatMap = function(f: (a: T) => any) {
      return impl.flatMap!.call(this, this, f);
    };
  }
  
  // Filter operations
  if (impl.filter) {
    proto.filter = function(pred: (a: T) => boolean) {
      return impl.filter!.call(this, this, pred);
    };
  }
  
  if (impl.filterMap) {
    proto.filterMap = function(f: (a: T) => Maybe<any>) {
      return impl.filterMap!.call(this, this, f);
    };
  }
  
  // Applicative operations
  if (impl.ap) {
    proto.ap = function(fab: any) {
      return impl.ap!.call(this, this, fab);
    };
  }
  
  // Bifunctor operations
  if (impl.bimap) {
    proto.bimap = function(left: (l: any) => any, right: (r: any) => any) {
      return impl.bimap!.call(this, this, left, right);
    };
  }
  
  if (impl.bichain) {
    proto.bichain = function(left: (l: any) => any, right: (r: any) => any) {
      return impl.bichain!.call(this, this, left, right);
    };
  }
  
  // Stream operations
  if (impl.scan) {
    proto.scan = function(reducer: (acc: any, value: T) => any, seed: any) {
      return impl.scan!.call(this, this, reducer, seed);
    };
  }
  
  if (impl.take) {
    proto.take = function(n: number) {
      return impl.take!.call(this, this, n);
    };
  }
  
  if (impl.skip) {
    proto.skip = function(n: number) {
      return impl.skip!.call(this, this, n);
    };
  }
  
  if (impl.distinct) {
    proto.distinct = function() {
      return impl.distinct!.call(this, this);
    };
  }
  
  if (impl.drop) {
    proto.drop = function(n: number) {
      return impl.drop!.call(this, this, n);
    };
  }
  
  if (impl.slice) {
    proto.slice = function(start: number, end?: number) {
      return impl.slice!.call(this, this, start, end);
    };
  }
  
  if (impl.reverse) {
    proto.reverse = function() {
      return impl.reverse!.call(this, this);
    };
  }
  
  if (impl.sortBy) {
    proto.sortBy = function(fn: (a: T) => any) {
      return impl.sortBy!.call(this, this, fn);
    };
  }
  
  // Composition
  if (impl.pipe) {
    proto.pipe = function(...fns: Array<(a: any) => any>) {
      return impl.pipe!.call(this, this, ...fns);
    };
  }
}

// ============================================================================
// Part 3: Type-Safe Conversion Helpers
// ============================================================================

/**
 * Type guard for ObservableLite
 */
export function isObservableLite(value: any): value is ObservableLite<any> {
  return value instanceof ObservableLite;
}

/**
 * Type guard for StatefulStream
 */
export function isStatefulStream(value: any): value is StatefulStream<any, any, any> {
  return value && typeof value.run === 'function' && typeof value.__purity === 'string';
}

/**
 * Type guard for Maybe
 */
export function isMaybe(value: any): value is Maybe<any> {
  return value && typeof value.match === 'function';
}

/**
 * Type guard for Either
 */
export function isEither(value: any): value is Either<any, any> {
  return value && typeof value.match === 'function';
}

/**
 * Type guard for Result
 */
export function isResult(value: any): value is Result<any, any> {
  return value && typeof value.match === 'function';
}

/**
 * Type guard for any fluent type
 */
export function isFluentType(value: any): value is FluentOps<any> {
  return isObservableLite(value) || 
         isStatefulStream(value) || 
         isMaybe(value) || 
         isEither(value) || 
         isResult(value);
}

// ============================================================================
// Part 4: Unified Typeclass Instances
// ============================================================================

/**
 * Unified Functor instance for all fluent types
 */
export const UnifiedFunctorInstance = {
  map: <A, B>(fa: FluentOps<A>, f: (a: A) => B): any => {
    return fa.map(f);
  }
};

/**
 * Unified Monad instance for all fluent types
 */
export const UnifiedMonadInstance = {
  ...UnifiedFunctorInstance,
  chain: <A, B>(fa: FluentOps<A>, f: (a: A) => any): any => {
    return fa.chain(f);
  }
};

/**
 * Unified Bifunctor instance for bifunctor types
 */
export const UnifiedBifunctorInstance = {
  bimap: <L, R, L2, R2>(fa: any, left: (l: L) => L2, right: (r: R) => R2): any => {
    return fa.bimap(left, right);
  }
};

// ============================================================================
// Part 5: Conversion Functions
// ============================================================================

/**
 * Convert any fluent type to ObservableLite
 */
export function toObservableLite<T>(value: FluentOps<T>): ObservableLite<T> {
  if (isObservableLite(value)) {
    return value;
  }
  
  if (isStatefulStream(value) && value.toObservableLite) {
    return value.toObservableLite([], {});
  }
  
  if (isMaybe(value)) {
    return value.match({
      Just: ({ value }) => ObservableLite.of(value),
      Nothing: () => ObservableLite.empty()
    });
  }
  
  if (isEither(value)) {
    return value.match({
      Left: () => ObservableLite.empty(),
      Right: ({ value }) => ObservableLite.of(value)
    });
  }
  
  if (isResult(value)) {
    return value.match({
      Ok: ({ value }) => ObservableLite.of(value),
      Err: () => ObservableLite.empty()
    });
  }
  
  throw new Error(`Cannot convert ${typeof value} to ObservableLite`);
}

/**
 * Convert any fluent type to StatefulStream
 */
export function toStatefulStream<T, S>(value: FluentOps<T>, initialState: S = {} as S): StatefulStream<T, S, T> {
  if (isStatefulStream(value)) {
    return value as StatefulStream<T, S, T>;
  }
  
  if (isObservableLite(value) && value.toStatefulStream) {
    return value.toStatefulStream(initialState);
  }
  
  if (isMaybe(value)) {
    return value.match({
      Just: ({ value }) => ({
        run: (input: T) => (state: S): [S, T] => [state, value],
        __purity: 'Pure' as const
      }),
      Nothing: () => ({
        run: (input: T) => (state: S): [S, T] => [state, input],
        __purity: 'Pure' as const
      })
    });
  }
  
  if (isEither(value)) {
    return value.match({
      Left: () => ({
        run: (input: T) => (state: S): [S, T] => [state, input],
        __purity: 'Pure' as const
      }),
      Right: ({ value }) => ({
        run: (input: T) => (state: S): [S, T] => [state, value],
        __purity: 'Pure' as const
      })
    });
  }
  
  if (isResult(value)) {
    return value.match({
      Ok: ({ value }) => ({
        run: (input: T) => (state: S): [S, T] => [state, value],
        __purity: 'Pure' as const
      }),
      Err: () => ({
        run: (input: T) => (state: S): [S, T] => [state, input],
        __purity: 'Pure' as const
      })
    });
  }
  
  throw new Error(`Cannot convert ${typeof value} to StatefulStream`);
}

/**
 * Convert any fluent type to Maybe
 */
export function toMaybe<T>(value: FluentOps<T>): Maybe<T> {
  if (isMaybe(value)) {
    return value;
  }
  
  if (isObservableLite(value)) {
    // Take first value or Nothing
    let result: Maybe<T> = Nothing();
    value.subscribe({
      next: (val: T) => {
        if (result === Nothing()) {
          result = Just(val);
        }
      },
      complete: () => {}
    });
    return result;
  }
  
  if (isStatefulStream(value)) {
    // Run with empty input and take result
    const [_, output] = value.run({} as T)({});
    return Just(output);
  }
  
  if (isEither(value)) {
    return value.match({
      Left: () => Nothing(),
      Right: ({ value }) => Just(value)
    });
  }
  
  if (isResult(value)) {
    return value.match({
      Ok: ({ value }) => Just(value),
      Err: () => Nothing()
    });
  }
  
  throw new Error(`Cannot convert ${typeof value} to Maybe`);
}

/**
 * Convert any fluent type to Either
 */
export function toEither<T, E = Error>(value: FluentOps<T>): Either<E, T> {
  if (isEither(value)) {
    return value;
  }
  
  if (isMaybe(value)) {
    return value.match({
      Just: ({ value }) => Right(value),
      Nothing: () => Left(new Error('No value') as E)
    });
  }
  
  if (isResult(value)) {
    return value.match({
      Ok: ({ value }) => Right(value),
      Err: ({ error }) => Left(error)
    });
  }
  
  if (isObservableLite(value)) {
    // Take first value or Left
    let result: Either<E, T> = Left(new Error('No value') as E);
    value.subscribe({
      next: (val: T) => {
        if (result === Left(new Error('No value') as E)) {
          result = Right(val);
        }
      },
      complete: () => {}
    });
    return result;
  }
  
  if (isStatefulStream(value)) {
    // Run with empty input and take result
    try {
      const [_, output] = value.run({} as T)({});
      return Right(output);
    } catch (error) {
      return Left(error as E);
    }
  }
  
  throw new Error(`Cannot convert ${typeof value} to Either`);
}

/**
 * Convert any fluent type to Result
 */
export function toResult<T, E = Error>(value: FluentOps<T>): Result<E, T> {
  if (isResult(value)) {
    return value;
  }
  
  if (isMaybe(value)) {
    return value.match({
      Just: ({ value }) => Ok(value),
      Nothing: () => Err(new Error('No value') as E)
    });
  }
  
  if (isEither(value)) {
    return value.match({
      Left: ({ value }) => Err(value),
      Right: ({ value }) => Ok(value)
    });
  }
  
  if (isObservableLite(value)) {
    // Take first value or Err
    let result: Result<E, T> = Err(new Error('No value') as E);
    value.subscribe({
      next: (val: T) => {
        if (result === Err(new Error('No value') as E)) {
          result = Ok(val);
        }
      },
      complete: () => {}
    });
    return result;
  }
  
  if (isStatefulStream(value)) {
    // Run with empty input and take result
    try {
      const [_, output] = value.run({} as T)({});
      return Ok(output);
    } catch (error) {
      return Err(error as E);
    }
  }
  
  throw new Error(`Cannot convert ${typeof value} to Result`);
}

// ============================================================================
// Part 6: Utility Functions
// ============================================================================

/**
 * Check if two fluent types have the same API
 */
export function hasSameAPI(a: FluentOps<any>, b: FluentOps<any>): boolean {
  const methods = ['map', 'chain', 'filter', 'pipe'];
  return methods.every(method => 
    typeof a[method as keyof FluentOps<any>] === typeof b[method as keyof FluentOps<any>]
  );
}

/**
 * Create a unified stream from any fluent type
 */
export function createUnifiedStream<T>(value: FluentOps<T>): ObservableLite<T> | StatefulStream<T, any, T> {
  if (isObservableLite(value)) {
    return value;
  }
  
  if (isStatefulStream(value)) {
    return value;
  }
  
  // Convert ADTs to ObservableLite
  return toObservableLite(value);
}

/**
 * Type assertion helper
 */
export type AssertSame<T, U> = T extends U ? U extends T ? true : false : false;

/**
 * Type assertion for fluent API compatibility
 */
export type AssertFluentAPI<T extends FluentOps<any>> = T;

// ============================================================================
// Part 7: Registration and Setup
// ============================================================================

/**
 * Register unified typeclass instances
 */
export function registerUnifiedInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    registry.register('UnifiedFunctor', UnifiedFunctorInstance);
    registry.register('UnifiedMonad', UnifiedMonadInstance);
    registry.register('UnifiedBifunctor', UnifiedBifunctorInstance);
  }
}

/**
 * Apply fluent API to all types
 */
export function applyFluentAPI(): void {
  // This will be called by individual modules to apply the fluent API
  console.log('🔄 Fluent API ready for application to FP types');
}

// Export all types for use in other modules
export type {
  FluentOps,
  StreamFluentOps,
  ADTFluentOps,
  FluentImpl
}; 