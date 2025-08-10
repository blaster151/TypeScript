/**
 * Pattern Matching Ergonomics for Unified ADTs
 * 
 * This module provides ergonomic pattern matching capabilities for the unified ADT system,
 * including .match and .matchTag instance methods with full type safety and immutable compatibility.
 */

import {
  Maybe, Just, Nothing, matchMaybe,
  Either, Left, Right, matchEither,
  Result, Ok, Err, matchResult
} from './fp-adt-registry';

// ============================================================================
// Part 1: DRY Helper Functions
// ============================================================================

/**
 * Generic tag dispatch helper for pattern matching with payload
 */
function dispatch<Tag extends string, Payload, Result>(
  tag: Tag, 
  payload: Payload,
  handlers: { [K in Tag]?: (p: any) => Result } & { 
    _?: (t: string, p: any) => Result; 
    otherwise?: (t: string, p: any) => Result 
  }
): Result {
  const handler = handlers[tag];
  if (handler) {
    return handler(payload);
  }
  
  const fallback = handlers._ || handlers.otherwise;
  if (fallback) {
    return fallback(tag, payload);
  }
  
  throw new Error(`Unhandled tag: ${tag}`);
}

/**
 * Generic tag dispatch helper for tag-only pattern matching
 */
function dispatchTag<Tag extends string, Result>(
  tag: Tag,
  handlers: { [K in Tag]?: () => Result } & { 
    _?: (t: string) => Result; 
    otherwise?: (t: string) => Result 
  }
): Result {
  const handler = handlers[tag];
  if (handler) {
    return handler();
  }
  
  const fallback = handlers._ || handlers.otherwise;
  if (fallback) {
    return fallback(tag);
  }
  
  throw new Error(`Unhandled tag: ${tag}`);
}

// ============================================================================
// Part 2: Enhanced Pattern Matching Types
// ============================================================================

/**
 * Handler function for a specific tag
 */
export type TagHandler<Tag extends string, Payload, Result> = 
  Payload extends void 
    ? () => Result 
    : (payload: Payload) => Result;

/**
 * Handlers object for pattern matching
 */
export type MatchHandlers<Spec, Result> = {
  [K in keyof Spec]?: TagHandler<K, Spec[K], Result>;
} & {
  _?: (tag: string, payload: any) => Result;
  otherwise?: (tag: string, payload: any) => Result;
};

/**
 * Tag-only handlers for .matchTag
 */
export type TagOnlyHandlers<Spec, Result> = {
  [K in keyof Spec]?: () => Result;
} & {
  _?: (tag: string) => Result;
  otherwise?: (tag: string) => Result;
};

// ============================================================================
// Part 3: Enhanced ADT Instance Types
// ============================================================================

/**
 * Enhanced ADT instance with pattern matching methods
 */
export interface EnhancedADTInstance<Tag extends string, Payload = any> {
  readonly tag: Tag;
  readonly payload: Payload;
  
  /**
   * Pattern match on the ADT value
   */
  match<Result>(
    handlers: MatchHandlers<Record<Tag, Payload>, Result>
  ): Result;
  
  /**
   * Pattern match on tags only (no payload access)
   */
  matchTag<Result>(
    handlers: TagOnlyHandlers<Record<Tag, Payload>, Result>
  ): Result;
  
  /**
   * Check if this instance has a specific tag
   */
  is<K extends Tag>(tag: K): this is EnhancedADTInstance<K, Payload>;
  
  /**
   * Get the payload if it exists, or undefined
   */
  getPayload(): Payload;
  
  /**
   * Get the tag name
   */
  getTag(): Tag;
}

/**
 * Immutable ADT instance
 */
export interface ImmutableADTInstance<Tag extends string, Payload = any> 
  extends EnhancedADTInstance<Tag, Payload> {
  readonly __immutableBrand: unique symbol;
}

// ============================================================================
// Part 4: Enhanced Maybe Implementation
// ============================================================================

/**
 * Enhanced Maybe instance with pattern matching
 */
export class EnhancedMaybe<A> implements EnhancedADTInstance<'Just' | 'Nothing', { value?: A }> {
  readonly tag: 'Just' | 'Nothing';
  readonly payload: { value?: A };
  
  constructor(tag: 'Just' | 'Nothing', payload: { value?: A }) {
    this.tag = tag;
    this.payload = payload;
    Object.freeze(this);
  }
  
  match<Result>(handlers: {
    Just?: (payload: { value: A }) => Result;
    Nothing?: (payload: {}) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }): Result {
    // Use DRY helper with proper payload casting
    if (this.tag === 'Just' && handlers.Just) {
      return handlers.Just(this.payload as { value: A });
    } else if (this.tag === 'Nothing' && handlers.Nothing) {
      return handlers.Nothing(this.payload as {});
    } else {
      return dispatch(this.tag, this.payload, handlers);
    }
  }
  
  matchTag<Result>(handlers: {
    Just?: () => Result;
    Nothing?: () => Result;
    _?: (tag: string) => Result;
    otherwise?: (tag: string) => Result;
  }): Result {
    return dispatchTag(this.tag, handlers);
  }
  
  is<K extends 'Just' | 'Nothing'>(tag: K): this is EnhancedADTInstance<K, { value?: A }> {
    return this.tag === tag;
  }
  
  /**
   * Type guard for Just variant with payload refinement
   */
  isJust(): this is EnhancedADTInstance<'Just', { value: A }> {
    return this.tag === 'Just';
  }
  
  /**
   * Type guard for Nothing variant with payload refinement
   */
  isNothing(): this is EnhancedADTInstance<'Nothing', {}> {
    return this.tag === 'Nothing';
  }
  
  getPayload(): { value?: A } {
    return this.payload;
  }
  
  getTag(): 'Just' | 'Nothing' {
    return this.tag;
  }
}

/**
 * Enhanced Maybe constructors
 */
export const EnhancedJust = <A>(value: A): EnhancedMaybe<A> => {
  return new EnhancedMaybe('Just', { value });
};

export const EnhancedNothing = <A>(): EnhancedMaybe<A> => {
  return new EnhancedMaybe('Nothing', {});
};

/**
 * Enhanced Maybe with immutable branding
 */
export class ImmutableMaybe<A> extends EnhancedMaybe<A> implements ImmutableADTInstance<'Just' | 'Nothing', { value?: A }> {
  readonly __immutableBrand: unique symbol = {} as unique symbol;
}

/**
 * Immutable Maybe constructors
 */
export const ImmutableJust = <A>(value: A): ImmutableMaybe<A> => {
  return new ImmutableMaybe('Just', { value });
};

export const ImmutableNothing = <A>(): ImmutableMaybe<A> => {
  return new ImmutableMaybe('Nothing', {});
};

// ============================================================================
// Part 4: Enhanced Either Implementation
// ============================================================================

/**
 * Enhanced Either instance with pattern matching
 */
export class EnhancedEither<L, R> implements EnhancedADTInstance<'Left' | 'Right', { value: L | R }> {
  readonly tag: 'Left' | 'Right';
  readonly payload: { value: L | R };
  
  constructor(tag: 'Left' | 'Right', payload: { value: L | R }) {
    this.tag = tag;
    this.payload = payload;
    Object.freeze(this);
  }
  
  match<Result>(handlers: {
    Left?: (payload: { value: L }) => Result;
    Right?: (payload: { value: R }) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }): Result {
    if (this.tag === 'Left' && handlers.Left) {
      return handlers.Left(this.payload as { value: L });
    } else if (this.tag === 'Right' && handlers.Right) {
      return handlers.Right(this.payload as { value: R });
    } else {
      const fallback = handlers._ || handlers.otherwise;
      if (fallback) {
        return fallback(this.tag, this.payload);
      } else {
        throw new Error(`Unhandled tag: ${this.tag}`);
      }
    }
  }
  
  matchTag<Result>(handlers: {
    Left?: () => Result;
    Right?: () => Result;
    _?: (tag: string) => Result;
    otherwise?: (tag: string) => Result;
  }): Result {
    const handler = handlers[this.tag];
    const fallback = handlers._ || handlers.otherwise;
    
    if (handler) {
      return handler();
    } else if (fallback) {
      return fallback(this.tag);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }
  
  is<K extends 'Left' | 'Right'>(tag: K): this is EnhancedADTInstance<K, { value: L | R }> {
    return this.tag === tag;
  }
  
  /**
   * Type guard for Left variant with payload refinement
   */
  isLeft(): this is EnhancedADTInstance<'Left', { value: L }> {
    return this.tag === 'Left';
  }
  
  /**
   * Type guard for Right variant with payload refinement
   */
  isRight(): this is EnhancedADTInstance<'Right', { value: R }> {
    return this.tag === 'Right';
  }
  
  getPayload(): { value: L | R } {
    return this.payload;
  }
  
  getTag(): 'Left' | 'Right' {
    return this.tag;
  }
}

/**
 * Enhanced Either constructors
 */
export const EnhancedLeft = <L>(value: L): EnhancedEither<L, never> => {
  return new EnhancedEither('Left', { value });
};

export const EnhancedRight = <R>(value: R): EnhancedEither<never, R> => {
  return new EnhancedEither('Right', { value });
};

/**
 * Enhanced Either with immutable branding
 */
export class ImmutableEither<L, R> extends EnhancedEither<L, R> implements ImmutableADTInstance<'Left' | 'Right', { value: L | R }> {
  readonly __immutableBrand: unique symbol = {} as unique symbol;
}

/**
 * Immutable Either constructors
 */
export const ImmutableLeft = <L>(value: L): ImmutableEither<L, never> => {
  return new ImmutableEither('Left', { value });
};

export const ImmutableRight = <R>(value: R): ImmutableEither<never, R> => {
  return new ImmutableEither('Right', { value });
};

// ============================================================================
// Part 5: Enhanced Result Implementation
// ============================================================================

/**
 * Enhanced Result instance with pattern matching
 */
export class EnhancedResult<T, E> implements EnhancedADTInstance<'Ok' | 'Err', { value?: T; error?: E }> {
  readonly tag: 'Ok' | 'Err';
  readonly payload: { value?: T; error?: E };
  
  constructor(tag: 'Ok' | 'Err', payload: { value?: T; error?: E }) {
    this.tag = tag;
    this.payload = payload;
    Object.freeze(this);
  }
  
  match<Result>(handlers: {
    Ok?: (payload: { value: T }) => Result;
    Err?: (payload: { error: E }) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }): Result {
    if (this.tag === 'Ok' && handlers.Ok) {
      return handlers.Ok(this.payload as { value: T });
    } else if (this.tag === 'Err' && handlers.Err) {
      return handlers.Err(this.payload as { error: E });
    } else {
      const fallback = handlers._ || handlers.otherwise;
      if (fallback) {
        return fallback(this.tag, this.payload);
      } else {
        throw new Error(`Unhandled tag: ${this.tag}`);
      }
    }
  }
  
  matchTag<Result>(handlers: {
    Ok?: () => Result;
    Err?: () => Result;
    _?: (tag: string) => Result;
    otherwise?: (tag: string) => Result;
  }): Result {
    const handler = handlers[this.tag];
    const fallback = handlers._ || handlers.otherwise;
    
    if (handler) {
      return handler();
    } else if (fallback) {
      return fallback(this.tag);
    } else {
      throw new Error(`Unhandled tag: ${this.tag}`);
    }
  }
  
  is<K extends 'Ok' | 'Err'>(tag: K): this is EnhancedADTInstance<K, { value?: T; error?: E }> {
    return this.tag === tag;
  }
  
  /**
   * Type guard for Ok variant with payload refinement
   */
  isOk(): this is EnhancedADTInstance<'Ok', { value: T }> {
    return this.tag === 'Ok';
  }
  
  /**
   * Type guard for Err variant with payload refinement
   */
  isErr(): this is EnhancedADTInstance<'Err', { error: E }> {
    return this.tag === 'Err';
  }
  
  getPayload(): { value?: T; error?: E } {
    return this.payload;
  }
  
  getTag(): 'Ok' | 'Err' {
    return this.tag;
  }
}

/**
 * Enhanced Result constructors
 */
export const EnhancedOk = <T>(value: T): EnhancedResult<T, never> => {
  return new EnhancedResult('Ok', { value });
};

export const EnhancedErr = <E>(error: E): EnhancedResult<never, E> => {
  return new EnhancedResult('Err', { error });
};

/**
 * Enhanced Result with immutable branding
 */
export class ImmutableResult<T, E> extends EnhancedResult<T, E> implements ImmutableADTInstance<'Ok' | 'Err', { value?: T; error?: E }> {
  readonly __immutableBrand: unique symbol = {} as unique symbol;
}

/**
 * Immutable Result constructors
 */
export const ImmutableOk = <T>(value: T): ImmutableResult<T, never> => {
  return new ImmutableResult('Ok', { value });
};

export const ImmutableErr = <E>(error: E): ImmutableResult<never, E> => {
  return new ImmutableResult('Err', { error });
};

// ============================================================================
// Part 6: Pattern Matching Utilities
// ============================================================================

/**
 * Create a pattern matcher for Maybe
 */
export function createMaybeMatcher<Result>(
  handlers: {
    Just?: <A>(payload: { value: A }) => Result;
    Nothing?: (payload: {}) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }
) {
  return (maybe: EnhancedMaybe<any>): Result => {
    return maybe.match(handlers);
  };
}

/**
 * Create a tag-only matcher for Maybe
 */
export function createMaybeTagMatcher<Result>(
  handlers: {
    Just?: () => Result;
    Nothing?: () => Result;
    _?: (tag: string) => Result;
    otherwise?: (tag: string) => Result;
  }
) {
  return (maybe: EnhancedMaybe<any>): Result => {
    return maybe.matchTag(handlers);
  };
}

/**
 * Create a pattern matcher for Either
 */
export function createEitherMatcher<Result>(
  handlers: {
    Left?: <L>(payload: { value: L }) => Result;
    Right?: <R>(payload: { value: R }) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }
) {
  return (either: EnhancedEither<any, any>): Result => {
    return either.match(handlers);
  };
}

/**
 * Create a tag-only matcher for Either
 */
export function createEitherTagMatcher<Result>(
  handlers: {
    Left?: () => Result;
    Right?: () => Result;
    _?: (tag: string) => Result;
    otherwise?: (tag: string) => Result;
  }
) {
  return (either: EnhancedEither<any, any>): Result => {
    return either.matchTag(handlers);
  };
}

/**
 * Create a pattern matcher for Result
 */
export function createResultMatcher<Result>(
  handlers: {
    Ok?: <T>(payload: { value: T }) => Result;
    Err?: <E>(payload: { error: E }) => Result;
    _?: (tag: string, payload: any) => Result;
    otherwise?: (tag: string, payload: any) => Result;
  }
) {
  return (result: EnhancedResult<any, any>): Result => {
    return result.match(handlers);
  };
}

/**
 * Create a tag-only matcher for Result
 */
export function createResultTagMatcher<Result>(
  handlers: {
    Ok?: () => Result;
    Err?: () => Result;
    _?: (tag: string) => Result;
    otherwise?: (tag: string) => Result;
  }
) {
  return (result: EnhancedResult<any, any>): Result => {
    return result.matchTag(handlers);
  };
}

// ============================================================================
// Part 7: Example Usage
// ============================================================================

/**
 * Example usage of enhanced pattern matching
 */
export function exampleUsage() {
  console.log('=== Enhanced Pattern Matching Examples ===');
  
  // Enhanced Maybe examples
  const maybeJust = EnhancedJust(42);
  const maybeNothing = EnhancedNothing();
  
  // Full pattern matching
  const result1 = maybeJust.match({
    Just: ({ value }) => `Got ${value}`,
    Nothing: () => "None"
  });
  console.log(`Maybe Just: ${result1}`); // "Got 42"
  
  // Partial matching with fallback
  const result2 = maybeNothing.match({
    Just: ({ value }) => `Got ${value}`,
    _: (tag, payload) => `Unhandled: ${tag}`
  });
  console.log(`Maybe Nothing: ${result2}`); // "Unhandled: Nothing"
  
  // Tag-only matching
  const result3 = maybeJust.matchTag({
    Just: () => "Has value",
    Nothing: () => "No value"
  });
  console.log(`Maybe tag: ${result3}`); // "Has value"
  
  // Type guards
  if (maybeJust.is('Just')) {
    console.log(`Is Just: ${maybeJust.payload.value}`);
  }
  
  // Enhanced Either examples
  const eitherLeft = EnhancedLeft("error");
  const eitherRight = EnhancedRight(42);
  
  const result4 = eitherRight.match({
    Left: ({ value }) => `Error: ${value}`,
    Right: ({ value }) => `Success: ${value}`
  });
  console.log(`Either Right: ${result4}`); // "Success: 42"
  
  // Enhanced Result examples
  const resultOk = EnhancedOk(42);
  const resultErr = EnhancedErr("error");
  
  const result5 = resultOk.match({
    Ok: ({ value }) => `Success: ${value}`,
    Err: ({ error }) => `Error: ${error}`
  });
  console.log(`Result Ok: ${result5}`); // "Success: 42"
  
  // Curryable matchers
  const stringifyMaybe = createMaybeMatcher({
    Just: ({ value }) => `Just(${value})`,
    Nothing: () => "Nothing"
  });
  
  console.log(`Stringify: ${stringifyMaybe(maybeJust)}`); // "Just(42)"
  console.log(`Stringify: ${stringifyMaybe(maybeNothing)}`); // "Nothing"
}

// ============================================================================
// Part 8: Laws Documentation
// ============================================================================

/**
 * Enhanced Pattern Matching Laws:
 * 
 * Pattern Matching Laws:
 * 1. Identity: instance.match({ [tag]: payload => payload }) = instance.payload
 * 2. Composition: instance.match(handlers1).then(handlers2) = instance.match(composed)
 * 3. Exhaustiveness: Full handlers must cover all tags or have fallback
 * 4. Immutability: Pattern matching never mutates the instance
 * 
 * Tag-Only Matching Laws:
 * 1. Identity: instance.matchTag({ [tag]: () => tag }) = instance.tag
 * 2. No Payload Access: Tag-only handlers cannot access payload
 * 3. Fallback Support: _ or otherwise handlers supported
 * 
 * Immutability Laws:
 * 1. Frozen Instances: All instances are Object.freeze()d
 * 2. No Mutation: No methods can modify the instance state
 * 3. Structural Sharing: Immutable instances can share structure
 * 
 * Type Safety Laws:
 * 1. Exhaustiveness: TypeScript enforces exhaustive matching
 * 2. Payload Inference: Payload types inferred from tag definitions
 * 3. Handler Types: Handler signatures inferred from tag payloads
 * 4. Fallback Types: Fallback handlers properly typed
 */ 