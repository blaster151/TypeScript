/**
 * Example: Using TypeScript Internals for Line/Character Mapping
 * 
 * This file demonstrates replacing custom getLineStarts/binarySearch implementations
 * with TypeScript's internal getLineAndCharacterOfPosition API.
 */

/**
 * BEFORE: Custom implementation (incorrect)
 * 
 * ❌ This custom implementation might not match TS CLI/editor exactly
 */
function getLineAndCharacter_CUSTOM(sourceFile: any, position: number) {
    // Custom getLineStarts/binarySearch implementation
    const lineStarts = sourceFile.getLineStarts();
    const lineNumber = binarySearch(lineStarts, position, identity, compareValues, lowerBound);
    const character = position - lineStarts[lineNumber];
    return { line: lineNumber, character };
}

/**
 * AFTER: Using TypeScript internals (correct)
 * 
 * ✅ This ensures diagnostics line/char match TS CLI/editor exactly
 */
function getLineAndCharacter_TS_INTERNALS(sourceFile: any, position: number) {
    // Use TypeScript's internal API
    return sourceFile.getLineAndCharacterOfPosition(position);
}

/**
 * Example: Creating diagnostics with proper position mapping
 */
function createKindDiagnostic(node: any, sourceFile: any, message: string) {
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

/**
 * Example: Helper function for consistent position mapping
 */
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

/**
 * Benefits of using TypeScript internals:
 * 1. Exact match with TS CLI/editor line/character positions
 * 2. No need to maintain custom getLineStarts/binarySearch logic
 * 3. Automatic updates when TypeScript's position mapping changes
 * 4. Consistent behavior across all diagnostic creation
 * 5. Better performance (optimized internal implementation)
 */

console.log("✅ TypeScript internals position mapping example complete!"); 