// fp-cofree-lazy-para.ts
//
// Thunked paramorphism for LazyCofree so you can stream computations,
// plus a streaming lift into Cofree<ComposeK<G,H>,A> without deep recursion during construction.

import { Kind1, Apply } from './fp-hkt';
import { LazyCofree, lazyCofree, unconsLazy } from './fp-cofree-lazy';

// Minimal local Functor/Applicative to avoid heavy imports
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}
export interface Applicative<F extends Kind1> extends Functor<F> {
  of<A>(a: A): Apply<F, [A]>;
}

// If you already have ComposeK, import it; otherwise keep this local.
export interface ComposeK<F extends Kind1, G extends Kind1> extends Kind1 {
  readonly type: Apply<F, [Apply<G, [this['arg0']]>]>;
}

/**
 * Strict paramorphism (will recurse): para over LazyCofree.
 * alg: (head, F<{ original, result }>) => B
 */
export function paraLazy<F extends Kind1, A, B>(
  F: Functor<F>,
  alg: (head: A, kids: Apply<F, [{ original: LazyCofree<F, A>; result: B }]> ) => B,
  wa: LazyCofree<F, A>
): B {
  const [, tail] = unconsLazy(wa);
  const folded = F.map(tail, (child) => ({
    original: child,
    result: paraLazy(F, alg, child)
  })) as any;
  return alg(wa.head, folded);
}

/**
 * Thunked paramorphism (does NOT recurse unless you force the thunk):
 * alg: (head, F<{ original, resultThunk: () => B }>) => B
 */
export function paraLazyThunk<F extends Kind1, A, B>(
  F: Functor<F>,
  alg: (head: A, kids: Apply<F, [{ original: LazyCofree<F, A>; resultThunk: () => B }]>) => B,
  wa: LazyCofree<F, A>
): B {
  const [, tail] = unconsLazy(wa);
  const kids = F.map(tail, (child) => ({
    original: child,
    resultThunk: () => paraLazyThunk(F, alg, child)
  })) as any;
  return alg(wa.head, kids);
}

/**
 * Streaming lift:
 * Lift LazyCofree<G,A> into LazyCofree<ComposeK<G,H>,A> using only a lazy one-layer thunk.
 */
export function liftLazyCofreeIntoComposeLazy<G extends Kind1, H extends Kind1>(
  Gfunctor: Functor<G>,
  Happ: Applicative<H>
) {
  type GK<X> = Apply<G, [X]>;
  type HK<X> = Apply<H, [X]>;
  type GKHK<X> = Apply<G, [Apply<H, [X]>]>;

  return function lift<A>(wa: LazyCofree<G, A>): LazyCofree<ComposeK<G, H>, A> {
    const tailThunk: () => GKHK<LazyCofree<ComposeK<G, H>, A>> = () =>
      Gfunctor.map(wa.tail(), (child: LazyCofree<G, A>) => Happ.of(lift(child))) as any;
    return lazyCofree(wa.head, tailThunk);
  };
}

/**
 * Example: build a streaming transformer via paraLazyThunk.
 */
export function buildViaParaLazyThunk<F extends Kind1, A, B>(
  F: Functor<F>,
  alg: (head: A, kids: Apply<F, [{ original: LazyCofree<F, A>; resultThunk: () => B }]>) => B
) {
  return (wa: LazyCofree<F, A>): B => paraLazyThunk(F, alg, wa);
}

/**
 * Strict variant for the lift (recurses eagerly)
 */
export function liftLazyCofreeIntoComposeStrict<G extends Kind1, H extends Kind1>(
  Gfunctor: Functor<G>,
  Happ: Applicative<H>
) {
  return function lift<A>(wa: LazyCofree<G, A>): LazyCofree<ComposeK<G, H>, A> {
    const tail = () => Gfunctor.map(wa.tail(), (child) => Happ.of(lift(child))) as any;
    return lazyCofree(wa.head, tail);
  };
}


