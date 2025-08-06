# Higher-Order Kinds (HOKs)

This document describes the Higher-Order Kinds (HOKs) system, which extends our existing Higher-Kinded Types (HKTs) to support functions from one kind to another.

## Overview

Higher-Order Kinds (HOKs) represent functions at the type level - they map from one kind to another. This enables more powerful abstractions and polymorphic typeclasses that can work with different kind arities.

### **HKTs vs HOKs**

| Aspect | HKTs (Higher-Kinded Types) | HOKs (Higher-Order Kinds) |
|--------|---------------------------|---------------------------|
| **Purpose** | First-class type constructors | Functions between type constructors |
| **Example** | `Array<A>`, `Maybe<A>` | `Functor<F>` where `F: Kind1 → Kind1` |
| **Arity** | Fixed arity (Kind1, Kind2, etc.) | Variable arity via KindAny |
| **Composition** | Direct type application | Function composition at type level |
| **Polymorphism** | Limited to specific arities | Works across different arities |

## Core Types

### **KindAny Abstraction**

```typescript
/**
 * KindAny - represents a kind of any arity
 * This is the base type for Higher-Order Kinds
 */
interface KindAny extends Kind<readonly Type[]> {
  readonly type: Type;
}

/**
 * Kind1Any - represents a unary kind (for compatibility)
 */
interface Kind1Any extends KindAny {
  readonly arg0: Type;
}

/**
 * Kind2Any - represents a binary kind (for compatibility)
 */
interface Kind2Any extends KindAny {
  readonly arg0: Type;
  readonly arg1: Type;
}
```

### **HigherKind Type**

```typescript
/**
 * HigherKind - represents a function from one kind to another
 * This is the core type for Higher-Order Kinds
 */
interface HigherKind<In extends KindAny, Out extends KindAny> {
  readonly __input: In;
  readonly __output: Out;
  readonly type: Type;
}
```

### **Higher-Order Kind Shorthands**

```typescript
/**
 * Unary to Unary HigherKind (e.g., Functor)
 */
interface HOK1<In extends Kind1, Out extends Kind1> extends HigherKind<In, Out> {
  readonly __arity: 1;
}

/**
 * Binary to Binary HigherKind (e.g., Bifunctor)
 */
interface HOK2<In extends Kind2, Out extends Kind2> extends HigherKind<In, Out> {
  readonly __arity: 2;
}

/**
 * Unary to Binary HigherKind (e.g., Applicative)
 */
interface HOK1to2<In extends Kind1, Out extends Kind2> extends HigherKind<In, Out> {
  readonly __arity: '1to2';
}

/**
 * Binary to Unary HigherKind (e.g., Contravariant)
 */
interface HOK2to1<In extends Kind2, Out extends Kind1> extends HigherKind<In, Out> {
  readonly __arity: '2to1';
}
```

## Type-Level Utilities

### **Kind Input/Output Extraction**

```typescript
/**
 * Extract the input kind from a HigherKind
 */
type KindInput<F extends HigherKind<any, any>> = F['__input'];

/**
 * Extract the output kind from a HigherKind
 */
type KindOutput<F extends HigherKind<any, any>> = F['__output'];
```

### **Kind Compatibility Checking**

```typescript
/**
 * Check if two kinds are compatible (same arity)
 */
type IsKindCompatible<F extends KindAny, G extends KindAny> = 
  F extends Kind<infer ArgsF> 
    ? G extends Kind<infer ArgsG> 
      ? ArgsF['length'] extends ArgsG['length'] 
        ? true 
        : false 
      : false 
    : false;

/**
 * Check if a HigherKind is compatible with a given input kind
 */
type IsHigherKindCompatible<F extends HigherKind<any, any>, In extends KindAny> = 
  IsKindCompatible<KindInput<F>, In>;
```

### **Higher-Order Kind Composition**

```typescript
/**
 * Compose two HigherKinds
 * F: A -> B, G: B -> C => ComposeHOK<F, G>: A -> C
 */
interface ComposeHOK<F extends HigherKind<any, any>, G extends HigherKind<any, any>> 
  extends HigherKind<KindInput<F>, KindOutput<G>> {
  readonly __composed: [F, G];
}

/**
 * Identity HigherKind - maps any kind to itself
 */
interface IdentityHOK<In extends KindAny> extends HigherKind<In, In> {
  readonly __identity: true;
}

/**
 * Constant HigherKind - maps any input kind to a constant output kind
 */
interface ConstHOK<In extends KindAny, Out extends KindAny> extends HigherKind<In, Out> {
  readonly __const: Out;
}
```

## Enhanced Typeclass Definitions

### **Before/After Comparison**

#### **Before (Traditional HKTs):**
```typescript
interface Functor<F extends Kind<[Type, Type]>> {
  map: <A, B>(fa: Apply<F, [A]>, f: (a: A) => B) => Apply<F, [B]>;
}

interface Bifunctor<F extends Kind<[Type, Type, Type]>> {
  bimap: <A, B, C, D>(
    fab: Apply<F, [A, B]>, 
    f: (a: A) => C, 
    g: (b: B) => D
  ) => Apply<F, [C, D]>;
}
```

#### **After (Higher-Order Kinds):**
```typescript
interface Functor<F extends HigherKind<KindAny, KindAny>> {
  map: <A, B>(
    fa: Apply<KindOutput<F>, [A]>, 
    f: (a: A) => B
  ) => Apply<KindOutput<F>, [B]>;
}

interface Bifunctor<F extends HigherKind<Kind2, Kind2>> {
  bimap: <A, B, C, D>(
    fab: Apply<KindOutput<F>, [A, B]>, 
    f: (a: A) => C, 
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [C, D]>;
}
```

### **Polymorphic Typeclasses**

```typescript
/**
 * Polymorphic Functor - can work with any kind
 */
type AnyFunctor = Functor<HigherKind<KindAny, KindAny>>;

/**
 * Polymorphic Functor instance that can work with any unary type constructor
 */
interface PolymorphicFunctor extends Functor<HigherKind<Kind1, Kind1>> {
  map: <F extends HigherKind<Kind1, Kind1>, A, B>(
    fa: Apply<KindOutput<F>, [A]>,
    f: (a: A) => B
  ) => Apply<KindOutput<F>, [B]>;
}

/**
 * Polymorphic Bifunctor instance that can work with any binary type constructor
 */
interface PolymorphicBifunctor extends Bifunctor<HigherKind<Kind2, Kind2>> {
  bimap: <F extends HigherKind<Kind2, Kind2>, A, B, C, D>(
    fab: Apply<KindOutput<F>, [A, B]>,
    f: (a: A) => C,
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [C, D]>;
}
```

## Example Usage

### **Kind-Polymorphic Functor**

```typescript
// This demonstrates that AnyFunctor can accept unary and binary functors
type UnaryFunctor = HigherKind<Kind1, Kind1>;
type BinaryFunctor = HigherKind<Kind2, Kind2>;

// Both work with AnyFunctor
type TestUnaryWithAnyFunctor = UnaryFunctor extends HigherKind<KindAny, KindAny> ? true : false;
type TestBinaryWithAnyFunctor = BinaryFunctor extends HigherKind<KindAny, KindAny> ? true : false;
// Both are true!
```

### **Example Higher-Order Kind Instances**

```typescript
/**
 * Array as a Higher-Order Kind
 */
interface ArrayHOK extends HigherKind<Kind1, Kind1> {
  readonly __input: Kind1;
  readonly __output: Kind1;
  readonly type: Array<this['__input']['arg0']>;
}

/**
 * Maybe as a Higher-Order Kind
 */
interface MaybeHOK extends HigherKind<Kind1, Kind1> {
  readonly __input: Kind1;
  readonly __output: Kind1;
  readonly type: this['__input']['arg0'] | null | undefined;
}

/**
 * Either as a Higher-Order Kind
 */
interface EitherHOK extends HigherKind<Kind2, Kind2> {
  readonly __input: Kind2;
  readonly __output: Kind2;
  readonly type: { left: this['__input']['arg0'] } | { right: this['__input']['arg1'] };
}

/**
 * Tuple as a Higher-Order Kind
 */
interface TupleHOK extends HigherKind<Kind2, Kind2> {
  readonly __input: Kind2;
  readonly __output: Kind2;
  readonly type: [this['__input']['arg0'], this['__input']['arg1']];
}
```

### **Enhanced Typeclass Instances**

```typescript
// Enhanced Functor with Higher-Order Kinds
interface Functor<F extends HigherKind<KindAny, KindAny>> {
  map: <A, B>(
    fa: Apply<KindOutput<F>, [A]>, 
    f: (a: A) => B
  ) => Apply<KindOutput<F>, [B]>;
}

// Enhanced Applicative with Higher-Order Kinds
interface Applicative<F extends HigherKind<Kind1, Kind1>> extends Functor<F> {
  of: <A>(a: A) => Apply<KindOutput<F>, [A]>;
  ap: <A, B>(
    fab: Apply<KindOutput<F>, [(a: A) => B]>, 
    fa: Apply<KindOutput<F>, [A]>
  ) => Apply<KindOutput<F>, [B]>;
}

// Enhanced Monad with Higher-Order Kinds
interface Monad<F extends HigherKind<Kind1, Kind1>> extends Applicative<F> {
  chain: <A, B>(
    fa: Apply<KindOutput<F>, [A]>, 
    f: (a: A) => Apply<KindOutput<F>, [B]>
  ) => Apply<KindOutput<F>, [B]>;
}

// Enhanced Bifunctor with Higher-Order Kinds
interface Bifunctor<F extends HigherKind<Kind2, Kind2>> {
  bimap: <A, B, C, D>(
    fab: Apply<KindOutput<F>, [A, B]>,
    f: (a: A) => C,
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [C, D]>;
  
  lmap: <A, B, C>(
    fab: Apply<KindOutput<F>, [A, B]>, 
    f: (a: A) => C
  ) => Apply<KindOutput<F>, [C, B]>;
  
  rmap: <A, B, D>(
    fab: Apply<KindOutput<F>, [A, B]>, 
    g: (b: B) => D
  ) => Apply<KindOutput<F>, [A, D]>;
}
```

## Future Uses

### **Polymorphic Optics**

```typescript
// Future: Polymorphic optics that work with any kind
interface PolymorphicLens<S, A> {
  get: (s: S) => A;
  set: (a: A, s: S) => S;
}

// Could be extended to work with Higher-Order Kinds
interface PolymorphicOptic<F extends HigherKind<KindAny, KindAny>> {
  view: <S, A>(optic: PolymorphicLens<S, A>, s: S) => A;
  over: <S, A>(optic: PolymorphicLens<S, A>, f: (a: A) => A, s: S) => S;
}
```

### **Generic Transformers**

```typescript
// Future: Generic monad transformers
interface MonadTransformer<F extends HigherKind<Kind1, Kind1>, G extends HigherKind<Kind1, Kind1>> {
  lift: <A>(fa: Apply<KindOutput<F>, [A]>) => Apply<KindOutput<G>, [A]>;
  hoist: <A>(fga: Apply<KindOutput<G>, [Apply<KindOutput<F>, [A]>]>) => Apply<KindOutput<F>, [Apply<KindOutput<G>, [A]>]>;
}
```

### **Higher-Order Typeclass Composition**

```typescript
// Future: Compose typeclasses at the type level
type ComposedTypeclass<F extends HigherKind<KindAny, KindAny>, G extends HigherKind<KindAny, KindAny>> = 
  ComposeHOK<F, G>;

// Example: Functor ∘ Monad = Monad (since Monad extends Functor)
type FunctorMonadComposition = ComposedTypeclass<Functor<HigherKind<Kind1, Kind1>>, Monad<HigherKind<Kind1, Kind1>>>;
```

## Benefits

### **1. Increased Polymorphism**
- Typeclasses can work with different kind arities
- Single definition works for unary and binary type constructors
- Reduces code duplication

### **2. Better Abstraction**
- Functions at the type level enable more powerful abstractions
- Composition of type-level functions
- Identity and constant type-level functions

### **3. Enhanced Type Safety**
- Type-level compatibility checking
- Input/output kind extraction
- Compile-time validation of kind relationships

### **4. Future Extensibility**
- Foundation for polymorphic optics
- Generic monad transformers
- Higher-order typeclass composition

## Type-Level Utilities Summary

| Utility | Purpose | Example |
|---------|---------|---------|
| `KindInput<F>` | Extract input kind | `KindInput<HigherKind<Kind1, Kind2>>` → `Kind1` |
| `KindOutput<F>` | Extract output kind | `KindOutput<HigherKind<Kind1, Kind2>>` → `Kind2` |
| `IsKindCompatible<F, G>` | Check kind compatibility | `IsKindCompatible<Kind1, Kind1>` → `true` |
| `IsHigherKindCompatible<F, In>` | Check HOK compatibility | `IsHigherKindCompatible<HOK1<Kind1, Kind1>, Kind1>` → `true` |
| `ComposeHOK<F, G>` | Compose two HOKs | `ComposeHOK<F, G>` where `F: A→B`, `G: B→C` |
| `IdentityHOK<In>` | Identity HOK | `IdentityHOK<Kind1>` maps `Kind1` to `Kind1` |
| `ConstHOK<In, Out>` | Constant HOK | `ConstHOK<Kind1, Kind2>` maps any input to `Kind2` |

## Summary

Higher-Order Kinds (HOKs) extend our type system to support functions at the type level, enabling:

- ✅ **Polymorphic typeclasses** that work across different kind arities
- ✅ **Type-level function composition** and utilities
- ✅ **Enhanced abstraction** capabilities
- ✅ **Future extensibility** for advanced type-level programming
- ✅ **Backward compatibility** with existing HKT system

This provides a solid foundation for more advanced type-level programming patterns while maintaining the simplicity and usability of the existing HKT system. 