import { Kind1, Apply } from './fp-hkt';
import { Free, foldFree, Cofree, cofree } from './fp-free';

// Minimal Functor interface (local) to avoid heavy imports
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

// ---------------------------
// Core witnesses
// ---------------------------
export interface Algebra<F extends Kind1, A> {
  (fa: Apply<F, [A]>): A;
}
export interface Coalgebra<F extends Kind1, S> {
  (s: S): Apply<F, [S]>;
}

// ---------------------------
// Plain recursion schemes
// ---------------------------
export function hylo<F extends Kind1, S, A>(
  F: Functor<F>,
  alg: Algebra<F, A>,
  coalg: Coalgebra<F, S>
): (seed: S) => A {
  const go = (s: S): A =>
    alg(F.map(coalg(s), go) as Apply<F, [A]>);
  return go;
}

export function anaCofree<F extends Kind1, S>(
  F: Functor<F>,
  coalg: Coalgebra<F, S>
): (seed: S) => Cofree<F, S> {
  const go = (s: S): Cofree<F, S> =>
    cofree(s, F.map(coalg(s), go) as Apply<F, [Cofree<F, S>]>);
  return go;
}

// Fold a Free<F, A> with an F-algebra (delegates to foldFree)
export function cataFree<F extends Kind1, A>(
  F: Functor<F>,
  alg: Algebra<F, A>
): (m: Free<F, A>) => A {
  return (m) => foldFree(F, alg as any, m);
}

// ---------------------------
// Zippable/Align for pairing
// ---------------------------
export interface Align<F extends Kind1> {
  align<A, B, C>(
    fa: Apply<F, [A]>,
    fb: Apply<F, [B]>,
    f: (a: A, b: B) => C
  ): Apply<F, [C]>;
}

// Pair a Free layer with a Cofree layer, collapsing with alg
export function pairFreeCofree<F extends Kind1, A, S>(
  F: Functor<F>,
  AlignF: Align<F>,
  alg: Algebra<F, A>
): (m: Free<F, A>, w: Cofree<F, S>) => A {
  const go = (m: Free<F, A>, w: Cofree<F, S>): A => {
    switch (m._tag) {
      case 'Pure':
        return m.value;
      case 'Impure': {
        const zipped = AlignF.align(
          m.fx as Apply<F, [Free<F, A>]>,
          w.tail as Apply<F, [Cofree<F, S>]>,
          (mm, ww) => go(mm, ww)
        ) as Apply<F, [A]>;
        return alg(zipped);
      }
    }
  };
  return go;
}


