import {
    CompilerOptions,
    TypeChecker,
    Type,
    TypeParameterDeclaration,
    SourceFile,
} from "./types.js";
import { PartialApplicationInfo, detectPartialApplication, trackPartialApplication } from "./kindPartialApplication.js";

/**
 * Configuration for partial application support
 */
export interface PartialApplicationConfig {
    /** Whether partial application is allowed */
    allowPartialApplication: boolean;
    /** Whether to emit warnings for partial applications */
    warnOnPartialApplication: boolean;
    /** Whether to suggest alternatives when partial application is disallowed */
    suggestAlternatives: boolean;
    /** Whether to allow higher-order partial applications */
    allowHigherOrderPartialApplication: boolean;
}

/**
 * Default configuration for partial application
 */
export const DEFAULT_PARTIAL_APPLICATION_CONFIG: PartialApplicationConfig = {
    allowPartialApplication: false, // Default to disallowing for strict enforcement
    warnOnPartialApplication: true,
    suggestAlternatives: true,
    allowHigherOrderPartialApplication: false,
};

/**
 * Get partial application configuration from compiler options
 */
export function getPartialApplicationConfig(options: CompilerOptions): PartialApplicationConfig {
    // Note: These compiler options would need to be added to the CompilerOptions interface
    // in src/compiler/types.ts. For now, we use the default configuration.
    return {
        allowPartialApplication: (options as any).allowPartialTypeConstructorApplication ?? DEFAULT_PARTIAL_APPLICATION_CONFIG.allowPartialApplication,
        warnOnPartialApplication: (options as any).warnOnPartialTypeConstructorApplication ?? DEFAULT_PARTIAL_APPLICATION_CONFIG.warnOnPartialApplication,
        suggestAlternatives: (options as any).suggestPartialApplicationAlternatives ?? DEFAULT_PARTIAL_APPLICATION_CONFIG.suggestAlternatives,
        allowHigherOrderPartialApplication: (options as any).allowHigherOrderPartialApplication ?? DEFAULT_PARTIAL_APPLICATION_CONFIG.allowHigherOrderPartialApplication,
    };
}

/**
 * Decide whether to allow or disallow partial application based on configuration
 */
export function decidePartialApplicationPolicy(
    typeConstructor: Type,
    providedArguments: Type[],
    constraintArity: number,
    config: PartialApplicationConfig,
    checker: TypeChecker,
    sourceFile: SourceFile,
    constraintNode: TypeParameterDeclaration
): { allowed: boolean; reason: string; suggestions: string[] } {
    // First, detect if this is a partial application case
    const partialAppInfo = detectPartialApplication(typeConstructor, providedArguments, constraintArity, checker);
    
    if (!partialAppInfo.isPartialApplication) {
        return {
            allowed: true,
            reason: "Not a partial application case",
            suggestions: []
        };
    }

    // Check if partial application is globally allowed
    if (!config.allowPartialApplication) {
        return {
            allowed: false,
            reason: "Partial application is disallowed by compiler flag -allowPartialTypeConstructorApplication",
            suggestions: generateDisallowSuggestions(partialAppInfo, config)
        };
    }

    // Check if this is a higher-order partial application
    if (isHigherOrderPartialApplication(partialAppInfo) && !config.allowHigherOrderPartialApplication) {
        return {
            allowed: false,
            reason: "Higher-order partial application is disallowed",
            suggestions: generateHigherOrderSuggestions(partialAppInfo, config)
        };
    }

    // Validate the partial application
    if (!partialAppInfo.isValid) {
        return {
            allowed: false,
            reason: `Invalid partial application: ${partialAppInfo.errors.join(', ')}`,
            suggestions: generateValidationSuggestions(partialAppInfo, config)
        };
    }

    // Partial application is allowed and valid
    return {
        allowed: true,
        reason: "Partial application is allowed and valid",
        suggestions: generateAllowSuggestions(partialAppInfo, config)
    };
}

/**
 * Check if this is a higher-order partial application
 */
function isHigherOrderPartialApplication(info: PartialApplicationInfo): boolean {
    // This is a simplified check - in practice, you'd analyze the kind structure
    // to determine if it involves higher-order kinds (Kind<Kind<...>, ...>)
    return info.originalArity > 3; // Heuristic: higher-order typically has more parameters
}

/**
 * Generate suggestions when partial application is disallowed
 */
function generateDisallowSuggestions(info: PartialApplicationInfo, config: PartialApplicationConfig): string[] {
    const suggestions: string[] = [];
    
    if (config.suggestAlternatives) {
        suggestions.push("Consider supplying all type parameters to avoid partial application");
        suggestions.push("Use a type constructor that matches the expected arity exactly");
        suggestions.push("Enable partial application with -allowPartialTypeConstructorApplication flag");
    }
    
    return suggestions;
}

/**
 * Generate suggestions for higher-order partial applications
 */
function generateHigherOrderSuggestions(info: PartialApplicationInfo, config: PartialApplicationConfig): string[] {
    const suggestions: string[] = [];
    
    if (config.suggestAlternatives) {
        suggestions.push("Higher-order partial applications are not supported");
        suggestions.push("Consider using a simpler type constructor");
        suggestions.push("Enable higher-order partial application with -allowHigherOrderPartialApplication flag");
    }
    
    return suggestions;
}

/**
 * Generate suggestions for validation errors
 */
function generateValidationSuggestions(info: PartialApplicationInfo, config: PartialApplicationConfig): string[] {
    const suggestions: string[] = [];
    
    if (config.suggestAlternatives) {
        if (info.remainingArity !== info.constraintArity) {
            suggestions.push(`Adjust the number of type arguments to match expected arity ${info.constraintArity}`);
        }
        
        if (info.errors.some(e => e.includes("kind mismatch"))) {
            suggestions.push("Ensure provided type arguments match the expected kinds");
        }
    }
    
    return suggestions;
}

/**
 * Generate suggestions when partial application is allowed
 */
function generateAllowSuggestions(info: PartialApplicationInfo, config: PartialApplicationConfig): string[] {
    const suggestions: string[] = [];
    
    if (config.warnOnPartialApplication) {
        suggestions.push("Partial application detected - consider if this is the intended behavior");
    }
    
    return suggestions;
}

/**
 * Apply partial application policy and handle the result
 */
export function applyPartialApplicationPolicy(
    typeConstructor: Type,
    providedArguments: Type[],
    constraintArity: number,
    typeParameterName: string,
    config: PartialApplicationConfig,
    checker: TypeChecker,
    sourceFile: SourceFile,
    constraintNode: TypeParameterDeclaration
): { success: boolean; diagnostics: any[] } {
    const diagnostics: any[] = [];
    
    // Decide on the policy
    const decision = decidePartialApplicationPolicy(
        typeConstructor,
        providedArguments,
        constraintArity,
        config,
        checker,
        sourceFile,
        constraintNode
    );
    
    if (decision.allowed) {
        // Track the partial application for downstream validation
        const partialAppInfo = detectPartialApplication(typeConstructor, providedArguments, constraintArity, checker);
        trackPartialApplication(typeParameterName, partialAppInfo, sourceFile, constraintNode);
        
        // Add warning if configured
        if (config.warnOnPartialApplication) {
            diagnostics.push(createPartialApplicationWarning(decision.reason, decision.suggestions, sourceFile, constraintNode));
        }
        
        return { success: true, diagnostics };
    } else {
        // Add error for disallowed partial application
        diagnostics.push(createPartialApplicationError(decision.reason, decision.suggestions, sourceFile, constraintNode));
        
        return { success: false, diagnostics };
    }
}

/**
 * Create a warning diagnostic for allowed partial applications
 */
function createPartialApplicationWarning(
    reason: string,
    suggestions: string[],
    sourceFile: SourceFile,
    constraintNode: TypeParameterDeclaration
): any {
    return {
        code: "PartialApplicationWarning",
        message: reason,
        suggestions,
        node: constraintNode,
        sourceFile,
        category: "Warning"
    };
}

/**
 * Create an error diagnostic for disallowed partial applications
 */
function createPartialApplicationError(
    reason: string,
    suggestions: string[],
    sourceFile: SourceFile,
    constraintNode: TypeParameterDeclaration
): any {
    return {
        code: "PartialApplicationError",
        message: reason,
        suggestions,
        node: constraintNode,
        sourceFile,
        category: "Error"
    };
}

/**
 * Demonstrate the benefits of allowing partial application
 */
export function demonstrateAllowBenefits(): void {
    console.log("[Kind] Benefits of allowing partial application:");
    console.log("1. Greater flexibility in type constructor usage");
    console.log("2. Closer to Haskell/Scala style higher-kinded type usage");
    console.log("3. Support for currying-style type constructors");
    console.log("4. More expressive type-level programming");
}

/**
 * Demonstrate the benefits of disallowing partial application
 */
export function demonstrateDisallowBenefits(): void {
    console.log("[Kind] Benefits of disallowing partial application:");
    console.log("1. Easier tooling and autocomplete");
    console.log("2. Reduced risk of unexpected inference");
    console.log("3. Simpler kind arity enforcement");
    console.log("4. More predictable type checking behavior");
}

/**
 * Example usage with configuration
 */
export function exampleUsageWithConfig(): void {
    console.log("[Kind] Example usage with configuration:");
    console.log("// Compiler flag: -allowPartialTypeConstructorApplication");
    console.log("// This enables partial application support");
    console.log("");
    console.log("// Without flag (default):");
    console.log("// Partial applications are disallowed for strict enforcement");
    console.log("");
    console.log("// With flag:");
    console.log("// Partial applications are allowed for greater flexibility");
} 