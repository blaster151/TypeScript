import { Kind1 } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';
import { Comonad } from './fp-adjunction';
import { Cofree, mapCofree, extractCofree, duplicateCofree, CofreeK } from './fp-free';

// Build a Comonad dictionary for Cofree<F,_> from Functor<F>
export function cofreeComonad<F extends Kind1>(F: Functor<F>): Comonad<CofreeK<F>> {
  return {
    map: <A, B>(fa: Cofree<F, A>, f: (a: A) => B): Cofree<F, B> =>
      mapCofree(F, fa, f),
    extract: <A>(fa: Cofree<F, A>): A =>
      extractCofree(fa),
    extend: <A, B>(fa: Cofree<F, A>, k: (wa: Cofree<F, A>) => B): Cofree<F, B> =>
      mapCofree(F, duplicateCofree(F, fa), k),
  } as Comonad<CofreeK<F>> as any;
}


