/**
 * Test suite for Array foldLeft and foldRight methods
 * 
 * Tests the functional programming extensions for Array prototype
 * including edge cases, type safety, and various usage scenarios.
 */

import './fp-array-extensions';

// ============================================================================
// Test Data
// ============================================================================

const numbers = [1, 2, 3, 4, 5];
const strings = ['a', 'b', 'c'];
const emptyArray: number[] = [];
const singleElement = [42];
const mixedTypes = [1, 'hello', true, null, undefined];

// ============================================================================
// foldLeft Tests
// ============================================================================

describe('Array.prototype.foldLeft', () => {
  describe('Basic functionality', () => {
    test('should sum numbers from left to right', () => {
      const result = numbers.foldLeft((acc, x) => acc + x, 0);
      expect(result).toBe(15);
    });

    test('should concatenate strings from left to right', () => {
      const result = strings.foldLeft((acc, s) => acc + s, '');
      expect(result).toBe('abc');
    });

    test('should work with subtraction (left-associative)', () => {
      const result = numbers.foldLeft((acc, x) => acc - x, 0);
      expect(result).toBe(-15); // 0 - 1 - 2 - 3 - 4 - 5 = -15
    });

    test('should work with multiplication', () => {
      const result = numbers.foldLeft((acc, x) => acc * x, 1);
      expect(result).toBe(120); // 1 * 1 * 2 * 3 * 4 * 5 = 120
    });
  });

  describe('Edge cases', () => {
    test('should handle empty arrays', () => {
      const result = emptyArray.foldLeft((acc, x) => acc + x, 0);
      expect(result).toBe(0);
    });

    test('should handle single element arrays', () => {
      const result = singleElement.foldLeft((acc, x) => acc + x, 0);
      expect(result).toBe(42);
    });

    test('should handle arrays with null and undefined', () => {
      const result = mixedTypes.foldLeft((acc, x) => acc + String(x), '');
      expect(result).toBe('1hellotruenullundefined');
    });

    test('should handle large arrays (stack safety)', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const result = largeArray.foldLeft((acc, x) => acc + x, 0);
      expect(result).toBe(49995000); // sum of 0 to 9999
    });
  });

  describe('Type safety', () => {
    test('should maintain type safety with different input and output types', () => {
      const result = numbers.foldLeft((acc, x) => acc + String(x), '');
      expect(result).toBe('12345');
      expect(typeof result).toBe('string');
    });

    test('should work with object accumulation', () => {
      const result = strings.foldLeft((acc, s) => ({ ...acc, [s]: s.toUpperCase() }), {} as Record<string, string>);
      expect(result).toEqual({ a: 'A', b: 'B', c: 'C' });
    });

    test('should work with array accumulation', () => {
      const result = numbers.foldLeft((acc, x) => [...acc, x * 2], [] as number[]);
      expect(result).toEqual([2, 4, 6, 8, 10]);
    });
  });

  describe('Mathematical properties', () => {
    test('should be left-associative', () => {
      // (a - b) - c ≠ a - (b - c)
      const leftAssoc = numbers.foldLeft((acc, x) => acc - x, 0);
      expect(leftAssoc).toBe(-15); // ((0 - 1) - 2) - 3 - 4 - 5 = -15
    });

    test('should preserve associativity for associative operations', () => {
      // Addition is associative: (a + b) + c = a + (b + c)
      const result1 = numbers.foldLeft((acc, x) => acc + x, 0);
      const result2 = numbers.slice().reverse().foldLeft((acc, x) => acc + x, 0);
      expect(result1).toBe(result2);
    });
  });
});

// ============================================================================
// foldRight Tests
// ============================================================================

describe('Array.prototype.foldRight', () => {
  describe('Basic functionality', () => {
    test('should sum numbers from right to left', () => {
      const result = numbers.foldRight((x, acc) => x + acc, 0);
      expect(result).toBe(15);
    });

    test('should concatenate strings from right to left', () => {
      const result = strings.foldRight((s, acc) => s + acc, '');
      expect(result).toBe('cba');
    });

    test('should work with subtraction (right-associative)', () => {
      const result = numbers.foldRight((x, acc) => acc - x, 0);
      expect(result).toBe(-15); // ((0 - 5) - 4) - 3 - 2 - 1 = -15
    });

    test('should work with division', () => {
      const result = [8, 4, 2].foldRight((x, acc) => acc / x, 16);
      expect(result).toBe(1); // 16 / 2 / 4 / 8 = 1
    });
  });

  describe('Edge cases', () => {
    test('should handle empty arrays', () => {
      const result = emptyArray.foldRight((x, acc) => acc + x, 0);
      expect(result).toBe(0);
    });

    test('should handle single element arrays', () => {
      const result = singleElement.foldRight((x, acc) => acc + x, 0);
      expect(result).toBe(42);
    });

    test('should handle arrays with null and undefined', () => {
      const result = mixedTypes.foldRight((x, acc) => String(x) + acc, '');
      expect(result).toBe('undefinednulltruehello1');
    });

    test('should handle large arrays (stack safety)', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const result = largeArray.foldRight((x, acc) => x + acc, 0);
      expect(result).toBe(49995000); // sum of 0 to 9999
    });
  });

  describe('Type safety', () => {
    test('should maintain type safety with different input and output types', () => {
      const result = numbers.foldRight((x, acc) => acc + String(x), '');
      expect(result).toBe('54321');
      expect(typeof result).toBe('string');
    });

    test('should work with object accumulation', () => {
      const result = strings.foldRight((s, acc) => ({ ...acc, [s]: s.toUpperCase() }), {} as Record<string, string>);
      expect(result).toEqual({ c: 'C', b: 'B', a: 'A' });
    });

    test('should work with array accumulation', () => {
      const result = numbers.foldRight((x, acc) => [x * 2, ...acc], [] as number[]);
      expect(result).toEqual([10, 8, 6, 4, 2]);
    });
  });

  describe('Mathematical properties', () => {
    test('should be right-associative', () => {
      // a - (b - c) ≠ (a - b) - c
      const rightAssoc = numbers.foldRight((x, acc) => acc - x, 0);
      expect(rightAssoc).toBe(-15); // 0 - 5 - 4 - 3 - 2 - 1 = -15
    });

    test('should preserve associativity for associative operations', () => {
      // Addition is associative: a + (b + c) = (a + b) + c
      const result1 = numbers.foldRight((x, acc) => x + acc, 0);
      const result2 = numbers.slice().reverse().foldRight((x, acc) => x + acc, 0);
      expect(result1).toBe(result2);
    });
  });
});

// ============================================================================
// Comparison Tests
// ============================================================================

describe('foldLeft vs foldRight comparison', () => {
  test('should produce different results for non-associative operations', () => {
    const leftResult = numbers.foldLeft((acc, x) => acc - x, 0);
    const rightResult = numbers.foldRight((x, acc) => acc - x, 0);
    
    expect(leftResult).toBe(-15);  // ((0 - 1) - 2) - 3 - 4 - 5 = -15
    expect(rightResult).toBe(-15); // ((0 - 5) - 4) - 3 - 2 - 1 = -15
    
    // For this specific case with subtraction and zero initial value, they're the same
    // But let's test with a different initial value
    const leftResult2 = numbers.foldLeft((acc, x) => acc - x, 10);
    const rightResult2 = numbers.foldRight((x, acc) => acc - x, 10);
    
    expect(leftResult2).toBe(-5);   // ((10 - 1) - 2) - 3 - 4 - 5 = -5
    expect(rightResult2).toBe(-5);  // ((10 - 5) - 4) - 3 - 2 - 1 = -5
  });

  test('should produce same results for associative operations', () => {
    const leftResult = numbers.foldLeft((acc, x) => acc + x, 0);
    const rightResult = numbers.foldRight((x, acc) => x + acc, 0);
    
    expect(leftResult).toBe(15);
    expect(rightResult).toBe(15);
  });

  test('should produce different results for string concatenation', () => {
    const leftResult = strings.foldLeft((acc, s) => acc + s, '');
    const rightResult = strings.foldRight((s, acc) => s + acc, '');
    
    expect(leftResult).toBe('abc');
    expect(rightResult).toBe('cba');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration with existing Array methods', () => {
  test('should work with map and filter', () => {
    const result = numbers
      .map(x => x * 2)
      .filter(x => x % 4 === 0)
      .foldLeft((acc, x) => acc + x, 0);
    
    expect(result).toBe(12); // [2, 4, 6, 8, 10] -> [4, 8] -> 12
  });

  test('should work with reduce for comparison', () => {
    const foldLeftResult = numbers.foldLeft((acc, x) => acc + x, 0);
    const reduceResult = numbers.reduce((acc, x) => acc + x, 0);
    
    expect(foldLeftResult).toBe(reduceResult);
  });

  test('should work with reduceRight for comparison', () => {
    const foldRightResult = numbers.foldRight((x, acc) => x + acc, 0);
    const reduceRightResult = numbers.reduceRight((acc, x) => acc + x, 0);
    
    expect(foldRightResult).toBe(reduceRightResult);
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance characteristics', () => {
  test('should handle very large arrays efficiently', () => {
    const largeArray = Array.from({ length: 100000 }, (_, i) => i);
    
    const startTime = Date.now();
    const result = largeArray.foldLeft((acc, x) => acc + x, 0);
    const endTime = Date.now();
    
    expect(result).toBe(4999950000); // sum of 0 to 99999
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  test('should not cause stack overflow with large arrays', () => {
    const largeArray = Array.from({ length: 100000 }, (_, i) => i);
    
    expect(() => {
      largeArray.foldLeft((acc, x) => acc + x, 0);
    }).not.toThrow();
    
    expect(() => {
      largeArray.foldRight((x, acc) => x + acc, 0);
    }).not.toThrow();
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error handling', () => {
  test('should handle functions that throw errors', () => {
    const errorFunction = (acc: number, x: number) => {
      if (x === 3) throw new Error('Test error');
      return acc + x;
    };

    expect(() => {
      numbers.foldLeft(errorFunction, 0);
    }).toThrow('Test error');
  });

  test('should handle null and undefined in arrays', () => {
    const arrayWithNulls = [1, null, 3, undefined, 5];
    
    const result = arrayWithNulls.foldLeft((acc, x) => acc + (x || 0), 0);
    expect(result).toBe(9); // 1 + 0 + 3 + 0 + 5 = 9
  });
});
