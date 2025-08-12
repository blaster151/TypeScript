// src/arrow/MealyPure.ts
//
// Pure Mealy machines: no initial output.
// A morphism A ~> B is a machine: A -> [B, next].
//
// We expose Category + Arrow (and optional ArrowChoice) dictionaries,
// matching the standard Arrow laws.
//
// Composition rule:
// given f : A ~> B, g : B ~> C
// (g ∘ f)(a) = let (b, f') = f(a);
//                 (c, g') = g(b);
//              in (c, g' ∘ f')
//
// arr f lifts a pure function:
// arr f (a) = (f a, arr f)
//
// first lifts along products:
// first f ([a, c]) = let (b, f') = f a in ([b, c], first f')
//
// left (ArrowChoice) lifts along Either<L,R> ({ left | right }):
// left f (Left a) = let (b, f') = f a in (Left b, left f')
// left f (Right c) = (Right c, left f) -- machine unchanged on Right

import { Kind2, Apply, Either } from '../../fp-hkt';

// ---------- Core representation ----------
export type Mealy<A, B> = (a: A) => [B, Mealy<A, B>];
export interface MealyK extends Kind2 {
  readonly type: Mealy<this['arg0'], this['arg1']>;
}

// ---------- Typeclass shapes used here ----------
export interface Category<P extends Kind2> {
  id<A>(): Apply<P, [A, A]>;
  compose<A, B, C>(
    g: Apply<P, [B, C]>,
    f: Apply<P, [A, B]>
  ): Apply<P, [A, C]>;
}

export interface Arrow<P extends Kind2> extends Category<P> {
  arr<A, B>(f: (a: A) => B): Apply<P, [A, B]>;
  first<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
}

export interface ArrowChoice<P extends Kind2> extends Arrow<P> {
  left<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
}

// ---------- Either helpers ----------
const Left = <L, R = never>(value: L): Either<L, R> => ({ left: value });
const Right = <L, R = never>(value: R): Either<L, R> => ({ right: value });

// ---------- Helpers (constructors) ----------
export function arrMealy<A, B>(f: (a: A) => B): Mealy<A, B> {
  // Self-recursive constant next
  let self: Mealy<A, B>;
  self = (a: A) => [f(a), self];
  return self;
}

export function idMealy<A>(): Mealy<A, A> {
  let self: Mealy<A, A>;
  self = (a: A) => [a, self];
  return self;
}

export function composeMealy<A, B, C>(g: Mealy<B, C>, f: Mealy<A, B>): Mealy<A, C> {
  return (a: A) => {
    const [b, f1] = f(a);
    const [c, g1] = g(b);
    return [c, composeMealy(g1, f1)];
  };
}

export function firstMealy<A, B, C>(pab: Mealy<A, B>): Mealy<[A, C], [B, C]> {
  return ([a, c]: [A, C]) => {
    const [b, next] = pab(a);
    return [[b, c], firstMealy(next)];
  };
}

export function leftMealy<A, B, C>(pab: Mealy<A, B>): Mealy<Either<A, C>, Either<B, C>> {
  return (e: Either<A, C>) =>
    'left' in e
      ? (() => {
          const [b, next] = pab(e.left);
          return [Left<B, C>(b), leftMealy(next)];
        })()
      : [Right<B, C>(e.right as C), leftMealy(pab)];
}

// ---------- Dictionary instances ----------
export function categoryMealy(): Category<MealyK> {
  return {
    id: <A>() => idMealy<A>() as any,
    compose: <A, B, C>(g: Mealy<B, C>, f: Mealy<A, B>) => composeMealy(g, f) as any
  };
}

export function arrowMealy(): Arrow<MealyK> {
  const C = categoryMealy();
  return {
    ...C,
    arr: <A, B>(f: (a: A) => B) => arrMealy(f) as any,
    first: <A, B, C>(pab: Mealy<A, B>) => firstMealy<A, B, C>(pab) as any
  };
}

export function arrowChoiceMealy(): ArrowChoice<MealyK> {
  const A = arrowMealy();
  return {
    ...A,
    left: <A, B, C>(pab: Mealy<A, B>) => leftMealy<A, B, C>(pab) as any
  };
}


