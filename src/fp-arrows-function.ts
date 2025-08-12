// src/fp-arrows-function.ts
import type { Either, FunctionK } from '../fp-hkt';
import { Category, Arrow, ArrowChoice, ArrowApply } from './fp-typeclasses-arrows';

export const FunctionCategory: Category<FunctionK> = {
  effectTag: 'Pure',
  usageBound: 1,
  id: <A>() => (a: A) => a,
  compose: <A, B, C>(g: (b: B) => C, f: (a: A) => B) => (a: A) => g(f(a)),
};

export const FunctionArrow: Arrow<FunctionK> = {
  ...FunctionCategory,
  arr: <A, B>(f: (a: A) => B) => f,
  first: <A, B, C>(pab: (a: A) => B) =>
    ([a, c]: [A, C]): [B, C] => [pab(a), c],
};

export const FunctionArrowChoice: ArrowChoice<FunctionK> = {
  ...FunctionArrow,
  left: <A, B, C>(pab: (a: A) => B) =>
    (e: Either<A, C>): Either<B, C> =>
      ('left' in e ? { left: pab(e.left) } : e),
};

export const FunctionArrowApply: ArrowApply<FunctionK> = {
  ...FunctionArrowChoice,
  app: <A, B>() =>
    ([pab, a]: [(a: A) => B, A]): B => pab(a),
};


