// GET /api/project-detail?symbol=X — full project deep-dive.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collectUniverse } from "@/lib/datasources/registry";
import { benchmarkUniverse, buildCatalystReport, buildCapitalFlowProfile, buildEvidenceGraph, buildTokenomicsSchedule, generateHistoricalScores, rankUniverse, scoreProject } from "@/lib/engine";
import { generateDefaultThesis } from "@/lib/engine/thesis-seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
    if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

    // 1) Try DB snapshot first.
    const dbProject = await db.project.findUnique({ where: { symbol } });

    // 2) Always compute live-ish scores from the universe so the detail is fresh.
    const { inputs, live, sourcesUsed } = await collectUniverse({ useLive: true });
    const input = inputs.find((i) => i.symbol === symbol);
    if (!input) {
      return NextResponse.json({ error: `symbol ${symbol} not in universe` }, { status: 404 });
    }

    const med = median(inputs.map((i) => (i as any).priceChange90d ?? 0)) || 0;
    const M = 1 + med / 400; // light regime
    const ranked = rankUniverse(inputs, M);
    const percentiles = benchmarkUniverse(ranked);
    const peer = percentiles.get(symbol) ?? null;

    const scores = scoreProject(input, M);
    const thesis = generateDefaultThesis(input, scores);
    const rankedRow = ranked.find((r) => r.symbol === symbol);

    // v1.1: Build the Evidence Graph (real claims with sources, freshness, grades, contradictions).
    const evidenceGraph = buildEvidenceGraph(input, scores);

    // v1.2: Historical score trends for recharts.
    const historical = generateHistoricalScores(input.symbol, {
      pq: scores.components.pq,
      tq: scores.components.tq,
      va: scores.components.va,
      v: scores.components.v,
      iaRaw: scores.iaRaw,
      iaEffective: scores.iaEffective,
      iaFinal: scores.iaFinal,
    });
    const labels = ["90d", "60d", "30d", "14d", "7d", "now"];
    const historicalSeries = [
      { key: "pq", label: "Project Quality", data: historical[0].points, labels },
      { key: "tq", label: "Token Quality", data: historical[1].points, labels },
      { key: "va", label: "Value Accrual", data: historical[2].points, labels },
      { key: "v", label: "Valuation", data: historical[3].points, labels },
      { key: "iaRaw", label: "IA Raw", data: historical[4].points, labels },
      { key: "iaEffective", label: "IA Effective", data: historical[5].points, labels },
      { key: "iaFinal", label: "IA Final", data: historical[6].points, labels },
    ];

    // v1.1: Separation scores — Project Quality vs Token Quality vs Valuation vs Investment Attractiveness.
    const separation = {
      projectQuality: scores.components.pq ?? 0,
      tokenQuality: scores.components.tq ?? 0,
      valuation: scores.components.v ?? 0,
      investmentAttractiveness: scores.iaFinal ?? scores.iaRaw ?? 0,
      // The FRAMEWORK insight: great project + bad token = bad investment.
      verdict: separationVerdict(scores),
    };

    // v1.3: Tokenomics schedule (12-month unlock + dilution projection).
    const tokenomics = buildTokenomicsSchedule(input);

    // v1.3: Capital flow / smart money profile.
    const capitalFlow = buildCapitalFlowProfile(input);

    // v1.4: Catalyst report + kill conditions.
    const catalystReport = buildCatalystReport(input, scores, tokenomics);

    return NextResponse.json({
      symbol,
      name: input.name,
      sector: input.sector,
      chain: input.chain,
      logoUrl: input.logoUrl,
      priceUsd: input.priceUsd,
      marketCap: input.marketCap,
      fdv: input.fdv,
      live,
      sourcesUsed,
      input: {
        pr: input.pr,
        pc: input.pc,
        tc: input.tc,
        gea: input.gea,
        buybackBurnAnnual: input.buybackBurnAnnual,
        unlockEmission12m: input.unlockEmission12m,
        floatSupply: input.floatSupply,
        totalSupply: input.totalSupply,
        revenueGrowth: input.revenueGrowth,
        userGrowth: input.userGrowth,
      },
      scores,
      ranks: {
        fundamentalRank: rankedRow?.fundamentalRank ?? null,
        confidenceRank: rankedRow?.confidenceRank ?? null,
        effectiveRank: rankedRow?.effectiveRank ?? null,
        marketRank: rankedRow?.marketRank ?? null,
      },
      peer,
      thesis,
      evidenceGraph,
      historicalSeries,
      separation,
      tokenomics,
      capitalFlow,
      catalystReport,
      evidences: [],
      risks: [],
      dbSnapshot: dbProject,
    });
  } catch (e: any) {
    console.error("[project-detail] error:", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

function separationVerdict(scores: any): string {
  const pq = scores.components.pq ?? 0;
  const tq = scores.components.tq ?? 0;
  const v = scores.components.v ?? 0;
  if (pq >= 65 && tq < 45) return "Strong project, weak token — value not accruing to holders";
  if (pq < 45 && tq >= 65) return "Strong token, weak project — sustainability risk";
  if (pq >= 65 && tq >= 65 && v < 45) return "Quality asset, overvalued — wait for better entry";
  if (pq >= 65 && tq >= 65 && v >= 55) return "Aligned — quality + value + reasonable price";
  if (pq < 45 && tq < 45) return "Weak across the board — high risk";
  return "Mixed signals — investigate further";
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
