// KINDSCRIPT: START - STDLIB_INTEGRATION - KindScript standard library definitions
// Auto-generated from kindMetadataCentral.ts
// Contains compiler-shipped kind aliases and FP patterns

declare namespace ts.plus {
    /**
     * Unary type constructor supporting map
     *
     * @example
     * ```typescript
     * function map<F extends ts.plus.Functor, A, B>(fa: F<A>, f: (a: A) => B): F<B>
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
     * The Free monad provides a way to build monadic computations
     * from any functor, not just those that are already monads.
     *
     * @template F - The underlying functor (must be unary)
     * @template A - The value type
     *
     * @example
     * ```typescript
     * // Define a functor for logging
     * interface LogF<A> {
     *   type: 'log';
     *   message: string;
     *   next: A;
     * }
     *
     * // Create a free monad over the logging functor
     * type LogFree<A> = ts.plus.Free<LogF, A>;
     *
     * // Use in computations
     * function logMessage<A>(message: string, next: A): LogFree<A> {
     *   return { type: 'log', message, next } as any;
     * }
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Free_monad
     */
    type Free<F extends UnaryFunctor, A> = F extends Kind<[Type, Type]>
        ? any // Simplified for now
        : never;

    /**
     * Fixed point of a functor
     *
     * Represents the fixed point of a functor F, which is a type
     * that satisfies the equation Fix<F> = F<Fix<F>>.
     * This is useful for representing recursive data structures.
     *
     * @template F - The functor (must be unary)
     *
     * @example
     * ```typescript
     * // Define a functor for binary trees
     * interface TreeF<A> {
     *   type: 'leaf' | 'node';
     *   value?: number;
     *   left?: A;
     *   right?: A;
     * }
     *
     * // Create the fixed point
     * type Tree = ts.plus.Fix<TreeF>;
     *
     * // This represents: Tree = TreeF<Tree>
     * // Which is equivalent to:
     * // type Tree = {
     * //   type: 'leaf' | 'node';
     * //   value?: number;
     * //   left?: Tree;
     * //   right?: Tree;
     * // }
     * ```
     *
     * @see https://en.wikipedia.org/wiki/Fixed_point_combinator
     */
    type Fix<F extends UnaryFunctor> = F extends Kind<[Type, Type]>
        ? any // Simplified for now
        : never;
}

// Temporary ambient stubs for KindScript types
declare type Type = any;
declare type Kind<TArgs extends any[] = any[]> = any;
declare type UnaryFunctor = Kind<[Type, Type]>;
// KINDSCRIPT: END - STDLIB_INTEGRATION
