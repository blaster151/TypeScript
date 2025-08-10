/**
 * FRP Fusion Metadata Demo
 * 
 * Demonstrates the comprehensive fusion metadata system that embeds
 * complete fusion history directly in fused nodes for analysis and visualization.
 */

console.log('🔍 FRP Fusion Metadata Demo\n');

// Mock fusion utilities
const fusionUtils = {
  fuseMapMap: (f, g) => `fuseMapMap(${f}, ${g})`,
  fuseMapFilter: (f, p) => `fuseMapFilter(${f}, ${p})`,
  fuseFilterMap: (p, f) => `fuseFilterMap(${p}, ${f})`,
  fuseFilterFilter: (p1, p2) => `fuseFilterFilter(${p1}, ${p2})`,
  fuseMapScan: (f, s) => `fuseMapScan(${f}, ${s})`,
  fuseScanMap: (s, f) => `fuseScanMap(${s}, ${f})`
};

// Mock operator metadata
const operatorRegistry = {
  map: {
    name: 'map',
    category: 'stateless',
    multiplicity: 'preserve',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter', 'scan'],
    transformBuilder: undefined
  },
  filter: {
    name: 'filter',
    category: 'stateless',
    multiplicity: 'preserve',
    fusibleBefore: ['map', 'filter'],
    fusibleAfter: ['map', 'filter'],
    transformBuilder: undefined
  },
  scan: {
    name: 'scan',
    category: 'stateful',
    multiplicity: 'preserve',
    fusibleBefore: ['map'],
    fusibleAfter: ['map'],
    transformBuilder: undefined
  }
};

// Helper functions
function getOperatorInfo(name) {
  return operatorRegistry[name];
}

function canFuse(op1, op2) {
  const info1 = getOperatorInfo(op1);
  const info2 = getOperatorInfo(op2);
  return info1 && info2 && info1.fusibleAfter.includes(op2);
}

function getFusionType(op1, op2) {
  if (!canFuse(op1, op2)) return 'not-fusible';
  const info1 = getOperatorInfo(op1);
  const info2 = getOperatorInfo(op2);
  
  if (info1.category === 'stateless' && info2.category === 'stateless') {
    return 'stateless-only';
  } else if (info1.category === 'stateless' && info2.category === 'stateful') {
    return 'stateless-before-stateful';
  }
  return 'not-fusible';
}

function createTestNode(op, fn = '(x) => x', args = []) {
  return { 
    op, 
    fn, 
    args, 
    meta: {},
    fusionMetadata: undefined
  };
}

function createFusionBuilder(op1Name, op2Name) {
  const fusionType = getFusionType(op1Name, op2Name);
  
  if (!fusionType || fusionType === 'not-fusible') {
    return undefined;
  }

  switch (`${op1Name}-${op2Name}`) {
    case 'map-map':
      return (op1, op2) => fusionUtils.fuseMapMap(op1.fn, op2.fn);
    case 'map-filter':
      return (op1, op2) => fusionUtils.fuseMapFilter(op1.fn, op2.fn);
    case 'filter-map':
      return (op1, op2) => fusionUtils.fuseFilterMap(op1.fn, op2.fn);
    case 'filter-filter':
      return (op1, op2) => fusionUtils.fuseFilterFilter(op1.fn, op2.fn);
    case 'map-scan':
      return (op1, op2) => fusionUtils.fuseMapScan(op1.fn, op2.fn);
    default:
      return undefined;
  }
}

// Initialize fusion builders
function initializeFusionBuilders() {
  for (const [opName, opInfo] of Object.entries(operatorRegistry)) {
    for (const fusibleOp of opInfo.fusibleAfter) {
      const fusionBuilder = createFusionBuilder(opName, fusibleOp);
      if (fusionBuilder) {
        opInfo.transformBuilder = fusionBuilder;
      }
    }
  }
}

// Enhanced pipeline fusion with metadata
function fusePipeline(nodes, config = defaultConfig(), trace = [], iteration = 0) {
  const result = [];
  let i = 0;
  let step = 0;
  const originalLength = nodes.length;

  while (i < nodes.length) {
    const current = nodes[i];
    const next = nodes[i + 1];

    if (next) {
      const currentMeta = getOperatorInfo(current.op);
      const nextMeta = getOperatorInfo(next.op);
    
      if (
        currentMeta && 
        nextMeta && 
        canFuse(current.op, next.op) &&
        currentMeta.transformBuilder
      ) {
        // Create fusion history entry
        const fusionHistoryEntry = {
          pass: iteration,
          step: step,
          position: i,
          operator1: current.op,
          operator2: next.op,
          fusionType: getFusionType(current.op, next.op) || 'unknown',
          timestamp: Date.now()
        };

        // Build comprehensive fusion metadata
        const fusionMetadata = {
          isFused: true,
          fusionPass: iteration,
          fusionStep: step,
          originalOperators: [current.op, next.op],
          originalPositions: [i, i + 1],
          fusionType: fusionHistoryEntry.fusionType,
          fusionTimestamp: fusionHistoryEntry.timestamp,
          fusionHistory: [fusionHistoryEntry],
          sourceNodes: [current, next]
        };

        // Merge fusion history from source nodes if they exist
        if (current.fusionMetadata?.fusionHistory) {
          fusionMetadata.fusionHistory.unshift(...current.fusionMetadata.fusionHistory);
        }
        if (next.fusionMetadata?.fusionHistory) {
          fusionMetadata.fusionHistory.unshift(...next.fusionMetadata.fusionHistory);
        }

        // Create fused node with metadata
        const fusedNode = {
          op: `${current.op}+${next.op}`,
          fn: currentMeta.transformBuilder(current, next),
          meta: { fused: true, originalOps: [current.op, next.op] },
          fusionMetadata
        };
        result.push(fusedNode);

        // Record fusion trace
        if (config.enableTracing) {
          const fusionTrace = {
            iteration,
            step: step++,
            position: i,
            operator1: current.op,
            operator2: next.op,
            fusedOperator: `${current.op}+${next.op}`,
            originalLength,
            newLength: result.length,
            fusionType: fusionHistoryEntry.fusionType,
            timestamp: fusionHistoryEntry.timestamp
          };
          trace.push(fusionTrace);

          // Log to console if enabled
          if (config.traceToConsole) {
            logFusionTrace(fusionTrace, config.logLevel);
          }
        }
    
        i += 2; // Skip the next node — it's now fused
        continue;
      }
    }
    
    result.push(current);
    i++;
  }

  return { result, trace };
}

// Recursive optimization with metadata
function optimizePipeline(nodes, config = defaultConfig()) {
  let currentNodes = [...nodes];
  let previousLength = currentNodes.length;
  let iterations = 0;
  const allTraces = [];

  if (config.enableTracing && config.traceToConsole) {
    console.log(`🔄 Starting FRP pipeline optimization with ${nodes.length} nodes`);
  }

  while (iterations < config.maxIterations) {
    const { result, trace } = fusePipeline(currentNodes, config, [], iterations);
    
    // Accumulate traces
    allTraces.push(...trace);
    
    if (result.length === previousLength) {
      // No more fusions possible
      if (config.enableTracing && config.traceToConsole) {
        console.log(`✅ Optimization complete after ${iterations} iterations`);
        console.log(`📊 Final result: ${result.length} nodes (reduced from ${nodes.length})`);
      }
      break;
    }
    
    previousLength = result.length;
    currentNodes = result;
    iterations++;
  }

  return { result: currentNodes, trace: allTraces };
}

// Configuration
function defaultConfig() {
  return {
    enableTracing: false,
    maxIterations: 10,
    logLevel: 'basic',
    traceToConsole: false
  };
}

// Logging functions
function logFusionTrace(trace, logLevel) {
  const timestamp = new Date(trace.timestamp).toISOString();
  
  switch (logLevel) {
    case 'verbose':
      console.log(`🔗 [${timestamp}] Iteration ${trace.iteration}, Step ${trace.step}:`);
      console.log(`   Position: ${trace.position}`);
      console.log(`   Fused: ${trace.operator1} + ${trace.operator2} → ${trace.fusedOperator}`);
      console.log(`   Type: ${trace.fusionType}`);
      console.log(`   Length: ${trace.originalLength} → ${trace.newLength}`);
      break;
      
    case 'detailed':
      console.log(`🔗 [${timestamp}] ${trace.operator1} + ${trace.operator2} → ${trace.fusedOperator} (${trace.fusionType})`);
      break;
      
    case 'basic':
      console.log(`🔗 ${trace.operator1} + ${trace.operator2} → ${trace.fusedOperator}`);
      break;
      
    default:
      break;
  }
}

// Metadata analysis functions
function isFusedNode(node) {
  return node.fusionMetadata?.isFused === true;
}

function getFusionHistory(node) {
  return node.fusionMetadata?.fusionHistory || [];
}

function getOriginalOperators(node) {
  return node.fusionMetadata?.originalOperators || [];
}

function getNodeFusionType(node) {
  return node.fusionMetadata?.fusionType;
}

function getFusionPass(node) {
  return node.fusionMetadata?.fusionPass;
}

function getFusionLineage(node) {
  if (!node.fusionMetadata?.fusionHistory) {
    return [node.op];
  }
  
  const lineage = [];
  for (const entry of node.fusionMetadata.fusionHistory) {
    lineage.push(`${entry.operator1} + ${entry.operator2}`);
  }
  return lineage;
}

function getFusionDescription(node) {
  if (!isFusedNode(node)) {
    return `${node.op} (unfused)`;
  }
  
  const metadata = node.fusionMetadata;
  const history = metadata.fusionHistory;
  const originalOps = metadata.originalOperators;
  
  let description = `${node.op} (fused in pass ${metadata.fusionPass})`;
  description += `\n  Original operators: ${originalOps.join(', ')}`;
  description += `\n  Fusion type: ${metadata.fusionType}`;
  description += `\n  Fusion history: ${history.length} steps`;
  
  return description;
}

function extractFusionMetadata(nodes) {
  const fusedNodes = nodes.filter(isFusedNode);
  const fusionPasses = {};
  const fusionTypes = {};
  let totalFusions = 0;
  
  for (const node of fusedNodes) {
    const metadata = node.fusionMetadata;
    
    // Group by fusion pass
    const pass = metadata.fusionPass;
    if (!fusionPasses[pass]) fusionPasses[pass] = [];
    fusionPasses[pass].push(node);
    
    // Group by fusion type
    const type = metadata.fusionType;
    if (!fusionTypes[type]) fusionTypes[type] = [];
    fusionTypes[type].push(node);
    
    totalFusions += metadata.fusionHistory.length;
  }
  
  return {
    fusedNodes,
    fusionPasses,
    fusionTypes,
    totalFusions
  };
}

function createFusionSummary(nodes) {
  const totalNodes = nodes.length;
  const fusedNodes = nodes.filter(isFusedNode);
  const fusionRate = totalNodes > 0 ? fusedNodes.length / totalNodes : 0;
  
  const passDistribution = {};
  const typeDistribution = {};
  let totalFusions = 0;
  
  for (const node of fusedNodes) {
    const metadata = node.fusionMetadata;
    
    // Pass distribution
    const pass = metadata.fusionPass;
    passDistribution[pass] = (passDistribution[pass] || 0) + 1;
    
    // Type distribution
    const type = metadata.fusionType;
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    
    totalFusions += metadata.fusionHistory.length;
  }
  
  return {
    totalNodes,
    fusedNodes: fusedNodes.length,
    fusionRate,
    passDistribution,
    typeDistribution,
    averageFusionsPerNode: fusedNodes.length > 0 ? totalFusions / fusedNodes.length : 0
  };
}

// Initialize
initializeFusionBuilders();

// Demo 1: Basic fusion with metadata
console.log('=== Demo 1: Basic Fusion with Metadata ===');
const pipeline1 = [
  createTestNode('map', '(x) => x + 1'),
  createTestNode('map', '(x) => x * 2')
];

const config1 = {
  ...defaultConfig(),
  enableTracing: true,
  traceToConsole: true,
  logLevel: 'basic'
};

const { result: result1 } = optimizePipeline(pipeline1, config1);

console.log('\n📊 Node Analysis:');
for (const node of result1) {
  console.log(getFusionDescription(node));
}

// Demo 2: Complex fusion chain with metadata
console.log('\n=== Demo 2: Complex Fusion Chain with Metadata ===');
const pipeline2 = [
  createTestNode('map', '(x) => x + 1'),
  createTestNode('filter', '(x) => x > 0'),
  createTestNode('map', '(x) => x * 2'),
  createTestNode('filter', '(x) => x < 20')
];

const config2 = {
  ...defaultConfig(),
  enableTracing: true,
  traceToConsole: true,
  logLevel: 'detailed'
};

const { result: result2 } = optimizePipeline(pipeline2, config2);

console.log('\n📊 Node Analysis:');
for (const node of result2) {
  console.log(getFusionDescription(node));
}

// Demo 3: Multi-pass fusion with metadata
console.log('\n=== Demo 3: Multi-Pass Fusion with Metadata ===');
const pipeline3 = [
  createTestNode('map', '(x) => x + 1'),
  createTestNode('map', '(x) => x * 2'),
  createTestNode('map', '(x) => x - 3'),
  createTestNode('map', '(x) => x.toString()')
];

const config3 = {
  ...defaultConfig(),
  enableTracing: true,
  traceToConsole: true,
  logLevel: 'verbose'
};

const { result: result3 } = optimizePipeline(pipeline3, config3);

console.log('\n📊 Node Analysis:');
for (const node of result3) {
  console.log(getFusionDescription(node));
}

// Demo 4: Metadata extraction and analysis
console.log('\n=== Demo 4: Metadata Extraction and Analysis ===');
const { fusedNodes, fusionPasses, fusionTypes, totalFusions } = extractFusionMetadata(result3);

console.log('🔍 Fusion Metadata Analysis:');
console.log(`   Fused nodes: ${fusedNodes.length}`);
console.log(`   Total fusions: ${totalFusions}`);
console.log(`   Fusion passes: ${Object.keys(fusionPasses).length}`);
console.log(`   Fusion types: ${Object.keys(fusionTypes).length}`);

console.log('\n📈 Pass Distribution:');
for (const [pass, nodes] of Object.entries(fusionPasses)) {
  console.log(`   Pass ${pass}: ${nodes.length} nodes`);
}

console.log('\n🎯 Type Distribution:');
for (const [type, nodes] of Object.entries(fusionTypes)) {
  console.log(`   ${type}: ${nodes.length} nodes`);
}

// Demo 5: Fusion summary
console.log('\n=== Demo 5: Fusion Summary ===');
const summary = createFusionSummary(result3);

console.log('📊 Fusion Summary:');
console.log(`   Total nodes: ${summary.totalNodes}`);
console.log(`   Fused nodes: ${summary.fusedNodes}`);
console.log(`   Fusion rate: ${(summary.fusionRate * 100).toFixed(1)}%`);
console.log(`   Average fusions per node: ${summary.averageFusionsPerNode.toFixed(2)}`);

console.log('\n📈 Pass Distribution:');
for (const [pass, count] of Object.entries(summary.passDistribution)) {
  console.log(`   Pass ${pass}: ${count} nodes`);
}

console.log('\n🎯 Type Distribution:');
for (const [type, count] of Object.entries(summary.typeDistribution)) {
  console.log(`   ${type}: ${count} nodes`);
}

// Demo 6: Fusion lineage tracking
console.log('\n=== Demo 6: Fusion Lineage Tracking ===');
console.log('🔗 Fusion Lineages:');
for (const node of result3) {
  if (isFusedNode(node)) {
    const lineage = getFusionLineage(node);
    console.log(`   ${node.op}: ${lineage.join(' → ')}`);
  }
}

console.log('\n🎉 Fusion metadata demo completed!'); 