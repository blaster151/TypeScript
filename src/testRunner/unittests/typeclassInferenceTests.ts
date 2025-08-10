import { assert } from "chai";
import {
  Tagged, inferFunctor, inferApplicative, inferMonad, inferBifunctor,
  map, chain, of, ap, lift2, bimap, Auto
} from '../../../fp-registry-init';

describe('Typeclass Inference Utilities', () => {
  it('should map and chain arrays using inferred Functor/Monad', () => {
    const taggedArray: Tagged<any, 'Array'> = { __tag: 'Array', value: [1, 2, 3] };
    const mappedArr = map(taggedArray, (x: number) => x * 2);
    assert.deepEqual(mappedArr.value, [2, 4, 6], 'Array Functor map');

    const chainedArr = chain(taggedArray, (x: number) => ({ __tag: 'Array', value: [x, x + 10] }));
    assert.deepEqual(chainedArr.value, [1, 11, 2, 12, 3, 13], 'Array Monad chain');
  });

  it('should use Applicative ap and lift2 for Maybe', () => {
    const fab = of('Maybe', (x: number) => x * 2);
    const fa = of('Maybe', 10);
    const applied = ap(fab, fa);
    assert.deepEqual(applied.value, { tag: 'Just', value: 20 }, 'Maybe Applicative ap');

    const lifted = lift2('Maybe', (a: number) => (b: number) => a + b, of('Maybe', 1), of('Maybe', 2));
    assert.deepEqual(lifted.value, { tag: 'Just', value: 3 }, 'Maybe Applicative lift2');
  });

  it('should bimap Either using inferred Bifunctor', () => {
    const taggedEitherLeft: Tagged<any, 'Either'> = { __tag: 'Either', value: { tag: 'Left', value: 'boom' } };
    const bimapResult = bimap(taggedEitherLeft, (s: string) => `ERR: ${s}`, (n: number) => n * 2);
    assert.deepEqual(bimapResult.value, { tag: 'Left', value: 'ERR: boom' }, 'Either Bifunctor bimap (Left)');

    const taggedEitherRight: Tagged<any, 'Either'> = { __tag: 'Either', value: { tag: 'Right', value: 21 } };
    const bimapResult2 = bimap(taggedEitherRight, (s: string) => `ERR: ${s}`, (n: number) => n * 2);
    assert.deepEqual(bimapResult2.value, { tag: 'Right', value: 42 }, 'Either Bifunctor bimap (Right)');
  });

  it('should support fluent Auto API for map, chain, ap, and bimap', () => {
    const taggedArray: Tagged<any, 'Array'> = { __tag: 'Array', value: [1, 2, 3] };
    const autoArr = new Auto(taggedArray)
      .map((x: number) => x + 1)
      .chain((x: number) => new Auto({ __tag: 'Array', value: [x, x * 2] }))
      .unwrap();
    assert.deepEqual(autoArr, [2, 4, 3, 6, 4, 8], 'Auto fluent map/chain');

    const fab = of('Maybe', (x: number) => x * 2);
    const fa = of('Maybe', 10);
    const autoAp = (new Auto(fab) as any).ap(fa).unwrap();
    assert.deepEqual(autoAp, { tag: 'Just', value: 20 }, 'Auto fluent ap');

    const taggedEitherLeft: Tagged<any, 'Either'> = { __tag: 'Either', value: { tag: 'Left', value: 'boom' } };
    const autoBimap = (new Auto(taggedEitherLeft) as any).bimap((s: string) => `ERR: ${s}`, (n: number) => n * 2).unwrap();
    assert.deepEqual(autoBimap, { tag: 'Left', value: 'ERR: boom' }, 'Auto fluent bimap');
  });
});
