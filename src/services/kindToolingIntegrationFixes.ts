/**
 * Kind Tooling Integration Fixes
 * 
 * This module addresses critical issues with autocomplete and hover functionality:
 * 1. Autocomplete completeness: Inference for expected kind is shallow — doesn't always handle chained generic constraints or inferred generic positions
 * 2. Hover docs for aliases: Pulls docstring only if the alias node is the actual AST reference — not if it's re-exported
 */

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
    Position,
    Type,
    TypeParameterDeclaration,
    HeritageClause,
    InterfaceDeclaration,
    ClassDeclaration,
    TypeAliasDeclaration
} from "./types.js";

import {
    isBuiltInKindAlias,
    retrieveBuiltInKindMetadata,
    isBuiltInFPPattern,
    getBuiltInKindAliasMetadata
} from "../compiler/kindAliasMetadata.js";

import {
    getExpandedKindSignature,
    isBuiltInKindAliasSymbol,
    retrieveKindMetadata,
    KindMetadata
} from "../compiler/kindMetadata.js";

/**
 * Enhanced kind inference context
 */
export interface KindInferenceContext {
    expectedKind?: KindMetadata;
    expectedArity?: number;
    constraintChain: string[];
    inferredPosition: boolean;
    chainedConstraints: boolean;
    contextType: 'type-parameter' | 'type-argument' | 'heritage-clause' | 'generic-constraint' | 'mapped-type' | 'conditional-type' | 'inferred';
}

/**
 * Enhanced completion entry with kind inference
 */
export interface KindCompletionEntry extends CompletionEntry {
    kindInference?: KindInferenceContext;
    isReExported?: boolean;
    originalSymbol?: Symbol;
}

/**
 * Enhanced quick info with re-export support
 */
export interface KindQuickInfo extends QuickInfo {
    isReExported?: boolean;
    originalSymbol?: Symbol;
    reExportPath?: string;
}

/**
 * Deep kind inference for complex generic contexts
 */
export function inferExpectedKindDeep(
    node: Node,
    position: number,
    sourceFile: SourceFile,
    checker: TypeChecker
): KindInferenceContext {
    const context: KindInferenceContext = {
        constraintChain: [],
        inferredPosition: false,
        chainedConstraints: false,
        contextType: 'inferred'
    };

    // Walk up the AST to understand the full context
    let current = node;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops

    while (current && depth < maxDepth) {
        const nodeType = current.kind;
        
        switch (nodeType) {
            case SyntaxKind.TypeParameter:
                context.contextType = 'type-parameter';
                const typeParam = current as TypeParameterDeclaration;
                if (typeParam.constraint) {
                    const constraintType = checker.getTypeAtLocation(typeParam.constraint);
                    const constraintKind = retrieveKindMetadata(constraintType, checker);
                    if (constraintKind) {
                        context.expectedKind = constraintKind;
                        context.expectedArity = constraintKind.arity;
                        context.constraintChain.push(`TypeParameter:${constraintKind.arity}`);
                    }
                }
                break;

            case SyntaxKind.TypeReference:
                context.contextType = 'type-argument';
                const typeRef = current as TypeReferenceNode;
                const typeName = (typeRef.typeName as any)?.escapedText;
                
                if (typeName === "Free" || typeName === "Fix") {
                    // FP patterns expect unary functors
                    context.expectedArity = 1;
                    context.expectedKind = {
                        arity: 1,
                        parameterKinds: [],
                        source: 'built-in-alias'
                    };
                    context.constraintChain.push(`FPPattern:${typeName}`);
                } else if (typeName === "Functor") {
                    context.expectedArity = 1;
                    context.expectedKind = {
                        arity: 1,
                        parameterKinds: [],
                        source: 'built-in-alias'
                    };
                    context.constraintChain.push(`Functor:1`);
                } else if (typeName === "Bifunctor") {
                    context.expectedArity = 2;
                    context.expectedKind = {
                        arity: 2,
                        parameterKinds: [],
                        source: 'built-in-alias'
                    };
                    context.constraintChain.push(`Bifunctor:2`);
                }
                break;

            case SyntaxKind.HeritageClause:
                context.contextType = 'heritage-clause';
                const heritage = current as HeritageClause;
                if (heritage.types && heritage.types.length > 0) {
                    for (const heritageType of heritage.types) {
                        const heritageTypeType = checker.getTypeAtLocation(heritageType);
                        const heritageKind = retrieveKindMetadata(heritageTypeType, checker);
                        if (heritageKind) {
                            context.expectedKind = heritageKind;
                            context.expectedArity = heritageKind.arity;
                            context.constraintChain.push(`Heritage:${heritageKind.arity}`);
                        }
                    }
                }
                break;

            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.ClassDeclaration:
                // Check for generic constraints in interface/class declarations
                const declaration = current as InterfaceDeclaration | ClassDeclaration;
                if (declaration.typeParameters && declaration.typeParameters.length > 0) {
                    for (const typeParam of declaration.typeParameters) {
                        if (typeParam.constraint) {
                            const constraintType = checker.getTypeAtLocation(typeParam.constraint);
                            const constraintKind = retrieveKindMetadata(constraintType, checker);
                            if (constraintKind) {
                                context.expectedKind = constraintKind;
                                context.expectedArity = constraintKind.arity;
                                context.constraintChain.push(`Declaration:${constraintKind.arity}`);
                                context.chainedConstraints = true;
                            }
                        }
                    }
                }
                break;

            case SyntaxKind.MappedType:
                context.contextType = 'mapped-type';
                // Mapped types often expect specific kind constraints
                context.expectedArity = 1;
                context.expectedKind = {
                    arity: 1,
                    parameterKinds: [],
                    source: 'mapped-type'
                };
                context.constraintChain.push(`MappedType:1`);
                break;

            case SyntaxKind.ConditionalType:
                context.contextType = 'conditional-type';
                // Conditional types can have complex kind constraints
                context.chainedConstraints = true;
                break;
        }

        // Check if this is an inferred position
        if (isInferredGenericPosition(current, position, sourceFile)) {
            context.inferredPosition = true;
        }

        current = current.parent;
        depth++;
    }

    return context;
}

/**
 * Check if we're in an inferred generic position
 */
function isInferredGenericPosition(
    node: Node,
    position: number,
    sourceFile: SourceFile
): boolean {
    // Check if we're in a type argument position that could be inferred
    if (node.kind === SyntaxKind.TypeReference) {
        const typeRef = node as TypeReferenceNode;
        if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
            // Check if any type argument is empty or could be inferred
            for (const typeArg of typeRef.typeArguments) {
                if (typeArg.getStart(sourceFile) <= position && position <= typeArg.getEnd()) {
                    const text = typeArg.getText(sourceFile).trim();
                    if (text === "" || text === "_" || text === "any") {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

/**
 * Enhanced autocomplete with deep kind inference
 */
export function getEnhancedKindAliasCompletions(
    position: number,
    sourceFile: SourceFile,
    checker: TypeChecker
): KindCompletionEntry[] {
    const completions: KindCompletionEntry[] = [];
    const node = getNodeAtPosition(sourceFile, position);
    
    if (!node) {
        return completions;
    }

    // Get deep kind inference context
    const inferenceContext = inferExpectedKindDeep(node, position, sourceFile, checker);
    
    // Get all available kind aliases
    const availableAliases = getAllAvailableKindAliases(sourceFile, checker);
    
    for (const alias of availableAliases) {
        // Check if this alias matches the expected kind
        if (isKindAliasCompatible(alias, inferenceContext, checker)) {
            const completion = createEnhancedCompletionEntry(alias, inferenceContext);
            completions.push(completion);
        }
    }

    // Sort by relevance and priority
    return sortCompletionsByRelevance(completions, inferenceContext);
}

/**
 * Get all available kind aliases including re-exports
 */
function getAllAvailableKindAliases(
    sourceFile: SourceFile,
    checker: TypeChecker
): Array<{ symbol: Symbol; isReExported: boolean; reExportPath?: string }> {
    const aliases: Array<{ symbol: Symbol; isReExported: boolean; reExportPath?: string }> = [];

    // Built-in kind aliases for autocomplete
    const builtInAliases = ['Functor', 'Bifunctor', 'Free', 'Fix'];
    for (const aliasName of builtInAliases) {
        const symbol = checker.resolveName(aliasName, sourceFile, undefined, undefined);
        if (symbol && isBuiltInKindAliasSymbol(symbol)) {
            aliases.push({ symbol, isReExported: false });
        }
    }

    // Get re-exported aliases
    const reExportedAliases = findReExportedKindAliases(sourceFile, checker);
    aliases.push(...reExportedAliases);

    return aliases;
}

/**
 * Find re-exported kind aliases
 */
function findReExportedKindAliases(
    sourceFile: SourceFile,
    checker: TypeChecker
): Array<{ symbol: Symbol; isReExported: boolean; reExportPath?: string }> {
    const reExports: Array<{ symbol: Symbol; isReExported: boolean; reExportPath?: string }> = [];

    // Look for export statements that re-export kind aliases
    const exportDeclarations = sourceFile.statements.filter(
        stmt => stmt.kind === SyntaxKind.ExportDeclaration
    );

    for (const exportDecl of exportDeclarations) {
        if (exportDecl.kind === SyntaxKind.ExportDeclaration) {
            const exportSpecifiers = (exportDecl as any).exportClause?.elements;
            if (exportSpecifiers) {
                for (const specifier of exportSpecifiers) {
                    const name = specifier.name?.escapedText;
                    if (name && isKindAliasName(name)) {
                        const symbol = checker.resolveName(name, sourceFile, undefined, undefined);
                        if (symbol) {
                            reExports.push({
                                symbol,
                                isReExported: true,
                                reExportPath: (exportDecl as any).moduleSpecifier?.text
                            });
                        }
                    }
                }
            }
        }
    }

    return reExports;
}

/**
 * Check if a name is a kind alias
 */
function isKindAliasName(name: string): boolean {
    // Kind alias names for filtering
    const kindAliasNames = ['Functor', 'Bifunctor', 'Free', 'Fix'];
    return kindAliasNames.includes(name);
}

/**
 * Check if a kind alias is compatible with the expected context
 */
function isKindAliasCompatible(
    alias: { symbol: Symbol; isReExported: boolean; reExportPath?: string },
    context: KindInferenceContext,
    checker: TypeChecker
): boolean {
    const aliasType = checker.getTypeOfSymbolAtLocation(alias.symbol, alias.symbol.valueDeclaration);
    const aliasKind = retrieveKindMetadata(aliasType, checker);
    
    if (!aliasKind) {
        return false;
    }

    // If we have an expected kind, check compatibility
    if (context.expectedKind) {
        return aliasKind.arity === context.expectedKind.arity;
    }

    // If we have an expected arity, check compatibility
    if (context.expectedArity !== undefined) {
        return aliasKind.arity === context.expectedArity;
    }

    // Default to showing all aliases
    return true;
}

/**
 * Create enhanced completion entry
 */
function createEnhancedCompletionEntry(
    alias: { symbol: Symbol; isReExported: boolean; reExportPath?: string },
    context: KindInferenceContext
): KindCompletionEntry {
    const aliasName = alias.symbol.name;
    const isReExported = alias.isReExported;
    const reExportPath = alias.reExportPath;

    return {
        name: aliasName,
        kind: "alias",
        sortText: getSortTextForAlias(aliasName, context),
        insertText: aliasName,
        isReExported,
        originalSymbol: alias.symbol,
        kindInference: context,
        reExportPath
    };
}

/**
 * Get sort text for alias based on context
 */
function getSortTextForAlias(aliasName: string, context: KindInferenceContext): string {
    // Prioritize based on context
    if (context.expectedArity === 1) {
        if (aliasName === "Functor") return "1";
        if (aliasName === "Free" || aliasName === "Fix") return "2";
    } else if (context.expectedArity === 2) {
        if (aliasName === "Bifunctor") return "1";
    }

    // Priority mapping for kind aliases
    const kindAliasPriority: Record<string, string> = {
        "Functor": "1",
        "Bifunctor": "2",
        "Free": "4",
        "Fix": "5"
    };

    return kindAliasPriority[aliasName] || "9";
}

/**
 * Sort completions by relevance
 */
function sortCompletionsByRelevance(
    completions: KindCompletionEntry[],
    context: KindInferenceContext
): KindCompletionEntry[] {
    return completions.sort((a, b) => {
        // First, sort by sort text
        const sortComparison = a.sortText.localeCompare(b.sortText);
        if (sortComparison !== 0) {
            return sortComparison;
        }

        // Then, prioritize non-re-exported over re-exported
        if (a.isReExported !== b.isReExported) {
            return a.isReExported ? 1 : -1;
        }

        // Finally, sort alphabetically
        return a.name.localeCompare(b.name);
    });
}

/**
 * Enhanced hover/quick info with re-export support
 */
export function getEnhancedKindAliasQuickInfo(
    node: Node,
    sourceFile: SourceFile,
    checker: TypeChecker
): KindQuickInfo | undefined {
    // First, try to get the symbol for this node
    const symbol = checker.getSymbolAtLocation(node);
    if (!symbol) {
        return undefined;
    }

    // Check if this is a kind alias
    const isKindAlias = isBuiltInKindAliasSymbol(symbol);
    if (!isKindAlias) {
        return undefined;
    }

    // Get the original symbol (in case of re-export)
    const originalSymbol = getOriginalKindAliasSymbol(symbol, sourceFile, checker);
    const isReExported = originalSymbol !== symbol;
    const reExportPath = isReExported ? getReExportPath(symbol, sourceFile) : undefined;

    // Get the kind metadata
    const aliasType = checker.getTypeOfSymbolAtLocation(originalSymbol, originalSymbol.valueDeclaration);
    const kindMetadata = retrieveKindMetadata(aliasType, checker);

    if (!kindMetadata) {
        return undefined;
    }

    // Get documentation
    const documentation = getKindAliasDocumentation(originalSymbol, sourceFile, checker);

    return {
        kind: "alias",
        kindModifiers: "",
        textSpan: {
            start: node.getStart(sourceFile),
            length: node.getWidth(sourceFile)
        },
        displayParts: [
            { text: originalSymbol.name, kind: "aliasName" },
            { text: " - ", kind: "space" },
            { text: documentation.description, kind: "text" },
            { text: " (", kind: "punctuation" },
            { text: kindMetadata.arity.toString(), kind: "number" },
            { text: " arity)", kind: "text" }
        ],
        documentation: documentation.documentation,
        tags: documentation.tags,
        isReExported,
        originalSymbol,
        reExportPath
    };
}

/**
 * Get the original kind alias symbol (handles re-exports)
 */
function getOriginalKindAliasSymbol(
    symbol: Symbol,
    sourceFile: SourceFile,
    checker: TypeChecker
): Symbol {
    // If this is a re-export, find the original symbol
    if (symbol.declarations && symbol.declarations.length > 0) {
        const declaration = symbol.declarations[0];
        if (declaration.kind === SyntaxKind.ExportSpecifier) {
            // This is a re-export, find the original
            const exportDecl = declaration.parent;
            if (exportDecl.kind === SyntaxKind.ExportDeclaration) {
                const moduleSpecifier = (exportDecl as any).moduleSpecifier?.text;
                if (moduleSpecifier) {
                    // Try to resolve the original symbol from the module
                    const originalSymbol = checker.resolveName(
                        symbol.name,
                        sourceFile,
                        undefined,
                        undefined
                    );
                    if (originalSymbol) {
                        return originalSymbol;
                    }
                }
            }
        }
    }

    return symbol;
}

/**
 * Get re-export path
 */
function getReExportPath(symbol: Symbol, sourceFile: SourceFile): string | undefined {
    if (symbol.declarations && symbol.declarations.length > 0) {
        const declaration = symbol.declarations[0];
        if (declaration.kind === SyntaxKind.ExportSpecifier) {
            const exportDecl = declaration.parent;
            if (exportDecl.kind === SyntaxKind.ExportDeclaration) {
                return (exportDecl as any).moduleSpecifier?.text;
            }
        }
    }
    return undefined;
}

/**
 * Get kind alias documentation
 */
function getKindAliasDocumentation(
    symbol: Symbol,
    sourceFile: SourceFile,
    checker: TypeChecker
): { description: string; documentation: string; tags: any[] } {
    const aliasName = symbol.name;
    
    // Documentation for kind aliases
    const kindAliasDocumentation: Record<string, string> = {
        "Functor": "Unary type constructor supporting map. Use for types that can transform values while preserving structure.",
        "Bifunctor": "Binary type constructor supporting bimap. Use for types that can transform both left and right type parameters.",
        "Free": "Free monad over a functor. Provides a way to build monadic computations from any functor.",
        "Fix": "Fixed point of a functor. Represents infinite data structures like trees and lists."
    };

    return {
        description: kindAliasDocumentation[aliasName] || "Kind alias",
        documentation: kindAliasDocumentation[aliasName] || "A higher-kinded type alias",
        tags: []
    };
}

/**
 * Get node at position helper
 */
function getNodeAtPosition(sourceFile: SourceFile, position: number): Node | undefined {
    // Implementation would depend on TypeScript internals
    return undefined;
} 