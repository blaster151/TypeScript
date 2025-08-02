/**
 * Diagnostic code aliasing system for kind-related diagnostics.
 * 
 * This module provides a mapping from legacy 900x diagnostic codes to new 950x codes
 * to maintain compatibility during the transition period.
 */

/**
 * Map of legacy 900x diagnostic codes to new 950x codes.
 * This preserves compatibility until tests and tooling are updated.
 */
export const KindDiagnosticCodeAlias: Record<number, number> = {
    // Map any existing 900x kind-related codes to their 950x equivalents
    // Currently empty since 950x codes are already in use
    // Example mappings (uncomment when needed):
    // 9001: 9501,
    // 9002: 9502,
    // 9003: 9503,
    // etc.
};

/**
 * Apply diagnostic code aliasing to map legacy 900x codes to 950x codes.
 * 
 * @param code - The original diagnostic code
 * @returns The aliased code if a mapping exists, otherwise the original code
 */
export function applyKindDiagnosticAlias(code: number): number {
    return KindDiagnosticCodeAlias[code] ?? code;
}

/**
 * Check if a diagnostic code has an alias mapping.
 * 
 * @param code - The diagnostic code to check
 * @returns True if the code has an alias mapping
 */
export function hasKindDiagnosticAlias(code: number): boolean {
    return code in KindDiagnosticCodeAlias;
}

/**
 * Get the aliased diagnostic code if it exists.
 * 
 * @param code - The original diagnostic code
 * @returns The aliased code or undefined if no mapping exists
 */
export function getKindDiagnosticAlias(code: number): number | undefined {
    return KindDiagnosticCodeAlias[code];
}

/**
 * Add a new diagnostic code alias mapping.
 * 
 * @param legacyCode - The legacy 900x code
 * @param newCode - The new 950x code
 */
export function addKindDiagnosticAlias(legacyCode: number, newCode: number): void {
    KindDiagnosticCodeAlias[legacyCode] = newCode;
}

/**
 * Remove a diagnostic code alias mapping.
 * 
 * @param legacyCode - The legacy code to remove
 */
export function removeKindDiagnosticAlias(legacyCode: number): void {
    delete KindDiagnosticCodeAlias[legacyCode];
}

/**
 * Get all current diagnostic code aliases.
 * 
 * @returns A copy of the current alias map
 */
export function getAllKindDiagnosticAliases(): Record<number, number> {
    return { ...KindDiagnosticCodeAlias };
} 