"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Rss, Send, Twitter, Trash2, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

const TYPE_ICON: Record<string, any> = { rss: Rss, telegram: Send, x: Twitter };

export function NewsView() {
  const { t } = useI18n();
  const [sources, setSources] = useState<any[] | null>(null);
  const [type, setType] = useState("rss");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const r = await fetch("/api/news");
    const j = await r.json();
    setSources(j.sources);
  }
  useEffect(() => {
    let cancelled = false;
    fetch("/api/news")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setSources(j.sources);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function addFeed() {
    if (!url) return;
    await fetch("/api/news", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, url, label }),
    });
    setUrl("");
    setLabel("");
    toast.success("Feed added");
    load();
  }
  async function removeFeed(id: string) {
    await fetch(`/api/news?id=${id}`, { method: "DELETE" });
    load();
  }
  async function syncFeeds() {
    setSyncing(true);
    try {
      const r = await fetch("/api/news/sync", { method: "POST" });
      const j = await r.json();
      if (j.ok) {
        toast.success(`Synced ${j.totalFetched} items from ${j.sources.length} feeds`);
      } else {
        toast.error(j.error ?? "Sync failed");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
      load();
    }
  }
  async function addDefaultFeeds() {
    const defaults = [
      { type: "rss", url: "https://cointelegraph.com/rss", label: "Cointelegraph" },
      { type: "rss", url: "https://bitcoinist.com/feed/", label: "Bitcoinist" },
      { type: "rss", url: "https://news.bitcoin.com/feed/", label: "Bitcoin.com News" },
      { type: "rss", url: "https://www.theblock.co/rss.xml", label: "The Block" },
    ];
    for (const d of defaults) {
      await fetch("/api/news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(d),
      });
    }
    toast.success("Default feeds added");
    load();
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            {t.news.title}
          </h1>
          <p className="text-xs text-muted-foreground">{t.news.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addDefaultFeeds} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Default feeds
          </Button>
          <Button size="sm" onClick={syncFeeds} disabled={syncing} className="gap-1.5 text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync feeds"}
          </Button>
        </div>
      </div>

      {/* Add feed */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.news.feedType}:</span>
            {(["rss", "telegram", "x"] as const).map((k) => {
              const Icon = TYPE_ICON[k];
              return (
                <Button
                  key={k}
                  size="sm"
                  variant={type === k ? "default" : "outline"}
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setType(k)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {(t.news as any)[k]}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.news.feedUrl}
              className="text-sm h-9"
            />
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="text-sm h-9 sm:max-w-[180px]"
            />
            <Button onClick={addFeed} disabled={!url} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t.news.addFeed}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!sources ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : sources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t.news.noFeeds}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((src) => {
            const Icon = TYPE_ICON[src.type] ?? Rss;
            return (
              <Card key={src.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      {src.label || src.url}
                      <Badge variant="outline" className="text-[10px]">{(t.news as any)[src.type]}</Badge>
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFeed(src.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {src.items && src.items.length > 0 ? (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
                      {src.items.map((it: any) => (
                        <div key={it.id} className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/40 text-xs">
                          {it.sentiment && (
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                                it.sentiment === "positive" ? "bg-pass" : it.sentiment === "negative" ? "bg-reject" : "bg-muted-foreground"
                              )}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium leading-tight">{it.title}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>{timeAgo(it.publishedAt)}</span>
                              {it.thesisImpact && <span className="text-investigate">→ {it.thesisImpact}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">{t.news.latest} — —</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
