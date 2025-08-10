import { assert } from "chai";
import * as ObservableLiteMod from '../../../fp-observable-lite';

describe('ObservableLite Implementation', () => {
  describe('Basic Functionality', () => {
    it('should emit a single value with of', async () => {
      const obs = ObservableLiteMod.ObservableLite.of(42);
      const values: number[] = await new Promise(resolve => {
        const out: number[] = [];
        obs.subscribe({ next: v => out.push(v), complete: () => resolve(out) });
      });
      assert.deepEqual(values, [42]);
    });
  });
});
