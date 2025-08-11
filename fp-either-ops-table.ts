// fp-either-ops-table.ts
import {
  mapEither,
  apEither,
  chainEither,
  bimapEither,
  mapLeft as mapLeftEither,
  fromEither as getOrElse
} from './fp-either-unified';

// Data-last ops table — single source of truth
export const EITHER_OPS = {
  map: mapEither,
  ap: apEither,
  chain: chainEither,
  bimap: bimapEither,
  mapLeft: mapLeftEither,
  getOrElse,
} as const;

// Named re-exports (data-last helpers)
export const eitherMap = EITHER_OPS.map;
export const eitherAp = EITHER_OPS.ap;
export const eitherChain = EITHER_OPS.chain;
export const eitherBimap = EITHER_OPS.bimap;
export const eitherMapLeft = EITHER_OPS.mapLeft;
export const eitherGetOrElse = EITHER_OPS.getOrElse;


