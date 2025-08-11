// test/laws/laws-helpers.ts
import * as fc from 'fast-check';
import { Left, Right, Either, matchEither } from '../../fp-either-unified';

// Identity applicative
export type Identity<A> = A;
export const Identity = {
  of: <A>(a: A): Identity<A> => a,
  map: <A, B>(a: Identity<A>, f: (a: A) => B): Identity<B> => f(a),
  ap: <A, B>(fab: Identity<(a: A) => B>, fa: Identity<A>): Identity<B> => fab(fa),
};

// Compose applicative (for Traversable composition law)
export const Compose = <F, G>(F: any, G: any) => ({
  of: <A>(a: A) => F.of(G.of(a)),
  map: <A, B>(f: (a: A) => B, fga: any) => F.map(fga, (ga: any) => G.map(ga, f)),
  ap: <A, B>(fgf: any, fga: any) =>
    F.ap(F.map(fgf, (gf: any) => (ga: any) => G.ap(gf, ga)), fga),
});

// Arbitrary for Either<L,R>
export function arbEither<L, R>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<R>
): fc.Arbitrary<Either<L, R>> {
  return fc.oneof(
    leftArb.map((l) => Left<L>(l)),
    rightArb.map((r) => Right<R>(r))
  );
}

// Helpers
export const eqEither = <L, R>(a: Either<L, R>, b: Either<L, R>): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

// Simple Monoid for foldMap tests
export const SumMonoid = { empty: 0, concat: (x: number, y: number) => x + y } as const;


