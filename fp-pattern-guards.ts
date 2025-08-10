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
 * - Dev warnings for non-exhaustive guarded handlers
 */

import {
  EnhancedADTInstance,
  MatchHandlers,
  TagOnlyHandlers
} from './fp-adt-builders-enhanced';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for dev warnings
 */
export interface GuardDevConfig {
  /** Enable dev warnings for non-exhaustive guarded handlers */
  enableGuardWarnings?: boolean;
  /** Custom warning function (defaults to console.warn) */
  warnFunction?: (message: string) => void;
}

// Default configuration
const DEFAULT_GUARD_CONFIG: Required<GuardDevConfig> = {
  enableGuardWarnings: true,
  warnFunction: console.warn
};

// Global configuration instance
let guardConfig: Required<GuardDevConfig> = { ...DEFAULT_GUARD_CONFIG };

/**
 * Configure dev warnings for guard matching
 */
export function configureGuardWarnings(config: GuardDevConfig): void {
  guardConfig = { ...guardConfig, ...config };
}

/**
 * Check if a handler has non-exhaustive guards and log a warning if enabled
 */
function checkNonExhaustiveGuards<T>(
  tag: string,
  handler: T,
  context: string
): void {
  if (!guardConfig.enableGuardWarnings) return;
  
  // Check if handler is { guards: [] } with no fallback
  if (
    handler &&
    typeof handler === 'object' &&
    'guards' in handler &&
    Array.isArray((handler as any).guards) &&
    (handler as any).guards.length === 0 &&
    !('fallback' in handler)
  ) {
    const warning = `⚠️  Guard Warning: Handler for tag "${tag}" has empty guards array with no fallback. This will always throw an error at runtime. Consider adding a fallback or removing the empty guards. Context: ${context}`;
    guardConfig.warnFunction(warning);
  }
}

// ============================================================================
// Part 1: Pattern Guard Types
// ============================================================================

/**
 * Sentinel value to distinguish between "no matching guard" and "intentional undefined return"
 */
const NO_MATCH = Symbol('no-match');

/**
 * Guard condition function that takes pattern variables and returns boolean
 */
export type GuardCondition<Payload> = (payload: Payload) => boolean;

/**
 * Extract payload type for a specific tag from a spec
 */
export type PayloadOf<S extends Record<string, any>, K extends keyof S> = S[K];

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
export const GuardSet = {
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
    <P, T>(proj: (p: P) => T[]): GuardCondition<P> =>
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
  const payload = instance.getPayload() as PayloadOf<Spec, typeof tag>;
  const handler = handlers[tag];
  
  if (!handler) {
    // Try fallback handlers
    const fallback = handlers._ || handlers.otherwise;
    if (fallback) {
      return fallback(tag as string, payload);
    }
    throw new Error(`Unhandled tag: ${String(tag)}`);
  }
  
  // Check for non-exhaustive guards and log warnings
  checkNonExhaustiveGuards(tag, handler, 'matchWithGuards');
  
  // Handle different handler types
  if (Array.isArray(handler)) {
    // Guarded handlers array
    const result = matchGuardedHandlers(handler, payload);
    if (result !== NO_MATCH) {
      return result;
    }
    // No guard matched, continue to fallback or throw
  } else if (typeof handler === 'function') {
    // Regular handler
    return handler(payload);
  } else if (handler && typeof handler === 'object' && 'guards' in handler) {
    // Guarded handlers with fallback
    const { guards: guardHandlers, fallback } = handler;
    if (guardHandlers) {
      const result = matchGuardedHandlers(guardHandlers, payload);
      if (result !== NO_MATCH) { // Check for NO_MATCH sentinel
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
): Result | typeof NO_MATCH {
  for (const { condition, handler } of guards) {
    if (condition(payload)) {
      return handler(payload);
    }
  }
  return NO_MATCH; // No guard matched
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
  
  // Check for non-exhaustive guards and log warnings
  checkNonExhaustiveGuards(tag, handler, 'matchTagWithGuards');
  
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
      if (result !== NO_MATCH) { // Check for NO_MATCH sentinel
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
): Result | typeof NO_MATCH {
  for (const { condition, handler } of guards) {
    if (condition({})) {
      return handler({});
    }
  }
  return NO_MATCH; // No guard matched
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
export function attachGuards<Spec extends Record<string, any>>(
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
// Part 7: Non-Guarded Data-Last Functions (for symmetry)
// ============================================================================

/**
 * Data-last pattern matching (non-guarded)
 */
export function matchDataLast<Spec extends Record<string, any>, Result>(
  handlers: MatchHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result =>
    instance.match(handlers);
}

/**
 * Data-last tag-only pattern matching (non-guarded)
 */
export function matchTagDataLast<Spec extends Record<string, any>, Result>(
  handlers: TagOnlyHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result =>
    instance.matchTag(handlers);
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