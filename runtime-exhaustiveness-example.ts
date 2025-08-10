/**
 * Example demonstrating runtime exhaustiveness checking in the guards module
 * 
 * This shows how the system warns developers when a tag has empty patterns
 * and no fallback, which may indicate non-exhaustive pattern matching.
 */

import { 
  attachGuards, 
  CommonGuards, 
  on, 
  and, 
  or,
  IsRuntimeExhaustive 
} from './fp-pattern-matching-with-guards-complete';

// Example ADT with different payload shapes
type Shape = 
  | { tag: 'circle'; payload: { radius: number; color: string } }
  | { tag: 'rectangle'; payload: { width: number; height: number; meta: { id: string } } }
  | { tag: 'triangle'; payload: { sides: number[]; name: string } };

// Mock instance that implements the required interface
const mockInstance = {
  getTag: () => 'circle' as const,
  getPayload: () => ({ radius: 5, color: 'red' }),
  tag: 'circle' as const,
  payload: { radius: 5, color: 'red' },
  match: () => 'mock',
  matchTag: () => 'mock',
  is: () => true
};

// Demonstrate the new 'on' projector with arbitrary payload shapes
console.log('=== Demonstrating "on" projector with arbitrary payload shapes ===');

// Example 1: Check radius > 3 and color starts with 'r'
const radiusAndColorGuard = and(
  CommonGuards.gt(3)((p: { radius: number; color: string }) => p.radius),
  CommonGuards.startsWith('r')((p: { radius: number; color: string }) => p.color)
);

console.log('Radius > 3 and color starts with "r":', radiusAndColorGuard({ radius: 5, color: 'red' })); // true
console.log('Radius > 3 and color starts with "r":', radiusAndColorGuard({ radius: 2, color: 'red' })); // false
console.log('Radius > 3 and color starts with "r":', radiusAndColorGuard({ radius: 5, color: 'blue' })); // false

// Example 2: Check if meta.id matches regex pattern
const metaIdGuard = CommonGuards.matches(/^\d+$/)((p: { meta: { id: string } }) => p.meta.id);
console.log('Meta ID is numeric:', metaIdGuard({ meta: { id: '123' } })); // true
console.log('Meta ID is numeric:', metaIdGuard({ meta: { id: 'abc' } })); // false

// Example 3: Complex guard combining multiple projections
const complexGuard = and(
  CommonGuards.gt(10)((p: { width: number; height: number; meta: { id: string } }) => p.width),
  CommonGuards.lt(50)((p: { width: number; height: number; meta: { id: string } }) => p.height),
  CommonGuards.startsWith('rect')((p: { width: number; height: number; meta: { id: string } }) => p.meta.id)
);

console.log('Complex guard (width>10, height<50, id starts with "rect"):', 
  complexGuard({ width: 15, height: 30, meta: { id: 'rect_001' } })); // true

console.log('Complex guard (width>10, height<50, id starts with "rect"):', 
  complexGuard({ width: 5, height: 30, meta: { id: 'rect_001' } })); // false

// Example 4: Array guards with projection
const arrayGuard = and(
  CommonGuards.arrIsNotEmpty((p: { sides: number[]; name: string }) => p.sides),
  CommonGuards.exactArrayLength(3)((p: { sides: number[]; name: string }) => p.sides),
  CommonGuards.strIsNotEmpty((p: { sides: number[]; name: string }) => p.name)
);

console.log('Array guard (sides not empty, exactly 3 sides, name not empty):', 
  arrayGuard({ sides: [3, 4, 5], name: 'triangle' })); // true

console.log('Array guard (sides not empty, exactly 3 sides, name not empty):', 
  arrayGuard({ sides: [3, 4], name: 'triangle' })); // false

// Example 5: Using the old pattern for EnhancedADT instances (still works)
const enhancedInstance = {
  getTag: () => 'circle' as const,
  getPayload: () => ({ radius: 5, color: 'red' }),
  tag: 'circle' as const,
  payload: { radius: 5, color: 'red' },
  match: () => 'mock',
  matchTag: () => 'mock',
  is: () => true
};

// This still works with the old { value: T } pattern
const oldStyleGuard = CommonGuards.gt(3)((p: { value: number }) => p.value);
console.log('Old style guard (value > 3):', oldStyleGuard({ value: 5 })); // true

console.log('\n=== Runtime Exhaustiveness Checking ===');

// Non-exhaustive handlers (will trigger warnings)
const nonExhaustiveHandlers = {
  circle: [], // Empty pattern list - will trigger warning
  rectangle: { patterns: [], fallback: undefined }, // No patterns and no fallback - will trigger warning
  // triangle is missing entirely - will trigger warning
};

// Exhaustive handlers (no warnings)
const exhaustiveHandlers = {
  circle: [
    { condition: radiusAndColorGuard, handler: () => 'Valid circle' },
    { condition: () => true, handler: () => 'Default circle' }
  ],
  rectangle: [
    { condition: complexGuard, handler: () => 'Valid rectangle' },
    { condition: () => true, handler: () => 'Default rectangle' }
  ],
  triangle: [
    { condition: arrayGuard, handler: () => 'Valid triangle' },
    { condition: () => true, handler: () => 'Default triangle' }
  ]
};

try {
  const guardedInstance = attachGuards(enhancedInstance);
  
  // This will trigger runtime exhaustiveness warnings
  console.log('\nTesting non-exhaustive handlers:');
  const result = guardedInstance.matchWithGuards(nonExhaustiveHandlers);
  console.log('Result:', result);
} catch (error) {
  console.log('Expected error:', error.message);
}

try {
  const guardedInstance = attachGuards(enhancedInstance);
  
  // This will work without warnings
  console.log('\nTesting exhaustive handlers:');
  const result2 = guardedInstance.matchWithGuards(exhaustiveHandlers);
  console.log('Result:', result2);
} catch (error) {
  console.log('Unexpected error:', error.message);
}

console.log('\n=== Type-level Runtime Exhaustiveness ===');
console.log('IsRuntimeExhaustive type utility can help identify potential issues at compile time.');

// The IsRuntimeExhaustive type would show:
// - circle: false (empty patterns array)
// - rectangle: false (empty patterns array, no fallback)
// - triangle: true (has patterns)
type ExhaustivenessCheck = IsRuntimeExhaustive<Shape, typeof nonExhaustiveHandlers>; 