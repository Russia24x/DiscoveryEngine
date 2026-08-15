// Real RSS feed fetcher — parses XML feeds into NewsItem-like records.
// Used by the /api/news/sync endpoint to actually fetch content.
import { fetchWithTimeout } from "./fetch-utils";

export interface FetchedNewsItem {
  title: string;
  url?: string;
  summary?: string;
  publishedAt: Date;
  sourceLabel?: string;
}

// Lightweight XML tag extractor (no external dep).
function tag(xml: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function firstTag(xml: string, names: string[]): string | null {
  for (const n of names) {
    const v = tag(xml, n);
    if (v) return v;
  }
  return null;
}

function stripTags(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function fetchRss(url: string, timeoutMs = 5000): Promise<FetchedNewsItem[]> {
  const res = await fetchWithTimeout(url, { headers: { accept: "application/xml, text/xml, */*" } }, timeoutMs);
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();

  // Split into <item> or <entry> blocks.
  const items = xml.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return items.slice(0, 20).map((block) => {
    const title = stripTags(firstTag(block, ["title"]) ?? "");
    const link = stripTags(firstTag(block, ["link", "guid"]) ?? "");
    const pub = stripTags(firstTag(block, ["pubDate", "published", "updated"]) ?? "");
    const desc = stripTags(firstTag(block, ["description", "summary", "content"]) ?? "");
    return {
      title: title || "Untitled",
      url: link || undefined,
      summary: desc.slice(0, 300) || undefined,
      publishedAt: pub ? safeDate(pub) : new Date(),
    };
  });
}

function safeDate(s: string): Date {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Sentiment heuristic — keyword-based, good enough for MVP.
export function classifySentiment(text: string): "positive" | "neutral" | "negative" {
  const t = text.toLowerCase();
  const pos = ["surge", "rally", "growth", "record", "breakout", "adoption", "partnership", "upgrade", "bullish", "gain", "outperform", "beat"];
  const neg = ["crash", "plunge", "hack", "exploit", "rug", "dump", "bearish", "loss", "decline", "risk", "warning", "sell-off", "liquidat", "fud", "scam"];
  const p = pos.filter((k) => t.includes(k)).length;
  const n = neg.filter((k) => t.includes(k)).length;
  if (p > n) return "positive";
  if (n > p) return "negative";
  return "neutral";
}
