"use client";

import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Waves,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Building2,
  Lock,
  Activity,
} from "lucide-react";
import type { CapitalFlowProfile, CapitalSignal } from "@/lib/engine/capital-flow";

const SIGNAL_ICON: Record<string, any> = {
  smart_money: Activity,
  whale_accumulation: Users,
  exchange_flow: Building2,
  insider_concentration: Lock,
  long_term_holders: ArrowDownToLine,
};

export function CapitalFlowView({ profile }: { profile: CapitalFlowProfile }) {
  const { t } = useI18n();
  const v = profile.verdict;
  const score = profile.compositeScore;

  const statusColor =
    v.status === "strong_inflow"
      ? "text-pass border-pass/30 bg-pass/5"
      : v.status === "moderate_inflow"
      ? "text-pass border-pass/20 bg-pass/5"
      : v.status === "neutral"
      ? "text-muted-foreground border-border bg-muted/20"
      : v.status === "moderate_outflow"
      ? "text-investigate border-investigate/25 bg-investigate/5"
      : "text-reject border-reject/30 bg-reject/5";

  return (
    <Card className={cn("border-2", statusColor)}>
      <CardHeader className="pb-2">
        <div className="relative">
          <div className="absolute inset-0 grid-bg opacity-15 pointer-events-none" />
          <CardTitle className="relative text-sm flex items-center gap-2">
            <Waves className="h-4 w-4 text-primary" />
            {t.capitalFlow.title}
            <span className="text-[9px] text-muted-foreground/60 font-normal">(synthetic proxy)</span>
          </CardTitle>
          <p className="relative text-[11px] text-muted-foreground">
            {t.capitalFlow.subtitle} — <span className="text-muted-foreground/60">estimates from market data, not on-chain</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Composite gauge */}
        <div className="flex items-center gap-4">
          <CompositeGauge score={score} status={v.status} />
          <div className="flex-1">
            <div className="text-sm font-bold">{v.title}</div>
            <div className="text-xs text-muted-foreground">{v.detail}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-pass" />
                {profile.summary.inflows} {t.capitalFlow.inflow}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                {profile.summary.neutral} {t.capitalFlow.neutral}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-reject" />
                {profile.summary.outflows} {t.capitalFlow.outflow}
              </span>
            </div>
          </div>
        </div>

        {/* Signal bars */}
        <div className="space-y-2">
          {profile.signals.map((s) => (
            <SignalBar key={s.id} signal={s} t={t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CompositeGauge({ score, status }: { score: number; status: string }) {
  // Map -100..+100 to 0..360 degrees
  const angle = ((score + 100) / 200) * 180; // 0-180 for half gauge
  const color =
    status === "strong_inflow" || status === "moderate_inflow"
      ? "var(--pass)"
      : status === "neutral"
      ? "var(--muted-foreground)"
      : "var(--reject)";
  const label = score > 0 ? `+${score}` : `${score}`;
  return (
    <div className="relative w-24 h-16 shrink-0">
      <svg width="96" height="64" viewBox="0 0 96 64">
        {/* Background arc */}
        <path d="M 8 56 A 40 40 0 0 1 88 56" fill="none" stroke="var(--muted)" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
        {/* Color zones */}
        <path d="M 8 56 A 40 40 0 0 1 33 20" fill="none" stroke="var(--reject)" strokeWidth="2" opacity="0.4" />
        <path d="M 63 20 A 40 40 0 0 1 88 56" fill="none" stroke="var(--pass)" strokeWidth="2" opacity="0.4" />
        {/* Needle */}
        <line
          x1="48"
          y1="56"
          x2={48 + 38 * Math.cos((Math.PI * (180 - angle)) / 180)}
          y2={56 - 38 * Math.sin((Math.PI * (180 - angle)) / 180)}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: "all 0.6s ease" }}
        />
        <circle cx="48" cy="56" r="3" fill={color} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="font-mono text-sm font-bold num" style={{ color }}>
          {label}
        </span>
        <span className="text-[8px] text-muted-foreground uppercase tracking-wider">{/* composite */}</span>
      </div>
    </div>
  );
}

function SignalBar({ signal, t }: { signal: CapitalSignal; t: any }) {
  const Icon = SIGNAL_ICON[signal.type] ?? Activity;
  const dirColor =
    signal.direction === "inflow"
      ? "text-pass"
      : signal.direction === "outflow"
      ? "text-reject"
      : "text-muted-foreground";
  const dirLabel =
    signal.direction === "inflow"
      ? t.capitalFlow.inflow
      : signal.direction === "outflow"
      ? t.capitalFlow.outflow
      : t.capitalFlow.neutral;
  const barColor =
    signal.direction === "inflow" ? "var(--pass)" : signal.direction === "outflow" ? "var(--reject)" : "var(--muted-foreground)";
  const DirIcon = signal.direction === "inflow" ? ArrowDownToLine : signal.direction === "outflow" ? ArrowUpFromLine : Activity;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5">
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", "bg-muted/40")}>
        <Icon className={cn("h-4 w-4", dirColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium truncate">{signal.label}</span>
          <span className={cn("text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0", dirColor)}>
            <DirIcon className="h-3 w-3" />
            {dirLabel}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground truncate">{signal.description}</div>
        {/* Strength bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${signal.strength}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="font-mono text-[10px] num text-muted-foreground w-16 text-end">
            {signal.signal > 0 ? "+" : ""}
            {Math.round(signal.signal)}
          </span>
          <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">
            {signal.evidenceGrade}
          </Badge>
        </div>
      </div>
    </div>
  );
}
