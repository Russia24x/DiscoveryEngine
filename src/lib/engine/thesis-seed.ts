// Thesis generator — builds a living thesis per project from real metrics.
// Per FRAMEWORK.md §12.
// Thesis is derived from actual data: revenue, VAE, risk, supply, market position.
// No hardcoded templates — the thesis structure adapts to what data is available.
import type { ProjectInput, Scores } from "./types";

export interface DefaultThesis {
  title: string;
  whyWorks: string[];
  mustStayTrue: string[];
  whatBreaks: string[];
  latestEvidence: { text: string; dir: "up" | "down" | "flat" }[];
  intactPct: number;
}

export function generateDefaultThesis(input: ProjectInput, scores: Scores): DefaultThesis {
  const vae = scores.vae.vae;
  const alpha = scores.vae.alpha;
  const delta = scores.vae.delta;
  const r = scores.components.r ?? 50;
  const pq = scores.components.pq ?? 0;
  const v = scores.components.v ?? 0;
  const growth = input.revenueGrowth ?? 0;
  const sector = input.sector ?? "Unknown";

  // ── Title: derived from sector + key metric ──
  const title = buildThesisTitle(sector, input, scores);

  // ── Why it works: based on actual positive signals ──
  const whyWorks: string[] = [];
  if (growth >= 15) whyWorks.push(`Revenue growing ${Math.round(growth)}%/90d`);
  if (vae != null && vae >= 25) whyWorks.push(`Value accrual Efficiency ${Math.round(vae)}%`);
  if (alpha != null && alpha >= 50) whyWorks.push(`Protocol captures ${Math.round(alpha)}% of revenue`);
  if (pq >= 65) whyWorks.push("Strong project fundamentals");
  if (v >= 55) whyWorks.push("Reasonable valuation");
  if (r <= 50) whyWorks.push("Low risk profile");
  if (input.marketCap && input.marketCap > 1e9) whyWorks.push(`Large market cap ($${fmt(input.marketCap)})`);
  if (whyWorks.length === 0) whyWorks.push("No strong positive signals — investigate further");

  // ── What must stay true: derived from current thresholds ──
  const mustStayTrue: string[] = [];
  if (input.pr) mustStayTrue.push(`Revenue > $${fmt(input.pr * 0.6)}/yr`);
  if (vae != null) mustStayTrue.push(`VAE > ${Math.max(10, Math.round(vae * 0.5))}%`);
  mustStayTrue.push(`Risk < ${Math.min(85, Math.round(r + 10))}`);
  if (input.unlockEmission12m && input.marketCap) {
    const unlockPct = (input.unlockEmission12m / input.marketCap) * 100;
    if (unlockPct > 0) mustStayTrue.push(`Unlock < ${Math.round(unlockPct * 1.5)}% of mcap`);
  }

  // ── What breaks it: derived from risk factors ──
  const whatBreaks: string[] = [];
  if (input.pr) whatBreaks.push("Revenue declines > 40%");
  if (vae != null && vae >= 10) whatBreaks.push("VAE drops below 10%");
  whatBreaks.push("Risk exceeds 90");
  if (input.unlockEmission12m && input.marketCap) {
    const unlockPct = (input.unlockEmission12m / input.marketCap) * 100;
    if (unlockPct > 5) whatBreaks.push("Unlock acceleration beyond absorption");
  }
  if (r >= 60) whatBreaks.push("Risk profile deteriorates further");

  // ── Latest evidence: from real metrics ──
  const latestEvidence: { text: string; dir: "up" | "down" | "flat" }[] = [];

  // Revenue growth
  if (growth >= 15) latestEvidence.push({ text: `Revenue growth +${Math.round(growth)}%`, dir: "up" });
  else if (growth <= 0) latestEvidence.push({ text: `Revenue growth ${Math.round(growth)}%`, dir: "down" });
  else latestEvidence.push({ text: `Revenue growth +${Math.round(growth)}%`, dir: "flat" });

  // VAE
  if (vae != null) {
    if (vae >= 30) latestEvidence.push({ text: `VAE ${Math.round(vae)}%`, dir: "up" });
    else if (vae < 10) latestEvidence.push({ text: `VAE ${Math.round(vae)}%`, dir: "down" });
    else latestEvidence.push({ text: `VAE ${Math.round(vae)}%`, dir: "flat" });
  } else {
    latestEvidence.push({ text: "VAE unknown", dir: "flat" });
  }

  // Risk
  if (r < 50) latestEvidence.push({ text: `Risk ${Math.round(r)}`, dir: "up" });
  else if (r > 70) latestEvidence.push({ text: `Risk ${Math.round(r)}`, dir: "down" });
  else latestEvidence.push({ text: `Risk ${Math.round(r)}`, dir: "flat" });

  // Price change 90d
  if (input.priceChange90d != null) {
    const pc = input.priceChange90d;
    if (pc >= 10) latestEvidence.push({ text: `Price +${Math.round(pc)}%/90d`, dir: "up" });
    else if (pc <= -10) latestEvidence.push({ text: `Price ${Math.round(pc)}%/90d`, dir: "down" });
    else latestEvidence.push({ text: `Price ${Math.round(pc)}%/90d`, dir: "flat" });
  }

  // Unlock pressure
  if (input.unlockEmission12m && input.marketCap) {
    const unlockPct = (input.unlockEmission12m / input.marketCap) * 100;
    latestEvidence.push({
      text: `${unlockPct.toFixed(1)}% unlock/12m`,
      dir: unlockPct > 20 ? "down" : unlockPct < 5 ? "up" : "flat",
    });
  }

  // ── Intact %: derived from evidence direction ──
  const up = latestEvidence.filter((e) => e.dir === "up").length;
  const down = latestEvidence.filter((e) => e.dir === "down").length;
  const total = latestEvidence.length;
  const intactPct = total > 0
    ? Math.max(0, Math.min(100, 50 + ((up - down) / total) * 100))
    : 50;

  return {
    title,
    whyWorks,
    mustStayTrue,
    whatBreaks,
    latestEvidence,
    intactPct: Math.round(intactPct),
  };
}

function buildThesisTitle(sector: string, input: ProjectInput, scores: Scores): string {
  const parts: string[] = [];

  // Sector-based prefix
  const sectorLower = sector.toLowerCase();
  if (sectorLower.includes("dex") || sectorLower.includes("perp") || sectorLower.includes("derivatives")) {
    parts.push("Trading venue");
  } else if (sectorLower.includes("lending") || sectorLower.includes("cdp")) {
    parts.push("Credit protocol");
  } else if (sectorLower.includes("staking") || sectorLower.includes("liquid staking")) {
    parts.push("Staking infrastructure");
  } else if (sectorLower.includes("stablecoin")) {
    parts.push("Stable value");
  } else if (sectorLower.includes("bridge")) {
    parts.push("Cross-chain");
  } else if (sectorLower.includes("yield")) {
    parts.push("Yield protocol");
  } else {
    parts.push(sector || "Protocol");
  }

  // Key metric suffix
  const vae = scores.vae.vae;
  const growth = input.revenueGrowth ?? 0;
  if (growth >= 30) parts.push("with strong growth");
  else if (growth <= 0) parts.push("with declining revenue");
  else if (vae != null && vae >= 30) parts.push("with value accrual");
  else if (scores.components.r != null && scores.components.r <= 40) parts.push("with low risk");
  else parts.push("thesis");

  return parts.join(" ");
}

function fmt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

