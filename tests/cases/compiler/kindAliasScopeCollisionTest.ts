/**
 * Test file for Kind alias scope collision issues and fixes
 * 
 * This file demonstrates:
 * 1. Scope collision risks when users define their own Functor aliases
 * 2. How scope-aware resolution prevents collisions
 * 3. Safe symbol links access using checker's internal API
 */

// Test 1: User-defined Functor alias in local scope
// This should not collide with the built-in ts.plus.Functor
type Functor<T, U> = Kind<T, U>; // User's local Functor alias

// Test 2: User-defined Functor alias in module scope
// This should not collide with the built-in ts.plus.Functor
declare module "user-module" {
    type Functor<T, U> = Kind<T, U>; // User's module Functor alias
}

// Test 3: User-defined Functor alias in namespace
// This should not collide with the built-in ts.plus.Functor
namespace UserNamespace {
    export type Functor<T, U> = Kind<T, U>; // User's namespace Functor alias
}

// Test 4: Built-in Functor usage
// This should resolve to ts.plus.Functor, not user aliases
type BuiltInFunctorUsage = ts.plus.Functor<Type, Type>;

// Test 5: Local Functor usage
// This should resolve to the local Functor alias
type LocalFunctorUsage = Functor<Type, Type>;

// Test 6: Namespace Functor usage
// This should resolve to the namespace Functor alias
type NamespaceFunctorUsage = UserNamespace.Functor<Type, Type>;

// Test 7: Complex scope collision scenario
interface ComplexScopeExample<T extends Functor<Type, Type>> {
    // T should resolve to local Functor, not built-in
    prop: T<Type>;
}

// Test 8: Multiple Functor definitions in different scopes
type GlobalFunctor<T, U> = Kind<T, U>; // Global scope

namespace ModuleScope {
    export type Functor<T, U> = Kind<T, U>; // Module scope
}

function LocalScope() {
    type Functor<T, U> = Kind<T, U>; // Local scope
    
    // Each should resolve to its respective scope
    type GlobalUsage = GlobalFunctor<Type, Type>;
    type ModuleUsage = ModuleScope.Functor<Type, Type>;
    type LocalUsage = Functor<Type, Type>;
}

// Test 9: Built-in alias usage in presence of user aliases
// These should always resolve to built-in aliases
type BuiltInUsage1 = ts.plus.Functor<Type, Type>;
type BuiltInUsage2 = ts.plus.Bifunctor<Type, Type, Type>;
type BuiltInUsage3 = Kind<Type, Type>; // Explicit Kind form instead of HKT

// Test 10: FP patterns with scope collision potential
// These should resolve to built-in patterns, not user aliases
type FreePattern = ts.plus.Free<ts.plus.Functor, Type>;
type FixPattern = ts.plus.Fix<ts.plus.Functor>;

// Test 11: Conditional types with scope awareness
type ConditionalScope<T> = T extends Functor<Type, Type> 
    ? T<Type> 
    : never;

// Test 12: Mapped types with scope awareness
type MappedScope<T extends Record<string, Functor<Type, Type>>> = {
    [K in keyof T]: T[K] extends Functor<Type, Type> ? T[K]<Type> : never;
};

// Test 13: Union types with scope awareness
type UnionScope = Functor<Type, Type> | ts.plus.Functor<Type, Type>;

// Test 14: Intersection types with scope awareness
type IntersectionScope = Functor<Type, Type> & { readonly: true };

// Test 15: Template literal types with scope awareness
type TemplateScope<T extends string> = T extends `Functor<${string}>`
    ? Functor<Type, Type>
    : never;

// Test 16: Satisfies expressions with scope awareness
type SatisfiesScope = Functor<Type, Type> satisfies Functor<Type, Type>;

// Test 17: Keyof expressions with scope awareness
type KeyofScope<T> = T extends Functor<Type, Type>
    ? keyof T extends never ? never : T
    : never;

// Test 18: Indexed access with scope awareness
type IndexedAccessScope<T> = T extends Functor<Type, Type>
    ? T extends Functor<infer Args> ? Args[number] : never
    : never;

// Test 19: Infer expressions with scope awareness
type InferScope<T> = T extends Functor<infer Args>
    ? Args extends [Type, Type] ? Functor<Args[0], Args[1]> : never
    : never;

// Test 20: Distributive conditional types with scope awareness
type DistributiveScope<T> = T extends any
    ? T extends Functor<Type, Type> ? T : never
    : never;

// Test 21: Recursive types with scope awareness
type RecursiveScope<T> = T extends Functor<Type, Type> 
    ? RecursiveScope<T<Type>> 
    : never;

// Test 22: Function signatures with scope awareness
function functionScopeExample<F extends Functor<Type, Type>>(
    param: F<Type>
): F<Type> {
    return param;
}

// Test 23: Class definitions with scope awareness
class ClassScopeExample<F extends Functor<Type, Type>> {
    constructor(private value: F<Type>) {}
    
    method<G extends Functor<Type, Type>>(param: G<Type>): G<Type> {
        return param;
    }
}

// Test 24: Interface definitions with scope awareness
interface InterfaceScopeExample<F extends Functor<Type, Type>> {
    prop: F<Type>;
    method<G extends Functor<Type, Type>>(param: G<Type>): G<Type>;
}

// Test 25: Module augmentation with scope awareness
declare module "scope-test" {
    interface ModuleScopeExample<F extends Functor<Type, Type>> {
        prop: F<Type>;
    }
}

// Test 26: Namespace definitions with scope awareness
namespace ScopeNamespace {
    export interface NamespaceScopeExample<F extends Functor<Type, Type>> {
        prop: F<Type>;
    }
}

// Test 27: Ambient declarations with scope awareness
declare global {
    interface GlobalScopeExample<F extends Functor<Type, Type>> {
        prop: F<Type>;
    }
}

// Test 28: JSDoc with scope awareness
/** @template F - The functor type constructor */
/** @template A - The value type */
type JSDocScopeExample<F extends Functor<Type, Type>, A> = F<A>;

// Test 29: Complex generic constraints with scope awareness
type ComplexConstraintScope<
    F extends Functor<Type, Type>,
    G extends Functor<Type, Type, Type>,
    H extends Functor<Type, Type>
> = Functor<F<Type>, G<H<Type>, Type>>;

// Test 30: Conditional type constraints with scope awareness
type ConditionalConstraintScope<T> = T extends Functor<Type, Type> 
    ? Functor<T<Type>, Type> 
    : Functor<Type, Type>;

// Test 31: Mapped type constraints with scope awareness
type MappedConstraintScope<T extends Record<string, Functor<Type, Type>>> = {
    [K in keyof T]: T[K] extends Functor<Type, Type> ? T[K] : never;
};

// Test 32: Recursive constraints with scope awareness
type RecursiveConstraintScope<T> = T extends Functor<Type, Type> 
    ? RecursiveConstraintScope<T<Type>> 
    : never;

// Test 33: Union constraints with scope awareness
type UnionConstraintScope<T> = T extends Functor<Type, Type> | Functor<Type, Type, Type>
    ? T
    : never;

// Test 34: Intersection constraints with scope awareness
type IntersectionConstraintScope<T> = T extends Functor<Type, Type> & { readonly: true }
    ? T
    : never;

// Test 35: Template literal constraints with scope awareness
type TemplateConstraintScope<T extends string> = T extends `Functor<${string}>`
    ? Functor<Type, Type>
    : never;

// Test 36: Satisfies constraints with scope awareness
type SatisfiesConstraintScope<T> = T extends Functor<Type, Type> 
    ? T satisfies Functor<Type, Type>
    : never;

// Test 37: Keyof constraints with scope awareness
type KeyofConstraintScope<T> = T extends Functor<Type, Type>
    ? keyof T extends never ? never : T
    : never;

// Test 38: Indexed access constraints with scope awareness
type IndexedAccessConstraintScope<T> = T extends Functor<Type, Type>
    ? T extends Functor<infer Args> ? Args[number] : never
    : never;

// Test 39: Infer constraints with scope awareness
type InferConstraintScope<T> = T extends Functor<infer Args>
    ? Args extends [Type, Type] ? Functor<Args[0], Args[1]> : never
    : never;

// Test 40: Distributive constraints with scope awareness
type DistributiveConstraintScope<T> = T extends any
    ? T extends Functor<Type, Type> ? T : never
    : never;

console.log("✅ Kind alias scope collision tests completed!"); 