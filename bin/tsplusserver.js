#!/usr/bin/env node
/**
 * tsplusserver - Kind-aware TypeScript language server
 * 
 * This is a drop-in replacement for tsserver that uses our forked
 * TypeScript language server with Kind<> support and FP patterns.
 * 
 * Usage:
 *   npx tsplusserver
 *   # Or configure VSCode to use this as the TypeScript language server
 */

const path = require("path");
const fs = require("fs");

// Resolve the forked TypeScript language server
const serverPath = path.resolve(__dirname, "../lib/tsserver.js");

// Check if the compiled tsserver.js exists
if (!fs.existsSync(serverPath)) {
    console.error("❌ Error: TypeScript language server not found at:", serverPath);
    console.error("💡 Please run 'npm run build' first to compile the TypeScript language server");
    process.exit(1);
}

// Add a banner to show we're using the Kind-aware version
console.log("🚀 tsplusserver - Kind-aware TypeScript language server");
console.log("✨ Built with support for Kind<>, Functor, Bifunctor, HKT, Free, and Fix patterns");
console.log("📡 Starting language server...");

// Pass all arguments through to the forked TypeScript language server
try {
    require(serverPath);
} catch (error) {
    console.error("❌ Error running TypeScript language server:", error.message);
    process.exit(1);
} 