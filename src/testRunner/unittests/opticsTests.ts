import { assert } from "chai";
import * as Optics from '../../../fp-optics';
import * as MaybeUnified from '../../../fp-maybe-unified';
import * as EitherUnified from '../../../fp-maybe-unified';
import * as ResultUnified from '../../../fp-maybe-unified';

describe('Optics Foundations', () => {
  describe('Lens Laws and Utilities', () => {
    it('should satisfy Lens Law 1: set(l, get(l, s), s) === s', () => {
      type Person = { name: string; age: number };
      const nameLens = Optics.lens<Person, Person, string, string>(p => p.name, (p, name) => ({ ...p, name }));
      const person: Person = { name: 'Bob', age: 30 };
      const name = Optics.view(nameLens, person);
      const result = Optics.set(nameLens, name, person);
      assert.deepEqual(result, person);
    });
    it('should satisfy Lens Law 2: get(l, set(l, b, s)) === b', () => {
      type Person = { name: string; age: number };
      const nameLens = Optics.lens<Person, Person, string, string>(p => p.name, (p, name) => ({ ...p, name }));
      const person: Person = { name: 'Bob', age: 30 };
      const newName = 'Robert';
      const modifiedPerson = Optics.set(nameLens, newName, person);
      const result = Optics.view(nameLens, modifiedPerson);
      assert.deepEqual(result, newName);
    });
    it('should satisfy Lens Law 3: set(l, b, set(l, b\', s)) === set(l, b, s)', () => {
      type Person = { name: string; age: number };
      const nameLens = Optics.lens<Person, Person, string, string>(p => p.name, (p, name) => ({ ...p, name }));
      const person: Person = { name: 'Bob', age: 30 };
      const name1 = 'Robert';
      const name2 = 'Rob';
      const result1 = Optics.set(nameLens, name2, Optics.set(nameLens, name1, person));
      const result2 = Optics.set(nameLens, name2, person);
      assert.deepEqual(result1, result2);
    });
    it('should transform the focused part with over', () => {
      type Person = { name: string; age: number };
      const nameLens = Optics.lens<Person, Person, string, string>(p => p.name, (p, name) => ({ ...p, name }));
      const person: Person = { name: 'Bob', age: 30 };
      const result = Optics.over(nameLens, name => name.toUpperCase(), person);
      assert.deepEqual(result, { name: 'BOB', age: 30 });
    });
  });
  // ... (repeat for each exported test function, converting to describe/it style)
});
