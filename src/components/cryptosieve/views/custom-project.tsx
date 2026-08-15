"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionBadge, ScoreGauge } from "../primitives";
import { SeparationCards } from "../separation-cards";
import { PriceChartView } from "../price-chart-view";
import { HistoricalTrendChart } from "../historical-trend";
import { TokenomicsView } from "../tokenomics-view";
import { CapitalFlowView } from "../capital-flow-view";
import { CatalystView } from "../catalyst-view";
import { EvidenceGraphView } from "../evidence-graph";
import { FlaskConical, RotateCcw, Play, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AnalysisResult {
  symbol: string;
  name: string;
  sector?: string;
  scores: any;
  separation: any;
  thesis: any;
  evidenceGraph: any;
  historicalSeries: any[];
  tokenomics: any;
  capitalFlow: any;
  catalystReport: any;
  priceSeries: any;
  peer: any;
  ranks: any;
}

const PRESETS = [
  { label: "Strong Perp DEX", data: { symbol: "TEST", name: "Test Perp DEX", sector: "Perp DEX", pr: 500e6, pc: 500e6, tc: 200e6, buybackBurnAnnual: 200e6, unlockEmission12m: 30e6, revenueGrowth: 45, marketPosition: 80, tokenUtility: 70, governanceQuality: 65, insiderConcentration: 40, smartContract: 30, revenueConcentration: 50, priceUsd: 10, marketCap: 5e9, fdv: 10e9, totalSupply: 1e9, floatSupply: 500e6 } },
  { label: "Weak Token, Strong Project", data: { symbol: "WTP", name: "Weak Token Project", sector: "DEX", pr: 300e6, pc: 300e6, tc: 0, buybackBurnAnnual: 0, unlockEmission12m: 200e6, revenueGrowth: 30, marketPosition: 75, tokenUtility: 30, governanceQuality: 40, insiderConcentration: 70, smartContract: 35, revenueConcentration: 60, priceUsd: 5, marketCap: 2e9, fdv: 5e9, totalSupply: 1e9, floatSupply: 400e6 } },
  { label: "High Risk Speculative", data: { symbol: "RISK", name: "Risky Spec", sector: "AI", pr: 5e6, pc: 5e6, tc: 1e6, buybackBurnAnnual: 0, unlockEmission12m: 500e6, revenueGrowth: 60, marketPosition: 40, tokenUtility: 50, governanceQuality: 30, insiderConcentration: 80, smartContract: 60, revenueConcentration: 85, priceUsd: 0.5, marketCap: 500e6, fdv: 5e9, totalSupply: 10e9, floatSupply: 1e9 } },
];

export function CustomProjectView() {
  const { t } = useI18n();
  const [form, setForm] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    const newForm: Record<string, string> = {};
    for (const [k, v] of Object.entries(preset.data)) {
      newForm[k] = String(v);
    }
    setForm(newForm);
    toast.success(`Preset "${preset.label}" applied`);
  }

  function reset() {
    setForm({});
    setResult(null);
  }

  async function analyze() {
    if (!form.symbol || !form.name) {
      toast.error("Symbol and name required");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/custom-project", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (j.error) {
        toast.error(j.error);
      } else {
        setResult(j);
        toast.success(`Analyzed ${j.symbol}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "h-9 text-sm";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          {t.customProject.title}
        </h1>
        <p className="text-xs text-muted-foreground">{t.customProject.subtitle}</p>
      </div>

      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Lightbulb className="h-3.5 w-3.5" /> {t.customProject.presets}:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/50 text-muted-foreground hover:bg-primary/15 hover:text-primary border border-border hover:border-primary/30 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider">{t.customProject.symbol}</Label>
              <Input value={form.symbol ?? ""} onChange={(e) => setField("symbol", e.target.value.toUpperCase())} placeholder="HYPE" className={inputCls} />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label className="text-[10px] uppercase tracking-wider">{t.customProject.name}</Label>
              <Input value={form.name ?? ""} onChange={(e) => setField("name", e.target.value)} placeholder="Hyperliquid" className={inputCls} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider">{t.customProject.sector}</Label>
              <Input value={form.sector ?? ""} onChange={(e) => setField("sector", e.target.value)} placeholder="Perp DEX" className={inputCls} />
            </div>
          </div>

          {/* Market data */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.customProject.marketData}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <FormField label={t.customProject.priceUsd} value={form.priceUsd} onChange={(v) => setField("priceUsd", v)} placeholder="24.80" />
              <FormField label={t.customProject.marketCap} value={form.marketCap} onChange={(v) => setField("marketCap", v)} placeholder="8200000000" />
              <FormField label={t.customProject.fdv} value={form.fdv} onChange={(v) => setField("fdv", v)} placeholder="24800000000" />
              <FormField label={t.customProject.totalSupply} value={form.totalSupply} onChange={(v) => setField("totalSupply", v)} placeholder="1000000000" />
              <FormField label={t.customProject.floatSupply} value={form.floatSupply} onChange={(v) => setField("floatSupply", v)} placeholder="330000000" />
            </div>
          </div>

          {/* Value accrual chain */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.customProject.valueAccrual}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <FormField label={t.customProject.pr} value={form.pr} onChange={(v) => setField("pr", v)} placeholder="560000000" />
              <FormField label={t.customProject.pc} value={form.pc} onChange={(v) => setField("pc", v)} placeholder="560000000" />
              <FormField label={t.customProject.tc} value={form.tc} onChange={(v) => setField("tc", v)} placeholder="180000000" />
            </div>
          </div>

          {/* Supply pressures */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.customProject.supply}</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t.customProject.buybackBurn} value={form.buybackBurnAnnual} onChange={(v) => setField("buybackBurnAnnual", v)} placeholder="180000000" />
              <FormField label={t.customProject.unlockEmission} value={form.unlockEmission12m} onChange={(v) => setField("unlockEmission12m", v)} placeholder="30000000" />
            </div>
          </div>

          {/* Component scores */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.customProject.components}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <FormField label={t.customProject.revenueGrowth} value={form.revenueGrowth} onChange={(v) => setField("revenueGrowth", v)} placeholder="41" />
              <FormField label={t.customProject.marketPosition} value={form.marketPosition} onChange={(v) => setField("marketPosition", v)} placeholder="75" />
              <FormField label={t.customProject.tokenUtility} value={form.tokenUtility} onChange={(v) => setField("tokenUtility", v)} placeholder="60" />
              <FormField label={t.customProject.governanceQuality} value={form.governanceQuality} onChange={(v) => setField("governanceQuality", v)} placeholder="65" />
              <FormField label={t.customProject.insiderConcentration} value={form.insiderConcentration} onChange={(v) => setField("insiderConcentration", v)} placeholder="45" />
              <FormField label={t.customProject.smartContract} value={form.smartContract} onChange={(v) => setField("smartContract", v)} placeholder="30" />
              <FormField label={t.customProject.revenueConcentration} value={form.revenueConcentration} onChange={(v) => setField("revenueConcentration", v)} placeholder="55" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={analyze} disabled={loading} className="gap-1.5">
              <Play className="h-4 w-4" />
              {loading ? t.customProject.analyzing : t.customProject.analyze}
            </Button>
            <Button variant="outline" onClick={reset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              {t.customProject.reset}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {loading && (
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}

      {!loading && result && (
        <div className="space-y-4">
          {/* Result header */}
          <Card className="border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-primary">
                {result.symbol.slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{result.name}</h2>
                  <Badge variant="outline" className="font-mono text-xs">${result.symbol}</Badge>
                  {result.sector && <Badge variant="secondary" className="text-[10px]">{result.sector}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Custom analysis · scored against bundle universe</div>
              </div>
              <DecisionBadge decision={result.scores.decision} />
            </CardContent>
          </Card>

          {/* Separation cards */}
          {result.separation && <SeparationCards data={result.separation} />}

          {/* 5 component gauges */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Component Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <ScoreGauge value={result.scores.components.pq} label="Project Quality" size="md" />
                <ScoreGauge value={result.scores.components.tq} label="Token Quality" size="md" />
                <ScoreGauge value={result.scores.components.va} label="Value Accrual" size="md" />
                <ScoreGauge value={result.scores.components.v} label="Valuation" size="md" />
                <ScoreGauge value={result.scores.components.r} label="Risk" size="md" tone="auto" />
              </div>
            </CardContent>
          </Card>

          {/* Price chart */}
          {result.priceSeries && <PriceChartView series={result.priceSeries} />}

          {/* Historical trend */}
          {result.historicalSeries && <HistoricalTrendChart series={result.historicalSeries} />}

          {/* Tokenomics */}
          {result.tokenomics && <TokenomicsView schedule={result.tokenomics} />}

          {/* Evidence graph */}
          {result.evidenceGraph && <EvidenceGraphView graph={result.evidenceGraph} />}

          {/* Capital flow */}
          {result.capitalFlow && <CapitalFlowView profile={result.capitalFlow} />}

          {/* Catalyst */}
          {result.catalystReport && <CatalystView report={result.catalystReport} />}
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="text" className="h-9 text-sm font-mono" />
    </div>
  );
}
