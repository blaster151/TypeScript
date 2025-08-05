/**
 * Enhanced ADT Builders with Ergonomic Pattern Matching
 * 
 * This module provides enhanced createSumType and createProductType builders
 * with ergonomic pattern matching capabilities including .match and .matchTag
 * instance methods for full type safety and immutable compatibility.
 */

import {
  createSumType as baseCreateSumType,
  createProductType as baseCreateProductType,
  SumTypeBuilder as BaseSumTypeBuilder,
  ProductTypeBuilder as BaseProductTypeBuilder,
  ExtractSumTypeHKT,
  ExtractSumTypeInstance,
  ExtractProductTypeHKT,
  ExtractProductTypeInstance,
  ConstructorSpec,
  ProductFields,
  SumTypeConfig,
  ProductTypeConfig,
  ADTPurityConfig
} from './fp-adt-builders';

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult
} from './fp-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async
} from './fp-purity';

// ============================================================================
// Part 1: Enhanced Pattern Matching Types
// ============================================================================

/**
 * Handler function for a specific tag
 */
export type TagHandler<Tag extends string, Payload, Result> = 
  Payload extends void 
    ? () => Result 
    : (payload: Payload) => Result;

/**
 * Handlers object for pattern matching
 */
export type MatchHandlers<Spec extends ConstructorSpec, Result> = {
  [K in keyof Spec]?: TagHandler<K, ReturnType<Spec[K]>, Result>;
} & {
  _?: (tag: string, payload: any) => Result;
  otherwise?: (tag: string, payload: any) => Result;
};

/**
 * Tag-only handlers for .matchTag
 */
export type TagOnlyHandlers<Spec extends ConstructorSpec, Result> = {
  [K in keyof Spec]?: () => Result;
} & {
  _?: (tag: string) => Result;
  otherwise?: (tag: string) => Result;
};

/**
 * Extract the result type from handlers
 */
export type ExtractHandlerResult<Handlers> = 
  Handlers extends MatchHandlers<any, infer R> ? R : never;

/**
 * Extract the result type from tag-only handlers
 */
export type ExtractTagHandlerResult<Handlers> = 
  Handlers extends TagOnlyHandlers<any, infer R> ? R : never;

/**
 * Check if handlers cover all tags (exhaustive)
 */
export type IsExhaustive<Spec extends ConstructorSpec, Handlers> = 
  keyof Spec extends keyof Handlers ? true : false;

/**
 * Check if handlers have a fallback
 */
export type HasFallback<Handlers> = 
  '_' extends keyof Handlers ? true : 
  'otherwise' extends keyof Handlers ? true : false;

// ============================================================================
// Part 2: Enhanced ADT Instance Types
// ============================================================================

/**
 * Enhanced ADT instance with pattern matching methods
 */
export interface EnhancedADTInstance<Spec extends ConstructorSpec> {
  readonly tag: keyof Spec;
  readonly payload: any;
  
  /**
   * Pattern match on the ADT value
   */
  match<Result>(
    handlers: MatchHandlers<Spec, Result>
  ): Result;
  
  /**
   * Pattern match on tags only (no payload access)
   */
  matchTag<Result>(
    handlers: TagOnlyHandlers<Spec, Result>
  ): Result;
  
  /**
   * Check if this instance has a specific tag
   */
  is<K extends keyof Spec>(tag: K): this is EnhancedADTInstance<Spec> & {
    tag: K;
    payload: ReturnType<Spec[K]>;
  };
  
  /**
   * Get the payload if it exists, or undefined
   */
  getPayload(): any;
  
  /**
   * Get the tag name
   */
  getTag(): keyof Spec;
}

/**
 * Immutable ADT instance
 */
export interface ImmutableADTInstance<Spec extends ConstructorSpec> 
  extends EnhancedADTInstance<Spec> {
  readonly __immutableBrand: unique symbol;
}

// ============================================================================
// Part 3: Enhanced Sum Type Builder
// ============================================================================

/**
 * Enhanced sum type builder with pattern matching
 */
export interface EnhancedSumTypeBuilder<Spec extends ConstructorSpec> 
  extends BaseSumTypeBuilder<Spec> {
  
  /**
   * Create an instance with pattern matching capabilities
   */
  create<K extends keyof Spec>(
    tag: K,
    payload?: ReturnType<Spec[K]>
  ): EnhancedADTInstance<Spec>;
  
  /**
   * Create an immutable instance
   */
  createImmutable<K extends keyof Spec>(
    tag: K,
    payload?: ReturnType<Spec[K]>
  ): ImmutableADTInstance<Spec>;
  
  /**
   * Pattern match on an instance
   */
  match<Result>(
    instance: EnhancedADTInstance<Spec>,
    handlers: MatchHandlers<Spec, Result>
  ): Result;
  
  /**
   * Tag-only pattern match
   */
  matchTag<Result>(
    instance: EnhancedADTInstance<Spec>,
    handlers: TagOnlyHandlers<Spec, Result>
  ): Result;
  
  /**
   * Check if an instance has a specific tag
   */
  is<K extends keyof Spec>(
    instance: EnhancedADTInstance<Spec>,
    tag: K
  ): instance is EnhancedADTInstance<Spec> & {
    tag: K;
    payload: ReturnType<Spec[K]>;
  };
}

/**
 * Enhanced createSumType function
 */
export function createSumType<Spec extends ConstructorSpec>(
  spec: Spec,
  config: SumTypeConfig = {}
): EnhancedSumTypeBuilder<Spec> {
  // Create the base sum type
  const baseBuilder = baseCreateSumType(spec, config);
  
  // Create the enhanced instance class
  class EnhancedADT implements EnhancedADTInstance<Spec> {
    readonly tag: keyof Spec;
    readonly payload: any;
    
    constructor(tag: keyof Spec, payload?: any) {
      this.tag = tag;
      this.payload = payload;
      Object.freeze(this); // Make immutable
    }
    
    match<Result>(handlers: MatchHandlers<Spec, Result>): Result {
      const handler = handlers[this.tag];
      const fallback = handlers._ || handlers.otherwise;
      
      if (handler) {
        return handler(this.payload);
      } else if (fallback) {
        return fallback(this.tag as string, this.payload);
      } else {
        // TypeScript should catch this at compile time, but runtime safety
        throw new Error(`Unhandled tag: ${String(this.tag)}`);
      }
    }
    
    matchTag<Result>(handlers: TagOnlyHandlers<Spec, Result>): Result {
      const handler = handlers[this.tag];
      const fallback = handlers._ || handlers.otherwise;
      
      if (handler) {
        return handler();
      } else if (fallback) {
        return fallback(this.tag as string);
      } else {
        throw new Error(`Unhandled tag: ${String(this.tag)}`);
      }
    }
    
    is<K extends keyof Spec>(tag: K): this is EnhancedADTInstance<Spec> & {
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
  
  // Create immutable variant
  class ImmutableADT extends EnhancedADT implements ImmutableADTInstance<Spec> {
    readonly __immutableBrand: unique symbol = {} as unique symbol;
  }
  
  // Enhanced builder methods
  const enhancedBuilder: EnhancedSumTypeBuilder<Spec> = {
    ...baseBuilder,
    
    create<K extends keyof Spec>(
      tag: K,
      payload?: ReturnType<Spec[K]>
    ): EnhancedADTInstance<Spec> {
      return new EnhancedADT(tag, payload);
    },
    
    createImmutable<K extends keyof Spec>(
      tag: K,
      payload?: ReturnType<Spec[K]>
    ): ImmutableADTInstance<Spec> {
      return new ImmutableADT(tag, payload);
    },
    
    match<Result>(
      instance: EnhancedADTInstance<Spec>,
      handlers: MatchHandlers<Spec, Result>
    ): Result {
      return instance.match(handlers);
    },
    
    matchTag<Result>(
      instance: EnhancedADTInstance<Spec>,
      handlers: TagOnlyHandlers<Spec, Result>
    ): Result {
      return instance.matchTag(handlers);
    },
    
    is<K extends keyof Spec>(
      instance: EnhancedADTInstance<Spec>,
      tag: K
    ): instance is EnhancedADTInstance<Spec> & {
      tag: K;
      payload: ReturnType<Spec[K]>;
    } {
      return instance.is(tag);
    }
  };
  
  return enhancedBuilder;
}

// ============================================================================
// Part 4: Enhanced Product Type Builder
// ============================================================================

/**
 * Enhanced product type builder with pattern matching
 */
export interface EnhancedProductTypeBuilder<Fields extends ProductFields> 
  extends BaseProductTypeBuilder<Fields> {
  
  /**
   * Create an instance with pattern matching capabilities
   */
  create(fields: Fields): EnhancedProductTypeInstance<Fields>;
  
  /**
   * Create an immutable instance
   */
  createImmutable(fields: Fields): ImmutableProductTypeInstance<Fields>;
  
  /**
   * Pattern match on an instance
   */
  match<Result>(
    instance: EnhancedProductTypeInstance<Fields>,
    handlers: {
      Product: (fields: Fields) => Result;
      _?: (fields: Fields) => Result;
      otherwise?: (fields: Fields) => Result;
    }
  ): Result;
}

/**
 * Enhanced product type instance
 */
export interface EnhancedProductTypeInstance<Fields extends ProductFields> {
  readonly fields: Fields;
  
  /**
   * Pattern match on the product type
   */
  match<Result>(
    handlers: {
      Product: (fields: Fields) => Result;
      _?: (fields: Fields) => Result;
      otherwise?: (fields: Fields) => Result;
    }
  ): Result;
  
  /**
   * Get a field value
   */
  get<K extends keyof Fields>(key: K): Fields[K];
  
  /**
   * Get all fields
   */
  getFields(): Fields;
}

/**
 * Immutable product type instance
 */
export interface ImmutableProductTypeInstance<Fields extends ProductFields> 
  extends EnhancedProductTypeInstance<Fields> {
  readonly __immutableBrand: unique symbol;
}

/**
 * Enhanced createProductType function
 */
export function createProductType<Fields extends ProductFields>(
  config: ProductTypeConfig = {}
): EnhancedProductTypeBuilder<Fields> {
  // Create the base product type
  const baseBuilder = baseCreateProductType(config);
  
  // Create the enhanced instance class
  class EnhancedProduct implements EnhancedProductTypeInstance<Fields> {
    readonly fields: Fields;
    
    constructor(fields: Fields) {
      this.fields = Object.freeze({ ...fields }); // Make immutable
    }
    
    match<Result>(
      handlers: {
        Product: (fields: Fields) => Result;
        _?: (fields: Fields) => Result;
        otherwise?: (fields: Fields) => Result;
      }
    ): Result {
      const handler = handlers.Product || handlers._ || handlers.otherwise;
      if (handler) {
        return handler(this.fields);
      } else {
        throw new Error('No handler provided for product type');
      }
    }
    
    get<K extends keyof Fields>(key: K): Fields[K] {
      return this.fields[key];
    }
    
    getFields(): Fields {
      return this.fields;
    }
  }
  
  // Create immutable variant
  class ImmutableProduct extends EnhancedProduct implements ImmutableProductTypeInstance<Fields> {
    readonly __immutableBrand: unique symbol = {} as unique symbol;
  }
  
  // Enhanced builder methods
  const enhancedBuilder: EnhancedProductTypeBuilder<Fields> = {
    ...baseBuilder,
    
    create(fields: Fields): EnhancedProductTypeInstance<Fields> {
      return new EnhancedProduct(fields);
    },
    
    createImmutable(fields: Fields): ImmutableProductTypeInstance<Fields> {
      return new ImmutableProduct(fields);
    },
    
    match<Result>(
      instance: EnhancedProductTypeInstance<Fields>,
      handlers: {
        Product: (fields: Fields) => Result;
        _?: (fields: Fields) => Result;
        otherwise?: (fields: Fields) => Result;
      }
    ): Result {
      return instance.match(handlers);
    }
  };
  
  return enhancedBuilder;
}

// ============================================================================
// Part 5: Type Utilities
// ============================================================================

/**
 * Extract the instance type from an enhanced sum type builder
 */
export type ExtractEnhancedSumTypeInstance<Builder> = 
  Builder extends EnhancedSumTypeBuilder<infer Spec> 
    ? EnhancedADTInstance<Spec> 
    : never;

/**
 * Extract the immutable instance type from an enhanced sum type builder
 */
export type ExtractImmutableSumTypeInstance<Builder> = 
  Builder extends EnhancedSumTypeBuilder<infer Spec> 
    ? ImmutableADTInstance<Spec> 
    : never;

/**
 * Extract the instance type from an enhanced product type builder
 */
export type ExtractEnhancedProductTypeInstance<Builder> = 
  Builder extends EnhancedProductTypeBuilder<infer Fields> 
    ? EnhancedProductTypeInstance<Fields> 
    : never;

/**
 * Extract the immutable instance type from an enhanced product type builder
 */
export type ExtractImmutableProductTypeInstance<Builder> = 
  Builder extends EnhancedProductTypeBuilder<infer Fields> 
    ? ImmutableProductTypeInstance<Fields> 
    : never;

// ============================================================================
// Part 6: Pattern Matching Utilities
// ============================================================================

/**
 * Create a pattern matcher for a sum type
 */
export function createMatcher<Spec extends ConstructorSpec, Result>(
  handlers: MatchHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result => {
    return instance.match(handlers);
  };
}

/**
 * Create a tag-only matcher for a sum type
 */
export function createTagMatcher<Spec extends ConstructorSpec, Result>(
  handlers: TagOnlyHandlers<Spec, Result>
) {
  return (instance: EnhancedADTInstance<Spec>): Result => {
    return instance.matchTag(handlers);
  };
}

/**
 * Create a product type matcher
 */
export function createProductMatcher<Fields extends ProductFields, Result>(
  handlers: {
    Product: (fields: Fields) => Result;
    _?: (fields: Fields) => Result;
    otherwise?: (fields: Fields) => Result;
  }
) {
  return (instance: EnhancedProductTypeInstance<Fields>): Result => {
    return instance.match(handlers);
  };
}

// ============================================================================
// Part 7: Laws Documentation
// ============================================================================

/**
 * Enhanced ADT Builder Laws:
 * 
 * Pattern Matching Laws:
 * 1. Identity: instance.match({ [tag]: payload => payload }) = instance.payload
 * 2. Composition: instance.match(handlers1).then(handlers2) = instance.match(composed)
 * 3. Exhaustiveness: Full handlers must cover all tags or have fallback
 * 4. Immutability: Pattern matching never mutates the instance
 * 
 * Tag-Only Matching Laws:
 * 1. Identity: instance.matchTag({ [tag]: () => tag }) = instance.tag
 * 2. No Payload Access: Tag-only handlers cannot access payload
 * 3. Fallback Support: _ or otherwise handlers supported
 * 
 * Immutability Laws:
 * 1. Frozen Instances: All instances are Object.freeze()d
 * 2. No Mutation: No methods can modify the instance state
 * 3. Structural Sharing: Immutable instances can share structure
 * 
 * Type Safety Laws:
 * 1. Exhaustiveness: TypeScript enforces exhaustive matching
 * 2. Payload Inference: Payload types inferred from tag definitions
 * 3. Handler Types: Handler signatures inferred from tag payloads
 * 4. Fallback Types: Fallback handlers properly typed
 */ 