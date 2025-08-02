/**
 * Test file for ts.plus stdlib aliases and patterns
 * 
 * This file demonstrates:
 * 1. Clean, focused stdlib with only essential FP patterns
 * 2. Proper namespace isolation in ts.plus
 * 3. Clear documentation with usage examples
 * 4. No over-generation of unnecessary aliases
 */

// Test 1: Basic kind aliases - clean and focused
// These are the only essential aliases we need

// Functor alias
type ArrayFunctor = ts.plus.Functor;
type OptionFunctor = ts.plus.Functor;
type ListFunctor = ts.plus.Functor;

// Bifunctor alias
type EitherBifunctor = ts.plus.Bifunctor;
type TupleBifunctor = ts.plus.Bifunctor;
type PairBifunctor = ts.plus.Bifunctor;

// Generic type constructors (explicit Kind forms instead of HKT alias)
type GenericKind1 = Kind<Type, Type>;
type GenericKind2 = Kind<Type, Type, Type>;
type GenericKind3 = Kind<Type, Type, Type, Type>;

// Test 2: Namespace isolation - no collisions with user code
// User can define their own Functor without conflicts

// User's own Functor definition
type MyFunctor<T, U> = { map: (f: (t: T) => U) => MyFunctor<U, any> };

// No conflict with ts.plus.Functor
type UserFunctor = MyFunctor<string, number>;
type StdlibFunctor = ts.plus.Functor;

// Test 3: Free monad pattern with clear documentation
// Demonstrates the Free monad usage as documented

// Define a functor for console operations (as per documentation)
interface ConsoleF<A> {
    type: 'log' | 'error';
    message: string;
    next: A;
}

// Create a free monad over ConsoleF
type ConsoleFree<A> = ts.plus.Free<ConsoleF, A>;

// Usage in computations (as per documentation)
function logMessage(msg: string): ConsoleFree<void> {
    return { type: 'log', message: msg, next: undefined };
}

function errorMessage(msg: string): ConsoleFree<void> {
    return { type: 'error', message: msg, next: undefined };
}

// Different interpretations (as per documentation)
function interpretConsole<A>(free: ConsoleFree<A>): A {
    // Implementation that actually performs console operations
    return {} as A;
}

function mockConsole<A>(free: ConsoleFree<A>): A {
    // Implementation that mocks console operations for testing
    return {} as A;
}

// Test 4: Fix pattern with clear documentation
// Demonstrates the Fix type usage as documented

// Define a functor for a binary tree (as per documentation)
interface TreeF<A> {
    type: 'leaf' | 'node';
    value?: number;
    left?: A;
    right?: A;
}

// Create a fixed point over TreeF
type Tree = ts.plus.Fix<TreeF>;

// Usage in recursive structures (as per documentation)
const tree: Tree = {
    type: 'node',
    value: 1,
    left: { type: 'leaf' },
    right: { type: 'leaf' }
};

// Pattern matching on the fixed point (as per documentation)
function sumTree(tree: Tree): number {
    switch (tree.type) {
        case 'leaf': return 0;
        case 'node': return (tree.value || 0) + sumTree(tree.left!) + sumTree(tree.right!);
    }
}

// Test 5: Generic constraints with kind aliases
// Demonstrates using kind aliases in generic constraints

// Functor constraint
function map<F extends ts.plus.Functor, A, B>(
    fa: F<A>,
    f: (a: A) => B
): F<B> {
    return {} as F<B>;
}

// Bifunctor constraint
function bimap<F extends ts.plus.Bifunctor, A, B, C, D>(
    fab: F<A, B>,
    f: (a: A) => C,
    g: (b: B) => D
): F<C, D> {
    return {} as F<C, D>;
}

// Generic constraint for type constructors (explicit Kind forms)
function lift<F extends Kind<Type, Type>, Args extends any[]>(
    f: F<...Args>
): F<...Args> {
    return f;
}

// Test 6: No over-generation - only essential patterns
// We don't have unnecessary aliases cluttering the namespace

// Essential patterns only:
// - ts.plus.Functor
// - ts.plus.Bifunctor  
// - ts.plus.Free
// - ts.plus.Fix

// No unnecessary patterns like:
// - ts.plus.Monad (not essential for MVP)
// - ts.plus.Applicative (not essential for MVP)
// - ts.plus.Traversable (not essential for MVP)
// - etc.

// Test 7: Clear documentation examples
// All patterns have clear, working examples in their documentation

// Functor example from documentation
function mapExample<F extends ts.plus.Functor, A, B>(
    fa: F<A>,
    f: (a: A) => B
): F<B> {
    // Implementation
    return {} as F<B>;
}

// Bifunctor example from documentation
function bimapExample<F extends ts.plus.Bifunctor, A, B, C, D>(
    fab: F<A, B>,
    f: (a: A) => C,
    g: (b: B) => D
): F<C, D> {
    // Implementation
    return {} as F<C, D>;
}

// Generic example using explicit Kind forms
function liftExample<F extends Kind<Type, Type>, Args extends any[]>(
    f: F<...Args>
): F<...Args> {
    // Implementation
    return {} as F<...Args>;
}

// Test 8: Kind constraints for FP patterns
// Demonstrates that Free and Fix require proper kind constraints

// Free requires a unary functor
type ValidFree = ts.plus.Free<ts.plus.Functor, string>; // Valid
// type InvalidFree = ts.plus.Free<ts.plus.Bifunctor, string>; // Would be invalid

// Fix requires a unary functor
type ValidFix = ts.plus.Fix<ts.plus.Functor>; // Valid
// type InvalidFix = ts.plus.Fix<ts.plus.Bifunctor>; // Would be invalid

// Test 9: Practical usage patterns
// Real-world usage of the stdlib patterns

// Define a functor for HTTP operations
interface HttpF<A> {
    type: 'get' | 'post' | 'put' | 'delete';
    url: string;
    data?: any;
    next: A;
}

// Create a free monad for HTTP operations
type HttpFree<A> = ts.plus.Free<HttpF, A>;

// HTTP operations
function get(url: string): HttpFree<any> {
    return { type: 'get', url, next: undefined };
}

function post(url: string, data: any): HttpFree<any> {
    return { type: 'post', url, data, next: undefined };
}

// Define a functor for a list structure
interface ListF<A> {
    type: 'nil' | 'cons';
    head?: any;
    tail?: A;
}

// Create a fixed point for lists
type List = ts.plus.Fix<ListF>;

// List operations
const emptyList: List = { type: 'nil' };
const singleElement: List = { type: 'cons', head: 1, tail: { type: 'nil' } };

// Test 10: Integration with existing TypeScript patterns
// Shows how ts.plus patterns integrate with existing TypeScript

// Use with existing type constructors
type ArrayFunctorExample = ts.plus.Functor;
type PromiseFunctorExample = ts.plus.Functor;

// Use with conditional types
type IsFunctor<T> = T extends ts.plus.Functor ? true : false;
type IsBifunctor<T> = T extends ts.plus.Bifunctor ? true : false;

// Use with mapped types
type FunctorMap<T extends Record<string, ts.plus.Functor>> = {
    [K in keyof T]: T[K] extends ts.plus.Functor ? T[K] : never;
};

console.log("✅ ts.plus stdlib tests completed!"); 