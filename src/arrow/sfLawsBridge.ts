// src/arrow/sfLawsBridge.ts
//
// One-liner bridges so you can run Category/Arrow laws for SF<I,O,_,_>.
//
// Usage in your test bootstrap:
// import { registerSFWithCategoryLaws, registerSFWithArrowLaws } from './sfLawsBridge';
// registerSFWithCategoryLaws<number, string>(runCategoryLaws);
// registerSFWithArrowLaws<number, string>(runArrowLaws);
//
// (Adjust I,O types used by your generators.)
import { categorySF, arrowSF } from './SFArrow';

// Category
export function registerSFWithCategoryLaws<I, O>(
  runCategoryLaws: (label: string, cat: ReturnType<typeof categorySF<I, O>>) => void
): void {
  runCategoryLaws('SF(CoKleisli ∘ Cofree<Step>) — Category', categorySF<I, O>());
}

// Arrow
export function registerSFWithArrowLaws<I, O>(
  runArrowLaws: (label: string, arr: ReturnType<typeof arrowSF<I, O>>) => void
): void {
  runArrowLaws('SF(CoKleisli ∘ Cofree<Step>) — Arrow', arrowSF<I, O>());
}


