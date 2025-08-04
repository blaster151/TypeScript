// Test file for Higher-Kinded Types (HKT) system
// This demonstrates the core functionality of the HKT implementation

// ============================================================================
// Simplified HKT Type Definitions
// ============================================================================

// Define basic type constructors
type Maybe<A> = { tag: 'Just'; value: A } | { tag: 'Nothing' };
type Either<L, R> = { tag: 'Left'; value: L } | { tag: 'Right'; value: R };
type Tuple<A, B> = [A, B];

// ============================================================================
// Type Class Definitions (Simplified)
// ============================================================================

// Functor type class
interface Functor<F> {
    map: <A, B>(fa: F, f: (a: A) => B) => any;
}

// Applicative type class
interface Applicative<F> extends Functor<F> {
    of: <A>(a: A) => any;
    ap: <A, B>(fab: any, fa: any) => any;
}

// Monad type class
interface Monad<F> extends Applicative<F> {
    chain: <A, B>(fa: any, f: (a: A) => any) => any;
}

// Bifunctor type class
interface Bifunctor<F> {
    bimap: <A, B, C, D>(fab: any, f: (a: A) => C, g: (b: B) => D) => any;
    mapLeft?: <A, B, C>(fab: any, f: (a: A) => C) => any;
}

// ============================================================================
// Type Class Instances
// ============================================================================

// Array Functor instance
const ArrayFunctor: Functor<any> = {
    map: <A, B>(fa: A[], f: (a: A) => B): B[] => fa.map(f),
};

// Array Applicative instance
const ArrayApplicative: Applicative<any> = {
    ...ArrayFunctor,
    of: <A>(a: A): A[] => [a],
    ap: <A, B>(fab: ((a: A) => B)[], fa: A[]): B[] => {
        const result: B[] = [];
        for (const f of fab) {
            for (const a of fa) {
                result.push(f(a));
            }
        }
        return result;
    },
};

// Array Monad instance
const ArrayMonad: Monad<any> = {
    ...ArrayApplicative,
    chain: <A, B>(fa: A[], f: (a: A) => B[]): B[] => {
        const result: B[] = [];
        for (const a of fa) {
            result.push(...f(a));
        }
        return result;
    },
};

// Maybe Functor instance
const MaybeFunctor: Functor<any> = {
    map: <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => {
        if (fa.tag === 'Just') {
            return { tag: 'Just', value: f(fa.value) };
        }
        return { tag: 'Nothing' };
    },
};

// Maybe Applicative instance
const MaybeApplicative: Applicative<any> = {
    ...MaybeFunctor,
    of: <A>(a: A): Maybe<A> => ({ tag: 'Just', value: a }),
    ap: <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> => {
        if (fab.tag === 'Just' && fa.tag === 'Just') {
            return { tag: 'Just', value: fab.value(fa.value) };
        }
        return { tag: 'Nothing' };
    },
};

// Maybe Monad instance
const MaybeMonad: Monad<any> = {
    ...MaybeApplicative,
    chain: <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => {
        if (fa.tag === 'Just') {
            return f(fa.value);
        }
        return { tag: 'Nothing' };
    },
};

// Tuple Bifunctor instance
const TupleBifunctor: Bifunctor<Tuple<string, number>> = {
    bimap: <A, B, C, D>(
        fab: [A, B],
        f: (a: A) => C,
        g: (b: B) => D
    ): [C, D] => [f(fab[0]), g(fab[1])],
    mapLeft: <A, B, C>(fab: [A, B], f: (a: A) => C): [C, B] => [f(fab[0]), fab[1]],
};

// ============================================================================
// Utility Functions
// ============================================================================

// Generic map function
function map<A, B>(
    functor: Functor<any>,
    fa: any,
    f: (a: A) => B
): any {
    return functor.map(fa, f);
}

// Generic lift function
function lift<A>(
    applicative: Applicative<any>,
    a: A
): any {
    return applicative.of(a);
}

// Generic chain function
function chain<A, B>(
    monad: Monad<any>,
    fa: any,
    f: (a: A) => any
): any {
    return monad.chain(fa, f);
}

// Generic bimap function
function bimap<A, B, C, D>(
    bifunctor: Bifunctor<any>,
    fab: any,
    f: (a: A) => C,
    g: (b: B) => D
): any {
    return bifunctor.bimap(fab, f, g);
}

// ============================================================================
// Test Functions
// ============================================================================

// Test Functor operations
function testFunctor() {
    console.log("=== Testing Functor ===");
    
    const numbers = [1, 2, 3, 4, 5];
    const doubled = map(ArrayFunctor, numbers, (x: number) => x * 2);
    console.log("Array map:", doubled); // [2, 4, 6, 8, 10]
    
    const maybeValue: Maybe<number> = { tag: 'Just', value: 42 };
    const maybeDoubled = map(MaybeFunctor, maybeValue, (x: number) => x * 2);
    console.log("Maybe map:", maybeDoubled); // { tag: 'Just', value: 84 }
    
    const nothing: Maybe<number> = { tag: 'Nothing' };
    const nothingDoubled = map(MaybeFunctor, nothing, (x: number) => x * 2);
    console.log("Maybe map (Nothing):", nothingDoubled); // { tag: 'Nothing' }
}

// Test Applicative operations
function testApplicative() {
    console.log("\n=== Testing Applicative ===");
    
    const lifted = lift(ArrayApplicative, 42);
    console.log("Array lift:", lifted); // [42]
    
    const functions = [(x: number) => x * 2, (x: number) => x + 1];
    const applied = ArrayApplicative.ap(functions, [1, 2, 3]);
    console.log("Array ap:", applied); // [2, 4, 6, 2, 3, 4]
    
    const maybeLifted = lift(MaybeApplicative, 42);
    console.log("Maybe lift:", maybeLifted); // { tag: 'Just', value: 42 }
    
    const maybeFunction: Maybe<(x: number) => number> = { tag: 'Just', value: x => x * 2 };
    const maybeApplied = MaybeApplicative.ap(maybeFunction, { tag: 'Just', value: 21 });
    console.log("Maybe ap:", maybeApplied); // { tag: 'Just', value: 42 }
}

// Test Monad operations
function testMonad() {
    console.log("\n=== Testing Monad ===");
    
    const numbers = [1, 2, 3];
    const chained = chain(ArrayMonad, numbers, (x: number) => [x, x * 2]);
    console.log("Array chain:", chained); // [1, 2, 2, 4, 3, 6]
    
    const maybeValue: Maybe<number> = { tag: 'Just', value: 10 };
    const maybeChained = chain(MaybeMonad, maybeValue, (x: number) => 
        x > 5 ? { tag: 'Just', value: x * 2 } : { tag: 'Nothing' }
    );
    console.log("Maybe chain:", maybeChained); // { tag: 'Just', value: 20 }
}

// Test Bifunctor operations
function testBifunctor() {
    console.log("\n=== Testing Bifunctor ===");
    
    const tuple: [string, number] = ["hello", 42];
    const transformed = bimap(TupleBifunctor, tuple, (s: string) => s.length, (n: number) => n * 2);
    console.log("Tuple bimap:", transformed); // [5, 84]
    
    const leftMapped = TupleBifunctor.mapLeft!(tuple, (s: string) => s.toUpperCase());
    console.log("Tuple mapLeft:", leftMapped); // ["HELLO", 42]
}

// Test type class constraints
function testTypeClassConstraints() {
    console.log("\n=== Testing Type Class Constraints ===");
    
    // Function that works with any Functor
    function doubleValues(
        functor: Functor<any>,
        fa: any
    ): any {
        return map(functor, fa, (x: number) => x * 2);
    }
    
    const arrayResult = doubleValues(ArrayFunctor, [1, 2, 3]);
    console.log("Double array:", arrayResult); // [2, 4, 6]
    
    const maybeResult = doubleValues(MaybeFunctor, { tag: 'Just', value: 21 });
    console.log("Double maybe:", maybeResult); // { tag: 'Just', value: 42 }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runAllTests() {
    console.log("Running HKT System Tests\n");
    
    testFunctor();
    testApplicative();
    testMonad();
    testBifunctor();
    testTypeClassConstraints();
    
    console.log("\n=== All Tests Completed ===");
}

// Run the tests
runAllTests();

// ============================================================================
// Type-Level Tests (compile-time)
// ============================================================================

// These are type-level tests that should compile successfully
type TestMaybe = Maybe<number>;
type TestEither = Either<string, number>;
type TestTuple = Tuple<string, number>;

// Test type class inheritance
type TestInheritance = 
    | Applicative<number[]> // Extends Functor
    | Monad<Maybe<number>>; // Extends Applicative

export {
    // Export types for external use
    Functor,
    Applicative,
    Monad,
    Bifunctor,
    Maybe,
    Either,
    Tuple,
    
    // Export instances
    ArrayFunctor,
    ArrayApplicative,
    ArrayMonad,
    MaybeFunctor,
    MaybeApplicative,
    MaybeMonad,
    TupleBifunctor,
    
    // Export utility functions
    map,
    lift,
    chain,
    bimap,
}; 