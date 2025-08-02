/**
 * Kind Constraint Propagation Deduplication
 * 
 * This module addresses the constraint propagation spam issue where
 * the same diagnostic can be emitted multiple times without deduplication.
 * 
 * Problem: propagateToParentCallSites creates multiple diagnostics for the same
 * constraint violation, leading to spammy error messages.
 */

import {
    TypeChecker,
    SourceFile,
    Node,
    TypeParameterDeclaration
} from "./types.js";

import {
    KindMetadata,
    KindConstraintViolation
} from "./kindConstraintPropagation.js";

import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";

/**
 * Enhanced diagnostic deduplication for constraint propagation
 */
export interface ConstraintPropagationDiagnostic {
    file: SourceFile;
    start: number;
    length: number;
    messageText: string;
    category: number; // 1 = Error, 2 = Warning, 3 = Info
    code: number;
    reportsUnnecessary: boolean;
    reportsDeprecated: boolean;
    source: string;
    constraintViolationId?: string; // Unique identifier for the constraint violation
    propagationPath?: string; // Path of propagation (e.g., "parent call site", "type argument")
    originalViolation?: string; // Original violation that caused this propagation
}

/**
 * Constraint propagation diagnostic deduplicator
 */
export class ConstraintPropagationDeduplicator {
    private emittedDiagnostics = new Set<string>();
    private constraintViolationMap = new Map<string, Set<string>>(); // violationId -> diagnosticIds
    private propagationPathMap = new Map<string, Set<string>>(); // violationId -> propagation paths
    
    /**
     * Generate a unique identifier for a constraint violation
     */
    private generateViolationId(violation: KindConstraintViolation): string {
        return `${violation.typeParameterName}:${violation.sourceFile.fileName}:${violation.constraintNode.getStart()}`;
    }
    
    /**
     * Generate a unique identifier for a diagnostic
     */
    private generateDiagnosticId(diagnostic: ConstraintPropagationDiagnostic): string {
        const baseId = `${diagnostic.file.fileName}:${diagnostic.start}:${diagnostic.code}:${diagnostic.messageText}`;
        
        if (diagnostic.constraintViolationId) {
            return `${baseId}:${diagnostic.constraintViolationId}`;
        }
        
        return baseId;
    }
    
    /**
     * Check if a diagnostic is a duplicate
     */
    private isDuplicateDiagnostic(diagnostic: ConstraintPropagationDiagnostic): boolean {
        const diagnosticId = this.generateDiagnosticId(diagnostic);
        return this.emittedDiagnostics.has(diagnosticId);
    }
    
    /**
     * Check if a propagation path is redundant
     */
    private isRedundantPropagationPath(
        violationId: string,
        propagationPath: string
    ): boolean {
        const existingPaths = this.propagationPathMap.get(violationId);
        if (!existingPaths) {
            return false;
        }
        
        // Check if this path is already covered by a more specific path
        for (const existingPath of existingPaths) {
            if (this.isPathSubsumedBy(propagationPath, existingPath)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if one propagation path is subsumed by another
     */
    private isPathSubsumedBy(path: string, existingPath: string): boolean {
        // Simple heuristic: if the existing path is more specific, the new path is redundant
        if (existingPath.includes(path) && existingPath !== path) {
            return true;
        }
        
        // Check for common patterns
        const pathPatterns = {
            'parent call site': ['type argument', 'type reference'],
            'type argument': ['type reference'],
            'type reference': []
        };
        
        const subsumedBy = pathPatterns[path as keyof typeof pathPatterns] || [];
        return subsumedBy.includes(existingPath);
    }
    
    /**
     * Add a diagnostic with comprehensive deduplication
     */
    addDiagnosticWithDeduplication(
        diagnostic: ConstraintPropagationDiagnostic,
        violation?: KindConstraintViolation
    ): boolean {
        // Generate violation ID if provided
        const violationId = violation ? this.generateViolationId(violation) : undefined;
        
        // Check if this is a duplicate diagnostic
        if (this.isDuplicateDiagnostic(diagnostic)) {
            console.log(`[Kind] Skipping duplicate diagnostic: ${diagnostic.messageText}`);
            return false;
        }
        
        // Check if this is a redundant propagation path
        if (violationId && diagnostic.propagationPath) {
            if (this.isRedundantPropagationPath(violationId, diagnostic.propagationPath)) {
                console.log(`[Kind] Skipping redundant propagation path: ${diagnostic.propagationPath}`);
                return false;
            }
        }
        
        // Add the diagnostic
        const diagnosticId = this.generateDiagnosticId(diagnostic);
        this.emittedDiagnostics.add(diagnosticId);
        
        // Track constraint violation relationships
        if (violationId) {
            if (!this.constraintViolationMap.has(violationId)) {
                this.constraintViolationMap.set(violationId, new Set());
            }
            this.constraintViolationMap.get(violationId)!.add(diagnosticId);
            
            // Track propagation paths
            if (diagnostic.propagationPath) {
                if (!this.propagationPathMap.has(violationId)) {
                    this.propagationPathMap.set(violationId, new Set());
                }
                this.propagationPathMap.get(violationId)!.add(diagnostic.propagationPath);
            }
        }
        
        console.log(`[Kind] Added diagnostic: ${diagnostic.messageText}`);
        return true;
    }
    
    /**
     * Get all diagnostics for a specific constraint violation
     */
    getDiagnosticsForViolation(violation: KindConstraintViolation): string[] {
        const violationId = this.generateViolationId(violation);
        const diagnosticIds = this.constraintViolationMap.get(violationId);
        return diagnosticIds ? Array.from(diagnosticIds) : [];
    }
    
    /**
     * Get propagation paths for a specific constraint violation
     */
    getPropagationPathsForViolation(violation: KindConstraintViolation): string[] {
        const violationId = this.generateViolationId(violation);
        const paths = this.propagationPathMap.get(violationId);
        return paths ? Array.from(paths) : [];
    }
    
    /**
     * Clear all tracked diagnostics
     */
    clear(): void {
        this.emittedDiagnostics.clear();
        this.constraintViolationMap.clear();
        this.propagationPathMap.clear();
    }
    
    /**
     * Get statistics about deduplication
     */
    getStats(): {
        totalDiagnostics: number;
        uniqueViolations: number;
        averageDiagnosticsPerViolation: number;
    } {
        const totalDiagnostics = this.emittedDiagnostics.size;
        const uniqueViolations = this.constraintViolationMap.size;
        const averageDiagnosticsPerViolation = uniqueViolations > 0 
            ? totalDiagnostics / uniqueViolations 
            : 0;
        
        return {
            totalDiagnostics,
            uniqueViolations,
            averageDiagnosticsPerViolation
        };
    }
}

// Global deduplicator instance
export const globalConstraintPropagationDeduplicator = new ConstraintPropagationDeduplicator();

/**
 * Enhanced propagateToParentCallSites with deduplication
 */
export function propagateToParentCallSitesWithDeduplication(
    violation: KindConstraintViolation,
    callSite: Node,
    checker: TypeChecker
): void {
    // Walk up the AST to find parent call sites and create related diagnostics
    let current: Node | undefined = callSite.parent;
    let depth = 0;
    const maxDepth = 5; // Limit propagation depth to avoid infinite loops
    
    while (current && depth < maxDepth) {
        // Check if we're in a call expression
        if (current.kind === SyntaxKind.CallExpression || current.kind === SyntaxKind.NewExpression) {
            const callExpr = current as any; // CallExpression | NewExpression
            
            // Create a related diagnostic for the parent call site
            const parentDiagnostic: ConstraintPropagationDiagnostic = {
                file: violation.sourceFile,
                start: current.getStart(),
                length: current.getWidth(),
                messageText: `Related kind constraint violation in parent call site`,
                category: 1, // Error
                code: applyKindDiagnosticAlias(9512),
                reportsUnnecessary: false,
                reportsDeprecated: false,
                source: "ts.plus",
                constraintViolationId: `${violation.typeParameterName}:${violation.sourceFile.fileName}:${violation.constraintNode.getStart()}`,
                propagationPath: "parent call site",
                originalViolation: violation.typeParameterName
            };
            
            // Add the parent diagnostic with deduplication
            globalConstraintPropagationDeduplicator.addDiagnosticWithDeduplication(parentDiagnostic, violation);
            
            // Also check if this call site has its own type arguments that might be affected
            if (callExpr.typeArguments && callExpr.typeArguments.length > 0) {
                for (let i = 0; i < callExpr.typeArguments.length; i++) {
                    const typeArg = callExpr.typeArguments[i];
                    if (typeArg === callSite || typeArg.getStart() === callSite.getStart()) {
                        // This type argument is related to our violation
                        const typeArgDiagnostic: ConstraintPropagationDiagnostic = {
                            file: violation.sourceFile,
                            start: typeArg.getStart(),
                            length: typeArg.getWidth(),
                            messageText: `Type argument at position ${i} violates kind constraint`,
                            category: 1, // Error
                            code: applyKindDiagnosticAlias(9513),
                            reportsUnnecessary: false,
                            reportsDeprecated: false,
                            source: "ts.plus",
                            constraintViolationId: `${violation.typeParameterName}:${violation.sourceFile.fileName}:${violation.constraintNode.getStart()}`,
                            propagationPath: "type argument",
                            originalViolation: violation.typeParameterName
                        };
                        
                        globalConstraintPropagationDeduplicator.addDiagnosticWithDeduplication(typeArgDiagnostic, violation);
                    }
                }
            }
        }
        
        // Check if we're in a type reference
        if (current.kind === SyntaxKind.TypeReference) {
            const typeRef = current as TypeReferenceNode;
            if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
                // Create diagnostic for the type reference
                const typeRefDiagnostic: ConstraintPropagationDiagnostic = {
                    file: violation.sourceFile,
                    start: current.getStart(),
                    length: current.getWidth(),
                    messageText: `Type reference contains kind constraint violation`,
                    category: 1, // Error
                    code: applyKindDiagnosticAlias(9514),
                    reportsUnnecessary: false,
                    reportsDeprecated: false,
                    source: "ts.plus",
                    constraintViolationId: `${violation.typeParameterName}:${violation.sourceFile.fileName}:${violation.constraintNode.getStart()}`,
                    propagationPath: "type reference",
                    originalViolation: violation.typeParameterName
                };
                
                globalConstraintPropagationDeduplicator.addDiagnosticWithDeduplication(typeRefDiagnostic, violation);
            }
        }
        
        // Move up to parent and increment depth
        current = current.parent;
        depth++;
    }
    
    // If we reached max depth, add a note about potential further propagation
    if (depth >= maxDepth) {
        const propagationLimitDiagnostic: ConstraintPropagationDiagnostic = {
            file: violation.sourceFile,
            start: callSite.getStart(),
            length: callSite.getWidth(),
            messageText: `Kind constraint violation propagation limited to ${maxDepth} levels`,
            category: 2, // Warning
            code: applyKindDiagnosticAlias(9515),
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus",
            constraintViolationId: `${violation.typeParameterName}:${violation.sourceFile.fileName}:${violation.constraintNode.getStart()}`,
            propagationPath: "propagation limit",
            originalViolation: violation.typeParameterName
        };
        
        globalConstraintPropagationDeduplicator.addDiagnosticWithDeduplication(propagationLimitDiagnostic, violation);
    }
}

/**
 * Enhanced addDiagnosticToCollection with deduplication
 */
export function addDiagnosticToCollectionWithDeduplication(diagnostic: any, violation?: KindConstraintViolation): void {
    // Convert the diagnostic to the proper format
    const formattedDiagnostic: ConstraintPropagationDiagnostic = {
        file: diagnostic.sourceFile,
        start: diagnostic.start,
        length: diagnostic.length,
        messageText: diagnostic.message,
        category: diagnostic.category === "Error" ? 1 : diagnostic.category === "Warning" ? 2 : 3,
        code: diagnostic.code,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: violation ? `${violation.typeParameterName}:${violation.sourceFile.fileName}:${violation.constraintNode.getStart()}` : undefined,
        propagationPath: diagnostic.details?.propagationPath,
        originalViolation: diagnostic.details?.originalViolation
    };
    
    // Add with deduplication
    const wasAdded = globalConstraintPropagationDeduplicator.addDiagnosticWithDeduplication(formattedDiagnostic, violation);
    
    if (wasAdded) {
        // In a real implementation, you would add to the checker's diagnostic collection
        console.log(`[Kind] Added diagnostic to collection: ${diagnostic.message}`);
    }
}

/**
 * Get deduplication statistics
 */
export function getConstraintPropagationStats() {
    return globalConstraintPropagationDeduplicator.getStats();
}

/**
 * Clear all tracked diagnostics
 */
export function clearConstraintPropagationDiagnostics() {
    globalConstraintPropagationDeduplicator.clear();
}

// Import SyntaxKind for type checking
const SyntaxKind = {
    CallExpression: 1,
    NewExpression: 2,
    TypeReference: 3
} as any;

// Import TypeReferenceNode for type checking
interface TypeReferenceNode {
    typeArguments?: any[];
    typeName: any;
    getStart(): number;
    getWidth(): number;
} 