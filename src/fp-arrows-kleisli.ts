// src/fp-arrows-kleisli.ts
import { Apply, Kind1, Either } from '../fp-hkt';
import type { Monad } from '../fp-typeclasses-hkt';
import { KleisliK, Category, Arrow, ArrowChoice, ArrowApply } from './fp-typeclasses-arrows';

export function arrowFromKleisli<M extends Kind1>(M: Monad<M>) {
  type K = KleisliK<M>;

  const CategoryK: Category<K> = {
    effectTag: 'Async', // conservative default; adjust per M if desired
    usageBound: '∞',    // Kleisli comp/chain can duplicate/sequence
    id: <A>() => (a: A) => M.of(a),
    compose: <A, B, C>(
      g: (b: B) => Apply<M, [C]>,
      f: (a: A) => Apply<M, [B]>
    ) => (a: A) => M.chain(f(a), g),
  };

  const ArrowK: Arrow<K> = {
    ...CategoryK,
    arr: <A, B>(f: (a: A) => B) => (a: A) => M.of(f(a)),
    first: <A, B, C>(pab: (a: A) => Apply<M, [B]>) =>
      ([a, c]: [A, C]) => M.map(pab(a), (b): [B, C] => [b, c]),
  };

  const ArrowChoiceK: ArrowChoice<K> = {
    ...ArrowK,
    left: <A, B, C>(pab: (a: A) => Apply<M, [B]>) =>
      (e: Either<A, C>): Apply<M, [Either<B, C>]> =>
        ('left' in e)
          ? M.map(pab(e.left), (b): Either<B, C> => ({ left: b }))
          : M.of(e as Either<B, C>),
  };

  const ArrowApplyK: ArrowApply<K> = {
    ...ArrowChoiceK,
    app: <A, B>() =>
      ([pab, a]: [(a: A) => Apply<M, [B]>, A]) => pab(a),
  };

  return {
    category: CategoryK,
    arrow: ArrowK,
    arrowChoice: ArrowChoiceK,
    arrowApply: ArrowApplyK,
  };
}


