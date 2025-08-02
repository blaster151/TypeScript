// @target: es2020
// @lib: es2020,dom
// @strict: true

// Test basic type alias usage
// This test verifies that the kind metadata system can be imported and used

// Import the kind metadata functions
import { retrieveBuiltInKindMetadata, isBuiltInKindAlias } from "../../../src/compiler/kindAliasMetadata.js";

// Test that the functions exist and can be called
function testKindAliasFunctions() {
    // These should not cause runtime errors
    const symbol = {} as any;
    const checker = {} as any;
    
    // Test that the functions can be called
    const isAlias = isBuiltInKindAlias(symbol);
    const metadata = retrieveBuiltInKindMetadata(symbol, checker);
    
    return { isAlias, metadata };
}

// Test that the module exports are available
export { testKindAliasFunctions }; 