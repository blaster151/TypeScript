/**
 * Functional Programming Extensions for Array
 * 
 * This module extends the Array prototype with functional programming methods
 * including foldLeft, foldRight, mapAccumL, mapAccumR, zipWith, groupAdjacentBy, partitionMap, chunkBySize, and intersect for various folding, mapping, combining, grouping, partitioning, chunking, and set operations.
 */

// ============================================================================
// Type Declarations
// ============================================================================

// Helper types for partitionMap
type Left<L> = { _tag: 'Left'; left: L };
type Right<R> = { _tag: 'Right'; right: R };

declare global {
  interface Array<T> {
    /**
     * Left-associative fold (reduce)
     * Folds the array from left to right using the provided function
     * 
     * @param f - The folding function that takes an accumulator and current element
     * @param initial - The initial value for the accumulator
     * @returns The final accumulated value
     * 
     * @example
     * [1, 2, 3].foldLeft((acc, x) => acc + x, 0)  // → 6
     * [1, 2, 3].foldLeft((acc, x) => acc - x, 0)  // → -6
     */
    foldLeft<B>(f: (acc: B, a: T) => B, initial: B): B;

    /**
     * Right-associative fold (reduceRight)
     * Folds the array from right to left using the provided function
     * 
     * @param f - The folding function that takes current element and accumulator
     * @param initial - The initial value for the accumulator
     * @returns The final accumulated value
     * 
     * @example
     * [1, 2, 3].foldRight((x, acc) => acc - x, 0) // → ((0 - 3) - 2) - 1 = -6
     * [1, 2, 3].foldRight((x, acc) => x + acc, 0) // → 1 + (2 + (3 + 0)) = 6
     */
    foldRight<B>(f: (a: T, acc: B) => B, initial: B): B;

    /**
     * Map with left-associative accumulation
     * Maps over the array while threading state from left to right
     * 
     * @param f - The mapping function that takes state and element, returns [newState, mappedValue]
     * @param init - The initial state value
     * @returns A tuple of [finalState, mappedArray]
     * 
     * @example
     * ["a", "b", "c"].mapAccumL((i, char) => [i + 1, `${i}:${char}`], 0)
     * // → [3, ["0:a", "1:b", "2:c"]]
     */
    mapAccumL<B, S>(f: (acc: S, a: T) => [S, B], init: S): [S, B[]];

    /**
     * Map with right-associative accumulation
     * Maps over the array while threading state from right to left
     * 
     * @param f - The mapping function that takes state and element, returns [newState, mappedValue]
     * @param init - The initial state value
     * @returns A tuple of [finalState, mappedArray]
     * 
     * @example
     * ["a", "b", "c"].mapAccumR((i, char) => [i + 1, `${i}:${char}`], 0)
     * // → [3, ["2:c", "1:b", "0:a"]]
     */
    mapAccumR<B, S>(f: (acc: S, a: T) => [S, B], init: S): [S, B[]];

    /**
     * Zip two arrays with a combining function
     * Combines elements from two arrays using the provided function
     * Stops at the length of the shorter array
     * 
     * @param other - The other array to zip with
     * @param f - The combining function that takes elements from both arrays
     * @returns A new array of combined values
     * 
     * @example
     * [1, 2, 3].zipWith(["a", "b", "c"], (n, s) => `${n}${s}`)
     * // → ["1a", "2b", "3c"]
     */
    zipWith<B, C>(other: B[], f: (a: T, b: B) => C): C[];

    /**
     * Group adjacent elements by key
     * Groups consecutive elements that return the same key from the key function
     * Does not group non-contiguous elements even if they share a key
     * 
     * @param keyFn - The function that extracts a key from each element
     * @returns An array of arrays, where each inner array contains consecutive elements with the same key
     * 
     * @example
     * [1, 1, 2, 2, 2, 1].groupAdjacentBy(x => x)
     * // → [[1, 1], [2, 2, 2], [1]]
     */
    groupAdjacentBy<K>(keyFn: (item: T) => K): T[][];

    /**
     * Partition array based on a function that returns Left or Right
     * Splits the array into two arrays based on whether the function returns Left or Right
     * 
     * @param f - The function that maps each element to either Left<L> or Right<R>
     * @returns A tuple of [L[], R[]] where L[] contains all left values and R[] contains all right values
     * 
     * @example
     * [1, 2, 3, 4].partitionMap(x =>
     *   x % 2 === 0 ? Right(x * 2) : Left(`odd:${x}`)
     * )
     * // → [['odd:1', 'odd:3'], [4, 8]]
     */
    partitionMap<L, R>(f: (item: T) => Left<L> | Right<R>): [L[], R[]];

    /**
     * Break array into chunks of specified size
     * Splits the array into chunks of the given size, with the final chunk potentially being smaller
     * 
     * @param size - The size of each chunk (must be positive)
     * @returns An array of arrays, where each inner array has at most 'size' elements
     * 
     * @example
     * [1, 2, 3, 4, 5].chunkBySize(2)
     * // → [[1, 2], [3, 4], [5]]
     */
    chunkBySize(size: number): T[][];

    /**
     * Return intersection of two arrays
     * Returns a new array containing only the values present in both arrays, preserving the order from the original
     * 
     * @param other - The other array to intersect with
     * @returns A new array containing only the values present in both arrays
     * 
     * @example
     * [1, 2, 3, 4].intersect([2, 4, 6])
     * // → [2, 4]
     */
    intersect(other: T[]): T[];
  }
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Stack-safe left-associative fold implementation
 * Uses a loop instead of recursion to avoid stack overflow
 */
function foldLeftImpl<T, B>(arr: T[], f: (acc: B, a: T) => B, initial: B): B {
  let accumulator = initial;
  
  for (let i = 0; i < arr.length; i++) {
    accumulator = f(accumulator, arr[i]);
  }
  
  return accumulator;
}

/**
 * Stack-safe right-associative fold implementation
 * Uses a loop instead of recursion to avoid stack overflow
 */
function foldRightImpl<T, B>(arr: T[], f: (a: T, acc: B) => B, initial: B): B {
  let accumulator = initial;
  
  for (let i = arr.length - 1; i >= 0; i--) {
    accumulator = f(arr[i], accumulator);
  }
  
  return accumulator;
}

/**
 * Stack-safe left-associative map with accumulation implementation
 * Maps over the array while threading state from left to right
 */
function mapAccumLImpl<T, B, S>(arr: T[], f: (acc: S, a: T) => [S, B], init: S): [S, B[]] {
  let state = init;
  const result: B[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    const [newState, mappedValue] = f(state, arr[i]);
    state = newState;
    result.push(mappedValue);
  }
  
  return [state, result];
}

/**
 * Stack-safe right-associative map with accumulation implementation
 * Maps over the array while threading state from right to left
 */
function mapAccumRImpl<T, B, S>(arr: T[], f: (acc: S, a: T) => [S, B], init: S): [S, B[]] {
  let state = init;
  const result: B[] = [];
  
  for (let i = arr.length - 1; i >= 0; i--) {
    const [newState, mappedValue] = f(state, arr[i]);
    state = newState;
    result.unshift(mappedValue); // Insert at beginning to maintain order
  }
  
  return [state, result];
}

/**
 * Zip two arrays with a combining function implementation
 * Combines elements from two arrays using the provided function
 */
function zipWithImpl<T, B, C>(arr1: T[], arr2: B[], f: (a: T, b: B) => C): C[] {
  const result: C[] = [];
  const minLength = Math.min(arr1.length, arr2.length);
  
  for (let i = 0; i < minLength; i++) {
    result.push(f(arr1[i], arr2[i]));
  }
  
  return result;
}

/**
 * Group adjacent elements by key implementation
 * Groups consecutive elements that return the same key from the key function
 */
function groupAdjacentByImpl<T, K>(arr: T[], keyFn: (item: T) => K): T[][] {
  if (arr.length === 0) {
    return [];
  }
  
  const result: T[][] = [];
  let currentGroup: T[] = [arr[0]];
  let currentKey = keyFn(arr[0]);
  
  for (let i = 1; i < arr.length; i++) {
    const item = arr[i];
    const key = keyFn(item);
    
    if (key === currentKey) {
      // Same key, add to current group
      currentGroup.push(item);
    } else {
      // Different key, start new group
      result.push(currentGroup);
      currentGroup = [item];
      currentKey = key;
    }
  }
  
  // Don't forget the last group
  result.push(currentGroup);
  
  return result;
}

/**
 * Partition array based on Left/Right function implementation
 * Splits the array into two arrays based on whether the function returns Left or Right
 */
function partitionMapImpl<T, L, R>(arr: T[], f: (item: T) => Left<L> | Right<R>): [L[], R[]] {
  const lefts: L[] = [];
  const rights: R[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    const result = f(arr[i]);
    if (result._tag === 'Left') {
      lefts.push(result.left);
    } else {
      rights.push(result.right);
    }
  }
  
  return [lefts, rights];
}

/**
 * Break array into chunks of specified size implementation
 * Splits the array into chunks of the given size
 */
function chunkBySizeImpl<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be positive');
  }
  
  if (arr.length === 0) {
    return [];
  }
  
  const result: T[][] = [];
  
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  
  return result;
}

/**
 * Return intersection of two arrays implementation
 * Returns a new array containing only the values present in both arrays, preserving the order from the original
 */
function intersectImpl<T>(arr1: T[], arr2: T[]): T[] {
  if (arr1.length === 0 || arr2.length === 0) {
    return [];
  }
  
  // Create a Set from the second array for O(1) lookup
  const set2 = new Set(arr2);
  const result: T[] = [];
  
  // Iterate through the first array and check if each element exists in the second array
  for (let i = 0; i < arr1.length; i++) {
    const item = arr1[i];
    if (set2.has(item)) {
      result.push(item);
      // Remove from set to handle duplicates correctly
      set2.delete(item);
    }
  }
  
  return result;
}

// ============================================================================
// Array Prototype Extensions
// ============================================================================

/**
 * Extend Array prototype with functional programming methods
 * This function should be called once to set up the extensions
 */
export function extendArrayPrototype(): void {
  // Only extend if methods don't already exist
  if (!Array.prototype.foldLeft) {
    Array.prototype.foldLeft = function<T, B>(f: (acc: B, a: T) => B, initial: B): B {
      return foldLeftImpl(this, f, initial);
    };
  }

  if (!Array.prototype.foldRight) {
    Array.prototype.foldRight = function<T, B>(f: (a: T, acc: B) => B, initial: B): B {
      return foldRightImpl(this, f, initial);
    };
  }

  if (!Array.prototype.mapAccumL) {
    Array.prototype.mapAccumL = function<T, B, S>(f: (acc: S, a: T) => [S, B], init: S): [S, B[]] {
      return mapAccumLImpl(this, f, init);
    };
  }

  if (!Array.prototype.mapAccumR) {
    Array.prototype.mapAccumR = function<T, B, S>(f: (acc: S, a: T) => [S, B], init: S): [S, B[]] {
      return mapAccumRImpl(this, f, init);
    };
  }

  if (!Array.prototype.zipWith) {
    Array.prototype.zipWith = function<T, B, C>(other: B[], f: (a: T, b: B) => C): C[] {
      return zipWithImpl(this, other, f);
    };
  }

  if (!Array.prototype.groupAdjacentBy) {
    Array.prototype.groupAdjacentBy = function<T, K>(keyFn: (item: T) => K): T[][] {
      return groupAdjacentByImpl(this, keyFn);
    };
  }

  if (!Array.prototype.partitionMap) {
    Array.prototype.partitionMap = function<T, L, R>(f: (item: T) => Left<L> | Right<R>): [L[], R[]] {
      return partitionMapImpl(this, f);
    };
  }

  if (!Array.prototype.chunkBySize) {
    Array.prototype.chunkBySize = function<T>(size: number): T[][] {
      return chunkBySizeImpl(this, size);
    };
  }

  if (!Array.prototype.intersect) {
    Array.prototype.intersect = function<T>(other: T[]): T[] {
      return intersectImpl(this, other);
    };
  }
}

/**
 * Remove Array prototype extensions
 * This function can be used to clean up the extensions if needed
 */
export function removeArrayPrototypeExtensions(): void {
  if (Array.prototype.foldLeft) {
    delete Array.prototype.foldLeft;
  }
  
  if (Array.prototype.foldRight) {
    delete Array.prototype.foldRight;
  }

  if (Array.prototype.mapAccumL) {
    delete Array.prototype.mapAccumL;
  }

  if (Array.prototype.mapAccumR) {
    delete Array.prototype.mapAccumR;
  }

  if (Array.prototype.zipWith) {
    delete Array.prototype.zipWith;
  }

  if (Array.prototype.groupAdjacentBy) {
    delete Array.prototype.groupAdjacentBy;
  }

  if (Array.prototype.partitionMap) {
    delete Array.prototype.partitionMap;
  }

  if (Array.prototype.chunkBySize) {
    delete Array.prototype.chunkBySize;
  }

  if (Array.prototype.intersect) {
    delete Array.prototype.intersect;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Pure function version of foldLeft
 * Does not modify the array prototype
 */
export function foldLeft<T, B>(arr: T[], f: (acc: B, a: T) => B, initial: B): B {
  return foldLeftImpl(arr, f, initial);
}

/**
 * Pure function version of foldRight
 * Does not modify the array prototype
 */
export function foldRight<T, B>(arr: T[], f: (a: T, acc: B) => B, initial: B): B {
  return foldRightImpl(arr, f, initial);
}

/**
 * Pure function version of mapAccumL
 * Does not modify the array prototype
 */
export function mapAccumL<T, B, S>(arr: T[], f: (acc: S, a: T) => [S, B], init: S): [S, B[]] {
  return mapAccumLImpl(arr, f, init);
}

/**
 * Pure function version of mapAccumR
 * Does not modify the array prototype
 */
export function mapAccumR<T, B, S>(arr: T[], f: (acc: S, a: T) => [S, B], init: S): [S, B[]] {
  return mapAccumRImpl(arr, f, init);
}

/**
 * Pure function version of zipWith
 * Does not modify the array prototype
 */
export function zipWith<T, B, C>(arr1: T[], arr2: B[], f: (a: T, b: B) => C): C[] {
  return zipWithImpl(arr1, arr2, f);
}

/**
 * Pure function version of groupAdjacentBy
 * Does not modify the array prototype
 */
export function groupAdjacentBy<T, K>(arr: T[], keyFn: (item: T) => K): T[][] {
  return groupAdjacentByImpl(arr, keyFn);
}

/**
 * Pure function version of partitionMap
 * Does not modify the array prototype
 */
export function partitionMap<T, L, R>(arr: T[], f: (item: T) => Left<L> | Right<R>): [L[], R[]] {
  return partitionMapImpl(arr, f);
}

/**
 * Pure function version of chunkBySize
 * Does not modify the array prototype
 */
export function chunkBySize<T>(arr: T[], size: number): T[][] {
  return chunkBySizeImpl(arr, size);
}

/**
 * Pure function version of intersect
 * Does not modify the array prototype
 */
export function intersect<T>(arr1: T[], arr2: T[]): T[] {
  return intersectImpl(arr1, arr2);
}

// ============================================================================
// Helper Functions for partitionMap
// ============================================================================

/**
 * Create a Left value
 * @param left - The left value
 * @returns A Left object
 */
export const Left = <L>(left: L): Left<L> => ({ _tag: 'Left', left });

/**
 * Create a Right value
 * @param right - The right value
 * @returns A Right object
 */
export const Right = <R>(right: R): Right<R> => ({ _tag: 'Right', right });

// ============================================================================
// Auto-initialization
// ============================================================================

// Automatically extend Array prototype when this module is imported
extendArrayPrototype();
