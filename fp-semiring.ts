/**
 * Semiring + Kleene/Star + generic matrix closure.
 * Pairs nicely with transitive/shortest-path closure:
 *  - Boolean semiring (∨, ∧) → reachability
 *  - Tropical semiring (min, +) → shortest paths
 */

// ---------- Type classes ----------
export interface Semiring<A> {
  readonly zero: A;                 // additive identity
  readonly one: A;                  // multipliclicative identity
  add(x: A, y: A): A;               // ⊕
  mul(x: A, y: A): A;               // ⊗
}

// Kleene algebra / star semiring
export interface StarSemiring<A> extends Semiring<A> {
  star(a: A): A;                    // a*  = 1 ⊕ a ⊕ a^2 ⊕ ...
}

// ---------- Instances ----------
export const BoolSemiring: StarSemiring<boolean> = {
  zero: false,             // ∨-identity
  one: true,               // ∧-identity
  add: (x, y) => x || y,   // ⊕ = ∨
  mul: (x, y) => x && y,   // ⊗ = ∧
  star: (_a) => true       // in Boolean dioid, a* = true
};

export const NatSemiring: StarSemiring<number> = {
  zero: 0,
  one: 1,
  add: (x, y) => x + y,
  mul: (x, y) => x * y,
  // formal star diverges over ℕ; provide guarded star for a∈{0}
  star: (a) => (a === 0 ? 1 : Number.POSITIVE_INFINITY)
};

// Tropical (min,+); “one” is 0 for ⊗, “zero” is +∞ for ⊕
export const TropicalSemiring: StarSemiring<number> = {
  zero: Number.POSITIVE_INFINITY,       // min-identity
  one: 0,                               // + identity
  add: (x, y) => Math.min(x, y),        // ⊕ = min
  mul: (x, y) => x + y,                 // ⊗ = +
  // Kleene star solves 1 ⊕ a ⊗ x = x; in tropics, star(a)=0 if a≥0 else -∞
  star: (a) => (a >= 0 ? 0 : Number.NEGATIVE_INFINITY)
};

// ---------- Small helpers ----------
export function powS<A>(S: Semiring<A>, a: A, n: number): A {
  let acc = S.one, base = a, k = n;
  while (k > 0) {
    if (k & 1) acc = S.mul(acc, base);
    base = S.mul(base, base);
    k >>= 1;
  }
  return acc;
}

// ---------- Matrices over a semiring ----------
export type Matrix<A> = A[][];

export function matMul<A>(S: Semiring<A>, X: Matrix<A>, Y: Matrix<A>): Matrix<A> {
  const n = X.length, m = Y[0].length, k = Y.length;
  const Z: Matrix<A> = Array.from({ length: n }, () => Array(m).fill(S.zero));
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < k; t++) {
      const xit = X[i][t];
      if (xit === S.zero) continue;
      for (let j = 0; j < m; j++) {
        Z[i][j] = S.add(Z[i][j], S.mul(xit, Y[t][j]));
      }
    }
  }
  return Z;
}

export function matId<A>(S: Semiring<A>, n: number): Matrix<A> {
  const I: Matrix<A> = Array.from({ length: n }, () => Array(n).fill(S.zero));
  for (let i = 0; i < n; i++) I[i][i] = S.one;
  return I;
}

// Reflexive closure: A ↦ I ⊕ A
export function reflexive<A>(S: Semiring<A>, A0: Matrix<A>): Matrix<A> {
  const n = A0.length;
  const I = matId(S, n);
  const R = A0.map((row, i) => row.map((aij, j) => S.add(I[i][j], aij)));
  return R;
}

// Warshall-style closure over a StarSemiring:
// C := (I ⊕ A) with iterative C[i,j] ⊕= C[i,k] ⊗ (A[k,k])^* ⊗ C[k,j]
// For boolean/tropical, reduces to classic transitive/shortest-path closure.
export function closure<A>(S: StarSemiring<A>, A0: Matrix<A>): Matrix<A> {
  const n = A0.length;
  const C = reflexive(S, A0).map(row => row.slice());
  for (let k = 0; k < n; k++) {
    const akkStar = S.star(A0[k][k]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const via = S.mul(C[i][k], S.mul(akkStar, C[k][j]));
        C[i][j] = S.add(C[i][j], via);
      }
    }
  }
  return C;
}

// ---------- Ready-made closures ----------
export function transitiveClosureBool(adj: Matrix<boolean>): Matrix<boolean> {
  return closure(BoolSemiring, adj);
}
export function shortestPathsTropical(weight: Matrix<number>): Matrix<number> {
  return closure(TropicalSemiring, weight);
}


