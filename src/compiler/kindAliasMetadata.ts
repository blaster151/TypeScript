// ARCHIVED: compiler-side experiment for kind/HKT toolchain (not used by live code)
/**
 * Kind Alias Metadata
 * 
 * This module provides access to kind alias metadata, now sourced from
 * the centralized metadata in kindMetadataCentral.ts
 */

import {
    KindAliasMetadata as CentralizedMetadata,
    KindAliasName,
    getKindAliasMetadata,
    getKindAliasNames,
    getFPPatternNames,
    getBasicKindAliasNames as getCentralizedBasicKindAliasNames,
    isKindAliasName,
    isFPPattern,
    getExpectedArityForFPPattern,
    getConstraintTypeForFPPattern,
    toKindMetadata as toCentralizedKindMetadata
} from "./kindMetadataCentral.js";

import { KindMetadata, KindSource } from "./kindMetadata.js";

/**
 * Built-in kind alias information
 */
export interface BuiltInKindAlias {
    name: string;
    arity: number;
    parameterKinds: string[];
    description: string;
    example: string;
    documentation: string[];
    isFPPattern: boolean;
    expectedArity?: number;
    kindConstraint?: string;
}

/**
 * Built-in FP pattern information
 */
export interface BuiltInFPPattern extends BuiltInKindAlias {
    isFPPattern: true;
    expectedArity: number;
    kindConstraint: string;
}

/**
 * Map of built-in kind aliases
 */
export const BUILT_IN_KIND_ALIASES: Map<string, BuiltInKindAlias> = new Map<string, BuiltInKindAlias>();

// Populate the map from centralized metadata
for (const name of getKindAliasNames()) {
    const metadata = getKindAliasMetadata(name);
    
    const builtInAlias: BuiltInKindAlias = {
        name: metadata.name,
        arity: metadata.arity,
        parameterKinds: metadata.params,
        description: metadata.description,
        example: metadata.example,
        documentation: metadata.documentation,
        isFPPattern: metadata.isFPPattern
    };

    if (metadata.isFPPattern) {
        (builtInAlias as BuiltInFPPattern).expectedArity = metadata.expectedArity;
        (builtInAlias as BuiltInFPPattern).kindConstraint = metadata.constraint;
    }

    BUILT_IN_KIND_ALIASES.set(name, builtInAlias);
}

/**
 * Check if a symbol represents a built-in kind alias
 */
export function isBuiltInKindAlias(symbol: any): boolean {
    if (!symbol || !symbol.name) {
        return false;
    }
    return isKindAliasName(symbol.name);
}

/**
 * Get metadata for a built-in kind alias
 */
export function getBuiltInKindAliasMetadata(symbol: any): BuiltInKindAlias | undefined {
    if (!isBuiltInKindAlias(symbol)) {
        return undefined;
    }
    return BUILT_IN_KIND_ALIASES.get(symbol.name);
}

/**
 * Retrieve built-in kind metadata for a symbol
 * This is the main function used by retrieveKindMetadata in the checker
 */
export function retrieveBuiltInKindMetadata(symbol: any, checker: any): KindMetadata | undefined {
    if (!isBuiltInKindAlias(symbol)) {
        return undefined;
    }

    const centralizedMetadata = getKindAliasMetadata(symbol.name as KindAliasName);
    if (!centralizedMetadata) {
        return undefined;
    }

    // Convert centralized metadata to KindMetadata format
    const kindMetadata: KindMetadata = {
        arity: centralizedMetadata.arity,
        parameterKinds: [], // Will be populated by the type system
        retrievedFrom: KindSource.BuiltInAlias,
        symbol,
        isValid: true,
        isBuiltInAlias: true,
        aliasName: centralizedMetadata.name
    };

    return kindMetadata;
}

/**
 * Check if a symbol represents a built-in FP pattern
 */
export function isBuiltInFPPattern(symbol: any): boolean {
    if (!isBuiltInKindAlias(symbol)) {
        return false;
    }
    return isFPPattern(symbol.name as KindAliasName);
}

/**
 * Get the expected arity for a built-in FP pattern
 */
export function getExpectedArityForBuiltInFPPattern(symbol: any): number | undefined {
    if (!isBuiltInFPPattern(symbol)) {
        return undefined;
    }
    return getExpectedArityForFPPattern(symbol.name as KindAliasName);
}

/**
 * Get the constraint type for a built-in FP pattern
 */
export function getConstraintTypeForBuiltInFPPattern(symbol: any): string | undefined {
    if (!isBuiltInFPPattern(symbol)) {
        return undefined;
    }
    return getConstraintTypeForFPPattern(symbol.name as KindAliasName);
}

/**
 * Convert a built-in kind alias to KindMetadata format
 */
export function toKindMetadata(symbol: any): KindMetadata | undefined {
    if (!isBuiltInKindAlias(symbol)) {
        return undefined;
    }
    return toCentralizedKindMetadata(symbol.name as KindAliasName);
}

/**
 * Get all built-in kind alias names
 */
export function getBuiltInKindAliasNames(): string[] {
    return getKindAliasNames();
}

/**
 * Get all built-in FP pattern names
 */
export function getBuiltInFPPatternNames(): string[] {
    return getFPPatternNames();
}

/**
 * Get all basic kind alias names (non-FP patterns)
 */
export function getBasicKindAliasNames(): string[] {
    return getCentralizedBasicKindAliasNames();
}

/**
 * Validate kind constraint for FP patterns
 */
export function validateFPPatternKindConstraint(
    patternName: string,
    typeArgument: any,
    checker: any
): { isValid: boolean; expectedArity?: number; actualArity?: number } {
    if (!isKindAliasName(patternName)) {
        return { isValid: true };
    }

    const expectedArity = getExpectedArityForFPPattern(patternName as KindAliasName);
    if (expectedArity === undefined) {
        return { isValid: true };
    }

    // Get the actual arity from the type argument
    const typeArgumentType = checker.getTypeAtLocation(typeArgument);
    const typeArgumentKind = checker.getKindMetadata?.(typeArgumentType);
    
    if (!typeArgumentKind) {
        return { isValid: true }; // Not a kind type, let other diagnostics handle
    }

    const actualArity = typeArgumentKind.arity;
    const isValid = actualArity === expectedArity;

    return {
        isValid,
        expectedArity,
        actualArity
    };
}

// Re-export from centralized metadata for backward compatibility
export {
    CentralizedMetadata as KindAliasMetadata,
    KindAliasName,
    getKindAliasMetadata,
    isKindAliasName,
    isFPPattern,
    getExpectedArityForFPPattern,
    getConstraintTypeForFPPattern
}; 