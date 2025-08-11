// test/laws/either-laws.spec.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fc from 'fast-check';
import { Left, Right, mapEither, apEither, chainEither } from '../../fp-either-unified';
import { traverseEitherA, sequenceEitherA, foldMapEither, reduceEither } from '../../fp-either-traversable';
import { Identity, Compose, arbEither, eqEither, SumMonoid } from './laws-helpers';

// Minimal Applicative for tests
const Id = {
  of: Identity.of,
  map: Identity.map,
  ap: Identity.ap,
};

// Another simple Applicative: Array
const Arr = {
  of: <A>(a: A) => [a],
  map: <A, B>(as: A[], f: (a: A) => B) => as.map(f),
  ap: <A, B>(fs: Array<(a: A) => B>, as: A[]) => fs.flatMap(f => as.map(f)),
};

describe('Either laws (Functor/Applicative/Monad/Traversable/Foldable)', () => {
  // Functor: identity & composition
  it('Functor identity', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const mapped = mapEither((x: number) => x, e as any);
        assert.ok(eqEither(mapped as any, e as any));
      })
    );
  });

  it('Functor composition', () => {
    fc.assert(
      fc.property(
        arbEither(fc.string(), fc.integer()),
        fc.func(fc.integer()),
        fc.func(fc.integer()),
        (e, f, g) => {
          const left = mapEither((x: number) => g(f(x)), e as any);
          const right = mapEither(g as any, mapEither(f as any, e as any));
          assert.ok(eqEither(left as any, right as any));
        }
      )
    );
  });

  // Applicative: identity, homomorphism, interchange, composition
  it('Applicative identity', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const v = e as any;
        const pureId = Right<(n: number) => number>((x) => x);
        const applied = apEither(pureId as any, v as any);
        assert.ok(eqEither(applied as any, v as any));
      })
    );
  });

  it('Applicative homomorphism', () => {
    fc.assert(
      fc.property(fc.integer(), fc.func(fc.integer()), (x, f) => {
        const lhs = apEither(Right(f), Right(x));
        const rhs = Right(f(x));
        assert.ok(eqEither(lhs as any, rhs as any));
      })
    );
  });

  it('Applicative interchange', () => {
    fc.assert(
      fc.property(fc.func(fc.integer()), fc.integer(), (f, y) => {
        const u = Right<(n: number) => number>(f);
        const lhs = apEither(u as any, Right(y) as any);
        const rhs = apEither(Right((g: (n: number) => number) => g(y)) as any, u as any);
        assert.ok(eqEither(lhs as any, rhs as any));
      })
    );
  });

  it('Applicative composition', () => {
    fc.assert(
      fc.property(
        fc.func(fc.integer()),
        fc.func(fc.integer()),
        fc.integer(),
        (uF, vF, w) => {
          const comp = (f: (b: number) => number) => (g: (a: number) => number) => (a: number) => f(g(a));
          const u = Right(uF);
          const v = Right(vF);
          const wE = Right(w);
          const lhs = apEither(apEither(apEither(Right(comp) as any, u as any), v as any), wE as any);
          const rhs = apEither(u as any, apEither(v as any, wE as any));
          assert.ok(eqEither(lhs as any, rhs as any));
        }
      )
    );
  });

  // Monad: left/right identity, associativity
  it('Monad left identity', () => {
    fc.assert(
      fc.property(fc.integer(), fc.func(fc.integer()), (a, fRaw) => {
        const f = (x: number) => Right(fRaw(x));
        const lhs = chainEither(f as any, Right(a) as any);
        const rhs = f(a);
        assert.ok(eqEither(lhs as any, rhs as any));
      })
    );
  });

  it('Monad right identity', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (m) => {
        const lhs = chainEither((x: number) => Right(x), m as any);
        assert.ok(eqEither(lhs as any, m as any));
      })
    );
  });

  it('Monad associativity', () => {
    fc.assert(
      fc.property(
        arbEither(fc.string(), fc.integer()),
        fc.func(fc.integer()),
        fc.func(fc.integer()),
        (m, fRaw, gRaw) => {
          const f = (x: number) => Right(fRaw(x));
          const g = (y: number) => Right(gRaw(y));
          const lhs = chainEither(g as any, chainEither(f as any, m as any));
          const rhs = chainEither((x: number) => chainEither(g as any, f(x) as any), m as any);
          assert.ok(eqEither(lhs as any, rhs as any));
        }
      )
    );
  });

  // Traversable: identity, composition, naturality (basic)
  it('Traversable identity (Identity applicative)', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const trav = traverseEitherA<import('../../fp-hkt').Kind1>()(Id as any, (x: number) => x as any);
        const got = trav(e as any);
        const expected = e as any;
        assert.deepEqual(got, expected);
      })
    );
  });

  it('Traversable sequence identity (Identity applicative)', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const seq = sequenceEitherA<import('../../fp-hkt').Kind1>()(Id as any);
        const got = seq(mapEither((x: number) => x as any, e as any) as any);
        assert.deepEqual(got, e as any);
      })
    );
  });

  it('Traversable composition (Compose applicative) smoke-check', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const t = traverseEitherA<import('../../fp-hkt').Kind1>()(Arr as any, (x: number) => [x.toString()]);
        const left = t(e as any); // Array<Either<L,string>>
        assert.ok(Array.isArray(left));
      })
    );
  });

  // Foldable: reduce/foldMap consistency
  it('Foldable reduce/foldMap consistency on Right', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (init, x) => {
        const e = Right<number>(x);
        const r1 = reduceEither((acc: number, n: number) => acc + n, init)(e);
        const r2 = SumMonoid.concat(foldMapEither(SumMonoid, (n: number) => n)(e), init);
        assert.equal(r1, r2);
      })
    );
  });

  it('Foldable ignores Left', () => {
    const e = Left<string>('err');
    const r1 = reduceEither((acc: number, n: number) => acc + n, 10)(e);
    const r2 = SumMonoid.concat(foldMapEither(SumMonoid, (n: number) => n)(e), 10);
    assert.equal(r1, 10);
    assert.equal(r2, 10);
  });
});


