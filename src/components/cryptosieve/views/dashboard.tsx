"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge, DecisionBadge, RankBadge, Sparkline } from "../primitives";
import { fmtUsd, fmtPct, timeAgo } from "@/lib/format";
import { Radar, TrendingUp, ShieldCheck, AlertTriangle, Activity, Zap, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketData {
  universeSize: number;
  passed: number;
  investigate: number;
  rejected: number;
  avgConfidence: number;
  topFundamental: any[];
  topActionable: any[];
  recentScans: any[];
  hasData: boolean;
}

export function DashboardView() {
  const { t } = useI18n();
  const { setView, openProject, scanning, setScanning, setScanResults, setScanMeta } = useApp();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runScan() {
    setScanning(true);
    setView("scanner");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ useLive: true }),
      });
      const j = await res.json();
      setScanResults(j.results ?? []);
      setScanMeta({
        live: j.live,
        sourcesUsed: j.sourcesUsed,
        marketRegime: j.marketRegime,
        universeSize: j.universeSize,
        passed: j.passed,
        rejected: j.rejected,
        investigate: j.investigate,
      });
    } finally {
      setScanning(false);
      // refresh dashboard summary
      fetch("/api/market")
        .then((r) => r.json())
        .then((j) => setData(j))
        .catch(() => {});
    }
  }

  const M = data ? 1 + 0 : 1; // market regime from scan meta; default neutral

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/8 via-card to-card p-6 md:p-8">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
              {scanning && (
                <Badge variant="secondary" className="gap-1.5 animate-pulse-soft">
                  <Activity className="h-3 w-3" /> {t.scanner.scanning}
                </Badge>
              )}
              {data?.hasData && !scanning && (
                <Badge variant="outline" className="gap-1.5 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-pass animate-pulse-soft" />
                  {data.universeSize} assets tracked
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">{t.dashboard.subtitle}</p>
            {/* Pipeline formula strip */}
            <div className="flex items-center gap-1 flex-wrap text-[10px] font-mono text-muted-foreground mt-1">
              {["Gate", "PQ", "TQ", "VA", "V", "R", "IA_raw", "C", "IA_eff", "M", "IA_final"].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-1">
                  <span className={
                    s === "IA_final" ? "px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold" :
                    s === "Gate" ? "px-1.5 py-0.5 rounded bg-muted/60" :
                    ["C", "M"].includes(s) ? "px-1.5 py-0.5 rounded bg-investigate/15 text-investigate" :
                    "px-1.5 py-0.5 rounded bg-muted/40"
                  }>{s}</span>
                  {i < arr.length - 1 && <span className="text-muted-foreground/50">→</span>}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data?.hasData && (
              <div className="text-end hidden sm:block">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.dashboard.avgConfidence}</div>
                <div className="font-mono text-xl font-bold text-primary num">
                  {Math.round((data.avgConfidence ?? 0) * 100)}%
                </div>
              </div>
            )}
            <Button onClick={runScan} disabled={scanning} size="lg" className="shadow-glow gap-2">
              <Radar className="h-4 w-4" />
              {t.dashboard.runScan}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Activity}
          label={t.dashboard.universeSize}
          value={data?.universeSize}
          loading={loading}
          tone="primary"
        />
        <StatCard
          icon={ShieldCheck}
          label={t.dashboard.passedGates}
          value={data?.passed}
          loading={loading}
          tone="good"
        />
        <StatCard
          icon={AlertTriangle}
          label={t.dashboard.investigate}
          value={data?.investigate}
          loading={loading}
          tone="warn"
        />
        <StatCard
          icon={Zap}
          label={t.dashboard.avgConfidence}
          value={data?.avgConfidence != null ? `${Math.round(data.avgConfidence * 100)}%` : null}
          loading={loading}
          tone="primary"
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : !data?.hasData ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Radar className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">{t.dashboard.noData}</p>
            <Button onClick={runScan} disabled={scanning} className="mt-2">
              {t.dashboard.runScan}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Top Fundamental */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t.dashboard.topFundamental}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setView("scanner")}>
                  {t.scanner.results} <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(data?.topFundamental ?? []).map((p, i) => (
                <ProjectRow key={p.symbol} p={p} rank={i + 1} metric="iaRaw" onClick={() => openProject(p.symbol)} />
              ))}
            </CardContent>
          </Card>

          {/* Top Actionable */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {t.dashboard.topActionable}
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setView("scanner")}>
                  {t.scanner.results} <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(data?.topActionable ?? []).map((p, i) => (
                <ProjectRow key={p.symbol} p={p} rank={i + 1} metric="iaFinal" onClick={() => openProject(p.symbol)} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent scans */}
      {data?.recentScans && data.recentScans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t.dashboard.recentScans}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.recentScans.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-card/50 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{timeAgo(s.startedAt)}</span>
                    <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono num">
                    <div>
                      <div className="text-muted-foreground text-[10px]">{t.scanner.universeSize ?? "universe"}</div>
                      <div className="font-semibold">{s.universeSize}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">{t.dashboard.passed}</div>
                      <div className="font-semibold text-pass">{s.passedCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px]">{t.dashboard.rejected}</div>
                      <div className="font-semibold text-reject">{s.rejectedCount}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: any;
  label: string;
  value: number | string | null;
  loading: boolean;
  tone: "primary" | "good" | "warn";
}) {
  const color =
    tone === "good" ? "text-pass" : tone === "warn" ? "text-investigate" : "text-primary";
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
          <Icon className={cn("h-3.5 w-3.5", color)} />
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className={cn("text-2xl font-bold font-mono num", color)}>
            {value ?? "—"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectRow({
  p,
  rank,
  metric,
  onClick,
}: {
  p: any;
  rank: number;
  metric: "iaRaw" | "iaFinal";
  onClick: () => void;
}) {
  const value = p[metric] ?? 0;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60 transition-colors text-start group"
    >
      <span className="text-xs font-mono text-muted-foreground w-5 num">#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{p.symbol}</span>
          <span className="text-xs text-muted-foreground truncate">{p.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {p.sector && <span>{p.sector}</span>}
          {p.marketCap && <span className="num">{fmtUsd(p.marketCap)}</span>}
        </div>
      </div>
      <Sparkline data={[value * 0.7, value * 0.85, value * 0.9, value]} width={56} height={20} tone={value > 30 ? "good" : "bad"} />
      <div className="text-end">
        <div className="font-mono font-semibold text-sm num">{value.toFixed(1)}</div>
        <div className="text-[9px] text-muted-foreground">{metric === "iaRaw" ? "IA raw" : "IA final"}</div>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
