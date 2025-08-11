// Barrel re-exports for Either (canonical implementation lives in fp-either-unified)

export {
  // union + pattern matching + ops
  Either, Left, Right, isLeft, isRight, matchEither,
  mapEither, chainEither, bimapEither, mapLeftEither, getOrElse,
  // typeclass instances + kind
  EitherK, EitherFunctor, EitherApplicative, EitherMonad, EitherBifunctor
} from './fp-either-unified';

export {
  foldMapEither,
  reduceEither,
  traverseEitherA,
  sequenceEitherA,
} from './fp-either-traversable';

export {
  EITHER_OPS,
  eitherMap,
  eitherAp,
  eitherChain,
  eitherBimap,
  eitherMapLeft,
  eitherGetOrElse,
} from './fp-either-ops-table';

// Thin class wrappers that delegate to the unified ops
export { LeftClass, RightClass } from './fp-either-classes';
