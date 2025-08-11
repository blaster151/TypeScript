/**
 * Product Type Pattern Matching Utilities
 * 
 * This module provides a generic matchProduct function for product types
 * (tuples and records) with full type inference and readonly safety.
 * 
 * Features:
 * - Generic matchProduct function for tuples and records
 * - Type-safe destructuring with full inference
 * - Readonly-safe operations
 * - Integration with createProductType outputs
 * - Minimal boilerplate for common destructuring patterns
 */

/**
 * Generic pattern matcher for product types (tuples and records).
 * 
 * This function provides a clean, type-safe way to destructure product types
 * without losing type inference. It works seamlessly with createProductType
 * outputs and helps avoid repetitive manual destructuring patterns.
 * 
 * @template T - The product type (tuple or record)
 * @template R - The result type of the matcher function
 * @param product - The product value to match on
 * @param matcher - Function that receives the product and returns the result
 * @returns The result of applying the matcher to the product
 * 
 * @example
 * ```typescript
 * // Tuple destructuring
 * const tuple = ['Alice', 30] as const;
 * const result = matchProduct(tuple, ([name, age]) => `${name} is ${age} years old`);
 * // result: "Alice is 30 years old"
 * 
 * // Record destructuring
 * const person = { name: 'Bob', age: 25 } as const;
 * const result = matchProduct(person, ({ name, age }) => `${name} is ${age} years old`);
 * // result: "Bob is 25 years old"
 * ```
 */
export function matchProduct<T, R>(
  product: T,
  matcher: (fields: T) => R
): R {
  return matcher(product);
}

/**
 * Creates a curryable product matcher for reuse.
 * 
 * @template T - Product type
 * @template R - Result type
 * @param matcher - The matcher function to curry
 * @returns A function that takes a product and applies the matcher
 * 
 * @example
 * ```typescript
 * const formatPerson = createProductMatcher(({ name, age }) => `${name} (${age})`);
 * const person1 = { name: 'Alice', age: 30 } as const;
 * const person2 = { name: 'Bob', age: 25 } as const;
 * 
 * console.log(formatPerson(person1)); // "Alice (30)"
 * console.log(formatPerson(person2)); // "Bob (25)"
 * ```
 */
export function createProductMatcher<T, R>(
  matcher: (fields: T) => R
): (product: T) => R {
  return (product: T) => matchProduct(product, matcher);
}

/**
 * Example usage demonstrating the matchProduct function with various product types.
 * 
 * This function showcases how matchProduct works with tuples and records,
 * providing full type safety and inference without boilerplate.
 */
export function exampleUsage(): void {
  console.log('=== matchProduct Example Usage ===');
  
  // Example 1: Tuple destructuring
  const coordinates: readonly [string, number] = ['Alice', 30] as const;
  const tupleResult = matchProduct(coordinates, ([name, age]) => 
    `${name} is ${age} years old`
  );
  console.log('Tuple result:', tupleResult); // "Alice is 30 years old"
  
  // Example 2: Record destructuring
  const person: { readonly name: string; readonly age: number } = { 
    name: 'Bob', 
    age: 25 
  } as const;
  const recordResult = matchProduct(person, ({ name, age }) => 
    `${name} is ${age} years old`
  );
  console.log('Record result:', recordResult); // "Bob is 25 years old"
  
  // Example 3: Curryable matcher
  const formatPerson = createProductMatcher<{ name: string; age: number }, string>(({ name, age }) => 
    `${name} (${age})`
  );
  const person1 = { name: 'Charlie', age: 35 } as const;
  const person2 = { name: 'Diana', age: 28 } as const;
  
  console.log('Curryable 1:', formatPerson(person1)); // "Charlie (35)"
  console.log('Curryable 2:', formatPerson(person2)); // "Diana (28)"
}

/**
 * Test function to verify matchProduct works correctly
 */
export function testMatchProduct(): void {
  console.log('\n=== Testing matchProduct ===');
  
  // Test 1: Tuple destructuring
  const tuple: readonly [string, number] = ['Alice', 30] as const;
  const result1 = matchProduct(tuple, ([name, age]) => 
    `${name} is ${age} years old`
  );
  console.log('✅ Tuple test:', result1 === 'Alice is 30 years old');
  
  // Test 2: Record destructuring
  const record: { readonly name: string; readonly age: number } = { 
    name: 'Bob', 
    age: 25 
  } as const;
  const result2 = matchProduct(record, ({ name, age }) => 
    `${name} is ${age} years old`
  );
  console.log('✅ Record test:', result2 === 'Bob is 25 years old');
  
  // Test 3: Curryable matcher
  const formatPerson = createProductMatcher<{ name: string; age: number }, string>(({ name, age }) => 
    `${name} (${age})`
  );
  const person = { name: 'Charlie', age: 35 } as const;
  const result3 = formatPerson(person);
  console.log('✅ Curryable test:', result3 === 'Charlie (35)');
  
  // Test 4: Type inference
  const mixedTuple: readonly [string, number, boolean] = ['test', 42, true] as const;
  const result4 = matchProduct(mixedTuple, ([str, num, bool]) => {
    const strLength: number = str.length;
    const numSquared: number = num * num;
    return `${str} (${strLength} chars) squared is ${numSquared} (${bool})`;
  });
  console.log('✅ Type inference test:', 
    result4 === 'test (4 chars) squared is 1764 (true)');
}

/**
 * matchProduct Laws:
 * 
 * 1. Identity: matchProduct(product, fields => fields) = product
 * 2. Composition: matchProduct(product, f).then(g) = matchProduct(product, fields => g(f(fields)))
 * 3. Type Preservation: matchProduct preserves the type structure of the product
 * 4. Readonly Safety: matchProduct never mutates the input product
 * 5. Inference: TypeScript can infer field types in the matcher function
 * 
 * Integration Laws:
 * 1. createProductType Integration: matchProduct works seamlessly with createProductType outputs
 * 2. Curryable Composition: createProductMatcher enables functional composition
 * 3. Type Safety: All matchers preserve compile-time type safety
 * 4. Performance: matchProduct has zero runtime overhead
 */ 