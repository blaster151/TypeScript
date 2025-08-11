// fp-typeclasses.ts

// Use the shared HKT encoding only.
import {
  Kind1, Kind2, Apply,
  ArrayK, TupleK, FunctionK, EitherK,
} from './fp-hkt';

// ============================================================================
// Core Typeclass Definitions (Kind1/Kind2-based)
// ============================================================================

export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

export interface Applicative<F extends Kind1> extends Functor<F> {
  of<A>(a: A): Apply<F, [A]>;
  ap<A, B>(fab: Apply<F, [(a: A) => B]>, fa: Apply<F, [A]>): Apply<F, [B]>;
}

export interface Monad<F extends Kind1> extends Applicative<F> {
  chain<A, B>(fa: Apply<F, [A]>, f: (a: A) => Apply<F, [B]>): Apply<F, [B]>;
}

export interface Bifunctor<F extends Kind2> {
  bimap<A, B, C, D>(
    fab: Apply<F, [A, B]>,
    f: (a: A) => C,
    g: (b: B) => D
  ): Apply<F, [C, D]>;

  mapLeft<A, B, C>(fab: Apply<F, [A, B]>, f: (a: A) => C): Apply<F, [C, B]>;
  mapRight<A, B, D>(fab: Apply<F, [A, B]>, g: (b: B) => D): Apply<F, [A, D]>;
}

export interface Profunctor<F extends Kind2> {
  dimap<A, B, C, D>(
    p: Apply<F, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ): Apply<F, [C, D]>;

  lmap<A, B, C>(p: Apply<F, [A, B]>, f: (c: C) => A): Apply<F, [C, B]>;
  rmap<A, B, D>(p: Apply<F, [A, B]>, g: (b: B) => D): Apply<F, [A, D]>;
}

// ============================================================================
// Instances
// ============================================================================

// Array (Kind1)
export const ArrayFunctor: Functor<ArrayK> = {
  map: (fa, f) => (fa as unknown as Array<any>).map(f) as any
};

export const ArrayApplicative: Applicative<ArrayK> = {
  ...ArrayFunctor,
  of: (a) => [a] as any,
  ap: (fab, fa) =>
    (fab as unknown as Array<(x: any) => any>)
      .flatMap(f => (fa as unknown as Array<any>).map(f)) as any
};

export const ArrayMonad: Monad<ArrayK> = {
  ...ArrayApplicative,
  chain: (fa, f) =>
    (fa as unknown as Array<any>).flatMap((a) => f(a) as unknown as Array<any>) as any
};

// Tuple (Kind2)
export const TupleBifunctor: Bifunctor<TupleK> = {
  bimap: (fab, f, g) => {
    const [a, b] = fab as unknown as [any, any];
    return [f(a), g(b)] as any;
  },
  mapLeft: (fab, f) => {
    const [a, b] = fab as unknown as [any, any];
    return [f(a), b] as any;
  },
  mapRight: (fab, g) => {
    const [a, b] = fab as unknown as [any, any];
    return [a, g(b)] as any;
  }
};

// Function profunctor (A -> B) is Kind2 with FunctionK
export const FunctionProfunctor: Profunctor<FunctionK> = {
  dimap: (p, f, g) => ((c: any) => g((p as any)(f(c)))) as any,
  lmap: (p, f) => ((c: any) => (p as any)(f(c))) as any,
  rmap: (p, g) => ((a: any) => g((p as any)(a))) as any
};

// Maybe (tagged ADT – consistent with your other modules)
export type Maybe<A> = { tag: 'Just'; value: A } | { tag: 'Nothing' };
export const Just = <A>(a: A): Maybe<A> => ({ tag: 'Just', value: a });
export const Nothing = <A = never>(): Maybe<A> => ({ tag: 'Nothing' });

interface MaybeK extends Kind1 { readonly type: Maybe<this['A']>; }

export const MaybeFunctor: Functor<MaybeK> = {
  map: (fa, f) => (fa as Maybe<any>).tag === 'Just' ? Just(f((fa as any).value)) : fa as any
};

export const MaybeApplicative: Applicative<MaybeK> = {
  ...MaybeFunctor,
  of: Just,
  ap: (fab, fa) =>
    (fab as Maybe<(x: any) => any>).tag === 'Just' && (fa as Maybe<any>).tag === 'Just'
      ? Just((fab as any).value((fa as any).value))
      : Nothing()
};

export const MaybeMonad: Monad<MaybeK> = {
  ...MaybeApplicative,
  chain: (fa, f) => (fa as Maybe<any>).tag === 'Just' ? f((fa as any).value) : Nothing()
};

// Either (tagged ADT)
export type Either<L, R> = { tag: 'Left'; left: L } | { tag: 'Right'; right: R };
export const Left = <L, R = never>(l: L): Either<L, R> => ({ tag: 'Left', left: l });
export const Right = <R, L = never>(r: R): Either<L, R> => ({ tag: 'Right', right: r });


export const EitherBifunctor: Bifunctor<EitherK> = {
  bimap: (e, f, g) =>
    (e as Either<any, any>).tag === 'Left'
      ? Left(f((e as any).left))
      : Right(g((e as any).right)),
  mapLeft: (e, f) =>
    (e as Either<any, any>).tag === 'Left'
      ? Left(f((e as any).left))
      : e as any,
  mapRight: (e, g) =>
    (e as Either<any, any>).tag === 'Right'
      ? Right(g((e as any).right))
      : e as any
};

// ============================================================================
// Generic helpers (renamed to avoid collisions with optics exports)
// ============================================================================

export function mapT<F extends Kind1, A, B>(
  F: Functor<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => B
): Apply<F, [B]> {
  return F.map(fa, f);
}

export function liftT<F extends Kind1, A>(
  F: Applicative<F>,
  a: A
): Apply<F, [A]> {
  return F.of(a);
}

export function chainT<F extends Kind1, A, B>(
  F: Monad<F>,
  fa: Apply<F, [A]>,
  f: (a: A) => Apply<F, [B]>
): Apply<F, [B]> {
  return F.chain(fa, f);
}