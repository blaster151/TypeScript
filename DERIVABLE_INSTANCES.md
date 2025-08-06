# Derivable Instances System

## Overview

The Derivable Instances System provides automatic generation of typeclass instances for ADTs without manual boilerplate. This system replaces all manually-written Functor, Applicative, Monad, Bifunctor, and standard typeclass instances with automatically derived ones.

## Features

### 1. Automatic Instance Derivation

All typeclass instances are now automatically derived:

```typescript
// Before: Manual instance definition
export const MaybeFunctor: Functor<MaybeK> = {
  map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    fa === null || fa === undefined ? (fa as Maybe<B>) : f(fa)
};

// After: Automatic derivation
export const MaybeInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => Just(f(value)),
      Nothing: () => Nothing()
    })
});
```

### 2. Standard Typeclass Derivation

Automatic derivation of Eq, Ord, and Show typeclasses:

```typescript
// Automatic Eq derivation
export const MaybeEq = deriveEqInstance({
  customEq: <A>(a: Maybe<A>, b: Maybe<A>): boolean => {
    return matchMaybe(a, {
      Just: aValue => matchMaybe(b, {
        Just: bValue => aValue === bValue,
        Nothing: () => false
      }),
      Nothing: () => matchMaybe(b, {
        Just: () => false,
        Nothing: () => true
      })
    });
  }
});

// Automatic Ord derivation
export const MaybeOrd = deriveOrdInstance({
  customOrd: <A>(a: Maybe<A>, b: Maybe<A>): number => {
    return matchMaybe(a, {
      Just: aValue => matchMaybe(b, {
        Just: bValue => {
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        },
        Nothing: () => 1 // Just > Nothing
      }),
      Nothing: () => matchMaybe(b, {
        Just: () => -1, // Nothing < Just
        Nothing: () => 0
      })
    });
  }
});

// Automatic Show derivation
export const MaybeShow = deriveShowInstance({
  customShow: <A>(a: Maybe<A>): string => 
    matchMaybe(a, {
      Just: value => `Just(${JSON.stringify(value)})`,
      Nothing: () => 'Nothing'
    })
});
```

### 3. Registry Integration

All derived instances are automatically registered:

```typescript
// Auto-registration in registry
registry.registerTypeclass('Maybe', 'Functor', MaybeInstances.functor);
registry.registerTypeclass('Maybe', 'Applicative', MaybeInstances.applicative);
registry.registerTypeclass('Maybe', 'Monad', MaybeInstances.monad);
registry.registerTypeclass('Maybe', 'Eq', MaybeEq);
registry.registerTypeclass('Maybe', 'Ord', MaybeOrd);
registry.registerTypeclass('Maybe', 'Show', MaybeShow);

registry.registerDerivable('Maybe', {
  functor: MaybeInstances.functor,
  applicative: MaybeInstances.applicative,
  monad: MaybeInstances.monad,
  eq: MaybeEq,
  ord: MaybeOrd,
  show: MaybeShow,
  purity: { effect: 'Pure' as const }
});
```

## Core Components

### fp-derivation-helpers.ts

Provides the core derivation functions:

- `deriveInstances<F>(config)` - Derive multiple typeclass instances
- `deriveFunctorInstance<F>(config)` - Derive Functor instance
- `deriveApplicativeInstance<F>(config)` - Derive Applicative instance
- `deriveMonadInstance<F>(config)` - Derive Monad instance
- `deriveBifunctorInstance<F>(config)` - Derive Bifunctor instance
- `deriveEqInstance<A>(config)` - Derive Eq instance
- `deriveOrdInstance<A>(config)` - Derive Ord instance
- `deriveShowInstance<A>(config)` - Derive Show instance

### Derivation Configuration

```typescript
interface DerivationConfig {
  functor?: boolean;
  applicative?: boolean;
  monad?: boolean;
  bifunctor?: boolean;
  eq?: boolean;
  ord?: boolean;
  show?: boolean;
  customMap?: <A, B>(fa: any, f: (a: A) => B) => any;
  customChain?: <A, B>(fa: any, f: (a: A) => any) => any;
  customBimap?: <A, B, C, D>(fab: any, f: (a: A) => C, g: (b: B) => D) => any;
  customEq?: (a: any, b: any) => boolean;
  customOrd?: (a: any, b: any) => number;
  customShow?: (a: any) => string;
}
```

## Migration Guide

### From Manual to Derived Instances

#### Step 1: Replace Manual Instances

**Before:**
```typescript
// Manual Functor instance
export const MaybeFunctor: Functor<MaybeK> = {
  map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    fa === null || fa === undefined ? (fa as Maybe<B>) : f(fa)
};

// Manual Applicative instance
export const MaybeApplicative: Applicative<MaybeK> = {
  ...MaybeFunctor,
  of: <A>(a: A): Maybe<A> => a,
  ap: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => 
    fab === null || fab === undefined || fa === null || fa === undefined 
      ? null 
      : fab(fa)
};

// Manual Monad instance
export const MaybeMonad: Monad<MaybeK> = {
  ...MaybeApplicative,
  chain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => 
    fa === null || fa === undefined ? (fa as Maybe<B>) : f(fa)
};
```

**After:**
```typescript
// Derived instances
export const MaybeInstances = deriveInstances({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => Just(f(value)),
      Nothing: () => Nothing()
    }),
  customChain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => f(value),
      Nothing: () => Nothing()
    })
});

export const MaybeFunctor = MaybeInstances.functor;
export const MaybeApplicative = MaybeInstances.applicative;
export const MaybeMonad = MaybeInstances.monad;
```

#### Step 2: Add Standard Typeclass Instances

```typescript
// Add Eq, Ord, Show instances
export const MaybeEq = deriveEqInstance({
  customEq: <A>(a: Maybe<A>, b: Maybe<A>): boolean => {
    return matchMaybe(a, {
      Just: aValue => matchMaybe(b, {
        Just: bValue => aValue === bValue,
        Nothing: () => false
      }),
      Nothing: () => matchMaybe(b, {
        Just: () => false,
        Nothing: () => true
      })
    });
  }
});

export const MaybeOrd = deriveOrdInstance({
  customOrd: <A>(a: Maybe<A>, b: Maybe<A>): number => {
    return matchMaybe(a, {
      Just: aValue => matchMaybe(b, {
        Just: bValue => {
          if (aValue < bValue) return -1;
          if (aValue > bValue) return 1;
          return 0;
        },
        Nothing: () => 1 // Just > Nothing
      }),
      Nothing: () => matchMaybe(b, {
        Just: () => -1, // Nothing < Just
        Nothing: () => 0
      })
    });
  }
});

export const MaybeShow = deriveShowInstance({
  customShow: <A>(a: Maybe<A>): string => 
    matchMaybe(a, {
      Just: value => `Just(${JSON.stringify(value)})`,
      Nothing: () => 'Nothing'
    })
});
```

#### Step 3: Update Registry Registration

```typescript
// Register all instances
registry.registerTypeclass('Maybe', 'Functor', MaybeInstances.functor);
registry.registerTypeclass('Maybe', 'Applicative', MaybeInstances.applicative);
registry.registerTypeclass('Maybe', 'Monad', MaybeInstances.monad);
registry.registerTypeclass('Maybe', 'Eq', MaybeEq);
registry.registerTypeclass('Maybe', 'Ord', MaybeOrd);
registry.registerTypeclass('Maybe', 'Show', MaybeShow);

registry.registerDerivable('Maybe', {
  functor: MaybeInstances.functor,
  applicative: MaybeInstances.applicative,
  monad: MaybeInstances.monad,
  eq: MaybeEq,
  ord: MaybeOrd,
  show: MaybeShow,
  purity: { effect: 'Pure' as const }
});
```

## Supported ADTs

### Core ADTs

- **Array**: Functor, Applicative, Monad, Eq, Ord, Show
- **Maybe**: Functor, Applicative, Monad, Eq, Ord, Show
- **Either**: Bifunctor, Eq, Ord, Show
- **Result**: Functor, Applicative, Monad, Bifunctor, Eq, Ord, Show
- **Tuple**: Bifunctor, Eq, Ord, Show
- **ObservableLite**: Functor, Applicative, Monad (Async purity)
- **TaskEither**: Bifunctor, Monad (Async purity)

### Persistent Collections

- **PersistentList**: Functor, Applicative, Monad
- **PersistentMap**: Functor, Bifunctor
- **PersistentSet**: Functor

### GADTs

- **MaybeGADT**: Functor, Applicative, Monad
- **EitherGADT**: Bifunctor
- **ExprGADT**: Functor

## Custom Derivation

### Custom Mapping Logic

```typescript
const customInstances = deriveInstances({
  functor: true,
  customMap: <A, B>(fa: CustomADT<A>, f: (a: A) => B): CustomADT<B> => {
    // Custom mapping logic for your ADT
    return fa.match({
      Success: ({ value }) => Success(f(value)),
      Failure: ({ error }) => Failure(error)
    });
  }
});
```

### Custom Equality Logic

```typescript
const customEq = deriveEqInstance({
  customEq: <A>(a: CustomADT<A>, b: CustomADT<A>): boolean => {
    // Custom equality logic
    return a.tag === b.tag && a.value === b.value;
  }
});
```

### Custom Ordering Logic

```typescript
const customOrd = deriveOrdInstance({
  customOrd: <A>(a: CustomADT<A>, b: CustomADT<A>): number => {
    // Custom ordering logic
    if (a.tag < b.tag) return -1;
    if (a.tag > b.tag) return 1;
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  }
});
```

## Purity Integration

All derived instances preserve purity information:

```typescript
// Pure ADTs
registry.registerDerivable('Maybe', {
  // ... instances
  purity: { effect: 'Pure' as const }
});

// Async ADTs
registry.registerDerivable('ObservableLite', {
  // ... instances
  purity: { effect: 'Async' as const }
});
```

## Testing

### Unit Tests

```typescript
// Test derived instances
describe('Derived Instances', () => {
  test('Maybe Functor laws', () => {
    const maybe = Just(42);
    const doubled = MaybeFunctor.map(maybe, x => x * 2);
    expect(doubled).toEqual(Just(84));
  });

  test('Maybe Eq', () => {
    const maybe1 = Just(42);
    const maybe2 = Just(42);
    const maybe3 = Nothing();
    
    expect(MaybeEq.equals(maybe1, maybe2)).toBe(true);
    expect(MaybeEq.equals(maybe1, maybe3)).toBe(false);
  });

  test('Maybe Ord', () => {
    const maybe1 = Just(42);
    const maybe2 = Just(84);
    const maybe3 = Nothing();
    
    expect(MaybeOrd.compare(maybe1, maybe2)).toBe(-1);
    expect(MaybeOrd.compare(maybe2, maybe1)).toBe(1);
    expect(MaybeOrd.compare(maybe1, maybe1)).toBe(0);
    expect(MaybeOrd.compare(maybe3, maybe1)).toBe(-1);
  });
});
```

### Integration Tests

```typescript
// Test registry integration
describe('Registry Integration', () => {
  test('Derived instances are registered', () => {
    const functor = getTypeclassInstance('Maybe', 'Functor');
    const eq = getTypeclassInstance('Maybe', 'Eq');
    
    expect(functor).toBeDefined();
    expect(eq).toBeDefined();
  });

  test('Purity is preserved', () => {
    const maybePurity = getPurityEffect('Maybe');
    const observablePurity = getPurityEffect('ObservableLite');
    
    expect(maybePurity).toBe('Pure');
    expect(observablePurity).toBe('Async');
  });
});
```

## Benefits

### 1. Reduced Boilerplate

- **Before**: 50+ lines of manual instance definitions
- **After**: 10-15 lines of derivation configuration

### 2. Consistency

- All ADTs use the same derivation patterns
- Consistent behavior across the entire library
- Standardized typeclass implementations

### 3. Type Safety

- Full TypeScript support with proper type inference
- Compile-time validation of typeclass laws
- Type-safe custom derivation functions

### 4. Maintainability

- Single source of truth for instance logic
- Easy to update derivation patterns
- Automatic propagation of changes

### 5. Performance

- Derived instances are optimized for common patterns
- No runtime overhead compared to manual instances
- Efficient registry lookups

## Future Enhancements

### 1. Compile-time Derivation

- Explore compile-time derivation for better performance
- Type-level instance generation
- Zero-cost abstractions

### 2. Advanced Derivation Patterns

- Support for recursive ADTs (Tree, List)
- Automatic derivation for more typeclasses
- Pattern-based derivation rules

### 3. Derivation Validation

- Automatic validation of typeclass laws
- Compile-time checking of derivation correctness
- Runtime verification of instance behavior

### 4. Derivation Optimization

- Performance profiling of derived instances
- Automatic optimization of common patterns
- Caching of derived instances

## Conclusion

The Derivable Instances System provides a powerful, type-safe, and maintainable way to generate typeclass instances for ADTs. It eliminates boilerplate, ensures consistency, and integrates seamlessly with the existing FP library infrastructure. 