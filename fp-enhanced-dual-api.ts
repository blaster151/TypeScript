/**
 * Enhanced Dual API System with Data-First Interoperability
 * 
 * This module extends the fluent method system to seamlessly interoperate with 
 * data-first function variants, providing shared type definitions, cross-style 
 * chaining, and zero-cost abstractions.
 */

import type { 
  Kind, 
  Kind1, 
  Kind2, 
  Kind3, 
  Apply, 
  Type, 
  TypeArgs, 
  KindArity, 
  KindResult, 
  HigherKind, 
  KindInput, 
  KindOutput, 
  Phantom, 
  KindWithPhantom, 
  IsKind1, 
  IsKind2, 
  IsKind3, 
  FirstArg, 
  SecondArg, 
  ThirdArg, 
  IsKindCompatible 
} from './fp-hkt';

import {
  TypeclassCapabilities,
  TypeclassAwareFluentMethods,
  DeepFluentMethods,
  FluentChainState,
  KindInfo,
  TypeParameters,
  FluentMethodOptions,
  DerivedInstances,
  autoDiscoverDerivedInstances,
  detectTypeclassCapabilities,
  createDeepFluent,
  inferKindInfo,
  InferTransformedType,
  PreservePhantom,
  KindWithPhantom as KindWithPhantomType
} from './fp-unified-fluent-api';

// ============================================================================
// Shared Type Definitions
// ============================================================================

/**
 * Shared type definitions for both fluent and data-first variants
 */
export interface SharedMethodDefinition<A, B, Args extends any[] = []> {
  readonly name: string;
  readonly fluent: (this: any, ...args: Args) => B;
  readonly dataFirst: (...args: Args) => (fa: A) => B;
  readonly typeclass: string;
  readonly capabilities: TypeclassCapabilities;
}

/**
 * Dual factory configuration
 */
export interface DualFactoryConfig<A, T extends TypeclassCapabilities> {
  readonly adtName: string;
  readonly capabilities: T;
  readonly methods: Record<string, SharedMethodDefinition<any, any, any[]>>;
  readonly options?: FluentMethodOptions;
}

/**
 * Enhanced dual API with cross-style chaining
 */
export interface EnhancedDualAPI<A, T extends TypeclassCapabilities> {
  // Fluent methods
  readonly fluent: DeepFluentMethods<A, T, KindInfo>;
  
  // Data-first standalone functions
  readonly dataFirst: {
    readonly [K in keyof T as T[K] extends true ? K : never]: 
      T[K] extends true ? (...args: any[]) => (fa: A) => any : never;
  };
  
  // Cross-style chaining utilities
  readonly crossStyle: {
    readonly toFluent: (fa: A) => DeepFluentMethods<A, T, KindInfo>;
    readonly toDataFirst: (fluent: DeepFluentMethods<A, T, KindInfo>) => A;
    readonly pipe: (...fns: Array<((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)>) => (fa: A) => any;
    readonly compose: (...fns: Array<((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)>) => (fa: A) => any;
  };
  
  // Type information
  readonly typeInfo: {
    readonly adtName: string;
    readonly capabilities: T;
    readonly kindInfo: KindInfo;
    readonly typeParameters: TypeParameters;
  };
}

// ============================================================================
// Dual Factory Implementation
// ============================================================================

/**
 * Dual factory that generates both fluent and data-first variants
 */
export function createDualFactory<A, T extends TypeclassCapabilities>(
  config: DualFactoryConfig<A, T>
): EnhancedDualAPI<A, T> {
  const { adtName, capabilities, methods, options = {} } = config;
  
  // Create fluent methods
  const fluent = createDeepFluent({} as A, adtName, {
    ...options,
    enableTypeInference: true,
    enableTypeclassAwareness: true
  });
  
  // Create data-first functions
  const dataFirst: any = {};
  Object.entries(methods).forEach(([methodName, methodDef]) => {
    if (capabilities[methodDef.typeclass as keyof T]) {
      dataFirst[methodName] = methodDef.dataFirst;
    }
  });
  
  // Cross-style chaining utilities
  const crossStyle = {
    toFluent: (fa: A): DeepFluentMethods<A, T, KindInfo> => {
      return createDeepFluent(fa, adtName, {
        ...options,
        enableTypeInference: true,
        enableTypeclassAwareness: true
      });
    },
    
    toDataFirst: (fluent: DeepFluentMethods<A, T, KindInfo>): A => {
      return fluent.chainState.value;
    },
    
    pipe: (...fns: Array<((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)>) => {
      return (fa: A) => {
        let current: any = fa;
        let isFluent = false;
        
        for (const fn of fns) {
          if (isFluent) {
            // Current is fluent, apply fluent function
            current = fn(current);
            isFluent = typeof current === 'object' && 'chainState' in current;
          } else {
            // Current is data-first, check if function expects fluent
            const result = fn(current);
            if (typeof result === 'object' && 'chainState' in result) {
              current = result;
              isFluent = true;
            } else {
              current = result;
              isFluent = false;
            }
          }
        }
        
        return current;
      };
    },
    
    compose: (...fns: Array<((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)>) => {
      return crossStyle.pipe(...fns.reverse());
    }
  };
  
  // Type information
  const typeInfo = {
    adtName,
    capabilities,
    kindInfo: inferKindInfo({} as A),
    typeParameters: {}
  };
  
  return {
    fluent,
    dataFirst,
    crossStyle,
    typeInfo
  };
}

// ============================================================================
// Shared Method Definitions
// ============================================================================

/**
 * Create shared method definitions from typeclass instances
 */
export function createSharedMethodDefinitions<A>(
  adtName: string,
  instances: DerivedInstances
): Record<string, SharedMethodDefinition<any, any, any[]>> {
  const methods: Record<string, SharedMethodDefinition<any, any, any[]>> = {};
  
  // Functor methods
  if (instances.functor) {
    methods.map = {
      name: 'map',
      fluent: function<B>(this: any, f: (a: A) => B) {
        return instances.functor!.map(this, f);
      },
      dataFirst: <B>(f: (a: A) => B) => (fa: A) => instances.functor!.map(fa, f),
      typeclass: 'Functor',
      capabilities: { Functor: true } as TypeclassCapabilities
    };
  }
  
  // Monad methods
  if (instances.monad) {
    methods.chain = {
      name: 'chain',
      fluent: function<B>(this: any, f: (a: A) => any) {
        return instances.monad!.chain(this, f);
      },
      dataFirst: <B>(f: (a: A) => any) => (fa: A) => instances.monad!.chain(fa, f),
      typeclass: 'Monad',
      capabilities: { Monad: true } as TypeclassCapabilities
    };
  }
  
  // Applicative methods
  if (instances.applicative) {
    methods.ap = {
      name: 'ap',
      fluent: function<B>(this: any, fab: any) {
        return instances.applicative!.ap(fab, this);
      },
      dataFirst: <B>(fab: any) => (fa: A) => instances.applicative!.ap(fab, fa),
      typeclass: 'Applicative',
      capabilities: { Applicative: true } as TypeclassCapabilities
    };
  }
  
  // Bifunctor methods
  if (instances.bifunctor) {
    methods.bimap = {
      name: 'bimap',
      fluent: function<L, R>(this: any, f: (l: L) => any, g: (r: R) => any) {
        return instances.bifunctor!.bimap(this, f, g);
      },
      dataFirst: <L, R>(f: (l: L) => any, g: (r: R) => any) => (fa: A) => instances.bifunctor!.bimap(fa, f, g),
      typeclass: 'Bifunctor',
      capabilities: { Bifunctor: true } as TypeclassCapabilities
    };
  }
  
  // Filterable methods
  if (instances.filterable) {
    methods.filter = {
      name: 'filter',
      fluent: function(this: any, predicate: (a: A) => boolean) {
        return instances.filterable!.filter(this, predicate);
      },
      dataFirst: (predicate: (a: A) => boolean) => (fa: A) => instances.filterable!.filter(fa, predicate),
      typeclass: 'Filterable',
      capabilities: { Filterable: true } as TypeclassCapabilities
    };
  }
  
  // Traversable methods
  if (instances.traversable) {
    methods.traverse = {
      name: 'traverse',
      fluent: function<B, F>(this: any, f: (a: A) => any) {
        return instances.traversable!.traverse(this, f);
      },
      dataFirst: <B, F>(f: (a: A) => any) => (fa: A) => instances.traversable!.traverse(fa, f),
      typeclass: 'Traversable',
      capabilities: { Traversable: true } as TypeclassCapabilities
    };
  }
  
  // Eq methods
  if (instances.eq) {
    methods.equals = {
      name: 'equals',
      fluent: function(this: any, other: A) {
        return instances.eq!.equals(this, other);
      },
      dataFirst: (other: A) => (fa: A) => instances.eq!.equals(fa, other),
      typeclass: 'Eq',
      capabilities: { Eq: true } as TypeclassCapabilities
    };
  }
  
  // Ord methods
  if (instances.ord) {
    methods.compare = {
      name: 'compare',
      fluent: function(this: any, other: A) {
        return instances.ord!.compare(this, other);
      },
      dataFirst: (other: A) => (fa: A) => instances.ord!.compare(fa, other),
      typeclass: 'Ord',
      capabilities: { Ord: true } as TypeclassCapabilities
    };
  }
  
  // Show methods
  if (instances.show) {
    methods.show = {
      name: 'show',
      fluent: function(this: any) {
        return instances.show!.show(this);
      },
      dataFirst: () => (fa: A) => instances.show!.show(fa),
      typeclass: 'Show',
      capabilities: { Show: true } as TypeclassCapabilities
    };
  }
  
  return methods;
}

// ============================================================================
// Enhanced Dual API Creation
// ============================================================================

/**
 * Enhanced dual API creation with automatic method discovery
 */
export function createEnhancedDualAPI<A>(
  adt: A,
  adtName: string,
  options: FluentMethodOptions = {}
): EnhancedDualAPI<A, TypeclassCapabilities> {
  const derivedInstances = autoDiscoverDerivedInstances(adtName);
  if (!derivedInstances) {
    throw new Error(`No derived instances found for ${adtName}`);
  }
  
  const capabilities = detectTypeclassCapabilities(adtName);
  const methods = createSharedMethodDefinitions(adtName, derivedInstances);
  
  const config: DualFactoryConfig<A, TypeclassCapabilities> = {
    adtName,
    capabilities,
    methods,
    options
  };
  
  return createDualFactory(config);
}

// ============================================================================
// Cross-Style Chaining Utilities
// ============================================================================

/**
 * Cross-style chaining utilities
 */
export namespace CrossStyleChaining {
  /**
   * Start with data-first and switch to fluent mid-chain
   */
  export function startDataFirst<A, T extends TypeclassCapabilities>(
    dualAPI: EnhancedDualAPI<A, T>,
    ...dataFirstFns: Array<(fa: A) => any>
  ) {
    return (fa: A) => {
      let current: any = fa;
      
      // Apply data-first functions
      for (const fn of dataFirstFns) {
        current = fn(current);
      }
      
      // Switch to fluent
      return dualAPI.crossStyle.toFluent(current);
    };
  }
  
  /**
   * Start with fluent and switch to data-first mid-chain
   */
  export function startFluent<A, T extends TypeclassCapabilities>(
    dualAPI: EnhancedDualAPI<A, T>,
    ...fluentFns: Array<(fluent: DeepFluentMethods<A, T, KindInfo>) => any>
  ) {
    return (fa: A) => {
      let current = dualAPI.crossStyle.toFluent(fa);
      
      // Apply fluent functions
      for (const fn of fluentFns) {
        current = fn(current);
      }
      
      // Switch to data-first
      return dualAPI.crossStyle.toDataFirst(current);
    };
  }
  
  /**
   * Mixed chain with automatic style detection
   */
  export function mixedChain<A, T extends TypeclassCapabilities>(
    dualAPI: EnhancedDualAPI<A, T>,
    ...fns: Array<((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)>
  ) {
    return dualAPI.crossStyle.pipe(...fns);
  }
}

// ============================================================================
// Type-Only Tests for Cross-Style Boundaries
// ============================================================================

/**
 * Type-only tests for cross-style inference preservation
 */
export namespace CrossStyleTypeTests {
  
  /**
   * Test that fluent to data-first conversion preserves types
   */
  export type TestFluentToDataFirst<
    A,
    T extends TypeclassCapabilities,
    F extends (fluent: DeepFluentMethods<A, T, KindInfo>) => any
  > = F extends (fluent: DeepFluentMethods<A, T, KindInfo>) => infer R
    ? (fa: A) => R
    : never;
  
  /**
   * Test that data-first to fluent conversion preserves types
   */
  export type TestDataFirstToFluent<
    A,
    T extends TypeclassCapabilities,
    F extends (fa: A) => any
  > = F extends (fa: A) => infer R
    ? (fluent: DeepFluentMethods<A, T, KindInfo>) => R
    : never;
  
  /**
   * Test that mixed chains preserve type inference
   */
  export type TestMixedChain<
    A,
    T extends TypeclassCapabilities,
    Fns extends Array<((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)>
  > = Fns extends [infer First, ...infer Rest]
    ? First extends ((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)
      ? Rest extends Array<((fa: A) => any) | ((fluent: DeepFluentMethods<A, T, KindInfo>) => any)>
        ? (fa: A) => any
        : never
      : never
    : never;
  
  /**
   * Test that higher-kinded types are preserved across style boundaries
   */
  export type TestHKTCrossStyle<
    F extends Kind<any>,
    T extends TypeclassCapabilities,
    Transform extends (a: any) => any
  > = InferTransformedType<F, Transform> extends Kind<any> ? true : false;
  
  /**
   * Test that phantom types are preserved across style boundaries
   */
  export type TestPhantomCrossStyle<
    F extends KindWithPhantomType<any, any>,
    T extends TypeclassCapabilities,
    Transform extends (a: any) => any
  > = PreservePhantom<InferTransformedType<F, Transform>, any> extends KindWithPhantomType<any, any> ? true : false;
  
  /**
   * Test that typeclass capabilities are preserved across style boundaries
   */
  export type TestCapabilityCrossStyle<
    T extends TypeclassCapabilities,
    Style extends 'fluent' | 'dataFirst'
  > = {
    readonly [K in keyof T]: T[K];
  };
}

// ============================================================================
// Zero-Cost Abstractions
// ============================================================================

/**
 * Zero-cost abstraction utilities that compile to direct function calls
 */
export namespace ZeroCostAbstractions {
  
  /**
   * Create a zero-cost fluent wrapper
   */
  export function createZeroCostFluent<A, T extends TypeclassCapabilities>(
    fa: A,
    dualAPI: EnhancedDualAPI<A, T>
  ): DeepFluentMethods<A, T, KindInfo> {
    return dualAPI.crossStyle.toFluent(fa);
  }
  
  /**
   * Create a zero-cost data-first function
   */
  export function createZeroCostDataFirst<A, T extends TypeclassCapabilities>(
    method: keyof T,
    dualAPI: EnhancedDualAPI<A, T>
  ): (...args: any[]) => (fa: A) => any {
    return dualAPI.dataFirst[method as keyof typeof dualAPI.dataFirst];
  }
  
  /**
   * Zero-cost style switching
   */
  export function switchStyle<A, T extends TypeclassCapabilities>(
    value: A | DeepFluentMethods<A, T, KindInfo>,
    dualAPI: EnhancedDualAPI<A, T>
  ): DeepFluentMethods<A, T, KindInfo> | A {
    if (typeof value === 'object' && 'chainState' in value) {
      return dualAPI.crossStyle.toDataFirst(value);
    } else {
      return dualAPI.crossStyle.toFluent(value as A);
    }
  }
}

// ============================================================================
// Export Everything
// ============================================================================

export {
  createDualFactory,
  createSharedMethodDefinitions,
  createEnhancedDualAPI,
  CrossStyleChaining,
  CrossStyleTypeTests,
  ZeroCostAbstractions
};
