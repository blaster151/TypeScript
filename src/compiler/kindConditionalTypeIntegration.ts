import {
    Node,
    Type,
    TypeChecker,
    SourceFile,
    ConditionalTypeNode,
    InferTypeNode,
    TypeParameterDeclaration,
    TypeReferenceNode,
    MappedTypeNode,
    SyntaxKind,
    KindMetadata,
    KindComparisonResult,
} from "./types.js";
import { 
    retrieveKindMetadata, 
    isBuiltInKindAliasSymbol, 
    getBuiltInAliasName 
} from "./kindMetadata.js";
import { compareKindsWithAliasSupport, getKindCompatibilityDiagnostic } from "./kindCompatibility.js";
import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";

/**
 * Enhanced integration for conditional types and infer positions
 * Handles kind constraint propagation in complex type scenarios
 */

export interface ConditionalTypeKindContext {
    checkType: Type;
    extendsType: Type;
    trueType: Type;
    falseType: Type;
    inferPositions: Map<string, Type>;
    kindConstraints: Map<string, KindMetadata>;
}

export interface InferPositionKindContext {
    constraintType: Type;
    defaultType?: Type;
    inferredType: Type;
    kindConstraint?: KindMetadata;
}

/**
 * Integration point: checkConditionalType() - Validate kind constraints in conditional types
 */
export function integrateKindValidationInCheckConditionalType(
    node: ConditionalTypeNode,
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Extract conditional type context
    const context = extractConditionalTypeContext(node, checker);
    
    // Validate kind constraints in check type
    const checkTypeDiagnostics = validateConditionalTypeCheckType(context, checker, sourceFile);
    diagnostics.push(...checkTypeDiagnostics);
    
    // Validate kind constraints in extends type
    const extendsTypeDiagnostics = validateConditionalTypeExtendsType(context, checker, sourceFile);
    diagnostics.push(...extendsTypeDiagnostics);
    
    // Validate kind constraints in true/false branches
    const trueTypeDiagnostics = validateConditionalTypeBranch(context.trueType, 'true', checker, sourceFile);
    diagnostics.push(...trueTypeDiagnostics);
    
    const falseTypeDiagnostics = validateConditionalTypeBranch(context.falseType, 'false', checker, sourceFile);
    diagnostics.push(...falseTypeDiagnostics);
    
    // Validate infer positions
    const inferDiagnostics = validateConditionalTypeInferPositions(context, checker, sourceFile);
    diagnostics.push(...inferDiagnostics);
    
    return { diagnostics };
}

/**
 * Integration point: checkInferType() - Validate kind constraints in infer positions
 */
export function integrateKindValidationInCheckInferType(
    node: InferTypeNode,
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Extract infer position context
    const context = extractInferPositionContext(node, checker);
    
    // Validate kind constraint propagation
    const constraintDiagnostics = validateInferPositionConstraint(context, checker, sourceFile);
    diagnostics.push(...constraintDiagnostics);
    
    // Validate default type if present
    if (context.defaultType) {
        const defaultDiagnostics = validateInferPositionDefault(context, checker, sourceFile);
        diagnostics.push(...defaultDiagnostics);
    }
    
    // Validate inferred type compatibility
    const inferredDiagnostics = validateInferPositionInferred(context, checker, sourceFile);
    diagnostics.push(...inferredDiagnostics);
    
    return { diagnostics };
}

/**
 * Extract context from conditional type node
 */
function extractConditionalTypeContext(
    node: ConditionalTypeNode,
    checker: TypeChecker
): ConditionalTypeKindContext {
    const checkType = checker.getTypeFromTypeNode(node.checkType);
    const extendsType = checker.getTypeFromTypeNode(node.extendsType);
    const trueType = checker.getTypeFromTypeNode(node.trueType);
    const falseType = checker.getTypeFromTypeNode(node.falseType);
    
    // Extract infer positions from the conditional type
    const inferPositions = new Map<string, Type>();
    const kindConstraints = new Map<string, KindMetadata>();
    
    // Walk the conditional type to find infer positions
    walkConditionalTypeForInfer(node, checker, inferPositions, kindConstraints);
    
    return {
        checkType,
        extendsType,
        trueType,
        falseType,
        inferPositions,
        kindConstraints
    };
}

/**
 * Extract context from infer type node
 */
function extractInferPositionContext(
    node: InferTypeNode,
    checker: TypeChecker
): InferPositionKindContext {
    const constraintType = checker.getTypeFromTypeNode(node.constraintType);
    const defaultType = node.defaultType ? checker.getTypeFromTypeNode(node.defaultType) : undefined;
    const inferredType = checker.getTypeFromTypeNode(node);
    
    // Try to infer kind constraint from the constraint type
    let kindConstraint: KindMetadata | undefined;
    if (constraintType.symbol) {
        kindConstraint = retrieveKindMetadata(constraintType.symbol, checker, false);
    }
    
    return {
        constraintType,
        defaultType,
        inferredType,
        kindConstraint
    };
}

/**
 * Walk conditional type to find infer positions and kind constraints
 */
function walkConditionalTypeForInfer(
    node: ConditionalTypeNode,
    checker: TypeChecker,
    inferPositions: Map<string, Type>,
    kindConstraints: Map<string, KindMetadata>
): void {
    // Check checkType for infer positions
    walkNodeForInfer(node.checkType, checker, inferPositions, kindConstraints);
    
    // Check extendsType for infer positions
    walkNodeForInfer(node.extendsType, checker, inferPositions, kindConstraints);
    
    // Check trueType for infer positions
    walkNodeForInfer(node.trueType, checker, inferPositions, kindConstraints);
    
    // Check falseType for infer positions
    walkNodeForInfer(node.falseType, checker, inferPositions, kindConstraints);
}

/**
 * Walk a node to find infer positions
 */
function walkNodeForInfer(
    node: Node,
    checker: TypeChecker,
    inferPositions: Map<string, Type>,
    kindConstraints: Map<string, KindMetadata>
): void {
    if (node.kind === SyntaxKind.InferType) {
        const inferNode = node as InferTypeNode;
        const typeParamName = inferNode.typeParameter.name.getText();
        const constraintType = checker.getTypeFromTypeNode(inferNode.constraintType);
        
        inferPositions.set(typeParamName, constraintType);
        
        // Extract kind constraint if available
        if (constraintType.symbol) {
            const kindMetadata = retrieveKindMetadata(constraintType.symbol, checker, false);
            if (kindMetadata && kindMetadata.isValid) {
                kindConstraints.set(typeParamName, kindMetadata);
            }
        }
    }
    
    // Recursively walk child nodes
    for (const child of node.getChildren()) {
        walkNodeForInfer(child, checker, inferPositions, kindConstraints);
    }
}

/**
 * Validate kind constraints in conditional type check type
 */
function validateConditionalTypeCheckType(
    context: ConditionalTypeKindContext,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    // Check if checkType has kind constraints
    if (context.checkType.symbol) {
        const checkKind = retrieveKindMetadata(context.checkType.symbol, checker, false);
        if (checkKind && checkKind.isValid) {
            // Validate that checkType kind is compatible with extendsType kind
            if (context.extendsType.symbol) {
                const extendsKind = retrieveKindMetadata(context.extendsType.symbol, checker, false);
                if (extendsKind && extendsKind.isValid) {
                    const validation = compareKindsWithAliasSupport(checkKind, extendsKind, checker);
                    if (!validation.isCompatible) {
                        const diagnostic = getKindCompatibilityDiagnostic(checkKind, extendsKind, checker);
                        diagnostics.push({
                            file: sourceFile,
                            start: 0, // Will be set by caller
                            length: 0, // Will be set by caller
                            messageText: `Kind constraint violation in conditional type check: ${diagnostic.message}`,
                            category: 1, // Error
                            code: diagnostic.code,
                            reportsUnnecessary: false,
                            reportsDeprecated: false,
                            source: "ts.plus"
                        });
                    }
                }
            }
        }
    }
    
    return diagnostics;
}

/**
 * Validate kind constraints in conditional type extends type
 */
function validateConditionalTypeExtendsType(
    context: ConditionalTypeKindContext,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    // Check if extendsType has kind constraints that should propagate
    if (context.extendsType.symbol) {
        const extendsKind = retrieveKindMetadata(context.extendsType.symbol, checker, false);
        if (extendsKind && extendsKind.isValid) {
            // Validate that extendsType kind is compatible with checkType kind
            if (context.checkType.symbol) {
                const checkKind = retrieveKindMetadata(context.checkType.symbol, checker, false);
                if (checkKind && checkKind.isValid) {
                    const validation = compareKindsWithAliasSupport(extendsKind, checkKind, checker);
                    if (!validation.isCompatible) {
                        const diagnostic = getKindCompatibilityDiagnostic(extendsKind, checkKind, checker);
                        diagnostics.push({
                            file: sourceFile,
                            start: 0, // Will be set by caller
                            length: 0, // Will be set by caller
                            messageText: `Kind constraint violation in conditional type extends: ${diagnostic.message}`,
                            category: 1, // Error
                            code: diagnostic.code,
                            reportsUnnecessary: false,
                            reportsDeprecated: false,
                            source: "ts.plus"
                        });
                    }
                }
            }
        }
    }
    
    return diagnostics;
}

/**
 * Validate kind constraints in conditional type branch
 */
function validateConditionalTypeBranch(
    branchType: Type,
    branchName: string,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    // Check if branch type has kind constraints
    if (branchType.symbol) {
        const branchKind = retrieveKindMetadata(branchType.symbol, checker, false);
        if (branchKind && branchKind.isValid) {
            // Validate that branch kind is compatible with any inferred kind constraints
            // This is a simplified check - in practice, we'd need more context
            diagnostics.push({
                file: sourceFile,
                start: 0, // Will be set by caller
                length: 0, // Will be set by caller
                messageText: `Kind constraint validation in conditional type ${branchName} branch`,
                category: 0, // Info
                code: applyKindDiagnosticAlias(9500),
                reportsUnnecessary: false,
                reportsDeprecated: false,
                source: "ts.plus"
            });
        }
    }
    
    return diagnostics;
}

/**
 * Validate infer positions in conditional type
 */
function validateConditionalTypeInferPositions(
    context: ConditionalTypeKindContext,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    // Validate each infer position
    for (const [typeParamName, constraintType] of context.inferPositions) {
        const kindConstraint = context.kindConstraints.get(typeParamName);
        if (kindConstraint && kindConstraint.isValid) {
            // Validate that the constraint type satisfies the kind constraint
            if (constraintType.symbol) {
                const constraintKind = retrieveKindMetadata(constraintType.symbol, checker, false);
                if (constraintKind && constraintKind.isValid) {
                    const validation = compareKindsWithAliasSupport(kindConstraint, constraintKind, checker);
                    if (!validation.isCompatible) {
                        const diagnostic = getKindCompatibilityDiagnostic(kindConstraint, constraintKind, checker);
                        diagnostics.push({
                            file: sourceFile,
                            start: 0, // Will be set by caller
                            length: 0, // Will be set by caller
                            messageText: `Infer position '${typeParamName}' kind constraint violation: ${diagnostic.message}`,
                            category: 1, // Error
                            code: diagnostic.code,
                            reportsUnnecessary: false,
                            reportsDeprecated: false,
                            source: "ts.plus"
                        });
                    }
                }
            }
        }
    }
    
    return diagnostics;
}

/**
 * Validate infer position constraint
 */
function validateInferPositionConstraint(
    context: InferPositionKindContext,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    // Validate that constraint type has valid kind metadata
    if (context.kindConstraint && context.kindConstraint.isValid) {
        // Check if constraint type satisfies the kind constraint
        if (context.constraintType.symbol) {
            const constraintKind = retrieveKindMetadata(context.constraintType.symbol, checker, false);
            if (constraintKind && constraintKind.isValid) {
                const validation = compareKindsWithAliasSupport(context.kindConstraint, constraintKind, checker);
                if (!validation.isCompatible) {
                    const diagnostic = getKindCompatibilityDiagnostic(context.kindConstraint, constraintKind, checker);
                    diagnostics.push({
                        file: sourceFile,
                        start: 0, // Will be set by caller
                        length: 0, // Will be set by caller
                        messageText: `Infer constraint kind violation: ${diagnostic.message}`,
                        category: 1, // Error
                        code: diagnostic.code,
                        reportsUnnecessary: false,
                        reportsDeprecated: false,
                        source: "ts.plus"
                    });
                }
            }
        }
    }
    
    return diagnostics;
}

/**
 * Validate infer position default type
 */
function validateInferPositionDefault(
    context: InferPositionKindContext,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    // Validate that default type is compatible with kind constraint
    if (context.kindConstraint && context.kindConstraint.isValid && context.defaultType) {
        if (context.defaultType.symbol) {
            const defaultKind = retrieveKindMetadata(context.defaultType.symbol, checker, false);
            if (defaultKind && defaultKind.isValid) {
                const validation = compareKindsWithAliasSupport(context.kindConstraint, defaultKind, checker);
                if (!validation.isCompatible) {
                    const diagnostic = getKindCompatibilityDiagnostic(context.kindConstraint, defaultKind, checker);
                    diagnostics.push({
                        file: sourceFile,
                        start: 0, // Will be set by caller
                        length: 0, // Will be set by caller
                        messageText: `Infer default type kind violation: ${diagnostic.message}`,
                        category: 1, // Error
                        code: diagnostic.code,
                        reportsUnnecessary: false,
                        reportsDeprecated: false,
                        source: "ts.plus"
                    });
                }
            }
        }
    }
    
    return diagnostics;
}

/**
 * Validate infer position inferred type
 */
function validateInferPositionInferred(
    context: InferPositionKindContext,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    // Validate that inferred type is compatible with kind constraint
    if (context.kindConstraint && context.kindConstraint.isValid) {
        if (context.inferredType.symbol) {
            const inferredKind = retrieveKindMetadata(context.inferredType.symbol, checker, false);
            if (inferredKind && inferredKind.isValid) {
                const validation = compareKindsWithAliasSupport(context.kindConstraint, inferredKind, checker);
                if (!validation.isCompatible) {
                    const diagnostic = getKindCompatibilityDiagnostic(context.kindConstraint, inferredKind, checker);
                    diagnostics.push({
                        file: sourceFile,
                        start: 0, // Will be set by caller
                        length: 0, // Will be set by caller
                        messageText: `Inferred type kind violation: ${diagnostic.message}`,
                        category: 1, // Error
                        code: diagnostic.code,
                        reportsUnnecessary: false,
                        reportsDeprecated: false,
                        source: "ts.plus"
                    });
                }
            }
        }
    }
    
    return diagnostics;
}

/**
 * Enhanced mapped type validation with conditional type support
 */
export function integrateKindValidationInCheckMappedTypeEnhanced(
    node: MappedTypeNode,
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Check if the mapped type has kind constraints
    if (node.constraintType) {
        const constraintType = checker.getTypeFromTypeNode(node.constraintType);
        const constraintSymbol = constraintType.symbol;
        
        if (constraintSymbol) {
            const constraintKind = retrieveKindMetadata(constraintSymbol, checker, false);
            if (constraintKind && constraintKind.isValid) {
                // Check if the mapped type parameter satisfies the constraint
                const typeParamSymbol = checker.getSymbolAtLocation(node.typeParameter.name);
                if (typeParamSymbol) {
                    const paramKind = retrieveKindMetadata(typeParamSymbol, checker, false);
                    if (paramKind && paramKind.isValid) {
                        const validation = compareKindsWithAliasSupport(constraintKind, paramKind, checker);
                        if (!validation.isCompatible) {
                            const diagnostic = getKindCompatibilityDiagnostic(constraintKind, paramKind, checker);
                            diagnostics.push({
                                file: sourceFile,
                                start: node.getStart(sourceFile),
                                length: node.getWidth(sourceFile),
                                messageText: `Mapped type kind constraint violation: ${diagnostic.message}`,
                                category: 1, // Error
                                code: diagnostic.code,
                                reportsUnnecessary: false,
                                reportsDeprecated: false,
                                source: "ts.plus"
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Check if the mapped type contains conditional types
    if (node.type) {
        const conditionalDiagnostics = validateMappedTypeConditionalTypes(node.type, checker, sourceFile);
        diagnostics.push(...conditionalDiagnostics);
    }
    
    return { diagnostics };
}

/**
 * Validate conditional types within mapped types
 */
function validateMappedTypeConditionalTypes(
    typeNode: Node,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    if (typeNode.kind === SyntaxKind.ConditionalType) {
        const conditionalNode = typeNode as ConditionalTypeNode;
        const conditionalDiagnostics = integrateKindValidationInCheckConditionalType(conditionalNode, checker, sourceFile);
        diagnostics.push(...conditionalDiagnostics.diagnostics);
    }
    
    // Recursively check child nodes
    for (const child of typeNode.getChildren()) {
        const childDiagnostics = validateMappedTypeConditionalTypes(child, checker, sourceFile);
        diagnostics.push(...childDiagnostics);
    }
    
    return diagnostics;
}

/**
 * Enhanced heritage clauses validation with conditional type support
 */
export function integrateKindValidationInCheckHeritageClausesEnhanced(
    heritageClauses: readonly HeritageClause[],
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    for (const clause of heritageClauses) {
        for (const typeRef of clause.types) {
            const baseType = checker.getTypeFromTypeNode(typeRef.expression);
            const baseSymbol = baseType.symbol;
            
            if (baseSymbol) {
                const baseKind = retrieveKindMetadata(baseSymbol, checker, false);
                if (baseKind && baseKind.isValid) {
                    // Check if the current class/interface has kind constraints
                    const currentSymbol = getCurrentSymbol(clause, checker);
                    if (currentSymbol) {
                        const currentKind = retrieveKindMetadata(currentSymbol, checker, false);
                        if (currentKind && currentKind.isValid) {
                            // Enhanced kind compatibility check with alias support
                            const validation = compareKindsWithAliasSupport(baseKind, currentKind, checker);
                            
                            if (!validation.isCompatible) {
                                const diagnostic = getKindCompatibilityDiagnostic(baseKind, currentKind, checker);
                                if (diagnostic.message) {
                                    diagnostics.push({
                                        file: sourceFile,
                                        start: typeRef.getStart(sourceFile),
                                        length: typeRef.getWidth(sourceFile),
                                        messageText: diagnostic.message,
                                        category: 1, // Error
                                        code: diagnostic.code,
                                        reportsUnnecessary: false,
                                        reportsDeprecated: false,
                                        source: "ts.plus"
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            // Check for conditional types in heritage clauses
            const conditionalDiagnostics = validateHeritageClauseConditionalTypes(typeRef.expression, checker, sourceFile);
            diagnostics.push(...conditionalDiagnostics);
        }
    }
    
    return { diagnostics };
}

/**
 * Validate conditional types within heritage clauses
 */
function validateHeritageClauseConditionalTypes(
    typeNode: Node,
    checker: TypeChecker,
    sourceFile: SourceFile
): any[] {
    const diagnostics: any[] = [];
    
    if (typeNode.kind === SyntaxKind.ConditionalType) {
        const conditionalNode = typeNode as ConditionalTypeNode;
        const conditionalDiagnostics = integrateKindValidationInCheckConditionalType(conditionalNode, checker, sourceFile);
        diagnostics.push(...conditionalDiagnostics.diagnostics);
    }
    
    // Recursively check child nodes
    for (const child of typeNode.getChildren()) {
        const childDiagnostics = validateHeritageClauseConditionalTypes(child, checker, sourceFile);
        diagnostics.push(...childDiagnostics);
    }
    
    return diagnostics;
}

/**
 * Helper function to get current symbol from heritage clause
 */
function getCurrentSymbol(clause: any, checker: TypeChecker): any {
    // Implementation depends on the specific heritage clause context
    // This is a simplified version
    return null;
} 