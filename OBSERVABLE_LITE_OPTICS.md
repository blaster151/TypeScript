# ObservableLite Optics Integration

This document describes the optics integration for ObservableLite, providing fluent, type-safe access to nested data structures within reactive streams.

## Overview

ObservableLite provides two core optics methods that work seamlessly with the FP optics system:

- **`.over(optic, fn)`** - Transform values inside the optic focus
- **`.preview(optic)`** - Extract focused values from the optic

Both methods support all optic kinds (Lens, Prism, Optional) and their compositions via `.then(...)`.

## Core Methods

### `.over(optic, fn)`

Transforms values inside the optic focus for every emission in the observable stream.

**Signature:**
```typescript
over<O, B>(
  optic: O,
  fn: (focus: FocusOf<O, A>) => FocusOf<O, A>
): ObservableLite<A>
```

**Features:**
- ✅ Supports Lens, Prism, Optional, and compositions
- ✅ Type inference reflects the optic's focus type
- ✅ Always returns a new ObservableLite
- ✅ Preserves `'Async'` purity tagging
- ✅ Error handling for optic operations

**Examples:**

```typescript
import { ObservableLite } from './fp-observable-lite';
import { lens, prism, optional } from './fp-optics';

// Basic lens transformation
const people = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

const nameLens = lens(
  (p: any) => p.name,
  (name: string, p: any) => ({ ...p, name })
);

const upperNames = await people
  .over(nameLens, name => name.toUpperCase())
  .toArray();
// Result: [{ name: 'ALICE', age: 25 }, { name: 'BOB', age: 30 }]

// Prism transformation
const eithers = ObservableLite.fromArray([
  { tag: 'Right', value: 42 },
  { tag: 'Left', value: 'error' },
  { tag: 'Right', value: 100 }
]);

const rightPrism = prism(
  (e: any) => e.tag === 'Right' ? { tag: 'Just', value: e.value } : { tag: 'Nothing' },
  (value: number) => ({ tag: 'Right', value })
);

const doubledRights = await eithers
  .over(rightPrism, value => value * 2)
  .toArray();
// Result: [{ tag: 'Right', value: 84 }, { tag: 'Left', value: 'error' }, { tag: 'Right', value: 200 }]
```

### `.preview(optic)`

Extracts the focused value for every emission, filtering out values where the optic doesn't match.

**Signature:**
```typescript
preview<O>(optic: O): ObservableLite<FocusOf<O, A>>
```

**Features:**
- ✅ Supports Lens, Prism, Optional, and compositions
- ✅ Type inference reflects the optic's focus type
- ✅ Returns `ObservableLite<FocusOf<O, A>>` for proper type safety
- ✅ Preserves `'Async'` purity tagging
- ✅ Filters out non-matching values (for Prism/Optional)

**Examples:**

```typescript
// Lens preview - always extracts
const names = await people
  .preview(nameLens)
  .toArray();
// Result: ['Alice', 'Bob']

// Prism preview - only extracts matching values
const rightValues = await eithers
  .preview(rightPrism)
  .toArray();
// Result: [42, 100] (Left values are filtered out)

// Optional preview - only extracts present values
const users = ObservableLite.fromArray([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob' }, // No email
  { name: 'Charlie', email: 'charlie@example.com' }
]);

const emailOptional = optional(
  (u: any) => u.email ? { tag: 'Just', value: u.email } : { tag: 'Nothing' },
  (email: string, u: any) => ({ ...u, email })
);

const emails = await users
  .preview(emailOptional)
  .toArray();
// Result: ['alice@example.com', 'charlie@example.com'] (Bob filtered out)
```

## Cross-Kind Optic Composition

ObservableLite optics work seamlessly with composed optics via `.then(...)`:

### Lens → Lens = Lens Transform

```typescript
const userLens = lens(
  (data: any) => data.user,
  (user: any, data: any) => ({ ...data, user })
);

const nameLens = lens(
  (user: any) => user.name,
  (name: string, user: any) => ({ ...user, name })
);

// Compose lenses
const userData = ObservableLite.fromArray([
  { user: { name: 'Alice', age: 25 } },
  { user: { name: 'Bob', age: 30 } }
]);

const upperNames = await userData
  .over(userLens.then(nameLens), name => name.toUpperCase())
  .toArray();
// Result: [{ user: { name: 'ALICE', age: 25 } }, { user: { name: 'BOB', age: 30 } }]
```

### Lens → Prism = Optional Transform

```typescript
const contactLens = lens(
  (user: any) => user.contact,
  (contact: any, user: any) => ({ ...user, contact })
);

const emailPrism = prism(
  (contact: any) => contact.email ? { tag: 'Just', value: contact.email } : { tag: 'Nothing' },
  (email: string) => ({ email })
);

const users = ObservableLite.fromArray([
  { user: { contact: { email: 'alice@example.com' } } },
  { user: { contact: {} } }, // No email
  { user: { contact: { email: 'bob@example.com' } } }
]);

const upperEmails = await users
  .over(contactLens.then(emailPrism), email => email.toUpperCase())
  .toArray();
// Result: Only emails are transformed, missing emails are preserved
```

### Prism → Lens = Optional Transform

```typescript
const rightPrism = prism(
  (e: any) => e.tag === 'Right' ? { tag: 'Just', value: e.value } : { tag: 'Nothing' },
  (value: any) => ({ tag: 'Right', value })
);

const nameLens = lens(
  (value: any) => value.name,
  (name: string, value: any) => ({ ...value, name })
);

const data = ObservableLite.fromArray([
  { tag: 'Right', value: { name: 'Alice', age: 25 } },
  { tag: 'Left', value: 'error' },
  { tag: 'Right', value: { name: 'Bob', age: 30 } }
]);

const upperNames = await data
  .over(rightPrism.then(nameLens), name => name.toUpperCase())
  .toArray();
// Result: Only Right values with names are transformed
```

## Fluent Chaining

ObservableLite optics integrate seamlessly with other ObservableLite methods:

```typescript
const result = await userData
  .over(userLens.then(nameLens), name => name.toUpperCase())
  .preview(contactLens.then(emailPrism))
  .map(email => email.toLowerCase())
  .filter(email => email.includes('@'))
  .toArray();
```

## Purity Integration

Both `.over()` and `.preview()` preserve the `'Async'` purity tagging:

```typescript
import { EffectOfObservableLite } from './fp-observable-lite';

// Type-level purity checking
type Effect = EffectOfObservableLite<ObservableLite<number>>; // 'Async'
type TransformedEffect = EffectOfObservableLite<
  ReturnType<ObservableLite<number>['over']>
>; // 'Async' - preserved!
```

## Type Safety

The optics integration provides full type safety:

```typescript
// Type inference works correctly
const names: ObservableLite<string> = people.preview(nameLens);
const transformed: ObservableLite<Person> = people.over(nameLens, name => name.toUpperCase());

// Compose types are inferred correctly
const emails: ObservableLite<string> = users.preview(userLens.then(contactLens).then(emailPrism));
```

## Error Handling

The optics methods include proper error handling:

```typescript
// Errors in optic operations are propagated
const errorObs = ObservableLite.fromArray([{ invalid: 'data' }]);
const errorLens = lens(
  (data: any) => data.missing.property, // This will throw
  (value: any, data: any) => ({ ...data, missing: { property: value } })
);

try {
  await errorObs.over(errorLens, value => value).toArray();
} catch (error) {
  // Error is properly caught and propagated
}
```

## Integration with FP System

ObservableLite optics integrate with the broader FP system:

```typescript
import { Maybe, Either } from './fp-hkt';
import { ObservableLite } from './fp-observable-lite';

// Work with ADT optics
const maybeObs = ObservableLite.fromArray([
  Maybe.just('success'),
  Maybe.nothing(),
  Maybe.just('another success')
]);

const justPrism = prism(
  (m: Maybe<string>) => m.match(
    just: (value) => ({ tag: 'Just', value }),
    nothing: () => ({ tag: 'Nothing' })
  ),
  (value: string) => Maybe.just(value)
);

const successValues = await maybeObs
  .preview(justPrism)
  .toArray();
// Result: ['success', 'another success']
```

## Best Practices

1. **Use `.over()` for transformations** - When you want to modify values in place
2. **Use `.preview()` for extraction** - When you want to extract and filter values
3. **Compose optics with `.then()`** - For complex nested access patterns
4. **Leverage type inference** - Let TypeScript infer the focus types
5. **Handle errors gracefully** - Use try-catch for optic operations that might fail
6. **Preserve purity** - Both methods maintain `'Async'` purity tagging

## Performance Considerations

- **Lazy evaluation** - Optics are applied only when values are emitted
- **No unnecessary buffering** - Values are processed as they arrive
- **Efficient composition** - Composed optics are evaluated in a single pass
- **Memory efficient** - No intermediate collections are created

## Summary

ObservableLite optics provide a powerful, type-safe way to work with nested data structures in reactive streams. The integration is seamless, preserving all the benefits of the FP system while adding the expressiveness of optics to reactive programming. 