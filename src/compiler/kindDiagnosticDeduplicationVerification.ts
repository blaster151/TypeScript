/**
 * Verification script for kind diagnostic deduplication
 * 
 * This script tests that the deduplication prevents spammy duplicate diagnostics
 * from propagateToParentCallSites.
 */

// Mock the global diagnostic collection
(globalThis as any).kindDiagnostics = [];

// Import the deduplication function
import { addDiagnosticIfNotDuplicate } from "./kindDiagnosticDeduplication.js";

// Mock source file
const mockSourceFile = {
    fileName: "test.ts"
} as any;

// Test the deduplication functionality
function testDeduplication() {
    const diagnostics = (globalThis as any).kindDiagnostics;
    
    // Create a diagnostic
    const diagnostic = {
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
    const added1 = addDiagnosticIfNotDuplicate(diagnostics, diagnostic);
    console.log(`First diagnostic added: ${added1}, Total: ${diagnostics.length}`);
    
    // Try to add the same diagnostic again (should be skipped)
    const added2 = addDiagnosticIfNotDuplicate(diagnostics, diagnostic);
    console.log(`Duplicate diagnostic added: ${added2}, Total: ${diagnostics.length}`);
    
    // Add a different diagnostic (should be added)
    const diagnostic2 = {
        ...diagnostic,
        code: 9502
    };
    const added3 = addDiagnosticIfNotDuplicate(diagnostics, diagnostic2);
    console.log(`Different diagnostic added: ${added3}, Total: ${diagnostics.length}`);
    
    // Verify results
    if (diagnostics.length === 2 && !added2 && added1 && added3) {
        console.log("✅ Deduplication working correctly!");
    } else {
        console.log("❌ Deduplication not working as expected");
    }
}

// Run the test
testDeduplication(); 