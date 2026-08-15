// GET /api/history?symbol=X — returns historical score records for a project.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
    // Clamp limit to 1-100 to prevent unbounded queries.
    const rawLimit = parseInt(url.searchParams.get("limit") ?? "20");
    const limit = isNaN(rawLimit) ? 20 : Math.max(1, Math.min(100, rawLimit));

    if (!symbol) {
      // Return all recent scans summary.
      const scans = await db.scanRecord.findMany({
        orderBy: { startedAt: "desc" },
        take: limit,
        include: { _count: { select: { scores: true } } },
      });
      return NextResponse.json({ scans });
    }

    const scores = await db.historicalScore.findMany({
      where: { symbol },
      orderBy: { recordedAt: "asc" },
      take: limit,
      include: { scan: { select: { startedAt: true } } },
    });

    return NextResponse.json({
      symbol,
      count: scores.length,
      scores: scores.map((s) => ({
        pq: s.pq,
        tq: s.tq,
        va: s.va,
        v: s.v,
        r: s.r,
        iaRaw: s.iaRaw,
        confidence: s.confidence,
        iaEffective: s.iaEffective,
        iaFinal: s.iaFinal,
        decision: s.decision,
        marketRank: s.marketRank,
        recordedAt: s.recordedAt,
        scanStartedAt: s.scan.startedAt,
      })),
    });
  } catch (e: any) {
    console.error("[history] error:", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
