// /api/news — manage news & social feeds (RSS / Telegram / X ready).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sources = await db.newsSource.findMany({
    include: { items: { orderBy: { publishedAt: "desc" }, take: 10 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ sources });
}

export async function POST(req: Request) {
  try {
    const { type, url, label } = await req.json();
    if (!type || !url) return NextResponse.json({ error: "type and url required" }, { status: 400 });
    const allowed = ["rss", "telegram", "x"];
    if (!allowed.includes(type)) return NextResponse.json({ error: "bad type" }, { status: 400 });
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
    await db.newsSource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
