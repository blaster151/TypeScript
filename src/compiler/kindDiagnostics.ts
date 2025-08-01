import {
    DiagnosticMessage,
    DiagnosticWithLocation,
    SourceFile,
    Node,
    TypeChecker,
    Type,
    Symbol,
    SyntaxKind,
} from "./types.js";
import { KindComparisonError, KindComparisonWarning } from "./kindComparison.js";

/**
 * Diagnostic codes for kind-related errors
 */
export const enum KindDiagnosticCodes {
    TypeConstructorArityMismatch = 9501,
    TypeConstructorKindParameterMismatch = 9502,
    TypeConstructorVarianceMismatch = 9503,
    KindAliasMismatch = 9504,
    ConstraintLocation = 9505,
    ReadTypeSignature = 9506,
    AddTypeParameters = 9507,
    RemoveTypeParameters = 9508,
    UseVarianceAnnotation = 9509,
    ReplaceWithSuggestedType = 9510,
    ReplaceAllKindMismatches = 9511,
    TypeParameterKindConstraintViolation = 9512,
    PartialApplicationArityMismatch = 9513,
    PartialApplicationKindMismatch = 9514,
    SupplyAllTypeParameters = 9515,
    RemoveExtraTypeArguments = 9516,
    TypeAliasKindMismatch = 9517,
}

/**
 * Create a diagnostic for kind arity mismatch
 */
export function createKindArityMismatchDiagnostic(
    node: Node,
    expectedArity: number,
    actualArity: number,
    sourceFile: SourceFile,
    checker: TypeChecker
): DiagnosticWithLocation {
    return {
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile),
        messageText: {
            key: "Expected type constructor with {0} parameters, but got {1}.",
            category: "Error",
            code: KindDiagnosticCodes.TypeConstructorArityMismatch,
            arguments: [expectedArity.toString(), actualArity.toString()]
        },
        category: "Error",
        code: KindDiagnosticCodes.TypeConstructorArityMismatch,
        relatedInformation: createRelatedInformation(node, checker)
    };
}

/**
 * Create a diagnostic for kind parameter mismatch
 */
export function createKindParameterMismatchDiagnostic(
    node: Node,
    parameterIndex: number,
    expectedKind: string,
    actualKind: string,
    sourceFile: SourceFile,
    checker: TypeChecker
): DiagnosticWithLocation {
    return {
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile),
        messageText: {
            key: "Expected kind parameter {0} to be '{1}', but got '{2}'.",
            category: "Error",
            code: KindDiagnosticCodes.TypeConstructorKindParameterMismatch,
            arguments: [parameterIndex.toString(), expectedKind, actualKind]
        },
        category: "Error",
        code: KindDiagnosticCodes.TypeConstructorKindParameterMismatch,
        relatedInformation: createRelatedInformation(node, checker)
    };
}

/**
 * Create a diagnostic for variance mismatch
 */
export function createVarianceMismatchDiagnostic(
    node: Node,
    parameterName: string,
    actualVariance: string,
    expectedVariance: string,
    sourceFile: SourceFile,
    checker: TypeChecker
): DiagnosticWithLocation {
    return {
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile),
        messageText: {
            key: "Type parameter {0} is {1}, but expected {2}.",
            category: "Error",
            code: KindDiagnosticCodes.TypeConstructorVarianceMismatch,
            arguments: [parameterName, actualVariance, expectedVariance]
        },
        category: "Error",
        code: KindDiagnosticCodes.TypeConstructorVarianceMismatch,
        relatedInformation: createRelatedInformation(node, checker)
    };
}

/**
 * Create a diagnostic for kind alias mismatch
 */
export function createKindAliasMismatchDiagnostic(
    node: Node,
    aliasName: string,
    sourceFile: SourceFile,
    checker: TypeChecker
): DiagnosticWithLocation {
    return {
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile),
        messageText: {
            key: "Kind alias '{0}' cannot be resolved to a compatible kind.",
            category: "Error",
            code: KindDiagnosticCodes.KindAliasMismatch,
            arguments: [aliasName]
        },
        category: "Error",
        code: KindDiagnosticCodes.KindAliasMismatch,
        relatedInformation: createRelatedInformation(node, checker)
    };
}

/**
 * Create a suggestion diagnostic for adding type parameters
 */
export function createAddTypeParametersSuggestion(
    node: Node,
    count: number,
    sourceFile: SourceFile
): DiagnosticWithLocation {
    return {
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile),
        messageText: {
            key: "Consider adding {0} type parameter(s) to match expected arity.",
            category: "Suggestion",
            code: KindDiagnosticCodes.AddTypeParameters,
            arguments: [count.toString()]
        },
        category: "Suggestion",
        code: KindDiagnosticCodes.AddTypeParameters
    };
}

/**
 * Create a suggestion diagnostic for removing type parameters
 */
export function createRemoveTypeParametersSuggestion(
    node: Node,
    count: number,
    sourceFile: SourceFile
): DiagnosticWithLocation {
    return {
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile),
        messageText: {
            key: "Consider removing {0} type parameter(s) to match expected arity.",
            category: "Suggestion",
            code: KindDiagnosticCodes.RemoveTypeParameters,
            arguments: [count.toString()]
        },
        category: "Suggestion",
        code: KindDiagnosticCodes.RemoveTypeParameters
    };
}

/**
 * Create a suggestion diagnostic for variance annotation
 */
export function createVarianceAnnotationSuggestion(
    node: Node,
    variance: string,
    parameterName: string,
    sourceFile: SourceFile
): DiagnosticWithLocation {
    return {
        file: sourceFile,
        start: node.getStart(sourceFile),
        length: node.getWidth(sourceFile),
        messageText: {
            key: "Consider using {0} variance annotation for parameter '{1}'.",
            category: "Suggestion",
            code: KindDiagnosticCodes.UseVarianceAnnotation,
            arguments: [variance, parameterName]
        },
        category: "Suggestion",
        code: KindDiagnosticCodes.UseVarianceAnnotation
    };
}

/**
 * Create related information for diagnostics
 */
function createRelatedInformation(
    node: Node,
    checker: TypeChecker
): DiagnosticWithLocation[] {
    const relatedInfo: DiagnosticWithLocation[] = [];

    // Add constraint location information
    const constraintLocation = findConstraintLocation(node, checker);
    if (constraintLocation) {
        relatedInfo.push({
            file: constraintLocation.file,
            start: constraintLocation.start,
            length: constraintLocation.length,
            messageText: {
                key: "This constraint is declared here: {0}:{1}:{2}",
                category: "Message",
                code: KindDiagnosticCodes.ConstraintLocation,
                arguments: [
                    constraintLocation.file.fileName,
                    constraintLocation.line.toString(),
                    constraintLocation.column.toString()
                ]
            },
            category: "Message",
            code: KindDiagnosticCodes.ConstraintLocation
        });
    }

    // Add type signature reading suggestion
    relatedInfo.push({
        file: node.getSourceFile(),
        start: node.getStart(),
        length: node.getWidth(),
        messageText: {
            key: "Consider reading the target function's type signature for expected kind information.",
            category: "Message",
            code: KindDiagnosticCodes.ReadTypeSignature
        },
        category: "Message",
        code: KindDiagnosticCodes.ReadTypeSignature
    });

    return relatedInfo;
}

/**
 * Find the location where a constraint is declared
 */
function findConstraintLocation(
    node: Node,
    checker: TypeChecker
): { file: SourceFile; start: number; length: number; line: number; column: number } | null {
    // Walk up the AST to find the constraint declaration
    let current: Node | undefined = node;
    
    while (current) {
        // Check if we're in a type parameter declaration
        if (current.kind === SyntaxKind.TypeParameter) {
            const typeParam = current as any; // TypeParameterDeclaration
            if (typeParam.constraint) {
                // Found a constraint - return its location
                const sourceFile = typeParam.getSourceFile();
                const start = typeParam.constraint.getStart(sourceFile);
                const length = typeParam.constraint.getWidth(sourceFile);
                
                // Calculate line and column from position
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
                
                return {
                    file: sourceFile,
                    start,
                    length,
                    line: lineAndChar.line,
                    column: lineAndChar.character
                };
            }
        }
        
        // Check if we're in a function/method signature with type parameters
        if (current.kind === SyntaxKind.FunctionDeclaration || 
            current.kind === SyntaxKind.MethodDeclaration ||
            current.kind === SyntaxKind.FunctionExpression ||
            current.kind === SyntaxKind.ArrowFunction) {
            
            const funcDecl = current as any; // FunctionLikeDeclaration
            if (funcDecl.typeParameters && funcDecl.typeParameters.length > 0) {
                // Check each type parameter for constraints
                for (const typeParam of funcDecl.typeParameters) {
                    if (typeParam.constraint) {
                        const sourceFile = typeParam.getSourceFile();
                        const start = typeParam.constraint.getStart(sourceFile);
                        const length = typeParam.constraint.getWidth(sourceFile);
                        
                        const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
                        
                        return {
                            file: sourceFile,
                            start,
                            length,
                            line: lineAndChar.line,
                            column: lineAndChar.character
                        };
                    }
                }
            }
        }
        
        // Check if we're in a class/interface declaration with type parameters
        if (current.kind === SyntaxKind.ClassDeclaration || 
            current.kind === SyntaxKind.InterfaceDeclaration) {
            
            const classDecl = current as any; // ClassDeclaration | InterfaceDeclaration
            if (classDecl.typeParameters && classDecl.typeParameters.length > 0) {
                // Check each type parameter for constraints
                for (const typeParam of classDecl.typeParameters) {
                    if (typeParam.constraint) {
                        const sourceFile = typeParam.getSourceFile();
                        const start = typeParam.constraint.getStart(sourceFile);
                        const length = typeParam.constraint.getWidth(sourceFile);
                        
                        const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
                        
                        return {
                            file: sourceFile,
                            start,
                            length,
                            line: lineAndChar.line,
                            column: lineAndChar.character
                        };
                    }
                }
            }
        }
        
        // Check if we're in a type alias declaration
        if (current.kind === SyntaxKind.TypeAliasDeclaration) {
            const typeAlias = current as any; // TypeAliasDeclaration
            if (typeAlias.typeParameters && typeAlias.typeParameters.length > 0) {
                // Check each type parameter for constraints
                for (const typeParam of typeAlias.typeParameters) {
                    if (typeParam.constraint) {
                        const sourceFile = typeParam.getSourceFile();
                        const start = typeParam.constraint.getStart(sourceFile);
                        const length = typeParam.constraint.getWidth(sourceFile);
                        
                        const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
                        
                        return {
                            file: sourceFile,
                            start,
                            length,
                            line: lineAndChar.line,
                            column: lineAndChar.character
                        };
                    }
                }
            }
        }
        
        // Check if we're in a mapped type
        if (current.kind === SyntaxKind.MappedType) {
            const mappedType = current as any; // MappedTypeNode
            if (mappedType.typeParameter && mappedType.typeParameter.constraint) {
                const sourceFile = mappedType.getSourceFile();
                const start = mappedType.typeParameter.constraint.getStart(sourceFile);
                const length = mappedType.typeParameter.constraint.getWidth(sourceFile);
                
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
                
                return {
                    file: sourceFile,
                    start,
                    length,
                    line: lineAndChar.line,
                    column: lineAndChar.character
                };
            }
        }
        
        // Check if we're in a conditional type
        if (current.kind === SyntaxKind.ConditionalType) {
            const conditionalType = current as any; // ConditionalTypeNode
            // For conditional types, the constraint is in the extends clause
            if (conditionalType.extendsType) {
                const sourceFile = conditionalType.getSourceFile();
                const start = conditionalType.extendsType.getStart(sourceFile);
                const length = conditionalType.extendsType.getWidth(sourceFile);
                
                const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
                
                return {
                    file: sourceFile,
                    start,
                    length,
                    line: lineAndChar.line,
                    column: lineAndChar.character
                };
            }
        }
        
        // Move up to parent node
        current = current.parent;
    }
    
    // No constraint found
    return null;
}

/**
 * Convert kind comparison errors to diagnostics
 */
export function convertKindErrorsToDiagnostics(
    errors: KindComparisonError[],
    node: Node,
    sourceFile: SourceFile,
    checker: TypeChecker
): DiagnosticWithLocation[] {
    const diagnostics: DiagnosticWithLocation[] = [];

    for (const error of errors) {
        switch (error.code) {
            case "TypeConstructorArityMismatch":
                diagnostics.push(createKindArityMismatchDiagnostic(
                    node,
                    error.expected as number,
                    error.actual as number,
                    sourceFile,
                    checker
                ));
                break;

            case "TypeConstructorKindParameterMismatch":
                diagnostics.push(createKindParameterMismatchDiagnostic(
                    node,
                    error.parameterIndex || 0,
                    formatTypeForDisplay(error.expected),
                    formatTypeForDisplay(error.actual),
                    sourceFile,
                    checker
                ));
                break;

            case "TypeConstructorVarianceMismatch":
                diagnostics.push(createVarianceMismatchDiagnostic(
                    node,
                    error.parameterName || "unknown",
                    formatVarianceForDisplay(error.actual),
                    formatVarianceForDisplay(error.expected),
                    sourceFile,
                    checker
                ));
                break;

            case "KindAliasMismatch":
            case "AliasResolutionFailed":
            case "InfiniteAliasLoop":
                diagnostics.push(createKindAliasMismatchDiagnostic(
                    node,
                    "unknown",
                    sourceFile,
                    checker
                ));
                break;

            default:
                // Create a generic diagnostic for unknown error codes
                diagnostics.push({
                    file: sourceFile,
                    start: node.getStart(sourceFile),
                    length: node.getWidth(sourceFile),
                    messageText: error.message,
                    category: "Error",
                    code: KindDiagnosticCodes.TypeConstructorKindParameterMismatch
                });
                break;
        }
    }

    return diagnostics;
}

/**
 * Convert kind comparison warnings to suggestion diagnostics
 */
export function convertKindWarningsToDiagnostics(
    warnings: KindComparisonWarning[],
    node: Node,
    sourceFile: SourceFile
): DiagnosticWithLocation[] {
    const diagnostics: DiagnosticWithLocation[] = [];

    for (const warning of warnings) {
        switch (warning.code) {
            case "AddTypeParameters":
                const addMatch = warning.message.match(/adding (\d+)/);
                if (addMatch) {
                    diagnostics.push(createAddTypeParametersSuggestion(
                        node,
                        parseInt(addMatch[1]),
                        sourceFile
                    ));
                }
                break;

            case "RemoveTypeParameters":
                const removeMatch = warning.message.match(/removing (\d+)/);
                if (removeMatch) {
                    diagnostics.push(createRemoveTypeParametersSuggestion(
                        node,
                        parseInt(removeMatch[1]),
                        sourceFile
                    ));
                }
                break;

            case "FlipVarianceMarker":
                const varianceMatch = warning.suggestion?.match(/Change .* to ([+-].*)/);
                if (varianceMatch) {
                    const paramMatch = warning.suggestion?.match(/parameter (.*)/);
                    diagnostics.push(createVarianceAnnotationSuggestion(
                        node,
                        varianceMatch[1],
                        paramMatch ? paramMatch[1] : "unknown",
                        sourceFile
                    ));
                }
                break;

            default:
                // Create a generic suggestion for unknown warning codes
                diagnostics.push({
                    file: sourceFile,
                    start: node.getStart(sourceFile),
                    length: node.getWidth(sourceFile),
                    messageText: warning.message,
                    category: "Suggestion",
                    code: KindDiagnosticCodes.AddTypeParameters
                });
                break;
        }
    }

    return diagnostics;
}

/**
 * Format a type for display in diagnostic messages
 */
function formatTypeForDisplay(type: any): string {
    if (typeof type === 'string') {
        return type;
    }
    if (type && typeof type === 'object') {
        // Try to get a meaningful string representation
        return type.toString ? type.toString() : JSON.stringify(type);
    }
    return String(type);
}

/**
 * Format variance for display in diagnostic messages
 */
function formatVarianceForDisplay(variance: any): string {
    if (typeof variance === 'string') {
        return variance;
    }
    if (variance && typeof variance === 'object') {
        // Try to extract variance information
        return variance.annotation || variance.toString ? variance.toString() : "unknown";
    }
    return String(variance);
} 