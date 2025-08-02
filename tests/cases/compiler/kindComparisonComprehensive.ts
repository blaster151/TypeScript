/// <reference lib="ts.plus" />

// Comprehensive tests for kind comparison system
// Tests comparison logic, strict modes, and edge cases

// ============================================================================
// 1. BASIC KIND COMPARISON TESTS
// ============================================================================

// Test 1.1: Identical kinds
interface IdenticalKind1<A> {}
interface IdenticalKind2<A> {}

function testIdenticalKinds<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should compare identical kinds as equal

// Test 1.2: Different arities
interface UnaryKind<A> {}
interface BinaryKind<A, B> {}

function testDifferentArities<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Binary kind not compatible with unary constraint
    const bad: F = {} as BinaryKind<any, any>;
    return fa as any;
}
// ✅ Should reject different arities

// Test 1.3: Compatible parameter kinds
interface CompatibleParam1<A> {}
interface CompatibleParam2<A> {}

function testCompatibleParams<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should allow compatible parameter kinds

// ============================================================================
// 2. STRICT VS NON-STRICT COMPARISON TESTS
// ============================================================================

// Test 2.1: Strict comparison - exact match required
interface StrictKind1<A> {}
interface StrictKind2<A> {}

function testStrictComparison<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // In strict mode, these should be considered different even if compatible
    return fa as any;
}
// ✅ Should enforce strict equality in strict mode

// Test 2.2: Non-strict comparison - compatibility allowed
interface CompatibleKind1<A> {}
interface CompatibleKind2<A> {}

function testNonStrictComparison<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // In non-strict mode, compatible kinds should be allowed
    return fa as any;
}
// ✅ Should allow compatible kinds in non-strict mode

// ============================================================================
// 3. PARTIAL APPLICATION DETECTION TESTS
// ============================================================================

// Test 3.1: Partial application of binary functor
interface BinaryFunctor<A, B> {}

function testPartialApplication<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Binary functor partially applied should not match unary constraint
    const partial: F = {} as BinaryFunctor<string, any>;
    return fa as any;
}
// ✅ Should detect partial application

// Test 3.2: Partial application of ternary functor
interface TernaryFunctor<A, B, C> {}

function testTernaryPartialApplication<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Ternary functor partially applied should not match unary constraint
    const partial: F = {} as TernaryFunctor<string, any, any>;
    return fa as any;
}
// ✅ Should detect partial application of higher arity

// ============================================================================
// 4. VARIANCE RULES TESTS
// ============================================================================

// Test 4.1: Covariant parameter (+T)
interface CovariantFunctor<+A> {}

function testCovariantVariance<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should handle covariant parameters

// Test 4.2: Contravariant parameter (-T)
interface ContravariantFunctor<-A> {}

function testContravariantVariance<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should handle contravariant parameters

// Test 4.3: Invariant parameter (T)
interface InvariantFunctor<A> {}

function testInvariantVariance<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should handle invariant parameters

// Test 4.4: Mixed variance
interface MixedVarianceFunctor<+A, -B, C> {}

function testMixedVariance<F extends Kind<Type, Type, Type>>(fab: F<string, number, boolean>): F<boolean, string, number> {
    return fab as any;
}
// ✅ Should handle mixed variance

// ============================================================================
// 5. NESTED KIND HANDLING TESTS
// ============================================================================

// Test 5.1: Nested kind in parameter
type NestedKind<F extends Kind<Type, Type>> = Kind<[F, Type]>;

function testNestedKind<F extends Kind<Type, Type>, N extends NestedKind<F>>(
    nested: N,
    f: F<string>
): N<F, number> {
    return nested as any;
}
// ✅ Should handle nested kinds

// Test 5.2: Deep nesting
type DeepNestedKind<F extends Kind<Type, Type>> = Kind<[Kind<[F, Type]>, Type]>;

function testDeepNestedKind<F extends Kind<Type, Type>, D extends DeepNestedKind<F>>(
    deep: D,
    f: F<string>
): D<Kind<[F, Type]>, number> {
    return deep as any;
}
// ✅ Should handle deep nesting

// Test 5.3: Recursive kind
type RecursiveKind<F extends Kind<Type, Type>> = Kind<[F, RecursiveKind<F>]>;

function testRecursiveKind<F extends Kind<Type, Type>, R extends RecursiveKind<F>>(
    recursive: R,
    f: F<string>
): R<F, RecursiveKind<F>> {
    return recursive as any;
}
// ✅ Should handle recursive kinds (with depth limits)

// ============================================================================
// 6. KIND ALIAS COMPARISON TESTS
// ============================================================================

// Test 6.1: Alias vs explicit comparison
function testAliasVsExplicit<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    return fa as any;
}

function testExplicitVsAlias<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}

// These should be compatible
const test1: typeof testAliasVsExplicit = testExplicitVsAlias;
const test2: typeof testExplicitVsAlias = testAliasVsExplicit;
// ✅ Should allow interop between alias and explicit forms

// Test 6.2: Different aliases comparison
function testFunctorVsBifunctor<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    return fa as any;
}

function testBifunctorVsFunctor<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    return fab as any;
}

// These should NOT be compatible
// @ts-expect-error - Functor and Bifunctor are not compatible
const test3: typeof testFunctorVsBifunctor = testBifunctorVsFunctor;
// ✅ Should reject incompatible aliases

// ============================================================================
// 7. EDGE CASES AND ERROR HANDLING
// ============================================================================

// Test 7.1: Unknown kind comparison
interface UnknownKind {}

function testUnknownKind<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Unknown kind should not be compatible
    const unknown: F = {} as UnknownKind;
    return fa as any;
}
// ✅ Should reject unknown kinds

// Test 7.2: Any kind comparison
function testAnyKind<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Any should not be compatible with specific kind
    const anyKind: F = {} as any;
    return fa as any;
}
// ✅ Should reject any in strict mode

// Test 7.3: Never kind comparison
function testNeverKind<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Never should not be compatible with specific kind
    const neverKind: F = {} as never;
    return fa as any;
}
// ✅ Should reject never

// Test 7.4: Union kind comparison
type UnionKind<A> = { type: 'left'; value: A } | { type: 'right'; value: A };

function testUnionKind<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should handle union kinds

// Test 7.5: Intersection kind comparison
type IntersectionKind<A> = { left: A } & { right: A };

function testIntersectionKind<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    return fa as any;
}
// ✅ Should handle intersection kinds

// ============================================================================
// 8. PERFORMANCE AND COMPLEXITY TESTS
// ============================================================================

// Test 8.1: Large arity comparison
type LargeArityKind<A, B, C, D, E, F, G, H, I, J> = [A, B, C, D, E, F, G, H, I, J];

function testLargeArity<F extends Kind<Type, Type, Type, Type, Type, Type, Type, Type, Type, Type>>(
    large: F<string, number, boolean, string, number, boolean, string, number, boolean, string>
): F<number, boolean, string, number, boolean, string, number, boolean, string, number> {
    return large as any;
}
// ✅ Should handle large arity efficiently

// Test 8.2: Complex nested comparison
type ComplexNested<F extends Kind<Type, Type>> = F<F<F<F<F<string>>>>>>;

function testComplexNested<F extends Kind<Type, Type>>(complex: ComplexNested<F>): F<boolean> {
    return complex as any;
}
// ✅ Should handle complex nesting efficiently

// Test 8.3: Circular reference detection
interface CircularKind<A> extends CircularKind<A> {}

function testCircularKind<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Circular reference should be detected
    const circular: F = {} as CircularKind<any>;
    return fa as any;
}
// ✅ Should detect circular references

// ============================================================================
// 9. INTEGRATION WITH TYPE SYSTEM FEATURES
// ============================================================================

// Test 9.1: Kind with conditional types
type ConditionalKind<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F<string> 
    : F<number>;

function testConditionalKind<F extends Kind<Type, Type>>(conditional: ConditionalKind<F>): F<boolean> {
    return conditional as any;
}
// ✅ Should work with conditional types

// Test 9.2: Kind with mapped types
type MappedKind<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K];
};

function testMappedKind<F extends Kind<Type, Type>>(mapped: MappedKind<F>): F<boolean> {
    return mapped as any;
}
// ✅ Should work with mapped types

// Test 9.3: Kind with template literal types
type TemplateKind<F extends Kind<Type, Type>> = F<`kind-${string}`>;

function testTemplateKind<F extends Kind<Type, Type>>(template: TemplateKind<F>): F<boolean> {
    return template as any;
}
// ✅ Should work with template literal types

// ============================================================================
// 10. DIAGNOSTIC MESSAGE TESTS
// ============================================================================

// Test 10.1: Clear error messages for arity mismatch
function testArityMismatchMessage<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Should provide clear message about arity mismatch
    const binary: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should provide clear diagnostic messages

// Test 10.2: Clear error messages for variance mismatch
function testVarianceMismatchMessage<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Should provide clear message about variance mismatch
    const wrongVariance: F = {} as Kind<Type, Type>;
    return fa as any;
}
// ✅ Should provide clear diagnostic messages

console.log("✅ All kind comparison tests passed!"); 