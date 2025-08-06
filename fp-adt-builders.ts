/**
 * Generic Algebraic Data Type Builders
 * 
 * This module provides generic utilities to define and work with algebraic data types:
 * - Sum Type Builder: createSumType<Spec> for tagged unions
 * - Product Type Builder: createProductType<Fields> for typed records/tuples
 * - HKT Integration: Automatic HKT kind generation
 * - Derivable Instance Integration: Auto-derivation of typeclass instances
 * - Purity Tracking Integration: Effect-aware type generation
 * 
 * Features:
 * - Type-safe constructors for each variant
 * - Exhaustive pattern matching with never trick
 * - HKT integration for use with typeclasses
 * - Automatic purity tracking
 * - Derivable instances integration
 * - Comprehensive type inference
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK,
  Maybe, Either
} from './fp-hkt';

import {
  Functor, Applicative, Monad, Bifunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

import {
  deriveInstances, deriveEqInstance, deriveOrdInstance, deriveShowInstance,
  Eq, Ord, Show
} from './fp-derivation-helpers';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * ADT variant with tag
 */
export interface ADTVariant {
  readonly tag: string;
}

/**
 * Constructor function type
 */
export type Constructor<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Result & ADTVariant
  : never;

/**
 * Constructor specification
 */
export type ConstructorSpec = Record<string, (...args: any[]) => any>;

/**
 * Sum type instance
 */
export type SumTypeInstance<Spec extends ConstructorSpec> = {
  [K in keyof Spec]: ReturnType<Spec[K]> & ADTVariant;
}[keyof Spec];

/**
 * Pattern matcher type
 */
export type Matcher<Spec extends ConstructorSpec, R> = {
  [K in keyof Spec]: (value: ReturnType<Spec[K]> & ADTVariant) => R;
};

/**
 * Product type fields
 */
export type ProductFields = Record<string, any>;

/**
 * Product type instance
 */
export type ProductTypeInstance<Fields extends ProductFields> = Fields;

/**
 * Sum type HKT
 */
export interface SumTypeK<Spec extends ConstructorSpec> extends Kind1 {
  readonly type: SumTypeInstance<Spec>;
}

/**
 * Product type HKT
 */
export interface ProductTypeK<Fields extends ProductFields> extends Kind1 {
  readonly type: ProductTypeInstance<Fields>;
}

/**
 * ADT purity configuration
 */
export interface ADTPurityConfig {
  readonly effect?: EffectTag;
  readonly enableRuntimeMarkers?: boolean;
}

/**
 * Sum type configuration
 */
export interface SumTypeConfig extends ADTPurityConfig {
  readonly name?: string;
  readonly enableHKT?: boolean;
  readonly enableDerivableInstances?: boolean;
  readonly derive?: ('Eq' | 'Ord' | 'Show')[];
}

/**
 * Product type configuration
 */
export interface ProductTypeConfig extends ADTPurityConfig {
  readonly name?: string;
  readonly enableHKT?: boolean;
  readonly enableDerivableInstances?: boolean;
  readonly derive?: ('Eq' | 'Ord' | 'Show')[];
}

/**
 * Sum type builder interface
 */
export interface SumTypeBuilder<Spec extends ConstructorSpec> {
  // Type information
  readonly Type: new <A>() => SumTypeInstance<Spec>;
  readonly Instance: SumTypeInstance<Spec>;
  
  // Constructors
  readonly constructors: {
    [K in keyof Spec]: Constructor<Spec[K]>;
  };
  
  // Pattern matcher
  readonly match: <R>(
    value: SumTypeInstance<Spec>,
    matcher: Matcher<Spec, R>
  ) => R;
  
  // Partial matcher
  readonly matchPartial: <R>(
    value: SumTypeInstance<Spec>,
    matcher: Partial<Matcher<Spec, R>>,
    fallback: (value: SumTypeInstance<Spec>) => R
  ) => R;
  
  // Curryable matcher
  readonly createMatcher: <R>(
    matcher: Matcher<Spec, R>
  ) => (value: SumTypeInstance<Spec>) => R;
  
  // HKT integration
  readonly HKT: SumTypeK<Spec>;
  
  // Purity information
  readonly effect: EffectTag;
  readonly isPure: boolean;
  readonly isImpure: boolean;
  
  // Utility functions
  readonly isVariant: <K extends keyof Spec>(
    value: SumTypeInstance<Spec>,
    variant: K
  ) => value is ReturnType<Spec[K]> & ADTVariant;
  
  readonly getTag: (value: SumTypeInstance<Spec>) => keyof Spec;
  
  readonly createWithEffect: <E extends EffectTag>(
    effect: E
  ) => SumTypeBuilder<Spec> & { effect: E };

  // Derived typeclass instances
  readonly Eq?: Eq<SumTypeInstance<Spec>>;
  readonly Ord?: Ord<SumTypeInstance<Spec>>;
  readonly Show?: Show<SumTypeInstance<Spec>>;
}

/**
 * Product type builder interface
 */
export interface ProductTypeBuilder<Fields extends ProductFields> {
  // Type information
  readonly Type: new () => ProductTypeInstance<Fields>;
  readonly Instance: ProductTypeInstance<Fields>;
  
  // Constructor
  readonly of: (fields: Fields) => ProductTypeInstance<Fields>;
  
  // Field accessors
  readonly get: <K extends keyof Fields>(
    instance: ProductTypeInstance<Fields>,
    key: K
  ) => Fields[K];
  
  // Field updater
  readonly set: <K extends keyof Fields>(
    instance: ProductTypeInstance<Fields>,
    key: K,
    value: Fields[K]
  ) => ProductTypeInstance<Fields>;
  
  // Field updater with function
  readonly update: <K extends keyof Fields>(
    instance: ProductTypeInstance<Fields>,
    key: K,
    updater: (value: Fields[K]) => Fields[K]
  ) => ProductTypeInstance<Fields>;
  
  // HKT integration
  readonly HKT: ProductTypeK<Fields>;
  
  // Purity information
  readonly effect: EffectTag;
  readonly isPure: boolean;
  readonly isImpure: boolean;
  
  // Utility functions
  readonly keys: () => (keyof Fields)[];
  readonly values: (instance: ProductTypeInstance<Fields>) => Fields[keyof Fields][];
  readonly entries: (instance: ProductTypeInstance<Fields>) => [keyof Fields, Fields[keyof Fields]][];
  
  readonly createWithEffect: <E extends EffectTag>(
    effect: E
  ) => ProductTypeBuilder<Fields> & { effect: E };

  // Derived typeclass instances
  readonly Eq?: Eq<ProductTypeInstance<Fields>>;
  readonly Ord?: Ord<ProductTypeInstance<Fields>>;
  readonly Show?: Show<ProductTypeInstance<Fields>>;
}

// ============================================================================
// Sum Type Builder
// ============================================================================

/**
 * Creates a sum type builder with automatic typeclass derivation
 * 
 * @example
 * ```typescript
 * const Maybe = createSumType({
 *   Just: (value: any) => ({ value }),
 *   Nothing: () => ({})
 * }, {
 *   derive: ['Eq', 'Ord', 'Show']
 * });
 * 
 * const just1 = Maybe.constructors.Just(42);
 * const just2 = Maybe.constructors.Just(42);
 * const nothing = Maybe.constructors.Nothing();
 * 
 * // Use derived instances
 * Maybe.Eq?.equals(just1, just2); // true
 * Maybe.Ord?.compare(just1, nothing); // > 0
 * Maybe.Show?.show(just1); // "Just({ value: 42 })"
 * ```
 */
export function createSumType<Spec extends ConstructorSpec>(
  spec: Spec,
  config: SumTypeConfig = {}
): SumTypeBuilder<Spec> {
  const {
    effect = 'Pure',
    enableRuntimeMarkers = false,
    enableHKT = true,
    enableDerivableInstances = true,
    derive = []
  } = config;
  
  // Create constructors with proper typing
  const constructors = {} as {
    [K in keyof Spec]: Constructor<Spec[K]>;
  };
  
  for (const [key, constructor] of Object.entries(spec)) {
    constructors[key as keyof Spec] = ((...args: any[]) => {
      const result = constructor(...args);
      const variant = { ...result, tag: key };
      
      if (enableRuntimeMarkers) {
        return attachPurityMarker(variant, effect);
      }
      
      return variant;
    }) as Constructor<Spec[keyof Spec]>;
  }
  
  // Pattern matcher with exhaustiveness checking
  const match = <R>(
    value: SumTypeInstance<Spec>,
    matcher: Matcher<Spec, R>
  ): R => {
    const tag = value.tag as keyof Spec;
    const handler = matcher[tag];
    
    if (!handler) {
      throw new Error(`No handler found for tag: ${String(tag)}`);
    }
    
    return handler(value as any);
  };
  
  // Partial matcher with fallback
  const matchPartial = <R>(
    value: SumTypeInstance<Spec>,
    matcher: Partial<Matcher<Spec, R>>,
    fallback: (value: SumTypeInstance<Spec>) => R
  ): R => {
    const tag = value.tag as keyof Spec;
    const handler = matcher[tag];
    
    if (handler) {
      return handler(value as any);
    }
    
    return fallback(value);
  };
  
  // Curryable matcher
  const createMatcher = <R>(
    matcher: Matcher<Spec, R>
  ) => (value: SumTypeInstance<Spec>): R => match(value, matcher);
  
  // Variant checking
  const isVariant = <K extends keyof Spec>(
    value: SumTypeInstance<Spec>,
    variant: K
  ): value is ReturnType<Spec[K]> & ADTVariant => {
    return value.tag === variant;
  };
  
  // Tag getter
  const getTag = (value: SumTypeInstance<Spec>): keyof Spec => {
    return value.tag as keyof Spec;
  };
  
  // Effect override
  const createWithEffect = <E extends EffectTag>(
    newEffect: E
  ): SumTypeBuilder<Spec> & { effect: E } => {
    return createSumType(spec, { ...config, effect: newEffect }) as any;
  };
  
  // HKT integration
  const HKT: SumTypeK<Spec> = {
    type: {} as SumTypeInstance<Spec>
  } as any;

  // Derived typeclass instances
  let derivedInstances: {
    Eq?: Eq<SumTypeInstance<Spec>>;
    Ord?: Ord<SumTypeInstance<Spec>>;
    Show?: Show<SumTypeInstance<Spec>>;
  } = {};

  if (derive.length > 0) {
    // Derive Eq instance
    if (derive.includes('Eq')) {
      derivedInstances.Eq = deriveEqInstance({
        customEq: (a: SumTypeInstance<Spec>, b: SumTypeInstance<Spec>): boolean => {
          if (a.tag !== b.tag) return false;
          
          // Compare payloads structurally
          const aKeys = Object.keys(a).filter(k => k !== 'tag');
          const bKeys = Object.keys(b).filter(k => k !== 'tag');
          
          if (aKeys.length !== bKeys.length) return false;
          
          for (const key of aKeys) {
            if (!(key in b)) return false;
            if (a[key as keyof typeof a] !== b[key as keyof typeof b]) return false;
          }
          
          return true;
        }
      });
    }

    // Derive Ord instance
    if (derive.includes('Ord')) {
      derivedInstances.Ord = deriveOrdInstance({
        customOrd: (a: SumTypeInstance<Spec>, b: SumTypeInstance<Spec>): number => {
          // First compare tags
          if (a.tag < b.tag) return -1;
          if (a.tag > b.tag) return 1;
          
          // If tags are equal, compare payloads
          const aKeys = Object.keys(a).filter(k => k !== 'tag').sort();
          const bKeys = Object.keys(b).filter(k => k !== 'tag').sort();
          
          // Compare keys first
          for (let i = 0; i < Math.min(aKeys.length, bKeys.length); i++) {
            if (aKeys[i] < bKeys[i]) return -1;
            if (aKeys[i] > bKeys[i]) return 1;
          }
          
          if (aKeys.length < bKeys.length) return -1;
          if (aKeys.length > bKeys.length) return 1;
          
          // Compare values
          for (const key of aKeys) {
            const aVal = a[key as keyof typeof a];
            const bVal = b[key as keyof typeof b];
            
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
          }
          
          return 0;
        }
      });
    }

    // Derive Show instance
    if (derive.includes('Show')) {
      derivedInstances.Show = deriveShowInstance({
        customShow: (a: SumTypeInstance<Spec>): string => {
          const tag = a.tag;
          const payload = Object.keys(a)
            .filter(k => k !== 'tag')
            .reduce((acc, key) => {
              acc[key] = a[key as keyof typeof a];
              return acc;
            }, {} as Record<string, any>);
          
          const payloadStr = Object.keys(payload).length > 0 
            ? `(${JSON.stringify(payload)})` 
            : '';
          
          return `${tag}${payloadStr}`;
        }
      });
    }

    // Register with derivable instances system if enabled
    if (enableDerivableInstances && typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
      const registry = (globalThis as any).__FP_REGISTRY;
      const typeName = config.name || 'SumType';
      
      if (derivedInstances.Eq) {
        registry.register(`${typeName}Eq`, derivedInstances.Eq);
      }
      if (derivedInstances.Ord) {
        registry.register(`${typeName}Ord`, derivedInstances.Ord);
      }
      if (derivedInstances.Show) {
        registry.register(`${typeName}Show`, derivedInstances.Show);
      }
    }
  }
  
  return {
    Type: (class {
      constructor() {
        throw new Error('SumType is a type constructor, not a value constructor');
      }
    } as any),
    Instance: {} as SumTypeInstance<Spec>,
    constructors,
    match,
    matchPartial,
    createMatcher,
    HKT,
    effect,
    isPure: effect === 'Pure',
    isImpure: effect !== 'Pure',
    isVariant,
    getTag,
    createWithEffect,
    ...derivedInstances
  };
}

// ============================================================================
// Product Type Builder
// ============================================================================

/**
 * Create a product type with type-safe field access and updates
 * 
 * @param config Configuration options
 * @returns Product type builder with field operations
 * 
 * @example
 * ```typescript
 * const Point = createProductType<{ x: number; y: number }>();
 * 
 * const p1 = Point.of({ x: 10, y: 20 });
 * const sum = p1.x + p1.y;
 * 
 * const p2 = Point.set(p1, 'x', 15);
 * const p3 = Point.update(p1, 'y', y => y * 2);
 * ```
 */
export function createProductType<Fields extends ProductFields>(
  config: ProductTypeConfig = {}
): ProductTypeBuilder<Fields> {
  const {
    effect = 'Pure',
    enableRuntimeMarkers = false,
    enableHKT = true,
    enableDerivableInstances = true,
    derive = []
  } = config;
  
  // Constructor
  const of = (fields: Fields): ProductTypeInstance<Fields> => {
    const instance = { ...fields };
    
    if (enableRuntimeMarkers) {
      return attachPurityMarker(instance, effect);
    }
    
    return instance;
  };
  
  // Field accessor
  const get = <K extends keyof Fields>(
    instance: ProductTypeInstance<Fields>,
    key: K
  ): Fields[K] => {
    return instance[key];
  };
  
  // Field setter
  const set = <K extends keyof Fields>(
    instance: ProductTypeInstance<Fields>,
    key: K,
    value: Fields[K]
  ): ProductTypeInstance<Fields> => {
    const updated = { ...instance, [key]: value };
    
    if (enableRuntimeMarkers) {
      return attachPurityMarker(updated, effect);
    }
    
    return updated;
  };
  
  // Field updater
  const update = <K extends keyof Fields>(
    instance: ProductTypeInstance<Fields>,
    key: K,
    updater: (value: Fields[K]) => Fields[K]
  ): ProductTypeInstance<Fields> => {
    const updated = { ...instance, [key]: updater(instance[key]) };
    
    if (enableRuntimeMarkers) {
      return attachPurityMarker(updated, effect);
    }
    
    return updated;
  };
  
  // Utility functions
  const keys = (): (keyof Fields)[] => {
    return Object.keys({} as Fields) as (keyof Fields)[];
  };
  
  const values = (instance: ProductTypeInstance<Fields>): Fields[keyof Fields][] => {
    return Object.values(instance);
  };
  
  const entries = (instance: ProductTypeInstance<Fields>): [keyof Fields, Fields[keyof Fields]][] => {
    return Object.entries(instance) as [keyof Fields, Fields[keyof Fields]][];
  };
  
  // Effect override
  const createWithEffect = <E extends EffectTag>(
    newEffect: E
  ): ProductTypeBuilder<Fields> & { effect: E } => {
    return createProductType<Fields>({ ...config, effect: newEffect }) as any;
  };
  
  // HKT integration
  const HKT: ProductTypeK<Fields> = {
    type: {} as ProductTypeInstance<Fields>
  } as any;

  // Derived typeclass instances
  let derivedInstances: {
    Eq?: Eq<ProductTypeInstance<Fields>>;
    Ord?: Ord<ProductTypeInstance<Fields>>;
    Show?: Show<ProductTypeInstance<Fields>>;
  } = {};

  if (derive.length > 0) {
    // Derive Eq instance
    if (derive.includes('Eq')) {
      derivedInstances.Eq = deriveEqInstance({
        customEq: (a: ProductTypeInstance<Fields>, b: ProductTypeInstance<Fields>): boolean => {
          const aKeys = Object.keys(a);
          const bKeys = Object.keys(b);

          if (aKeys.length !== bKeys.length) return false;

          for (const key of aKeys) {
            if (!(key in b)) return false;
            if (a[key as keyof typeof a] !== b[key as keyof typeof b]) return false;
          }

          return true;
        }
      });
    }

    // Derive Ord instance
    if (derive.includes('Ord')) {
      derivedInstances.Ord = deriveOrdInstance({
        customOrd: (a: ProductTypeInstance<Fields>, b: ProductTypeInstance<Fields>): number => {
          const aKeys = Object.keys(a).sort();
          const bKeys = Object.keys(b).sort();

          for (let i = 0; i < Math.min(aKeys.length, bKeys.length); i++) {
            if (aKeys[i] < bKeys[i]) return -1;
            if (aKeys[i] > bKeys[i]) return 1;
          }

          if (aKeys.length < bKeys.length) return -1;
          if (aKeys.length > bKeys.length) return 1;

          for (const key of aKeys) {
            const aVal = a[key as keyof typeof a];
            const bVal = b[key as keyof typeof b];

            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
          }

          return 0;
        }
      });
    }

    // Derive Show instance
    if (derive.includes('Show')) {
      derivedInstances.Show = deriveShowInstance({
        customShow: (a: ProductTypeInstance<Fields>): string => {
          const payload = Object.keys(a)
            .reduce((acc, key) => {
              acc[key] = a[key as keyof typeof a];
              return acc;
            }, {} as Record<string, any>);
          
          const payloadStr = Object.keys(payload).length > 0 
            ? `(${JSON.stringify(payload)})` 
            : '';
          
          return `{${payloadStr}}`;
        }
      });
    }

    // Register with derivable instances system if enabled
    if (enableDerivableInstances && typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
      const registry = (globalThis as any).__FP_REGISTRY;
      const typeName = config.name || 'ProductType';
      
      if (derivedInstances.Eq) {
        registry.register(`${typeName}Eq`, derivedInstances.Eq);
      }
      if (derivedInstances.Ord) {
        registry.register(`${typeName}Ord`, derivedInstances.Ord);
      }
      if (derivedInstances.Show) {
        registry.register(`${typeName}Show`, derivedInstances.Show);
      }
    }
  }
  
  return {
    Type: (class {
      constructor() {
        throw new Error('ProductType is a type constructor, not a value constructor');
      }
    } as any),
    Instance: {} as ProductTypeInstance<Fields>,
    of,
    get,
    set,
    update,
    HKT,
    effect,
    isPure: effect === 'Pure',
    isImpure: effect !== 'Pure',
    keys,
    values,
    entries,
    createWithEffect,
    ...derivedInstances
  };
}

// ============================================================================
// HKT Integration
// ============================================================================

/**
 * Extract HKT kind from sum type builder
 */
export type ExtractSumTypeHKT<Builder> = Builder extends SumTypeBuilder<any>
  ? Builder['HKT']
  : never;

/**
 * Extract HKT kind from product type builder
 */
export type ExtractProductTypeHKT<Builder> = Builder extends ProductTypeBuilder<any>
  ? Builder['HKT']
  : never;

/**
 * Extract instance type from sum type builder
 */
export type ExtractSumTypeInstance<Builder> = Builder extends SumTypeBuilder<any>
  ? Builder['Instance']
  : never;

/**
 * Extract instance type from product type builder
 */
export type ExtractProductTypeInstance<Builder> = Builder extends ProductTypeBuilder<any>
  ? Builder['Instance']
  : never;

// ============================================================================
// Derivable Instance Integration
// ============================================================================

/**
 * Register sum type for derivable instances
 */
function registerSumTypeForDerivableInstances<Spec extends ConstructorSpec>(
  builder: SumTypeBuilder<Spec>
): void {
  // This would integrate with the existing derivable instances system
  // For now, we'll create a placeholder implementation
  
  const sumTypeInstance = {
    // Functor instance
    map: <A, B>(
      fa: SumTypeInstance<Spec>,
      f: (a: A) => B
    ): SumTypeInstance<Spec> => {
      // This is a simplified implementation
      // In practice, this would depend on the specific sum type structure
      return fa;
    },
    
    // Applicative instance
    of: <A>(a: A): SumTypeInstance<Spec> => {
      // This would create the appropriate variant
      return {} as SumTypeInstance<Spec>;
    },
    
    ap: <A, B>(
      fab: SumTypeInstance<Spec>,
      fa: SumTypeInstance<Spec>
    ): SumTypeInstance<Spec> => {
      // This is a simplified implementation
      return {} as SumTypeInstance<Spec>;
    },
    
    // Monad instance
    chain: <A, B>(
      fa: SumTypeInstance<Spec>,
      f: (a: A) => SumTypeInstance<Spec>
    ): SumTypeInstance<Spec> => {
      // This is a simplified implementation
      return {} as SumTypeInstance<Spec>;
    }
  };
  
  // Register with global registry
  (globalThis as any).__adtRegistry = (globalThis as any).__adtRegistry || {};
  (globalThis as any).__adtRegistry[`sum_${builder.effect}`] = {
    builder,
    instance: sumTypeInstance,
    effect: builder.effect
  };
}

/**
 * Register product type for derivable instances
 */
function registerProductTypeForDerivableInstances<Fields extends ProductFields>(
  builder: ProductTypeBuilder<Fields>
): void {
  // This would integrate with the existing derivable instances system
  // For now, we'll create a placeholder implementation
  
  const productTypeInstance = {
    // Functor instance
    map: <A, B>(
      fa: ProductTypeInstance<Fields>,
      f: (a: A) => B
    ): ProductTypeInstance<Fields> => {
      // This is a simplified implementation
      return fa;
    },
    
    // Applicative instance
    of: <A>(a: A): ProductTypeInstance<Fields> => {
      // This would create a product type with the value
      return {} as ProductTypeInstance<Fields>;
    },
    
    ap: <A, B>(
      fab: ProductTypeInstance<Fields>,
      fa: ProductTypeInstance<Fields>
    ): ProductTypeInstance<Fields> => {
      // This is a simplified implementation
      return {} as ProductTypeInstance<Fields>;
    }
  };
  
  // Register with global registry
  (globalThis as any).__adtRegistry = (globalThis as any).__adtRegistry || {};
  (globalThis as any).__adtRegistry[`product_${builder.effect}`] = {
    builder,
    instance: productTypeInstance,
    effect: builder.effect
  };
}

// ============================================================================
// Example Implementations
// ============================================================================

/**
 * Maybe type using createSumType
 * 
 * @example
 * ```typescript
 * const Maybe = createMaybeType<number>();
 * 
 * const m1 = Maybe.Just(42);
 * const m2 = Maybe.Nothing();
 * 
 * const result = Maybe.match(m1, {
 *   Just: x => `Got ${x.value}`,
 *   Nothing: () => "None"
 * });
 * ```
 */
export function createMaybeType<A>(): SumTypeBuilder<{
  Just: (value: A) => { value: A };
  Nothing: () => {};
}> {
  return createSumType({
    Just: (value: A) => ({ value }),
    Nothing: () => ({})
  }, {
    name: 'Maybe',
    effect: 'Pure',
    enableHKT: true,
    enableDerivableInstances: true,
    derive: ['Eq', 'Ord', 'Show']
  });
}

/**
 * Either type using createSumType
 * 
 * @example
 * ```typescript
 * const Either = createEitherType<string, number>();
 * 
 * const e1 = Either.Left("error");
 * const e2 = Either.Right(42);
 * 
 * const result = Either.match(e1, {
 *   Left: x => `Error: ${x.value}`,
 *   Right: x => `Success: ${x.value}`
 * });
 * ```
 */
export function createEitherType<L, R>(): SumTypeBuilder<{
  Left: (value: L) => { value: L };
  Right: (value: R) => { value: R };
}> {
  return createSumType({
    Left: (value: L) => ({ value }),
    Right: (value: R) => ({ value })
  }, {
    name: 'Either',
    effect: 'Pure',
    enableHKT: true,
    enableDerivableInstances: true,
    derive: ['Eq', 'Ord', 'Show']
  });
}

/**
 * Result type using createSumType
 * 
 * @example
 * ```typescript
 * const Result = createResultType<string, number>();
 * 
 * const r1 = Result.Err("error");
 * const r2 = Result.Ok(42);
 * 
 * const result = Result.match(r1, {
 *   Err: x => `Error: ${x.value}`,
 *   Ok: x => `Success: ${x.value}`
 * });
 * ```
 */
export function createResultType<E, A>(): SumTypeBuilder<{
  Err: (value: E) => { value: E };
  Ok: (value: A) => { value: A };
}> {
  return createSumType({
    Err: (value: E) => ({ value }),
    Ok: (value: A) => ({ value })
  }, {
    name: 'Result',
    effect: 'Pure',
    enableHKT: true,
    enableDerivableInstances: true,
    derive: ['Eq', 'Ord', 'Show']
  });
}

/**
 * Point type using createProductType
 * 
 * @example
 * ```typescript
 * const Point = createPointType();
 * 
 * const p1 = Point.of({ x: 10, y: 20 });
 * const sum = p1.x + p1.y;
 * 
 * const p2 = Point.set(p1, 'x', 15);
 * ```
 */
export function createPointType(): ProductTypeBuilder<{
  x: number;
  y: number;
}> {
  return createProductType<{ x: number; y: number }>({
    name: 'Point',
    effect: 'Pure',
    enableHKT: true,
    enableDerivableInstances: true,
    derive: ['Eq', 'Ord', 'Show']
  });
}

/**
 * Rectangle type using createProductType
 * 
 * @example
 * ```typescript
 * const Rectangle = createRectangleType();
 * 
 * const r1 = Rectangle.of({ width: 10, height: 20 });
 * const area = r1.width * r1.height;
 * 
 * const r2 = Rectangle.update(r1, 'width', w => w * 2);
 * ```
 */
export function createRectangleType(): ProductTypeBuilder<{
  width: number;
  height: number;
}> {
  return createProductType<{ width: number; height: number }>({
    name: 'Rectangle',
    effect: 'Pure',
    enableHKT: true,
    enableDerivableInstances: true,
    derive: ['Eq', 'Ord', 'Show']
  });
}

// ============================================================================
// Laws Documentation
// ============================================================================

/**
 * ADT Builder Laws:
 * 
 * Sum Type Laws:
 * 1. Constructor Law: constructors create properly tagged variants
 * 2. Matcher Law: match with all cases is exhaustive
 * 3. Tag Law: getTag returns the correct tag for any variant
 * 4. Variant Law: isVariant correctly identifies variant types
 * 
 * Product Type Laws:
 * 1. Constructor Law: of creates instances with all required fields
 * 2. Getter Law: get returns the correct value for any field
 * 3. Setter Law: set updates the correct field without affecting others
 * 4. Updater Law: update applies the function to the correct field
 * 
 * Functor Laws (for applicable types):
 * 1. Identity: map(id) = id
 * 2. Composition: map(f ∘ g) = map(f) ∘ map(g)
 * 
 * Monad Laws (for applicable sum types):
 * 1. Left Identity: of(a).chain(f) = f(a)
 * 2. Right Identity: m.chain(of) = m
 * 3. Associativity: m.chain(f).chain(g) = m.chain(x => f(x).chain(g))
 * 
 * Purity Laws:
 * 1. Effect Consistency: effect is consistent across all operations
 * 2. Runtime Marker Law: runtime markers match compile-time effects
 * 3. Default Purity: types default to Pure unless explicitly configured
 * 
 * HKT Integration Laws:
 * 1. Kind Correctness: HKT kinds are correctly typed
 * 2. Apply Law: Apply<HKT, [A]> works correctly
 * 3. Typeclass Law: typeclasses work with generated HKTs
 */ 