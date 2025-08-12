// src/fusionReachability.ts
import { operatorRegistry } from '../operatorMetadata';

export interface Reachability {
  readonly names: string[];
  readonly indexOf: Map<string, number>;
  readonly mat: boolean[][];
}

function floydWarshallBool(m: boolean[][]): void {
  const n = m.length;
  for (let k = 0; k < n; k++) {
    const mk = m[k];
    for (let i = 0; i < n; i++) if (m[i][k]) {
      const mi = m[i];
      for (let j = 0; j < n; j++) {
        // reach(i,j) |= reach(i,k) && reach(k,j)
        if (mk[j]) mi[j] = true;
      }
    }
  }
}

let _cache: Reachability | null = null;
export function getFusibilityReachability(): Reachability {
  if (_cache) return _cache;

  const names = Object.keys(operatorRegistry);
  const indexOf = new Map<string, number>(names.map((n, i) => [n, i]));
  const n = names.length;

  // direct adjacency: A -> B if B appears in operatorRegistry[A].fusibleAfter
  const mat: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n).fill(false)
  );
  for (let i = 0; i < n; i++) {
    mat[i][i] = true; // reflexive
    const a = names[i];
    const info = (operatorRegistry as any)[a];
    const after: string[] = info?.fusibleAfter ?? [];
    for (const b of after) {
      const j = indexOf.get(b);
      if (j != null) mat[i][j] = true;
    }
  }

  // transitive closure
  floydWarshallBool(mat);

  _cache = { names, indexOf, mat };
  return _cache!;
}

export function isFusibleReachable(a: string, b: string): boolean {
  const R = getFusibilityReachability();
  const i = R.indexOf.get(a);
  const j = R.indexOf.get(b);
  if (i == null || j == null) return false;
  return R.mat[i][j];
}

// Optional: quick stats for tracing
export function fusibilityStats() {
  const { names, mat } = getFusibilityReachability();
  const n = names.length;
  let edges = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && mat[i][j]) edges++;
  return { operators: n, reachablePairs: edges };
}


