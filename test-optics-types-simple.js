/**
 * Optics Type Verification Test (Simple)
 * 
 * This test verifies that cross-kind optic composition types are preserved
 * and working correctly at runtime.
 */

console.log('🔍 Testing Optics Cross-Kind Composition Types...\n');

// Mock optics for testing
function lens(getter, setter) {
  return {
    get: getter,
    set: setter,
    then: function(next) {
      return {
        get: (s) => next.get(this.get(s)),
        set: (b, s) => this.set(next.set(b, this.get(s)), s),
        getOption: next.getOption ? (s) => next.getOption(this.get(s)) : undefined
      };
    }
  };
}

function prism(match, build) {
  return {
    match,
    build,
    then: function(next) {
      return {
        match: (s) => {
          const result = this.match(s);
          if (result && result.tag === 'Just') {
            return next.match ? next.match(result.value) : { tag: 'Just', value: result.value };
          }
          return { tag: 'Nothing' };
        },
        build: (b) => this.build(next.build(b)),
        getOption: next.getOption ? (s) => {
          const result = this.match(s);
          if (result && result.tag === 'Just') {
            return next.getOption(result.value);
          }
          return { tag: 'Nothing' };
        } : undefined
      };
    }
  };
}

function optional(getOption, set) {
  return {
    getOption,
    set,
    then: function(next) {
      return {
        getOption: (s) => {
          const result = this.getOption(s);
          if (result && result.tag === 'Just') {
            return next.getOption ? next.getOption(result.value) : { tag: 'Just', value: result.value };
          }
          return { tag: 'Nothing' };
        },
        set: (b, s) => {
          const result = this.getOption(s);
          if (result && result.tag === 'Just') {
            return this.set(next.set ? next.set(b, result.value) : b, s);
          }
          return s;
        }
      };
    }
  };
}

// Test cross-kind composition types
function testCrossKindComposition() {
  console.log('Testing Lens → Optional = Optional:');
  
  const nameLens = lens(
    obj => obj.name,
    (name, obj) => ({ ...obj, name })
  );
  
  const emailOptional = optional(
    obj => obj.name.includes('@') ? { tag: 'Just', value: obj.name } : { tag: 'Nothing' },
    (email, obj) => ({ ...obj, name: email })
  );
  
  // This should be an Optional
  const composed = nameLens.then(emailOptional);
  
  // Type verification
  const hasGetOption = 'getOption' in composed;
  const hasSet = 'set' in composed;
  const hasGet = 'get' in composed;
  
  console.log('   Has getOption (Optional characteristic):', hasGetOption);
  console.log('   Has set (Optional characteristic):', hasSet);
  console.log('   Has get (Lens characteristic):', hasGet);
  console.log('   Composed type:', typeof composed);
  
  if (hasGetOption && hasSet && !hasGet) {
    console.log('✅ Lens→Optional composition correctly returns Optional');
  } else {
    console.log('❌ Lens→Optional composition type incorrect');
  }
}

// Test Prism → Optional = Optional
function testPrismOptionalComposition() {
  console.log('\nTesting Prism → Optional = Optional:');
  
  const successPrism = prism(
    obj => obj.tag === 'success' ? { tag: 'Just', value: obj } : { tag: 'Nothing' },
    value => value
  );
  
  const dataOptional = optional(
    obj => obj.tag === 'success' ? { tag: 'Just', value: 'data' } : { tag: 'Nothing' },
    (data, obj) => obj
  );
  
  const composed = successPrism.then(dataOptional);
  
  // Type verification
  const hasGetOption = 'getOption' in composed;
  const hasSet = 'set' in composed;
  const hasMatch = 'match' in composed;
  
  console.log('   Has getOption (Optional characteristic):', hasGetOption);
  console.log('   Has set (Optional characteristic):', hasSet);
  console.log('   Has match (Prism characteristic):', hasMatch);
  
  if (hasGetOption && hasSet && !hasMatch) {
    console.log('✅ Prism→Optional composition correctly returns Optional');
  } else {
    console.log('❌ Prism→Optional composition type incorrect');
  }
}

// Test Optional → Optional = Optional
function testOptionalOptionalComposition() {
  console.log('\nTesting Optional → Optional = Optional:');
  
  const firstOptional = optional(
    obj => obj.data ? { tag: 'Just', value: obj.data } : { tag: 'Nothing' },
    (value, obj) => ({ ...obj, data: value })
  );
  
  const secondOptional = optional(
    str => str.length > 0 ? { tag: 'Just', value: str.length } : { tag: 'Nothing' },
    (num, str) => str
  );
  
  const composed = firstOptional.then(secondOptional);
  
  // Type verification
  const hasGetOption = 'getOption' in composed;
  const hasSet = 'set' in composed;
  
  console.log('   Has getOption (Optional characteristic):', hasGetOption);
  console.log('   Has set (Optional characteristic):', hasSet);
  
  if (hasGetOption && hasSet) {
    console.log('✅ Optional→Optional composition correctly returns Optional');
  } else {
    console.log('❌ Optional→Optional composition type incorrect');
  }
}

// Test runtime behavior
function testRuntimeBehavior() {
  console.log('\nTesting Runtime Behavior:');
  
  const nameLens = lens(
    obj => obj.name,
    (name, obj) => ({ ...obj, name })
  );
  
  const emailOptional = optional(
    obj => obj.name.includes('@') ? { tag: 'Just', value: obj.name } : { tag: 'Nothing' },
    (email, obj) => ({ ...obj, name: email })
  );
  
  const composed = nameLens.then(emailOptional);
  
  const testObj1 = { name: 'test@example.com' };
  const testObj2 = { name: 'not-an-email' };
  
  const result1 = composed.getOption(testObj1);
  const result2 = composed.getOption(testObj2);
  
  console.log('   Email object result:', result1);
  console.log('   Non-email object result:', result2);
  
  if (result1.tag === 'Just' && result2.tag === 'Nothing') {
    console.log('✅ Runtime behavior correct');
  } else {
    console.log('❌ Runtime behavior incorrect');
  }
}

// Run all tests
function runOpticsTypeTests() {
  testCrossKindComposition();
  testPrismOptionalComposition();
  testOptionalOptionalComposition();
  testRuntimeBehavior();
  
  console.log('\n🎯 All optics type tests completed!');
}

// Run tests
runOpticsTypeTests(); 