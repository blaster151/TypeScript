/**
 * Test file for TypeScript internals line/character mapping
 * 
 * This file demonstrates the correct usage of TypeScript's internal
 * getLineAndCharacterOfPosition API for consistent diagnostic positioning.
 */

// Example: Using TypeScript internals for line/character mapping
function testTypeScriptInternalsPositionMapping() {
    // BEFORE: Custom getLineStarts/binarySearch implementation (incorrect)
    function getLineAndCharacter_CUSTOM(sourceFile: any, position: number) {
        // ❌ Custom implementation that might not match TS CLI/editor
        const lineStarts = sourceFile.getLineStarts();
        const lineNumber = binarySearch(lineStarts, position, identity, compareValues, lowerBound);
        const character = position - lineStarts[lineNumber];
        return { line: lineNumber, character };
    }
    
    // AFTER: Using TypeScript internals (correct)
    function getLineAndCharacter_TS_INTERNALS(sourceFile: any, position: number) {
        // ✅ Use TypeScript's internal API for exact match with TS CLI/editor
        return sourceFile.getLineAndCharacterOfPosition(position);
    }
    
    console.log("✅ TypeScript internals position mapping test ready!");
}

// Example: Creating diagnostics with proper position mapping
function createDiagnosticWithTSInternals(node: any, sourceFile: any, message: string) {
    const start = node.getStart(sourceFile);
    const length = node.getWidth(sourceFile);
    
    // Use TypeScript internals for line/character mapping
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
    
    return {
        file: sourceFile,
        start,
        length,
        messageText: message,
        category: 1, // Error
        code: 9501,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        line,
        column: character
    };
}

// Example: Helper function for consistent position mapping
function getNodePositionInfo(node: any, sourceFile: any) {
    const start = node.getStart(sourceFile);
    const length = node.getWidth(sourceFile);
    
    // Use TypeScript internals
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
    
    return {
        start,
        length,
        line: lineAndChar.line,
        column: lineAndChar.character
    };
}

console.log("✅ TypeScript internals position mapping examples complete!"); 