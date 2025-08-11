import { getFPRegistry } from './fp-registry-init';
import {
  EitherK, EitherFunctor, EitherApplicative, EitherMonad, EitherBifunctor,
  EitherEq as UnifiedEitherEq,
  EitherOrd as UnifiedEitherOrd,
  EitherShow as UnifiedEitherShow
} from './fp-either-unified';

// Re-export derived instances in a consistent way if needed by callers
export const EitherEq = UnifiedEitherEq;
export const EitherOrd = UnifiedEitherOrd;
export const EitherShow = UnifiedEitherShow;

export function registerEitherInstances(): void {
  const reg = getFPRegistry?.();
  if (!reg) return;

  reg.registerTypeclass('Either', 'Functor',     EitherFunctor);
  reg.registerTypeclass('Either', 'Applicative', EitherApplicative);
  reg.registerTypeclass('Either', 'Monad',       EitherMonad);
  reg.registerTypeclass('Either', 'Bifunctor',   EitherBifunctor);

  reg.registerTypeclass('Either', 'Eq',          EitherEq);
  reg.registerTypeclass('Either', 'Ord',         EitherOrd);
  reg.registerTypeclass('Either', 'Show',        EitherShow);
}

try { registerEitherInstances(); } catch {}


