// Tokenomics / Unlock Schedule Engine — v1.3
// Per FRAMEWORK.md §15: Unlock/Tokenomics Engine deepening.
//
// Projects a 12-month unlock + dilution schedule, computes sell pressure
// per month, absorption capacity, and a tokenomics health verdict.
import type { ProjectInput } from "./types";

export interface UnlockEvent {
  month: number; // 1-12
  monthLabel: string; // "M1", "M2", ...
  date: string; // ISO date
  unlockUsd: number; // token unlock value in USD
  emissionUsd: number; // ongoing emission value
  buybackUsd: number; // buyback/burn
  netPressureUsd: number; // unlock + emission - buyback (positive = sell pressure)
  netPressurePctOfFloat: number; // as % of current float
  cumulativeDilution: number; // cumulative % increase in supply since now
  pressureLevel: "low" | "moderate" | "high" | "extreme";
}

export interface TokenomicsSchedule {
  events: UnlockEvent[];
  totalUnlock12m: number;
  totalEmission12m: number;
  totalBuyback12m: number;
  totalNetPressure: number;
  peakPressureMonth: UnlockEvent | null;
  currentFloat: number;
  projectedFloat12m: number;
  dilution12mPct: number;
  absorptionRatio: number; // buyback / (unlock + emission)
  monthlyAvgPressure: number;
  verdict: TokenomicsVerdict;
  riskGates: TokenomicsRiskGate[];
}

export interface TokenomicsVerdict {
  status: "healthy" | "acceptable" | "concerning" | "dangerous";
  title: string;
  detail: string;
  score: number; // 0-100, higher = healthier tokenomics
}

export interface TokenomicsRiskGate {
  id: string;
  label: string;
  triggered: boolean;
  value: string;
  threshold: string;
  severity: "info" | "warn" | "critical";
}

const MONTHS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];

export function buildTokenomicsSchedule(input: ProjectInput): TokenomicsSchedule {
  const annualUnlock = input.unlockEmission12m ?? 0;
  const annualBuyback = input.buybackBurnAnnual ?? 0;
  const floatSupply = input.floatSupply ?? 0;
  const priceUsd = input.priceUsd ?? 0;
  const marketCap = input.marketCap ?? 0;

  // Distribute unlock across 12 months with a front-loaded curve (typical for vesting cliffs).
  // Months 1-3 get ~35% of annual unlock (cliff), rest distributed linearly.
  const monthlyDistribution = [0.15, 0.12, 0.08, 0.075, 0.07, 0.065, 0.06, 0.055, 0.05, 0.045, 0.04, 0.035];
  // Normalize to sum=1
  const distSum = monthlyDistribution.reduce((a, b) => a + b, 0);
  const normalizedDist = monthlyDistribution.map((m) => m / distSum);

  // Ongoing emissions spread evenly.
  const monthlyEmissionBase = annualUnlock * 0.3; // 30% of unlock is linear emission
  const monthlyCliff = annualUnlock * 0.7; // 70% is cliff-based
  const monthlyBuyback = annualBuyback / 12;

  const now = new Date();
  const events: UnlockEvent[] = [];
  let cumulativeDilution = 0;
  let totalUnlock = 0;
  let totalEmission = 0;
  let totalBuyback = 0;

  for (let m = 0; m < 12; m++) {
    const monthUnlock = monthlyCliff * normalizedDist[m];
    const monthEmission = monthlyEmissionBase / 12;
    const monthBuyback = monthlyBuyback;
    const netPressure = monthUnlock + monthEmission - monthBuyback;
    const netPctOfFloat = floatSupply > 0 && priceUsd > 0 ? (netPressure / (floatSupply * priceUsd)) * 100 : 0;
    cumulativeDilution += monthUnlock + monthEmission;
    const dilutionPct = floatSupply > 0 ? (cumulativeDilution / floatSupply) * 100 : 0;

    const date = new Date(now.getFullYear(), now.getMonth() + m + 1, 1);
    const pressureLevel: UnlockEvent["pressureLevel"] =
      netPctOfFloat >= 8 ? "extreme" : netPctOfFloat >= 4 ? "high" : netPctOfFloat >= 1.5 ? "moderate" : "low";

    events.push({
      month: m + 1,
      monthLabel: MONTHS[m],
      date: date.toISOString(),
      unlockUsd: monthUnlock,
      emissionUsd: monthEmission,
      buybackUsd: monthBuyback,
      netPressureUsd: netPressure,
      netPressurePctOfFloat: netPctOfFloat,
      cumulativeDilution: dilutionPct,
      pressureLevel,
    });

    totalUnlock += monthUnlock;
    totalEmission += monthEmission;
    totalBuyback += monthBuyback;
  }

  const totalNetPressure = totalUnlock + totalEmission - totalBuyback;
  const peakPressureMonth = events.reduce(
    (max, e) => (e.netPressurePctOfFloat > (max?.netPressurePctOfFloat ?? 0) ? e : max),
    null as UnlockEvent | null
  );

  const projectedFloat12m = floatSupply + (annualUnlock / (priceUsd || 1));
  const dilution12mPct = floatSupply > 0 ? (annualUnlock / floatSupply) * 100 : 0;
  const absorptionRatio = annualUnlock > 0 ? annualBuyback / annualUnlock : 0;
  const monthlyAvgPressure =
    events.reduce((a, e) => a + e.netPressurePctOfFloat, 0) / events.length;

  const verdict = computeTokenomicsVerdict({
    dilution12mPct,
    absorptionRatio,
    monthlyAvgPressure,
    peakPressure: peakPressureMonth?.netPressurePctOfFloat ?? 0,
  });

  const riskGates = computeRiskGates({
    dilution12mPct,
    absorptionRatio,
    peakPressure: peakPressureMonth?.netPressurePctOfFloat ?? 0,
    monthlyAvgPressure,
  });

  return {
    events,
    totalUnlock12m: totalUnlock,
    totalEmission12m: totalEmission,
    totalBuyback12m: totalBuyback,
    totalNetPressure,
    peakPressureMonth,
    currentFloat: floatSupply,
    projectedFloat12m,
    dilution12mPct,
    absorptionRatio,
    monthlyAvgPressure,
    verdict,
    riskGates,
  };
}

function computeTokenomicsVerdict(opts: {
  dilution12mPct: number;
  absorptionRatio: number;
  monthlyAvgPressure: number;
  peakPressure: number;
}): TokenomicsVerdict {
  const { dilution12mPct, absorptionRatio, monthlyAvgPressure, peakPressure } = opts;

  // Composite score: lower dilution, higher absorption, lower pressure = better.
  const dilutionScore = Math.max(0, 100 - dilution12mPct * 3);
  const absorptionScore = Math.min(100, absorptionRatio * 100);
  const pressureScore = Math.max(0, 100 - monthlyAvgPressure * 8);
  const peakScore = Math.max(0, 100 - peakPressure * 6);
  const score = dilutionScore * 0.35 + absorptionScore * 0.25 + pressureScore * 0.2 + peakScore * 0.2;

  let status: TokenomicsVerdict["status"];
  let title: string;
  let detail: string;

  if (score >= 70) {
    status = "healthy";
    title = "Healthy tokenomics";
    detail = `Low dilution (${dilution12mPct.toFixed(1)}%), strong absorption (SAR=${absorptionRatio.toFixed(2)}). Supply pressure manageable.`;
  } else if (score >= 50) {
    status = "acceptable";
    title = "Acceptable tokenomics";
    detail = `Moderate dilution (${dilution12mPct.toFixed(1)}%), absorption SAR=${absorptionRatio.toFixed(2)}. Monitor unlock months.`;
  } else if (score >= 30) {
    status = "concerning";
    title = "Concerning tokenomics";
    detail = `High dilution (${dilution12mPct.toFixed(1)}%), weak absorption (SAR=${absorptionRatio.toFixed(2)}). Sell pressure elevated.`;
  } else {
    status = "dangerous";
    title = "Dangerous tokenomics";
    detail = `Extreme dilution (${dilution12mPct.toFixed(1)}%), absorption insufficient (SAR=${absorptionRatio.toFixed(2)}). High risk of price suppression.`;
  }

  return { status, title, detail, score: Math.round(score) };
}

function computeRiskGates(opts: {
  dilution12mPct: number;
  absorptionRatio: number;
  peakPressure: number;
  monthlyAvgPressure: number;
}): TokenomicsRiskGate[] {
  const { dilution12mPct, absorptionRatio, peakPressure, monthlyAvgPressure } = opts;
  return [
    {
      id: "dilution_30",
      label: "12m Dilution > 30%",
      triggered: dilution12mPct > 30,
      value: `${dilution12mPct.toFixed(1)}%`,
      threshold: "30%",
      severity: dilution12mPct > 50 ? "critical" : "warn",
    },
    {
      id: "dilution_50",
      label: "12m Dilution > 50%",
      triggered: dilution12mPct > 50,
      value: `${dilution12mPct.toFixed(1)}%`,
      threshold: "50%",
      severity: "critical",
    },
    {
      id: "absorption_low",
      label: "Absorption SAR < 0.1",
      triggered: absorptionRatio < 0.1,
      value: `SAR=${absorptionRatio.toFixed(2)}`,
      threshold: "0.1",
      severity: absorptionRatio < 0.05 ? "critical" : "warn",
    },
    {
      id: "peak_pressure",
      label: "Peak monthly pressure > 8%",
      triggered: peakPressure > 8,
      value: `${peakPressure.toFixed(1)}%`,
      threshold: "8%",
      severity: peakPressure > 12 ? "critical" : "warn",
    },
    {
      id: "avg_pressure",
      label: "Avg monthly pressure > 3%",
      triggered: monthlyAvgPressure > 3,
      value: `${monthlyAvgPressure.toFixed(1)}%`,
      threshold: "3%",
      severity: monthlyAvgPressure > 5 ? "critical" : "warn",
    },
  ];
}
