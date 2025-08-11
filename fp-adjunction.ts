/**
 * Adjunctions, and derivations of Monad (R∘L) and Comonad (L∘R)
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor, Monad } from './fp-typeclasses-hkt';
import { NaturalTransformation, joinEffectTag, multiplyUsage, EffectTag, UsageBound } from './fp-nat';

// Identity functor wrapper (for signatures)
export interface IdK extends Kind1 { readonly type: this['arg0']; }

export interface ComposeK<F extends Kind1, G extends Kind1> extends Kind1 {
  readonly type: Apply<F, [Apply<G, [this['arg0']]>]>;
}

export interface Adjunction<L extends Kind1, R extends Kind1> {
  readonly left: L;
  readonly right: R;
  readonly effectTag: EffectTag;
  readonly usageBound: UsageBound;
  // unit η: Id ~> R∘L
  unit<A>(a: A): Apply<R, [Apply<L, [A]>]>;
  // counit ε: L∘R ~> Id
  counit<A>(lra: Apply<L, [Apply<R, [A]>]>): A;
}

// Derived Monad T = R ∘ L
export function monadFromAdjunction<L extends Kind1, R extends Kind1>(
  A: Adjunction<L, R>,
  Lf: Functor<L>,
  Rf: Functor<R>
): { effectTag: EffectTag; usageBound: UsageBound; monad: Monad<ComposeK<R, L>> } {
  type T<A> = Apply<R, [Apply<L, [A]>]>;
  const effectTag = A.effectTag;
  const usageBound = A.usageBound;

  const of = <A>(a: A): T<A> => A.unit(a);

  const map = <A, B>(ta: T<A>, f: (a: A) => B): T<B> =>
    Rf.map(ta, (la: Apply<L, [A]>) => Lf.map(la, f)) as unknown as T<B>;

  const join = <A>(tta: T<T<A>>): T<A> =>
    Rf.map(tta, (ltra: Apply<L, [T<A>]>) => A.counit<T<A>>(ltra)) as unknown as T<A>;

  const chain = <A, B>(ta: T<A>, k: (a: A) => T<B>): T<B> =>
    join(map(ta, k));

  const ap = <A, B>(tf: T<(a: A) => B>, ta: T<A>): T<B> =>
    chain(tf, (f) => map(ta, f));

  return {
    effectTag,
    usageBound,
    monad: {
      of,
      chain,
      map: (fa, f) => map(fa as any, f) as any,
      ap: (fab, fa) => ap(fab as any, fa as any) as any
    }
  };
}

// Derived Comonad U = L ∘ R (interface + basic ops)
export interface Comonad<F extends Kind1> extends Functor<F> {
  extract<A>(fa: Apply<F, [A]>): A;
  extend<A, B>(fa: Apply<F, [A]>, f: (wa: Apply<F, [A]>) => B): Apply<F, [B]>;
}

export function comonadFromAdjunction<L extends Kind1, R extends Kind1>(
  A: Adjunction<L, R>,
  Lf: Functor<L>,
  Rf: Functor<R>
): { effectTag: EffectTag; usageBound: UsageBound; comonad: Comonad<ComposeK<L, R>> } {
  type U<A> = Apply<L, [Apply<R, [A]>]>;
  const extract = <A>(ura: U<A>): A => A.counit(ura);

  const map = <A, B>(ua: U<A>, f: (a: A) => B): U<B> =>
    Lf.map(ua, (ra: Apply<R, [A]>) => Rf.map(ra, f)) as unknown as U<B>;

  const duplicate = <A>(ua: U<A>): U<U<A>> =>
    Lf.map(ua, (ra: Apply<R, [A]>) => A.unit<Apply<R, [A]>>(ra)) as unknown as U<U<A>>;

  const extend = <A, B>(ua: U<A>, f: (wa: U<A>) => B): U<B> =>
    map(duplicate(ua), f);

  return {
    effectTag: A.effectTag,
    usageBound: A.usageBound,
    comonad: {
      map: (fa, f) => map(fa as any, f) as any,
      extract: (fa) => extract(fa as any),
      extend: (fa, f) => extend(fa as any, f as any) as any
    }
  };
}

// Triangle identity checks (sample-based)
export type Gen<T> = () => T;
export type Eq<T> = (a: T, b: T) => boolean;

export function checkTriangles<L extends Kind1, R extends Kind1, X, Y>(
  A: Adjunction<L, R>,
  Lf: Functor<L>,
  Rf: Functor<R>,
  genLX: Gen<Apply<L, [X]>>, eqLX: Eq<Apply<L, [X]>>,
  genRY: Gen<Apply<R, [Y]>>, eqRY: Eq<Apply<R, [Y]>>,
  samples = 50
): boolean {
  // Triangle 1: ε_{L X} ∘ L(η_X) = id_{L X}
  let t1ok = true;
  for (let i = 0; i < samples && t1ok; i++) {
    const lx = genLX();
    const l_eta = Lf.map(lx, (x: any) => A.unit(x)); // L(η_X): L X -> L R L X
    const left = A.counit(l_eta as any) as Apply<L, [X]>; // ε_{L X}: L R L X -> L X
    t1ok = eqLX(left, lx);
  }
  // Triangle 2: R(ε_Y) ∘ η_{R Y} = id_{R Y}
  let t2ok = true;
  for (let i = 0; i < samples && t2ok; i++) {
    const ry = genRY();
    const eta = A.unit(ry as any) as Apply<R, [Apply<L, [Apply<R, [Y]>]>]>; // η_{R Y}: R Y -> R L R Y
    const left = Rf.map(eta as any, (lry: any) => A.counit<Y>(lry)) as Apply<R, [Y]>; // R(ε_Y)
    t2ok = eqRY(left, ry);
  }
  return t1ok && t2ok;
}


