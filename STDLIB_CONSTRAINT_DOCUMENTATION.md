# KindScript Standard Library Constraint Documentation

## Overview

The KindScript standard library has been updated to use real constraint checking instead of placeholder `any` fallbacks. All type constructors now enforce proper kind constraints at compile time, producing meaningful diagnostics for misuse.

## Updated Type Definitions

### Core Types

#### `Kind<TArgs>`
Represents a type constructor's shape with proper parameter kind constraints.

```typescript
declare type Kind<TArgs extends readonly Type[] = readonly Type[]> = 
    TypeConstructorType<TArgs['length'], TArgs>;
```

#### `TypeConstructorType<Arity, ParamKinds>`
Represents a type constructor with arity and parameter kind constraints.

```typescript
declare type TypeConstructorType<Arity extends number = number, ParamKinds extends readonly Type[] = readonly Type[]> = {
    readonly arity: Arity;
    readonly parameterKinds: ParamKinds;
    readonly targetType: Type;
    readonly symbol: Symbol;
};
```

#### `Apply<TC, Args>`
Applies a type constructor to type arguments with arity checking.

```typescript
type Apply<TC extends TypeConstructorType, Args extends readonly Type[]> = 
    TC extends TypeConstructorType<infer Arity, infer ParamKinds>
        ? Args extends readonly [...ParamKinds]
            ? any // Resolved by compiler to concrete type
            : never // Arity mismatch - produces compiler error
        : never; // Not a TypeConstructorType - produces compiler error
```

## Functional Programming Type Classes

### `Functor = Kind<[Type, Type]>`
Unary type constructor supporting `map` operation.

**Expected Diagnostics:**
- **Wrong arity**: `"Type constructor expects 1 argument, got 2"`
- **Wrong kind**: `"Type constructor kind mismatch: expected Kind<[Type, Type]>, got Kind<[Type, Type, Type]>"`

**Example Usage:**
```typescript
type List<T> = T[];
type Maybe<T> = T | null;

// Correct usage
function map<F extends Functor, A, B>(
    fa: Apply<F, [A]>,
    f: (a: A) => B
): Apply<F, [B]> { /* ... */ }

// Compiler error for wrong arity
type Wrong<T, U> = [T, U]; // Kind<[Type, Type, Type]> - wrong!
const error = map<Wrong, string, number>(...); // Error!
```

### `Bifunctor = Kind<[Type, Type, Type]>`
Binary type constructor supporting `bimap` operation.

**Expected Diagnostics:**
- **Wrong arity**: `"Type constructor expects 2 arguments, got 1"`
- **Wrong kind**: `"Type constructor kind mismatch: expected Kind<[Type, Type, Type]>, got Kind<[Type, Type]>"`

**Example Usage:**
```typescript
type Either<L, R> = { left?: L; right?: R };

// Correct usage
function bimap<F extends Bifunctor, A, B, C, D>(
    fab: Apply<F, [A, B]>,
    f: (a: A) => C,
    g: (b: B) => D
): Apply<F, [C, D]> { /* ... */ }

// Compiler error for wrong kind
type Wrong<T> = T[]; // Kind<[Type]> - wrong!
const error = bimap<Wrong, string, number, boolean, string>(...); // Error!
```

### `Monad = Kind<[Type, Type]>`
Unary type constructor supporting `bind` and `return` operations.

**Expected Diagnostics:**
- **Wrong arity**: `"Type constructor expects 1 argument, got 2"`
- **Wrong kind**: `"Type constructor kind mismatch: expected Kind<[Type, Type]>, got Kind<[Type, Type, Type]>"`

### `Applicative = Kind<[Type, Type]>`
Unary type constructor supporting `apply` and `pure` operations.

**Expected Diagnostics:**
- **Wrong arity**: `"Type constructor expects 1 argument, got 2"`
- **Wrong kind**: `"Type constructor kind mismatch: expected Kind<[Type, Type]>, got Kind<[Type, Type, Type]>"`

## Advanced Type Constructors

### `Free<F extends Kind<[Type, Type]>, A>`
Free monad over a functor with proper kind constraints.

**Expected Diagnostics:**
- **Wrong kind**: `"Type constructor kind mismatch: expected Kind<[Type, Type]>, got Kind<[Type, Type, Type]>"`

**Example Usage:**
```typescript
interface LogF<A> { type: 'log'; message: string; next: A; }
type LogFree<A> = Free<LogF, A>; // Correct

// Compiler error for wrong kind
interface WrongF<A, B> { type: 'wrong'; } // Kind<[Type, Type, Type]> - wrong!
type WrongFree<A> = Free<WrongF, A>; // Error!
```

### `Fix<F extends Kind<[Type, Type]>>`
Fixed point of a functor with proper kind constraints.

**Expected Diagnostics:**
- **Wrong kind**: `"Type constructor kind mismatch: expected Kind<[Type, Type]>, got Kind<[Type, Type, Type]>"`

**Example Usage:**
```typescript
interface TreeF<A> { type: 'leaf' | 'node'; value?: number; left?: A; right?: A; }
type Tree = Fix<TreeF>; // Correct

// Compiler error for wrong kind
type WrongTree = Fix<WrongF>; // Error!
```

## Apply Type Diagnostics

### Arity Mismatch
```typescript
type List<T> = T[];
type Wrong = Apply<List, [string, number]>; 
// Error: "Type constructor expects 1 arguments, got 2"
```

### Non-Constructor
```typescript
type NotConstructor = string;
type Error = Apply<NotConstructor, [number]>; 
// Error: "First argument to Apply must be a type constructor"
```

### Correct Usage
```typescript
type List<T> = T[];
type Maybe<T> = T | null;
type Either<L, R> = { left?: L; right?: R };

type ListOfString = Apply<List, [string]>; // string[]
type MaybeOfNumber = Apply<Maybe, [number]>; // number | null
type EitherOfStringNumber = Apply<Either, [string, number]>; // { left?: string; right?: number }
```

## Compiler Integration

The updated stdlib integrates with the TypeScript compiler's constraint checking system:

1. **Kind Constraint Validation**: All type constructors validate their kind constraints during type checking
2. **Arity Checking**: Apply types verify that argument counts match constructor arity
3. **Type Constructor Validation**: Apply types ensure first arguments are valid type constructors
4. **Diagnostic Generation**: Meaningful error messages guide developers to correct usage

## Migration Guide

### Before (Placeholder Fallbacks)
```typescript
type Functor = Kind<Type, Type>; // No real constraints
type Free<F extends Kind<Type, Type>, A> = any; // No validation
type Apply<TC, Args> = any; // No arity checking
```

### After (Real Constraints)
```typescript
type Functor = Kind<[Type, Type]>; // Enforces unary constraint
type Free<F extends Kind<[Type, Type]>, A> = /* real implementation */; // Validates kind
type Apply<TC extends TypeConstructorType, Args extends readonly Type[]> = /* real implementation */; // Checks arity
```

## Benefits

1. **Type Safety**: Compile-time validation prevents runtime errors
2. **Developer Experience**: Clear error messages guide correct usage
3. **Documentation**: Type definitions serve as living documentation
4. **Refactoring Safety**: Compiler catches breaking changes automatically
5. **IDE Support**: Better IntelliSense and error highlighting

## Future Enhancements

- **Higher-Order Kind Support**: Flexible arity for advanced patterns
- **Kind Inference**: Automatic kind detection for type constructors
- **Kind Variance**: Covariant, contravariant, and invariant kind parameters
- **Kind Composition**: Higher-order kind constructors and transformers 