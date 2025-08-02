// KINDSCRIPT: START - STDLIB_INTEGRATION - KindScript standard library definitions
// Auto-generated from kindMetadataCentral.ts
// Contains compiler-shipped kind aliases and FP patterns

declare namespace ts.plus {
    /**
     * Unary type constructor supporting map
     *
     * Accepts first-class type constructors (FCTCs) directly.
     * Enforces proper kind constraints at compile time.
     *
     * @example
     * ```typescript
     * // F must be a type constructor with kind Kind<[Type, Type]>
     * function map<F extends Kind<[Type, Type]>, A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>
     * 
     * // Correct usage:
     * type List<T> = T[];
     * const result = map<List, string, number>(["a", "b"], s => s.length);
     * 
     * // Compiler error for wrong arity:
     * type Wrong<T, U> = [T, U]; // Kind<[Type, Type, Type]> - wrong arity!
     * const error = map<Wrong, string, number>(["a", "b"], s => s.length); // Error!
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Functor
     */
    type Functor = Kind<[Type, Type]>;

    /**
     * Binary type constructor supporting bimap
     *
     * Enforces proper kind constraints at compile time.
     *
     * @example
     * ```typescript
     * function bimap<F extends Kind<[Type, Type, Type]>, A, B, C, D>(
     *   fab: Apply<F, [A, B]>,
     *   f: (a: A) => C,
     *   g: (b: B) => D
     * ): Apply<F, [C, D]>
     * 
     * // Correct usage:
     * type Either<L, R> = { left?: L; right?: R };
     * const result = bimap<Either, string, number, boolean, string>(
     *   { left: "error" },
     *   s => s.length > 0,
     *   n => n.toString()
     * );
     * 
     * // Compiler error for wrong arity:
     * type Wrong<T> = T[]; // Kind<[Type]> - wrong arity!
     * const error = bimap<Wrong, string, number, boolean, string>(...); // Error!
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Bifunctor
     */
    type Bifunctor = Kind<[Type, Type, Type]>;

    /**
     * Monad type constructor supporting bind and return
     *
     * Enforces proper kind constraints at compile time.
     *
     * @example
     * ```typescript
     * function bind<M extends Kind<[Type, Type]>, A, B>(
     *   ma: Apply<M, [A]>,
     *   f: (a: A) => Apply<M, [B]>
     * ): Apply<M, [B]>
     * 
     * // Correct usage:
     * type Maybe<T> = T | null;
     * const result = bind<Maybe, string, number>(
     *   "hello",
     *   s => s.length > 0 ? s.length : null
     * );
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Monad_(functional_programming)
     */
    type Monad = Kind<[Type, Type]>;

    /**
     * Applicative type constructor supporting apply and pure
     *
     * Enforces proper kind constraints at compile time.
     *
     * @example
     * ```typescript
     * function apply<A extends Kind<[Type, Type]>, A, B>(
     *   af: Apply<A, [(a: A) => B]>,
     *   aa: Apply<A, [A]>
     * ): Apply<A, [B]>
     * 
     * // Correct usage:
     * type List<T> = T[];
     * const result = apply<List, string, number>(
     *   [(s: string) => s.length],
     *   ["hello", "world"]
     * );
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Applicative_functor
     */
    type Applicative = Kind<[Type, Type]>;

    /**
     * Free monad over a functor
     *
     * Represents a monad structure built from a functor F.
     * Enforces proper kind constraints at compile time.
     *
     * @template F - The underlying functor (must be unary, F extends Kind<[Type, Type]>)
     * @template A - The value type
     *
     * @example
     * ```typescript
     * interface LogF<A> { type: 'log'; message: string; next: A; }
     * type LogFree<A> = Free<LogF, A>;
     * 
     * // Compiler error for wrong kind:
     * interface WrongF<A, B> { type: 'wrong'; } // Kind<[Type, Type, Type]> - wrong!
     * type WrongFree<A> = Free<WrongF, A>; // Error!
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Free_monad
     */
    type Free<F extends Kind<[Type, Type]>, A> = 
        | { type: 'pure'; value: A }
        | { type: 'impure'; effect: Apply<F, [Free<F, A>]> };

    /**
     * Fixed point of a functor
     *
     * Enforces proper kind constraints at compile time.
     *
     * @template F - The functor (must be unary, F extends Kind<[Type, Type]>)
     *
     * @example
     * ```typescript
     * interface TreeF<A> { type: 'leaf' | 'node'; value?: number; left?: A; right?: A; }
     * type Tree = Fix<TreeF>;
     * 
     * // Compiler error for wrong kind:
     * interface WrongF<A, B> { type: 'wrong'; } // Kind<[Type, Type, Type]> - wrong!
     * type WrongTree = Fix<WrongF>; // Error!
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Fixed_point_combinator
     */
    type Fix<F extends Kind<[Type, Type]>> = Apply<F, [Fix<F>]>;

    /**
     * Applies a type constructor to a tuple of type arguments.
     *
     * Only works with TypeConstructorType values (i.e., type-level values representing type constructors).
     * Enforces proper arity constraints at compile time.
     *
     * @template TC - The type constructor (must be a TypeConstructorType)
     * @template Args - The type arguments to apply (must match constructor arity)
     *
     * @example
     * ```typescript
     * type List<T> = T[];
     * type ListOfString = Apply<List, [string]>; // ListOfString = string[]
     * 
     * // Compiler error for arity mismatch:
     * type Wrong = Apply<List, [string, number]>; // Error: List expects 1 argument, got 2
     * 
     * // Compiler error for non-constructor:
     * type NotConstructor = string;
     * type Error = Apply<NotConstructor, [number]>; // Error: First argument must be a type constructor
     * ```
     */
    type Apply<TC extends TypeConstructorType, Args extends readonly Type[]> = 
        TC extends TypeConstructorType<infer Arity, infer ParamKinds>
            ? Args extends readonly [...ParamKinds]
                ? any // Will be resolved by compiler to concrete type
                : never // Arity mismatch - will produce compiler error
            : never; // Not a TypeConstructorType - will produce compiler error
}

// Core KindScript type definitions with proper constraints
declare type Type = any; // Base type - will be refined by compiler

/**
 * Kind type representing a type constructor's shape
 * 
 * @template TArgs - Tuple of parameter kinds
 * 
 * @example
 * ```typescript
 * type Unary = Kind<[Type, Type]>; // Type -> Type
 * type Binary = Kind<[Type, Type, Type]>; // Type -> Type -> Type
 * ```
 */
declare type Kind<TArgs extends readonly Type[] = readonly Type[]> = 
    TypeConstructorType<TArgs['length'], TArgs>;

/**
 * Type constructor type with arity and parameter kind constraints
 * 
 * @template Arity - Number of type parameters
 * @template ParamKinds - Tuple of parameter kinds
 */
declare type TypeConstructorType<Arity extends number = number, ParamKinds extends readonly Type[] = readonly Type[]> = {
    readonly arity: Arity;
    readonly parameterKinds: ParamKinds;
    readonly targetType: Type;
    readonly symbol: Symbol;
};

// Common kind aliases for convenience
declare type UnaryFunctor = Kind<[Type, Type]>;
declare type BinaryFunctor = Kind<[Type, Type, Type]>;
declare type UnaryMonad = Kind<[Type, Type]>;
declare type UnaryApplicative = Kind<[Type, Type]>;

// KINDSCRIPT: END - STDLIB_INTEGRATION
