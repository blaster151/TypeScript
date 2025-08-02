// Auto-generated from centralized kind metadata
// Do not edit manually - edit src/compiler/kindMetadataCentral.ts instead
// Generated on: 2025-08-02T01:56:06.426Z

// Temporary ambient stubs for Kind and Type until the type system provides them
// These are placeholders for the type system's internal higher-kinded type machinery
declare type Type = any;
declare type Kind<TArgs extends any[] = any[]> = any;

/// <reference lib="es5" />

/////////////////////////////
/// TypeScript Plus APIs
/////////////////////////////

/**
 * Namespace for functional programming kind aliases and patterns.
 *
 * These aliases enable higher-kinded type patterns in TypeScript.
 * All definitions are isolated in the ts.plus namespace to avoid
 * collisions with user code.
 * 
 * @see https://github.com/microsoft/TypeScript/wiki/Functional-Programming-Patterns
 */
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
     * function bimap<F extends ts.plus.Bifunctor, A, B, C, D>(fab: F<A, B>, f: (a: A) => C, g: (b: B) => D): F<C, D>
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
     * @template F - The functor type constructor (must be unaryfunctor)
     * @template A - The value type
     * 
     * @example
     * ```typescript
     * type ConsoleFree<A> = ts.plus.Free<ConsoleF, A>
     * ```
     * 
     * @see https://en.wikipedia.org/wiki/Free_monad
     * @see https://typelevel.org/cats/datatypes/freemonad.html
     */
    type Free<F extends UnaryFunctor, A> = F extends Kind<[Type, Type]>
        ? any // Simplified for now - would be F<A> | { type: 'pure'; value: A } | { type: 'flatMap'; fa: F<Free<F, A>>; f: (a: A) => Free<F, A> }
        : never;

    /**
     * Fixed point of a functor
     * 
     * @template F - The functor type constructor (must be unaryfunctor)
     * 
     * 
     * @example
     * ```typescript
     * type Tree = ts.plus.Fix<TreeF>
     * ```
     * 
     * @see https://en.wikipedia.org/wiki/Initial_algebra
     * @see https://typelevel.org/cats/datatypes/fixed.html
     */
    type Fix<F extends UnaryFunctor> = F extends Kind<[Type, Type]>
        ? any // Simplified for now - would be F<A> | { type: 'pure'; value: A } | { type: 'flatMap'; fa: F<Free<F, A>>; f: (a: A) => Free<F, A> }
        : never;
}
