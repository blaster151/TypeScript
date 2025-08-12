import { Kind1, Apply } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';
import { Align } from './fp-align';
import { Free, FreePure, FreeImpure, Cofree } from './fp-free';

/**
 * pairFreeCofree:
 * Consume a Cofree<F,S> “environment/behavior” to interpret a Free<F,A> “program”.
 *
 * Intuition:
 * - If program is Pure(a), return a.
 * - If program is Impure(F<subprograms>), zip with cofree.tail: F<subbehaviors>,
 *   recursively interpret each pair to build F<A>, then collapse this layer
 *   with an algebra that can see the current cofree.head (S).
 */
export function pairFreeCofree<F extends Kind1, S, A>(
  F: Functor<F>,
  A1: Align<F>,
  alg: (head: S, fa: Apply<F, [A]>) => A
): (m: Free<F, A>, w: Cofree<F, S>) => A {
  const go = (m: Free<F, A>, w: Cofree<F, S>): A => {
    if (m._tag === 'Pure') return m.value;
    // m: Impure with fx : F<Free<F,A>>, w.tail : F<Cofree<F,S>>
    const fa: Apply<F, [A]> = A1.align(
      (m as any).fx as Apply<F, [Free<F, A>]>,
      (w as any).tail as Apply<F, [Cofree<F, S>]>,
      (mf, wf) => go(mf, wf)
    );
    return alg(w.head, fa);
  };
  return go;
}

/**
 * stepFreeOnCofree:
 * A single-layer “stepper” that preserves one layer of Free syntax.
 * It resolves each child (Free×Cofree) to an A (using the full pairing),
 * then lifts those As back into Pure children under the same F-shape.
 *
 * Result:
 *   - Pure(a) stays Pure(a)
 *   - Impure(F<Free>) becomes Impure(F<Pure<A>>)
 */
export function stepFreeOnCofree<F extends Kind1, S, A>(
  F: Functor<F>,
  A1: Align<F>,
  alg: (head: S, fa: Apply<F, [A]>) => A
): (m: Free<F, A>, w: Cofree<F, S>) => Free<F, A> {
  const pair = pairFreeCofree(F, A1, alg); // reuse the total interpreter
  const step = (m: Free<F, A>, w: Cofree<F, S>): Free<F, A> => {
    if (m._tag === 'Pure') return m;
    const fa: Apply<F, [A]> = A1.align(
      (m as any).fx as Apply<F, [Free<F, A>]>,
      (w as any).tail as Apply<F, [Cofree<F, S>]>,
      (mf, wf) => pair(mf, wf) // fully resolve each child to A
    );
    // rebuild one Impure layer whose children are now Pure<A>
    const lifted: Apply<F, [Free<F, A>]> = F.map(fa, (a) => FreePure<F, A>(a)) as any;
    return FreeImpure<F, A>(lifted);
  };
  return step;
}


