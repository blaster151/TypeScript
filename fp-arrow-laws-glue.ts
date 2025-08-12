// fp-arrow-laws-glue.ts
//
// Glue to:
// • register CoKleisli<W> (requires a Cochoice<W>) and SF with your registry
// • run Category / Arrow / ArrowChoice law suites for each
//
// Assumes you created `fp-laws-arrows.ts` with:
// runCategoryLaws(dict, gens, eq, samples?)
// runArrowLaws(dict, gens, eq, samples?)
// runArrowChoiceLaws(dict, gens, eq, samples?)

import { Kind1 } from './fp-hkt';
import {
  runCategoryLaws,
  runArrowLaws,
  runArrowChoiceLaws
} from './fp-laws-arrows';
import {
  CoKleisliK,
  arrowChoiceCoKleisli
} from './fp-arrowchoice-cokleisli';
import {
  categorySF,
  arrowSF,
  arrowChoiceSF
} from './fp-sf-arrowchoice';

// -----------------------------
// Tiny test domain + eq helpers
// -----------------------------
type Either<L, R> = { left: L } | { right: R };
const Left = <L, R = never>(left: L): Either<L, R> => ({ left });
const Right = <R, L = never>(right: R): Either<L, R> => ({ right });
type Gen<T> = () => T;
function sampler<T>(xs: T[]): Gen<T> {
  let i = 0;
  return () => xs[(i++ % xs.length)];
}

const genNum: Gen<number> = sampler([-2, -1, 0, 1, 2, 3]);
const genStr: Gen<string> = sampler(['a', 'b', 'c', 'd']);
const genPairNumStr: Gen<[number, string]> = sampler([[-1, 'x'], [0, 'y'], [2, 'z']]);
const genEitherNumStr: Gen<Either<number, string>> = (() => {
  let i = 0;
  return () => ((i++ & 1) === 0) ? Left(genNum()) : Right(genStr());
})();
const genFnNumNum: Gen<(n: number) => number> = sampler([
  (n) => n,
  (n) => n + 1,
  (n) => n * 2,
  (n) => n - 3
]);
const eqNum = (x: number, y: number) => x === y;
const eqStr = (x: string, y: string) => x === y;
const eqPairNumStr = (x: [number, string], y: [number, string]) => eqNum(x[0], y[0]) && eqStr(x[1], y[1]);
const eqEitherNumStr = (x: Either<number, string>, y: Either<number, string>) =>
  ('left' in x) === ('left' in y) && ('left' in x ? eqNum(x.left, (y as any).left) : eqStr((x as any).right, (y as any).right));

// -----------------------------
// Optional registry shape
// -----------------------------
type Registry = {
  registerHKT(name: string, hkt: string): void;
  registerTypeclass(name: string, cls: string, dict: any): void;
};

// -----------------------------
// 1) CoKleisli<W> registration + law runs
// -----------------------------
export function registerAndTestCoKleisliArrowChoice<W extends Kind1>(
  hktName: string,
  Wco: any, // Cochoice<W>
  reg?: Registry,
  samples = 50
) {
  const dict = arrowChoiceCoKleisli(Wco);
  if (reg) {
    reg.registerHKT(hktName, `CoKleisliK<${hktName}>`);
    reg.registerTypeclass(hktName, 'Category', dict);
    reg.registerTypeclass(hktName, 'Arrow', dict);
    reg.registerTypeclass(hktName, 'ArrowChoice', dict);
  }
  const gens = {
    genA: genNum,
    genB: genNum,
    genC: genNum,
    genPairAC: genPairNumStr,
    genEitherAC: genEitherNumStr,
    genFnAB: genFnNumNum,
    genFnBC: genFnNumNum,
    genFnAtoPair: (_?: any) => (a: number): [number, string] => [a, 'k'],
  };
  const eqs = {
    eqA: eqNum,
    eqB: eqNum,
    eqC: eqNum,
    eqPairBC: eqPairNumStr,
    eqEitherBC: eqEitherNumStr
  };
  const catRes = runCategoryLaws(dict as any, gens, eqs, samples);
  const arrRes = runArrowLaws(dict as any, gens, eqs, samples);
  const choRes = runArrowChoiceLaws(dict as any, gens, eqs, samples);
  console.log(`🧪 CoKleisli ${hktName} — Category:`, catRes);
  console.log(`🧪 CoKleisli ${hktName} — Arrow: `, arrRes);
  console.log(`🧪 CoKleisli ${hktName} — Choice: `, choRes);
  return { catRes, arrRes, choRes };
}

// -----------------------------
// 2) SF registration + law runs
// -----------------------------
export function registerAndTestSFArrowChoice(
  hktName = 'SF',
  reg?: Registry,
  samples = 50
) {
  if (reg) {
    reg.registerHKT(hktName, 'SFK');
    reg.registerTypeclass(hktName, 'Category', categorySF);
    reg.registerTypeclass(hktName, 'Arrow', arrowSF);
    reg.registerTypeclass(hktName, 'ArrowChoice', arrowChoiceSF);
  }
  const gens = {
    genA: genNum,
    genB: genNum,
    genC: genNum,
    genPairAC: genPairNumStr,
    genEitherAC: genEitherNumStr,
    genFnAB: genFnNumNum,
    genFnBC: genFnNumNum,
    genFnAtoPair: (_?: any) => (a: number): [number, string] => [a, 'k'],
  };
  const eqs = {
    eqA: eqNum,
    eqB: eqNum,
    eqC: eqNum,
    eqPairBC: eqPairNumStr,
    eqEitherBC: eqEitherNumStr
  };
  const catRes = runCategoryLaws(arrowSF as any, gens, eqs, samples);
  const arrRes = runArrowLaws(arrowSF as any, gens, eqs, samples);
  const choRes = runArrowChoiceLaws(arrowChoiceSF as any, gens, eqs, samples);
  console.log(`🧪 SF ${hktName} — Category:`, catRes);
  console.log(`🧪 SF ${hktName} — Arrow: `, arrRes);
  console.log(`🧪 SF ${hktName} — Choice: `, choRes);
  return { catRes, arrRes, choRes };
}


