"use client";

import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Building2, Coins, DollarSign, Target, ArrowRight } from "lucide-react";

interface SeparationData {
  projectQuality: number;
  tokenQuality: number;
  valuation: number;
  investmentAttractiveness: number;
  verdict: string;
}

export function SeparationCards({ data }: { data: SeparationData }) {
  const { t } = useI18n();

  const cards = [
    {
      label: t.separation.projectQuality,
      value: data.projectQuality,
      icon: Building2,
      desc: t.project.projectQuality,
      tone: "primary" as const,
    },
    {
      label: t.separation.tokenQuality,
      value: data.tokenQuality,
      icon: Coins,
      desc: t.project.tokenQuality,
      tone: "primary" as const,
    },
    {
      label: t.separation.valuation,
      value: data.valuation,
      icon: DollarSign,
      desc: t.project.valuation,
      tone: "primary" as const,
    },
    {
      label: t.separation.investmentAttractiveness,
      value: data.investmentAttractiveness,
      icon: Target,
      desc: "IA Final",
      tone: "primary" as const,
      highlight: true,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-sm">{t.separation.title}</CardTitle>
          <p className="text-[11px] text-muted-foreground">{t.separation.subtitle}</p>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c, i) => (
              <SeparationCard key={c.label} {...c} index={i} />
            ))}
          </div>
          {/* Verdict bar */}
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                {t.separation.verdict}
              </span>
              <ArrowRight className="h-3 w-3 text-primary rtl:rotate-180" />
              <span className="text-xs font-medium">{data.verdict}</span>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function SeparationCard({
  label,
  value,
  icon: Icon,
  desc,
  highlight,
  index,
}: {
  label: string;
  value: number;
  icon: any;
  desc: string;
  tone: "primary";
  highlight?: boolean;
  index: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 66 ? "good" : pct >= 40 ? "warn" : "bad";
  const color = tone === "good" ? "var(--pass)" : tone === "warn" ? "var(--investigate)" : "var(--reject)";
  const dim = 88;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-3 transition-all hover:shadow-sm animate-fade-up",
        highlight ? "border-primary/30 bg-primary/5 shadow-glow" : "border-border bg-card/50"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {highlight && (
        <div className="absolute -top-1.5 end-3 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-wider">
          Decision
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-1 mb-2">
        <span className="font-mono text-2xl font-bold num" style={{ color }}>
          {Math.round(value)}
        </span>
        <span className="text-[10px] text-muted-foreground mb-1">/100</span>
      </div>
      {/* Radial progress */}
      <div className="relative h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5 truncate">{desc}</div>
    </div>
  );
}
