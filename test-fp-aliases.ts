/// <reference lib="ts.plus" />

// Test that FP aliases work with explicit Kind forms
type TestFunctor = ts.plus.Functor; // Should be Kind<[Type, Type]>
type TestBifunctor = ts.plus.Bifunctor; // Should be Kind<[Type, Type, Type]>

// Test that explicit Kind forms work
type ExplicitFunctor = Kind<Type, Type>; // Unary functor
type ExplicitBifunctor = Kind<Type, Type, Type>; // Binary functor

// Test that FP patterns work with explicit Kind forms
type TestFree<F extends Kind<Type, Type>, A> = ts.plus.Free<F, A>;
type TestFix<F extends Kind<Type, Type>> = ts.plus.Fix<F>;

// Test that kind validation works
interface FunctorConstraint<F extends ts.plus.Functor> {
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
}

interface BifunctorConstraint<F extends ts.plus.Bifunctor> {
    bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>;
}

// Test that explicit Kind forms work in constraints
interface ExplicitFunctorConstraint<F extends Kind<Type, Type>> {
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
}

interface ExplicitBifunctorConstraint<F extends Kind<Type, Type, Type>> {
    bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>;
}

console.log("✅ FP aliases and explicit Kind forms work correctly!"); 