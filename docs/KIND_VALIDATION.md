# KindScript Validation System

## 🎯 **Overview**

The KindScript validation system ensures that all components of the kind system remain synchronized:

- **Centralized metadata** (`src/compiler/kindMetadataCentral.ts`)
- **Generated .d.ts** (`src/lib/tsplus.d.ts`)
- **Language service completions** (tsplusserver)
- **Compiler integration** (tsplusc)

## 🔧 **Validation Scripts**

### **1. Full Synchronization Validation**

```bash
npm run validate:kind-sync
```

**What it does:**
- ✅ Validates file existence
- ✅ Checks metadata consistency
- ✅ Verifies .d.ts generation
- ✅ Validates generated content
- ✅ Tests server completions

### **2. .d.ts Generation Validation**

```bash
npm run validate:kind-dts
```

**What it does:**
- ✅ Runs generation script
- ✅ Compares with committed output
- ✅ Fails if out of sync

## 🚀 **CI/CD Integration**

### **GitHub Actions**

The validation runs automatically on:
- **Push** to `main` or `develop` branches
- **Pull requests** to `main` or `develop` branches
- **Manual trigger** via workflow dispatch

**Workflow**: `.github/workflows/validate-kind-sync.yml`

### **Pre-commit Hook**

Automatically validates before commits:
- Checks if kind-related files are being committed
- Runs validation scripts
- Prevents commits if validation fails

**Script**: `scripts/pre-commit-kind-validation.sh`

## 📋 **Validation Checks**

### **1. File Existence Check**

Validates that all required files exist:
- `src/compiler/kindMetadataCentral.ts`
- `src/lib/tsplus.d.ts`
- `scripts/generateKindDTs.js`
- `bin/tsplusserver.js`

### **2. Metadata Consistency**

Checks that centralized metadata contains:
- Required exports (`KindAliasMetadata`, `getKindAliasMetadata`, etc.)
- Core aliases (`Functor`, `Bifunctor`, `Free`, `Fix`)

### **3. .d.ts Generation**

- Runs generation script
- Compares output with committed file
- Shows diff if out of sync
- Validates required content

### **4. Generated Content Validation**

Ensures generated .d.ts contains:
- Auto-generation header
- `declare namespace ts.plus`
- Core type aliases
- FP patterns
- TODO comments

### **5. Server Completions**

- Starts tsplusserver
- Tests basic functionality
- Validates server can respond

## 🛠️ **Manual Validation**

### **Check .d.ts Sync**

```bash
# Generate .d.ts
npm run generate:kind-dts

# Check if it matches committed version
git diff src/lib/tsplus.d.ts
```

### **Run Full Validation**

```bash
# Run complete validation
node scripts/validateKindSync.js
```

### **Fix Sync Issues**

```bash
# Regenerate .d.ts
npm run generate:kind-dts

# Commit changes
git add src/lib/tsplus.d.ts
git commit -m "Regenerate .d.ts from updated metadata"
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. .d.ts Out of Sync**

**Error**: `Generated .d.ts file is out of sync with metadata`

**Solution**:
```bash
npm run generate:kind-dts
git add src/lib/tsplus.d.ts
git commit -m "Regenerate .d.ts"
```

#### **2. Server Validation Failed**

**Error**: `Server validation failed`

**Solution**:
```bash
# Check if tsplusserver exists
ls -la bin/tsplusserver.js

# Rebuild if needed
npm run build:compiler
```

#### **3. Missing Metadata Exports**

**Error**: `Missing export: KindAliasMetadata`

**Solution**:
- Check `src/compiler/kindMetadataCentral.ts`
- Ensure all required exports are present
- Verify core aliases are defined

### **Debug Mode**

Run validation with verbose output:

```bash
DEBUG=true node scripts/validateKindSync.js
```

## 📊 **Validation Results**

### **Success Output**

```
🚀 KindScript Synchronization Validation

=== File Existence Check ===
✅ Centralized metadata file found: src/compiler/kindMetadataCentral.ts
✅ Generated .d.ts file found: src/lib/tsplus.d.ts
✅ Generation script found: scripts/generateKindDTs.js
✅ tsplusserver binary found: bin/tsplusserver.js

=== Metadata Consistency Validation ===
✅ Found export: KindAliasMetadata
✅ Found export: getKindAliasMetadata
✅ Found core alias: Functor
✅ Found core alias: Bifunctor
✅ Found core alias: Free
✅ Found core alias: Fix

=== Generated .d.ts Validation ===
✅ .d.ts file is up to date with metadata

=== Generated .d.ts Content Validation ===
✅ Found required content: declare namespace ts.plus
✅ Found required content: type Functor = Kind<[Type, Type]>
✅ Found auto-generation header

=== tsplusserver Completions Validation ===
✅ tsplusserver started successfully
✅ Server functionality validated

🎉 All validations passed!
⏱️  Validation completed in 2.34 seconds
```

### **Failure Output**

```
🚀 KindScript Synchronization Validation

=== File Existence Check ===
✅ Centralized metadata file found: src/compiler/kindMetadataCentral.ts
❌ Generated .d.ts file not found: src/lib/tsplus.d.ts

💥 Validation failed: Required files missing
```

## 🔄 **Automation**

### **Git Hooks**

Install pre-commit hook:

```bash
# Make script executable
chmod +x scripts/pre-commit-kind-validation.sh

# Add to git hooks
cp scripts/pre-commit-kind-validation.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### **VS Code Integration**

Add to `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "typescript.validate.enable": true
}
```

## 📈 **Monitoring**

### **Validation Metrics**

Track validation performance:
- **Execution time**: Target < 5 seconds
- **Success rate**: Target 100%
- **Failure frequency**: Monitor for patterns

### **Alerting**

Set up alerts for:
- Validation failures in CI
- .d.ts sync issues
- Server validation problems

## 🎯 **Best Practices**

### **1. Always Run Validation**

- Before committing kind-related changes
- After updating metadata
- Before releasing

### **2. Keep Metadata Updated**

- Update `kindMetadataCentral.ts` first
- Run validation immediately
- Commit generated .d.ts changes

### **3. Monitor CI Results**

- Check GitHub Actions for failures
- Address validation issues promptly
- Keep validation scripts updated

### **4. Document Changes**

- Update this documentation when adding new validation checks
- Document new metadata fields
- Keep troubleshooting guide current

## 🚀 **Future Enhancements**

### **Planned Features**

1. **Performance Monitoring**
   - Track validation execution time
   - Alert on slow validations

2. **Enhanced Server Testing**
   - Test actual LSP completions
   - Validate hover documentation

3. **Cross-Platform Support**
   - Windows compatibility
   - macOS validation

4. **Integration Testing**
   - End-to-end workflow testing
   - Real-world usage scenarios 