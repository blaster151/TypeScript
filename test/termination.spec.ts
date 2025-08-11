import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EitherGADT, MaybeGADT } from '../fp-gadt-enhanced';
import { anaEither, anaMaybe } from '../fp-anamorphisms';
import { cataEither, cataMaybe } from '../fp-catamorphisms';

describe('termination semantics (no nulls)', () => {
  it('either coalgebra uses Left to terminate/error paths', () => {
    const gen = anaEither<string, number, number>((n) =>
      n < 0 ? EitherGADT.Left('neg') : EitherGADT.Right(n)
    );
    const e1 = gen(-1);
    const e2 = gen(2);
    assert.equal(
      cataEither(e1, { Left: ({ value }) => value, Right: ({ value }) => String(value) }),
      'neg'
    );
    assert.equal(
      cataEither(e2, { Left: ({ value }) => value, Right: ({ value }) => value }),
      2
    );
  });

  it('maybe coalgebra uses Nothing as terminator', () => {
    const gen = anaMaybe<number, number>((n) =>
      n > 3 ? MaybeGADT.Nothing() : MaybeGADT.Just(n + 1)
    );
    const m1 = gen(5);
    assert.equal(
      cataMaybe(m1, { Just: ({ value }) => value, Nothing: () => -1 }),
      -1
    );
  });
});


