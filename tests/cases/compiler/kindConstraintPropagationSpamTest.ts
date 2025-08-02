/**
 * Test file for Kind constraint propagation spam issues and fixes
 * 
 * This file demonstrates:
 * 1. Constraint propagation spam where the same error appears multiple times
 * 2. How deduplication prevents spammy duplicate diagnostics
 * 3. Propagation path redundancy detection
 * 4. Comprehensive diagnostic tracking
 */

// Test 1: Simple constraint violation that would cause spam
// This would generate multiple diagnostics without deduplication
type SimpleConstraintViolation<T extends Kind<Type, Type>> = {
    prop: T<Type>; // Violation here
};

// Test 2: Nested constraint violations
// This would cause propagation spam up the AST
type NestedConstraintViolation<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>
> = {
    functor: F<Type>; // Violation here
    bifunctor: G<Type, Type>; // Violation here
    nested: F<G<Type, Type>>; // Nested violation
};

// Test 3: Complex propagation chain
// This demonstrates how violations propagate through multiple levels
type ComplexPropagationChain<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>,
    H extends Kind<Type, Type>
> = {
    level1: F<Type>; // Violation propagates to parent
    level2: G<F<Type>, Type>; // Violation propagates to parent
    level3: H<G<F<Type>, Type>>; // Violation propagates to parent
};

// Test 4: Multiple violations in same context
// This would cause multiple diagnostics for the same violation
type MultipleViolationsInContext<T extends Kind<Type, Type>> = {
    prop1: T<Type>; // Same violation
    prop2: T<Type>; // Same violation
    prop3: T<Type>; // Same violation
};

// Test 5: Violations in function signatures
// This demonstrates propagation in function contexts
function functionWithConstraintViolations<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>
>(
    param1: F<Type>, // Violation here
    param2: G<Type, Type> // Violation here
): F<G<Type, Type>> { // Violation here
    return param1 as any;
}

// Test 6: Violations in class definitions
// This demonstrates propagation in class contexts
class ClassWithConstraintViolations<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>
> {
    constructor(
        private prop1: F<Type>, // Violation here
        private prop2: G<Type, Type> // Violation here
    ) {}
    
    method<H extends Kind<Type, Type>>(
        param: H<Type> // Violation here
    ): H<F<Type>> { // Violation here
        return param as any;
    }
}

// Test 7: Violations in interface definitions
// This demonstrates propagation in interface contexts
interface InterfaceWithConstraintViolations<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>
> {
    prop1: F<Type>; // Violation here
    prop2: G<Type, Type>; // Violation here
    method<H extends Kind<Type, Type>>(param: H<Type>): H<F<Type>>; // Violation here
}

// Test 8: Violations in conditional types
// This demonstrates propagation in conditional type contexts
type ConditionalTypeViolations<T> = T extends Kind<Type, Type>
    ? T<Type> // Violation here
    : never;

// Test 9: Violations in mapped types
// This demonstrates propagation in mapped type contexts
type MappedTypeViolations<T extends Record<string, Kind<Type, Type>>> = {
    [K in keyof T]: T[K] extends Kind<Type, Type> ? T[K]<Type> : never; // Violation here
};

// Test 10: Violations in union types
// This demonstrates propagation in union type contexts
type UnionTypeViolations<T> = T extends Kind<Type, Type> | Kind<Type, Type, Type>
    ? T<Type> // Violation here
    : never;

// Test 11: Violations in intersection types
// This demonstrates propagation in intersection type contexts
type IntersectionTypeViolations<T> = T extends Kind<Type, Type> & { readonly: true }
    ? T<Type> // Violation here
    : never;

// Test 12: Violations in template literal types
// This demonstrates propagation in template literal contexts
type TemplateLiteralViolations<T extends string> = T extends `Kind<${string}>`
    ? Kind<Type, Type> // Violation here
    : never;

// Test 13: Violations in satisfies expressions
// This demonstrates propagation in satisfies contexts
type SatisfiesViolations<T> = T extends Kind<Type, Type>
    ? T satisfies Kind<Type, Type> // Violation here
    : never;

// Test 14: Violations in keyof expressions
// This demonstrates propagation in keyof contexts
type KeyofViolations<T> = T extends Kind<Type, Type>
    ? keyof T extends never ? never : T<Type> // Violation here
    : never;

// Test 15: Violations in indexed access
// This demonstrates propagation in indexed access contexts
type IndexedAccessViolations<T> = T extends Kind<Type, Type>
    ? T extends Kind<infer Args> ? Args[number] : never // Violation here
    : never;

// Test 16: Violations in infer expressions
// This demonstrates propagation in infer contexts
type InferViolations<T> = T extends Kind<infer Args>
    ? Args extends [Type, Type] ? Kind<Args[0], Args[1]> : never // Violation here
    : never;

// Test 17: Violations in distributive conditional types
// This demonstrates propagation in distributive contexts
type DistributiveViolations<T> = T extends any
    ? T extends Kind<Type, Type> ? T<Type> : never // Violation here
    : never;

// Test 18: Violations in recursive types
// This demonstrates propagation in recursive contexts
type RecursiveViolations<T> = T extends Kind<Type, Type>
    ? RecursiveViolations<T<Type>> // Violation here
    : never;

// Test 19: Violations in module augmentation
// This demonstrates propagation in module contexts
declare module "constraint-test" {
    interface ModuleViolations<F extends Kind<Type, Type>> {
        prop: F<Type>; // Violation here
    }
}

// Test 20: Violations in namespace definitions
// This demonstrates propagation in namespace contexts
namespace ConstraintViolationsNamespace {
    export interface NamespaceViolations<F extends Kind<Type, Type>> {
        prop: F<Type>; // Violation here
    }
}

// Test 21: Violations in ambient declarations
// This demonstrates propagation in ambient contexts
declare global {
    interface GlobalViolations<F extends Kind<Type, Type>> {
        prop: F<Type>; // Violation here
    }
}

// Test 22: Violations in JSDoc
// This demonstrates propagation in JSDoc contexts
/** @template F - The functor type constructor */
/** @template A - The value type */
type JSDocViolations<F extends Kind<Type, Type>, A> = F<A>; // Violation here

// Test 23: Violations in complex generic constraints
// This demonstrates propagation in complex constraint contexts
type ComplexConstraintViolations<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>,
    H extends Kind<Type, Type>
> = Kind<F<Type>, G<H<Type>, Type>>; // Violation here

// Test 24: Violations in conditional type constraints
// This demonstrates propagation in conditional constraint contexts
type ConditionalConstraintViolations<T> = T extends Kind<Type, Type>
    ? Kind<T<Type>, Type> // Violation here
    : Kind<Type, Type>;

// Test 25: Violations in mapped type constraints
// This demonstrates propagation in mapped constraint contexts
type MappedConstraintViolations<T extends Record<string, Kind<Type, Type>>> = {
    [K in keyof T]: T[K] extends Kind<Type, Type> ? T[K]<Type> : never; // Violation here
};

// Test 26: Violations in recursive constraints
// This demonstrates propagation in recursive constraint contexts
type RecursiveConstraintViolations<T> = T extends Kind<Type, Type>
    ? RecursiveConstraintViolations<T<Type>> // Violation here
    : never;

// Test 27: Violations in union constraints
// This demonstrates propagation in union constraint contexts
type UnionConstraintViolations<T> = T extends Kind<Type, Type> | Kind<Type, Type, Type>
    ? T<Type> // Violation here
    : never;

// Test 28: Violations in intersection constraints
// This demonstrates propagation in intersection constraint contexts
type IntersectionConstraintViolations<T> = T extends Kind<Type, Type> & { readonly: true }
    ? T<Type> // Violation here
    : never;

// Test 29: Violations in template literal constraints
// This demonstrates propagation in template literal constraint contexts
type TemplateConstraintViolations<T extends string> = T extends `Kind<${string}>`
    ? Kind<Type, Type> // Violation here
    : never;

// Test 30: Violations in satisfies constraints
// This demonstrates propagation in satisfies constraint contexts
type SatisfiesConstraintViolations<T> = T extends Kind<Type, Type>
    ? T satisfies Kind<Type, Type> // Violation here
    : never;

// Test 31: Violations in keyof constraints
// This demonstrates propagation in keyof constraint contexts
type KeyofConstraintViolations<T> = T extends Kind<Type, Type>
    ? keyof T extends never ? never : T<Type> // Violation here
    : never;

// Test 32: Violations in indexed access constraints
// This demonstrates propagation in indexed access constraint contexts
type IndexedAccessConstraintViolations<T> = T extends Kind<Type, Type>
    ? T extends Kind<infer Args> ? Args[number] : never // Violation here
    : never;

// Test 33: Violations in infer constraints
// This demonstrates propagation in infer constraint contexts
type InferConstraintViolations<T> = T extends Kind<infer Args>
    ? Args extends [Type, Type] ? Kind<Args[0], Args[1]> : never // Violation here
    : never;

// Test 34: Violations in distributive constraints
// This demonstrates propagation in distributive constraint contexts
type DistributiveConstraintViolations<T> = T extends any
    ? T extends Kind<Type, Type> ? T<Type> : never // Violation here
    : never;

// Test 35: Violations in function signature constraints
// This demonstrates propagation in function signature contexts
function functionSignatureConstraintViolations<F extends Kind<Type, Type>>(
    param: F<Type> // Violation here
): F<Type> { // Violation here
    return param;
}

// Test 36: Violations in class definition constraints
// This demonstrates propagation in class definition contexts
class ClassDefinitionConstraintViolations<F extends Kind<Type, Type>> {
    constructor(private value: F<Type>) {} // Violation here
    
    method<G extends Kind<Type, Type>>(param: G<Type>): G<Type> { // Violation here
        return param;
    }
}

// Test 37: Violations in interface definition constraints
// This demonstrates propagation in interface definition contexts
interface InterfaceDefinitionConstraintViolations<F extends Kind<Type, Type>> {
    prop: F<Type>; // Violation here
    method<G extends Kind<Type, Type>>(param: G<Type>): G<Type>; // Violation here
}

// Test 38: Violations in module augmentation constraints
// This demonstrates propagation in module augmentation contexts
declare module "constraint-test" {
    interface ModuleAugmentationConstraintViolations<F extends Kind<Type, Type>> {
        prop: F<Type>; // Violation here
    }
}

// Test 39: Violations in namespace definition constraints
// This demonstrates propagation in namespace definition contexts
namespace ConstraintViolationsNamespace {
    export interface NamespaceDefinitionConstraintViolations<F extends Kind<Type, Type>> {
        prop: F<Type>; // Violation here
    }
}

// Test 40: Violations in ambient declaration constraints
// This demonstrates propagation in ambient declaration contexts
declare global {
    interface GlobalDefinitionConstraintViolations<F extends Kind<Type, Type>> {
        prop: F<Type>; // Violation here
    }
}

console.log("✅ Kind constraint propagation spam tests completed!"); 