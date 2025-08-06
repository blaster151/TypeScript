# Typeclass Registry Audit Report

## Overview

This report presents the results of a comprehensive audit of the typeclass registry to ensure:
1. **Purity tagging** is correct and complete for all registered types
2. **Eq/Ord/Show derivations** are implemented where applicable
3. All instances are properly registered in the typeclass registry

## Executive Summary

- **Total types audited:** 17
- **Purity tags:** 1/17 correct (5.9%)
- **Eq/Ord/Show derivations:** 3/17 complete (17.6%)
- **Types that cannot derive Eq/Ord/Show:** 3/17 (17.6%)

## Detailed Audit Results

### 🎯 Purity Tags Audit

#### ✅ All good (1 type)

**ObservableLite** (`fp-observable-lite.ts`)
- **Purity:** `Async` ✅
- **Reason:** Effect type with subscriptions and side effects

#### ❌ Missing purity tag (16 types)

1. **Expr** (`fp-gadt-enhanced.ts`) - Expected: `Pure`
2. **MaybeGADT** (`fp-gadt-enhanced.ts`) - Expected: `Pure`
3. **EitherGADT** (`fp-gadt-enhanced.ts`) - Expected: `Pure`
4. **Result** (`fp-result.ts`) - Expected: `Pure`
5. **PersistentListHKT** (`fp-persistent-hkt-gadt.ts`) - Expected: `Pure`
6. **PersistentMapHKT** (`fp-persistent-hkt-gadt.ts`) - Expected: `Pure`
7. **PersistentSetHKT** (`fp-persistent-hkt-gadt.ts`) - Expected: `Pure`
8. **Maybe** (`fp-maybe-unified-enhanced.ts`) - Expected: `Pure`
9. **Function** (`fp-profunctor-optics.ts`) - Expected: `Impure`
10. **StatefulStream** (`fp-stream-state.ts`) - Expected: `State`
11. **ListGADT** (`fp-gadt.ts`) - Expected: `Pure`
12. **PersistentList** (`fp-persistent.ts`) - Expected: `Pure`
13. **PersistentMap** (`fp-persistent.ts`) - Expected: `Pure`
14. **PersistentSet** (`fp-persistent.ts`) - Expected: `Pure`
15. **Either** (`fp-either.ts`) - Expected: `Pure`
16. **Array** (`fp-typeclasses-hkt.ts`) - Expected: `Pure`

### 🎯 Eq/Ord/Show Derivations Audit

#### ✅ All good (3 types)

**PersistentList** (`fp-persistent.ts`)
- **Eq:** ✅ Has derivation and registration
- **Ord:** ✅ Has derivation and registration
- **Show:** ✅ Has derivation and registration

**PersistentMap** (`fp-persistent.ts`)
- **Eq:** ✅ Has derivation and registration
- **Ord:** ✅ Has derivation and registration
- **Show:** ✅ Has derivation and registration

**PersistentSet** (`fp-persistent.ts`)
- **Eq:** ✅ Has derivation and registration
- **Ord:** ✅ Has derivation and registration
- **Show:** ✅ Has derivation and registration

#### 🔄 Missing Eq/Ord/Show derivation (11 types)

1. **Expr** (`fp-gadt-enhanced.ts`) - Missing: Eq, Ord, Show
2. **MaybeGADT** (`fp-gadt-enhanced.ts`) - Missing: Eq, Ord, Show
3. **EitherGADT** (`fp-gadt-enhanced.ts`) - Missing: Eq, Ord, Show
4. **Result** (`fp-result.ts`) - Missing: Eq, Ord, Show
5. **PersistentListHKT** (`fp-persistent-hkt-gadt.ts`) - Missing: Eq, Ord, Show
6. **PersistentMapHKT** (`fp-persistent-hkt-gadt.ts`) - Missing: Eq, Ord, Show
7. **PersistentSetHKT** (`fp-persistent-hkt-gadt.ts`) - Missing: Eq, Ord, Show
8. **Maybe** (`fp-maybe-unified-enhanced.ts`) - Missing: Eq, Ord, Show
9. **ListGADT** (`fp-gadt.ts`) - Missing: Eq, Ord, Show
10. **Either** (`fp-either.ts`) - Missing: Eq, Ord, Show
11. **Array** (`fp-typeclasses-hkt.ts`) - Missing: Eq, Ord, Show

#### N/A - Cannot derive (3 types)

**ObservableLite** (`fp-observable-lite.ts`)
- **Reason:** Effect type with subscriptions and side effects
- **Explanation:** ObservableLite manages subscriptions and has side effects, making structural equality and ordering impossible

**Function** (`fp-profunctor-optics.ts`)
- **Reason:** Function type with arbitrary behavior
- **Explanation:** Functions cannot be compared for equality or ordered without executing them

**StatefulStream** (`fp-stream-state.ts`)
- **Reason:** Stateful stream with mutable state
- **Explanation:** StatefulStream contains mutable state that changes over time, making structural equality impossible

## Detailed Breakdown by Type

### Pure Algebraic Data Types (Can derive Eq/Ord/Show)

| Type | File | Purity | Eq/Ord/Show | Status |
|------|------|--------|-------------|--------|
| Expr | fp-gadt-enhanced.ts | ❌ Pure | 🔄 Missing | Needs work |
| MaybeGADT | fp-gadt-enhanced.ts | ❌ Pure | 🔄 Missing | Needs work |
| EitherGADT | fp-gadt-enhanced.ts | ❌ Pure | 🔄 Missing | Needs work |
| Result | fp-result.ts | ❌ Pure | 🔄 Missing | Needs work |
| PersistentListHKT | fp-persistent-hkt-gadt.ts | ❌ Pure | 🔄 Missing | Needs work |
| PersistentMapHKT | fp-persistent-hkt-gadt.ts | ❌ Pure | 🔄 Missing | Needs work |
| PersistentSetHKT | fp-persistent-hkt-gadt.ts | ❌ Pure | 🔄 Missing | Needs work |
| Maybe | fp-maybe-unified-enhanced.ts | ❌ Pure | 🔄 Missing | Needs work |
| ListGADT | fp-gadt.ts | ❌ Pure | 🔄 Missing | Needs work |
| PersistentList | fp-persistent.ts | ❌ Pure | ✅ Complete | Needs purity |
| PersistentMap | fp-persistent.ts | ❌ Pure | ✅ Complete | Needs purity |
| PersistentSet | fp-persistent.ts | ❌ Pure | ✅ Complete | Needs purity |
| Either | fp-either.ts | ❌ Pure | 🔄 Missing | Needs work |
| Array | fp-typeclasses-hkt.ts | ❌ Pure | 🔄 Missing | Needs work |

### Effect Types (Cannot derive Eq/Ord/Show)

| Type | File | Purity | Eq/Ord/Show | Status |
|------|------|--------|-------------|--------|
| ObservableLite | fp-observable-lite.ts | ✅ Async | N/A | Good |
| Function | fp-profunctor-optics.ts | ❌ Impure | N/A | Needs purity |
| StatefulStream | fp-stream-state.ts | ❌ State | N/A | Needs purity |

## Action Items

### High Priority

1. **Add purity tags to 16 types**
   - Most types are missing purity tags entirely
   - This is critical for the purity system to work correctly

2. **Add Eq/Ord/Show derivations to 11 types**
   - All pure ADTs should have these derivations
   - Use `deriveEqInstance`, `deriveOrdInstance`, `deriveShowInstance`

### Medium Priority

3. **Add registration functions for derivations**
   - Some types have derivations but no registration
   - Ensure all derivations are registered in the typeclass registry

4. **Consolidate duplicate types**
   - Some types appear in multiple files (e.g., PersistentList vs PersistentListHKT)
   - Consider consolidating to avoid confusion

### Low Priority

5. **Add comprehensive tests for purity system**
6. **Document purity guidelines for new types**

## Implementation Guidelines

### Adding Purity Tags

For each type, add the appropriate purity tag:

```typescript
// For pure ADTs
export const MyTypeInstances = deriveInstances<MyTypeK>({
  // ... instance definitions
});
attachPurityMarker(MyTypeInstances, 'Pure');

// For effect types
export const MyEffectInstances = deriveInstances<MyEffectK>({
  // ... instance definitions
});
attachPurityMarker(MyEffectInstances, 'Async'); // or 'Impure', 'State'
```

### Adding Eq/Ord/Show Derivations

For pure ADTs, add derivations:

```typescript
export const MyTypeEq = deriveEqInstance({ kind: MyTypeK });
export const MyTypeOrd = deriveOrdInstance({ kind: MyTypeK });
export const MyTypeShow = deriveShowInstance({ kind: MyTypeK });

// Register them
export function registerMyTypeInstances(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__FP_REGISTRY) {
    const registry = (globalThis as any).__FP_REGISTRY;
    registry.register('MyTypeEq', MyTypeEq);
    registry.register('MyTypeOrd', MyTypeOrd);
    registry.register('MyTypeShow', MyTypeShow);
  }
}
registerMyTypeInstances();
```

## Success Metrics

- **Current purity coverage:** 5.9% (1/17 types)
- **Target purity coverage:** 100% (17/17 types)
- **Current Eq/Ord/Show coverage:** 17.6% (3/17 types)
- **Target Eq/Ord/Show coverage:** 82.4% (14/17 types, excluding effect types)

## Next Steps

1. **Phase 1:** Add purity tags to all types (16 types)
2. **Phase 2:** Add Eq/Ord/Show derivations to pure ADTs (11 types)
3. **Phase 3:** Add registration functions for all derivations
4. **Phase 4:** Add comprehensive testing
5. **Phase 5:** Document the complete system

---

*Audit generated on: $(date)*
*Total types analyzed: 17*
*Purity coverage: 5.9%*
*Eq/Ord/Show coverage: 17.6%* 