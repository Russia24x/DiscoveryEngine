// Gate checks — mechanism-aware.
// LOCKED per FRAMEWORK.md §4.
import type { GateResult, ProjectInput } from "./types";
import { computeSupplyMetrics, computeVaeChain } from "./vae";

export function evaluateGates(input: ProjectInput): {
  gates: GateResult[];
  passed: boolean;
  reasons: string[];
} {
  const vae = computeVaeChain(input);
  const supply = computeSupplyMetrics(input);

  const gates: GateResult[] = [
    {
      id: "vae",
      label: "VAE < 10",
      passed: vae.vae == null ? false : vae.vae >= 10,
      conditional: false,
      value: vae.vae ?? 0,
      threshold: 10,
      description: "Value Accrual Efficiency too low",
    },
    {
      id: "delta",
      label: "δ < 5",
      passed: vae.delta == null ? false : vae.delta >= 5,
      conditional: false,
      value: vae.delta ?? 0,
      threshold: 5,
      description: "Distribution Rate too low",
    },
    {
      id: "risk",
      label: "R > 90",
      passed: input.revenueConcentration == null ? true : compositeRisk(input) <= 90,
      conditional: false,
      value: compositeRisk(input),
      threshold: 90,
      description: "Risk score too high",
    },
    {
      id: "sar",
      label: "SAR < 0.1",
      // Conditional: only a gate when buyback/burn is part of the thesis.
      passed: input.buybackThesis
        ? (supply.sar == null ? false : supply.sar >= 0.1)
        : true,
      conditional: input.buybackThesis ?? false,
      value: supply.sar ?? 0,
      threshold: 0.1,
      description: "Supply absorption too low (conditional on buyback thesis)",
    },
  ];

  // A project passes only if every gate passes (conditional gates that don't apply are auto-pass).
  const failed = gates.filter((g) => !g.passed);
  return {
    gates,
    passed: failed.length === 0,
    reasons: failed.map((g) => g.label),
  };
}

// Composite risk for the gate (mirrors R formula in r.ts but computed inline to avoid cycle).
function compositeRisk(input: ProjectInput): number {
  const r =
    0.25 * (input.revenueConcentration ?? 50) +
    0.2 * (input.insiderConcentration ?? 50) +
    0.2 * (input.regulatory ?? 50) +
    0.15 * (input.smartContract ?? 50) +
    0.1 * (input.marketLiquidity ?? 50) +
    0.1 * (input.dependency ?? 50);
  return r;
}
