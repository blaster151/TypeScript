// src/test-cli.ts
import { runArrowLawSuite } from './registry';
import { runCategoryLaws, runArrowLaws, runArrowChoiceLaws, runArrowApplyLaws } from '../fp-laws-arrows';
import { FunctionCategory, FunctionArrow, FunctionArrowChoice, FunctionArrowApply } from './fp-arrows-function';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const arrows = runArrowLawSuite();
  // eslint-disable-next-line no-console
  console.log('— Arrow Laws (Function) —');
  for (const group of [arrows.cat, arrows.arr, arrows.cho, arrows.app]) {
    for (const ev of group) {
      // eslint-disable-next-line no-console
      console.log(`${ev.name}: ${ev.passed ? 'OK' : 'FAIL'} ${ev.failures ? `(fails: ${ev.failures})` : ''}`);
      if (!ev.passed && ev.firstFailure) {
        // eslint-disable-next-line no-console
        console.log('  1st:', ev.firstFailure);
      }
    }
  }

  // Additional smoke using the generic law runners (root fp-laws-arrows)
  // For Function arrows, lift/eval are identity
  const liftFn = <A, B>(f: (a: A) => B) => f;
  const evalFn = <A, B>(p: (a: A) => B) => p;

  const randInt = () => ((Math.random() * 100) | 0) - 50;
  const genNum = () => randInt();
  const genPairNum = () => [randInt(), randInt()] as [number, number];
  const eqNum = (x: number, y: number) => x === y;
  const eqPair = (x: [number, number], y: [number, number]) => x[0] === y[0] && x[1] === y[1];

  // Category
  const catRes = runCategoryLaws(FunctionCategory as any, {
    lift: liftFn as any,
    evalP: evalFn as any,
    genA: genNum,
    genB: genNum,
    genC: genNum,
    genD: genNum,
    eqD: eqNum,
    samples: 30,
  });
  // eslint-disable-next-line no-console
  console.log('[Generic] Category(Function):', catRes);

  // Arrow (arr/first)
  const arrRes = runArrowLaws(FunctionArrow as any, {
    evalP: evalFn as any,
    genA: genNum,
    genB: genNum,
    genC: genNum,
    genD: genNum,
    eq: {
      AB: eqNum,
      AC: eqPair,
      BC: eqPair,
      DC: eqPair,
    },
    samples: 30,
  });
  // eslint-disable-next-line no-console
  console.log('[Generic] Arrow(Function):', arrRes);

  // ArrowChoice: skipped here due to shape mismatch (our Either is structural {left|right})
  // You can adapt the root law runner or provide a wrapper to normalize shapes if desired.

  // ArrowApply
  const applyRes = runArrowApplyLaws(FunctionArrowApply as any, {
    evalP: evalFn as any,
    genA: genNum,
    genF: () => (a: number) => a + randInt(),
    eqB: eqNum,
    samples: 30,
  });
  // eslint-disable-next-line no-console
  console.log('[Generic] ArrowApply(Function):', applyRes);
}


