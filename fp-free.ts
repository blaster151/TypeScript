/**
 * Minimal Free and Cofree encodings for HKT integration
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';

// -------------------- Free --------------------

export type Free<F extends Kind1, A> =
  | { _tag: 'Pure'; value: A }
  | { _tag: 'Impure'; fx: Apply<F, [Free<F, A>]> };

export function FreePure<F extends Kind1, A>(a: A): Free<F, A> { return { _tag: 'Pure', value: a }; }
export function FreeImpure<F extends Kind1, A>(fx: Apply<F, [Free<F, A>]>): Free<F, A> { return { _tag: 'Impure', fx }; }

export function mapFree<F extends Kind1, A, B>(F: Functor<F>, fa: Free<F, A>, f: (a: A) => B): Free<F, B> {
  switch (fa._tag) {
    case 'Pure':
      return FreePure(f(fa.value));
    case 'Impure':
      return FreeImpure(F.map(fa.fx, (inner) => mapFree(F, inner, f)) as any);
  }
}

// foldFree given an F-algebra phi: F<A> -> A
export function foldFree<F extends Kind1, A>(F: Functor<F>, phi: (fa: Apply<F, [A]>) => A, fa: Free<F, A>): A {
  switch (fa._tag) {
    case 'Pure':
      return fa.value;
    case 'Impure':
      const mapped = F.map(fa.fx, (inner) => foldFree(F, phi, inner)) as any as Apply<F, [A]>;
      return phi(mapped);
  }
}

export interface FreeK<F extends Kind1> extends Kind1 {
  readonly type: Free<F, this['arg0']>;
}

// -------------------- Cofree --------------------

export interface Cofree<F extends Kind1, A> {
  readonly head: A;
  readonly tail: Apply<F, [Cofree<F, A>]>;
}

export function cofree<F extends Kind1, A>(head: A, tail: Apply<F, [Cofree<F, A>]>): Cofree<F, A> {
  return { head, tail };
}

export function mapCofree<F extends Kind1, A, B>(F: Functor<F>, wa: Cofree<F, A>, f: (a: A) => B): Cofree<F, B> {
  return {
    head: f(wa.head),
    tail: F.map(wa.tail, (w) => mapCofree(F, w, f)) as any
  };
}

export function extractCofree<F extends Kind1, A>(wa: Cofree<F, A>): A { return wa.head; }

export function duplicateCofree<F extends Kind1, A>(F: Functor<F>, wa: Cofree<F, A>): Cofree<F, Cofree<F, A>> {
  return {
    head: wa,
    tail: F.map(wa.tail, (w) => duplicateCofree(F, w)) as any
  };
}

export interface CofreeK<F extends Kind1> extends Kind1 {
  readonly type: Cofree<F, this['arg0']>;
}


