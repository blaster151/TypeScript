/**
 * Natural transformations and Functor category utilities
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';

// Effect lattice: Pure < State < Async < IO
export type EffectTag = 'Pure' | 'State' | 'Async' | 'IO';

const effectLevel: Record<EffectTag, number> = {
  Pure: 0,
  State: 1,
  Async: 2,
  IO: 3
};

export function joinEffectTag(a: EffectTag, b: EffectTag): EffectTag {
  const max = Math.max(effectLevel[a], effectLevel[b]);
  return (Object.keys(effectLevel) as EffectTag[]).find(k => effectLevel[k] === max)!;
}

// Usage bound combine: 1 * 1 = 1; otherwise ∞
export type UsageBound = 1 | '∞';
export function multiplyUsage(a: UsageBound, b: UsageBound): UsageBound {
  return a === 1 && b === 1 ? 1 : '∞';
}

// Natural transformation F ~> G (unary kinds)
export interface NaturalTransformation<F extends Kind1, G extends Kind1> {
  readonly effectTag: EffectTag;
  readonly usageBound: UsageBound;
  run<A>(fa: Apply<F, [A]>): Apply<G, [A]>;
}

export type Nat<F extends Kind1, G extends Kind1> = NaturalTransformation<F, G>;

// Functor category utilities: identities and composition
export const FunctorCategory = {
  id<F extends Kind1>(): NaturalTransformation<F, F> {
    return {
      effectTag: 'Pure',
      usageBound: 1,
      run: <A>(fa: Apply<F, [A]>): Apply<F, [A]> => fa
    };
  },

  compose<F extends Kind1, G extends Kind1, H extends Kind1>(
    beta: NaturalTransformation<G, H>,
    alpha: NaturalTransformation<F, G>
  ): NaturalTransformation<F, H> {
    return {
      effectTag: joinEffectTag(alpha.effectTag, beta.effectTag),
      usageBound: multiplyUsage(alpha.usageBound, beta.usageBound),
      run: <A>(fa: Apply<F, [A]>): Apply<H, [A]> => beta.run(alpha.run(fa))
    };
  }
};

// Naturality check: G.map(alpha.run(fa), f) === alpha.run(F.map(fa, f))
export function checkNaturality<F extends Kind1, G extends Kind1, A, B>(
  alpha: NaturalTransformation<F, G>,
  Finst: Functor<F>,
  Ginst: Functor<G>,
  fa: Apply<F, [A]>,
  f: (a: A) => B,
  eq: (x: Apply<G, [B]>, y: Apply<G, [B]>) => boolean
): boolean {
  const left = Ginst.map(alpha.run(fa), f);
  const right = alpha.run(Finst.map(fa, f));
  return eq(left, right);
}


