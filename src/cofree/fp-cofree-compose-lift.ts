// fp-cofree-compose-lift.ts
//
// Lift a Cofree<G, A> into Cofree<ComposeK<G,H>, A> using:
// • Functor<G> to map the outer layer
// • Applicative<H> to provide the inner layer (via `of`)
//
// Resulting tail shape:
// Cofree<G,A>.tail : G<Cofree<G,A>>
// Cofree<ComposeK<G,H>,A>.tail : G< H< Cofree<ComposeK<G,H>,A> > >
//
// This is the canonical “insert an inner H” at every G-step.

import { Kind1, Apply } from '../../fp-hkt';
import { Cofree, cofree } from '../../fp-free';

// Local minimal typeclasses to keep this file self-contained
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

export interface Applicative<F extends Kind1> extends Functor<F> {
  of<A>(a: A): Apply<F, [A]>;
}

// HKT composition witness (local; if you already have one, import that instead)
export interface ComposeK<F extends Kind1, G extends Kind1> extends Kind1 {
  readonly type: Apply<F, [Apply<G, [this['arg0']]>]>;
}

/**
 * Curried entrypoint:
 * const lift = liftCofreeIntoCompose(Gfunctor, Happlicative);
 * const lifted: Cofree<ComposeK<G,H>, A> = lift(wa);
 */
export function liftCofreeIntoCompose<G extends Kind1, H extends Kind1>(
  Gfunctor: Functor<G>,
  Happ: Applicative<H>
) {
  type GK<X> = Apply<G, [X]>;
  type HK<X> = Apply<H, [X]>;
  type GKHK<X> = Apply<G, [Apply<H, [X]>]>;

  return function lift<A>(wa: Cofree<G, A>): Cofree<ComposeK<G, H>, A> {
    // Recurse: lift each child Cofree<G,A> to Cofree<Compose<G,H>,A>, then inject into H
    const liftedTail: GKHK<Cofree<ComposeK<G, H>, A>> =
      Gfunctor.map(wa.tail, (child: Cofree<G, A>) => Happ.of(lift(child))) as any;
    return cofree<A, any>(wa.head, liftedTail) as Cofree<ComposeK<G, H>, A>;
  };
}

/** Non-curried convenience */
export function liftCofreeIntoComposeNC<G extends Kind1, H extends Kind1, A>(
  Gfunctor: Functor<G>,
  Happ: Applicative<H>,
  wa: Cofree<G, A>
): Cofree<ComposeK<G, H>, A> {
  return liftCofreeIntoCompose(Gfunctor, Happ)<A>(wa);
}

// ----------- (Optional) small helper for one-layer lift (no recursion) --------
// Useful if you want an iterative/yielding variant later.
export function liftCofreeIntoComposeOne<G extends Kind1, H extends Kind1, A>(
  Gfunctor: Functor<G>,
  Happ: Applicative<H>,
  wa: Cofree<G, A>
): Cofree<ComposeK<G, H>, A> {
  const liftedTail = Gfunctor.map(wa.tail, (child) => Happ.of(child as any)) as any;
  return cofree(wa.head, liftedTail);
}

/*
Notes & caveats:
- This version is structurally recursive and will traverse the whole tree.
*/


