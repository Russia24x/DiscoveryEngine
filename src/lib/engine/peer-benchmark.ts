// Dynamic Peer Benchmarking — Percentile Engine
// LOCKED per FRAMEWORK.md §13.
import type { RankedProject } from "./types";

export interface PeerPercentiles {
  revenueGrowth: number | null;
  marketPosition: number | null;
  vae: number | null;
  risk: number | null;
  unlockRisk: number | null; // inverse of FDR
}

// Compute percentile rank for a value within an array (0-100).
export function percentileRank(values: number[], target: number): number {
  const sorted = [...values].filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  let below = 0;
  for (const v of sorted) if (v < target) below++;
  // Include half of ties
  const equal = sorted.filter((v) => v === target).length;
  return ((below + equal / 2) / sorted.length) * 100;
}

// For a given universe of ranked projects, attach peer percentiles to each.
export function benchmarkUniverse(projects: RankedProject[]): Map<string, PeerPercentiles> {
  const map = new Map<string, PeerPercentiles>();
  // We don't have raw revenueGrowth etc on RankedProject; approximate from component scores + vae + risk.
  const vaeVals = projects.map((p) => p.vae.vae ?? 0);
  const riskVals = projects.map((p) => p.components.r ?? 0);
  const mpVals = projects.map((p) => p.components.pq ?? 0); // proxy: PQ for market position/quality
  const rgVals = projects.map((p) => p.components.pq ?? 0);
  // For unlock risk: filter out null FDR values so they don't skew the percentile.
  // Projects with null FDR get null unlockRisk (unknown, not worst).
  const validUnlockVals = projects
    .filter((p) => p.supply.fdr != null)
    .map((p) => 100 - p.supply.fdr! * 100); // inverse FDR

  for (const p of projects) {
    const unlockRisk = p.supply.fdr == null
      ? null
      : percentileRank(validUnlockVals, 100 - p.supply.fdr * 100);
    map.set(p.symbol, {
      revenueGrowth: percentileRank(rgVals, p.components.pq ?? 0),
      marketPosition: percentileRank(mpVals, p.components.pq ?? 0),
      vae: percentileRank(vaeVals, p.vae.vae ?? 0),
      risk: percentileRank(riskVals, p.components.r ?? 0),
      unlockRisk,
    });
  }
  return map;
}

// Relative Investment Attractiveness: blend of percentiles (0-100).
export function relativeAttractiveness(p: PeerPercentiles): number {
  const vals = [
    p.revenueGrowth,
    p.marketPosition,
    p.vae,
    p.unlockRisk,
    // risk is inverted: lower risk rank = better
    p.risk == null ? null : 100 - p.risk,
  ].filter((v): v is number => v != null);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
