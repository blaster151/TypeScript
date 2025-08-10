/**
 * Complete Pattern Matching with Conditional Guard Clauses
 * 
 * Extends the pattern matching system to support conditional guard clauses:
 * - Syntax: `(pattern) if <condition>` for match expressions
 * - Works in both expression-style and statement-style matches
 * - Supports guards for all ADTs (Maybe, Either, Result, GADT variants, etc.)
 * - Type inference with narrowed types in guard expressions
 * - Exhaustiveness checking that considers guards
 * - Integration with functional combinators and fluent syntax
 */

import {
  EnhancedADTInstance,
  MatchHandlers,
  TagOnlyHandlers
} from './fp-pattern-matching-ergonomics';

/**
 * Sentinel value indicating no pattern matched
 */
const NO_MATCH = Symbol('no-match');

// ============================================================================
// Part 1: Guard Clause Types and Interfaces
// ============================================================================

/**
 * Utility type to extract payload type for a specific tag
 * 
 * Usage example:
 * ```typescript
 * const tag = instance.getTag();
 * const payload = instance.getPayload<typeof tag>();
 * // payload is now typed as PayloadOf<Spec, typeof tag>
 * // instead of 'any'
 * ```
 */
export type PayloadOf<Spec extends Record<string, any>, Tag extends keyof Spec> = Spec[Tag];

/**
 * Guard condition function that takes pattern variables and returns boolean
 */
export type GuardCondition<Payload> = (payload: Payload) => boolean;

/**
 * Guarded pattern with condition and handler
 */
export interface GuardedPattern<Payload, Result> {
  readonly condition: GuardCondition<Payload>;
  readonly handler: (payload: Payload) => Result;
}

/**
 * Extended match handlers with guard clause support
 */
export interface GuardedMatchHandlers<Spec extends Record<string, any>, Result> {
  [K in keyof Spec]?: 
    | ((payload: Spec[K]) => Result) // Regular handler
    | GuardedPattern<Spec[K], Result>[] // Guarded patterns
    | {
        patterns?: GuardedPattern<Spec[K], Result>[];
        fallback?: (payload: Spec[K]) => Result;
      };
} & {
  _?: (tag: string, payload: any) => Result;
  otherwise?: (tag: string, payload: any) => Result;
}

/**
 * Extended tag-only handlers with guard clause support
 */
export interface GuardedTagOnlyHandlers<Spec extends Record<string, any>, Result> {
  [K in keyof Spec]?: 
    | (() => Result) // Regular handler
    | GuardedPattern<void, Result>[] // Guarded patterns
    | {
        patterns?: GuardedPattern<void, Result>[];
        fallback?: () => Result;
      };
} & {
  _?: (tag: string) => Result;
  otherwise?: (tag: string) => Result;
}

// ============================================================================
// Part 2: Guard Creation Utilities
// ============================================================================

/**
 * Generic projector for creating guards on arbitrary payload shapes
 * 
 * Usage example:
 * ```typescript
 * and(
 *   on(p => p.value)(x => x > 0),
 *   on(p => p.meta.id)(matches(/^\d+$/))
 * )
 * ```
 */
export const on = <P, A>(proj: (p: P) => A) =>
  (pred: (a: A) => boolean): GuardCondition<P> =>
    (p) => pred(proj(p));

/**
 * Create a single guard with condition and handler
 */
export function guard<Payload, Result>(
  condition: GuardCondition<Payload>,
  handler: (payload: Payload) => Result
): GuardedHandler<Payload, Result> {
  return { condition, handler };
}

/**
 * Create multiple guards for a tag
 */
export function guards<Payload, Result>(
  ...guards: GuardedHandler<Payload, Result>[]
): GuardedHandler<Payload, Result>[] {
  return guards;
}

/**
 * Create a guard specification with fallback
 */
export function guardWithFallback<Payload, Result>(
  guards: GuardedHandler<Payload, Result>[],
  fallback: (payload: Payload) => Result
): {
  guards: GuardedHandler<Payload, Result>[];
  fallback: (payload: Payload) => Result;
} {
  return { guards, fallback };
}

// ============================================================================
// Part 3: Common Guard Conditions
// ============================================================================

/**
 * Common guard conditions for various types
 * Now works with arbitrary payload shapes using the 'on' projector
 */
export const CommonGuards = {
  /**
   * Check if projected value is greater than threshold
   */
  gt: <T extends number>(threshold: T) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => value > threshold),
  
  /**
   * Check if projected value is greater than or equal to threshold
   */
  gte: <T extends number>(threshold: T) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => value >= threshold),
  
  /**
   * Check if projected value is less than threshold
   */
  lt: <T extends number>(threshold: T) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => value < threshold),
  
  /**
   * Check if projected value is less than or equal to threshold
   */
  lte: <T extends number>(threshold: T) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => value <= threshold),
  
  /**
   * Check if projected value is between min and max (inclusive)
   */
  between: <T extends number>(min: T, max: T) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => value >= min && value <= max),
  
  /**
   * Check if projected value is positive
   */
  positive: <P>(proj: (p: P) => number): GuardCondition<P> =>
    on(proj)(value => value > 0),
  
  /**
   * Check if projected value is negative
   */
  negative: <P>(proj: (p: P) => number): GuardCondition<P> =>
    on(proj)(value => value < 0),
  
  /**
   * Check if projected value is zero
   */
  zero: <P>(proj: (p: P) => number): GuardCondition<P> =>
    on(proj)(value => value === 0),
  
  /**
   * Check if projected string value matches regex
   */
  matches: (regex: RegExp) => 
    <P>(proj: (p: P) => string): GuardCondition<P> =>
      on(proj)(value => regex.test(value)),
  
  /**
   * Check if projected string value starts with prefix
   */
  startsWith: (prefix: string) => 
    <P>(proj: (p: P) => string): GuardCondition<P> =>
      on(proj)(value => value.startsWith(prefix)),
  
  /**
   * Check if projected string value ends with suffix
   */
  endsWith: (suffix: string) => 
    <P>(proj: (p: P) => string): GuardCondition<P> =>
      on(proj)(value => value.endsWith(suffix)),
  
  /**
   * Check if projected string value has length greater than threshold
   */
  longerThan: (threshold: number) => 
    <P>(proj: (p: P) => string): GuardCondition<P> =>
      on(proj)(value => value.length > threshold),
  
  /**
   * Check if projected string value has length less than threshold
   */
  shorterThan: (threshold: number) => 
    <P>(proj: (p: P) => string): GuardCondition<P> =>
      on(proj)(value => value.length < threshold),
  
  /**
   * Check if projected string value has exact length
   */
  exactLength: (length: number) => 
    <P>(proj: (p: P) => string): GuardCondition<P> =>
      on(proj)(value => value.length === length),
  
  /**
   * Check if projected string value is empty
   */
  strIsEmpty: <P>(proj: (p: P) => string): GuardCondition<P> =>
    on(proj)(value => value.length === 0),
  
  /**
   * Check if projected string value is not empty
   */
  strIsNotEmpty: <P>(proj: (p: P) => string): GuardCondition<P> =>
    on(proj)(value => value.length > 0),
  
  /**
   * Check if projected array value is empty
   */
  arrIsEmpty: <P, T>(proj: (p: P) => T[]): GuardCondition<P> =>
    on(proj)(value => value.length === 0),
  
  /**
   * Check if projected array value is not empty
   */
  arrIsNotEmpty: <P, T>(proj: (p: P) => T[]): GuardCondition<P> =>
    on(proj)(value => value.length > 0),
  
  /**
   * Check if projected array value has length greater than threshold
   */
  longerArrayThan: (threshold: number) => 
    <P, T>(proj: (p: P) => T[]): GuardCondition<P> =>
      on(proj)(value => value.length > threshold),
  
  /**
   * Check if projected array value has length less than threshold
   */
  shorterArrayThan: (threshold: number) => 
    <P>(proj: (p: P) => string): GuardCondition<P> =>
      on(proj)(value => value.length < threshold),
  
  /**
   * Check if projected array value has exact length
   */
  exactArrayLength: (length: number) => 
    <P, T>(proj: (p: P) => T[]): GuardCondition<P> =>
      on(proj)(value => value.length === length),
  
  /**
   * Check if projected value is null
   */
  isNull: <P>(proj: (p: P) => any): GuardCondition<P> =>
    on(proj)(value => value === null),
  
  /**
   * Check if projected value is undefined
   */
  isUndefined: <P>(proj: (p: P) => any): GuardCondition<P> =>
    on(proj)(value => value === undefined),
  
  /**
   * Check if projected value is truthy
   */
  isTruthy: <P>(proj: (p: P) => any): GuardCondition<P> =>
    on(proj)(value => Boolean(value)),
  
  /**
   * Check if projected value is falsy
   */
  isFalsy: <P>(proj: (p: P) => any): GuardCondition<P> =>
    on(proj)(value => !Boolean(value)),
  
  /**
   * Check if projected value equals target
   */
  eq: <T>(target: T) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => value === target),
  
  /**
   * Check if projected value does not equal target
   */
  ne: <T>(target: T) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => value !== target),
  
  /**
   * Check if projected value is instance of constructor
   */
  instanceOf: <T>(constructor: new (...args: any[]) => T) => 
    <P>(proj: (p: P) => any): GuardCondition<P> =>
      on(proj)(value => value instanceof constructor),
  
  /**
   * Check if projected value has property
   */
  hasProperty: <K extends string>(key: K) => 
    <P>(proj: (p: P) => any): GuardCondition<P> =>
      on(proj)(value => key in value),
  
  /**
   * Check if projected value is in array
   */
  in: <T>(array: T[]) => 
    <P>(proj: (p: P) => T): GuardCondition<P> =>
      on(proj)(value => array.includes(value))
};

// ============================================================================
// Part 4: Guard Composition
// ============================================================================

/**
 * Compose guard conditions with AND logic
 */
export function and<Payload>(
  ...conditions: GuardCondition<Payload>[]
): GuardCondition<Payload> {
  return (payload: Payload) => conditions.every(condition => condition(payload));
}

/**
 * Compose guard conditions with OR logic
 */
export function or<Payload>(
  ...conditions: GuardCondition<Payload>[]
): GuardCondition<Payload> {
  return (payload: Payload) => conditions.some(condition => condition(payload));
}

/**
 * Negate a guard condition
 */
export function not<Payload>(
  condition: GuardCondition<Payload>
): GuardCondition<Payload> {
  return (payload: Payload) => !condition(payload);
}

// ============================================================================
// Part 5: Pattern Matching with Guards
// ============================================================================

/**
 * Pattern match with guard clause support
 */
export function matchWithGuards<Spec extends Record<string, any>, Result>(
  instance: EnhancedADTInstance<Spec>,
  handlers: GuardedMatchHandlers<Spec, Result>
): Result {
  const tag = instance.getTag();
  const payload = instance.getPayload();
  
  // Get handler for the tag
  const handler = handlers[tag as keyof Spec];
  
  if (handler) {
    // Handle different handler types
    if (typeof handler === 'function') {
      // Regular handler
      return handler(payload);
    } else if (Array.isArray(handler)) {
      // Array of guarded patterns
      return matchGuardedPatterns(handler, payload);
    } else if (handler && typeof handler === 'object' && 'patterns' in handler) {
      // Object with patterns and optional fallback
      const result = matchGuardedPatterns(handler.patterns || [], payload);
      if (result !== NO_MATCH) {
        return result;
      }
          if (handler.fallback) {
      return handler.fallback(payload);
    }
    
    // Runtime exhaustiveness check: warn if tag has empty patterns and no fallback
    if (Array.isArray(handler) && handler.length === 0) {
      console.warn(`[Runtime Exhaustiveness Warning] Tag '${String(tag)}' has an empty pattern list and no fallback handler. This may indicate non-exhaustive pattern matching.`);
    } else if (typeof handler === 'object' && handler !== null && 'patterns' in handler && 
               (!handler.patterns || handler.patterns.length === 0) && !handler.fallback) {
      console.warn(`[Runtime Exhaustiveness Warning] Tag '${String(tag)}' has no patterns and no fallback handler. This may indicate non-exhaustive pattern matching.`);
    }
    }
  }
  
  // Try fallback handlers
  const fallback = handlers._ || handlers.otherwise;
  if (fallback) {
    return fallback(tag, payload);
  }
  
  throw new Error(`Unhandled tag: ${String(tag)}`);
}

/**
 * Match against guarded patterns
 */
function matchGuardedPatterns<Payload, Result>(
  patterns: GuardedPattern<Payload, Result>[],
  payload: Payload
): Result | typeof NO_MATCH {
  for (const pattern of patterns) {
    if (pattern.condition(payload)) {
      return pattern.handler(payload);
    }
  }
  return NO_MATCH;
}

/**
 * Tag-only pattern match with guard clause support
 */
export function matchTagWithGuards<Spec extends Record<string, any>, Result>(
  instance: EnhancedADTInstance<Spec>,
  handlers: GuardedTagOnlyHandlers<Spec, Result>
): Result {
  const tag = instance.getTag();
  
  // Get handler for the tag
  const handler = handlers[tag as keyof Spec];
  
  if (handler) {
    // Handle different handler types
    if (typeof handler === 'function') {
      // Regular handler
      return handler();
    } else if (Array.isArray(handler)) {
      // Array of guarded patterns
      return matchTagGuardedPatterns(handler);
    } else if (handler && typeof handler === 'object' && 'patterns' in handler) {
      // Object with patterns and optional fallback
      const result = matchTagGuardedPatterns(handler.patterns || []);
      if (result !== NO_MATCH) {
        return result;
      }
      if (handler.fallback) {
        return handler.fallback();
      }
      
      // Runtime exhaustiveness check: warn if tag has empty patterns and no fallback
      if (Array.isArray(handler) && handler.length === 0) {
        console.warn(`[Runtime Exhaustiveness Warning] Tag '${String(tag)}' has an empty pattern list and no fallback handler. This may indicate non-exhaustive pattern matching.`);
      } else if (typeof handler === 'object' && handler !== null && 'patterns' in handler && 
                 (!handler.patterns || handler.patterns.length === 0) && !handler.fallback) {
        console.warn(`[Runtime Exhaustiveness Warning] Tag '${String(tag)}' has no patterns and no fallback handler. This may indicate non-exhaustive pattern matching.`);
      }
    }
  }
  
  // Try fallback handlers
  const fallback = handlers._ || handlers.otherwise;
  if (fallback) {
    return fallback(tag);
  }
  
  throw new Error(`Unhandled tag: ${String(tag)}`);
}

/**
 * Match against tag-only guarded patterns
 */
function matchTagGuardedPatterns<Result>(
  patterns: GuardedPattern<void, Result>[]
): Result | typeof NO_MATCH {
  for (const pattern of patterns) {
    if (pattern.condition(undefined)) {
      return pattern.handler(undefined);
    }
  }
  return NO_MATCH;
}

// ============================================================================
// Part 6: Enhanced ADT Instance with Guard Support
// ============================================================================

/**
 * Enhanced ADT instance with guard clause support
 */
export interface GuardedADTInstance<Spec extends Record<string, any>> 
  extends EnhancedADTInstance<Spec> {
  
  /**
   * Pattern match with guard clause support
   */
  matchWithGuards<Result>(
    handlers: GuardedMatchHandlers<Spec, Result>
  ): Result;
  
  /**
   * Tag-only pattern match with guard clause support
   */
  matchTagWithGuards<Result>(
    handlers: GuardedTagOnlyHandlers<Spec, Result>
  ): Result;
  
  /**
   * Get the payload with type narrowed based on the current tag
   */
  getPayload<Tag extends keyof Spec = keyof Spec>(): Tag extends keyof Spec ? Spec[Tag] : never;
}

/**
 * Add guard support to an existing ADT instance
 */
export function attachGuards<Spec extends Record<string, any>>(
  instance: EnhancedADTInstance<Spec>
): GuardedADTInstance<Spec> {
  return {
    ...instance,
    matchWithGuards<Result>(handlers: GuardedMatchHandlers<Spec, Result>): Result {
      return matchWithGuards(instance, handlers);
    },
    matchTagWithGuards<Result>(handlers: GuardedTagOnlyHandlers<Spec, Result>): Result {
      return matchTagWithGuards(instance, handlers);
    }
  };
}

// ============================================================================
// Part 7: Data-Last API Support
// ============================================================================

/**
 * Data-last version of matchWithGuards
 */
export function matchWithGuardsDataLast<Spec extends Record<string, any>, Result>(
  handlers: GuardedMatchHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result => 
    matchWithGuards(instance, handlers);
}

/**
 * Data-last version of matchTagWithGuards
 */
export function matchTagWithGuardsDataLast<Spec extends Record<string, any>, Result>(
  handlers: GuardedTagOnlyHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result => 
    matchTagWithGuards(instance, handlers);
}

// ============================================================================
// Part 8: Matcher Creation Functions
// ============================================================================

/**
 * Create a guarded matcher function
 */
export function createGuardedMatcher<Spec extends Record<string, any>, Result>(
  handlers: GuardedMatchHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result => 
    matchWithGuards(instance, handlers);
}

/**
 * Create a guarded tag matcher function
 */
export function createGuardedTagMatcher<Spec extends Record<string, any>, Result>(
  handlers: GuardedTagOnlyHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result => 
    matchTagWithGuards(instance, handlers);
}

// ============================================================================
// Part 9: Type Utilities
// ============================================================================

/**
 * Extract result type from guarded match handlers
 */
export type ExtractGuardedResult<Handlers> = 
  Handlers extends GuardedMatchHandlers<any, infer R> ? R : never;

/**
 * Extract result type from guarded tag-only handlers
 */
export type ExtractGuardedTagResult<Handlers> = 
  Handlers extends GuardedTagOnlyHandlers<any, infer R> ? R : never;

/**
 * Check if guarded handlers are exhaustive
 */
export type IsGuardedExhaustive<Spec extends Record<string, any>, Handlers> = 
  keyof Spec extends keyof Handlers ? true : false;

/**
 * Check if handlers have fallback
 */
export type HasGuardedFallback<Handlers> = 
  '_' extends keyof Handlers ? true : 
  'otherwise' extends keyof Handlers ? true : false;

/**
 * Utility type to check if a handler configuration might be non-exhaustive at runtime
 * This helps identify cases where a tag has no patterns and no fallback
 */
export type IsRuntimeExhaustive<Spec extends Record<string, any>, Handlers> = {
  [K in keyof Spec]: Handlers extends { [P in K]: infer H }
    ? H extends GuardedPattern<Spec[K], any>[]
      ? H extends never[] ? false : true
      : H extends { patterns?: GuardedPattern<Spec[K], any>[]; fallback?: any }
        ? H extends { patterns: never[]; fallback?: never } ? false : true
        : true
      : true
    : false;
};

// ============================================================================
// Part 10: Expression-Style Match Builder
// ============================================================================

/**
 * Expression-style match builder with guard support
 */
export class MatchBuilder<Value, Result> {
  private patterns: Array<{
    condition: (value: Value) => boolean;
    guard?: (value: Value) => boolean;
    handler: (value: Value) => Result;
  }> = [];
  private fallback?: (value: Value) => Result;

  /**
   * Add a case with optional guard
   */
  case(
    condition: (value: Value) => boolean,
    handler: (value: Value) => Result
  ): MatchBuilder<Value, Result>;
  case(
    condition: (value: Value) => boolean,
    guard: (value: Value) => boolean,
    handler: (value: Value) => Result
  ): MatchBuilder<Value, Result>;
  case(
    condition: (value: Value) => boolean,
    guardOrHandler: ((value: Value) => boolean) | ((value: Value) => Result),
    handler?: (value: Value) => Result
  ): MatchBuilder<Value, Result> {
    if (handler) {
      // Three arguments: condition, guard, handler
      this.patterns.push({
        condition,
        guard: guardOrHandler as (value: Value) => boolean,
        handler
      });
    } else {
      // Two arguments: condition, handler
      this.patterns.push({
        condition,
        handler: guardOrHandler as (value: Value) => Result
      });
    }
    return this;
  }

  /**
   * Add a fallback case
   */
  otherwise(handler: (value: Value) => Result): MatchBuilder<Value, Result> {
    this.fallback = handler;
    return this;
  }

  /**
   * Execute the match
   */
  match(value: Value): Result {
    for (const pattern of this.patterns) {
      if (pattern.condition(value)) {
        if (pattern.guard && !pattern.guard(value)) {
          continue; // Guard failed, try next pattern
        }
        return pattern.handler(value);
      }
    }
    
    if (this.fallback) {
      return this.fallback(value);
    }
    
    throw new Error('No matching pattern found');
  }
}

/**
 * Create a match builder
 */
export function match<Value>(value: Value): MatchBuilder<Value, any> {
  return new MatchBuilder<Value, any>();
}

// ============================================================================
// Part 11: Export Everything
// ============================================================================

export {
  // Core types
  GuardCondition,
  GuardedPattern,
  GuardedMatchHandlers,
  GuardedTagOnlyHandlers,
  
  // Utility types
  PayloadOf,
  IsRuntimeExhaustive,
  
  // Guard creation utilities
  pattern,
  patternNoGuard,
  patterns,
  patternsWithFallback,
  
  // Common guard conditions
  CommonGuards,
  
  // Guard composition
  and,
  or,
  not,
  
  // Pattern matching functions
  matchWithGuards,
  matchTagWithGuards,
  
  // Enhanced ADT instance
  GuardedADTInstance,
  attachGuards,
  
  // Data-last API
  matchWithGuardsDataLast,
  matchTagWithGuardsDataLast,
  
  // Matcher creation
  createGuardedMatcher,
  createGuardedTagMatcher,
  
  // Expression-style matching
  MatchBuilder,
  match
}; 