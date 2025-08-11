// ARCHIVED: compiler-side experiment for kind/HKT toolchain (not used by live code)
/**
 * Cross-module kind elaboration and caching utilities
 *
 * Minimal, safe scaffolding to support:
 * - Emitting/consuming per-module kind side-tables
 * - Stable structural hashing for declarations
 * - Process + on-disk cache with invalidation hooks
 * - Partial-application caching keys
 * - Non-flickering diagnostics via (SymbolKey, DeclHash)
 */

/* eslint-disable @typescript-eslint/ban-types */

import fs from 'fs';
import path from 'path';

// Import type only to avoid circular runtime deps
import type { VarianceTag } from '../../fp-hkt';

// ============================================================================
// Types
// ============================================================================

export interface KindExportMeta {
  exportName: string;
  arity: number;
  variance: ReadonlyArray<VarianceTag>;
  roles?: ReadonlyArray<string>;
  constraints?: ReadonlyArray<string>;
  hashOfDecl: string; // 64-bit hex string
  // Optional provenance
  precision?: 'Heuristic' | 'Declared' | 'Refined';
  // Fixed arguments for partial applications, if any
  fixedArgs?: ReadonlyArray<string>;
  // Optional dependencies (symbol names or keys)
  deps?: ReadonlyArray<string>;
}

export interface KindSideTable {
  modulePath: string; // as resolved by module resolution
  version: number; // schema version for side-table
  exports: ReadonlyArray<KindExportMeta>;
}

export interface CachedKindInfo {
  symbolKey: string; // ModulePathHash::ExportName::DeclHash
  modulePath: string;
  exportName: string;
  arity: number;
  variance: ReadonlyArray<VarianceTag>;
  roles?: ReadonlyArray<string>;
  constraints?: ReadonlyArray<string>;
  hashOfDecl: string;
  precision: 'Heuristic' | 'Declared' | 'Refined';
  deps?: ReadonlyArray<string>; // array of dependency identifiers or SymbolKeys
  // bookkeeping
  lastAccessEpoch: number;
}

// ============================================================================
// Config
// ============================================================================

export interface KindCacheConfig {
  schemaVersion: number;
  emitKindTables: boolean; // dev default true
  cacheDir: string; // on-disk cache directory
  maxProcessEntries: number; // LRU cap
  diskBudgetBytes: number; // on-disk cache budget
}

const defaultConfig: KindCacheConfig = {
  schemaVersion: 1,
  emitKindTables: true,
  cacheDir: path.resolve(process.cwd(), '.kcache'),
  maxProcessEntries: 10_000,
  diskBudgetBytes: 50 * 1024 * 1024 // 50MB
};

// ============================================================================
// Stable Hashing (FNV-1a 64-bit, BigInt)
// ============================================================================

/**
 * Compute a 64-bit FNV-1a hash for a string, return as lowercase hex.
 * Deterministic across runs and platforms.
 */
export function fnv1a64Hex(input: string): string {
  let hash = BigInt('0xcbf29ce484222325'); // offset basis
  const prime = BigInt('0x100000001b3');
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i) & 0xff);
    hash = (hash * prime) & BigInt('0xffffffffffffffff');
  }
  // to 16-char hex (64-bit)
  const hex = hash.toString(16);
  return hex.padStart(16, '0');
}

/** Normalize declaration text for hashing */
export function normalizeDeclForHashing(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*([<>,:;()\[\]{}|=&?])\s*/g, '$1') // tight punctuation
    .replace(/\breadonly\b/g, 'ro')
    .trim();
}

export function computeDeclHash(normalizedDeclText: string): string {
  return fnv1a64Hex(normalizedDeclText);
}

export function hashModulePath(modulePath: string): string {
  return fnv1a64Hex(modulePath);
}

// ============================================================================
// Symbol Keys
// ============================================================================

export function makeSymbolKey(modulePath: string, exportName: string, declHash: string): string {
  const modHash = hashModulePath(modulePath);
  return `${modHash}::${exportName}::${declHash}`;
}

export function makePartialSymbolKey(baseKey: string, fixedArgsHash: string): string {
  return `Partial::${baseKey}::${fixedArgsHash}`;
}

// ============================================================================
// Process Cache (LRU) and On-disk Cache
// ============================================================================

class LRUCache {
  private map = new Map<string, CachedKindInfo>();
  constructor(private readonly capacity: number) {}

  get(key: string): CachedKindInfo | undefined {
    const value = this.map.get(key);
    if (!value) return undefined;
    this.map.delete(key);
    value.lastAccessEpoch = Date.now();
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: CachedKindInfo): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      // evict least-recently-used
      const firstKey = this.map.keys().next().value as string | undefined;
      if (firstKey) this.map.delete(firstKey);
    }
  }
}

export class KindCache {
  private readonly cfg: KindCacheConfig;
  private readonly processCache: LRUCache;
  private readonly diagSeen = new Set<string>(); // `${symbolKey}@@${declHash}@@${messageHash}`
  private readonly reverseDeps = new Map<string, Set<string>>(); // dep -> set of symbolKeys
  private readonly pinned = new Set<string>(); // pinned symbol keys
  private readonly latestKeyById = new Map<string, string>(); // modulePath::exportName -> latest symbolKey

  constructor(config?: Partial<KindCacheConfig>) {
    this.cfg = { ...defaultConfig, ...(config || {}) };
    this.processCache = new LRUCache(this.cfg.maxProcessEntries);
    if (!fs.existsSync(this.cfg.cacheDir)) {
      fs.mkdirSync(this.cfg.cacheDir, { recursive: true });
    }
  }

  private onDiskPath(symbolKey: string): string {
    return path.join(this.cfg.cacheDir, `${symbolKey}.json`);
  }

  get(symbolKey: string): CachedKindInfo | undefined {
    const hit = this.processCache.get(symbolKey);
    if (hit) return hit;
    // try disk
    try {
      const p = this.onDiskPath(symbolKey);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed: CachedKindInfo & { schemaVersion?: number } = JSON.parse(raw);
        // version gate
        if ((parsed as any).schemaVersion && (parsed as any).schemaVersion !== this.cfg.schemaVersion) {
          return undefined;
        }
        this.processCache.set(symbolKey, parsed);
        return parsed;
      }
    } catch {
      // ignore corrupt cache
    }
    return undefined;
  }

  put(info: Omit<CachedKindInfo, 'lastAccessEpoch'>): void {
    // Monotonic enrichment: prevent downgrading precision
    const existing = this.processCache.get(info.symbolKey);
    if (existing) {
      const rank = (p: string) => (p === 'Refined' ? 2 : p === 'Declared' ? 1 : 0);
      if (rank(info.precision) < rank(existing.precision)) {
        return;
      }
    }
    const withTime: CachedKindInfo = { ...info, lastAccessEpoch: Date.now() };
    this.processCache.set(info.symbolKey, withTime);
    // persist
    if (!this.pinned.has(info.symbolKey)) {
      const out = { ...withTime, schemaVersion: this.cfg.schemaVersion } as any;
      const p = this.onDiskPath(info.symbolKey);
      try {
        fs.writeFileSync(p, JSON.stringify(out));
      } catch {
        // best effort
      }
      this.enforceDiskBudget();
    }
    // index reverse deps
    if (withTime.deps) {
      for (const dep of withTime.deps) {
        const set = this.reverseDeps.get(dep) ?? new Set<string>();
        set.add(info.symbolKey);
        this.reverseDeps.set(dep, set);
      }
    }
  }

  invalidate(symbolKey: string): void {
    // Process cache will eventually evict; remove disk copy now
    const p = this.onDiskPath(symbolKey);
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* no-op */ }
  }

  // Invalidate dependents of a dependency identifier (by name or SymbolKey)
  invalidateByDep(depId: string): void {
    const dependents = this.reverseDeps.get(depId);
    if (!dependents) return;
    for (const sym of dependents) {
      this.invalidate(sym);
    }
    this.reverseDeps.delete(depId);
  }

  // Diagnostics deduplication
  shouldReportDiagnostic(symbolKey: string, declHash: string, message: string): boolean {
    const key = `${symbolKey}@@${declHash}@@${fnv1a64Hex(message)}`;
    if (this.diagSeen.has(key)) return false;
    this.diagSeen.add(key);
    return true;
  }

  // Stats
  stats(): { processEntries: number; diskEntries: number; cacheDir: string } {
    let diskEntries = 0;
    try {
      if (fs.existsSync(this.cfg.cacheDir)) {
        diskEntries = fs.readdirSync(this.cfg.cacheDir).filter(f => f.endsWith('.json')).length;
      }
    } catch {
      diskEntries = 0;
    }
    // process cache size approximate (Map not exposed); estimate by counting files in dir plus zero
    return { processEntries: 0, diskEntries, cacheDir: this.cfg.cacheDir };
  }

  // Pin built-in alias under a well-known key; bypass disk and eviction
  putPinned(name: string, info: Omit<CachedKindInfo, 'symbolKey' | 'lastAccessEpoch'>): string {
    const key = `Pinned::${name}`;
    this.pinned.add(key);
    this.processCache.set(key, { ...info, symbolKey: key, lastAccessEpoch: Date.now() });
    return key;
  }

  // Maintain disk cache within budget by evicting oldest non-pinned entries
  private enforceDiskBudget(): void {
    try {
      const files = fs.readdirSync(this.cfg.cacheDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const full = path.join(this.cfg.cacheDir, f);
          const st = fs.statSync(full);
          return { full, size: st.size, mtimeMs: st.mtimeMs };
        });
      let total = files.reduce((a, b) => a + b.size, 0);
      if (total <= this.cfg.diskBudgetBytes) return;
      // sort oldest first
      files.sort((a, b) => a.mtimeMs - b.mtimeMs);
      for (const file of files) {
        const base = path.basename(file.full, '.json');
        if (this.pinned.has(base)) continue;
        try {
          fs.unlinkSync(file.full);
          total -= file.size;
          if (total <= this.cfg.diskBudgetBytes) break;
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }
}

// Singleton cache for easy integration
export const defaultKindCache = new KindCache();

// ============================================================================
// Side-table Emit/Load
// ============================================================================

export function sideTablePathForModule(modulePath: string): string {
  const dir = path.dirname(modulePath);
  const base = path.basename(modulePath).replace(/\.[tj]s(x)?$/, '');
  return path.join(dir, `${base}.kind.json`);
}

export function emitKindSideTable(modulePath: string, table: KindSideTable): void {
  const p = sideTablePathForModule(modulePath);
  try {
    fs.writeFileSync(p, JSON.stringify(table, null, 2));
  } catch {
    // best effort emit
  }
}

export function loadKindSideTable(modulePath: string): KindSideTable | undefined {
  const p = sideTablePathForModule(modulePath);
  try {
    if (!fs.existsSync(p)) return undefined;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw) as KindSideTable;
  } catch {
    return undefined;
  }
}

// ============================================================================
// Hydration Helpers
// ============================================================================

export function hydrateKindInfoFromSideTable(
  cache: KindCache,
  modulePath: string,
  exportName: string
): CachedKindInfo | undefined {
  const table = loadKindSideTable(modulePath);
  if (!table) return undefined;
  const found = table.exports.find((e) => e.exportName === exportName);
  if (!found) return undefined;
  const key = makeSymbolKey(modulePath, found.exportName, found.hashOfDecl);
  // invalidate dependents of prior key if hash changed
  const id = `${modulePath}::${exportName}`;
  const prev = (cache as any).latestKeyById?.get(id);
  if (prev && prev !== key) {
    cache.invalidateByDep(prev);
  }
  (cache as any).latestKeyById?.set(id, key);
  const cached = cache.get(key);
  if (cached) return cached;
  const info: Omit<CachedKindInfo, 'lastAccessEpoch'> = {
    symbolKey: key,
    modulePath,
    exportName: found.exportName,
    arity: found.arity,
    variance: found.variance,
    roles: found.roles,
    constraints: found.constraints,
    hashOfDecl: found.hashOfDecl,
    precision: found.precision ?? 'Declared',
    deps: found.deps ?? []
  };
  cache.put(info);
  return cache.get(key);
}

// ============================================================================
// Utility: Build KindExportMeta for a declaration
// ============================================================================

export interface DeclSignatureLike {
  modulePath: string;
  exportName: string;
  arity: number;
  variance: ReadonlyArray<VarianceTag>;
  roles?: ReadonlyArray<string>;
  constraints?: ReadonlyArray<string>;
  normalizedDeclText: string; // pre-normalized signature text
  precision?: 'Heuristic' | 'Declared' | 'Refined';
  fixedArgs?: ReadonlyArray<string>;
  deps?: ReadonlyArray<string>;
}

export function buildKindExportMeta(sig: DeclSignatureLike): KindExportMeta {
  const hashOfDecl = computeDeclHash(sig.normalizedDeclText);
  return {
    exportName: sig.exportName,
    arity: sig.arity,
    variance: sig.variance,
    roles: sig.roles,
    constraints: sig.constraints,
    hashOfDecl,
    precision: sig.precision ?? 'Heuristic',
    fixedArgs: sig.fixedArgs,
    deps: sig.deps
  };
}

export function toCachedKindInfo(modulePath: string, meta: KindExportMeta): Omit<CachedKindInfo, 'lastAccessEpoch'> {
  return {
    symbolKey: makeSymbolKey(modulePath, meta.exportName, meta.hashOfDecl),
    modulePath,
    exportName: meta.exportName,
    arity: meta.arity,
    variance: meta.variance,
    roles: meta.roles,
    constraints: meta.constraints,
    hashOfDecl: meta.hashOfDecl,
    precision: meta.precision ?? 'Heuristic',
    deps: meta.deps ?? []
  };
}

// Partial kind cache APIs
export function putPartialKind(
  cache: KindCache,
  baseSymbolKey: string,
  fixedArgs: readonly string[],
  info: Omit<CachedKindInfo, 'symbolKey' | 'lastAccessEpoch'>
): string {
  const fixedHash = fnv1a64Hex(JSON.stringify(fixedArgs));
  const partialKey = makePartialSymbolKey(baseSymbolKey, fixedHash);
  cache.put({ ...info, symbolKey: partialKey, deps: Array.from(new Set([baseSymbolKey, ...fixedArgs])) });
  return partialKey;
}

export function getPartialKind(cache: KindCache, baseSymbolKey: string, fixedArgs: readonly string[]) {
  const fixedHash = fnv1a64Hex(JSON.stringify(fixedArgs));
  const partialKey = makePartialSymbolKey(baseSymbolKey, fixedHash);
  return cache.get(partialKey);
}


