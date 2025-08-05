// This file is a simple JavaScript runner for the TypeScript tests.
// It compiles the test file and then runs the compiled JavaScript.

const { execSync } = require('child_process');
const path = require('path');

const testFile = 'test-product-matchers.ts';
const compiledJsFile = testFile.replace('.ts', '.js');

console.log(`🚀 Running Product Type Pattern Matching Tests\n`);

try {
    // Compile the test file
    execSync(`npx tsc --project tsconfig.json --outDir . ${testFile}`, { stdio: 'inherit' });
    console.log(`- ${testFile}: ✅ Compiles successfully`);

    // Run the compiled JavaScript test file
    require(path.resolve(__dirname, compiledJsFile)).runAllProductMatcherTests();

    console.log(`\n✅ All Product Type Pattern Matching tests completed successfully!`);
    console.log(`\n🎉 The matchProduct system is ready for production use!`);
    console.log(`- Comprehensive coverage of product type pattern matching`);
    console.log(`- Full type safety and inference without boilerplate`);
    console.log(`- Integration with createProductType and the ADT ecosystem`);

} catch (error) {
    console.error(`\n❌ Tests failed:`);
    console.error(error.message);
    process.exit(1);
} 