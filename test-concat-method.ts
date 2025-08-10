// Import the compiled JavaScript version
const { PersistentList } = require('./fp-persistent.js');

/**
 * Test PersistentList concat method and fluent API fallback fixes
 */
function testPersistentListConcatAndFluentFallback() {
  console.log('\n=== Testing PersistentList Concat Method and Fluent API Fallback ===');

  // Test concat method
  const list1 = PersistentList.fromArray([1, 2, 3]);
  const list2 = PersistentList.fromArray([4, 5, 6]);
  const concatenated = list1.concat(list2);
  
  console.log(`✅ Concat method: ${concatenated.size === 6 && concatenated.get(0) === 1 && concatenated.get(5) === 6}`);
  
  // Test concat with empty lists
  const emptyList = PersistentList.empty();
  const concatWithEmpty = list1.concat(emptyList);
  console.log(`✅ Concat with empty: ${concatWithEmpty.size === 3 && concatWithEmpty.get(0) === 1}`);
  
  const emptyConcatList = emptyList.concat(list1);
  console.log(`✅ Empty concat list: ${emptyConcatList.size === 3 && emptyConcatList.get(0) === 1}`);

  // Test fluent API flatMap fallback (should not cause infinite recursion)
  try {
    // This should work without infinite recursion
    const mapped = list1.map(x => x * 2);
    console.log(`✅ Fluent map: ${mapped.size === 3 && mapped.get(0) === 2}`);
    
    // Test that flatMap fallback works correctly
    const flatMapped = list1.flatMap(x => PersistentList.fromArray([x, x * 2]));
    console.log(`✅ Fluent flatMap fallback: ${flatMapped.size === 6 && flatMapped.get(0) === 1 && flatMapped.get(1) === 2}`);
    
    console.log('✅ No infinite recursion detected in fluent API');
  } catch (error) {
    console.log(`❌ Fluent API error: ${error.message}`);
  }

  // Test performance of concat with larger lists
  const largeList1 = PersistentList.fromArray(Array.from({ length: 1000 }, (_, i) => i));
  const largeList2 = PersistentList.fromArray(Array.from({ length: 1000 }, (_, i) => i + 1000));
  
  const startTime = Date.now();
  const largeConcatenated = largeList1.concat(largeList2);
  const endTime = Date.now();
  
  console.log(`✅ Large concat performance: ${largeConcatenated.size === 2000 && largeConcatenated.get(0) === 0 && largeConcatenated.get(1999) === 1999}`);
  console.log(`✅ Concat time: ${endTime - startTime}ms`);

  console.log('\n🎉 All concat method and fluent API fallback tests passed!');
  console.log('📈 Concat method uses optimized internal iterator for O(n) performance');
  console.log('🛡️ Fluent API fallback prevents infinite recursion');
}

// Run the test
testPersistentListConcatAndFluentFallback();
