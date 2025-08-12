// fp-cofree-lazy.ts
//
// A lazy/thunked Cofree where the tail is a thunk you can force layer-by-layer.
// Includes a Comonad instance (parameterized by Functor<F>) and helpers to/from

import { Kind1, Apply } from './fp-hkt';
import { Cofree, cofree } from './fp-free';

// Minimal Functor (local) to avoid importing heavy modules
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

type Thunk<T> = () => T;

export interface LazyCofree<F extends Kind1, A> {
  readonly head: A;
  readonly tail: Thunk<Apply<F, [LazyCofree<F, A>]>>;
}

export function lazyCofree<F extends Kind1, A>(
  head: A,
  tail: Thunk<Apply<F, [LazyCofree<F, A>]>>
): LazyCofree<F, A> {
  return { head, tail };
}

export function unconsLazy<F extends Kind1, A>(
  wa: LazyCofree<F, A>
): [A, Apply<F, [LazyCofree<F, A>]>] {
  return [wa.head, wa.tail()];
}

// Map (functor over the head)
export function mapLazyCofree<F extends Kind1, A, B>(
  F: Functor<F>,
  wa: LazyCofree<F, A>,
  f: (a: A) => B
): LazyCofree<F, B> {
  return lazyCofree<F, B>(
    f(wa.head),
    () => F.map(wa.tail(), (w) => mapLazyCofree(F, w, f)) as any
  );
}

// extract / duplicate (Comonad) for LazyCofree
export function extractLazy<F extends Kind1, A>(wa: LazyCofree<F, A>): A {
  return wa.head;
}

export function duplicateLazy<F extends Kind1, A>(
  F: Functor<F>,
  wa: LazyCofree<F, A>
): LazyCofree<F, LazyCofree<F, A>> {
  return lazyCofree<F, LazyCofree<F, A>>(
    wa,
    () => F.map(wa.tail(), (w) => duplicateLazy(F, w)) as any
  );
}

// Optional: Comonad dictionary
export function LazyCofreeComonad<F extends Kind1>(F: Functor<F>) {
  return {
    extract: extractLazy as any,
    extend: <A, B>(wa: LazyCofree<F, A>, f: (w: LazyCofree<F, A>) => B): LazyCofree<F, B> =>
      mapLazyCofree(F, duplicateLazy(F, wa), f),
    map: <A, B>(wa: LazyCofree<F, A>, f: (a: A) => B) => mapLazyCofree(F, wa, f)
  };
}

// Convert: strict Cofree<F,A> -> LazyCofree<F,A>
export function toLazy<F extends Kind1, A>(
  F: Functor<F>,
  wa: Cofree<F, A>
): LazyCofree<F, A> {
  return lazyCofree(wa.head, () => F.map(wa.tail, (w) => toLazy(F, w)) as any);
}

// Convert: LazyCofree<F,A> -> strict Cofree<F,A> (forces the whole tree!)
export function toStrict<F extends Kind1, A>(
  F: Functor<F>,
  wa: LazyCofree<F, A>
): Cofree<F, A> {
  const strictTail = F.map(wa.tail(), (w) => toStrict(F, w)) as any;
  return cofree(wa.head, strictTail);
}

// Force only one layer (useful for streaming)
export function forceOne<F extends Kind1, A>(
  wa: LazyCofree<F, A>
): [A, Apply<F, [LazyCofree<F, A>]>] {
  return unconsLazy(wa);
}

// HKT witness (optional)
export interface LazyCofreeK<F extends Kind1> extends Kind1 {
  readonly type: LazyCofree<F, this['arg0']>;
}


