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
    isKindSensitiveContext,
    areKindsCompatible,
    validateFPPatternConstraints,
    compareKindsWithAliasSupport,
    getKindCompatibilityDiagnostic
} from "./kindCompatibility.js";
import { 
    retrieveKindMetadata,
    isBuiltInKindAliasSymbol,
    getBuiltInAliasName,
    getExpandedKindSignature
} from "./kindMetadata.js";
import { compareKinds } from "./kindComparison.js";
import { createKindDiagnosticReporter } from "./kindDiagnosticReporter.js";
import { KindDiagnosticCodes } from "./kindDiagnostics.js";
import { globalKindConstraintMap } from "./kindConstraintPropagation.js";
import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";

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
                    
                    // Enhanced kind compatibility check with alias support
                    const validation = compareKindsWithAliasSupport(expectedKind, actualKind, checker);
                    
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
                        const diagnostic = getKindCompatibilityDiagnostic(expectedKind, actualKind, checker);
                        if (diagnostic.message) {
                            diagnostics.push({
                                file: sourceFile,
                                start: node.getStart(sourceFile),
                                length: node.getWidth(sourceFile),
                                messageText: diagnostic.message,
                                category: 1, // Error
                                code: diagnostic.code,
                                reportsUnnecessary: false,
                                reportsDeprecated: false,
                                source: "ts.plus"
                            });
                        }
                    }
                    
                    return { hasKindValidation: true, diagnostics };
                }
            }
        }
    }
    
    // Check for FP pattern constraint violations (Free, Fix)
    if (node.typeArguments && node.typeArguments.length > 0) {
        const typeName = (node.typeName as any).escapedText;
        if (typeName === "Free" || typeName === "Fix") {
            const typeArguments = node.typeArguments.map(arg => checker.getTypeFromTypeNode(arg));
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
                    code: diagnosticCode,
                    reportsUnnecessary: false,
                    reportsDeprecated: false,
                    source: "ts.plus",
                    relatedInformation: generateQuickFixSuggestions(typeName, typeArguments[0], node, sourceFile)
                });
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
            if (actualKind && actualKind.isValid) {
                // Create expected kind from constraint
                const expectedKind = {
                    arity: constraint.arity,
                    parameterKinds: constraint.parameterKinds || [],
                    symbol: typeArg.symbol,
                    retrievedFrom: "constraint",
                    isValid: true
                };
                
                // Enhanced kind compatibility check with alias support
                const validation = compareKindsWithAliasSupport(expectedKind, actualKind, checker);
                
                if (!validation.isCompatible) {
                    violations.push({
                        typeArgument: typeArg,
                        typeParameter: typeParam,
                        expectedKind,
                        actualKind,
                        validation
                    });
                    
                    const diagnostic = getKindCompatibilityDiagnostic(expectedKind, actualKind, checker);
                    if (diagnostic.message) {
                        diagnostics.push({
                            file: sourceFile,
                            start: typeParam.getStart(sourceFile),
                            length: typeParam.getWidth(sourceFile),
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
    
    return { violations, diagnostics };
}

/**
 * Integration point 3: checkTypeAliasDeclaration() - Validate kind consistency
 */
export function integrateKindValidationInCheckTypeAliasDeclaration(
    node: TypeAliasDeclaration,
    checker: TypeChecker,
    sourceFile: SourceFile
): { diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Check if this is a built-in kind alias declaration
    const symbol = checker.getSymbolAtLocation(node.name);
    if (symbol && isBuiltInKindAliasSymbol(symbol)) {
        const aliasName = getBuiltInAliasName(symbol);
        if (aliasName) {
            // Validate that the alias has the correct kind metadata
            const kindMetadata = retrieveKindMetadata(symbol, checker, false);
            if (!kindMetadata.isValid) {
                diagnostics.push({
                    file: sourceFile,
                    start: node.getStart(sourceFile),
                    length: node.getWidth(sourceFile),
                    messageText: `Kind alias '${aliasName}' must have valid kind metadata`,
                    category: 1, // Error
                    code: applyKindDiagnosticAlias(9512),
                    reportsUnnecessary: false,
                    reportsDeprecated: false,
                    source: "ts.plus"
                });
            }
        }
    }
    
    return { diagnostics };
}

/**
 * Integration point 4: checkHeritageClauses() - Validate kind inheritance
 */
export function integrateKindValidationInCheckHeritageClauses(
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
        }
    }
    
    return { diagnostics };
}

/**
 * Integration point 5: checkMappedType() - Validate kind constraints in mapped types
 */
export function integrateKindValidationInCheckMappedType(
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
                        // Enhanced kind compatibility check with alias support
                        const validation = compareKindsWithAliasSupport(constraintKind, paramKind, checker);
                        
                        if (!validation.isCompatible) {
                            const diagnostic = getKindCompatibilityDiagnostic(constraintKind, paramKind, checker);
                            if (diagnostic.message) {
                                diagnostics.push({
                                    file: sourceFile,
                                    start: node.typeParameter.getStart(sourceFile),
                                    length: node.typeParameter.getWidth(sourceFile),
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
    }
    
    return { diagnostics };
}

/**
 * Generate quick-fix suggestions for FP pattern constraint violations
 */
function generateQuickFixSuggestions(
    patternName: string,
    typeArgument: Type,
    node: Node,
    sourceFile: SourceFile
): any[] {
    const suggestions: any[] = [];
    
    // Suggestion 1: Change type parameter to Functor
    suggestions.push({
        category: 2, // Message
                            code: applyKindDiagnosticAlias(9521),
        messageText: "Change type parameter to Functor",
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile)
    });
    
    // Suggestion 2: Wrap type in Functor<...>
    if (typeArgument.symbol) {
        const typeName = (typeArgument.symbol as any).name;
        if (typeName) {
            suggestions.push({
                category: 2, // Message
                                    code: applyKindDiagnosticAlias(9522),
                messageText: `Wrap type in Functor<${typeName}>`,
                file: sourceFile,
                start: node.getStart(sourceFile),
                length: node.getWidth(sourceFile)
            });
        }
    }
    
    // Suggestion 3: Replace with known functor
    suggestions.push({
        category: 2, // Message
                            code: applyKindDiagnosticAlias(9523),
        messageText: "Replace with known functor",
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile)
    });
    
    return suggestions;
}

/**
 * Get the related heritage symbol based on clause kind
 * 
 * @param symbol - The base symbol (class/interface)
 * @param clauseKind - The heritage clause kind (ExtendsKeyword or ImplementsKeyword)
 * @param checker - The type checker instance
 * @returns The related symbol from the heritage clause
 */
function getRelatedHeritageSymbol(symbol: Symbol, clauseKind: SyntaxKind, checker: TypeChecker): Symbol | undefined {
    // Get the declaration node for the symbol
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return undefined;
    }
    
    const declaration = declarations[0];
    if (!declaration.heritageClauses) {
        return undefined;
    }
    
    // Find the heritage clause with the specified kind
    const heritageClause = declaration.heritageClauses.find(clause => clause.token === clauseKind);
    if (!heritageClause || heritageClause.types.length === 0) {
        return undefined;
    }
    
    // Get the first type reference from the heritage clause
    const typeRef = heritageClause.types[0];
    const baseType = checker.getTypeFromTypeNode(typeRef.expression);
    
    return baseType.symbol;
}

/**
 * Get the current symbol from heritage clause context
 */
function getCurrentSymbol(clause: HeritageClause, checker: TypeChecker): any {
    const parent = clause.parent;
    if (parent) {
        return checker.getSymbolAtLocation(parent.name || parent);
    }
    return undefined;
}

/**
 * Check if a node is a kind type reference
 */
function isKindTypeReference(node: Node, checker: TypeChecker): boolean {
    if (node.kind === SyntaxKind.TypeReference) {
        const typeRef = node as TypeReferenceNode;
        const typeName = (typeRef.typeName as any).escapedText;
        
        // Check for Kind keyword
        if (typeName === "Kind") {
            return true;
        }
        
        // Check if this is a built-in kind alias
        if (typeName === "Functor" || typeName === "Bifunctor") {
            return true;
        }
        
        // Check for FP patterns
        if (typeName === "Free" || typeName === "Fix") {
            return true;
        }
    }
    
    return false;
} 