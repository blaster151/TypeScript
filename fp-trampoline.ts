// fp-trampoline.ts
//
// A tiny trampoline plus a Traversable-powered "streaming toStrict" for LazyCofree.
// Works one layer at a time, no deep recursion required.

import { Kind1, Apply } from './fp-hkt';
import { Cofree, cofree } from './fp-free';
import { LazyCofree } from './fp-cofree-lazy';

// Minimal local typeclasses
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}
export interface Applicative<F extends Kind1> extends Functor<F> {
  of<A>(a: A): Apply<F, [A]>;
  ap<A, B>(fab: Apply<F, [(a: A) => B]>, fa: Apply<F, [A]>): Apply<F, [B]>;
}
export interface Traversable<F extends Kind1> extends Functor<F> {
  traverse<G extends Kind1, A, B>(
    app: Applicative<G>,
    fa: Apply<F, [A]>,
    f: (a: A) => Apply<G, [B]>
  ): Apply<G, [Apply<F, [B]>]>;
}

// ------------------------
// Trampoline (Done|More)
// ------------------------
export type Trampoline<T> = { tag: 'done'; value: T } | { tag: 'more'; thunk: () => Trampoline<T> };
export const Tramp = {
  done: <T>(value: T): Trampoline<T> => ({ tag: 'done', value }),
  more: <T>(thunk: () => Trampoline<T>): Trampoline<T> => ({ tag: 'more', thunk })
};
export function runTrampoline<T>(t: Trampoline<T>): T {
  let cur: Trampoline<T> = t;
  for (;;) {
    if (cur.tag === 'done') return cur.value;
    cur = cur.thunk();
  }
}

// Minimal Applicative instance for Trampoline (sufficient for Traversable.traverse)
export const TrampolineApplicative: Applicative<any> = {
  of: Tramp.done,
  map: <A, B>(ta: Trampoline<A>, f: (a: A) => B): Trampoline<B> =>
    ta.tag === 'done' ? Tramp.done(f(ta.value)) : Tramp.more(() => TrampolineApplicative.map(ta.thunk(), f)),
  ap: <A, B>(tf: Trampoline<(a: A) => B>, ta: Trampoline<A>): Trampoline<B> => {
    if (tf.tag === 'done' && ta.tag === 'done') return Tramp.done(tf.value(ta.value));
    if (tf.tag === 'more') return Tramp.more(() => TrampolineApplicative.ap(tf.thunk(), ta));
    return Tramp.more(() => TrampolineApplicative.ap(tf, ta.thunk()));
  }
};

// ------------------------
// Streaming toStrict
// ------------------------
// Requires Traversable<F> so we can traverse F<Trampoline<X>> -> Trampoline<F<X>>
// This keeps the whole conversion in trampoline space until the very end.
export function toStrictTramp<F extends Kind1, A>(
  F: Functor<F> & Traversable<F>,
  wa: LazyCofree<F, A>
): Cofree<F, A> {
  const build = (w: LazyCofree<F, A>): Trampoline<Cofree<F, A>> =>
    Tramp.more(() => {
      const tailF: Apply<F, [LazyCofree<F, A>]> = w.tail();
      const trampTail: Trampoline<Apply<F, [Cofree<F, A>]>> =
        F.traverse(TrampolineApplicative as any, tailF, (child) => build(child)) as any;
      return Tramp.more(() => {
        const strictTail = runTrampoline(trampTail);
        return Tramp.done(cofree(w.head, strictTail));
      });
    });
  return runTrampoline(build(wa));
}

// Convenience: sequence a functor of trampolines (if you need it)
export function sequenceTrampoline<F extends Kind1, A>(
  F: Traversable<F>,
  fta: Apply<F, [Trampoline<A>]>
): Trampoline<Apply<F, [A]>> {
  return F.traverse(TrampolineApplicative as any, fta, (x) => x) as any;
}


