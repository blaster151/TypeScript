/**
 * Registration flows for adjunctions (Free/Cofree), with diagnostics gating
 */

import { Kind1, Apply } from './fp-hkt';
import { Functor, Monad } from './fp-typeclasses-hkt';
import { Adjunction, monadFromAdjunction, comonadFromAdjunction, Comonad, checkTriangles } from './fp-adjunction';
import { adjunctionFree, adjunctionCofree } from './fp-adjunction-free';
import { runMonadLaws, runNatLaws, runFunctorLaws, reportLawDiagnostics, Eq } from './fp-laws';

// Minimal global registry hook (replace with your real registry)
const GLOBAL_ADJUNCTIONS: any[] = [];

export interface AdjunctionConfig<F extends Kind1> {
  readonly functor: Functor<F>;
  readonly effectTag?: 'Pure' | 'State' | 'Async' | 'IO';
}

// Register Free adjunction and derived Monad
export function registerFreeAdjunction<F extends Kind1, A>(
  cfg: AdjunctionConfig<F>,
  algebra: <A>(fa: Apply<F, [A]>) => A,
  gens: {
    genA: () => any;
    genFA: () => Apply<any, [any]>;
    genF: () => (a: any) => any;
    eqFA: Eq<Apply<any, [any]>>;
    eqFC: Eq<Apply<any, [any]>>;
  }
): void {
  const A = adjunctionFree(cfg.functor, algebra);
  (A as any).effectTag = cfg.effectTag ?? 'Pure';
  // Triangle checks (sample-based)
  const trianglesOk = checkTriangles(A as any, cfg.functor as any, { map: (x: any, f: any) => x } as any, gens.genFA as any, gens.eqFA as any, gens.genFA as any, gens.eqFA as any);
  if (!trianglesOk) {
    reportLawDiagnostics('Adjunction(Free) triangles', { triangles: false } as any);
    return;
  }
  // Derive Monad T = R ∘ L
  const derived = monadFromAdjunction(A as any, cfg.functor as any, { map: (x: any, f: any) => x } as any);
  // Law checks (rudimentary)
  const monadLawRes = runMonadLaws(derived.monad as any, gens.genA, gens.genFA, () => (a: any) => derived.monad.of(a) as any, () => (b: any) => derived.monad.of(b) as any, gens.eqFA, gens.eqFC, 20);
  reportLawDiagnostics('Monad from Free adjunction', monadLawRes as any);
  GLOBAL_ADJUNCTIONS.push({ type: 'Free', adjunction: A, monad: derived });
}

// Register Cofree adjunction and derived Comonad
export function registerCofreeAdjunction<F extends Kind1>(
  cfg: AdjunctionConfig<F>,
  coalgebra: <A>(a: A) => Apply<F, [A]>,
  gens: {
    genUA: () => Apply<any, [any]>;
    genF: () => (a: any) => any;
    eqU: Eq<Apply<any, [any]>>;
  }
): void {
  const A = adjunctionCofree(cfg.functor, coalgebra);
  (A as any).effectTag = cfg.effectTag ?? 'Pure';
  const derived = comonadFromAdjunction(A as any, cfg.functor as any, { map: (x: any, f: any) => x } as any);
  // Basic comonad sanity (extract/extend) not shown; wire via a Comonad laws runner if added later
  GLOBAL_ADJUNCTIONS.push({ type: 'Cofree', adjunction: A, comonad: derived });
}

export function getRegisteredAdjunctions() { return GLOBAL_ADJUNCTIONS.slice(); }


