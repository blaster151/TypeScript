import { Kind1, Kind2, Apply, Either } from './fp-hkt';

// Local minimal typeclass and profunctor/arrow interfaces to avoid importing heavy modules
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

export interface Applicative<F extends Kind1> extends Functor<F> {
  of<A>(a: A): Apply<F, [A]>;
  ap<A, B>(fab: Apply<F, [(a: A) => B]>, fa: Apply<F, [A]>): Apply<F, [B]>;
}

export interface Monad<F extends Kind1> extends Applicative<F> {
  chain<A, B>(fa: Apply<F, [A]>, f: (a: A) => Apply<F, [B]>): Apply<F, [B]>;
}

export interface Profunctor<P extends Kind2> {
  dimap<A, B, C, D>(
    pab: Apply<P, [A, B]>,
    f: (c: C) => A,
    g: (b: B) => D
  ): Apply<P, [C, D]>;
  lmap<A, B, C>(pab: Apply<P, [A, B]>, f: (c: C) => A): Apply<P, [C, B]>;
  rmap<A, B, D>(pab: Apply<P, [A, B]>, g: (b: B) => D): Apply<P, [A, D]>;
}

export interface Strong<P extends Kind2> extends Profunctor<P> {
  first<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[A, C], [B, C]]>;
  second<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [[C, A], [C, B]]>;
}

export interface Choice<P extends Kind2> extends Profunctor<P> {
  left<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<A, C>, Either<B, C>]>;
  right<A, B, C>(pab: Apply<P, [A, B]>): Apply<P, [Either<C, A>, Either<C, B>]>;
}

export type EffectTag = 'Pure' | 'State' | 'Async' | 'IO';
export type UsageBound = 1 | '∞';

export interface Category<P extends Kind2> {
  readonly effectTag: EffectTag;
  readonly usageBound: UsageBound;
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

export interface ArrowApply<P extends Kind2> extends Arrow<P> {
  app<A, B>(): Apply<P, [[Apply<P, [A, B]>, A], B]>;
}

// -----------------------------
// Kleisli & Star HKTs
// -----------------------------
export type Kleisli<M extends Kind1, A, B> = (a: A) => Apply<M, [B]>;
export interface KleisliK<M extends Kind1> extends Kind2 {
  readonly type: (a: this['arg0']) => Apply<M, [this['arg1']]>;
}

export type Star<F extends Kind1, A, B> = (a: A) => Apply<F, [B]>;
export interface StarK<F extends Kind1> extends Kind2 {
  readonly type: (a: this['arg0']) => Apply<F, [this['arg1']]>;
}

// Either helpers consistent with fp-hkt's Either shape
const Left = <L, R = never>(value: L): Either<L, R> => ({ left: value });
const Right = <L, R = never>(value: R): Either<L, R> => ({ right: value });

// -----------------------------
// Profunctor witnesses
// -----------------------------
export function ProfunctorFromKleisli<M extends Kind1>(M: Functor<M>): Profunctor<KleisliK<M>> {
  return {
    dimap: <A, B, C, D>(
      pab: Kleisli<M, A, B>,
      f: (c: C) => A,
      g: (b: B) => D
    ): Kleisli<M, C, D> => (c: C) => M.map(pab(f(c)), g) as any,
    lmap: <A, B, C>(pab: Kleisli<M, A, B>, f: (c: C) => A): Kleisli<M, C, B> =>
      (c: C) => pab(f(c)) as any,
    rmap: <A, B, D>(pab: Kleisli<M, A, B>, g: (b: B) => D): Kleisli<M, A, D> =>
      (a: A) => M.map(pab(a), g) as any
  };
}

export function StrongFromKleisli<M extends Kind1>(M: Functor<M>): Strong<KleisliK<M>> {
  const P = ProfunctorFromKleisli(M);
  return {
    ...P,
    first: <A, B, C>(pab: Kleisli<M, A, B>) =>
      ([a, c]: [A, C]) => M.map(pab(a), (b) => [b, c] as [B, C]) as any,
    second: <A, B, C>(pab: Kleisli<M, A, B>) =>
      ([c, a]: [C, A]) => M.map(pab(a), (b) => [c, b] as [C, B]) as any
  };
}

export function ChoiceFromKleisli<M extends Kind1>(M: Monad<M>): Choice<KleisliK<M>> {
  const P = ProfunctorFromKleisli<M>(M as any);
  return {
    ...P,
    left: <A, B, C>(pab: Kleisli<M, A, B>) =>
      (e: Either<A, C>) =>
        'left' in e
          ? M.map(pab(e.left), (b) => Left<B, C>(b)) as any
          : M.of(Right<B, C>(e.right as C)) as any,
    right: <A, B, C>(pab: Kleisli<M, A, B>) =>
      (e: Either<C, A>) =>
        'right' in e
          ? M.map(pab(e.right as A), (b) => Right<C, B>(b)) as any
          : M.of(Left<C, B>(e.left as C)) as any
  };
}

export function ProfunctorFromStar<F extends Kind1>(F: Functor<F>): Profunctor<StarK<F>> {
  return {
    dimap: <A, B, C, D>(
      pab: Star<F, A, B>,
      f: (c: C) => A,
      g: (b: B) => D
    ): Star<F, C, D> => (c: C) => F.map(pab(f(c)), g) as any,
    lmap: <A, B, C>(pab: Star<F, A, B>, f: (c: C) => A): Star<F, C, B> =>
      (c: C) => pab(f(c)) as any,
    rmap: <A, B, D>(pab: Star<F, A, B>, g: (b: B) => D): Star<F, A, D> =>
      (a: A) => F.map(pab(a), g) as any
  };
}

export function StrongFromStar<F extends Kind1>(F: Functor<F>): Strong<StarK<F>> {
  const P = ProfunctorFromStar(F);
  return {
    ...P,
    first: <A, B, C>(pab: Star<F, A, B>) =>
      ([a, c]: [A, C]) => F.map(pab(a), (b) => [b, c] as [B, C]) as any,
    second: <A, B, C>(pab: Star<F, A, B>) =>
      ([c, a]: [C, A]) => F.map(pab(a), (b) => [c, b] as [C, B]) as any
  };
}

export function ChoiceFromStar<F extends Kind1>(F: Applicative<F> & Functor<F>): Choice<StarK<F>> {
  const P = ProfunctorFromStar(F);
  return {
    ...P,
    left:  <A, B, C>(pab: Star<F, A, B>) =>
      (e: Either<A, C>) =>
        'left' in e
          ? F.map(pab(e.left), (b) => Left<B, C>(b)) as any
          : F.of(Right<B, C>(e.right as C)) as any,
    right: <A, B, C>(pab: Star<F, A, B>) =>
      (e: Either<C, A>) =>
        'right' in e
          ? F.map(pab(e.right as A), (b) => Right<C, B>(b)) as any
          : F.of(Left<C, B>(e.left as C)) as any
  };
}

// -----------------------------
// Arrow witnesses
// -----------------------------
export function ArrowFromKleisli<M extends Kind1>(M: Monad<M>):
  Category<KleisliK<M>> & Arrow<KleisliK<M>> & ArrowChoice<KleisliK<M>> & ArrowApply<KleisliK<M>> {
  const id = <A>(): Kleisli<M, A, A> => (a) => M.of(a) as any;
  const arr = <A, B>(f: (a: A) => B): Kleisli<M, A, B> => (a) => M.of(f(a)) as any;
  const compose = <A, B, C>(g: Kleisli<M, B, C>, f: Kleisli<M, A, B>): Kleisli<M, A, C> =>
    (a) => M.chain(f(a), g) as any;
  const first = <A, B, C>(pab: Kleisli<M, A, B>): Kleisli<M, [A, C], [B, C]> =>
    ([a, c]) => M.map(pab(a), (b) => [b, c] as [B, C]) as any;
  const left = <A, B, C>(pab: Kleisli<M, A, B>): Kleisli<M, Either<A, C>, Either<B, C>> =>
    (e) => 'left' in e
      ? M.map(pab(e.left), (b) => Left<B, C>(b)) as any
      : M.of(Right<B, C>(e.right as C)) as any;
  const app = <A, B>(): Kleisli<M, [Kleisli<M, A, B>, A], B> =>
    ([f, a]) => f(a) as any;

  return {
    effectTag: 'Pure' as any,
    usageBound: '∞' as any,
    id,
    compose: (g, f) => compose(g, f) as any,
    arr,
    first,
    left,
    app
  };
}

// Note: Star<F,_,_> generally does NOT form an Arrow unless F has stronger structure.
// We expose Profunctor/Strong/Choice for Star; use Kleisli(M) or CoKleisli(W) for Arrow needs.

// -----------------------------
// Runners
// -----------------------------
export const runKleisli = <M extends Kind1, A, B>(k: Kleisli<M, A, B>) => k;
export const runStar    = <F extends Kind1, A, B>(s: Star<F, A, B>) => s;


