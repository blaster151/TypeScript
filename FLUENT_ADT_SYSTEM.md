# Fluent ADT System

## Overview

The Fluent ADT System provides automatic derivation of typeclass instances and fluent method syntax for all Algebraic Data Types (ADTs) in the FP library. This eliminates boilerplate and provides a consistent, chainable API across all data types.

## Features

### 1. Fluent Method Syntax

All ADTs now support fluent method syntax similar to `ObservableLite`:

```typescript
// Before: Manual typeclass usage
const doubled = map(maybe, x => x * 2);
const chained = chain(doubled, x => Just(x.toString()));

// After: Fluent syntax
const result = maybe
  .map(x => x * 2)
  .chain(x => Just(x.toString()));
```

### 2. Automatic Instance Derivation

Typeclass instances are automatically derived without manual boilerplate:

```typescript
// Automatically derive all instances for Maybe
const maybeInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  eq: true,
  ord: true,
  show: true
});
```

### 3. Auto-Registration

Derived instances are automatically registered with the global registry:

```typescript
// Auto-register Maybe with all instances
autoRegisterMaybe();

// Auto-register all core ADTs
autoRegisterAllCoreADTs();
```

## Core Components

### fp-fluent-adt.ts

Provides fluent method syntax for ADTs:

- `addFluentMethods<F, A>(adt, typeName)` - Add fluent methods to an ADT instance
- `addBifunctorMethods<F, L, R>(adt, typeName)` - Add bifunctor methods
- `fluentMaybe<A>(maybe)` - Fluent wrapper for Maybe
- `fluentEither<L, R>(either)` - Fluent wrapper for Either
- `fluentResult<A, E>(result)` - Fluent wrapper for Result
- `fluentObservable<A>(observable)` - Fluent wrapper for ObservableLite
- `augmentADTWithFluent<F>(constructor, typeName)` - Augment constructor prototype
- `autoAugmentCoreADTs()` - Auto-augment all core ADTs

### fp-derivation-helpers.ts

Provides automatic instance derivation:

- `deriveFunctorInstance<F>()` - Derive Functor instance
- `deriveApplicativeInstance<F>()` - Derive Applicative instance
- `deriveMonadInstance<F>()` - Derive Monad instance
- `deriveBifunctorInstance<F>()` - Derive Bifunctor instance
- `deriveEqInstance<A>()` - Derive Eq instance
- `deriveOrdInstance<A>()` - Derive Ord instance
- `deriveShowInstance<A>()` - Derive Show instance
- `deriveInstances<F>(config)` - Derive multiple instances

### fp-auto-registration.ts

Provides automatic registration:

- `autoRegisterADT<F>(config)` - Auto-register ADT instances
- `autoRegisterMaybe()` - Auto-register Maybe instances
- `autoRegisterEither()` - Auto-register Either instances
- `autoRegisterResult()` - Auto-register Result instances
- `autoRegisterObservableLite()` - Auto-register ObservableLite instances
- `autoRegisterTaskEither()` - Auto-register TaskEither instances
- `autoRegisterAllCoreADTs()` - Auto-register all core ADTs
- `validateRegisteredInstances(typeName)` - Validate registrations

## Usage Examples

### Basic Fluent Usage

```typescript
import { fluentMaybe, fluentEither, fluentResult } from './fp-fluent-adt';

// Maybe fluent usage
const maybe = Just(42);
const result = fluentMaybe(maybe)
  .map(x => x * 2)
  .filter(x => x > 50)
  .chain(x => Just(x.toString()));

// Either fluent usage
const either = Right('success');
const result = fluentEither(either)
  .mapRight(str => str.toUpperCase())
  .mapLeft(err => `Error: ${err}`);

// Result fluent usage
const result = Ok(123);
const final = fluentResult(result)
  .map(x => x * 2)
  .bimap(err => `Error: ${err}`, val => `Value: ${val}`);
```

### Automatic Derivation

```typescript
import { deriveInstances } from './fp-derivation-helpers';

// Derive all instances for a custom ADT
const customInstances = deriveInstances({
  functor: true,
  monad: true,
  eq: true,
  show: true,
  customMap: (fa, f) => {
    // Custom mapping logic
    return fa.match({
      Success: ({ value }) => Success(f(value)),
      Failure: ({ error }) => Failure(error)
    });
  }
});
```

### Auto-Registration

```typescript
import { autoRegisterAllCoreADTs } from './fp-auto-registration';

// Auto-register all core ADTs
const results = autoRegisterAllCoreADTs();

// Check results
results.forEach(result => {
  if (result.success) {
    console.log(`✅ ${result.typeName}: ${result.registered.join(', ')}`);
  } else {
    console.log(`❌ ${result.typeName}: ${result.errors.join(', ')}`);
  }
});
```

### Custom Derivation

```typescript
import { deriveFunctorInstance } from './fp-derivation-helpers';

// Custom Functor with specific logic
const customFunctor = deriveFunctorInstance({
  customMap: (fa, f) => {
    // Handle specific ADT structure
    if (fa.type === 'Tree') {
      return {
        type: 'Tree',
        value: f(fa.value),
        left: fa.left ? customFunctor.map(fa.left, f) : null,
        right: fa.right ? customFunctor.map(fa.right, f) : null
      };
    }
    return fa;
  }
});
```

## Supported Typeclasses

### Core Typeclasses

- **Functor**: `map<A, B>(fa: F<A>, f: (a: A) => B): F<B>`
- **Applicative**: `of<A>(a: A): F<A>`, `ap<A, B>(fab: F<(a: A) => B>, fa: F<A>): F<B>`
- **Monad**: `chain<A, B>(fa: F<A>, f: (a: A) => F<B>): F<B>`
- **Bifunctor**: `bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>`

### Standard Typeclasses

- **Eq**: `equals(a: A, b: A): boolean`
- **Ord**: `compare(a: A, b: A): number` (extends Eq)
- **Show**: `show(a: A): string`

## Fluent Method API

### Unary Type Constructors (Maybe, ObservableLite)

```typescript
interface FluentADT<F, A> {
  map<B>(f: (a: A) => B): F<B>;
  chain<B>(f: (a: A) => F<B>): F<B>;
  filter(predicate: (a: A) => boolean): F<A>;
  ap<B>(other: F<(a: A) => B>): F<B>;
}
```

### Binary Type Constructors (Either, Result)

```typescript
interface FluentBifunctorADT<F, L, R> {
  bimap<L2, R2>(f: (l: L) => L2, g: (r: R) => R2): F<L2, R2>;
  mapLeft<L2>(f: (l: L) => L2): F<L2, R>;
  mapRight<R2>(g: (r: R) => R2): F<L, R2>;
  chainLeft<L2>(f: (l: L) => F<L2, R>): F<L2, R>;
  chainRight<R2>(g: (r: R) => F<L, R2>): F<L, R2>;
}
```

## Purity Integration

All derived instances are automatically tagged with appropriate purity:

- **Pure**: Maybe, Either, Result, Eq, Ord, Show
- **Async**: ObservableLite, TaskEither
- **IO**: IO monad (when implemented)
- **State**: State monad (when implemented)

## Error Handling

The system provides comprehensive error handling:

```typescript
// Missing typeclass instance
try {
  addFluentMethods(adt, 'NonExistent');
} catch (error) {
  console.log(error.message); // "No Functor instance found for NonExistent"
}

// Invalid ADT structure
try {
  const invalidADT = { invalid: 'structure' };
  addFluentMethods(invalidADT, 'Maybe');
} catch (error) {
  console.log(error.message); // Appropriate error message
}
```

## Performance Considerations

- **Derivation**: Instance derivation is done once at registration time
- **Method Addition**: Fluent methods are added via prototype augmentation for efficiency
- **Registry Lookup**: Typeclass instances are cached in the global registry
- **Type Safety**: Full TypeScript support with proper type inference

## Migration Guide

### From Manual Typeclass Usage

```typescript
// Before
const result = pipe(
  maybe,
  map(x => x * 2),
  chain(x => Just(x.toString()))
);

// After
const result = maybe
  .map(x => x * 2)
  .chain(x => Just(x.toString()));
```

### From Manual Instance Definitions

```typescript
// Before
export const MaybeFunctor: Functor<MaybeK> = {
  map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => {
    return fa.match({
      Just: ({ value }) => Just(f(value)),
      Nothing: () => Nothing
    });
  }
};

// After
const maybeInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true
});
```

## Testing

The system includes comprehensive tests:

```bash
# Run all fluent ADT tests
node test-fluent-adt-system.js

# Run simple tests
node test-fluent-simple.js
```

## Future Enhancements

- **Recursive ADTs**: Better support for Tree, List, and other recursive types
- **Custom Derivation Rules**: More sophisticated derivation patterns
- **Performance Optimizations**: Compile-time derivation where possible
- **Integration with Optics**: Seamless integration with the optics system
- **Effect Tracking**: Enhanced purity and effect tracking

## Conclusion

The Fluent ADT System provides a powerful, type-safe, and ergonomic way to work with ADTs in the FP library. It eliminates boilerplate, provides consistent APIs, and integrates seamlessly with the existing typeclass and registry systems. 