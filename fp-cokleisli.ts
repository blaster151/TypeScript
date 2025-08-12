import { Kind1, Apply } from './fp-hkt';
import { Comonad } from './fp-adjunction';

// CoKleisli arrow for a comonad W:    W<A> -> B
export type CoKleisli<W extends Kind1, A, B> = (wa: Apply<W, [A]>) => B;

// Minimal Category/Arrow dictionaries (local to CoKleisli)
export interface Category<Arr> {
  id<A>(): Arr extends (x: infer _X) => any ? (a: A) => A : any;
  compose<A, B, C>(g: (b: B) => C, f: (a: A) => B): (a: A) => C;
}

export interface Arrow<Arr> extends Category<Arr> {
  arr<A, B>(f: (a: A) => B): (a: A) => B;
  first<A, B, C>(pab: (a: A) => B): (ac: [A, C]) => [B, C];
}

/**
 * CoKleisli Category/Arrow for any Comonad W.
 * id      = extract
 * g >>> f = g ∘ extend(f)
 * arr f   = f ∘ extract
 * first f = \w<[A,C]> -> [ f (map fst w), snd (extract w) ]
 */
export function categoryCoKleisli<W extends Kind1>(W: Comonad<W>) {
  return {
    id: <A>(): CoKleisli<W, A, A> => (wa) => W.extract(wa),
    compose: <A, B, C>(
      g: CoKleisli<W, B, C>,
      f: CoKleisli<W, A, B>
    ): CoKleisli<W, A, C> => (wa) => g(W.extend(wa, f)),
  } as Category<CoKleisli<W, any, any>>;
}

export function arrowCoKleisli<W extends Kind1>(W: Comonad<W>) {
  const C = categoryCoKleisli(W);
  return {
    ...C,
    arr: <A, B>(f: (a: A) => B): CoKleisli<W, A, B> => (wa) => f(W.extract(wa)),
    first: <A, B, C>(pab: CoKleisli<W, A, B>): CoKleisli<W, [A, C], [B, C]> =>
      (wac) => {
        const b = pab(W.map(wac, ([a]) => a) as any);
        const c = (W.extract(wac) as [any, C])[1];
        return [b, c];
      },
  } as Arrow<CoKleisli<W, any, any>>;
}


