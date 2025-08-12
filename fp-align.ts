import { Kind1, Apply, ArrayK, MaybeK, Maybe } from './fp-hkt';

/**
 * Align (a.k.a. Zippable) — pointwise combine two F-layers.
 * Laws (informal): shape(fa) must equal shape(fb), result shape preserved.
 */
export interface Align<F extends Kind1> {
  align<A, B, C>(
    fa: Apply<F, [A]>,
    fb: Apply<F, [B]>,
    f: (a: A, b: B) => C
  ): Apply<F, [C]>;
}

// --- Tiny, pragmatic instances (optional) ---

export const AlignArray: Align<ArrayK> = {
  align<A, B, C>(as: A[], bs: B[], f: (a: A, b: B) => C): C[] {
    const n = Math.min(as.length, bs.length);
    const out = new Array<C>(n);
    for (let i = 0; i < n; i++) out[i] = f(as[i], bs[i]);
    return out;
  },
};

export const AlignMaybe: Align<MaybeK> = {
  align<A, B, C>(ma: Maybe<A>, mb: Maybe<B>, f: (a: A, b: B) => C): Maybe<C> {
    if (ma == null || mb == null) return null as Maybe<C>;
    return f(ma as A, mb as B) as unknown as Maybe<C>;
  },
};


