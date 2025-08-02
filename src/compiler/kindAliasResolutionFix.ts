/**
 * Kind Alias Resolution Fix
 * 
 * This module addresses two critical issues:
 * 1. Alias resolution collision risk: getAliasSymbol relies purely on symbol name matching
 * 2. Direct symbol.links writes: attachInferredKindMetadata writes to symbol.links directly
 */

import {
    Type,
    TypeChecker,
    Symbol,
    Node,
    SourceFile
} from "./types.js";

import {
    KindMetadata,
    retrieveKindMetadata
} from "./kindMetadata.js";

import { applyKindDiagnosticAlias } from "./kindDiagnosticAlias.js";

/**
 * Scope-aware alias symbol resolution
 * 
 * This function resolves alias symbols while respecting scope boundaries
 * to prevent collisions between user-defined aliases and built-in aliases.
 */
export function getAliasSymbolWithScope(
    type: Type,
    checker: TypeChecker,
    sourceFile: SourceFile
): Symbol | null {
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

    // 3. Scope-aware symbol lookup
    return findAliasSymbolInScope(type, checker, sourceFile);
}

/**
 * Find alias symbol in the current scope, respecting scope boundaries
 */
function findAliasSymbolInScope(
    type: Type,
    checker: TypeChecker,
    sourceFile: SourceFile
): Symbol | null {
    if (!type.symbol || !type.symbol.name) {
        return null;
    }

    // Get symbols in the current scope
    const scopeSymbols = checker.getSymbolsInScope
        ? checker.getSymbolsInScope(type.symbol.valueDeclaration || type.symbol.declarations?.[0], 0)
        : [];

    if (!scopeSymbols || scopeSymbols.length === 0) {
        return null;
    }

    // Find matching symbols in scope
    const matchingSymbols = scopeSymbols.filter(sym => 
        sym.name === type.symbol!.name && 
        isTypeAliasDeclaration(sym, checker)
    );

    if (matchingSymbols.length === 0) {
        return null;
    }

    if (matchingSymbols.length === 1) {
        return matchingSymbols[0];
    }

    // Multiple matching symbols found - resolve by scope precedence
    return resolveSymbolByScopePrecedence(matchingSymbols, type.symbol, sourceFile);
}

/**
 * Check if a symbol is a type alias declaration
 */
function isTypeAliasDeclaration(symbol: Symbol, checker: TypeChecker): boolean {
    if (!symbol.declarations) {
        return false;
    }

    for (const decl of symbol.declarations) {
        // SyntaxKind.TypeAliasDeclaration === 260 (hardcoded for compatibility)
        if (decl.kind === 260 || decl.kind === checker.SyntaxKind?.TypeAliasDeclaration) {
            return true;
        }
    }

    return false;
}

/**
 * Resolve symbol by scope precedence when multiple matches are found
 */
function resolveSymbolByScopePrecedence(
    matchingSymbols: Symbol[],
    targetSymbol: Symbol,
    sourceFile: SourceFile
): Symbol | null {
    // Sort by scope precedence (local > module > global)
    const sortedSymbols = matchingSymbols.sort((a, b) => {
        const aPrecedence = getScopePrecedence(a, sourceFile);
        const bPrecedence = getScopePrecedence(b, sourceFile);
        return aPrecedence - bPrecedence;
    });

    // Return the highest precedence symbol
    return sortedSymbols[0] || null;
}

/**
 * Get scope precedence for a symbol (lower number = higher precedence)
 */
function getScopePrecedence(symbol: Symbol, sourceFile: SourceFile): number {
    if (!symbol.declarations || symbol.declarations.length === 0) {
        return 999; // Lowest precedence
    }

    // Check if symbol is declared in the current file
    for (const decl of symbol.declarations) {
        if (decl.getSourceFile() === sourceFile) {
            return 0; // Highest precedence - local scope
        }
    }

    // Check if symbol is from a module
    if (symbol.declarations[0].getSourceFile().fileName.includes('node_modules')) {
        return 100; // Module scope
    }

    // Check if symbol is from stdlib
    if (isStdlibSymbol(symbol)) {
        return 50; // Stdlib scope
    }

    return 200; // Global scope
}

/**
 * Check if a symbol is from the standard library
 */
function isStdlibSymbol(symbol: Symbol): boolean {
    if (!symbol.declarations || symbol.declarations.length === 0) {
        return false;
    }

    const fileName = symbol.declarations[0].getSourceFile().fileName;
    
    // Check for stdlib patterns
    return fileName.includes('lib.') || 
           fileName.includes('ts.plus') ||
           fileName.includes('typescript/lib');
}

/**
 * Safe symbol links access using checker's internal API
 */
export function getSymbolLinksSafely(symbol: Symbol, checker: TypeChecker): any {
    // Use the checker's internal API to get symbol links
    if (checker.getSymbolLinks) {
        return checker.getSymbolLinks(symbol);
    }
    
    // Fallback to direct access (less safe but functional)
    return (symbol as any).links;
}

/**
 * Safe symbol links write using checker's internal API
 */
export function setSymbolLinksSafely(
    symbol: Symbol,
    checker: TypeChecker,
    links: any
): void {
    // Use the checker's internal API to set symbol links
    if (checker.setSymbolLinks) {
        checker.setSymbolLinks(symbol, links);
        return;
    }
    
    // Fallback to direct access (less safe but functional)
    (symbol as any).links = links;
}

/**
 * Safe kind metadata attachment using checker's internal API
 */
export function attachInferredKindMetadataSafely(
    symbol: Symbol,
    kindData: { kindArity: number; parameterKinds: Type[]; isInferred: boolean },
    checker: TypeChecker
): void {
    // Get current symbol links safely
    const links = getSymbolLinksSafely(symbol, checker);
    if (!links) {
        return;
    }
    
    // Check for existing metadata and validate consistency
    if (links.kindArity !== undefined) {
        if (links.kindArity !== kindData.kindArity) {
            // Report error about inconsistent kind arity
            console.warn(`[Kind] Inconsistent kind arity: expected ${links.kindArity}, got ${kindData.kindArity}`);
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
    
    // Write back to symbol links safely
    setSymbolLinksSafely(symbol, checker, links);
}

/**
 * Scope-aware kind alias resolution
 * 
 * This function resolves kind aliases while respecting scope boundaries
 * and preventing collisions between user-defined and built-in aliases.
 */
export function resolveKindAliasWithScope(
    type: Type,
    checker: TypeChecker,
    sourceFile: SourceFile
): { resolvedType: Type | null; isBuiltInAlias: boolean; scope: string } {
    // First, try to get the alias symbol with scope awareness
    const aliasSymbol = getAliasSymbolWithScope(type, checker, sourceFile);
    if (!aliasSymbol) {
        return { resolvedType: null, isBuiltInAlias: false, scope: 'none' };
    }

    // Check if this is a built-in alias
    const isBuiltIn = isBuiltInKindAlias(aliasSymbol);
    const scope = getSymbolScope(aliasSymbol, sourceFile);

    // Get the target type
    const targetType = getAliasTargetType(aliasSymbol, checker);
    
    return {
        resolvedType: targetType,
        isBuiltInAlias: isBuiltIn,
        scope
    };
}

/**
 * Check if a symbol is a built-in kind alias
 */
function isBuiltInKindAlias(symbol: Symbol): boolean {
    if (!symbol.declarations || symbol.declarations.length === 0) {
        return false;
    }

    // Check if the symbol is from the stdlib
    const fileName = symbol.declarations[0].getSourceFile().fileName;
    return fileName.includes('ts.plus') || fileName.includes('lib.ts.plus');
}

/**
 * Get the scope of a symbol
 */
function getSymbolScope(symbol: Symbol, sourceFile: SourceFile): string {
    if (!symbol.declarations || symbol.declarations.length === 0) {
        return 'unknown';
    }

    const decl = symbol.declarations[0];
    const declSourceFile = decl.getSourceFile();

    if (declSourceFile === sourceFile) {
        return 'local';
    }

    if (declSourceFile.fileName.includes('node_modules')) {
        return 'module';
    }

    if (isStdlibSymbol(symbol)) {
        return 'stdlib';
    }

    return 'global';
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
 * Enhanced kind metadata retrieval with scope awareness
 */
export function retrieveKindMetadataWithScope(
    symbol: Symbol,
    checker: TypeChecker,
    sourceFile: SourceFile,
    allowInference: boolean = true
): KindMetadata | null {
    // First, try to get existing metadata
    const existingMetadata = retrieveKindMetadata(symbol, checker, allowInference);
    if (existingMetadata) {
        return existingMetadata;
    }

    // If no existing metadata, check if this is a kind alias
    if (symbol.declarations && symbol.declarations.length > 0) {
        for (const decl of symbol.declarations) {
            if (decl.kind === 260 || decl.kind === checker.SyntaxKind?.TypeAliasDeclaration) {
                // This is a type alias - check if it's a kind alias
                const targetType = getAliasTargetType(symbol, checker);
                if (targetType) {
                    // Recursively get metadata from the target type
                    const targetSymbol = targetType.symbol;
                    if (targetSymbol) {
                        return retrieveKindMetadataWithScope(targetSymbol, checker, sourceFile, allowInference);
                    }
                }
            }
        }
    }

    return null;
}

/**
 * Scope-aware kind compatibility check
 * 
 * This function checks kind compatibility while respecting scope boundaries
 * and preventing false positives from scope collisions.
 */
export function checkKindCompatibilityWithScope(
    expectedKind: KindMetadata,
    actualKind: KindMetadata,
    checker: TypeChecker,
    sourceFile: SourceFile
): { isCompatible: boolean; scopeConflict: boolean; diagnostics: any[] } {
    const diagnostics: any[] = [];
    let scopeConflict = false;

    // Check if there are scope conflicts
    if (expectedKind.symbol && actualKind.symbol) {
        const expectedScope = getSymbolScope(expectedKind.symbol, sourceFile);
        const actualScope = getSymbolScope(actualKind.symbol, sourceFile);

        // If both are built-in aliases but from different scopes, there might be a conflict
        if (expectedScope === 'stdlib' && actualScope === 'stdlib' && 
            expectedKind.symbol.name === actualKind.symbol.name &&
            expectedKind.symbol !== actualKind.symbol) {
            scopeConflict = true;
            diagnostics.push({
                messageText: `Scope conflict detected: ${expectedKind.symbol.name} is defined in multiple scopes`,
                code: applyKindDiagnosticAlias(9510),
                category: 1, // Error
                source: "ts.plus"
            });
        }
    }

    // Perform the actual compatibility check
    const isCompatible = expectedKind.arity === actualKind.arity &&
                        expectedKind.parameterKinds.length === actualKind.parameterKinds.length;

    if (!isCompatible) {
        diagnostics.push({
            messageText: `Kind compatibility error: expected arity ${expectedKind.arity}, got ${actualKind.arity}`,
            code: applyKindDiagnosticAlias(9511),
            category: 1, // Error
            source: "ts.plus"
        });
    }

    return { isCompatible, scopeConflict, diagnostics };
} 