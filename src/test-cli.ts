// src/test-cli.ts
import { runArrowLawSuite } from './registry';

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
}


