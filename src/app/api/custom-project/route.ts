// POST /api/custom-project — analyze a custom project with manually entered data.
// Returns the full scoring result (PQ/TQ/VA/V/R/IA) + thesis + evidence graph.
import { NextResponse } from "next/server";
import {
  benchmarkUniverse,
  buildCatalystReport,
  buildCapitalFlowProfile,
  buildEvidenceGraph,
  buildTokenomicsSchedule,
  computeUniverseRegime,
  generateHistoricalScores,
  generatePriceSeries,
  rankUniverse,
  scoreProject,
} from "@/lib/engine";
import { collectUniverse } from "@/lib/datasources/registry";
import { generateDefaultThesis } from "@/lib/engine/thesis-seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      symbol,
      name,
      sector,
      chain,
      priceUsd,
      marketCap,
      fdv,
      totalSupply,
      floatSupply,
      pr, // protocol revenue (annual)
      pc, // protocol capture
      tc, // tokenholder capture
      buybackBurnAnnual,
      unlockEmission12m,
      revenueGrowth,
      marketPosition,
      tokenUtility,
      governanceQuality,
      insiderConcentration,
      smartContract,
      revenueConcentration,
      regulatory,
      marketLiquidity,
      dependency,
      vaeTrend,
      buybackActivity,
      revenueStability,
      revenueDiversification,
      userGrowth,
      tokenYield,
      incentiveGravity,
    } = body;

    if (!symbol || !name) {
      return NextResponse.json({ error: "symbol and name required" }, { status: 400 });
    }

    // Build the ProjectInput from manual data.
    const input = {
      symbol: symbol.toUpperCase(),
      name,
      sector,
      chain,
      priceUsd: num(priceUsd),
      marketCap: num(marketCap),
      fdv: num(fdv),
      totalSupply: num(totalSupply),
      floatSupply: num(floatSupply),
      pr: num(pr),
      pc: num(pc),
      tc: num(tc),
      buybackBurnAnnual: num(buybackBurnAnnual),
      unlockEmission12m: num(unlockEmission12m),
      revenueGrowth: num(revenueGrowth) ?? 0,
      marketPosition: num(marketPosition) ?? 50,
      tokenUtility: num(tokenUtility) ?? 50,
      governanceQuality: num(governanceQuality) ?? 50,
      insiderConcentration: num(insiderConcentration) ?? 50,
      smartContract: num(smartContract) ?? 40,
      revenueConcentration: num(revenueConcentration) ?? 50,
      regulatory: num(regulatory) ?? 45,
      marketLiquidity: num(marketLiquidity) ?? 50,
      dependency: num(dependency) ?? 45,
      vaeTrend: num(vaeTrend) ?? 50,
      buybackActivity: num(buybackActivity) ?? (num(buybackBurnAnnual) ? 60 : 30),
      revenueStability: num(revenueStability) ?? 55,
      revenueDiversification: num(revenueDiversification) ?? 50,
      userGrowth: num(userGrowth) ?? 50,
      tokenYield: num(tokenYield) ?? 35,
      incentiveGravity: num(incentiveGravity) ?? 50,
      buybackThesis: num(buybackBurnAnnual) > 0,
    };

    // Score with a neutral market regime.
    const M = computeUniverseRegime({ btcTrend90d: 0, totalMcapTrend90d: 0, volatility: 40 });
    const scores = scoreProject(input, M);
    const thesis = generateDefaultThesis(input, scores);
    const tokenomics = buildTokenomicsSchedule(input);
    const capitalFlow = buildCapitalFlowProfile(input);
    const catalyst = buildCatalystReport(input, scores, tokenomics);
    const evidence = buildEvidenceGraph(input, scores);
    const priceSeries = generatePriceSeries(input);

    // Rank against the bundle universe for peer percentiles.
    const { inputs: universeInputs } = await collectUniverse({ useLive: false });
    const allInputs = [...universeInputs, input];
    const ranked = rankUniverse(allInputs, M);
    const percentiles = benchmarkUniverse(ranked);
    const peer = percentiles.get(input.symbol);
    const rankedRow = ranked.find((r) => r.symbol === input.symbol);

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

    const separation = {
      projectQuality: scores.components.pq ?? 0,
      tokenQuality: scores.components.tq ?? 0,
      valuation: scores.components.v ?? 0,
      investmentAttractiveness: scores.iaFinal ?? scores.iaRaw ?? 0,
      verdict: separationVerdict(scores),
    };

    return NextResponse.json({
      ok: true,
      symbol: input.symbol,
      name: input.name,
      sector: input.sector,
      chain: input.chain,
      priceUsd: input.priceUsd,
      marketCap: input.marketCap,
      fdv: input.fdv,
      live: false,
      sourcesUsed: ["manual"],
      input: {
        pr: input.pr, pc: input.pc, tc: input.tc, gea: undefined,
        buybackBurnAnnual: input.buybackBurnAnnual, unlockEmission12m: input.unlockEmission12m,
        floatSupply: input.floatSupply, totalSupply: input.totalSupply,
        revenueGrowth: input.revenueGrowth, userGrowth: input.userGrowth,
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
      evidenceGraph: evidence,
      historicalSeries,
      separation,
      tokenomics,
      capitalFlow,
      catalystReport: catalyst,
      priceSeries,
    });
  } catch (e: any) {
    console.error("[custom-project] error:", e);
    return NextResponse.json({ error: e?.message ?? "custom-project failed" }, { status: 500 });
  }
}

function num(v: any): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? undefined : n;
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
