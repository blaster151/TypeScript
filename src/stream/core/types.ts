/**
 * Core Types for State-monoid FRP
 * 
 * This module defines the foundational types for the State-monoid FRP system:
 * - StateFn<S, N>: State transformer function
 * - StateMonoid<S, N>: Monoid interface for state composition
 * - StatefulStream<I, S, O>: Stateful stream with input I, state S, output O
 * - PureOp and EvalOp type aliases for operation classification
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult
} from '../../../fp-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async, State
} from '../../../fp-purity';

// ============================================================================
// Core State Types
// ============================================================================

/**
 * Core state transformer type from the paper
 * StateFn<S, N> represents a function that takes a state S and returns
 * a new state S and a value N
 */
export type StateFn<S, N> = (state: S) => [S, N];

/**
 * State monoid interface for composition
 * Provides empty (identity) and concat (composition) operations
 */
export interface StateMonoid<S, N> {
  empty: StateFn<S, N>;
  concat: (a: StateFn<S, N>, b: StateFn<S, N>) => StateFn<S, N>;
}

/**
 * HKT for StatefulStream
 */
export interface StatefulStreamK extends Kind3 {
  readonly type: StatefulStream<this['arg0'], this['arg1'], this['arg2']>;
}

/**
 * StatefulStream wrapper with HKT integration
 * I: Input type
 * S: State type  
 * O: Output type
 */
export interface StatefulStream<I, S, O> {
  readonly run: (input: I) => StateFn<S, O>;
  readonly __brand: 'StatefulStream';
  readonly __purity: EffectTag;
}

// ============================================================================
// Operation Type Aliases
// ============================================================================

/**
 * Pure operation - doesn't modify state
 */
export type PureOp<I, O> = (input: I) => O;

/**
 * Evaluated operation - may modify state
 */
export type EvalOp<I, S, O> = (input: I, state: S) => [S, O];

// ============================================================================
// Specialized Stream Types
// ============================================================================

/**
 * Type alias for StatefulStream with void state (stateless)
 */
export type StatelessStream<I, O> = StatefulStream<I, void, O>;

/**
 * Type alias for StatefulStream with void input (constant)
 */
export type ConstantStream<S, O> = StatefulStream<void, S, O>;

/**
 * Type alias for StatefulStream with void input and state (pure function)
 */
export type PureStream<O> = StatefulStream<void, void, O>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a StatefulStream
 */
export function isStatefulStream(value: any): value is StatefulStream<any, any, any> {
  return value && 
         typeof value.run === 'function' && 
         value.__brand === 'StatefulStream' &&
         typeof value.__purity === 'string';
}

/**
 * Type guard to check if a StatefulStream is pure
 */
export function isPureStream(stream: StatefulStream<any, any, any>): boolean {
  return stream.__purity === 'Pure';
}

/**
 * Type guard to check if a StatefulStream is stateful
 */
export function isStatefulStreamStateful(stream: StatefulStream<any, any, any>): boolean {
  return stream.__purity === 'State';
} 