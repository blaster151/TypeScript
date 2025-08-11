// fp-either-traversable.ts
import { Kind1, Apply } from './fp-hkt';
import { Applicative } from './fp-typeclasses-hkt';
import { Either, Left, Right, matchEither } from './fp-either-unified';

// ----- Foldable helpers (data-last) -----

/** foldMap for Either: fold only the Right value; Left contributes Monoid empty */
export function foldMapEither<M, L, R>(
  Monoid: { empty: M; concat: (x: M, y: M) => M },
  f: (r: R) => M
): (e: Either<L, R>) => M {
  return (e) =>
    matchEither(e, {
      Left: _ => Monoid.empty,
      Right: r => f(r),
    });
}

/** reduce for Either: reduce only the Right branch */
export function reduceEither<A, L, R>(
  f: (acc: A, r: R) => A,
  init: A
): (e: Either<L, R>) => A {
  return (e) =>
    matchEither(e, {
      Left: _ => init,
      Right: r => f(init, r),
    });
}

// ----- Traversable helpers (HKT-aligned; data-last) -----

/**
 * traverseEitherA: given an Applicative F, lift (R -> F<B>) over Either<L,R>
 * Left<L> maps to F<Either<L,B>> via of(Left(l))
 * Right<R> maps to F<B> then lifted with map to Right<B>
 */
export function traverseEitherA<F extends Kind1>() {
  return function <L, R, B>(
    A: Applicative<F>,
    f: (r: R) => Apply<F, [B]>
  ): (e: Either<L, R>) => Apply<F, [Either<L, B>]> {
    return (e) =>
      matchEither(e, {
        Left: (l) => A.of(Left<L>(l)) as any,
        Right: (r) => A.map(f(r), (b: B) => Right<B>(b)) as any,
      });
  };
}

/**
 * sequenceEitherA: flip Either<L, F<R>> to F<Either<L,R>>
 */
export function sequenceEitherA<F extends Kind1>() {
  return function <L, R>(
    A: Applicative<F>
  ): (e: Either<L, Apply<F, [R]>>) => Apply<F, [Either<L, R>]> {
    return (e) =>
      matchEither(e, {
        Left: (l) => A.of(Left<L>(l)) as any,
        Right: (fr) => A.map(fr, (r: R) => Right<R>(r)) as any,
      });
  };
}


