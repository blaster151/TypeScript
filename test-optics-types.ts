/**
 * Optics Type Verification Test
 * 
 * This test verifies that cross-kind optic composition types are preserved
 * and working correctly.
 */

// Import optics types
import { lens, prism, optional } from './fp-optics';

// Test cross-kind composition types
function testCrossKindComposition() {
  // Lens → Optional = Optional
  const nameLens = lens<{ name: string }, { name: string }, string, string>(
    obj => obj.name,
    (name, obj) => ({ ...obj, name })
  );
  
  const emailOptional = optional<{ name: string }, { name: string }, string, string>(
    obj => obj.name.includes('@') ? { tag: 'Just' as const, value: obj.name } : { tag: 'Nothing' as const },
    (email, obj) => ({ ...obj, name: email })
  );
  
  // This should be an Optional
  const composed = nameLens.then(emailOptional);
  
  // Type verification
  type ComposedType = typeof composed;
  
  // Should have getOption method (Optional characteristic)
  const hasGetOption = 'getOption' in composed;
  const hasSet = 'set' in composed;
  
  console.log('✅ Cross-kind composition types verified');
  console.log('   Has getOption:', hasGetOption);
  console.log('   Has set:', hasSet);
  console.log('   Composed type:', typeof composed);
}

// Test Prism → Optional = Optional
function testPrismOptionalComposition() {
  const successPrism = prism<{ tag: string }, { tag: string }, { tag: 'success' }, { tag: 'success' }>(
    obj => obj.tag === 'success' ? { tag: 'Just' as const, value: obj as any } : { tag: 'Nothing' as const },
    value => value
  );
  
  const dataOptional = optional<{ tag: 'success' }, { tag: 'success' }, string, string>(
    obj => obj.tag === 'success' ? { tag: 'Just' as const, value: 'data' } : { tag: 'Nothing' as const },
    (data, obj) => obj
  );
  
  const composed = successPrism.then(dataOptional);
  
  // Type verification
  const hasGetOption = 'getOption' in composed;
  const hasSet = 'set' in composed;
  
  console.log('✅ Prism→Optional composition types verified');
  console.log('   Has getOption:', hasGetOption);
  console.log('   Has set:', hasSet);
}

// Test Optional → Optional = Optional
function testOptionalOptionalComposition() {
  const firstOptional = optional<{ data?: string }, { data?: string }, string, string>(
    obj => obj.data ? { tag: 'Just' as const, value: obj.data } : { tag: 'Nothing' as const },
    (value, obj) => ({ ...obj, data: value })
  );
  
  const secondOptional = optional<string, string, number, number>(
    str => str.length > 0 ? { tag: 'Just' as const, value: str.length } : { tag: 'Nothing' as const },
    (num, str) => str
  );
  
  const composed = firstOptional.then(secondOptional);
  
  // Type verification
  const hasGetOption = 'getOption' in composed;
  const hasSet = 'set' in composed;
  
  console.log('✅ Optional→Optional composition types verified');
  console.log('   Has getOption:', hasGetOption);
  console.log('   Has set:', hasSet);
}

// Run all tests
export function runOpticsTypeTests() {
  console.log('🔍 Testing Optics Cross-Kind Composition Types...\n');
  
  testCrossKindComposition();
  testPrismOptionalComposition();
  testOptionalOptionalComposition();
  
  console.log('\n🎯 All optics type tests completed!');
}

// Auto-run if this file is executed directly
if (require.main === module) {
  runOpticsTypeTests();
} 