// fp-cochoice.ts
//
// A tiny “cochoice” witness that gives you a lawful way to pull an Either
// out of a comonadic context: distEither : W<Either<A,C>> -> Either<W<A>, W<C>>.
// Includes a lightweight law runner (naturality + extract coherence) and a
// ready-to-use Reader instance (pinned environment variant).

import { Kind1, Apply } from './fp-hkt';

// Minimal Comonad shape (aligned with your comonad elsewhere)
export interface Comonad<W extends Kind1> {
  map<A, B>(wa: Apply<W, [A]>, f: (a: A) => B): Apply<W, [B]>;
  extract<A>(wa: Apply<W, [A]>): A;
  extend<A, B>(wa: Apply<W, [A]>, f: (w: Apply<W, [A]>) => B): Apply<W, [B]>;
}

// Either helpers (matching fp-hkt's shape: { left } | { right })
export type Either<L, R> = { left: L } | { right: R };
export const Left = <L, R = never>(left: L): Either<L, R> => ({ left });
export const Right = <R, L = never>(right: R): Either<L, R> => ({ right });
export const bimap = <L, R, L2, R2>(
  e: Either<L, R>,
  fl: (l: L) => L2,
  fr: (r: R) => R2
): Either<L2, R2> => ('left' in e ? Left(fl(e.left)) : Right(fr(e.right as R)));
export const mapLeft = <L, R, L2>(e: Either<L, R>, f: (l: L) => L2): Either<L2, R> =>
  bimap(e, f, (r) => r);
export const mapRight = <L, R, R2>(e: Either<L, R>, g: (r: R) => R2): Either<L, R2> =>
  bimap(e, (l) => l, g);

// -----------------------------
// Cochoice witness
// -----------------------------
export interface Cochoice<W extends Kind1> extends Comonad<W> {
  // Distribute Either out of the comonad
  distEither<A, C>(
    wac: Apply<W, [Either<A, C>]>
  ): Either<Apply<W, [A]>, Apply<W, [C]>>;
}

// -----------------------------
// Laws (property checks)
// -----------------------------
// 1) Naturality:
//    distEither (map (bimap f g) wac)
//    == bimap (map f) (map g) (distEither wac)
// 2) Extract coherence:
//    bimap extract extract (distEither wac) == extract wac
export function runCochoiceLaws<W extends Kind1>(
  Wco: Cochoice<W>,
  gens: {
    genAC: () => Apply<W, [Either<any, any>]>;
    genFnA: () => (a: any) => any;
    genFnC: () => (c: any) => any;
  },
  eqEither: (x: Either<any, any>, y: Either<any, any>) => boolean,
  _eqPlain: (x: any, y: any) => boolean,
  samples = 50
) {
  let naturalityOK = true;
  let extractOK = true;
  for (let i = 0; i < samples && (naturalityOK || extractOK); i++) {
    const wac = gens.genAC();
    const f = gens.genFnA();
    const g = gens.genFnC();
    // Naturality
    const leftN = Wco.distEither(Wco.map(wac, (e) => bimap(e, f, g)));
    const rightN = bimap(Wco.distEither(wac), (wa) => Wco.map(wa, f), (wc) => Wco.map(wc, g));
    naturalityOK = naturalityOK && eqEither(leftN, rightN);
    // Extract coherence
    const leftE = bimap(Wco.distEither(wac), (wa) => Wco.extract(wa), (wc) => Wco.extract(wc));
    const rightE = Wco.extract(wac);
    extractOK = extractOK && eqEither(leftE, rightE);
  }
  return { naturalityOK, extractOK };
}

// -----------------------------
// Reader instance (Env comonad, pinned environment)
// -----------------------------
// W<X> = (env: E) => X
export interface ReaderK<E> extends Kind1 {
  readonly type: (env: E) => this['arg0'];
}

// Practical Reader cochoice by pinning an environment value e0
export function CochoiceReaderAt<E>(e0: E): Cochoice<ReaderK<E>> {
  return {
    map: (wa, f) => (env: E) => f(wa(env)),
    extract: (wa) => wa(e0),
    extend: (wa, f) => (_: E) => f((env: E) => wa(env)),
    distEither: <A, C>(wac: (env: E) => Either<A, C>) => {
      const at = wac(e0);
      return 'left' in at
        ? Left((_: E) => at.left)
        : Right((_: E) => (at.right as C));
    }
  } as any;
}


