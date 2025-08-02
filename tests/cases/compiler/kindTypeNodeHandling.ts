// @target: es2020
// @lib: es2020,dom
// @strict: true

/// <reference lib="ts.plus" />

// Test that KindTypeNode is properly handled in getTypeFromTypeNode
function testKindTypeNodeHandling() {
    // Test 1: KindTypeNode with explicit kind arguments
    type TestKind1 = Kind<Type, Type>; // Should create KindType with arity 2
    
    // Test 2: KindTypeNode with single kind argument
    type TestKind2 = Kind<Type>; // Should create KindType with arity 1
    
    // Test 3: KindTypeNode with multiple kind arguments
    type TestKind3 = Kind<Type, Type, Type>; // Should create KindType with arity 3
    
    // Test 4: KindTypeNode with no kind arguments
    type TestKind4 = Kind<>; // Should create KindType with arity 0
    
    return { TestKind1, TestKind2, TestKind3, TestKind4 };
}

// Test that TypeReferenceNode named "Kind" is handled as KindTypeNode
function testKindTypeReferenceHandling() {
    // Test 1: TypeReferenceNode with "Kind" identifier
    type TestKindRef1 = Kind<Type, Type>; // Should be treated as KindTypeNode
    
    // Test 2: TypeReferenceNode with "Kind" in namespace
    type TestKindRef2 = ts.Kind<Type, Type>; // Should be treated as KindTypeNode if ts.Kind exists
    
    // Test 3: TypeReferenceNode with "Kind" and type arguments
    type TestKindRef3 = Kind<Type>; // Should create KindType with arity 1
    
    return { TestKindRef1, TestKindRef2, TestKindRef3 };
}

// Test that kind metadata is properly attached to symbols
function testKindMetadataAttachment() {
    // Test 1: KindTypeNode should have kind metadata
    type KindWithMetadata = Kind<Type, Type>;
    
    // Test 2: TypeReferenceNode named "Kind" should have kind metadata
    type KindRefWithMetadata = Kind<Type, Type>;
    
    // Test 3: Kind metadata should include arity and parameterKinds
    type KindMetadataTest = Kind<Type, Type, Type>; // Should have arity 3
    
    return { KindWithMetadata, KindRefWithMetadata, KindMetadataTest };
}

// Test that kind inference works when no explicit kind annotation is provided
function testKindInference() {
    // Test 1: Kind inference from context
    interface KindInferenceTest<F extends Kind<Type, Type>> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    // Test 2: Kind inference from usage
    type InferredKind = Kind<Type>; // Should infer arity 1
    
    // Test 3: Kind inference from constraints
    type ConstrainedKind<F extends Kind<Type, Type>> = F; // Should inherit kind constraint
    
    return { KindInferenceTest, InferredKind, ConstrainedKind };
}

// Test that KindType works with built-in kind aliases
function testKindTypeWithAliases() {
    // Test 1: KindType should be compatible with Functor
    type KindFunctorCompatibility = Kind<Type, Type> extends ts.plus.Functor ? true : false;
    
    // Test 2: KindType should be compatible with Bifunctor
    type KindBifunctorCompatibility = Kind<Type, Type, Type> extends ts.plus.Bifunctor ? true : false;
    
    // Test 3: KindType should be compatible with explicit Kind forms
    type KindExplicitKindCompatibility = Kind<Type, Type> extends Kind<Type, Type> ? true : false;
    
    return { KindFunctorCompatibility, KindBifunctorCompatibility, KindExplicitKindCompatibility };
}

// Test that KindType works with FP patterns
function testKindTypeWithFPPatterns() {
    // Test 1: KindType should work with Free
    type KindFreeTest<F extends Kind<Type, Type>, A> = ts.plus.Free<F, A>;
    
    // Test 2: KindType should work with Fix
    type KindFixTest<F extends Kind<Type, Type>> = ts.plus.Fix<F>;
    
    // Test 3: KindType should validate constraints in FP patterns
    type KindConstraintTest<F extends Kind<Type, Type, Type>> = ts.plus.Free<F, any>; // Should fail constraint
    
    return { KindFreeTest, KindFixTest, KindConstraintTest };
}

// Test that KindTypeNode creates proper KindType representation
function testKindTypeRepresentation() {
    // Test 1: KindType should have proper flags
    type KindTypeFlags = Kind<Type, Type>;
    
    // Test 2: KindType should have proper symbol
    type KindTypeSymbol = Kind<Type, Type>;
    
    // Test 3: KindType should have proper metadata
    type KindTypeMetadata = Kind<Type, Type>;
    
    return { KindTypeFlags, KindTypeSymbol, KindTypeMetadata };
}

// Test that KindTypeNode caching works correctly
function testKindTypeCaching() {
    // Test 1: Repeated KindTypeNode should use cached result
    type CachedKind1 = Kind<Type, Type>;
    type CachedKind2 = Kind<Type, Type>; // Should use cached result
    
    // Test 2: Different KindTypeNode should create new result
    type DifferentKind1 = Kind<Type, Type>;
    type DifferentKind2 = Kind<Type, Type, Type>; // Should create new result
    
    // Test 3: KindTypeNode with same arguments should use cached result
    type SameKind1 = Kind<Type>;
    type SameKind2 = Kind<Type>; // Should use cached result
    
    return { CachedKind1, CachedKind2, DifferentKind1, DifferentKind2, SameKind1, SameKind2 };
} 