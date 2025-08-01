import {
    TypeChecker,
    Type,
    TypeReferenceNode,
    TypeAliasDeclaration,
    HeritageClause,
    MappedTypeNode,
    TypeParameterDeclaration,
    SourceFile,
    Node,
    SyntaxKind,
} from "./types.js";
import { 
    isKindSensitiveContext 
} from "./kindCompatibility.js";
import { retrieveKindMetadata } from "./kindRetrieval.js";
import { compareKinds } from "./kindComparison.js";
import { createKindDiagnosticReporter } from "./kindDiagnosticReporter.js";
import { KindDiagnosticCodes } from "./kindDiagnostics.js";
import { globalKindConstraintMap } from "./kindConstraintPropagation.js";

/**
 * Integration point 1: checkTypeReference() - Call kind compatibility validation
 */
export function integrateKindValidationInCheckTypeReference(
    node: TypeReferenceNode,
    checker: TypeChecker,
    sourceFile: SourceFile
): { hasKindValidation: boolean; diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Detect if node is a KindTypeNode or TypeReferenceNode with Kind keyword
    if (isKindTypeReference(node, checker)) {
        // Resolve expected kind from context
        const context = isKindSensitiveContext(node, checker);
        if (context.isKindSensitive) {
            // Resolve actual kind from symbol metadata or inference
            const symbol = checker.getSymbolAtLocation(node.typeName);
            if (symbol) {
                const actualKind = retrieveKindMetadata(symbol, checker, false);
                if (actualKind && context.expectedKindArity !== undefined) {
                    // Create expected kind metadata from context
                    const expectedKind = {
                        arity: context.expectedKindArity,
                        parameterKinds: context.expectedParameterKinds || [],
                        symbol: symbol,
                        retrievedFrom: "context",
                        isValid: true
                    };
                    
                    // Invoke validateKindCompatibility
                    const validation = compareKinds(expectedKind, actualKind, checker, false);
                    
                    // Store results for downstream use
                    const kindCheckResult = {
                        node,
                        expectedKind,
                        actualKind,
                        validation,
                        context
                    };
                    
                    // Emit diagnostics for violations
                    if (!validation.isCompatible) {
                        const reporter = createKindDiagnosticReporter();
                        reporter.reportKindComparison(validation, node, sourceFile);
                        diagnostics.push(...reporter.getDiagnostics());
                    }
                    
                    return { hasKindValidation: true, diagnostics };
                }
            }
        }
    }
    
    return { hasKindValidation: false, diagnostics };
}

/**
 * Integration point 2: checkTypeArgumentConstraints() - Validate kinds on generic type arguments
 */
export function integrateKindValidationInCheckTypeArgumentConstraints(
    typeArguments: readonly Type[],
    typeParameters: readonly TypeParameterDeclaration[],
    checker: TypeChecker,
    sourceFile: SourceFile
): { violations: any[]; diagnostics: any[] } {
    const violations: any[] = [];
    const diagnostics: any[] = [];
    
    // For each type argument, check if its type parameter constraint is a kind
    for (let i = 0; i < typeArguments.length && i < typeParameters.length; i++) {
        const typeArg = typeArguments[i];
        const typeParam = typeParameters[i];
        
        // Check if the type parameter has a kind constraint
        const constraint = globalKindConstraintMap.getConstraint(typeParam.name.escapedText);
        if (constraint) {
            // Get the actual kind of the type argument
            const actualKind = retrieveKindMetadata(typeArg.symbol, checker, false);
            if (actualKind) {
                // Run validateKindCompatibility with the constraint as expected
                const validation = compareKinds(constraint.expectedKind, actualKind, checker, false);
                
                if (!validation.isCompatible) {
                    violations.push({
                        typeParameter: typeParam,
                        typeArgument: typeArg,
                        expectedKind: constraint.expectedKind,
                        actualKind,
                        validation
                    });
                    
                    // Emit kind-specific diagnostics here (not later)
                    const reporter = createKindDiagnosticReporter();
                    reporter.reportKindComparison(validation, typeParam, sourceFile);
                    diagnostics.push(...reporter.getDiagnostics());
                }
            }
        }
    }
    
    return { violations, diagnostics };
}

/**
 * Integration point 3: checkTypeAliasDeclaration() - Validate declared kind matches definition
 */
export function integrateKindValidationInCheckTypeAliasDeclaration(
    node: TypeAliasDeclaration,
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Check if this is a type alias with Kind<...> on the right-hand side
    if (node.type && isKindTypeReference(node.type, checker)) {
        // Extract kind metadata from the right-hand side
        const rhsKind = extractKindFromTypeNode(node.type, checker);
        
        if (rhsKind) {
            // Check if there's an explicit kind constraint declared for the alias
            const symbol = checker.getSymbolAtLocation(node.name);
            if (symbol) {
                const explicitKind = retrieveKindMetadata(symbol, checker, false);
                
                if (explicitKind) {
                    // Compare with any explicit kind constraint declared for the alias
                    const validation = compareKinds(explicitKind, rhsKind, checker, false);
                    
                    if (!validation.isCompatible) {
                        // Emit TypeAliasKindMismatch diagnostic
                        const diagnostic = {
                            code: KindDiagnosticCodes.TypeAliasKindMismatch,
                            message: `Type alias '${node.name.escapedText}' kind mismatch: declared ${formatKind(explicitKind)}, defined ${formatKind(rhsKind)}`,
                            node: node,
                            sourceFile: sourceFile,
                            category: "Error"
                        };
                        diagnostics.push(diagnostic);
                    }
                } else {
                    // If no explicit kind constraint, optionally infer and attach kind metadata
                    attachInferredKindMetadata(symbol, rhsKind, checker);
                }
            }
        }
    }
    
    return { diagnostics };
}

/**
 * Integration point 4: checkHeritageClauses() - Enforce kind correctness on extended/implemented types
 */
export function integrateKindValidationInCheckHeritageClauses(
    heritageClauses: readonly HeritageClause[],
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    for (const clause of heritageClauses) {
        for (const typeRef of clause.types) {
            const baseType = checker.getTypeFromTypeReferenceNode(typeRef);
            const baseSymbol = checker.getSymbolAtLocation(typeRef.expression);
            
            if (baseSymbol) {
                const baseKind = retrieveKindMetadata(baseSymbol, checker, false);
                
                if (baseKind) {
                    // For extends clauses: compare against subclass type kind
                    if (clause.token === SyntaxKind.ExtendsKeyword) {
                        const subclassSymbol = getSubclassSymbol(clause, checker);
                        if (subclassSymbol) {
                            const subclassKind = retrieveKindMetadata(subclassSymbol, checker, false);
                            if (subclassKind) {
                                // Ensure arity matches
                                if (baseKind.arity !== subclassKind.arity) {
                                    const diagnostic = {
                                        code: KindDiagnosticCodes.TypeConstructorArityMismatch,
                                        message: `Heritage clause arity mismatch: base has ${baseKind.arity} parameters, subclass has ${subclassKind.arity}`,
                                        node: clause,
                                        sourceFile: sourceFile,
                                        category: "Error"
                                    };
                                    diagnostics.push(diagnostic);
                                }
                                
                                // Ensure parameter kinds match or are compatible under variance rules
                                const validation = compareKinds(baseKind, subclassKind, checker, false);
                                if (!validation.isCompatible) {
                                    const reporter = createKindDiagnosticReporter();
                                    reporter.reportKindComparison(validation, clause, sourceFile);
                                    diagnostics.push(...reporter.getDiagnostics());
                                }
                            }
                        }
                    }
                    
                    // For implements clauses: apply same validation for each implemented interface
                    if (clause.token === SyntaxKind.ImplementsKeyword) {
                        // Similar validation for implemented interfaces
                        const implementingSymbol = getImplementingSymbol(clause, checker);
                        if (implementingSymbol) {
                            const implementingKind = retrieveKindMetadata(implementingSymbol, checker, false);
                            if (implementingKind) {
                                const validation = compareKinds(baseKind, implementingKind, checker, false);
                                if (!validation.isCompatible) {
                                    const reporter = createKindDiagnosticReporter();
                                    reporter.reportKindComparison(validation, clause, sourceFile);
                                    diagnostics.push(...reporter.getDiagnostics());
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    return { diagnostics };
}

/**
 * Integration point 5: checkMappedType() - Propagate kind constraints into mapped types
 */
export function integrateKindValidationInCheckMappedType(
    node: MappedTypeNode,
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Before checking members, check if the mapped type's keyof constraint or in expression is a kind
    if (node.typeParameter.constraint && isKindTypeReference(node.typeParameter.constraint, checker)) {
        const constraintKind = extractKindFromTypeNode(node.typeParameter.constraint, checker);
        
        if (constraintKind) {
            // Apply the constraint to all generated property types
            // Ensure that any type parameter used in the mapped type respects its kind constraint
            
            // Check if the mapped type's type parameter has kind constraints
            const typeParamSymbol = checker.getSymbolAtLocation(node.typeParameter.name);
            if (typeParamSymbol) {
                const typeParamKind = retrieveKindMetadata(typeParamSymbol, checker, false);
                if (typeParamKind) {
                    const validation = compareKinds(constraintKind, typeParamKind, checker, false);
                    if (!validation.isCompatible) {
                        // Emit diagnostic at the mapped type declaration
                        const diagnostic = {
                            code: KindDiagnosticCodes.TypeConstructorKindParameterMismatch,
                            message: `Mapped type constraint kind mismatch: expected ${formatKind(constraintKind)}, got ${formatKind(typeParamKind)}`,
                            node: node,
                            sourceFile: sourceFile,
                            category: "Error"
                        };
                        diagnostics.push(diagnostic);
                    }
                }
            }
        }
    }
    
    return { diagnostics };
}

// Helper functions

function isKindTypeReference(node: Node, checker: TypeChecker): boolean {
    if (node.kind === SyntaxKind.KindType) {
        return true;
    }
    
    if (node.kind === SyntaxKind.TypeReference) {
        const typeRef = node as TypeReferenceNode;
        const symbol = checker.getSymbolAtLocation(typeRef.typeName);
        if (symbol) {
            const type = checker.getTypeOfSymbolAtLocation(symbol, typeRef);
            return !!(type.flags & 0x80000000); // TypeFlags.Kind
        }
    }
    
    return false;
}

function extractKindFromTypeNode(node: Node, checker: TypeChecker): any {
    if (isKindTypeReference(node, checker)) {
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol) {
            return retrieveKindMetadata(symbol, checker, false);
        }
    }
    return null;
}

function attachInferredKindMetadata(symbol: any, kind: any, checker: TypeChecker): void {
    // Store inferred kind metadata in symbol.links
    if (!symbol.links) {
        symbol.links = {};
    }
    
    symbol.links.kindArity = kind.arity;
    symbol.links.parameterKinds = kind.parameterKinds;
    symbol.links.kindFlags = kind.flags || 0;
    symbol.links.isInferredKind = true;
}

function getSubclassSymbol(clause: HeritageClause, checker: TypeChecker): any {
    // Walk up the AST to find the class declaration that contains this heritage clause
    let current: Node | undefined = clause;
    while (current && current.parent) {
        if (current.parent.kind === SyntaxKind.ClassDeclaration) {
            const classDecl = current.parent as any;
            return checker.getSymbolAtLocation(classDecl.name);
        }
        current = current.parent;
    }
    return null;
}

function getImplementingSymbol(clause: HeritageClause, checker: TypeChecker): any {
    // Walk up the AST to find the class declaration that contains this heritage clause
    let current: Node | undefined = clause;
    while (current && current.parent) {
        if (current.parent.kind === SyntaxKind.ClassDeclaration) {
            const classDecl = current.parent as any;
            return checker.getSymbolAtLocation(classDecl.name);
        }
        current = current.parent;
    }
    return null;
}

function formatKind(kind: any): string {
    return `Kind<${kind.parameterKinds?.map(() => 'Type').join(', ') || ''}>`;
} 