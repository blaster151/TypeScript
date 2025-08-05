# Optics Fluent API Documentation

## Overview

The Optics Fluent API provides seamless integration between Algebraic Data Types (ADTs) and the optics system, allowing you to use `.view`, `.set`, `.over`, `.preview`, and `.review` methods directly on ADT instances without requiring `.pipe()` or manual function calls.

## Unified Preview Method

The `.preview` method in `ObservableLiteOptics` has been enhanced to work with **any optic kind** (Lens, Prism, or Optional) while preserving type safety and purity guarantees.

### Cross-Kind Optic Support

The unified `.preview` method automatically detects the optic type and applies the appropriate extraction logic:

#### Lens Support
```typescript
// For lenses, wraps the result in Maybe.Just
// If the lens fails to extract (throws), returns Maybe.Nothing
const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);

const observable = ObservableLiteOptics.of(maybePerson);
const nameObservable = observable.preview(nameLens);
// Returns: ObservableLite<Maybe<string>>
```

#### Prism Support
```typescript
// For prisms, uses the native match method
const justPrism = prism(
  m => m.isJust ? Maybe.Just(m.value) : Maybe.Nothing(),
  value => Maybe.Just(value)
);

const observable = ObservableLiteOptics.of(maybePerson);
const valueObservable = observable.preview(justPrism);
// Returns: ObservableLite<Maybe<Person>>
```

#### Optional Support
```typescript
// For optionals, uses the native getOption method
const valueOptional = {
  getOption: (m) => m.isJust ? Maybe.Just(m.value) : Maybe.Nothing(),
  set: (m, value) => new Maybe(value, m.isJust),
  over: (f, m) => m.isJust ? new Maybe(f(m.value), true) : m
};

const observable = ObservableLiteOptics.of(maybePerson);
const valueObservable = observable.preview(valueOptional);
// Returns: ObservableLite<Maybe<Person>>
```

### Cross-Kind Composition

The unified preview method works seamlessly with cross-kind optic composition:

```typescript
// Lens → Prism composition
const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);

const firstLetterPrism = prism(
  name => name.length > 0 ? Maybe.Just(name[0]) : Maybe.Nothing(),
  letter => letter
);

// Composed optic: lens.then(prism) = optional
const composedOptic = {
  get: (m) => m.isJust ? nameLens.get(m.value) : null,
  set: (m, name) => m.isJust ? new Maybe(nameLens.set(m.value, name), true) : m,
  over: (f, m) => m.isJust ? new Maybe(nameLens.over(f, m.value), true) : m
};

const observable = ObservableLiteOptics.of(maybePerson);
const firstLetterObservable = observable.preview(composedOptic);
// Returns: ObservableLite<Maybe<string>>
```

### Implementation Details

The unified preview method uses runtime type detection to determine the appropriate extraction strategy:

```typescript
enhanced.preview = function(optic) {
  return this.map(value => {
    // Check if it's a lens (has get method)
    if (optic.get && optic.set) {
      try {
        const result = optic.get(value);
        return Maybe.Just(result);
      } catch (error) {
        return Maybe.Nothing();
      }
    }
    // Check if it's a prism (has match method)
    else if (optic.match && optic.build) {
      return optic.match(value);
    }
    // Check if it's an optional (has getOption method)
    else if (optic.getOption) {
      return optic.getOption(value);
    }
    // Unknown optic type
    else {
      throw new Error(`Unknown optic type: ${typeof optic}`);
    }
  });
};
```

### Type Safety

- **Lens**: Always returns `Maybe<A>` (wraps result in `Just` or handles errors with `Nothing`)
- **Prism**: Returns `Maybe<A>` (uses native prism matching)
- **Optional**: Returns `Maybe<A>` (uses native optional extraction)
- **Composed**: Returns `Maybe<A>` (follows composition rules)

### Purity Guarantees

- All preview operations are **pure** and preserve the `'Async'` effect tag for `ObservableLite`
- No side effects are introduced by the preview method
- Type inference is preserved across all optic kinds

### Error Handling

- **Lens errors**: Caught and converted to `Maybe.Nothing()`
- **Unknown optic types**: Throws descriptive error at runtime
- **Null/undefined values**: Handled gracefully by each optic type

### Usage Examples

#### Basic Usage
```typescript
// Lens on ObservableLite
const personObservable = ObservableLiteOptics.of(maybePerson);
const nameObservable = personObservable.preview(nameLens);

// Prism on ObservableLite
const valueObservable = personObservable.preview(justPrism);

// Optional on ObservableLite
const valueObservable = personObservable.preview(valueOptional);
```

#### Chained Operations
```typescript
// Chain preview with other operations
const result = ObservableLiteOptics.of(maybePerson)
  .preview(nameLens)
  .map(maybeName => maybeName.map(name => name.toUpperCase()))
  .filter(maybeName => maybeName.isJust);
```

#### Real-world Example
```typescript
// Working with form validation
const formObservable = ObservableLiteOptics.of(maybeForm);
const emailErrorObservable = formObservable.preview(fieldErrorLens('email'));

emailErrorObservable.subscribe({
  next: maybeError => {
    if (maybeError.isJust) {
      console.log('Email error:', maybeError.value);
    }
  }
});
```

### Integration with ADT Optics

The unified preview method integrates seamlessly with the broader ADT optics system:

- Works with `Maybe`, `Either`, `Result`, and `ObservableLite` instances
- Preserves HKT type parameters and purity markers
- Supports cross-kind composition rules
- Maintains law compliance for all optic types

### Benefits

1. **Unified API**: Single method works with all optic kinds
2. **Type Safety**: Preserves TypeScript type inference
3. **Purity**: Maintains functional programming principles
4. **Composability**: Works with cross-kind optic composition
5. **Error Handling**: Graceful handling of failures and edge cases
6. **Performance**: Efficient runtime type detection

This unified approach eliminates the need for separate preview methods for each optic kind while maintaining the full power and type safety of the optics system. 