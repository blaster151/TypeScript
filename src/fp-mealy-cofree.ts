// src/fp-mealy-cofree.ts
import { Kind1, Apply } from '../fp-hkt';
import { Cofree, CofreeK, cofree, extractCofree } from '../fp-free';

// Minimal Functor to keep this file self-contained
export interface Functor<F extends Kind1> {
  map<A, B>(fa: Apply<F, [A]>, f: (a: A) => B): Apply<F, [B]>;
}

// F<X> = (I) => [X, O]
export interface MealyK<I, O> extends Kind1 {
  readonly type: (i: I) => [this['arg0'], O];
}

export function MealyFunctor<I, O>(): Functor<MealyK<I, O>> {
  return {
    map: <A, B>(fx: Apply<MealyK<I, O>, [A]>, f: (a: A) => B): Apply<MealyK<I, O>, [B]> => {
      const step = fx as (i: I) => [A, O];
      return ((i: I) => {
        const [a, o] = step(i);
        return [f(a), o];
      }) as any;
    }
  };
}

// A total machine: state carries current output and a step for next
// SF<I, O> ≅ Cofree<MealyK<I,O>, O>
export type SF<I, O> = Cofree<MealyK<I, O>, O>;

// Build a constant-output machine
export function constantSF<I, O>(o: O): SF<I, O> {
  const F = MealyFunctor<I, O>();
  const tail = ((_: I) => [machine, o]) as any; // self-recursive; fixup below
  const machine: SF<I, O> = cofree(o, F.map(tail as any, (x: any) => x) as any);
  // Patch tail now that machine exists
  (machine as any).tail = ((_: I) => [machine, o]) as any;
  return machine;
}

// Unfold from an initial output and a step function
// step: (prevO, input) -> nextO
export function unfoldSF<I, O>(o0: O, step: (o: O, i: I) => O): SF<I, O> {
  const F = MealyFunctor<I, O>();
  const go = (o: O): SF<I, O> => {
    const tail = ((i: I) => {
      const o1 = step(o, i);
      const next = go(o1);
      return [next, o1] as const;
    }) as Apply<MealyK<I, O>, [SF<I, O>]>;
    return cofree(o, F.map(tail, (x) => x) as any);
  };
  return go(o0);
}

// Arrow on SF<I, _> (Moore-style). We require an initial output for arr.
export const SFArrow = {
  // arr with provided initial output
  arrInit<I, A, B>(init: B, f: (a: A) => B): SF<I, (A extends I ? B : B)> {
    // NOTE: this "arr" ignores I; it’s a pure transducer A->B lifted to a machine.
    // When run as an FRP node, you typically route inputs of type I=A.
    return unfoldSF<B, B>(init, (_o, a: any) => f(a));
  },

  // composition: g >>> f
  compose<I, A, B, C>(g: SF<I, A>, f: SF<I, (A extends I ? B : B)>): SF<I, B> {
    // Moore composition: current output is f.head applied to current "A" (g.head),
    // and next state threads both tails with the same input.
    const F = MealyFunctor<I, B>();
    const go = (gM: SF<I, A>, fM: SF<I, B>): SF<I, B> => {
      const outB = extractCofree(fM); // current B
      const tail = ((i: I) => {
        const [gNext, _aNext] = (gM.tail as any)(i) as [SF<I, A>, A];
        const [fNext, bNext]  = (fM.tail as any)(i) as [SF<I, B>, B];
        return [go(gNext, fNext), bNext] as const;
      }) as Apply<MealyK<I, B>, [SF<I, B>]>;
      return cofree(outB, F.map(tail, (x) => x) as any);
    };
    return go(g, f as any);
  },

  // first: process the first component; pass through the second
  first<I, A, B, C>(f: SF<I, B>): SF<[A, C], [B, C]> {
    type In = [A, C]; type Out = [B, C];
    const F = MealyFunctor<In, Out>();
    const go = (fM: SF<I, B>): SF<In, Out> => {
      const out: Out = [extractCofree(fM), undefined as any as C];
      const tail = ((inp: In) => {
        const [a, c] = inp;
        const [fNext, bNext] = (fM.tail as any)(a) as [SF<I, B>, B];
        return [go(fNext), [bNext, c] as Out] as const;
      }) as Apply<MealyK<In, Out>, [SF<In, Out>]>;
      return cofree(out, F.map(tail, (x) => x) as any);
    };
    return go(f as any);
  }
};

// Run a machine over a chunk of inputs, collecting outputs (Moore semantics):
// yields the initial output, then each transition’s output.
export function runSF<I, O>(sf: SF<I, O>, inputs: ReadonlyArray<I>): O[] {
  const out: O[] = [sf.head];
  let cur = sf;
  for (const i of inputs) {
    const [next, o1] = (cur.tail as any)(i) as [SF<I, O>, O];
    out.push(o1);
    cur = next;
  }
  return out;
}


