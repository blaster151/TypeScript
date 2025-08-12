/**
 * Typeclass law witnesses and runners
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor, Monad } from './fp-typeclasses-hkt';
import { NaturalTransformation, checkNaturality, EffectTag } from './fp-nat';

export interface Eq<T> { equals(a: T, b: T): boolean }

export interface FunctorLaws<F extends Kind1> {
  identity<A>(Finst: Functor<F>, fa: Apply<F, [A]>, eq: Eq<Apply<F, [A]>>): boolean;
  composition<A, B, C>(
    Finst: Functor<F>,
    fa: Apply<F, [A]>,
    f: (a: A) => B,
    g: (b: B) => C,
    eq: Eq<Apply<F, [C]>>
  ): boolean;
}

export interface MonadLaws<F extends Kind1> {
  leftIdentity<A, B>(
    Minst: Monad<F>,
    a: A,
    f: (a: A) => Apply<F, [B]>,
    eq: Eq<Apply<F, [B]>>
  ): boolean;
  rightIdentity<A>(Minst: Monad<F>, fa: Apply<F, [A]>, eq: Eq<Apply<F, [A]>>): boolean;
  associativity<A, B, C>(
    Minst: Monad<F>,
    fa: Apply<F, [A]>,
    f: (a: A) => Apply<F, [B]>,
    g: (b: B) => Apply<F, [C]>,
    eq: Eq<Apply<F, [C]>>
  ): boolean;
}

export interface NatLaws<F extends Kind1, G extends Kind1> {
  naturality<A, B>(
    alpha: NaturalTransformation<F, G>,
    Finst: Functor<F>,
    Ginst: Functor<G>,
    fa: Apply<F, [A]>,
    f: (a: A) => B,
    eq: Eq<Apply<G, [B]>>
  ): boolean;
}

export const FunctorLawWitness: FunctorLaws<any> = {
  identity: <A>(Finst: Functor<any>, fa: Apply<any, [A]>, eq: Eq<Apply<any, [A]>>): boolean => {
    const mapped = Finst.map(fa, (x: A) => x);
    return eq.equals(mapped, fa);
  },
  composition: <A, B, C>(
    Finst: Functor<any>, fa: Apply<any, [A]>, f: (a: A) => B, g: (b: B) => C, eq: Eq<Apply<any, [C]>>
  ): boolean => {
    const left = Finst.map(Finst.map(fa, f), g);
    const right = Finst.map(fa, (a: A) => g(f(a)));
    return eq.equals(left, right);
  }
};

export const MonadLawWitness: MonadLaws<any> = {
  leftIdentity: <A, B>(Minst: Monad<any>, a: A, f: (a: A) => Apply<any, [B]>, eq: Eq<Apply<any, [B]>>): boolean => {
    const left = Minst.chain(Minst.of(a), f);
    const right = f(a);
    return eq.equals(left, right);
  },
  rightIdentity: <A>(Minst: Monad<any>, fa: Apply<any, [A]>, eq: Eq<Apply<any, [A]>>): boolean => {
    const left = Minst.chain(fa, Minst.of);
    return eq.equals(left, fa);
  },
  associativity: <A, B, C>(
    Minst: Monad<any>,
    fa: Apply<any, [A]>,
    f: (a: A) => Apply<any, [B]>,
    g: (b: B) => Apply<any, [C]>,
    eq: Eq<Apply<any, [C]>>
  ): boolean => {
    const left = Minst.chain(Minst.chain(fa, f), g);
    const right = Minst.chain(fa, (a: A) => Minst.chain(f(a), g));
    return eq.equals(left, right);
  }
};

export const NatLawWitness: NatLaws<any, any> = {
  naturality: <A, B>(
    alpha: NaturalTransformation<any, any>,
    Finst: Functor<any>,
    Ginst: Functor<any>,
    fa: Apply<any, [A]>,
    f: (a: A) => B,
    eq: Eq<Apply<any, [B]>>
  ): boolean => checkNaturality(alpha, Finst, Ginst, fa, f, eq.equals)
};

// Simple runners with sample generators
export type Gen<T> = () => T;

export function runFunctorLaws<F extends Kind1, A, B, C>(
  Finst: Functor<F>,
  genFA: Gen<Apply<F, [A]>>,
  genF: Gen<(a: A) => B>,
  genG: Gen<(b: B) => C>,
  eqFA: Eq<Apply<F, [A]>>, eqFC: Eq<Apply<F, [C]>>,
  samples = 100
): { identityPass: boolean; compositionPass: boolean } {
  let idOk = true, compOk = true;
  for (let i = 0; i < samples; i++) {
    const fa = genFA();
    const f = genF();
    const g = genG();
    idOk = idOk && FunctorLawWitness.identity(Finst, fa, eqFA);
    compOk = compOk && FunctorLawWitness.composition(Finst, fa, f, g, eqFC);
    if (!idOk || !compOk) break;
  }
  return { identityPass: idOk, compositionPass: compOk };
}

export function runMonadLaws<F extends Kind1, A, B, C>(
  Minst: Monad<F>,
  genA: Gen<A>,
  genFA: Gen<Apply<F, [A]>>,
  genF: Gen<(a: A) => Apply<F, [B]>>,
  genG: Gen<(b: B) => Apply<F, [C]>>,
  eqFA: Eq<Apply<F, [A]>>, eqFC: Eq<Apply<F, [C]>>,
  samples = 100
): { leftIdPass: boolean; rightIdPass: boolean; assocPass: boolean } {
  let l = true, r = true, aOk = true;
  for (let i = 0; i < samples; i++) {
    const a = genA();
    const fa = genFA();
    const f = genF();
    const g = genG();
    l = l && MonadLawWitness.leftIdentity(Minst, a, f, eqFC);
    r = r && MonadLawWitness.rightIdentity(Minst, fa, eqFA);
    aOk = aOk && MonadLawWitness.associativity(Minst, fa, f, g, eqFC);
    if (!l || !r || !aOk) break;
  }
  return { leftIdPass: l, rightIdPass: r, assocPass: aOk };
}

export function runNatLaws<F extends Kind1, G extends Kind1, A, B>(
  alpha: NaturalTransformation<F, G>,
  Finst: Functor<F>,
  Ginst: Functor<G>,
  genFA: Gen<Apply<F, [A]>>,
  genF: Gen<(a: A) => B>,
  eqGB: Eq<Apply<G, [B]>>,
  samples = 100
): { naturalityPass: boolean } {
  let ok = true;
  for (let i = 0; i < samples; i++) {
    const fa = genFA();
    const f = genF();
    ok = ok && NatLawWitness.naturality(alpha, Finst, Ginst, fa, f, eqGB);
    if (!ok) break;
  }
  return { naturalityPass: ok };
}

// Diagnostic helper (console-based; integrate with your Kind diagnostics as needed)
export function reportLawDiagnostics(name: string, result: Record<string, boolean>): void {
  const failures = Object.entries(result).filter(([, pass]) => !pass).map(([k]) => k);
  if (failures.length > 0) {
    console.warn(`[Laws] ${name}: FAILED -> ${failures.join(', ')}`);
  } else {
    console.log(`[Laws] ${name}: OK`);
  }
}

// Convenience re-exports for arrow laws
export {
  runCategoryLaws,
  runArrowLaws,
  runArrowChoiceLaws,
  runArrowApplyLaws,
} from './fp-laws-arrows';
export type { LawReport } from './fp-laws-arrows';


