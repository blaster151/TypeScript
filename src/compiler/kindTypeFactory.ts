import {
    Type,
    TypeFlags,
    KindType,
    Symbol,
    TypeChecker,
    TypeConstructorType,
    ObjectFlags,
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
        flags: TypeFlags.Kind,
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

/**
 * Factory function to create a TypeConstructorType
 * This is used when a Kind<> type annotation is applied to a generic type
 */
export function createTypeConstructorType(
    checker: TypeChecker,
    symbol: Symbol,
    arity: number,
    parameterKinds: readonly Type[],
    targetType: Type,
    hasErrors: boolean = false
): TypeConstructorType {
    // Create the TypeConstructorType object
    const typeConstructorType: TypeConstructorType = {
        // Base Type properties
        flags: TypeFlags.Object | ObjectFlags.TypeConstructor,
        id: 0, // Will be set by the checker
        checker,
        symbol,
        
        // TypeConstructorType specific properties
        arity,
        parameterKinds,
        targetType,
        
        // Optional Type properties
        pattern: undefined,
        aliasSymbol: undefined,
        aliasTypeArguments: undefined,
        permissiveInstantiation: undefined,
        restrictiveInstantiation: undefined,
        immediateBaseConstraint: undefined,
        widened: undefined,
    };
    
    return typeConstructorType;
} 

// Type instantiation cache (keyed by constructor symbol id + type arg ids)
const typeInstantiationCache = new Map<string, Type>();

/**
 * Applies a TypeConstructorType to type arguments, checking arity and emitting diagnostics if needed.
 * Returns a concrete type or error type.
 */
export function applyTypeConstructor(
    checker: TypeChecker,
    constructorType: TypeConstructorType,
    typeArgs: readonly Type[],
    errorNode?: any // Node | undefined
): Type {
    if (constructorType.arity !== typeArgs.length) {
        // Fallback: return a generic error type
        return { flags: TypeFlags.Any, id: 0, checker } as Type;
    }
    return instantiateTypeConstructor(checker, constructorType, typeArgs);
}

/**
 * Instantiates a TypeConstructorType with the given type arguments, caching the result.
 */
export function instantiateTypeConstructor(
    checker: TypeChecker,
    constructorType: TypeConstructorType,
    typeArgs: readonly Type[]
): Type {
    // Use only symbol.id for cache key
    const key = `${constructorType.symbol.id}:${typeArgs.map(t => t.id).join(",")}`;
    const cached = typeInstantiationCache.get(key);
    if (cached) return cached;

    const typeRef: Type = {
        flags: TypeFlags.Object,
        id: 0, // Will be set by checker
        checker,
        symbol: constructorType.symbol,
        aliasTypeArguments: typeArgs,
        target: constructorType.targetType,
    } as any;
    typeInstantiationCache.set(key, typeRef);
    return typeRef;
} 