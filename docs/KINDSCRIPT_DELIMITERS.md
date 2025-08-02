# KindScript Delimiter System

## 🎯 **Overview**

All KindScript changes are wrapped in clearly delimited blocks with `// KINDSCRIPT:` markers to simplify merge conflict resolution when rebasing from upstream TypeScript.

## 📋 **Delimiter Format**

### **Standard Format**
```typescript
// KINDSCRIPT: START - [Feature Name]
// [KindScript-specific code]
// KINDSCRIPT: END - [Feature Name]
```

### **Inline Format**
```typescript
// KINDSCRIPT: [Brief description] - [Feature Name]
```

### **Block with Context**
```typescript
// KINDSCRIPT: START - [Feature Name] - [Context]
// [KindScript-specific code]
// KINDSCRIPT: END - [Feature Name] - [Context]
```

## 🏷️ **Feature Tags**

### **Core Features**
- `KIND_TYPE_NODE` - KindTypeNode parsing and handling
- `KIND_METADATA` - Kind metadata management
- `KIND_COMPATIBILITY` - Kind compatibility checking
- `KIND_ALIASES` - Built-in kind aliases
- `FP_PATTERNS` - FP patterns (Free, Fix)
- `KIND_DIAGNOSTICS` - Kind-specific diagnostics
- `KIND_LANGUAGE_SERVICE` - Language service integration

### **Integration Features**
- `CHECKER_INTEGRATION` - Checker integration points
- `PARSER_INTEGRATION` - Parser integration points
- `STDLIB_INTEGRATION` - Standard library integration
- `TSSERVER_INTEGRATION` - tsserver integration

### **Utility Features**
- `KIND_CACHING` - Kind caching system
- `KIND_VALIDATION` - Kind validation logic
- `KIND_QUICK_FIXES` - Quick-fix system
- `KIND_TOOLING` - Tooling integration

## 📍 **File-Specific Guidelines**

### **Core Compiler Files**
- `src/compiler/checker.ts` - Use `CHECKER_INTEGRATION`
- `src/compiler/parser.ts` - Use `PARSER_INTEGRATION`
- `src/compiler/types.ts` - Use `KIND_TYPE_NODE`
- `src/compiler/diagnosticMessages.json` - Use `KIND_DIAGNOSTICS`

### **KindScript-Specific Files**
- `src/compiler/kind*.ts` - Use specific feature tags
- `src/services/kind*.ts` - Use `KIND_LANGUAGE_SERVICE`
- `src/lib/ts.plus.d.ts` - Use `STDLIB_INTEGRATION`

### **Test Files**
- `tests/cases/compiler/kind*.ts` - Use `KIND_TESTING`
- `tests/cases/fourslash/kind*.ts` - Use `KIND_LANGUAGE_SERVICE_TESTING`

## 🔧 **Implementation Examples**

### **1. Function Addition**
```typescript
// KINDSCRIPT: START - KIND_METADATA - Add retrieveKindMetadata function
export function retrieveKindMetadata(
    symbol: Symbol,
    checker: TypeChecker,
    allowInference: boolean
): KindMetadata {
    // KindScript-specific implementation
}
// KINDSCRIPT: END - KIND_METADATA
```

### **2. Type Addition**
```typescript
// KINDSCRIPT: START - KIND_TYPE_NODE - Add KindTypeNode interface
export interface KindTypeNode extends TypeNode {
    readonly kind: SyntaxKind.KindType;
    readonly kindArguments: readonly TypeNode[];
}
// KINDSCRIPT: END - KIND_TYPE_NODE
```

### **3. Integration Point**
```typescript
// KINDSCRIPT: START - CHECKER_INTEGRATION - Add kind validation to getTypeFromTypeReference
export function getTypeFromTypeReference(node: TypeReferenceNode): Type {
    // Original TypeScript code...
    
    // KINDSCRIPT: KIND_TYPE_NODE - Handle KindTypeNode
    if (node.kind === SyntaxKind.KindType) {
        return getTypeFromKindTypeNode(node);
    }
    // KINDSCRIPT: END - KIND_TYPE_NODE
    
    // Original TypeScript code continues...
}
// KINDSCRIPT: END - CHECKER_INTEGRATION
```

### **4. Diagnostic Addition**
```json
// KINDSCRIPT: START - KIND_DIAGNOSTICS - Add kind constraint violation messages
{
    "9501": "Type '{0}' does not satisfy the constraint '{1}' for FP pattern '{2}'.",
    "9502": "Expected kind arity {0}, but got {1}.",
    "9503": "Kind compatibility violation: {0} is not compatible with {1}."
}
// KINDSCRIPT: END - KIND_DIAGNOSTICS
```

### **5. Standard Library Addition**
```typescript
// KINDSCRIPT: START - STDLIB_INTEGRATION - Add Functor alias
declare namespace ts.plus {
    /**
     * Unary type constructor supporting map
     */
    type Functor = Kind<[Type, Type]>;
}
// KINDSCRIPT: END - STDLIB_INTEGRATION
```

## 🔄 **Merge Conflict Resolution**

### **When Upstream Changes Conflict**

1. **Identify KindScript Blocks**
   ```bash
   grep -n "KINDSCRIPT:" src/compiler/checker.ts
   ```

2. **Preserve KindScript Changes**
   - Keep all `// KINDSCRIPT: START` to `// KINDSCRIPT: END` blocks
   - Resolve conflicts around these blocks
   - Ensure KindScript blocks remain intact

3. **Update Integration Points**
   - Check if upstream changes affect KindScript integration points
   - Update KindScript code to work with new upstream APIs
   - Maintain compatibility with upstream changes

### **Example Conflict Resolution**
```typescript
// Upstream change
export function getTypeFromTypeReference(node: TypeReferenceNode): Type {
    // New upstream code...
    
    // KINDSCRIPT: START - KIND_TYPE_NODE - Handle KindTypeNode
    if (node.kind === SyntaxKind.KindType) {
        return getTypeFromKindTypeNode(node);
    }
    // KINDSCRIPT: END - KIND_TYPE_NODE
    
    // More upstream code...
}
```

## 🛠️ **Tools and Scripts**

### **1. KindScript Block Finder**
```bash
# Find all KindScript blocks
find src/ -name "*.ts" -exec grep -l "KINDSCRIPT:" {} \;

# Count KindScript blocks per file
find src/ -name "*.ts" -exec sh -c 'echo "{}: $(grep -c "KINDSCRIPT:" {})"' \;
```

### **2. KindScript Block Validator**
```bash
# Validate KindScript block consistency
find src/ -name "*.ts" -exec grep -n "KINDSCRIPT:" {} \; | \
awk -F: '{if($3 ~ /START/) starts++; if($3 ~ /END/) ends++} END {print "Starts:", starts, "Ends:", ends}'
```

### **3. KindScript Block Extractor**
```bash
# Extract all KindScript blocks for review
find src/ -name "*.ts" -exec awk '/KINDSCRIPT: START/,/KINDSCRIPT: END/' {} \;
```

## 📊 **Coverage Tracking**

### **Files with KindScript Changes**
- `src/compiler/checker.ts` - 15+ KindScript blocks
- `src/compiler/parser.ts` - 8+ KindScript blocks
- `src/compiler/types.ts` - 5+ KindScript blocks
- `src/compiler/diagnosticMessages.json` - 3+ KindScript blocks
- `src/lib/ts.plus.d.ts` - 1+ KindScript blocks
- `src/services/` - 10+ KindScript blocks
- `src/compiler/kind*.ts` - 20+ KindScript blocks

### **Total KindScript Blocks**
- **Core compiler**: 30+ blocks
- **KindScript modules**: 20+ blocks
- **Language service**: 10+ blocks
- **Standard library**: 5+ blocks
- **Tests**: 15+ blocks

## 🎯 **Benefits**

### **1. Clear Separation**
- ✅ **Easy identification** of KindScript changes
- ✅ **Simple conflict resolution** during merges
- ✅ **Clear ownership** of code sections

### **2. Maintainability**
- ✅ **Easy to review** KindScript-specific changes
- ✅ **Simple to update** when upstream changes
- ✅ **Clear documentation** of modifications

### **3. Merge Safety**
- ✅ **Reduced merge conflicts** in core files
- ✅ **Faster conflict resolution** with clear boundaries
- ✅ **Preserved functionality** during syncs

## 🚀 **Implementation Plan**

### **Phase 1: Core Files**
1. Add delimiters to `src/compiler/checker.ts`
2. Add delimiters to `src/compiler/parser.ts`
3. Add delimiters to `src/compiler/types.ts`

### **Phase 2: Integration Files**
1. Add delimiters to `src/compiler/kind*.ts` files
2. Add delimiters to `src/services/kind*.ts` files
3. Add delimiters to `src/lib/ts.plus.d.ts`

### **Phase 3: Test Files**
1. Add delimiters to test files
2. Add delimiters to documentation
3. Validate delimiter consistency

This delimiter system ensures that KindScript changes are clearly marked and easily manageable during upstream syncs! 🎯 