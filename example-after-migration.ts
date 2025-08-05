/**
 * Example: After Migration
 * 
 * This file demonstrates the new ADT usage patterns after migration
 * to the unified system.
 */

// New import patterns
import { Maybe, Just, Nothing, matchMaybe  } from './fp-maybe-unified';
import { Either, Left, Right, matchEither  } from './fp-either-unified';
import { Result, Ok, Err, matchResult  } from './fp-result-unified';

// New constructor usage patterns
function newMaybeExample() {
  // Using destructured Just and Nothing
  const maybeJust = Just(42);
  const maybeNothing = Nothing();
  
  // Same pattern matching API
  const result = matchMaybe(maybeJust, {
    Just: value => `Got ${value}`,
    Nothing: () => "None"
  });
  
  return result;
}

function newEitherExample() {
  // Using destructured Left and Right
  const eitherLeft = Left("error");
  const eitherRight = Right(42);
  
  // Same pattern matching API
  const result = matchEither(eitherRight, {
    Left: value => `Error: ${value}`,
    Right: value => `Success: ${value}`
  });
  
  return result;
}

function newResultExample() {
  // Using destructured Ok and Err
  const resultOk = Ok(42);
  const resultErr = Err("error");
  
  // Same pattern matching API
  const result = matchResult(resultOk, {
    Ok: value => `Success: ${value}`,
    Err: error => `Error: ${error}`
  });
  
  return result;
}

// Same type definitions (imports updated)
type MaybeNumber = Maybe<number>;
type EitherStringNumber = Either<string, number>;
type ResultNumberString = Result<number, string>;

// Updated utility functions
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

// New usage examples with enhanced features
export function newADTUsageExamples() {
  console.log('=== New ADT Usage Examples ===');
  
  // Maybe examples (same API, enhanced features)
  console.log('Maybe examples:');
  console.log('- Just:', newMaybeExample());
  console.log('- Divide 10/2:', matchMaybe(divide(10, 2), {
    Just: value => `Result: ${value}`,
    Nothing: () => "Cannot divide by zero"
  }));
  console.log('- Divide 10/0:', matchMaybe(divide(10, 0), {
    Just: value => `Result: ${value}`,
    Nothing: () => "Cannot divide by zero"
  }));
  
  // Either examples (same API, enhanced features)
  console.log('\nEither examples:');
  console.log('- Parse "42":', newEitherExample());
  console.log('- Parse "abc":', matchEither(parseNumber("abc"), {
    Left: error => `Error: ${error}`,
    Right: value => `Success: ${value}`
  }));
  
  // Result examples (same API, enhanced features)
  console.log('\nResult examples:');
  console.log('- Fetch user 42:', newResultExample());
  console.log('- Fetch user -1:', matchResult(fetchUser(-1), {
    Ok: user => `Found: ${user}`,
    Err: error => `Error: ${error}`
  }));
}

// Enhanced features available after migration
export function enhancedFeatures() {
  console.log('\n=== Enhanced Features ===');
  
  // HKT Integration
  console.log('HKT Integration:');
  console.log('- MaybeK, EitherK, ResultK available for typeclass usage');
  console.log('- Apply<MaybeK, [number]> works correctly');
  console.log('- Typeclass instances automatically generated');
  
  // Purity Tracking
  console.log('\nPurity Tracking:');
  console.log('- All ADTs default to Pure effect');
  console.log('- Effect override capabilities available');
  console.log('- Runtime purity markers when enabled');
  
  // Registry Integration
  console.log('\nRegistry Integration:');
  console.log('- Centralized ADT registry available');
  console.log('- Automatic typeclass instance generation');
  console.log('- Purity information tracking');
  
  // Backward Compatibility
  console.log('\nBackward Compatibility:');
  console.log('- Same constructor names (Just, Nothing, Left, Right, Ok, Err)');
  console.log('- Same pattern matching API (matchMaybe, matchEither, matchResult)');
  console.log('- Same type names (Maybe<A>, Either<L, R>, Result<T, E>)');
  console.log('- Same utility functions (isJust, isLeft, fromJust, etc.)');
  console.log('- Drop-in replacement for existing ADTs');
}

// Export for testing
export {
  newMaybeExample,
  newEitherExample,
  newResultExample,
  divide,
  parseNumber,
  fetchUser
}; 