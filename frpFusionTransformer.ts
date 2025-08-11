/**
 * FRP Fusion Transformer
 * 
 * A custom TypeScript transformer that implements compile-time fusion optimization
 * for FRP stream pipelines, detecting and fusing stateless + stateful operations
 * into single optimized operators while preserving type safety and observable behavior.
 */

import * as ts from 'typescript';

// ============================================================================
// Core Types and Interfaces
// ============================================================================

/**
 * Operator category classification
 */
export type OperatorCategory = 'stateless' | 'stateful' | 'effectful';

/**
 * Operator metadata for fusion analysis
 */
export interface OperatorMetadata {
  name: string;
  category: OperatorCategory;
  multiplicity: number | "∞";
  canInline: boolean;
  maxInlineStatements: number;
  fusionRules: FusionRule[];
}

/**
 * Fusion rule definition
 */
export interface FusionRule {
  targetOperator: string;
  fusionType: 'stateless-only' | 'stateless-before-stateful' | 'stateful-combine';
  condition: (source: OperatorMetadata, target: OperatorMetadata) => boolean;
  transformer: (source: ts.Expression, target: ts.Expression) => ts.Expression;
}

/**
 * Fusable sequence of operators
 */
export interface FusableSequence {
  operators: OperatorCall[];
  canFuse: boolean;
  fusionType: 'stateless-only' | 'stateless-before-stateful' | 'stateful-combine';
  multiplicity: number | "∞";
}

/**
 * Operator call representation
 */
export interface OperatorCall {
  name: string;
  expression: ts.Expression;
  arguments: ts.Expression[];
  metadata: OperatorMetadata;
  multiplicity: number | "∞";
}

/**
 * Fusion result
 */
export interface FusionResult {
  original: ts.Expression;
  fused: ts.Expression;
  operatorsFused: number;
  multiplicityPreserved: boolean;
  typePreserved: boolean;
}

/**
 * Transformer configuration
 */
export interface FusionTransformerConfig {
  enableStatelessFusion: boolean;
  enableStatefulFusion: boolean;
  enableLambdaInlining: boolean;
  maxInlineStatements: number;
  preserveSourceMaps: boolean;
  debugMode: boolean;
  noFusePragma: string;
}

// ============================================================================
// Operator Registry and Metadata
// ============================================================================

/**
 * FRP operator metadata registry
 */
export const FRP_OPERATORS: Map<string, OperatorMetadata> = new Map([
  // Stateless operators
  ['map', {
    name: 'map',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 3,
    fusionRules: [
      {
        targetOperator: 'filter',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: (source, target) => createMapFilterOperator(source, target)
      },
      {
        targetOperator: 'scan',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateful',
        transformer: (source, target) => createMapScanOperator(source, target)
      }
    ]
  }],
  
  ['filter', {
    name: 'filter',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 3,
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: (source, target) => createFilterMapOperator(source, target)
      }
    ]
  }],
  
  ['take', {
    name: 'take',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 2,
    fusionRules: []
  }],
  
  ['drop', {
    name: 'drop',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 2,
    fusionRules: []
  }],
  
  // Stateful operators
  ['scan', {
    name: 'scan',
    category: 'stateful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateful',
        transformer: (source, target) => createScanMapOperator(source, target)
      }
    ]
  }],
  
  ['reduce', {
    name: 'reduce',
    category: 'stateful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    fusionRules: []
  }],
  
  ['fold', {
    name: 'fold',
    category: 'stateful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    fusionRules: []
  }],
  
  // Effectful operators
  ['log', {
    name: 'log',
    category: 'effectful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    fusionRules: []
  }],
  
  ['flatMap', {
    name: 'flatMap',
    category: 'stateful',
    multiplicity: "∞",
    canInline: false,
    maxInlineStatements: 0,
    fusionRules: []
  }],
  
  ['merge', {
    name: 'merge',
    category: 'stateful',
    multiplicity: "∞",
    canInline: false,
    maxInlineStatements: 0,
    fusionRules: []
  }]
]);

// ============================================================================
// AST Pattern Matching
// ============================================================================

/**
 * Detect FRP method chains in AST
 */
export function detectFRPChains(node: ts.Node, context: ts.TransformationContext): FusableSequence[] {
  const sequences: FusableSequence[] = [];
  
  function visit(node: ts.Node): void {
    if (isFRPMethodChain(node)) {
      const sequence = extractOperatorSequence(node);
      if (sequence && sequence.operators.length > 1) {
        sequences.push(sequence);
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(node);
  return sequences;
}

/**
 * Check if node is an FRP method chain
 */
function isFRPMethodChain(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  
  // Check if it's a method call on a stream-like object
  if (ts.isPropertyAccessExpression(node.expression)) {
    const methodName = node.expression.name.text;
    return FRP_OPERATORS.has(methodName);
  }
  
  // Check if it's a pipe-style call
  if (ts.isIdentifier(node.expression) && node.expression.text === 'pipe') {
    return true;
  }
  
  return false;
}

/**
 * Extract operator sequence from method chain
 */
function extractOperatorSequence(node: ts.Node): FusableSequence | null {
  const operators: OperatorCall[] = [];
  let current = node;
  
  // Handle method chains: stream.map(f).filter(p).scan(g)
  while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    const methodName = current.expression.name.text;
    const metadata = FRP_OPERATORS.get(methodName);
    
    if (!metadata) break;
    
    operators.unshift({
      name: methodName,
      expression: current,
      arguments: Array.from(current.arguments),
      metadata,
      multiplicity: metadata.multiplicity
    });
    
    current = current.expression.expression;
  }
  
  // Handle pipe-style calls: pipe(stream, map(f), filter(p), scan(g))
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'pipe') {
    const args = Array.from(node.arguments);
    if (args.length < 2) return null;
    
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (ts.isCallExpression(arg) && ts.isIdentifier(arg.expression)) {
        const methodName = arg.expression.text;
        const metadata = FRP_OPERATORS.get(methodName);
        
        if (metadata) {
          operators.push({
            name: methodName,
            expression: arg,
            arguments: Array.from(arg.arguments),
            metadata,
            multiplicity: metadata.multiplicity
          });
        }
      }
    }
  }
  
  if (operators.length === 0) return null;
  
  // Analyze fusibility
  const canFuse = analyzeFusibility(operators);
  const fusionType = determineFusionType(operators);
  const multiplicity = calculateSequenceMultiplicity(operators);
  
  return {
    operators,
    canFuse,
    fusionType,
    multiplicity
  };
}

/**
 * Analyze if a sequence of operators can be fused
 */
function analyzeFusibility(operators: OperatorCall[]): boolean {
  if (operators.length < 2) return false;
  
  // Check multiplicity constraints
  let currentMultiplicity: number | "∞" = 1;
  for (const op of operators) {
    if (op.multiplicity === "∞") {
      currentMultiplicity = "∞";
    } else if (typeof currentMultiplicity === "number" && typeof op.multiplicity === "number") {
      currentMultiplicity = Math.max(currentMultiplicity, op.multiplicity);
    }
    
    // Abort if multiplicity would increase beyond acceptable bounds
    if (currentMultiplicity === "∞" && operators.indexOf(op) < operators.length - 1) {
      return false;
    }
  }
  
  // Check operator compatibility
  for (let i = 0; i < operators.length - 1; i++) {
    const current = operators[i];
    const next = operators[i + 1];
    
    // Check if there's a fusion rule for this pair
    const hasFusionRule = current.metadata.fusionRules.some(rule => 
      rule.targetOperator === next.name && rule.condition(current.metadata, next.metadata)
    );
    
    if (!hasFusionRule) {
      // Check basic compatibility rules
      if (current.metadata.category === 'effectful' || next.metadata.category === 'effectful') {
        return false;
      }
      
      if (current.metadata.category === 'stateful' && next.metadata.category === 'stateful') {
        // Only allow stateful combinations if they can be represented as tuples
        if (!canCombineStatefulOperators(current, next)) {
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * Determine the type of fusion for a sequence
 */
function determineFusionType(operators: OperatorCall[]): FusableSequence['fusionType'] {
  const categories = operators.map(op => op.metadata.category);
  
  if (categories.every(cat => cat === 'stateless')) {
    return 'stateless-only';
  }
  
  if (categories.some(cat => cat === 'stateful')) {
    return 'stateful-combine';
  }
  
  return 'stateless-before-stateful';
}

/**
 * Calculate the multiplicity of a sequence
 */
function calculateSequenceMultiplicity(operators: OperatorCall[]): number | "∞" {
  let multiplicity: number | "∞" = 1;
  
  for (const op of operators) {
    if (op.multiplicity === "∞") {
      multiplicity = "∞";
    } else if (typeof multiplicity === "number" && typeof op.multiplicity === "number") {
      multiplicity = Math.max(multiplicity, op.multiplicity);
    }
  }
  
  return multiplicity;
}

/**
 * Check if two stateful operators can be combined
 */
function canCombineStatefulOperators(op1: OperatorCall, op2: OperatorCall): boolean {
  // Simple heuristic: allow combination if both are scan-like operations
  return op1.name === 'scan' && op2.name === 'scan';
}

// ============================================================================
// Fusion Builder
// ============================================================================

/**
 * Build a fused operator expression from a sequence
 */
export function buildFusedOperator(
  sequence: FusableSequence,
  context: ts.TransformationContext,
  config: FusionTransformerConfig
): FusionResult {
  const { operators } = sequence;
  
  if (operators.length === 0) {
    throw new Error('Cannot build fused operator from empty sequence');
  }
  
  if (operators.length === 1) {
    return {
      original: operators[0].expression,
      fused: operators[0].expression,
      operatorsFused: 1,
      multiplicityPreserved: true,
      typePreserved: true
    };
  }
  
  // Apply fusion rules in order
  let currentExpression = operators[0].expression;
  let operatorsFused = 1;
  
  for (let i = 0; i < operators.length - 1; i++) {
    const current = operators[i];
    const next = operators[i + 1];
    
    // Find applicable fusion rule
    const fusionRule = current.metadata.fusionRules.find(rule => 
      rule.targetOperator === next.name && rule.condition(current.metadata, next.metadata)
    );
    
    if (fusionRule) {
      currentExpression = fusionRule.transformer(currentExpression, next.expression);
      operatorsFused++;
    } else {
      // Fall back to method chaining if no fusion rule applies
      currentExpression = createMethodCall(currentExpression, next.name, next.arguments);
    }
  }
  
  return {
    original: createMethodChain(operators),
    fused: currentExpression,
    operatorsFused,
    multiplicityPreserved: sequence.multiplicity !== "∞",
    typePreserved: true // TODO: Implement type preservation check
  };
}

/**
 * Create a method chain expression
 */
function createMethodChain(operators: OperatorCall[]): ts.Expression {
  let expression = operators[0].expression;
  
  for (let i = 1; i < operators.length; i++) {
    const op = operators[i];
    expression = createMethodCall(expression, op.name, op.arguments);
  }
  
  return expression;
}

/**
 * Create a method call expression
 */
function createMethodCall(
  object: ts.Expression,
  methodName: string,
  arguments_: ts.Expression[]
): ts.Expression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(object, methodName),
    undefined,
    arguments_
  );
}

// ============================================================================
// Fused Operator Creators
// ============================================================================

/**
 * Create a fused map-filter operator
 */
function createMapFilterOperator(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Extract the functions from map and filter calls
  const mapFn = extractFunctionFromCall(source);
  const filterFn = extractFunctionFromCall(target);
  
  // Create a combined function: (x) => filterFn(mapFn(x)) ? mapFn(x) : undefined
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createConditionalExpression(
      ts.factory.createCallExpression(filterFn, undefined, [
        ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')])
      ]),
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createToken(ts.SyntaxKind.ColonToken),
      ts.factory.createIdentifier('undefined')
    )
  );
  
  // Create a custom fused operator call
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      extractObjectFromCall(source),
      'mapFilter'
    ),
    undefined,
    [combinedFn]
  );
}

/**
 * Create a fused filter-map operator
 */
function createFilterMapOperator(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Extract the functions from filter and map calls
  const filterFn = extractFunctionFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create a combined function: (x) => filterFn(x) ? mapFn(x) : undefined
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createConditionalExpression(
      ts.factory.createCallExpression(filterFn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createToken(ts.SyntaxKind.ColonToken),
      ts.factory.createIdentifier('undefined')
    )
  );
  
  // Create a custom fused operator call
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      extractObjectFromCall(source),
      'filterMap'
    ),
    undefined,
    [combinedFn]
  );
}

/**
 * Create a fused map-scan operator
 */
function createMapScanOperator(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Extract the functions from map and scan calls
  const mapFn = extractFunctionFromCall(source);
  const scanFn = extractFunctionFromCall(target);
  
  // Create a combined scan function: (acc, x) => scanFn(acc, mapFn(x))
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(undefined, undefined, 'acc', undefined, undefined, undefined),
      ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)
    ],
    undefined,
    undefined,
    ts.factory.createCallExpression(scanFn, undefined, [
      ts.factory.createIdentifier('acc'),
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')])
    ])
  );
  
  // Create a scan call with the combined function
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      extractObjectFromCall(source),
      'scan'
    ),
    undefined,
    [combinedFn]
  );
}

/**
 * Create a fused scan-map operator
 */
function createScanMapOperator(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Extract the functions from scan and map calls
  const scanFn = extractFunctionFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create a combined scan function: (acc, x) => mapFn(scanFn(acc, x))
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(undefined, undefined, 'acc', undefined, undefined, undefined),
      ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)
    ],
    undefined,
    undefined,
    ts.factory.createCallExpression(mapFn, undefined, [
      ts.factory.createCallExpression(scanFn, undefined, [
        ts.factory.createIdentifier('acc'),
        ts.factory.createIdentifier('x')
      ])
    ])
  );
  
  // Create a scan call with the combined function
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      extractObjectFromCall(source),
      'scan'
    ),
    undefined,
    [combinedFn]
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract function from a call expression
 */
import { extractFunctionFromCall, extractObjectFromCall } from './fusionUtils';

/**
 * Extract object from a call expression
 */

/**
 * Check if a pragma comment is present
 */
function hasNoFusePragma(sourceFile: ts.SourceFile, pragma: string): boolean {
  const text = sourceFile.getFullText();
  return text.includes(`// ${pragma}`) || text.includes(`/* ${pragma} */`);
}

// ============================================================================
// Main Transformer
// ============================================================================

/**
 * Create the FRP fusion transformer factory
 */
export function createFRPFusionTransformer(config: FusionTransformerConfig = defaultConfig()): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    return (rootNode: ts.SourceFile) => {
      // Check for no-fuse pragma
      if (hasNoFusePragma(rootNode, config.noFusePragma)) {
        return rootNode;
      }
      
      // Detect FRP chains
      const sequences = detectFRPChains(rootNode, context);
      
      if (sequences.length === 0) {
        return rootNode;
      }
      
      if (config.debugMode) {
        console.log(`[FRP Fusion] Found ${sequences.length} fusable sequences`);
      }
      
      // Transform the AST
      function visit(node: ts.Node): ts.Node {
        // Check if this node is part of a fusable sequence
        const matchingSequence = sequences.find(seq => 
          seq.operators.some(op => op.expression === node)
        );
        
        if (matchingSequence && matchingSequence.canFuse) {
          try {
            const fusionResult = buildFusedOperator(matchingSequence, context, config);
            
            if (config.debugMode) {
              console.log(`[FRP Fusion] Fused ${fusionResult.operatorsFused} operators`);
            }
            
            return fusionResult.fused;
          } catch (error) {
            if (config.debugMode) {
              console.warn(`[FRP Fusion] Failed to fuse sequence:`, error);
            }
            return node;
          }
        }
        
        return ts.visitEachChild(node, visit, context);
      }
      
      return ts.visitNode(rootNode, visit) as ts.SourceFile;
    };
  };
}

/**
 * Default transformer configuration
 */
export function defaultConfig(): FusionTransformerConfig {
  return {
    enableStatelessFusion: true,
    enableStatefulFusion: true,
    enableLambdaInlining: true,
    maxInlineStatements: 3,
    preserveSourceMaps: true,
    debugMode: false,
    noFusePragma: '@nofuse'
  };
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize if running in a TypeScript transformer environment
if (typeof global !== 'undefined' && (global as any).__FRP_FUSION_TRANSFORMER__) {
  console.log('[FRP Fusion] Transformer initialized');
} 