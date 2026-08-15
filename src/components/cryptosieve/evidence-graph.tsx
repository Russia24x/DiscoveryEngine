"use client";

import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Link2,
  Activity,
  Award,
  Scale,
} from "lucide-react";
import type { EvidenceGraph as EvidenceGraphType, EvidenceNode } from "@/lib/engine/evidence";

export function EvidenceGraphView({ graph }: { graph: EvidenceGraphType }) {
  const { t } = useI18n();
  const s = graph.summary;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t.evidence.summary}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-pass" />
                  <span className="num">{s.positive}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="num">{s.neutral}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-reject" />
                  <span className="num">{s.negative}</span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryStat label={t.evidence.avgConfidence} value={`${Math.round(s.avgConfidence * 100)}%`} tone="primary" />
              <SummaryStat
                label={t.evidence.avgGrade}
                value={s.avgGrade >= 2.5 ? "A" : s.avgGrade >= 1.5 ? "B" : "C"}
                tone={s.avgGrade >= 2.5 ? "good" : s.avgGrade >= 1.5 ? "warn" : "bad"}
              />
              <SummaryStat label={t.evidence.strongest} value={s.strongestClaim?.title.slice(0, 24) ?? "—"} tone="good" small />
              <SummaryStat label={t.evidence.weakest} value={s.weakestClaim?.title.slice(0, 24) ?? "—"} tone="bad" small />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Contradictions (if any) */}
      {graph.contradictions.length > 0 && (
        <Card className="border-investigate/30 bg-investigate/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-investigate" />
              {t.evidence.contradictions}
              <Badge variant="outline" className="text-[10px] text-investigate border-investigate/30">
                {graph.contradictions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {graph.contradictions.map((c, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-investigate/20 bg-investigate/5 p-2.5 text-xs">
                <Link2 className="h-3.5 w-3.5 text-investigate shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{c.note}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Claims */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            {t.evidence.claims}
            <Badge variant="outline" className="text-[10px]">{graph.claims.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {graph.claims.map((claim) => (
              <EvidenceClaimCard key={claim.id} claim={claim} t={t} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics + Risks side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t.evidence.metrics}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {graph.metrics.map((m) => (
              <div key={m.key} className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{m.label}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {m.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-pass" />
                    ) : m.trend === "down" ? (
                      <TrendingDown className="h-3 w-3 text-reject" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>{m.trend}</span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="font-mono text-sm font-bold num">
                    {m.current != null ? m.current.toFixed(1) : "—"}
                    <span className="text-[10px] text-muted-foreground">{m.unit ?? ""}</span>
                  </div>
                </div>
                {/* Mini sparkline */}
                <svg width="48" height="20" className="overflow-visible shrink-0">
                  {m.historical.length > 1 && (
                    <MiniSparkline points={m.historical} />
                  )}
                </svg>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              {t.evidence.risks}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {graph.risks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">—</p>
            ) : (
              graph.risks.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5",
                    r.status === "critical"
                      ? "border-reject/30 bg-reject/5"
                      : r.status === "open"
                      ? "border-investigate/25 bg-investigate/5"
                      : "border-pass/20 bg-pass/5"
                  )}
                >
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0">{r.category}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{r.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{r.evidence}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          r.severity >= 75 ? "bg-reject" : r.severity >= 55 ? "bg-investigate" : "bg-pass"
                        )}
                        style={{ width: `${r.severity}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] num w-6 text-end">{Math.round(r.severity)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EvidenceClaimCard({ claim, t }: { claim: EvidenceNode; t: any }) {
  const dirColor =
    claim.direction === "positive"
      ? "text-pass"
      : claim.direction === "negative"
      ? "text-reject"
      : "text-muted-foreground";
  const dirIcon =
    claim.direction === "positive" ? TrendingUp : claim.direction === "negative" ? TrendingDown : Minus;
  const DirIcon = dirIcon;
  const gradeColor =
    claim.grade === "A" ? "bg-pass/15 text-pass border-pass/30" : claim.grade === "B" ? "bg-investigate/15 text-investigate border-investigate/30" : "bg-reject/15 text-reject border-reject/30";
  const freshColor =
    claim.freshness === "fresh" ? "text-pass" : claim.freshness === "stale" ? "text-investigate" : "text-reject";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all hover:shadow-sm",
        claim.direction === "positive" ? "border-pass/20 bg-pass/5" : claim.direction === "negative" ? "border-reject/20 bg-reject/5" : "border-border bg-card/50"
      )}
    >
      <div className="flex items-start gap-2">
        <DirIcon className={cn("h-4 w-4 shrink-0 mt-0.5", dirColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold leading-tight">{claim.title}</span>
            <Badge className={cn("text-[9px] shrink-0 font-bold", gradeColor)}>{claim.grade}</Badge>
          </div>
          {claim.value && (
            <div className="font-mono text-xs text-muted-foreground num mt-0.5">{claim.value}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
            <span className="truncate">{claim.source}</span>
            <span>·</span>
            <span className={freshColor}>{claim.freshness}</span>
            <span>·</span>
            <span className="font-mono num">{Math.round(claim.confidence * 100)}%</span>
          </div>
          {claim.contradictionIds && claim.contradictionIds.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertTriangle className="h-3 w-3 text-investigate" />
              <span className="text-[10px] text-investigate">
                {claim.contradictionIds.length} contradiction
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone: "primary" | "good" | "warn" | "bad";
  small?: boolean;
}) {
  const color =
    tone === "good" ? "text-pass" : tone === "warn" ? "text-investigate" : tone === "bad" ? "text-reject" : "text-primary";
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</div>
      <div className={cn("font-mono font-bold num truncate", color, small ? "text-xs" : "text-lg")}>{value}</div>
    </div>
  );
}

function MiniSparkline({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 48;
  const h = 20;
  const pts = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * (h - 4) - 2}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const color = last >= first ? "var(--pass)" : "var(--reject)";
  return <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={pts} />;
}
