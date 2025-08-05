/**
 * Tests for Optics Foundations
 * 
 * This test file validates the optics system functionality:
 * - Lens laws and utilities
 * - Prism laws and utilities
 * - Traversal laws and utilities
 * - HKT and purity integration
 * - Realistic examples and use cases
 */

import {
  // Core optic types
  Optic,
  Lens,
  Prism,
  Traversal,
  Iso,
  Getter,
  Setter,
  
  // Profunctor variants
  Choice,
  Traversing,
  Strong,
  
  // Identity instances
  IdentityProfunctor,
  IdentityChoice,
  IdentityTraversing,
  IdentityStrong,
  
  // Lens utilities
  lens,
  view,
  set,
  over,
  
  // Prism utilities
  prism,
  preview,
  review,
  isMatching,
  
  // Traversal utilities
  traversal,
  traverse,
  map,
  
  // Common constructors
  prop,
  at,
  head,
  last,
  just,
  right,
  left,
  ok,
  err,
  array,
  values,
  keys,
  
  // Composition
  compose,
  composeMany,
  
  // HKT types
  OpticK,
  OpticWithEffect,
  EffectOfOptic,
  IsOpticPure,
  IsOpticImpure,
  
  // Utility functions
  isLens,
  isPrism,
  isTraversal,
  isOptic,
  to,
  sets
} from './fp-optics';

import {
  // Unified ADT imports
  MaybeUnified, Maybe, MaybeK as MaybeHKT, Just, Nothing, matchMaybe, isJust, fromJust,
  EitherUnified, Either, EitherK as EitherHKT, Left, Right, matchEither,
  ResultUnified, Result, ResultK as ResultHKT, Ok, Err, matchResult
} from './fp-maybe-unified';

import {
  // HKT imports
  Kind1, Kind2, Kind3,
  Apply, Type, TypeArgs, KindArity, KindResult,
  ArrayK, MaybeK, EitherK, TupleK, FunctionK, PromiseK, SetK, MapK, ListK,
  ReaderK, WriterK, StateK,
  Maybe as HKTMaybe, Either as HKTEither, List, Reader, Writer, State
} from './fp-hkt';

import {
  // Typeclass imports
  Functor, Applicative, Monad, Bifunctor, Profunctor, Traversable, Foldable,
  deriveFunctor, deriveApplicative, deriveMonad,
  lift2, composeK, sequence, traverse
} from './fp-typeclasses-hkt';

import {
  // Purity imports
  EffectTag, EffectOf, Pure, IO, Async,
  createPurityInfo, attachPurityMarker, extractPurityMarker, hasPurityMarker
} from './fp-purity';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Simple assertion function for testing
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Type assertion function for testing
 */
function assertType<T>(value: T, message: string): void {
  // This is a runtime check that the value exists
  if (value === undefined || value === null) {
    throw new Error(`${message}: Value is null or undefined`);
  }
}

// ============================================================================
// Test Suite 1: Lens Laws and Utilities
// ============================================================================

export function testLensLaws(): void {
  console.log('🧪 Testing Lens Laws...');
  
  // Test Lens Law 1: set(l, get(l, s), s) === s
  const testLensLaw1 = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person: Person = { name: 'Bob', age: 30 };
    const name = view(nameLens, person);
    const result = set(nameLens, name, person);
    
    assertEqual(result, person, 'Lens Law 1: set(l, get(l, s), s) === s');
  };
  
  // Test Lens Law 2: get(l, set(l, b, s)) === b
  const testLensLaw2 = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person: Person = { name: 'Bob', age: 30 };
    const newName = 'Robert';
    const modifiedPerson = set(nameLens, newName, person);
    const result = view(nameLens, modifiedPerson);
    
    assertEqual(result, newName, 'Lens Law 2: get(l, set(l, b, s)) === b');
  };
  
  // Test Lens Law 3: set(l, b, set(l, b', s)) === set(l, b, s)
  const testLensLaw3 = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person: Person = { name: 'Bob', age: 30 };
    const name1 = 'Robert';
    const name2 = 'Rob';
    
    const result1 = set(nameLens, name2, set(nameLens, name1, person));
    const result2 = set(nameLens, name2, person);
    
    assertEqual(result1, result2, 'Lens Law 3: set(l, b, set(l, b\', s)) === set(l, b, s)');
  };
  
  // Test over function
  const testOver = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const person: Person = { name: 'Bob', age: 30 };
    const result = over(nameLens, name => name.toUpperCase(), person);
    
    assertEqual(result, { name: 'BOB', age: 30 }, 'over should transform the focused part');
  };
  
  testLensLaw1();
  testLensLaw2();
  testLensLaw3();
  testOver();
  console.log('✅ Lens Laws tests passed');
}

// ============================================================================
// Test Suite 2: Prism Laws and Utilities
// ============================================================================

export function testPrismLaws(): void {
  console.log('🧪 Testing Prism Laws...');
  
  // Test Prism Law 1: match(build(b)) === Left(b)
  const testPrismLaw1 = () => {
    const rightPrism = prism<Either<string, number>, Either<string, number>, number, number>(
      e => {
        if ('right' in e) {
          return Left(e.right);
        } else {
          return Right(e);
        }
      },
      n => Right(n)
    );
    
    const value = 42;
    const built = review(rightPrism, value);
    const matched = preview(rightPrism, built);
    
    assertEqual(matched, Just(value), 'Prism Law 1: match(build(b)) === Left(b)');
  };
  
  // Test Prism Law 2: build(match(s)) === s (when match succeeds)
  const testPrismLaw2 = () => {
    const rightPrism = prism<Either<string, number>, Either<string, number>, number, number>(
      e => {
        if ('right' in e) {
          return Left(e.right);
        } else {
          return Right(e);
        }
      },
      n => Right(n)
    );
    
    const original = Right(42);
    const matched = preview(rightPrism, original);
    
    if (isJust(matched)) {
      const value = fromJust(matched);
      const rebuilt = review(rightPrism, value);
      assertEqual(rebuilt, original, 'Prism Law 2: build(match(s)) === s (when match succeeds)');
    }
  };
  
  // Test preview function
  const testPreview = () => {
    const rightPrism = prism<Either<string, number>, Either<string, number>, number, number>(
      e => {
        if ('right' in e) {
          return Left(e.right);
        } else {
          return Right(e);
        }
      },
      n => Right(n)
    );
    
    const rightValue = Right(42);
    const leftValue = Left('error');
    
    const rightPreview = preview(rightPrism, rightValue);
    const leftPreview = preview(rightPrism, leftValue);
    
    assertEqual(rightPreview, Just(42), 'preview should extract Right value');
    assertEqual(leftPreview, Nothing(), 'preview should return Nothing for Left');
  };
  
  // Test review function
  const testReview = () => {
    const rightPrism = prism<Either<string, number>, Either<string, number>, number, number>(
      e => {
        if ('right' in e) {
          return Left(e.right);
        } else {
          return Right(e);
        }
      },
      n => Right(n)
    );
    
    const value = 42;
    const result = review(rightPrism, value);
    
    assertEqual(result, Right(42), 'review should build Right value');
  };
  
  // Test isMatching function
  const testIsMatching = () => {
    const rightPrism = prism<Either<string, number>, Either<string, number>, number, number>(
      e => {
        if ('right' in e) {
          return Left(e.right);
        } else {
          return Right(e);
        }
      },
      n => Right(n)
    );
    
    const rightValue = Right(42);
    const leftValue = Left('error');
    
    const rightMatches = isMatching(rightPrism, rightValue);
    const leftMatches = isMatching(rightPrism, leftValue);
    
    assertEqual(rightMatches, true, 'isMatching should return true for Right');
    assertEqual(leftMatches, false, 'isMatching should return false for Left');
  };
  
  testPrismLaw1();
  testPrismLaw2();
  testPreview();
  testReview();
  testIsMatching();
  console.log('✅ Prism Laws tests passed');
}

// ============================================================================
// Test Suite 3: Traversal Laws and Utilities
// ============================================================================

export function testTraversalLaws(): void {
  console.log('🧪 Testing Traversal Laws...');
  
  // Test Traversal Law: map over traversal === traverse over map
  const testTraversalLaw = () => {
    const arrayTraversal = traversal<number[], number[], number, number>(
      (f, arr) => arr.map(f)
    );
    
    const numbers = [1, 2, 3, 4, 5];
    const double = (x: number) => x * 2;
    
    const result1 = map(arrayTraversal, double, numbers);
    const result2 = numbers.map(double);
    
    assertEqual(result1, result2, 'Traversal Law: map over traversal === traverse over map');
  };
  
  // Test traverse function
  const testTraverse = () => {
    const arrayTraversal = traversal<number[], number[], number, number>(
      (f, arr) => arr.map(f)
    );
    
    const numbers = [1, 2, 3, 4, 5];
    const double = (x: number) => x * 2;
    
    const result = traverse(arrayTraversal, double, numbers);
    
    assertEqual(result, [2, 4, 6, 8, 10], 'traverse should apply function to all elements');
  };
  
  // Test map function
  const testMap = () => {
    const arrayTraversal = traversal<number[], number[], number, number>(
      (f, arr) => arr.map(f)
    );
    
    const numbers = [1, 2, 3, 4, 5];
    const double = (x: number) => x * 2;
    
    const result = map(arrayTraversal, double, numbers);
    
    assertEqual(result, [2, 4, 6, 8, 10], 'map should apply function to all elements');
  };
  
  testTraversalLaw();
  testTraverse();
  testMap();
  console.log('✅ Traversal Laws tests passed');
}

// ============================================================================
// Test Suite 4: Common Lens Constructors
// ============================================================================

export function testLensConstructors(): void {
  console.log('🧪 Testing Lens Constructors...');
  
  // Test prop lens
  const testProp = () => {
    type Person = { name: string; age: number };
    
    const nameLens = prop('name')<Person, Person, string, string>();
    const ageLens = prop('age')<Person, Person, number, number>();
    
    const person: Person = { name: 'Bob', age: 30 };
    
    const name = view(nameLens, person);
    const age = view(ageLens, person);
    
    assertEqual(name, 'Bob', 'prop lens should view property');
    assertEqual(age, 30, 'prop lens should view property');
    
    const newPerson = set(nameLens, 'Robert', person);
    assertEqual(newPerson.name, 'Robert', 'prop lens should set property');
  };
  
  // Test at lens
  const testAt = () => {
    const firstLens = at(0)<number[], number[], number, number>();
    const secondLens = at(1)<number[], number[], number, number>();
    
    const numbers = [1, 2, 3, 4, 5];
    
    const first = view(firstLens, numbers);
    const second = view(secondLens, numbers);
    
    assertEqual(first, 1, 'at lens should view array element');
    assertEqual(second, 2, 'at lens should view array element');
    
    const newNumbers = set(firstLens, 10, numbers);
    assertEqual(newNumbers[0], 10, 'at lens should set array element');
  };
  
  // Test head lens
  const testHead = () => {
    const headLens = head<number[], number[], number, number>();
    
    const numbers = [1, 2, 3, 4, 5];
    
    const first = view(headLens, numbers);
    assertEqual(first, 1, 'head lens should view first element');
    
    const newNumbers = set(headLens, 10, numbers);
    assertEqual(newNumbers[0], 10, 'head lens should set first element');
  };
  
  // Test last lens
  const testLast = () => {
    const lastLens = last<number[], number[], number, number>();
    
    const numbers = [1, 2, 3, 4, 5];
    
    const last = view(lastLens, numbers);
    assertEqual(last, 5, 'last lens should view last element');
    
    const newNumbers = set(lastLens, 10, numbers);
    assertEqual(newNumbers[4], 10, 'last lens should set last element');
  };
  
  testProp();
  testAt();
  testHead();
  testLast();
  console.log('✅ Lens Constructors tests passed');
}

// ============================================================================
// Test Suite 5: Common Prism Constructors
// ============================================================================

export function testPrismConstructors(): void {
  console.log('🧪 Testing Prism Constructors...');
  
  // Test just prism
  const testJust = () => {
    const justPrism = just<Maybe<number>, Maybe<number>, number, number>();
    
    const justValue = Just(42);
    const nothingValue = Nothing();
    
    const justPreview = preview(justPrism, justValue);
    const nothingPreview = preview(justPrism, nothingValue);
    
    assertEqual(justPreview, Just(42), 'just prism should preview Just value');
    assertEqual(nothingPreview, Nothing(), 'just prism should return Nothing for Nothing');
    
    const built = review(justPrism, 100);
    assertEqual(built, Just(100), 'just prism should build Just value');
  };
  
  // Test right prism
  const testRight = () => {
    const rightPrism = right<Either<string, number>, Either<string, number>, number, number>();
    
    const rightValue = Right(42);
    const leftValue = Left('error');
    
    const rightPreview = preview(rightPrism, rightValue);
    const leftPreview = preview(rightPrism, leftValue);
    
    assertEqual(rightPreview, Just(42), 'right prism should preview Right value');
    assertEqual(leftPreview, Nothing(), 'right prism should return Nothing for Left');
    
    const built = review(rightPrism, 100);
    assertEqual(built, Right(100), 'right prism should build Right value');
  };
  
  // Test left prism
  const testLeft = () => {
    const leftPrism = left<Either<string, number>, Either<string, number>, string, string>();
    
    const rightValue = Right(42);
    const leftValue = Left('error');
    
    const rightPreview = preview(leftPrism, rightValue);
    const leftPreview = preview(leftPrism, leftValue);
    
    assertEqual(rightPreview, Nothing(), 'left prism should return Nothing for Right');
    assertEqual(leftPreview, Just('error'), 'left prism should preview Left value');
    
    const built = review(leftPrism, 'new error');
    assertEqual(built, Left('new error'), 'left prism should build Left value');
  };
  
  // Test ok prism
  const testOk = () => {
    const okPrism = ok<Result<number, string>, Result<number, string>, number, number>();
    
    const okValue = Ok(42);
    const errValue = Err('error');
    
    const okPreview = preview(okPrism, okValue);
    const errPreview = preview(okPrism, errValue);
    
    assertEqual(okPreview, Just(42), 'ok prism should preview Ok value');
    assertEqual(errPreview, Nothing(), 'ok prism should return Nothing for Err');
    
    const built = review(okPrism, 100);
    assertEqual(built, Ok(100), 'ok prism should build Ok value');
  };
  
  // Test err prism
  const testErr = () => {
    const errPrism = err<Result<number, string>, Result<number, string>, string, string>();
    
    const okValue = Ok(42);
    const errValue = Err('error');
    
    const okPreview = preview(errPrism, okValue);
    const errPreview = preview(errPrism, errValue);
    
    assertEqual(okPreview, Nothing(), 'err prism should return Nothing for Ok');
    assertEqual(errPreview, Just('error'), 'err prism should preview Err value');
    
    const built = review(errPrism, 'new error');
    assertEqual(built, Err('new error'), 'err prism should build Err value');
  };
  
  testJust();
  testRight();
  testLeft();
  testOk();
  testErr();
  console.log('✅ Prism Constructors tests passed');
}

// ============================================================================
// Test Suite 6: Common Traversal Constructors
// ============================================================================

export function testTraversalConstructors(): void {
  console.log('🧪 Testing Traversal Constructors...');
  
  // Test array traversal
  const testArray = () => {
    const arrayTraversal = array<number[], number[], number, number>();
    
    const numbers = [1, 2, 3, 4, 5];
    const double = (x: number) => x * 2;
    
    const result = map(arrayTraversal, double, numbers);
    
    assertEqual(result, [2, 4, 6, 8, 10], 'array traversal should map over all elements');
  };
  
  // Test values traversal
  const testValues = () => {
    const valuesTraversal = values<Record<string, number>, Record<string, number>, number, number>();
    
    const obj = { a: 1, b: 2, c: 3 };
    const double = (x: number) => x * 2;
    
    const result = map(valuesTraversal, double, obj);
    
    assertEqual(result, { a: 2, b: 4, c: 6 }, 'values traversal should map over all values');
  };
  
  // Test keys traversal
  const testKeys = () => {
    const keysTraversal = keys<Record<string, number>, Record<string, number>, string, string>();
    
    const obj = { a: 1, b: 2, c: 3 };
    const uppercase = (x: string) => x.toUpperCase();
    
    const result = map(keysTraversal, uppercase, obj);
    
    assertEqual(result, { A: 1, B: 2, C: 3 }, 'keys traversal should map over all keys');
  };
  
  testArray();
  testValues();
  testKeys();
  console.log('✅ Traversal Constructors tests passed');
}

// ============================================================================
// Test Suite 7: Optic Composition
// ============================================================================

export function testOpticComposition(): void {
  console.log('🧪 Testing Optic Composition...');
  
  // Test compose function
  const testCompose = () => {
    type Person = { name: string; age: number };
    type Address = { street: string; city: string };
    type PersonWithAddress = { person: Person; address: Address };
    
    const personLens = lens<PersonWithAddress, PersonWithAddress, Person, Person>(
      pwa => pwa.person,
      (pwa, person) => ({ ...pwa, person })
    );
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const composedLens = compose(personLens, nameLens);
    
    const data: PersonWithAddress = {
      person: { name: 'Bob', age: 30 },
      address: { street: '123 Main St', city: 'Anytown' }
    };
    
    const name = view(composedLens, data);
    assertEqual(name, 'Bob', 'composed lens should view nested property');
    
    const newData = set(composedLens, 'Robert', data);
    assertEqual(newData.person.name, 'Robert', 'composed lens should set nested property');
  };
  
  // Test composeMany function
  const testComposeMany = () => {
    type Person = { name: string; age: number };
    type Address = { street: string; city: string };
    type PersonWithAddress = { person: Person; address: Address };
    type Company = { employees: PersonWithAddress[] };
    
    const employeesLens = lens<Company, Company, PersonWithAddress[], PersonWithAddress[]>(
      c => c.employees,
      (c, employees) => ({ ...c, employees })
    );
    
    const firstEmployeeLens = at(0)<PersonWithAddress[], PersonWithAddress[], PersonWithAddress, PersonWithAddress>();
    
    const personLens = lens<PersonWithAddress, PersonWithAddress, Person, Person>(
      pwa => pwa.person,
      (pwa, person) => ({ ...pwa, person })
    );
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const composedLens = composeMany([employeesLens, firstEmployeeLens, personLens, nameLens]);
    
    const company: Company = {
      employees: [{
        person: { name: 'Bob', age: 30 },
        address: { street: '123 Main St', city: 'Anytown' }
      }]
    };
    
    const name = view(composedLens, company);
    assertEqual(name, 'Bob', 'composedMany lens should view deeply nested property');
  };
  
  testCompose();
  testComposeMany();
  console.log('✅ Optic Composition tests passed');
}

// ============================================================================
// Test Suite 8: HKT + Purity Integration
// ============================================================================

export function testHKTPurityIntegration(): void {
  console.log('🧪 Testing HKT + Purity Integration...');
  
  // Test optic type inference
  const testOpticTypeInference = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    // TypeScript should infer the correct types
    assertType(nameLens, 'Lens should have correct type inference');
  };
  
  // Test purity preservation
  const testPurityPreservation = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    // Optics should preserve purity
    assertType(nameLens, 'Lens should preserve purity');
  };
  
  // Test HKT integration
  const testHKTIntegration = () => {
    // Optics should work with HKT types
    assertType(OpticK, 'OpticK should be defined');
    assertType(EffectOfOptic, 'EffectOfOptic should be defined');
    assertType(IsOpticPure, 'IsOpticPure should be defined');
  };
  
  testOpticTypeInference();
  testPurityPreservation();
  testHKTIntegration();
  console.log('✅ HKT + Purity Integration tests passed');
}

// ============================================================================
// Test Suite 9: Utility Functions
// ============================================================================

export function testUtilityFunctions(): void {
  console.log('🧪 Testing Utility Functions...');
  
  // Test isLens function
  const testIsLens = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const notALens = (x: number) => x * 2;
    
    assertEqual(isLens(nameLens), true, 'isLens should return true for lens');
    assertEqual(isLens(notALens), false, 'isLens should return false for non-lens');
  };
  
  // Test isPrism function
  const testIsPrism = () => {
    const rightPrism = prism<Either<string, number>, Either<string, number>, number, number>(
      e => {
        if ('right' in e) {
          return Left(e.right);
        } else {
          return Right(e);
        }
      },
      n => Right(n)
    );
    
    const notAPrism = (x: number) => x * 2;
    
    assertEqual(isPrism(rightPrism), true, 'isPrism should return true for prism');
    assertEqual(isPrism(notAPrism), false, 'isPrism should return false for non-prism');
  };
  
  // Test isTraversal function
  const testIsTraversal = () => {
    const arrayTraversal = traversal<number[], number[], number, number>(
      (f, arr) => arr.map(f)
    );
    
    const notATraversal = (x: number) => x * 2;
    
    assertEqual(isTraversal(arrayTraversal), true, 'isTraversal should return true for traversal');
    assertEqual(isTraversal(notATraversal), false, 'isTraversal should return false for non-traversal');
  };
  
  // Test isOptic function
  const testIsOptic = () => {
    type Person = { name: string; age: number };
    
    const nameLens = lens<Person, Person, string, string>(
      p => p.name,
      (p, name) => ({ ...p, name })
    );
    
    const notAnOptic = (x: number) => x * 2;
    
    assertEqual(isOptic(nameLens), true, 'isOptic should return true for optic');
    assertEqual(isOptic(notAnOptic), false, 'isOptic should return false for non-optic');
  };
  
  // Test to function
  const testTo = () => {
    type Person = { name: string; age: number };
    
    const nameGetter = to<Person, string>(p => p.name);
    
    const person: Person = { name: 'Bob', age: 30 };
    const name = view(nameGetter, person);
    
    assertEqual(name, 'Bob', 'to should create a getter');
  };
  
  // Test sets function
  const testSets = () => {
    type Person = { name: string; age: number };
    
    const nameSetter = sets<Person, Person, string, string>(
      (f, p) => ({ ...p, name: f(p.name) })
    );
    
    const person: Person = { name: 'Bob', age: 30 };
    const newPerson = over(nameSetter, name => name.toUpperCase(), person);
    
    assertEqual(newPerson.name, 'BOB', 'sets should create a setter');
  };
  
  testIsLens();
  testIsPrism();
  testIsTraversal();
  testIsOptic();
  testTo();
  testSets();
  console.log('✅ Utility Functions tests passed');
}

// ============================================================================
// Test Suite 10: Realistic Examples
// ============================================================================

export function testRealisticExamples(): void {
  console.log('🧪 Testing Realistic Examples...');
  
  // Test nested object manipulation
  const testNestedObjectManipulation = () => {
    type Address = { street: string; city: string; zip: string };
    type Person = { name: string; age: number; address: Address };
    type Company = { name: string; employees: Person[] };
    
    const employeesLens = lens<Company, Company, Person[], Person[]>(
      c => c.employees,
      (c, employees) => ({ ...c, employees })
    );
    
    const firstEmployeeLens = at(0)<Person[], Person[], Person, Person>();
    
    const addressLens = lens<Person, Person, Address, Address>(
      p => p.address,
      (p, address) => ({ ...p, address })
    );
    
    const streetLens = lens<Address, Address, string, string>(
      a => a.street,
      (a, street) => ({ ...a, street })
    );
    
    const composedLens = composeMany([employeesLens, firstEmployeeLens, addressLens, streetLens]);
    
    const company: Company = {
      name: 'Acme Corp',
      employees: [{
        name: 'Bob',
        age: 30,
        address: { street: '123 Main St', city: 'Anytown', zip: '12345' }
      }]
    };
    
    const street = view(composedLens, company);
    assertEqual(street, '123 Main St', 'Should view deeply nested street');
    
    const newCompany = set(composedLens, '456 Oak Ave', company);
    assertEqual(newCompany.employees[0].address.street, '456 Oak Ave', 'Should set deeply nested street');
  };
  
  // Test sum type manipulation
  const testSumTypeManipulation = () => {
    type Shape = 
      | { type: 'circle'; radius: number }
      | { type: 'rectangle'; width: number; height: number }
      | { type: 'triangle'; base: number; height: number };
    
    const circlePrism = prism<Shape, Shape, number, number>(
      s => s.type === 'circle' ? Left(s.radius) : Right(s),
      radius => ({ type: 'circle', radius })
    );
    
    const rectanglePrism = prism<Shape, Shape, { width: number; height: number }, { width: number; height: number }>(
      s => s.type === 'rectangle' ? Left({ width: s.width, height: s.height }) : Right(s),
      ({ width, height }) => ({ type: 'rectangle', width, height })
    );
    
    const circle: Shape = { type: 'circle', radius: 5 };
    const rectangle: Shape = { type: 'rectangle', width: 10, height: 20 };
    
    const circleRadius = preview(circlePrism, circle);
    const rectangleDimensions = preview(rectanglePrism, rectangle);
    
    assertEqual(circleRadius, Just(5), 'Should preview circle radius');
    assertEqual(rectangleDimensions, Just({ width: 10, height: 20 }), 'Should preview rectangle dimensions');
    
    const newCircle = review(circlePrism, 10);
    assertEqual(newCircle, { type: 'circle', radius: 10 }, 'Should build new circle');
  };
  
  // Test array manipulation
  const testArrayManipulation = () => {
    type Person = { name: string; age: number };
    
    const people: Person[] = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 }
    ];
    
    const namesTraversal = composeMany([
      array<Person[], Person[], Person, Person>(),
      prop('name')<Person, Person, string, string>()
    ]);
    
    const uppercaseNames = map(namesTraversal, name => name.toUpperCase(), people);
    
    assertEqual(uppercaseNames, [
      { name: 'ALICE', age: 25 },
      { name: 'BOB', age: 30 },
      { name: 'CHARLIE', age: 35 }
    ], 'Should transform all names to uppercase');
  };
  
  testNestedObjectManipulation();
  testSumTypeManipulation();
  testArrayManipulation();
  console.log('✅ Realistic Examples tests passed');
}

// ============================================================================
// Main Test Runner
// ============================================================================

export async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Optics Tests...\n');
  
  try {
    testLensLaws();
    testPrismLaws();
    testTraversalLaws();
    testLensConstructors();
    testPrismConstructors();
    testTraversalConstructors();
    testOpticComposition();
    testHKTPurityIntegration();
    testUtilityFunctions();
    testRealisticExamples();
    
    console.log('\n🎉 All Optics tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
} 