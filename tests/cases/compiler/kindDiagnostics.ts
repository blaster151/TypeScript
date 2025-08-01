// Test file for kind diagnostics
// This demonstrates various kind-related error scenarios

// Test 1: Arity mismatch
type ArityMismatchTest<T extends Kind<Type>> = T; // Error: Expected type constructor with 1 parameters, but got 0.

// Test 2: Parameter kind mismatch
type ParameterMismatchTest<T extends Kind<Type, Type>> = T; // Error: Expected kind parameter 1 to be 'Type', but got 'Kind<Type>'.

// Test 3: Variance mismatch
type VarianceMismatchTest<+T extends Kind<Type>> = T; // Error: Type parameter T is covariant, but expected invariant.

// Test 4: Kind alias mismatch
type MyKind = Kind<Type>;
type AliasMismatchTest<T extends MyKind> = T; // Error: Kind alias 'MyKind' cannot be resolved to a compatible kind.

// Test 5: Multiple errors
type MultipleErrorsTest<
    T1 extends Kind<Type>,           // Should be Kind<Type, Type>
    T2 extends Kind<Type, Type, Type> // Should be Kind<Type, Type>
> = [T1, T2];

// Test 6: Nested kind errors
type NestedKindTest<T extends Kind<Kind<Type>>> = T;

// Test 7: Variance suggestions
type VarianceSuggestionsTest<
    T extends Kind<Type> // Suggestion: Consider using + variance annotation for parameter 'T'
> = T;

// Test 8: Arity suggestions
type AritySuggestionsTest<
    T extends Kind<Type, Type> // Suggestion: Consider adding 1 type parameter(s) to match expected arity
> = T;

// Test 9: Complex constraint
type ComplexConstraintTest<
    F extends Kind<Type, Type>,
    G extends Kind<Type>
> = F extends Kind<Type, Type> ? G extends Kind<Type> ? true : false : false;

// Test 10: Higher-order kind
type HigherOrderKindTest<
    H extends Kind<Kind<Type>, Type>
> = H; 