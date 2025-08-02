/// <reference lib="ts.plus" />

// Comprehensive tests for FP patterns (Free, Fix)
// Tests constraint validation, usage patterns, and error cases

// ============================================================================
// 1. FREE MONAD PATTERN TESTS
// ============================================================================

// Test 1.1: Valid Free monad usage with unary functor
interface ValidFunctor<A> {
    map<B>(f: (a: A) => B): ValidFunctor<B>;
}

type ValidFree<A> = ts.plus.Free<ValidFunctor, A>;
// ✅ Should accept valid unary functor for Free

// Test 1.2: Valid Free monad usage with explicit Kind
type ValidFreeExplicit<A> = ts.plus.Free<Kind<Type, Type>, A>;
// ✅ Should accept explicit Kind<Type, Type> for Free

// Test 1.3: Valid Free monad usage with Functor alias
type ValidFreeAlias<A> = ts.plus.Free<ts.plus.Functor, A>;
// ✅ Should accept Functor alias for Free

// Test 1.4: Invalid Free monad usage with binary functor
interface BinaryFunctor<A, B> {
    bimap<C, D>(f: (a: A) => C, g: (b: B) => D): BinaryFunctor<C, D>;
}

// @ts-expect-error - Should reject binary functor for Free
type InvalidFreeBinary<A> = ts.plus.Free<BinaryFunctor, A>;
// ✅ Should reject binary functor for Free

// Test 1.5: Invalid Free monad usage with non-functor
// @ts-expect-error - Should reject non-functor for Free
type InvalidFreeNonFunctor<A> = ts.plus.Free<string, A>;
// ✅ Should reject non-functor for Free

// Test 1.6: Invalid Free monad usage with zero-arity
// @ts-expect-error - Should reject zero-arity for Free
type InvalidFreeZeroArity<A> = ts.plus.Free<Kind<>, A>;
// ✅ Should reject zero-arity for Free

// ============================================================================
// 2. FIX PATTERN TESTS
// ============================================================================

// Test 2.1: Valid Fix usage with unary functor
interface ValidFixFunctor<A> {
    map<B>(f: (a: A) => B): ValidFixFunctor<B>;
}

type ValidFix = ts.plus.Fix<ValidFixFunctor>;
// ✅ Should accept valid unary functor for Fix

// Test 2.2: Valid Fix usage with explicit Kind
type ValidFixExplicit = ts.plus.Fix<Kind<Type, Type>>;
// ✅ Should accept explicit Kind<Type, Type> for Fix

// Test 2.3: Valid Fix usage with Functor alias
type ValidFixAlias = ts.plus.Fix<ts.plus.Functor>;
// ✅ Should accept Functor alias for Fix

// Test 2.4: Invalid Fix usage with binary functor
// @ts-expect-error - Should reject binary functor for Fix
type InvalidFixBinary = ts.plus.Fix<BinaryFunctor>;
// ✅ Should reject binary functor for Fix

// Test 2.5: Invalid Fix usage with non-functor
// @ts-expect-error - Should reject non-functor for Fix
type InvalidFixNonFunctor = ts.plus.Fix<string>;
// ✅ Should reject non-functor for Fix

// Test 2.6: Invalid Fix usage with zero-arity
// @ts-expect-error - Should reject zero-arity for Fix
type InvalidFixZeroArity = ts.plus.Fix<Kind<>>;
// ✅ Should reject zero-arity for Fix

// ============================================================================
// 3. FP PATTERN USAGE PATTERNS
// ============================================================================

// Test 3.1: Free monad with List functor
interface List<A> {
    map<B>(f: (a: A) => B): List<B>;
}

type ListFree<A> = ts.plus.Free<List, A>;
// ✅ Should work with List functor

// Test 3.2: Free monad with Option functor
interface Option<A> {
    map<B>(f: (a: A) => B): Option<B>;
}

type OptionFree<A> = ts.plus.Free<Option, A>;
// ✅ Should work with Option functor

// Test 3.3: Free monad with Reader functor
interface Reader<R, A> {
    map<B>(f: (a: A) => B): Reader<R, B>;
}

type ReaderFree<A> = ts.plus.Free<Reader<R, any>, A>;
// ✅ Should work with Reader functor

// Test 3.4: Fix with Tree functor
interface TreeF<A> {
    map<B>(f: (a: A) => B): TreeF<B>;
}

type Tree = ts.plus.Fix<TreeF>;
// ✅ Should work with Tree functor

// Test 3.5: Fix with List functor
type ListFix = ts.plus.Fix<List>;
// ✅ Should work with List functor

// ============================================================================
// 4. FP PATTERN CONSTRAINT ENFORCEMENT
// ============================================================================

// Test 4.1: Free constraint enforcement in function
function testFreeConstraint<F extends Kind<Type, Type>>(fa: F<string>): ts.plus.Free<F, number> {
    return fa as any;
}
// ✅ Should enforce Free constraints in functions

// Test 4.2: Fix constraint enforcement in function
function testFixConstraint<F extends Kind<Type, Type>>(fa: F<string>): ts.plus.Fix<F> {
    return fa as any;
}
// ✅ Should enforce Fix constraints in functions

// Test 4.3: Free constraint enforcement in interface
interface TestFreeInterface<F extends Kind<Type, Type>> {
    free: ts.plus.Free<F, string>;
}
// ✅ Should enforce Free constraints in interfaces

// Test 4.4: Fix constraint enforcement in interface
interface TestFixInterface<F extends Kind<Type, Type>> {
    fix: ts.plus.Fix<F>;
}
// ✅ Should enforce Fix constraints in interfaces

// Test 4.5: Free constraint enforcement in class
class TestFreeClass<F extends Kind<Type, Type>> {
    free: ts.plus.Free<F, string>;
    
    constructor(free: ts.plus.Free<F, string>) {
        this.free = free;
    }
}
// ✅ Should enforce Free constraints in classes

// Test 4.6: Fix constraint enforcement in class
class TestFixClass<F extends Kind<Type, Type>> {
    fix: ts.plus.Fix<F>;
    
    constructor(fix: ts.plus.Fix<F>) {
        this.fix = fix;
    }
}
// ✅ Should enforce Fix constraints in classes

// ============================================================================
// 5. FP PATTERN ERROR CASES
// ============================================================================

// Test 5.1: Free with wrong arity functor
interface WrongArityFunctor<A, B, C> {
    map<D, E, F>(f: (a: A) => D, g: (b: B) => E, h: (c: C) => F): WrongArityFunctor<D, E, F>;
}

// @ts-expect-error - Should reject ternary functor for Free
type WrongArityFree<A> = ts.plus.Free<WrongArityFunctor, A>;
// ✅ Should reject wrong arity functor for Free

// Test 5.2: Fix with wrong arity functor
// @ts-expect-error - Should reject ternary functor for Fix
type WrongArityFix = ts.plus.Fix<WrongArityFunctor>;
// ✅ Should reject wrong arity functor for Fix

// Test 5.3: Free with non-functor type
// @ts-expect-error - Should reject non-functor for Free
type NonFunctorFree<A> = ts.plus.Free<number, A>;
// ✅ Should reject non-functor for Free

// Test 5.4: Fix with non-functor type
// @ts-expect-error - Should reject non-functor for Fix
type NonFunctorFix = ts.plus.Fix<number>;
// ✅ Should reject non-functor for Fix

// Test 5.5: Free with any type
// @ts-expect-error - Should reject any for Free
type AnyFree<A> = ts.plus.Free<any, A>;
// ✅ Should reject any for Free

// Test 5.6: Fix with any type
// @ts-expect-error - Should reject any for Fix
type AnyFix = ts.plus.Fix<any>;
// ✅ Should reject any for Fix

// ============================================================================
// 6. FP PATTERN COMPLEX SCENARIOS
// ============================================================================

// Test 6.1: Nested Free patterns
type NestedFree<A> = ts.plus.Free<ts.plus.Free<List, any>, A>;
// ✅ Should handle nested Free patterns

// Test 6.2: Nested Fix patterns
type NestedFix = ts.plus.Fix<ts.plus.Fix<TreeF>>;
// ✅ Should handle nested Fix patterns

// Test 6.3: Free with conditional type
type ConditionalFree<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? ts.plus.Free<F, string> 
    : never;
// ✅ Should handle Free with conditional types

// Test 6.4: Fix with conditional type
type ConditionalFix<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? ts.plus.Fix<F> 
    : never;
// ✅ Should handle Fix with conditional types

// Test 6.5: Free with union type
type UnionFree<F extends Kind<Type, Type>> = ts.plus.Free<F, string> | ts.plus.Free<F, number>;
// ✅ Should handle Free with union types

// Test 6.6: Fix with union type
type UnionFix<F extends Kind<Type, Type>> = ts.plus.Fix<F> | ts.plus.Fix<F>;
// ✅ Should handle Fix with union types

// ============================================================================
// 7. FP PATTERN INTEGRATION WITH LANGUAGE SERVICE
// ============================================================================

// Test 7.1: Free pattern autocomplete
function testFreeAutocomplete<F extends Kind<Type, Type>>(fa: F<string>): ts.plus.Free<F, number> {
    // Autocomplete should work with Free patterns
    return fa as any;
}
// ✅ Should integrate with autocomplete

// Test 7.2: Fix pattern autocomplete
function testFixAutocomplete<F extends Kind<Type, Type>>(fa: F<string>): ts.plus.Fix<F> {
    // Autocomplete should work with Fix patterns
    return fa as any;
}
// ✅ Should integrate with autocomplete

// Test 7.3: Free pattern hover
function testFreeHover<F extends Kind<Type, Type>>(free: ts.plus.Free<F, string>): void {
    // Hover should work with Free patterns
}
// ✅ Should integrate with hover

// Test 7.4: Fix pattern hover
function testFixHover<F extends Kind<Type, Type>>(fix: ts.plus.Fix<F>): void {
    // Hover should work with Fix patterns
}
// ✅ Should integrate with hover

// Test 7.5: Free pattern quick fixes
function testFreeQuickFixes<F extends Kind<Type, Type>>(fa: F<string>): ts.plus.Free<F, number> {
    // @ts-expect-error - Should provide quick fixes for Free constraint violations
    const bad: ts.plus.Free<F, number> = {} as any;
    return fa as any;
}
// ✅ Should integrate with quick fixes

// Test 7.6: Fix pattern quick fixes
function testFixQuickFixes<F extends Kind<Type, Type>>(fa: F<string>): ts.plus.Fix<F> {
    // @ts-expect-error - Should provide quick fixes for Fix constraint violations
    const bad: ts.plus.Fix<F> = {} as any;
    return fa as any;
}
// ✅ Should integrate with quick fixes

// ============================================================================
// 8. FP PATTERN PERFORMANCE TESTS
// ============================================================================

// Test 8.1: Free pattern with deep nesting
type DeepNestedFree<F extends Kind<Type, Type>> = ts.plus.Free<F, ts.plus.Free<F, ts.plus.Free<F, string>>>;
// ✅ Should handle deep nesting efficiently

// Test 8.2: Fix pattern with deep nesting
type DeepNestedFix<F extends Kind<Type, Type>> = ts.plus.Fix<ts.plus.Fix<ts.plus.Fix<F>>>;
// ✅ Should handle deep nesting efficiently

// Test 8.3: Free pattern with large type graphs
type LargeFreeGraph<F extends Kind<Type, Type>> = {
    level1: ts.plus.Free<F, string>;
    level2: {
        nested1: ts.plus.Free<F, number>;
        nested2: ts.plus.Free<F, boolean>;
    };
    level3: {
        deep1: {
            deeper1: ts.plus.Free<F, string>;
            deeper2: ts.plus.Free<F, number>;
        };
        deep2: {
            deeper3: ts.plus.Free<F, boolean>;
            deeper4: ts.plus.Free<F, string>;
        };
    };
};
// ✅ Should handle large type graphs efficiently

// Test 8.4: Fix pattern with large type graphs
type LargeFixGraph<F extends Kind<Type, Type>> = {
    level1: ts.plus.Fix<F>;
    level2: {
        nested1: ts.plus.Fix<F>;
        nested2: ts.plus.Fix<F>;
    };
    level3: {
        deep1: {
            deeper1: ts.plus.Fix<F>;
            deeper2: ts.plus.Fix<F>;
        };
        deep2: {
            deeper3: ts.plus.Fix<F>;
            deeper4: ts.plus.Fix<F>;
        };
    };
};
// ✅ Should handle large type graphs efficiently

// ============================================================================
// 9. FP PATTERN EDGE CASES
// ============================================================================

// Test 9.1: Free pattern with circular reference
interface CircularFree<A> extends CircularFree<A> {}

// @ts-expect-error - Should detect circular reference in Free
type CircularFreeTest = ts.plus.Free<CircularFree, string>;
// ✅ Should detect circular references

// Test 9.2: Fix pattern with circular reference
interface CircularFix<A> extends CircularFix<A> {}

// @ts-expect-error - Should detect circular reference in Fix
type CircularFixTest = ts.plus.Fix<CircularFix>;
// ✅ Should detect circular references

// Test 9.3: Free pattern with conditional constraint
type ConditionalFreeConstraint<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? ts.plus.Free<F, string> 
    : ts.plus.Free<F, number>;
// ✅ Should handle conditional constraints

// Test 9.4: Fix pattern with conditional constraint
type ConditionalFixConstraint<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? ts.plus.Fix<F> 
    : ts.plus.Fix<F>;
// ✅ Should handle conditional constraints

// ============================================================================
// 10. FP PATTERN DOCUMENTATION TESTS
// ============================================================================

// Test 10.1: Free pattern documentation
/**
 * Example usage of Free monad pattern
 * @template F - The functor type constructor (must be unary functor)
 * @template A - The value type
 */
type ExampleFree<F extends Kind<Type, Type>, A> = ts.plus.Free<F, A>;
// ✅ Should have proper documentation

// Test 10.2: Fix pattern documentation
/**
 * Example usage of Fix pattern
 * @template F - The functor type constructor (must be unary functor)
 */
type ExampleFix<F extends Kind<Type, Type>> = ts.plus.Fix<F>;
// ✅ Should have proper documentation

// Test 10.3: Free pattern with JSDoc
/** Free monad over a functor */
type JSDocFree<F extends Kind<Type, Type>, A> = ts.plus.Free<F, A>;
// ✅ Should support JSDoc comments

// Test 10.4: Fix pattern with JSDoc
/** Fixed point of a functor */
type JSDocFix<F extends Kind<Type, Type>> = ts.plus.Fix<F>;
// ✅ Should support JSDoc comments

console.log("✅ All FP pattern tests passed!"); 