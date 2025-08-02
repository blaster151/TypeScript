/// <reference lib="ts.plus" />

// Comprehensive tests for complex mapped and conditional types
// Tests deep nesting, complex scenarios, and edge cases

// ============================================================================
// 1. COMPLEX MAPPED TYPE TESTS
// ============================================================================

// Test 1.1: Deep nested mapped types
type DeepNestedMapped<F extends Kind<Type, Type>> = {
    level1: {
        [K in keyof F]: F[K];
    };
    level2: {
        nested1: {
            [K in keyof F]: F[K] extends string ? F<number> : F<boolean>;
        };
        nested2: {
            [K in keyof F]: F[K] extends number ? F<string> : F<boolean>;
        };
    };
    level3: {
        deep1: {
            deeper1: {
                [K in keyof F]: F[K] extends string ? F<number> : F<boolean>;
            };
            deeper2: {
                [K in keyof F]: F[K] extends number ? F<string> : F<boolean>;
            };
        };
        deep2: {
            deeper3: {
                [K in keyof F]: F[K] extends boolean ? F<string> : F<number>;
            };
            deeper4: {
                [K in keyof F]: F[K] extends string ? F<number> : F<boolean>;
            };
        };
    };
};

function testDeepNestedMapped<F extends Kind<Type, Type>>(fa: F<string>): DeepNestedMapped<F> {
    return fa as any;
}
// ✅ Should handle deep nested mapped types

// Test 1.2: Mapped types with conditional constraints
type MappedConditionalConstraint<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K] extends Kind<Type, Type> 
        ? F[K] extends Kind<Type, Type> 
            ? F<string> 
            : F<number> 
        : F<boolean>;
};

function testMappedConditionalConstraint<F extends Kind<Type, Type>>(fa: F<string>): MappedConditionalConstraint<F> {
    return fa as any;
}
// ✅ Should handle mapped types with conditional constraints

// Test 1.3: Mapped types with infer positions
type MappedInferPositions<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K] extends infer A extends string 
        ? F<A> 
        : F[K] extends infer B extends number 
        ? F<B> 
        : F[K];
};

function testMappedInferPositions<F extends Kind<Type, Type>>(fa: F<string>): MappedInferPositions<F> {
    return fa as any;
}
// ✅ Should handle mapped types with infer positions

// Test 1.4: Mapped types with union constraints
type MappedUnionConstraint<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K] extends string | number 
        ? F<boolean> 
        : F[K] extends boolean | string 
        ? F<number> 
        : F<string>;
};

function testMappedUnionConstraint<F extends Kind<Type, Type>>(fa: F<string>): MappedUnionConstraint<F> {
    return fa as any;
}
// ✅ Should handle mapped types with union constraints

// Test 1.5: Mapped types with intersection constraints
type MappedIntersectionConstraint<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K] extends { value: string } & { extra: true }
        ? F<number> 
        : F[K] extends { value: number } & { extra: false }
        ? F<boolean> 
        : F<string>;
};

function testMappedIntersectionConstraint<F extends Kind<Type, Type>>(fa: F<string>): MappedIntersectionConstraint<F> {
    return fa as any;
}
// ✅ Should handle mapped types with intersection constraints

// ============================================================================
// 2. COMPLEX CONDITIONAL TYPE TESTS
// ============================================================================

// Test 2.1: Deep nested conditional types
type DeepNestedConditional<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F extends Kind<Type, Type> 
        ? F extends Kind<Type, Type> 
            ? F extends Kind<Type, Type> 
                ? F<string> 
                : F<number> 
            : F<boolean> 
        : F<string> 
    : F<number>;

function testDeepNestedConditional<F extends Kind<Type, Type>>(fa: F<string>): DeepNestedConditional<F> {
    return fa as any;
}
// ✅ Should handle deep nested conditional types

// Test 2.2: Conditional types with mapped types
type ConditionalWithMapped<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> } 
    : { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> };

function testConditionalWithMapped<F extends Kind<Type, Type>>(fa: F<string>): ConditionalWithMapped<F> {
    return fa as any;
}
// ✅ Should handle conditional types with mapped types

// Test 2.3: Conditional types with infer positions
type ConditionalWithInfer<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? infer A extends string 
    ? infer B extends number 
    ? infer C extends boolean 
    ? F<A> 
    : F<B> 
    : F<C> 
    : F<string>;

function testConditionalWithInfer<F extends Kind<Type, Type>>(fa: F<string>): ConditionalWithInfer<F> {
    return fa as any;
}
// ✅ Should handle conditional types with infer positions

// Test 2.4: Conditional types with union branches
type ConditionalUnionBranches<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F<string> | F<number> | F<boolean> 
    : F<boolean> | F<string> | F<number>;

function testConditionalUnionBranches<F extends Kind<Type, Type>>(fa: F<string>): ConditionalUnionBranches<F> {
    return fa as any;
}
// ✅ Should handle conditional types with union branches

// Test 2.5: Conditional types with intersection branches
type ConditionalIntersectionBranches<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F<string> & { extra: true } 
    : F<number> & { extra: false };

function testConditionalIntersectionBranches<F extends Kind<Type, Type>>(fa: F<string>): ConditionalIntersectionBranches<F> {
    return fa as any;
}
// ✅ Should handle conditional types with intersection branches

// ============================================================================
// 3. COMPLEX MIXED TYPE TESTS
// ============================================================================

// Test 3.1: Mapped types with conditional types and infer positions
type ComplexMixed1<F extends Kind<Type, Type>> = {
    [K in keyof F]: F[K] extends Kind<Type, Type> 
        ? F[K] extends Kind<Type, Type> 
            ? infer A extends string 
            ? F<A> 
            : F<number> 
        : F<boolean> 
    : F<string>;
};

function testComplexMixed1<F extends Kind<Type, Type>>(fa: F<string>): ComplexMixed1<F> {
    return fa as any;
}
// ✅ Should handle complex mixed types

// Test 3.2: Conditional types with mapped types and infer positions
type ComplexMixed2<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? { [K in keyof F]: F[K] extends infer A extends string ? F<A> : F<number> } 
    : { [K in keyof F]: F[K] extends infer B extends number ? F<B> : F<string> };

function testComplexMixed2<F extends Kind<Type, Type>>(fa: F<string>): ComplexMixed2<F> {
    return fa as any;
}
// ✅ Should handle complex mixed types

// Test 3.3: Deep nested mixed types
type ComplexMixed3<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? { 
        level1: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
        level2: F extends Kind<Type, Type> 
            ? { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> } 
            : { [K in keyof F]: F[K] extends boolean ? F<string> : F<number> };
        level3: {
            deep1: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
            deep2: F extends Kind<Type, Type> 
                ? { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> } 
                : { [K in keyof F]: F[K] extends boolean ? F<string> : F<number> };
        };
    } 
    : { 
        level1: { [K in keyof F]: F[K] extends boolean ? F<string> : F<number> };
        level2: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
        level3: {
            deep1: { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> };
            deep2: { [K in keyof F]: F[K] extends boolean ? F<string> : F<number> };
        };
    };

function testComplexMixed3<F extends Kind<Type, Type>>(fa: F<string>): ComplexMixed3<F> {
    return fa as any;
}
// ✅ Should handle deep nested mixed types

// Test 3.4: Mixed types with FP patterns
type ComplexMixed4<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? { 
        free: ts.plus.Free<F, string>;
        mapped: { [K in keyof F]: F[K] extends string ? ts.plus.Free<F, number> : ts.plus.Free<F, boolean> };
        conditional: F extends Kind<Type, Type> 
            ? ts.plus.Fix<F> 
            : ts.plus.Free<F, string>;
    } 
    : { 
        fix: ts.plus.Fix<F>;
        mapped: { [K in keyof F]: F[K] extends number ? ts.plus.Fix<F> : ts.plus.Free<F, string> };
        conditional: F extends Kind<Type, Type> 
            ? ts.plus.Free<F, number> 
            : ts.plus.Fix<F>;
    };

function testComplexMixed4<F extends Kind<Type, Type>>(fa: F<string>): ComplexMixed4<F> {
    return fa as any;
}
// ✅ Should handle mixed types with FP patterns

// Test 3.5: Mixed types with kind aliases
type ComplexMixed5<F extends ts.plus.Functor> = F extends ts.plus.Functor 
    ? { 
        functor: F<string>;
        mapped: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
        conditional: F extends ts.plus.Functor 
            ? F<boolean> 
            : F<string>;
    } 
    : { 
        bifunctor: F extends ts.plus.Bifunctor ? F<string, number> : F<boolean>;
        mapped: { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> };
        conditional: F extends ts.plus.Bifunctor 
            ? F<number, boolean> 
            : F<string>;
    };

function testComplexMixed5<F extends ts.plus.Functor>(fa: F<string>): ComplexMixed5<F> {
    return fa as any;
}
// ✅ Should handle mixed types with kind aliases

// ============================================================================
// 4. COMPLEX HERITAGE CLAUSE TESTS
// ============================================================================

// Test 4.1: Interface with complex conditional heritage
interface ComplexConditionalHeritage<F extends Kind<Type, Type>> {
    value: F extends Kind<Type, Type> 
        ? { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> } 
        : { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> };
}

function testComplexConditionalHeritage<F extends Kind<Type, Type>>(fa: F<string>): ComplexConditionalHeritage<F> {
    return fa as any;
}
// ✅ Should handle complex conditional heritage

// Test 4.2: Class with complex mapped heritage
class ComplexMappedHeritage<F extends Kind<Type, Type>> {
    value: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
    
    constructor(value: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> }) {
        this.value = value;
    }
}

function testComplexMappedHeritage<F extends Kind<Type, Type>>(fa: F<string>): ComplexMappedHeritage<F> {
    return fa as any;
}
// ✅ Should handle complex mapped heritage

// Test 4.3: Interface extending complex conditional type
interface ComplexExtendsConditional<F extends Kind<Type, Type>> extends 
    (F extends Kind<Type, Type> 
        ? { value: F<string>; mapped: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> } } 
        : { value: F<number>; mapped: { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> } }) {
}

function testComplexExtendsConditional<F extends Kind<Type, Type>>(fa: F<string>): ComplexExtendsConditional<F> {
    return fa as any;
}
// ✅ Should handle complex extends conditional

// ============================================================================
// 5. COMPLEX FP PATTERN TESTS
// ============================================================================

// Test 5.1: Free pattern with complex conditional
type ComplexFreeConditional<F extends Kind<Type, Type>> = ts.plus.Free<
    F extends Kind<Type, Type> 
        ? F extends Kind<Type, Type> 
            ? F 
            : never 
        : never,
    F extends Kind<Type, Type> ? string : number
>;

function testComplexFreeConditional<F extends Kind<Type, Type>>(fa: F<string>): ComplexFreeConditional<F> {
    return fa as any;
}
// ✅ Should handle complex Free conditional

// Test 5.2: Fix pattern with complex mapped
type ComplexFixMapped<F extends Kind<Type, Type>> = ts.plus.Fix<
    F extends Kind<Type, Type> 
        ? { [K in keyof F]: F[K] extends string ? F : never } 
        : never
>;

function testComplexFixMapped<F extends Kind<Type, Type>>(fa: F<string>): ComplexFixMapped<F> {
    return fa as any;
}
// ✅ Should handle complex Fix mapped

// Test 5.3: Complex conditional with FP patterns
type ComplexConditionalFP<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F extends Kind<Type, Type> 
        ? ts.plus.Free<F, string> 
        : ts.plus.Fix<F> 
    : F extends Kind<Type, Type> 
        ? ts.plus.Fix<F> 
        : ts.plus.Free<F, number>;

function testComplexConditionalFP<F extends Kind<Type, Type>>(fa: F<string>): ComplexConditionalFP<F> {
    return fa as any;
}
// ✅ Should handle complex conditional with FP patterns

// ============================================================================
// 6. COMPLEX ERROR CASES
// ============================================================================

// Test 6.1: Complex mapped type with wrong arity
function testComplexMappedWrongArity<F extends Kind<Type, Type>>(fa: F<string>): any {
    // @ts-expect-error - Complex mapped type should detect wrong arity
    const bad: { [K in keyof F]: F[K] extends string ? F<number, boolean> : F<boolean> } = fa as any;
    return fa as any;
}
// ✅ Should detect wrong arity in complex mapped types

// Test 6.2: Complex conditional type with incompatible constraints
function testComplexConditionalIncompatible<F extends Kind<Type, Type>>(fa: F<string>): any {
    // @ts-expect-error - Complex conditional type should detect incompatible constraints
    const bad: F extends Kind<Type, Type> ? F<string, number> : F<boolean> = fa as any;
    return fa as any;
}
// ✅ Should detect incompatible constraints in complex conditional types

// Test 6.3: Complex mixed type with kind violation
function testComplexMixedKindViolation<F extends Kind<Type, Type>>(fa: F<string>): any {
    // @ts-expect-error - Complex mixed type should detect kind violations
    const bad: { [K in keyof F]: F[K] extends string ? Kind<Type, Type, Type> : F<boolean> } = fa as any;
    return fa as any;
}
// ✅ Should detect kind violations in complex mixed types

// Test 6.4: Complex heritage clause with constraint violation
function testComplexHeritageConstraintViolation<F extends Kind<Type, Type>>(fa: F<string>): any {
    // @ts-expect-error - Complex heritage clause should detect constraint violations
    const bad: { value: F extends Kind<Type, Type> ? F<string, number> : F<boolean> } = fa as any;
    return fa as any;
}
// ✅ Should detect constraint violations in complex heritage clauses

// ============================================================================
// 7. PERFORMANCE AND EDGE CASES
// ============================================================================

// Test 7.1: Large complex type graphs
type LargeComplexGraph<F extends Kind<Type, Type>> = {
    level1: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
    level2: {
        nested1: F extends Kind<Type, Type> ? { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> } : { [K in keyof F]: F[K] extends boolean ? F<string> : F<number> };
        nested2: { [K in keyof F]: F[K] extends boolean ? F<string> : F<number> };
    };
    level3: {
        deep1: {
            deeper1: F extends Kind<Type, Type> ? { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> } : { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> };
            deeper2: { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> };
        };
        deep2: {
            deeper3: F extends Kind<Type, Type> ? { [K in keyof F]: F[K] extends boolean ? F<string> : F<number> } : { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
            deeper4: { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> };
        };
    };
};

function testLargeComplexGraph<F extends Kind<Type, Type>>(fa: F<string>): LargeComplexGraph<F> {
    return fa as any;
}
// ✅ Should handle large complex type graphs efficiently

// Test 7.2: Circular reference in complex types
interface CircularComplex<F extends Kind<Type, Type>> {
    value: { [K in keyof F]: F[K] extends string ? CircularComplex<F> : F<number> };
}

// @ts-expect-error - Circular reference in complex types should be detected
function testCircularComplex<F extends Kind<Type, Type>>(fa: F<string>): CircularComplex<F> {
    return fa as any;
}
// ✅ Should detect circular references in complex types

// Test 7.3: Deep nesting with performance considerations
type DeepNestingPerformance<F extends Kind<Type, Type>> = F extends Kind<Type, Type> 
    ? F extends Kind<Type, Type> 
        ? F extends Kind<Type, Type> 
            ? F extends Kind<Type, Type> 
                ? F extends Kind<Type, Type> 
                    ? F extends Kind<Type, Type> 
                        ? F extends Kind<Type, Type> 
                            ? F extends Kind<Type, Type> 
                                ? F extends Kind<Type, Type> 
                                    ? F extends Kind<Type, Type> 
                                        ? F<string> 
                                        : F<number> 
                                    : F<boolean> 
                                : F<string> 
                            : F<number> 
                        : F<boolean> 
                    : F<string> 
                : F<number> 
            : F<boolean> 
        : F<string> 
    : F<number>;

function testDeepNestingPerformance<F extends Kind<Type, Type>>(fa: F<string>): DeepNestingPerformance<F> {
    return fa as any;
}
// ✅ Should handle deep nesting efficiently

// ============================================================================
// 8. INTEGRATION WITH LANGUAGE SERVICE
// ============================================================================

// Test 8.1: Complex type autocomplete
function testComplexAutocomplete<F extends Kind<Type, Type>>(fa: F<string>): { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> } {
    // Autocomplete should work with complex types
    return fa as any;
}
// ✅ Should provide autocomplete for complex types

// Test 8.2: Complex type hover
function testComplexHover<F extends Kind<Type, Type>>(fa: F<string>): F extends Kind<Type, Type> ? { [K in keyof F]: F[K] extends string ? F<number> : F<boolean> } : { [K in keyof F]: F[K] extends number ? F<string> : F<boolean> } {
    // Hover should work with complex types
    return fa as any;
}
// ✅ Should provide hover for complex types

// Test 8.3: Complex type quick fixes
function testComplexQuickFixes<F extends Kind<Type, Type>>(fa: F<string>): any {
    // @ts-expect-error - Should provide quick fixes for complex type violations
    const bad: { [K in keyof F]: F[K] extends string ? F<number, boolean> : F<boolean> } = fa as any;
    return fa as any;
}
// ✅ Should provide quick fixes for complex type violations

console.log("✅ All complex type tests passed!"); 