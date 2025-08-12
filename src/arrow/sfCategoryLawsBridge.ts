// src/arrow/sfCategoryLawsBridge.ts
//
// Bridge to Category law runner for SF (signal functions) as CoKleisli over Cofree<Step, _>.
// Import your law runner and hand it the Category dictionary.

import { categorySF } from './CoKleisliCategory';

// If your law harness expects a specific shape, adapt this wrapper accordingly.
export function registerSFCatWithLaws<I, O>(runCategoryLaws: (
  C: ReturnType<typeof categorySF<I, O>>
) => void): void {
  const C = categorySF<I, O>();
  runCategoryLaws(C);
}

// Example auto-register (commented):
// import { runCategoryLaws } from '../../fp-laws-arrows';
// registerSFCatWithLaws<any, any>((C) => runCategoryLaws(C as any, /* cfg */ {} as any));


