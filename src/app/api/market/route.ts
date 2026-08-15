// GET /api/market — market regime + dashboard summary.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { iaFinal: "desc" },
      take: 50,
    });
    const recentScans = await db.scanRecord.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
    });

    const passed = projects.filter((p) => p.gatePassed).length;
    const investigate = projects.filter((p) => p.decision === "INVESTIGATE").length;
    const rejected = projects.filter((p) => p.decision === "REJECT").length;
    const avgConfidence =
      projects.length > 0
        ? projects.reduce((a, p) => a + (p.confidence ?? 0), 0) / projects.length
        : 0;

    const topFundamental = [...projects].sort((a, b) => (b.iaRaw ?? 0) - (a.iaRaw ?? 0)).slice(0, 5);
    const topActionable = [...projects].sort((a, b) => (b.iaFinal ?? 0) - (a.iaFinal ?? 0)).slice(0, 5);

    return NextResponse.json({
      universeSize: projects.length,
      passed,
      investigate,
      rejected,
      avgConfidence,
      topFundamental,
      topActionable,
      recentScans,
      hasData: projects.length > 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
