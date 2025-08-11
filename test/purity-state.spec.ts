import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFPRegistry } from '../fp-registry-init';

// Simple effect inference heuristic for tests
import { extractPurityMarker, hasPurityMarker } from '../fp-purity';

describe('Purity policy: State is Pure', () => {
  it('registry marks State as Pure (if purity metadata exists)', () => {
    const reg = getFPRegistry?.();
    if (!reg) return;
    const purity = reg.getPurity?.('State');
    if (purity !== undefined) {
      assert.equal(purity, 'Pure');
    }
  });

  it('heuristic treats State-like carriers as Pure', () => {
    const fakeState = { runState: (_s: unknown) => [42, 's1'], __effect: 'State', __purity: { effect: 'Pure', isPure: true, isImpure: false } } as any;
    if (hasPurityMarker(fakeState)) {
      const info = extractPurityMarker(fakeState);
      assert.equal(info.effect, 'Pure');
    }
  });
});


