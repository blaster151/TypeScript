// Test file for configurable partial application support
// This demonstrates how the -allowPartialTypeConstructorApplication flag controls behavior

// Test 1: Default behavior (partial application disallowed)
function testDefaultBehavior<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // With default configuration (allowPartialApplication: false):
    // Partial applications should be disallowed for strict enforcement
    return fa;
}

// Test 2: Allowed behavior (when flag is enabled)
function testAllowedBehavior<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // With -allowPartialTypeConstructorApplication flag:
    // Partial applications should be allowed for greater flexibility
    return fa;
}

// Test 3: Higher-order partial application (disallowed by default)
function testHigherOrderBehavior<F extends Kind<Kind<Type>, Type>, A>(fa: F<A>): A {
    // Higher-order partial applications are disallowed by default
    // Even if basic partial application is allowed
    return fa;
}

// Test 4: Warning behavior
function testWarningBehavior<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // When partial application is allowed but warnOnPartialApplication is true:
    // Should emit warnings for partial applications
    return fa;
}

// Test 5: Suggestion behavior
function testSuggestionBehavior<F extends Kind<Type, Type>, A>(fa: F<A>): A {
    // When suggestAlternatives is true:
    // Should provide suggestions for fixing partial application issues
    return fa;
}

// Example configuration scenarios:

// Scenario 1: Default configuration (strict enforcement)
// Compiler options: {}
// Result: Partial applications disallowed, easier tooling, predictable behavior
// testDefaultBehavior<TripleConstructor<string>, number>([1, 2, 3]); // Error

// Scenario 2: Allow partial application
// Compiler options: { allowPartialTypeConstructorApplication: true }
// Result: Partial applications allowed, greater flexibility, Haskell/Scala style
// testAllowedBehavior<TripleConstructor<string>, number>([1, 2, 3]); // Allowed

// Scenario 3: Allow with warnings
// Compiler options: { 
//   allowPartialTypeConstructorApplication: true,
//   warnOnPartialTypeConstructorApplication: true 
// }
// Result: Partial applications allowed but with warnings
// testWarningBehavior<TripleConstructor<string>, number>([1, 2, 3]); // Warning

// Scenario 4: Allow with suggestions
// Compiler options: { 
//   allowPartialTypeConstructorApplication: true,
//   suggestPartialApplicationAlternatives: true 
// }
// Result: Partial applications allowed with helpful suggestions
// testSuggestionBehavior<TripleConstructor<string>, number>([1, 2, 3]); // Suggestions

// Scenario 5: Higher-order partial application
// Compiler options: { 
//   allowPartialTypeConstructorApplication: true,
//   allowHigherOrderPartialApplication: false 
// }
// Result: Basic partial applications allowed, higher-order disallowed
// testHigherOrderBehavior<HigherOrderConstructor<Array, string>, number>([1, 2, 3]); // Error

// Benefits demonstration:

// Benefits of allowing partial application:
// 1. Greater flexibility in type constructor usage
// 2. Closer to Haskell/Scala style higher-kinded type usage
// 3. Support for currying-style type constructors
// 4. More expressive type-level programming

// Benefits of disallowing partial application:
// 1. Easier tooling and autocomplete
// 2. Reduced risk of unexpected inference
// 3. Simpler kind arity enforcement
// 4. More predictable type checking behavior

// Configuration examples:

// For strict TypeScript projects:
// {
//   "compilerOptions": {
//     // Default behavior - no partial applications
//   }
// }

// For functional programming projects:
// {
//   "compilerOptions": {
//     "allowPartialTypeConstructorApplication": true,
//     "warnOnPartialTypeConstructorApplication": true,
//     "suggestPartialApplicationAlternatives": true
//   }
// }

// For advanced type-level programming:
// {
//   "compilerOptions": {
//     "allowPartialTypeConstructorApplication": true,
//     "allowHigherOrderPartialApplication": true,
//     "warnOnPartialTypeConstructorApplication": false
//   }
// } 