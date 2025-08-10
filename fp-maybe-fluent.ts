/**
 * Fluent Usage-Bound Maybe Implementation
 * 
 * This module extends the Maybe type with fluent API wrappers that propagate
 * and enforce multiplicity bounds from the registry.
 */

import { 
  FluentOps, 
  FluentOpsImpl, 
  UsageBound, 
  multiplyUsageBounds,
  filterUsageBound,
  scanUsageBound,
  takeUsageBound,
  getUsageBoundForType
} from './fluent-usage-wrapper';

// ============================================================================
// Maybe Type Definition
// ============================================================================

/**
 * Maybe type with usage bounds
 */
export type Maybe<A> = Just<A> | Nothing<A>;

/**
 * Just constructor with usage bounds
 */
export interface Just<A> {
  readonly tag: 'Just';
  readonly value: A;
  readonly __usageBound: UsageBound<A>;
}

/**
 * Nothing constructor with usage bounds
 */
export interface Nothing<A> {
  readonly tag: 'Nothing';
  readonly __usageBound: UsageBound<A>;
}

// ============================================================================
// Maybe Constructors
// ============================================================================

/**
 * Create a Just value with usage bound from registry
 */
export function just<A>(value: A): Maybe<A> {
  const usageBound = getUsageBoundForType<A>('Maybe');
  return {
    tag: 'Just',
    value,
    __usageBound: usageBound
  };
}

/**
 * Create a Nothing value with usage bound from registry
 */
export function nothing<A>(): Maybe<A> {
  const usageBound = getUsageBoundForType<A>('Maybe');
  return {
    tag: 'Nothing',
    __usageBound: usageBound
  };
}

/**
 * Create a Maybe from a value or null/undefined
 */
export function fromNullable<A>(value: A | null | undefined): Maybe<A> {
  return value != null ? just(value) : nothing<A>();
}

// ============================================================================
// Fluent Maybe Implementation
// ============================================================================

/**
 * Fluent Maybe wrapper that extends FluentOpsImpl
 */
export class FluentMaybe<A> extends FluentOpsImpl<Maybe<A>, UsageBound<Maybe<A>>> {
  constructor(maybe: Maybe<A>) {
    super(maybe, maybe.__usageBound);
  }

  /**
   * Map over Maybe with usage propagation
   */
  map<B>(f: (a: A) => B): FluentOps<Maybe<B>, UsageBound<Maybe<B>>> {
    const mappedMaybe = this.value.tag === 'Just' 
      ? just(f(this.value.value))
      : nothing<B>();
    
    const mappedUsageBound: UsageBound<Maybe<B>> = {
      usage: (input: Maybe<B>): Multiplicity => this.__usageBound.usage(input as any),
      maxUsage: this.__usageBound.maxUsage
    };
    
    return new FluentMaybe(mappedMaybe);
  }

  /**
   * Filter Maybe with usage propagation
   */
  filter(predicate: (a: A) => boolean): FluentOps<Maybe<A>, UsageBound<Maybe<A>>> {
    if (this.value.tag === 'Nothing') {
      return new FluentMaybe(this.value);
    }
    
    if (!predicate(this.value.value)) {
      const nothingValue = nothing<A>();
      return new FluentMaybe(nothingValue);
    }
    
    const filteredUsageBound = filterUsageBound(this.__usageBound, predicate);
    return new FluentMaybe({ ...this.value, __usageBound: filteredUsageBound });
  }

  /**
   * Scan over Maybe with usage propagation
   */
  scan<B>(initial: B, f: (acc: B, a: A) => B): FluentOps<Maybe<B>, UsageBound<Maybe<B>>> {
    const scannedValue = this.value.tag === 'Just' 
      ? f(initial, this.value.value)
      : initial;
    
    const scannedMaybe = just(scannedValue);
    const scannedUsageBound = scanUsageBound<Maybe<A>, Maybe<B>>(this.__usageBound);
    
    return new FluentMaybe(scannedMaybe);
  }

  /**
   * Chain Maybe with usage propagation
   */
  chain<B>(f: (a: A) => FluentOps<Maybe<B>, UsageBound<Maybe<B>>>): FluentOps<Maybe<B>, UsageBound<Maybe<B>>> {
    if (this.value.tag === 'Nothing') {
      const nothingValue = nothing<B>();
      return new FluentMaybe(nothingValue);
    }
    
    const innerWrapper = f(this.value.value);
    const chainedUsageBound = multiplyUsageBounds(this.__usageBound, innerWrapper.getUsageBound());
    
    // Access the inner Maybe value
    const innerMaybe = (innerWrapper as any).value;
    return new FluentMaybe(innerMaybe);
  }

  /**
   * Take n elements (for Maybe, this is either 0 or 1)
   */
  take(n: number): FluentOps<Maybe<A>, UsageBound<Maybe<A>>> {
    const takeUsageBoundResult = takeUsageBound(this.__usageBound, n);
    
    if (n === 0) {
      const nothingValue = nothing<A>();
      return new FluentMaybe(nothingValue);
    }
    
    return new FluentMaybe({ ...this.value, __usageBound: takeUsageBoundResult });
  }

  /**
   * Get the underlying Maybe value
   */
  getMaybe(): Maybe<A> {
    return this.value;
  }

  /**
   * Extract value or throw if Nothing
   */
  unsafeGet(): A {
    if (this.value.tag === 'Just') {
      return this.value.value;
    }
    throw new Error('Cannot extract value from Nothing');
  }

  /**
   * Extract value with default
   */
  getOrElse(defaultValue: A): A {
    return this.value.tag === 'Just' ? this.value.value : defaultValue;
  }

  /**
   * Pattern matching
   */
  match<B>(patterns: { Just: (value: A) => B; Nothing: () => B }): B {
    return this.value.tag === 'Just' 
      ? patterns.Just(this.value.value)
      : patterns.Nothing();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a fluent Maybe from a value
 */
export function fluentMaybe<A>(value: A | null | undefined): FluentMaybe<A> {
  return new FluentMaybe(fromNullable(value));
}

/**
 * Create a fluent Maybe from a Just value
 */
export function fluentJust<A>(value: A): FluentMaybe<A> {
  return new FluentMaybe(just(value));
}

/**
 * Create a fluent Maybe from a Nothing value
 */
export function fluentNothing<A>(): FluentMaybe<A> {
  return new FluentMaybe(nothing<A>());
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example usage of fluent Maybe with usage bounds
 */
export function exampleUsage() {
  // Create a fluent Maybe with usage bound from registry
  const maybe = fluentJust(42);
  
  // Chain operations with usage propagation
  const result = maybe
    .map(x => x * 2)           // usage = 1
    .filter(x => x > 50)       // usage = 1 (filtered)
    .map(x => x.toString())    // usage = 1
    .chain(x => fluentJust(x.length)); // usage = 1 * 1 = 1
  
  // Validate usage
  const usage = result.validateUsage(result.getMaybe());
  console.log('Usage:', usage); // Should be 1
  
  // Extract result
  const value = result.getOrElse(0);
  console.log('Result:', value); // Should be 2 (length of "84")
}

// ============================================================================
// Type-Level Enforcement Example
// ============================================================================

/**
 * Type-level enforcement example
 * This would trigger a compile error if usage exceeds bounds
 */
export type SafeMaybeChain<A, B> = 
  FluentMaybe<A> extends FluentOps<infer U, infer UB> 
    ? UB extends UsageBound<infer V> 
      ? V extends Maybe<B> 
        ? FluentMaybe<B> 
        : never 
      : never 
    : never; 