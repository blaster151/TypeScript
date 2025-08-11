// ARCHIVED: compiler-side experiment for kind/HKT toolchain (not used by live code)
import {
    Type,
    TypeChecker,
    Symbol,
    TypeAliasDeclaration,
    TypeReferenceNode,
    TypeNode,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";

/**
 * Result of alias resolution
 */
export interface AliasResolutionResult {
    isResolved: boolean;
    resolvedType: Type | undefined;
    originalType: Type;
    resolutionChain: Type[];
    hasInfiniteLoop: boolean;
    errorMessage?: string;
}

/**
 * Resolve kind aliases for comparison
 */
export function resolveKindAliases(
    expectedKind: KindMetadata,
    actualKind: KindMetadata,
    checker: TypeChecker,
    debugMode: boolean = false
): { isResolved: boolean; errors: any[]; warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (debugMode) {
        console.log(`[Kind] Resolving aliases for kind comparison`);
    }

    // Resolve expected kind aliases
    const expectedResolution = resolveTypeAliases(expectedKind, checker, debugMode);
    if (!expectedResolution.isResolved) {
        errors.push({
            code: "AliasResolutionFailed",
            message: `Failed to resolve aliases for expected kind: ${expectedResolution.errorMessage}`,
            originalType: expectedResolution.originalType
        });
    }

    // Resolve actual kind aliases
    const actualResolution = resolveTypeAliases(actualKind, checker, debugMode);
    if (!actualResolution.isResolved) {
        errors.push({
            code: "AliasResolutionFailed",
            message: `Failed to resolve aliases for actual kind: ${actualResolution.errorMessage}`,
            originalType: actualResolution.originalType
        });
    }

    // Check for infinite loops
    if (expectedResolution.hasInfiniteLoop || actualResolution.hasInfiniteLoop) {
        errors.push({
            code: "InfiniteAliasLoop",
            message: "Infinite loop detected during alias resolution",
            expectedChain: expectedResolution.resolutionChain,
            actualChain: actualResolution.resolutionChain
        });
    }

    // Normalize representations if both resolved successfully
    if (expectedResolution.isResolved && actualResolution.isResolved) {
        const normalizedExpected = normalizeKindRepresentation(expectedResolution.resolvedType!, checker, debugMode);
        const normalizedActual = normalizeKindRepresentation(actualResolution.resolvedType!, checker, debugMode);

        if (debugMode) {
            console.log(`[Kind] Normalized representations: expected=${normalizedExpected}, actual=${normalizedActual}`);
        }

        // Compare normalized representations
        const comparisonResult = compareNormalizedKinds(normalizedExpected, normalizedActual, checker, debugMode);
        if (comparisonResult.isCompatible) {
            warnings.push({
                code: "AliasResolvedCompatible",
                message: "Kinds are compatible after alias resolution"
            });
        } else {
            errors.push({
                code: "AliasResolvedIncompatible",
                message: "Kinds remain incompatible after alias resolution",
                expected: normalizedExpected,
                actual: normalizedActual
            });
        }
    }

    const isResolved = errors.length === 0;
    return { isResolved, errors, warnings };
}

/**
 * Resolve type aliases for a kind metadata
 */
function resolveTypeAliases(
    kindMetadata: KindMetadata,
    checker: TypeChecker,
    debugMode: boolean
): AliasResolutionResult {
    const resolutionChain: Type[] = [];
    const seenTypes = new Set<Type>();

    let currentType: Type = kindMetadata.symbol as any; // Simplified - in practice, you'd get the actual type
    let hasInfiniteLoop = false;

    while (currentType) {
        // Check for infinite loop
        if (seenTypes.has(currentType)) {
            hasInfiniteLoop = true;
            break;
        }
        seenTypes.add(currentType);
        resolutionChain.push(currentType);

        // Check if current type is an alias
        const aliasSymbol = getAliasSymbol(currentType, checker);
        if (!aliasSymbol) {
            break; // Not an alias, stop resolution
        }

        // Get the target type of the alias
        const targetType = getAliasTargetType(aliasSymbol, checker);
        if (!targetType) {
            break; // Cannot resolve target, stop
        }

        currentType = targetType;
    }

    const isResolved = !hasInfiniteLoop && resolutionChain.length > 1;
    const resolvedType = isResolved ? currentType : undefined;

    if (debugMode) {
        console.log(`[Kind] Alias resolution: resolved=${isResolved}, chainLength=${resolutionChain.length}, infiniteLoop=${hasInfiniteLoop}`);
    }

    return {
        isResolved,
        resolvedType,
        originalType: kindMetadata.symbol as any,
        resolutionChain,
        hasInfiniteLoop,
        errorMessage: hasInfiniteLoop ? "Infinite loop detected" : undefined
    };
}

/**
 * Get the alias symbol for a type
 */
function getAliasSymbol(type: Type, checker: TypeChecker): Symbol | null {
    // 1. If the type has an aliasSymbol property, return it
    if ("aliasSymbol" in type && type.aliasSymbol) {
        return type.aliasSymbol;
    }

    // 2. If the type has a symbol, check if it's a type alias declaration
    if (type.symbol) {
        const symbol = type.symbol;
        if (symbol.declarations) {
            for (const decl of symbol.declarations) {
                // SyntaxKind.TypeAliasDeclaration === 260 (hardcoded for compatibility)
                if (decl.kind === 260 || decl.kind === checker.SyntaxKind?.TypeAliasDeclaration) {
                    return symbol;
                }
            }
        }
    }

    // 3. Try to look up the symbol in the checker by name (fallback)
    if (type.symbol && type.symbol.name) {
        const globalSymbol = checker.getSymbolsInScope
            ? checker.getSymbolsInScope(type.symbol.valueDeclaration || type.symbol.declarations?.[0], 0)
            : undefined;
        if (globalSymbol) {
            for (const sym of globalSymbol) {
                if (sym.name === type.symbol.name && sym.declarations) {
                    for (const decl of sym.declarations) {
                        if (decl.kind === 260 || decl.kind === checker.SyntaxKind?.TypeAliasDeclaration) {
                            return sym;
                        }
                    }
                }
            }
        }
    }

    // Not a type alias
    return null;
}

/**
 * Get the target type of an alias symbol
 */
function getAliasTargetType(aliasSymbol: Symbol, checker: TypeChecker): Type | null {
    if (!aliasSymbol.declarations || aliasSymbol.declarations.length === 0) {
        return null;
    }
    // Find the first TypeAliasDeclaration
    for (const decl of aliasSymbol.declarations) {
        // SyntaxKind.TypeAliasDeclaration === 260 (hardcoded for compatibility)
        if (decl.kind === 260 || decl.kind === checker.SyntaxKind?.TypeAliasDeclaration) {
            // The declaration should have a 'type' property
            const typeNode = (decl as any).type;
            if (typeNode) {
                return checker.getTypeFromTypeNode(typeNode);
            }
        }
    }
    return null;
}

/**
 * Normalize kind representation for comparison
 */
function normalizeKindRepresentation(
    type: Type,
    checker: TypeChecker,
    debugMode: boolean
): Type {
    // Strip unnecessary metadata and ensure canonical form for comparison
    if (debugMode) {
        console.log(`[Kind] Normalizing representation for type`);
    }

    // For kind types, we want to normalize to a canonical form
    // This involves removing any alias references and getting the base type
    if (type.flags & 0x80000000) { // TypeFlags.Kind
        // If it's a kind type, try to expand any aliases to get the canonical form
        const expanded = expandKindAlias(type, checker, 1);
        if (expanded.wasExpanded) {
            return expanded.expandedType;
        }
    }

    // For non-kind types, return as-is
    return type;
}

/**
 * Compare normalized kind representations
 */
function compareNormalizedKinds(
    expected: Type,
    actual: Type,
    checker: TypeChecker,
    debugMode: boolean
): { isCompatible: boolean; errors: any[] } {
    const errors: any[] = [];

    if (debugMode) {
        console.log(`[Kind] Comparing normalized kinds`);
    }

    // Compare the structural properties of the types
    // For kind types, compare arity and parameter kinds
    if ((expected.flags & 0x80000000) && (actual.flags & 0x80000000)) {
        // Both are kind types - compare their structure
        const expectedKind = expected as any;
        const actualKind = actual as any;
        
        if (expectedKind.kindArity !== actualKind.kindArity) {
            errors.push({
                code: "KindArityMismatch",
                message: `Kind arity mismatch: expected ${expectedKind.kindArity}, got ${actualKind.kindArity}`,
                expected: expectedKind.kindArity,
                actual: actualKind.kindArity
            });
        }
        
        // Compare parameter kinds if they exist
        if (expectedKind.parameterKinds && actualKind.parameterKinds) {
            if (expectedKind.parameterKinds.length !== actualKind.parameterKinds.length) {
                errors.push({
                    code: "KindParameterCountMismatch",
                    message: `Kind parameter count mismatch: expected ${expectedKind.parameterKinds.length}, got ${actualKind.parameterKinds.length}`,
                    expected: expectedKind.parameterKinds.length,
                    actual: actualKind.parameterKinds.length
                });
            } else {
                // Compare each parameter kind
                for (let i = 0; i < expectedKind.parameterKinds.length; i++) {
                    const expectedParam = expectedKind.parameterKinds[i];
                    const actualParam = actualKind.parameterKinds[i];
                    
                    if (!checker.isTypeAssignableTo(actualParam, expectedParam)) {
                        errors.push({
                            code: "KindParameterTypeMismatch",
                            message: `Kind parameter ${i} type mismatch`,
                            expected: expectedParam,
                            actual: actualParam,
                            parameterIndex: i
                        });
                    }
                }
            }
        }
    } else if (expected.flags & 0x80000000 || actual.flags & 0x80000000) {
        // One is a kind type, the other isn't
        errors.push({
            code: "KindTypeMismatch",
            message: "One type is a kind, the other is not",
            expected: expected.flags & 0x80000000 ? "Kind" : "Type",
            actual: actual.flags & 0x80000000 ? "Kind" : "Type"
        });
    } else {
        // Neither is a kind type - use standard type compatibility
        if (!checker.isTypeAssignableTo(actual, expected)) {
            errors.push({
                code: "TypeMismatch",
                message: "Types are not assignable",
                expected,
                actual
            });
        }
    }

    return { isCompatible: errors.length === 0, errors };
}

/**
 * Check if a type is a kind alias
 */
export function isKindAlias(type: Type, checker: TypeChecker): boolean {
    const aliasSymbol = getAliasSymbol(type, checker);
    if (!aliasSymbol) {
        return false;
    }

    const targetType = getAliasTargetType(aliasSymbol, checker);
    if (!targetType) {
        return false;
    }

    // Check if the target type is a kind type
    return !!(targetType.flags & 0x80000000); // TypeFlags.Kind
}

/**
 * Expand kind alias to its canonical form
 */
export function expandKindAlias(
    type: Type,
    checker: TypeChecker,
    maxDepth: number = 10
): { expandedType: Type; depth: number; wasExpanded: boolean } {
    let currentType = type;
    let depth = 0;
    let wasExpanded = false;

    while (depth < maxDepth && isKindAlias(currentType, checker)) {
        const aliasSymbol = getAliasSymbol(currentType, checker);
        if (!aliasSymbol) {
            break;
        }

        const targetType = getAliasTargetType(aliasSymbol, checker);
        if (!targetType) {
            break;
        }

        currentType = targetType;
        depth++;
        wasExpanded = true;
    }

    return {
        expandedType: currentType,
        depth,
        wasExpanded
    };
}

/**
 * Create a canonical representation of a kind
 */
export function createCanonicalKindRepresentation(
    type: Type,
    checker: TypeChecker
): Type {
    // 1. Expand all aliases
    const expansion = expandKindAlias(type, checker);
    const expandedType = expansion.expandedType;
    
    // 2. Normalize the representation
    const normalizedType = normalizeKindRepresentation(expandedType, checker, false);
    
    // 3. Create a canonical form that can be compared
    return createCanonicalForm(normalizedType, checker);
}

/**
 * Create a canonical form of a type for comparison
 */
function createCanonicalForm(type: Type, checker: TypeChecker): Type {
    // For kind types, create a standardized representation
    if (type.flags & 0x80000000) { // TypeFlags.Kind
        const kindType = type as any;
        
        // Create a canonical kind with sorted parameter kinds
        const canonicalParameterKinds = kindType.parameterKinds ? 
            [...kindType.parameterKinds].sort((a: Type, b: Type) => {
                // Sort by type name or symbol ID for consistency
                const aName = (a.symbol as any)?.name || '';
                const bName = (b.symbol as any)?.name || '';
                return aName.localeCompare(bName);
            }) : [];
        
        // Return a new kind type with canonical parameters
        return {
            ...kindType,
            parameterKinds: canonicalParameterKinds,
            canonical: true
        } as Type;
    }
    
    // For non-kind types, return as-is
    return type;
} 