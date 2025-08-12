import { Kind2, Apply } from './fp-hkt';
import { Category, Arrow, ArrowChoice, ArrowApply } from './src/fp-typeclasses-arrows';

export type Eq<T> = (x: T, y: T) => boolean;
export type Gen<T> = () => T;

type LawCheck = { name: string; ok: boolean };
export type LawReport = { sampleCount: number; checks: LawCheck[] };

function all(checks: LawCheck[]): boolean { return checks.every(c => c.ok); }
function repeat(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

/** Equality for arrows via an evaluator + domain samples */
export function eqArrow<P extends Kind2, A, B>(
  evalP: <X, Y>(p: Apply<P, [X, Y]>) => (x: X) => Y,
  eqB: Eq<B>,
  samples: A[]
): (p1: Apply<P, [A, B]>, p2: Apply<P, [A, B]>) => boolean {
  return (p1, p2) => {
    const f1 = evalP(p1), f2 = evalP(p2);
    for (const a of samples) {
      if (!eqB(f1(a), f2(a))) return false;
    }
    return true;
  };
}

// -----------------------------------------
// Category laws
// -----------------------------------------
export function runCategoryLaws<P extends Kind2, A, B, C, D>(
  C: Category<P>,
  cfg: {
    lift: <X, Y>(f: (x: X) => Y) => Apply<P, [X, Y]>;
    evalP: <X, Y>(p: Apply<P, [X, Y]>) => (x: X) => Y;
    genA: Gen<A>;
    genB: Gen<B>;
    genC: Gen<C>;
    genD: Gen<D>;
    eqD: Eq<D>;
    samples?: number;
  }
): LawReport {
  const N = cfg.samples ?? 50;
  const As = repeat(N).map(cfg.genA);
  const eq = eqArrow<P, A, D>(cfg.evalP, cfg.eqD, As);

  // build random endomorphisms via lift
  const f = cfg.lift<A, B>(x => cfg.genB());
  const g = cfg.lift<B, C>(x => cfg.genC());
  const h = cfg.lift<C, D>(x => cfg.genD());

  const assoc = eq(
    C.compose(C.compose(h, g) as any, f as any) as any,
    C.compose(h as any, C.compose(g, f) as any) as any
  );

  const idL = eq(C.compose(C.id<A>(), f as any) as any, f as any);
  const idR = eq(C.compose(f as any, C.id<B>()) as any, f as any);

  return { sampleCount: N, checks: [
    { name: 'Category: associativity', ok: assoc },
    { name: 'Category: left identity', ok: idL },
    { name: 'Category: right identity', ok: idR },
  ]};
}

// -----------------------------------------
// Arrow laws (arr, first)
// -----------------------------------------
export function runArrowLaws<P extends Kind2, A, B, C, D>(
  Ainst: Arrow<P>,
  cfg: {
    evalP: <X, Y>(p: Apply<P, [X, Y]>) => (x: X) => Y;
    genA: Gen<A>;
    genB: Gen<B>;
    genC: Gen<C>;
    genD: Gen<D>;
    eq: {
      AB: Eq<B>;
      AC: Eq<[A, C]>;
      BC: Eq<[B, C]>;
      DC: Eq<[D, C]>;
    };
    samples?: number;
  }
): LawReport {
  const N = cfg.samples ?? 50;
  const As = repeat(N).map(cfg.genA);
  const ACs = repeat(N).map(() => [cfg.genA(), cfg.genC()] as [A, C]);
  const eqArr = <X, Y>(eqY: Eq<Y>, Xs: X[]) => eqArrow<P, X, Y>(cfg.evalP, eqY, Xs);

  const f = (a: A) => cfg.genB();
  const g = (b: B) => cfg.genD();

  // arr id = id
  const lawArrId = eqArr<A, A>((x, y) => x === y, As)(
    Ainst.arr<A, A>(x => x),
    Ainst.id<A>()
  );

  // arr (g∘f) = arr g ∘ arr f
  const lawArrComp = eqArr<A, D>(cfg.eq.AB as any, As)(
    Ainst.arr<A, D>(x => g(f(x))),
    Ainst.compose(Ainst.arr<B, D>(g), Ainst.arr<A, B>(f))
  );

  // first (f ∘ g) = first f ∘ first g
  const af = Ainst.arr<A, B>(f);
  const ag = Ainst.arr<B, D>(g);
  const lawFirstComp = eqArr<[A, C], [D, C]>(cfg.eq.DC, ACs)(
    Ainst.first(Ainst.compose(ag, af)),
    Ainst.compose(Ainst.first(ag), Ainst.first(af))
  );

  // Naturality of first: first(arr h) = arr (mapFst h)
  const h = (a: A) => cfg.genA();
  const mapFst = (hc: [A, C]) : [A, C] => [h(hc[0]), hc[1]];
  const lawFirstNaturality = eqArr<[A, C], [A, C]>(cfg.eq.AC, ACs)(
    Ainst.first(Ainst.arr<A, A>(h)),
    Ainst.arr<[A, C], [A, C]>(mapFst)
  );

  return { sampleCount: N, checks: [
    { name: 'Arrow: arr id = id', ok: lawArrId },
    { name: 'Arrow: arr (g∘f) = arr g ∘ arr f', ok: lawArrComp },
    { name: 'Arrow: first distributes over composition', ok: lawFirstComp },
    { name: 'Arrow: first naturality (tuple)', ok: lawFirstNaturality },
  ]};
}

// -----------------------------------------
// ArrowChoice laws (left)
// -----------------------------------------
export function runArrowChoiceLaws<P extends Kind2, A, B, C>(
  AC: ArrowChoice<P>,
  cfg: {
    evalP: <X, Y>(p: Apply<P, [X, Y]>) => (x: X) => Y;
    genA: Gen<A>;
    genB: Gen<B>;
    genC: Gen<C>;
    eq: {
      EB: Eq<({ tag: 'Left'; value: B } | { tag: 'Right'; value: C })>;
    };
    sum: {
      left: <X>(x: X) => ({ tag: 'Left', value: x } as const);
      right: <X>(x: X) => ({ tag: 'Right', value: x } as const);
    };
    samples?: number;
  }
): LawReport {
  const N = cfg.samples ?? 50;
  const Es = repeat(N).map(i => i % 2 === 0 ? cfg.sum.left(cfg.genA()) : cfg.sum.right(cfg.genC()));
  const eqArr = eqArrow<P, typeof Es[number], { tag: 'Left'; value: B } | { tag: 'Right'; value: C }>(
    cfg.evalP, cfg.eq.EB, Es as any
  );

  const f = (a: A) => cfg.genB();

  // left (arr f) = arr (left f)
  const lawLeftArr = eqArr(
    AC.left(AC.arr<A, B>(f)),
    AC.arr<typeof Es[number], { tag: 'Left'; value: B } | { tag: 'Right'; value: C }>(e =>
      (e as any).tag === 'Left' ? cfg.sum.left(f((e as any).value)) : cfg.sum.right((e as any).value)
    )
  );

  return { sampleCount: N, checks: [
    { name: 'ArrowChoice: left (arr f) = arr (left f)', ok: lawLeftArr },
  ]};
}

// -----------------------------------------
// ArrowApply laws (beta/eta-like)
// -----------------------------------------
export function runArrowApplyLaws<P extends Kind2, A, B>(
  AA: ArrowApply<P>,
  cfg: {
    evalP: <X, Y>(p: Apply<P, [X, Y]>) => (x: X) => Y;
    genA: Gen<A>;
    genF: Gen<(a: A) => B>;
    eqB: Eq<B>;
    samples?: number;
  }
): LawReport {
  const N = cfg.samples ?? 50;
  const As = repeat(N).map(cfg.genA);
  const Fs = repeat(N).map(cfg.genF);
  const eq = eqArrow<P, [ (a: A) => B, A ], B>(cfg.evalP, cfg.eqB, Fs.map((f, i) => [f, As[i % As.length]]));

  // Beta: app ∘ (arr (\(f,a) -> (f,a))) = arr (\(f,a) -> f a)
  const pairId = AA.arr<[ (a: A) => B, A ], [ (a: A) => B, A ]>(x => x);
  const beta = eq(
    AA.compose(AA.app<A, B>(), pairId),
    AA.arr(([f, a]) => f(a))
  );

  // Eta: f = app ∘ (arr (\a -> (f,a)))
  const anyF = AA.arr<A, B>(cfg.genF()); // fixed arrow
  const etaEq = eqArrow<P, A, B>(cfg.evalP, cfg.eqB, As)(
    anyF,
    AA.compose(AA.app<A, B>(), AA.arr<A, [(a: A) => B, A]>(a => [cfg.evalP(anyF)(undefined as any) as any, a] as any))
  );

  return { sampleCount: N, checks: [
    { name: 'ArrowApply: beta', ok: beta },
    { name: 'ArrowApply: eta  (weak, sampled)', ok: etaEq },
  ]};
}


