// src/lfpFusion.ts
//
// FRP fusion via an explicit least fixed point (lfp).
// This is a small, pure re-frame of your optimizer: "keep fusing until stable".
//
// Usage:
//   import { optimizePipelineLFP } from './lfpFusion';
//   const { result, trace, iterations, converged } = optimizePipelineLFP(nodes);
//
// Notes:
// - No changes to existing files are required.
// - We reuse operatorMetadata (canFuse, getOperatorInfo, getFusionType).
// - Equality for the fixpoint is "same op sequence & same length" — sufficient for
//   this pass because every fusion either reduces length or leaves it unchanged.

import { getOperatorInfo, canFuse, getFusionType } from '../operatorMetadata';
import type { FRPNode, FusionTrace, OptimizationConfig } from '../optimizeFrpPipeline';
import { defaultConfig } from '../optimizeFrpPipeline';

// ---------- lfp helper ----------

/** Least fixed point driver: repeatedly apply `step` until `eq(next, cur)` or bound. */
function lfp<T>(
  init: T,
  step: (cur: T, k: number) => T,
  eq: (a: T, b: T) => boolean,
  maxIterations: number
): { value: T; iterations: number; converged: boolean } {
  let cur = init;
  for (let k = 0; k < maxIterations; k++) {
    const nxt = step(cur, k);
    if (eq(nxt, cur)) return { value: cur, iterations: k, converged: true };
    cur = nxt;
  }
  return { value: cur, iterations: maxIterations, converged: false };
}

// ---------- one fusion pass (pure) ----------

/** A single left-to-right fusion sweep; returns new nodes + per-pass trace. */
function fuseOnce(
  nodes: FRPNode[],
  iteration: number,
  enableTracing: boolean
): { nodes: FRPNode[]; trace: FusionTrace[] } {
  const out: FRPNode[] = [];
  const trace: FusionTrace[] = [];
  const originalLength = nodes.length;
  let i = 0;
  let step = 0;

  while (i < nodes.length) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (b) {
      const aMeta = getOperatorInfo(a.op);
      const bMeta = getOperatorInfo(b.op);

      if (aMeta && bMeta && canFuse(a.op, b.op) && aMeta.transformBuilder) {
        const fusedOp = `${a.op}+${b.op}`;
        const fused: FRPNode = {
          op: fusedOp,
          fn: aMeta.transformBuilder(a, b),
          args: [], // fused nodes are internal; args are not used downstream for execution
          meta: { fused: true, originalOps: [a.op, b.op] },
          fusionMetadata: {
            isFused: true,
            fusionPass: iteration,
            fusionStep: step,
            originalOperators: [a.op, b.op],
            originalPositions: [i, i + 1],
            fusionType: getFusionType(a.op, b.op) || 'unknown',
            fusionTimestamp: Date.now(),
            fusionHistory: [{
              pass: iteration,
              step,
              position: i,
              operator1: a.op,
              operator2: b.op,
              fusionType: getFusionType(a.op, b.op) || 'unknown',
              timestamp: Date.now()
            }],
            sourceNodes: [a, b]
          }
        };

        out.push(fused);

        if (enableTracing) {
          trace.push({
            iteration,
            step: step++,
            position: i,
            operator1: a.op,
            operator2: b.op,
            fusedOperator: fusedOp,
            originalLength,
            newLength: out.length,
            fusionType: getFusionType(a.op, b.op) || 'unknown',
            timestamp: Date.now()
          });
        }

        i += 2;
        continue;
      }
    }

    out.push(a);
    i++;
  }

  return { nodes: out, trace };
}

// ---------- fixpoint equality ----------

/** Equality for sequences: same length and same op names in order. */
function eqNodeSeq(a: FRPNode[], b: FRPNode[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].op !== b[i].op) return false;
  }
  return true;
}

// ---------- public entrypoint ----------

export function optimizePipelineLFP(
  nodes: FRPNode[],
  cfg: OptimizationConfig = defaultConfig()
): { result: FRPNode[]; trace: FusionTrace[]; iterations: number; converged: boolean } {
  const allTrace: FusionTrace[] = [];

  const step = (cur: FRPNode[], k: number) => {
    const { nodes: next, trace } = fuseOnce(cur, k, cfg.enableTracing);
    if (cfg.enableTracing) allTrace.push(...trace);
    return next;
  };

  const { value, iterations, converged } = lfp(
    nodes,
    step,
    eqNodeSeq,
    cfg.maxIterations
  );

  return { result: value, trace: allTrace, iterations, converged };
}


