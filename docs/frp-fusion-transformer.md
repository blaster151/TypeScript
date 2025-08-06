# FRP Fusion Transformer

## Overview

The FRP Fusion Transformer is a **compile-time fusion optimization pass** for our TypeScript-first FP/FRP library. It detects and fuses **stateless + stateful stream pipeline sections** into single optimized operators at **compile-time**, eliminating intermediate objects and closures while preserving type safety and observable behavior.

## Key Features

### 🚀 **Compile-Time Optimization**
- **AST Pattern Matching**: Detects method chains and pipe-style calls over stream objects
- **Operator Classification**: Identifies stateless, stateful, and effectful operators
- **Fusion Rules**: Applies comprehensive fusion rules based on operator metadata
- **Type Safety**: Preserves TypeScript type inference and generic parameters

### 🔧 **Fusion Rules**

#### **Stateless-Only Sequences** → Always Fuse
```typescript
// Before fusion
stream.map(x => x * 2).filter(x => x > 0)

// After fusion
stream.mapFilter(x => {
  const doubled = x * 2;
  return doubled > 0 ? doubled : undefined;
})
```

#### **Stateless Before Stateful** → Push Stateless Inside Stateful
```typescript
// Before fusion
stream.map(x => x * 2).scan((acc, x) => acc + x, 0)

// After fusion
stream.scan((acc, x) => acc + (x * 2), 0)
```

#### **Multiple Stateful Ops** → Fuse if Combined State Can Be Represented
```typescript
// Only fuse if state can be combined without semantic change
stream.scan((acc, x) => acc + x, 0).scan((acc, x) => acc * x, 1)
// → Complex state combination, may not fuse
```

### 🛡️ **Safety Constraints**

#### **Multiplicity Constraints**
- Fusion must not increase per-input usage count
- Abort fusion if usage count would increase
- Respect `"∞"` multiplicity boundaries

#### **Effect Safety**
- Never fuse across effectful boundaries (I/O, logging, mutation)
- Preserve observable behavior and side-effect ordering
- Maintain referential transparency

#### **State Safety**
- Only fuse stateful operations if combined state can be represented
- Preserve state semantics and ordering
- Handle complex state combinations carefully

### 🎯 **Lambda Inlining**
- Inline small lambdas (< 3 AST statements) directly into fused operators
- Reduce function call overhead and closure allocations
- Preserve dynamic binding and `this` context

## Architecture

### Core Components

#### **1. FRP Fusion Transformer** (`frpFusionTransformer.ts`)
```typescript
export function createFRPFusionTransformer(
  config: FusionTransformerConfig = defaultConfig()
): ts.TransformerFactory<ts.SourceFile>
```

**Features**:
- AST pattern matching for FRP method chains
- Operator sequence detection and analysis
- Fusion rule application
- Type-safe transformation

#### **2. Fusion Rules** (`fusionRules.ts`)
```typescript
export const FRP_OPERATOR_REGISTRY: Map<string, OperatorMetadata>
export const FUSIBILITY_MATRIX: FusibilityEntry[]
```

**Features**:
- Comprehensive operator metadata registry
- Fusibility matrix for operator combinations
- Multiplicity preservation rules
- Type preservation guarantees

#### **3. Build Pipeline Integration** (`buildPipeline.ts`)
```typescript
export async function buildProject(config: BuildConfig): Promise<BuildResult>
export function createTransformerPlugin(config: FusionTransformerConfig): TransformerPlugin
```

**Features**:
- Integration with ttypescript and ts-patch
- File discovery and filtering
- Performance monitoring
- Watch mode support

### Operator Categories

#### **Stateless Operators**
- `map`: Transform values (multiplicity: 1)
- `filter`: Filter values (multiplicity: 1)
- `take`: Limit stream length (multiplicity: 1)
- `drop`: Skip initial values (multiplicity: 1)
- `distinct`: Remove duplicates (multiplicity: 1)

#### **Stateful Operators**
- `scan`: Accumulate with state (multiplicity: 1)
- `reduce`: Reduce to single value (multiplicity: 1)
- `fold`: Fold with initial value (multiplicity: 1)
- `flatMap`: Transform and flatten (multiplicity: "∞")
- `merge`: Merge multiple streams (multiplicity: "∞")
- `zip`: Combine streams (multiplicity: 1)
- `combineLatest`: Combine latest values (multiplicity: "∞")

#### **Effectful Operators**
- `log`: Logging side effects (multiplicity: 1)
- `tap`: Side effects without transformation (multiplicity: 1)
- `do`: Side effects (multiplicity: 1)
- `subscribe`: Subscription side effects (multiplicity: 1)

## Usage

### Basic Integration

#### **1. Install Dependencies**
```bash
npm install ttypescript typescript
# or
npm install ts-patch typescript
```

#### **2. Configure TypeScript**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "plugins": [
      {
        "transform": "./frpFusionTransformer",
        "config": {
          "enableStatelessFusion": true,
          "enableStatefulFusion": true,
          "enableLambdaInlining": true,
          "debugMode": false
        }
      }
    ]
  }
}
```

#### **3. Use in Code**
```typescript
import { Observable } from './observable';

const stream = new Observable([1, 2, 3, 4, 5]);

// This will be fused at compile-time
const result = stream
  .map(x => x * 2)
  .filter(x => x > 5)
  .map(x => x.toString())
  .map(x => x.length);
```

### Advanced Configuration

#### **Production Configuration**
```typescript
import { productionBuildConfig } from './buildPipeline';

const config = productionBuildConfig();
// Enables all optimizations, disables debug mode
```

#### **Development Configuration**
```typescript
import { developmentBuildConfig } from './buildPipeline';

const config = developmentBuildConfig();
// Enables debug mode, preserves source maps
```

#### **Custom Configuration**
```typescript
import { defaultConfig } from './frpFusionTransformer';

const config = {
  ...defaultConfig(),
  enableStatelessFusion: true,
  enableStatefulFusion: false, // Disable stateful fusion
  enableLambdaInlining: true,
  maxInlineStatements: 5,
  debugMode: true,
  noFusePragma: '@nofuse'
};
```

### Opt-Out Mechanisms

#### **Pragma Comments**
```typescript
// @nofuse
const result = stream
  .map(x => x * 2)
  .filter(x => x > 0);
// This pipeline will not be fused
```

#### **Configuration Flags**
```typescript
const config = {
  ...defaultConfig(),
  enableStatelessFusion: false, // Disable all stateless fusion
  enableStatefulFusion: false   // Disable all stateful fusion
};
```

## Performance Benefits

### **Allocation Reduction**
```typescript
// Before fusion: 3 intermediate arrays
const result = source
  .map(x => x * 2)      // Allocates intermediate array
  .filter(x => x > 0)   // Allocates intermediate array
  .map(x => x.toString()); // Allocates intermediate array

// After fusion: 1 allocation
const result = source
  .mapFilter(x => {
    const doubled = x * 2;
    return doubled > 0 ? doubled.toString() : undefined;
  });
```

### **Function Call Overhead Reduction**
```typescript
// Before fusion: 3 function calls with indirection
const result = map1(map2(map3(input)));

// After fusion: 1 function call, no indirection
const result = fusedComposition(input);
```

### **Memory Optimization**
```typescript
// Before fusion: Multiple stream objects with overhead
const stream1 = new Stream(map1);
const stream2 = new Stream(map2);
const stream3 = new Stream(map3);

// After fusion: Single fused evaluator
const fusedEvaluator = createFusedEvaluator([map1, map2, map3]);
```

## Testing

### **Unit Tests**
```typescript
import { describe, it, expect } from 'vitest';
import { createFRPFusionTransformer, detectFRPChains } from './frpFusionTransformer';

describe('FRP Fusion Transformer', () => {
  it('should detect FRP method chains', () => {
    const code = `
      const result = stream
        .map(x => x * 2)
        .filter(x => x > 0)
        .map(x => x.toString());
    `;
    
    const sourceFile = createSourceFile(code);
    const sequences = detectFRPChains(sourceFile, context);
    
    expect(sequences.length).toBe(1);
    expect(sequences[0].operators.length).toBe(3);
    expect(sequences[0].canFuse).toBe(true);
  });
});
```

### **Property Tests**
```typescript
describe('Property Tests', () => {
  it('should preserve behavior for stateless-only fusions', () => {
    const testData = generateRandomData(1000);
    
    // Original pipeline
    const originalPipeline = (stream: any) => 
      stream
        .map(x => x.value * 2)
        .filter(x => x > 100)
        .map(x => x.toString());
    
    // Fused pipeline (simulated)
    const fusedPipeline = (stream: any) => 
      stream.mapFilter((x: any) => {
        const doubled = x.value * 2;
        return doubled > 100 ? doubled.toString() : undefined;
      });
    
    const originalResult = executePipeline(testData, originalPipeline);
    const fusedResult = executePipeline(testData, fusedPipeline);
    
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
  });
});
```

### **Performance Tests**
```typescript
describe('Performance Tests', () => {
  it('should improve performance for large datasets', () => {
    const testData = generateRandomData(100000);
    
    // Benchmark original vs fused
    const originalStart = performance.now();
    const originalResult = executePipeline(testData, originalPipeline);
    const originalTime = performance.now() - originalStart;
    
    const fusedStart = performance.now();
    const fusedResult = executePipeline(testData, fusedPipeline);
    const fusedTime = performance.now() - fusedStart;
    
    expect(fusedTime).toBeLessThan(originalTime);
    expect(resultsEqual(originalResult, fusedResult)).toBe(true);
  });
});
```

## Integration Examples

### **ttypescript Integration**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      {
        "transform": "./frpFusionTransformer",
        "config": {
          "enableStatelessFusion": true,
          "enableStatefulFusion": true,
          "debugMode": false
        }
      }
    ]
  }
}

// Build script
const { buildProject, defaultBuildConfig } = require('./buildPipeline');

const config = defaultBuildConfig();
const result = await buildProject(config);

if (result.success) {
  console.log(`Build successful: ${result.filesProcessed} files processed`);
} else {
  console.log(`Build failed: ${result.errors.length} errors`);
}
```

### **ts-patch Integration**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "transformers": [
      {
        "name": "frp-fusion-transformer",
        "factory": "./frpFusionTransformer",
        "config": {
          "enableStatelessFusion": true,
          "enableStatefulFusion": true
        }
      }
    ]
  }
}
```

### **Watch Mode**
```typescript
import { watchProject, developmentBuildConfig } from './buildPipeline';

const config = developmentBuildConfig();
config.watch = true;

watchProject(config, (result) => {
  if (result.success) {
    console.log('✅ Build successful');
  } else {
    console.log('❌ Build failed');
  }
});
```

## Debugging and Diagnostics

### **Debug Mode**
```typescript
const config = {
  ...defaultConfig(),
  debugMode: true
};

// Enables detailed logging of fusion decisions
// [FRP Fusion] Detected fusable sequence: map -> filter -> map
// [FRP Fusion] Applied stateless-only fusion
// [FRP Fusion] Fused 3 operators into mapFilter
```

### **Performance Monitoring**
```typescript
import { PerformanceMonitor } from './buildPipeline';

const monitor = new PerformanceMonitor();

// Record build results
monitor.recordBuild(result);

// Get metrics
const metrics = monitor.getMetrics();
console.log(`Average build time: ${metrics.averageTime.toFixed(2)}ms`);
console.log(`Total builds: ${metrics.totalBuilds}`);

// Print summary
monitor.printMetrics();
```

### **Source Map Support**
```typescript
const config = {
  ...defaultConfig(),
  preserveSourceMaps: true
};

// Preserves source maps for debugging
// Allows stepping through original source code
```

## Best Practices

### **When to Use Fusion**
- ✅ **Pure data transformations**: `map`, `filter`, `take`, `drop`
- ✅ **Simple stateful operations**: `scan`, `reduce` with simple functions
- ✅ **Performance-critical code paths**: Hot loops, large datasets
- ✅ **Memory-constrained environments**: Reduce allocation overhead

### **When to Avoid Fusion**
- ❌ **Effectful operations**: `log`, `tap`, `subscribe`
- ❌ **Complex stateful operations**: Multiple `scan` operations
- ❌ **Multiplicity escalation**: `flatMap`, `merge`, `combineLatest`
- ❌ **Debugging sessions**: Use `@nofuse` pragma

### **Configuration Guidelines**
```typescript
// Development
const devConfig = {
  enableStatelessFusion: true,
  enableStatefulFusion: false, // Conservative
  enableLambdaInlining: true,
  debugMode: true,
  preserveSourceMaps: true
};

// Production
const prodConfig = {
  enableStatelessFusion: true,
  enableStatefulFusion: true, // Aggressive
  enableLambdaInlining: true,
  debugMode: false,
  preserveSourceMaps: false
};
```

## Future Enhancements

### **Runtime-Aware JIT Fusion**
- Profiling-based fusion decisions
- Dynamic optimization based on runtime characteristics
- Adaptive fusion strategies

### **Advanced Fusion Patterns**
- Cross-stream fusion optimizations
- Parallel fusion for multi-core systems
- Memory-aware fusion strategies

### **Integration Extensions**
- Webpack plugin integration
- Rollup plugin integration
- Vite plugin integration
- ESLint rule integration

## Conclusion

The FRP Fusion Transformer provides **significant performance improvements** through compile-time optimization while maintaining **type safety** and **observable behavior**. By eliminating intermediate allocations and reducing function call overhead, it enables high-performance FRP applications without sacrificing developer experience.

The modular architecture allows for easy integration with existing build pipelines and provides comprehensive debugging and monitoring capabilities. The safety constraints ensure that fusion never breaks referential transparency or observable behavior, making it safe for production use. 