// src/cofree/fp-cofree-tensor.ts
//
// A pragmatic "tensor" to combine a Free<F,_> program with a Cofree<G,_> environment
// structurally, without needing shape alignment (Align). We use a product functor so a Free
// layer can carry its original F<...> together with a snapshot G<S> extracted from the environment.
//
// If later you do want shape alignment, you can add an Align<F,G> and a separate variant;
// this file keeps it minimal and lawful with just Functor.
//
// Exposes:
// - PairK<F,G,S>: product functor holding [F<X>, G<S>] (S fixed by the environment)
// - functorPairK(F,G): Functor<PairK<F,G,S>> that maps only the F-side
// - supplyWithPair(F,G): Free<F,A> × Cofree<G,S> -> Free<PairK<F,G,S>, A>

import { Kind1, Apply } from '../../fp-hkt';

// Minimal Functor (local)
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

import {
  Free, FreePure, FreeImpure,
  Cofree, mapCofree, extractCofree
} from '../../fp-free';

// ---------- PairK: product functor with fixed environment S ----------
export interface PairK<F extends Kind1, G extends Kind1, S> extends Kind1 {
  readonly type: readonly [Apply<F, [this['arg0']]>, Apply<G, [S]>];
}

// Functor instance maps only F-side, keeps the G<S> payload as-is.
export function functorPairK<F extends Kind1, G extends Kind1, S>(
  F: Functor<F>
): Functor<PairK<F, G, S>> {
  return {
    map: <A, B>(
      pair: readonly [Apply<F, [A]>, Apply<G, [S]>],
      f: (a: A) => B
    ) => {
      const [fx, gs] = pair;
      return [F.map(fx, f) as Apply<F, [B]>, gs] as const;
    }
  };
}

// ---------- supplyWithPair: upgrade Free<F,A> using a Cofree<G,S> snapshot ----------
// This is structural: it does not "run" anything; it packages each Free layer alongside
// a G<S> built from the environment (by mapping tail to extract heads). Continuations
// keep the same environment; no branching alignment is attempted here.
export function supplyWithPair<F extends Kind1, G extends Kind1, S, A>(
  F: Functor<F>,
  Gfun: Functor<G>
): (prog: Free<F, A>, env: Cofree<G, S>) => Free<PairK<F, G, S>, A> {
  const liftEnvGS = (w: Cofree<G, S>): Apply<G, [S]> =>
    Gfun.map(w.tail, (w1: Cofree<G, S>) => extractCofree(w1)) as Apply<G, [S]>;

  const go = (m: Free<F, A>, w: Cofree<G, S>): Free<PairK<F, G, S>, A> => {
    switch (m._tag) {
      case 'Pure':
        return FreePure<PairK<F, G, S>, A>(m.value);
      case 'Impure': {
        const gs = liftEnvGS(w);
        const lifted = F.map(m.fx, (next: Free<F, A>) => go(next, w)) as Apply<F, [Free<PairK<F, G, S>, A>]>;
        return FreeImpure<PairK<F, G, S>, A>([lifted, gs] as const);
      }
    }
  };
  return (prog, env) => go(prog, env);
}


