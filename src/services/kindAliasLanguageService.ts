import {
    SourceFile,
    Node,
    TypeChecker,
    CompletionEntry,
    QuickInfo,
    CompletionInfo,
    CompletionEntryDetails,
    Symbol,
    SyntaxKind,
    TypeReferenceNode,
    Position
} from "./types.js";
import { 
    isBuiltInKindAlias, 
    retrieveBuiltInKindMetadata, 
    isBuiltInFPPattern 
} from "../compiler/kindAliasMetadata.js";
import { 
    getExpandedKindSignature,
    isBuiltInKindAliasSymbol 
} from "../compiler/kindMetadata.js";

/**
 * Registry of kind alias information for language service
 */
interface KindAliasInfo {
    name: string;
    displayName: string;
    description: string;
    kindSignature: string;
    sortText: string;
    priority: number;
    isFPPattern: boolean;
    kindConstraint?: {
        expectedArity: number;
        constraintDescription: string;
    };
}

const KIND_ALIAS_REGISTRY = new Map<string, KindAliasInfo>([
    ["Functor", {
        name: "Functor",
        displayName: "Functor",
        description: "Alias for Kind<Type, Type>. Unary type constructor supporting map.",
        kindSignature: "Kind<Type, Type>",
        sortText: "1", // Highest priority
        priority: 1,
        isFPPattern: false
    }],
    ["Bifunctor", {
        name: "Bifunctor", 
        displayName: "Bifunctor",
        description: "Alias for Kind<Type, Type, Type>. Binary type constructor supporting bimap.",
        kindSignature: "Kind<Type, Type, Type>",
        sortText: "2", // High priority
        priority: 2,
        isFPPattern: false
    }],
    ["Free", {
        name: "Free",
        displayName: "Free",
        description: "Free monad over a functor",
        kindSignature: "Kind<Kind<Type, Type>, Type>",
        sortText: "4", // High priority for FP patterns
        priority: 4,
        isFPPattern: true,
        kindConstraint: {
            expectedArity: 2,
            constraintDescription: "F must be a unary functor (Kind<Type, Type>)"
        }
    }],
    ["Fix", {
        name: "Fix",
        displayName: "Fix",
        description: "Fixed point of a functor",
        kindSignature: "Kind<Kind<Type, Type>>",
        sortText: "5", // High priority for FP patterns
        priority: 5,
        isFPPattern: true,
        kindConstraint: {
            expectedArity: 2,
            constraintDescription: "F must be a unary functor (Kind<Type, Type>)"
        }
    }]
]);

/**
 * Check if the current context expects a unary functor
 */
export function expectsUnaryFunctor(
    node: Node,
    position: number,
    sourceFile: SourceFile
): boolean {
    // Check if we're in a type argument position for Free or Fix
    if (node.kind === SyntaxKind.TypeReference) {
        const typeRef = node as TypeReferenceNode;
        if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
            const parentTypeName = (typeRef.typeName as any)?.escapedText;
            if (parentTypeName === "Free" || parentTypeName === "Fix") {
                return true;
            }
        }
    }
    
    // Check if we're in a type parameter constraint
    if (node.parent?.kind === SyntaxKind.TypeParameter) {
        const constraint = (node.parent as any).constraint;
        if (constraint) {
            const constraintText = constraint.getText(sourceFile);
            if (constraintText.includes("Functor") || constraintText.includes("Kind<Type, Type>")) {
                return true;
            }
        }
    }
    
    // Check if we're in a generic constraint context
    if (node.parent?.kind === SyntaxKind.TypeReference) {
        const parentTypeRef = node.parent as TypeReferenceNode;
        const parentTypeName = (parentTypeRef.typeName as any)?.escapedText;
        if (parentTypeName === "Free" || parentTypeName === "Fix") {
            return true;
        }
    }
    
    return false;
}

/**
 * Get kind alias completions for the current context
 */
export function getKindAliasCompletions(
    position: number,
    sourceFile: SourceFile,
    checker: TypeChecker
): CompletionEntry[] {
    const completions: CompletionEntry[] = [];
    const node = getNodeAtPosition(sourceFile, position);
    
    if (!node) {
        return completions;
    }
    
    // Check if we're in a kind-sensitive context
    const isKindSensitive = isInKindSensitiveContext(node, position, sourceFile);
    const expectsUnary = expectsUnaryFunctor(node, position, sourceFile);
    
    for (const [aliasName, aliasInfo] of KIND_ALIAS_REGISTRY) {
        // Filter based on context
        if (isKindSensitive) {
            // In kind-sensitive context, show all aliases
            completions.push(createCompletionEntry(aliasInfo, expectsUnary));
        } else if (aliasInfo.isFPPattern && expectsUnary) {
            // Show FP patterns only when unary functor is expected
            completions.push(createCompletionEntry(aliasInfo, expectsUnary));
        } else if (!aliasInfo.isFPPattern) {
            // Show basic aliases in general contexts
            completions.push(createCompletionEntry(aliasInfo, expectsUnary));
        }
    }
    
    // Sort by priority (lower number = higher priority)
    return completions.sort((a, b) => {
        const aInfo = KIND_ALIAS_REGISTRY.get(a.name);
        const bInfo = KIND_ALIAS_REGISTRY.get(b.name);
        return (aInfo?.priority || 999) - (bInfo?.priority || 999);
    });
}

/**
 * Get completion details for a kind alias
 */
export function getKindAliasCompletionDetails(
    name: string,
    sourceFile: SourceFile
): CompletionEntryDetails | undefined {
    const aliasInfo = KIND_ALIAS_REGISTRY.get(name);
    if (!aliasInfo) {
        return undefined;
    }
    
    return {
        name,
        displayParts: [
            { text: aliasInfo.displayName, kind: "keyword" },
            { text: " - ", kind: "space" },
            { text: aliasInfo.description, kind: "text" },
            { text: " (", kind: "punctuation" },
            { text: aliasInfo.kindSignature, kind: "typeParameter" },
            { text: ")", kind: "punctuation" }
        ],
        documentation: [
            {
                text: aliasInfo.description,
                kind: "text"
            }
        ],
        tags: [
            {
                name: "kind",
                text: aliasInfo.kindSignature
            }
        ]
    };
}

/**
 * Get quick info for a kind alias
 */
export function getKindAliasQuickInfo(
    node: Node,
    sourceFile: SourceFile,
    checker: TypeChecker
): QuickInfo | undefined {
    if (node.kind !== SyntaxKind.TypeReference) {
        return undefined;
    }
    
    const typeRef = node as TypeReferenceNode;
    const typeName = (typeRef.typeName as any)?.escapedText;
    
    if (!typeName || !KIND_ALIAS_REGISTRY.has(typeName)) {
        return undefined;
    }
    
    const aliasInfo = KIND_ALIAS_REGISTRY.get(typeName)!;
    const symbol = checker.getSymbolAtLocation(typeRef.typeName);
    
    return {
        kind: "type",
        kindModifiers: "alias",
        textSpan: {
            start: typeRef.getStart(sourceFile),
            length: typeRef.getWidth(sourceFile)
        },
        displayParts: [
            { text: "type ", kind: "keyword" },
            { text: aliasInfo.displayName, kind: "aliasName" },
            { text: " = ", kind: "operator" },
            { text: aliasInfo.kindSignature, kind: "typeParameter" }
        ],
        documentation: [
            {
                text: aliasInfo.description,
                kind: "text"
            }
        ],
        tags: [
            {
                name: "kind",
                text: aliasInfo.kindSignature
            }
        ],
        symbol: symbol
    };
}

/**
 * Check if we're in a kind-sensitive context
 */
function isInKindSensitiveContext(
    node: Node,
    position: number,
    sourceFile: SourceFile
): boolean {
    // Check if we're in a type parameter constraint
    if (node.parent?.kind === SyntaxKind.TypeParameter) {
        return true;
    }
    
    // Check if we're in a type argument position
    if (node.parent?.kind === SyntaxKind.TypeReference) {
        const typeRef = node.parent as TypeReferenceNode;
        if (typeRef.typeArguments && typeRef.typeArguments.some(arg => 
            arg.getStart(sourceFile) <= position && position <= arg.getEnd()
        )) {
            return true;
        }
    }
    
    // Check if we're in a generic constraint
    if (node.parent?.kind === SyntaxKind.TypeReference) {
        const typeRef = node.parent as TypeReferenceNode;
        const typeName = (typeRef.typeName as any)?.escapedText;
        if (typeName === "Free" || typeName === "Fix") {
            return true;
        }
    }
    
    return false;
}

/**
 * Create a completion entry for a kind alias
 */
function createCompletionEntry(
    aliasInfo: KindAliasInfo,
    expectsUnary: boolean
): CompletionEntry {
    return {
        name: aliasInfo.name,
        kind: "typeParameter",
        kindModifiers: "alias",
        sortText: aliasInfo.sortText,
        insertText: aliasInfo.name,
        replacementSpan: undefined,
        hasAction: true,
        source: "ts.plus"
    };
}

/**
 * Get node at position (simplified)
 */
function getNodeAtPosition(sourceFile: SourceFile, position: number): Node | undefined {
    // This is a simplified version - in a real implementation,
    // you would use the TypeScript parser to get the actual node
    return undefined;
}

/**
 * Check if a symbol is a prioritized FP pattern
 */
export function isPrioritizedFPPattern(symbol: Symbol): boolean {
    if (!symbol) return false;
    
    const symbolName = (symbol as any).name;
    if (!symbolName) return false;
    
    const aliasInfo = KIND_ALIAS_REGISTRY.get(symbolName);
    return aliasInfo?.isFPPattern || false;
}

/**
 * Get kind constraint quick fixes
 */
export function getKindConstraintQuickFixes(
    patternName: string,
    expectedArity: number,
    actualArity: number,
    sourceFile: SourceFile,
    position: number
): any[] {
    const quickFixes: any[] = [];
    
    // Quick fix 1: Replace with Functor
    quickFixes.push({
        description: "Replace with Functor",
        changes: [{
            fileName: sourceFile.fileName,
            textChanges: [{
                span: { start: position, length: 0 },
                newText: "ts.plus.Functor"
            }]
        }],
        kind: "quickfix"
    });
    
    // Quick fix 2: Replace with the pattern itself
    quickFixes.push({
        description: `Replace with ${patternName}`,
        changes: [{
            fileName: sourceFile.fileName,
            textChanges: [{
                span: { start: position, length: 0 },
                newText: `ts.plus.${patternName}`
            }]
        }],
        kind: "quickfix"
    });
    
    return quickFixes;
} 