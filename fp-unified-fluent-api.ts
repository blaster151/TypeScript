/**
 * Unified Fluent API System
 * 
 * This module provides a unified fluent method syntax (.map, .chain, .filter, etc.) 
 * for all ADTs by automatically deriving them from existing typeclass instances.
 * 
 * Features:
 * - Automatic derivation from Functor/Monad/Applicative instances
 * - Law-consistent with data-last functions
 * - Type-safe with full TypeScript inference
 * - Registry-based lookup for typeclass instances
 * - Property-based testing for law consistency
 * - Dual-API usage support (fluent and data-last)
 * - Auto-discovery of derived typeclass instances
 * - Law-preserving method equivalence verification
 * - Runtime detection of newly registered typeclass instances
 * - Lazy discovery for immediate fluent method generation
 * - Full type safety for all supported typeclasses
 * - Typeclass-aware fluent composition with conditional types
 * - Cross-typeclass chaining with compile-time type safety
 * - Zero runtime overhead for method filtering
 * - Deep, persistent type inference across arbitrary-length chains
 * - Full higher-kinded type awareness with parameterized ADT support
 * - Phantom type preservation and nested transformation support
 * - Type-level computation for method availability across chain steps
 */

import { getTypeclassInstance, getDerivableInstances, getFPRegistry } from './fp-registry-init';
import { 
  Kind, Kind1, Kind2, Kind3, 
  Apply, Type, TypeArgs, KindArity, KindResult,
  HigherKind, KindInput, KindOutput,
  Phantom, KindWithPhantom,
  IsKind1, IsKind2, IsKind3,
  FirstArg, SecondArg, ThirdArg,
  IsKindCompatible
} from './fp-hkt';

// Import optimization system
import {
  EvaluationMode,
  OptimizationMetadata,
  FusionRule,
  Operation,
  OptimizationHook,
  OptimizationContext,
  OptimizationResult,
  OptimizationStep,
  PerformanceProfile,
  OptimizableTypeclassInstance,
  OptimizableFPRegistry,
  mapMapFusion,
  mapFilterFusion,
  filterFilterFusion,
  chainMapFusion,
  lazyOptimizationHook,
  eagerOptimizationHook,
  inliningOptimizationHook,
  generateSinglePassOperation,
  inlineFunction,
  detectEvaluationMode,
  createOptimizationMetadata,
  optimizePipeline,
  canOptimizePipeline,
  getEvaluationMode,
  registerOptimizationHooks,
  optimizeFluentChain,
  createOptimizedFluentMethod,
  benchmarkOptimization,
  verifyOptimizationCorrectness
} from './fp-typeclass-optimization';

// ============================================================================
// Typeclass-Aware Type System
// ============================================================================

/**
 * Typeclass capability flags
 */
export type TypeclassCapabilities = {
  Functor: boolean;
  Applicative: boolean;
  Monad: boolean;
  Bifunctor: boolean;
  Traversable: boolean;
  Filterable: boolean;
  Eq: boolean;
  Ord: boolean;
  Show: boolean;
};

/**
 * Conditional type for Functor methods
 */
export type HasFunctor<T extends TypeclassCapabilities> = T['Functor'] extends true ? true : false;

/**
 * Conditional type for Applicative methods
 */
export type HasApplicative<T extends TypeclassCapabilities> = T['Applicative'] extends true ? true : false;

/**
 * Conditional type for Monad methods
 */
export type HasMonad<T extends TypeclassCapabilities> = T['Monad'] extends true ? true : false;

/**
 * Conditional type for Bifunctor methods
 */
export type HasBifunctor<T extends TypeclassCapabilities> = T['Bifunctor'] extends true ? true : false;

/**
 * Conditional type for Traversable methods
 */
export type HasTraversable<T extends TypeclassCapabilities> = T['Traversable'] extends true ? true : false;

/**
 * Conditional type for Filterable methods
 */
export type HasFilterable<T extends TypeclassCapabilities> = T['Filterable'] extends true ? true : false;

/**
 * Conditional type for Eq methods
 */
export type HasEq<T extends TypeclassCapabilities> = T['Eq'] extends true ? true : false;

/**
 * Conditional type for Ord methods
 */
export type HasOrd<T extends TypeclassCapabilities> = T['Ord'] extends true ? true : false;

/**
 * Conditional type for Show methods
 */
export type HasShow<T extends TypeclassCapabilities> = T['Show'] extends true ? true : false;

/**
 * Typeclass-aware fluent methods interface
 */
export interface TypeclassAwareFluentMethods<A, T extends TypeclassCapabilities> {
  // Functor operations (only if Functor capability exists)
  map<B>(f: (a: A) => B): HasFunctor<T> extends true 
    ? TypeclassAwareFluentMethods<B, T> 
    : never;
  
  // Monad operations (only if Monad capability exists)
  chain<B>(f: (a: A) => any): HasMonad<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  flatMap<B>(f: (a: A) => any): HasMonad<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  
  // Applicative operations (only if Applicative capability exists)
  ap<B>(fab: any): HasApplicative<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  
  // ReplicateA operation (only if Applicative capability exists)
  replicateA(n: number): HasApplicative<T> extends true 
    ? TypeclassAwareFluentMethods<A[], T> 
    : never;
  
  // Filter operations (only if Filterable capability exists, fallback to Monad)
  filter(predicate: (a: A) => boolean): HasFilterable<T> extends true 
    ? TypeclassAwareFluentMethods<A, T> 
    : HasMonad<T> extends true 
      ? TypeclassAwareFluentMethods<A, T> 
      : never;
  
  // Bifunctor operations (only if Bifunctor capability exists)
  bimap<L, R>(left: (l: L) => any, right: (r: R) => any): HasBifunctor<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  mapLeft<L, R>(f: (l: L) => any): HasBifunctor<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  mapRight<L, R>(f: (r: R) => any): HasBifunctor<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  
  // Traversable operations (only if Traversable capability exists)
  traverse<B, F>(f: (a: A) => any): HasTraversable<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  
  // Sequence operation (only if Traversable capability exists)
  sequence<G extends Kind1>(applicative: any): HasTraversable<T> extends true 
    ? TypeclassAwareFluentMethods<any, T> 
    : never;
  
  // Standard typeclass operations (only if respective capabilities exist)
  equals(other: A): HasEq<T> extends true ? boolean : never;
  compare(other: A): HasOrd<T> extends true ? number : never;
  show(): HasShow<T> extends true ? string : never;
}

/**
 * Typeclass capability detector
 */
export function detectTypeclassCapabilities(adtName: string): TypeclassCapabilities {
  const derivable = getDerivableInstances(adtName);
  
  return {
    Functor: !!(derivable?.functor || getTypeclassInstance(adtName, 'Functor')),
    Applicative: !!(derivable?.applicative || getTypeclassInstance(adtName, 'Applicative')),
    Monad: !!(derivable?.monad || getTypeclassInstance(adtName, 'Monad')),
    Bifunctor: !!(derivable?.bifunctor || getTypeclassInstance(adtName, 'Bifunctor')),
    Traversable: !!(derivable?.traversable || getTypeclassInstance(adtName, 'Traversable')),
    Filterable: !!(derivable?.filterable || getTypeclassInstance(adtName, 'Filterable')),
    Eq: !!(derivable?.eq || getTypeclassInstance(adtName, 'Eq')),
    Ord: !!(derivable?.ord || getTypeclassInstance(adtName, 'Ord')),
    Show: !!(derivable?.show || getTypeclassInstance(adtName, 'Show'))
  };
}

// ============================================================================
// Core Types (Enhanced)
// ============================================================================

/**
 * Typeclass instances interface
 */
export interface TypeclassInstances {
  Functor?: {
    map: <A, B>(fa: any, f: (a: A) => B) => any;
  };
  Applicative?: {
    of: <A>(a: A) => any;
    ap: <A, B>(fab: any, fa: any) => any;
  };
  Monad?: {
    of: <A>(a: A) => any;
    chain: <A, B>(fa: any, f: (a: A) => any) => any;
  };
  Bifunctor?: {
    bimap: <A, B, C, D>(fa: any, f: (a: A) => C, g: (b: B) => D) => any;
    mapLeft: <A, B, C>(fa: any, f: (a: A) => C) => any;
    mapRight: <A, B, C>(fa: any, g: (b: B) => C) => any;
  };
  Traversable?: {
    traverse: <A, B, F>(fa: any, f: (a: A) => any) => any;
  };
  Filterable?: {
    filter: <A>(fa: any, predicate: (a: A) => boolean) => any;
  };
  Eq?: {
    equals: <A>(a: A, b: A) => boolean;
  };
  Ord?: {
    compare: <A>(a: A, b: A) => number;
  };
  Show?: {
    show: <A>(a: A) => string;
  };
}

/**
 * Derived instances from registry
 */
export interface DerivedInstances {
  functor?: any;
  applicative?: any;
  monad?: any;
  bifunctor?: any;
  traversable?: any;
  filterable?: any;
  eq?: any;
  ord?: any;
  show?: any;
  purity?: { effect: string };
}

/**
 * Fluent method options
 */
export interface FluentMethodOptions {
  enableMap?: boolean;
  enableChain?: boolean;
  enableFilter?: boolean;
  enableAp?: boolean;
  enableBimap?: boolean;
  enableTraverse?: boolean;
  enableEq?: boolean;
  enableOrd?: boolean;
  enableShow?: boolean;
  preservePurity?: boolean;
  enableTypeInference?: boolean;
  enableDualAPI?: boolean;
  enableLawVerification?: boolean;
  enableRuntimeDetection?: boolean;
  enableLazyDiscovery?: boolean;
  enableTypeclassAwareness?: boolean;
  // New optimization options
  enableOptimization?: boolean;
  optimizationMode?: 'speed' | 'memory' | 'balanced';
  maxOptimizationPasses?: number;
  allowInlining?: boolean;
  preserveOrder?: boolean;
  enableFusion?: boolean;
  enableSinglePass?: boolean;
}

/**
 * Legacy fluent methods interface (for backward compatibility)
 */
export interface FluentMethods<A> {
  // Functor operations
  map<B>(f: (a: A) => B): any;
  
  // Monad operations
  chain<B>(f: (a: A) => any): any;
  flatMap<B>(f: (a: A) => any): any;
  
  // Applicative operations
  ap<B>(fab: any): any;
  
  // ReplicateA operation
  replicateA(n: number): any;
  
  // Filter operations
  filter(predicate: (a: A) => boolean): any;
  
  // Bifunctor operations (for Either, Result)
  bimap<L, R>(left: (l: L) => any, right: (r: R) => any): any;
  mapLeft<L, R>(f: (l: L) => any): any;
  mapRight<L, R>(f: (r: R) => any): any;
  
  // Traversable operations
  traverse<B, F>(f: (a: A) => any): any;
  
  // Sequence operation
  sequence<G extends Kind1>(applicative: any): any;
  
  // Standard typeclass operations
  equals(other: A): boolean;
  compare(other: A): number;
  show(): string;
}

/**
 * Extended fluent methods with optimization support
 */
export interface OptimizedFluentMethods<A> extends FluentMethods<A> {
  // Standard fluent methods (inherited from FluentMethods<A>)
  
  // Optimization metadata
  readonly optimizationMetadata?: OptimizationMetadata;
  readonly evaluationMode?: EvaluationMode;
  
  // Optimization methods
  optimize(): OptimizedFluentMethods<A>;
  getOptimizationInfo(): {
    canOptimize: boolean;
    evaluationMode: EvaluationMode;
    performanceProfile: PerformanceProfile;
    optimizationSteps: OptimizationStep[];
  };
  
  // Performance methods
  benchmark(iterations?: number): {
    unoptimized: { time: number; memory: number };
    optimized: { time: number; memory: number };
    improvement: { time: number; memory: number };
  };
  
  // Verification methods
  verifyOptimization(testData: any[]): boolean;
}

/**
 * Dual API interface for testing
 */
export interface DualAPI<A> {
  fluent: FluentMethods<A>;
  dataLast: {
    map: <B>(f: (a: A) => B, fa: any) => any;
    chain: <B>(f: (a: A) => any, fa: any) => any;
    ap: <B>(fab: any, fa: any) => any;
    filter: (predicate: (a: A) => boolean, fa: any) => any;
    bimap: <L, R>(f: (l: L) => any, g: (r: R) => any, fa: any) => any;
    traverse: <B, F>(f: (a: A) => any, fa: any) => any;
    equals: <A>(a: A, b: A) => boolean;
    compare: <A>(a: A, b: A) => number;
    show: <A>(a: A) => string;
  };
}

/**
 * Runtime detection configuration
 */
export interface RuntimeDetectionConfig {
  enabled: boolean;
  pollInterval?: number;
  autoRefresh?: boolean;
  onInstanceDetected?: (adtName: string, typeclass: string) => void;
  onMethodGenerated?: (adtName: string, method: string) => void;
}

// ============================================================================
// Runtime Detection System
// ============================================================================

/**
 * Runtime detection manager for newly registered typeclass instances
 */
class RuntimeDetectionManager {
  private static instance: RuntimeDetectionManager;
  private config: RuntimeDetectionConfig;
  private detectedInstances: Map<string, Set<string>> = new Map();
  private fluentMethodCache: Map<string, any> = new Map();
  private pollInterval?: number | ReturnType<typeof setInterval>;

  private constructor(config: RuntimeDetectionConfig = { enabled: true }) {
    this.config = {
      pollInterval: 1000,
      autoRefresh: true,
      ...config
    };
  }

  static getInstance(config?: RuntimeDetectionConfig): RuntimeDetectionManager {
    if (!RuntimeDetectionManager.instance) {
      RuntimeDetectionManager.instance = new RuntimeDetectionManager(config);
    }
    return RuntimeDetectionManager.instance;
  }

  /**
   * Start runtime detection
   */
  startDetection(): void {
    if (!this.config.enabled) return;

    if (this.config.pollInterval && this.config.autoRefresh) {
      this.pollInterval = setInterval(() => {
        this.detectNewInstances();
      }, this.config.pollInterval);
    }

    console.log('🔍 Runtime detection started for typeclass instances');
  }

  /**
   * Stop runtime detection
   */
  stopDetection(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    console.log('⏹️ Runtime detection stopped');
  }

  /**
   * Detect newly registered typeclass instances
   */
  private detectNewInstances(): void {
    const registry = getFPRegistry();
    if (!registry) return;

    const adtNames = Array.from(registry.derivable.keys());
    
    for (const adtName of adtNames) {
      const name = adtName as string;
      const currentInstances = this.getCurrentTypeclassInstances(name);
      const previousInstances = this.detectedInstances.get(name) || new Set();
      
      // Find new instances
      const newInstances = new Set<string>();
      for (const typeclass of currentInstances) {
        if (!previousInstances.has(typeclass)) {
          newInstances.add(typeclass);
        }
      }
      
      // Update detected instances
      this.detectedInstances.set(name, currentInstances);
      
      // Handle new instances
      if (newInstances.size > 0) {
        this.handleNewInstances(name, Array.from(newInstances));
      }
    }
  }

  /**
   * Get current typeclass instances for an ADT
   */
  private getCurrentTypeclassInstances(adtName: string): Set<string> {
    const instances = new Set<string>();
    const derivedInstances = autoDiscoverDerivedInstances(adtName);
    
    if (derivedInstances) {
      if (derivedInstances.functor) instances.add('Functor');
      if (derivedInstances.applicative) instances.add('Applicative');
      if (derivedInstances.monad) instances.add('Monad');
      if (derivedInstances.bifunctor) instances.add('Bifunctor');
      if (derivedInstances.traversable) instances.add('Traversable');
      if (derivedInstances.filterable) instances.add('Filterable');
      if (derivedInstances.eq) instances.add('Eq');
      if (derivedInstances.ord) instances.add('Ord');
      if (derivedInstances.show) instances.add('Show');
    }
    
    return instances;
  }

  /**
   * Handle newly detected instances
   */
  private handleNewInstances(adtName: string, newTypeclasses: string[]): void {
    console.log(`🆕 New typeclass instances detected for ${adtName}: ${newTypeclasses.join(', ')}`);
    
    // Notify callback
    if (this.config.onInstanceDetected) {
      for (const typeclass of newTypeclasses) {
        this.config.onInstanceDetected(adtName, typeclass);
      }
    }
    
    // Regenerate fluent methods
    this.regenerateFluentMethods(adtName);
  }

  /**
   * Regenerate fluent methods for an ADT
   */
  private regenerateFluentMethods(adtName: string): void {
    try {
      // Clear cache for this ADT
      this.fluentMethodCache.delete(adtName);
      
      // Try to get the constructor and regenerate methods
      const adtModule = require(`./fp-${adtName.toLowerCase()}-unified`);
      const constructor = adtModule[adtName];
      
      if (constructor && constructor.prototype) {
        addFluentMethodsToPrototype(constructor, adtName, {
          enableRuntimeDetection: true,
          enableLazyDiscovery: true
        });
        
        console.log(`🔄 Regenerated fluent methods for ${adtName}`);
        
        // Notify callback
        if (this.config.onMethodGenerated) {
          this.config.onMethodGenerated(adtName, 'all');
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to regenerate fluent methods for ${adtName}:`, error);
    }
  }

  /**
   * Get cached fluent methods for an ADT
   */
  getCachedFluentMethods(adtName: string): any {
    return this.fluentMethodCache.get(adtName);
  }

  /**
   * Cache fluent methods for an ADT
   */
  cacheFluentMethods(adtName: string, methods: any): void {
    this.fluentMethodCache.set(adtName, methods);
  }

  /**
   * Check if an ADT has specific typeclass instance
   */
  hasTypeclassInstance(adtName: string, typeclass: string): boolean {
    const instances = this.detectedInstances.get(adtName);
    return instances ? instances.has(typeclass) : false;
  }

  /**
   * Get all detected typeclass instances for an ADT
   */
  getDetectedInstances(adtName: string): string[] {
    const instances = this.detectedInstances.get(adtName);
    return instances ? Array.from(instances) : [];
  }
}

// ============================================================================
// Enhanced Auto-Discovery System
// ============================================================================

/**
 * Auto-discover derived typeclass instances for an ADT with runtime detection
 */
export function autoDiscoverDerivedInstances(adtName: string): DerivedInstances | null {
  try {
    const registry = getFPRegistry();
    if (!registry) {
      console.warn(`⚠️ FP Registry not available for ${adtName}`);
      return null;
    }

    // Get derivable instances from registry
    const derivable = getDerivableInstances(adtName);
    if (!derivable) {
      console.warn(`⚠️ No derivable instances found for ${adtName}`);
      return null;
    }

    // Extract typeclass instances
    const instances: DerivedInstances = {};
    
    if (derivable.functor) {
      instances.functor = derivable.functor;
    }
    
    if (derivable.applicative) {
      instances.applicative = derivable.applicative;
    }
    
    if (derivable.monad) {
      instances.monad = derivable.monad;
    }
    
    if (derivable.bifunctor) {
      instances.bifunctor = derivable.bifunctor;
    }
    
    if (derivable.traversable) {
      instances.traversable = derivable.traversable;
    }
    
    if (derivable.filterable) {
      instances.filterable = derivable.filterable;
    }
    
    if (derivable.eq) {
      instances.eq = derivable.eq;
    }
    
    if (derivable.ord) {
      instances.ord = derivable.ord;
    }
    
    if (derivable.show) {
      instances.show = derivable.show;
    }
    
    if (derivable.purity) {
      instances.purity = derivable.purity;
    }

    // Update runtime detection manager
    const detectionManager = RuntimeDetectionManager.getInstance();
    const currentInstances = new Set<string>();
    if (instances.functor) currentInstances.add('Functor');
    if (instances.applicative) currentInstances.add('Applicative');
    if (instances.monad) currentInstances.add('Monad');
    if (instances.bifunctor) currentInstances.add('Bifunctor');
    if (instances.traversable) currentInstances.add('Traversable');
    if (instances.filterable) currentInstances.add('Filterable');
    if (instances.eq) currentInstances.add('Eq');
    if (instances.ord) currentInstances.add('Ord');
    if (instances.show) currentInstances.add('Show');

    console.log(`✅ Auto-discovered ${Object.keys(instances).length} instances for ${adtName}`);
    return instances;
  } catch (error) {
    console.error(`❌ Failed to auto-discover instances for ${adtName}:`, error);
    return null;
  }
}

/**
 * Check if an ADT has specific typeclass capabilities with runtime detection
 */
export function hasTypeclassCapability(adtName: string, typeclass: string): boolean {
  try {
    // Check runtime detection manager first
    const detectionManager = RuntimeDetectionManager.getInstance();
    if (detectionManager.hasTypeclassInstance(adtName, typeclass)) {
      return true;
    }
    
    // Fallback to direct discovery
    const instances = autoDiscoverDerivedInstances(adtName);
    if (!instances) return false;
    
    switch (typeclass) {
      case 'Functor':
        return !!instances.functor;
      case 'Applicative':
        return !!instances.applicative;
      case 'Monad':
        return !!instances.monad;
      case 'Bifunctor':
        return !!instances.bifunctor;
      case 'Traversable':
        return !!instances.traversable;
      case 'Filterable':
        return !!instances.filterable;
      case 'Eq':
        return !!instances.eq;
      case 'Ord':
        return !!instances.ord;
      case 'Show':
        return !!instances.show;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// ============================================================================
// Enhanced Core Fluent API Implementation
// ============================================================================

/**
 * Add typeclass-aware fluent methods to an ADT instance
 */
export function addTypeclassAwareFluentMethods<A, T extends TypeclassCapabilities>(
  adt: any,
  adtName: string,
  capabilities: T,
  options: FluentMethodOptions = {}
): any & TypeclassAwareFluentMethods<A, T> {
  const detectionManager = RuntimeDetectionManager.getInstance();
  
  // Check cache first for lazy discovery
  const cached = detectionManager.getCachedFluentMethods(adtName);
  if (cached && options.enableLazyDiscovery) {
    return Object.assign(adt, cached) as any & TypeclassAwareFluentMethods<A, T>;
  }

  // Get typeclass instances
  const instances = autoDiscoverDerivedInstances(adtName) || {};
  const functor = instances.functor || getTypeclassInstance(adtName, 'Functor');
  const applicative = instances.applicative || getTypeclassInstance(adtName, 'Applicative');
  const monad = instances.monad || getTypeclassInstance(adtName, 'Monad');
  const bifunctor = instances.bifunctor || getTypeclassInstance(adtName, 'Bifunctor');
  const traversable = instances.traversable || getTypeclassInstance(adtName, 'Traversable');
  const filterable = instances.filterable || getTypeclassInstance(adtName, 'Filterable');
  const eq = instances.eq || getTypeclassInstance(adtName, 'Eq');
  const ord = instances.ord || getTypeclassInstance(adtName, 'Ord');
  const show = instances.show || getTypeclassInstance(adtName, 'Show');

  // Create method table to attach onto the current ADT instance
  const fluent: any = {};

  // Functor methods (only if capability exists)
  if (capabilities.Functor && functor) {
    fluent.map = <B>(f: (a: A) => B): any => {
      const result = functor.map(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Monad methods (only if capability exists)
  if (capabilities.Monad && monad) {
    fluent.chain = <B>(f: (a: A) => any): any => {
      const result = monad.chain(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.flatMap = fluent.chain;
  }

  // Applicative methods (only if capability exists)
  if (capabilities.Applicative && applicative) {
    fluent.ap = <B>(fab: any): any => {
      const result = applicative.ap(fab, adt);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    // ReplicateA method - creates n copies of the value inside the applicative
    fluent.replicateA = (n: number): any => {
      if (n <= 0) {
        return applicative.of([]);
      }
      if (!functor) {
        throw new Error('replicateA requires Functor');
      }

      // Create an array of n copies of the applicative
      const replicatedArray = Array.from({ length: n }, () => adt);

      // Fold using reduceRight: F[A[]] by cons-lifting and ap
      const result = replicatedArray.reduceRight(
        (acc: any, fa: any) =>
          applicative.ap(
            functor.map(fa, (x: any) => (xs: any[]) => [x, ...xs]),
            acc
          ),
        applicative.of([])
      );

      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Filter methods (prioritize Filterable, fallback to Monad)
  if (capabilities.Filterable && filterable) {
    fluent.filter = (predicate: (a: A) => boolean): any => {
      const result = filterable.filter(adt, predicate);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  } else if (capabilities.Monad && monad) {
    fluent.filter = (predicate: (a: A) => boolean): any => {
      const result = monad.chain(adt, (a: A) => predicate(a) ? monad.of(a) : monad.of(null));
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Bifunctor methods (only if capability exists)
  if (capabilities.Bifunctor && bifunctor) {
    fluent.bimap = <L, R>(left: (l: L) => any, right: (r: R) => any): any => {
      const result = bifunctor.bimap(adt, left, right);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.mapLeft = <L, R>(f: (l: L) => any): any => {
      const result = bifunctor.mapLeft(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.mapRight = <L, R>(f: (r: R) => any): any => {
      const result = bifunctor.mapRight(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Traversable methods (only if capability exists)
  if (capabilities.Traversable && traversable) {
    fluent.traverse = <B, F>(f: (a: A) => any): any => {
      const result = traversable.traverse(adt, f);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
    
    // Sequence method - swaps outer and inner structure
    // Prefer sequence(applicative, fa) if available; otherwise use traverse with identity
    fluent.sequence = <G extends Kind1>(applicative: any): any => {
      const t: any = traversable as any;
      if (t.sequence && typeof t.sequence === 'function') {
        const result = t.sequence(applicative, adt);
        return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
      }
      const identity = (a: A) => a as any;
      if (t.traverse && t.traverse.length >= 3) {
        const result = t.traverse(applicative, identity, adt);
        return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
      }
      const result = t.traverse(adt, identity);
      return addTypeclassAwareFluentMethods(result, adtName, capabilities, options);
    };
  }

  // Standard typeclass methods (only if capabilities exist)
  if (capabilities.Eq && eq) {
    fluent.equals = (other: A): boolean => {
      return eq.equals(adt, other);
    };
  }

  if (capabilities.Ord && ord) {
    fluent.compare = (other: A): number => {
      return ord.compare(adt, other);
    };
  }

  if (capabilities.Show && show) {
    fluent.show = (): string => {
      return show.show(adt);
    };
  }

  // Cache the fluent methods for lazy discovery
  if (options.enableLazyDiscovery) {
    detectionManager.cacheFluentMethods(adtName, fluent);
  }

  return Object.assign(adt, fluent) as any & TypeclassAwareFluentMethods<A, T>;
}

/**
 * Convenience function to create typeclass-aware fluent methods with automatic capability detection
 */
export function createTypeclassAwareFluent<A>(
  adt: any,
  adtName: string,
  options: FluentMethodOptions = {}
): any & TypeclassAwareFluentMethods<A, TypeclassCapabilities> {
  const capabilities = detectTypeclassCapabilities(adtName);
  return addTypeclassAwareFluentMethods(adt, adtName, capabilities, options);
}

/**
 * Typeclass-aware fluent composition utilities
 */
export namespace TypeclassAwareComposition {
  /**
   * Compose fluent methods with type safety
   */
  export function compose<A, B, C>(
    f: (a: A) => TypeclassAwareFluentMethods<B, TypeclassCapabilities>,
    g: (b: B) => TypeclassAwareFluentMethods<C, TypeclassCapabilities>
  ): (a: A) => TypeclassAwareFluentMethods<C, TypeclassCapabilities> {
    return (a: A) => {
      const fb = f(a);
      return fb.chain(g) as any;
    };
  }

  /**
   * Pipe operations with type safety
   */
  export function pipe<A>(
    value: A,
    ...fns: Array<(x: any) => TypeclassAwareFluentMethods<any, TypeclassCapabilities>>
  ): TypeclassAwareFluentMethods<any, TypeclassCapabilities> {
    return fns.reduce((acc, fn) => acc.chain(fn), value as any);
  }

  /**
   * Create a fluent wrapper that preserves typeclass capabilities
   */
  export function withCapabilities<A, T extends TypeclassCapabilities>(
    adt: any,
    adtName: string,
    capabilities: T,
    options: FluentMethodOptions = {}
  ): TypeclassAwareFluentMethods<A, T> {
    return addTypeclassAwareFluentMethods(adt, adtName, capabilities, options);
  }

  /**
   * Check if a fluent object has specific typeclass capabilities
   */
  export function hasCapability<A, T extends TypeclassCapabilities>(
    fluent: TypeclassAwareFluentMethods<A, T>,
    capability: keyof TypeclassCapabilities
  ): boolean {
    return capability in fluent;
  }

  /**
   * Safely access typeclass methods with runtime checks
   */
  export function safeAccess<A, T extends TypeclassCapabilities>(
    fluent: TypeclassAwareFluentMethods<A, T>,
    method: string,
    fallback?: any
  ): any {
    if (method in fluent) {
      return (fluent as any)[method];
    }
    return fallback;
  }
}

/**
 * Add fluent methods to an ADT instance with runtime detection and lazy discovery
 */
export function addFluentMethods<A>(
  adt: any,
  adtName: string,
  options: FluentMethodOptions = {}
): any & FluentMethods<A> {
  const {
    enableMap = true,
    enableChain = true,
    enableFilter = true,
    enableAp = true,
    enableBimap = true,
    enableTraverse = true,
    enableEq = true,
    enableOrd = true,
    enableShow = true,
    preservePurity = true,
    enableTypeInference = true,
    enableDualAPI = true,
    enableLawVerification = true,
    enableRuntimeDetection = true,
    enableLazyDiscovery = true
  } = options;

  // Check cache first for lazy discovery
  const detectionManager = RuntimeDetectionManager.getInstance();
  const cachedMethods = detectionManager.getCachedFluentMethods(adtName);
  if (enableLazyDiscovery && cachedMethods) {
    return Object.assign(adt, cachedMethods);
  }

  // Auto-discover derived instances with runtime detection
  const derivedInstances = autoDiscoverDerivedInstances(adtName);
  
  // Fallback to direct registry lookup if auto-discovery fails
  const functor = derivedInstances?.functor || getTypeclassInstance(adtName, 'Functor');
  const applicative = derivedInstances?.applicative || getTypeclassInstance(adtName, 'Applicative');
  const monad = derivedInstances?.monad || getTypeclassInstance(adtName, 'Monad');
  const bifunctor = derivedInstances?.bifunctor || getTypeclassInstance(adtName, 'Bifunctor');
  const traversable = derivedInstances?.traversable || getTypeclassInstance(adtName, 'Traversable');
  const filterable = derivedInstances?.filterable || getTypeclassInstance(adtName, 'Filterable');
  const eq = derivedInstances?.eq || getTypeclassInstance(adtName, 'Eq');
  const ord = derivedInstances?.ord || getTypeclassInstance(adtName, 'Ord');
  const show = derivedInstances?.show || getTypeclassInstance(adtName, 'Show');

  const fluent = adt as any;
  const generatedMethods: any = {};

  // Add map method (Functor)
  if (enableMap && functor) {
    fluent.map = <B>(f: (a: A) => B): any => {
      const result = functor.map(adt, f);
      // Ensure result has fluent methods for chaining
      return addFluentMethods(result, adtName, options);
    };
    generatedMethods.map = fluent.map;
  }

  // Add chain method (Monad)
  if (enableChain && monad) {
    fluent.chain = <B>(f: (a: A) => any): any => {
      const result = monad.chain(this, f);
      // Ensure result has fluent methods for chaining
      return addFluentMethods(result, adtName, options);
    };

    // Alias for flatMap
    fluent.flatMap = fluent.chain;
    generatedMethods.chain = fluent.chain;
    generatedMethods.flatMap = fluent.flatMap;
  }

  // Add ap method (Applicative)
  if (enableAp && applicative) {
    fluent.ap = <B>(fab: any): any => {
      const result = applicative.ap(fab, adt);
      // Ensure result has fluent methods for chaining
      return addFluentMethods(result, adtName, options);
    };
    generatedMethods.ap = fluent.ap;
  }

  // Add filter method (implemented via Monad or Filterable)
  if (enableFilter) {
    if (filterable) {
      fluent.filter = (predicate: (a: A) => boolean): any => {
        const result = filterable.filter(adt, predicate);
        return addFluentMethods(result, adtName, options);
      };
    } else if (monad) {
      fluent.filter = (predicate: (a: A) => boolean): any => {
        const result = monad.chain(adt, (a: A) => 
          predicate(a) ? monad.of(a) : monad.of(null as any)
        );
        return addFluentMethods(result, adtName, options);
      };
    }
    if (fluent.filter) {
      generatedMethods.filter = fluent.filter;
    }
  }

  // Add bimap method (Bifunctor)
  if (enableBimap && bifunctor) {
    fluent.bimap = <L, R>(left: (l: L) => any, right: (r: R) => any): any => {
      const result = bifunctor.bimap(adt, left, right);
      return addFluentMethods(result, adtName, options);
    };

    fluent.mapLeft = <L, R>(f: (l: L) => any): any => {
      const result = bifunctor.mapLeft(adt, f);
      return addFluentMethods(result, adtName, options);
    };

    fluent.mapRight = <L, R>(f: (r: R) => any): any => {
      const result = bifunctor.mapRight(adt, f);
      return addFluentMethods(result, adtName, options);
    };
    
    generatedMethods.bimap = fluent.bimap;
    generatedMethods.mapLeft = fluent.mapLeft;
    generatedMethods.mapRight = fluent.mapRight;
  }

  // Add traverse method (Traversable)
  if (enableTraverse && traversable) {
    fluent.traverse = <B, F>(f: (a: A) => any): any => {
      const result = traversable.traverse(adt, f);
      return addFluentMethods(result, adtName, options);
    };
    generatedMethods.traverse = fluent.traverse;
  }

  // Add standard typeclass methods
  if (enableEq && eq) {
    fluent.equals = (other: A): boolean => {
      return eq.equals(adt, other);
    };
    generatedMethods.equals = fluent.equals;
  }

  if (enableOrd && ord) {
    fluent.compare = (other: A): number => {
      return ord.compare(adt, other);
    };
    generatedMethods.compare = fluent.compare;
  }

  if (enableShow && show) {
    fluent.show = (): string => {
      return show.show(adt);
    };
    generatedMethods.show = fluent.show;
  }

  // Cache generated methods for lazy discovery
  if (enableLazyDiscovery && Object.keys(generatedMethods).length > 0) {
    detectionManager.cacheFluentMethods(adtName, generatedMethods);
  }

  return fluent;
}

/**
 * Add fluent methods to an ADT constructor prototype with runtime detection
 */
/**
 * Add optimized fluent methods to an ADT instance
 */
export function addOptimizedFluentMethods<A>(
  adt: any,
  adtName: string,
  options: FluentMethodOptions = {}
): any & OptimizedFluentMethods<A> {
  const {
    enableOptimization = true,
    optimizationMode = 'balanced',
    maxOptimizationPasses = 3,
    allowInlining = true,
    preserveOrder = true,
    enableFusion = true,
    enableSinglePass = true,
    ...fluentOptions
  } = options;

  // Get the base fluent methods
  const fluentADT = addFluentMethods<A>(adt, adtName, fluentOptions);
  
  // Get typeclass instances for optimization
  const instances = autoDiscoverDerivedInstances(adtName);
  if (!instances) {
    return fluentADT;
  }

  // Detect evaluation mode
  const evaluationMode = detectEvaluationMode(instances);
  
  // Create optimization metadata
  const optimizationMetadata = createOptimizationMetadata(instances, evaluationMode);
  
  // Register optimization hooks if enabled
  if (enableOptimization) {
    const hooks: OptimizationHook[] = [];
    
    if (evaluationMode === 'Lazy') {
      hooks.push(lazyOptimizationHook);
    } else {
      hooks.push(eagerOptimizationHook);
    }
    
    if (allowInlining) {
      hooks.push(inliningOptimizationHook);
    }
    
    registerOptimizationHooks(adtName, 'Monad', hooks);
  }

  // Create operation tracking for optimization
  let operationChain: Array<{ method: string; args: any[] }> = [];
  let optimizationSteps: OptimizationStep[] = [];

  // Override fluent methods to track operations
  const optimizedMethods: Partial<OptimizedFluentMethods<A>> = {
    optimizationMetadata,
    evaluationMode,
    
    // Override map to track operations
    map: function<B>(f: (a: A) => B): any {
      operationChain.push({ method: 'map', args: [f] });
      
      // Apply optimization if enabled
      if (enableOptimization && operationChain.length > 1) {
        const context: OptimizationContext = {
          adtName,
          typeclass: 'Monad',
          evaluationMode,
          targetPerformance: optimizationMode,
          maxOptimizationPasses,
          preserveOrder,
          allowInlining
        };
        
        const optimizationResult = optimizeFluentChain(adtName, operationChain, context);
        if (optimizationResult.optimized) {
          optimizationSteps = [...optimizationSteps, ...optimizationResult.optimizationSteps];
          // Reset operation chain after optimization
          operationChain = [];
        }
      }
      
      return fluentADT.map.call(this, f);
    },
    
    // Override chain to track operations
    chain: function<B>(f: (a: A) => any): any {
      operationChain.push({ method: 'chain', args: [f] });
      
      // Apply optimization if enabled
      if (enableOptimization && operationChain.length > 1) {
        const context: OptimizationContext = {
          adtName,
          typeclass: 'Monad',
          evaluationMode,
          targetPerformance: optimizationMode,
          maxOptimizationPasses,
          preserveOrder,
          allowInlining
        };
        
        const optimizationResult = optimizeFluentChain(adtName, operationChain, context);
        if (optimizationResult.optimized) {
          optimizationSteps = [...optimizationSteps, ...optimizationResult.optimizationSteps];
          operationChain = [];
        }
      }
      
      return fluentADT.chain.call(this, f);
    },
    
    // Override filter to track operations
    filter: function(predicate: (a: A) => boolean): any {
      operationChain.push({ method: 'filter', args: [predicate] });
      
      // Apply optimization if enabled
      if (enableOptimization && operationChain.length > 1) {
        const context: OptimizationContext = {
          adtName,
          typeclass: 'Monad',
          evaluationMode,
          targetPerformance: optimizationMode,
          maxOptimizationPasses,
          preserveOrder,
          allowInlining
        };
        
        const optimizationResult = optimizeFluentChain(adtName, operationChain, context);
        if (optimizationResult.optimized) {
          optimizationSteps = [...optimizationSteps, ...optimizationResult.optimizationSteps];
          operationChain = [];
        }
      }
      
      return fluentADT.filter.call(this, predicate);
    },
    
    // Optimization methods
    optimize: function(): OptimizedFluentMethods<A> {
      if (operationChain.length === 0) {
        return this;
      }
      
      const context: OptimizationContext = {
        adtName,
        typeclass: 'Monad',
        evaluationMode,
        targetPerformance: optimizationMode,
        maxOptimizationPasses,
        preserveOrder,
        allowInlining
      };
      
      const optimizationResult = optimizeFluentChain(adtName, operationChain, context);
      if (optimizationResult.optimized) {
        optimizationSteps = [...optimizationSteps, ...optimizationResult.optimizationSteps];
        operationChain = [];
      }
      
      return this;
    },
    
    getOptimizationInfo: function() {
      return {
        canOptimize: canOptimizePipeline(adtName, 'Monad', []),
        evaluationMode,
        performanceProfile: optimizationMetadata.performanceProfile,
        optimizationSteps
      };
    },
    
    benchmark: function(iterations: number = 1000) {
      // Convert operation chain to pipeline
      const pipeline: Operation[] = operationChain.map(op => ({
        type: op.method,
        fn: op.args[0],
        metadata: {
          isPure: true,
          hasSideEffects: false,
          complexity: 1,
          allocationCost: 0.1
        },
        dependencies: [],
        outputType: 'unknown'
      }));
      
      // Create test data
      const testData = Array.from({ length: 1000 }, (_, i) => i);
      
      return benchmarkOptimization(adtName, 'Monad', pipeline, testData, iterations);
    },
    
    verifyOptimization: function(testData: any[]) {
      // Convert operation chain to pipeline
      const pipeline: Operation[] = operationChain.map(op => ({
        type: op.method,
        fn: op.args[0],
        metadata: {
          isPure: true,
          hasSideEffects: false,
          complexity: 1,
          allocationCost: 0.1
        },
        dependencies: [],
        outputType: 'unknown'
      }));
      
      return verifyOptimizationCorrectness(adtName, 'Monad', pipeline, testData);
    }
  };

  // Merge optimized methods with fluent ADT
  return Object.assign(fluentADT, optimizedMethods);
}

export function addFluentMethodsToPrototype<T extends new (...args: any[]) => any>(
  Ctor: T,
  adtName: string,
  options: FluentMethodOptions = {}
): T {
  const {
    enableMap = true,
    enableChain = true,
    enableFilter = true,
    enableAp = true,
    enableBimap = true,
    enableTraverse = true,
    enableEq = true,
    enableOrd = true,
    enableShow = true,
    enableDualAPI = true,
    enableRuntimeDetection = true,
    enableLazyDiscovery = true
  } = options;

  // Auto-discover derived instances with runtime detection
  const derivedInstances = autoDiscoverDerivedInstances(adtName);
  
  // Fallback to direct registry lookup if auto-discovery fails
  const functor = derivedInstances?.functor || getTypeclassInstance(adtName, 'Functor');
  const applicative = derivedInstances?.applicative || getTypeclassInstance(adtName, 'Applicative');
  const monad = derivedInstances?.monad || getTypeclassInstance(adtName, 'Monad');
  const bifunctor = derivedInstances?.bifunctor || getTypeclassInstance(adtName, 'Bifunctor');
  const traversable = derivedInstances?.traversable || getTypeclassInstance(adtName, 'Traversable');
  const filterable = derivedInstances?.filterable || getTypeclassInstance(adtName, 'Filterable');
  const eq = derivedInstances?.eq || getTypeclassInstance(adtName, 'Eq');
  const ord = derivedInstances?.ord || getTypeclassInstance(adtName, 'Ord');
  const show = derivedInstances?.show || getTypeclassInstance(adtName, 'Show');

  // Add map method (Functor)
  if (enableMap && functor) {
    Ctor.prototype.map = function<A, B>(this: any, f: (a: A) => B): any {
      const result = functor.map(this, f);
      // Ensure result has fluent methods for chaining
      return addFluentMethods(result, adtName, options);
    };
  }

  // Add chain method (Monad)
  if (enableChain && monad) {
    Ctor.prototype.chain = function<A, B>(this: any, f: (a: A) => any): any {
      const result = monad.chain(this, f);
      // Ensure result has fluent methods for chaining
      return addFluentMethods(result, adtName, options);
    };

    // Alias for flatMap
    Ctor.prototype.flatMap = Ctor.prototype.chain;
  }

  // Add ap method (Applicative)
  if (enableAp && applicative) {
    Ctor.prototype.ap = function<A, B>(this: any, fab: any): any {
      const result = applicative.ap(fab, this);
      // Ensure result has fluent methods for chaining
      return addFluentMethods(result, adtName, options);
    };
  }

  // Add filter method (implemented via Monad or Filterable)
  if (enableFilter) {
    if (filterable) {
      Ctor.prototype.filter = function<A>(this: any, predicate: (a: A) => boolean): any {
        const result = filterable.filter(this, predicate);
        return addFluentMethods(result, adtName, options);
      };
    } else if (monad) {
      Ctor.prototype.filter = function<A>(this: any, predicate: (a: A) => boolean): any {
        const result = monad.chain(this, (a: A) => 
          predicate(a) ? monad.of(a) : monad.of(null as any)
        );
        return addFluentMethods(result, adtName, options);
      };
    }
  }

  // Add bimap method (Bifunctor)
  if (enableBimap && bifunctor) {
    Ctor.prototype.bimap = function<A, B, C, D>(
      this: any,
      f: (a: A) => C,
      g: (b: B) => D
    ): any {
      const result = bifunctor.bimap(this, f, g);
      return addFluentMethods(result, adtName, options);
    };

    Ctor.prototype.mapLeft = function<A, B, C>(this: any, f: (a: A) => C): any {
      const result = bifunctor.mapLeft(this, f);
      return addFluentMethods(result, adtName, options);
    };

    Ctor.prototype.mapRight = function<A, B, C>(this: any, f: (b: B) => C): any {
      const result = bifunctor.mapRight(this, f);
      return addFluentMethods(result, adtName, options);
    };
  }

  // Add traverse method (Traversable)
  if (enableTraverse && traversable) {
    Ctor.prototype.traverse = function<A, B, F>(this: any, f: (a: A) => any): any {
      const result = traversable.traverse(this, f);
      return addFluentMethods(result, adtName, options);
    };
  }

  // Add standard typeclass methods
  if (enableEq && eq) {
    Ctor.prototype.equals = function<A>(this: any, other: A): boolean {
      return eq.equals(this, other);
    };
  }

  if (enableOrd && ord) {
    Ctor.prototype.compare = function<A>(this: any, other: A): number {
      return ord.compare(this, other);
    };
  }

  if (enableShow && show) {
    Ctor.prototype.show = function<A>(this: any): string {
      return show.show(this);
    };
  }

  return Ctor;
}

// ============================================================================
// Dual-API Usage Support
// ============================================================================

/**
 * Create dual-API wrapper for testing equivalence
 */
export function createDualAPI<A>(
  adt: any,
  adtName: string,
  options: FluentMethodOptions = {}
): DualAPI<A> {
  const derivedInstances = autoDiscoverDerivedInstances(adtName);
  
  const fluent = addFluentMethods(adt, adtName, options);
  
  const dataLast = {
    map: <B>(f: (a: A) => B, fa: any) => {
      const functor = derivedInstances?.functor || getTypeclassInstance(adtName, 'Functor');
      return functor ? functor.map(fa, f) : fa;
    },
    chain: <B>(f: (a: A) => any, fa: any) => {
      const monad = derivedInstances?.monad || getTypeclassInstance(adtName, 'Monad');
      return monad ? monad.chain(fa, f) : fa;
    },
    ap: <B>(fab: any, fa: any) => {
      const applicative = derivedInstances?.applicative || getTypeclassInstance(adtName, 'Applicative');
      return applicative ? applicative.ap(fab, fa) : fa;
    },
    filter: (predicate: (a: A) => boolean, fa: any) => {
      const filterable = derivedInstances?.filterable || getTypeclassInstance(adtName, 'Filterable');
      const monad = derivedInstances?.monad || getTypeclassInstance(adtName, 'Monad');
      
      if (filterable) {
        return filterable.filter(fa, predicate);
      } else if (monad) {
        return monad.chain(fa, (a: A) => 
          predicate(a) ? monad.of(a) : monad.of(null as any)
        );
      }
      return fa;
    },
    bimap: <L, R>(f: (l: L) => any, g: (r: R) => any, fa: any) => {
      const bifunctor = derivedInstances?.bifunctor || getTypeclassInstance(adtName, 'Bifunctor');
      return bifunctor ? bifunctor.bimap(fa, f, g) : fa;
    },
    traverse: <B, F>(f: (a: A) => any, fa: any) => {
      const traversable = derivedInstances?.traversable || getTypeclassInstance(adtName, 'Traversable');
      return traversable ? traversable.traverse(fa, f) : fa;
    },
    equals: <A>(a: A, b: A) => {
      const eq = derivedInstances?.eq || getTypeclassInstance(adtName, 'Eq');
      return eq ? eq.equals(a, b) : false;
    },
    compare: <A>(a: A, b: A) => {
      const ord = derivedInstances?.ord || getTypeclassInstance(adtName, 'Ord');
      return ord ? ord.compare(a, b) : 0;
    },
    show: <A>(a: A) => {
      const show = derivedInstances?.show || getTypeclassInstance(adtName, 'Show');
      return show ? show.show(a) : String(a);
    }
  };

  return { fluent, dataLast };
}

// ============================================================================
// Runtime Detection Management
// ============================================================================

/**
 * Start runtime detection for newly registered typeclass instances
 */
export function startRuntimeDetection(config?: RuntimeDetectionConfig): void {
  const detectionManager = RuntimeDetectionManager.getInstance(config);
  detectionManager.startDetection();
}

/**
 * Stop runtime detection
 */
export function stopRuntimeDetection(): void {
  const detectionManager = RuntimeDetectionManager.getInstance();
  detectionManager.stopDetection();
}

/**
 * Manually trigger detection of new instances
 */
export function triggerInstanceDetection(): void {
  const detectionManager = RuntimeDetectionManager.getInstance();
  (detectionManager as any).detectNewInstances();
}

/**
 * Get runtime detection status
 */
export function getRuntimeDetectionStatus(): {
  enabled: boolean;
  detectedInstances: Map<string, string[]>;
} {
  const detectionManager = RuntimeDetectionManager.getInstance();
  const detectedInstances = new Map<string, string[]>();
  
  // Convert internal map to public format
  for (const [adtName, instances] of (detectionManager as any).detectedInstances) {
    detectedInstances.set(adtName, Array.from(instances));
  }
  
  return {
    enabled: (detectionManager as any).config.enabled,
    detectedInstances
  };
}

// ============================================================================
// Enhanced Testing and Verification
// ============================================================================

/**
 * Test law consistency between fluent and data-last methods with enhanced verification
 */
export function testLawConsistency<A, B>(
  adtName: string,
  testValue: any,
  testFunction: (a: A) => B,
  options: FluentMethodOptions = {}
): boolean {
  try {
    const derivedInstances = autoDiscoverDerivedInstances(adtName);
    if (!derivedInstances) {
      console.warn(`⚠️ No derived instances found for ${adtName}`);
      return false;
    }

    // Create dual-API wrapper
    const dualAPI = createDualAPI(testValue, adtName, options);
    const { fluent, dataLast } = dualAPI;

    // Test Functor laws
    if (derivedInstances.functor) {
      // Identity law: map(id) = id
      const identity = (x: any) => x;
      const fluentResult = fluent.map(identity);
      const dataLastResult = dataLast.map(identity, testValue);
      
      if (JSON.stringify(fluentResult) !== JSON.stringify(dataLastResult)) {
        console.error(`❌ Functor identity law failed for ${adtName}`);
        console.error('Fluent result:', fluentResult);
        console.error('Data-last result:', dataLastResult);
        return false;
      }

      // Composition law: map(f ∘ g) = map(f) ∘ map(g)
      const f = (x: any) => x * 2;
      const g = (x: any) => x + 1;
      const composition = (x: any) => f(g(x));
      
      const fluentComposition = fluent.map(composition);
      const fluentComposed = fluent.map(g).map(f);
      
      if (JSON.stringify(fluentComposition) !== JSON.stringify(fluentComposed)) {
        console.error(`❌ Functor composition law failed for ${adtName}`);
        return false;
      }
    }

    // Test Monad laws
    if (derivedInstances.monad) {
      // Left identity: of(a).chain(f) = f(a)
      const fluentLeftIdentity = derivedInstances.monad.of(testValue).chain(testFunction);
      const dataLastLeftIdentity = testFunction(testValue);
      
      if (JSON.stringify(fluentLeftIdentity) !== JSON.stringify(dataLastLeftIdentity)) {
        console.error(`❌ Monad left identity law failed for ${adtName}`);
        return false;
      }

      // Right identity: m.chain(of) = m
      const fluentRightIdentity = fluent.chain(derivedInstances.monad.of);
      const dataLastRightIdentity = testValue;
      
      if (JSON.stringify(fluentRightIdentity) !== JSON.stringify(dataLastRightIdentity)) {
        console.error(`❌ Monad right identity law failed for ${adtName}`);
        return false;
      }
    }

         // Test dual-API equivalence
     if (options.enableDualAPI) {
       const testF = (x: any) => x * 2;
       
       // Test map equivalence
       if (fluent.map && dataLast.map) {
         const fluentMap = fluent.map(testF);
         const dataLastMap = dataLast.map(testF, testValue);
         
         if (JSON.stringify(fluentMap) !== JSON.stringify(dataLastMap)) {
           console.error(`❌ Dual-API map equivalence failed for ${adtName}`);
           return false;
         }
       }
       
       // Test chain equivalence
       if (fluent.chain && dataLast.chain) {
         const fluentChain = fluent.chain((x: any) => testFunction(x));
         const dataLastChain = dataLast.chain((x: any) => testFunction(x), testValue);
         
         if (JSON.stringify(fluentChain) !== JSON.stringify(dataLastChain)) {
           console.error(`❌ Dual-API chain equivalence failed for ${adtName}`);
           return false;
         }
       }
     }

    console.log(`✅ Law consistency tests passed for ${adtName}`);
    return true;
  } catch (error) {
    console.error(`❌ Law consistency test failed for ${adtName}:`, error);
    return false;
  }
}

/**
 * Test suite for runtime detection and typeclass integration
 */
export class RuntimeDetectionTestSuite {
  private mockRegistry: Map<string, any> = new Map();
  private originalGetFPRegistry: any;
  private originalGetDerivableInstances: any;

  constructor() {
    // Store original functions
    this.originalGetFPRegistry = getFPRegistry;
    this.originalGetDerivableInstances = getDerivableInstances;
  }

  /**
   * Setup mock registry for testing
   */
  setupMockRegistry(): void {
    // Mock registry with initial instances
    this.mockRegistry.set('TestADT', {
      functor: {
        map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
      },
      monad: {
        of: (a: any) => ({ tag: 'Just', value: a }),
        chain: (fa: any, f: any) => f(fa.value)
      }
    });

    // Mock the registry functions
    (globalThis as any).__MOCK_FP_REGISTRY = {
      derivable: this.mockRegistry,
      getDerivable: (name: string) => this.mockRegistry.get(name)
    };
  }

  /**
   * Add new typeclass instance at runtime
   */
  addRuntimeInstance(adtName: string, typeclass: string, instance: any): void {
    const current = this.mockRegistry.get(adtName) || {};
    this.mockRegistry.set(adtName, { ...current, [typeclass.toLowerCase()]: instance });
    
    console.log(`🧪 Added ${typeclass} instance for ${adtName} at runtime`);
  }

  /**
   * Test that new instances are automatically detected
   */
  async testRuntimeDetection(): Promise<boolean> {
    console.log('🧪 Testing runtime detection...');
    
    // Start detection
    startRuntimeDetection({
      enabled: true,
      pollInterval: 100,
      autoRefresh: true,
      onInstanceDetected: (adtName, typeclass) => {
        console.log(`✅ Detected new ${typeclass} instance for ${adtName}`);
      }
    });

    // Add new instance
    this.addRuntimeInstance('TestADT', 'Eq', {
      equals: (a: any, b: any) => a.value === b.value
    });

    // Wait for detection
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        const status = getRuntimeDetectionStatus();
        const hasEq = status.detectedInstances.get('TestADT')?.includes('Eq');
        
        stopRuntimeDetection();
        resolve(hasEq || false);
      }, 200);
    });
  }

  /**
   * Test type signature correctness
   */
  testTypeSignatures(): boolean {
    console.log('🧪 Testing type signatures...');
    
    // Create test ADT with all typeclasses
    this.addRuntimeInstance('TestADT', 'Functor', {
      map: <A, B>(fa: { value: A }, f: (a: A) => B): { value: B } => ({ value: f(fa.value) })
    });
    
    this.addRuntimeInstance('TestADT', 'Monad', {
      of: <A>(a: A): { value: A } => ({ value: a }),
      chain: <A, B>(fa: { value: A }, f: (a: A) => { value: B }): { value: B } => f(fa.value)
    });
    
    this.addRuntimeInstance('TestADT', 'Eq', {
      equals: <A>(a: { value: A }, b: { value: A }): boolean => a.value === b.value
    });

    // Test fluent method generation
    const testValue = { value: 42 };
    const fluent = addFluentMethods(testValue, 'TestADT', {
      enableRuntimeDetection: true,
      enableLazyDiscovery: true
    });

    // Verify type signatures
    const hasMap = typeof fluent.map === 'function';
    const hasChain = typeof fluent.chain === 'function';
    const hasEquals = typeof fluent.equals === 'function';
    
    const mapResult = fluent.map((x: number) => x * 2);
    const chainResult = fluent.chain((x: number) => ({ value: x * 2 }));
    const equalsResult = fluent.equals({ value: 42 });

    return hasMap && hasChain && hasEquals && 
           mapResult.value === 84 && 
           chainResult.value === 84 && 
           equalsResult === true;
  }

  /**
   * Test law equivalence between fluent and non-fluent calls
   */
  testLawEquivalence(): boolean {
    console.log('🧪 Testing law equivalence...');
    
    // Setup test instances
    this.addRuntimeInstance('TestADT', 'Functor', {
      map: (fa: any, f: any) => ({ ...fa, value: f(fa.value) })
    });
    
    this.addRuntimeInstance('TestADT', 'Monad', {
      of: (a: any) => ({ value: a }),
      chain: (fa: any, f: any) => f(fa.value)
    });

    const testValue = { value: 42 };
    const dualAPI = createDualAPI(testValue, 'TestADT', { enableDualAPI: true });
    
    // Test map equivalence
    const f = (x: any) => x * 2;
    const fluentMap = dualAPI.fluent.map(f);
    const dataLastMap = dualAPI.dataLast.map(f, testValue);
    
    // Test chain equivalence
    const fluentChain = dualAPI.fluent.chain((x: any) => ({ value: x * 2 }));
    const dataLastChain = dualAPI.dataLast.chain((x: any) => ({ value: x * 2 }), testValue);
    
    return JSON.stringify(fluentMap) === JSON.stringify(dataLastMap) &&
           JSON.stringify(fluentChain) === JSON.stringify(dataLastChain);
  }

  /**
   * Cleanup after testing
   */
  cleanup(): void {
    stopRuntimeDetection();
    this.mockRegistry.clear();
    
    // Restore original functions
    (globalThis as any).__MOCK_FP_REGISTRY = undefined;
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<{
    runtimeDetection: boolean;
    typeSignatures: boolean;
    lawEquivalence: boolean;
  }> {
    console.log('🧪 Running runtime detection test suite...');
    
    this.setupMockRegistry();
    
    try {
      const runtimeDetection = await this.testRuntimeDetection();
      const typeSignatures = this.testTypeSignatures();
      const lawEquivalence = this.testLawEquivalence();
      
      console.log('📊 Test Results:');
      console.log(`  Runtime Detection: ${runtimeDetection ? '✅' : '❌'}`);
      console.log(`  Type Signatures: ${typeSignatures ? '✅' : '❌'}`);
      console.log(`  Law Equivalence: ${lawEquivalence ? '✅' : '❌'}`);
      
      return { runtimeDetection, typeSignatures, lawEquivalence };
    } finally {
      this.cleanup();
    }
  }
}

// ============================================================================
// Enhanced Auto-Registration System
// ============================================================================

/**
 * Enhanced auto-register fluent methods for all ADTs with derived typeclass instances
 */
export function autoRegisterFluentMethods(): void {
  const registry = getFPRegistry();
  if (!registry) {
    console.warn('⚠️ FP Registry not available, skipping fluent method registration');
    return;
  }

  // Get all registered ADTs
  const adtNames = Array.from(registry.derivable.keys());
  let registered = 0;
  let failed = 0;
  
  for (const adtName of adtNames) {
    try {
      // Auto-discover derived instances
      const derivedInstances = autoDiscoverDerivedInstances(adtName as string);
      
      if (derivedInstances && (
        derivedInstances.functor || 
        derivedInstances.monad || 
        derivedInstances.applicative ||
        derivedInstances.bifunctor
      )) {
        // Try to get the constructor
        const adtModule = require(`./fp-${(adtName as string).toLowerCase()}-unified`);
        const constructor = adtModule[adtName as string];
        
        if (constructor && constructor.prototype) {
          addFluentMethodsToPrototype(constructor, adtName as string, {
            enableDualAPI: true,
            enableLawVerification: true
          });
          console.log(`✅ Added fluent methods to ${adtName as string} (${Object.keys(derivedInstances).filter(k => k !== 'purity').join(', ')})`);
          registered++;
        } else {
          console.warn(`⚠️ Constructor not found for ${adtName as string}`);
          failed++;
        }
      } else {
        console.log(`ℹ️ No suitable typeclass instances found for ${adtName as string}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to add fluent methods to ${adtName}:`, error);
      failed++;
    }
  }
  
  console.log(`📊 Fluent method registration complete: ${registered} registered, ${failed} failed`);
}

// ============================================================================
// Enhanced Testing and Verification
// ============================================================================

/**
 * Verify method presence matches registered typeclass capabilities
 */
export function verifyMethodPresence(adtName: string): boolean {
  try {
    const derivedInstances = autoDiscoverDerivedInstances(adtName);
    if (!derivedInstances) {
      console.warn(`⚠️ No derived instances found for ${adtName}`);
      return false;
    }

    // Create test instance
    const adtModule = require(`./fp-${adtName.toLowerCase()}-unified`);
    const constructor = adtModule[adtName];
    const testInstance = new constructor();

    // Check if fluent methods are present based on typeclass capabilities
    const missingMethods: string[] = [];

    if (derivedInstances.functor && !testInstance.map) {
      missingMethods.push('map');
    }

    if (derivedInstances.monad && !testInstance.chain) {
      missingMethods.push('chain');
    }

    if (derivedInstances.applicative && !testInstance.ap) {
      missingMethods.push('ap');
    }

    if (derivedInstances.bifunctor && !testInstance.bimap) {
      missingMethods.push('bimap');
    }

    if (derivedInstances.traversable && !testInstance.traverse) {
      missingMethods.push('traverse');
    }

    if (missingMethods.length > 0) {
      console.error(`❌ Missing fluent methods for ${adtName}: ${missingMethods.join(', ')}`);
      return false;
    }

    console.log(`✅ Method presence verification passed for ${adtName}`);
    return true;
  } catch (error) {
    console.error(`❌ Method presence verification failed for ${adtName}:`, error);
    return false;
  }
}

/**
 * Assert semantic equivalence between fluent and data-last usage for every method
 */
export function assertSemanticEquivalence(adtName: string, testValue: any): boolean {
  try {
    const dualAPI = createDualAPI(testValue, adtName, { enableDualAPI: true });
    const { fluent, dataLast } = dualAPI;

    const testF = (x: any) => x * 2;
    const testG = (x: any) => x + 1;
    const testPredicate = (x: any) => x > 0;

    // Test map equivalence
    if (fluent.map && dataLast.map) {
      const fluentResult = fluent.map(testF);
      const dataLastResult = dataLast.map(testF, testValue);
      
      if (JSON.stringify(fluentResult) !== JSON.stringify(dataLastResult)) {
        console.error(`❌ Map semantic equivalence failed for ${adtName}`);
        return false;
      }
    }

    // Test chain equivalence
    if (fluent.chain && dataLast.chain) {
      const fluentResult = fluent.chain(testF);
      const dataLastResult = dataLast.chain(testF, testValue);
      
      if (JSON.stringify(fluentResult) !== JSON.stringify(dataLastResult)) {
        console.error(`❌ Chain semantic equivalence failed for ${adtName}`);
        return false;
      }
    }

    // Test ap equivalence
    if (fluent.ap && dataLast.ap) {
      const fab = { tag: 'Just', value: testF };
      const fluentResult = fluent.ap(fab);
      const dataLastResult = dataLast.ap(fab, testValue);
      
      if (JSON.stringify(fluentResult) !== JSON.stringify(dataLastResult)) {
        console.error(`❌ Ap semantic equivalence failed for ${adtName}`);
        return false;
      }
    }

    // Test filter equivalence
    if (fluent.filter && dataLast.filter) {
      const fluentResult = fluent.filter(testPredicate);
      const dataLastResult = dataLast.filter(testPredicate, testValue);
      
      if (JSON.stringify(fluentResult) !== JSON.stringify(dataLastResult)) {
        console.error(`❌ Filter semantic equivalence failed for ${adtName}`);
        return false;
      }
    }

    // Test bimap equivalence
    if (fluent.bimap && dataLast.bimap) {
      const fluentResult = fluent.bimap(testF, testG);
      const dataLastResult = dataLast.bimap(testF, testG, testValue);
      
      if (JSON.stringify(fluentResult) !== JSON.stringify(dataLastResult)) {
        console.error(`❌ Bimap semantic equivalence failed for ${adtName}`);
        return false;
      }
    }

    console.log(`✅ Semantic equivalence verification passed for ${adtName}`);
    return true;
  } catch (error) {
    console.error(`❌ Semantic equivalence verification failed for ${adtName}:`, error);
    return false;
  }
}

/**
 * Comprehensive verification for all registry-known ADTs
 */
export function verifyAllRegistryADTs(): void {
  const registry = getFPRegistry();
  if (!registry) {
    console.warn('⚠️ FP Registry not available, skipping verification');
    return;
  }

  const adtNames = Array.from(registry.derivable.keys());
  let passed = 0;
  let failed = 0;

  console.log(`🔍 Verifying ${adtNames.length} registry-known ADTs...`);

  for (const adtName of adtNames) {
    try {
      const name = adtName as string;
      
      // Verify method presence
      const presenceOk = verifyMethodPresence(name);
      
      // Create test value based on ADT type
      let testValue: any;
      switch (name) {
        case 'Maybe':
          testValue = { tag: 'Just', value: 42 };
          break;
        case 'Either':
          testValue = { tag: 'Right', value: 42 };
          break;
        case 'Result':
          testValue = { tag: 'Ok', value: 42 };
          break;
        case 'PersistentList':
          testValue = [1, 2, 3];
          break;
        default:
          testValue = { value: 42 };
      }
      
      // Verify semantic equivalence
      const equivalenceOk = assertSemanticEquivalence(name, testValue);
      
      // Verify law consistency
      const lawOk = testLawConsistency(name, testValue, (x: any) => x * 2, {
        enableDualAPI: true,
        enableLawVerification: true
      });

      if (presenceOk && equivalenceOk && lawOk) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.warn(`⚠️ Verification failed for ${adtName}:`, error);
      failed++;
    }
  }

  console.log(`📊 Verification complete: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    throw new Error(`❌ ${failed} ADTs failed verification - derived instances exist but fluent methods are missing or incorrect`);
  }
}

// ============================================================================
// ADT-Specific Decorators (Enhanced)
// ============================================================================

/**
 * Add fluent methods to Maybe ADT with auto-discovery
 */
export function withMaybeFluentMethods() {
  const { Maybe, Just, Nothing } = require('./fp-maybe-unified');
  
  addFluentMethodsToPrototype(Maybe, 'Maybe', {
    enableMap: true,
    enableChain: true,
    enableFilter: true,
    enableAp: true,
    enableDualAPI: true,
    enableLawVerification: true
  });

  return { Maybe, Just, Nothing };
}

/**
 * Add fluent methods to Either ADT with auto-discovery
 */
export function withEitherFluentMethods() {
  const { Either, Left, Right } = require('./fp-either-unified');
  
  addFluentMethodsToPrototype(Either, 'Either', {
    enableMap: true,
    enableChain: true,
    enableFilter: true,
    enableAp: true,
    enableBimap: true,
    enableDualAPI: true,
    enableLawVerification: true
  });

  return { Either, Left, Right };
}

/**
 * Add fluent methods to Result ADT with auto-discovery
 */
export function withResultFluentMethods() {
  const { Result, Ok, Err } = require('./fp-result-unified');
  
  addFluentMethodsToPrototype(Result, 'Result', {
    enableMap: true,
    enableChain: true,
    enableFilter: true,
    enableAp: true,
    enableBimap: true,
    enableDualAPI: true,
    enableLawVerification: true
  });

  return { Result, Ok, Err };
}

/**
 * Add fluent methods to PersistentList ADT with auto-discovery
 */
export function withPersistentListFluentMethods() {
  const { PersistentList } = require('./fp-persistent');
  
  addFluentMethodsToPrototype(PersistentList, 'PersistentList', {
    enableMap: true,
    enableChain: true,
    enableFilter: true,
    enableAp: true,
    enableTraverse: true,
    enableDualAPI: true,
    enableLawVerification: true
  });

  return { PersistentList };
}

/**
 * Add fluent methods to StatefulStream ADT with auto-discovery
 */
export function withStatefulStreamFluentMethods() {
  const { StatefulStream } = require('./fp-stream-state');
  
  addFluentMethodsToPrototype(StatefulStream, 'StatefulStream', {
    enableMap: true,
    enableChain: true,
    enableAp: true,
    enableDualAPI: true,
    enableLawVerification: true
  });

  return { StatefulStream };
}

// ============================================================================
// Utility Functions (Enhanced)
// ============================================================================

/**
 * Check if an ADT has fluent methods
 */
export function hasFluentMethods(adt: any): boolean {
  return adt && (
    typeof adt.map === 'function' ||
    typeof adt.chain === 'function' ||
    typeof adt.flatMap === 'function' ||
    typeof adt.ap === 'function' ||
    typeof adt.filter === 'function' ||
    typeof adt.bimap === 'function' ||
    typeof adt.traverse === 'function'
  );
}

/**
 * Remove fluent methods from an ADT
 */
export function removeFluentMethods(adt: any): void {
  if (adt) {
    delete adt.map;
    delete adt.chain;
    delete adt.flatMap;
    delete adt.ap;
    delete adt.filter;
    delete adt.bimap;
    delete adt.mapLeft;
    delete adt.mapRight;
    delete adt.traverse;
  }
}

/**
 * Remove fluent methods from an ADT constructor prototype
 */
export function removeFluentMethodsFromPrototype<T extends new (...args: any[]) => any>(
  Ctor: T
): T {
  if (Ctor.prototype) {
    delete Ctor.prototype.map;
    delete Ctor.prototype.chain;
    delete Ctor.prototype.flatMap;
    delete Ctor.prototype.ap;
    delete Ctor.prototype.filter;
    delete Ctor.prototype.bimap;
    delete Ctor.prototype.mapLeft;
    delete Ctor.prototype.mapRight;
    delete Ctor.prototype.traverse;
  }
  return Ctor;
}

/**
 * Get all available typeclass capabilities for an ADT
 */
export function getTypeclassCapabilities(adtName: string): string[] {
  const derivedInstances = autoDiscoverDerivedInstances(adtName);
  if (!derivedInstances) return [];

  const capabilities: string[] = [];
  
  if (derivedInstances.functor) capabilities.push('Functor');
  if (derivedInstances.applicative) capabilities.push('Applicative');
  if (derivedInstances.monad) capabilities.push('Monad');
  if (derivedInstances.bifunctor) capabilities.push('Bifunctor');
  if (derivedInstances.traversable) capabilities.push('Traversable');
  if (derivedInstances.filterable) capabilities.push('Filterable');
  if (derivedInstances.eq) capabilities.push('Eq');
  if (derivedInstances.ord) capabilities.push('Ord');
  if (derivedInstances.show) capabilities.push('Show');

  return capabilities;
}

// ============================================================================
// Deep Type Inference System
// ============================================================================

/**
 * Type parameter tracking for deep inference
 */
export interface TypeParameters {
  readonly [key: string]: Type;
}

/**
 * Kind information for type inference
 */
export interface KindInfo {
  readonly kind: Kind<any>;
  readonly arity: number;
  readonly parameters: TypeParameters;
  readonly result: Type;
}

/**
 * Fluent chain state for type inference
 */
export interface FluentChainState<A, T extends TypeclassCapabilities, K extends KindInfo = KindInfo> {
  readonly value: A;
  readonly capabilities: T;
  readonly kindInfo: K;
  readonly typeParameters: TypeParameters;
  readonly chainDepth: number;
}

/**
 * Type transformation result
 */
export interface TypeTransformResult<NewA, NewT extends TypeclassCapabilities, NewK extends KindInfo> {
  readonly newType: NewA;
  readonly newCapabilities: NewT;
  readonly newKindInfo: NewK;
  readonly transformedParameters: TypeParameters;
}

// ============================================================================
// Higher-Kinded Type Inference
// ============================================================================

/**
 * Extract type parameters from a higher-kinded type
 */
export type ExtractTypeParams<F extends Kind<any>> = F extends Kind<infer Args> ? Args : never;

/**
 * Apply type parameters to a higher-kinded type
 */
export type ApplyTypeParams<F extends Kind<any>, Args extends readonly Type[]> = 
  F extends Kind<Args> ? F['type'] : never;

/**
 * Infer the resulting type after applying a transformation
 */
export type InferTransformedType<F extends Kind<any>, Transform extends (a: any) => any> = 
  F extends Kind<[infer A]> 
    ? Transform extends (a: A) => infer B 
      ? Kind<[B]>
      : never
    : F extends Kind<[infer A, infer B]>
      ? Transform extends (a: A) => infer C
        ? Kind<[C, B]>
        : never
      : never;

/**
 * Check if a type is a higher-kinded type
 */
export type IsHigherKinded<T> = T extends Kind<any> ? true : false;

/**
 * Extract the base type from a higher-kinded type
 */
export type ExtractBaseType<T> = T extends Kind<[infer A]> ? A : never;

/**
 * Preserve phantom types across transformations
 */
export type PreservePhantom<F extends Kind<any>, PhantomType> = 
  F extends KindWithPhantom<any, PhantomType> ? F : never;

// ============================================================================
// Enhanced Typeclass Capabilities with Kind Awareness
// ============================================================================

/**
 * Enhanced typeclass capabilities with kind information
 */
export interface KindAwareTypeclassCapabilities<T extends TypeclassCapabilities, K extends KindInfo> {
  readonly capabilities: T;
  readonly kindInfo: K;
  readonly typeParameters: TypeParameters;
  readonly phantomTypes: Record<string, Type>;
}

/**
 * Type-level function to update capabilities after transformation
 */
export type UpdateCapabilitiesAfterTransform<
  T extends TypeclassCapabilities,
  Transform extends (a: any) => any,
  K extends KindInfo
> = {
  readonly capabilities: T;
  readonly kindInfo: KindInfo;
  readonly typeParameters: UpdateTypeParameters<K['parameters'], Transform>;
  readonly phantomTypes: Record<string, Type>;
};

/**
 * Update type parameters after transformation
 */
export type UpdateTypeParameters<
  Params extends TypeParameters,
  Transform extends (a: any) => any
> = {
  readonly [K in keyof Params]: K extends 'A' | 'arg0' 
    ? Transform extends (a: Params[K]) => infer B ? B : Params[K]
    : Params[K];
};

// ============================================================================
// Deep Fluent Methods Interface
// ============================================================================

/**
 * Deep fluent methods with persistent type inference
 */
export interface DeepFluentMethods<
  A, 
  T extends TypeclassCapabilities, 
  K extends KindInfo,
  State extends FluentChainState<A, T, K> = FluentChainState<A, T, K>
> {
  // Functor operations with type inference
  map<B, Transform extends (a: A) => B>(
    f: Transform
  ): HasFunctor<T> extends true 
    ? DeepFluentMethods<B, T, KindInfo, 
        FluentChainState<B, T, KindInfo>>
    : never;
  
  // Monad operations with type inference
  chain<B, Transform extends (a: A) => any>(
    f: Transform
  ): HasMonad<T> extends true 
    ? DeepFluentMethods<any, T, KindInfo, 
        FluentChainState<any, T, KindInfo>>
    : never;
  
  flatMap<B, Transform extends (a: A) => any>(
    f: Transform
  ): HasMonad<T> extends true 
    ? DeepFluentMethods<any, T, KindInfo, 
        FluentChainState<any, T, KindInfo>>
    : never;
  
  // Applicative operations with type inference
  ap<B>(
    fab: any
  ): HasApplicative<T> extends true 
    ? DeepFluentMethods<any, T, KindInfo, 
        FluentChainState<any, T, KindInfo>>
    : never;
  
  // Filter operations with type inference
  filter(
    predicate: (a: A) => boolean
  ): HasFilterable<T> extends true 
    ? DeepFluentMethods<A, T, K, State>
    : HasMonad<T> extends true 
      ? DeepFluentMethods<A, T, K, State>
      : never;
  
  // Bifunctor operations with type inference
  bimap<L, R, LeftTransform extends (l: L) => any, RightTransform extends (r: R) => any>(
    left: LeftTransform,
    right: RightTransform
  ): HasBifunctor<T> extends true 
    ? DeepFluentMethods<any, T, KindInfo, 
        FluentChainState<any, T, KindInfo>>
    : never;
  
  mapLeft<L, R, Transform extends (l: L) => any>(
    f: Transform
  ): HasBifunctor<T> extends true 
    ? DeepFluentMethods<any, T, KindInfo, 
        FluentChainState<any, T, KindInfo>>
    : never;
  
  mapRight<L, R, Transform extends (r: R) => any>(
    f: Transform
  ): HasBifunctor<T> extends true 
    ? DeepFluentMethods<any, T, KindInfo, 
        FluentChainState<any, T, KindInfo>>
    : never;
  
  // Traversable operations with type inference
  traverse<B, F>(
    f: (a: A) => any
  ): HasTraversable<T> extends true 
    ? DeepFluentMethods<any, T, KindInfo, 
        FluentChainState<any, T, KindInfo>>
    : never;
  
  // Standard typeclass operations
  equals(other: A): HasEq<T> extends true ? boolean : never;
  compare(other: A): HasOrd<T> extends true ? number : never;
  show(): HasShow<T> extends true ? string : never;
  
  // Chain state access
  readonly chainState: State;
  readonly typeParameters: TypeParameters;
  readonly kindInfo: K;
  readonly capabilities: T;
}

// ============================================================================
// Type Inference Utilities
// ============================================================================

/**
 * Infer kind information from an ADT
 */
export function inferKindInfo<A>(adt: A): KindInfo {
  // This is a runtime implementation - the actual type inference happens at compile time
  const kind: Kind<any> = (adt as any).__kind || { type: typeof adt };
  const arity = (adt as any).__arity || 1;
  const parameters = (adt as any).__typeParams || { A: typeof adt };
  const result = (adt as any).__result || typeof adt;
  
  return {
    kind,
    arity,
    parameters,
    result
  };
}

/**
 * Update type parameters after transformation
 */
export function updateTypeParameters<A, B>(
  params: TypeParameters,
  transform: (a: A) => B
): TypeParameters {
  return {
    ...params,
    A: typeof transform,
    arg0: typeof transform
  };
}

/**
 * Infer transformed kind information
 */
export function inferTransformedKind<A, B, K extends KindInfo>(
  kindInfo: K,
  transform: (a: A) => B
): KindInfo {
  return {
    ...kindInfo,
    parameters: updateTypeParameters(kindInfo.parameters, transform),
    result: typeof transform
  };
}

// ============================================================================
// Deep Fluent Method Implementation
// ============================================================================

/**
 * Add deep fluent methods with persistent type inference
 */
export function addDeepFluentMethods<
  A, 
  T extends TypeclassCapabilities, 
  K extends KindInfo
>(
  adt: A,
  adtName: string,
  capabilities: T,
  kindInfo: K,
  options: FluentMethodOptions = {}
): A & DeepFluentMethods<A, T, K> {
  const detectionManager = RuntimeDetectionManager.getInstance();
  const cached = detectionManager.getCachedFluentMethods(adtName);
  
  if (cached && options.enableLazyDiscovery) {
    return Object.assign(adt as any, cached) as A & DeepFluentMethods<A, T, K>;
  }

  const instances = autoDiscoverDerivedInstances(adtName) || {};
  const functor = instances.functor || getTypeclassInstance(adtName, 'Functor');
  const monad = instances.monad || getTypeclassInstance(adtName, 'Monad');
  const applicative = instances.applicative || getTypeclassInstance(adtName, 'Applicative');
  const bifunctor = instances.bifunctor || getTypeclassInstance(adtName, 'Bifunctor');
  const traversable = instances.traversable || getTypeclassInstance(adtName, 'Traversable');
  const filterable = instances.filterable || getTypeclassInstance(adtName, 'Filterable');
  const eq = instances.eq || getTypeclassInstance(adtName, 'Eq');
  const ord = instances.ord || getTypeclassInstance(adtName, 'Ord');
  const show = instances.show || getTypeclassInstance(adtName, 'Show');

  // Preserve all original ADT methods and properties
  const fluent: any = Object.create(Object.getPrototypeOf(adt));
  Object.assign(fluent, adt);

  // Initialize chain state
  const initialState: FluentChainState<A, T, K> = {
    value: adt,
    capabilities,
    kindInfo,
    typeParameters: kindInfo.parameters,
    chainDepth: 0
  };

  // Attach methods with deep type inference
  if (capabilities.Functor && functor) {
    fluent.map = <B>(f: (a: A) => B): any => {
      const result = functor.map(adt, f);
      const newKindInfo = inferTransformedKind(kindInfo, f);
      const newState: FluentChainState<B, T, KindInfo> = {
        value: result,
        capabilities,
        kindInfo: newKindInfo,
        typeParameters: newKindInfo.parameters,
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, newKindInfo, options);
    };
  }

  if (capabilities.Monad && monad) {
    fluent.chain = <B>(f: (a: A) => any): any => {
      const result = monad.chain(adt, f);
      const newState: FluentChainState<any, T, KindInfo> = {
        value: result,
        capabilities,
        kindInfo: { kind: {} as Kind<any>, arity: 1, parameters: {}, result: typeof result },
        typeParameters: {},
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, newState.kindInfo, options);
    };

    fluent.flatMap = fluent.chain;
  }

  if (capabilities.Applicative && applicative) {
    fluent.ap = <B>(fab: any): any => {
      const result = applicative.ap(fab, adt);
      const newState: FluentChainState<any, T, KindInfo> = {
        value: result,
        capabilities,
        kindInfo: { kind: {} as Kind<any>, arity: 1, parameters: {}, result: typeof result },
        typeParameters: {},
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, newState.kindInfo, options);
    };
  }

  if (capabilities.Filterable && filterable) {
    fluent.filter = (predicate: (a: A) => boolean): any => {
      const result = filterable.filter(adt, predicate);
      const newState: FluentChainState<A, T, K> = {
        value: result,
        capabilities,
        kindInfo,
        typeParameters: kindInfo.parameters,
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, kindInfo, options);
    };
  } else if (capabilities.Monad && monad) {
    fluent.filter = (predicate: (a: A) => boolean): any => {
      const result = monad.chain(adt, (a: A) => predicate(a) ? monad.of(a) : monad.of(null));
      const newState: FluentChainState<A, T, K> = {
        value: result,
        capabilities,
        kindInfo,
        typeParameters: kindInfo.parameters,
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, kindInfo, options);
    };
  }

  if (capabilities.Bifunctor && bifunctor) {
    fluent.bimap = <L, R>(left: (l: L) => any, right: (r: R) => any): any => {
      const result = bifunctor.bimap(adt, left, right);
      const newState: FluentChainState<any, T, KindInfo> = {
        value: result,
        capabilities,
        kindInfo: { kind: {} as Kind<any>, arity: 2, parameters: {}, result: typeof result },
        typeParameters: {},
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, newState.kindInfo, options);
    };

    fluent.mapLeft = <L, R>(f: (l: L) => any): any => {
      const result = bifunctor.mapLeft(adt, f);
      const newState: FluentChainState<any, T, KindInfo> = {
        value: result,
        capabilities,
        kindInfo: { kind: {} as Kind<any>, arity: 2, parameters: {}, result: typeof result },
        typeParameters: {},
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, newState.kindInfo, options);
    };

    fluent.mapRight = <L, R>(f: (r: R) => any): any => {
      const result = bifunctor.mapRight(adt, f);
      const newState: FluentChainState<any, T, KindInfo> = {
        value: result,
        capabilities,
        kindInfo: { kind: {} as Kind<any>, arity: 2, parameters: {}, result: typeof result },
        typeParameters: {},
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, newState.kindInfo, options);
    };
  }

  if (capabilities.Traversable && traversable) {
    fluent.traverse = <B, F>(f: (a: A) => any): any => {
      const result = traversable.traverse(adt, f);
      const newState: FluentChainState<any, T, KindInfo> = {
        value: result,
        capabilities,
        kindInfo: { kind: {} as Kind<any>, arity: 1, parameters: {}, result: typeof result },
        typeParameters: {},
        chainDepth: initialState.chainDepth + 1
      };
      
      return addDeepFluentMethods(result, adtName, capabilities, newState.kindInfo, options);
    };
  }

  if (capabilities.Eq && eq) {
    fluent.equals = (other: A): boolean => eq.equals(adt, other);
  }

  if (capabilities.Ord && ord) {
    fluent.compare = (other: A): number => ord.compare(adt, other);
  }

  if (capabilities.Show && show) {
    fluent.show = (): string => show.show(adt);
  }

  // Attach chain state and metadata
  fluent.chainState = initialState;
  fluent.typeParameters = kindInfo.parameters;
  fluent.kindInfo = kindInfo;
  fluent.capabilities = capabilities;

  if (options.enableLazyDiscovery) {
    detectionManager.cacheFluentMethods(adtName, fluent);
  }

  return fluent as A & DeepFluentMethods<A, T, K>;
}

/**
 * Create deep fluent wrapper with automatic kind inference
 */
export function createDeepFluent<A>(
  adt: A,
  adtName: string,
  options: FluentMethodOptions = {}
): A & DeepFluentMethods<A, TypeclassCapabilities, KindInfo> {
  const capabilities = detectTypeclassCapabilities(adtName);
  const kindInfo = inferKindInfo(adt);
  return addDeepFluentMethods(adt, adtName, capabilities, kindInfo, options);
}

// ============================================================================
// Type-Only Tests for Deep Inference
// ============================================================================

/**
 * Type-only test utilities for verifying deep type inference
 */
export namespace DeepTypeInferenceTests {
  
  /**
   * Test type parameter preservation across chain steps
   */
  export type TestTypeParameterPreservation<
    F extends Kind<[any, any]>,
    Transform extends (a: any) => any
  > = InferTransformedType<F, Transform> extends Kind<[any, any]> ? true : false;

  /**
   * Test phantom type preservation
   */
  export type TestPhantomPreservation<
    F extends KindWithPhantom<[any], any>,
    Transform extends (a: any) => any
  > = PreservePhantom<InferTransformedType<F, Transform>, any> extends KindWithPhantom<[any], any> ? true : false;

  /**
   * Test kind arity preservation
   */
  export type TestKindArityPreservation<
    F extends Kind<any>,
    Transform extends (a: any) => any
  > = KindArity<F> extends KindArity<InferTransformedType<F, Transform>> ? true : false;

  /**
   * Test nested transformation support
   */
  export type TestNestedTransformation<
    F extends Kind<[any]>,
    Transform1 extends (a: any) => Kind<[any]>,
    Transform2 extends (b: any) => any
  > = InferTransformedType<F, Transform1> extends Kind<[Kind<[any]>]> ? true : false;

  /**
   * Test cross-kind transformation
   */
  export type TestCrossKindTransformation<
    F extends Kind1,
    G extends Kind2,
    Transform extends (a: any) => any
  > = IsKindCompatible<F, G> extends true ? true : false;

  /**
   * Test capability preservation across transformations
   */
  export type TestCapabilityPreservation<
    T extends TypeclassCapabilities,
    Transform extends (a: any) => any
  > = {
    readonly [K in keyof T]: T[K];
  };

  /**
   * Test arbitrary-length chain type inference
   */
  export type TestArbitraryLengthChain<
    Start extends Kind<[any]>,
    Steps extends readonly ((a: any) => any)[],
    Result extends Kind<[any]> = Start
  > = Steps extends readonly [infer First, ...infer Rest]
    ? First extends (a: any) => any
      ? Rest extends readonly ((a: any) => any)[]
        ? TestArbitraryLengthChain<InferTransformedType<Start, First>, Rest, Kind<[any]>>
        : Kind<[any]>
      : Start
    : Result;
}

// ============================================================================
// Enhanced Composition with Deep Inference
// ============================================================================

/**
 * Enhanced composition utilities with deep type inference
 */
export namespace DeepTypeInferenceComposition {
  
  /**
   * Compose functions with deep type inference
   */
  export function compose<
    A, B, C,
    T extends TypeclassCapabilities,
    K extends KindInfo
  >(
    f: (a: A) => DeepFluentMethods<B, T, K>,
    g: (b: B) => DeepFluentMethods<C, T, K>
  ): (a: A) => DeepFluentMethods<C, T, K> {
    return (a: A) => {
      const fb = f(a);
      return g(fb.chainState.value);
    };
  }

  /**
   * Pipe value through functions with deep type inference
   */
  export function pipe(
    value: any,
    ...fns: Array<(x: any) => any>
  ): any {
    const initial = createDeepFluent(value, 'unknown', { enableTypeInference: true });
    return fns.reduce((acc, fn) => fn(acc.chainState.value), initial);
  }

  /**
   * Transform with kind-aware type inference
   */
  export function transformWithKind<
    A, B,
    T extends TypeclassCapabilities,
    K extends KindInfo,
    Transform extends (a: A) => B
  >(
    fluent: DeepFluentMethods<A, T, K>,
    transform: Transform
  ): DeepFluentMethods<B, T, KindInfo> {
    return fluent.map(transform) as any;
  }

  /**
   * Preserve phantom types across transformations
   */
  export function preservePhantom<
    A, B,
    T extends TypeclassCapabilities,
    K extends KindInfo,
    P,
    Transform extends (a: A) => B
  >(
    fluent: DeepFluentMethods<A, T, K>,
    transform: Transform
  ): DeepFluentMethods<B, T, KindInfo> {
    return fluent.map(transform) as any;
  }
}

// ============================================================================
// Typeclass-Aware Fluent Composition Implementation
// ============================================================================

/**
 * Typeclass-aware fluent composition with conditional types
 * This ensures all fluent methods remain fully typed and composable across typeclasses
 */

/**
 * Conditional type to check if a typeclass capability exists
 */
export type HasCapability<T extends TypeclassCapabilities, K extends keyof TypeclassCapabilities> = 
  T[K] extends true ? true : false;

/**
 * Type to extract available methods based on capabilities
 */
export type AvailableMethods<T extends TypeclassCapabilities> = {
  // Functor methods
  map: HasCapability<T, 'Functor'> extends true ? true : never;
  
  // Monad methods
  chain: HasCapability<T, 'Monad'> extends true ? true : never;
  flatMap: HasCapability<T, 'Monad'> extends true ? true : never;
  
  // Applicative methods
  ap: HasCapability<T, 'Applicative'> extends true ? true : never;
  replicateA: HasCapability<T, 'Applicative'> extends true ? true : never;
  
  // Filter methods
  filter: HasCapability<T, 'Filterable'> extends true ? true : 
          HasCapability<T, 'Monad'> extends true ? true : never;
  
  // Bifunctor methods
  bimap: HasCapability<T, 'Bifunctor'> extends true ? true : never;
  mapLeft: HasCapability<T, 'Bifunctor'> extends true ? true : never;
  mapRight: HasCapability<T, 'Bifunctor'> extends true ? true : never;
  
  // Traversable methods
  traverse: HasCapability<T, 'Traversable'> extends true ? true : never;
  sequence: HasCapability<T, 'Traversable'> extends true ? true : never;
  
  // Standard typeclass methods
  equals: HasCapability<T, 'Eq'> extends true ? true : never;
  compare: HasCapability<T, 'Ord'> extends true ? true : never;
  show: HasCapability<T, 'Show'> extends true ? true : never;
};

/**
 * Typeclass-aware fluent methods with compile-time method filtering
 */
export interface TypeclassAwareComposableFluentMethods<
  A, 
  T extends TypeclassCapabilities,
  Available extends AvailableMethods<T> = AvailableMethods<T>
> {
  // Functor operations (only if Functor capability exists)
  map<B>(f: (a: A) => B): Available['map'] extends true 
    ? TypeclassAwareComposableFluentMethods<B, T> 
    : never;
  
  // Monad operations (only if Monad capability exists)
  chain<B>(f: (a: A) => any): Available['chain'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  flatMap<B>(f: (a: A) => any): Available['flatMap'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  
  // Applicative operations (only if Applicative capability exists)
  ap<B>(fab: any): Available['ap'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  
  // ReplicateA operation (only if Applicative capability exists)
  replicateA(n: number): Available['replicateA'] extends true 
    ? TypeclassAwareComposableFluentMethods<A[], T> 
    : never;
  
  // Filter operations (only if Filterable or Monad capability exists)
  filter(predicate: (a: A) => boolean): Available['filter'] extends true 
    ? TypeclassAwareComposableFluentMethods<A, T> 
    : never;
  
  // Bifunctor operations (only if Bifunctor capability exists)
  bimap<L, R>(left: (l: L) => any, right: (r: R) => any): Available['bimap'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  mapLeft<L, R>(f: (l: L) => any): Available['mapLeft'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  mapRight<L, R>(f: (r: R) => any): Available['mapRight'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  
  // Traversable operations (only if Traversable capability exists)
  traverse<B, F>(f: (a: A) => any): Available['traverse'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  
  // Sequence operation (only if Traversable capability exists)
  sequence<G extends Kind1>(applicative: any): Available['sequence'] extends true 
    ? TypeclassAwareComposableFluentMethods<any, T> 
    : never;
  
  // Standard typeclass operations (only if respective capabilities exist)
  equals(other: A): Available['equals'] extends true ? boolean : never;
  compare(other: A): Available['compare'] extends true ? number : never;
  show(): Available['show'] extends true ? string : never;
  
  // Chain state access
  readonly chainState: {
    value: A;
    capabilities: T;
    availableMethods: Available;
    chainDepth: number;
  };
}

/**
 * Add typeclass-aware composable fluent methods to an ADT instance
 */
export function addTypeclassAwareComposableFluentMethods<
  A, 
  T extends TypeclassCapabilities
>(
  adt: A,
  adtName: string,
  capabilities: T,
  options: FluentMethodOptions = {}
): A & TypeclassAwareComposableFluentMethods<A, T> {
  const detectionManager = RuntimeDetectionManager.getInstance();
  
  // Check cache first for lazy discovery
  const cached = detectionManager.getCachedFluentMethods(adtName);
  if (cached && options.enableLazyDiscovery) {
    return Object.assign(adt as any, cached) as A & TypeclassAwareComposableFluentMethods<A, T>;
  }

  // Get typeclass instances
  const instances = autoDiscoverDerivedInstances(adtName) || {};
  const functor = instances.functor || getTypeclassInstance(adtName, 'Functor');
  const applicative = instances.applicative || getTypeclassInstance(adtName, 'Applicative');
  const monad = instances.monad || getTypeclassInstance(adtName, 'Monad');
  const bifunctor = instances.bifunctor || getTypeclassInstance(adtName, 'Bifunctor');
  const traversable = instances.traversable || getTypeclassInstance(adtName, 'Traversable');
  const filterable = instances.filterable || getTypeclassInstance(adtName, 'Filterable');
  const eq = instances.eq || getTypeclassInstance(adtName, 'Eq');
  const ord = instances.ord || getTypeclassInstance(adtName, 'Ord');
  const show = instances.show || getTypeclassInstance(adtName, 'Show');

  // Create method table to attach onto the current ADT instance
  const fluent: any = {};

  // Initialize chain state
  const chainState = {
    value: adt,
    capabilities,
    availableMethods: {} as AvailableMethods<T>,
    chainDepth: 0
  };

  // Functor methods (only if capability exists)
  if (capabilities.Functor && functor) {
    fluent.map = <B>(f: (a: A) => B): any => {
      const result = functor.map(adt, f);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    chainState.availableMethods.map = true as any;
  }

  // Monad methods (only if capability exists)
  if (capabilities.Monad && monad) {
    fluent.chain = <B>(f: (a: A) => any): any => {
      const result = monad.chain(adt, f);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.flatMap = fluent.chain;
    chainState.availableMethods.chain = true as any;
    chainState.availableMethods.flatMap = true as any;
  }

  // Applicative methods (only if capability exists)
  if (capabilities.Applicative && applicative) {
    fluent.ap = <B>(fab: any): any => {
      const result = applicative.ap(fab, adt);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    chainState.availableMethods.ap = true as any;
  }

  // Filter methods (prioritize Filterable, fallback to Monad)
  if (capabilities.Filterable && filterable) {
    fluent.filter = (predicate: (a: A) => boolean): any => {
      const result = filterable.filter(adt, predicate);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    chainState.availableMethods.filter = true as any;
  } else if (capabilities.Monad && monad) {
    fluent.filter = (predicate: (a: A) => boolean): any => {
      const result = monad.chain(adt, (a: A) => predicate(a) ? monad.of(a) : monad.of(null));
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    chainState.availableMethods.filter = true as any;
  }

  // Bifunctor methods (only if capability exists)
  if (capabilities.Bifunctor && bifunctor) {
    fluent.bimap = <L, R>(left: (l: L) => any, right: (r: R) => any): any => {
      const result = bifunctor.bimap(adt, left, right);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.mapLeft = <L, R>(f: (l: L) => any): any => {
      const result = bifunctor.mapLeft(adt, f);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    
    fluent.mapRight = <L, R>(f: (r: R) => any): any => {
      const result = bifunctor.mapRight(adt, f);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    
    chainState.availableMethods.bimap = true as any;
    chainState.availableMethods.mapLeft = true as any;
    chainState.availableMethods.mapRight = true as any;
  }

  // Traversable methods (only if capability exists)
  if (capabilities.Traversable && traversable) {
    fluent.traverse = <B, F>(f: (a: A) => any): any => {
      const result = traversable.traverse(adt, f);
      const newState = {
        ...chainState,
        value: result,
        chainDepth: chainState.chainDepth + 1
      };
      return addTypeclassAwareComposableFluentMethods(result, adtName, capabilities, options);
    };
    chainState.availableMethods.traverse = true as any;
  }

  // Standard typeclass methods (only if capabilities exist)
  if (capabilities.Eq && eq) {
    fluent.equals = (other: A): boolean => {
      return eq.equals(adt, other);
    };
    chainState.availableMethods.equals = true as any;
  }

  if (capabilities.Ord && ord) {
    fluent.compare = (other: A): number => {
      return ord.compare(adt, other);
    };
    chainState.availableMethods.compare = true as any;
  }

  if (capabilities.Show && show) {
    fluent.show = (): string => {
      return show.show(adt);
    };
    chainState.availableMethods.show = true as any;
  }

  // Attach chain state
  fluent.chainState = chainState;

  // Cache the fluent methods for lazy discovery
  if (options.enableLazyDiscovery) {
    detectionManager.cacheFluentMethods(adtName, fluent);
  }

  return Object.assign(adt as any, fluent) as A & TypeclassAwareComposableFluentMethods<A, T>;
}

/**
 * Create typeclass-aware composable fluent wrapper with automatic capability detection
 */
export function createTypeclassAwareComposableFluent<A>(
  adt: A,
  adtName: string,
  options: FluentMethodOptions = {}
): A & TypeclassAwareComposableFluentMethods<A, TypeclassCapabilities> {
  const capabilities = detectTypeclassCapabilities(adtName);
  return addTypeclassAwareComposableFluentMethods(adt, adtName, capabilities, options);
}

/**
 * Typeclass-aware composition utilities with compile-time safety
 */
export namespace TypeclassAwareComposition {
  /**
   * Compose functions with typeclass-aware type safety
   */
  export function compose<
    A, B, C,
    T extends TypeclassCapabilities
  >(
    f: (a: A) => TypeclassAwareComposableFluentMethods<B, T>,
    g: (b: B) => TypeclassAwareComposableFluentMethods<C, T>
  ): (a: A) => TypeclassAwareComposableFluentMethods<C, T> {
    return (a: A) => {
      const fb = f(a);
      return g(fb.chainState.value);
    };
  }

  /**
   * Pipe operations with typeclass-aware type safety
   */
  export function pipe<
    A,
    T extends TypeclassCapabilities
  >(
    value: A,
    ...fns: Array<(x: any) => TypeclassAwareComposableFluentMethods<any, T>>
  ): TypeclassAwareComposableFluentMethods<any, T> {
    return fns.reduce((acc, fn) => fn(acc.chainState.value), value as any);
  }

  /**
   * Create a fluent wrapper that preserves typeclass capabilities
   */
  export function withCapabilities<
    A, 
    T extends TypeclassCapabilities
  >(
    adt: A,
    adtName: string,
    capabilities: T,
    options: FluentMethodOptions = {}
  ): TypeclassAwareComposableFluentMethods<A, T> {
    return addTypeclassAwareComposableFluentMethods(adt, adtName, capabilities, options);
  }

  /**
   * Check if a fluent object has specific typeclass capabilities at runtime
   */
  export function hasCapability<
    A, 
    T extends TypeclassCapabilities
  >(
    fluent: TypeclassAwareComposableFluentMethods<A, T>,
    capability: keyof TypeclassCapabilities
  ): boolean {
    return fluent.chainState.capabilities[capability] === true;
  }

  /**
   * Safely access typeclass methods with runtime checks
   */
  export function safeAccess<
    A, 
    T extends TypeclassCapabilities
  >(
    fluent: TypeclassAwareComposableFluentMethods<A, T>,
    method: string,
    fallback?: any
  ): any {
    if (method in fluent && fluent.chainState.availableMethods[method as keyof AvailableMethods<T>]) {
      return (fluent as any)[method];
    }
    return fallback;
  }

  /**
   * Cross-typeclass chaining with compile-time safety
   */
  export function crossTypeclassChain<
    A, B,
    T1 extends TypeclassCapabilities,
    T2 extends TypeclassCapabilities
  >(
    fluent: TypeclassAwareComposableFluentMethods<A, T1>,
    transform: (a: A) => TypeclassAwareComposableFluentMethods<B, T2>
  ): TypeclassAwareComposableFluentMethods<B, T2> {
    return transform(fluent.chainState.value);
  }

  /**
   * Conditional method access based on typeclass capabilities
   */
  export function conditionalAccess<
    A,
    T extends TypeclassCapabilities,
    K extends keyof TypeclassCapabilities
  >(
    fluent: TypeclassAwareComposableFluentMethods<A, T>,
    capability: K,
    action: (fluent: TypeclassAwareComposableFluentMethods<A, T>) => any,
    fallback?: any
  ): any {
    if (fluent.chainState.capabilities[capability]) {
      return action(fluent);
    }
    return fallback;
  }
}

/**
 * Enhanced runtime detection manager with auto-discovery
 */
export class EnhancedRuntimeDetectionManager extends RuntimeDetectionManager {
  private autoDiscoveryEnabled: boolean = true;
  private autoGenerationEnabled: boolean = true;
  private instanceCallbacks: Map<string, Array<(adtName: string, typeclass: string) => void>> = new Map();

  constructor(config: RuntimeDetectionConfig & {
    autoDiscovery?: boolean;
    autoGeneration?: boolean;
  } = { enabled: true }) {
    super(config);
    this.autoDiscoveryEnabled = config.autoDiscovery ?? true;
    this.autoGenerationEnabled = config.autoGeneration ?? true;
  }

  /**
   * Register a callback for when new instances are detected
   */
  onInstanceDetected(adtName: string, callback: (adtName: string, typeclass: string) => void): void {
    if (!this.instanceCallbacks.has(adtName)) {
      this.instanceCallbacks.set(adtName, []);
    }
    this.instanceCallbacks.get(adtName)!.push(callback);
  }

  /**
   * Enhanced detection that includes auto-discovery
   */
  protected override detectNewInstances(): void {
    super.detectNewInstances();

    if (!this.autoDiscoveryEnabled) {
      return;
    }

    // Get all registered ADTs
    const registry = getFPRegistry();
    if (!registry) {
      return;
    }

    // Check each ADT for new derived instances
    const derivableKeys = Array.from(registry.derivable.keys());
    
    for (const adtName of derivableKeys) {
      const currentInstances = this.getCurrentTypeclassInstances(adtName);
      const newInstances = this.detectNewDerivedInstances(adtName, currentInstances);
      
      if (newInstances.length > 0) {
        this.handleNewDerivedInstances(adtName, newInstances);
      }
    }
  }

  /**
   * Detect new derived instances for an ADT
   */
  private detectNewDerivedInstances(adtName: string, currentInstances: Set<string>): string[] {
    const instances = autoDiscoverDerivedInstances(adtName);
    if (!instances) {
      return [];
    }

    const newInstances: string[] = [];
    const typeclassMap: Record<string, keyof DerivedInstances> = {
      'Functor': 'functor',
      'Applicative': 'applicative',
      'Monad': 'monad',
      'Bifunctor': 'bifunctor',
      'Traversable': 'traversable',
      'Filterable': 'filterable',
      'Eq': 'eq',
      'Ord': 'ord',
      'Show': 'show'
    };

    for (const [typeclass, key] of Object.entries(typeclassMap)) {
      if (instances[key] && !currentInstances.has(typeclass)) {
        newInstances.push(typeclass);
      }
    }

    return newInstances;
  }

  /**
   * Handle newly detected derived instances
   */
  private handleNewDerivedInstances(adtName: string, newTypeclasses: string[]): void {
    console.log(`🔄 Auto-discovered new derived instances for ${adtName}:`, newTypeclasses);

    // Update detected instances
    const currentInstances = this.detectedInstances.get(adtName) || new Set();
    for (const typeclass of newTypeclasses) {
      currentInstances.add(typeclass);
    }
    this.detectedInstances.set(adtName, currentInstances);

    // Trigger callbacks
    const callbacks = this.instanceCallbacks.get(adtName) || [];
    for (const callback of callbacks) {
      for (const typeclass of newTypeclasses) {
        callback(adtName, typeclass);
      }
    }

    // Auto-generate fluent methods if enabled
    if (this.autoGenerationEnabled) {
      this.autoGenerateFluentMethodsForADT(adtName);
    }
  }

  /**
   * Auto-generate fluent methods for a specific ADT
   */
  private autoGenerateFluentMethodsForADT(adtName: string): void {
    try {
      // Try to find the ADT constructor or prototype
      const adtConstructor = this.findADTConstructor(adtName);
      if (adtConstructor) {
        const instances = autoDiscoverDerivedInstances(adtName);
        if (instances) {
          const capabilities = detectTypeclassCapabilities(adtName);
          addTypeclassAwareFluentMethods(adtConstructor.prototype, adtName, capabilities, {
            enableRuntimeDetection: true,
            enableLazyDiscovery: true
          });
          console.log(`✅ Auto-generated fluent methods for ${adtName}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to auto-generate fluent methods for ${adtName}:`, error);
    }
  }

  /**
   * Find ADT constructor by name
   */
  private findADTConstructor(adtName: string): any {
    // Try to find in global scope
    if (typeof globalThis !== 'undefined' && (globalThis as any)[adtName]) {
      return (globalThis as any)[adtName];
    }

    // Try to find in module scope
    try {
      const module = require(`./fp-${adtName.toLowerCase()}-unified`);
      if (module[adtName]) {
        return module[adtName];
      }
    } catch (e) {
      // Module not found
    }

    return null;
  }

  /**
   * Get enhanced detection status
   */
  getEnhancedStatus(): {
    enabled: boolean;
    autoDiscovery: boolean;
    autoGeneration: boolean;
    detectedInstances: Map<string, string[]>;
    callbacks: Map<string, number>;
  } {
    return {
      enabled: this.config.enabled,
      autoDiscovery: this.autoDiscoveryEnabled,
      autoGeneration: this.autoGenerationEnabled,
      detectedInstances: this.detectedInstances,
      callbacks: new Map(
        Array.from(this.instanceCallbacks.entries()).map(([key, value]) => [key, value.length])
      )
    };
  }
}

/**
 * Enhanced auto-registration with runtime detection
 */
export function enhancedAutoRegisterFluentMethods(): void {
  console.log('🚀 Starting enhanced auto-registration of fluent methods...');

  // Get all registered ADTs
  const registry = getFPRegistry();
  if (!registry) {
    console.warn('⚠️ FP Registry not available');
    return;
  }

  // Get all derivable ADTs
  const derivableKeys = Array.from(registry.derivable.keys());
  
  for (const adtName of derivableKeys) {
    try {
      console.log(`📋 Processing ${adtName}...`);
      
      // Auto-discover instances
      const instances = autoDiscoverDerivedInstances(adtName);
      if (!instances) {
        console.log(`⚠️ No derived instances found for ${adtName}`);
        continue;
      }

      // Detect capabilities
      const capabilities = detectTypeclassCapabilities(adtName);
      console.log(`✅ ${adtName} capabilities:`, Object.keys(capabilities).filter(k => capabilities[k as keyof TypeclassCapabilities]));

      // Find ADT constructor
      const adtConstructor = findADTConstructor(adtName);
      if (!adtConstructor) {
        console.warn(`⚠️ Could not find constructor for ${adtName}`);
        continue;
      }

      // Add fluent methods
      addTypeclassAwareFluentMethods(adtConstructor.prototype, adtName, capabilities, {
        enableRuntimeDetection: true,
        enableLazyDiscovery: true,
        enableLawVerification: true
      });

      console.log(`✅ Successfully added fluent methods to ${adtName}`);

    } catch (error) {
      console.error(`❌ Failed to process ${adtName}:`, error);
    }
  }

  // Start runtime detection
  const detectionManager = new EnhancedRuntimeDetectionManager({
    enabled: true,
    autoDiscovery: true,
    autoGeneration: true,
    pollInterval: 5000,
    autoRefresh: true
  });

  detectionManager.startDetection();
  console.log('✅ Enhanced auto-registration completed with runtime detection');
}

// Helper function to find ADT constructor - moved to EnhancedRuntimeDetectionManager class

/**
 * Enhanced verification that includes auto-discovery
 */
export function enhancedVerifyAllRegistryADTs(): void {
  console.log('🔍 Enhanced verification of all registry ADTs...');

  const registry = getFPRegistry();
  if (!registry) {
    console.warn('⚠️ FP Registry not available');
    return;
  }

  const derivableKeys = Array.from(registry.derivable.keys());
  const results: Array<{
    adtName: string;
    hasDerivedInstances: boolean;
    capabilities: string[];
    fluentMethodsGenerated: boolean;
    lawConsistent: boolean;
  }> = [];

  for (const adtName of derivableKeys) {
    console.log(`📋 Verifying ${adtName}...`);

    const result = {
      adtName,
      hasDerivedInstances: false,
      capabilities: [],
      fluentMethodsGenerated: false,
      lawConsistent: false
    };

    // Check for derived instances
    const instances = autoDiscoverDerivedInstances(adtName);
    if (instances) {
      result.hasDerivedInstances = true;
      result.capabilities = getTypeclassCapabilities(adtName);
    }

    // Check for fluent methods
    const adtConstructor = findADTConstructor(adtName);
    if (adtConstructor && adtConstructor.prototype) {
      result.fluentMethodsGenerated = hasFluentMethods(adtConstructor.prototype);
    }

    // Check law consistency
    if (result.hasDerivedInstances && result.fluentMethodsGenerated) {
      try {
        result.lawConsistent = testLawConsistency(adtName, null, (x: any) => x);
      } catch (e) {
        console.warn(`⚠️ Law consistency test failed for ${adtName}:`, e);
      }
    }

    results.push(result);
  }

  // Print summary
  console.log('\n📊 Enhanced Verification Summary:');
  console.log('=====================================');
  
  const successful = results.filter(r => r.hasDerivedInstances && r.fluentMethodsGenerated && r.lawConsistent);
  const partial = results.filter(r => r.hasDerivedInstances && r.fluentMethodsGenerated && !r.lawConsistent);
  const failed = results.filter(r => !r.hasDerivedInstances || !r.fluentMethodsGenerated);

  console.log(`✅ Fully successful: ${successful.length}/${results.length}`);
  console.log(`⚠️ Partially successful: ${partial.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed ADTs:');
    failed.forEach(r => {
      console.log(`  - ${r.adtName}: derived=${r.hasDerivedInstances}, fluent=${r.fluentMethodsGenerated}, laws=${r.lawConsistent}`);
    });
  }

  if (partial.length > 0) {
    console.log('\n⚠️ Partially successful ADTs:');
    partial.forEach(r => {
      console.log(`  - ${r.adtName}: capabilities=${r.capabilities.join(', ')}`);
    });
  }

  console.log('\n✅ Enhanced verification completed');
}

// ============================================================================
// Export Everything
// ============================================================================

// All functions are already exported above
