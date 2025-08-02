/**
 * Example usage of diagnostic code aliasing system
 * 
 * This file demonstrates how to use the KindDiagnosticCodeAlias system
 * to maintain compatibility during the transition from 900x to 950x codes.
 */

import { 
    applyKindDiagnosticAlias, 
    addKindDiagnosticAlias, 
    hasKindDiagnosticAlias,
    getKindDiagnosticAlias,
    getAllKindDiagnosticAliases 
} from "./kindDiagnosticAlias.js";

/**
 * Example: Emitting a kind diagnostic with automatic aliasing
 */
function emitKindDiagnostic(code: number, message: string, location: any): void {
    // Apply alias mapping automatically
    const finalCode = applyKindDiagnosticAlias(code);
    
    // Emit the diagnostic with the potentially aliased code
    console.log(`Diagnostic ${finalCode}: ${message} at ${location}`);
}

/**
 * Example: Setting up aliases for legacy compatibility
 */
function setupLegacyAliases(): void {
    // Map legacy 900x codes to new 950x codes
    addKindDiagnosticAlias(9001, 9501); // Legacy kind arity mismatch -> new kind arity mismatch
    addKindDiagnosticAlias(9002, 9502); // Legacy kind parameter mismatch -> new kind parameter mismatch
    addKindDiagnosticAlias(9003, 9503); // Legacy type parameter kind violation -> new type parameter kind violation
    
    console.log("Legacy diagnostic aliases configured");
}

/**
 * Example: Checking if a code has an alias
 */
function checkAliasStatus(code: number): void {
    if (hasKindDiagnosticAlias(code)) {
        const aliasedCode = getKindDiagnosticAlias(code);
        console.log(`Code ${code} has alias: ${aliasedCode}`);
    } else {
        console.log(`Code ${code} has no alias`);
    }
}

/**
 * Example: Getting all current aliases
 */
function printAllAliases(): void {
    const aliases = getAllKindDiagnosticAliases();
    console.log("Current diagnostic aliases:");
    for (const [legacyCode, newCode] of Object.entries(aliases)) {
        console.log(`  ${legacyCode} -> ${newCode}`);
    }
}

// Example usage
if (require.main === module) {
    console.log("=== Diagnostic Code Aliasing Example ===\n");
    
    // Setup legacy aliases
    setupLegacyAliases();
    
    // Check alias status
    checkAliasStatus(9001);
    checkAliasStatus(9501);
    
    // Emit diagnostics (will automatically apply aliases)
    emitKindDiagnostic(9001, "Legacy kind arity mismatch", "test.ts:10");
    emitKindDiagnostic(9501, "New kind arity mismatch", "test.ts:15");
    
    // Print all aliases
    printAllAliases();
    
    console.log("\n=== Example Complete ===");
} 