import {
    Type,
    TypeFlags,
    KindType,
    Symbol,
    TypeChecker,
} from "./types.js";

/**
 * Factory function to create a KindType instance
 * Guarantees that downstream consumers can call .kindArity and .parameterKinds without null checks
 */
export function createKindType(
    checker: TypeChecker,
    symbol: Symbol,
    kindArity: number,
    parameterKinds: readonly Type[],
    hasErrors: boolean = false
): KindType {
    // Ensure kindArity is non-negative
    const validKindArity = Math.max(0, kindArity);
    
    // Ensure parameterKinds is always an array
    const validParameterKinds = parameterKinds || [];
    
    // Create the KindType object
    const kindType: KindType = {
        // Base Type properties
        flags: TypeFlags.Kind | (hasErrors ? TypeFlags.Error : 0),
        id: 0, // Will be set by the checker
        checker,
        symbol,
        
        // KindType specific properties
        kindArity: validKindArity,
        parameterKinds: validParameterKinds,
        
        // Optional Type properties
        pattern: undefined,
        aliasSymbol: undefined,
        aliasTypeArguments: undefined,
        permissiveInstantiation: undefined,
        restrictiveInstantiation: undefined,
        immediateBaseConstraint: undefined,
        widened: undefined,
    };
    
    return kindType;
}

/**
 * Factory function to create an error KindType
 * Returns a KindType with kindArity = 0 and TypeFlags.Error
 */
export function createErrorKindType(
    checker: TypeChecker,
    symbol: Symbol
): KindType {
    return createKindType(checker, symbol, 0, [], true);
}

/**
 * Factory function to create a KindType from a KindTypeNode
 * This is the main entry point for creating KindType instances in the checker
 */
export function createKindTypeFromNode(
    checker: TypeChecker,
    node: any, // KindTypeNode
    symbol: Symbol,
    resolvedParameterKinds: readonly Type[],
    hasErrors: boolean = false
): KindType {
    const kindArity = node.typeArguments?.length || 0;
    return createKindType(checker, symbol, kindArity, resolvedParameterKinds, hasErrors);
} 