/**
 * Generic closure operators (idempotent, extensive, monotone) + fixpoint utilities.
 * Handy for epsilon-closure, saturation passes, normal-form computations.
 */

export interface Preorder<T> { leq(x: T, y: T): boolean; }
export interface ClosureOperator<T> { close(x: T): T; }

export function isExtensive<T>(C: ClosureOperator<T>, P: Preorder<T>, x: T): boolean {
  return P.leq(x, C.close(x));
}

export function isIdempotent<T>(C: ClosureOperator<T>, eq: (a: T, b: T) => boolean, x: T): boolean {
  return eq(C.close(x), C.close(C.close(x)));
}

export function isMonotone<T>(C: ClosureOperator<T>, P: Preorder<T>, x: T, y: T): boolean {
  return P.leq(x, y) ? P.leq(C.close(x), C.close(y)) : true;
}

// Generic least fixpoint by iteration under a partial order
export function lfp<T>(f: (x: T) => T, eq: (a: T, b: T) => boolean, seed: T, maxIters = 10_000): T {
  let x = seed;
  for (let i = 0; i < maxIters; i++) {
    const y = f(x);
    if (eq(x, y)) return y;
    x = y;
  }
  return x;
}

// Example: set closure (finite) with subset order
export function subsetPreorder<T>(): Preorder<Set<T>> {
  return {
    leq: (a, b) => {
      for (const x of Array.from(a)) {
        if (!b.has(x)) return false;
      }
      return true;
    }
  };
}

export function setEq<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const x of Array.from(a)) if (!b.has(x)) return false;
  return true;
}

export function saturateSet<T>(step: (s: Set<T>) => Set<T>, seed: Set<T>): Set<T> {
  return lfp(step, setEq, seed);
}

// Notes:
// - lfp can express ε-closure on NFAs, Datalog-ish saturations, or “keep fusing until stable”.


