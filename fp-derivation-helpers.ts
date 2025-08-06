/**
 * Automatic Typeclass Derivation System
 * 
 * Provides helpers to automatically derive Functor, Applicative, Monad, Bifunctor,
 * Eq, Ord, and Show instances for ADTs without manual boilerplate.
 */

import type { 
  Functor, 
  Applicative, 
  Monad, 
  Bifunctor,
  Kind, 
  Apply, 
  Type 
} from './fp-typeclasses';

// ============================================================================
// Core Derivation Types
// ============================================================================

/**
 * Configuration for instance derivation
 */
export interface DerivationConfig {
  functor?: boolean;
  applicative?: boolean;
  monad?: boolean;
  bifunctor?: boolean;
  eq?: boolean;
  ord?: boolean;
  show?: boolean;
  customMap?: <A, B>(fa: any, f: (a: A) => B) => any;
  customChain?: <A, B>(fa: any, f: (a: A) => any) => any;
  customBimap?: <A, B, C, D>(fab: any, f: (a: A) => C, g: (b: B) => D) => any;
  customEq?: (a: any, b: any) => boolean;
  customOrd?: (a: any, b: any) => number;
  customShow?: (a: any) => string;
}

/**
 * Result of instance derivation
 */
export interface DerivedInstances {
  functor?: Functor<any>;
  applicative?: Applicative<any>;
  monad?: Monad<any>;
  bifunctor?: Bifunctor<any>;
  eq?: Eq<any>;
  ord?: Ord<any>;
  show?: Show<any>;
}

// ============================================================================
// Typeclass Interfaces
// ============================================================================

/**
 * Eq typeclass for equality
 */
export interface Eq<A> {
  equals(a: A, b: A): boolean;
}

/**
 * Ord typeclass for ordering
 */
export interface Ord<A> extends Eq<A> {
  compare(a: A, b: A): number; // -1, 0, 1
}

/**
 * Show typeclass for string representation
 */
export interface Show<A> {
  show(a: A): string;
}

// ============================================================================
// ADT Analysis Helpers
// ============================================================================

/**
 * Analyze ADT structure for derivation
 */
export interface ADTAnalysis {
  isSumType: boolean;
  isProductType: boolean;
  constructors: string[];
  fields: Record<string, any[]>;
  hasMatch: boolean;
  hasTag: boolean;
}

/**
 * Analyze an ADT for derivation
 */
export function analyzeADT(adt: any): ADTAnalysis {
  const analysis: ADTAnalysis = {
    isSumType: false,
    isProductType: false,
    constructors: [],
    fields: {},
    hasMatch: typeof adt.match === 'function',
    hasTag: 'tag' in adt
  };

  // Check if it's a sum type (tagged union)
  if (analysis.hasTag && analysis.hasMatch) {
    analysis.isSumType = true;
    
    // Try to extract constructors from match
    try {
      const matchResult = adt.match({});
      // This is a simplified analysis - in practice we'd need more sophisticated detection
    } catch (e) {
      // Expected for incomplete match
    }
  }

  // Check if it's a product type (record/object)
  if (!analysis.isSumType && typeof adt === 'object' && adt !== null) {
    analysis.isProductType = true;
    analysis.fields = Object.keys(adt).reduce((acc, key) => {
      acc[key] = [adt[key]];
      return acc;
    }, {} as Record<string, any[]>);
  }

  return analysis;
}

// ============================================================================
// Functor Derivation
// ============================================================================

/**
 * Derive Functor instance for an ADT
 */
export function deriveFunctor<F extends Kind<[Type]>>(
  config: DerivationConfig = {}
): Functor<F> {
  return {
    map: <A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]> => {
      if (config.customMap) {
        return config.customMap(fa, f);
      }

      // Default implementation for tagged unions
      if (typeof fa === 'object' && fa !== null && 'tag' in fa) {
        return fa.match({
          Just: ({ value }) => ({ tag: 'Just', value: f(value) }),
          Nothing: () => ({ tag: 'Nothing' }),
          Left: ({ value }) => ({ tag: 'Left', value }),
          Right: ({ value }) => ({ tag: 'Right', value: f(value) }),
          Ok: ({ value }) => ({ tag: 'Ok', value: f(value) }),
          Err: ({ error }) => ({ tag: 'Err', error }),
          _: (tag: string, payload: any) => ({ tag, ...payload })
        });
      }

      // Default implementation for arrays
      if (Array.isArray(fa)) {
        return fa.map(f) as Apply<F, [B]>;
      }

      throw new Error('Cannot derive Functor for unknown type');
    }
  };
}

// ============================================================================
// Applicative Derivation
// ============================================================================

/**
 * Derive Applicative instance for an ADT
 */
export function deriveApplicative<F extends Kind<[Type]>>(
  config: DerivationConfig = {}
): Applicative<F> {
  const functor = deriveFunctor<F>(config);

  return {
    ...functor,
    of: <A>(a: A): Apply<F, [A]> => {
      // Default implementation for Maybe
      return { tag: 'Just', value: a } as Apply<F, [A]>;
    },
    ap: <A, B>(fab: Apply<F, [(a: A) => B]>, fa: Apply<F, [A]>): Apply<F, [B]> => {
      // Default implementation for Maybe
      return fab.match({
        Just: ({ value: f }) => functor.map(fa, f),
        Nothing: () => ({ tag: 'Nothing' }),
        _: () => functor.map(fa, (a: A) => (fab as any).value(a))
      });
    }
  };
}

// ============================================================================
// Monad Derivation
// ============================================================================

/**
 * Derive Monad instance for an ADT
 */
export function deriveMonad<F extends Kind<[Type]>>(
  config: DerivationConfig = {}
): Monad<F> {
  const applicative = deriveApplicative<F>(config);

  return {
    ...applicative,
    chain: <A, B>(fa: Apply<F, [A]>, f: (a: A) => Apply<F, [B]>): Apply<F, [B]> => {
      if (config.customChain) {
        return config.customChain(fa, f);
      }

      // Default implementation for Maybe
      return fa.match({
        Just: ({ value }) => f(value),
        Nothing: () => ({ tag: 'Nothing' }),
        Left: ({ value }) => ({ tag: 'Left', value }),
        Right: ({ value }) => f(value),
        Ok: ({ value }) => f(value),
        Err: ({ error }) => ({ tag: 'Err', error }),
        _: (tag: string, payload: any) => ({ tag, ...payload })
      });
    }
  };
}

// ============================================================================
// Bifunctor Derivation
// ============================================================================

/**
 * Derive Bifunctor instance for an ADT
 */
export function deriveBifunctor<F extends Kind<[Type, Type]>>(
  config: DerivationConfig = {}
): Bifunctor<F> {
  return {
    bimap: <A, B, C, D>(
      fab: Apply<F, [A, B]>, 
      f: (a: A) => C, 
      g: (b: B) => D
    ): Apply<F, [C, D]> => {
      if (config.customBimap) {
        return config.customBimap(fab, f, g);
      }

      // Default implementation for Either/Result
      return fab.match({
        Left: ({ value }) => ({ tag: 'Left', value: f(value) }),
        Right: ({ value }) => ({ tag: 'Right', value: g(value) }),
        Ok: ({ value }) => ({ tag: 'Ok', value: g(value) }),
        Err: ({ error }) => ({ tag: 'Err', error: f(error) }),
        _: (tag: string, payload: any) => ({ tag, ...payload })
      });
    },
    mapLeft: <A, B, C>(fab: Apply<F, [A, B]>, f: (a: A) => C): Apply<F, [C, B]> => {
      return (deriveBifunctor<F>(config).bimap as any)(fab, f, (b: B) => b);
    },
    mapRight: <A, B, D>(fab: Apply<F, [A, B]>, g: (b: B) => D): Apply<F, [A, D]> => {
      return (deriveBifunctor<F>(config).bimap as any)(fab, (a: A) => a, g);
    }
  };
}

// ============================================================================
// Eq Derivation
// ============================================================================

/**
 * Derive Eq instance for an ADT
 */
export function deriveEq<A>(config: DerivationConfig = {}): Eq<A> {
  return {
    equals: (a: A, b: A): boolean => {
      if (config.customEq) {
        return config.customEq(a, b);
      }

      // Default deep equality for tagged unions
      if (typeof a === 'object' && a !== null && 'tag' in a &&
          typeof b === 'object' && b !== null && 'tag' in b) {
        
        if (a.tag !== b.tag) return false;

        return a.match({
          Just: ({ value: aValue }) => b.match({
            Just: ({ value: bValue }) => aValue === bValue,
            Nothing: () => false
          }),
          Nothing: () => b.match({
            Just: () => false,
            Nothing: () => true
          }),
          Left: ({ value: aValue }) => b.match({
            Left: ({ value: bValue }) => aValue === bValue,
            Right: () => false
          }),
          Right: ({ value: aValue }) => b.match({
            Left: () => false,
            Right: ({ value: bValue }) => aValue === bValue
          }),
          Ok: ({ value: aValue }) => b.match({
            Ok: ({ value: bValue }) => aValue === bValue,
            Err: () => false
          }),
          Err: ({ error: aError }) => b.match({
            Ok: () => false,
            Err: ({ error: bError }) => aError === bError
          }),
          _: (tag: string, payload: any) => {
            // Deep equality for other fields
            return JSON.stringify(payload) === JSON.stringify((b as any)[tag]);
          }
        });
      }

      // Default equality
      return a === b;
    }
  };
}

// ============================================================================
// Ord Derivation
// ============================================================================

/**
 * Derive Ord instance for an ADT
 */
export function deriveOrd<A>(config: DerivationConfig = {}): Ord<A> {
  const eq = deriveEq<A>(config);

  return {
    ...eq,
    compare: (a: A, b: A): number => {
      if (config.customOrd) {
        return config.customOrd(a, b);
      }

      // Default lexicographic ordering for tagged unions
      if (typeof a === 'object' && a !== null && 'tag' in a &&
          typeof b === 'object' && b !== null && 'tag' in b) {
        
        // First compare tags
        const tagComparison = a.tag.localeCompare(b.tag);
        if (tagComparison !== 0) return tagComparison;

        // Then compare values
        return a.match({
          Just: ({ value: aValue }) => b.match({
            Just: ({ value: bValue }) => {
              if (aValue < bValue) return -1;
              if (aValue > bValue) return 1;
              return 0;
            },
            Nothing: () => 1 // Just > Nothing
          }),
          Nothing: () => b.match({
            Just: () => -1, // Nothing < Just
            Nothing: () => 0
          }),
          Left: ({ value: aValue }) => b.match({
            Left: ({ value: bValue }) => {
              if (aValue < bValue) return -1;
              if (aValue > bValue) return 1;
              return 0;
            },
            Right: () => -1 // Left < Right
          }),
          Right: ({ value: aValue }) => b.match({
            Left: () => 1, // Right > Left
            Right: ({ value: bValue }) => {
              if (aValue < bValue) return -1;
              if (aValue > bValue) return 1;
              return 0;
            }
          }),
          _: () => 0 // Default case
        });
      }

      // Default comparison
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    }
  };
}

// ============================================================================
// Show Derivation
// ============================================================================

/**
 * Derive Show instance for an ADT
 */
export function deriveShow<A>(config: DerivationConfig = {}): Show<A> {
  return {
    show: (a: A): string => {
      if (config.customShow) {
        return config.customShow(a);
      }

      // Default string representation for tagged unions
      if (typeof a === 'object' && a !== null && 'tag' in a) {
        return a.match({
          Just: ({ value }) => `Just(${JSON.stringify(value)})`,
          Nothing: () => 'Nothing',
          Left: ({ value }) => `Left(${JSON.stringify(value)})`,
          Right: ({ value }) => `Right(${JSON.stringify(value)})`,
          Ok: ({ value }) => `Ok(${JSON.stringify(value)})`,
          Err: ({ error }) => `Err(${JSON.stringify(error)})`,
          _: (tag: string, payload: any) => `${tag}(${JSON.stringify(payload)})`
        });
      }

      // Default string representation
      return JSON.stringify(a);
    }
  };
}

// ============================================================================
// Main Derivation Function
// ============================================================================

/**
 * Derive all requested instances for an ADT
 */
export function deriveInstances<F extends Kind<any[]>>(
  config: DerivationConfig
): DerivedInstances {
  const instances: DerivedInstances = {};

  if (config.functor) {
    instances.functor = deriveFunctor<F>(config);
  }

  if (config.applicative) {
    instances.applicative = deriveApplicative<F>(config);
  }

  if (config.monad) {
    instances.monad = deriveMonad<F>(config);
  }

  if (config.bifunctor) {
    instances.bifunctor = deriveBifunctor<F>(config);
  }

  if (config.eq) {
    instances.eq = deriveEq(config);
  }

  if (config.ord) {
    instances.ord = deriveOrd(config);
  }

  if (config.show) {
    instances.show = deriveShow(config);
  }

  return instances;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Derive Functor instance
 */
export function deriveFunctorInstance<F extends Kind<[Type]>>(config?: DerivationConfig): Functor<F> {
  return deriveFunctor<F>(config);
}

/**
 * Derive Applicative instance
 */
export function deriveApplicativeInstance<F extends Kind<[Type]>>(config?: DerivationConfig): Applicative<F> {
  return deriveApplicative<F>(config);
}

/**
 * Derive Monad instance
 */
export function deriveMonadInstance<F extends Kind<[Type]>>(config?: DerivationConfig): Monad<F> {
  return deriveMonad<F>(config);
}

/**
 * Derive Bifunctor instance
 */
export function deriveBifunctorInstance<F extends Kind<[Type, Type]>>(config?: DerivationConfig): Bifunctor<F> {
  return deriveBifunctor<F>(config);
}

/**
 * Derive Eq instance
 */
export function deriveEqInstance<A>(config?: DerivationConfig): Eq<A> {
  return deriveEq<A>(config);
}

/**
 * Derive Ord instance
 */
export function deriveOrdInstance<A>(config?: DerivationConfig): Ord<A> {
  return deriveOrd<A>(config);
}

/**
 * Derive Show instance
 */
export function deriveShowInstance<A>(config?: DerivationConfig): Show<A> {
  return deriveShow<A>(config);
} 