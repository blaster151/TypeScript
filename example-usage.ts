// Example usage of the FP Typeclass System
import {
  map,
  lift,
  chain,
  bimap,
  dimap,
  ArrayFunctor,
  ArrayApplicative,
  ArrayMonad,
  TupleBifunctor,
  FunctionProfunctor,
  MaybeFunctor,
  MaybeApplicative,
  MaybeMonad,
  EitherBifunctor,
  ReaderProfunctor,
  Just,
  Nothing,
  Left,
  Right
} from './fp-typeclasses';

// ============================================================================
// Example 1: Data Processing Pipeline
// ============================================================================

console.log("=== Example 1: Data Processing Pipeline ===");

// Process a list of user data
const users = [
  { id: 1, name: "Alice", age: 25 },
  { id: 2, name: "Bob", age: 30 },
  { id: 3, name: "Charlie", age: 35 }
];

// Extract names using Functor
const names = map(ArrayFunctor, users, (user: { id: number; name: string; age: number }) => user.name);
console.log("Names:", names); // ["Alice", "Bob", "Charlie"]

// Calculate ages in 10 years using Functor
const futureAges = map(ArrayFunctor, users, (user: { id: number; name: string; age: number }) => user.age + 10);
console.log("Ages in 10 years:", futureAges); // [35, 40, 45]

// Create user summaries using Applicative
const createSummary = (name: string) => (age: number) => `${name} (${age})`;
const nameFunctions = map(ArrayFunctor, names, (name: string) => (age: number) => createSummary(name)(age));
const summaries = ArrayApplicative.ap(nameFunctions, futureAges);
console.log("Summaries:", summaries); // ["Alice (35)", "Bob (40)", "Charlie (45)"]

// ============================================================================
// Example 2: Error Handling with Maybe
// ============================================================================

console.log("\n=== Example 2: Error Handling with Maybe ===");

// Safe division function
const safeDivide = (numerator: number, denominator: number) => 
  denominator === 0 ? Nothing<number>() : Just(numerator / denominator);

// Chain safe operations
const result1 = chain(MaybeMonad, Just(10), (x: number) => safeDivide(x, 2));
console.log("10 / 2:", result1); // { tag: 'Just', value: 5 }

const result2 = chain(MaybeMonad, Just(10), (x: number) => safeDivide(x, 0));
console.log("10 / 0:", result2); // { tag: 'Nothing' }

// Chain multiple operations
const complexCalculation = chain(MaybeMonad, Just(20), (x: number) => 
  chain(MaybeMonad, safeDivide(x, 4), (y: number) => 
    chain(MaybeMonad, safeDivide(y, 2), (z: number) => 
      Just(z * 3)
    )
  )
);
console.log("Complex calculation:", complexCalculation); // { tag: 'Just', value: 7.5 }

// ============================================================================
// Example 3: Data Transformation with Bifunctor
// ============================================================================

console.log("\n=== Example 3: Data Transformation with Bifunctor ===");

// Transform coordinate pairs
const coordinates: [number, number][] = [
  [1, 2],
  [3, 4],
  [5, 6]
];

const transformedCoords = map(ArrayFunctor, coordinates, (coord: [number, number]) => 
  bimap(TupleBifunctor, coord, (x: number) => x * 2, (y: number) => y + 1)
);
console.log("Transformed coordinates:", transformedCoords); // [[2, 3], [6, 5], [10, 7]]

// Transform error messages and values
const results: [string, number][] = [
  ["Invalid input", 0],
  ["Success", 42],
  ["Network error", -1]
];

const processedResults = map(ArrayFunctor, results, (result: [string, number]) => 
  bimap(TupleBifunctor, result, 
    (error: string) => error.toUpperCase(), 
    (value: number) => value * 2
  )
);
console.log("Processed results:", processedResults); // [["INVALID INPUT", 0], ["SUCCESS", 84], ["NETWORK ERROR", -2]]

// ============================================================================
// Example 4: Function Composition with Profunctor
// ============================================================================

console.log("\n=== Example 4: Function Composition with Profunctor ===");

// Original function: string -> number
const getLength = (s: string) => s.length;

// Transform input: number -> string, output: number -> string
const transformedFunction = dimap(
  FunctionProfunctor,
  getLength,
  (n: number) => n.toString(), // Input transformation
  (n: number) => `Length: ${n}` // Output transformation
);

console.log("Original:", getLength("hello")); // 5
console.log("Transformed:", transformedFunction(42)); // "Length: 2"

// Reader monad example
type Config = { port: number; host: string };
type Reader<R, A> = (r: R) => A;

const getPort: Reader<Config, number> = config => config.port;
const getHost: Reader<Config, string> = config => config.host;

// Transform reader to work with different config format
const transformedReader = dimap(
  ReaderProfunctor,
  getPort,
  (newConfig: { server: Config }) => newConfig.server, // Input transformation
  (port: number) => port * 2 // Output transformation
);

const config = { port: 3000, host: "localhost" };
const newConfig = { server: config };

console.log("Original port:", getPort(config)); // 3000
console.log("Transformed port:", transformedReader(newConfig)); // 6000

// ============================================================================
// Example 5: Complex Pipeline with Multiple Typeclasses
// ============================================================================

console.log("\n=== Example 5: Complex Pipeline with Multiple Typeclasses ===");

// Simulate API responses with Either
type ApiResponse<T> = Either<string, T>;

const apiResponses: ApiResponse<number>[] = [
  Right(42),
  Left("Network error"),
  Right(100),
  Left("Invalid data")
];

// Process successful responses, ignore errors
const processedResponses = map(ArrayFunctor, apiResponses, response => 
  bimap(EitherBifunctor, response,
    error => `Error: ${error}`, // Transform error messages
    value => value * 2 // Transform successful values
  )
);

console.log("Processed API responses:", processedResponses);
// [
//   { tag: 'Right', value: 84 },
//   { tag: 'Left', value: 'Error: Network error' },
//   { tag: 'Right', value: 200 },
//   { tag: 'Left', value: 'Error: Invalid data' }
// ]

// Extract only successful values using Maybe
const extractSuccess = <T>(response: ApiResponse<T>): Maybe<T> => 
  response.tag === 'Right' ? Just(response.value) : Nothing<T>();

const successfulValues = map(ArrayFunctor, apiResponses, extractSuccess);
console.log("Successful values:", successfulValues);
// [
//   { tag: 'Just', value: 42 },
//   { tag: 'Nothing' },
//   { tag: 'Just', value: 100 },
//   { tag: 'Nothing' }
// ]

// ============================================================================
// Example 6: Validation Pipeline
// ============================================================================

console.log("\n=== Example 6: Validation Pipeline ===");

// Validation functions
const validateAge = (age: number): Maybe<number> => 
  age >= 0 && age <= 150 ? Just(age) : Nothing<number>();

const validateName = (name: string): Maybe<string> => 
  name.length > 0 && name.length <= 50 ? Just(name) : Nothing<string>();

// User data
const userData = [
  { name: "Alice", age: 25 },
  { name: "", age: 200 }, // Invalid
  { name: "Bob", age: -5 }, // Invalid
  { name: "Charlie", age: 30 }
];

// Validate each user
const validatedUsers = map(ArrayFunctor, userData, user => 
  chain(MaybeMonad, validateName(user.name), name => 
    chain(MaybeMonad, validateAge(user.age), age => 
      Just({ name, age })
    )
  )
);

console.log("Validated users:", validatedUsers);
// [
//   { tag: 'Just', value: { name: 'Alice', age: 25 } },
//   { tag: 'Nothing' },
//   { tag: 'Nothing' },
//   { tag: 'Just', value: { name: 'Charlie', age: 30 } }
// ]

console.log("\n=== All Examples Completed Successfully! ==="); 