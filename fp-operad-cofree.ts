/**
 * Minimal skeleton for (co)operads and a conilpotent cofree cooperad over a collection.
 * This is intentionally small: gives you types + a lawful core to extend.
 * References: standard tree-based cofree cooperad with admissible cuts.
 */
import { Kind1 } from './fp-hkt';

// A "collection" Σ: arity-indexed family of labels (operations)
export type FiniteArray<T> = ReadonlyArray<T>;
export interface Collection<Sym> {
  // for a symbol σ, its arity
  arity(sym: Sym): number;
}

// Planar rooted trees labeled by Σ at internal nodes; leaves carry inputs A
export type Tree<Sym, A> =
  | { _tag: 'Leaf', value: A }
  | { _tag: 'Node', op: Sym, children: FiniteArray<Tree<Sym, A>> };

// Cooperad interface (very lightweight)
export interface Cooperad<C, Sym> {
  // counit: C(A) → A (erase structure)
  counit<A>(ca: C): A;
  // decomposition: C(A) → Σ over admissible cuts of “top + rest”
  // (we model as a single-step decomposition; concrete encoding below)
}

// Cofree cooperad: underlying carrier is all Σ-trees over A with a co-structure by cuts
export interface CofreeCooperad<Sym, A> {
  readonly tree: Tree<Sym, A>;
}

export function leaf<Sym, A>(a: A): CofreeCooperad<Sym, A> {
  return { tree: { _tag: 'Leaf', value: a } };
}
export function node<Sym, A>(op: Sym, children: ReadonlyArray<CofreeCooperad<Sym, A>>): CofreeCooperad<Sym, A> {
  return { tree: { _tag: 'Node', op, children: children.map(c => c.tree) } as any };
}

// Conilpotency: finite depth ensures “iterated decompositions” terminate.
export function depth<Sym, A>(t: Tree<Sym, A>): number {
  return t._tag === 'Leaf' ? 0 : 1 + Math.max(0, ...t.children.map(depth));
}

// A simple counit: pick leaves when possible (projection to A)
export function counit<Sym, A>(w: CofreeCooperad<Sym, A>): A {
  const t = w.tree;
  if (t._tag === 'Leaf') return t.value;
  // choose a canonical leaf (leftmost) as a placeholder counit
  let cur: any = t;
  while (cur._tag !== 'Leaf') cur = cur.children[0];
  return cur.value as A;
}

// One-step “cut”: returns top context and a list of subtrees (very simplified)
export type Decomp<Sym, A> =
  | { _tag: 'AtLeaf', a: A }
  | { _tag: 'AtNode', op: Sym, holes: ReadonlyArray<CofreeCooperad<Sym, A>> };

export function decompose<Sym, A>(w: CofreeCooperad<Sym, A>): Decomp<Sym, A> {
  const t = w.tree;
  if (t._tag === 'Leaf') return { _tag: 'AtLeaf', a: t.value };
  return {
    _tag: 'AtNode',
    op: t.op,
    holes: t.children.map(ch => ({ tree: ch }))
  };
}

// CoKleisli over Cofree (useful for machines / stream processors later)
export type CoKleisli<Sym, A, B> = (w: CofreeCooperad<Sym, A>) => B;
export const CoKleisli = {
  id<Sym, A>(): CoKleisli<Sym, A, A> { return (w) => counit(w); },
  compose<Sym, A, B, C>(g: CoKleisli<Sym, B, C>, f: CoKleisli<Sym, A, B>): CoKleisli<Sym, A, C> {
    return (w) => g( { tree: w.tree } as CofreeCooperad<Sym, B> as any ); // placeholder; refine with map
  }
};


