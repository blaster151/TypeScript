/**
 * Test Profunctor Inference
 * 
 * This file tests the Profunctor inference functionality
 * without relying on the test framework.
 */

const {
  Tagged, inferProfunctor, dimap, lmap, rmap, Auto
} = require('./fp-registry-init');

// Test function to verify Profunctor inference
function testProfunctorInference() {
  console.log("🧪 Testing Profunctor Inference...");
  
  try {
    // Test 1: Basic dimap
    const taggedFunction: any = { 
      __tag: 'Function', 
      value: (x: number) => x * 2 
    };
    
    const dimapResult = dimap(
      taggedFunction,
      (s: string) => parseInt(s),  // contramap: string -> number
      (n: number) => n.toString()  // map: number -> string
    );
    
    const result1 = dimapResult.value("10");
    console.log("✅ dimap test:", result1 === "20" ? "PASS" : "FAIL", result1);
    
    // Test 2: lmap (contramap)
    const lmapResult = lmap(taggedFunction, (s: string) => parseInt(s));
    const result2 = lmapResult.value("5");
    console.log("✅ lmap test:", result2 === 10 ? "PASS" : "FAIL", result2);
    
    // Test 3: rmap (map)
    const rmapResult = rmap(taggedFunction, (n: number) => n.toString());
    const result3 = rmapResult.value(5);
    console.log("✅ rmap test:", result3 === "10" ? "PASS" : "FAIL", result3);
    
    // Test 4: Auto fluent API
    const autoFunction = new Auto(taggedFunction);
    const autoResult = autoFunction
      .dimap((s: string) => parseInt(s), (n: number) => n.toString())
      .unwrap();
    const result4 = autoResult("10");
    console.log("✅ Auto dimap test:", result4 === "20" ? "PASS" : "FAIL", result4);
    
    // Test 5: Chained operations
    const chainedResult = new Auto(taggedFunction)
      .lmap((s: string) => parseInt(s))
      .rmap((n: number) => n.toString())
      .unwrap();
    const result5 = chainedResult("5");
    console.log("✅ Chained operations test:", result5 === "10" ? "PASS" : "FAIL", result5);
    
    console.log("🎉 All Profunctor inference tests completed!");
    
  } catch (error) {
    console.error("❌ Profunctor inference test failed:", error);
  }
}

// Run the test
testProfunctorInference();
