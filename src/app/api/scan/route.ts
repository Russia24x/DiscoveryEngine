// POST /api/scan — run a market-wide scan, return ranked universe.
import { NextResponse } from "next/server";
import { collectUniverse } from "@/lib/datasources/registry";
import { benchmarkUniverse, computeUniverseRegime, rankUniverse, scoreProject } from "@/lib/engine";
import { generateDefaultThesis } from "@/lib/engine/thesis-seed";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Coerce useLive to boolean — "false" (string) is truthy, so explicit check needed.
    const useLive = body?.useLive === false || body?.useLive === "false" ? false : true;

    // Collect universe (live or bundled fallback). Skip cache for explicit scans
    // so the user always gets fresh data when they click "Run Scan".
    const { inputs, live, sourcesUsed } = await collectUniverse({ useLive, skipCache: true });

    // Market regime (M). In production this would come from BTC/mcap aggregate data;
    // here we derive a light signal from the universe's median 90d price change.
    const med = median(inputs.map((i) => (i as any).priceChange90d ?? 0)) || 0;
    const M = computeUniverseRegime({ btcTrend90d: med, totalMcapTrend90d: med, volatility: 40 });

    const ranked = rankUniverse(inputs, M);
    const percentiles = benchmarkUniverse(ranked);

    // Enrich with thesis + percentiles, and build full detail map.
    const enriched = ranked.map((p) => {
      const input = inputs.find((i) => i.symbol === p.symbol)!;
      const thesis = generateDefaultThesis(input, p);
      const peer = percentiles.get(p.symbol);
      return {
        ...p,
        thesis,
        peer,
        relativeAttractiveness: peer
          ? Math.round(
              ([
                peer.revenueGrowth,
                peer.marketPosition,
                peer.vae,
                peer.unlockRisk,
                peer.risk == null ? null : 100 - peer.risk,
              ]
                .filter((v): v is number => v != null)
                .reduce((a, b) => a + b, 0) /
                [peer.revenueGrowth, peer.marketPosition, peer.vae, peer.unlockRisk, peer.risk].filter(
                  (v) => v != null
                ).length)
            )
          : null,
      };
    });

    // Persist scan record + projects snapshot (fire-and-forget, non-blocking).
    // This keeps the route fast and avoids holding the request open for many DB writes.
    const passed = enriched.filter((p) => p.gatePassed).length;
    const rejected = enriched.filter((p) => p.decision === "REJECT").length;
    const investigate = enriched.filter((p) => p.decision === "INVESTIGATE").length;

    // Fire-and-forget persistence — do NOT await.
    void persistScan(enriched, inputs, passed, rejected, investigate).catch((dbErr) =>
      console.error("[scan] db persist failed (non-fatal):", dbErr)
    );

    return NextResponse.json({
      scanId: null,
      live,
      sourcesUsed,
      marketRegime: M,
      universeSize: enriched.length,
      passed,
      rejected,
      investigate,
      results: enriched,
    });
  } catch (e: any) {
    console.error("[scan] error:", e);
    return NextResponse.json({ error: e?.message ?? "scan failed" }, { status: 500 });
  }
}

// Background persistence helper.
async function persistScan(
  enriched: any[],
  inputs: any[],
  passed: number,
  rejected: number,
  investigate: number
) {
  const scan = await db.scanRecord.create({
    data: {
      status: "done",
      universeSize: enriched.length,
      passedCount: passed,
      rejectedCount: rejected,
      investigateCount: investigate,
      finishedAt: new Date(),
      resultsJson: JSON.stringify(
        enriched.slice(0, 50).map((p) => ({
          s: p.symbol,
          n: p.name,
          ir: p.iaRaw,
          c: p.confidence,
          ie: p.iaEffective,
          m: p.marketRegime,
          if: p.iaFinal,
          d: p.decision,
          fr: p.fundamentalRank,
          mr: p.marketRank,
        }))
      ),
      scores: {
        create: enriched.map((p) => ({
          symbol: p.symbol,
          pq: p.components.pq ?? null,
          tq: p.components.tq ?? null,
          va: p.components.va ?? null,
          v: p.components.v ?? null,
          r: p.components.r ?? null,
          iaRaw: p.iaRaw ?? null,
          confidence: p.confidence ?? null,
          iaEffective: p.iaEffective ?? null,
          iaFinal: p.iaFinal ?? null,
          decision: p.decision,
          marketRank: p.marketRank,
        })),
      },
    },
  });

  // Batch all upserts in a single transaction for better performance.
  // Uses Promise.all with parallel upserts instead of sequential awaits.
  await db.$transaction(
    enriched.map((p) => {
      const input = inputs.find((i) => i.symbol === p.symbol)!;
      const updateData = {
        name: p.name,
        sector: p.sector,
        chain: p.chain,
        logoUrl: p.logoUrl,
        pq: p.components.pq ?? null,
        tq: p.components.tq ?? null,
        va: p.components.va ?? null,
        v: p.components.v ?? null,
        r: p.components.r ?? null,
        iaRaw: p.iaRaw ?? null,
        confidence: p.confidence ?? null,
        iaEffective: p.iaEffective ?? null,
        marketRegime: p.marketRegime ?? null,
        iaFinal: p.iaFinal ?? null,
        fundamentalRank: p.fundamentalRank,
        confidenceRank: p.confidenceRank,
        effectiveRank: p.effectiveRank,
        marketRank: p.marketRank,
        gatePassed: p.gatePassed,
        gateReason: p.gateReasons.join(", ") || null,
        decision: p.decision,
        gea: input.gea ?? null,
        pr: input.pr ?? null,
        pc: input.pc ?? null,
        tc: input.tc ?? null,
        alpha: p.vae.alpha ?? null,
        delta: p.vae.delta ?? null,
        vae: p.vae.vae ?? null,
        sar: p.supply.sar ?? null,
        nsp: p.supply.nsp ?? null,
        fdr: p.supply.fdr ?? null,
        priceUsd: input.priceUsd ?? null,
        marketCap: input.marketCap ?? null,
        fdv: input.fdv ?? null,
        tvl: input.pr ?? null,
        revenueAnnual: input.pr ?? null,
        floatSupply: input.floatSupply ?? null,
        totalSupply: input.totalSupply ?? null,
        thesisStatus: p.thesis.status,
        thesisPct: p.thesis.intactPct,
      };
      return db.project.upsert({
        where: { symbol: p.symbol },
        create: {
          symbol: p.symbol,
          slug: p.name.toLowerCase().replace(/\s+/g, "-"),
          ...updateData,
        },
        update: updateData,
      });
    })
  );
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
