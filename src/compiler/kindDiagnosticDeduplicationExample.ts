/**
 * Example: Deduplicating Constraint Propagation Diagnostics
 * 
 * This file demonstrates how to prevent spammy duplicate diagnostics
 * from propagateToParentCallSites by checking if a diagnostic already exists
 * at the same file+start+code before pushing a new one.
 */

/**
 * BEFORE: No deduplication (spammy duplicates)
 */
function addDiagnosticToCollection_BEFORE(diagnostic: any): void {
    // ❌ No deduplication - can create spammy duplicate diagnostics
    if (typeof globalThis !== 'undefined' && (globalThis as any).kindDiagnostics) {
        (globalThis as any).kindDiagnostics.push(diagnostic);
    }
    
    console.log(`[Kind] Constraint violation: ${diagnostic.message}`);
}

/**
 * AFTER: With deduplication (prevents spammy duplicates)
 */
function addDiagnosticToCollection_AFTER(diagnostic: any): void {
    // ✅ Check if diagnostic already exists at the same file+start+code
    if (typeof globalThis !== 'undefined' && (globalThis as any).kindDiagnostics) {
        const diagnostics = (globalThis as any).kindDiagnostics;
        
        const isDuplicate = diagnostics.some((d: any) => 
            d.file === diagnostic.sourceFile && 
            d.start === diagnostic.start && 
            d.code === diagnostic.code
        );
        
        if (!isDuplicate) {
            diagnostics.push(diagnostic);
        } else {
            console.log(`[Kind] Skipping duplicate diagnostic: ${diagnostic.message} at ${diagnostic.sourceFile.fileName}:${diagnostic.start}`);
        }
    }
    
    console.log(`[Kind] Constraint violation: ${diagnostic.message}`);
}

/**
 * Example: Using the deduplication helper function
 */
function addDiagnosticWithHelper(diagnostic: any): void {
    if (typeof globalThis !== 'undefined' && (globalThis as any).kindDiagnostics) {
        const diagnostics = (globalThis as any).kindDiagnostics;
        
        // Convert to proper format
        const formattedDiagnostic = {
            file: diagnostic.sourceFile,
            start: diagnostic.start,
            length: diagnostic.length,
            messageText: diagnostic.message,
            category: diagnostic.category === "Error" ? 1 : diagnostic.category === "Warning" ? 2 : 3,
            code: diagnostic.code,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        };
        
        // Use deduplication helper
        const wasAdded = addDiagnosticIfNotDuplicate(diagnostics, formattedDiagnostic);
        
        if (!wasAdded) {
            console.log(`[Kind] Skipping duplicate diagnostic: ${diagnostic.message}`);
        }
    }
}

/**
 * Example: Batch processing with deduplication
 */
function processConstraintViolations(violations: any[]): void {
    const diagnostics: any[] = [];
    
    for (const violation of violations) {
        // Create diagnostic for each violation
        const diagnostic = {
            file: violation.sourceFile,
            start: violation.start,
            length: violation.length,
            messageText: violation.message,
            category: 1, // Error
            code: violation.code,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        };
        
        // Add with deduplication
        addDiagnosticIfNotDuplicate(diagnostics, diagnostic);
    }
    
    console.log(`Processed ${violations.length} violations, added ${diagnostics.length} unique diagnostics`);
}

/**
 * Example: Validation and cleanup
 */
function validateAndCleanupDiagnostics(diagnostics: any[]): void {
    // Validate the collection
    const validation = validateDiagnosticCollection(diagnostics);
    
    console.log(`Total diagnostics: ${validation.totalCount}`);
    console.log(`Unique diagnostics: ${validation.uniqueCount}`);
    console.log(`Duplicate diagnostics: ${validation.duplicateCount}`);
    
    if (validation.duplicateCount > 0) {
        console.log("Found duplicates, cleaning up...");
        const removedCount = removeDuplicateDiagnostics(diagnostics);
        console.log(`Removed ${removedCount} duplicate diagnostics`);
    }
}

/**
 * Benefits of deduplication:
 * 1. Prevents spammy duplicate diagnostics from propagateToParentCallSites
 * 2. Reduces noise in error reporting
 * 3. Improves user experience by showing only unique errors
 * 4. Maintains diagnostic accuracy while reducing redundancy
 * 5. Better performance by avoiding duplicate processing
 */

console.log("✅ Kind diagnostic deduplication example complete!"); 