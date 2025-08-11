/**
 * Purity Tracking System
 * 
 * This module provides a type-level system that annotates and propagates whether a type or function is pure or impure.
 * It integrates cleanly with the HKT system so type constructors can declare their effect roles.
 * 
 * Features:
 * - Type-level purity effect system with EffectTag
 * - Phantom types for effect roles using EffectKind
 * - Purity tagging for type constructors via EffectOf<F>
 * - Purity typeclass for checking declared effects
 * - Function purity analysis helpers
 * - Purity propagation through function signatures
 * - Runtime tagging for typeclass instances
 * - Integration with Derivable Instances
 * - Compile-time and runtime purity verification
 */

import {
  Kind, Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  ObservableLiteK, TaskEitherK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import { ObservableLite } from './fp-observable-lite';
import { TaskEither } from './fp-bimonad-extended';

// ============================================================================
// Part 1: Type-Level Purity Effect System
// ============================================================================

/**
 * Purity policy
 * - Pure: no runtime effects (includes State, which is pure state-passing)
 * - IO: synchronous side effects
 * - Async: asynchronous effects (Promises, Observables, Tasks)
 * - State: treated as Pure (pure state-passing)
 */
export type EffectTag =
  | 'Pure'
  | 'IO'
  | 'Async'
  | 'State'
  | `Custom<${string}>`;

/**
 * Phantom type carrying the effect role
 */
export interface EffectKind<Tag extends EffectTag> {
  readonly _tag: Tag;
}

/**
 * Type-level effect tags with phantom types
 */
export type Pure = EffectKind<'Pure'>;
export type Impure = EffectKind<'Impure'>;
export type IO = EffectKind<'IO'>;
export type State = EffectKind<'State'>;
export type Async = EffectKind<'Async'>;
export type Custom<T extends string> = EffectKind<`Custom<${T}>`>;

// ============================================================================
// Part 2: HKT Integration - EffectOf<F>
// ============================================================================

/**
 * Extract the effect tag from a type constructor
 * Defaults to 'Pure' if not explicitly declared
 */
export type EffectOf<F> = 
  F extends { __effect?: infer E }
    ? E extends EffectTag
      ? E
      : 'Pure'
    : F extends { type: any }
      ? F extends { type: { __effect?: infer E } }
        ? E extends EffectTag
          ? E
          : 'Pure'
        : 'Pure'
      : 'Pure';

/**
 * Check if a type constructor is pure
 */
export type IsPure<F> = EffectOf<F> extends 'Pure' ? true : false;

/**
 * Check if a type constructor is impure
 */
export type IsImpure<F> = EffectOf<F> extends 'Pure' ? false : true;

/**
 * Check if a type constructor has a specific effect
 */
export type HasEffect<F, E extends EffectTag> = EffectOf<F> extends E ? true : false;

// ============================================================================
// Part 3: Purity Typeclass
// ============================================================================

/**
 * Purity typeclass for checking declared effects
 */
export interface Purity<F extends Kind<any>> {
  readonly effect: EffectOf<F>;
}

/**
 * Purity typeclass for unary type constructors
 */
export interface Purity1<F extends Kind1> extends Purity<F> {
  readonly effect: EffectOf<F>;
}

/**
 * Purity typeclass for binary type constructors
 */
export interface Purity2<F extends Kind2> extends Purity<F> {
  readonly effect: EffectOf<F>;
}

/**
 * Purity typeclass for ternary type constructors
 */
export interface Purity3<F extends Kind3> extends Purity<F> {
  readonly effect: EffectOf<F>;
}

// ============================================================================
// Part 4: Function Purity Analysis
// ============================================================================

/**
 * Extract effect from function return type
 */
export type FunctionEffect<F extends (...args: any) => any> = 
  EffectOf<ReturnType<F>>;

/**
 * Check if a function is pure based on its return type
 */
export type IsFunctionPure<F extends (...args: any) => any> = 
  FunctionEffect<F> extends 'Pure' ? true : false;

/**
 * Check if a function is impure based on its return type
 */
export type IsFunctionImpure<F extends (...args: any) => any> = 
  FunctionEffect<F> extends 'Pure' ? false : true;

/**
 * Check if a function has a specific effect
 */
export type FunctionHasEffect<F extends (...args: any) => any, E extends EffectTag> = 
  FunctionEffect<F> extends E ? true : false;

// ============================================================================
// Part 5: Purity Propagation Through Function Signatures
// ============================================================================

/**
 * Generic wrapper type for function effects
 */
export type FunctionEffectWrapper<F extends (...args: any) => any> = {
  readonly fn: F;
  readonly effect: FunctionEffect<F>;
  readonly isPure: IsFunctionPure<F>;
  readonly isImpure: IsFunctionImpure<F>;
};

/**
 * Higher-order function effect propagation
 */
export type HigherOrderFunctionEffect<
  F extends (...args: any) => any,
  Args extends any[]
> = 
  F extends (...args: Args) => infer R
    ? R extends (...args: any) => any
      ? FunctionEffect<R>
      : EffectOf<R>
    : never;

/**
 * Compose function effects
 */
export type ComposeEffects<A extends EffectTag, B extends EffectTag> = 
  A extends 'Pure' 
    ? B 
    : B extends 'Pure' 
      ? A 
      : `${A}|${B}`;

/**
 * Compose multiple function effects
 */
export type ComposeMultipleEffects<Effects extends EffectTag[]> = 
  Effects extends [infer First, ...infer Rest]
    ? First extends EffectTag
      ? Rest extends EffectTag[]
        ? ComposeEffects<First, ComposeMultipleEffects<Rest>>
        : First
      : 'Pure'
    : 'Pure';

// ============================================================================
// Part 6: Runtime Purity Tagging
// ============================================================================

/**
 * Runtime purity information
 */
export interface RuntimePurityInfo {
  readonly effect: EffectTag;
  readonly isPure: boolean;
  readonly isImpure: boolean;
}

/**
 * Runtime purity marker
 */
export interface PurityMarker {
  readonly __effect: EffectTag;
  readonly __purity: RuntimePurityInfo;
}

/**
 * Create runtime purity info
 */
export function createPurityInfo(effect: EffectTag): RuntimePurityInfo {
  return {
    effect,
    isPure: effect === 'Pure',
    isImpure: effect !== 'Pure'
  };
}

/**
 * Attach purity marker to an object
 */
export function attachPurityMarker<T extends object>(
  obj: T, 
  effect: EffectTag
): T & PurityMarker {
  return Object.assign(obj, {
    __effect: effect,
    __purity: createPurityInfo(effect)
  });
}

/**
 * Extract purity marker from an object
 */
export function extractPurityMarker<T extends object>(
  obj: T & PurityMarker
): RuntimePurityInfo {
  return obj.__purity;
}

/**
 * Check if an object has a purity marker
 */
export function hasPurityMarker<T extends object>(obj: T): obj is T & PurityMarker {
  return '__effect' in obj && '__purity' in obj;
}

// ============================================================================
// Part 7: Built-in Type Constructor Effects
// ============================================================================

/**
 * Array effect - Pure
 */
export interface ArrayWithEffect extends ArrayK {
  readonly __effect: 'Pure';
}

/**
 * Maybe effect - Pure
 */
export interface MaybeWithEffect extends MaybeK {
  readonly __effect: 'Pure';
}

/**
 * Either effect - Pure
 */
export interface EitherWithEffect extends EitherK {
  readonly __effect: 'Pure';
}

/**
 * Tuple effect - Pure
 */
export interface TupleWithEffect extends TupleK {
  readonly __effect: 'Pure';
}

/**
 * Function effect - Pure (for pure functions)
 */
export interface FunctionWithEffect extends FunctionK {
  readonly __effect: 'Pure';
}

/**
 * IO effect - IO
 */
export interface IOWithEffect extends Kind1 {
  readonly __effect: 'IO';
  readonly arg0: Type;
  readonly type: Type;
  readonly run: () => any;
}

/**
 * State effect - State
 */
export interface StateWithEffect<S, A> extends Kind2 {
  readonly __effect: 'State';
  readonly arg0: Type;
  readonly arg1: Type;
  readonly type: Type;
  readonly run: (s: S) => [A, S];
}

/**
 * Async effect - Async
 */
export interface AsyncWithEffect<A> extends Kind1 {
  readonly __effect: 'Async';
  readonly arg0: Type;
  readonly type: Type;
  readonly run: () => Promise<A>;
}

/**
 * ObservableLite with effect tracking
 */
export interface ObservableLiteWithEffect<A> extends ObservableLiteK {
  readonly __effect: 'Async';
  readonly type: ObservableLite<A>;
}

/**
 * TaskEither with effect tracking
 */
export interface TaskEitherWithEffect<L, R> extends TaskEitherK {
  readonly __effect: 'Async';
  readonly type: TaskEither<L, R>;
}

// ============================================================================
// Part 8: Purity Typeclass Instances
// ============================================================================

/**
 * Array Purity instance
 */
export const ArrayPurity: Purity1<ArrayWithEffect> = {
  effect: 'Pure'
};

/**
 * Maybe Purity instance
 */
export const MaybePurity: Purity1<MaybeWithEffect> = {
  effect: 'Pure'
};

/**
 * Either Purity instance
 */
export const EitherPurity: Purity2<EitherWithEffect> = {
  effect: 'Pure'
};

/**
 * Tuple Purity instance
 */
export const TuplePurity: Purity2<TupleWithEffect> = {
  effect: 'Pure'
};

/**
 * Function Purity instance
 */
export const FunctionPurity: Purity2<FunctionWithEffect> = {
  effect: 'Pure'
};

/**
 * IO Purity instance
 */
export const IOPurity: Purity1<IOWithEffect> = {
  effect: 'IO'
};

/**
 * State Purity instance
 */
export const StatePurity: Purity2<StateWithEffect<any, any>> = {
  // Policy: State is treated as Pure (pure state-passing)
  effect: 'Pure' as any
};

/**
 * Async Purity instance
 */
export const AsyncPurity: Purity1<AsyncWithEffect<any>> = {
  effect: 'Async'
};

// ============================================================================
// Part 9: Integration with Derivable Instances
// ============================================================================

/**
 * Purity-aware derivable instance options
 */
export interface PurityAwareDerivableOptions {
  readonly effect?: EffectTag;
  readonly enableRuntimeMarkers?: boolean;
}

/**
 * Purity-aware derivable instance result
 */
export interface PurityAwareDerivableResult<F extends Kind<any>> {
  readonly instance: any;
  readonly purity: Purity<F>;
  readonly runtimeMarker?: RuntimePurityInfo;
}

/**
 * Derive purity-aware instance
 */
export function derivePurityAwareInstance<F extends Kind<any>>(
  instance: any,
  options: PurityAwareDerivableOptions = {}
): PurityAwareDerivableResult<F> {
  const effect = options.effect || 'Pure';
  const purity: Purity<F> = { effect: effect as EffectOf<F> };
  
  let runtimeMarker: RuntimePurityInfo | undefined;
  if (options.enableRuntimeMarkers) {
    runtimeMarker = createPurityInfo(effect);
    attachPurityMarker(instance, effect);
  }
  
  return {
    instance,
    purity,
    runtimeMarker
  };
}

/**
 * Register purity-aware derivable instance
 */
export function registerPurityAwareDerivableInstance<F extends Kind<any>>(
  name: string,
  instance: any,
  options: PurityAwareDerivableOptions = {}
): void {
  const result = derivePurityAwareInstance<F>(instance, options);
  
  // Store in a registry (simplified implementation)
  (globalThis as any).__purityRegistry = (globalThis as any).__purityRegistry || {};
  (globalThis as any).__purityRegistry[name] = result;
}

/**
 * Get purity-aware derivable instance
 */
export function getPurityAwareDerivableInstance<F extends Kind<any>>(
  name: string
): PurityAwareDerivableResult<F> | undefined {
  return (globalThis as any).__purityRegistry?.[name];
}

// ============================================================================
// Part 10: Utility Functions
// ============================================================================

/**
 * Check if an effect is pure
 */
export function isPureEffect(effect: EffectTag): effect is 'Pure' {
  return effect === 'Pure';
}

/**
 * Check if an effect is impure
 */
export function isImpureEffect(effect: EffectTag): effect is Exclude<EffectTag, 'Pure'> {
  return effect !== 'Pure';
}

/**
 * Check if an effect is IO
 */
export function isIOEffect(effect: EffectTag): effect is 'IO' {
  return effect === 'IO';
}

/**
 * Check if an effect is State
 */
export function isStateEffect(effect: EffectTag): effect is 'State' {
  return effect === 'State';
}

/**
 * Check if an effect is Async
 */
export function isAsyncEffect(effect: EffectTag): effect is 'Async' {
  return effect === 'Async';
}

/**
 * Check if an effect is custom
 */
export function isCustomEffect(effect: EffectTag): effect is `Custom<${string}>` {
  return effect.startsWith('Custom<');
}

/**
 * Extract custom effect name
 */
export function extractCustomEffectName(effect: `Custom<${string}>`): string {
  return effect.slice(7, -1); // Remove 'Custom<' and '>'
}

/**
 * Create custom effect
 */
export function createCustomEffect<T extends string>(name: T): `Custom<${T}>` {
  return `Custom<${name}>` as `Custom<${T}>`;
}

// ============================================================================
// Part 11: Compile-Time Purity Verification
// ============================================================================

/**
 * Verify that a type constructor is pure
 */
export type VerifyPure<F> = IsPure<F> extends true ? true : false;

/**
 * Verify that a type constructor is impure
 */
export type VerifyImpure<F> = IsImpure<F> extends true ? true : false;

/**
 * Verify that a function is pure
 */
export type VerifyFunctionPure<F extends (...args: any) => any> = 
  IsFunctionPure<F> extends true ? true : false;

/**
 * Verify that a function is impure
 */
export type VerifyFunctionImpure<F extends (...args: any) => any> = 
  IsFunctionImpure<F> extends true ? true : false;

/**
 * Verify that a type constructor has a specific effect
 */
export type VerifyEffect<F, E extends EffectTag> = 
  HasEffect<F, E> extends true ? true : false;

/**
 * Verify that a function has a specific effect
 */
export type VerifyFunctionEffect<F extends (...args: any) => any, E extends EffectTag> = 
  FunctionHasEffect<F, E> extends true ? true : false;

// ============================================================================
// Part 12: Purity Laws and Properties
// ============================================================================

/**
 * Purity Tracking Laws:
 * 
 * 1. Effect Consistency Law: EffectOf<F> must be consistent across all uses of F
 * 2. Default Purity Law: EffectOf<F> defaults to 'Pure' if not explicitly declared
 * 3. Function Effect Law: FunctionEffect<F> = EffectOf<ReturnType<F>>
 * 4. Composition Law: ComposeEffects preserves effect information
 * 5. Runtime Marker Law: Runtime markers must match compile-time effects
 * 6. Derivable Integration Law: Derivable instances must respect effect declarations
 * 7. Type Safety Law: All effect operations must maintain type safety
 * 8. Performance Law: Effect tracking must not impact runtime performance
 * 
 * Runtime Laws:
 * 
 * 1. Marker Accuracy Law: Runtime markers accurately reflect compile-time effects
 * 2. Registry Consistency Law: Purity registry maintains consistent effect information
 * 3. Instance Purity Law: Typeclass instances must declare their effects
 * 4. Function Purity Law: Function effects are inferred from return types
 * 
 * Type-Level Laws:
 * 
 * 1. Effect Inference Law: EffectOf<F> correctly infers declared effects
 * 2. Purity Check Law: IsPure<F> correctly identifies pure type constructors
 * 3. Impurity Check Law: IsImpure<F> correctly identifies impure type constructors
 * 4. Function Effect Law: FunctionEffect<F> correctly extracts function effects
 * 5. Composition Law: ComposeEffects correctly combines multiple effects
 */ 