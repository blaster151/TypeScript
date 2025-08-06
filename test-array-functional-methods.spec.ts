/**
 * Test suite for Array functional programming methods
 * 
 * Tests all the functional programming extensions for Array prototype:
 * - foldLeft, foldRight
 * - mapAccumL, mapAccumR
 * - zipWith
 * - groupAdjacentBy
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

    test('should handle large arrays (stack safety)', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const result = largeArray.foldLeft((acc, x) => acc + x, 0);
      expect(result).toBe(49995000); // sum of 0 to 9999
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

    test('should handle large arrays (stack safety)', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const result = largeArray.foldRight((x, acc) => x + acc, 0);
      expect(result).toBe(49995000); // sum of 0 to 9999
    });
  });
});

// ============================================================================
// mapAccumL Tests
// ============================================================================

describe('Array.prototype.mapAccumL', () => {
  describe('Basic functionality', () => {
    test('should map with left-associative accumulation', () => {
      const result = strings.mapAccumL((i, char) => [i + 1, `${i}:${char}`], 0);
      expect(result).toEqual([3, ['0:a', '1:b', '2:c']]);
    });

    test('should work with number accumulation', () => {
      const result = numbers.mapAccumL((sum, n) => [sum + n, n * 2], 0);
      expect(result).toEqual([15, [2, 4, 6, 8, 10]]);
    });

    test('should work with string accumulation', () => {
      const result = strings.mapAccumL((acc, s) => [acc + s, s.toUpperCase()], '');
      expect(result).toEqual(['abc', ['A', 'B', 'C']]);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty arrays', () => {
      const result = emptyArray.mapAccumL((acc, x) => [acc + x, x * 2], 0);
      expect(result).toEqual([0, []]);
    });

    test('should handle single element arrays', () => {
      const result = singleElement.mapAccumL((acc, x) => [acc + x, x * 2], 0);
      expect(result).toEqual([42, [84]]);
    });

    test('should handle large arrays (stack safety)', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const result = largeArray.mapAccumL((acc, x) => [acc + x, x * 2], 0);
      expect(result[0]).toBe(499500); // sum of 0 to 999
      expect(result[1].length).toBe(1000);
    });
  });
});

// ============================================================================
// mapAccumR Tests
// ============================================================================

describe('Array.prototype.mapAccumR', () => {
  describe('Basic functionality', () => {
    test('should map with right-associative accumulation', () => {
      const result = strings.mapAccumR((i, char) => [i + 1, `${i}:${char}`], 0);
      expect(result).toEqual([3, ['2:c', '1:b', '0:a']]);
    });

    test('should work with number accumulation', () => {
      const result = numbers.mapAccumR((sum, n) => [sum + n, n * 2], 0);
      expect(result).toEqual([15, [10, 8, 6, 4, 2]]);
    });

    test('should work with string accumulation', () => {
      const result = strings.mapAccumR((acc, s) => [acc + s, s.toUpperCase()], '');
      expect(result).toEqual(['cba', ['C', 'B', 'A']]);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty arrays', () => {
      const result = emptyArray.mapAccumR((acc, x) => [acc + x, x * 2], 0);
      expect(result).toEqual([0, []]);
    });

    test('should handle single element arrays', () => {
      const result = singleElement.mapAccumR((acc, x) => [acc + x, x * 2], 0);
      expect(result).toEqual([42, [84]]);
    });

    test('should handle large arrays (stack safety)', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const result = largeArray.mapAccumR((acc, x) => [acc + x, x * 2], 0);
      expect(result[0]).toBe(499500); // sum of 0 to 999
      expect(result[1].length).toBe(1000);
    });
  });
});

// ============================================================================
// zipWith Tests
// ============================================================================

describe('Array.prototype.zipWith', () => {
  describe('Basic functionality', () => {
    test('should zip arrays with combining function', () => {
      const result = numbers.zipWith(strings, (n, s) => `${n}${s}`);
      expect(result).toEqual(['1a', '2b', '3c']);
    });

    test('should work with different types', () => {
      const result = [1, 2, 3].zipWith(['a', 'b', 'c'], (n, s) => ({ num: n, str: s }));
      expect(result).toEqual([
        { num: 1, str: 'a' },
        { num: 2, str: 'b' },
        { num: 3, str: 'c' }
      ]);
    });

    test('should work with mathematical operations', () => {
      const result = [1, 2, 3].zipWith([4, 5, 6], (a, b) => a + b);
      expect(result).toEqual([5, 7, 9]);
    });
  });

  describe('Edge cases', () => {
    test('should handle arrays of different lengths', () => {
      const result = [1, 2, 3, 4].zipWith(['a', 'b'], (n, s) => `${n}${s}`);
      expect(result).toEqual(['1a', '2b']);
    });

    test('should handle empty arrays', () => {
      const result = emptyArray.zipWith([1, 2, 3], (a, b) => a + b);
      expect(result).toEqual([]);
    });

    test('should handle both arrays empty', () => {
      const result = emptyArray.zipWith([], (a, b) => a + b);
      expect(result).toEqual([]);
    });

    test('should handle single element arrays', () => {
      const result = [1].zipWith(['a'], (n, s) => `${n}${s}`);
      expect(result).toEqual(['1a']);
    });
  });
});

// ============================================================================
// groupAdjacentBy Tests
// ============================================================================

describe('Array.prototype.groupAdjacentBy', () => {
  describe('Basic functionality', () => {
    test('should group adjacent elements by identity', () => {
      const result = [1, 1, 2, 2, 2, 1].groupAdjacentBy(x => x);
      expect(result).toEqual([[1, 1], [2, 2, 2], [1]]);
    });

    test('should group adjacent elements by key function', () => {
      const result = ['a', 'a', 'b', 'b', 'b', 'a'].groupAdjacentBy(s => s);
      expect(result).toEqual([['a', 'a'], ['b', 'b', 'b'], ['a']]);
    });

    test('should group by computed key', () => {
      const result = [1, 2, 3, 4, 5, 6].groupAdjacentBy(n => n % 2);
      expect(result).toEqual([[1], [2], [3], [4], [5], [6]]);
    });

    test('should group by object property', () => {
      const items = [
        { type: 'A', value: 1 },
        { type: 'A', value: 2 },
        { type: 'B', value: 3 },
        { type: 'B', value: 4 },
        { type: 'A', value: 5 }
      ];
      const result = items.groupAdjacentBy(item => item.type);
      expect(result).toEqual([
        [{ type: 'A', value: 1 }, { type: 'A', value: 2 }],
        [{ type: 'B', value: 3 }, { type: 'B', value: 4 }],
        [{ type: 'A', value: 5 }]
      ]);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty arrays', () => {
      const result = emptyArray.groupAdjacentBy(x => x);
      expect(result).toEqual([]);
    });

    test('should handle single element arrays', () => {
      const result = singleElement.groupAdjacentBy(x => x);
      expect(result).toEqual([[42]]);
    });

    test('should handle all elements with same key', () => {
      const result = [1, 1, 1, 1].groupAdjacentBy(x => x);
      expect(result).toEqual([[1, 1, 1, 1]]);
    });

    test('should handle all elements with different keys', () => {
      const result = [1, 2, 3, 4].groupAdjacentBy(x => x);
      expect(result).toEqual([[1], [2], [3], [4]]);
    });

    test('should handle null and undefined keys', () => {
      const result = [1, null, 2, undefined, 3].groupAdjacentBy(x => x);
      expect(result).toEqual([[1], [null], [2], [undefined], [3]]);
    });
  });

  describe('Complex scenarios', () => {
    test('should group by string length', () => {
      const words = ['a', 'bb', 'ccc', 'dd', 'eee', 'f'];
      const result = words.groupAdjacentBy(word => word.length);
      expect(result).toEqual([
        ['a'],
        ['bb'],
        ['ccc'],
        ['dd'],
        ['eee'],
        ['f']
      ]);
    });

    test('should group by boolean values', () => {
      const values = [true, true, false, false, true, false];
      const result = values.groupAdjacentBy(x => x);
      expect(result).toEqual([
        [true, true],
        [false, false],
        [true],
        [false]
      ]);
    });
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

  test('should chain multiple functional methods', () => {
    const result = [1, 2, 3, 4, 5, 6]
      .groupAdjacentBy(x => x % 2)
      .map(group => group.foldLeft((acc, x) => acc + x, 0))
      .zipWith(['even', 'odd'], (sum, label) => `${label}: ${sum}`);
    
    expect(result).toEqual(['even: 2', 'odd: 3']);
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

  test('should handle large grouping operations', () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => i % 10);
    
    const startTime = Date.now();
    const result = largeArray.groupAdjacentBy(x => x);
    const endTime = Date.now();
    
    expect(result.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
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

  test('should handle invalid zipWith inputs', () => {
    expect(() => {
      numbers.zipWith(null as any, (a, b) => a + b);
    }).toThrow();
  });
});
