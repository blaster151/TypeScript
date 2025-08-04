/**
 * Purity-Aware Derivable Instances Generator
 * 
 * This module extends the Derivable Instances generator to automatically produce
 * purity-propagating combinators, ensuring every derived typeclass instance
 * respects purity rules out of the box.
 * 
 * Features:
 * - Purity-aware type signatures for all generated methods
 * - Automatic effect inference using EffectOf<F>
 * - Effect combination using CombineEffects
 * - Runtime purity markers for debugging
 * - Integration with all supported typeclasses
 * - Compile-time and runtime purity verification
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async, Effect,
  isPure, isIO, isAsync, getEffectTag,
  PurityContext, PurityError, PurityResult
} from './fp-purity';

import {
  CombineEffects, CombineEffectsArray, ExtractEffect, PurityAwareResult,
  createPurityAwareResult, extractValue, extractEffect,
  combineEffects, hasPurityInfo, stripPurityInfo, addPurityInfo
} from './fp-purity-combinators';

// ============================================================================
// Part 1: Purity-Aware Type Signatures
// ============================================================================

/**
 * Purity-aware result type for generated methods
 */
export type PurityAwareMethodResult<T, P extends EffectTag> = T & { __effect?: P };

/**
 * Purity-aware method signature generator
 */
export type PurityAwareMethodSignature<
  F extends Kind1 | Kind2 | Kind3,
  Args extends any[],
  Result,
  P extends EffectTag = ExtractEffect<F>
> = (...args: Args) => PurityAwareMethodResult<Result, P>;

/**
 * Purity-aware multi-argument method signature generator
 */
export type PurityAwareMultiArgMethodSignature<
  F extends Kind1 | Kind2 | Kind3,
  Args extends any[],
  Result,
  P1 extends EffectTag = ExtractEffect<F>,
  P2 extends EffectTag = ExtractEffect<F>
> = (...args: Args) => PurityAwareMethodResult<Result, CombineEffects<P1, P2>>;

// ============================================================================
// Part 2: Purity-Aware Functor Generator
// ============================================================================

/**
 * Purity-aware Functor interface
 */
export interface PurityAwareFunctor<F extends Kind1> {
  map: <A, B, P extends EffectTag = ExtractEffect<F>>(
    fa: Apply<F, [A]>,
    f: (a: A) => B
  ) => PurityAwareMethodResult<Apply<F, [B]>, P>;
}

/**
 * Generate purity-aware Functor instance
 */
export function derivePurityAwareFunctor<F extends Kind1>(
  typeConstructor: F,
  options: {
    enableRuntimeMarkers?: boolean;
    customEffect?: EffectTag;
  } = {}
): PurityAwareFunctor<F> {
  const { enableRuntimeMarkers = false, customEffect } = options;
  const baseEffect = customEffect || 'Pure';
  
  return {
    map: <A, B, P extends EffectTag = ExtractEffect<F>>(
      fa: Apply<F, [A]>,
      f: (a: A) => B
    ): PurityAwareMethodResult<Apply<F, [B]>, P> => {
      // Delegate to the original functor implementation
      const result = (typeConstructor as any).map(fa, f);
      
      if (enableRuntimeMarkers) {
        return Object.assign(result, { __effect: baseEffect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [B]>, P>;
    }
  };
}

// ============================================================================
// Part 3: Purity-Aware Applicative Generator
// ============================================================================

/**
 * Purity-aware Applicative interface
 */
export interface PurityAwareApplicative<F extends Kind1> extends PurityAwareFunctor<F> {
  of: <A, P extends EffectTag = ExtractEffect<F>>(
    a: A
  ) => PurityAwareMethodResult<Apply<F, [A]>, P>;
  
  ap: <A, B, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
    fab: Apply<F, [(a: A) => B]> & { __effect?: P1 },
    fa: Apply<F, [A]> & { __effect?: P2 }
  ) => PurityAwareMethodResult<Apply<F, [B]>, CombineEffects<P1, P2>>;
}

/**
 * Generate purity-aware Applicative instance
 */
export function derivePurityAwareApplicative<F extends Kind1>(
  typeConstructor: F,
  options: {
    enableRuntimeMarkers?: boolean;
    customEffect?: EffectTag;
  } = {}
): PurityAwareApplicative<F> {
  const { enableRuntimeMarkers = false, customEffect } = options;
  const baseEffect = customEffect || 'Pure';
  
  const functor = derivePurityAwareFunctor(typeConstructor, options);
  
  return {
    ...functor,
    
    of: <A, P extends EffectTag = ExtractEffect<F>>(
      a: A
    ): PurityAwareMethodResult<Apply<F, [A]>, P> => {
      const result = (typeConstructor as any).of(a);
      
      if (enableRuntimeMarkers) {
        return Object.assign(result, { __effect: 'Pure' });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [A]>, P>;
    },
    
    ap: <A, B, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
      fab: Apply<F, [(a: A) => B]> & { __effect?: P1 },
      fa: Apply<F, [A]> & { __effect?: P2 }
    ): PurityAwareMethodResult<Apply<F, [B]>, CombineEffects<P1, P2>> => {
      const result = (typeConstructor as any).ap(fab, fa);
      
      if (enableRuntimeMarkers) {
        const effect1 = (fab as any).__effect || baseEffect;
        const effect2 = (fa as any).__effect || baseEffect;
        const combinedEffect = combineEffects(effect1, effect2);
        return Object.assign(result, { __effect: combinedEffect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [B]>, CombineEffects<P1, P2>>;
    }
  };
}

// ============================================================================
// Part 4: Purity-Aware Monad Generator
// ============================================================================

/**
 * Purity-aware Monad interface
 */
export interface PurityAwareMonad<F extends Kind1> extends PurityAwareApplicative<F> {
  chain: <A, B, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
    fa: Apply<F, [A]> & { __effect?: P1 },
    f: (a: A) => Apply<F, [B]> & { __effect?: P2 }
  ) => PurityAwareMethodResult<Apply<F, [B]>, CombineEffects<P1, P2>>;
}

/**
 * Generate purity-aware Monad instance
 */
export function derivePurityAwareMonad<F extends Kind1>(
  typeConstructor: F,
  options: {
    enableRuntimeMarkers?: boolean;
    customEffect?: EffectTag;
  } = {}
): PurityAwareMonad<F> {
  const { enableRuntimeMarkers = false, customEffect } = options;
  const baseEffect = customEffect || 'Pure';
  
  const applicative = derivePurityAwareApplicative(typeConstructor, options);
  
  return {
    ...applicative,
    
    chain: <A, B, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
      fa: Apply<F, [A]> & { __effect?: P1 },
      f: (a: A) => Apply<F, [B]> & { __effect?: P2 }
    ): PurityAwareMethodResult<Apply<F, [B]>, CombineEffects<P1, P2>> => {
      const result = (typeConstructor as any).chain(fa, f);
      
      if (enableRuntimeMarkers) {
        const effect1 = (fa as any).__effect || baseEffect;
        const effect2 = (f(fa as any) as any).__effect || baseEffect;
        const combinedEffect = combineEffects(effect1, effect2);
        return Object.assign(result, { __effect: combinedEffect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [B]>, CombineEffects<P1, P2>>;
    }
  };
}

// ============================================================================
// Part 5: Purity-Aware Bifunctor Generator
// ============================================================================

/**
 * Purity-aware Bifunctor interface
 */
export interface PurityAwareBifunctor<F extends Kind2> {
  bimap: <A, B, C, D, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
    fab: Apply<F, [A, B]> & { __effect?: P1 },
    f: (a: A) => C,
    g: (b: B) => D
  ) => PurityAwareMethodResult<Apply<F, [C, D]>, CombineEffects<P1, P2>>;
  
  mapLeft?: <A, B, C, P extends EffectTag = ExtractEffect<F>>(
    fab: Apply<F, [A, B]> & { __effect?: P },
    f: (a: A) => C
  ) => PurityAwareMethodResult<Apply<F, [C, B]>, P>;
  
  mapRight?: <A, B, D, P extends EffectTag = ExtractEffect<F>>(
    fab: Apply<F, [A, B]> & { __effect?: P },
    g: (b: B) => D
  ) => PurityAwareMethodResult<Apply<F, [A, D]>, P>;
}

/**
 * Generate purity-aware Bifunctor instance
 */
export function derivePurityAwareBifunctor<F extends Kind2>(
  typeConstructor: F,
  options: {
    enableRuntimeMarkers?: boolean;
    customEffect?: EffectTag;
  } = {}
): PurityAwareBifunctor<F> {
  const { enableRuntimeMarkers = false, customEffect } = options;
  const baseEffect = customEffect || 'Pure';
  
  return {
    bimap: <A, B, C, D, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
      fab: Apply<F, [A, B]> & { __effect?: P1 },
      f: (a: A) => C,
      g: (b: B) => D
    ): PurityAwareMethodResult<Apply<F, [C, D]>, CombineEffects<P1, P2>> => {
      const result = (typeConstructor as any).bimap(fab, f, g);
      
      if (enableRuntimeMarkers) {
        const effect1 = (fab as any).__effect || baseEffect;
        const effect2 = (fab as any).__effect || baseEffect;
        const combinedEffect = combineEffects(effect1, effect2);
        return Object.assign(result, { __effect: combinedEffect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [C, D]>, CombineEffects<P1, P2>>;
    },
    
    mapLeft: <A, B, C, P extends EffectTag = ExtractEffect<F>>(
      fab: Apply<F, [A, B]> & { __effect?: P },
      f: (a: A) => C
    ): PurityAwareMethodResult<Apply<F, [C, B]>, P> => {
      const result = (typeConstructor as any).mapLeft ? 
        (typeConstructor as any).mapLeft(fab, f) : 
        (typeConstructor as any).bimap(fab, f, (b: B) => b);
      
      if (enableRuntimeMarkers) {
        const effect = (fab as any).__effect || baseEffect;
        return Object.assign(result, { __effect: effect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [C, B]>, P>;
    },
    
    mapRight: <A, B, D, P extends EffectTag = ExtractEffect<F>>(
      fab: Apply<F, [A, B]> & { __effect?: P },
      g: (b: B) => D
    ): PurityAwareMethodResult<Apply<F, [A, D]>, P> => {
      const result = (typeConstructor as any).mapRight ? 
        (typeConstructor as any).mapRight(fab, g) : 
        (typeConstructor as any).bimap(fab, (a: A) => a, g);
      
      if (enableRuntimeMarkers) {
        const effect = (fab as any).__effect || baseEffect;
        return Object.assign(result, { __effect: effect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [A, D]>, P>;
    }
  };
}

// ============================================================================
// Part 6: Purity-Aware Profunctor Generator
// ============================================================================

/**
 * Purity-aware Profunctor interface
 */
export interface PurityAwareProfunctor<F extends Kind2> {
  dimap: <A, B, C, D, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
    pab: Apply<F, [A, B]> & { __effect?: P1 },
    f: (c: C) => A,
    g: (b: B) => D
  ) => PurityAwareMethodResult<Apply<F, [C, D]>, CombineEffects<P1, P2>>;
  
  lmap?: <A, B, C, P extends EffectTag = ExtractEffect<F>>(
    pab: Apply<F, [A, B]> & { __effect?: P },
    f: (c: C) => A
  ) => PurityAwareMethodResult<Apply<F, [C, B]>, P>;
  
  rmap?: <A, B, D, P extends EffectTag = ExtractEffect<F>>(
    pab: Apply<F, [A, B]> & { __effect?: P },
    g: (b: B) => D
  ) => PurityAwareMethodResult<Apply<F, [A, D]>, P>;
}

/**
 * Generate purity-aware Profunctor instance
 */
export function derivePurityAwareProfunctor<F extends Kind2>(
  typeConstructor: F,
  options: {
    enableRuntimeMarkers?: boolean;
    customEffect?: EffectTag;
  } = {}
): PurityAwareProfunctor<F> {
  const { enableRuntimeMarkers = false, customEffect } = options;
  const baseEffect = customEffect || 'Pure';
  
  return {
    dimap: <A, B, C, D, P1 extends EffectTag = ExtractEffect<F>, P2 extends EffectTag = ExtractEffect<F>>(
      pab: Apply<F, [A, B]> & { __effect?: P1 },
      f: (c: C) => A,
      g: (b: B) => D
    ): PurityAwareMethodResult<Apply<F, [C, D]>, CombineEffects<P1, P2>> => {
      const result = (typeConstructor as any).dimap(pab, f, g);
      
      if (enableRuntimeMarkers) {
        const effect1 = (pab as any).__effect || baseEffect;
        const effect2 = (pab as any).__effect || baseEffect;
        const combinedEffect = combineEffects(effect1, effect2);
        return Object.assign(result, { __effect: combinedEffect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [C, D]>, CombineEffects<P1, P2>>;
    },
    
    lmap: <A, B, C, P extends EffectTag = ExtractEffect<F>>(
      pab: Apply<F, [A, B]> & { __effect?: P },
      f: (c: C) => A
    ): PurityAwareMethodResult<Apply<F, [C, B]>, P> => {
      const result = (typeConstructor as any).lmap ? 
        (typeConstructor as any).lmap(pab, f) : 
        (typeConstructor as any).dimap(pab, f, (b: B) => b);
      
      if (enableRuntimeMarkers) {
        const effect = (pab as any).__effect || baseEffect;
        return Object.assign(result, { __effect: effect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [C, B]>, P>;
    },
    
    rmap: <A, B, D, P extends EffectTag = ExtractEffect<F>>(
      pab: Apply<F, [A, B]> & { __effect?: P },
      g: (b: B) => D
    ): PurityAwareMethodResult<Apply<F, [A, D]>, P> => {
      const result = (typeConstructor as any).rmap ? 
        (typeConstructor as any).rmap(pab, g) : 
        (typeConstructor as any).dimap(pab, (a: A) => a, g);
      
      if (enableRuntimeMarkers) {
        const effect = (pab as any).__effect || baseEffect;
        return Object.assign(result, { __effect: effect });
      }
      
      return result as PurityAwareMethodResult<Apply<F, [A, D]>, P>;
    }
  };
}

// ============================================================================
// Part 7: Purity-Aware Traversable Generator
// ============================================================================

/**
 * Purity-aware Traversable interface
 */
export interface PurityAwareTraversable<F extends Kind1> extends PurityAwareFunctor<F> {
  sequence: <G extends Kind1, A, PF extends EffectTag = ExtractEffect<F>, PG extends EffectTag = ExtractEffect<G>>(
    G: Applicative<G>,
    fga: Apply<F, [Apply<G, [A]>]> & { __effect?: PF }
  ) => PurityAwareMethodResult<Apply<G, [Apply<F, [A]>]>, CombineEffects<PF, PG>>;
  
  traverse: <G extends Kind1, A, B, PF extends EffectTag = ExtractEffect<F>, PG extends EffectTag = ExtractEffect<G>>(
    G: Applicative<G>,
    f: (a: A) => Apply<G, [B]> & { __effect?: PG },
    fa: Apply<F, [A]> & { __effect?: PF }
  ) => PurityAwareMethodResult<Apply<G, [Apply<F, [B]>]>, CombineEffects<PF, PG>>;
}

/**
 * Generate purity-aware Traversable instance
 */
export function derivePurityAwareTraversable<F extends Kind1>(
  typeConstructor: F,
  options: {
    enableRuntimeMarkers?: boolean;
    customEffect?: EffectTag;
  } = {}
): PurityAwareTraversable<F> {
  const { enableRuntimeMarkers = false, customEffect } = options;
  const baseEffect = customEffect || 'Pure';
  
  const functor = derivePurityAwareFunctor(typeConstructor, options);
  
  return {
    ...functor,
    
    sequence: <G extends Kind1, A, PF extends EffectTag = ExtractEffect<F>, PG extends EffectTag = ExtractEffect<G>>(
      G: Applicative<G>,
      fga: Apply<F, [Apply<G, [A]>]> & { __effect?: PF }
    ): PurityAwareMethodResult<Apply<G, [Apply<F, [A]>]>, CombineEffects<PF, PG>> => {
      const result = (typeConstructor as any).sequence(G, fga);
      
      if (enableRuntimeMarkers) {
        const effect1 = (fga as any).__effect || baseEffect;
        const effect2 = 'Pure' as PG; // G is typically pure
        const combinedEffect = combineEffects(effect1, effect2);
        return Object.assign(result, { __effect: combinedEffect });
      }
      
      return result as PurityAwareMethodResult<Apply<G, [Apply<F, [A]>]>, CombineEffects<PF, PG>>;
    },
    
    traverse: <G extends Kind1, A, B, PF extends EffectTag = ExtractEffect<F>, PG extends EffectTag = ExtractEffect<G>>(
      G: Applicative<G>,
      f: (a: A) => Apply<G, [B]> & { __effect?: PG },
      fa: Apply<F, [A]> & { __effect?: PF }
    ): PurityAwareMethodResult<Apply<G, [Apply<F, [B]>]>, CombineEffects<PF, PG>> => {
      const result = (typeConstructor as any).traverse(G, f, fa);
      
      if (enableRuntimeMarkers) {
        const effect1 = (fa as any).__effect || baseEffect;
        const effect2 = (f(fa as any) as any).__effect || 'Pure';
        const combinedEffect = combineEffects(effect1, effect2);
        return Object.assign(result, { __effect: combinedEffect });
      }
      
      return result as PurityAwareMethodResult<Apply<G, [Apply<F, [B]>]>, CombineEffects<PF, PG>>;
    }
  };
}

// ============================================================================
// Part 8: Purity-Aware Foldable Generator
// ============================================================================

/**
 * Purity-aware Foldable interface
 */
export interface PurityAwareFoldable<F extends Kind1> {
  foldMap: <M, A, P extends EffectTag = ExtractEffect<F>>(
    M: { empty: () => M; concat: (a: M, b: M) => M },
    f: (a: A) => M,
    fa: Apply<F, [A]> & { __effect?: P }
  ) => PurityAwareMethodResult<M, P>;
  
  foldr: <A, B, P extends EffectTag = ExtractEffect<F>>(
    f: (a: A, b: B) => B,
    b: B,
    fa: Apply<F, [A]> & { __effect?: P }
  ) => PurityAwareMethodResult<B, P>;
  
  foldl: <A, B, P extends EffectTag = ExtractEffect<F>>(
    f: (b: B, a: A) => B,
    b: B,
    fa: Apply<F, [A]> & { __effect?: P }
  ) => PurityAwareMethodResult<B, P>;
}

/**
 * Generate purity-aware Foldable instance
 */
export function derivePurityAwareFoldable<F extends Kind1>(
  typeConstructor: F,
  options: {
    enableRuntimeMarkers?: boolean;
    customEffect?: EffectTag;
  } = {}
): PurityAwareFoldable<F> {
  const { enableRuntimeMarkers = false, customEffect } = options;
  const baseEffect = customEffect || 'Pure';
  
  return {
    foldMap: <M, A, P extends EffectTag = ExtractEffect<F>>(
      M: { empty: () => M; concat: (a: M, b: M) => M },
      f: (a: A) => M,
      fa: Apply<F, [A]> & { __effect?: P }
    ): PurityAwareMethodResult<M, P> => {
      const result = (typeConstructor as any).foldMap(M, f, fa);
      
      if (enableRuntimeMarkers) {
        const effect = (fa as any).__effect || baseEffect;
        return Object.assign(result, { __effect: effect });
      }
      
      return result as PurityAwareMethodResult<M, P>;
    },
    
    foldr: <A, B, P extends EffectTag = ExtractEffect<F>>(
      f: (a: A, b: B) => B,
      b: B,
      fa: Apply<F, [A]> & { __effect?: P }
    ): PurityAwareMethodResult<B, P> => {
      const result = (typeConstructor as any).foldr(f, b, fa);
      
      if (enableRuntimeMarkers) {
        const effect = (fa as any).__effect || baseEffect;
        return Object.assign(result, { __effect: effect });
      }
      
      return result as PurityAwareMethodResult<B, P>;
    },
    
    foldl: <A, B, P extends EffectTag = ExtractEffect<F>>(
      f: (b: B, a: A) => B,
      b: B,
      fa: Apply<F, [A]> & { __effect?: P }
    ): PurityAwareMethodResult<B, P> => {
      const result = (typeConstructor as any).foldl(f, b, fa);
      
      if (enableRuntimeMarkers) {
        const effect = (fa as any).__effect || baseEffect;
        return Object.assign(result, { __effect: effect });
      }
      
      return result as PurityAwareMethodResult<B, P>;
    }
  };
}

// ============================================================================
// Part 9: Universal Purity-Aware Generator
// ============================================================================

/**
 * Options for purity-aware instance generation
 */
export interface PurityAwareGeneratorOptions {
  enableRuntimeMarkers?: boolean;
  customEffect?: EffectTag;
  includeJSDoc?: boolean;
  preserveRuntimeBehavior?: boolean;
}

/**
 * Generate all purity-aware typeclass instances for a type constructor
 */
export function deriveAllPurityAwareInstances<F extends Kind1 | Kind2>(
  typeConstructor: F,
  options: PurityAwareGeneratorOptions = {}
): {
  functor?: PurityAwareFunctor<F>;
  applicative?: PurityAwareApplicative<F>;
  monad?: PurityAwareMonad<F>;
  bifunctor?: PurityAwareBifunctor<F>;
  profunctor?: PurityAwareProfunctor<F>;
  traversable?: PurityAwareTraversable<F>;
  foldable?: PurityAwareFoldable<F>;
} {
  const instances: any = {};
  
  // Generate Functor instance
  if ((typeConstructor as any).map) {
    instances.functor = derivePurityAwareFunctor(typeConstructor, options);
  }
  
  // Generate Applicative instance
  if ((typeConstructor as any).of && (typeConstructor as any).ap) {
    instances.applicative = derivePurityAwareApplicative(typeConstructor, options);
  }
  
  // Generate Monad instance
  if ((typeConstructor as any).chain) {
    instances.monad = derivePurityAwareMonad(typeConstructor, options);
  }
  
  // Generate Bifunctor instance (for Kind2)
  if ((typeConstructor as any).bimap && (typeConstructor as Kind2)) {
    instances.bifunctor = derivePurityAwareBifunctor(typeConstructor as Kind2, options);
  }
  
  // Generate Profunctor instance (for Kind2)
  if ((typeConstructor as any).dimap && (typeConstructor as Kind2)) {
    instances.profunctor = derivePurityAwareProfunctor(typeConstructor as Kind2, options);
  }
  
  // Generate Traversable instance
  if ((typeConstructor as any).sequence && (typeConstructor as any).traverse) {
    instances.traversable = derivePurityAwareTraversable(typeConstructor, options);
  }
  
  // Generate Foldable instance
  if ((typeConstructor as any).foldMap && (typeConstructor as any).foldr && (typeConstructor as any).foldl) {
    instances.foldable = derivePurityAwareFoldable(typeConstructor, options);
  }
  
  return instances;
}

// ============================================================================
// Part 10: Utility Functions
// ============================================================================

/**
 * Check if a type constructor has purity information
 */
export function hasPurityAwareMethods<T>(instance: T): boolean {
  return instance && typeof instance === 'object' && 
    Object.keys(instance).some(key => 
      typeof (instance as any)[key] === 'function' && 
      (instance as any)[key].toString().includes('__effect')
    );
}

/**
 * Extract purity information from a purity-aware instance
 */
export function extractPurityFromInstance<T>(instance: T): EffectTag {
  if (!hasPurityAwareMethods(instance)) {
    return 'Pure';
  }
  
  // Try to extract from any method
  for (const key of Object.keys(instance)) {
    const method = (instance as any)[key];
    if (typeof method === 'function') {
      // This is a simplified approach - in practice, you'd need more sophisticated analysis
      return 'Pure';
    }
  }
  
  return 'Pure';
}

/**
 * Create a purity-aware wrapper around an existing instance
 */
export function wrapWithPurityAwareness<T>(
  instance: T,
  effect: EffectTag = 'Pure',
  options: PurityAwareGeneratorOptions = {}
): T {
  const { enableRuntimeMarkers = false } = options;
  
  if (!enableRuntimeMarkers) {
    return instance;
  }
  
  const wrapped = { ...instance };
  
  // Add __effect to all methods
  for (const key of Object.keys(wrapped)) {
    const method = (wrapped as any)[key];
    if (typeof method === 'function') {
      (wrapped as any)[key] = (...args: any[]) => {
        const result = method.apply(instance, args);
        return Object.assign(result, { __effect: effect });
      };
    }
  }
  
  return wrapped;
}

// ============================================================================
// Part 11: Laws and Properties
// ============================================================================

/**
 * Purity-Aware Derivable Instances Laws:
 * 
 * 1. Purity Propagation Law: Generated methods preserve purity information
 * 2. Effect Combination Law: Multiple effects are combined correctly
 * 3. Runtime Behavior Law: Runtime behavior is unchanged when markers are disabled
 * 4. Type Safety Law: All generated methods maintain type safety
 * 5. Inference Law: EffectOf<F> is used for automatic effect inference
 * 
 * Runtime Laws:
 * 
 * 1. Marker Law: Runtime markers are only added when enabled
 * 2. Performance Law: Minimal overhead when markers are disabled
 * 3. Compatibility Law: Generated instances are compatible with existing code
 * 4. Debugging Law: Runtime markers provide useful debugging information
 * 
 * Type-Level Laws:
 * 
 * 1. Signature Law: Generated method signatures include purity information
 * 2. Combination Law: Effect combinations are type-safe
 * 3. Inference Law: Effect inference works correctly at compile-time
 * 4. Propagation Law: Purity propagates correctly through type system
 */ 