import { assert } from "chai";
import {
  ObservableLiteK, TaskEitherK, Kind1, Kind2, Apply
} from '../../../fp-hkt';
import { EffectOf, IsPure, IsImpure } from '../../../fp-purity';
import { ObservableLiteFunctor, ObservableLiteMonad, TaskEitherBifunctorMonad } from '../../../fp-typeclasses';
import { ObservableLite } from '../../../fp-observable-lite';
import { TaskEither, TaskEitherLeft, TaskEitherRight } from '../../../fp-bimonad-extended';
import { getFPRegistry, getTypeclassInstance, getPurityEffect, getDerivableInstances } from '../../../fp-registry-init';

describe('FP Registry', () => {
  it('should register ObservableLiteK and TaskEitherK in HKT system', () => {
    type TestObservableLiteK = ObservableLiteK extends { readonly type: any } ? true : false;
    const _test1: TestObservableLiteK = true;
    type TestApply = Apply<typeof ObservableLiteK, [number]>;
    const _test2: TestApply = {} as ObservableLite<number>;
    type TestTaskEitherK = TaskEitherK extends { readonly type: any } ? true : false;
    const _test3: TestTaskEitherK = true;
    type TestApply2 = Apply<typeof TaskEitherK, [string, number]>;
    const _test4: TestApply2 = {} as TaskEither<string, number>;
    assert.isTrue(_test1 && _test3, 'HKT registration type checks');
  });

  it('should register correct purity effects', () => {
    type Effect = EffectOf<typeof ObservableLiteK>;
    const _test1: Effect = 'Async';
    type IsPureTest = IsPure<typeof ObservableLiteK>;
    const _test2: IsPureTest = false;
    type IsImpureTest = IsImpure<typeof ObservableLiteK>;
    const _test3: IsImpureTest = true;
    type Effect2 = EffectOf<typeof TaskEitherK>;
    const _test4: Effect2 = 'Async';
    type IsPureTest2 = IsPure<typeof TaskEitherK>;
    const _test5: IsPureTest2 = false;
    type IsImpureTest2 = IsImpure<typeof TaskEitherK>;
    const _test6: IsImpureTest2 = true;
    assert.isTrue(_test1 === 'Async' && _test4 === 'Async', 'Purity registration type checks');
  });

  it('should register ObservableLite and TaskEither typeclass instances', () => {
    const functorInstance = getTypeclassInstance('ObservableLite', 'Functor');
    assert.isOk(functorInstance, 'ObservableLite Functor instance');
    assert.isFunction(functorInstance.map, 'ObservableLite Functor map');
    const monadInstance = getTypeclassInstance('ObservableLite', 'Monad');
    assert.isOk(monadInstance, 'ObservableLite Monad instance');
    assert.isFunction(monadInstance.chain, 'ObservableLite Monad chain');
    const bifunctorInstance = getTypeclassInstance('TaskEither', 'Bifunctor');
    assert.isOk(bifunctorInstance, 'TaskEither Bifunctor instance');
    assert.isFunction(bifunctorInstance.bimap, 'TaskEither Bifunctor bimap');
    const monadInstance2 = getTypeclassInstance('TaskEither', 'Monad');
    assert.isOk(monadInstance2, 'TaskEither Monad instance');
    assert.isFunction(monadInstance2.chain, 'TaskEither Monad chain');
  });

  it('should work with ObservableLite at runtime', (done) => {
    const obs = ObservableLite.of(42);
    const mapped = obs.map((x: number) => x * 2);
    let result: number | undefined;
    mapped.subscribe({ next: value => { result = value; }, complete: () => {
      assert.equal(result, 84, 'ObservableLite runtime test');
      done();
    }});
  });

  it('should work with TaskEither at runtime', async () => {
    const taskEither = TaskEitherRight(42);
    const result = await taskEither();
    assert.equal(result.tag, 'Right');
    assert.equal(result.value, 42);
  });

  it('should have correct registry integration', () => {
    const registry = getFPRegistry();
    assert.isOk(registry, 'Global FP registry');
    const observableLitePurity = getPurityEffect('ObservableLite');
    assert.equal(observableLitePurity, 'Async', 'ObservableLite purity');
    const observableLiteInstances = getDerivableInstances('ObservableLite');
    assert.isOk(observableLiteInstances && observableLiteInstances.functor, 'ObservableLite derivable instances');
    const taskEitherPurity = getPurityEffect('TaskEither');
    assert.equal(taskEitherPurity, 'Async', 'TaskEither purity');
    const taskEitherInstances = getDerivableInstances('TaskEither');
    assert.isOk(taskEitherInstances && taskEitherInstances.bifunctor, 'TaskEither derivable instances');
  });

  it('should pass compile-time verification', () => {
    type ObservableLiteIsKind1 = typeof ObservableLiteK extends Kind1 ? true : false;
    const _test1: ObservableLiteIsKind1 = true;
    type TaskEitherIsKind2 = typeof TaskEitherK extends Kind2 ? true : false;
    const _test2: TaskEitherIsKind2 = true;
    type ObservableLiteEffect = EffectOf<typeof ObservableLiteK>;
    const _test3: ObservableLiteEffect = 'Async';
    type TaskEitherEffect = EffectOf<typeof TaskEitherK>;
    const _test4: TaskEitherEffect = 'Async';
    assert.isTrue(_test1 && _test2 && _test3 === 'Async' && _test4 === 'Async', 'Compile-time verification');
  });
});
