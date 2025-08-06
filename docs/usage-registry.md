# Usage Registry Integration System

## Overview

The Usage Registry Integration System extends the existing typeclass derivation pipeline to include **usage bounds** as a first-class property of the global type/instance system. This enables usage tracking to be globally visible to both the derivation system and composition logic, creating a unified approach to multiplicity management across optics and streams.

## Core Components

### 1. Usage Registry (`usageRegistry.ts`)

The central registry for storing usage bounds across all registered types:

```typescript
// Register usage for a type
registerUsage('Lens', onceUsage<any>());

// Retrieve usage for a type
const usage = getUsageBound('Lens'); // Returns usage = 1

// Check if type has usage registered
const hasUsage = hasUsageBound('Lens'); // Returns true
```

**Built-in Usage Definitions:**
- `Lens` → `1` (focuses exactly one field)
- `Prism` → `0 | 1` (dependent on match success)
- `Optional` → `0 | 1` (dependent on presence)
- `Traversal` → `0..N` (number of focused elements)
- `ObservableLite` → `"∞"` (infinite unless restricted)
- `StatefulStream` → `"∞"` (usage from stream definition)

### 2. Enhanced Registry (`fp-registry-init.ts`)

Extended the global FP registry to include usage information:

```typescript
// Extended registry interface
interface FPRegistry {
  // ... existing fields
  usage: Map<string, any>; // New usage registry
  
  // ... existing methods
  registerUsage(name: string, usage: any): void;
  getUsage(name: string): any;
}

// Usage registration
registerUsageBound('Lens', onceUsage<any>());

// Usage lookup
const usage = getUsageBound('Lens');
```

### 3. Enhanced Derivation System (`fp-derivation-helpers.ts`)

Extended the derivation configuration to include usage information:

```typescript
// Enhanced derivation config
interface DerivationConfig {
  // ... existing fields
  usage?: any; // Optional: usage bound for the type
}

// Enhanced derived instances
interface DerivedInstances {
  // ... existing fields
  usage?: any; // Optional: usage bound for the type
}

// Derive instances with usage
const instances = deriveInstances({
  functor: true,
  usage: onceUsage<any>()
});
```

### 4. Usage Integration (`fp-usage-integration.ts`)

Provides seamless integration between usage registry and typeclass derivation:

```typescript
// Derive instances with automatic usage lookup
const instances = deriveInstancesWithUsage({
  typeKey: 'Lens',
  functor: true,
  autoRegisterUsage: true
});

// Pre-configured usage-aware instances
const lensInstances = UsageAwareInstances.Lens;
const prismInstances = UsageAwareInstances.Prism;
const traversalInstances = UsageAwareInstances.Traversal;
```

## Usage Patterns

### 1. Automatic Usage Registration

```typescript
// Auto-register usage when deriving instances
const instances = deriveInstancesForType('CustomType', {
  functor: true,
  usage: constantUsage<any>(5)
});

// Usage is automatically registered in both registries
expect(getUsageBound('CustomType')).toBeDefined();
expect(getGlobalUsageBound('CustomType')).toBeDefined();
```

### 2. Registry Lookup with Fallback

```typescript
// Get usage from any available source
const usage = getUsageForType('Lens');

// Register usage in all available registries
registerUsageForType('CustomType', onceUsage<any>());

// Check if type has usage registered anywhere
const hasUsage = hasUsageForType('CustomType');
```

### 3. Usage-Aware Instance Creation

```typescript
// Create instances with built-in usage
const lensInstances = UsageAwareInstances.Lens; // usage = 1
const prismInstances = UsageAwareInstances.Prism; // usage = 0 | 1
const traversalInstances = UsageAwareInstances.Traversal; // usage = 0..N

// Verify usage behavior
expect(lensInstances.usage!('any input')).toBe(1);
expect(traversalInstances.usage!([1, 2, 3])).toBe(3);
```

## Composition Integration

### Sequential Composition

When composing registry-aware objects, usage bounds are automatically combined:

```typescript
// Lens (usage = 1) + Traversal (usage = 3) = usage = 3
const lensInstances = UsageAwareInstances.Lens;
const traversalInstances = UsageAwareInstances.Traversal;

// Sequential composition multiplies usage
const composedUsage = composeUsageAwareInstances(lensInstances, traversalInstances);
// Result: usage = 1 * 3 = 3
```

### Parallel Composition

For parallel composition, usage is the maximum of individual usages:

```typescript
// Lens (usage = 2) + Lens (usage = 3) = usage = 3
const lens1 = UsageAwareInstances.Lens; // usage = 1
const lens2 = UsageAwareInstances.Lens; // usage = 1

// Parallel composition takes maximum
// Result: usage = max(1, 1) = 1
```

## Type-Level Enforcement

### Compile-Time Bounds

```typescript
// Branded type for bounded values
type Bounded<N extends number | "∞"> = { __bound: N };

// Type-level check for usage bounds
type UsageWithinBounds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  // ... type-level logic

// Assert usage is within bounds at compile time
type AssertUsageWithinBounds<Usage, Bound> = 
  UsageWithinBounds<Usage, Bound> extends true ? Usage : never;
```

### Runtime Validation

```typescript
// Validate usage at runtime
const isValid = validateUsage(5, 10); // true
const isInvalid = validateUsage(15, 10); // false
const isInfinite = validateUsage("∞", 10); // false
```

## Integration Examples

### Optics + Streams Integration

```typescript
// Create usage-bound lens
const nameLens = usageBoundLens(
  lens((person) => person.name, (person, name) => ({ ...person, name })),
  () => 1
);

// Convert to usage-bound stream
const nameStream = lensToUsageBoundStream(nameLens);

// Compose with other streams
const upperStream = liftStatelessUsage((name: string) => name.toUpperCase(), 1);
const composedStream = composeUsageBoundStreams(nameStream, upperStream);

// Usage propagates through composition
expect(composedStream.usage({ name: "test" })).toBe(1);
```

### Registry-Aware Composition

```typescript
// Register usage for custom types
registerUsageForType('CustomLens', onceUsage<any>());
registerUsageForType('CustomTraversal', (input: any[]) => input.length);

// Derive instances with automatic usage
const customLensInstances = deriveInstancesForType('CustomLens', {
  functor: true
});

const customTraversalInstances = deriveInstancesForType('CustomTraversal', {
  functor: true
});

// Compose with usage propagation
const composed = composeUsageAwareInstances(customLensInstances, customTraversalInstances);
```

## Benefits

### 1. Global Visibility

Usage bounds are now globally visible to both the derivation system and composition logic, enabling consistent multiplicity tracking across the entire system.

### 2. Automatic Registration

Usage bounds are automatically registered when deriving instances, reducing boilerplate and ensuring consistency.

### 3. Compile-Time Safety

Type-level enforcement enables compile-time detection of usage violations, preventing runtime errors.

### 4. Optimization Opportunities

Usage information enables optimization opportunities such as:
- Fusing pure operations
- Identifying bounded computations
- Preventing runaway recursion

### 5. Seamless Integration

The system integrates seamlessly with existing optics and stream systems, requiring minimal changes to existing code.

## Future Enhancements

### 1. Advanced Composition Rules

- Fan-out composition with usage addition
- Conditional composition based on usage bounds
- Usage-dependent optimization strategies

### 2. Performance Monitoring

- Runtime usage tracking and profiling
- Usage-based performance optimization
- Usage violation detection and reporting

### 3. Advanced Type-Level Features

- Dependent usage types
- Usage-preserving transformations
- Compile-time usage analysis

## Conclusion

The Usage Registry Integration System provides a unified approach to multiplicity management across the entire typeclass system. By making usage bounds globally visible and automatically propagating through composition, it enables compile-time safety, optimization opportunities, and seamless integration between optics and streams. 