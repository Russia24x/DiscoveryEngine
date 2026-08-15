// GET /api/projects — list all ranked projects (from latest scan snapshot).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sort = url.searchParams.get("sort") ?? "market"; // fundamental | confidence | effective | market
    const onlyPassed = url.searchParams.get("onlyPassed") === "1";
    const showRejected = url.searchParams.get("showRejected") === "1";
    const minConf = parseFloat(url.searchParams.get("minConfidence") ?? "0");
    const q = url.searchParams.get("q")?.toLowerCase();

    let orderBy: any = { iaFinal: "desc" };
    if (sort === "fundamental") orderBy = { iaRaw: "desc" };
    else if (sort === "confidence") orderBy = { confidence: "desc" };
    else if (sort === "effective") orderBy = { iaEffective: "desc" };

    const where: any = {};
    if (onlyPassed) where.gatePassed = true;
    if (!showRejected) where.decision = { not: "REJECT" };
    if (minConf > 0) where.confidence = { gte: minConf };
    if (q) {
      where.OR = [
        { symbol: { contains: q } },
        { name: { contains: q } },
        { sector: { contains: q } },
      ];
    }

    const projects = await db.project.findMany({ where, orderBy, take: 200 });
    return NextResponse.json({ projects, count: projects.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
