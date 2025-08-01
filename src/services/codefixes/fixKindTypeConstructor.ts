import {
    createCodeFixAction,
    createCombinedCodeActions,
    eachDiagnostic,
    registerCodeFix,
} from "../_namespaces/ts.codefix.js";
import {
    CodeFixContextBase,
    Diagnostics,
    factory,
    findAncestor,
    getTokenAtPosition,
    isIdentifier,
    isTypeReferenceNode,
    Node,
    Program,
    SourceFile,
    Symbol,
    SymbolFlags,
    SyntaxKind,
    textChanges,
    Type,
    TypeChecker,
    TypeReferenceNode,
} from "../_namespaces/ts.js";
import { KindDiagnosticCodes } from "../../compiler/kindDiagnostics.js";
import { compareKinds } from "../../compiler/kindComparison.js";
import { retrieveKindMetadata } from "../../compiler/kindMetadata.js";
import { findMatchingTypeConstructors, rankTypeConstructorSuggestions } from "../../compiler/kindScopeAnalysis.js";

const fixId = "suggestKindTypeConstructor";
const errorCodes = [
    KindDiagnosticCodes.TypeConstructorArityMismatch,
    KindDiagnosticCodes.TypeConstructorKindParameterMismatch,
    KindDiagnosticCodes.TypeConstructorVarianceMismatch,
    KindDiagnosticCodes.KindAliasMismatch,
];

registerCodeFix({
    errorCodes,
    getCodeActions(context) {
        const { sourceFile, span, program } = context;
        const info = getInfo(program, sourceFile, span);
        if (!info) return undefined;

        const suggestions = getKindTypeConstructorSuggestions(info, program);
        if (suggestions.length === 0) return undefined;

        const actions = suggestions.map(suggestion => {
            const changes = textChanges.ChangeTracker.with(context, t => 
                replaceWithSuggestedType(t, sourceFile, info.node, suggestion)
            );
            return createCodeFixAction(
                fixId,
                changes,
                [Diagnostics.Replace_0_with_1_matches_expected_kind, info.currentTypeName, suggestion.name],
                fixId,
                [Diagnostics.Replace_all_kind_mismatches_with_suggested_type_constructors]
            );
        });

        return actions;
    },
    fixIds: [fixId],
    getAllCodeActions: context => {
        const { program } = context;
        const seen = new Set<number>();

        return createCombinedCodeActions(textChanges.ChangeTracker.with(context, changes => {
            eachDiagnostic(context, errorCodes, diag => {
                const info = getInfo(program, diag.file, createTextSpan(diag.start, diag.length));
                if (info && addToSeen(seen, getNodeId(info.node))) {
                    const suggestions = getKindTypeConstructorSuggestions(info, program);
                    if (suggestions.length > 0) {
                        // Use the first (best) suggestion for fix all
                        replaceWithSuggestedType(changes, diag.file, info.node, suggestions[0]);
                    }
                }
            });
        }));
    },
});

interface Info {
    node: TypeReferenceNode;
    currentTypeName: string;
    expectedKind: any; // KindMetadata
    actualKind: any; // KindMetadata
}

function getInfo(program: Program, sourceFile: SourceFile, span: textChanges.TextSpan): Info | undefined {
    const node = findAncestor(getTokenAtPosition(sourceFile, span.start), isTypeReferenceNode);
    if (!node || !isTypeReferenceNode(node)) return undefined;

    // Check if this is a Kind<...> type reference
    const typeName = node.typeName;
    if (!isIdentifier(typeName) || typeName.escapedText !== "Kind") {
        return undefined;
    }

    const checker = program.getTypeChecker();
    
    // Get the current type being used
    const currentType = checker.getTypeFromTypeNode(node);
    if (!currentType) return undefined;

    // Get the expected kind from the context
    const expectedKind = getExpectedKindFromContext(node, checker);
    if (!expectedKind) return undefined;

    // Get the actual kind of the current type
    const actualKind = getActualKindFromType(currentType, checker);
    if (!actualKind) return undefined;

    return {
        node,
        currentTypeName: getTypeNameFromNode(node),
        expectedKind,
        actualKind
    };
}

function getExpectedKindFromContext(node: TypeReferenceNode, checker: TypeChecker): any {
    // Walk up the AST to find the constraint context
    let current: Node | undefined = node;
    
    while (current) {
        // Check if we're in a type parameter constraint
        if (current.kind === SyntaxKind.TypeParameter) {
            const typeParam = current as any; // TypeParameterDeclaration
            if (typeParam.constraint) {
                // Found a constraint - extract the expected kind
                const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                if (constraintType && constraintType.symbol) {
                    return retrieveKindMetadata(constraintType.symbol, checker, false);
                }
            }
        }
        
        // Check if we're in a function/method signature with type parameters
        if (current.kind === SyntaxKind.FunctionDeclaration ||
            current.kind === SyntaxKind.MethodDeclaration ||
            current.kind === SyntaxKind.FunctionExpression ||
            current.kind === SyntaxKind.ArrowFunction) {
            
            const func = current as any;
            if (func.typeParameters) {
                for (const typeParam of func.typeParameters) {
                    if (typeParam.constraint) {
                        const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                        if (constraintType && constraintType.symbol) {
                            return retrieveKindMetadata(constraintType.symbol, checker, false);
                        }
                    }
                }
            }
        }
        
        // Check if we're in a class/interface with type parameters
        if (current.kind === SyntaxKind.ClassDeclaration ||
            current.kind === SyntaxKind.InterfaceDeclaration ||
            current.kind === SyntaxKind.TypeAliasDeclaration) {
            
            const decl = current as any;
            if (decl.typeParameters) {
                for (const typeParam of decl.typeParameters) {
                    if (typeParam.constraint) {
                        const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
                        if (constraintType && constraintType.symbol) {
                            return retrieveKindMetadata(constraintType.symbol, checker, false);
                        }
                    }
                }
            }
        }
        
        // Move to parent
        current = current.parent;
    }
    
    // Default to a basic kind if no constraint found
    return {
        arity: 1,
        parameterKinds: [],
        symbol: undefined,
        isValid: false,
        errorMessage: "No constraint context found"
    };
}

function getActualKindFromType(type: Type, checker: TypeChecker): any {
    // Get the symbol for the type
    if (!type.symbol) {
        return {
            arity: 0,
            parameterKinds: [],
            symbol: null,
            isValid: false,
            errorMessage: "Type has no symbol"
        };
    }
    
    // Retrieve kind metadata from the symbol
    const kindMetadata = retrieveKindMetadata(type.symbol, checker, false);
    
    if (kindMetadata && kindMetadata.isValid) {
        return kindMetadata;
    }
    
    // If no valid kind metadata, try to infer from the type itself
    if (type.isTypeParameter()) {
        // For type parameters, check their constraints
        const typeParam = type as any;
        if (typeParam.constraint) {
            const constraintType = checker.getTypeFromTypeNode(typeParam.constraint);
            if (constraintType && constraintType.symbol) {
                return retrieveKindMetadata(constraintType.symbol, checker, false);
            }
        }
    }
    
    // Default to a basic kind
    return {
        arity: 0,
        parameterKinds: [],
        symbol: type.symbol,
        isValid: false,
        errorMessage: "Could not determine kind from type"
    };
}

function getTypeNameFromNode(node: TypeReferenceNode): string {
    if (isIdentifier(node.typeName)) {
        return node.typeName.escapedText as string;
    }
    // Handle qualified names
    return "unknown";
}

interface TypeConstructorSuggestion {
    name: string;
    symbol: Symbol;
    kind: any; // KindMetadata
    compatibilityScore: number;
}

function getKindTypeConstructorSuggestions(info: Info, program: Program): TypeConstructorSuggestion[] {
    const checker = program.getTypeChecker();

    // Find matching type constructors in scope
    const matchingConstructors = findMatchingTypeConstructors(info.expectedKind, info.node, checker, program);
    
    // Rank suggestions by compatibility
    const rankedSuggestions = rankTypeConstructorSuggestions(matchingConstructors, info.expectedKind, checker);
    
    // Convert to the expected format
    return rankedSuggestions.map(constructor => ({
        name: constructor.name,
        symbol: constructor.symbol,
        kind: constructor.kind,
        compatibilityScore: (constructor as any).compatibilityScore || 0
    }));
}

// Note: getTypeConstructorsInScope and calculateCompatibilityScore are now implemented in kindScopeAnalysis.ts

function replaceWithSuggestedType(
    changes: textChanges.ChangeTracker,
    sourceFile: SourceFile,
    node: TypeReferenceNode,
    suggestion: TypeConstructorSuggestion
): void {
    // Create the replacement text
    const replacementText = suggestion.name;
    
    // Replace the type reference
    changes.replaceNode(sourceFile, node, factory.createTypeReferenceNode(
        factory.createIdentifier(suggestion.name),
        node.typeArguments
    ));
}

function addToSeen(seen: Set<number>, nodeId: number): boolean {
    if (seen.has(nodeId)) return false;
    seen.add(nodeId);
    return true;
}

function getNodeId(node: Node): number {
    // In practice, you'd use the node's ID
    // For now, we'll use a combination of position and kind to create a unique ID
    const position = node.pos;
    const kind = node.kind;
    const sourceFile = (node as any).getSourceFile?.();
    const fileName = sourceFile?.fileName || "";
    
    // Create a hash-like ID from the node's properties
    let hash = 0;
    const str = `${fileName}:${position}:${kind}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
}

function createTextSpan(start: number, length: number): { start: number; length: number } {
    return { start, length };
} 