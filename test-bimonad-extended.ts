/**
 * Tests for Extended Bifunctor Monad Combinators
 * 
 * This test file validates the functionality of the new bifunctor monad combinators:
 * - bichain: Chain on both left and right sides
 * - chainLeft: Chain only on the left side
 * - matchM: Asynchronous pattern matching
 */

import {
  // Generic combinators
  bichain, chainLeft, matchM,
  BifunctorMonad, ApplyBifunctorMonad,
  
  // Either-specific combinators
  EitherBifunctorMonad,
  bichainEither, chainLeftEither, matchMEither,
  
  // Result-specific combinators
  ResultBifunctorMonad,
  bichainResult, chainErrResult, matchMResult,
  
  // TaskEither implementation
  TaskEither, TaskEitherLeft, TaskEitherRight, TaskEitherBifunctorMonad,
  bichainTaskEither, chainLeftTaskEither, matchMTaskEither,
  eitherToTaskEither, taskEitherToPromise, promiseToTaskEither,
  createTaskEitherWithPurity, EffectOfTaskEither, IsTaskEitherPure
} from './fp-bimonad-extended';

import { Either, Left, Right, matchEither } from './fp-either-unified';
import { Result, Ok, Err, matchResult } from './fp-result-unified';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Simple assertion function for testing
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Async assertion function for testing
 */
async function assertEqualAsync<T>(actual: Promise<T>, expected: T, message: string): Promise<void> {
  const result = await actual;
  assertEqual(result, expected, message);
}

// ============================================================================
// Test Data and Mock Functions
// ============================================================================

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

// Mock HTTP functions
const mockFetchUser = (id: string): Promise<User> => {
  if (id === 'valid-id') {
    return Promise.resolve({ id, name: 'John Doe', email: 'john@example.com' });
  } else if (id === 'timeout') {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 100)
    );
  } else {
    return Promise.reject(new Error('User not found'));
  }
};

const mockFetchUserWithRetry = (id: string): Promise<User> => {
  if (id === 'retry-success') {
    return Promise.resolve({ id, name: 'Jane Doe', email: 'jane@example.com' });
  } else {
    return Promise.reject(new Error('All retries failed'));
  }
};

// ============================================================================
// Test Suite 1: Generic Combinators
// ============================================================================

export function testGenericCombinators(): void {
  console.log('🧪 Testing Generic Combinators...');
  
  // Test bichain with Either
  const testBichain = () => {
    const either = Left('error');
    const onLeft = (error: string) => Right(`Recovered: ${error}`);
    const onRight = (value: number) => Right(value * 2);
    
    const result = bichain(EitherBifunctorMonad, onLeft, onRight)(either);
    assertEqual(result, Right('Recovered: error'), 'bichain should handle left side');
    
    const successEither = Right(5);
    const successResult = bichain(EitherBifunctorMonad, onLeft, onRight)(successEither);
    assertEqual(successResult, Right(10), 'bichain should handle right side');
  };
  
  // Test chainLeft with Either
  const testChainLeft = () => {
    const either = Left('timeout error');
    const errorHandler = (error: string) => 
      error.includes('timeout') ? Right('retry successful') : Left(error);
    
    const result = chainLeft(EitherBifunctorMonad, errorHandler)(either);
    assertEqual(result, Right('retry successful'), 'chainLeft should handle timeout');
    
    const successEither = Right(42);
    const successResult = chainLeft(EitherBifunctorMonad, errorHandler)(successEither);
    assertEqual(successResult, Right(42), 'chainLeft should preserve success');
  };
  
  testBichain();
  testChainLeft();
  console.log('✅ Generic Combinators tests passed');
}

// ============================================================================
// Test Suite 2: Either-Specific Combinators
// ============================================================================

export function testEitherCombinators(): void {
  console.log('🧪 Testing Either-Specific Combinators...');
  
  // Test bichainEither
  const testBichainEither = () => {
    const errorEither = Left('network error');
    const result = bichainEither(
      (error: string) => Right(`Recovered from ${error}`),
      (value: number) => Right(value * 3)
    )(errorEither);
    
    assertEqual(result, Right('Recovered from network error'), 'bichainEither should recover from error');
    
    const successEither = Right(7);
    const successResult = bichainEither(
      (error: string) => Right(`Recovered from ${error}`),
      (value: number) => Right(value * 3)
    )(successEither);
    
    assertEqual(successResult, Right(21), 'bichainEither should transform success');
  };
  
  // Test chainLeftEither
  const testChainLeftEither = () => {
    const timeoutEither = Left('timeout');
    const retryHandler = (error: string) => 
      error === 'timeout' ? Right('retry successful') : Left(error);
    
    const result = chainLeftEither(retryHandler)(timeoutEither);
    assertEqual(result, Right('retry successful'), 'chainLeftEither should handle timeout');
    
    const successEither = Right(100);
    const successResult = chainLeftEither(retryHandler)(successEither);
    assertEqual(successResult, Right(100), 'chainLeftEither should preserve success');
  };
  
  // Test matchMEither
  const testMatchMEither = async () => {
    const errorEither = Left('database error');
    const result = await matchMEither(
      async (error: string) => {
        console.log('Logging error:', error);
        return `Error logged: ${error}`;
      },
      async (value: number) => {
        console.log('Processing value:', value);
        return `Processed: ${value}`;
      }
    )(errorEither);
    
    assertEqual(result, 'Error logged: database error', 'matchMEither should handle async error');
    
    const successEither = Right(42);
    const successResult = await matchMEither(
      async (error: string) => `Error logged: ${error}`,
      async (value: number) => `Processed: ${value}`
    )(successEither);
    
    assertEqual(successResult, 'Processed: 42', 'matchMEither should handle async success');
  };
  
  testBichainEither();
  testChainLeftEither();
  testMatchMEither().then(() => {
    console.log('✅ Either-Specific Combinators tests passed');
  });
}

// ============================================================================
// Test Suite 3: Result-Specific Combinators
// ============================================================================

export function testResultCombinators(): void {
  console.log('🧪 Testing Result-Specific Combinators...');
  
  // Test bichainResult
  const testBichainResult = () => {
    const errorResult = Err('validation error');
    const result = bichainResult(
      (value: string) => Ok(`Validated: ${value}`),
      (error: string) => Ok(`Recovered from ${error}`)
    )(errorResult);
    
    assertEqual(result, Ok('Recovered from validation error'), 'bichainResult should recover from error');
    
    const successResult = Ok('test data');
    const successResult2 = bichainResult(
      (value: string) => Ok(`Validated: ${value}`),
      (error: string) => Ok(`Recovered from ${error}`)
    )(successResult);
    
    assertEqual(successResult2, Ok('Validated: test data'), 'bichainResult should validate success');
  };
  
  // Test chainErrResult
  const testChainErrResult = () => {
    const validationError = Err('invalid email');
    const errorHandler = (error: string) => 
      error.includes('email') ? Ok('default@example.com') : Err(error);
    
    const result = chainErrResult(errorHandler)(validationError);
    assertEqual(result, Ok('default@example.com'), 'chainErrResult should handle email error');
    
    const successResult = Ok('valid@example.com');
    const successResult2 = chainErrResult(errorHandler)(successResult);
    assertEqual(successResult2, Ok('valid@example.com'), 'chainErrResult should preserve success');
  };
  
  // Test matchMResult
  const testMatchMResult = async () => {
    const errorResult = Err('file not found');
    const result = await matchMResult(
      async (value: string) => {
        console.log('Processing file:', value);
        return `File processed: ${value}`;
      },
      async (error: string) => {
        console.log('Handling error:', error);
        return `Error handled: ${error}`;
      }
    )(errorResult);
    
    assertEqual(result, 'Error handled: file not found', 'matchMResult should handle async error');
    
    const successResult = Ok('data.txt');
    const successResult2 = await matchMResult(
      async (value: string) => `File processed: ${value}`,
      async (error: string) => `Error handled: ${error}`
    )(successResult);
    
    assertEqual(successResult2, 'File processed: data.txt', 'matchMResult should handle async success');
  };
  
  testBichainResult();
  testChainErrResult();
  testMatchMResult().then(() => {
    console.log('✅ Result-Specific Combinators tests passed');
  });
}

// ============================================================================
// Test Suite 4: TaskEither Implementation
// ============================================================================

export function testTaskEitherImplementation(): void {
  console.log('🧪 Testing TaskEither Implementation...');
  
  // Test TaskEither constructors
  const testTaskEitherConstructors = async () => {
    const leftTask = TaskEitherLeft('error');
    const leftResult = await leftTask();
    assertEqual(leftResult, Left('error'), 'TaskEitherLeft should create left task');
    
    const rightTask = TaskEitherRight(42);
    const rightResult = await rightTask();
    assertEqual(rightResult, Right(42), 'TaskEitherRight should create right task');
  };
  
  // Test TaskEither bifunctor monad laws
  const testTaskEitherLaws = async () => {
    // Functor law: map(id) = id
    const task = TaskEitherRight(5);
    const mapped = TaskEitherBifunctorMonad.map(task, (x: number) => x);
    const result = await mapped();
    const original = await task();
    assertEqual(result, original, 'TaskEither should satisfy functor identity law');
    
    // Monad law: chain(of) = id
    const chained = TaskEitherBifunctorMonad.chain(task, (x: number) => TaskEitherBifunctorMonad.of(x));
    const chainedResult = await chained();
    assertEqual(chainedResult, original, 'TaskEither should satisfy monad right identity law');
  };
  
  // Test bichainTaskEither
  const testBichainTaskEither = async () => {
    const errorTask = TaskEitherLeft('network error');
    const result = bichainTaskEither(
      (error: string) => TaskEitherRight(`Recovered: ${error}`),
      (value: number) => TaskEitherRight(value * 2)
    )(errorTask);
    
    const resultValue = await result();
    assertEqual(resultValue, Right('Recovered: network error'), 'bichainTaskEither should handle error');
    
    const successTask = TaskEitherRight(10);
    const successResult = bichainTaskEither(
      (error: string) => TaskEitherRight(`Recovered: ${error}`),
      (value: number) => TaskEitherRight(value * 2)
    )(successTask);
    
    const successValue = await successResult();
    assertEqual(successValue, Right(20), 'bichainTaskEither should transform success');
  };
  
  // Test chainLeftTaskEither
  const testChainLeftTaskEither = async () => {
    const timeoutTask = TaskEitherLeft('timeout');
    const retryHandler = (error: string) => 
      error === 'timeout' ? TaskEitherRight('retry successful') : TaskEitherLeft(error);
    
    const result = chainLeftTaskEither(retryHandler)(timeoutTask);
    const resultValue = await result();
    assertEqual(resultValue, Right('retry successful'), 'chainLeftTaskEither should handle timeout');
    
    const successTask = TaskEitherRight(100);
    const successResult = chainLeftTaskEither(retryHandler)(successTask);
    const successValue = await successResult();
    assertEqual(successValue, Right(100), 'chainLeftTaskEither should preserve success');
  };
  
  // Test matchMTaskEither
  const testMatchMTaskEither = async () => {
    const errorTask = TaskEitherLeft('database error');
    const result = await matchMTaskEither(
      async (error: string) => {
        console.log('Logging database error:', error);
        return `Error logged: ${error}`;
      },
      async (value: number) => {
        console.log('Processing database value:', value);
        return `Processed: ${value}`;
      }
    )(errorTask);
    
    assertEqual(result, 'Error logged: database error', 'matchMTaskEither should handle async error');
    
    const successTask = TaskEitherRight(42);
    const successResult = await matchMTaskEither(
      async (error: string) => `Error logged: ${error}`,
      async (value: number) => `Processed: ${value}`
    )(successTask);
    
    assertEqual(successResult, 'Processed: 42', 'matchMTaskEither should handle async success');
  };
  
  testTaskEitherConstructors()
    .then(() => testTaskEitherLaws())
    .then(() => testBichainTaskEither())
    .then(() => testChainLeftTaskEither())
    .then(() => testMatchMTaskEither())
    .then(() => {
      console.log('✅ TaskEither Implementation tests passed');
    });
}

// ============================================================================
// Test Suite 5: Realistic HTTP Examples
// ============================================================================

export function testRealisticHttpExamples(): void {
  console.log('🧪 Testing Realistic HTTP Examples...');
  
  // Test HTTP fetch with error recovery
  const testHttpFetchWithRecovery = async () => {
    // Simulate a failed fetch that gets retried
    const fetchUserTask = (id: string): TaskEither<ApiError, User> => {
      return async () => {
        try {
          const user = await mockFetchUser(id);
          return Right(user);
        } catch (error) {
          return Left({ code: 500, message: error.message });
        }
      };
    };
    
    // Error recovery strategy
    const withRetry = chainLeftTaskEither((error: ApiError) => {
      if (error.code === 500 && error.message.includes('timeout')) {
        return async () => {
          try {
            const user = await mockFetchUserWithRetry('retry-success');
            return Right(user);
          } catch (retryError) {
            return Left({ code: 500, message: retryError.message });
          }
        };
      }
      return TaskEitherLeft(error);
    });
    
    // Test timeout recovery
    const timeoutTask = fetchUserTask('timeout');
    const recoveredTask = withRetry(timeoutTask);
    const result = await recoveredTask();
    
    assertEqual(
      result.tag,
      'Right',
      'HTTP fetch should recover from timeout'
    );
    
    if (result.tag === 'Right') {
      assertEqual(
        result.value.name,
        'Jane Doe',
        'Recovered user should have correct name'
      );
    }
  };
  
  // Test complex error handling with bichain
  const testComplexErrorHandling = async () => {
    const processUserData = (user: User): TaskEither<ApiError, string> => {
      return async () => {
        if (user.email.includes('@example.com')) {
          return Right(`Processed: ${user.name}`);
        } else {
          return Left({ code: 400, message: 'Invalid email format' });
        }
      };
    };
    
    const fetchAndProcess = bichainTaskEither(
      (error: ApiError) => {
        if (error.code === 404) {
          return TaskEitherRight('User not found, using default');
        }
        return TaskEitherLeft(error);
      },
      (user: User) => processUserData(user)
    );
    
    // Test successful case
    const successTask = fetchUserTask('valid-id');
    const processedTask = fetchAndProcess(successTask);
    const result = await processedTask();
    
    assertEqual(
      result.tag,
      'Right',
      'User processing should succeed for valid user'
    );
    
    if (result.tag === 'Right') {
      assertEqual(
        result.value,
        'Processed: John Doe',
        'Processed result should be correct'
      );
    }
  };
  
  // Test async pattern matching
  const testAsyncPatternMatching = async () => {
    const handleUserResponse = matchMTaskEither(
      async (error: ApiError) => {
        console.log('Handling API error:', error);
        return {
          status: 'error',
          message: `API Error ${error.code}: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      },
      async (user: User) => {
        console.log('Processing user data:', user);
        return {
          status: 'success',
          data: user,
          timestamp: new Date().toISOString()
        };
      }
    );
    
    const successTask = fetchUserTask('valid-id');
    const result = await handleUserResponse(successTask);
    
    assertEqual(
      result.status,
      'success',
      'Pattern matching should handle success case'
    );
    
    if (result.status === 'success') {
      assertEqual(
        result.data.name,
        'John Doe',
        'Pattern matching should preserve user data'
      );
    }
  };
  
  testHttpFetchWithRecovery()
    .then(() => testComplexErrorHandling())
    .then(() => testAsyncPatternMatching())
    .then(() => {
      console.log('✅ Realistic HTTP Examples tests passed');
    });
}

// ============================================================================
// Test Suite 6: Utility Functions
// ============================================================================

export function testUtilityFunctions(): void {
  console.log('🧪 Testing Utility Functions...');
  
  // Test eitherToTaskEither
  const testEitherToTaskEither = async () => {
    const either = Right(42);
    const taskEither = eitherToTaskEither(either);
    const result = await taskEither();
    assertEqual(result, either, 'eitherToTaskEither should preserve Either value');
  };
  
  // Test taskEitherToPromise
  const testTaskEitherToPromise = async () => {
    const taskEither = TaskEitherRight('test');
    const promise = taskEitherToPromise(taskEither);
    const result = await promise;
    assertEqual(result, Right('test'), 'taskEitherToPromise should convert correctly');
  };
  
  // Test promiseToTaskEither
  const testPromiseToTaskEither = async () => {
    const successPromise = Promise.resolve('success');
    const successTask = promiseToTaskEither(successPromise, (error: any) => `Error: ${error}`);
    const successResult = await successTask();
    assertEqual(successResult, Right('success'), 'promiseToTaskEither should handle success');
    
    const errorPromise = Promise.reject('test error');
    const errorTask = promiseToTaskEither(errorPromise, (error: any) => `Error: ${error}`);
    const errorResult = await errorTask();
    assertEqual(errorResult, Left('Error: test error'), 'promiseToTaskEither should handle error');
  };
  
  // Test purity tracking
  const testPurityTracking = () => {
    const taskEither = TaskEitherRight(42);
    const pureTask = createTaskEitherWithPurity(taskEither, 'Pure');
    
    type Effect = EffectOfTaskEither<typeof pureTask>;
    type IsPure = IsTaskEitherPure<typeof pureTask>;
    
    // These are compile-time checks, so we just verify the types are correct
    assertEqual(pureTask.effect, 'Pure', 'Purity should be tracked correctly');
  };
  
  testEitherToTaskEither()
    .then(() => testTaskEitherToPromise())
    .then(() => testPromiseToTaskEither())
    .then(() => testPurityTracking())
    .then(() => {
      console.log('✅ Utility Functions tests passed');
    });
}

// ============================================================================
// Main Test Runner
// ============================================================================

export async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Extended Bifunctor Monad Tests...\n');
  
  try {
    testGenericCombinators();
    await testEitherCombinators();
    await testResultCombinators();
    await testTaskEitherImplementation();
    await testRealisticHttpExamples();
    await testUtilityFunctions();
    
    console.log('\n🎉 All Extended Bifunctor Monad tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
} 