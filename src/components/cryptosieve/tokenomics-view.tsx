"use client";

import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  TrendingDown,
  ShieldAlert,
  Gauge,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import type { TokenomicsSchedule, UnlockEvent } from "@/lib/engine/tokenomics";
import { fmtUsd } from "@/lib/format";

export function TokenomicsView({ schedule }: { schedule: TokenomicsSchedule }) {
  const { t } = useI18n();
  const v = schedule.verdict;

  const statusColor =
    v.status === "healthy"
      ? "text-pass border-pass/30 bg-pass/5"
      : v.status === "acceptable"
      ? "text-investigate border-investigate/30 bg-investigate/5"
      : v.status === "concerning"
      ? "text-investigate border-investigate/40 bg-investigate/10"
      : "text-reject border-reject/30 bg-reject/5";

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <Card className={cn("border-2", statusColor)}>
        <div className="relative">
          <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />
          <CardContent className="relative p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", statusColor)}>
                <Gauge className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold">{v.title}</div>
                <div className="text-xs text-muted-foreground max-w-md">{v.detail}</div>
              </div>
            </div>
            <div className="md:ms-auto flex items-center gap-2">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</div>
                <div className={cn("font-mono text-2xl font-bold num", statusColor)}>{v.score}</div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KeyMetric
          label={t.tokenomics.peakPressure}
          value={schedule.peakPressureMonth ? `${schedule.peakPressureMonth.monthLabel}` : "—"}
          sub={schedule.peakPressureMonth ? `${schedule.peakPressureMonth.netPressurePctOfFloat.toFixed(1)}% ${t.tokenomics.ofFloat}` : ""}
          tone={schedule.peakPressureMonth && schedule.peakPressureMonth.netPressurePctOfFloat >= 4 ? "bad" : "neutral"}
          icon={TrendingDown}
        />
        <KeyMetric
          label={t.tokenomics.absorptionRatio}
          value={`SAR=${schedule.absorptionRatio.toFixed(2)}`}
          sub={schedule.absorptionRatio >= 0.5 ? "Strong" : schedule.absorptionRatio >= 0.1 ? "Moderate" : "Weak"}
          tone={schedule.absorptionRatio >= 0.5 ? "good" : schedule.absorptionRatio >= 0.1 ? "warn" : "bad"}
          icon={ArrowUpRight}
        />
        <KeyMetric
          label={t.tokenomics.monthlyAvg}
          value={`${schedule.monthlyAvgPressure.toFixed(2)}%`}
          sub={t.tokenomics.ofFloat}
          tone={schedule.monthlyAvgPressure >= 3 ? "bad" : schedule.monthlyAvgPressure >= 1.5 ? "warn" : "good"}
          icon={Gauge}
        />
        <KeyMetric
          label={t.tokenomics.cumulativeDilution}
          value={`${schedule.dilution12mPct.toFixed(1)}%`}
          sub="12m"
          tone={schedule.dilution12mPct >= 30 ? "bad" : schedule.dilution12mPct >= 15 ? "warn" : "good"}
          icon={TrendingDown}
        />
      </div>

      {/* 12-month unlock calendar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            {t.tokenomics.title}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">{t.tokenomics.subtitle}</p>
        </CardHeader>
        <CardContent>
          {/* Monthly bars */}
          <div className="flex items-end gap-1 h-40 mb-2">
            {schedule.events.map((e) => {
              const maxPressure = Math.max(...schedule.events.map((ev) => ev.netPressurePctOfFloat), 0.1);
              const heightPct = (e.netPressurePctOfFloat / maxPressure) * 100;
              const barColor =
                e.pressureLevel === "extreme"
                  ? "bg-reject"
                  : e.pressureLevel === "high"
                  ? "bg-reject/70"
                  : e.pressureLevel === "moderate"
                  ? "bg-investigate"
                  : "bg-pass/60";
              return (
                <div key={e.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="text-[8px] text-muted-foreground font-mono num">
                    {e.netPressurePctOfFloat > 0.5 ? e.netPressurePctOfFloat.toFixed(1) : ""}
                  </div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={cn("w-full rounded-t transition-all duration-500 hover:opacity-80", barColor)}
                      style={{ height: `${Math.max(2, heightPct)}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-muted-foreground font-mono">{e.monthLabel}</div>
                  {/* Tooltip */}
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border rounded px-2 py-1 text-[10px] whitespace-nowrap pointer-events-none z-10 shadow-md">
                    {e.monthLabel}: {e.netPressurePctOfFloat.toFixed(2)}% · {fmtUsd(e.netPressureUsd)}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground mt-2">
            <LegendDot color="bg-pass/60" label={t.tokenomics.low} />
            <LegendDot color="bg-investigate" label={t.tokenomics.moderate} />
            <LegendDot color="bg-reject/70" label={t.tokenomics.high} />
            <LegendDot color="bg-reject" label={t.tokenomics.extreme} />
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-border">
            <TotalStat label="Unlock (12m)" value={fmtUsd(schedule.totalUnlock12m)} tone="bad" />
            <TotalStat label="Emission (12m)" value={fmtUsd(schedule.totalEmission12m)} tone="bad" />
            <TotalStat label="Buyback (12m)" value={fmtUsd(schedule.totalBuyback12m)} tone="good" />
            <TotalStat label={t.tokenomics.totalNetPressure} value={fmtUsd(schedule.totalNetPressure)} tone={schedule.totalNetPressure > 0 ? "bad" : "good"} />
          </div>
        </CardContent>
      </Card>

      {/* Risk gates */}
      {schedule.riskGates.some((g) => g.triggered) && (
        <Card className="border-reject/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-reject" />
              {t.tokenomics.riskGates}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            {schedule.riskGates
              .filter((g) => g.triggered)
              .map((g) => (
                <div
                  key={g.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs",
                    g.severity === "critical"
                      ? "border-reject/30 bg-reject/5"
                      : "border-investigate/25 bg-investigate/5"
                  )}
                >
                  <div>
                    <div className="font-medium">{g.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {g.value} / {g.threshold}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px]",
                      g.severity === "critical" ? "border-reject/40 text-reject" : "border-investigate/40 text-investigate"
                    )}
                  >
                    {g.severity}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KeyMetric({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "warn" | "bad" | "neutral";
  icon: any;
}) {
  const color = tone === "good" ? "text-pass" : tone === "warn" ? "text-investigate" : tone === "bad" ? "text-reject" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</span>
          <Icon className={cn("h-3.5 w-3.5", color)} />
        </div>
        <div className={cn("font-mono text-lg font-bold num", color)}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-sm", color)} />
      {label}
    </span>
  );
}

function TotalStat({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" }) {
  const color = tone === "good" ? "text-pass" : "text-reject";
  return (
    <div className="rounded-lg bg-muted/40 p-2 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("font-mono text-sm font-bold num", color)}>{value}</div>
    </div>
  );
}
