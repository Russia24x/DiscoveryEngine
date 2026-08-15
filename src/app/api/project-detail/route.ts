// GET /api/project-detail?symbol=X — full project deep-dive.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collectUniverse } from "@/lib/datasources/registry";
import { benchmarkUniverse, rankUniverse, scoreProject } from "@/lib/engine";
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

    // Gather any persisted evidence/risks.
    const persistedProject = await db.project.findUnique({
      where: { symbol },
      include: { evidences: true, risks: true },
    });

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
      evidences: persistedProject?.evidences ?? [],
      risks: persistedProject?.risks ?? [],
      dbSnapshot: dbProject,
    });
  } catch (e: any) {
    console.error("[project-detail] error:", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
