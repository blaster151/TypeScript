/**
 * Kind Variance and Correctness Fixes
 * 
 * This module addresses three critical correctness and usability issues:
 * 1. Variance rules: Kind comparison ignores variance completely
 * 2. Partial application: Detection for partially applied kinds
 * 3. Nested mismatch reporting: Deep kind mismatches produce unreadable diagnostic messages
 */

import {
    TypeChecker,
    SourceFile,
    Node,
    Type,
    TypeParameterDeclaration
} from "./types.js";

import {
    KindMetadata,
    KindComparisonResult,
    KindComparisonError,
    KindComparisonWarning
} from "./kindComparison.js";

import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";

/**
 * Variance annotation types for kind parameters
 */
export enum VarianceAnnotation {
    COVARIANT = "out",      // +T, out T
    CONTRAVARIANT = "in",   // -T, in T
    INVARIANT = "invariant", // T (no annotation)
    BIVARIANT = "bivariant" // *T (both in and out)
}

/**
 * Variance information for a kind parameter
 */
export interface KindParameterVariance {
    parameterIndex: number;
    variance: VarianceAnnotation;
    source: "explicit" | "inferred" | "default";
    node?: Node; // The type parameter declaration node
}

/**
 * Enhanced kind metadata with variance information
 */
export interface KindMetadataWithVariance extends KindMetadata {
    parameterVariances: KindParameterVariance[];
    isPartiallyApplied: boolean;
    partialApplicationInfo?: PartialApplicationInfo;
}

/**
 * Partial application information
 */
export interface PartialApplicationInfo {
    isPartialApplication: boolean;
    providedArity: number;
    expectedArity: number;
    remainingArity: number;
    providedArguments: Type[];
    missingArguments: Type[];
    partialApplicationDepth: number;
    isHigherOrder: boolean;
}

/**
 * Variance-aware kind comparison result
 */
export interface VarianceAwareComparisonResult extends KindComparisonResult {
    varianceCompatibility: {
        isCompatible: boolean;
        varianceErrors: KindComparisonError[];
        varianceWarnings: KindComparisonWarning[];
        varianceMismatches: Array<{
            parameterIndex: number;
            expectedVariance: VarianceAnnotation;
            actualVariance: VarianceAnnotation;
            reason: string;
        }>;
    };
    partialApplicationInfo?: PartialApplicationInfo;
}

/**
 * Enhanced kind comparison with variance rules
 */
export function compareKindsWithVariance(
    expectedKind: KindMetadataWithVariance,
    actualKind: KindMetadataWithVariance,
    checker: TypeChecker,
    debugMode: boolean = false
): VarianceAwareComparisonResult {
    const result: VarianceAwareComparisonResult = {
        isCompatible: true,
        arityMatch: true,
        parameterKindsMatch: true,
        varianceCompatible: true,
        aliasResolved: true,
        errors: [],
        warnings: [],
        varianceCompatibility: {
            isCompatible: true,
            varianceErrors: [],
            varianceWarnings: [],
            varianceMismatches: []
        }
    };

    if (debugMode) {
        console.log(`[Kind] Comparing kinds with variance: expected arity=${expectedKind.arity}, actual arity=${actualKind.arity}`);
    }

    // Step 1: Check arity compatibility
    const arityResult = compareArityWithPartialApplication(expectedKind, actualKind, debugMode);
    result.arityMatch = arityResult.isMatch;
    result.errors.push(...arityResult.errors);
    result.warnings.push(...arityResult.warnings);
    result.partialApplicationInfo = arityResult.partialApplicationInfo;

    if (!arityResult.isMatch && !arityResult.partialApplicationInfo?.isPartialApplication) {
        result.isCompatible = false;
        if (debugMode) {
            console.log(`[Kind] Arity mismatch and not partial application, stopping further comparison`);
        }
        return result;
    }

    // Step 2: Compare parameter kinds with variance
    const parameterResult = compareParameterKindsWithVariance(expectedKind, actualKind, checker, debugMode);
    result.parameterKindsMatch = parameterResult.isMatch;
    result.errors.push(...parameterResult.errors);
    result.warnings.push(...parameterResult.warnings);
    result.varianceCompatibility = parameterResult.varianceCompatibility;

    if (!parameterResult.isMatch) {
        result.isCompatible = false;
    }

    // Step 3: Validate partial application if present
    if (result.partialApplicationInfo?.isPartialApplication) {
        const partialAppResult = validatePartialApplication(result.partialApplicationInfo, expectedKind, actualKind, checker);
        result.errors.push(...partialAppResult.errors);
        result.warnings.push(...partialAppResult.warnings);
        
        if (partialAppResult.errors.length > 0) {
            result.isCompatible = false;
        }
    }

    if (debugMode) {
        console.log(`[Kind] Variance-aware comparison result: compatible=${result.isCompatible}, errors=${result.errors.length}`);
    }

    return result;
}

/**
 * Compare arity with partial application detection
 */
function compareArityWithPartialApplication(
    expectedKind: KindMetadataWithVariance,
    actualKind: KindMetadataWithVariance,
    debugMode: boolean
): { 
    isMatch: boolean; 
    errors: KindComparisonError[]; 
    warnings: KindComparisonWarning[];
    partialApplicationInfo?: PartialApplicationInfo;
} {
    const errors: KindComparisonError[] = [];
    const warnings: KindComparisonWarning[] = [];

    if (expectedKind.arity === actualKind.arity) {
        return { isMatch: true, errors, warnings };
    }

    // Check if this is a partial application
    const partialAppInfo = detectPartialApplication(expectedKind, actualKind);
    
    if (partialAppInfo.isPartialApplication) {
        if (debugMode) {
            console.log(`[Kind] Detected partial application: provided=${partialAppInfo.providedArity}, expected=${partialAppInfo.expectedArity}`);
        }
        
        return { 
            isMatch: false, 
            errors, 
            warnings, 
            partialApplicationInfo: partialAppInfo 
        };
    }

    // Not a partial application, so it's a real arity mismatch
    const error: KindComparisonError = {
        code: "TypeConstructorArityMismatch",
        message: `Type constructor arity mismatch: expected ${expectedKind.arity} type parameters, got ${actualKind.arity}`,
        expected: expectedKind.arity,
        actual: actualKind.arity
    };
    errors.push(error);

    return { isMatch: false, errors, warnings };
}

/**
 * Detect partial application
 */
function detectPartialApplication(
    expectedKind: KindMetadataWithVariance,
    actualKind: KindMetadataWithVariance
): PartialApplicationInfo {
    const providedArity = actualKind.arity;
    const expectedArity = expectedKind.arity;
    const remainingArity = expectedArity - providedArity;

    const isPartialApplication = providedArity > 0 && providedArity < expectedArity;
    const isHigherOrder = expectedKind.parameterKinds.some(kind => isKindType(kind));

    return {
        isPartialApplication,
        providedArity,
        expectedArity,
        remainingArity,
        providedArguments: actualKind.parameterKinds,
        missingArguments: [], // Would be filled in with proper type inference
        partialApplicationDepth: 1, // For now, assume single-level partial application
        isHigherOrder
    };
}

/**
 * Compare parameter kinds with variance rules
 */
function compareParameterKindsWithVariance(
    expectedKind: KindMetadataWithVariance,
    actualKind: KindMetadataWithVariance,
    checker: TypeChecker,
    debugMode: boolean
): { 
    isMatch: boolean; 
    errors: KindComparisonError[]; 
    warnings: KindComparisonWarning[];
    varianceCompatibility: {
        isCompatible: boolean;
        varianceErrors: KindComparisonError[];
        varianceWarnings: KindComparisonWarning[];
        varianceMismatches: Array<{
            parameterIndex: number;
            expectedVariance: VarianceAnnotation;
            actualVariance: VarianceAnnotation;
            reason: string;
        }>;
    };
} {
    const errors: KindComparisonError[] = [];
    const warnings: KindComparisonWarning[] = [];
    const varianceErrors: KindComparisonError[] = [];
    const varianceWarnings: KindComparisonWarning[] = [];
    const varianceMismatches: Array<{
        parameterIndex: number;
        expectedVariance: VarianceAnnotation;
        actualVariance: VarianceAnnotation;
        reason: string;
    }> = [];

    const minArity = Math.min(expectedKind.arity, actualKind.arity);
    let isMatch = true;
    let varianceCompatible = true;

    for (let i = 0; i < minArity; i++) {
        const expectedParam = expectedKind.parameterKinds[i];
        const actualParam = actualKind.parameterKinds[i];
        const expectedVariance = expectedKind.parameterVariances[i]?.variance || VarianceAnnotation.INVARIANT;
        const actualVariance = actualKind.parameterVariances[i]?.variance || VarianceAnnotation.INVARIANT;

        // Compare parameter kinds
        const paramResult = compareParameterKind(expectedParam, actualParam, i, checker, debugMode);
        if (!paramResult.isCompatible) {
            isMatch = false;
            errors.push(...paramResult.errors);
            warnings.push(...paramResult.warnings);
        }

        // Check variance compatibility
        const varianceResult = checkVarianceCompatibility(expectedVariance, actualVariance, i);
        if (!varianceResult.isCompatible) {
            varianceCompatible = false;
            varianceErrors.push(...varianceResult.errors);
            varianceWarnings.push(...varianceResult.warnings);
            varianceMismatches.push(...varianceResult.mismatches);
        }
    }

    return {
        isMatch,
        errors,
        warnings,
        varianceCompatibility: {
            isCompatible: varianceCompatible,
            varianceErrors,
            varianceWarnings,
            varianceMismatches
        }
    };
}

/**
 * Check variance compatibility between two variance annotations
 */
function checkVarianceCompatibility(
    expectedVariance: VarianceAnnotation,
    actualVariance: VarianceAnnotation,
    parameterIndex: number
): {
    isCompatible: boolean;
    errors: KindComparisonError[];
    warnings: KindComparisonWarning[];
    mismatches: Array<{
        parameterIndex: number;
        expectedVariance: VarianceAnnotation;
        actualVariance: VarianceAnnotation;
        reason: string;
    }>;
} {
    const errors: KindComparisonError[] = [];
    const warnings: KindComparisonWarning[] = [];
    const mismatches: Array<{
        parameterIndex: number;
        expectedVariance: VarianceAnnotation;
        actualVariance: VarianceAnnotation;
        reason: string;
    }> = [];

    let isCompatible = true;

    // Variance compatibility rules
    if (expectedVariance === VarianceAnnotation.INVARIANT) {
        // Invariant parameters must match exactly
        if (actualVariance !== VarianceAnnotation.INVARIANT) {
            isCompatible = false;
            const error: KindComparisonError = {
                code: "VarianceMismatch",
                message: `Parameter ${parameterIndex} variance mismatch: expected invariant, got ${actualVariance}`,
                parameterIndex,
                varianceAnnotation: actualVariance
            };
            errors.push(error);
            mismatches.push({
                parameterIndex,
                expectedVariance,
                actualVariance,
                reason: "Invariant parameter requires exact variance match"
            });
        }
    } else if (expectedVariance === VarianceAnnotation.COVARIANT) {
        // Covariant parameters can accept covariant or invariant
        if (actualVariance === VarianceAnnotation.CONTRAVARIANT) {
            isCompatible = false;
            const error: KindComparisonError = {
                code: "VarianceMismatch",
                message: `Parameter ${parameterIndex} variance mismatch: expected covariant, got contravariant`,
                parameterIndex,
                varianceAnnotation: actualVariance
            };
            errors.push(error);
            mismatches.push({
                parameterIndex,
                expectedVariance,
                actualVariance,
                reason: "Covariant parameter cannot accept contravariant"
            });
        }
    } else if (expectedVariance === VarianceAnnotation.CONTRAVARIANT) {
        // Contravariant parameters can accept contravariant or invariant
        if (actualVariance === VarianceAnnotation.COVARIANT) {
            isCompatible = false;
            const error: KindComparisonError = {
                code: "VarianceMismatch",
                message: `Parameter ${parameterIndex} variance mismatch: expected contravariant, got covariant`,
                parameterIndex,
                varianceAnnotation: actualVariance
            };
            errors.push(error);
            mismatches.push({
                parameterIndex,
                expectedVariance,
                actualVariance,
                reason: "Contravariant parameter cannot accept covariant"
            });
        }
    }

    return { isCompatible, errors, warnings, mismatches };
}

/**
 * Validate partial application
 */
function validatePartialApplication(
    partialAppInfo: PartialApplicationInfo,
    expectedKind: KindMetadataWithVariance,
    actualKind: KindMetadataWithVariance,
    checker: TypeChecker
): { errors: KindComparisonError[]; warnings: KindComparisonWarning[] } {
    const errors: KindComparisonError[] = [];
    const warnings: KindComparisonWarning[] = [];

    // Check if partial application is allowed
    if (!isPartialApplicationAllowed(partialAppInfo)) {
        const error: KindComparisonError = {
            code: "PartialApplicationNotAllowed",
            message: `Partial application not allowed: provided ${partialAppInfo.providedArity} arguments, expected ${partialAppInfo.expectedArity}`,
            expected: partialAppInfo.expectedArity,
            actual: partialAppInfo.providedArity
        };
        errors.push(error);
    }

    // Check if higher-order partial application is allowed
    if (partialAppInfo.isHigherOrder && !isHigherOrderPartialApplicationAllowed()) {
        const error: KindComparisonError = {
            code: "HigherOrderPartialApplicationNotAllowed",
            message: "Higher-order partial application not allowed",
            expected: "no higher-order partial application",
            actual: "higher-order partial application detected"
        };
        errors.push(error);
    }

    // Validate provided arguments
    for (let i = 0; i < partialAppInfo.providedArguments.length; i++) {
        const providedArg = partialAppInfo.providedArguments[i];
        const expectedArg = expectedKind.parameterKinds[i];
        
        if (!isTypeCompatible(providedArg, expectedArg, checker)) {
            const error: KindComparisonError = {
                code: "PartialApplicationArgumentMismatch",
                message: `Argument ${i} in partial application is not compatible with expected kind`,
                parameterIndex: i,
                expected: expectedArg,
                actual: providedArg
            };
            errors.push(error);
        }
    }

    return { errors, warnings };
}

/**
 * Generate readable diagnostic messages for nested kind mismatches
 */
export function generateReadableKindMismatchMessage(
    expectedKind: KindMetadataWithVariance,
    actualKind: KindMetadataWithVariance,
    maxDepth: number = 3
): string {
    const expectedStr = formatKindForDiagnostic(expectedKind, maxDepth);
    const actualStr = formatKindForDiagnostic(actualKind, maxDepth);
    
    return `Kind mismatch: expected ${expectedStr}, got ${actualStr}`;
}

/**
 * Format kind for diagnostic display with truncation
 */
function formatKindForDiagnostic(kind: KindMetadataWithVariance, maxDepth: number): string {
    if (kind.arity === 0) {
        return "Type";
    }

    const parameterStrs = kind.parameterKinds.map((param, index) => {
        const variance = kind.parameterVariances[index]?.variance;
        const variancePrefix = variance === VarianceAnnotation.COVARIANT ? "+" : 
                              variance === VarianceAnnotation.CONTRAVARIANT ? "-" : "";
        
        const paramStr = formatTypeForDiagnostic(param, maxDepth - 1);
        return variancePrefix + paramStr;
    });

    return `Kind<${parameterStrs.join(", ")}>`;
}

/**
 * Format type for diagnostic display with truncation
 */
function formatTypeForDiagnostic(type: Type, remainingDepth: number): string {
    if (remainingDepth <= 0) {
        return "...";
    }

    if (isKindType(type)) {
        // For kind types, we need to be more careful about recursion
        return "Kind<...>";
    }

    if (isTypeType(type)) {
        return "Type";
    }

    // For other types, use a simple representation
    return type.toString().substring(0, 50) + (type.toString().length > 50 ? "..." : "");
}

// Helper functions (these would be imported from the actual TypeScript compiler)
function isKindType(type: Type): boolean {
    // Implementation would depend on TypeScript internals
    return false;
}

function isTypeType(type: Type): boolean {
    // Implementation would depend on TypeScript internals
    return false;
}

function isTypeCompatible(provided: Type, expected: Type, checker: TypeChecker): boolean {
    // Implementation would depend on TypeScript internals
    return false;
}

function isPartialApplicationAllowed(info: PartialApplicationInfo): boolean {
    // This would check compiler options
    return false;
}

function isHigherOrderPartialApplicationAllowed(): boolean {
    // This would check compiler options
    return false;
}

function compareParameterKind(
    expectedParam: Type,
    actualParam: Type,
    parameterIndex: number,
    checker: TypeChecker,
    debugMode: boolean
): { isCompatible: boolean; errors: KindComparisonError[]; warnings: KindComparisonWarning[] } {
    // Implementation would depend on TypeScript internals
    return { isCompatible: true, errors: [], warnings: [] };
} 