// Default thesis generator — builds a living thesis per project from its sector + scores.
// Per FRAMEWORK.md §12.
import type { ProjectInput, Scores } from "./types";

export interface DefaultThesis {
  title: string;
  whyWorks: string[];
  mustStayTrue: string[];
  whatBreaks: string[];
  latestEvidence: { text: string; dir: "up" | "down" | "flat" }[];
  intactPct: number;
}

const SECTOR_THESIS: Record<string, { title: string; why: string[]; breaks: string[] }> = {
  "Perp DEX": {
    title: "Perp DEX tollbooth thesis",
    why: ["Revenue", "Market share", "Liquidity", "Product moat"],
    breaks: ["Revenue -40%", "Market share < 10%", "Governance failure", "Unlock > absorption"],
  },
  Lending: {
    title: "Money market dominance thesis",
    why: ["TVL leadership", "Risk parameters", "Net interest margin", "Brand trust"],
    breaks: ["Bad debt event", "TVL drawdown > 30%", "Rate model failure"],
  },
  DEX: {
    title: "Liquidity venue thesis",
    why: ["Volume share", "Fee switch optionality", "Liquidity depth"],
    breaks: ["Volume -50%", "Liquidity migration", "Fee switch reversal"],
  },
  "Liquid Staking": {
    title: "Staking rails thesis",
    why: ["Staked share", "Validator diversity", "Yield reliability"],
    breaks: ["Slashing event", "Staked share < 15%", "Competitor undercut"],
  },
  Stablecoin: {
    title: "Reserve stability thesis",
    why: ["Peg stability", "Reserve quality", "Yield distribution"],
    breaks: ["Peg break", "Reserve opacity", "Regulatory action"],
  },
  default: {
    title: "Sector leader thesis",
    why: ["Revenue", "Market position", "Token utility"],
    breaks: ["Revenue -40%", "Market share collapse", "Governance failure"],
  },
};

export function generateDefaultThesis(input: ProjectInput, scores: Scores): DefaultThesis {
  const s = SECTOR_THESIS[input.sector ?? "default"] ?? SECTOR_THESIS.default;
  const vae = scores.vae.vae ?? 0;
  const r = scores.components.r ?? 50;
  const growth = input.revenueGrowth ?? 0;

  const mustStayTrue = [
    `Revenue > $${fmt(input.pr ? input.pr * 0.6 : 0)}`,
    `VAE > ${Math.max(15, Math.round(vae * 0.6))}%`,
    `Risk < ${Math.min(85, Math.round(r + 10))}`,
    ...(input.unlockEmission12m ? [`Unlock absorption > ${fmt(input.unlockEmission12m * 0.5)}`] : []),
  ];

  const latestEvidence: { text: string; dir: "up" | "down" | "flat" }[] = [];
  if (growth >= 15) latestEvidence.push({ text: `Revenue growth ${Math.round(growth)}%`, dir: "up" });
  else if (growth <= 0) latestEvidence.push({ text: `Revenue growth ${Math.round(growth)}%`, dir: "down" });
  else latestEvidence.push({ text: `Revenue growth ${Math.round(growth)}%`, dir: "flat" });

  if (vae >= 30) latestEvidence.push({ text: `VAE ${Math.round(vae)}%`, dir: "up" });
  else latestEvidence.push({ text: `VAE ${Math.round(vae)}%`, dir: "down" });

  if (r < 60) latestEvidence.push({ text: `Risk ${Math.round(r)}`, dir: "up" });
  else if (r > 75) latestEvidence.push({ text: `Risk ${Math.round(r)}`, dir: "down" });
  else latestEvidence.push({ text: `Risk ${Math.round(r)}`, dir: "flat" });

  if (input.marketCap && input.unlockEmission12m) {
    const unlockPct = (input.unlockEmission12m / input.marketCap) * 100;
    latestEvidence.push({
      text: `${Math.round(unlockPct)}% unlock / 12m`,
      dir: unlockPct > 20 ? "down" : "flat",
    });
  }

  // intact % derived from evidence
  const up = latestEvidence.filter((e) => e.dir === "up").length;
  const down = latestEvidence.filter((e) => e.dir === "down").length;
  const intactPct = Math.max(0, Math.min(100, 100 + up * 6 - down * 12));

  return {
    title: s.title,
    whyWorks: s.why,
    mustStayTrue,
    whatBreaks: s.breaks,
    latestEvidence,
    intactPct,
  };
}

function fmt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}
