# Graph-Aware Fusion System

## Overview

The Graph-Aware Fusion System extends the effect-aware, multiplicity-safe stream optimizer to work on **arbitrary stream graphs** that may include branching (parallel paths) and feedback loops. This enables the optimizer to handle **realistic FRP/stream topologies** with branches and feedback, applying the same **safe fusion laws** as linear pipelines but generalized for complex graphs.

## Core Concepts

### Graph Model

Stream pipelines are represented as directed graphs with explicit node and edge information:

```typescript
interface StreamNode<In, Out, S, UB extends Multiplicity> {
  id: string;
  stream: Stream<In, Out, S, UB>;
  downstream: string[]; // node IDs
  upstream: string[];   // node IDs
  operator: StreamOperator;
  params?: any;
  isFeedback?: boolean; // marks feedback edges
}

interface StreamGraph<S> {
  nodes: Map<string, StreamNode<any, any, S, any>>;
  feedbackEdges: Set<string>; // edge IDs in format "from->to"
}
```

### Fusion Traversal

Instead of simple left-to-right linear traversal, the system performs:

1. **Topological traversal** for DAG (Directed Acyclic Graph) sections
2. **Strongly Connected Component (SCC) analysis** for feedback cycles
3. **Fusion island identification** where cycles are treated as atomic units

## Graph Analysis

### Strongly Connected Components

The system uses **Tarjan's algorithm** to find strongly connected components:

```typescript
function findStronglyConnectedComponents<S>(
  graph: StreamGraph<S>
): StronglyConnectedComponent[] {
  // Implementation of Tarjan's algorithm
  // Returns SCCs with fusion eligibility information
}
```

### Fusion Edge Analysis

All edges in the graph are analyzed for fusion eligibility:

```typescript
interface FusionEdge {
  from: string;
  to: string;
  effectSafe: boolean;
  multiplicitySafe: boolean;
  eligible: boolean;
  fusedEffectTag?: EffectTag;
  fusedBound?: Multiplicity;
}
```

## Branch Fusion Rules

### Fusion Across Splits

Fusion across a split is allowed if:

1. **Both downstream branches** meet safety conditions independently
2. **Effect safety** is preserved for each branch
3. **Multiplicity bounds** remain valid after replication

```typescript
function canFuseAcrossSplit<S>(
  graph: StreamGraph<S>,
  splitNodeId: string,
  branchNodeIds: string[]
): { eligible: boolean; reason?: string }
```

#### ✅ **Safe Split Fusion Example**

```
source (Pure) → [branch1 (Pure), branch2 (Pure)] → merge (DeterministicEffect)
```

**Result**: Fusion allowed across all edges.

#### ❌ **Unsafe Split Fusion Example**

```
source (Pure) → [branch1 (Pure), branch2 (ExternalEffect)] → merge (DeterministicEffect)
```

**Result**: Fusion blocked due to `ExternalEffect` in branch2.

### Fusion Across Joins

Fusion across a join is allowed if:

1. **Both inputs** are `Pure` or `DeterministicEffect`
2. **Usage bounds** remain valid after merging state updates
3. **No multiplicity amplification** beyond allowed bounds

```typescript
function canFuseAcrossJoin<S>(
  graph: StreamGraph<S>,
  joinNodeId: string,
  inputNodeIds: string[]
): { eligible: boolean; reason?: string }
```

#### ✅ **Safe Join Fusion Example**

```
[input1 (Pure), input2 (Pure)] → merge (DeterministicEffect)
```

**Result**: Fusion allowed, total bound = 1.

#### ❌ **Unsafe Join Fusion Example**

```
[input1 (Pure), input2 (NonDeterministicEffect)] → merge (DeterministicEffect)
```

**Result**: Fusion blocked due to `NonDeterministicEffect` in input2.

## Feedback Fusion Rules

### Safety Conditions for Feedback Cycles

Feedback stages can only be fused if:

1. **Multiplicity bound** on the cycle ≤ 1 (no uncontrolled amplification)
2. **Effect tags** across the cycle are ≤ `DeterministicEffect`
3. **No external effects** or non-deterministic effects in the cycle

```typescript
function canFuseSCC<S>(
  graph: StreamGraph<S>,
  scc: string[]
): { eligible: boolean; reason?: string }
```

### Feedback Fusion Examples

#### ✅ **Safe Feedback Cycle**

```
map (Pure) → scan (DeterministicEffect) → filter (Pure) → [feedback to map]
```

**Analysis**:
- All effects ≤ `DeterministicEffect` ✅
- Multiplicity bound = 1 ✅
- **Result**: Fusion allowed within cycle

#### ❌ **Unsafe Feedback Cycle**

```
map (Pure) → flatMap (NonDeterministicEffect) → filter (Pure) → [feedback to map]
```

**Analysis**:
- Contains `NonDeterministicEffect` ❌
- **Result**: Fusion blocked, cycle treated as atomic unit

#### ❌ **Unsafe Feedback with Infinite Multiplicity**

```
map (Pure) → flatMap (∞ multiplicity) → filter (Pure) → [feedback to map]
```

**Analysis**:
- Infinite multiplicity bound ❌
- **Result**: Fusion blocked to prevent uncontrolled amplification

## Optimization Algorithm

### Step-by-Step Process

1. **Graph Analysis**
   ```typescript
   // Find strongly connected components
   const sccs = findStronglyConnectedComponents(graph);
   
   // Analyze fusion edges
   const fusionEdges = analyzeFusionEdges(graph);
   ```

2. **SCC Fusion**
   ```typescript
   // Apply fusions within safe SCCs
   for (const scc of sccs) {
     if (scc.canFuse) {
       applyFusionsWithinSCC(graph, scc, fusionEdges);
     }
   }
   ```

3. **DAG Fusion**
   ```typescript
   // Perform topological sort on DAG sections
   const topoOrder = topologicalSort(graph, sccNodes);
   
   // Apply fusions in topological order
   for (const nodeId of topoOrder) {
     applyFusionsFromNode(graph, nodeId, fusionEdges);
   }
   ```

### Fusion Application

When fusing nodes, the system:

1. **Creates fused stream** with combined logic
2. **Updates effect tags** using `maxEffectTag()`
3. **Updates usage bounds** using `calculateFusedBound()`
4. **Maintains graph connectivity** by updating references

```typescript
private fuseNodes<S>(graph: StreamGraph<S>, edge: FusionEdge): void {
  // Create fused stream with combined logic
  const fusedStream = {
    usageBound: edge.fusedBound!,
    effectTag: edge.fusedEffectTag!,
    run: (input: any) => {
      const fromStateFn = fromNode.stream.run(input);
      const toStateFn = toNode.stream.run(input);
      
      return (state: any) => {
        const [fromResult, fromState] = fromStateFn(state);
        const [toResult, toState] = toStateFn(fromState);
        return [toResult, toState];
      };
    }
  };
  
  // Update graph structure
  // ...
}
```

## Visual Examples

### Linear Graph Fusion

**Before Optimization**:
```
A (Pure) → B (Pure) → C (Pure) → D (Pure)
```

**After Optimization**:
```
A->B->C->D (Pure)  // All nodes fused
```

### Branching Graph Fusion

**Before Optimization**:
```
        → B1 (Pure) →
A (Pure) → B2 (Pure) → C (DeterministicEffect)
        → B3 (Pure) →
```

**After Optimization**:
```
        → B1 (Pure) →
A (Pure) → B2 (Pure) → C (DeterministicEffect)
        → B3 (Pure) →
```

**Note**: Fusion across splits and joins depends on safety conditions.

### Feedback Graph Fusion

**Before Optimization** (Safe Cycle):
```
A (Pure) → B (DeterministicEffect) → C (Pure) → [feedback to A]
```

**After Optimization**:
```
A->B->C (DeterministicEffect) → [feedback to A->B->C]
```

**Before Optimization** (Unsafe Cycle):
```
A (Pure) → B (NonDeterministicEffect) → C (Pure) → [feedback to A]
```

**After Optimization**:
```
A (Pure) → B (NonDeterministicEffect) → C (Pure) → [feedback to A]
// No fusion due to unsafe effects
```

## Graph Factory Functions

### Linear Graph Creation

```typescript
const streams = [
  { id: 'a', stream: createMapStream(x => x * 2), operator: 'map' },
  { id: 'b', stream: createFilterStream(x => x > 0), operator: 'filter' },
  { id: 'c', stream: createMapStream(x => x.toString()), operator: 'map' }
];

const graph = createLinearGraph(streams);
```

### Branching Graph Creation

```typescript
const source = { id: 'source', stream: createMapStream(x => x * 2), operator: 'map' };
const branches = [
  { id: 'branch1', stream: createFilterStream(x => x > 0), operator: 'filter' },
  { id: 'branch2', stream: createMapStream(x => x.toString()), operator: 'map' }
];
const merge = { id: 'merge', stream: createScanStream(0, (acc, x) => acc + x, 1), operator: 'scan' };

const graph = createBranchingGraph(source, branches, merge);
```

### Feedback Graph Creation

```typescript
const nodes = [
  { id: 'a', stream: createMapStream(x => x * 2), operator: 'map' },
  { id: 'b', stream: createScanStream(0, (acc, x) => acc + x, 1), operator: 'scan' },
  { id: 'c', stream: createFilterStream(x => x < 100), operator: 'filter' }
];

const graph = createFeedbackGraph(nodes, { from: 'c', to: 'a' });
```

## Graph Fusion Optimizer

### Usage

```typescript
const optimizer = new GraphAwareStreamFusionOptimizer(true); // Enable debug

const result = optimizer.optimizeGraph(graph);

console.log('Fusion statistics:', result.fusionStats);
console.log('Strongly connected components:', result.sccs);
console.log('Fusion edges:', result.fusionEdges);
```

### Fusion Statistics

The optimizer provides detailed statistics:

```typescript
interface FusionStats {
  totalEdges: number;
  eligibleEdges: number;
  fusedEdges: number;
  skippedEdges: number;
  multiplicityViolations: number;
  effectViolations: number;
  feedbackCycles: number;
}
```

## Debug Diagnostics

### Debug Output Generation

```typescript
const debugOutput = generateFusionGraphDebug(result);
console.log(debugOutput);
```

**Example Output**:
```
# Graph Fusion Debug Output

## Fusion Statistics
- Total edges: 5
- Eligible edges: 3
- Fused edges: 3
- Skipped edges: 2
- Multiplicity violations: 0
- Effect violations: 2
- Feedback cycles: 1

## Strongly Connected Components
### SCC 1
- Nodes: a -> b -> c
- Is feedback: true
- Can fuse: true

## Fusion Edges
- a -> b
  - Effect safe: true
  - Multiplicity safe: true
  - Eligible: true
  - Fused effect: Pure
  - Fused bound: 1
```

### Debug Logging

```typescript
enableGraphFusionDebug();

// Fusion attempts are logged
// [GraphFusion] Fused a -> b into a->b
// [GraphFusion] Skipping SCC fusion: Unsafe effect in cycle

disableGraphFusionDebug();
```

## Effect/Multiplicity Interplay in Non-Linear Structures

### Branching Considerations

1. **Split Safety**: Each branch must independently meet safety conditions
2. **Join Safety**: Combined inputs must not exceed multiplicity bounds
3. **Effect Propagation**: Higher effect tags propagate through joins

### Feedback Considerations

1. **Cycle Bounds**: Multiplicity must remain finite within cycles
2. **Effect Isolation**: Unsafe effects prevent fusion across cycle boundaries
3. **Amplification Control**: Feedback must not cause unbounded amplification

### Complex Topology Examples

#### **Safe Complex Graph**
```
source (Pure) → [branch1 (Pure), branch2 (Pure)] → merge (DeterministicEffect) → [feedback to source]
```

**Analysis**:
- All branches safe ✅
- Join safe ✅
- Feedback cycle safe ✅
- **Result**: Full fusion possible

#### **Unsafe Complex Graph**
```
source (Pure) → [branch1 (Pure), branch2 (ExternalEffect)] → merge (DeterministicEffect) → [feedback to source]
```

**Analysis**:
- Branch2 unsafe ❌
- Join blocked ❌
- Feedback cycle blocked ❌
- **Result**: Limited fusion, external effects preserved

## Performance Considerations

### Algorithm Complexity

- **Tarjan's SCC**: O(V + E) where V = vertices, E = edges
- **Topological Sort**: O(V + E)
- **Fusion Analysis**: O(E)
- **Overall**: O(V + E) for graph analysis + O(E) for fusion application

### Optimization Strategies

1. **Early Termination**: Stop analysis when unsafe effects detected
2. **Caching**: Cache fusion eligibility results
3. **Incremental Updates**: Only re-analyze changed graph sections

## Real-World Applications

### FRP Pipeline Optimization

```typescript
// Complex FRP pipeline with branches and feedback
const graph = createComplexFRPPipeline();

const optimizer = new GraphAwareStreamFusionOptimizer(true);
const result = optimizer.optimizeGraph(graph);

// Result: Optimized pipeline with safe fusions applied
```

### Stream Processing Networks

```typescript
// Multi-stage stream processing with parallel paths
const graph = createStreamProcessingNetwork();

const result = optimizer.optimizeGraph(graph);

// Result: Network optimized while preserving semantics
```

## Conclusion

The Graph-Aware Fusion System provides a **comprehensive solution** for optimizing complex stream graphs that:

- **Handles arbitrary topologies** including branches and feedback loops
- **Preserves semantic correctness** through effect and multiplicity safety
- **Enables aggressive optimization** for safe graph sections
- **Provides detailed diagnostics** for understanding fusion decisions
- **Scales efficiently** to large and complex graphs

By extending the effect-aware, multiplicity-safe fusion system to arbitrary graphs, the optimizer can now handle **realistic FRP/stream topologies** while maintaining the same safety guarantees as linear pipelines. 