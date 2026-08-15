// Thesis Engine
// LOCKED per FRAMEWORK.md §12.
import type { ThesisResult, ThesisStatus } from "./types";

export function evaluateThesis(input: {
  title: string;
  whyWorks: string[];
  mustStayTrue: string[];
  whatBreaks: string[];
  latestEvidence: { text: string; dir: "up" | "down" | "flat" }[];
  intactPct: number;
}): ThesisResult {
  let status: ThesisStatus;
  if (input.intactPct >= 70) status = "intact";
  else if (input.intactPct >= 35) status = "weakened";
  else status = "broken";
  return { ...input, status };
}

// Derive thesis intactness from evidence direction counts.
// Each "up" supports, each "down" weakens, "flat" neutral.
export function thesisIntactFromEvidence(
  evidence: { dir: "up" | "down" | "flat" }[],
  baseline = 100
): number {
  if (evidence.length === 0) return baseline;
  const up = evidence.filter((e) => e.dir === "up").length;
  const down = evidence.filter((e) => e.dir === "down").length;
  const net = up - down;
  // each down evidence costs ~12 points, each up recovers ~6
  const delta = up * 6 - down * 12;
  return Math.max(0, Math.min(100, baseline + delta));
}
