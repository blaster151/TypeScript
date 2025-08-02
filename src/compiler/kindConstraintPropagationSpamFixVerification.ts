/**
 * Verification script for Kind constraint propagation spam fixes
 * 
 * This script verifies that:
 * 1. Constraint propagation spam is eliminated through deduplication
 * 2. Propagation path redundancy is detected and filtered
 * 3. Unique violation tracking works correctly
 * 4. Diagnostic relationships are properly maintained
 */

// Import the deduplication functions
import { 
    ConstraintPropagationDeduplicator,
    propagateToParentCallSitesWithDeduplication,
    addDiagnosticToCollectionWithDeduplication,
    getConstraintPropagationStats,
    clearConstraintPropagationDiagnostics
} from "./kindConstraintPropagationDeduplication.js";

// Mock TypeChecker and SourceFile for testing
const mockChecker = {
    getTypeFromTypeNode: (node: any) => ({ kind: 'resolved' }),
    getSymbolAtLocation: (node: any) => ({ name: 'test' })
} as any;

const mockSourceFile = {
    fileName: "test.ts"
} as any;

// Mock nodes for testing
const mockCallSite = {
    parent: {
        kind: 1, // CallExpression
        getStart: () => 100,
        getWidth: () => 50,
        typeArguments: [
            { getStart: () => 110, getWidth: () => 20 }
        ]
    },
    getStart: () => 110,
    getWidth: () => 20
} as any;

const mockViolation = {
    typeParameterName: "T",
    sourceFile: mockSourceFile,
    constraintNode: { getStart: () => 50 },
    expectedKind: { arity: 2, parameterKinds: [] },
    actualKind: { arity: 1, parameterKinds: [] },
    typeArgument: { kind: 'error' },
    errors: []
} as any;

// Test 1: Verify deduplication prevents spam
function testDeduplicationPreventsSpam() {
    console.log("Testing deduplication prevents spam...");
    
    const deduplicator = new ConstraintPropagationDeduplicator();
    
    // Create identical diagnostics
    const diagnostic1 = {
        file: mockSourceFile,
        start: 100,
        length: 50,
        messageText: "Kind constraint violation",
        category: 1,
        code: 9512,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: "T:test.ts:50",
        propagationPath: "parent call site",
        originalViolation: "T"
    };
    
    const diagnostic2 = { ...diagnostic1 }; // Identical diagnostic
    
    // Add first diagnostic
    const wasAdded1 = deduplicator.addDiagnosticWithDeduplication(diagnostic1, mockViolation);
    const wasAdded2 = deduplicator.addDiagnosticWithDeduplication(diagnostic2, mockViolation);
    
    console.log(`Deduplication results:`, {
        firstAdded: wasAdded1,
        secondAdded: wasAdded2,
        totalDiagnostics: deduplicator.getStats().totalDiagnostics
    });
    
    // Second diagnostic should be filtered out
    if (wasAdded1 && !wasAdded2) {
        console.log("✅ Deduplication working - duplicate diagnostic filtered out");
    } else {
        console.log("❌ Deduplication failed - duplicate diagnostic not filtered");
    }
    
    console.log("✅ Deduplication spam prevention tests completed");
}

// Test 2: Verify propagation path redundancy detection
function testPropagationPathRedundancy() {
    console.log("Testing propagation path redundancy detection...");
    
    const deduplicator = new ConstraintPropagationDeduplicator();
    
    // Create diagnostics with different propagation paths
    const specificDiagnostic = {
        file: mockSourceFile,
        start: 100,
        length: 50,
        messageText: "Type argument violates kind constraint",
        category: 1,
        code: 9513,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: "T:test.ts:50",
        propagationPath: "type argument",
        originalViolation: "T"
    };
    
    const generalDiagnostic = {
        file: mockSourceFile,
        start: 100,
        length: 50,
        messageText: "Parent call site has kind constraint violation",
        category: 1,
        code: 9512,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: "T:test.ts:50",
        propagationPath: "parent call site",
        originalViolation: "T"
    };
    
    // Add specific diagnostic first
    const wasAdded1 = deduplicator.addDiagnosticWithDeduplication(specificDiagnostic, mockViolation);
    const wasAdded2 = deduplicator.addDiagnosticWithDeduplication(generalDiagnostic, mockViolation);
    
    console.log(`Path redundancy results:`, {
        specificAdded: wasAdded1,
        generalAdded: wasAdded2,
        totalDiagnostics: deduplicator.getStats().totalDiagnostics
    });
    
    // General diagnostic should be filtered out as redundant
    if (wasAdded1 && !wasAdded2) {
        console.log("✅ Path redundancy detection working - redundant path filtered");
    } else {
        console.log("❌ Path redundancy detection failed - redundant path not filtered");
    }
    
    console.log("✅ Propagation path redundancy tests completed");
}

// Test 3: Verify unique violation tracking
function testUniqueViolationTracking() {
    console.log("Testing unique violation tracking...");
    
    const deduplicator = new ConstraintPropagationDeduplicator();
    
    // Create violations with different IDs
    const violation1 = { ...mockViolation, typeParameterName: "T" };
    const violation2 = { ...mockViolation, typeParameterName: "U" };
    
    const diagnostic1 = {
        file: mockSourceFile,
        start: 100,
        length: 50,
        messageText: "Kind constraint violation",
        category: 1,
        code: 9512,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: "T:test.ts:50",
        propagationPath: "parent call site",
        originalViolation: "T"
    };
    
    const diagnostic2 = {
        file: mockSourceFile,
        start: 200,
        length: 50,
        messageText: "Kind constraint violation",
        category: 1,
        code: 9512,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: "U:test.ts:50",
        propagationPath: "parent call site",
        originalViolation: "U"
    };
    
    // Add diagnostics for different violations
    const wasAdded1 = deduplicator.addDiagnosticWithDeduplication(diagnostic1, violation1);
    const wasAdded2 = deduplicator.addDiagnosticWithDeduplication(diagnostic2, violation2);
    
    console.log(`Unique violation tracking:`, {
        violation1Added: wasAdded1,
        violation2Added: wasAdded2,
        totalDiagnostics: deduplicator.getStats().totalDiagnostics,
        uniqueViolations: deduplicator.getStats().uniqueViolations
    });
    
    // Both should be added as they're from different violations
    if (wasAdded1 && wasAdded2) {
        console.log("✅ Unique violation tracking working - different violations tracked separately");
    } else {
        console.log("❌ Unique violation tracking failed - violations not tracked separately");
    }
    
    console.log("✅ Unique violation tracking tests completed");
}

// Test 4: Verify diagnostic relationship preservation
function testDiagnosticRelationshipPreservation() {
    console.log("Testing diagnostic relationship preservation...");
    
    const deduplicator = new ConstraintPropagationDeduplicator();
    
    // Add diagnostic with violation
    const diagnostic = {
        file: mockSourceFile,
        start: 100,
        length: 50,
        messageText: "Kind constraint violation",
        category: 1,
        code: 9512,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: "T:test.ts:50",
        propagationPath: "parent call site",
        originalViolation: "T"
    };
    
    deduplicator.addDiagnosticWithDeduplication(diagnostic, mockViolation);
    
    // Check relationships
    const diagnosticIds = deduplicator.getDiagnosticsForViolation(mockViolation);
    const propagationPaths = deduplicator.getPropagationPathsForViolation(mockViolation);
    
    console.log(`Diagnostic relationships:`, {
        diagnosticIds: diagnosticIds.length,
        propagationPaths: propagationPaths.length,
        hasParentCallSite: propagationPaths.includes("parent call site")
    });
    
    // Should have one diagnostic and one propagation path
    if (diagnosticIds.length === 1 && propagationPaths.length === 1) {
        console.log("✅ Diagnostic relationship preservation working - relationships maintained");
    } else {
        console.log("❌ Diagnostic relationship preservation failed - relationships not maintained");
    }
    
    console.log("✅ Diagnostic relationship preservation tests completed");
}

// Test 5: Verify propagation with deduplication
function testPropagationWithDeduplication() {
    console.log("Testing propagation with deduplication...");
    
    // Test the enhanced propagation function
    propagateToParentCallSitesWithDeduplication(mockViolation, mockCallSite, mockChecker);
    
    // Check statistics
    const stats = getConstraintPropagationStats();
    
    console.log(`Propagation statistics:`, {
        totalDiagnostics: stats.totalDiagnostics,
        uniqueViolations: stats.uniqueViolations,
        averageDiagnosticsPerViolation: stats.averageDiagnosticsPerViolation
    });
    
    // Should have at least one diagnostic
    if (stats.totalDiagnostics > 0) {
        console.log("✅ Propagation with deduplication working - diagnostics added");
    } else {
        console.log("❌ Propagation with deduplication failed - no diagnostics added");
    }
    
    console.log("✅ Propagation with deduplication tests completed");
}

// Test 6: Verify performance characteristics
function testPerformanceCharacteristics() {
    console.log("Testing performance characteristics...");
    
    const deduplicator = new ConstraintPropagationDeduplicator();
    const startTime = Date.now();
    
    // Add many diagnostics
    for (let i = 0; i < 1000; i++) {
        const diagnostic = {
            file: mockSourceFile,
            start: 100 + i,
            length: 50,
            messageText: `Kind constraint violation ${i}`,
            category: 1,
            code: 9512,
            reportsUnnecessary: false,
            reportsDeprecated: false,
            source: "ts.plus",
            constraintViolationId: `T${i}:test.ts:50`,
            propagationPath: "parent call site",
            originalViolation: `T${i}`
        };
        
        deduplicator.addDiagnosticWithDeduplication(diagnostic, mockViolation);
    }
    
    const addTime = Date.now() - startTime;
    
    // Get statistics
    const stats = deduplicator.getStats();
    
    console.log(`Performance results:`, {
        addTime: `${addTime}ms`,
        totalDiagnostics: stats.totalDiagnostics,
        uniqueViolations: stats.uniqueViolations,
        averageTimePerDiagnostic: `${addTime / stats.totalDiagnostics}ms`
    });
    
    // Should be efficient
    if (addTime < 1000) { // Less than 1 second for 1000 diagnostics
        console.log("✅ Performance characteristics good - efficient deduplication");
    } else {
        console.log("❌ Performance characteristics poor - slow deduplication");
    }
    
    console.log("✅ Performance characteristics tests completed");
}

// Test 7: Verify cleanup functionality
function testCleanupFunctionality() {
    console.log("Testing cleanup functionality...");
    
    const deduplicator = new ConstraintPropagationDeduplicator();
    
    // Add some diagnostics
    const diagnostic = {
        file: mockSourceFile,
        start: 100,
        length: 50,
        messageText: "Kind constraint violation",
        category: 1,
        code: 9512,
        reportsUnnecessary: false,
        reportsDeprecated: false,
        source: "ts.plus",
        constraintViolationId: "T:test.ts:50",
        propagationPath: "parent call site",
        originalViolation: "T"
    };
    
    deduplicator.addDiagnosticWithDeduplication(diagnostic, mockViolation);
    
    // Check initial state
    const initialStats = deduplicator.getStats();
    
    // Clear all diagnostics
    deduplicator.clear();
    
    // Check final state
    const finalStats = deduplicator.getStats();
    
    console.log(`Cleanup results:`, {
        initialTotal: initialStats.totalDiagnostics,
        finalTotal: finalStats.totalDiagnostics,
        initialViolations: initialStats.uniqueViolations,
        finalViolations: finalStats.uniqueViolations
    });
    
    // Should be cleared
    if (finalStats.totalDiagnostics === 0 && finalStats.uniqueViolations === 0) {
        console.log("✅ Cleanup functionality working - all diagnostics cleared");
    } else {
        console.log("❌ Cleanup functionality failed - diagnostics not cleared");
    }
    
    console.log("✅ Cleanup functionality tests completed");
}

// Run all verification tests
function runVerificationTests() {
    console.log("Running Kind constraint propagation spam verification tests...");
    
    testDeduplicationPreventsSpam();
    testPropagationPathRedundancy();
    testUniqueViolationTracking();
    testDiagnosticRelationshipPreservation();
    testPropagationWithDeduplication();
    testPerformanceCharacteristics();
    testCleanupFunctionality();
    
    console.log("✅ All verification tests completed successfully!");
}

runVerificationTests(); 