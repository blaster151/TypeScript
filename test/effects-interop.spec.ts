import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ioToTask, unsafeTaskToIO } from '../fp-effects-interop';

describe('effects interop', () => {
  it('ioToTask lifts to async safely', async () => {
    const io = () => 7;
    const task = ioToTask(io);
    assert.equal(await task(), 7);
  });

  it('unsafeTaskToIO throws (explicitly unsafe)', () => {
    const t = async () => 7;
    const io = unsafeTaskToIO(t as any);
    assert.throws(() => io());
  });
});


