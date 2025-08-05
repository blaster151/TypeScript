/**
 * Product Type Pattern Matching Utilities
 * 
 * This module provides generic pattern matching utilities for product types
 * (tuples and records) with full type inference and readonly safety.
 * 
 * Features:
 * - Generic matchProduct function for tuples and records
 * - Type-safe destructuring with full inference
 * - Readonly-safe operations
 * - Integration with createProductType outputs
 * - Minimal boilerplate for common destructuring patterns
 */

import {
  createProductType,
  ProductTypeBuilder,
  ExtractProductTypeInstance
} from './fp-adt-builders';

// ============================================================================
// Part 1: Core matchProduct Function
// ============================================================================

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

// ============================================================================
// Part 2: Specialized Product Matchers
// ============================================================================

/**
 * Pattern matcher for tuples with explicit length constraints.
 * 
 * @template T - Tuple type
 * @template R - Result type
 * @param tuple - The tuple to match on
 * @param matcher - Function that receives the tuple elements
 * @returns The result of applying the matcher
 * 
 * @example
 * ```typescript
 * const coords = [10, 20] as const;
 * const result = matchTuple(coords, (x, y) => `Point at (${x}, ${y})`);
 * // result: "Point at (10, 20)"
 * ```
 */
export function matchTuple<T extends readonly any[], R>(
  tuple: T,
  matcher: (...args: T) => R
): R {
  return matcher(...tuple);
}

/**
 * Pattern matcher for records with field access.
 * 
 * @template T - Record type
 * @template R - Result type
 * @param record - The record to match on
 * @param matcher - Function that receives the record fields
 * @returns The result of applying the matcher
 * 
 * @example
 * ```typescript
 * const user = { id: 1, name: 'Alice' } as const;
 * const result = matchRecord(user, ({ id, name }) => `User ${id}: ${name}`);
 * // result: "User 1: Alice"
 * ```
 */
export function matchRecord<T extends Record<string, any>, R>(
  record: T,
  matcher: (fields: T) => R
): R {
  return matcher(record);
}

// ============================================================================
// Part 3: Curryable Product Matchers
// ============================================================================

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
 * Creates a curryable tuple matcher for reuse.
 * 
 * @template T - Tuple type
 * @template R - Result type
 * @param matcher - The matcher function to curry
 * @returns A function that takes a tuple and applies the matcher
 * 
 * @example
 * ```typescript
 * const formatPoint = createTupleMatcher((x, y) => `(${x}, ${y})`);
 * const point1 = [10, 20] as const;
 * const point2 = [30, 40] as const;
 * 
 * console.log(formatPoint(point1)); // "(10, 20)"
 * console.log(formatPoint(point2)); // "(30, 40)"
 * ```
 */
export function createTupleMatcher<T extends readonly any[], R>(
  matcher: (...args: T) => R
): (tuple: T) => R {
  return (tuple: T) => matchTuple(tuple, matcher);
}

/**
 * Creates a curryable record matcher for reuse.
 * 
 * @template T - Record type
 * @template R - Result type
 * @param matcher - The matcher function to curry
 * @returns A function that takes a record and applies the matcher
 * 
 * @example
 * ```typescript
 * const formatUser = createRecordMatcher(({ id, name }) => `#${id}: ${name}`);
 * const user1 = { id: 1, name: 'Alice' } as const;
 * const user2 = { id: 2, name: 'Bob' } as const;
 * 
 * console.log(formatUser(user1)); // "#1: Alice"
 * console.log(formatUser(user2)); // "#2: Bob"
 * ```
 */
export function createRecordMatcher<T extends Record<string, any>, R>(
  matcher: (fields: T) => R
): (record: T) => R {
  return (record: T) => matchRecord(record, matcher);
}

// ============================================================================
// Part 4: Integration with createProductType
// ============================================================================

/**
 * Creates a pattern matcher that works with createProductType outputs.
 * 
 * @template Builder - ProductTypeBuilder type
 * @template R - Result type
 * @param builder - The product type builder from createProductType
 * @param matcher - Function that receives the product fields
 * @returns A function that takes a product instance and applies the matcher
 * 
 * @example
 * ```typescript
 * const Point = createProductType<{ x: number; y: number }>();
 * const formatPoint = createProductTypeMatcher(Point, ({ x, y }) => `(${x}, ${y})`);
 * 
 * const point = Point.of({ x: 10, y: 20 });
 * console.log(formatPoint(point)); // "(10, 20)"
 * ```
 */
export function createProductTypeMatcher<Builder extends ProductTypeBuilder<any>, R>(
  builder: Builder,
  matcher: (fields: ExtractProductTypeInstance<Builder>) => R
): (product: ExtractProductTypeInstance<Builder>) => R {
  return (product: ExtractProductTypeInstance<Builder>) => matchProduct(product, matcher);
}

// ============================================================================
// Part 5: Type Utilities
// ============================================================================

/**
 * Extract the fields type from a product type builder.
 */
export type ExtractProductFields<Builder> = Builder extends ProductTypeBuilder<infer Fields> ? Fields : never;

/**
 * Extract the instance type from a product type builder.
 */
export type ExtractProductInstance<Builder> = Builder extends ProductTypeBuilder<any> ? ExtractProductTypeInstance<Builder> : never;

/**
 * Curryable product matcher type.
 */
export type CurryableProductMatcher<T, R> = (product: T) => R;

/**
 * Curryable tuple matcher type.
 */
export type CurryableTupleMatcher<T extends readonly any[], R> = (tuple: T) => R;

/**
 * Curryable record matcher type.
 */
export type CurryableRecordMatcher<T extends Record<string, any>, R> = (record: T) => R;

// ============================================================================
// Part 6: Example Usage and Documentation
// ============================================================================

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
  const formatPerson = createProductMatcher(({ name, age }) => 
    `${name} (${age})`
  );
  const person1 = { name: 'Charlie', age: 35 } as const;
  const person2 = { name: 'Diana', age: 28 } as const;
  
  console.log('Curryable 1:', formatPerson(person1)); // "Charlie (35)"
  console.log('Curryable 2:', formatPerson(person2)); // "Diana (28)"
  
  // Example 4: Integration with createProductType
  const Point = createProductType<{ x: number; y: number }>();
  const formatPoint = createProductTypeMatcher(Point, ({ x, y }) => 
    `Point at (${x}, ${y})`
  );
  
  const point = Point.of({ x: 10, y: 20 });
  console.log('Product type:', formatPoint(point)); // "Point at (10, 20)"
}

// ============================================================================
// Part 7: Laws and Properties
// ============================================================================

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