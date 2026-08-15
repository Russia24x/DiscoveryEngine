// /api/datasources — manage pluggable data source adapters.
import { NextResponse } from "next/server";
import { ADAPTERS } from "@/lib/datasources/registry";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Merge static adapter definitions with persisted config (apiKey, enabled).
    const persisted = await db.dataSource.findMany();
    const persistedMap = new Map(persisted.map((p) => [p.key, p]));
    const list = ADAPTERS.map((a) => {
      const p = persistedMap.get(a.key);
      return {
        key: a.key,
        name: a.name,
        type: a.type,
        requiresKey: a.requiresKey,
        endpoint: a.endpoint,
        coverage: a.coverage,
        enabled: p?.enabled ?? a.type === "free",
        apiKeySet: p?.apiKey ? true : false,
        apiKeyMasked: p?.apiKey ? maskKey(p.apiKey) : null,
        lastSync: p?.lastSync ?? null,
      };
    });
    return NextResponse.json({ sources: list });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, apiKey, enabled } = body;
    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
    const adapter = ADAPTERS.find((a) => a.key === key);
    if (!adapter) return NextResponse.json({ error: "unknown source" }, { status: 404 });
    const data: any = {
      key,
      name: adapter.name,
      type: adapter.type,
      endpoint: adapter.endpoint,
      coverage: adapter.coverage,
    };
    if (apiKey !== undefined) data.apiKey = apiKey;
    if (enabled !== undefined) data.enabled = enabled;
    const upserted = await db.dataSource.upsert({
      where: { key },
      create: data,
      update: data,
    });
    return NextResponse.json({ ok: true, source: upserted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

function maskKey(k: string): string {
  if (k.length <= 8) return "•".repeat(k.length);
  return k.slice(0, 4) + "•".repeat(Math.max(4, k.length - 8)) + k.slice(-4);
}
