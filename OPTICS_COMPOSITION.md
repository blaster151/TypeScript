# Optics Composition Documentation

## Overview

The Optics Composition system provides robust type-safe composition of different optic kinds (Lens, Prism, Optional, Traversal) with well-typed type-guard helpers that ensure reliable optic kind detection at both compile-time and runtime.

## Strengthened Type Guards

The system uses well-typed type-guard helpers to reliably distinguish between different optic kinds, replacing ad-hoc property checks with robust, type-safe detection mechanisms.

### Type Guard Functions

#### `isLens<S, T, A, B>(o: any): o is Lens<S, T, A, B>`
```typescript
function isLens<S, T, A, B>(o: any): o is Lens<S, T, A, B> {
  return o && typeof o.get === 'function' && typeof o.set === 'function';
}
```
**Purpose**: Detects if a value is a Lens by checking for the presence of `get` and `set` methods.

**Usage**:
```typescript
const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);

if (isLens(nameLens)) {
  // TypeScript now knows nameLens is a Lens
  const value = nameLens.get(person);
}
```

#### `isPrism<S, T, A, B>(o: any): o is Prism<S, T, A, B>`
```typescript
function isPrism<S, T, A, B>(o: any): o is Prism<S, T, A, B> {
  return o && typeof o.match === 'function' && typeof o.build === 'function';
}
```
**Purpose**: Detects if a value is a Prism by checking for the presence of `match` and `build` methods.

**Usage**:
```typescript
const justPrism = prism(
  m => m.isJust ? Maybe.Just(m.value) : Maybe.Nothing(),
  value => Maybe.Just(value)
);

if (isPrism(justPrism)) {
  // TypeScript now knows justPrism is a Prism
  const result = justPrism.match(maybeValue);
}
```

#### `isOptional<S, T, A, B>(o: any): o is Optional<S, T, A, B>`
```typescript
function isOptional<S, T, A, B>(o: any): o is Optional<S, T, A, B> {
  return o && typeof o.getOption === 'function' && typeof o.set === 'function';
}
```
**Purpose**: Detects if a value is an Optional by checking for the presence of `getOption` and `set` methods.

**Usage**:
```typescript
const valueOptional = {
  getOption: (m) => m.isJust ? Maybe.Just(m.value) : Maybe.Nothing(),
  set: (m, value) => new Maybe(value, m.isJust)
};

if (isOptional(valueOptional)) {
  // TypeScript now knows valueOptional is an Optional
  const result = valueOptional.getOption(maybeValue);
}
```

#### `isTraversal<S, T, A, B>(o: any): o is Traversal<S, T, A, B>`
```typescript
function isTraversal<S, T, A, B>(o: any): o is Traversal<S, T, A, B> {
  return o && typeof o.traverse === 'function';
}
```
**Purpose**: Detects if a value is a Traversal by checking for the presence of a `traverse` method.

## Cross-Kind Composition with Type Guards

The type guards enable reliable cross-kind composition in `.then(...)` implementations:

### Lens Composition
```typescript
function lens<S, T, A, B>(
  getter: (s: S) => A,
  setter: (s: S, b: B) => T
): Lens<S, T, A, B> {
  return {
    get: getter,
    set: setter,
    then(next: AnyOptic<A, B, any, any>): any {
      if (isLens(next)) {
        // Lens → Lens = Lens
        return lens(
          (s: S) => next.get(getter(s)),
          (b2: any, s: S) => setter(next.set(b2, getter(s)), s)
        );
      }
      if (isPrism(next)) {
        // Lens → Prism = Optional
        return optionalFromLensPrism(this, next);
      }
      if (isOptional(next)) {
        // Lens → Optional = Optional
        return optionalFromLensOptional(this, next);
      }
      throw new Error('Invalid optic for .then');
    }
  };
}
```

### Prism Composition
```typescript
function prism<S, T, A, B>(
  match: (s: S) => Maybe<A>,
  build: (b: B) => T
): Prism<S, T, A, B> {
  return {
    match,
    build,
    then(next: AnyOptic<A, B, any, any>): any {
      if (isPrism(next)) {
        // Prism → Prism = Prism
        return prism(
          (s: S) => match(s).chain(a => next.match(a)),
          (b2: any) => build(next.build(b2))
        );
      }
      if (isLens(next)) {
        // Prism → Lens = Optional
        return optionalFromPrismLens(this, next);
      }
      if (isOptional(next)) {
        // Prism → Optional = Optional
        return optionalFromPrismOptional(this, next);
      }
      throw new Error('Invalid optic for .then');
    }
  };
}
```

### Optional Composition
```typescript
function optional<S, T, A, B>(
  getOption: (s: S) => Maybe<A>,
  set: (s: S, b: B) => T
): Optional<S, T, A, B> {
  return {
    getOption,
    set,
    then(next: AnyOptic<A, B, any, any>): any {
      if (isLens(next)) {
        // Optional → Lens = Optional
        return optionalFromOptionalLens(this, next);
      }
      if (isPrism(next)) {
        // Optional → Prism = Optional
        return optionalFromOptionalPrism(this, next);
      }
      if (isOptional(next)) {
        // Optional → Optional = Optional
        return optionalFromOptionalOptional(this, next);
      }
      throw new Error('Invalid optic for .then');
    }
  };
}
```

## Unified Preview Method with Type Guards

The `.preview` method in `ObservableLiteOptics` uses type guards for reliable optic kind detection:

```typescript
enhanced.preview = function(optic) {
  return this.map(value => {
    // Use strengthened type guards for reliable optic kind detection
    if (isLens(optic)) {
      try {
        // For lens, wrap in Maybe.Just, but handle potential errors
        const result = optic.get(value);
        return Maybe.Just(result);
      } catch (error) {
        return Maybe.Nothing();
      }
    }
    else if (isPrism(optic)) {
      return optic.match(value);
    }
    else if (isOptional(optic)) {
      return optic.getOption(value);
    }
    else {
      throw new Error(`Unsupported optic kind for preview: ${typeof optic}`);
    }
  });
};
```

## Benefits of Strengthened Type Guards

### 1. **Type Safety**
- Compile-time type checking ensures correct optic kind detection
- TypeScript can infer the correct optic type after type guard checks
- Eliminates runtime errors from incorrect optic kind assumptions

### 2. **Reliability**
- Consistent detection logic across the entire codebase
- No more ad-hoc property checks that can break with implementation changes
- Centralized optic kind detection logic

### 3. **Maintainability**
- Single source of truth for optic kind detection
- Easy to update detection logic in one place
- Clear documentation of what constitutes each optic kind

### 4. **Performance**
- Efficient property checks without complex introspection
- No runtime type information required
- Minimal overhead for type detection

### 5. **Extensibility**
- Easy to add new optic kinds by adding new type guards
- Consistent pattern for all optic type detection
- Backward compatible with existing optic implementations

## Composition Rules

The type guards enable the following composition rules:

| First Optic | Second Optic | Result | Type Guard Check |
|-------------|--------------|--------|------------------|
| Lens        | Lens         | Lens   | `isLens(next)`   |
| Lens        | Prism        | Optional | `isPrism(next)` |
| Lens        | Optional     | Optional | `isOptional(next)` |
| Prism       | Prism        | Prism  | `isPrism(next)`   |
| Prism       | Lens         | Optional | `isLens(next)`   |
| Prism       | Optional     | Optional | `isOptional(next)` |
| Optional    | Lens         | Optional | `isLens(next)`   |
| Optional    | Prism        | Optional | `isPrism(next)`   |
| Optional    | Optional     | Optional | `isOptional(next)` |

## Error Handling

The type guards provide clear error messages when unsupported optic kinds are encountered:

```typescript
// In .then() methods
if (!isLens(next) && !isPrism(next) && !isOptional(next)) {
  throw new Error('Invalid optic for .then');
}

// In .preview() method
if (!isLens(optic) && !isPrism(optic) && !isOptional(optic)) {
  throw new Error(`Unsupported optic kind for preview: ${typeof optic}`);
}
```

## Testing Type Guards

The type guards are thoroughly tested to ensure reliable detection:

```typescript
// Test lens detection
const testLens = lens(x => x.value, (x, value) => ({ ...x, value }));
assertEqual(isLens(testLens), true, 'should detect lens correctly');
assertEqual(isLens({}), false, 'should not detect non-lens as lens');

// Test prism detection
const testPrism = prism(
  x => x.isJust ? Maybe.Just(x.value) : Maybe.Nothing(),
  x => Maybe.Just(x)
);
assertEqual(isPrism(testPrism), true, 'should detect prism correctly');
assertEqual(isPrism({}), false, 'should not detect non-prism as prism');

// Test optional detection
const testOptional = {
  getOption: (x) => x.isJust ? Maybe.Just(x.value) : Maybe.Nothing(),
  set: (x, value) => new Maybe(value, x.isJust)
};
assertEqual(isOptional(testOptional), true, 'should detect optional correctly');
assertEqual(isOptional({}), false, 'should not detect non-optional as optional');
```

## Integration with ADT Optics

The strengthened type guards integrate seamlessly with the broader ADT optics system:

- **Maybe Optics**: Type guards work with `Maybe` instances and their optics
- **Either Optics**: Type guards work with `Either` instances and their optics
- **Result Optics**: Type guards work with `Result` instances and their optics
- **ObservableLite Optics**: Type guards enable unified preview method

## Future Extensions

The type guard system is designed to be extensible:

1. **New Optic Kinds**: Add new type guards for additional optic types
2. **Enhanced Detection**: Extend type guards with additional validation logic
3. **Performance Optimization**: Add caching or memoization for type guard results
4. **Debugging Support**: Add detailed logging for type guard decisions

This strengthened type guard system ensures reliable, type-safe optic composition and preview operations throughout the functional programming ecosystem. 