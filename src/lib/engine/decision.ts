// Explainable Decision Engine
// LOCKED per FRAMEWORK.md §11.
import type { Decision, DecisionExplanation, ProjectInput, Scores } from "./types";
import { evaluateGates } from "./gates";

export function decide(input: ProjectInput, scores: Omit<Scores, "decision" | "decisionExplanation">): {
  decision: Decision;
  explanation: DecisionExplanation;
} {
  const { gates, passed } = evaluateGates(input);
  const failedGates = gates.filter((g) => !g.passed);

  const forArr: string[] = [];
  const againstArr: string[] = [];
  const triggers: string[] = [];

  // Build explanation from component scores
  const pq = scores.components.pq ?? 0;
  const tq = scores.components.tq ?? 0;
  const va = scores.components.va ?? 0;
  const v = scores.components.v ?? 0;
  const r = scores.components.r ?? 0;
  const vae = scores.vae.vae ?? 0;
  const delta = scores.vae.delta ?? 0;

  // positives
  if ((input.revenueGrowth ?? 0) >= 20) forArr.push(`Revenue +${Math.round(input.revenueGrowth!)}% / 90d`);
  if (pq >= 70) forArr.push("Strong project fundamentals");
  if (tq >= 70) forArr.push("Healthy token structure");
  if (va >= 70) forArr.push("Solid value accrual");
  if (v >= 60) forArr.push("Reasonable valuation");
  if (vae >= 50) forArr.push(`VAE ${Math.round(vae)}% — value reaching tokenholders`);

  // negatives — guard against missing data being interpreted as weak values.
  // Only show "weak accrual" if VAE was actually computed (not null/undefined).
  if (r >= 70) againstArr.push("Elevated risk profile");
  if (r >= 80) againstArr.push(`Risk score ${Math.round(r)} — near gate`);
  if ((input.insiderConcentration ?? 0) >= 70) againstArr.push("Insider concentration = high");
  if ((input.revenueConcentration ?? 0) >= 70) againstArr.push("Revenue concentration = high");
  if (scores.supply.fdr != null && scores.supply.fdr >= 0.3)
    againstArr.push(`${Math.round(scores.supply.fdr * 100)}% float dilution risk (12m)`);
  if (scores.vae.vae != null && vae < 30) againstArr.push(`VAE only ${Math.round(vae)}% — weak accrual`);
  if (scores.vae.delta != null && delta < 15) againstArr.push(`δ ${Math.round(delta)}% — low distribution`);
  if ((input.unlockEmission12m ?? 0) > 0 && (input.marketCap ?? 0) > 0) {
    const unlockPct = (input.unlockEmission12m! / input.marketCap!) * 100;
    if (unlockPct >= 10) againstArr.push(`${Math.round(unlockPct)}% unlock next 12m`);
  }

  // triggers — what changes the decision
  if (failedGates.length > 0) {
    for (const g of failedGates) triggers.push(`${g.label} → fix accrual/supply`);
  }
  if (vae < 50) triggers.push("VAE drop below 30 → INVESTIGATE → REJECT");
  if (r >= 70) triggers.push("Risk breach above 90 → REJECT");
  if ((input.unlockEmission12m ?? 0) > 0)
    triggers.push("unlock acceleration → decision downgrade");
  if ((input.revenueGrowth ?? 0) > 0)
    triggers.push(`revenue < ${Math.round((input.revenueGrowth ?? 20) * 0.5)}% → reassess`);
  if (triggers.length === 0) triggers.push("sustained metrics → upgrade toward PASS");

  // Decision logic
  let decision: Decision;
  if (!passed) {
    decision = "REJECT";
  } else if (againstArr.length >= 2 || (scores.confidence ?? 0) < 0.8) {
    decision = "INVESTIGATE";
  } else if (forArr.length >= 3 && r < 70) {
    decision = "PASS";
  } else {
    decision = "INVESTIGATE";
  }

  return {
    decision,
    explanation: { for: forArr, against: againstArr, triggers },
  };
}
