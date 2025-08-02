# KindType Language Service Integration Guide

## Overview

This document outlines how to integrate KindType-aware completions and quick info enhancements into the TypeScript language service. The goal is to provide intelligent completions when the expected type is a KindType and enhanced quick info for TypeConstructorTypes.

## Implementation Strategy

### 1. KindType Detection in Completions

#### Core Function: `detectKindTypeExpectedType`

```typescript
function detectKindTypeExpectedType(
    position: number,
    sourceFile: SourceFile,
    checker: TypeChecker
): { isKindType: boolean; kindArity?: number; parameterKinds?: readonly Type[] } | undefined {
    // Get the contextual type at the position
    const contextualType = checker.getContextualTypeAtPosition(sourceFile, position);
    if (!contextualType) {
        return undefined;
    }

    // Check if the contextual type is a KindType
    if (isKindType(contextualType)) {
        return {
            isKindType: true,
            kindArity: contextualType.kindArity,
            parameterKinds: contextualType.parameterKinds,
        };
    }

    // Check if we're in a generic parameter constraint position
    const node = getNodeAtPosition(sourceFile, position);
    if (node && isTypeParameterDeclaration(node)) {
        const constraint = node.constraint;
        if (constraint && isTypeReferenceNode(constraint)) {
            const constraintType = checker.getTypeAtLocation(constraint);
            if (isKindType(constraintType)) {
                return {
                    isKindType: true,
                    kindArity: constraintType.kindArity,
                    parameterKinds: constraintType.parameterKinds,
                };
            }
        }
    }

    return { isKindType: false };
}
```

#### Integration Point: `getCompletionsAtPosition`

Add this logic to `src/services/completions.ts` in the `getCompletionsAtPosition` function:

```typescript
export function getCompletionsAtPosition(
    host: LanguageServiceHost,
    program: Program,
    log: Log,
    sourceFile: SourceFile,
    position: number,
    preferences: UserPreferences,
    triggerCharacter: CompletionsTriggerCharacter | undefined,
    completionKind: CompletionTriggerKind | undefined,
    cancellationToken: CancellationToken,
    formatContext?: formatting.FormatContext,
    includeSymbol = false,
): CompletionInfo | undefined {
    // ... existing code ...

    const completionData = getCompletionData(program, log, sourceFile, compilerOptions, position, preferences, /*detailsEntryId*/ undefined, host, formatContext, cancellationToken);
    
    // Check for KindType expected type and add TypeConstructorType completions
    const kindTypeInfo = detectKindTypeExpectedType(position, sourceFile, checker);
    if (kindTypeInfo?.isKindType && kindTypeInfo.kindArity !== undefined) {
        const matchingTypeConstructors = findMatchingTypeConstructorTypes(sourceFile, checker, kindTypeInfo.kindArity);
        if (matchingTypeConstructors.length > 0) {
            // Add TypeConstructorType completions to the existing completion data
            addTypeConstructorCompletions(matchingTypeConstructors, completionData, sourceFile, position, checker, preferences, formatContext, includeSymbol);
        }
    }
    
    if (!completionData) {
        return undefined;
    }

    // ... rest of existing code ...
}
```

### 2. Finding Matching TypeConstructorTypes

#### Core Function: `findMatchingTypeConstructorTypes`

```typescript
function findMatchingTypeConstructorTypes(
    sourceFile: SourceFile,
    checker: TypeChecker,
    targetArity: number
): TypeConstructorType[] {
    const matchingTypes: TypeConstructorType[] = [];
    
    // Get all symbols in the current scope
    const scopeSymbols = checker.getSymbolsInScope(sourceFile, position, SymbolFlags.Type);
    
    for (const symbol of scopeSymbols) {
        // Get the type of the symbol
        const symbolType = checker.getTypeOfSymbolAtLocation(symbol, sourceFile);
        
        // Check if it's a TypeConstructorType with matching arity
        if (isTypeConstructorType(symbolType) && symbolType.arity === targetArity) {
            matchingTypes.push(symbolType);
        }
    }
    
    return matchingTypes;
}
```

### 3. Adding TypeConstructorType Completions

#### Core Function: `addTypeConstructorCompletions`

```typescript
function addTypeConstructorCompletions(
    matchingTypes: TypeConstructorType[],
    completionData: CompletionData,
    sourceFile: SourceFile,
    position: number,
    checker: TypeChecker,
    preferences: UserPreferences,
    formatContext: formatting.FormatContext | undefined,
    includeSymbol: boolean
): void {
    // Add the matching TypeConstructorTypes to the symbols list
    for (const typeConstructor of matchingTypes) {
        const symbol = typeConstructor.symbol;
        if (!completionData.symbols.includes(symbol)) {
            completionData.symbols.push(symbol);
        }
    }
}
```

## Quick Info Enhancements

### 1. Enhanced Quick Info for TypeConstructorTypes

#### Core Function: `enhanceQuickInfoForTypeConstructor`

```typescript
function enhanceQuickInfoForTypeConstructor(
    symbol: Symbol,
    type: Type,
    sourceFile: SourceFile,
    location: Node,
    checker: TypeChecker,
    verbosityLevel?: number
): CompletionEntryDetails | undefined {
    if (!isTypeConstructorType(type)) {
        return undefined;
    }
    
    // Get the base display parts
    const baseDisplay = getSymbolDisplayPartsDocumentationAndSymbolKind(
        checker,
        symbol,
        sourceFile,
        /* enclosingDeclaration */ undefined,
        location,
        /* semanticMeaning */ undefined,
        /* alias */ undefined,
        /* maximumLength */ undefined,
        verbosityLevel
    );
    
    // Create enhanced display parts with kind information
    const enhancedDisplayParts: SymbolDisplayPart[] = [
        ...baseDisplay.displayParts,
        { kind: SymbolDisplayPartKind.lineBreak, text: "\n" },
        { kind: SymbolDisplayPartKind.text, text: "Kind signature: " },
        { kind: SymbolDisplayPartKind.keyword, text: "Kind" },
        { kind: SymbolDisplayPartKind.punctuation, text: "<" },
        ...formatParameterKinds(type.parameterKinds, checker),
        { kind: SymbolDisplayPartKind.punctuation, text: ">" },
        { kind: SymbolDisplayPartKind.lineBreak, text: "\n" },
        { kind: SymbolDisplayPartKind.text, text: `Arity: ${type.arity}` },
    ];
    
    // Create enhanced documentation
    const enhancedDocumentation: SymbolDisplayPart[] = [
        ...(baseDisplay.documentation || []),
        { kind: SymbolDisplayPartKind.lineBreak, text: "\n" },
        { kind: SymbolDisplayPartKind.text, text: "Type constructor with kind " },
        { kind: SymbolDisplayPartKind.keyword, text: "Kind" },
        { kind: SymbolDisplayPartKind.punctuation, text: "<" },
        ...formatParameterKinds(type.parameterKinds, checker),
        { kind: SymbolDisplayPartKind.punctuation, text: ">" },
        { kind: SymbolDisplayPartKind.text, text: ` (${type.arity} parameter${type.arity === 1 ? '' : 's'})` },
    ];
    
    return createCompletionDetails(
        symbol.escapedName,
        /* kindModifiers */ "",
        ScriptElementKind.typeElement,
        enhancedDisplayParts,
        enhancedDocumentation,
        baseDisplay.tags,
        /* codeActions */ undefined,
        /* source */ undefined
    );
}
```

#### Integration Point: `getQuickInfoAtPosition`

Add this logic to `src/services/services.ts` in the `getQuickInfoAtPosition` function:

```typescript
function getQuickInfoAtPosition(fileName: string, position: number, maximumLength?: number, verbosityLevel?: number): QuickInfo | undefined {
    synchronizeHostData();

    const sourceFile = getValidSourceFile(fileName);
    const node = getTouchingPropertyName(sourceFile, position);
    if (node === sourceFile) {
        return undefined;
    }

    const typeChecker = program.getTypeChecker();
    const nodeForQuickInfo = getNodeForQuickInfo(node);
    const symbol = getSymbolAtLocationForQuickInfo(nodeForQuickInfo, typeChecker);
    
    if (!symbol || typeChecker.isUnknownSymbol(symbol)) {
        const type = shouldGetType(sourceFile, nodeForQuickInfo, position) ? typeChecker.getTypeAtLocation(nodeForQuickInfo) : undefined;
        
        // Check if it's a TypeConstructorType and enhance quick info
        if (type && isTypeConstructorType(type)) {
            const enhancedDetails = enhanceQuickInfoForTypeConstructor(symbol, type, sourceFile, nodeForQuickInfo, typeChecker, verbosityLevel);
            if (enhancedDetails) {
                return {
                    kind: enhancedDetails.kind,
                    kindModifiers: enhancedDetails.kindModifiers,
                    textSpan: createTextSpanFromNode(nodeForQuickInfo, sourceFile),
                    displayParts: enhancedDetails.displayParts,
                    documentation: enhancedDetails.documentation,
                    tags: enhancedDetails.tags,
                };
            }
        }
        
        return type && {
            kind: ScriptElementKind.unknown,
            kindModifiers: ScriptElementKindModifier.none,
            textSpan: createTextSpanFromNode(nodeForQuickInfo, sourceFile),
            displayParts: typeChecker.runWithCancellationToken(cancellationToken, typeChecker => typeToDisplayParts(typeChecker, type, getContainerNode(nodeForQuickInfo), /*flags*/ undefined, verbosityLevel)),
            documentation: type.symbol ? type.symbol.getDocumentationComment(typeChecker) : undefined,
            tags: type.symbol ? type.symbol.getJsDocTags(typeChecker) : undefined,
        };
    }

    // ... rest of existing code for symbol-based quick info ...
}
```

### 2. Parameter Kind Formatting

#### Helper Function: `formatParameterKinds`

```typescript
function formatParameterKinds(
    parameterKinds: readonly Type[],
    checker: TypeChecker
): SymbolDisplayPart[] {
    const parts: SymbolDisplayPart[] = [];
    
    for (let i = 0; i < parameterKinds.length; i++) {
        if (i > 0) {
            parts.push({ kind: SymbolDisplayPartKind.punctuation, text: ", " });
        }
        
        const kind = parameterKinds[i];
        if (isKindType(kind)) {
            parts.push({ kind: SymbolDisplayPartKind.keyword, text: "Kind" });
            parts.push({ kind: SymbolDisplayPartKind.punctuation, text: "<" });
            parts.push(...formatParameterKinds(kind.parameterKinds, checker));
            parts.push({ kind: SymbolDisplayPartKind.punctuation, text: ">" });
        } else {
            // For simple types, show their name
            const typeName = checker.typeToString(kind);
            parts.push({ kind: SymbolDisplayPartKind.typeParameterName, text: typeName });
        }
    }
    
    return parts;
}
```

## Required Helper Functions

### Type Checking Functions

```typescript
// Helper functions for type checking
function isTypeReferenceNode(node: Node): node is TypeReferenceNode {
    return node.kind === SyntaxKind.TypeReference;
}

function isTypeParameterDeclaration(node: Node): node is TypeParameterDeclaration {
    return node.kind === SyntaxKind.TypeParameter;
}

function isTypeConstructorType(type: Type): type is TypeConstructorType {
    return !!(type.flags & TypeFlags.Object && (type as any).objectFlags & ObjectFlags.TypeConstructor);
}

function isKindType(type: Type): type is KindType {
    return !!(type.flags & TypeFlags.Kind);
}

function getNodeAtPosition(sourceFile: SourceFile, position: number): Node | undefined {
    // This is a simplified version - in practice, you'd use the proper node finding logic
    return sourceFile.getNodeAtPosition?.(position);
}
```

## Expected Behavior

### Completions

When the expected type is a KindType (e.g., `Kind<[Type, Type]>`), the completions should:

1. **Detect the expected kind arity**: Recognize that `Kind<[Type, Type]>` expects arity 1
2. **Find matching TypeConstructorTypes**: Search for all type constructors with arity 1 in scope
3. **Suggest relevant completions**: Show only type constructors that match the expected kind

**Example:**
```typescript
function map<F extends Kind<[Type, Type]>, A, B>(
    fa: Apply<F, [A]>, // Expected type is Kind<[Type, Type]>
    f: (a: A) => B
): Apply<F, [B]> { /* ... */ }

// When typing the first parameter, completions should suggest:
// - List (arity 1, kind Kind<[Type, Type]>)
// - Maybe (arity 1, kind Kind<[Type, Type]>)
// - Option (arity 1, kind Kind<[Type, Type]>)
// But NOT:
// - Either (arity 2, kind Kind<[Type, Type, Type]>)
```

### Quick Info

When hovering over a TypeConstructorType, the quick info should display:

1. **Base information**: Type name and basic details
2. **Kind signature**: The kind of the type constructor (e.g., `Kind<[Type, Type]>`)
3. **Arity**: Number of type parameters (e.g., `Arity: 1`)
4. **Enhanced documentation**: Additional context about the type constructor

**Example:**
```
List<T>
Kind signature: Kind<[Type, Type]>
Arity: 1

Type constructor with kind Kind<[Type, Type]> (1 parameter)
```

## Integration Steps

1. **Add helper functions** to the appropriate service files
2. **Modify `getCompletionsAtPosition`** to detect KindType expected types
3. **Modify `getQuickInfoAtPosition`** to enhance TypeConstructorType display
4. **Add type checking functions** for KindType and TypeConstructorType
5. **Test with real KindScript code** to ensure proper behavior

## Benefits

1. **Intelligent Completions**: Only suggest relevant type constructors based on kind constraints
2. **Enhanced Developer Experience**: Clear quick info showing kind signatures and arity
3. **Type Safety**: Compile-time validation of kind constraints
4. **Better Documentation**: Rich hover information for type constructors
5. **IDE Integration**: Seamless integration with existing TypeScript tooling

## Future Enhancements

1. **Kind Inference**: Automatically infer kinds for type constructors
2. **Higher-Order Kinds**: Support for more complex kind structures
3. **Kind Variance**: Display variance information in quick info
4. **Kind Composition**: Show composed kind signatures
5. **Performance Optimization**: Cache kind information for better performance 