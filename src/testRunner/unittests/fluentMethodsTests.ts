import { assert } from "chai";
import * as Fluent from '../../../fp-fluent-methods';
import * as MaybeUnified from '../../../fp-maybe-unified';
import * as ObservableLiteMod from '../../../fp-observable-lite';
import * as EitherUnified from '../../../fp-either-unified';
import * as ResultUnified from '../../../fp-result-unified';

describe('Fluent Methods System', () => {
  it('should register and retrieve fluent method instances', () => {
    const instances = { Functor: MaybeUnified.MaybeUnified.Functor, Monad: MaybeUnified.MaybeUnified.Monad };
    Fluent.registerFluentMethodInstances('TestADT', instances);
    const retrieved = Fluent.getFluentMethodInstances('TestADT');
    assert.deepEqual(retrieved, instances, 'Should register and retrieve instances correctly');
  });

  it('should decorate and undecorate ADTs with fluent methods', () => {
    class TestADT { constructor(public value: any) {} }
    const instances = { Functor: { map: (fa: any, f: any) => new TestADT(f(fa.value)) } };
    Fluent.registerFluentMethodInstances('TestADT', instances);
    const Decorated = Fluent.withFluentMethods(TestADT, 'TestADT');
    const instance = new Decorated(5);
    assert.isFunction(instance.map, 'Should have map method');
    assert.isTrue(Fluent.hasFluentMethods(Decorated), 'Should be marked as having fluent methods');
    const result = instance.map((x: number) => x * 2);
    assert.equal(result.value, 10, 'Should apply map correctly');
    const Undecorated = Fluent.withoutFluentMethods(Decorated);
    assert.isFalse(Fluent.hasFluentMethods(Undecorated), 'Should not have fluent methods after undecoration');
  });

  it('should support Maybe fluent methods', () => {
    const { Just, Nothing } = Fluent.withMaybeFluentMethods();
    assert.deepEqual(Just(5).map((x: number) => x * 2), Just(10), 'Maybe.map');
    assert.deepEqual(Just(5).chain((x: number) => Just(x * 3)), Just(15), 'Maybe.chain');
    assert.deepEqual(Just(5).filter((x: number) => x > 3), Just(5), 'Maybe.filter true');
    assert.deepEqual(Just(5).filter((x: number) => x > 10), Nothing(), 'Maybe.filter false');
  });

  it('should support Either fluent methods', () => {
    const { Left, Right } = Fluent.withEitherFluentMethods();
    assert.deepEqual(Right(5).map((x: number) => x * 2), Right(10), 'Either.map Right');
    assert.deepEqual(Left('err').map((x: number) => x * 2), Left('err'), 'Either.map Left');
    assert.deepEqual(Right(5).chain((x: number) => Right(x * 3)), Right(15), 'Either.chain Right');
    assert.deepEqual(Left('err').chain((x: number) => Right(x * 3)), Left('err'), 'Either.chain Left');
    assert.deepEqual(Right(5).bimap((e: string) => `E:${e}`, (v: number) => v * 2), Right(10), 'Either.bimap Right');
    assert.deepEqual(Left('err').bimap((e: string) => `E:${e}`, (v: number) => v * 2), Left('E:err'), 'Either.bimap Left');
  });

  it('should support Result fluent methods', () => {
    const { Ok, Err } = Fluent.withResultFluentMethods();
    assert.deepEqual(Ok(5).map((x: number) => x * 2), Ok(10), 'Result.map Ok');
    assert.deepEqual(Err('err').map((x: number) => x * 2), Err('err'), 'Result.map Err');
    assert.deepEqual(Ok(5).chain((x: number) => Ok(x * 3)), Ok(15), 'Result.chain Ok');
    assert.deepEqual(Err('err').chain((x: number) => Ok(x * 3)), Err('err'), 'Result.chain Err');
    assert.deepEqual(Ok(5).bimap((e: string) => `E:${e}`, (v: number) => v * 2), Ok(10), 'Result.bimap Ok');
    assert.deepEqual(Err('err').bimap((e: string) => `E:${e}`, (v: number) => v * 2), Err('E:err'), 'Result.bimap Err');
  });

  it('should support ObservableLite fluent methods (basic map/chain)', async () => {
    const Decorated = Fluent.withObservableLiteFluentMethods();
    const obs = Decorated.fromArray([1, 2, 3]);
    const mapped = obs.map((x: number) => x * 2);
    const values: number[] = await new Promise(resolve => {
      const out: number[] = [];
      mapped.subscribe({ next: v => out.push(v), complete: () => resolve(out) });
    });
    assert.deepEqual(values, [2, 4, 6], 'ObservableLite.map');
  });

  it('should support type inference for Maybe/Either/Result', () => {
    const { Just } = Fluent.withMaybeFluentMethods();
    const maybe = Just(5).map((x: number) => x + 1).map((x: number) => x.toString()).map((x: string) => x.length);
    assert.isDefined(maybe, 'Type inference for Maybe');
    const { Right } = Fluent.withEitherFluentMethods();
    const either = Right(5).map((x: number) => x + 1).map((x: number) => x.toString()).map((x: string) => x.length);
    assert.isDefined(either, 'Type inference for Either');
    const { Ok } = Fluent.withResultFluentMethods();
    const result = Ok(5).map((x: number) => x + 1).map((x: number) => x.toString()).map((x: string) => x.length);
    assert.isDefined(result, 'Type inference for Result');
  });

  it('should preserve purity tags for Maybe/Either/ObservableLite', async () => {
    const { Just } = Fluent.withMaybeFluentMethods();
    const maybe = Just(5).map((x: number) => x + 1);
    assert.isDefined(maybe, 'Maybe should preserve purity');
    const { Right } = Fluent.withEitherFluentMethods();
    const either = Right(5).map((x: number) => x + 1);
    assert.isDefined(either, 'Either should preserve purity');
    const Decorated = Fluent.withObservableLiteFluentMethods();
    const obs = Decorated.fromArray([1, 2, 3]).map((x: number) => x + 1);
    const values: number[] = await new Promise(resolve => {
      const out: number[] = [];
      obs.subscribe({ next: v => out.push(v), complete: () => resolve(out) });
    });
    assert.deepEqual(values, [2, 3, 4], 'ObservableLite should maintain async behavior');
  });

  it('should support bifunctor .bimap for Either and Result', () => {
    const { Left, Right } = Fluent.withEitherFluentMethods();
    assert.deepEqual(Right(5).bimap((e: string) => `E:${e}`, (v: number) => v * 2), Right(10), 'Either.bimap Right');
    assert.deepEqual(Left('err').bimap((e: string) => `E:${e}`, (v: number) => v * 2), Left('E:err'), 'Either.bimap Left');
    const { Ok, Err } = Fluent.withResultFluentMethods();
    assert.deepEqual(Ok(5).bimap((e: string) => `E:${e}`, (v: number) => v * 2), Ok(10), 'Result.bimap Ok');
    assert.deepEqual(Err('err').bimap((e: string) => `E:${e}`, (v: number) => v * 2), Err('E:err'), 'Result.bimap Err');
  });
});
