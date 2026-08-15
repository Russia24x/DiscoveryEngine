"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionBadge } from "../primitives";
import { cn } from "@/lib/utils";
import { fmtUsd } from "@/lib/format";
import { Grid3x3, ChevronDown, ChevronUp } from "lucide-react";

interface Sector {
  sector: string;
  count: number;
  projects: any[];
  avgIaFinal: number;
  avgConfidence: number;
  totalMcap: number;
  passed: number;
  pass: number;
  investigate: number;
  reject: number;
}

export function HeatmapView() {
  const { t } = useI18n();
  const { openProject } = useApp();
  const [sectors, setSectors] = useState<Sector[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/heatmap")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setSectors(j.sectors);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSector(sector: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-primary" />
          {t.heatmap.title}
        </h1>
        <p className="text-xs text-muted-foreground">{t.heatmap.subtitle}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !sectors || sectors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No data — run a scan first.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sectors.map((s) => {
            const isOpen = expanded.has(s.sector);
            // Color intensity based on avgIaFinal (0-30).
            const intensity = Math.min(1, s.avgIaFinal / 30);
            const heatColor =
              s.avgIaFinal >= 18
                ? "border-pass/30 bg-pass/5"
                : s.avgIaFinal >= 12
                ? "border-investigate/25 bg-investigate/5"
                : "border-reject/20 bg-reject/5";
            return (
              <Card key={s.sector} className={cn("overflow-hidden transition-all", heatColor)}>
                <button
                  onClick={() => toggleSector(s.sector)}
                  className="w-full text-start"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Heat indicator */}
                    <div
                      className="h-12 w-1.5 rounded-full shrink-0 transition-all"
                      style={{
                        backgroundColor:
                          s.avgIaFinal >= 18 ? "var(--pass)" : s.avgIaFinal >= 12 ? "var(--investigate)" : "var(--reject)",
                        opacity: 0.4 + intensity * 0.6,
                      }}
                    />
                    {/* Sector name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.sector}</span>
                        <Badge variant="outline" className="text-[10px]">{s.count}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span>MCap: <span className="font-mono num">{fmtUsd(s.totalMcap)}</span></span>
                        <span>Conf: <span className="font-mono num">{Math.round(s.avgConfidence * 100)}%</span></span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-pass" />{s.pass}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-investigate" />{s.investigate}
                        </span>
                        {s.reject > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-reject" />{s.reject}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Avg IA */}
                    <div className="text-end shrink-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.heatmap.avgIa}</div>
                      <div className={cn(
                        "font-mono text-xl font-bold num",
                        s.avgIaFinal >= 18 ? "text-pass" : s.avgIaFinal >= 12 ? "text-investigate" : "text-reject"
                      )}>
                        {s.avgIaFinal.toFixed(1)}
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </CardContent>
                </button>

                {/* Expanded projects */}
                {isOpen && (
                  <div className="border-t border-border">
                    <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {s.projects.map((p) => (
                        <button
                          key={p.symbol}
                          onClick={() => openProject(p.symbol)}
                          className="flex items-center gap-2.5 rounded-lg border border-border bg-card/50 p-2.5 hover:bg-muted/50 transition-colors text-start group"
                        >
                          {p.logoUrl ? (
                            <img src={p.logoUrl} alt="" className="h-8 w-8 rounded-full shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {p.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{p.symbol}</span>
                              <span className="text-[10px] text-muted-foreground truncate">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="font-mono num">{p.priceUsd ? fmtUsd(p.priceUsd) : "—"}</span>
                              <span>·</span>
                              <span className="font-mono num">#{p.marketRank}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={cn(
                              "font-mono text-sm font-bold num",
                              p.iaFinal >= 18 ? "text-pass" : p.iaFinal >= 12 ? "text-investigate" : "text-reject"
                            )}>
                              {p.iaFinal.toFixed(1)}
                            </span>
                            <DecisionBadge decision={p.decision} size="sm" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
