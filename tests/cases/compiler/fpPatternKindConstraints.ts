// @target: es2020
// @lib: es2020,dom
// @strict: true

/// <reference lib="ts.plus" />

// Test valid usage of Free and Fix patterns
function testValidFreeUsage() {
    // Define a valid unary functor
    interface OptionF<A> {
        type: 'some' | 'none';
        value?: A;
    }

    // This should work - OptionF is a unary functor
    type OptionFree<A> = ts.plus.Free<OptionF, A>;
    
    // Usage example
    const someValue: OptionFree<string> = { type: 'some', value: 'hello' };
    const noneValue: OptionFree<string> = { type: 'none' };
    
    return { someValue, noneValue };
}

function testValidFixUsage() {
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

// Test invalid usage that should emit diagnostics
function testInvalidFreeUsage() {
    // Define an invalid type (not a unary functor)
    interface InvalidType {
        prop: string;
    }

    // This should emit a diagnostic - InvalidType is not a unary functor
    // @ts-expect-error - Should fail kind constraint
    type InvalidFree<A> = ts.plus.Free<InvalidType, A>;
}

function testInvalidFixUsage() {
    // Define an invalid type (not a unary functor)
    interface InvalidType {
        prop: string;
    }

    // This should emit a diagnostic - InvalidType is not a unary functor
    // @ts-expect-error - Should fail kind constraint
    type InvalidFix = ts.plus.Fix<InvalidType>;
}

// Test with bifunctor (should fail)
function testBifunctorConstraintViolation() {
    // Define a bifunctor (arity 3, not 2)
    interface EitherF<L, R, A> {
        type: 'left' | 'right';
        leftValue?: L;
        rightValue?: R;
        next?: A;
    }

    // This should emit a diagnostic - EitherF is a bifunctor, not a unary functor
    // @ts-expect-error - Should fail kind constraint
    type InvalidFree<A> = ts.plus.Free<EitherF, A>;
    
    // @ts-expect-error - Should fail kind constraint
    type InvalidFix = ts.plus.Fix<EitherF>;
}

// Test with Generic Kind (should fail)
function testGenericKindConstraintViolation() {
    // Generic Kind doesn't have a specific arity
    // This should emit a diagnostic - Generic Kind doesn't satisfy the unary functor constraint
    
    // @ts-expect-error - Should show constraint violation
    type InvalidFree<A> = ts.plus.Free<Kind<Type, Type, Type>, A>;
    
    // @ts-expect-error - Should show constraint violation
    type InvalidFix = ts.plus.Fix<Kind<Type, Type, Type>>;
}

// Test complex nested usage
function testComplexNestedUsage() {
    // Define a functor for async operations
    interface AsyncF<A> {
        type: 'pending' | 'resolved' | 'rejected';
        value?: A;
        error?: string;
    }

    // This should work - nested Free monads
    type AsyncFree<A> = ts.plus.Free<AsyncF, A>;
    type NestedAsyncFree<A> = ts.plus.Free<AsyncF, AsyncFree<A>>;
    
    // This should work - Free over a Fix
    type AsyncTree = ts.plus.Free<AsyncF, ts.plus.Fix<TreeF>>;
    
    return { AsyncFree, NestedAsyncFree, AsyncTree };
}

// Test that valid usage passes without extra annotations
function testNoExtraAnnotations() {
    // These should work without any additional type annotations
    interface ListF<A> {
        type: 'nil' | 'cons';
        head?: A;
        tail?: A;
    }

    // Should work automatically
    type List = ts.plus.Fix<ListF>;
    type ListFree<A> = ts.plus.Free<ListF, A>;
    
    const list: List = { type: 'nil' };
    const listFree: ListFree<string> = { type: 'cons', head: 'hello', tail: { type: 'nil' } };
    
    return { list, listFree };
} 