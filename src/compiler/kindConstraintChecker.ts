import {
    Type,
    TypeFlags,
    KindType,
    TypeConstructorType,
    TypeChecker,
    TypeParameter,
    TypeReferenceNode,
    ExpressionWithTypeArguments,
    NodeWithTypeArguments,
    TypeMapper,
    TypeNode,
    ObjectFlags,
} from "./types.js";
// TODO: Import isTypeConstructorType from the correct location
// For now, we'll use a simple type check
function isTypeConstructorType(type: Type): type is TypeConstructorType {
    return !!(type.flags & TypeFlags.Object && (type as any).objectFlags & ObjectFlags.TypeConstructor);
}

/**
 * Compare a TypeConstructorType with a KindType constraint
 */
export function compareTypeConstructorWithKindConstraint(
    typeConstructor: TypeConstructorType,
    kindConstraint: KindType,
    checker: TypeChecker
): { isCompatible: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check arity compatibility
    if (typeConstructor.arity !== kindConstraint.kindArity) {
        errors.push(`Arity mismatch: expected ${kindConstraint.kindArity}, got ${typeConstructor.arity}`);
    }
    
    // Check parameter kinds compatibility
    if (typeConstructor.parameterKinds.length !== kindConstraint.parameterKinds.length) {
        errors.push(`Parameter kind count mismatch: expected ${kindConstraint.parameterKinds.length}, got ${typeConstructor.parameterKinds.length}`);
    } else {
        for (let i = 0; i < typeConstructor.parameterKinds.length; i++) {
            const expectedKind = kindConstraint.parameterKinds[i];
            const actualKind = typeConstructor.parameterKinds[i];
            
            // Simple type comparison - in a real implementation, you'd use isTypeIdenticalTo
            if (expectedKind !== actualKind) {
                errors.push(`Parameter kind ${i} mismatch: expected ${expectedKind}, got ${actualKind}`);
            }
        }
    }
    
    return {
        isCompatible: errors.length === 0,
        errors
    };
}

/**
 * Format a KindType constraint for error messages
 */
export function formatKindConstraint(kindConstraint: KindType): string {
    const parameterKindsStr = kindConstraint.parameterKinds.map(kind => 
        kind.symbol?.escapedName || "unknown"
    ).join(", ");
    
    return `Kind<[${parameterKindsStr}]> (arity: ${kindConstraint.kindArity})`;
}

/**
 * Check if a type parameter constraint is a KindType
 */
export function isKindTypeConstraint(constraint: Type): boolean {
    return !!(constraint.flags & TypeFlags.Kind);
}

/**
 * Store kind metadata in a type parameter's constraint
 */
export function storeKindConstraintMetadata(
    typeParameter: TypeParameter,
    kindConstraint: KindType,
    checker: TypeChecker
): void {
    // Store the kind metadata in the type parameter's constraint
    const links = (typeParameter.symbol as any).links;
    if (links && !links.kindConstraintMetadata) {
        links.kindConstraintMetadata = {
            arity: kindConstraint.kindArity,
            parameterKinds: kindConstraint.parameterKinds,
            constraintType: kindConstraint
        };
    }
}

/**
 * Retrieve kind metadata from a type parameter's constraint
 */
export function getKindConstraintMetadata(typeParameter: TypeParameter): {
    arity: number;
    parameterKinds: readonly Type[];
    constraintType: KindType;
} | undefined {
    const links = (typeParameter.symbol as any).links;
    return links?.kindConstraintMetadata;
}

/**
 * Check assignability between two TypeConstructorTypes based on their kinds
 */
export function areTypeConstructorsAssignable(
    source: TypeConstructorType,
    target: TypeConstructorType,
    checker: TypeChecker
): { isAssignable: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check arity compatibility
    if (source.arity !== target.arity) {
        errors.push(`Type constructor arity mismatch: source has ${source.arity}, target expects ${target.arity}`);
    }
    
    // Check parameter kinds compatibility
    if (source.parameterKinds.length !== target.parameterKinds.length) {
        errors.push(`Parameter kind count mismatch: source has ${source.parameterKinds.length}, target expects ${target.parameterKinds.length}`);
    } else {
        for (let i = 0; i < source.parameterKinds.length; i++) {
            const sourceKind = source.parameterKinds[i];
            const targetKind = target.parameterKinds[i];
            
            // Simple type comparison - in a real implementation, you'd use isTypeIdenticalTo
            if (sourceKind !== targetKind) {
                errors.push(`Parameter kind ${i} mismatch: source has ${sourceKind}, target expects ${targetKind}`);
            }
        }
    }
    
    return {
        isAssignable: errors.length === 0,
        errors
    };
} 

/**
 * Validate and preserve kind metadata during type argument inference
 */
export function validateInferenceCandidate(
    candidate: Type,
    typeParameter: TypeParameter,
    checker: TypeChecker
): { isValid: boolean; shouldRemove: boolean } {
    // TODO: Get constraint from type parameter - this needs to be implemented
    // For now, we'll assume no kind constraint
    return { isValid: true, shouldRemove: false };
    
    // const constraint = getConstraintOfTypeParameter(typeParameter);
    
    // if (!constraint || !isKindTypeConstraint(constraint)) {
    //     // No kind constraint, so candidate is valid
    //     return { isValid: true, shouldRemove: false };
    // }
    
    // const kindConstraint = constraint as KindType;
    
    // // Check if the candidate is a TypeConstructorType
    // if (isTypeConstructorType(candidate)) {
    //     // Compare the kind of the TypeConstructorType with the KindType constraint
    //     const kindComparison = compareTypeConstructorWithKindConstraint(candidate, kindConstraint, checker);
        
    //     if (kindComparison.isCompatible) {
    //         // The kinds match, so this is a valid candidate
    //         // Store the kind metadata in the type parameter's constraint metadata
    //         storeKindConstraintMetadata(typeParameter, kindConstraint, checker);
    //         return { isValid: true, shouldRemove: false };
    //     } else {
    //         // The kinds don't match, so this candidate should be removed
    //         return { isValid: false, shouldRemove: true };
    //     }
    // } else {
    //     // Candidate is not a TypeConstructorType but constraint expects one
    //     return { isValid: false, shouldRemove: true };
    // }
} 