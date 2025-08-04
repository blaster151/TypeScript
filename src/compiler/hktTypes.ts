import {
    Type,
    TypeParameter,
    TypeParameterDeclaration,
    KindTypeNode,
    TypeNode,
    Symbol,
    TypeChecker,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";

/**
 * Represents a partially applied type constructor
 * This is used to track type constructors that have been partially applied
 * and can be further applied to additional type arguments
 */
export interface PartiallyAppliedTypeConstructor {
    /** The original type constructor */
    originalConstructor: Type;
    /** The type arguments that have been applied so far */
    appliedArguments: readonly Type[];
    /** The remaining kind signature after partial application */
    remainingKind: KindMetadata;
    /** The original kind signature */
    originalKind: KindMetadata;
}

/**
 * Represents a higher-kinded type parameter
 * This extends the basic TypeParameter with HKT-specific information
 */
export interface HigherKindedTypeParameter extends TypeParameter {
    /** The kind annotation for this type parameter */
    kindAnnotation: KindTypeNode;
    /** The kind metadata for this type parameter */
    kindMetadata: KindMetadata;
    /** Whether this is a higher-kinded type parameter */
    isHigherKinded: true;
    /** The arity of this kind */
    kindArity: number;
    /** The type parameters of this kind (for kind inference) */
    kindTypeParameters?: readonly TypeParameter[];
}

/**
 * Represents a type class constraint
 * This is used to track type class constraints on higher-kinded type parameters
 */
export interface TypeClassConstraint {
    /** The type class being constrained */
    typeClass: Symbol;
    /** The type parameter being constrained */
    typeParameter: TypeParameter;
    /** The kind constraint for this type class */
    kindConstraint: KindMetadata;
    /** Whether this constraint is satisfied */
    isSatisfied: boolean;
}

/**
 * Represents a type class instance
 * This is used to track type class instances for specific type constructors
 */
export interface TypeClassInstance {
    /** The type class this instance belongs to */
    typeClass: Symbol;
    /** The type constructor this instance is for */
    typeConstructor: Type;
    /** The implementation of the type class methods */
    implementation: Symbol;
    /** The kind signature of the type constructor */
    kindSignature: KindMetadata;
}

/**
 * HKT unification context
 * This tracks the state during HKT unification
 */
export interface HKTUnificationContext {
    /** The type checker being used */
    checker: TypeChecker;
    /** The current substitution mapping */
    substitutions: Map<TypeParameter, Type>;
    /** The current kind constraints */
    kindConstraints: TypeClassConstraint[];
    /** Whether unification succeeded */
    success: boolean;
    /** Error messages if unification failed */
    errors: string[];
}

/**
 * HKT inference context
 * This tracks the state during HKT kind inference
 */
export interface HKTInferenceContext {
    /** The type checker being used */
    checker: TypeChecker;
    /** The current kind environment */
    kindEnvironment: Map<TypeParameter, KindMetadata>;
    /** The current type class constraints */
    typeClassConstraints: TypeClassConstraint[];
    /** Whether inference succeeded */
    success: boolean;
    /** Error messages if inference failed */
    errors: string[];
}

/**
 * Represents a kind signature
 * This is used to describe the kind of a type constructor
 */
export interface KindSignature {
    /** The arity of the kind */
    arity: number;
    /** The parameter kinds */
    parameterKinds: readonly KindMetadata[];
    /** The result kind */
    resultKind: KindMetadata;
    /** Whether this is a higher-kinded type */
    isHigherKinded: boolean;
}

/**
 * HKT type environment
 * This tracks the mapping from type parameters to their kinds
 */
export interface HKTTypeEnvironment {
    /** Mapping from type parameters to their kinds */
    kindMap: Map<TypeParameter, KindMetadata>;
    /** Mapping from type parameters to their constraints */
    constraintMap: Map<TypeParameter, TypeClassConstraint[]>;
    /** The current scope level */
    scopeLevel: number;
}

/**
 * Represents a type class definition
 * This is used to define type classes with higher-kinded type parameters
 */
export interface TypeClassDefinition {
    /** The type class symbol */
    symbol: Symbol;
    /** The higher-kinded type parameters */
    typeParameters: readonly HigherKindedTypeParameter[];
    /** The methods of the type class */
    methods: readonly Symbol[];
    /** The kind constraints for this type class */
    kindConstraints: readonly KindMetadata[];
}

/**
 * Represents a type class instance definition
 * This is used to define instances of type classes
 */
export interface TypeClassInstanceDefinition {
    /** The type class being instantiated */
    typeClass: Symbol;
    /** The type constructor this instance is for */
    typeConstructor: Type;
    /** The kind signature of the type constructor */
    kindSignature: KindMetadata;
    /** The method implementations */
    methodImplementations: Map<string, Symbol>;
}

/**
 * HKT error types
 */
export const enum HKTErrorType {
    KindMismatch = "KindMismatch",
    TypeClassConstraintViolation = "TypeClassConstraintViolation",
    UnificationFailure = "UnificationFailure",
    InferenceFailure = "InferenceFailure",
    PartialApplicationError = "PartialApplicationError",
}

/**
 * Represents an HKT-related error
 */
export interface HKTError {
    /** The type of error */
    type: HKTErrorType;
    /** The error message */
    message: string;
    /** The location where the error occurred */
    location?: TypeNode | TypeParameterDeclaration;
    /** Additional context for the error */
    context?: any;
}

/**
 * HKT validation result
 */
export interface HKTValidationResult {
    /** Whether validation succeeded */
    isValid: boolean;
    /** Any errors that occurred during validation */
    errors: HKTError[];
    /** The inferred kind information */
    inferredKinds?: Map<TypeParameter, KindMetadata>;
}

/**
 * Utility functions for HKT operations
 */
export namespace HKTOperations {
    /**
     * Check if a type parameter is higher-kinded
     */
    export function isHigherKindedTypeParameter(tp: TypeParameter): tp is HigherKindedTypeParameter {
        return (tp as HigherKindedTypeParameter).isHigherKinded === true;
    }

    /**
     * Get the kind metadata for a type parameter
     */
    export function getKindMetadata(tp: TypeParameter): KindMetadata | undefined {
        if (isHigherKindedTypeParameter(tp)) {
            return tp.kindMetadata;
        }
        return undefined;
    }

    /**
     * Check if two kinds are compatible
     */
    export function areKindsCompatible(kind1: KindMetadata, kind2: KindMetadata): boolean {
        if (kind1.arity !== kind2.arity) {
            return false;
        }
        
        // For now, we'll do a simple arity check
        // In a full implementation, we'd need to check parameter kinds as well
        return true;
    }

    /**
     * Create a partially applied type constructor
     */
    export function createPartiallyAppliedTypeConstructor(
        constructor: Type,
        appliedArgs: readonly Type[],
        originalKind: KindMetadata,
        remainingKind: KindMetadata
    ): PartiallyAppliedTypeConstructor {
        return {
            originalConstructor: constructor,
            appliedArguments: appliedArgs,
            originalKind,
            remainingKind,
        };
    }

    /**
     * Check if a type can be partially applied
     */
    export function canBePartiallyApplied(type: Type, kind: KindMetadata): boolean {
        return kind.arity > 0;
    }

    /**
     * Apply a type argument to a partially applied type constructor
     */
    export function applyTypeArgument(
        partial: PartiallyAppliedTypeConstructor,
        arg: Type
    ): PartiallyAppliedTypeConstructor | Type {
        const newAppliedArgs = [...partial.appliedArguments, arg];
        
        if (newAppliedArgs.length >= partial.originalKind.arity) {
            // Fully applied, return the result type
            return partial.originalConstructor;
        } else {
            // Still partially applied
            return {
                ...partial,
                appliedArguments: newAppliedArgs,
                remainingKind: {
                    ...partial.remainingKind,
                    arity: partial.remainingKind.arity - 1,
                },
            };
        }
    }
} 