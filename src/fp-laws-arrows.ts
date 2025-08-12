// src/fp-laws-arrows.ts
import { Category, Arrow, ArrowChoice, ArrowApply, LawEvidence } from './fp-typeclasses-arrows';
import type { Either } from '../fp-hkt';
import { Left, Right, matchEither } from '../fp-either-unified';

type Gen<A> = () => A;
type Eq<A> = (x: A, y: A) => boolean;

// Helper to aggregate
function evidence(name: string, samples: number, fails: Array<string>): LawEvidence {
  return { name, samples, passed: fails.length === 0, failures: fails.length, firstFailure: fails[0] };
}

// CATEGORY laws
export function runCategoryLaws<P>(
  C: Category<any>,
  gens: { genA: Gen<any>; genB: Gen<any>; genC: Gen<any> },
  eq: Eq<any>,
  // concrete morphisms in P to test with
  mk: {
    pab: any; // A->B
    pbc: any; // B->C
    pac: any; // A->C (for identity tests compare compose with supplied)
  },
  samples = 50
): LawEvidence[] {
  const fails1: string[] = [];
  const fails2: string[] = [];
  const fails3: string[] = [];

  const idA = C.id<any>();
  const idB = C.id<any>();
  const idC = C.id<any>();

  for (let i = 0; i < samples; i++) {
    const a = gens.genA();
    // left identity: id ; pab = pab
    const left = C.compose(mk.pab, idA)(a);
    const base = mk.pab(a);
    if (!eq(left, base)) fails1.push(`left id failed on a=${JSON.stringify(a)}`);

    // right identity: pbc ; id = pbc
    // We check via pbc ∘ pab over a fresh A
    const a2 = gens.genA();
    const right2 = C.compose(idC, mk.pbc)(mk.pab(a2));
    const base2 = mk.pbc(mk.pab(a2));
    if (!eq(right2, base2)) fails2.push(`right id failed on a=${JSON.stringify(a2)}`);

    // associativity: (pbc ∘ pab) ∘ id = pbc ∘ (pab ∘ id)
    const a3 = gens.genA();
    const leftAssoc = C.compose(C.compose(mk.pbc, mk.pab), idA)(a3);
    const rightAssoc = C.compose(mk.pbc, C.compose(mk.pab, idA))(a3);
    if (!eq(leftAssoc, rightAssoc)) fails3.push(`assoc failed on a=${JSON.stringify(a3)}`);
  }

  return [
    evidence('Category.leftIdentity', samples, fails1),
    evidence('Category.rightIdentity', samples, fails2),
    evidence('Category.associativity', samples, fails3),
  ];
}

// ARROW core laws (subset, practical)
export function runArrowLaws<P>(
  A: Arrow<any>,
  gens: { genA: Gen<any>; genB: Gen<any>; genC: Gen<any> },
  eq: Eq<any>,
  mk: {
    f: (a: any) => any; // A->B (pure)
    g: (b: any) => any; // B->C (pure)
    pab: any; // A ~> B
    pbc: any; // B ~> C
  },
  samples = 50
): LawEvidence[] {
  const fails: string[] = [];
  const fails2: string[] = [];
  const fails3: string[] = [];

  for (let i = 0; i < samples; i++) {
    const a = gens.genA();

    // arr id = id
    const idA = A.id<any>();
    const lhs = A.arr((x: any) => x)(a);
    const rhs = idA(a);
    if (!eq(lhs, rhs)) fails.push(`arr id failed on a=${JSON.stringify(a)}`);

    // arr (g ∘ f) = arr g ∘ arr f
    const comp = A.compose(A.arr(mk.g), A.arr(mk.f))(a);
    const pure = A.arr((x: any) => mk.g(mk.f(x)))(a);
    if (!eq(comp, pure)) fails2.push(`arr comp failed on a=${JSON.stringify(a)}`);

    // first (arr f) = arr (first f)
    const c = gens.genC();
    const left = A.first(A.arr(mk.f))([a, c]);
    const right = A.arr((pair: [any, any]) => [mk.f(pair[0]), pair[1]])([a, c]);
    if (!eq(left, right)) fails3.push(`first/arr naturality failed on input=${JSON.stringify([a, c])}`);
  }

  return [
    evidence('Arrow.arrId', samples, fails),
    evidence('Arrow.arrCompose', samples, fails2),
    evidence('Arrow.first_arr', samples, fails3),
  ];
}

export function runArrowChoiceLaws<P>(
  AC: ArrowChoice<any>,
  gens: { genA: Gen<any>; genB: Gen<any>; genC: Gen<any> },
  eq: Eq<any>,
  mk: { f: (a: any) => any }
): LawEvidence[] {
  const fails: string[] = [];

  for (let i = 0; i < 40; i++) {
    const a = gens.genA();
    const e1: Either<typeof a, number> = Left(a) as any;
    const e2: Either<any, number> = Right(gens.genC()) as any;

    // left (arr f) = arr (left f)
    const L1 = AC.left(AC.arr(mk.f))(e1) as any;
    const R1 = AC.arr((e: any) =>
      matchEither(e, {
        Left: (x: any) => Left(mk.f(x)),
        Right: (y: any) => Right(y),
      })
    )(e1) as any;
    if (!eq(L1, R1)) fails.push('left(arr f) - Left branch');

    const L2 = AC.left(AC.arr(mk.f))(e2) as any;
    const R2 = AC.arr((e: any) =>
      matchEither(e, {
        Left: (x: any) => Left(mk.f(x)),
        Right: (y: any) => Right(y),
      })
    )(e2) as any;
    if (!eq(L2, R2)) fails.push('left(arr f) - Right branch');
  }

  return [evidence('ArrowChoice.left_arr', 40, fails)];
}

export function runArrowApplyLaws<P>(
  AA: ArrowApply<any>,
  gens: { genA: Gen<any>; genB: Gen<any> },
  eq: Eq<any>
): LawEvidence[] {
  // Minimal “beta-like” check: app . arr (\(f,a) -> (f,a)) = app
  const fails: string[] = [];
  for (let i = 0; i < 40; i++) {
    const a = gens.genA();
    const f = (x: any) => gens.genB();
    const pair = [f, a] as const;
    const app0 = AA.app<any, any>()(pair as any);
    const viaArr = AA.compose(
      AA.app<any, any>(),
      AA.arr((p: any) => p)
    )(pair as any);
    if (!eq(app0, viaArr)) fails.push('app beta-like failed');
  }
  return [evidence('ArrowApply.app_beta', 40, fails)];
}


