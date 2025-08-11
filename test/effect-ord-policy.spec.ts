import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFPRegistry } from '../fp-registry-init';

describe('Effect Ord policy', () => {
  it('does not register Ord for IO/Task/State', () => {
    const reg = getFPRegistry?.();
    if (!reg) return;

    const hasOrd = (name: string) => !!reg.getTypeclass(name, 'Ord');
    ['IO', 'Task', 'State'].forEach(t => assert.equal(hasOrd(t), false));
  });
});


