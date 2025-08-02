/**
 * Test file for Kind variance rules, partial application, and nested mismatch issues
 * 
 * This file demonstrates:
 * 1. Variance rules that are currently ignored in kind comparison
 * 2. Partial application detection for partially applied kinds
 * 3. Deep nested kind mismatches that produce unreadable diagnostic messages
 */

// Test 1: Variance rules - currently ignored
// These should be checked for variance compatibility

// Covariant type constructor
type CovariantFunctor<+T> = Kind<T, Type>; // +T indicates covariance

// Contravariant type constructor
type ContravariantFunctor<-T> = Kind<T, Type>; // -T indicates contravariance

// Invariant type constructor
type InvariantFunctor<T> = Kind<T, Type>; // No annotation = invariant

// Test variance compatibility
type VarianceTest1 = CovariantFunctor<Type>; // Should be compatible
type VarianceTest2 = ContravariantFunctor<Type>; // Should be compatible
type VarianceTest3 = InvariantFunctor<Type>; // Should be compatible

// These should cause variance errors:
// type VarianceError1 = CovariantFunctor<ContravariantFunctor<Type>>; // Covariant cannot accept contravariant
// type VarianceError2 = ContravariantFunctor<CovariantFunctor<Type>>; // Contravariant cannot accept covariant

// Test 2: Partial application detection
// These should be detected as partial applications

// Full application
type FullApplication = Kind<Type, Type, Type>; // All 3 parameters provided

// Partial application (should be detected)
type PartialApplication1 = Kind<Type>; // Only 1 of 3 parameters provided
type PartialApplication2 = Kind<Type, Type>; // Only 2 of 3 parameters provided

// Higher-order partial application
type HigherOrderPartial1 = Kind<Kind<Type, Type>>; // Kind constructor applied to Kind
type HigherOrderPartial2 = Kind<Kind<Type, Type, Type>>; // Kind constructor applied to Kind

// Test 3: Deep nested kind mismatches
// These produce unreadable diagnostic messages without truncation

// Deep nested kind structure
type DeepNestedKind1 = Kind<
    Kind<
        Kind<
            Kind<
                Kind<
                    Kind<
                        Kind<
                            Kind<
                                Kind<
                                    Kind<Type, Type, Type, Type, Type, Type, Type, Type, Type, Type>,
                                    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                                >,
                                Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                            >,
                            Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                        >,
                        Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                    >,
                    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                >,
                Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
            >,
            Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
        >,
        Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
    >,
    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
>;

// Complex nested kind with variance annotations
type ComplexNestedKind = Kind<
    CovariantFunctor<
        ContravariantFunctor<
            InvariantFunctor<
                Kind<
                    Kind<
                        Kind<Type, Type, Type, Type, Type, Type, Type, Type, Type, Type>,
                        Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                    >,
                    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                >
            >
        >
    >,
    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
>;

// Test 4: Variance in function signatures
// These should check variance compatibility

function varianceInFunctionSignature<+T, -U, V>(
    covariantParam: CovariantFunctor<T>,
    contravariantParam: ContravariantFunctor<U>,
    invariantParam: InvariantFunctor<V>
): Kind<T, U, V> {
    return {} as any;
}

// Test 5: Variance in class definitions
// These should check variance compatibility

class VarianceInClassDefinition<+T, -U, V> {
    constructor(
        private covariantProp: CovariantFunctor<T>,
        private contravariantProp: ContravariantFunctor<U>,
        private invariantProp: InvariantFunctor<V>
    ) {}
    
    method<+A, -B, C>(
        covariantArg: CovariantFunctor<A>,
        contravariantArg: ContravariantFunctor<B>,
        invariantArg: InvariantFunctor<C>
    ): Kind<A, B, C> {
        return {} as any;
    }
}

// Test 6: Variance in interface definitions
// These should check variance compatibility

interface VarianceInInterface<+T, -U, V> {
    covariantProp: CovariantFunctor<T>;
    contravariantProp: ContravariantFunctor<U>;
    invariantProp: InvariantFunctor<V>;
    
    method<+A, -B, C>(
        covariantArg: CovariantFunctor<A>,
        contravariantArg: ContravariantFunctor<B>,
        invariantArg: InvariantFunctor<C>
    ): Kind<A, B, C>;
}

// Test 7: Partial application in complex scenarios
// These should be detected and validated

type PartialApplicationComplex1 = Kind<
    Kind<Type, Type>, // Partial application of Kind<Type, Type>
    Type
>;

type PartialApplicationComplex2 = Kind<
    CovariantFunctor<Type>, // Partial application with variance
    Type
>;

type PartialApplicationComplex3 = Kind<
    Kind<Kind<Type, Type>, Type>, // Nested partial applications
    Type
>;

// Test 8: Variance compatibility in conditional types
// These should check variance compatibility

type VarianceConditional<T> = T extends CovariantFunctor<infer U>
    ? Kind<U, Type> // Should check variance compatibility
    : never;

type VarianceConditionalComplex<T> = T extends Kind<infer A, infer B>
    ? A extends CovariantFunctor<infer C>
        ? B extends ContravariantFunctor<infer D>
            ? Kind<C, D> // Should check variance compatibility
            : never
        : never
    : never;

// Test 9: Variance in mapped types
// These should check variance compatibility

type VarianceMapped<T extends Record<string, Kind<any, any>>> = {
    [K in keyof T]: T[K] extends Kind<infer A, infer B>
        ? A extends CovariantFunctor<infer C>
            ? Kind<C, B> // Should check variance compatibility
            : T[K]
        : T[K];
};

// Test 10: Variance in template literal types
// These should check variance compatibility

type VarianceTemplate<T extends string> = T extends `Covariant<${infer U}>`
    ? CovariantFunctor<U extends "Type" ? Type : never>
    : T extends `Contravariant<${infer U}>`
    ? ContravariantFunctor<U extends "Type" ? Type : never>
    : never;

// Test 11: Deep nested variance mismatches
// These should produce readable error messages

type DeepNestedVarianceMismatch = Kind<
    Kind<
        Kind<
            Kind<
                Kind<
                    Kind<
                        Kind<
                            Kind<
                                Kind<
                                    Kind<CovariantFunctor<Type>, ContravariantFunctor<Type>, Type, Type, Type, Type, Type, Type, Type, Type>,
                                    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                                >,
                                Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                            >,
                            Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                        >,
                        Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                    >,
                    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
                >,
                Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
            >,
            Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
        >,
        Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
    >,
    Type, Type, Type, Type, Type, Type, Type, Type, Type, Type
>;

// Test 12: Partial application with variance
// These should detect partial application and check variance

type PartialApplicationWithVariance1 = CovariantFunctor<Type>; // Partial application of Kind<T, Type>
type PartialApplicationWithVariance2 = ContravariantFunctor<Type>; // Partial application of Kind<T, Type>
type PartialApplicationWithVariance3 = InvariantFunctor<Type>; // Partial application of Kind<T, Type>

// Test 13: Higher-order partial application with variance
// These should detect higher-order partial application and check variance

type HigherOrderPartialWithVariance1 = Kind<CovariantFunctor<Type>>; // Higher-order with variance
type HigherOrderPartialWithVariance2 = Kind<ContravariantFunctor<Type>>; // Higher-order with variance
type HigherOrderPartialWithVariance3 = Kind<InvariantFunctor<Type>>; // Higher-order with variance

// Test 14: Complex variance scenarios
// These should test complex variance compatibility rules

type ComplexVarianceScenario1 = Kind<
    CovariantFunctor<ContravariantFunctor<Type>>, // Covariant of contravariant
    Type
>;

type ComplexVarianceScenario2 = Kind<
    ContravariantFunctor<CovariantFunctor<Type>>, // Contravariant of covariant
    Type
>;

type ComplexVarianceScenario3 = Kind<
    InvariantFunctor<CovariantFunctor<Type>>, // Invariant of covariant
    Type
>;

// Test 15: Variance in recursive types
// These should check variance compatibility in recursive contexts

type RecursiveVariance<T> = T extends CovariantFunctor<infer U>
    ? RecursiveVariance<U> // Should check variance compatibility
    : T;

type RecursiveVarianceComplex<T> = T extends Kind<infer A, infer B>
    ? A extends CovariantFunctor<infer C>
        ? B extends ContravariantFunctor<infer D>
            ? RecursiveVarianceComplex<Kind<C, D>> // Should check variance compatibility
            : T
        : T
    : T;

console.log("✅ Kind variance and correctness tests completed!"); 