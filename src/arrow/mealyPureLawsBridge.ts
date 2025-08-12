// src/arrow/mealyPureLawsBridge.ts
//
// Tiny bridge so you can plug the Mealy Arrow into your law runner.
import { categoryMealy, arrowMealy, arrowChoiceMealy } from './MealyPure';

export function registerMealyWithCategoryLaws(
  runCategoryLaws: (label: string, cat: ReturnType<typeof categoryMealy>) => void
): void {
  runCategoryLaws('Mealy (pure) — Category', categoryMealy());
}

export function registerMealyWithArrowLaws(
  runArrowLaws: (label: string, arr: ReturnType<typeof arrowMealy>) => void
): void {
  runArrowLaws('Mealy (pure) — Arrow', arrowMealy());
}

export function registerMealyWithArrowChoiceLaws(
  runArrowChoiceLaws: (label: string, arrC: ReturnType<typeof arrowChoiceMealy>) => void
): void {
  runArrowChoiceLaws('Mealy (pure) — ArrowChoice', arrowChoiceMealy());
}


