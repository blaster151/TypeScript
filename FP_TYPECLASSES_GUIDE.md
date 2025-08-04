# FP Typeclass System for TypeScript HKT

This document provides a comprehensive guide to the Functional Programming typeclass system built on top of TypeScript's Higher-Kinded Types (HKT) infrastructure.

## Overview

The FP typeclass system provides a type-safe, composable foundation for functional programming patterns in TypeScript. It leverages the existing HKT infrastructure to define typeclasses that work seamlessly with higher-kinded type constructors.

## Core Concepts

### Higher-Kinded Types (HKT)

The system uses the `Kind` type to represent higher-kinded type constructors:

```typescript
type Kind<TArgs extends any[] = any[]> = any;
type Apply<F extends Kind<any[]>, Args extends any[]> = F extends Kind<Args> ? F : never;
```

- `Kind<[Type, Type]>` represents unary type constructors (e.g., `Array`, `Maybe`)
- `Kind<[Type, Type, Type]>` represents binary type constructors (e.g., `Tuple`, `Either`)

### Typeclasses

Typeclasses are defined as generic interfaces that constrain type constructors to specific kinds:

```typescript
interface Functor<F extends Kind<[Type, Type]>> {
  map: <A, B>(fa: Apply<F, [A]>, f: (a: A) => B) => Apply<F, [B]>;
}
```

## Available Typeclasses

### 1. Functor

**Purpose**: Provides the ability to map over a container without changing its structure.

**Kind**: `Kind<[Type, Type]>` (unary type constructors)

**Methods**:
- `map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>`

**Laws**:
1. Identity: `map(fa, id) === fa`
2. Composition: `map(fa, f ∘ g) === map(map(fa, g), f)`

**Example**:
```typescript
const ArrayFunctor: Functor<Array> = {
  map: <A, B>(fa: A[], f: (a: A) => B): B[] => fa.map(f)
};

const numbers = [1, 2, 3, 4, 5];
const doubled = map(ArrayFunctor, numbers, x => x * 2);
// Result: [2, 4, 6, 8, 10]
```

### 2. Applicative

**Purpose**: Extends Functor with the ability to lift values and apply functions in context.

**Kind**: `Kind<[Type, Type]>` (unary type constructors)

**Methods**:
- `of<A>(a: A): Apply<F, [A]>` - Lifts a value into the applicative context
- `ap<A, B>(fab: Apply<F, [(a: A) => B]>, fa: Apply<F, [A]>): Apply<F, [B]>` - Applies a function in context

**Laws**:
1. Identity: `ap(of(id), v) === v`
2. Homomorphism: `ap(of(f), of(x)) === of(f(x))`
3. Interchange: `ap(u, of(y)) === ap(of(f => f(y)), u)`
4. Composition: `ap(ap(ap(of(compose), u), v), w) === ap(u, ap(v, w))`

**Example**:
```typescript
const ArrayApplicative: Applicative<Array> = {
  ...ArrayFunctor,
  of: <A>(a: A): A[] => [a],
  ap: <A, B>(fab: ((a: A) => B)[], fa: A[]): B[] => 
    fab.flatMap(f => fa.map(f))
};

const lifted = lift(ArrayApplicative, 42);
// Result: [42]

const functions = [(x: number) => x * 2, (x: number) => x + 1];
const applied = ArrayApplicative.ap(functions, [1, 2, 3]);
// Result: [2, 4, 6, 2, 3, 4]
```

### 3. Monad

**Purpose**: Extends Applicative with the ability to chain computations.

**Kind**: `Kind<[Type, Type]>` (unary type constructors)

**Methods**:
- `chain<A, B>(fa: Apply<F, [A]>, f: (a: A) => Apply<F, [B]>): Apply<F, [B]>` - Chains computations

**Laws**:
1. Left Identity: `chain(of(a), f) === f(a)`
2. Right Identity: `chain(m, of) === m`
3. Associativity: `chain(chain(m, f), g) === chain(m, x => chain(f(x), g))`

**Example**:
```typescript
const ArrayMonad: Monad<Array> = {
  ...ArrayApplicative,
  chain: <A, B>(fa: A[], f: (a: A) => B[]): B[] => 
    fa.flatMap(f)
};

const chained = chain(ArrayMonad, [1, 2, 3], x => [x, x * 2]);
// Result: [1, 2, 2, 4, 3, 6]
```

### 4. Bifunctor

**Purpose**: Provides the ability to map over both type parameters of a binary type constructor.

**Kind**: `Kind<[Type, Type, Type]>` (binary type constructors)

**Methods**:
- `bimap<A, B, C, D>(fab: Apply<F, [A, B]>, f: (a: A) => C, g: (b: B) => D): Apply<F, [C, D]>` - Maps over both parameters
- `mapLeft?<A, B, C>(fab: Apply<F, [A, B]>, f: (a: A) => C): Apply<F, [C, B]>` - Maps over the first parameter only

**Laws**:
1. Identity: `bimap(fab, id, id) === fab`
2. Composition: `bimap(bimap(fab, f1, g1), f2, g2) === bimap(fab, f2 ∘ f1, g2 ∘ g1)`

**Example**:
```typescript
const TupleBifunctor: Bifunctor<Tuple> = {
  bimap: <A, B, C, D>(
    fab: [A, B],
    f: (a: A) => C,
    g: (b: B) => D
  ): [C, D] => [f(fab[0]), g(fab[1])],
  
  mapLeft: <A, B, C>(fab: [A, B], f: (a: A) => C): [C, B] => [f(fab[0]), fab[1]]
};

const tuple: [string, number] = ["hello", 42];
const transformed = bimap(TupleBifunctor, tuple, s => s.length, n => n * 2);
// Result: [5, 84]
```

### 5. Profunctor

**Purpose**: Provides the ability to map over both type parameters of a binary type constructor, with contravariant first parameter.

**Kind**: `Kind<[Type, Type, Type]>` (binary type constructors)

**Methods**:
- `dimap<A, B, C, D>(p: Apply<F, [A, B]>, f: (c: C) => A, g: (b: B) => D): Apply<F, [C, D]>` - Maps over both parameters
- `lmap?<A, B, C>(p: Apply<F, [A, B]>, f: (c: C) => A): Apply<F, [C, B]>` - Maps over the first parameter (contravariant)
- `rmap?<A, B, D>(p: Apply<F, [A, B]>, g: (b: B) => D): Apply<F, [A, D]>` - Maps over the second parameter (covariant)

**Laws**:
1. Identity: `dimap(p, id, id) === p`
2. Composition: `dimap(dimap(p, f1, g1), f2, g2) === dimap(p, f1 ∘ f2, g2 ∘ g1)`

**Example**:
```typescript
const FunctionProfunctor: Profunctor<Function> = {
  dimap: <A, B, C, D>(
    p: (a: A) => B,
    f: (c: C) => A,
    g: (b: B) => D
  ): (c: C) => D => (c: C) => g(p(f(c))),
  
  lmap: <A, B, C>(p: (a: A) => B, f: (c: C) => A): (c: C) => B => (c: C) => p(f(c)),
  
  rmap: <A, B, D>(p: (a: A) => B, g: (b: B) => D): (a: A) => D => (a: A) => g(p(a))
};

const stringToNumber: (s: string) => number = s => s.length;
const transformedFn = dimap(FunctionProfunctor, stringToNumber, (n: number) => n.toString(), (n: number) => n * 2);
// Result: (n: number) => number (length of string representation * 2)
```

## Custom Data Types

### Maybe/Option

```typescript
type Maybe<A> = { tag: 'Just'; value: A } | { tag: 'Nothing' };

const Just = <A>(a: A): Maybe<A> => ({ tag: 'Just', value: a });
const Nothing = <A>(): Maybe<A> => ({ tag: 'Nothing' });

const MaybeFunctor: Functor<Maybe> = {
  map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    fa.tag === 'Just' ? Just(f(fa.value)) : Nothing()
};

const MaybeApplicative: Applicative<Maybe> = {
  ...MaybeFunctor,
  of: <A>(a: A): Maybe<A> => Just(a),
  ap: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => 
    fab.tag === 'Just' && fa.tag === 'Just' ? Just(fab.value(fa.value)) : Nothing()
};

const MaybeMonad: Monad<Maybe> = {
  ...MaybeApplicative,
  chain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => 
    fa.tag === 'Just' ? f(fa.value) : Nothing()
};
```

### Either

```typescript
type Either<L, R> = { tag: 'Left'; value: L } | { tag: 'Right'; value: R };

const Left = <L, R>(l: L): Either<L, R> => ({ tag: 'Left', value: l });
const Right = <L, R>(r: R): Either<L, R> => ({ tag: 'Right', value: r });

const EitherBifunctor: Bifunctor<Either> = {
  bimap: <L, R, L2, R2>(
    e: Either<L, R>,
    f: (l: L) => L2,
    g: (r: R) => R2
  ): Either<L2, R2> => 
    e.tag === 'Left' ? Left(f(e.value)) : Right(g(e.value)),
  
  mapLeft: <L, R, L2>(e: Either<L, R>, f: (l: L) => L2): Either<L2, R> => 
    e.tag === 'Left' ? Left(f(e.value)) : Right(e.value)
};
```

### Reader

```typescript
type Reader<R, A> = (r: R) => A;

const ReaderProfunctor: Profunctor<Reader> = {
  dimap: <R, A, R2, A2>(
    reader: Reader<R, A>,
    f: (r2: R2) => R,
    g: (a: A) => A2
  ): Reader<R2, A2> => (r2: R2) => g(reader(f(r2))),
  
  lmap: <R, A, R2>(reader: Reader<R, A>, f: (r2: R2) => R): Reader<R2, A> => 
    (r2: R2) => reader(f(r2)),
  
  rmap: <R, A, A2>(reader: Reader<R, A>, g: (a: A) => A2): Reader<R, A2> => 
    (r: R) => g(reader(r))
};
```

## Generic Functions

The system provides generic functions that work with any type constructor that implements the appropriate typeclass:

```typescript
// Generic map function
function map<F extends Kind<[Type, Type]>, A, B>(
  F: Functor<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => B
): Apply<F, [B]> {
  return F.map(fa, f);
}

// Generic lift function
function lift<F extends Kind<[Type, Type]>, A>(
  F: Applicative<F>,
  a: A
): Apply<F, [A]> {
  return F.of(a);
}

// Generic chain function
function chain<F extends Kind<[Type, Type]>, A, B>(
  F: Monad<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => Apply<F, [B]>
): Apply<F, [B]> {
  return F.chain(fa, f);
}

// Generic bimap function
function bimap<F extends Kind<[Type, Type, Type]>, A, B, C, D>(
  F: Bifunctor<F>,
  fab: Apply<F, [A, B]>,
  f: (a: A) => C,
  g: (b: B) => D
): Apply<F, [C, D]> {
  return F.bimap(fab, f, g);
}

// Generic dimap function
function dimap<F extends Kind<[Type, Type, Type]>, A, B, C, D>(
  F: Profunctor<F>,
  p: Apply<F, [A, B]>,
  f: (c: C) => A,
  g: (b: B) => D
): Apply<F, [C, D]> {
  return F.dimap(p, f, g);
}
```

## Utility Types

The system provides utility types for checking typeclass conformance:

```typescript
type IsFunctor<F extends Kind<[Type, Type]>> = F extends Functor<F> ? true : false;
type IsApplicative<F extends Kind<[Type, Type]>> = F extends Applicative<F> ? true : false;
type IsMonad<F extends Kind<[Type, Type]>> = F extends Monad<F> ? true : false;
type IsBifunctor<F extends Kind<[Type, Type, Type]>> = F extends Bifunctor<F> ? true : false;
type IsProfunctor<F extends Kind<[Type, Type, Type]>> = F extends Profunctor<F> ? true : false;
```

## Usage Examples

### Working with Arrays

```typescript
const numbers = [1, 2, 3, 4, 5];

// Using Functor
const doubled = map(ArrayFunctor, numbers, x => x * 2);

// Using Applicative
const lifted = lift(ArrayApplicative, 42);
const functions = [(x: number) => x * 2, (x: number) => x + 1];
const applied = ArrayApplicative.ap(functions, numbers);

// Using Monad
const chained = chain(ArrayMonad, numbers, x => [x, x * 2]);
```

### Working with Maybe

```typescript
const maybeValue = Just(42);
const nothingValue = Nothing<number>();

// Using Functor
const doubled = map(MaybeFunctor, maybeValue, x => x * 2);
const doubledNothing = map(MaybeFunctor, nothingValue, x => x * 2);

// Using Applicative
const lifted = lift(MaybeApplicative, 42);
const justFn = Just((x: number) => x * 2);
const applied = MaybeApplicative.ap(justFn, maybeValue);

// Using Monad
const chained = chain(MaybeMonad, maybeValue, x => Just(x * 2));
```

### Working with Tuples

```typescript
const tuple: [string, number] = ["hello", 42];

// Using Bifunctor
const transformed = bimap(TupleBifunctor, tuple, s => s.length, n => n * 2);
const leftMapped = TupleBifunctor.mapLeft!(tuple, s => s.toUpperCase());
```

### Working with Functions

```typescript
const stringToNumber: (s: string) => number = s => s.length;

// Using Profunctor
const transformedFn = dimap(FunctionProfunctor, stringToNumber, (n: number) => n.toString(), (n: number) => n * 2);
const leftMapped = FunctionProfunctor.lmap!(stringToNumber, (n: number) => n.toString());
const rightMapped = FunctionProfunctor.rmap!(stringToNumber, (n: number) => n * 2);
```

## Best Practices

1. **Type Safety**: Always use the generic functions (`map`, `lift`, `chain`, etc.) rather than calling typeclass methods directly.

2. **Composition**: Leverage the composability of typeclasses to build complex operations from simple ones.

3. **Laws**: Ensure your typeclass instances satisfy the appropriate laws for correctness.

4. **Documentation**: Document your typeclass instances with examples and law verification.

5. **Testing**: Write comprehensive tests for your typeclass instances to ensure they behave correctly.

## Integration with TypeScript HKT

The FP typeclass system is designed to work seamlessly with TypeScript's HKT infrastructure:

- Uses the existing `Kind` and `Apply` types
- Leverages type-level programming for compile-time safety
- Integrates with TypeScript's type inference system
- Provides excellent IDE support and error messages

## Conclusion

This FP typeclass system provides a solid foundation for functional programming in TypeScript. By leveraging the HKT infrastructure, it offers type-safe, composable abstractions that can be used to build robust, maintainable applications.

The system is extensible and can be easily adapted to work with new data types and use cases. The provided examples demonstrate the power and flexibility of the typeclass approach to functional programming. 