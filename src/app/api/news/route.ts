// /api/news — manage news & social feeds (RSS / Telegram / X ready).
// Mirror mode: feeds are managed in DB, but items are fetched live from source.
// No items are persisted — we only display content from the original source.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classifySentiment, fetchRss } from "@/lib/datasources/rss";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sources = await db.newsSource.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Fetch items live from each enabled RSS source (mirror mode — no DB storage).
    const sourcesWithItems = await Promise.all(
      sources.map(async (src) => {
        if (!src.enabled || src.type !== "rss") {
          return { ...src, items: [] };
        }
        try {
          const items = await fetchRss(src.url, 5000);
          return {
            ...src,
            items: items.slice(0, 10).map((it) => ({
              title: it.title,
              url: it.url,
              summary: it.summary,
              publishedAt: it.publishedAt.toISOString(),
              sentiment: classifySentiment(`${it.title} ${it.summary ?? ""}`),
            })),
          };
        } catch {
          return { ...src, items: [], error: "fetch failed" };
        }
      })
    );

    return NextResponse.json({ sources: sourcesWithItems });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { type, url, label } = await req.json();
    if (!type || !url) return NextResponse.json({ error: "type and url required" }, { status: 400 });
    const allowed = ["rss", "telegram", "x"];
    if (!allowed.includes(type)) return NextResponse.json({ error: "bad type" }, { status: 400 });

    // Validate URL to prevent SSRF — only allow http/https to public hosts.
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json({ error: "Only http/https URLs allowed" }, { status: 400 });
      }
      // Block localhost, internal IPs, and metadata endpoints.
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" ||
          host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.16.") ||
          host === "169.254.169.254" || host === "[::1]") {
        return NextResponse.json({ error: "Internal hosts not allowed" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const created = await db.newsSource.create({
      data: { type, url, label: label ?? null, enabled: true },
    });
    return NextResponse.json({ ok: true, source: created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    try {
      await db.newsSource.delete({ where: { id } });
    } catch (e: any) {
      // Prisma P2025 = record not found
      if (e?.code === "P2025") {
        return NextResponse.json({ error: "Feed not found" }, { status: 404 });
      }
      throw e;
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
