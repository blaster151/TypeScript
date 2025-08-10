# Multiplicity Typeclass Derivation System

## Overview

The Multiplicity Typeclass Derivation System upgrades the typeclass derivation system to automatically propagate **UsageBound** metadata across Functor, Applicative, Monad, and Traversable instances. This makes **bound propagation** a **first-class citizen** of the typeclass derivation system so **all functional combinators** — ADTs, optics, and streams — automatically respect and enforce multiplicity rules without manual wiring.

## Core Concepts

### Enhanced Derivation with Usage Bounds

The enhanced derivation system extends the traditional typeclass derivation with automatic usage bound propagation:

```typescript
export function deriveInstancesWithUsage<F, UB extends UsageBound<any>>(
  config: UsageBoundDerivationConfig<F, UB>
): UsageBoundDerivedInstances<F, UB>
```

### Usage Bound Configuration

The derivation configuration includes usage bound settings:

```typescript
interface UsageBoundDerivationConfig<F, UB extends UsageBound<any>> {
  // Core typeclass implementations
  map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>;
  of?: <A>(a: A) => Kind<F, A>;
  chain?: <A, B>(fa: Kind<F, A>, f: (a: A) => Kind<F, B>) => Kind<F, B>;
  traverse?: <G extends Applicative<any>, A, B>(
    fa: Kind<F, A>,
    f: (a: A) => Kind<G, B>
  ) => Kind<G, Kind<F, B>>;
  
  // Usage bound configuration
  usageBound?: UB;
  typeKey?: string; // For registry lookup
  
  // Typeclass flags
  functor?: boolean;
  applicative?: boolean;
  monad?: boolean;
  traversable?: boolean;
}
```

## Default Usage Bounds

### Built-in Type Defaults

The system provides sensible defaults for all built-in types:

| Type | Default Bound | Reasoning |
|------|---------------|-----------|
| **Maybe** | `1` | Pure ADT, exactly once per focus |
| **Either** | `1` | Pure ADT, exactly once per focus |
| **Result** | `1` | Pure ADT, exactly once per focus |
| **Option** | `1` | Pure ADT, exactly once per focus |
| **Tuple** | `1` | Fixed-size collection |
| **Array** | `"∞"` | Variable-size collection |
| **List** | `"∞"` | Variable-size collection |
| **Set** | `"∞"` | Variable-size collection |
| **Map** | `"∞"` | Variable-size collection |
| **ObservableLite** | `"∞"` | Stream type, potentially infinite |
| **StatefulStream** | `"∞"` | Stream type, potentially infinite |
| **Stream** | `"∞"` | Stream type, potentially infinite |
| **Lens** | `1` | Optic type, exactly once per focus |
| **Prism** | `1` | Optic type, exactly once per focus |
| **Traversal** | `"∞"` | Optic type, potentially multiple foci |
| **Getter** | `1` | Optic type, exactly once per access |
| **Setter** | `1` | Optic type, exactly once per modification |

### Registry Integration

Default usage bounds are stored in a registry and automatically looked up during derivation:

```typescript
// Register default usage bound for a type
registerTypeUsageBound('CustomType', 5);

// Get default usage bound for a type
const bound = getTypeUsageBound('CustomType'); // 5

// Auto-initialization of built-in types
initializeDefaultUsageBounds();
```

## Usage Bound Propagation Rules

### 1. Functor Derivation

**Rule**: `map` preserves the usage bound from the original structure.

```typescript
// Functor derivation with usage bound preservation
instances.functor = {
  map: <A, B>(fa: Kind<F, A>, f: (a: A) => B): Kind<F, B> => {
    const result = config.map(fa, f);
    
    // Preserve usage bound from original structure
    const originalBound = getUsageBoundFromValue(fa);
    (result as any).usageBound = originalBound;
    
    return result;
  },
  usageBound: instances.usageBound
};
```

**Example**:
```typescript
// Maybe with usage bound = 1
const maybe = { value: 42, usageBound: createUsageBound(1) };
const mapped = functor.map(maybe, x => x * 2);
// mapped.usageBound.usage(42) = 1 (preserved)
```

### 2. Applicative Derivation

**Rule**: `ap` multiplies usage bounds: `new bound = fab.bound * fa.bound`.

```typescript
// Applicative derivation with usage bound multiplication
instances.applicative = {
  ...instances.functor!,
  of: config.of,
  ap: <A, B>(fab: Kind<F, (a: A) => B>, fa: Kind<F, A>): Kind<F, B> => {
    const result = config.map(fab, (f) => f(fa as any)) as Kind<F, B>;
    
    // Multiply usage bounds: new bound = fab.bound * fa.bound
    const fabBound = getUsageBoundFromValue(fab);
    const faBound = getUsageBoundFromValue(fa);
    const multipliedBound = multiplyUsageBounds(fabBound, faBound);
    
    (result as any).usageBound = multipliedBound;
    
    return result;
  }
};
```

**Example**:
```typescript
// Maybe functor (bound = 1) applied to Array functor (bound = "∞")
const fab = { value: (x: number) => x * 2, usageBound: createUsageBound(1) };
const fa = { value: [1, 2, 3], usageBound: createUsageBound("∞") };
const applied = applicative.ap(fab, fa);
// applied.usageBound.usage(42) = "∞" (1 * ∞ = ∞)
```

### 3. Monad Derivation

**Rule**: `chain` multiplies usage bounds: `new bound = fa.bound * f.bound`.

```typescript
// Monad derivation with usage bound multiplication
instances.monad = {
  ...instances.applicative!,
  chain: <A, B>(fa: Kind<F, A>, f: (a: A) => Kind<F, B>): Kind<F, B> => {
    const result = config.chain(fa, f);
    
    // Multiply usage bounds: new bound = fa.bound * f.bound
    const faBound = getUsageBoundFromValue(fa);
    const fBound = inferMaxBoundFromF(f, fa as any);
    const fUsageBound = createUsageBound(fBound);
    const multipliedBound = multiplyUsageBounds(faBound, fUsageBound);
    
    (result as any).usageBound = multipliedBound;
    
    return result;
  }
};
```

**Example**:
```typescript
// Maybe (bound = 1) chained with function returning Maybe (bound = 2)
const fa = { value: 42, usageBound: createUsageBound(1) };
const f = (x: number) => ({ value: x * 2, usageBound: createUsageBound(2) });
const chained = monad.chain(fa, f);
// chained.usageBound.usage(42) = 2 (1 * 2 = 2)
```

### 4. Traversable Derivation

**Rule**: `traverse` multiplies usage bounds: `new bound = collection.bound * element.bound`.

```typescript
// Traversable derivation with usage bound multiplication
instances.traversable = {
  ...instances.functor!,
  traverse: <G extends Applicative<any>, A, B>(
    fa: Kind<F, A>,
    f: (a: A) => Kind<G, B>
  ): Kind<G, Kind<F, B>> => {
    const result = config.traverse(fa, f);
    
    // Multiply usage bounds: new bound = collection.bound * element.bound
    const collectionBound = getUsageBoundFromValue(fa);
    const elementBound = inferMaxBoundFromF(f, fa as any);
    const elementUsageBound = createUsageBound(elementBound);
    const multipliedBound = multiplyUsageBounds(collectionBound, elementUsageBound);
    
    (result as any).usageBound = multipliedBound;
    
    return result;
  }
};
```

**Example**:
```typescript
// Array (bound = "∞") traversed with Maybe (bound = 1)
const fa = { value: [1, 2, 3], usageBound: createUsageBound("∞") };
const f = (x: number) => ({ value: x * 2, usageBound: createUsageBound(1) });
const traversed = traversable.traverse(fa, f);
// traversed.usageBound.usage([1, 2, 3]) = "∞" (∞ * 1 = ∞)
```

## Convenience Functions

### Pre-built ADT Instances

The system provides convenience functions for common ADTs:

```typescript
// Derive instances for Maybe with usage bound = 1
const maybeInstances = deriveMaybeInstances();

// Derive instances for Array with usage bound = "∞"
const arrayInstances = deriveArrayInstances();

// Derive instances for Either with usage bound = 1
const eitherInstances = deriveEitherInstances();

// Derive instances for ObservableLite with usage bound = "∞"
const observableInstances = deriveObservableLiteInstances();
```

### Custom ADT Derivation

For custom ADTs, you can specify usage bounds explicitly:

```typescript
// Custom ADT with usage bound = 3
const customInstances = deriveInstancesWithUsage({
  map: (fa, f) => /* custom map implementation */,
  of: (a) => /* custom of implementation */,
  chain: (fa, f) => /* custom chain implementation */,
  usageBound: createUsageBound(3),
  typeKey: 'CustomType',
  functor: true,
  applicative: true,
  monad: true
});
```

## Usage Bound Inference

### Function Bound Inference

The system can infer usage bounds from functions using mock instances:

```typescript
function inferMaxBoundFromF<F, A, B>(
  f: (a: A) => Kind<F, B>,
  mockValue: A
): Multiplicity {
  try {
    // Create a mock result and try to extract usage bound
    const mockResult = f(mockValue);
    const bound = getUsageBoundFromValue(mockResult);
    return bound.usage(mockValue as any);
  } catch {
    // If we can't infer, default to infinite
    return "∞";
  }
}
```

### Registry Fallback

When usage bounds cannot be inferred, the system falls back to registry defaults:

```typescript
// Get usage bound from value or fall back to registry
function getUsageBoundFromValue<T>(value: T): UsageBound<T> {
  if (value && typeof value === 'object' && 'usageBound' in value) {
    return (value as any).usageBound;
  }
  
  // Fallback to infinite usage
  return {
    usage: infiniteUsage<T>(),
    maxUsage: "∞"
  };
}
```

## Type-Level Enforcement

### Compile-Time Bounds

The system provides type-level enforcement for usage bounds:

```typescript
// Type-level check if usage exceeds a bound
type TypeclassUsageExceeds<Usage extends Multiplicity, Bound extends Multiplicity> = 
  Bound extends "∞" ? false :
  Usage extends "∞" ? true :
  Usage extends number ? 
    Bound extends number ? 
      Usage extends Bound ? false : true :
    never :
  never;

// Assert that typeclass usage is within bounds at compile time
type AssertTypeclassWithinBound<Usage extends Multiplicity, Bound extends Multiplicity> = 
  TypeclassUsageExceeds<Usage, Bound> extends true ? 
    never : // Compile error
    Usage;
```

### Safe Composition Types

Type-level enforcement for typeclass composition:

```typescript
// Type-level enforcement for typeclass composition
type SafeTypeclassComposition<
  F1 extends Functor<any>,
  F2 extends Functor<any>,
  MaxBound extends Multiplicity
> = AssertTypeclassWithinBound<
  MultiplyTypeclassUsage<ExtractTypeclassUsage<F1>, ExtractTypeclassUsage<F2>>,
  MaxBound
>;
```

## Integration Examples

### 1. Maybe with Usage Bounds

```typescript
// Derive Maybe instances with usage bound = 1
const maybeInstances = deriveMaybeInstances();

// Create Maybe value with usage bound
const maybe = { value: 42, usageBound: createUsageBound(1) };

// Map preserves usage bound
const mapped = maybeInstances.functor!.map(maybe, x => x * 2);
expect((mapped as any).usageBound.usage(42)).toBe(1);

// Chain multiplies usage bounds
const f = (x: number) => ({ value: x * 2, usageBound: createUsageBound(2) });
const chained = maybeInstances.monad!.chain(maybe, f);
expect((chained as any).usageBound.usage(42)).toBe(2); // 1 * 2 = 2
```

### 2. Array with Usage Bounds

```typescript
// Derive Array instances with usage bound = "∞"
const arrayInstances = deriveArrayInstances();

// Create Array value with usage bound
const array = { value: [1, 2, 3], usageBound: createUsageBound("∞") };

// Map preserves usage bound
const mapped = arrayInstances.functor!.map(array, x => x * 2);
expect((mapped as any).usageBound.usage([1, 2, 3])).toBe("∞");

// Traverse multiplies usage bounds
const f = (x: number) => ({ value: x * 2, usageBound: createUsageBound(1) });
const traversed = arrayInstances.traversable!.traverse(array, f);
expect((traversed as any).usageBound.usage([1, 2, 3])).toBe("∞"); // ∞ * 1 = ∞
```

### 3. Mixed Composition

```typescript
// Compose Maybe (bound = 1) with Array (bound = "∞")
const maybeInstances = deriveMaybeInstances();
const arrayInstances = deriveArrayInstances();

const maybe = { value: 42, usageBound: createUsageBound(1) };
const array = { value: [1, 2, 3], usageBound: createUsageBound("∞") };

// Map over Maybe (preserves bound = 1)
const mappedMaybe = maybeInstances.functor!.map(maybe, x => x * 2);
expect((mappedMaybe as any).usageBound.usage(42)).toBe(1);

// Map over Array (preserves bound = "∞")
const mappedArray = arrayInstances.functor!.map(array, x => x * 2);
expect((mappedArray as any).usageBound.usage([1, 2, 3])).toBe("∞");
```

## Registry Integration

### Default Bounds Registration

The system automatically registers default bounds for built-in types:

```typescript
function initializeDefaultUsageBounds(): void {
  // Pure ADTs = 1
  registerTypeUsageBound('Maybe', 1);
  registerTypeUsageBound('Either', 1);
  registerTypeUsageBound('Result', 1);
  registerTypeUsageBound('Option', 1);
  registerTypeUsageBound('Tuple', 1);
  
  // Collection types = "∞" unless known finite
  registerTypeUsageBound('Array', "∞");
  registerTypeUsageBound('List', "∞");
  registerTypeUsageBound('Set', "∞");
  registerTypeUsageBound('Map', "∞");
  
  // Stream types = "∞"
  registerTypeUsageBound('ObservableLite', "∞");
  registerTypeUsageBound('StatefulStream', "∞");
  registerTypeUsageBound('Stream', "∞");
  
  // Optic types
  registerTypeUsageBound('Lens', 1);
  registerTypeUsageBound('Prism', 1);
  registerTypeUsageBound('Traversal', "∞");
  registerTypeUsageBound('Getter', 1);
  registerTypeUsageBound('Setter', 1);
}
```

### Custom Type Registration

You can register custom types with their usage bounds:

```typescript
// Register custom type with usage bound
registerTypeUsageBound('CustomType', 5);

// Derive instances using registry default
const customInstances = deriveInstancesWithUsage({
  map: (fa, f) => /* implementation */,
  typeKey: 'CustomType',
  functor: true
});

// Usage bound automatically set to 5
expect(customInstances.usageBound.usage(42)).toBe(5);
```

## Benefits

### 1. Automatic Bound Propagation

- **No manual wiring** required for usage bounds
- **Consistent propagation** across all typeclass instances
- **Registry-driven defaults** for built-in types

### 2. Compile-Time Safety

- **Type-level enforcement** of usage bounds
- **Compile-time detection** of bound violations
- **Safe composition** guarantees

### 3. Seamless Integration

- **Backward compatible** with existing typeclass system
- **Natural extension** of derivation patterns
- **Minimal changes** to existing code

### 4. Performance Optimization

- **Usage information** enables optimization opportunities
- **Bounded vs unbounded** computations can be optimized differently
- **Resource-aware scheduling** based on usage bounds

## Future Enhancements

### 1. Advanced Inference

- **Dependent usage types** based on input values
- **Conditional usage bounds** based on runtime conditions
- **Usage-preserving transformations** with compile-time guarantees

### 2. Performance Monitoring

- **Runtime usage tracking** and profiling
- **Usage-based performance** optimization
- **Usage violation detection** and reporting

### 3. Advanced Composition

- **Fan-out composition** with usage addition
- **Conditional composition** based on usage bounds
- **Usage-dependent optimization** strategies

## Conclusion

The Multiplicity Typeclass Derivation System makes **bound propagation** a **first-class citizen** of the typeclass derivation system. By automatically propagating usage bounds across Functor, Applicative, Monad, and Traversable instances, all functional combinators — ADTs, optics, and streams — automatically respect and enforce multiplicity rules without manual wiring.

The system provides:
- **Automatic bound propagation** across all typeclass instances
- **Registry-driven defaults** for built-in types
- **Compile-time safety** through type-level enforcement
- **Seamless integration** with existing typeclass system
- **Performance optimization** opportunities based on usage information

All functional transformations now automatically propagate usage bounds, making the entire FP/FRP layer **usage-aware** and **resource-safe**! 🎯 