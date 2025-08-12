/**
 * Adjunction witnesses for Free and Cofree
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';
import { Adjunction, monadFromAdjunction, comonadFromAdjunction, Comonad } from './fp-adjunction';
import { Free, FreePure, FreeImpure, foldFree, FreeK, Cofree, cofree, extractCofree, duplicateCofree, CofreeK } from './fp-free';

// Forgetful functor U: Alg(F) -> Type is modeled operationally by providing an F-algebra when folding.
// For practical wiring, we witness the adjunction on Type by using the standard Free/Cofree folds/unfolds.

// Adjunction for Free: FreeF ⊣ U
export function adjunctionFree<F extends Kind1>(
  F: Functor<F>,
  algebra: <A>(fa: Apply<F, [A]>) => A
) {
  type L = FreeK<F>; // left adjoint
  // Right adjoint here acts as identity on Type, but counit consumes an algebra; we encode via folds.
  // We model U as IdK in the signatures and carry algebra at fold sites where needed.

  const adj: Adjunction<L, any> = {
    left: {} as L,
    right: {} as any,
    effectTag: 'Pure',
    usageBound: 1,
    unit: <A>(a: A) => (FreePure<F, A>(a) as unknown) as Apply<any, [Apply<L, [A]>]>,
    counit: <A>(lra: Apply<L, [Apply<any, [A]>]>): A => foldFree(F, algebra as any, lra as unknown as Free<F, A>)
  };

  return adj;
}

// Adjunction for Cofree: U ⊣ CofreeF
export function adjunctionCofree<F extends Kind1>(
  F: Functor<F>,
  coalgebra: <A>(a: A) => Apply<F, [A]>
) {
  type R = CofreeK<F>; // right adjoint
  const adj: Adjunction<any, R> = {
    left: {} as any,
    right: {} as R,
    effectTag: 'Pure',
    usageBound: 1,
    unit: <A>(a: A) => (cofree<F, A>(a, F.map(coalgebra(a), (x: any) => cofree<F, A>(x, coalgebra(x) as any)) as any)) as unknown as Apply<R, [Apply<any, [A]>]>,
    counit: <A>(lra: Apply<any, [Apply<R, [A]>]>): A => {
      // ε_A: L(R A) -> A, extract head when L ~ Identity-like
      return extractCofree(lra as unknown as Cofree<F, A>);
    }
  };
  return adj;
}

// Registration helpers to derive Monad/Comonad instances (exposed for registry integration)
export function deriveFreeMonad<F extends Kind1>(F: Functor<F>) {
  const adj = adjunctionFree(F);
  return monadFromAdjunction(adj as any, { map: <A, B>(fa: Free<F, A>, f: (a: A) => B) => FreePure<F, B>(f((fa as any).value)) as any } as Functor<any>, { map: <A, B>(fa: any, f: (a: A) => B) => fa } as Functor<any>);
}

export function deriveCofreeComonad<F extends Kind1>(F: Functor<F>) {
  const adj = adjunctionCofree(F);
  return comonadFromAdjunction(adj as any, { map: <A, B>(fa: Cofree<F, A>, f: (a: A) => B) => ({ head: f(fa.head), tail: F.map(fa.tail, (w: any) => ({ head: f(w.head), tail: F.map(w.tail, (t: any) => t) as any })) as any }) as any } as Functor<any>, { map: <A, B>(fa: any, f: (a: A) => B) => fa } as Functor<any>);
}

// If you want to re-export the explicit forgetful witness to keep the API discoverable:
export {
  FAlgebra,
  FAlgHom,
  FAlg,
  ForgetfulF,
  FreeFunctor,
  FreeForgetful,
  checkFreeForgetfulAdjunction
} from './fp-algebras-forgetful';


