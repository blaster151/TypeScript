/**
 * Test file for kind diagnostic deduplication
 * 
 * This file demonstrates how deduplication prevents spammy duplicate diagnostics
 * from propagateToParentCallSites.
 */

import { 
    addDiagnosticIfNotDuplicate,
    isDuplicateDiagnostic,
    createAndAddDiagnosticWithDeduplication,
    addDiagnosticsWithDeduplication,
    getDuplicateDiagnostics,
    removeDuplicateDiagnostics,
    validateDiagnosticCollection
} from "../../../src/compiler/kindDiagnosticDeduplication.js";

// Mock source file for testing
const mockSourceFile = {
    fileName: "test.ts"
} as any;

// Test basic deduplication
function testBasicDeduplication() {
    const diagnostics: any[] = [];
    
    // Create a diagnostic
    const diagnostic1 = {
        file: mockSourceFile,
        start: 100,
        length: 10,
        messageText: "Kind constraint violation",
        category: 1,
        code: 9501,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus"
    };
    
    // Add the first diagnostic
    const added1 = addDiagnosticIfNotDuplicate(diagnostics, diagnostic1);
    console.assert(added1 === true, "First diagnostic should be added");
    console.assert(diagnostics.length === 1, "Should have 1 diagnostic");
    
    // Try to add the same diagnostic again
    const added2 = addDiagnosticIfNotDuplicate(diagnostics, diagnostic1);
    console.assert(added2 === false, "Duplicate diagnostic should not be added");
    console.assert(diagnostics.length === 1, "Should still have 1 diagnostic");
    
    // Add a different diagnostic (different code)
    const diagnostic2 = {
        ...diagnostic1,
        code: 9502
    };
    
    const added3 = addDiagnosticIfNotDuplicate(diagnostics, diagnostic2);
    console.assert(added3 === true, "Different diagnostic should be added");
    console.assert(diagnostics.length === 2, "Should have 2 diagnostics");
}

// Test deduplication with different positions
function testPositionBasedDeduplication() {
    const diagnostics: any[] = [];
    
    const diagnostic1 = {
        file: mockSourceFile,
        start: 100,
        length: 10,
        messageText: "Kind constraint violation",
        category: 1,
        code: 9501,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus"
    };
    
    const diagnostic2 = {
        ...diagnostic1,
        start: 200 // Different position
    };
    
    // Both should be added since they have different positions
    addDiagnosticIfNotDuplicate(diagnostics, diagnostic1);
    addDiagnosticIfNotDuplicate(diagnostics, diagnostic2);
    
    console.assert(diagnostics.length === 2, "Should have 2 diagnostics with different positions");
}

// Test batch deduplication
function testBatchDeduplication() {
    const diagnostics: any[] = [];
    
    const newDiagnostics = [
        {
            file: mockSourceFile,
            start: 100,
            length: 10,
            messageText: "Kind constraint violation 1",
            category: 1,
            code: 9501,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        },
        {
            file: mockSourceFile,
            start: 100, // Same position and code as first
            length: 10,
            messageText: "Kind constraint violation 1 (duplicate)",
            category: 1,
            code: 9501,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        },
        {
            file: mockSourceFile,
            start: 200,
            length: 10,
            messageText: "Kind constraint violation 2",
            category: 1,
            code: 9502,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        }
    ];
    
    const addedCount = addDiagnosticsWithDeduplication(diagnostics, newDiagnostics);
    console.assert(addedCount === 2, "Should add 2 unique diagnostics");
    console.assert(diagnostics.length === 2, "Should have 2 diagnostics total");
}

// Test duplicate detection
function testDuplicateDetection() {
    const diagnostics: any[] = [
        {
            file: mockSourceFile,
            start: 100,
            length: 10,
            messageText: "Kind constraint violation",
            category: 1,
            code: 9501,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        }
    ];
    
    const duplicates = getDuplicateDiagnostics(diagnostics);
    console.assert(duplicates.length === 0, "Should have no duplicates initially");
    
    // Add a duplicate
    diagnostics.push({
        ...diagnostics[0]
    });
    
    const duplicatesAfter = getDuplicateDiagnostics(diagnostics);
    console.assert(duplicatesAfter.length === 1, "Should detect 1 duplicate");
}

// Test validation
function testValidation() {
    const diagnostics: any[] = [
        {
            file: mockSourceFile,
            start: 100,
            length: 10,
            messageText: "Kind constraint violation 1",
            category: 1,
            code: 9501,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        },
        {
            file: mockSourceFile,
            start: 100, // Duplicate
            length: 10,
            messageText: "Kind constraint violation 1 (duplicate)",
            category: 1,
            code: 9501,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        },
        {
            file: mockSourceFile,
            start: 200,
            length: 10,
            messageText: "Kind constraint violation 2",
            category: 1,
            code: 9502,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus"
        }
    ];
    
    const validation = validateDiagnosticCollection(diagnostics);
    console.assert(validation.totalCount === 3, "Should have 3 total diagnostics");
    console.assert(validation.duplicateCount === 1, "Should have 1 duplicate");
    console.assert(validation.uniqueCount === 2, "Should have 2 unique diagnostics");
}

// Run all tests
function runAllTests() {
    console.log("Running kind diagnostic deduplication tests...");
    
    testBasicDeduplication();
    testPositionBasedDeduplication();
    testBatchDeduplication();
    testDuplicateDetection();
    testValidation();
    
    console.log("✅ All kind diagnostic deduplication tests passed!");
}

runAllTests(); 