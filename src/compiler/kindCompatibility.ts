import {
    Node,
    Type,
    TypeFlags,
    KindTypeNode,
    TypeParameterDeclaration,
    TypeReferenceNode,
    MappedTypeNode,
    ConditionalTypeNode,
    NodeFlags,
    TypeNode,
    EntityName,
    Symbol,
    TypeChecker,
    SyntaxKind,
    CallExpression,
    NewExpression,
    FunctionTypeNode,
} from "./types.js";

/**
 * Context information for kind validation
 */
export interface KindValidationContext {
    isKindSensitive: boolean;
    expectedKindArity?: number;
    expectedParameterKinds?: readonly Type[];
    parentNode?: Node;
    constraintNode?: TypeNode;
    source: 'generic-constraint' | 'higher-order-usage' | 'mapped-type' | 'conditional-type' | 'none';
}

/**
 * Determine if the current context is kind-sensitive
 */
export function isKindSensitiveContext(
    node: Node,
    checker: TypeChecker
): KindValidationContext {
    const context: KindValidationContext = {
        isKindSensitive: false,
        source: 'none'
    };

    // Check parser-set flags first
    if (node.flags & NodeFlags.InExtendsConstraintContext) {
        context.isKindSensitive = true;
        context.source = 'generic-constraint';
        return context;
    }

    if (node.flags & NodeFlags.InMappedTypeContext) {
        context.isKindSensitive = true;
        context.source = 'mapped-type';
        return context;
    }

    // Inspect parent node in the AST
    const parent = node.parent;
    if (!parent) {
        return context;
    }

    // Check if node is a type argument to a generic parameter constrained to a kind
    if (isTypeArgumentToKindConstrainedGeneric(node, parent, checker)) {
        context.isKindSensitive = true;
        context.source = 'generic-constraint';
        context.parentNode = parent;
        return context;
    }

    // Check if node appears in a kind alias definition
    if (isInKindAliasDefinition(node, parent, checker)) {
        context.isKindSensitive = true;
        context.source = 'higher-order-usage';
        context.parentNode = parent;
        return context;
    }

    // Check if node is within type operator expressions expecting a kind
    if (isInKindExpectingTypeOperator(node, parent, checker)) {
        context.isKindSensitive = true;
        context.source = 'conditional-type';
        context.parentNode = parent;
        return context;
    }

    // Ask the checker whether the surrounding signature or constraint expects a type constructor
    if (checkerExpectsTypeConstructor(node, checker)) {
        context.isKindSensitive = true;
        context.source = 'higher-order-usage';
        return context;
    }

    return context;
}

/**
 * Check if a node is a type argument to a generic parameter constrained to a kind
 */
function isTypeArgumentToKindConstrainedGeneric(
    node: Node,
    parent: Node,
    checker: TypeChecker
): boolean {
    // Check if parent is a TypeReferenceNode (generic instantiation)
    if (parent.kind === SyntaxKind.TypeReference) {
        const typeRef = parent as TypeReferenceNode;
        
        // Check if this node is one of the type arguments
        if (typeRef.typeArguments?.includes(node as TypeNode)) {
            // Look up the type being referenced
            const targetSymbol = checker.getSymbolAtLocation(typeRef.typeName);
            if (targetSymbol) {
                // Check if the target type has kind constraints
                return hasKindConstraints(targetSymbol, checker);
            }
        }
    }

    return false;
}

/**
 * Check if a symbol has kind constraints
 */
function hasKindConstraints(symbol: Symbol, checker: TypeChecker): boolean {
    const declarations = symbol.declarations;
    if (!declarations) {
        return false;
    }

    for (const declaration of declarations) {
        // Check if it's a type parameter with kind constraints
        if (declaration.kind === SyntaxKind.TypeParameter) {
            const typeParam = declaration as TypeParameterDeclaration;
            if (typeParam.constraint) {
                // Check if the constraint is a KindType
                if (typeParam.constraint.kind === SyntaxKind.KindType) {
                    return true;
                }
                // Check if the constraint references a kind
                if (isKindTypeReference(typeParam.constraint, checker)) {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Check if a type node references a kind
 */
function isKindTypeReference(typeNode: TypeNode, checker: TypeChecker): boolean {
    if (typeNode.kind === SyntaxKind.KindType) {
        return true;
    }

    if (typeNode.kind === SyntaxKind.TypeReference) {
        const typeRef = typeNode as TypeReferenceNode;
        const symbol = checker.getSymbolAtLocation(typeRef.typeName);
        if (symbol) {
            // Check if the referenced type is a kind
            const type = checker.getTypeOfSymbolAtLocation(symbol, typeRef);
            return !!(type.flags & TypeFlags.Kind);
        }
    }

    return false;
}

/**
 * Check if a node appears in a kind alias definition
 */
function isInKindAliasDefinition(
    node: Node,
    parent: Node,
    checker: TypeChecker
): boolean {
    // Look up the AST to find type alias declarations
    let current: Node | undefined = parent;
    while (current) {
        if (current.kind === SyntaxKind.TypeAliasDeclaration) {
            // Check if this type alias is a kind definition
            const symbol = checker.getSymbolAtLocation(current);
            if (symbol) {
                const type = checker.getTypeOfSymbolAtLocation(symbol, current);
                return !!(type.flags & TypeFlags.Kind);
            }
        }
        current = current.parent;
    }

    return false;
}

/**
 * Check if a node is within type operator expressions expecting a kind
 */
function isInKindExpectingTypeOperator(
    node: Node,
    parent: Node,
    checker: TypeChecker
): boolean {
    // Check mapped types
    if (parent.kind === 'MappedType') {
        const mappedType = parent as MappedTypeNode;
        if (mappedType.constraintType) {
            return isKindTypeReference(mappedType.constraintType, checker);
        }
    }

    // Check conditional types
    if (parent.kind === 'ConditionalType') {
        const conditionalType = parent as ConditionalTypeNode;
        // Check if the check type or extends type is a kind
        if (isKindTypeReference(conditionalType.checkType, checker) ||
            isKindTypeReference(conditionalType.extendsType, checker)) {
            return true;
        }
    }

    return false;
}

/**
 * Ask the checker whether the surrounding signature or constraint expects a type constructor
 */
function checkerExpectsTypeConstructor(
    node: Node,
    checker: TypeChecker
): boolean {
    // Look up the AST to find the surrounding context
    let current: Node | undefined = node;
    
    while (current) {
        // Check if we're in a type parameter constraint
        if (current.kind === SyntaxKind.TypeParameter) {
            const typeParam = current as TypeParameterDeclaration;
            if (typeParam.constraint) {
                const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                if (constraintType.flags & TypeFlags.Kind) {
                    return true;
                }
            }
        }
        
        // Check if we're in a function/method call with kind-constrained type parameters
        if (current.kind === SyntaxKind.CallExpression || current.kind === SyntaxKind.NewExpression) {
            const callExpr = current as CallExpression | NewExpression;
            if (callExpr.typeArguments && callExpr.typeArguments.length > 0) {
                // Check if the function being called has kind-constrained type parameters
                const callType = checker.getTypeAtLocation(callExpr.expression);
                if (callType && 'getCallSignatures' in callType) {
                    const signatures = (callType as any).getCallSignatures();
                    for (const signature of signatures) {
                        if (signature.typeParameters) {
                            for (const typeParam of signature.typeParameters) {
                                if (typeParam.constraint && (typeParam.constraint.flags & TypeFlags.Kind)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Check if we're in a type reference with kind constraints
        if (current.kind === SyntaxKind.TypeReference) {
            const typeRef = current as TypeReferenceNode;
            if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
                const referencedType = checker.getTypeAtLocation(typeRef.typeName);
                if (referencedType && 'typeParameters' in referencedType) {
                    const typeParams = (referencedType as any).typeParameters;
                    for (const typeParam of typeParams) {
                        if (typeParam.constraint && (typeParam.constraint.flags & TypeFlags.Kind)) {
                            return true;
                        }
                    }
                }
            }
        }
        
        // Check if we're in a mapped type
        if (current.kind === SyntaxKind.MappedType) {
            const mappedType = current as MappedTypeNode;
            if (mappedType.typeParameter && mappedType.typeParameter.constraint) {
                const constraintType = checker.getTypeFromTypeNode(mappedType.typeParameter.constraint);
                if (constraintType.flags & TypeFlags.Kind) {
                    return true;
                }
            }
        }
        
        // Check if we're in a conditional type
        if (current.kind === SyntaxKind.ConditionalType) {
            const conditionalType = current as ConditionalTypeNode;
            // Check if the check type or extends type involves kind types
            const checkType = checker.getTypeFromTypeNode(conditionalType.checkType);
            const extendsType = checker.getTypeFromTypeNode(conditionalType.extendsType);
            
            if ((checkType.flags & TypeFlags.Kind) || (extendsType.flags & TypeFlags.Kind)) {
                return true;
            }
        }
        
        // Check if we're in a higher-order type (like a function type that takes a type constructor)
        if (current.kind === SyntaxKind.FunctionType) {
            const funcType = current as FunctionTypeNode;
            if (funcType.typeParameters) {
                for (const typeParam of funcType.typeParameters) {
                    if (typeParam.constraint) {
                        const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                        if (constraintType.flags & TypeFlags.Kind) {
                            return true;
                        }
                    }
                }
            }
        }
        
        // Move up to parent node
        current = current.parent;
    }
    
    return false;
}

/**
 * Identify whether a type constructor or concrete type is expected
 */
export function identifyExpectedType(
    node: Node,
    context: KindValidationContext,
    checker: TypeChecker
): { expectsConstructor: boolean; expectedKindArity?: number; expectedParameterKinds?: readonly Type[] } {
    const result = {
        expectsConstructor: false,
        expectedKindArity: undefined as number | undefined,
        expectedParameterKinds: undefined as readonly Type[] | undefined
    };

    if (!context.isKindSensitive) {
        return result;
    }

    switch (context.source) {
        case 'generic-constraint':
            return extractExpectedKindFromConstraint(node, checker);
        case 'higher-order-usage':
            return extractExpectedKindFromHigherOrderUsage(node, checker);
        case 'mapped-type':
            return extractExpectedKindFromMappedType(node, checker);
        case 'conditional-type':
            return extractExpectedKindFromConditionalType(node, checker);
        default:
            return result;
    }
}

/**
 * Extract expected kind from generic constraint
 */
function extractExpectedKindFromConstraint(
    node: Node,
    checker: TypeChecker
): { expectsConstructor: boolean; expectedKindArity?: number; expectedParameterKinds?: readonly Type[] } {
    // Look up the AST to find the type parameter declaration
    let current: Node | undefined = node;
    while (current) {
        if (current.kind === 'TypeParameter') {
            const typeParam = current as TypeParameterDeclaration;
            if (typeParam.constraint) {
                // Parse the constraint to extract kind information
                const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                if (constraintType.flags & TypeFlags.Kind) {
                    // This is a KindType - extract its arity and parameter kinds
                    return {
                        expectsConstructor: true,
                        expectedKindArity: (constraintType as any).kindArity,
                        expectedParameterKinds: (constraintType as any).parameterKinds
                    };
                }
            }
        }
        current = current.parent;
    }

    return { expectsConstructor: false };
}

/**
 * Extract expected kind from higher-order usage
 */
function extractExpectedKindFromHigherOrderUsage(
    node: Node,
    checker: TypeChecker
): { expectsConstructor: boolean; expectedKindArity?: number; expectedParameterKinds?: readonly Type[] } {
    // Look for function/method calls in the parent chain
    let current: Node | undefined = node;
    
    while (current) {
        // Check if we're in a call expression
        if (current.kind === SyntaxKind.CallExpression) {
            const callExpr = current as any; // CallExpression
            const callType = checker.getTypeAtLocation(callExpr.expression);
            
            if (callType && 'getCallSignatures' in callType) {
                const signatures = (callType as any).getCallSignatures();
                
                for (const signature of signatures) {
                    if (signature.typeParameters) {
                        for (const typeParam of signature.typeParameters) {
                            if (typeParam.constraint) {
                                const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                                if (constraintType.flags & TypeFlags.Kind) {
                                    return {
                                        expectsConstructor: true,
                                        expectedKindArity: (constraintType as any).kindArity,
                                        expectedParameterKinds: (constraintType as any).parameterKinds
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Check if we're in a method call
        if (current.kind === SyntaxKind.PropertyAccessExpression) {
            const propAccess = current as any; // PropertyAccessExpression
            const propType = checker.getTypeAtLocation(propAccess);
            
            if (propType && 'getCallSignatures' in propType) {
                const signatures = (propType as any).getCallSignatures();
                
                for (const signature of signatures) {
                    if (signature.typeParameters) {
                        for (const typeParam of signature.typeParameters) {
                            if (typeParam.constraint) {
                                const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                                if (constraintType.flags & TypeFlags.Kind) {
                                    return {
                                        expectsConstructor: true,
                                        expectedKindArity: (constraintType as any).kindArity,
                                        expectedParameterKinds: (constraintType as any).parameterKinds
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Check if we're in a type reference to a generic function
        if (current.kind === SyntaxKind.TypeReference) {
            const typeRef = current as any; // TypeReferenceNode
            const referencedType = checker.getTypeFromTypeNode(typeRef);
            
            if (referencedType && 'typeParameters' in referencedType) {
                const typeParams = (referencedType as any).typeParameters;
                for (const typeParam of typeParams) {
                    if (typeParam.constraint) {
                        const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                        if (constraintType.flags & TypeFlags.Kind) {
                            return {
                                expectsConstructor: true,
                                expectedKindArity: (constraintType as any).kindArity,
                                expectedParameterKinds: (constraintType as any).parameterKinds
                            };
                        }
                    }
                }
            }
        }
        
        current = current.parent;
    }
    
    return { expectsConstructor: false };
}

/**
 * Extract expected kind from mapped type
 */
function extractExpectedKindFromMappedType(
    node: Node,
    checker: TypeChecker
): { expectsConstructor: boolean; expectedKindArity?: number; expectedParameterKinds?: readonly Type[] } {
    // Look for the mapped type in the parent chain
    let current: Node | undefined = node;
    while (current) {
        if (current.kind === SyntaxKind.MappedType) {
            const mappedType = current as MappedTypeNode;
            if (mappedType.constraintType) {
                const constraintType = checker.getTypeFromTypeNode(mappedType.constraintType);
                if (constraintType.flags & TypeFlags.Kind) {
                    return {
                        expectsConstructor: true,
                        expectedKindArity: (constraintType as any).kindArity,
                        expectedParameterKinds: (constraintType as any).parameterKinds
                    };
                }
            }
        }
        current = current.parent;
    }

    return { expectsConstructor: false };
}

/**
 * Extract expected kind from conditional type
 */
function extractExpectedKindFromConditionalType(
    node: Node,
    checker: TypeChecker
): { expectsConstructor: boolean; expectedKindArity?: number; expectedParameterKinds?: readonly Type[] } {
    // Look for the conditional type in the parent chain
    let current: Node | undefined = node;
    while (current) {
        if (current.kind === 'ConditionalType') {
            const conditionalType = current as ConditionalTypeNode;
            
            // Check the check type
            const checkType = checker.getTypeFromTypeNode(conditionalType.checkType);
            if (checkType.flags & TypeFlags.Kind) {
                return {
                    expectsConstructor: true,
                    expectedKindArity: (checkType as any).kindArity,
                    expectedParameterKinds: (checkType as any).parameterKinds
                };
            }

            // Check the extends type
            const extendsType = checker.getTypeFromTypeNode(conditionalType.extendsType);
            if (extendsType.flags & TypeFlags.Kind) {
                return {
                    expectsConstructor: true,
                    expectedKindArity: (extendsType as any).kindArity,
                    expectedParameterKinds: (extendsType as any).parameterKinds
                };
            }
        }
        current = current.parent;
    }

    return { expectsConstructor: false };
}

/**
 * Helper function to check if a context is kind-sensitive
 * This encapsulates the checks for reusability
 */
export function isKindContext(node: Node, checker: TypeChecker): boolean {
    const context = isKindSensitiveContext(node, checker);
    return context.isKindSensitive;
} 