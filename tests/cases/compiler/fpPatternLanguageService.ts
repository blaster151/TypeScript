// @target: es2020
// @lib: es2020,dom
// @strict: true

/// <reference lib="ts.plus" />

// Test autocomplete for Free and Fix patterns in kind-sensitive contexts
function testFreeAutocomplete() {
    // When typing in a type parameter constraint, Free should appear in autocomplete
    // if the context expects a unary functor
    
    // Define a valid unary functor
    interface OptionF<A> {
        type: 'some' | 'none';
        value?: A;
    }

    // Free should appear in autocomplete when typing "Fr..." in a unary functor context
    type OptionFree<A> = ts.plus.Free<OptionF, A>;
    
    // Usage example
    const someValue: OptionFree<string> = { type: 'some', value: 'hello' };
    
    return someValue;
}

function testFixAutocomplete() {
    // When typing in a type parameter constraint, Fix should appear in autocomplete
    // if the context expects a unary functor
    
    // Define a valid unary functor for a binary tree
    interface TreeF<A> {
        type: 'leaf' | 'node';
        value?: number;
        left?: A;
        right?: A;
    }

    // Fix should appear in autocomplete when typing "Fi..." in a unary functor context
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

// Test hover information for Free and Fix patterns
function testFreeHover() {
    // Hovering over "Free" should show:
    // - Kind signature: "Kind<Type, Type>"
    // - Description: "Free monad over a functor"
    // - Constraint: "F must be a unary functor (Kind<Type, Type>)"
    
    interface ConsoleF<A> {
        type: 'log' | 'error';
        message: string;
        next: A;
    }
    
    type ConsoleFree<A> = ts.plus.Free<ConsoleF, A>;
    
    return {} as ConsoleFree<void>;
}

function testFixHover() {
    // Hovering over "Fix" should show:
    // - Kind signature: "Kind<Type, Type>"
    // - Description: "Fixed point of a functor"
    // - Constraint: "F must be a unary functor (Kind<Type, Type>)"
    
    interface ListF<A> {
        type: 'nil' | 'cons';
        head?: A;
        tail?: A;
    }
    
    type List = ts.plus.Fix<ListF>;
    
    return {} as List;
}

// Test that FP patterns only appear in appropriate contexts
function testContextualAutocomplete() {
    // Free and Fix should only appear in autocomplete when:
    // 1. In a type parameter constraint that expects a unary functor
    // 2. In a type argument position for Free or Fix
    // 3. In a context where Kind<Type, Type> would be appropriate
    
    // This should NOT show Free/Fix in autocomplete (not a unary functor context)
    interface RegularInterface {
        prop: string;
    }
    
    // This SHOULD show Free/Fix in autocomplete (unary functor context)
    interface FunctorConstraint<F extends ts.plus.Functor> {
        map<A, B>(fa: F<A>, f: (a: A) => B): F<B>;
    }
    
    return { RegularInterface, FunctorConstraint };
}

// Test quick fix suggestions for kind constraint violations
function testQuickFixSuggestions() {
    // When there's a kind constraint violation, the language service should suggest:
    // 1. Replace with appropriate kind alias (e.g., Functor)
    // 2. Replace with the pattern itself if appropriate
    // 3. Show constraint information
    
    // This should trigger quick fix suggestions
    interface InvalidType {
        prop: string;
    }
    
    // @ts-expect-error - Should suggest Functor as a quick fix
    type InvalidFree<A> = ts.plus.Free<InvalidType, A>;
    
    // @ts-expect-error - Should suggest Functor as a quick fix
    type InvalidFix = ts.plus.Fix<InvalidType>;
    
    return { InvalidFree, InvalidFix };
}

// Test that FP patterns are prioritized over raw Kind<...> forms
function testPriorityOrdering() {
    // In autocomplete, FP patterns should appear before raw Kind<...> forms
    // when they're appropriate for the context
    
    // When typing in a unary functor context, the order should be:
    // 1. Functor (highest priority)
    // 2. Free (high priority for FP patterns)
    // 3. Fix (high priority for FP patterns)
    // 4. Generic Kind (medium priority)
    // Should suggest Kind<Type, Type> or Kind<Type, Type, Type> based on context
    
    interface TestConstraint<F extends ts.plus.Functor> {
        // In this context, autocomplete should prioritize Functor, Free, Fix
        test<A>(fa: F<A>): A;
    }
    
    return {} as TestConstraint<any>;
}

// Test documentation links and examples
function testDocumentationIntegration() {
    // Hover and completion details should include:
    // - Links to example documentation
    // - Usage patterns
    // - Constraint information
    
    // Free monad example
    interface StateF<S, A> {
        type: 'get' | 'put' | 'modify';
        state?: S;
        f?: (s: S) => S;
        next?: A;
    }
    
    type StateFree<S, A> = ts.plus.Free<StateF<S>, A>;
    
    // Fix example for recursive structures
    interface ExprF<A> {
        type: 'lit' | 'add' | 'mul';
        value?: number;
        left?: A;
        right?: A;
    }
    
    type Expr = ts.plus.Fix<ExprF>;
    
    return { StateFree, Expr };
} 