// POST /api/news/sync — fetch + parse all enabled RSS feeds, persist items.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classifySentiment, fetchRss } from "@/lib/datasources/rss";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sources = await db.newsSource.findMany({ where: { enabled: true, type: "rss" } });
    let totalFetched = 0;
    const perSource: Array<{ id: string; label: string; count: number; error?: string }> = [];

    for (const src of sources) {
      try {
        const items = await fetchRss(src.url);
        // Clear old items for this source, then insert fresh ones.
        await db.newsItem.deleteMany({ where: { sourceId: src.id } });
        for (const it of items) {
          await db.newsItem.create({
            data: {
              sourceId: src.id,
              title: it.title,
              url: it.url,
              summary: it.summary,
              publishedAt: it.publishedAt,
              sentiment: classifySentiment(`${it.title} ${it.summary ?? ""}`),
            },
          });
        }
        totalFetched += items.length;
        perSource.push({ id: src.id, label: src.label ?? src.url, count: items.length });
      } catch (e: any) {
        perSource.push({ id: src.id, label: src.label ?? src.url, count: 0, error: e?.message });
      }
    }

    return NextResponse.json({ ok: true, totalFetched, sources: perSource });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
