// fp-either-derivation.ts
import { EitherK } from './fp-hkt';
import {
  deriveEqInstance,
  deriveOrdInstance,
  deriveShowInstance,
} from './fp-derivation-helpers';
import { getFPRegistry } from './fp-registry-init';

export function registerEitherAll() {
  const registry = getFPRegistry();
  if (!registry) throw new Error('FP Registry not available');

  // Derive and register Eq/Ord/Show once, using centralized kind symbol
  const eq = deriveEqInstance({ kind: EitherK as any });
  const ord = deriveOrdInstance({ kind: EitherK as any });
  const show = deriveShowInstance({ kind: EitherK as any });

  registry.registerTypeclass('Either', 'Eq', eq);
  registry.registerTypeclass('Either', 'Ord', ord);
  registry.registerTypeclass('Either', 'Show', show);

  return { eq, ord, show };
}

// Auto-register at module load (idempotent-friendly)
try { registerEitherAll(); } catch {}


