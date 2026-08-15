// IA computation + Confidence Factor
// LOCKED per FRAMEWORK.md §2 and §8.
import { clamp, type ProjectInput } from "./types";
import { computePQ, computeR, computeTQ, computeVA, computeV } from "./components";
import { computeSupplyMetrics, computeVaeChain } from "./vae";

// IA_raw = ( PQ^0.20 · TQ^0.25 · VA^0.20 · V^0.35 ) / ( R_safe^0.15 )
// R_safe = max(R, 1)
export function computeIaRaw(input: ProjectInput): number {
  const pq = computePQ(input);
  const tq = computeTQ(input);
  const va = computeVA(input);
  const v = computeV(input);
  const r = computeR(input);
  const rSafe = Math.max(r, 1);

  const numerator = Math.pow(pq, 0.2) * Math.pow(tq, 0.25) * Math.pow(va, 0.2) * Math.pow(v, 0.35);
  const denominator = Math.pow(rSafe, 0.15);
  return clamp(numerator / denominator, 0, 100);
}

// C ∈ [0.70, 1.00] (or reject if data very incomplete)
// C = f(Data Completeness, Source Quality, Model Stability)
export function computeConfidence(input: ProjectInput): number | null {
  // Compute data completeness from the input itself (the input.dataCompleteness
  // field is a placeholder; derive the real value here so confidence is accurate).
  const dc = computeDataCompleteness(input);
  const sq = input.sourceQuality ?? 0;
  const ms = input.modelStability ?? 0;

  // If data completeness extremely low → reject (Gate per §8)
  if (dc < 25) return null;

  // Blend → map from 0-100 into [0.70, 1.00]
  const blended = 0.5 * dc + 0.3 * sq + 0.2 * ms;
  // blended 0 → 0.70 ; blended 100 → 1.00
  const c = 0.7 + (blended / 100) * 0.3;
  return clamp(c, 0.7, 1.0);
}

export function computeDataCompleteness(input: ProjectInput): number {
  // Count how many critical fields are present.
  const critical = [
    input.marketCap,
    input.fdv,
    input.pr,
    input.pc,
    input.tc,
    input.unlockEmission12m,
    input.revenueGrowth,
    input.marketPosition,
    input.tokenUtility,
    input.revenueConcentration,
    input.insiderConcentration,
    input.smartContract,
  ];
  const present = critical.filter((v) => v != null && !Number.isNaN(v)).length;
  return (present / critical.length) * 100;
}
