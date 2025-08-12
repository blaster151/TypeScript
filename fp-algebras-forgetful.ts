/**
 * F-ALGEBA CATEGORY + FORGETFUL FUNCTOR U
 * Free F ⊣ U made explicit (objects: (X, φ: F<X> -> X); morphisms: algebra homs).
 *
 * Pairs cleanly with your existing Free encoding and foldFree/mapFree.
 */

import { Kind1, Apply } from './fp-hkt';
import { Free, FreePure, foldFree, mapFree } from './fp-free';

// Minimal Functor (local) to keep this file self-contained
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

// ----------------------
// F-ALGEBA OBJECTS & MORPHISMS
// ----------------------
export interface FAlgebra<F extends Kind1, X> {
  readonly carrier: X;
  readonly alg: (fx: Apply<F, [X]>) => X;
}

// A homomorphism of algebras h : (X,φ) → (Y,ψ) satisfies:
// h ∘ φ = ψ ∘ F.map(·, h)
export interface FAlgHom<F extends Kind1, X, Y> {
  readonly from: FAlgebra<F, X>;
  readonly to: FAlgebra<F, Y>;
  readonly run: (x: X) => Y;
  // Law (documented): run(from.alg(F.map(fx, run))) === to.alg(F.map(fx, run))
}

export const FAlg = {
  obj<F extends Kind1, X>(alg: (fx: Apply<F, [X]>) => X, carrier: X): FAlgebra<F, X> {
    return { carrier, alg };
  },
  hom<F extends Kind1, X, Y>(from: FAlgebra<F, X>, to: FAlgebra<F, Y>, run: (x: X) => Y): FAlgHom<F, X, Y> {
    return { from, to, run };
  }
};

// ----------------------
// FORGETFUL FUNCTOR U : Alg(F) → Type
// ----------------------
export interface Forgetful<F extends Kind1> {
  // U on objects: (X,φ) ↦ X (the carrier)
  carrier<X>(obj: FAlgebra<F, X>): X;
  // U on morphisms: (h: (X,φ)→(Y,ψ)) ↦ (X→Y)
  mapHom<X, Y>(hom: FAlgHom<F, X, Y>): (x: X) => Y;
}

export function ForgetfulF<F extends Kind1>(): Forgetful<F> {
  return {
    carrier: <X>(obj: FAlgebra<F, X>) => obj.carrier,
    mapHom: <X, Y>(hom: FAlgHom<F, X, Y>) => hom.run
  };
}

// ----------------------
// FREE FUNCTOR Free_F : Type → Alg(F)
// ----------------------
// On objects: A ↦ (Free<F, A>,  impure : F<Free<F,A>> → Free<F,A>)
// On morphisms: f : A → B ↦ liftFree(f) : Free<F,A> → Free<F,B>
export interface FreeOn<F extends Kind1> {
  obj<A>(): FAlgebra<F, Free<F, A>>;
  map<A, B>(Ff: Functor<F>, f: (a: A) => B): (m: Free<F, A>) => Free<F, B>;
}

export function FreeFunctor<F extends Kind1>(): FreeOn<F> {
  return {
    obj: <A>() => ({
      carrier: undefined as unknown as Free<F, A>,
      alg: (fx: Apply<F, [Free<F, A>]>) => ({ _tag: 'Impure', fx } as Free<F, A>)
    }),
    map: <A, B>(Ff: Functor<F>, f: (a: A) => B) =>
      (m: Free<F, A>): Free<F, B> => mapFree(Ff, m, f)
  };
}

// ----------------------
// ADJUNCTION Free ⊣ U  (Hom_Alg(Free A, (X,φ)) ≅ Hom_Set(A, X))
// Concrete hom-set isomorphism (left/right) + unit/counit witnesses.
// ----------------------
export interface FreeForgetfulAdjunction<F extends Kind1> {
  // φ_X : Hom_Set(A, X) → Hom_Alg(Free A, (X,alg))
  left<A, X>(Ff: Functor<F>, algX: (fx: Apply<F, [X]>) => X, h: (a: A) => X): (m: Free<F, A>) => X;
  // φ⁻¹_X : Hom_Alg(Free A, (X,alg)) → Hom_Set(A, X)
  right<A, X>(_Ff: Functor<F>, _algX: (fx: Apply<F, [X]>) => X, hom: (m: Free<F, A>) => X): (a: A) => X;

  // Unit η_A : A → U(Free A) = Free<F,A>
  unit<A>(a: A): Free<F, A>;
  // Counit ε_(X,alg) : Free<F, X> → X   (algebra fold)
  counit<X>(Ff: Functor<F>, algX: (fx: Apply<F, [X]>) => X): (m: Free<F, X>) => X;
}

export function FreeForgetful<F extends Kind1>(): FreeForgetfulAdjunction<F> {
  return {
    left: <A, X>(Ff: Functor<F>, algX: (fx: Apply<F, [X]>) => X, h: (a: A) => X) =>
      (m: Free<F, A>): X => foldFree(Ff, algX, mapFree(Ff, m, h as any) as any),

    right: <A, X>(_Ff: Functor<F>, _algX: (fx: Apply<F, [X]>) => X, hom: (m: Free<F, A>) => X) =>
      (a: A): X => hom(FreePure<F, A>(a)),

    unit: <A>(a: A) => FreePure<F, A>(a),

    counit: <X>(Ff: Functor<F>, algX: (fx: Apply<F, [X]>) => X) =>
      (m: Free<F, X>): X => foldFree(Ff, algX, m)
  };
}

// ----------------------
// SANITY / LAW HELPERS (optional but handy)
// ----------------------
export function checkFreeForgetfulAdjunction<F extends Kind1, A, X>(
  Ff: Functor<F>,
  algX: (fx: Apply<F, [X]>) => X,
  genA: () => A,
  genM: () => Free<F, A>,
  h: (a: A) => X,
  eqX: (x: X, y: X) => boolean,
  samples = 50
): boolean {
  const Adj = FreeForgetful<F>();
  // right ∘ left = id on Hom_Set(A, X)
  let ok1 = true;
  for (let i = 0; i < samples && ok1; i++) {
    const left = Adj.left(Ff, algX, h);
    const back = Adj.right(Ff, algX, left);
    ok1 = eqX(h(genA()), back(genA()));
  }
  // left ∘ right = id on Hom_Alg(Free A, (X,alg)) for a sample hom
  let ok2 = true;
  for (let i = 0; i < samples && ok2; i++) {
    const hom = (m: Free<F, A>) => Adj.counit(Ff, algX)(mapFree(Ff, m, h as any) as any);
    const forth = Adj.left(Ff, algX, Adj.right(Ff, algX, hom));
    ok2 = eqX(h(genA()), forth(FreePure<F, A>(genA())));
  }
  return ok1 && ok2;
}


