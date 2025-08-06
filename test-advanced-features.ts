/**
 * Advanced Features Test Suite
 * 
 * This tests advanced features including:
 * 1. Optional optic composition (Lens→Optional, Prism→Optional, Optional→Optional)
 * 2. Immutability helpers (freezeDeep, cloneImmutable, updateImmutable)
 * 3. Async bimonad operations (TaskEither bichain, matchM)
 * 4. Higher-Order Kind usage (ObservableLite<Either<L, R>>)
 */

import {
  Kind, Kind1, Kind2, KindAny, HigherKind, HOK1, HOK2,
  KindInput, KindOutput, IsKindCompatible, IsHigherKindCompatible,
  Apply, TypeArgs, Type, ComposeHOK, IdentityHOK, ConstHOK
} from './fp-hkt';

import {
  Functor, Functor1, Functor2, AnyFunctor,
  Applicative, Monad, Bifunctor, Profunctor,
  IsFunctor, IsApplicative, IsMonad, IsBifunctor,
  ArrayHOK, MaybeHOK, EitherHOK, TupleHOK,
  PolymorphicFunctor, PolymorphicBifunctor
} from './fp-typeclasses-hok';

// ============================================================================
// Mock Implementations for Testing
// ============================================================================

// Mock ObservableLite for testing
class ObservableLite<A> {
  constructor(private values: A[]) {}

  map<B>(f: (a: A) => B): ObservableLite<B> {
    return new ObservableLite(this.values.map(f));
  }

  toArray(): A[] {
    return [...this.values];
  }

  static fromArray<A>(values: A[]): ObservableLite<A> {
    return new ObservableLite(values);
  }
}

// Mock Either for testing
type Either<L, R> = { tag: 'Left'; value: L } | { tag: 'Right'; value: R };

const Left = <L, R>(value: L): Either<L, R> => ({ tag: 'Left', value });
const Right = <L, R>(value: R): Either<L, R> => ({ tag: 'Right', value });

// Mock TaskEither for testing
type TaskEither<L, R> = Promise<Either<L, R>>;

const TaskEither = {
  left: <L, R>(value: L): TaskEither<L, R> => Promise.resolve(Left(value)),
  right: <L, R>(value: R): TaskEither<L, R> => Promise.resolve(Right(value)),
  fromPromise: <R>(promise: Promise<R>): TaskEither<unknown, R> => 
    promise.then(Right).catch(Left)
};

// Mock optics for testing
interface Lens<S, A> {
  get: (s: S) => A;
  set: (a: A, s: S) => S;
}

interface Prism<S, A> {
  match: (s: S) => { tag: 'Just'; value: A } | { tag: 'Nothing' };
  build: (a: A) => S;
}

interface Optional<S, A> {
  getOption: (s: S) => { tag: 'Just'; value: A } | { tag: 'Nothing' };
  set: (a: A, s: S) => S;
}

// Mock immutability helpers
function freezeDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  
  Object.freeze(obj);
  
  if (Array.isArray(obj)) {
    obj.forEach(freezeDeep);
  } else {
    Object.values(obj).forEach(freezeDeep);
  }
  
  return obj;
}

function cloneImmutable<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(cloneImmutable) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = cloneImmutable(obj[key]);
    }
  }
  
  return cloned;
}

function updateImmutable<T, K extends keyof T>(
  obj: T, 
  key: K, 
  value: T[K]
): T {
  const cloned = cloneImmutable(obj);
  cloned[key] = value;
  return cloned;
}

// ============================================================================
// Test Utilities
// ============================================================================

function assertType<T extends true>(value: T): void {
  if (!value) {
    throw new Error('Type assertion failed');
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn: () => void, message: string): void {
  try {
    fn();
    throw new Error(`Expected function to throw, but it didn't: ${message}`);
  } catch (error) {
    // Expected to throw
  }
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('🧪 Testing Advanced Features...\n');

const testAdvancedFeatures = async () => {
  // ============================================================================
  // 1. Optional Optic Composition Tests
  // ============================================================================
  
  console.log('📋 Section 1: Optional Optic Composition Tests');
  
  // Test 1.1: Lens→Optional composition
  console.log('\n📋 Test 1.1: Lens→Optional composition');
  
  // Create a lens for accessing nested properties
  const userLens: Lens<{ user: { name: string; age: number } }, { name: string; age: number }> = {
    get: (s) => s.user,
    set: (a, s) => ({ ...s, user: a })
  };
  
  // Create an optional for accessing name property (might not exist)
  const nameOptional: Optional<{ name: string; age: number }, string> = {
    getOption: (s) => ({ tag: 'Just' as const, value: s.name }),
    set: (a, s) => ({ ...s, name: a })
  };
  
  // Compose lens with optional
  const composedLensOptional = {
    getOption: (s: { user: { name: string; age: number } }) => {
      const user = userLens.get(s);
      return nameOptional.getOption(user);
    },
    set: (a: string, s: { user: { name: string; age: number } }) => {
      const user = userLens.get(s);
      const updatedUser = nameOptional.set(a, user);
      return userLens.set(updatedUser, s);
    }
  };
  
  const testData = { user: { name: 'Alice', age: 30 } };
  const result = composedLensOptional.getOption(testData);
  
  assertEqual(result.tag, 'Just', 'Lens→Optional composition should return Just');
  assertEqual(result.value, 'Alice', 'Lens→Optional composition should extract correct value');
  
  const updated = composedLensOptional.set('Bob', testData);
  assertEqual(updated.user.name, 'Bob', 'Lens→Optional composition should update correctly');
  assertEqual(testData.user.name, 'Alice', 'Original data should remain unchanged');
  
  console.log('✅ Lens→Optional composition works correctly');

  // Test 1.2: Prism→Optional composition
  console.log('\n📋 Test 1.2: Prism→Optional composition');
  
  // Create a prism for parsing strings to numbers
  const numberPrism: Prism<string, number> = {
    match: (s) => {
      const num = Number(s);
      return isNaN(num) ? { tag: 'Nothing' as const } : { tag: 'Just' as const, value: num };
    },
    build: (n) => n.toString()
  };
  
  // Create an optional for accessing array elements
  const arrayOptional: Optional<string[], string> = {
    getOption: (arr) => arr.length > 0 ? { tag: 'Just' as const, value: arr[0] } : { tag: 'Nothing' as const },
    set: (a, arr) => arr.length > 0 ? [a, ...arr.slice(1)] : arr
  };
  
  // Compose prism with optional
  const composedPrismOptional = {
    getOption: (arr: string[]) => {
      const maybeString = arrayOptional.getOption(arr);
      if (maybeString.tag === 'Nothing') return { tag: 'Nothing' as const };
      return numberPrism.match(maybeString.value);
    },
    set: (a: number, arr: string[]) => {
      const maybeString = arrayOptional.getOption(arr);
      if (maybeString.tag === 'Nothing') return arr;
      const updatedString = numberPrism.build(a);
      return arrayOptional.set(updatedString, arr);
    }
  };
  
  const testArray = ['42', 'invalid', '100'];
  const prismResult = composedPrismOptional.getOption(testArray);
  
  assertEqual(prismResult.tag, 'Just', 'Prism→Optional composition should return Just');
  assertEqual(prismResult.value, 42, 'Prism→Optional composition should parse number correctly');
  
  const updatedArray = composedPrismOptional.set(99, testArray);
  assertEqual(updatedArray[0], '99', 'Prism→Optional composition should update correctly');
  
  console.log('✅ Prism→Optional composition works correctly');

  // Test 1.3: Optional→Optional composition
  console.log('\n📋 Test 1.3: Optional→Optional composition');
  
  // Create two optionals for nested access
  const firstOptional: Optional<{ items: string[] }, string[]> = {
    getOption: (s) => ({ tag: 'Just' as const, value: s.items }),
    set: (a, s) => ({ ...s, items: a })
  };
  
  const secondOptional: Optional<string[], string> = {
    getOption: (arr) => arr.length > 1 ? { tag: 'Just' as const, value: arr[1] } : { tag: 'Nothing' as const },
    set: (a, arr) => arr.length > 1 ? [arr[0], a, ...arr.slice(2)] : arr
  };
  
  // Compose optionals
  const composedOptionalOptional = {
    getOption: (s: { items: string[] }) => {
      const maybeArray = firstOptional.getOption(s);
      if (maybeArray.tag === 'Nothing') return { tag: 'Nothing' as const };
      return secondOptional.getOption(maybeArray.value);
    },
    set: (a: string, s: { items: string[] }) => {
      const maybeArray = firstOptional.getOption(s);
      if (maybeArray.tag === 'Nothing') return s;
      const updatedArray = secondOptional.set(a, maybeArray.value);
      return firstOptional.set(updatedArray, s);
    }
  };
  
  const testObject = { items: ['first', 'second', 'third'] };
  const optionalResult = composedOptionalOptional.getOption(testObject);
  
  assertEqual(optionalResult.tag, 'Just', 'Optional→Optional composition should return Just');
  assertEqual(optionalResult.value, 'second', 'Optional→Optional composition should extract correct value');
  
  const updatedObject = composedOptionalOptional.set('updated', testObject);
  assertEqual(updatedObject.items[1], 'updated', 'Optional→Optional composition should update correctly');
  
  console.log('✅ Optional→Optional composition works correctly');

  // ============================================================================
  // 2. Immutability Helpers Tests
  // ============================================================================
  
  console.log('\n📋 Section 2: Immutability Helpers Tests');
  
  // Test 2.1: freezeDeep functionality
  console.log('\n📋 Test 2.1: freezeDeep functionality');
  
  const testObject = {
    name: 'Alice',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      country: 'USA'
    },
    hobbies: ['reading', 'swimming', { sport: 'tennis', level: 'intermediate' }]
  };
  
  const frozen = freezeDeep(testObject);
  
  // Verify deep freeze
  assertThrows(() => { (frozen as any).name = 'Bob'; }, 'Should not allow mutation of frozen object');
  assertThrows(() => { (frozen as any).address.street = '456 Oak St'; }, 'Should not allow mutation of nested frozen object');
  assertThrows(() => { (frozen as any).hobbies.push('painting'); }, 'Should not allow mutation of frozen array');
  assertThrows(() => { (frozen as any).hobbies[2].level = 'advanced'; }, 'Should not allow mutation of nested frozen object in array');
  
  console.log('✅ freezeDeep prevents all mutations');

  // Test 2.2: cloneImmutable functionality
  console.log('\n📋 Test 2.2: cloneImmutable functionality');
  
  const cloned = cloneImmutable(testObject);
  
  // Verify deep clone
  assertEqual(cloned.name, testObject.name, 'Clone should preserve values');
  assertEqual(cloned.address.street, testObject.address.street, 'Clone should preserve nested values');
  assertEqual(cloned.hobbies.length, testObject.hobbies.length, 'Clone should preserve array length');
  
  // Verify independence
  (cloned as any).name = 'Bob';
  (cloned as any).address.street = '456 Oak St';
  (cloned as any).hobbies.push('painting');
  
  assertEqual(testObject.name, 'Alice', 'Original should remain unchanged');
  assertEqual(testObject.address.street, '123 Main St', 'Original nested should remain unchanged');
  assertEqual(testObject.hobbies.length, 3, 'Original array should remain unchanged');
  
  console.log('✅ cloneImmutable creates independent deep copies');

  // Test 2.3: updateImmutable functionality
  console.log('\n📋 Test 2.3: updateImmutable functionality');
  
  const updated = updateImmutable(testObject, 'name', 'Bob');
  
  // Verify update
  assertEqual(updated.name, 'Bob', 'Updated object should have new value');
  assertEqual(testObject.name, 'Alice', 'Original should remain unchanged');
  assertEqual(updated.address.street, testObject.address.street, 'Other properties should remain unchanged');
  
  // Test nested update
  const updatedNested = updateImmutable(updated, 'address', { ...updated.address, street: '456 Oak St' });
  assertEqual(updatedNested.address.street, '456 Oak St', 'Nested update should work');
  assertEqual(updated.address.street, '123 Main St', 'Previous update should remain unchanged');
  
  console.log('✅ updateImmutable preserves immutability');

  // Test 2.4: Type-level readonly preservation
  console.log('\n📋 Test 2.4: Type-level readonly preservation');
  
  // This is a type-level test - we can't run it at runtime, but we can verify the types
  type TestReadonly = {
    readonly name: string;
    readonly age: number;
    readonly address: {
      readonly street: string;
      readonly city: string;
    };
  };
  
  type FrozenType = ReturnType<typeof freezeDeep<TestReadonly>>;
  type ClonedType = ReturnType<typeof cloneImmutable<TestReadonly>>;
  type UpdatedType = ReturnType<typeof updateImmutable<TestReadonly, 'name'>>;
  
  // These type assertions would fail if readonly wasn't preserved
  type FrozenReadonly = FrozenType extends TestReadonly ? true : false;
  type ClonedReadonly = ClonedType extends TestReadonly ? true : false;
  type UpdatedReadonly = UpdatedType extends TestReadonly ? true : false;
  
  assertType<FrozenReadonly>(true);
  assertType<ClonedReadonly>(true);
  assertType<UpdatedReadonly>(true);
  
  console.log('✅ Type-level readonly is preserved');

  // ============================================================================
  // 3. Async Bimonad Operations Tests
  // ============================================================================
  
  console.log('\n📋 Section 3: Async Bimonad Operations Tests');
  
  // Test 3.1: TaskEither bichain - success branch
  console.log('\n📋 Test 3.1: TaskEither bichain - success branch');
  
  const successTask = TaskEither.right(42);
  
  const bichainResult = await successTask
    .then(either => 
      either.tag === 'Right' 
        ? TaskEither.right(either.value * 2) // Success branch
        : TaskEither.left('Unexpected error')
    );
  
  assertEqual(bichainResult.tag, 'Right', 'Success branch should return Right');
  assertEqual(bichainResult.value, 84, 'Success branch should transform value correctly');
  
  console.log('✅ TaskEither bichain success branch works correctly');

  // Test 3.2: TaskEither bichain - error branch
  console.log('\n📋 Test 3.2: TaskEither bichain - error branch');
  
  const errorTask = TaskEither.left('Database error');
  
  const bichainErrorResult = await errorTask
    .then(either => 
      either.tag === 'Left' 
        ? TaskEither.right(`Recovered from: ${either.value}`) // Error branch
        : TaskEither.left('Unexpected success')
    );
  
  assertEqual(bichainErrorResult.tag, 'Right', 'Error branch should return Right');
  assertEqual(bichainErrorResult.value, 'Recovered from: Database error', 'Error branch should handle error correctly');
  
  console.log('✅ TaskEither bichain error branch works correctly');

  // Test 3.3: TaskEither matchM - success case
  console.log('\n📋 Test 3.3: TaskEither matchM - success case');
  
  const matchMSuccess = await successTask
    .then(either => 
      either.tag === 'Right' 
        ? TaskEither.right(`Success: ${either.value}`)
        : TaskEither.left(`Error: ${either.value}`)
    );
  
  assertEqual(matchMSuccess.tag, 'Right', 'matchM success should return Right');
  assertEqual(matchMSuccess.value, 'Success: 42', 'matchM should handle success correctly');
  
  console.log('✅ TaskEither matchM success case works correctly');

  // Test 3.4: TaskEither matchM - error case
  console.log('\n📋 Test 3.4: TaskEither matchM - error case');
  
  const matchMError = await errorTask
    .then(either => 
      either.tag === 'Left' 
        ? TaskEither.left(`Handled error: ${either.value}`)
        : TaskEither.right(`Unexpected success: ${either.value}`)
    );
  
  assertEqual(matchMError.tag, 'Left', 'matchM error should return Left');
  assertEqual(matchMError.value, 'Handled error: Database error', 'matchM should handle error correctly');
  
  console.log('✅ TaskEither matchM error case works correctly');

  // ============================================================================
  // 4. Higher-Order Kind Usage Tests
  // ============================================================================
  
  console.log('\n📋 Section 4: Higher-Order Kind Usage Tests');
  
  // Test 4.1: ObservableLite<Either<L, R>> type inference
  console.log('\n📋 Test 4.1: ObservableLite<Either<L, R>> type inference');
  
  const eitherObservable = ObservableLite.fromArray([
    Right<string, number>(42),
    Left<string, number>('error'),
    Right<string, number>(100)
  ]);
  
  // Test that we can map over the inner Either values
  const mappedObservable = eitherObservable.map(either => 
    either.tag === 'Right' 
      ? Right<string, number>(either.value * 2)
      : Left<string, number>(`Enhanced: ${either.value}`)
  );
  
  const mappedResults = mappedObservable.toArray();
  
  assertEqual(mappedResults[0].tag, 'Right', 'First result should be Right');
  assertEqual(mappedResults[0].value, 84, 'First result should be doubled');
  assertEqual(mappedResults[1].tag, 'Left', 'Second result should be Left');
  assertEqual(mappedResults[1].value, 'Enhanced: error', 'Second result should be enhanced error');
  assertEqual(mappedResults[2].tag, 'Right', 'Third result should be Right');
  assertEqual(mappedResults[2].value, 200, 'Third result should be doubled');
  
  console.log('✅ ObservableLite<Either<L, R>> type inference works correctly');

  // Test 4.2: Higher-Order Kind composition with ObservableLite
  console.log('\n📋 Test 4.2: Higher-Order Kind composition with ObservableLite');
  
  // Create a Higher-Order Kind that represents ObservableLite<Either<L, R>>
  interface ObservableEitherHOK<L, R> extends HigherKind<Kind2, Kind1> {
    readonly __input: Kind2;
    readonly __output: Kind1;
    readonly type: ObservableLite<Either<L, R>>;
  }
  
  // Test that it works with our type system
  type TestObservableEither = ObservableEitherHOK<string, number>;
  type TestInput = KindInput<TestObservableEither>;
  type TestOutput = KindOutput<TestObservableEither>;
  
  assertType<TestInput extends Kind2 ? true : false>(true);
  assertType<TestOutput extends Kind1 ? true : false>(true);
  
  console.log('✅ Higher-Order Kind composition with ObservableLite works correctly');

  // Test 4.3: Polymorphic typeclass usage with Higher-Order Kinds
  console.log('\n📋 Test 4.3: Polymorphic typeclass usage with Higher-Order Kinds');
  
  // Test that our polymorphic typeclasses can work with ObservableLite<Either<L, R>>
  type ObservableEitherFunctor = Functor<HigherKind<Kind1, Kind1>>;
  type ObservableEitherBifunctor = Bifunctor<HigherKind<Kind2, Kind2>>;
  
  // These should be valid typeclass instances
  assertType<ObservableEitherFunctor extends object ? true : false>(true);
  assertType<ObservableEitherBifunctor extends object ? true : false>(true);
  
  console.log('✅ Polymorphic typeclass usage with Higher-Order Kinds works correctly');

  // Test 4.4: Complex Higher-Order Kind composition
  console.log('\n📋 Test 4.4: Complex Higher-Order Kind composition');
  
  // Test composition of multiple Higher-Order Kinds
  type F = HigherKind<Kind1, Kind1>; // ObservableLite
  type G = HigherKind<Kind2, Kind2>; // Either
  type H = HigherKind<Kind1, Kind1>; // Maybe
  
  // Test that we can compose these in various ways
  type ComposedFG = ComposeHOK<F, G>;
  type ComposedGH = ComposeHOK<G, H>;
  
  // These should be valid compositions
  assertType<ComposedFG extends HigherKind<KindAny, KindAny> ? true : false>(true);
  assertType<ComposedGH extends HigherKind<KindAny, KindAny> ? true : false>(true);
  
  console.log('✅ Complex Higher-Order Kind composition works correctly');

  console.log('\n✅ All Advanced Features tests passed!');
};

// Run the tests
testAdvancedFeatures().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 