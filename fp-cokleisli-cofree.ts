import { Kind1 } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';
import { arrowCoKleisli } from './fp-cokleisli';
import { cofreeComonad } from './fp-cofree-comonad';

// Arrow instance specialized to CoKleisli over Cofree<F,_>
export function arrowCoKleisliCofree<F extends Kind1>(F: Functor<F>) {
  const W = cofreeComonad(F);
  return arrowCoKleisli(W);
}


