// src/arrow/CoKleisliCategory.ts
//
// Category instance for CoKleisli over Cofree "Mealy-like" machines.
// Treat stream processors as a Category: id and compose.
//
// Reuses HKT + Cofree utilities; builds a Category dictionary specialized to
// SF (signal functions) modeled as a CoKleisli category for Cofree<F, _>
// with F<X> = (I) => [X, O].

import { Kind1, Kind2, Apply } from '../../fp-hkt';
import { Cofree, CofreeK, mapCofree, extractCofree, duplicateCofree } from '../../fp-free';

// ---------- Typeclass dictionaries ----------
export interface Category<P extends Kind2> {
  id<A>(): Apply<P, [A, A]>;
  compose<A, B, C>(
    g: Apply<P, [B, C]>,
    f: Apply<P, [A, B]>
  ): Apply<P, [A, C]>;
}

// Minimal Functor & Comonad interfaces
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

export interface Comonad<W extends Kind1> extends Functor<W> {
  extract<A>(wa: Apply<W, [A]>): A;
  extend<A, B>(wa: Apply<W, [A]>, k: (wb: Apply<W, [A]>) => B): Apply<W, [B]>;
}

// ---------- CoKleisli machinery ----------
/** CoKleisli<W, A, B> ~ (W<A>) -> B as a Kind2 carrier. */
export interface CoKleisliK<W extends Kind1> extends Kind2 {
  readonly type: (wa: Apply<W, [this['arg0']]>) => this['arg1'];
}

/** Category instance for CoKleisli of any comonad W. */
export function categoryCoKleisli<W extends Kind1>(Wc: Comonad<W>): Category<CoKleisliK<W>> {
  return {
    id<A>() {
      // id = extract
      return ((wa: Apply<W, [A]>) => Wc.extract(wa)) as any;
    },
    compose<A, B, C>(g: (wb: Apply<W, [B]>) => C, f: (wa: Apply<W, [A]>) => B) {
      // g ∘ f = g ∘ extend f
      return ((wa: Apply<W, [A]>) => g(Wc.extend(wa, f))) as any;
    }
  };
}

// ---------- Mealy-like step functor & Cofree comonad ----------
/** Step<I, O, X> = (i: I) => [X, O] as a Kind1 with arg0 = X. */
export interface StepK<I, O> extends Kind1 {
  readonly type: (i: I) => [this['arg0'], O];
}

/** Functor instance for Step<I,O>. */
export function StepFunctor<I, O>(): Functor<StepK<I, O>> {
  return {
    map<A, B>(fa: (i: I) => [A, O], f: (a: A) => B): (i: I) => [B, O] {
      return (i: I) => {
        const [a, o] = fa(i);
        return [f(a), o];
      };
    }
  };
}

/** Comonad instance for Cofree<Step<I,O>, _>. */
export function CofreeComonadForStep<I, O>(): Comonad<CofreeK<StepK<I, O>>> {
  const F = StepFunctor<I, O>();
  const W: Comonad<CofreeK<StepK<I, O>>> = {
    map: <A, B>(wa: Cofree<StepK<I, O>, A>, f: (a: A) => B): Cofree<StepK<I, O>, B> =>
      mapCofree(F, wa, f),
    extract: <A>(wa: Cofree<StepK<I, O>, A>): A => extractCofree(wa),
    extend: <A, B>(wa: Cofree<StepK<I, O>, A>, k: (w: Cofree<StepK<I, O>, A>) => B): Cofree<StepK<I, O>, B> => {
      const dup = duplicateCofree(F, wa); // Cofree<F, Cofree<F, A>>
      return mapCofree(F, dup, k);
    }
  };
  return W;
}

// ---------- SF Category (CoKleisli over Cofree<Step<I,O>, _>) ----------
/** Category over CoKleisli<Cofree<Step<I,O>, _>>. */
export function categorySF<I, O>(): Category<CoKleisliK<CofreeK<StepK<I, O>>>> {
  const W = CofreeComonadForStep<I, O>();
  return categoryCoKleisli(W);
}


