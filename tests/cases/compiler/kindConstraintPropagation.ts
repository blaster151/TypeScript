// Test file for kind constraint propagation
// This demonstrates various scenarios where kind constraints should be enforced

// Test 1: Basic kind constraint enforcement
function testBasicConstraint<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    return fa; // Should enforce that F is Kind<Type, Type>
}

// Test 2: Constraint violation - wrong arity
function testArityViolation<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // This should fail if F is instantiated with a type constructor of wrong arity
    return fa;
}

// Test 3: Constraint violation - wrong parameter kinds
function testParameterKindViolation<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // This should fail if F is instantiated with a type constructor with wrong parameter kinds
    return fa;
}

// Test 4: Dependent type parameters
function testDependentConstraints<F extends Kind<Type, Type>, G extends F, A>(fa: G<A>): A {
    // G should inherit F's constraint
    return fa;
}

// Test 5: Higher-order kind constraints
function testHigherOrderConstraint<H extends Kind<Kind<Type>, Type>, A>(ha: H<A>): A {
    // H should be constrained to Kind<Kind<Type>, Type>
    return ha;
}

// Test 6: Generic instantiation with constraints
class ConstrainedContainer<F extends Kind<Type, Type>> {
    constructor(private factory: F) {}
    
    create<A>(value: A): F<A> {
        return this.factory; // Should enforce F constraint
    }
}

// Test 7: Contextual type resolution with constraints
function testContextualResolution<F extends Kind<Type, Type>>(factory: F) {
    // The factory should be constrained to Kind<Type, Type>
    return factory;
}

// Test 8: Multiple constraints
function testMultipleConstraints<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>,
    A, B
>(fa: F<A>, gb: G<A, B>): [F<A>, G<A, B>] {
    // Both F and G should have their respective constraints enforced
    return [fa, gb];
}

// Test 9: Constraint propagation in nested generics
function testNestedConstraints<F extends Kind<Type, Type>>() {
    return function<G extends F, A>(ga: G<A>): A {
        // G should inherit F's constraint
        return ga;
    };
}

// Test 10: Constraint violation at call site
function testCallSiteViolation() {
    // These should all fail due to constraint violations
    testBasicConstraint<Array, number>([1, 2, 3]); // Array is not Kind<Type, Type>
    testArityViolation<Array, number>([1, 2, 3]); // Array has wrong arity
    testParameterKindViolation<Array, number>([1, 2, 3]); // Array has wrong parameter kinds
}

// Example usage that should work:
// testBasicConstraint<Identity, number>(1); // If Identity is Kind<Type, Type>
// testBasicConstraint<Option, number>(Some(1)); // If Option is Kind<Type, Type>

// Example usage that should fail:
// testBasicConstraint<Array, number>([1, 2, 3]); // Array is not Kind<Type, Type>
// testBasicConstraint<Map, number>(new Map()); // Map is Kind<Type, Type, Type> (wrong arity) 