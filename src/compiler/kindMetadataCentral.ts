// KINDSCRIPT: START - KIND_METADATA - Centralized KindScript metadata definitions
// This file contains the single source of truth for all KindScript metadata
// Auto-generated .d.ts files and diagnostics are sourced from this file

import { KindMetadata, KindSource } from "./kindMetadata.js";

// KINDSCRIPT: START - KIND_ALIAS_METADATA - Core kind alias definitions
export interface KindParameterType {
    name: string;
    description: string;
    example?: string;
}

export interface KindConstraintType {
    name: string;
    description: string;
    expectedArity: number;
    validationMessage: string;
}

export interface FPPatternMetadata {
    name: string;
    description: string;
    expectedArity: number;
    constraint: string;
    constraintDescription: string;
    usageExample: string;
    documentation: string;
}

export interface KindAliasMetadata {
    name: string;
    arity: number;
    params: string[];
    description: string;
    usageExample: string;
    documentation: string;
    category: "basic" | "advanced" | "experimental";
    isFPPattern: boolean;
    expectedArity?: number;
    constraint?: string;
    constraintDescription?: string;
}

export interface FPPatternAliasMetadata extends KindAliasMetadata {
    isFPPattern: true;
    expectedArity: number;
    constraint: string;
    constraintDescription: string;
}

export type KindMetadataItem = KindAliasMetadata | FPPatternAliasMetadata;

// KINDSCRIPT: START - KIND_ALIAS_TABLE - Centralized kind alias metadata table
export const KindAliasMetadata: Record<string, KindMetadataItem> = {
    Functor: {
        name: "Functor",
        arity: 1,
        params: ["Type", "Type"],
        description: "Unary type constructor supporting map",
        usageExample: "function map<F extends ts.plus.Functor, A, B>(fa: F<A>, f: (a: A) => B): F<B>",
        documentation: "A functor is a type constructor that supports mapping over its contents. The map function transforms values inside the functor without changing the functor structure.",
        category: "basic",
        isFPPattern: false
    } as const,
    
    Bifunctor: {
        name: "Bifunctor",
        arity: 2,
        params: ["Type", "Type", "Type"],
        description: "Binary type constructor supporting bimap",
        usageExample: "function bimap<F extends ts.plus.Bifunctor, A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>",
        documentation: "A bifunctor is a type constructor that takes two type parameters and supports mapping over both. The bimap function transforms values in both positions.",
        category: "basic",
        isFPPattern: false
    } as const,
    
    Free: {
        name: "Free",
        arity: 2,
        params: ["Functor", "Type"],
        description: "Free monad over a functor",
        usageExample: "type LogFree<A> = ts.plus.Free<LogF, A>;",
        documentation: "The Free monad provides a way to build monadic computations from any functor, not just those that are already monads. It represents a monad structure built from a functor F.",
        category: "advanced",
        isFPPattern: true,
        expectedArity: 1,
        constraint: "UnaryFunctor",
        constraintDescription: "The first parameter must be a unary functor (Kind<Type, Type>)"
    } as const,
    
    Fix: {
        name: "Fix",
        arity: 1,
        params: ["Functor"],
        description: "Fixed point of a functor",
        usageExample: "type Tree = ts.plus.Fix<TreeF>;",
        documentation: "The fixed point of a functor F is a type that satisfies the equation Fix<F> = F<Fix<F>>. This is useful for representing recursive data structures.",
        category: "advanced",
        isFPPattern: true,
        expectedArity: 1,
        constraint: "UnaryFunctor",
        constraintDescription: "The parameter must be a unary functor (Kind<Type, Type>)"
    } as const
};
// KINDSCRIPT: END - KIND_ALIAS_TABLE

/**
 * TODO: Add `HKT` alias once KindScript supports first-class type constructors.
 *
 * Will represent a general higher-kinded type parameter with flexible arity,
 * enabling patterns such as generic Functor constraints without fixing arity.
 *
 * See issue: https://github.com/microsoft/TypeScript/issues/1213
 *
 * @example
 * ```typescript
 * // Future implementation:
 * type HKT = Kind<...>; // Flexible arity
 *
 * function lift<F extends ts.plus.HKT, Args extends any[]>(f: F<...Args>): F<...Args>
 * ```
 */

// KINDSCRIPT: START - KIND_METADATA_HELPERS - Helper functions for metadata access
export function getKindAliasMetadata(name: string): KindAliasMetadata | undefined {
    return KindAliasMetadata[name];
}

export function getAllKindAliasNames(): string[] {
    return Object.keys(KindAliasMetadata);
}

export function getFPPatternNames(): string[] {
    return Object.entries(KindAliasMetadata)
        .filter(([_, metadata]) => metadata.isFPPattern)
        .map(([name, _]) => name);
}

export function getBasicKindAliasNames(): string[] {
    return Object.entries(KindAliasMetadata)
        .filter(([_, metadata]) => metadata.category === "basic")
        .map(([name, _]) => name);
}

export function getAdvancedKindAliasNames(): string[] {
    return Object.entries(KindAliasMetadata)
        .filter(([_, metadata]) => metadata.category === "advanced")
        .map(([name, _]) => name);
}

export function validateKindAliasMetadata(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    Object.entries(KindAliasMetadata).forEach(([name, metadata]) => {
        // Validate required fields
        if (!metadata.name) errors.push(`${name}: Missing name`);
        if (!metadata.description) errors.push(`${name}: Missing description`);
        if (!metadata.usageExample) errors.push(`${name}: Missing usage example`);
        if (!metadata.documentation) errors.push(`${name}: Missing documentation`);
        
        // Validate FP pattern constraints
        if (metadata.isFPPattern) {
            if (!metadata.expectedArity) errors.push(`${name}: FP pattern missing expectedArity`);
            if (!metadata.constraint) errors.push(`${name}: FP pattern missing constraint`);
            if (!metadata.constraintDescription) errors.push(`${name}: FP pattern missing constraintDescription`);
        }
        
        // Validate arity consistency
        if (metadata.params.length !== metadata.arity + 1) {
            errors.push(`${name}: Arity mismatch - arity=${metadata.arity}, params.length=${metadata.params.length}`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}
// KINDSCRIPT: END - KIND_METADATA_HELPERS

// KINDSCRIPT: START - KIND_DTS_GENERATION - .d.ts generation functions
export function generateKindAliasDTsItem(aliasName: string): string {
    const metadata = getKindAliasMetadata(aliasName);
    if (!metadata) {
        throw new Error(`Unknown kind alias: ${aliasName}`);
    }
    
    return `    /**
     * ${metadata.description}
     *
     * @example
     * \`\`\`typescript
     * ${metadata.usageExample}
     * \`\`\`
     *
     * ${metadata.documentation}
     */
    type ${metadata.name} = Kind<[${metadata.params.join(', ')}]>;`;
}

export function generateFPPatternDTsItem(patternName: string): string {
    const metadata = getKindAliasMetadata(patternName);
    if (!metadata || !metadata.isFPPattern) {
        throw new Error(`Unknown FP pattern: ${patternName}`);
    }
    
    const fpMetadata = metadata as FPPatternAliasMetadata;
    
    return `    /**
     * ${fpMetadata.description}
     *
     * ${fpMetadata.documentation}
     *
     * @template ${fpMetadata.params[0]} - The ${fpMetadata.constraintDescription}
     * ${fpMetadata.params.length > 1 ? `@template ${fpMetadata.params[1]} - The value type` : ''}
     *
     * @example
     * \`\`\`typescript
     * ${fpMetadata.usageExample}
     * \`\`\`
     */
    type ${fpMetadata.name}<${fpMetadata.params.map(p => `${p} extends ${fpMetadata.constraint}`).join(', ')}> = ${fpMetadata.params[0]} extends Kind<[Type, Type]>
        ? any // Simplified for now
        : never;`;
}

export function generateAllDTsContent(): string {
    const basicAliases = getBasicKindAliasNames();
    const advancedAliases = getAdvancedKindAliasNames();
    const fpPatterns = getFPPatternNames();
    
    let content = `// KINDSCRIPT: START - STDLIB_INTEGRATION - KindScript standard library definitions
// Auto-generated from kindMetadataCentral.ts
// Contains compiler-shipped kind aliases and FP patterns

declare namespace ts.plus {
`;

    // Add basic aliases
    basicAliases.forEach(aliasName => {
        content += generateKindAliasDTsItem(aliasName) + '\n\n';
    });
    
    // Add advanced aliases
    advancedAliases.forEach(aliasName => {
        if (!fpPatterns.includes(aliasName)) {
            content += generateKindAliasDTsItem(aliasName) + '\n\n';
        }
    });
    
    // Add FP patterns
    fpPatterns.forEach(patternName => {
        content += generateFPPatternDTsItem(patternName) + '\n\n';
    });
    
    // Add HKT TODO
    content += `    /**
     * TODO: Add \`HKT\` alias once KindScript supports first-class type constructors.
     *
     * Will represent a general higher-kinded type parameter with flexible arity,
     * enabling patterns such as generic Functor constraints without fixing arity.
     *
     * See issue: https://github.com/microsoft/TypeScript/issues/1213
     *
     * @example
     * \`\`\`typescript
     * // Future implementation:
     * type HKT = Kind<...>; // Flexible arity
     *
     * function lift<F extends ts.plus.HKT, Args extends any[]>(f: F<...Args>): F<...Args>
     * \`\`\`
     */
`;

    content += `}

// Temporary ambient stubs for KindScript types
declare type Type = any;
declare type Kind<TArgs extends any[] = any[]> = any;
declare type UnaryFunctor = Kind<[Type, Type]>;
// KINDSCRIPT: END - STDLIB_INTEGRATION`;

    return content;
}
// KINDSCRIPT: END - KIND_DTS_GENERATION

// KINDSCRIPT: START - KIND_DIAGNOSTIC_GENERATION - Diagnostic message generation
export function generateKindDiagnosticMessages(): Record<string, string> {
    const fpPatterns = getFPPatternNames();
    const messages: Record<string, string> = {};
    
    // Add FP pattern constraint violation messages
    fpPatterns.forEach(patternName => {
        const metadata = getKindAliasMetadata(patternName);
        if (metadata && metadata.isFPPattern) {
            const fpMetadata = metadata as FPPatternAliasMetadata;
            messages[`${patternName.toLowerCase()}ConstraintViolation`] = 
                `Type '{0}' does not satisfy the constraint '${fpMetadata.constraintDescription}' for FP pattern '${patternName}'.`;
        }
    });
    
    // Add general kind constraint messages
    messages["kindArityMismatch"] = "Expected kind arity {0}, but got {1}.";
    messages["kindCompatibilityViolation"] = "Kind compatibility violation: {0} is not compatible with {1}.";
    messages["kindConstraintViolation"] = "Type '{0}' does not satisfy kind constraint '{1}'.";
    
    return messages;
}

export function generateKindQuickFixMessages(): Record<string, string> {
    const fpPatterns = getFPPatternNames();
    const messages: Record<string, string> = {};
    
    // Add FP pattern quick-fix messages
    fpPatterns.forEach(patternName => {
        const metadata = getKindAliasMetadata(patternName);
        if (metadata && metadata.isFPPattern) {
            const fpMetadata = metadata as FPPatternAliasMetadata;
            messages[`wrapIn${patternName}Constraint`] = 
                `Wrap first parameter in ${fpMetadata.constraint}<...>`;
            messages[`replaceWithKnown${patternName}Constraint`] = 
                `Replace first parameter with a known ${fpMetadata.constraint}`;
            messages[`replaceWithIdentityFor${patternName}`] = 
                `Replace with Identity ${fpMetadata.constraint}`;
            messages[`replaceWithReaderFor${patternName}`] = 
                `Replace with Reader ${fpMetadata.constraint}`;
            messages[`replaceWithListFor${patternName}`] = 
                `Replace with List ${fpMetadata.constraint}`;
        }
    });
    
    return messages;
}
// KINDSCRIPT: END - KIND_DIAGNOSTIC_GENERATION

// KINDSCRIPT: END - KIND_METADATA 