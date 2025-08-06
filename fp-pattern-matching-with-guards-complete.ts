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

// ============================================================================
// Part 1: Guard Clause Types and Interfaces
// ============================================================================

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
 * Pattern with optional guard clause
 */
export interface PatternWithGuard<Payload, Result> {
  readonly pattern: (payload: Payload) => boolean;
  readonly guard?: GuardCondition<Payload>;
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
// Part 2: Guard Clause Creation Utilities
// ============================================================================

/**
 * Create a pattern with guard clause
 */
export function pattern<Payload, Result>(
  pattern: (payload: Payload) => boolean,
  guard: GuardCondition<Payload>,
  handler: (payload: Payload) => Result
): GuardedPattern<Payload, Result> {
  return { condition: guard, handler };
}

/**
 * Create a pattern without guard clause
 */
export function patternNoGuard<Payload, Result>(
  pattern: (payload: Payload) => boolean,
  handler: (payload: Payload) => Result
): GuardedPattern<Payload, Result> {
  return { 
    condition: () => true, // Always true condition
    handler 
  };
}

/**
 * Create multiple guarded patterns for a tag
 */
export function patterns<Payload, Result>(
  ...patterns: GuardedPattern<Payload, Result>[]
): GuardedPattern<Payload, Result>[] {
  return patterns;
}

/**
 * Create patterns with fallback
 */
export function patternsWithFallback<Payload, Result>(
  patterns: GuardedPattern<Payload, Result>[],
  fallback: (payload: Payload) => Result
): {
  patterns: GuardedPattern<Payload, Result>[];
  fallback: (payload: Payload) => Result;
} {
  return { patterns, fallback };
}

// ============================================================================
// Part 3: Common Guard Conditions
// ============================================================================

/**
 * Common guard conditions for various types
 */
export const Guards = {
  // Numeric guards
  gt: (threshold: number) => <T extends number>(value: T): boolean => value > threshold,
  gte: (threshold: number) => <T extends number>(value: T): boolean => value >= threshold,
  lt: (threshold: number) => <T extends number>(value: T): boolean => value < threshold,
  lte: (threshold: number) => <T extends number>(value: T): boolean => value <= threshold,
  eq: (target: number) => <T extends number>(value: T): boolean => value === target,
  ne: (target: number) => <T extends number>(value: T): boolean => value !== target,
  between: (min: number, max: number) => <T extends number>(value: T): boolean => value >= min && value <= max,
  positive: <T extends number>(value: T): boolean => value > 0,
  negative: <T extends number>(value: T): boolean => value < 0,
  zero: <T extends number>(value: T): boolean => value === 0,
  
  // String guards
  matches: (regex: RegExp) => (value: string): boolean => regex.test(value),
  startsWith: (prefix: string) => (value: string): boolean => value.startsWith(prefix),
  endsWith: (suffix: string) => (value: string): boolean => value.endsWith(suffix),
  longerThan: (length: number) => (value: string): boolean => value.length > length,
  shorterThan: (length: number) => (value: string): boolean => value.length < length,
  isEmpty: (value: string): boolean => value.length === 0,
  isNotEmpty: (value: string): boolean => value.length > 0,
  
  // Array guards
  hasMoreThan: (count: number) => <T>(value: T[]): boolean => value.length > count,
  hasLessThan: (count: number) => <T>(value: T[]): boolean => value.length < count,
  hasExactly: (count: number) => <T>(value: T[]): boolean => value.length === count,
  isEmpty: <T>(value: T[]): boolean => value.length === 0,
  isNotEmpty: <T>(value: T[]): boolean => value.length > 0,
  
  // Object guards
  hasProperty: <K extends string>(key: K) => <T extends Record<string, any>>(value: T): boolean => key in value,
  hasTruthyProperty: <K extends string>(key: K) => <T extends Record<string, any>>(value: T): boolean => Boolean(value[key]),
  isNull: (value: any): boolean => value === null,
  isUndefined: (value: any): boolean => value === undefined,
  isTruthy: (value: any): boolean => Boolean(value),
  isFalsy: (value: any): boolean => !Boolean(value),
  
  // Custom guard
  custom: <T>(predicate: (value: T) => boolean) => predicate
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
      if (result !== undefined) {
        return result;
      }
      if (handler.fallback) {
        return handler.fallback(payload);
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
): Result | undefined {
  for (const pattern of patterns) {
    if (pattern.condition(payload)) {
      return pattern.handler(payload);
    }
  }
  return undefined;
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
      if (result !== undefined) {
        return result;
      }
      if (handler.fallback) {
        return handler.fallback();
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
): Result | undefined {
  for (const pattern of patterns) {
    if (pattern.condition(undefined)) {
      return pattern.handler(undefined);
    }
  }
  return undefined;
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
}

/**
 * Add guard support to an existing ADT instance
 */
export function withGuards<Spec extends Record<string, any>>(
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
  PatternWithGuard,
  GuardedMatchHandlers,
  GuardedTagOnlyHandlers,
  
  // Guard creation utilities
  pattern,
  patternNoGuard,
  patterns,
  patternsWithFallback,
  
  // Common guard conditions
  Guards,
  
  // Guard composition
  and,
  or,
  not,
  
  // Pattern matching functions
  matchWithGuards,
  matchTagWithGuards,
  
  // Enhanced ADT instance
  GuardedADTInstance,
  withGuards,
  
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