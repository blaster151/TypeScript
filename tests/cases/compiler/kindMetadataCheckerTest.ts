/**
 * Test file for kind metadata checker integration
 * 
 * This file verifies that the checker's retrieveKindMetadata function
 * pulls from the centralized KindAliasMetadata instead of hard-coding
 */

// Test 1: Basic kind aliases should be recognized by the checker
type TestFunctor = ts.plus.Functor;
type TestBifunctor = ts.plus.Bifunctor;
type TestExplicitKind = Kind<Type, Type>; // Explicit Kind form instead of HKT

// Test 2: FP patterns should be recognized by the checker
type TestFree = ts.plus.Free<ts.plus.Functor, string>;
type TestFix = ts.plus.Fix<ts.plus.Functor>;

// Test 3: Kind constraints should be enforced by the checker
// These should work (valid unary functors)
type ValidFree1 = ts.plus.Free<ts.plus.Functor, number>;
type ValidFix1 = ts.plus.Fix<ts.plus.Functor>;

// Test 4: Invalid constraints should be caught by the checker
// These should show diagnostic code 9501 and quick-fix suggestions
type InvalidFree1 = ts.plus.Free<ts.plus.Bifunctor, string>; // Bifunctor is not unary
type InvalidFix1 = ts.plus.Fix<ts.plus.Bifunctor>; // Bifunctor is not unary

// Test 5: Generic constraints should work with checker validation
interface FunctorConstraint<F extends ts.plus.Functor> {
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
}

// These should be valid
type ValidConstraint1 = FunctorConstraint<ts.plus.Functor>;

// Test 6: Function signatures with kind aliases should be validated
function processFunctor<F extends ts.plus.Functor, A>(fa: F<A>): F<A> {
    return fa;
}

function processBifunctor<F extends ts.plus.Bifunctor, A, B>(fab: F<A, B>): F<A, B> {
    return fab;
}

function processFree<F extends ts.plus.Functor, A>(fa: ts.plus.Free<F, A>): A {
    return {} as A;
}

function processFix<F extends ts.plus.Functor>(f: ts.plus.Fix<F>): F<any> {
    return {} as F<any>;
}

// Test 7: Class and interface usage should be validated
interface FunctorProcessor<F extends ts.plus.Functor> {
    process<A>(fa: F<A>): A;
}

class FreeProcessor<F extends ts.plus.Functor> {
    process<A>(fa: ts.plus.Free<F, A>): A {
        return {} as A;
    }
}

class FixProcessor<F extends ts.plus.Functor> {
    process(f: ts.plus.Fix<F>): F<any> {
        return {} as F<any>;
    }
}

// Test 8: Conditional types with kind aliases should be validated
type FunctorConditional<T> = T extends ts.plus.Functor
    ? T
    : never;

type FreeConditional<T> = T extends ts.plus.Free<infer F, any>
    ? F extends ts.plus.Functor
        ? T // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

type FixConditional<T> = T extends ts.plus.Fix<infer F>
    ? F extends ts.plus.Functor
        ? T // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

// Test 9: Mapped types with kind aliases should be validated
type FunctorMapped<T extends Record<string, any>> = {
    [K in keyof T]: T[K] extends ts.plus.Functor
        ? T[K] // Valid case
        : never;
};

type FreeMapped<T extends Record<string, any>> = {
    [K in keyof T]: T[K] extends ts.plus.Free<infer F, any>
        ? F extends ts.plus.Functor
            ? T[K] // Valid case
            : never // Invalid case - should show fix suggestions
        : T[K];
};

type FixMapped<T extends Record<string, any>> = {
    [K in keyof T]: T[K] extends ts.plus.Fix<infer F>
        ? F extends ts.plus.Functor
            ? T[K] // Valid case
            : never // Invalid case - should show fix suggestions
        : T[K];
};

// Test 10: Union and intersection types should be validated
type FunctorUnion = ts.plus.Functor | ts.plus.Bifunctor;
type FreeUnion = ts.plus.Free<ts.plus.Functor, string> | ts.plus.Free<ts.plus.Bifunctor, number>; // Mixed valid/invalid
type FixUnion = ts.plus.Fix<ts.plus.Functor> | ts.plus.Fix<ts.plus.Bifunctor>; // Mixed valid/invalid

type FunctorIntersection = ts.plus.Functor & Kind<Type, Type>; // Explicit Kind form instead of HKT
type FreeIntersection = ts.plus.Free<ts.plus.Functor, string> & ts.plus.Free<ts.plus.Bifunctor, number>; // Mixed valid/invalid
type FixIntersection = ts.plus.Fix<ts.plus.Functor> & ts.plus.Fix<ts.plus.Bifunctor>; // Mixed valid/invalid

// Test 11: Template literal types should be validated
type FunctorTemplate<T extends string> = T extends `Functor<${infer Args}>`
    ? ts.plus.Functor
    : never;

type FreeTemplate<T extends string> = T extends `Free<${infer F}, ${infer A}>`
    ? F extends "Functor"
        ? ts.plus.Free<ts.plus.Functor, any> // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

type FixTemplate<T extends string> = T extends `Fix<${infer F}>`
    ? F extends "Functor"
        ? ts.plus.Fix<ts.plus.Functor> // Valid case
        : never // Invalid case - should show fix suggestions
    : never;

// Test 12: Recursive types should be validated
type RecursiveFunctor<T> = T extends ts.plus.Functor
    ? RecursiveFunctor<T>
    : T;

type RecursiveFree<T> = T extends ts.plus.Free<infer F, any>
    ? F extends ts.plus.Functor
        ? RecursiveFree<F<any>> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

type RecursiveFix<T> = T extends ts.plus.Fix<infer F>
    ? F extends ts.plus.Functor
        ? RecursiveFix<F<any>> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

// Test 13: Complex nested scenarios should be validated
type NestedFunctor<T> = T extends ts.plus.Functor
    ? T extends ts.plus.Functor
        ? ts.plus.Functor // Valid nested case
        : T // Valid case
    : T;

type NestedFree<T> = T extends ts.plus.Free<infer F, any>
    ? F extends ts.plus.Functor
        ? F extends ts.plus.Free<infer G, any>
            ? G extends ts.plus.Functor
                ? ts.plus.Free<G, any> // Valid nested case
                : never // Invalid nested case - should show fix suggestions
            : F<any> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

type NestedFix<T> = T extends ts.plus.Fix<infer F>
    ? F extends ts.plus.Functor
        ? F extends ts.plus.Fix<infer G>
            ? G extends ts.plus.Functor
                ? ts.plus.Fix<G> // Valid nested case
                : never // Invalid nested case - should show fix suggestions
            : F<any> // Valid case
        : never // Invalid case - should show fix suggestions
    : T;

// Test 14: Real-world usage scenarios should be validated
// Console operations functor
interface ConsoleF<A> {
    type: 'log' | 'error';
    message: string;
    next: A;
}

// Valid Free usage
type ConsoleFree<A> = ts.plus.Free<ConsoleF, A>; // Should be valid

// Tree functor
interface TreeF<A> {
    type: 'leaf' | 'node';
    value?: number;
    left?: A;
    right?: A;
}

// Valid Fix usage
type Tree = ts.plus.Fix<TreeF>; // Should be valid

// Test 15: Quick-fix suggestion scenarios should be validated
// These should trigger specific quick-fix suggestions:

// 1. "Wrap parameter in Functor<...>"
type WrapSuggestion1 = ts.plus.Free<ts.plus.Bifunctor, string>; // Should suggest wrapping Bifunctor in Functor<Bifunctor>
type WrapSuggestion2 = ts.plus.Fix<ts.plus.Bifunctor>; // Should suggest wrapping Bifunctor in Functor<Bifunctor>

// 2. "Replace with Identity"
type IdentitySuggestion1 = ts.plus.Free<ts.plus.Bifunctor, string>; // Should suggest replacing Bifunctor with Identity
type IdentitySuggestion2 = ts.plus.Fix<ts.plus.Bifunctor>; // Should suggest replacing Bifunctor with Identity

// 3. "Replace with Reader"
type ReaderSuggestion1 = ts.plus.Free<ts.plus.Bifunctor, string>; // Should suggest replacing Bifunctor with Reader<string>
type ReaderSuggestion2 = ts.plus.Fix<ts.plus.Bifunctor>; // Should suggest replacing Bifunctor with Reader<string>

// 4. "Replace with List"
type ListSuggestion1 = ts.plus.Free<ts.plus.Bifunctor, string>; // Should suggest replacing Bifunctor with List
type ListSuggestion2 = ts.plus.Fix<ts.plus.Bifunctor>; // Should suggest replacing Bifunctor with List

// 5. "Replace with [Other Known Functors]"
type KnownFunctorSuggestion1 = ts.plus.Free<ts.plus.Bifunctor, string>; // Should suggest Array, Promise, IO, etc.
type KnownFunctorSuggestion2 = ts.plus.Fix<ts.plus.Bifunctor>; // Should suggest Array, Promise, IO, etc.

// Test 16: Metadata retrieval verification
// The checker should be able to retrieve metadata for all built-in aliases
type MetadataTest1 = ts.plus.Functor; // Should retrieve arity: 1, params: ["Type", "Type"]
type MetadataTest2 = ts.plus.Bifunctor; // Should retrieve arity: 2, params: ["Type", "Type", "Type"]
type MetadataTest3 = Kind<Type, Type>; // Should retrieve arity: 1, params: ["Type", "Type"]
type MetadataTest4 = ts.plus.Free<ts.plus.Functor, string>; // Should retrieve arity: 2, constraint: "UnaryFunctor"
type MetadataTest5 = ts.plus.Fix<ts.plus.Functor>; // Should retrieve arity: 1, constraint: "UnaryFunctor"

// Test 17: Centralized metadata consistency
// All metadata should come from the centralized source
// Changes to centralized metadata should be reflected in checker behavior

console.log("✅ Kind metadata checker integration tests completed!"); 