/**
 * FP Registry Initialization
 * 
 * This module initializes the global FP registry and registers all FP components
 * including ObservableLite and TaskEither with their typeclass instances.
 */

import {
  // ObservableLite
  ObservableLite, ObservableLiteK,
  ObservableLiteFunctor, ObservableLiteApplicative, ObservableLiteMonad
} from './fp-observable-lite';

import {
  // TaskEither
  TaskEither, TaskEitherBifunctorMonad
} from './fp-bimonad-extended';

import {
  // HKT types
  Kind1, Kind2, Apply, TaskEitherK,
  ARRAY_K_ID, MAYBE_K_ID, EITHER_K_ID, TUPLE_K_ID,
  LIST_GADT_K_ID, MAYBE_GADT_K_ID, EITHER_GADT_K_ID,
  PERSISTENT_LIST_K_ID, PERSISTENT_MAP_K_ID, PERSISTENT_SET_K_ID,
  OBSERVABLE_LITE_K_ID, TASK_EITHER_K_ID
} from './fp-hkt';

import {
  // Purity types
  EffectOf, IsPure, IsImpure
} from './fp-purity';

// ============================================================================
// Part 1: Global Registry Interface
// ============================================================================

/**
 * Global FP Registry interface
 */
export interface FPRegistry {
  // HKT Registry
  hkt: Map<string, any>;
  
  // Purity Registry
  purity: Map<string, string>;
  
  // Typeclass Registry
  typeclasses: Map<string, any>;
  
  // Derivable Instances Registry
  derivable: Map<string, any>;
  
  // Usage Registry
  usage: Map<string, any>;
  
  // Registration methods
  registerHKT(name: string, kind: any): void;
  registerPurity(name: string, effect: string): void;
  registerTypeclass(name: string, typeclass: string, instance: any): void;
  registerDerivable(name: string, instances: any): void;
  registerUsage(name: string, usage: any): void;
  
  // Lookup methods
  getHKT(name: string): any;
  getPurity(name: string): string | undefined;
  getTypeclass(name: string, typeclass: string): any;
  getDerivable(name: string): any;
  getUsage(name: string): any;
}

// ============================================================================
// Part 2: Global Registry Implementation
// ============================================================================

/**
 * Global FP Registry implementation
 */
class GlobalFPRegistry implements FPRegistry {
  public hkt = new Map<string, any>();
  public purity = new Map<string, string>();
  public typeclasses = new Map<string, any>();
  public derivable = new Map<string, any>();
  public usage = new Map<string, any>();

  registerHKT(name: string, kind: any): void {
    this.hkt.set(name, kind);
  }

  registerPurity(name: string, effect: string): void {
    this.purity.set(name, effect);
  }

  registerTypeclass(name: string, typeclass: string, instance: any): void {
    const key = `${name}:${typeclass}`;
    this.typeclasses.set(key, instance);
  }

  registerDerivable(name: string, instances: any): void {
    this.derivable.set(name, instances);
  }

  registerUsage(name: string, usage: any): void {
    this.usage.set(name, usage);
  }

  getHKT(name: string): any {
    return this.hkt.get(name);
  }

  getPurity(name: string): string | undefined {
    return this.purity.get(name);
  }

  getTypeclass(name: string, typeclass: string): any {
    const key = `${name}:${typeclass}`;
    return this.typeclasses.get(key);
  }

  getDerivable(name: string): any {
    return this.derivable.get(name);
  }

  getUsage(name: string): any {
    return this.usage.get(name);
  }
}

// ============================================================================
// Part 3: Global Registry Setup
// ============================================================================

/**
 * Initialize the global FP registry
 */
export function initializeFPRegistry(): FPRegistry {
  const registry = new GlobalFPRegistry();
  
  // Import derived instances
  import('./fp-typeclasses-hkt').then(({ 
    ArrayInstances, ArrayEq, ArrayOrd, ArrayShow,
    MaybeInstances, MaybeEq, MaybeOrd, MaybeShow,
    EitherInstances, EitherEq, EitherOrd, EitherShow,
    TupleInstances, TupleEq, TupleOrd, TupleShow
  }) => {
    // Register Array
    registry.registerHKT('Array', ARRAY_K_ID);
    registry.registerPurity('Array', 'Pure');
    registry.registerTypeclass('Array', 'Functor', ArrayInstances.functor);
    registry.registerTypeclass('Array', 'Applicative', ArrayInstances.applicative);
    registry.registerTypeclass('Array', 'Monad', ArrayInstances.monad);
    registry.registerTypeclass('Array', 'Eq', ArrayEq);
    registry.registerTypeclass('Array', 'Ord', ArrayOrd);
    registry.registerTypeclass('Array', 'Show', ArrayShow);
    registry.registerDerivable('Array', {
      functor: ArrayInstances.functor,
      applicative: ArrayInstances.applicative,
      monad: ArrayInstances.monad,
      eq: ArrayEq,
      ord: ArrayOrd,
      show: ArrayShow,
      purity: { effect: 'Pure' as const }
    });

    // Register Maybe
    registry.registerHKT('Maybe', MAYBE_K_ID);
    registry.registerPurity('Maybe', 'Pure');
    registry.registerTypeclass('Maybe', 'Functor', MaybeInstances.functor);
    registry.registerTypeclass('Maybe', 'Applicative', MaybeInstances.applicative);
    registry.registerTypeclass('Maybe', 'Monad', MaybeInstances.monad);
    registry.registerTypeclass('Maybe', 'Eq', MaybeEq);
    registry.registerTypeclass('Maybe', 'Ord', MaybeOrd);
    registry.registerTypeclass('Maybe', 'Show', MaybeShow);
    registry.registerDerivable('Maybe', {
      functor: MaybeInstances.functor,
      applicative: MaybeInstances.applicative,
      monad: MaybeInstances.monad,
      eq: MaybeEq,
      ord: MaybeOrd,
      show: MaybeShow,
      purity: { effect: 'Pure' as const }
    });

    // Register Either (types/instances are now provided via fp-either-register)
    registry.registerHKT('Either', EITHER_K_ID);
    registry.registerPurity('Either', 'Pure');

    // Register Tuple
    registry.registerHKT('Tuple', TUPLE_K_ID);
    registry.registerPurity('Tuple', 'Pure');
    registry.registerTypeclass('Tuple', 'Bifunctor', TupleInstances.bifunctor);
    registry.registerTypeclass('Tuple', 'Eq', TupleEq);
    registry.registerTypeclass('Tuple', 'Ord', TupleOrd);
    registry.registerTypeclass('Tuple', 'Show', TupleShow);
    registry.registerDerivable('Tuple', {
      bifunctor: TupleInstances.bifunctor,
      eq: TupleEq,
      ord: TupleOrd,
      show: TupleShow,
      purity: { effect: 'Pure' as const }
    });
  });

  // Import GADT instances
  import('./fp-gadt').then(({
    MaybeGADTInstances, MaybeGADTEq, MaybeGADTOrd, MaybeGADTShow,
    EitherGADTInstances, EitherGADTEq, EitherGADTOrd, EitherGADTShow,
    ListGADTInstances, ListGADTEq, ListGADTOrd, ListGADTShow
  }) => {
    // Register MaybeGADT
    registry.registerHKT('MaybeGADT', MAYBE_GADT_K_ID);
    registry.registerPurity('MaybeGADT', 'Pure');
    registry.registerTypeclass('MaybeGADT', 'Functor', MaybeGADTInstances.functor);
    registry.registerTypeclass('MaybeGADT', 'Applicative', MaybeGADTInstances.applicative);
    registry.registerTypeclass('MaybeGADT', 'Monad', MaybeGADTInstances.monad);
    registry.registerTypeclass('MaybeGADT', 'Eq', MaybeGADTEq);
    registry.registerTypeclass('MaybeGADT', 'Ord', MaybeGADTOrd);
    registry.registerTypeclass('MaybeGADT', 'Show', MaybeGADTShow);
    registry.registerDerivable('MaybeGADT', {
      functor: MaybeGADTInstances.functor,
      applicative: MaybeGADTInstances.applicative,
      monad: MaybeGADTInstances.monad,
      eq: MaybeGADTEq,
      ord: MaybeGADTOrd,
      show: MaybeGADTShow,
      purity: { effect: 'Pure' as const }
    });

    // Register EitherGADT
    registry.registerHKT('EitherGADT', EITHER_GADT_K_ID);
    registry.registerPurity('EitherGADT', 'Pure');
    registry.registerTypeclass('EitherGADT', 'Bifunctor', EitherGADTInstances.bifunctor);
    registry.registerTypeclass('EitherGADT', 'Eq', EitherGADTEq);
    registry.registerTypeclass('EitherGADT', 'Ord', EitherGADTOrd);
    registry.registerTypeclass('EitherGADT', 'Show', EitherGADTShow);
    registry.registerDerivable('EitherGADT', {
      bifunctor: EitherGADTInstances.bifunctor,
      eq: EitherGADTEq,
      ord: EitherGADTOrd,
      show: EitherGADTShow,
      purity: { effect: 'Pure' as const }
    });

    // Register ListGADT
    registry.registerHKT('ListGADT', LIST_GADT_K_ID);
    registry.registerPurity('ListGADT', 'Pure');
    registry.registerTypeclass('ListGADT', 'Functor', ListGADTInstances.functor);
    registry.registerTypeclass('ListGADT', 'Eq', ListGADTEq);
    registry.registerTypeclass('ListGADT', 'Ord', ListGADTOrd);
    registry.registerTypeclass('ListGADT', 'Show', ListGADTShow);
    registry.registerDerivable('ListGADT', {
      functor: ListGADTInstances.functor,
      eq: ListGADTEq,
      ord: ListGADTOrd,
      show: ListGADTShow,
      purity: { effect: 'Pure' as const }
    });
  });

  // Import persistent collection instances
  import('./fp-persistent').then(({
    PersistentListFunctor, PersistentListApplicative, PersistentListMonad,
    PersistentListEq, PersistentListOrd, PersistentListShow,
    PersistentMapFunctor, PersistentMapBifunctor,
    PersistentMapEq, PersistentMapOrd, PersistentMapShow,
    PersistentSetFunctor,
    PersistentSetEq, PersistentSetOrd, PersistentSetShow
  }) => {
    // Register PersistentList
    registry.registerHKT('PersistentList', PERSISTENT_LIST_K_ID);
    registry.registerPurity('PersistentList', 'Pure');
    registry.registerTypeclass('PersistentList', 'Functor', PersistentListFunctor);
    registry.registerTypeclass('PersistentList', 'Applicative', PersistentListApplicative);
    registry.registerTypeclass('PersistentList', 'Monad', PersistentListMonad);
    registry.registerTypeclass('PersistentList', 'Eq', PersistentListEq);
    registry.registerTypeclass('PersistentList', 'Ord', PersistentListOrd);
    registry.registerTypeclass('PersistentList', 'Show', PersistentListShow);
    registry.registerDerivable('PersistentList', {
      functor: PersistentListFunctor,
      applicative: PersistentListApplicative,
      monad: PersistentListMonad,
      eq: PersistentListEq,
      ord: PersistentListOrd,
      show: PersistentListShow,
      purity: { effect: 'Pure' as const }
    });

    // Register PersistentMap
    registry.registerHKT('PersistentMap', PERSISTENT_MAP_K_ID);
    registry.registerPurity('PersistentMap', 'Pure');
    registry.registerTypeclass('PersistentMap', 'Functor', PersistentMapFunctor);
    registry.registerTypeclass('PersistentMap', 'Bifunctor', PersistentMapBifunctor);
    registry.registerTypeclass('PersistentMap', 'Eq', PersistentMapEq);
    registry.registerTypeclass('PersistentMap', 'Ord', PersistentMapOrd);
    registry.registerTypeclass('PersistentMap', 'Show', PersistentMapShow);
    registry.registerDerivable('PersistentMap', {
      functor: PersistentMapFunctor,
      bifunctor: PersistentMapBifunctor,
      eq: PersistentMapEq,
      ord: PersistentMapOrd,
      show: PersistentMapShow,
      purity: { effect: 'Pure' as const }
    });

    // Register PersistentSet
    registry.registerHKT('PersistentSet', PERSISTENT_SET_K_ID);
    registry.registerPurity('PersistentSet', 'Pure');
    registry.registerTypeclass('PersistentSet', 'Functor', PersistentSetFunctor);
    registry.registerTypeclass('PersistentSet', 'Eq', PersistentSetEq);
    registry.registerTypeclass('PersistentSet', 'Ord', PersistentSetOrd);
    registry.registerTypeclass('PersistentSet', 'Show', PersistentSetShow);
    registry.registerDerivable('PersistentSet', {
      functor: PersistentSetFunctor,
      eq: PersistentSetEq,
      ord: PersistentSetOrd,
      show: PersistentSetShow,
      purity: { effect: 'Pure' as const }
    });
  });

  // Import immutable collection instances
  import('./fp-immutable').then(({
    ImmutableArrayInstances, ImmutableArrayEq, ImmutableArrayOrd, ImmutableArrayShow
  }) => {
    // Register ImmutableArray
    registry.registerHKT('ImmutableArray', ARRAY_K_ID);
    registry.registerPurity('ImmutableArray', 'Pure');
    registry.registerTypeclass('ImmutableArray', 'Functor', ImmutableArrayInstances.functor);
    registry.registerTypeclass('ImmutableArray', 'Applicative', ImmutableArrayInstances.applicative);
    registry.registerTypeclass('ImmutableArray', 'Monad', ImmutableArrayInstances.monad);
    registry.registerTypeclass('ImmutableArray', 'Eq', ImmutableArrayEq);
    registry.registerTypeclass('ImmutableArray', 'Ord', ImmutableArrayOrd);
    registry.registerTypeclass('ImmutableArray', 'Show', ImmutableArrayShow);
    registry.registerDerivable('ImmutableArray', {
      functor: ImmutableArrayInstances.functor,
      applicative: ImmutableArrayInstances.applicative,
      monad: ImmutableArrayInstances.monad,
      eq: ImmutableArrayEq,
      ord: ImmutableArrayOrd,
      show: ImmutableArrayShow,
      purity: { effect: 'Pure' as const }
    });
  });

  // Register ObservableLite
  registry.registerHKT('ObservableLite', OBSERVABLE_LITE_K_ID);
  registry.registerPurity('ObservableLite', 'Async');
  registry.registerTypeclass('ObservableLite', 'Functor', ObservableLiteFunctor);
  registry.registerTypeclass('ObservableLite', 'Applicative', ObservableLiteApplicative);
  registry.registerTypeclass('ObservableLite', 'Monad', ObservableLiteMonad);
  registry.registerDerivable('ObservableLite', {
    functor: ObservableLiteFunctor,
    applicative: ObservableLiteApplicative,
    monad: ObservableLiteMonad,
    purity: { effect: 'Async' as const }
  });

  // Register TaskEither
  registry.registerHKT('TaskEither', TASK_EITHER_K_ID);
  registry.registerPurity('TaskEither', 'Async');
  registry.registerTypeclass('TaskEither', 'Bifunctor', TaskEitherBifunctorMonad);
  registry.registerTypeclass('TaskEither', 'Monad', TaskEitherBifunctorMonad);
  registry.registerDerivable('TaskEither', {
    bifunctor: TaskEitherBifunctorMonad,
    monad: TaskEitherBifunctorMonad,
    purity: { effect: 'Async' as const }
  });

  // Set up global registry
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__FP_REGISTRY = registry;
  }

  return registry;
}

// ============================================================================
// Part 4: Registry Access Functions
// ============================================================================

/**
 * Get the global FP registry
 */
export function getFPRegistry(): FPRegistry | undefined {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    return (globalThis as any).__FP_REGISTRY;
  }
  return undefined;
}

/**
 * Get a typeclass instance from the registry
 */
export function getTypeclassInstance(name: string, typeclass: string): any {
  const registry = getFPRegistry();
  return registry?.getTypeclass(name, typeclass);
}

/**
 * Get purity effect from the registry
 */
export function getPurityEffect(name: string): string | undefined {
  const registry = getFPRegistry();
  return registry?.getPurity(name);
}

/**
 * Get derivable instances from the registry
 */
export function getDerivableInstances(name: string): any {
  const registry = getFPRegistry();
  return registry?.getDerivable(name);
}

/**
 * Get usage bound for a type from the global registry
 */
export function getUsageBound(name: string): any {
  const registry = getFPRegistry();
  return registry?.getUsage(name);
}

/**
 * Register usage for a type in the global registry
 */
export function registerUsageBound(name: string, usage: any): void {
  const registry = getFPRegistry();
  registry?.registerUsage(name, usage);
}

// ============================================================================
// Part 5: Auto-Initialization
// ============================================================================

// Auto-initialize the registry when this module is loaded
export const globalFPRegistry = initializeFPRegistry();

// Export the registry for direct access
export default globalFPRegistry; 