import {
    Node,
    Type,
    TypeFlags,
    KindTypeNode,
    Symbol,
    NodeFlags,
    KindType,
    TypeChecker,
} from "./types.js";
import { createKindType, createErrorKindType } from "./kindTypeFactory.js";

/**
 * Cache for resolved KindType objects
 * Keyed by node ID for efficient lookup and invalidation
 */
class KindTypeCache {
    private cache = new Map<number, Type>();
    private nodeToKeyMap = new Map<Node, number>();

    /**
     * Get a cached KindType for a node
     */
    get(node: Node): Type | undefined {
        const nodeId = this.getNodeId(node);
        return this.cache.get(nodeId);
    }

    /**
     * Store a KindType in the cache
     */
    set(node: Node, type: Type): void {
        const nodeId = this.getNodeId(node);
        this.cache.set(nodeId, type);
        this.nodeToKeyMap.set(node, nodeId);
        
        // Mark the node as having a cached type
        (node as any).flags |= NodeFlags.TypeCached;
    }

    /**
     * Check if a node has a cached KindType
     */
    has(node: Node): boolean {
        const nodeId = this.getNodeId(node);
        return this.cache.has(nodeId);
    }

    /**
     * Invalidate cache for a specific node
     */
    invalidate(node: Node): void {
        const nodeId = this.getNodeId(node);
        this.cache.delete(nodeId);
        this.nodeToKeyMap.delete(node);
        
        // Clear the TypeCached flag
        (node as any).flags &= ~NodeFlags.TypeCached;
    }

    /**
     * Invalidate all cached types
     */
    clear(): void {
        this.cache.clear();
        this.nodeToKeyMap.clear();
    }

    /**
     * Invalidate cache for nodes that depend on a changed file
     */
    invalidateForFile(filePath: string): void {
        // TODO: Implement file-based invalidation
        // This would require tracking which nodes came from which files
        // For now, we'll clear the entire cache
        this.clear();
    }

    /**
     * Invalidate cache for nodes that have changed type arguments
     */
    invalidateForTypeArgumentChanges(node: KindTypeNode): void {
        // Invalidate this specific node and any nodes that depend on it
        this.invalidate(node);
        
        // TODO: Implement dependency tracking for more granular invalidation
        // This would require tracking which other nodes depend on this one
    }

    /**
     * Get the node ID for caching purposes
     */
    private getNodeId(node: Node): number {
        // Use TypeScript's existing getNodeId function if available
        if (typeof (globalThis as any).getNodeId === 'function') {
            return (globalThis as any).getNodeId(node);
        }
        
        // Fallback: use the node's pos as a simple ID
        return node.pos;
    }

    /**
     * Get cache statistics for debugging
     */
    getStats(): { size: number; hitRate: number } {
        return {
            size: this.cache.size,
            hitRate: 0 // TODO: Implement hit rate tracking
        };
    }
}

// Global instance of the KindType cache
export const kindTypeCache = new KindTypeCache();

/**
 * Helper function to get a cached KindType or compute and cache it
 */
export function getOrCreateKindType(
    node: KindTypeNode,
    computeType: () => KindType,
    checker: TypeChecker
): KindType {
    // Check cache first
    if (kindTypeCache.has(node)) {
        const cachedType = kindTypeCache.get(node);
        if (cachedType && (cachedType.flags & TypeFlags.Kind)) {
            return cachedType as KindType;
        }
    }

    // Compute the type
    const type: KindType = computeType();
    
    // Ensure it's marked as a Kind type
    if (!(type.flags & TypeFlags.Kind)) {
        (type as any).flags |= TypeFlags.Kind;
    }
    
    // Cache the result
    kindTypeCache.set(node, type);
    
    return type;
}

/**
 * Helper function to invalidate cache when type arguments change
 */
export function invalidateKindTypeCache(node: KindTypeNode): void {
    kindTypeCache.invalidateForTypeArgumentChanges(node);
}

/**
 * Helper function to invalidate cache for file changes (watch mode)
 */
export function invalidateKindTypeCacheForFile(filePath: string): void {
    kindTypeCache.invalidateForFile(filePath);
}

/**
 * Clear the entire KindType cache
 */
export function clearKindTypeCache(): void {
    kindTypeCache.clear();
}

/**
 * Integration function for use in checker's getTypeFromTypeNode
 * This function should be called when processing KindTypeNode in the checker
 */
export function resolveKindTypeWithCaching(
    node: KindTypeNode,
    checker: TypeChecker
): KindType {
    return getOrCreateKindType(node, () => {
        // Get the symbol for the kind type
        const symbol = checker.getSymbolAtLocation(node.typeName);
        if (!symbol) {
            // If no symbol found, create an error type with a fallback symbol
            const fallbackSymbol = checker.getSymbolAtLocation(node) || ({} as any);
            return createErrorKindType(checker, fallbackSymbol);
        }

        // Get type arguments if they exist
        const typeArguments: Type[] = node.typeArguments?.map(arg => 
            checker.getTypeFromTypeNode(arg)
        ) || [];

        // Create the KindType with proper arity and parameter kinds
        return createKindType(
            checker, 
            symbol, 
            typeArguments.length, 
            typeArguments
        );
    }, checker);
}

/**
 * Check if a node has been cached and return the cached type if available
 * This integrates with the checker's existing flowTypeCache system
 */
export function getCachedKindType(
    node: KindTypeNode,
    flowTypeCache: Type[] | undefined
): Type | undefined {
    if (node.flags & NodeFlags.TypeCached && flowTypeCache) {
        // Use the checker's existing getNodeId function
        const nodeId = (globalThis as any).getNodeId?.(node) ?? node.pos;
        return flowTypeCache[nodeId];
    }
    return undefined;
}

/**
 * Cache a KindType in the checker's flowTypeCache system
 * This integrates with the existing caching infrastructure
 */
export function cacheKindType(
    node: KindTypeNode,
    type: Type,
    flowTypeCache: Type[] | undefined
): void {
    const cache = flowTypeCache || [];
    const nodeId = (globalThis as any).getNodeId?.(node) ?? node.pos;
    
    cache[nodeId] = type;
    (node as any).flags |= NodeFlags.TypeCached;
} 