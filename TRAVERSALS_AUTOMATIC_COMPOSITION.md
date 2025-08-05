# Traversals Automatic Composition Documentation

## Overview

The Traversal system now supports automatic composition through the `.then(...)` method, enabling seamless composition between Traversals and other optic kinds without manual composition boilerplate. This provides a fluent, type-safe API for complex optic compositions.

## Core Features

### Automatic Composition Rules

The `.then(...)` method automatically handles composition between different optic kinds:

| First Optic | Second Optic | Result | Behavior |
|-------------|--------------|--------|----------|
| Traversal   | Traversal    | Traversal | Composes via `composeTraversal` |
| Lens        | Traversal    | Traversal | Focus becomes multiple values |
| Prism       | Traversal    | Traversal | All matches visited |
| Optional    | Traversal    | Traversal | Optional focus becomes multiple values |
| Traversal   | Lens         | Traversal | Each focused value transformed by lens |
| Traversal   | Prism        | Traversal | Each focused value filtered by prism |
| Traversal   | Optional     | Traversal | Each focused value optionally transformed |

### `composeTraversal` Utility

The `composeTraversal` function provides the foundation for automatic Traversal composition:

```typescript
function composeTraversal<S, T, A, B, C, D>(
  t1: Traversal<S, T, A, B>,
  t2: Traversal<A, B, C, D>
): Traversal<S, T, C, D>
```

**Features**:
- Works for any Applicative F
- Preserves HKT + purity metadata
- Handles both Traversal → Traversal and Lens → Traversal compositions
- Maintains mathematical laws (identity, associativity)

## Composition Examples

### Traversal → Traversal Composition

```typescript
const people = [
  { name: 'Alice', tags: ['dev', 'admin'] },
  { name: 'Bob', tags: ['user'] },
  { name: 'Charlie', tags: ['dev', 'user'] }
];

const nameLens = lens(
  person => person.name,
  (person, name) => ({ ...person, name })
);

const tagsLens = lens(
  person => person.tags,
  (person, tags) => ({ ...person, tags })
);

// Automatic composition: each → name
const namesTraversal = each().then(nameLens);
const allNames = collect(namesTraversal, people);
// Result: ['Alice', 'Bob', 'Charlie']

// Automatic composition: each → tags
const tagsTraversal = each().then(tagsLens);
const allTags = collect(tagsTraversal, people);
// Result: [['dev', 'admin'], ['user'], ['dev', 'user']]

// Transform all names to uppercase
const upperCaseNames = overTraversal(namesTraversal, name => name.toUpperCase(), people);
// Result: [{ name: 'ALICE', tags: ['dev', 'admin'] }, ...]
```

### Lens → Traversal Composition

```typescript
const posts = [
  { title: 'Post 1', author: { name: 'Alice', tags: ['dev', 'admin'] } },
  { title: 'Post 2', author: { name: 'Bob', tags: ['user'] } }
];

const authorLens = lens(
  post => post.author,
  (post, author) => ({ ...post, author })
);

const tagsLens = lens(
  author => author.tags,
  (author, tags) => ({ ...author, tags })
);

// Lens → Traversal composition
const postsAuthorTagsTraversal = each().then(authorLens).then(tagsLens);
const allAuthorTags = collect(postsAuthorTagsTraversal, posts);
// Result: [['dev', 'admin'], ['user']]

// Transform all author tags
const updatedPosts = overTraversal(postsAuthorTagsTraversal, tag => tag + '!', posts);
// Result: [{ title: 'Post 1', author: { name: 'Alice', tags: ['dev!', 'admin!'] } }, ...]
```

### Prism → Traversal Composition

```typescript
const maybePost = Maybe.Just({
  title: 'My Post',
  author: { name: 'Alice', tags: ['dev', 'admin'] }
});

const maybePostPrism = prism(
  maybe => maybe.isJust ? Maybe.Just(maybe.value) : Maybe.Nothing(),
  post => Maybe.Just(post)
);

const authorLens = lens(
  post => post.author,
  (post, author) => ({ ...post, author })
);

const tagsLens = lens(
  author => author.tags,
  (author, tags) => ({ ...author, tags })
);

// Prism → Traversal composition
const maybeAuthorTagsTraversal = maybePostPrism.then(authorLens).then(tagsLens);
const maybeAllTags = maybeAuthorTagsTraversal.getOption(maybePost);
// Result: Maybe.Just(['dev', 'admin'])
```

### Optional → Traversal Composition

```typescript
const optionalPost = {
  title: 'My Post',
  author: Maybe.Just({ name: 'Alice', tags: ['dev', 'admin'] })
};

const authorOptional = optional(
  post => post.author,
  (post, author) => ({ ...post, author })
);

const tagsLens = lens(
  author => author.tags,
  (author, tags) => ({ ...author, tags })
);

// Optional → Traversal composition
const optionalAuthorTagsTraversal = authorOptional.then(tagsLens);
const optionalAllTags = optionalAuthorTagsTraversal.getOption(optionalPost);
// Result: Maybe.Just(['dev', 'admin'])
```

## Complex Nested Compositions

### Deep Nested Data Access

```typescript
const data = {
  users: [
    { id: 1, profile: { name: 'Alice', tags: ['dev', 'admin'] } },
    { id: 2, profile: { name: 'Bob', tags: ['user'] } },
    { id: 3, profile: { name: 'Charlie', tags: ['dev', 'user'] } }
  ]
};

const usersLens = lens(
  data => data.users,
  (data, users) => ({ ...data, users })
);

const profileLens = lens(
  user => user.profile,
  (user, profile) => ({ ...user, profile })
);

const nameLens = lens(
  profile => profile.name,
  (profile, name) => ({ ...profile, name })
);

const tagsLens = lens(
  profile => profile.tags,
  (profile, tags) => ({ ...profile, tags })
);

// Complex composition: users → each → profile → tags → each
const complexTagsTraversal = usersLens.then(each()).then(profileLens).then(tagsLens).then(each());
const complexAllTags = collect(complexTagsTraversal, data);
// Result: ['dev', 'admin', 'user', 'dev', 'user']

// Transform all tags to uppercase
const upperCaseTags = overTraversal(complexTagsTraversal, tag => tag.toUpperCase(), data);
// Result: All tags are uppercase
```

### Manual vs Automatic Composition

**Before (Manual)**:
```typescript
// Manual composition requires explicit composeTraversal calls
const manualComposed = composeTraversal(
  composeTraversal(usersLens, each()),
  composeTraversal(profileLens, composeTraversal(tagsLens, each()))
);
const manualAllTags = collect(manualComposed, data);
```

**After (Automatic)**:
```typescript
// Automatic composition via .then(...)
const automaticComposed = usersLens.then(each()).then(profileLens).then(tagsLens).then(each());
const automaticAllTags = collect(automaticComposed, data);
// Same result, much cleaner syntax
```

## Mathematical Laws

### Identity Law

```typescript
// composeTraversal(t, idTraversal) = t
const idTraversal = traversal(
  (s) => [s],
  (bs, s) => bs[0]
);

const composed = composeTraversal(someTraversal, idTraversal);
// composed behaves identically to someTraversal
```

### Associativity Law

```typescript
// composeTraversal(composeTraversal(t1, t2), t3) = composeTraversal(t1, composeTraversal(t2, t3))
const t1 = traversal1;
const t2 = traversal2;
const t3 = traversal3;

const left = composeTraversal(composeTraversal(t1, t2), t3);
const right = composeTraversal(t1, composeTraversal(t2, t3));
// left and right behave identically
```

## Type Safety

### Full TypeScript Support

Automatic composition preserves full type safety:

```typescript
// Type inference works correctly
const nameTraversal = each().then(lens(
  person => person.name, // TypeScript knows person is Person
  (person, name) => ({ ...person, name }) // TypeScript knows name is string
));

// Return types are inferred
const names = collect(nameTraversal, people); // TypeScript knows this is string[]
const upperCaseNames = overTraversal(nameTraversal, name => name.toUpperCase(), people); // TypeScript knows this is Person[]
```

### Cross-Kind Type Safety

```typescript
// Lens → Traversal composition preserves type safety
const authorLens = lens(
  post => post.author, // TypeScript knows post is Post
  (post, author) => ({ ...post, author }) // TypeScript knows author is Author
);

const tagsLens = lens(
  author => author.tags, // TypeScript knows author is Author
  (author, tags) => ({ ...author, tags }) // TypeScript knows tags is string[]
);

const authorTagsTraversal = authorLens.then(tagsLens);
// TypeScript knows this is a Traversal<Post, Post, string[], string[]>
```

## Performance Considerations

### Efficient Composition

Automatic composition is designed for efficiency:

1. **Single Pass**: Most compositions complete in a single pass through the data
2. **Lazy Evaluation**: Operations are only performed when needed
3. **Minimal Allocation**: Reuses optic instances where possible
4. **Composition Optimization**: Composed traversals are optimized internally

### Memory Usage

- **Minimal Overhead**: Automatic composition adds minimal memory overhead
- **Garbage Collection Friendly**: Immutable operations work well with GC
- **Streaming Support**: Can work with streaming data in ObservableLite

## Integration with Existing Optics

### Seamless Integration

Automatic composition integrates seamlessly with existing optics:

- **Existing Optics**: Works with all Lens, Prism, Optional, and Traversal types
- **Type Guards**: Includes `isTraversal()` for reliable detection
- **ObservableLite**: Full reactive stream support
- **Immutable Updates**: Compatible with existing immutability helpers

### Backward Compatibility

Automatic composition is designed for backward compatibility:

- Existing manual composition code continues to work
- No breaking changes to existing APIs
- Gradual adoption possible

## Error Handling

### Graceful Failure

Automatic composition handles errors gracefully:

```typescript
// Invalid composition provides clear error messages
try {
  invalidComposition.then(invalidOptic);
} catch (error) {
  // Clear error message: "Invalid optic for traversal composition"
}

// composeTraversal provides clear error messages
try {
  composeTraversal(invalidOptic1, invalidOptic2);
} catch (error) {
  // Clear error message: "composeTraversal expects two Traversals or a Lens and a Traversal"
}
```

## Use Cases

### Common Patterns

1. **Deep Data Access**: Access deeply nested data with automatic composition
2. **Bulk Transformations**: Transform multiple values across complex data structures
3. **Conditional Access**: Access optional or conditional data with automatic handling
4. **Reactive Streams**: Process streaming data with automatic composition
5. **Immutable Updates**: Create new data structures with automatic composition

### Real-World Examples

```typescript
// Form validation - check all nested field errors
const formErrors = formLens.then(each()).then(fieldLens).then(errorLens);
const allErrors = collect(formErrors, form);

// User permissions - check all roles across all users
const userRoles = usersLens.then(each()).then(roleLens).then(each());
const allRoles = collect(userRoles, data);

// Data normalization - transform all nested values
const normalizedData = overTraversal(
  usersLens.then(each()).then(profileLens),
  profile => ({ ...profile, name: profile.name.toLowerCase() }),
  data
);
```

## Advanced Features

### Custom Composition Rules

The system supports custom composition rules:

```typescript
// Custom composition for specific use cases
function customComposeTraversal(t1, t2, customRule) {
  if (customRule(t1, t2)) {
    return customComposition(t1, t2);
  }
  return composeTraversal(t1, t2);
}
```

### Performance Optimization

```typescript
// Optimized composition for performance-critical code
const optimizedTraversal = composeTraversal(
  optimizedTraversal1,
  optimizedTraversal2
);
// Uses internal optimizations for better performance
```

This comprehensive automatic composition system provides powerful, type-safe, and efficient optic composition that integrates seamlessly with the existing optics ecosystem, enabling complex data transformations with mathematical rigor and clean syntax. 