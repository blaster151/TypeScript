// test/laws/either-laws.spec.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');
const { Left, Right, mapEither, apEither, chainEither } = require('../../fp-either-unified.ts');
const { traverseEitherA, sequenceEitherA, foldMapEither, reduceEither } = require('../../fp-either-traversable.ts');
const { Identity, Compose, arbEither, eqEither, SumMonoid } = require('./laws-helpers');

// Minimal Applicative for tests
const Id = {
  of: Identity.of,
  map: Identity.map,
  ap: Identity.ap,
};

// Another simple Applicative: Array
const Arr = {
  of: (a) => [a],
  map: (as, f) => as.map(f),
  ap: (fs, as) => fs.flatMap(f => as.map(f)),
};

describe('Either laws (Functor/Applicative/Monad/Traversable/Foldable)', () => {
  // Functor: identity & composition
  it('Functor identity', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const mapped = mapEither((x) => x, e);
        assert.ok(eqEither(mapped, e));
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
          const left = mapEither((x) => g(f(x)), e);
          const right = mapEither(g, mapEither(f, e));
          assert.ok(eqEither(left, right));
        }
      )
    );
  });

  // Applicative: identity, homomorphism, interchange, composition
  it('Applicative identity', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const v = e;
        const pureId = Right((x) => x);
        const applied = apEither(pureId, v);
        assert.ok(eqEither(applied, v));
      })
    );
  });

  it('Applicative homomorphism', () => {
    fc.assert(
      fc.property(fc.integer(), fc.func(fc.integer()), (x, f) => {
        const lhs = apEither(Right(f), Right(x));
        const rhs = Right(f(x));
        assert.ok(eqEither(lhs, rhs));
      })
    );
  });

  it('Applicative interchange', () => {
    fc.assert(
      fc.property(fc.func(fc.integer()), fc.integer(), (f, y) => {
        const u = Right(f);
        const lhs = apEither(u, Right(y));
        const rhs = apEither(Right((g) => g(y)), u);
        assert.ok(eqEither(lhs, rhs));
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
          const comp = (f) => (g) => (a) => f(g(a));
          const u = Right(uF);
          const v = Right(vF);
          const wE = Right(w);
          const lhs = apEither(apEither(apEither(Right(comp), u), v), wE);
          const rhs = apEither(u, apEither(v, wE));
          assert.ok(eqEither(lhs, rhs));
        }
      )
    );
  });

  // Monad: left/right identity, associativity
  it('Monad left identity', () => {
    fc.assert(
      fc.property(fc.integer(), fc.func(fc.integer()), (a, fRaw) => {
        const f = (x) => Right(fRaw(x));
        const lhs = chainEither(f, Right(a));
        const rhs = f(a);
        assert.ok(eqEither(lhs, rhs));
      })
    );
  });

  it('Monad right identity', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (m) => {
        const lhs = chainEither((x) => Right(x), m);
        assert.ok(eqEither(lhs, m));
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
          const f = (x) => Right(fRaw(x));
          const g = (y) => Right(gRaw(y));
          const lhs = chainEither(g, chainEither(f, m));
          const rhs = chainEither((x) => chainEither(g, f(x)), m);
          assert.ok(eqEither(lhs, rhs));
        }
      )
    );
  });

  // Traversable: identity, composition, naturality (basic)
  it('Traversable identity (Identity applicative)', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const trav = traverseEitherA()(Id, (x) => x);
        const got = trav(e);
        const expected = e;
        assert.deepEqual(got, expected);
      })
    );
  });

  it('Traversable sequence identity (Identity applicative)', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const seq = sequenceEitherA()(Id);
        const got = seq(mapEither((x) => x, e));
        assert.deepEqual(got, e);
      })
    );
  });

  it('Traversable composition (Compose applicative) smoke-check', () => {
    fc.assert(
      fc.property(arbEither(fc.string(), fc.integer()), (e) => {
        const t = traverseEitherA()(Arr, (x) => [x.toString()]);
        const left = t(e); // Array<Either<L,string>>
        assert.ok(Array.isArray(left));
      })
    );
  });

  // Foldable: reduce/foldMap consistency
  it('Foldable reduce/foldMap consistency on Right', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (init, x) => {
        const e = Right(x);
        const r1 = reduceEither((acc, n) => acc + n, init)(e);
        const r2 = SumMonoid.concat(foldMapEither(SumMonoid, (n) => n)(e), init);
        assert.equal(r1, r2);
      })
    );
  });

  it('Foldable ignores Left', () => {
    const e = Left('err');
    const r1 = reduceEither((acc, n) => acc + n, 10)(e);
    const r2 = SumMonoid.concat(foldMapEither(SumMonoid, (n) => n)(e), 10);
    assert.equal(r1, 10);
    assert.equal(r2, 10);
  });
});


