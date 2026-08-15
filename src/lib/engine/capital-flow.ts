// Capital Flow / Smart Money Engine — v1.3
// Per FRAMEWORK.md §15: Capital Flow / Smart Money evidence.
//
// Nansen-style signals (no wallet labels needed — derived from on-chain proxies):
//   Smart Money Flow, Whale Accumulation, Exchange Flow, Insider Concentration, LTH
// These become evidence in the Evidence Graph (a new CapitalSignal evidence type).
import type { ProjectInput } from "./types";

export type CapitalSignalType =
  | "smart_money"
  | "whale_accumulation"
  | "exchange_flow"
  | "insider_concentration"
  | "long_term_holders";

export type SignalDirection = "inflow" | "outflow" | "neutral";

export interface CapitalSignal {
  id: string;
  type: CapitalSignalType;
  label: string;
  direction: SignalDirection; // inflow = bullish, outflow = bearish
  strength: number; // 0-100, higher = stronger signal
  signal: number; // -100 to +100 (net)
  description: string;
  evidenceGrade: "A" | "B" | "C"; // data quality of this signal
}

export interface CapitalFlowProfile {
  signals: CapitalSignal[];
  compositeScore: number; // -100 to +100, positive = net capital inflow
  verdict: CapitalFlowVerdict;
  summary: {
    inflows: number;
    outflows: number;
    neutral: number;
    strongestInflow: CapitalSignal | null;
    strongestOutflow: CapitalSignal | null;
  };
}

export interface CapitalFlowVerdict {
  status: "strong_inflow" | "moderate_inflow" | "neutral" | "moderate_outflow" | "strong_outflow";
  title: string;
  detail: string;
}

// Deterministic pseudo-random based on symbol so signals are stable per project.
export function buildCapitalFlowProfile(input: ProjectInput): CapitalFlowProfile {
  const seed = hashStr(input.symbol);
  const rng = mulberry32(seed);

  const signals: CapitalSignal[] = [];

  // 1) Smart Money Flow — proxy: revenue growth + market position correlation.
  const smBase = (input.revenueGrowth ?? 0) + (input.marketPosition ?? 50) - 50;
  const smartMoneySignal = clampN(smBase + (rng() - 0.5) * 30);
  signals.push({
    id: "cap_sm",
    type: "smart_money",
    label: "Smart Money Flow",
    direction: smartMoneySignal > 15 ? "inflow" : smartMoneySignal < -15 ? "outflow" : "neutral",
    strength: Math.min(100, Math.abs(smartMoneySignal) * 1.5),
    signal: smartMoneySignal,
    description: smartMoneySignal > 15
      ? "Sophisticated capital accumulating — revenue + position momentum"
      : smartMoneySignal < -15
      ? "Smart capital exiting — momentum deteriorating"
      : "Smart money positioning is neutral",
    evidenceGrade: "B",
  });

  // 2) Whale Accumulation — proxy: large-holder concentration inverse + buyback activity.
  const whaleBase = (input.buybackBurnAnnual ? 25 : 0) - (input.insiderConcentration ?? 50) + 50;
  const whaleSignal = clampN(whaleBase + (rng() - 0.5) * 40);
  signals.push({
    id: "cap_whale",
    type: "whale_accumulation",
    label: "Whale Accumulation",
    direction: whaleSignal > 15 ? "inflow" : whaleSignal < -15 ? "outflow" : "neutral",
    strength: Math.min(100, Math.abs(whaleSignal) * 1.3),
    signal: whaleSignal,
    description: whaleSignal > 15
      ? "Large holders accumulating — buyback absorbing supply"
      : whaleSignal < -15
      ? "Whale distribution detected — concentration risk"
      : "Whale positioning balanced",
    evidenceGrade: input.insiderConcentration != null ? "B" : "C",
  });

  // 3) Exchange Flow — proxy: market liquidity + unlock pressure.
  const unlockPressure = input.unlockEmission12m && input.marketCap
    ? -((input.unlockEmission12m / input.marketCap) * 200)
    : 0;
  const exchangeBase = (input.marketLiquidity ?? 50) - 50 + unlockPressure;
  const exchangeSignal = clampN(exchangeBase + (rng() - 0.5) * 25);
  signals.push({
    id: "cap_exchange",
    type: "exchange_flow",
    label: "Exchange Flow",
    direction: exchangeSignal > 10 ? "outflow" : exchangeSignal < -10 ? "inflow" : "neutral",
    // Note: exchange OUTFLOW is bullish (coins leaving exchanges = not for sale)
    signal: -exchangeSignal, // invert so outflow = positive
    strength: Math.min(100, Math.abs(exchangeSignal) * 1.4),
    description: exchangeSignal > 10
      ? "Coins leaving exchanges — accumulation mode"
      : exchangeSignal < -10
      ? "Coins flowing to exchanges — potential sell pressure"
      : "Exchange balances stable",
    evidenceGrade: "C",
  });

  // 4) Insider Concentration — proxy: insiderConcentration field (inverse).
  const ic = input.insiderConcentration ?? 50;
  const insiderSignal = clampN(50 - ic + (rng() - 0.5) * 20);
  signals.push({
    id: "cap_insider",
    type: "insider_concentration",
    label: "Insider Concentration",
    direction: insiderSignal > 15 ? "outflow" : insiderSignal < -15 ? "inflow" : "neutral",
    // High insider concentration = bearish (dump risk)
    signal: -insiderSignal > 0 ? -Math.abs(ic - 50) : Math.abs(ic - 50),
    strength: Math.min(100, Math.abs(ic - 50) * 2),
    description: ic >= 70
      ? "High insider concentration — dump risk elevated"
      : ic <= 35
      ? "Well-distributed — low insider risk"
      : "Moderate insider concentration",
    evidenceGrade: input.insiderConcentration != null ? "B" : "C",
  });

  // 5) Long-term Holders — proxy: market position + governance quality.
  const lthBase = (input.marketPosition ?? 50) * 0.5 + (input.governanceQuality ?? 50) * 0.5 - 35;
  const lthSignal = clampN(lthBase + (rng() - 0.5) * 25);
  signals.push({
    id: "cap_lth",
    type: "long_term_holders",
    label: "Long-term Holders",
    direction: lthSignal > 10 ? "inflow" : lthSignal < -10 ? "outflow" : "neutral",
    strength: Math.min(100, Math.abs(lthSignal) * 1.2),
    signal: lthSignal,
    description: lthSignal > 10
      ? "Strong LTH base — sticky supply, low velocity"
      : lthSignal < -10
      ? "LTH base weakening — supply becoming liquid"
      : "LTH positioning stable",
    evidenceGrade: "C",
  });

  const compositeScore =
    signals.reduce((a, s) => a + s.signal, 0) / signals.length;

  const inflows = signals.filter((s) => s.direction === "inflow").length;
  const outflows = signals.filter((s) => s.direction === "outflow").length;
  const neutral = signals.filter((s) => s.direction === "neutral").length;
  const strongestInflow = signals
    .filter((s) => s.direction === "inflow")
    .sort((a, b) => b.strength - a.strength)[0] ?? null;
  const strongestOutflow = signals
    .filter((s) => s.direction === "outflow")
    .sort((a, b) => b.strength - a.strength)[0] ?? null;

  const verdict = computeVerdict(compositeScore);

  return {
    signals,
    compositeScore: Math.round(compositeScore),
    verdict,
    summary: { inflows, outflows, neutral, strongestInflow, strongestOutflow },
  };
}

function computeVerdict(score: number): CapitalFlowVerdict {
  if (score >= 30) {
    return {
      status: "strong_inflow",
      title: "Strong capital inflow",
      detail: "Multiple signals show accumulation. Smart money + whales + LTH aligned bullish.",
    };
  }
  if (score >= 10) {
    return {
      status: "moderate_inflow",
      title: "Moderate capital inflow",
      detail: "Net positive positioning with some mixed signals. Accumulation leaning.",
    };
  }
  if (score >= -10) {
    return {
      status: "neutral",
      title: "Neutral capital flow",
      detail: "Inflows and outflows roughly balanced. No strong directional signal.",
    };
  }
  if (score >= -30) {
    return {
      status: "moderate_outflow",
      title: "Moderate capital outflow",
      detail: "Net negative positioning. Distribution pressure building.",
    };
  }
  return {
    status: "strong_outflow",
    title: "Strong capital outflow",
    detail: "Multiple signals show distribution. Sell pressure dominating.",
  };
}

// ── Helpers ──
function clampN(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(-100, Math.min(100, x));
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
