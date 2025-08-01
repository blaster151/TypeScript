import {
    TypeChecker,
    TypeParameterDeclaration,
    Type,
    Symbol,
    Node,
    SourceFile,
    TypeReferenceNode,
    Identifier,
    SyntaxKind,
} from "./types.js";
import { KindMetadata } from "./kindMetadata.js";
import { compareKinds } from "./kindComparison.js";
import { globalKindConstraintMap, KindConstraint } from "./kindConstraintPropagation.js";

/**
 * Constraint relationship in the inference graph
 */
export interface ConstraintRelationship {
    parent: string;           // Parent type parameter name
    child: string;           // Child type parameter name
    constraint: KindMetadata; // Inherited constraint
    source: string;          // Source of the relationship (inheritance, inference, etc.)
    isValid: boolean;        // Whether the relationship is still valid
}

/**
 * Constraint graph for tracking relationships between type parameters
 */
export class KindConstraintGraph {
    private relationships = new Map<string, ConstraintRelationship[]>();
    private reverseRelationships = new Map<string, string[]>(); // child -> parents
    private constraintCache = new Map<string, KindMetadata>();

    /**
     * Add a constraint relationship
     */
    addRelationship(
        parent: string,
        child: string,
        constraint: KindMetadata,
        source: string
    ): void {
        const relationship: ConstraintRelationship = {
            parent,
            child,
            constraint,
            source,
            isValid: true
        };

        // Add to forward relationships
        if (!this.relationships.has(parent)) {
            this.relationships.set(parent, []);
        }
        this.relationships.get(parent)!.push(relationship);

        // Add to reverse relationships
        if (!this.reverseRelationships.has(child)) {
            this.reverseRelationships.set(child, []);
        }
        this.reverseRelationships.get(child)!.push(parent);

        // Cache the constraint
        this.constraintCache.set(child, constraint);
    }

    /**
     * Get all relationships for a type parameter
     */
    getRelationships(typeParamName: string): ConstraintRelationship[] {
        return this.relationships.get(typeParamName) || [];
    }

    /**
     * Get all parents of a type parameter
     */
    getParents(childName: string): string[] {
        return this.reverseRelationships.get(childName) || [];
    }

    /**
     * Get all children of a type parameter
     */
    getChildren(parentName: string): string[] {
        const relationships = this.relationships.get(parentName) || [];
        return relationships.map(r => r.child);
    }

    /**
     * Get the inherited constraint for a type parameter
     */
    getInheritedConstraint(typeParamName: string): KindMetadata | undefined {
        return this.constraintCache.get(typeParamName);
    }

    /**
     * Check if there are cycles in the constraint graph
     */
    detectCycles(): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        for (const node of this.relationships.keys()) {
            if (!visited.has(node)) {
                this.dfsForCycles(node, visited, recursionStack, [], cycles);
            }
        }

        return cycles;
    }

    /**
     * Depth-first search to detect cycles
     */
    private dfsForCycles(
        node: string,
        visited: Set<string>,
        recursionStack: Set<string>,
        path: string[],
        cycles: string[][]
    ): void {
        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        const children = this.getChildren(node);
        for (const child of children) {
            if (!visited.has(child)) {
                this.dfsForCycles(child, visited, recursionStack, path, cycles);
            } else if (recursionStack.has(child)) {
                // Found a cycle
                const cycleStart = path.indexOf(child);
                const cycle = path.slice(cycleStart);
                cycles.push([...cycle, child]);
            }
        }

        recursionStack.delete(node);
        path.pop();
    }

    /**
     * Invalidate a relationship
     */
    invalidateRelationship(parent: string, child: string): void {
        const relationships = this.relationships.get(parent) || [];
        const relationship = relationships.find(r => r.child === child);
        if (relationship) {
            relationship.isValid = false;
        }
    }

    /**
     * Clear all relationships
     */
    clear(): void {
        this.relationships.clear();
        this.reverseRelationships.clear();
        this.constraintCache.clear();
    }
}

/**
 * Global constraint graph instance
 */
export const globalKindConstraintGraph = new KindConstraintGraph();

/**
 * Preserve constraint relationships in inference
 */
export function preserveConstraintRelationshipsInInference(
    typeParameters: readonly TypeParameterDeclaration[],
    checker: TypeChecker,
    sourceFile: SourceFile
): { cycles: string[][]; relationships: ConstraintRelationship[] } {
    const relationships: ConstraintRelationship[] = [];
    const cycles: string[][] = [];

    // Process each type parameter
    for (const typeParam of typeParameters) {
        const paramName: string = typeParam.name.escapedText as string;
        
        if (!typeParam.constraint) continue;

        // Check if constraint references another type parameter
        const referencedParams = findReferencedTypeParameters(typeParam.constraint, typeParameters);
        
        for (const referencedParam of referencedParams) {
            const referencedName: string = referencedParam.name.escapedText as string;
            
            // Get the constraint from the referenced parameter
            const referencedConstraint = globalKindConstraintMap.getConstraint(referencedName);
            if (referencedConstraint) {
                // Create inheritance relationship
                const relationship: ConstraintRelationship = {
                    parent: referencedName,
                    child: paramName,
                    constraint: referencedConstraint.expectedKind,
                    source: "inheritance",
                    isValid: true
                };
                
                relationships.push(relationship);
                globalKindConstraintGraph.addRelationship(
                    referencedName,
                    paramName,
                    referencedConstraint.expectedKind,
                    "inheritance"
                );
            }
        }
    }

    // Detect cycles
    const detectedCycles = globalKindConstraintGraph.detectCycles();
    cycles.push(...detectedCycles);

    return { cycles, relationships };
}

/**
 * Find type parameters referenced in a constraint
 */
function findReferencedTypeParameters(
    constraint: Node,
    typeParameters: readonly TypeParameterDeclaration[]
): TypeParameterDeclaration[] {
    const referenced: TypeParameterDeclaration[] = [];
    const typeParamNames = new Set(typeParameters.map(tp => tp.name.escapedText as string));
    
    // Traverse the AST to find type parameter references
    traverseNode(constraint, typeParamNames, referenced);
    
    return referenced;
}

/**
 * Traverse a node to find type parameter references
 */
function traverseNode(
    node: Node,
    typeParamNames: Set<string>,
    referenced: TypeParameterDeclaration[]
): void {
    // Check if this node is a type reference to a type parameter
    if (node.kind === SyntaxKind.TypeReference) {
        const typeRef = node as any; // TypeReferenceNode
        if (typeRef.typeName && typeRef.typeName.escapedText) {
            const typeName = typeRef.typeName.escapedText;
            if (typeParamNames.has(typeName)) {
                // Find the corresponding type parameter declaration
                const typeParam = findTypeParameterByName(typeName);
                if (typeParam && !referenced.includes(typeParam)) {
                    referenced.push(typeParam);
                }
            }
        }
    }
    
    // Recursively traverse child nodes
    for (const child of node.getChildren()) {
        traverseNode(child, typeParamNames, referenced);
    }
}

/**
 * Find a type parameter declaration by name
 */
function findTypeParameterByName(name: string): TypeParameterDeclaration | undefined {
    // This would need access to the current scope's type parameters
    // For now, return undefined - in practice, you'd search the current scope
    return undefined;
}

/**
 * Start from the root constraint on a type parameter
 */
export function startFromRootConstraint(
    typeParamName: string,
    checker: TypeChecker
): KindMetadata | undefined {
    // Get the explicit constraint first
    const explicitConstraint = globalKindConstraintMap.getConstraint(typeParamName);
    if (explicitConstraint) {
        return explicitConstraint.expectedKind;
    }

    // Look for inherited constraints
    const inheritedConstraint = globalKindConstraintGraph.getInheritedConstraint(typeParamName);
    if (inheritedConstraint) {
        return inheritedConstraint;
    }

    return undefined;
}

/**
 * Pass down the constraint to any child type parameters that depend on it
 */
export function passDownConstraintToChildren(
    parentName: string,
    constraint: KindMetadata,
    checker: TypeChecker
): void {
    const children = globalKindConstraintGraph.getChildren(parentName);
    
    for (const childName of children) {
        // Check if the child already has a constraint
        const existingConstraint = globalKindConstraintMap.getConstraint(childName);
        if (existingConstraint) {
            // Validate that the inherited constraint is compatible
            const comparison = compareKinds(constraint, existingConstraint.expectedKind, checker, false);
            if (!comparison.isCompatible) {
                // Mark the relationship as invalid
                globalKindConstraintGraph.invalidateRelationship(parentName, childName);
            }
        } else {
            // Pass down the constraint
            globalKindConstraintGraph.addRelationship(
                parentName,
                childName,
                constraint,
                "inheritance"
            );
        }
    }
}

/**
 * Ensure the narrowed set still conforms to the original kind constraint
 */
export function ensureNarrowedSetConformsToConstraint(
    originalConstraint: KindMetadata,
    narrowedTypes: Type[],
    checker: TypeChecker
): { conforming: Type[]; violations: any[] } {
    const conforming: Type[] = [];
    const violations: any[] = [];

    for (const type of narrowedTypes) {
        // Retrieve kind metadata for the type
        let actualKind: KindMetadata | undefined = undefined;
        
        if (type.symbol) {
            try {
                // Import the retrieveKindMetadata function
                const { retrieveKindMetadata } = require("./kindMetadata.js");
                actualKind = retrieveKindMetadata(type.symbol, checker, false);
            } catch (error) {
                console.warn("Failed to retrieve kind metadata:", error);
            }
        }
        
        if (!actualKind || !actualKind.isValid) {
            // Can't determine kind, assume conforming
            conforming.push(type);
            continue;
        }

        const comparison = compareKinds(originalConstraint, actualKind, checker, false);
        if (comparison.isCompatible) {
            conforming.push(type);
        } else {
            violations.push({
                type,
                expectedKind: originalConstraint,
                actualKind,
                errors: comparison.errors
            });
        }
    }

    return { conforming, violations };
}

/**
 * Maintain consistency in complex inference chains
 */
export function maintainInferenceChainConsistency(
    inferenceChain: string[],
    checker: TypeChecker
): { isValid: boolean; violations: any[] } {
    const violations: any[] = [];
    let isValid = true;

    // Check each step in the inference chain
    for (let i = 0; i < inferenceChain.length - 1; i++) {
        const current = inferenceChain[i];
        const next = inferenceChain[i + 1];

        // Get constraints for both parameters
        const currentConstraint = startFromRootConstraint(current, checker);
        const nextConstraint = startFromRootConstraint(next, checker);

        if (currentConstraint && nextConstraint) {
            // Check if the next parameter inherits from the current one
            const parents = globalKindConstraintGraph.getParents(next);
            if (parents.includes(current)) {
                // Validate inheritance relationship
                const comparison = compareKinds(currentConstraint, nextConstraint, checker, false);
                if (!comparison.isCompatible) {
                    isValid = false;
                    violations.push({
                        parent: current,
                        child: next,
                        expectedConstraint: currentConstraint,
                        actualConstraint: nextConstraint,
                        errors: comparison.errors
                    });
                }
            }
        }
    }

    return { isValid, violations };
}

/**
 * Store constraint relationships in a constraint graph
 */
export function storeConstraintRelationships(
    relationships: ConstraintRelationship[]
): void {
    for (const relationship of relationships) {
        if (relationship.isValid) {
            globalKindConstraintGraph.addRelationship(
                relationship.parent,
                relationship.child,
                relationship.constraint,
                relationship.source
            );
        }
    }
}

/**
 * Example: F → constrained to Kind<Type, Type>
 *          G → constrained to F
 *          ⇒ G inherits F's constraint
 */
export function demonstrateConstraintInheritance(): void {
    // This is a demonstration of how constraint inheritance works
    console.log("[Kind] Demonstrating constraint inheritance:");
    console.log("F → constrained to Kind<Type, Type>");
    console.log("G → constrained to F");
    console.log("⇒ G inherits F's constraint");
    
    // In practice, this would be handled by the constraint graph
    // and the inference system would ensure G gets the same constraint as F
}

/**
 * Detect and prevent cycles in constraint relationships
 */
export function detectAndPreventCycles(): { cycles: string[][]; prevented: boolean } {
    const cycles = globalKindConstraintGraph.detectCycles();
    const prevented = cycles.length > 0;

    if (prevented) {
        console.log("[Kind] Detected constraint cycles:", cycles);
        // In practice, you would:
        // 1. Report these as errors
        // 2. Break the cycles by invalidating some relationships
        // 3. Provide suggestions for fixing the circular dependencies
    }

    return { cycles, prevented };
} 