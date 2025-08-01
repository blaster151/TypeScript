import {
    TypeChecker,
    Type,
    TypeParameterDeclaration,
    SourceFile,
    Node,
    TypeNode,
    SyntaxKind,
} from "./types.js";
import { PartialApplicationInfo, detectPartialApplication } from "./kindPartialApplication.js";
import { PartialApplicationConfig } from "./kindPartialApplicationConfig.js";
import { KindMetadata } from "./kindMetadata.js";
import { compareKinds } from "./kindComparison.js";

/**
 * Validation result for partial application
 */
export interface PartialApplicationValidationResult {
    isValid: boolean;
    remainingArityMatch: boolean;
    suppliedArgumentsValid: boolean;
    remainingParametersValid: boolean;
    errors: PartialApplicationValidationError[];
    warnings: PartialApplicationValidationWarning[];
    quickFixes: PartialApplicationQuickFix[];
}

/**
 * Validation error for partial application
 */
export interface PartialApplicationValidationError {
    code: string;
    message: string;
    node: Node;
    sourceFile: SourceFile;
    severity: "error" | "warning";
}

/**
 * Validation warning for partial application
 */
export interface PartialApplicationValidationWarning {
    code: string;
    message: string;
    node: Node;
    sourceFile: SourceFile;
    suggestion: string;
}

/**
 * Quick fix for partial application issues
 */
export interface PartialApplicationQuickFix {
    id: string;
    description: string;
    node: Node;
    sourceFile: SourceFile;
    action: "supplyAllParameters" | "removeExtraArguments" | "adjustArity" | "fixKindMismatch";
    parameters?: {
        originalArity: number;
        targetArity: number;
        currentArguments: Type[];
        suggestedArguments?: Type[];
    };
}

/**
 * Validate partial application cases if allowed
 */
export function validatePartialApplicationCases(
    typeConstructor: Type,
    providedArguments: Type[],
    constraintArity: number,
    typeParameterName: string,
    config: PartialApplicationConfig,
    checker: TypeChecker,
    sourceFile: SourceFile,
    constraintNode: TypeParameterDeclaration
): PartialApplicationValidationResult {
    // First, detect if this is a partial application case
    const partialAppInfo = detectPartialApplication(typeConstructor, providedArguments, constraintArity, checker);
    
    if (!partialAppInfo.isPartialApplication) {
        return {
            isValid: true,
            remainingArityMatch: true,
            suppliedArgumentsValid: true,
            remainingParametersValid: true,
            errors: [],
            warnings: [],
            quickFixes: []
        };
    }

    const result: PartialApplicationValidationResult = {
        isValid: false,
        remainingArityMatch: false,
        suppliedArgumentsValid: false,
        remainingParametersValid: false,
        errors: [],
        warnings: [],
        quickFixes: []
    };

    // Validate remaining arity
    result.remainingArityMatch = validateRemainingArity(partialAppInfo, result, constraintNode, sourceFile);
    
    // Validate supplied arguments
    result.suppliedArgumentsValid = validateSuppliedArguments(partialAppInfo, result, checker, constraintNode, sourceFile);
    
    // Validate remaining parameters
    result.remainingParametersValid = validateRemainingParameters(partialAppInfo, result, checker, constraintNode, sourceFile);
    
    // Generate quick fixes
    result.quickFixes = generateQuickFixes(partialAppInfo, result, constraintNode, sourceFile);
    
    // Determine overall validity
    result.isValid = result.remainingArityMatch && result.suppliedArgumentsValid && result.remainingParametersValid;
    
    return result;
}

/**
 * Validate that remaining arity exactly matches constraint arity
 */
function validateRemainingArity(
    info: PartialApplicationInfo,
    result: PartialApplicationValidationResult,
    constraintNode: TypeParameterDeclaration,
    sourceFile: SourceFile
): boolean {
    if (info.remainingArity !== info.constraintArity) {
        const error: PartialApplicationValidationError = {
            code: "PartialApplicationArityMismatch",
            message: `Incorrect number of arguments in partial application: remaining arity ${info.remainingArity} does not match constraint arity ${info.constraintArity}`,
            node: constraintNode,
            sourceFile,
            severity: "error"
        };
        result.errors.push(error);
        return false;
    }
    return true;
}

/**
 * Validate that parameter kinds for already supplied arguments match expected kinds
 */
function validateSuppliedArguments(
    info: PartialApplicationInfo,
    result: PartialApplicationValidationResult,
    checker: TypeChecker,
    constraintNode: TypeParameterDeclaration,
    sourceFile: SourceFile
): boolean {
    let allValid = true;
    
    // Get kind metadata for the type constructor
    const kindMetadata = getKindMetadataForType(info.originalConstructor, checker);
    if (!kindMetadata || !kindMetadata.parameterKinds) {
        return true; // Can't validate without kind metadata
    }
    
    // Validate each supplied argument
    for (let i = 0; i < info.providedArguments.length && i < kindMetadata.parameterKinds.length; i++) {
        const providedArg = info.providedArguments[i];
        const expectedKind = kindMetadata.parameterKinds[i];
        
        const argKind = getKindMetadataForType(providedArg, checker);
        if (argKind) {
            const comparison = compareKinds(expectedKind, argKind, checker, false);
            if (!comparison.isCompatible) {
                const error: PartialApplicationValidationError = {
                    code: "PartialApplicationKindMismatch",
                    message: `Mismatched kinds in supplied arguments: argument ${i + 1} expected ${formatKind(expectedKind)}, got ${formatKind(argKind)}`,
                    node: constraintNode,
                    sourceFile,
                    severity: "error"
                };
                result.errors.push(error);
                allValid = false;
            }
        }
    }
    
    return allValid;
}

/**
 * Validate that remaining parameters are valid placeholders for later supply
 */
function validateRemainingParameters(
    info: PartialApplicationInfo,
    result: PartialApplicationValidationResult,
    checker: TypeChecker,
    constraintNode: TypeParameterDeclaration,
    sourceFile: SourceFile
): boolean {
    // This is a simplified validation - in practice, you'd check that:
    // 1. Remaining parameters are unbound type parameters
    // 2. They don't have conflicting constraints
    // 3. They can be properly instantiated later
    
    // For now, we assume remaining parameters are valid if arity matches
    if (info.remainingArity === info.constraintArity) {
        return true;
    }
    
    const error: PartialApplicationValidationError = {
        code: "InvalidRemainingParameters",
        message: `Remaining parameters are not valid placeholders for later supply`,
        node: constraintNode,
        sourceFile,
        severity: "error"
    };
    result.errors.push(error);
    return false;
}

/**
 * Generate quick fixes for partial application issues
 */
function generateQuickFixes(
    info: PartialApplicationInfo,
    result: PartialApplicationValidationResult,
    constraintNode: TypeParameterDeclaration,
    sourceFile: SourceFile
): PartialApplicationQuickFix[] {
    const quickFixes: PartialApplicationQuickFix[] = [];
    
    // Quick fix 1: Suggest supplying all parameters if partial application is not required
    if (info.originalArity === info.constraintArity) {
        quickFixes.push({
            id: "supplyAllParameters",
            description: "Supply all type parameters to avoid partial application",
            node: constraintNode,
            sourceFile,
            action: "supplyAllParameters",
            parameters: {
                originalArity: info.originalArity,
                targetArity: info.constraintArity,
                currentArguments: info.providedArguments
            }
        });
    }
    
    // Quick fix 2: Suggest removing extra arguments if partial application overshoots
    if (info.remainingArity < info.constraintArity) {
        const extraArgs = info.constraintArity - info.remainingArity;
        quickFixes.push({
            id: "removeExtraArguments",
            description: `Remove ${extraArgs} extra type argument(s) to match expected arity`,
            node: constraintNode,
            sourceFile,
            action: "removeExtraArguments",
            parameters: {
                originalArity: info.originalArity,
                targetArity: info.constraintArity,
                currentArguments: info.providedArguments
            }
        });
    }
    
    // Quick fix 3: Suggest adjusting arity if there's a mismatch
    if (info.remainingArity !== info.constraintArity) {
        quickFixes.push({
            id: "adjustArity",
            description: `Adjust type arguments to match expected arity ${info.constraintArity}`,
            node: constraintNode,
            sourceFile,
            action: "adjustArity",
            parameters: {
                originalArity: info.originalArity,
                targetArity: info.constraintArity,
                currentArguments: info.providedArguments
            }
        });
    }
    
    // Quick fix 4: Suggest fixing kind mismatches
    if (result.errors.some(e => e.code === "PartialApplicationKindMismatch")) {
        quickFixes.push({
            id: "fixKindMismatch",
            description: "Fix kind mismatches in type arguments",
            node: constraintNode,
            sourceFile,
            action: "fixKindMismatch",
            parameters: {
                originalArity: info.originalArity,
                targetArity: info.constraintArity,
                currentArguments: info.providedArguments
            }
        });
    }
    
    return quickFixes;
}

/**
 * Get kind metadata for a type
 */
function getKindMetadataForType(type: Type, checker: TypeChecker): KindMetadata | undefined {
    // Use the kind metadata system we've built
    if (!type.symbol) {
        return undefined;
    }
    
    // Import the retrieveKindMetadata function
    const { retrieveKindMetadata } = require("./kindMetadata.js");
    
    try {
        const kindMetadata = retrieveKindMetadata(type.symbol, checker, false);
        if (kindMetadata && kindMetadata.isValid) {
            return kindMetadata;
        }
    } catch (error) {
        // If retrieval fails, fall back to basic type checking
        console.warn("Failed to retrieve kind metadata:", error);
    }
    
    // Fallback: check if type has kind flags
    if (type.flags & 0x80000000) { // TypeFlags.Kind
        return {
            arity: (type as any).kindArity || 0,
            parameterKinds: (type as any).parameterKinds || [],
            symbol: type.symbol,
            retrievedFrom: "explicit",
            isValid: true
        };
    }
    
    return undefined;
}

/**
 * Format a kind for display
 */
function formatKind(kind: KindMetadata): string {
    return `Kind<${kind.parameterKinds?.map(k => 'Type').join(', ') || ''}>`;
}

/**
 * Apply quick fixes to resolve partial application issues
 */
export function applyPartialApplicationQuickFix(
    quickFix: PartialApplicationQuickFix,
    checker: TypeChecker
): { success: boolean; changes: any[] } {
    const changes: any[] = [];
    
    switch (quickFix.action) {
        case "supplyAllParameters":
            changes.push(applySupplyAllParametersFix(quickFix, checker));
            break;
        case "removeExtraArguments":
            changes.push(applyRemoveExtraArgumentsFix(quickFix, checker));
            break;
        case "adjustArity":
            changes.push(applyAdjustArityFix(quickFix, checker));
            break;
        case "fixKindMismatch":
            changes.push(applyFixKindMismatchFix(quickFix, checker));
            break;
    }
    
    return {
        success: changes.length > 0,
        changes
    };
}

/**
 * Apply "supply all parameters" quick fix
 */
function applySupplyAllParametersFix(quickFix: PartialApplicationQuickFix, checker: TypeChecker): any {
    // This would modify the type arguments to supply all required parameters
    return {
        type: "supplyAllParameters",
        node: quickFix.node,
        description: "Supply all type parameters",
        // In practice, you'd generate the missing type arguments
        suggestedArguments: quickFix.parameters?.suggestedArguments || []
    };
}

/**
 * Apply "remove extra arguments" quick fix
 */
function applyRemoveExtraArgumentsFix(quickFix: PartialApplicationQuickFix, checker: TypeChecker): any {
    // This would remove excess type arguments
    return {
        type: "removeExtraArguments",
        node: quickFix.node,
        description: "Remove extra type arguments",
        // In practice, you'd identify and remove the excess arguments
        argumentsToRemove: []
    };
}

/**
 * Apply "adjust arity" quick fix
 */
function applyAdjustArityFix(quickFix: PartialApplicationQuickFix, checker: TypeChecker): any {
    // This would adjust the number of type arguments to match expected arity
    return {
        type: "adjustArity",
        node: quickFix.node,
        description: "Adjust type arguments to match expected arity",
        targetArity: quickFix.parameters?.targetArity || 0
    };
}

/**
 * Apply "fix kind mismatch" quick fix
 */
function applyFixKindMismatchFix(quickFix: PartialApplicationQuickFix, checker: TypeChecker): any {
    // This would fix kind mismatches in type arguments
    return {
        type: "fixKindMismatch",
        node: quickFix.node,
        description: "Fix kind mismatches in type arguments",
        // In practice, you'd suggest compatible type arguments
        suggestedArguments: []
    };
}

/**
 * Emit targeted diagnostics for partial application validation
 */
export function emitPartialApplicationDiagnostics(
    validationResult: PartialApplicationValidationResult
): void {
    // Emit errors
    for (const error of validationResult.errors) {
        console.log(`[Kind] ${error.severity.toUpperCase()}: ${error.message}`);
    }
    
    // Emit warnings
    for (const warning of validationResult.warnings) {
        console.log(`[Kind] WARNING: ${warning.message}`);
        console.log(`[Kind] Suggestion: ${warning.suggestion}`);
    }
    
    // Emit quick fix suggestions
    for (const quickFix of validationResult.quickFixes) {
        console.log(`[Kind] Quick Fix: ${quickFix.description}`);
    }
}

/**
 * Example validation scenario
 */
export function demonstrateValidationScenario(): void {
    console.log("[Kind] Demonstrating partial application validation:");
    console.log("1. Validate remaining arity matches constraint arity");
    console.log("2. Validate supplied arguments match expected kinds");
    console.log("3. Validate remaining parameters are valid placeholders");
    console.log("4. Generate quick fixes for issues");
    console.log("5. Emit targeted diagnostics");
} 