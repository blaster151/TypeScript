/**
 * Typeclass-Driven Optimization System
 * 
 * This module implements typeclass-driven optimization passes for both lazy and eager ADTs,
 * leveraging the registry metadata to perform operation fusion and reduce intermediate allocations.
 * 
 * Features:
 * - Optimization hooks in the typeclass registry
 * - Pluggable optimization system with custom fusion rules
 * - Lazy and eager evaluation mode detection
 * - Operation fusion for adjacent transformations
 * - Single-pass loop generation for eager collections
 * - Referential transparency preservation
 * - Zero-cost abstractions with minimal runtime overhead
 * - Comprehensive testing and benchmarking
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

// ============================================================================
// Core Optimization Types
// ============================================================================

/**
 * Evaluation mode for ADTs
 */
export type EvaluationMode = 'Lazy' | 'Eager';

/**
 * Chain representation for optimization
 */
export interface ChainRepresentation {
  operations: Operation[];
  metadata: {
    adtName: string;
    typeclass: string;
    evaluationMode: EvaluationMode;
    typeParameters: any[];
    phantomTypes: Record<string, any>;
  };
  context: OptimizationContext;
}

/**
 * Optimization metadata for typeclass instances
 */
export interface OptimizationMetadata {
  evaluationMode: EvaluationMode;
  canFuse: boolean;
  fusionRules: FusionRule[];
  optimizationHooks: OptimizationHook[];
  performanceProfile: PerformanceProfile;
}

/**
 * Fusion rule for combining operations
 */
export interface FusionRule {
  name: string;
  description: string;
  applicable: (ops: Operation[]) => boolean;
  fuse: (ops: Operation[]) => Operation;
  preservesSemantics: boolean;
  performanceGain: number; // 0-1 scale
}

/**
 * Operation representation for optimization
 */
export interface Operation {
  type: string;
  fn: any;
  metadata: {
    isPure: boolean;
    hasSideEffects: boolean;
    complexity: number;
    allocationCost: number;
  };
  dependencies: string[];
  outputType: any;
}

/**
 * Apply an operation to a collection with correct semantics per operation kind.
 * - map: element -> element
 * - filter: element -> boolean
 * - filterMap: element -> element | undefined (undefined drops)
 * - chain/flatMap: element -> collection (flatten one level)
 */
function applyOperation(collection: any[], op: Operation): any[] {
  switch (op.type) {
    case 'map':
      return collection.map(op.fn);
    case 'filter':
      return collection.filter(op.fn);
    case 'filterMap': {
      const out: any[] = [];
      for (const item of collection) {
        const mapped = op.fn(item);
        if (mapped !== undefined) out.push(mapped);
      }
      return out;
    }
    case 'chain':
    case 'flatMap': {
      const out: any[] = [];
      for (const item of collection) {
        const inner = op.fn(item);
        if (Array.isArray(inner)) out.push(...inner);
        else if (inner !== undefined && inner !== null) out.push(inner);
      }
      return out;
    }
    default:
      // Fallback: treat as element transform
      return collection.map(op.fn);
  }
}

/**
 * Optimization hook for typeclass instances
 */
export interface OptimizationHook {
  name: string;
  priority: number;
  condition: (pipeline: Operation[], context: OptimizationContext) => boolean;
  optimize: (pipeline: Operation[], context: OptimizationContext) => OptimizationResult;
}

/**
 * Optimization context
 */
export interface OptimizationContext {
  adtName: string;
  typeclass: string;
  evaluationMode: EvaluationMode;
  targetPerformance: 'speed' | 'memory' | 'balanced';
  maxOptimizationPasses: number;
  preserveOrder: boolean;
  allowInlining: boolean;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  optimized: boolean;
  pipeline: Operation[];
  performanceGain: number;
  memoryReduction: number;
  semanticPreserved: boolean;
  optimizationSteps: OptimizationStep[];
}

/**
 * Optimization step for tracking changes
 */
export interface OptimizationStep {
  step: number;
  rule: string;
  description: string;
  before: Operation[];
  after: Operation[];
  performanceImpact: number;
}

/**
 * Performance profile for optimization decisions
 */
export interface PerformanceProfile {
  evaluationCost: number; // 0-1 scale
  memoryOverhead: number; // 0-1 scale
  fusionEfficiency: number; // 0-1 scale
  inliningPotential: number; // 0-1 scale
  optimizationComplexity: number; // 0-1 scale
}

// ============================================================================
// Pluggable Optimization System
// ============================================================================

/**
 * Optimization plugin interface for extensible optimization
 */
export interface OptimizationPlugin<T = any> {
  /** Target ADT type that matches registry key */
  targetType: string;
  
  /** Plugin name for identification */
  name: string;
  
  /** Plugin version for compatibility */
  version: string;
  
  /** Priority for plugin execution order (higher = earlier) */
  priority: number;
  
  /** Optional function that merges adjacent operations for this type */
  fusePipeline?: (ops: Operation[], context: OptimizationContext) => Operation[];
  
  /** Optional transformation of the full chain before evaluation */
  preExecution?: (chain: ChainRepresentation) => ChainRepresentation;
  
  /** Optional post-processing of the final result */
  postExecution?: (result: any, context: OptimizationContext) => any;
  
  /** Check if this plugin can handle the given operations */
  canHandle?: (ops: Operation[], context: OptimizationContext) => boolean;
  
  /** Get optimization metadata for this plugin */
  getOptimizationMetadata?: () => OptimizationMetadata;
  
  /** Plugin initialization (optional) */
  initialize?: (registry: any) => void;
  
  /** Plugin cleanup (optional) */
  cleanup?: () => void;
}

/**
 * Plugin registry for managing optimization plugins
 */
export interface PluginRegistry {
  /** Register a new optimization plugin */
  registerPlugin(plugin: OptimizationPlugin): void;
  
  /** Unregister a plugin by name */
  unregisterPlugin(pluginName: string): void;
  
  /** Get all plugins for a specific ADT type */
  getPluginsForType(targetType: string): OptimizationPlugin[];
  
  /** Get all registered plugins */
  getAllPlugins(): OptimizationPlugin[];
  
  /** Check if a plugin is registered */
  hasPlugin(pluginName: string): boolean;
  
  /** Get plugin by name */
  getPlugin(pluginName: string): OptimizationPlugin | undefined;
}

/**
 * Extended typeclass instance with plugin support
 */
export interface OptimizableTypeclassInstance {
  // Standard typeclass methods
  map?: <A, B>(fa: any, f: (a: A) => B) => any;
  chain?: <A, B>(fa: any, f: (a: A) => any) => any;
  ap?: <A, B>(fab: any, fa: any) => any;
  filter?: <A>(fa: any, predicate: (a: A) => boolean) => any;
  bimap?: <A, B, C, D>(fa: any, f: (a: A) => C, g: (b: B) => D) => any;
  
  // Optimization hooks
  optimizePipeline?: (pipeline: Operation[], context: OptimizationContext) => OptimizationResult;
  canOptimize?: (pipeline: Operation[]) => boolean;
  getOptimizationMetadata?: () => OptimizationMetadata;
  
  // Plugin support
  optimizationPlugins?: OptimizationPlugin[];
  registerOptimizationPlugin?: (plugin: OptimizationPlugin) => void;
  unregisterOptimizationPlugin?: (pluginName: string) => void;
  
  // Performance hints
  isLazy?: boolean;
  isEager?: boolean;
  supportsFusion?: boolean;
  supportsInlining?: boolean;
}

/**
 * Extended FP registry with plugin support
 */
export interface OptimizableFPRegistry {
  // Standard registry methods
  getTypeclassInstance(name: string, typeclass: string): OptimizableTypeclassInstance | undefined;
  registerOptimizationHook(adtName: string, typeclass: string, hook: OptimizationHook): void;
  getOptimizationMetadata(adtName: string, typeclass: string): OptimizationMetadata | undefined;
  
  // Plugin registry methods
  registerOptimizationPlugin(plugin: OptimizationPlugin): void;
  unregisterOptimizationPlugin(pluginName: string): void;
  getOptimizationPlugins(adtName: string): OptimizationPlugin[];
  
  // Optimization methods
  optimizePipeline(adtName: string, typeclass: string, pipeline: Operation[], context: OptimizationContext): OptimizationResult;
  canOptimize(adtName: string, typeclass: string, pipeline: Operation[]): boolean;
  getEvaluationMode(adtName: string, typeclass: string): EvaluationMode;
}

// ============================================================================
// Built-in Fusion Rules
// ============================================================================

/**
 * Map-Map fusion: map(f) >> map(g) = map(f >> g)
 */
export const mapMapFusion: FusionRule = {
  name: 'mapMapFusion',
  description: 'Fuse consecutive map operations into a single map',
  applicable: (ops: Operation[]) => {
    if (ops.length < 2) return false;
    return ops[0].type === 'map' && ops[1].type === 'map';
  },
  fuse: (ops: Operation[]) => {
    const [map1, map2] = ops;
    const composedFn = (x: any) => map2.fn(map1.fn(x));
    
    return {
      type: 'map',
      fn: composedFn,
      metadata: {
        isPure: map1.metadata.isPure && map2.metadata.isPure,
        hasSideEffects: map1.metadata.hasSideEffects || map2.metadata.hasSideEffects,
        complexity: Math.max(map1.metadata.complexity, map2.metadata.complexity),
        allocationCost: map1.metadata.allocationCost + map2.metadata.allocationCost
      },
      dependencies: [...map1.dependencies, ...map2.dependencies],
      outputType: map2.outputType
    };
  },
  preservesSemantics: true,
  performanceGain: 0.3
};

/**
 * Map-Filter fusion: map(f) >> filter(p) = filterMap(f, p)
 */
export const mapFilterFusion: FusionRule = {
  name: 'mapFilterFusion',
  description: 'Fuse map followed by filter into a single filterMap operation',
  applicable: (ops: Operation[]) => {
    if (ops.length < 2) return false;
    return ops[0].type === 'map' && ops[1].type === 'filter';
  },
  fuse: (ops: Operation[]) => {
    const [mapOp, filterOp] = ops;
    const filterMapFn = (x: any) => {
      const mapped = mapOp.fn(x);
      return filterOp.fn(mapped) ? mapped : undefined;
    };
    
    return {
      type: 'filterMap',
      fn: filterMapFn,
      metadata: {
        isPure: mapOp.metadata.isPure && filterOp.metadata.isPure,
        hasSideEffects: mapOp.metadata.hasSideEffects || filterOp.metadata.hasSideEffects,
        complexity: Math.max(mapOp.metadata.complexity, filterOp.metadata.complexity),
        allocationCost: mapOp.metadata.allocationCost + filterOp.metadata.allocationCost
      },
      dependencies: [...mapOp.dependencies, ...filterOp.dependencies],
      outputType: mapOp.outputType
    };
  },
  preservesSemantics: true,
  performanceGain: 0.4
};

/**
 * Filter-Filter fusion: filter(p1) >> filter(p2) = filter(p1 && p2)
 */
export const filterFilterFusion: FusionRule = {
  name: 'filterFilterFusion',
  description: 'Fuse consecutive filter operations into a single filter',
  applicable: (ops: Operation[]) => {
    if (ops.length < 2) return false;
    return ops[0].type === 'filter' && ops[1].type === 'filter';
  },
  fuse: (ops: Operation[]) => {
    const [filter1, filter2] = ops;
    const combinedPredicate = (x: any) => filter1.fn(x) && filter2.fn(x);
    
    return {
      type: 'filter',
      fn: combinedPredicate,
      metadata: {
        isPure: filter1.metadata.isPure && filter2.metadata.isPure,
        hasSideEffects: filter1.metadata.hasSideEffects || filter2.metadata.hasSideEffects,
        complexity: Math.max(filter1.metadata.complexity, filter2.metadata.complexity),
        allocationCost: filter1.metadata.allocationCost + filter2.metadata.allocationCost
      },
      dependencies: [...filter1.dependencies, ...filter2.dependencies],
      outputType: filter1.outputType
    };
  },
  preservesSemantics: true,
  performanceGain: 0.2
};

// Note: chain-map fusion requires f to return a collection (flatMap semantics).
// Without enforcing that contract across sources, this rule is disabled to avoid incorrect behavior.

// ============================================================================
// Built-in Optimization Hooks
// ============================================================================

/**
 * Lazy optimization hook for Observable-like types
 */
export const lazyOptimizationHook: OptimizationHook = {
  name: 'lazyOptimization',
  priority: 1,
  condition: (pipeline: Operation[], context: OptimizationContext) => {
    return context.evaluationMode === 'Lazy' && pipeline.length > 1;
  },
  optimize: (pipeline: Operation[], context: OptimizationContext) => {
    const steps: OptimizationStep[] = [];
    let optimizedPipeline = [...pipeline];
    let performanceGain = 0;
    let memoryReduction = 0;
    
    // Apply fusion rules
    const fusionRules = [mapMapFusion, mapFilterFusion, filterFilterFusion];
    
    for (const rule of fusionRules) {
      let changed = false;
      let i = 0;
      
      while (i < optimizedPipeline.length - 1) {
        const window = optimizedPipeline.slice(i, i + 2);
        if (rule.applicable(window)) {
          const fused = rule.fuse(window);
          optimizedPipeline.splice(i, 2, fused);
          
          steps.push({
            step: steps.length + 1,
            rule: rule.name,
            description: rule.description,
            before: window,
            after: [fused],
            performanceImpact: rule.performanceGain
          });
          
          performanceGain += rule.performanceGain;
          memoryReduction += 0.1;
          changed = true;
        } else {
          i++;
        }
      }
      
      if (!changed) break;
    }
    
    return {
      optimized: optimizedPipeline.length < pipeline.length,
      pipeline: optimizedPipeline,
      performanceGain,
      memoryReduction,
      semanticPreserved: true,
      optimizationSteps: steps
    };
  }
};

/**
 * Eager optimization hook for Array-like types
 */
export const eagerOptimizationHook: OptimizationHook = {
  name: 'eagerOptimization',
  priority: 2,
  condition: (pipeline: Operation[], context: OptimizationContext) => {
    return context.evaluationMode === 'Eager' && pipeline.length > 1;
  },
  optimize: (pipeline: Operation[], context: OptimizationContext) => {
    const steps: OptimizationStep[] = [];
    let optimizedPipeline = [...pipeline];
    let performanceGain = 0;
    let memoryReduction = 0;
    
    // Try to generate single-pass operation
    const singlePassOp = generateSinglePassOperation(optimizedPipeline);
    if (singlePassOp) {
      steps.push({
        step: 1,
        rule: 'singlePassGeneration',
        description: 'Generate single-pass loop for eager collection',
        before: optimizedPipeline,
        after: [singlePassOp],
        performanceImpact: 0.5
      });
      
      optimizedPipeline = [singlePassOp];
      performanceGain = 0.5;
      memoryReduction = 0.3;
    }
    
    // Apply fusion rules for remaining operations
    const fusionRules = [mapMapFusion, filterFilterFusion];
    
    for (const rule of fusionRules) {
      let changed = false;
      let i = 0;
      
      while (i < optimizedPipeline.length - 1) {
        const window = optimizedPipeline.slice(i, i + 2);
        if (rule.applicable(window)) {
          const fused = rule.fuse(window);
          optimizedPipeline.splice(i, 2, fused);
          
          steps.push({
            step: steps.length + 1,
            rule: rule.name,
            description: rule.description,
            before: window,
            after: [fused],
            performanceImpact: rule.performanceGain
          });
          
          performanceGain += rule.performanceGain;
          memoryReduction += 0.1;
          changed = true;
        } else {
          i++;
        }
      }
      
      if (!changed) break;
    }
    
    return {
      optimized: optimizedPipeline.length < pipeline.length,
      pipeline: optimizedPipeline,
      performanceGain,
      memoryReduction,
      semanticPreserved: true,
      optimizationSteps: steps
    };
  }
};

/**
 * Inlining optimization hook for pure functions
 */
export const inliningOptimizationHook: OptimizationHook = {
  name: 'inliningOptimization',
  priority: 3,
  condition: (pipeline: Operation[], context: OptimizationContext) => {
    return context.allowInlining && pipeline.some(op => op.metadata.isPure && op.metadata.complexity <= 1);
  },
  optimize: (pipeline: Operation[], context: OptimizationContext) => {
    const steps: OptimizationStep[] = [];
    let optimizedPipeline = [...pipeline];
    let performanceGain = 0;
    let memoryReduction = 0;
    
    for (let i = 0; i < optimizedPipeline.length; i++) {
      const op = optimizedPipeline[i];
      if (op.metadata.isPure && op.metadata.complexity <= 1) {
        const inlined = inlineFunction(op);
        if (inlined) {
          steps.push({
            step: steps.length + 1,
            rule: 'functionInlining',
            description: 'Inline simple pure function',
            before: [op],
            after: [inlined],
            performanceImpact: 0.1
          });
          
          optimizedPipeline[i] = inlined;
          performanceGain += 0.1;
          memoryReduction += 0.05;
        }
      }
    }
    
    return {
      optimized: performanceGain > 0,
      pipeline: optimizedPipeline,
      performanceGain,
      memoryReduction,
      semanticPreserved: true,
      optimizationSteps: steps
    };
  }
};

// ============================================================================
// Plugin Registry Implementation
// ============================================================================

/**
 * Global plugin registry implementation
 */
class GlobalPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, OptimizationPlugin>();
  private typePlugins = new Map<string, OptimizationPlugin[]>();

  registerPlugin(plugin: OptimizationPlugin): void {
    this.plugins.set(plugin.name, plugin);
    
    // Index by target type
    if (!this.typePlugins.has(plugin.targetType)) {
      this.typePlugins.set(plugin.targetType, []);
    }
    this.typePlugins.get(plugin.targetType)!.push(plugin);
    
    // Sort by priority (higher priority first)
    this.typePlugins.get(plugin.targetType)!.sort((a, b) => b.priority - a.priority);
  }

  unregisterPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      this.plugins.delete(pluginName);
      
      // Remove from type index
      const typePlugins = this.typePlugins.get(plugin.targetType);
      if (typePlugins) {
        const index = typePlugins.findIndex(p => p.name === pluginName);
        if (index !== -1) {
          typePlugins.splice(index, 1);
        }
      }
    }
  }

  getPluginsForType(targetType: string): OptimizationPlugin[] {
    return this.typePlugins.get(targetType) || [];
  }

  getAllPlugins(): OptimizationPlugin[] {
    return Array.from(this.plugins.values());
  }

  hasPlugin(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  getPlugin(pluginName: string): OptimizationPlugin | undefined {
    return this.plugins.get(pluginName);
  }
}

// Global plugin registry instance
const globalPluginRegistry = new GlobalPluginRegistry();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate single-pass operation for eager collections
 */
export function generateSinglePassOperation(pipeline: Operation[]): Operation | null {
  if (pipeline.length < 2) return null;
  
  // Check if all operations are compatible with single-pass
  const compatibleOps = pipeline.every(op => 
    ['map', 'filter', 'filterMap'].includes(op.type) && op.metadata.isPure
  );
  
  if (!compatibleOps) return null;
  
  const combinedFn = (collection: any[]) => {
    const result: any[] = [];
    
    for (let i = 0; i < collection.length; i++) {
      let value = collection[i];
      let include = true;
      
      for (const op of pipeline) {
        switch (op.type) {
          case 'map':
            value = op.fn(value);
            break;
          case 'filter':
            if (!op.fn(value)) {
              include = false;
              break;
            }
            break;
          case 'filterMap':
            const mapped = op.fn(value);
            if (mapped === null || mapped === undefined) {
              include = false;
              break;
            }
            value = mapped;
            break;
        }
      }
      
      if (include) {
        result.push(value);
      }
    }
    
    return result;
  };
  
  return {
    type: 'singlePass',
    fn: combinedFn,
    metadata: {
      isPure: true,
      hasSideEffects: false,
      complexity: pipeline.reduce((sum, op) => sum + op.metadata.complexity, 0),
      allocationCost: pipeline.reduce((sum, op) => sum + op.metadata.allocationCost, 0)
    },
    dependencies: pipeline.flatMap(op => op.dependencies),
    outputType: pipeline[pipeline.length - 1].outputType
  };
}

/**
 * Inline simple pure functions
 */
export function inlineFunction(op: Operation): Operation | null {
  if (!op.metadata.isPure || op.metadata.complexity > 1) return null;
  
  // For now, just return the original operation
  // In a real implementation, this would analyze the function and inline it
  return op;
}

/**
 * Detect evaluation mode from typeclass instance
 */
export function detectEvaluationMode(instance: any): EvaluationMode {
  // Heuristic detection based on instance properties
  if (instance.isLazy || instance.subscribe || instance.run) {
    return 'Lazy';
  }
  
  if (instance.isEager || instance.map || instance.chain) {
    return 'Eager';
  }
  
  // Default to eager for unknown types
  return 'Eager';
}

/**
 * Create optimization metadata for a typeclass instance
 */
export function createOptimizationMetadata(
  instance: any, 
  evaluationMode: EvaluationMode
): OptimizationMetadata {
  const performanceProfile: PerformanceProfile = {
    evaluationCost: evaluationMode === 'Lazy' ? 0.1 : 0.8,
    memoryOverhead: evaluationMode === 'Lazy' ? 0.3 : 0.1,
    fusionEfficiency: 0.7,
    inliningPotential: 0.5,
    optimizationComplexity: 0.3
  };
  
  return {
    evaluationMode,
    canFuse: true,
    fusionRules: [mapMapFusion, mapFilterFusion, filterFilterFusion],
    optimizationHooks: evaluationMode === 'Lazy' ? [lazyOptimizationHook] : [eagerOptimizationHook],
    performanceProfile
  };
}

// ============================================================================
// Core Optimization Engine
// ============================================================================

/**
 * Optimize pipeline using registered plugins and hooks
 */
export function optimizePipeline(
  adtName: string,
  typeclass: string,
  pipeline: Operation[],
  context: OptimizationContext
): OptimizationResult {
  // Optional reachability tracing
  try {
    // Defer import to avoid module cycles and keep optional
    const { fusibilityStats } = require('./src/fusionReachability');
    if ((context as any).enableTracing && (context as any).traceToConsole) {
      const { operators, reachablePairs } = fusibilityStats();
      // eslint-disable-next-line no-console
      console.log(`🧭 Fusibility reachability: ${reachablePairs} reachable pairs across ${operators} operators`);
    }
  } catch {}

  const steps: OptimizationStep[] = [];
  let optimizedPipeline = [...pipeline];
  let totalPerformanceGain = 0;
  let totalMemoryReduction = 0;
  
  // Get plugins for this ADT type
  const plugins = globalPluginRegistry.getPluginsForType(adtName);
  
  // Apply plugin pre-execution transformations
  for (const plugin of plugins) {
    if (plugin.preExecution) {
      const chain: ChainRepresentation = {
        operations: optimizedPipeline,
        metadata: {
          adtName,
          typeclass,
          evaluationMode: context.evaluationMode,
          typeParameters: [],
          phantomTypes: {}
        },
        context
      };
      
      const transformed = plugin.preExecution(chain);
      if (transformed.operations !== optimizedPipeline) {
        steps.push({
          step: steps.length + 1,
          rule: `plugin:${plugin.name}:preExecution`,
          description: `Pre-execution transformation by ${plugin.name}`,
          before: optimizedPipeline,
          after: transformed.operations,
          performanceImpact: 0.1
        });
        
        optimizedPipeline = transformed.operations;
        totalPerformanceGain += 0.1;
      }
    }
  }
  
  // Apply plugin fusion rules
  for (const plugin of plugins) {
    if (plugin.fusePipeline && plugin.canHandle?.(optimizedPipeline, context)) {
      const fused = plugin.fusePipeline(optimizedPipeline, context);
      if (fused.length < optimizedPipeline.length) {
        steps.push({
          step: steps.length + 1,
          rule: `plugin:${plugin.name}:fusePipeline`,
          description: `Pipeline fusion by ${plugin.name}`,
          before: optimizedPipeline,
          after: fused,
          performanceImpact: 0.2
        });
        
        optimizedPipeline = fused;
        totalPerformanceGain += 0.2;
        totalMemoryReduction += 0.1;
      }
    }
  }
  
  // Apply built-in optimization hooks
  const instance = getTypeclassInstance(adtName, typeclass);
  if (instance?.getOptimizationMetadata) {
    const metadata = instance.getOptimizationMetadata();
    
    for (const hook of metadata.optimizationHooks) {
      if (hook.condition(optimizedPipeline, context)) {
        const result = hook.optimize(optimizedPipeline, context);
        if (result.optimized) {
          steps.push(...result.optimizationSteps);
          optimizedPipeline = result.pipeline;
          totalPerformanceGain += result.performanceGain;
          totalMemoryReduction += result.memoryReduction;
        }
      }
    }
  }
  
  // Apply plugin post-execution transformations
  for (const plugin of plugins) {
    if (plugin.postExecution) {
      // Note: postExecution is called during actual execution, not during optimization
      // This is just for tracking purposes
      steps.push({
        step: steps.length + 1,
        rule: `plugin:${plugin.name}:postExecution`,
        description: `Post-execution transformation by ${plugin.name}`,
        before: optimizedPipeline,
        after: optimizedPipeline, // No change during optimization phase
        performanceImpact: 0.05
      });
      
      totalPerformanceGain += 0.05;
    }
  }
  
  return {
    optimized: optimizedPipeline.length < pipeline.length || totalPerformanceGain > 0,
    pipeline: optimizedPipeline,
    performanceGain: totalPerformanceGain,
    memoryReduction: totalMemoryReduction,
    semanticPreserved: true,
    optimizationSteps: steps
  };
}

/**
 * Check if pipeline can be optimized
 */
export function canOptimizePipeline(
  adtName: string,
  typeclass: string,
  pipeline: Operation[]
): boolean {
  if (pipeline.length < 2) return false;
  
  // Check if any plugins can handle this pipeline
  const plugins = globalPluginRegistry.getPluginsForType(adtName);
  for (const plugin of plugins) {
    if (plugin.canHandle?.(pipeline, { adtName, typeclass } as OptimizationContext)) {
      return true;
    }
  }
  
  // Check built-in optimization hooks
  const instance = getTypeclassInstance(adtName, typeclass);
  if (instance?.getOptimizationMetadata) {
    const metadata = instance.getOptimizationMetadata();
    return metadata.optimizationHooks.some(hook => hook.condition(pipeline, {} as OptimizationContext));
  }
  
  return false;
}

/**
 * Get evaluation mode for an ADT
 */
export function getEvaluationMode(adtName: string, typeclass: string): EvaluationMode {
  const instance = getTypeclassInstance(adtName, typeclass);
  if (instance?.getOptimizationMetadata) {
    return instance.getOptimizationMetadata().evaluationMode;
  }
  
  // Fallback to heuristic detection
  if (instance) {
    return detectEvaluationMode(instance);
  }
  
  return 'Eager';
}

/**
 * Register optimization hooks with the FP registry
 */
export function registerOptimizationHooks(
  adtName: string,
  typeclass: string,
  hooks: OptimizationHook[]
): void {
  const instance = getTypeclassInstance(adtName, typeclass);
  if (instance) {
    // Extend the instance with optimization capabilities
    const optimizableInstance = instance as OptimizableTypeclassInstance;
    
    if (!optimizableInstance.getOptimizationMetadata) {
      const evaluationMode = detectEvaluationMode(instance);
      const metadata = createOptimizationMetadata(instance, evaluationMode);
      
      optimizableInstance.getOptimizationMetadata = () => metadata;
    }
    
    // Add hooks to the metadata
    const metadata = optimizableInstance.getOptimizationMetadata();
    metadata.optimizationHooks.push(...hooks);
  }
}

// ============================================================================
// Plugin Management Functions
// ============================================================================

/**
 * Register an optimization plugin
 */
export function registerOptimizationPlugin(plugin: OptimizationPlugin): void {
  globalPluginRegistry.registerPlugin(plugin);
  
  // Initialize plugin if it has an initialize method
  if (plugin.initialize) {
    const registry = getFPRegistry();
    if (registry) {
      plugin.initialize(registry);
    }
  }
}

/**
 * Unregister an optimization plugin
 */
export function unregisterOptimizationPlugin(pluginName: string): void {
  const plugin = globalPluginRegistry.getPlugin(pluginName);
  if (plugin?.cleanup) {
    plugin.cleanup();
  }
  
  globalPluginRegistry.unregisterPlugin(pluginName);
}

/**
 * Get all plugins for a specific ADT type
 */
export function getOptimizationPlugins(adtName: string): OptimizationPlugin[] {
  return globalPluginRegistry.getPluginsForType(adtName);
}

/**
 * Get all registered plugins
 */
export function getAllOptimizationPlugins(): OptimizationPlugin[] {
  return globalPluginRegistry.getAllPlugins();
}

/**
 * Check if a plugin is registered
 */
export function hasOptimizationPlugin(pluginName: string): boolean {
  return globalPluginRegistry.hasPlugin(pluginName);
}

/**
 * Get plugin by name
 */
export function getOptimizationPlugin(pluginName: string): OptimizationPlugin | undefined {
  return globalPluginRegistry.getPlugin(pluginName);
}

// ============================================================================
// Integration with Fluent API
// ============================================================================

/**
 * Optimize fluent chain operations
 */
export function optimizeFluentChain(
  adtName: string,
  operations: Array<{ method: string; args: any[] }>,
  context: OptimizationContext
): OptimizationResult {
  // Convert fluent operations to Operation array
  const pipeline: Operation[] = operations.map(op => ({
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
  
  return optimizePipeline(adtName, context.typeclass, pipeline, context);
}

/**
 * Create optimized fluent method wrapper
 */
export function createOptimizedFluentMethod(
  adtName: string,
  typeclass: string,
  methodName: string,
  originalMethod: Function
): Function {
  return function(this: any, ...args: any[]) {
    const result = originalMethod.apply(this, args);
    
    // Apply post-execution plugins
    const plugins = getOptimizationPlugins(adtName);
    for (const plugin of plugins) {
      if (plugin.postExecution) {
        const context: OptimizationContext = {
          adtName,
          typeclass,
          evaluationMode: getEvaluationMode(adtName, typeclass),
          targetPerformance: 'balanced',
          maxOptimizationPasses: 3,
          preserveOrder: true,
          allowInlining: true
        };
        
        const processed = plugin.postExecution(result, context);
        if (processed !== result) {
          return processed;
        }
      }
    }
    
    return result;
  };
}

// ============================================================================
// Testing and Benchmarking
// ============================================================================

/**
 * Benchmark optimization performance
 */
export function benchmarkOptimization(
  adtName: string,
  typeclass: string,
  pipeline: Operation[],
  testData: any[],
  iterations: number = 1000
): {
  unoptimized: { time: number; memory: number };
  optimized: { time: number; memory: number };
  improvement: { time: number; memory: number };
} {
  const context: OptimizationContext = {
    adtName,
    typeclass,
    evaluationMode: getEvaluationMode(adtName, typeclass),
    targetPerformance: 'speed',
    maxOptimizationPasses: 3,
    preserveOrder: true,
    allowInlining: true
  };
  
  // Benchmark unoptimized pipeline
  const unoptimizedStart = performance.now();
  const unoptimizedMemory = ((globalThis as any).performance?.memory?.usedJSHeapSize) || 0;
  
  for (let i = 0; i < iterations; i++) {
    // Simulate pipeline execution
    let result = testData;
    for (const op of pipeline) {
      result = applyOperation(result, op);
    }
  }
  
  const unoptimizedEnd = performance.now();
  const unoptimizedTime = unoptimizedEnd - unoptimizedStart;
  const unoptimizedMemoryUsed = (((globalThis as any).performance?.memory?.usedJSHeapSize) || 0) - unoptimizedMemory;
  
  // Optimize pipeline
  const optimizationResult = optimizePipeline(adtName, typeclass, pipeline, context);
  
  // Benchmark optimized pipeline
  const optimizedStart = performance.now();
  const optimizedMemory = (((globalThis as any).performance?.memory?.usedJSHeapSize) || 0);
  
  for (let i = 0; i < iterations; i++) {
    // Simulate optimized pipeline execution
    let result = testData;
    for (const op of optimizationResult.pipeline) {
      result = applyOperation(result, op);
    }
  }
  
  const optimizedEnd = performance.now();
  const optimizedTime = optimizedEnd - optimizedStart;
  const optimizedMemoryUsed = ((((globalThis as any).performance?.memory?.usedJSHeapSize) || 0) - optimizedMemory);
  
  return {
    unoptimized: { time: unoptimizedTime, memory: unoptimizedMemoryUsed },
    optimized: { time: optimizedTime, memory: optimizedMemoryUsed },
    improvement: { 
      time: unoptimizedTime - optimizedTime, 
      memory: unoptimizedMemoryUsed - optimizedMemoryUsed 
    }
  };
}

/**
 * Verify optimization correctness
 */
export function verifyOptimizationCorrectness(
  adtName: string,
  typeclass: string,
  pipeline: Operation[],
  testData: any[]
): boolean {
  const context: OptimizationContext = {
    adtName,
    typeclass,
    evaluationMode: getEvaluationMode(adtName, typeclass),
    targetPerformance: 'balanced',
    maxOptimizationPasses: 3,
    preserveOrder: true,
    allowInlining: true
  };
  
  // Execute unoptimized pipeline
  let unoptimizedResult = testData;
  for (const op of pipeline) {
    unoptimizedResult = applyOperation(unoptimizedResult, op);
  }
  
  // Execute optimized pipeline
  const optimizationResult = optimizePipeline(adtName, typeclass, pipeline, context);
  let optimizedResult = testData;
  for (const op of optimizationResult.pipeline) {
    optimizedResult = applyOperation(optimizedResult, op);
  }
  
  // Compare results
  if (unoptimizedResult.length !== optimizedResult.length) {
    return false;
  }
  
  for (let i = 0; i < unoptimizedResult.length; i++) {
    if (unoptimizedResult[i] !== optimizedResult[i]) {
      return false;
    }
  }
  
  return true;
}
