/**
 * FRP Fusion Tracing Demo
 * 
 * Demonstrates the comprehensive fusion tracing capabilities with real examples
 * showing detailed logging, reporting, and analysis features.
 */

console.log('🔍 FRP Fusion Tracing Demo\n');

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
  return { op, fn, args, meta: {} };
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

// Enhanced pipeline fusion with tracing
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
        // Create fused node
        const fusedNode = {
          op: `${current.op}+${next.op}`,
          fn: currentMeta.transformBuilder(current, next),
          meta: { fused: true, originalOps: [current.op, next.op] }
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

// Recursive optimization with tracing
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

// Report generation
function generateFusionReport(trace) {
  const fusionTypes = {};
  let totalTime = 0;
  
  for (const entry of trace) {
    fusionTypes[entry.fusionType] = (fusionTypes[entry.fusionType] || 0) + 1;
    totalTime += entry.timestamp;
  }
  
  const iterations = trace.length > 0 ? Math.max(...trace.map(t => t.iteration)) + 1 : 0;
  
  return {
    totalFusions: trace.length,
    iterations,
    fusionTypes,
    performance: {
      totalTime,
      averageTimePerFusion: trace.length > 0 ? totalTime / trace.length : 0
    }
  };
}

// Initialize
initializeFusionBuilders();

// Demo 1: Basic tracing with simple map-map fusion
console.log('=== Demo 1: Basic Map-Map Fusion ===');
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

const { result: result1, trace: trace1 } = optimizePipeline(pipeline1, config1);
console.log(`Result: ${result1.length} nodes\n`);

// Demo 2: Detailed tracing with complex chain
console.log('=== Demo 2: Complex Fusion Chain ===');
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

const { result: result2, trace: trace2 } = optimizePipeline(pipeline2, config2);
console.log(`Result: ${result2.length} nodes\n`);

// Demo 3: Verbose tracing with mixed operators
console.log('=== Demo 3: Mixed Operator Types ===');
const pipeline3 = [
  createTestNode('map', '(x) => x + 1'),
  createTestNode('scan', '(acc, x) => acc + x', [0]),
  createTestNode('map', '(x) => x * 2')
];

const config3 = {
  ...defaultConfig(),
  enableTracing: true,
  traceToConsole: true,
  logLevel: 'verbose'
};

const { result: result3, trace: trace3 } = optimizePipeline(pipeline3, config3);
console.log(`Result: ${result3.length} nodes\n`);

// Demo 4: Fusion report generation
console.log('=== Demo 4: Fusion Report ===');
const report = generateFusionReport([...trace1, ...trace2, ...trace3]);
console.log('📊 Fusion Report:');
console.log(`   Total Fusions: ${report.totalFusions}`);
console.log(`   Iterations: ${report.iterations}`);
console.log(`   Fusion Types:`, report.fusionTypes);
console.log(`   Performance: ${report.performance.averageTimePerFusion.toFixed(2)}ms average per fusion\n`);

// Demo 5: No tracing (performance mode)
console.log('=== Demo 5: Performance Mode (No Tracing) ===');
const pipeline4 = [
  createTestNode('map', '(x) => x + 1'),
  createTestNode('map', '(x) => x * 2'),
  createTestNode('map', '(x) => x - 3'),
  createTestNode('map', '(x) => x.toString()')
];

const config4 = {
  ...defaultConfig(),
  enableTracing: false,
  traceToConsole: false
};

const startTime = Date.now();
const { result: result4, trace: trace4 } = optimizePipeline(pipeline4, config4);
const endTime = Date.now();

console.log(`Optimization completed in ${endTime - startTime}ms`);
console.log(`Result: ${result4.length} nodes (reduced from ${pipeline4.length})`);
console.log(`Trace entries: ${trace4.length}\n`);

console.log('🎉 Fusion tracing demo completed!'); 