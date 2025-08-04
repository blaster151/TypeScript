import {
    TypeChecker,
    Symbol,
    SymbolFlags,
    SourceFile,
    Node,
    Type,
    Program,
    TypeReferenceNode,
} from "./types.js";
import { retrieveKindMetadata } from "./kindMetadata.js";

/**
 * Result of scope analysis for type constructors
 */
export interface TypeConstructorInfo {
    symbol: Symbol;
    name: string;
    kind: any; // KindMetadata
    source: "local" | "import" | "global" | "module";
    distance: number; // Distance from current node (for ranking)
}

/**
 * Find all type constructors in scope that could be suggested as quick fixes
 */
export function findTypeConstructorsInScope(
    node: Node,
    checker: TypeChecker,
    program: Program
): TypeConstructorInfo[] {
    const results: TypeConstructorInfo[] = [];
    const sourceFile = (node as any).getSourceFile();

    // Get the scope at the node's location
    const scope = getScopeAtLocation(node, checker);
    if (!scope) return results;

    // Find all symbols in the scope
    const symbols = getAllSymbolsInScope(scope, checker);
    
    for (const symbol of symbols) {
        // Check if this symbol could be a type constructor
        if (!isPotentialTypeConstructor(symbol, checker)) continue;

        // Try to get kind metadata
        const kind = retrieveKindMetadata(symbol, checker, false);
        if (!kind) continue;

        // Calculate distance from current node
        const distance = calculateDistanceFromNode(symbol, node, sourceFile);

        results.push({
            symbol,
            name: symbol.name || "unknown",
            kind,
            source: determineSymbolSource(symbol, sourceFile),
            distance
        });
    }

    // Sort by relevance (distance first, then source priority)
    results.sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return getSourcePriority(a.source) - getSourcePriority(b.source);
    });

    return results;
}

/**
 * Get the scope at a specific location
 * Analyzes the scope hierarchy at a given node position
 */
function getScopeAtLocation(node: Node, checker: TypeChecker): any {
    const sourceFile = node.getSourceFile();
    
    // Simplified implementation that focuses on the current file scope
    // In a full implementation, we'd build a complete scope hierarchy
    return {
        type: "module",
        sourceFile,
        symbols: new Map<string, Symbol>(),
        scopeChain: [{
            type: "module",
            sourceFile,
            symbols: new Map<string, Symbol>(),
        }],
        getSymbolsInScope: (name: string) => undefined,
        getTypeConstructors: () => [],
    };
}

/**
 * Get all symbols in a scope
 */
function getAllSymbolsInScope(scope: any, checker: TypeChecker): Symbol[] {
    const symbols: Symbol[] = [];
    
    // Get symbols from the current source file
    if (scope.sourceFile) {
        // This is a simplified approach - in practice you'd use the checker's scope APIs
        // For now, we'll return an empty array as the full implementation would require
        // access to the checker's internal scope management
    }
    
    return symbols;
}

/**
 * Check if a symbol could be a type constructor
 */
function isPotentialTypeConstructor(symbol: Symbol, checker: TypeChecker): boolean {
    // Check if it's a type alias, interface, or class
    if (!(symbol.flags & (SymbolFlags.TypeAlias | SymbolFlags.Interface | SymbolFlags.Class))) {
        return false;
    }

    // Check if it has type parameters (indicating it's a type constructor)
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) return false;

    for (const declaration of declarations) {
        if (declaration.kind === 'TypeAliasDeclaration' && (declaration as any).typeParameters) {
            return true;
        }
        if (declaration.kind === 'InterfaceDeclaration' && (declaration as any).typeParameters) {
            return true;
        }
        if (declaration.kind === 'ClassDeclaration' && (declaration as any).typeParameters) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate distance from a node to a symbol
 */
function calculateDistanceFromNode(symbol: Symbol, node: Node, sourceFile: SourceFile): number {
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) return 1000; // Far away

    // Find the closest declaration
    let minDistance = 1000;
    for (const declaration of declarations) {
        if (declaration.getSourceFile() === sourceFile) {
            const distance = Math.abs(declaration.pos - node.pos);
            minDistance = Math.min(minDistance, distance);
        }
    }

    // Add penalty for imported symbols
    if (determineSymbolSource(symbol, sourceFile) === "import") {
        minDistance += 100; // Imported symbols are considered further away
    }

    return minDistance;
}

/**
 * Determine the source of a symbol
 */
function determineSymbolSource(symbol: Symbol, sourceFile: SourceFile): "local" | "import" | "global" | "module" {
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) return "global";

    // Check if any declaration is in the current file
    for (const declaration of declarations) {
        if (declaration.getSourceFile() === sourceFile) {
            return "local";
        }
    }

    // Check if it's imported
    if (symbol.flags & SymbolFlags.Transient) {
        return "import";
    }

    // Check if it's from a module
    if (symbol.flags & SymbolFlags.Module) {
        return "module";
    }

    return "global";
}

/**
 * Get priority for symbol sources (lower is higher priority)
 */
function getSourcePriority(source: "local" | "import" | "global" | "module"): number {
    switch (source) {
        case "local": return 0;
        case "import": return 1;
        case "module": return 2;
        case "global": return 3;
        default: return 4;
    }
}

/**
 * Find type constructors that match a specific kind signature
 */
export function findMatchingTypeConstructors(
    expectedKind: any, // KindMetadata
    node: Node,
    checker: TypeChecker,
    program: Program
): TypeConstructorInfo[] {
    const allConstructors = findTypeConstructorsInScope(node, checker, program);
    const matching: TypeConstructorInfo[] = [];

    for (const constructor of allConstructors) {
        // Compare kinds
        const comparison = compareKinds(expectedKind, constructor.kind, checker, false);
        if (comparison.isCompatible) {
            matching.push(constructor);
        }
    }

    return matching;
}

/**
 * Rank type constructor suggestions by compatibility
 */
export function rankTypeConstructorSuggestions(
    suggestions: TypeConstructorInfo[],
    expectedKind: any, // KindMetadata
    checker: TypeChecker
): TypeConstructorInfo[] {
    // Add compatibility scores
    const scored = suggestions.map(suggestion => ({
        ...suggestion,
        compatibilityScore: calculateCompatibilityScore(expectedKind, suggestion.kind, checker)
    }));

    // Sort by compatibility score (highest first), then by distance, then by source priority
    scored.sort((a, b) => {
        if (a.compatibilityScore !== b.compatibilityScore) {
            return b.compatibilityScore - a.compatibilityScore;
        }
        if (a.distance !== b.distance) {
            return a.distance - b.distance;
        }
        return getSourcePriority(a.source) - getSourcePriority(b.source);
    });

    return scored;
}

/**
 * Calculate compatibility score between expected and actual kinds
 */
function calculateCompatibilityScore(
    expectedKind: any, // KindMetadata
    actualKind: any, // KindMetadata
    checker: TypeChecker
): number {
    let score = 0;

    // 1. Compare arity (exact match = high score)
    if (expectedKind.arity === actualKind.arity) {
        score += 50; // High score for exact arity match
    } else {
        // Penalize arity mismatch, but allow some flexibility
        const arityDiff = Math.abs(expectedKind.arity - actualKind.arity);
        score -= arityDiff * 20; // Significant penalty for arity mismatch
    }

    // 2. Compare parameter kinds (exact match = high score)
    if (expectedKind.parameterKinds.length === actualKind.parameterKinds.length) {
        score += 30; // Base score for matching parameter count
        
        // Detailed parameter kind comparison
        for (let i = 0; i < expectedKind.parameterKinds.length; i++) {
            const expectedParam = expectedKind.parameterKinds[i];
            const actualParam = actualKind.parameterKinds[i];
            
            if (expectedParam && actualParam) {
                // Check for exact type match
                if (expectedParam === actualParam) {
                    score += 10; // Exact parameter kind match
                } else {
                    // Check for structural compatibility
                    const compatibility = checkParameterKindCompatibility(expectedParam, actualParam, checker);
                    score += compatibility;
                }
            }
        }
    } else {
        // Penalize parameter count mismatch
        const paramDiff = Math.abs(expectedKind.parameterKinds.length - actualKind.parameterKinds.length);
        score -= paramDiff * 15;
    }

    // 3. Check variance compatibility
    const varianceScore = checkVarianceCompatibility(expectedKind, actualKind, checker);
    score += varianceScore;

    // 4. Consider alias resolution
    const aliasScore = checkAliasResolution(expectedKind, actualKind, checker);
    score += aliasScore;

    // 5. Bonus for exact matches
    if (score > 0 && expectedKind.arity === actualKind.arity && 
        expectedKind.parameterKinds.length === actualKind.parameterKinds.length) {
        // Check if all parameters are exactly the same
        let allExact = true;
        for (let i = 0; i < expectedKind.parameterKinds.length; i++) {
            if (expectedKind.parameterKinds[i] !== actualKind.parameterKinds[i]) {
                allExact = false;
                break;
            }
        }
        if (allExact) {
            score += 20; // Bonus for perfect match
        }
    }

    return Math.max(0, score); // Ensure non-negative score
}

/**
 * Check compatibility between two parameter kinds
 */
function checkParameterKindCompatibility(
    expected: Type,
    actual: Type,
    checker: TypeChecker
): number {
    // Check if types are assignable
    if (checker.isTypeAssignableTo(actual, expected)) {
        return 8; // High score for assignable types
    }
    
    // Check if types are structurally similar
    if (checker.isTypeAssignableTo(expected, actual)) {
        return 5; // Medium score for reverse assignability
    }
    
    // Check for common base types
    const commonBase = findCommonBaseType(expected, actual, checker);
    if (commonBase) {
        return 3; // Low score for common base type
    }
    
    return 0; // No compatibility
}

/**
 * Check variance compatibility between kinds
 */
function checkVarianceCompatibility(
    expectedKind: any, // KindMetadata
    actualKind: any, // KindMetadata
    checker: TypeChecker
): number {
    // For now, assume variance is compatible if arity matches
    // In a full implementation, you'd check:
    // - Covariant parameters (out)
    // - Contravariant parameters (in)
    // - Invariant parameters
    // - Bivariant parameters
    
    if (expectedKind.arity === actualKind.arity) {
        return 5; // Base score for matching arity
    }
    
    return 0;
}

/**
 * Check alias resolution compatibility
 */
function checkAliasResolution(
    expectedKind: any, // KindMetadata
    actualKind: any, // KindMetadata
    checker: TypeChecker
): number {
    // Check if one kind is an alias of the other
    // This would involve checking if the symbols are aliases
    // or if they resolve to the same underlying type
    
    if (expectedKind.symbol === actualKind.symbol) {
        return 10; // High score for same symbol
    }
    
    // Check if symbols are aliases
    if (areSymbolsAliases(expectedKind.symbol, actualKind.symbol, checker)) {
        return 8; // High score for aliases
    }
    
    return 0;
}

/**
 * Find common base type between two types
 * Traverses the type hierarchy to find the most specific common ancestor
 */
function findCommonBaseType(
    type1: Type,
    type2: Type,
    checker: TypeChecker
): Type | null {
    // If types are identical, return the type
    if (type1 === type2) {
        return type1;
    }
    
    // Check if both types have the same base type
    if (type1.flags === type2.flags) {
        return type1; // Same type
    }
    
    // Check if one is assignable to the other
    if (checker.isTypeAssignableTo(type1, type2)) {
        return type2;
    }
    
    if (checker.isTypeAssignableTo(type2, type1)) {
        return type1;
    }
    
    // Handle union types
    if (type1.flags & TypeFlags.Union) {
        const unionType = type1 as any;
        for (const unionMember of unionType.types) {
            const commonType = findCommonBaseType(unionMember, type2, checker);
            if (commonType) {
                return commonType;
            }
        }
    }
    
    if (type2.flags & TypeFlags.Union) {
        const unionType = type2 as any;
        for (const unionMember of unionType.types) {
            const commonType = findCommonBaseType(type1, unionMember, checker);
            if (commonType) {
                return commonType;
            }
        }
    }
    
    // Handle intersection types
    if (type1.flags & TypeFlags.Intersection) {
        const intersectionType = type1 as any;
        for (const intersectionMember of intersectionType.types) {
            const commonType = findCommonBaseType(intersectionMember, type2, checker);
            if (commonType) {
                return commonType;
            }
        }
    }
    
    if (type2.flags & TypeFlags.Intersection) {
        const intersectionType = type2 as any;
        for (const intersectionMember of intersectionType.types) {
            const commonType = findCommonBaseType(type1, intersectionMember, checker);
            if (commonType) {
                return commonType;
            }
        }
    }
    
    // Handle object types with inheritance
    if (type1.flags & TypeFlags.Object && type2.flags & TypeFlags.Object) {
        const objectType1 = type1 as any;
        const objectType2 = type2 as any;
        
        // Check if they have common base classes
        if (objectType1.baseTypes && objectType2.baseTypes) {
            for (const baseType1 of objectType1.baseTypes) {
                for (const baseType2 of objectType2.baseTypes) {
                    const commonType = findCommonBaseType(baseType1, baseType2, checker);
                    if (commonType) {
                        return commonType;
                    }
                }
            }
        }
        
        // Check if one extends the other
        if (objectType1.baseTypes) {
            for (const baseType of objectType1.baseTypes) {
                if (checker.isTypeAssignableTo(type2, baseType)) {
                    return baseType;
                }
            }
        }
        
        if (objectType2.baseTypes) {
            for (const baseType of objectType2.baseTypes) {
                if (checker.isTypeAssignableTo(type1, baseType)) {
                    return baseType;
                }
            }
        }
    }
    
    // Handle primitive types
    if (type1.flags & TypeFlags.Primitive && type2.flags & TypeFlags.Primitive) {
        // For primitive types, find the most general common type
        const primitiveTypes = [
            TypeFlags.Undefined,
            TypeFlags.Null,
            TypeFlags.Boolean,
            TypeFlags.Number,
            TypeFlags.String,
            TypeFlags.BigInt,
            TypeFlags.Symbol,
        ];
        
        const type1Index = primitiveTypes.indexOf(type1.flags);
        const type2Index = primitiveTypes.indexOf(type2.flags);
        
        if (type1Index >= 0 && type2Index >= 0) {
            // Return the more general type (higher index)
            return type1Index > type2Index ? type1 : type2;
        }
    }
    
    // Handle function types
    if (type1.flags & TypeFlags.Function && type2.flags & TypeFlags.Function) {
        const functionType1 = type1 as any;
        const functionType2 = type2 as any;
        
        // Check if they have compatible signatures
        if (functionType1.signatures && functionType2.signatures) {
            // Find compatible signatures
            for (const sig1 of functionType1.signatures) {
                for (const sig2 of functionType2.signatures) {
                    if (areSignaturesCompatible(sig1, sig2, checker)) {
                        // Return a function type with the more general signature
                        return type1; // Simplified - in practice, we'd create a new type
                    }
                }
            }
        }
    }
    
    // Handle array types
    if (type1.flags & TypeFlags.Array && type2.flags & TypeFlags.Array) {
        const arrayType1 = type1 as any;
        const arrayType2 = type2 as any;
        
        if (arrayType1.elementType && arrayType2.elementType) {
            const commonElementType = findCommonBaseType(arrayType1.elementType, arrayType2.elementType, checker);
            if (commonElementType) {
                // Return an array type with the common element type
                return type1; // Simplified - in practice, we'd create a new type
            }
        }
    }
    
    // Handle tuple types
    if (type1.flags & TypeFlags.Tuple && type2.flags & TypeFlags.Tuple) {
        const tupleType1 = type1 as any;
        const tupleType2 = type2 as any;
        
        if (tupleType1.elementTypes && tupleType2.elementTypes) {
            const minLength = Math.min(tupleType1.elementTypes.length, tupleType2.elementTypes.length);
            const commonElementTypes: Type[] = [];
            
            for (let i = 0; i < minLength; i++) {
                const commonElementType = findCommonBaseType(tupleType1.elementTypes[i], tupleType2.elementTypes[i], checker);
                if (commonElementType) {
                    commonElementTypes.push(commonElementType);
                } else {
                    break; // Incompatible tuple
                }
            }
            
            if (commonElementTypes.length === minLength) {
                // Return a tuple type with the common element types
                return type1; // Simplified - in practice, we'd create a new type
            }
        }
    }
    
    // If no common type is found, return null
    return null;
}

/**
 * Check if two function signatures are compatible
 */
function areSignaturesCompatible(sig1: any, sig2: any, checker: TypeChecker): boolean {
    // Check parameter count
    if (sig1.parameters.length !== sig2.parameters.length) {
        return false;
    }
    
    // Check parameter types
    for (let i = 0; i < sig1.parameters.length; i++) {
        const param1 = sig1.parameters[i];
        const param2 = sig2.parameters[i];
        
        if (!checker.isTypeAssignableTo(param1.type, param2.type) && 
            !checker.isTypeAssignableTo(param2.type, param1.type)) {
            return false;
        }
    }
    
    // Check return type
    if (!checker.isTypeAssignableTo(sig1.returnType, sig2.returnType) && 
        !checker.isTypeAssignableTo(sig2.returnType, sig1.returnType)) {
        return false;
    }
    
    return true;
}

/**
 * Check if two symbols are aliases
 */
function areSymbolsAliases(
    symbol1: Symbol,
    symbol2: Symbol,
    checker: TypeChecker
): boolean {
    // Check if symbols have the same declarations
    if (symbol1.declarations && symbol2.declarations) {
        for (const decl1 of symbol1.declarations) {
            for (const decl2 of symbol2.declarations) {
                if (decl1 === decl2) {
                    return true;
                }
            }
        }
    }
    
    // Check if one symbol is an alias of the other
    if (symbol1.flags & SymbolFlags.Alias) {
        const aliasedSymbol = (checker as any).getAliasedSymbol(symbol1);
        if (aliasedSymbol === symbol2) {
            return true;
        }
    }
    
    if (symbol2.flags & SymbolFlags.Alias) {
        const aliasedSymbol = (checker as any).getAliasedSymbol(symbol2);
        if (aliasedSymbol === symbol1) {
            return true;
        }
    }
    
    return false;
}

// Import the compareKinds function (this would need to be properly imported)
function compareKinds(expected: any, actual: any, checker: TypeChecker, debug: boolean): any {
    // Import the compareKindTypes function from kindComparison
    try {
        const { compareKindTypes } = require("./kindComparison.js");
        return compareKindTypes(expected, actual, checker, debug);
    } catch (error) {
        // Fallback implementation if import fails
        console.warn("Failed to import compareKindTypes, using fallback:", error);
        
        // Basic compatibility check
        if (!expected || !actual) {
            return { isCompatible: false, errors: [{ message: "Invalid kind types" }] };
        }
        
        // Check arity compatibility
        if (expected.arity !== actual.arity) {
            return { 
                isCompatible: false, 
                errors: [{ message: `Arity mismatch: expected ${expected.arity}, got ${actual.arity}` }] 
            };
        }
        
        // Check parameter kinds compatibility
        if (expected.parameterKinds && actual.parameterKinds) {
            if (expected.parameterKinds.length !== actual.parameterKinds.length) {
                return { 
                    isCompatible: false, 
                    errors: [{ message: "Parameter kind count mismatch" }] 
                };
            }
            
            for (let i = 0; i < expected.parameterKinds.length; i++) {
                if (expected.parameterKinds[i] !== actual.parameterKinds[i]) {
                    return { 
                        isCompatible: false, 
                        errors: [{ message: `Parameter kind mismatch at index ${i}` }] 
                    };
                }
            }
        }
        
        return { isCompatible: true, errors: [] };
    }
} 