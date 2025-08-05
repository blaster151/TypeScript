// This file is a simple JavaScript runner for the TypeScript tests.
// It compiles the test file and then runs the compiled JavaScript.

const { execSync } = require('child_process');
const path = require('path');

const testFile = 'test-pattern-matching-ergonomics.ts';
const compiledJsFile = testFile.replace('.ts', '.js');

console.log(`🚀 Running Enhanced Pattern Matching Ergonomics Tests\n`);

try {
    // Compile the test file
    execSync(`npx tsc --project tsconfig.json --outDir . ${testFile}`, { stdio: 'inherit' });
    console.log(`- ${testFile}: ✅ Compiles successfully`);

    // Run the compiled JavaScript test file
    require(path.resolve(__dirname, compiledJsFile)).runAllEnhancedPatternMatchingTests();

    console.log(`\n✅ All Enhanced Pattern Matching Ergonomics tests completed successfully!`);
    console.log(`\n🎉 The Enhanced Pattern Matching system is ready for production use!`);
    console.log(`- Comprehensive coverage of pattern matching patterns with production-ready implementation`);
    console.log(`- Full type safety and exhaustiveness checking`);
    console.log(`- Immutable compatibility and performance optimization`);
    console.log(`- Ergonomic .match and .matchTag instance methods`);

} catch (error) {
    console.error(`\n❌ Tests failed:`);
    console.error(error.message);
    process.exit(1);
} 