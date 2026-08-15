"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionBadge } from "./primitives";
import { useWatchlist } from "@/lib/watchlist-store";
import { useApp } from "@/lib/store";
import { fmtUsd } from "@/lib/format";
import { Star, Trash2, Bell, BellOff, ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatchlistEntry {
  symbol: string;
  name: string;
  sector?: string;
  chain?: string;
  logoUrl?: string;
  priceUsd?: number;
  marketCap?: number;
  iaFinal?: number;
  decision?: string;
  thesisStatus?: string;
}

export function WatchlistView() {
  const { t } = useI18n();
  const { items, load, remove, openProject } = useWatchlistForDisplay();

  useEffect(() => {
    load();
  }, [load]);

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">No items in watchlist yet</p>
            <p className="text-xs text-muted-foreground mt-1">Star a project from the scanner or detail page to add it here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-primary fill-primary/30" />
            Watchlist
            <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin">
          {items.map((item) => (
            <WatchlistRow key={item.symbol} item={item} onOpen={() => openProject(item.symbol)} onRemove={() => remove(item.symbol)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WatchlistRow({
  item,
  onOpen,
  onRemove,
}: {
  item: WatchlistEntry & { addedAt?: number };
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors group">
      <button onClick={onOpen} className="flex items-center gap-2.5 flex-1 min-w-0 text-start">
        {item.logoUrl ? (
          <img src={item.logoUrl} alt="" className="h-7 w-7 rounded-full shrink-0" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {item.symbol.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{item.symbol}</span>
            {item.sector && <Badge variant="outline" className="text-[9px]">{item.sector}</Badge>}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="truncate">{item.name}</span>
            {item.priceUsd && <span className="font-mono num shrink-0">{fmtUsd(item.priceUsd)}</span>}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {item.iaFinal != null && (
          <div className="text-end">
            <div className="font-mono text-xs font-bold num text-primary">{item.iaFinal.toFixed(1)}</div>
            <div className="text-[8px] text-muted-foreground">IA</div>
          </div>
        )}
        {item.decision && <DecisionBadge decision={item.decision as any} size="sm" />}
        {item.thesisStatus && (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px]",
              item.thesisStatus === "intact" && "border-pass/30 text-pass",
              item.thesisStatus === "weakened" && "border-investigate/30 text-investigate",
              item.thesisStatus === "broken" && "border-reject/30 text-reject"
            )}
          >
            {item.thesisStatus}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-reject" />
        </Button>
      </div>
    </div>
  );
}

// Hook that combines watchlist store + live data from /api/projects
function useWatchlistForDisplay() {
  const { items, load, remove } = useWatchlist();
  const { openProject } = useApp();
  const [enriched, setEnriched] = useState<WatchlistEntry[] | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    // Fetch latest project data to enrich watchlist items
    fetch("/api/projects?showRejected=1")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const projMap = new Map((j.projects ?? []).map((p: any) => [p.symbol, p]));
        const e = items.map((wi) => ({
          symbol: wi.symbol,
          name: wi.name,
          sector: wi.sector,
          chain: undefined,
          logoUrl: wi.logoUrl,
          priceUsd: projMap.get(wi.symbol)?.priceUsd,
          marketCap: projMap.get(wi.symbol)?.marketCap,
          iaFinal: projMap.get(wi.symbol)?.iaFinal,
          decision: projMap.get(wi.symbol)?.decision,
          thesisStatus: projMap.get(wi.symbol)?.thesisStatus,
          addedAt: wi.addedAt,
        }));
        setEnriched(e);
      })
      .catch(() => {
        if (!cancelled) setEnriched(items.map((wi) => ({ ...wi })));
      });
    return () => {
      cancelled = true;
    };
  }, [items]);

  // If enriched hasn't loaded (or items empty), fall back to raw watchlist items.
  const display = enriched ?? items.map((wi) => ({
    symbol: wi.symbol,
    name: wi.name,
    sector: wi.sector,
    logoUrl: wi.logoUrl,
    addedAt: wi.addedAt,
  }));
  return { items: display, load, remove, openProject };
}
