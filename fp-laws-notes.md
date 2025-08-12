## Free ⊣ U (explicit)

We model the category **Alg(F)** of F-algebras `(X, φ : F<X> → X)` and homomorphisms.
The forgetful functor `U : Alg(F) → Type` returns the carrier.
The free functor `Free_F : Type → Alg(F)` maps `A` to `(Free<F,A>, Impure)`.

We ship a hom-set isomorphism:
```
Hom_Alg(Free_F A, (X, φ))  ≅  Hom_Set(A, X)
```
with `unit: A → Free<F,A>` and `counit: Free<F,X> → X` (given by `foldFree(φ)`).

---

## How to use (quick)

- Build an algebra:
  ```ts
  const NatAlg: FAlgebra<F, number> = FAlg.obj(phi, 0);
  const U = ForgetfulF<F>();
  ```

- Lift a plain function A -> X into an algebra hom Free<F,A> -> X:
  ```ts
  const Adj = FreeForgetful<F>();
  const toHom = Adj.left(Ff, NatAlg.alg, (a: A) => seedToX(a));
  ```

- Recover the underlying set map from an algebra hom:
  ```ts
  const back = Adj.right(Ff, NatAlg.alg, toHom); // back: A -> X
  ```


