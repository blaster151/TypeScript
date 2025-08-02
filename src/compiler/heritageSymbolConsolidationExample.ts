/**
 * Example: Consolidating getSubclassSymbol & getImplementingSymbol
 * 
 * This file demonstrates how to consolidate separate heritage symbol functions
 * into a single helper function that uses shared AST walk logic.
 */

/**
 * BEFORE: Separate functions with duplicated logic
 */
function getSubclassSymbol_OLD(symbol: any, checker: any): any {
    // Duplicated AST walk logic
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return undefined;
    }
    
    const declaration = declarations[0];
    if (!declaration.heritageClauses) {
        return undefined;
    }
    
    // Find extends clause specifically
    const heritageClause = declaration.heritageClauses.find(clause => clause.token === 'ExtendsKeyword');
    if (!heritageClause || heritageClause.types.length === 0) {
        return undefined;
    }
    
    const typeRef = heritageClause.types[0];
    const baseType = checker.getTypeFromTypeNode(typeRef.expression);
    return baseType.symbol;
}

function getImplementingSymbol_OLD(symbol: any, checker: any): any {
    // Duplicated AST walk logic
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return undefined;
    }
    
    const declaration = declarations[0];
    if (!declaration.heritageClauses) {
        return undefined;
    }
    
    // Find implements clause specifically
    const heritageClause = declaration.heritageClauses.find(clause => clause.token === 'ImplementsKeyword');
    if (!heritageClause || heritageClause.types.length === 0) {
        return undefined;
    }
    
    const typeRef = heritageClause.types[0];
    const baseType = checker.getTypeFromTypeNode(typeRef.expression);
    return baseType.symbol;
}

/**
 * AFTER: Consolidated function with shared logic
 */
function getRelatedHeritageSymbol(symbol: any, clauseKind: string, checker: any): any {
    // Shared AST walk logic
    const declarations = symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return undefined;
    }
    
    const declaration = declarations[0];
    if (!declaration.heritageClauses) {
        return undefined;
    }
    
    // Find heritage clause by kind (extends or implements)
    const heritageClause = declaration.heritageClauses.find(clause => clause.token === clauseKind);
    if (!heritageClause || heritageClause.types.length === 0) {
        return undefined;
    }
    
    const typeRef = heritageClause.types[0];
    const baseType = checker.getTypeFromTypeNode(typeRef.expression);
    return baseType.symbol;
}

/**
 * Usage examples:
 */
function exampleUsage() {
    // Call with ExtendsKeyword for subclasses
    const subclassSymbol = getRelatedHeritageSymbol(symbol, 'ExtendsKeyword', checker);
    
    // Call with ImplementsKeyword for implements
    const implementingSymbol = getRelatedHeritageSymbol(symbol, 'ImplementsKeyword', checker);
    
    console.log("Consolidated heritage symbol resolution complete!");
}

/**
 * Benefits of consolidation:
 * 1. Eliminates code duplication
 * 2. Single point of maintenance for AST walk logic
 * 3. Consistent behavior across extends and implements
 * 4. Easier to extend for new heritage clause types
 * 5. Better testability with shared logic
 */ 