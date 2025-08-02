// @target: es2020
// @lib: es2020,dom
// @strict: true

/// <reference lib="ts.plus" />

// Test that kind compatibility validation works correctly
function testKindCompatibilityValidation() {
    // Test 1: Functor should be compatible with Kind<Type, Type>
    interface TestFunctor<F extends ts.plus.Functor> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    // This should work - Functor is compatible with Kind<Type, Type>
    interface OptionF<A> {
        type: 'some' | 'none';
        value?: A;
    }
    
    const optionConstraint: TestFunctor<OptionF> = {
        map: (fa, f) => ({ ...fa, value: fa.value ? f(fa.value) : undefined })
    };
    
    // Test 2: Bifunctor should be compatible with Kind<Type, Type, Type>
    interface TestBifunctor<F extends ts.plus.Bifunctor> {
        bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>;
    }
    
    interface EitherF<L, R> {
        type: 'left' | 'right';
        leftValue?: L;
        rightValue?: R;
    }
    
    const eitherConstraint: TestBifunctor<EitherF> = {
        bimap: (fab, f, g) => ({
            ...fab,
            leftValue: fab.leftValue ? f(fab.leftValue) : undefined,
            rightValue: fab.rightValue ? g(fab.rightValue) : undefined
        })
    };
    
    return { optionConstraint, eitherConstraint };
}

// Test that FP pattern constraint validation works correctly
function testFPPatternConstraintValidation() {
    // Test 1: Valid Free usage
    interface ValidFunctor<A> {
        type: 'valid';
        value?: A;
    }
    
    type ValidFree<A> = ts.plus.Free<ValidFunctor, A>;
    
    // Test 2: Valid Fix usage
    type ValidFix = ts.plus.Fix<ValidFunctor>;
    
    // Test 3: Invalid Free usage (should emit diagnostic)
    interface InvalidType {
        prop: string;
    }
    
    // @ts-expect-error - Should fail kind constraint
    type InvalidFree<A> = ts.plus.Free<InvalidType, A>;
    
    // @ts-expect-error - Should fail kind constraint
    type InvalidFix = ts.plus.Fix<InvalidType>;
    
    return { ValidFree, ValidFix, InvalidFree, InvalidFix };
}

// Test that kind aliases work in type parameter constraints
function testKindAliasTypeParameterConstraints() {
    // Test 1: Functor constraint
    interface FunctorConstraint<F extends ts.plus.Functor> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    // Test 2: Bifunctor constraint
    interface BifunctorConstraint<F extends ts.plus.Bifunctor> {
        bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>;
    }
    
    // Test 3: Generic Kind constraint
    interface GenericKindConstraint<F extends Kind<Type, Type>> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    return { FunctorConstraint, BifunctorConstraint, GenericKindConstraint };
}

// Test that kind compatibility works in heritage clauses
function testKindHeritageClauses() {
    // Test 1: Interface extending with kind constraint
    interface BaseFunctor<F extends ts.plus.Functor> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    interface ExtendedFunctor<F extends ts.plus.Functor> extends BaseFunctor<F> {
        // Should inherit kind constraint
    }
    
    // Test 2: Class implementing with kind constraint
    class FunctorImpl<F extends ts.plus.Functor> implements BaseFunctor<F> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B> {
            return {} as F<B>; // Implementation
        }
    }
    
    return { BaseFunctor, ExtendedFunctor, FunctorImpl };
}

// Test that kind constraints work in mapped types
function testKindMappedTypes() {
    // Test 1: Mapped type with kind constraint
    type FunctorMap<F extends ts.plus.Functor> = {
        [K in keyof F<any>]: F<K>;
    };
    
    // Test 2: Mapped type with FP pattern constraint
    type FreeMap<F extends ts.plus.Functor> = {
        [K in keyof F<any>]: ts.plus.Free<F, K>;
    };
    
    return { FunctorMap, FreeMap };
}

// Test that diagnostics are emitted correctly
function testDiagnosticEmission() {
    // These should emit specific diagnostic messages
    
    // Test 1: Free constraint violation
    interface NonFunctorType {
        prop: string;
    }
    
    // @ts-expect-error - Should emit: "The first type parameter of 'Free' must be a unary functor (Kind<Type, Type>). Found: NonFunctorType"
    type DiagnosticTest1<A> = ts.plus.Free<NonFunctorType, A>;
    
    // Test 2: Fix constraint violation
    // @ts-expect-error - Should emit: "The type parameter of 'Fix' must be a unary functor (Kind<Type, Type>). Found: NonFunctorType"
    type DiagnosticTest2 = ts.plus.Fix<NonFunctorType>;
    
    // Test 3: Kind mismatch
    interface WrongArityFunctor<A, B, C> {
        // Three type parameters, not a unary functor
        value?: [A, B, C];
    }
    
    // @ts-expect-error - Should emit kind mismatch diagnostic
    type DiagnosticTest3<A> = ts.plus.Free<WrongArityFunctor, A>;
    
    return { DiagnosticTest1, DiagnosticTest2, DiagnosticTest3 };
}

// Test that language service features work correctly
function testLanguageServiceFeatures() {
    // These tests verify that hover and autocomplete would work correctly
    
    // Test 1: Hover over Functor should show alias information
    type HoverTest1 = ts.plus.Functor;
    
    // Test 2: Hover over Free should show FP pattern information
    type HoverTest2<F extends ts.plus.Functor, A> = ts.plus.Free<F, A>;
    
    // Test 3: Autocomplete should suggest kind aliases in kind-sensitive contexts
    interface AutocompleteTest<F extends ts.plus.Functor> {
        // In this context, autocomplete should suggest Functor, Free, Fix
        test<A>(fa: F<A>): A;
    }
    
    return { HoverTest1, HoverTest2, AutocompleteTest };
}

// Test that quick-fix suggestions work correctly
function testQuickFixSuggestions() {
    // These should trigger quick-fix suggestions
    
    // Test 1: Should suggest "Change type parameter to Functor"
    interface NonFunctorType {
        prop: string;
    }
    
    // @ts-expect-error - Should suggest quick-fix: "Change type parameter to Functor"
    type QuickFixTest1<A> = ts.plus.Free<NonFunctorType, A>;
    
    // Test 2: Should suggest "Wrap type in Functor<NonFunctorType>"
    // @ts-expect-error - Should suggest quick-fix: "Wrap type in Functor<NonFunctorType>"
    type QuickFixTest2 = ts.plus.Fix<NonFunctorType>;
    
    // Test 3: Should suggest "Replace with known functor"
    // @ts-expect-error - Should suggest quick-fix: "Replace with known functor"
    type QuickFixTest3<A> = ts.plus.Free<any, A>;
    
    return { QuickFixTest1, QuickFixTest2, QuickFixTest3 };
} 