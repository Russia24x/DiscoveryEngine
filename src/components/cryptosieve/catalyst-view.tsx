"use client";

import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Zap,
  Rocket,
  Settings,
  Vote,
  FileText,
  Handshake,
  Gavel,
  Unlock,
  ShieldX,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import type { CatalystReport, Catalyst, KillCondition } from "@/lib/engine/catalyst";

const TYPE_ICON: Record<string, any> = {
  unlock: Unlock,
  upgrade: Rocket,
  governance: Vote,
  earnings: FileText,
  partnership: Handshake,
  regulatory: Gavel,
  launch: Zap,
};

export function CatalystView({ report }: { report: CatalystReport }) {
  const { t } = useI18n();
  const v = report.verdict;

  const riskColor =
    v.riskLevel === "low"
      ? "text-pass border-pass/30 bg-pass/5"
      : v.riskLevel === "moderate"
      ? "text-investigate border-investigate/25 bg-investigate/5"
      : v.riskLevel === "elevated"
      ? "text-investigate border-investigate/40 bg-investigate/10"
      : "text-reject border-reject/30 bg-reject/5";

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <Card className={cn("border-2", riskColor)}>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", riskColor)}>
            <ShieldX className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">{v.title}</div>
            <div className="text-xs text-muted-foreground">{v.detail}</div>
          </div>
          <div className="flex items-center gap-4 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.catalyst.riskLevel}</div>
              <div className={cn("font-mono text-sm font-bold uppercase", riskColor)}>{v.riskLevel}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Catalysts timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {t.catalyst.upcoming}
              <Badge variant="outline" className="text-[10px]">{report.catalysts.length}</Badge>
              <span className="text-[9px] text-muted-foreground/60 font-normal">(projected)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {report.catalysts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">{t.catalyst.noCatalysts}</p>
              ) : (
                report.catalysts.map((c) => (
                  <CatalystRow key={c.id} catalyst={c} t={t} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kill conditions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-primary" />
              {t.catalyst.killConditions}
              <Badge variant="outline" className="text-[10px]">
                {report.triggeredKills} triggered · {report.watchKills} watch
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.killConditions.map((k) => (
                <KillConditionRow key={k.id} cond={k} t={t} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CatalystRow({ catalyst, t }: { catalyst: Catalyst; t: any }) {
  const Icon = TYPE_ICON[catalyst.type] ?? Zap;
  const impactColor =
    catalyst.impact === "positive" ? "text-pass" : catalyst.impact === "negative" ? "text-reject" : "text-muted-foreground";
  const probColor =
    catalyst.probability === "high" ? "text-pass" : catalyst.probability === "medium" ? "text-investigate" : "text-muted-foreground";
  const isSoon = catalyst.daysUntil <= 14;

  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border p-2.5 text-xs", isSoon ? "border-primary/25 bg-primary/5" : "border-border bg-card/50")}>
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", isSoon ? "bg-primary/15" : "bg-muted/40")}>
        <Icon className={cn("h-3.5 w-3.5", isSoon ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium leading-tight">{catalyst.title}</span>
          <span className={cn("font-mono text-[10px] shrink-0 num", isSoon ? "text-primary font-bold" : "text-muted-foreground")}>
            {catalyst.daysUntil} {t.catalyst.daysUntil}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{catalyst.description}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn("text-[9px] uppercase tracking-wider font-semibold", impactColor)}>
            {catalyst.impact}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className={cn("text-[9px] uppercase tracking-wider", probColor)}>
            {catalyst.probability}
          </span>
          <span className="text-muted-foreground">·</span>
          {/* Magnitude bar */}
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[60px]">
            <div
              className={cn("h-full rounded-full", catalyst.impact === "positive" ? "bg-pass" : catalyst.impact === "negative" ? "bg-reject" : "bg-muted-foreground")}
              style={{ width: `${catalyst.magnitude}%` }}
            />
          </div>
          <span className="font-mono text-[9px] num text-muted-foreground">{catalyst.magnitude}</span>
        </div>
      </div>
    </div>
  );
}

function KillConditionRow({ cond, t }: { cond: KillCondition; t: any }) {
  const statusConfig =
    cond.currentStatus === "triggered"
      ? { color: "text-reject border-reject/30 bg-reject/5", icon: ShieldX, label: t.catalyst.triggered }
      : cond.currentStatus === "watch"
      ? { color: "text-investigate border-investigate/25 bg-investigate/5", icon: AlertOctagon, label: t.catalyst.watch }
      : { color: "text-pass border-pass/20 bg-pass/5", icon: CheckCircle2, label: t.catalyst.safe };
  const Icon = statusConfig.icon;

  return (
    <div className={cn("rounded-lg border p-2.5 text-xs", statusConfig.color)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium leading-tight">{cond.label}</span>
        </div>
        <Badge variant="outline" className={cn("text-[9px] shrink-0", statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{cond.description}</div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="font-mono text-[10px] num">
          {cond.currentValue} <span className="text-muted-foreground">/ {cond.threshold}</span>
        </span>
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              cond.currentStatus === "triggered"
                ? "bg-reject"
                : cond.currentStatus === "watch"
                ? "bg-investigate"
                : "bg-pass"
            )}
            style={{ width: `${cond.margin}%` }}
          />
        </div>
        <span className="font-mono text-[9px] num text-muted-foreground w-8 text-end">{cond.margin}%</span>
      </div>
    </div>
  );
}
