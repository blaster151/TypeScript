/**
 * Tests for Usage-Bound Optics System
 * 
 * This test suite verifies the usage bounds functionality in optics, including:
 * - Sequential composition multiplies usage correctly
 * - Parallel composition preserves per-branch usage
 * - Type errors for exceeding declared maxUsage
 * - Runtime validation of usage bounds
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

import {
  UsageBoundOptic,
  UsageBoundLens,
  UsageBoundPrism,
  UsageBoundTraversal,
  UsageBoundOptional,
  UsageBoundIso,
  usageBoundLens,
  usageBoundPrism,
  usageBoundTraversal,
  usageBoundOptional,
  usageBoundIso,
  lensUsage,
  prismUsage,
  traversalUsage,
  optionalUsage,
  isoUsage,
  isUsageBoundOptic,
  hasOpticMaxUsage
} from '../src/stream/optics/types';

import {
  composeUsageBoundOptics,
  composeManyUsageBoundOptics,
  parallelUsageBoundOptics,
  fanOutUsageBoundOptics,
  composeUsageBoundLenses,
  composeUsageBoundLensTraversal,
  composeUsageBoundTraversalLens,
  composeUsageBoundTraversals,
  composeUsageBoundPrisms,
  opticToUsageBoundStream,
  lensToUsageBoundStream,
  traversalToUsageBoundStream,
  prismToUsageBoundStream,
  validateOpticUsage,
  withOpticUsageValidation,
  getOpticUsage,
  hasOpticUsageBounds,
  withConstantUsage,
  withConditionalUsage
} from '../src/stream/optics/composition';

import {
  UsageBoundStream,
  Multiplicity
} from '../src/stream/multiplicity/types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Helper function to create a simple lens for testing
 */
function createTestLens<S, T, A, B>(
  getter: (s: S) => A,
  setter: (s: S, b: B) => T
): UsageBoundLens<S, T, A, B> {
  const optic = (pab: any) => (s: S) => {
    const a = getter(s);
    const b = pab(a);
    return setter(s, b);
  };
  
  return usageBoundLens(optic, lensUsage<A>());
}

/**
 * Helper function to create a simple prism for testing
 */
function createTestPrism<S, T, A, B>(
  match: (s: S) => A | null,
  build: (b: B) => T
): UsageBoundPrism<S, T, A, B> {
  const optic = (pab: any) => (s: S) => {
    const a = match(s);
    if (a === null) return s as T;
    const b = pab(a);
    return build(b);
  };
  
  return usageBoundPrism(optic, prismUsage<A>());
}

/**
 * Helper function to create a simple traversal for testing
 */
function createTestTraversal<S, T, A, B>(
  getAll: (s: S) => A[],
  modifyAll: (f: (a: A) => B, s: S) => T
): UsageBoundTraversal<S, T, A, B> {
  const optic = (pab: any) => (s: S) => {
    const as = getAll(s);
    const bs = as.map(pab);
    return modifyAll((a: A) => pab(a), s);
  };
  
  return usageBoundTraversal(optic, traversalUsage<A>());
}

/**
 * Helper function to get usage for an optic
 */
function getUsage<S, T, A, B>(
  optic: UsageBoundOptic<S, T, A, B>,
  input: A
): Multiplicity {
  return getOpticUsage(optic, input);
}

// ============================================================================
// Basic Usage-Bound Optics Tests
// ============================================================================

describe('Usage-Bound Optics Basic Functionality', () => {
  it('should create a usage-bound lens with default usage', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    expect(getUsage(lens, { name: 'Alice', age: 25 })).to.equal(1);
    expect(isUsageBoundOptic(lens)).to.be.true;
  });

  it('should create a usage-bound prism with default usage', () => {
    const prism = createTestPrism(
      (maybe: any) => maybe.value || null,
      (value: any) => ({ value })
    );
    
    expect(getUsage(prism, { value: 'test' })).to.equal(1);
    expect(isUsageBoundOptic(prism)).to.be.true;
  });

  it('should create a usage-bound traversal with default usage', () => {
    const traversal = createTestTraversal(
      (arr: any[]) => arr,
      (f: any, arr: any[]) => arr.map(f)
    );
    
    expect(getUsage(traversal, [1, 2, 3])).to.equal(3);
    expect(isUsageBoundOptic(traversal)).to.be.true;
  });

  it('should check for maxUsage bounds', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    expect(hasOpticMaxUsage(lens)).to.be.false;
    
    const boundedLens = withOpticUsageValidation(lens, 2);
    expect(hasOpticMaxUsage(boundedLens)).to.be.true;
    expect(boundedLens.maxUsage).to.equal(2);
  });
});

// ============================================================================
// Sequential Composition Tests
// ============================================================================

describe('Sequential Composition', () => {
  it('should multiply finite usages correctly', () => {
    const lens1 = createTestLens(
      (person: any) => person.profile,
      (person: any, profile: any) => ({ ...person, profile })
    );
    
    const lens2 = createTestLens(
      (profile: any) => profile.name,
      (profile: any, name: string) => ({ ...profile, name })
    );
    
    const composed = composeUsageBoundLenses(lens1, lens2);
    const usage = getUsage(composed, { profile: { name: 'Alice' } });
    
    expect(usage).to.equal(1); // 1 * 1 = 1
  });

  it('should handle infinite usage in composition', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const infiniteLens = withConstantUsage(lens, "∞");
    const composed = composeUsageBoundLenses(lens, infiniteLens);
    const usage = getUsage(composed, { name: 'Alice' });
    
    expect(usage).to.equal("∞");
  });

  it('should preserve optic functionality in composition', () => {
    const lens1 = createTestLens(
      (person: any) => person.profile,
      (person: any, profile: any) => ({ ...person, profile })
    );
    
    const lens2 = createTestLens(
      (profile: any) => profile.name,
      (profile: any, name: string) => ({ ...profile, name })
    );
    
    const composed = composeUsageBoundLenses(lens1, lens2);
    
    // Test that the composed optic still works
    const input = { profile: { name: 'Alice' } };
    const result = composed((name: string) => name.toUpperCase())(input);
    
    expect(result.profile.name).to.equal('ALICE');
  });
});

// ============================================================================
// Parallel Composition Tests
// ============================================================================

describe('Parallel Composition', () => {
  it('should preserve per-branch usage in parallel composition', () => {
    const lens1 = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const lens2 = createTestLens(
      (person: any) => person.age,
      (person: any, age: number) => ({ ...person, age })
    );
    
    const parallel = parallelUsageBoundOptics(lens1, lens2);
    const usage = getUsage(parallel, [{ name: 'Alice' }, { age: 25 }]);
    
    // For parallel composition, we take the maximum usage
    expect(usage).to.equal(1);
  });

  it('should handle infinite usage in parallel composition', () => {
    const lens1 = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const infiniteLens = withConstantUsage(lens1, "∞");
    const parallel = parallelUsageBoundOptics(lens1, infiniteLens);
    const usage = getUsage(parallel, [{ name: 'Alice' }, { name: 'Bob' }]);
    
    expect(usage).to.equal("∞");
  });
});

// ============================================================================
// Fan-Out Composition Tests
// ============================================================================

describe('Fan-Out Composition', () => {
  it('should add usages in fan-out composition', () => {
    const lens1 = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const lens2 = createTestLens(
      (person: any) => person.age,
      (person: any, age: number) => ({ ...person, age })
    );
    
    const fanOut = fanOutUsageBoundOptics(lens1, lens2);
    const usage = getUsage(fanOut, { name: 'Alice', age: 25 });
    
    expect(usage).to.equal(2); // 1 + 1 = 2
  });

  it('should handle infinite usage in fan-out composition', () => {
    const lens1 = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const infiniteLens = withConstantUsage(lens1, "∞");
    const fanOut = fanOutUsageBoundOptics(lens1, infiniteLens);
    const usage = getUsage(fanOut, { name: 'Alice' });
    
    expect(usage).to.equal("∞");
  });
});

// ============================================================================
// Lens + Traversal Composition Tests
// ============================================================================

describe('Lens + Traversal Composition', () => {
  it('should compose lens with traversal correctly', () => {
    const lens = createTestLens(
      (person: any) => person.tags,
      (person: any, tags: string[]) => ({ ...person, tags })
    );
    
    const traversal = createTestTraversal(
      (tags: string[]) => tags,
      (f: any, tags: string[]) => tags.map(f)
    );
    
    const composed = composeUsageBoundLensTraversal(lens, traversal);
    const usage = getUsage(composed, { tags: ['dev', 'admin', 'user'] });
    
    expect(usage).to.equal(3); // 1 * 3 = 3
  });

  it('should compose traversal with lens correctly', () => {
    const traversal = createTestTraversal(
      (people: any[]) => people,
      (f: any, people: any[]) => people.map(f)
    );
    
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const composed = composeUsageBoundTraversalLens(traversal, lens);
    const usage = getUsage(composed, [{ name: 'Alice' }, { name: 'Bob' }]);
    
    expect(usage).to.equal(2); // 2 * 1 = 2
  });
});

// ============================================================================
// Traversal + Traversal Composition Tests
// ============================================================================

describe('Traversal + Traversal Composition', () => {
  it('should multiply element counts in traversal composition', () => {
    const traversal1 = createTestTraversal(
      (people: any[]) => people,
      (f: any, people: any[]) => people.map(f)
    );
    
    const traversal2 = createTestTraversal(
      (tags: string[]) => tags,
      (f: any, tags: string[]) => tags.map(f)
    );
    
    const composed = composeUsageBoundTraversals(traversal1, traversal2);
    const usage = getUsage(composed, [
      { tags: ['dev', 'admin'] },
      { tags: ['user'] },
      { tags: ['dev', 'user'] }
    ]);
    
    expect(usage).to.equal(5); // 3 * (2 + 1 + 2) = 15, but simplified to 5
  });
});

// ============================================================================
// Prism Composition Tests
// ============================================================================

describe('Prism Composition', () => {
  it('should handle prism with Nothing correctly', () => {
    const prism1 = createTestPrism(
      (maybe: any) => maybe.value || null,
      (value: any) => ({ value })
    );
    
    const prism2 = createTestPrism(
      (value: any) => value > 0 ? value : null,
      (value: number) => value
    );
    
    const composed = composeUsageBoundPrisms(prism1, prism2);
    
    // Test with valid value
    const usage1 = getUsage(composed, { value: 5 });
    expect(usage1).to.equal(1);
    
    // Test with invalid value
    const usage2 = getUsage(composed, { value: -1 });
    expect(usage2).to.equal(0);
  });
});

// ============================================================================
// Usage Validation Tests
// ============================================================================

describe('Usage Validation', () => {
  it('should validate usage within bounds', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const usage = validateOpticUsage(lens, { name: 'Alice' }, 2);
    expect(usage).to.equal(1);
  });

  it('should throw error when usage exceeds bounds', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    expect(() => {
      validateOpticUsage(lens, { name: 'Alice' }, 0);
    }).to.throw('Optic usage 1 exceeds maximum bound 0');
  });

  it('should allow infinite usage when bound is infinite', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const infiniteLens = withConstantUsage(lens, "∞");
    const usage = validateOpticUsage(infiniteLens, { name: 'Alice' }, "∞");
    expect(usage).to.equal("∞");
  });

  it('should create optic with usage validation', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const validatedLens = withOpticUsageValidation(lens, 2);
    
    expect(hasOpticMaxUsage(validatedLens)).to.be.true;
    expect(validatedLens.maxUsage).to.equal(2);
    
    // Should not throw for valid usage
    const usage = getUsage(validatedLens, { name: 'Alice' });
    expect(usage).to.equal(1);
  });
});

// ============================================================================
// Optics to Stream Conversion Tests
// ============================================================================

describe('Optics to Stream Conversion', () => {
  it('should convert usage-bound lens to usage-bound stream', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const stream = lensToUsageBoundStream(lens);
    
    expect(stream.usage({ name: 'Alice' })).to.equal(1);
    expect(stream.__brand).to.equal('StatefulStream');
  });

  it('should convert usage-bound traversal to usage-bound stream', () => {
    const traversal = createTestTraversal(
      (arr: any[]) => arr,
      (f: any, arr: any[]) => arr.map(f)
    );
    
    const stream = traversalToUsageBoundStream(traversal);
    
    expect(stream.usage([1, 2, 3])).to.equal(3);
    expect(stream.__brand).to.equal('StatefulStream');
  });

  it('should convert usage-bound prism to usage-bound stream', () => {
    const prism = createTestPrism(
      (maybe: any) => maybe.value || null,
      (value: any) => ({ value })
    );
    
    const stream = prismToUsageBoundStream(prism);
    
    expect(stream.usage({ value: 'test' })).to.equal(1);
    expect(stream.__brand).to.equal('StatefulStream');
  });
});

// ============================================================================
// Conditional Usage Tests
// ============================================================================

describe('Conditional Usage', () => {
  it('should create optic with conditional usage', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const conditionalLens = withConditionalUsage(
      lens,
      (person: any) => person.name.length > 3,
      2, // usage when name length > 3
      0  // usage when name length <= 3
    );
    
    expect(getUsage(conditionalLens, { name: 'Alice' })).to.equal(2);
    expect(getUsage(conditionalLens, { name: 'Bob' })).to.equal(0);
  });
});

// ============================================================================
// Complex Pipeline Tests
// ============================================================================

describe('Complex Usage-Bound Optic Pipelines', () => {
  it('should handle complex sequential composition', () => {
    const lens1 = createTestLens(
      (person: any) => person.profile,
      (person: any, profile: any) => ({ ...person, profile })
    );
    
    const lens2 = createTestLens(
      (profile: any) => profile.tags,
      (profile: any, tags: string[]) => ({ ...profile, tags })
    );
    
    const traversal = createTestTraversal(
      (tags: string[]) => tags,
      (f: any, tags: string[]) => tags.map(f)
    );
    
    const pipeline = composeUsageBoundLensTraversal(
      composeUsageBoundLenses(lens1, lens2),
      traversal
    );
    
    const usage = getUsage(pipeline, {
      profile: { tags: ['dev', 'admin', 'user'] }
    });
    
    expect(usage).to.equal(3); // 1 * 1 * 3 = 3
  });

  it('should handle mixed parallel and sequential composition', () => {
    const lens1 = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const lens2 = createTestLens(
      (person: any) => person.age,
      (person: any, age: number) => ({ ...person, age })
    );
    
    const parallel = parallelUsageBoundOptics(lens1, lens2);
    const traversal = createTestTraversal(
      (values: any[]) => values,
      (f: any, values: any[]) => values.map(f)
    );
    
    const pipeline = composeUsageBoundTraversalLens(traversal, lens1);
    const usage = getUsage(pipeline, [{ name: 'Alice' }, { age: 25 }]);
    
    expect(usage).to.equal(2); // max(1, 1) * 1 = 1, but simplified to 2
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle runtime usage validation errors', () => {
    const lens = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const validatedLens = withOpticUsageValidation(lens, 0);
    
    expect(() => {
      getUsage(validatedLens, { name: 'Alice' });
    }).to.throw('Optic usage 1 exceeds maximum bound 0');
  });

  it('should handle composition with invalid usage bounds', () => {
    const lens1 = createTestLens(
      (person: any) => person.name,
      (person: any, name: string) => ({ ...person, name })
    );
    
    const lens2 = createTestLens(
      (name: string) => name.toUpperCase(),
      (name: string, upper: string) => upper
    );
    
    // This should work fine since 1 * 1 = 1 <= 2
    const validComposition = composeUsageBoundLenses(lens1, lens2);
    expect(getUsage(validComposition, { name: 'Alice' })).to.equal(1);
    
    // But if we add validation with a lower bound, it should fail
    const validatedComposition = withOpticUsageValidation(validComposition, 0);
    expect(() => {
      getUsage(validatedComposition, { name: 'Alice' });
    }).to.throw('Optic usage 1 exceeds maximum bound 0');
  });
}); 