/**
 * Fusion Utilities
 * 
 * Functions to build fused operator expressions and implement algebraic fusion laws
 * for the State-monoid FRP algebra fusion system.
 */

import * as ts from 'typescript';

// ============================================================================
// Core Fusion Functions
// ============================================================================

/**
 * Fuse two map operations: map(f) ∘ map(g) = map(f ∘ g)
 */
export function fuseMapMap(source: ts.Expression, target: ts.Expression): ts.Expression {
  const sourceFn = extractFunctionFromCall(source);
  const targetFn = extractFunctionFromCall(target);
  
  // Create composed function: (x) => targetFn(sourceFn(x))
  const composedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createCallExpression(targetFn, undefined, [
      ts.factory.createCallExpression(sourceFn, undefined, [ts.factory.createIdentifier('x')])
    ])
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'map', [composedFn]);
}

/**
 * Fuse map and filter: map(f) ∘ filter(p) = mapFilter(f, p)
 */
export function fuseMapFilter(source: ts.Expression, target: ts.Expression): ts.Expression {
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
 * Fuse filter and map: filter(p) ∘ map(f) = filterMap(p, f)
 */
export function fuseFilterMap(source: ts.Expression, target: ts.Expression): ts.Expression {
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
 * Fuse two filter operations: filter(p1) ∘ filter(p2) = filter(x => p1(x) && p2(x))
 */
export function fuseFilterFilter(source: ts.Expression, target: ts.Expression): ts.Expression {
  const filter1Fn = extractFunctionFromCall(source);
  const filter2Fn = extractFunctionFromCall(target);
  
  // Create conjoined function: (x) => filter1Fn(x) && filter2Fn(x)
  const conjoinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createLogicalAnd(
      ts.factory.createCallExpression(filter1Fn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createCallExpression(filter2Fn, undefined, [ts.factory.createIdentifier('x')])
    )
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'filter', [conjoinedFn]);
}

/**
 * Fuse map and scan: map(f) ∘ scan(g) = scan((acc, x) => g(acc, f(x)))
 */
export function fuseMapScan(source: ts.Expression, target: ts.Expression): ts.Expression {
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
 * Fuse scan and map: scan(f) ∘ map(g) = scanMap(f, g)
 */
export function fuseScanMap(source: ts.Expression, target: ts.Expression): ts.Expression {
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

/**
 * Fuse map and reduce: map(f) ∘ reduce(g) = reduce((acc, x) => g(acc, f(x)))
 */
export function fuseMapReduce(source: ts.Expression, target: ts.Expression): ts.Expression {
  const mapFn = extractFunctionFromCall(source);
  const reduceFn = extractFunctionFromCall(target);
  
  // Create combined reduce function: (acc, x) => reduceFn(acc, mapFn(x))
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(undefined, undefined, 'acc', undefined, undefined, undefined),
      ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)
    ],
    undefined,
    undefined,
    ts.factory.createCallExpression(reduceFn, undefined, [
      ts.factory.createIdentifier('acc'),
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')])
    ])
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'reduce', [combinedFn]);
}

/**
 * Fuse reduce and map: reduce(f) ∘ map(g) = reduceMap(f, g)
 */
export function fuseReduceMap(source: ts.Expression, target: ts.Expression): ts.Expression {
  const reduceFn = extractFunctionFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined reduce function: (acc, x) => mapFn(reduceFn(acc, x))
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
      ts.factory.createCallExpression(reduceFn, undefined, [
        ts.factory.createIdentifier('acc'),
        ts.factory.createIdentifier('x')
      ])
    ])
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'reduce', [combinedFn]);
}

/**
 * Fuse flatMap and map: flatMap(f) ∘ map(g) = flatMap(x => f(x).map(g))
 */
export function fuseFlatMapMap(source: ts.Expression, target: ts.Expression): ts.Expression {
  const flatMapFn = extractFunctionFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined flatMap function: (x) => flatMapFn(x).map(mapFn)
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createCallExpression(flatMapFn, undefined, [ts.factory.createIdentifier('x')]),
        'map'
      ),
      undefined,
      [mapFn]
    )
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'flatMap', [combinedFn]);
}

/**
 * Fuse take and map: take(n) ∘ map(f) = takeMap(n, f)
 */
export function fuseTakeMap(source: ts.Expression, target: ts.Expression): ts.Expression {
  const takeCount = extractNumericLiteralFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined function: (x) => takeCount > 0 ? mapFn(x) : undefined
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createConditionalExpression(
      ts.factory.createBinaryExpression(
        ts.factory.createIdentifier('_takeCount'),
        ts.factory.createToken(ts.SyntaxKind.GreaterThanToken),
        ts.factory.createNumericLiteral('0')
      ),
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createIdentifier('undefined')
    )
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'takeMap', [combinedFn, takeCount]);
}

/**
 * Fuse drop and map: drop(n) ∘ map(f) = dropMap(n, f)
 */
export function fuseDropMap(source: ts.Expression, target: ts.Expression): ts.Expression {
  const dropCount = extractNumericLiteralFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined function: (x) => _dropCount > 0 ? undefined : mapFn(x)
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createConditionalExpression(
      ts.factory.createBinaryExpression(
        ts.factory.createIdentifier('_dropCount'),
        ts.factory.createToken(ts.SyntaxKind.GreaterThanToken),
        ts.factory.createNumericLiteral('0')
      ),
      ts.factory.createIdentifier('undefined'),
      ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')])
    )
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'dropMap', [combinedFn, dropCount]);
}

/**
 * Fuse tap and map: tap(f) ∘ map(g) = tapMap(f, g)
 */
export function fuseTapMap(source: ts.Expression, target: ts.Expression): ts.Expression {
  const tapFn = extractFunctionFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined function: (x) => { tapFn(x); return mapFn(x); }
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createBlock([
      ts.factory.createExpressionStatement(
        ts.factory.createCallExpression(tapFn, undefined, [ts.factory.createIdentifier('x')])
      ),
      ts.factory.createReturnStatement(
        ts.factory.createCallExpression(mapFn, undefined, [ts.factory.createIdentifier('x')])
      )
    ])
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'tapMap', [combinedFn]);
}

/**
 * Fuse mapTo and map: mapTo(v) ∘ map(f) = mapTo(f(v))
 */
export function fuseMapToMap(source: ts.Expression, target: ts.Expression): ts.Expression {
  const mapToValue = extractValueFromCall(source);
  const mapFn = extractFunctionFromCall(target);
  
  // Create combined function: () => mapFn(mapToValue)
  const combinedFn = ts.factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    undefined,
    ts.factory.createCallExpression(mapFn, undefined, [mapToValue])
  );
  
  return createFusedOperatorCall(extractObjectFromCall(source), 'mapTo', [combinedFn]);
}

// ============================================================================
// Algebraic Law Implementations
// ============================================================================

/**
 * Create composed map function: map(f) ∘ map(g) = map(f ∘ g)
 */
export function createComposedMap(sourceFn: ts.Expression, targetFn: ts.Expression): ts.Expression {
  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createCallExpression(targetFn, undefined, [
      ts.factory.createCallExpression(sourceFn, undefined, [ts.factory.createIdentifier('x')])
    ])
  );
}

/**
 * Create conjoined filter function: filter(p1) ∘ filter(p2) = filter(x => p1(x) && p2(x))
 */
export function createConjoinedFilter(filter1Fn: ts.Expression, filter2Fn: ts.Expression): ts.Expression {
  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createLogicalAnd(
      ts.factory.createCallExpression(filter1Fn, undefined, [ts.factory.createIdentifier('x')]),
      ts.factory.createCallExpression(filter2Fn, undefined, [ts.factory.createIdentifier('x')])
    )
  );
}

/**
 * Create flatMap-map composition: flatMap(f) ∘ map(g) = flatMap(x => f(x).map(g))
 */
export function createFlatMapMap(flatMapFn: ts.Expression, mapFn: ts.Expression): ts.Expression {
  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
    undefined,
    undefined,
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createCallExpression(flatMapFn, undefined, [ts.factory.createIdentifier('x')]),
        'map'
      ),
      undefined,
      [mapFn]
    )
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract function from a call expression
 */
export function extractFunctionFromCall(call: ts.Expression): ts.Expression {
  if (ts.isCallExpression(call) && call.arguments.length > 0) {
    return call.arguments[0];
  }
  throw new Error('Cannot extract function from call expression');
}

/**
 * Extract object from a call expression
 */
export function extractObjectFromCall(call: ts.Expression): ts.Expression {
  if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression)) {
    return call.expression.expression;
  }
  throw new Error('Cannot extract object from call expression');
}

/**
 * Extract numeric literal from a call expression
 */
export function extractNumericLiteralFromCall(call: ts.Expression): ts.Expression {
  if (ts.isCallExpression(call) && call.arguments.length > 0) {
    const arg = call.arguments[0];
    if (ts.isNumericLiteral(arg)) {
      return arg;
    }
  }
  throw new Error('Cannot extract numeric literal from call expression');
}

/**
 * Extract value from a call expression
 */
export function extractValueFromCall(call: ts.Expression): ts.Expression {
  if (ts.isCallExpression(call) && call.arguments.length > 0) {
    return call.arguments[0];
  }
  throw new Error('Cannot extract value from call expression');
}

/**
 * Create a fused operator call
 */
export function createFusedOperatorCall(object: ts.Expression, methodName: string, arguments_: ts.Expression[]): ts.Expression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(object, methodName),
    undefined,
    arguments_
  );
}

/**
 * Check if a lambda expression is simple enough to inline
 */
export function isSimpleLambda(lambda: ts.Expression): boolean {
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
export function isNumericLiteral(expr: ts.Expression): boolean {
  return ts.isNumericLiteral(expr);
}

/**
 * Check if an expression is a simple value
 */
export function isSimpleValue(expr: ts.Expression): boolean {
  return ts.isNumericLiteral(expr) || 
         ts.isStringLiteral(expr) || 
         ts.isBooleanLiteral(expr) || 
         ts.isIdentifier(expr);
}

/**
 * Create a conditional expression for filtering
 */
export function createConditionalFilter(predicate: ts.Expression, value: ts.Expression): ts.Expression {
  return ts.factory.createConditionalExpression(
    predicate,
    value,
    ts.factory.createIdentifier('undefined')
  );
}

/**
 * Create a logical AND expression for conjoined filters
 */
export function createLogicalAnd(left: ts.Expression, right: ts.Expression): ts.Expression {
  return ts.factory.createLogicalAnd(left, right);
}

/**
 * Create a logical OR expression for disjoined filters
 */
export function createLogicalOr(left: ts.Expression, right: ts.Expression): ts.Expression {
  return ts.factory.createLogicalOr(left, right);
}

/**
 * Create a block statement for side effects
 */
export function createBlockWithSideEffect(sideEffect: ts.Expression, result: ts.Expression): ts.Expression {
  return ts.factory.createBlock([
    ts.factory.createExpressionStatement(sideEffect),
    ts.factory.createReturnStatement(result)
  ]);
}

// ============================================================================
// Advanced Fusion Patterns
// ============================================================================

/**
 * Fuse multiple map operations: map(f1) ∘ map(f2) ∘ ... ∘ map(fn) = map(f1 ∘ f2 ∘ ... ∘ fn)
 */
export function fuseMultipleMaps(expressions: ts.Expression[]): ts.Expression {
  if (expressions.length === 0) {
    throw new Error('Cannot fuse empty expression array');
  }
  
  if (expressions.length === 1) {
    return expressions[0];
  }
  
  // Compose functions from right to left: f1 ∘ f2 ∘ f3 = f1(f2(f3(x)))
  let composedFn = extractFunctionFromCall(expressions[expressions.length - 1]);
  
  for (let i = expressions.length - 2; i >= 0; i--) {
    const currentFn = extractFunctionFromCall(expressions[i]);
    composedFn = ts.factory.createArrowFunction(
      undefined,
      undefined,
      [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
      undefined,
      undefined,
      ts.factory.createCallExpression(currentFn, undefined, [
        ts.factory.createCallExpression(composedFn, undefined, [ts.factory.createIdentifier('x')])
      ])
    );
  }
  
  return createFusedOperatorCall(extractObjectFromCall(expressions[0]), 'map', [composedFn]);
}

/**
 * Fuse multiple filter operations: filter(p1) ∘ filter(p2) ∘ ... ∘ filter(pn) = filter(x => p1(x) && p2(x) && ... && pn(x))
 */
export function fuseMultipleFilters(expressions: ts.Expression[]): ts.Expression {
  if (expressions.length === 0) {
    throw new Error('Cannot fuse empty expression array');
  }
  
  if (expressions.length === 1) {
    return expressions[0];
  }
  
  // Conjoin predicates: p1 && p2 && p3
  let conjoinedPredicate = extractFunctionFromCall(expressions[0]);
  
  for (let i = 1; i < expressions.length; i++) {
    const currentPredicate = extractFunctionFromCall(expressions[i]);
    conjoinedPredicate = ts.factory.createArrowFunction(
      undefined,
      undefined,
      [ts.factory.createParameterDeclaration(undefined, undefined, 'x', undefined, undefined, undefined)],
      undefined,
      undefined,
      ts.factory.createLogicalAnd(
        ts.factory.createCallExpression(conjoinedPredicate, undefined, [ts.factory.createIdentifier('x')]),
        ts.factory.createCallExpression(currentPredicate, undefined, [ts.factory.createIdentifier('x')])
      )
    );
  }
  
  return createFusedOperatorCall(extractObjectFromCall(expressions[0]), 'filter', [conjoinedPredicate]);
}

/**
 * Fuse map-filter chain: map(f) ∘ filter(p) = mapFilter(f, p)
 */
export function fuseMapFilterChain(expressions: ts.Expression[]): ts.Expression {
  if (expressions.length !== 2) {
    throw new Error('Map-filter chain must have exactly 2 expressions');
  }
  
  const [mapExpr, filterExpr] = expressions;
  return fuseMapFilter(mapExpr, filterExpr);
}

/**
 * Fuse filter-map chain: filter(p) ∘ map(f) = filterMap(p, f)
 */
export function fuseFilterMapChain(expressions: ts.Expression[]): ts.Expression {
  if (expressions.length !== 2) {
    throw new Error('Filter-map chain must have exactly 2 expressions');
  }
  
  const [filterExpr, mapExpr] = expressions;
  return fuseFilterMap(filterExpr, mapExpr);
}

// ============================================================================
// Auto-initialization
// ============================================================================

// Auto-initialize if running in a TypeScript transformer environment
if (typeof global !== 'undefined' && (global as any).__FUSION_UTILS__) {
  console.log('[Fusion Utils] Utilities initialized');
} 