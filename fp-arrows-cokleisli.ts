import { Kind1, Kind2, Apply, Either } from './fp-hkt';

// Local minimal interfaces to keep this file self-contained
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

export interface Comonad<F extends Kind1> extends Functor<F> {
  extract<A>(fa: Apply<F, [A]>): A;
  extend<A, B>(fa: Apply<F, [A]>, f: (wa: Apply<F, [A]>) => B): Apply<F, [B]>;
}
export interface Profunctor<P extends Kind2> {
  dimap<A, B, C, D>(
    pab: Apply<P, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ): Apply<P, [C, D]>;
}

export interface Strong<P extends Kind2> extends Profunctor<P> {
  first<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
  second<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[C, A], [C, B]]>;
}

export interface Choice<P extends Kind2> extends Profunctor<P> {
  left<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
  right<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<C, A>, Either<C, B>]>;
}

export interface Category<P extends Kind2> {
  id<A>(): Apply<P, [A, A]>;
  compose<A, B, C>(pbc: Apply<P, [B, C]>, pab: Apply<P, [A, B]>): Apply<P, [A, C]>;
}

export interface Arrow<P extends Kind2> extends Category<P> {
  arr<A, B>(f: (a: A) => B): Apply<P, [A, B]>;
  first<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
}

export interface ArrowChoice<P extends Kind2> extends Arrow<P> {
  left<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
}

// ---------------------------------------------
// CoKleisli: newtype wrapper
// ---------------------------------------------
export type CoKleisli<W extends Kind1, A, B> = (wa: Apply<W, [A]>) => B;
export interface CoKleisliK<W extends Kind1> extends Kind2 {
  readonly type: (wa: Apply<W, [this['arg0']]>) => this['arg1'];
}

// Either helpers aligned with fp-hkt shape
const Left = <L, R = never>(value: L): Either<L, R> => ({ left: value });
const Right = <L, R = never>(value: R): Either<L, R> => ({ right: value });

// ---------------------------------------------
// Profunctor witnesses for CoKleisli
// dimap uses Functor<W> for contramap on input, plain post-map on output
// ---------------------------------------------
export function ProfunctorFromCoKleisli<W extends Kind1>(W: Pick<Comonad<W>, 'map'>): Profunctor<CoKleisliK<W>> {
  return {
    dimap: <A, B, C, D>(
      pab: CoKleisli<W, A, B>,
      f: (c: C) => A,
      g: (b: B) => D
    ): CoKleisli<W, C, D> =>
      (wc: Apply<W, [C]>) => g(pab(W.map(wc, f))) as any
  };
}

// Strong: needs extract to forward the untouched component
export function StrongFromCoKleisli<W extends Kind1>(W: Comonad<W>): Strong<CoKleisliK<W>> {
  const P = ProfunctorFromCoKleisli<W>(W);
  return {
    ...P,
    first:  <A, B, C>(pab: CoKleisli<W, A, B>): CoKleisli<W, [A, C], [B, C]> =>
      (wac) => {
        const b = pab(W.map(wac, ([a, _c]) => a));
        const c = (W.extract(wac) as [A, C])[1];
        return [b, c];
      },
    second: <A, B, C>(pab: CoKleisli<W, A, B>): CoKleisli<W, [C, A], [C, B]> =>
      (wca) => {
        const b = pab(W.map(wca, (pair: [C, A]) => pair[1]));
        const c = (W.extract(wca) as [C, A])[0];
        return [c, b];
      }
  };
}

// Choice: standard CoKleisli instance
export function ChoiceFromCoKleisli<W extends Kind1>(W: Comonad<W>): Choice<CoKleisliK<W>> {
  const P = ProfunctorFromCoKleisli<W>(W);
  return {
    ...P,
    left:  <A, B, C>(pab: CoKleisli<W, A, B>): CoKleisli<W, Either<A, C>, Either<B, C>> =>
      (weac) => {
        const e0 = W.extract(weac) as Either<A, C>;
        if ('left' in e0) {
          const a0 = e0.left as A;
          const wA = W.map(weac, (x: Either<A, C>) => ('left' in x ? x.left : a0));
          return Left<B, C>(pab(wA));
        } else {
          return Right<B, C>(e0.right as C);
        }
      },
    right: <A, B, C>(pab: CoKleisli<W, A, B>): CoKleisli<W, Either<C, A>, Either<C, B>> =>
      (weca) => {
        const e0 = W.extract(weca) as Either<C, A>;
        if ('right' in e0) {
          const a0 = e0.right as A;
          const wA = W.map(weca, (x: Either<C, A>) => ('right' in x ? x.right : a0));
          return Right<C, B>(pab(wA));
        } else {
          return Left<C, B>(e0.left as C);
        }
      }
  };
}

// ---------------------------------------------
// Category + Arrow (+ ArrowChoice) for CoKleisli
// Composition uses extend; id/arr use extract
// ---------------------------------------------
export function ArrowFromCoKleisli<W extends Kind1>(W: Comonad<W>):
  Category<CoKleisliK<W>> & Arrow<CoKleisliK<W>> & ArrowChoice<CoKleisliK<W>> {
  const id = <A>(): CoKleisli<W, A, A> => (wa) => W.extract(wa);
  const compose = <A, B, C>(g: CoKleisli<W, B, C>, f: CoKleisli<W, A, B>): CoKleisli<W, A, C> =>
    (wa) => g(W.extend(wa, f));
  const arr =  <A, B>(ab: (a: A) => B): CoKleisli<W, A, B> =>
    (wa) => ab(W.extract(wa));
  const first = <A, B, C>(pab: CoKleisli<W, A, B>): CoKleisli<W, [A, C], [B, C]> =>
    (wac) => {
      const b = pab(W.map(wac, ([a, _c]) => a));
      const c = (W.extract(wac) as [A, C])[1];
      return [b, c];
    };
  const { left } = ChoiceFromCoKleisli(W);

  return {
    id,
    compose: (g, f) => compose(g, f) as any,
    arr,
    first,
    left
  };
}

// ---------------------------------------------
// Convenience: CoKleisli over Cofree<F,_>
// ---------------------------------------------
// Local minimal Cofree and helpers
export interface Cofree<F extends Kind1, A> {
  readonly head: A;
  readonly tail: Apply<F, [Cofree<F, A>]>;
}

export interface CofreeK<F extends Kind1> extends Kind1 {
  readonly type: Cofree<F, this['arg0']>;
}

export function mapCofree<F extends Kind1, A, B>(F: Functor<F>, wa: Cofree<F, A>, f: (a: A) => B): Cofree<F, B> {
  return {
    head: f(wa.head),
    tail: F.map(wa.tail, (w) => mapCofree(F, w, f)) as any
  };
}

export function extractCofree<F extends Kind1, A>(wa: Cofree<F, A>): A { return wa.head; }

export function duplicateCofree<F extends Kind1, A>(F: Functor<F>, wa: Cofree<F, A>): Cofree<F, Cofree<F, A>> {
  return {
    head: wa,
    tail: F.map(wa.tail, (w) => duplicateCofree(F, w)) as any
  };
}

export function ComonadFromCofree<F extends Kind1>(F: Functor<F>): Comonad<CofreeK<F>> {
  return {
    map:    <A, B>(wa: Cofree<F, A>, f: (a: A) => B) => mapCofree(F, wa, f) as any,
    extract: extractCofree as any,
    extend: <A, B>(wa: Cofree<F, A>, k: (w: Cofree<F, A>) => B) =>
      mapCofree(F, duplicateCofree(F, wa), k) as any
  };
}

export function ArrowFromCoKleisliCofree<F extends Kind1>(F: Functor<F>) {
  return ArrowFromCoKleisli(ComonadFromCofree(F));
}

// Runners
export const runCoKleisli = <W extends Kind1, A, B>(k: CoKleisli<W, A, B>) => k;


