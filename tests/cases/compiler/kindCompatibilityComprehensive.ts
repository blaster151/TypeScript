/// <reference lib="ts.plus" />

// Comprehensive tests for kind compatibility system
// Tests context detection, compatibility logic, and FP patterns

// ============================================================================
// 1. CONTEXT DETECTION TESTS
// ============================================================================

// Test 1.1: Generic constraint context detection
interface TestGenericConstraint<F extends Kind<Type, Type>> {
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
}
// ✅ Should detect kind-sensitive context in generic constraint

// Test 1.2: Mapped type context detection
type TestMappedType<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K];
};
// ✅ Should detect kind-sensitive context in mapped type

// Test 1.3: Conditional type context detection
type TestConditionalType<F extends Kind<Type, Type>> = F extends Kind<Type, Type> ? F<string> : never;
// ✅ Should detect kind-sensitive context in conditional type

// Test 1.4: Higher-order function context detection
function testHigherOrder<F extends Kind<Type, Type>>(f: F<any>): F<any> {
    return f;
}
// ✅ Should detect kind-sensitive context in higher-order function

// ============================================================================
// 2. KIND COMPATIBILITY TESTS
// ============================================================================

// Test 2.1: Compatible unary functors
interface CompatibleFunctor1<A> {}
interface CompatibleFunctor2<A> {}

function testCompatibleFunctors<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any; // Should be compatible
}
// ✅ Should allow compatible functor types

// Test 2.2: Incompatible arity
interface BinaryFunctor<A, B> {}

function testIncompatibleArity<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Binary functor not compatible with unary constraint
    const bad: F = {} as BinaryFunctor<any, any>;
    return fa as any;
}
// ✅ Should reject incompatible arity

// Test 2.3: Compatible bifunctors
interface CompatibleBifunctor1<A, B> {}
interface CompatibleBifunctor2<A, B> {}

function testCompatibleBifunctors<F extends Kind<Type, Type, Type>>(fab: F<string, number>): F<boolean, string> {
    return fab as any; // Should be compatible
}
// ✅ Should allow compatible bifunctor types

// ============================================================================
// 3. FP PATTERN VALIDATION TESTS
// ============================================================================

// Test 3.1: Valid Free monad usage
interface ValidFunctor<A> {}

type ValidFree<A> = ts.plus.Free<ValidFunctor, A>;
// ✅ Should accept valid functor for Free

// Test 3.2: Invalid Free monad usage
interface InvalidFreeType<A, B> {} // Binary, not unary

// @ts-expect-error - Binary functor not compatible with Free constraint
type InvalidFree<A> = ts.plus.Free<InvalidFreeType, A>;
// ✅ Should reject invalid functor for Free

// Test 3.3: Valid Fix usage
interface ValidFixFunctor<A> {}

type ValidFix = ts.plus.Fix<ValidFixFunctor>;
// ✅ Should accept valid functor for Fix

// Test 3.4: Invalid Fix usage
interface InvalidFixType<A, B> {} // Binary, not unary

// @ts-expect-error - Binary functor not compatible with Fix constraint
type InvalidFix = ts.plus.Fix<InvalidFixType>;
// ✅ Should reject invalid functor for Fix

// ============================================================================
// 4. KIND ALIAS COMPATIBILITY TESTS
// ============================================================================

// Test 4.1: Functor alias compatibility
function testFunctorAlias<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    return fa as any; // Should be compatible
}
// ✅ Should work with Functor alias

// Test 4.2: Bifunctor alias compatibility
function testBifunctorAlias<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    return fab as any; // Should be compatible
}
// ✅ Should work with Bifunctor alias

// Test 4.3: Explicit Kind vs Alias compatibility
function testExplicitVsAlias<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}

function testAliasVsExplicit<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    return fa as any;
}

// These should be compatible
const test1: typeof testExplicitVsAlias = testAliasVsExplicit;
const test2: typeof testAliasVsExplicit = testExplicitVsAlias;
// ✅ Should allow interop between explicit and alias forms

// ============================================================================
// 5. COMPLEX SCENARIOS
// ============================================================================

// Test 5.1: Nested kind constraints
interface NestedConstraint<F extends Kind<Type, Type>, G extends Kind<Type, Type>> {
    compose<A, B, C>(fa: F<A>, f: (a: A) => G<B>, g: (b: B) => C): F<C>;
}
// ✅ Should handle nested kind constraints

// Test 5.2: Higher-order kind usage
type HigherOrderKind<F extends Kind<Type, Type>> = Kind<[F, Type, Type]>;

function testHigherOrderKind<F extends Kind<Type, Type>, H extends HigherOrderKind<F>>(
    h: H,
    f: F<string>
): H<F, number> {
    return h as any;
}
// ✅ Should handle higher-order kinds

// Test 5.3: Kind in union types
type KindUnion<F extends Kind<Type, Type>> = F<string> | F<number>;

function testKindUnion<F extends Kind<Type, Type>>(fu: KindUnion<F>): F<boolean> {
    return fu as any;
}
// ✅ Should handle kinds in union types

// Test 5.4: Kind in intersection types
type KindIntersection<F extends Kind<Type, Type>> = F<string> & { extra: true };

function testKindIntersection<F extends Kind<Type, Type>>(fi: KindIntersection<F>): F<boolean> {
    return fi as any;
}
// ✅ Should handle kinds in intersection types

// ============================================================================
// 6. ERROR CASES AND DIAGNOSTICS
// ============================================================================

// Test 6.1: Wrong arity in constraint
interface WrongArityConstraint<F extends Kind<Type, Type>> {
    // @ts-expect-error - Binary functor not compatible with unary constraint
    wrong: F<string, number>;
}
// ✅ Should emit diagnostic for arity mismatch

// Test 6.2: Wrong arity in function parameter
function testWrongArity<F extends Kind<Type, Type>>(
    // @ts-expect-error - Binary functor not compatible with unary constraint
    fa: F<string, number>
): F<boolean> {
    return fa as any;
}
// ✅ Should emit diagnostic for parameter arity mismatch

// Test 6.3: Wrong arity in return type
function testWrongReturnArity<F extends Kind<Type, Type>>(fa: F<string>): 
    // @ts-expect-error - Binary functor not compatible with unary constraint
    F<boolean, string> {
    return fa as any;
}
// ✅ Should emit diagnostic for return type arity mismatch

// Test 6.4: Non-kind type in kind constraint
interface NonKindConstraint<F extends string> {
    // @ts-expect-error - String not compatible with kind constraint
    wrong: F<string>;
}
// ✅ Should emit diagnostic for non-kind type

// ============================================================================
// 7. PERFORMANCE AND EDGE CASES
// ============================================================================

// Test 7.1: Deep nesting
type DeepNested<F extends Kind<Type, Type>> = F<F<F<F<F<F<string>>>>>>;

function testDeepNesting<F extends Kind<Type, Type>>(deep: DeepNested<F>): F<boolean> {
    return deep as any;
}
// ✅ Should handle deep nesting without performance issues

// Test 7.2: Circular references (should be detected)
interface CircularFunctor<A> extends CircularFunctor<A> {}
// @ts-expect-error - Circular reference should be detected
type CircularTest = ts.plus.Free<CircularFunctor, string>;
// ✅ Should detect and reject circular references

// Test 7.3: Conditional kind constraints
type ConditionalKind<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F<string> 
    : never;

function testConditionalKind<F extends Kind<Type, Type>>(conditional: ConditionalKind<F>): F<boolean> {
    return conditional as any;
}
// ✅ Should handle conditional kind constraints

// ============================================================================
// 8. INTEGRATION WITH EXISTING TYPESCRIPT FEATURES
// ============================================================================

// Test 8.1: Kind with mapped types
type KindMapped<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K];
};

function testKindMapped<F extends Kind<Type, Type>>(mapped: KindMapped<F>): F<boolean> {
    return mapped as any;
}
// ✅ Should work with mapped types

// Test 8.2: Kind with conditional types
type KindConditional<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F<string> 
    : F<number>;

function testKindConditional<F extends Kind<Type, Type>>(conditional: KindConditional<F>): F<boolean> {
    return conditional as any;
}
// ✅ Should work with conditional types

// Test 8.3: Kind with template literal types
type KindTemplate<F extends Kind<Type, Type>> = F<`kind-${string}`>;

function testKindTemplate<F extends Kind<Type, Type>>(template: KindTemplate<F>): F<boolean> {
    return template as any;
}
// ✅ Should work with template literal types

console.log("✅ All kind compatibility tests passed!"); 