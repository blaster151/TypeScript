import { Kind1, Apply, Either } from './fp-hkt';

// Minimal Functor to keep this file self-contained
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

// Minimal Free and Cofree encodings used by histo/futu
export type Free<F extends Kind1, A> =
  | { _tag: 'Pure'; value: A }
  | { _tag: 'Impure'; fx: Apply<F, [Free<F, A>]> };

export interface Cofree<F extends Kind1, A> {
  readonly head: A;
  readonly tail: Apply<F, [Cofree<F, A>]>;
}

export function cofree<F extends Kind1, A>(head: A, tail: Apply<F, [Cofree<F, A>]>): Cofree<F, A> {
  return { head, tail };
}

// Matryoshka-style witnesses
export interface Recursive<T, F extends Kind1> {
  project(t: T): Apply<F, [T]>;
}
export interface Corecursive<T, F extends Kind1> {
  embed(ft: Apply<F, [T]>): T;
}

// catamorphism (fold) via a project witness
export function cata<F extends Kind1, T, A>(
  Ff: Functor<F>,
  R: Recursive<T, F>,
  alg: (fa: Apply<F, [A]>) => A
): (t: T) => A {
  const go = (t: T): A => alg(Ff.map(R.project(t), go) as Apply<F, [A]>);
  return go;
}

// anamorphism (unfold) via an embed witness
export function ana<F extends Kind1, T, S>(
  Ff: Functor<F>,
  C: Corecursive<T, F>,
  coalg: (s: S) => Apply<F, [S]>
): (seed: S) => T {
  const go = (s: S): T =>
    C.embed(Ff.map(coalg(s), go) as Apply<F, [T]>);
  return go;
}

// paramorphism: like cata, but the algebra also sees original children
// alg: F<[childT, childA]> -> A
export function para<F extends Kind1, T, A>(
  Ff: Functor<F>,
  R: Recursive<T, F>,
  alg: (fp: Apply<F, [[T, A]]>) => A
): (t: T) => A {
  const go = (t: T): A =>
    alg(Ff.map(R.project(t), (u: T) => [u, go(u)] as [T, A]) as unknown as Apply<F, [[T, A]]>);
  return go;
}

// apomorphism: like ana, but the coalgebra can stop early with an existing T
// coalg: S -> F<Either<T,S>>
export function apo<F extends Kind1, T, S>(
  Ff: Functor<F>,
  C: Corecursive<T, F>,
  coalg: (s: S) => Apply<F, [Either<T, S>]>
): (seed: S) => T {
  const go = (s: S): T => {
    const ft = Ff.map(coalg(s), (e: Either<T, S>) =>
      ('left' in e) ? e.left : go(e.right as S)
    ) as Apply<F, [T]>;
    return C.embed(ft);
  };
  return go;
}

// histomorphism: cata with access to the history (Cofree) of subcomputations
// alg: F<Cofree<F, A>> -> A
export function histo<F extends Kind1, T, A>(
  Ff: Functor<F>,
  R: Recursive<T, F>,
  alg: (fc: Apply<F, [Cofree<F, A>]>) => A
): (t: T) => A {
  const attr = (t: T): Cofree<F, A> => {
    const kids = Ff.map(R.project(t), attr) as Apply<F, [Cofree<F, A>]>;
    const a = alg(kids);
    return cofree(a, kids);
  };
  return (t) => attr(t).head;
}

// futumorphism: ana that can produce several layers ahead via Free
// coalg: S -> F<Free<F, S>>
export function futu<F extends Kind1, T, S>(
  Ff: Functor<F>,
  C: Corecursive<T, F>,
  coalg: (s: S) => Apply<F, [Free<F, S>]>
): (seed: S) => T {
  const resume = (fr: Free<F, S>): T => {
    switch (fr._tag) {
      case 'Pure':   return go(fr.value);
      case 'Impure': return C.embed(Ff.map(fr.fx, resume) as Apply<F, [T]>);
    }
  };
  const go = (s: S): T => {
    const ft = Ff.map(coalg(s), resume) as Apply<F, [T]>;
    return C.embed(ft);
  };
  return go;
}


