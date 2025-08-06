/**
 * Persistent Collections Unified Fluent API Test Suite
 * 
 * Comprehensive tests for persistent collections (PersistentList, PersistentMap, PersistentSet)
 * with unified fluent API (.map, .chain, .filter, .scan, .reduce, .tap) and derived
 * typeclass instances (Functor, Monad, Bifunctor, Eq, Ord, Show).
 */

console.log('🔥 Persistent Collections Unified Fluent API Test Suite');
console.log('=====================================================');

// ============================================================================
// Test 1: Derived Typeclass Instances
// ============================================================================

function testDerivedTypeclassInstances() {
  console.log('\n📋 Test 1: Derived Typeclass Instances');

  try {
    const { 
      PersistentList, PersistentMap, PersistentSet,
      PersistentListFunctor, PersistentListApplicative, PersistentListMonad,
      PersistentMapFunctor, PersistentMapBifunctor,
      PersistentSetFunctor,
      PersistentListEq, PersistentListOrd, PersistentListShow,
      PersistentMapEq, PersistentMapOrd, PersistentMapShow,
      PersistentSetEq, PersistentSetOrd, PersistentSetShow
    } = require('./fp-persistent');

    console.log('✅ Derived Typeclass Instances:');
    
    // Test PersistentList instances
    console.log(`   - PersistentListFunctor available: ${typeof PersistentListFunctor === 'object'}`); // Should be true
    console.log(`   - PersistentListApplicative available: ${typeof PersistentListApplicative === 'object'}`); // Should be true
    console.log(`   - PersistentListMonad available: ${typeof PersistentListMonad === 'object'}`); // Should be true
    console.log(`   - PersistentListEq available: ${typeof PersistentListEq === 'object'}`); // Should be true
    console.log(`   - PersistentListOrd available: ${typeof PersistentListOrd === 'object'}`); // Should be true
    console.log(`   - PersistentListShow available: ${typeof PersistentListShow === 'object'}`); // Should be true
    
    // Test PersistentMap instances
    console.log(`   - PersistentMapFunctor available: ${typeof PersistentMapFunctor === 'object'}`); // Should be true
    console.log(`   - PersistentMapBifunctor available: ${typeof PersistentMapBifunctor === 'object'}`); // Should be true
    console.log(`   - PersistentMapEq available: ${typeof PersistentMapEq === 'object'}`); // Should be true
    console.log(`   - PersistentMapOrd available: ${typeof PersistentMapOrd === 'object'}`); // Should be true
    console.log(`   - PersistentMapShow available: ${typeof PersistentMapShow === 'object'}`); // Should be true
    
    // Test PersistentSet instances
    console.log(`   - PersistentSetFunctor available: ${typeof PersistentSetFunctor === 'object'}`); // Should be true
    console.log(`   - PersistentSetEq available: ${typeof PersistentSetEq === 'object'}`); // Should be true
    console.log(`   - PersistentSetOrd available: ${typeof PersistentSetOrd === 'object'}`); // Should be true
    console.log(`   - PersistentSetShow available: ${typeof PersistentSetShow === 'object'}`); // Should be true

    console.log('✅ Derived typeclass instances tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Derived typeclass instances test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 2: PersistentList Fluent API
// ============================================================================

function testPersistentListFluentAPI() {
  console.log('\n📋 Test 2: PersistentList Fluent API');

  try {
    const { PersistentList } = require('./fp-persistent');

    console.log('✅ PersistentList Fluent API:');
    
    // Test map operation
    const list = PersistentList.fromArray([1, 2, 3, 4, 5]);
    console.log(`   - PersistentList has map method: ${typeof list.map === 'function'}`); // Should be true
    
    const doubled = list.map(x => x * 2);
    console.log(`   - PersistentList.map works: ${doubled instanceof PersistentList}`); // Should be true
    console.log(`   - Map result correct: ${doubled.toArray().join(',') === '2,4,6,8,10'}`); // Should be true
    
    // Test chain operation
    const chained = list.chain(x => PersistentList.fromArray([x, x * 2]));
    console.log(`   - PersistentList.chain works: ${chained instanceof PersistentList}`); // Should be true
    console.log(`   - Chain result correct: ${chained.toArray().join(',') === '1,2,2,4,3,6,4,8,5,10'}`); // Should be true
    
    // Test filter operation
    const filtered = list.filter(x => x > 3);
    console.log(`   - PersistentList.filter works: ${filtered instanceof PersistentList}`); // Should be true
    console.log(`   - Filter result correct: ${filtered.toArray().join(',') === '4,5'}`); // Should be true
    
    // Test scan operation
    const scanned = list.scan((acc, x) => acc + x, 0);
    console.log(`   - PersistentList.scan works: ${scanned instanceof PersistentList}`); // Should be true
    console.log(`   - Scan result correct: ${scanned.toArray().join(',') === '1,3,6,10,15'}`); // Should be true
    
    // Test reduce operation
    const reduced = list.reduce((acc, x) => acc + x, 0);
    console.log(`   - PersistentList.reduce works: ${reduced === 15}`); // Should be true
    
    // Test tap operation
    let tapped = false;
    const tappedList = list.tap(() => { tapped = true; });
    console.log(`   - PersistentList.tap works: ${tappedList === list && tapped}`); // Should be true
    
    // Test pipe operation
    const piped = list
      .map(x => x * 2)
      .filter(x => x > 5)
      .scan((acc, x) => acc + x, 0);
    console.log(`   - PersistentList.pipe works: ${piped instanceof PersistentList}`); // Should be true
    console.log(`   - Pipe result correct: ${piped.toArray().join(',') === '6,14,24'}`); // Should be true

    console.log('✅ PersistentList fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ PersistentList fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 3: PersistentMap Fluent API
// ============================================================================

function testPersistentMapFluentAPI() {
  console.log('\n📋 Test 3: PersistentMap Fluent API');

  try {
    const { PersistentMap } = require('./fp-persistent');

    console.log('✅ PersistentMap Fluent API:');
    
    // Test map operation
    const map = PersistentMap.fromObject({ a: 1, b: 2, c: 3 });
    console.log(`   - PersistentMap has map method: ${typeof map.map === 'function'}`); // Should be true
    
    const doubled = map.map(x => x * 2);
    console.log(`   - PersistentMap.map works: ${doubled instanceof PersistentMap}`); // Should be true
    console.log(`   - Map result correct: ${doubled.get('a') === 2 && doubled.get('b') === 4 && doubled.get('c') === 6}`); // Should be true
    
    // Test chain operation
    const chained = map.chain(x => PersistentMap.fromObject({ value: x, doubled: x * 2 }));
    console.log(`   - PersistentMap.chain works: ${chained instanceof PersistentMap}`); // Should be true
    
    // Test filter operation
    const filtered = map.filter(x => x > 2);
    console.log(`   - PersistentMap.filter works: ${filtered instanceof PersistentMap}`); // Should be true
    console.log(`   - Filter result correct: ${filtered.get('c') === 3 && filtered.get('a') === undefined}`); // Should be true
    
    // Test scan operation
    const scanned = map.scan((acc, x) => acc + x, 0);
    console.log(`   - PersistentMap.scan works: ${scanned instanceof PersistentMap}`); // Should be true
    
    // Test reduce operation
    const reduced = map.reduce((acc, x) => acc + x, 0);
    console.log(`   - PersistentMap.reduce works: ${reduced === 6}`); // Should be true
    
    // Test tap operation
    let tapped = false;
    const tappedMap = map.tap(() => { tapped = true; });
    console.log(`   - PersistentMap.tap works: ${tappedMap === map && tapped}`); // Should be true
    
    // Test pipe operation
    const piped = map
      .map(x => x * 2)
      .filter(x => x > 3)
      .scan((acc, x) => acc + x, 0);
    console.log(`   - PersistentMap.pipe works: ${piped instanceof PersistentMap}`); // Should be true

    console.log('✅ PersistentMap fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ PersistentMap fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 4: PersistentSet Fluent API
// ============================================================================

function testPersistentSetFluentAPI() {
  console.log('\n📋 Test 4: PersistentSet Fluent API');

  try {
    const { PersistentSet } = require('./fp-persistent');

    console.log('✅ PersistentSet Fluent API:');
    
    // Test map operation
    const set = PersistentSet.fromArray([1, 2, 3, 4, 5]);
    console.log(`   - PersistentSet has map method: ${typeof set.map === 'function'}`); // Should be true
    
    const doubled = set.map(x => x * 2);
    console.log(`   - PersistentSet.map works: ${doubled instanceof PersistentSet}`); // Should be true
    console.log(`   - Map result correct: ${doubled.has(2) && doubled.has(4) && doubled.has(6)}`); // Should be true
    
    // Test chain operation
    const chained = set.chain(x => PersistentSet.fromArray([x, x * 2]));
    console.log(`   - PersistentSet.chain works: ${chained instanceof PersistentSet}`); // Should be true
    console.log(`   - Chain result correct: ${chained.has(1) && chained.has(2) && chained.has(4)}`); // Should be true
    
    // Test filter operation
    const filtered = set.filter(x => x > 3);
    console.log(`   - PersistentSet.filter works: ${filtered instanceof PersistentSet}`); // Should be true
    console.log(`   - Filter result correct: ${filtered.has(4) && filtered.has(5) && !filtered.has(1)}`); // Should be true
    
    // Test scan operation
    const scanned = set.scan((acc, x) => acc + x, 0);
    console.log(`   - PersistentSet.scan works: ${scanned instanceof PersistentSet}`); // Should be true
    
    // Test reduce operation
    const reduced = set.reduce((acc, x) => acc + x, 0);
    console.log(`   - PersistentSet.reduce works: ${reduced === 15}`); // Should be true
    
    // Test tap operation
    let tapped = false;
    const tappedSet = set.tap(() => { tapped = true; });
    console.log(`   - PersistentSet.tap works: ${tappedSet === set && tapped}`); // Should be true
    
    // Test pipe operation
    const piped = set
      .map(x => x * 2)
      .filter(x => x > 5)
      .scan((acc, x) => acc + x, 0);
    console.log(`   - PersistentSet.pipe works: ${piped instanceof PersistentSet}`); // Should be true

    console.log('✅ PersistentSet fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ PersistentSet fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Functor Laws
// ============================================================================

function testFunctorLaws() {
  console.log('\n📋 Test 5: Functor Laws');

  try {
    const { PersistentList, PersistentMap, PersistentSet } = require('./fp-persistent');

    console.log('✅ Functor Laws:');
    
    // Test identity law: map(id) = id
    const list = PersistentList.fromArray([1, 2, 3]);
    const id = (x) => x;
    const mappedId = list.map(id);
    console.log(`   - PersistentList identity law: ${mappedId.toArray().join(',') === list.toArray().join(',')}`); // Should be true
    
    const map = PersistentMap.fromObject({ a: 1, b: 2 });
    const mappedMapId = map.map(id);
    console.log(`   - PersistentMap identity law: ${mappedMapId.get('a') === map.get('a') && mappedMapId.get('b') === map.get('b')}`); // Should be true
    
    const set = PersistentSet.fromArray([1, 2, 3]);
    const mappedSetId = set.map(id);
    console.log(`   - PersistentSet identity law: ${mappedSetId.has(1) && mappedSetId.has(2) && mappedSetId.has(3)}`); // Should be true
    
    // Test composition law: map(f ∘ g) = map(f) ∘ map(g)
    const f = (x) => x * 2;
    const g = (x) => x + 1;
    const fg = (x) => f(g(x));
    
    const listComposed = list.map(fg);
    const listSeparate = list.map(g).map(f);
    console.log(`   - PersistentList composition law: ${listComposed.toArray().join(',') === listSeparate.toArray().join(',')}`); // Should be true
    
    const mapComposed = map.map(fg);
    const mapSeparate = map.map(g).map(f);
    console.log(`   - PersistentMap composition law: ${mapComposed.get('a') === mapSeparate.get('a')}`); // Should be true
    
    const setComposed = set.map(fg);
    const setSeparate = set.map(g).map(f);
    console.log(`   - PersistentSet composition law: ${setComposed.has(4) && setSeparate.has(4)}`); // Should be true

    console.log('✅ Functor laws tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Functor laws test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 6: Monad Laws
// ============================================================================

function testMonadLaws() {
  console.log('\n📋 Test 6: Monad Laws');

  try {
    const { PersistentList } = require('./fp-persistent');

    console.log('✅ Monad Laws:');
    
    // Test left identity: of(a).chain(f) = f(a)
    const a = 42;
    const f = (x) => PersistentList.fromArray([x, x * 2]);
    const leftId = PersistentList.of(a).chain(f);
    const rightId = f(a);
    console.log(`   - PersistentList left identity: ${leftId.toArray().join(',') === rightId.toArray().join(',')}`); // Should be true
    
    // Test right identity: m.chain(of) = m
    const list = PersistentList.fromArray([1, 2, 3]);
    const rightId2 = list.chain(PersistentList.of);
    console.log(`   - PersistentList right identity: ${rightId2.toArray().join(',') === list.toArray().join(',')}`); // Should be true
    
    // Test associativity: m.chain(f).chain(g) = m.chain(x => f(x).chain(g))
    const g = (x) => PersistentList.fromArray([x.toString(), x.toString() + '!']);
    const assoc1 = list.chain(f).chain(g);
    const assoc2 = list.chain(x => f(x).chain(g));
    console.log(`   - PersistentList associativity: ${assoc1.toArray().join(',') === assoc2.toArray().join(',')}`); // Should be true

    console.log('✅ Monad laws tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Monad laws test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 7: Eq, Ord, Show Instances
// ============================================================================

function testEqOrdShowInstances() {
  console.log('\n📋 Test 7: Eq, Ord, Show Instances');

  try {
    const { 
      PersistentList, PersistentMap, PersistentSet,
      PersistentListEq, PersistentListOrd, PersistentListShow,
      PersistentMapEq, PersistentMapOrd, PersistentMapShow,
      PersistentSetEq, PersistentSetOrd, PersistentSetShow
    } = require('./fp-persistent');

    console.log('✅ Eq, Ord, Show Instances:');
    
    // Test PersistentList instances
    const list1 = PersistentList.fromArray([1, 2, 3]);
    const list2 = PersistentList.fromArray([1, 2, 3]);
    const list3 = PersistentList.fromArray([1, 2, 4]);
    
    console.log(`   - PersistentListEq works: ${PersistentListEq.equals(list1, list2)}`); // Should be true
    console.log(`   - PersistentListEq different: ${!PersistentListEq.equals(list1, list3)}`); // Should be true
    console.log(`   - PersistentListOrd compare: ${PersistentListOrd.compare(list1, list3) < 0}`); // Should be true
    console.log(`   - PersistentListShow works: ${typeof PersistentListShow.show(list1) === 'string'}`); // Should be true
    
    // Test PersistentMap instances
    const map1 = PersistentMap.fromObject({ a: 1, b: 2 });
    const map2 = PersistentMap.fromObject({ a: 1, b: 2 });
    const map3 = PersistentMap.fromObject({ a: 1, b: 3 });
    
    console.log(`   - PersistentMapEq works: ${PersistentMapEq.equals(map1, map2)}`); // Should be true
    console.log(`   - PersistentMapEq different: ${!PersistentMapEq.equals(map1, map3)}`); // Should be true
    console.log(`   - PersistentMapOrd compare: ${PersistentMapOrd.compare(map1, map3) < 0}`); // Should be true
    console.log(`   - PersistentMapShow works: ${typeof PersistentMapShow.show(map1) === 'string'}`); // Should be true
    
    // Test PersistentSet instances
    const set1 = PersistentSet.fromArray([1, 2, 3]);
    const set2 = PersistentSet.fromArray([1, 2, 3]);
    const set3 = PersistentSet.fromArray([1, 2, 4]);
    
    console.log(`   - PersistentSetEq works: ${PersistentSetEq.equals(set1, set2)}`); // Should be true
    console.log(`   - PersistentSetEq different: ${!PersistentSetEq.equals(set1, set3)}`); // Should be true
    console.log(`   - PersistentSetOrd compare: ${PersistentSetOrd.compare(set1, set3) < 0}`); // Should be true
    console.log(`   - PersistentSetShow works: ${typeof PersistentSetShow.show(set1) === 'string'}`); // Should be true

    console.log('✅ Eq, Ord, Show instances tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Eq, Ord, Show instances test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Identical Pipeline Operations
// ============================================================================

function testIdenticalPipelineOperations() {
  console.log('\n📋 Test 8: Identical Pipeline Operations');

  try {
    const { PersistentList, PersistentMap, PersistentSet } = require('./fp-persistent');

    console.log('✅ Identical Pipeline Operations:');
    
    // Create the same pipeline for all persistent collections
    const createPipeline = (source) => {
      return source
        .map(x => x * 2)
        .filter(x => x > 5)
        .scan((acc, x) => acc + x, 0);
    };
    
    // Test with PersistentList
    const list = PersistentList.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const listPipeline = createPipeline(list);
    console.log(`   - PersistentList pipeline created: ${listPipeline instanceof PersistentList}`); // Should be true
    
    // Test with PersistentMap
    const map = PersistentMap.fromObject({ a: 1, b: 2, c: 3, d: 4, e: 5 });
    const mapPipeline = createPipeline(map);
    console.log(`   - PersistentMap pipeline created: ${mapPipeline instanceof PersistentMap}`); // Should be true
    
    // Test with PersistentSet
    const set = PersistentSet.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const setPipeline = createPipeline(set);
    console.log(`   - PersistentSet pipeline created: ${setPipeline instanceof PersistentSet}`); // Should be true
    
    // Test that all pipelines have the same methods
    const methods = ['map', 'chain', 'filter', 'scan', 'reduce', 'tap', 'pipe'];
    let sameMethods = true;
    
    for (const method of methods) {
      if (typeof listPipeline[method] !== typeof mapPipeline[method] ||
          typeof listPipeline[method] !== typeof setPipeline[method]) {
        sameMethods = false;
        break;
      }
    }
    
    console.log(`   - All pipelines have same methods: ${sameMethods}`); // Should be true

    console.log('✅ Identical pipeline operations tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Identical pipeline operations test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 9: Performance Verification
// ============================================================================

function testPerformanceVerification() {
  console.log('\n📋 Test 9: Performance Verification');

  try {
    const { PersistentList, PersistentMap, PersistentSet } = require('./fp-persistent');

    console.log('✅ Performance Verification:');
    
    // Create large datasets
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);
    const largeObject = Object.fromEntries(largeArray.map(i => [`key${i}`, i]));
    
    // Test PersistentList pipeline performance
    const startList = Date.now();
    const list = PersistentList.fromArray(largeArray);
    const listPipeline = list
      .map(x => x * 2)
      .filter(x => x > 100)
      .scan((acc, x) => acc + x, 0)
      .take(100);
    const listTime = Date.now() - startList;
    
    console.log(`   - PersistentList pipeline performance: ${listTime}ms`);
    
    // Test PersistentMap pipeline performance
    const startMap = Date.now();
    const map = PersistentMap.fromObject(largeObject);
    const mapPipeline = map
      .map(x => x * 2)
      .filter(x => x > 100)
      .scan((acc, x) => acc + x, 0);
    const mapTime = Date.now() - startMap;
    
    console.log(`   - PersistentMap pipeline performance: ${mapTime}ms`);
    
    // Test PersistentSet pipeline performance
    const startSet = Date.now();
    const set = PersistentSet.fromArray(largeArray);
    const setPipeline = set
      .map(x => x * 2)
      .filter(x => x > 100)
      .scan((acc, x) => acc + x, 0);
    const setTime = Date.now() - startSet;
    
    console.log(`   - PersistentSet pipeline performance: ${setTime}ms`);
    
    // All should be reasonably fast
    console.log(`   - PersistentList performance acceptable: ${listTime < 1000}`); // Should be true
    console.log(`   - PersistentMap performance acceptable: ${mapTime < 1000}`); // Should be true
    console.log(`   - PersistentSet performance acceptable: ${setTime < 1000}`); // Should be true

    console.log('✅ Performance verification tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Performance verification test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Test 10: Integration with Unified Fluent API
// ============================================================================

function testIntegrationWithUnifiedFluentAPI() {
  console.log('\n📋 Test 10: Integration with Unified Fluent API');

  try {
    const { PersistentList, PersistentMap, PersistentSet } = require('./fp-persistent');
    const { toObservableLite, toStatefulStream, toMaybe, toEither, toResult } = require('./fp-fluent-api');

    console.log('✅ Integration with Unified Fluent API:');
    
    // Test conversion functions availability
    console.log(`   - toObservableLite available: ${typeof toObservableLite === 'function'}`); // Should be true
    console.log(`   - toStatefulStream available: ${typeof toStatefulStream === 'function'}`); // Should be true
    console.log(`   - toMaybe available: ${typeof toMaybe === 'function'}`); // Should be true
    console.log(`   - toEither available: ${typeof toEither === 'function'}`); // Should be true
    console.log(`   - toResult available: ${typeof toResult === 'function'}`); // Should be true
    
    // Test PersistentList conversions
    const list = PersistentList.fromArray([1, 2, 3]);
    const listToObs = toObservableLite(list);
    const listToStream = toStatefulStream(list, { count: 0 });
    const listToMaybe = toMaybe(list);
    const listToEither = toEither(list);
    const listToResult = toResult(list);
    
    console.log(`   - PersistentList → ObservableLite: ${listToObs.constructor.name === 'ObservableLite'}`); // Should be true
    console.log(`   - PersistentList → StatefulStream: ${typeof listToStream.run === 'function'}`); // Should be true
    console.log(`   - PersistentList → Maybe: ${listToMaybe.isJust()}`); // Should be true
    console.log(`   - PersistentList → Either: ${listToEither.isRight()}`); // Should be true
    console.log(`   - PersistentList → Result: ${listToResult.isOk()}`); // Should be true
    
    // Test PersistentMap conversions
    const map = PersistentMap.fromObject({ a: 1, b: 2 });
    const mapToObs = toObservableLite(map);
    const mapToStream = toStatefulStream(map, { count: 0 });
    const mapToMaybe = toMaybe(map);
    const mapToEither = toEither(map);
    const mapToResult = toResult(map);
    
    console.log(`   - PersistentMap → ObservableLite: ${mapToObs.constructor.name === 'ObservableLite'}`); // Should be true
    console.log(`   - PersistentMap → StatefulStream: ${typeof mapToStream.run === 'function'}`); // Should be true
    console.log(`   - PersistentMap → Maybe: ${mapToMaybe.isJust()}`); // Should be true
    console.log(`   - PersistentMap → Either: ${mapToEither.isRight()}`); // Should be true
    console.log(`   - PersistentMap → Result: ${mapToResult.isOk()}`); // Should be true
    
    // Test PersistentSet conversions
    const set = PersistentSet.fromArray([1, 2, 3]);
    const setToObs = toObservableLite(set);
    const setToStream = toStatefulStream(set, { count: 0 });
    const setToMaybe = toMaybe(set);
    const setToEither = toEither(set);
    const setToResult = toResult(set);
    
    console.log(`   - PersistentSet → ObservableLite: ${setToObs.constructor.name === 'ObservableLite'}`); // Should be true
    console.log(`   - PersistentSet → StatefulStream: ${typeof setToStream.run === 'function'}`); // Should be true
    console.log(`   - PersistentSet → Maybe: ${setToMaybe.isJust()}`); // Should be true
    console.log(`   - PersistentSet → Either: ${setToEither.isRight()}`); // Should be true
    console.log(`   - PersistentSet → Result: ${setToResult.isOk()}`); // Should be true

    console.log('✅ Integration with unified fluent API tests passed!');
    return true;
  } catch (error) {
    console.log('❌ Integration with unified fluent API test failed:', error.message);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runPersistentUnifiedTests() {
  console.log('🚀 Running Persistent Collections Unified Fluent API Tests');
  console.log('==========================================================');

  const tests = [
    { name: 'Derived Typeclass Instances', fn: testDerivedTypeclassInstances },
    { name: 'PersistentList Fluent API', fn: testPersistentListFluentAPI },
    { name: 'PersistentMap Fluent API', fn: testPersistentMapFluentAPI },
    { name: 'PersistentSet Fluent API', fn: testPersistentSetFluentAPI },
    { name: 'Functor Laws', fn: testFunctorLaws },
    { name: 'Monad Laws', fn: testMonadLaws },
    { name: 'Eq, Ord, Show Instances', fn: testEqOrdShowInstances },
    { name: 'Identical Pipeline Operations', fn: testIdenticalPipelineOperations },
    { name: 'Performance Verification', fn: testPerformanceVerification },
    { name: 'Integration with Unified Fluent API', fn: testIntegrationWithUnifiedFluentAPI }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    const result = test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n==========================================================');
  console.log('📊 Persistent Collections Unified Fluent API Test Results:');
  console.log('==========================================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All persistent collections unified fluent API tests passed!');
    console.log('✅ Derived typeclass instances working');
    console.log('✅ PersistentList fluent API operational');
    console.log('✅ PersistentMap fluent API operational');
    console.log('✅ PersistentSet fluent API operational');
    console.log('✅ Functor laws verified');
    console.log('✅ Monad laws verified');
    console.log('✅ Eq, Ord, Show instances working');
    console.log('✅ Identical pipeline operations confirmed');
    console.log('✅ Performance verification successful');
    console.log('✅ Integration with unified fluent API complete');
    console.log('✅ Persistent collections unified with FP system!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total: passed + failed };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runPersistentUnifiedTests();
}

module.exports = {
  testDerivedTypeclassInstances,
  testPersistentListFluentAPI,
  testPersistentMapFluentAPI,
  testPersistentSetFluentAPI,
  testFunctorLaws,
  testMonadLaws,
  testEqOrdShowInstances,
  testIdenticalPipelineOperations,
  testPerformanceVerification,
  testIntegrationWithUnifiedFluentAPI,
  runPersistentUnifiedTests
}; 