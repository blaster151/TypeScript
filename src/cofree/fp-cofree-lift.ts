// src/cofree/fp-cofree-lift.ts
//
// Natural-transformation-based lifts for Cofree and Free.
// Generic, compositional tools to rehost a Cofree<F,_> (or Free<F,_>) onto H via α : F ~> H.
//
// Exposes:
// - liftCofree: given α: F ~> H, turn Cofree<F,A> into Cofree<H,A>
// - liftFree: given α: F ~> H, turn Free<F,A> into Free<H,A>
//
import { Kind1, Apply } from '../../fp-hkt';

// Minimal Functor (local)
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

import { NaturalTransformation } from '../../fp-nat';
import {
  Cofree, cofree, mapCofree,
  Free, FreePure, FreeImpure
} from '../../fp-free';

// ---------- liftCofree via a natural transformation F ~> H ----------
// Cofree<F, A> = { head: A; tail: F<Cofree<F, A>> }
export function liftCofree<F extends Kind1, H extends Kind1, A>(
  F: Functor<F>,
  Hf: Functor<H>,
  alpha: NaturalTransformation<F, H>, // α.run : <X> F<X> -> H<X>
  wa: Cofree<F, A>
): Cofree<H, A> {
  const liftedTailF = F.map(wa.tail, (w: Cofree<F, A>) => liftCofree(F, Hf, alpha, w)) as Apply<F, [Cofree<H, A>]>;
  const tailH = alpha.run(liftedTailF) as Apply<H, [Cofree<H, A>]>;
  return { head: wa.head, tail: tailH };
}

// ---------- liftFree via a natural transformation F ~> H ----------
// Structure-preserving; does not change the “syntax”, only the base functor.
export function liftFree<F extends Kind1, H extends Kind1, A>(
  F: Functor<F>,
  Hf: Functor<H>,
  alpha: NaturalTransformation<F, H>,
  m: Free<F, A>
): Free<H, A> {
  switch (m._tag) {
    case 'Pure':
      return FreePure<H, A>(m.value);
    case 'Impure': {
      const mapped: Apply<F, [Free<H, A>]> =
        F.map(m.fx, (next: Free<F, A>) => liftFree(F, Hf, alpha, next)) as Apply<F, [Free<H, A>]>;
      const lifted: Apply<H, [Free<H, A>]> = alpha.run(mapped) as Apply<H, [Free<H, A>]>;
      return FreeImpure<H, A>(lifted);
    }
  }
}


