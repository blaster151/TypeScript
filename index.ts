// Keep index minimal to avoid symbol conflicts; re-export only user-facing APIs
export { 
  Functor,
  Free,
  Cofree,
  cofree,
  Recursive,
  Corecursive,
  cata,
  ana,
  para,
  apo,
  histo,
  futu
} from './fp-recursion-schemes-extra';

export {
  Algebra,
  Coalgebra,
  hylo,
  anaCofree,
  cataFree,
  Align,
  pairFreeCofree
} from './fp-algebra';

export {
  Kleisli,
  KleisliK,
  Star,
  StarK,
  ProfunctorFromKleisli,
  StrongFromKleisli,
  ChoiceFromKleisli,
  ProfunctorFromStar,
  StrongFromStar,
  ChoiceFromStar,
  ArrowFromKleisli,
  runKleisli,
  runStar
} from './fp-arrows-kleisli-star';

export {
  CoKleisli,
  CoKleisliK,
  ProfunctorFromCoKleisli,
  StrongFromCoKleisli,
  ChoiceFromCoKleisli,
  ArrowFromCoKleisli,
  ComonadFromCofree,
  ArrowFromCoKleisliCofree,
  runCoKleisli
} from './fp-arrows-cokleisli';

export {
  Semiring,
  StarSemiring,
  BoolSemiring,
  NatSemiring,
  TropicalSemiring,
  Matrix,
  matMul,
  matId,
  reflexive,
  closure,
  transitiveClosureBool,
  shortestPathsTropical,
  powS
} from './fp-semiring';

export {
  Preorder,
  ClosureOperator,
  isExtensive,
  isIdempotent,
  isMonotone,
  lfp,
  subsetPreorder,
  setEq,
  saturateSet
} from './fp-closure';

