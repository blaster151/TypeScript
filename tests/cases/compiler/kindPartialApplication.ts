// Test file for kind partial application detection
// This demonstrates various scenarios where higher-arity constructors are partially applied

// Test 1: Basic partial application detection
function testBasicPartialApplication<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // F is constrained to Kind<Type, Type> (arity = 2)
    // If F is Kind<Type, Type, Type> (arity = 3) with 1 argument provided,
    // this should be detected as a partial application
    return fa;
}

// Test 2: Partial application with exact match
function testExactMatch<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // F is constrained to Kind<Type, Type> (arity = 2)
    // If F is Kind<Type, Type> (arity = 2) with 2 arguments provided,
    // this should be an exact match, not a partial application
    return fa;
}

// Test 3: Invalid partial application
function testInvalidPartialApplication<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // F is constrained to Kind<Type, Type> (arity = 2)
    // If F is Kind<Type, Type, Type> (arity = 3) with 2 arguments provided,
    // remaining arity = 1, which doesn't match constraint arity = 2
    // This should be invalid
    return fa;
}

// Test 4: Higher-order partial application
function testHigherOrderPartialApplication<F extends Kind<Kind<Type>, Type>, A>(fa: F<A>): A {
    // F is constrained to Kind<Kind<Type>, Type> (arity = 2)
    // If F is Kind<Kind<Type>, Type, Type> (arity = 3) with 1 argument provided,
    // this should be detected as a partial application
    return fa;
}

// Test 5: Multiple partial applications
function testMultiplePartialApplications<
    F extends Kind<Type, Type>,
    G extends Kind<Type, Type, Type>,
    A, B
>(fa: F<A>, gb: G<A, B>): [F<A>, G<A, B>] {
    // Both F and G could be partially applied
    // F: Kind<Type, Type> constraint, could be partially applied from higher arity
    // G: Kind<Type, Type, Type> constraint, could be partially applied from even higher arity
    return [fa, gb];
}

// Test 6: Partial application with kind validation
function testPartialApplicationKindValidation<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // F is constrained to Kind<Type, Type>
    // If F is Kind<Type, Type, Type> with 1 argument provided,
    // the provided argument should be validated against the expected kind
    return fa;
}

// Test 7: Nested partial applications
function testNestedPartialApplications<F extends Kind<Type, Type>>() {
    return function<G extends F, A>(ga: G<A>): A {
        // G inherits F's constraint
        // Both F and G could be partially applied
        return ga;
    };
}

// Test 8: Partial application in generic constraints
function testPartialApplicationInConstraints<
    F extends Kind<Type, Type, Type>,
    G extends F,
    A
>(ga: G<A>): A {
    // G extends F, where F is Kind<Type, Type, Type>
    // G is constrained to Kind<Type, Type> (inherited from context)
    // This creates a partial application scenario
    return ga;
}

// Test 9: Complex partial application chain
function testComplexPartialApplicationChain<
    F extends Kind<Type, Type, Type, Type>,
    G extends Kind<Type, Type, Type>,
    H extends Kind<Type, Type>,
    A, B, C
>(ha: H<A>, gb: G<A, B>, fc: F<A, B, C>): [H<A>, G<A, B>, F<A, B, C>] {
    // Complex chain where each could be partially applied:
    // F: Kind<Type, Type, Type, Type> → Kind<Type, Type, Type> (1 arg applied)
    // G: Kind<Type, Type, Type> → Kind<Type, Type> (1 arg applied)
    // H: Kind<Type, Type> (exact match)
    return [ha, gb, fc];
}

// Test 10: Partial application with variance
function testPartialApplicationWithVariance<
    F extends Kind<Type, Type>,
    A
>(fa: F<A>): A {
    // F is constrained to Kind<Type, Type>
    // If F is Kind<Type, Type, Type> with variance annotations,
    // the partial application should preserve variance information
    return fa;
}

// Example usage scenarios:

// Scenario 1: Valid partial application
// type TripleConstructor<T, U, V> = [T, U, V]; // Kind<Type, Type, Type> (arity = 3)
// testBasicPartialApplication<TripleConstructor<string>, number>([1, 2, 3]);
// Result: TripleConstructor<string> becomes Kind<Type, Type> (arity = 2) after partial application

// Scenario 2: Invalid partial application
// type TripleConstructor<T, U, V> = [T, U, V]; // Kind<Type, Type, Type> (arity = 3)
// testInvalidPartialApplication<TripleConstructor<string, number>, boolean>([true, false]);
// Result: Error - remaining arity = 1, expected = 2

// Scenario 3: Exact match (not partial application)
// type PairConstructor<T, U> = [T, U]; // Kind<Type, Type> (arity = 2)
// testExactMatch<PairConstructor<string, number>>(["hello", 42]);
// Result: Exact match, no partial application

// Scenario 4: Higher-order partial application
// type HigherOrderConstructor<F extends Kind<Type>, T, U> = F<T> & F<U>; // Kind<Kind<Type>, Type, Type> (arity = 3)
// testHigherOrderPartialApplication<HigherOrderConstructor<Array, string>, number>([1, 2, 3]);
// Result: HigherOrderConstructor<Array, string> becomes Kind<Kind<Type>, Type> (arity = 2) after partial application 