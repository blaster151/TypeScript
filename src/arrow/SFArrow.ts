// src/arrow/SFArrow.ts
//
// Stream Functions as CoKleisli arrows over Cofree<Step<I,O>, _>
// Step<I,O, X> = I -> [X, O]
// W A = Cofree<Step<I,O>, A>
// SF<I,O, A, B> = W A -> B
//
// We provide Category + Arrow dictionaries:
// - compose g f = g ∘ extend f
// - arr f = f ∘ extract
// - first f = \wAC -> [ f(map fst wAC), extract(map snd wAC) ]
//
// This matches the standard CoKleisli Arrow for product strength.
// (ArrowChoice `left` is intentionally omitted here; it requires extra structure)

import { Kind1, Kind2, Apply } from '../../fp-hkt';
import { Cofree, mapCofree, duplicateCofree, extractCofree } from '../../fp-free';

// ---------- Step functor ----------
export interface StepK<I, O> extends Kind1 {
  readonly type: (i: I) => [this['arg0'], O];
}

export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

export function stepFunctor<I, O>(): Functor<StepK<I, O>> {
  return {
    map: <A, B>(fx: (i: I) => [A, O], f: (a: A) => B) =>
      ((i: I) => {
        const [x, o] = fx(i);
        return [f(x), o];
      }) as any
  };
}

// ---------- CoKleisli SF over Cofree<Step> ----------
export type W<I, O, A> = Cofree<StepK<I, O>, A>;
export type SF<I, O, A, B> = (wa: W<I, O, A>) => B;
export interface SFK<I, O> extends Kind2 {
  readonly type: SF<I, O, this['arg0'], this['arg1']>;
}

// extend for Cofree (duplicate then map)
function extendCofree<I, O, A, B>(
  F: Functor<StepK<I, O>>,
  wa: W<I, O, A>,
  k: (w: W<I, O, A>) => B
): W<I, O, B> {
  const dup = duplicateCofree(F, wa);
  return mapCofree(F, dup, k);
}

// ---------- Typeclass shapes ----------
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

// ---------- Dictionaries for SF ----------
export function categorySF<I, O>(
  F: Functor<StepK<I, O>> = stepFunctor<I, O>()
): Category<SFK<I, O>> {
  return {
    id: <A>() =>
      ((wa: W<I, O, A>) => extractCofree(wa)) as any,
    compose: <A, B, C>(
      g: SF<I, O, B, C>,
      f: SF<I, O, A, B>
    ) =>
      ((wa: W<I, O, A>) => g(extendCofree(F, wa, f))) as any
  };
}

export function arrowSF<I, O>(
  F: Functor<StepK<I, O>> = stepFunctor<I, O>()
): Arrow<SFK<I, O>> {
  const C = categorySF<I, O>(F);
  return {
    ...C,
    arr: <A, B>(f: (a: A) => B) =>
      ((wa: W<I, O, A>) => f(extractCofree(wa))) as any,
    first: <A, B, C>(
      pab: SF<I, O, A, B>
    ) =>
      ((wac: W<I, O, [A, C]>) => {
        const b = pab(mapCofree(F, wac, ([a, _c]) => a));
        const c = extractCofree(mapCofree(F, wac, ([_a, c]) => c));
        return [b, c] as [B, C];
      }) as any
  };
}


