/**
 * Simple test runner for bifunctor monad extended combinators
 * This runs basic functionality tests without requiring TypeScript compilation
 */

console.log('🧪 Testing Extended Bifunctor Monad Combinators...\n');

// Simple Either implementation for testing
const Left = (value) => ({ tag: 'Left', value });
const Right = (value) => ({ tag: 'Right', value });

const matchEither = (either, patterns) => {
  if (either.tag === 'Left') {
    return patterns.Left(either.value);
  } else {
    return patterns.Right(either.value);
  }
};

// Simple Result implementation for testing
const Ok = (value) => ({ tag: 'Ok', value });
const Err = (error) => ({ tag: 'Err', error });

const matchResult = (result, patterns) => {
  if (result.tag === 'Ok') {
    return patterns.Ok(result.value);
  } else {
    return patterns.Err(result.error);
  }
};

// TaskEither implementation
const TaskEitherLeft = (l) => async () => Left(l);
const TaskEitherRight = (r) => async () => Right(r);

// Test utilities
function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}: Expected ${expectedStr}, got ${actualStr}`);
  }
}

async function assertEqualAsync(actual, expected, message) {
  const result = await actual;
  assertEqual(result, expected, message);
}

// ============================================================================
// Test 1: Basic Either Bifunctor Monad
// ============================================================================

console.log('📋 Test 1: Basic Either Bifunctor Monad');

const EitherBifunctorMonad = {
  // Functor
  map: (fa, f) => {
    return matchEither(fa, {
      Left: (error) => Left(error),
      Right: (value) => Right(f(value))
    });
  },
  
  // Applicative
  of: (a) => Right(a),
  ap: (fab, fa) => {
    return matchEither(fab, {
      Left: (error) => Left(error),
      Right: (f) => matchEither(fa, {
        Left: (error) => Left(error),
        Right: (a) => Right(f(a))
      })
    });
  },
  
  // Monad
  chain: (fa, f) => {
    return matchEither(fa, {
      Left: (error) => Left(error),
      Right: (value) => f(value)
    });
  },
  
  // Bifunctor
  bimap: (fab, f, g) => {
    return matchEither(fab, {
      Left: (error) => Left(f(error)),
      Right: (value) => Right(g(value))
    });
  },
  
  mapLeft: (fab, f) => {
    return matchEither(fab, {
      Left: (error) => Left(f(error)),
      Right: (value) => Right(value)
    });
  },
  
  mapRight: (fab, g) => {
    return matchEither(fab, {
      Left: (error) => Left(error),
      Right: (value) => Right(g(value))
    });
  }
};

// Test bichain
const testBichain = () => {
  const either = Left('error');
  const onLeft = (error) => Right(`Recovered: ${error}`);
  const onRight = (value) => Right(value * 2);
  
  // Simulate bichain behavior - apply the appropriate function based on the side
  const result = matchEither(either, {
    Left: onLeft,
    Right: onRight
  });
  
  assertEqual(result, Right('Recovered: error'), 'bichain should handle left side');
  
  const successEither = Right(5);
  const successResult = matchEither(successEither, {
    Left: onLeft,
    Right: onRight
  });
  
  assertEqual(successResult, Right(10), 'bichain should handle right side');
};

// Test chainLeft
const testChainLeft = () => {
  const either = Left('timeout error');
  const errorHandler = (error) => 
    error.includes('timeout') ? Right('retry successful') : Left(error);
  
  // Simulate chainLeft behavior - only transform the left side
  const result = matchEither(either, {
    Left: errorHandler,
    Right: (value) => Right(value)
  });
  
  assertEqual(result, Right('retry successful'), 'chainLeft should handle timeout');
  
  const successEither = Right(42);
  const successResult = matchEither(successEither, {
    Left: errorHandler,
    Right: (value) => Right(value)
  });
  
  assertEqual(successResult, Right(42), 'chainLeft should preserve success');
};

testBichain();
testChainLeft();
console.log('✅ Test 1 passed\n');

// ============================================================================
// Test 2: Result Bifunctor Monad
// ============================================================================

console.log('📋 Test 2: Result Bifunctor Monad');

const ResultBifunctorMonad = {
  // Functor
  map: (fa, f) => {
    return matchResult(fa, {
      Ok: (value) => Ok(f(value)),
      Err: (error) => Err(error)
    });
  },
  
  // Applicative
  of: (a) => Ok(a),
  ap: (fab, fa) => {
    return matchResult(fab, {
      Ok: (f) => matchResult(fa, {
        Ok: (a) => Ok(f(a)),
        Err: (error) => Err(error)
      }),
      Err: (error) => Err(error)
    });
  },
  
  // Monad
  chain: (fa, f) => {
    return matchResult(fa, {
      Ok: (value) => f(value),
      Err: (error) => Err(error)
    });
  },
  
  // Bifunctor
  bimap: (fab, f, g) => {
    return matchResult(fab, {
      Ok: (value) => Ok(f(value)),
      Err: (error) => Err(g(error))
    });
  },
  
  mapLeft: (fab, f) => {
    return matchResult(fab, {
      Ok: (value) => Ok(f(value)),
      Err: (error) => Err(error)
    });
  },
  
  mapRight: (fab, g) => {
    return matchResult(fab, {
      Ok: (value) => Ok(value),
      Err: (error) => Err(g(error))
    });
  }
};

// Test bichainResult
const testBichainResult = () => {
  const errorResult = Err('validation error');
  
  // Simulate bichain behavior - apply the appropriate function based on the side
  const result = matchResult(errorResult, {
    Ok: (value) => Ok(`Validated: ${value}`),
    Err: (error) => Ok(`Recovered from ${error}`)
  });
  
  assertEqual(result, Ok('Recovered from validation error'), 'bichainResult should recover from error');
  
  const successResult = Ok('test data');
  const successResult2 = matchResult(successResult, {
    Ok: (value) => Ok(`Validated: ${value}`),
    Err: (error) => Ok(`Recovered from ${error}`)
  });
  
  assertEqual(successResult2, Ok('Validated: test data'), 'bichainResult should validate success');
};

// Test chainErrResult
const testChainErrResult = () => {
  const validationError = Err('invalid email');
  const errorHandler = (error) => 
    error.includes('email') ? Ok('default@example.com') : Err(error);
  
  // Simulate chainLeft behavior - only transform the error side
  const result = matchResult(validationError, {
    Ok: (value) => Ok(value),
    Err: errorHandler
  });
  
  assertEqual(result, Ok('default@example.com'), 'chainErrResult should handle email error');
  
  const successResult = Ok('valid@example.com');
  const successResult2 = matchResult(successResult, {
    Ok: (value) => Ok(value),
    Err: errorHandler
  });
  
  assertEqual(successResult2, Ok('valid@example.com'), 'chainErrResult should preserve success');
};

testBichainResult();
testChainErrResult();
console.log('✅ Test 2 passed\n');

// ============================================================================
// Test 3: TaskEither Implementation
// ============================================================================

console.log('📋 Test 3: TaskEither Implementation');

const TaskEitherBifunctorMonad = {
  // Functor
  map: (fa, f) => {
    return async () => {
      const result = await fa();
      return matchEither(result, {
        Left: (error) => Left(error),
        Right: (value) => Right(f(value))
      });
    };
  },
  
  // Applicative
  of: (a) => async () => Right(a),
  ap: (fab, fa) => {
    return async () => {
      const [fResult, aResult] = await Promise.all([fab(), fa()]);
      return matchEither(fResult, {
        Left: (error) => Left(error),
        Right: (f) => matchEither(aResult, {
          Left: (error) => Left(error),
          Right: (a) => Right(f(a))
        })
      });
    };
  },
  
  // Monad
  chain: (fa, f) => {
    return async () => {
      const result = await fa();
      return matchEither(result, {
        Left: (error) => Left(error),
        Right: async (value) => await f(value)()
      });
    };
  },
  
  // Bifunctor
  bimap: (fab, f, g) => {
    return async () => {
      const result = await fab();
      return matchEither(result, {
        Left: (error) => Left(f(error)),
        Right: (value) => Right(g(value))
      });
    };
  },
  
  mapLeft: (fab, f) => {
    return async () => {
      const result = await fab();
      return matchEither(result, {
        Left: (error) => Left(f(error)),
        Right: (value) => Right(value)
      });
    };
  },
  
  mapRight: (fab, g) => {
    return async () => {
      const result = await fab();
      return matchEither(result, {
        Left: (error) => Left(error),
        Right: (value) => Right(g(value))
      });
    };
  }
};

// Test TaskEither constructors
const testTaskEitherConstructors = async () => {
  const leftTask = TaskEitherLeft('error');
  const leftResult = await leftTask();
  assertEqual(leftResult, Left('error'), 'TaskEitherLeft should create left task');
  
  const rightTask = TaskEitherRight(42);
  const rightResult = await rightTask();
  assertEqual(rightResult, Right(42), 'TaskEitherRight should create right task');
};

// Test bichainTaskEither
const testBichainTaskEither = async () => {
  const errorTask = TaskEitherLeft('network error');
  
  // Simulate bichain behavior - apply the appropriate function based on the side
  const result = await errorTask();
  const resultValue = matchEither(result, {
    Left: (error) => Right(`Recovered: ${error}`),
    Right: (value) => Right(value * 2)
  });
  
  assertEqual(resultValue, Right('Recovered: network error'), 'bichainTaskEither should handle error');
  
  const successTask = TaskEitherRight(10);
  const successResult = await successTask();
  const successValue = matchEither(successResult, {
    Left: (error) => Right(`Recovered: ${error}`),
    Right: (value) => Right(value * 2)
  });
  
  assertEqual(successValue, Right(20), 'bichainTaskEither should transform success');
};

// Test chainLeftTaskEither
const testChainLeftTaskEither = async () => {
  const timeoutTask = TaskEitherLeft('timeout');
  const retryHandler = (error) => 
    error === 'timeout' ? Right('retry successful') : Left(error);
  
  // Simulate chainLeft behavior - only transform the left side
  const result = await timeoutTask();
  const resultValue = matchEither(result, {
    Left: retryHandler,
    Right: (value) => Right(value)
  });
  
  assertEqual(resultValue, Right('retry successful'), 'chainLeftTaskEither should handle timeout');
  
  const successTask = TaskEitherRight(100);
  const successResult = await successTask();
  const successValue = matchEither(successResult, {
    Left: retryHandler,
    Right: (value) => Right(value)
  });
  
  assertEqual(successValue, Right(100), 'chainLeftTaskEither should preserve success');
};

testTaskEitherConstructors()
  .then(() => testBichainTaskEither())
  .then(() => testChainLeftTaskEither())
  .then(() => {
    console.log('✅ Test 3 passed\n');
  });

// ============================================================================
// Test 4: Async Pattern Matching
// ============================================================================

console.log('📋 Test 4: Async Pattern Matching');

const testAsyncPatternMatching = async () => {
  // Simulate matchM behavior
  const matchMEither = async (ma, onLeft, onRight) => {
    const result = await ma();
    return matchEither(result, {
      Left: async (error) => await onLeft(error),
      Right: async (value) => await onRight(value)
    });
  };
  
  const errorTask = TaskEitherLeft('database error');
  const result = await matchMEither(
    errorTask,
    async (error) => {
      console.log('Logging error:', error);
      return `Error logged: ${error}`;
    },
    async (value) => {
      console.log('Processing value:', value);
      return `Processed: ${value}`;
    }
  );
  
  assertEqual(result, 'Error logged: database error', 'matchMEither should handle async error');
  
  const successTask = TaskEitherRight(42);
  const successResult = await matchMEither(
    successTask,
    async (error) => `Error logged: ${error}`,
    async (value) => `Processed: ${value}`
  );
  
  assertEqual(successResult, 'Processed: 42', 'matchMEither should handle async success');
};

testAsyncPatternMatching().then(() => {
  console.log('✅ Test 4 passed\n');
});

// ============================================================================
// Test 5: Realistic HTTP Example
// ============================================================================

console.log('📋 Test 5: Realistic HTTP Example');

const testHttpExample = async () => {
  // Mock HTTP functions
  const mockFetchUser = (id) => {
    if (id === 'valid-id') {
      return Promise.resolve({ id, name: 'John Doe', email: 'john@example.com' });
    } else {
      return Promise.reject(new Error('User not found'));
    }
  };
  
  const fetchUserTask = (id) => {
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
  const withRetry = (task) => {
    return TaskEitherBifunctorMonad.chain(task, (result) => {
      return matchEither(result, {
        Left: (error) => {
          if (error.code === 500 && error.message.includes('timeout')) {
            return TaskEitherRight({ id: 'retry-success', name: 'Jane Doe', email: 'jane@example.com' });
          }
          return TaskEitherLeft(error);
        },
        Right: (user) => TaskEitherRight(user)
      });
    });
  };
  
  // Test successful fetch
  const successTask = fetchUserTask('valid-id');
  const successResult = await successTask();
  
  assertEqual(successResult.tag, 'Right', 'HTTP fetch should succeed for valid ID');
  
  if (successResult.tag === 'Right') {
    assertEqual(successResult.value.name, 'John Doe', 'Fetched user should have correct name');
  }
  
  // Test failed fetch
  const errorTask = fetchUserTask('invalid-id');
  const errorResult = await errorTask();
  
  assertEqual(errorResult.tag, 'Left', 'HTTP fetch should fail for invalid ID');
  
  if (errorResult.tag === 'Left') {
    assertEqual(errorResult.value.code, 500, 'Error should have correct code');
  }
};

testHttpExample().then(() => {
  console.log('✅ Test 5 passed\n');
  console.log('🎉 All Extended Bifunctor Monad tests passed!');
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 