/**
 * Heritage symbol helper functions for kind validation
 * 
 * This module provides consolidated functions for handling heritage clause symbol resolution
 * in both extends and implements contexts.
 */

import {
    Symbol,
    TypeChecker,
    SyntaxKind,
    HeritageClause,
    ExpressionWithTypeArguments,
    ClassLikeDeclaration,
    InterfaceDeclaration
} from "./types.js";

/**
 * Get the related heritage symbol based on clause kind
 * 
 * This consolidated function replaces separate getSubclassSymbol and getImplementingSymbol functions
 * by using shared AST walk logic and determining behavior based on the clause kind.
 * 
 * @param symbol - The base symbol (class/interface)
 * @param clauseKind - The heritage clause kind (ExtendsKeyword or ImplementsKeyword)
 * @param checker - The type checker instance
 * @returns The related symbol from the heritage clause
 */
export function getRelatedHeritageSymbol(
    symbol: Symbol, 
    clauseKind: SyntaxKind, 
    checker: TypeChecker
): Symbol | undefined {
    // Validate clause kind
    if (clauseKind !== SyntaxKind.ExtendsKeyword && clauseKind !== SyntaxKind.ImplementsKeyword) {
        return undefined;
    }
    
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
 * Get subclass symbol (extends relationship)
 * 
 * @param symbol - The base symbol (class/interface)
 * @param checker - The type checker instance
 * @returns The subclass symbol from the extends clause
 */
export function getSubclassSymbol(symbol: Symbol, checker: TypeChecker): Symbol | undefined {
    return getRelatedHeritageSymbol(symbol, SyntaxKind.ExtendsKeyword, checker);
}

/**
 * Get implementing symbol (implements relationship)
 * 
 * @param symbol - The base symbol (class)
 * @param checker - The type checker instance
 * @returns The implementing symbol from the implements clause
 */
export function getImplementingSymbol(symbol: Symbol, checker: TypeChecker): Symbol | undefined {
    return getRelatedHeritageSymbol(symbol, SyntaxKind.ImplementsKeyword, checker);
}

/**
 * Get all heritage symbols for a given symbol
 * 
 * @param symbol - The base symbol (class/interface)
 * @param checker - The type checker instance
 * @returns Object containing both extends and implements symbols
 */
export function getAllHeritageSymbols(
    symbol: Symbol, 
    checker: TypeChecker
): { extends?: Symbol; implements?: Symbol } {
    return {
        extends: getSubclassSymbol(symbol, checker),
        implements: getImplementingSymbol(symbol, checker)
    };
}

/**
 * Check if a symbol has heritage relationships
 * 
 * @param symbol - The base symbol (class/interface)
 * @param checker - The type checker instance
 * @returns True if the symbol has any heritage clauses
 */
export function hasHeritageRelationships(symbol: Symbol, checker: TypeChecker): boolean {
    const heritageSymbols = getAllHeritageSymbols(symbol, checker);
    return !!(heritageSymbols.extends || heritageSymbols.implements);
}

/**
 * Get heritage clause by kind for a symbol
 * 
 * @param symbol - The base symbol (class/interface)
 * @param clauseKind - The heritage clause kind
 * @returns The heritage clause or undefined
 */
export function getHeritageClauseByKind(
    symbol: Symbol, 
    clauseKind: SyntaxKind
): HeritageClause | undefined {
    if (clauseKind !== SyntaxKind.ExtendsKeyword && clauseKind !== SyntaxKind.ImplementsKeyword) {
        return undefined;
    }
    
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return undefined;
    }
    
    const declaration = declarations[0];
    if (!declaration.heritageClauses) {
        return undefined;
    }
    
    return declaration.heritageClauses.find(clause => clause.token === clauseKind);
}

/**
 * Get all type references from a heritage clause
 * 
 * @param symbol - The base symbol (class/interface)
 * @param clauseKind - The heritage clause kind
 * @param checker - The type checker instance
 * @returns Array of type references with their resolved symbols
 */
export function getHeritageTypeReferences(
    symbol: Symbol,
    clauseKind: SyntaxKind,
    checker: TypeChecker
): Array<{ typeRef: ExpressionWithTypeArguments; symbol: Symbol | undefined }> {
    const heritageClause = getHeritageClauseByKind(symbol, clauseKind);
    if (!heritageClause) {
        return [];
    }
    
    return heritageClause.types.map(typeRef => ({
        typeRef,
        symbol: checker.getTypeFromTypeNode(typeRef.expression).symbol
    }));
} 