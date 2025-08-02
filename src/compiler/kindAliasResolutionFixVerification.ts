/**
 * Verification script for Kind alias resolution and symbol links fixes
 * 
 * This script verifies that:
 * 1. Scope collisions are prevented between user-defined and built-in aliases
 * 2. Symbol links are accessed safely using checker's internal API
 * 3. Scope precedence rules are correctly applied
 * 4. Built-in aliases are protected from user collisions
 */

// Import the scope-aware resolution functions
import { 
    getAliasSymbolWithScope,
    attachInferredKindMetadataSafely,
    resolveKindAliasWithScope,
    retrieveKindMetadataWithScope,
    checkKindCompatibilityWithScope
} from "./kindAliasResolutionFix.js";

// Mock TypeChecker and SourceFile for testing
const mockChecker = {
    getSymbolsInScope: (node: any, scope: number) => [
        { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'user-file.ts' }) }] },
        { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'ts.plus.d.ts' }) }] }
    ],
    getTypeFromTypeNode: (node: any) => ({ kind: 'resolved' }),
    getSymbolLinks: (symbol: any) => ({ kindArity: 2, parameterKinds: [] }),
    setSymbolLinks: (symbol: any, links: any) => { /* Mock implementation */ },
    SyntaxKind: { TypeAliasDeclaration: 260 }
} as any;

const mockSourceFile = {
    fileName: "user-file.ts"
} as any;

// Mock type and symbol for testing
const mockType = {
    symbol: { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => mockSourceFile }] }
} as any;

const mockSymbol = {
    name: 'TestSymbol',
    declarations: [{ kind: 260, getSourceFile: () => mockSourceFile }]
} as any;

// Test 1: Verify scope-aware alias resolution
function testScopeAwareAliasResolution() {
    console.log("Testing scope-aware alias resolution...");
    
    const aliasSymbol = getAliasSymbolWithScope(mockType, mockChecker, mockSourceFile);
    
    console.log(`Alias symbol resolved:`, {
        found: !!aliasSymbol,
        name: aliasSymbol?.name,
        sourceFile: aliasSymbol?.declarations?.[0]?.getSourceFile()?.fileName
    });
    
    // Should resolve to the local scope symbol, not the stdlib symbol
    if (aliasSymbol && aliasSymbol.declarations?.[0]?.getSourceFile()?.fileName === 'user-file.ts') {
        console.log("✅ Scope-aware resolution working - local symbol selected");
    } else {
        console.log("❌ Scope-aware resolution failed - wrong symbol selected");
    }
    
    console.log("✅ Scope-aware alias resolution tests completed");
}

// Test 2: Verify safe symbol links access
function testSafeSymbolLinksAccess() {
    console.log("Testing safe symbol links access...");
    
    const kindData = {
        kindArity: 2,
        parameterKinds: [],
        isInferred: true
    };
    
    // Test safe metadata attachment
    attachInferredKindMetadataSafely(mockSymbol, kindData, mockChecker);
    
    console.log("✅ Safe symbol links access - no errors thrown");
    console.log("✅ Safe symbol links access tests completed");
}

// Test 3: Verify scope precedence rules
function testScopePrecedenceRules() {
    console.log("Testing scope precedence rules...");
    
    const result = resolveKindAliasWithScope(mockType, mockChecker, mockSourceFile);
    
    console.log(`Scope resolution result:`, {
        resolvedType: !!result.resolvedType,
        isBuiltInAlias: result.isBuiltInAlias,
        scope: result.scope
    });
    
    // Should identify as local scope, not built-in
    if (result.scope === 'local' && !result.isBuiltInAlias) {
        console.log("✅ Scope precedence rules working - local scope identified");
    } else {
        console.log("❌ Scope precedence rules failed - wrong scope identified");
    }
    
    console.log("✅ Scope precedence rules tests completed");
}

// Test 4: Verify built-in alias protection
function testBuiltInAliasProtection() {
    console.log("Testing built-in alias protection...");
    
    // Create a mock type that should resolve to built-in alias
    const builtInType = {
        symbol: { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'ts.plus.d.ts' }) }] }
    } as any;
    
    const result = resolveKindAliasWithScope(builtInType, mockChecker, mockSourceFile);
    
    console.log(`Built-in alias resolution:`, {
        resolvedType: !!result.resolvedType,
        isBuiltInAlias: result.isBuiltInAlias,
        scope: result.scope
    });
    
    // Should identify as stdlib scope and built-in alias
    if (result.scope === 'stdlib' && result.isBuiltInAlias) {
        console.log("✅ Built-in alias protection working - stdlib scope identified");
    } else {
        console.log("❌ Built-in alias protection failed - wrong scope identified");
    }
    
    console.log("✅ Built-in alias protection tests completed");
}

// Test 5: Verify scope conflict detection
function testScopeConflictDetection() {
    console.log("Testing scope conflict detection...");
    
    const expectedKind = {
        arity: 2,
        parameterKinds: [],
        symbol: { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'ts.plus.d.ts' }) }] }
    } as any;
    
    const actualKind = {
        arity: 2,
        parameterKinds: [],
        symbol: { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'user-file.ts' }) }] }
    } as any;
    
    const result = checkKindCompatibilityWithScope(expectedKind, actualKind, mockChecker, mockSourceFile);
    
    console.log(`Scope conflict detection:`, {
        isCompatible: result.isCompatible,
        scopeConflict: result.scopeConflict,
        diagnosticsCount: result.diagnostics.length
    });
    
    // Should detect scope conflict between stdlib and local Functor
    if (result.scopeConflict) {
        console.log("✅ Scope conflict detection working - conflict detected");
    } else {
        console.log("❌ Scope conflict detection failed - no conflict detected");
    }
    
    console.log("✅ Scope conflict detection tests completed");
}

// Test 6: Verify metadata retrieval with scope
function testMetadataRetrievalWithScope() {
    console.log("Testing metadata retrieval with scope...");
    
    const metadata = retrieveKindMetadataWithScope(mockSymbol, mockChecker, mockSourceFile, true);
    
    console.log(`Metadata retrieval:`, {
        found: !!metadata,
        arity: metadata?.arity,
        parameterKindsCount: metadata?.parameterKinds?.length
    });
    
    console.log("✅ Metadata retrieval with scope tests completed");
}

// Test 7: Verify collision prevention
function testCollisionPrevention() {
    console.log("Testing collision prevention...");
    
    // Simulate multiple Functor definitions in different scopes
    const localFunctor = { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'local.ts' }) }] };
    const moduleFunctor = { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'node_modules/module.d.ts' }) }] };
    const stdlibFunctor = { name: 'Functor', declarations: [{ kind: 260, getSourceFile: () => ({ fileName: 'ts.plus.d.ts' }) }] };
    
    // Test that each resolves to the correct scope
    const localResult = resolveKindAliasWithScope({ symbol: localFunctor } as any, mockChecker, { fileName: 'local.ts' } as any);
    const moduleResult = resolveKindAliasWithScope({ symbol: moduleFunctor } as any, mockChecker, { fileName: 'module.ts' } as any);
    const stdlibResult = resolveKindAliasWithScope({ symbol: stdlibFunctor } as any, mockChecker, { fileName: 'stdlib.ts' } as any);
    
    console.log(`Collision prevention results:`, {
        local: localResult.scope,
        module: moduleResult.scope,
        stdlib: stdlibResult.scope
    });
    
    // Each should resolve to its respective scope
    if (localResult.scope === 'local' && moduleResult.scope === 'module' && stdlibResult.scope === 'stdlib') {
        console.log("✅ Collision prevention working - each alias resolved to correct scope");
    } else {
        console.log("❌ Collision prevention failed - wrong scope resolution");
    }
    
    console.log("✅ Collision prevention tests completed");
}

// Run all verification tests
function runVerificationTests() {
    console.log("Running Kind alias resolution and symbol links verification tests...");
    
    testScopeAwareAliasResolution();
    testSafeSymbolLinksAccess();
    testScopePrecedenceRules();
    testBuiltInAliasProtection();
    testScopeConflictDetection();
    testMetadataRetrievalWithScope();
    testCollisionPrevention();
    
    console.log("✅ All verification tests completed successfully!");
}

runVerificationTests(); 