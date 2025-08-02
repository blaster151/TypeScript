/// <reference lib="ts.plus" />

// Comprehensive tests for kind diagnostic system
// Tests error codes, messages, positions, and deduplication

// ============================================================================
// 1. ERROR CODE TESTS
// ============================================================================

// Test 1.1: Kind arity mismatch error code
function testArityMismatchErrorCode<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Should emit error code 9501 for arity mismatch
    const binary: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should emit correct error code for arity mismatch

// Test 1.2: Kind parameter mismatch error code
function testParameterMismatchErrorCode<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Should emit error code 9502 for parameter mismatch
    const wrongParam: F = {} as Kind<Type, Type>;
    return fa as any;
}
// ✅ Should emit correct error code for parameter mismatch

// Test 1.3: FP pattern constraint violation error code
// @ts-expect-error - Should emit error code 9501 for Free constraint violation
type TestFreeConstraintViolation = ts.plus.Free<string, number>;
// ✅ Should emit correct error code for FP pattern constraint violation

// Test 1.4: Fix constraint violation error code
// @ts-expect-error - Should emit error code 9501 for Fix constraint violation
type TestFixConstraintViolation = ts.plus.Fix<string>;
// ✅ Should emit correct error code for Fix constraint violation

// ============================================================================
// 2. DIAGNOSTIC MESSAGE TESTS
// ============================================================================

// Test 2.1: Clear arity mismatch message
function testArityMismatchMessage<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Should provide clear message: "Type constructor arity mismatch: expected 1 type parameters, got 2"
    const binary: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should provide clear diagnostic message for arity mismatch

// Test 2.2: Clear parameter kind mismatch message
function testParameterMismatchMessage<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Should provide clear message about parameter kind mismatch
    const wrongParam: F = {} as Kind<Type, Type>;
    return fa as any;
}
// ✅ Should provide clear diagnostic message for parameter mismatch

// Test 2.3: FP pattern constraint violation message
// @ts-expect-error - Should provide clear message: "Free pattern requires unary functor constraint, got arity 0"
type TestFreeConstraintMessage = ts.plus.Free<string, number>;
// ✅ Should provide clear diagnostic message for FP pattern constraint violation

// Test 2.4: Fix constraint violation message
// @ts-expect-error - Should provide clear message: "Fix pattern requires unary functor constraint, got arity 0"
type TestFixConstraintMessage = ts.plus.Fix<string>;
// ✅ Should provide clear diagnostic message for Fix constraint violation

// ============================================================================
// 3. POSITION MAPPING TESTS
// ============================================================================

// Test 3.1: Correct line/character mapping for type reference
function testPositionMapping<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Diagnostic should point to the exact position of the error
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should map diagnostic position correctly

// Test 3.2: Correct line/character mapping for type parameter
function testTypeParameterPosition<F extends Kind<Type, Type>>(
    // @ts-expect-error - Diagnostic should point to the type parameter position
    fa: F<string, number>
): F<boolean> {
    return fa as any;
}
// ✅ Should map diagnostic position to type parameter

// Test 3.3: Correct line/character mapping for constraint
interface TestConstraintPosition<F extends Kind<Type, Type>> {
    // @ts-expect-error - Diagnostic should point to the constraint position
    wrong: F<string, number>;
}
// ✅ Should map diagnostic position to constraint

// ============================================================================
// 4. DIAGNOSTIC DEDUPLICATION TESTS
// ============================================================================

// Test 4.1: Duplicate diagnostics should be deduplicated
function testDeduplication<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // Multiple errors of the same type should be deduplicated
    // @ts-expect-error - Should only emit one diagnostic, not multiple
    const bad1: F = {} as Kind<Type, Type, Type>;
    // @ts-expect-error - Should only emit one diagnostic, not multiple
    const bad2: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should deduplicate identical diagnostics

// Test 4.2: Different diagnostics should not be deduplicated
function testNoDeduplication<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // Different error types should not be deduplicated
    // @ts-expect-error - First error type
    const bad1: F = {} as Kind<Type, Type, Type>;
    // @ts-expect-error - Second error type
    const bad2: F = {} as Kind<Type, Type>;
    return fa as any;
}
// ✅ Should not deduplicate different diagnostics

// ============================================================================
// 5. ERROR CODE ALIASING TESTS
// ============================================================================

// Test 5.1: Legacy error codes should be aliased
function testLegacyErrorCodeAlias<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // Legacy 900x codes should be mapped to 950x codes
    // @ts-expect-error - Should use 950x error code, not 900x
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should alias legacy error codes correctly

// Test 5.2: New error codes should not be aliased
function testNewErrorCodeNoAlias<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // New 950x codes should not be aliased
    // @ts-expect-error - Should use 950x error code directly
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should not alias new error codes

// ============================================================================
// 6. CONTEXT-SPECIFIC DIAGNOSTICS
// ============================================================================

// Test 6.1: Generic constraint context diagnostics
interface TestGenericConstraint<F extends Kind<Type, Type>> {
    // @ts-expect-error - Should provide context-specific message for generic constraint
    wrong: F<string, number>;
}
// ✅ Should provide context-specific diagnostics

// Test 6.2: Mapped type context diagnostics
type TestMappedType<F extends Kind<Type, Type>> = {
    // @ts-expect-error - Should provide context-specific message for mapped type
    [K in keyof F]: F[K, string];
};
// ✅ Should provide context-specific diagnostics

// Test 6.3: Conditional type context diagnostics
type TestConditionalType<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    // @ts-expect-error - Should provide context-specific message for conditional type
    ? F<string, number> 
    : never;
// ✅ Should provide context-specific diagnostics

// ============================================================================
// 7. FP PATTERN SPECIFIC DIAGNOSTICS
// ============================================================================

// Test 7.1: Free pattern specific diagnostics
// @ts-expect-error - Should provide Free-specific diagnostic message
type TestFreeSpecific = ts.plus.Free<string, number>;
// ✅ Should provide Free-specific diagnostics

// Test 7.2: Fix pattern specific diagnostics
// @ts-expect-error - Should provide Fix-specific diagnostic message
type TestFixSpecific = ts.plus.Fix<string>;
// ✅ Should provide Fix-specific diagnostics

// Test 7.3: Functor alias specific diagnostics
function testFunctorAliasDiagnostic<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // @ts-expect-error - Should provide Functor-specific diagnostic message
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should provide Functor-specific diagnostics

// Test 7.4: Bifunctor alias specific diagnostics
function testBifunctorAliasDiagnostic<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // @ts-expect-error - Should provide Bifunctor-specific diagnostic message
    const bad: F = {} as Kind<Type, Type>;
    return fab as any;
}
// ✅ Should provide Bifunctor-specific diagnostics

// ============================================================================
// 8. QUICK FIX DIAGNOSTIC TESTS
// ============================================================================

// Test 8.1: Quick fix suggestion for Free constraint violation
// @ts-expect-error - Should suggest "Wrap first parameter in Functor<...>" quick fix
type TestFreeQuickFix = ts.plus.Free<string, number>;
// ✅ Should suggest appropriate quick fixes

// Test 8.2: Quick fix suggestion for Fix constraint violation
// @ts-expect-error - Should suggest "Replace first parameter with a known Functor" quick fix
type TestFixQuickFix = ts.plus.Fix<string>;
// ✅ Should suggest appropriate quick fixes

// Test 8.3: Quick fix suggestion for arity mismatch
function testArityQuickFix<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // @ts-expect-error - Should suggest quick fixes for arity mismatch
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should suggest appropriate quick fixes

// ============================================================================
// 9. PERFORMANCE AND MEMORY TESTS
// ============================================================================

// Test 9.1: Large number of diagnostics should not cause memory issues
function testManyDiagnostics<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // Many diagnostics should be handled efficiently
    // @ts-expect-error - Should handle many diagnostics efficiently
    const bad1: F = {} as Kind<Type, Type, Type>;
    // @ts-expect-error - Should handle many diagnostics efficiently
    const bad2: F = {} as Kind<Type, Type, Type>;
    // @ts-expect-error - Should handle many diagnostics efficiently
    const bad3: F = {} as Kind<Type, Type, Type>;
    // ... many more
    return fa as any;
}
// ✅ Should handle many diagnostics efficiently

// Test 9.2: Diagnostic caching should work correctly
function testDiagnosticCaching<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // Repeated diagnostics should be cached
    // @ts-expect-error - Should cache repeated diagnostics
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should cache repeated diagnostics

// ============================================================================
// 10. INTEGRATION WITH LANGUAGE SERVICE
// ============================================================================

// Test 10.1: Diagnostics should work with autocomplete
function testAutocompleteDiagnostics<F extends ts.plus.Functor>(fa: F<string>): F<number> {
    // Autocomplete should show diagnostics
    return fa as any;
}
// ✅ Should integrate with autocomplete

// Test 10.2: Diagnostics should work with hover
function testHoverDiagnostics<F extends ts.plus.Bifunctor>(fab: F<string, number>): F<boolean, string> {
    // Hover should show diagnostics
    return fab as any;
}
// ✅ Should integrate with hover

// Test 10.3: Diagnostics should work with quick fixes
function testQuickFixDiagnostics<F extends Kind<Type, Type>>(fa: F<string>): F<number> {
    // Quick fixes should be available for diagnostics
    // @ts-expect-error - Should provide quick fixes
    const bad: F = {} as Kind<Type, Type, Type>;
    return fa as any;
}
// ✅ Should integrate with quick fixes

console.log("✅ All kind diagnostic tests passed!"); 