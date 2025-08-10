import { assert } from "chai";
import { lens, prism, optional } from '../../../fp-optics';

describe('Optics Type Verification', () => {
  it('should preserve types for Lens → Optional composition', () => {
    const nameLens = lens<{ name: string }, { name: string }, string, string>(
      obj => obj.name,
      (name, obj) => ({ ...obj, name })
    );
    const emailOptional = optional<{ name: string }, { name: string }, string, string>(
      obj => obj.name.includes('@') ? { tag: 'Just', value: obj.name } : { tag: 'Nothing' },
      (email, obj) => ({ ...obj, name: email })
    );
    const composed = nameLens.then(emailOptional);
    assert.property(composed, 'getOption');
    assert.property(composed, 'set');
  });

  it('should preserve types for Prism → Optional composition', () => {
    const successPrism = prism<{ tag: string }, { tag: string }, { tag: 'success' }, { tag: 'success' }>(
      obj => obj.tag === 'success' ? { tag: 'Just', value: obj as any } : { tag: 'Nothing' },
      value => value
    );
    const dataOptional = optional<{ tag: 'success' }, { tag: 'success' }, string, string>(
      obj => obj.tag === 'success' ? { tag: 'Just', value: 'data' } : { tag: 'Nothing' },
      (data, obj) => obj
    );
    const composed = successPrism.then(dataOptional);
    assert.property(composed, 'getOption');
    assert.property(composed, 'set');
  });

  it('should preserve types for Optional → Optional composition', () => {
    const firstOptional = optional<{ data?: string }, { data?: string }, string, string>(
      obj => obj.data ? { tag: 'Just', value: obj.data } : { tag: 'Nothing' },
      (value, obj) => ({ ...obj, data: value })
    );
    const secondOptional = optional<string, string, number, number>(
      str => str.length > 0 ? { tag: 'Just', value: str.length } : { tag: 'Nothing' },
      (num, str) => str
    );
    const composed = firstOptional.then(secondOptional);
    assert.property(composed, 'getOption');
    assert.property(composed, 'set');
  });
});
