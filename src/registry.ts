// src/registry.ts (additions for Arrow registries and law runners)
import { FunctionCategory, FunctionArrow, FunctionArrowChoice, FunctionArrowApply } from './fp-arrows-function';
import { arrowFromKleisli } from './fp-arrows-kleisli';
import { runCategoryLaws, runArrowLaws, runArrowChoiceLaws, runArrowApplyLaws } from './fp-laws-arrows';
import type { Monad } from '../fp-typeclasses-hkt';

// Minimal eq
const eqJSON = (x: any, y: any) => JSON.stringify(x) === JSON.stringify(y);

export function registerFunctionArrows(reg: any) {
  reg.registerTypeclass('Function', 'Category', FunctionCategory);
  reg.registerTypeclass('Function', 'Arrow', FunctionArrow);
  reg.registerTypeclass('Function', 'ArrowChoice', FunctionArrowChoice);
  reg.registerTypeclass('Function', 'ArrowApply', FunctionArrowApply);
}

export function registerKleisliArrows<M extends any>(name: string, M: Monad<any>, reg: any) {
  const K = arrowFromKleisli(M);
  if (typeof reg.registerHKT === 'function') {
    reg.registerHKT(`${name}Kleisli`, `KleisliK<${name}>`);
  }
  reg.registerTypeclass(`${name}Kleisli`, 'Category', K.category);
  reg.registerTypeclass(`${name}Kleisli`, 'Arrow', K.arrow);
  reg.registerTypeclass(`${name}Kleisli`, 'ArrowChoice', K.arrowChoice);
  reg.registerTypeclass(`${name}Kleisli`, 'ArrowApply', K.arrowApply);
}

// Quick smoke runner
export function runArrowLawSuite() {
  // Functions
  const gens = {
    genA: () => Math.floor(Math.random() * 10),
    genB: () => Math.floor(Math.random() * 10) + 1,
    genC: () => Math.floor(Math.random() * 10) + 2,
  };
  const mk = {
    f: (a: number) => a + 1,
    g: (b: number) => b * 2,
    pab: (a: number) => a + 1,
    pbc: (b: number) => b * 2,
    pac: (a: number) => (a + 1) * 2,
  };

  const cat = runCategoryLaws(FunctionArrow as any, gens as any, eqJSON, mk as any);
  const arr = runArrowLaws(FunctionArrow as any, gens as any, eqJSON, mk as any);
  const cho = runArrowChoiceLaws(FunctionArrowChoice as any, gens as any, eqJSON, { f: mk.f } as any);
  const app = runArrowApplyLaws(FunctionArrowApply as any, gens as any, eqJSON);

  return { cat, arr, cho, app };
}


