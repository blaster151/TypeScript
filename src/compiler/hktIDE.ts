import {
    Type,
    TypeParameter,
    TypeParameterDeclaration,
    KindTypeNode,
    TypeNode,
    Symbol,
    TypeChecker,
    TypeReferenceNode,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";
import {
    HigherKindedTypeParameter,
    HKTOperations,
    TypeClassConstraint,
    TypeClassInstance,
} from "./hktTypes.js";

/**
 * HKT IDE Integration
 * Provides hover, completion, and quick info for higher-kinded types
 */
export namespace HKTIDE {
    /**
     * Get hover information for a type parameter
     */
    export function getHoverInfo(
        typeParam: TypeParameterDeclaration,
        checker: TypeChecker
    ): string {
        const lines: string[] = [];
        
        // Basic type parameter info
        lines.push(`**Type Parameter:** ${(typeParam.name as any).text || typeParam.name}`);
        
        // Kind information
        if (typeParam.kindAnnotation) {
            const kindInfo = getKindDisplayInfo(typeParam.kindAnnotation, checker);
            lines.push(`**Kind:** ${kindInfo}`);
        }
        
        // Constraint information
        if (typeParam.constraint) {
            const constraintText = checker.typeToString(typeParam.constraint as any);
            lines.push(`**Constraint:** ${constraintText}`);
        }
        
        // Default information
        if (typeParam.default) {
            const defaultText = checker.typeToString(typeParam.default as any);
            lines.push(`**Default:** ${defaultText}`);
        }
        
        return lines.join('\n\n');
    }

    /**
     * Get completion suggestions for type class instances
     */
    export function getTypeClassCompletions(
        typeClass: Symbol,
        typeConstructor: Type,
        checker: TypeChecker
    ): Array<{ name: string; kind: string; description: string }> {
        const completions: Array<{ name: string; kind: string; description: string }> = [];
        
        // Get available instances for the type class
        const instances = getAvailableInstances(typeClass, typeConstructor, checker);
        
        for (const instance of instances) {
            completions.push({
                name: instance.name,
                kind: instance.kind,
                description: instance.description,
            });
        }
        
        return completions;
    }

    /**
     * Get quick info for a higher-kinded type parameter
     */
    export function getQuickInfo(
        typeParam: TypeParameter,
        checker: TypeChecker
    ): string {
        if (!HKTOperations.isHigherKindedTypeParameter(typeParam)) {
            return checker.typeToString(typeParam);
        }

        const hktParam = typeParam as HigherKindedTypeParameter;
        const lines: string[] = [];
        
        lines.push(`**Higher-Kinded Type Parameter:** ${(hktParam.symbol as any).name || 'unknown'}`);
        
        if (hktParam.kindMetadata) {
            lines.push(`**Kind:** ${getKindDisplayString(hktParam.kindMetadata)}`);
        }
        
        if (hktParam.constraint) {
            lines.push(`**Constraint:** ${checker.typeToString(hktParam.constraint)}`);
        }
        
        return lines.join('\n\n');
    }

    /**
     * Get kind display information
     */
    export function getKindDisplayInfo(
        kindAnnotation: KindTypeNode,
        checker: TypeChecker
    ): string {
        // Simplified implementation
        // In a full implementation, we'd parse the kind annotation properly
        return "Type -> Type";
    }

    /**
     * Get kind display string
     */
    export function getKindDisplayString(kindMetadata: KindMetadata): string {
        const arity = kindMetadata.arity;
        
        if (arity === 0) {
            return "Type";
        } else if (arity === 1) {
            return "Type -> Type";
        } else if (arity === 2) {
            return "Type -> Type -> Type";
        } else {
            return `Type^${arity} -> Type`;
        }
    }

    /**
     * Get available type class instances
     */
    export function getAvailableInstances(
        typeClass: Symbol,
        typeConstructor: Type,
        checker: TypeChecker
    ): Array<{ name: string; kind: string; description: string }> {
        const instances: Array<{ name: string; kind: string; description: string }> = [];
        
        // Get the type class name
        const typeClassName = (typeClass as any).name || 'unknown';
        
        // Get the kind signature for the type constructor
        const kindSignature = getKindForType(checker, typeConstructor);
        if (!kindSignature) {
            return instances;
        }

        // Search for instances in different scopes
        const allInstances = searchForTypeClassInstances(typeClass, typeConstructor, checker);
        
        // Filter and format instances
        for (const instance of allInstances) {
            // Check if the instance is applicable
            if (isInstanceApplicable(instance, typeConstructor, kindSignature, checker)) {
                instances.push({
                    name: (instance as any).name || 'unknown',
                    kind: typeClassName,
                    description: formatInstanceDescription(instance, typeClassName),
                });
            }
        }

        // Add built-in instances if applicable
        const builtinInstances = getBuiltinInstances(typeClassName, typeConstructor, checker);
        instances.push(...builtinInstances);

        // Sort instances by relevance
        instances.sort((a, b) => {
            // Prefer exact matches
            const aExact = a.name === checker.typeToString(typeConstructor);
            const bExact = b.name === checker.typeToString(typeConstructor);
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            // Then by name
            return a.name.localeCompare(b.name);
        });

        return instances;
    }

    /**
     * Search for type class instances in various scopes
     */
    function searchForTypeClassInstances(
        typeClass: Symbol,
        typeConstructor: Type,
        checker: TypeChecker
    ): any[] {
        const instances: any[] = [];

        // Search in current module scope
        const moduleInstances = searchModuleScope(typeClass, typeConstructor, checker);
        instances.push(...moduleInstances);

        // Search in imported modules
        const importedInstances = searchImportedModules(typeClass, typeConstructor, checker);
        instances.push(...importedInstances);

        // Search in global scope
        const globalInstances = searchGlobalScope(typeClass, typeConstructor, checker);
        instances.push(...globalInstances);

        return instances;
    }

    /**
     * Search for instances in the current module scope
     */
    function searchModuleScope(
        typeClass: Symbol,
        typeConstructor: Type,
        checker: TypeChecker
    ): any[] {
        const instances: any[] = [];
        
        // Simplified implementation - in a full implementation, we'd search through
        // the current module's symbols using the proper TypeScript API
        // For now, return an empty array
        return instances;
    }

    /**
     * Search for instances in imported modules
     */
    function searchImportedModules(
        typeClass: Symbol,
        typeConstructor: Type,
        checker: TypeChecker
    ): any[] {
        const instances: any[] = [];
        
        // This would require more complex module resolution
        // For now, return an empty array
        return instances;
    }

    /**
     * Search for instances in global scope
     */
    function searchGlobalScope(
        typeClass: Symbol,
        typeConstructor: Type,
        checker: TypeChecker
    ): any[] {
        const instances: any[] = [];
        
        // Simplified implementation - in a full implementation, we'd search through
        // global symbols using the proper TypeScript API
        // For now, return an empty array
        return instances;
    }

    /**
     * Check if a symbol is a type class instance
     */
    function isTypeClassInstance(
        symbol: Symbol,
        typeClass: Symbol,
        typeConstructor: Type,
        checker: TypeChecker
    ): boolean {
        // Check if the symbol has type class instance metadata
        const instanceMetadata = (symbol as any).typeClassInstance;
        if (!instanceMetadata) {
            return false;
        }

        // Check if it's for the right type class
        if (instanceMetadata.typeClass !== typeClass) {
            return false;
        }

        // Check if the type constructor matches
        return checker.isTypeAssignableTo(typeConstructor, instanceMetadata.typeConstructor);
    }

    /**
     * Check if an instance is applicable
     */
    function isInstanceApplicable(
        instance: any,
        typeConstructor: Type,
        kindSignature: KindMetadata,
        checker: TypeChecker
    ): boolean {
        // Check type compatibility
        if (!checker.isTypeAssignableTo(typeConstructor, instance.typeConstructor)) {
            return false;
        }

        // Check kind compatibility
        const instanceKind = getKindForType(checker, instance.typeConstructor);
        if (!instanceKind || !areKindsCompatible(kindSignature, instanceKind)) {
            return false;
        }

        return true;
    }

    /**
     * Get built-in instances
     */
    function getBuiltinInstances(
        typeClassName: string,
        typeConstructor: Type,
        checker: TypeChecker
    ): Array<{ name: string; kind: string; description: string }> {
        const instances: Array<{ name: string; kind: string; description: string }> = [];
        const typeName = checker.typeToString(typeConstructor);

        // Built-in instances for common type classes
        const builtinInstances: Record<string, Array<{ name: string; description: string }>> = {
            'Functor': [
                { name: 'Array', description: 'Built-in array functor instance' },
                { name: 'Maybe', description: 'Built-in maybe functor instance' },
                { name: 'Either', description: 'Built-in either functor instance' },
                { name: 'List', description: 'Built-in list functor instance' },
                { name: 'Set', description: 'Built-in set functor instance' },
                { name: 'Map', description: 'Built-in map functor instance' },
            ],
            'Applicative': [
                { name: 'Array', description: 'Built-in array applicative instance' },
                { name: 'Maybe', description: 'Built-in maybe applicative instance' },
                { name: 'Either', description: 'Built-in either applicative instance' },
                { name: 'Promise', description: 'Built-in promise applicative instance' },
            ],
            'Monad': [
                { name: 'Array', description: 'Built-in array monad instance' },
                { name: 'Maybe', description: 'Built-in maybe monad instance' },
                { name: 'Either', description: 'Built-in either monad instance' },
                { name: 'Promise', description: 'Built-in promise monad instance' },
                { name: 'IO', description: 'Built-in IO monad instance' },
            ],
            'Bifunctor': [
                { name: 'Either', description: 'Built-in either bifunctor instance' },
                { name: 'Tuple', description: 'Built-in tuple bifunctor instance' },
                { name: 'Pair', description: 'Built-in pair bifunctor instance' },
            ],
            'Profunctor': [
                { name: 'Function', description: 'Built-in function profunctor instance' },
                { name: 'Reader', description: 'Built-in reader profunctor instance' },
            ],
        };

        const typeClassInstances = builtinInstances[typeClassName] || [];
        
        // Filter instances that might be applicable based on type name
        for (const instance of typeClassInstances) {
            if (typeName.includes(instance.name) || 
                typeName.toLowerCase().includes(instance.name.toLowerCase())) {
                instances.push({
                    name: instance.name,
                    kind: typeClassName,
                    description: instance.description,
                });
            }
        }

        return instances;
    }

    /**
     * Format instance description
     */
    function formatInstanceDescription(instance: any, typeClassName: string): string {
        const source = instance.source || 'unknown';
        return `${instance.name} ${typeClassName} instance (from ${source})`;
    }

    /**
     * Check if two kinds are compatible
     */
    function areKindsCompatible(kind1: KindMetadata, kind2: KindMetadata): boolean {
        // Simple compatibility check based on arity
        return kind1.arity === kind2.arity;
    }

    /**
     * Get kind for type (simplified version)
     */
    function getKindForType(checker: TypeChecker, type: Type): KindMetadata | undefined {
        // This is a simplified implementation
        // In a full implementation, we'd use the proper kind inference
        return {
            arity: 0,
            parameterKinds: [],
            retrievedFrom: 0,
            symbol: type.symbol!,
            isValid: true,
        };
    }

    /**
     * Get type class method completions
     */
    export function getTypeClassMethodCompletions(
        typeClass: Symbol
    ): Array<{ name: string; signature: string; description: string }> {
        const methods: Array<{ name: string; signature: string; description: string }> = [];
        
        // Common type class methods
        const typeClassName = (typeClass as any).name || 'unknown';
        
        switch (typeClassName) {
            case 'Functor':
                methods.push(
                    {
                        name: 'map',
                        signature: '<A, B>(fa: F<A>, f: (a: A) => B): F<B>',
                        description: 'Map a function over a functor',
                    }
                );
                break;
                
            case 'Applicative':
                methods.push(
                    {
                        name: 'of',
                        signature: '<A>(a: A): F<A>',
                        description: 'Lift a value into an applicative',
                    },
                    {
                        name: 'ap',
                        signature: '<A, B>(fab: F<(a: A) => B>, fa: F<A>): F<B>',
                        description: 'Apply a function in an applicative context',
                    }
                );
                break;
                
            case 'Monad':
                methods.push(
                    {
                        name: 'chain',
                        signature: '<A, B>(fa: F<A>, f: (a: A) => F<B>): F<B>',
                        description: 'Chain computations in a monadic context',
                    }
                );
                break;
                
            case 'Bifunctor':
                methods.push(
                    {
                        name: 'bimap',
                        signature: '<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>',
                        description: 'Map over both sides of a bifunctor',
                    },
                    {
                        name: 'mapLeft',
                        signature: '<A, B, C>(fab: F<A, B>, f: (a: A) => C): F<C, B>',
                        description: 'Map over the left side of a bifunctor',
                    }
                );
                break;
                
            case 'Profunctor':
                methods.push(
                    {
                        name: 'dimap',
                        signature: '<A, B, C, D>(p: F<A, B>, f: (c: C) => A, g: (b: B) => D): F<C, D>',
                        description: 'Map over both sides of a profunctor',
                    },
                    {
                        name: 'lmap',
                        signature: '<A, B, C>(p: F<A, B>, f: (c: C) => A): F<C, B>',
                        description: 'Map over the left side of a profunctor',
                    },
                    {
                        name: 'rmap',
                        signature: '<A, B, D>(p: F<A, B>, g: (b: B) => D): F<A, D>',
                        description: 'Map over the right side of a profunctor',
                    }
                );
                break;
        }
        
        return methods;
    }

    /**
     * Get kind inference suggestions
     */
    export function getKindInferenceSuggestions(
        typeConstructor: Type,
        checker: TypeChecker
    ): Array<{ kind: string; confidence: number; description: string }> {
        const suggestions: Array<{ kind: string; confidence: number; description: string }> = [];
        
        const typeName = checker.typeToString(typeConstructor);
        
        // Simple heuristics for kind inference
        if (typeName.includes("Array") || typeName.includes("[]")) {
            suggestions.push({
                kind: "Type -> Type",
                confidence: 0.9,
                description: "Array-like types typically have kind Type -> Type",
            });
        }
        
        if (typeName.includes("Either") || typeName.includes("Result")) {
            suggestions.push({
                kind: "Type -> Type -> Type",
                confidence: 0.8,
                description: "Either-like types typically have kind Type -> Type -> Type",
            });
        }
        
        if (typeName.includes("Function") || typeName.includes("=>")) {
            suggestions.push({
                kind: "Type -> Type -> Type",
                confidence: 0.7,
                description: "Function types typically have kind Type -> Type -> Type",
            });
        }
        
        return suggestions;
    }

    /**
     * Get type class constraint suggestions
     */
    export function getTypeClassConstraintSuggestions(
        typeParameter: TypeParameter,
        checker: TypeChecker
    ): Array<{ typeClass: string; description: string }> {
        const suggestions: Array<{ typeClass: string; description: string }> = [];
        
        // Common type class suggestions
        suggestions.push(
            {
                typeClass: "Functor",
                description: "For types that can be mapped over",
            },
            {
                typeClass: "Applicative",
                description: "For types that can lift values and apply functions",
            },
            {
                typeClass: "Monad",
                description: "For types that can chain computations",
            }
        );
        
        // Add suggestions based on the type parameter
        if (HKTOperations.isHigherKindedTypeParameter(typeParameter)) {
            const hktParam = typeParameter as HigherKindedTypeParameter;
            
            if (hktParam.kindArity === 2) {
                suggestions.push(
                    {
                        typeClass: "Bifunctor",
                        description: "For binary type constructors",
                    },
                    {
                        typeClass: "Profunctor",
                        description: "For contravariant-covariant type constructors",
                    }
                );
            }
        }
        
        return suggestions;
    }
} 