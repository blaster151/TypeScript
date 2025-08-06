# Optics Everywhere & Observable-Lite FP Ergonomics

This document provides comprehensive guidance on using the unified optics-driven transformations across all ADTs, collections, and Observables with pipe-free, optics-aware FP programming.

## Overview

The Optics Everywhere system provides:
- **Unified Optics Factories**: `.lens()`, `.prism()`, `.optional()` for all types
- **Observable-Lite FP Ergonomics**: Direct `.map()`, `.chain()`, `.filter()` without `.pipe()`
- **Cross-Type Fusion**: Optics traverse both Observable and ADT layers automatically
- **Pattern Matching with Optics**: Match clauses can focus through optics
- **Profunctor Integration**: All optics are lawful Profunctor instances
- **Type Safety**: Full TypeScript support with type inference
- **Purity**: All operations carry `'Pure'` purity tags

## Before vs After: Pipe-Free FP Programming

### Before: Traditional Pipe-Based Approach

```typescript
import { pipe } from 'fp-ts/function';
import { map, filter, chain } from 'fp-ts/Observable';

const users = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

// Complex transformation with pipes
const result = pipe(
  users,
  map(user => ({ ...user, name: user.name.toUpperCase() })),
  filter(user => user.age > 25),
  map(user => ({ ...user, age: user.age + 1 }))
);

// Optics with manual composition
const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

const transformed = pipe(
  users,
  map(user => nameLens.over(name => name.toUpperCase(), user))
);
```

### After: Optics Everywhere with Fluent Syntax

```typescript
const users = ObservableLite.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
]);

// Direct FP operations without pipes
const result = users
  .map(user => ({ ...user, name: user.name.toUpperCase() }))
  .filter(user => user.age > 25)
  .map(user => ({ ...user, age: user.age + 1 }));

// Optics with fluent syntax
const nameLens = users.lens('name');
const transformed = users.over(nameLens, name => name.toUpperCase());
```

## Optics Factories for All Types

### ADT Optics Factories

#### Maybe Optics

```typescript
import { MaybeOptics } from './fp-optics-everywhere';

const maybe = Maybe.of({ name: 'Alice', age: 25 });

// Lens to the value
const valueLens = MaybeOptics.value;
const name = valueLens.get(maybe); // { name: 'Alice', age: 25 }

// Prism to Just variant
const justPrism = MaybeOptics.Just;
const justMatch = justPrism.match(maybe); // { tag: 'Just', value: { name: 'Alice', age: 25 } }

// Prism to Nothing variant
const nothingPrism = MaybeOptics.Nothing;
const nothingMatch = nothingPrism.match(maybe); // { tag: 'Nothing' }

// Optional to the value
const valueOptional = MaybeOptics.valueOptional;
const optionalValue = valueOptional.get(maybe); // { tag: 'Just', value: { name: 'Alice', age: 25 } }
```

#### Either Optics

```typescript
import { EitherOptics } from './fp-optics-everywhere';

const either = Either.right({ name: 'Alice', age: 25 });

// Lens to the right value
const rightLens = EitherOptics.right;
const value = rightLens.get(either); // { name: 'Alice', age: 25 }

// Prism to Right variant
const rightPrism = EitherOptics.Right;
const rightMatch = rightPrism.match(either); // { tag: 'Just', value: { name: 'Alice', age: 25 } }

// Prism to Left variant
const leftPrism = EitherOptics.Left;
const leftMatch = leftPrism.match(either); // { tag: 'Nothing' }

// Optional to the right value
const rightOptional = EitherOptics.rightOptional;
const optionalValue = rightOptional.get(either); // { tag: 'Just', value: { name: 'Alice', age: 25 } }
```

#### Result Optics

```typescript
import { ResultOptics } from './fp-optics-everywhere';

const result = Result.success({ name: 'Alice', age: 25 });

// Lens to the success value
const successLens = ResultOptics.success;
const value = successLens.get(result); // { name: 'Alice', age: 25 }

// Prism to Success variant
const successPrism = ResultOptics.Success;
const successMatch = successPrism.match(result); // { tag: 'Just', value: { name: 'Alice', age: 25 } }

// Prism to Error variant
const errorPrism = ResultOptics.Error;
const errorMatch = errorPrism.match(result); // { tag: 'Nothing' }

// Optional to the success value
const successOptional = ResultOptics.successOptional;
const optionalValue = successOptional.get(result); // { tag: 'Just', value: { name: 'Alice', age: 25 } }
```

### Collection Optics Factories

#### Array Optics

```typescript
import { ArrayOptics } from './fp-optics-everywhere';

const numbers = [1, 2, 3, 4, 5];

// Traversal to all elements
const elements = ArrayOptics.elements;
const doubled = elements.modifyAll(x => x * 2, numbers); // [2, 4, 6, 8, 10]

// Lens to element at index
const atLens = ArrayOptics.at(1);
const secondElement = atLens.get(numbers); // 2
const updated = atLens.set(10, numbers); // [1, 10, 3, 4, 5]

// Optional to element at index
const atOptional = ArrayOptics.atOptional(1);
const optionalElement = atOptional.get(numbers); // { tag: 'Just', value: 2 }
const optionalUpdated = atOptional.set(10, numbers); // [1, 10, 3, 4, 5]

// Traversal to first element
const head = ArrayOptics.head;
const headDoubled = head.modifyAll(x => x * 2, numbers); // [2, 2, 3, 4, 5]

// Traversal to all elements except first
const tail = ArrayOptics.tail;
const tailDoubled = tail.modifyAll(x => x * 2, numbers); // [1, 4, 6, 8, 10]
```

#### Map Optics

```typescript
import { MapOptics } from './fp-optics-everywhere';

const map = new Map([
  ['a', 1],
  ['b', 2],
  ['c', 3]
]);

// Traversal to all values
const values = MapOptics.values;
const doubledValues = values.modifyAll(x => x * 2, map); // Map with doubled values

// Traversal to all keys
const keys = MapOptics.keys;
const upperCaseKeys = keys.modifyAll(key => key.toUpperCase(), map); // Map with uppercase keys

// Traversal to all entries
const entries = MapOptics.entries;
const swappedEntries = entries.modifyAll(([key, value]) => [value, key], map); // Map with swapped key-value

// Optional to value at key
const atOptional = MapOptics.at('a');
const optionalValue = atOptional.get(map); // { tag: 'Just', value: 1 }
const updatedMap = atOptional.set(10, map); // Map with 'a' -> 10
```

### Custom Type Optics

```typescript
import { withOptics } from './fp-optics-everywhere';

// Define a custom type
interface Person {
  name: string;
  age: number;
  email?: string;
}

// Create optics for the type
const PersonOptics = withOptics<Person>({});

// Lens to name field
const nameLens = PersonOptics.lens('name');
const person: Person = { name: 'Alice', age: 25 };
const name = nameLens.get(person); // 'Alice'
const updatedPerson = nameLens.set('Bob', person); // { name: 'Bob', age: 25 }

// Optional to email field (may not exist)
const emailOptional = PersonOptics.optional('email');
const email = emailOptional.get(person); // { tag: 'Nothing' }
const personWithEmail = { name: 'Alice', age: 25, email: 'alice@example.com' };
const emailValue = emailOptional.get(personWithEmail); // { tag: 'Just', value: 'alice@example.com' }

// Prism to a variant (for sum types)
const variantPrism = PersonOptics.prism('Admin');
const variantMatch = variantPrism.match(person); // { tag: 'Nothing' }
```

## Observable-Lite FP Ergonomics

### Direct FP Operations

```typescript
import { ObservableLiteWithOptics } from './fp-optics-everywhere';

const users = ObservableLiteWithOptics.fromArray([
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 }
]);

// Map operation
const upperCaseNames = users.map(user => ({ ...user, name: user.name.toUpperCase() }));

// Filter operation
const adults = users.filter(user => user.age >= 18);

// Chain operation (flatMap)
const userNames = users.chain(user => ObservableLiteWithOptics.of(user.name));

// Bichain operation (for Either/Result types)
const results = users.bichain(
  error => ObservableLiteWithOptics.of('Error'),
  user => ObservableLiteWithOptics.of(user.name)
);

// Complex chain
const result = users
  .map(user => ({ ...user, name: user.name.toUpperCase() }))
  .filter(user => user.age > 25)
  .chain(user => ObservableLiteWithOptics.of(user.name));
```

### Optics in Streams

```typescript
// Transform via lens
const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

const upperCaseUsers = users.over(nameLens, name => name.toUpperCase());

// Preview via prism
const justPrism = prism(
  (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
  (value) => ({ tag: 'Just', value })
);

const maybeUsers = ObservableLiteWithOptics.fromArray([
  Maybe.of({ name: 'Alice', age: 25 }),
  Maybe.nothing(),
  Maybe.of({ name: 'Bob', age: 30 })
]);

const justValues = maybeUsers.preview(justPrism);

// Transform via optional
const ageOptional = optional(
  (user) => user.age > 0 ? { tag: 'Just', value: user.age } : { tag: 'Nothing' },
  (age, user) => ({ ...user, age })
);

const doubledAges = users.overOptional(ageOptional, age => age * 2);
```

## Cross-Type Fusion

### Observable with Nested ADTs

```typescript
// Observable containing Maybe values
const maybeUsers = ObservableLiteWithOptics.fromArray([
  Maybe.of({ name: 'Alice', age: 25 }),
  Maybe.nothing(),
  Maybe.of({ name: 'Bob', age: 30 })
]);

// Optics traverse both layers automatically
const upperCaseNames = maybeUsers.over(
  ArrayOptics.elements.then(MaybeOptics.Just).then(MaybeOptics.value).then(nameLens),
  name => name.toUpperCase()
);

// Observable containing Either values
const eitherUsers = ObservableLiteWithOptics.fromArray([
  Either.right({ name: 'Alice', age: 25 }),
  Either.left('User not found'),
  Either.right({ name: 'Bob', age: 30 })
]);

// Focus on right values only
const rightValues = eitherUsers.over(
  ArrayOptics.elements.then(EitherOptics.Right).then(EitherOptics.right),
  user => ({ ...user, name: user.name.toUpperCase() })
);
```

### Complex Nested Transformations

```typescript
const complexData = ObservableLiteWithOptics.fromArray([
  {
    user: {
      profile: {
        name: 'Alice',
        age: 25,
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      }
    }
  },
  {
    user: {
      profile: {
        name: 'Bob',
        age: 30,
        preferences: {
          theme: 'light',
          language: 'es'
        }
      }
    }
  }
]);

// Create complex optic chain
const userLens = lens(
  (data) => data.user,
  (user, data) => ({ ...data, user })
);

const profileLens = lens(
  (user) => user.profile,
  (profile, user) => ({ ...user, profile })
);

const nameLens = lens(
  (profile) => profile.name,
  (name, profile) => ({ ...profile, name })
);

const themeLens = lens(
  (preferences) => preferences.theme,
  (theme, preferences) => ({ ...preferences, theme })
);

// Compose optics for deep transformation
const complexOptic = ArrayOptics.elements
  .then(userLens)
  .then(profileLens)
  .then(nameLens);

const themeOptic = ArrayOptics.elements
  .then(userLens)
  .then(profileLens)
  .then(lens(
    (profile) => profile.preferences,
    (preferences, profile) => ({ ...profile, preferences })
  ))
  .then(themeLens);

// Apply transformations
const upperCaseNames = complexData.over(complexOptic, name => name.toUpperCase());
const invertedThemes = complexData.over(themeOptic, theme => theme === 'dark' ? 'light' : 'dark');
```

## Pattern Matching with Optics

### Basic Pattern Matching

```typescript
import { matchWithOptics } from './fp-optics-everywhere';

const maybe = Maybe.of({ name: 'Alice', age: 25 });

const result = matchWithOptics(maybe)
  .case(MaybeOptics.Just, (value) => `Found: ${value.name}`)
  .case(MaybeOptics.Nothing, () => 'Not found')
  .default(() => 'Unknown');

// Result: "Found: Alice"
```

### Pattern Matching with Lenses

```typescript
const person = { name: 'Alice', age: 25 };

const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

const result = matchWithOptics(person)
  .case(nameLens, (name) => `Name is: ${name}`)
  .default(() => 'No name');

// Result: "Name is: Alice"
```

### Pattern Matching with Prisms

```typescript
const either = Either.right({ name: 'Alice', age: 25 });

const result = matchWithOptics(either)
  .case(EitherOptics.Right, (value) => `Success: ${value.name}`)
  .case(EitherOptics.Left, (error) => `Error: ${error}`)
  .default(() => 'Unknown');

// Result: "Success: Alice"
```

### Complex Pattern Matching

```typescript
const complexData = [
  { user: { profile: { name: 'Alice', age: 25 } } },
  { user: { profile: { name: 'Bob', age: 30 } } }
];

const userLens = lens(
  (data) => data.user,
  (user, data) => ({ ...data, user })
);

const profileLens = lens(
  (user) => user.profile,
  (profile, user) => ({ ...user, profile })
);

const nameLens = lens(
  (profile) => profile.name,
  (name, profile) => ({ ...profile, name })
);

const complexOptic = userLens.then(profileLens).then(nameLens);

const result = matchWithOptics(complexData[0])
  .case(complexOptic, (name) => `User name: ${name}`)
  .case(userLens, (user) => `User: ${user.profile.name}`)
  .default(() => 'Unknown');

// Result: "User name: Alice"
```

## Profunctor Integration

### Optics as Profunctor Instances

```typescript
import { registerOpticsProfunctors } from './fp-optics-everywhere';

// All optics automatically register as Profunctor instances
registerOpticsProfunctors();

// Lens as Profunctor
const nameLens = lens(
  (person) => person.name,
  (name, person) => ({ ...person, name })
);

// dimap: transform input and output
const upperCaseLens = nameLens.dimap(
  (person) => person, // input transformation
  (name) => name.toUpperCase() // output transformation
);

// Prism as Profunctor
const justPrism = prism(
  (maybe) => maybe.tag === 'Just' ? { tag: 'Just', value: maybe.value } : { tag: 'Nothing' },
  (value) => ({ tag: 'Just', value })
);

// dimap: transform input and output
const transformedPrism = justPrism.dimap(
  (maybe) => maybe, // input transformation
  (value) => ({ ...value, transformed: true }) // output transformation
);
```

### Profunctor Laws

```typescript
// Identity law: dimap id id === id
const identity = x => x;
const result = lens.dimap(identity, identity);
// result should be equivalent to lens

// Composition law: dimap f g . dimap h i === dimap (f . h) (i . g)
const f = x => x * 2;
const g = x => x.toString();
const h = x => x + 1;
const i = x => x.toUpperCase();

const left = lens.dimap(lens.dimap(h, i), f, g);
const right = lens.dimap(x => f(h(x)), x => i(g(x)));
// left should be equivalent to right
```

## Real-World Examples

### Form Validation Pipeline

```typescript
const formData = ObservableLiteWithOptics.fromArray([
  { name: 'Alice', email: 'alice@example.com', age: 25 },
  { name: 'Bob', email: 'invalid-email', age: 30 },
  { name: 'Charlie', email: 'charlie@test.org', age: 35 }
]);

// Create optics for form fields
const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

const emailLens = lens(
  (user) => user.email,
  (email, user) => ({ ...user, email })
);

const ageLens = lens(
  (user) => user.age,
  (age, user) => ({ ...user, age })
);

// Validation pipeline
const validationResult = formData
  .over(emailLens, email => email.toLowerCase())
  .filter(user => user.email.includes('@'))
  .over(nameLens, name => name.toUpperCase())
  .over(ageLens, age => age + 1);

// Result: [{ name: 'ALICE', email: 'alice@example.com', age: 26 }, { name: 'CHARLIE', email: 'charlie@test.org', age: 36 }]
```

### API Response Processing

```typescript
const apiResponses = ObservableLiteWithOptics.fromArray([
  { status: 'success', data: { user: { name: 'Alice', age: 25 } } },
  { status: 'error', error: 'User not found' },
  { status: 'success', data: { user: { name: 'Bob', age: 30 } } }
]);

// Create optics for API response structure
const successPrism = prism(
  (response) => response.status === 'success' ? { tag: 'Just', value: response.data } : { tag: 'Nothing' },
  (data) => ({ status: 'success', data })
);

const userLens = lens(
  (data) => data.user,
  (user, data) => ({ ...data, user })
);

const nameLens = lens(
  (user) => user.name,
  (name, user) => ({ ...user, name })
);

// Process successful responses
const userNames = apiResponses
  .preview(successPrism)
  .over(userLens.then(nameLens), name => name.toUpperCase());

// Result: Observable of ["ALICE", "BOB"]
```

### Configuration Management

```typescript
const configs = ObservableLiteWithOptics.fromArray([
  {
    app: {
      theme: 'dark',
      language: 'en',
      features: {
        notifications: true,
        analytics: false
      }
    }
  },
  {
    app: {
      theme: 'light',
      language: 'es',
      features: {
        notifications: false,
        analytics: true
      }
    }
  }
]);

// Create optics for nested configuration
const appLens = lens(
  (config) => config.app,
  (app, config) => ({ ...config, app })
);

const themeLens = lens(
  (app) => app.theme,
  (theme, app) => ({ ...app, theme })
);

const featuresLens = lens(
  (app) => app.features,
  (features, app) => ({ ...app, features })
);

const notificationsLens = lens(
  (features) => features.notifications,
  (notifications, features) => ({ ...features, notifications })
);

// Apply configuration transformations
const invertedThemes = configs.over(
  appLens.then(themeLens),
  theme => theme === 'dark' ? 'light' : 'dark'
);

const enabledNotifications = configs.over(
  appLens.then(featuresLens).then(notificationsLens),
  notifications => true
);
```

## Best Practices

### When to Use Each Feature

#### Use Optics Factories When:
- Working with structured data types
- Need consistent optics across similar types
- Want type-safe field access

#### Use Observable-Lite FP Ergonomics When:
- Working with reactive streams
- Need chainable operations
- Want to avoid pipe syntax

#### Use Cross-Type Fusion When:
- Working with nested data structures
- Need to transform data at multiple levels
- Want automatic traversal through ADTs

#### Use Pattern Matching with Optics When:
- Need conditional logic based on data structure
- Want to focus on specific parts of data
- Need type-safe branching

### Performance Considerations

1. **Lazy Evaluation**: Optics only compute when used
2. **Composition Efficiency**: Composed optics are optimized
3. **Memory Efficiency**: Minimal intermediate allocations
4. **Type Safety**: Compile-time checking prevents runtime errors

### Type Safety Tips

1. **Leverage Type Inference**: Let TypeScript infer optic types
2. **Use Type Annotations**: Add explicit types for complex optics
3. **Check Composition**: Verify optic composition types
4. **Test Both APIs**: Ensure both fluent and data-last APIs work

## Summary

The Optics Everywhere & Observable-Lite FP Ergonomics system provides:

- ✅ **Unified Optics Factories**: `.lens()`, `.prism()`, `.optional()` for all types
- ✅ **Observable-Lite FP Ergonomics**: Direct `.map()`, `.chain()`, `.filter()` without `.pipe()`
- ✅ **Cross-Type Fusion**: Optics traverse both Observable and ADT layers automatically
- ✅ **Pattern Matching with Optics**: Match clauses can focus through optics
- ✅ **Profunctor Integration**: All optics are lawful Profunctor instances
- ✅ **Type Safety**: Full TypeScript support with type inference
- ✅ **Purity**: All operations carry `'Pure'` purity tags
- ✅ **Performance**: Optimized composition and lazy evaluation

This delivers **pipe-free, optics-aware FP programming** across all data types with **maximum ergonomics** and **full type safety**! 🚀 