import {
    TypeChecker,
    TypeParameterDeclaration,
    Type,
    Symbol,
    Node,
    SourceFile,
    TypeReferenceNode,
    TypeNode,
    SyntaxKind,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";
import { compareKinds } from "./kindComparison.js";

/**
 * Partial application information
 */
export interface PartialApplicationInfo {
    originalConstructor: Type;
    originalArity: number;
    providedArguments: Type[];
    remainingArity: number;
    constraintArity: number;
    isPartialApplication: boolean;
    isValid: boolean;
    errors: string[];
}

/**
 * Partial application resolution metadata
 */
export interface PartialApplicationMetadata {
    typeParameterName: string;
    partialApplicationInfo: PartialApplicationInfo;
    sourceFile: SourceFile;
    constraintNode: TypeParameterDeclaration;
}

/**
 * Global storage for partial application metadata
 */
export class PartialApplicationRegistry {
    private partialApplications = new Map<string, PartialApplicationMetadata[]>();

    /**
     * Register a partial application case
     */
    registerPartialApplication(
        typeParameterName: string,
        metadata: PartialApplicationMetadata
    ): void {
        if (!this.partialApplications.has(typeParameterName)) {
            this.partialApplications.set(typeParameterName, []);
        }
        this.partialApplications.get(typeParameterName)!.push(metadata);
    }

    /**
     * Get partial applications for a type parameter
     */
    getPartialApplications(typeParameterName: string): PartialApplicationMetadata[] {
        return this.partialApplications.get(typeParameterName) || [];
    }

    /**
     * Check if a type parameter has partial applications
     */
    hasPartialApplications(typeParameterName: string): boolean {
        return this.partialApplications.has(typeParameterName);
    }

    /**
     * Clear all partial applications
     */
    clear(): void {
        this.partialApplications.clear();
    }
}

/**
 * Global partial application registry
 */
export const globalPartialApplicationRegistry = new PartialApplicationRegistry();

/**
 * Detect when higher-arity constructors are partially applied to match lower-arity constraints
 */
export function detectPartialApplication(
    typeConstructor: Type,
    providedArguments: Type[],
    constraintArity: number,
    checker: TypeChecker
): PartialApplicationInfo {
    // Get the original arity of the type constructor
    const originalArity = getTypeConstructorArity(typeConstructor, checker);
    const providedArity = providedArguments.length;
    const remainingArity = originalArity - providedArity;

    const info: PartialApplicationInfo = {
        originalConstructor: typeConstructor,
        originalArity,
        providedArguments,
        remainingArity,
        constraintArity,
        isPartialApplication: false,
        isValid: false,
        errors: []
    };

    // Check if this is a partial application case
    if (originalArity > constraintArity && remainingArity === constraintArity) {
        info.isPartialApplication = true;
        
        // Validate the partial application
        const validation = validatePartialApplication(info, checker);
        info.isValid = validation.isValid;
        info.errors = validation.errors;
    } else if (originalArity === constraintArity) {
        // Exact match - not a partial application
        info.isValid = true;
    } else {
        // Mismatch - not a valid partial application
        info.errors.push(`Arity mismatch: expected ${constraintArity}, got ${originalArity} after partial application`);
    }

    return info;
}

/**
 * Get the arity of a type constructor
 */
function getTypeConstructorArity(typeConstructor: Type, checker: TypeChecker): number {
    // Try to get kind metadata for the type constructor
    const kindMetadata = getKindMetadataForType(typeConstructor, checker);
    if (kindMetadata) {
        return kindMetadata.arity;
    }

    // Fallback: try to get arity from type parameters
    if (typeConstructor.symbol && typeConstructor.symbol.declarations) {
        for (const declaration of typeConstructor.symbol.declarations) {
            if (declaration.kind === SyntaxKind.TypeAliasDeclaration ||
                declaration.kind === SyntaxKind.InterfaceDeclaration ||
                declaration.kind === SyntaxKind.ClassDeclaration) {
                const typeParams = (declaration as any).typeParameters;
                if (typeParams) {
                    return typeParams.length;
                }
            }
        }
    }

    // Default to 0 if we can't determine
    return 0;
}

/**
 * Get kind metadata for a type
 */
function getKindMetadataForType(type: Type, checker: TypeChecker): KindMetadata | undefined {
    // Check if the type is a kind type
    if (type.flags & 0x80000000) { // TypeFlags.Kind
        // Try to get kind metadata from the type's symbol
        if (type.symbol) {
            // Use the kind metadata system we've built
            // This would call retrieveKindMetadata from kindRetrieval.ts
            // For now, extract from the type directly
            return {
                arity: (type as any).kindArity || 0,
                parameterKinds: (type as any).parameterKinds || [],
                symbol: type.symbol,
                retrievedFrom: "explicit",
                isValid: true
            };
        }
    }
    
    // Check if it's a type alias that resolves to a kind
    if (type.symbol && type.symbol.declarations) {
        for (const decl of type.symbol.declarations) {
            // Check if this is a type alias declaration
            if (decl.kind === 260) { // SyntaxKind.TypeAliasDeclaration
                const aliasDecl = decl as any;
                if (aliasDecl.type) {
                    const targetType = checker.getTypeFromTypeNode(aliasDecl.type);
                    // Recursively check the target type
                    const targetKind = getKindMetadataForType(targetType, checker);
                    if (targetKind) {
                        return targetKind;
                    }
                }
            }
        }
    }
    
    return undefined;
}

/**
 * Validate a partial application case
 */
function validatePartialApplication(
    info: PartialApplicationInfo,
    checker: TypeChecker
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that remaining arity exactly matches constraint arity
    if (info.remainingArity !== info.constraintArity) {
        errors.push(`Remaining arity ${info.remainingArity} does not match constraint arity ${info.constraintArity}`);
    }

    // Validate that provided arguments match expected kinds
    const kindMetadata = getKindMetadataForType(info.originalConstructor, checker);
    if (kindMetadata && kindMetadata.parameterKinds) {
        for (let i = 0; i < info.providedArguments.length && i < kindMetadata.parameterKinds.length; i++) {
            const providedArg = info.providedArguments[i];
            const expectedKind = kindMetadata.parameterKinds[i];
            
            const argKind = getKindMetadataForType(providedArg, checker);
            if (argKind) {
                const comparison = compareKinds(expectedKind, argKind, checker, false);
                if (!comparison.isCompatible) {
                    errors.push(`Argument ${i + 1} kind mismatch: expected ${formatKind(expectedKind)}, got ${formatKind(argKind)}`);
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Format a kind for display
 */
function formatKind(kind: KindMetadata): string {
    return `Kind<${kind.parameterKinds?.map(k => 'Type').join(', ') || ''}>`;
}

/**
 * Example detection scenario:
 * Type constructor: Kind<Type, Type, Type> (arity = 3)
 * Constraint: Kind<Type, Type> (arity = 2)
 * Provided: <string> (1 argument)
 * Result: Partial application with remaining arity = 2
 */
export function demonstratePartialApplicationDetection(): void {
    console.log("[Kind] Demonstrating partial application detection:");
    console.log("Type constructor: Kind<Type, Type, Type> (arity = 3)");
    console.log("Constraint: Kind<Type, Type> (arity = 2)");
    console.log("Provided: <string> (1 argument)");
    console.log("Result: Partial application with remaining arity = 2");
}

/**
 * Track partially applied constructors in resolution metadata
 */
export function trackPartialApplication(
    typeParameterName: string,
    partialApplicationInfo: PartialApplicationInfo,
    sourceFile: SourceFile,
    constraintNode: TypeParameterDeclaration
): void {
    const metadata: PartialApplicationMetadata = {
        typeParameterName,
        partialApplicationInfo,
        sourceFile,
        constraintNode
    };

    globalPartialApplicationRegistry.registerPartialApplication(typeParameterName, metadata);
}

/**
 * Get partial application metadata for downstream validation
 */
export function getPartialApplicationMetadata(typeParameterName: string): PartialApplicationMetadata[] {
    return globalPartialApplicationRegistry.getPartialApplications(typeParameterName);
}

/**
 * Check if a type parameter has partial applications
 */
export function hasPartialApplications(typeParameterName: string): boolean {
    return globalPartialApplicationRegistry.hasPartialApplications(typeParameterName);
}

/**
 * Clear all partial application metadata
 */
export function clearPartialApplicationMetadata(): void {
    globalPartialApplicationRegistry.clear();
} 