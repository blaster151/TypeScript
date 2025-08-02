/**
 * Centralized Kind Metadata
 * 
 * This module centralizes all kind metadata for aliases and FP patterns,
 * ensuring .d.ts definitions remain synchronized with the checker's kind metadata.
 * 
 * All kind-related metadata should be defined here and referenced from other modules.
 */

import { KindMetadata, KindSource } from "./kindMetadata.js";

/**
 * Kind parameter types
 */
export type KindParameterType = "Type" | "Kind" | "Functor" | "Bifunctor";

/**
 * Kind constraint types
 */
export type KindConstraintType = "Functor" | "Bifunctor" | "UnaryFunctor" | "BinaryFunctor";

/**
 * FP pattern metadata
 */
export interface FPPatternMetadata {
    /** The pattern name (e.g., "Free", "Fix") */
    name: string;
    /** The kind arity the pattern expects */
    expectedArity: number;
    /** The constraint type the pattern requires */
    constraint: KindConstraintType;
    /** Description of the pattern */
    description: string;
    /** Usage example */
    example: string;
    /** External documentation links */
    documentation: string[];
}

/**
 * Kind alias metadata
 */
export interface KindAliasMetadata {
    /** The alias name (e.g., "Functor", "Bifunctor") */
    name: string;
    /** The kind arity */
    arity: number;
    /** The parameter kinds */
    params: KindParameterType[];
    /** Description of the alias */
    description: string;
    /** Usage example */
    example: string;
    /** External documentation links */
    documentation: string[];
    /** Whether this is an FP pattern */
    isFPPattern: false;
}

/**
 * FP pattern alias metadata
 */
export interface FPPatternAliasMetadata extends Omit<KindAliasMetadata, 'isFPPattern'> {
    /** Whether this is an FP pattern */
    isFPPattern: true;
    /** The expected arity for the constraint */
    expectedArity: number;
    /** The constraint type */
    constraint: KindConstraintType;
}

/**
 * Union type for all kind metadata
 */
export type KindMetadataItem = KindAliasMetadata | FPPatternAliasMetadata;

/**
 * Centralized kind metadata table
 * 
 * This is the single source of truth for all kind-related metadata.
 * Any changes to kind definitions should be made here first.
 */
export const KindAliasMetadata = {
    // Basic kind aliases
    Functor: {
        name: "Functor",
        arity: 1,
        params: ["Type", "Type"] as KindParameterType[],
        description: "Unary type constructor supporting map",
        example: "function map<F extends ts.plus.Functor, A, B>(fa: F<A>, f: (a: A) => B): F<B>",
        documentation: ["https://en.wikipedia.org/wiki/Functor"],
        isFPPattern: false
    } as const,

    Bifunctor: {
        name: "Bifunctor",
        arity: 2,
        params: ["Type", "Type", "Type"] as KindParameterType[],
        description: "Binary type constructor supporting bimap",
        example: "function bimap<F extends ts.plus.Bifunctor, A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>",
        documentation: ["https://en.wikipedia.org/wiki/Bifunctor"],
        isFPPattern: false
    } as const,

    // FP patterns
    Free: {
        name: "Free",
        arity: 2,
        params: ["Functor", "Type"] as KindParameterType[],
        description: "Free monad over a functor",
        example: "type ConsoleFree<A> = ts.plus.Free<ConsoleF, A>",
        documentation: [
            "https://en.wikipedia.org/wiki/Free_monad",
            "https://typelevel.org/cats/datatypes/freemonad.html"
        ],
        isFPPattern: true,
        expectedArity: 1,
        constraint: "UnaryFunctor"
    } as const,

    Fix: {
        name: "Fix",
        arity: 1,
        params: ["Functor"] as KindParameterType[],
        description: "Fixed point of a functor",
        example: "type Tree = ts.plus.Fix<TreeF>",
        documentation: [
            "https://en.wikipedia.org/wiki/Initial_algebra",
            "https://typelevel.org/cats/datatypes/fixed.html"
        ],
        isFPPattern: true,
        expectedArity: 1,
        constraint: "UnaryFunctor"
    } as const
} as const;

/**
 * TODO: Add HKT alias once KindScript supports first-class type constructors.
 *
 * Will represent a general higher-kinded type parameter with flexible arity,
 * enabling patterns such as generic Functor constraints without fixing arity.
 *
 * See issue: https://github.com/microsoft/TypeScript/issues/1213
 * 
 * Future implementation:
 * HKT: {
 *     name: "HKT",
 *     arity: -1, // Variable arity
 *     params: [] as KindParameterType[],
 *     description: "General higher-kinded type alias for any arity",
 *     example: "function lift<F extends ts.plus.HKT, Args extends any[]>(f: F<...Args>): F<...Args>",
 *     documentation: ["https://en.wikipedia.org/wiki/Higher-kinded_type"],
 *     isFPPattern: false
 * } as const
 */

/**
 * Type-safe access to kind metadata
 */
export type KindAliasName = keyof typeof KindAliasMetadata;

/**
 * Get metadata for a specific kind alias
 */
export function getKindAliasMetadata(name: KindAliasName): KindMetadataItem {
    return KindAliasMetadata[name];
}

/**
 * Get all kind alias names
 */
export function getKindAliasNames(): KindAliasName[] {
    return Object.keys(KindAliasMetadata) as KindAliasName[];
}

/**
 * Get all FP pattern names
 */
export function getFPPatternNames(): KindAliasName[] {
    return getKindAliasNames().filter(name => 
        KindAliasMetadata[name].isFPPattern
    );
}

/**
 * Get all basic kind alias names (non-FP patterns)
 */
export function getBasicKindAliasNames(): KindAliasName[] {
    return getKindAliasNames().filter(name => 
        !KindAliasMetadata[name].isFPPattern
    );
}

/**
 * Check if a name is a kind alias
 */
export function isKindAliasName(name: string): name is KindAliasName {
    return name in KindAliasMetadata;
}

/**
 * Check if a kind alias is an FP pattern
 */
export function isFPPattern(name: KindAliasName): boolean {
    return KindAliasMetadata[name].isFPPattern;
}

/**
 * Get the expected arity for an FP pattern
 */
export function getExpectedArityForFPPattern(name: KindAliasName): number {
    const metadata = KindAliasMetadata[name];
    if (metadata.isFPPattern) {
        return metadata.expectedArity;
    }
    return 0;
}

/**
 * Get the constraint type for an FP pattern
 */
export function getConstraintTypeForFPPattern(name: KindAliasName): KindConstraintType | undefined {
    const metadata = KindAliasMetadata[name];
    if (metadata.isFPPattern) {
        return metadata.constraint;
    }
    return undefined;
}

/**
 * Convert centralized metadata to KindMetadata format
 */
export function toKindMetadata(name: KindAliasName): KindMetadata {
    const metadata = KindAliasMetadata[name];
    
    return {
        arity: metadata.arity,
        parameterKinds: [], // Would be populated from actual type system
        source: metadata.isFPPattern ? 'built-in-fp-pattern' : 'built-in-alias',
        isBuiltIn: true,
        aliasName: metadata.name
    };
}

/**
 * Generate .d.ts content for kind aliases
 */
export function generateKindAliasDTs(): string {
    let content = `// Auto-generated from centralized kind metadata
// Do not edit manually - edit src/compiler/kindMetadataCentral.ts instead

/// <reference lib="es5" />

/**
 * Namespace for functional programming kind aliases and patterns.
 *
 * These aliases enable higher-kinded type patterns in TypeScript.
 * All definitions are isolated in the ts.plus namespace to avoid
 * collisions with user code.
 * 
 * @see https://github.com/microsoft/TypeScript/wiki/Functional-Programming-Patterns
 */
declare namespace ts.plus {
`;

    // Add basic kind aliases
    for (const name of getBasicKindAliasNames()) {
        const metadata = KindAliasMetadata[name];
        content += generateKindAliasDTsItem(metadata);
    }

    // Add FP patterns
    for (const name of getFPPatternNames()) {
        const metadata = KindAliasMetadata[name];
        content += generateFPPatternDTsItem(metadata);
    }

    content += `}
`;

    return content;
}

/**
 * Generate .d.ts content for a basic kind alias
 */
function generateKindAliasDTsItem(metadata: KindAliasMetadata): string {
    const paramTypes = metadata.params.map(param => `Type`).join(", ");
    
    return `
    /**
     * ${metadata.description}
     * 
     * @example
     * \`\`\`typescript
     * ${metadata.example}
     * \`\`\`
     * 
     * ${metadata.documentation.map(doc => `@see ${doc}`).join('\n     * ')}
     */
    type ${metadata.name} = Kind<[${paramTypes}]>;
`;
}

/**
 * Generate .d.ts content for an FP pattern
 */
function generateFPPatternDTsItem(metadata: FPPatternAliasMetadata): string {
    const paramTypes = metadata.params.map(param => `Type`).join(", ");
    const constraintCheck = metadata.constraint === "UnaryFunctor" 
        ? `F extends Kind<[Type, Type]>` 
        : `F extends ${metadata.constraint}`;
    
    return `
    /**
     * ${metadata.description}
     * 
     * @template F - The functor type constructor (must be ${metadata.constraint.toLowerCase()})
     * ${metadata.params.length > 1 ? `@template A - The value type` : ''}
     * 
     * @example
     * \`\`\`typescript
     * ${metadata.example}
     * \`\`\`
     * 
     * ${metadata.documentation.map(doc => `@see ${doc}`).join('\n     * ')}
     */
    type ${metadata.name}<F extends ${metadata.constraint}${metadata.params.length > 1 ? ', A' : ''}> = ${constraintCheck}
        ? any // Simplified for now - would be F<A> | { type: 'pure'; value: A } | { type: 'flatMap'; fa: F<Free<F, A>>; f: (a: A) => Free<F, A> }
        : never;
`;
}

/**
 * Generate diagnostic messages for kind constraint violations
 */
export function generateKindConstraintDiagnosticMessages(): Record<string, string> {
    const messages: Record<string, string> = {};

    for (const name of getFPPatternNames()) {
        const metadata = KindAliasMetadata[name];
        if (metadata.isFPPattern) {
            const messageKey = `${name}ConstraintViolation`;
            const message = `${metadata.name} requires a ${metadata.constraint.toLowerCase()}, but got {0}-ary kind`;
            messages[messageKey] = message;
        }
    }

    return messages;
}

/**
 * Generate quick-fix suggestions for kind constraint violations
 */
export function generateKindConstraintQuickFixes(): Record<string, string[]> {
    const quickFixes: Record<string, string[]> = {};

    for (const name of getFPPatternNames()) {
        const metadata = KindAliasMetadata[name];
        if (metadata.isFPPattern) {
            const suggestions = [
                `Wrap parameter in ${metadata.constraint}<...>`,
                `Replace with Identity`,
                `Replace with Reader`,
                `Replace with List`,
                `Replace with Array`,
                `Replace with Promise`,
                `Replace with IO`
            ];
            quickFixes[name] = suggestions;
        }
    }

    return quickFixes;
}

/**
 * Validate that all metadata is consistent
 */
export function validateKindMetadata(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const name of getKindAliasNames()) {
        const metadata = KindAliasMetadata[name];
        
        // Check that FP patterns have required fields
        if (metadata.isFPPattern) {
            if (!('expectedArity' in metadata)) {
                errors.push(`${name} is marked as FP pattern but missing expectedArity`);
            }
            if (!('constraint' in metadata)) {
                errors.push(`${name} is marked as FP pattern but missing constraint`);
            }
        }

        // Check that arity matches params length for basic aliases
        if (!metadata.isFPPattern && metadata.arity !== -1) {
            const expectedParams = metadata.arity + 1; // +1 for the result type
            if (metadata.params.length !== expectedParams) {
                errors.push(`${name} arity ${metadata.arity} doesn't match params length ${metadata.params.length}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Export the metadata for use in other modules
 */
export { KindAliasMetadata as default }; 