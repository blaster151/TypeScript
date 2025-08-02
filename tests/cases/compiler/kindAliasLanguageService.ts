// @target: es2020
// @lib: es2020,dom
// @strict: true

/// <reference lib="ts.plus" />

// Test that kind aliases are available in autocomplete
function testKindAliasAutocomplete<F extends ts.plus.Functor>() {
    // Should show Functor in autocomplete when typing "Fu..."
    const f: F = {} as any;
    return f;
}

function testBifunctorAutocomplete<F extends ts.plus.Bifunctor>() {
    // Should show Bifunctor in autocomplete when typing "Bi..."
    const f: F = {} as any;
    return f;
}

function testGenericKindAutocomplete<F extends Kind<Type, Type>>() {
    // Should show Kind<Type, Type> in autocomplete when typing "Kin..."
    
    // Test autocomplete for generic kind constraints
    const test: F<any> = {} as any;
    return test;
}

// Test hover documentation for generic kinds
function testGenericKindHover() {
    // Hovering over "Kind<Type, Type>" should show: "type Kind<Type, Type> = ..."
    
    type TestGenericKind = Kind<Type, Type>;
    const test: TestGenericKind = {} as any;
    return test;
}

// Test generic kind constraints
type TestGenericKindConstraint<F extends Kind<Type, Type>> = F<any>;

// Test that kind aliases show correct hover information
// Hovering over "Functor" should show: "type Functor = Kind<Type, Type>"
// Hovering over "Bifunctor" should show: "type Bifunctor = Kind<Type, Type, Type>"
// Hovering over "Kind<Type, Type>" should show: "type Kind<Type, Type> = ..."

// Test that kind aliases are prioritized over raw Kind<...> forms
interface TestInterface<F extends ts.plus.Functor> {
    // Functor should appear before Kind<Type, Type> in autocomplete
    map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
}

interface TestBifunctorInterface<F extends ts.plus.Bifunctor> {
    // Bifunctor should appear before Kind<Type, Type, Type> in autocomplete
    bimap<A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>;
}

// Test that kind aliases work in generic constraints
type TestFunctorConstraint<F extends ts.plus.Functor> = F<string>;
type TestBifunctorConstraint<F extends ts.plus.Bifunctor> = F<string, number>;
type TestGenericKindConstraint<F extends Kind<Type, Type>> = F<any>;

// Test that the language service correctly identifies kind-sensitive contexts
// These should trigger kind alias suggestions in autocomplete:
// - Type parameter constraints
// - Type alias declarations
// - Interface declarations
// - Class declarations 