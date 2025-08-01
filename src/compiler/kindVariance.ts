import {
    Type,
    TypeChecker,
    TypeParameterDeclaration,
    Symbol,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";


/**
 * Variance annotation types
 */
export const enum VarianceAnnotation {
    Covariant = "+",      // +T
    Contravariant = "-",  // -T
    Invariant = "",       // T (no marker)
}

/**
 * Variance information for a type parameter
 */
export interface VarianceInfo {
    annotation: VarianceAnnotation;
    parameterIndex: number;
    parameterName: string;
}

/**
 * Extract variance annotations from kind metadata
 */
export function extractVarianceAnnotations(
    kindMetadata: KindMetadata,
    checker: TypeChecker
): VarianceInfo[] {
    const varianceInfo: VarianceInfo[] = [];
    
    const declarations = kindMetadata.symbol.declarations;
    if (!declarations || declarations.length === 0) {
        return varianceInfo;
    }

    // Find the first relevant declaration
    const declaration = declarations.find(d => 
        d.kind === 'TypeAliasDeclaration' ||
        d.kind === 'InterfaceDeclaration' ||
        d.kind === 'ClassDeclaration'
    );

    if (!declaration) {
        return varianceInfo;
    }

    // Extract type parameters
    let typeParameters: readonly TypeParameterDeclaration[] = [];
    if (declaration.kind === 'TypeAliasDeclaration') {
        typeParameters = (declaration as any).typeParameters || [];
    } else if (declaration.kind === 'InterfaceDeclaration') {
        typeParameters = (declaration as any).typeParameters || [];
    } else if (declaration.kind === 'ClassDeclaration') {
        typeParameters = (declaration as any).typeParameters || [];
    }

    // Analyze each type parameter for variance annotations
    for (let i = 0; i < typeParameters.length; i++) {
        const typeParam = typeParameters[i];
        const variance = extractVarianceFromTypeParameter(typeParam, checker);
        if (variance) {
            varianceInfo.push({
                annotation: variance,
                parameterIndex: i,
                parameterName: typeParam.name.escapedText
            });
        }
    }

    return varianceInfo;
}

/**
 * Extract variance annotation from a single type parameter
 */
function extractVarianceFromTypeParameter(
    typeParam: TypeParameterDeclaration,
    checker: TypeChecker
): VarianceAnnotation | null {
    const paramName = typeParam.name.escapedText;
    
    // Check for explicit variance markers in the name
    if (paramName.startsWith('+')) {
        return VarianceAnnotation.Covariant;
    }
    if (paramName.startsWith('-')) {
        return VarianceAnnotation.Contravariant;
    }
    
    // Check for variance annotations in JSDoc comments
    if (typeParam.jsDoc) {
        for (const tag of typeParam.jsDoc) {
            if (tag.tagName.escapedText === 'variance') {
                const varianceText = tag.comment?.toString().toLowerCase();
                if (varianceText?.includes('covariant') || varianceText?.includes('+')) {
                    return VarianceAnnotation.Covariant;
                }
                if (varianceText?.includes('contravariant') || varianceText?.includes('-')) {
                    return VarianceAnnotation.Contravariant;
                }
            }
        }
    }
    
    // Default to invariant
    return VarianceAnnotation.Invariant;
}

/**
 * Check variance compatibility between expected and actual types
 */
export function checkVarianceCompatibility(
    expectedType: Type,
    actualType: Type,
    variance: VarianceAnnotation,
    checker: TypeChecker
): { isCompatible: boolean; errorMessage?: string } {
    switch (variance) {
        case VarianceAnnotation.Covariant:
            return checkCovariantCompatibility(expectedType, actualType, checker);
        case VarianceAnnotation.Contravariant:
            return checkContravariantCompatibility(expectedType, actualType, checker);
        case VarianceAnnotation.Invariant:
            return checkInvariantCompatibility(expectedType, actualType, checker);
        default:
            return { isCompatible: true };
    }
}

/**
 * Check covariant compatibility (allow subtype)
 */
function checkCovariantCompatibility(
    expectedType: Type,
    actualType: Type,
    checker: TypeChecker
): { isCompatible: boolean; errorMessage?: string } {
    // For covariance, actualType should be a subtype of expectedType
    const isAssignable = checker.isTypeAssignableTo(actualType, expectedType);
    
    if (!isAssignable) {
        return {
            isCompatible: false,
            errorMessage: `Covariant type parameter requires actual type to be assignable to expected type`
        };
    }
    
    return { isCompatible: true };
}

/**
 * Check contravariant compatibility (allow supertype)
 */
function checkContravariantCompatibility(
    expectedType: Type,
    actualType: Type,
    checker: TypeChecker
): { isCompatible: boolean; errorMessage?: string } {
    // For contravariance, expectedType should be a subtype of actualType
    const isAssignable = checker.isTypeAssignableTo(expectedType, actualType);
    
    if (!isAssignable) {
        return {
            isCompatible: false,
            errorMessage: `Contravariant type parameter requires expected type to be assignable to actual type`
        };
    }
    
    return { isCompatible: true };
}

/**
 * Check invariant compatibility (require exact match)
 */
function checkInvariantCompatibility(
    expectedType: Type,
    actualType: Type,
    checker: TypeChecker
): { isCompatible: boolean; errorMessage?: string } {
    // For invariance, types must be exactly the same
    // Use structural equality check
    const isAssignableForward = checker.isTypeAssignableTo(actualType, expectedType);
    const isAssignableBackward = checker.isTypeAssignableTo(expectedType, actualType);
    
    if (!isAssignableForward || !isAssignableBackward) {
        return {
            isCompatible: false,
            errorMessage: `Invariant type parameter requires exact type match`
        };
    }
    
    return { isCompatible: true };
}

/**
 * Apply variance rules to kind comparison
 */
export function applyVarianceRules(
    expectedKind: KindMetadata,
    actualKind: KindMetadata,
    checker: TypeChecker
): { isCompatible: boolean; errors: any[]; warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Extract variance annotations from expected kind
    const varianceInfo = extractVarianceAnnotations(expectedKind, checker);
    
    if (varianceInfo.length === 0) {
        // No variance annotations, skip variance checking
        return { isCompatible: true, errors, warnings };
    }

    // Apply variance rules to each parameter
    for (const variance of varianceInfo) {
        if (variance.parameterIndex >= expectedKind.parameterKinds.length ||
            variance.parameterIndex >= actualKind.parameterKinds.length) {
            continue; // Skip if parameter index is out of bounds
        }

        const expectedParam = expectedKind.parameterKinds[variance.parameterIndex];
        const actualParam = actualKind.parameterKinds[variance.parameterIndex];

        const result = checkVarianceCompatibility(expectedParam, actualParam, variance.annotation, checker);
        
        if (!result.isCompatible) {
            errors.push({
                code: "TypeConstructorVarianceMismatch",
                message: result.errorMessage,
                expected: expectedParam,
                actual: actualParam,
                parameterIndex: variance.parameterIndex,
                varianceAnnotation: variance.annotation,
                parameterName: variance.parameterName
            });

            // Add suggestion for flipping variance marker
            if (variance.annotation === VarianceAnnotation.Covariant) {
                warnings.push({
                    code: "FlipVarianceMarker",
                    message: `Consider using contravariant (-) instead of covariant (+) for parameter ${variance.parameterName}`,
                    suggestion: `Change ${variance.parameterName} to -${variance.parameterName}`
                });
            } else if (variance.annotation === VarianceAnnotation.Contravariant) {
                warnings.push({
                    code: "FlipVarianceMarker",
                    message: `Consider using covariant (+) instead of contravariant (-) for parameter ${variance.parameterName}`,
                    suggestion: `Change ${variance.parameterName} to +${variance.parameterName}`
                });
            }
        }
    }

    const isCompatible = errors.length === 0;
    return { isCompatible, errors, warnings };
}

/**
 * Infer variance from usage patterns
 */
export function inferVarianceFromUsage(
    typeParam: TypeParameterDeclaration,
    checker: TypeChecker
): VarianceAnnotation | null {
    // Analyze how the type parameter is used in the declaration
    const usage = analyzeTypeParameterUsage(typeParam, checker);
    
    if (usage.inputPositions > 0 && usage.outputPositions > 0) {
        // Appears in both input and output positions - invariant
        return VarianceAnnotation.Invariant;
    } else if (usage.outputPositions > 0) {
        // Appears only in output positions - covariant
        return VarianceAnnotation.Covariant;
    } else if (usage.inputPositions > 0) {
        // Appears only in input positions - contravariant
        return VarianceAnnotation.Contravariant;
    }
    
    // No usage found or unclear pattern
    return null;
}

/**
 * Analyze how a type parameter is used in its declaration
 */
function analyzeTypeParameterUsage(
    typeParam: TypeParameterDeclaration,
    checker: TypeChecker
): { inputPositions: number; outputPositions: number } {
    const usage = { inputPositions: 0, outputPositions: 0 };
    const paramName = typeParam.name.escapedText;
    
    // Get the parent declaration
    const parent = typeParam.parent;
    if (!parent) return usage;
    
    // Analyze based on parent type
    switch (parent.kind) {
        case SyntaxKind.InterfaceDeclaration:
            analyzeInterfaceUsage(parent as any, paramName, usage, checker);
            break;
        case SyntaxKind.ClassDeclaration:
            analyzeClassUsage(parent as any, paramName, usage, checker);
            break;
        case SyntaxKind.TypeAliasDeclaration:
            analyzeTypeAliasUsage(parent as any, paramName, usage, checker);
            break;
        case SyntaxKind.FunctionDeclaration:
        case SyntaxKind.MethodDeclaration:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
            analyzeFunctionUsage(parent as any, paramName, usage, checker);
            break;
    }
    
    return usage;
}

/**
 * Analyze type parameter usage in interface declarations
 */
function analyzeInterfaceUsage(
    interfaceDecl: any, // InterfaceDeclaration
    paramName: string,
    usage: { inputPositions: number; outputPositions: number },
    checker: TypeChecker
): void {
    // Check property signatures
    if (interfaceDecl.members) {
        for (const member of interfaceDecl.members) {
            if (member.kind === SyntaxKind.PropertySignature) {
                const prop = member as any;
                
                // Property type is output position
                if (containsTypeParameter(prop.type, paramName)) {
                    usage.outputPositions++;
                }
                
                // Property name is output position (for mapped types)
                if (prop.name && containsTypeParameter(prop.name, paramName)) {
                    usage.outputPositions++;
                }
            } else if (member.kind === SyntaxKind.MethodSignature) {
                const method = member as any;
                
                // Return type is output position
                if (method.type && containsTypeParameter(method.type, paramName)) {
                    usage.outputPositions++;
                }
                
                // Parameter types are input positions
                if (method.parameters) {
                    for (const param of method.parameters) {
                        if (param.type && containsTypeParameter(param.type, paramName)) {
                            usage.inputPositions++;
                        }
                    }
                }
            }
        }
    }
    
    // Check heritage clauses
    if (interfaceDecl.heritageClauses) {
        for (const heritage of interfaceDecl.heritageClauses) {
            if (heritage.types) {
                for (const typeRef of heritage.types) {
                    // Heritage clause types are input positions
                    if (containsTypeParameter(typeRef, paramName)) {
                        usage.inputPositions++;
                    }
                }
            }
        }
    }
}

/**
 * Analyze type parameter usage in class declarations
 */
function analyzeClassUsage(
    classDecl: any, // ClassDeclaration
    paramName: string,
    usage: { inputPositions: number; outputPositions: number },
    checker: TypeChecker
): void {
    // Similar to interface analysis
    analyzeInterfaceUsage(classDecl, paramName, usage, checker);
    
    // Check constructor parameters
    if (classDecl.members) {
        for (const member of classDecl.members) {
            if (member.kind === SyntaxKind.Constructor) {
                const ctor = member as any;
                if (ctor.parameters) {
                    for (const param of ctor.parameters) {
                        if (param.type && containsTypeParameter(param.type, paramName)) {
                            usage.inputPositions++;
                        }
                    }
                }
            }
        }
    }
}

/**
 * Analyze type parameter usage in type alias declarations
 */
function analyzeTypeAliasUsage(
    typeAlias: any, // TypeAliasDeclaration
    paramName: string,
    usage: { inputPositions: number; outputPositions: number },
    checker: TypeChecker
): void {
    // Type alias body is output position
    if (typeAlias.type && containsTypeParameter(typeAlias.type, paramName)) {
        usage.outputPositions++;
    }
}

/**
 * Analyze type parameter usage in function declarations
 */
function analyzeFunctionUsage(
    funcDecl: any, // FunctionDeclaration | MethodDeclaration | etc.
    paramName: string,
    usage: { inputPositions: number; outputPositions: number },
    checker: TypeChecker
): void {
    // Return type is output position
    if (funcDecl.type && containsTypeParameter(funcDecl.type, paramName)) {
        usage.outputPositions++;
    }
    
    // Parameter types are input positions
    if (funcDecl.parameters) {
        for (const param of funcDecl.parameters) {
            if (param.type && containsTypeParameter(param.type, paramName)) {
                usage.inputPositions++;
            }
        }
    }
}

/**
 * Check if a type node contains a reference to the given type parameter
 */
function containsTypeParameter(typeNode: any, paramName: string): boolean {
    if (!typeNode) return false;
    
    // Check if it's a direct reference to the type parameter
    if (typeNode.kind === SyntaxKind.TypeReference) {
        const typeRef = typeNode as any;
        if (typeRef.typeName && typeRef.typeName.escapedText === paramName) {
            return true;
        }
    }
    
    // Check type arguments
    if (typeNode.typeArguments) {
        for (const arg of typeNode.typeArguments) {
            if (containsTypeParameter(arg, paramName)) {
                return true;
            }
        }
    }
    
    // Check union/intersection types
    if (typeNode.types) {
        for (const type of typeNode.types) {
            if (containsTypeParameter(type, paramName)) {
                return true;
            }
        }
    }
    
    // Check conditional types
    if (typeNode.checkType && containsTypeParameter(typeNode.checkType, paramName)) {
        return true;
    }
    if (typeNode.extendsType && containsTypeParameter(typeNode.extendsType, paramName)) {
        return true;
    }
    if (typeNode.trueType && containsTypeParameter(typeNode.trueType, paramName)) {
        return true;
    }
    if (typeNode.falseType && containsTypeParameter(typeNode.falseType, paramName)) {
        return true;
    }
    
    return false;
} 