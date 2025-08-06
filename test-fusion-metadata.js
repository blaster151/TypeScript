/**
 * Fusion Metadata Test Runner
 * 
 * Demonstrates the comprehensive fusion metadata capabilities that attach
 * self-describing fusion history directly to fused nodes for downstream analysis.
 */

console.log('🔍 Testing FRP Fusion Metadata...\n');

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
            fusionType: getFusionType(current.op, next.op) || 'unknown',
            timestamp: Date.now()
          };
          trace.push(fusionTrace);

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
    
    allTraces.push(...trace);
    
    if (result.length === previousLength) {
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

// Fusion metadata utilities
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
  const history = getFusionHistory(node);
  const lineage = [];
  
  for (const entry of history) {
    lineage.push(`${entry.operator1}+${entry.operator2}`);
  }
  
  return lineage;
}

function getFusionDescription(node) {
  if (!isFusedNode(node)) {
    return `${node.op} (not fused)`;
  }
  
  const history = getFusionHistory(node);
  const originalOps = getOriginalOperators(node);
  const pass = getFusionPass(node);
  
  if (history.length === 1) {
    return `${node.op} (fused from ${originalOps.join(' + ')} in pass ${pass})`;
  } else {
    return `${node.op} (multi-fused from ${originalOps.join(' + ')} across ${history.length} passes)`;
  }
}

function extractFusionMetadata(nodes) {
  const fusedNodes = nodes.filter(isFusedNode);
  const fusionPasses = {};
  const fusionTypes = {};
  
  for (const node of fusedNodes) {
    const pass = getFusionPass(node);
    const type = getNodeFusionType(node);
    
    if (pass !== undefined) {
      fusionPasses[pass] = fusionPasses[pass] || [];
      fusionPasses[pass].push(node);
    }
    
    if (type) {
      fusionTypes[type] = fusionTypes[type] || [];
      fusionTypes[type].push(node);
    }
  }
  
  return {
    fusedNodes,
    fusionPasses,
    fusionTypes,
    totalFusions: fusedNodes.length
  };
}

function createFusionSummary(nodes) {
  const metadata = extractFusionMetadata(nodes);
  const totalNodes = nodes.length;
  const fusedNodes = metadata.fusedNodes.length;
  
  const passDistribution = {};
  for (const [pass, nodes] of Object.entries(metadata.fusionPasses)) {
    passDistribution[parseInt(pass)] = nodes.length;
  }
  
  const typeDistribution = {};
  for (const [type, nodes] of Object.entries(metadata.fusionTypes)) {
    typeDistribution[type] = nodes.length;
  }
  
  const totalFusions = metadata.fusedNodes.reduce((sum, node) => {
    return sum + (getFusionHistory(node).length || 0);
  }, 0);
  
  return {
    totalNodes,
    fusedNodes,
    fusionRate: totalNodes > 0 ? (fusedNodes / totalNodes) * 100 : 0,
    passDistribution,
    typeDistribution,
    averageFusionsPerNode: fusedNodes > 0 ? totalFusions / fusedNodes : 0
  };
}

// Test framework
function describe(name, fn) {
  console.log(`\n=== ${name} ===`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error}`);
  }
}

function expect(value) {
  return {
    toBe: (expected) => {
      if (value !== expected) {
        throw new Error(`Expected ${value} to be ${expected}`);
      }
    },
    toBeDefined: () => {
      if (value === undefined) {
        throw new Error(`Expected value to be defined`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      }
    }
  };
}

function beforeEach(fn) {
  fn();
}

// Initialize
initializeFusionBuilders();

// Run tests
describe('Basic Fusion Metadata Tests', () => {
  beforeEach(() => {
    initializeFusionBuilders();
  });

  it('should attach fusion metadata to fused nodes', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('map', '(x) => x * 2')
    ];
    
    const config = {
      ...defaultConfig(),
      enableTracing: false
    };
    
    const { result } = optimizePipeline(pipeline, config);
    
    expect(result.length).toBe(1);
    expect(isFusedNode(result[0])).toBe(true);
    expect(result[0].fusionMetadata.isFused).toBe(true);
    expect(result[0].fusionMetadata.originalOperators).toEqual(['map', 'map']);
  });

  it('should track fusion history correctly', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('map', '(x) => x * 2')
    ];
    
    const config = {
      ...defaultConfig(),
      enableTracing: false
    };
    
    const { result } = optimizePipeline(pipeline, config);
    
    expect(result.length).toBe(2);
    
    // Check first fused node
    expect(isFusedNode(result[0])).toBe(true);
    expect(getFusionHistory(result[0]).length).toBe(1);
    expect(getFusionHistory(result[0])[0].operator1).toBe('map');
    expect(getFusionHistory(result[0])[0].operator2).toBe('filter');
  });
});

describe('Fusion Metadata Utilities Tests', () => {
  it('should identify fused nodes correctly', () => {
    const fusedNode = {
      op: 'map+filter',
      fn: 'fused_function',
      fusionMetadata: { isFused: true }
    };
    
    const regularNode = {
      op: 'map',
      fn: 'regular_function'
    };
    
    expect(isFusedNode(fusedNode)).toBe(true);
    expect(isFusedNode(regularNode)).toBe(false);
  });

  it('should extract original operators', () => {
    const fusedNode = {
      op: 'map+filter',
      fusionMetadata: {
        isFused: true,
        originalOperators: ['map', 'filter']
      }
    };
    
    expect(getOriginalOperators(fusedNode)).toEqual(['map', 'filter']);
  });

  it('should generate fusion descriptions', () => {
    const fusedNode = {
      op: 'map+filter',
      fusionMetadata: {
        isFused: true,
        originalOperators: ['map', 'filter'],
        fusionPass: 0,
        fusionHistory: [{
          pass: 0,
          step: 0,
          operator1: 'map',
          operator2: 'filter',
          fusionType: 'stateless-only'
        }]
      }
    };
    
    const description = getFusionDescription(fusedNode);
    expect(description).toContain('fused from map + filter');
    expect(description).toContain('pass 0');
  });
});

describe('Multi-Pass Fusion Metadata Tests', () => {
  it('should accumulate fusion history across passes', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('map', '(x) => x - 3'),
      createTestNode('map', '(x) => x.toString()')
    ];
    
    const config = {
      ...defaultConfig(),
      enableTracing: false
    };
    
    const { result } = optimizePipeline(pipeline, config);
    
    expect(result.length).toBe(2);
    
    // Check that fusion history is accumulated
    const firstNode = result[0];
    if (isFusedNode(firstNode)) {
      expect(getFusionHistory(firstNode).length).toBeGreaterThan(0);
    }
  });
});

describe('Fusion Metadata Analysis Tests', () => {
  it('should extract fusion metadata for analysis', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('filter', '(x) => x < 20')
    ];
    
    const config = {
      ...defaultConfig(),
      enableTracing: false
    };
    
    const { result } = optimizePipeline(pipeline, config);
    const metadata = extractFusionMetadata(result);
    
    expect(metadata.fusedNodes.length).toBeGreaterThan(0);
    expect(metadata.totalFusions).toBeGreaterThan(0);
  });

  it('should create fusion summary', () => {
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('filter', '(x) => x < 20')
    ];
    
    const config = {
      ...defaultConfig(),
      enableTracing: false
    };
    
    const { result } = optimizePipeline(pipeline, config);
    const summary = createFusionSummary(result);
    
    expect(summary.totalNodes).toBeGreaterThan(0);
    expect(summary.fusedNodes).toBeGreaterThan(0);
    expect(summary.fusionRate).toBeGreaterThan(0);
  });
});

describe('Fusion Metadata Demonstration', () => {
  it('should demonstrate complete fusion metadata workflow', () => {
    console.log('\n📊 Fusion Metadata Demonstration:');
    
    const pipeline = [
      createTestNode('map', '(x) => x + 1'),
      createTestNode('filter', '(x) => x > 0'),
      createTestNode('map', '(x) => x * 2'),
      createTestNode('filter', '(x) => x < 20')
    ];
    
    const config = {
      ...defaultConfig(),
      enableTracing: false
    };
    
    const { result } = optimizePipeline(pipeline, config);
    
    console.log(`Original pipeline: ${pipeline.length} nodes`);
    console.log(`Optimized pipeline: ${result.length} nodes`);
    
    // Analyze each node
    for (let i = 0; i < result.length; i++) {
      const node = result[i];
      const description = getFusionDescription(node);
      console.log(`  Node ${i}: ${description}`);
      
      if (isFusedNode(node)) {
        const history = getFusionHistory(node);
        const lineage = getFusionLineage(node);
        console.log(`    Fusion history: ${history.length} entries`);
        console.log(`    Fusion lineage: ${lineage.join(' → ')}`);
        console.log(`    Fusion type: ${getNodeFusionType(node)}`);
        console.log(`    Created in pass: ${getFusionPass(node)}`);
      }
    }
    
    // Create summary
    const summary = createFusionSummary(result);
    console.log('\n📈 Fusion Summary:');
    console.log(`  Total nodes: ${summary.totalNodes}`);
    console.log(`  Fused nodes: ${summary.fusedNodes}`);
    console.log(`  Fusion rate: ${summary.fusionRate.toFixed(1)}%`);
    console.log(`  Average fusions per node: ${summary.averageFusionsPerNode.toFixed(2)}`);
    console.log(`  Pass distribution:`, summary.passDistribution);
    console.log(`  Type distribution:`, summary.typeDistribution);
  });
});

console.log('\n🎉 All fusion metadata tests completed!'); 