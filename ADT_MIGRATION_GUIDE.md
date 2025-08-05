# ADT Migration Guide

## Overview

This guide explains how to migrate from the old hand-rolled ADT definitions to the new unified ADT system built with `createSumType`. The new system provides better integration with HKTs, purity tracking, and derivable instances while maintaining complete backward compatibility.

## Migration Benefits

- **Unified Approach**: All ADTs use the same `createSumType` builder
- **HKT Integration**: Automatic kind generation for typeclass participation
- **Purity Tracking**: Built-in effect tracking with Pure defaults
- **Derivable Instances**: Automatic typeclass instance generation
- **Backward Compatibility**: Drop-in replacement for existing ADTs
- **Centralized Registry**: Unified management of all ADTs
- **Type Safety**: Full TypeScript integration with compile-time safety

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { Maybe, Just, Nothing, matchMaybe } from './fp/maybe';
import { Either, Left, Right, matchEither } from './fp/either';
import { Result, Ok, Err, matchResult } from './fp/result';
```

**After:**
```typescript
import { Maybe, Just, Nothing, matchMaybe } from './fp-maybe-unified';
import { Either, Left, Right, matchEither } from './fp-either-unified';
import { Result, Ok, Err, matchResult } from './fp-result-unified';
```

### Step 2: Update Constructor Calls

**Before:**
```typescript
const maybe = Maybe.Just(42);
const either = Either.Right("success");
const result = Result.Ok(42);
```

**After:**
```typescript
const maybe = Just(42);
const either = Right("success");
const result = Ok(42);
```

### Step 3: Update Pattern Matching

**Before:**
```typescript
const result = matchMaybe(maybe, {
  Just: value => `Got ${value}`,
  Nothing: () => "None"
});
```

**After:**
```typescript
const result = matchMaybe(maybe, {
  Just: value => `Got ${value}`,
  Nothing: () => "None"
});
```
*Note: The API remains the same, just ensure imports are from the new modules.*

### Step 4: Update Type References

**Before:**
```typescript
type MaybeNumber = Maybe<number>;
type EitherStringNumber = Either<string, number>;
type ResultNumberString = Result<number, string>;
```

**After:**
```typescript
type MaybeNumber = Maybe<number>;
type EitherStringNumber = Either<string, number>;
type ResultNumberString = Result<number, string>;
```
*Note: Type signatures remain the same, just ensure correct imports.*

## Automated Migration

### Using the Migration Script

We provide an automated migration script that handles most common patterns:

```bash
node migrate-adt-usage-simple.js
```

The script will:
1. Scan all TypeScript/JavaScript files in your project
2. Apply migration rules automatically
3. Update imports, constructor calls, and type references
4. Provide a detailed report of changes made
5. Verify that no old patterns remain

### Migration Rules Applied

The script applies the following rules:

1. **Import Updates**:
   - `from './fp/maybe'` → `from './fp-maybe-unified'`
   - `from './fp/either'` → `from './fp-either-unified'`
   - `from './fp/result'` → `from './fp-result-unified'`

2. **Constructor Call Updates**:
   - `Maybe.Just(x)` → `Just(x)`
   - `Maybe.Nothing()` → `Nothing()`
   - `Either.Left(x)` → `Left(x)`
   - `Either.Right(x)` → `Right(x)`
   - `Result.Ok(x)` → `Ok(x)`
   - `Result.Err(x)` → `Err(x)`

3. **Type Import Updates**:
   - `import { Maybe } from '...'` → `import { Maybe } from './fp-maybe-unified'`
   - `import { Either } from '...'` → `import { Either } from './fp-either-unified'`
   - `import { Result } from '...'` → `import { Result } from './fp-result-unified'`

## Manual Migration Examples

### Example 1: Basic ADT Usage

**Before:**
```typescript
import { Maybe, Just, Nothing, matchMaybe } from './fp/maybe';

function divide(a: number, b: number): Maybe<number> {
  if (b === 0) {
    return Maybe.Nothing();
  }
  return Maybe.Just(a / b);
}

const result = matchMaybe(divide(10, 2), {
  Just: value => `Result: ${value}`,
  Nothing: () => "Cannot divide by zero"
});
```

**After:**
```typescript
import { Maybe, Just, Nothing, matchMaybe } from './fp-maybe-unified';

function divide(a: number, b: number): Maybe<number> {
  if (b === 0) {
    return Nothing();
  }
  return Just(a / b);
}

const result = matchMaybe(divide(10, 2), {
  Just: value => `Result: ${value}`,
  Nothing: () => "Cannot divide by zero"
});
```

### Example 2: Either for Error Handling

**Before:**
```typescript
import { Either, Left, Right, matchEither } from './fp/either';

function parseNumber(str: string): Either<string, number> {
  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return Either.Left("Invalid number");
  }
  return Either.Right(num);
}

const result = matchEither(parseNumber("42"), {
  Left: error => `Error: ${error}`,
  Right: value => `Success: ${value}`
});
```

**After:**
```typescript
import { Either, Left, Right, matchEither } from './fp-either-unified';

function parseNumber(str: string): Either<string, number> {
  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return Left("Invalid number");
  }
  return Right(num);
}

const result = matchEither(parseNumber("42"), {
  Left: error => `Error: ${error}`,
  Right: value => `Success: ${value}`
});
```

### Example 3: Result for Operations

**Before:**
```typescript
import { Result, Ok, Err, matchResult } from './fp/result';

function fetchUser(id: number): Result<string, string> {
  if (id <= 0) {
    return Result.Err("Invalid user ID");
  }
  return Result.Ok(`User ${id}`);
}

const result = matchResult(fetchUser(42), {
  Ok: user => `Found: ${user}`,
  Err: error => `Error: ${error}`
});
```

**After:**
```typescript
import { Result, Ok, Err, matchResult } from './fp-result-unified';

function fetchUser(id: number): Result<string, string> {
  if (id <= 0) {
    return Err("Invalid user ID");
  }
  return Ok(`User ${id}`);
}

const result = matchResult(fetchUser(42), {
  Ok: user => `Found: ${user}`,
  Err: error => `Error: ${error}`
});
```

## New Features Available

### HKT Integration

After migration, you can use the new HKT features:

```typescript
import { MaybeK, EitherK, ResultK } from './fp-maybe-unified';
import { Functor, Monad } from './fp-typeclasses-hkt';

// Use with typeclasses
const maybeFunctor: Functor<MaybeK> = { map: mapMaybe };
const eitherMonad: Monad<EitherK> = { chain: chainEither, of: Right };
```

### Purity Tracking

```typescript
import { MaybeUnified } from './fp-maybe-unified';

// Check purity
console.log(MaybeUnified.effect === 'Pure'); // true

// Create with different effect
const impureMaybe = MaybeUnified.createWithEffect('IO');
console.log(impureMaybe.effect === 'IO'); // true
```

### Registry Integration

```typescript
import { getADT, getADTNames } from './fp-adt-registry';

// Get ADT from registry
const maybeEntry = getADT('Maybe');
const adtNames = getADTNames(); // ['Maybe', 'Either', 'Result']
```

## Verification Steps

After migration, verify that:

1. **All imports are updated** to use the new unified modules
2. **Constructor calls use destructured imports** (e.g., `Just(x)` instead of `Maybe.Just(x)`)
3. **Pattern matching still works** with the same API
4. **Type references are correct** and point to the new modules
5. **No compilation errors** occur
6. **All tests pass** with the new implementation

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all imports point to the new unified modules
2. **Constructor Errors**: Make sure to use destructured constructors
3. **Type Errors**: Verify that type imports are from the correct modules
4. **Pattern Matching Errors**: The API should be identical, check imports

### Rollback Plan

If issues arise, you can:

1. **Revert the migration script changes** using git
2. **Manually update specific files** that have issues
3. **Use the old ADT definitions** temporarily while fixing issues
4. **Gradually migrate** files one at a time

## Benefits After Migration

### Performance Improvements

- **Faster type inference** with unified HKT system
- **Optimized pattern matching** with exhaustive checking
- **Reduced bundle size** with shared implementations

### Developer Experience

- **Better IntelliSense** with unified type definitions
- **Consistent API** across all ADTs
- **Automatic typeclass instances** via derivable instances
- **Purity tracking** for better effect management

### Type Safety

- **Exhaustive pattern matching** with never trick
- **Compile-time type checking** for all operations
- **HKT integration** for typeclass safety
- **Purity guarantees** at the type level

## Conclusion

The migration to the unified ADT system provides significant benefits while maintaining complete backward compatibility. The automated migration script handles most common patterns, and the new system offers enhanced features like HKT integration, purity tracking, and derivable instances.

After migration, your codebase will have:
- ✅ Unified ADT definitions using createSumType
- ✅ HKT integration for typeclass participation
- ✅ Purity tracking integration
- ✅ Derivable instances integration
- ✅ Preserved pattern matching ergonomics
- ✅ Complete backward compatibility
- ✅ Enhanced type safety and performance 