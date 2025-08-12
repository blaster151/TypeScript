// src/fp-typeclasses-arrows.ts
import { Kind1, Kind2, Apply } from '../fp-hkt';
import type { Monad, Functor, Applicative } from '../fp-typeclasses-hkt';

// Reuse our purity tags
export type EffectTag = 'Pure' | 'State' | 'Async' | 'IO';
export type UsageBound = 1 | '∞';

export interface Category<P extends Kind2> {
  readonly effectTag: EffectTag;
  readonly usageBound: UsageBound;
  id<A>(): Apply<P, [A, A]>;
  compose<A, B, C>(
    pbc: Apply<P, [B, C]>,
    pab: Apply<P, [A, B]>
  ): Apply<P, [A, C]>;
}

export interface Arrow<P extends Kind2> extends Category<P> {
  arr<A, B>(f: (a: A) => B): Apply<P, [A, B]>;
  first<A, B, C>(
    pab: Apply<P, [A, B]>
  ): Apply<P, [[A, C], [B, C]]>;
}

export interface ArrowChoice<P extends Kind2> extends Arrow<P> {
  left<A, B, C>(
    pab: Apply<P, [A, B]>
  ): Apply<P, [import('../fp-hkt').Either<A, C>, import('../fp-hkt').Either<B, C>]>;
}

export interface ArrowApply<P extends Kind2> extends Arrow<P> {
  // Haskell: app :: ArrowApply a => a (a b c, b) c
  app<A, B>(): Apply<P, [[Apply<P, [A, B]>, A], B]>;
}

// ---------- HKT helpers for common arrow carriers ----------

// (->) already has a Kind2 in fp-hkt as FunctionK; we’ll use that
export interface KleisliK<M extends Kind1> extends Kind2 {
  readonly type: (a: this['arg0']) => Apply<M, [this['arg1']]>;
}

// Tiny law evidence shape we’ll reuse for arrow laws
export interface LawEvidence {
  readonly name: string;
  readonly samples: number;
  readonly passed: boolean;
  readonly failures: number;
  readonly firstFailure?: string;
}

// Re-export useful imports as types only to help consumers without pulling values
export type { Monad, Functor, Applicative };


