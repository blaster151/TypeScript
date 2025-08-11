/**
 * Yoneda and Coyoneda encodings for HKTs
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';

// Yoneda<F, A> ≅ F<A>
export interface Yoneda<F extends Kind1, A> {
  run<B>(k: (a: A) => B): Apply<F, [B]>;
}

export function toYoneda<F extends Kind1, A>(F: Functor<F>, fa: Apply<F, [A]>): Yoneda<F, A> {
  return {
    run: <B>(k: (a: A) => B) => F.map(fa, k)
  };
}

export function fromYoneda<F extends Kind1, A>(F: Functor<F>, ya: Yoneda<F, A>): Apply<F, [A]> {
  return ya.run((a) => a);
}

export function mapYoneda<F extends Kind1, A, B>(ya: Yoneda<F, A>, f: (a: A) => B): Yoneda<F, B> {
  return {
    run: <C>(k: (b: B) => C) => ya.run((a) => k(f(a)))
  };
}

// Coyoneda<F, A> ≅ F<A> with guaranteed Functor
export interface Coyoneda<F extends Kind1, A> {
  readonly fx: Apply<F, [any]>;
  readonly k: (x: any) => A;
}

export function toCoyoneda<F extends Kind1, A>(fa: Apply<F, [A]>): Coyoneda<F, A> {
  return { fx: fa as Apply<F, [any]>, k: (x: any) => x as A };
}

export function fromCoyoneda<F extends Kind1, A>(F: Functor<F>, ca: Coyoneda<F, A>): Apply<F, [A]> {
  return F.map(ca.fx, ca.k);
}

export function mapCoyoneda<F extends Kind1, A, B>(ca: Coyoneda<F, A>, f: (a: A) => B): Coyoneda<F, B> {
  return { fx: ca.fx, k: (x: any) => f(ca.k(x)) };
}

// Laws: to/from are isomorphisms
export type Eq<T> = (a: T, b: T) => boolean;

export function checkYonedaIso<F extends Kind1, A>(
  F: Functor<F>,
  genFA: () => Apply<F, [A]>,
  genK: () => (a: A) => A,
  eqFA: Eq<Apply<F, [A]>>,
  samples = 50
): boolean {
  // from ∘ to = id on F<A>
  let leftOk = true;
  for (let i = 0; i < samples && leftOk; i++) {
    const fa = genFA();
    const ya = toYoneda(F, fa);
    leftOk = eqFA(fromYoneda(F, ya), fa);
  }
  // to ∘ from = id on Yoneda (extensional eq tested against random k)
  let rightOk = true;
  for (let i = 0; i < samples && rightOk; i++) {
    const fa = genFA();
    const ya = toYoneda(F, fa);
    const back = toYoneda(F, fromYoneda(F, ya));
    const k = genK();
    rightOk = eqFA(ya.run(k), back.run(k));
  }
  return leftOk && rightOk;
}



