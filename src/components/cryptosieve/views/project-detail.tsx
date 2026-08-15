"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScoreGauge, MetricBar, DecisionBadge, RankBadge, GatePill } from "../primitives";
import { EvidenceGraphView } from "../evidence-graph";
import { SeparationCards } from "../separation-cards";
import { HistoricalTrendChart } from "../historical-trend";
import { TokenomicsView } from "../tokenomics-view";
import { CapitalFlowView } from "../capital-flow-view";
import { CatalystView } from "../catalyst-view";
import { PriceChartView } from "../price-chart-view";
import { StarButton } from "../star-button";
import { CopilotChat } from "../copilot-chat";
import { fmtUsd, fmtNum, fmtPct } from "@/lib/format";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Target,
  Layers,
  FlaskConical,
  Scale,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Detail {
  symbol: string;
  name: string;
  sector?: string;
  chain?: string;
  logoUrl?: string;
  priceUsd?: number;
  marketCap?: number;
  fdv?: number;
  live: boolean;
  sourcesUsed: string[];
  input: any;
  scores: any;
  ranks: any;
  peer: any;
  thesis: any;
  evidenceGraph?: any;
  historicalSeries?: any[];
  separation?: any;
  tokenomics?: any;
  capitalFlow?: any;
  catalystReport?: any;
  priceSeries?: any;
  evidences: any[];
  risks: any[];
}

export function ProjectDetailView() {
  const { t } = useI18n();
  const { selectedSymbol, setView } = useApp();

  if (!selectedSymbol) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="py-20 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t.project.notSelected}</p>
            <Button variant="outline" onClick={() => setView("scanner")} className="mt-2">
              {t.nav.scanner}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProjectDetailLoader key={selectedSymbol} symbol={selectedSymbol} />;
}

function ProjectDetailLoader({ symbol }: { symbol: string }) {
  const { t } = useI18n();
  const { setView } = useApp();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/project-detail?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) setErr(j.error);
        else setData(j);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <Button variant="ghost" size="sm" onClick={() => setView("scanner")} className="gap-1.5 -ms-2">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t.nav.scanner}
      </Button>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      ) : err ? (
        <Card className="border-reject/30">
          <CardContent className="py-10 text-center text-sm text-reject">{err}</CardContent>
        </Card>
      ) : data ? (
        <ProjectDetailBody data={data} />
      ) : null}
    </div>
  );
}

function ProjectDetailBody({ data }: { data: Detail }) {
  const { t } = useI18n();
  const s = data.scores;
  const c = s.components;
  const vae = s.vae;
  const supply = s.supply;
  const thesis = data.thesis;
  const peer = data.peer;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
          <CardContent className="relative p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              {data.logoUrl ? (
                <img src={data.logoUrl} alt="" className="h-12 w-12 rounded-full border border-border" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-primary">
                  {data.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{data.name}</h1>
                  <span className="font-mono text-sm text-muted-foreground">${data.symbol}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {data.sector && <Badge variant="secondary" className="text-[10px]">{data.sector}</Badge>}
                  {data.chain && <Badge variant="outline" className="text-[10px]">{data.chain}</Badge>}
                  <span className={cn("text-[10px] flex items-center gap-1", data.live ? "text-pass" : "text-investigate")}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {data.live ? t.common.live : t.common.cached}
                  </span>
                </div>
              </div>
            </div>
            <div className="md:ms-auto flex items-center gap-6">
              <div>
                <div className="text-[10px] text-muted-foreground">{t.scanner.price}</div>
                <div className="font-mono font-bold num">{data.priceUsd ? fmtUsd(data.priceUsd) : "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Market Cap</div>
                <div className="font-mono font-bold num">{data.marketCap ? fmtUsd(data.marketCap) : "—"}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">FDV</div>
                <div className="font-mono font-bold num">{data.fdv ? fmtUsd(data.fdv) : "—"}</div>
              </div>
            </div>
            <StarButton
              symbol={data.symbol}
              name={data.name}
              sector={data.sector}
              logoUrl={data.logoUrl}
              size="lg"
            />
          </CardContent>
        </div>
      </Card>

      {/* v1.1: Separation cards — Project ≠ Token ≠ Investment */}
      {data.separation && <SeparationCards data={data.separation} />}

      {/* Price chart with technical indicators */}
      {data.priceSeries && <PriceChartView series={data.priceSeries} />}

      {/* IA Pipeline + Decision */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* IA pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t.project.iaRaw} → {t.project.iaFinal}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin pb-2">
              <PipelineStage label="IA_raw" value={s.iaRaw} tone="neutral" />
              <PipelineOp label={`× C = ${s.confidence != null ? s.confidence.toFixed(2) : "—"}`} />
              <PipelineStage label="IA_eff" value={s.iaEffective} tone="warn" />
              <PipelineOp label={`× M = ${s.marketRegime?.toFixed(2) ?? "—"}`} />
              <PipelineStage label="IA_final" value={s.iaFinal} tone="primary" big />
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              <RankTile label={t.project.fundamentalRank} rank={data.ranks.fundamentalRank} />
              <RankTile label={t.project.confidenceRank} rank={data.ranks.confidenceRank} />
              <RankTile label={t.project.effectiveRank} rank={data.ranks.effectiveRank} />
              <RankTile label={t.project.marketRank} rank={data.ranks.marketRank} />
            </div>
          </CardContent>
        </Card>

        {/* Decision */}
        <Card className={cn("border-2", decisionBorder(s.decision))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.project.decision}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DecisionBadge decision={s.decision} size="md" />
            <div className="space-y-2 text-xs">
              <ExplainerList
                title={t.project.decisionWhy}
                items={s.decisionExplanation.for}
                tone="good"
              />
              <ExplainerList
                title={t.project.decisionAgainst}
                items={s.decisionExplanation.against}
                tone="bad"
              />
              <ExplainerList
                title={t.project.decisionTriggers}
                items={s.decisionExplanation.triggers}
                tone="warn"
                bullet="→"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5 component scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.project.metrics}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <ScoreGauge value={c.pq} label={t.project.projectQuality} size="md" />
            <ScoreGauge value={c.tq} label={t.project.tokenQuality} size="md" />
            <ScoreGauge value={c.va} label={t.project.valueAccrual} size="md" />
            <ScoreGauge value={c.v} label={t.project.valuation} size="md" />
            <ScoreGauge value={c.r} label={t.project.risk} size="md" tone="auto" />
          </div>
        </CardContent>
      </Card>

      {/* v1.2: Historical score trend */}
      {data.historicalSeries && data.historicalSeries.length > 0 && (
        <HistoricalTrendChart series={data.historicalSeries} />
      )}

      {/* VAE chain + Supply metrics */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {t.project.vaeChain}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-thin">
              <ChainNode label="GEA" value={data.input.gea} />
              <ChainArrow label={`α=${vae.alpha?.toFixed(0) ?? "—"}`} />
              <ChainNode label="PR" value={data.input.pr} />
              <ChainArrow label={`δ=${vae.delta?.toFixed(0) ?? "—"}`} />
              <ChainNode label="PC" value={data.input.pc} />
              <ChainArrow label="δ" />
              <ChainNode label="TC" value={data.input.tc} highlight />
            </div>
            <div className="rounded-lg bg-primary/8 border border-primary/20 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">VAE = α × δ = TC / PR</div>
                <div className="font-mono text-2xl font-bold text-primary num">{vae.vae?.toFixed(1) ?? "—"}%</div>
              </div>
              <div className="text-end text-[10px] text-muted-foreground">
                <div>α = <span className="font-mono num">{vae.alpha?.toFixed(1) ?? "—"}%</span></div>
                <div>δ = <span className="font-mono num">{vae.delta?.toFixed(1) ?? "—"}%</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              {t.project.supplyMetrics}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SupplyRow label="SAR" desc="(Buyback+Burn)/(Unlock+Emission)" value={supply.sar} fmt={(v) => v.toFixed(3)} gate={supply.sar != null && supply.sar < 0.1} />
            <SupplyRow label="NSP" desc="Net Sell Pressure (USD)" value={supply.nsp} fmt={(v) => fmtUsd(v)} />
            <SupplyRow label="FDR" desc="(12m Unlock+Emission)/Float" value={supply.fdr} fmt={(v) => fmtPct(v * 100, 1)} gate={supply.fdr != null && supply.fdr >= 0.3} />
          </CardContent>
        </Card>
      </div>

      {/* v1.3: Tokenomics & Unlock Schedule */}
      {data.tokenomics && <TokenomicsView schedule={data.tokenomics} />}

      {/* Gates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            {t.project.gates}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {s.gates.map((g: any) => (
              <GatePill key={g.id} gate={g} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peer benchmark */}
      {peer && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {t.project.peerBenchmark}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <PercentileRow label="Revenue Growth" pct={peer.revenueGrowth} />
              <PercentileRow label="Market Position" pct={peer.marketPosition} />
              <PercentileRow label="VAE" pct={peer.vae} />
              <PercentileRow label="Unlock Risk (inv. FDR)" pct={peer.unlockRisk} />
              <PercentileRow label="Risk (lower=better)" pct={peer.risk == null ? null : 100 - peer.risk} />
            </div>
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-primary/8 border border-primary/20 p-4">
              <div className="text-[11px] text-muted-foreground text-center">Relative Investment Attractiveness</div>
              <ScoreGauge value={data.peer ? computeRel(peer) : null} label="" size="lg" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thesis */}
      {thesis && (
        <Card className={cn("border-2", thesisBorder(thesis.status))}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                {t.thesis.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{t.thesis.status}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    thesis.status === "intact" && "border-pass/30 text-pass",
                    thesis.status === "weakened" && "border-investigate/30 text-investigate",
                    thesis.status === "broken" && "border-reject/30 text-reject"
                  )}
                >
                  {thesis.status} · {Math.round(thesis.intactPct)}%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{thesis.title}</p>
            <div className="grid md:grid-cols-3 gap-4 text-xs">
              <ThesisCol title={t.thesis.whyWorks} items={thesis.whyWorks} tone="good" icon={CheckCircle2} />
              <ThesisCol title={t.thesis.mustStayTrue} items={thesis.mustStayTrue} tone="warn" icon={Target} />
              <ThesisCol title={t.thesis.whatBreaks} items={thesis.whatBreaks} tone="bad" icon={XCircle} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t.thesis.latestEvidence}</div>
              <div className="space-y-1.5">
                {thesis.latestEvidence.map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {e.dir === "up" ? (
                      <TrendingUp className="h-3.5 w-3.5 text-pass" />
                    ) : e.dir === "down" ? (
                      <TrendingDown className="h-3.5 w-3.5 text-reject" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>{e.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* v1.1: Evidence Graph (real claims with sources, freshness, grades, contradictions) */}
      {data.evidenceGraph ? (
        <EvidenceGraphView graph={data.evidenceGraph} />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.evidence.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground py-4">{t.evidence.noEvidence}</p>
          </CardContent>
        </Card>
      )}

      {/* v1.3: Capital Flow & Smart Money */}
      {data.capitalFlow && <CapitalFlowView profile={data.capitalFlow} />}

      {/* v1.4: Catalyst Calendar & Kill Conditions */}
      {data.catalystReport && <CatalystView report={data.catalystReport} />}

      {/* v2.0: AI Research Copilot */}
      <CopilotChat symbol={data.symbol} />
    </div>
  );
}

function computeRel(peer: any): number {
  const vals = [peer.revenueGrowth, peer.marketPosition, peer.vae, peer.unlockRisk, peer.risk == null ? null : 100 - peer.risk].filter(
    (v): v is number => v != null
  );
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function decisionBorder(d: string) {
  return d === "PASS" ? "border-pass/40" : d === "INVESTIGATE" ? "border-investigate/40" : "border-reject/40";
}
function thesisBorder(s: string) {
  return s === "intact" ? "border-pass/30" : s === "weakened" ? "border-investigate/30" : "border-reject/30";
}

function PipelineStage({ label, value, tone, big }: { label: string; value: number | null; tone: "neutral" | "warn" | "primary"; big?: boolean }) {
  const color = tone === "primary" ? "text-primary" : tone === "warn" ? "text-investigate" : "text-foreground";
  return (
    <div className="flex flex-col items-center min-w-[70px]">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("font-mono font-bold num", color, big ? "text-2xl" : "text-lg")}>
        {value != null ? value.toFixed(1) : "—"}
      </div>
    </div>
  );
}
function PipelineOp({ label }: { label: string }) {
  return <div className="text-[10px] font-mono text-muted-foreground px-1 whitespace-nowrap">{label}</div>;
}

function RankTile({ label, rank }: { label: string; rank: number | null }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</div>
      <RankBadge rank={rank} />
    </div>
  );
}

function ExplainerList({ title, items, tone, bullet }: { title: string; items: string[]; tone: "good" | "bad" | "warn"; bullet?: string }) {
  const color = tone === "good" ? "text-pass" : tone === "bad" ? "text-reject" : "text-investigate";
  const sym = bullet ?? (tone === "good" ? "+" : "−");
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <ul className="space-y-0.5">
        {items.length === 0 ? (
          <li className="text-muted-foreground">—</li>
        ) : (
          items.map((it, i) => (
            <li key={i} className="flex gap-1.5">
              <span className={cn("font-mono", color)}>{sym}</span>
              <span className="flex-1">{it}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ChainNode({ label, value, highlight }: { label: string; value?: number | null; highlight?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center min-w-[60px] rounded-lg p-2", highlight ? "bg-primary/10 border border-primary/25" : "bg-muted/40")}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-semibold num">{value != null ? fmtUsd(value) : "—"}</span>
    </div>
  );
}
function ChainArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center text-muted-foreground">
      <span className="text-[9px] font-mono">{label}</span>
      <span className="text-lg leading-none rtl:rotate-180">→</span>
    </div>
  );
}

function SupplyRow({ label, desc, value, fmt, gate }: { label: string; desc: string; value: number | null; fmt: (v: number) => string; gate?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xs font-mono font-semibold">{label}</div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
      <div className={cn("font-mono text-sm font-bold num", gate ? "text-reject" : "text-foreground")}>
        {value != null ? fmt(value) : "—"}
      </div>
    </div>
  );
}

function PercentileRow({ label, pct }: { label: string; pct: number | null }) {
  if (pct == null) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs font-semibold num">{Math.round(pct)}th</span>
      </div>
      <MetricBar value={pct} showValue={false} tone="auto" />
    </div>
  );
}

function ThesisCol({ title, items, tone, icon: Icon }: { title: string; items: string[]; tone: "good" | "warn" | "bad"; icon: any }) {
  const color = tone === "good" ? "text-pass" : tone === "bad" ? "text-reject" : "text-investigate";
  return (
    <div>
      <div className={cn("flex items-center gap-1.5 mb-2 font-medium", color)}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-muted-foreground leading-tight">{it}</li>
        ))}
      </ul>
    </div>
  );
}
