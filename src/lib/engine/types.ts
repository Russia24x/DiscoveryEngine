// CryptoSieve Scoring Engine — types
// All formulas are LOCKED per FRAMEWORK.md v1.0. See RULES.md §4.

export type Decision = "PASS" | "INVESTIGATE" | "REJECT";
export type ThesisStatus = "intact" | "weakened" | "broken";
export type GateId = "vae" | "delta" | "risk" | "sar";

export interface ProjectInput {
  symbol: string;
  name: string;
  sector?: string;
  chain?: string;
  logoUrl?: string;
  // ── Market data ──
  priceUsd?: number;
  marketCap?: number;
  fdv?: number;
  totalSupply?: number;
  floatSupply?: number; // circulating supply
  // ── Value Accrual Chain (annual, USD) ──
  gea?: number; // Gross Economic Activity
  pr?: number; // Protocol Revenue
  pc?: number; // Protocol Capture
  tc?: number; // Tokenholder Capture
  // ── Supply pressures (annual, USD) ──
  buybackBurnAnnual?: number;
  unlockEmission12m?: number;
  // ── PQ components (0-100) ──
  revenueGrowth?: number; // RG
  revenueStability?: number; // RS
  revenueDiversification?: number; // RD
  marketPosition?: number; // MP (moat)
  userGrowth?: number; // UG
  // ── TQ extra (0-100) ──
  tokenUtility?: number; // TU
  governanceQuality?: number; // GQ
  // ── VA extra (0-100) ──
  vaeTrend?: number; // τ
  buybackActivity?: number; // BA
  // ── V extra (0-100) ──
  tokenYield?: number; // TY
  incentiveGravity?: number; // IG
  // ── R components (0-100, higher = riskier) ──
  revenueConcentration?: number; // RC
  insiderConcentration?: number; // IC
  regulatory?: number; // REG
  smartContract?: number; // SC
  marketLiquidity?: number; // ML
  dependency?: number; // DR
  // ── Confidence inputs (0-100) ──
  dataCompleteness?: number;
  sourceQuality?: number;
  modelStability?: number;
  // ── Thesis config ──
  buybackThesis?: boolean; // whether buyback/burn is part of value accrual
}

export interface GateResult {
  id: GateId;
  label: string;
  passed: boolean;
  conditional: boolean;
  value: number;
  threshold: number;
  description: string;
}

export interface VaeChain {
  gea: number | null;
  pr: number | null;
  pc: number | null;
  tc: number | null;
  alpha: number | null; // PC / PR  (as percentage 0-100)
  delta: number | null; // TC / PC  (as percentage 0-100)
  vae: number | null; // TC / PR  (as percentage 0-100)
}

export interface SupplyMetrics {
  sar: number | null; // (Buyback+Burn)/(Unlock+Emission)
  nsp: number | null; // Unlock+Emission-Burn-Buyback
  fdr: number | null; // (12m Unlock+Emission)/Float
}

export interface ComponentScores {
  pq: number | null;
  tq: number | null;
  va: number | null;
  v: number | null;
  r: number | null;
}

export interface Scores {
  components: ComponentScores;
  vae: VaeChain;
  supply: SupplyMetrics;
  iaRaw: number | null;
  confidence: number | null; // C
  iaEffective: number | null;
  marketRegime: number | null; // M
  iaFinal: number | null;
  gates: GateResult[];
  gatePassed: boolean;
  gateReasons: string[];
  decision: Decision;
  decisionExplanation: DecisionExplanation;
  dataCompleteness: number;
}

export interface DecisionExplanation {
  for: string[];
  against: string[];
  triggers: string[];
}

export interface RankedProject extends Scores {
  symbol: string;
  name: string;
  sector?: string;
  chain?: string;
  logoUrl?: string;
  priceUsd?: number;
  marketCap?: number;
  fdv?: number;
  tvl?: number;
  fundamentalRank: number;
  confidenceRank: number;
  effectiveRank: number;
  marketRank: number;
}

export interface ThesisInput {
  title: string;
  whyWorks: string[];
  mustStayTrue: string[];
  whatBreaks: string[];
  latestEvidence: { text: string; dir: "up" | "down" | "flat" }[];
  intactPct: number; // 0-100
}

export interface ThesisResult extends ThesisInput {
  status: ThesisStatus;
}

export interface MarketRegimeInput {
  btcTrend90d: number; // % change
  totalMcapTrend90d: number; // %
  volatility: number; // 0-100, higher = more volatile
}

// Universe-wide market regime, computed from aggregate inputs.
export function computeMarketRegime(input: MarketRegimeInput): number {
  // M ∈ [0.90, 1.10]. Risk-on when trends positive & volatility moderate.
  const trendSignal = (input.btcTrend90d + input.totalMcapTrend90d) / 2; // %
  const volPenalty = Math.min(input.volatility / 100, 1) * 0.05;
  let m = 1 + trendSignal / 400 - volPenalty;
  return clamp(m, 0.9, 1.1);
}

export function clamp(x: number, lo: number, hi: number): number {
  if (Number.isNaN(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

// Normalize a raw ratio (0-1 typical, may exceed) into 0-100 percentage, capped.
export function pct(ratio: number | undefined | null): number {
  if (ratio == null || Number.isNaN(ratio)) return 0;
  return clamp(ratio * 100, 0, 100);
}
