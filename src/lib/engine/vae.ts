// Value Accrual Chain + Supply metrics
// LOCKED per FRAMEWORK.md §5 and §7.
import { clamp, pct, type ProjectInput, type SupplyMetrics, type VaeChain } from "./types";

export function computeVaeChain(input: ProjectInput): VaeChain {
  const { gea, pr, pc, tc } = input;
  const alpha = pr && pr > 0 && pc != null ? clamp((pc / pr) * 100, 0, 100) : null;
  const delta = pc && pc > 0 && tc != null ? clamp((tc / pc) * 100, 0, 100) : null;
  // VAE = α × δ = TC / PR (as percentage)
  const vae = pr && pr > 0 && tc != null ? clamp((tc / pr) * 100, 0, 100) : null;
  return {
    gea: gea ?? null,
    pr: pr ?? null,
    pc: pc ?? null,
    tc: tc ?? null,
    alpha,
    delta,
    vae,
  };
}

export function computeSupplyMetrics(input: ProjectInput): SupplyMetrics {
  const { buybackBurnAnnual, unlockEmission12m, floatSupply, priceUsd } = input;
  const denom = unlockEmission12m ?? 0; // USD
  const numer = buybackBurnAnnual ?? 0;  // USD
  const sar = denom > 0 ? numer / denom : null;
  const nsp = denom - numer;
  // FDR = (12m unlock in tokens) / (current float in tokens).
  // unlockEmission12m is in USD, so convert to tokens via priceUsd.
  const unlockTokens = priceUsd && priceUsd > 0 ? denom / priceUsd : (floatSupply && floatSupply > 0 ? denom : 0);
  const fdr = floatSupply && floatSupply > 0 ? unlockTokens / floatSupply : null;
  return {
    sar,
    nsp: nsp === 0 && denom === 0 ? null : nsp,
    fdr: fdr == null ? null : clamp(fdr, 0, 5), // cap display at 500%
  };
}

// Normalized 0-100 components used inside the weighted formulas.
export function normalizedComponents(input: ProjectInput, vae: VaeChain, supply: SupplyMetrics) {
  return {
    vae: vae.vae ?? 0, // already 0-100
    sar: supply.sar == null ? 0 : clamp(supply.sar * 100, 0, 100),
    fdrSafe: supply.fdr == null ? 100 : clamp(100 - supply.fdr * 100, 0, 100), // (1 - FDR_n)
    alpha: vae.alpha ?? 0,
    delta: vae.delta ?? 0,
  };
}

export { pct };
