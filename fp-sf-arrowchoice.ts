// fp-sf-arrowchoice.ts
//
// ArrowChoice for pure Mealy-style stream functions:
// SF<I, O> ≅ { step: (i: I) => [O, SF<I,O>] }
// This version has no initial O; arr/id/compose/first/left are total and law-abiding.
// If you already created an SF elsewhere, wire these dictionaries to it;
// otherwise, this file is standalone.

import { Kind2, Apply } from './fp-hkt';

// Minimal SF definition
export interface SF<I, O> {
  step(i: I): [O, SF<I, O>];
}

// HKT wrapper
export interface SFK extends Kind2 {
  readonly type: SF<this['arg0'], this['arg1']>;
}

// Helpers
export const sf = <I, O>(f: (i: I) => [O, SF<I, O>]): SF<I, O> => ({ step: f });

// Category / Arrow / ArrowChoice
export interface Category<Arr extends Kind2> {
  id<A>(): Apply<Arr, [A, A]>;
  compose<A, B, C>(g: Apply<Arr, [B, C]>, f: Apply<Arr, [A, B]>): Apply<Arr, [A, C]>;
}

export interface Arrow<Arr extends Kind2> extends Category<Arr> {
  arr<A, B>(f: (a: A) => B): Apply<Arr, [A, B]>;
  first<A, B, C>(pab: Apply<Arr, [A, B]>): Apply<Arr, [[A, C], [B, C]]>;
}

export type Either<L, R> = { left: L } | { right: R };
export const Left = <L, R = never>(left: L): Either<L, R> => ({ left });
export const Right = <R, L = never>(right: R): Either<L, R> => ({ right });

export interface ArrowChoiceTC<Arr extends Kind2> extends Arrow<Arr> {
  left<A, B, C>(pab: Apply<Arr, [A, B]>): Apply<Arr, [Either<A, C>, Either<B, C>]>;
}

// Dictionaries
export const categorySF: Category<SFK> = {
  id: <A>() =>
    sf<A, A>((a) => [a, categorySF.id<A>() as SF<A, A>]) as any,
  compose: <A, B, C>(g: SF<B, C>, f: SF<A, B>) =>
    sf<A, C>((a: A) => {
      const [b, f1] = f.step(a);
      const [c, g1] = g.step(b);
      return [c, categorySF.compose(g1 as any, f1 as any) as SF<A, C>];
    }) as any
};

export const arrowSF: Arrow<SFK> = {
  ...categorySF,
  arr: <A, B>(f: (a: A) => B) =>
    sf<A, B>((a) => [f(a), arrowSF.arr(f) as SF<A, B>]) as any,
  first: <A, B, C>(pab: SF<A, B>) =>
    sf<[A, C], [B, C]>(([a, c]) => {
      const [b, pab1] = pab.step(a);
      return [[b, c], arrowSF.first(pab1) as SF<[A, C], [B, C]>];
    }) as any
};

export const arrowChoiceSF: ArrowChoiceTC<SFK> = {
  ...arrowSF,
  left: <A, B, C>(pab: SF<A, B>) =>
    sf<Either<A, C>, Either<B, C>>((eac) => {
      if ('left' in eac) {
        const [b, pab1] = pab.step(eac.left as A);
        return [Left<B, C>(b), arrowChoiceSF.left(pab1) as SF<Either<A, C>, Either<B, C>>];
      } else {
        return [Right<B, C>(eac.right as C), arrowChoiceSF.left(pab) as SF<Either<A, C>, Either<B, C>>];
      }
    }) as any
};

// Optional: quick registration hook (adapt to your registry/law runner)
export function registerSFArrowChoice(reg: {
  registerHKT: (name: string, hkt: string) => void;
  registerTypeclass: (name: string, cls: string, dict: any) => void;
}) {
  reg.registerHKT('SF', 'SFK');
  reg.registerTypeclass('SF', 'Category', categorySF);
  reg.registerTypeclass('SF', 'Arrow', arrowSF);
  reg.registerTypeclass('SF', 'ArrowChoice', arrowChoiceSF);
}


