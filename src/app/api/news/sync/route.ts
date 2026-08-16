// POST /api/news/sync — fetch RSS feeds and return items directly (mirror mode).
// Does NOT persist to DB — items are fetched fresh each time and displayed as-is.
// The content belongs to the original source; we only display it.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classifySentiment, fetchRss } from "@/lib/datasources/rss";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sources = await db.newsSource.findMany({ where: { enabled: true, type: "rss" } });
    let totalFetched = 0;
    const perSource: Array<{ id: string; label: string; count: number; error?: string }> = [];
    const allItems: Array<{
      title: string;
      url?: string;
      summary?: string;
      publishedAt: string;
      sentiment?: string;
      sourceLabel?: string;
    }> = [];

    for (const src of sources) {
      try {
        const items = await fetchRss(src.url);
        // Mirror mode: return items directly without persisting to DB.
        const mapped = items.map((it) => ({
          title: it.title,
          url: it.url,
          summary: it.summary,
          publishedAt: it.publishedAt.toISOString(),
          sentiment: classifySentiment(`${it.title} ${it.summary ?? ""}`),
          sourceLabel: src.label ?? src.url,
        }));
        allItems.push(...mapped);
        totalFetched += items.length;
        perSource.push({ id: src.id, label: src.label ?? src.url, count: items.length });
      } catch (e: any) {
        perSource.push({ id: src.id, label: src.label ?? src.url, count: 0, error: e?.message });
      }
    }

    // Sort by date descending (newest first).
    allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json({ ok: true, totalFetched, sources: perSource, items: allItems });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
