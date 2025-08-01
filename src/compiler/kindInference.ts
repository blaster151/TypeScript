import {
    Symbol,
    SymbolLinks,
    Type,
    TypeFlags,
    TypeParameter,
    ClassDeclaration,
    InterfaceDeclaration,
    TypeAliasDeclaration,
    TypeParameterDeclaration,
    HeritageClause,
    ExpressionWithTypeArguments,
    TypeReferenceNode,
    KindTypeNode,
    SyntaxKind,
} from "./types.js";

/**
 * Attempts to infer kind metadata from a type's declared type parameters
 */
export function inferKindFromTypeParameters(
    typeParameters: readonly TypeParameterDeclaration[] | undefined,
    checker: any // TODO: Proper checker type
): { kindArity: number; parameterKinds: Type[]; isInferred: boolean } | undefined {
    if (!typeParameters || typeParameters.length === 0) {
        return undefined;
    }

    const kindArity = typeParameters.length;
    const parameterKinds: Type[] = [];

    // Assume all parameters are Type unless constrained otherwise
    for (const param of typeParameters) {
        if (param.constraint) {
            // Resolve the constraint type
            const constraintType = checker.getTypeFromTypeNode(param.constraint);
            parameterKinds.push(constraintType);
        } else {
            // Default to Type (any type)
            parameterKinds.push(checker.anyType);
        }
    }

    return {
        kindArity,
        parameterKinds,
        isInferred: true
    };
}

/**
 * Attempts to infer kind metadata from inheritance (extends clause)
 */
export function inferKindFromInheritance(
    heritageClauses: readonly HeritageClause[] | undefined,
    checker: any // TODO: Proper checker type
): { kindArity: number; parameterKinds: Type[]; isInferred: boolean } | undefined {
    if (!heritageClauses) {
        return undefined;
    }

    // Look for extends clause
    const extendsClause = heritageClauses.find(clause => clause.token === SyntaxKind.ExtendsKeyword);
    if (!extendsClause) {
        return undefined;
    }

    // Check each base type
    for (const baseType of extendsClause.types) {
        const baseSymbol = checker.getSymbolAtLocation(baseType.expression);
        if (baseSymbol) {
            // TODO: Access symbol links through checker
            const baseLinks = (baseSymbol as any).links;
            if (baseLinks && baseLinks.kindArity !== undefined) {
                // Found a known kind base type
                return {
                    kindArity: baseLinks.kindArity,
                    parameterKinds: baseLinks.parameterKinds || [],
                    isInferred: true
                };
            }
        }
    }

    return undefined;
}

/**
 * Attempts to infer kind metadata from implementation (implements clause)
 */
export function inferKindFromImplementation(
    heritageClauses: readonly HeritageClause[] | undefined,
    checker: any // TODO: Proper checker type
): { kindArity: number; parameterKinds: Type[]; isInferred: boolean } | undefined {
    if (!heritageClauses) {
        return undefined;
    }

    // Look for implements clause
    const implementsClause = heritageClauses.find(clause => clause.token === SyntaxKind.ImplementsKeyword);
    if (!implementsClause) {
        return undefined;
    }

    // Check each implemented interface
    for (const implementedType of implementsClause.types) {
        const interfaceSymbol = checker.getSymbolAtLocation(implementedType.expression);
        if (interfaceSymbol) {
            // TODO: Access symbol links through checker
            const interfaceLinks = (interfaceSymbol as any).links;
            if (interfaceLinks && interfaceLinks.kindArity !== undefined) {
                // Found a known kind interface
                return {
                    kindArity: interfaceLinks.kindArity,
                    parameterKinds: interfaceLinks.parameterKinds || [],
                    isInferred: true
                };
            }
        }
    }

    return undefined;
}

/**
 * Main function to infer kind metadata for a type declaration
 */
export function inferKindMetadata(
    declaration: ClassDeclaration | InterfaceDeclaration | TypeAliasDeclaration,
    checker: any // TODO: Proper checker type
): { kindArity: number; parameterKinds: Type[]; isInferred: boolean } | undefined {
    // Try inheritance first (most specific) - only for classes and interfaces
    if (hasProperty(declaration, 'heritageClauses')) {
        const inheritanceKind = inferKindFromInheritance(declaration.heritageClauses, checker);
        if (inheritanceKind) {
            return inheritanceKind;
        }

        // Try implementation
        const implementationKind = inferKindFromImplementation(declaration.heritageClauses, checker);
        if (implementationKind) {
            return implementationKind;
        }
    }

    // Try type parameters (least specific)
    const parameterKind = inferKindFromTypeParameters(declaration.typeParameters, checker);
    if (parameterKind) {
        return parameterKind;
    }

    return undefined;
}

/**
 * Attaches inferred kind metadata to a symbol
 */
export function attachInferredKindMetadata(
    symbol: Symbol,
    kindData: { kindArity: number; parameterKinds: Type[]; isInferred: boolean },
    checker: any // TODO: Proper checker type
): void {
    // TODO: Access symbol links through checker
    const links = (symbol as any).links;
    if (!links) {
        return;
    }
    
    // Check for existing metadata and validate consistency
    if (links.kindArity !== undefined) {
        if (links.kindArity !== kindData.kindArity) {
            // TODO: Report error about inconsistent kind arity
            return;
        }
        
        // Merge parameter kinds if needed
        if (!links.parameterKinds) {
            links.parameterKinds = kindData.parameterKinds;
        }
    } else {
        // Set new kind metadata
        links.kindArity = kindData.kindArity;
        links.parameterKinds = kindData.parameterKinds;
        links.isInferredKind = kindData.isInferred;
    }
}

/**
 * Helper function to be called from checker declaration functions
 * Attempts to infer kind metadata for a type declaration and attach it to the symbol
 */
export function tryInferAndAttachKindMetadata(
    declaration: ClassDeclaration | InterfaceDeclaration | TypeAliasDeclaration,
    symbol: Symbol,
    checker: any // TODO: Proper checker type
): void {
    // Only attempt inference if no explicit kind metadata exists
    const links = getSymbolLinks(symbol);
    if (links.kindArity !== undefined) {
        return; // Already has kind metadata
    }

    // Attempt to infer kind metadata
    const inferredKind = inferKindMetadata(declaration, checker);
    if (inferredKind) {
        attachInferredKindMetadata(symbol, inferredKind, checker);
    }
} 