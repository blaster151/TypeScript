// fp-cofree-lazy-iter.ts
//
// Non-recursive iterators for LazyCofree: DFS, BFS, and layer-by-layer.
// Requires Foldable<F> to step through children without knowing F's concrete shape.

import { Kind1, Apply } from './fp-hkt';
import { LazyCofree } from './fp-cofree-lazy';

// Minimal Foldable interface (local)
export interface Foldable<F extends Kind1> {
  reduce<A, B>(fa: Apply<F, [A]>, b: B, f: (b: B, a: A) => B): B;
}

// Turn F<X> into an array for iteration (left-to-right per your Foldable)
export function toArrayF<F extends Kind1, A>(Fold: Foldable<F>, fx: Apply<F, [A]>): A[] {
  const buf: A[] = [];
  return Fold.reduce(fx, buf, (acc, a) => {
    acc.push(a);
    return acc;
  });
}

// Depth-first (preorder), iterative — no recursion
export function* dfsLazy<F extends Kind1, A>(
  Fold: Foldable<F>,
  root: LazyCofree<F, A>
): Generator<A> {
  const stack: LazyCofree<F, A>[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    yield node.head;
    const kids = toArrayF(Fold, node.tail());
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
}

// Breadth-first (level order), iterative — no recursion
export function* bfsLazy<F extends Kind1, A>(
  Fold: Foldable<F>,
  root: LazyCofree<F, A>
): Generator<A> {
  const q: LazyCofree<F, A>[] = [root];
  while (q.length) {
    const node = q.shift()!;
    yield node.head;
    const kids = toArrayF(Fold, node.tail());
    for (const k of kids) q.push(k);
  }
}

// Layer-by-layer: yields arrays of heads at each depth
export function* layersLazy<F extends Kind1, A>(
  Fold: Foldable<F>,
  root: LazyCofree<F, A>
): Generator<A[]> {
  let current: LazyCofree<F, A>[] = [root];
  while (current.length) {
    const heads = current.map((n) => n.head);
    yield heads;
    const next: LazyCofree<F, A>[] = [];
    for (const n of current) {
      const kids = toArrayF(Fold, n.tail());
      next.push(...kids);
    }
    current = next;
  }
}

// Utilities that act on the stream without allocating all nodes up front
export function forEachDFS<F extends Kind1, A>(
  Fold: Foldable<F>,
  root: LazyCofree<F, A>,
  k: (a: A) => void
): void {
  for (const a of dfsLazy(Fold, root)) k(a);
}

export function takeBFS<F extends Kind1, A>(
  Fold: Foldable<F>,
  root: LazyCofree<F, A>,
  n: number
): A[] {
  const out: A[] = [];
  for (const a of bfsLazy(Fold, root)) {
    out.push(a);
    if (out.length >= n) break;
  }
  return out;
}


