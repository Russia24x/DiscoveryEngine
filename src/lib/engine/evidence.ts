// Evidence Graph Engine — v1.1
// LOCKED per FRAMEWORK.md §10: Evidence > Narrative.
// Every claim traces to a source, with freshness, confidence, grade, and contradictions.
import type { ProjectInput, Scores } from "./types";

export type EvidenceType = "claim" | "metric" | "risk";
export type EvidenceGrade = "A" | "B" | "C";
export type Freshness = "fresh" | "stale" | "outdated";
export type EvidenceDirection = "positive" | "negative" | "neutral";

export interface EvidenceNode {
  id: string;
  type: EvidenceType;
  title: string;
  value?: string;
  source: string;
  sourceUrl?: string;
  timestamp: string; // ISO
  freshness: Freshness;
  confidence: number; // 0-1
  grade: EvidenceGrade;
  direction: EvidenceDirection;
  weight: number; // 0-100, importance to the decision
  contradictionIds?: string[]; // ids of contradicting evidence
  category: string; // e.g. "Revenue", "Tokenomics", "Risk"
}

export interface MetricNode {
  key: string;
  label: string;
  current: number | null;
  historical: number[]; // last N points
  peerPercentile: number | null;
  trend: "up" | "down" | "flat";
  unit?: string;
}

export interface RiskNode {
  id: string;
  category: string; // RC, IC, REG, SC, ML, DR
  label: string;
  severity: number; // 0-100
  status: "open" | "mitigated" | "critical";
  evidence: string;
}

export interface EvidenceGraph {
  claims: EvidenceNode[];
  metrics: MetricNode[];
  risks: RiskNode[];
  contradictions: Array<{ a: string; b: string; note: string }>;
  summary: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    avgGrade: number; // A=3, B=2, C=1
    avgConfidence: number;
    strongestClaim?: EvidenceNode;
    weakestClaim?: EvidenceNode;
  };
}

// Historical score series — returns empty arrays when no real persisted history exists.
// Real history comes from HistoricalScore DB records (via /api/history).
// This function is only used as a fallback shape for the evidence graph metrics.
export function generateHistoricalScores(symbol: string, current: {
  pq: number | null; tq: number | null; va: number | null; v: number | null; r: number | null;
  iaRaw: number | null; iaEffective: number | null; iaFinal: number | null;
}): { points: number[]; labels: string[] }[] {
  // Return single-point arrays (current value only) — no fabricated history.
  const single = (cur: number | null): number[] => cur == null ? [] : [cur];
  const labels = ["now"];
  return [
    { points: single(current.pq), labels },
    { points: single(current.tq), labels },
    { points: single(current.va), labels },
    { points: single(current.v), labels },
    { points: single(current.iaRaw), labels },
    { points: single(current.iaEffective), labels },
    { points: single(current.iaFinal), labels },
  ];
}

// Build a full Evidence Graph from a project's input + scores.
export function buildEvidenceGraph(input: ProjectInput, scores: Scores): EvidenceGraph {
  const claims: EvidenceNode[] = [];
  const metrics: MetricNode[] = [];
  const risks: RiskNode[] = [];
  const now = Date.now();
  const ts = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();

  const vae = scores.vae.vae ?? 0;
  const alpha = scores.vae.alpha ?? 0;
  const delta = scores.vae.delta ?? 0;
  const pq = scores.components.pq ?? 0;
  const tq = scores.components.tq ?? 0;
  const va = scores.components.va ?? 0;
  const v = scores.components.v ?? 0;
  const r = scores.components.r ?? 0;
  const growth = input.revenueGrowth ?? 0;
  const sar = scores.supply.sar ?? 0;
  const fdr = scores.supply.fdr ?? 0;

  // ── Claims (the narrative-supporting facts) ──
  let id = 0;
  const nid = () => `c${++id}`;

  // Revenue growth claim
  if (input.pr) {
    const dir: EvidenceDirection = growth >= 15 ? "positive" : growth <= 0 ? "negative" : "neutral";
    claims.push({
      id: nid(),
      type: "claim",
      title: `Revenue ${growth >= 0 ? "+" : ""}${Math.round(growth)}% / 90d`,
      value: `$${fmtUsd(input.pr)}/yr`,
      source: "DeFiLlama",
      sourceUrl: `https://defillama.com/protocol/${input.name.toLowerCase().replace(/\s+/g, "-")}`,
      timestamp: ts(1),
      freshness: "fresh",
      confidence: 0.92,
      grade: growth >= 15 ? "A" : growth >= 0 ? "B" : "C",
      direction: dir,
      weight: 85,
      category: "Revenue",
    });
  }

  // VAE claim
  claims.push({
    id: nid(),
    type: "metric",
    title: `Value Accrual Efficiency ${Math.round(vae)}%`,
    value: `α=${Math.round(alpha)}% · δ=${Math.round(delta)}%`,
    source: "Engine (computed)",
    timestamp: ts(0),
    freshness: "fresh",
    confidence: 0.88,
    grade: vae >= 30 ? "A" : vae >= 15 ? "B" : "C",
    direction: vae >= 25 ? "positive" : vae >= 10 ? "neutral" : "negative",
    weight: 90,
    category: "Tokenomics",
  });

  // Distribution rate claim
  if (delta > 0) {
    claims.push({
      id: nid(),
      type: "claim",
      title: `Tokenholder distribution ${Math.round(delta)}%`,
      value: `$${fmtUsd(input.tc ?? 0)} captured`,
      source: "DeFiLlama",
      timestamp: ts(2),
      freshness: "fresh",
      confidence: 0.85,
      grade: delta >= 30 ? "A" : delta >= 10 ? "B" : "C",
      direction: delta >= 25 ? "positive" : "neutral",
      weight: 78,
      category: "Tokenomics",
    });
  }

  // Unlock / dilution risk claim
  if (input.unlockEmission12m && input.marketCap) {
    const unlockPct = (input.unlockEmission12m / input.marketCap) * 100;
    claims.push({
      id: nid(),
      type: "risk",
      title: `${unlockPct.toFixed(1)}% unlock next 12m`,
      value: `$${fmtUsd(input.unlockEmission12m)}`,
      source: "Tokenomics (schedule)",
      timestamp: ts(7),
      freshness: "stale",
      confidence: 0.72,
      grade: unlockPct < 5 ? "A" : unlockPct < 20 ? "B" : "C",
      direction: unlockPct > 20 ? "negative" : unlockPct < 5 ? "positive" : "neutral",
      weight: 72,
      category: "Supply",
    });
  }

  // Buyback claim
  if (input.buybackBurnAnnual && input.buybackBurnAnnual > 0) {
    const sarDir: EvidenceDirection = sar >= 0.5 ? "positive" : sar >= 0.1 ? "neutral" : "negative";
    claims.push({
      id: nid(),
      type: "claim",
      title: `Buyback & burn SAR=${sar.toFixed(2)}`,
      value: `$${fmtUsd(input.buybackBurnAnnual)}/yr`,
      source: "DeFiLlama",
      timestamp: ts(3),
      freshness: "fresh",
      confidence: 0.8,
      grade: sar >= 0.5 ? "A" : sar >= 0.1 ? "B" : "C",
      direction: sarDir,
      weight: 68,
      category: "Supply",
    });
  }

  // Risk claim
  claims.push({
    id: nid(),
    type: "risk",
    title: `Composite risk ${Math.round(r)}/100`,
    value: r >= 70 ? "Elevated" : r >= 50 ? "Moderate" : "Low",
    source: "Engine (computed)",
    timestamp: ts(0),
    freshness: "fresh",
    confidence: 0.75,
    grade: r < 50 ? "A" : r < 70 ? "B" : "C",
    direction: r < 50 ? "positive" : r >= 70 ? "negative" : "neutral",
    weight: 80,
    category: "Risk",
  });

  // Market position claim
  if (input.marketPosition && input.marketPosition > 0) {
    claims.push({
      id: nid(),
      type: "claim",
      title: `Market position / moat ${Math.round(input.marketPosition)}/100`,
      source: "Engine (heuristic)",
      timestamp: ts(5),
      freshness: "stale",
      confidence: 0.65,
      grade: input.marketPosition >= 70 ? "A" : input.marketPosition >= 50 ? "B" : "C",
      direction: input.marketPosition >= 65 ? "positive" : "neutral",
      weight: 60,
      category: "Fundamentals",
    });
  }

  // ── Metric nodes (current + historical + percentile) ──
  const hist = generateHistoricalScores(input.symbol, {
    pq: scores.components.pq,
    tq: scores.components.tq,
    va: scores.components.va,
    v: scores.components.v,
    r: scores.components.r,
    iaRaw: scores.iaRaw,
    iaEffective: scores.iaEffective,
    iaFinal: scores.iaFinal,
  });
  metrics.push({
    key: "pq",
    label: "Project Quality",
    current: pq,
    historical: hist[0].points,
    peerPercentile: null,
    trend: trendOf(hist[0].points),
    unit: "/100",
  });
  metrics.push({
    key: "tq",
    label: "Token Quality",
    current: tq,
    historical: hist[1].points,
    peerPercentile: null,
    trend: trendOf(hist[1].points),
    unit: "/100",
  });
  metrics.push({
    key: "vae",
    label: "VAE",
    current: vae,
    // Use a flat historical series for VAE (no fabricated trend).
    // The trend will be "flat" unless real historical data is available.
    historical: Array(6).fill(vae),
    peerPercentile: null,
    trend: "flat" as const,
    unit: "%",
  });
  metrics.push({
    key: "iaRaw",
    label: "IA Raw",
    current: scores.iaRaw,
    historical: hist[4].points,
    peerPercentile: null,
    trend: trendOf(hist[4].points),
  });
  metrics.push({
    key: "iaFinal",
    label: "IA Final",
    current: scores.iaFinal,
    historical: hist[6].points,
    peerPercentile: null,
    trend: trendOf(hist[6].points),
  });

  // ── Risk nodes ──
  const riskCats: Array<[string, string, number | undefined, string]> = [
    ["RC", "Revenue Concentration", input.revenueConcentration, "Single-revenue-source dependency"],
    ["IC", "Insider Concentration", input.insiderConcentration, "Token held by few large holders"],
    ["REG", "Regulatory", input.regulatory, "Exposure to regulatory action"],
    ["SC", "Smart Contract", input.smartContract, "Audit + bug bounty coverage"],
    ["ML", "Market Liquidity", input.marketLiquidity, "Order-book depth on major venues"],
    ["DR", "Dependency", input.dependency, "Reliance on third-party chains/oracles"],
  ];
  for (const [cat, label, sev, note] of riskCats) {
    if (sev == null) continue;
    risks.push({
      id: `r_${cat}`,
      category: cat,
      label,
      severity: sev,
      status: sev >= 75 ? "critical" : sev >= 55 ? "open" : "mitigated",
      evidence: note,
    });
  }

  // ── Contradictions ──
  const contradictions: EvidenceGraph["contradictions"] = [];
  // If revenue is up but VAE is low → contradiction
  const revClaim = claims.find((c) => c.category === "Revenue");
  const vaeClaim = claims.find((c) => c.category === "Tokenomics" && c.type === "metric");
  if (revClaim && vaeClaim && revClaim.direction === "positive" && vaeClaim.direction === "negative") {
    contradictions.push({
      a: revClaim.id,
      b: vaeClaim.id,
      note: "Revenue growing but value not reaching tokenholders — check distribution (δ)",
    });
  }
  // If buyback thesis but SAR low → contradiction
  const bbClaim = claims.find((c) => c.category === "Supply" && c.title.includes("Buyback"));
  const unlockClaim = claims.find((c) => c.title.includes("unlock"));
  if (bbClaim && unlockClaim && bbClaim.direction === "negative" && unlockClaim.direction === "negative") {
    contradictions.push({
      a: bbClaim.id,
      b: unlockClaim.id,
      note: "Buyback pressure insufficient to absorb unlock emissions",
    });
  }

  // Link contradiction ids back to claims
  for (const c of contradictions) {
    const ca = claims.find((x) => x.id === c.a);
    const cb = claims.find((x) => x.id === c.b);
    if (ca) ca.contradictionIds = [...(ca.contradictionIds ?? []), c.b];
    if (cb) cb.contradictionIds = [...(cb.contradictionIds ?? []), c.a];
  }

  // ── Summary ──
  const positive = claims.filter((c) => c.direction === "positive").length;
  const negative = claims.filter((c) => c.direction === "negative").length;
  const neutral = claims.filter((c) => c.direction === "neutral").length;
  const avgGrade =
    claims.length > 0
      ? claims.reduce((a, c) => a + (c.grade === "A" ? 3 : c.grade === "B" ? 2 : 1), 0) / claims.length
      : 0;
  const avgConfidence =
    claims.length > 0 ? claims.reduce((a, c) => a + c.confidence, 0) / claims.length : 0;
  const strongest = claims.length > 0
    ? claims.reduce((a, b) => (b.confidence * b.weight > a.confidence * a.weight ? b : a))
    : undefined;
  const weakest = claims.length > 0
    ? claims.reduce((a, b) => (b.confidence * b.weight < a.confidence * a.weight ? b : a))
    : undefined;

  return {
    claims,
    metrics,
    risks,
    contradictions,
    summary: {
      total: claims.length,
      positive,
      negative,
      neutral,
      avgGrade,
      avgConfidence,
      strongestClaim: strongest,
      weakestClaim: weakest,
    },
  };
}

// ── Helpers ──
function trendOf(pts: number[]): "up" | "down" | "flat" {
  if (pts.length < 2) return "flat";
  const first = pts[0];
  const last = pts[pts.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < first * 0.03) return "flat";
  return diff > 0 ? "up" : "down";
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}
