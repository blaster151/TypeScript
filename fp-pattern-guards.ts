/**
 * Pattern Guards for ADT Matcher System
 * 
 * This module extends the ADT matcher system to support pattern guards (conditional matching clauses).
 * 
 * Features:
 * - Syntax extension: `(pattern) if (condition) => result`
 * - Type-safe guards with boolean expressions
 * - Declaration order testing with fallback to unguarded patterns
 * - Integration with all ADTs with .match() support
 * - Fluent and data-last API support
 * - No runtime penalty for unguarded matches
 */

import {
  EnhancedADTInstance,
  MatchHandlers,
  TagOnlyHandlers
} from './fp-adt-builders-enhanced';

// ============================================================================
// Part 1: Pattern Guard Types
// ============================================================================

/**
 * Guard condition function that takes pattern variables and returns boolean
 */
export type GuardCondition<Payload> = (payload: Payload) => boolean;

/**
 * Guarded handler with condition and result function
 */
export interface GuardedHandler<Payload, Result> {
  readonly condition: GuardCondition<Payload>;
  readonly handler: (payload: Payload) => Result;
}

/**
 * Pattern guard specification for a tag
 */
export interface PatternGuard<Payload, Result> {
  readonly tag: string;
  readonly guards: GuardedHandler<Payload, Result>[];
  readonly fallback?: (payload: Payload) => Result;
}

/**
 * Extended match handlers with pattern guards
 */
export interface GuardedMatchHandlers<Spec extends Record<string, any>, Result> {
  [K in keyof Spec]?: 
    | ((payload: Spec[K]) => Result) // Regular handler
    | GuardedHandler<Spec[K], Result>[] // Guarded handlers
    | {
        guards?: GuardedHandler<Spec[K], Result>[];
        fallback?: (payload: Spec[K]) => Result;
      };
} & {
  _?: (tag: string, payload: any) => Result;
  otherwise?: (tag: string, payload: any) => Result;
}

/**
 * Extended tag-only handlers with pattern guards
 */
export interface GuardedTagOnlyHandlers<Spec extends Record<string, any>, Result> {
  [K in keyof Spec]?: 
    | (() => Result) // Regular handler
    | GuardedHandler<void, Result>[] // Guarded handlers
    | {
        guards?: GuardedHandler<void, Result>[];
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
 * Create a pattern guard for a specific tag
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
 * Common guard conditions for numeric values
 */
export const Guards = {
  /**
   * Check if value is greater than threshold
   */
  gt: <T extends number>(threshold: T) => 
    (value: { value: T }) => value.value > threshold,
  
  /**
   * Check if value is greater than or equal to threshold
   */
  gte: <T extends number>(threshold: T) => 
    (value: { value: T }) => value.value >= threshold,
  
  /**
   * Check if value is less than threshold
   */
  lt: <T extends number>(threshold: T) => 
    (value: { value: T }) => value.value < threshold,
  
  /**
   * Check if value is less than or equal to threshold
   */
  lte: <T extends number>(threshold: T) => 
    (value: { value: T }) => value.value <= threshold,
  
  /**
   * Check if value is between min and max (inclusive)
   */
  between: <T extends number>(min: T, max: T) => 
    (value: { value: T }) => value.value >= min && value.value <= max,
  
  /**
   * Check if value is positive
   */
  positive: <T extends number>(value: { value: T }) => value.value > 0,
  
  /**
   * Check if value is negative
   */
  negative: <T extends number>(value: { value: T }) => value.value < 0,
  
  /**
   * Check if value is zero
   */
  zero: <T extends number>(value: { value: T }) => value.value === 0,
  
  /**
   * Check if string value matches regex
   */
  matches: (regex: RegExp) => 
    (value: { value: string }) => regex.test(value.value),
  
  /**
   * Check if string value starts with prefix
   */
  startsWith: (prefix: string) => 
    (value: { value: string }) => value.value.startsWith(prefix),
  
  /**
   * Check if string value ends with suffix
   */
  endsWith: (suffix: string) => 
    (value: { value: string }) => value.value.endsWith(suffix),
  
  /**
   * Check if string value has length greater than threshold
   */
  longerThan: (threshold: number) => 
    (value: { value: string }) => value.value.length > threshold,
  
  /**
   * Check if string value has length less than threshold
   */
  shorterThan: (threshold: number) => 
    (value: { value: string }) => value.value.length < threshold,
  
  /**
   * Check if array value has length greater than threshold
   */
  hasMoreThan: <T>(threshold: number) => 
    (value: { value: T[] }) => value.value.length > threshold,
  
  /**
   * Check if array value has length less than threshold
   */
  hasLessThan: <T>(threshold: number) => 
    (value: { value: T[] }) => value.value.length < threshold,
  
  /**
   * Check if array value is empty
   */
  isEmpty: <T>(value: { value: T[] }) => value.value.length === 0,
  
  /**
   * Check if array value is not empty
   */
  isNotEmpty: <T>(value: { value: T[] }) => value.value.length > 0,
  
  /**
   * Check if object value has specific property
   */
  hasProperty: <K extends string>(key: K) => 
    (value: { value: Record<string, any> }) => key in value.value,
  
  /**
   * Check if object value has specific property with truthy value
   */
  hasTruthyProperty: <K extends string>(key: K) => 
    (value: { value: Record<string, any> }) => Boolean(value.value[key]),
  
  /**
   * Check if value is null
   */
  isNull: (value: { value: any }) => value.value === null,
  
  /**
   * Check if value is undefined
   */
  isUndefined: (value: { value: any }) => value.value === undefined,
  
  /**
   * Check if value is truthy
   */
  isTruthy: (value: { value: any }) => Boolean(value.value),
  
  /**
   * Check if value is falsy
   */
  isFalsy: (value: { value: any }) => !value.value,
  
  /**
   * Custom guard condition
   */
  custom: <T>(predicate: (value: T) => boolean) => 
    (value: { value: T }) => predicate(value.value)
};

// ============================================================================
// Part 4: Enhanced Pattern Matching with Guards
// ============================================================================

/**
 * Enhanced pattern matching with guard support
 */
export function matchWithGuards<Spec extends Record<string, any>, Result>(
  instance: EnhancedADTInstance<Spec>,
  handlers: GuardedMatchHandlers<Spec, Result>
): Result {
  const tag = instance.getTag() as keyof Spec;
  const payload = instance.getPayload();
  const handler = handlers[tag];
  
  if (!handler) {
    // Try fallback handlers
    const fallback = handlers._ || handlers.otherwise;
    if (fallback) {
      return fallback(tag as string, payload);
    }
    throw new Error(`Unhandled tag: ${String(tag)}`);
  }
  
  // Handle different handler types
  if (Array.isArray(handler)) {
    // Guarded handlers array
    return matchGuardedHandlers(handler, payload);
  } else if (typeof handler === 'function') {
    // Regular handler
    return handler(payload);
  } else if (handler && typeof handler === 'object' && 'guards' in handler) {
    // Guarded handlers with fallback
    const { guards: guardHandlers, fallback } = handler;
    if (guardHandlers) {
      const result = matchGuardedHandlers(guardHandlers, payload);
      if (result !== undefined) {
        return result;
      }
    }
    if (fallback) {
      return fallback(payload);
    }
  }
  
  throw new Error(`Invalid handler for tag: ${String(tag)}`);
}

/**
 * Match against guarded handlers
 */
function matchGuardedHandlers<Payload, Result>(
  guards: GuardedHandler<Payload, Result>[],
  payload: Payload
): Result | undefined {
  for (const { condition, handler } of guards) {
    if (condition(payload)) {
      return handler(payload);
    }
  }
  return undefined; // No guard matched
}

/**
 * Enhanced tag-only pattern matching with guard support
 */
export function matchTagWithGuards<Spec extends Record<string, any>, Result>(
  instance: EnhancedADTInstance<Spec>,
  handlers: GuardedTagOnlyHandlers<Spec, Result>
): Result {
  const tag = instance.getTag() as keyof Spec;
  const handler = handlers[tag];
  
  if (!handler) {
    // Try fallback handlers
    const fallback = handlers._ || handlers.otherwise;
    if (fallback) {
      return fallback(tag as string);
    }
    throw new Error(`Unhandled tag: ${String(tag)}`);
  }
  
  // Handle different handler types
  if (Array.isArray(handler)) {
    // Guarded handlers array
    return matchTagGuardedHandlers(handler);
  } else if (typeof handler === 'function') {
    // Regular handler
    return handler();
  } else if (handler && typeof handler === 'object' && 'guards' in handler) {
    // Guarded handlers with fallback
    const { guards: guardHandlers, fallback } = handler;
    if (guardHandlers) {
      const result = matchTagGuardedHandlers(guardHandlers);
      if (result !== undefined) {
        return result;
      }
    }
    if (fallback) {
      return fallback();
    }
  }
  
  throw new Error(`Invalid handler for tag: ${String(tag)}`);
}

/**
 * Match against tag-only guarded handlers
 */
function matchTagGuardedHandlers<Result>(
  guards: GuardedHandler<void, Result>[]
): Result | undefined {
  for (const { condition, handler } of guards) {
    if (condition({})) {
      return handler({});
    }
  }
  return undefined; // No guard matched
}

// ============================================================================
// Part 5: Enhanced ADT Instance with Guards
// ============================================================================

/**
 * Enhanced ADT instance with pattern guard support
 */
export interface GuardedADTInstance<Spec extends Record<string, any>> 
  extends EnhancedADTInstance<Spec> {
  
  /**
   * Pattern match with guard support
   */
  matchWithGuards<Result>(
    handlers: GuardedMatchHandlers<Spec, Result>
  ): Result;
  
  /**
   * Tag-only pattern match with guard support
   */
  matchTagWithGuards<Result>(
    handlers: GuardedTagOnlyHandlers<Spec, Result>
  ): Result;
}

// ============================================================================
// Part 6: Fluent API Extensions
// ============================================================================

/**
 * Extend an ADT instance with guard support
 */
export function withGuards<Spec extends Record<string, any>>(
  instance: EnhancedADTInstance<Spec>
): GuardedADTInstance<Spec> {
  return {
    ...instance,
    matchWithGuards: <Result>(handlers: GuardedMatchHandlers<Spec, Result>) =>
      matchWithGuards(instance, handlers),
    matchTagWithGuards: <Result>(handlers: GuardedTagOnlyHandlers<Spec, Result>) =>
      matchTagWithGuards(instance, handlers)
  };
}

// ============================================================================
// Part 7: Data-Last API Functions
// ============================================================================

/**
 * Data-last pattern matching with guards
 */
export function matchWithGuardsDataLast<Spec extends Record<string, any>, Result>(
  handlers: GuardedMatchHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result =>
    matchWithGuards(instance, handlers);
}

/**
 * Data-last tag-only pattern matching with guards
 */
export function matchTagWithGuardsDataLast<Spec extends Record<string, any>, Result>(
  handlers: GuardedTagOnlyHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result =>
    matchTagWithGuards(instance, handlers);
}

// ============================================================================
// Part 8: Utility Functions
// ============================================================================

/**
 * Create a reusable matcher with guards
 */
export function createGuardedMatcher<Spec extends Record<string, any>, Result>(
  handlers: GuardedMatchHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result =>
    matchWithGuards(instance, handlers);
}

/**
 * Create a reusable tag-only matcher with guards
 */
export function createGuardedTagMatcher<Spec extends Record<string, any>, Result>(
  handlers: GuardedTagOnlyHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result =>
    matchTagWithGuards(instance, handlers);
}

/**
 * Compose multiple guards with AND logic
 */
export function and<Payload>(
  ...conditions: GuardCondition<Payload>[]
): GuardCondition<Payload> {
  return (payload: Payload) => conditions.every(condition => condition(payload));
}

/**
 * Compose multiple guards with OR logic
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
// Part 9: Type Utilities
// ============================================================================

/**
 * Extract result type from guarded handlers
 */
export type ExtractGuardedResult<Handlers> = 
  Handlers extends GuardedMatchHandlers<any, infer R> ? R : never;

/**
 * Extract result type from guarded tag-only handlers
 */
export type ExtractGuardedTagResult<Handlers> = 
  Handlers extends GuardedTagOnlyHandlers<any, infer R> ? R : never;

/**
 * Check if handlers are exhaustive
 */
export type IsGuardedExhaustive<Spec extends Record<string, any>, Handlers> = 
  keyof Spec extends keyof Handlers ? true : false;

/**
 * Check if handlers have fallback
 */
export type HasGuardedFallback<Handlers> = 
  '_' extends keyof Handlers ? true : 
  'otherwise' extends keyof Handlers ? true : false; 