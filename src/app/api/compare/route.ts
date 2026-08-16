// POST /api/compare — compare 2-4 projects side by side.
import { NextResponse } from "next/server";
import { collectUniverse } from "@/lib/datasources/registry";
import {
  benchmarkUniverse,
  buildCapitalFlowProfile,
  buildTokenomicsSchedule,
  rankUniverse,
  scoreProject,
} from "@/lib/engine";
import { generateDefaultThesis } from "@/lib/engine/thesis-seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { symbols } = await req.json();
    if (!Array.isArray(symbols) || symbols.length < 2 || symbols.length > 4) {
      return NextResponse.json({ error: "Provide 2-4 symbols" }, { status: 400 });
    }
    // Validate all elements are non-empty strings.
    if (!symbols.every((s: any) => typeof s === "string" && s.trim().length > 0)) {
      return NextResponse.json({ error: "All symbols must be non-empty strings" }, { status: 400 });
    }
    // Deduplicate (case-insensitive).
    const uniqueSymbols = [...new Set(symbols.map((s: string) => s.toUpperCase()))];
    if (uniqueSymbols.length < 2) {
      return NextResponse.json({ error: "Provide at least 2 unique symbols" }, { status: 400 });
    }

    const { inputs } = await collectUniverse({ useLive: true });
    const med = median(inputs.map((i) => (i as any).priceChange90d ?? 0)) || 0;
    const M = 1 + med / 400;
    const ranked = rankUniverse(inputs, M);
    const percentiles = benchmarkUniverse(ranked);

    const projects = uniqueSymbols.map((sym: string) => {
      const input = inputs.find((i) => i.symbol === sym.toUpperCase());
      if (!input) return null;
      const scores = scoreProject(input, M);
      const tokenomics = buildTokenomicsSchedule(input);
      const capitalFlow = buildCapitalFlowProfile(input);
      const thesis = generateDefaultThesis(input, scores);
      const peer = percentiles.get(input.symbol);
      const rankedRow = ranked.find((r) => r.symbol === input.symbol);
      return {
        symbol: input.symbol,
        name: input.name,
        sector: input.sector,
        logoUrl: input.logoUrl,
        priceUsd: input.priceUsd,
        marketCap: input.marketCap,
        fdv: input.fdv,
        scores: {
          pq: scores.components.pq ?? 0,
          tq: scores.components.tq ?? 0,
          va: scores.components.va ?? 0,
          v: scores.components.v ?? 0,
          r: scores.components.r ?? 0,
          iaRaw: scores.iaRaw ?? 0,
          confidence: scores.confidence ?? 0,
          iaEffective: scores.iaEffective ?? 0,
          iaFinal: scores.iaFinal ?? 0,
        },
        vae: scores.vae.vae ?? 0,
        alpha: scores.vae.alpha ?? 0,
        delta: scores.vae.delta ?? 0,
        decision: scores.decision,
        gatePassed: scores.gatePassed,
        ranks: {
          fundamental: rankedRow?.fundamentalRank ?? 0,
          confidence: rankedRow?.confidenceRank ?? 0,
          effective: rankedRow?.effectiveRank ?? 0,
          market: rankedRow?.marketRank ?? 0,
        },
        tokenomics: {
          verdict: tokenomics.verdict.status,
          score: tokenomics.verdict.score,
          dilution12mPct: tokenomics.dilution12mPct,
          absorptionRatio: tokenomics.absorptionRatio,
        },
        capitalFlow: {
          composite: capitalFlow.compositeScore,
          status: capitalFlow.verdict.status,
        },
        thesis: {
          status: thesis.intactPct >= 70 ? "intact" : thesis.intactPct >= 35 ? "weakened" : "broken",
          intactPct: thesis.intactPct,
        },
        peer: peer
          ? {
              revenueGrowth: peer.revenueGrowth,
              vae: peer.vae,
              risk: peer.risk,
            }
          : null,
      };
    }).filter(Boolean);

    if (projects.length < 2) {
      return NextResponse.json({ error: "Need at least 2 valid symbols" }, { status: 400 });
    }

    // Compute winners per metric.
    const metrics = ["pq", "tq", "va", "v", "r", "iaRaw", "confidence", "iaEffective", "iaFinal"] as const;
    const winners: Record<string, string> = {};
    for (const m of metrics) {
      let best = projects[0];
      for (const p of projects) {
        // For R (risk), lower is better.
        if (m === "r") {
          if ((p as any).scores[m] < (best as any).scores[m]) best = p;
        } else {
          if ((p as any).scores[m] > (best as any).scores[m]) best = p;
        }
      }
      winners[m] = best.symbol;
    }

    return NextResponse.json({ projects, winners, count: projects.length });
  } catch (e: any) {
    console.error("[compare] error:", e);
    return NextResponse.json({ error: e?.message ?? "compare failed" }, { status: 500 });
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
