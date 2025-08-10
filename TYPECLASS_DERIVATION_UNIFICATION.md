# Typeclass Derivation Unification

## Overview

This document summarizes the unification of the typeclass derivation system, consolidating two different approaches into a single, preferred methodology.

## Problem Statement

The codebase had two different approaches for deriving typeclass instances:

1. **Individual Instance Functions** (Hand-rolled approach):
   ```typescript
   export const MaybeEq = deriveEqInstance({
     customEq: <A>(a: Maybe<A>, b: Maybe<A>): boolean => { /* ... */ }
   });
   
   export const MaybeFunctor = deriveFunctorInstance({
     customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => { /* ... */ }
   });
   ```

2. **Generic Multi-Instance Function** (HKT-based approach):
   ```typescript
   export const MaybeInstances = deriveInstances<MaybeK>({
     functor: true,
     applicative: true,
     monad: true,
     customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => { /* ... */ }
   });
   ```

## Solution: Unification to Individual Instance Functions

Following user feedback, the system has been unified to prefer the **individual instance functions approach** for the following reasons:

### Advantages of Individual Instance Functions

1. **Explicit and Clear**: Each typeclass instance is explicitly defined, making the code more readable and maintainable.

2. **Granular Control**: Developers can derive only the instances they need, avoiding unnecessary complexity.

3. **Better Type Safety**: Individual functions provide better TypeScript type inference and error messages.

4. **Easier Testing**: Each instance can be tested independently.

5. **Simpler Migration**: Easier to migrate from manual instances to derived ones.

6. **Reduced Cognitive Load**: No need to understand HKT complexity for basic typeclass derivation.

## Changes Made

### 1. Deprecated Generic Function

The `deriveInstances` function has been deprecated with a warning:

```typescript
/**
 * @deprecated Use individual derivation functions (deriveEqInstance, deriveFunctorInstance, etc.) instead.
 * This function will be removed in a future version.
 */
export function deriveInstances<F extends Kind<any[]>>(
  config: DerivationConfig
): DerivedInstances {
  console.warn('⚠️ deriveInstances is deprecated. Use individual derivation functions instead.');
  // ... implementation
}
```

### 2. Updated Documentation

The `DERIVABLE_INSTANCES.md` file has been updated to:
- Clearly mark the preferred approach
- Show examples of individual instance derivation
- Mark the generic approach as deprecated
- Provide migration guidance

### 3. Created Migration Tool

A migration script (`migrate-typeclass-derivations.js`) has been created to help convert existing code:

```bash
# Run migration on all TypeScript files
node migrate-typeclass-derivations.js

# Run migration on specific files
node migrate-typeclass-derivations.js "fp-*.ts"
```

## Migration Examples

### Before (Deprecated)
```typescript
export const MaybeInstances = deriveInstances<MaybeK>({
  functor: true,
  applicative: true,
  monad: true,
  customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => Just(f(value)),
      Nothing: () => Nothing()
    })
});

export const MaybeFunctor = MaybeInstances.functor;
export const MaybeApplicative = MaybeInstances.applicative;
export const MaybeMonad = MaybeInstances.monad;
```

### After (Preferred)
```typescript
export const MaybeFunctor = deriveFunctorInstance<MaybeK>({
  customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => Just(f(value)),
      Nothing: () => Nothing()
    })
});

export const MaybeApplicative = deriveApplicativeInstance<MaybeK>({
  customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => Just(f(value)),
      Nothing: () => Nothing()
    }),
  customOf: <A>(a: A): Maybe<A> => Just(a),
  customAp: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => 
    matchMaybe(fab, {
      Just: f => matchMaybe(fa, {
        Just: a => Just(f(a)),
        Nothing: () => Nothing()
      }),
      Nothing: () => Nothing()
    })
});

export const MaybeMonad = deriveMonadInstance<MaybeK>({
  customMap: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => Just(f(value)),
      Nothing: () => Nothing()
    }),
  customChain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => 
    matchMaybe(fa, {
      Just: value => f(value),
      Nothing: () => Nothing()
    })
});
```

## Available Individual Derivation Functions

The following functions are available for individual typeclass derivation:

### Core Typeclasses
- `deriveFunctorInstance<F>(config)` - Derive Functor instance
- `deriveApplicativeInstance<F>(config)` - Derive Applicative instance  
- `deriveMonadInstance<F>(config)` - Derive Monad instance
- `deriveBifunctorInstance<F>(config)` - Derive Bifunctor instance

### Standard Typeclasses
- `deriveEqInstance<A>(config)` - Derive Eq instance
- `deriveOrdInstance<A>(config)` - Derive Ord instance
- `deriveShowInstance<A>(config)` - Derive Show instance

## Registry Integration

Individual instances are registered the same way:

```typescript
// Register individual instances
registry.registerTypeclass('Maybe', 'Functor', MaybeFunctor);
registry.registerTypeclass('Maybe', 'Applicative', MaybeApplicative);
registry.registerTypeclass('Maybe', 'Monad', MaybeMonad);
registry.registerTypeclass('Maybe', 'Eq', MaybeEq);

registry.registerDerivable('Maybe', {
  functor: MaybeFunctor,
  applicative: MaybeApplicative,
  monad: MaybeMonad,
  eq: MaybeEq,
  purity: { effect: 'Pure' as const }
});
```

## Benefits of This Unification

1. **Consistency**: All typeclass derivation now follows the same pattern
2. **Maintainability**: Easier to understand and modify individual instances
3. **Performance**: No unnecessary HKT overhead for simple derivations
4. **Developer Experience**: Clearer error messages and better IDE support
5. **Future-Proof**: Easier to extend with new typeclasses

## Migration Timeline

- **Phase 1** (Complete): Deprecate `deriveInstances` with warnings
- **Phase 2** (Current): Provide migration tools and documentation
- **Phase 3** (Future): Remove `deriveInstances` function entirely
- **Phase 4** (Future): Clean up any remaining references

## Files Modified

1. `fp-derivation-helpers.ts` - Added deprecation warning to `deriveInstances`
2. `DERIVABLE_INSTANCES.md` - Updated documentation with preferred approach
3. `migrate-typeclass-derivations.js` - Created migration tool
4. `TYPECLASS_DERIVATION_UNIFICATION.md` - This summary document

## Next Steps

1. **Run Migration**: Use the migration script to convert existing code
2. **Review Changes**: Check that all instances work correctly
3. **Update Tests**: Ensure tests pass with the new approach
4. **Remove Deprecated Code**: Once confident, remove the `deriveInstances` function

## Conclusion

This unification simplifies the typeclass derivation system while maintaining all functionality. The individual instance functions approach provides better clarity, maintainability, and developer experience while reducing complexity for common use cases.
