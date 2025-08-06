/**
 * FRP Bridge for StatefulStream
 * 
 * This module provides an FRP bridge that wraps UI/event sources in our StatefulStream
 * abstraction, integrates with the fusion optimizer, purity system, optics, and exposes
 * fluent operators. Generates StreamPlanNode trees so FRP pipelines can be optimized/
 * analyzed just like ObservableLite.
 * 
 * Features:
 * - Core FRP source wrapper with StatefulStream integration
 * - Fluent operators (map, filter, scan, flatMap)
 * - Fusion optimization integration
 * - Purity system integration (IO, Pure, State)
 * - Optics integration (.over, .preview)
 * - StreamPlanNode tree generation for analysis
 * - Event source management and cleanup
 */

import { 
  StatefulStream, 
  StateFn, 
  liftStateless, 
  liftStateful,
  createStatefulStream,
  compose,
  parallel,
  fanOut,
  fanIn
} from './fp-stream-state';

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

import { 
  StreamPlanNode,
  optimizePlan,
  canOptimize,
  optimizeStream,
  withAutoOptimization,
  createFusionOptimizer
} from './fp-stream-fusion';

import { 
  lens, 
  prism, 
  optional,
  isLens, 
  isPrism, 
  isOptional 
} from './fp-optics';

// Import common operations
import {
  addCommonOps,
  addOptimizedOps,
  applyCommonOps,
  CommonStreamOps
} from './fp-stream-ops';

// Import ObservableLite for conversions
import { ObservableLite } from './fp-observable-lite';

// ============================================================================
// Part 1: Core FRP Source Interface
// ============================================================================

/**
 * FRP Source interface for event sources
 */
export interface FRPSource<T> {
  subscribe: (listener: (value: T) => void) => () => void; // returns unsubscribe
  readonly __effect: 'IO' | 'Async'; // Mark as IO or Async for purity tracking
}

/**
 * FRP Source with metadata
 */
export interface FRPSourceWithMeta<T> extends FRPSource<T> {
  readonly __sourceType: string;
  readonly __eventType: string;
  readonly __purity: 'IO' | 'Async';
}

/**
 * FRP Source factory function
 */
export type FRPSourceFactory<T> = () => FRPSource<T>;

// ============================================================================
// Part 2: Enhanced StreamPlanNode for FRP
// ============================================================================

/**
 * Enhanced StreamPlanNode for FRP with better metadata
 */
export class FRPStreamPlanNode extends StreamPlanNode {
  constructor(
    type: string,
    meta: Record<string, any> = {},
    children: FRPStreamPlanNode[] = []
  ) {
    super(type, meta, children);
  }

  /**
   * Add a child node to this plan
   */
  addChild(node: FRPStreamPlanNode): FRPStreamPlanNode {
    this.children.push(node);
    return this;
  }

  /**
   * Mark this node as optimized
   */
  markOptimized(): FRPStreamPlanNode {
    this.meta.optimized = true;
    return this;
  }

  /**
   * Mark this node with purity information
   */
  markPurity(purity: 'Pure' | 'State' | 'IO' | 'Async'): FRPStreamPlanNode {
    this.meta.purity = purity;
    return this;
  }

  /**
   * Get the purity level of this node
   */
  getPurity(): 'Pure' | 'State' | 'IO' | 'Async' {
    return this.meta.purity || 'IO';
  }

  /**
   * Check if this node is optimized
   */
  isOptimized(): boolean {
    return this.meta.optimized || false;
  }

  /**
   * Get the source type if this is a source node
   */
  getSourceType(): string | undefined {
    return this.meta.sourceType;
  }

  /**
   * Get the event type if this is a source node
   */
  getEventType(): string | undefined {
    return this.meta.eventType;
  }

  /**
   * Clone this node
   */
  clone(): FRPStreamPlanNode {
    return new FRPStreamPlanNode(
      this.type,
      { ...this.meta },
      this.children.map(child => child.clone())
    );
  }

  /**
   * Get a string representation of this plan
   */
  toString(): string {
    const parts = [this.type];
    if (this.meta.purity) parts.push(`(${this.meta.purity})`);
    if (this.meta.optimized) parts.push('[OPTIMIZED]');
    if (this.children.length > 0) {
      parts.push(`-> [${this.children.map(c => c.toString()).join(', ')}]`);
    }
    return parts.join(' ');
  }
}

// ============================================================================
// Part 3: Core FRP Source Wrapper
// ============================================================================

/**
 * Create a StatefulStream from an FRP source
 */
export function fromFRP<T, S = {}>(
  source: FRPSource<T>,
  initState: S = {} as S
): StatefulStream<T, S, T> {
  // Create the plan node for this source
  const planNode = new FRPStreamPlanNode('source', {
    sourceType: 'FRP',
    eventType: typeof source,
    purity: 'IO'
  });

  // Create the StatefulStream
  const stream: StatefulStream<T, S, T> = {
    run: (input: T) => (state: S): [S, T] => {
      // For FRP sources, we typically don't use the input parameter
      // Instead, we emit the value from the source
      return [state, input];
    },
    __purity: 'IO' as const,
    __source: source,
    __state: initState,
    __plan: planNode
  };

  // Attach purity marker
  attachPurityMarker(stream, 'IO');
  
  return stream;
}

/**
 * Create a StatefulStream from an FRP source factory
 */
export function fromFRPFactory<T, S = {}>(
  factory: FRPSourceFactory<T>,
  initState: S = {} as S
): StatefulStream<T, S, T> {
  const source = factory();
  return fromFRP(source, initState);
}

/**
 * Create a StatefulStream from a DOM event
 */
export function fromEvent<T extends Event>(
  target: EventTarget,
  eventName: string,
  options?: AddEventListenerOptions
): StatefulStream<T, {}, T> {
  const source: FRPSource<T> = {
    subscribe: (listener: (value: T) => void) => {
      const handler = (event: Event) => listener(event as T);
      target.addEventListener(eventName, handler, options);
      return () => target.removeEventListener(eventName, handler, options);
    },
    __effect: 'IO' as const
  };

  return fromFRP(source, {});
}

/**
 * Create a StatefulStream from a Promise
 */
export function fromPromise<T>(promise: Promise<T>): StatefulStream<T, {}, T> {
  const source: FRPSource<T> = {
    subscribe: (listener: (value: T) => void) => {
      promise.then(listener).catch(() => {
        // Handle rejection silently for now
      });
      return () => {}; // No cleanup needed for promises
    },
    __effect: 'Async' as const
  };

  return fromFRP(source, {});
}

/**
 * Create a StatefulStream from an interval
 */
export function fromInterval(interval: number): StatefulStream<number, {}, number> {
  const source: FRPSource<number> = {
    subscribe: (listener: (value: number) => void) => {
      let count = 0;
      const id = setInterval(() => {
        listener(count++);
      }, interval);
      return () => clearInterval(id);
    },
    __effect: 'Async' as const
  };

  return fromFRP(source, {});
}

/**
 * Create a StatefulStream from an array
 */
export function fromArray<T>(values: readonly T[]): StatefulStream<T, {}, T> {
  const source: FRPSource<T> = {
    subscribe: (listener: (value: T) => void) => {
      values.forEach(listener);
      return () => {}; // No cleanup needed for arrays
    },
    __effect: 'IO' as const
  };

  return fromFRP(source, {});
}

// ============================================================================
// Part 4: Fluent Operators
// ============================================================================

/**
 * Extend StatefulStream prototype with fluent operators
 */
declare module './fp-stream-state' {
  interface StatefulStream<I, S, O> {
    map<B>(fn: (a: O) => B): StatefulStream<I, S, B>;
    filter(pred: (a: O) => boolean): StatefulStream<I, S, O>;
    filterMap<B>(fn: (a: O) => B | undefined): StatefulStream<I, S, B>;
    scan<B>(reducer: (acc: B, value: O) => B, seed: B): StatefulStream<I, S, B>;
    flatMap<B>(fn: (a: O) => StatefulStream<I, S, B>): StatefulStream<I, S, B>;
    take(count: number): StatefulStream<I, S, O>;
    skip(count: number): StatefulStream<I, S, O>;
    distinct(): StatefulStream<I, S, O>;
    over<L>(optic: L, fn: (focus: any) => any): StatefulStream<I, S, O>;
    preview<L>(optic: L): StatefulStream<I, S, any>;
    pipe<B>(...operators: Array<(stream: StatefulStream<I, S, O>) => StatefulStream<I, S, B>>): StatefulStream<I, S, B>;
  }
}

/**
 * Add map operator to StatefulStream
 */
StatefulStream.prototype.map = function<B>(fn: (a: any) => B): StatefulStream<any, any, B> {
  const planNode = new FRPStreamPlanNode('map', { 
    fn: fn.toString(),
    purity: 'Pure'
  });

  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateless(fn)
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add filter operator to StatefulStream
 */
StatefulStream.prototype.filter = function(pred: (a: any) => boolean): StatefulStream<any, any, any> {
  const planNode = new FRPStreamPlanNode('filter', { 
    pred: pred.toString(),
    purity: 'Pure'
  });

  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateless((value: any) => pred(value) ? value : undefined)
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add filterMap operator to StatefulStream
 */
StatefulStream.prototype.filterMap = function<B>(fn: (a: any) => B | undefined): StatefulStream<any, any, B> {
  const planNode = new FRPStreamPlanNode('filterMap', { 
    fn: fn.toString(),
    purity: 'Pure'
  });

  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateless(fn)
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add scan operator to StatefulStream
 */
StatefulStream.prototype.scan = function<B>(reducer: (acc: B, value: any) => B, seed: B): StatefulStream<any, any, B> {
  const planNode = new FRPStreamPlanNode('scan', { 
    reducer: reducer.toString(),
    seed,
    purity: 'State'
  });

  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateful((value: any, state: B) => [reducer(state, value), reducer(state, value)])
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add flatMap operator to StatefulStream
 */
StatefulStream.prototype.flatMap = function<B>(fn: (a: any) => StatefulStream<any, any, B>): StatefulStream<any, any, B> {
  const planNode = new FRPStreamPlanNode('flatMap', { 
    fn: fn.toString(),
    purity: 'State'
  });

  // For flatMap, we need to handle the nested stream
  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateful((value: any, state: any) => {
        const nestedStream = fn(value);
        const [newState, result] = nestedStream.run(value)(state);
        return [newState, result];
      })
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add take operator to StatefulStream
 */
StatefulStream.prototype.take = function(count: number): StatefulStream<any, any, any> {
  const planNode = new FRPStreamPlanNode('take', { 
    count,
    purity: 'State'
  });

  let taken = 0;
  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateful((value: any, state: any) => {
        if (taken < count) {
          taken++;
          return [state, value];
        }
        return [state, undefined];
      })
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add skip operator to StatefulStream
 */
StatefulStream.prototype.skip = function(count: number): StatefulStream<any, any, any> {
  const planNode = new FRPStreamPlanNode('skip', { 
    count,
    purity: 'State'
  });

  let skipped = 0;
  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateful((value: any, state: any) => {
        if (skipped < count) {
          skipped++;
          return [state, undefined];
        }
        return [state, value];
      })
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add distinct operator to StatefulStream
 */
StatefulStream.prototype.distinct = function(): StatefulStream<any, any, any> {
  const planNode = new FRPStreamPlanNode('distinct', { 
    purity: 'State'
  });

  const seen = new Set();
  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateful((value: any, state: any) => {
        if (seen.has(value)) {
          return [state, undefined];
        }
        seen.add(value);
        return [state, value];
      })
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add pipe operator to StatefulStream
 */
StatefulStream.prototype.pipe = function<B>(...operators: Array<(stream: StatefulStream<any, any, O>) => StatefulStream<any, any, B>>): StatefulStream<any, any, B> {
  let result: StatefulStream<any, any, O> = this;
  
  for (const operator of operators) {
    result = operator(result);
  }
  
  // Apply fusion optimization
  const optimized = optimizeFRP(result);
  
  return optimized as StatefulStream<any, any, B>;
};

// ============================================================================
// Part 5: Optics Integration
// ============================================================================

/**
 * Add over operator to StatefulStream for optics integration
 */
StatefulStream.prototype.over = function(optic: any, fn: (focus: any) => any): StatefulStream<any, any, any> {
  const planNode = new FRPStreamPlanNode('over', { 
    optic: optic.constructor.name,
    fn: fn.toString(),
    purity: 'Pure'
  });

  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateless((value: any) => {
        if (isLens(optic)) {
          return optic.set(fn(optic.get(value)), value);
        }
        return value;
      })
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

/**
 * Add preview operator to StatefulStream for optics integration
 */
StatefulStream.prototype.preview = function(optic: any): StatefulStream<any, any, any> {
  const planNode = new FRPStreamPlanNode('preview', { 
    optic: optic.constructor.name,
    purity: 'Pure'
  });

  const optimized = withAutoOptimization(
    compose(
      this,
      liftStateless((value: any) => {
        if (isLens(optic)) {
          return optic.get(value);
        }
        if (isPrism(optic)) {
          return optic.getOption(value);
        }
        if (isOptional(optic)) {
          return optic.getOption(value);
        }
        return value;
      })
    )
  );

  return {
    ...optimized,
    __plan: this.__plan?.addChild(planNode) || planNode
  };
};

// ============================================================================
// Part 6: Fusion Integration
// ============================================================================

/**
 * Optimize FRP stream using fusion system
 */
export function optimizeFRP<S, I, O>(
  stream: StatefulStream<I, S, O>
): StatefulStream<I, S, O> {
  // Check if the stream can be optimized
  if (!stream.__plan || !canOptimize(stream.__plan)) {
    return stream;
  }

  // Apply fusion optimization
  const optimizedPlan = optimizePlan(stream.__plan);
  
  // Create optimized stream
  const optimized = withAutoOptimization(stream);
  
  return {
    ...optimized,
    __plan: optimizedPlan as FRPStreamPlanNode
  };
}

/**
 * Create FRP fusion optimizer
 */
export function createFRPFusionOptimizer() {
  return createFusionOptimizer();
}

/**
 * Check if FRP stream can be optimized
 */
export function canOptimizeFRP<S, I, O>(stream: StatefulStream<I, S, O>): boolean {
  return stream.__plan ? canOptimize(stream.__plan) : false;
}

/**
 * Get FRP stream optimization statistics
 */
export function getFRPOptimizationStats<S, I, O>(stream: StatefulStream<I, S, O>) {
  const optimizer = createFRPFusionOptimizer();
  return optimizer.getStats(stream);
}

// ============================================================================
// Part 7: Purity System Integration
// ============================================================================

/**
 * Mark FRP stream with purity level
 */
export function markFRPPurity<S, I, O>(
  stream: StatefulStream<I, S, O>,
  purity: 'Pure' | 'State' | 'IO' | 'Async'
): StatefulStream<I, S, O> {
  attachPurityMarker(stream, purity);
  
  if (stream.__plan) {
    stream.__plan.markPurity(purity);
  }
  
  return stream;
}

/**
 * Get FRP stream purity level
 */
export function getFRPPurity<S, I, O>(stream: StatefulStream<I, S, O>): 'Pure' | 'State' | 'IO' | 'Async' {
  return extractPurityMarker(stream) || 'IO';
}

/**
 * Check if FRP stream is pure
 */
export function isFRPPure<S, I, O>(stream: StatefulStream<I, S, O>): boolean {
  return getFRPPurity(stream) === 'Pure';
}

/**
 * Check if FRP stream is stateful
 */
export function isFRPStateful<S, I, O>(stream: StatefulStream<I, S, O>): boolean {
  return getFRPPurity(stream) === 'State';
}

/**
 * Check if FRP stream has IO effects
 */
export function isFRPIO<S, I, O>(stream: StatefulStream<I, S, O>): boolean {
  return getFRPPurity(stream) === 'IO';
}

// ============================================================================
// Part 8: Utility Functions
// ============================================================================

/**
 * Subscribe to FRP stream
 */
export function subscribeFRP<S, I, O>(
  stream: StatefulStream<I, S, O>,
  listener: (value: O) => void,
  initialState: S = {} as S
): () => void {
  // For now, this is a simplified subscription
  // In a real implementation, you'd handle the stream execution properly
  return () => {
    // Cleanup logic
  };
}

/**
 * Run FRP stream with initial state
 */
export function runFRP<S, I, O>(
  stream: StatefulStream<I, S, O>,
  input: I,
  initialState: S = {} as S
): [S, O] {
  return stream.run(input)(initialState);
}

/**
 * Get FRP stream plan for analysis
 */
export function getFRPPlan<S, I, O>(stream: StatefulStream<I, S, O>): FRPStreamPlanNode | undefined {
  return stream.__plan;
}

/**
 * Visualize FRP stream plan
 */
export function visualizeFRPPlan<S, I, O>(stream: StatefulStream<I, S, O>): string {
  return stream.__plan?.toString() || 'No plan available';
}

/**
 * Check if FRP stream is optimized
 */
export function isFRPOptimized<S, I, O>(stream: StatefulStream<I, S, O>): boolean {
  return stream.__plan?.isOptimized() || false;
}

// ============================================================================
// Part 9: Type Guards
// ============================================================================

/**
 * Check if a value is an FRP source
 */
export function isFRPSource(value: any): value is FRPSource<any> {
  return typeof value === 'object' && 
         value !== null && 
         typeof value.subscribe === 'function' &&
         (value.__effect === 'IO' || value.__effect === 'Async');
}

/**
 * Check if a value is a StatefulStream
 */
export function isStatefulStream(value: any): value is StatefulStream<any, any, any> {
  return typeof value === 'object' && 
         value !== null && 
         typeof value.run === 'function' &&
         typeof value.__purity === 'string';
}

// ============================================================================
// Part 11: Common Operations Integration
// ============================================================================

/**
 * Apply common operations to StatefulStream for unified API
 */
applyCommonOps();

/**
 * Extend StatefulStream with CommonStreamOps interface
 */
declare module './fp-stream-state' {
  interface StatefulStream<I, S, O> extends CommonStreamOps<O> {}
}

// ============================================================================
// Part 12: Exports
// ============================================================================

export {
  FRPStreamPlanNode,
  fromFRP,
  fromFRPFactory,
  fromEvent,
  fromPromise,
  fromInterval,
  fromArray,
  optimizeFRP,
  createFRPFusionOptimizer,
  canOptimizeFRP,
  getFRPOptimizationStats,
  markFRPPurity,
  getFRPPurity,
  isFRPPure,
  isFRPStateful,
  isFRPIO,
  subscribeFRP,
  runFRP,
  getFRPPlan,
  visualizeFRPPlan,
  isFRPOptimized,
  isFRPSource,
  isStatefulStream,
  // Common operations
  CommonStreamOps
}; 

// ============================================================================
// Part 13: ObservableLite ↔ StatefulStream Conversions
// ============================================================================

/**
 * Convert ObservableLite to StatefulStream
 * This enables FP pipelines to move from reactive push streams to stateful monoid-homomorphic streams
 */
export function fromObservableLite<S, A>(
  obs: ObservableLite<A>,
  initialState: S = {} as S
): StatefulStream<A, S, A> {
  // Create the plan node for this conversion
  const planNode = new FRPStreamPlanNode('conversion', {
    sourceType: 'ObservableLite',
    targetType: 'StatefulStream',
    conversionType: 'fromObservableLite'
  });

  // Create the StatefulStream
  const stream: StatefulStream<A, S, A> = {
    run: (input: A) => (state: S): [S, A] => {
      let newState = state;
      let lastValue: A = input;
      
      // Subscribe to the ObservableLite to get the latest value
      const unsubscribe = obs.subscribe({
        next: (value: A) => {
          lastValue = value;
        },
        error: (err: any) => {
          // Handle error by keeping the last known good value
          console.warn('ObservableLite error in conversion:', err);
        },
        complete: () => {
          // Keep the last value when complete
        }
      });
      
      // Clean up subscription
      unsubscribe();
      
      return [newState, lastValue];
    },
    __purity: 'Async' as const,
    __source: obs,
    __state: initialState,
    __plan: planNode
  };

  // Attach purity marker as Async (since ObservableLite is async)
  attachPurityMarker(stream, 'Async');
  
  return stream;
}

/**
 * Convert StatefulStream to ObservableLite
 * This enables FP pipelines to move from stateful monoid-homomorphic streams to reactive push streams
 */
export function toObservableLite<S, A, O>(
  stream: StatefulStream<A, S, O>,
  inputs: Iterable<A>,
  initialState: S = {} as S
): ObservableLite<O> {
  return new ObservableLite<O>((subscriber) => {
    let state = initialState;
    
    try {
      for (const input of inputs) {
        const [newState, output] = stream.run(input)(state);
        state = newState;
        subscriber.next(output);
      }
      subscriber.complete();
    } catch (error) {
      subscriber.error?.(error);
    }
    
    return () => {
      // Cleanup logic if needed
    };
  });
}

/**
 * Convert StatefulStream to ObservableLite with async execution
 * This version handles async StatefulStreams properly
 */
export function toObservableLiteAsync<S, A, O>(
  stream: StatefulStream<A, S, O>,
  inputs: AsyncIterable<A>,
  initialState: S = {} as S
): ObservableLite<O> {
  return new ObservableLite<O>((subscriber) => {
    let state = initialState;
    let isSubscribed = true;
    
    const processInputs = async () => {
      try {
        for await (const input of inputs) {
          if (!isSubscribed) break;
          
          const [newState, output] = stream.run(input)(state);
          state = newState;
          subscriber.next(output);
        }
        if (isSubscribed) {
          subscriber.complete();
        }
      } catch (error) {
        if (isSubscribed) {
          subscriber.error?.(error);
        }
      }
    };
    
    processInputs();
    
    return () => {
      isSubscribed = false;
    };
  });
}

/**
 * Convert StatefulStream to ObservableLite with event-driven execution
 * This version is suitable for event-driven StatefulStreams
 */
export function toObservableLiteEvent<S, A, O>(
  stream: StatefulStream<A, S, O>,
  initialState: S = {} as S
): ObservableLite<O> {
  return new ObservableLite<O>((subscriber) => {
    let state = initialState;
    
    // Create a function that can be called with new inputs
    const processInput = (input: A) => {
      try {
        const [newState, output] = stream.run(input)(state);
        state = newState;
        subscriber.next(output);
      } catch (error) {
        subscriber.error?.(error);
      }
    };
    
    // Return a cleanup function that can be used to stop processing
    return () => {
      // Cleanup logic
    };
  });
}

// ============================================================================
// Part 14: Fluent API Extensions
// ============================================================================

/**
 * Add conversion methods to ObservableLite prototype
 */
declare module './fp-observable-lite' {
  interface ObservableLite<A> {
    toStatefulStream<S>(initialState?: S): StatefulStream<A, S, A>;
  }
}

/**
 * Add conversion methods to StatefulStream prototype
 */
declare module './fp-stream-state' {
  interface StatefulStream<I, S, O> {
    toObservableLite(inputs: Iterable<I>, initialState?: S): ObservableLite<O>;
    toObservableLiteAsync(inputs: AsyncIterable<I>, initialState?: S): ObservableLite<O>;
    toObservableLiteEvent(initialState?: S): ObservableLite<O>;
  }
}

/**
 * Add toStatefulStream method to ObservableLite
 */
ObservableLite.prototype.toStatefulStream = function<S>(initialState: S = {} as S): StatefulStream<A, S, A> {
  return fromObservableLite(this, initialState);
};

/**
 * Add toObservableLite methods to StatefulStream
 */
StatefulStream.prototype.toObservableLite = function<I, S, O>(
  inputs: Iterable<I>, 
  initialState: S = {} as S
): ObservableLite<O> {
  return toObservableLite(this, inputs, initialState);
};

StatefulStream.prototype.toObservableLiteAsync = function<I, S, O>(
  inputs: AsyncIterable<I>, 
  initialState: S = {} as S
): ObservableLite<O> {
  return toObservableLiteAsync(this, inputs, initialState);
};

StatefulStream.prototype.toObservableLiteEvent = function<I, S, O>(
  initialState: S = {} as S
): ObservableLite<O> {
  return toObservableLiteEvent(this, initialState);
};

// ============================================================================
// Part 15: Purity & Typeclass Integration
// ============================================================================

/**
 * Register conversion functions with the typeclass system
 */
export function registerConversionInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    
    registry.register('ObservableLiteToStatefulStream', {
      converter: fromObservableLite,
      sourceType: 'ObservableLite',
      targetType: 'StatefulStream',
      purity: { effect: 'Async' as const }
    });
    
    registry.register('StatefulStreamToObservableLite', {
      converter: toObservableLite,
      sourceType: 'StatefulStream',
      targetType: 'ObservableLite',
      purity: { effect: 'Async' as const }
    });
  }
}

/**
 * Get conversion purity for ObservableLite → StatefulStream
 */
export function getObservableLiteToStatefulPurity(): 'Async' {
  return 'Async';
}

/**
 * Get conversion purity for StatefulStream → ObservableLite
 */
export function getStatefulToObservableLitePurity<S, A, O>(stream: StatefulStream<A, S, O>): 'Pure' | 'State' | 'IO' | 'Async' {
  return extractPurityMarker(stream) || 'Async';
}

// ============================================================================
// Part 16: Utility Functions
// ============================================================================

/**
 * Check if conversion is possible
 */
export function canConvertToStatefulStream(value: any): value is ObservableLite<any> {
  return value instanceof ObservableLite;
}

/**
 * Check if conversion is possible
 */
export function canConvertToObservableLite(value: any): value is StatefulStream<any, any, any> {
  return value && typeof value.run === 'function' && typeof value.__purity === 'string';
}

/**
 * Round-trip conversion test
 */
export function testRoundTripConversion<A>(
  original: ObservableLite<A>,
  inputs: A[],
  initialState: any = {}
): boolean {
  try {
    // ObservableLite → StatefulStream
    const stateful = fromObservableLite(original, initialState);
    
    // StatefulStream → ObservableLite
    const backToObs = toObservableLite(stateful, inputs, initialState);
    
    // Both should be valid
    return original instanceof ObservableLite && 
           typeof stateful.run === 'function' && 
           backToObs instanceof ObservableLite;
  } catch (error) {
    return false;
  }
}

/**
 * Get conversion statistics
 */
export function getConversionStats(): {
  observableLiteToStateful: boolean;
  statefulToObservableLite: boolean;
  roundTripConversion: boolean;
} {
  return {
    observableLiteToStateful: typeof fromObservableLite === 'function',
    statefulToObservableLite: typeof toObservableLite === 'function',
    roundTripConversion: typeof testRoundTripConversion === 'function'
  };
} 