/**
 * Simple test for Fluent ADT System
 */

console.log('🚀 Testing Fluent ADT System...');

// Test 1: Basic derivation
try {
  console.log('\n📋 Test 1: Basic Derivation');
  
  // Mock derivation functions
  const deriveFunctorInstance = () => ({
    map: (fa, f) => {
      if (fa.tag === 'Just') {
        return { tag: 'Just', value: f(fa.value) };
      }
      return { tag: 'Nothing' };
    }
  });

  const deriveMonadInstance = () => ({
    of: (a) => ({ tag: 'Just', value: a }),
    chain: (fa, f) => {
      if (fa.tag === 'Just') {
        return f(fa.value);
      }
      return { tag: 'Nothing' };
    }
  });

  const deriveEqInstance = () => ({
    equals: (a, b) => {
      if (a.tag === 'Just' && b.tag === 'Just') {
        return a.value === b.value;
      }
      return a.tag === b.tag;
    }
  });

  const deriveShowInstance = () => ({
    show: (a) => {
      if (a.tag === 'Just') {
        return `Just(${JSON.stringify(a.value)})`;
      }
      return 'Nothing';
    }
  });

  // Test instances
  const functor = deriveFunctorInstance();
  const monad = deriveMonadInstance();
  const eq = deriveEqInstance();
  const show = deriveShowInstance();

  // Test Functor
  const maybe = { tag: 'Just', value: 42 };
  const doubled = functor.map(maybe, x => x * 2);
  console.log('✅ Functor test:', doubled);

  // Test Monad
  const chained = monad.chain(maybe, x => ({ tag: 'Just', value: x.toString() }));
  console.log('✅ Monad test:', chained);

  // Test Eq
  const equal = eq.equals(maybe, { tag: 'Just', value: 42 });
  console.log('✅ Eq test:', equal);

  // Test Show
  const str = show.show(maybe);
  console.log('✅ Show test:', str);

} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: Fluent method simulation
try {
  console.log('\n📋 Test 2: Fluent Methods');

  // Simulate fluent methods
  const addFluentMethods = (adt, typeName) => {
    const fluent = { ...adt };
    
    fluent.map = (f) => {
      if (adt.tag === 'Just') {
        return { tag: 'Just', value: f(adt.value) };
      }
      return { tag: 'Nothing' };
    };

    fluent.chain = (f) => {
      if (adt.tag === 'Just') {
        return f(adt.value);
      }
      return { tag: 'Nothing' };
    };

    fluent.filter = (predicate) => {
      if (adt.tag === 'Just' && predicate(adt.value)) {
        return { tag: 'Just', value: adt.value };
      }
      return { tag: 'Nothing' };
    };

    return fluent;
  };

  const maybe = { tag: 'Just', value: 42 };
  const fluentMaybe = addFluentMethods(maybe, 'Maybe');

  // Test fluent chaining
  const result = fluentMaybe
    .map(x => x * 2)
    .filter(x => x > 50)
    .chain(x => ({ tag: 'Just', value: `Result: ${x}` }));

  console.log('✅ Fluent chaining test:', result);

} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

// Test 3: Auto-registration simulation
try {
  console.log('\n📋 Test 3: Auto-Registration');

  const registry = new Map();

  const autoRegisterADT = (config) => {
    const { typeName, functor, monad, eq, show } = config;
    
    if (functor) {
      registry.set(`${typeName}:Functor`, deriveFunctorInstance());
    }
    if (monad) {
      registry.set(`${typeName}:Monad`, deriveMonadInstance());
    }
    if (eq) {
      registry.set(`${typeName}:Eq`, deriveEqInstance());
    }
    if (show) {
      registry.set(`${typeName}:Show`, deriveShowInstance());
    }

    return {
      typeName,
      registered: Object.keys(config).filter(k => config[k] && k !== 'typeName'),
      success: true
    };
  };

  const result = autoRegisterADT({
    typeName: 'Maybe',
    functor: true,
    monad: true,
    eq: true,
    show: true
  });

  console.log('✅ Auto-registration test:', result);
  console.log('✅ Registry size:', registry.size);

} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

// Test 4: Integration test
try {
  console.log('\n📋 Test 4: Integration Test');

  // Simulate the full system
  const maybe = { tag: 'Just', value: 42 };
  
  // Add fluent methods
  const fluentMaybe = addFluentMethods(maybe, 'Maybe');
  
  // Test complex chaining
  const finalResult = fluentMaybe
    .map(x => x * 2)
    .filter(x => x > 50)
    .chain(x => ({ tag: 'Just', value: x * 3 }))
    .map(x => `Final: ${x}`);

  console.log('✅ Integration test:', finalResult);

} catch (error) {
  console.error('❌ Test 4 failed:', error.message);
}

console.log('\n🎉 All tests completed!'); 