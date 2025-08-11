// ARCHIVED: compiler-side experiment for kind/HKT toolchain (not used by live code)
import {
    Type,
    TypeFlags,
    KindType,
    TypeChecker,
    Symbol,
    DiagnosticMessage,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";
import { applyVarianceRules } from "./kindVariance.js";
import { resolveKindAliases } from "./kindAliasResolution.js";

/**
 * Result of a kind comparison
 */
export interface KindComparisonResult {
    isCompatible: boolean;
    arityMatch: boolean;
    parameterKindsMatch: boolean;
    varianceCompatible: boolean;
    aliasResolved: boolean;
    errors: KindComparisonError[];
    warnings: KindComparisonWarning[];
}

/**
 * Kind comparison error
 */
export interface KindComparisonError {
    code: string;
    message: string;
    expected?: any;
    actual?: any;
    parameterIndex?: number;
    varianceAnnotation?: string;
}

/**
 * Kind comparison warning
 */
export interface KindComparisonWarning {
    code: string;
    message: string;
    suggestion?: string;
}

/**
 * Compare two kinds for compatibility
 * This is the main entry point for kind comparison
 */
export function compareKinds(
    expectedKind: KindMetadata,
    actualKind: KindMetadata,
    checker: TypeChecker,
    debugMode: boolean = false
): KindComparisonResult {
    const result: KindComparisonResult = {
        isCompatible: true,
        arityMatch: true,
        parameterKindsMatch: true,
        varianceCompatible: true,
        aliasResolved: true,
        errors: [],
        warnings: []
    };

    if (debugMode) {
        console.log(`[Kind] Comparing kinds: expected arity=${expectedKind.arity}, actual arity=${actualKind.arity}`);
    }

    // Step 1: Check arity compatibility
    const arityResult = compareArity(expectedKind, actualKind, debugMode);
    result.arityMatch = arityResult.isMatch;
    result.errors.push(...arityResult.errors);
    result.warnings.push(...arityResult.warnings);

    if (!arityResult.isMatch) {
        result.isCompatible = false;
        if (debugMode) {
            console.log(`[Kind] Arity mismatch, stopping further comparison`);
        }
        return result;
    }

    // Step 2: Compare parameter kinds
    const parameterResult = compareParameterKinds(expectedKind, actualKind, checker, debugMode);
    result.parameterKindsMatch = parameterResult.isMatch;
    result.errors.push(...parameterResult.errors);
    result.warnings.push(...parameterResult.warnings);

    if (!parameterResult.isMatch) {
        result.isCompatible = false;
    }

    // Step 3: Apply variance rules
    const varianceResult = applyVarianceRules(expectedKind, actualKind, checker);
    result.varianceCompatible = varianceResult.isCompatible;
    result.errors.push(...varianceResult.errors);
    result.warnings.push(...varianceResult.warnings);

    if (!varianceResult.isCompatible) {
        result.isCompatible = false;
    }

    // Step 4: Handle kind aliases
    const aliasResult = resolveKindAliases(expectedKind, actualKind, checker, debugMode);
    result.aliasResolved = aliasResult.isResolved;
    result.errors.push(...aliasResult.errors);
    result.warnings.push(...aliasResult.warnings);

    if (debugMode) {
        console.log(`[Kind] Comparison result: compatible=${result.isCompatible}, errors=${result.errors.length}`);
    }

    return result;
}

/**
 * Compare arity (number of type parameters) between expected and actual kinds
 */
function compareArity(
    expectedKind: KindMetadata,
    actualKind: KindMetadata,
    debugMode: boolean
): { isMatch: boolean; errors: KindComparisonError[]; warnings: KindComparisonWarning[] } {
    const errors: KindComparisonError[] = [];
    const warnings: KindComparisonWarning[] = [];

    if (expectedKind.arity !== actualKind.arity) {
        const error: KindComparisonError = {
            code: "TypeConstructorArityMismatch",
            message: `Type constructor arity mismatch: expected ${expectedKind.arity} type parameters, got ${actualKind.arity}`,
            expected: expectedKind.arity,
            actual: actualKind.arity
        };
        errors.push(error);

        // Add suggestions
        if (actualKind.arity < expectedKind.arity) {
            warnings.push({
                code: "AddTypeParameters",
                message: `Consider adding ${expectedKind.arity - actualKind.arity} type parameter(s)`,
                suggestion: `Add type parameters to match expected arity of ${expectedKind.arity}`
            });
        } else {
            warnings.push({
                code: "RemoveTypeParameters",
                message: `Consider removing ${actualKind.arity - expectedKind.arity} type parameter(s)`,
                suggestion: `Remove type parameters to match expected arity of ${expectedKind.arity}`
            });
        }

        if (debugMode) {
            console.log(`[Kind] Arity mismatch: expected=${expectedKind.arity}, actual=${actualKind.arity}`);
        }

        return { isMatch: false, errors, warnings };
    }

    if (debugMode) {
        console.log(`[Kind] Arity match: ${expectedKind.arity}`);
    }

    return { isMatch: true, errors, warnings };
}

/**
 * Compare parameter kinds between expected and actual kinds
 */
function compareParameterKinds(
    expectedKind: KindMetadata,
    actualKind: KindMetadata,
    checker: TypeChecker,
    debugMode: boolean
): { isMatch: boolean; errors: KindComparisonError[]; warnings: KindComparisonWarning[] } {
    const errors: KindComparisonError[] = [];
    const warnings: KindComparisonWarning[] = [];

    // Ensure both kinds have the same number of parameter kinds
    if (expectedKind.parameterKinds.length !== actualKind.parameterKinds.length) {
        const error: KindComparisonError = {
            code: "ParameterKindsLengthMismatch",
            message: `Parameter kinds length mismatch: expected ${expectedKind.parameterKinds.length}, got ${actualKind.parameterKinds.length}`,
            expected: expectedKind.parameterKinds.length,
            actual: actualKind.parameterKinds.length
        };
        errors.push(error);
        return { isMatch: false, errors, warnings };
    }

    // Compare each parameter kind
    for (let i = 0; i < expectedKind.parameterKinds.length; i++) {
        const expectedParam = expectedKind.parameterKinds[i];
        const actualParam = actualKind.parameterKinds[i];

        const paramResult = compareParameterKind(expectedParam, actualParam, i, checker, debugMode);
        if (!paramResult.isCompatible) {
            errors.push(...paramResult.errors);
            warnings.push(...paramResult.warnings);
        }
    }

    const isMatch = errors.length === 0;
    if (debugMode) {
        console.log(`[Kind] Parameter kinds comparison: match=${isMatch}, errors=${errors.length}`);
    }

    return { isMatch, errors, warnings };
}

/**
 * Compare individual parameter kinds
 */
function compareParameterKind(
    expectedParam: Type,
    actualParam: Type,
    parameterIndex: number,
    checker: TypeChecker,
    debugMode: boolean
): { isCompatible: boolean; errors: KindComparisonError[]; warnings: KindComparisonWarning[] } {
    const errors: KindComparisonError[] = [];
    const warnings: KindComparisonWarning[] = [];

    // Check if both are Type
    if (isTypeType(expectedParam) && isTypeType(actualParam)) {
        if (debugMode) {
            console.log(`[Kind] Parameter ${parameterIndex}: both are Type - compatible`);
        }
        return { isCompatible: true, errors, warnings };
    }

    // Check if both are Kind<...>
    if (isKindType(expectedParam) && isKindType(actualParam)) {
        if (debugMode) {
            console.log(`[Kind] Parameter ${parameterIndex}: both are Kind types - comparing recursively`);
        }
        
        // Recursively compare inner kind signatures
        const innerResult = compareKindTypes(expectedParam, actualParam, checker, debugMode);
        if (!innerResult.isCompatible) {
            errors.push({
                code: "TypeConstructorKindParameterMismatch",
                message: `Kind parameter mismatch at index ${parameterIndex}`,
                expected: expectedParam,
                actual: actualParam,
                parameterIndex
            });
            errors.push(...innerResult.errors);
        }
        return { isCompatible: innerResult.isCompatible, errors, warnings };
    }

    // Check if one is Type and the other is Kind<...>
    if ((isTypeType(expectedParam) && isKindType(actualParam)) ||
        (isKindType(expectedParam) && isTypeType(actualParam))) {
        const error: KindComparisonError = {
            code: "TypeConstructorKindParameterMismatch",
            message: `Parameter kind mismatch at index ${parameterIndex}: expected ${isTypeType(expectedParam) ? 'Type' : 'Kind'}, got ${isTypeType(actualParam) ? 'Type' : 'Kind'}`,
            expected: expectedParam,
            actual: actualParam,
            parameterIndex
        };
        errors.push(error);

        if (debugMode) {
            console.log(`[Kind] Parameter ${parameterIndex}: Type vs Kind mismatch`);
        }

        return { isCompatible: false, errors, warnings };
    }

    // If we get here, both are neither Type nor Kind - compare structurally
    if (debugMode) {
        console.log(`[Kind] Parameter ${parameterIndex}: comparing structurally`);
    }

    // For now, assume they're compatible if they're the same type
    // In practice, you'd want more sophisticated structural comparison
    const isCompatible = expectedParam === actualParam;
    if (!isCompatible) {
        errors.push({
            code: "TypeConstructorKindParameterMismatch",
            message: `Parameter kind mismatch at index ${parameterIndex}`,
            expected: expectedParam,
            actual: actualParam,
            parameterIndex
        });
    }

    return { isCompatible, errors, warnings };
}

/**
 * Compare two KindType objects recursively
 */
function compareKindTypes(
    expectedKind: Type,
    actualKind: Type,
    checker: TypeChecker,
    debugMode: boolean
): { isCompatible: boolean; errors: KindComparisonError[] } {
    const errors: KindComparisonError[] = [];

    if (debugMode) {
        console.log(`[Kind] Comparing KindType objects recursively`);
    }

    // Check if both are KindType objects
    if (!isKindType(expectedKind) || !isKindType(actualKind)) {
        errors.push({
            code: "NestedKindMismatch",
            message: "Both types must be KindType objects for recursive comparison",
            expected: expectedKind,
            actual: actualKind
        });
        return { isCompatible: false, errors };
    }

    // Cast to KindType for access to kindArity and parameterKinds
    const expectedKindType = expectedKind as KindType;
    const actualKindType = actualKind as KindType;

    // Compare arity
    if (expectedKindType.kindArity !== actualKindType.kindArity) {
        errors.push({
            code: "NestedKindArityMismatch",
            message: `Nested kind arity mismatch: expected ${expectedKindType.kindArity}, got ${actualKindType.kindArity}`,
            expected: expectedKindType,
            actual: actualKindType
        });
        return { isCompatible: false, errors };
    }

    // Compare parameter kinds recursively
    const expectedParams = expectedKindType.parameterKinds;
    const actualParams = actualKindType.parameterKinds;

    if (expectedParams.length !== actualParams.length) {
        errors.push({
            code: "NestedKindParameterCountMismatch",
            message: `Nested kind parameter count mismatch: expected ${expectedParams.length}, got ${actualParams.length}`,
            expected: expectedKindType,
            actual: actualKindType
        });
        return { isCompatible: false, errors };
    }

    // Compare each parameter kind recursively
    for (let i = 0; i < expectedParams.length; i++) {
        const expectedParam = expectedParams[i];
        const actualParam = actualParams[i];

        if (debugMode) {
            console.log(`[Kind] Comparing nested parameter ${i}:`, expectedParam, actualParam);
        }

        // If both are KindType objects, compare recursively
        if (isKindType(expectedParam) && isKindType(actualParam)) {
            const nestedResult = compareKindTypes(expectedParam, actualParam, checker, debugMode);
            if (!nestedResult.isCompatible) {
                errors.push(...nestedResult.errors.map(error => ({
                    ...error,
                    message: `Nested parameter ${i}: ${error.message}`
                })));
            }
        }
        // If one is KindType and the other is Type, they're incompatible
        else if (isKindType(expectedParam) !== isKindType(actualParam)) {
            errors.push({
                code: "NestedKindParameterTypeMismatch",
                message: `Nested parameter ${i}: expected ${isKindType(expectedParam) ? 'KindType' : 'Type'}, got ${isKindType(actualParam) ? 'KindType' : 'Type'}`,
                expected: expectedParam,
                actual: actualParam,
                parameterIndex: i
            });
        }
        // If both are regular types, compare them structurally
        else {
            // For regular types, we can use the existing parameter comparison logic
            const paramResult = compareParameterKind(expectedParam, actualParam, i, checker, debugMode);
            if (!paramResult.isCompatible) {
                errors.push(...paramResult.errors.map(error => ({
                    ...error,
                    message: `Nested parameter ${i}: ${error.message}`
                })));
            }
        }
    }

    const isCompatible = errors.length === 0;
    return { isCompatible, errors };
}

/**
 * Check if a type is the "Type" type
 */
function isTypeType(type: Type): boolean {
    // Check if this is the built-in "Type" type
    // In TypeScript, this would typically be the "any" type or a special type representing "Type"
    // For now, we'll check if it's the "any" type as a reasonable approximation
    return !!(type.flags & TypeFlags.Any);
}

/**
 * Check if a type is a KindType
 */
function isKindType(type: Type): boolean {
    return !!(type.flags & TypeFlags.Kind);
}

// Note: Variance rules and alias resolution are now implemented in separate modules:
// - kindVariance.ts: Handles variance annotations and compatibility checking
// - kindAliasResolution.ts: Handles type alias expansion and normalization 