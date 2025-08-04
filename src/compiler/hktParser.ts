import {
    TypeParameterDeclaration,
    KindTypeNode,
    SyntaxKind,
    Node,
    TypeNode,
    Identifier,
    TypeReferenceNode,
    TypeParameter,
} from "./types.js";

/**
 * HKT Parser Extensions
 * Handles parsing of higher-kinded type syntax
 */
export namespace HKTParser {
    /**
     * Check if a type parameter declaration has a kind annotation
     */
    export function hasKindAnnotation(declaration: TypeParameterDeclaration): boolean {
        return declaration.kindAnnotation !== undefined;
    }

    /**
     * Extract kind information from a type parameter declaration
     */
    export function extractKindInfo(declaration: TypeParameterDeclaration): {
        arity: number;
        parameterKinds: string[];
        kindSignature: string;
        isHigherKinded: boolean;
    } | undefined {
        if (!declaration.kindAnnotation) {
            return undefined;
        }

        // KindTypeNode extends NodeWithTypeArguments, so we can access typeArguments directly
        const typeArguments = declaration.kindAnnotation.typeArguments || [];
        
        // Handle KindType nodes
        if (declaration.kindAnnotation.kind === SyntaxKind.KindType) {
            // Count the number of type arguments to determine arity
            const arity = typeArguments.length;
            
            // Analyze each type argument to determine its kind
            const parameterKinds: string[] = [];
            let hasPlaceholder = false;
            
            for (const arg of typeArguments) {
                if (arg.kind === SyntaxKind.TypeReference) {
                    const argRef = arg as TypeReferenceNode;
                    const argName = (argRef.typeName as any)?.text || 'unknown';
                    
                    // Check if this is a placeholder (like _)
                    if (argName === '_' || argName === 'Placeholder') {
                        parameterKinds.push('*');
                        hasPlaceholder = true;
                    } else {
                        // This is a concrete type parameter
                        parameterKinds.push('Type');
                    }
                } else if (arg.kind === SyntaxKind.LiteralType) {
                    // Literal types are concrete
                    parameterKinds.push('Type');
                } else if (arg.kind >= SyntaxKind.AnyKeyword && arg.kind <= SyntaxKind.BigIntKeyword) {
                    // Keyword types (string, number, etc.) are concrete
                    parameterKinds.push('Type');
                } else {
                    // Default to Type for unknown cases
                    parameterKinds.push('Type');
                }
            }
            
            // Build kind signature string
            let kindSignature: string;
            if (arity === 0) {
                kindSignature = '*';
            } else if (arity === 1) {
                kindSignature = '* -> *';
            } else if (arity === 2) {
                kindSignature = '* -> * -> *';
            } else {
                kindSignature = `*^${arity} -> *`;
            }
            
            // Check if this is higher-kinded (has at least one type parameter)
            const isHigherKinded = arity > 0;
            
            return {
                arity,
                parameterKinds,
                kindSignature,
                isHigherKinded,
            };
        }
        
        // For other kind types, we'll need to handle them differently
        // This is a simplified fallback for now
        
        // Fallback for unknown kind types
        return {
            arity: 0,
            parameterKinds: [],
            kindSignature: '*',
            isHigherKinded: false,
        };
    }



    /**
     * Check if a type reference represents a partially applied type constructor
     */
    export function isPartiallyAppliedTypeConstructor(
        typeRef: TypeReferenceNode,
        expectedArity: number
    ): boolean {
        const actualArity = typeRef.typeArguments?.length || 0;
        return actualArity > 0 && actualArity < expectedArity;
    }

    /**
     * Create a kind annotation for a type parameter
     */
    export function createKindAnnotation(
        factory: any,
        kindType: TypeReferenceNode
    ): KindTypeNode {
        return factory.createKindType(kindType);
    }

    /**
     * Create a higher-kinded type parameter declaration
     */
    export function createHigherKindedTypeParameter(
        factory: any,
        name: Identifier,
        kindAnnotation: KindTypeNode,
        constraint?: TypeNode,
        defaultType?: TypeNode
    ): TypeParameterDeclaration {
        return factory.createTypeParameterDeclaration(
            undefined, // modifiers
            name,
            constraint,
            defaultType,
            kindAnnotation
        );
    }

    /**
     * Parse kind constraints in type class declarations
     * Handles constraints like: extends Functor<F<_>>, extends Monad<F<_>>
     */
    export function parseKindConstraints(
        parser: any,
        sourceFile: any,
        position: number
    ): TypeReferenceNode[] {
        const constraints: TypeReferenceNode[] = [];
        
        // This would be called during parsing of type class declarations
        // We need to parse the extends clause and extract type class constraints
        
        try {
            // Parse the current token stream to find extends clauses
            let currentToken = parser.getTokenAtPosition(sourceFile, position);
            
            // Look for extends keyword
            while (currentToken && currentToken.kind !== SyntaxKind.ExtendsKeyword) {
                currentToken = parser.nextToken();
            }
            
            if (currentToken && currentToken.kind === SyntaxKind.ExtendsKeyword) {
                // Parse the extends clause
                parser.nextToken(); // consume extends
                
                // Parse comma-separated list of type class constraints
                while (currentToken && currentToken.kind !== SyntaxKind.OpenBraceToken) {
                    if (currentToken.kind === SyntaxKind.Identifier) {
                        // Parse type class name
                        const typeClassName = parser.parseEntityName();
                        
                        // Parse type arguments if present
                        let typeArguments: TypeNode[] = [];
                        if (parser.token === SyntaxKind.LessThanToken) {
                            parser.nextToken(); // consume <
                            
                            while (parser.token !== SyntaxKind.GreaterThanToken) {
                                const typeArg = parser.parseType();
                                typeArguments.push(typeArg);
                                
                                if (parser.token === SyntaxKind.CommaToken) {
                                    parser.nextToken();
                                }
                            }
                            
                            parser.expect(SyntaxKind.GreaterThanToken);
                        }
                        
                        // Create type reference node for the constraint
                        const constraintNode = parser.factory.createTypeReferenceNode(
                            typeClassName,
                            typeArguments
                        );
                        
                        constraints.push(constraintNode);
                        
                        // Check for comma separator
                        if (parser.token === SyntaxKind.CommaToken) {
                            parser.nextToken();
                        }
                    } else {
                        // Skip unexpected tokens
                        parser.nextToken();
                    }
                    
                    currentToken = parser.token;
                }
            }
        } catch (error) {
            // If parsing fails, return empty constraints
            // This allows for graceful error recovery
            // console.warn("Failed to parse kind constraints:", error);
        }
        
        return constraints;
    }

    /**
     * Parse kind constraints from a string representation
     * Useful for testing and debugging
     */
    export function parseKindConstraintsFromString(
        constraintString: string
    ): TypeReferenceNode[] {
        const constraints: TypeReferenceNode[] = [];
        
        // Simple string-based parsing for testing purposes
        const constraintPattern = /(\w+)<([^>]+)>/g;
        let match;
        
        while ((match = constraintPattern.exec(constraintString)) !== null) {
            const typeClassName = match[1];
            const typeArgsString = match[2];
            
            // Parse type arguments
            const typeArgs = typeArgsString.split(',').map(arg => arg.trim());
            const typeArguments: TypeNode[] = typeArgs.map(arg => {
                // Create a simple identifier-based type node
                return {
                    kind: SyntaxKind.TypeReference,
                    typeName: { text: arg },
                    typeArguments: undefined,
                } as unknown as TypeReferenceNode;
            });
            
            // Create constraint node
            const constraintNode = {
                kind: SyntaxKind.TypeReference,
                typeName: { text: typeClassName },
                typeArguments,
            } as unknown as TypeReferenceNode;
            
            constraints.push(constraintNode);
        }
        
        return constraints;
    }

    /**
     * Validate kind constraints
     */
    export function validateKindConstraints(
        constraints: TypeReferenceNode[],
        typeParameter: TypeParameterDeclaration
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Get the kind information for the type parameter
        const kindInfo = extractKindInfo(typeParameter);
        
        if (!kindInfo) {
            errors.push("Cannot determine kind information for type parameter");
            return { isValid: false, errors };
        }
        
        // Validate each constraint
        for (const constraint of constraints) {
            const constraintName = (constraint.typeName as any)?.text || 'unknown';
            
            // Check if the constraint is a valid type class for this kind
            if (!isValidTypeClassForKind(constraintName, kindInfo)) {
                errors.push(`Type class '${constraintName}' is not valid for kind '${kindInfo.kindSignature}'`);
            }
            
            // Validate type arguments in the constraint
            if (constraint.typeArguments) {
                for (let i = 0; i < constraint.typeArguments.length; i++) {
                    const typeArg = constraint.typeArguments[i];
                    const expectedKind = getExpectedKindForTypeClassParameter(constraintName, i);
                    
                    if (expectedKind && !isKindCompatible(typeArg, expectedKind)) {
                        errors.push(`Type argument ${i + 1} in constraint '${constraintName}' has incompatible kind`);
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if a type class is valid for a given kind
     */
    function isValidTypeClassForKind(
        typeClassName: string,
        kindInfo: { arity: number; kindSignature: string }
    ): boolean {
        const typeClassKinds: Record<string, { arity: number; signature: string }> = {
            'Functor': { arity: 1, signature: '* -> *' },
            'Applicative': { arity: 1, signature: '* -> *' },
            'Monad': { arity: 1, signature: '* -> *' },
            'Bifunctor': { arity: 2, signature: '* -> * -> *' },
            'Profunctor': { arity: 2, signature: '* -> * -> *' },
            'Traversable': { arity: 1, signature: '* -> *' },
            'Foldable': { arity: 1, signature: '* -> *' },
            'Semigroup': { arity: 0, signature: '*' },
            'Monoid': { arity: 0, signature: '*' },
            'Eq': { arity: 0, signature: '*' },
            'Ord': { arity: 0, signature: '*' },
        };
        
        const typeClassInfo = typeClassKinds[typeClassName];
        if (!typeClassInfo) {
            return false; // Unknown type class
        }
        
        return typeClassInfo.arity === kindInfo.arity;
    }

    /**
     * Get the expected kind for a type class parameter
     */
    function getExpectedKindForTypeClassParameter(
        typeClassName: string,
        parameterIndex: number
    ): string | undefined {
        const typeClassSignatures: Record<string, string[]> = {
            'Functor': ['* -> *'],
            'Applicative': ['* -> *'],
            'Monad': ['* -> *'],
            'Bifunctor': ['* -> * -> *'],
            'Profunctor': ['* -> * -> *'],
            'Traversable': ['* -> *'],
            'Foldable': ['* -> *'],
        };
        
        const signatures = typeClassSignatures[typeClassName];
        return signatures?.[parameterIndex];
    }

    /**
     * Check if a type argument is compatible with an expected kind
     */
    function isKindCompatible(
        typeArg: TypeNode,
        expectedKind: string
    ): boolean {
        // This is a simplified compatibility check
        // In a full implementation, we'd do more sophisticated kind checking
        
        if (typeArg.kind === SyntaxKind.TypeReference) {
            const typeRef = typeArg as TypeReferenceNode;
            const typeArgs = typeRef.typeArguments || [];
            
            if (expectedKind === '*') {
                return typeArgs.length === 0;
            } else if (expectedKind === '* -> *') {
                return typeArgs.length === 1;
            } else if (expectedKind === '* -> * -> *') {
                return typeArgs.length === 2;
            }
        }
        
        return true; // Default to compatible for unknown cases
    }

    /**
     * Parse kind signatures in function declarations
     * Handles function signatures like: <F<_>, A>(fa: F<A>, f: A -> B): F<B>
     */
    export function parseKindSignature(
        parser: any,
        sourceFile: any,
        position: number
    ): TypeParameterDeclaration[] {
        const typeParameters: TypeParameterDeclaration[] = [];
        
        try {
            // Parse the current token stream to find type parameter list
            let currentToken = parser.getTokenAtPosition(sourceFile, position);
            
            // Look for opening angle bracket
            while (currentToken && currentToken.kind !== SyntaxKind.LessThanToken) {
                currentToken = parser.nextToken();
            }
            
            if (currentToken && currentToken.kind === SyntaxKind.LessThanToken) {
                parser.nextToken(); // consume <
                
                // Parse comma-separated list of type parameters
                while (parser.token !== SyntaxKind.GreaterThanToken) {
                    if (parser.token === SyntaxKind.Identifier) {
                        // Parse type parameter name
                        const parameterName = parser.parseIdentifier();
                        
                        // Parse kind annotation if present
                        let kindAnnotation: KindTypeNode | undefined;
                        if (parser.token === SyntaxKind.ColonToken) {
                            parser.nextToken(); // consume :
                            kindAnnotation = parser.parseType() as KindTypeNode;
                        }
                        
                        // Parse constraint if present
                        let constraint: TypeNode | undefined;
                        if (parser.token === SyntaxKind.ExtendsKeyword) {
                            parser.nextToken(); // consume extends
                            constraint = parser.parseType();
                        }
                        
                        // Parse default type if present
                        let defaultType: TypeNode | undefined;
                        if (parser.token === SyntaxKind.EqualsToken) {
                            parser.nextToken(); // consume =
                            defaultType = parser.parseType();
                        }
                        
                        // Create type parameter declaration
                        const typeParameter = parser.factory.createTypeParameterDeclaration(
                            undefined, // modifiers
                            parameterName,
                            constraint,
                            defaultType,
                            kindAnnotation
                        );
                        
                        typeParameters.push(typeParameter);
                        
                        // Check for comma separator
                        if (parser.token === SyntaxKind.CommaToken) {
                            parser.nextToken();
                        }
                    } else {
                        // Skip unexpected tokens
                        parser.nextToken();
                    }
                }
                
                parser.expect(SyntaxKind.GreaterThanToken);
            }
        } catch (error) {
            // If parsing fails, return empty list
            // This allows for graceful error recovery
        }
        
        return typeParameters;
    }

    /**
     * Parse kind signature from a string representation
     * Useful for testing and debugging
     */
    export function parseKindSignatureFromString(
        signatureString: string
    ): TypeParameterDeclaration[] {
        const typeParameters: TypeParameterDeclaration[] = [];
        
        // Simple string-based parsing for testing purposes
        // Expected format: "F<_>, A, B extends string"
        const parameterPattern = /(\w+)(?:\s*:\s*([^,>]+))?(?:\s+extends\s+([^,>]+))?(?:\s*=\s*([^,>]+))?/g;
        let match;
        
        while ((match = parameterPattern.exec(signatureString)) !== null) {
            const parameterName = match[1];
            const kindAnnotationString = match[2]?.trim();
            const constraintString = match[3]?.trim();
            const defaultTypeString = match[4]?.trim();
            
            // Create kind annotation if present
            let kindAnnotation: KindTypeNode | undefined;
            if (kindAnnotationString) {
                kindAnnotation = {
                    kind: SyntaxKind.KindType,
                    typeArguments: kindAnnotationString.split(',').map(arg => ({
                        kind: SyntaxKind.TypeReference,
                        typeName: { text: arg.trim() },
                        typeArguments: undefined,
                    } as unknown as TypeReferenceNode)),
                } as unknown as KindTypeNode;
            }
            
            // Create constraint if present
            let constraint: TypeNode | undefined;
            if (constraintString) {
                constraint = {
                    kind: SyntaxKind.TypeReference,
                    typeName: { text: constraintString },
                    typeArguments: undefined,
                } as unknown as TypeReferenceNode;
            }
            
            // Create default type if present
            let defaultType: TypeNode | undefined;
            if (defaultTypeString) {
                defaultType = {
                    kind: SyntaxKind.TypeReference,
                    typeName: { text: defaultTypeString },
                    typeArguments: undefined,
                } as unknown as TypeReferenceNode;
            }
            
            // Create type parameter declaration
            const typeParameter = {
                name: { text: parameterName },
                constraint,
                defaultType,
                kindAnnotation,
            } as unknown as TypeParameterDeclaration;
            
            typeParameters.push(typeParameter);
        }
        
        return typeParameters;
    }

    /**
     * Validate kind signature
     */
    export function validateKindSignature(
        typeParameters: TypeParameterDeclaration[]
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        for (const typeParam of typeParameters) {
            // Validate kind annotation if present
            if (typeParam.kindAnnotation) {
                const kindValidation = validateKindAnnotation(typeParam.kindAnnotation);
                if (!kindValidation.isValid) {
                    errors.push(`Invalid kind annotation for parameter '${(typeParam.name as any)?.text}': ${kindValidation.errors.join(', ')}`);
                }
            }
            
            // Validate constraint if present
            if (typeParam.constraint) {
                const constraintValidation = validateTypeConstraint(typeParam.constraint);
                if (!constraintValidation.isValid) {
                    errors.push(`Invalid constraint for parameter '${(typeParam.name as any)?.text}': ${constraintValidation.errors.join(', ')}`);
                }
            }
            
            // Note: TypeParameterDeclaration doesn't have defaultType property in our current implementation
            // This would be added in a future enhancement
        }
        
        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate type constraint
     */
    function validateTypeConstraint(
        constraint: TypeNode
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (constraint.kind === SyntaxKind.TypeReference) {
            const typeRef = constraint as TypeReferenceNode;
            const typeName = (typeRef.typeName as any)?.text;
            
            if (!typeName) {
                errors.push("Type reference must have a valid name");
            }
            
            // Validate type arguments if present
            if (typeRef.typeArguments) {
                for (let i = 0; i < typeRef.typeArguments.length; i++) {
                    const typeArg = typeRef.typeArguments[i];
                    const argValidation = validateTypeConstraint(typeArg);
                    if (!argValidation.isValid) {
                        errors.push(`Type argument ${i + 1} is invalid: ${argValidation.errors.join(', ')}`);
                    }
                }
            }
        } else if (constraint.kind === SyntaxKind.UnionType) {
            const unionType = constraint as any;
            if (unionType.types) {
                for (let i = 0; i < unionType.types.length; i++) {
                    const unionMember = unionType.types[i];
                    const memberValidation = validateTypeConstraint(unionMember);
                    if (!memberValidation.isValid) {
                        errors.push(`Union member ${i + 1} is invalid: ${memberValidation.errors.join(', ')}`);
                    }
                }
            }
        } else if (constraint.kind === SyntaxKind.IntersectionType) {
            const intersectionType = constraint as any;
            if (intersectionType.types) {
                for (let i = 0; i < intersectionType.types.length; i++) {
                    const intersectionMember = intersectionType.types[i];
                    const memberValidation = validateTypeConstraint(intersectionMember);
                    if (!memberValidation.isValid) {
                        errors.push(`Intersection member ${i + 1} is invalid: ${memberValidation.errors.join(', ')}`);
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validate kind annotations
     */
    export function validateKindAnnotation(
        kindAnnotation: KindTypeNode
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Basic validation - in a full implementation, we'd do more thorough checking
        if (!kindAnnotation) {
            errors.push("Kind annotation is required");
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Get the arity of a kind annotation
     */
    export function getKindArity(kindAnnotation: KindTypeNode): number {
        // Simplified implementation
        // In a full implementation, we'd parse the kind type properly
        return 1;
    }

    /**
     * Check if a kind annotation represents a higher-kinded type
     */
    export function isHigherKindedKind(kindAnnotation: KindTypeNode): boolean {
        return getKindArity(kindAnnotation) > 0;
    }

    /**
     * Create a type class constraint
     */
    export function createTypeClassConstraint(
        typeClass: string,
        typeParameter: string,
        kindConstraint: any
    ): any {
        return {
            typeClass,
            typeParameter,
            kindConstraint,
            isSatisfied: false,
        };
    }

    /**
     * Parse a type class instance
     */
    export function parseTypeClassInstance(): any {
        // Placeholder implementation
        return {
            typeClass: undefined,
            typeConstructor: undefined,
            implementation: undefined,
            kindSignature: undefined,
        };
    }
} 