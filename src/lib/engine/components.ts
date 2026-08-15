// Component scorers — PQ, TQ, VA, V, R
// LOCKED per FRAMEWORK.md §6.
import { clamp, type ProjectInput } from "./types";
import { computeSupplyMetrics, computeVaeChain, normalizedComponents } from "./vae";

// PQ = 0.30·RG + 0.25·RS + 0.20·RD + 0.15·MP + 0.10·UG
export function computePQ(input: ProjectInput): number {
  const rg = input.revenueGrowth ?? 0;
  const rs = input.revenueStability ?? 0;
  const rd = input.revenueDiversification ?? 0;
  const mp = input.marketPosition ?? 0;
  const ug = input.userGrowth ?? 0;
  return clamp(0.3 * rg + 0.25 * rs + 0.2 * rd + 0.15 * mp + 0.1 * ug, 0, 100);
}

// TQ = 0.30·VAE + 0.20·SAR + 0.20·(1−FDR_n) + 0.20·TU + 0.10·GQ
export function computeTQ(input: ProjectInput): number {
  const vae = computeVaeChain(input);
  const supply = computeSupplyMetrics(input);
  const n = normalizedComponents(input, vae, supply);
  const tu = input.tokenUtility ?? 0;
  const gq = input.governanceQuality ?? 0;
  return clamp(
    0.3 * n.vae + 0.2 * n.sar + 0.2 * n.fdrSafe + 0.2 * tu + 0.1 * gq,
    0,
    100
  );
}

// VA = 0.30·α + 0.30·δ + 0.25·τ + 0.15·BA
export function computeVA(input: ProjectInput): number {
  const vae = computeVaeChain(input);
  const n = normalizedComponents(input, vae, computeSupplyMetrics(input));
  const tau = input.vaeTrend ?? 0;
  const ba = input.buybackActivity ?? 0;
  return clamp(
    0.3 * n.alpha + 0.3 * n.delta + 0.25 * tau + 0.15 * ba,
    0,
    100
  );
}

// V = 0.25·(1−MC/TC_n) + 0.25·(1−MC/PR_n) + 0.20·TY + 0.15·(1−FDV/TC_n) + 0.15·IG
// where TC_n, PR_n are annualized captures in USD.
export function computeV(input: ProjectInput): number {
  const mc = input.marketCap ?? 0;
  const pr = input.pr ?? 0;
  const tc = input.tc ?? 0;
  const fdv = input.fdv ?? 0;

  // MC/TC_n: market cap vs annual tokenholder capture → lower = cheaper
  const mcTc = tc > 0 ? clamp(1 - mc / (tc * 1), 0, 100) : 0; // P/earnings-style
  // MC/PR_n
  const mcPr = pr > 0 ? clamp(1 - mc / (pr * 1), 0, 100) : 0;
  // FDV/TC_n
  const fdvTc = tc > 0 ? clamp(1 - fdv / (tc * 1), 0, 100) : 0;

  const ty = input.tokenYield ?? 0;
  const ig = input.incentiveGravity ?? 0;
  return clamp(
    0.25 * mcTc + 0.25 * mcPr + 0.2 * ty + 0.15 * fdvTc + 0.15 * ig,
    0,
    100
  );
}

// R = 0.25·RC + 0.20·IC + 0.20·REG + 0.15·SC + 0.10·ML + 0.10·DR
export function computeR(input: ProjectInput): number {
  const rc = input.revenueConcentration ?? 50;
  const ic = input.insiderConcentration ?? 50;
  const reg = input.regulatory ?? 50;
  const sc = input.smartContract ?? 50;
  const ml = input.marketLiquidity ?? 50;
  const dr = input.dependency ?? 50;
  return clamp(
    0.25 * rc + 0.2 * ic + 0.2 * reg + 0.15 * sc + 0.1 * ml + 0.1 * dr,
    0,
    100
  );
}
