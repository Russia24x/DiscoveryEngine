// CryptoSieve Scoring Engine — orchestrator
// LOCKED per FRAMEWORK.md §1 pipeline:
//   Gate → PQ → TQ → VA → V → R → IA_raw → C → IA_effective → M → IA_final
import { decide } from "./decision";
import { evaluateGates } from "./gates";
import { computeConfidence, computeDataCompleteness, computeIaRaw } from "./ia";
import { computeMarketRegime, type ProjectInput, type RankedProject, type Scores } from "./types";
import { computePQ, computeR, computeTQ, computeVA, computeV } from "./components";
import { computeSupplyMetrics, computeVaeChain } from "./vae";
import { evaluateThesis } from "./thesis";

export { computePQ, computeTQ, computeVA, computeV, computeR } from "./components";
export { computeVaeChain, computeSupplyMetrics } from "./vae";
export { evaluateGates } from "./gates";
export { decide } from "./decision";
export { computeIaRaw, computeConfidence, computeDataCompleteness } from "./ia";
export { computeMarketRegime } from "./types";
export { evaluateThesis } from "./thesis";
export { benchmarkUniverse, relativeAttractiveness, percentileRank } from "./peer-benchmark";
export { buildEvidenceGraph, generateHistoricalScores } from "./evidence";
export { buildTokenomicsSchedule } from "./tokenomics";
export { buildCapitalFlowProfile } from "./capital-flow";
export { buildCatalystReport } from "./catalyst";

// Score a single project. marketRegime (M) is computed universe-wide and passed in.
export function scoreProject(
  input: ProjectInput,
  marketRegime = 1.0
): Scores {
  const vae = computeVaeChain(input);
  const supply = computeSupplyMetrics(input);

  const pq = computePQ(input);
  const tq = computeTQ(input);
  const va = computeVA(input);
  const v = computeV(input);
  const r = computeR(input);

  const iaRaw = computeIaRaw(input);
  const confidence = computeConfidence(input);
  const dataCompleteness = computeDataCompleteness(input);

  const { gates, passed, reasons } = evaluateGates(input);

  // If confidence is null (data very incomplete) → effective/final are null and decision is REJECT.
  const iaEffective = confidence == null ? null : iaRaw * confidence;
  const iaFinal = iaEffective == null ? null : iaEffective * marketRegime;

  const baseScores: Omit<Scores, "decision" | "decisionExplanation"> = {
    components: { pq, tq, va, v, r },
    vae,
    supply,
    iaRaw,
    confidence,
    iaEffective,
    marketRegime,
    iaFinal,
    gates,
    gatePassed: passed,
    gateReasons: reasons,
    dataCompleteness,
  };

  const { decision, explanation } = decide(input, baseScores);

  return { ...baseScores, decision, decisionExplanation: explanation };
}

// Rank a full universe of scored projects by the four-rank system.
// LOCKED per FRAMEWORK.md §3.
export function rankUniverse(
  inputs: ProjectInput[],
  marketRegime = 1.0
): RankedProject[] {
  const scored = inputs.map((input) => {
    const s = scoreProject(input, marketRegime);
    return {
      symbol: input.symbol,
      name: input.name,
      sector: input.sector,
      chain: input.chain,
      logoUrl: input.logoUrl,
      priceUsd: input.priceUsd,
      marketCap: input.marketCap,
      fdv: input.fdv,
      tvl: input.pr, // TVL proxy not stored; use pr if needed elsewhere
      ...s,
      fundamentalRank: 0,
      confidenceRank: 0,
      effectiveRank: 0,
      marketRank: 0,
    };
  });

  // Fundamental rank by IA_raw desc
  const byIaRaw = [...scored].sort((a, b) => (b.iaRaw ?? 0) - (a.iaRaw ?? 0));
  byIaRaw.forEach((p, i) => {
    const target = scored.find((s) => s.symbol === p.symbol)!;
    target.fundamentalRank = i + 1;
  });

  // Confidence rank by C desc
  const byConf = [...scored].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  byConf.forEach((p, i) => {
    const target = scored.find((s) => s.symbol === p.symbol)!;
    target.confidenceRank = i + 1;
  });

  // Effective rank by IA_effective desc
  const byEff = [...scored].sort((a, b) => (b.iaEffective ?? 0) - (a.iaEffective ?? 0));
  byEff.forEach((p, i) => {
    const target = scored.find((s) => s.symbol === p.symbol)!;
    target.effectiveRank = i + 1;
  });

  // Market rank (actionable) by IA_final desc
  const byFinal = [...scored].sort((a, b) => (b.iaFinal ?? 0) - (a.iaFinal ?? 0));
  byFinal.forEach((p, i) => {
    const target = scored.find((s) => s.symbol === p.symbol)!;
    target.marketRank = i + 1;
  });

  return scored;
}

// Compute universe-wide market regime from BTC trend + total mcap trend + volatility.
// If no aggregate data provided, defaults to neutral (1.0).
export function computeUniverseRegime(opts?: {
  btcTrend90d?: number;
  totalMcapTrend90d?: number;
  volatility?: number;
}): number {
  return computeMarketRegime({
    btcTrend90d: opts?.btcTrend90d ?? 0,
    totalMcapTrend90d: opts?.totalMcapTrend90d ?? 0,
    volatility: opts?.volatility ?? 40,
  });
}
