// fp-arrowchoice-cokleisli.ts
//
// Arrow/Category/ArrowChoice dictionaries for CoKleisli<W,_,_>,
// requiring a Comonad W and a Cochoice<W> for ArrowChoice’s `left`.
// Arr/first and composition are the standard CoKleisli ones.
//
// Expose HKTs so it plugs into your registry & law runner.

import { Kind1, Kind2, Apply } from './fp-hkt';
import { Cochoice, Comonad, Either, Left, Right } from './fp-cochoice';

// Core Arrow typeclasses (inline to avoid import churn)
export interface Category<Arr extends Kind2> {
  id<A>(): Apply<Arr, [A, A]>;
  compose<A, B, C>(
    g: Apply<Arr, [B, C]>,
    f: Apply<Arr, [A, B]>
  ): Apply<Arr, [A, C]>;
}

export interface Arrow<Arr extends Kind2> extends Category<Arr> {
  arr<A, B>(f: (a: A) => B): Apply<Arr, [A, B]>;
  first<A, B, C>(pab: Apply<Arr, [A, B]>): Apply<Arr, [[A, C], [B, C]]>;
}

export interface ArrowChoiceTC<Arr extends Kind2> extends Arrow<Arr> {
  left<A, B, C>(pab: Apply<Arr, [A, B]>): Apply<Arr, [Either<A, C>, Either<B, C>]>;
}

// CoKleisli HKT
export interface CoKleisliK<W extends Kind1> extends Kind2 {
  readonly type: (wa: Apply<W, [this['arg0']]>) => this['arg1'];
}
export type CoKleisli<W extends Kind1, A, B> = Apply<CoKleisliK<W>, [A, B]>;

// Smart constructor (just a cast helper)
export const CoK = <W extends Kind1, A, B>(f: (wa: Apply<W, [A]>) => B) => f as CoKleisli<W, A, B>;

// Dictionaries
export function categoryCoKleisli<W extends Kind1>(Wco: Comonad<W>): Category<CoKleisliK<W>> {
  return {
    id: <A>() => CoK<W, A, A>((wa) => Wco.extract(wa)),
    compose: <A, B, C>(g: CoKleisli<W, B, C>, f: CoKleisli<W, A, B>) =>
      CoK<W, A, C>((wa) => g(Wco.extend(wa, f))) // g ∘ extend f
  };
}

export function arrowCoKleisli<W extends Kind1>(Wco: Comonad<W>): Arrow<CoKleisliK<W>> {
  const C = categoryCoKleisli(Wco);
  return {
    ...C,
    arr: <A, B>(f: (a: A) => B) => CoK<W, A, B>((wa) => f(Wco.extract(wa))),
    first: <A, B, C>(pab: CoKleisli<W, A, B>) =>
      CoK<W, [A, C], [B, C]>((wac) => {
        const b = pab(Wco.map(wac, ([a]) => a));
        const c = Wco.extract(Wco.map(wac, ([, c]) => c));
        return [b, c];
      })
  } as any;
}

export function arrowChoiceCoKleisli<W extends Kind1>(
  Wco: Cochoice<W>
): ArrowChoiceTC<CoKleisliK<W>> {
  const A = arrowCoKleisli(Wco);
  return {
    ...A,
    left: <A0, B0, C0>(pab: CoKleisli<W, A0, B0>) =>
      CoK<W, Either<A0, C0>, Either<B0, C0>>((wac) => {
        const split = Wco.distEither(wac);
        return 'left' in split
          ? Left<B0, C0>(pab(split.left as any))
          : Right<B0, C0>(Wco.extract(split.right as any));
      })
  } as any;
}


