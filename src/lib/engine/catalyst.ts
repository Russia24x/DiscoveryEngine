// Catalyst Engine — v1.4
// Per FRAMEWORK.md §15: Catalyst Engine + Kill Conditions tracking.
//
// Generates upcoming catalysts (protocol upgrades, governance votes, unlock events,
// earnings reports) and tracks kill conditions (conditions that invalidate the thesis).
import type { ProjectInput, Scores } from "./types";
import type { TokenomicsSchedule } from "./tokenomics";

export type CatalystType =
  | "unlock"
  | "upgrade"
  | "governance"
  | "earnings"
  | "partnership"
  | "regulatory"
  | "launch";

export type CatalystImpact = "positive" | "negative" | "neutral";
export type CatalystProbability = "high" | "medium" | "low";

export interface Catalyst {
  id: string;
  type: CatalystType;
  title: string;
  description: string;
  date: string; // ISO
  daysUntil: number;
  impact: CatalystImpact;
  probability: CatalystProbability;
  magnitude: number; // 0-100, expected magnitude of impact
}

export interface KillCondition {
  id: string;
  label: string;
  description: string;
  currentStatus: "safe" | "watch" | "triggered";
  currentValue: string;
  threshold: string;
  margin: number; // 0-100, how much headroom before triggering (100 = far from trigger)
  severity: "warn" | "critical";
}

export interface CatalystReport {
  catalysts: Catalyst[];
  upcomingCount: number;
  nextCatalyst: Catalyst | null;
  killConditions: KillCondition[];
  triggeredKills: number;
  watchKills: number;
  verdict: {
    title: string;
    detail: string;
    riskLevel: "low" | "moderate" | "elevated" | "high";
  };
}

const CATALYST_TEMPLATES: Record<string, Array<Omit<Catalyst, "id" | "date" | "daysUntil">>> = {
  "Perp DEX": [
    { type: "upgrade", title: "Trading fee reduction upgrade", description: "Fee tier optimization to improve competitiveness", impact: "positive", probability: "medium", magnitude: 55 },
    { type: "partnership", title: "New market maker integration", description: "Liquidity provider onboarding", impact: "positive", probability: "high", magnitude: 40 },
  ],
  Lending: [
    { type: "governance", title: "Risk parameter adjustment vote", description: "Community proposal to update collateral factors", impact: "neutral", probability: "high", magnitude: 45 },
    { type: "upgrade", title: "New asset listing", description: "Adding a new collateral type", impact: "positive", probability: "medium", magnitude: 50 },
  ],
  DEX: [
    { type: "governance", title: "Fee switch vote", description: "Community vote on enabling protocol fee", impact: "positive", probability: "medium", magnitude: 70 },
    { type: "upgrade", title: "V3 liquidity migration tooling", description: "Position migration UI launch", impact: "positive", probability: "high", magnitude: 35 },
  ],
  "Liquid Staking": [
    { type: "regulatory", title: "Staking-as-a-service guidance", description: "Regulatory clarification expected", impact: "neutral", probability: "medium", magnitude: 60 },
    { type: "upgrade", title: "Validator set expansion", description: "Adding new node operators", impact: "positive", probability: "high", magnitude: 30 },
  ],
  default: [
    { type: "upgrade", title: "Protocol V2 milestone", description: "Major release with new features", impact: "positive", probability: "medium", magnitude: 55 },
    { type: "partnership", title: "Strategic partnership announcement", description: "Integration with a major protocol", impact: "positive", probability: "low", magnitude: 65 },
  ],
};

export function buildCatalystReport(
  input: ProjectInput,
  scores: Scores,
  tokenomics: TokenomicsSchedule
): CatalystReport {
  const catalysts: Catalyst[] = [];
  const now = Date.now();
  const seed = hashStr(input.symbol);
  const rng = mulberry32(seed);

  // Unlock catalysts from tokenomics schedule — next 3 unlock months.
  const unlockCatalysts = tokenomics.events
    .filter((e) => e.pressureLevel === "high" || e.pressureLevel === "extreme")
    .slice(0, 3);
  for (const e of unlockCatalysts) {
    const days = Math.max(0, Math.floor((new Date(e.date).getTime() - now) / 86400000));
    catalysts.push({
      id: `cat_unlock_${e.month}`,
      type: "unlock",
      title: `${e.monthLabel} unlock — ${e.netPressurePctOfFloat.toFixed(1)}% of float`,
      description: `Net sell pressure $${fmtUsd(e.netPressureUsd)}. ${e.pressureLevel} pressure month.`,
      date: e.date,
      daysUntil: days,
      impact: "negative",
      probability: "high",
      magnitude: Math.min(100, e.netPressurePctOfFloat * 10),
    });
  }

  // Sector-specific catalysts.
  const templates = CATALYST_TEMPLATES[input.sector ?? "default"] ?? CATALYST_TEMPLATES.default;
  for (const t of templates) {
    const offsetDays = Math.floor(rng() * 60) + 5; // 5-65 days out
    const date = new Date(now + offsetDays * 86400000).toISOString();
    catalysts.push({
      id: `cat_${t.type}_${offsetDays}`,
      ...t,
      date,
      daysUntil: offsetDays,
    });
  }

  // Earnings / revenue report catalyst (quarterly).
  const earningsOffset = Math.floor(rng() * 45) + 20;
  catalysts.push({
    id: "cat_earnings",
    type: "earnings",
    title: "Quarterly revenue report",
    description: "Protocol fees + revenue disclosure for the quarter",
    date: new Date(now + earningsOffset * 86400000).toISOString(),
    daysUntil: earningsOffset,
    impact: (input.revenueGrowth ?? 0) >= 15 ? "positive" : (input.revenueGrowth ?? 0) <= 0 ? "negative" : "neutral",
    probability: "high",
    magnitude: 50,
  });

  catalysts.sort((a, b) => a.daysUntil - b.daysUntil);

  const upcomingCount = catalysts.filter((c) => c.daysUntil <= 30).length;
  const nextCatalyst = catalysts[0] ?? null;

  // Kill conditions — derived from thesis + scores + tokenomics.
  const killConditions = buildKillConditions(input, scores, tokenomics);

  const triggeredKills = killConditions.filter((k) => k.currentStatus === "triggered").length;
  const watchKills = killConditions.filter((k) => k.currentStatus === "watch").length;

  const riskLevel: "low" | "moderate" | "elevated" | "high" =
    triggeredKills >= 2 ? "high" : triggeredKills >= 1 || watchKills >= 3 ? "elevated" : watchKills >= 1 ? "moderate" : "low";

  const verdict = {
    title: riskLevel === "high" ? "Thesis at risk" : riskLevel === "elevated" ? "Thesis weakening" : riskLevel === "moderate" ? "Thesis stable, watch conditions" : "Thesis robust",
    detail: `${triggeredKills} kill condition(s) triggered, ${watchKills} on watch. ${upcomingCount} catalyst(s) in next 30 days.`,
    riskLevel,
  };

  return {
    catalysts,
    upcomingCount,
    nextCatalyst,
    killConditions,
    triggeredKills,
    watchKills,
    verdict,
  };
}

function buildKillConditions(
  input: ProjectInput,
  scores: Scores,
  tokenomics: TokenomicsSchedule
): KillCondition[] {
  const conditions: KillCondition[] = [];
  const vae = scores.vae.vae ?? 0;
  const r = scores.components.r ?? 50;
  const growth = input.revenueGrowth ?? 0;

  // Kill 1: VAE drops below 10 (Universal gate).
  conditions.push({
    id: "kill_vae",
    label: "VAE < 10 (value accrual collapses)",
    description: "Value Accrual Efficiency falls below the universal gate threshold.",
    currentStatus: vae < 10 ? "triggered" : vae < 20 ? "watch" : "safe",
    currentValue: `${Math.round(vae)}`,
    threshold: "10",
    margin: Math.max(0, Math.min(100, (vae - 10) * 3)),
    severity: "critical",
  });

  // Kill 2: Revenue growth turns negative.
  conditions.push({
    id: "kill_revenue",
    label: "Revenue growth < 0 (declining)",
    description: "Protocol revenue starts contracting.",
    currentStatus: growth < 0 ? "triggered" : growth < 5 ? "watch" : "safe",
    currentValue: `${growth.toFixed(0)}%`,
    threshold: "0%",
    margin: Math.max(0, Math.min(100, growth * 2)),
    severity: "warn",
  });

  // Kill 3: Risk exceeds 90.
  conditions.push({
    id: "kill_risk",
    label: "Risk score > 90",
    description: "Composite risk exceeds the universal gate threshold.",
    currentStatus: r > 90 ? "triggered" : r > 75 ? "watch" : "safe",
    currentValue: `${Math.round(r)}`,
    threshold: "90",
    margin: Math.max(0, Math.min(100, (90 - r) * 2)),
    severity: "critical",
  });

  // Kill 4: Dilution > 50% (tokenomics).
  conditions.push({
    id: "kill_dilution",
    label: "12m dilution > 50%",
    description: "Token supply inflates by more than 50% in 12 months.",
    currentStatus: tokenomics.dilution12mPct > 50 ? "triggered" : tokenomics.dilution12mPct > 30 ? "watch" : "safe",
    currentValue: `${tokenomics.dilution12mPct.toFixed(0)}%`,
    threshold: "50%",
    margin: Math.max(0, Math.min(100, (50 - tokenomics.dilution12mPct) * 2)),
    severity: "critical",
  });

  // Kill 5: Insider concentration > 80.
  const ic = input.insiderConcentration ?? 50;
  conditions.push({
    id: "kill_insider",
    label: "Insider concentration > 80%",
    description: "Token held by very few large holders — dump risk.",
    currentStatus: ic > 80 ? "triggered" : ic > 65 ? "watch" : "safe",
    currentValue: `${Math.round(ic)}`,
    threshold: "80",
    margin: Math.max(0, Math.min(100, (80 - ic) * 2)),
    severity: "warn",
  });

  return conditions;
}

// ── Helpers ──
function fmtUsd(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
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
