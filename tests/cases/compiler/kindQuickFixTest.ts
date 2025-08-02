/**
 * Test file for Free and Fix kind constraint violations with quick-fix support
 * 
 * This file demonstrates:
 * 1. Detection of kind constraint violations for Free and Fix patterns
 * 2. Quick-fix suggestions for constraint violations
 * 3. Various scenarios that should trigger quick-fix suggestions
 */

// Test 1: Free constraint violations - should show fix suggestions
type Bad = Kind<Type, Type, Type>; // 3-ary kind, not unary
type GenericKind = Kind<Type, Type>; // Generic kind

// These should trigger diagnostic code 9501 and show quick-fix suggestions
type T1 = Free<Bad, string>; // should show fix suggestions
type T2 = Fix<Bad>;          // should show fix suggestions

// Test 2: Various kind constraint violations
type Bifunctor = Kind<Type, Type, Type>; // 3-ary kind
type GenericKind = Kind<Type, Type>; // Generic kind

// Free violations
type FreeViolation1 = Free<Bad, string>; // should show fix suggestions
type FreeViolation2 = Free<GenericKind, boolean>; // should show fix suggestions

// Fix violations
type FixViolation1 = Fix<Bad>; // should show fix suggestions
type FixViolation2 = Fix<GenericKind>; // should show fix suggestions

// Test 3: Complex nested violations
type ComplexBad = Kind<Kind<Type, Type, Type>, Type>; // Nested 3-ary kind

type ComplexFreeViolation = Free<ComplexBad, string>; // should show fix suggestions
type ComplexFixViolation = Fix<ComplexBad>; // should show fix suggestions

// Test 4: Valid cases (should not trigger diagnostics)
type ValidFunctor = Kind<Type, Type>; // 2-ary kind (unary functor)

type ValidFree = Free<ValidFunctor, string>; // should be valid
type ValidFix = Fix<ValidFunctor>; // should be valid

// Test 5: Edge cases
type EmptyKind = Kind<>; // 0-ary kind

type EmptyFreeViolation = Free<EmptyKind, string>; // should show fix suggestions
type EmptyFixViolation = Fix<EmptyKind>; // should show fix suggestions

// Test 6: Generic constraints
interface FunctorConstraint<F extends ts.plus.Functor> {
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
}

// These should be valid
type ValidConstraint1 = FunctorConstraint<ValidFunctor>;
type ValidConstraint2 = FunctorConstraint<ts.plus.Functor>;

// Test 7: Function signatures with violations
function processFree<F, A>(fa: Free<F, A>): A {
    // F should be inferred as a functor, but if not, should show fix suggestions
    return {} as A;
}

function processFix<F>(f: Fix<F>): F<any> {
    // F should be inferred as a functor, but if not, should show fix suggestions
    return {} as F<any>;
}

// Test 8: Class and interface violations
interface FreeProcessor<F> {
    process<A>(fa: Free<F, A>): A; // should show fix suggestions if F is not unary
}

class FixProcessor<F> {
    process(f: Fix<F>): F<any> { // should show fix suggestions if F is not unary
        return {} as F<any>;
    }
}

// Test 9: Conditional types with violations
type FreeConditional<T> = T extends Free<infer F, any>
    ? F extends Kind<Type, Type>
        ? T // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

type FixConditional<T> = T extends Fix<infer F>
    ? F extends Kind<Type, Type>
        ? T // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

// Test 10: Mapped types with violations
type FreeMapped<T extends Record<string, any>> = {
    [K in keyof T]: T[K] extends Free<infer F, any>
        ? F extends Kind<Type, Type>
            ? T[K] // Valid case
            : never // Invalid case - should show fix suggestions
        : T[K];
};

type FixMapped<T extends Record<string, any>> = {
    [K in keyof T]: T[K] extends Fix<infer F>
        ? F extends Kind<Type, Type>
            ? T[K] // Valid case
            : never // Invalid case - should show fix suggestions
        : T[K];
};

// Test 11: Union types with violations
type FreeUnion = Free<ValidFunctor, string> | Free<Bad, number>; // Mixed valid/invalid
type FixUnion = Fix<ValidFunctor> | Fix<Bad>; // Mixed valid/invalid

// Test 12: Intersection types with violations
type FreeIntersection = Free<ValidFunctor, string> & Free<Bad, number>; // Mixed valid/invalid
type FixIntersection = Fix<ValidFunctor> & Fix<Bad>; // Mixed valid/invalid

// Test 13: Template literal types with violations
type FreeTemplate<T extends string> = T extends `Free<${infer F}, ${infer A}>`
    ? F extends Kind<Type, Type>
        ? Free<F, A> // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

type FixTemplate<T extends string> = T extends `Fix<${infer F}>`
    ? F extends Kind<Type, Type>
        ? Fix<F> // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

// Test 14: Recursive types with violations
type RecursiveFree<T> = T extends Free<infer F, any>
    ? F extends Kind<Type, Type>
        ? RecursiveFree<F<any>> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

type RecursiveFix<T> = T extends Fix<infer F>
    ? F extends Kind<Type, Type>
        ? RecursiveFix<F<any>> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

// Test 15: Complex nested scenarios
type NestedFree<T> = T extends Free<infer F, any>
    ? F extends Kind<Type, Type>
        ? F extends Free<infer G, any>
            ? G extends Kind<Type, Type>
                ? Free<G, any> // Valid nested case
                : never // Invalid nested case - should show fix suggestions
            : F<any> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

type NestedFix<T> = T extends Fix<infer F>
    ? F extends Kind<Type, Type>
        ? F extends Fix<infer G>
            ? G extends Kind<Type, Type>
                ? Fix<G> // Valid nested case
                : never // Invalid nested case - should show fix suggestions
            : F<any> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

// Test 16: Real-world usage scenarios
// Console operations functor
interface ConsoleF<A> {
    type: 'log' | 'error';
    message: string;
    next: A;
}

// Valid Free usage
type ConsoleFree<A> = Free<ConsoleF, A>; // Should be valid

// Invalid Free usage with wrong kind
type InvalidConsoleFree<A> = Free<Bad, A>; // Should show fix suggestions

// Tree functor
interface TreeF<A> {
    type: 'leaf' | 'node';
    value?: number;
    left?: A;
    right?: A;
}

// Valid Fix usage
type Tree = Fix<TreeF>; // Should be valid

// Invalid Fix usage with wrong kind
type InvalidTree = Fix<Bad>; // Should show fix suggestions

// Test 17: Quick-fix suggestion scenarios
// These should trigger specific quick-fix suggestions:

// 1. "Wrap first parameter in Functor<...>"
type WrapSuggestion1 = Free<Bad, string>; // Should suggest wrapping Bad in Functor<Bad>
type WrapSuggestion2 = Fix<Bad>; // Should suggest wrapping Bad in Functor<Bad>

// 2. "Replace with Identity"
type IdentitySuggestion1 = Free<Bad, string>; // Should suggest replacing Bad with Identity
type IdentitySuggestion2 = Fix<Bad>; // Should suggest replacing Bad with Identity

// 3. "Replace with Reader"
type ReaderSuggestion1 = Free<Bad, string>; // Should suggest replacing Bad with Reader<string>
type ReaderSuggestion2 = Fix<Bad>; // Should suggest replacing Bad with Reader<string>

// 4. "Replace with List"
type ListSuggestion1 = Free<Bad, string>; // Should suggest replacing Bad with List
type ListSuggestion2 = Fix<Bad>; // Should suggest replacing Bad with List

// 5. "Replace with [Other Known Functors]"
type KnownFunctorSuggestion1 = Free<Bad, string>; // Should suggest Array, Promise, IO, etc.
type KnownFunctorSuggestion2 = Fix<Bad>; // Should suggest Array, Promise, IO, etc.

console.log("✅ Kind quick-fix tests completed!"); 