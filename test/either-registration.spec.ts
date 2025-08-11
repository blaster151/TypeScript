import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFPRegistry } from '../fp-registry-init';
import { registerEitherInstances } from '../fp-either-register';

describe('Either registration', () => {
  it('registers typeclasses and derived instances without syntax issues', () => {
    registerEitherInstances();
    const reg = getFPRegistry();
    assert.ok(reg);

    const has = (tc: string) => !!reg!.getTypeclass('Either', tc);
    assert.equal(has('Functor'), true);
    assert.equal(has('Applicative'), true);
    assert.equal(has('Monad'), true);
    assert.equal(has('Bifunctor'), true);
    assert.equal(has('Eq'), true);
    assert.equal(has('Ord'), true);
    assert.equal(has('Show'), true);
  });
});


