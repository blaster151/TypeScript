// KINDSCRIPT: START - STDLIB_INTEGRATION - KindScript standard library definitions
// Auto-generated from kindMetadataCentral.ts
// Contains compiler-shipped kind aliases and FP patterns

declare namespace ts.plus {
    /**
     * Unary type constructor supporting map
     *
     * Accepts first-class type constructors (FCTCs) directly.
     *
     * @example
     * ```typescript
     * // F can be a type constructor like List, Option, etc.
     * function map<F extends Kind<Type, Type>, A, B>(fa: F<A>, f: (a: A) => B): F<B>
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Functor
     */
    type Functor = Kind<[Type, Type]>;

    /**
     * Binary type constructor supporting bimap
     *
     * @example
     * ```typescript
     * function bimap<F extends ts.plus.Bifunctor, A, B, C, D>(
     *   fab: F<A, B>,
     *   f: (a: A) => C,
     *   g: (b: B) => D
     * ): F<C, D>
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Bifunctor
     */
    type Bifunctor = Kind<[Type, Type, Type]>;

    /**
     * TODO: Add `HKT` alias once KindScript supports first-class type constructors.
     *
     * Will represent a general higher-kinded type parameter with flexible arity,
     * enabling patterns such as generic Functor constraints without fixing arity.
     *
     * See issue: https://github.com/microsoft/TypeScript/issues/1213
     *
     * @example
     * ```typescript
     * // Future implementation:
     * type HKT = Kind<...>; // Flexible arity
     *
     * function lift<F extends ts.plus.HKT, Args extends any[]>(f: F<...Args>): F<...Args>
     * ```
     */

    /**
     * Free monad over a functor
     *
     * Represents a monad structure built from a functor F.
     * Accepts first-class type constructors (FCTCs) directly.
     *
     * @template F - The underlying functor (must be unary, F extends Kind<Type, Type>)
     * @template A - The value type
     *
     * @example
     * ```typescript
     * interface LogF<A> { type: 'log'; message: string; next: A; }
     * type LogFree<A> = ts.plus.Free<LogF, A>;
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Free_monad
     */
    type Free<F extends Kind<Type, Type>, A> = any; // Implementation stub

    /**
     * Fixed point of a functor
     *
     * Accepts first-class type constructors (FCTCs) directly.
     *
     * @template F - The functor (must be unary, F extends Kind<Type, Type>)
     *
     * @example
     * ```typescript
     * interface TreeF<A> { type: 'leaf' | 'node'; value?: number; left?: A; right?: A; }
     * type Tree = ts.plus.Fix<TreeF>;
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Fixed_point_combinator
     */
    type Fix<F extends Kind<Type, Type>> = any; // Implementation stub

    /**
     * Applies a type constructor to a tuple of type arguments.
     *
     * Only works with TypeConstructorType values (i.e., type-level values representing type constructors).
     *
     * @template TC - The type constructor (must be a TypeConstructorType)
     * @template Args - The type arguments to apply
     *
     * @example
     * ```typescript
     * type List<T> = T[];
     * type ListOfString = ts.plus.Apply<typeof List, [string]>; // ListOfString = string[]
     * ```
     */
    type Apply<TC, Args extends any[]> = any;
}

// Temporary ambient stubs for KindScript types
declare type Type = any;
declare type Kind<TArgs extends any[] = any[]> = any;
declare type UnaryFunctor = Kind<[Type, Type]>;
// KINDSCRIPT: END - STDLIB_INTEGRATION
