/**
 * Explain the kind of a symbol under cursor, leveraging side-tables and cache.
 * Minimal version: takes a module path and export name.
 */

import { hydrateKindInfoFromSideTable, defaultKindCache } from './kindCache.js';

export interface KindExplanation {
  modulePath: string;
  exportName: string;
  arity: number;
  variance: readonly string[];
  roles?: readonly string[];
  constraints?: readonly string[];
  symbolKey: string;
  hashOfDecl: string;
  precision: 'Heuristic' | 'Declared' | 'Refined';
}

export function explainKind(modulePath: string, exportName: string): KindExplanation | undefined {
  const info = hydrateKindInfoFromSideTable(defaultKindCache, modulePath, exportName);
  if (!info) return undefined;
  return {
    modulePath,
    exportName,
    arity: info.arity,
    variance: info.variance,
    roles: info.roles,
    constraints: info.constraints,
    symbolKey: info.symbolKey,
    hashOfDecl: info.hashOfDecl,
    precision: info.precision
  };
}


