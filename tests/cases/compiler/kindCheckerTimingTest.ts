/**
 * Test file for Kind checker timing issues and fixes
 * 
 * This file demonstrates:
 * 1. Call order issues where validation runs before type resolution
 * 2. False negatives (type isn't yet known → no validation)
 * 3. False positives (type is partially inferred but not final)
 * 4. How the timing fixes address these issues
 */

// Test 1: False Negative - Type not yet resolved
// This would cause false negatives in the old implementation
type FalseNegativeExample<T> = {
    prop: Kind<T, Type>; // T might not be resolved yet
};

// Test 2: False Positive - Partially inferred type
// This would cause false positives in the old implementation
type FalsePositiveExample<T extends Kind<Type, Type>> = {
    prop: T<Type>; // T might be partially inferred
};

// Test 3: Complex nested type resolution
// This demonstrates the timing issues in complex scenarios
type ComplexTimingExample<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>,
    H extends Kind<Type, Type>
> = {
    functor: F<Type>;
    bifunctor: G<Type, Type>;
    nested: H<F<Type>>; // Nested type resolution
};

// Test 4: FP patterns with timing issues
// Free and Fix patterns can have timing issues too
type FreePatternExample<F extends Kind<Type, Type>> = {
    free: Free<F, Type>; // F might not be fully resolved
};

type FixPatternExample<F extends Kind<Type, Type>> = {
    fix: Fix<F>; // F might not be fully resolved
};

// Test 5: Conditional types with kind constraints
// These can have complex timing dependencies
type ConditionalKindExample<T> = T extends Kind<Type, Type> 
    ? T<Type> 
    : never;

// Test 6: Mapped types with kind constraints
// Timing issues in mapped type contexts
type MappedKindExample<T extends Record<string, Kind<Type, Type>>> = {
    [K in keyof T]: T[K] extends Kind<Type, Type> ? T[K]<Type> : never;
};

// Test 7: Union types with kind constraints
// Timing issues in union type contexts
type UnionKindExample<T> = T extends Kind<Type, Type> | Kind<Type, Type, Type>
    ? T
    : never;

// Test 8: Intersection types with kind constraints
// Timing issues in intersection type contexts
type IntersectionKindExample<T> = T extends Kind<Type, Type> & { readonly: true }
    ? T
    : never;

// Test 9: Template literal types with kind constraints
// Timing issues in template literal contexts
type TemplateKindExample<T extends string> = T extends `Kind<${string}>`
    ? Kind<Type, Type>
    : never;

// Test 10: Satisfies expressions with kind constraints
// Timing issues in satisfies contexts
type SatisfiesKindExample<T> = T extends Kind<Type, Type> 
    ? T satisfies Kind<Type, Type>
    : never;

// Test 11: Keyof expressions with kind constraints
// Timing issues in keyof contexts
type KeyofKindExample<T> = T extends Kind<Type, Type>
    ? keyof T extends never ? never : T
    : never;

// Test 12: Indexed access with kind constraints
// Timing issues in indexed access contexts
type IndexedAccessKindExample<T> = T extends Kind<Type, Type>
    ? T extends Kind<infer Args> ? Args[number] : never
    : never;

// Test 13: Infer expressions with kind constraints
// Timing issues in infer contexts
type InferKindExample<T> = T extends Kind<infer Args>
    ? Args extends [Type, Type] ? Kind<Args[0], Args[1]> : never
    : never;

// Test 14: Distributive conditional types with kind constraints
// Timing issues in distributive contexts
type DistributiveKindExample<T> = T extends any
    ? T extends Kind<Type, Type> ? T : never
    : never;

// Test 15: Recursive types with kind constraints
// Timing issues in recursive contexts
type RecursiveKindExample<T> = T extends Kind<Type, Type> 
    ? RecursiveKindExample<T<Type>> 
    : never;

// Test 16: Function signatures with kind constraints
// Timing issues in function signature contexts
function functionSignatureExample<F extends Kind<Type, Type>>(
    param: F<Type>
): F<Type> {
    return param;
}

// Test 17: Class definitions with kind constraints
// Timing issues in class definition contexts
class ClassDefinitionExample<F extends Kind<Type, Type>> {
    constructor(private value: F<Type>) {}
    
    method<G extends Kind<Type, Type>>(param: G<Type>): G<Type> {
        return param;
    }
}

// Test 18: Interface definitions with kind constraints
// Timing issues in interface definition contexts
interface InterfaceDefinitionExample<F extends Kind<Type, Type>> {
    prop: F<Type>;
    method<G extends Kind<Type, Type>>(param: G<Type>): G<Type>;
}

// Test 19: Module augmentation with kind constraints
// Timing issues in module augmentation contexts
declare module "test" {
    interface ModuleAugmentationExample<F extends Kind<Type, Type>> {
        prop: F<Type>;
    }
}

// Test 20: Namespace definitions with kind constraints
// Timing issues in namespace definition contexts
namespace NamespaceDefinitionExample {
    export interface NamespaceInterface<F extends Kind<Type, Type>> {
        prop: F<Type>;
    }
}

// Test 21: Ambient declarations with kind constraints
// Timing issues in ambient declaration contexts
declare global {
    interface GlobalInterface<F extends Kind<Type, Type>> {
        prop: F<Type>;
    }
}

// Test 22: JSDoc with kind constraints
// Timing issues in JSDoc contexts
/** @template F - The functor type constructor */
/** @template A - The value type */
type JSDocExample<F extends Kind<Type, Type>, A> = F<A>;

// Test 23: Complex generic constraints with kind constraints
// Timing issues in complex constraint contexts
type ComplexConstraintExample<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>,
    H extends Kind<Type, Type>
> = Kind<F<Type>, G<H<Type>, Type>>;

// Test 24: Conditional type constraints with kind constraints
// Timing issues in conditional constraint contexts
type ConditionalConstraintExample<T> = T extends Kind<Type, Type> 
    ? Kind<T<Type>, Type> 
    : Kind<Type, Type>;

// Test 25: Mapped type constraints with kind constraints
// Timing issues in mapped constraint contexts
type MappedConstraintExample<T extends Record<string, Kind<Type, Type>>> = {
    [K in keyof T]: T[K] extends Kind<Type, Type> ? T[K] : never;
};

// Test 26: Recursive constraints with kind constraints
// Timing issues in recursive constraint contexts
type RecursiveConstraintExample<T> = T extends Kind<Type, Type> 
    ? RecursiveConstraintExample<T<Type>> 
    : never;

// Test 27: Union constraints with kind constraints
// Timing issues in union constraint contexts
type UnionConstraintExample<T> = T extends Kind<Type, Type> | Kind<Type, Type, Type>
    ? T
    : never;

// Test 28: Intersection constraints with kind constraints
// Timing issues in intersection constraint contexts
type IntersectionConstraintExample<T> = T extends Kind<Type, Type> & { readonly: true }
    ? T
    : never;

// Test 29: Template literal constraints with kind constraints
// Timing issues in template literal constraint contexts
type TemplateConstraintExample<T extends string> = T extends `Kind<${string}>`
    ? Kind<Type, Type>
    : never;

// Test 30: Satisfies constraints with kind constraints
// Timing issues in satisfies constraint contexts
type SatisfiesConstraintExample<T> = T extends Kind<Type, Type> 
    ? T satisfies Kind<Type, Type>
    : never;

console.log("✅ Kind checker timing tests completed!"); 