/**
 * Stream Boundaries Example
 * 
 * This example demonstrates the three categories of stream boundaries:
 * 1. Fully Fusable - Compile-time optimization
 * 2. Staged - Runtime optimization
 * 3. Opaque Effects - No optimization
 * 
 * It also shows how dev tooling can provide warnings and suggestions.
 */

import {
  createFusableStream,
  createStagedStream,
  createOpaqueStream,
  composeWithBoundaries,
  detectBoundary,
  BoundaryTracker,
  DevToolingInterface,
  BoundaryDetectionContext,
  OptimizationBoundary
} from '../fp-stream-boundaries';

// ============================================================================
// Part 1: Boundary Examples
// ============================================================================

/**
 * Example 1: Fully Fusable Streams
 * These can be completely optimized at compile-time
 */
function demonstrateFullyFusable() {
  console.log('\n=== Fully Fusable Streams ===');
  
  // Pure transformation - can be fused
  const doubleStream = createFusableStream(
    1, // Known multiplicity
    'Pure', // Pure effect
    (x: number) => () => [undefined, x * 2]
  );
  
  // Stateless filter - can be fused
  const positiveStream = createFusableStream(
    1,
    'Pure',
    (x: number) => () => [undefined, x > 0 ? x : undefined]
  );
  
  // Known bounded operation - can be fused
  const takeStream = createFusableStream(
    5, // Fixed bound
    'Pure',
    (x: number) => () => [undefined, x]
  );
  
  // Compose fully fusable streams
  const composed = composeWithBoundaries(doubleStream, positiveStream);
  console.log('Composed boundary:', composed.boundary); // 'FullyFusable'
  console.log('Can be optimized:', composed.boundary === 'FullyFusable');
  
  return { doubleStream, positiveStream, takeStream, composed };
}

/**
 * Example 2: Staged Streams
 * These require runtime staging/thunking due to dynamic behavior
 */
function demonstrateStaged() {
  console.log('\n=== Staged Streams ===');
  
  // Dynamic multiplicity - unknown at compile-time
  const dynamicTakeStream = createStagedStream(
    "∞", // Unknown multiplicity
    'DeterministicEffect',
    (x: number) => (state: { count: number }) => {
      const newCount = state.count + 1;
      return [{ count: newCount }, newCount <= x ? x : undefined];
    }
  );
  
  // Conditional behavior - depends on runtime state
  const conditionalStream = createStagedStream(
    1,
    'DeterministicEffect',
    (x: number) => (state: { condition: boolean }) => {
      return [state, state.condition ? x * 2 : x / 2];
    }
  );
  
  // Stateful accumulator - deterministic but stateful
  const scanStream = createStagedStream(
    1,
    'DeterministicEffect',
    (x: number) => (state: { sum: number }) => {
      const newSum = state.sum + x;
      return [{ sum: newSum }, newSum];
    }
  );
  
  // Compose staged with fusable
  const fusable = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x + 1]);
  const stagedComposed = composeWithBoundaries(fusable, conditionalStream);
  console.log('Staged composed boundary:', stagedComposed.boundary); // 'Staged'
  
  return { dynamicTakeStream, conditionalStream, scanStream, stagedComposed };
}

/**
 * Example 3: Opaque Effect Streams
 * These cannot be optimized due to external effects
 */
function demonstrateOpaqueEffects() {
  console.log('\n=== Opaque Effect Streams ===');
  
  // I/O operation - external side effect
  const logStream = createOpaqueStream(
    1,
    'IO',
    (x: number) => () => {
      console.log('Logging:', x);
      return [undefined, x];
    }
  );
  
  // Network call - external dependency
  const apiStream = createOpaqueStream(
    1,
    'Async',
    (x: number) => async () => {
      const result = await fetch(`/api/data/${x}`);
      return [undefined, await result.json()];
    }
  );
  
  // Random number generation - non-deterministic
  const randomStream = createOpaqueStream(
    1,
    'IO',
    (x: number) => () => {
      const random = Math.random();
      return [undefined, x + random];
    }
  );
  
  // Compose opaque with fusable - becomes opaque
  const fusable = createFusableStream(1, 'Pure', (x: number) => () => [undefined, x * 2]);
  const opaqueComposed = composeWithBoundaries(fusable, logStream);
  console.log('Opaque composed boundary:', opaqueComposed.boundary); // 'OpaqueEffect'
  
  return { logStream, apiStream, randomStream, opaqueComposed };
}

// ============================================================================
// Part 2: Dev Tooling Integration
// ============================================================================

/**
 * Dev tooling interface implementation
 */
class StreamDevTooling implements DevToolingInterface {
  
  analyzeBoundaries(code: string, context: BoundaryDetectionContext): any[] {
    // In a real implementation, this would parse the code and analyze boundaries
    console.log(`Analyzing boundaries in ${context.fileName}:${context.lineNumber}`);
    
    // Simulate analysis results
    return [
      {
        boundary: 'FullyFusable' as OptimizationBoundary,
        reason: 'Pure function detected',
        confidence: 0.9,
        optimizationPotential: 1.0,
        devToolingHints: []
      }
    ];
  }
  
  generateHints(analysis: any[]): any[] {
    const hints = [];
    
    for (const item of analysis) {
      if (item.boundary === 'OpaqueEffect') {
        hints.push({
          type: 'warning',
          message: 'Effectful operation cannot be optimized',
          code: 'OPAQUE_EFFECT_WARNING',
          severity: 'medium',
          suggestion: 'Consider moving I/O operations to the end of the pipeline'
        });
      } else if (item.boundary === 'Staged' && item.confidence < 0.8) {
        hints.push({
          type: 'suggestion',
          message: 'Consider adding explicit boundary marker for better optimization',
          code: 'BOUNDARY_SUGGESTION',
          severity: 'low',
          suggestion: 'Use createStagedStream() for dynamic operations'
        });
      }
    }
    
    return hints;
  }
  
  findOptimizationOpportunities(analysis: any[]): any[] {
    const opportunities = [];
    
    for (const item of analysis) {
      if (item.boundary === 'FullyFusable' && item.optimizationPotential > 0.8) {
        opportunities.push({
          type: 'fusion',
          description: 'Fuse adjacent pure operations',
          potentialGain: 0.8,
          complexity: 0.2,
          confidence: 0.9,
          suggestedCode: 'stream.map(x => x * 2).map(x => x + 1) → stream.map(x => (x * 2) + 1)'
        });
      } else if (item.boundary === 'Staged' && item.optimizationPotential > 0.5) {
        opportunities.push({
          type: 'staging',
          description: 'Stage dynamic multiplicity operations',
          potentialGain: 0.6,
          complexity: 0.5,
          confidence: 0.7,
          suggestedCode: 'Use createStagedStream() for dynamic bounds'
        });
      }
    }
    
    return opportunities;
  }
  
  validateBoundaryTransitions(chain: any[]): any {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    for (let i = 0; i < chain.length - 1; i++) {
      const current = chain[i];
      const next = chain[i + 1];
      
      // Check for problematic transitions
      if (current.boundary === 'FullyFusable' && next.boundary === 'OpaqueEffect') {
        warnings.push('Pure operation followed by effectful operation may break optimization');
      }
      
      if (current.boundary === 'Staged' && next.boundary === 'OpaqueEffect') {
        suggestions.push('Consider staging the effectful operation');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }
}

// ============================================================================
// Part 3: Runtime Boundary Tracking
// ============================================================================

/**
 * Demonstrate runtime boundary tracking
 */
function demonstrateBoundaryTracking() {
  console.log('\n=== Runtime Boundary Tracking ===');
  
  const tracker = new BoundaryTracker();
  const devTooling = new StreamDevTooling();
  
  // Track different types of streams
  const fusableStreams = demonstrateFullyFusable();
  const stagedStreams = demonstrateStaged();
  const opaqueStreams = demonstrateOpaqueEffects();
  
  // Track boundaries
  tracker.trackBoundary('doubleStream', {
    boundary: 'FullyFusable',
    reason: 'Pure transformation',
    confidence: 1.0,
    optimizationPotential: 1.0,
    devToolingHints: []
  });
  
  tracker.trackBoundary('dynamicTakeStream', {
    boundary: 'Staged',
    reason: 'Dynamic multiplicity',
    confidence: 0.8,
    optimizationPotential: 0.6,
    devToolingHints: [{
      type: 'info',
      message: 'Dynamic multiplicity requires runtime staging',
      code: 'STAGING_INFO',
      severity: 'low',
      suggestion: 'Consider using fixed bounds where possible'
    }]
  });
  
  tracker.trackBoundary('logStream', {
    boundary: 'OpaqueEffect',
    reason: 'I/O operation',
    confidence: 0.95,
    optimizationPotential: 0.0,
    devToolingHints: [{
      type: 'warning',
      message: 'I/O operation breaks optimization',
      code: 'IO_BREAKS_OPTIMIZATION',
      severity: 'medium',
      suggestion: 'Move logging to the end of the pipeline'
    }]
  });
  
  // Track transitions
  tracker.trackTransition('doubleStream', 'positiveStream', 'FullyFusable');
  tracker.trackTransition('positiveStream', 'logStream', 'OpaqueEffect');
  
  // Generate report
  const report = tracker.generateReport();
  console.log('\nBoundary Report:');
  console.log('Total boundaries:', report.totalBoundaries);
  console.log('Boundary distribution:', report.boundaryDistribution);
  console.log('Transition count:', report.transitionCount);
  console.log('Optimization opportunities:', report.optimizationOpportunities.length);
  
  // Generate dev tooling hints
  const allAnalysis = [
    { boundary: 'FullyFusable', confidence: 1.0, optimizationPotential: 1.0 },
    { boundary: 'Staged', confidence: 0.8, optimizationPotential: 0.6 },
    { boundary: 'OpaqueEffect', confidence: 0.95, optimizationPotential: 0.0 }
  ];
  
  const hints = devTooling.generateHints(allAnalysis);
  const opportunities = devTooling.findOptimizationOpportunities(allAnalysis);
  const validation = devTooling.validateBoundaryTransitions(allAnalysis);
  
  console.log('\nDev Tooling Results:');
  console.log('Hints:', hints.length);
  console.log('Opportunities:', opportunities.length);
  console.log('Validation valid:', validation.valid);
  
  return { tracker, report, hints, opportunities, validation };
}

// ============================================================================
// Part 4: Boundary Detection Examples
// ============================================================================

/**
 * Demonstrate boundary detection with different contexts
 */
function demonstrateBoundaryDetection() {
  console.log('\n=== Boundary Detection Examples ===');
  
  const context: BoundaryDetectionContext = {
    moduleName: 'stream-boundaries-example',
    functionName: 'demonstrateBoundaryDetection',
    lineNumber: 1,
    columnNumber: 1,
    fileName: 'examples/stream-boundaries-example.ts',
    compilationMode: 'development',
    optimizationLevel: 'aggressive'
  };
  
  // Detect boundaries for different types of values
  const pureFunction = (x: number) => x * 2;
  const effectfulFunction = (x: number) => {
    console.log(x);
    return x * 2;
  };
  const asyncFunction = async (x: number) => {
    const result = await fetch(`/api/${x}`);
    return await result.json();
  };
  
  const pureAnalysis = detectBoundary(pureFunction, context);
  const effectfulAnalysis = detectBoundary(effectfulFunction, context);
  const asyncAnalysis = detectBoundary(asyncFunction, context);
  
  console.log('Pure function boundary:', pureAnalysis.boundary);
  console.log('Effectful function boundary:', effectfulAnalysis.boundary);
  console.log('Async function boundary:', asyncAnalysis.boundary);
  
  console.log('\nBoundary Analysis Details:');
  console.log('Pure function:', {
    boundary: pureAnalysis.boundary,
    confidence: pureAnalysis.confidence,
    optimizationPotential: pureAnalysis.optimizationPotential,
    hints: pureAnalysis.devToolingHints.length
  });
  
  console.log('Effectful function:', {
    boundary: effectfulAnalysis.boundary,
    confidence: effectfulAnalysis.confidence,
    optimizationPotential: effectfulAnalysis.optimizationPotential,
    hints: effectfulAnalysis.devToolingHints.length
  });
  
  console.log('Async function:', {
    boundary: asyncAnalysis.boundary,
    confidence: asyncAnalysis.confidence,
    optimizationPotential: asyncAnalysis.optimizationPotential,
    hints: asyncAnalysis.devToolingHints.length
  });
  
  return { pureAnalysis, effectfulAnalysis, asyncAnalysis };
}

// ============================================================================
// Part 5: Performance Comparison
// ============================================================================

/**
 * Demonstrate performance differences between boundary types
 */
function demonstratePerformanceComparison() {
  console.log('\n=== Performance Comparison ===');
  
  const testData = Array.from({ length: 1000 }, (_, i) => i);
  
  // Fully fusable pipeline
  const fusablePipeline = createFusableStream(
    1,
    'Pure',
    (x: number) => () => [undefined, x * 2]
  );
  
  // Staged pipeline
  const stagedPipeline = createStagedStream(
    1,
    'DeterministicEffect',
    (x: number) => (state: { count: number }) => {
      const newCount = state.count + 1;
      return [{ count: newCount }, x * 2];
    }
  );
  
  // Opaque pipeline
  const opaquePipeline = createOpaqueStream(
    1,
    'IO',
    (x: number) => () => {
      // Simulate I/O overhead
      const start = Date.now();
      while (Date.now() - start < 1) {} // 1ms delay
      return [undefined, x * 2];
    }
  );
  
  // Benchmark each pipeline
  const benchmark = (name: string, pipeline: any, data: number[]) => {
    const start = Date.now();
    let result = 0;
    
    for (const item of data) {
      const [state, output] = pipeline.run(item)();
      if (output !== undefined) {
        result += output;
      }
    }
    
    const end = Date.now();
    console.log(`${name}: ${end - start}ms, result: ${result}`);
    return { time: end - start, result };
  };
  
  const fusableResult = benchmark('Fusable', fusablePipeline, testData);
  const stagedResult = benchmark('Staged', stagedPipeline, testData);
  const opaqueResult = benchmark('Opaque', opaquePipeline, testData);
  
  console.log('\nPerformance Summary:');
  console.log(`Fusable is ${stagedResult.time / fusableResult.time}x faster than Staged`);
  console.log(`Fusable is ${opaqueResult.time / fusableResult.time}x faster than Opaque`);
  
  return { fusableResult, stagedResult, opaqueResult };
}

// ============================================================================
// Part 6: Main Example
// ============================================================================

/**
 * Run all examples
 */
export function runStreamBoundariesExample() {
  console.log('🚀 Stream Boundaries Example');
  console.log('=============================');
  
  try {
    // Demonstrate different boundary types
    const fusableStreams = demonstrateFullyFusable();
    const stagedStreams = demonstrateStaged();
    const opaqueStreams = demonstrateOpaqueEffects();
    
    // Demonstrate boundary detection
    const detectionResults = demonstrateBoundaryDetection();
    
    // Demonstrate runtime tracking
    const trackingResults = demonstrateBoundaryTracking();
    
    // Demonstrate performance comparison
    const performanceResults = demonstratePerformanceComparison();
    
    console.log('\n✅ All examples completed successfully!');
    
    return {
      fusableStreams,
      stagedStreams,
      opaqueStreams,
      detectionResults,
      trackingResults,
      performanceResults
    };
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    throw error;
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runStreamBoundariesExample();
}
