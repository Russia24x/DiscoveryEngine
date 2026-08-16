// GET /api/heatmap — sector performance matrix for market heatmap.
import { NextResponse } from "next/server";
import { collectUniverse } from "@/lib/datasources/registry";
import { rankUniverse, scoreProject } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { inputs } = await collectUniverse({ useLive: true });
    const med = median(inputs.map((i) => (i as any).priceChange90d ?? 0)) || 0;
    const M = 1 + med / 400;
    const ranked = rankUniverse(inputs, M);

    // Group by sector.
    const sectorMap = new Map<string, any[]>();
    for (const input of inputs) {
      const sector = input.sector ?? "Other";
      if (!sectorMap.has(sector)) sectorMap.set(sector, []);
      sectorMap.get(sector)!.push(input);
    }

    const sectors = Array.from(sectorMap.entries()).map(([sector, items]) => {
      const scored = items.map((input) => {
        const scores = scoreProject(input, M);
        const rankedRow = ranked.find((r) => r.symbol === input.symbol);
        return {
          symbol: input.symbol,
          name: input.name,
          sector: input.sector,
          logoUrl: input.logoUrl,
          priceUsd: input.priceUsd,
          marketCap: input.marketCap,
          iaRaw: scores.iaRaw ?? 0,
          iaFinal: scores.iaFinal ?? 0,
          confidence: scores.confidence ?? 0,
          decision: scores.decision,
          gatePassed: scores.gatePassed,
          vae: scores.vae.vae ?? 0,
          r: scores.components.r ?? 0,
          marketRank: rankedRow?.marketRank ?? 0,
          priceChange90d: (input as any).priceChange90d ?? 0,
        };
      });
      const avgIaFinal = scored.reduce((a, p) => a + p.iaFinal, 0) / scored.length;
      const avgConfidence = scored.reduce((a, p) => a + p.confidence, 0) / scored.length;
      const totalMcap = scored.reduce((a, p) => a + (p.marketCap ?? 0), 0);
      const passed = scored.filter((p) => p.gatePassed).length;
      const pass = scored.filter((p) => p.decision === "PASS").length;
      const investigate = scored.filter((p) => p.decision === "INVESTIGATE").length;
      const reject = scored.filter((p) => p.decision === "REJECT").length;
      return {
        sector,
        count: scored.length,
        projects: scored.sort((a, b) => b.iaFinal - a.iaFinal),
        avgIaFinal,
        avgConfidence,
        totalMcap,
        passed,
        pass,
        investigate,
        reject,
      };
    });

    sectors.sort((a, b) => b.avgIaFinal - a.avgIaFinal);

    return NextResponse.json({ sectors, totalProjects: inputs.length });
  } catch (e: any) {
    console.error("[heatmap] error:", e);
    return NextResponse.json({ error: e?.message ?? "heatmap failed" }, { status: 500 });
  }
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
