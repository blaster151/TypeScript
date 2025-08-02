/**
 * Kind Checker Timing Fix
 * 
 * This module addresses the call order issues where kind validation runs
 * before TypeScript has fully resolved type parameters, causing:
 * - False negatives (type isn't yet known → no validation)
 * - False positives (type is partially inferred but not final)
 */

import {
    TypeReferenceNode,
    ExpressionWithTypeArguments,
    TypeChecker,
    SourceFile,
    Type,
    TypeParameter,
    Node
} from "./types.js";

import {
    isKindTypeReference,
    isKindSensitiveContext,
    retrieveKindMetadata,
    compareKindsWithAliasSupport,
    getKindCompatibilityDiagnostic,
    validateFPPatternConstraints
} from "./kindCompatibility.js";

import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";

/**
 * Timing-aware kind validation for checkTypeReference
 * 
 * This function ensures kind validation happens AFTER type resolution is complete,
 * preventing false negatives and false positives.
 */
export function integrateKindValidationInCheckTypeReferenceWithTiming(
    node: TypeReferenceNode | ExpressionWithTypeArguments,
    checker: TypeChecker,
    sourceFile: SourceFile
): { hasKindValidation: boolean; diagnostics: any[]; shouldDefer: boolean } {
    const diagnostics: any[] = [];
    
    // Step 1: Check if this is a kind-related node
    if (!isKindTypeReference(node, checker)) {
        return { hasKindValidation: false, diagnostics: [], shouldDefer: false };
    }
    
    // Step 2: Check if we're in a kind-sensitive context
    const context = isKindSensitiveContext(node, checker);
    if (!context.isKindSensitive) {
        return { hasKindValidation: false, diagnostics: [], shouldDefer: false };
    }
    
    // Step 3: Check if type parameters are fully resolved
    const typeParameters = getTypeParametersForTypeReferenceOrImport(node);
    if (!typeParameters || typeParameters.length === 0) {
        // Type parameters not yet resolved - defer validation
        return { hasKindValidation: true, diagnostics: [], shouldDefer: true };
    }
    
    // Step 4: Check if type arguments are fully resolved
    if (node.typeArguments) {
        for (const typeArg of node.typeArguments) {
            const typeArgType = checker.getTypeFromTypeNode(typeArg);
            if (isErrorType(typeArgType) || isAnyType(typeArgType)) {
                // Type argument not yet resolved - defer validation
                return { hasKindValidation: true, diagnostics: [], shouldDefer: true };
            }
        }
    }
    
    // Step 5: Now it's safe to perform kind validation
    return performKindValidation(node, checker, sourceFile, context);
}

/**
 * Perform kind validation when all types are fully resolved
 */
function performKindValidation(
    node: TypeReferenceNode | ExpressionWithTypeArguments,
    checker: TypeChecker,
    sourceFile: SourceFile,
    context: any
): { hasKindValidation: boolean; diagnostics: any[]; shouldDefer: boolean } {
    const diagnostics: any[] = [];
    
    // Resolve actual kind from symbol metadata or inference
    const symbol = checker.getSymbolAtLocation(node.typeName);
    if (!symbol) {
        return { hasKindValidation: true, diagnostics: [], shouldDefer: false };
    }
    
    const actualKind = retrieveKindMetadata(symbol, checker, false);
    if (!actualKind || context.expectedKindArity === undefined) {
        return { hasKindValidation: true, diagnostics: [], shouldDefer: false };
    }
    
    // Create expected kind metadata from context
    const expectedKind = {
        arity: context.expectedKindArity,
        parameterKinds: context.expectedParameterKinds || [],
        symbol: symbol,
        retrievedFrom: "context",
        isValid: true
    };
    
    // Enhanced kind compatibility check with alias support
    const validation = compareKindsWithAliasSupport(expectedKind, actualKind, checker);
    
    // Emit diagnostics for violations
    if (!validation.isCompatible) {
        const diagnostic = getKindCompatibilityDiagnostic(expectedKind, actualKind, checker);
        if (diagnostic.message) {
            diagnostics.push({
                file: sourceFile,
                start: node.getStart(sourceFile),
                length: node.getWidth(sourceFile),
                messageText: diagnostic.message,
                category: 1, // Error
                code: applyKindDiagnosticAlias(diagnostic.code),
                reportsUnnecessary: false,
                reportsDeprecated: false,
                source: "ts.plus"
            });
        }
    }
    
    return { hasKindValidation: true, diagnostics, shouldDefer: false };
}

/**
 * Timing-aware FP pattern validation
 * 
 * Validates Free/Fix patterns only after type arguments are fully resolved.
 */
export function validateFPPatternsWithTiming(
    node: TypeReferenceNode | ExpressionWithTypeArguments,
    checker: TypeChecker,
    sourceFile: SourceFile
): { hasValidation: boolean; diagnostics: any[]; shouldDefer: boolean } {
    const diagnostics: any[] = [];
    
    // Check if this is an FP pattern
    if (!node.typeArguments || node.typeArguments.length === 0) {
        return { hasValidation: false, diagnostics: [], shouldDefer: false };
    }
    
    const typeName = (node.typeName as any).escapedText;
    if (typeName !== "Free" && typeName !== "Fix") {
        return { hasValidation: false, diagnostics: [], shouldDefer: false };
    }
    
    // Check if type arguments are fully resolved
    const typeArguments = node.typeArguments.map(arg => checker.getTypeFromTypeNode(arg));
    for (const typeArg of typeArguments) {
        if (isErrorType(typeArg) || isAnyType(typeArg)) {
            // Type argument not yet resolved - defer validation
            return { hasValidation: true, diagnostics: [], shouldDefer: true };
        }
    }
    
    // Now it's safe to validate FP patterns
    const validation = validateFPPatternConstraints(typeName, typeArguments, checker);
    
    if (!validation.isValid) {
        const diagnosticCode = typeName === "Free" ? 9519 : 9520;
        const message = validation.errorMessage || `FP pattern '${typeName}' kind constraint violation`;
        
        diagnostics.push({
            file: sourceFile,
            start: node.getStart(sourceFile),
            length: node.getWidth(sourceFile),
            messageText: message,
            category: 1, // Error
            code: applyKindDiagnosticAlias(diagnosticCode),
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        });
    }
    
    return { hasValidation: true, diagnostics, shouldDefer: false };
}

/**
 * Deferred validation queue for kind-related checks
 * 
 * Stores nodes that need validation after type resolution is complete.
 */
export class KindValidationQueue {
    private deferredValidations: Array<{
        node: TypeReferenceNode | ExpressionWithTypeArguments;
        checker: TypeChecker;
        sourceFile: SourceFile;
        context: any;
        timestamp: number;
    }> = [];
    
    /**
     * Add a node to the deferred validation queue
     */
    addDeferredValidation(
        node: TypeReferenceNode | ExpressionWithTypeArguments,
        checker: TypeChecker,
        sourceFile: SourceFile,
        context: any
    ): void {
        this.deferredValidations.push({
            node,
            checker,
            sourceFile,
            context,
            timestamp: Date.now()
        });
    }
    
    /**
     * Process all deferred validations
     */
    processDeferredValidations(): { diagnostics: any[]; processedCount: number } {
        const diagnostics: any[] = [];
        let processedCount = 0;
        
        // Process validations in order (FIFO)
        while (this.deferredValidations.length > 0) {
            const validation = this.deferredValidations.shift()!;
            
            // Check if enough time has passed for type resolution
            const timeSinceDeferral = Date.now() - validation.timestamp;
            if (timeSinceDeferral < 100) { // 100ms minimum deferral
                // Put it back at the end of the queue
                this.deferredValidations.push(validation);
                continue;
            }
            
            // Attempt validation again
            const result = performKindValidation(
                validation.node,
                validation.checker,
                validation.sourceFile,
                validation.context
            );
            
            diagnostics.push(...result.diagnostics);
            processedCount++;
        }
        
        return { diagnostics, processedCount };
    }
    
    /**
     * Clear the validation queue
     */
    clear(): void {
        this.deferredValidations = [];
    }
    
    /**
     * Get the number of pending validations
     */
    getPendingCount(): number {
        return this.deferredValidations.length;
    }
}

// Global validation queue instance
export const globalKindValidationQueue = new KindValidationQueue();

/**
 * Integration point for checkTypeReference with proper timing
 * 
 * This function should be called from checkTypeReferenceNode after
 * getTypeFromTypeNode has been called and type resolution is complete.
 */
export function integrateKindValidationInCheckTypeReferenceTiming(
    node: TypeReferenceNode | ExpressionWithTypeArguments,
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Try immediate validation first
    const kindResult = integrateKindValidationInCheckTypeReferenceWithTiming(node, checker, sourceFile);
    const fpResult = validateFPPatternsWithTiming(node, checker, sourceFile);
    
    // Add immediate diagnostics
    diagnostics.push(...kindResult.diagnostics);
    diagnostics.push(...fpResult.diagnostics);
    
    // If validation was deferred, add to queue
    if (kindResult.shouldDefer) {
        const context = isKindSensitiveContext(node, checker);
        globalKindValidationQueue.addDeferredValidation(node, checker, sourceFile, context);
    }
    
    if (fpResult.shouldDefer) {
        // For FP patterns, we'll retry in the next validation cycle
        const context = { isKindSensitive: true, source: 'fp-pattern' };
        globalKindValidationQueue.addDeferredValidation(node, checker, sourceFile, context);
    }
    
    return { diagnostics };
}

/**
 * Process deferred validations at the end of type checking
 * 
 * This should be called after all type resolution is complete.
 */
export function processDeferredKindValidations(): { diagnostics: any[]; processedCount: number } {
    return globalKindValidationQueue.processDeferredValidations();
}

// Helper functions (these would be imported from the actual TypeScript compiler)
function getTypeParametersForTypeReferenceOrImport(node: any): any[] | undefined {
    // Implementation would depend on TypeScript internals
    return undefined;
}

function isErrorType(type: Type): boolean {
    // Implementation would depend on TypeScript internals
    return false;
}

function isAnyType(type: Type): boolean {
    // Implementation would depend on TypeScript internals
    return false;
} 