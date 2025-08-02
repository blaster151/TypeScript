#!/bin/bash

# Pre-commit hook for KindScript validation
# This script runs before commits to ensure kind synchronization

set -e

echo "🔍 Running KindScript pre-commit validation..."

# Check if kind-related files are being committed
if git diff --cached --name-only | grep -E "(src/compiler/kindMetadataCentral\.ts|src/lib/tsplus\.d\.ts|scripts/generateKindDTs\.js)" > /dev/null; then
    echo "📝 Kind-related files detected in commit"
    
    # Run .d.ts generation validation
    echo "🔄 Validating .d.ts generation..."
    if npm run validate:kind-dts; then
        echo "✅ .d.ts generation validation passed"
    else
        echo "❌ .d.ts generation validation failed"
        echo "💡 Please run 'npm run generate:kind-dts' and commit the changes"
        exit 1
    fi
    
    # Run full synchronization validation
    echo "🔄 Running full synchronization validation..."
    if npm run validate:kind-sync; then
        echo "✅ Full synchronization validation passed"
    else
        echo "❌ Full synchronization validation failed"
        echo "💡 Please fix the synchronization issues before committing"
        exit 1
    fi
else
    echo "ℹ️  No kind-related files in commit, skipping validation"
fi

echo "🎉 Pre-commit validation completed successfully" 