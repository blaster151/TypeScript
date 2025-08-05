# Extended Bifunctor Monad Combinators

## Overview

This module provides richer combinators for Bifunctor Monads (e.g., Either, TaskEither, AsyncEither, etc.) that extend the basic chain/map functionality with more sophisticated error handling and pattern matching capabilities.

## Key Features

- **bichain**: Chain on both left and right sides of a bifunctor monad
- **chainLeft**: Chain only on the left side, leaving right untouched
- **matchM**: Asynchronously match both sides, returning a unified result
- **TaskEither**: Full async Either implementation with bifunctor monad support
- **Purity Integration**: Full integration with the existing purity tracking system

## Core Combinators

### bichain

Chains computations on both the left and right sides of a bifunctor monad, preserving the monadic structure while providing fine-grained control over error recovery.

```typescript
function bichain<F extends Kind<[any, any]>, L, R, L2, R2>(
  M: Monad<F> & Bifunctor<F>,
  onLeft: (l: L) => Apply<F, [L2, R2]>,
  onRight: (r: R) => Apply<F, [L2, R2]>
): (ma: Apply<F, [L, R]>) => Apply<F, [L2, R2]>;
```

**Example Usage:**
```typescript
// Basic usage with Either
const result = bichain(
  EitherMonad,
  (error: string) => Right(`Recovered from: ${error}`),
  (value: number) => Right(value * 2)
)(Left("Something went wrong"));
// Result: Right("Recovered from: Something went wrong")

// Advanced error recovery
const fetchUser = (id: string): TaskEither<Error, User> => 
  bichain(
    TaskEitherMonad,
    (error: Error) => {
      if (error.message.includes('404')) {
        return TaskEither.of(createDefaultUser(id));
      }
      return TaskEither.left(new Error(`Recovery failed: ${error.message}`));
    },
    (user: User) => TaskEither.of(validateUser(user))
  );
```

### chainLeft

Chains only on the left side, leaving the right side untouched. Useful for error recovery scenarios where you want to transform errors but leave successful computations unchanged.

```typescript
function chainLeft<F extends Kind<[any, any]>, L, R, L2>(
  M: Monad<F> & Bifunctor<F>,
  f: (l: L) => Apply<F, [L2, R]>
): (ma: Apply<F, [L, R]>) => Apply<F, [L2, R]>;
```

**Example Usage:**
```typescript
// Error recovery that preserves success cases
const withRetry = chainLeft(
  TaskEitherMonad,
  (error: Error) => {
    if (error.message.includes('timeout')) {
      return retryOperation();
    }
    return TaskEither.left(error);
  }
);

const result = withRetry(fetchData());
// If fetchData succeeds, result is unchanged
// If fetchData fails with timeout, retryOperation is called
```

### matchM

Asynchronously matches both sides, returning a unified result. Works with both sync and async branches.

```typescript
function matchM<F extends Kind<[any, any]>, L, R, A>(
  M: Monad<F> & Bifunctor<F>,
  onLeft: (l: L) => A | Promise<A>,
  onRight: (r: R) => A | Promise<A>
): (ma: Apply<F, [L, R]>) => Promise<A>;
```

**Example Usage:**
```typescript
// HTTP fetch with error handling
const handleResponse = matchM(
  TaskEitherMonad,
  async (error: Error) => {
    console.error('Request failed:', error);
    return await logError(error);
  },
  async (data: UserData) => {
    console.log('Request succeeded:', data);
    return await processUserData(data);
  }
);

const result = await handleResponse(fetchUserData());
```

## Implemented Types

### Either

Full bifunctor monad implementation with specialized combinators:

```typescript
// Either-specific combinators
bichainEither<L, R, L2, R2>(
  onLeft: (l: L) => Either<L2, R2>,
  onRight: (r: R) => Either<L2, R2>
): (ma: Either<L, R>) => Either<L2, R2>

chainLeftEither<L, R, L2>(
  f: (l: L) => Either<L2, R>
): (ma: Either<L, R>) => Either<L2, R>

matchMEither<L, R, A>(
  onLeft: (l: L) => A | Promise<A>,
  onRight: (r: R) => A | Promise<A>
): (ma: Either<L, R>) => Promise<A>
```

### Result

Result-specific bifunctor monad implementation:

```typescript
// Result-specific combinators
bichainResult<T, E, T2, E2>(
  onOk: (t: T) => Result<T2, E2>,
  onErr: (e: E) => Result<T2, E2>
): (ma: Result<T, E>) => Result<T2, E2>

chainErrResult<T, E, E2>(
  f: (e: E) => Result<T, E2>
): (ma: Result<T, E>) => Result<T, E2>

matchMResult<T, E, A>(
  onOk: (t: T) => A | Promise<A>,
  onErr: (e: E) => A | Promise<A>
): (ma: Result<T, E>) => Promise<A>
```

### TaskEither

Full async Either implementation with bifunctor monad support:

```typescript
// TaskEither type and constructors
type TaskEither<L, R> = () => Promise<Either<L, R>>;

const TaskEitherLeft = <L, R>(l: L): TaskEither<L, R> => 
  async () => Left(l);

const TaskEitherRight = <L, R>(r: R): TaskEither<L, R> => 
  async () => Right(r);

// TaskEither-specific combinators
bichainTaskEither<L, R, L2, R2>(
  onLeft: (l: L) => TaskEither<L2, R2>,
  onRight: (r: R) => TaskEither<L2, R2>
): (ma: TaskEither<L, R>) => TaskEither<L2, R2>

chainLeftTaskEither<L, R, L2>(
  f: (l: L) => TaskEither<L2, R>
): (ma: TaskEither<L, R>) => TaskEither<L2, R>

matchMTaskEither<L, R, A>(
  onLeft: (l: L) => A | Promise<A>,
  onRight: (r: R) => A | Promise<A>
): (ma: TaskEither<L, R>) => Promise<A>
```

## Utility Functions

### Conversion Functions

```typescript
// Convert between types
eitherToTaskEither<L, R>(either: Either<L, R>): TaskEither<L, R>
taskEitherToPromise<L, R>(taskEither: TaskEither<L, R>): Promise<Either<L, R>>
promiseToTaskEither<L, R>(
  promise: Promise<R>,
  errorHandler: (error: any) => L
): TaskEither<L, R>
```

### Purity Integration

```typescript
// Purity tracking for TaskEither
createTaskEitherWithPurity<L, R, P extends EffectTag = 'Async'>(
  taskEither: TaskEither<L, R>,
  effect: P = 'Async' as P
): TaskEither<L, R> & { readonly effect: P }

type EffectOfTaskEither<T> = T extends TaskEither<any, any> & { readonly effect: infer P } 
  ? P 
  : 'Async'

type IsTaskEitherPure<T> = EffectOfTaskEither<T> extends 'Pure' ? true : false
```

## Realistic Examples

### HTTP API with Error Recovery

```typescript
// Mock HTTP response types
interface User {
  id: string;
  name: string;
  email: string;
}

interface ApiError {
  code: number;
  message: string;
}

// HTTP fetch with automatic retry
const fetchUserWithRetry = (id: string): TaskEither<ApiError, User> => {
  const fetchUser = (id: string): TaskEither<ApiError, User> => {
    return async () => {
      try {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
          return Left({ code: response.status, message: response.statusText });
        }
        const user = await response.json();
        return Right(user);
      } catch (error) {
        return Left({ code: 500, message: error.message });
      }
    };
  };

  return chainLeftTaskEither(
    (error: ApiError) => {
      if (error.code === 500 && error.message.includes('timeout')) {
        // Retry with exponential backoff
        return fetchUserWithRetry(id);
      }
      return TaskEitherLeft(error);
    }
  )(fetchUser(id));
};

// Process user data with validation
const processUserData = bichainTaskEither(
  (error: ApiError) => {
    if (error.code === 404) {
      return TaskEitherRight({ id: 'default', name: 'Default User', email: 'default@example.com' });
    }
    return TaskEitherLeft(error);
  },
  (user: User) => {
    if (!user.email.includes('@')) {
      return TaskEitherLeft({ code: 400, message: 'Invalid email format' });
    }
    return TaskEitherRight({ ...user, validated: true });
  }
);

// Complete workflow
const workflow = async (userId: string) => {
  const result = await matchMTaskEither(
    async (error: ApiError) => {
      console.error('User processing failed:', error);
      return { status: 'error', error };
    },
    async (user: User) => {
      console.log('User processed successfully:', user);
      return { status: 'success', user };
    }
  )(processUserData(fetchUserWithRetry(userId)));

  return result;
};
```

### Database Operations with Transaction Rollback

```typescript
// Database operation types
interface DatabaseError {
  type: 'connection' | 'constraint' | 'timeout';
  message: string;
}

interface Transaction<T> {
  commit(): Promise<T>;
  rollback(): Promise<void>;
}

// Database operations with automatic rollback
const withTransaction = <T>(
  operation: (tx: Transaction<T>) => TaskEither<DatabaseError, T>
): TaskEither<DatabaseError, T> => {
  return async () => {
    const tx = await beginTransaction();
    try {
      const result = await operation(tx)();
      if (result.tag === 'Left') {
        await tx.rollback();
        return result;
      }
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      return Left({ type: 'connection', message: error.message });
    }
  };
};

// Complex database operation
const createUserWithProfile = (userData: any, profileData: any): TaskEither<DatabaseError, User> => {
  return withTransaction((tx) => 
    bichainTaskEither(
      (error: DatabaseError) => {
        if (error.type === 'constraint') {
          // Try with different data
          return createUserWithProfile({ ...userData, email: `${userData.email}.backup` }, profileData);
        }
        return TaskEitherLeft(error);
      },
      (user: User) => {
        // Create profile for the user
        return createProfile(tx, user.id, profileData);
      }
    )(createUser(tx, userData))
  );
};
```

## Integration with Existing FP System

### Typeclass Integration

The extended combinators integrate seamlessly with the existing typeclass system:

```typescript
import {
  BifunctorMonad,
  bichain,
  chainLeft,
  matchM,
  EitherBifunctorMonad,
  TaskEitherBifunctorMonad
} from './fp-typeclasses';

// Use with any bifunctor monad
const result = bichain(
  EitherBifunctorMonad,
  (error) => Right(`Recovered: ${error}`),
  (value) => Right(value * 2)
)(someEither);
```

### Purity Tracking Integration

Full integration with the purity tracking system:

```typescript
import {
  createTaskEitherWithPurity,
  EffectOfTaskEither,
  IsTaskEitherPure
} from './fp-bimonad-extended';

// Create pure TaskEither
const pureTask = createTaskEitherWithPurity(
  TaskEitherRight(42),
  'Pure'
);

// Type-level purity checking
type Effect = EffectOfTaskEither<typeof pureTask>; // 'Pure'
type IsPure = IsTaskEitherPure<typeof pureTask>; // true
```

### Pattern Matching Integration

Works with the existing pattern matching system:

```typescript
import { matchEither } from './fp-either-unified';
import { matchMEither } from './fp-bimonad-extended';

// Sync pattern matching
const syncResult = matchEither(either, {
  Left: (error) => `Error: ${error}`,
  Right: (value) => `Success: ${value}`
});

// Async pattern matching
const asyncResult = await matchMEither(
  taskEither,
  async (error) => await logError(error),
  async (value) => await processValue(value)
);
```

## Design Principles

### 1. Backward Compatibility

The extended combinators are designed to be completely backward compatible. Existing code using `chain` and `map` continues to work unchanged:

```typescript
// Existing code continues to work
const result = chain(EitherMonad, either, (value) => Right(value * 2));

// New combinators provide additional functionality
const extendedResult = bichain(
  EitherMonad,
  (error) => Right(`Recovered: ${error}`),
  (value) => Right(value * 2)
)(either);
```

### 2. Type Safety

Full type safety with TypeScript's type system:

```typescript
// Type-safe error handling
const result = chainLeft(
  TaskEitherMonad,
  (error: ApiError) => {
    // TypeScript knows error is ApiError
    if (error.code === 404) {
      return TaskEitherRight(defaultUser);
    }
    return TaskEitherLeft(error);
  }
)(fetchUserTask);
```

### 3. Composition

Combinators compose naturally with existing FP patterns:

```typescript
// Compose with existing combinators
const workflow = compose(
  bichain(EitherMonad, handleError, processSuccess),
  map(EitherMonad, (value) => value * 2),
  chain(EitherMonad, (value) => Right(value + 1))
);
```

### 4. Performance

Efficient implementations that avoid unnecessary allocations:

```typescript
// Efficient error recovery
const withRetry = chainLeft(
  TaskEitherMonad,
  (error) => {
    // Only retry on specific errors
    if (isRetryableError(error)) {
      return retryOperation();
    }
    return TaskEitherLeft(error);
  }
);
```

## Testing

Comprehensive test suite covering:

- Basic functionality of all combinators
- Type safety and type inference
- Integration with existing typeclasses
- Realistic use cases (HTTP APIs, database operations)
- Async pattern matching
- Error recovery scenarios

Run tests with:
```bash
node run-bimonad-tests.js
```

## Future Enhancements

### 1. Syntax Sugar

Future TypeScript transforms could provide cleaner syntax:

```typescript
// Future syntax (conceptual)
const result = either
  .bichain(
    error => Right(`Recovered: ${error}`),
    value => Right(value * 2)
  );
```

### 2. Additional Combinators

Potential future additions:

- `chainRight`: Chain only on the right side
- `bimapM`: Monadic version of bimap
- `traverseBifunctor`: Traverse both sides with an applicative

### 3. Integration with Other Typeclasses

- `Bifoldable`: Fold both sides of a bifunctor
- `Bitraversable`: Traverse both sides with an applicative
- `Bimonad`: Monad with additional bifunctor operations

## Conclusion

The extended bifunctor monad combinators provide powerful tools for error handling and pattern matching while maintaining full compatibility with the existing FP system. They enable more sophisticated error recovery strategies and make async operations more ergonomic to work with.

The design emphasizes:
- **Backward compatibility** with existing code
- **Type safety** through TypeScript's type system
- **Composability** with existing FP patterns
- **Performance** through efficient implementations
- **Integration** with the purity tracking system

These combinators prepare the codebase for future syntax sugar and custom TypeScript transforms that will make these patterns even more ergonomic to use. 