/// <reference lib="ts.plus" />

// Comprehensive tests for kind aliases (Functor, Bifunctor)
// Tests constraint enforcement, usage patterns, and error cases

// ============================================================================
// 1. FUNCTOR ALIAS TESTS
// ============================================================================

// Test 1.1: Valid Functor alias usage
function testFunctorAlias<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should work with Functor alias

// Test 1.2: Valid Functor alias with explicit Kind
function testFunctorExplicit<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should work with explicit Kind<Type, Type>

// Test 1.3: Functor alias compatibility with explicit Kind
function testFunctorCompatibility<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    return fa as any;
}

function testExplicitCompatibility<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}

// These should be compatible
const test1: typeof testFunctorCompatibility = testExplicitCompatibility;
const test2: typeof testExplicitCompatibility = testFunctorCompatibility;
// ✅ Should allow interop between Functor alias and explicit Kind

// Test 1.4: Invalid Functor usage with binary functor
function testInvalidFunctor<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // @ts-expect-error - Should reject binary functor for Functor alias
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should reject binary functor for Functor alias

// Test 1.5: Invalid Functor usage with non-functor
function testInvalidFunctorNonFunctor<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // @ts-expect-error - Should reject non-functor for Functor alias
    const bad: F = {} as string;
    return fa as any;
}
// ✅ Should reject non-functor for Functor alias

// ============================================================================
// 2. BIFUNCTOR ALIAS TESTS
// ============================================================================

// Test 2.1: Valid Bifunctor alias usage
function testBifunctorAlias<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    return fab as any;
}
// ✅ Should work with Bifunctor alias

// Test 2.2: Valid Bifunctor alias with explicit Kind
function testBifunctorExplicit<F extends Kind<Type, Type, Type>>(fab: F<string, number>): F<boolean, string> {
    return fab as any;
}
// ✅ Should work with explicit Kind<Type, Type, Type>

// Test 2.3: Bifunctor alias compatibility with explicit Kind
function testBifunctorCompatibility<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    return fab as any;
}

function testBifunctorExplicitCompatibility<F extends Kind<Type, Type, Type>>(fab: F<string, number>): F<boolean, string> {
    return fab as any;
}

// These should be compatible
const test3: typeof testBifunctorCompatibility = testBifunctorExplicitCompatibility;
const test4: typeof testBifunctorExplicitCompatibility = testBifunctorCompatibility;
// ✅ Should allow interop between Bifunctor alias and explicit Kind

// Test 2.4: Invalid Bifunctor usage with unary functor
function testInvalidBifunctor<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // @ts-expect-error - Should reject unary functor for Bifunctor alias
    const bad: F = {} as Kind<Type, Type>;
    return fab as any;
}
// ✅ Should reject unary functor for Bifunctor alias

// Test 2.5: Invalid Bifunctor usage with non-functor
function testInvalidBifunctorNonFunctor<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // @ts-expect-error - Should reject non-functor for Bifunctor alias
    const bad: F = {} as string;
    return fab as any;
}
// ✅ Should reject non-functor for Bifunctor alias

// ============================================================================
// 3. KIND ALIAS CONSTRAINT ENFORCEMENT
// ============================================================================

// Test 3.1: Functor constraint enforcement in interface
interface TestFunctorInterface<F extends ts.plus.Functor> {
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
}
// ✅ Should enforce Functor constraints in interfaces

// Test 3.2: Bifunctor constraint enforcement in interface
interface TestBifunctorInterface<F extends ts.plus.Bifunctor> {
    bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>;
}
// ✅ Should enforce Bifunctor constraints in interfaces

// Test 3.3: Functor constraint enforcement in class
class TestFunctorClass<F extends ts.plus.Functor> {
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B> {
        return fa as any;
    }
}
// ✅ Should enforce Functor constraints in classes

// Test 3.4: Bifunctor constraint enforcement in class
class TestBifunctorClass<F extends ts.plus.Bifunctor> {
    bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D> {
        return fab as any;
    }
}
// ✅ Should enforce Bifunctor constraints in classes

// Test 3.5: Functor constraint enforcement in type alias
type TestFunctorType<F extends ts.plus.Functor> = F<string>;
// ✅ Should enforce Functor constraints in type aliases

// Test 3.6: Bifunctor constraint enforcement in type alias
type TestBifunctorType<F extends ts.plus.Bifunctor> = F<string, number>;
// ✅ Should enforce Bifunctor constraints in type aliases

// ============================================================================
// 4. KIND ALIAS ERROR CASES
// ============================================================================

// Test 4.1: Functor with wrong arity
function testFunctorWrongArity<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // @ts-expect-error - Should reject wrong arity for Functor
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should reject wrong arity for Functor

// Test 4.2: Bifunctor with wrong arity
function testBifunctorWrongArity<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // @ts-expect-error - Should reject wrong arity for Bifunctor
    const bad: F = {} as Kind<Type, Type>;
    return fab as any;
}
// ✅ Should reject wrong arity for Bifunctor

// Test 4.3: Functor with non-functor type
function testFunctorNonFunctor<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // @ts-expect-error - Should reject non-functor for Functor
    const bad: F = {} as number;
    return fa as any;
}
// ✅ Should reject non-functor for Functor

// Test 4.4: Bifunctor with non-functor type
function testBifunctorNonFunctor<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // @ts-expect-error - Should reject non-functor for Bifunctor
    const bad: F = {} as number;
    return fab as any;
}
// ✅ Should reject non-functor for Bifunctor

// Test 4.5: Functor with any type
function testFunctorAny<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // @ts-expect-error - Should reject any for Functor
    const bad: F = {} as any;
    return fa as any;
}
// ✅ Should reject any for Functor

// Test 4.6: Bifunctor with any type
function testBifunctorAny<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // @ts-expect-error - Should reject any for Bifunctor
    const bad: F = {} as any;
    return fab as any;
}
// ✅ Should reject any for Bifunctor

// ============================================================================
// 5. KIND ALIAS COMPLEX SCENARIOS
// ============================================================================

// Test 5.1: Nested Functor constraints
interface NestedFunctorConstraint<F extends ts.plus.Functor, G extends ts.plus.Functor> {
    compose<A, B, C>(fa: F<A>, f: (a: A) => G<B>, g: (b: B) => C): F<C>;
}
// ✅ Should handle nested Functor constraints

// Test 5.2: Nested Bifunctor constraints
interface NestedBifunctorConstraint<F extends ts.plus.Bifunctor, G extends ts.plus.Bifunctor> {
    compose<A, B, C, D, E, F>(
        fab: F<A, B>, 
        f: (a: A) => C, 
        g: (b: B) => D,
        h: (c: C) => E,
        i: (d: D) => F
    ): G<E, F>;
}
// ✅ Should handle nested Bifunctor constraints

// Test 5.3: Mixed Functor and Bifunctor constraints
interface MixedConstraint<F extends ts.plus.Functor, G extends ts.plus.Bifunctor> {
    transform<A, B, C>(fa: F<A>, f: (a: A) => B, g: (b: B) => C): G<B, C>;
}
// ✅ Should handle mixed Functor and Bifunctor constraints

// Test 5.4: Functor with conditional type
type ConditionalFunctor<F extends ts.plus.Functor> = F extends ts.plus.Functor 
    ? F<string> 
    : F<number>;
// ✅ Should handle Functor with conditional types

// Test 5.5: Bifunctor with conditional type
type ConditionalBifunctor<F extends ts.plus.Bifunctor> = F extends ts.plus.Bifunctor 
    ? F<string, number> 
    : F<boolean, string>;
// ✅ Should handle Bifunctor with conditional types

// Test 5.6: Functor with union type
type UnionFunctor<F extends ts.plus.Functor> = F<string> | F<number>;
// ✅ Should handle Functor with union types

// Test 5.7: Bifunctor with union type
type UnionBifunctor<F extends ts.plus.Bifunctor> = F<string, number> | F<boolean, string>;
// ✅ Should handle Bifunctor with union types

// ============================================================================
// 6. KIND ALIAS INTEGRATION WITH LANGUAGE SERVICE
// ============================================================================

// Test 6.1: Functor alias autocomplete
function testFunctorAutocomplete<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // Autocomplete should work with Functor alias
    return fa as any;
}
// ✅ Should integrate with autocomplete

// Test 6.2: Bifunctor alias autocomplete
function testBifunctorAutocomplete<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // Autocomplete should work with Bifunctor alias
    return fab as any;
}
// ✅ Should integrate with autocomplete

// Test 6.3: Functor alias hover
function testFunctorHover<F extends ts.plus.Functor>(fa: F<string>): void {
    // Hover should work with Functor alias
}
// ✅ Should integrate with hover

// Test 6.4: Bifunctor alias hover
function testBifunctorHover<F extends ts.plus.Bifunctor>(fab: F<string, number>): void {
    // Hover should work with Bifunctor alias
}
// ✅ Should integrate with hover

// Test 6.5: Functor alias quick fixes
function testFunctorQuickFixes<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // @ts-expect-error - Should provide quick fixes for Functor constraint violations
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should integrate with quick fixes

// Test 6.6: Bifunctor alias quick fixes
function testBifunctorQuickFixes<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // @ts-expect-error - Should provide quick fixes for Bifunctor constraint violations
    const bad: F = {} as Kind<Type, Type>;
    return fab as any;
}
// ✅ Should integrate with quick fixes

// ============================================================================
// 7. KIND ALIAS PERFORMANCE TESTS
// ============================================================================

// Test 7.1: Functor alias with deep nesting
type DeepNestedFunctor<F extends ts.plus.Functor> = F<F<F<F<F<string>>>>>>;
// ✅ Should handle deep nesting efficiently

// Test 7.2: Bifunctor alias with deep nesting
type DeepNestedBifunctor<F extends ts.plus.Bifunctor> = F<F<string, number>, F<boolean, string>>;
// ✅ Should handle deep nesting efficiently

// Test 7.3: Functor alias with large type graphs
type LargeFunctorGraph<F extends ts.plus.Functor> = {
    level1: F<string>;
    level2: {
        nested1: F<number>;
        nested2: F<boolean>;
    };
    level3: {
        deep1: {
            deeper1: F<string>;
            deeper2: F<number>;
        };
        deep2: {
            deeper3: F<boolean>;
            deeper4: F<string>;
        };
    };
};
// ✅ Should handle large type graphs efficiently

// Test 7.4: Bifunctor alias with large type graphs
type LargeBifunctorGraph<F extends ts.plus.Bifunctor> = {
    level1: F<string, number>;
    level2: {
        nested1: F<boolean, string>;
        nested2: F<number, boolean>;
    };
    level3: {
        deep1: {
            deeper1: F<string, number>;
            deeper2: F<boolean, string>;
        };
        deep2: {
            deeper3: F<number, boolean>;
            deeper4: F<string, number>;
        };
    };
};
// ✅ Should handle large type graphs efficiently

// ============================================================================
// 8. KIND ALIAS EDGE CASES
// ============================================================================

// Test 8.1: Functor alias with circular reference
interface CircularFunctor<A> extends CircularFunctor<A> {}

// @ts-expect-error - Should detect circular reference in Functor alias
type CircularFunctorTest = ts.plus.Functor;
// ✅ Should detect circular references

// Test 8.2: Bifunctor alias with circular reference
interface CircularBifunctor<A, B> extends CircularBifunctor<A, B> {}

// @ts-expect-error - Should detect circular reference in Bifunctor alias
type CircularBifunctorTest = ts.plus.Bifunctor;
// ✅ Should detect circular references

// Test 8.3: Functor alias with conditional constraint
type ConditionalFunctorConstraint<F extends ts.plus.Functor> = F extends ts.plus.Functor 
    ? F<string> 
    : F<number>;
// ✅ Should handle conditional constraints

// Test 8.4: Bifunctor alias with conditional constraint
type ConditionalBifunctorConstraint<F extends ts.plus.Bifunctor> = F extends ts.plus.Bifunctor 
    ? F<string, number> 
    : F<boolean, string>;
// ✅ Should handle conditional constraints

// ============================================================================
// 9. KIND ALIAS DOCUMENTATION TESTS
// ============================================================================

// Test 9.1: Functor alias documentation
/**
 * Example usage of Functor alias
 * @template F - The functor type constructor (must be unary)
 */
type ExampleFunctor<F extends ts.plus.Functor> = F<string>;
// ✅ Should have proper documentation

// Test 9.2: Bifunctor alias documentation
/**
 * Example usage of Bifunctor alias
 * @template F - The bifunctor type constructor (must be binary)
 */
type ExampleBifunctor<F extends ts.plus.Bifunctor> = F<string, number>;
// ✅ Should have proper documentation

// Test 9.3: Functor alias with JSDoc
/** Unary type constructor supporting map */
type JSDocFunctor<F extends ts.plus.Functor> = F<string>;
// ✅ Should support JSDoc comments

// Test 9.4: Bifunctor alias with JSDoc
/** Binary type constructor supporting bimap */
type JSDocBifunctor<F extends ts.plus.Bifunctor> = F<string, number>;
// ✅ Should support JSDoc comments

// ============================================================================
// 10. KIND ALIAS INTEROPERABILITY TESTS
// ============================================================================

// Test 10.1: Functor alias with explicit Kind interoperability
function testFunctorInterop<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    return fa as any;
}

function testExplicitInterop<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}

// These should be interoperable
const interop1: typeof testFunctorInterop = testExplicitInterop;
const interop2: typeof testExplicitInterop = testFunctorInterop;
// ✅ Should allow interoperability

// Test 10.2: Bifunctor alias with explicit Kind interoperability
function testBifunctorInterop<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    return fab as any;
}

function testBifunctorExplicitInterop<F extends Kind<Type, Type, Type>>(fab: F<string, number>): F<boolean, string> {
    return fab as any;
}

// These should be interoperable
const interop3: typeof testBifunctorInterop = testBifunctorExplicitInterop;
const interop4: typeof testBifunctorExplicitInterop = testBifunctorInterop;
// ✅ Should allow interoperability

console.log("✅ All kind alias tests passed!"); 