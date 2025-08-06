# Advanced Features Test Suite

This document describes the comprehensive test suite for advanced functional programming features including Optional optic composition, immutability helpers, async bimonad operations, and higher-order kind usage.

## Overview

The test suite validates four key areas of advanced FP functionality:

1. **Optional Optic Composition** - Cross-kind optic composition with type narrowing
2. **Immutability Helpers** - Deep freeze, clone, and update utilities
3. **Async Bimonad Operations** - TaskEither bichain and matchM operations
4. **Higher-Order Kind Usage** - ObservableLite<Either<L, R>> composition

## Test 1: Optional Optic Composition

### Lens→Optional Composition

Tests composition between Lens and Optional optics, ensuring proper type narrowing and runtime behavior.

```typescript
// Define nested structure
type User = {
  profile: {
    contact?: {
      email?: string;
    };
  };
};

// Create lens and optional
const profileLens = lens<User, User, User['profile'], User['profile']>(
  u => u.profile,
  (p, u) => ({ ...u, profile: p })
);

const emailOptional = optional<User['profile'], User['profile'], string, string>(
  p => p.contact?.email ? { tag: 'Just', value: p.contact.email } : { tag: 'Nothing' },
  (email, p) => ({ ...p, contact: { ...p.contact, email } })
);

// Compose: Lens→Optional = Optional
const emailFromUserOptional = profileLens.then(emailOptional);
```

**Test Cases:**
- ✅ Found email when present
- ✅ Correctly handles missing email
- ✅ Type narrowing works correctly

### Prism→Optional Composition

Tests composition between Prism and Optional optics for sum types with optional fields.

```typescript
type Response = 
  | { tag: 'Success'; data?: { value: number } }
  | { tag: 'Error'; message: string };

const successPrism = prism<Response, Response, Response & { tag: 'Success' }, Response & { tag: 'Success' }>(
  r => r.tag === 'Success' ? { tag: 'Just', value: r as any } : { tag: 'Nothing' },
  s => s
);

const valueOptional = optional<Response & { tag: 'Success' }, Response & { tag: 'Success' }, number, number>(
  s => s.data?.value !== undefined ? { tag: 'Just', value: s.data.value } : { tag: 'Nothing' },
  (value, s) => ({ ...s, data: { ...s.data, value } })
);

const valueFromResponseOptional = successPrism.then(valueOptional);
```

**Test Cases:**
- ✅ Found value when present
- ✅ Correctly handles missing data
- ✅ Correctly handles error response

### Optional→Optional Composition

Tests composition between two Optional optics for deeply nested optional structures.

```typescript
type Config = {
  settings?: {
    theme?: {
      colors?: {
        primary?: string;
      };
    };
  };
};

const settingsOptional = optional<Config, Config, Config['settings'], Config['settings']>(
  c => c.settings ? { tag: 'Just', value: c.settings } : { tag: 'Nothing' },
  (settings, c) => ({ ...c, settings })
);

const primaryColorOptional = optional<Config['settings'], Config['settings'], string, string>(
  s => s?.theme?.colors?.primary ? { tag: 'Just', value: s.theme.colors.primary } : { tag: 'Nothing' },
  (primary, s) => ({ ...s, theme: { ...s?.theme, colors: { ...s?.theme?.colors, primary } } })
);

const primaryFromConfigOptional = settingsOptional.then(primaryColorOptional);
```

**Test Cases:**
- ✅ Found primary color when present
- ✅ Correctly handles missing theme

## Test 2: Immutability Helpers

### freezeDeep

Deep freeze utility that recursively freezes objects and arrays.

```typescript
function freezeDeep<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj as Readonly<T>;
  }
  
  if (Array.isArray(obj)) {
    return Object.freeze(obj.map(freezeDeep)) as Readonly<T>;
  }
  
  const frozen = {} as any;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      frozen[key] = freezeDeep(obj[key]);
    }
  }
  
  return Object.freeze(frozen) as Readonly<T>;
}
```

**Test Cases:**
- ✅ Prevents top-level mutation (in strict mode)
- ✅ Prevents nested mutation (in strict mode)
- ✅ Prevents array mutation (in strict mode)
- ✅ Type-level readonly preservation

### cloneImmutable

Deep clone utility that creates independent copies of objects and arrays.

```typescript
function cloneImmutable<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cloneImmutable) as T;
  }
  
  const cloned = {} as any;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = cloneImmutable(obj[key]);
    }
  }
  
  return cloned as T;
}
```

**Test Cases:**
- ✅ Clone is independent of original
- ✅ Nested objects are independent
- ✅ Arrays are independent
- ✅ Original remains unchanged after clone modification

### updateImmutable

Immutable update utility that preserves immutability during updates.

```typescript
function updateImmutable<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K]
): T {
  return { ...obj, [key]: value };
}
```

**Test Cases:**
- ✅ Simple update preserves immutability
- ✅ Nested update preserves immutability
- ✅ Original object remains unchanged
- ✅ Type safety is maintained

## Test 3: Async Bimonad Operations (TaskEither)

### bichain

Tests the bichain operation for TaskEither, which chains computations on both left and right sides.

```typescript
const fetchUser = (id: string): TaskEither<Error, { id: string; name: string }> => {
  return async () => {
    if (id === '1') {
      return Right({ id: '1', name: 'Alice' });
    } else if (id === '2') {
      return Left(new Error('User not found'));
    } else {
      return Left(new Error('Invalid ID'));
    }
  };
};

const validateUser = (user: { id: string; name: string }): TaskEither<Error, { id: string; name: string; validated: boolean }> => {
  return async () => {
    if (user.name.length > 0) {
      return Right({ ...user, validated: true });
    } else {
      return Left(new Error('Invalid user name'));
    }
  };
};

const createDefaultUser = (id: string): TaskEither<Error, { id: string; name: string; validated: boolean }> => {
  return async () => Right({ id, name: 'Default User', validated: true });
};

const successChain = bichainTaskEither(
  (error: Error) => createDefaultUser('1'),
  (user: { id: string; name: string }) => validateUser(user)
);
```

**Test Cases:**
- ✅ Success path works correctly
- ✅ Error recovery path works correctly
- ✅ Async operations complete properly
- ✅ Type safety is maintained

### matchM

Tests the matchM operation for TaskEither, which asynchronously matches both sides.

```typescript
const fetchData = (id: string): TaskEither<Error, { id: string; data: string }> => {
  return async () => {
    if (id === '1') {
      return Right({ id: '1', data: 'Success data' });
    } else {
      return Left(new Error('Data not found'));
    }
  };
};

const processSuccess = async (data: { id: string; data: string }): Promise<string> => {
  return `Processed: ${data.data}`;
};

const processError = async (error: Error): Promise<string> => {
  return `Error handled: ${error.message}`;
};

const successMatch = matchMTaskEither(processError, processSuccess);
```

**Test Cases:**
- ✅ Success branch works correctly
- ✅ Error branch works correctly
- ✅ Async processing completes properly
- ✅ Branch selection is correct

## Test 4: Higher-Order Kind Usage

### ObservableLite<Either<L, R>>

Tests higher-order kind usage with ObservableLite containing Either values.

```typescript
// Create ObservableLite<Either<string, number>>
const observableEither = ObservableLite.fromArray([
  Right(42),
  Left('Error 1'),
  Right(100),
  Left('Error 2'),
  Right(7)
]);

// Test map over inner Either values
const mappedObservable = observableEither.map(either => 
  matchEither(either, {
    Left: (error) => `Error: ${error}`,
    Right: (value) => `Success: ${value * 2}`
  })
);

// Test filter to get only successful values
const successOnly = observableEither.map(either => 
  matchEither(either, {
    Left: () => null,
    Right: (value) => value
  })
).filter((value): value is number => value !== null);

// Test chain to flatten nested Eithers
const flattened = observableEither.chain(either =>
  matchEither(either, {
    Left: (error) => ObservableLite.of(Left(error)),
    Right: (value) => ObservableLite.of(Right(value * 2))
  })
);
```

**Test Cases:**
- ✅ Map over inner Either values works correctly
- ✅ Filter to get only successful values works correctly
- ✅ Chain to flatten nested Eithers works correctly
- ✅ Type inference is correct for higher-order kinds

## Type-Level Verification

The test suite includes compile-time verification to ensure:

- **Type Narrowing**: Composed optics have correct return types
- **Immutability**: `readonly` types are preserved
- **HKT Integration**: Higher-order kinds work correctly
- **Effect Tracking**: Async effects are properly tracked

## Runtime Behavior Verification

The test suite validates:

- **Correct Branch Selection**: Async operations follow the correct execution path
- **Immutability Preservation**: Objects remain unchanged after operations
- **Error Handling**: Error cases are handled correctly
- **Composition Laws**: Optic composition follows mathematical laws

## Usage Examples

### Real-World Optional Composition

```typescript
// Extract user email from API response
const userEmailOptional = userResponsePrism.then(userLens).then(emailOptional);

const email = userEmailOptional.getOption(apiResponse);
if (email.tag === 'Just') {
  console.log('User email:', email.value);
}
```

### Real-World Immutability

```typescript
// Deep freeze configuration
const config = freezeDeep({
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 5000
  }
});

// Immutable update
const updatedConfig = updateImmutable(config, 'api', {
  ...config.api,
  timeout: 10000
});
```

### Real-World Async Bimonad

```typescript
// HTTP request with error recovery
const fetchUserWithRetry = bichainTaskEither(
  (error: Error) => {
    if (error.message.includes('timeout')) {
      return retryOperation();
    }
    return TaskEither.Left(error);
  },
  (user: User) => validateUser(user)
);

const result = await fetchUserWithRetry(fetchUser(id))();
```

### Real-World Higher-Order Kind

```typescript
// Stream of API responses
const apiResponses = ObservableLite.fromArray([
  Right({ id: 1, data: 'success' }),
  Left(new Error('Network error')),
  Right({ id: 2, data: 'success' })
]);

// Process only successful responses
const successfulData = apiResponses
  .map(either => matchEither(either, {
    Left: () => null,
    Right: (data) => data
  }))
  .filter((data): data is ApiData => data !== null);
```

## Conclusion

The advanced features test suite provides comprehensive coverage of:

1. **Optional optic composition** with proper type narrowing and runtime behavior
2. **Immutability helpers** that preserve data integrity
3. **Async bimonad operations** for robust error handling
4. **Higher-order kind usage** for complex type compositions

All tests pass successfully, demonstrating that the FP library provides robust, type-safe, and mathematically sound abstractions for advanced functional programming patterns. 