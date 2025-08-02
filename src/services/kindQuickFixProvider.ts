/**
 * Kind Quick Fix Provider
 * 
 * Provides quick-fix actions for kind constraint violations, specifically for:
 * - Free<F, A> where F is not a unary functor (Kind<Type, Type>)
 * - Fix<F> where F is not a unary functor (Kind<Type, Type>)
 */

import {
    CodeAction,
    CodeFixAction,
    FileTextChanges,
    TextChange
} from "./types.js";

import {
    isBuiltInFPPattern,
    getBuiltInKindAliasMetadata
} from "../compiler/kindAliasMetadata.js";

import {
    retrieveKindMetadata,
    KindMetadata
} from "../compiler/kindMetadata.js";

import { applyKindDiagnosticAlias } from "../compiler/kindDiagnosticAlias.js";

/**
 * Quick fix action for kind constraint violations
 */
export interface KindConstraintQuickFix extends CodeFixAction {
    kind: "quickfix";
    fixName: string;
    description: string;
    changes: FileTextChanges[];
    fixId: string;
    fixAllDescription?: string;
}

/**
 * Known functor types for suggestions
 */
const KNOWN_FUNCTORS = [
    "Identity",
    "Reader",
    "Writer", 
    "State",
    "Option",
    "Either",
    "List",
    "Array",
    "Promise",
    "IO"
];

/**
 * Get quick fixes for kind constraint violations
 */
export function getKindConstraintQuickFixes(
    diagnostic: any, // DiagnosticWithLocation
    sourceFile: any, // SourceFile
    checker: any // TypeChecker
): KindConstraintQuickFix[] {
    const quickFixes: KindConstraintQuickFix[] = [];

    // Check if this is a kind constraint violation diagnostic
    if (diagnostic.code !== applyKindDiagnosticAlias(9501)) {
        return quickFixes;
    }

    // Get the node at the diagnostic position
    const node = getNodeAtPosition(sourceFile, diagnostic.start);
    if (!node) {
        return quickFixes;
    }

    // Check if this is a Free or Fix type reference
    if (node.kind === 156) { // SyntaxKind.TypeReference
        const typeRef = node;
        const typeName = (typeRef.typeName as any)?.escapedText;

        if (typeName === "Free") {
            quickFixes.push(...getFreeConstraintQuickFixes(typeRef, sourceFile, checker));
        } else if (typeName === "Fix") {
            quickFixes.push(...getFixConstraintQuickFixes(typeRef, sourceFile, checker));
        }
    }

    return quickFixes;
}

/**
 * Get quick fixes for Free constraint violations
 */
function getFreeConstraintQuickFixes(
    typeRef: any, // TypeReferenceNode
    sourceFile: any, // SourceFile
    checker: any // TypeChecker
): KindConstraintQuickFix[] {
    const quickFixes: KindConstraintQuickFix[] = [];

    if (!typeRef.typeArguments || typeRef.typeArguments.length < 2) {
        return quickFixes;
    }

    const firstTypeArg = typeRef.typeArguments[0];
    const secondTypeArg = typeRef.typeArguments[1];

    // Quick fix 1: Wrap first parameter in Functor<...>
    quickFixes.push(createWrapInFunctorQuickFix(
        typeRef,
        firstTypeArg,
        sourceFile,
        "Wrap first parameter in Functor<...>",
        "free-wrap-functor"
    ));

    // Quick fix 2: Replace with known functors
    for (const functorName of KNOWN_FUNCTORS) {
        quickFixes.push(createReplaceWithKnownFunctorQuickFix(
            typeRef,
            firstTypeArg,
            functorName,
            sourceFile,
            `Replace with ${functorName}`,
            `free-replace-${functorName.toLowerCase()}`
        ));
    }

    // Quick fix 3: Use Identity functor
    quickFixes.push(createReplaceWithIdentityQuickFix(
        typeRef,
        firstTypeArg,
        sourceFile,
        "Use Identity functor",
        "free-use-identity"
    ));

    // Quick fix 4: Use Reader functor
    quickFixes.push(createReplaceWithReaderQuickFix(
        typeRef,
        firstTypeArg,
        sourceFile,
        "Use Reader functor",
        "free-use-reader"
    ));

    return quickFixes;
}

/**
 * Get quick fixes for Fix constraint violations
 */
function getFixConstraintQuickFixes(
    typeRef: any, // TypeReferenceNode
    sourceFile: any, // SourceFile
    checker: any // TypeChecker
): KindConstraintQuickFix[] {
    const quickFixes: KindConstraintQuickFix[] = [];

    if (!typeRef.typeArguments || typeRef.typeArguments.length < 1) {
        return quickFixes;
    }

    const typeArg = typeRef.typeArguments[0];

    // Quick fix 1: Wrap parameter in Functor<...>
    quickFixes.push(createWrapInFunctorQuickFix(
        typeRef,
        typeArg,
        sourceFile,
        "Wrap parameter in Functor<...>",
        "fix-wrap-functor"
    ));

    // Quick fix 2: Replace with known functors
    for (const functorName of KNOWN_FUNCTORS) {
        quickFixes.push(createReplaceWithKnownFunctorQuickFix(
            typeRef,
            typeArg,
            functorName,
            sourceFile,
            `Replace with ${functorName}`,
            `fix-replace-${functorName.toLowerCase()}`
        ));
    }

    // Quick fix 3: Use Identity functor
    quickFixes.push(createReplaceWithIdentityQuickFix(
        typeRef,
        typeArg,
        sourceFile,
        "Use Identity functor",
        "fix-use-identity"
    ));

    // Quick fix 4: Use List functor
    quickFixes.push(createReplaceWithListQuickFix(
        typeRef,
        typeArg,
        sourceFile,
        "Use List functor",
        "fix-use-list"
    ));

    return quickFixes;
}

/**
 * Create a quick fix that wraps a type in Functor<...>
 */
function createWrapInFunctorQuickFix(
    typeRef: any, // TypeReferenceNode
    typeArg: any, // Node
    sourceFile: any, // SourceFile
    description: string,
    fixId: string
): KindConstraintQuickFix {
    const start = typeArg.getStart(sourceFile);
    const end = typeArg.getEnd();
    const typeText = typeArg.getText(sourceFile);

    return {
        kind: "quickfix",
        fixName: "wrapInFunctor",
        description,
        fixId,
        changes: [
            {
                fileName: sourceFile.fileName,
                textChanges: [
                    {
                        span: { start, length: end - start },
                        newText: `Functor<${typeText}>`
                    }
                ]
            }
        ]
    };
}

/**
 * Create a quick fix that replaces a type with a known functor
 */
function createReplaceWithKnownFunctorQuickFix(
    typeRef: any, // TypeReferenceNode
    typeArg: any, // Node
    functorName: string,
    sourceFile: any, // SourceFile
    description: string,
    fixId: string
): KindConstraintQuickFix {
    const start = typeArg.getStart(sourceFile);
    const end = typeArg.getEnd();

    return {
        kind: "quickfix",
        fixName: "replaceWithKnownFunctor",
        description,
        fixId,
        changes: [
            {
                fileName: sourceFile.fileName,
                textChanges: [
                    {
                        span: { start, length: end - start },
                        newText: functorName
                    }
                ]
            }
        ]
    };
}

/**
 * Create a quick fix that replaces with Identity functor
 */
function createReplaceWithIdentityQuickFix(
    typeRef: any, // TypeReferenceNode
    typeArg: any, // Node
    sourceFile: any, // SourceFile
    description: string,
    fixId: string
): KindConstraintQuickFix {
    const start = typeArg.getStart(sourceFile);
    const end = typeArg.getEnd();

    return {
        kind: "quickfix",
        fixName: "replaceWithIdentity",
        description,
        fixId,
        changes: [
            {
                fileName: sourceFile.fileName,
                textChanges: [
                    {
                        span: { start, length: end - start },
                        newText: "Identity"
                    }
                ]
            }
        ]
    };
}

/**
 * Create a quick fix that replaces with Reader functor
 */
function createReplaceWithReaderQuickFix(
    typeRef: any, // TypeReferenceNode
    typeArg: any, // Node
    sourceFile: any, // SourceFile
    description: string,
    fixId: string
): KindConstraintQuickFix {
    const start = typeArg.getStart(sourceFile);
    const end = typeArg.getEnd();

    return {
        kind: "quickfix",
        fixName: "replaceWithReader",
        description,
        fixId,
        changes: [
            {
                fileName: sourceFile.fileName,
                textChanges: [
                    {
                        span: { start, length: end - start },
                        newText: "Reader<string>"
                    }
                ]
            }
        ]
    };
}

/**
 * Create a quick fix that replaces with List functor
 */
function createReplaceWithListQuickFix(
    typeRef: any, // TypeReferenceNode
    typeArg: any, // Node
    sourceFile: any, // SourceFile
    description: string,
    fixId: string
): KindConstraintQuickFix {
    const start = typeArg.getStart(sourceFile);
    const end = typeArg.getEnd();

    return {
        kind: "quickfix",
        fixName: "replaceWithList",
        description,
        fixId,
        changes: [
            {
                fileName: sourceFile.fileName,
                textChanges: [
                    {
                        span: { start, length: end - start },
                        newText: "List"
                    }
                ]
            }
        ]
    };
}

/**
 * Apply a kind constraint quick fix
 */
export function applyKindConstraintQuickFix(
    quickFix: KindConstraintQuickFix,
    sourceFile: any // SourceFile
): any { // SourceFile
    // Create a copy of the source file
    let newText = sourceFile.text;

    // Apply changes in reverse order to maintain positions
    const allChanges: TextChange[] = [];
    for (const fileChange of quickFix.changes) {
        allChanges.push(...fileChange.textChanges);
    }
    
    const sortedChanges = allChanges.sort((a, b) => b.span.start - a.span.start);

    for (const change of sortedChanges) {
        const before = newText.substring(0, change.span.start);
        const after = newText.substring(change.span.start + change.span.length);
        newText = before + change.newText + after;
    }

    // Create new source file with applied changes
    return {
        ...sourceFile,
        text: newText
    };
}

/**
 * Get all quick fixes for a file
 */
export function getAllKindConstraintQuickFixes(
    diagnostics: any[], // DiagnosticWithLocation[]
    sourceFile: any, // SourceFile
    checker: any // TypeChecker
): KindConstraintQuickFix[] {
    const allQuickFixes: KindConstraintQuickFix[] = [];

    for (const diagnostic of diagnostics) {
        const quickFixes = getKindConstraintQuickFixes(diagnostic, sourceFile, checker);
        allQuickFixes.push(...quickFixes);
    }

    return allQuickFixes;
}

/**
 * Get quick fixes at a specific position
 */
export function getKindConstraintQuickFixesAtPosition(
    position: number,
    diagnostics: any[], // DiagnosticWithLocation[]
    sourceFile: any, // SourceFile
    checker: any // TypeChecker
): KindConstraintQuickFix[] {
    const quickFixes: KindConstraintQuickFix[] = [];

    for (const diagnostic of diagnostics) {
        // Check if the diagnostic is at or near the position
        if (diagnostic.start <= position && position <= diagnostic.start + diagnostic.length) {
            const fixes = getKindConstraintQuickFixes(diagnostic, sourceFile, checker);
            quickFixes.push(...fixes);
        }
    }

    return quickFixes;
}

/**
 * Validate kind constraint for Free and Fix patterns
 */
export function validateFPPatternKindConstraint(
    typeRef: any, // TypeReferenceNode
    checker: any // TypeChecker
): { isValid: boolean; diagnostic?: any } { // diagnostic?: DiagnosticWithLocation
    const typeName = (typeRef.typeName as any)?.escapedText;
    
    if (typeName !== "Free" && typeName !== "Fix") {
        return { isValid: true };
    }

    if (!typeRef.typeArguments || typeRef.typeArguments.length === 0) {
        return { isValid: true }; // Let other diagnostics handle missing arguments
    }

    const firstTypeArg = typeRef.typeArguments[0];
    const firstTypeArgType = checker.getTypeAtLocation(firstTypeArg);
    const firstTypeArgKind = retrieveKindMetadata(firstTypeArgType, checker);

    if (!firstTypeArgKind) {
        return { isValid: true }; // Not a kind type, let other diagnostics handle
    }

    // Free and Fix require unary functors (Kind<Type, Type>)
    if (firstTypeArgKind.arity !== 1) {
        const diagnostic = {
            file: typeRef.getSourceFile(),
            start: firstTypeArg.getStart(),
            length: firstTypeArg.getWidth(),
            messageText: `${typeName} requires a unary functor (Kind<Type, Type>), but got ${firstTypeArgKind.arity}-ary kind`,
            category: 1, // Error
            code: applyKindDiagnosticAlias(9501)
        };

        return { isValid: false, diagnostic };
    }

    return { isValid: true };
}

/**
 * Get node at position helper
 */
function getNodeAtPosition(sourceFile: any, position: number): any { // Node | undefined
    // Implementation would depend on TypeScript internals
    return undefined;
} 