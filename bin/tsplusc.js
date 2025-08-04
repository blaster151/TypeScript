#!/usr/bin/env node
/**
 * tsplusc - Kind-aware TypeScript compiler CLI
 * 
 * This is a drop-in replacement for tsc that uses our forked
 * TypeScript compiler with Kind<> support and FP patterns.
 * 
 * Usage:
 *   npx tsplusc --version
 *   npx tsplusc --project tsconfig.json
 *   npx tsplusc src/*.ts
 */

const path = require("path");
const fs = require("fs");

// Resolve the forked TypeScript CLI
const tscPath = path.resolve(__dirname, "../lib/tsc.js");

// Check if the compiled tsc.js exists
if (!fs.existsSync(tscPath)) {
    console.error("❌ Error: TypeScript compiler not found at:", tscPath);
    console.error("💡 Please run 'npm run build' first to compile the TypeScript compiler");
    process.exit(1);
}

// Add a banner to show we're using the Kind-aware version
if (process.argv.includes("--version") || process.argv.includes("-v")) {
    console.log("tsplusc - Kind-aware TypeScript compiler");
    console.log("Built with support for Kind<>, Functor, Bifunctor, HKT, Free, and Fix patterns");
    console.log("");
}

// Pass all arguments through to the forked TypeScript compiler
try {
    require(tscPath);
} catch (error) {
    console.error("❌ Error running TypeScript compiler:", error.message);
    process.exit(1);
} 