/**
 * Common Stream Operations Mixin
 * 
 * This module provides a unified fluent method API for both ObservableLite and StatefulStream,
 * enabling any FP pipeline to be written once and run on either type.
 * 
 * Features:
 * - Common operator interface for both stream types
 * - Unified Functor, Monad, and Bifunctor operations
 * - Type-safe operator implementations
 * - Purity tag synchronization
 * - Fusion optimization integration
 * - Optics integration
 */

import { ObservableLite } from './fp-observable-lite';
import { StatefulStream, liftStateless, liftStateful, compose } from './fp-stream-state';
import { 
  EffectTag, 
  EffectOf, 
  Pure, 
  IO, 
  Async,
  createPurityInfo, 
  attachPurityMarker, 
  extractPurityMarker, 
  hasPurityMarker 
} from './fp-purity';

// ============================================================================
// Part 1: Common Operator Interface
// ============================================================================

/**
 * Common stream operations interface
 * This interface defines the unified API for both ObservableLite and StatefulStream
 */
export interface CommonStreamOps<A> {
  // Functor operations
  map<B>(fn: (a: A) => B): this extends { run: any } ? StatefulStream<any, any, B> : ObservableLite<B>;
  
  // Filtering operations
  filter(pred: (a: A) => boolean): this extends { run: any } ? StatefulStream<any, any, A> : ObservableLite<A>;
  filterMap<B>(fn: (a: A) => B | undefined): this extends { run: any } ? StatefulStream<any, any, B> : ObservableLite<B>;
  
  // Stateful operations
  scan<B>(reducer: (acc: B, value: A) => B, seed: B): this extends { run: any } ? StatefulStream<any, any, B> : ObservableLite<B>;
  
  // Monad operations
  chain<B>(fn: (a: A) => any): any;
  flatMap<B>(fn: (a: A) => any): any;
  
  // Bifunctor operations
  bichain<L, R>(left: (l: L) => any, right: (r: R) => any): any;
  bimap<B, C>(f: (a: A) => B, g: (err: any) => C): any;
  
  // Utility operations
  take(count: number): this extends { run: any } ? StatefulStream<any, any, A> : ObservableLite<A>;
  skip(count: number): this extends { run: any } ? StatefulStream<any, any, A> : ObservableLite<A>;
  distinct(): this extends { run: any } ? StatefulStream<any, any, A> : ObservableLite<A>;
  
  // Pipeline composition
  pipe<B>(...operators: Array<(stream: any) => any>): any;
}

/**
 * Type guard to check if a value is a stream with common operations
 */
export function hasCommonOps(value: any): value is CommonStreamOps<any> {
  return value && 
         typeof value.map === 'function' &&
         typeof value.filter === 'function' &&
         typeof value.scan === 'function' &&
         typeof value.chain === 'function';
}

/**
 * Type guard to check if a value is an ObservableLite
 */
export function isObservableLite(value: any): value is ObservableLite<any> {
  return value instanceof ObservableLite;
}

/**
 * Type guard to check if a value is a StatefulStream
 */
export function isStatefulStream(value: any): value is StatefulStream<any, any, any> {
  return value && typeof value.run === 'function' && typeof value.__purity === 'string';
}

// ============================================================================
// Part 2: Operator Mixin Implementation
// ============================================================================

/**
 * Add common operations to a prototype
 */
export function addCommonOps(proto: any): void {
  // Functor operations
  proto.map = function<B>(fn: (a: any) => B): any {
    // Check if the class provides an optimized _map method
    if (this.constructor.prototype._map) {
      return this._map(fn);
    }
    
    // Fall back to the existing map method
    if (typeof this.map === 'function') {
      const result = this.map(fn);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'Pure');
      }
      
      return result;
    }
    
    throw new Error('map method not implemented');
  };

  proto.filter = function(pred: (a: any) => boolean): any {
    // Check if the class provides an optimized _filter method
    if (this.constructor.prototype._filter) {
      return this._filter(pred);
    }
    
    // Fall back to the existing filter method
    if (typeof this.filter === 'function') {
      const result = this.filter(pred);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'Pure');
      }
      
      return result;
    }
    
    throw new Error('filter method not implemented');
  };

  proto.filterMap = function<B>(fn: (a: any) => B | undefined): any {
    // Check if the class provides an optimized _filterMap method
    if (this.constructor.prototype._filterMap) {
      return this._filterMap(fn);
    }
    
    // Fall back to the existing filterMap method
    if (typeof this.filterMap === 'function') {
      const result = this.filterMap(fn);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'Pure');
      }
      
      return result;
    }
    
    // Implement filterMap using map and filter if not available
    return this.map(fn).filter((x: any) => x !== undefined);
  };

  proto.scan = function<B>(reducer: (acc: B, value: any) => B, seed: B): any {
    // Check if the class provides an optimized _scan method
    if (this.constructor.prototype._scan) {
      return this._scan(reducer, seed);
    }
    
    // Fall back to the existing scan method
    if (typeof this.scan === 'function') {
      const result = this.scan(reducer, seed);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'State');
      }
      
      return result;
    }
    
    throw new Error('scan method not implemented');
  };

  proto.chain = function<B>(fn: (a: any) => any): any {
    // Check if the class provides an optimized _chain method
    if (this.constructor.prototype._chain) {
      return this._chain(fn);
    }
    
    // Fall back to the existing chain method
    if (typeof this.chain === 'function') {
      const result = this.chain(fn);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'State');
      }
      
      return result;
    }
    
    throw new Error('chain method not implemented');
  };

  proto.flatMap = function<B>(fn: (a: any) => any): any {
    // Alias for chain
    return this.chain(fn);
  };

  proto.bichain = function<L, R>(left: (l: L) => any, right: (r: R) => any): any {
    // Check if the class provides an optimized _bichain method
    if (this.constructor.prototype._bichain) {
      return this._bichain(left, right);
    }
    
    // Fall back to the existing bichain method
    if (typeof this.bichain === 'function') {
      const result = this.bichain(left, right);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'State');
      }
      
      return result;
    }
    
    throw new Error('bichain method not implemented');
  };

  proto.bimap = function<B, C>(f: (a: any) => B, g: (err: any) => C): any {
    // Check if the class provides an optimized _bimap method
    if (this.constructor.prototype._bimap) {
      return this._bimap(f, g);
    }
    
    // Fall back to the existing bimap method
    if (typeof this.bimap === 'function') {
      const result = this.bimap(f, g);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'Pure');
      }
      
      return result;
    }
    
    throw new Error('bimap method not implemented');
  };

  proto.take = function(count: number): any {
    // Check if the class provides an optimized _take method
    if (this.constructor.prototype._take) {
      return this._take(count);
    }
    
    // Fall back to the existing take method
    if (typeof this.take === 'function') {
      const result = this.take(count);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'State');
      }
      
      return result;
    }
    
    throw new Error('take method not implemented');
  };

  proto.skip = function(count: number): any {
    // Check if the class provides an optimized _skip method
    if (this.constructor.prototype._skip) {
      return this._skip(count);
    }
    
    // Fall back to the existing skip method
    if (typeof this.skip === 'function') {
      const result = this.skip(count);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'State');
      }
      
      return result;
    }
    
    throw new Error('skip method not implemented');
  };

  proto.distinct = function(): any {
    // Check if the class provides an optimized _distinct method
    if (this.constructor.prototype._distinct) {
      return this._distinct();
    }
    
    // Fall back to the existing distinct method
    if (typeof this.distinct === 'function') {
      const result = this.distinct();
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        attachPurityMarker(result, 'State');
      }
      
      return result;
    }
    
    throw new Error('distinct method not implemented');
  };

  proto.pipe = function<B>(...operators: Array<(stream: any) => any>): any {
    // Check if the class provides an optimized _pipe method
    if (this.constructor.prototype._pipe) {
      return this._pipe(...operators);
    }
    
    // Fall back to the existing pipe method
    if (typeof this.pipe === 'function') {
      const result = this.pipe(...operators);
      
      // Attach purity marker
      if (isObservableLite(this) || isStatefulStream(this)) {
        const purity = extractPurityMarker(this) || 'IO';
        attachPurityMarker(result, purity);
      }
      
      return result;
    }
    
    // Implement pipe using composition
    let result: any = this;
    for (const operator of operators) {
      result = operator(result);
    }
    return result;
  };
}

// ============================================================================
// Part 3: Optimized Operator Implementations
// ============================================================================

/**
 * Add optimized operator implementations to a prototype
 */
export function addOptimizedOps(proto: any): void {
  // Optimized map implementation
  proto._map = function<B>(fn: (a: any) => B): any {
    if (isObservableLite(this)) {
      return this.map(fn);
    } else if (isStatefulStream(this)) {
      return compose(this, liftStateless(fn));
    }
    throw new Error('Unsupported stream type for optimized map');
  };

  // Optimized filter implementation
  proto._filter = function(pred: (a: any) => boolean): any {
    if (isObservableLite(this)) {
      return this.filter(pred);
    } else if (isStatefulStream(this)) {
      return compose(this, liftStateless((value: any) => pred(value) ? value : undefined));
    }
    throw new Error('Unsupported stream type for optimized filter');
  };

  // Optimized filterMap implementation
  proto._filterMap = function<B>(fn: (a: any) => B | undefined): any {
    if (isObservableLite(this)) {
      return this.filterMap ? this.filterMap(fn) : this.map(fn).filter((x: any) => x !== undefined);
    } else if (isStatefulStream(this)) {
      return compose(this, liftStateless(fn));
    }
    throw new Error('Unsupported stream type for optimized filterMap');
  };

  // Optimized scan implementation
  proto._scan = function<B>(reducer: (acc: B, value: any) => B, seed: B): any {
    if (isObservableLite(this)) {
      return this.scan(reducer, seed);
    } else if (isStatefulStream(this)) {
      return compose(this, liftStateful((value: any, state: B) => {
        const newState = reducer(state, value);
        return [newState, newState];
      }));
    }
    throw new Error('Unsupported stream type for optimized scan');
  };

  // Optimized chain implementation
  proto._chain = function<B>(fn: (a: any) => any): any {
    if (isObservableLite(this)) {
      return this.chain(fn);
    } else if (isStatefulStream(this)) {
      return compose(this, liftStateful((value: any, state: any) => {
        const nestedStream = fn(value);
        if (isStatefulStream(nestedStream)) {
          return nestedStream.run(value)(state);
        }
        return [state, nestedStream];
      }));
    }
    throw new Error('Unsupported stream type for optimized chain');
  };

  // Optimized bichain implementation
  proto._bichain = function<L, R>(left: (l: L) => any, right: (r: R) => any): any {
    if (isObservableLite(this)) {
      return this.bichain(left, right);
    } else if (isStatefulStream(this)) {
      // For StatefulStream, we need to handle both success and error cases
      return compose(this, liftStateful((value: any, state: any) => {
        try {
          const result = right(value);
          return [state, result];
        } catch (error) {
          const errorResult = left(error);
          return [state, errorResult];
        }
      }));
    }
    throw new Error('Unsupported stream type for optimized bichain');
  };

  // Optimized bimap implementation
  proto._bimap = function<B, C>(f: (a: any) => B, g: (err: any) => C): any {
    if (isObservableLite(this)) {
      return this.bimap(f, g);
    } else if (isStatefulStream(this)) {
      return compose(this, liftStateless((value: any) => {
        try {
          return f(value);
        } catch (error) {
          return g(error);
        }
      }));
    }
    throw new Error('Unsupported stream type for optimized bimap');
  };

  // Optimized take implementation
  proto._take = function(count: number): any {
    if (isObservableLite(this)) {
      return this.take(count);
    } else if (isStatefulStream(this)) {
      let taken = 0;
      return compose(this, liftStateful((value: any, state: any) => {
        if (taken < count) {
          taken++;
          return [state, value];
        }
        return [state, undefined];
      }));
    }
    throw new Error('Unsupported stream type for optimized take');
  };

  // Optimized skip implementation
  proto._skip = function(count: number): any {
    if (isObservableLite(this)) {
      return this.skip(count);
    } else if (isStatefulStream(this)) {
      let skipped = 0;
      return compose(this, liftStateful((value: any, state: any) => {
        if (skipped < count) {
          skipped++;
          return [state, undefined];
        }
        return [state, value];
      }));
    }
    throw new Error('Unsupported stream type for optimized skip');
  };

  // Optimized distinct implementation
  proto._distinct = function(): any {
    if (isObservableLite(this)) {
      return this.distinct();
    } else if (isStatefulStream(this)) {
      const seen = new Set();
      return compose(this, liftStateful((value: any, state: any) => {
        if (seen.has(value)) {
          return [state, undefined];
        }
        seen.add(value);
        return [state, value];
      }));
    }
    throw new Error('Unsupported stream type for optimized distinct');
  };

  // Optimized pipe implementation
  proto._pipe = function<B>(...operators: Array<(stream: any) => any>): any {
    if (isObservableLite(this)) {
      return this.pipe(...operators);
    } else if (isStatefulStream(this)) {
      let result: any = this;
      for (const operator of operators) {
        result = operator(result);
      }
      return result;
    }
    throw new Error('Unsupported stream type for optimized pipe');
  };
}

// ============================================================================
// Part 4: Unified Typeclass Instances
// ============================================================================

/**
 * Unified Functor instance for both stream types
 */
export const UnifiedStreamFunctor = {
  map: <A, B>(fa: CommonStreamOps<A>, f: (a: A) => B): any => {
    return fa.map(f);
  }
};

/**
 * Unified Monad instance for both stream types
 */
export const UnifiedStreamMonad = {
  ...UnifiedStreamFunctor,
  chain: <A, B>(fa: CommonStreamOps<A>, f: (a: A) => any): any => {
    return fa.chain(f);
  }
};

/**
 * Unified Bifunctor instance for both stream types
 */
export const UnifiedStreamBifunctor = {
  bimap: <A, B, C, D>(fa: CommonStreamOps<A>, f: (a: A) => B, g: (err: any) => C): any => {
    return fa.bimap(f, g);
  }
};

// ============================================================================
// Part 5: Utility Functions
// ============================================================================

/**
 * Apply common operations to both ObservableLite and StatefulStream
 */
export function applyCommonOps(): void {
  // Apply to ObservableLite
  if (typeof ObservableLite !== 'undefined') {
    addCommonOps(ObservableLite.prototype);
    addOptimizedOps(ObservableLite.prototype);
  }
  
  // Apply to StatefulStream
  if (typeof StatefulStream !== 'undefined') {
    addCommonOps(StatefulStream.prototype);
    addOptimizedOps(StatefulStream.prototype);
  }
}

/**
 * Check if two streams have the same API
 */
export function hasSameAPI(stream1: any, stream2: any): boolean {
  const methods = ['map', 'filter', 'scan', 'chain', 'bichain', 'take', 'skip', 'distinct', 'pipe'];
  
  for (const method of methods) {
    if (typeof stream1[method] !== typeof stream2[method]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Create a unified stream from either type
 */
export function createUnifiedStream<T>(source: any): CommonStreamOps<T> {
  if (isObservableLite(source)) {
    return source as CommonStreamOps<T>;
  } else if (isStatefulStream(source)) {
    return source as CommonStreamOps<T>;
  }
  
  throw new Error('Unsupported stream type');
}

/**
 * Type assertion helper for unified streams
 */
export type AssertSame<T, U> = T extends U ? (U extends T ? true : never) : never;

// ============================================================================
// Part 6: Exports
// ============================================================================

export {
  CommonStreamOps,
  hasCommonOps,
  isObservableLite,
  isStatefulStream,
  addCommonOps,
  addOptimizedOps,
  UnifiedStreamFunctor,
  UnifiedStreamMonad,
  UnifiedStreamBifunctor,
  applyCommonOps,
  hasSameAPI,
  createUnifiedStream,
  AssertSame
}; 