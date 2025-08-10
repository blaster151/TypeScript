/**
 * Typeclass-Aware Fluent Composition Example
 * 
 * This example demonstrates the typeclass-aware fluent composition system
 * with compile-time type safety and cross-typeclass chaining.
 */

import {
  addTypeclassAwareFluentMethods,
  createTypeclassAwareFluent,
  TypeclassAwareComposition,
  detectTypeclassCapabilities,
  TypeclassCapabilities,
  TypeclassAwareFluentMethods
} from '../fp-unified-fluent-api';

// Example ADT implementations
class Maybe<T> {
  constructor(private value: T | null) {}
  
  static of<T>(value: T): Maybe<T> {
    return new Maybe(value);
  }
  
  static nothing<T>(): Maybe<T> {
    return new Maybe(null);
  }
  
  getValue(): T | null {
    return this.value;
  }
  
  isJust(): boolean {
    return this.value !== null;
  }
  
  isNothing(): boolean {
    return this.value === null;
  }
}

class Either<L, R> {
  constructor(private left: L | null, private right: R | null) {}
  
  static left<L, R>(value: L): Either<L, R> {
    return new Either(value, null);
  }
  
  static right<L, R>(value: R): Either<L, R> {
    return new Either(null, value);
  }
  
  isLeft(): boolean {
    return this.left !== null;
  }
  
  isRight(): boolean {
    return this.right !== null;
  }
  
  getLeft(): L | null {
    return this.left;
  }
  
  getRight(): R | null {
    return this.right;
  }
}

// Example typeclass instances (simplified for demonstration)
const maybeFunctor = {
  map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => {
    return fa.isJust() ? Maybe.of(f(fa.getValue()!)) : Maybe.nothing();
  }
};

const maybeMonad = {
  of: <A>(a: A): Maybe<A> => Maybe.of(a),
  chain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => {
    return fa.isJust() ? f(fa.getValue()!) : Maybe.nothing();
  }
};

const maybeApplicative = {
  of: <A>(a: A): Maybe<A> => Maybe.of(a),
  ap: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => {
    if (fab.isJust() && fa.isJust()) {
      return Maybe.of(fab.getValue()!(fa.getValue()!));
    }
    return Maybe.nothing();
  }
};

const maybeFilterable = {
  filter: <A>(fa: Maybe<A>, predicate: (a: A) => boolean): Maybe<A> => {
    return fa.isJust() && predicate(fa.getValue()!) ? fa : Maybe.nothing();
  }
};

const eitherFunctor = {
  map: <A, B>(fa: Either<any, A>, f: (a: A) => B): Either<any, B> => {
    return fa.isRight() ? Either.right(f(fa.getRight()!)) : Either.left(fa.getLeft()!);
  }
};

const eitherMonad = {
  of: <A>(a: A): Either<any, A> => Either.right(a),
  chain: <A, B>(fa: Either<any, A>, f: (a: A) => Either<any, B>): Either<any, B> => {
    return fa.isRight() ? f(fa.getRight()!) : Either.left(fa.getLeft()!);
  }
};

const eitherBifunctor = {
  bimap: <A, B, C, D>(fa: Either<A, B>, f: (a: A) => C, g: (b: B) => D): Either<C, D> => {
    if (fa.isLeft()) {
      return Either.left(f(fa.getLeft()!));
    } else {
      return Either.right(g(fa.getRight()!));
    }
  },
  mapLeft: <A, B, C>(fa: Either<A, B>, f: (a: A) => C): Either<C, B> => {
    if (fa.isLeft()) {
      return Either.left(f(fa.getLeft()!));
    } else {
      return Either.right(fa.getRight()!);
    }
  },
  mapRight: <A, B, C>(fa: Either<A, B>, g: (b: B) => C): Either<A, C> => {
    if (fa.isLeft()) {
      return Either.left(fa.getLeft()!);
    } else {
      return Either.right(g(fa.getRight()!));
    }
  }
};

// Mock registry for demonstration
const mockRegistry = {
  derivable: new Map([
    ['Maybe', {
      functor: maybeFunctor,
      monad: maybeMonad,
      applicative: maybeApplicative,
      filterable: maybeFilterable
    }],
    ['Either', {
      functor: eitherFunctor,
      monad: eitherMonad,
      bifunctor: eitherBifunctor
    }]
  ])
};

// Mock registry functions
(global as any).getTypeclassInstance = (adtName: string, typeclass: string) => {
  const instances = mockRegistry.derivable.get(adtName);
  return instances ? instances[typeclass.toLowerCase()] : null;
};

(global as any).getDerivableInstances = (adtName: string) => {
  return mockRegistry.derivable.get(adtName) || null;
};

(global as any).getFPRegistry = () => mockRegistry;

// Example 1: Basic Typeclass-Aware Fluent Usage
console.log('=== Example 1: Basic Typeclass-Aware Fluent Usage ===');

const maybeValue = Maybe.of(42);
const capabilities = detectTypeclassCapabilities('Maybe');

console.log('Detected capabilities:', capabilities);

const fluentMaybe = addTypeclassAwareFluentMethods(maybeValue, 'Maybe', capabilities);

// Chain operations with preserved typeclass capabilities
const result1 = fluentMaybe
  .map((x: number) => x * 2)
  .filter((x: number) => x > 80)
  .chain((x: number) => Maybe.of(x.toString()));

console.log('Result 1:', result1.getValue()); // "84"

// Example 2: Cross-Typeclass Chaining
console.log('\n=== Example 2: Cross-Typeclass Chaining ===');

const eitherValue = Either.right(42);
const eitherCapabilities = detectTypeclassCapabilities('Either');

console.log('Either capabilities:', eitherCapabilities);

const fluentEither = addTypeclassAwareFluentMethods(eitherValue, 'Either', eitherCapabilities);

// Start with Functor, then use Bifunctor methods
const result2 = fluentEither
  .map((x: number) => x * 2)
  .bimap(
    (l: any) => `Error: ${l}`,
    (r: number) => r + 1
  );

console.log('Result 2:', result2.getRight()); // 85

// Example 3: Conditional Method Access
console.log('\n=== Example 3: Conditional Method Access ===');

// Create a Maybe with limited capabilities
const limitedCapabilities: TypeclassCapabilities = {
  Functor: true,
  Monad: false,
  Applicative: false,
  Bifunctor: false,
  Traversable: false,
  Filterable: false,
  Eq: false,
  Ord: false,
  Show: false
};

const limitedMaybe = addTypeclassAwareFluentMethods(maybeValue, 'Maybe', limitedCapabilities);

// Should have map (Functor)
console.log('Has map:', typeof limitedMaybe.map === 'function'); // true

// Should NOT have chain (Monad)
console.log('Has chain:', typeof limitedMaybe.chain === 'function'); // false

// Should NOT have bimap (Bifunctor)
console.log('Has bimap:', typeof limitedMaybe.bimap === 'function'); // false

// Example 4: TypeclassAwareComposition Utilities
console.log('\n=== Example 4: TypeclassAwareComposition Utilities ===');

const fluentMaybe2 = createTypeclassAwareFluent(Maybe.of(10), 'Maybe');

// Compose functions with type safety
const double = (x: number) => createTypeclassAwareFluent(Maybe.of(x * 2), 'Maybe');
const addOne = (x: number) => createTypeclassAwareFluent(Maybe.of(x + 1), 'Maybe');

const composed = TypeclassAwareComposition.compose(double, addOne);
const result3 = composed(20);

console.log('Composed result:', result3.getValue()); // 41

// Pipe operations
const result4 = TypeclassAwareComposition.pipe(
  Maybe.of(5),
  (m) => m.map((x: number) => x * 3),
  (m) => m.chain((x: number) => Maybe.of(x + 2))
);

console.log('Piped result:', result4.getValue()); // 17

// Example 5: Capability Checking
console.log('\n=== Example 5: Capability Checking ===');

const fluentMaybe3 = createTypeclassAwareFluent(Maybe.of(42), 'Maybe');

console.log('Has Functor capability:', TypeclassAwareComposition.hasCapability(fluentMaybe3, 'Functor')); // true
console.log('Has Monad capability:', TypeclassAwareComposition.hasCapability(fluentMaybe3, 'Monad')); // true
console.log('Has Bifunctor capability:', TypeclassAwareComposition.hasCapability(fluentMaybe3, 'Bifunctor')); // false

// Safe method access
const mapMethod = TypeclassAwareComposition.safeAccess(fluentMaybe3, 'map');
const bimapMethod = TypeclassAwareComposition.safeAccess(fluentMaybe3, 'bimap', null);

console.log('Map method available:', typeof mapMethod === 'function'); // true
console.log('Bimap method available:', bimapMethod !== null); // false

// Example 6: Performance Demonstration
console.log('\n=== Example 6: Performance Demonstration ===');

const startTime = performance.now();

// Create fluent wrapper
const fluentMaybe4 = createTypeclassAwareFluent(Maybe.of(1), 'Maybe');

// Perform long chain
let result5 = fluentMaybe4;
for (let i = 0; i < 1000; i++) {
  result5 = result5.map((x: number) => x + 1);
}

const endTime = performance.now();
const performanceTime = endTime - startTime;

console.log('Performance test result:', result5.getValue()); // 1001
console.log('Performance time (ms):', performanceTime.toFixed(2));

// Example 7: Real-World Usage Pattern
console.log('\n=== Example 7: Real-World Usage Pattern ===');

// Simulate a data processing pipeline
const processUserData = (userId: number) => {
  const userMaybe = Maybe.of({ id: userId, name: 'John', age: 30 });
  const fluentUser = createTypeclassAwareFluent(userMaybe, 'Maybe');
  
  return fluentUser
    .map((user: any) => ({ ...user, age: user.age + 1 }))
    .filter((user: any) => user.age > 18)
    .chain((user: any) => Maybe.of(`User ${user.name} is ${user.age} years old`));
};

const userResult = processUserData(123);
console.log('User processing result:', userResult.getValue()); // "User John is 31 years old"

// Example 8: Error Handling with Either
console.log('\n=== Example 8: Error Handling with Either ===');

const divideSafely = (a: number, b: number) => {
  if (b === 0) {
    return Either.left('Division by zero');
  }
  return Either.right(a / b);
};

const fluentDivision = createTypeclassAwareFluent(divideSafely(10, 2), 'Either');

const divisionResult = fluentDivision
  .map((result: number) => result * 2)
  .bimap(
    (error: string) => `Error: ${error}`,
    (result: number) => `Result: ${result}`
  );

console.log('Division result:', divisionResult.getRight()); // "Result: 10"

// Example 9: Type Safety Demonstration
console.log('\n=== Example 9: Type Safety Demonstration ===');

// This demonstrates compile-time type safety
// The TypeScript compiler will prevent access to methods that don't exist

const safeMaybe = addTypeclassAwareFluentMethods(
  Maybe.of(42),
  'Maybe',
  {
    Functor: true,
    Monad: false,
    Applicative: false,
    Bifunctor: false,
    Traversable: false,
    Filterable: false,
    Eq: false,
    Ord: false,
    Show: false
  }
);

// These operations are safe
console.log('Safe map operation:', typeof safeMaybe.map === 'function'); // true

// These operations would be prevented at compile time
// safeMaybe.chain() // TypeScript error: Property 'chain' does not exist
// safeMaybe.bimap() // TypeScript error: Property 'bimap' does not exist

console.log('Type safety demonstration completed');

// Example 10: Advanced Composition
console.log('\n=== Example 10: Advanced Composition ===');

// Create a complex processing pipeline
const pipeline = (data: number) => {
  const maybe = createTypeclassAwareFluent(Maybe.of(data), 'Maybe');
  
  return maybe
    .map((x: number) => x * 2)
    .chain((x: number) => x > 100 ? Maybe.of(x) : Maybe.nothing())
    .map((x: number) => x.toString())
    .chain((s: string) => Maybe.of(`Processed: ${s}`));
};

const results = [50, 75, 100, 125, 150].map(pipeline);

console.log('Pipeline results:');
results.forEach((result, index) => {
  console.log(`  Input ${[50, 75, 100, 125, 150][index]}:`, result.getValue());
});

console.log('\n=== Typeclass-Aware Fluent Composition Example Complete ===');
