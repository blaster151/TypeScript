import { assert } from "chai";
import * as HKT from '../../../fp-hkt';
import * as Typeclasses from '../../../fp-typeclasses-hok';

describe('Higher-Order Kinds (HOKs) System', () => {
  it('should support KindAny abstraction', () => {
    type TestKindAny = HKT.KindAny extends HKT.Kind<readonly HKT.Type[]> ? true : false;
    assert.isTrue(true as TestKindAny);
  });
  it('should support HigherKind basic functionality', () => {
    type TestHigherKind = HKT.HigherKind<HKT.Kind1, HKT.Kind1>;
    type TestHigherKindExists = TestHigherKind extends HKT.HigherKind<HKT.KindAny, HKT.KindAny> ? true : false;
    assert.isTrue(true as TestHigherKindExists);
  });
  // ... (repeat for each test in testHigherOrderKinds, converting to it/assert style)
});
