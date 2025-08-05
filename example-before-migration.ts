/**
 * Example: Before Migration
 * 
 * This file demonstrates the old ADT usage patterns that need to be migrated
 * to the new unified system.
 */

// Old import patterns
import { Maybe, Just, Nothing, matchMaybe  } from './fp-maybe-unified';
import { Either, Left, Right, matchEither  } from './fp-either-unified';
import { Result, Ok, Err, matchResult  } from './fp-result-unified';

// Old constructor usage patterns
function oldMaybeExample() {
  // Using Maybe.Just and Maybe.Nothing
  const maybeJust = Just(42);
  const maybeNothing = Nothing();
  
  // Old pattern matching
  const result = matchMaybe(maybeJust, {
    Just: value => `Got ${value}`,
    Nothing: () => "None"
  });
  
  return result;
}

function oldEitherExample() {
  // Using Either.Left and Either.Right
  const eitherLeft = Left("error");
  const eitherRight = Right(42);
  
  // Old pattern matching
  const result = matchEither(eitherRight, {
    Left: value => `Error: ${value}`,
    Right: value => `Success: ${value}`
  });
  
  return result;
}

function oldResultExample() {
  // Using Result.Ok and Result.Err
  const resultOk = Ok(42);
  const resultErr = Err("error");
  
  // Old pattern matching
  const result = matchResult(resultOk, {
    Ok: value => `Success: ${value}`,
    Err: error => `Error: ${error}`
  });
  
  return result;
}

// Old type definitions
type MaybeNumber = Maybe<number>;
type EitherStringNumber = Either<string, number>;
type ResultNumberString = Result<number, string>;

// Old utility functions
function divide(a: number, b: number): Maybe<number> {
  if (b === 0) {
    return Nothing();
  }
  return Just(a / b);
}

function parseNumber(str: string): Either<string, number> {
  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return Left("Invalid number");
  }
  return Right(num);
}

function fetchUser(id: number): Result<string, string> {
  if (id <= 0) {
    return Err("Invalid user ID");
  }
  return Ok(`User ${id}`);
}

// Old usage examples
export function oldADTUsageExamples() {
  console.log('=== Old ADT Usage Examples ===');
  
  // Maybe examples
  console.log('Maybe examples:');
  console.log('- Just:', oldMaybeExample());
  console.log('- Divide 10/2:', matchMaybe(divide(10, 2), {
    Just: value => `Result: ${value}`,
    Nothing: () => "Cannot divide by zero"
  }));
  console.log('- Divide 10/0:', matchMaybe(divide(10, 0), {
    Just: value => `Result: ${value}`,
    Nothing: () => "Cannot divide by zero"
  }));
  
  // Either examples
  console.log('\nEither examples:');
  console.log('- Parse "42":', oldEitherExample());
  console.log('- Parse "abc":', matchEither(parseNumber("abc"), {
    Left: error => `Error: ${error}`,
    Right: value => `Success: ${value}`
  }));
  
  // Result examples
  console.log('\nResult examples:');
  console.log('- Fetch user 42:', oldResultExample());
  console.log('- Fetch user -1:', matchResult(fetchUser(-1), {
    Ok: user => `Found: ${user}`,
    Err: error => `Error: ${error}`
  }));
}

// Export for testing
export {
  oldMaybeExample,
  oldEitherExample,
  oldResultExample,
  divide,
  parseNumber,
  fetchUser
}; 