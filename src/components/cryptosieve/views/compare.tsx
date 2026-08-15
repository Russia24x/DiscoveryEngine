"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionBadge } from "../primitives";
import { cn } from "@/lib/utils";
import { fmtUsd } from "@/lib/format";
import {
  Radar as RadarIcon,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { X } from "lucide-react";
import { toast } from "sonner";

interface CompareProject {
  symbol: string;
  name: string;
  sector?: string;
  logoUrl?: string;
  priceUsd?: number;
  marketCap?: number;
  fdv?: number;
  scores: {
    pq: number; tq: number; va: number; v: number; r: number;
    iaRaw: number; confidence: number; iaEffective: number; iaFinal: number;
  };
  vae: number;
  alpha: number;
  delta: number;
  decision: string;
  gatePassed: boolean;
  ranks: { fundamental: number; confidence: number; effective: number; market: number };
  tokenomics: { verdict: string; score: number; dilution12mPct: number; absorptionRatio: number };
  capitalFlow: { composite: number; status: string };
  thesis: { status: string; intactPct: number };
}

const COLORS = ["var(--primary)", "var(--pass)", "var(--investigate)", "var(--chart-4)"];

export function CompareView() {
  const { t } = useI18n();
  const { scanResults, openProject } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState<any[]>([]);
  const [data, setData] = useState<{ projects: CompareProject[]; winners: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch available projects if not already in store.
  useEffect(() => {
    if (scanResults && scanResults.length > 0) {
      setAvailable(scanResults);
      return;
    }
    let cancelled = false;
    fetch("/api/projects?showRejected=1")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setAvailable(j.projects ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [scanResults]);

  // Default-select top 3 once available projects are loaded.
  useEffect(() => {
    if (available.length > 0 && selected.length === 0) {
      const top3 = [...available]
        .sort((a, b) => (b.iaFinal ?? 0) - (a.iaFinal ?? 0))
        .slice(0, 3)
        .map((p) => p.symbol);
      setSelected(top3);
    }
  }, [available, selected.length]);

  async function runCompare() {
    if (selected.length < 2) {
      toast.error(t.compare.noSelection);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbols: selected }),
      });
      const j = await res.json();
      if (j.error) {
        toast.error(j.error);
      } else {
        setData({ projects: j.projects, winners: j.winners });
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleSymbol(sym: string) {
    setSelected((prev) => {
      if (prev.includes(sym)) return prev.filter((s) => s !== sym);
      if (prev.length >= 4) {
        toast.error("Max 4 projects");
        return prev;
      }
      return [...prev, sym];
    });
  }

  // `available` is now a state variable fetched above.

  // Radar chart data.
  const radarData = data
    ? (["pq", "tq", "va", "v", "r", "iaRaw"] as const).map((metric) => {
        const row: any = { metric: metric.toUpperCase() };
        data.projects.forEach((p) => {
          row[p.symbol] = metric === "r" ? 100 - p.scores[metric] : p.scores[metric];
        });
        return row;
      })
    : [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <RadarIcon className="h-5 w-5 text-primary" />
          {t.compare.title}
        </h1>
        <p className="text-xs text-muted-foreground">{t.compare.subtitle}</p>
      </div>

      {/* Project selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">
              {t.compare.selectHint} ({selected.length}/4)
            </span>
            <Button size="sm" onClick={runCompare} disabled={loading || selected.length < 2} className="gap-1.5">
              <RadarIcon className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {loading ? "..." : t.compare.compare}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
            {available.map((p) => {
              const isSel = selected.includes(p.symbol);
              return (
                <button
                  key={p.symbol}
                  onClick={() => toggleSymbol(p.symbol)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1.5",
                    isSel
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {isSel && <X className="h-3 w-3" />}
                  <span className="font-semibold">{p.symbol}</span>
                  <span className="font-mono num text-[10px] opacity-70">
                    {(p.iaFinal ?? 0).toFixed(1)}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : !data ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <RadarIcon className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t.compare.noSelection}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Radar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t.compare.radar}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                    <PolarRadiusAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={9} angle={90} />
                    {data.projects.map((p, i) => (
                      <RechartsRadar
                        key={p.symbol}
                        name={p.symbol}
                        dataKey={p.symbol}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Note: R (risk) is inverted — higher on chart = lower risk (better)
              </p>
            </CardContent>
          </Card>

          {/* Comparison table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t.compare.metrics}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-start font-medium px-3 py-2 sticky start-0 bg-card">Metric</th>
                      {data.projects.map((p, i) => (
                        <th key={p.symbol} className="text-center font-medium px-3 py-2 min-w-[120px]">
                          <button
                            onClick={() => openProject(p.symbol)}
                            className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="font-semibold">{p.symbol}</span>
                            <span className="text-[9px] text-muted-foreground font-normal truncate max-w-[100px]">{p.name}</span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {renderMetricRows(data, t)}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function renderMetricRows(data: { projects: CompareProject[]; winners: Record<string, string> }, t: any) {
  const rows: Array<{ label: string; key: string; getVal: (p: CompareProject) => string | number; fmt?: (v: any) => string; invert?: boolean }> = [
    { label: "PQ", key: "pq", getVal: (p) => p.scores.pq },
    { label: "TQ", key: "tq", getVal: (p) => p.scores.tq },
    { label: "VA", key: "va", getVal: (p) => p.scores.va },
    { label: "V (Valuation)", key: "v", getVal: (p) => p.scores.v },
    { label: "R (Risk)", key: "r", getVal: (p) => p.scores.r, invert: true },
    { label: "IA Raw", key: "iaRaw", getVal: (p) => p.scores.iaRaw },
    { label: "Confidence", key: "confidence", getVal: (p) => `${Math.round(p.scores.confidence * 100)}%` },
    { label: "IA Effective", key: "iaEffective", getVal: (p) => p.scores.iaEffective },
    { label: "IA Final", key: "iaFinal", getVal: (p) => p.scores.iaFinal },
    { label: "VAE", key: "vae", getVal: (p) => `${p.vae.toFixed(0)}%` },
    { label: "Market Cap", key: "mcap", getVal: (p) => p.marketCap ?? 0, fmt: (v) => fmtUsd(v) },
    { label: "Tokenomics", key: "tokenomics", getVal: (p) => p.tokenomics.score },
    { label: "Capital Flow", key: "capflow", getVal: (p) => p.capitalFlow.composite },
    { label: "Thesis %", key: "thesis", getVal: (p) => p.thesis.intactPct },
  ];

  return rows.map((row) => (
    <tr key={row.key} className="border-t border-border">
      <td className="px-3 py-2 text-xs text-muted-foreground sticky start-0 bg-card">{row.label}</td>
      {data.projects.map((p) => {
        const rawVal = row.getVal(p);
        const numVal = typeof rawVal === "number" ? rawVal : parseFloat(rawVal) || 0;
        const isWinner = data.winners[row.key] === p.symbol;
        const display = row.fmt ? row.fmt(numVal) : typeof rawVal === "number" ? numVal.toFixed(1) : rawVal;
        return (
          <td key={p.symbol} className="px-3 py-2 text-center">
            <div className="relative inline-flex flex-col items-center">
              {isWinner && (
                <Badge className="absolute -top-3 text-[8px] px-1 py-0 h-3.5 bg-primary/20 text-primary border-primary/30">
                  {t.compare.winner}
                </Badge>
              )}
              <span className={cn(
                "font-mono num text-xs",
                isWinner ? "font-bold text-primary" : "text-foreground"
              )}>
                {display}
              </span>
            </div>
          </td>
        );
      })}
    </tr>
  ));
}
