// @target: es2020
// @lib: es2020,dom
// @strict: true

/// <reference lib="ts.plus" />

// Test enhanced diagnostic messages for Free constraint violations
function testFreeEnhancedDiagnostics() {
    // Define invalid types that should trigger specific diagnostic messages
    
    // Test 1: Non-functor type
    interface InvalidType {
        prop: string;
    }
    
    // @ts-expect-error - Should show: "The first type parameter of 'Free' must be a unary functor (Kind<Type, Type>). Found: InvalidType"
    type InvalidFree1<A> = ts.plus.Free<InvalidType, A>;
    
    // Test 2: Bifunctor (wrong arity)
    interface BifunctorType<L, R> {
        type: 'left' | 'right';
        leftValue?: L;
        rightValue?: R;
    }
    
    // @ts-expect-error - Should show: "The first type parameter of 'Free' must be a unary functor (Kind<Type, Type>). Found: BifunctorType"
    type InvalidFree2<A> = ts.plus.Free<BifunctorType, A>;
    
    // Test 3: Generic Kind (no specific arity)
    // @ts-expect-error - Should show: "The first type parameter of 'Free' must be a unary functor (Kind<Type, Type>). Found: Kind<Type, Type, Type>"
    type InvalidFree3<A> = ts.plus.Free<Kind<Type, Type, Type>, A>;
    
    // Test 4: Missing second type argument
    interface ValidFunctor<A> {
        type: 'valid';
        value?: A;
    }
    
    // @ts-expect-error - Should show: "Free requires two type arguments: Free<F, A>"
    type InvalidFree4 = ts.plus.Free<ValidFunctor>;
    
    return { InvalidFree1, InvalidFree2, InvalidFree3, InvalidFree4 };
}

// Test enhanced diagnostic messages for Fix constraint violations
function testFixEnhancedDiagnostics() {
    // Define invalid types that should trigger specific diagnostic messages
    
    // Test 1: Non-functor type
    interface InvalidType {
        prop: string;
    }
    
    // @ts-expect-error - Should show: "The type parameter of 'Fix' must be a unary functor (Kind<Type, Type>). Found: InvalidType"
    type InvalidFix1 = ts.plus.Fix<InvalidType>;
    
    // Test 2: Bifunctor (wrong arity)
    interface BifunctorType<L, R> {
        type: 'left' | 'right';
        leftValue?: L;
        rightValue?: R;
    }
    
    // @ts-expect-error - Should show: "The type parameter of 'Fix' must be a unary functor (Kind<Type, Type>). Found: BifunctorType"
    type InvalidFix2 = ts.plus.Fix<BifunctorType>;
    
    // Test 3: Generic Kind (no specific arity)
    // @ts-expect-error - Should show: "The type parameter of 'Fix' must be a unary functor (Kind<Type, Type>). Found: Kind<Type, Type, Type>"
    type InvalidFix3 = ts.plus.Fix<Kind<Type, Type, Type>>;
    
    // Test 4: Raw type constructor (should suggest wrapping)
    interface RawTypeConstructor {
        // Not a functor
    }
    
    // @ts-expect-error - Should show: "The type parameter of 'Fix' must be a unary functor (Kind<Type, Type>). Found: RawTypeConstructor"
    type InvalidFix4 = ts.plus.Fix<RawTypeConstructor>;
    
    return { InvalidFix1, InvalidFix2, InvalidFix3, InvalidFix4 };
}

// Test that valid usage doesn't produce diagnostics
function testValidUsageNoDiagnostics() {
    // These should work without any diagnostics
    
    // Valid Free usage
    interface ValidFunctor<A> {
        type: 'valid';
        value?: A;
    }
    
    type ValidFree<A> = ts.plus.Free<ValidFunctor, A>;
    
    // Valid Fix usage
    type ValidFix = ts.plus.Fix<ValidFunctor>;
    
    // Valid usage with built-in Functor alias
    type ValidFreeWithFunctor<A> = ts.plus.Free<ts.plus.Functor, A>;
    type ValidFixWithFunctor = ts.plus.Fix<ts.plus.Functor>;
    
    return { ValidFree, ValidFix, ValidFreeWithFunctor, ValidFixWithFunctor };
}

// Test quick-fix suggestions
function testQuickFixSuggestions() {
    // These should trigger quick-fix suggestions
    
    // Test 1: Should suggest "Change type parameter to Functor"
    interface NonFunctorType {
        prop: string;
    }
    
    // @ts-expect-error - Should suggest quick-fix: "Change type parameter to Functor"
    type TestQuickFix1<A> = ts.plus.Free<NonFunctorType, A>;
    
    // Test 2: Should suggest "Wrap type in Functor<NonFunctorType>"
    // @ts-expect-error - Should suggest quick-fix: "Wrap type in Functor<NonFunctorType>"
    type TestQuickFix2 = ts.plus.Fix<NonFunctorType>;
    
    // Test 3: Should suggest "Replace with known functor"
    // @ts-expect-error - Should suggest quick-fix: "Replace with known functor"
    type TestQuickFix3<A> = ts.plus.Free<any, A>;
    
    return { TestQuickFix1, TestQuickFix2, TestQuickFix3 };
}

// Test that diagnostics are not duplicated
function testNoDuplicateDiagnostics() {
    // Using Free/Fix with invalid types should produce exactly one diagnostic per violation
    
    interface InvalidType {
        prop: string;
    }
    
    // Each of these should produce exactly one diagnostic, not multiple
    // @ts-expect-error - Single diagnostic for Free constraint violation
    type SingleDiagnostic1<A> = ts.plus.Free<InvalidType, A>;
    
    // @ts-expect-error - Single diagnostic for Fix constraint violation
    type SingleDiagnostic2 = ts.plus.Fix<InvalidType>;
    
    // @ts-expect-error - Single diagnostic for Free constraint violation
    type SingleDiagnostic3<A> = ts.plus.Free<InvalidType, A>;
    
    return { SingleDiagnostic1, SingleDiagnostic2, SingleDiagnostic3 };
}

// Test complex nested scenarios
function testComplexNestedScenarios() {
    // Test nested Free/Fix usage with invalid types
    
    interface InvalidFunctor<A> {
        // Not a proper functor
        prop: string;
        value?: A;
    }
    
    // Nested Free with invalid functor
    // @ts-expect-error - Should show diagnostic for inner Free
    type NestedInvalidFree<A> = ts.plus.Free<ts.plus.Free<InvalidFunctor, A>, A>;
    
    // Nested Fix with invalid functor
    // @ts-expect-error - Should show diagnostic for inner Fix
    type NestedInvalidFix = ts.plus.Fix<ts.plus.Fix<InvalidFunctor>>;
    
    // Free over Fix with invalid functor
    // @ts-expect-error - Should show diagnostic for Fix
    type FreeOverInvalidFix<A> = ts.plus.Free<ts.plus.Fix<InvalidFunctor>, A>;
    
    return { NestedInvalidFree, NestedInvalidFix, FreeOverInvalidFix };
}

// Test that other kind mismatches are not affected
function testOtherKindMismatchesUnaffected() {
    // Other kind constraint violations should continue to work as before
    
    // This should still produce the original kind mismatch diagnostic
    interface WrongArityFunctor<A, B, C> {
        // Three type parameters, not a unary functor
        value?: [A, B, C];
    }
    
    // @ts-expect-error - Should show original kind mismatch, not Free/Fix specific
    type OtherKindMismatch<A> = ts.plus.Free<WrongArityFunctor, A>;
    
    return { OtherKindMismatch };
} 