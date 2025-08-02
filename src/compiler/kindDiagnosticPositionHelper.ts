/**
 * Helper functions for kind diagnostic position mapping using TypeScript internals
 * 
 * This module ensures that all kind-related diagnostics use TypeScript's internal
 * getLineAndCharacterOfPosition API for consistent line/character mapping with TS CLI/editor.
 */

import {
    SourceFile,
    Node,
    DiagnosticWithLocation,
    LineAndCharacter
} from "./types.js";

/**
 * Get line and character position using TypeScript internals
 * 
 * This replaces any custom getLineStarts/binarySearch implementations with
 * TypeScript's internal getLineAndCharacterOfPosition API to ensure diagnostics
 * line/character match TS CLI/editor exactly.
 * 
 * @param sourceFile - The source file
 * @param position - The position in the file
 * @returns Line and character information
 */
export function getLineAndCharacterOfPosition(
    sourceFile: SourceFile, 
    position: number
): LineAndCharacter {
    return sourceFile.getLineAndCharacterOfPosition(position);
}

/**
 * Create a diagnostic with proper line/character mapping using TypeScript internals
 * 
 * @param node - The node for the diagnostic
 * @param sourceFile - The source file
 * @param messageText - The diagnostic message
 * @param category - The diagnostic category (1 = Error, 2 = Warning, 3 = Suggestion)
 * @param code - The diagnostic code
 * @param source - The diagnostic source
 * @returns Diagnostic with proper position mapping
 */
export function createKindDiagnosticWithPosition(
    node: Node,
    sourceFile: SourceFile,
    messageText: string,
    category: number,
    code: number,
    source: string = "ts.plus"
): DiagnosticWithLocation {
    const start = node.getStart(sourceFile);
    const length = node.getWidth(sourceFile);
    
    // Use TypeScript internals for line/character mapping
    const lineAndChar = getLineAndCharacterOfPosition(sourceFile, start);
    
    return {
        file: sourceFile,
        start,
        length,
        messageText,
        category,
        code,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source,
        line: lineAndChar.line,
        column: lineAndChar.character
    };
}

/**
 * Create a diagnostic with custom position using TypeScript internals
 * 
 * @param sourceFile - The source file
 * @param start - The start position
 * @param length - The length
 * @param messageText - The diagnostic message
 * @param category - The diagnostic category
 * @param code - The diagnostic code
 * @param source - The diagnostic source
 * @returns Diagnostic with proper position mapping
 */
export function createKindDiagnosticWithCustomPosition(
    sourceFile: SourceFile,
    start: number,
    length: number,
    messageText: string,
    category: number,
    code: number,
    source: string = "ts.plus"
): DiagnosticWithLocation {
    // Use TypeScript internals for line/character mapping
    const lineAndChar = getLineAndCharacterOfPosition(sourceFile, start);
    
    return {
        file: sourceFile,
        start,
        length,
        messageText,
        category,
        code,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source,
        line: lineAndChar.line,
        column: lineAndChar.character
    };
}

/**
 * Get line and character information for a node using TypeScript internals
 * 
 * @param node - The node
 * @param sourceFile - The source file
 * @returns Line and character information
 */
export function getNodeLineAndCharacter(
    node: Node,
    sourceFile: SourceFile
): LineAndCharacter {
    const start = node.getStart(sourceFile);
    return getLineAndCharacterOfPosition(sourceFile, start);
}

/**
 * Get line and character information for a position using TypeScript internals
 * 
 * @param sourceFile - The source file
 * @param position - The position
 * @returns Line and character information
 */
export function getPositionLineAndCharacter(
    sourceFile: SourceFile,
    position: number
): LineAndCharacter {
    return getLineAndCharacterOfPosition(sourceFile, position);
}

/**
 * Validate that a diagnostic uses TypeScript internals for position mapping
 * 
 * @param diagnostic - The diagnostic to validate
 * @param sourceFile - The source file
 * @returns True if the diagnostic uses proper position mapping
 */
export function validateDiagnosticPositionMapping(
    diagnostic: DiagnosticWithLocation,
    sourceFile: SourceFile
): boolean {
    if (diagnostic.line === undefined || diagnostic.column === undefined) {
        return false;
    }
    
    // Verify that the line/character matches what TypeScript internals would produce
    const expectedLineAndChar = getLineAndCharacterOfPosition(sourceFile, diagnostic.start);
    return diagnostic.line === expectedLineAndChar.line && diagnostic.column === expectedLineAndChar.character;
} 