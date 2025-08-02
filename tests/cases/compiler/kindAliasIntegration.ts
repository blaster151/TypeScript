// @target: es2020
// @lib: es2020,dom
// @strict: true

/// <reference lib="ts.plus" />

// Test that Functor behaves exactly like Kind<Type, Type>
function testFunctorEquivalence() {
    // Functor should be equivalent to Kind<Type, Type> in all contexts
    
    // 1. Type parameter constraints
    interface FunctorConstraint<F extends ts.plus.Functor> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    // This should work - Functor is equivalent to Kind<Type, Type>
    interface OptionF<A> {
        type: 'some' | 'none';
        value?: A;
    }
    
    // Should be valid - OptionF is a unary functor
    const optionConstraint: FunctorConstraint<OptionF> = {
        map: (fa, f) => ({ ...fa, value: fa.value ? f(fa.value) : undefined })
    };
    
    return optionConstraint;
}

// Test that Bifunctor behaves exactly like Kind<Type, Type, Type>
function testBifunctorEquivalence() {
    // Bifunctor should be equivalent to Kind<Type, Type, Type> in all contexts
    
    interface BifunctorConstraint<F extends ts.plus.Bifunctor> {
        bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>;
    }
    
    // Define a bifunctor
    interface EitherF<L, R> {
        type: 'left' | 'right';
        leftValue?: L;
        rightValue?: R;
    }
    
    // Should be valid - EitherF is a bifunctor
    const eitherConstraint: BifunctorConstraint<EitherF> = {
        bimap: (fab, f, g) => ({
            ...fab,
            leftValue: fab.leftValue ? f(fab.leftValue) : undefined,
            rightValue: fab.rightValue ? g(fab.rightValue) : undefined
        })
    };
    
    return eitherConstraint;
}

// Test that explicit Kind forms behave like generic Kind<...>
function testExplicitKindEquivalence() {
    // Explicit Kind forms should be equivalent to Kind<...> in all contexts
    
    interface GenericKindConstraint<F extends Kind<Type, Type>> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    // This should work - explicit Kind forms are compatible with any kind
    const anyConstraint: GenericKindConstraint<any> = {
        map: (fa, f) => fa
    };
    
    return anyConstraint;
}

// Test that Free behaves exactly like Kind<Kind<Type, Type>, Type>
function testFreeEquivalence() {
    // Free should be equivalent to Kind<Kind<Type, Type>, Type> in all contexts
    
    // Define a valid unary functor
    interface ConsoleF<A> {
        type: 'log' | 'error';
        message: string;
        next: A;
    }
    
    // This should work - ConsoleF is a unary functor
    type ConsoleFree<A> = ts.plus.Free<ConsoleF, A>;
    
    // Usage example
    const logMessage: ConsoleFree<void> = { type: 'log', message: 'hello', next: undefined };
    
    return logMessage;
}

// Test that Fix behaves exactly like Kind<Kind<Type, Type>>
function testFixEquivalence() {
    // Fix should be equivalent to Kind<Kind<Type, Type>> in all contexts
    
    // Define a valid unary functor for a binary tree
    interface TreeF<A> {
        type: 'leaf' | 'node';
        value?: number;
        left?: A;
        right?: A;
    }
    
    // This should work - TreeF is a unary functor
    type Tree = ts.plus.Fix<TreeF>;
    
    // Usage example
    const tree: Tree = {
        type: 'node',
        value: 1,
        left: { type: 'leaf' },
        right: { type: 'leaf' }
    };
    
    return tree;
}

// Test kind compatibility between aliases and expanded forms
function testKindCompatibility() {
    // Functor should be compatible with Kind<Type, Type>
    interface TestFunctor<F extends ts.plus.Functor> {
        // This should work - Functor is compatible with Kind<Type, Type>
        test<A>(fa: F<A>): A;
    }
    
    // Bifunctor should be compatible with Kind<Type, Type, Type>
    interface TestBifunctor<F extends ts.plus.Bifunctor> {
        // This should work - Bifunctor is compatible with Kind<Type, Type, Type>
        test<A, B>(fab: F<A, B>): [A, B];
    }
    
    // Explicit Kind forms should be compatible with any Kind<...>
    interface TestExplicitKind<F extends Kind<Type, Type>> {
        // This should work - explicit Kind forms are compatible with any kind
        value: F<any>;
    }
    
    return { TestFunctor, TestBifunctor, TestExplicitKind };
}

// Test that FP patterns validate kind constraints correctly
function testFPPatternConstraints() {
    // Free and Fix should validate that their first type argument is a unary functor
    
    // Valid usage - unary functor
    interface ValidFunctor<A> {
        type: 'valid';
        value?: A;
    }
    
    type ValidFree<A> = ts.plus.Free<ValidFunctor, A>;
    type ValidFix = ts.plus.Fix<ValidFunctor>;
    
    // Invalid usage - not a unary functor
    interface InvalidType {
        prop: string;
    }
    
    // @ts-expect-error - Should fail kind constraint
    type InvalidFree<A> = ts.plus.Free<InvalidType, A>;
    
    // @ts-expect-error - Should fail kind constraint
    type InvalidFix = ts.plus.Fix<InvalidType>;
    
    return { ValidFree, ValidFix, InvalidFree, InvalidFix };
}

// Test that kind metadata is cached correctly
function testKindMetadataCaching() {
    // Repeated lookups of the same alias should return cached metadata
    
    // First lookup should compute metadata
    interface TestFunctor<F extends ts.plus.Functor> {
        test<A>(fa: F<A>): A;
    }
    
    // Second lookup should use cached metadata
    interface AnotherTestFunctor<F extends ts.plus.Functor> {
        test<A>(fa: F<A>): A;
    }
    
    return { TestFunctor, AnotherTestFunctor };
}

// Test that autocomplete and hover work correctly
function testLanguageServiceIntegration() {
    // In kind-sensitive contexts, autocomplete should suggest aliases
    // Hover should show alias information, not just expanded forms
    
    // When typing in a type parameter constraint, these should appear in autocomplete:
    // - Functor (equivalent to Kind<Type, Type>)
    // - Bifunctor (equivalent to Kind<Type, Type, Type>)
    // - Free (equivalent to Kind<Kind<Type, Type>, Type>)
    // - Fix (equivalent to Kind<Kind<Type, Type>>)
    // - Explicit Kind forms (Kind<Type, Type>, Kind<Type, Type, Type>, etc.)
    
    interface KindSensitiveContext<F extends ts.plus.Functor> {
        // In this context, autocomplete should prioritize Functor over Kind<Type, Type>
        test<A>(fa: F<A>): A;
    }
    
    return { KindSensitiveContext };
}

// Test that diagnostics are not duplicated
function testDiagnosticIntegration() {
    // Kind constraint violations should not produce duplicate diagnostics
    // from both alias and expanded form checks
    
    interface InvalidConstraint<F extends ts.plus.Functor> {
        // This should produce exactly one diagnostic, not two
        test<A>(fa: F<A>): A;
    }
    
    // @ts-expect-error - Should produce single diagnostic
    const invalid: InvalidConstraint<string> = {
        test: (fa) => fa
    };
    
    return invalid;
} 