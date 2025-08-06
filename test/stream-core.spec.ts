/**
 * Test Harness for StatefulStream Core
 * 
 * Tests the foundational StatefulStream implementation including:
 * - Sequential composition correctness
 * - Parallel composition correctness  
 * - Functor law checks on fmap
 * - Fusion behavior - confirm pure ops fuse without extra state changes
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  StatefulStream,
  StateFn,
  isStatefulStream,
  isPureStream
} from '../src/stream/core/types';

import {
  compose,
  parallel,
  fmap,
  liftStateless,
  liftStateful,
  identity,
  constant,
  canFuse,
  fusePureSequence,
  fanOut,
  fanIn
} from '../src/stream/core/operators';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a simple stateful stream for testing
 */
function createTestStream<I, S, O>(
  fn: (input: I, state: S) => [S, O],
  purity: 'Pure' | 'State' = 'State'
): StatefulStream<I, S, O> {
  return {
    run: (input) => (state) => fn(input, state),
    __brand: 'StatefulStream',
    __purity: purity
  };
}

/**
 * Run a stream with initial state and input
 */
function runStream<I, S, O>(
  stream: StatefulStream<I, S, O>,
  input: I,
  initialState: S
): [S, O] {
  return stream.run(input)(initialState);
}

/**
 * Run a stream multiple times with a list of inputs
 */
function runStreamList<I, S, O>(
  stream: StatefulStream<I, S, O>,
  inputs: I[],
  initialState: S
): [S, O[]] {
  let state = initialState;
  const outputs: O[] = [];
  
  for (const input of inputs) {
    const [newState, output] = stream.run(input)(state);
    state = newState;
    outputs.push(output);
  }
  
  return [state, outputs];
}

// ============================================================================
// Test Cases
// ============================================================================

describe('StatefulStream Core', () => {
  
  describe('Type Guards', () => {
    it('should identify StatefulStream correctly', () => {
      const stream = createTestStream((input: number, state: number) => [state + 1, input * 2]);
      expect(isStatefulStream(stream)).to.be.true;
      expect(isStatefulStream({})).to.be.false;
    });

    it('should identify pure streams correctly', () => {
      const pureStream = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const statefulStream = createTestStream((input: number, state: number) => [state + 1, input * 2], 'State');
      
      expect(isPureStream(pureStream)).to.be.true;
      expect(isPureStream(statefulStream)).to.be.false;
    });
  });

  describe('Basic Stream Operations', () => {
    it('should create identity stream', () => {
      const id = identity<number, number>();
      const [state, output] = runStream(id, 42, 0);
      
      expect(output).to.equal(42);
      expect(state).to.equal(0);
    });

    it('should create constant stream', () => {
      const constStream = constant<number, number, number>(42);
      const [state, output] = runStream(constStream, 100, 0);
      
      expect(output).to.equal(42);
      expect(state).to.equal(0);
    });

    it('should lift stateless function', () => {
      const double = liftStateless((x: number) => x * 2);
      const [state, output] = runStream(double, 21, 0);
      
      expect(output).to.equal(42);
      expect(state).to.equal(0);
      expect(isPureStream(double)).to.be.true;
    });

    it('should lift stateful function', () => {
      const accumulator = liftStateful((input: number, state: number) => [state + input, state + input]);
      const [state, output] = runStream(accumulator, 10, 5);
      
      expect(output).to.equal(15);
      expect(state).to.equal(15);
      expect(isPureStream(accumulator)).to.be.false;
    });
  });

  describe('Sequential Composition', () => {
    it('should compose streams sequentially', () => {
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const addOne = createTestStream((input: number, state: number) => [state, input + 1], 'Pure');
      
      const composed = compose(double, addOne);
      const [state, output] = runStream(composed, 10, 0);
      
      expect(output).to.equal(21); // (10 * 2) + 1
      expect(state).to.equal(0);
    });

    it('should preserve state through composition', () => {
      const counter = createTestStream((input: number, state: number) => [state + 1, state + 1], 'State');
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      
      const composed = compose(counter, double);
      const [state, output] = runStream(composed, 10, 0);
      
      expect(output).to.equal(2); // (0 + 1) * 2
      expect(state).to.equal(1);
    });

    it('should handle multiple compositions', () => {
      const addOne = createTestStream((input: number, state: number) => [state, input + 1], 'Pure');
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const square = createTestStream((input: number, state: number) => [state, input * input], 'Pure');
      
      const composed = compose(compose(addOne, double), square);
      const [state, output] = runStream(composed, 5, 0);
      
      expect(output).to.equal(144); // ((5 + 1) * 2)^2 = 12^2 = 144
      expect(state).to.equal(0);
    });
  });

  describe('Parallel Composition', () => {
    it('should compose streams in parallel', () => {
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const square = createTestStream((input: number, state: number) => [state, input * input], 'Pure');
      
      const parallelStream = parallel(double, square);
      const [state, output] = runStream(parallelStream, [5, 3], 0);
      
      expect(output).to.deep.equal([10, 9]); // [5*2, 3^2]
      expect(state).to.equal(0);
    });

    it('should handle stateful parallel composition', () => {
      const counter1 = createTestStream((input: number, state: number) => [state + 1, state + 1], 'State');
      const counter2 = createTestStream((input: number, state: number) => [state + 2, state + 2], 'State');
      
      const parallelStream2 = parallel(counter1, counter2);
      const [state, output] = runStream(parallelStream2, [10, 20], 0);
      
      expect(output).to.deep.equal([1, 3]); // [0+1, 1+2]
      expect(state).to.equal(3);
    });
  });

  describe('Functor Laws', () => {
    it('should satisfy functor identity law', () => {
      const stream = createTestStream((input: number, state: number) => [state + 1, input * 2]);
      const id = (x: number) => x;
      
      const mapped = fmap(stream, id);
      const [state1, output1] = runStream(stream, 10, 0);
      const [state2, output2] = runStream(mapped, 10, 0);
      
      expect(output1).to.equal(output2);
      expect(state1).to.equal(state2);
    });

    it('should satisfy functor composition law', () => {
      const stream = createTestStream((input: number, state: number) => [state + 1, input * 2]);
      const f = (x: number) => x + 1;
      const g = (x: number) => x * 3;
      
      const mapped1 = fmap(fmap(stream, f), g);
      const mapped2 = fmap(stream, (x) => g(f(x)));
      
      const [state1, output1] = runStream(mapped1, 10, 0);
      const [state2, output2] = runStream(mapped2, 10, 0);
      
      expect(output1).to.equal(output2);
      expect(state1).to.equal(state2);
    });
  });

  describe('Fusion Behavior', () => {
    it('should detect fusible streams', () => {
      const pure1 = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const pure2 = createTestStream((input: number, state: number) => [state, input + 1], 'Pure');
      const stateful = createTestStream((input: number, state: number) => [state + 1, input * 2], 'State');
      
      expect(canFuse(pure1, pure2)).to.be.true;
      expect(canFuse(pure1, stateful)).to.be.false;
      expect(canFuse(stateful, pure2)).to.be.false;
    });

    it('should fuse pure streams without state changes', () => {
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const addOne = createTestStream((input: number, state: number) => [state, input + 1], 'Pure');
      const square = createTestStream((input: number, state: number) => [state, input * input], 'Pure');
      
      const fused = fusePureSequence([double, addOne, square]);
      const [state, output] = runStream(fused, 5, 0);
      
      expect(output).to.equal(121); // ((5 * 2) + 1)^2 = 11^2 = 121
      expect(state).to.equal(0);
      expect(isPureStream(fused)).to.be.true;
    });

    it('should not fuse stateful streams', () => {
      const counter = createTestStream((input: number, state: number) => [state + 1, state + 1], 'State');
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      
      const composed = fusePureSequence([counter, double]);
      const [state, output] = runStream(composed, 10, 0);
      
      expect(output).to.equal(2); // (0 + 1) * 2
      expect(state).to.equal(1);
      expect(isPureStream(composed)).to.be.false;
    });
  });

  describe('Fan Operations', () => {
    it('should fan out input to multiple streams', () => {
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const square = createTestStream((input: number, state: number) => [state, input * input], 'Pure');
      
      const fanned = fanOut(double, square);
      const [state, output] = runStream(fanned, 5, 0);
      
      expect(output).to.deep.equal([10, 25]); // [5*2, 5^2]
      expect(state).to.equal(0);
    });

    it('should fan in multiple streams', () => {
      const addOne = createTestStream((input: number, state: number) => [state, input + 1], 'Pure');
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      
      const fanned = fanIn(addOne, double, (a, b) => a + b);
      const [state, output] = runStream(fanned, [5, 3], 0);
      
      expect(output).to.equal(11); // (5 + 1) + (3 * 2) = 6 + 6 = 12
      expect(state).to.equal(0);
    });
  });

  describe('Complex Examples', () => {
    it('should handle complex stream processing', () => {
      // Create a stream that processes numbers: double -> add one -> square
      const double = createTestStream((input: number, state: number) => [state, input * 2], 'Pure');
      const addOne = createTestStream((input: number, state: number) => [state, input + 1], 'Pure');
      const square = createTestStream((input: number, state: number) => [state, input * input], 'Pure');
      
      const pipeline = compose(compose(double, addOne), square);
      
      const inputs = [1, 2, 3, 4, 5];
      const [finalState, outputs] = runStreamList(pipeline, inputs, 0);
      
      expect(outputs).to.deep.equal([9, 25, 49, 81, 121]); // ((n*2)+1)^2
      expect(finalState).to.equal(0);
    });

    it('should handle stateful accumulation', () => {
      // Create a stream that accumulates state while processing
      const accumulator = createTestStream(
        (input: number, state: number) => [state + input, state + input],
        'State'
      );
      
      const inputs = [1, 2, 3, 4, 5];
      const [finalState, outputs] = runStreamList(accumulator, inputs, 0);
      
      expect(outputs).to.deep.equal([1, 3, 6, 10, 15]); // Running sum
      expect(finalState).to.equal(15);
    });
  });
}); 