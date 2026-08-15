"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DecisionBadge, RankBadge, ScoreGauge } from "../primitives";
import { DecisionDonut, DecisionLegend } from "../decision-donut";
import { StarButton } from "../star-button";
import { fmtUsd } from "@/lib/format";
import { Radar, RefreshCw, Search, Download, Filter, ArrowDownUp, CheckCircle2, XCircle, Zap, Rows3, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "fundamental" | "confidence" | "effective" | "market";

export function ScannerView() {
  const { t } = useI18n();
  const { scanResults, scanMeta, scanning, setScanning, setScanResults, setScanMeta, openProject } = useApp();
  const [sort, setSort] = useState<SortKey>("market");
  const [q, setQ] = useState("");
  const [onlyPassed, setOnlyPassed] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [minConf, setMinConf] = useState(0);
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [activePreset, setActivePreset] = useState<string>("none");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  async function runScan() {
    setScanning(true);
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
    }
  }

  // Auto-run once if no results yet.
  useEffect(() => {
    if (!scanResults && !scanning) runScan();
  }, []);

  const filtered = useMemo(() => {
    if (!scanResults) return [];
    let arr = [...scanResults];
    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter(
        (p) => p.symbol.toLowerCase().includes(s) || p.name?.toLowerCase().includes(s) || p.sector?.toLowerCase().includes(s)
      );
    }
    if (sectorFilter !== "all") arr = arr.filter((p) => p.sector === sectorFilter);
    if (onlyPassed) arr = arr.filter((p) => p.gatePassed);
    if (!showRejected) arr = arr.filter((p) => p.decision !== "REJECT");
    if (minConf > 0) arr = arr.filter((p) => (p.confidence ?? 0) >= minConf);

    // Preset filters
    if (activePreset === "topGainers") {
      arr = arr.filter((p) => (p as any).input?.revenueGrowth >= 20);
      arr.sort((a, b) => ((b as any).input?.revenueGrowth ?? 0) - ((a as any).input?.revenueGrowth ?? 0));
    } else if (activePreset === "undervalued") {
      arr = arr.filter((p) => (p.components.v ?? 0) >= 55 && (p.iaRaw ?? 0) >= 15);
      arr.sort((a, b) => (b.components.v ?? 0) - (a.components.v ?? 0));
    } else if (activePreset === "highVae") {
      arr = arr.filter((p) => (p.vae?.vae ?? 0) >= 25);
      arr.sort((a, b) => (b.vae?.vae ?? 0) - (a.vae?.vae ?? 0));
    } else if (activePreset === "lowRisk") {
      arr = arr.filter((p) => (p.components.r ?? 100) <= 55);
      arr.sort((a, b) => (a.components.r ?? 100) - (b.components.r ?? 100));
    } else if (activePreset === "highConfidence") {
      arr = arr.filter((p) => (p.confidence ?? 0) >= 0.9);
      arr.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    } else {
      const sortKey =
        sort === "fundamental" ? "iaRaw" : sort === "confidence" ? "confidence" : sort === "effective" ? "iaEffective" : "iaFinal";
      arr.sort((a, b) => {
        const av = Number(a[sortKey as keyof typeof a] ?? 0);
        const bv = Number(b[sortKey as keyof typeof b] ?? 0);
        return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av);
      });
    }
    return arr;
  }, [scanResults, q, sectorFilter, onlyPassed, showRejected, minConf, sort, activePreset]);

  // Extract unique sectors for the filter dropdown.
  const sectors = useMemo(() => {
    if (!scanResults) return [];
    const set = new Set<string>();
    scanResults.forEach((p) => { if (p.sector) set.add(p.sector); });
    return Array.from(set).sort();
  }, [scanResults]);

  function exportCsv() {
    if (!filtered.length) return;
    // Escape CSV values: wrap in quotes, escape internal double-quotes by doubling them.
    const escapeCsv = (val: any): string => {
      const s = String(val ?? "");
      // Escape double-quotes and wrap in quotes to handle commas, newlines, and quotes.
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = [
      ["symbol", "name", "sector", "iaRaw", "confidence", "iaEffective", "iaFinal", "fundamentalRank", "marketRank", "decision"],
      ...filtered.map((p) => [
        p.symbol,
        p.name,
        p.sector ?? "",
        p.iaRaw?.toFixed(2) ?? "",
        p.confidence?.toFixed(3) ?? "",
        p.iaEffective?.toFixed(2) ?? "",
        p.iaFinal?.toFixed(2) ?? "",
        p.fundamentalRank,
        p.marketRank,
        p.decision,
      ]),
    ];
    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
    // Add BOM for Excel UTF-8 compatibility.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cryptosieve-scan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            {t.scanner.title}
          </h1>
          <p className="text-xs text-muted-foreground">{t.scanner.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {scanMeta && (
            <Badge variant="outline" className="gap-1.5 text-[11px]">
              <span className={cn("h-1.5 w-1.5 rounded-full", scanMeta.live ? "bg-pass" : "bg-investigate")} />
              {scanMeta.live ? t.common.live : t.common.cached} · {scanMeta.sourcesUsed.join(", ")}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> {t.scanner.export}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
            className="gap-1.5"
            title={density === "comfortable" ? "Switch to compact" : "Switch to comfortable"}
          >
            {density === "comfortable" ? <Rows3 className="h-3.5 w-3.5" /> : <Rows4 className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" onClick={runScan} disabled={scanning} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", scanning && "animate-spin")} />
            {scanning ? t.scanner.scanning : t.scanner.runScan}
          </Button>
        </div>
      </div>

      {/* Decision distribution + market regime */}
      {scanMeta && (
        <div className="grid md:grid-cols-3 gap-3">
          <Card className="md:col-span-1">
            <CardContent className="p-4 flex items-center gap-4">
              <DecisionDonut
                pass={scanMeta.passed}
                investigate={scanMeta.investigate}
                reject={scanMeta.rejected}
                size={100}
              />
              <div className="flex-1">
                <DecisionLegend
                  pass={scanMeta.passed}
                  investigate={scanMeta.investigate}
                  reject={scanMeta.rejected}
                />
              </div>
            </CardContent>
          </Card>
          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2">
            <MiniStat label={t.scanner.resultsCount.replace("{count}", "")} value={scanMeta.universeSize} />
            <MiniStat label={t.dashboard.passed} value={scanMeta.passed} tone="good" />
            <MiniStat label={t.dashboard.investigate} value={scanMeta.investigate} tone="warn" />
            <MiniStat label={t.dashboard.rejected} value={scanMeta.rejected} tone="bad" />
          </div>
        </div>
      )}

      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="h-3.5 w-3.5" /> Presets:
        </span>
        {([
          { key: "none", label: "All" },
          { key: "topGainers", label: "Top Gainers" },
          { key: "undervalued", label: "Undervalued" },
          { key: "highVae", label: "High VAE" },
          { key: "lowRisk", label: "Low Risk" },
          { key: "highConfidence", label: "High Confidence" },
        ] as const).map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePreset(p.key)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
              activePreset === p.key
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.common.search + "…"}
              className="ps-8 h-9 text-sm"
            />
          </div>
          {activePreset === "none" && (
            <div className="flex items-center gap-1.5">
              {(["fundamental", "confidence", "effective", "market"] as SortKey[]).map((k) => (
                <Button
                  key={k}
                  variant={sort === k ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSort(k)}
                >
                  {(t.scanner as any)[`sort${k[0].toUpperCase() + k.slice(1)}`]}
                </Button>
              ))}
            </div>
          )}
          {/* Sector filter */}
          {sectors.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={() => setSectorFilter("all")}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                  sectorFilter === "all" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                All
              </button>
              {sectors.map((s) => (
                <button
                  key={s}
                  onClick={() => setSectorFilter(s)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap",
                    sectorFilter === s ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={onlyPassed} onCheckedChange={setOnlyPassed} className="scale-90" />
              <span className="text-muted-foreground">{t.scanner.onlyPassed}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={showRejected} onCheckedChange={setShowRejected} className="scale-90" />
              <span className="text-muted-foreground">{t.scanner.showRejected}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Results table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-start font-medium px-3 py-2.5 sticky start-0 bg-muted/40">{t.scanner.asset}</th>
                <th className="text-start font-medium px-3 py-2.5">{t.scanner.sector}</th>
                <th className="text-end font-medium px-3 py-2.5 num">{t.scanner.price}</th>
                <th className="text-center font-medium px-3 py-2.5">PQ</th>
                <th className="text-center font-medium px-3 py-2.5">TQ</th>
                <th className="text-center font-medium px-3 py-2.5">VA</th>
                <th className="text-center font-medium px-3 py-2.5">V</th>
                <th className="text-center font-medium px-3 py-2.5">R</th>
                <th className="text-end font-medium px-3 py-2.5 num">{t.scanner.iaRaw}</th>
                <th className="text-end font-medium px-3 py-2.5 num">C</th>
                <th className="text-end font-medium px-3 py-2.5 num">{t.scanner.iaEff}</th>
                <th className="text-end font-medium px-3 py-2.5 num">{t.scanner.iaFinal}</th>
                <th className="text-center font-medium px-3 py-2.5">{t.scanner.gateReason}</th>
                <th className="text-center font-medium px-3 py-2.5">{t.common.decision}</th>
              </tr>
            </thead>
            <tbody>
              {scanning && !scanResults ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={14} className="px-3 py-2"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    {t.scanner.empty}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.symbol}
                    onClick={() => openProject(p.symbol)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openProject(p.symbol);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${p.symbol} detail`}
                    className={cn(
                      "border-t border-border hover:bg-muted/40 cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                      density === "compact" && "hover:bg-muted/30"
                    )}
                  >
                    <td className={cn("px-3 sticky start-0 bg-card group-hover:bg-muted/40", density === "compact" ? "py-1.5" : "py-2.5")}>
                      <div className="flex items-center gap-2">
                        {p.logoUrl ? (
                          <img src={p.logoUrl} alt="" className="h-6 w-6 rounded-full" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary">
                            {p.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight">{p.symbol}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{p.name}</div>
                        </div>
                        <StarButton
                          symbol={p.symbol}
                          name={p.name}
                          sector={p.sector}
                          logoUrl={p.logoUrl}
                          size="sm"
                          className="opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px] font-normal">{p.sector ?? "—"}</Badge>
                    </td>
                    <td className="px-3 py-2 text-end font-mono num text-xs">{p.priceUsd ? fmtUsd(p.priceUsd) : "—"}</td>
                    <ComponentCell v={p.components.pq} />
                    <ComponentCell v={p.components.tq} />
                    <ComponentCell v={p.components.va} />
                    <ComponentCell v={p.components.v} />
                    <ComponentCell v={p.components.r} invert />
                    <td className="px-3 py-2 text-end font-mono font-semibold num">{p.iaRaw?.toFixed(1) ?? "—"}</td>
                    <td className="px-3 py-2 text-end font-mono num text-xs text-muted-foreground">
                      {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-end font-mono num">{p.iaEffective?.toFixed(1) ?? "—"}</td>
                    <td className="px-3 py-2 text-end font-mono font-bold num text-primary">
                      {p.iaFinal?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.gatePassed ? (
                        <CheckCircle2 className="h-4 w-4 text-pass inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-reject inline" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <DecisionBadge decision={p.decision as any} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {t.scanner.resultsCount.replace("{count}", String(filtered.length))}
        </p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "bad" | "primary";
}) {
  const color =
    tone === "good" ? "text-pass" : tone === "warn" ? "text-investigate" : tone === "bad" ? "text-reject" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
      <div className={cn("text-lg font-bold font-mono num", color)}>{value}</div>
    </div>
  );
}

function ComponentCell({ v, invert }: { v?: number | null; invert?: boolean }) {
  if (v == null) return <td className="px-3 py-2 text-center text-muted-foreground">—</td>;
  const tone = invert ? (v >= 70 ? "bad" : v >= 50 ? "warn" : "good") : v >= 66 ? "good" : v >= 40 ? "warn" : "bad";
  const color = tone === "good" ? "text-pass" : tone === "warn" ? "text-investigate" : "text-reject";
  return (
    <td className={cn("px-3 py-2 text-center font-mono num text-xs font-medium", color)}>
      {Math.round(v)}
    </td>
  );
}
