/**
 * Enhanced ADT Builders with Pattern Guards
 * 
 * This module extends the ADT builder system to include pattern guard support,
 * providing seamless integration of conditional matching clauses.
 */

import {
  createSumType as baseCreateSumType,
  createProductType as baseCreateProductType,
  EnhancedSumTypeBuilder,
  EnhancedProductTypeBuilder,
  EnhancedADTInstance,
  EnhancedProductTypeInstance,
  ConstructorSpec,
  ProductFields,
  SumTypeConfig,
  ProductTypeConfig
} from './fp-adt-builders-enhanced';

import {
  GuardedMatchHandlers,
  GuardedTagOnlyHandlers,
  GuardedADTInstance,
  matchWithGuards,
  matchTagWithGuards,
  withGuards,
  guard,
  guards,
  guardWithFallback,
  Guards
} from './fp-pattern-guards';

// ============================================================================
// Part 1: Enhanced ADT Instance with Guards
// ============================================================================

/**
 * Enhanced ADT instance with built-in pattern guard support
 */
export interface ADTInstanceWithGuards<Spec extends ConstructorSpec> 
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
// Part 2: Enhanced Sum Type Builder with Guards
// ============================================================================

/**
 * Enhanced sum type builder with pattern guard support
 */
export interface SumTypeBuilderWithGuards<Spec extends ConstructorSpec> 
  extends EnhancedSumTypeBuilder<Spec> {
  
  /**
   * Create an instance with pattern guard support
   */
  createWithGuards<K extends keyof Spec>(
    tag: K,
    payload?: ReturnType<Spec[K]>
  ): ADTInstanceWithGuards<Spec>;
  
  /**
   * Pattern match with guard support
   */
  matchWithGuards<Result>(
    instance: ADTInstanceWithGuards<Spec>,
    handlers: GuardedMatchHandlers<Spec, Result>
  ): Result;
  
  /**
   * Tag-only pattern match with guard support
   */
  matchTagWithGuards<Result>(
    instance: ADTInstanceWithGuards<Spec>,
    handlers: GuardedTagOnlyHandlers<Spec, Result>
  ): Result;
}

/**
 * Create a sum type with pattern guard support
 */
export function createSumTypeWithGuards<Spec extends ConstructorSpec>(
  spec: Spec,
  config: SumTypeConfig = {}
): SumTypeBuilderWithGuards<Spec> {
  // Create the base enhanced sum type
  const baseBuilder = baseCreateSumType(spec, config);
  
  // Create the enhanced instance class with guards
  class ADTWithGuards implements ADTInstanceWithGuards<Spec> {
    readonly tag: keyof Spec;
    readonly payload: any;
    
    constructor(tag: keyof Spec, payload?: any) {
      this.tag = tag;
      this.payload = payload;
      Object.freeze(this); // Make immutable
    }
    
    // Standard match methods
    match<Result>(handlers: any): Result {
      return baseBuilder.match(this, handlers);
    }
    
    matchTag<Result>(handlers: any): Result {
      return baseBuilder.matchTag(this, handlers);
    }
    
    // Guard-enabled match methods
    matchWithGuards<Result>(handlers: GuardedMatchHandlers<Spec, Result>): Result {
      return matchWithGuards(this, handlers);
    }
    
    matchTagWithGuards<Result>(handlers: GuardedTagOnlyHandlers<Spec, Result>): Result {
      return matchTagWithGuards(this, handlers);
    }
    
    is<K extends keyof Spec>(tag: K): this is ADTInstanceWithGuards<Spec> & {
      tag: K;
      payload: ReturnType<Spec[K]>;
    } {
      return this.tag === tag;
    }
    
    getPayload(): any {
      return this.payload;
    }
    
    getTag(): keyof Spec {
      return this.tag;
    }
  }
  
  // Enhanced builder with guard support
  const enhancedBuilder: SumTypeBuilderWithGuards<Spec> = {
    ...baseBuilder,
    
    createWithGuards<K extends keyof Spec>(
      tag: K,
      payload?: ReturnType<Spec[K]>
    ): ADTInstanceWithGuards<Spec> {
      return new ADTWithGuards(tag, payload);
    },
    
    matchWithGuards<Result>(
      instance: ADTInstanceWithGuards<Spec>,
      handlers: GuardedMatchHandlers<Spec, Result>
    ): Result {
      return instance.matchWithGuards(handlers);
    },
    
    matchTagWithGuards<Result>(
      instance: ADTInstanceWithGuards<Spec>,
      handlers: GuardedTagOnlyHandlers<Spec, Result>
    ): Result {
      return instance.matchTagWithGuards(handlers);
    }
  };
  
  return enhancedBuilder;
}

// ============================================================================
// Part 3: Enhanced Product Type Builder with Guards
// ============================================================================

/**
 * Enhanced product type builder with pattern guard support
 */
export interface ProductTypeBuilderWithGuards<Fields extends ProductFields> 
  extends EnhancedProductTypeBuilder<Fields> {
  
  /**
   * Create an instance with pattern guard support
   */
  createWithGuards(fields: Fields): ProductTypeInstanceWithGuards<Fields>;
  
  /**
   * Pattern match with guard support
   */
  matchWithGuards<Result>(
    instance: ProductTypeInstanceWithGuards<Fields>,
    handlers: {
      Product: (fields: Fields) => Result;
      guards?: GuardedHandler<Fields, Result>[];
      fallback?: (fields: Fields) => Result;
    }
  ): Result;
}

/**
 * Enhanced product type instance with pattern guard support
 */
export interface ProductTypeInstanceWithGuards<Fields extends ProductFields> 
  extends EnhancedProductTypeInstance<Fields> {
  
  /**
   * Pattern match with guard support
   */
  matchWithGuards<Result>(
    handlers: {
      Product: (fields: Fields) => Result;
      guards?: GuardedHandler<Fields, Result>[];
      fallback?: (fields: Fields) => Result;
    }
  ): Result;
}

/**
 * Create a product type with pattern guard support
 */
export function createProductTypeWithGuards<Fields extends ProductFields>(
  config: ProductTypeConfig = {}
): ProductTypeBuilderWithGuards<Fields> {
  // Create the base enhanced product type
  const baseBuilder = baseCreateProductType(config);
  
  // Create the enhanced instance class with guards
  class ProductWithGuards implements ProductTypeInstanceWithGuards<Fields> {
    readonly fields: Fields;
    
    constructor(fields: Fields) {
      this.fields = Object.freeze({ ...fields }); // Make immutable
    }
    
    // Standard match method
    match<Result>(
      handlers: {
        Product: (fields: Fields) => Result;
        _?: (fields: Fields) => Result;
        otherwise?: (fields: Fields) => Result;
      }
    ): Result {
      return baseBuilder.match(this, handlers);
    }
    
    // Guard-enabled match method
    matchWithGuards<Result>(
      handlers: {
        Product: (fields: Fields) => Result;
        guards?: GuardedHandler<Fields, Result>[];
        fallback?: (fields: Fields) => Result;
      }
    ): Result {
      const { guards: guardHandlers, fallback } = handlers;
      
      // Try guards first
      if (guardHandlers) {
        for (const { condition, handler } of guardHandlers) {
          if (condition(this.fields)) {
            return handler(this.fields);
          }
        }
      }
      
      // Try fallback
      if (fallback) {
        return fallback(this.fields);
      }
      
      // Use default Product handler
      return handlers.Product(this.fields);
    }
    
    get<K extends keyof Fields>(key: K): Fields[K] {
      return this.fields[key];
    }
    
    getFields(): Fields {
      return this.fields;
    }
  }
  
  // Enhanced builder with guard support
  const enhancedBuilder: ProductTypeBuilderWithGuards<Fields> = {
    ...baseBuilder,
    
    createWithGuards(fields: Fields): ProductTypeInstanceWithGuards<Fields> {
      return new ProductWithGuards(fields);
    },
    
    matchWithGuards<Result>(
      instance: ProductTypeInstanceWithGuards<Fields>,
      handlers: {
        Product: (fields: Fields) => Result;
        guards?: GuardedHandler<Fields, Result>[];
        fallback?: (fields: Fields) => Result;
      }
    ): Result {
      return instance.matchWithGuards(handlers);
    }
  };
  
  return enhancedBuilder;
}

// ============================================================================
// Part 4: Pre-built ADTs with Guard Support
// ============================================================================

/**
 * Maybe ADT with pattern guard support
 */
export const MaybeWithGuards = createSumTypeWithGuards({
  Just: <A>(value: A) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true
});

/**
 * Either ADT with pattern guard support
 */
export const EitherWithGuards = createSumTypeWithGuards({
  Left: <L>(value: L) => ({ value }),
  Right: <R>(value: R) => ({ value })
}, {
  name: 'Either',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true
});

/**
 * Result ADT with pattern guard support
 */
export const ResultWithGuards = createSumTypeWithGuards({
  Ok: <T>(value: T) => ({ value }),
  Err: <E>(error: E) => ({ error })
}, {
  name: 'Result',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true
});

// ============================================================================
// Part 5: Convenience Constructors
// ============================================================================

/**
 * Maybe constructors with guard support
 */
export const MaybeGuarded = {
  Just: <A>(value: A) => MaybeWithGuards.createWithGuards('Just', { value }),
  Nothing: () => MaybeWithGuards.createWithGuards('Nothing', {})
};

/**
 * Either constructors with guard support
 */
export const EitherGuarded = {
  Left: <L>(value: L) => EitherWithGuards.createWithGuards('Left', { value }),
  Right: <R>(value: R) => EitherWithGuards.createWithGuards('Right', { value })
};

/**
 * Result constructors with guard support
 */
export const ResultGuarded = {
  Ok: <T>(value: T) => ResultWithGuards.createWithGuards('Ok', { value }),
  Err: <E>(error: E) => ResultWithGuards.createWithGuards('Err', { error })
};

// ============================================================================
// Part 6: Reusable Matchers with Guards
// ============================================================================

/**
 * Create a reusable Maybe matcher with guards
 */
export function createMaybeGuardedMatcher<A, Result>(
  handlers: GuardedMatchHandlers<{
    Just: { value: A };
    Nothing: {};
  }, Result>
) {
  return (maybe: ADTInstanceWithGuards<{
    Just: { value: A };
    Nothing: {};
  }>) => maybe.matchWithGuards(handlers);
}

/**
 * Create a reusable Either matcher with guards
 */
export function createEitherGuardedMatcher<L, R, Result>(
  handlers: GuardedMatchHandlers<{
    Left: { value: L };
    Right: { value: R };
  }, Result>
) {
  return (either: ADTInstanceWithGuards<{
    Left: { value: L };
    Right: { value: R };
  }>) => either.matchWithGuards(handlers);
}

/**
 * Create a reusable Result matcher with guards
 */
export function createResultGuardedMatcher<T, E, Result>(
  handlers: GuardedMatchHandlers<{
    Ok: { value: T };
    Err: { error: E };
  }, Result>
) {
  return (result: ADTInstanceWithGuards<{
    Ok: { value: T };
    Err: { error: E };
  }>) => result.matchWithGuards(handlers);
}

// ============================================================================
// Part 7: Type Utilities
// ============================================================================

/**
 * Extract ADT instance type from builder with guards
 */
export type ExtractADTInstanceWithGuards<Builder> = 
  Builder extends SumTypeBuilderWithGuards<infer Spec> 
    ? ADTInstanceWithGuards<Spec> 
    : never;

/**
 * Extract product instance type from builder with guards
 */
export type ExtractProductInstanceWithGuards<Builder> = 
  Builder extends ProductTypeBuilderWithGuards<infer Fields> 
    ? ProductTypeInstanceWithGuards<Fields> 
    : never;

// ============================================================================
// Part 8: Export Everything
// ============================================================================

export {
  // Core guard functionality
  guard,
  guards,
  guardWithFallback,
  Guards,
  
  // Guard matching functions
  matchWithGuards,
  matchTagWithGuards,
  withGuards,
  
  // Guard composition
  and,
  or,
  not,
  
  // Data-last functions
  matchWithGuardsDataLast,
  matchTagWithGuardsDataLast,
  
  // Reusable matchers
  createGuardedMatcher,
  createGuardedTagMatcher,
  
  // Type utilities
  ExtractGuardedResult,
  ExtractGuardedTagResult,
  IsGuardedExhaustive,
  HasGuardedFallback
}; 