import { Kind1 } from './fp-hkt';
import { Functor } from './fp-typeclasses-hkt';
import { Cofree, cofree } from './fp-free';

// Step functor: F<X> = (i: I) => [X, O]
export interface StepK<I, O> extends Kind1 {
  readonly type: (i: I) => [this['arg0'], O];
}

export function StepFunctor<I, O>(): Functor<StepK<I, O>> {
  return {
    map: <A, B>(fx: (i: I) => [A, O], f: (a: A) => B): (i: I) => [B, O] =>
      (i) => {
        const [a, o] = fx(i);
        return [f(a), o];
      },
  } as Functor<StepK<I, O>>;
}

// A total machine is a Cofree<Step, O>
export type Machine<I, O> = Cofree<StepK<I, O>, O>;

/**
 * Build a machine from an initial output and a transition:
 * next: (i, o_curr) => [o_nextState, o_emitted]
 */
export function buildMachine<I, O>(
  o0: O,
  next: (i: I, o: O) => [O, O]
): Machine<I, O> {
  const step = (o: O): ((i: I) => [Machine<I, O>, O]) =>
    (i: I) => {
      const [oNext, oEmit] = next(i, o);
      return [cofree<StepK<I, O>, O>(oNext, step(oNext)), oEmit];
    };
  return cofree<StepK<I, O>, O>(o0, step(o0));
}

/**
 * Drive a machine over a finite input list, returning final machine and emitted outputs.
 */
export function runMachine<I, O>(
  m: Machine<I, O>,
  inputs: I[]
): { machine: Machine<I, O>; outputs: O[] } {
  let cur = m;
  const outs: O[] = [];
  for (const i of inputs) {
    const [nextM, o] = cur.tail(i);
    outs.push(o);
    cur = nextM;
  }
  return { machine: cur, outputs: outs };
}


