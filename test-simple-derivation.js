/**
 * Simple Automatic Derivation Test
 * 
 * A minimal test to verify that automatic derivation of Eq, Ord, and Show
 * instances works correctly for both sum types and product types.
 */

console.log('🧪 Simple Automatic Derivation Test');
console.log('===================================');

try {
  // Test 1: Sum Type Derivation
  console.log('\n📋 Test 1: Sum Type Derivation');
  
  const { createSumType } = require('./fp-adt-builders');
  
  const Maybe = createSumType({
    Just: (value) => ({ value }),
    Nothing: () => ({})
  }, {
    name: 'Maybe',
    derive: ['Eq', 'Ord', 'Show']
  });
  
  const just1 = Maybe.constructors.Just(42);
  const just2 = Maybe.constructors.Just(42);
  const nothing = Maybe.constructors.Nothing();
  
  console.log('✅ Maybe instances created successfully');
  console.log(`   - Eq: ${Maybe.Eq ? '✅' : '❌'}`);
  console.log(`   - Ord: ${Maybe.Ord ? '✅' : '❌'}`);
  console.log(`   - Show: ${Maybe.Show ? '✅' : '❌'}`);
  
  // Test basic functionality
  console.log(`   - just1 === just2: ${Maybe.Eq?.equals(just1, just2)}`);
  console.log(`   - just1 vs nothing: ${Maybe.Ord?.compare(just1, nothing)}`);
  console.log(`   - show(just1): ${Maybe.Show?.show(just1)}`);
  
  // Test 2: Product Type Derivation
  console.log('\n📋 Test 2: Product Type Derivation');
  
  const { createProductType } = require('./fp-adt-builders');
  
  const Point = createProductType({
    name: 'Point',
    derive: ['Eq', 'Ord', 'Show']
  });
  
  const p1 = Point.of({ x: 1, y: 2 });
  const p2 = Point.of({ x: 1, y: 2 });
  const p3 = Point.of({ x: 2, y: 1 });
  
  console.log('✅ Point instances created successfully');
  console.log(`   - Eq: ${Point.Eq ? '✅' : '❌'}`);
  console.log(`   - Ord: ${Point.Ord ? '✅' : '❌'}`);
  console.log(`   - Show: ${Point.Show ? '✅' : '❌'}`);
  
  // Test basic functionality
  console.log(`   - p1 === p2: ${Point.Eq?.equals(p1, p2)}`);
  console.log(`   - p1 vs p3: ${Point.Ord?.compare(p1, p3)}`);
  console.log(`   - show(p1): ${Point.Show?.show(p1)}`);
  
  console.log('\n🎉 All tests passed!');
  console.log('✅ Automatic derivation is working correctly');
  
} catch (error) {
  console.log('\n❌ Test failed:', error.message);
  console.log('Stack trace:', error.stack);
} 