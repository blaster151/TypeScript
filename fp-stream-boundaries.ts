/**
 * Stream Boundary Type System
 * 
 * This module provides comprehensive type system support for distinguishing between:
 * 1. Fully fusable expressions (compile-time optimization)
 * 2. Staged/thunked expressions (runtime optimization)
 * 3. Opaque effects (no optimization possible)
 * 
 * Features:
 * - Type-level boundary markers for compile-time analysis
 * - Runtime boundary detection for optimization decisions
 * - Dev tooling integration for warnings and suggestions
 * - Structural tracking of optimization boundaries
 * - Integration with existing effect and multiplicity systems
 */

import {
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  HigherKind, KindInput, KindOutput,
  Phantom, KindWithPhantom
} from './fp-hkt';

import {
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker
} from './fp-purity';

// ============================================================================
// Part 1: Type-Level Boundary Markers
// ============================================================================

/**
 * Type-level markers for optimization boundaries
 */
export type OptimizationBoundary = 
  | 'FullyFusable'      // Can be fully optimized at compile-time
  | 'Staged'            // Requires runtime staging/thunking
  | 'OpaqueEffect';     // No optimization possible

/**
 * Phantom types for boundary markers
 */
export interface BoundaryKind<Tag extends OptimizationBoundary> {
  readonly _boundary: Tag;
}

export type FullyFusable = BoundaryKind<'FullyFusable'>;
export type Staged = BoundaryKind<'Staged'>;
export type OpaqueEffect = BoundaryKind<'OpaqueEffect'>;

/**
 * Type-level boundary extraction
 */
export type ExtractBoundary<T> = T extends BoundaryKind<infer B> ? B : 'OpaqueEffect';

/**
 * Type-level boundary compatibility check
 */
export type CompatibleBoundaries<A, B> = 
  A extends 'FullyFusable' 
    ? B extends 'FullyFusable' | 'Staged' ? true : false
    : A extends 'Staged'
    ? B extends 'Staged' | 'OpaqueEffect' ? true : false
    : false;

// ============================================================================
// Part 2: Enhanced Stream Types with Boundary Information
// ============================================================================

/**
 * Stream with boundary information
 */
export interface BoundedStream<In, Out, S, UB extends Multiplicity, B extends OptimizationBoundary> {
  readonly usageBound: UB;
  readonly effectTag: EffectTag;
  readonly boundary: B;
  readonly __boundary: BoundaryKind<B>;
  run: (input: In) => StateFn<S, Out>;
}

/**
 * Type aliases for common boundary types
 */
export type FusableStream<In, Out, S, UB extends Multiplicity> = 
  BoundedStream<In, Out, S, UB, 'FullyFusable'>;

export type StagedStream<In, Out, S, UB extends Multiplicity> = 
  BoundedStream<In, Out, S, UB, 'Staged'>;

export type OpaqueStream<In, Out, S, UB extends Multiplicity> = 
  BoundedStream<In, Out, S, UB, 'OpaqueEffect'>;

// ============================================================================
// Part 3: Boundary Detection and Analysis
// ============================================================================

/**
 * Boundary detection result
 */
export interface BoundaryAnalysis {
  boundary: OptimizationBoundary;
  reason: string;
  confidence: number; // 0-1 scale
  optimizationPotential: number; // 0-1 scale
  devToolingHints: DevToolingHint[];
}

/**
 * Dev tooling hints for warnings and suggestions
 */
export interface DevToolingHint {
  type: 'warning' | 'suggestion' | 'info' | 'error';
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
  location?: {
    line: number;
    column: number;
    file: string;
  };
}

/**
 * Boundary detection function
 */
export function detectBoundary<T>(
  value: T,
  context: BoundaryDetectionContext
): BoundaryAnalysis {
  // Check for explicit boundary markers
  if (hasBoundaryMarker(value)) {
    return analyzeExplicitBoundary(value);
  }
  
  // Analyze based on type and structure
  return analyzeImplicitBoundary(value, context);
}

/**
 * Context for boundary detection
 */
export interface BoundaryDetectionContext {
  moduleName: string;
  functionName: string;
  lineNumber: number;
  columnNumber: number;
  fileName: string;
  compilationMode: 'development' | 'production';
  optimizationLevel: 'none' | 'basic' | 'aggressive';
}

// ============================================================================
// Part 4: Boundary-Specific Type Constructors
// ============================================================================

/**
 * Create a fully fusable stream
 */
export function createFusableStream<In, Out, S, UB extends Multiplicity>(
  usageBound: UB,
  effectTag: EffectTag,
  run: (input: In) => StateFn<S, Out>
): FusableStream<In, Out, S, UB> {
  return {
    usageBound,
    effectTag,
    boundary: 'FullyFusable',
    __boundary: { _boundary: 'FullyFusable' } as FullyFusable,
    run
  };
}

/**
 * Create a staged stream
 */
export function createStagedStream<In, Out, S, UB extends Multiplicity>(
  usageBound: UB,
  effectTag: EffectTag,
  run: (input: In) => StateFn<S, Out>
): StagedStream<In, Out, S, UB> {
  return {
    usageBound,
    effectTag,
    boundary: 'Staged',
    __boundary: { _boundary: 'Staged' } as Staged,
    run
  };
}

/**
 * Create an opaque effect stream
 */
export function createOpaqueStream<In, Out, S, UB extends Multiplicity>(
  usageBound: UB,
  effectTag: EffectTag,
  run: (input: In) => StateFn<S, Out>
): OpaqueStream<In, Out, S, UB> {
  return {
    usageBound,
    effectTag,
    boundary: 'OpaqueEffect',
    __boundary: { _boundary: 'OpaqueEffect' } as OpaqueEffect,
    run
  };
}

// ============================================================================
// Part 5: Boundary-Aware Composition
// ============================================================================

/**
 * Compose streams with boundary awareness
 */
export function composeWithBoundaries<A, B, C, S, UB extends Multiplicity>(
  f: BoundedStream<A, B, S, UB, any>,
  g: BoundedStream<B, C, S, UB, any>
): BoundedStream<A, C, S, UB, any> {
  const boundary = determineComposedBoundary(f.boundary, g.boundary);
  const effectTag = composeEffects(f.effectTag, g.effectTag);
  const usageBound = multiplyUsageBounds(f.usageBound, g.usageBound);
  
  const composedRun = (input: A) => (state: S) => {
    const [newState, intermediate] = f.run(input)(state);
    return g.run(intermediate)(newState);
  };
  
  switch (boundary) {
    case 'FullyFusable':
      return createFusableStream(usageBound, effectTag, composedRun);
    case 'Staged':
      return createStagedStream(usageBound, effectTag, composedRun);
    case 'OpaqueEffect':
      return createOpaqueStream(usageBound, effectTag, composedRun);
  }
}

/**
 * Determine the boundary of a composed stream
 */
export function determineComposedBoundary(
  boundary1: OptimizationBoundary,
  boundary2: OptimizationBoundary
): OptimizationBoundary {
  if (boundary1 === 'OpaqueEffect' || boundary2 === 'OpaqueEffect') {
    return 'OpaqueEffect';
  }
  
  if (boundary1 === 'Staged' || boundary2 === 'Staged') {
    return 'Staged';
  }
  
  return 'FullyFusable';
}

// ============================================================================
// Part 6: Dev Tooling Integration
// ============================================================================

/**
 * Dev tooling interface for boundary analysis
 */
export interface DevToolingInterface {
  // Analyze boundaries in code
  analyzeBoundaries(code: string, context: BoundaryDetectionContext): BoundaryAnalysis[];
  
  // Generate warnings and suggestions
  generateHints(analysis: BoundaryAnalysis[]): DevToolingHint[];
  
  // Check for optimization opportunities
  findOptimizationOpportunities(analysis: BoundaryAnalysis[]): OptimizationOpportunity[];
  
  // Validate boundary transitions
  validateBoundaryTransitions(chain: BoundaryAnalysis[]): ValidationResult;
}

/**
 * Optimization opportunity
 */
export interface OptimizationOpportunity {
  type: 'fusion' | 'staging' | 'inlining' | 'specialization';
  description: string;
  potentialGain: number; // 0-1 scale
  complexity: number; // 0-1 scale
  confidence: number; // 0-1 scale
  suggestedCode: string;
}

/**
 * Validation result for boundary transitions
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Part 7: Runtime Boundary Tracking
// ============================================================================

/**
 * Runtime boundary tracker
 */
export class BoundaryTracker {
  private boundaries: Map<string, BoundaryAnalysis> = new Map();
  private transitions: BoundaryTransition[] = [];
  
  trackBoundary(id: string, analysis: BoundaryAnalysis): void {
    this.boundaries.set(id, analysis);
  }
  
  trackTransition(from: string, to: string, boundary: OptimizationBoundary): void {
    this.transitions.push({
      from,
      to,
      boundary,
      timestamp: Date.now()
    });
  }
  
  getBoundary(id: string): BoundaryAnalysis | undefined {
    return this.boundaries.get(id);
  }
  
  getTransitions(): BoundaryTransition[] {
    return [...this.transitions];
  }
  
  generateReport(): BoundaryReport {
    return {
      totalBoundaries: this.boundaries.size,
      boundaryDistribution: this.calculateDistribution(),
      transitionCount: this.transitions.length,
      optimizationOpportunities: this.findOpportunities()
    };
  }
  
  private calculateDistribution(): Record<OptimizationBoundary, number> {
    const distribution: Record<OptimizationBoundary, number> = {
      FullyFusable: 0,
      Staged: 0,
      OpaqueEffect: 0
    };
    
    for (const analysis of this.boundaries.values()) {
      distribution[analysis.boundary]++;
    }
    
    return distribution;
  }
  
  private findOpportunities(): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];
    
    for (const analysis of this.boundaries.values()) {
      if (analysis.optimizationPotential > 0.5) {
        opportunities.push({
          type: analysis.boundary === 'Staged' ? 'staging' : 'fusion',
          description: `Optimize ${analysis.boundary} boundary`,
          potentialGain: analysis.optimizationPotential,
          complexity: 1 - analysis.confidence,
          confidence: analysis.confidence,
          suggestedCode: `// Consider ${analysis.boundary === 'Staged' ? 'staging' : 'fusing'} this operation`
        });
      }
    }
    
    return opportunities;
  }
}

/**
 * Boundary transition record
 */
export interface BoundaryTransition {
  from: string;
  to: string;
  boundary: OptimizationBoundary;
  timestamp: number;
}

/**
 * Boundary report
 */
export interface BoundaryReport {
  totalBoundaries: number;
  boundaryDistribution: Record<OptimizationBoundary, number>;
  transitionCount: number;
  optimizationOpportunities: OptimizationOpportunity[];
}

// ============================================================================
// Part 8: Utility Functions
// ============================================================================

/**
 * Check if a value has an explicit boundary marker
 */
export function hasBoundaryMarker(value: any): value is { __boundary: BoundaryKind<any> } {
  return value && typeof value === 'object' && '__boundary' in value;
}

/**
 * Analyze explicit boundary marker
 */
export function analyzeExplicitBoundary(value: { __boundary: BoundaryKind<any> }): BoundaryAnalysis {
  const boundary = value.__boundary._boundary;
  
  return {
    boundary,
    reason: `Explicit ${boundary} marker`,
    confidence: 1.0,
    optimizationPotential: boundary === 'FullyFusable' ? 1.0 : boundary === 'Staged' ? 0.5 : 0.0,
    devToolingHints: []
  };
}

/**
 * Analyze implicit boundary based on type and structure
 */
export function analyzeImplicitBoundary(value: any, context: BoundaryDetectionContext): BoundaryAnalysis {
  // This is a simplified analysis - in practice, this would be much more sophisticated
  if (typeof value === 'function' && value.length === 1) {
    return {
      boundary: 'FullyFusable',
      reason: 'Pure function with single parameter',
      confidence: 0.8,
      optimizationPotential: 0.9,
      devToolingHints: [{
        type: 'suggestion',
        message: 'Consider adding explicit boundary marker for better optimization',
        code: 'BOUNDARY_SUGGESTION',
        severity: 'low'
      }]
    };
  }
  
  if (value && typeof value === 'object' && 'effectTag' in value) {
    const effectTag = value.effectTag;
    if (effectTag === 'Pure') {
      return {
        boundary: 'FullyFusable',
        reason: 'Pure effect tag',
        confidence: 0.9,
        optimizationPotential: 1.0,
        devToolingHints: []
      };
    } else if (effectTag === 'IO' || effectTag === 'Async') {
      return {
        boundary: 'OpaqueEffect',
        reason: `Effectful operation: ${effectTag}`,
        confidence: 0.95,
        optimizationPotential: 0.0,
        devToolingHints: [{
          type: 'warning',
          message: 'Effectful operation cannot be optimized',
          code: 'OPAQUE_EFFECT_WARNING',
          severity: 'medium'
        }]
      };
    }
  }
  
  return {
    boundary: 'Staged',
    reason: 'Unknown type, defaulting to staged',
    confidence: 0.3,
    optimizationPotential: 0.3,
    devToolingHints: [{
      type: 'info',
      message: 'Consider adding explicit boundary information',
      code: 'UNKNOWN_BOUNDARY_INFO',
      severity: 'low'
    }]
  };
}

/**
 * Compose effects (simplified version)
 */
export function composeEffects(effect1: EffectTag, effect2: EffectTag): EffectTag {
  if (effect1 === 'Pure' && effect2 === 'Pure') return 'Pure';
  if (effect1 === 'Pure') return effect2;
  if (effect2 === 'Pure') return effect1;
  return 'IO'; // Default to IO for mixed effects
}

/**
 * Multiply usage bounds (simplified version)
 */
export function multiplyUsageBounds(bound1: Multiplicity, bound2: Multiplicity): Multiplicity {
  if (bound1 === "∞" || bound2 === "∞") return "∞";
  if (typeof bound1 === 'number' && typeof bound2 === 'number') {
    return bound1 * bound2;
  }
  return "∞";
}

// ============================================================================
// Part 9: Type Guards and Predicates
// ============================================================================

/**
 * Type guard for fully fusable streams
 */
export function isFusableStream<T>(stream: T): stream is T & { boundary: 'FullyFusable' } {
  return hasBoundaryMarker(stream) && stream.__boundary._boundary === 'FullyFusable';
}

/**
 * Type guard for staged streams
 */
export function isStagedStream<T>(stream: T): stream is T & { boundary: 'Staged' } {
  return hasBoundaryMarker(stream) && stream.__boundary._boundary === 'Staged';
}

/**
 * Type guard for opaque effect streams
 */
export function isOpaqueStream<T>(stream: T): stream is T & { boundary: 'OpaqueEffect' } {
  return hasBoundaryMarker(stream) && stream.__boundary._boundary === 'OpaqueEffect';
}

/**
 * Check if a stream can be optimized
 */
export function canOptimize<T>(stream: T): boolean {
  if (!hasBoundaryMarker(stream)) return false;
  const boundary = stream.__boundary._boundary;
  return boundary === 'FullyFusable' || boundary === 'Staged';
}

// ============================================================================
// Part 10: Export Types
// ============================================================================

export type Multiplicity = number | "∞";

export type StateFn<S, A> = (state: S) => [A, S];

// Re-export for convenience
export { EffectTag, EffectOf, Pure, IO, Async };
