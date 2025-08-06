# Automatic Derivation of Eq, Ord, and Show Instances

This document describes the automatic derivation system for `Eq`, `Ord`, and `Show` typeclass instances for ADTs and product types created through `createSumType` and `createProductType`.

## Overview

The automatic derivation system allows you to automatically generate `Eq`, `Ord`, and `Show` instances for your ADTs and product types by simply specifying which typeclasses to derive in the configuration options.

## Features

- **Automatic Derivation**: Generate typeclass instances without manual implementation
- **Registry Integration**: Automatically register derived instances in the global registry
- **Purity Tagging**: All derived instances are marked as pure
- **HKT Integration**: Derived instances work seamlessly with the HKT system
- **Structural Comparison**: Deep structural equality and ordering for complex types
- **Consistent String Representation**: Standardized string formatting for all types

## Usage

### Sum Types (ADTs)

```typescript
import { createSumType } from './fp-adt-builders';

// Create Maybe with automatic derivation
const Maybe = createSumType({
  Just: (value: any) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  derive: ['Eq', 'Ord', 'Show']
});

// Use the derived instances
const just1 = Maybe.constructors.Just(42);
const just2 = Maybe.constructors.Just(42);
const nothing = Maybe.constructors.Nothing();

// Eq instance
Maybe.Eq?.equals(just1, just2); // true
Maybe.Eq?.equals(just1, nothing); // false

// Ord instance
Maybe.Ord?.compare(just1, nothing); // > 0 (Just > Nothing)
Maybe.Ord?.compare(nothing, just1); // < 0 (Nothing < Just)

// Show instance
Maybe.Show?.show(just1); // "Just({\"value\":42})"
Maybe.Show?.show(nothing); // "Nothing"
```

### Product Types

```typescript
import { createProductType } from './fp-adt-builders';

// Create Point with automatic derivation
const Point = createProductType({
  name: 'Point',
  derive: ['Eq', 'Ord', 'Show']
});

// Use the derived instances
const p1 = Point.of({ x: 1, y: 2 });
const p2 = Point.of({ x: 1, y: 2 });
const p3 = Point.of({ x: 2, y: 1 });

// Eq instance
Point.Eq?.equals(p1, p2); // true
Point.Eq?.equals(p1, p3); // false

// Ord instance
Point.Ord?.compare(p1, p3); // < 0 (x: 1 < x: 2)
Point.Ord?.compare(p3, p1); // > 0 (x: 2 > x: 1)

// Show instance
Point.Show?.show(p1); // "{x:1,y:2}"
```

### Complex Types

```typescript
// Complex sum type with multiple constructors
const Either = createSumType({
  Left: (error: string) => ({ error }),
  Right: (value: number) => ({ value })
}, {
  name: 'Either',
  derive: ['Eq', 'Ord', 'Show']
});

// Complex product type with nested fields
const Rectangle = createProductType({
  name: 'Rectangle',
  derive: ['Eq', 'Ord', 'Show']
});

const r1 = Rectangle.of({ width: 10, height: 20 });
const r2 = Rectangle.of({ width: 10, height: 20 });

Rectangle.Eq?.equals(r1, r2); // true
Rectangle.Show?.show(r1); // "{width:10,height:20}"
```

## Configuration Options

### Sum Type Configuration

```typescript
interface SumTypeConfig {
  name?: string;                    // Type name for registry
  effect?: EffectTag;               // Purity effect ('Pure', 'IO', 'Async')
  enableRuntimeMarkers?: boolean;   // Enable runtime purity markers
  enableHKT?: boolean;              // Enable HKT integration
  enableDerivableInstances?: boolean; // Enable registry integration
  derive?: ('Eq' | 'Ord' | 'Show')[]; // Typeclasses to derive
}
```

### Product Type Configuration

```typescript
interface ProductTypeConfig {
  name?: string;                    // Type name for registry
  effect?: EffectTag;               // Purity effect ('Pure', 'IO', 'Async')
  enableRuntimeMarkers?: boolean;   // Enable runtime purity markers
  enableHKT?: boolean;              // Enable HKT integration
  enableDerivableInstances?: boolean; // Enable registry integration
  derive?: ('Eq' | 'Ord' | 'Show')[]; // Typeclasses to derive
}
```

## Derivation Rules

### Eq (Equality)

**Sum Types:**
1. Compare constructor tags first
2. If tags are equal, compare payloads structurally
3. Two values are equal if they have the same tag and identical payloads

**Product Types:**
1. Compare all fields structurally
2. Two values are equal if all fields are equal

### Ord (Ordering)

**Sum Types:**
1. Compare constructor tags lexicographically
2. If tags are equal, compare payloads lexicographically
3. Ordering: `Nothing < Just`, `Left < Right`

**Product Types:**
1. Compare fields lexicographically by key
2. If keys are equal, compare values
3. Ordering follows standard JavaScript comparison rules

### Show (String Representation)

**Sum Types:**
- Format: `TagName(payload)`
- Example: `Just({"value":42})`, `Nothing`

**Product Types:**
- Format: `{field1:value1,field2:value2}`
- Example: `{x:1,y:2}`

## Registry Integration

When `enableDerivableInstances` is true, derived instances are automatically registered in the global FP registry:

```typescript
// Instances are registered with names like:
// - MaybeEq
// - MaybeOrd  
// - MaybeShow
// - PointEq
// - PointOrd
// - PointShow

// You can access them from the registry
const registry = globalThis.__FP_REGISTRY;
const maybeEq = registry.get('MaybeEq');
const pointShow = registry.get('PointShow');
```

## Purity Integration

All derived instances are marked as pure:

```typescript
// Derived instances carry purity information
Maybe.Eq?.__purity; // 'Pure'
Maybe.Ord?.__purity; // 'Pure'
Maybe.Show?.__purity; // 'Pure'
```

## HKT Integration

Derived instances work seamlessly with the HKT system:

```typescript
// HKT integration is preserved
Maybe.HKT; // SumTypeK<Spec>
Point.HKT; // ProductTypeK<Fields>

// Derived instances work with HKT
Maybe.Eq?.equals(just1, just2); // Works with HKT types
Point.Ord?.compare(p1, p2); // Works with HKT types
```

## Partial Derivation

You can derive only the typeclasses you need:

```typescript
// Derive only Eq and Show (no Ord)
const Maybe = createSumType({
  Just: (value: any) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  derive: ['Eq', 'Show'] // No Ord
});

// Only Eq and Show instances are available
Maybe.Eq; // ✅ Available
Maybe.Ord; // ❌ Undefined
Maybe.Show; // ✅ Available
```

## Performance Considerations

### Memory Usage
- Derived instances are created once per type
- Instances are shared across all values of the same type
- Minimal memory overhead

### Runtime Performance
- Eq: O(n) where n is the number of fields
- Ord: O(n) where n is the number of fields  
- Show: O(n) where n is the number of fields

### Compile-time Performance
- Derivation happens at type creation time
- No impact on runtime type checking
- Minimal compile-time overhead

## Limitations

### Nested Uncomparable Payloads
For complex nested structures, the system uses standard JavaScript comparison:

```typescript
// Objects are compared by reference
const obj1 = { x: 1 };
const obj2 = { x: 1 };

const maybe1 = Maybe.constructors.Just(obj1);
const maybe2 = Maybe.constructors.Just(obj2);

Maybe.Eq?.equals(maybe1, maybe2); // false (different object references)
```

### Circular References
The system does not handle circular references in Show instances:

```typescript
// This may cause issues with circular references
const obj: any = { x: 1 };
obj.self = obj;

const maybe = Maybe.constructors.Just(obj);
Maybe.Show?.show(maybe); // May cause stack overflow
```

### Custom Comparison Logic
For complex comparison requirements, you may need to implement custom instances:

```typescript
// For custom comparison logic, implement manually
const CustomMaybe = createSumType({
  Just: (value: any) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'CustomMaybe'
  // Don't derive, implement manually
});

// Implement custom Eq instance
CustomMaybe.Eq = deriveEqInstance({
  customEq: (a, b) => {
    // Custom comparison logic
    return customCompare(a, b);
  }
});
```

## Best Practices

### 1. Use Descriptive Names
```typescript
// Good
const Maybe = createSumType({...}, { name: 'Maybe' });
const Point = createProductType({ name: 'Point' });

// Avoid
const M = createSumType({...}, { name: 'M' });
const P = createProductType({ name: 'P' });
```

### 2. Derive Only What You Need
```typescript
// Good - only derive what you use
const Maybe = createSumType({...}, { derive: ['Eq', 'Show'] });

// Avoid - derive everything
const Maybe = createSumType({...}, { derive: ['Eq', 'Ord', 'Show'] });
```

### 3. Use Consistent Naming
```typescript
// Good - consistent naming
const Maybe = createSumType({...}, { name: 'Maybe' });
const MaybeList = createSumType({...}, { name: 'MaybeList' });

// Avoid - inconsistent naming
const Maybe = createSumType({...}, { name: 'Maybe' });
const maybeList = createSumType({...}, { name: 'maybeList' });
```

### 4. Test Derived Instances
```typescript
// Always test your derived instances
const maybe1 = Maybe.constructors.Just(42);
const maybe2 = Maybe.constructors.Just(42);
const nothing = Maybe.constructors.Nothing();

// Test Eq
assert(Maybe.Eq?.equals(maybe1, maybe2) === true);
assert(Maybe.Eq?.equals(maybe1, nothing) === false);

// Test Ord
assert(Maybe.Ord?.compare(maybe1, nothing) > 0);
assert(Maybe.Ord?.compare(nothing, maybe1) < 0);

// Test Show
assert(Maybe.Show?.show(maybe1).includes('Just'));
assert(Maybe.Show?.show(nothing).includes('Nothing'));
```

## Migration Guide

### From Manual Instances

**Before:**
```typescript
// Manual implementation
const MaybeEq: Eq<Maybe<any>> = {
  equals: (a, b) => {
    if (a.tag !== b.tag) return false;
    if (a.tag === 'Just' && b.tag === 'Just') {
      return a.value === b.value;
    }
    return a.tag === 'Nothing' && b.tag === 'Nothing';
  }
};
```

**After:**
```typescript
// Automatic derivation
const Maybe = createSumType({
  Just: (value: any) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  derive: ['Eq']
});

// Use Maybe.Eq instead of MaybeEq
```

### From No Typeclasses

**Before:**
```typescript
// No typeclass support
const maybe1 = Maybe.constructors.Just(42);
const maybe2 = Maybe.constructors.Just(42);

// Manual comparison
const areEqual = maybe1.tag === maybe2.tag && 
                 maybe1.value === maybe2.value;
```

**After:**
```typescript
// With automatic derivation
const Maybe = createSumType({...}, { derive: ['Eq'] });

const maybe1 = Maybe.constructors.Just(42);
const maybe2 = Maybe.constructors.Just(42);

// Typeclass-based comparison
const areEqual = Maybe.Eq?.equals(maybe1, maybe2);
```

## Examples

### Complete Example: List ADT

```typescript
import { createSumType } from './fp-adt-builders';

// Define List ADT
const List = createSumType({
  Nil: () => ({}),
  Cons: (head: any, tail: any) => ({ head, tail })
}, {
  name: 'List',
  derive: ['Eq', 'Ord', 'Show']
});

// Create list values
const empty = List.constructors.Nil();
const single = List.constructors.Cons(1, empty);
const multiple = List.constructors.Cons(2, single);

// Use derived instances
console.log(List.Eq?.equals(empty, empty)); // true
console.log(List.Ord?.compare(single, multiple)); // < 0
console.log(List.Show?.show(multiple)); // "Cons({\"head\":2,\"tail\":Cons({\"head\":1,\"tail\":Nil({})})})"
```

### Complete Example: Person Product Type

```typescript
import { createProductType } from './fp-adt-builders';

// Define Person product type
const Person = createProductType({
  name: 'Person',
  derive: ['Eq', 'Ord', 'Show']
});

// Create person values
const alice = Person.of({ name: 'Alice', age: 30 });
const bob = Person.of({ name: 'Bob', age: 25 });
const alice2 = Person.of({ name: 'Alice', age: 30 });

// Use derived instances
console.log(Person.Eq?.equals(alice, alice2)); // true
console.log(Person.Ord?.compare(alice, bob)); // < 0 (Alice < Bob)
console.log(Person.Show?.show(alice)); // "{name:\"Alice\",age:30}"
```

## Conclusion

The automatic derivation system provides a powerful and convenient way to add `Eq`, `Ord`, and `Show` typeclass instances to your ADTs and product types. By simply specifying which typeclasses to derive in the configuration, you get:

- ✅ **Automatic Implementation**: No manual instance writing required
- ✅ **Registry Integration**: Instances automatically registered globally
- ✅ **Purity Integration**: All instances properly tagged as pure
- ✅ **HKT Integration**: Seamless integration with the HKT system
- ✅ **Type Safety**: Full TypeScript type safety throughout
- ✅ **Performance**: Efficient implementations with minimal overhead

This system makes it easy to add standard typeclass functionality to your custom types while maintaining consistency with the broader FP ecosystem. 

## Retroactive Migration

This section shows how existing ADTs and product types have been retroactively updated to include automatic derivation of Eq, Ord, and Show instances.

### Before: Manual Configuration

**Before the update, ADTs were created without automatic derivation:**

```typescript
// fp-maybe-unified.ts (BEFORE)
export const MaybeUnified = createSumType({
  Just: <A>(value: A) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false
  // ❌ No derive option - no automatic typeclass instances
});

// Usage required manual instance creation
const just1 = MaybeUnified.constructors.Just(42);
const just2 = MaybeUnified.constructors.Just(42);

// ❌ No automatic Eq, Ord, Show instances available
// ❌ Manual comparison required
const areEqual = just1.tag === just2.tag && just1.value === just2.value;
```

### After: Automatic Derivation

**After the update, all ADTs automatically include Eq, Ord, and Show instances:**

```typescript
// fp-maybe-unified.ts (AFTER)
export const MaybeUnified = createSumType({
  Just: <A>(value: A) => ({ value }),
  Nothing: () => ({})
}, {
  name: 'Maybe',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  enableRuntimeMarkers: false,
  derive: ['Eq', 'Ord', 'Show'] // ✅ Automatic derivation enabled
});

// Usage with automatic typeclass instances
const just1 = MaybeUnified.constructors.Just(42);
const just2 = MaybeUnified.constructors.Just(42);
const nothing = MaybeUnified.constructors.Nothing();

// ✅ Automatic Eq instance
MaybeUnified.Eq?.equals(just1, just2); // true
MaybeUnified.Eq?.equals(just1, nothing); // false

// ✅ Automatic Ord instance
MaybeUnified.Ord?.compare(just1, nothing); // > 0 (Just > Nothing)
MaybeUnified.Ord?.compare(nothing, just1); // < 0 (Nothing < Just)

// ✅ Automatic Show instance
MaybeUnified.Show?.show(just1); // "Just({\"value\":42})"
MaybeUnified.Show?.show(nothing); // "Nothing"
```

### Updated ADTs

**All existing ADTs have been retroactively updated:**

#### Core ADTs
- ✅ **MaybeUnified** (`fp-maybe-unified.ts`) - Added `derive: ['Eq', 'Ord', 'Show']`
- ✅ **EitherUnified** (`fp-either-unified.ts`) - Added `derive: ['Eq', 'Ord', 'Show']`
- ✅ **ResultUnified** (`fp-result-unified.ts`) - Added `derive: ['Eq', 'Ord', 'Show']`

#### Enhanced ADTs
- ✅ **MaybeEnhanced** (`fp-maybe-unified-enhanced.ts`) - Added `derive: ['Eq', 'Ord', 'Show']`

#### Helper Functions
- ✅ **createMaybeType()** - Added automatic derivation
- ✅ **createEitherType()** - Added automatic derivation
- ✅ **createResultType()** - Added automatic derivation
- ✅ **createPointType()** - Added automatic derivation
- ✅ **createRectangleType()** - Added automatic derivation

### Registry Integration

**All retroactively updated ADTs are automatically registered:**

```typescript
// Instances automatically registered in global registry
const registry = globalThis.__FP_REGISTRY;

// Core ADTs
registry.get('MaybeEq');     // ✅ Available
registry.get('MaybeOrd');    // ✅ Available
registry.get('MaybeShow');   // ✅ Available

registry.get('EitherEq');    // ✅ Available
registry.get('EitherOrd');   // ✅ Available
registry.get('EitherShow');  // ✅ Available

registry.get('ResultEq');    // ✅ Available
registry.get('ResultOrd');   // ✅ Available
registry.get('ResultShow');  // ✅ Available

// Product Types
registry.get('PointEq');     // ✅ Available
registry.get('PointOrd');    // ✅ Available
registry.get('PointShow');   // ✅ Available

registry.get('RectangleEq'); // ✅ Available
registry.get('RectangleOrd'); // ✅ Available
registry.get('RectangleShow'); // ✅ Available
```

### Purity Integration

**All retroactively added derivations maintain purity:**

```typescript
// All derived instances are marked as pure
MaybeUnified.Eq?.__purity;     // 'Pure'
MaybeUnified.Ord?.__purity;    // 'Pure'
MaybeUnified.Show?.__purity;   // 'Pure'

EitherUnified.Eq?.__purity;    // 'Pure'
EitherUnified.Ord?.__purity;   // 'Pure'
EitherUnified.Show?.__purity;  // 'Pure'

ResultUnified.Eq?.__purity;    // 'Pure'
ResultUnified.Ord?.__purity;   // 'Pure'
ResultUnified.Show?.__purity;  // 'Pure'
```

### HKT Integration

**All retroactively added derivations maintain HKT compatibility:**

```typescript
// HKT integration preserved
MaybeUnified.HKT;     // SumTypeK<Spec> - ✅ Available
EitherUnified.HKT;    // SumTypeK<Spec> - ✅ Available
ResultUnified.HKT;    // SumTypeK<Spec> - ✅ Available

// Derived instances work with HKT types
MaybeUnified.Eq?.equals(just1, just2);     // ✅ Works with HKT
EitherUnified.Ord?.compare(left, right);   // ✅ Works with HKT
ResultUnified.Show?.show(ok);              // ✅ Works with HKT
```

### Migration Benefits

**The retroactive migration provides immediate benefits:**

1. **Zero Breaking Changes** - All existing code continues to work
2. **Immediate Typeclass Support** - Eq, Ord, Show available without code changes
3. **Consistent API** - All ADTs now have the same typeclass interface
4. **Registry Integration** - Instances automatically available globally
5. **Purity Preservation** - All instances maintain purity tracking
6. **HKT Compatibility** - Full HKT integration preserved

### Usage Examples

**Immediate usage of retroactively added instances:**

```typescript
import { MaybeUnified, EitherUnified, ResultUnified } from './fp-maybe-unified';

// Eq instances
const just1 = MaybeUnified.constructors.Just(42);
const just2 = MaybeUnified.constructors.Just(42);
const nothing = MaybeUnified.constructors.Nothing();

MaybeUnified.Eq?.equals(just1, just2);   // true
MaybeUnified.Eq?.equals(just1, nothing); // false

// Ord instances
MaybeUnified.Ord?.compare(just1, nothing); // > 0
MaybeUnified.Ord?.compare(nothing, just1); // < 0

// Show instances
MaybeUnified.Show?.show(just1);   // "Just({\"value\":42})"
MaybeUnified.Show?.show(nothing); // "Nothing"

// Complex ADTs
const left = EitherUnified.constructors.Left('error');
const right = EitherUnified.constructors.Right(42);

EitherUnified.Eq?.equals(left, left);     // true
EitherUnified.Ord?.compare(left, right);  // < 0 (Left < Right)
EitherUnified.Show?.show(right);          // "Right({\"value\":42})"

// Result ADTs
const ok = ResultUnified.constructors.Ok(42);
const err = ResultUnified.constructors.Err('error');

ResultUnified.Eq?.equals(ok, ok);         // true
ResultUnified.Ord?.compare(ok, err);      // > 0 (Ok > Err)
ResultUnified.Show?.show(ok);             // "Ok({\"value\":42})"
```

### Standard Configuration

**The `{ derive: ['Eq', 'Ord', 'Show'] }` option is now standard for all ADTs:**

```typescript
// Standard pattern for all new ADTs
const MyADT = createSumType({
  Variant1: (value: any) => ({ value }),
  Variant2: () => ({})
}, {
  name: 'MyADT',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  derive: ['Eq', 'Ord', 'Show'] // ✅ Standard configuration
});

// Standard pattern for all new product types
const MyProduct = createProductType({
  name: 'MyProduct',
  effect: 'Pure',
  enableHKT: true,
  enableDerivableInstances: true,
  derive: ['Eq', 'Ord', 'Show'] // ✅ Standard configuration
});
```

### Complete Ecosystem

**Running 4.6 + 4.6b back-to-back provides:**

1. **Full Derivation System** - Automatic Eq, Ord, Show for all types
2. **Upgraded Existing ADTs** - All ADTs retroactively enhanced
3. **Purity + HKTs Intact** - All existing functionality preserved
4. **Consistent Typeclass Support** - Uniform API across entire FP ecosystem
5. **Registry Integration** - Global instance availability
6. **Zero Migration Effort** - Immediate benefits without code changes

The retroactive migration ensures that the entire FP ecosystem now has consistent, automatic typeclass support while maintaining all existing functionality and compatibility. 