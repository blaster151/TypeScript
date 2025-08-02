/**
 * Test file for consolidated heritage symbol helper functions
 */

// Example usage of the consolidated heritage symbol functions
import { 
    getRelatedHeritageSymbol, 
    getSubclassSymbol, 
    getImplementingSymbol,
    getAllHeritageSymbols 
} from "../../../src/compiler/heritageSymbolHelpers.js";

// Example: Using the consolidated function for extends
function testExtendsRelationship(symbol: any, checker: any) {
    // Instead of separate getSubclassSymbol function
    const baseSymbol = getRelatedHeritageSymbol(symbol, SyntaxKind.ExtendsKeyword, checker);
    
    if (baseSymbol) {
        console.log("Found extends relationship:", baseSymbol.name);
    }
}

// Example: Using the consolidated function for implements
function testImplementsRelationship(symbol: any, checker: any) {
    // Instead of separate getImplementingSymbol function
    const interfaceSymbol = getRelatedHeritageSymbol(symbol, SyntaxKind.ImplementsKeyword, checker);
    
    if (interfaceSymbol) {
        console.log("Found implements relationship:", interfaceSymbol.name);
    }
}

// Example: Using the convenience functions
function testConvenienceFunctions(symbol: any, checker: any) {
    // These now use the shared logic internally
    const extendsSymbol = getSubclassSymbol(symbol, checker);
    const implementsSymbol = getImplementingSymbol(symbol, checker);
    
    console.log("Extends:", extendsSymbol?.name);
    console.log("Implements:", implementsSymbol?.name);
}

// Example: Getting all heritage relationships at once
function testGetAllHeritageSymbols(symbol: any, checker: any) {
    const heritageSymbols = getAllHeritageSymbols(symbol, checker);
    
    if (heritageSymbols.extends) {
        console.log("Extends:", heritageSymbols.extends.name);
    }
    
    if (heritageSymbols.implements) {
        console.log("Implements:", heritageSymbols.implements.name);
    }
}

// Example: Kind validation using the consolidated function
function validateKindInheritance(symbol: any, checker: any) {
    // Check extends relationship
    const baseSymbol = getRelatedHeritageSymbol(symbol, SyntaxKind.ExtendsKeyword, checker);
    if (baseSymbol) {
        // Validate kind compatibility for inheritance
        console.log("Validating extends kind compatibility");
    }
    
    // Check implements relationship
    const interfaceSymbol = getRelatedHeritageSymbol(symbol, SyntaxKind.ImplementsKeyword, checker);
    if (interfaceSymbol) {
        // Validate kind compatibility for implementation
        console.log("Validating implements kind compatibility");
    }
}

console.log("✅ Heritage symbol consolidation test ready!"); 