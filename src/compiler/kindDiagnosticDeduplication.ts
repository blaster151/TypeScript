/**
 * Diagnostic deduplication utilities for kind constraint propagation
 * 
 * This module provides functions to prevent spammy duplicate diagnostics
 * from propagateToParentCallSites by checking if a diagnostic already exists
 * at the same file+start+code before pushing a new one.
 */

import {
    SourceFile,
    DiagnosticWithLocation
} from "./types.js";

/**
 * Check if a diagnostic already exists in the collection
 * 
 * @param diagnostics - The diagnostic collection to check
 * @param newDiagnostic - The new diagnostic to check for duplicates
 * @returns True if a duplicate diagnostic exists
 */
export function isDuplicateDiagnostic(
    diagnostics: DiagnosticWithLocation[],
    newDiagnostic: DiagnosticWithLocation
): boolean {
    return diagnostics.some(d => 
        d.file === newDiagnostic.file && 
        d.start === newDiagnostic.start && 
        d.code === newDiagnostic.code
    );
}

/**
 * Add a diagnostic to the collection only if it's not a duplicate
 * 
 * @param diagnostics - The diagnostic collection to add to
 * @param newDiagnostic - The new diagnostic to add
 * @returns True if the diagnostic was added, false if it was a duplicate
 */
export function addDiagnosticIfNotDuplicate(
    diagnostics: DiagnosticWithLocation[],
    newDiagnostic: DiagnosticWithLocation
): boolean {
    if (isDuplicateDiagnostic(diagnostics, newDiagnostic)) {
        console.log(`[Kind] Skipping duplicate diagnostic: ${newDiagnostic.messageText} at ${newDiagnostic.file.fileName}:${newDiagnostic.start}`);
        return false;
    }
    
    diagnostics.push(newDiagnostic);
    return true;
}

/**
 * Create a diagnostic with deduplication check
 * 
 * @param diagnostics - The diagnostic collection to add to
 * @param file - The source file
 * @param start - The start position
 * @param length - The length
 * @param messageText - The diagnostic message
 * @param category - The diagnostic category
 * @param code - The diagnostic code
 * @param source - The diagnostic source
 * @returns True if the diagnostic was added, false if it was a duplicate
 */
export function createAndAddDiagnosticWithDeduplication(
    diagnostics: DiagnosticWithLocation[],
    file: SourceFile,
    start: number,
    length: number,
    messageText: string,
    category: number,
    code: number,
    source: string = "ts.plus"
): boolean {
    const diagnostic: DiagnosticWithLocation = {
        file,
        start,
        length,
        messageText,
        category,
        code,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source
    };
    
    return addDiagnosticIfNotDuplicate(diagnostics, diagnostic);
}

/**
 * Batch add diagnostics with deduplication
 * 
 * @param diagnostics - The diagnostic collection to add to
 * @param newDiagnostics - Array of new diagnostics to add
 * @returns Number of diagnostics actually added (excluding duplicates)
 */
export function addDiagnosticsWithDeduplication(
    diagnostics: DiagnosticWithLocation[],
    newDiagnostics: DiagnosticWithLocation[]
): number {
    let addedCount = 0;
    
    for (const newDiagnostic of newDiagnostics) {
        if (addDiagnosticIfNotDuplicate(diagnostics, newDiagnostic)) {
            addedCount++;
        }
    }
    
    return addedCount;
}

/**
 * Get duplicate diagnostics from a collection
 * 
 * @param diagnostics - The diagnostic collection to check
 * @returns Array of duplicate diagnostics
 */
export function getDuplicateDiagnostics(
    diagnostics: DiagnosticWithLocation[]
): DiagnosticWithLocation[] {
    const duplicates: DiagnosticWithLocation[] = [];
    const seen = new Set<string>();
    
    for (const diagnostic of diagnostics) {
        const key = `${diagnostic.file.fileName}:${diagnostic.start}:${diagnostic.code}`;
        
        if (seen.has(key)) {
            duplicates.push(diagnostic);
        } else {
            seen.add(key);
        }
    }
    
    return duplicates;
}

/**
 * Remove duplicate diagnostics from a collection
 * 
 * @param diagnostics - The diagnostic collection to deduplicate
 * @returns Number of duplicates removed
 */
export function removeDuplicateDiagnostics(
    diagnostics: DiagnosticWithLocation[]
): number {
    const originalLength = diagnostics.length;
    const seen = new Set<string>();
    
    // Filter out duplicates
    const uniqueDiagnostics = diagnostics.filter(diagnostic => {
        const key = `${diagnostic.file.fileName}:${diagnostic.start}:${diagnostic.code}`;
        
        if (seen.has(key)) {
            return false; // Remove duplicate
        } else {
            seen.add(key);
            return true; // Keep unique
        }
    });
    
    // Replace the original array with unique diagnostics
    diagnostics.length = 0;
    diagnostics.push(...uniqueDiagnostics);
    
    return originalLength - diagnostics.length;
}

/**
 * Validate diagnostic collection for duplicates
 * 
 * @param diagnostics - The diagnostic collection to validate
 * @returns Object with validation results
 */
export function validateDiagnosticCollection(
    diagnostics: DiagnosticWithLocation[]
): {
    totalCount: number;
    duplicateCount: number;
    uniqueCount: number;
    duplicates: DiagnosticWithLocation[];
} {
    const duplicates = getDuplicateDiagnostics(diagnostics);
    const uniqueCount = diagnostics.length - duplicates.length;
    
    return {
        totalCount: diagnostics.length,
        duplicateCount: duplicates.length,
        uniqueCount,
        duplicates
    };
} 