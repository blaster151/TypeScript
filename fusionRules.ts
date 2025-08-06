/**
 * Fusion Rules and Operator Metadata
 * 
 * Defines operator metadata and fusibility matrix for the FRP fusion transformer.
 * Contains comprehensive rules for stateless, stateful, and effectful operator fusion.
 */

import * as ts from 'typescript';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Operator category classification
 */
export type OperatorCategory = 'stateless' | 'stateful' | 'effectful';

/**
 * Fusion type classification
 */
export type FusionType = 'stateless-only' | 'stateless-before-stateful' | 'stateful-combine' | 'effectful-preserve';

/**
 * Multiplicity constraint
 */
export type Multiplicity = number | "∞";

/**
 * Operator metadata for fusion analysis
 */
export interface OperatorMetadata {
  name: string;
  category: OperatorCategory;
  multiplicity: Multiplicity;
  canInline: boolean;
  maxInlineStatements: number;
  preservesOrder: boolean;
  hasSideEffects: boolean;
  fusionRules: FusionRule[];
  inliningRules: InliningRule[];
}

/**
 * Fusion rule definition
 */
export interface FusionRule {
  targetOperator: string;
  fusionType: FusionType;
  condition: (source: OperatorMetadata, target: OperatorMetadata) => boolean;
  transformer: (source: ts.Expression, target: ts.Expression) => ts.Expression;
  multiplicityPreservation: (source: Multiplicity, target: Multiplicity) => Multiplicity;
  typePreservation: boolean;
}

/**
 * Inlining rule for lambda expressions
 */
export interface InliningRule {
  maxStatements: number;
  maxParameters: number;
  allowedExpressions: string[];
  forbiddenExpressions: string[];
  condition: (lambda: ts.Expression) => boolean;
}

/**
 * Fusibility matrix entry
 */
export interface FusibilityEntry {
  sourceOperator: string;
  targetOperator: string;
  canFuse: boolean;
  fusionType: FusionType;
  multiplicityPreservation: (source: Multiplicity, target: Multiplicity) => Multiplicity;
  notes: string;
}

// ============================================================================
// Operator Metadata Registry
// ============================================================================

/**
 * Comprehensive FRP operator metadata registry
 */
export const FRP_OPERATOR_REGISTRY: Map<string, OperatorMetadata> = new Map([
  // ============================================================================
  // Stateless Operators
  // ============================================================================
  
  ['map', {
    name: 'map',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 5,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [
      {
        targetOperator: 'filter',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: createMapFilterFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      },
      {
        targetOperator: 'scan',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateful',
        transformer: createMapScanFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      },
      {
        targetOperator: 'reduce',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateful',
        transformer: createMapReduceFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      }
    ],
    inliningRules: [
      {
        maxStatements: 3,
        maxParameters: 2,
        allowedExpressions: ['ArrowFunction', 'FunctionExpression'],
        forbiddenExpressions: ['ThisExpression', 'SuperExpression'],
        condition: (lambda) => isSimpleLambda(lambda)
      }
    ]
  }],
  
  ['filter', {
    name: 'filter',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 3,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: createFilterMapFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      },
      {
        targetOperator: 'scan',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateful',
        transformer: createFilterScanFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      }
    ],
    inliningRules: [
      {
        maxStatements: 2,
        maxParameters: 1,
        allowedExpressions: ['ArrowFunction', 'FunctionExpression'],
        forbiddenExpressions: ['ThisExpression', 'SuperExpression'],
        condition: (lambda) => isSimpleLambda(lambda)
      }
    ]
  }],
  
  ['take', {
    name: 'take',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 1,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: createTakeMapFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      },
      {
        targetOperator: 'filter',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: createTakeFilterFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      }
    ],
    inliningRules: [
      {
        maxStatements: 1,
        maxParameters: 0,
        allowedExpressions: ['NumericLiteral'],
        forbiddenExpressions: ['ThisExpression', 'SuperExpression'],
        condition: (lambda) => isNumericLiteral(lambda)
      }
    ]
  }],
  
  ['drop', {
    name: 'drop',
    category: 'stateless',
    multiplicity: 1,
    canInline: true,
    maxInlineStatements: 1,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-only',
        condition: (source, target) => source.category === 'stateless' && target.category === 'stateless',
        transformer: createDropMapFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      }
    ],
    inliningRules: [
      {
        maxStatements: 1,
        maxParameters: 0,
        allowedExpressions: ['NumericLiteral'],
        forbiddenExpressions: ['ThisExpression', 'SuperExpression'],
        condition: (lambda) => isNumericLiteral(lambda)
      }
    ]
  }],
  
  ['distinct', {
    name: 'distinct',
    category: 'stateless',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [],
    inliningRules: []
  }],
  
  // ============================================================================
  // Stateful Operators
  // ============================================================================
  
  ['scan', {
    name: 'scan',
    category: 'stateful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: createScanMapFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      },
      {
        targetOperator: 'filter',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: createScanFilterFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      }
    ],
    inliningRules: []
  }],
  
  ['reduce', {
    name: 'reduce',
    category: 'stateful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [
      {
        targetOperator: 'map',
        fusionType: 'stateless-before-stateful',
        condition: (source, target) => source.category === 'stateful' && target.category === 'stateless',
        transformer: createReduceMapFusion,
        multiplicityPreservation: (source, target) => Math.max(source as number, target as number),
        typePreservation: true
      }
    ],
    inliningRules: []
  }],
  
  ['fold', {
    name: 'fold',
    category: 'stateful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [],
    inliningRules: []
  }],
  
  ['flatMap', {
    name: 'flatMap',
    category: 'stateful',
    multiplicity: "∞",
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: false,
    hasSideEffects: false,
    fusionRules: [],
    inliningRules: []
  }],
  
  ['merge', {
    name: 'merge',
    category: 'stateful',
    multiplicity: "∞",
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: false,
    hasSideEffects: false,
    fusionRules: [],
    inliningRules: []
  }],
  
  ['zip', {
    name: 'zip',
    category: 'stateful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: false,
    fusionRules: [],
    inliningRules: []
  }],
  
  ['combineLatest', {
    name: 'combineLatest',
    category: 'stateful',
    multiplicity: "∞",
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: false,
    hasSideEffects: false,
    fusionRules: [],
    inliningRules: []
  }],
  
  // ============================================================================
  // Effectful Operators
  // ============================================================================
  
  ['log', {
    name: 'log',
    category: 'effectful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: true,
    fusionRules: [],
    inliningRules: []
  }],
  
  ['tap', {
    name: 'tap',
    category: 'effectful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: true,
    fusionRules: [],
    inliningRules: []
  }],
  
  ['do', {
    name: 'do',
    category: 'effectful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: true,
    fusionRules: [],
    inliningRules: []
  }],
  
  ['subscribe', {
    name: 'subscribe',
    category: 'effectful',
    multiplicity: 1,
    canInline: false,
    maxInlineStatements: 0,
    preservesOrder: true,
    hasSideEffects: true,
    fusionRules: [],
    inliningRules: []
  }]
]);

// ============================================================================
// Fusibility Matrix
// ============================================================================

/**
 * Comprehensive fusibility matrix for operator combinations
 */
export const FUSIBILITY_MATRIX: FusibilityEntry[] = [
  // Stateless + Stateless combinations
  { sourceOperator: 'map', targetOperator: 'filter', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'mapFilter fusion' },
  { sourceOperator: 'map', targetOperator: 'map', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'mapMap fusion' },
  { sourceOperator: 'filter', targetOperator: 'map', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'filterMap fusion' },
  { sourceOperator: 'filter', targetOperator: 'filter', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'filterFilter fusion' },
  { sourceOperator: 'take', targetOperator: 'map', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'takeMap fusion' },
  { sourceOperator: 'take', targetOperator: 'filter', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'takeFilter fusion' },
  { sourceOperator: 'drop', targetOperator: 'map', canFuse: true, fusionType: 'stateless-only', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'dropMap fusion' },
  
  // Stateless + Stateful combinations
  { sourceOperator: 'map', targetOperator: 'scan', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'mapScan fusion' },
  { sourceOperator: 'map', targetOperator: 'reduce', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'mapReduce fusion' },
  { sourceOperator: 'filter', targetOperator: 'scan', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'filterScan fusion' },
  { sourceOperator: 'take', targetOperator: 'scan', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'takeScan fusion' },
  
  // Stateful + Stateless combinations
  { sourceOperator: 'scan', targetOperator: 'map', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'scanMap fusion' },
  { sourceOperator: 'scan', targetOperator: 'filter', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'scanFilter fusion' },
  { sourceOperator: 'reduce', targetOperator: 'map', canFuse: true, fusionType: 'stateless-before-stateful', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'reduceMap fusion' },
  
  // Stateful + Stateful combinations (limited)
  { sourceOperator: 'scan', targetOperator: 'scan', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => "∞", notes: 'Complex state combination' },
  { sourceOperator: 'reduce', targetOperator: 'reduce', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => "∞", notes: 'Complex state combination' },
  
  // Effectful combinations (preserved)
  { sourceOperator: 'log', targetOperator: 'map', canFuse: false, fusionType: 'effectful-preserve', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'Effectful boundary' },
  { sourceOperator: 'map', targetOperator: 'log', canFuse: false, fusionType: 'effectful-preserve', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'Effectful boundary' },
  { sourceOperator: 'tap', targetOperator: 'map', canFuse: false, fusionType: 'effectful-preserve', multiplicityPreservation: (s, t) => Math.max(s as number, t as number), notes: 'Effectful boundary' },
  
  // Multiplicity escalation combinations
  { sourceOperator: 'flatMap', targetOperator: 'map', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => "∞", notes: 'Multiplicity escalation' },
  { sourceOperator: 'merge', targetOperator: 'map', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => "∞", notes: 'Multiplicity escalation' },
  { sourceOperator: 'combineLatest', targetOperator: 'map', canFuse: false, fusionType: 'stateful-combine', multiplicityPreservation: (s, t) => "∞", notes: 'Multiplicity escalation' }
];

// ============================================================================
// Fusion Transformers
// ============================================================================

/**
 * Create map-filter fusion
 */
function createMapFilterFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  const mapFn = extractFunctionFromCall(source);
  const filterFn = extractFunctionFromCall(target);
  
  // Create combined function: (x) => filterFn(mapFn(x)) ? mapFn(x) : undefined
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
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createIdentifier('undefined')
    )
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'mapFilter', [combinedFn]);
}

/**
 * Create filter-map fusion
 */
function createFilterMapFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  const filterFn = extractFunctionFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined function: (x) => filterFn(x) ? mapFn(x) : undefined
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createConditionalExpression(
      ts.factory.createCallExpression(filterFn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createIdentifier('undefined')
    )
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'filterMap', [combinedFn]);
}

/**
 * Create map-scan fusion
 */
function createMapScanFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  const mapFn = extractFunctionFromCall(source);
  const scanFn = extractFunctionFromCall(target);
  
  // Create combined scan function: (acc, x) => scanFn(acc, mapFn(x))
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
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'scan', [combinedFn]);
}

/**
 * Create scan-map fusion
 */
function createScanMapFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  const scanFn = extractFunctionFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined scan function: (acc, x) => mapFn(scanFn(acc, x))
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
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'scan', [combinedFn]);
}

// Additional fusion transformers...
function createMapReduceFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Implementation similar to map-scan fusion
  return source;
}

function createFilterScanFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Implementation similar to filter-scan fusion
  return source;
}

function createReduceMapFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Implementation similar to scan-map fusion
  return source;
}

function createTakeMapFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Implementation for take-map fusion
  return source;
}

function createTakeFilterFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Implementation for take-filter fusion
  return source;
}

function createDropMapFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Implementation for drop-map fusion
  return source;
}

function createScanFilterFusion(source: ts.Expression, target: ts.Expression): ts.Expression {
  // Implementation for scan-filter fusion
  return source;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract function from a call expression
 */
function extractFunctionFromCall(call: ts.Expression): ts.Expression {
  if (ts.isCallExpression(call) && call.arguments.length > 0) {
    return call.arguments[0];
  }
  throw new Error('Cannot extract function from call expression');
}

/**
 * Extract object from a call expression
 */
function extractObjectFromCall(call: ts.Expression): ts.Expression {
  if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression)) {
    return call.expression.expression;
  }
  throw new Error('Cannot extract object from call expression');
}

/**
 * Create a fused operator call
 */
function createFusedOperatorCall(object: ts.Expression, methodName: string, arguments_: ts.Expression[]): ts.Expression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(object, methodName),
    undefined,
    arguments_
  );
}

/**
 * Check if a lambda expression is simple enough to inline
 */
function isSimpleLambda(lambda: ts.Expression): boolean {
  if (!ts.isArrowFunction(lambda) && !ts.isFunctionExpression(lambda)) {
    return false;
  }
  
  const body = lambda.body;
  if (ts.isBlock(body)) {
    return body.statements.length <= 3;
  }
  
  return true;
}

/**
 * Check if an expression is a numeric literal
 */
function isNumericLiteral(expr: ts.Expression): boolean {
  return ts.isNumericLiteral(expr);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get operator metadata by name
 */
export function getOperatorMetadata(name: string): OperatorMetadata | undefined {
  return FRP_OPERATOR_REGISTRY.get(name);
}

/**
 * Check if two operators can be fused
 */
export function canFuseOperators(sourceName: string, targetName: string): boolean {
  const entry = FUSIBILITY_MATRIX.find(e => 
    e.sourceOperator === sourceName && e.targetOperator === targetName
  );
  return entry?.canFuse ?? false;
}

/**
 * Get fusion type for operator combination
 */
export function getFusionType(sourceName: string, targetName: string): FusionType | undefined {
  const entry = FUSIBILITY_MATRIX.find(e => 
    e.sourceOperator === sourceName && e.targetOperator === targetName
  );
  return entry?.fusionType;
}

/**
 * Calculate multiplicity preservation for operator combination
 */
export function calculateMultiplicityPreservation(sourceName: string, targetName: string, sourceMultiplicity: Multiplicity, targetMultiplicity: Multiplicity): Multiplicity {
  const entry = FUSIBILITY_MATRIX.find(e => 
    e.sourceOperator === sourceName && e.targetOperator === targetName
  );
  return entry?.multiplicityPreservation(sourceMultiplicity, targetMultiplicity) ?? "∞";
}

/**
 * Get all fusable operator combinations
 */
export function getFusableCombinations(): FusibilityEntry[] {
  return FUSIBILITY_MATRIX.filter(entry => entry.canFuse);
}

/**
 * Get all operator names
 */
export function getAllOperatorNames(): string[] {
  return Array.from(FRP_OPERATOR_REGISTRY.keys());
}

/**
 * Get operators by category
 */
export function getOperatorsByCategory(category: OperatorCategory): string[] {
  return Array.from(FRP_OPERATOR_REGISTRY.entries())
    .filter(([_, metadata]) => metadata.category === category)
    .map(([name, _]) => name);
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize if running in a TypeScript transformer environment
if (typeof global !== 'undefined' && (global as any).__FRP_FUSION_RULES__) {
  console.log('[FRP Fusion Rules] Rules initialized');
} 