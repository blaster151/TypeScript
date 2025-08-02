import {
    Symbol,
    Type,
    TypeChecker,
    TypeParameterDeclaration,
    TypeAliasDeclaration,
    InterfaceDeclaration,
    ClassDeclaration,
    HeritageClause,
    SyntaxKind,
    TypeFlags,
} from "./types.js";
import { retrieveBuiltInKindMetadata, isBuiltInKindAlias, isBuiltInFPPattern } from "./kindAliasMetadata.js";

/**
 * Source of kind information
 */
export const enum KindSource {
    None = 0,
    ExplicitAnnotation = 1,
    InferredFromParams = 2,
    InferredFromBaseOrInterface = 3,
    BuiltInAlias = 4, // New source for built-in kind aliases
}

/**
 * Kind metadata information
 */
export interface KindMetadata {
    arity: number;
    parameterKinds: readonly Type[];
    retrievedFrom: KindSource;
    symbol: Symbol;
    isValid: boolean;
    errorMessage?: string;
    isBuiltInAlias?: boolean; // Flag to identify built-in aliases
    aliasName?: string; // Name of the built-in alias
}

/**
 * Cache for kind metadata
 * Keyed by symbol ID for efficient lookup and invalidation
 */
class KindInfoCache {
    private cache = new Map<number, KindMetadata>();
    private symbolToKeyMap = new Map<Symbol, number>();

    /**
     * Get cached kind metadata for a symbol
     */
    get(symbol: Symbol): KindMetadata | undefined {
        const symbolId = this.getSymbolId(symbol);
        return this.cache.get(symbolId);
    }

    /**
     * Store kind metadata in the cache
     */
    set(symbol: Symbol, metadata: KindMetadata): void {
        const symbolId = this.getSymbolId(symbol);
        this.cache.set(symbolId, metadata);
        this.symbolToKeyMap.set(symbol, symbolId);
    }

    /**
     * Check if a symbol has cached kind metadata
     */
    has(symbol: Symbol): boolean {
        const symbolId = this.getSymbolId(symbol);
        return this.cache.has(symbolId);
    }

    /**
     * Invalidate cache for a specific symbol
     */
    invalidate(symbol: Symbol): void {
        const symbolId = this.getSymbolId(symbol);
        this.cache.delete(symbolId);
        this.symbolToKeyMap.delete(symbol);
    }

    /**
     * Clear all cached kind metadata
     */
    clear(): void {
        this.cache.clear();
        this.symbolToKeyMap.clear();
    }

    /**
     * Get the symbol ID for caching purposes
     */
    private getSymbolId(symbol: Symbol): number {
        // Use TypeScript's existing getSymbolId function if available
        if (typeof (globalThis as any).getSymbolId === 'function') {
            return (globalThis as any).getSymbolId(symbol);
        }
        
        // Fallback: use a hash of the symbol's name and declarations
        return (symbol as any).name ? (symbol as any).name.charCodeAt(0) : 0;
    }

    /**
     * Get cache statistics for debugging
     */
    getStats(): { size: number; hitRate: number } {
        return {
            size: this.cache.size,
            hitRate: 0 // TODO: Implement hit rate tracking
        };
    }
}

// Global cache instance
const kindInfoCache = new KindInfoCache();

export function retrieveKindMetadata(
    symbol: Symbol,
    checker: TypeChecker,
    debugMode: boolean = false
): KindMetadata {
    // Check cache first
    if (kindInfoCache.has(symbol)) {
        const cached = kindInfoCache.get(symbol);
        if (cached) {
            if (debugMode) {
                console.log(`[Kind] Cache hit for symbol ${(symbol as any).name || 'unknown'}:`, cached);
            }
            return cached;
        }
    }

    // Check for built-in kind aliases first (fast path)
    const builtInKind = retrieveBuiltInKindMetadata(symbol, checker);
    if (builtInKind) {
        if (debugMode) {
            console.log(`[Kind] Built-in kind alias found for ${(symbol as any).name}:`, builtInKind);
        }
        
        // Enhance the built-in kind metadata with alias information
        const enhancedMetadata: KindMetadata = {
            ...builtInKind,
            retrievedFrom: KindSource.BuiltInAlias,
            isBuiltInAlias: true,
            aliasName: (symbol as any).name
        };
        
        kindInfoCache.set(symbol, enhancedMetadata);
        return enhancedMetadata;
    }

    // Try explicit kind annotation first
    const explicitKind = retrieveExplicitKindAnnotation(symbol, checker, debugMode);
    if (explicitKind.isValid) {
        kindInfoCache.set(symbol, explicitKind);
        return explicitKind;
    }

    // Try inference from type parameters
    const inferredFromParams = inferKindFromTypeParameters(symbol, checker, debugMode);
    if (inferredFromParams.isValid) {
        kindInfoCache.set(symbol, inferredFromParams);
        return inferredFromParams;
    }

    // Try inference from inheritance or interface implementation
    const inferredFromBase = inferKindFromInheritance(symbol, checker, debugMode);
    if (inferredFromBase.isValid) {
        kindInfoCache.set(symbol, inferredFromBase);
        return inferredFromBase;
    }

    // Return invalid metadata if no kind could be determined
    const invalidMetadata: KindMetadata = {
        arity: 0,
        parameterKinds: [],
        retrievedFrom: KindSource.None,
        symbol,
        isValid: false,
        errorMessage: "No kind information available"
    };

    kindInfoCache.set(symbol, invalidMetadata);
    return invalidMetadata;
}

/**
 * Retrieve explicit kind annotation from symbol metadata
 */
function retrieveExplicitKindAnnotation(
    symbol: Symbol,
    checker: TypeChecker,
    debugMode: boolean
): KindMetadata {
    if (debugMode) {
        console.log(`[Kind] Attempting explicit kind retrieval for symbol ${(symbol as any).name || 'unknown'}`);
    }

    // Check for stored kind metadata in symbol links
    const links = (symbol as any).links;
    if (links && links.kindArity !== undefined) {
        const arity = links.kindArity;
        const parameterKinds = links.parameterKinds || [];
        
        // Validate that parameterKinds.length === arity
        if (parameterKinds.length !== arity) {
            return {
                arity: 0,
                parameterKinds: [],
                retrievedFrom: KindSource.ExplicitAnnotation,
                symbol,
                isValid: false,
                errorMessage: `Kind arity mismatch: expected ${arity}, got ${parameterKinds.length} parameter kinds`
            };
        }

        // Validate against declaration
        const validationResult = validateKindAgainstDeclaration(symbol, arity, checker);
        if (!validationResult.isValid) {
            return {
                arity: 0,
                parameterKinds: [],
                retrievedFrom: KindSource.ExplicitAnnotation,
                symbol,
                isValid: false,
                errorMessage: validationResult.errorMessage
            };
        }

        if (debugMode) {
            console.log(`[Kind] Explicit kind found: arity=${arity}, parameterKinds=${parameterKinds.length}`);
        }

        return {
            arity,
            parameterKinds,
            retrievedFrom: KindSource.ExplicitAnnotation,
            symbol,
            isValid: true
        };
    }

    return {
        arity: 0,
        parameterKinds: [],
        retrievedFrom: KindSource.ExplicitAnnotation,
        symbol,
        isValid: false,
        errorMessage: "No explicit kind annotation found"
    };
}

/**
 * Validate kind metadata against the actual declaration
 */
function validateKindAgainstDeclaration(
    symbol: Symbol,
    arity: number,
    checker: TypeChecker
): { isValid: boolean; errorMessage?: string } {
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return { isValid: false, errorMessage: "No declarations found for symbol" };
    }

    // Find the first relevant declaration
    const declaration = declarations.find(d => 
        d.kind === SyntaxKind.TypeAliasDeclaration ||
        d.kind === SyntaxKind.InterfaceDeclaration ||
        d.kind === SyntaxKind.ClassDeclaration
    );

    if (!declaration) {
        return { isValid: false, errorMessage: "No type declaration found" };
    }

    // Count actual type parameters
    let actualArity = 0;
    if (declaration.kind === SyntaxKind.TypeAliasDeclaration) {
        actualArity = (declaration as TypeAliasDeclaration).typeParameters?.length || 0;
    } else if (declaration.kind === SyntaxKind.InterfaceDeclaration) {
        actualArity = (declaration as InterfaceDeclaration).typeParameters?.length || 0;
    } else if (declaration.kind === SyntaxKind.ClassDeclaration) {
        actualArity = (declaration as ClassDeclaration).typeParameters?.length || 0;
    }

    if (actualArity !== arity) {
        return {
            isValid: false,
            errorMessage: `Kind arity mismatch: stored arity=${arity}, actual type parameters=${actualArity}`
        };
    }

    return { isValid: true };
}

/**
 * Infer kind from declared type parameters
 */
function inferKindFromTypeParameters(
    symbol: Symbol,
    checker: TypeChecker,
    debugMode: boolean
): KindMetadata {
    if (debugMode) {
        console.log(`[Kind] Attempting inference from type parameters for symbol ${(symbol as any).name || 'unknown'}`);
    }

    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromParams,
            symbol,
            isValid: false,
            errorMessage: "No declarations found for symbol"
        };
    }

    // Find the first relevant declaration
    const declaration = declarations.find(d => 
        d.kind === SyntaxKind.TypeAliasDeclaration ||
        d.kind === SyntaxKind.InterfaceDeclaration ||
        d.kind === SyntaxKind.ClassDeclaration
    );

    if (!declaration) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromParams,
            symbol,
            isValid: false,
            errorMessage: "No type declaration found"
        };
    }

    // Count type parameters
    let typeParameters: readonly TypeParameterDeclaration[] = [];
    if (declaration.kind === SyntaxKind.TypeAliasDeclaration) {
        typeParameters = (declaration as TypeAliasDeclaration).typeParameters || [];
    } else if (declaration.kind === SyntaxKind.InterfaceDeclaration) {
        typeParameters = (declaration as InterfaceDeclaration).typeParameters || [];
    } else if (declaration.kind === SyntaxKind.ClassDeclaration) {
        typeParameters = (declaration as ClassDeclaration).typeParameters || [];
    }

    const kindArity = typeParameters.length;

    if (debugMode) {
        console.log(`[Kind] Found ${kindArity} type parameters`);
    }

    // Derive parameter kinds
    const parameterKinds: Type[] = [];
    for (const typeParam of typeParameters) {
        const paramKind = deriveParameterKind(typeParam, checker, debugMode);
        parameterKinds.push(paramKind);
    }

    if (debugMode) {
        console.log(`[Kind] Inferred kind: arity=${kindArity}, parameterKinds=${parameterKinds.length}`);
    }

    return {
        arity: kindArity,
        parameterKinds,
        retrievedFrom: KindSource.InferredFromParams,
        symbol,
        isValid: true
    };
}

/**
 * Derive the kind of a type parameter
 */
function deriveParameterKind(
    typeParam: TypeParameterDeclaration,
    checker: TypeChecker,
    debugMode: boolean
): Type {
    if (!typeParam.constraint) {
        // No constraint - default to Type
        if (debugMode) {
            console.log(`[Kind] Type parameter ${typeParam.name.escapedText} has no constraint, defaulting to Type`);
        }
        return checker.getAnyType(); // TODO: Use proper Type type
    }

    // Check if constraint is another Kind<...>
    if (typeParam.constraint.kind === SyntaxKind.KindType) {
        if (debugMode) {
            console.log(`[Kind] Type parameter ${typeParam.name.escapedText} has Kind constraint`);
        }
        return checker.getTypeFromTypeNode(typeParam.constraint);
    }

    // Check if constraint is a basic type
    const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
    if (isBasicType(constraintType)) {
        if (debugMode) {
            console.log(`[Kind] Type parameter ${typeParam.name.escapedText} has basic type constraint`);
        }
        return constraintType;
    }

    // Check if constraint is a type parameter from outer scope
    if (isTypeParameterFromOuterScope(typeParam.constraint, checker)) {
        if (debugMode) {
            console.log(`[Kind] Type parameter ${typeParam.name.escapedText} has outer scope constraint`);
        }
        return constraintType;
    }

    // Default to Type
    if (debugMode) {
        console.log(`[Kind] Type parameter ${typeParam.name.escapedText} defaulting to Type`);
    }
    return checker.getAnyType(); // TODO: Use proper Type type
}

/**
 * Check if a type is a basic type (string, number, etc.)
 */
function isBasicType(type: Type): boolean {
    // This is a simplified check - in practice, you'd want to check against
    // the actual basic types in the TypeScript type system
    return !!(type.flags & TypeFlags.String) ||
           !!(type.flags & TypeFlags.Number) ||
           !!(type.flags & TypeFlags.Boolean) ||
           !!(type.flags & TypeFlags.Undefined) ||
           !!(type.flags & TypeFlags.Null) ||
           !!(type.flags & TypeFlags.Void) ||
           !!(type.flags & TypeFlags.Never) ||
           !!(type.flags & TypeFlags.Any) ||
           !!(type.flags & TypeFlags.Unknown);
}

/**
 * Check if a constraint is a type parameter from outer scope
 */
function isTypeParameterFromOuterScope(
    constraint: any, // TypeNode
    checker: TypeChecker
): boolean {
    // Check if the constraint is a type reference
    if (constraint.kind !== SyntaxKind.TypeReference) {
        return false;
    }

    const typeRef = constraint; // TypeReferenceNode
    
    // Check if it references an identifier (type parameter name)
    if (typeRef.typeName.kind !== SyntaxKind.Identifier) {
        return false;
    }

    const typeName = typeRef.typeName.getText();
    
    // Get the current scope's type parameters
    const currentScope = getCurrentScopeTypeParameters(constraint, checker);
    
    // Check if the type name is NOT in the current scope's type parameters
    // If it's not in current scope, it must be from an outer scope
    return !currentScope.has(typeName);
}

/**
 * Get type parameter names from the current scope
 */
function getCurrentScopeTypeParameters(node: any, checker: TypeChecker): Set<string> {
    const typeParams = new Set<string>();
    
    // Walk up the AST to find type parameter declarations
    let current: any = node;
    
    while (current) {
        // Check if current node has type parameters
        if (current.typeParameters) {
            for (const typeParam of current.typeParameters) {
                if (typeParam.name && typeParam.name.getText) {
                    typeParams.add(typeParam.name.getText());
                }
            }
        }
        
        // Check if we're in a class, interface, or type alias declaration
        if (current.kind === SyntaxKind.ClassDeclaration ||
            current.kind === SyntaxKind.InterfaceDeclaration ||
            current.kind === SyntaxKind.TypeAliasDeclaration) {
            // These can have type parameters, but we already checked above
            break;
        }
        
        // Move to parent
        current = current.parent;
    }
    
    return typeParams;
}

/**
 * Infer kind from inheritance or interface implementation
 */
function inferKindFromInheritance(
    symbol: Symbol,
    checker: TypeChecker,
    debugMode: boolean
): KindMetadata {
    if (debugMode) {
        console.log(`[Kind] Attempting inference from inheritance for symbol ${(symbol as any).name || 'unknown'}`);
    }

    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol,
            isValid: false,
            errorMessage: "No declarations found for symbol"
        };
    }

    // Find the first relevant declaration
    const declaration = declarations.find(d => 
        d.kind === SyntaxKind.TypeAliasDeclaration ||
        d.kind === SyntaxKind.InterfaceDeclaration ||
        d.kind === SyntaxKind.ClassDeclaration
    );

    if (!declaration) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol,
            isValid: false,
            errorMessage: "No type declaration found"
        };
    }

    // Check for base type (extends)
    const baseKind = checkBaseTypeKind(declaration, checker, debugMode);
    if (baseKind.isValid) {
        return baseKind;
    }

    // Check for implemented interfaces
    const interfaceKind = checkImplementedInterfaceKind(declaration, checker, debugMode);
    if (interfaceKind.isValid) {
        return interfaceKind;
    }

    return {
        arity: 0,
        parameterKinds: [],
        retrievedFrom: KindSource.InferredFromBaseOrInterface,
        symbol,
        isValid: false,
        errorMessage: "No inheritance or interface implementation found"
    };
}

/**
 * Check for base type kind information
 */
function checkBaseTypeKind(
    declaration: any, // TypeAliasDeclaration | InterfaceDeclaration | ClassDeclaration
    checker: TypeChecker,
    debugMode: boolean
): KindMetadata {
    if (debugMode) {
        console.log(`[Kind] Checking base type kind for declaration`);
    }

    // Check if the declaration has heritage clauses
    if (!declaration.heritageClauses) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol: declaration.symbol,
            isValid: false,
            errorMessage: "No heritage clauses found"
        };
    }

    // Look for extends clauses
    const extendsClause = declaration.heritageClauses.find((clause: any) => 
        clause.token === SyntaxKind.ExtendsKeyword
    );

    if (!extendsClause) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol: declaration.symbol,
            isValid: false,
            errorMessage: "No extends clause found"
        };
    }

    // Get the first base type (most cases have single inheritance)
    const baseTypeRef = extendsClause.types[0];
    if (!baseTypeRef) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol: declaration.symbol,
            isValid: false,
            errorMessage: "No base type reference found"
        };
    }

    // Resolve the base type
    const baseType = checker.getTypeFromTypeNode(baseTypeRef);
    if (!baseType || !baseType.symbol) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol: declaration.symbol,
            isValid: false,
            errorMessage: "Could not resolve base type"
        };
    }

    // Extract kind information from the base type
    const baseKind = retrieveKindMetadata(baseType.symbol, checker, debugMode);
    if (baseKind.isValid) {
        if (debugMode) {
            console.log(`[Kind] Found valid base type kind: arity=${baseKind.arity}`);
        }
        return {
            ...baseKind,
            symbol: declaration.symbol // Use the current declaration's symbol
        };
    }

    return {
        arity: 0,
        parameterKinds: [],
        retrievedFrom: KindSource.InferredFromBaseOrInterface,
        symbol: declaration.symbol,
        isValid: false,
        errorMessage: `Base type has no valid kind information: ${baseKind.errorMessage}`
    };
}

/**
 * Check for implemented interface kind information
 */
function checkImplementedInterfaceKind(
    declaration: any, // TypeAliasDeclaration | InterfaceDeclaration | ClassDeclaration
    checker: TypeChecker,
    debugMode: boolean
): KindMetadata {
    if (debugMode) {
        console.log(`[Kind] Checking implemented interface kind for declaration`);
    }

    // Check if the declaration has heritage clauses
    if (!declaration.heritageClauses) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol: declaration.symbol,
            isValid: false,
            errorMessage: "No heritage clauses found"
        };
    }

    // Look for implements clauses
    const implementsClause = declaration.heritageClauses.find((clause: any) => 
        clause.token === SyntaxKind.ImplementsKeyword
    );

    if (!implementsClause) {
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: KindSource.InferredFromBaseOrInterface,
            symbol: declaration.symbol,
            isValid: false,
            errorMessage: "No implements clause found"
        };
    }

    // Try each implemented interface
    for (const interfaceRef of implementsClause.types) {
        if (!interfaceRef) continue;

        // Resolve the interface type
        const interfaceType = checker.getTypeFromTypeNode(interfaceRef);
        if (!interfaceType || !interfaceType.symbol) {
            continue;
        }

        // Extract kind information from the interface
        const interfaceKind = retrieveKindMetadata(interfaceType.symbol, checker, debugMode);
        if (interfaceKind.isValid) {
            if (debugMode) {
                console.log(`[Kind] Found valid interface kind: arity=${interfaceKind.arity}`);
            }
            return {
                ...interfaceKind,
                symbol: declaration.symbol // Use the current declaration's symbol
            };
        }
    }

    return {
        arity: 0,
        parameterKinds: [],
        retrievedFrom: KindSource.InferredFromBaseOrInterface,
        symbol: declaration.symbol,
        isValid: false,
        errorMessage: "No implemented interface has valid kind information"
    };
} 

/**
 * Get the expanded kind signature for a built-in alias
 * This returns the equivalent Kind<...> form for the alias
 */
export function getExpandedKindSignature(aliasName: string): KindMetadata | undefined {
    switch (aliasName) {
        case "Functor":
            return { arity: 1, parameterKinds: ["Type", "Type"] };
        case "Bifunctor":
            return { arity: 2, parameterKinds: ["Type", "Type", "Type"] };
        default:
            return undefined;
    }
}

/**
 * Check if a symbol is a built-in kind alias
 */
export function isBuiltInKindAliasSymbol(symbol: Symbol): boolean {
    return isBuiltInKindAlias(symbol);
}

/**
 * Check if a symbol is a built-in FP pattern
 */
export function isBuiltInFPPatternSymbol(symbol: Symbol): boolean {
    return isBuiltInFPPattern(symbol);
}

/**
 * Get the alias name for a built-in kind alias symbol
 */
export function getBuiltInAliasName(symbol: Symbol): string | undefined {
    if (isBuiltInKindAlias(symbol)) {
        return (symbol as any).name;
    }
    return undefined;
} 