/**
 * FP Pattern Kind Constraint Detection
 * 
 * Detects kind constraint violations for Free and Fix patterns:
 * - Free<F, A> where F is not a unary functor (Kind<Type, Type>)
 * - Fix<F> where F is not a unary functor (Kind<Type, Type>)
 */

import {
    TypeChecker,
    TypeReferenceNode,
    Node,
    DiagnosticWithLocation
} from "./types.js";

import {
    retrieveKindMetadata,
    KindMetadata
} from "./kindMetadata.js";

import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";

/**
 * Detection result for FP pattern kind constraints
 */
export interface FPPatternDetectionResult {
    isValid: boolean;
    diagnostic?: DiagnosticWithLocation;
    patternName: string;
    expectedArity: number;
    actualArity: number;
    typeArgument: Node;
}

/**
 * Detect kind constraint violations for Free and Fix patterns
 */
export function detectFPPatternKindConstraintViolations(
    node: Node,
    checker: TypeChecker
): FPPatternDetectionResult[] {
    const results: FPPatternDetectionResult[] = [];

    // Check if this is a type reference
    if (node.kind === 156) { // SyntaxKind.TypeReference
        const typeRef = node as TypeReferenceNode;
        const typeName = (typeRef.typeName as any)?.escapedText;

        if (typeName === "Free") {
            const result = detectFreeConstraintViolation(typeRef, checker);
            if (result) {
                results.push(result);
            }
        } else if (typeName === "Fix") {
            const result = detectFixConstraintViolation(typeRef, checker);
            if (result) {
                results.push(result);
            }
        }
    }

    return results;
}

/**
 * Detect Free constraint violation
 */
function detectFreeConstraintViolation(
    typeRef: TypeReferenceNode,
    checker: TypeChecker
): FPPatternDetectionResult | undefined {
    // Free<F, A> requires F to be a unary functor (Kind<Type, Type>)
    if (!typeRef.typeArguments || typeRef.typeArguments.length < 2) {
        return undefined; // Let other diagnostics handle missing arguments
    }

    const firstTypeArg = typeRef.typeArguments[0];
    const firstTypeArgType = checker.getTypeAtLocation(firstTypeArg);
    const firstTypeArgKind = retrieveKindMetadata(firstTypeArgType, checker);

    if (!firstTypeArgKind) {
        return undefined; // Not a kind type, let other diagnostics handle
    }

    // Free requires unary functors (Kind<Type, Type>)
    if (firstTypeArgKind.arity !== 1) {
        const diagnostic: DiagnosticWithLocation = {
            file: typeRef.getSourceFile(),
            start: firstTypeArg.getStart(),
            length: firstTypeArg.getWidth(),
            messageText: `Free requires a unary functor (Kind<Type, Type>), but got ${firstTypeArgKind.arity}-ary kind`,
            category: 1, // Error
            code: applyKindDiagnosticAlias(9501)
        };

        return {
            isValid: false,
            diagnostic,
            patternName: "Free",
            expectedArity: 1,
            actualArity: firstTypeArgKind.arity,
            typeArgument: firstTypeArg
        };
    }

    return {
        isValid: true,
        patternName: "Free",
        expectedArity: 1,
        actualArity: firstTypeArgKind.arity,
        typeArgument: firstTypeArg
    };
}

/**
 * Detect Fix constraint violation
 */
function detectFixConstraintViolation(
    typeRef: TypeReferenceNode,
    checker: TypeChecker
): FPPatternDetectionResult | undefined {
    // Fix<F> requires F to be a unary functor (Kind<Type, Type>)
    if (!typeRef.typeArguments || typeRef.typeArguments.length < 1) {
        return undefined; // Let other diagnostics handle missing arguments
    }

    const typeArg = typeRef.typeArguments[0];
    const typeArgType = checker.getTypeAtLocation(typeArg);
    const typeArgKind = retrieveKindMetadata(typeArgType, checker);

    if (!typeArgKind) {
        return undefined; // Not a kind type, let other diagnostics handle
    }

    // Fix requires unary functors (Kind<Type, Type>)
    if (typeArgKind.arity !== 1) {
        const diagnostic: DiagnosticWithLocation = {
            file: typeRef.getSourceFile(),
            start: typeArg.getStart(),
            length: typeArg.getWidth(),
            messageText: `Fix requires a unary functor (Kind<Type, Type>), but got ${typeArgKind.arity}-ary kind`,
            category: 1, // Error
            code: applyKindDiagnosticAlias(9501)
        };

        return {
            isValid: false,
            diagnostic,
            patternName: "Fix",
            expectedArity: 1,
            actualArity: typeArgKind.arity,
            typeArgument: typeArg
        };
    }

    return {
        isValid: true,
        patternName: "Fix",
        expectedArity: 1,
        actualArity: typeArgKind.arity,
        typeArgument: typeArg
    };
}

/**
 * Validate FP pattern kind constraints in a source file
 */
export function validateFPPatternKindConstraints(
    nodes: Node[],
    checker: TypeChecker
): DiagnosticWithLocation[] {
    const diagnostics: DiagnosticWithLocation[] = [];

    for (const node of nodes) {
        const results = detectFPPatternKindConstraintViolations(node, checker);
        
        for (const result of results) {
            if (!result.isValid && result.diagnostic) {
                diagnostics.push(result.diagnostic);
            }
        }
    }

    return diagnostics;
}

/**
 * Check if a type reference is a Free or Fix pattern
 */
export function isFPPatternTypeReference(node: Node): boolean {
    if (node.kind !== 156) { // SyntaxKind.TypeReference
        return false;
    }

    const typeRef = node as TypeReferenceNode;
    const typeName = (typeRef.typeName as any)?.escapedText;
    
    return typeName === "Free" || typeName === "Fix";
}

/**
 * Get the expected arity for an FP pattern
 */
export function getExpectedArityForFPPattern(patternName: string): number {
    switch (patternName) {
        case "Free":
        case "Fix":
            return 1; // Both require unary functors
        default:
            return 0;
    }
}

/**
 * Get diagnostic message for FP pattern constraint violation
 */
export function getFPPatternConstraintViolationMessage(
    patternName: string,
    expectedArity: number,
    actualArity: number
): string {
    return `${patternName} requires a ${expectedArity}-ary functor (Kind<Type, Type>), but got ${actualArity}-ary kind`;
} 