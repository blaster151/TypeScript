/**
 * Variance-guided derivation utilities
 *
 * Inspects variance from side-tables to decide which typeclass(es) are derivable
 * and emits targeted diagnostics when not derivable.
 */

import { VarianceTag } from './fp-hkt';
import { hydrateKindInfoFromSideTable, defaultKindCache } from './src/compiler/kindCache';

export type DerivableClass = 'Functor' | 'Contravariant' | 'Bifunctor' | 'Profunctor' | 'Invariant';

export interface DerivationDecision {
  readonly chosen: DerivableClass;
  readonly reason: string;
}

export interface DerivationDiagnostic {
  readonly message: string;
  readonly details?: string;
}

function decideFromVariance(arity: number, variance: ReadonlyArray<VarianceTag>): DerivationDecision | DerivationDiagnostic {
  if (arity === 1) {
    const v = variance[0] ?? 'Invariant';
    if (v === 'Out') return { chosen: 'Functor', reason: 'Unary constructor is covariant in its parameter (Out).' };
    if (v === 'In') return { chosen: 'Contravariant', reason: 'Unary constructor is contravariant in its parameter (In).' };
    if (v === 'Phantom') return { chosen: 'Invariant', reason: 'Unary constructor is phantom in its parameter; only Invariant instances are lawful.' };
    return { message: 'Unary constructor is invariant in its parameter; cannot derive Functor or Contravariant lawfully.', details: 'Consider redesigning type roles or providing manual instances.' };
  }
  if (arity === 2) {
    const [v0, v1] = [variance[0] ?? 'Invariant', variance[1] ?? 'Invariant'];
    // Profunctor: In first, Out second
    if (v0 === 'In' && v1 === 'Out') return { chosen: 'Profunctor', reason: 'Binary constructor is contravariant in first and covariant in second (Profunctor).' };
    // Bifunctor: Out,Out
    if (v0 === 'Out' && v1 === 'Out') return { chosen: 'Bifunctor', reason: 'Binary constructor is covariant in both parameters (Bifunctor).' };
    // Functor in second by fixing first
    if (v1 === 'Out') return { chosen: 'Functor', reason: 'Covariant in the second parameter; derive Functor via ApplyLeft (fix first).' };
    // Contravariant in first by fixing second
    if (v0 === 'In') return { chosen: 'Contravariant', reason: 'Contravariant in the first parameter; derive Contravariant via ApplyRight (fix second).' };
    return { message: `Binary constructor not derivable from variance: (${v0}, ${v1}).`, details: 'Expected (In,Out) for Profunctor or (Out,Out) for Bifunctor; alternatively, partially apply to expose a derivable unary role.' };
  }
  // Higher arity: recommend partial application
  return { message: `Arity ${arity} constructors require partial application to a unary kind before derivation.`, details: 'Use ApplyLeft/ApplyRight (or FixN helpers) to expose a covariant/contravariant slot, then derive Functor/Contravariant.' };
}

export function varianceGuidedDecision(modulePath: string, exportName: string): DerivationDecision | DerivationDiagnostic {
  const info = hydrateKindInfoFromSideTable(defaultKindCache, modulePath, exportName);
  if (!info) {
    return { message: 'No kind metadata found for symbol. Ensure kind side-tables are emitted or provide modulePath/exportName correctly.' };
  }
  return decideFromVariance(info.arity, info.variance);
}

// ============================================================================
// Non-flickering diagnostics helpers
// ============================================================================

function fmtVariance(variance: ReadonlyArray<VarianceTag>): string {
  return `(${variance.join(', ')})`;
}

function tick(ok: boolean): string { return ok ? '✓' : '✗'; }

function messageForKindRequirement(kind: DerivableClass, variance: ReadonlyArray<VarianceTag>): string {
  const arity = variance.length;
  if (kind === 'Functor' && arity >= 1) {
    const last = variance[arity - 1];
    return `map requires covariant last parameter: last is ${last} ${tick(last === 'Out')}`;
  }
  if (kind === 'Contravariant' && arity >= 1) {
    const first = variance[0];
    return `contramap requires contravariant first parameter: first is ${first} ${tick(first === 'In')}`;
  }
  if (kind === 'Bifunctor' && arity >= 2) {
    const [v0, v1] = variance as any;
    const ok = v0 === 'Out' && v1 === 'Out';
    return `bimap requires covariant parameters: (${v0}, ${v1}) ${tick(ok)}`;
  }
  if (kind === 'Profunctor' && arity >= 2) {
    const [v0, v1] = variance as any;
    const ok = v0 === 'In' && v1 === 'Out';
    return `dimap requires (In, Out): (${v0}, ${v1}) ${tick(ok)}`;
  }
  return `${kind} requirement not met for arity ${arity}`;
}

function suggestionForVariance(variance: ReadonlyArray<VarianceTag>): string | undefined {
  const arity = variance.length;
  if (arity === 2) {
    const [v0, v1] = variance;
    if (v1 === 'Out') return 'consider ApplyLeft to fix the first slot and derive Functor on the second.';
    if (v0 === 'In') return 'consider ApplyRight to fix the second slot and derive Contravariant on the first.';
  }
  return undefined;
}

/**
 * Build a stable, non-flickering diagnostic string for a derivation requirement.
 * Includes SymbolKey and DeclHash, and the remote module's variance.
 */
export function getKindDiagnosticIfNew(
  required: DerivableClass,
  modulePath: string,
  exportName: string
): string | undefined {
  const info = hydrateKindInfoFromSideTable(defaultKindCache, modulePath, exportName);
  if (!info) return undefined;
  const prefix = `[kind] ${exportName} @ ${modulePath}`;
  const varianceStr = fmtVariance(info.variance);
  const requirement = messageForKindRequirement(required, info.variance);
  const suggestion = suggestionForVariance(info.variance);
  const message = `${prefix}: ${varianceStr}; ${requirement}${suggestion ? ` — ${suggestion}` : ''}.\nkey=${info.symbolKey} declHash=${info.hashOfDecl}`;
  const should = defaultKindCache.shouldReportDiagnostic(info.symbolKey, info.hashOfDecl, message);
  return should ? message : undefined;
}


