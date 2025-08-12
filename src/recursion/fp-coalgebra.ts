// src/recursion/fp-coalgebra.ts
//
// Lightweight Algebra/Coalgebra helpers + cata/ana/hylo over HKTs.
//
// Works with your existing Functor, Kind1, Apply and Free/Cofree modules.

import { Kind1, Apply } from '../../fp-hkt';

// Minimal Functor (local) to keep this file self-contained
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

export type Algebra<F extends Kind1, A> = (fa: Apply<F, [A]>) => A;
export type Coalgebra<F extends Kind1, S> = (s: S) => Apply<F, [S]>;

/** catamorphism (fold) */
export function cata<F extends Kind1, A>(
  F: Functor<F>,
  alg: Algebra<F, A>
): (t: Apply<F, [A]>) => A {
  // For a real fixed-point this would descend a Fix<F>; here we expose the
  // algebra action directly. Most users will prefer hylo with a seed.
  return (fa) => alg(fa);
}

/** anamorphism (unfold) */
export function ana<F extends Kind1, S>(
  F: Functor<F>,
  coalg: Coalgebra<F, S>
): (seed: S) => Apply<F, [S]> {
  return (s) => coalg(s);
}

/** hylomorphism: fold ∘ unfold without building the intermediate */
export function hylo<F extends Kind1, S, A>(
  F: Functor<F>,
  alg: Algebra<F, A>,
  coalg: Coalgebra<F, S>
): (seed: S) => A {
  const go = (s: S): A => {
    const fs = coalg(s); // F<S>
    const fa = F.map(fs, (s1: S) => go(s1)) as Apply<F, [A]>; // F<A>
    return alg(fa); // A
  };
  return go;
}


