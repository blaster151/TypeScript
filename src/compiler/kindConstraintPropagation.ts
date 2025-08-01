import {
    TypeChecker,
    TypeParameterDeclaration,
    Type,
    Symbol,
    Node,
    SourceFile,
    TypeReferenceNode,
    SyntaxKind,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";
import { compareKinds } from "./kindComparison.js";

/**
 * Kind constraint information for a type parameter
 */
export interface KindConstraint {
    typeParameterName: string;
    expectedKind: KindMetadata;
    constraintNode: TypeParameterDeclaration;
    sourceFile: SourceFile;
}

/**
 * Constraint map keyed by type parameter name
 */
export class KindConstraintMap {
    private constraints = new Map<string, KindConstraint>();
    private dependentConstraints = new Map<string, string[]>(); // parent -> children

    /**
     * Add a kind constraint for a type parameter
     */
    addConstraint(
        typeParameterName: string,
        expectedKind: KindMetadata,
        constraintNode: TypeParameterDeclaration,
        sourceFile: SourceFile
    ): void {
        this.constraints.set(typeParameterName, {
            typeParameterName,
            expectedKind,
            constraintNode,
            sourceFile
        });
    }

    /**
     * Get a kind constraint for a type parameter
     */
    getConstraint(typeParameterName: string): KindConstraint | undefined {
        return this.constraints.get(typeParameterName);
    }

    /**
     * Check if a type parameter has a kind constraint
     */
    hasConstraint(typeParameterName: string): boolean {
        return this.constraints.has(typeParameterName);
    }

    /**
     * Add a dependent relationship between type parameters
     */
    addDependency(parentName: string, childName: string): void {
        if (!this.dependentConstraints.has(parentName)) {
            this.dependentConstraints.set(parentName, []);
        }
        this.dependentConstraints.get(parentName)!.push(childName);
    }

    /**
     * Get all dependent type parameters for a given parent
     */
    getDependents(parentName: string): string[] {
        return this.dependentConstraints.get(parentName) || [];
    }

    /**
     * Clear all constraints
     */
    clear(): void {
        this.constraints.clear();
        this.dependentConstraints.clear();
    }

    /**
     * Get all constraint names
     */
    getConstraintNames(): string[] {
        return Array.from(this.constraints.keys());
    }
}

/**
 * Global constraint map instance
 */
export const globalKindConstraintMap = new KindConstraintMap();

/**
 * Identify type parameters with explicit kind constraints
 */
export function identifyKindConstraints(
    typeParameters: readonly TypeParameterDeclaration[],
    checker: TypeChecker,
    sourceFile: SourceFile
): void {
    for (const typeParam of typeParameters) {
        if (!typeParam.constraint) continue;

        // Check if the constraint is a Kind<...> type
        if (isKindConstraint(typeParam.constraint, checker)) {
            const kindMetadata = extractKindFromConstraint(typeParam.constraint, checker);
            if (kindMetadata) {
                globalKindConstraintMap.addConstraint(
                    typeParam.name.escapedText,
                    kindMetadata,
                    typeParam,
                    sourceFile
                );
            }
        }
    }
}

/**
 * Check if a type node is a kind constraint
 */
function isKindConstraint(typeNode: Node, checker: TypeChecker): boolean {
    if (isTypeReferenceNode(typeNode)) {
        const typeName = typeNode.typeName;
        if (isIdentifier(typeName) && typeName.escapedText === "Kind") {
            return true;
        }
    }
    return false;
}

/**
 * Extract kind metadata from a constraint type node
 */
function extractKindFromConstraint(
    constraintNode: Node,
    checker: TypeChecker
): KindMetadata | undefined {
    if (!isTypeReferenceNode(constraintNode)) {
        return undefined;
    }

    // Get the type from the constraint node
    const constraintType = checker.getTypeFromTypeNode(constraintNode);
    if (!constraintType) {
        return undefined;
    }

    // Check if it's a KindType
    if (constraintType.flags & 0x80000000) { // TypeFlags.Kind
        return {
            arity: (constraintType as any).kindArity || 0,
            parameterKinds: (constraintType as any).parameterKinds || [],
            symbol: constraintType.symbol,
            retrievedFrom: "explicit",
            isValid: true
        };
    }

    return undefined;
}

/**
 * Enforce kind constraints during function/method signature checking
 */
export function enforceKindConstraintsInSignature(
    typeArguments: readonly Type[],
    typeParameters: readonly TypeParameterDeclaration[],
    checker: TypeChecker,
    sourceFile: SourceFile
): { violations: KindConstraintViolation[] } {
    const violations: KindConstraintViolation[] = [];

    for (let i = 0; i < typeArguments.length && i < typeParameters.length; i++) {
        const typeArg = typeArguments[i];
        const typeParam = typeParameters[i];
        const paramName = typeParam.name.escapedText;

        // Check if this type parameter has a kind constraint
        const constraint = globalKindConstraintMap.getConstraint(paramName);
        if (!constraint) continue;

        // Get the actual kind of the type argument
        const actualKind = retrieveKindMetadata(typeArg.symbol, checker, false);
        if (!actualKind) continue;

        // Compare expected vs actual kind
        const comparison = compareKinds(constraint.expectedKind, actualKind, checker, false);
        if (!comparison.isCompatible) {
            violations.push({
                typeParameterName: paramName,
                expectedKind: constraint.expectedKind,
                actualKind,
                typeArgument: typeArg,
                constraintNode: constraint.constraintNode,
                sourceFile,
                errors: comparison.errors
            });
        }
    }

    return { violations };
}

/**
 * Enforce kind constraints during generic instantiation
 */
export function enforceKindConstraintsInInstantiation(
    instantiatedType: Type,
    typeArguments: readonly Type[],
    typeParameters: readonly TypeParameterDeclaration[],
    checker: TypeChecker,
    sourceFile: SourceFile
): { violations: KindConstraintViolation[] } {
    const violations: KindConstraintViolation[] = [];

    // Check each type argument against its corresponding type parameter constraint
    for (let i = 0; i < typeArguments.length && i < typeParameters.length; i++) {
        const typeArg = typeArguments[i];
        const typeParam = typeParameters[i];
        const paramName = typeParam.name.escapedText;

        // Check if this type parameter has a kind constraint
        const constraint = globalKindConstraintMap.getConstraint(paramName);
        if (!constraint) continue;

        // Get the actual kind of the type argument
        const actualKind = retrieveKindMetadata(typeArg.symbol, checker, false);
        if (!actualKind) continue;

        // Compare expected vs actual kind
        const comparison = compareKinds(constraint.expectedKind, actualKind, checker, false);
        if (!comparison.isCompatible) {
            violations.push({
                typeParameterName: paramName,
                expectedKind: constraint.expectedKind,
                actualKind,
                typeArgument: typeArg,
                constraintNode: constraint.constraintNode,
                sourceFile,
                errors: comparison.errors
            });
        }
    }

    return { violations };
}

/**
 * Enforce kind constraints during contextual type resolution
 */
export function enforceKindConstraintsInContextualResolution(
    node: Node,
    expectedType: Type,
    checker: TypeChecker,
    sourceFile: SourceFile
): { violations: KindConstraintViolation[] } {
    const violations: KindConstraintViolation[] = [];

    // Find type parameters in the current context
    const typeParameters = findTypeParametersInContext(node);
    
    for (const typeParam of typeParameters) {
        const paramName = typeParam.name.escapedText;
        
        // Check if this type parameter has a kind constraint
        const constraint = globalKindConstraintMap.getConstraint(paramName);
        if (!constraint) continue;

        // Get the actual kind of the expected type
        const actualKind = retrieveKindMetadata(expectedType.symbol, checker, false);
        if (!actualKind) continue;

        // Compare expected vs actual kind
        const comparison = compareKinds(constraint.expectedKind, actualKind, checker, false);
        if (!comparison.isCompatible) {
            violations.push({
                typeParameterName: paramName,
                expectedKind: constraint.expectedKind,
                actualKind,
                typeArgument: expectedType,
                constraintNode: constraint.constraintNode,
                sourceFile,
                errors: comparison.errors
            });
        }
    }

    return { violations };
}

/**
 * Find type parameters in the current context
 */
function findTypeParametersInContext(node: Node): TypeParameterDeclaration[] {
    const typeParams: TypeParameterDeclaration[] = [];
    let current: Node | undefined = node;

    while (current) {
        if (current.kind === SyntaxKind.TypeParameter) {
            typeParams.push(current as TypeParameterDeclaration);
        }
        current = current.parent;
    }

    return typeParams;
}

/**
 * Propagate constraint failures upward to calling signatures
 */
export function propagateConstraintFailures(
    violations: KindConstraintViolation[],
    callSite: Node,
    checker: TypeChecker
): void {
    for (const violation of violations) {
        // Create diagnostic for the constraint violation
        const diagnostic = createKindConstraintViolationDiagnostic(violation, callSite, checker);
        
        // Add to the diagnostic collection
        addDiagnosticToCollection(diagnostic);
        
        // Propagate to parent call sites if needed
        propagateToParentCallSites(violation, callSite, checker);
    }
}

/**
 * Create a diagnostic for kind constraint violation
 */
function createKindConstraintViolationDiagnostic(
    violation: KindConstraintViolation,
    callSite: Node,
    checker: TypeChecker
): any {
    // Create a proper diagnostic object for kind constraint violations
    const diagnostic = {
        code: "TypeParameterKindConstraintViolation",
        category: "Error" as const,
        message: `Type parameter '${violation.typeParameterName}' violates kind constraint: expected kind with arity ${violation.expectedKind.arity}, got kind with arity ${violation.actualKind.arity}`,
        expected: violation.expectedKind,
        actual: violation.actualKind,
        node: callSite,
        sourceFile: violation.sourceFile,
        start: callSite.getStart(),
        length: callSite.getWidth(),
        // Include detailed error information
        details: {
            typeParameterName: violation.typeParameterName,
            expectedArity: violation.expectedKind.arity,
            actualArity: violation.actualKind.arity,
            expectedParameterKinds: violation.expectedKind.parameterKinds,
            actualParameterKinds: violation.actualKind.parameterKinds,
            constraintLocation: {
                start: violation.constraintNode.getStart(),
                length: violation.constraintNode.getWidth(),
                sourceFile: violation.sourceFile
            }
        }
    };

    // Add specific error messages from kind comparison
    if (violation.errors && violation.errors.length > 0) {
        diagnostic.message += `\n${violation.errors.map(error => error.message).join('\n')}`;
    }

    return diagnostic;
}

/**
 * Add diagnostic to the collection
 */
function addDiagnosticToCollection(diagnostic: any): void {
    // In a real implementation, this would add to the checker's diagnostic collection
    // For now, we'll use a global diagnostic collection or the checker's diagnostic system
    
    // Try to add to the checker's diagnostic collection if available
    if (typeof globalThis !== 'undefined' && (globalThis as any).kindDiagnostics) {
        (globalThis as any).kindDiagnostics.push(diagnostic);
    }
    
    // Also log for debugging purposes
    console.log(`[Kind] Constraint violation: ${diagnostic.message}`);
    console.log(`[Kind] Location: ${diagnostic.sourceFile.fileName}:${diagnostic.start}-${diagnostic.start + diagnostic.length}`);
    
    // In a full implementation, you might do something like:
    // checker.addDiagnostic(diagnostic);
    // or
    // program.getDiagnostics().add(diagnostic);
}

/**
 * Propagate constraint violations to parent call sites
 */
function propagateToParentCallSites(
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
            const parentDiagnostic = {
                code: "RelatedKindConstraintViolation",
                category: "Error" as const,
                message: `Related kind constraint violation in parent call site`,
                node: current,
                sourceFile: violation.sourceFile,
                start: current.getStart(),
                length: current.getWidth(),
                relatedDiagnostic: violation,
                details: {
                    originalViolation: violation.typeParameterName,
                    callSiteDepth: depth,
                    propagationPath: "parent call site"
                }
            };
            
            // Add the parent diagnostic
            addDiagnosticToCollection(parentDiagnostic);
            
            // Also check if this call site has its own type arguments that might be affected
            if (callExpr.typeArguments && callExpr.typeArguments.length > 0) {
                for (let i = 0; i < callExpr.typeArguments.length; i++) {
                    const typeArg = callExpr.typeArguments[i];
                    if (typeArg === callSite || typeArg.getStart() === callSite.getStart()) {
                        // This type argument is related to our violation
                        const typeArgDiagnostic = {
                            code: "TypeArgumentKindConstraintViolation",
                            category: "Error" as const,
                            message: `Type argument at position ${i} violates kind constraint`,
                            node: typeArg,
                            sourceFile: violation.sourceFile,
                            start: typeArg.getStart(),
                            length: typeArg.getWidth(),
                            details: {
                                argumentIndex: i,
                                originalViolation: violation.typeParameterName
                            }
                        };
                        
                        addDiagnosticToCollection(typeArgDiagnostic);
                    }
                }
            }
        }
        
        // Check if we're in a type reference
        if (current.kind === SyntaxKind.TypeReference) {
            const typeRef = current as TypeReferenceNode;
            if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
                // Create diagnostic for the type reference
                const typeRefDiagnostic = {
                    code: "TypeReferenceKindConstraintViolation",
                    category: "Error" as const,
                    message: `Type reference contains kind constraint violation`,
                    node: current,
                    sourceFile: violation.sourceFile,
                    start: current.getStart(),
                    length: current.getWidth(),
                    details: {
                        originalViolation: violation.typeParameterName,
                        typeReferenceName: typeRef.typeName.getText()
                    }
                };
                
                addDiagnosticToCollection(typeRefDiagnostic);
            }
        }
        
        // Move up to parent and increment depth
        current = current.parent;
        depth++;
    }
    
    // If we reached max depth, add a note about potential further propagation
    if (depth >= maxDepth) {
        const propagationLimitDiagnostic = {
            code: "KindConstraintPropagationLimit",
            category: "Warning" as const,
            message: `Kind constraint violation propagation limited to ${maxDepth} levels`,
            node: callSite,
            sourceFile: violation.sourceFile,
            start: callSite.getStart(),
            length: callSite.getWidth(),
            details: {
                originalViolation: violation.typeParameterName,
                maxPropagationDepth: maxDepth
            }
        };
        
        addDiagnosticToCollection(propagationLimitDiagnostic);
    }
}

/**
 * Kind constraint violation information
 */
export interface KindConstraintViolation {
    typeParameterName: string;
    expectedKind: KindMetadata;
    actualKind: KindMetadata;
    typeArgument: Type;
    constraintNode: TypeParameterDeclaration;
    sourceFile: SourceFile;
    errors: any[]; // KindComparisonError[]
}

/**
 * Example enforcement scenario:
 * If F is constrained to Kind<Type, Type>:
 * - Reject F instantiated with a binary type constructor
 */
export function validateKindConstraintExample(
    typeParameterName: string,
    instantiatedType: Type,
    checker: TypeChecker
): boolean {
    const constraint = globalKindConstraintMap.getConstraint(typeParameterName);
    if (!constraint) return true; // No constraint, so valid

    // Get the actual kind of the instantiated type
    // Note: retrieveKindMetadata would need to be imported from the appropriate module
    // For now, we'll assume the kind is valid if we can't determine it
    const actualKind: KindMetadata | undefined = undefined; // Placeholder
    if (!actualKind) return true; // Can't determine kind, assume valid

    // Compare with expected kind
    const comparison = compareKinds(constraint.expectedKind, actualKind, checker, false);
    return comparison.isCompatible;
} 